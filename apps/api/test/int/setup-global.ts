// globalSetup Vitest (processus séparé) : recrée zwadj_test et applique les
// migrations SQL committées, dans l'ordre — les tests tournent donc sur le
// schéma EXACT de prod, sans passer par le CLI Prisma.
import "dotenv/config";
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { TEST_DB, withDatabase } from "./db-url";

const MIGRATIONS_DIR = join(__dirname, "..", "..", "prisma", "migrations");

export default async function setup(): Promise<void> {
  const baseUrl = process.env.DATABASE_URL;
  if (!baseUrl) throw new Error("DATABASE_URL manquante (apps/api/.env) — requis pour les tests d'intégration.");

  // 1. Recréer la base de test (connexion d'administration sur `postgres`)
  const admin = new Client({ connectionString: withDatabase(baseUrl, "postgres") });
  await admin.connect();
  const { rows } = await admin.query<{ v: string }>("SELECT current_setting('server_version_num') AS v");
  const versionNum = Number(rows[0]?.v ?? 0);
  await admin.query(`DROP DATABASE IF EXISTS ${TEST_DB} WITH (FORCE)`);
  await admin.query(`CREATE DATABASE ${TEST_DB}`);
  await admin.end();

  // 2. Appliquer les migrations
  const test = new Client({ connectionString: withDatabase(baseUrl, TEST_DB) });
  await test.connect();

  if (versionNum < 180000) {
    // Cible du projet = PostgreSQL 18 (uuidv7 natif). On refuse par défaut de
    // masquer un environnement en retard ; le polyfill n'est autorisé que pour
    // des bacs à sable explicites (CI avec image <18, etc.).
    if (process.env.ALLOW_PG_LT18_POLYFILL !== "1") {
      await test.end();
      throw new Error(
        `PostgreSQL 18+ requis (détecté : ${rows[0]?.v}). ` +
          `Pour un environnement d'exception, définir ALLOW_PG_LT18_POLYFILL=1.`
      );
    }
    await test.query(`
      CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
        SELECT encode(set_bit(set_bit(overlay(uuid_send(gen_random_uuid())
          placing substring(int8send((extract(epoch FROM clock_timestamp())*1000)::bigint) FROM 3)
          FROM 1 FOR 6), 52, 1), 53, 1), 'hex')::uuid;
      $$ LANGUAGE sql VOLATILE;`);
  }

  const dirs = readdirSync(MIGRATIONS_DIR, { withFileTypes: true })
    .filter((d) => d.isDirectory())
    .map((d) => d.name)
    .sort();
  for (const dir of dirs) {
    const sql = readFileSync(join(MIGRATIONS_DIR, dir, "migration.sql"), "utf8");
    await test.query(sql);
  }
  await test.end();
}
