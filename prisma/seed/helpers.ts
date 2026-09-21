import { createHash } from "node:crypto";

export const DEMO_ORGANIZATION_SLUG = "veyloriq-demo-undc";
export const DEFAULT_DEMO_PASSWORD = "VeyloriqDemo2026!";

export function seedId(key: string): string {
  const digest = createHash("sha256")
    .update(`veyloriq-demo:${key}`)
    .digest("hex")
    .slice(0, 24);
  return `c${digest}`;
}

export function daysAgo(days: number, hour = 10): Date {
  const value = new Date();
  value.setUTCHours(hour, 0, 0, 0);
  value.setUTCDate(value.getUTCDate() - days);
  return value;
}

export function daysFromNow(days: number, hour = 18): Date {
  return daysAgo(-days, hour);
}

export function currentPeriod(): string {
  return new Date().toISOString().slice(0, 7);
}

export function demoPassword(): string {
  const configured = process.env.DEMO_SEED_PASSWORD?.trim();
  if (process.env.NODE_ENV === "production" && !configured) {
    throw new Error(
      "DEMO_SEED_PASSWORD es obligatorio al ejecutar el seed en producción.",
    );
  }
  const password = configured || DEFAULT_DEMO_PASSWORD;
  if (
    password.length < 12 ||
    !/[a-z]/.test(password) ||
    !/[A-Z]/.test(password) ||
    !/\d/.test(password)
  ) {
    throw new Error(
      "DEMO_SEED_PASSWORD debe tener al menos 12 caracteres, mayúscula, minúscula y número.",
    );
  }
  return password;
}

export function tokenHash(value: string): string {
  return createHash("sha256").update(value).digest("hex");
}

