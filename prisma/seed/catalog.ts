import { permissionKeys } from "../../src/modules/identity/domain/permissions";
import type { PlanIds, SeedDatabase } from "./types";

const plans = [
  {
    code: "FREE",
    name: "Free",
    monthlyPrice: 0,
    annualPrice: 0,
    active: true,
    limits: {
      users: 2,
      products: 100,
      customers: 100,
      warehouses: 1,
      automations: 3,
      storageMB: 100,
      emailsPerMonth: 100,
      apiRequests: 10_000,
      aiRequests: 10,
    },
    features: ["CRM", "Catálogo", "Cotizaciones"],
  },
  {
    code: "STARTER",
    name: "Starter",
    monthlyPrice: 49,
    annualPrice: 490,
    active: true,
    limits: {
      users: 5,
      products: 1_000,
      customers: 1_000,
      warehouses: 3,
      automations: 10,
      storageMB: 1_024,
      emailsPerMonth: 2_000,
      apiRequests: 100_000,
      aiRequests: 250,
    },
    features: [
      "CRM",
      "Catálogo",
      "Cotizaciones",
      "Ventas",
      "Compras",
      "Inventario",
      "Reportes",
      "Documentos",
    ],
  },
  {
    code: "BUSINESS",
    name: "Business",
    monthlyPrice: 129,
    annualPrice: 1_290,
    active: true,
    limits: {
      users: 20,
      products: 10_000,
      customers: 10_000,
      warehouses: 10,
      automations: 50,
      storageMB: 10_240,
      emailsPerMonth: 10_000,
      apiRequests: 500_000,
      aiRequests: 2_000,
    },
    features: [
      "CRM",
      "Catálogo",
      "Cotizaciones",
      "Ventas",
      "Compras",
      "Inventario",
      "Reportes",
      "Documentos",
      "Automatizaciones",
      "IA",
      "API",
    ],
  },
  {
    code: "ENTERPRISE",
    name: "Enterprise",
    monthlyPrice: 299,
    annualPrice: 2_990,
    active: true,
    limits: {
      users: 100,
      products: 100_000,
      customers: 100_000,
      warehouses: 50,
      automations: 250,
      storageMB: 51_200,
      emailsPerMonth: 50_000,
      apiRequests: 2_000_000,
      aiRequests: 10_000,
    },
    features: [
      "CRM",
      "Catálogo",
      "Cotizaciones",
      "Ventas",
      "Compras",
      "Inventario",
      "Reportes",
      "Documentos",
      "Automatizaciones",
      "IA",
      "API",
      "Soporte prioritario",
      "Límites ampliados",
    ],
  },
] as const;

export async function seedCatalog(db: SeedDatabase): Promise<PlanIds> {
  for (const key of permissionKeys) {
    await db.permission.upsert({
      where: { key },
      update: { description: key },
      create: { key, description: key },
    });
  }

  const ids = new Map<string, string>();
  for (const plan of plans) {
    const saved = await db.plan.upsert({
      where: { code: plan.code },
      update: {
        name: plan.name,
        currency: "PEN",
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        limits: plan.limits,
        features: [...plan.features],
        active: plan.active,
      },
      create: {
        code: plan.code,
        name: plan.name,
        currency: "PEN",
        monthlyPrice: plan.monthlyPrice,
        annualPrice: plan.annualPrice,
        limits: plan.limits,
        features: [...plan.features],
        active: plan.active,
      },
    });
    ids.set(plan.code, saved.id);
  }

  const required = (code: string) => {
    const id = ids.get(code);
    if (!id) throw new Error(`No se creó el plan ${code}.`);
    return id;
  };

  return {
    free: required("FREE"),
    starter: required("STARTER"),
    business: required("BUSINESS"),
    enterprise: required("ENTERPRISE"),
  };
}

