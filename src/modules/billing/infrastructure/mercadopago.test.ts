import { createHmac } from "node:crypto";
import { afterEach, describe, expect, it } from "vitest";
import { verifyMercadoPagoSignature } from "./mercadopago";

describe("Mercado Pago webhook signature", () => {
  afterEach(() => { delete process.env.MERCADOPAGO_WEBHOOK_SECRET; });
  it("accepts a current signature and rejects a modified resource", () => {
    process.env.MERCADOPAGO_WEBHOOK_SECRET = "test-secret";
    const ts = String(Math.floor(Date.now() / 1000)); const requestId = "request-123"; const dataId = "ABC-123";
    const signature = createHmac("sha256", "test-secret").update(`id:${dataId.toLowerCase()};request-id:${requestId};ts:${ts};`).digest("hex");
    const header = `ts=${ts},v1=${signature}`;
    expect(verifyMercadoPagoSignature({ signature: header, requestId, dataId })).toBe(true);
    expect(verifyMercadoPagoSignature({ signature: header, requestId, dataId: "other" })).toBe(false);
  });
});
