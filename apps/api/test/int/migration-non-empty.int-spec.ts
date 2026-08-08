/**
 * T3 / B9 — LA DERNIÈRE MIGRATION, APPLIQUÉE SUR UNE BASE NON VIDE (D123).
 *
 * ⚠ CE QUE `test:int` NE PEUT PAS VOIR.
 * Son `globalSetup` fait `DROP DATABASE` puis rejoue les 20 migrations sur du
 * VIDE. Toute la classe de défauts qui n'existe qu'en présence de données lui
 * échappe par construction :
 *   - une colonne `NOT NULL` sans valeur par défaut ;
 *   - un `UNIQUE` que les lignes existantes violent ;
 *   - un `CHECK` que les lignes existantes ne passent pas ;
 *   - un `ALTER TYPE` sur une colonne déjà remplie.
 * Aucune ne se voit sur une table vide. Toutes se voient en production.
 *
 * MÉTHODE : appliquer les migrations SAUF LA DERNIÈRE, semer des données
 * réalistes, puis appliquer la dernière et vérifier que rien n'a bougé.
 *
 * ⚠ Base et cycle de vie SÉPARÉS de `zwadj_test` : cette suite manipule son
 * propre schéma migration par migration, elle n'a rien à faire dans la base que
 * les autres specs partagent.
 */
import { readFileSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, describe, expect, it } from "vitest";

const API_DIR = join(__dirname, "../..");
const MIGRATIONS_DIR = join(API_DIR, "prisma/migrations");

const BASE_URL = process.env.DATABASE_URL ?? "postgresql://zwadj:zwadj@localhost:5432/zwadj_test?schema=public";
const DB = "zwadj_migration_test";
const POLYFILL_UUIDV7 = `CREATE OR REPLACE FUNCTION uuidv7() RETURNS uuid AS $$
        SELECT encode(set_bit(set_bit(overlay(uuid_send(gen_random_uuid())
          placing substring(int8send((extract(epoch FROM clock_timestamp())*1000)::bigint) FROM 3)
          FROM 1 FOR 6), 52, 1), 53, 1), 'hex')::uuid;
      $$ LANGUAGE sql VOLATILE;`;

const MIGRATION_URL = (() => {
  const u = new URL(BASE_URL);
  u.pathname = `/${DB}`;
  return u.toString();
})();

/** Toutes les migrations, dans l'ordre d'application. */
function migrationsOrdonnees(): string[] {
  return readdirSync(MIGRATIONS_DIR)
    .filter((d) => /^\d{14}_/.test(d))
    .sort();
}

/**
 * Applique les migrations, en SQL direct.
 *
 * ⚠ POURQUOI PAS `prisma migrate deploy`. Cette commande a besoin du
 * schema-engine, un binaire téléchargé depuis `binaries.prisma.sh` — absent des
 * environnements hors ligne, où elle sort alors en SUCCÈS sans rien appliquer.
 * Une base restée vide et un code de retour zéro : le pire des deux mondes pour
 * un test, qui deviendrait vert en n'ayant rien migré.
 *
 * Appliquer le SQL nous-mêmes est aussi plus proche de ce que B9 mesure : c'est
 * le SQL des migrations, confronté à de vraies données, qui nous intéresse.
 * ⚠ Ce que cela ne couvre PAS, en revanche : la tenue du journal
 * `_prisma_migrations` et le contrôle de somme, qui restent l'affaire de Prisma.
 */
async function appliquerMigrations(noms: string[]): Promise<void> {
  const c = new Client({ connectionString: MIGRATION_URL });
  await c.connect();
  try {
    // PG18 fournit `uuidv7()` nativement ; le bac à sable est en 16.
    await c.query(POLYFILL_UUIDV7);
    for (const nom of noms) {
      const sqlText = readFileSync(join(MIGRATIONS_DIR, nom, "migration.sql"), "utf8");
      await c.query(sqlText);
    }
  } finally {
    await c.end();
  }
}

async function sql<T = Record<string, unknown>>(query: string, params: unknown[] = []): Promise<T[]> {
  const c = new Client({ connectionString: MIGRATION_URL });
  await c.connect();
  try {
    const r = await c.query(query, params);
    return r.rows as T[];
  } finally {
    await c.end();
  }
}

async function recreerBase(): Promise<void> {
  const admin = new URL(MIGRATION_URL);
  admin.pathname = "/postgres";
  admin.search = "";
  const c = new Client({ connectionString: admin.toString() });
  await c.connect();
  try {
    await c.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
    await c.query(`CREATE DATABASE "${DB}"`);
  } finally {
    await c.end();
  }
}

/**
 * Données RÉALISTES, pas un jeu minimal : une salle publiée, deux clients, des
 * demandes dans plusieurs états, et surtout plusieurs sessions par utilisateur
 * — c'est `refresh_tokens` que la dernière migration touche, et c'est la table
 * qui grossit le plus vite en production.
 */
async function semerDonnees(): Promise<void> {
  await sql(`
    INSERT INTO wilayas (id, code, name_fr, name_ar) VALUES (uuidv7(), 16, 'Alger', 'الجزائر');
    INSERT INTO cities (id, wilaya_id, name_fr, name_ar, lat, lng)
      SELECT uuidv7(), id, 'Hydra', 'حيدرة', 36.7, 3.0 FROM wilayas;
  `);
  for (const email of ["aya@example.dz", "yacine@example.dz", "pro@example.dz"]) {
    const role = email.startsWith("pro") ? "PRO" : "CLIENT";
    await sql(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at, locale, created_at, updated_at)
       VALUES (uuidv7(), $1, '$argon2id$fake', $2::"UserRole", 'ACTIVE', now(), 'fr', now(), now())`,
      [email, role]
    );
  }
  // Plusieurs sessions vivantes ET révoquées par utilisateur : c'est la
  // configuration où une migration touchant `refresh_tokens` peut mordre.
  await sql(`
    INSERT INTO refresh_tokens (id, user_id, token_hash, expires_at, revoked_at, persistent, created_at)
    SELECT uuidv7(), u.id, encode(sha256((u.email || g.i::text)::bytea), 'hex'),
           now() + interval '30 days',
           CASE WHEN g.i % 2 = 0 THEN now() - interval '1 day' ELSE NULL END,
           true, now()
    FROM users u CROSS JOIN generate_series(1, 4) AS g(i)
  `);
}

beforeAll(async () => {
  await recreerBase();
});

describe("B9 — la dernière migration sur une base NON VIDE (D123)", () => {
  it("prépare une base à l'avant-dernière migration, puis la sème", async () => {
    expect(migrationsOrdonnees().length).toBeGreaterThan(1);

    const toutes = migrationsOrdonnees();
    await appliquerMigrations(toutes.slice(0, -1));

    // ⚠ GARDE-FOU : sans lui, une erreur de préparation laisserait une base
    // DÉJÀ à jour, et le test suivant vérifierait une migration déjà appliquée
    // — vert, et sans objet.
    const colonne = await sql(
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'refresh_tokens' AND column_name = 'rotated_at'`
    );
    expect(colonne, "la dernière migration est DÉJÀ appliquée : le test ne prouverait rien").toHaveLength(0);

    await semerDonnees();
    const semees = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM refresh_tokens`);
    expect(Number(semees[0]!.n)).toBe(12);
  });

  it("applique la dernière migration SANS perdre ni abîmer les données", async () => {
    const avant = await sql<{ table_name: string; n: string }>(`
      SELECT 'users' AS table_name, count(*)::text AS n FROM users
      UNION ALL SELECT 'refresh_tokens', count(*)::text FROM refresh_tokens
      UNION ALL SELECT 'wilayas', count(*)::text FROM wilayas
      UNION ALL SELECT 'cities', count(*)::text FROM cities
      ORDER BY 1
    `);
    const revoquesAvant = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM refresh_tokens WHERE revoked_at IS NOT NULL`
    );

    await appliquerMigrations([migrationsOrdonnees().at(-1)!]);

    const apres = await sql<{ table_name: string; n: string }>(`
      SELECT 'users' AS table_name, count(*)::text AS n FROM users
      UNION ALL SELECT 'refresh_tokens', count(*)::text FROM refresh_tokens
      UNION ALL SELECT 'wilayas', count(*)::text FROM wilayas
      UNION ALL SELECT 'cities', count(*)::text FROM cities
      ORDER BY 1
    `);
    // Aucune ligne perdue. Une migration qui recrée une table au lieu de
    // l'altérer se voit ICI, et nulle part ailleurs dans le dépôt.
    expect(apres).toEqual(avant);

    // Les états antérieurs sont préservés : une reprise de données involontaire
    // (un `UPDATE` de trop dans la migration) se verrait sur ce compte.
    const revoquesApres = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM refresh_tokens WHERE revoked_at IS NOT NULL`
    );
    expect(revoquesApres).toEqual(revoquesAvant);
  });

  it("les objets créés par la migration sont bien là, et conformes à leur intention", async () => {
    const colonne = await sql<{ is_nullable: string }>(
      `SELECT is_nullable FROM information_schema.columns
        WHERE table_name = 'refresh_tokens' AND column_name = 'rotated_at'`
    );
    expect(colonne).toHaveLength(1);
    // ⚠ NULLABLE, et c'est l'invariant qui rend la migration sûre sur une base
    // pleine : `NOT NULL` sans défaut aurait échoué sur les 12 lignes semées.
    expect(colonne[0]!.is_nullable).toBe("YES");

    // D116 — AUCUNE REPRISE DE DONNÉES : les lignes déjà révoquées gardent
    // `rotated_at = NULL` et restent traitées en réutilisation stricte.
    const remplies = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM refresh_tokens WHERE revoked_at IS NOT NULL AND rotated_at IS NOT NULL`
    );
    expect(Number(remplies[0]!.n), "la migration a rempli rotated_at sur des lignes anciennes").toBe(0);

    // L'index PARTIEL, invisible de Prisma : s'il n'était créé que dans le
    // schéma et pas en SQL, rien d'autre ne le dirait.
    const index = await sql<{ indexdef: string }>(
      `SELECT indexdef FROM pg_indexes WHERE indexname = 'refresh_tokens_rotated_at_idx'`
    );
    expect(index).toHaveLength(1);
    expect(index[0]!.indexdef).toContain("WHERE (rotated_at IS NOT NULL)");
  });

});
