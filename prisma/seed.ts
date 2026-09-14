import "dotenv/config";
import argon2 from "argon2";
import { getDb } from "../src/shared/database";
import { permissionKeys } from "../src/modules/identity/domain/permissions";

const plans = [
  {
    code: "FREE", name: "Free", monthlyPrice: 0, annualPrice: 0, active: true,
    limits: { users: 2, products: 100, customers: 100, warehouses: 1, automations: 3, storageMB: 100, emailsPerMonth: 100, apiRequests: 10_000, aiRequests: 10 },
    features: ["CRM", "Catálogo", "Cotizaciones"]
  },
  {
    code: "STARTER", name: "Starter", monthlyPrice: 49, annualPrice: 490, active: true,
    limits: { users: 5, products: 1_000, customers: 1_000, warehouses: 3, automations: 10, storageMB: 1024, emailsPerMonth: 2_000, apiRequests: 100_000, aiRequests: 250 },
    features: ["CRM", "Catálogo", "Cotizaciones", "Ventas", "Compras", "Inventario", "Reportes", "Documentos"]
  },
  {
    code: "BUSINESS", name: "Business", monthlyPrice: 129, annualPrice: 1290, active: true,
    limits: { users: 20, products: 10_000, customers: 10_000, warehouses: 10, automations: 50, storageMB: 10_240, emailsPerMonth: 10_000, apiRequests: 500_000, aiRequests: 2_000 },
    features: ["CRM", "Catálogo", "Cotizaciones", "Ventas", "Compras", "Inventario", "Reportes", "Documentos", "Automatizaciones", "IA", "API"]
  },
  {
    code: "ENTERPRISE", name: "Enterprise", monthlyPrice: 299, annualPrice: 2990, active: true,
    limits: { users: 100, products: 100_000, customers: 100_000, warehouses: 50, automations: 250, storageMB: 51_200, emailsPerMonth: 50_000, apiRequests: 2_000_000, aiRequests: 10_000 },
    features: ["CRM", "Catálogo", "Cotizaciones", "Ventas", "Compras", "Inventario", "Reportes", "Documentos", "Automatizaciones", "IA", "API", "Soporte prioritario", "Límites ampliados"]
  }
] as const;

async function main() {
  const db = getDb();

  console.log("Inicializando VEYLORIQ...");

  await db.permission.createMany({ data: permissionKeys.map((key) => ({ key, description: key })), skipDuplicates: true });
  console.log(`Permisos: ${permissionKeys.length}`);

  for (const plan of plans) {
    await db.plan.upsert({
      where: { code: plan.code },
      update: { name: plan.name, currency: "PEN", monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice, limits: plan.limits, features: [...plan.features], active: plan.active },
      create: { code: plan.code, name: plan.name, currency: "PEN", monthlyPrice: plan.monthlyPrice, annualPrice: plan.annualPrice, limits: plan.limits, features: [...plan.features], active: plan.active }
    });
  }

  console.log(`Planes: ${plans.map((p) => p.code).join(", ")}`);

  const email = process.env.PLATFORM_BOOTSTRAP_EMAIL?.trim().toLowerCase();
  const password = process.env.PLATFORM_BOOTSTRAP_PASSWORD;

  if (Boolean(email) !== Boolean(password)) throw new Error("PLATFORM_BOOTSTRAP_EMAIL y PLATFORM_BOOTSTRAP_PASSWORD deben configurarse juntos");

  if (email && password) {
    if (password.length < 16) throw new Error("PLATFORM_BOOTSTRAP_PASSWORD debe tener al menos 16 caracteres");
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("PLATFORM_BOOTSTRAP_EMAIL no es válido");
    const passwordHash = await argon2.hash(password, { type: argon2.argon2id, memoryCost: 19456, timeCost: 2, parallelism: 1 });

    await db.user.upsert({
      where: { email },
      update: { displayName: "Platform Superuser", platformRole: "PLATFORM_SUPERUSER", emailVerifiedAt: new Date() },
      create: { email, displayName: "Platform Superuser", passwordHash, emailVerifiedAt: new Date(), platformRole: "PLATFORM_SUPERUSER", recoveryCodeHashes: [] }
    });

    console.log(`Superusuario: ${email}`);
  } else {
    console.log("Superusuario: omitido");
  }

  const [permissionsCount, plansCount, usersCount] = await Promise.all([
    db.permission.count(),
    db.plan.count(),
    db.user.count()
  ]);

  console.log({ permissions: permissionsCount, plans: plansCount, users: usersCount });
  console.log("Seed completado correctamente.");
}

main()
  .catch((error) => {
    console.error("Seed falló:", error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(async () => getDb().$disconnect());