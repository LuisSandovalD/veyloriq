import { NextResponse } from "next/server";
import Redis from "ioredis";
import { getDb } from "@/shared/database";

const optionalRuntimeServices = [
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

async function redisStatus(): Promise<
  "ok" | "not_configured" | "unavailable"
> {
  const url = process.env.REDIS_URL?.trim();

  if (!url) {
    return "not_configured";
  }

  const redis = new Redis(url, {
    lazyConnect: true,
    connectTimeout: 1_500,
    commandTimeout: 1_500,
    maxRetriesPerRequest: 0,
    enableOfflineQueue: false,
  });

  try {
    await redis.connect();

    return (await redis.ping()) === "PONG"
      ? "ok"
      : "unavailable";
  } catch {
    return "unavailable";
  } finally {
    redis.disconnect(false);
  }
}

export async function GET(request: Request) {
  const mode =
    new URL(request.url).searchParams.get("mode") ?? "live";

  if (mode === "live") {
    return NextResponse.json({
      status: "alive",
      time: new Date().toISOString(),
    });
  }

  try {
    const db = getDb();
    const now = new Date();

    const [, pendingJobs, heartbeat, redis] =
      await Promise.all([
        db.$queryRaw`SELECT 1`,
        db.job.count({
          where: {
            status: {
              in: ["PENDING", "RETRYING"],
            },
          },
        }),
        db.serviceHeartbeat.findUnique({
          where: {
            id: "worker",
          },
        }),
        redisStatus(),
      ]);

    const optionalNotConfigured =
      optionalRuntimeServices.filter(
        (name) => !process.env[name],
      );

    return NextResponse.json({
      status: "ready",
      database: "ok",

      redis: {
        status: redis,
        required: false,
      },

      worker: {
        configured: true,
        heartbeatAt: heartbeat?.updatedAt ?? null,
        requiredForHealth: false,
      },

      pendingJobs,

      optionalNotConfigured,

      time: now.toISOString(),
    });
  } catch (error) {
    console.error(
      JSON.stringify({
        level: "error",
        event: "health.ready.failed",
        message:
          error instanceof Error
            ? error.message
            : "Unknown error",
      }),
    );

    return NextResponse.json(
      {
        status: "not_ready",
        database: "unavailable",
        time: new Date().toISOString(),
      },
      {
        status: 503,
      },
    );
  }
}