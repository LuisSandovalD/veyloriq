import { NextResponse } from "next/server";
import Redis from "ioredis";
import { getDb } from "@/shared/database";

const runtimeServices = [
  "REDIS_URL",
  "BREVO_API_KEY",
  "BREVO_SENDER_EMAIL",
  "CLOUDINARY_CLOUD_NAME",
  "CLOUDINARY_API_KEY",
  "CLOUDINARY_API_SECRET",
  "CLAMAV_SCAN_URL",
  "MERCADOPAGO_ACCESS_TOKEN",
  "MERCADOPAGO_WEBHOOK_SECRET",
  "AI_BASE_URL",
  "AI_API_KEY",
  "AI_MODEL",
] as const;

async function redisStatus(): Promise<"ok" | "not_configured" | "unavailable"> {
  const url = process.env.REDIS_URL;
  if (!url) return "not_configured";
  const redis = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 1_500,
    commandTimeout: 1_500,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
  });
  try {
    await redis.connect();
    return (await redis.ping()) === "PONG" ? "ok" : "unavailable";
  } catch {
    return "unavailable";
  } finally {
    redis.disconnect(false);
  }
}

export async function GET(request: Request) {
  const mode = new URL(request.url).searchParams.get("mode") ?? "live";
  if (mode === "live")
    return NextResponse.json({
      status: "alive",
      time: new Date().toISOString(),
    });
  try {
    const db = getDb();
    const now = new Date();
    const [, pendingJobs, heartbeat, redis] = await Promise.all([
      db.$queryRaw`SELECT 1`,
      db.job.count({ where: { status: { in: ["PENDING", "RETRYING"] } } }),
      db.serviceHeartbeat.findUnique({ where: { id: "worker" } }),
      redisStatus(),
    ]);
    const workerAgeMs = heartbeat
      ? now.getTime() - heartbeat.updatedAt.getTime()
      : null;
    // En Vercel el worker corre vía Cron cada 5 min (serverless); en Docker es
    // un proceso continuo con heartbeat cada 15 s. 10 min cubre ambos casos.
    const worker =
      workerAgeMs !== null && workerAgeMs < 10 * 60_000
        ? "ok"
        : "stale_or_missing";
    const missingConfiguration = runtimeServices.filter(
      (name) => !process.env[name],
    );
    const configurationReady =
      process.env.NODE_ENV !== "production" || missingConfiguration.length === 0;
    const ready = worker === "ok" && redis === "ok" && configurationReady;
    return NextResponse.json(
      {
        status: ready ? "ready" : "not_ready",
        database: "ok",
        redis,
        worker,
        workerHeartbeatAt: heartbeat?.updatedAt ?? null,
        pendingJobs,
        missingConfiguration,
        time: now.toISOString(),
      },
      { status: ready ? 200 : 503 },
    );
  } catch {
    return NextResponse.json(
      { status: "not_ready", database: "unavailable" },
      { status: 503 },
    );
  }
}
