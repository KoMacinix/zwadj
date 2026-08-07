// Intégration Flux E, Lot E2b — cycle de vie du devis.
//
// Ce qui ne se prouve QU'ICI, contre une vraie base :
//   - qu'au plus UNE version active par chaîne survit, garanti par deux index
//     PARTIELS — donc que la rétrogradation précède bien l'activation ;
//   - que SUPERSEDED n'est pas DECLINED : remplacé ≠ refusé, et l'historique le
//     dit encore six mois plus tard ;
//   - qu'un DRAFT ne s'accepte pas ;
//   - qu'accepter CONVERTIT en réservation et VERROUILLE la date ;
//   - que le taux de transformation compte des CHAÎNES, pas des versions ;
//   - qu'EXPIRED est DÉRIVÉ, jamais stocké.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { QuoteConversionDTO, QuoteDTO, ServiceDTO, VenueProDTO } from "@zwadj/types";
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
}

async function setup(): Promise<Fixture> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, PRO.email, PRO.password);
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7, lng: 3.0 }
  });
  const created = await api()
    .post("/api/v1/venues")
    .set(authH(token))
    .send({ cityId: city.id, nameFr: "Salle El Ryad", nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT" })
    .expect(201);
  const venue = created.body as VenueProDTO;
  const slot = await api()
    .post(`/api/v1/venues/${venue.id}/slot-templates`)
    .set(authH(token))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: SLOT_PRICE })
    .expect(201);
  return { token, venue, slotId: (slot.body as { id: string }).id };
}

const makeQuote = (f: Fixture, over: Record<string, unknown> = {}) =>
  api()
    .post(`/api/v1/venues/${f.venue.id}/quotes`)
    .set(authH(f.token))
    .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 250, ...over });

const act = (f: Fixture, id: string, action: string, body: Record<string, unknown> = {}) =>
  api().post(`/api/v1/quotes/${id}/${action}`).set(authH(f.token)).send(body);

const CONTACT = {
  contactFirstName: "Amina",
  contactLastName: "Bensalem",
  contactPhone: "+213550000001",
  contactEmail: "amina@example.dz",
  paymentMethod: "CASH"
};

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("Création et chaîne de versions", () => {
  it("un devis naît en DRAFT, v1, sa propre racine de chaîne", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    expect(q.status).toBe("DRAFT");
    expect(q.version).toBe(1);
    expect(q.chainId).toBe(q.id);
    expect(q.parentQuoteId).toBeNull();
    expect(q.totalCents).toBe(SLOT_PRICE);
  });

  it("le devis existe SANS client : le pro le tape pour quelqu'un qui hésite", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    expect(q.clientId).toBeNull();
  });

  it("une révision crée la v2 de la MÊME chaîne, en DRAFT, sans rien remplacer", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, v1.id, "send").expect(201);
    const v2 = (
      await api()
        .post(`/api/v1/quotes/${v1.id}/revise`)
        .set(authH(f.token))
        .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 })
        .expect(201)
    ).body as QuoteDTO;

    expect(v2.version).toBe(2);
    expect(v2.chainId).toBe(v1.chainId);
    expect(v2.parentQuoteId).toBe(v1.id);
    expect(v2.status).toBe("DRAFT");
    // ⚠ La v1 reste ACTIVE : tant que la v2 n'est pas envoyée, c'est elle que le
    // client a sous les yeux.
    const list = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)).expect(200))
      .body as QuoteDTO[];
    expect(list.find((q) => q.id === v1.id)?.status).toBe("SENT");
  });
});

describe("Au plus UNE version active par chaîne", () => {
  it("envoyer la v2 REMPLACE la v1 : SUPERSEDED, jamais DECLINED", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, v1.id, "send").expect(201);
    const v2 = (
      await api()
        .post(`/api/v1/quotes/${v1.id}/revise`)
        .set(authH(f.token))
        .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 })
        .expect(201)
    ).body as QuoteDTO;
    await act(f, v2.id, "send").expect(201);

    const list = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)).expect(200))
      .body as QuoteDTO[];
    // « Remplacé » et « refusé » n'appellent pas la même réponse devant un litige.
    expect(list.find((q) => q.id === v1.id)?.status).toBe("SUPERSEDED");
    expect(list.find((q) => q.id === v2.id)?.status).toBe("SENT");
  });

  it("la supersession est IRRÉVERSIBLE : la v1 ne se renvoie pas", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, v1.id, "send").expect(201);
    const v2 = (
      await api()
        .post(`/api/v1/quotes/${v1.id}/revise`)
        .set(authH(f.token))
        .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 })
        .expect(201)
    ).body as QuoteDTO;
    await act(f, v2.id, "send").expect(201);
    const res = await act(f, v1.id, "send").expect(409);
    expect(res.body.message.code).toBe("QUOTE_STATUS_CONFLICT");
  });

  it("l'index partiel tient : deux SENT simultanés sur une chaîne sont impossibles", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, v1.id, "send").expect(201);
    // Écriture DIRECTE, en contournant le service : c'est la BASE qu'on teste.
    await expect(
      ctx.prisma.quote.create({
        data: {
          venueId: f.venue.id,
          chainId: v1.chainId,
          version: 99,
          parentQuoteId: v1.id,
          status: "SENT",
          sentAt: new Date(),
          eventDate: new Date(`${EVENT_DATE}T00:00:00Z`),
          guests: 250,
          basePriceCents: 1,
          servicesTotalCents: 0,
          totalCents: 1,
          depositCents: 1,
          lines: []
        }
      })
    ).rejects.toThrow();
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D117 — CONCURRENCE RÉELLE sur l'envoi.
//
// ⚠ HONNÊTETÉ SUR CE QUE CES DEUX TESTS PROUVENT — ET NE PROUVENT PAS.
//
// Contrairement à `accept()`, AUCUN défaut n'a pu être reproduit ici : sur le
// code d'avant D117, deux `send()` concurrents rendaient déjà 201 + 409, à
// l'appel HTTP comme à l'appel DIRECT du service (sonde, trois exécutions).
// La seconde requête voyait déjà SENT dans son `ownedQuote()`, donc la
// transaction de la première avait déjà commité.
//
// Mais cette sérialisation est un ACCIDENT du runtime — l'ordonnancement du
// pool de connexions —, pas une garantie : une taille de pool différente ou une
// SECONDE instance d'API derrière un répartiteur la ferait disparaître. D117
// déplace donc le contrôle sous le verrou de chaîne pour rendre structurel ce
// qui n'était qu'observé, et ces deux tests FIGENT l'invariant.
//
// ⚠ Le test existant « deux SENT simultanés sur une chaîne sont impossibles »
// contourne le SERVICE et écrit en base : il prouve l'index partiel, pas la
// course. Deux `POST /quotes/:id/send` en vol ne touchent qu'UNE ligne — aucun
// index ne peut les départager, seul le verrou le peut.
// ─────────────────────────────────────────────────────────────────────────────
describe("Envoi CONCURRENT (D117)", () => {
  it("deux envois SIMULTANÉS du MÊME brouillon : 201 + 409, sentAt écrit une seule fois", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;

    const [first, second] = await Promise.all([act(f, q.id, "send"), act(f, q.id, "send")]);

    const codes = [first.status, second.status].sort((x, y) => x - y);
    expect(codes).toEqual([201, 409]);

    const loser = first.status === 409 ? first : second;
    expect(loser.body.message.code).toBe("QUOTE_STATUS_CONFLICT");
    expect(loser.body.message.status).toBe("SENT");

    const winner = first.status === 201 ? first : second;
    const row = await ctx.prisma.quote.findUniqueOrThrow({ where: { id: q.id } });
    expect(row.status).toBe("SENT");
    // `sentAt` est la date que le client voit sur son devis. Sans la relecture
    // sous verrou, le second envoi l'écrasait par une valeur que personne n'a
    // reçue.
    expect(row.sentAt?.toISOString()).toBe((winner.body as QuoteDTO).sentAt);
  });

  it("D121 — deux REFUS simultanés du même devis : un seul aboutit, jamais 500", async () => {
    // Même famille que `decline`/`cancel` côté demandes : `assertStatus` lu hors
    // transaction, puis un `update` inconditionnel.
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);

    const results = await Promise.all([act(f, q.id, "decline"), act(f, q.id, "decline")]);

    const detail = results.map((r) => `${r.status} ${JSON.stringify(r.body)}`).join("\n");
    expect(results.filter((r) => r.status >= 500), detail).toHaveLength(0);
    expect(results.filter((r) => r.status < 400), detail).toHaveLength(1);
  });

  it("D121 — deux CONVERSIONS simultanées du même devis : une seule demande créée, jamais 500", async () => {
    // ⚠ Ici la BASE est déjà l'autorité : `bookings.quote_id` est UNIQUE. La
    // question n'est donc pas « deux demandes ? » mais « le second appelant
    // reçoit-il un 409 lisible, ou une violation de contrainte en 500 ? ».
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);

    const results = await Promise.all([act(f, q.id, "convert", CONTACT), act(f, q.id, "convert", CONTACT)]);

    const detail = results.map((r) => `${r.status} ${JSON.stringify(r.body)}`).join("\n");
    expect(results.filter((r) => r.status >= 500), detail).toHaveLength(0);
    expect(results.filter((r) => r.status < 400), detail).toHaveLength(1);

    const bookings = await ctx.prisma.booking.findMany({ where: { quoteId: q.id } });
    expect(bookings, detail).toHaveLength(1);
  });

  it("deux VERSIONS différentes envoyées simultanément : une seule reste active, l'autre SUPERSEDED", async () => {
    // Garde-fou du correctif : ce chemin-là était DÉJÀ correct (le verrou de
    // chaîne sérialise, `supersedeActive` rétrograde avant d'activer — D97).
    // Il doit le rester après le déplacement du contrôle de statut.
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const v2 = (await act(f, v1.id, "revise", { eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 }).expect(201))
      .body as QuoteDTO;

    const results = await Promise.all([act(f, v1.id, "send"), act(f, v2.id, "send")]);
    expect(results.filter((r) => r.status >= 500)).toHaveLength(0);

    const chain = await ctx.prisma.quote.findMany({ where: { chainId: v1.chainId } });
    // « Actif » = SENT ou ACCEPTED (D98). Au plus un, jamais deux.
    expect(chain.filter((r) => r.status === "SENT" || r.status === "ACCEPTED")).toHaveLength(1);
    // Et le perdant est SUPERSEDED, pas DECLINED (D95) — ou resté DRAFT si son
    // envoi a été refusé avant d'activer. Jamais « refusé ».
    expect(chain.every((r) => r.status !== "DECLINED")).toBe(true);
  });
});

describe("Conversion — D101 : la chaîne complète, dans l'ordre", () => {
  it("un DRAFT ne se convertit pas : personne d'autre que le pro ne l'a vu", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const res = await act(f, q.id, "convert", CONTACT).expect(409);
    expect(res.body.message.code).toBe("QUOTE_STATUS_CONFLICT");
  });

  it("convertir crée une demande PENDING, et le devis RESTE SENT", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);
    const after = (await act(f, q.id, "convert", CONTACT).expect(201)).body as QuoteDTO;

    // ⚠ Le cœur de D101 : le devis n'est PAS accepté. Il attend l'acompte.
    expect(after.status).toBe("SENT");
    expect(after.acceptedAt).toBeNull();
    expect(after.bookingId).not.toBeNull();

    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: after.bookingId as string } });
    // PENDING : c'est le pro qui accepte la date ensuite, comme pour toute
    // demande venue du site. Aucun chemin séparé.
    expect(booking.status).toBe("PENDING");
    expect(booking.quoteId).toBe(q.id);
    expect(booking.source).toBe("WALK_IN");
  });

  it("une PENDING ne verrouille rien : deux devis peuvent viser la MÊME date", async () => {
    const f = await setup();
    const a = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, a.id, "send").expect(201);
    await act(f, a.id, "convert", CONTACT).expect(201);

    const b = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, b.id, "send").expect(201);
    // Aucun 409 : le verrou n'existe qu'à l'acceptation du pro.
    await act(f, b.id, "convert", CONTACT).expect(201);
  });

  it("un devis ne se convertit qu'UNE fois : réviser, pas reconvertir", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);
    await act(f, q.id, "convert", CONTACT).expect(201);
    const res = await act(f, q.id, "convert", CONTACT).expect(409);
    expect(res.body.message.code).toBe("QUOTE_ALREADY_CONVERTED");
  });

  it("les LIGNES du devis deviennent les lignes de la demande", async () => {
    const f = await setup();
    const svc = (
      await api()
        .post(`/api/v1/venues/${f.venue.id}/services`)
        .set(authH(f.token))
        .send({ pricingType: "PER_GUEST", nameFr: "Traiteur", nameAr: "تموين", perGuestPriceCents: 200_000 })
        .expect(201)
    ).body as ServiceDTO;

    const q = (await makeQuote(f, { services: [{ serviceId: svc.id }] }).expect(201)).body as QuoteDTO;
    expect(q.servicesTotalCents).toBe(200_000 * 250);
    await act(f, q.id, "send").expect(201);
    const after = (await act(f, q.id, "convert", CONTACT).expect(201)).body as QuoteDTO;

    const lines = await ctx.prisma.bookingService.findMany({ where: { bookingId: after.bookingId as string } });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(250);
  });

  it("un refus EXPLICITE n'est pas une supersession", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);
    const declined = (await act(f, q.id, "decline").expect(201)).body as QuoteDTO;
    expect(declined.status).toBe("DECLINED");
  });

  it("une chaîne CLOSE ne se révise plus", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);
    await act(f, q.id, "decline").expect(201);
    await api()
      .post(`/api/v1/quotes/${q.id}/revise`)
      .set(authH(f.token))
      .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 })
      .expect(409);
  });
});

describe("Expiration DÉRIVÉE, jamais stockée", () => {
  it("un devis dont validUntil est passé est expiré, et son statut reste SENT", async () => {
    const f = await setup();
    const q = (await makeQuote(f, { validUntil: "2027-09-01" }).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);
    await ctx.prisma.quote.update({ where: { id: q.id }, data: { validUntil: new Date("2020-01-01T00:00:00Z") } });

    const list = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)).expect(200))
      .body as QuoteDTO[];
    const found = list.find((row) => row.id === q.id);
    expect(found?.isExpired).toBe(true);
    // Aucun statut EXPIRED en base : rien ne l'y aurait mis.
    expect(found?.status).toBe("SENT");
  });

  it("un devis expiré ne se convertit plus", async () => {
    const f = await setup();
    const q = (await makeQuote(f, { validUntil: "2027-09-01" }).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);
    await ctx.prisma.quote.update({ where: { id: q.id }, data: { validUntil: new Date("2020-01-01T00:00:00Z") } });
    const res = await act(f, q.id, "convert", CONTACT).expect(409);
    expect(res.body.message.code).toBe("QUOTE_EXPIRED");
  });
});

describe("Taux de transformation — la raison d'être de la table", () => {
  it("compte des CHAÎNES, pas des versions : trois révisions sont UNE affaire", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, v1.id, "send").expect(201);
    const v2 = (
      await api()
        .post(`/api/v1/quotes/${v1.id}/revise`)
        .set(authH(f.token))
        .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 })
        .expect(201)
    ).body as QuoteDTO;
    await act(f, v2.id, "send").expect(201);
    await act(f, v2.id, "convert", CONTACT).expect(201);

    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    // UNE affaire, malgré deux versions envoyées.
    expect(res.sent).toBe(1);
    // ⚠ Pas encore ACCEPTED : le devis attend l'acompte (D101). Ce compteur ne
    // bougera qu'avec le lot Paiement — et c'est exactement ce qu'il doit dire.
    expect(res.accepted).toBe(0);
  });

  it("un devis qui n'aboutit PAS existe quand même — c'était impossible avant", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "send").expect(201);
    await act(f, q.id, "decline").expect(201);

    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    expect(res.sent).toBe(1);
    expect(res.declined).toBe(1);
    expect(res.accepted).toBe(0);
  });

  it("un DRAFT jamais envoyé ne compte pas", async () => {
    const f = await setup();
    await makeQuote(f).expect(201);
    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    expect(res.sent).toBe(0);
  });
});
