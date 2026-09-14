import { createHash, timingSafeEqual } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { getDb } from "@/shared/database";
import { handleRouteError, jsonError, requestId } from "@/shared/http";

const schema = z
  .object({
    event: z.string().min(1).max(80),
    email: z.string().email(),
    id: z.union([z.string(), z.number()]).optional(),
    "message-id": z.string().min(1).max(500),
    ts_event: z.coerce.number().int().optional(),
    reason: z.string().max(1000).optional(),
  })
  .passthrough();

function authorized(value: string | undefined, expected: string | undefined) {
  if (!value || !expected) return false;
  const provided = Buffer.from(value);
  const target = Buffer.from(`Bearer ${expected}`);
  return provided.length === target.length && timingSafeEqual(provided, target);
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (
      !authorized(
        request.headers.get("authorization") ?? undefined,
        process.env.BREVO_WEBHOOK_TOKEN,
      )
    )
      return jsonError(
        { code: "FORBIDDEN", message: "Webhook no autorizado." },
        id,
      );
    const input = schema.parse(await request.json());
    const eventId = createHash("sha256")
      .update(
        `${input["message-id"]}:${input.event}:${input.ts_event ?? input.id ?? ""}`,
      )
      .digest("hex");
    const providerPayload = input as Prisma.InputJsonObject;
    const statusMap: Record<string, string> = {
      request: "SENT",
      sent: "SENT",
      delivered: "DELIVERED",
      hard_bounce: "FAILED",
      soft_bounce: "DEFERRED",
      blocked: "FAILED",
      invalid_email: "FAILED",
      error: "FAILED",
      spam: "COMPLAINT",
      unsubscribed: "UNSUBSCRIBED",
      deferred: "DEFERRED",
      opened: "OPENED",
      unique_opened: "OPENED",
      click: "CLICKED",
    };
    const status = statusMap[input.event] ?? input.event.toUpperCase();
    const terminal = ["FAILED", "COMPLAINT", "UNSUBSCRIBED"].includes(status);
    const statusRank: Record<string, number> = {
      QUEUED: 0,
      SENT: 1,
      DEFERRED: 1,
      DELIVERED: 2,
      OPENED: 3,
      CLICKED: 4,
      FAILED: 5,
      COMPLAINT: 5,
      UNSUBSCRIBED: 5,
    };
    const result = await getDb().$transaction(async (tx) => {
      const existing = await tx.webhookEvent.findUnique({
        where: {
          provider_providerId: { provider: "BREVO", providerId: eventId },
        },
      });
      if (existing?.processedAt) return { duplicate: true };
      if (!existing) {
        await tx.webhookEvent.create({
          data: {
            provider: "BREVO",
            providerId: eventId,
            payload: providerPayload,
            occurredAt: input.ts_event
              ? new Date(input.ts_event * 1000)
              : undefined,
          },
        });
      }
      const delivery = await tx.emailDelivery.findUnique({
        where: { providerMessageId: input["message-id"] },
      });
      const mayAdvance =
        delivery &&
        (statusRank[status] ?? 2) >= (statusRank[delivery.status] ?? 0);
      if (mayAdvance)
        await tx.emailDelivery.update({
          where: { id: delivery.id },
          data: {
            status,
            lastEvent: input.event,
            providerPayload,
            deliveredAt: status === "DELIVERED" ? new Date() : undefined,
            failedAt: terminal ? new Date() : undefined,
          },
        });
      await tx.webhookEvent.update({
        where: {
          provider_providerId: { provider: "BREVO", providerId: eventId },
        },
        data: {
          processedAt: new Date(),
          attempts: { increment: 1 },
          lastError: delivery ? null : "Email delivery not found",
        },
      });
      return { duplicate: false };
    });
    return NextResponse.json(
      { accepted: true, duplicate: result.duplicate },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}
