import { defineConfig } from "vitest/config";

// Environnement node : la logique est pure (fetch injecté), Response/fetch
// sont des globaux Node 22 — pas besoin de jsdom ici.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    // ⛔ D297 — budget écrit à la valeur EN VIGUEUR (défaut de vitest), forme (b) :
    // aucun comportement ne change, la politique devient visible. Changer cette valeur
    // exige un instrument qui chronomètre la seule fonction du test (section D297) ;
    // `neutralisation/neutralize-budgets.py` prouve que cette ligne est LUE.
    testTimeout: 5_000
  }
});
