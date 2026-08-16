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
 * Il visait `refresh_tokens` quand `20260804120000` fermait la marche, puis les
 * DEVIS pour `20260814120000_quote_sent_via`, puis LES DEUX CAS du tri D166 pour
 * `20260814140000_quote_delivery_switch`. La dernière est désormais
 * `20260815120000_quote_drop_valid_until`.
 * Semer la mauvaise table laisserait le test vert sur une table vide — exactement
 * le défaut que D123 cherche à empêcher.
 *
 * ⚠ LE SEMIS DES DEUX CAS `SENT` EST CONSERVÉ, bien que le tri D166 ne soit plus
 * la dernière migration. Il s'applique désormais pendant la préparation, et sert
 * à autre chose : Q4 supprime une COLONNE, et le seul moyen de voir qu'elle ne
 * l'a pas fait en recréant la table est de compter des lignes qui existaient
 * avant. Un semis vide rendrait `expect(apres).toEqual(avant)` vrai sur deux
 * ensembles vides.
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

  // ⚠ UN des deux devis `SENT` reçoit une RÉSERVATION, et c'est ce qui rend le
  // test capable de mesurer quoi que ce soit. Le critère de D166 est
  // `booking_id IS NULL` : sans une ligne de chaque côté, un `UPDATE` sans
  // clause `WHERE` — le défaut exact que la migration doit éviter — passerait
  // parfaitement vert.
  await sql(`
    INSERT INTO bookings (id, venue_id, quote_id, source, status, payment_method,
                          event_date, starts_at, ends_at, guests,
                          base_price_cents, services_total_cents, total_cents, deposit_cents,
                          contact_first_name, contact_last_name, contact_phone, created_at, updated_at)
    SELECT uuidv7(), q.venue_id, q.id, 'WALK_IN', 'PENDING', 'CASH',
           q.event_date, q.event_date::timestamptz, q.event_date::timestamptz + interval '6 hours', q.guests,
           q.base_price_cents, q.services_total_cents, q.total_cents, q.deposit_cents,
           'Amina', 'Bensalem', '+213550000001', now(), now()
      FROM quotes q
     WHERE q.status = 'SENT'
     ORDER BY q.event_date
     LIMIT 1
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

    await semerDonnees();
    const semees = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM refresh_tokens`);
    expect(Number(semees[0]!.n)).toBe(12);
    const devis = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes`);
    expect(Number(devis[0]!.n), "sans devis semés, la migration s'appliquerait sur du vide").toBe(3);

    // ⚠ GARDE-FOU : sans lui, une erreur de préparation laisserait une base
    // DÉJÀ à jour, et le test suivant vérifierait une migration déjà appliquée
    // — vert, et sans objet.
    //
    // ⚠ IL A DÛ CHANGER DE SONDE **ET** DE PLACE. De sonde, parce que `sent_via`
    // est créée par l'AVANT-DERNIÈRE migration : à ce stade elle EXISTE
    // désormais, et l'ancienne assertion « la colonne est absente » aurait
    // échoué. La nouvelle migration ne crée AUCUN objet — elle trie des lignes —
    // donc la sonde porte sur son EFFET. De place, parce qu'un effet sur des
    // lignes ne se mesure qu'APRÈS le semis : posée avant, elle comptait zéro
    // sur une base vide et rendait le garde-fou impossible à satisfaire.
    //
    // ⚠ ET ELLE EXIGE LES DEUX CAS. `> 0` sur les SENT à trier ne suffirait pas
    // à prouver que le semis couvre aussi le SENT CONSERVÉ : sans lui, la clause
    // `NOT EXISTS` de la migration ne serait mesurée que d'un côté.
    // ⚠ TROISIÈME CHANGEMENT DE SONDE EN QUATRE LOTS, et ce n'est pas un défaut
    // du harnais : c'est ce qu'il coûte de rester honnête. Chaque sonde doit
    // décrire ce que fait LA dernière migration, et celle-ci change à chaque
    // lot. Elle a porté sur l'existence de `sent_via`, puis sur l'EFFET du tri
    // D166 — qui s'applique désormais pendant la PRÉPARATION, donc ne prouverait
    // plus rien ici. Q4 supprimant une colonne, la sonde redevient structurelle :
    // à l'avant-dernière migration, `valid_until` existe ENCORE.
    const colonne = await sql<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'quotes' AND column_name = 'valid_until'
    `);
    expect(
      colonne,
      "valid_until déjà absente : la dernière migration est appliquée, le test ne prouverait rien"
    ).toHaveLength(1);

    // Et le tri D166 a bien eu lieu pendant la préparation : c'est ce qui
    // garantit que la base sur laquelle Q4 s'applique est un état RÉEL de
    // production, pas un état intermédiaire fabriqué.
    const restes = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes WHERE status = 'SENT'`);
    expect(Number(restes[0]!.n), "le tri D166 n'a pas été appliqué à la préparation").toBe(1);
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

    // ⚠ L'ENTONNOIR NE DOIT PAS BOUGER. Q4 supprime une colonne sans rapport
    // avec lui ; si ce compte changeait, c'est que la migration a fait autre
    // chose que ce qu'elle annonce.
    const envoyesApres = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM quotes WHERE sent_at IS NOT NULL`
    );
    expect(envoyesApres).toEqual(envoyesAvant);
  });

  it("⚠ Q4 — la colonne a disparu, et RIEN d'autre", async () => {
    const colonne = await sql<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'quotes' AND column_name = 'valid_until'
    `);
    expect(colonne, "valid_until survit : le DROP COLUMN n'a pas eu lieu").toHaveLength(0);

    // ⚠ LES DEUX INDEX PARTIELS RESTENT, et l'assertion le fige. D165 les
    // inscrivait à ce lot ; ils y ont échappé pour deux raisons distinctes.
    // `quotes_one_sent_per_chain` contraint encore les lignes héritées de D166
    // et sert de TÉMOIN — le voir tomber signale un `prisma migrate dev` égaré,
    // lequel emporterait aussi l'anti-double-booking et la FK composite B2.
    // `quotes_one_accepted_per_chain` va REDEVENIR actif avec E3.
    const idx = await sql<{ indexname: string }>(`
      SELECT indexname FROM pg_indexes
       WHERE indexname IN ('quotes_one_sent_per_chain', 'quotes_one_accepted_per_chain')
       ORDER BY indexname
    `);
    expect(idx.map((r) => r.indexname)).toEqual([
      "quotes_one_accepted_per_chain",
      "quotes_one_sent_per_chain"
    ]);

    // ⚠ ET LE VERSIONNEMENT EST INTACT. D165 condamnait `chain_id`, `version` et
    // `parent_quote_id` avec `valid_until` ; la DÉCISION A les a retirées de ce
    // lot. Les voir disparaître signifierait qu'une migration a suivi la
    // doctrine périmée plutôt que la décision.
    const versionnement = await sql<{ column_name: string }>(`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'quotes' AND column_name IN ('chain_id', 'version', 'parent_quote_id')
       ORDER BY column_name
    `);
    expect(versionnement.map((r) => r.column_name)).toEqual(["chain_id", "parent_quote_id", "version"]);
  });

  it("⚠ D166 — le tri des SENT porte sur la RÉSERVATION, pas sur le statut seul", async () => {
    // Le semis : 1 DRAFT + 2 SENT, dont UN converti. Après migration, le SENT
    // sans réservation est redevenu DRAFT ; celui qui en porte une n'a PAS
    // bougé.
    //
    // ⚠ C'EST L'ÉCART ENTRE LES DEUX QUI PROUVE LA CLAUSE `WHERE`. Un
    // `UPDATE quotes SET status='DRAFT' WHERE status='SENT'` sans le `NOT
    // EXISTS` rendrait ÉDITABLE un devis qui adosse une réservation vivante —
    // c'est-à-dire que la migration violerait D163 elle-même, en silence, et
    // qu'un montant déjà accepté deviendrait modifiable.
    const restes = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes WHERE status = 'SENT'`);
    expect(Number(restes[0]!.n), "les SENT convertis devaient être conservés").toBe(1);

    const conserve = await sql<{ avec_booking: boolean }>(`
      SELECT EXISTS (SELECT 1 FROM bookings b WHERE b.quote_id = q.id) AS avec_booking
        FROM quotes q WHERE q.status = 'SENT'
    `);
    expect(conserve[0]!.avec_booking, "le SENT conservé n'est pas celui qui porte une réservation").toBe(true);

    // Et le versant inverse : celui qui n'en portait pas est bien redescendu.
    const brouillons = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes WHERE status = 'DRAFT'`);
    expect(Number(brouillons[0]!.n), "le SENT sans réservation devait redevenir DRAFT").toBe(2);
  });

  it("les objets du lot PRÉCÉDENT n'ont pas bougé, et aucun canal n'a été inventé", async () => {
    const colonne = await sql<{ is_nullable: string; data_type: string }>(
      `SELECT is_nullable, data_type FROM information_schema.columns
        WHERE table_name = 'quotes' AND column_name = 'sent_via'`
    );
    expect(colonne).toHaveLength(1);
    expect(colonne[0]!.is_nullable).toBe("YES");
    expect(colonne[0]!.data_type).toBe("text");

    // ⚠ AUCUNE REPRISE DE DONNÉES, ET C'EST LA DÉCISION LA PLUS VISIBLE DU LOT.
    // Les devis conservés en `SENT` gardent un canal NUL, donc SORTENT du
    // nouvel entonnoir (D162 compte sur `sent_via`). L'indicateur repart de
    // zéro. On ne sait pas par quoi ces devis sont partis, et le deviner
    // produirait un entonnoir qui a l'air juste — le pire des deux (D168).
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

  it("⚠ l'index partiel des SENT tient encore — la migration ne l'a pas emporté", async () => {
    // `quotes_one_sent_per_chain` devient INERTE (plus rien n'écrit SENT) mais
    // ne tombe qu'en Q4 (D165). Le voir disparaître ici signalerait qu'un
    // `prisma migrate dev` s'est glissé dans le dépôt.
    const idx = await sql<{ indexname: string }>(
      `SELECT indexname FROM pg_indexes WHERE indexname = 'quotes_one_sent_per_chain'`
    );
    expect(idx, "index partiel disparu : un migrate dev est passé par là").toHaveLength(1);
  });
});
