import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/identity/application/auth";
import type { PermissionKey } from "@/modules/identity/domain/permissions";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const commandSchema = z.enum([
  "quote.send",
  "quote.accept",
  "quote.convert",
  "quote.cancel",
  "quote.duplicate",
  "purchase.approve",
  "purchase.send",
  "purchase.receive",
  "purchase.return",
  "purchase.cancel",
  "order.confirm",
  "order.prepare",
  "order.ship",
  "order.complete",
  "order.cancel",
  "order.return",
  "inventory.transfer",
  "inventory.adjust",
  "payment.apply",
  "task.complete",
  "automation.update",
  "automation.toggle",
  "automation.test",
]);
type Command = z.infer<typeof commandSchema>;
const permissionByCommand: Record<Command, PermissionKey> = {
  "quote.send": "quotes.write",
  "quote.accept": "quotes.write",
  "quote.convert": "sales.write",
  "purchase.approve": "purchases.write",
  "purchase.receive": "inventory.write",
  "order.confirm": "sales.write",
  "order.ship": "sales.write",
  "payment.apply": "finance.write",
  "task.complete": "tasks.write",
  "automation.update": "automations.write",
  "automation.toggle": "automations.write",
  "automation.test": "automations.write",
  "quote.cancel": "quotes.write",
  "quote.duplicate": "quotes.write",
  "purchase.send": "purchases.write",
  "purchase.return": "purchases.write",
  "purchase.cancel": "purchases.write",
  "order.prepare": "sales.write",
  "order.complete": "sales.write",
  "order.cancel": "sales.write",
  "order.return": "sales.write",
  "inventory.transfer": "inventory.write",
  "inventory.adjust": "inventory.write",
};
const payloadSchema = z.object({
  command: commandSchema,
  idempotencyKey: z.string().min(8).max(120),
  data: z.record(z.string(), z.unknown()),
});
const idSchema = z.object({ id: z.string().cuid() });
const receiveSchema = z.object({
  id: z.string().cuid(),
  warehouseId: z.string().cuid(),
  lines: z
    .array(
      z.object({
        lineId: z.string().cuid(),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1),
});
const convertSchema = z.object({
  id: z.string().cuid(),
  warehouseId: z.string().cuid(),
});
const paymentSchema = z.object({
  obligationId: z.string().cuid(),
  accountId: z.string().cuid(),
  amount: z.coerce.number().positive(),
});
const transferSchema = z
  .object({
    productId: z.string().cuid(),
    fromWarehouseId: z.string().cuid(),
    toWarehouseId: z.string().cuid(),
    quantity: z.coerce.number().positive(),
    reason: z.string().trim().min(4).max(300),
  })
  .refine((value) => value.fromWarehouseId !== value.toWarehouseId, {
    message: "Los almacenes deben ser distintos",
  });
const adjustSchema = z.object({
  productId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  physical: z.coerce.number().min(0),
  reason: z.string().trim().min(8).max(300),
});
const returnSchema = z.object({
  id: z.string().cuid(),
  disposition: z.enum(["SELLABLE", "DAMAGED", "QUARANTINE"]),
  reason: z.string().trim().min(5).max(300),
  lines: z
    .array(
      z.object({
        lineId: z.string().cuid(),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1),
});
const supplierReturnSchema = z.object({
  id: z.string().cuid(),
  warehouseId: z.string().cuid(),
  reason: z.string().trim().min(5).max(300),
  lines: z
    .array(
      z.object({
        lineId: z.string().cuid(),
        quantity: z.coerce.number().positive(),
      }),
    )
    .min(1),
});
const shipSchema = z.object({
  id: z.string().cuid(),
  lines: z
    .array(
      z.object({
        lineId: z.string().cuid(),
        quantity: z.coerce.number().positive(),
      }),
    )
    .optional(),
});
const automationDefinitionSchema = z
  .object({
    id: z.string().cuid(),
    name: z.string().trim().min(1).max(160),
    trigger: z.enum([
      "lead.created",
      "quote.sent",
      "quote.accepted",
      "quote.expiring",
      "order.confirmed",
      "stock.low",
      "obligation.overdue",
    ]),
    action: z.enum([
      "task.create",
      "notification.send",
      "email.send",
      "field.update",
    ]),
    conditionField: z.string().trim().max(80).optional(),
    conditionOperator: z
      .enum(["equals", "not_equals", "contains", "greater_than", "less_than"])
      .default("equals"),
    conditionValue: z.string().trim().max(200).optional(),
    actionTitle: z.string().trim().max(160).optional(),
    actionBody: z.string().trim().max(1000).optional(),
    actionEmail: z.string().email().optional().or(z.literal("")),
    targetResource: z.enum(["task", "lead", "opportunity"]).optional(),
    targetField: z.string().trim().max(80).optional(),
    targetValue: z.string().trim().max(200).optional(),
    active: z.boolean(),
    maxDepth: z.coerce.number().int().min(1).max(5).default(3),
  })
  .superRefine((value, context) => {
    if (value.action === "email.send" && !value.actionEmail)
      context.addIssue({
        code: "custom",
        path: ["actionEmail"],
        message: "Indica el correo autorizado.",
      });
    if (
      value.action === "field.update" &&
      (!value.targetResource || !value.targetField || !value.targetValue)
    )
      context.addIssue({
        code: "custom",
        path: ["targetResource"],
        message: "Completa el recurso, campo y valor permitidos.",
      });
  });

export async function POST(request: NextRequest) {
  const requestIdentifier = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen de solicitud no permitido." },
        requestIdentifier,
      );
    const payload = payloadSchema.parse(await request.json());
    const context = await requirePermission(
      permissionByCommand[payload.command],
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, requestIdentifier);
    const db = getDb();
    const organizationId = context.value.organizationId;
    const requestHash = createHash("sha256")
      .update(JSON.stringify({ command: payload.command, data: payload.data }))
      .digest("hex");
    const existing = await db.idempotencyKey.findUnique({
      where: {
        organizationId_actorId_operation_key: {
          organizationId,
          actorId: context.value.userId,
          operation: payload.command,
          key: payload.idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.requestHash !== requestHash)
        return jsonError(
          {
            code: "CONFLICT",
            message: "La clave de idempotencia ya se utilizó con otros datos.",
          },
          requestIdentifier,
        );
      if (existing.response)
        return NextResponse.json(existing.response, {
          status: existing.statusCode ?? 200,
          headers: { "x-request-id": requestIdentifier },
        });
      return jsonError(
        {
          code: "CONFLICT",
          message: "La operación con esta clave sigue en proceso.",
        },
        requestIdentifier,
      );
    }

    const result = await db.$transaction(
      async (tx) => {
        await tx.idempotencyKey.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            operation: payload.command,
            key: payload.idempotencyKey,
            requestHash,
            expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
          },
        });
        let output: Record<string, unknown>;
        const now = new Date();
        const nextNumber = async (kind: string, prefix: string) => {
          const sequence = await tx.documentSequence.upsert({
            where: { organizationId_kind: { organizationId, kind } },
            update: { value: { increment: 1 } },
            create: { organizationId, kind, value: 1 },
          });
          return `${prefix}-${now.getUTCFullYear()}-${String(sequence.value).padStart(6, "0")}`;
        };

        switch (payload.command) {
          case "quote.send": {
            const { id } = idSchema.parse(payload.data);
            const quote = await tx.quote.findUnique({
              where: { organizationId_id: { organizationId, id } },
              include: { lines: true },
            });
            if (!quote || quote.status !== "DRAFT")
              throw new BusinessFailure(
                "La cotización no existe o ya no está en borrador.",
              );
            await tx.quoteVersion.create({
              data: {
                organizationId,
                quoteId: id,
                version: quote.version,
                createdBy: context.value.userId,
                snapshot: JSON.parse(JSON.stringify(quote)),
              },
            });
            await tx.quote.update({
              where: { organizationId_id: { organizationId, id } },
              data: { status: "SENT" },
            });
            output = { id, status: "SENT" };
            break;
          }
          case "quote.accept": {
            const { id } = idSchema.parse(payload.data);
            const quote = await tx.quote.findUnique({
              where: { organizationId_id: { organizationId, id } },
            });
            if (!quote || !["SENT", "VIEWED"].includes(quote.status))
              throw new BusinessFailure(
                "La cotización no está disponible para aceptación.",
              );
            if (quote.validUntil < now) {
              await tx.quote.update({
                where: { id },
                data: { status: "EXPIRED" },
              });
              throw new BusinessFailure("La cotización está vencida.");
            }
            await tx.quote.update({
              where: { organizationId_id: { organizationId, id } },
              data: { status: "ACCEPTED", acceptedAt: now },
            });
            output = { id, status: "ACCEPTED" };
            break;
          }
          case "quote.cancel": {
            const { id } = idSchema.parse(payload.data);
            const updated = await tx.quote.updateMany({
              where: {
                organizationId,
                id,
                status: { in: ["DRAFT", "SENT", "VIEWED"] },
              },
              data: { status: "CANCELLED" },
            });
            if (updated.count !== 1)
              throw new BusinessFailure(
                "La cotización ya no puede cancelarse.",
              );
            await tx.quoteAccessToken.updateMany({
              where: { organizationId, quoteId: id, revokedAt: null },
              data: { revokedAt: now },
            });
            output = { id, status: "CANCELLED" };
            break;
          }
          case "quote.convert": {
            const input = convertSchema.parse(payload.data);
            const quote = await tx.quote.findUnique({
              where: { organizationId_id: { organizationId, id: input.id } },
              include: { lines: true },
            });
            if (!quote || quote.status !== "ACCEPTED")
              throw new BusinessFailure(
                "Solo una cotización aceptada puede convertirse.",
              );
            const warehouse = await tx.warehouse.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.warehouseId },
              },
            });
            if (!warehouse?.active)
              throw new BusinessFailure("El almacén no está disponible.");
            const number = await nextNumber("ORDER", "PED");
            const order = await tx.order.create({
              data: {
                organizationId,
                customerId: quote.customerId,
                quoteId: quote.id,
                warehouseId: input.warehouseId,
                number,
                currency: quote.currency,
                total: quote.total,
                lines: {
                  create: quote.lines.map((line) => ({
                    organizationId,
                    productId: line.productId,
                    description: line.description,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    lineTotal: line.lineTotal,
                  })),
                },
              },
            });
            await tx.quote.update({
              where: { organizationId_id: { organizationId, id: quote.id } },
              data: { status: "CONVERTED", convertedAt: now },
            });
            output = { id: order.id, number, status: order.status };
            break;
          }
          case "quote.duplicate": {
            const { id } = idSchema.parse(payload.data);
            const source = await tx.quote.findUnique({
              where: { organizationId_id: { organizationId, id } },
              include: {
                lines: true,
                organization: { select: { settings: true } },
              },
            });
            if (!source)
              throw new BusinessFailure("La cotización de origen no existe.");
            const settings = source.organization.settings as {
              quotePrefix?: string;
            } | null;
            const number = await nextNumber(
              "QUOTE",
              settings?.quotePrefix ?? "COT",
            );
            const duplicate = await tx.quote.create({
              data: {
                organizationId,
                customerId: source.customerId,
                contactId: source.contactId,
                ownerId: context.value.userId,
                number,
                currency: source.currency,
                validUntil: new Date(now.getTime() + 15 * 86400000),
                subtotal: source.subtotal,
                discountTotal: source.discountTotal,
                taxTotal: source.taxTotal,
                total: source.total,
                terms: source.terms,
                notes: source.notes,
                lines: {
                  create: source.lines.map((line) => ({
                    organizationId,
                    productId: line.productId,
                    skuSnapshot: line.skuSnapshot,
                    description: line.description,
                    quantity: line.quantity,
                    unitPrice: line.unitPrice,
                    discountRate: line.discountRate,
                    taxRate: line.taxRate,
                    lineTotal: line.lineTotal,
                  })),
                },
              },
            });
            output = {
              id: duplicate.id,
              number,
              status: "DRAFT",
              duplicatedFrom: source.id,
            };
            break;
          }
          case "purchase.approve": {
            const { id } = idSchema.parse(payload.data);
            const updated = await tx.purchaseOrder.updateMany({
              where: { organizationId, id, status: "DRAFT" },
              data: { status: "APPROVED" },
            });
            if (updated.count !== 1)
              throw new BusinessFailure(
                "La orden no está disponible para aprobación.",
              );
            output = { id, status: "APPROVED" };
            break;
          }
          case "purchase.send": {
            const { id } = idSchema.parse(payload.data);
            const updated = await tx.purchaseOrder.updateMany({
              where: { organizationId, id, status: "APPROVED" },
              data: { status: "SENT" },
            });
            if (updated.count !== 1)
              throw new BusinessFailure(
                "La orden no está aprobada o ya fue enviada.",
              );
            output = { id, status: "SENT" };
            break;
          }
          case "purchase.cancel": {
            const { id } = idSchema.parse(payload.data);
            const purchase = await tx.purchaseOrder.findUnique({
              where: { organizationId_id: { organizationId, id } },
              include: { lines: true },
            });
            if (
              !purchase ||
              !["DRAFT", "APPROVED", "SENT"].includes(purchase.status) ||
              purchase.lines.some((line) => Number(line.received) > 0)
            )
              throw new BusinessFailure(
                "No se puede cancelar una compra con recepciones registradas.",
              );
            await tx.purchaseOrder.update({
              where: { organizationId_id: { organizationId, id } },
              data: { status: "CANCELLED" },
            });
            output = { id, status: "CANCELLED" };
            break;
          }
          case "purchase.receive": {
            const input = receiveSchema.parse(payload.data);
            const purchase = await tx.purchaseOrder.findUnique({
              where: { organizationId_id: { organizationId, id: input.id } },
              include: { lines: true, supplier: true },
            });
            if (
              !purchase ||
              !["APPROVED", "SENT", "PARTIALLY_RECEIVED"].includes(
                purchase.status,
              )
            )
              throw new BusinessFailure("La orden no admite recepciones.");
            const number = await nextNumber("RECEIPT", "REC");
            const receipt = await tx.goodsReceipt.create({
              data: {
                organizationId,
                purchaseId: purchase.id,
                warehouseId: input.warehouseId,
                number,
                actorId: context.value.userId,
              },
            });
            for (const item of input.lines) {
              const line = purchase.lines.find(
                (candidate) => candidate.id === item.lineId,
              );
              if (
                !line ||
                Number(line.received) + item.quantity > Number(line.quantity)
              )
                throw new BusinessFailure(
                  "La recepción excede la cantidad pendiente.",
                );
              const stock = await tx.stock.findUnique({
                where: {
                  organizationId_productId_warehouseId: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: input.warehouseId,
                  },
                },
              });
              const previous = Number(stock?.physical ?? 0);
              const product = await tx.product.findUnique({
                where: {
                  organizationId_id: { organizationId, id: line.productId },
                },
              });
              if (!product || product.kind !== "PRODUCT")
                throw new BusinessFailure(
                  "El producto recibido no es inventariable.",
                );
              const inventoryTotal = await tx.stock.aggregate({
                where: { organizationId, productId: line.productId },
                _sum: { physical: true },
              });
              const previousGlobalQuantity = Number(
                inventoryTotal._sum.physical ?? 0,
              );
              const resultingQuantity = previousGlobalQuantity + item.quantity;
              const weightedCost =
                resultingQuantity > 0
                  ? (previousGlobalQuantity * Number(product.cost) +
                      item.quantity * Number(line.unitCost)) /
                    resultingQuantity
                  : Number(line.unitCost);
              await tx.stock.upsert({
                where: {
                  organizationId_productId_warehouseId: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: input.warehouseId,
                  },
                },
                update: {
                  physical: { increment: item.quantity },
                  version: { increment: 1 },
                },
                create: {
                  organizationId,
                  productId: line.productId,
                  warehouseId: input.warehouseId,
                  physical: item.quantity,
                },
              });
              await tx.product.update({
                where: {
                  organizationId_id: { organizationId, id: product.id },
                },
                data: { cost: weightedCost },
              });
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  productId: line.productId,
                  warehouseId: input.warehouseId,
                  type: "RECEIPT",
                  quantity: item.quantity,
                  previous,
                  resulting: previous + item.quantity,
                  reason: `Recepción ${number}`,
                  referenceType: "GoodsReceipt",
                  referenceId: receipt.id,
                  actorId: context.value.userId,
                  correlationId: requestIdentifier,
                },
              });
              await tx.purchaseLine.update({
                where: { id: line.id },
                data: { received: { increment: item.quantity } },
              });
              await tx.receiptLine.create({
                data: {
                  organizationId,
                  receiptId: receipt.id,
                  purchaseLineId: line.id,
                  quantity: item.quantity,
                },
              });
            }
            const refreshed = await tx.purchaseLine.findMany({
              where: { organizationId, purchaseId: purchase.id },
            });
            const complete = refreshed.every(
              (line) => Number(line.received) >= Number(line.quantity),
            );
            await tx.purchaseOrder.update({
              where: { organizationId_id: { organizationId, id: purchase.id } },
              data: { status: complete ? "RECEIVED" : "PARTIALLY_RECEIVED" },
            });
            const receivedValue = input.lines.reduce((sum, item) => {
              const line = purchase.lines.find(
                (candidate) => candidate.id === item.lineId,
              );
              return sum + item.quantity * Number(line?.unitCost ?? 0);
            }, 0);
            await tx.obligation.create({
              data: {
                organizationId,
                kind: "PAYABLE",
                referenceType: "GoodsReceipt",
                referenceId: receipt.id,
                counterparty: purchase.supplier.name,
                currency: purchase.currency,
                amount: receivedValue,
                dueAt: new Date(now.getTime() + 30 * 86400000),
              },
            });
            output = {
              id: receipt.id,
              number,
              purchaseStatus: complete ? "RECEIVED" : "PARTIALLY_RECEIVED",
            };
            break;
          }
          case "purchase.return": {
            const input = supplierReturnSchema.parse(payload.data);
            const purchase = await tx.purchaseOrder.findUnique({
              where: { organizationId_id: { organizationId, id: input.id } },
              include: {
                lines: { include: { product: true } },
                supplier: true,
              },
            });
            if (
              !purchase ||
              !["PARTIALLY_RECEIVED", "RECEIVED"].includes(purchase.status)
            ) {
              throw new BusinessFailure(
                "La compra no tiene mercancía recibida que pueda devolverse.",
              );
            }
            const warehouse = await tx.warehouse.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.warehouseId },
              },
            });
            if (!warehouse?.active)
              throw new BusinessFailure("El almacén no está disponible.");

            const number = await nextNumber("SUPPLIER_RETURN", "DVP");
            const supplierReturn = await tx.supplierReturn.create({
              data: {
                organizationId,
                purchaseId: purchase.id,
                warehouseId: input.warehouseId,
                number,
                reason: input.reason,
                actorId: context.value.userId,
              },
            });
            let credit = 0;
            for (const item of input.lines) {
              const line = purchase.lines.find(
                (candidate) => candidate.id === item.lineId,
              );
              if (!line || line.product.kind !== "PRODUCT")
                throw new BusinessFailure(
                  "La línea no corresponde a un producto inventariable de esta compra.",
                );
              const priorReturns = await tx.supplierReturnLine.aggregate({
                where: { organizationId, purchaseLineId: line.id },
                _sum: { quantity: true },
              });
              if (
                Number(priorReturns._sum.quantity ?? 0) + item.quantity >
                Number(line.received)
              ) {
                throw new BusinessFailure(
                  "La devolución excede la cantidad recibida pendiente de devolver.",
                );
              }
              const stock = await tx.stock.findUnique({
                where: {
                  organizationId_productId_warehouseId: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: input.warehouseId,
                  },
                },
              });
              if (
                !stock ||
                Number(stock.physical) - Number(stock.reserved) < item.quantity
              ) {
                throw new BusinessFailure(
                  `Stock disponible insuficiente para devolver ${line.description}.`,
                );
              }
              const changed = await tx.stock.updateMany({
                where: {
                  id: stock.id,
                  version: stock.version,
                  physical: {
                    gte: new Prisma.Decimal(stock.reserved).plus(item.quantity),
                  },
                },
                data: {
                  physical: { decrement: item.quantity },
                  version: { increment: 1 },
                },
              });
              if (changed.count !== 1)
                throw new BusinessFailure(
                  "El inventario cambió durante la devolución. Reintenta.",
                );
              await tx.supplierReturnLine.create({
                data: {
                  organizationId,
                  supplierReturnId: supplierReturn.id,
                  purchaseLineId: line.id,
                  quantity: item.quantity,
                  unitCost: line.unitCost,
                },
              });
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  productId: line.productId,
                  warehouseId: input.warehouseId,
                  type: "SUPPLIER_RETURN",
                  quantity: -item.quantity,
                  previous: stock.physical,
                  resulting: new Prisma.Decimal(stock.physical).minus(
                    item.quantity,
                  ),
                  reason: input.reason,
                  referenceType: "SupplierReturn",
                  referenceId: supplierReturn.id,
                  actorId: context.value.userId,
                  correlationId: requestIdentifier,
                },
              });
              credit += item.quantity * Number(line.unitCost);
            }
            await tx.obligation.create({
              data: {
                organizationId,
                kind: "RECEIVABLE",
                referenceType: "SupplierReturn",
                referenceId: supplierReturn.id,
                counterparty: purchase.supplier.name,
                currency: purchase.currency,
                amount: credit,
                dueAt: now,
              },
            });
            output = { id: supplierReturn.id, number, credit };
            break;
          }
          case "order.confirm": {
            const { id } = idSchema.parse(payload.data);
            const order = await tx.order.findUnique({
              where: { organizationId_id: { organizationId, id } },
              include: { lines: { include: { product: true } } },
            });
            if (!order || order.status !== "DRAFT")
              throw new BusinessFailure(
                "El pedido no está disponible para confirmar.",
              );
            for (const line of order.lines) {
              if (!line.productId || line.product?.kind === "SERVICE") {
                await tx.orderLine.update({
                  where: { id: line.id },
                  data: { reserved: line.quantity },
                });
                continue;
              }
              const stock = await tx.stock.findUnique({
                where: {
                  organizationId_productId_warehouseId: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: order.warehouseId,
                  },
                },
              });
              const available =
                Number(stock?.physical ?? 0) - Number(stock?.reserved ?? 0);
              if (!stock || available < Number(line.quantity))
                throw new BusinessFailure(
                  `Stock insuficiente para ${line.description}.`,
                );
              const changed = await tx.stock.updateMany({
                where: {
                  id: stock.id,
                  version: stock.version,
                  physical: {
                    gte: new Prisma.Decimal(stock.reserved).plus(line.quantity),
                  },
                },
                data: {
                  reserved: { increment: line.quantity },
                  version: { increment: 1 },
                },
              });
              if (changed.count !== 1)
                throw new BusinessFailure(
                  "El stock cambió durante la reserva. Reintenta.",
                );
              await tx.orderLine.update({
                where: { id: line.id },
                data: { reserved: line.quantity },
              });
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  productId: line.productId,
                  warehouseId: order.warehouseId,
                  type: "RESERVATION",
                  quantity: line.quantity,
                  previous: stock.reserved,
                  resulting: new Prisma.Decimal(stock.reserved).plus(
                    line.quantity,
                  ),
                  reason: `Reserva ${order.number}`,
                  referenceType: "Order",
                  referenceId: order.id,
                  actorId: context.value.userId,
                  correlationId: requestIdentifier,
                },
              });
            }
            await tx.order.update({
              where: { organizationId_id: { organizationId, id } },
              data: { status: "CONFIRMED" },
            });
            output = { id, status: "CONFIRMED" };
            break;
          }
          case "order.prepare": {
            const { id } = idSchema.parse(payload.data);
            const updated = await tx.order.updateMany({
              where: { organizationId, id, status: "CONFIRMED" },
              data: { status: "PREPARING" },
            });
            if (updated.count !== 1)
              throw new BusinessFailure("El pedido no está confirmado.");
            output = { id, status: "PREPARING" };
            break;
          }
          case "order.ship": {
            const input = shipSchema.parse(payload.data);
            const id = input.id;
            const order = await tx.order.findUnique({
              where: { organizationId_id: { organizationId, id } },
              include: {
                lines: { include: { product: true } },
                customer: true,
              },
            });
            if (
              !order ||
              !["PREPARING", "PARTIALLY_SHIPPED"].includes(order.status)
            )
              throw new BusinessFailure(
                "El pedido no está disponible para despacho.",
              );
            const number = await nextNumber("SHIPMENT", "DES");
            const shipment = await tx.shipment.create({
              data: {
                organizationId,
                orderId: order.id,
                number,
                actorId: context.value.userId,
              },
            });
            for (const line of order.lines) {
              const requested = input.lines?.find(
                (item) => item.lineId === line.id,
              )?.quantity;
              const quantity =
                requested ?? Number(line.reserved) - Number(line.shipped);
              if (quantity <= 0) continue;
              if (quantity > Number(line.reserved) - Number(line.shipped))
                throw new BusinessFailure(
                  "El despacho excede la cantidad reservada pendiente.",
                );
              if (!line.productId || line.product?.kind === "SERVICE") {
                await tx.orderLine.update({
                  where: { id: line.id },
                  data: { shipped: { increment: quantity } },
                });
                await tx.shipmentLine.create({
                  data: {
                    organizationId,
                    shipmentId: shipment.id,
                    orderLineId: line.id,
                    quantity,
                  },
                });
                continue;
              }
              const stock = await tx.stock.findUnique({
                where: {
                  organizationId_productId_warehouseId: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: order.warehouseId,
                  },
                },
              });
              if (
                !stock ||
                Number(stock.physical) < quantity ||
                Number(stock.reserved) < quantity
              )
                throw new BusinessFailure(
                  "La reserva de inventario ya no es consistente.",
                );
              await tx.stock.update({
                where: { id: stock.id },
                data: {
                  physical: { decrement: quantity },
                  reserved: { decrement: quantity },
                  version: { increment: 1 },
                },
              });
              await tx.orderLine.update({
                where: { id: line.id },
                data: { shipped: { increment: quantity } },
              });
              await tx.shipmentLine.create({
                data: {
                  organizationId,
                  shipmentId: shipment.id,
                  orderLineId: line.id,
                  quantity,
                },
              });
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  productId: line.productId,
                  warehouseId: order.warehouseId,
                  type: "SHIPMENT",
                  quantity: -quantity,
                  previous: stock.physical,
                  resulting: new Prisma.Decimal(stock.physical).minus(quantity),
                  reason: `Despacho ${number}`,
                  referenceType: "Shipment",
                  referenceId: shipment.id,
                  actorId: context.value.userId,
                  correlationId: requestIdentifier,
                },
              });
            }
            const lines = await tx.orderLine.findMany({
              where: { organizationId, orderId: order.id },
            });
            const complete = lines.every(
              (line) => Number(line.shipped) >= Number(line.quantity),
            );
            const orderStatus = complete ? "SHIPPED" : "PARTIALLY_SHIPPED";
            await tx.order.update({
              where: { organizationId_id: { organizationId, id } },
              data: { status: orderStatus },
            });
            const receivable = await tx.obligation.findFirst({
              where: {
                organizationId,
                referenceType: "Order",
                referenceId: order.id,
              },
            });
            if (!receivable)
              await tx.obligation.create({
                data: {
                  organizationId,
                  kind: "RECEIVABLE",
                  referenceType: "Order",
                  referenceId: order.id,
                  counterparty: order.customer.name,
                  currency: order.currency,
                  amount: order.total,
                  dueAt: new Date(now.getTime() + 30 * 86400000),
                },
              });
            output = { id: shipment.id, number, orderStatus };
            break;
          }
          case "order.complete": {
            const { id } = idSchema.parse(payload.data);
            const updated = await tx.order.updateMany({
              where: { organizationId, id, status: "SHIPPED" },
              data: { status: "COMPLETED" },
            });
            if (updated.count !== 1)
              throw new BusinessFailure(
                "El pedido aún no está completamente despachado.",
              );
            output = { id, status: "COMPLETED" };
            break;
          }
          case "order.cancel": {
            const { id } = idSchema.parse(payload.data);
            const order = await tx.order.findUnique({
              where: { organizationId_id: { organizationId, id } },
              include: { lines: true },
            });
            if (
              !order ||
              ![
                "DRAFT",
                "CONFIRMED",
                "PREPARING",
                "PARTIALLY_SHIPPED",
              ].includes(order.status)
            )
              throw new BusinessFailure("El pedido ya no puede cancelarse.");
            for (const line of order.lines) {
              const pending = Math.max(
                0,
                Number(line.reserved) - Number(line.shipped),
              );
              if (!line.productId || pending === 0) continue;
              const stock = await tx.stock.findUnique({
                where: {
                  organizationId_productId_warehouseId: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: order.warehouseId,
                  },
                },
              });
              if (!stock || Number(stock.reserved) < pending)
                throw new BusinessFailure(
                  "La reserva pendiente no es consistente.",
                );
              await tx.stock.update({
                where: { id: stock.id },
                data: {
                  reserved: { decrement: pending },
                  version: { increment: 1 },
                },
              });
              await tx.orderLine.update({
                where: { id: line.id },
                data: { reserved: line.shipped },
              });
              await tx.stockMovement.create({
                data: {
                  organizationId,
                  productId: line.productId,
                  warehouseId: order.warehouseId,
                  type: "RELEASE",
                  quantity: -pending,
                  previous: stock.reserved,
                  resulting: new Prisma.Decimal(stock.reserved).minus(pending),
                  reason: `Cancelación ${order.number}`,
                  referenceType: "Order",
                  referenceId: order.id,
                  actorId: context.value.userId,
                  correlationId: requestIdentifier,
                },
              });
            }
            await tx.order.update({
              where: { organizationId_id: { organizationId, id } },
              data: { status: "CANCELLED" },
            });
            output = { id, status: "CANCELLED" };
            break;
          }
          case "order.return": {
            const input = returnSchema.parse(payload.data);
            const order = await tx.order.findUnique({
              where: { organizationId_id: { organizationId, id: input.id } },
              include: {
                lines: { include: { product: true } },
                customer: true,
              },
            });
            if (!order || !["SHIPPED", "COMPLETED"].includes(order.status))
              throw new BusinessFailure("El pedido no admite devoluciones.");
            const number = await nextNumber("RETURN", "DEV");
            const returned = await tx.return.create({
              data: {
                organizationId,
                orderId: order.id,
                number,
                disposition: input.disposition,
                reason: input.reason,
              },
            });
            let refund = 0;
            for (const item of input.lines) {
              const line = order.lines.find(
                (candidate) => candidate.id === item.lineId,
              );
              if (
                !line ||
                Number(line.returned) + item.quantity > Number(line.shipped)
              )
                throw new BusinessFailure(
                  "La devolución excede lo despachado.",
                );
              await tx.returnLine.create({
                data: {
                  organizationId,
                  returnId: returned.id,
                  orderLineId: line.id,
                  quantity: item.quantity,
                },
              });
              await tx.orderLine.update({
                where: { id: line.id },
                data: { returned: { increment: item.quantity } },
              });
              refund += item.quantity * Number(line.unitPrice);
              if (
                input.disposition === "SELLABLE" &&
                line.productId &&
                line.product?.kind === "PRODUCT"
              ) {
                const stock = await tx.stock.findUnique({
                  where: {
                    organizationId_productId_warehouseId: {
                      organizationId,
                      productId: line.productId,
                      warehouseId: order.warehouseId,
                    },
                  },
                });
                const previous = Number(stock?.physical ?? 0);
                await tx.stock.upsert({
                  where: {
                    organizationId_productId_warehouseId: {
                      organizationId,
                      productId: line.productId,
                      warehouseId: order.warehouseId,
                    },
                  },
                  update: {
                    physical: { increment: item.quantity },
                    version: { increment: 1 },
                  },
                  create: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: order.warehouseId,
                    physical: item.quantity,
                  },
                });
                await tx.stockMovement.create({
                  data: {
                    organizationId,
                    productId: line.productId,
                    warehouseId: order.warehouseId,
                    type: "RETURN",
                    quantity: item.quantity,
                    previous,
                    resulting: previous + item.quantity,
                    reason: input.reason,
                    referenceType: "Return",
                    referenceId: returned.id,
                    actorId: context.value.userId,
                    correlationId: requestIdentifier,
                  },
                });
              }
            }
            if (refund > 0)
              await tx.obligation.create({
                data: {
                  organizationId,
                  kind: "PAYABLE",
                  referenceType: "Return",
                  referenceId: returned.id,
                  counterparty: order.customer.name,
                  currency: order.currency,
                  amount: refund,
                  dueAt: now,
                },
              });
            output = {
              id: returned.id,
              number,
              disposition: input.disposition,
              refund,
            };
            break;
          }
          case "inventory.transfer": {
            const input = transferSchema.parse(payload.data);
            const product = await tx.product.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.productId },
              },
            });
            if (!product || product.kind !== "PRODUCT")
              throw new BusinessFailure("El producto no es inventariable.");
            const source = await tx.stock.findUnique({
              where: {
                organizationId_productId_warehouseId: {
                  organizationId,
                  productId: input.productId,
                  warehouseId: input.fromWarehouseId,
                },
              },
            });
            if (
              !source ||
              Number(source.physical) - Number(source.reserved) < input.quantity
            )
              throw new BusinessFailure(
                "Stock disponible insuficiente para transferir.",
              );
            const destination = await tx.stock.findUnique({
              where: {
                organizationId_productId_warehouseId: {
                  organizationId,
                  productId: input.productId,
                  warehouseId: input.toWarehouseId,
                },
              },
            });
            await tx.stock.update({
              where: { id: source.id },
              data: {
                physical: { decrement: input.quantity },
                version: { increment: 1 },
              },
            });
            await tx.stock.upsert({
              where: {
                organizationId_productId_warehouseId: {
                  organizationId,
                  productId: input.productId,
                  warehouseId: input.toWarehouseId,
                },
              },
              update: {
                physical: { increment: input.quantity },
                version: { increment: 1 },
              },
              create: {
                organizationId,
                productId: input.productId,
                warehouseId: input.toWarehouseId,
                physical: input.quantity,
              },
            });
            await tx.stockMovement.createMany({
              data: [
                {
                  organizationId,
                  productId: input.productId,
                  warehouseId: input.fromWarehouseId,
                  type: "TRANSFER_OUT",
                  quantity: -input.quantity,
                  previous: source.physical,
                  resulting: new Prisma.Decimal(source.physical).minus(
                    input.quantity,
                  ),
                  reason: input.reason,
                  referenceType: "Transfer",
                  referenceId: requestIdentifier,
                  actorId: context.value.userId,
                  correlationId: requestIdentifier,
                },
                {
                  organizationId,
                  productId: input.productId,
                  warehouseId: input.toWarehouseId,
                  type: "TRANSFER_IN",
                  quantity: input.quantity,
                  previous: destination?.physical ?? 0,
                  resulting: new Prisma.Decimal(
                    destination?.physical ?? 0,
                  ).plus(input.quantity),
                  reason: input.reason,
                  referenceType: "Transfer",
                  referenceId: requestIdentifier,
                  actorId: context.value.userId,
                  correlationId: requestIdentifier,
                },
              ],
            });
            output = { id: requestIdentifier, status: "TRANSFERRED" };
            break;
          }
          case "inventory.adjust": {
            const input = adjustSchema.parse(payload.data);
            const stock = await tx.stock.findUnique({
              where: {
                organizationId_productId_warehouseId: {
                  organizationId,
                  productId: input.productId,
                  warehouseId: input.warehouseId,
                },
              },
            });
            if (input.physical < Number(stock?.reserved ?? 0))
              throw new BusinessFailure(
                "El ajuste no puede dejar el físico por debajo del reservado.",
              );
            const previous = Number(stock?.physical ?? 0);
            await tx.stock.upsert({
              where: {
                organizationId_productId_warehouseId: {
                  organizationId,
                  productId: input.productId,
                  warehouseId: input.warehouseId,
                },
              },
              update: { physical: input.physical, version: { increment: 1 } },
              create: {
                organizationId,
                productId: input.productId,
                warehouseId: input.warehouseId,
                physical: input.physical,
              },
            });
            await tx.stockMovement.create({
              data: {
                organizationId,
                productId: input.productId,
                warehouseId: input.warehouseId,
                type: "ADJUSTMENT",
                quantity: input.physical - previous,
                previous,
                resulting: input.physical,
                reason: input.reason,
                referenceType: "Adjustment",
                referenceId: requestIdentifier,
                actorId: context.value.userId,
                correlationId: requestIdentifier,
              },
            });
            output = {
              id: requestIdentifier,
              previous,
              resulting: input.physical,
            };
            break;
          }
          case "payment.apply": {
            const input = paymentSchema.parse(payload.data);
            const obligation = await tx.obligation.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.obligationId },
              },
            });
            const account = await tx.financialAccount.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.accountId },
              },
            });
            if (
              !obligation ||
              !account ||
              obligation.currency !== account.currency
            )
              throw new BusinessFailure(
                "La obligación o cuenta no existe, o sus monedas no coinciden.",
              );
            const outstanding =
              Number(obligation.amount) - Number(obligation.paidAmount);
            if (input.amount > outstanding)
              throw new BusinessFailure("El pago excede el saldo pendiente.");
            const direction = obligation.kind === "RECEIVABLE" ? "IN" : "OUT";
            const signed = direction === "IN" ? input.amount : -input.amount;
            const payment = await tx.payment.create({
              data: {
                organizationId,
                accountId: account.id,
                direction,
                currency: account.currency,
                amount: input.amount,
                idempotencyKey: payload.idempotencyKey,
              },
            });
            await tx.paymentAllocation.create({
              data: {
                organizationId,
                paymentId: payment.id,
                obligationId: obligation.id,
                amount: input.amount,
              },
            });
            await tx.obligation.update({
              where: {
                organizationId_id: { organizationId, id: obligation.id },
              },
              data: {
                paidAmount: { increment: input.amount },
                status:
                  input.amount === outstanding ? "PAID" : "PARTIALLY_PAID",
              },
            });
            await tx.financialAccount.update({
              where: { organizationId_id: { organizationId, id: account.id } },
              data: { balance: { increment: signed } },
            });
            await tx.cashMovement.create({
              data: {
                organizationId,
                accountId: account.id,
                type: direction === "IN" ? "PAYMENT_IN" : "PAYMENT_OUT",
                amount: signed,
                previous: account.balance,
                resulting: new Prisma.Decimal(account.balance).plus(signed),
                referenceType: "Payment",
                referenceId: payment.id,
              },
            });
            output = { id: payment.id, status: "CONFIRMED" };
            break;
          }
          case "task.complete": {
            const { id } = idSchema.parse(payload.data);
            const updated = await tx.task.updateMany({
              where: {
                organizationId,
                id,
                status: { in: ["OPEN", "IN_PROGRESS"] },
              },
              data: { status: "DONE" },
            });
            if (updated.count !== 1)
              throw new BusinessFailure("La tarea no está disponible.");
            output = { id, status: "DONE" };
            break;
          }
          case "automation.update": {
            const input = automationDefinitionSchema.parse(payload.data);
            const current = await tx.automation.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.id },
              },
            });
            if (!current)
              throw new BusinessFailure("La automatización no existe.");
            const action =
              input.action === "task.create"
                ? {
                    type: input.action,
                    title: input.actionTitle ?? "",
                    description: input.actionBody ?? "",
                  }
                : input.action === "notification.send"
                  ? {
                      type: input.action,
                      title: input.actionTitle ?? "",
                      body: input.actionBody ?? "",
                    }
                  : input.action === "email.send"
                    ? {
                        type: input.action,
                        to: input.actionEmail ?? "",
                        subject: input.actionTitle ?? "",
                        body: input.actionBody ?? "",
                      }
                    : {
                        type: input.action,
                        resource: input.targetResource ?? "",
                        field: input.targetField ?? "",
                        value: input.targetValue ?? "",
                      };
            const conditions = input.conditionField
              ? {
                  field: input.conditionField,
                  operator: input.conditionOperator,
                  value: input.conditionValue ?? "",
                }
              : {};
            const version = current.version + 1;
            await tx.automation.update({
              where: {
                organizationId_id: { organizationId, id: input.id },
              },
              data: {
                name: input.name,
                trigger: input.trigger,
                conditions,
                actions: [action],
                active: input.active,
                maxDepth: input.maxDepth,
                version,
                versions: {
                  create: {
                    organizationId,
                    version,
                    createdBy: context.value.userId,
                    snapshot: {
                      name: input.name,
                      trigger: input.trigger,
                      conditions,
                      actions: [action],
                      active: input.active,
                      maxDepth: input.maxDepth,
                    },
                  },
                },
              },
            });
            output = { id: input.id, version, active: input.active };
            break;
          }
          case "automation.toggle": {
            const input = z
              .object({ id: z.string().cuid(), active: z.boolean() })
              .parse(payload.data);
            const current = await tx.automation.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.id },
              },
            });
            if (!current)
              throw new BusinessFailure("La automatización no existe.");
            const version = current.version + 1;
            await tx.automation.update({
              where: {
                organizationId_id: { organizationId, id: input.id },
              },
              data: {
                active: input.active,
                version,
                versions: {
                  create: {
                    organizationId,
                    version,
                    createdBy: context.value.userId,
                    snapshot: {
                      name: current.name,
                      trigger: current.trigger,
                      conditions: current.conditions,
                      actions: current.actions,
                      active: input.active,
                      maxDepth: current.maxDepth,
                    } as Prisma.InputJsonObject,
                  },
                },
              },
            });
            output = { id: input.id, active: input.active, version };
            break;
          }
          case "automation.test": {
            const { id } = idSchema.parse(payload.data);
            const automation = await tx.automation.findFirst({
              where: { organizationId, id },
            });
            if (!automation)
              throw new BusinessFailure("La automatización no existe.");
            const actions = Array.isArray(automation.actions)
              ? automation.actions
              : [];
            if (actions.length === 0 || actions.length > 10)
              throw new BusinessFailure(
                "La automatización debe contener entre una y diez acciones válidas.",
              );
            const run = await tx.automationRun.create({
              data: {
                organizationId,
                automationId: id,
                eventId: `manual:${requestIdentifier}`,
                status: "SUCCEEDED",
                result: {
                  dryRun: true,
                  trigger: automation.trigger,
                  conditions: automation.conditions,
                  actions,
                },
                completedAt: now,
              },
            });
            output = { id, runId: run.id, status: "SUCCEEDED", dryRun: true };
            break;
          }
        }
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: payload.command,
            resourceType: payload.command.split(".")[0] ?? "resource",
            resourceId: typeof output.id === "string" ? output.id : undefined,
            outcome: "SUCCESS",
            correlationId: requestIdentifier,
          },
        });
        await tx.outboxEvent.create({
          data: {
            organizationId,
            topic: payload.command,
            aggregateType: payload.command.split(".")[0] ?? "resource",
            aggregateId:
              typeof output.id === "string" ? output.id : requestIdentifier,
            payload: output as Prisma.InputJsonValue,
            correlationId: requestIdentifier,
          },
        });
        await tx.idempotencyKey.update({
          where: {
            organizationId_actorId_operation_key: {
              organizationId,
              actorId: context.value.userId,
              operation: payload.command,
              key: payload.idempotencyKey,
            },
          },
          data: { response: output as Prisma.InputJsonValue, statusCode: 200 },
        });
        return output;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      },
    );
    return NextResponse.json(result, {
      headers: { "x-request-id": requestIdentifier },
    });
  } catch (error) {
    if (error instanceof BusinessFailure)
      return jsonError(
        { code: "CONFLICT", message: error.message },
        requestIdentifier,
      );
    return handleRouteError(error, requestIdentifier);
  }
}

class BusinessFailure extends Error {}
