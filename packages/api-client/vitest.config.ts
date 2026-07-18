import { defineConfig } from "vitest/config";

// Environnement node : la logique est pure (fetch injecté), Response/fetch
// sont des globaux Node 22 — pas besoin de jsdom ici.
export default defineConfig({ test: { environment: "node", globals: true } });
