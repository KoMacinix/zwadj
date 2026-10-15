// D334 — SESSION ADVERSE de L35-3 · SONDE 4 : le VRAI code (Nest, Prisma, PostgreSQL 18.4) attaqué par une session qui n'a pas écrit L35-3. ÉCRIT ICI, pas repris de `quote-numbering.int-spec.ts`.
//
// DEUX instances de l'application (`createTestApp()` deux fois) = deux `PrismaService`, deux pools de connexions : la contention n'est plus celle d'un seul pool (limite K-C1 de la lecture adverse).
// Chaque verdict est un `expect` de vitest (D305 : `.expect(<statut>)` de supertest lève une `Error`, pas une `AssertionError`).
// Modes visés : F-1, F-2 (avec des CONVERSIONS en plus), F-3, F-4, F-6, F-10, F-11, la révision d'une révision, la suppression d'une salle qui a des devis, deux salles créées ensemble,
// un numéro de salle à cinq chiffres, l'isolement entre pros, l'échec qui ne consomme pas de numéro.
// ⚠ Ce fichier se COPIE dans `apps/api/test/int/` le temps de la sonde et s'en RETIRE ensuite (l'arbre doit revenir propre) ; sa copie versée est une PIÈCE, jamais une suite.
// Le fuseau de l'HÔTE de la sonde : `ADV_TZ=<zone>` le pose avant tout usage de `Date` (Git Bash sous Windows ne transmet pas fidèlement `TZ=<zone/ville>` à Node ; mesuré : seul `TZ=UTC` arrivait).
if (process.env.ADV_TZ) process.env.TZ = process.env.ADV_TZ;
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import type { QuoteDTO, VenueProDTO } from "@zwadj/types";
import { PlaywrightPdfRenderer } from "../../src/documents/playwright-pdf.renderer";
import { QUOTE_STORE, type QuoteStore } from "../../src/venues/quote-store.types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let A: TestContext;
let B: TestContext;
const apiA = () => request(A.app.getHttpServer());
const apiB = () => request(B.app.getHttpServer());
const authH = (t: string) => ({ Authorization: `Bearer ${t}` });

const PRO1 = { role: "PRO", email: "adv-pro1@example.dz", password: "Motdepasse1", businessName: "Salles Un", phone: "+213550000011" };
const PRO2 = { role: "PRO", email: "adv-pro2@example.dz", password: "Motdepasse1", businessName: "Salles Deux", phone: "+213550000012" };
const CONTACT = { contactFirstName: "Amina", contactLastName: "Bensalem", contactPhone: "+213550000001", contactEmail: "amina@example.dz", paymentMethod: "CASH" };
const EVENT_DATE = "2027-09-18";

interface Fx {
  token: string;
  venue: VenueProDTO;
  slotId: string;
  cityId: string;
}

/** Les parties d'une référence `DEVIS-AAAA-SSSS-QQQQ vN` — l'expression est la FORME de R3, pas une valeur attendue. */
function lire(reference: string) {
  const m = /^DEVIS-(\d{4})-(\d{4,})-(\d{4,}) v(\d+)$/u.exec(reference);
  expect(m, `pas une référence : ${reference}`).not.toBeNull();
  return { annee: Number(m![1]), salle: Number(m![2]), devis: Number(m![3]), version: Number(m![4]) };
}

const sql = <T = Record<string, unknown>>(texte: string) => A.prisma.$queryRawUnsafe<T[]>(texte);

async function seedVille(): Promise<string> {
  const wilaya = await A.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await A.prisma.city.create({ data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7, lng: 3.0 } });
  return city.id;
}

async function creerSalle(token: string, cityId: string, nom: string): Promise<{ venue: VenueProDTO; slotId: string }> {
  const created = await apiA().post("/api/v1/venues").set(authH(token)).send({ cityId, nameFr: nom, nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" });
  expect(created.status, JSON.stringify(created.body).slice(0, 200)).toBe(201);
  const venue = created.body as VenueProDTO;
  const slot = await apiA().post(`/api/v1/venues/${venue.id}/slot-templates`).set(authH(token)).send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 20_000_000 });
  expect(slot.status).toBe(201);
  return { venue, slotId: (slot.body as { id: string }).id };
}

async function pro(compte: typeof PRO1, cityId: string, nom: string): Promise<Fx> {
  await registerUser(A, compte);
  await verifyLastRegistered(A);
  const token = await loginAs(A, compte.email, compte.password);
  const { venue, slotId } = await creerSalle(token, cityId, nom);
  return { token, venue, slotId, cityId };
}

const devis = (app: "A" | "B", f: Fx, over: Record<string, unknown> = {}, venueId = f.venue.id, slotId = f.slotId, token = f.token) =>
  (app === "A" ? apiA : apiB)().post(`/api/v1/venues/${venueId}/quotes`).set(authH(token)).send({ eventDate: EVENT_DATE, slotTemplateId: slotId, guests: 250, ...over });
const reviser = (app: "A" | "B", f: Fx, quoteId: string, token = f.token) =>
  (app === "A" ? apiA : apiB)().post(`/api/v1/quotes/${quoteId}/revise`).set(authH(token)).send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 });

async function corps<T>(promesse: PromiseLike<request.Response>, statut: number): Promise<T> {
  const res = await promesse;
  expect(res.status, JSON.stringify(res.body).slice(0, 240)).toBe(statut);
  return res.body as T;
}

beforeAll(async () => {
  A = await createTestApp();
  B = await createTestApp();
  // preuve de l'hôte : le fuseau que Node croit avoir (la sonde est jouée sous trois valeurs de TZ)
  console.log(`HOTE|TZ=${process.env.TZ ?? "(non défini)"}|Intl=${Intl.DateTimeFormat().resolvedOptions().timeZone}|décalage(1 janv 2026)=${new Date(2026, 0, 1).getTimezoneOffset()} min`);
});
afterAll(async () => {
  await A.app.close();
  await B.app.close();
});
beforeEach(async () => {
  await truncateAll(A.prisma);
});
afterEach(() => {
  vi.useRealTimers();
  vi.restoreAllMocks();
});

describe("F-1 / F-2 — le VRAI code, DEUX instances, simultanément", () => {
  it("A-1 : 30 créations lancées ENSEMBLE, alternées entre les deux instances : les numéros 1 à 30, distincts, tous v1, la base et le compteur d'accord", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    const reponses = await Promise.all(Array.from({ length: 30 }, (_, i) => devis(i % 2 === 0 ? "A" : "B", f)));
    expect(reponses.map((r) => r.status)).toEqual(Array(30).fill(201));
    const refs = reponses.map((r) => (r.body as QuoteDTO).reference);
    const parts = refs.map(lire);
    expect(new Set(refs).size).toBe(30);
    expect(parts.map((p) => p.devis).sort((a, b) => a - b)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    expect(new Set(parts.map((p) => p.salle)).size).toBe(1);
    expect(parts.every((p) => p.version === 1)).toBe(true);
    const base = await sql<{ n: number }>(`SELECT reference_number AS n FROM quotes WHERE venue_id = '${f.venue.id}' AND version = 1 ORDER BY 1`);
    expect(base.map((r) => r.n)).toEqual(Array.from({ length: 30 }, (_, i) => i + 1));
    const cpt = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(cpt.map((r) => r.last_number)).toEqual([30]);
  });

  it("A-2 : créations (instance A) + révisions d'une chaîne (instance B) + CONVERSIONS + blocages, ensemble : tout répond 2xx, numéros et versions distincts, aucun interblocage", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    const tete = await corps<QuoteDTO>(devis("A", f), 201);
    const aConvertir: QuoteDTO[] = [];
    for (let i = 0; i < 6; i++) aConvertir.push(await corps<QuoteDTO>(devis("A", f), 201));
    const lancement = [
      ...Array.from({ length: 10 }, () => devis("A", f)),
      ...Array.from({ length: 8 }, () => reviser("B", f, tete.id)),
      ...aConvertir.map((q) => apiA().post(`/api/v1/quotes/${q.id}/convert`).set(authH(f.token)).send(CONTACT)),
      ...[1, 2, 3].map((i) => apiB().post(`/api/v1/venues/${f.venue.id}/availability-blocks`).set(authH(f.token)).send({ startsAt: `2027-03-0${i}T08:00`, endsAt: `2027-03-0${i}T10:00`, reason: "Travaux" }))
    ];
    const reponses = await Promise.all(lancement);
    const statuts = reponses.map((r) => r.status);
    expect(statuts, JSON.stringify(reponses.filter((r) => r.status >= 300).map((r) => r.body)).slice(0, 300)).toEqual(Array(lancement.length).fill(201));
    const versions = await sql<{ version: number }>(`SELECT version FROM quotes WHERE chain_id = '${tete.id}' ORDER BY version`);
    expect(versions.map((v) => v.version)).toEqual(Array.from({ length: 9 }, (_, i) => i + 1));
    const nums = await sql<{ n: number }>(`SELECT DISTINCT reference_number AS n FROM quotes WHERE chain_id = '${tete.id}'`);
    expect(nums).toHaveLength(1);
    const tetes = await sql<{ n: number }>(`SELECT reference_number AS n FROM quotes WHERE venue_id = '${f.venue.id}' AND version = 1 ORDER BY 1`);
    expect(tetes.map((r) => r.n)).toEqual(Array.from({ length: 17 }, (_, i) => i + 1));
  });

  it("A-3 : HUIT salles créées EN MÊME TEMPS (deux instances) : huit numéros de salle distincts", async () => {
    const city = await seedVille();
    await registerUser(A, PRO1);
    await verifyLastRegistered(A);
    const token = await loginAs(A, PRO1.email, PRO1.password);
    const reponses = await Promise.all(
      Array.from({ length: 8 }, (_, i) =>
        (i % 2 === 0 ? apiA : apiB)().post("/api/v1/venues").set(authH(token)).send({ cityId: city, nameFr: `Salle simultanée ${i}`, nameAr: "قاعة", capacityMax: 300, basePriceCents: 10_000_000, bookingMode: "MULTI_SLOT" })
      )
    );
    expect(reponses.map((r) => r.status)).toEqual(Array(8).fill(201));
    const nums = await sql<{ number: number }>(`SELECT number FROM venues ORDER BY number`);
    expect(new Set(nums.map((n) => n.number)).size).toBe(8);
    expect(nums.every((n) => n.number >= 1)).toBe(true);
  });
});

describe("F-3 / F-4 — l'horloge : 23 h 59 à Alger le 31 décembre, minuit, la révision de l'année d'après", () => {
  it("A-4 : 22 h 59 UTC (23 h 59 à Alger) ⇒ 2026 ; 23 h 00 UTC (minuit à Alger) ⇒ 2027 repart de 1 ; la révision écrite en 2027 d'un devis de 2026 garde 2026 et son numéro, et ne touche AUCUN compteur", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2026-12-31T22:59:00.000Z"));
    const token = await loginAs(A, PRO1.email, PRO1.password);
    const g = { ...f, token };
    const avantMinuit = await corps<QuoteDTO>(devis("A", g), 201);
    const avantMinuit2 = await corps<QuoteDTO>(devis("B", g), 201);
    vi.setSystemTime(new Date("2026-12-31T23:00:00.000Z"));
    const apresMinuit = await corps<QuoteDTO>(devis("A", g), 201);
    vi.setSystemTime(new Date("2027-01-01T00:00:00.000Z"));
    // le jeton d'accès vit 15 minutes : après le saut d'horloge on se reconnecte (l'hôte fait croire qu'il est minuit)
    const g2 = { ...f, token: await loginAs(A, PRO1.email, PRO1.password) };
    const revue = await corps<QuoteDTO>(reviser("B", g2, avantMinuit.id, g2.token), 201);
    expect(lire(avantMinuit.reference)).toMatchObject({ annee: 2026, devis: 1, version: 1 });
    expect(lire(avantMinuit2.reference)).toMatchObject({ annee: 2026, devis: 2, version: 1 });
    expect(lire(apresMinuit.reference)).toMatchObject({ annee: 2027, devis: 1, version: 1 });
    expect(lire(revue.reference)).toMatchObject({ annee: 2026, devis: 1, version: 2 });
    expect(lire(revue.reference).salle).toBe(lire(avantMinuit.reference).salle);
    const compteurs = await sql<{ year: number; last_number: number }>(`SELECT year, last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}' ORDER BY year`);
    expect(compteurs).toEqual([{ year: 2026, last_number: 2 }, { year: 2027, last_number: 1 }]);
    // l'invariant de la base : l'année de la référence est l'année d'ALGER de created_at, pour les trois têtes
    const incoherents = await sql<{ id: string }>(`SELECT id FROM quotes WHERE version = 1 AND reference_year <> EXTRACT(YEAR FROM created_at AT TIME ZONE 'Africa/Algiers')::int`);
    expect(incoherents).toEqual([]);
  });

  it("A-5 : exactement à la milliseconde — 22:59:59.999 UTC ⇒ 2026, 23:00:00.000 UTC ⇒ 2027 (le même hôte, deux instants distants d'une milliseconde)", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    vi.useFakeTimers({ toFake: ["Date"] });
    vi.setSystemTime(new Date("2028-12-31T22:59:59.999Z"));
    const token = await loginAs(A, PRO1.email, PRO1.password);
    const g = { ...f, token };
    const a = await corps<QuoteDTO>(devis("A", g, { eventDate: "2029-09-18" }), 201);
    vi.setSystemTime(new Date("2028-12-31T23:00:00.000Z"));
    const b = await corps<QuoteDTO>(devis("A", g, { eventDate: "2029-09-18" }), 201);
    expect([lire(a.reference).annee, lire(b.reference).annee]).toEqual([2028, 2029]);
  });
});

describe("La révision d'une révision, et la révision d'une version qui n'est pas la dernière", () => {
  it("A-6 : v1 → v2 (de v1) → v3 (de v2) → v4 (de v1, qui n'est plus la dernière) : mêmes année, salle et numéro ; versions 2, 3, 4 ; le parent de chacune est celui qu'on a désigné", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    await corps<QuoteDTO>(devis("A", f), 201);
    const v1 = await corps<QuoteDTO>(devis("A", f), 201);
    const v2 = await corps<QuoteDTO>(reviser("A", f, v1.id), 201);
    const v3 = await corps<QuoteDTO>(reviser("B", f, v2.id), 201);
    const v4 = await corps<QuoteDTO>(reviser("A", f, v1.id), 201);
    const p = [v1, v2, v3, v4].map((q) => lire(q.reference));
    expect(p.map((x) => [x.annee, x.salle, x.devis])).toEqual(Array(4).fill([p[0]!.annee, p[0]!.salle, 2]));
    expect(p.map((x) => x.version)).toEqual([1, 2, 3, 4]);
    expect([v2.parentQuoteId, v3.parentQuoteId, v4.parentQuoteId]).toEqual([v1.id, v2.id, v1.id]);
    expect(new Set([v1, v2, v3, v4].map((q) => q.chainId)).size).toBe(1);
    const cpt = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(cpt.map((c) => c.last_number)).toEqual([2]);
  });

  it("A-7 : DEUX révisions simultanées de la même version, par deux instances : deux versions distinctes (2 et 3), pas de 500", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    const v1 = await corps<QuoteDTO>(devis("A", f), 201);
    const [x, y] = await Promise.all([reviser("A", f, v1.id), reviser("B", f, v1.id)]);
    expect([x.status, y.status]).toEqual([201, 201]);
    expect([(x.body as QuoteDTO).version, (y.body as QuoteDTO).version].sort()).toEqual([2, 3]);
  });
});

describe("La suppression d'une salle qui a des devis", () => {
  it("A-8 : la salle est supprimée (204) ; ses devis, ses compteurs et son numéro restent ; ni création, ni lecture du document, ni révision ne passent ; la salle suivante reçoit un numéro PLUS GRAND", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    const q = await corps<QuoteDTO>(devis("A", f), 201);
    const avant = lire(q.reference);
    const supprimee = await apiA().delete(`/api/v1/venues/${f.venue.id}`).set(authH(f.token));
    expect(supprimee.status).toBe(204);
    expect((await devis("A", f)).status).toBe(404);
    expect((await reviser("A", f, q.id)).status).toBe(404);
    expect((await apiA().get(`/api/v1/quotes/${q.id}/document`).query({ locale: "fr" }).set(authH(f.token))).status).toBe(404);
    expect((await apiA().post(`/api/v1/quotes/${q.id}/convert`).set(authH(f.token)).send(CONTACT)).status).toBe(404);
    const lignes = await sql<{ n: number; y: number }>(`SELECT reference_number AS n, reference_year AS y FROM quotes WHERE id = '${q.id}'`);
    expect(lignes).toEqual([{ n: avant.devis, y: avant.annee }]);
    const compteurs = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(compteurs.map((c) => c.last_number)).toEqual([1]);
    const nouvelle = await creerSalle(f.token, city, "Salle Deux");
    const num = await sql<{ number: number }>(`SELECT number FROM venues WHERE id = '${nouvelle.venue.id}'`);
    expect(num[0]!.number).toBeGreaterThan(avant.salle);
    const ancien = await sql<{ number: number }>(`SELECT number FROM venues WHERE id = '${f.venue.id}'`);
    expect(ancien[0]!.number).toBe(avant.salle);
  });
});

describe("Cinq chiffres, nom de fichier, isolement et échecs", () => {
  it("A-9 : une salle numérotée 10 000 et un devis numéroté 10 000 : la référence ne tronque pas ; le document porte le nom dérivé, la référence entière dans le HTML confié au moteur", async () => {
    const city = await seedVille();
    await registerUser(A, PRO1);
    await verifyLastRegistered(A);
    const token = await loginAs(A, PRO1.email, PRO1.password);
    await sql(`SELECT setval('venue_number_seq', 9999, true)`);
    const { venue, slotId } = await creerSalle(token, city, "Salle dix mille");
    const f: Fx = { token, venue, slotId, cityId: city };
    expect((await sql<{ number: number }>(`SELECT number FROM venues WHERE id = '${venue.id}'`))[0]!.number).toBe(10_000);
    await sql(`INSERT INTO quote_number_counters (venue_id, year, last_number) VALUES ('${venue.id}', EXTRACT(YEAR FROM (now() AT TIME ZONE 'Africa/Algiers'))::int, 9999)`);
    const q = await corps<QuoteDTO>(devis("A", f), 201);
    const p = lire(q.reference);
    expect([p.salle, p.devis, p.version]).toEqual([10_000, 10_000, 1]);
    const spy = vi.spyOn(PlaywrightPdfRenderer.prototype, "render").mockImplementation(async () => Buffer.from("%PDF-1.4\n%%EOF\n"));
    const res = await apiA().get(`/api/v1/quotes/${q.id}/document`).query({ locale: "ar" }).set(authH(token)).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBe(`attachment; filename="${q.reference.replace(" v1", "_ar_v1")}.pdf"`);
    expect(String(spy.mock.calls[0]![0])).toContain(q.reference);
    // F-16 : dans le document la référence est ISOLÉE de gauche à droite (un document arabe n'inverse pas les groupes de chiffres autour des tirets)
    expect(String(spy.mock.calls[0]![0])).toContain(`<bdi dir="ltr">${q.reference}</bdi>`);
  });

  it("A-10 : un autre pro ne révise, ne convertit ni ne lit le document d'un devis qui n'est pas le sien (404), et AUCUN compteur ne bouge", async () => {
    const city = await seedVille();
    const f1 = await pro(PRO1, city, "Salle Un");
    const f2 = await pro(PRO2, city, "Salle Deux");
    const q = await corps<QuoteDTO>(devis("A", f1), 201);
    const avant = await sql<{ venue_id: string; year: number; last_number: number }>(`SELECT venue_id, year, last_number FROM quote_number_counters ORDER BY 1,2`);
    expect((await reviser("A", f2, q.id, f2.token)).status).toBe(404);
    expect((await apiA().post(`/api/v1/quotes/${q.id}/convert`).set(authH(f2.token)).send(CONTACT)).status).toBe(404);
    expect((await apiA().get(`/api/v1/quotes/${q.id}/document`).query({ locale: "fr" }).set(authH(f2.token))).status).toBe(404);
    expect((await devis("A", f1, {}, f1.venue.id, f1.slotId, f2.token)).status).toBe(404);
    const apres = await sql<{ venue_id: string; year: number; last_number: number }>(`SELECT venue_id, year, last_number FROM quote_number_counters ORDER BY 1,2`);
    expect(apres).toEqual(avant);
  });

  it("A-11 : une création REFUSÉE (0 invité, créneau d'une autre salle) ne consomme AUCUN numéro : la suivante prend le numéro 2, pas 4", async () => {
    const city = await seedVille();
    const f1 = await pro(PRO1, city, "Salle Un");
    const f2 = await pro(PRO2, city, "Salle Deux");
    await corps<QuoteDTO>(devis("A", f1), 201);
    expect((await devis("A", f1, { guests: 0 })).status).toBe(400);
    expect((await devis("A", f1, { slotTemplateId: f2.slotId })).status).toBeGreaterThanOrEqual(400);
    const suivant = await corps<QuoteDTO>(devis("B", f1), 201);
    expect(lire(suivant.reference).devis).toBe(2);
    const cpt = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f1.venue.id}'`);
    expect(cpt.map((c) => c.last_number)).toEqual([2]);
  });

  it("A-12 : la liste du pro rend, pour chaque devis, la MÊME référence que sa création et que sa révision", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    const a = await corps<QuoteDTO>(devis("A", f), 201);
    const b = await corps<QuoteDTO>(devis("B", f), 201);
    const b2 = await corps<QuoteDTO>(reviser("A", f, b.id), 201);
    const liste = await corps<QuoteDTO[]>(apiB().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)), 200);
    const parId = new Map(liste.map((q) => [q.id, q.reference]));
    expect([parId.get(a.id), parId.get(b.id), parId.get(b2.id)]).toEqual([a.reference, b.reference, b2.reference]);
  });
  it("A-13 (OBSERVATION, hors L35-3) : un devis pour une date d'événement PASSÉE (1999) est accepté par le service — comportement d'avant le lot, relevé ici et non jugé", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    const res = await devis("A", f, { eventDate: "1999-01-01" });
    console.log(`OBSERVATION|date passée 1999-01-01|statut=${res.status}|référence=${(res.body as QuoteDTO).reference ?? "(aucune)"}`);
    expect(typeof res.status).toBe("number");
  });
  it("A-14 : le document d'une VERSION 2 (la dernière) porte la référence v2 — dans l'en-tête, dans le HTML confié au moteur — et son nom de fichier finit par _v2.pdf ; le document de la v1 (plus la dernière) est refusé", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    const v1 = await corps<QuoteDTO>(devis("A", f), 201);
    const v2 = await corps<QuoteDTO>(reviser("A", f, v1.id), 201);
    const spy = vi.spyOn(PlaywrightPdfRenderer.prototype, "render").mockImplementation(async () => Buffer.from("%PDF-1.4\n%%EOF\n"));
    const res = await apiA().get(`/api/v1/quotes/${v2.id}/document`).query({ locale: "fr" }).set(authH(f.token)).buffer(true);
    expect(res.status).toBe(200);
    expect(res.headers["content-disposition"]).toBe(`attachment; filename="${v2.reference.replace(" v2", "_fr_v2")}.pdf"`);
    expect(String(spy.mock.calls[0]![0])).toContain(`<bdi dir="ltr">${v2.reference}</bdi>`);
    expect(String(spy.mock.calls[0]![0])).not.toContain(v1.reference);
    const ancienne = await apiA().get(`/api/v1/quotes/${v1.id}/document`).query({ locale: "fr" }).set(authH(f.token));
    expect(ancienne.status).toBe(409);
  });

  it("A-15 (F-7, par le PORT lui-même) : une création qui échoue APRÈS l'incrément du compteur (créneau inexistant ⇒ clé étrangère) rend le numéro : le compteur n'a pas bougé, la création suivante prend le numéro qui aurait été le sien", async () => {
    const city = await seedVille();
    const f = await pro(PRO1, city, "Salle Un");
    await corps<QuoteDTO>(devis("A", f), 201);
    const avant = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    const magasin = A.app.get<QuoteStore>(QUOTE_STORE);
    const chiffre = { clientId: null, slotTemplateId: "01a10f0a-0000-7000-8000-000000000001", eventDate: new Date("2027-09-18T00:00:00Z"), guests: 100, basePriceCents: 1000, servicesTotalCents: 0, totalCents: 1000, depositCents: 300, lines: [] };
    await expect(magasin.creerTeteDeChaine(f.venue.id, chiffre, { annee: 2026, creeLe: new Date() })).rejects.toBeTruthy();
    const apres = await sql<{ last_number: number }>(`SELECT last_number FROM quote_number_counters WHERE venue_id = '${f.venue.id}'`);
    expect(apres).toEqual(avant);
    const suivant = await corps<QuoteDTO>(devis("B", f), 201);
    expect(lire(suivant.reference).devis).toBe(avant[0]!.last_number + 1);
  });
});
