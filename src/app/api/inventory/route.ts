import { NextResponse, type NextRequest } from "next/server";
import { z } from "zod";
import { requirePermission } from "@/modules/identity/application/auth";
import { getDb } from "@/shared/database";
import { handleRouteError, jsonError, requestId } from "@/shared/http";

export async function GET(request: NextRequest) {
  const id = requestId(request);
  try {
    const context = await requirePermission("inventory.read");
    if (!context.ok) return jsonError(context.error, id);
    const organizationId = context.value.organizationId;
    const page = z.coerce.number().int().min(1).default(1).parse(request.nextUrl.searchParams.get("page") ?? "1");
    const productId = z.string().cuid().optional().parse(request.nextUrl.searchParams.get("productId") || undefined);
    const warehouseId = z.string().cuid().optional().parse(request.nextUrl.searchParams.get("warehouseId") || undefined);
    const db = getDb();
    const [stock, movements, products, warehouses] = await Promise.all([
      db.stock.findMany({ where: { organizationId, ...(productId ? { productId } : {}), ...(warehouseId ? { warehouseId } : {}) }, include: { product: { select: { id: true, sku: true, name: true, minimumStock: true } }, warehouse: { select: { id: true, code: true, name: true } } }, orderBy: { updatedAt: "desc" }, take: 100 }),
      db.stockMovement.findMany({ where: { organizationId, ...(productId ? { productId } : {}), ...(warehouseId ? { warehouseId } : {}) }, include: { product: { select: { sku: true, name: true } }, warehouse: { select: { code: true, name: true } } }, orderBy: { createdAt: "desc" }, take: 50, skip: (page - 1) * 50 }),
      db.product.findMany({ where: { organizationId, active: true, kind: "PRODUCT" }, select: { id: true, sku: true, name: true }, orderBy: { name: "asc" } }),
      db.warehouse.findMany({ where: { organizationId, active: true }, select: { id: true, code: true, name: true }, orderBy: { name: "asc" } }),
    ]);
    const alerts = stock.filter((item) => Number(item.physical) - Number(item.reserved) <= Number(item.product.minimumStock));
    return NextResponse.json({ stock, movements, products, warehouses, alerts, page }, { headers: { "x-request-id": id, "cache-control": "private, no-store" } });
  } catch (error) { return handleRouteError(error, id); }
}
