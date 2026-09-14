import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  globalIgnores([".next/**", "src/generated/**", "coverage/**", "write-inventory.js"]),
  { rules: { "@typescript-eslint/no-explicit-any": "error" } },
  {
    files: ["src/modules/**/domain/**/*.ts"],
    rules: {
      "no-restricted-imports": ["error", {
        patterns: [
          { group: ["next", "next/**", "react", "react/**", "@prisma/**", "**/infrastructure/**"], message: "El dominio no puede depender de frameworks ni infraestructura." },
        ],
      }],
      "no-restricted-syntax": ["error", {
        selector: "MemberExpression[object.name='process'][property.name='env']",
        message: "El dominio no puede leer variables de entorno.",
      }],
    },
  },
]);
