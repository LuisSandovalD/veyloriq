import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/identity/application/auth";
import { mercadoPagoRequest } from "@/modules/billing/infrastructure/mercadopago";
import { getDb } from "@/shared/database";
import { billingEnv } from "@/shared/env";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const schema = z.object({
  planId: z.string().cuid(),
  cycle: z.enum(["MONTHLY", "ANNUAL"]),
  idempotencyKey: z.string().uuid(),
});
type Preapproval = {
  id: string;
  init_point: string;
  status: string;
};

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen de solicitud no permitido." },
        id,
      );
    const input = schema.parse(await request.json());
    const context = await requirePermission(
      "billing.manage",
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const db = getDb();
    const plan = await db.plan.findUnique({ where: { id: input.planId } });
    if (!plan?.active || plan.code === "FREE")
      return jsonError(
        {
          code: "VALIDATION",
          message: "Selecciona un plan comercial activo.",
        },
        id,
      );
    const amount =
      input.cycle === "ANNUAL" ? plan.annualPrice : plan.monthlyPrice;
    const existing = await db.pendingSubscriptionChange.findUnique({
      where: { id: input.idempotencyKey },
    });
    if (
      existing &&
      (existing.organizationId !== context.value.organizationId ||
        existing.planId !== plan.id ||
        existing.billingCycle !== input.cycle)
    )
      return jsonError(
        {
          code: "CONFLICT",
          message: "La clave de idempotencia ya se usó con otros datos.",
        },
        id,
      );
    let intent = existing;
    if (!intent) {
      try {
        intent = await db.$transaction(async (tx) => {
          const created = await tx.pendingSubscriptionChange.create({
            data: {
              id: input.idempotencyKey,
              organizationId: context.value.organizationId,
              planId: plan.id,
              providerId: `intent:${input.idempotencyKey}`,
              billingCycle: input.cycle,
              status: "REQUESTED",
              expiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000),
            },
          });
          await tx.auditEvent.create({
            data: {
              organizationId: context.value.organizationId,
              actorId: context.value.userId,
              action: "billing.checkout.requested",
              resourceType: "PendingSubscriptionChange",
              resourceId: created.id,
              outcome: "SUCCESS",
              changes: { planId: plan.id, billingCycle: input.cycle },
              correlationId: id,
            },
          });
          return created;
        });
      } catch (error) {
        if (
          !(error instanceof Prisma.PrismaClientKnownRequestError) ||
          error.code !== "P2002"
        )
          throw error;
        intent = await db.pendingSubscriptionChange.findUnique({
          where: { id: input.idempotencyKey },
        });
        if (!intent) throw error;
      }
    }
    if (!intent.providerId.startsWith("intent:")) {
      const recovered = await mercadoPagoRequest<Preapproval>(
        `/preapproval/${encodeURIComponent(intent.providerId)}`,
      );
      return NextResponse.json(
        { checkoutUrl: recovered.init_point, recovered: true },
        { headers: { "x-request-id": id } },
      );
    }
    const { APP_URL } = billingEnv();
    let response: Preapproval;
    try {
      response = await mercadoPagoRequest<Preapproval>("/preapproval", {
        method: "POST",
        headers: { "X-Idempotency-Key": intent.id },
        body: JSON.stringify({
          reason: `VEYLORIQ ${plan.name} ${input.cycle === "ANNUAL" ? "anual" : "mensual"}`,
          external_reference: context.value.organizationId,
          payer_email: context.value.email,
          back_url: `${APP_URL}/app?billing=return`,
          auto_recurring: {
            frequency: input.cycle === "ANNUAL" ? 12 : 1,
            frequency_type: "months",
            transaction_amount: Number(amount),
            currency_id: plan.currency,
          },
        }),
      });
    } catch (error) {
      await db.pendingSubscriptionChange.updateMany({
        where: { id: intent.id, providerId: intent.providerId },
        data: { status: "FAILED" },
      });
      throw error;
    }
    const persisted = await db.$transaction(async (tx) => {
      const changed = await tx.pendingSubscriptionChange.updateMany({
        where: { id: intent.id, providerId: intent.providerId },
        data: { providerId: response.id, status: "PENDING" },
      });
      if (changed.count === 1)
        await tx.auditEvent.create({
          data: {
            organizationId: context.value.organizationId,
            actorId: context.value.userId,
            action: "billing.checkout.provider_created",
            resourceType: "PendingSubscriptionChange",
            resourceId: intent.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        });
      return changed.count === 1;
    });
    if (!persisted) {
      const concurrent = await db.pendingSubscriptionChange.findUnique({
        where: { id: intent.id },
      });
      if (concurrent?.providerId !== response.id)
        throw new Error("Checkout intent changed while contacting provider");
    }
    return NextResponse.json(
      { checkoutUrl: response.init_point },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}
