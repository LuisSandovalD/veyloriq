import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("billing.manage");
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const [subscription, plans, usage, pending, history] = await Promise.all([
      getDb().subscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      }),
      getDb().plan.findMany({
        where: { active: true },
        orderBy: { monthlyPrice: "asc" },
      }),
      getDb().usageCounter.findMany({ where: { organizationId } }),
      getDb().pendingSubscriptionChange.findMany({
        where: {
          organizationId,
          status: "PENDING",
          expiresAt: { gt: new Date() },
        },
        include: { plan: true },
        orderBy: { createdAt: "desc" },
      }),
      getDb().billingEvent.findMany({
        where: { organizationId },
        orderBy: { occurredAt: "desc" },
        take: 50,
      }),
    ]);
    const [users, products, customers, warehouses, automations] =
      await Promise.all([
        getDb().membership.count({
          where: { organizationId, status: "ACTIVE" },
        }),
        getDb().product.count({ where: { organizationId, active: true } }),
        getDb().customer.count({
          where: { organizationId, archivedAt: null },
        }),
        getDb().warehouse.count({ where: { organizationId, active: true } }),
        getDb().automation.count({ where: { organizationId } }),
      ]);
    return NextResponse.json(
      {
        subscription,
        plans,
        usage,
        resources: { users, products, customers, warehouses, automations },
        pending,
        history,
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
    const context = await requirePermission("billing.manage");
    if (!context.ok) return jsonError(context.error, id);
    const { action } = z
      .object({ action: z.enum(["cancel", "reactivate"]) })
      .parse(await request.json());
    const db = getDb();
    const subscription = await db.subscription.findUnique({
      where: { organizationId: context.value.organizationId },
    });
    if (!subscription?.providerId || subscription.provider !== "MERCADOPAGO")
      return jsonError(
        {
          code: "CONFLICT",
          message: "No existe una suscripción administrable en Mercado Pago.",
        },
        id,
      );
    await db.$transaction([
      db.outboxEvent.create({
        data: {
          organizationId: context.value.organizationId,
          topic: "billing.subscription.update_requested",
          aggregateType: "Subscription",
          aggregateId: subscription.id,
          payload: {
            providerId: subscription.providerId,
            action,
          },
          correlationId: id,
        },
      }),
      db.auditEvent.create({
        data: {
          organizationId: context.value.organizationId,
          actorId: context.value.userId,
          action: `billing.${action}.requested`,
          resourceType: "Subscription",
          resourceId: subscription.id,
          outcome: "SUCCESS",
          correlationId: id,
        },
      }),
    ]);
    return NextResponse.json(
      { ok: true, status: "PENDING_RECONCILIATION" },
      { status: 202, headers: { "x-request-id": id } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}
