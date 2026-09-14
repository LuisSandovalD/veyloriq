import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getPlatformContext } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("platform_user.role"),
    email: z.string().email(),
    role: z
      .enum([
        "PLATFORM_SUPERUSER",
        "PLATFORM_ADMIN",
        "PLATFORM_SUPPORT",
        "PLATFORM_ANALYST",
      ])
      .nullable(),
    reason: z.string().trim().min(8).max(500),
  }),
  z.object({
    action: z.literal("plan.update"),
    planId: z.string().cuid(),
    name: z.string().trim().min(2).max(80),
    monthlyPrice: z.coerce.number().min(0),
    annualPrice: z.coerce.number().min(0),
    currency: z.enum(["PEN", "USD", "EUR"]),
    active: z.boolean(),
    limits: z.record(z.string(), z.coerce.number().int().min(0)),
    features: z.array(z.string().trim().min(1).max(80)).max(50),
  }),
  z.object({
    action: z.literal("incident.open"),
    organizationId: z.string().cuid().optional(),
    title: z.string().trim().min(4).max(160),
    severity: z.enum(["LOW", "MEDIUM", "HIGH", "CRITICAL"]),
    description: z.string().trim().min(10).max(3000),
  }),
  z.object({
    action: z.literal("incident.resolve"),
    incidentId: z.string().cuid(),
    resolution: z.string().trim().min(10).max(3000),
  }),
  z.object({
    action: z.literal("support.grant"),
    organizationId: z.string().cuid(),
    reason: z.string().trim().min(10).max(1000),
    scopes: z
      .array(
        z.enum([
          "organization.metadata",
          "billing.read",
          "jobs.read",
          "integrations.read",
        ]),
      )
      .min(1),
    durationMinutes: z.coerce.number().int().min(5).max(480),
  }),
  z.object({
    action: z.literal("support.revoke"),
    grantId: z.string().cuid(),
    reason: z.string().trim().min(8).max(500),
  }),
]);
const serialize = <T>(value: T): T =>
  JSON.parse(
    JSON.stringify(value, (_key, item) =>
      typeof item === "bigint" ? item.toString() : item,
    ),
  );

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getPlatformContext();
    if (!context.ok) return jsonError(context.error, id);
    const db = getDb();
    const now = new Date();
    const [
      plans,
      platformUsers,
      usage,
      billingEvents,
      audit,
      incidents,
      grants,
      lastWorker,
      oldestOutbox,
    ] = await Promise.all([
      db.plan.findMany({ orderBy: { monthlyPrice: "asc" } }),
      db.user.findMany({
        where: { platformRole: { not: null } },
        select: {
          id: true,
          email: true,
          displayName: true,
          platformRole: true,
          mfaEnabled: true,
          createdAt: true,
        },
        orderBy: { createdAt: "asc" },
      }),
      db.usageCounter.groupBy({
        by: ["metric"],
        _sum: { value: true, reserved: true },
      }),
      db.billingEvent.findMany({ orderBy: { occurredAt: "desc" }, take: 50 }),
      db.auditEvent.findMany({
        where: { action: { startsWith: "platform." } },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.platformIncident.findMany({
        include: {
          organization: { select: { name: true } },
          openedBy: { select: { displayName: true } },
          resolvedBy: { select: { displayName: true } },
        },
        orderBy: { openedAt: "desc" },
        take: 50,
      }),
      db.supportGrant.findMany({
        include: {
          organization: { select: { name: true } },
          operator: { select: { displayName: true, email: true } },
        },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      db.serviceHeartbeat.findUnique({ where: { id: "worker" } }),
      db.outboxEvent.findFirst({
        where: { processedAt: null, failedAt: null },
        orderBy: { availableAt: "asc" },
        select: { availableAt: true },
      }),
    ]);
    const workerAge = lastWorker?.updatedAt
      ? now.getTime() - lastWorker.updatedAt.getTime()
      : null;
    const integration = (configured: boolean) =>
      configured ? "CONFIGURED_NOT_PROBED" : "NOT_CONFIGURED";
    return NextResponse.json(
      serialize({
        plans,
        platformUsers,
        usage,
        billingEvents,
        audit,
        incidents,
        grants,
        services: {
          database: { status: "OPERATIONAL", checkedAt: now },
          worker: {
            status:
              workerAge !== null && workerAge < 120000
                ? "OPERATIONAL"
                : "STALE_OR_UNKNOWN",
            lastHeartbeat: lastWorker?.updatedAt ?? null,
          },
          outbox: {
            oldestPendingAt: oldestOutbox?.availableAt ?? null,
            lagSeconds: oldestOutbox
              ? Math.max(
                  0,
                  Math.round(
                    (now.getTime() - oldestOutbox.availableAt.getTime()) / 1000,
                  ),
                )
              : 0,
          },
          redis: { status: integration(Boolean(process.env.REDIS_URL)) },
          brevo: { status: integration(Boolean(process.env.BREVO_API_KEY)) },
          cloudinary: {
            status: integration(
              Boolean(
                process.env.CLOUDINARY_URL || process.env.CLOUDINARY_CLOUD_NAME,
              ),
            ),
          },
          mercadoPago: {
            status: integration(Boolean(process.env.MERCADOPAGO_ACCESS_TOKEN)),
          },
          ai: { status: integration(Boolean(process.env.AI_API_KEY)) },
        },
      }),
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
    const context = await getPlatformContext();
    if (!context.ok) return jsonError(context.error, id);
    if (!["PLATFORM_SUPERUSER", "PLATFORM_ADMIN"].includes(context.value.role))
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Tu rol de plataforma es de solo lectura.",
        },
        id,
      );
    const input = schema.parse(await request.json());
    const db = getDb();
    let output: Record<string, unknown>;
    if (input.action === "platform_user.role") {
      if (
        input.role === "PLATFORM_SUPERUSER" &&
        context.value.role !== "PLATFORM_SUPERUSER"
      )
        return jsonError(
          {
            code: "FORBIDDEN",
            message: "Solo un superusuario puede conceder ese rol.",
          },
          id,
        );
      const target = await db.user.findUnique({
        where: { email: input.email.toLowerCase() },
      });
      if (!target)
        return jsonError(
          { code: "NOT_FOUND", message: "Usuario no encontrado." },
          id,
        );
      if (target.id === context.value.userId && input.role === null)
        return jsonError(
          {
            code: "CONFLICT",
            message: "No puedes retirar tu propio acceso en esta operación.",
          },
          id,
        );
      await db.$transaction([
        db.user.update({
          where: { id: target.id },
          data: { platformRole: input.role },
        }),
        db.session.updateMany({
          where: { userId: target.id, revokedAt: null },
          data: { revokedAt: new Date() },
        }),
        db.auditEvent.create({
          data: {
            actorId: context.value.userId,
            action: "platform.user.role",
            resourceType: "User",
            resourceId: target.id,
            outcome: "SUCCESS",
            changes: { role: input.role },
            reason: input.reason,
            correlationId: id,
          },
        }),
      ]);
      output = { id: target.id, role: input.role };
    } else if (input.action === "plan.update") {
      const plan = await db.$transaction(async (tx) => {
        const updated = await tx.plan.update({
          where: { id: input.planId },
          data: {
            name: input.name,
            monthlyPrice: input.monthlyPrice,
            annualPrice: input.annualPrice,
            currency: input.currency,
            active: input.active,
            limits: input.limits,
            features: input.features,
          },
        });
        await tx.auditEvent.create({
          data: {
            actorId: context.value.userId,
            action: "platform.plan.update",
            resourceType: "Plan",
            resourceId: updated.id,
            outcome: "SUCCESS",
            changes: {
              monthlyPrice: input.monthlyPrice,
              annualPrice: input.annualPrice,
              limits: input.limits,
            },
            correlationId: id,
          },
        });
        return updated;
      });
      output = { id: plan.id };
    } else if (input.action === "incident.open") {
      const incident = await db.$transaction(async (tx) => {
        const created = await tx.platformIncident.create({
          data: {
            organizationId: input.organizationId,
            title: input.title,
            severity: input.severity,
            description: input.description,
            openedById: context.value.userId,
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorId: context.value.userId,
            action: "platform.incident.open",
            resourceType: "PlatformIncident",
            resourceId: created.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        });
        return created;
      });
      output = { id: incident.id, status: incident.status };
    } else if (input.action === "incident.resolve") {
      const incident = await db.$transaction(async (tx) => {
        const updated = await tx.platformIncident.update({
          where: { id: input.incidentId },
          data: {
            status: "RESOLVED",
            resolution: input.resolution,
            resolvedAt: new Date(),
            resolvedById: context.value.userId,
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: updated.organizationId,
            actorId: context.value.userId,
            action: "platform.incident.resolve",
            resourceType: "PlatformIncident",
            resourceId: updated.id,
            outcome: "SUCCESS",
            reason: input.resolution,
            correlationId: id,
          },
        });
        return updated;
      });
      output = { id: incident.id, status: "RESOLVED" };
    } else if (input.action === "support.grant") {
      const grant = await db.$transaction(async (tx) => {
        const created = await tx.supportGrant.create({
          data: {
            organizationId: input.organizationId,
            operatorId: context.value.userId,
            reason: input.reason,
            scopes: input.scopes,
            expiresAt: new Date(Date.now() + input.durationMinutes * 60000),
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorId: context.value.userId,
            effectiveActorId: context.value.userId,
            action: "platform.support.grant",
            resourceType: "SupportGrant",
            resourceId: created.id,
            outcome: "SUCCESS",
            reason: input.reason,
            changes: { scopes: input.scopes, expiresAt: created.expiresAt },
            correlationId: id,
          },
        });
        return created;
      });
      output = { id: grant.id, expiresAt: grant.expiresAt };
    } else {
      const grant = await db.supportGrant.findUnique({
        where: { id: input.grantId },
      });
      if (!grant)
        return jsonError(
          { code: "NOT_FOUND", message: "Autorización no encontrada." },
          id,
        );
      await db.$transaction([
        db.supportGrant.update({
          where: { id: grant.id },
          data: { revokedAt: new Date(), revokedById: context.value.userId },
        }),
        db.auditEvent.create({
          data: {
            organizationId: grant.organizationId,
            actorId: context.value.userId,
            effectiveActorId: grant.operatorId,
            action: "platform.support.revoke",
            resourceType: "SupportGrant",
            resourceId: grant.id,
            outcome: "SUCCESS",
            reason: input.reason,
            correlationId: id,
          },
        }),
      ]);
      output = { id: grant.id, revoked: true };
    }
    return NextResponse.json(
      { data: output },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}
