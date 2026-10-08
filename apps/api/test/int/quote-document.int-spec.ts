// Intégration du DOCUMENT du devis (PDF) — rang 33 (D326). Méthode : normale, AVEC la règle des montants (décision du relecteur de D325, décision 4 de D326).
//
// Ce qui ne se prouve QU'ICI, contre une vraie base et la vraie route :
//   - le propriétaire de la salle du devis, et lui seul, télécharge (un autre pro, un client, un anonyme : refusés) ;
//   - le PDF d'une version qui n'est plus active est REFUSÉ ; le serveur ne sert ni l'ancienne valeur ni une autre version à sa place ;
//   - ⛔ LE MONTANT IMPRIMÉ EST LA VALEUR STOCKÉE : une ligne dont `deposit_cents` n'est PAS 30 % du total (écriture directe, comme l'état d'une ligne
//     ancienne) s'imprime telle quelle ; et ⛔ UN CHANGEMENT DES RÈGLES DE PRIX APRÈS LE DEVIS NE CHANGE PAS LE MONTANT IMPRIMÉ ;
//   - la langue : celle du compte client quand le devis y est lié, sinon celle que le pro envoie ;
//   - la route n'écrit RIEN (la ligne du devis est identique avant et après) ;
//   - le canal « e-mail » est ÉCRIT en base puis relu — la base n'en liste pas les valeurs (`quotes_sent_via_not_blank`), l'énuméré de `@zwadj/types` est seule autorité.
//
// ⚠ COMMENT LE MONTANT IMPRIMÉ SE LIT : le texte d'un PDF de Chromium est écrit en glyphes (identifiants de police) — il ne se relit pas sans un extracteur qu'on n'a pas. Le test observe
// donc le HTML que la vraie route CONFIE au moteur (espion sur `PlaywrightPdfRenderer.prototype.render`) : c'est lui qui porte les montants ; le moteur, lui, est mesuré par
// `pdf-renderer.int-spec.ts` (script inerte, réseau muet, police embarquée) et par la preuve de l'arabe (les pages rastérisées).
import request from "supertest";
import { afterAll, afterEach, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { formatDZD, QUOTE_SENT_VIA_ORDER, QuoteErrorCode, type QuoteConversionDTO, type QuoteDTO, type VenueProDTO } from "@zwadj/types";
import { PlaywrightPdfRenderer } from "../../src/documents/playwright-pdf.renderer";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";
import { pdfFonts } from "./pdf-inspect";

let ctx: TestContext;
const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const AUTRE_PRO = { role: "PRO", email: "autre-pro@example.dz", password: "Motdepasse1", businessName: "Autre Salle", phone: "+213550000008" };
const CLIENT_AR = { role: "CLIENT", email: "amina@example.dz", password: "Motdepasse1", firstName: "آمنة", lastName: "بن سالم", locale: "ar" };
const CLIENT_FR = { role: "CLIENT", email: "yacine@example.dz", password: "Motdepasse1", firstName: "Yacine", lastName: "Benali", locale: "fr" };
const api = () => request(ctx.app.getHttpServer());
const authH = (t: string) => ({ Authorization: `Bearer ${t}` });
/** `.expect(<statut>)` de supertest lève une `Error`, PAS une `AssertionError` (D305, mesuré par `neutralize-r33.py`) : un verdict s'écrit par `expect` de vitest. Une assertion-fonction de
 *  supertest laisse remonter ce que `expect` lève — le statut reçu s'imprime « expected 200 to be 404 ». */
const statut = (attendu: number) => (res: request.Response) => {
  expect(res.status).toBe(attendu);
};

const EVENT_DATE = "2027-09-18";
const SLOT_PRICE = 20_000_000;

interface Fixture {
  token: string;
  venue: VenueProDTO;
  slotId: string;
}

async function seedGeographie() {
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  return ctx.prisma.city.create({ data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7, lng: 3.0 } });
}

async function pro(compte: typeof PRO, cityId: string, nameAr = "قاعة الياسمين للأفراح"): Promise<Fixture> {
  await registerUser(ctx, compte);
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, compte.email, compte.password);
  const created = await api()
    .post("/api/v1/venues")
    .set(authH(token))
    .send({ cityId, nameFr: `Salle ${compte.businessName}`, nameAr, capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" })
    .expect(statut(201));
  const venue = created.body as VenueProDTO;
  const slot = await api()
    .post(`/api/v1/venues/${venue.id}/slot-templates`)
    .set(authH(token))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: SLOT_PRICE })
    .expect(statut(201));
  return { token, venue, slotId: (slot.body as { id: string }).id };
}

const makeQuote = (f: Fixture, over: Record<string, unknown> = {}) =>
  api().post(`/api/v1/venues/${f.venue.id}/quotes`).set(authH(f.token)).send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 250, ...over });

/** Les octets d'un PDF restent des octets ; une ERREUR (JSON) se lit comme du JSON — sans cela, les corps des 4xx arrivent en `Buffer` et aucune assertion sur leur code ne voit rien. */
const binaire = (res: request.Response, done: (err: Error | null, body: unknown) => void) => {
  const morceaux: Buffer[] = [];
  res.on("data", (c: Buffer) => morceaux.push(c));
  res.on("end", () => {
    const octets = Buffer.concat(morceaux);
    done(null, String(res.headers["content-type"] ?? "").includes("json") ? (JSON.parse(octets.toString("utf8")) as unknown) : octets);
  });
};
const documentDe = (token: string, id: string, query: Record<string, string> = { locale: "fr" }) =>
  api().get(`/api/v1/quotes/${id}/document`).query(query).set(authH(token)).buffer(true).parse(binaire);

/** Espion du moteur : la route est la VRAIE (rôles, propriété, politique, modèle) ; seul le rendu est remplacé — sauf `reel`, qui le laisse passer en l'enregistrant. */
function espionner(reel = false) {
  // Sans implémentation de remplacement, l'espion appelle l'ORIGINAL et enregistre ses arguments.
  const spy = vi.spyOn(PlaywrightPdfRenderer.prototype, "render");
  if (!reel) spy.mockImplementation(async () => Buffer.from("%PDF-1.4\n%%EOF\n"));
  return { vus: () => spy.mock.calls.map((c) => c[0]) };
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
  vi.restoreAllMocks();
});

describe("La route — rôles, propriété, contrat (décision 4)", () => {
  it("le propriétaire télécharge : application/pdf, pièce jointe, non mise en cache, langue appliquée — et la ligne du devis est INCHANGÉE (la route n'écrit rien)", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    const avant = await ctx.prisma.quote.findUniqueOrThrow({ where: { id: q.id } });
    const { vus } = espionner();

    const res = await documentDe(f.token, q.id, { locale: "ar" }).expect(statut(200));
    expect(res.headers["content-type"]).toMatch(/^application\/pdf/);
    expect(res.headers["content-disposition"]).toBe(`attachment; filename="devis-${EVENT_DATE}-v1-${q.id.slice(0, 8)}.pdf"`);
    expect(res.headers["cache-control"]).toBe("private, no-store");
    expect(res.headers["x-content-type-options"]).toBe("nosniff");
    expect(res.headers["content-language"]).toBe("ar");
    expect(vus()).toHaveLength(1);

    const apres = await ctx.prisma.quote.findUniqueOrThrow({ where: { id: q.id } });
    expect(apres).toEqual(avant);
    // Aucun devis de plus, aucune autre ligne : le document se GÉNÈRE, il ne se stocke pas (Ko : « je ne veux stocker que les données structurées »).
    expect(await ctx.prisma.quote.count()).toBe(1);
  });

  it("le VRAI moteur : un PDF valide, la police du dépôt embarquée et seule", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    espionner(true);

    const res = await documentDe(f.token, q.id, { locale: "ar" }).expect(statut(200));
    const pdf = res.body as Buffer;
    expect(pdf.subarray(0, 5).toString("latin1")).toBe("%PDF-");
    const polices = pdfFonts(pdf);
    expect(polices.length).toBeGreaterThan(0);
    expect(polices.filter((p) => !p.embedded || !/ReadexPro/.test(p.name))).toEqual([]);
  }, 90_000);

  it("⛔ un AUTRE pro est refusé en 404 indistinct — rien n'est rendu : un identifiant deviné ne livre pas les données d'un client", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const autre = await pro(AUTRE_PRO, city.id);
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    const { vus } = espionner();

    const res = await documentDe(autre.token, q.id).expect(statut(404));
    const inexistant = await documentDe(autre.token, "01a10f0a-0000-7000-8000-000000000000").expect(statut(404));
    const malForme = await documentDe(autre.token, "pas-un-uuid").expect(statut(404));
    expect((res.body as { code?: string }).code ?? (res.body as { message?: { code?: string } }).message?.code).toBe(QuoteErrorCode.QUOTE_NOT_FOUND);
    // Les trois refus sont INDISCERNABLES : on ne peut pas sonder l'existence d'un devis.
    // L'enveloppe porte aussi `path` et `timestamp` (posés par le filtre d'exceptions, différents par construction) : ce qui doit être identique est le statut et le MESSAGE.
    const lisible = (b: unknown) => ({ statusCode: (b as { statusCode: number }).statusCode, message: (b as { message: unknown }).message });
    expect(lisible(res.body)).toEqual(lisible(inexistant.body));
    expect(lisible(res.body)).toEqual(lisible(malForme.body));
    expect(vus()).toHaveLength(0);
  });

  it("un CLIENT est refusé (403), un anonyme aussi (401), une salle SUPPRIMÉE rend le même 404", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    await registerUser(ctx, CLIENT_FR);
    await verifyLastRegistered(ctx);
    const tClient = await loginAs(ctx, CLIENT_FR.email, CLIENT_FR.password);
    const { vus } = espionner();

    await documentDe(tClient, q.id).expect(statut(403));
    await api().get(`/api/v1/quotes/${q.id}/document`).query({ locale: "fr" }).expect(statut(401));
    await ctx.prisma.venue.update({ where: { id: f.venue.id }, data: { deletedAt: new Date() } });
    await documentDe(f.token, q.id).expect(statut(404));
    expect(vus()).toHaveLength(0);
  });

  it("la langue de repli est OBLIGATOIRE et se limite à fr / ar : absente ou autre, 400", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    const { vus } = espionner();
    await documentDe(f.token, q.id, {}).expect(statut(400));
    await documentDe(f.token, q.id, { locale: "en" }).expect(statut(400));
    await documentDe(f.token, q.id, { locale: "AR" }).expect(statut(400));
    await documentDe(f.token, q.id, { locale: "fr", autre: "x" }).expect(statut(400));
    expect(vus()).toHaveLength(0);
  });
});

describe("⛔ La VERSION ACTIVE (décision 1) — le serveur ne sert ni l'ancienne valeur ni une autre version à sa place", () => {
  it("après une révision, le PDF de la v1 est REFUSÉ (409, `latestVersion` 2) et celui de la v2 est servi", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const v1 = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    const v2 = (
      await api().post(`/api/v1/quotes/${v1.id}/revise`).set(authH(f.token)).send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 120 }).expect(statut(201))
    ).body as QuoteDTO;
    expect(v2.version).toBe(2);
    const { vus } = espionner();

    const refus = await documentDe(f.token, v1.id).expect(statut(409));
    const corps = refus.body as { message?: { code?: string; latestVersion?: number } };
    expect(corps.message?.code ?? (refus.body as { code?: string }).code).toBe(QuoteErrorCode.QUOTE_VERSION_NOT_ACTIVE);
    expect(corps.message?.latestVersion ?? (refus.body as { latestVersion?: number }).latestVersion).toBe(2);
    expect(vus()).toHaveLength(0); // rien n'a été rendu : ni l'ancienne valeur, ni la v2 à la place

    await documentDe(f.token, v2.id).expect(statut(200));
    expect(vus()).toHaveLength(1);
  });

  it("une chaîne dont la dernière version est ANNULÉE rend le 409 de statut ; une ANCIENNE version annulée reste « pas la version active » (ordre des refus)", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const v1 = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    const v2 = (await api().post(`/api/v1/quotes/${v1.id}/revise`).set(authH(f.token)).send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 120 }).expect(statut(201)))
      .body as QuoteDTO;
    await api().post(`/api/v1/quotes/${v1.id}/cancel`).set(authH(f.token)).send({}).expect(statut(201));
    espionner();

    // v1 : annulée ET plus ancienne ⇒ « pas la version active » (l'information utile).
    const ancienne = await documentDe(f.token, v1.id).expect(statut(409));
    expect(JSON.stringify(ancienne.body)).toContain(QuoteErrorCode.QUOTE_VERSION_NOT_ACTIVE);
    expect(JSON.stringify(ancienne.body)).not.toContain(QuoteErrorCode.QUOTE_STATUS_CONFLICT);
    // v2 annulée à son tour : la chaîne n'a plus de version active, le statut RÉEL parle.
    await api().post(`/api/v1/quotes/${v2.id}/cancel`).set(authH(f.token)).send({}).expect(statut(201));
    const close = await documentDe(f.token, v2.id).expect(statut(409));
    expect(JSON.stringify(close.body)).toContain(QuoteErrorCode.QUOTE_STATUS_CONFLICT);
  });
});

describe("⛔ LA RÈGLE DES MONTANTS — le PDF imprime la valeur STOCKÉE, jamais un recalcul (précision de Ko, décision 1)", () => {
  it("test 1 — l'acompte stocké, qui n'est PAS 30 % du total, s'imprime tel quel", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    // Écriture DIRECTE : l'état d'une ligne dont l'acompte a été fixé autrement. Aucun chemin de l'API ne sait plus le produire — c'est précisément le cas
    // qu'un `Math.round(total * 0.3)` côté PDF ne saurait pas imprimer.
    const STOCKE = 12_345_000;
    await ctx.prisma.quote.update({ where: { id: q.id }, data: { depositCents: STOCKE } });
    expect(STOCKE).not.toBe(Math.round(q.totalCents * 0.3));
    const { vus } = espionner();

    await documentDe(f.token, q.id).expect(statut(200));
    const html = vus()[0] as string;
    expect(html).toContain(formatDZD(STOCKE));
    expect(html).not.toContain(formatDZD(Math.round(q.totalCents * 0.3)));
    expect(html).not.toContain(formatDZD(q.depositCents));
  });

  it("test 2 — un changement des RÈGLES DE PRIX APRÈS le devis ne change PAS le montant imprimé (et un NOUVEAU devis, lui, suit les nouvelles règles)", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const ancien = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;

    // Les règles changent : le prix du créneau monte ET une règle de saison couvre le mois de l'événement.
    await api().patch(`/api/v1/venues/${f.venue.id}/slot-templates/${f.slotId}`).set(authH(f.token)).send({ basePriceCents: 30_000_000 }).expect(statut(200));
    await api()
      .post(`/api/v1/venues/${f.venue.id}/slot-templates/${f.slotId}/pricing-rules`)
      .set(authH(f.token))
      .send({ ruleType: "SEASON", label: "Septembre", priceCents: 35_000_000, startMonth: 9, endMonth: 9 })
      .expect(statut(201));

    // Le test ne prouve quelque chose QUE si les règles ont bel et bien changé : un devis neuf, sur les mêmes conditions, coûte autre chose.
    const neuf = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    expect(neuf.totalCents).not.toBe(ancien.totalCents);
    expect(neuf.basePriceCents).toBe(35_000_000);

    const { vus } = espionner();
    await documentDe(f.token, ancien.id).expect(statut(200));
    const html = vus()[0] as string;
    expect(html).toContain(formatDZD(ancien.basePriceCents));
    expect(html).toContain(formatDZD(ancien.totalCents));
    expect(html).toContain(formatDZD(ancien.depositCents));
    expect(html).not.toContain(formatDZD(neuf.basePriceCents));
    expect(html).not.toContain(formatDZD(neuf.depositCents));
  });
});

describe("La langue du PDF (décision 7) — celle du client quand elle est lisible, sinon celle du pro", () => {
  it("un devis lié à un client `ar` : PDF ARABE, même si le pro clique depuis une interface française — et le HTML porte le nom du client", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    await registerUser(ctx, CLIENT_AR);
    await verifyLastRegistered(ctx);
    const client = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT_AR.email } });
    const q = (await makeQuote(f, { clientId: client.id }).expect(statut(201))).body as QuoteDTO;
    const { vus } = espionner();

    const res = await documentDe(f.token, q.id, { locale: "fr" }).expect(statut(200));
    expect(res.headers["content-language"]).toBe("ar");
    const html = vus()[0] as string;
    expect(html).toContain('<html lang="ar" dir="rtl">');
    expect(html).toContain("آمنة بن سالم");
  });

  it("un client `fr` depuis une interface arabe : PDF français ; sans client (le parcours sur place), le REPLI suit la langue envoyée, dans les deux sens", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    await registerUser(ctx, CLIENT_FR);
    await verifyLastRegistered(ctx);
    const client = await ctx.prisma.user.findUniqueOrThrow({ where: { email: CLIENT_FR.email } });
    const avecClient = (await makeQuote(f, { clientId: client.id }).expect(statut(201))).body as QuoteDTO;
    const surPlace = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    espionner();

    expect((await documentDe(f.token, avecClient.id, { locale: "ar" }).expect(statut(200))).headers["content-language"]).toBe("fr");
    expect((await documentDe(f.token, surPlace.id, { locale: "ar" }).expect(statut(200))).headers["content-language"]).toBe("ar");
    expect((await documentDe(f.token, surPlace.id, { locale: "fr" }).expect(statut(200))).headers["content-language"]).toBe("fr");
  });
});

describe("Le canal « e-mail » (décision 8) — réellement ÉCRIT en base, libellé mesuré, compté par l'entonnoir", () => {
  it("chaque canal de la liste d'autorité est accepté ET relu en base : un canal accepté par le type mais refusé par la base casserait ici", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    for (const canal of QUOTE_SENT_VIA_ORDER) {
      const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
      const res = await api().post(`/api/v1/quotes/${q.id}/deliver`).set(authH(f.token)).send({ sentVia: canal }).expect(statut(201));
      expect((res.body as QuoteDTO).sentVia).toBe(canal);
      const ligne = await ctx.prisma.quote.findUniqueOrThrow({ where: { id: q.id } });
      expect(ligne.sentVia).toBe(canal);
      expect(ligne.sentAt).not.toBeNull();
    }
    // Et la base n'a PAS de liste : le blanc seul est interdit — c'est pourquoi aucune migration n'a été écrite.
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    await expect(ctx.prisma.quote.update({ where: { id: q.id }, data: { sentVia: "  " } })).rejects.toThrow();
    await api().post(`/api/v1/quotes/${q.id}/deliver`).set(authH(f.token)).send({ sentVia: "FAX" }).expect(statut(400));
  });

  it("l'entonnoir COMPTE le canal e-mail : un devis remis par e-mail entre dans `delivered`", async () => {
    const city = await seedGeographie();
    const f = await pro(PRO, city.id);
    const q = (await makeQuote(f).expect(statut(201))).body as QuoteDTO;
    const avant = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(statut(200))).body as QuoteConversionDTO;
    await api().post(`/api/v1/quotes/${q.id}/deliver`).set(authH(f.token)).send({ sentVia: "EMAIL" }).expect(statut(201));
    const apres = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(statut(200))).body as QuoteConversionDTO;
    expect(apres.delivered).toBe(avant.delivered + 1);
  });
});
