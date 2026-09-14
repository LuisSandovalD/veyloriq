import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/modules/identity/application/auth";
import {
  deletePrivate,
  privateDownloadUrl,
  uploadPrivate,
} from "@/modules/documents/infrastructure/cloudinary-storage";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";

const allowedTypes = new Set([
  "application/pdf",
  "image/jpeg",
  "image/png",
  "text/csv",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
  "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
]);
const relationSchema = z
  .object({
    resourceType: z
      .enum(["Customer", "Quote", "Order", "PurchaseOrder", "Task"])
      .optional(),
    resourceId: z.string().cuid().optional(),
    replacesId: z.string().cuid().or(z.string().uuid()).optional(),
  })
  .refine(
    (value) => Boolean(value.resourceType) === Boolean(value.resourceId),
    { message: "El tipo y el ID del recurso deben enviarse juntos." },
  );
function detectedType(bytes: Buffer): string | undefined {
  if (bytes.subarray(0, 4).toString("hex") === "25504446")
    return "application/pdf";
  if (bytes.subarray(0, 3).toString("hex") === "ffd8ff") return "image/jpeg";
  if (bytes.subarray(0, 8).toString("hex") === "89504e470d0a1a0a")
    return "image/png";
  if (bytes.subarray(0, 2).toString() === "PK") return "application/zip";
  return undefined;
}

async function linkedResourceExists(
  organizationId: string,
  type: string,
  id: string,
) {
  const db = getDb();
  if (type === "Customer")
    return Boolean(
      await db.customer.findUnique({
        where: { organizationId_id: { organizationId, id } },
      }),
    );
  if (type === "Quote")
    return Boolean(
      await db.quote.findUnique({
        where: { organizationId_id: { organizationId, id } },
      }),
    );
  if (type === "Order")
    return Boolean(
      await db.order.findUnique({
        where: { organizationId_id: { organizationId, id } },
      }),
    );
  if (type === "PurchaseOrder")
    return Boolean(
      await db.purchaseOrder.findUnique({
        where: { organizationId_id: { organizationId, id } },
      }),
    );
  return Boolean(await db.task.findFirst({ where: { organizationId, id } }));
}

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("documents.read");
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const assetId =
      request.nextUrl.searchParams.get("download") ??
      request.nextUrl.searchParams.get("preview");
    if (assetId) {
      const document = await getDb().document.findFirst({
        where: {
          id: assetId,
          organizationId,
          archivedAt: null,
          OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
          status: "READY",
        },
      });
      if (!document)
        return jsonError(
          {
            code: "NOT_FOUND",
            message: "Documento no encontrado o todavía en inspección.",
          },
          id,
        );
      const preview = request.nextUrl.searchParams.has("preview");
      return NextResponse.json(
        {
          url: privateDownloadUrl(document.storageKey, document.name, !preview),
          expiresIn: 300,
        },
        {
          headers: { "x-request-id": id, "cache-control": "private, no-store" },
        },
      );
    }
    const history = request.nextUrl.searchParams.get("history");
    const documents = await getDb().document.findMany({
      where: {
        organizationId,
        ...(history ? { logicalKey: history } : { archivedAt: null }),
      },
      orderBy: [{ logicalKey: "asc" }, { version: "desc" }],
      take: 100,
    });
    return NextResponse.json(
      { data: documents },
      { headers: { "x-request-id": id, "cache-control": "private, no-store" } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}

export async function POST(request: NextRequest) {
  const id = requestId(request);
  let reservation = 0;
  let organizationId = "";
  let uploadedKey: string | undefined;
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen no permitido." },
        id,
      );
    const context = await requirePermission("documents.write");
    if (!context.ok) return jsonError(context.error, id);
    organizationId = context.value.organizationId;
    const form = await request.formData();
    const file = form.get("file");
    if (!(file instanceof File))
      return jsonError(
        { code: "VALIDATION", message: "Selecciona un archivo." },
        id,
      );
    if (file.size <= 0 || file.size > 10 * 1024 * 1024)
      return jsonError(
        {
          code: "VALIDATION",
          message: "El archivo debe pesar entre 1 byte y 10 MB.",
        },
        id,
      );
    if (!allowedTypes.has(file.type))
      return jsonError(
        { code: "VALIDATION", message: "El formato no está permitido." },
        id,
      );
    const relation = relationSchema.parse({
      resourceType: String(form.get("resourceType") ?? "") || undefined,
      resourceId: String(form.get("resourceId") ?? "") || undefined,
      replacesId: String(form.get("replacesId") ?? "") || undefined,
    });
    if (
      relation.resourceType &&
      relation.resourceId &&
      !(await linkedResourceExists(
        organizationId,
        relation.resourceType,
        relation.resourceId,
      ))
    )
      return jsonError(
        {
          code: "NOT_FOUND",
          message: "El recurso relacionado no existe en esta organización.",
        },
        id,
      );
    const bytes = Buffer.from(await file.arrayBuffer());
    const signature = detectedType(bytes);
    if (
      signature &&
      signature !== file.type &&
      !(signature === "application/zip" && file.type.includes("openxmlformats"))
    )
      return jsonError(
        {
          code: "VALIDATION",
          message: "El contenido no coincide con el tipo declarado.",
        },
        id,
      );
    if (
      file.type === "text/csv" &&
      (bytes.includes(0) || !bytes.toString("utf8").trim())
    )
      return jsonError(
        { code: "VALIDATION", message: "El CSV no contiene texto válido." },
        id,
      );
    const needsScan = file.type.includes("openxmlformats");
    if (needsScan && !process.env.CLAMAV_SCAN_URL)
      return jsonError(
        {
          code: "TECHNICAL",
          message: "La inspección de documentos Office no está configurada.",
        },
        id,
      );
    const db = getDb();
    const previous = relation.replacesId
      ? await db.document.findFirst({
          where: { id: relation.replacesId, organizationId, archivedAt: null },
        })
      : null;
    if (relation.replacesId && !previous)
      return jsonError(
        { code: "NOT_FOUND", message: "La versión anterior no existe." },
        id,
      );
    reservation = file.size;
    await db.$transaction(async (tx) => {
      await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:storage_bytes:lifetime`}, 0))`;
      const subscription = await tx.subscription.findUnique({
        where: { organizationId },
        include: { plan: true },
      });
      if (!subscription) throw new Error("STORAGE_SUBSCRIPTION");
      const limits = subscription.plan.limits as { storageMB?: number } | null;
      const usage = await tx.usageCounter.findUnique({
        where: {
          organizationId_metric_period: {
            organizationId,
            metric: "storage_bytes",
            period: "lifetime",
          },
        },
      });
      if (
        limits?.storageMB &&
        Number(usage?.value ?? 0n) + Number(usage?.reserved ?? 0n) + file.size >
          limits.storageMB * 1024 * 1024
      )
        throw new Error("STORAGE_LIMIT");
      await tx.usageCounter.upsert({
        where: {
          organizationId_metric_period: {
            organizationId,
            metric: "storage_bytes",
            period: "lifetime",
          },
        },
        update: { reserved: { increment: BigInt(file.size) } },
        create: {
          organizationId,
          metric: "storage_bytes",
          period: "lifetime",
          reserved: BigInt(file.size),
        },
      });
    });
    const documentId = crypto.randomUUID();
    const uploaded = await uploadPrivate({
      bytes,
      organizationId,
      documentId,
      filename: file.name,
    });
    uploadedKey = uploaded.key;
    const document = await db.$transaction(async (tx) => {
      const created = await tx.document.create({
        data: {
          id: documentId,
          organizationId,
          name: file.name.slice(0, 240),
          mimeType: file.type,
          size: uploaded.bytes,
          storageKey: uploaded.key,
          createdBy: context.value.userId,
          status: needsScan ? "QUARANTINED" : "READY",
          logicalKey: previous?.logicalKey ?? undefined,
          previousVersionId: previous?.id,
          version: (previous?.version ?? 0) + 1,
          resourceType: relation.resourceType ?? previous?.resourceType,
          resourceId: relation.resourceId ?? previous?.resourceId,
        },
      });
      if (previous)
        await tx.document.update({
          where: { id: previous.id },
          data: { archivedAt: new Date() },
        });
      if (needsScan)
        await tx.job.create({
          data: {
            organizationId,
            type: "document.scan",
            payload: { documentId: created.id, storageKey: created.storageKey },
            correlationId: id,
          },
        });
      await tx.usageCounter.update({
        where: {
          organizationId_metric_period: {
            organizationId,
            metric: "storage_bytes",
            period: "lifetime",
          },
        },
        data: {
          reserved: { decrement: BigInt(file.size) },
          value: { increment: BigInt(uploaded.bytes) },
        },
      });
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: context.value.userId,
          action: previous ? "document.version.create" : "document.upload",
          resourceType: "Document",
          resourceId: created.id,
          outcome: "SUCCESS",
          changes: {
            previousVersionId: previous?.id,
            resourceType: created.resourceType,
            resourceId: created.resourceId,
          },
          correlationId: id,
        },
      });
      return created;
    });
    reservation = 0;
    uploadedKey = undefined;
    return NextResponse.json(
      { data: document },
      { status: 201, headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (uploadedKey) await deletePrivate(uploadedKey).catch(() => undefined);
    if (reservation && organizationId)
      await getDb().usageCounter.updateMany({
        where: {
          organizationId,
          metric: "storage_bytes",
          period: "lifetime",
          reserved: { gte: BigInt(reservation) },
        },
        data: { reserved: { decrement: BigInt(reservation) } },
      });
    if (error instanceof Error && error.message === "STORAGE_LIMIT")
      return jsonError(
        {
          code: "LIMIT_EXCEEDED",
          message: "Alcanzaste la cuota de almacenamiento del plan.",
        },
        id,
      );
    if (error instanceof Error && error.message === "STORAGE_SUBSCRIPTION")
      return jsonError(
        {
          code: "SUSPENDED",
          message: "La organización no tiene una suscripción configurada.",
        },
        id,
      );
    return handleRouteError(error, id);
  }
}

export async function DELETE(request: NextRequest) {
  const id = requestId(request);
  try {
    if (!assertSameOrigin(request))
      return jsonError(
        { code: "FORBIDDEN", message: "Origen no permitido." },
        id,
      );
    const context = await requirePermission("documents.write");
    if (!context.ok) return jsonError(context.error, id);
    const { documentId } = z
      .object({ documentId: z.string().cuid().or(z.string().uuid()) })
      .parse(await request.json());
    const document = await getDb().document.findFirst({
      where: {
        id: documentId,
        organizationId: context.value.organizationId,
        archivedAt: null,
      },
    });
    if (!document)
      return jsonError(
        { code: "NOT_FOUND", message: "Documento no encontrado." },
        id,
      );
    await getDb().$transaction([
      getDb().document.update({
        where: { id: document.id },
        data: { status: "DELETING", archivedAt: new Date() },
      }),
      getDb().job.create({
        data: {
          organizationId: context.value.organizationId,
          type: "document.delete",
          payload: {
            documentId: document.id,
            storageKey: document.storageKey,
            size: document.size,
          },
          correlationId: id,
        },
      }),
      getDb().auditEvent.create({
        data: {
          organizationId: context.value.organizationId,
          actorId: context.value.userId,
          action: "document.delete.request",
          resourceType: "Document",
          resourceId: document.id,
          outcome: "SUCCESS",
          correlationId: id,
        },
      }),
    ]);
    return NextResponse.json(
      { accepted: true },
      { status: 202, headers: { "x-request-id": id } },
    );
  } catch (error) {
    return handleRouteError(error, id);
  }
}
