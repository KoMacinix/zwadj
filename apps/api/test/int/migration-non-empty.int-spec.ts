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
 * ⚠ CE SEMIS SUIT LA DERNIÈRE MIGRATION, il n'est pas figé une fois pour toutes.
 * Il visait `refresh_tokens` quand `20260804120000` fermait la marche ; la
 * dernière est désormais `20260814120000_quote_sent_via`, donc on sème des
 * DEVIS. Semer la mauvaise table laisserait le test vert sur une table vide —
 * exactement le défaut que D123 cherche à empêcher.
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

  // Une salle publiée, puis des devis dans plusieurs états — dont des lignes
  // `SENT` avec un `sent_at` déjà posé. C'est la configuration où une colonne
  // ajoutée sans défaut, ou un CHECK trop strict, mordrait.
  await sql(`
    INSERT INTO pro_profiles (id, user_id, business_name, phone, created_at, updated_at)
    SELECT uuidv7(), u.id, 'Salles Réunies', '+213550000001', now(), now()
    FROM users u WHERE u.role = 'PRO'
  `);
  await sql(`
    INSERT INTO venues (id, owner_id, city_id, slug, name_fr, name_ar, capacity_max,
                        base_price_cents, publication_status, created_at, updated_at)
    SELECT uuidv7(), p.id, c.id, 'salle-test', 'Salle test', 'قاعة', 300,
           150000000, 'PUBLISHED', now(), now()
    FROM pro_profiles p CROSS JOIN cities c LIMIT 1
  `);
  await sql(`
    INSERT INTO quotes (id, venue_id, status, version, chain_id, event_date, guests,
                        base_price_cents, services_total_cents, total_cents, deposit_cents,
                        lines, sent_at, created_at)
    SELECT uuidv7(), v.id,
           (CASE WHEN g.i = 1 THEN 'DRAFT' ELSE 'SENT' END)::"QuoteStatus",
           1, uuidv7(), current_date + g.i, 100,
           150000000, 0, 150000000, 45000000, '[]'::jsonb,
           CASE WHEN g.i = 1 THEN NULL ELSE now() - interval '2 days' END,
           now()
    FROM venues v CROSS JOIN generate_series(1, 3) AS g(i)
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
      `SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'sent_via'`
    );
    expect(colonne, "la dernière migration est DÉJÀ appliquée : le test ne prouverait rien").toHaveLength(0);

    await semerDonnees();
    const semees = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM refresh_tokens`);
    expect(Number(semees[0]!.n)).toBe(12);
    const devis = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes`);
    expect(Number(devis[0]!.n), "sans devis semés, la migration s'appliquerait sur du vide").toBe(3);
  });

  it("applique la dernière migration SANS perdre ni abîmer les données", async () => {
    const avant = await sql<{ table_name: string; n: string }>(`
      SELECT 'users' AS table_name, count(*)::text AS n FROM users
      UNION ALL SELECT 'refresh_tokens', count(*)::text FROM refresh_tokens
      UNION ALL SELECT 'quotes', count(*)::text FROM quotes
      UNION ALL SELECT 'wilayas', count(*)::text FROM wilayas
      UNION ALL SELECT 'cities', count(*)::text FROM cities
      ORDER BY 1
    `);
    const revoquesAvant = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM refresh_tokens WHERE revoked_at IS NOT NULL`
    );
    const envoyesAvant = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM quotes WHERE sent_at IS NOT NULL`
    );

    await appliquerMigrations([migrationsOrdonnees().at(-1)!]);

    const apres = await sql<{ table_name: string; n: string }>(`
      SELECT 'users' AS table_name, count(*)::text AS n FROM users
      UNION ALL SELECT 'refresh_tokens', count(*)::text FROM refresh_tokens
      UNION ALL SELECT 'quotes', count(*)::text FROM quotes
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

    // ⚠ L'ENTONNOIR COMPTE ENCORE SUR `sent_at` À CE LOT. Si la migration y
    // touchait, l'indicateur du panneau gauche changerait de valeur sans que
    // personne l'ait décidé. Ce compte doit être exactement le même qu'avant.
    const envoyesApres = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM quotes WHERE sent_at IS NOT NULL`
    );
    expect(envoyesApres).toEqual(envoyesAvant);
  });

  it("les objets créés par la migration sont bien là, et conformes à leur intention", async () => {
    const colonne = await sql<{ is_nullable: string; data_type: string }>(
      `SELECT is_nullable, data_type FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'sent_via'`
    );
    expect(colonne).toHaveLength(1);
    // ⚠ NULLABLE, et c'est l'invariant qui rend la migration sûre sur une base
    // pleine : `NOT NULL` sans défaut aurait échoué sur les 3 devis semés.
    expect(colonne[0]!.is_nullable).toBe("YES");
    // TEXT et non un type énuméré : la liste des canaux est ouverte, et un
    // `ALTER TYPE` par libellé ajouté serait une migration de plus à chaque fois.
    expect(colonne[0]!.data_type).toBe("text");

    // AUCUNE REPRISE DE DONNÉES : les devis déjà `SENT` ne reçoivent PAS un
    // canal inventé. On ne sait pas par quoi ils sont partis, et le deviner
    // produirait un entonnoir qui a l'air juste (décision 7 de C1).
    const remplis = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes WHERE sent_via IS NOT NULL`);
    expect(Number(remplis[0]!.n), "la migration a inventé un canal sur des devis anciens").toBe(0);

    // Le CHECK, invisible de Prisma : sans lui, une chaîne vide passerait pour
    // un canal et fausserait le dénominateur sans jamais lever d'erreur.
    const check = await sql<{ conname: string }>(
      `SELECT conname FROM pg_constraint WHERE conname = 'quotes_sent_via_not_blank'`
    );
    expect(check).toHaveLength(1);
    await expect(
      sql(`UPDATE quotes SET sent_via = '   ' WHERE sent_at IS NOT NULL`)
    ).rejects.toThrow();
  });

});
