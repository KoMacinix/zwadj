/**
 * T3 / B9 — LA DERNIÈRE MIGRATION, APPLIQUÉE SUR UNE BASE NON VIDE (D123).
 *
 * ⚠ CE QUE `test:int` NE PEUT PAS VOIR.
 * Son `globalSetup` fait `DROP DATABASE` puis rejoue TOUTES les migrations sur
 * du VIDE.
 * ⛔ CE PASSAGE A PORTÉ « les 20 migrations » JUSQU'AU 09/09/2026 (D282). Il y en
 * avait 26 le jour du relevé. **Compteur RETIRÉ, pas rafraîchi** : un nombre qui
 * bouge à chaque lot se recopie longtemps après avoir cessé d'être vrai (D268,
 * puis trois lots consécutifs l'ont payé). Pour le compte du jour :
 * `ls apps/api/prisma/migrations`. Toute la classe de défauts qui n'existe qu'en présence de données lui
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
// ⛔ Rang 39 (D333) — LA MIGRATION DE D282 EST ÉPINGLÉE PAR SON NOM. Ce fichier suivait « la dernière migration » ; deux migrations (la numérotation des salles et des devis) la suivent
// maintenant, et le semis d'agrégats FAUX de D282 ne peut vivre QUE tant qu'elle n'est pas appliquée. Les tests D282 restent donc pointés sur ELLE (préparation = tout ce qui la précède) ;
// les migrations du lot sont mesurées par le bloc « L35-3 » en bas de ce fichier, qui commence par rendre le semis cohérent et appliquer D282.
const NOM_D282 = "20260909120000_booking_quote_total_coherent";
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
    // ⛔ UN `DROP DATABASE` BLOQUÉ MANGEAIT LES 60 s DU HOOK SANS RIEN DIRE,
    // et les sept tests de ce fichier étaient SAUTÉS — y compris la garde de
    // migration, qui est la seule à prouver qu'une migration passe sur une
    // base ayant déjà servi. Un échec muet coûte plus cher qu'un échec.
    await c.query("SET statement_timeout = '20s'");

    // ⚠ QUI OCCUPE LA BASE, relevé AVANT de la libérer : c'est cette liste
    // qui nommera le coupable au prochain blocage. `WITH (FORCE)` termine
    // déjà les sessions, mais il le fait en silence — et s'il n'y arrive pas,
    // il attend.
    const occupants = await c.query<{ pid: number; application_name: string; state: string }>(
      `SELECT pid, application_name, state FROM pg_stat_activity
        WHERE datname = $1 AND pid <> pg_backend_pid()`,
      [DB]
    );
    if (occupants.rows.length > 0) {
      await c.query(
        `SELECT pg_terminate_backend(pid) FROM pg_stat_activity
          WHERE datname = $1 AND pid <> pg_backend_pid()`,
        [DB]
      );
    }

    try {
      await c.query(`DROP DATABASE IF EXISTS "${DB}" WITH (FORCE)`);
    } catch (error) {
      throw new Error(
        `DROP DATABASE "${DB}" refusé ou expiré (statement_timeout 20 s). ` +
          `Occupants relevés juste avant : ${JSON.stringify(occupants.rows)}. ` +
          `Cause : ${(error as Error).message}`
      );
    }
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
 * `20260814140000_quote_delivery_switch`, puis Q4, puis E3d-1.
 * ⚠ LA DERNIÈRE MIGRATION N'EST PLUS NOMMÉE ICI, MÊME REMÈDE QUE CI-DESSUS
 * (D282) : ce nom changeait à chaque lot, et il était faux depuis deux. Elle se
 * relève — `ls apps/api/prisma/migrations | tail -1`.
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

  // ⛔ UN DEVIS DONT L'AGRÉGAT EST FAUX — SEMÉ EXPRÈS (D282).
  // `total_cents` vaut `base + services + 100`. Rien ne l'empêche à ce stade :
  // `quotes_amounts_valid` ne regarde que les signes et `deposit <= total`. C'est
  // le trou que MD2 nommait, et que la cible 8 de `neutralize-s11b.py` a fait
  // OBSERVER le 08/09 — des lignes incohérentes entrées en base, 36 fichiers
  // d'intégration verts.
  //
  // ⚠ IL EST `SENT`, ET CE N'EST PAS INDIFFÉRENT — MESURÉ, PAS SUPPOSÉ (D282).
  // Mon premier jet le posait en `DRAFT` sans `sent_at`, c'est-à-dire sur LA
  // ligne exacte que la garde R4 met à jour plus bas. La neutralisation de la
  // migration l'a montré : sous mutation, la contrainte existante refusait cet
  // `UPDATE`, et la campagne rendait DEUX rouges dont un collatéral. Une cible
  // qui produit deux rouges ne dit plus lequel mesure quoi (D209, « mesure
  // confondue »). Le devis violant est donc tenu à l'écart des lignes que les
  // autres gardes manipulent.
  await sql(`
    INSERT INTO quotes (id, venue_id, status, version, chain_id, event_date, guests,
                        base_price_cents, services_total_cents, total_cents, deposit_cents,
                        lines, sent_at, created_at)
    SELECT uuidv7(), v.id, 'SENT'::"QuoteStatus", 1, uuidv7(), current_date + 40, 100,
           150000000, 0, 150000100, 45000000, '[]'::jsonb, now() - interval '3 days', now()
      FROM venues v LIMIT 1
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

  // ⛔ UNE RÉSERVATION DONT L'AGRÉGAT EST FAUX — SEMÉE EXPRÈS (D282).
  // Même écart de 100 centimes, côté réservation. C'est CETTE ligne qui doit
  // arrêter la dernière migration : elle est la raison d'être du semis, et le
  // contrôle de validité posé plus bas vérifie qu'elle viole RÉELLEMENT — un
  // semis qui ne viole rien rendrait le rouge attendu sans objet.
  // ⚠ Statut PENDING : l'EXCLUDE ne porte que sur ACCEPTED/CONFIRMED, cette ligne
  // ne peut donc pas entrer en conflit de plage avec la précédente.
  //
  // ⛔ CE SEMIS A UNE DURÉE DE VIE, ET ELLE SE TERMINE AU PROCHAIN LOT QUI
  // AJOUTERA UNE MIGRATION (écrit d'avance, D282). Ces deux lignes ne peuvent
  // être insérées que TANT QUE la contrainte d'agrégat n'est pas encore posée —
  // c'est-à-dire tant que `20260909120000` ferme la marche. Dès qu'une migration
  // la suit, celle-ci s'applique en PRÉPARATION et la base REJETTE ce semis, tout
  // comme elle rejette aujourd'hui le semis à trois `PENDING` d'E3d-1.
  // ⇒ Ce n'est pas une négligence de ce lot : c'est le défaut de conception du
  // harnais, rapporté au backlog (D282). Il est écrit ICI pour que la session
  // suivante le lise AVANT de chercher la cause dans son propre code.
  // ⚠ VALEURS RELEVÉES DANS `pg_enum`, PAS ÉCRITES DE MÉMOIRE (D282) : mon
  // premier jet posait `source = 'ONLINE'` et la base a répondu
  // « invalid input value for enum "BookingSource" ». Les valeurs réelles sont
  // `BookingSource = CLIENT | WALK_IN` et `PaymentMethod = ONLINE | CASH` — deux
  // énumérations voisines dont UNE SEULE porte `ONLINE`.
  await sql(`
    INSERT INTO bookings (id, venue_id, source, status, payment_method,
                          event_date, starts_at, ends_at, guests,
                          base_price_cents, services_total_cents, total_cents, deposit_cents,
                          contact_first_name, contact_last_name, contact_phone, created_at, updated_at)
    SELECT uuidv7(), v.id, 'CLIENT', 'PENDING', 'ONLINE',
           current_date + 60, (current_date + 60)::timestamptz,
           (current_date + 60)::timestamptz + interval '6 hours', 100,
           150000000, 0, 150000100, 45000000,
           'Nadia', 'Cherif', '+213550000002', now(), now()
      FROM venues v LIMIT 1
  `);

  // ⛔ LE SEMIS À TROIS INTENTIONS « EN ATTENTE » EST RETIRÉ — ÉCRIT ICI, PAS
  // DISPARU (D282, patron exact du retrait de la sonde D166 au lot R4).
  //
  // CE QU'IL SEMAIT : trois `payments` PENDING sur la MÊME réservation, à la
  // MÊME microseconde — l'état d'un déploiement où la course d'E3d-1 a déjà eu
  // lieu, et le seul sur lequel son `CREATE UNIQUE INDEX` pouvait échouer.
  //
  // POURQUOI IL NE PEUT PLUS VIVRE : E3d-1 n'est plus la dernière migration.
  // Elle s'applique désormais pendant la PRÉPARATION, donc AVANT ce semis, et
  // son index unique partiel `payments_one_pending_per_booking` REJETTE la
  // deuxième ligne. Ce semis ne devient pas inutile : il devient IMPOSSIBLE.
  //
  // ⛔ CE QU'ON PERD, ET IL FAUT LE DIRE : plus rien ne mesure le NETTOYAGE
  // d'E3d-1 — le départage sur le couple `(created_at, id)`, et les doublons
  // EXPIRÉS plutôt que supprimés. Cette garantie n'a plus de base non vide à
  // doublons où se prouver, et elle n'en aura plus JAMAIS dans ce harnais.
  // ⇒ La regagner demande un harnais qui sème AVANT une migration CHOISIE, pas
  // avant la dernière — autre chose que B9/D123. Ce fichier le dit déjà pour la
  // sonde D166 : « à inscrire au backlog, pas à improviser ici ». Fait (D282).
  //
  // ⚠ UNE SEULE INTENTION SUBSISTE, sur la réservation cohérente : elle sert aux
  // comptes de lignes, plus au départage.
  await sql(`
    INSERT INTO payments (id, booking_id, amount_cents, discount_applied_cents, status, updated_at, created_at)
    SELECT uuidv7(), b.id, b.deposit_cents, 0, 'PENDING', now(), now()
      FROM bookings b WHERE b.quote_id IS NOT NULL
  `);
}

beforeAll(async () => {
  await recreerBase();
});

describe("B9 — la dernière migration sur une base NON VIDE (D123)", () => {
  it("prépare une base à l'avant-dernière migration, puis la sème", async () => {
    expect(migrationsOrdonnees().length).toBeGreaterThan(1);

    const toutes = migrationsOrdonnees();
    expect(toutes.includes(NOM_D282), "la migration de D282 a changé de nom ou disparu").toBe(true);
    await appliquerMigrations(toutes.slice(0, toutes.indexOf(NOM_D282)));

    await semerDonnees();
    const semees = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM refresh_tokens`);
    expect(Number(semees[0]!.n)).toBe(12);
    const devis = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes`);
    // ⚠ QUATRE, ET NON TROIS DEPUIS D282 : le quatrième est le devis dont
    // l'agrégat est faux. Le compte est écrit en clair plutôt que `> 0` — un
    // semis qui perdrait une ligne se verrait ici, pas trois lots plus tard.
    expect(Number(devis[0]!.n), "sans devis semés, la migration s'appliquerait sur du vide").toBe(4);

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
    // ⚠ QUATRIÈME CHANGEMENT DE SONDE EN CINQ LOTS, et toujours pour la même
    // raison : la sonde doit décrire ce que fait LA dernière migration, et
    // celle-ci change à chaque lot. R4 ajoute `CANCELLED` au TYPE — donc à
    // l'avant-dernière migration, la valeur n'existe PAS encore.
    // ⚠ CINQUIÈME CHANGEMENT DE SONDE EN SIX LOTS, même raison que les quatre
    // précédents : la sonde décrit ce que fait LA dernière migration, et
    // celle-ci change à chaque lot. E3d-1 crée un index unique partiel — donc
    // à l'avant-dernière migration, il n'existe PAS.
    // ⚠ SIXIÈME CHANGEMENT DE SONDE EN SEPT LOTS (D282), même raison que les
    // cinq précédents : la sonde décrit ce que fait LA dernière migration, et
    // celle-ci change à chaque lot. L'ancienne portait sur l'index d'E3d-1, qui
    // s'applique désormais pendant la PRÉPARATION — il EXISTE ici, et la sonde
    // aurait rougi sans rien mesurer.
    // ⛔ CE N'EST PLUS UN ACCIDENT, C'EST UN DÉFAUT DE CONCEPTION du harnais :
    // rapporté au backlog comme tel, PAS corrigé ici (un seul lot à la fois).
    const contrainte = await sql<{ conname: string }>(`
      SELECT conname FROM pg_constraint WHERE conname = 'bookings_total_coherent'
    `);
    expect(
      contrainte,
      "la contrainte de D282 existe déjà : la dernière migration est appliquée, le test ne prouverait rien"
    ).toHaveLength(0);

    // ⛔ CONTRÔLE DE VALIDITÉ DU SEMIS — ET IL NE REMPLACE PAS LE ROUGE ATTENDU.
    // Posé sur arbitrage de Ko, avec son motif écrit : poser le prédicat à la
    // main et exiger que PostgreSQL refuse est VERT DÈS AUJOURD'HUI, avant
    // qu'aucune migration n'existe — un `ADD CONSTRAINT CHECK` sur une table
    // portant une ligne incohérente lève TOUJOURS. Ce contrôle mesure donc le
    // SEMIS, jamais la garantie.
    // ⇒ Sa vertu est unique et décisive : s'il devenait vert-muet — l'ajout
    // PASSE — c'est que plus rien ne viole, et le rouge de la migration plus bas
    // ne prouverait alors plus rien.
    const violantes = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM bookings
        WHERE total_cents <> base_price_cents + services_total_cents`
    );
    expect(Number(violantes[0]!.n), "le semis ne porte AUCUNE ligne incohérente").toBeGreaterThan(0);

    let refus: (Error & { code?: string }) | null = null;
    try {
      await sql(
        `ALTER TABLE bookings ADD CONSTRAINT tmp_controle_semis_d282
           CHECK (total_cents = base_price_cents + services_total_cents)`
      );
    } catch (error) {
      refus = error as Error & { code?: string };
    }
    // ⚠ Le refus est attendu, donc rien n'est laissé derrière : une contrainte
    // rejetée n'est pas créée. Le nom `tmp_` ne survit à aucun cas de figure.
    expect(refus, "PostgreSQL a ACCEPTÉ la contrainte : le semis ne viole rien").not.toBeNull();
    expect(refus!.code, "refus obtenu, mais PAS par une violation de CHECK (23514)").toBe("23514");

    // ⚠ LA SONDE D166 A ÉTÉ RETIRÉE, ET C'EST DÉLIBÉRÉ (lot R4).
    // Elle exigeait `1` devis `SENT` après le semis, c'est-à-dire l'EFFET du
    // tri D166 sur les lignes semées. Or ce tri s'applique désormais pendant la
    // PRÉPARATION — donc sur une base encore VIDE, avant le semis. Il ne peut
    // plus rien trier, et `2` est la valeur juste. La garde survivait à son
    // objet : elle ne mesurait plus le tri, elle mesurait un monde disparu.
    // Le semis des deux cas `SENT` reste, lui : il sert au comptage de lignes
    // ci-dessous, comme l'annonce déjà le commentaire de `semerDonnees`.
  });

  it("⛔ D282 — la dernière migration REFUSE une base incohérente, et ne laisse RIEN", async () => {
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

    // ⛔ C'EST ICI QUE LE LOT SE MESURE, ET LE ROUGE VIENT DE L'ABSENCE DE LA
    // MIGRATION — pas d'un prédicat qu'on poserait soi-même.
    // Tant que la contrainte d'agrégat n'est pas écrite, la dernière migration
    // s'applique sans broncher sur une base portant une réservation dont
    // `total <> base + services` : `erreur` reste nulle et CE TEST TOMBE. C'est
    // le rouge demandé, et il dit exactement ce qui manque.
    // ⚠ Une fois la migration écrite, le refus doit venir d'une VIOLATION DE
    // CHECK (SQLSTATE 23514) et NOMMER la contrainte — un refus obtenu pour une
    // autre raison (table absente, syntaxe) serait un vert creux déguisé en
    // rouge utile.
    let erreur: (Error & { code?: string }) | null = null;
    try {
      await appliquerMigrations([NOM_D282]);
    } catch (error) {
      erreur = error as Error & { code?: string };
    }
    expect(
      erreur,
      "la dernière migration s'est APPLIQUÉE sur une base portant une ligne incohérente"
    ).not.toBeNull();
    expect(erreur!.code, "refus obtenu, mais PAS par une violation de CHECK (23514)").toBe("23514");
    expect(
      erreur!.message,
      "le refus ne nomme pas la contrainte : impossible de dire ce qui a arrêté le déploiement"
    ).toContain("bookings_total_coherent");

    const apres = await sql<{ table_name: string; n: string }>(`
      SELECT 'users' AS table_name, count(*)::text AS n FROM users
      UNION ALL SELECT 'refresh_tokens', count(*)::text FROM refresh_tokens
      UNION ALL SELECT 'quotes', count(*)::text FROM quotes
      UNION ALL SELECT 'wilayas', count(*)::text FROM wilayas
      UNION ALL SELECT 'cities', count(*)::text FROM cities
      ORDER BY 1
    `);
    // ⛔ ET LA MIGRATION REFUSÉE NE LAISSE RIEN DERRIÈRE ELLE. C'est la seconde
    // moitié de la garantie, et elle vaut autant que la première : un fichier de
    // migration s'exécute dans une transaction implicite, donc un `ALTER TABLE`
    // rejeté doit rendre la base EXACTEMENT dans l'état où il l'a trouvée. Une
    // migration qui échoue à mi-course en ayant déjà supprimé quelque chose est
    // le cas que `AGENTS.md` décrit sur `migrate dev` — « ce qu'elle a supprimé
    // AVANT l'échec n'est pas rendu ».
    // ⚠ Une migration qui recrée une table au lieu de l'altérer se voit aussi
    // ICI, et nulle part ailleurs dans le dépôt.
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

    // ⛔ ET AUCUNE DES DEUX CONTRAINTES N'A SURVÉCU À L'ÉCHEC. Si celle des
    // devis était posée pendant que celle des réservations tombe, la base
    // sortirait à moitié migrée — l'état qu'aucune reprise ne sait diagnostiquer.
    const posees = await sql<{ conname: string }>(`
      SELECT conname FROM pg_constraint
       WHERE conname IN ('bookings_total_coherent', 'quotes_total_coherent')
    `);
    expect(posees, "une contrainte a survécu à une migration refusée").toHaveLength(0);
  });

  it("⚠ E3d-1 — l'index EXISTE ; son départage n'est plus mesurable ici (D282)", async () => {
    // ⚠ CE COMMENTAIRE ÉTAIT EXACT JUSQU'AU 09/09/2026, IL NE L'EST PLUS QU'À
    // MOITIÉ (D282). Il disait : « c'est la VRAIE migration qui s'applique, sur
    // des données semées, par le même chemin qu'en production ; si son nettoyage
    // ne départage pas complètement, le `CREATE UNIQUE INDEX` échoue et ce test
    // tombe ». ⛔ La seconde moitié est morte avec le semis à doublons : E3d-1
    // s'applique désormais en PRÉPARATION, sur une table `payments` vide, donc
    // son `CREATE UNIQUE INDEX` ne peut plus échouer ici quoi qu'il arrive.
    // ⚠ CE QUI RESTE VRAI, et c'est pour cela que le test survit : c'est bien la
    // VRAIE migration qui pose cet index, pas un `CREATE INDEX` écrit à la main
    // dans un test — ce que `payment-intent-race` ne peut pas dire. La FORME de
    // l'index reste donc mesurée par le chemin de production ; son EFFET, non.
    const idxPaiement = await sql<{ indexdef: string }>(`
      SELECT indexdef FROM pg_indexes WHERE indexname = 'payments_one_pending_per_booking'
    `);
    expect(idxPaiement, "l'index de E3d-1 n'a pas été créé").toHaveLength(1);
    expect(idxPaiement[0]!.indexdef).toContain("UNIQUE");
    expect(idxPaiement[0]!.indexdef).toContain("PENDING");

    // ⛔ TROIS ASSERTIONS ONT ÉTÉ RETIRÉES ICI LE 09/09/2026 (D282), PAR ÉCRIT ET
    // NON PAR SOURDINE — patron du retrait de la sonde D166 au lot R4.
    //
    // CE QU'ELLES MESURAIENT : le NETTOYAGE d'E3d-1 sur une base ayant déjà
    // couru — `1` intention survivante (le départage sur le couple
    // `(created_at, id)`, nécessaire parce que trois lignes partageaient la même
    // microseconde), `2` doublons EXPIRÉS et non supprimés (un `DELETE` au lieu
    // d'un `UPDATE` effacerait des traces de paiement), `3` lignes au total
    // (aucune disparue).
    //
    // POURQUOI ELLES NE MESURENT PLUS RIEN : E3d-1 n'est plus la dernière
    // migration. Elle s'applique pendant la PRÉPARATION, sur une table
    // `payments` encore VIDE — son nettoyage n'a plus rien à départager, et son
    // index rend le semis à doublons impossible (voir `semerDonnees`). Les
    // garder les rendrait vertes en ne mesurant rien : c'est le vert creux que
    // ce fichier existe pour attraper.
    //
    // ⛔ CE N'EST PAS UN NETTOYAGE, C'EST UNE PERTE, ET ELLE EST DÉFINITIVE DANS
    // CE HARNAIS. La garantie de nettoyage d'E3d-1 n'aura plus jamais de base
    // non vide à doublons où se prouver. Ce qui la regagnerait — semer avant une
    // migration CHOISIE plutôt qu'avant la dernière — est autre chose que
    // B9/D123 : rapporté au backlog (D282), pas improvisé ici.
    // ⚠ Ce qui reste mesuré ci-dessus est la FORME de l'index (unique, partiel
    // sur PENDING), pas l'effet de son nettoyage. Les deux ne se remplacent pas.
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

  it("⚠ R4 — un BROUILLON JAMAIS REMIS peut être clos : les DEUX défauts sont fermés", async () => {
    // Deux défauts empilés fermés par deux migrations, et cette garde les
    // mesure ensemble parce qu'ils se manifestaient par le MÊME 500 :
    //   1. `CANCELLED` absent du type PostgreSQL (22P02) ;
    //   2. `quotes_sent_at_coherent` refusant un CANCELLED sans `sent_at`.
    const labels = await sql<{ labels: string }>(`
      SELECT string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) AS labels
        FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid
       WHERE t.typname = 'QuoteStatus'
    `);
    expect(labels[0]!.labels.split(","), "défaut 1 — le type ignore encore CANCELLED").toContain("CANCELLED");

    // ⚠ PRÉSENT NE SUFFIT PAS. On ÉCRIT la valeur, et sur LE cas qui tombait :
    // le devis semé en DRAFT a `sent_at` NUL — un brouillon jamais remis, ce
    // que la borne d'origine tenait pour impossible. Écrire sur une ligne
    // « propre » aurait laissé le second défaut intact et la garde verte.
    const brouillons = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM quotes WHERE status = 'DRAFT' AND sent_at IS NULL`
    );
    expect(Number(brouillons[0]!.n), "sans brouillon NON REMIS semé, cette garde ne mesure rien").toBeGreaterThan(0);

    await sql(`UPDATE quotes SET status = 'CANCELLED' WHERE status = 'DRAFT' AND sent_at IS NULL`);
    const clos = await sql<{ n: string }>(
      `SELECT count(*)::text AS n FROM quotes WHERE status = 'CANCELLED' AND sent_at IS NULL`
    );
    expect(Number(clos[0]!.n), "défaut 2 — le CHECK refuse encore la clôture d'un brouillon").toBeGreaterThan(0);
  });

  // ⚠ LA GARDE D166 A ÉTÉ RETIRÉE ICI AU LOT R4, PAR ÉCRIT ET NON PAR SOURDINE.
  //
  // Elle mesurait l'effet du tri D166 sur des lignes semées : `1` SENT conservé
  // (celui qui adosse une réservation), `2` redevenus DRAFT. Ce que ce harnais
  // mesure, c'est la DERNIÈRE migration appliquée à une base non vide — et
  // D166 a cessé d'être la dernière. Elle s'exécute désormais pendant la
  // préparation, sur une base encore VIDE : elle ne trie plus rien, et la
  // garde exigeait un écart que plus aucune migration ne produit.
  //
  // Elle a été mise en `skip` un instant pendant ce lot : c'était une erreur.
  // Une garde en sourdine se lit comme une garde, se compte comme un fichier,
  // et ne mesure rien — le pire des trois états. L'objet a disparu, la garde
  // part avec lui.
  //
  // ⚠ CE QU'ON PERD, et il faut le dire : plus rien ne vérifie que la clause
  // `NOT EXISTS` de D166 épargne les devis convertis. Le regagner demanderait
  // un harnais qui sème AVANT une migration choisie, pas avant la dernière —
  // autre chose que B9/D123. À inscrire au backlog, pas à improviser ici.

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

// ══ RANG 39 (D333, L35-3) — LA NUMÉROTATION, SUR UNE BASE NON VIDE (D123) ═════════════════════════════════════════════════════════════════════════════
// Les deux migrations du lot (`venue_number`, `quote_reference`) suivent celle de D282. Le semis de D282 (des lignes d'agrégat FAUX) ne peut plus vivre « avant la dernière migration » :
// D282 s'applique désormais pendant la PRÉPARATION de CES tests-ci. Ce bloc commence donc par RENDRE COHÉRENTES les deux lignes fautives, applique D282 (qui doit ALORS passer — un
// second cas, jamais mesuré), sème les salles et les devis du lot, puis applique les migrations de numérotation UNE PAR UNE.
// ⚠ L'ATTENDU EST DÉRIVÉ DU SEMIS, par un algorithme écrit ICI et indépendant du SQL de la migration (un `row_number()` recopié se validerait lui-même) : l'ordre `created_at, id`,
// l'année d'ALGER (UTC + 1) de la date de création, le départage par identifiant sur des dates identiques.

/** L'année d'Alger d'un instant (D48 : UTC + 1, sans heure d'été) — l'algorithme du TEST, volontairement distinct de `algiersYear` et du SQL de la migration. */
const anneeAlger = (instant: Date): number => new Date(instant.getTime() + 3_600_000).getUTCFullYear();

describe("L35-3 — la numérotation des salles et des devis sur une base NON VIDE", () => {
  interface SalleSemee { id: string; slug: string; creeLe: string; supprimee: boolean }
  interface DevisSeme { id: string; salle: string; creeLe: string; chaine: string | null; version: number }
  const ID = (n: number) => `018f0000-0000-7000-8000-${String(n).padStart(12, "0")}`;
  // Trois salles (dont une SUPPRIMÉE) ; deux ont la MÊME date de création (le départage se fait par identifiant, et l'identifiant le plus PETIT est écrit en DEUXIÈME exprès : un
  // départage oublié ou inversé s'y verrait).
  const SALLES: SalleSemee[] = [
    { id: ID(300), slug: "s-la-plus-ancienne", creeLe: "2026-01-10T09:00:00Z", supprimee: true },
    { id: ID(902), slug: "s-egalite-b", creeLe: "2026-03-01T08:00:00Z", supprimee: false },
    { id: ID(901), slug: "s-egalite-a", creeLe: "2026-03-01T08:00:00Z", supprimee: false }
  ];
  // Les devis : têtes (version 1, `chaine` = null ⇒ chain_id = id) et révisions. Dates aux BORNES de l'année d'Alger : 22 h 59 UTC (2026) et 23 h 00 UTC (2027) le 31/12 ; deux têtes à la
  // même seconde (départage par id) ; une chaîne de trois versions dont la v2 est écrite l'année SUIVANTE.
  const DEVIS: DevisSeme[] = [
    { id: ID(1002), salle: ID(901), creeLe: "2026-12-31T22:59:59Z", chaine: null, version: 1 },
    { id: ID(1001), salle: ID(901), creeLe: "2026-12-31T22:59:59Z", chaine: null, version: 1 },
    { id: ID(1003), salle: ID(901), creeLe: "2026-12-31T23:00:00Z", chaine: null, version: 1 },
    { id: ID(1004), salle: ID(901), creeLe: "2026-05-04T10:00:00Z", chaine: null, version: 1 },
    { id: ID(1005), salle: ID(901), creeLe: "2027-01-10T10:00:00Z", chaine: ID(1004), version: 2 },
    { id: ID(1006), salle: ID(901), creeLe: "2027-02-10T10:00:00Z", chaine: ID(1004), version: 3 },
    { id: ID(1007), salle: ID(902), creeLe: "2026-06-01T10:00:00Z", chaine: null, version: 1 },
    { id: ID(1008), salle: ID(300), creeLe: "2026-02-01T10:00:00Z", chaine: null, version: 1 }
  ];
  let suite: string[] = [];

  it("prépare : rend cohérentes les deux lignes fautives de D282, applique D282 (qui PASSE désormais), sème les salles et les devis du lot", async () => {
    const toutes = migrationsOrdonnees();
    const i282 = toutes.indexOf(NOM_D282);
    suite = toutes.slice(i282 + 1);
    // ⛔ Rang 42 (D337) : la migration de L36-1 (`booking_contact_phone_optional`) SUIT celle de L35-4 ; elle est mesurée par son propre bloc, en bas de ce fichier — et ce bloc-ci n'en applique aucune.
    // ⛔ Rang 41 (D336) : la migration de L35-4 (`pro_client_records`) SUIT celles de L35-3 — elle est mesurée par son propre bloc, en bas de ce fichier ; ce bloc-ci n'applique que `suite[0]` et `suite[1]`.
    // ⚠ `expect.soft` : le test ROUGIT si un lot de plus arrive, mais la préparation CONTINUE — sinon M-A et M-B, dont le comportement ne change pas, tomberaient en cascade.
    expect.soft(suite.map((n) => n.replace(/^\d+_/u, "")), "les migrations qui SUIVENT D282 sont celles de L35-3, de L35-4 puis de L36-1 : un lot de plus doit re-pointer ce bloc").toEqual(["venue_number", "quote_reference", "pro_client_records", "booking_contact_phone_optional"]);

    // D282 refusait l'agrégat faux (test précédent) : on rend les deux lignes cohérentes, puis on l'applique — le chemin FAVORABLE, que ce fichier n'avait jamais joué.
    await sql(`UPDATE bookings SET total_cents = base_price_cents + services_total_cents WHERE total_cents <> base_price_cents + services_total_cents`);
    await sql(`UPDATE quotes SET total_cents = base_price_cents + services_total_cents WHERE total_cents <> base_price_cents + services_total_cents`);
    await appliquerMigrations([NOM_D282]);
    const posees = await sql<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conname IN ('bookings_total_coherent', 'quotes_total_coherent') ORDER BY conname`);
    expect(posees.map((r) => r.conname), "D282 s'est appliquée sur une base cohérente").toEqual(["bookings_total_coherent", "quotes_total_coherent"]);

    // Le semis du lot : on SUPPRIME les salles et devis du semis général (ils ne portent pas les dates voulues), puis on sème les nôtres.
    await sql(`DELETE FROM payments; DELETE FROM bookings; DELETE FROM quotes; DELETE FROM venues;`);
    for (const s of SALLES) {
      await sql(
        `INSERT INTO venues (id, owner_id, city_id, slug, name_fr, name_ar, capacity_max, base_price_cents, publication_status, created_at, updated_at, deleted_at)
         SELECT $1::uuid, p.id, c.id, $2, 'Salle', 'قاعة', 300, 150000000, 'PUBLISHED', $3::timestamptz, $3::timestamptz, CASE WHEN $4::boolean THEN now() ELSE NULL END
           FROM pro_profiles p CROSS JOIN cities c LIMIT 1`,
        [s.id, s.slug, s.creeLe, s.supprimee]
      );
    }
    for (const d of DEVIS) {
      await sql(
        `INSERT INTO quotes (id, venue_id, status, version, chain_id, parent_quote_id, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines, created_at)
         VALUES ($1::uuid, $2::uuid, 'DRAFT', $3, COALESCE($4::uuid, $1::uuid), $4::uuid, current_date + 30, 100, 150000000, 0, 150000000, 45000000, '[]'::jsonb, $5::timestamptz)`,
        [d.id, d.salle, d.version, d.chaine, d.creeLe]
      );
    }
    const n = await sql<{ salles: string; devis: string; supprimees: string }>(
      `SELECT (SELECT count(*) FROM venues)::text AS salles, (SELECT count(*) FROM quotes)::text AS devis, (SELECT count(*) FROM venues WHERE deleted_at IS NOT NULL)::text AS supprimees`
    );
    expect(n[0], "sans salles (dont une SUPPRIMÉE) ni devis semés, la migration s'appliquerait sur du vide").toEqual({ salles: String(SALLES.length), devis: String(DEVIS.length), supprimees: "1" });
    // garde-fou : les migrations du lot ne sont PAS encore appliquées
    const colonne = await sql(`SELECT 1 FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'number'`);
    expect(colonne, "la colonne `number` existe déjà : le test ne prouverait rien").toHaveLength(0);
  });

  it("⛔ M-A — toutes les salles, SUPPRIMÉES comprises, sont numérotées dans l'ordre de création, départage par identifiant ; la séquence repart du maximum", async () => {
    await appliquerMigrations([suite[0]!]);
    const attendu = [...SALLES]
      .sort((a, b) => new Date(a.creeLe).getTime() - new Date(b.creeLe).getTime() || (a.id < b.id ? -1 : 1))
      .map((s, i) => ({ id: s.id, number: i + 1 }));
    const lu = await sql<{ id: string; number: number }>(`SELECT id, number FROM venues ORDER BY number`);
    expect(lu.map((r) => ({ id: r.id, number: r.number }))).toEqual(attendu);
    // la salle supprimée porte bien un numéro, et c'est le premier (la plus ancienne)
    expect(attendu[0]!.id).toBe(ID(300));
    // …et l'égalité de dates est départagée par l'identifiant : 901 avant 902, alors que 902 est écrit avant dans le semis
    expect(attendu.map((a) => a.id)).toEqual([ID(300), ID(901), ID(902)]);

    // la séquence repart du MAXIMUM : la prochaine salle prend max + 1, sans heurter une salle existante
    // `resolves` : un `setval` en retard ferait entrer la salle neuve en collision (23505) ; sous `resolves` ce refus est une ASSERTION, pas une erreur de requête (D305).
    await expect(
      sql(
        `INSERT INTO venues (id, owner_id, city_id, slug, name_fr, name_ar, capacity_max, base_price_cents, publication_status, created_at, updated_at)
         SELECT uuidv7(), owner_id, city_id, 'neuve', 'Neuve', 'جديدة', 100, 100, 'PUBLISHED', now(), now() FROM venues LIMIT 1`
      )
    ).resolves.toBeDefined();
    const neuve = await sql<{ number: number }>(`SELECT number FROM venues WHERE slug = 'neuve'`);
    expect(neuve[0]!.number).toBe(SALLES.length + 1);
    await sql(`DELETE FROM venues WHERE slug = 'neuve'`);

    // les garanties : NOT NULL, défaut, unicité, immuabilité
    const col = await sql<{ is_nullable: string; column_default: string | null }>(`SELECT is_nullable, column_default FROM information_schema.columns WHERE table_name = 'venues' AND column_name = 'number'`);
    expect(col[0]!.is_nullable).toBe("NO");
    expect(col[0]!.column_default ?? "").toContain("venue_number_seq");
    await expect(sql(`UPDATE venues SET number = number + 100`)).rejects.toThrow(/immuable/iu);
  });

  it("⛔ M-B — les devis existants sont numérotés par (salle, ANNÉE D'ALGER) dans l'ordre de création ; les révisions recopient leur tête ; les compteurs valent le maximum", async () => {
    await appliquerMigrations([suite[1]!]);
    const tetes = DEVIS.filter((d) => d.version === 1);
    const groupes = new Map<string, DevisSeme[]>();
    for (const d of tetes) {
      const cle = `${d.salle}|${anneeAlger(new Date(d.creeLe))}`;
      groupes.set(cle, [...(groupes.get(cle) ?? []), d]);
    }
    const attendu = new Map<string, { annee: number; numero: number }>();
    for (const [cle, liste] of groupes) {
      liste.sort((a, b) => new Date(a.creeLe).getTime() - new Date(b.creeLe).getTime() || (a.id < b.id ? -1 : 1));
      liste.forEach((d, i) => attendu.set(d.id, { annee: Number(cle.split("|")[1]), numero: i + 1 }));
    }
    for (const d of DEVIS.filter((x) => x.version > 1)) attendu.set(d.id, attendu.get(d.chaine!)!);

    const lu = await sql<{ id: string; reference_year: number; reference_number: number }>(`SELECT id, reference_year, reference_number FROM quotes`);
    const obtenu = new Map(lu.map((r) => [r.id, { annee: r.reference_year, numero: r.reference_number }]));
    expect(Object.fromEntries(obtenu)).toEqual(Object.fromEntries(attendu));

    // les cas qui comptent, nommés (l'attendu ci-dessus les contient, ceci les rend lisibles à l'échec)
    expect(obtenu.get(ID(1001)), "à égalité de date : l'identifiant le plus petit prend le numéro le plus petit").toEqual({ annee: 2026, numero: 2 });
    expect(obtenu.get(ID(1002))).toEqual({ annee: 2026, numero: 3 });
    expect(obtenu.get(ID(1003)), "23 h 00 UTC le 31/12 est déjà l'ANNÉE SUIVANTE à Alger").toEqual({ annee: 2027, numero: 1 });
    expect(obtenu.get(ID(1005)), "une révision écrite l'année suivante garde l'année de sa tête").toEqual(obtenu.get(ID(1004)));
    expect(obtenu.get(ID(1006))).toEqual(obtenu.get(ID(1004)));

    // les compteurs = le maximum par (salle, année) ; une ligne par groupe, et AUCUNE de plus
    const compteurs = await sql<{ venue_id: string; year: number; last_number: number }>(`SELECT venue_id, year, last_number FROM quote_number_counters ORDER BY venue_id, year`);
    const maxi = new Map<string, number>();
    for (const [id, v] of attendu) {
      const d = DEVIS.find((x) => x.id === id)!;
      if (d.version !== 1) continue;
      const cle = `${d.salle}|${v.annee}`;
      maxi.set(cle, Math.max(maxi.get(cle) ?? 0, v.numero));
    }
    expect(compteurs.map((c) => `${c.venue_id}|${c.year}|${c.last_number}`)).toEqual([...maxi].map(([cle, m]) => `${cle}|${m}`).sort());

    // les garanties : NOT NULL, unicité de la première version, clé composite vers la tête
    const nonNul = await sql<{ column_name: string; is_nullable: string }>(`SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'quotes' AND column_name IN ('reference_year', 'reference_number') ORDER BY 1`);
    expect(nonNul.map((c) => c.is_nullable)).toEqual(["NO", "NO"]);
    const gardes = await sql<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conrelid = 'quotes'::regclass AND conname IN ('quotes_chain_head_fkey', 'quotes_head_reference_key') ORDER BY 1`);
    expect(gardes.map((g) => g.conname)).toEqual(["quotes_chain_head_fkey", "quotes_head_reference_key"]);
    const idx = await sql<{ indexdef: string }>(`SELECT indexdef FROM pg_indexes WHERE indexname = 'quotes_reference_head_unique'`);
    expect(idx).toHaveLength(1);
    expect(idx[0]!.indexdef).toContain("UNIQUE");
    expect(idx[0]!.indexdef).toMatch(/WHERE \(?\(?version = 1/u);
  });

  it("⛔ la migration de numérotation des devis LÈVE si une ligne resterait sans numéro (une révision orpheline) — et ne laisse RIEN derrière elle", async () => {
    // On repart d'une base RECRÉÉE, migrée jusqu'à AVANT la numérotation des salles, avec UNE révision dont la tête n'existe pas.
    await recreerBase();
    const toutes = migrationsOrdonnees();
    await appliquerMigrations(toutes.slice(0, toutes.indexOf(suite[0]!)));
    await sql(`INSERT INTO wilayas (id, code, name_fr, name_ar) VALUES (uuidv7(), 16, 'Alger', 'الجزائر')`);
    await sql(`INSERT INTO cities (id, wilaya_id, name_fr, name_ar, lat, lng) SELECT uuidv7(), id, 'Hydra', 'حيدرة', 36.7, 3.0 FROM wilayas`);
    await sql(`INSERT INTO users (id, email, password_hash, role, status, email_verified_at, locale, created_at, updated_at) VALUES (uuidv7(), 'p@example.dz', '$argon2id$fake', 'PRO', 'ACTIVE', now(), 'fr', now(), now())`);
    await sql(`INSERT INTO pro_profiles (id, user_id, business_name, phone, created_at, updated_at) SELECT uuidv7(), id, 'P', '+213550000001', now(), now() FROM users`);
    await sql(`INSERT INTO venues (id, owner_id, city_id, slug, name_fr, name_ar, capacity_max, base_price_cents, publication_status, created_at, updated_at) SELECT uuidv7(), p.id, c.id, 's', 'S', 'ق', 100, 100, 'PUBLISHED', now(), now() FROM pro_profiles p CROSS JOIN cities c LIMIT 1`);
    await sql(
      `INSERT INTO quotes (id, venue_id, status, version, chain_id, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines)
       SELECT uuidv7(), v.id, 'DRAFT', 1, uuidv7(), current_date + 5, 100, 150000000, 0, 150000000, 45000000, '[]'::jsonb FROM venues v LIMIT 1`
    );
    // …et une révision ORPHELINE : sa tête (`chain_id`) n'existe pas ; son parent, lui, existe (le `CHECK` exige un parent à toute version ≥ 2).
    await sql(
      `INSERT INTO quotes (id, venue_id, status, version, chain_id, parent_quote_id, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines)
       SELECT uuidv7(), q.venue_id, 'DRAFT', 2, uuidv7(), q.id, current_date + 5, 100, 150000000, 0, 150000000, 45000000, '[]'::jsonb FROM quotes q WHERE q.version = 1 LIMIT 1`
    );
    await appliquerMigrations([suite[0]!]);
    const avant = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes`);
    let erreur: Error | null = null;
    try {
      await appliquerMigrations([suite[1]!]);
    } catch (e) {
      erreur = e as Error;
    }
    expect(erreur, "la migration s'est APPLIQUÉE avec une révision sans tête : une ligne resterait sans numéro").not.toBeNull();
    const apres = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes`);
    expect(apres).toEqual(avant);
    const colonne = await sql(`SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'reference_number'`);
    expect(colonne, "la migration refusée a laissé une colonne derrière elle").toHaveLength(0);
    const table = await sql(`SELECT 1 FROM information_schema.tables WHERE table_name = 'quote_number_counters'`);
    expect(table, "la migration refusée a laissé la table des compteurs").toHaveLength(0);
  });
});


describe("⛔ L35-4 (D336, MD-13) — la fiche client et la copie du nom sur une base NON VIDE", () => {
  const NOM = "pro_client_records";
  let derniere = "";
  const colonnesDuDevis = `SELECT id, status, version, chain_id, parent_quote_id, total_cents, deposit_cents, reference_year, reference_number, client_id::text AS client_id FROM quotes ORDER BY id`;

  it("prépare : une base RECRÉÉE, migrée jusqu'à AVANT la migration du lot, semée d'un pro, d'un compte client, d'une salle et de devis (une tête, une révision, un devis hérité lié à un compte)", async () => {
    await recreerBase();
    // ⛔ Rang 42 (D337) — CE BLOC EST POINTÉ SUR SA MIGRATION PAR SON NOM, plus sur « la dernière » : `booking_contact_phone_optional` la suit désormais (précédent de D333,
    // qui a épinglé D282). Tout ce qui précède s'applique en préparation ; la sienne reste à appliquer.
    const toutes = migrationsOrdonnees();
    const rang = toutes.findIndex((m) => m.replace(/^\d+_/u, "") === NOM);
    expect(rang, "la migration du lot L35-4 existe").toBeGreaterThanOrEqual(0);
    derniere = toutes[rang]!;
    await appliquerMigrations(toutes.slice(0, rang));

    await sql(`INSERT INTO wilayas (id, code, name_fr, name_ar) VALUES (uuidv7(), 16, 'Alger', 'الجزائر')`);
    await sql(`INSERT INTO cities (id, wilaya_id, name_fr, name_ar, lat, lng) SELECT uuidv7(), id, 'Hydra', 'حيدرة', 36.7, 3.0 FROM wilayas`);
    await sql(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at, locale, created_at, updated_at) VALUES
         (uuidv7(), 'p@example.dz', '$argon2id$fake', 'PRO', 'ACTIVE', now(), 'fr', now(), now()),
         (uuidv7(), 'c@example.dz', '$argon2id$fake', 'CLIENT', 'ACTIVE', now(), 'ar', now(), now())`
    );
    await sql(`INSERT INTO pro_profiles (id, user_id, business_name, phone, created_at, updated_at) SELECT uuidv7(), id, 'P', '+213550000001', now(), now() FROM users WHERE role = 'PRO'`);
    await sql(
      `INSERT INTO venues (id, owner_id, city_id, slug, name_fr, name_ar, capacity_max, base_price_cents, publication_status, created_at, updated_at)
       SELECT uuidv7(), p.id, c.id, 's', 'S', 'ق', 100, 100, 'PUBLISHED', now(), now() FROM pro_profiles p CROSS JOIN cities c LIMIT 1`
    );
    // Une tête (v1), sa révision (v2), et un devis HÉRITÉ lié à un compte (`client_id`, accepté avant D336) : trois lignes que la migration doit traverser intactes.
    await sql(
      `INSERT INTO quotes (id, venue_id, status, version, chain_id, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines, reference_year, reference_number)
       SELECT '018f0000-0000-7000-8000-000000004101'::uuid, v.id, 'DRAFT', 1, '018f0000-0000-7000-8000-000000004101'::uuid, current_date + 30, 100, 150000000, 0, 150000000, 45000000, '[]'::jsonb, 2026, 1 FROM venues v`
    );
    await sql(
      `INSERT INTO quotes (id, venue_id, status, version, chain_id, parent_quote_id, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines, reference_year, reference_number)
       SELECT '018f0000-0000-7000-8000-000000004102'::uuid, q.venue_id, 'DRAFT', 2, q.id, q.id, current_date + 30, 120, 150000000, 0, 150000000, 45000000, '[]'::jsonb, 2026, 1 FROM quotes q WHERE q.version = 1`
    );
    await sql(
      `INSERT INTO quotes (id, venue_id, client_id, status, version, chain_id, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines, reference_year, reference_number)
       SELECT '018f0000-0000-7000-8000-000000004103'::uuid, v.id, u.id, 'CANCELLED', 1, '018f0000-0000-7000-8000-000000004103'::uuid, current_date + 40, 80, 150000000, 0, 150000000, 45000000, '[]'::jsonb, 2026, 2
         FROM venues v CROSS JOIN users u WHERE u.role = 'CLIENT'`
    );
    const n = await sql<{ n: string }>(`SELECT count(*)::text AS n FROM quotes`);
    expect(n[0], "sans devis semés, la migration s'appliquerait sur du vide").toEqual({ n: "3" });
    // Garde-fou : la migration du lot n'est PAS encore appliquée, sinon le test ne prouverait rien.
    expect(await sql(`SELECT 1 FROM information_schema.tables WHERE table_name = 'pro_client_records'`), "la table existe déjà").toHaveLength(0);
    expect(await sql(`SELECT 1 FROM information_schema.columns WHERE table_name = 'quotes' AND column_name = 'client_record_id'`), "la colonne existe déjà").toHaveLength(0);
  });

  it("⛔ la migration passe sur la base NON VIDE : les devis existants la traversent INCHANGÉS, leurs trois colonnes neuves sont NULLES, la table neuve est VIDE", async () => {
    const avant = await sql(colonnesDuDevis);
    expect(avant, "le semis du test précédent a disparu").toHaveLength(3);
    await appliquerMigrations([derniere]);
    expect(await sql(colonnesDuDevis)).toEqual(avant);
    const nuls = await sql<{ id: string; client_record_id: string | null; client_name_ar: string | null; client_name_latin: string | null }>(
      `SELECT id, client_record_id::text AS client_record_id, client_name_ar, client_name_latin FROM quotes ORDER BY id`
    );
    expect(nuls.map((q) => [q.client_record_id, q.client_name_ar, q.client_name_latin])).toEqual([
      [null, null, null],
      [null, null, null],
      [null, null, null]
    ]);
    expect(await sql(`SELECT count(*)::text AS n FROM pro_client_records`)).toEqual([{ n: "0" }]);
    // Aucune colonne neuve n'est obligatoire : une base de production a des devis, et une colonne `NOT NULL` sans défaut y échouerait (D123).
    const obligatoires = await sql<{ column_name: string; is_nullable: string }>(
      `SELECT column_name, is_nullable FROM information_schema.columns WHERE table_name = 'quotes' AND column_name IN ('client_record_id', 'client_name_ar', 'client_name_latin') ORDER BY 1`
    );
    expect(obligatoires).toEqual([
      { column_name: "client_name_ar", is_nullable: "YES" },
      { column_name: "client_name_latin", is_nullable: "YES" },
      { column_name: "client_record_id", is_nullable: "YES" }
    ]);
  });

  it("⛔ les garanties que la migration pose (D186) : quatre CHECK, deux unicités PARTIELLES par pro, et l'action de chaque clé étrangère", async () => {
    const checks = await sql<{ conname: string }>(`SELECT conname FROM pg_constraint WHERE conrelid = 'pro_client_records'::regclass AND contype = 'c' ORDER BY conname`);
    expect(checks.map((c) => c.conname)).toEqual([
      "pro_client_records_identifier_present",
      "pro_client_records_link_coherent",
      "pro_client_records_name_present",
      "pro_client_records_phone_canonical"
    ]);
    // `r` = RESTRICT (S-56 pour le compte lié ; le schéma ratifié pour le pro), `n` = SET NULL (le devis garde sa copie quand la fiche part).
    const cles = await sql<{ conname: string; confdeltype: string }>(
      `SELECT conname, confdeltype FROM pg_constraint WHERE contype = 'f' AND conname IN ('pro_client_records_pro_profile_id_fkey', 'pro_client_records_linked_user_id_fkey', 'quotes_client_record_id_fkey') ORDER BY conname`
    );
    expect(cles).toEqual([
      { conname: "pro_client_records_linked_user_id_fkey", confdeltype: "r" },
      { conname: "pro_client_records_pro_profile_id_fkey", confdeltype: "r" },
      { conname: "quotes_client_record_id_fkey", confdeltype: "n" }
    ]);
    const index = await sql<{ indexname: string; indexdef: string }>(
      `SELECT indexname, indexdef FROM pg_indexes WHERE indexname IN ('pro_client_records_pro_phone_unique', 'pro_client_records_pro_email_unique') ORDER BY indexname`
    );
    expect(index.map((i) => i.indexname)).toEqual(["pro_client_records_pro_email_unique", "pro_client_records_pro_phone_unique"]);
    expect(index[0]!.indexdef).toMatch(/^CREATE UNIQUE INDEX .*\(pro_profile_id, email\) WHERE \(email IS NOT NULL\)$/u);
    expect(index[1]!.indexdef).toMatch(/^CREATE UNIQUE INDEX .*\(pro_profile_id, phone\) WHERE \(phone IS NOT NULL\)$/u);
  });

  it("après la migration : une fiche s'écrit, un devis EXISTANT s'y rattache ; supprimer la fiche remet son lien à NULL et le devis garde sa COPIE du nom", async () => {
    await sql(`INSERT INTO pro_client_records (id, pro_profile_id, phone, name_latin) SELECT '018f0000-0000-7000-8000-000000004199'::uuid, id, '+213555123456', 'Amina Bensalem' FROM pro_profiles`);
    await sql(`UPDATE quotes SET client_record_id = '018f0000-0000-7000-8000-000000004199'::uuid, client_name_latin = 'Amina Bensalem' WHERE id = '018f0000-0000-7000-8000-000000004101'::uuid`);
    await sql(`DELETE FROM pro_client_records WHERE id = '018f0000-0000-7000-8000-000000004199'::uuid`);
    const q = await sql<{ client_record_id: string | null; client_name_latin: string | null }>(
      `SELECT client_record_id::text AS client_record_id, client_name_latin FROM quotes WHERE id = '018f0000-0000-7000-8000-000000004101'::uuid`
    );
    expect(q).toEqual([{ client_record_id: null, client_name_latin: "Amina Bensalem" }]);
  });
});

// ══ L36-1 (D337) — `bookings.contact_phone` FACULTATIF et le CHECK « un numéro OU un e-mail », sur une base NON VIDE (D123) ═══════════════════════════════════════
// Tranche [L36-1] du schéma ratifié (DR3). ML-4 (les réservations existantes passent INTACTES, ligne à ligne), ML-11 (la base refuse ce que l'API ne verrait pas), ML-12.
describe("⛔ L36-1 (D337, ML-12) — le numéro facultatif et le CHECK, sur une base NON VIDE", () => {
  const NOM_L36 = "booking_contact_phone_optional";
  let derniere = "";
  const lignes = `SELECT id, venue_id, status, guests, total_cents, deposit_cents, contact_first_name, contact_last_name, contact_phone, contact_email FROM bookings ORDER BY id`;
  const inserer = (id: string, jour: number, phone: string | null, email: string | null) =>
    sql(
      `INSERT INTO bookings (id, venue_id, source, status, payment_method, event_date, starts_at, ends_at, guests,
                             base_price_cents, services_total_cents, total_cents, deposit_cents,
                             contact_first_name, contact_last_name, contact_phone, contact_email, created_at, updated_at)
       SELECT $1::uuid, v.id, 'CLIENT', 'PENDING', 'CASH', current_date + $2::int, (current_date + $2::int)::timestamptz,
              (current_date + $2::int)::timestamptz + interval '6 hours', 100, 150000000, 0, 150000000, 45000000,
              'Amina', 'Bensalem', $3, $4, now(), now()
         FROM venues v LIMIT 1`,
      [id, jour, phone, email]
    );

  it("prépare : une base RECRÉÉE, migrée jusqu'à AVANT la migration du lot, semée de deux réservations (numéro + e-mail ; numéro seul) — où `contact_phone` est encore NOT NULL", async () => {
    await recreerBase();
    const toutes = migrationsOrdonnees();
    const rang = toutes.findIndex((m) => m.replace(/^\d+_/u, "") === NOM_L36);
    expect(rang, "la migration du lot L36-1 existe").toBeGreaterThanOrEqual(0);
    derniere = toutes[rang]!;
    await appliquerMigrations(toutes.slice(0, rang));

    await sql(`INSERT INTO wilayas (id, code, name_fr, name_ar) VALUES (uuidv7(), 16, 'Alger', 'الجزائر')`);
    await sql(`INSERT INTO cities (id, wilaya_id, name_fr, name_ar, lat, lng) SELECT uuidv7(), id, 'Hydra', 'حيدرة', 36.7, 3.0 FROM wilayas`);
    await sql(
      `INSERT INTO users (id, email, password_hash, role, status, email_verified_at, locale, created_at, updated_at)
       VALUES (uuidv7(), 'p@example.dz', '$argon2id$fake', 'PRO', 'ACTIVE', now(), 'fr', now(), now())`
    );
    await sql(`INSERT INTO pro_profiles (id, user_id, business_name, phone, created_at, updated_at) SELECT uuidv7(), id, 'P', '+213550000001', now(), now() FROM users`);
    await sql(
      `INSERT INTO venues (id, owner_id, city_id, slug, name_fr, name_ar, capacity_max, base_price_cents, publication_status, created_at, updated_at)
       SELECT uuidv7(), p.id, c.id, 's', 'S', 'ق', 200, 100, 'PUBLISHED', now(), now() FROM pro_profiles p CROSS JOIN cities c LIMIT 1`
    );
    await inserer("018f0000-0000-7000-8000-000000004201", 30, "+213550000011", "amina@example.dz");
    await inserer("018f0000-0000-7000-8000-000000004202", 31, "+213550000012", null);
    expect(await sql(lignes), "sans réservations semées, la migration s'appliquerait sur du vide").toHaveLength(2);
    // Garde-fou : la migration du lot N'EST PAS encore appliquée — la colonne est obligatoire, le CHECK n'existe pas.
    const col = await sql<{ is_nullable: string }>(`SELECT is_nullable FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'contact_phone'`);
    expect(col, "la colonne est déjà facultative").toEqual([{ is_nullable: "NO" }]);
    expect(await sql(`SELECT 1 FROM pg_constraint WHERE conname = 'bookings_contact_reachable'`), "le CHECK existe déjà").toHaveLength(0);
  });

  it("⛔ ML-4 — la migration passe sur la base NON VIDE : les deux réservations la traversent INTACTES, ligne à ligne, les trois colonnes de contact comprises", async () => {
    const avant = await sql(lignes);
    expect(avant, "le semis du test précédent a disparu").toHaveLength(2);
    await appliquerMigrations([derniere]);
    expect(await sql(lignes)).toEqual(avant);
  });

  it("⛔ la colonne est FACULTATIVE et la contrainte est posée (D186) : le CHECK porte les DEUX colonnes, sous son nom", async () => {
    const col = await sql<{ is_nullable: string }>(`SELECT is_nullable FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'contact_phone'`);
    expect(col).toEqual([{ is_nullable: "YES" }]);
    const mail = await sql<{ is_nullable: string }>(`SELECT is_nullable FROM information_schema.columns WHERE table_name = 'bookings' AND column_name = 'contact_email'`);
    expect(mail, "`contact_email` n'a pas bougé").toEqual([{ is_nullable: "YES" }]);
    const ck = await sql<{ def: string }>(`SELECT pg_get_constraintdef(oid) AS def FROM pg_constraint WHERE conname = 'bookings_contact_reachable' AND conrelid = 'bookings'::regclass`);
    expect(ck).toHaveLength(1);
    expect(ck[0]?.def).toContain("contact_phone IS NOT NULL");
    expect(ck[0]?.def).toContain("contact_email IS NOT NULL");
  });

  it("⛔ ML-11 — après la migration : un e-mail SEUL s'écrit ; ni numéro ni e-mail est REFUSÉ (23514) ; retirer le dernier canal d'une ligne existante aussi, sans rien écrire", async () => {
    await inserer("018f0000-0000-7000-8000-000000004203", 32, null, "seul@example.dz");
    const seul = await sql<{ contact_phone: string | null; contact_email: string | null }>(`SELECT contact_phone, contact_email FROM bookings WHERE id = '018f0000-0000-7000-8000-000000004203'`);
    expect(seul).toEqual([{ contact_phone: null, contact_email: "seul@example.dz" }]);

    await expect(inserer("018f0000-0000-7000-8000-000000004204", 33, null, null)).rejects.toThrow(/bookings_contact_reachable/);
    await expect(sql(`UPDATE bookings SET contact_email = NULL WHERE id = '018f0000-0000-7000-8000-000000004203'`)).rejects.toThrow(/bookings_contact_reachable/);
    await expect(sql(`UPDATE bookings SET contact_phone = NULL, contact_email = NULL WHERE id = '018f0000-0000-7000-8000-000000004201'`)).rejects.toThrow(/bookings_contact_reachable/);

    expect(await sql(`SELECT count(*)::text AS n FROM bookings`), "le refus n'a rien écrit").toEqual([{ n: "3" }]);
    const intacte = await sql<{ contact_phone: string | null; contact_email: string | null }>(`SELECT contact_phone, contact_email FROM bookings WHERE id = '018f0000-0000-7000-8000-000000004201'`);
    expect(intacte).toEqual([{ contact_phone: "+213550000011", contact_email: "amina@example.dz" }]);
    // Retirer le NUMÉRO d'une ligne qui a un e-mail est permis : c'est la règle, pas une interdiction.
    await sql(`UPDATE bookings SET contact_phone = NULL WHERE id = '018f0000-0000-7000-8000-000000004201'`);
    expect(await sql(`SELECT contact_phone FROM bookings WHERE id = '018f0000-0000-7000-8000-000000004201'`)).toEqual([{ contact_phone: null }]);
  });

  it("ML-15 — `visit_bookings.contact_phone` n'a pas bougé (nullable depuis D61, hors lot) et ne porte aucun CHECK de ce lot", async () => {
    const col = await sql<{ is_nullable: string }>(`SELECT is_nullable FROM information_schema.columns WHERE table_name = 'visit_bookings' AND column_name = 'contact_phone'`);
    expect(col).toEqual([{ is_nullable: "YES" }]);
    expect(await sql(`SELECT 1 FROM pg_constraint WHERE conname = 'bookings_contact_reachable' AND conrelid = 'visit_bookings'::regclass`)).toHaveLength(0);
  });
});
