import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { getAuthContext } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import { assertSameOrigin, clientIdentity, handleRouteError, jsonError, requestId } from "@/shared/http";
import { rateLimit } from "@/shared/rate-limit";

const password = z.string().min(12).max(128).regex(/[A-Z]/).regex(/\d/);
const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("change_password"), currentPassword: z.string().min(1).max(128), newPassword: password }),
  z.object({ action: z.literal("request_email_change"), currentPassword: z.string().min(1).max(128), newEmail: z.string().email().max(254).transform((value) => value.toLowerCase()) }),
  z.object({ action: z.literal("confirm_email_change"), token: z.string().min(20).max(200) }),
  z.object({ action: z.literal("revoke_session"), sessionId: z.string().cuid() }),
  z.object({ action: z.literal("revoke_others") }),
  z.object({ action: z.literal("request_reset"), email: z.string().email() }),
  z.object({ action: z.literal("confirm_reset"), token: z.string().min(20), newPassword: password })
]);

const hashToken = (value: string) => createHash("sha256").update(value).digest("hex");

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await getAuthContext();
    if (!context.ok) return jsonError(context.error, id);
    const [user, sessions] = await Promise.all([
      getDb().user.findUnique({ where: { id: context.value.userId }, select: { email: true, mfaEnabled: true, platformRole: true } }),
      getDb().session.findMany({ where: { userId: context.value.userId, revokedAt: null, expiresAt: { gt: new Date() } }, select: { id: true, createdAt: true, lastSeenAt: true, expiresAt: true, userAgent: true }, orderBy: { lastSeenAt: "desc" } })
    ]);
    return NextResponse.json({ user, sessions }, { headers: { "x-request-id": id, "cache-control": "private, no-store" } });
  } catch (error) { return handleRouteError(error, id); }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request)) return jsonError({ code: "FORBIDDEN", message: "Origen de solicitud no permitido." }, id);
    const input = actionSchema.parse(await request.json());
    const db = getDb();
    if (input.action === "request_reset") {
      const limit = await rateLimit("auth.password_reset", `${clientIdentity(request)}:${input.email.toLowerCase()}`, 10, 3600); if (!limit.ok) return jsonError(limit.error, id);
      const user = await db.user.findUnique({ where: { email: input.email.toLowerCase() } });
      if (user) {
        const raw = randomBytes(32).toString("base64url");
        await db.$transaction([
          db.identityToken.create({ data: { userId: user.id, purpose: "RESET_PASSWORD", tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 30 * 60_000) } }),
          db.outboxEvent.create({ data: { topic: "email.password_reset", aggregateType: "User", aggregateId: user.id, payload: { email: user.email, name: user.displayName, token: raw }, correlationId: id } })
        ]);
      }
      return NextResponse.json({ message: "Si la cuenta existe, enviaremos instrucciones al correo registrado." }, { headers: { "x-request-id": id } });
    }
    if (input.action === "confirm_reset") {
      const token = await db.identityToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
      if (!token || token.purpose !== "RESET_PASSWORD" || token.usedAt || token.expiresAt <= new Date()) return jsonError({ code: "VALIDATION", message: "El enlace no es válido o venció." }, id);
      await db.$transaction([
        db.user.update({ where: { id: token.userId }, data: { passwordHash: await argon2.hash(input.newPassword, { type: argon2.argon2id }) } }),
        db.identityToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
        db.session.updateMany({ where: { userId: token.userId, revokedAt: null }, data: { revokedAt: new Date() } })
      ]);
      return NextResponse.json({ ok: true }, { headers: { "x-request-id": id } });
    }
    if (input.action === "confirm_email_change") {
      const limit = await rateLimit("auth.email_change.confirm", clientIdentity(request), 12, 3600);
      if (!limit.ok) return jsonError(limit.error, id);
      const token = await db.identityToken.findUnique({ where: { tokenHash: hashToken(input.token) } });
      if (!token || !token.purpose.startsWith("CHANGE_EMAIL:") || token.usedAt || token.expiresAt <= new Date())
        return jsonError({ code: "VALIDATION", message: "El enlace no es válido o venció." }, id);
      const newEmail = token.purpose.slice("CHANGE_EMAIL:".length);
      const [user, duplicate] = await Promise.all([
        db.user.findUnique({ where: { id: token.userId }, select: { id: true, email: true, displayName: true } }),
        db.user.findUnique({ where: { email: newEmail }, select: { id: true } }),
      ]);
      if (!user) return jsonError({ code: "NOT_FOUND", message: "Usuario no encontrado." }, id);
      if (duplicate && duplicate.id !== user.id)
        return jsonError({ code: "CONFLICT", message: "Ese correo ya está asociado a otra cuenta." }, id);
      await db.$transaction([
        db.user.update({ where: { id: user.id }, data: { email: newEmail, emailVerifiedAt: new Date() } }),
        db.identityToken.update({ where: { id: token.id }, data: { usedAt: new Date() } }),
        db.identityToken.updateMany({ where: { userId: user.id, purpose: { startsWith: "CHANGE_EMAIL:" }, id: { not: token.id }, usedAt: null }, data: { usedAt: new Date() } }),
        db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
        db.outboxEvent.create({ data: { topic: "email.email_changed", aggregateType: "User", aggregateId: user.id, payload: { email: user.email, name: user.displayName, newEmail }, correlationId: id } }),
        db.auditEvent.create({ data: { actorId: user.id, action: "security.email.change", resourceType: "User", resourceId: user.id, outcome: "SUCCESS", changes: { previousEmail: user.email, newEmail }, correlationId: id } }),
      ]);
      return NextResponse.json({ ok: true, reloginRequired: true }, { headers: { "x-request-id": id } });
    }
    const context = await getAuthContext();
    if (!context.ok) return jsonError(context.error, id);
    if (input.action === "revoke_session") {
      await db.session.updateMany({ where: { id: input.sessionId, userId: context.value.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      return NextResponse.json({ ok: true }, { headers: { "x-request-id": id } });
    }
    if (input.action === "revoke_others") {
      await db.session.updateMany({ where: { userId: context.value.userId, revokedAt: null }, data: { revokedAt: new Date() } });
      return NextResponse.json({ ok: true, reloginRequired: true }, { headers: { "x-request-id": id } });
    }
    const user = await db.user.findUnique({ where: { id: context.value.userId } });
    if (input.action === "request_email_change") {
      if (!user || !await argon2.verify(user.passwordHash, input.currentPassword))
        return jsonError({ code: "UNAUTHENTICATED", message: "Contraseña actual incorrecta." }, id);
      if (user.email === input.newEmail)
        return jsonError({ code: "VALIDATION", message: "El nuevo correo debe ser diferente al actual." }, id);
      if (await db.user.findUnique({ where: { email: input.newEmail }, select: { id: true } }))
        return jsonError({ code: "CONFLICT", message: "Ese correo ya está asociado a otra cuenta." }, id);
      const raw = randomBytes(32).toString("base64url");
      await db.$transaction([
        db.identityToken.updateMany({ where: { userId: user.id, purpose: { startsWith: "CHANGE_EMAIL:" }, usedAt: null }, data: { usedAt: new Date() } }),
        db.identityToken.create({ data: { userId: user.id, purpose: `CHANGE_EMAIL:${input.newEmail}`, tokenHash: hashToken(raw), expiresAt: new Date(Date.now() + 30 * 60_000) } }),
        db.outboxEvent.create({ data: { topic: "email.email_change", aggregateType: "User", aggregateId: user.id, payload: { email: input.newEmail, name: user.displayName, token: raw }, correlationId: id } }),
        db.auditEvent.create({ data: { organizationId: context.value.organizationId, actorId: user.id, action: "security.email.change.request", resourceType: "User", resourceId: user.id, outcome: "SUCCESS", changes: { newEmail: input.newEmail }, correlationId: id } }),
      ]);
      return NextResponse.json({ message: "Enviamos un enlace de confirmación al nuevo correo." }, { status: 202, headers: { "x-request-id": id } });
    }
    if (!user || !await argon2.verify(user.passwordHash, input.currentPassword)) return jsonError({ code: "UNAUTHENTICATED", message: "Contraseña actual incorrecta." }, id);
    await db.$transaction([
      db.user.update({ where: { id: user.id }, data: { passwordHash: await argon2.hash(input.newPassword, { type: argon2.argon2id }) } }),
      db.session.updateMany({ where: { userId: user.id, revokedAt: null }, data: { revokedAt: new Date() } }),
      db.auditEvent.create({ data: { organizationId: context.value.organizationId, actorId: user.id, action: "security.password.change", resourceType: "User", resourceId: user.id, outcome: "SUCCESS", correlationId: id } })
    ]);
    return NextResponse.json({ ok: true, reloginRequired: true }, { headers: { "x-request-id": id } });
  } catch (error) { return handleRouteError(error, id); }
}
