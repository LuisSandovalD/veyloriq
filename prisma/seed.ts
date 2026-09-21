import "dotenv/config";
import { getDb } from "../src/shared/database";
import { seedCatalog } from "./seed/catalog";
import { seedCollaboration } from "./seed/collaboration";
import { seedCommerce } from "./seed/commerce";
import { seedCrm } from "./seed/crm";
import { seedFinance } from "./seed/finance";
import { demoPassword } from "./seed/helpers";
import { seedIdentity } from "./seed/identity";
import { seedInventoryCatalog, seedStockHistory } from "./seed/inventory";
import { seedPlatformHistory } from "./seed/platform";
import { verifyDemoSeed } from "./seed/verify";

async function main() {
  const db = getDb();

  console.log("Inicializando catálogo de VEYLORIQ...");
  const planIds = await seedCatalog(db);

  console.log("Creando organización, usuarios, roles y suscripción...");
  const context = await seedIdentity(db, planIds);

  console.log("Creando historial de CRM...");
  const crm = await seedCrm(db, context);

  console.log("Creando catálogo, proveedores y almacenes...");
  const inventory = await seedInventoryCatalog(db, context);

  console.log("Creando compras, cotizaciones, pedidos y despachos...");
  const commerce = await seedCommerce(db, context, crm, inventory);

  console.log("Creando stock y kardex histórico...");
  await seedStockHistory(db, context, inventory, commerce);

  console.log("Creando finanzas y obligaciones...");
  const finance = await seedFinance(db, context, commerce);

  console.log("Creando tareas, notificaciones, automatizaciones e IA...");
  await seedCollaboration(
    db,
    context,
    crm,
    inventory,
    commerce,
    finance,
  );

  console.log("Creando historial de plataforma y facturación...");
  await seedPlatformHistory(db, context, inventory, commerce);

  const summary = await verifyDemoSeed(db, context.organizationId);
  console.log("Seed completado correctamente.");
  console.table(summary);
  console.log({
    organization: "VEYLORIQ Demo UNDC",
    users: [
      "2301080307@undc.edu.pe (OWNER + PLATFORM_SUPERUSER)",
      "2301010375@undc.edu.pe (ADMIN)",
      "2301050259@undc.edu.pe (SALES)",
      "2301010136@undc.edu.pe (WAREHOUSE)",
    ],
    demoPassword: process.env.DEMO_SEED_PASSWORD
      ? "Configurada mediante DEMO_SEED_PASSWORD"
      : demoPassword(),
  });
}

main()
  .catch((error) => {
    console.error(
      "Seed falló:",
      error instanceof Error ? error.message : error,
    );
    process.exitCode = 1;
  })
  .finally(async () => getDb().$disconnect());
