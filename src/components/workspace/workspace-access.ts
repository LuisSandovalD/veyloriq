import type { PermissionKey } from "@/modules/identity/domain/permissions";
import type { View } from "./workspace-types";

export const viewPermission: Record<View, PermissionKey | null> = {
  dashboard: "dashboard.read",
  tasks: "tasks.read",
  notifications: null,
  ai: "ai.use",
  crm: "crm.read",
  customers: "crm.read",
  leads: "crm.read",
  quotes: "quotes.read",
  orders: "sales.read",
  fulfillment: "sales.read",
  catalog: "catalog.read",
  products: "catalog.read",
  suppliers: "purchases.read",
  purchases: "purchases.read",
  warehouses: "inventory.read",
  stock: "inventory.read",
  inventory_control: "inventory.read",
  finance_control: "finance.read",
  accounts: "finance.read",
  obligations: "finance.read",
  reports: "reports.read",
  documents: "documents.read",
  automations: "automations.read",
  audit: "audit.read",
  team: "members.manage",
  roles: "roles.manage",
  organization: "organization.manage",
  security: null,
  billing: "billing.manage",
};

export function canAccessView(
  view: View,
  permissions: readonly string[] | undefined,
): boolean {
  const required = viewPermission[view];
  return required === null || Boolean(permissions?.includes(required));
}
