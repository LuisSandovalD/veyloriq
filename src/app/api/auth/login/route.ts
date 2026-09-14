import argon2 from "argon2";
import { createHash, randomBytes } from "node:crypto";
import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import { assertSameOrigin, handleRouteError, jsonError, requestId } from "@/shared/http";
import { clientIdentity } from "@/shared/http";
import { rateLimit } from "@/shared/rate-limit";

const schema = z.object({ email: z.string().email().transform((value) => value.toLowerCase()), password: z.string().min(1).max(128) });

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request)) return jsonError({ code: "FORBIDDEN", message: "Origen de solicitud no permitido." }, id);
    const input = schema.parse(await request.json());
    const ip = clientIdentity(request);
    const [ipLimit,emailLimit] = await Promise.all([rateLimit("auth.login.ip",ip,20,900),rateLimit("auth.login.email",input.email,8,900)]);
    if(!ipLimit.ok)return jsonError(ipLimit.error,id);if(!emailLimit.ok)return jsonError(emailLimit.error,id);
    const user = await getDb().user.findUnique({ where: { email: input.email } });
    if (!user || !await argon2.verify(user.passwordHash, input.password)) return jsonError({ code: "UNAUTHENTICATED", message: "Correo o contraseña incorrectos." }, id);
    if (!user.emailVerifiedAt) return jsonError({ code: "FORBIDDEN", message: "Verifica tu correo antes de ingresar." }, id);
    if (user.mfaEnabled) {
      const challenge = randomBytes(32).toString("base64url");
      await getDb().identityToken.create({ data: { userId: user.id, purpose: "MFA_LOGIN", tokenHash: createHash("sha256").update(challenge).digest("hex"), expiresAt: new Date(Date.now() + 5 * 60_000) } });
      return NextResponse.json({ mfaRequired: true, challenge, redirectTo:user.platformRole?"/platform":"/app" }, { headers: { "x-request-id": id, "cache-control": "no-store" } });
    }
    await createSession(user.id, { userAgent: request.headers.get("user-agent"), ip });
    return NextResponse.json({ ok: true, redirectTo:user.platformRole?"/platform/setup":"/app" }, { headers: { "x-request-id": id } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}
