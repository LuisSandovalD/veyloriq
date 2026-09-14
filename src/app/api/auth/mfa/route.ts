import { createHash, randomBytes } from "node:crypto";
import argon2 from "argon2";
import { generateSecret, generateURI, verify } from "otplib";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSession, getAuthContext, getPlatformEnrollmentContext } from "@/modules/identity/application/auth";
import { decryptSecret, encryptSecret } from "@/modules/identity/infrastructure/secret-cipher";
import { getDb } from "@/shared/database";
import { assertSameOrigin, clientIdentity, handleRouteError, jsonError, requestId } from "@/shared/http";
import { rateLimit } from "@/shared/rate-limit";

const schema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("challenge"), challenge: z.string().min(20).max(256), code: z.string().min(6).max(32) }),
  z.object({ action: z.literal("setup"), password: z.string().min(1).max(128) }),
  z.object({ action: z.literal("confirm"), setupToken: z.string().min(20).max(256), code: z.string().min(6).max(12) }),
  z.object({ action: z.literal("disable"), password: z.string().min(1).max(128), code: z.string().min(6).max(32) }),
]);

function tokenHash(value: string) {
  return createHash("sha256").update(value).digest("hex");
}

function normalizeCode(value: string) {
  return value.trim().replace(/\s+/g, "");
}

function normalizeRecoveryCode(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

function generateRecoveryCodes() {
  return Array.from({ length: 10 }, () => `${randomBytes(3).toString("hex")}-${randomBytes(3).toString("hex")}`);
}

async function verifyPassword(passwordHash: string | null | undefined, password: string) {
  if (!passwordHash) return false;
  try {
    return await argon2.verify(passwordHash, password);
  } catch {
    return false;
  }
}

async function verifyTotp(secretCipher: string, code: string) {
  try {
    const result = await verify({
      secret: decryptSecret(secretCipher),
      token: normalizeCode(code),
    });
    return result.valid;
  } catch {
    return false;
  }
}

async function verifyRecoveryCode(hashes: string[], code: string) {
  const normalized = normalizeRecoveryCode(code);
  for (let index = 0; index < hashes.length; index += 1) {
    const hash = hashes[index];
    if (!hash) continue;
    try {
      if (await argon2.verify(hash, normalized)) return index;
    } catch { }
  }
  return -1;
}

export async function POST(request: NextRequest) {
  const id = requestId(request);

  try {
    if (!assertSameOrigin(request)) {
      return jsonError({ code: "FORBIDDEN", message: "Origen de solicitud no permitido." }, id);
    }

    const input = schema.parse(await request.json());
    const db = getDb();
    const client = clientIdentity(request);

    if (input.action === "challenge") {
      const limit = await rateLimit("auth.mfa.challenge", `${client}:${tokenHash(input.challenge)}`, 8, 300);
      if (!limit.ok) return jsonError(limit.error, id);

      const challenge = await db.identityToken.findUnique({
        where: { tokenHash: tokenHash(input.challenge) },
      });

      if (!challenge || challenge.purpose !== "MFA_LOGIN" || challenge.usedAt || challenge.expiresAt <= new Date()) {
        return jsonError({ code: "UNAUTHENTICATED", message: "El desafío MFA no es válido o venció." }, id);
      }

      const user = await db.user.findUnique({
        where: { id: challenge.userId },
      });

      if (!user?.mfaEnabled || !user.totpSecretCipher) {
        return jsonError({ code: "UNAUTHENTICATED", message: "MFA no está disponible." }, id);
      }

      let accepted = await verifyTotp(user.totpSecretCipher, input.code);
      let usedRecoveryIndex = -1;

      if (!accepted) {
        usedRecoveryIndex = await verifyRecoveryCode(user.recoveryCodeHashes, input.code);
        accepted = usedRecoveryIndex >= 0;
      }

      if (!accepted) {
        return jsonError({ code: "UNAUTHENTICATED", message: "Código MFA incorrecto." }, id);
      }

      await db.$transaction([
        db.identityToken.update({
          where: { id: challenge.id },
          data: { usedAt: new Date() },
        }),
        ...(usedRecoveryIndex >= 0
          ? [
            db.user.update({
              where: { id: user.id },
              data: {
                recoveryCodeHashes: user.recoveryCodeHashes.filter((_item, index) => index !== usedRecoveryIndex),
              },
            }),
          ]
          : []),
      ]);

      await createSession(user.id, {
        userAgent: request.headers.get("user-agent"),
        ip: client,
      });

      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id, "cache-control": "no-store" } },
      );
    }

    const limit = await rateLimit("auth.mfa.manage", `${client}:${input.action}`, 10, 300);
    if (!limit.ok) return jsonError(limit.error, id);

    const tenantContext = await getAuthContext();

    let userId: string;
    let organizationId: string | null = null;

    if (tenantContext.ok) {
      userId = tenantContext.value.userId;
      organizationId = tenantContext.value.organizationId;
    } else {
      const platformContext = await getPlatformEnrollmentContext();

      if (!platformContext.ok) {
        return jsonError(platformContext.error, id);
      }

      userId = platformContext.value.userId;
    }

    const user = await db.user.findUnique({
      where: { id: userId },
    });

    if (!user) {
      return jsonError({ code: "NOT_FOUND", message: "Usuario no encontrado." }, id);
    }

    if (input.action === "setup") {
      if (user.mfaEnabled) {
        return jsonError(
          {
            code: "CONFLICT",
            message: "Desactiva MFA con reautenticación antes de configurar un autenticador nuevo.",
          },
          id,
        );
      }

      if (!(await verifyPassword(user.passwordHash, input.password))) {
        return jsonError({ code: "UNAUTHENTICATED", message: "Contraseña incorrecta." }, id);
      }

      const secret = generateSecret();
      const codes = generateRecoveryCodes();
      const setupToken = randomBytes(32).toString("base64url");
      const recoveryCodeHashes = await Promise.all(
        codes.map((code) => argon2.hash(normalizeRecoveryCode(code), { type: argon2.argon2id })),
      );

      await db.$transaction([
        db.identityToken.updateMany({
          where: {
            userId: user.id,
            purpose: "MFA_SETUP",
            usedAt: null,
          },
          data: { usedAt: new Date() },
        }),
        db.user.update({
          where: { id: user.id },
          data: {
            totpSecretCipher: encryptSecret(secret),
            recoveryCodeHashes,
            mfaEnabled: false,
          },
        }),
        db.identityToken.create({
          data: {
            userId: user.id,
            purpose: "MFA_SETUP",
            tokenHash: tokenHash(setupToken),
            expiresAt: new Date(Date.now() + 10 * 60_000),
          },
        }),
      ]);

      return NextResponse.json(
        {
          setupToken,
          uri: generateURI({
            secret,
            issuer: "VEYLORIQ",
            label: user.email,
          }),
          recoveryCodes: codes,
        },
        {
          headers: {
            "x-request-id": id,
            "cache-control": "no-store",
          },
        },
      );
    }

    if (input.action === "confirm") {
      const setup = await db.identityToken.findUnique({
        where: { tokenHash: tokenHash(input.setupToken) },
      });

      if (
        !setup ||
        setup.userId !== user.id ||
        setup.purpose !== "MFA_SETUP" ||
        setup.usedAt ||
        setup.expiresAt <= new Date() ||
        !user.totpSecretCipher
      ) {
        return jsonError(
          {
            code: "VALIDATION",
            message: "La configuración MFA no es válida o venció.",
          },
          id,
        );
      }

      if (!(await verifyTotp(user.totpSecretCipher, input.code))) {
        return jsonError(
          {
            code: "VALIDATION",
            message: "El código TOTP no coincide.",
          },
          id,
        );
      }

      await db.$transaction([
        db.user.update({
          where: { id: user.id },
          data: { mfaEnabled: true },
        }),
        db.identityToken.update({
          where: { id: setup.id },
          data: { usedAt: new Date() },
        }),
        db.auditEvent.create({
          data: {
            organizationId,
            actorId: user.id,
            action: "security.mfa.enable",
            resourceType: "User",
            resourceId: user.id,
            outcome: "SUCCESS",
            correlationId: id,
          },
        }),
      ]);

      return NextResponse.json(
        { ok: true },
        { headers: { "x-request-id": id, "cache-control": "no-store" } },
      );
    }

    if (!(await verifyPassword(user.passwordHash, input.password))) {
      return jsonError(
        {
          code: "UNAUTHENTICATED",
          message: "Contraseña incorrecta.",
        },
        id,
      );
    }

    if (!user.mfaEnabled || !user.totpSecretCipher) {
      return jsonError(
        {
          code: "CONFLICT",
          message: "MFA no está activo en esta cuenta.",
        },
        id,
      );
    }

    let accepted = await verifyTotp(user.totpSecretCipher, input.code);
    let usedRecoveryIndex = -1;

    if (!accepted) {
      usedRecoveryIndex = await verifyRecoveryCode(user.recoveryCodeHashes, input.code);
      accepted = usedRecoveryIndex >= 0;
    }

    if (!accepted) {
      return jsonError(
        {
          code: "UNAUTHENTICATED",
          message: "El código MFA no es válido.",
        },
        id,
      );
    }

    if (user.platformRole) {
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Las cuentas de plataforma deben mantener MFA activo.",
        },
        id,
      );
    }

    await db.$transaction([
      db.user.update({
        where: { id: user.id },
        data: {
          mfaEnabled: false,
          totpSecretCipher: null,
          recoveryCodeHashes: [],
        },
      }),
      db.identityToken.updateMany({
        where: {
          userId: user.id,
          purpose: { in: ["MFA_SETUP", "MFA_LOGIN"] },
          usedAt: null,
        },
        data: { usedAt: new Date() },
      }),
      db.auditEvent.create({
        data: {
          organizationId,
          actorId: user.id,
          action: "security.mfa.disable",
          resourceType: "User",
          resourceId: user.id,
          outcome: "SUCCESS",
          correlationId: id,
        },
      }),
    ]);

    return NextResponse.json(
      { ok: true },
      { headers: { "x-request-id": id, "cache-control": "no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}