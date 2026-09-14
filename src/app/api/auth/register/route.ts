import { NextResponse, type NextRequest } from "next/server";
import { registerAccount, registerSchema } from "@/modules/identity/application/register";
import {
  assertSameOrigin,
  clientIdentity,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";
import { rateLimit } from "@/shared/rate-limit";

export async function POST(request: NextRequest) {
  const id = requestId(request);

  try {
    if (!assertSameOrigin(request)) {
      return jsonError(
        {
          code: "FORBIDDEN",
          message: "Origen de solicitud no permitido.",
        },
        id,
      );
    }

    const limit = await rateLimit(
      "auth.register",
      clientIdentity(request),
      5,
      3600,
    );

    if (!limit.ok) {
      return jsonError(limit.error, id);
    }

    const input = registerSchema.parse(await request.json());
    const result = await registerAccount(input);

    if (!result.ok) {
      return jsonError(result.error, id);
    }

    return NextResponse.json(
      {
        message: "Cuenta creada. Revisa tu correo para verificarla.",
      },
      {
        status: 201,
        headers: {
          "x-request-id": id,
        },
      },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}