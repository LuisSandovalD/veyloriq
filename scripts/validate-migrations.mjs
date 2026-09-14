import "dotenv/config";
import { randomBytes } from "node:crypto";
import { readdir, readFile } from "node:fs/promises";
import path from "node:path";
import pg from "pg";

const { Client } = pg;
const databaseUrl = process.env.DATABASE_URL;
if (!databaseUrl) throw new Error("DATABASE_URL is required");

const schema = `VEYLORIQ_migration_check_${randomBytes(6).toString("hex")}`;
if (!/^VEYLORIQ_migration_check_[a-f0-9]{12}$/.test(schema))
  throw new Error("Unsafe validation schema name");

const migrationsRoot = path.resolve("prisma", "migrations");
const directories = (await readdir(migrationsRoot, { withFileTypes: true }))
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();
const client = new Client({
  connectionString: databaseUrl,
  application_name: "VEYLORIQ-migration-validator",
});

await client.connect();
try {
  await client.query(`CREATE SCHEMA "${schema}"`);
  await client.query(`SET search_path TO "${schema}"`);
  for (const directory of directories) {
    const sql = await readFile(path.join(migrationsRoot, directory, "migration.sql"), "utf8");
    await client.query(sql);
  }
  const checks = await client.query(
    `SELECT
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'OutboxEvent' AND column_name = 'failedAt') AS outbox_terminal,
      EXISTS (SELECT 1 FROM information_schema.columns WHERE table_schema = $1 AND table_name = 'AuditEvent' AND column_name = 'actorType') AS actor_type,
      EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = $1 AND constraint_name = 'Membership_organizationId_roleId_fkey') AS tenant_role_fk,
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'AutomationVersion') AS automation_versions,
      EXISTS (SELECT 1 FROM information_schema.table_constraints WHERE constraint_schema = $1 AND constraint_name = 'AutomationRun_organizationId_automationId_fkey') AS tenant_automation_fk,
      EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = $1 AND table_name = 'ServiceHeartbeat') AS service_heartbeat`,
    [schema],
  );
  if (
    !checks.rows[0]?.outbox_terminal ||
    !checks.rows[0]?.actor_type ||
    !checks.rows[0]?.tenant_role_fk ||
    !checks.rows[0]?.automation_versions ||
    !checks.rows[0]?.tenant_automation_fk ||
    !checks.rows[0]?.service_heartbeat
  )
    throw new Error("Migration verification assertions failed");
  console.info(
    JSON.stringify({
      status: "ok",
      migrations: directories.length,
      checks: checks.rows[0],
    }),
  );
} finally {
  await client.query(`DROP SCHEMA IF EXISTS "${schema}" CASCADE`);
  await client.end();
}
