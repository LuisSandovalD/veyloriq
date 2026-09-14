import { NextResponse, type NextRequest } from "next/server";
import { ZodError } from "zod";
import type { AppError } from "@/shared/result";

const statusByCode: Record<AppError["code"], number> = {
  UNAUTHENTICATED: 401, FORBIDDEN: 403, NOT_FOUND: 404, CONFLICT: 409,
  VALIDATION: 422, LIMIT_EXCEEDED: 429, SUSPENDED: 423, TECHNICAL: 500
};

export function requestId(request: NextRequest): string {
  return request.headers.get("x-request-id")?.slice(0, 100) ?? crypto.randomUUID();
}

export function clientIdentity(request: NextRequest): string {
  const trustedHeader = process.env.TRUSTED_PROXY_IP_HEADER;
  if (!trustedHeader) return "direct-client";
  if (!new Set(["cf-connecting-ip", "x-real-ip", "x-forwarded-for"]).has(trustedHeader))
    throw new Error("TRUSTED_PROXY_IP_HEADER is invalid");
  const value = request.headers.get(trustedHeader);
  return (trustedHeader === "x-forwarded-for" ? value?.split(",")[0] : value)?.trim().slice(0, 80) || "unknown-client";
}

export function jsonError(error: AppError, id: string) {
  return NextResponse.json({ error: { ...error, requestId: id } }, { status: statusByCode[error.code], headers: { "x-request-id": id } });
}

export function handleRouteError(error: unknown, id: string) {
  if (error instanceof ZodError) {
    return jsonError({ code: "VALIDATION", message: "Revisa los datos ingresados.", details: error.flatten().fieldErrors }, id);
  }
  console.error(JSON.stringify({ level: "error", event: "http.unexpected", requestId: id, message: error instanceof Error ? error.message : "Unknown error" }));
  return jsonError({ code: "TECHNICAL", message: "No pudimos completar la operación." }, id);
}

export function assertSameOrigin(request: NextRequest): boolean {
  const origin = request.headers.get("origin");
  const host = request.headers.get("host");
  if (!origin || !host) return false;
  try { return new URL(origin).host === host; } catch { return false; }
}
