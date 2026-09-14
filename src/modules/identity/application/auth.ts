import { createHash, randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { getDb } from "@/shared/database";
import { err, ok, type Result, type AppError } from "@/shared/result";
import type { PermissionKey } from "@/modules/identity/domain/permissions";
import { consumePlanUsage } from "@/modules/billing/application/limits";

const COOKIE = "VEYLORIQ_session";
const ORGANIZATION_COOKIE = "VEYLORIQ_organization";

function hashToken(token: string): string {
  const pepper = process.env.SESSION_PEPPER;
  if (!pepper || pepper.length < 32)
    throw new Error("SESSION_PEPPER must contain at least 32 characters");
  return createHash("sha256").update(`${token}.${pepper}`).digest("hex");
}

export async function createSession(
  userId: string,
  metadata?: { userAgent?: string | null; ip?: string | null },
): Promise<void> {
  const raw = randomBytes(32).toString("base64url");
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24 * 14);
  const ipHash = metadata?.ip
    ? createHash("sha256")
      .update(`${metadata.ip}.${process.env.SESSION_PEPPER}`)
      .digest("hex")
    : undefined;
  await getDb().session.create({
    data: {
      userId,
      tokenHash: hashToken(raw),
      expiresAt,
      userAgent: metadata?.userAgent?.slice(0, 300),
      ipHash,
    },
  });
  const jar = await cookies();
  jar.set(COOKIE, raw, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    expires: expiresAt,
  });
}

export async function revokeCurrentSession(): Promise<void> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (raw)
    await getDb().session.updateMany({
      where: { tokenHash: hashToken(raw), revokedAt: null },
      data: { revokedAt: new Date() },
    });
  jar.delete(COOKIE);
  jar.delete(ORGANIZATION_COOKIE);
}

export async function setActiveOrganization(
  organizationId: string,
): Promise<void> {
  const jar = await cookies();
  jar.set(ORGANIZATION_COOKIE, organizationId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 365,
  });
}

export type AuthContext = {
  userId: string;
  email: string;
  displayName: string;
  organizationId: string;
  organizationName: string;
  organizationStatus: string;
  onboardingStep: number;
  subscriptionStatus: string | null;
  subscriptionGraceUntil: Date | null;
  mfaEnabled: boolean;
  requireMfaForAdmins: boolean;
  role: string;
  permissions: ReadonlySet<string>;
};

export async function getAuthContext(
  requestedOrganizationId?: string,
): Promise<Result<AuthContext, AppError>> {
  const jar = await cookies();
  const raw = jar.get(COOKIE)?.value;
  if (!raw)
    return err({
      code: "UNAUTHENTICATED",
      message: "Inicia sesión para continuar.",
    });
  const session = await getDb().session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: {
      user: {
        include: {
          memberships: {
            where: { status: "ACTIVE" },
            include: {
              organization: { include: { subscription: true } },
              role: {
                include: { permissions: { include: { permission: true } } },
              },
            },
          },
        },
      },
    },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date())
    return err({
      code: "UNAUTHENTICATED",
      message: "Tu sesión venció o fue revocada.",
    });
  const selectedOrganizationId =
    requestedOrganizationId ?? jar.get(ORGANIZATION_COOKIE)?.value;
  const membership = selectedOrganizationId
    ? session.user.memberships.find(
      (item) => item.organizationId === selectedOrganizationId,
    )
    : session.user.memberships[0];
  if (!membership)
    return err({
      code: "FORBIDDEN",
      message: "No perteneces a esta organización.",
    });
  if (membership.organization.status === "SUSPENDED")
    return err({
      code: "SUSPENDED",
      message: "La organización está suspendida.",
    });
  const organizationSettings = membership.organization.settings as {
    sessionTimeoutMinutes?: number;
  } | null;
  const inactivityMinutes = Math.min(
    43200,
    Math.max(15, Number(organizationSettings?.sessionTimeoutMinutes ?? 10080)),
  );
  if (session.lastSeenAt < new Date(Date.now() - inactivityMinutes * 60_000)) {
    await getDb().session.update({
      where: { id: session.id },
      data: { revokedAt: new Date() },
    });
    return err({
      code: "UNAUTHENTICATED",
      message: "Tu sesión venció por inactividad.",
    });
  }
  if (session.lastSeenAt < new Date(Date.now() - 5 * 60_000)) {
    await getDb().session.update({
      where: { id: session.id },
      data: { lastSeenAt: new Date() },
    });
  }
  return ok({
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    organizationId: membership.organizationId,
    organizationName: membership.organization.name,
    organizationStatus: membership.organization.status,
    onboardingStep: membership.organization.onboardingStep,
    subscriptionStatus: membership.organization.subscription?.status ?? null,
    subscriptionGraceUntil:
      membership.organization.subscription?.graceUntil ?? null,
    mfaEnabled: session.user.mfaEnabled,
    requireMfaForAdmins: Boolean(
      (
        membership.organization.settings as {
          requireMfaForAdmins?: boolean;
        } | null
      )?.requireMfaForAdmins,
    ),
    role: membership.role.name,
    permissions: new Set(
      membership.role.permissions.map((item) => item.permission.key),
    ),
  });
}

export async function requirePermission(
  permission: PermissionKey,
  organizationId?: string,
): Promise<Result<AuthContext, AppError>> {
  const context = await getAuthContext(organizationId);
  if (!context.ok) return context;
  if (
    context.value.requireMfaForAdmins &&
    ["OWNER", "ADMIN"].includes(context.value.role) &&
    !context.value.mfaEnabled
  ) {
    return err({
      code: "FORBIDDEN",
      message:
        "Esta organización exige MFA para administradores. Actívalo en Seguridad.",
    });
  }
  if (!context.value.permissions.has(permission))
    return err({
      code: "FORBIDDEN",
      message: "No tienes permiso para realizar esta operación.",
    });
  const isMutation =
    permission.endsWith(".write") || permission.endsWith(".manage");
  const billingBlocked = ["UNPAID", "CANCELED", "INCOMPLETE"].includes(
    context.value.subscriptionStatus ?? "",
  );
  const graceExpired =
    context.value.subscriptionStatus === "PAST_DUE" &&
    (!context.value.subscriptionGraceUntil ||
      context.value.subscriptionGraceUntil <= new Date());
  if (
    isMutation &&
    permission !== "billing.manage" &&
    (billingBlocked || graceExpired)
  )
    return err({
      code: "SUSPENDED",
      message:
        "La suscripción permite consulta, pero las operaciones están temporalmente bloqueadas.",
    });
  if (permission !== "billing.manage") {
    const usage = await consumePlanUsage(
      context.value.organizationId,
      "api_requests",
      "apiRequests",
    );
    if (!usage.ok) return usage;
  }
  return context;
}

export type PlatformContext = {
  userId: string;
  email: string;
  displayName: string;
  role:
  | "PLATFORM_SUPERUSER"
  | "PLATFORM_ADMIN"
  | "PLATFORM_SUPPORT"
  | "PLATFORM_ANALYST";
};

export async function getPlatformEnrollmentContext(): Promise<
  Result<PlatformContext & { mfaEnabled: boolean }, AppError>
> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw)
    return err({
      code: "UNAUTHENTICATED",
      message: "Inicia sesión para continuar.",
    });
  const session = await getDb().session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date())
    return err({
      code: "UNAUTHENTICATED",
      message: "Tu sesión venció o fue revocada.",
    });
  if (!session.user.platformRole)
    return err({
      code: "FORBIDDEN",
      message: "No tienes una cuenta de plataforma.",
    });
  return ok({
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.platformRole,
    mfaEnabled: session.user.mfaEnabled,
  });
}

export async function getPlatformContext(): Promise<
  Result<PlatformContext, AppError>
> {
  const raw = (await cookies()).get(COOKIE)?.value;
  if (!raw)
    return err({
      code: "UNAUTHENTICATED",
      message: "Inicia sesión para continuar.",
    });
  const session = await getDb().session.findUnique({
    where: { tokenHash: hashToken(raw) },
    include: { user: true },
  });
  if (!session || session.revokedAt || session.expiresAt <= new Date())
    return err({
      code: "UNAUTHENTICATED",
      message: "Tu sesión venció o fue revocada.",
    });
  if (!session.user.platformRole)
    return err({
      code: "FORBIDDEN",
      message: "No tienes acceso a administración de plataforma.",
    });
  if (!session.user.mfaEnabled)
    return err({
      code: "FORBIDDEN",
      message: "Activa MFA antes de acceder a la plataforma.",
    });
  return ok({
    userId: session.user.id,
    email: session.user.email,
    displayName: session.user.displayName,
    role: session.user.platformRole,
  });
}
