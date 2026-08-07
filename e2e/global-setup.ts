import { execFileSync } from "node:child_process";
import { Client } from "pg";
import { DATABASE_URL } from "./playwright.config";

/**
 * Prépare la base e2e AVANT que Playwright ne démarre les serveurs.
 *
 * ⚠ Même doctrine que `test/int/setup-global.ts` : la base est RECRÉÉE, puis
 * les migrations sont rejouées depuis zéro par `prisma migrate deploy`. Jamais
 * `migrate dev` — il régénère les migrations et détruit le SQL écrit à la main
 * (EXCLUDE anti-double-booking, index partiels, FK composite).
 *
 * ⚠ Elle NE seede PAS de comptes. Chaque spec crée les siens (voir
 * `fixtures/harness.ts`) : des comptes partagés entre specs feraient compter
 * aux tests A2 des requêtes qui ne sont pas les leurs.
 */
export default async function globalSetup(): Promise<void> {
  const url = new URL(DATABASE_URL);
  const dbName = url.pathname.replace(/^\//, "").split("?")[0]!;

  const adminUrl = new URL(DATABASE_URL);
  adminUrl.pathname = "/postgres";
  adminUrl.search = "";

  const admin = new Client({ connectionString: adminUrl.toString() });
  await admin.connect();
  try {
    // WITH (FORCE) : coupe les connexions résiduelles d'un run précédent
    // interrompu, sinon le DROP reste bloqué indéfiniment.
    await admin.query(`DROP DATABASE IF EXISTS "${dbName}" WITH (FORCE)`);
    await admin.query(`CREATE DATABASE "${dbName}"`);
  } finally {
    await admin.end();
  }

  execFileSync("pnpm", ["--filter", "@zwadj/api", "run", "prisma:migrate"], {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL },
    shell: process.platform === "win32" // ⚠ Ko travaille sous Windows : sans ça, `pnpm` n'est pas résolu.
  });
}
