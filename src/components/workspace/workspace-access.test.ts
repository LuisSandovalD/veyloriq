import { describe, expect, it } from "vitest";
import { systemRolePermissions } from "@/modules/identity/domain/permissions";
import { groups } from "./workspace-groups";
import { canAccessView } from "./workspace-access";
import type { View } from "./workspace-types";

function visibleViews(role: keyof typeof systemRolePermissions): View[] {
  const permissions = systemRolePermissions[role];
  return groups.flatMap((group) =>
    group.items
      .map(([view]) => view)
      .filter((view) => canAccessView(view, permissions)),
  );
}

describe("workspace navigation permissions", () => {
  it("hides billing from ADMIN while preserving administration modules", () => {
    const views = visibleViews("ADMIN");
    expect(views).toContain("team");
    expect(views).toContain("roles");
    expect(views).toContain("organization");
    expect(views).not.toContain("billing");
  });

  it("shows only commercial capabilities to SALES", () => {
    const views = visibleViews("SALES");
    expect(views).toEqual([
      "dashboard",
      "tasks",
      "notifications",
      "ai",
      "crm",
      "customers",
      "leads",
      "quotes",
      "orders",
      "fulfillment",
      "catalog",
      "products",
      "reports",
      "security",
    ]);
  });

  it("shows operational capabilities to WAREHOUSE", () => {
    const views = visibleViews("WAREHOUSE");
    expect(views).toEqual([
      "dashboard",
      "tasks",
      "notifications",
      "orders",
      "fulfillment",
      "catalog",
      "products",
      "suppliers",
      "purchases",
      "warehouses",
      "stock",
      "inventory_control",
      "security",
    ]);
  });
});
