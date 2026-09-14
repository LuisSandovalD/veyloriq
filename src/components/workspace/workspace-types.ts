export type Resource =
  | "dashboard"
  | "customers"
  | "leads"
  | "products"
  | "suppliers"
  | "warehouses"
  | "stock"
  | "quotes"
  | "purchases"
  | "orders"
  | "accounts"
  | "obligations"
  | "tasks"
  | "automations"
  | "audit";

export type PanelView =
  | "ai"
  | "notifications"
  | "crm"
  | "catalog"
  | "fulfillment"
  | "inventory_control"
  | "finance_control"
  | "roles"
  | "documents"
  | "reports"
  | "team"
  | "security"
  | "billing"
  | "organization";

export type View = Resource | PanelView;
export type Row = Record<string, unknown>;
export type ApiResponse = {
  data: unknown;
  context: { organizationName: string; displayName: string; role: string };
  pagination?: { page: number; pageSize: number; hasMore: boolean };
};
export type Field = {
  key: string;
  label: string;
  type?: "text" | "email" | "number" | "date" | "select";
  options?: Array<{ value: string; label: string }>;
};
export type Column = { key: string; label: string };
