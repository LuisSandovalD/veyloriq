import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";
import { requirePermission } from "@/modules/identity/application/auth";
import { calculateLine } from "@/modules/commerce/domain/money";
import type { PermissionKey } from "@/modules/identity/domain/permissions";
import {
  enforcePlanLimit,
  recordUsage,
} from "@/modules/billing/application/limits";

const resources = [
  "dashboard",
  "customers",
  "leads",
  "products",
  "suppliers",
  "warehouses",
  "stock",
  "quotes",
  "purchases",
  "orders",
  "accounts",
  "obligations",
  "tasks",
  "automations",
  "audit",
] as const;
const resourceSchema = z.enum(resources);
type Resource = z.infer<typeof resourceSchema>;

class WorkspaceValidation extends Error {}

const permissions: Record<Resource, PermissionKey> = {
  dashboard: "dashboard.read",
  customers: "crm.read",
  leads: "crm.read",
  products: "catalog.read",
  suppliers: "purchases.read",
  warehouses: "inventory.read",
  stock: "inventory.read",
  quotes: "quotes.read",
  purchases: "purchases.read",
  orders: "sales.read",
  accounts: "finance.read",
  obligations: "finance.read",
  tasks: "tasks.read",
  automations: "automations.read",
  audit: "audit.read",
};

const writePermissions: Partial<Record<Resource, PermissionKey>> = {
  customers: "crm.write",
  leads: "crm.write",
  products: "catalog.write",
  suppliers: "purchases.write",
  warehouses: "inventory.write",
  quotes: "quotes.write",
  purchases: "purchases.write",
  accounts: "finance.write",
  tasks: "tasks.write",
  automations: "automations.write",
  orders: "sales.write",
};

const text = z.string().trim().min(1).max(160);
const optionalText = z.string().trim().max(500).optional();
const customerSchema = z.object({
  name: text,
  taxId: z.string().trim().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
});
const leadSchema = z.object({
  name: text,
  company: optionalText,
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
  source: optionalText,
});
const productSchema = z.object({
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(80).optional(),
  name: text,
  description: z.string().trim().max(2000).optional(),
  unit: z.string().trim().min(1).max(30).default("unit"),
  categoryId: z.string().cuid().optional(),
  imageDocumentId: z.string().cuid().or(z.string().uuid()).optional(),
  kind: z.enum(["PRODUCT", "SERVICE"]),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0).default(0),
  taxRate: z.coerce.number().min(0).max(100).default(18),
  minimumStock: z.coerce.number().min(0).default(0),
});
const supplierSchema = z.object({
  name: text,
  taxId: z.string().max(40).optional(),
  email: z.string().email().optional().or(z.literal("")),
  phone: z.string().max(40).optional(),
});
const warehouseSchema = z.object({
  name: text,
  code: z
    .string()
    .trim()
    .min(1)
    .max(20)
    .transform((value) => value.toUpperCase()),
  address: optionalText,
});
const taskSchema = z.object({
  title: text,
  description: optionalText,
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]).default("MEDIUM"),
  dueAt: z.string().datetime().optional(),
});
const accountSchema = z.object({
  name: text,
  type: z.enum(["CASH", "BANK"]),
  currency: z.enum(["PEN", "USD", "EUR"]),
  openingBalance: z.coerce.number().default(0),
});
const automationSchema = z
  .object({
    name: text,
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
    active: z.boolean().default(false),
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
const quoteSchema = z.object({
  customerId: z.string().cuid(),
  contactId: z.string().cuid().optional(),
  validUntil: z.string().datetime(),
  terms: optionalText,
  notes: optionalText,
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.coerce.number().positive(),
        discountRate: z.coerce.number().min(0).max(100).default(0),
      }),
    )
    .min(1)
    .max(100),
});
const purchaseSchema = z.object({
  supplierId: z.string().cuid(),
  expectedAt: z.string().datetime().optional(),
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.coerce.number().positive(),
        unitCost: z.coerce.number().min(0),
      }),
    )
    .min(1)
    .max(100),
});
const orderSchema = z.object({
  customerId: z.string().cuid(),
  warehouseId: z.string().cuid(),
  items: z
    .array(
      z.object({
        productId: z.string().cuid(),
        quantity: z.coerce.number().positive(),
        unitPrice: z.coerce.number().min(0).optional(),
      }),
    )
    .min(1)
    .max(100),
});

function normalized(value: unknown): unknown {
  return JSON.parse(
    JSON.stringify(value, (_key, item: unknown) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );
}

async function nextNumber(
  db: Prisma.TransactionClient,
  organizationId: string,
  kind: string,
  prefix: string,
): Promise<string> {
  const sequence = await db.documentSequence.upsert({
    where: { organizationId_kind: { organizationId, kind } },
    update: { value: { increment: 1 } },
    create: { organizationId, kind, value: 1 },
  });
  return `${prefix}-${new Date().getUTCFullYear()}-${String(sequence.value).padStart(6, "0")}`;
}

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const resource = resourceSchema.parse(
      request.nextUrl.searchParams.get("resource") ?? "dashboard",
    );
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .parse(request.nextUrl.searchParams.get("page") ?? 1);
    const query = (request.nextUrl.searchParams.get("q") ?? "").slice(0, 100);
    const context = await requirePermission(
      permissions[resource],
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const db = getDb();
    const pageSize = 25;
    const take = pageSize + 1;
    const skip = (page - 1) * pageSize;
    let data: unknown;
    switch (resource) {
      case "dashboard": {
        const [customers, products, quotes, orders, openTasks, stock, recent] =
          await Promise.all([
            db.customer.count({ where: { organizationId, archivedAt: null } }),
            db.product.count({ where: { organizationId, active: true } }),
            db.quote.aggregate({
              where: {
                organizationId,
                status: { in: ["SENT", "VIEWED", "ACCEPTED"] },
              },
              _sum: { total: true },
              _count: true,
            }),
            db.order.aggregate({
              where: { organizationId, status: { not: "CANCELLED" } },
              _sum: { total: true },
              _count: true,
            }),
            db.task.count({
              where: {
                organizationId,
                status: { in: ["OPEN", "IN_PROGRESS"] },
              },
            }),
            db.stock.findMany({
              where: { organizationId },
              include: {
                product: { select: { name: true, minimumStock: true } },
                warehouse: { select: { name: true } },
              },
              take: 8,
              orderBy: { updatedAt: "desc" },
            }),
            db.auditEvent.findMany({
              where: { organizationId },
              take: 8,
              orderBy: { createdAt: "desc" },
            }),
          ]);
        data = {
          metrics: {
            customers,
            products,
            quotePipeline: quotes._sum.total ?? 0,
            quoteCount: quotes._count,
            sales: orders._sum.total ?? 0,
            orderCount: orders._count,
            openTasks,
          },
          stock,
          recent,
        };
        break;
      }
      case "customers":
        data = await db.customer.findMany({
          where: {
            organizationId,
            archivedAt: null,
            ...(query
              ? { name: { contains: query, mode: "insensitive" } }
              : {}),
          },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        });
        break;
      case "leads":
        data = await db.lead.findMany({
          where: {
            organizationId,
            status: { not: "ARCHIVED" },
            ...(query
              ? { name: { contains: query, mode: "insensitive" } }
              : {}),
          },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        });
        break;
      case "products":
        data = await db.product.findMany({
          where: {
            organizationId,
            active: true,
            ...(query
              ? { name: { contains: query, mode: "insensitive" } }
              : {}),
          },
          take,
          skip,
          orderBy: { name: "asc" },
        });
        break;
      case "suppliers":
        data = await db.supplier.findMany({
          where: {
            organizationId,
            active: true,
            ...(query
              ? { name: { contains: query, mode: "insensitive" } }
              : {}),
          },
          take,
          skip,
          orderBy: { name: "asc" },
        });
        break;
      case "warehouses":
        data = await db.warehouse.findMany({
          where: {
            organizationId,
            active: true,
            ...(query
              ? {
                  OR: [
                    { name: { contains: query, mode: "insensitive" } },
                    { code: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          take,
          skip,
          orderBy: { name: "asc" },
        });
        break;
      case "stock":
        data = await db.stock.findMany({
          where: { organizationId },
          include: { product: true, warehouse: true },
          take,
          skip,
          orderBy: { updatedAt: "desc" },
        });
        break;
      case "quotes":
        data = await db.quote.findMany({
          where: {
            organizationId,
            ...(query
              ? {
                  OR: [
                    { number: { contains: query, mode: "insensitive" } },
                    {
                      customer: {
                        name: { contains: query, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {}),
          },
          include: { customer: { select: { name: true } }, lines: true },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        });
        break;
      case "purchases":
        data = await db.purchaseOrder.findMany({
          where: {
            organizationId,
            ...(query
              ? {
                  OR: [
                    { number: { contains: query, mode: "insensitive" } },
                    {
                      supplier: {
                        name: { contains: query, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {}),
          },
          include: {
            supplier: { select: { name: true } },
            lines: true,
            supplierReturns: {
              include: { lines: true },
              orderBy: { returnedAt: "desc" },
            },
          },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        });
        break;
      case "orders":
        data = await db.order.findMany({
          where: {
            organizationId,
            ...(query
              ? {
                  OR: [
                    { number: { contains: query, mode: "insensitive" } },
                    {
                      customer: {
                        name: { contains: query, mode: "insensitive" },
                      },
                    },
                  ],
                }
              : {}),
          },
          include: {
            customer: { select: { name: true } },
            lines: true,
            shipments: {
              include: { lines: true },
              orderBy: { shippedAt: "desc" },
            },
            returns: {
              include: { lines: true },
              orderBy: { receivedAt: "desc" },
            },
          },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        });
        break;
      case "accounts":
        data = await db.financialAccount.findMany({
          where: {
            organizationId,
            active: true,
            ...(query
              ? { name: { contains: query, mode: "insensitive" } }
              : {}),
          },
          take,
          skip,
          orderBy: { name: "asc" },
        });
        break;
      case "obligations":
        data = await db.obligation.findMany({
          where: {
            organizationId,
            ...(query
              ? { counterparty: { contains: query, mode: "insensitive" } }
              : {}),
          },
          take,
          skip,
          orderBy: { dueAt: "asc" },
        });
        break;
      case "tasks":
        data = await db.task.findMany({
          where: {
            organizationId,
            ...(query
              ? {
                  OR: [
                    { title: { contains: query, mode: "insensitive" } },
                    { description: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          take,
          skip,
          orderBy: [{ status: "asc" }, { dueAt: "asc" }],
        });
        break;
      case "automations":
        data = await db.automation.findMany({
          where: {
            organizationId,
            ...(query
              ? { name: { contains: query, mode: "insensitive" } }
              : {}),
          },
          include: { runs: { take: 3, orderBy: { createdAt: "desc" } } },
          take,
          skip,
          orderBy: { updatedAt: "desc" },
        });
        break;
      case "audit":
        data = await db.auditEvent.findMany({
          where: {
            organizationId,
            ...(query
              ? {
                  OR: [
                    { action: { contains: query, mode: "insensitive" } },
                    { resourceType: { contains: query, mode: "insensitive" } },
                    { correlationId: { contains: query, mode: "insensitive" } },
                  ],
                }
              : {}),
          },
          take,
          skip,
          orderBy: { createdAt: "desc" },
        });
        break;
    }
    let hasMore = false;
    if (Array.isArray(data)) {
      hasMore = data.length > pageSize;
      if (hasMore) data = data.slice(0, pageSize);
    }
    return NextResponse.json(
      {
        data: normalized(data),
        pagination: { page, pageSize, hasMore },
        context: {
          organizationName: context.value.organizationName,
          displayName: context.value.displayName,
          role: context.value.role,
          permissions: [...context.value.permissions].sort(),
        },
      },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen de solicitud no permitido." },
        id,
      );
    const payload = z
      .object({ resource: resourceSchema, data: z.unknown() })
      .parse(await request.json());
    const permission = writePermissions[payload.resource];
    if (!permission)
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "El recurso no admite creación directa.",
        },
        id,
      );
    const context = await requirePermission(
      permission,
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const db = getDb();
    const organizationId = context.value.organizationId;
    const correlationId = id;
    const organization = await db.organization.findUniqueOrThrow({
      where: { id: organizationId },
      select: { currency: true, settings: true },
    });
    const settings = organization.settings as {
      quotePrefix?: string;
      orderPrefix?: string;
      purchasePrefix?: string;
    };
    const limitedResources: Partial<Record<Resource, string>> = {
      products: "products",
      warehouses: "warehouses",
      customers: "customers",
      automations: "automations",
    };
    const metric = limitedResources[payload.resource];
    if (metric) {
      let current = 0;
      if (payload.resource === "products")
        current = await db.product.count({
          where: { organizationId, active: true },
        });
      else if (payload.resource === "warehouses")
        current = await db.warehouse.count({
          where: { organizationId, active: true },
        });
      else if (payload.resource === "customers")
        current = await db.customer.count({
          where: { organizationId, archivedAt: null },
        });
      else if (payload.resource === "automations")
        current = await db.automation.count({ where: { organizationId } });
      const limit = await enforcePlanLimit(organizationId, metric, current);
      if (!limit.ok) return jsonError(limit.error, id);
    }
    const created = await db.$transaction(async (tx) => {
      if (metric) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:${metric}`}, 0))`;
        let current = 0;
        if (payload.resource === "products")
          current = await tx.product.count({
            where: { organizationId, active: true },
          });
        else if (payload.resource === "warehouses")
          current = await tx.warehouse.count({
            where: { organizationId, active: true },
          });
        else if (payload.resource === "customers")
          current = await tx.customer.count({
            where: { organizationId, archivedAt: null },
          });
        else if (payload.resource === "automations")
          current = await tx.automation.count({ where: { organizationId } });
        const limit = await enforcePlanLimit(
          organizationId,
          metric,
          current,
          1,
          tx,
        );
        if (!limit.ok) throw new WorkspaceValidation(limit.error.message);
      }
      let created: { id: string };
      switch (payload.resource) {
        case "customers":
          created = await tx.customer.create({
            data: { ...customerSchema.parse(payload.data), organizationId },
          });
          break;
        case "leads":
          created = await tx.lead.create({
            data: { ...leadSchema.parse(payload.data), organizationId },
          });
          break;
        case "products": {
          const input = productSchema.parse(payload.data);
          if (
            input.categoryId &&
            !(await tx.category.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.categoryId },
              },
            }))
          )
            throw new WorkspaceValidation(
              "La categoría no pertenece a la organización.",
            );
          if (
            input.imageDocumentId &&
            !(await tx.document.findFirst({
              where: {
                organizationId,
                id: input.imageDocumentId,
                status: "READY",
                mimeType: { startsWith: "image/" },
              },
            }))
          )
            throw new WorkspaceValidation(
              "La imagen no pertenece a la organización o no está disponible.",
            );
          created = await tx.product.create({
            data: {
              ...input,
              barcode: input.barcode || null,
              description: input.description || null,
              organizationId,
            },
          });
          break;
        }
        case "suppliers":
          created = await tx.supplier.create({
            data: { ...supplierSchema.parse(payload.data), organizationId },
          });
          break;
        case "warehouses":
          created = await tx.warehouse.create({
            data: { ...warehouseSchema.parse(payload.data), organizationId },
          });
          break;
        case "tasks": {
          const input = taskSchema.parse(payload.data);
          created = await tx.task.create({
            data: {
              ...input,
              dueAt: input.dueAt ? new Date(input.dueAt) : undefined,
              organizationId,
            },
          });
          break;
        }
        case "accounts": {
          const input = accountSchema.parse(payload.data);
          created = await tx.financialAccount.create({
            data: {
              name: input.name,
              type: input.type,
              currency: input.currency,
              balance: input.openingBalance,
              organizationId,
            },
          });
          break;
        }
        case "automations": {
          const input = automationSchema.parse(payload.data);
          const action =
            input.action === "task.create"
              ? {
                  type: input.action,
                  title: input.actionTitle || undefined,
                  description: input.actionBody || undefined,
                }
              : input.action === "notification.send"
                ? {
                    type: input.action,
                    title: input.actionTitle || undefined,
                    body: input.actionBody || undefined,
                  }
                : input.action === "email.send"
                  ? {
                      type: input.action,
                      to: input.actionEmail,
                      subject: input.actionTitle || undefined,
                      body: input.actionBody || undefined,
                    }
                  : {
                      type: input.action,
                      resource: input.targetResource,
                      field: input.targetField,
                      value: input.targetValue,
                    };
          const conditions = input.conditionField
            ? {
                field: input.conditionField,
                operator: input.conditionOperator,
                value: input.conditionValue ?? "",
              }
            : {};
          created = await tx.automation.create({
            data: {
              organizationId,
              name: input.name,
              trigger: input.trigger,
              conditions,
              actions: [action],
              active: input.active,
              maxDepth: input.maxDepth,
              versions: {
                create: {
                  organizationId,
                  version: 1,
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
          break;
        }
        case "quotes": {
          const input = quoteSchema.parse(payload.data);
          if (input.contactId) {
            const contact = await tx.contact.findFirst({
              where: {
                organizationId,
                id: input.contactId,
                customerId: input.customerId,
              },
            });
            if (!contact)
              throw new WorkspaceValidation(
                "El contacto no pertenece al cliente seleccionado.",
              );
          }
          const products = await tx.product.findMany({
            where: {
              organizationId,
              id: { in: input.items.map((item) => item.productId) },
              active: true,
            },
          });
          if (
            products.length !==
            new Set(input.items.map((item) => item.productId)).size
          )
            throw new WorkspaceValidation(
              "Uno o más productos no pertenecen a la organización.",
            );
          let subtotal = 0n,
            discountTotal = 0n,
            taxTotal = 0n,
            total = 0n;
          const lines = input.items.map((item) => {
            const product = products.find(
              (candidate) => candidate.id === item.productId,
            );
            if (!product) throw new Error("Validated product missing");
            const calculation = calculateLine({
              quantity: String(item.quantity),
              unitPrice: product.price.toString(),
              discountRate: String(item.discountRate),
              taxRate: product.taxRate.toString(),
            });
            if (!calculation.ok) throw new Error(calculation.error);
            subtotal += calculation.value.subtotal.minor;
            discountTotal += calculation.value.discount.minor;
            taxTotal += calculation.value.tax.minor;
            total += calculation.value.total.minor;
            return {
              organizationId,
              productId: product.id,
              skuSnapshot: product.sku,
              description: product.name,
              quantity: item.quantity,
              unitPrice: product.price,
              discountRate: item.discountRate,
              taxRate: product.taxRate,
              lineTotal: Number(calculation.value.total.minor) / 100,
            };
          });
          const number = await nextNumber(
            tx,
            organizationId,
            "QUOTE",
            settings.quotePrefix ?? "COT",
          );
          created = await tx.quote.create({
            data: {
              organizationId,
              customerId: input.customerId,
              contactId: input.contactId,
              ownerId: context.value.userId,
              number,
              currency: organization.currency,
              validUntil: new Date(input.validUntil),
              terms: input.terms,
              notes: input.notes,
              subtotal: Number(subtotal) / 100,
              discountTotal: Number(discountTotal) / 100,
              taxTotal: Number(taxTotal) / 100,
              total: Number(total) / 100,
              lines: { create: lines },
            },
          });
          break;
        }
        case "purchases": {
          const input = purchaseSchema.parse(payload.data);
          const products = await tx.product.findMany({
            where: {
              organizationId,
              id: { in: input.items.map((item) => item.productId) },
              kind: "PRODUCT",
              active: true,
            },
          });
          if (
            products.length !==
            new Set(input.items.map((item) => item.productId)).size
          )
            throw new WorkspaceValidation(
              "Una compra solo puede contener productos inventariables del tenant.",
            );
          const total = input.items.reduce(
            (sum, item) => sum + item.quantity * item.unitCost,
            0,
          );
          const number = await nextNumber(
            tx,
            organizationId,
            "PURCHASE",
            settings.purchasePrefix ?? "OC",
          );
          created = await tx.purchaseOrder.create({
            data: {
              organizationId,
              supplierId: input.supplierId,
              number,
              currency: organization.currency,
              total,
              expectedAt: input.expectedAt
                ? new Date(input.expectedAt)
                : undefined,
              lines: {
                create: input.items.map((item) => ({
                  organizationId,
                  productId: item.productId,
                  description:
                    products.find((product) => product.id === item.productId)
                      ?.name ?? "Producto",
                  quantity: item.quantity,
                  unitCost: item.unitCost,
                })),
              },
            },
          });
          break;
        }
        case "orders": {
          const input = orderSchema.parse(payload.data);
          const [customer, warehouse, products] = await Promise.all([
            tx.customer.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.customerId },
              },
            }),
            tx.warehouse.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.warehouseId },
              },
            }),
            tx.product.findMany({
              where: {
                organizationId,
                id: { in: input.items.map((item) => item.productId) },
                active: true,
              },
            }),
          ]);
          if (
            !customer ||
            customer.archivedAt ||
            !warehouse?.active ||
            products.length !==
              new Set(input.items.map((item) => item.productId)).size
          )
            throw new WorkspaceValidation(
              "Cliente, almacén o producto no pertenece a la organización.",
            );
          let total = 0;
          const lines = input.items.map((item) => {
            const product = products.find(
              (candidate) => candidate.id === item.productId,
            );
            if (!product) throw new Error("Validated product missing");
            const unitPrice = item.unitPrice ?? Number(product.price);
            const lineTotal = unitPrice * item.quantity;
            total += lineTotal;
            return {
              organizationId,
              productId: product.id,
              description: product.name,
              quantity: item.quantity,
              unitPrice,
              lineTotal,
            };
          });
          const number = await nextNumber(
            tx,
            organizationId,
            "ORDER",
            settings.orderPrefix ?? "PED",
          );
          created = await tx.order.create({
            data: {
              organizationId,
              customerId: customer.id,
              warehouseId: warehouse.id,
              number,
              currency: organization.currency,
              total,
              lines: { create: lines },
            },
          });
          break;
        }
        default:
          throw new WorkspaceValidation(
            "El recurso no admite creación directa.",
          );
      }
      await Promise.all([
        tx.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: `${payload.resource}.create`,
            resourceType: payload.resource,
            resourceId: created.id,
            outcome: "SUCCESS",
            correlationId,
          },
        }),
        tx.outboxEvent.create({
          data: {
            organizationId,
            topic: `${payload.resource}.created`,
            aggregateType: payload.resource,
            aggregateId: created.id,
            payload: { id: created.id },
            correlationId,
          },
        }),
      ]);
      return created;
    });
    await recordUsage(organizationId, `${payload.resource}.created`).catch(
      (error) => {
        console.error(
          JSON.stringify({
            level: "error",
            event: "usage.record.failed",
            organizationId,
            metric: `${payload.resource}.created`,
            requestId: id,
            error: error instanceof Error ? error.message : String(error),
          }),
        );
      },
    );
    return NextResponse.json(
      { data: created },
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (error instanceof WorkspaceValidation)
      return jsonError({ code: "VALIDATION", message: error.message }, id);
    return handleRouteError(error, id);
  }
}
