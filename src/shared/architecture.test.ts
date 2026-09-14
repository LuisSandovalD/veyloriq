import { readFileSync } from "node:fs";
import { globSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("hexagonal dependency direction", () => {
  it("keeps framework and infrastructure imports outside domain files", () => {
    const files = globSync("src/modules/**/domain/**/*.ts", { exclude: (path) => path.endsWith(".test.ts") });
    const forbidden = ["next/", "@prisma", "react", "process.env", "infrastructure/"];
    for (const file of files) {
      const source = readFileSync(file, "utf8");
      for (const token of forbidden) expect(source, `${file} imports ${token}`).not.toContain(token);
    }
  });
});
