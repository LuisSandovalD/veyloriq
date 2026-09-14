import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

export async function POST(
  request: NextRequest,
  { params }: { params: Promise<{ id: string }> },
) {
  const requestIdentifier = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen no permitido." },
        requestIdentifier,
      );
    const context = await requirePermission(
      "quotes.write",
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, requestIdentifier);
    const { id } = await params;
    const quote = await getDb().quote.findUnique({
      where: {
        organizationId_id: { organizationId: context.value.organizationId, id },
      },
      include: { customer: true, lines: true },
    });
    if (!quote || !["DRAFT", "SENT", "VIEWED"].includes(quote.status))
      return jsonError(
        {
          code: "CONFLICT",
          message: "La cotización no puede enviarse en su estado actual.",
        },
        requestIdentifier,
      );
    if (!quote.customer.email)
      return jsonError(
        {
          code: "VALIDATION",
          message: "El cliente no tiene un correo válido.",
        },
        requestIdentifier,
      );
    const raw = randomBytes(32).toString("base64url");
    await getDb().$transaction(async (tx) => {
      await tx.quoteVersion.upsert({
        where: {
          organizationId_quoteId_version: {
            organizationId: context.value.organizationId,
            quoteId: quote.id,
            version: quote.version,
          },
        },
        update: {},
        create: {
          organizationId: context.value.organizationId,
          quoteId: quote.id,
          version: quote.version,
          createdBy: context.value.userId,
          snapshot: JSON.parse(JSON.stringify(quote)),
        },
      });
      await tx.quoteAccessToken.updateMany({
        where: {
          organizationId: context.value.organizationId,
          quoteId: quote.id,
          revokedAt: null,
        },
        data: { revokedAt: new Date() },
      });
      await tx.quoteAccessToken.create({
        data: {
          organizationId: context.value.organizationId,
          quoteId: quote.id,
          tokenHash: createHash("sha256").update(raw).digest("hex"),
          expiresAt: quote.validUntil,
        },
      });
      await tx.quote.update({
        where: {
          organizationId_id: {
            organizationId: context.value.organizationId,
            id: quote.id,
          },
        },
        data: { status: "SENT" },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId: context.value.organizationId,
          topic: "email.quote",
          aggregateType: "Quote",
          aggregateId: quote.id,
          payload: {
            email: quote.customer.email,
            customer: quote.customer.name,
            number: quote.number,
            token: raw,
          },
          correlationId: requestIdentifier,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: context.value.organizationId,
          actorId: context.value.userId,
          action: "quote.email.enqueue",
          resourceType: "Quote",
          resourceId: quote.id,
          outcome: "SUCCESS",
          correlationId: requestIdentifier,
        },
      });
    });
    return NextResponse.json(
      { accepted: true },
      { status: 202, headers: { "x-request-id": requestIdentifier } },
    );
  } catch (error) {
    return handleRouteError(error, requestIdentifier);
  }
}
