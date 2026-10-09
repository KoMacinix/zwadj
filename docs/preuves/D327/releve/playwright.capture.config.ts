/**
 * D327 — CONFIGURATION DES SONDES DU RANG 34 (pièce jetable, versée ; lot DOCUMENTAIRE : aucune de ces sondes ne touche au code du dépôt).
 *
 * Elle REPREND `e2e/playwright.config.ts` à l'identique — mêmes ports dédiés (3100, 3101, 5273), même base JETABLE `zwadj_e2e`, mêmes serveurs de développement, même `globalSetup`
 * — et ne change que ce qu'elle joue : les fichiers `*.capture.ts` de `docs/preuves/D327/releve/` (tous sous-dossiers). Patron de `docs/preuves/D326/navigateur/playwright.capture.config.ts`.
 * Une sonde n'est pas une porte : elle écrit des lignes `MESURE …` et des fichiers, elle ne juge rien.
 *
 * Usage, depuis la racine :
 *   pnpm --filter @zwadj/e2e exec playwright test --config ../docs/preuves/D327/releve/playwright.capture.config.ts <fichier>
 */
import { resolve } from "node:path";
import base from "../../../../e2e/playwright.config";

const e2e = resolve(__dirname, "../../../../e2e");

export default {
  ...base,
  testDir: __dirname,
  testMatch: /.*\.capture\.ts/,
  globalSetup: resolve(e2e, "global-setup.ts"),
  // Pas de préchauffage ni de projet dépendant : une seule passe, un seul projet.
  projects: [{ name: "chromium", use: { ...(base.projects?.find((p) => p.name === "chromium")?.use ?? {}) } }],
  reporter: [["list"]],
  outputDir: resolve(__dirname, "../../../../e2e/test-results/capture-d327"),
  timeout: 240_000
};
