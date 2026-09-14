export const permissionKeys = [
  "dashboard.read", "organization.manage", "members.manage", "roles.manage",
  "crm.read", "crm.write", "catalog.read", "catalog.write", "purchases.read", "purchases.write",
  "inventory.read", "inventory.write", "quotes.read", "quotes.write", "sales.read", "sales.write",
  "finance.read", "finance.write", "documents.read", "documents.write", "tasks.read", "tasks.write",
  "automations.read", "automations.write", "reports.read", "ai.use", "audit.read", "billing.manage"
] as const;

export type PermissionKey = (typeof permissionKeys)[number];

export const systemRolePermissions: Record<string, readonly PermissionKey[]> = {
  OWNER: permissionKeys,
  ADMIN: permissionKeys.filter((key) => key !== "billing.manage"),
  MANAGER: permissionKeys.filter((key) => !["roles.manage", "billing.manage", "audit.read"].includes(key)),
  SALES: ["dashboard.read", "crm.read", "crm.write", "catalog.read", "quotes.read", "quotes.write", "sales.read", "sales.write", "tasks.read", "tasks.write", "reports.read", "ai.use"],
  FINANCE: ["dashboard.read", "crm.read", "purchases.read", "quotes.read", "sales.read", "finance.read", "finance.write", "documents.read", "documents.write", "reports.read", "ai.use"],
  WAREHOUSE: ["dashboard.read", "catalog.read", "purchases.read", "purchases.write", "inventory.read", "inventory.write", "sales.read", "sales.write", "tasks.read", "tasks.write"],
  SUPPORT: ["dashboard.read", "crm.read", "crm.write", "quotes.read", "sales.read", "tasks.read", "tasks.write"],
  VIEWER: ["dashboard.read", "crm.read", "catalog.read", "purchases.read", "inventory.read", "quotes.read", "sales.read", "finance.read", "documents.read", "tasks.read", "reports.read"]
};
