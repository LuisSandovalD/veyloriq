import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { enforcePlanLimit } from "@/modules/billing/application/limits";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import {
  assertSameOrigin,
  handleRouteError,
  jsonError,
  requestId,
} from "@/shared/http";
const update = z.object({
  action: z.literal("product.update"),
  productId: z.string().cuid(),
  name: z.string().trim().min(1).max(160),
  sku: z.string().trim().min(1).max(60),
  barcode: z.string().trim().max(80).optional(),
  description: z.string().trim().max(2000).optional(),
  unit: z.string().trim().min(1).max(30),
  categoryId: z.string().cuid().optional(),
  imageDocumentId: z.string().cuid().or(z.string().uuid()).optional(),
  kind: z.enum(["PRODUCT", "SERVICE"]),
  price: z.coerce.number().min(0),
  cost: z.coerce.number().min(0),
  taxRate: z.coerce.number().min(0).max(100),
  minimumStock: z.coerce.number().min(0),
});
const schema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("category.create"),
    name: z.string().trim().min(2).max(100),
  }),
  z.object({
    action: z.literal("category.rename"),
    categoryId: z.string().cuid(),
    name: z.string().trim().min(2).max(100),
  }),
  z.object({
    action: z.literal("product.archive"),
    productId: z.string().cuid(),
  }),
  z.object({
    action: z.literal("product.restore"),
    productId: z.string().cuid(),
  }),
  update,
]);
class CatalogFailure extends Error {
  constructor(
    readonly code: "NOT_FOUND" | "VALIDATION" | "LIMIT_EXCEEDED" | "SUSPENDED",
    message: string,
  ) {
    super(message);
  }
}
export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("catalog.read");
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const showArchived =
      request.nextUrl.searchParams.get("archived") === "true";
    const [categories, products, images] = await Promise.all([
      getDb().category.findMany({
        where: { organizationId },
        include: { _count: { select: { products: true } } },
        orderBy: { name: "asc" },
      }),
      getDb().product.findMany({
        where: { organizationId, ...(showArchived ? {} : { active: true }) },
        include: { category: true },
        orderBy: { name: "asc" },
        take: 500,
      }),
      getDb().document.findMany({
        where: {
          organizationId,
          status: "READY",
          archivedAt: null,
          mimeType: { startsWith: "image/" },
        },
        select: { id: true, name: true },
        orderBy: { createdAt: "desc" },
        take: 100,
      }),
    ]);
    return NextResponse.json(
      { categories, products, images },
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
    const context = await requirePermission("catalog.write");
    if (!context.ok) return jsonError(context.error, id);
    const input = schema.parse(await request.json());
    const organizationId = context.value.organizationId;
    const db = getDb();
    const resourceId = await db.$transaction(async (tx) => {
      let resourceId: string;
      if (input.action === "category.create") {
        resourceId = (
          await tx.category.create({
            data: { organizationId, name: input.name },
          })
        ).id;
      } else if (input.action === "category.rename") {
        const changed = await tx.category.updateMany({
          where: { organizationId, id: input.categoryId },
          data: { name: input.name },
        });
        if (!changed.count)
          throw new CatalogFailure("NOT_FOUND", "Categoría no encontrada.");
        resourceId = input.categoryId;
      } else if (input.action === "product.archive") {
        const changed = await tx.product.updateMany({
          where: { organizationId, id: input.productId, active: true },
          data: { active: false },
        });
        if (!changed.count)
          throw new CatalogFailure("NOT_FOUND", "Producto no encontrado.");
        resourceId = input.productId;
      } else if (input.action === "product.restore") {
        await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${`${organizationId}:products`}, 0))`;
        const activeProducts = await tx.product.count({
          where: { organizationId, active: true },
        });
        const limit = await enforcePlanLimit(
          organizationId,
          "products",
          activeProducts,
          1,
          tx,
        );
        if (!limit.ok)
          throw new CatalogFailure(
            limit.error.code === "SUSPENDED"
              ? "SUSPENDED"
              : "LIMIT_EXCEEDED",
            limit.error.message,
          );
        const changed = await tx.product.updateMany({
          where: { organizationId, id: input.productId, active: false },
          data: { active: true },
        });
        if (!changed.count)
          throw new CatalogFailure(
            "NOT_FOUND",
            "Producto archivado no encontrado.",
          );
        resourceId = input.productId;
      } else {
        if (
          input.categoryId &&
          !(await tx.category.findUnique({
            where: {
              organizationId_id: { organizationId, id: input.categoryId },
            },
          }))
        )
          throw new CatalogFailure("VALIDATION", "Categoría inválida.");
        if (
          input.imageDocumentId &&
          !(await tx.document.findFirst({
            where: {
              organizationId,
              id: input.imageDocumentId,
              status: "READY",
              mimeType: { startsWith: "image/" },
            },
          }))
        )
          throw new CatalogFailure("VALIDATION", "Imagen inválida.");
        const { id: ignore, ...data } = input as typeof input & { id?: string };
        void ignore;
        await tx.product.update({
          where: { organizationId_id: { organizationId, id: input.productId } },
          data: {
            name: data.name,
            sku: data.sku,
            barcode: data.barcode || null,
            description: data.description || null,
            unit: data.unit,
            categoryId: data.categoryId || null,
            imageDocumentId: data.imageDocumentId || null,
            kind: data.kind,
            price: data.price,
            cost: data.cost,
            taxRate: data.taxRate,
            minimumStock: data.minimumStock,
          },
        });
        resourceId = input.productId;
      }
      await tx.auditEvent.create({
        data: {
          organizationId,
          actorId: context.value.userId,
          action: input.action,
          resourceType: input.action.startsWith("category")
            ? "Category"
            : "Product",
          resourceId,
          outcome: "SUCCESS",
          changes: input,
          correlationId: id,
        },
      });
      await tx.outboxEvent.create({
        data: {
          organizationId,
          topic: input.action,
          aggregateType: input.action.startsWith("category")
            ? "Category"
            : "Product",
          aggregateId: resourceId,
          payload: { id: resourceId },
          correlationId: id,
        },
      });
      return resourceId;
    });
    return NextResponse.json(
      { data: { id: resourceId } },
      { headers: { "x-request-id": id } },
    );
  } catch (error) {
    if (error instanceof CatalogFailure)
      return jsonError({ code: error.code, message: error.message }, id);
    return handleRouteError(error, id);
  }
}
