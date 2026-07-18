import { resolve } from "node:path";
import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    // Les tests exercent la SOURCE des packages du workspace. @zwadj/types a
    // main → dist (requis pour le runtime NestJS) ; sans cet alias, Vitest le
    // résout vers un dist absent dès qu'aucun build n'a été fait. Les autres
    // packages (@zwadj/ui, @zwadj/api-client, @zwadj/i18n) ont déjà main → src.
    alias: { "@zwadj/types": resolve(__dirname, "../../packages/types/src/index.ts") }
  },
  plugins: [react()],
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true
  }
});
