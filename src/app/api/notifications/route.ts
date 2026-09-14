import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/modules/identity/application/auth";
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
    const context = await getAuthContext(
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const [notifications, preferences] = await Promise.all([
      getDb().notification.findMany({
        where: { organizationId: context.value.organizationId, userId: context.value.userId },
        orderBy: { createdAt: "desc" },
        take: 50,
      }),
      getDb().notificationPreference.findMany({
        where: { organizationId: context.value.organizationId, userId: context.value.userId },
        orderBy: [{ type: "asc" }, { channel: "asc" }],
      }),
    ]);
    return NextResponse.json(
      {
        data: notifications,
        unread: notifications.filter((item) => !item.readAt).length,
        preferences,
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
    const context = await getAuthContext(
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const input = z
      .discriminatedUnion("action", [
        z.object({ action: z.literal("read"), id: z.string().cuid() }),
        z.object({ action: z.literal("read_all") }),
        z.object({ action: z.literal("preference"), type: z.string().trim().min(1).max(80), channel: z.enum(["IN_APP", "EMAIL"]), enabled: z.boolean() }),
      ])
      .parse(await request.json());
    if (input.action === "preference") {
      await getDb().notificationPreference.upsert({
        where: { organizationId_userId_type_channel: { organizationId: context.value.organizationId, userId: context.value.userId, type: input.type, channel: input.channel } },
        update: { enabled: input.enabled },
        create: { organizationId: context.value.organizationId, userId: context.value.userId, type: input.type, channel: input.channel, enabled: input.enabled },
      });
    } else if (input.action === "read")
      await getDb().notification.updateMany({
        where: {
          id: input.id,
          organizationId: context.value.organizationId,
          userId: context.value.userId,
        },
        data: { readAt: new Date() },
      });
    else
      await getDb().notification.updateMany({
        where: {
          organizationId: context.value.organizationId,
          userId: context.value.userId,
          readAt: null,
        },
        data: { readAt: new Date() },
      });
    return NextResponse.json({ ok: true }, { headers: { "x-request-id": id } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}
