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
    include: ["src/**/*.spec.ts", "prisma/**/*.spec.ts"]
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
