import { NextResponse, type NextRequest } from "next/server";
import { revokeCurrentSession } from "@/modules/identity/application/auth";
import { assertSameOrigin, jsonError, requestId } from "@/shared/http";

export async function POST(request: NextRequest) {
  const id = requestId(request);
  if (!assertSameOrigin(request)) return jsonError({ code: "FORBIDDEN", message: "Origen de solicitud no permitido." }, id);
  await revokeCurrentSession();
  return NextResponse.json({ ok: true }, { headers: { "x-request-id": id } });
}
