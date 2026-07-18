/// <reference types="vitest/config" />
import { resolve } from "node:path";
import { defineConfig } from "vite";
import react from "@vitejs/plugin-react";

export default defineConfig({
  resolve: {
    // Idem apps/api : @zwadj/types a main → dist (runtime NestJS), donc on force
    // la source ici, pour le build ET les tests. Les autres packages ont déjà
    // main → src. Ne PAS aliaser @zwadj/ui : une clé string matche aussi les
    // sous-chemins et casserait @zwadj/ui/styles.css.
    alias: { "@zwadj/types": resolve(__dirname, "../../packages/types/src/index.ts") }
  },
  plugins: [react()],
  server: { port: 5173 },
  test: {
    environment: "jsdom",
    setupFiles: ["./src/test-setup.ts"],
    globals: true
  }
});
