/**
 * D316 — rang 25 — CONFIGURATION DES CAPTURES D'APRÈS CORRECTIF. Pièce versée, patron de
 * `docs/preuves/D315/captures/captures.config.ts` (non importé : une pièce ne dépend pas d'une autre). Elle IMPORTE la
 * configuration e2e telle quelle — serveurs de développement sur leurs ports dédiés, base `zwadj_e2e` recréée par
 * `e2e/global-setup.ts`, leviers de throttle — et n'en change que le dossier et le motif des tests, le rapporteur, le
 * dossier de sortie (hors dépôt) et le projet (un seul, sans `warmup`).
 * Lancement, depuis `e2e/` :  pnpm exec playwright test -c ../docs/preuves/D316/captures/captures.config.ts
 * ⚠ La sortie console porte les journaux du serveur de développement (jetons de vérification, cookies) : elle NE SE
 *   VERSE PAS. Ce qui se verse est ce que le script écrit lui-même : `releve.txt` et les images.
 */
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import base from "../../../../e2e/playwright.config";

const racine = resolve(__dirname, "../../../..");
const chromium = (base.projects ?? []).find((p) => p.name === "chromium");

export default {
  ...base,
  testDir: __dirname,
  testMatch: /captures\.spec\.ts/,
  globalSetup: resolve(racine, "e2e/global-setup.ts"),
  outputDir: resolve(tmpdir(), "zwadj-captures-d316-sortie"),
  reporter: [["list"]],
  workers: 1,
  retries: 0,
  timeout: 20 * 60_000,
  projects: [{ name: "captures", use: { ...(chromium?.use ?? {}), colorScheme: "light" as const } }]
};
