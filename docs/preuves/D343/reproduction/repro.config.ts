/**
 * D343 — configuration Playwright de la REPRODUCTION de D265 (pièce versée, jamais promue en instrument — D291).
 *
 * UNE SEULE SOURCE POUR LE SERVEUR : la commande et l'environnement de l'API viennent de `e2e/playwright.config.ts` (la suite elle-même) — rien n'est recopié ici.
 * Seuls diffèrent : le projet (pas de navigateur, pas de préchauffage, ni le client Next ni le Pro Vite), un seul worker, et le fichier visé.
 *   · `testDir` = la RACINE du dépôt, `testMatch` = deux noms de fichier EXACTS : la reproduction de ce dossier et la garde permanente de la suite
 *     (`e2e/specs/d265-socket-perimee.e2e.ts`, qui n'existe qu'après la correction). On vise l'un ou l'autre en argument de ligne de commande.
 *   · `retries: 0`, comme la suite (arbitrage de Ko : aucune nouvelle tentative automatique).
 *   · `stdout` du serveur : pipé, pour que le brut puisse être gardé HORS du dépôt (il contient des jetons de vérification : D200) ; la pièce versée en est filtrée.
 * Usage : voir `lancer-repro.sh`.
 */
import { resolve } from "node:path";
import { defineConfig } from "../../../../e2e/node_modules/@playwright/test";
import suite from "../../../../e2e/playwright.config";

const serveurs = Array.isArray(suite.webServer) ? suite.webServer : suite.webServer ? [suite.webServer] : [];
const api = serveurs.find((s) => String(s.command).includes("@zwadj/api"));
if (api === undefined) throw new Error("le serveur d'API est introuvable dans la configuration de la suite : la reproduction ne mesurerait pas le même serveur");

export default defineConfig({
  testDir: resolve(__dirname, "../../../.."),
  testMatch: /(repro-d265\.repro|d265-socket-perimee\.e2e)\.ts$/,
  testIgnore: ["**/node_modules/**", "**/.next/**", "**/dist/**", "**/test-results/**"],
  globalSetup: resolve(__dirname, "../../../../e2e/global-setup.ts"),
  workers: 1,
  fullyParallel: false,
  retries: 0,
  timeout: 180_000,
  expect: { timeout: 7_000 },
  reporter: [["list"]],
  outputDir: process.env.D343_SORTIE_TEST ?? resolve(__dirname, "../../../../e2e/test-results"),
  projects: [{ name: "repro" }],
  webServer: [{ ...api, reuseExistingServer: false }]
});
