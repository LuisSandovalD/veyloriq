import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import type { Prisma } from "@/generated/prisma/client";
import { opportunityStagesFromSettings } from "@/modules/crm/domain/opportunity-stages";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const entitySchema = z.enum([
  "customers",
  "contacts",
  "leads",
  "opportunities",
  "activities",
]);
const baseText = z.string().trim().min(1).max(160);
const mutationSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("contact.create"),
    customerId: z.string().cuid(),
    name: baseText,
    email: z.string().email().optional().or(z.literal("")),
    phone: z.string().max(40).optional(),
    title: z.string().max(100).optional(),
  }),
  z.object({
    action: z.literal("opportunity.create"),
    customerId: z.string().cuid().optional(),
    title: baseText,
    stage: z.string().trim().min(1).max(60),
    value: z.coerce.number().min(0),
    currency: z.enum(["PEN", "USD", "EUR"]),
    probability: z.coerce.number().int().min(0).max(100),
    expectedClose: z.string().datetime().optional(),
  }),
  z.object({
    action: z.literal("activity.create"),
    type: z.enum(["CALL", "EMAIL", "MEETING", "NOTE", "FOLLOW_UP"]),
    subject: baseText,
    body: z.string().trim().max(2000).optional(),
    resourceType: z.enum(["Customer", "Lead", "Opportunity"]),
    resourceId: z.string().cuid(),
  }),
  z.object({
    action: z.literal("lead.convert"),
    leadId: z.string().cuid(),
    createOpportunity: z.boolean().default(true),
    opportunityTitle: z.string().trim().max(160).optional(),
    value: z.coerce.number().min(0).default(0),
  }),
  z.object({
    action: z.literal("opportunity.move"),
    opportunityId: z.string().cuid(),
    stage: z.string().regex(/^[A-Z][A-Z0-9_]{1,39}$/),
    probability: z.coerce.number().int().min(0).max(100),
  }),
  z.object({ action: z.literal("lead.archive"), leadId: z.string().cuid() }),
  z.object({
    action: z.literal("lead.assign"),
    leadId: z.string().cuid(),
    ownerId: z.string().cuid().nullable(),
  }),
  z.object({
    action: z.literal("opportunity.assign"),
    opportunityId: z.string().cuid(),
    ownerId: z.string().cuid().nullable(),
  }),
]);

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("crm.read");
    if (!context.ok) return jsonError(context.error, id);
    const entity = entitySchema.parse(
      request.nextUrl.searchParams.get("entity") ?? "opportunities",
    );
    const query = (request.nextUrl.searchParams.get("q") ?? "")
      .trim()
      .slice(0, 100);
    const page = z.coerce
      .number()
      .int()
      .min(1)
      .default(1)
      .parse(request.nextUrl.searchParams.get("page") ?? "1");
    const organizationId = context.value.organizationId;
    const db = getDb();
    const pagination = { take: 30, skip: (page - 1) * 30 };
    let data: unknown;
    if (entity === "customers")
      data = await db.customer.findMany({
        where: {
          organizationId,
          archivedAt: null,
          ...(query ? { name: { contains: query, mode: "insensitive" } } : {}),
        },
        include: {
          contacts: true,
          opportunities: { orderBy: { updatedAt: "desc" }, take: 5 },
        },
        ...pagination,
        orderBy: { updatedAt: "desc" },
      });
    else if (entity === "contacts")
      data = await db.contact.findMany({
        where: {
          organizationId,
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { email: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        include: { customer: { select: { name: true } } },
        ...pagination,
        orderBy: { name: "asc" },
      });
    else if (entity === "leads")
      data = await db.lead.findMany({
        where: {
          organizationId,
          status: { not: "ARCHIVED" },
          ...(query
            ? {
                OR: [
                  { name: { contains: query, mode: "insensitive" } },
                  { company: { contains: query, mode: "insensitive" } },
                ],
              }
            : {}),
        },
        ...pagination,
        orderBy: { updatedAt: "desc" },
      });
    else if (entity === "opportunities")
      data = await db.opportunity.findMany({
        where: {
          organizationId,
          ...(query ? { title: { contains: query, mode: "insensitive" } } : {}),
        },
        include: { customer: { select: { name: true } } },
        ...pagination,
        orderBy: [{ stage: "asc" }, { updatedAt: "desc" }],
      });
    else
      data = await db.activity.findMany({
        where: {
          organizationId,
          ...(query
            ? { subject: { contains: query, mode: "insensitive" } }
            : {}),
        },
        ...pagination,
        orderBy: { occurredAt: "desc" },
      });
    const [organization, customers, leads, opportunities, members] =
      await Promise.all([
        db.organization.findUnique({
          where: { id: organizationId },
          select: { settings: true },
        }),
        db.customer.findMany({
          where: { organizationId, archivedAt: null },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take: 200,
        }),
        db.lead.findMany({
          where: { organizationId, status: { not: "ARCHIVED" } },
          select: { id: true, name: true },
          orderBy: { name: "asc" },
          take: 200,
        }),
        db.opportunity.findMany({
          where: { organizationId },
          select: { id: true, title: true },
          orderBy: { title: "asc" },
          take: 200,
        }),
        db.membership.findMany({
          where: { organizationId, status: "ACTIVE" },
          select: {
            user: { select: { id: true, displayName: true, email: true } },
          },
          orderBy: { joinedAt: "asc" },
          take: 200,
        }),
      ]);
    return NextResponse.json(
      {
        data,
        page,
        stages: opportunityStagesFromSettings(organization?.settings),
        references: {
          customers,
          leads,
          opportunities,
          members: members.map((membership) => membership.user),
        },
      },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen no permitido." },
        id,
      );
    const context = await requirePermission("crm.write");
    if (!context.ok) return jsonError(context.error, id);
    const input = mutationSchema.parse(await request.json());
    const organizationId = context.value.organizationId;
    const db = getDb();
    const organization = await db.organization.findUnique({
      where: { id: organizationId },
      select: { settings: true },
    });
    const stages = opportunityStagesFromSettings(organization?.settings);
    if (
      (input.action === "opportunity.create" ||
        input.action === "opportunity.move") &&
      !stages.includes(input.stage)
    ) {
      return jsonError(
        {
          code: "VALIDATION",
          message: "La etapa no pertenece al pipeline configurado.",
        },
        id,
      );
    }
    const result = await db.$transaction(async (tx) => {
      let output: { id: string; [key: string]: unknown };
      if (input.action === "contact.create") {
        const customer = await tx.customer.findUnique({
          where: {
            organizationId_id: { organizationId, id: input.customerId },
          },
        });
        if (!customer || customer.archivedAt)
          throw new Error("CUSTOMER_NOT_FOUND");
        if (input.email) {
          const duplicate = await tx.contact.findFirst({
            where: {
              organizationId,
              email: { equals: input.email, mode: "insensitive" },
            },
          });
          if (duplicate) throw new Error("DUPLICATE_CONTACT");
        }
        output = await tx.contact.create({
          data: {
            organizationId,
            customerId: input.customerId,
            name: input.name,
            email: input.email || null,
            phone: input.phone || null,
            title: input.title || null,
          },
        });
      } else if (input.action === "opportunity.create") {
        if (
          input.customerId &&
          !(await tx.customer.findUnique({
            where: {
              organizationId_id: { organizationId, id: input.customerId },
            },
          }))
        )
          throw new Error("CUSTOMER_NOT_FOUND");
        output = await tx.opportunity.create({
          data: {
            organizationId,
            customerId: input.customerId,
            title: input.title,
            stage: input.stage,
            value: input.value,
            currency: input.currency,
            probability: input.probability,
            expectedClose: input.expectedClose
              ? new Date(input.expectedClose)
              : null,
            ownerId: context.value.userId,
          },
        });
      } else if (input.action === "activity.create") {
        const resourceExists =
          input.resourceType === "Customer"
            ? await tx.customer.findUnique({
                where: {
                  organizationId_id: {
                    organizationId,
                    id: input.resourceId,
                  },
                },
              })
            : input.resourceType === "Lead"
              ? await tx.lead.findUnique({
                  where: {
                    organizationId_id: {
                      organizationId,
                      id: input.resourceId,
                    },
                  },
                })
              : await tx.opportunity.findUnique({
                  where: {
                    organizationId_id: {
                      organizationId,
                      id: input.resourceId,
                    },
                  },
                });
        if (!resourceExists) throw new Error("CRM_RESOURCE_NOT_FOUND");
        output = await tx.activity.create({
          data: {
            organizationId,
            actorId: context.value.userId,
            type: input.type,
            subject: input.subject,
            body: input.body || null,
            resourceType: input.resourceType,
            resourceId: input.resourceId,
          },
        });
      } else if (input.action === "lead.convert") {
        const lead = await tx.lead.findUnique({
          where: { organizationId_id: { organizationId, id: input.leadId } },
        });
        if (!lead || !["NEW", "QUALIFIED"].includes(lead.status))
          throw new Error("LEAD_UNAVAILABLE");
        const duplicate = lead.email
          ? await tx.customer.findFirst({
              where: {
                organizationId,
                email: { equals: lead.email, mode: "insensitive" },
                archivedAt: null,
              },
            })
          : null;
        const customer =
          duplicate ??
          (await tx.customer.create({
            data: {
              organizationId,
              name: lead.company || lead.name,
              email: lead.email,
              phone: lead.phone,
              tags: ["lead-convertido"],
            },
          }));
        const qualificationStage = stages.includes("QUALIFICATION")
          ? "QUALIFICATION"
          : stages[0];
        const opportunity = input.createOpportunity
          ? await tx.opportunity.create({
              data: {
                organizationId,
                customerId: customer.id,
                title:
                  input.opportunityTitle ||
                  `Oportunidad - ${lead.company || lead.name}`,
                stage: qualificationStage,
                value: input.value,
                currency: "PEN",
                probability: 25,
                ownerId: lead.ownerId || context.value.userId,
              },
            })
          : null;
        await tx.lead.update({
          where: { organizationId_id: { organizationId, id: lead.id } },
          data: { status: "CONVERTED", convertedAt: new Date() },
        });
        output = {
          id: customer.id,
          opportunityId: opportunity?.id,
          reusedCustomer: Boolean(duplicate),
        };
      } else if (input.action === "opportunity.move") {
        const changed = await tx.opportunity.updateMany({
          where: { organizationId, id: input.opportunityId },
          data: { stage: input.stage, probability: input.probability },
        });
        if (changed.count !== 1) throw new Error("OPPORTUNITY_NOT_FOUND");
        output = { id: input.opportunityId, stage: input.stage };
      } else if (input.action === "lead.archive") {
        const changed = await tx.lead.updateMany({
          where: {
            organizationId,
            id: input.leadId,
            status: { not: "CONVERTED" },
          },
          data: { status: "ARCHIVED" },
        });
        if (changed.count !== 1) throw new Error("LEAD_UNAVAILABLE");
        output = { id: input.leadId, status: "ARCHIVED" };
      } else {
        if (input.ownerId) {
          const membership = await tx.membership.findUnique({
            where: {
              organizationId_userId: {
                organizationId,
                userId: input.ownerId,
              },
            },
          });
          if (membership?.status !== "ACTIVE")
            throw new Error("CRM_OWNER_NOT_FOUND");
        }
        const changed =
          input.action === "lead.assign"
            ? await tx.lead.updateMany({
                where: { organizationId, id: input.leadId },
                data: { ownerId: input.ownerId },
              })
            : await tx.opportunity.updateMany({
                where: { organizationId, id: input.opportunityId },
                data: { ownerId: input.ownerId },
              });
        if (changed.count !== 1) throw new Error("CRM_RESOURCE_NOT_FOUND");
        output = {
          id:
            input.action === "lead.assign" ? input.leadId : input.opportunityId,
          ownerId: input.ownerId,
        };
      }
      await tx.activity.create({
        data: {
          organizationId,
          actorId: context.value.userId,
          type: "SYSTEM",
          subject: input.action,
          resourceType: input.action.split(".")[0],
          resourceId: output.id,
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: context.value.userId,
          action: input.action,
          resourceType: input.action.split(".")[0] ?? "crm",
          resourceId: output.id,
          outcome: "SUCCESS",
          changes: input,
          correlationId: id,
        },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId,
          topic: input.action,
          aggregateType: input.action.split(".")[0] ?? "crm",
          aggregateId: output.id,
          payload: output as Prisma.InputJsonObject,
          correlationId: id,
        },
      });
      return output;
    });
    return NextResponse.json(
      { data: result },
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (
      error instanceof Error &&
      [
        "CUSTOMER_NOT_FOUND",
        "OPPORTUNITY_NOT_FOUND",
        "CRM_RESOURCE_NOT_FOUND",
        "CRM_OWNER_NOT_FOUND",
      ].includes(error.message)
    )
      return jsonError(
        { code: "NOT_FOUND", message: "El registro solicitado no existe." },
        id,
      );
    if (error instanceof Error && error.message === "DUPLICATE_CONTACT")
      return jsonError(
        { code: "CONFLICT", message: "Ya existe un contacto con ese correo." },
        id,
      );
    if (error instanceof Error && error.message === "LEAD_UNAVAILABLE")
      return jsonError(
        {
          code: "CONFLICT",
          message: "El lead ya no está disponible para esa operación.",
        },
        id,
      );
    return handleRouteError(error, id);
  }
}
