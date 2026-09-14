import argon2 from "argon2";
import { createHash, randomBytes, randomUUID } from "node:crypto";
import { z } from "zod";
import { permissionKeys, systemRolePermissions } from "@/modules/identity/domain/permissions";
import { getDb } from "@/shared/database";
import { err, ok, type AppError, type Result } from "@/shared/result";

export const registerSchema = z.object({
  displayName: z.string().trim().min(2).max(100),
  email: z.string().trim().email().max(254).transform((v) => v.toLowerCase()),
  password: z.string().min(12).max(128).regex(/[a-z]/).regex(/[A-Z]/).regex(/\d/),
  organizationName: z.string().trim().min(2).max(120),
  currency: z.enum(["PEN", "USD", "EUR"]).default("PEN"),
  timeZone: z.string().min(3).max(80).default("America/Lima")
});

function slugify(value: string) { return `${value.normalize("NFD").replace(/[\u0300-\u036f]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "")}-${randomBytes(3).toString("hex")}` }

export async function registerAccount(input: z.infer<typeof registerSchema>): Promise<Result<{ userId: string }, AppError>> {
  const data = registerSchema.parse(input), db = getDb();
  if (await db.user.findUnique({ where: { email: data.email }, select: { id: true } })) return err({ code: "CONFLICT", message: "No se pudo completar el registro con esos datos." });

  const [passwordHash] = await Promise.all([
    argon2.hash(data.password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 }),
    db.permission.createMany({ data: permissionKeys.map((key) => ({ key, description: key })), skipDuplicates: true })
  ]);

  const freeLimits = { users: 2, products: 100, customers: 100, warehouses: 1, automations: 3, storageMB: 100, emailsPerMonth: 100, apiRequests: 10_000, aiRequests: 10 };

  const freePlan = await db.plan.upsert({
    where: { code: "FREE" },
    update: { limits: freeLimits },
    create: { code: "FREE", name: "Free", currency: "PEN", monthlyPrice: 0, annualPrice: 0, limits: freeLimits, features: ["CRM", "Catálogo", "Cotizaciones"] }
  });

  await Promise.all(["STARTER", "BUSINESS", "ENTERPRISE"].map((code) => db.plan.upsert({
    where: { code },
    update: {},
    create: { code, name: code.charAt(0) + code.slice(1).toLowerCase(), currency: data.currency, monthlyPrice: 0, annualPrice: 0, limits: {}, features: [], active: false }
  })));

  const permissions = await db.permission.findMany({ select: { id: true, key: true } });
  const permissionIdByKey = new Map(permissions.map((p) => [p.key, p.id]));
  const rawToken = randomBytes(32).toString("base64url");
  const tokenHash = createHash("sha256").update(rawToken).digest("hex");
  const correlationId = randomUUID();

  const result = await db.$transaction(async (tx) => {
    const organization = await tx.organization.create({
      data: { name: data.organizationName, slug: slugify(data.organizationName), currency: data.currency, timeZone: data.timeZone, status: "ONBOARDING", onboardingStep: 2 }
    });

    const user = await tx.user.create({
      data: { email: data.email, displayName: data.displayName, passwordHash, recoveryCodeHashes: [] }
    });

    let ownerRoleId = "";
    for (const [name, rolePermissions] of Object.entries(systemRolePermissions)) {
      const role = await tx.role.create({
        data: { organizationId: organization.id, name, isSystem: true, rank: name === "OWNER" ? 100 : name === "ADMIN" ? 90 : 50 }
      });

      if (name === "OWNER") ownerRoleId = role.id;

      await tx.rolePermission.createMany({
        data: rolePermissions.map((permission) => {
          const permissionId = permissionIdByKey.get(permission);
          if (!permissionId) throw new Error(`Permission catalog is missing ${permission}`);
          return { roleId: role.id, permissionId };
        })
      });
    }

    if (!ownerRoleId) throw new Error("OWNER role is not configured");

    await tx.membership.create({ data: { organizationId: organization.id, userId: user.id, roleId: ownerRoleId } });
    await tx.subscription.create({ data: { organizationId: organization.id, planId: freePlan.id, status: "ACTIVE", provider: "NONE" } });
    await tx.identityToken.create({ data: { userId: user.id, purpose: "VERIFY_EMAIL", tokenHash, expiresAt: new Date(Date.now() + 86_400_000) } });
    await tx.auditEvent.create({ data: { organizationId: organization.id, actorId: user.id, action: "identity.register", resourceType: "User", resourceId: user.id, outcome: "SUCCESS", correlationId } });
    await tx.outboxEvent.create({ data: { organizationId: organization.id, topic: "email.verify", aggregateType: "User", aggregateId: user.id, payload: { email: user.email, name: user.displayName, token: rawToken }, correlationId } });

    return { userId: user.id };
  }, { timeout: 15_000 });

  return ok(result);
}

export async function verifyEmail(rawToken: string): Promise<Result<{ userId: string }, AppError>> {
  const db = getDb(), value = rawToken.trim();
  if (!value) return err({ code: "VALIDATION", message: "El enlace de verificación no es válido o venció." });

  const tokenHash = createHash("sha256").update(value).digest("hex");

  return db.$transaction(async (tx) => {
    const now = new Date();
    const token = await tx.identityToken.findUnique({ where: { tokenHash } });

    if (!token || token.purpose !== "VERIFY_EMAIL" || token.usedAt || token.expiresAt <= now)
      return err({ code: "VALIDATION", message: "El enlace de verificación no es válido o venció." });

    const claimed = await tx.identityToken.updateMany({
      where: { id: token.id, usedAt: null, expiresAt: { gt: now } },
      data: { usedAt: now }
    });

    if (claimed.count !== 1)
      return err({ code: "VALIDATION", message: "El enlace de verificación no es válido o ya fue utilizado." });

    const user = await tx.user.updateMany({
      where: { id: token.userId },
      data: { emailVerifiedAt: now }
    });

    if (user.count !== 1) {
      await tx.identityToken.deleteMany({ where: { id: token.id } });
      return err({ code: "VALIDATION", message: "Este enlace pertenece a una cuenta que ya no existe. Registra la cuenta nuevamente." });
    }

    return ok({ userId: token.userId });
  });
}