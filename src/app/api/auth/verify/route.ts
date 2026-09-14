import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { createSession } from "@/modules/identity/application/auth";
import { verifyEmail } from "@/modules/identity/application/register";
import { assertSameOrigin, clientIdentity, handleRouteError, jsonError, requestId } from "@/shared/http";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request)) return jsonError({ code: "FORBIDDEN", message: "Origen de solicitud no permitido." }, id);
    const { token } = z.object({ token: z.string().min(20).max(200) }).parse(await request.json());
    const result = await verifyEmail(token);
    if (!result.ok) return jsonError(result.error, id);
    await createSession(result.value.userId, { userAgent: request.headers.get("user-agent"), ip: clientIdentity(request) });
    return NextResponse.json({ ok: true }, { headers: { "x-request-id": id } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}
