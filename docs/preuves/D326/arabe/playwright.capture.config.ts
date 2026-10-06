/**
 * D326 — CONFIGURATION DE LA PREUVE DE L'ARABE (pièce jetable, versée).
 *
 * Elle REPREND `e2e/playwright.config.ts` à l'identique — mêmes ports dédiés (3100, 3101, 5273), même base `zwadj_e2e`, mêmes serveurs de développement, même `globalSetup` —
 * et ne change que ce qu'elle joue : le dossier `docs/preuves/D326/arabe/`, fichier `*.capture.ts`. Patron de `docs/preuves/D325/navigateur/playwright.capture.config.ts`.
 *
 * ⚠ BASE : `zwadj_e2e`, la base DÉDIÉE et jetable de l'e2e (`globalSetup` la recrée) — et non `zwadj`, la base de dev de Ko. La décision 2 dit « la base de dev » ; l'écart est dit
 * dans la section D326 : écrire un devis d'essai, un compte client et une salle dans les données de Ko n'apporte rien à la preuve, et `e2e/playwright.config.ts` écrit en toutes lettres
 * que `zwadj` est la base que la suite « effacerait ».
 *
 * Usage, depuis la racine :
 *   pnpm --filter @zwadj/e2e exec playwright test --config ../docs/preuves/D326/arabe/playwright.capture.config.ts preuve-arabe
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
  outputDir: resolve(__dirname, "../../../../e2e/test-results/capture-arabe"),
  timeout: 180_000
};
