import { currentPeriod, daysAgo, seedId } from "./helpers";
import type {
  CommerceContext,
  InventoryContext,
  SeedContext,
  SeedDatabase,
} from "./types";

export async function seedPlatformHistory(
  db: SeedDatabase,
  context: SeedContext,
  inventory: InventoryContext,
  commerce: CommerceContext,
): Promise<void> {
  const organizationId = context.organizationId;
  const billingEvents = [
    { key: "month-3", age: 72, amount: 129 },
    { key: "month-2", age: 42, amount: 129 },
    { key: "month-1", age: 12, amount: 129 },
  ];
  for (const item of billingEvents) {
    await db.billingEvent.upsert({
      where: { providerId: `demo-billing-${item.key}` },
      update: {
        organizationId,
        type: "subscription.payment",
        status: "APPROVED",
        amount: item.amount,
        currency: "PEN",
        occurredAt: daysAgo(item.age),
        payload: { source: "demo-seed", cycle: "MONTHLY" },
      },
      create: {
        id: seedId(`billing-event:${item.key}`),
        organizationId,
        providerId: `demo-billing-${item.key}`,
        type: "subscription.payment",
        status: "APPROVED",
        amount: item.amount,
        currency: "PEN",
        occurredAt: daysAgo(item.age),
        payload: { source: "demo-seed", cycle: "MONTHLY" },
        createdAt: daysAgo(item.age),
      },
    });
  }

  const usage = [
    { metric: "api_requests", period: currentPeriod(), value: 1_248n },
    { metric: "ai_requests", period: currentPeriod(), value: 12n },
    { metric: "emails_sent", period: currentPeriod(), value: 34n },
    { metric: "storage_bytes", period: "lifetime", value: 0n },
  ];
  for (const item of usage) {
    await db.usageCounter.upsert({
      where: {
        organizationId_metric_period: {
          organizationId,
          metric: item.metric,
          period: item.period,
        },
      },
      update: { value: item.value, reserved: 0 },
      create: {
        id: seedId(`usage:${item.metric}:${item.period}`),
        organizationId,
        metric: item.metric,
        period: item.period,
        value: item.value,
      },
    });
  }

  await db.pendingSubscriptionChange.upsert({
    where: { providerId: "demo-plan-change-business" },
    update: {
      organizationId,
      planId: context.planIds.business,
      billingCycle: "MONTHLY",
      status: "APPLIED",
      expiresAt: daysAgo(120),
    },
    create: {
      id: seedId("pending-subscription-change:business"),
      organizationId,
      planId: context.planIds.business,
      providerId: "demo-plan-change-business",
      billingCycle: "MONTHLY",
      status: "APPLIED",
      expiresAt: daysAgo(120),
      createdAt: daysAgo(180),
    },
  });

  await db.webhookEvent.upsert({
    where: {
      provider_providerId: {
        provider: "MERCADOPAGO",
        providerId: "demo-webhook-payment-month-1",
      },
    },
    update: {
      payload: { status: "approved", source: "demo-seed" },
      occurredAt: daysAgo(12),
      processedAt: daysAgo(12),
      attempts: 1,
      lastError: null,
    },
    create: {
      id: seedId("webhook:mercadopago-month-1"),
      provider: "MERCADOPAGO",
      providerId: "demo-webhook-payment-month-1",
      signature: "demo-signature",
      payload: { status: "approved", source: "demo-seed" },
      occurredAt: daysAgo(12),
      receivedAt: daysAgo(12),
      processedAt: daysAgo(12),
      attempts: 1,
    },
  });

  await db.serviceHeartbeat.upsert({
    where: { id: "worker" },
    update: { metadata: { source: "demo-seed", status: "ready" } },
    create: {
      id: "worker",
      metadata: { source: "demo-seed", status: "ready" },
    },
  });

  const incidentId = seedId("platform-incident:email-delay");
  await db.platformIncident.upsert({
    where: { id: incidentId },
    update: {
      title: "Retraso temporal en correos transaccionales",
      severity: "LOW",
      status: "RESOLVED",
      description:
        "Se detectó una demora en la entrega de correos durante una prueba de integración.",
      resolution:
        "Se reintentaron los eventos pendientes y se confirmó la entrega con el proveedor.",
      resolvedById: context.users.luis,
      resolvedAt: daysAgo(28),
    },
    create: {
      id: incidentId,
      organizationId,
      title: "Retraso temporal en correos transaccionales",
      severity: "LOW",
      status: "RESOLVED",
      description:
        "Se detectó una demora en la entrega de correos durante una prueba de integración.",
      openedById: context.users.luis,
      resolvedById: context.users.luis,
      resolution:
        "Se reintentaron los eventos pendientes y se confirmó la entrega con el proveedor.",
      openedAt: daysAgo(29),
      resolvedAt: daysAgo(28),
    },
  });

  const supportGrantId = seedId("support-grant:historical-review");
  await db.supportGrant.upsert({
    where: { id: supportGrantId },
    update: {
      reason: "Revisión demostrativa del estado de integraciones.",
      scopes: ["organization.metadata", "integrations.read"],
      expiresAt: daysAgo(20),
      revokedAt: daysAgo(20),
      revokedById: context.users.luis,
    },
    create: {
      id: supportGrantId,
      organizationId,
      operatorId: context.users.luis,
      reason: "Revisión demostrativa del estado de integraciones.",
      scopes: ["organization.metadata", "integrations.read"],
      expiresAt: daysAgo(20),
      revokedAt: daysAgo(20),
      revokedById: context.users.luis,
      createdAt: daysAgo(21),
    },
  });

  const auditEvents = [
    {
      key: "organization-created",
      actorId: context.users.luis,
      action: "organization.onboarding.complete",
      resourceType: "Organization",
      resourceId: organizationId,
      changes: { status: "ACTIVE" },
      age: 190,
    },
    {
      key: "purchase-received",
      actorId: context.users.josue,
      action: "purchase.receive",
      resourceType: "PurchaseOrder",
      resourceId: commerce.purchases.received,
      changes: { status: "RECEIVED" },
      age: 88,
    },
    {
      key: "quote-sent",
      actorId: context.users.juan,
      action: "quote.send",
      resourceType: "Quote",
      resourceId: commerce.quotes.completed,
      changes: { status: "SENT" },
      age: 56,
    },
    {
      key: "order-completed",
      actorId: context.users.josue,
      action: "order.complete",
      resourceType: "Order",
      resourceId: commerce.orders.completed,
      changes: { status: "COMPLETED" },
      age: 45,
    },
    {
      key: "inventory-transfer",
      actorId: context.users.josue,
      action: "inventory.transfer",
      resourceType: "Product",
      resourceId: inventory.products.keyboard,
      changes: { quantity: 3 },
      age: 12,
    },
    {
      key: "platform-incident",
      actorId: context.users.luis,
      action: "platform.incident.resolve",
      resourceType: "PlatformIncident",
      resourceId: incidentId,
      changes: { status: "RESOLVED" },
      age: 28,
    },
  ];
  for (const item of auditEvents) {
    const id = seedId(`audit:${item.key}`);
    await db.auditEvent.upsert({
      where: { id },
      update: {
        actorId: item.actorId,
        action: item.action,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        outcome: "SUCCESS",
        changes: item.changes,
        createdAt: daysAgo(item.age),
      },
      create: {
        id,
        organizationId,
        actorId: item.actorId,
        action: item.action,
        resourceType: item.resourceType,
        resourceId: item.resourceId,
        outcome: "SUCCESS",
        changes: item.changes,
        correlationId: seedId(`audit-correlation:${item.key}`),
        createdAt: daysAgo(item.age),
      },
    });
  }

  await db.job.upsert({
    where: { id: seedId("job:scheduled-trigger-scan") },
    update: { status: "SUCCEEDED", attempts: 1, lastError: null },
    create: {
      id: seedId("job:scheduled-trigger-scan"),
      organizationId,
      type: "automation.scheduled_scan",
      payload: { source: "demo-seed" },
      status: "SUCCEEDED",
      runAt: daysAgo(1),
      attempts: 1,
      correlationId: seedId("correlation:scheduled-trigger-scan"),
      createdAt: daysAgo(1),
    },
  });
}
