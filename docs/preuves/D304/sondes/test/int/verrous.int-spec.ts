// D304 — SONDE JETABLE, versée en pièce. Point 7 de Ko, première inférence du cadrage du
// rang 23 : « la clé étrangère attend-elle le rival ? », mesurée sous DEUX variantes de rival
// (`SELECT … FOR UPDATE` explicite, UPDATE simple du statut), plus les verrous de LIGNE que
// jouera 23a (F1, F5). Ce n'est PAS un test du produit et il n'entre dans aucune suite.
//
// OÙ : la base des int-specs, `zwadj_test`, RECRÉÉE VIDE par le `globalSetup` réel
// (`apps/api/test/int/setup-global.ts`) — jamais une base qui porte des données. Garde en tête.
// COMMENT : depuis `apps/api`, avec la configuration d'intégration RÉELLE :
//     npx vitest run -c vitest.config.int.ts --dir <racine>/docs/preuves/D304/sondes verrous
//
// ⚠ DISCRIMINANT « ATTEND-IL ? » : la requête testée part avec `SET LOCAL lock_timeout`.
// Si elle attend un verrou, PostgreSQL la coupe en 55P03 (lock_not_available) ; si elle
// n'attend pas, elle aboutit tout de suite. Le rival, lui, tient son verrou SANS commiter.
// ⛔ CALIBRÉ SUR SES DEUX BRAS avant toute mesure : FOR UPDATE contre FOR UPDATE sur la même
// ligne (doit attendre), FOR UPDATE sur une AUTRE ligne (ne doit pas). Un bras manqué ⇒ ABANDON.
// ⚠ Mesures « APRÈS COMMIT » : l'attente est PROUVÉE par `pg_stat_activity` sur le pid de la
// connexion testée (patron `attendreBlocage` de `payment-intent-race.int-spec.ts`, restreint au
// pid) ; une course qui n'a pas eu lieu LÈVE. Puis le rival commite, et on lit ce que la
// requête bloquée a fait.
// ⚠ Prédicats des rivaux : IMPORTÉS de `booking-transitions.ts` et `quote-transitions.ts`
// (« le prédicat du rival se relève dans le code qu'il imite », cadrage § 3), jamais recopiés.
// ⚠ Connexions `pg` BRUTES, chemin de sortie en `finally` (leçon : une fuite se voit au spec
// suivant). `pg` se résout depuis `apps/api` : ce fichier vit sous docs/preuves/.
import { createRequire } from "node:module";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { createTestApp, truncateAll, type TestContext } from "../../../../../../apps/api/test/int/helpers";
import {
  BOOKING_TRANSITIONS,
  BookingCommand,
  allowedFrom,
  targetOf
} from "../../../../../../apps/api/src/venues/booking-transitions";
import { QuoteCommand, quoteAllowedFrom, quoteWrittenStatus } from "../../../../../../apps/api/src/venues/quote-transitions";

interface Pg {
  connect(): Promise<void>;
  query(sql: string, params?: unknown[]): Promise<{ rows: Record<string, unknown>[]; rowCount: number | null }>;
  end(): Promise<void>;
}
const requireApi = createRequire(join(process.cwd(), "package.json"));
const { Client } = requireApi("pg") as { Client: new (o: { connectionString: string }) => Pg };

const SORTIE = join(process.cwd(), "..", "..", "docs", "preuves", "D304", "sondes", "sorties");
const journal: string[] = [];
const noter = (l: string): void => {
  journal.push(l);
  console.log(l);
};

let ctx: TestContext;
let seq = 0;
let ids: { ownerId: string; cityId: string; venueId: string };

async function connecter(): Promise<Pg> {
  const c = new Client({ connectionString: process.env.DATABASE_URL ?? "" });
  await c.connect();
  return c;
}

async function reservation(): Promise<string> {
  seq += 1;
  const jour = `2027-11-${String(seq).padStart(2, "0")}`;
  const b = await ctx.prisma.booking.create({
    data: {
      venueId: ids.venueId, slotTemplateId: null,
      eventDate: new Date(`${jour}T00:00:00Z`),
      startsAt: new Date(`${jour}T17:00:00Z`), endsAt: new Date(`${jour}T23:00:00Z`),
      guests: 200, basePriceCents: 20_000_000, servicesTotalCents: 0,
      totalCents: 20_000_000, depositCents: 6_000_000,
      contactFirstName: "Sonde", contactLastName: "D304", contactPhone: "+213550000304"
    },
    select: { id: true }
  });
  return b.id;
}

async function chaine(): Promise<{ v1: string; v2: string }> {
  const base = {
    venueId: ids.venueId, eventDate: new Date("2027-12-01T00:00:00Z"), guests: 100,
    basePriceCents: 1_000_000, servicesTotalCents: 0, totalCents: 1_000_000, depositCents: 300_000, lines: []
  };
  const v1 = await ctx.prisma.quote.create({
    data: { ...base, chainId: "00000000-0000-0000-0000-000000000000", version: 1 },
    select: { id: true }
  });
  await ctx.prisma.quote.update({ where: { id: v1.id }, data: { chainId: v1.id } });
  const v2 = await ctx.prisma.quote.create({
    data: { ...base, chainId: v1.id, version: 2, parentQuoteId: v1.id },
    select: { id: true }
  });
  return { v1: v1.id, v2: v2.id };
}

/** Colonnes d'une table hors `id`, relevées dans le catalogue — jamais écrites de mémoire. */
async function colonnes(table: string): Promise<string[]> {
  const r = await ctx.prisma.$queryRaw<{ column_name: string }[]>`
    SELECT column_name FROM information_schema.columns
     WHERE table_schema = 'public' AND table_name = ${table} AND column_name <> 'id'
     ORDER BY ordinal_position`;
  return r.map((x) => x.column_name);
}

/** INSERT … SELECT copié d'une ligne modèle, avec des colonnes remplacées. */
function copie(table: string, cols: string[], remplace: Record<string, string>): string {
  const liste = cols.map((c) => `"${c}"`).join(", ");
  const valeurs = cols.map((c) => (c in remplace ? remplace[c] : `"${c}"`)).join(", ");
  return `INSERT INTO "${table}" (${liste}) SELECT ${valeurs} FROM "${table}" WHERE id = $1::uuid RETURNING id`;
}

type Etape = [string, unknown[]];
interface Issue {
  attend: boolean;
  sqlstate?: string;
  rowCount?: number | null;
  rows?: Record<string, unknown>[];
}

/** La requête testée ATTEND-elle le verrou du rival ? (discriminant `lock_timeout`) */
async function attendIl(rivalEtapes: Etape[], code: Etape): Promise<Issue> {
  const rival = await connecter();
  const testee = await connecter();
  try {
    await rival.query("BEGIN");
    for (const [sql, p] of rivalEtapes) await rival.query(sql, p);
    await testee.query("BEGIN");
    await testee.query("SET LOCAL lock_timeout = '1500ms'");
    try {
      const r = await testee.query(code[0], code[1]);
      return { attend: false, rowCount: r.rowCount, rows: r.rows };
    } catch (e) {
      const sqlstate = (e as { code?: string }).code;
      if (sqlstate !== "55P03") throw new Error(`MESURE INVALIDE : erreur ${sqlstate} ${(e as Error).message}`);
      return { attend: true, sqlstate };
    }
  } finally {
    await testee.query("ROLLBACK").catch(() => undefined);
    await testee.end();
    await rival.query("ROLLBACK").catch(() => undefined);
    await rival.end();
  }
}

/** Attente PROUVÉE sur le pid de la connexion testée, puis COMMIT du rival, puis issue. */
async function apresCommit(
  rivalEtapes: Etape[],
  code: Etape,
  relecture?: Etape
): Promise<{ attente: string; rowCount: number | null; rows: Record<string, unknown>[]; relu?: Record<string, unknown>[] }> {
  const rival = await connecter();
  const testee = await connecter();
  try {
    await rival.query("BEGIN");
    for (const [sql, p] of rivalEtapes) await rival.query(sql, p);
    await testee.query("BEGIN");
    await testee.query("SET LOCAL statement_timeout = '15s'");
    const pid = (await testee.query("SELECT pg_backend_pid() AS pid")).rows[0]?.pid as number;
    const enVol = testee.query(code[0], code[1]).then(
      (r) => ({ ok: true as const, r }),
      (e: unknown) => ({ ok: false as const, e })
    );
    let attente = "";
    for (let essai = 0; essai < 200 && !attente; essai += 1) {
      const w = await ctx.prisma.$queryRaw<{ wet: string | null; we: string | null }[]>`
        SELECT wait_event_type AS wet, wait_event AS we FROM pg_stat_activity WHERE pid = ${pid}`;
      if (w[0]?.wet === "Lock") attente = `Lock/${w[0].we}`;
      else await new Promise((r) => setTimeout(r, 25));
    }
    if (!attente) throw new Error("LA COURSE N'A PAS EU LIEU : la requête testée n'a attendu aucun verrou. Mesure invalide.");
    await rival.query("COMMIT");
    const issue = await enVol;
    if (!issue.ok) {
      const e = issue.e as { code?: string; message?: string };
      throw new Error(`MESURE INVALIDE : la requête bloquée a levé ${e.code} ${e.message}`);
    }
    const relu = relecture ? (await testee.query(relecture[0], relecture[1])).rows : undefined;
    return { attente, rowCount: issue.r.rowCount, rows: issue.r.rows, relu };
  } finally {
    await testee.query("ROLLBACK").catch(() => undefined);
    await testee.end();
    await rival.query("ROLLBACK").catch(() => undefined);
    await rival.end();
  }
}

const verdict = (i: Issue): string => (i.attend ? "ATTEND (55P03)" : `N'ATTEND PAS (rowCount ${i.rowCount})`);
function ligne(nom: string, attendu: string, mesure: string): void {
  noter(`${nom.padEnd(44)} attendu : ${attendu.padEnd(36)} mesuré : ${mesure}`);
}

beforeAll(async () => {
  ctx = await createTestApp();
  const base = await ctx.prisma.$queryRaw<{ db: string; v: string }[]>`
    SELECT current_database() AS db, current_setting('server_version') AS v`;
  // ⛔ GARDE : jamais une base qui porte des données.
  if (base[0]?.db !== "zwadj_test") throw new Error(`ABANDON : base ${base[0]?.db}, attendu zwadj_test`);
  noter(`base : ${base[0].db} · PostgreSQL ${base[0].v} · niveau d'isolation par défaut de la base mesuré ci-dessous`);
  const iso = await ctx.prisma.$queryRaw<{ i: string }[]>`SELECT current_setting('default_transaction_isolation') AS i`;
  noter(`default_transaction_isolation : ${iso[0]?.i}`);
  await truncateAll(ctx.prisma);
  const user = await ctx.prisma.user.create({
    data: { email: "owner-d304@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const pro = await ctx.prisma.proProfile.create({
    data: { userId: user.id, businessName: "Sonde D304", phone: "+213550000304" }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const venue = await ctx.prisma.venue.create({
    data: {
      ownerId: pro.id, cityId: city.id, slug: "salle-d304", nameFr: "Salle D304", nameAr: "قاعة",
      capacityMax: 400, basePriceCents: 18_000_000
    },
    select: { id: true }
  });
  ids = { ownerId: pro.id, cityId: city.id, venueId: venue.id };
});

afterAll(async () => {
  if (!existsSync(SORTIE)) mkdirSync(SORTIE, { recursive: true });
  writeFileSync(join(SORTIE, "verrous-resultats.txt"), journal.join("\n") + "\n", "utf8");
  await truncateAll(ctx.prisma);
  await ctx.app.close();
});

it("SONDE D304 — la clé étrangère et les verrous de ligne, mesurés", async () => {
  const PENDING = allowedFrom(BookingCommand.ACCEPT); // [PENDING], relu du tableau
  const DECLINE_FROM = allowedFrom(BookingCommand.DECLINE);
  const DECLINE_TO = targetOf(BookingCommand.DECLINE);
  const ACCEPT_TO = targetOf(BookingCommand.ACCEPT);
  const CAC_FROM = allowedFrom(BookingCommand.CANCEL_AS_CLIENT);
  const CAC_TO = targetOf(BookingCommand.CANCEL_AS_CLIENT);
  // Statuts d'où l'annulation client est admise SANS motif : `from` moins `reasonRequiredFrom`
  // (D83), dérivé du tableau — jamais écrit ici.
  const CAC_SANS_MOTIF = CAC_FROM.filter(
    (s) => !BOOKING_TRANSITIONS[BookingCommand.CANCEL_AS_CLIENT].reasonRequiredFrom.includes(s)
  );
  const QUOTE_CANCEL_FROM = quoteAllowedFrom(QuoteCommand.CANCEL);
  const QUOTE_CANCEL_TO = quoteWrittenStatus(QuoteCommand.CANCEL);
  noter(`prédicats importés : accept ${JSON.stringify(PENDING)}→${ACCEPT_TO} · decline ${JSON.stringify(DECLINE_FROM)}→${DECLINE_TO} · cancelAsClient ${JSON.stringify(CAC_FROM)}→${CAC_TO} (sans motif : ${JSON.stringify(CAC_SANS_MOTIF)}) · devis cancel ${JSON.stringify(QUOTE_CANCEL_FROM)}→${QUOTE_CANCEL_TO}`);

  const colsB = await colonnes("bookings");
  const colsQ = await colonnes("quotes");
  noter(`colonnes relevées : bookings ${colsB.length}, quotes ${colsQ.length}`);

  // Rivaux — le prédicat de `transition` (updateMany conditionné), et celui du `cancel` de devis.
  const rivalRefus = (b: string): Etape => [
    `UPDATE bookings SET status = $2::"BookingStatus", declined_at = now() WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`,
    [b, DECLINE_TO, [...DECLINE_FROM]]
  ];
  const rivalAccept = (b: string): Etape => [
    `UPDATE bookings SET status = $2::"BookingStatus", accepted_at = now() WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`,
    [b, ACCEPT_TO, [...PENDING]]
  ];
  const forUpdate = (table: string, id: string): Etape => [`SELECT id FROM ${table} WHERE id = $1::uuid FOR UPDATE`, [id]];
  const annulerDevis = (q: string): Etape => [
    `UPDATE quotes SET status = $2::"QuoteStatus" WHERE id = $1::uuid AND status = ANY($3::"QuoteStatus"[])`,
    [q, QUOTE_CANCEL_TO, [...QUOTE_CANCEL_FROM]]
  ];

  // ── 0. CALIBRATION DU DISCRIMINANT, deux bras ────────────────────────────────────────────
  noter("\n── 0. calibration du discriminant lock_timeout (deux bras)");
  const b1 = await reservation();
  const b2 = await reservation();
  const calPos = await attendIl([forUpdate("bookings", b1)], [`SELECT id FROM bookings WHERE id = $1::uuid FOR UPDATE`, [b1]]);
  const calNeg = await attendIl([forUpdate("bookings", b1)], [`SELECT id FROM bookings WHERE id = $1::uuid FOR UPDATE`, [b2]]);
  ligne("CAL+ FOR UPDATE contre FOR UPDATE, même ligne", "ATTEND", verdict(calPos));
  ligne("CAL- FOR UPDATE contre FOR UPDATE, autre ligne", "N'ATTEND PAS", verdict(calNeg));
  expect(calPos.attend, "bras positif manqué : le discriminant ne voit pas une attente certaine").toBe(true);
  expect(calNeg.attend, "bras négatif manqué : le discriminant voit une attente qui n'existe pas").toBe(false);

  // ── 1. LA QUESTION DE KO : la clé étrangère attend-elle le rival ? ──────────────────────
  noter("\n── 1. clé étrangère — le rival en FOR UPDATE explicite, puis en UPDATE simple du statut");
  {
    const modele = await reservation();
    const q1 = (await chaine()).v1;
    const q2 = (await chaine()).v1;
    const insererResa = (q: string): Etape => [copie("bookings", colsB, { quote_id: "$2::uuid" }), [modele, q]];
    const a = await attendIl([forUpdate("quotes", q1), annulerDevis(q1)], insererResa(q1));
    const b = await attendIl([annulerDevis(q2)], insererResa(q2));
    ligne("FK bookings→quotes, rival FOR UPDATE + annul.", "ATTEND (cadrage § 3)", verdict(a));
    ligne("FK bookings→quotes, rival UPDATE simple", "N'ATTEND PAS (cadrage § 3)", verdict(b));
  }
  {
    const c1 = await chaine();
    const c2 = await chaine();
    const insererV3 = (c: { v1: string; v2: string }): Etape => [
      copie("quotes", colsQ, { parent_quote_id: "$1::uuid", version: "3" }),
      [c.v2]
    ];
    const a = await attendIl([forUpdate("quotes", c1.v2), annulerDevis(c1.v2)], insererV3(c1));
    const b = await attendIl([annulerDevis(c2.v2)], insererV3(c2));
    ligne("FK quotes.parent→v2, rival FOR UPDATE + annul.", "ATTEND (cadrage § 3)", verdict(a));
    ligne("FK quotes.parent→v2, rival UPDATE simple", "N'ATTEND PAS (cadrage § 3)", verdict(b));
  }
  {
    // Même question, la RÉSERVATION étant cette fois la ligne référencée (payments.booking_id) :
    // c'est ce que ferait un FOR UPDATE posé sur la ligne de réservation (choix (i) du § 8).
    const r1 = await reservation();
    const r2 = await reservation();
    const insererPaiement = (b: string): Etape => [
      `INSERT INTO "payments" ("booking_id","amount_cents","discount_applied_cents","status","updated_at")
       VALUES ($1::uuid, 6000000, 0, 'PENDING', now()) RETURNING id`,
      [b]
    ];
    const a = await attendIl([forUpdate("bookings", r1)], insererPaiement(r1));
    const b = await attendIl([rivalRefus(r2)], insererPaiement(r2));
    ligne("FK payments→bookings, rival FOR UPDATE", "(non écrit au cadrage)", verdict(a));
    ligne("FK payments→bookings, rival UPDATE simple", "(non écrit au cadrage)", verdict(b));
  }
  {
    // L'issue du rouge de F2 au niveau SQL : l'insertion bloquée aboutit-elle après l'annulation ?
    const modele = await reservation();
    const q = (await chaine()).v1;
    const r = await apresCommit(
      [forUpdate("quotes", q), annulerDevis(q)],
      [copie("bookings", colsB, { quote_id: "$2::uuid" }), [modele, q]],
      [`SELECT status::text AS statut_devis FROM quotes WHERE id = $1::uuid`, [q]]
    );
    ligne("APRÈS COMMIT : insertion sur devis annulé", "aboutit (rouge de MD-F2-1)", `attente ${r.attente} · insérées ${r.rowCount} · devis ${JSON.stringify(r.relu)}`);
  }

  // ── 2. CE QUE JOUERA 23a : le rival en UPDATE simple (cadrage § 3, F1 et F5) ─────────────
  noter("\n── 2. verrous de ligne de réservation — rival = UPDATE simple (refus depuis PENDING)");
  const ecrireAccept = `UPDATE bookings SET status = $2::"BookingStatus" WHERE id = $1::uuid`;
  const ecrireAcceptCond = `UPDATE bookings SET status = $2::"BookingStatus" WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[])`;
  const lectures: [string, string, string, (b: string) => unknown[]][] = [
    ["lecture simple (relecture D117 actuelle)", "N'ATTEND PAS", `SELECT status::text AS s FROM bookings WHERE id = $1::uuid`, (b) => [b]],
    ["SELECT … FOR UPDATE (choix (i) du § 8)", "ATTEND", `SELECT status::text AS s FROM bookings WHERE id = $1::uuid FOR UPDATE`, (b) => [b]],
    ["SELECT … FOR NO KEY UPDATE", "ATTEND", `SELECT status::text AS s FROM bookings WHERE id = $1::uuid FOR NO KEY UPDATE`, (b) => [b]],
    ["UPDATE nu (écriture actuelle d'accept)", "ATTEND", ecrireAccept, (b) => [b, ACCEPT_TO]],
    ["UPDATE conditionné (choix (ii) du § 8)", "ATTEND", ecrireAcceptCond, (b) => [b, ACCEPT_TO, [...PENDING]]]
  ];
  for (const [nom, attendu, sql, params] of lectures) {
    const b = await reservation();
    const i = await attendIl([rivalRefus(b)], [sql, params(b)]);
    ligne(nom, attendu, verdict(i) + (i.rows?.[0] ? ` · lu ${JSON.stringify(i.rows[0])}` : ""));
  }

  noter("\n── 3. APRÈS COMMIT du rival — ce que la requête bloquée a fait (READ COMMITTED)");
  {
    const b = await reservation();
    const r = await apresCommit([rivalRefus(b)], [`SELECT status::text AS s FROM bookings WHERE id = $1::uuid FOR UPDATE`, [b]]);
    ligne("FOR UPDATE, puis refus commité", "lit DECLINED (prémisse de (i))", `attente ${r.attente} · lu ${JSON.stringify(r.rows)}`);
  }
  {
    const b = await reservation();
    const r = await apresCommit(
      [rivalRefus(b)],
      [`UPDATE bookings SET status = $2::"BookingStatus", accepted_at = now() WHERE id = $1::uuid RETURNING status::text AS s, declined_at IS NOT NULL AS refus_pose`, [b, ACCEPT_TO]]
    );
    ligne("UPDATE nu, puis refus commité", "écrase (rouge de MD-F1-1)", `attente ${r.attente} · modifiées ${r.rowCount} · ${JSON.stringify(r.rows)}`);
  }
  {
    const b = await reservation();
    const r = await apresCommit(
      [rivalRefus(b)],
      [`${ecrireAcceptCond} RETURNING id`, [b, ACCEPT_TO, [...PENDING]]],
      [`SELECT status::text AS s FROM bookings WHERE id = $1::uuid`, [b]]
    );
    ligne("UPDATE conditionné, puis refus commité", "0 ligne (prémisse de (ii))", `attente ${r.attente} · modifiées ${r.rowCount} · relu ${JSON.stringify(r.relu)}`);
  }
  {
    // F5 : le prédicat ACTUEL de l'annulation client, puis le prédicat « sans motif ».
    const b = await reservation();
    const r = await apresCommit(
      [rivalAccept(b)],
      [`UPDATE bookings SET status = $2::"BookingStatus", cancelled_at = now() WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[]) RETURNING status::text AS s`, [b, CAC_TO, [...CAC_FROM]]]
    );
    ligne("F5 prédicat actuel, puis accept commité", "annule (rouge de MD-F5-1)", `attente ${r.attente} · modifiées ${r.rowCount} · ${JSON.stringify(r.rows)}`);
    const b2b = await reservation();
    const r2 = await apresCommit(
      [rivalAccept(b2b)],
      [`UPDATE bookings SET status = $2::"BookingStatus", cancelled_at = now() WHERE id = $1::uuid AND status = ANY($3::"BookingStatus"[]) RETURNING id`, [b2b, CAC_TO, [...CAC_SANS_MOTIF]]],
      [`SELECT status::text AS s FROM bookings WHERE id = $1::uuid`, [b2b]]
    );
    ligne("F5 prédicat sans motif, puis accept commité", "0 ligne", `attente ${r2.attente} · modifiées ${r2.rowCount} · relu ${JSON.stringify(r2.relu)}`);
  }
  noter("\nfin de la sonde : toutes les mesures ont été jouées (aucune n'a levé).");
});
