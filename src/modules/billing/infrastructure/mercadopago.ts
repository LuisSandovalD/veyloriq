import { createHmac, timingSafeEqual } from "node:crypto";
import { billingEnv } from "@/shared/env";

export async function mercadoPagoRequest<T>(
  path: string,
  init?: RequestInit,
): Promise<T> {
  const { MERCADOPAGO_ACCESS_TOKEN } = billingEnv();
  const response = await fetch(`https://api.mercadopago.com${path}`, {
    ...init,
    signal: init?.signal ?? AbortSignal.timeout(15_000),
    headers: {
      authorization: `Bearer ${MERCADOPAGO_ACCESS_TOKEN}`,
      "content-type": "application/json",
      ...init?.headers,
    },
  });
  if (!response.ok)
    throw new Error(`Mercado Pago request failed (${response.status})`);
  return (await response.json()) as T;
}

export function verifyMercadoPagoSignature(input: {
  signature: string | null;
  requestId: string | null;
  dataId: string | null;
}): boolean {
  const secret = process.env.MERCADOPAGO_WEBHOOK_SECRET;
  if (!secret || !input.signature || !input.requestId || !input.dataId)
    return false;
  const parts = Object.fromEntries(
    input.signature.split(",").map((part) => part.trim().split("=", 2)),
  );
  const timestamp = parts.ts;
  const provided = parts.v1;
  if (!timestamp || !provided || !/^\d+$/.test(timestamp)) return false;
  const numericTimestamp = Number(timestamp);
  const timestampMs =
    numericTimestamp > 1_000_000_000_000
      ? numericTimestamp
      : numericTimestamp * 1000;
  if (
    !Number.isSafeInteger(numericTimestamp) ||
    Math.abs(Date.now() - timestampMs) > 5 * 60 * 1000
  )
    return false;
  const manifest = `id:${input.dataId.toLowerCase()};request-id:${input.requestId};ts:${timestamp};`;
  const expected = createHmac("sha256", secret).update(manifest).digest("hex");
  const left = Buffer.from(expected, "hex");
  const right = Buffer.from(provided, "hex");
  return left.length === right.length && timingSafeEqual(left, right);
}
