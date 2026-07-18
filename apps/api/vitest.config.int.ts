import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import swc from "unplugin-swc";

// Tests d'INTÉGRATION : base zwadj_test réelle (recréée par setup-global),
// app Nest complète, exécution séquentielle (état partagé de la base).
export default defineConfig({
  resolve: {
    // Les tests exercent la SOURCE des packages du workspace (pas leur dist)
    alias: { "@zwadj/types": resolve(__dirname, "../../packages/types/src/index.ts") }
  },
  test: {
    environment: "node",
    globals: true,
    include: ["test/int/**/*.int-spec.ts"],
    globalSetup: ["./test/int/setup-global.ts"],
    setupFiles: ["./test/int/setup-env.ts"],
    fileParallelism: false,
    testTimeout: 30_000,
    hookTimeout: 60_000
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
