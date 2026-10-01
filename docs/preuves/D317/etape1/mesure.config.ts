/**
 * D317 — rang 26, ÉTAPE 1 — CONFIGURATION DE LA MESURE IN SITU. Pièce versée, patron de
 * `docs/preuves/D316/captures/captures.config.ts` (non importé : une pièce ne dépend pas d'une autre). Elle IMPORTE la
 * configuration e2e telle quelle et n'en garde que le serveur d'API — l'entrée `webServer` que la configuration RÉELLE
 * déclare, donc la commande d'avant le correctif pour la mesure rouge, celle d'après pour la verte. Base `zwadj_e2e`
 * recréée par `e2e/global-setup.ts`, comme en e2e. Rapporteur, dossier de sortie (hors dépôt), un seul projet.
 * Lancement, depuis `e2e/` :  pnpm exec playwright test -c ../docs/preuves/D317/etape1/mesure.config.ts
 * ⚠ La sortie console porte les journaux du serveur de développement : elle NE SE VERSE PAS telle quelle.
 */
import { tmpdir } from "node:os";
import { resolve } from "node:path";
import base from "../../../../e2e/playwright.config";

const racine = resolve(__dirname, "../../../..");
const serveurs = Array.isArray(base.webServer) ? base.webServer : [base.webServer];
const api = serveurs.find((s) => s !== undefined && String(s.url ?? "").endsWith("/api/v1/health"));
if (api === undefined) throw new Error("Aucune entrée webServer ne sert /api/v1/health : la configuration e2e a changé.");

export default {
  ...base,
  testDir: __dirname,
  testMatch: /mesure-surveillance\.spec\.ts/,
  globalSetup: resolve(racine, "e2e/global-setup.ts"),
  outputDir: resolve(tmpdir(), "zwadj-mesure-d317-sortie"),
  reporter: [["list"]],
  workers: 1,
  retries: 0,
  timeout: 10 * 60_000,
  webServer: [api],
  projects: [{ name: "mesure" }]
};
