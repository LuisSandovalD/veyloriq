import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { verifyMercadoPagoSignature } from "@/modules/billing/infrastructure/mercadopago";
import { getDb } from "@/shared/database";
import { handleRouteError, requestId } from "@/shared/http";

const schema = z.object({
  id: z.union([z.string(), z.number()]).optional(),
  type: z.string().optional(),
  action: z.string().optional(),
  data: z.object({ id: z.union([z.string(), z.number()]) }),
});

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    const raw = await request.text();
    const payload = schema.parse(JSON.parse(raw));
    const dataId =
      request.nextUrl.searchParams.get("data.id") ?? String(payload.data.id);
    if (
      !verifyMercadoPagoSignature({
        signature: request.headers.get("x-signature"),
        requestId: request.headers.get("x-request-id"),
        dataId,
      })
    ) {
      return NextResponse.json(
        { error: "invalid_signature" },
        { status: 401, headers: { "x-request-id": id } },
      );
    }
    const providerId = String(
      payload.id ??
        `${payload.type ?? "event"}:${dataId}:${request.headers.get("x-request-id") ?? id}`,
    );
    await getDb().$transaction(async (tx) => {
      await tx.webhookEvent.create({
        data: {
          provider: "MERCADOPAGO",
          providerId,
          signature: request.headers.get("x-signature"),
          payload,
          occurredAt: new Date(),
        },
      });
      await tx.job.create({
        data: {
          type: "billing.reconcile",
          payload: {
            providerId,
            dataId,
            eventType: payload.type ?? payload.action ?? "unknown",
          },
          correlationId: id,
        },
      });
    });
    return NextResponse.json(
      { accepted: true },
      { status: 202, headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002")
      return NextResponse.json(
        { accepted: true },
        { status: 200, headers: { "x-request-id": id } },
      );
    return handleRouteError(error, id);
  }
}
