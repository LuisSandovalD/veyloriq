import type { SeedDatabase } from "./types";

export async function verifyDemoSeed(
  db: SeedDatabase,
  organizationId: string,
) {
  const [
    users,
    customers,
    leads,
    opportunities,
    products,
    suppliers,
    warehouses,
    purchases,
    quotes,
    orders,
    stockMovements,
    obligations,
    cashMovements,
    tasks,
    automations,
    notifications,
    auditEvents,
  ] = await Promise.all([
    db.membership.count({ where: { organizationId, status: "ACTIVE" } }),
    db.customer.count({ where: { organizationId } }),
    db.lead.count({ where: { organizationId } }),
    db.opportunity.count({ where: { organizationId } }),
    db.product.count({ where: { organizationId } }),
    db.supplier.count({ where: { organizationId } }),
    db.warehouse.count({ where: { organizationId } }),
    db.purchaseOrder.count({ where: { organizationId } }),
    db.quote.count({ where: { organizationId } }),
    db.order.count({ where: { organizationId } }),
    db.stockMovement.count({ where: { organizationId } }),
    db.obligation.count({ where: { organizationId } }),
    db.cashMovement.count({ where: { organizationId } }),
    db.task.count({ where: { organizationId } }),
    db.automation.count({ where: { organizationId } }),
    db.notification.count({ where: { organizationId } }),
    db.auditEvent.count({ where: { organizationId } }),
  ]);

  const superuser = await db.user.findUnique({
    where: { email: "2301080307@undc.edu.pe" },
    select: { platformRole: true },
  });
  if (superuser?.platformRole !== "PLATFORM_SUPERUSER") {
    throw new Error("Luis no quedó configurado como PLATFORM_SUPERUSER.");
  }
  if (users < 4 || customers < 4 || products < 5 || quotes < 4 || orders < 3) {
    throw new Error("El conjunto de demostración quedó incompleto.");
  }

  return {
    users,
    customers,
    leads,
    opportunities,
    products,
    suppliers,
    warehouses,
    purchases,
    quotes,
    orders,
    stockMovements,
    obligations,
    cashMovements,
    tasks,
    automations,
    notifications,
    auditEvents,
  };
}

