import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

// NestJS + Vitest : swc est requis pour émettre les métadonnées de décorateurs
// (esbuild, le transformeur par défaut de Vitest, ne le fait pas).
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["src/**/*.spec.ts"]
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
