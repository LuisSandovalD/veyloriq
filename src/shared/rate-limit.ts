import { createHash } from "node:crypto";
import Redis from "ioredis";
import { err, ok, type Result, type AppError } from "@/shared/result";

type LocalWindow = {
  count: number;
  expiresAt: number;
};

let redis: Redis | undefined;
let redisFailureLogged = false;

const local = new Map<string, LocalWindow>();

function configuredRedisUrl(): string | undefined {
  const value = process.env.REDIS_URL?.trim();

  if (!value) return undefined;

  try {
    const parsed = new URL(value);

    if (!["redis:", "rediss:"].includes(parsed.protocol)) {
      return undefined;
    }

    if (!parsed.hostname || parsed.hostname.toUpperCase() === "HOST") {
      return undefined;
    }

    return value;
  } catch {
    return undefined;
  }
}

function redisClient(url: string): Redis {
  if (redis) return redis;

  redis = new Redis(url, {
    maxRetriesPerRequest: 1,
    enableOfflineQueue: false,
    lazyConnect: true,
    connectTimeout: 1500,
    commandTimeout: 1500,
    retryStrategy: () => null,
  });

  redis.on("error", (error) => {
    if (redisFailureLogged) return;

    redisFailureLogged = true;

    console.error(
      JSON.stringify({
        level: "warn",
        event: "rate_limit.redis_unavailable",
        message:
          error instanceof Error ? error.message : "Redis unavailable",
      }),
    );
  });

  return redis;
}

function incrementLocalWindow(
  key: string,
  windowSeconds: number,
): number {
  const now = Date.now();
  const existing = local.get(key);

  const current =
    !existing || existing.expiresAt <= now
      ? {
        count: 0,
        expiresAt: now + windowSeconds * 1000,
      }
      : existing;

  current.count += 1;

  local.set(key, current);

  return current.count;
}

export async function rateLimit(
  scope: string,
  identity: string,
  limit: number,
  windowSeconds: number,
): Promise<Result<{ remaining: number }, AppError>> {
  const key = `VEYLORIQ:rate:${scope}:${createHash("sha256")
    .update(identity.toLowerCase())
    .digest("hex")}`;

  const url = configuredRedisUrl();

  let count: number;

  if (!url) {
    count = incrementLocalWindow(key, windowSeconds);
  } else {
    try {
      const service = redisClient(url);

      if (service.status === "wait") {
        await service.connect();
      }

      count = await service.incr(key);

      if (count === 1) {
        await service.expire(key, windowSeconds);
      }
    } catch (error) {
      console.error(
        JSON.stringify({
          level: "warn",
          event: "rate_limit.redis_fallback",
          message:
            error instanceof Error
              ? error.message
              : "Redis unavailable",
        }),
      );

      redis?.disconnect(false);
      redis = undefined;

      count = incrementLocalWindow(key, windowSeconds);
    }
  }

  if (count > limit) {
    return err({
      code: "LIMIT_EXCEEDED",
      message: "Demasiados intentos. Espera antes de continuar.",
    });
  }

  return ok({
    remaining: Math.max(0, limit - count),
  });
}