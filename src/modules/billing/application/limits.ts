import { getDb } from "@/shared/database";
import type { Prisma } from "@/generated/prisma/client";
import { err, ok, type AppError, type Result } from "@/shared/result";

export async function enforcePlanLimit(
  organizationId: string,
  metric: string,
  current: number,
  reserve = 1,
  client: Prisma.TransactionClient | ReturnType<typeof getDb> = getDb(),
): Promise<Result<void, AppError>> {
  const subscription = await client.subscription.findUnique({
    where: { organizationId },
    include: { plan: true },
  });
  if (!subscription)
    return err({
      code: "SUSPENDED",
      message: "La organización no tiene una suscripción configurada.",
    });
  const limits = subscription.plan.limits as Record<string, unknown>;
  const configured = limits[metric];
  if (
    typeof configured === "number" &&
    configured >= 0 &&
    current + reserve > configured
  )
    return err({
      code: "LIMIT_EXCEEDED",
      message: `Alcanzaste el límite de ${metric} del plan ${subscription.plan.name}.`,
    });
  return ok(undefined);
}

export async function recordUsage(
  organizationId: string,
  metric: string,
  amount = 1n,
) {
  const period = new Date().toISOString().slice(0, 7);
  await getDb().usageCounter.upsert({
    where: { organizationId_metric_period: { organizationId, metric, period } },
    update: { value: { increment: amount } },
    create: { organizationId, metric, period, value: amount },
  });
}

export async function consumePlanUsage(
  organizationId: string,
  metric: string,
  limitKey: string,
  amount = 1,
): Promise<Result<void, AppError>> {
  const period = new Date().toISOString().slice(0, 7);
  return getDb().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:${metric}:${period}`}, 0))`;
    const usage = await tx.usageCounter.findUnique({
      where: {
        organizationId_metric_period: { organizationId, metric, period },
      },
    });
    const allowed = await enforcePlanLimit(
      organizationId,
      limitKey,
      Number(usage?.value ?? 0n) + Number(usage?.reserved ?? 0n),
      amount,
      tx,
    );
    if (!allowed.ok) return allowed;
    await tx.usageCounter.upsert({
      where: {
        organizationId_metric_period: { organizationId, metric, period },
      },
      update: { value: { increment: BigInt(amount) } },
      create: { organizationId, metric, period, value: BigInt(amount) },
    });
    return ok(undefined);
  });
}

export async function reservePlanUsage(
  organizationId: string,
  metric: string,
  limitKey: string,
  amount = 1,
): Promise<Result<void, AppError>> {
  const period = new Date().toISOString().slice(0, 7);
  return getDb().$transaction(async (tx) => {
    await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:${metric}:${period}`}, 0))`;
    const usage = await tx.usageCounter.findUnique({
      where: {
        organizationId_metric_period: { organizationId, metric, period },
      },
    });
    const allowed = await enforcePlanLimit(
      organizationId,
      limitKey,
      Number(usage?.value ?? 0n) + Number(usage?.reserved ?? 0n),
      amount,
      tx,
    );
    if (!allowed.ok) return allowed;
    await tx.usageCounter.upsert({
      where: {
        organizationId_metric_period: { organizationId, metric, period },
      },
      update: { reserved: { increment: BigInt(amount) } },
      create: { organizationId, metric, period, reserved: BigInt(amount) },
    });
    return ok(undefined);
  });
}

export async function settleReservedPlanUsage(
  organizationId: string,
  metric: string,
  amount: number,
  confirmed: boolean,
): Promise<void> {
  const period = new Date().toISOString().slice(0, 7);
  const changed = await getDb().usageCounter.updateMany({
    where: {
      organizationId,
      metric,
      period,
      reserved: { gte: BigInt(amount) },
    },
    data: {
      reserved: { decrement: BigInt(amount) },
      ...(confirmed ? { value: { increment: BigInt(amount) } } : {}),
    },
  });
  if (changed.count !== 1)
    throw new Error("Usage reservation could not be settled");
}
