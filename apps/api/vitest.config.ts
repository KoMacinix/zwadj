import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

// NestJS + Vitest : swc est requis pour émettre les métadonnées de décorateurs
// (esbuild, le transformeur par défaut de Vitest, ne le fait pas).
export default defineConfig({
  resolve: {
    // Les tests exercent la SOURCE des packages du workspace (pas leur dist)
    alias: { "@zwadj/types": resolve(__dirname, "../../packages/types/src/index.ts") }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.spec.ts", "prisma/**/*.spec.ts"],
    // ⛔ D297 — budget écrit à la valeur EN VIGUEUR (défaut de vitest), forme (b) :
    // aucun comportement ne change, la politique devient visible. Changer cette valeur
    // exige un instrument qui chronomètre la seule fonction du test (section D297) ;
    // `neutralisation/neutralize-budgets.py` prouve que cette ligne est LUE.
    testTimeout: 5_000
  },
  plugins: [
    swc.vite({
      jsc: {
        parser: { syntax: "typescript", decorators: true },
        transform: { decoratorMetadata: true, legacyDecorator: true },
        target: "es2022"
      },
      module: { type: "es6" }
    })
  ]
});
