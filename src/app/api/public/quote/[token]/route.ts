import { createHash } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  clientIdentity,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";
import { rateLimit } from "@/shared/rate-limit";

const tokenSchema = z.string().min(20).max(200);
class QuoteResponseConflict extends Error {}

function tokenHash(raw: string) {
  return createHash("sha256").update(raw).digest("hex");
}

async function resolveToken(raw: string) {
  return getDb().quoteAccessToken.findUnique({
    where: { tokenHash: tokenHash(raw) },
    include: {
      quote: {
        include: {
          organization: {
            select: { name: true, legalName: true, taxId: true },
          },
          customer: { select: { name: true } },
          lines: {
            select: {
              description: true,
              quantity: true,
              unitPrice: true,
              taxRate: true,
              lineTotal: true,
            },
          },
        },
      },
    },
  });
}

async function protect(request: NextRequest, rawToken: string) {
  return rateLimit(
    "public.quote",
    `${clientIdentity(request)}:${tokenHash(rawToken)}`,
    120,
    3600,
  );
}

export async function GET(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const id = requestId(request);
  try {
    const rawToken = tokenSchema.parse((await params).token);
    const limited = await protect(request, rawToken);
    if (!limited.ok) return jsonError(limited.error, id);
    const access = await resolveToken(rawToken);
    if (!access || access.revokedAt || access.expiresAt <= new Date())
      return jsonError(
        { code: "NOT_FOUND", message: "La cotización no está disponible." },
        id,
      );
    let status = access.quote.status;
    if (status === "SENT") {
      await getDb().$transaction(async (tx) => {
        const viewed = await tx.quote.updateMany({
          where: {
            organizationId: access.organizationId,
            id: access.quote.id,
            status: "SENT",
          },
          data: { status: "VIEWED" },
        });
        if (!viewed.count) return;
        await tx.auditEvent.create({
          data: {
            organizationId: access.organizationId,
            actorId: "customer-portal",
            actorType: "EXTERNAL",
            action: "quote.view",
            resourceType: "Quote",
            resourceId: access.quote.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        });
        await tx.outboxEvent.create({
          data: {
            organizationId: access.organizationId,
            topic: "quote.viewed",
            aggregateType: "Quote",
            aggregateId: access.quote.id,
            payload: { quoteId: access.quote.id, status: "VIEWED" },
            correlationId: id,
          },
        });
      });
      status = "VIEWED";
    }
    return NextResponse.json(
      { quote: { ...access.quote, status } },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ token: string }> },
) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen no permitido." },
        id,
      );
    const { action } = z
      .object({ action: z.enum(["accept", "reject"]) })
      .parse(await request.json());
    const rawToken = tokenSchema.parse((await params).token);
    const limited = await protect(request, rawToken);
    if (!limited.ok) return jsonError(limited.error, id);
    const access = await resolveToken(rawToken);
    if (
      !access ||
      access.revokedAt ||
      access.respondedAt ||
      access.expiresAt <= new Date()
    )
      return jsonError(
        { code: "NOT_FOUND", message: "La cotización no está disponible." },
        id,
      );
    if (!["SENT", "VIEWED"].includes(access.quote.status))
      return jsonError(
        {
          code: "CONFLICT",
          message: "La cotización ya fue respondida o cambió de estado.",
        },
        id,
      );
    const status = action === "accept" ? "ACCEPTED" : "REJECTED";
    await getDb().$transaction(async (tx) => {
      const tokenClaim = await tx.quoteAccessToken.updateMany({
        where: {
          id: access.id,
          respondedAt: null,
          revokedAt: null,
          expiresAt: { gt: new Date() },
        },
        data: { respondedAt: new Date() },
      });
      if (tokenClaim.count !== 1) throw new QuoteResponseConflict();
      if (action === "accept")
        await tx.quoteVersion.upsert({
          where: {
            organizationId_quoteId_version: {
              organizationId: access.organizationId,
              quoteId: access.quoteId,
              version: access.quote.version,
            },
          },
          update: {},
          create: {
            organizationId: access.organizationId,
            quoteId: access.quoteId,
            version: access.quote.version,
            createdBy: "customer-portal",
            snapshot: JSON.parse(JSON.stringify(access.quote)),
          },
        });
      const quoteClaim = await tx.quote.updateMany({
        where: {
          organizationId: access.organizationId,
          id: access.quoteId,
          status: { in: ["SENT", "VIEWED"] },
        },
        data: {
          status,
          acceptedAt: action === "accept" ? new Date() : undefined,
        },
      });
      if (quoteClaim.count !== 1) throw new QuoteResponseConflict();
      await tx.auditEvent.create({
        data: {
          organizationId: access.organizationId,
          actorId: "customer-portal",
          actorType: "EXTERNAL",
          action: `quote.${action}`,
          resourceType: "Quote",
          resourceId: access.quoteId,
          outcome: "SUCCESS",
          correlationId: id,
        },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: access.organizationId,
          topic: `quote.${status.toLowerCase()}`,
          aggregateType: "Quote",
          aggregateId: access.quoteId,
          payload: { quoteId: access.quoteId, status },
          correlationId: id,
        },
      });
      return true;
    });
    return NextResponse.json(
      { ok: true, status },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (error instanceof QuoteResponseConflict)
      return jsonError(
        { code: "CONFLICT", message: "La cotización acaba de ser respondida." },
        id,
      );
    return handleRouteError(error, id);
  }
}
