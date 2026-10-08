/**
 * D326 — CONFIGURATION DES CAPTURES ET DES SONDES DU RANG 33 (pièce jetable, versée).
 *
 * Elle REPREND `e2e/playwright.config.ts` à l'identique — mêmes ports dédiés (3100, 3101, 5273), même base `zwadj_e2e`, mêmes serveurs de développement, même `globalSetup` — et
 * ne change que ce qu'elle joue : le dossier `docs/preuves/D326/navigateur/`, fichiers `*.capture.ts` (captures et sondes) et `*.e2e.ts` (la spec du lot, si elle sort de la suite).
 * Patron de `docs/preuves/D325/navigateur/playwright.capture.config.ts`. Une capture n'est pas une porte.
 *
 * Usage, depuis la racine :
 *   pnpm --filter @zwadj/e2e exec playwright test --config ../docs/preuves/D326/navigateur/playwright.capture.config.ts <fichier>
 */
import { resolve } from "node:path";
import base from "../../../../e2e/playwright.config";

const e2e = resolve(__dirname, "../../../../e2e");

export default {
  ...base,
  testDir: __dirname,
  testMatch: /.*\.(capture|e2e)\.ts/,
  globalSetup: resolve(e2e, "global-setup.ts"),
  // Pas de préchauffage ni de projet dépendant : une seule passe, un seul projet.
  projects: [{ name: "chromium", use: { ...(base.projects?.find((p) => p.name === "chromium")?.use ?? {}) } }],
  reporter: [["list"]],
  outputDir: resolve(__dirname, "../../../../e2e/test-results/capture-d326"),
  timeout: 180_000
};
