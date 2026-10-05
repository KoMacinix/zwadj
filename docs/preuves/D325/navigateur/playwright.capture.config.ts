/**
 * D325 — CONFIGURATION DES CAPTURES ET DES SONDES DU RANG 32 (pièce jetable, versée).
 *
 * Elle REPREND `e2e/playwright.config.ts` à l'identique — mêmes ports dédiés (3100, 3101, 5273), même base `zwadj_e2e`, mêmes serveurs de développement, même
 * `globalSetup` — et ne change que ce qu'elle joue : le dossier `docs/preuves/D325/navigateur/`, fichiers `*.capture.ts`. Elle n'est PAS dans `e2e/specs/` : une
 * capture n'est pas une porte (patron de D322, `docs/preuves/D322/navigateur/`).
 *
 * Usage, depuis la racine :
 *   pnpm --filter @zwadj/e2e exec playwright test --config ../docs/preuves/D325/navigateur/playwright.capture.config.ts <fichier>
 */
import { resolve } from "node:path";
import base from "../../../../e2e/playwright.config";

const e2e = resolve(__dirname, "../../../../e2e");

export default {
  ...base,
  testDir: __dirname,
  // `*.capture.ts` : les captures et les sondes ; `*.e2e.ts` : la spec du rang 32, SORTIE de la suite (D265, extension 10 de la table de D325 — voir son en-tête).
  testMatch: /.*\.(capture|e2e)\.ts/,
  globalSetup: resolve(e2e, "global-setup.ts"),
  // Pas de préchauffage ni de projet dépendant : une seule passe, un seul projet.
  projects: [{ name: "chromium", use: { ...(base.projects?.find((p) => p.name === "chromium")?.use ?? {}) } }],
  reporter: [["list"]],
  outputDir: resolve(__dirname, "../../../../e2e/test-results/capture"),
  timeout: 180_000
};
