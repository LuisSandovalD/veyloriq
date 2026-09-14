import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import { assertSameOrigin, handleRouteError, jsonError, requestId } from "@/shared/http";

const onboardingSchema = z.object({
  name: z.string().trim().min(2).max(120),
  legalName: z.string().trim().max(160).optional(),
  taxId: z.string().trim().max(40).optional(),
  address: z.string().trim().max(300).optional(),
  currency: z.enum(["PEN", "USD", "EUR"]),
  locale: z.enum(["es-PE", "es-ES", "en-US"]),
  timeZone: z.string().trim().min(3).max(80),
  quotePrefix: z.string().trim().min(1).max(10).regex(/^[A-Za-z0-9-]+$/),
  taxName: z.string().trim().min(1).max(30),
  defaultTaxRate: z.coerce.number().min(0).max(100),
  warehouseName: z.string().trim().min(2).max(100),
  warehouseCode: z.string().trim().min(1).max(20).regex(/^[A-Za-z0-9-]+$/),
  accountName: z.string().trim().min(2).max(100),
  accountType: z.enum(["CASH", "BANK"]),
  openingBalance: z.coerce.number().min(0).max(999999999999),
});

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("organization.manage");
    if (!context.ok) return jsonError(context.error, id);
    const organization = await getDb().organization.findUnique({
      where: { id: context.value.organizationId },
      select: { id: true, name: true, legalName: true, taxId: true, address: true, currency: true, locale: true, timeZone: true, settings: true, onboardingStep: true, status: true },
    });
    return NextResponse.json({ data: organization }, { headers: { "x-request-id": id, "cache-control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request)) return jsonError({ code: "FORBIDDEN", message: "Origen no permitido." }, id);
    const context = await requirePermission("organization.manage");
    if (!context.ok) return jsonError(context.error, id);
    const input = onboardingSchema.parse(await request.json());
    const db = getDb();
    await db.$transaction(async (tx) => {
      const organizationId = context.value.organizationId;
      await tx.organization.update({
        where: { id: organizationId },
        data: {
          name: input.name,
          legalName: input.legalName || null,
          taxId: input.taxId || null,
          address: input.address || null,
          currency: input.currency,
          locale: input.locale,
          timeZone: input.timeZone,
          settings: { quotePrefix: input.quotePrefix.toUpperCase(), taxName: input.taxName, defaultTaxRate: input.defaultTaxRate },
          onboardingStep: 4,
          status: "ACTIVE",
        },
      });
      const existingWarehouse = await tx.warehouse.findFirst({ where: { organizationId, code: input.warehouseCode.toUpperCase() } });
      if (!existingWarehouse) await tx.warehouse.create({ data: { organizationId, name: input.warehouseName, code: input.warehouseCode.toUpperCase(), address: input.address || null } });
      const existingAccount = await tx.financialAccount.findFirst({ where: { organizationId, name: input.accountName, currency: input.currency } });
      if (!existingAccount) {
        const account = await tx.financialAccount.create({ data: { organizationId, name: input.accountName, type: input.accountType, currency: input.currency, balance: input.openingBalance } });
        if (input.openingBalance > 0) await tx.cashMovement.create({ data: { organizationId, accountId: account.id, type: "OPENING_BALANCE", amount: input.openingBalance, previous: 0, resulting: input.openingBalance, referenceType: "ONBOARDING", referenceId: organizationId } });
      }
      await tx.auditEvent.create({ data: { organizationId, actorId: context.value.userId, action: "organization.onboarding.complete", resourceType: "Organization", resourceId: organizationId, outcome: "SUCCESS", changes: { warehouseCode: input.warehouseCode, accountName: input.accountName }, correlationId: id } });
    });
    return NextResponse.json({ ok: true }, { headers: { "x-request-id": id } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}
