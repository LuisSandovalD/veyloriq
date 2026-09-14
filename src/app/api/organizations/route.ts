import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext, setActiveOrganization } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import { assertSameOrigin, handleRouteError, jsonError, requestId } from "@/shared/http";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthContext();
    if (!context.ok) return jsonError(context.error, id);
    const memberships = await getDb().membership.findMany({
      where: { userId: context.value.userId, status: "ACTIVE", organization: { status: { not: "ARCHIVED" } } },
      select: {
        organizationId: true,
        organization: { select: { name: true, slug: true, status: true, onboardingStep: true } },
        role: { select: { name: true } },
      },
      orderBy: { organization: { name: "asc" } },
    });
    return NextResponse.json({ data: memberships, activeOrganizationId: context.value.organizationId }, { headers: { "x-request-id": id, "cache-control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request)) return jsonError({ code: "FORBIDDEN", message: "Origen no permitido." }, id);
    const { organizationId } = z.object({ organizationId: z.string().cuid() }).parse(await request.json());
    const context = await getAuthContext(organizationId);
    if (!context.ok) return jsonError(context.error, id);
    await setActiveOrganization(organizationId);
    await getDb().auditEvent.create({
      data: {
        organizationId,
        actorId: context.value.userId,
        action: "organization.switch",
        resourceType: "Organization",
        resourceId: organizationId,
        outcome: "SUCCESS",
        correlationId: id,
      },
    });
    return NextResponse.json({ ok: true, organizationId }, { headers: { "x-request-id": id } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}
