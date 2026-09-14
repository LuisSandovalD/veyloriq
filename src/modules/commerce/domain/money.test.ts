import { describe, expect, it } from "vitest";
import { add, calculateLine, formatMoney, money } from "./money";

describe("money", () => {
  it("rounds half up at the currency scale", () => {
    expect(money("10.125")).toEqual({ ok: true, value: { minor: 1013n, currency: "PEN", scale: 2 } });
    expect(money("10.124")).toEqual({ ok: true, value: { minor: 1012n, currency: "PEN", scale: 2 } });
  });

  it("rejects addition across currencies", () => {
    const pen = money(10, "PEN"); const usd = money(10, "USD");
    if (!pen.ok || !usd.ok) throw new Error("unexpected invalid money");
    expect(add(pen.value, usd.value)).toEqual({ ok: false, error: "CURRENCY_MISMATCH" });
  });

  it("calculates discount before tax and rounds each component", () => {
    const line = calculateLine({ quantity: "3", unitPrice: "19.99", discountRate: "10", taxRate: "18" });
    expect(line.ok).toBe(true);
    if (!line.ok) return;
    expect(line.value.subtotal.minor).toBe(5997n);
    expect(line.value.discount.minor).toBe(600n);
    expect(line.value.tax.minor).toBe(971n);
    expect(line.value.total.minor).toBe(6368n);
  });

  it("formats using the specified locale and currency", () => {
    const value = money("25.50"); if (!value.ok) throw new Error("unexpected invalid money");
    expect(formatMoney(value.value)).toContain("25.50");
  });
});
