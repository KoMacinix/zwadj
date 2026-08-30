import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { defineConfig, devices } from "@playwright/test";

/**
 * T1 — SOCLE E2E (D118).
 *
 * Raison d'être : les six portes n'ont pas vu le double `refresh` au démarrage,
 * parce qu'il ne vit que dans l'interaction navigateur réel + montage React +
 * timing réseau. Aucune porte ne monte un composant dans un vrai moteur de
 * rendu ; aucune n'observe deux onglets. Cette suite-ci le fait.
 *
 * ⚠ SUITE À LA DEMANDE, PAS SEPTIÈME PORTE (décision Ko).
 */

/**
 * ⚠ PILE DÉDIÉE, PORTS DÉDIÉS — correction du premier lancement.
 *
 * La version précédente réutilisait les ports de dev (3000/3001/5173) avec
 * `reuseExistingServer`. Si les serveurs de dev tournaient déjà, Playwright les
 * réutilisait — et l'API parlait alors à la base `zwadj` pendant que
 * `global-setup` migrait `zwadj_e2e` et que le harnais y écrivait ses comptes.
 * Deux bases, une suite : les comptes créés n'existaient pas pour l'API.
 *
 * Le 429 a masqué ce défaut-là en tombant le premier. Des ports à part
 * suppriment la question : la pile e2e ne peut plus être confondue avec celle
 * de dev, et les deux cohabitent sans qu'on ait rien à arrêter.
 */
const API_PORT = Number(process.env.E2E_API_PORT ?? 3101);
const CLIENT_PORT = Number(process.env.E2E_CLIENT_PORT ?? 3100);
const PRO_PORT = Number(process.env.E2E_PRO_PORT ?? 5273);

const API = `http://localhost:${API_PORT}`;
const CLIENT = `http://localhost:${CLIENT_PORT}`;
const PRO = `http://localhost:${PRO_PORT}`;

/** Base DÉDIÉE. Ni `zwadj` (données de dev, que la suite effacerait), ni
 *  `zwadj_test` (celle des tests d'intégration, qui la recrée à chaque run). */
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public";

/**
 * ⚠ LEVIER DE THROTTLE : IL EXISTAIT DÉJÀ, JE NE L'AVAIS PAS BRANCHÉ.
 *
 * `auth.throttle.ts` lit des variables `THROTTLE_*` explicitement décrites
 * comme « levier de test uniquement », volontairement HORS du schéma env
 * validé : en production rien n'est défini et les vraies limites s'appliquent.
 * `test/int/setup-env.ts` s'en sert exactement de cette façon depuis le Lot 1.
 *
 * Il n'y a donc RIEN à changer dans le code de production. Ajouter une variable
 * dédiée à l'e2e aurait créé un second mécanisme pour le même besoin — et un
 * second endroit où se tromper sur un chemin anti-abus.
 *
 * ⚠ Ces limites ne partent QUE vers le serveur que Playwright démarre lui-même,
 * sur un port dédié. Un serveur de dev ou de prod ne les voit jamais.
 */
const THROTTLE_OFF = {
  // ⚠ D128 — le limiteur PAR DÉFAUT (100/60 s, TOUTES les routes hors /auth)
  // était codé en dur dans `app.module.ts` et échappait donc à ce levier.
  // Mesuré avant élargissement : 51 refus en 429 sur 150 lectures d'une route
  // publique. Une suite qui grossit échoue alors par grappes, sur des tests
  // qui n'ont aucun rapport avec ce qu'ils mesurent.
  THROTTLE_DEFAULT_LIMIT: "1000000",
  THROTTLE_REGISTER_LIMIT: "10000",
  THROTTLE_VERIFY_LIMIT: "10000",
  THROTTLE_RESEND_LIMIT: "10000",
  THROTTLE_LOGIN_LIMIT: "10000",
  THROTTLE_REFRESH_LIMIT: "10000",
  THROTTLE_LOGOUT_LIMIT: "10000",
  THROTTLE_FORGOT_LIMIT: "10000",
  THROTTLE_RESET_LIMIT: "10000",
  THROTTLE_GOOGLE_LIMIT: "10000",
  THROTTLE_CHANGE_PASSWORD_LIMIT: "10000",
  THROTTLE_CHANGE_EMAIL_LIMIT: "10000"
};

export default defineConfig({
  testDir: "./specs",
  testMatch: /.*\.e2e\.ts/,
  globalSetup: "./global-setup.ts",
  workers: process.env.CI ? 1 : 2,
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: 0, // ⚠ VOLONTAIREMENT ZÉRO : un test de concurrence qui passe « à la
  // deuxième tentative » ne prouve rien. Une instabilité ici est un résultat.
  reporter: [["list"], ["html", { open: "never", outputFolder: "playwright-report" }]],
  /**
   * ⚠ 45 s SUFFISAIENT À 15 TESTS, PLUS À 33.
   *
   * Le premier vrai lancement de T4 a produit un `Test timeout exceeded` sur un
   * `page.goto` vers `/fr/salles` — pas une assertion, une navigation qui n'a
   * pas fini. Deux causes cumulées, toutes deux d'environnement :
   *   1. Next et Vite compilent une route à la PREMIÈRE demande, et deux
   *      workers peuvent la demander en même temps ;
   *   2. la suite fait tourner deux navigateurs, deux serveurs de dev, une API
   *      et PostgreSQL sur la même machine — 5,1 minutes de charge continue.
   *
   * Le projet `warmup` paie la compilation en dehors de toute mesure ; ce
   * plafond-ci couvre ce qui reste : la contention.
   *
   * ⚠ Ce n'est PAS une invitation à monter le chiffre à chaque échec. Un
   * timeout qui revient APRÈS le préchauffage n'est plus de la lenteur — c'est
   * quelque chose qui bloque, et il faut le lire.
   */
  timeout: 90_000,
  expect: { timeout: 7_000 },

  use: {
    // Une navigation qui n'aboutit pas doit échouer AVANT le test entier, sinon
    // le message dit « timeout » sans dire QUELLE étape n'a pas fini.
    navigationTimeout: 60_000,
    actionTimeout: 15_000,
    trace: "retain-on-failure",
    video: "off",
    screenshot: "only-on-failure",
    ...devices["Desktop Chrome"]
  },

  projects: [
    /**
     * ⚠ PROJET DE PRÉCHAUFFAGE — s'exécute avant tout le reste (D127).
     *
     * Il vit dans un PROJET et non dans `globalSetup` parce que `globalSetup`
     * ne garantit pas que les serveurs soient déjà debout : un préchauffage qui
     * s'exécute trop tôt échoue en silence et ne préchauffe rien, tout en
     * donnant l'impression que le problème est traité. Un projet avec
     * `dependencies` s'exécute forcément après le `webServer`.
     */
    { name: "warmup", testMatch: /warmup\.setup\.ts/ },
    { name: "chromium", use: { ...devices["Desktop Chrome"] }, dependencies: ["warmup"] }
  ],

  /**
   * ⚠ SERVEURS DE DÉVELOPPEMENT, ET C'EST DÉLIBÉRÉ.
   *
   * L'usage veut qu'on teste le build de production. Ici ce serait passer à
   * côté de la cible : `React.StrictMode` ne double le montage QUE dans un
   * build de développement, et c'est ce double montage qui a révélé D115.
   * Contre un build de prod, tous les tests A2 seraient verts sans rien
   * garantir. Un second projet « prod » a sa place plus tard pour A5.
   *
   * ⚠ `reuseExistingServer: false` PARTOUT — voir la note des ports. Sur des
   * ports dédiés, refuser la réutilisation ne gêne personne et supprime toute
   * ambiguïté sur QUI répond et sur QUELLE base.
   */
  webServer: [
    {
      command: "pnpm --filter @zwadj/api run dev",
      url: `${API}/api/v1/health`,
      reuseExistingServer: false,
      timeout: 180_000,
      stdout: "pipe",
      stderr: "pipe",
      env: {
        ...THROTTLE_OFF,
        DATABASE_URL,
        PORT: String(API_PORT),
        CORS_ORIGINS: `${CLIENT},${PRO}`,
        CLIENT_URL: CLIENT,
        PRO_URL: PRO,
        // Les uploads e2e écriraient de VRAIS fichiers : racine jetable hors
        // du dépôt, jamais le `var/media` du poste de dev (même règle qu'en
        // intégration).
        MEDIA_DISK_ROOT: mkdtempSync(join(tmpdir(), "zwadj-media-e2e-"))
      }
    },
    {
      command: `pnpm --filter @zwadj/client exec next dev --port ${CLIENT_PORT}`,
      url: CLIENT,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_PRO_URL: PRO }
    },
    {
      command: `pnpm --filter @zwadj/pro exec vite --port ${PRO_PORT} --strictPort`,
      url: PRO,
      reuseExistingServer: false,
      timeout: 180_000,
      env: { VITE_API_URL: API, VITE_CLIENT_URL: CLIENT }
    }
  ]
});

export { API, CLIENT, PRO, DATABASE_URL };
