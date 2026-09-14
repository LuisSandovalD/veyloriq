import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import { assertSameOrigin, handleRouteError, jsonError, requestId } from "@/shared/http";

const taskFields = {
  title: z.string().trim().min(1).max(160),
  description: z.string().trim().max(2000).optional(),
  assigneeId: z.string().cuid().optional().nullable(),
  priority: z.enum(["LOW", "MEDIUM", "HIGH", "URGENT"]),
  dueAt: z.string().datetime().optional().nullable(),
  resourceType: z.string().trim().max(80).optional().nullable(),
  resourceId: z.string().trim().max(120).optional().nullable(),
};

const actionSchema = z.discriminatedUnion("action", [
  z.object({ action: z.literal("create"), ...taskFields }),
  z.object({
    action: z.literal("update"),
    taskId: z.string().cuid(),
    title: taskFields.title.optional(),
    description: taskFields.description,
    assigneeId: taskFields.assigneeId,
    priority: taskFields.priority.optional(),
    dueAt: taskFields.dueAt,
    resourceType: taskFields.resourceType,
    resourceId: taskFields.resourceId,
    status: z.enum(["OPEN", "IN_PROGRESS", "DONE", "CANCELLED"]).optional(),
  }),
  z.object({ action: z.literal("comment"), taskId: z.string().cuid(), body: z.string().trim().min(1).max(2000) }),
]);

async function validAssignee(organizationId: string, assigneeId: string | null | undefined) {
  if (!assigneeId) return true;
  return Boolean(await getDb().membership.findFirst({
    where: { organizationId, userId: assigneeId, status: "ACTIVE" },
    select: { id: true },
  }));
}

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("tasks.read", request.headers.get("x-organization-id") ?? undefined);
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const taskId = z.string().cuid().optional().parse(request.nextUrl.searchParams.get("taskId") || undefined);
    const query = (request.nextUrl.searchParams.get("q") ?? "").trim().slice(0, 100);
    const page = z.coerce.number().int().min(1).default(1).parse(request.nextUrl.searchParams.get("page") ?? "1");
    const db = getDb();
    const members = await db.membership.findMany({
      where: { organizationId, status: "ACTIVE" },
      select: { user: { select: { id: true, displayName: true, email: true } } },
      orderBy: { joinedAt: "asc" },
    });
    if (taskId) {
      const task = await db.task.findUnique({
        where: { organizationId_id: { organizationId, id: taskId } },
        include: {
          assignee: { select: { id: true, displayName: true, email: true } },
          createdBy: { select: { id: true, displayName: true } },
          comments: { include: { author: { select: { displayName: true } } }, orderBy: { createdAt: "asc" }, take: 100 },
          events: { include: { actor: { select: { displayName: true } } }, orderBy: { createdAt: "desc" }, take: 100 },
        },
      });
      if (!task) return jsonError({ code: "NOT_FOUND", message: "Tarea no encontrada." }, id);
      return NextResponse.json({ task, members: members.map((item) => item.user) }, { headers: { "x-request-id": id, "cache-control": "private, no-store" } });
    }
    const pageSize = 25;
    const tasks = await db.task.findMany({
      where: { organizationId, ...(query ? { OR: [{ title: { contains: query, mode: "insensitive" } }, { description: { contains: query, mode: "insensitive" } }] } : {}) },
      include: { assignee: { select: { id: true, displayName: true } }, _count: { select: { comments: true } } },
      orderBy: [{ status: "asc" }, { dueAt: "asc" }, { createdAt: "desc" }],
      skip: (page - 1) * pageSize,
      take: pageSize + 1,
    });
    const hasMore = tasks.length > pageSize;
    return NextResponse.json({ data: tasks.slice(0, pageSize), members: members.map((item) => item.user), pagination: { page, pageSize, hasMore } }, { headers: { "x-request-id": id, "cache-control": "private, no-store" } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request)) return jsonError({ code: "FORBIDDEN", message: "Origen de solicitud no permitido." }, id);
    const input = actionSchema.parse(await request.json());
    const context = await requirePermission("tasks.write", request.headers.get("x-organization-id") ?? undefined);
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    if ("assigneeId" in input && !await validAssignee(organizationId, input.assigneeId))
      return jsonError({ code: "VALIDATION", message: "El responsable no pertenece a la organización." }, id);
    const db = getDb();
    if (input.action === "create") {
      const task = await db.$transaction(async (tx) => {
        const created = await tx.task.create({ data: {
          organizationId,
          createdById: context.value.userId,
          title: input.title,
          description: input.description || null,
          assigneeId: input.assigneeId || null,
          priority: input.priority,
          dueAt: input.dueAt ? new Date(input.dueAt) : null,
          resourceType: input.resourceType || null,
          resourceId: input.resourceId || null,
        } });
        await Promise.all([
          tx.taskEvent.create({ data: { organizationId, taskId: created.id, actorId: context.value.userId, action: "CREATED", changes: input } }),
          tx.auditEvent.create({ data: { organizationId, actorId: context.value.userId, action: "task.create", resourceType: "Task", resourceId: created.id, outcome: "SUCCESS", changes: input, correlationId: id } }),
          tx.outboxEvent.create({ data: { organizationId, topic: "task.created", aggregateType: "Task", aggregateId: created.id, payload: { taskId: created.id, title: created.title, assigneeId: created.assigneeId }, correlationId: id } }),
        ]);
        return created;
      });
      return NextResponse.json({ task }, { status: 201, headers: { "x-request-id": id } });
    }
    const existing = await db.task.findUnique({ where: { organizationId_id: { organizationId, id: input.taskId } } });
    if (!existing) return jsonError({ code: "NOT_FOUND", message: "Tarea no encontrada." }, id);
    if (input.action === "comment") {
      const comment = await db.$transaction(async (tx) => {
        const created = await tx.taskComment.create({ data: { organizationId, taskId: input.taskId, authorId: context.value.userId, body: input.body } });
        await Promise.all([
          tx.taskEvent.create({ data: { organizationId, taskId: input.taskId, actorId: context.value.userId, action: "COMMENTED" } }),
          tx.auditEvent.create({ data: { organizationId, actorId: context.value.userId, action: "task.comment", resourceType: "Task", resourceId: input.taskId, outcome: "SUCCESS", correlationId: id } }),
        ]);
        return created;
      });
      return NextResponse.json({ comment }, { status: 201, headers: { "x-request-id": id } });
    }
    const changes = {
      ...(input.title !== undefined ? { title: input.title } : {}),
      ...(input.description !== undefined ? { description: input.description || null } : {}),
      ...(input.assigneeId !== undefined ? { assigneeId: input.assigneeId || null } : {}),
      ...(input.priority !== undefined ? { priority: input.priority } : {}),
      ...(input.dueAt !== undefined ? { dueAt: input.dueAt ? new Date(input.dueAt) : null } : {}),
      ...(input.resourceType !== undefined ? { resourceType: input.resourceType || null } : {}),
      ...(input.resourceId !== undefined ? { resourceId: input.resourceId || null } : {}),
      ...(input.status !== undefined ? { status: input.status } : {}),
    };
    const task = await db.$transaction(async (tx) => {
      const updated = await tx.task.update({ where: { organizationId_id: { organizationId, id: input.taskId } }, data: changes });
      await Promise.all([
        tx.taskEvent.create({ data: { organizationId, taskId: input.taskId, actorId: context.value.userId, action: "UPDATED", changes: input } }),
        tx.auditEvent.create({ data: { organizationId, actorId: context.value.userId, action: "task.update", resourceType: "Task", resourceId: input.taskId, outcome: "SUCCESS", changes: input, correlationId: id } }),
      ]);
      return updated;
    });
    return NextResponse.json({ task }, { headers: { "x-request-id": id } });
  } catch (error) {
    return handleRouteError(error, id);
  }
}
