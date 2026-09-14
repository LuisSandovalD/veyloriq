import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "@/generated/prisma/client";
import { databaseEnv } from "@/shared/env";
const globalDatabase = globalThis as typeof globalThis & {
  VEYLORIQDb?: PrismaClient;
};
function createDatabaseClient(): PrismaClient {
  const { DATABASE_URL } = databaseEnv();
  const adapter = new PrismaPg({
    connectionString: DATABASE_URL,
    // Tiempo máximo para establecer conexión.
    connectionTimeoutMillis: 15_000,
    // Evita cerrar conexiones demasiado rápido.
    idleTimeoutMillis: 300_000,
    // Limita conexiones abiertas por instancia.
    max: 5,
  });
  return new PrismaClient({
    adapter,
  });
}

export function getDb(): PrismaClient {
  if (!globalDatabase.VEYLORIQDb) {
    globalDatabase.VEYLORIQDb = createDatabaseClient();
  }

  return globalDatabase.VEYLORIQDb;
}