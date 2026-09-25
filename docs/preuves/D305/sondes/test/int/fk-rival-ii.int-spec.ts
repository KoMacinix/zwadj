// D305 — SONDE JETABLE, versée en pièce. Décision 1 du relecteur (chat), motif (b), à MESURER AVANT LE CODE :
// « (i) bloque l'insertion d'un paiement qui référence la ligne, c'est mesuré par D304 ; d'après la documentation
// PostgreSQL, un UPDATE qui ne touche pas de colonne de clé ne bloque pas une insertion par clé étrangère. Rejoue la
// sonde de D304 avec (ii) comme rival. Si l'insertion attend aussi, dis-le et arrête-toi. »
// Ce n'est PAS un test du produit et il n'entre dans aucune suite.
//
// ⚠ POURQUOI LA SONDE DE D304 NE RÉPOND PAS DÉJÀ : sa mesure « FK payments→bookings, rival UPDATE simple » prenait pour
// rival le REFUS (`status = DECLINED, declined_at`), pas l'écriture de (ii) (`status = ACCEPTED, accepted_at,
// payment_due_at, updated_at`, sous le verrou de salle). Même classe d'UPDATE en principe ; mais « en principe » est ce
// que la décision demande de mesurer.
//
// OÙ : `zwadj_test`, RECRÉÉE VIDE par le `globalSetup` réel. Garde en tête. COMMENT : depuis `apps/api`, avec la
// configuration d'intégration RÉELLE :
//     npx vitest run -c vitest.config.int.ts --dir <racine>/docs/preuves/D305/sondes fk-rival-ii
//
// DISCRIMINANT (repris de D304) : la requête testée part avec `SET LOCAL lock_timeout = '1500ms'` ; elle attend ⇒ 55P03 ;
// elle n'attend pas ⇒ elle aboutit. Le rival tient son verrou SANS commiter.
// ⛔ CALIBRÉ SUR TROIS BRAS avant toute mesure, abandon si un seul manque :
//   CAL+  rival `SELECT … FOR UPDATE` sur la réservation (la forme (i), ce que D304 a mesuré) ⇒ l'insertion ATTEND ;
//   CAL+c rival UPDATE qui MODIFIE une colonne à index unique (`idempotency_key`) ⇒ l'insertion ATTEND — c'est le
//         mécanisme que cite la documentation : un tel UPDATE prend FOR UPDATE, pas FOR NO KEY UPDATE ;
//   CAL-  rival `FOR UPDATE` sur une AUTRE réservation ⇒ l'insertion N'ATTEND PAS.
// ⛔ ET LE CAS CONNU DOIT AVOIR EU LIEU (D286) : pour chaque rival (ii), on vérifie d'abord qu'il a ÉCRIT (1 ligne) et
// qu'il TIENT un verrou sur la ligne — un `SELECT … FOR UPDATE` testé doit l'ATTENDRE. Sans ce bras, « l'insertion
// n'attend pas » pourrait vouloir dire « le rival ne tenait rien ».
// ⚠ Prédicats et cible IMPORTÉS de `booking-transitions.ts`, jamais recopiés.
// ⚠ Connexions `pg` BRUTES pour la requête testée, chemin de sortie en `finally`.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTestApp, truncateAll, type TestContext } from "../../../../../../apps/api/test/int/helpers";
import { BookingCommand, allowedFrom, targetOf } from "../../../../../../apps/api/src/venues/booking-transitions";

interface Pg {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  end(): Promise<void>;
}
const requireApi = createRequire(join(process.cwd(), "package.json"));
const { Client } = requireApi("pg") as { Client: new (o: { connectionString: string }) => Pg };

const SORTIE = join(process.cwd(), "..", "..", "docs", "preuves", "D305", "sondes", "sorties");
const journal: string[] = [];
const noter = (l: string): void => {
  journal.push(l);
  console.log(l);
};

let ctx: TestContext;
let seq = 0;
let ids: { venueId: string };

async function connecter(): Promise<Pg> {
  const c = new Client({ connectionString: process.env.DATABASE_URL ?? "" });
  await c.connect();
  return c;
}

async function reservation(): Promise<string> {
  seq += 1;
  const jour = `2027-10-${String(seq).padStart(2, "0")}`;
  const b = await ctx.prisma.booking.create({
    data: {
      venueId: ids.venueId, slotTemplateId: null,
      eventDate: new Date(`${jour}T00:00:00Z`),
      startsAt: new Date(`${jour}T17:00:00Z`), endsAt: new Date(`${jour}T23:00:00Z`),
      guests: 200, basePriceCents: 20_000_000, servicesTotalCents: 0,
      totalCents: 20_000_000, depositCents: 6_000_000,
      contactFirstName: "Sonde", contactLastName: "D305", contactPhone: "+213550000305"
    },
    select: { id: true }
  });
  return b.id;
}

/** Un rival qui tient ses verrous. `lignes` = ce que son écriture a modifié (null s'il n'écrit pas). */
interface Rival {
  lignes: number | null;
  fermer: () => Promise<void>;
}
type Etape = [string, unknown[]];

/** Rival en SQL brut, transaction ouverte, jamais commitée (ROLLBACK à la fermeture). */
async function rivalSql(etapes: Etape[]): Promise<Rival> {
  const c = await connecter();
  await c.query("BEGIN");
  let lignes: number | null = null;
  try {
    for (const [sql, p] of etapes) {
      const r = await c.query(sql, p);
      if (/^\s*UPDATE/i.test(sql)) lignes = r.rowCount;
    }
  } catch (e) {
    await c.query("ROLLBACK").catch(() => undefined);
    await c.end();
    throw e;
  }
  return {
    lignes,
    fermer: async () => {
      try {
        await c.query("ROLLBACK");
      } finally {
        await c.end();
      }
    }
  };
}

const ANNULATION_VOULUE = "SONDE D305 — ROLLBACK VOULU";

/** Rival PRISMA : une transaction interactive RÉELLE, tenue ouverte jusqu'à `fermer`, puis annulée par une levée
 *  voulue. C'est l'écriture que (ii) émettra, telle que Prisma la produit — `updated_at` compris. */
async function rivalPrisma(
  ecrire: (tx: Parameters<Parameters<TestContext["prisma"]["$transaction"]>[0]>[0]) => Promise<number>
): Promise<Rival> {
  let relacher!: () => void;
  const tenu = new Promise<void>((r) => (relacher = r));
  let pret!: (n: number) => void;
  let echec!: (e: unknown) => void;
  const ecrit = new Promise<number>((r, j) => {
    pret = r;
    echec = j;
  });
  const fin = ctx.prisma
    .$transaction(
      async (tx) => {
        pret(await ecrire(tx));
        await tenu;
        throw new Error(ANNULATION_VOULUE);
      },
      { timeout: 20_000, maxWait: 5_000 }
    )
    .then(
      () => echec(new Error("la transaction du rival a COMMITÉ : la sonde voulait un ROLLBACK")),
      (e: unknown) => {
        if (!(e instanceof Error && e.message === ANNULATION_VOULUE)) echec(e);
      }
    );
  const lignes = await ecrit;
  return {
    lignes,
    fermer: async () => {
      relacher();
      await fin;
    }
  };
}

interface Issue {
  attend: boolean;
  sqlstate?: string;
  rowCount?: number | null;
}

/** La requête testée ATTEND-elle le verrou du rival ? (discriminant `lock_timeout`) */
async function attendIl(fabrique: () => Promise<Rival>, code: Etape): Promise<{ issue: Issue; lignesRival: number | null }> {
  const rival = await fabrique();
  const testee = await connecter();
  try {
    await testee.query("BEGIN");
    await testee.query("SET LOCAL lock_timeout = '1500ms'");
    try {
      const r = await testee.query(code[0], code[1]);
      return { issue: { attend: false, rowCount: r.rowCount }, lignesRival: rival.lignes };
    } catch (e) {
      const sqlstate = (e as { code?: string }).code;
      if (sqlstate !== "55P03") throw new Error(`MESURE INVALIDE : erreur ${sqlstate} ${(e as Error).message}`);
      return { issue: { attend: true, sqlstate }, lignesRival: rival.lignes };
    }
  } finally {
    await testee.query("ROLLBACK").catch(() => undefined);
    await testee.end();
    await rival.fermer();
  }
}

const verdict = (i: Issue): string => (i.attend ? "ATTEND (55P03)" : `N'ATTEND PAS (rowCount ${i.rowCount})`);
function ligne(nom: string, attendu: string, mesure: string): void {
  noter(`${nom.padEnd(58)} attendu : ${attendu.padEnd(14)} mesuré : ${mesure}`);
}

beforeAll(async () => {
  ctx = await createTestApp();
  const base = await ctx.prisma.$queryRaw<{ db: string; v: string }[]>`
    SELECT current_database() AS db, current_setting('server_version') AS v`;
  // ⛔ GARDE : jamais une base qui porte des données.
  if (base[0]?.db !== "zwadj_test") throw new Error(`ABANDON : base ${base[0]?.db}, attendu zwadj_test`);
  noter(`base : ${base[0].db} · PostgreSQL ${base[0].v}`);
  const iso = await ctx.prisma.$queryRaw<{ i: string }[]>`SELECT current_setting('default_transaction_isolation') AS i`;
  noter(`default_transaction_isolation : ${iso[0]?.i}`);
  await truncateAll(ctx.prisma);
  const user = await ctx.prisma.user.create({
    data: { email: "owner-d305@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const pro = await ctx.prisma.proProfile.create({
    data: { userId: user.id, businessName: "Sonde D305", phone: "+213550000305" }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const venue = await ctx.prisma.venue.create({
    data: {
      ownerId: pro.id, cityId: city.id, slug: "salle-d305", nameFr: "Salle D305", nameAr: "قاعة",
      capacityMax: 400, basePriceCents: 18_000_000
    },
    select: { id: true }
  });
  ids = { venueId: venue.id };
});

afterAll(async () => {
  if (!existsSync(SORTIE)) mkdirSync(SORTIE, { recursive: true });
  writeFileSync(join(SORTIE, "fk-rival-ii-resultats.txt"), journal.join("\n") + "\n", "utf8");
  await truncateAll(ctx.prisma);
  await ctx.app.close();
});

it("SONDE D305 — (ii) comme rival : l'insertion d'un paiement qui référence la réservation attend-elle ?", async () => {
  const DE = allowedFrom(BookingCommand.ACCEPT);
  const VERS = targetOf(BookingCommand.ACCEPT);
  noter(`prédicat importé : accept ${JSON.stringify(DE)} → ${VERS}`);

  const insererPaiement = (b: string): Etape => [
    `INSERT INTO "payments" ("booking_id","amount_cents","discount_applied_cents","status","updated_at")
     VALUES ($1::uuid, 6000000, 0, 'PENDING', now()) RETURNING id`,
    [b]
  ];
  const forUpdateTeste = (b: string): Etape => [`SELECT id FROM bookings WHERE id = $1::uuid FOR UPDATE`, [b]];
  const forKeyShareTeste = (b: string): Etape => [`SELECT id FROM bookings WHERE id = $1::uuid FOR KEY SHARE`, [b]];
  const verrouSalle: Etape = [`SELECT id FROM venues WHERE id = $1::uuid FOR UPDATE`, [ids.venueId]];

  // (ii) en SQL brut : ce que l'`updateMany` conditionné écrit — colonnes de `acceptUnderVenueLock` + `updated_at`
  // (`@updatedAt` au schéma), sous le verrou de salle qui reste (décision 1).
  const iiSql = (b: string) => () =>
    rivalSql([
      verrouSalle,
      [
        `UPDATE bookings SET status = $2::"BookingStatus", accepted_at = now(), payment_due_at = now() + interval '48 hours',
                             updated_at = now()
          WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`,
        [b, VERS, [...DE]]
      ]
    ]);
  // (ii) par PRISMA : l'`updateMany` réel, dans une transaction interactive réelle, sous le verrou de salle.
  const iiPrisma = (b: string) => () =>
    rivalPrisma(async (tx) => {
      await tx.$queryRaw`SELECT id FROM venues WHERE id = ${ids.venueId}::uuid FOR UPDATE`;
      const r = await tx.booking.updateMany({
        where: { id: b, status: { in: [...DE] } },
        data: { status: VERS, acceptedAt: new Date(), paymentDueAt: new Date(Date.now() + 48 * 3_600_000) }
      });
      return r.count;
    });
  // Témoin : l'écriture ACTUELLE d'`accept` (`update` sans condition), par Prisma — informatif.
  const actuelPrisma = (b: string) => () =>
    rivalPrisma(async (tx) => {
      await tx.$queryRaw`SELECT id FROM venues WHERE id = ${ids.venueId}::uuid FOR UPDATE`;
      await tx.booking.update({
        where: { id: b },
        data: { status: VERS, acceptedAt: new Date(), paymentDueAt: new Date(Date.now() + 48 * 3_600_000) },
        select: { id: true }
      });
      return 1;
    });

  // ── 0. CALIBRATION, trois bras ──────────────────────────────────────────────────────────────────────────────
  noter("\n── 0. calibration du discriminant (trois bras, abandon si un seul manque)");
  {
    const b1 = await reservation();
    const b2 = await reservation();
    const b3 = await reservation();
    const pos = await attendIl(() => rivalSql([[`SELECT id FROM bookings WHERE id = $1::uuid FOR UPDATE`, [b1]]]), insererPaiement(b1));
    const posCle = await attendIl(
      () => rivalSql([[`UPDATE bookings SET idempotency_key = 'sonde-d305-cle' WHERE id = $1::uuid`, [b2]]]),
      insererPaiement(b2)
    );
    const neg = await attendIl(() => rivalSql([[`SELECT id FROM bookings WHERE id = $1::uuid FOR UPDATE`, [b1]]]), insererPaiement(b3));
    ligne("CAL+  rival FOR UPDATE sur la réservation (forme (i))", "ATTEND", verdict(pos.issue));
    ligne("CAL+c rival UPDATE d'une colonne à index unique", "ATTEND", `${verdict(posCle.issue)} · rival a modifié ${posCle.lignesRival}`);
    ligne("CAL-  rival FOR UPDATE sur une AUTRE réservation", "N'ATTEND PAS", verdict(neg.issue));
    expect(pos.issue.attend, "bras positif manqué : le discriminant ne voit pas une attente certaine").toBe(true);
    expect(posCle.lignesRival, "bras positif (clé) : le rival n'a rien modifié").toBe(1);
    expect(posCle.issue.attend, "bras positif (clé) manqué : un UPDATE de colonne de clé n'a pas bloqué").toBe(true);
    expect(neg.issue.attend, "bras négatif manqué : le discriminant voit une attente qui n'existe pas").toBe(false);
  }

  // ── 1. LA QUESTION : (ii) comme rival ─────────────────────────────────────────────────────────────────────────
  const rivaux: [string, (b: string) => () => Promise<Rival>][] = [
    ["(ii) SQL brut", iiSql],
    ["(ii) Prisma updateMany réel", iiPrisma],
    ["témoin : update actuel d'accept (Prisma)", actuelPrisma]
  ];
  for (const [nom, fabrique] of rivaux) {
    noter(`\n── 1. rival = ${nom}`);
    const bTient = await reservation();
    const bCle = await reservation();
    const bPaie = await reservation();
    const tient = await attendIl(fabrique(bTient), forUpdateTeste(bTient));
    const cle = await attendIl(fabrique(bCle), forKeyShareTeste(bCle));
    const paie = await attendIl(fabrique(bPaie), insererPaiement(bPaie));
    ligne(`${nom} — le rival a écrit`, "1 ligne", `${tient.lignesRival} · ${cle.lignesRival} · ${paie.lignesRival}`);
    ligne(`${nom} — SELECT … FOR UPDATE testé (il TIENT la ligne ?)`, "ATTEND", verdict(tient.issue));
    ligne(`${nom} — SELECT … FOR KEY SHARE testé`, "N'ATTEND PAS", verdict(cle.issue));
    ligne(`${nom} — INSERT payments (clé étrangère)`, "N'ATTEND PAS", verdict(paie.issue));
    // Le cas connu a-t-il EU LIEU ? Sans écriture ni verrou tenu, la réponse ne dit rien.
    expect([tient.lignesRival, cle.lignesRival, paie.lignesRival], `${nom} : le rival n'a pas écrit`).toEqual([1, 1, 1]);
    expect(tient.issue.attend, `${nom} : le rival ne tient AUCUN verrou sur la ligne — mesure sans objet`).toBe(true);
  }
  noter("\nfin de la sonde : toutes les mesures ont été jouées (aucune n'a levé).");
});
