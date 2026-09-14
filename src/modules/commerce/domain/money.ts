import { err, ok, type Result } from "@/shared/result";

export type MoneyError = "INVALID_AMOUNT" | "CURRENCY_MISMATCH";
export type Money = Readonly<{ minor: bigint; currency: string; scale: number }>;

export function money(value: string | number, currency = "PEN", scale = 2): Result<Money, MoneyError> {
  const source = String(value).trim();
  if (!/^-?\d+(\.\d+)?$/.test(source) || scale < 0 || scale > 6) return err("INVALID_AMOUNT");
  const negative = source.startsWith("-");
  const [wholeRaw, fractionRaw = ""] = source.replace("-", "").split(".");
  const whole = wholeRaw ?? "0";
  const padded = `${fractionRaw}${"0".repeat(scale + 1)}`;
  const kept = padded.slice(0, scale);
  const roundDigit = Number(padded[scale] ?? "0");
  let minor = BigInt(whole) * 10n ** BigInt(scale) + BigInt(kept || "0");
  if (roundDigit >= 5) minor += 1n;
  return ok({ minor: negative ? -minor : minor, currency, scale });
}

export function add(a: Money, b: Money): Result<Money, MoneyError> {
  if (a.currency !== b.currency || a.scale !== b.scale) return err("CURRENCY_MISMATCH");
  return ok({ ...a, minor: a.minor + b.minor });
}

export function formatMoney(value: Money, locale = "es-PE"): string {
  return new Intl.NumberFormat(locale, { style: "currency", currency: value.currency }).format(
    Number(value.minor) / 10 ** value.scale
  );
}

export type LineInput = { quantity: string; unitPrice: string; discountRate?: string; taxRate?: string };
export type LineTotal = { subtotal: Money; discount: Money; tax: Money; total: Money };

export function calculateLine(input: LineInput, currency = "PEN"): Result<LineTotal, MoneyError> {
  const quantity = Number(input.quantity);
  const unitPrice = Number(input.unitPrice);
  const discountRate = Number(input.discountRate ?? 0);
  const taxRate = Number(input.taxRate ?? 0);
  if (![quantity, unitPrice, discountRate, taxRate].every(Number.isFinite) || quantity <= 0 || unitPrice < 0 || discountRate < 0 || discountRate > 100 || taxRate < 0) {
    return err("INVALID_AMOUNT");
  }
  const subtotalResult = money(quantity * unitPrice, currency);
  const discountResult = money(quantity * unitPrice * discountRate / 100, currency);
  if (!subtotalResult.ok || !discountResult.ok) return err("INVALID_AMOUNT");
  const taxable = Number(subtotalResult.value.minor - discountResult.value.minor) / 100;
  const taxResult = money(taxable * taxRate / 100, currency);
  if (!taxResult.ok) return err("INVALID_AMOUNT");
  return ok({
    subtotal: subtotalResult.value,
    discount: discountResult.value,
    tax: taxResult.value,
    total: { ...subtotalResult.value, minor: subtotalResult.value.minor - discountResult.value.minor + taxResult.value.minor }
  });
}
