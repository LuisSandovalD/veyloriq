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
    action: z.enum(["suspend", "reactivate"]),
    organizationId: z.string().cuid(),
    reason: z.string().trim().min(8).max(500),
  }),
  z.object({
    action: z.literal("retry_job"),
    jobId: z.string().cuid(),
    reason: z.string().trim().min(8).max(500),
  }),
  z.object({
    action: z.literal("retry_outbox"),
    outboxEventId: z.string().cuid(),
    reason: z.string().trim().min(8).max(500),
  }),
]);

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getPlatformContext();
    if (!context.ok) return jsonError(context.error, id);
    const db = getDb();
    const [
      organizations,
      users,
      subscriptions,
      failedJobs,
      failedOutbox,
      pendingJobs,
      webhookFailures,
    ] = await Promise.all([
      db.organization.findMany({
        select: {
          id: true,
          name: true,
          status: true,
          currency: true,
          createdAt: true,
          _count: {
            select: { memberships: true, products: true, orders: true },
          },
          subscription: {
            select: { status: true, plan: { select: { name: true } } },
          },
        },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
      db.user.count(),
      db.subscription.groupBy({ by: ["status"], _count: true }),
      db.job.findMany({
        where: { status: "FAILED" },
        orderBy: { updatedAt: "desc" },
        take: 25,
      }),
      db.outboxEvent.findMany({
        where: { failedAt: { not: null }, processedAt: null },
        orderBy: { failedAt: "desc" },
        take: 25,
      }),
      db.job.count({
        where: { status: { in: ["PENDING", "RETRYING", "RUNNING"] } },
      }),
      db.webhookEvent.count({
        where: { processedAt: null, attempts: { gt: 0 } },
      }),
    ]);
    return NextResponse.json(
      {
        metrics: {
          organizations: organizations.length,
          users,
          pendingJobs,
          webhookFailures,
          failedOutbox: failedOutbox.length,
        },
        organizations,
        subscriptions,
        failedJobs,
        failedOutbox,
        operator: { name: context.value.displayName, role: context.value.role },
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
    if (input.action === "retry_job") {
      const changed = await db.$transaction(async (tx) => {
        const result = await tx.job.updateMany({
          where: { id: input.jobId, status: "FAILED" },
          data: {
            status: "RETRYING",
            runAt: new Date(),
            attempts: 0,
            lockedAt: null,
            lastError: null,
          },
        });
        if (result.count)
          await tx.auditEvent.create({
            data: {
              actorId: context.value.userId,
              action: "platform.job.retry",
              resourceType: "Job",
              resourceId: input.jobId,
              outcome: "SUCCESS",
              reason: input.reason,
              correlationId: id,
            },
          });
        return result.count;
      });
      if (!changed)
        return jsonError(
          { code: "NOT_FOUND", message: "Trabajo fallido no encontrado." },
          id,
        );
      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id } },
      );
    }
    if (input.action === "retry_outbox") {
      const changed = await db.$transaction(async (tx) => {
        const result = await tx.outboxEvent.updateMany({
          where: {
            id: input.outboxEventId,
            failedAt: { not: null },
            processedAt: null,
          },
          data: {
            failedAt: null,
            availableAt: new Date(),
            attempts: 0,
            lockedAt: null,
            lastError: null,
          },
        });
        if (result.count)
          await tx.auditEvent.create({
            data: {
              actorId: context.value.userId,
              action: "platform.outbox.retry",
              resourceType: "OutboxEvent",
              resourceId: input.outboxEventId,
              outcome: "SUCCESS",
              reason: input.reason,
              correlationId: id,
            },
          });
        return result.count;
      });
      if (!changed)
        return jsonError(
          { code: "NOT_FOUND", message: "Evento fallido no encontrado." },
          id,
        );
      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id } },
      );
    }
    const status = input.action === "suspend" ? "SUSPENDED" : "ACTIVE";
    const changed = await db.$transaction(async (tx) => {
      const result = await tx.organization.updateMany({
        where: {
          id: input.organizationId,
          status:
            input.action === "suspend"
              ? { in: ["ACTIVE", "ONBOARDING"] }
              : "SUSPENDED",
        },
        data: { status },
      });
      if (result.count)
        await tx.auditEvent.create({
          data: {
            organizationId: input.organizationId,
            actorId: context.value.userId,
            action: `platform.organization.${input.action}`,
            resourceType: "Organization",
            resourceId: input.organizationId,
            outcome: "SUCCESS",
            reason: input.reason,
            correlationId: id,
          },
        });
      return result.count;
    });
    if (!changed)
      return jsonError(
        {
          code: "CONFLICT",
          message: "La organización ya no está en el estado esperado.",
        },
        id,
      );
    return NextResponse.json(
      { ok: true, status },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}
