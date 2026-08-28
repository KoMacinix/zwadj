// Intégration E3d-1 — UNE SEULE intention « en attente » par réservation.
//
// ⚠ POURQUOI CE SPEC N'EXISTE QU'ICI. Ce qui est mesuré est un INDEX PARTIEL
// PostgreSQL. Aucun test unitaire ne peut le voir : un faux magasin accepterait
// deux `create` sans broncher, et la garde serait verte sur une base qui, elle,
// laisserait passer deux paiements.
//
// ⚠ DEUX GARDES, ET LA PREMIÈRE EST LA SEULE DÉTERMINISTE.
//   · La base REFUSE-t-elle deux `PENDING` ? Deux `create` directs, en série.
//     Aucune concurrence, donc aucun aléa : si l'index manque, c'est TOUJOURS
//     rouge. C'est cette garde qui protège la migration.
//   · L'adaptateur RATTRAPE-t-il le refus ? Appels concurrents. La course doit
//     avoir lieu pour que le `catch` soit emprunté, et « doit » n'est pas
//     « va » — d'où la première garde, qui ne dépend pas d'elle.
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { Client } from "pg";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { INDEX_UNE_ATTENTE } from "../../src/payments/payment-store.prisma";
import { PAYMENT_STORE, type PaymentStore } from "../../src/payments/payment-store.types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";

let ctx: TestContext;
let store: PaymentStore;

const MONTANT = 6_000_000;

/** ⚠ Insert DIRECT, pas le parcours complet de réservation. Ce spec mesure une
 *  contrainte de table ; passer par l'API ajouterait vingt raisons d'échouer
 *  sans rien ajouter à ce qui est mesuré. Formes relevées sur
 *  `venue-styles-filters.int-spec.ts` et `availability-blocks.int-spec.ts` —
 *  `proProfile`, et non un nom deviné. */
let seq = 0;

async function decor(): Promise<{ ownerId: string; cityId: string }> {
  const user = await ctx.prisma.user.create({
    data: { email: "owner-e3d@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const pro = await ctx.prisma.proProfile.create({
    data: { userId: user.id, businessName: "Propriétaire E3d", phone: "+213550000021" }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  return { ownerId: pro.id, cityId: city.id };
}

/** ⚠ `seq` sur le slug ET sur la date : `venues.slug` est UNIQUE, et deux
 *  réservations sur le même créneau tomberaient sur l'EXCLUDE de
 *  chevauchement. Le test des « deux réservations différentes » en crée deux :
 *  sans ça, il échouerait pour une raison qui n'a rien à voir avec le paiement. */
async function reservation(ids: { ownerId: string; cityId: string }): Promise<string> {
  seq += 1;
  const venue = await ctx.prisma.venue.create({
    data: {
      ownerId: ids.ownerId, cityId: ids.cityId, slug: `salle-e3d-${seq}`,
      nameFr: `Salle E3d ${seq}`, nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000
    }
  });
  const jour = `2027-09-${String(10 + seq).padStart(2, "0")}`;
  const booking = await ctx.prisma.booking.create({
    data: {
      venueId: venue.id, slotTemplateId: null,
      eventDate: new Date(`${jour}T00:00:00Z`),
      startsAt: new Date(`${jour}T17:00:00Z`), endsAt: new Date(`${jour}T23:00:00Z`),
      guests: 200, basePriceCents: 20_000_000, servicesTotalCents: 0,
      totalCents: 20_000_000, depositCents: MONTANT,
      contactFirstName: "Amine", contactLastName: "Bekkouche", contactPhone: "+213550000001"
    }
  });
  return booking.id;
}

const enAttente = (bookingId: string) =>
  ctx.prisma.payment.count({ where: { bookingId, status: "PENDING" as never } });

beforeAll(async () => {
  ctx = await createTestApp();
  store = ctx.app.get<PaymentStore>(PAYMENT_STORE);
});
afterAll(async () => {
  await ctx.app.close();
});
let ids: { ownerId: string; cityId: string };
beforeEach(async () => {
  await truncateAll(ctx.prisma);
  seq = 0;
  ids = await decor();
});

describe("La BASE refuse une seconde intention en attente", () => {
  it("⛔ l'index partiel EXISTE, il est UNIQUE, et il ne porte que les PENDING", async () => {
    // ⚠ ON INTERROGE LE CATALOGUE, PAS UNE ERREUR. La version précédente
    // assertait la forme de `error.meta.target` — une supposition sur les
    // entrailles de Prisma, jamais mesurée, et fausse dès que l'index vient
    // d'un `CREATE UNIQUE INDEX` en SQL brut. `pg_indexes` dit ce que la
    // MIGRATION a produit, ce qui est exactement la question.
    //
    // ⚠ Le nom vient de la constante du code, pas d'une chaîne écrite ici :
    // c'est ce qui confronte le TypeScript au SQL. Deux noms qui divergent se
    // verront ici, et nulle part ailleurs.
    const trouves = await ctx.prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = ${INDEX_UNE_ATTENTE}`;
    expect(trouves[0]?.indexdef, `index « ${INDEX_UNE_ATTENTE} » ABSENT — la migration E3d-1 n'est pas passée`).toBeDefined();
    const def = trouves[0]!.indexdef;
    expect(def).toContain("UNIQUE");
    expect(def).toContain("booking_id");
    // Partiel, sinon une tentative ÉCHOUÉE interdirait la suivante.
    expect(def).toContain("PENDING");
  });

  it("⛔ deux `create` en série : le second est REFUSÉ par la base", async () => {
    const bookingId = await reservation(ids);
    await ctx.prisma.payment.create({
      data: { bookingId, amountCents: MONTANT, discountAppliedCents: 0, status: "PENDING" as never }
    });

    // ⚠ Aucune concurrence ici : si l'index manque, c'est TOUJOURS rouge.
    // C'est la garde déterministe, celle qui protège la migration.
    const refus = await ctx.prisma.payment
      .create({ data: { bookingId, amountCents: MONTANT, discountAppliedCents: 0, status: "PENDING" as never } })
      .then(() => null)
      .catch((e: unknown) => e as { code?: string });

    expect(refus, "la base a ACCEPTÉ deux intentions en attente").not.toBeNull();
    expect(refus?.code).toBe("P2002");
    expect(await enAttente(bookingId)).toBe(1);
  });

  it("⚠ une tentative ÉCHOUÉE n'interdit PAS la suivante — l'index est PARTIEL", async () => {
    // Le cas réel écrit AVANT la borne (D55) : un premier paiement qui échoue
    // doit pouvoir être retenté. Une contrainte pleine sur `booking_id` aurait
    // passé la garde précédente et cassé celui-ci.
    const bookingId = await reservation(ids);
    const premiere = await ctx.prisma.payment.create({
      data: { bookingId, amountCents: MONTANT, discountAppliedCents: 0, status: "PENDING" as never }
    });
    await ctx.prisma.payment.update({ where: { id: premiere.id }, data: { status: "FAILED" as never } });

    const seconde = await store.findOrCreatePendingIntent({ bookingId, amountCents: MONTANT, discountAppliedCents: 0 });
    expect(seconde.id).not.toBe(premiere.id);
    expect(await enAttente(bookingId)).toBe(1);
  });
});

/** ⛔ LA COURSE, FORCÉE — ET NON PLUS ESPÉRÉE.
 *
 *  Huit appels concurrents ne suffisent PAS : mesuré le 25/08/2026, les trois
 *  gardes du chemin `catch` sont restées vertes sous neutralisation, ce qui ne
 *  peut vouloir dire qu'une chose — le `catch` n'était jamais emprunté. Le
 *  premier appel a le temps d'écrire avant que le suivant ne lise.
 *
 *  On se sert donc de PostgreSQL plutôt que de l'ordonnanceur : une SECONDE
 *  connexion pose la ligne PENDING et NE COMMITE PAS. En READ COMMITTED, le
 *  magasin ne la voit pas — il croit être seul — puis son `create` va se
 *  BLOQUER sur l'index unique. Au COMMIT du rival, il reçoit la violation. Le
 *  perdant de la course, reproduit à volonté.
 *
 *  ⚠ Client `pg` brut, pas un second PrismaClient : la transaction ouverte
 *  garderait sinon une connexion du pool que le magasin attend, et les deux
 *  s'attendraient l'un l'autre. */
async function rivalNonCommite(
  bookingId: string
): Promise<{ commit: () => Promise<void>; fermer: () => Promise<void> }> {
  const rival = new Client({ connectionString: process.env.DATABASE_URL });
  await rival.connect();
  await rival.query("BEGIN");
  // ⚠ `updated_at` est NOT NULL SANS défaut (`@updatedAt` est côté Prisma) :
  // un INSERT brut doit le fournir. Relevé sur le DDL, pas supposé.
  await rival.query(
    `INSERT INTO "payments" ("booking_id","amount_cents","discount_applied_cents","status","updated_at")
     VALUES ($1,$2,0,'PENDING',now())`,
    [bookingId, MONTANT]
  );
  return {
    commit: async () => {
      await rival.query("COMMIT");
      await rival.end();
    },
    // ⛔ CHEMIN DE SORTIE OBLIGATOIRE. Sans lui, un test qui lève avant le
    // COMMIT laisse une connexion ouverte SUR UNE TRANSACTION NON CLOSE :
    // elle tient un verrou, et le `DROP DATABASE` du spec de migration s'en
    // trouve gêné. Une fuite de connexion dans un test ne se voit pas dans
    // CE test — elle se voit dans le suivant, et on cherche au mauvais endroit.
    fermer: async () => {
      try {
        await rival.query("ROLLBACK");
      } finally {
        await rival.end();
      }
    }
  };
}

/** Attend que QUELQU'UN soit bloqué sur un verrou. ⚠ Sans cette attente, le
 *  COMMIT du rival pourrait précéder le `create` du magasin : `findFirst`
 *  trouverait alors la ligne et on mesurerait le chemin NOMINAL en croyant
 *  mesurer le perdant. La mesure dirait le contraire de ce qu'elle affirme. */
async function attendreBlocage(): Promise<void> {
  for (let essai = 0; essai < 200; essai += 1) {
    const r = await ctx.prisma.$queryRaw<{ n: bigint }[]>`
      SELECT count(*)::bigint AS n FROM pg_stat_activity
       WHERE wait_event_type = 'Lock' AND state = 'active'`;
    if (Number(r[0]?.n ?? 0) > 0) return;
    await new Promise((r2) => setTimeout(r2, 25));
  }
  // ⛔ Pas de `return` silencieux : une course qui n'a pas eu lieu rendrait le
  // test vert sans avoir rien mesuré (D248, appliqué à un test).
  throw new Error("LA COURSE N'A PAS EU LIEU : personne n'attend de verrou. Mesure invalide.");
}

/** L'UPDATE de dédoublonnage, LU dans la migration — jamais recopié ici. Une
 *  copie testerait la copie. */
/** ⛔ NI `import.meta.url` NI `__dirname`.
 *  Le premier ne passe pas `tsc` — l'API compile en CommonJS, TS1343 — alors
 *  même que Vitest l'exécute sans broncher (SWC rend ce fichier en ESM).
 *  Deux outils, deux vérités : la mesure était verte et la porte rouge.
 *  Le second passerait `tsc` et serait `undefined` à l'exécution, sous ce
 *  même ESM — le défaut changerait juste de porte.
 *
 *  Reste le dossier courant, qui est celui du paquet quand vitest tourne.
 *  ⚠ ON LE VÉRIFIE AU LIEU D'Y CROIRE : un chemin faux doit dire lequel, pas
 *  échouer trois lignes plus loin sur un `split` de chaîne vide. */
const DOSSIER_MIGRATION = "20260824120000_payment_one_pending_per_booking";

function nettoyageDeLaMigration(): string {
  const chemin = join(process.cwd(), "prisma", "migrations", DOSSIER_MIGRATION, "migration.sql");
  if (!existsSync(chemin)) {
    throw new Error(`migration introuvable : ${chemin} (dossier courant : ${process.cwd()})`);
  }
  const sql = readFileSync(chemin, "utf8");
  // ⛔ ON RETIRE LES COMMENTAIRES D'ABORD, ON COUPE ENSUITE. L'inverse — ce
  // que faisait la première version — casse dès qu'un `;` apparaît dans une
  // phrase : le bloc est coupé en deux et le fragment perd son `--`, si bien
  // que PostgreSQL reçoit de la prose française. Vu le 27/08/2026 :
  // `syntax error at or near "les"`.
  const sansCommentaires = sql.replace(/--[^\r\n]*/g, "");
  const update = sansCommentaires.split(";").find((bloc) => /^\s*UPDATE/m.test(bloc));
  if (!update) throw new Error("UPDATE de nettoyage introuvable dans la migration");
  // ⚠ Garde de forme : ce qui part à PostgreSQL ne doit contenir QUE du SQL.
  // Une lettre accentuée hors chaîne littérale trahit un commentaire survivant.
  if (/[à-ÿ]/i.test(update.replace(/'[^']*'/g, ""))) {
    throw new Error(`SQL de nettoyage pollué par du texte : ${update.slice(0, 120)}`);
  }
  return `${update};`;
}

describe("Le NETTOYAGE de la migration départage jusqu'à l'égalité de date", () => {
  it("⛔ trois PENDING à la MÊME microseconde : un seul survit, et l'index passe", async () => {
    // ⚠ CE CAS NE PEUT PAS NAÎTRE D'UNE BASE NEUVE, et c'est pour ça que la
    // cible E2 était muette : `setup-global` bâtit une base VIDE, où l'UPDATE
    // ne rencontre aucun doublon. On fabrique donc la base « ayant couru ».
    const bookingId = await reservation(ids);
    const [avant] = await ctx.prisma.$queryRaw<{ indexdef: string }[]>`
      SELECT indexdef FROM pg_indexes WHERE indexname = ${INDEX_UNE_ATTENTE}`;
    expect(avant?.indexdef).toBeDefined();

    await ctx.prisma.$executeRawUnsafe(`DROP INDEX "${INDEX_UNE_ATTENTE}"`);
    try {
      // Une seule expression `now()` → un seul instant pour les trois lignes :
      // c'est l'égalité exacte que `created_at` SEUL ne sait pas trancher.
      await ctx.prisma.$executeRawUnsafe(
        `INSERT INTO "payments" ("booking_id","amount_cents","discount_applied_cents","status","created_at","updated_at")
         SELECT '${bookingId}'::uuid, ${MONTANT}, 0, 'PENDING', t, t FROM (SELECT now() AS t) s, generate_series(1,3)`
      );
      expect(await enAttente(bookingId)).toBe(3);

      await ctx.prisma.$executeRawUnsafe(nettoyageDeLaMigration());
      expect(await enAttente(bookingId), "le départage a laissé plusieurs survivantes").toBe(1);

      // ⛔ LA VRAIE ASSERTION : l'index se recrée. C'est ce qui échouerait au
      // déploiement si le nettoyage ne départageait pas complètement.
      await ctx.prisma.$executeRawUnsafe(avant!.indexdef);
    } finally {
      const [apres] = await ctx.prisma.$queryRaw<{ indexdef: string }[]>`
        SELECT indexdef FROM pg_indexes WHERE indexname = ${INDEX_UNE_ATTENTE}`;
      if (!apres) {
        // Le test a échoué avant de recréer : on remet l'index pour ne pas
        // emporter les specs suivants avec soi.
        await ctx.prisma.payment.deleteMany({ where: { status: "PENDING" as never } });
        await ctx.prisma.$executeRawUnsafe(avant!.indexdef);
      }
    }
  });
});

describe("L'ADAPTATEUR rattrape le refus au lieu de le propager", () => {
  it("⛔ le PERDANT de la course relit — il ne propage pas la violation", async () => {
    const bookingId = await reservation(ids);
    const rival = await rivalNonCommite(bookingId);
    let commite = false;

    // Le magasin ne voit rien : il croit être seul, et va écrire.
    const perdant = store.findOrCreatePendingIntent({ bookingId, amountCents: MONTANT, discountAppliedCents: 0 });
    try {
      await attendreBlocage();
      await rival.commit();
      commite = true;
    } finally {
      if (!commite) await rival.fermer();
    }

    // ⛔ NE DOIT PAS LEVER. C'est toute la promesse du lot : celui qui perd
    // la course repart avec l'intention du gagnant, pas avec un P2002.
    const intention = await perdant;
    expect(intention.bookingId).toBe(bookingId);
    expect(intention.status).toBe("PENDING");
    // Et c'est bien la ligne du RIVAL qui est rendue, pas une seconde.
    expect(await enAttente(bookingId)).toBe(1);
  });

  it("⚠ huit appels concurrents : IDEMPOTENCE, pas preuve du rattrapage", async () => {
    // ⚠ CE TEST NE MESURE PAS LE `catch`. Mesuré le 25/08/2026 : sous
    // neutralisation des trois gardes du rattrapage, il restait VERT — le
    // premier appel a le temps d'écrire avant que les autres ne lisent, donc
    // la course n'a pas lieu. Il garde sa valeur (huit appelants, une seule
    // ligne), mais c'est le test ci-dessus qui prouve le rattrapage.
    const bookingId = await reservation(ids);

    // ⚠ `Promise.all` sur huit appels, pas deux appels en série. Une séquence
    // ne peut PAS produire la course : le premier a fini d'écrire avant que le
    // second lise, donc `findFirst` le trouve et le `catch` n'est jamais
    // emprunté. Un tel test serait vert avec ou sans correctif.
    const intentions = await Promise.all(
      Array.from({ length: 8 }, () =>
        store.findOrCreatePendingIntent({ bookingId, amountCents: MONTANT, discountAppliedCents: 0 })
      )
    );

    // 1) Aucun appel n'a levé : le perdant a relu au lieu de propager P2002.
    expect(intentions).toHaveLength(8);
    // 2) Tous parlent de la MÊME affaire — c'est ça, l'idempotence.
    expect(new Set(intentions.map((i) => i.id)).size).toBe(1);
    // 3) ⛔ ET LA BASE LE CONFIRME. Sans cette ligne, huit retours identiques
    //    resteraient compatibles avec huit lignes écrites puis relues.
    expect(await enAttente(bookingId)).toBe(1);
  });

  it("⚠ deux réservations DIFFÉRENTES ne se gênent pas", async () => {
    // La borne dans l'autre sens : un index trop large — sur rien, ou sur une
    // colonne oubliée — refuserait la seconde réservation. Personne ne l'aurait
    // vu, les trois gardes ci-dessus étant vertes sur une seule réservation.
    const [a, b] = [await reservation(ids), await reservation(ids)];
    const [ia, ib] = await Promise.all([
      store.findOrCreatePendingIntent({ bookingId: a, amountCents: MONTANT, discountAppliedCents: 0 }),
      store.findOrCreatePendingIntent({ bookingId: b, amountCents: MONTANT, discountAppliedCents: 0 })
    ]);
    expect(ia.id).not.toBe(ib.id);
    expect(await enAttente(a)).toBe(1);
    expect(await enAttente(b)).toBe(1);
  });
});
