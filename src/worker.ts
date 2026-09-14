import "dotenv/config";
import { Prisma } from "@/generated/prisma/client";
import { setTimeout as delay } from "node:timers/promises";
import { getDb } from "@/shared/database";
import { sendTransactionalEmail as sendProviderEmail } from "@/modules/notifications/infrastructure/brevo";
import { mercadoPagoRequest } from "@/modules/billing/infrastructure/mercadopago";
import {
  deletePrivate,
  privateDownloadUrl,
  uploadPrivate,
} from "@/modules/documents/infrastructure/cloudinary-storage";
import {
  encodeReport,
  loadReport,
  type ReportFormat,
  type ReportName,
} from "@/modules/reporting/application/report-export";
import {
  reservePlanUsage,
  settleReservedPlanUsage,
} from "@/modules/billing/application/limits";
import { opportunityStagesFromSettings } from "@/modules/crm/domain/opportunity-stages";

type JsonMap = Record<string, unknown>;
type ProviderSubscription = {
  id: string;
  status: string;
  external_reference?: string;
  next_payment_date?: string;
};
let activeOutbox: { id: string; organizationId: string | null } | undefined;

function automationMatches(conditions: unknown, payload: unknown): boolean {
  if (
    !conditions ||
    typeof conditions !== "object" ||
    !payload ||
    typeof payload !== "object"
  )
    return true;
  const condition = conditions as JsonMap;
  const field = String(condition.field ?? "");
  if (!field) return true;
  const actual = (payload as JsonMap)[field];
  const expected = condition.value;
  switch (String(condition.operator ?? "equals")) {
    case "not_equals":
      return String(actual ?? "") !== String(expected ?? "");
    case "contains":
      return String(actual ?? "")
        .toLowerCase()
        .includes(String(expected ?? "").toLowerCase());
    case "greater_than":
      return Number(actual) > Number(expected);
    case "less_than":
      return Number(actual) < Number(expected);
    case "equals":
      return String(actual ?? "") === String(expected ?? "");
    default:
      return false;
  }
}

async function sendTransactionalEmail(input: {
  to: string;
  name?: string;
  subject: string;
  html: string;
}) {
  const organizationId = activeOutbox?.organizationId;
  let reserved = false;
  if (organizationId) {
    const result = await reservePlanUsage(
      organizationId,
      "emails_sent",
      "emailsPerMonth",
    );
    if (!result.ok) throw new Error(result.error.message);
    reserved = true;
  }
  try {
    const response = await sendProviderEmail({
      ...input,
      outboxEventId: activeOutbox?.id,
    });
    if (activeOutbox)
      await getDb().emailDelivery.upsert({
        where: { outboxEventId: activeOutbox.id },
        update: {
          providerMessageId: response.messageId,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
        create: {
          organizationId: activeOutbox.organizationId,
          outboxEventId: activeOutbox.id,
          recipient: input.to,
          subject: input.subject,
          providerMessageId: response.messageId,
          status: "ACCEPTED",
          acceptedAt: new Date(),
        },
      });
    if (organizationId && reserved)
      await settleReservedPlanUsage(organizationId, "emails_sent", 1, true);
    return response;
  } catch (error) {
    if (organizationId && reserved)
      await settleReservedPlanUsage(
        organizationId,
        "emails_sent",
        1,
        false,
      ).catch(() => undefined);
    throw error;
  }
}

async function runAutomations(event: {
  id: string;
  organizationId: string | null;
  topic: string;
  payload: unknown;
  correlationId: string;
}) {
  if (!event.organizationId) return;
  const organizationId = event.organizationId;
  const organization = await getDb().organization.findUnique({
    where: { id: organizationId },
    select: { status: true, settings: true },
  });
  if (organization?.status !== "ACTIVE") return;
  const triggerAliases: Record<string, string> = {
    "leads.created": "lead.created",
    "quotes.sent": "quote.sent",
    "quote.accept": "quote.accepted",
    "quote.accepted": "quote.accepted",
    "orders.confirm": "order.confirmed",
    "order.confirm": "order.confirmed",
  };
  const trigger = triggerAliases[event.topic] ?? event.topic;
  const db = getDb();
  const automations = await db.automation.findMany({
    where: { organizationId, trigger, active: true },
  });
  for (const automation of automations) {
    const existing = await db.automationRun.findUnique({
      where: {
        organizationId_automationId_eventId: {
          organizationId,
          automationId: automation.id,
          eventId: event.id,
        },
      },
    });
    if (existing?.status === "SUCCEEDED") continue;
    const run = existing
      ? await db.automationRun.update({
        where: { id: existing.id },
        data: {
          status: "RUNNING",
          error: null,
          result: Prisma.JsonNull,
          completedAt: null,
        },
      })
      : await db.automationRun.create({
        data: {
          organizationId,
          automationId: automation.id,
          eventId: event.id,
          status: "RUNNING",
          depth: 0,
        },
      });
    try {
      await db.$transaction(async (tx) => {
        if (run.depth >= automation.maxDepth)
          throw new Error("Automation maximum depth reached");
        if (!automationMatches(automation.conditions, event.payload)) {
          await tx.automationRun.update({
            where: { id: run.id },
            data: {
              status: "SUCCEEDED",
              result: { skipped: "conditions_not_met" },
              completedAt: new Date(),
            },
          });
          return;
        }
        const actions = Array.isArray(automation.actions)
          ? (automation.actions as JsonMap[])
          : [];
        if (actions.length === 0 || actions.length > 10)
          throw new Error("Automation must contain between 1 and 10 actions");
        const results: Array<Record<string, unknown>> = [];
        for (const action of actions) {
          const type = String(action.type ?? "");
          if (type === "task.create") {
            const task = await tx.task.create({
              data: {
                organizationId,
                title: String(
                  action.title ?? `Seguimiento: ${automation.name}`,
                ).slice(0, 160),
                description: String(
                  action.description ??
                  `Creada por la automatización ${automation.name}`,
                ).slice(0, 500),
                priority: "MEDIUM",
                resourceType: String(
                  (event.payload as JsonMap)?.resourceType ?? "Event",
                ),
                resourceId:
                  String((event.payload as JsonMap)?.id ?? "") || undefined,
              },
            });
            results.push({ type, id: task.id });
          } else if (type === "notification.send") {
            const preferenceType = String(
              action.preferenceType ?? "OPERATIONS",
            );
            const members = await tx.membership.findMany({
              where: { organizationId, status: "ACTIVE" },
              select: { userId: true },
              take: 100,
            });
            const disabled = members.length
              ? await tx.notificationPreference.findMany({
                where: {
                  organizationId,
                  userId: { in: members.map((member) => member.userId) },
                  type: preferenceType,
                  channel: "IN_APP",
                  enabled: false,
                },
                select: { userId: true },
              })
              : [];
            const disabledUsers = new Set(disabled.map((item) => item.userId));
            const recipients = members.filter(
              (member) => !disabledUsers.has(member.userId),
            );
            if (recipients.length)
              await tx.notification.createMany({
                data: recipients.map((member) => ({
                  organizationId,
                  userId: member.userId,
                  type: trigger,
                  title: String(action.title ?? automation.name).slice(0, 160),
                  body: String(
                    action.body ?? "Una automatización requiere tu atención.",
                  ).slice(0, 500),
                })),
              });
            results.push({ type, recipients: recipients.length });
          } else if (type === "email.send") {
            const recipient = String(action.to ?? "");
            if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(recipient))
              throw new Error(
                "Automation email action has no authorized recipient",
              );
            await tx.outboxEvent.create({
              data: {
                organizationId,
                topic: "email.automation",
                aggregateType: "Automation",
                aggregateId: automation.id,
                payload: {
                  email: recipient,
                  subject: String(action.subject ?? automation.name),
                  body: String(action.body ?? ""),
                },
                correlationId: event.correlationId,
              },
            });
            results.push({ type, queued: true });
          } else if (type === "field.update") {
            const resourceId = String(
              (event.payload as JsonMap)?.id ??
              (event.payload as JsonMap)?.resourceId ??
              "",
            );
            if (!resourceId)
              throw new Error("Automation field update has no target resource");
            const resource = String(action.resource ?? "");
            const field = String(action.field ?? "");
            const value = String(action.value ?? "");
            let updated = 0;
            if (
              resource === "task" &&
              field === "status" &&
              ["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"].includes(value)
            )
              updated = (
                await tx.task.updateMany({
                  where: {
                    organizationId,
                    id: resourceId,
                  },
                  data: {
                    status: value as
                      "OPEN" | "IN_PROGRESS" | "DONE" | "CANCELLED",
                  },
                })
              ).count;
            else if (
              resource === "task" &&
              field === "priority" &&
              ["LOW", "MEDIUM", "HIGH", "URGENT"].includes(value)
            )
              updated = (
                await tx.task.updateMany({
                  where: {
                    organizationId,
                    id: resourceId,
                  },
                  data: { priority: value },
                })
              ).count;
            else if (
              resource === "lead" &&
              field === "status" &&
              ["NEW", "QUALIFIED", "CONVERTED", "LOST", "ARCHIVED"].includes(
                value,
              )
            )
              updated = (
                await tx.lead.updateMany({
                  where: {
                    organizationId,
                    id: resourceId,
                  },
                  data: {
                    status: value as
                      "NEW" | "QUALIFIED" | "CONVERTED" | "LOST" | "ARCHIVED",
                  },
                })
              ).count;
            else if (
              resource === "opportunity" &&
              field === "stage" &&
              opportunityStagesFromSettings(organization.settings).includes(
                value,
              )
            )
              updated = (
                await tx.opportunity.updateMany({
                  where: {
                    organizationId,
                    id: resourceId,
                  },
                  data: { stage: value },
                })
              ).count;
            else throw new Error("Automation field update is not allowed");
            if (updated !== 1)
              throw new Error("Automation field update target was not found");
            results.push({ type, resource, resourceId, field });
          } else throw new Error(`Unsupported automation action: ${type}`);
        }
        await tx.automationRun.update({
          where: { id: run.id },
          data: {
            status: "SUCCEEDED",
            result: { actions: results } as Prisma.InputJsonObject,
            completedAt: new Date(),
          },
        });
      });
    } catch (error) {
      await db.automationRun.update({
        where: { id: run.id },
        data: {
          status: "FAILED",
          error:
            error instanceof Error
              ? error.message.slice(0, 500)
              : "Unknown error",
          completedAt: new Date(),
        },
      });
      throw error;
    }
  }
}

let lastScheduledScan = 0;
let lastUsageReconciliation = 0;

async function createScheduledEvent(input: {
  deduplicationKey: string;
  organizationId: string;
  topic: string;
  aggregateType: string;
  aggregateId: string;
  payload: JsonMap;
}): Promise<boolean> {
  try {
    await getDb().outboxEvent.create({
      data: {
        ...input,
        payload: input.payload as Prisma.InputJsonObject,
        correlationId: crypto.randomUUID(),
      },
    });
    return true;
  } catch (error) {
    if (
      typeof error === "object" &&
      error &&
      "code" in error &&
      error.code === "P2002"
    )
      return false;
    throw error;
  }
}

async function processScheduledTriggers(): Promise<boolean> {
  const now = Date.now();
  if (now - lastScheduledScan < 60_000) return false;
  lastScheduledScan = now;
  const db = getDb();
  const current = new Date(now);
  const tomorrow = new Date(now + 24 * 60 * 60 * 1000);
  const day = current.toISOString().slice(0, 10);
  const [quotes, stocks, obligations] = await Promise.all([
    db.quote.findMany({
      where: {
        status: { in: ["SENT", "VIEWED"] },
        validUntil: { gt: current, lte: tomorrow },
        organization: { status: "ACTIVE" },
      },
      select: {
        id: true,
        organizationId: true,
        number: true,
        validUntil: true,
      },
      take: 100,
    }),
    db.stock.findMany({
      where: {
        product: { active: true, kind: "PRODUCT" },
        organization: { status: "ACTIVE" },
      },
      include: {
        product: { select: { minimumStock: true, name: true } },
        warehouse: { select: { name: true } },
      },
      take: 500,
    }),
    db.obligation.findMany({
      where: {
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
        dueAt: { lt: current },
        organization: { status: "ACTIVE" },
      },
      select: {
        id: true,
        organizationId: true,
        counterparty: true,
        dueAt: true,
        amount: true,
        paidAmount: true,
      },
      take: 100,
    }),
  ]);
  let created = false;
  for (const quote of quotes)
    created =
      (await createScheduledEvent({
        deduplicationKey: `quote-expiring:${quote.id}:${quote.validUntil.toISOString()}`,
        organizationId: quote.organizationId,
        topic: "quote.expiring",
        aggregateType: "Quote",
        aggregateId: quote.id,
        payload: {
          id: quote.id,
          resourceId: quote.id,
          number: quote.number,
          validUntil: quote.validUntil.toISOString(),
        },
      })) || created;
  for (const stock of stocks) {
    const available = Number(stock.physical) - Number(stock.reserved);
    if (available > Number(stock.product.minimumStock)) continue;
    created =
      (await createScheduledEvent({
        deduplicationKey: `stock-low:${stock.id}:${day}`,
        organizationId: stock.organizationId,
        topic: "stock.low",
        aggregateType: "Stock",
        aggregateId: stock.id,
        payload: {
          id: stock.id,
          resourceId: stock.id,
          productId: stock.productId,
          warehouseId: stock.warehouseId,
          product: stock.product.name,
          warehouse: stock.warehouse.name,
          available,
        },
      })) || created;
  }
  for (const obligation of obligations) {
    await db.obligation.updateMany({
      where: {
        organizationId: obligation.organizationId,
        id: obligation.id,
        status: { in: ["OPEN", "PARTIALLY_PAID"] },
      },
      data: { status: "OVERDUE" },
    });
    created =
      (await createScheduledEvent({
        deduplicationKey: `obligation-overdue:${obligation.id}`,
        organizationId: obligation.organizationId,
        topic: "obligation.overdue",
        aggregateType: "Obligation",
        aggregateId: obligation.id,
        payload: {
          id: obligation.id,
          resourceId: obligation.id,
          counterparty: obligation.counterparty,
          dueAt: obligation.dueAt.toISOString(),
          amount: obligation.amount.toString(),
          paidAmount: obligation.paidAmount.toString(),
        },
      })) || created;
  }
  created = (await reconcileUsageAndCreateAlerts(current, day)) || created;
  return created;
}

async function reconcileUsageAndCreateAlerts(
  current: Date,
  day: string,
): Promise<boolean> {
  if (current.getTime() - lastUsageReconciliation < 5 * 60_000) return false;
  lastUsageReconciliation = current.getTime();
  const db = getDb();
  const period = current.toISOString().slice(0, 7);
  const periodStart = new Date(`${period}-01T00:00:00.000Z`);
  const organizations = await db.organization.findMany({
    where: { status: "ACTIVE", subscription: { isNot: null } },
    include: { subscription: { include: { plan: true } } },
    take: 200,
  });
  let created = false;
  for (const organization of organizations) {
    if (!organization.subscription) continue;
    const organizationId = organization.id;
    const [users, products, warehouses, automations, storage, acceptedEmails] =
      await Promise.all([
        db.membership.count({
          where: { organizationId, status: "ACTIVE" },
        }),
        db.product.count({ where: { organizationId, active: true } }),
        db.warehouse.count({ where: { organizationId, active: true } }),
        db.automation.count({ where: { organizationId } }),
        db.document.aggregate({
          where: { organizationId, status: { in: ["READY", "QUARANTINED"] } },
          _sum: { size: true },
        }),
        db.emailDelivery.count({
          where: { organizationId, acceptedAt: { gte: periodStart } },
        }),
      ]);
    await db.$transaction(async (tx) => {
      for (const [metric, value, counterPeriod] of [
        ["storage_bytes", Number(storage._sum.size ?? 0n), "lifetime"],
        ["emails_sent", acceptedEmails, period],
      ] as const) {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:${metric}:${counterPeriod}`}, 0))`;
        const counter = await tx.usageCounter.findUnique({
          where: {
            organizationId_metric_period: {
              organizationId,
              metric,
              period: counterPeriod,
            },
          },
        });
        if (Number(counter?.reserved ?? 0n) !== 0) continue;
        await tx.usageCounter.upsert({
          where: {
            organizationId_metric_period: {
              organizationId,
              metric,
              period: counterPeriod,
            },
          },
          update: { value: BigInt(value) },
          create: {
            organizationId,
            metric,
            period: counterPeriod,
            value: BigInt(value),
          },
        });
      }
    });
    const counters = await db.usageCounter.findMany({
      where: {
        organizationId,
        OR: [{ period }, { metric: "storage_bytes", period: "lifetime" }],
      },
    });
    const measured = new Map(
      counters.map((counter) => [
        counter.metric,
        Number(counter.value) + Number(counter.reserved),
      ]),
    );
    const limits = organization.subscription.plan.limits as Record<
      string,
      unknown
    >;
    const values: Array<[string, string, number, number]> = [
      ["users", "Usuarios activos", users, Number(limits.users)],
      ["products", "Productos activos", products, Number(limits.products)],
      [
        "warehouses",
        "Almacenes activos",
        warehouses,
        Number(limits.warehouses),
      ],
      [
        "automations",
        "Automatizaciones",
        automations,
        Number(limits.automations),
      ],
      [
        "storage_bytes",
        "Almacenamiento",
        measured.get("storage_bytes") ?? 0,
        Number(limits.storageMB) * 1024 * 1024,
      ],
      [
        "emails_sent",
        "Correos del mes",
        measured.get("emails_sent") ?? 0,
        Number(limits.emailsPerMonth),
      ],
      [
        "api_requests",
        "Solicitudes API del mes",
        measured.get("api_requests") ?? 0,
        Number(limits.apiRequests),
      ],
      [
        "ai_requests",
        "Solicitudes de IA del mes",
        measured.get("ai_requests") ?? 0,
        Number(limits.aiRequests),
      ],
    ];
    for (const [metric, label, value, limit] of values) {
      if (!Number.isFinite(limit) || limit < 0) continue;
      const threshold = limit === 0 ? (value > 0 ? 100 : 0) : (value / limit) * 100;
      const level = threshold >= 100 ? 100 : threshold >= 80 ? 80 : 0;
      if (!level) continue;
      created =
        (await createScheduledEvent({
          deduplicationKey: `usage-threshold:${organizationId}:${period}:${metric}:${level}`,
          organizationId,
          topic: "usage.threshold",
          aggregateType: "UsageCounter",
          aggregateId: metric,
          payload: { metric, label, value, limit, level, period, day },
        })) || created;
    }
  }
  return created;
}

async function processOutbox(): Promise<boolean> {
  const db = getDb();
  const event = await db.outboxEvent.findFirst({
    where: {
      processedAt: null,
      failedAt: null,
      availableAt: { lte: new Date() },
      OR: [
        { organizationId: null },
        { organization: { status: { not: "SUSPENDED" } } },
      ],
      AND: [
        {
          OR: [
            { lockedAt: null },
            { lockedAt: { lt: new Date(Date.now() - 5 * 60_000) } },
          ],
        },
      ],
    },
    orderBy: { availableAt: "asc" },
  });
  if (!event) return false;
  const claimed = await db.outboxEvent.updateMany({
    where: { id: event.id, processedAt: null, lockedAt: event.lockedAt },
    data: { lockedAt: new Date(), attempts: { increment: 1 } },
  });
  if (claimed.count !== 1) return true;
  activeOutbox = { id: event.id, organizationId: event.organizationId };
  try {
    const payload = event.payload as JsonMap;
    if (event.topic === "email.verify") {
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new Error("APP_URL is not configured");
      await sendTransactionalEmail({
        to: String(payload.email),
        name: String(payload.name ?? ""),
        subject: "Verifica tu cuenta VEYLORIQ",
        html: `<p>Hola ${escapeHtml(String(payload.name ?? ""))},</p><p>Confirma tu correo para activar tu cuenta.</p><p><a href="${appUrl}/verify?token=${encodeURIComponent(String(payload.token))}">Verificar correo</a></p>`,
      });
    }
    if (event.topic === "email.password_reset") {
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new Error("APP_URL is not configured");
      await sendTransactionalEmail({
        to: String(payload.email),
        name: String(payload.name ?? ""),
        subject: "Restablece tu contraseña VEYLORIQ",
        html: `<p>Recibimos una solicitud para cambiar tu contraseña.</p><p><a href="${appUrl}/reset-password?token=${encodeURIComponent(String(payload.token))}">Crear nueva contraseña</a></p><p>El enlace vence en 30 minutos.</p>`,
      });
    }
    if (event.topic === "email.email_change") {
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new Error("APP_URL is not configured");
      await sendTransactionalEmail({
        to: String(payload.email),
        name: String(payload.name ?? ""),
        subject: "Confirma tu nuevo correo en VEYLORIQ",
        html: `<p>Hola ${escapeHtml(String(payload.name ?? ""))},</p><p>Confirma esta dirección como tu nuevo correo de acceso.</p><p><a href="${appUrl}/verify-email-change?token=${encodeURIComponent(String(payload.token))}">Confirmar nuevo correo</a></p><p>El enlace vence en 30 minutos.</p>`,
      });
    }
    if (event.topic === "email.email_changed") {
      await sendTransactionalEmail({
        to: String(payload.email),
        name: String(payload.name ?? ""),
        subject: "Tu correo de acceso a VEYLORIQ cambió",
        html: `<p>El correo de acceso a tu cuenta VEYLORIQ se cambió a ${escapeHtml(String(payload.newEmail))}.</p><p>Si no realizaste esta acción, contacta de inmediato al soporte de VEYLORIQ.</p>`,
      });
    }
    if (event.topic === "email.invitation") {
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new Error("APP_URL is not configured");
      await sendTransactionalEmail({
        to: String(payload.email),
        subject: `Invitación a ${escapeHtml(String(payload.organization ?? "VEYLORIQ"))}`,
        html: `<p>Te invitaron a colaborar en ${escapeHtml(String(payload.organization ?? "una organización"))}.</p><p><a href="${appUrl}/invite?token=${encodeURIComponent(String(payload.token))}">Aceptar invitación</a></p><p>El enlace vence en 7 días.</p>`,
      });
    }
    if (event.topic === "email.quote") {
      const appUrl = process.env.APP_URL;
      if (!appUrl) throw new Error("APP_URL is not configured");
      await sendTransactionalEmail({
        to: String(payload.email),
        name: String(payload.customer ?? ""),
        subject: `Cotización ${String(payload.number)}`,
        html: `<p>Hola ${escapeHtml(String(payload.customer ?? ""))},</p><p>Tu cotización ${escapeHtml(String(payload.number))} está lista.</p><p><a href="${appUrl}/q/${encodeURIComponent(String(payload.token))}">Revisar y responder</a></p>`,
      });
    }
    if (event.topic === "email.automation") {
      await sendTransactionalEmail({
        to: String(payload.email),
        subject: String(payload.subject ?? "Notificación VEYLORIQ"),
        html: `<p>${escapeHtml(String(payload.body ?? ""))}</p>`,
      });
    }
    if (event.topic === "email.contact") {
      await sendTransactionalEmail({
        to: String(payload.to),
        subject: `Contacto VEYLORIQ — ${String(payload.company ?? payload.name)}`,
        html: `<p><strong>${escapeHtml(String(payload.name))}</strong> (${escapeHtml(String(payload.email))})</p><p>${escapeHtml(String(payload.message)).replace(/\n/g, "<br>")}</p>`,
      });
    }
    if (event.topic === "usage.threshold" && event.organizationId) {
      await db.$transaction(async (tx) => {
        const alreadyDelivered = await tx.job.findUnique({
          where: { id: event.id },
        });
        if (!alreadyDelivered) {
          const members = await tx.membership.findMany({
            where: {
              organizationId: event.organizationId!,
              status: "ACTIVE",
              role: { name: { in: ["OWNER", "ADMIN"] } },
            },
            select: { userId: true },
          });
          const disabled = members.length
            ? await tx.notificationPreference.findMany({
              where: {
                organizationId: event.organizationId!,
                userId: { in: members.map((member) => member.userId) },
                type: "USAGE",
                channel: "IN_APP",
                enabled: false,
              },
              select: { userId: true },
            })
            : [];
          const disabledUsers = new Set(disabled.map((item) => item.userId));
          const recipients = members.filter(
            (member) => !disabledUsers.has(member.userId),
          );
          if (recipients.length)
            await tx.notification.createMany({
              data: recipients.map((member) => ({
                organizationId: event.organizationId!,
                userId: member.userId,
                type: "USAGE",
                title: `${String(payload.label)} al ${String(payload.level)} %`,
                body: `Consumo actual: ${String(payload.value)} de ${String(payload.limit)}. Gestiona recursos o cambia de plan antes de alcanzar el límite.`,
                resourceType: "UsageCounter",
                resourceId: String(payload.metric),
              })),
            });
          await tx.job.create({
            data: {
              id: event.id,
              organizationId: event.organizationId,
              type: "usage.alert.delivered",
              payload: { metric: String(payload.metric ?? ""), recipients: recipients.length },
              status: "SUCCEEDED",
              correlationId: event.correlationId,
            },
          });
          await tx.auditEvent.create({
            data: {
              organizationId: event.organizationId,
              actorId: "system",
              actorType: "SYSTEM",
              action: "usage.threshold.notify",
              resourceType: "UsageCounter",
              resourceId: String(payload.metric),
              outcome: "SUCCESS",
              changes: { value: Number(payload.value ?? 0), limit: Number(payload.limit ?? 0), level: Number(payload.level ?? 0) },
              correlationId: event.correlationId,
            },
          });
        }
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date(), lockedAt: null, lastError: null },
        });
      });
    }
    if (event.topic === "billing.subscription.cancel_replaced") {
      const providerId = String(payload.providerId);
      if (!providerId) throw new Error("Missing replaced provider subscription");
      await mercadoPagoRequest(
        `/preapproval/${encodeURIComponent(providerId)}`,
        {
          method: "PUT",
          body: JSON.stringify({ status: "cancelled" }),
        },
      );
      await db.$transaction(async (tx) => {
        await tx.auditEvent.create({
          data: {
            organizationId: event.organizationId,
            actorId: "system",
            actorType: "SYSTEM",
            action: "billing.replaced_subscription.cancelled",
            resourceType: "Subscription",
            resourceId: event.aggregateId,
            outcome: "SUCCESS",
            changes: { providerId, replacementProviderId: String(payload.replacementProviderId ?? "") },
            correlationId: event.correlationId,
          },
        });
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date(), lockedAt: null, lastError: null },
        });
      });
    }
    if (event.topic === "billing.subscription.update_requested") {
      const action = String(payload.action);
      const providerId = String(payload.providerId);
      if (!["cancel", "reactivate"].includes(action) || !providerId)
        throw new Error("Invalid subscription update request");
      await mercadoPagoRequest(
        `/preapproval/${encodeURIComponent(providerId)}`,
        {
          method: "PUT",
          body: JSON.stringify({
            status: action === "cancel" ? "cancelled" : "authorized",
          }),
        },
      );
      await db.$transaction(async (tx) => {
        const changed = await tx.subscription.updateMany({
          where: {
            id: event.aggregateId,
            organizationId: event.organizationId ?? undefined,
            providerId,
          },
          data: { cancelAtPeriodEnd: action === "cancel" },
        });
        if (changed.count !== 1)
          throw new Error("Subscription update target was not found");
        await tx.job.upsert({
          where: { id: event.id },
          update: {},
          create: {
            id: event.id,
            organizationId: event.organizationId,
            type: "billing.reconcile",
            payload: {
              providerId: `manual:${event.id}`,
              dataId: providerId,
              eventType: `manual.${action}`,
            },
            correlationId: event.correlationId,
          },
        });
        await tx.auditEvent.create({
          data: {
            organizationId: event.organizationId,
            actorId: "system",
            actorType: "SYSTEM",
            action: `billing.${action}.provider_accepted`,
            resourceType: "Subscription",
            resourceId: event.aggregateId,
            outcome: "SUCCESS",
            correlationId: event.correlationId,
          },
        });
        await tx.outboxEvent.update({
          where: { id: event.id },
          data: { processedAt: new Date(), lockedAt: null, lastError: null },
        });
      });
    }
    if (!event.topic.startsWith("email.")) await runAutomations(event);
    await db.outboxEvent.update({
      where: { id: event.id },
      data: { processedAt: new Date(), lockedAt: null, lastError: null },
    });
  } catch (error) {
    const attempts = event.attempts + 1;
    const terminal = attempts >= event.maxAttempts;
    const message = error instanceof Error ? error.message : "Unknown error";
    console.error(JSON.stringify({ level: "error", event: "outbox.failed", id: event.id, topic: event.topic, attempts, message }));
    await db.outboxEvent.update({
      where: { id: event.id },
      data: { lockedAt: null, failedAt: terminal ? new Date() : null, lastError: message.slice(0, 500), ...(!terminal ? { availableAt: new Date(Date.now() + Math.min(3600_000, 1000 * 2 ** attempts + Math.random() * 1000)) } : {}) },
    });
  }
  activeOutbox = undefined;
  return true;
}

async function processJob(): Promise<boolean> {
  const db = getDb();
  const job = await db.job.findFirst({
    where: {
      status: { in: ["PENDING", "RETRYING"] },
      runAt: { lte: new Date() },
      AND: [
        {
          OR: [
            { organizationId: null },
            { type: "billing.reconcile" },
            { organization: { status: { not: "SUSPENDED" } } },
          ],
        },
        {
          OR: [
            { lockedAt: null },
            { heartbeatAt: { lt: new Date(Date.now() - 5 * 60_000) } },
          ],
        },
      ],
    },
    orderBy: { runAt: "asc" },
  });
  if (!job) return false;
  const claimed = await db.job.updateMany({
    where: { id: job.id, status: job.status, lockedAt: job.lockedAt },
    data: {
      status: "RUNNING",
      lockedAt: new Date(),
      heartbeatAt: new Date(),
      attempts: { increment: 1 },
    },
  });
  if (claimed.count !== 1) return true;
  try {
    if (job.type === "billing.reconcile") {
      const payload = job.payload as JsonMap;
      const subscription = await mercadoPagoRequest<ProviderSubscription>(
        `/preapproval/${encodeURIComponent(String(payload.dataId))}`,
      );
      const organizationId = subscription.external_reference;
      const statusMap: Record<
        string,
        "ACTIVE" | "PAST_DUE" | "CANCELED" | "INCOMPLETE"
      > = {
        authorized: "ACTIVE",
        paused: "PAST_DUE",
        cancelled: "CANCELED",
        pending: "INCOMPLETE",
      };
      const normalizedStatus = statusMap[subscription.status] ?? "INCOMPLETE";
      const pending = await db.pendingSubscriptionChange.findUnique({
        where: { providerId: subscription.id },
      });
      if (organizationId) {
        await db.$transaction(async (tx) => {
          if (pending && pending.organizationId !== organizationId)
            throw new Error(
              "Provider subscription does not match the pending tenant change",
            );
          if (pending && normalizedStatus === "ACTIVE") {
            const currentSubscription = await tx.subscription.findUnique({
              where: { organizationId },
              select: { id: true, providerId: true },
            });
            await tx.subscription.update({
              where: { organizationId },
              data: {
                planId: pending.planId,
                provider: "MERCADOPAGO",
                providerId: subscription.id,
                billingCycle: pending.billingCycle,
                status: "ACTIVE",
                cancelAtPeriodEnd: false,
                graceUntil: null,
                currentPeriodEnd: subscription.next_payment_date
                  ? new Date(subscription.next_payment_date)
                  : undefined,
              },
            });
            await tx.pendingSubscriptionChange.update({
              where: { id: pending.id },
              data: { status: "APPLIED" },
            });
            if (
              currentSubscription?.providerId &&
              currentSubscription.providerId !== subscription.id
            )
              await tx.outboxEvent.create({
                data: {
                  organizationId,
                  deduplicationKey: `billing-replacement-cancel:${currentSubscription.providerId}:${subscription.id}`,
                  topic: "billing.subscription.cancel_replaced",
                  aggregateType: "Subscription",
                  aggregateId: currentSubscription.id,
                  payload: {
                    providerId: currentSubscription.providerId,
                    replacementProviderId: subscription.id,
                  },
                  correlationId: job.correlationId,
                },
              });
          } else if (pending) {
            await tx.pendingSubscriptionChange.update({
              where: { id: pending.id },
              data: {
                status:
                  normalizedStatus === "CANCELED" ? "CANCELED" : "PENDING",
              },
            });
          } else {
            const graceDays = Math.max(
              0,
              Number(process.env.BILLING_GRACE_DAYS ?? 7),
            );
            await tx.subscription.updateMany({
              where: { organizationId, providerId: subscription.id },
              data: {
                status: normalizedStatus,
                graceUntil:
                  normalizedStatus === "PAST_DUE"
                    ? new Date(Date.now() + graceDays * 86400000)
                    : null,
                currentPeriodEnd: subscription.next_payment_date
                  ? new Date(subscription.next_payment_date)
                  : undefined,
              },
            });
          }
          await tx.billingEvent.upsert({
            where: {
              providerId: `${subscription.id}:${String(payload.providerId)}`,
            },
            update: { status: normalizedStatus, payload: subscription },
            create: {
              organizationId,
              providerId: `${subscription.id}:${String(payload.providerId)}`,
              type: String(payload.eventType ?? "subscription.reconciled"),
              status: normalizedStatus,
              occurredAt: new Date(),
              payload: subscription,
            },
          });
        });
      }
      await db.webhookEvent.updateMany({
        where: {
          provider: "MERCADOPAGO",
          providerId: String(payload.providerId),
        },
        data: { processedAt: new Date() },
      });
    }
    if (job.type === "document.delete") {
      const payload = job.payload as JsonMap;
      await deletePrivate(String(payload.storageKey));
      const document = await db.document.findUnique({
        where: { id: String(payload.documentId) },
      });
      if (document)
        await db.$transaction([
          db.document.update({
            where: { id: document.id },
            data: { status: "DELETED" },
          }),
          db.usageCounter.updateMany({
            where: {
              organizationId: document.organizationId,
              metric: "storage_bytes",
              period: "lifetime",
              value: { gte: BigInt(document.size) },
            },
            data: { value: { decrement: BigInt(document.size) } },
          }),
        ]);
    }
    if (job.type === "report.export") {
      if (!job.organizationId)
        throw new Error("Report export has no organization");
      const payload = job.payload as JsonMap;
      const report = String(payload.report) as ReportName;
      const requestedFormat = String(payload.format ?? "csv") as ReportFormat;
      const format = requestedFormat === "json" ? "csv" : requestedFormat;
      const from = new Date(String(payload.from));
      const to = new Date(String(payload.to));
      const result = await loadReport(job.organizationId, report, from, to);
      const output = await encodeReport(
        result.rows,
        format,
        report,
        result.definition,
        from,
        to,
        String(payload.timeZone ?? "UTC"),
      );
      const subscription = await db.subscription.findUnique({
        where: { organizationId: job.organizationId },
        include: { plan: true },
      });
      const limits = subscription?.plan.limits as { storageMB?: number } | null;
      const usage = await db.usageCounter.findUnique({
        where: {
          organizationId_metric_period: {
            organizationId: job.organizationId,
            metric: "storage_bytes",
            period: "lifetime",
          },
        },
      });
      if (
        limits?.storageMB &&
        Number(usage?.value ?? 0n) +
        Number(usage?.reserved ?? 0n) +
        output.bytes.length >
        limits.storageMB * 1024 * 1024
      )
        throw new Error("Report export exceeds storage quota");
      const documentId = crypto.randomUUID();
      const name = `VEYLORIQ-${report}-${new Date().toISOString().slice(0, 10)}.${output.extension}`;
      const uploaded = await uploadPrivate({
        bytes: output.bytes,
        organizationId: job.organizationId,
        documentId,
        filename: name,
      });
      try {
        await db.$transaction([
          db.document.create({
            data: {
              id: documentId,
              organizationId: job.organizationId,
              name,
              mimeType: output.mimeType,
              size: uploaded.bytes,
              storageKey: uploaded.key,
              status: "READY",
              createdBy: String(payload.actorId ?? "system"),
              resourceType: "ReportExport",
              resourceId: job.id,
              expiresAt: new Date(Date.now() + 7 * 86400000),
            },
          }),
          db.usageCounter.upsert({
            where: {
              organizationId_metric_period: {
                organizationId: job.organizationId,
                metric: "storage_bytes",
                period: "lifetime",
              },
            },
            update: { value: { increment: BigInt(uploaded.bytes) } },
            create: {
              organizationId: job.organizationId,
              metric: "storage_bytes",
              period: "lifetime",
              value: BigInt(uploaded.bytes),
            },
          }),
          db.job.update({
            where: { id: job.id },
            data: { payload: { ...payload, resultDocumentId: documentId } },
          }),
          db.auditEvent.create({
            data: {
              organizationId: job.organizationId,
              actorId: String(payload.actorId ?? "system"),
              action: "report.export.complete",
              resourceType: "Document",
              resourceId: documentId,
              outcome: "SUCCESS",
              correlationId: job.correlationId,
            },
          }),
          db.job.create({
            data: {
              organizationId: job.organizationId,
              type: "document.delete",
              payload: {
                documentId,
                storageKey: uploaded.key,
                size: uploaded.bytes,
              },
              runAt: new Date(Date.now() + 7 * 86400000),
              correlationId: job.correlationId,
            },
          }),
        ]);
      } catch (error) {
        await deletePrivate(uploaded.key).catch(() => undefined);
        throw error;
      }
    }
    if (job.type === "document.scan") {
      const payload = job.payload as JsonMap;
      const document = await db.document.findFirst({
        where: { id: String(payload.documentId), status: "QUARANTINED" },
      });
      if (document) {
        const scanUrl = process.env.CLAMAV_SCAN_URL;
        if (!scanUrl) throw new Error("CLAMAV_SCAN_URL is not configured");
        const source = await fetch(
          privateDownloadUrl(document.storageKey, document.name, false),
          { signal: AbortSignal.timeout(30_000) },
        );
        if (!source.ok)
          throw new Error(`Private document fetch failed (${source.status})`);
        const scan = await fetch(scanUrl, {
          method: "POST",
          signal: AbortSignal.timeout(60_000),
          headers: {
            "content-type": "application/octet-stream",
            ...(process.env.CLAMAV_SCAN_TOKEN
              ? { authorization: `Bearer ${process.env.CLAMAV_SCAN_TOKEN}` }
              : {}),
          },
          body: Buffer.from(await source.arrayBuffer()),
        });
        if (!scan.ok)
          throw new Error(`Malware scanner rejected request (${scan.status})`);
        const result = (await scan.json()) as {
          clean?: boolean;
          threat?: string;
        };
        if (result.clean) {
          await db.document.update({
            where: { id: document.id },
            data: { status: "READY" },
          });
        } else {
          await deletePrivate(document.storageKey);
          await db.$transaction([
            db.document.update({
              where: { id: document.id },
              data: { status: "REJECTED", archivedAt: new Date() },
            }),
            db.usageCounter.updateMany({
              where: {
                organizationId: document.organizationId,
                metric: "storage_bytes",
                period: "lifetime",
                value: { gte: BigInt(document.size) },
              },
              data: { value: { decrement: BigInt(document.size) } },
            }),
            db.auditEvent.create({
              data: {
                organizationId: document.organizationId,
                actorId: "system",
                action: "document.scan.rejected",
                resourceType: "Document",
                resourceId: document.id,
                outcome: "DENIED",
                reason:
                  result.threat ??
                  "Malware scan did not mark the file as clean",
                correlationId: job.correlationId,
              },
            }),
          ]);
        }
      }
    }
    await db.job.update({
      where: { id: job.id },
      data: {
        status: "SUCCEEDED",
        lockedAt: null,
        heartbeatAt: new Date(),
        lastError: null,
      },
    });
  } catch (error) {
    const attempts = job.attempts + 1;
    await db.job.update({
      where: { id: job.id },
      data: {
        status: attempts >= job.maxAttempts ? "FAILED" : "RETRYING",
        lockedAt: null,
        lastError:
          error instanceof Error
            ? error.message.slice(0, 500)
            : "Unknown error",
        runAt: new Date(
          Date.now() +
          Math.min(3600_000, 1000 * 2 ** attempts + Math.random() * 1000),
        ),
      },
    });
  }
  return true;
}

function escapeHtml(value: string): string {
  return value.replace(
    /[&<>"']/g,
    (character) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
      character
      ] ?? character,
  );
}

export async function heartbeatOnce(): Promise<void> {
  await getDb().serviceHeartbeat.upsert({
    where: { id: "worker" },
    update: { metadata: { pid: process.pid, status: "running" } },
    create: {
      id: "worker",
      metadata: { pid: process.pid, status: "running" },
    },
  });
}

/**
 * Una pasada acotada del worker para entornos serverless (Vercel Cron).
 * Procesa como máximo `budget` unidades de trabajo y retorna cuántas hizo.
 * Es idempotente gracias a los locks/claims existentes en cada procesador.
 */
export async function runWorkerOnce(budget = 25): Promise<{ worked: number }> {
  let worked = 0;
  await heartbeatOnce();
  for (let i = 0; i < budget; i += 1) {
    const results = await Promise.all([
      processScheduledTriggers(),
      processOutbox(),
      processJob(),
    ]);
    const didWork = results.filter(Boolean).length;
    if (didWork === 0) break;
    worked += didWork;
  }
  return { worked };
}

async function main() {
  console.info(JSON.stringify({ level: "info", event: "worker.started" }));
  let lastHeartbeat = 0;
  for (; ;) {
    if (Date.now() - lastHeartbeat >= 15_000) {
      await heartbeatOnce();
      lastHeartbeat = Date.now();
    }
    const results = await Promise.all([
      processScheduledTriggers(),
      processOutbox(),
      processJob(),
    ]);
    if (!results.some(Boolean)) await delay(1000);
  }
}

const isWorkerEntrypoint =
  typeof process.argv[1] === "string" &&
  process.argv.some(
    (arg) =>
      arg.endsWith("src/worker.ts") ||
      arg.endsWith("src\\worker.ts") ||
      arg.endsWith("worker.ts") ||
      arg.endsWith("worker.js"),
  );

if (isWorkerEntrypoint) {
  main().catch((error: unknown) => {
    console.error(
      JSON.stringify({
        level: "fatal",
        event: "worker.crashed",
        message: error instanceof Error ? error.message : "Unknown error",
      }),
    );
    process.exitCode = 1;
  });
}
