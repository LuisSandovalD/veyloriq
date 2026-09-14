import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { Prisma } from "@/generated/prisma/client";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const schema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).nullable().optional(),
  taxId: z.string().trim().max(40).nullable().optional(),
  address: z.string().trim().max(300).nullable().optional(),
  contactEmail: z.string().trim().email().nullable().optional(),
  contactPhone: z.string().trim().max(40).nullable().optional(),
  logoDocumentId: z.string().cuid().or(z.string().uuid()).nullable().optional(),
  currency: z.enum(["PEN", "USD", "EUR"]),
  locale: z.enum(["es-PE", "es-ES", "en-US"]),
  timeZone: z.string().min(3).max(80),
  settings: z
    .object({
      quotePrefix: z.string().trim().min(1).max(10).optional(),
      purchasePrefix: z.string().trim().min(1).max(10).optional(),
      orderPrefix: z.string().trim().min(1).max(10).optional(),
      taxName: z.string().trim().min(1).max(30).optional(),
      defaultTaxRate: z.coerce.number().min(0).max(100).optional(),
      dateFormat: z.enum(["DD/MM/YYYY", "MM/DD/YYYY", "YYYY-MM-DD"]).optional(),
      weekStartsOn: z.enum(["MONDAY", "SUNDAY"]).optional(),
      sessionTimeoutMinutes: z.coerce
        .number()
        .int()
        .min(15)
        .max(43200)
        .optional(),
      requireMfaForAdmins: z.boolean().optional(),
      opportunityStages: z
        .array(z.string().regex(/^[A-Z][A-Z0-9_]{1,39}$/))
        .min(2)
        .max(20)
        .refine((stages) => stages.includes("WON") && stages.includes("LOST"), {
          message: "Las etapas deben incluir WON y LOST.",
        })
        .optional(),
    })
    .optional(),
});

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission(
      "organization.manage",
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const organization = await getDb().organization.findUnique({
      where: { id: context.value.organizationId },
      select: {
        id: true,
        name: true,
        legalName: true,
        taxId: true,
        address: true,
        contactEmail: true,
        contactPhone: true,
        logoDocumentId: true,
        currency: true,
        locale: true,
        timeZone: true,
        settings: true,
        status: true,
        onboardingStep: true,
      },
    });
    return NextResponse.json(
      { data: organization },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function PATCH(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen no permitido." },
        id,
      );
    const context = await requirePermission(
      "organization.manage",
      request.headers.get("x-organization-id") ?? undefined,
    );
    if (!context.ok) return jsonError(context.error, id);
    const input = schema.parse(await request.json());
    const db = getDb();
    if (input.logoDocumentId) {
      const logo = await db.document.findFirst({
        where: {
          organizationId: context.value.organizationId,
          id: input.logoDocumentId,
          status: "READY",
          archivedAt: null,
          mimeType: { startsWith: "image/" },
        },
      });
      if (!logo)
        return jsonError(
          {
            code: "VALIDATION",
            message:
              "El logotipo no es una imagen disponible de esta organización.",
          },
          id,
        );
    }
    const organization = await db.$transaction(async (tx) => {
      const current = await tx.organization.findUniqueOrThrow({
        where: { id: context.value.organizationId },
        select: { settings: true },
      });
      const { settings, ...fields } = input;
      const mergedSettings = settings
        ? ({
            ...(current.settings as Record<string, unknown>),
            ...settings,
          } as Prisma.InputJsonObject)
        : undefined;
      const updated = await tx.organization.update({
        where: { id: context.value.organizationId },
        data: { ...fields, settings: mergedSettings, onboardingStep: 4 },
      });
      await tx.auditEvent.create({
        data: {
          organizationId: updated.id,
          actorId: context.value.userId,
          action: "organization.settings.update",
          resourceType: "Organization",
          resourceId: updated.id,
          outcome: "SUCCESS",
          changes: { fields: Object.keys(input) },
          correlationId: id,
        },
      });
      return updated;
    });
    return NextResponse.json(
      { data: organization },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}
