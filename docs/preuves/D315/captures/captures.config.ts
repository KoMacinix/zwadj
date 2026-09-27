/**
 * D315 — rang 24 — CONFIGURATION DES CAPTURES D'ÉCRAN. Pièce versée, pas un instrument : elle ne mesure rien, elle
 * PHOTOGRAPHIE. Aucun code hors `docs/preuves/` (consigne de Ko) : elle IMPORTE la configuration e2e telle quelle —
 * serveurs de développement sur leurs ports dédiés (3101 API, 3100 client, 5273 pro), base `zwadj_e2e` recréée par
 * `e2e/global-setup.ts`, leviers de throttle — et n'en change que :
 *   · le dossier et le motif des tests (cette pièce, pas `e2e/specs/`) ;
 *   · le chemin de `globalSetup`, que Playwright résout par rapport au fichier de configuration ;
 *   · le rapporteur (liste seule : le rapport HTML écrirait dans ce dossier) et le dossier de sortie (hors dépôt) ;
 *   · un seul projet, sans `warmup` : le script préchauffe lui-même chaque route en la visitant une première fois.
 * Lancement, depuis `e2e/` (c'est là que `@playwright/test` est résolu) :
 *   pnpm exec playwright test -c ../docs/preuves/D315/captures/captures.config.ts
 * ⚠ La sortie console porte les journaux du serveur de développement, dont des jetons de vérification d'e-mail
 *   (même raison que le journal e2e brut, point 9 du critère du rang 9) : elle NE SE VERSE PAS. Ce qui se verse est ce
 *   que le script écrit lui-même : `releve.txt` et les images.
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
  outputDir: resolve(tmpdir(), "zwadj-captures-d315-sortie"),
  reporter: [["list"]],
  workers: 1,
  retries: 0,
  timeout: 45 * 60_000,
  projects: [{ name: "captures", use: { ...(chromium?.use ?? {}), colorScheme: "light" as const } }]
};
