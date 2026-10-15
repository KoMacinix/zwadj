// Intégration — rang 39 (D333, L35-3) : LA NUMÉROTATION DES DEVIS, contre PostgreSQL.
//
// Ce qui ne se prouve QU'ICI, contre une vraie base (le cadrage de `ZWADJ_CONTINUITE.md`, « CADRAGE DU SOUS-LOT L35-3 », §3) :
//   F-1  N créations simultanées dans la même salle ⇒ N numéros distincts et consécutifs ;
//   F-2  des créations, des révisions ET des créations de blocage (verrou de salle) lancées ensemble : aucun interblocage ;
//   F-3  la création au passage de l'année, à l'heure d'Alger, horloge FIGÉE de part et d'autre ;
//   F-4  une révision l'année suivante garde l'année et le numéro de sa tête, et n'incrémente aucun compteur ;
//   F-6  la séquence des salles peut sauter, ne se répète jamais ;
//   F-7  un échec au milieu de la transaction ne fait pas avancer le compteur ;
//   F-8  le numéro d'une salle ne se modifie pas ;
//   F-9  la clé composite et l'unicité de la première version sont des gardes de BASE, refusées sans passer par le service ;
//   F-12 un compteur désaccordé échoue bruyamment, il ne duplique pas en silence.
// ⚠ Chaque invariant de base est lu par du SQL BRUT, indépendant du client Prisma généré : la garde est celle de la base (D186), pas celle d'un type.
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { QUOTE_STORE, type QuoteStore } from "../../src/venues/quote-store.types";
import { formatQuoteReference, type QuoteDTO, type VenueProDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;
const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const api = () => request(ctx.app.getHttpServer());
const authH = (t: string) => ({ Authorization: `Bearer ${t}` });

const EVENT_DATE = "2027-09-18";
const SLOT_PRICE = 20_000_000;

interface Fixture {
  token: string;
  venue: VenueProDTO;
  slotId: string;
  cityId: string;
}

async function creerSalle(token: string, cityId: string, nom: string): Promise<{ venue: VenueProDTO; slotId: string }> {
  const created = await api()
    .post("/api/v1/venues")
    .set(authH(token))
    .send({ cityId, nameFr: nom, nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" })
    .expect(201);
  const venue = created.body as VenueProDTO;
  const slot = await api()
    .post(`/api/v1/venues/${venue.id}/slot-templates`)
    .set(authH(token))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: SLOT_PRICE })
    .expect(201);
  return { venue, slotId: (slot.body as { id: string }).id };
}

async function setup(): Promise<Fixture> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, PRO.email, PRO.password);
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({ data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7, lng: 3.0 } });
  const { venue, slotId } = await creerSalle(token, city.id, "Salle El Ryad");
  return { token, venue, slotId, cityId: city.id };
}

const makeQuote = (f: Fixture, token = f.token, venueId = f.venue.id, slotId = f.slotId, over: Record<string, unknown> = {}) =>
  api().post(`/api/v1/venues/${venueId}/quotes`).set(authH(token)).send({ eventDate: EVENT_DATE, slotTemplateId: slotId, guests: 250, ...over });

const reviser = (f: Fixture, quoteId: string, token = f.token, guests = 300) =>
  api().post(`/api/v1/quotes/${quoteId}/revise`).set(authH(token)).send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests });

/** Verdict NATIF (D305, R1) : le `.expect(<statut>)` de supertest lève une `Error`, pas une `AssertionError` — il ne serait pas une morsure lue. On attend la réponse, puis `expect` de vitest. */
async function rendu(requete: PromiseLike<request.Response>, statut: number): Promise<request.Response> {
  const res = await requete;
  expect(res.status, JSON.stringify(res.body).slice(0, 200)).toBe(statut);
  return res;
}

/** Lit une référence `DEVIS-AAAA-SSSS-QQQQ vN` en nombres — l'expression est celle de la FORME de R3, pas une valeur attendue. */
function lire(reference: string) {
  const m = /^DEVIS-(\d{4})-(\d{4,})-(\d{4,}) v(\d+)$/u.exec(reference);
  if (!m) throw new Error(`pas une référence : ${reference}`);
  return { annee: Number(m[1]), salle: Number(m[2]), devis: Number(m[3]), version: Number(m[4]) };
}

/** SQL brut, indépendant du client Prisma généré. */
const sql = <T = Record<string, unknown>>(texte: string) => ctx.prisma.$queryRawUnsafe<T[]>(texte);

async function numeroDeSalle(venueId: string): Promise<number> {
  const rows = await sql<{ number: number }>(`SELECT number FROM venues WHERE id = '${venueId}'`);
  return rows[0]!.number;
}

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});
afterEach(() => {
  vi.useRealTimers();
});

describe("K-6 — le devis porte sa référence, bâtie sur la ligne STOCKÉE", () => {
  it("⛔ `reference` = année d'Alger, numéro de la salle, numéro du devis, version — chacun relu en base par du SQL brut, jamais recopié", async () => {
    const f = await setup();
    const q = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    const rows = await sql<{ reference_year: number; reference_number: number; created_at: Date }>(`SELECT reference_year, reference_number, created_at FROM quotes WHERE id = '${q.id}'`);
    const stocke = rows[0]!;
    expect(q.reference).toBe(formatQuoteReference({ year: stocke.reference_year, venueNumber: await numeroDeSalle(f.venue.id), quoteNumber: stocke.reference_number, version: 1 }));
    expect(lire(q.reference)).toMatchObject({ version: 1, devis: 1 });
    // l'année est celle d'ALGER de l'instant de création stocké (S-21), pas celle de l'hôte
    const attendue = await sql<{ y: number }>(`SELECT EXTRACT(YEAR FROM created_at AT TIME ZONE 'Africa/Algiers')::int AS y FROM quotes WHERE id = '${q.id}'`);
    expect(stocke.reference_year).toBe(attendue[0]!.y);
  });

  it("⛔ une révision garde le numéro de la tête, SEULE la version change ; et la liste du pro rend les mêmes références", async () => {
    const f = await setup();
    // un premier devis : la tête testée n'est PAS le numéro 1 — une révision qui écrirait « 1 » au lieu du numéro de sa tête serait vue
    const premier = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    const v1 = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    expect(lire(v1.reference).devis).toBe(2);
    const v2 = (await rendu(reviser(f, v1.id), 201)).body as QuoteDTO;
    const v3 = (await rendu(reviser(f, v2.id), 201)).body as QuoteDTO;
    const [a, b, c] = [v1, v2, v3].map((q) => lire(q.reference));
    expect([a!.version, b!.version, c!.version]).toEqual([1, 2, 3]);
    for (const x of [b!, c!]) expect({ ...x, version: 0 }).toEqual({ ...a!, version: 0 });
    const liste = (await rendu(api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)), 200)).body as QuoteDTO[];
    expect(liste.map((q) => q.reference).sort()).toEqual([premier, v1, v2, v3].map((q) => q.reference).sort());
  });

  it("⛔ la remise renvoie le DTO du MÊME devis, avec la même référence", async () => {
    const f = await setup();
    const q = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    const remis = (await rendu(api().post(`/api/v1/quotes/${q.id}/deliver`).set(authH(f.token)).send({ sentVia: "IN_PERSON" }), 201)).body as QuoteDTO;
    expect(remis.reference).toBe(q.reference);
  });
});

describe("F-1 — deux créations simultanées dans la même salle", () => {
  it("⛔ 20 créations lancées ENSEMBLE : 20 numéros distincts et consécutifs (1 à 20), tous v1, et le compteur de la salle dit 20", async () => {
    const f = await setup();
    const N = 20;
    const reponses = await Promise.all(Array.from({ length: N }, () => makeQuote(f)));
    expect(reponses.map((r) => r.status)).toEqual(Array.from({ length: N }, () => 201));
    const refs = reponses.map((r) => lire((r.body as QuoteDTO).reference));
    expect(new Set(refs.map((r) => r.devis)).size).toBe(N);
    expect(refs.map((r) => r.devis).sort((a, b) => a - b)).toEqual(Array.from({ length: N }, (_, i) => i + 1));
    expect(new Set(refs.map((r) => r.version))).toEqual(new Set([1]));
    expect(new Set(refs.map((r) => r.salle)).size).toBe(1);
    const compteur = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(compteur.map((c) => c.last_number)).toEqual([N]);
  });

  it("⛔ deux SALLES ne partagent ni compteur ni suite : chacune repart de 1, et leurs numéros de salle diffèrent", async () => {
    const f = await setup();
    const autre = await creerSalle(f.token, f.cityId, "Salle Deux");
    const [a, b] = await Promise.all([makeQuote(f), makeQuote(f, f.token, autre.venue.id, autre.slotId)]);
    const [ra, rb] = [lire((a.body as QuoteDTO).reference), lire((b.body as QuoteDTO).reference)];
    expect([ra.devis, rb.devis]).toEqual([1, 1]);
    expect(ra.salle).not.toBe(rb.salle);
    expect([ra.salle, rb.salle].sort((x, y) => x - y)).toEqual([await numeroDeSalle(f.venue.id), await numeroDeSalle(autre.venue.id)].sort((x, y) => x - y));
  });

  it("⛔ deux ANNÉES d'une même salle ont deux compteurs : la création de l'année suivante repart de 1", async () => {
    const f = await setup();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-31T22:55:00.000Z") });
    const token = await loginAs(ctx, PRO.email, PRO.password);
    const a = lire(((await rendu(makeQuote(f, token), 201)).body as QuoteDTO).reference);
    const b = lire(((await rendu(makeQuote(f, token), 201)).body as QuoteDTO).reference);
    vi.setSystemTime(new Date("2026-12-31T23:00:00.000Z"));
    const c = lire(((await rendu(makeQuote(f, token), 201)).body as QuoteDTO).reference);
    expect([a.annee, a.devis, b.annee, b.devis, c.annee, c.devis]).toEqual([2026, 1, 2026, 2, 2027, 1]);
  });
});

describe("F-2 — création, révision et création de blocage simultanées : aucun interblocage", () => {
  it("⛔ 8 créations + 8 révisions d'une chaîne + 3 blocages (verrou de salle) lancés ENSEMBLE : tout se termine en 2xx, aucun `deadlock`, numéros et versions distincts", async () => {
    const f = await setup();
    const tete = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    const creations = Array.from({ length: 8 }, () => makeQuote(f));
    const revisions = Array.from({ length: 8 }, () => reviser(f, tete.id));
    const blocages = Array.from({ length: 3 }, (_, i) =>
      api().post(`/api/v1/venues/${f.venue.id}/availability-blocks`).set(authH(f.token)).send({ startsAt: `2027-03-0${i + 1}T08:00`, endsAt: `2027-03-0${i + 1}T10:00`, reason: "Travaux" })
    );
    const toutes = await Promise.all([...creations, ...revisions, ...blocages]);
    const echecs = toutes.filter((r) => r.status >= 400).map((r) => ({ status: r.status, corps: JSON.stringify(r.body).slice(0, 160) }));
    expect(echecs).toEqual([]);
    expect(toutes.some((r) => /deadlock/iu.test(JSON.stringify(r.body)))).toBe(false);

    const nouvelles = toutes.slice(0, 8).map((r) => lire((r.body as QuoteDTO).reference));
    // la tête occupe le numéro 1 : les huit créations prennent 2 à 9
    expect(nouvelles.map((r) => r.devis).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    const base = lire(tete.reference);
    const versions = toutes.slice(8, 16).map((r) => lire((r.body as QuoteDTO).reference));
    for (const v of versions) expect({ ...v, version: 0 }).toEqual({ ...base, version: 0 });
    expect(versions.map((v) => v.version).sort((a, b) => a - b)).toEqual([2, 3, 4, 5, 6, 7, 8, 9]);
    // aucune révision n'a touché un compteur : il vaut 9 (la tête + huit créations)
    const compteur = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(compteur.map((c) => c.last_number)).toEqual([9]);
  });
});

describe("F-3 / F-4 — l'année d'Alger, et la révision de l'année suivante", () => {
  it("⛔ 31/12 à 22 h 59 UTC ⇒ 2026 ; à 23 h 00 UTC ⇒ 2027 (il est minuit à Alger) : l'année STOCKÉE et la date de création sont du MÊME instant", async () => {
    const f = await setup();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-31T22:59:59.000Z") });
    const token = await loginAs(ctx, PRO.email, PRO.password);
    const avant = (await rendu(makeQuote(f, token), 201)).body as QuoteDTO;
    vi.setSystemTime(new Date("2026-12-31T23:00:00.000Z"));
    const apres = (await rendu(makeQuote(f, token), 201)).body as QuoteDTO;
    expect([lire(avant.reference).annee, lire(apres.reference).annee]).toEqual([2026, 2027]);
    const rows = await sql<{ id: string; created_at: Date; reference_year: number }>(`SELECT id, created_at, reference_year FROM quotes WHERE version = 1`);
    expect(Object.fromEntries(rows.map((r) => [r.id, r.created_at.toISOString()]))).toEqual({ [avant.id]: "2026-12-31T22:59:59.000Z", [apres.id]: "2026-12-31T23:00:00.000Z" });
    // l'invariant S-21, pour TOUTES les têtes : l'année stockée est l'année d'Alger de leur `created_at`
    const incoherentes = await sql(`SELECT id FROM quotes WHERE version = 1 AND reference_year <> EXTRACT(YEAR FROM created_at AT TIME ZONE 'Africa/Algiers')::int`);
    expect(incoherentes).toEqual([]);
  });

  it("⛔ une révision écrite l'année SUIVANTE garde l'année et le numéro de sa tête, et ne crée AUCUNE ligne de compteur pour la nouvelle année", async () => {
    const f = await setup();
    vi.useFakeTimers({ toFake: ["Date"], now: new Date("2026-12-15T10:00:00.000Z") });
    let token = await loginAs(ctx, PRO.email, PRO.password);
    const tete = (await rendu(makeQuote(f, token), 201)).body as QuoteDTO;
    vi.setSystemTime(new Date("2027-01-05T10:00:00.000Z"));
    token = await loginAs(ctx, PRO.email, PRO.password);
    const v2 = (await rendu(reviser(f, tete.id, token), 201)).body as QuoteDTO;
    expect(lire(v2.reference)).toEqual({ ...lire(tete.reference), version: 2 });
    expect(lire(v2.reference).annee).toBe(2026);
    const annees = await sql<{ year: number }>(`SELECT year FROM quote_number_counters WHERE venue_id = '${f.venue.id}' ORDER BY year`);
    expect(annees.map((a) => a.year)).toEqual([2026]);
    // …et un NOUVEAU devis de 2027 prend le numéro 1 de 2027
    const neuf = (await rendu(makeQuote(f, token), 201)).body as QuoteDTO;
    expect([lire(neuf.reference).annee, lire(neuf.reference).devis]).toEqual([2027, 1]);
  });
});

describe("F-6 — la séquence des salles : un saut est admis, une répétition jamais", () => {
  it("⛔ un numéro consommé par une transaction ANNULÉE laisse un TROU ; les numéros restent strictement croissants dans l'ordre de création", async () => {
    const f = await setup();
    await ctx.prisma
      .$transaction(async (tx) => {
        await tx.$queryRawUnsafe("SELECT nextval('venue_number_seq')");
        throw new Error("annulée exprès");
      })
      .catch(() => undefined);
    const suivante = await creerSalle(f.token, f.cityId, "Salle Trois");
    const premier = await numeroDeSalle(f.venue.id);
    const dernier = await numeroDeSalle(suivante.venue.id);
    expect(dernier - premier).toBe(2); // un trou, DIT : le numéro 2 a été consommé puis annulé
    const tous = await sql<{ number: number }>(`SELECT number FROM venues ORDER BY created_at, id`);
    const nombres = tous.map((r) => r.number);
    expect([...nombres].sort((a, b) => a - b)).toEqual(nombres);
    expect(new Set(nombres).size).toBe(nombres.length);
  });

  it("⛔ un numéro de salle déjà pris est REFUSÉ par la base (`UNIQUE`), même inséré en direct", async () => {
    const f = await setup();
    const pris = await numeroDeSalle(f.venue.id);
    const proprietaire = await sql<{ owner_id: string }>(`SELECT owner_id FROM venues WHERE id = '${f.venue.id}'`);
    await expect(
      ctx.prisma.$executeRawUnsafe(
        `INSERT INTO venues (owner_id, city_id, slug, name_fr, name_ar, capacity_max, base_price_cents, number, updated_at)
         SELECT owner_id, city_id, 'doublon', 'Doublon', 'نسخة', 100, 100, ${pris}, now() FROM venues WHERE id = '${f.venue.id}' AND owner_id = '${proprietaire[0]!.owner_id}'`
      )
    ).rejects.toThrow(/venues_number_key|duplicate key/iu);
  });

  it("⛔ le prochain numéro de salle SUIT le plus grand existant (le `setval` de la migration n'est pas en retard)", async () => {
    const f = await setup();
    const suivante = await creerSalle(f.token, f.cityId, "Salle Quatre");
    const max = await sql<{ m: number }>(`SELECT MAX(number)::int AS m FROM venues`);
    expect(await numeroDeSalle(suivante.venue.id)).toBe(max[0]!.m);
  });
});

describe("F-7 — un échec au milieu de la transaction ne fait pas avancer le compteur", () => {
  it("⛔ une insertion refusée APRÈS l'incrément (créneau inexistant ⇒ clé étrangère) : le compteur et le numéro suivant n'ont pas bougé — pas de trou dans les devis", async () => {
    const f = await setup();
    const premier = lire(((await rendu(makeQuote(f), 201)).body as QuoteDTO).reference);
    const store = ctx.app.get<QuoteStore>(QUOTE_STORE);
    const fantome = "018f0000-0000-7000-8000-0000000000aa";
    await expect(
      store.creerTeteDeChaine(
        f.venue.id,
        { clientId: null, slotTemplateId: fantome, eventDate: new Date("2027-09-18T00:00:00.000Z"), guests: 100, basePriceCents: 100, servicesTotalCents: 0, totalCents: 100, depositCents: 30, lines: [] },
        { annee: 2026, creeLe: new Date() }
      )
    ).rejects.toThrow();
    const compteur = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(compteur.map((c) => c.last_number)).toEqual([premier.devis]);
    const suivant = lire(((await rendu(makeQuote(f), 201)).body as QuoteDTO).reference);
    expect(suivant.devis).toBe(premier.devis + 1);
  });
});

describe("F-8 — le numéro d'une salle ne se modifie pas", () => {
  it("⛔ `UPDATE venues SET number` est REFUSÉ par la base ; une autre colonne reste modifiable", async () => {
    const f = await setup();
    await expect(ctx.prisma.$executeRawUnsafe(`UPDATE venues SET number = number + 1000 WHERE id = '${f.venue.id}'`)).rejects.toThrow(/immuable/iu);
    await expect(ctx.prisma.$executeRawUnsafe(`UPDATE venues SET name_fr = 'Renommée' WHERE id = '${f.venue.id}'`)).resolves.toBeDefined();
  });
});

describe("F-4 / F-9 — la clé composite, l'unicité de la première version et les bornes sont des gardes de BASE", () => {
  /** Insère une ligne de devis par SQL brut, en copiant une tête existante et en changeant ce qu'on veut. */
  async function inserer(tete: string, colonnes: { version: number; chain: string; venue?: string; annee?: number; numero?: number; id?: string }) {
    return ctx.prisma.$executeRawUnsafe(
      `INSERT INTO quotes (${colonnes.id ? "id, " : ""}venue_id, chain_id, version, parent_quote_id, reference_year, reference_number, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines)
       SELECT ${colonnes.id ? `'${colonnes.id}'::uuid, ` : ""}${colonnes.venue ? `'${colonnes.venue}'::uuid` : "venue_id"}, ${colonnes.chain}::uuid, ${colonnes.version}, ${colonnes.version > 1 ? `'${tete}'::uuid` : "NULL::uuid"}, ${colonnes.annee ?? "reference_year"}, ${colonnes.numero ?? "reference_number"},
              event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines FROM quotes WHERE id = '${tete}'`
    );
  }

  it("⛔ une version qui diffère de sa tête par le NUMÉRO, l'ANNÉE ou la SALLE est REFUSÉE (`quotes_chain_head_fkey`)", async () => {
    const f = await setup();
    const autre = await creerSalle(f.token, f.cityId, "Salle Deux");
    const tete = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    const cas: [string, Parameters<typeof inserer>[1]][] = [
      ["un autre numéro", { version: 2, chain: `'${tete.id}'`, numero: 777 }],
      ["une autre année", { version: 2, chain: `'${tete.id}'`, annee: 2030 }],
      ["une autre salle", { version: 2, chain: `'${tete.id}'`, venue: autre.venue.id }]
    ];
    for (const [nom, c] of cas) {
      await expect(inserer(tete.id, c), nom).rejects.toThrow(/quotes_chain_head_fkey|foreign key/iu);
    }
    // …et la version FIDÈLE à sa tête passe : la garde ne refuse pas tout
    await expect(inserer(tete.id, { version: 2, chain: `'${tete.id}'` })).resolves.toBeDefined();
  });

  it("⛔ deux TÊTES de même (salle, année, numéro) : REFUSÉES (`quotes_reference_head_unique`) ; une VERSION 2 qui reprend le numéro de sa tête est ACCEPTÉE (le filtre `version = 1`)", async () => {
    const f = await setup();
    const tete = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    const nouveau = "018f0000-0000-7000-8000-0000000000bb";
    await expect(inserer(tete.id, { id: nouveau, version: 1, chain: `'${nouveau}'` })).rejects.toThrow(/quotes_reference_head_unique|duplicate key/iu);
    await expect(inserer(tete.id, { version: 2, chain: `'${tete.id}'` })).resolves.toBeDefined();
  });

  it("⛔ les bornes de la base : un numéro de devis ≤ 0 et une année hors de 2000-9999 sont REFUSÉS (`CHECK`)", async () => {
    const f = await setup();
    const tete = (await rendu(makeQuote(f), 201)).body as QuoteDTO;
    for (const [nom, c] of [
      ["numéro 0", { numero: 0 }],
      ["année 1999", { annee: 1999 }],
      ["année 10000", { annee: 10_000 }]
    ] as const) {
      const nouveau = "018f0000-0000-7000-8000-0000000000cc";
      await expect(inserer(tete.id, { id: nouveau, version: 1, chain: `'${nouveau}'`, ...c }), nom).rejects.toThrow(/check|violates/iu);
    }
  });
});

describe("F-12 — un compteur désaccordé échoue BRUYAMMENT, il ne duplique pas en silence", () => {
  it("⛔ compteur remis en arrière à la main : la création suivante échoue (le numéro est pris), rien n'est écrit, aucun doublon n'existe", async () => {
    const f = await setup();
    await rendu(makeQuote(f), 201);
    await rendu(makeQuote(f), 201);
    await ctx.prisma.$executeRawUnsafe(`UPDATE quote_number_counters SET last_number = 1 WHERE venue_id = '${f.venue.id}'`);
    const avant = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM quotes`);
    const reponse = await makeQuote(f);
    expect(reponse.status).toBeGreaterThanOrEqual(500);
    const apres = await sql<{ n: number }>(`SELECT count(*)::int AS n FROM quotes`);
    expect(apres[0]!.n).toBe(avant[0]!.n);
    const doublons = await sql(`SELECT venue_id, reference_year, reference_number FROM quotes WHERE version = 1 GROUP BY 1, 2, 3 HAVING count(*) > 1`);
    expect(doublons).toEqual([]);
    const compteur = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(compteur.map((c) => c.last_number)).toEqual([1]); // l'incrément raté a été ANNULÉ avec la transaction
  });
});
