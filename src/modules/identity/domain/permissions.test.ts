import { describe, expect, it } from "vitest";
import { permissionKeys, systemRolePermissions } from "./permissions";

describe("RBAC defaults", () => {
  it("grants every permission only to the owner", () => {
    expect(systemRolePermissions.OWNER).toEqual(permissionKeys);
    expect(systemRolePermissions.VIEWER).not.toContain("catalog.write");
    expect(systemRolePermissions.ADMIN).not.toContain("billing.manage");
  });

  it("does not grant finance writes to sales", () => {
    expect(systemRolePermissions.SALES).not.toContain("finance.write");
  });
});
