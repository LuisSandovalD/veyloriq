import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const inputSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("movement.create"),
    accountId: z.string().cuid(),
    direction: z.enum(["IN", "OUT"]),
    category: z.string().trim().min(2).max(80),
    categoryId: z.string().cuid().optional(),
    amount: z.coerce.number().positive(),
    reason: z.string().trim().min(4).max(300),
    idempotencyKey: z.string().min(8).max(120),
  }),
  z
    .object({
      action: z.literal("transfer.create"),
      fromAccountId: z.string().cuid(),
      toAccountId: z.string().cuid(),
      amount: z.coerce.number().positive(),
      reason: z.string().trim().min(4).max(300),
      idempotencyKey: z.string().min(8).max(120),
    })
    .refine((value) => value.fromAccountId !== value.toAccountId, {
      message: "Las cuentas deben ser distintas.",
    }),
  z.object({
    action: z.literal("movement.reverse"),
    movementId: z.string().cuid(),
    reason: z.string().trim().min(8).max(300),
    idempotencyKey: z.string().min(8).max(120),
  }),
  z.object({
    action: z.literal("category.create"),
    name: z.string().trim().min(2).max(80),
    direction: z.enum(["IN", "OUT", "BOTH"]),
    reason: z.string().trim().min(4).max(300),
    idempotencyKey: z.string().min(8).max(120),
  }),
  z.object({
    action: z.literal("reconciliation.create"),
    accountId: z.string().cuid(),
    statementBalance: z.coerce.number(),
    reason: z.string().trim().min(4).max(300),
    idempotencyKey: z.string().min(8).max(120),
  }),
]);

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("finance.read");
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const db = getDb();
    const [
      accounts,
      obligations,
      payments,
      movements,
      categories,
      reconciliations,
    ] = await Promise.all([
      db.financialAccount.findMany({
        where: { organizationId, active: true },
        orderBy: { name: "asc" },
      }),
      db.obligation.findMany({
        where: { organizationId },
        orderBy: { dueAt: "asc" },
        take: 100,
      }),
      db.payment.findMany({
        where: { organizationId },
        include: { account: { select: { name: true } }, allocations: true },
        orderBy: { paidAt: "desc" },
        take: 50,
      }),
      db.cashMovement.findMany({
        where: { organizationId },
        include: { account: { select: { name: true, currency: true } } },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.financialCategory.findMany({
        where: { organizationId, active: true },
        orderBy: [{ direction: "asc" }, { name: "asc" }],
      }),
      db.accountReconciliation.findMany({
        where: { organizationId },
        include: { account: { select: { name: true, currency: true } } },
        orderBy: { reconciledAt: "desc" },
        take: 50,
      }),
    ]);
    return NextResponse.json(
      {
        accounts,
        obligations,
        payments,
        movements,
        categories,
        reconciliations,
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
        { code: "FORBIDDEN", message: "Origen no permitido." },
        id,
      );
    const context = await requirePermission("finance.write");
    if (!context.ok) return jsonError(context.error, id);
    const input = inputSchema.parse(await request.json());
    const organizationId = context.value.organizationId;
    const db = getDb();
    const requestHash = createHash("sha256")
      .update(JSON.stringify(input))
      .digest("hex");
    const existing = await db.idempotencyKey.findUnique({
      where: {
        organizationId_actorId_operation_key: {
          organizationId,
          actorId: context.value.userId,
          operation: input.action,
          key: input.idempotencyKey,
        },
      },
    });
    if (existing) {
      if (existing.requestHash !== requestHash)
        return jsonError(
          {
            code: "CONFLICT",
            message:
              "La clave de idempotencia ya fue utilizada con otros datos.",
          },
          id,
        );
      if (existing.response) return NextResponse.json(existing.response);
      return jsonError(
        { code: "CONFLICT", message: "La operación está en proceso." },
        id,
      );
    }
    const output = await db.$transaction(
      async (tx) => {
        await tx.idempotencyKey.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            operation: input.action,
            key: input.idempotencyKey,
            requestHash,
            expiresAt: new Date(Date.now() + 86400000),
          },
        });
        let result: Record<string, unknown>;
        if (input.action === "category.create") {
          const category = await tx.financialCategory.create({
            data: {
              organizationId,
              name: input.name,
              direction: input.direction,
            },
          });
          result = { id: category.id, status: "ACTIVE" };
        } else if (input.action === "movement.create") {
          const category = input.categoryId
            ? await tx.financialCategory.findFirst({
                where: { organizationId, id: input.categoryId, active: true },
              })
            : null;
          if (
            input.categoryId &&
            (!category ||
              ![input.direction, "BOTH"].includes(category.direction))
          )
            throw new FinanceFailure(
              "La categoría no corresponde a la dirección del movimiento.",
            );
          const account = await tx.financialAccount.findUnique({
            where: {
              organizationId_id: { organizationId, id: input.accountId },
            },
          });
          if (!account?.active)
            throw new FinanceFailure("La cuenta no está disponible.");
          const signed =
            input.direction === "IN" ? input.amount : -input.amount;
          if (Number(account.balance) + signed < 0)
            throw new FinanceFailure("El egreso supera el saldo disponible.");
          const movement = await tx.cashMovement.create({
            data: {
              organizationId,
              accountId: account.id,
              categoryId: category?.id,
              type: `${input.direction}_${(category?.name ?? input.category).toUpperCase().replace(/[^A-Z0-9]+/g, "_")}`,
              amount: signed,
              previous: account.balance,
              resulting: new Prisma.Decimal(account.balance).plus(signed),
              referenceType: "ManualMovement",
              referenceId: input.idempotencyKey,
            },
          });
          await tx.financialAccount.update({
            where: { organizationId_id: { organizationId, id: account.id } },
            data: { balance: { increment: signed } },
          });
          result = { id: movement.id, status: "CONFIRMED" };
        } else if (input.action === "transfer.create") {
          const [source, target] = await Promise.all([
            tx.financialAccount.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.fromAccountId },
              },
            }),
            tx.financialAccount.findUnique({
              where: {
                organizationId_id: { organizationId, id: input.toAccountId },
              },
            }),
          ]);
          if (!source?.active || !target?.active)
            throw new FinanceFailure("Una de las cuentas no está disponible.");
          if (source.currency !== target.currency)
            throw new FinanceFailure(
              "Las transferencias requieren la misma moneda.",
            );
          if (Number(source.balance) < input.amount)
            throw new FinanceFailure("Saldo insuficiente para transferir.");
          await tx.financialAccount.update({
            where: { organizationId_id: { organizationId, id: source.id } },
            data: { balance: { decrement: input.amount } },
          });
          await tx.financialAccount.update({
            where: { organizationId_id: { organizationId, id: target.id } },
            data: { balance: { increment: input.amount } },
          });
          const transferId = crypto.randomUUID();
          await tx.cashMovement.createMany({
            data: [
              {
                organizationId,
                accountId: source.id,
                type: "TRANSFER_OUT",
                amount: -input.amount,
                previous: source.balance,
                resulting: new Prisma.Decimal(source.balance).minus(
                  input.amount,
                ),
                referenceType: "Transfer",
                referenceId: transferId,
              },
              {
                organizationId,
                accountId: target.id,
                type: "TRANSFER_IN",
                amount: input.amount,
                previous: target.balance,
                resulting: new Prisma.Decimal(target.balance).plus(
                  input.amount,
                ),
                referenceType: "Transfer",
                referenceId: transferId,
              },
            ],
          });
          result = { id: transferId, status: "CONFIRMED" };
        } else if (input.action === "reconciliation.create") {
          const account = await tx.financialAccount.findUnique({
            where: {
              organizationId_id: { organizationId, id: input.accountId },
            },
          });
          if (!account?.active)
            throw new FinanceFailure("La cuenta no está disponible.");
          const bookBalance = Number(account.balance);
          const difference = input.statementBalance - bookBalance;
          const reconciliation = await tx.accountReconciliation.create({
            data: {
              organizationId,
              accountId: account.id,
              statementBalance: input.statementBalance,
              bookBalance,
              difference,
              notes: input.reason,
              actorId: context.value.userId,
            },
          });
          if (difference !== 0) {
            const adjustment = await tx.cashMovement.create({
              data: {
                organizationId,
                accountId: account.id,
                type: "RECONCILIATION_ADJUSTMENT",
                amount: difference,
                previous: account.balance,
                resulting: new Prisma.Decimal(account.balance).plus(difference),
                referenceType: "AccountReconciliation",
                referenceId: reconciliation.id,
              },
            });
            await tx.financialAccount.update({
              where: { organizationId_id: { organizationId, id: account.id } },
              data: { balance: { increment: difference } },
            });
            result = {
              id: reconciliation.id,
              adjustmentId: adjustment.id,
              difference,
              status: "RECONCILED",
            };
          } else {
            result = {
              id: reconciliation.id,
              difference: 0,
              status: "RECONCILED",
            };
          }
        } else {
          const original = await tx.cashMovement.findFirst({
            where: { organizationId, id: input.movementId },
            include: { account: true },
          });
          if (!original) throw new FinanceFailure("El movimiento no existe.");
          if (original.reversedById)
            throw new FinanceFailure("El movimiento ya fue revertido.");
          const signed = -Number(original.amount);
          if (Number(original.account.balance) + signed < 0)
            throw new FinanceFailure("La reversión dejaría un saldo negativo.");
          const reversal = await tx.cashMovement.create({
            data: {
              organizationId,
              accountId: original.accountId,
              type: `REVERSAL_${original.type}`.slice(0, 100),
              amount: signed,
              previous: original.account.balance,
              resulting: new Prisma.Decimal(original.account.balance).plus(
                signed,
              ),
              referenceType: "CashMovement",
              referenceId: original.id,
            },
          });
          await tx.financialAccount.update({
            where: {
              organizationId_id: { organizationId, id: original.accountId },
            },
            data: { balance: { increment: signed } },
          });
          await tx.cashMovement.update({
            where: { id: original.id },
            data: { reversedById: reversal.id },
          });
          if (original.referenceType === "Payment") {
            const payment = await tx.payment.findFirst({
              where: {
                organizationId,
                id: original.referenceId,
                status: "CONFIRMED",
              },
              include: { allocations: true },
            });
            if (payment) {
              for (const allocation of payment.allocations) {
                const obligation = await tx.obligation.findUnique({
                  where: {
                    organizationId_id: {
                      organizationId,
                      id: allocation.obligationId,
                    },
                  },
                });
                if (obligation) {
                  const paid = Math.max(
                    0,
                    Number(obligation.paidAmount) - Number(allocation.amount),
                  );
                  await tx.obligation.update({
                    where: {
                      organizationId_id: { organizationId, id: obligation.id },
                    },
                    data: {
                      paidAmount: paid,
                      status:
                        paid === 0
                          ? "OPEN"
                          : paid >= Number(obligation.amount)
                            ? "PAID"
                            : "PARTIALLY_PAID",
                    },
                  });
                }
              }
              await tx.payment.update({
                where: {
                  organizationId_id: { organizationId, id: payment.id },
                },
                data: { status: "REVERSED" },
              });
            }
          }
          result = {
            id: reversal.id,
            reversedMovementId: original.id,
            status: "REVERSED",
          };
        }
        await tx.auditEvent.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            action: input.action,
            resourceType: "CashMovement",
            resourceId: String(result.id),
            outcome: "SUCCESS",
            reason: input.reason,
            correlationId: id,
          },
        });
        await tx.idempotencyKey.update({
          where: {
            organizationId_actorId_operation_key: {
              organizationId,
              actorId: context.value.userId,
              operation: input.action,
              key: input.idempotencyKey,
            },
          },
          data: { response: result as Prisma.InputJsonValue, statusCode: 200 },
        });
        return result;
      },
      {
        isolationLevel: Prisma.TransactionIsolationLevel.Serializable,
        maxWait: 5000,
        timeout: 15000,
      },
    );
    return NextResponse.json(output, { headers: { "x-request-id": id } });
  } catch (error) {
    if (error instanceof FinanceFailure)
      return jsonError({ code: "CONFLICT", message: error.message }, id);
    return handleRouteError(error, id);
  }
}
class FinanceFailure extends Error {}
