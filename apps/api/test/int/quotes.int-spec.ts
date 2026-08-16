// Intégration Flux E, Lot E2b — cycle de vie du devis, refondu au lot Q2.
//
// Ce qui ne se prouve QU'ICI, contre une vraie base :
//   - qu'un BROUILLON se convertit, sans remise préalable (D160) ;
//   - que la REMISE ne change aucun statut et se répète ;
//   - que l'entonnoir compte sur `sentVia` et non plus sur `sentAt` (D162) ;
//   - que le taux de transformation compte des CHAÎNES, pas des versions ;
//   - que SUPERSEDED n'est pas CANCELLED : les lignes héritées le disent encore ;
//   - que l'entonnoir compte les DEUX statuts perdus, CANCELLED et l'hérité
//     DECLINED — sans quoi il retomberait à zéro le jour du déploiement ;
//   - qu'aucun chemin du service n'écrit plus `SENT`.
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

/** Remise du devis. ⚠ Le canal est OBLIGATOIRE : une remise sans canal ne
 *  compte dans aucun entonnoir, et l'API la refuse en 400. */
const remettre = (f: Fixture, id: string, sentVia = "IN_PERSON") =>
  act(f, id, "deliver", { sentVia });

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
    // Q2 — ni remis, ni horodaté : les deux vont ensemble.
    expect(q.sentVia).toBeNull();
    expect(q.sentAt).toBeNull();
  });

  it("⚠ `validUntil` n'est PLUS accepté : le schéma est strict (D160)", async () => {
    // 400 et non « ignoré en silence » : `.strict()` refuse la clé inconnue.
    // Sans cette assertion, un écran resté sur l'ancien contrat enverrait une
    // date que plus rien ne lit, et personne ne le saurait.
    const f = await setup();
    await makeQuote(f, { validUntil: "2027-09-01" }).expect(400);
  });

  it("le devis existe SANS client : le pro le tape pour quelqu'un qui hésite", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    expect(q.clientId).toBeNull();
  });

  it("une révision crée la v2 de la MÊME chaîne, en DRAFT, sans rien remplacer", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, v1.id).expect(201);
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
    // ⚠ LA v1 NE CHANGE PLUS D'ÉTAT, et c'est le cœur de Q2. Elle restait
    // « active » en `SENT` ; elle reste désormais `DRAFT` — remettre un devis
    // n'a jamais été une transition, c'est le code qui prétendait le contraire.
    // Sa REMISE, elle, est conservée : le client a bien reçu quelque chose.
    const list = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)).expect(200))
      .body as QuoteDTO[];
    const v1Relue = list.find((q) => q.id === v1.id);
    expect(v1Relue?.status).toBe("DRAFT");
    expect(v1Relue?.sentVia).toBe("IN_PERSON");
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// Q2 — LA REMISE. Ce que ce bloc mesure et qui n'existait pas : que remettre un
// devis n'ouvre ni ne ferme rien.
// ─────────────────────────────────────────────────────────────────────────────
describe("Remise du devis (D160)", () => {
  it("enregistre le canal et l'horodatage SANS changer le statut", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const remis = (await remettre(f, q.id, "PRINT").expect(201)).body as QuoteDTO;

    // ⚠ L'ASSERTION QUI PORTE TOUT LE LOT. `send()` écrivait `SENT` ici.
    expect(remis.status).toBe("DRAFT");
    expect(remis.sentVia).toBe("PRINT");
    expect(remis.sentAt).not.toBeNull();
  });

  it("est RÉPÉTABLE : imprimer puis envoyer par SMS sont deux remises", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const premier = (await remettre(f, q.id, "PRINT").expect(201)).body as QuoteDTO;
    const second = (await remettre(f, q.id, "SMS").expect(201)).body as QuoteDTO;

    // ⚠ Aucun 409 : ce n'est pas une transition. Le dernier canal gagne, et
    // l'entonnoir compte la chaîne UNE fois de toute façon.
    expect(second.sentVia).toBe("SMS");
    expect(Date.parse(second.sentAt as string)).toBeGreaterThanOrEqual(Date.parse(premier.sentAt as string));
  });

  it("refuse un canal HORS LISTE — le jeu de valeurs a une seule autorité", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "deliver", { sentVia: "PIGEON" }).expect(400);
    // Et une remise SANS canal ne compte dans aucun entonnoir : elle est
    // refusée plutôt qu'enregistrée à vide.
    await act(f, q.id, "deliver", {}).expect(400);
  });

  it("⚠ un devis REFUSÉ ne se remet plus au client", async () => {
    // L'écart qui prouve que le check-and-set porte sur les statuts ouverts, et
    // pas sur « n'importe quel devis ». Remettre un devis refusé le ferait
    // rentrer dans l'entonnoir après coup.
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "cancel").expect(201);
    const res = await remettre(f, q.id).expect(409);
    expect(res.body.message.code).toBe("QUOTE_STATUS_CONFLICT");
  });

  it("deux remises SIMULTANÉES ne rendent jamais 500", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const results = await Promise.all([remettre(f, q.id, "PRINT"), remettre(f, q.id, "SMS")]);
    const detail = results.map((r) => `${r.status} ${JSON.stringify(r.body)}`).join("\n");
    // ⚠ Les DEUX aboutissent, et c'est voulu : une remise n'est pas une
    // transition, donc rien n'a à être sérialisé. Ce test fige ce choix — le
    // voir rougir signifierait qu'un 409 est réapparu sur un geste répétable.
    expect(results.filter((r) => r.status >= 500), detail).toHaveLength(0);
    expect(results.filter((r) => r.status < 400), detail).toHaveLength(2);
  });
});

// ⚠ AUCUN CHEMIN DU SERVICE N'ÉCRIT PLUS `SENT`. C'est la garde qui empêche le
// piège n°1 de revenir : `supersedeActive()` a disparu parce que sa cible
// n'était plus écrite ; si un lot futur réintroduisait une écriture de `SENT`,
// il réintroduirait un statut que plus aucun écran ne sait traiter.
describe("Q2 — les statuts LEGACY ne sont plus écrits", () => {
  it("le parcours complet ne laisse aucun SENT ni SUPERSEDED en base", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, v1.id).expect(201);
    const v2 = (await act(f, v1.id, "revise", { eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 }).expect(201))
      .body as QuoteDTO;
    await remettre(f, v2.id, "SMS").expect(201);
    await act(f, v2.id, "convert", CONTACT).expect(201);

    const chain = await ctx.prisma.quote.findMany({ where: { chainId: v1.chainId } });
    expect(chain.length).toBeGreaterThan(1);
    const ecrits = [...new Set(chain.map((r) => r.status))].sort();
    // ⚠ On assertit sur l'ENSEMBLE des statuts rencontrés, pas sur « aucun
    // SENT » : une liste blanche voit aussi un statut inattendu qu'on n'aurait
    // pas pensé à interdire.
    expect(ecrits).toEqual(["DRAFT"]);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// ⚠ CE BLOC A CHANGÉ D'OBJET, IL N'A PAS ÉTÉ AFFAIBLI.
//
// Il prouvait « au plus UNE version active par chaîne », garanti par les deux
// index partiels et par l'ordre rétrograder-puis-activer. Il n'y a plus d'état
// ACTIF : `supersedeActive()` a été retirée (piège n°1), rien n'écrit plus
// `SENT` ni `SUPERSEDED`. Garder ces trois cas tels quels aurait produit trois
// tests qui échouent pour la bonne raison — ou pire, qu'on aurait « réparés »
// en réintroduisant la supersession.
//
// Ce qui RESTE vrai et doit être mesuré : les index n'ont pas disparu de la base
// (ils ne tombent qu'en Q4, D165), et les lignes déjà remplacées restent
// lisibles avec leur statut d'origine.
// ─────────────────────────────────────────────────────────────────────────────
describe("Statuts hérités — lisibles, jamais réécrits", () => {
  it("l'index partiel des SENT est TOUJOURS EN BASE, et mord encore", async () => {
    // ⚠ Il est INERTE côté service, pas supprimé. Le voir tomber signalerait
    // qu'un `prisma migrate dev` est passé — c'est-à-dire que l'anti-double-
    // booking et la FK composite B2 ont sauté avec lui.
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    // Écriture DIRECTE, en contournant le service : c'est la BASE qu'on teste.
    const legacy = {
      venueId: f.venue.id,
      chainId: v1.chainId,
      status: "SENT" as const,
      sentAt: new Date(),
      eventDate: new Date(`${EVENT_DATE}T00:00:00Z`),
      guests: 250,
      basePriceCents: 1,
      servicesTotalCents: 0,
      totalCents: 1,
      depositCents: 1,
      lines: []
    };
    await ctx.prisma.quote.create({ data: { ...legacy, version: 98, parentQuoteId: v1.id } });
    await expect(
      ctx.prisma.quote.create({ data: { ...legacy, version: 99, parentQuoteId: v1.id } })
    ).rejects.toThrow();
  });

  it("un devis LEGACY en SENT reste LISIBLE et manipulable", async () => {
    // D166 : les `SENT` convertis n'ont pas été ramenés en DRAFT. Ils existent
    // encore, et le service doit les accepter — sans quoi la migration aurait
    // retiré des lignes de l'écran du pro.
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await ctx.prisma.quote.update({ where: { id: q.id }, data: { status: "SENT", sentAt: new Date() } });

    const list = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)).expect(200))
      .body as QuoteDTO[];
    expect(list.find((row) => row.id === q.id)?.status).toBe("SENT");
    // Et il se clôt encore : la clôture vise les statuts OUVERTS, qui incluent
    // le `SENT` hérité. Sans cela elle aurait cessé de fonctionner en silence sur
    // ces lignes-là.
    const clos = (await act(f, q.id, "cancel").expect(201)).body as QuoteDTO;
    expect(clos.status).toBe("CANCELLED");
  });

  it("SUPERSEDED reste distinct de CANCELLED, et le versionnement est CONSERVÉ", async () => {
    // ⚠ Cette distinction-là NE disparaît PAS avec Q3a, contrairement à
    // refusé/annulé. « Remplacé par une version plus récente » n'est pas
    // « l'affaire est perdue » : la première est une étape de négociation, la
    // seconde une fin. Et la décision A garde le versionnement, donc c'est la
    // SEULE chose qui protège encore la traçabilité — aucune garde en base n'a
    // été posée, puisqu'il n'y a pas d'écrasement à empêcher.
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await ctx.prisma.quote.update({ where: { id: q.id }, data: { status: "SUPERSEDED" } });

    const list = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)).expect(200))
      .body as QuoteDTO[];
    expect(list.find((row) => row.id === q.id)?.status).toBe("SUPERSEDED");
    // Une chaîne close ne se rouvre pas : ni remise, ni conversion.
    await remettre(f, q.id).expect(409);
    await act(f, q.id, "convert", CONTACT).expect(409);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// CONCURRENCE (D117, D121) — CE QUI A CHANGÉ D'OBJET, ET CE QUI RESTE.
//
// ⚠ LE CAS « DEUX ENVOIS SIMULTANÉS » A DISPARU, ET CE N'EST PAS UN
// AFFAIBLISSEMENT. Il figeait ceci : « `sentAt` est la date que le client voit
// sur son devis ; sans relecture sous verrou, le second envoi l'écrasait par
// une valeur que personne n'a reçue. » Cette phrase supposait un envoi UNIQUE et
// irréversible. Une REMISE ne l'est pas : imprimer puis envoyer par SMS sont
// deux gestes réels, et réécrire `sentAt` est désormais le comportement
// ATTENDU. La garde n'a pas été retirée par négligence — son objet n'existe
// plus. Le cas qui la remplace est « deux remises simultanées ne rendent jamais
// 500 », et il assertit DEUX succès là où l'autre en exigeait un seul.
//
// Ce qui RESTE, et qui n'a pas bougé : le statut qui autorise une écriture se
// lit DANS la transaction, par check-and-set. `decline` et `convert` le
// prouvent ci-dessous.
// ─────────────────────────────────────────────────────────────────────────────
describe("Concurrence (D121)", () => {
  it("D121 — deux REFUS simultanés du même devis : un seul aboutit, jamais 500", async () => {
    // Même famille que `decline`/`cancel` côté demandes : `assertStatus` lu hors
    // transaction, puis un `update` inconditionnel.
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, q.id).expect(201);

    const results = await Promise.all([act(f, q.id, "cancel"), act(f, q.id, "cancel")]);

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

    const results = await Promise.all([act(f, q.id, "convert", CONTACT), act(f, q.id, "convert", CONTACT)]);

    const detail = results.map((r) => `${r.status} ${JSON.stringify(r.body)}`).join("\n");
    expect(results.filter((r) => r.status >= 500), detail).toHaveLength(0);
    expect(results.filter((r) => r.status < 400), detail).toHaveLength(1);

    const bookings = await ctx.prisma.booking.findMany({ where: { quoteId: q.id } });
    expect(bookings, detail).toHaveLength(1);
  });

  it("deux RÉVISIONS simultanées de la même chaîne : aucun doublon de version", async () => {
    // ⚠ POURQUOI `lockChain()` SURVIT À LA DISPARITION DE `supersedeActive()`.
    // `revise()` lit le `MAX(version)` puis écrit `version + 1` :
    // `quotes_chain_version_unique` refuserait la seconde de deux révisions
    // simultanées, en 500. Le verrou les sérialise. Le retirer en même temps
    // que la supersession aurait été le geste facile — et faux.
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const corps = { eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 };

    const results = await Promise.all([act(f, v1.id, "revise", corps), act(f, v1.id, "revise", corps)]);
    const detail = results.map((r) => `${r.status} ${JSON.stringify(r.body)}`).join("\n");
    expect(results.filter((r) => r.status >= 500), detail).toHaveLength(0);

    const chain = await ctx.prisma.quote.findMany({ where: { chainId: v1.chainId } });
    const versions = chain.map((r) => r.version).sort((a, b) => a - b);
    // Trois lignes, trois versions DISTINCTES : c'est le verrou qui le garantit.
    expect(new Set(versions).size, detail).toBe(versions.length);
  });
});

describe("Conversion — la chaîne complète, dans l'ordre", () => {
  /** ⚠ CE CAS EST L'EXACT INVERSE DE CE QU'IL MESURAIT, ET C'EST TOUT LE LOT.
   *  Il exigeait un 409 : « un DRAFT ne se convertit pas, personne d'autre que
   *  le pro ne l'a vu ». Cette justification décrivait un parcours à distance
   *  qui n'existe pas ici — au comptoir, le client a le montant sous les yeux
   *  pendant que le pro le tape. La règle rendait donc le clic « Envoyer »
   *  obligatoire, donc systématique, donc muet : c'est elle qui a faussé
   *  l'entonnoir, pas son absence. */
  it("⚠ un BROUILLON SE CONVERTIT, sans remise préalable (D160)", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const after = (await act(f, q.id, "convert", CONTACT).expect(201)).body as QuoteDTO;
    expect(after.bookingId).not.toBeNull();
    // ⚠ Et il n'a reçu AUCUN canal au passage : convertir n'est pas remettre.
    // Sans cette assertion, une conversion qui poserait `sentVia` en douce
    // ferait entrer dans l'entonnoir des devis que personne n'a reçus — et
    // l'indicateur mentirait dans le sens flatteur.
    expect(after.sentVia).toBeNull();
  });

  it("⚠ D135 — un client SANS e-mail se convertit : la borne Zod était plus stricte que la base", async () => {
    // ⚠ Le cas réel que la validation refusait, et il n'a rien d'un cas limite :
    // c'est le client au comptoir en Algérie, qui donne un numéro et pas une
    // adresse. `bookings.contact_email` est `String?` depuis toujours ; seule la
    // borne applicative interdisait de l'omettre, et elle rendait le parcours
    // « client sur place » inachevable. D55, cinquième occurrence.
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;

    const { contactEmail: _omis, ...sansEmail } = CONTACT;
    const after = (await act(f, q.id, "convert", sansEmail).expect(201)).body as QuoteDTO;

    const booking = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: after.bookingId as string } });
    expect(booking.contactEmail).toBeNull();
    // Le TÉLÉPHONE, lui, est bien là : c'est le canal de rappel du pro.
    expect(booking.contactPhone).toBe("+213550000001");
  });

  it("⚠ D135 — mais le téléphone reste EXIGÉ : l'assouplir ne l'a pas emporté", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;

    const { contactPhone: _sansTel, ...sansPhone } = CONTACT;
    // 400 et non 201 : c'est l'écart qui prouve que la borne n'a bougé que d'un
    // champ. Sans cette assertion, un `.optional()` posé par erreur sur le
    // téléphone passerait inaperçu.
    await act(f, q.id, "convert", sansPhone).expect(400);
  });

  it("convertir crée une demande PENDING, et le devis NE BOUGE PAS", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, q.id).expect(201);
    const after = (await act(f, q.id, "convert", CONTACT).expect(201)).body as QuoteDTO;

    // ⚠ Le devis n'est PAS accepté : il attend l'acompte. La bascule appartient
    // à E3, dans la MÊME transaction que le passage en CONFIRMED.
    expect(after.status).toBe("DRAFT");
    // Et sa remise est intacte : convertir n'efface pas ce qui a eu lieu.
    expect(after.sentVia).toBe("IN_PERSON");
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
    await remettre(f, a.id).expect(201);
    await act(f, a.id, "convert", CONTACT).expect(201);

    const b = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, b.id).expect(201);
    // Aucun 409 : le verrou n'existe qu'à l'acceptation du pro.
    await act(f, b.id, "convert", CONTACT).expect(201);
  });

  it("un devis ne se convertit qu'UNE fois : réviser, pas reconvertir", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, q.id).expect(201);
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
    await remettre(f, q.id).expect(201);
    const after = (await act(f, q.id, "convert", CONTACT).expect(201)).body as QuoteDTO;

    const lines = await ctx.prisma.bookingService.findMany({ where: { bookingId: after.bookingId as string } });
    expect(lines).toHaveLength(1);
    expect(lines[0]?.quantity).toBe(250);
  });

  it("une CLÔTURE n'est pas une supersession", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, q.id).expect(201);
    const clos = (await act(f, q.id, "cancel").expect(201)).body as QuoteDTO;
    expect(clos.status).toBe("CANCELLED");
  });

  /** ⚠ LE CAS QUI REND L'ABSORPTION SÛRE, ET LE SEUL QUI LA MESURE.
   *
   *  Aucune reprise de données : le jour du déploiement, toutes les affaires
   *  perdues de l'historique sont en `DECLINED`. Un entonnoir qui ne compterait
   *  que `CANCELLED` afficherait « 0 perdus » sur une salle qui en a trente —
   *  sans erreur, sans test rouge, et faux dans le sens flatteur.
   *
   *  Sans ce cas, un `conversion()` resté sur `=== CANCELLED` passerait tous les
   *  autres tests du fichier, puisqu'ils partent tous de devis récents. */
  it("⚠ l'entonnoir compte les DEUX statuts perdus, CANCELLED et l'hérité DECLINED", async () => {
    const f = await setup();

    const neuf = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, neuf.id).expect(201);
    await act(f, neuf.id, "cancel").expect(201);

    const ancien = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, ancien.id).expect(201);
    // Écriture DIRECTE : c'est l'état d'une ligne ANCIENNE. Aucun chemin de
    // l'API ne peut plus produire ce statut.
    await ctx.prisma.quote.update({ where: { id: ancien.id }, data: { status: "DECLINED" } });

    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    expect(res.cancelled, "l'entonnoir ignore les DECLINED hérités").toBe(2);
  });

  it("une chaîne CLOSE ne se révise plus", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, q.id).expect(201);
    await act(f, q.id, "cancel").expect(201);
    await api()
      .post(`/api/v1/quotes/${q.id}/revise`)
      .set(authH(f.token))
      .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 })
      .expect(409);
  });
});

// ⚠ L'EXPIRATION A DISPARU (D160), PUIS SA COLONNE (Q4).
// Ce bloc prouvait qu'`EXPIRED` était DÉRIVÉ et jamais stocké — juste, et bonne
// leçon (D80). Puis il a mesuré que `valid_until` était devenue INERTE : deux
// cas écrivaient une date passée EN BASE et vérifiaient qu'elle n'empêchait plus
// rien.
//
// ⚠ CES DEUX CAS NE PEUVENT PLUS EXISTER, et c'est le signe que Q4 a fait son
// travail : on ne peut pas écrire dans une colonne supprimée. Les remplacer par
// des tests « équivalents » qui n'écrivent plus rien aurait produit deux tests
// verts qui ne mesurent rien. Ce qui reste vérifiable, c'est l'ABSENCE — en
// base, et sur le fil.
describe("Expiration — la colonne a été SUPPRIMÉE (Q4)", () => {
  it("⚠ `valid_until` n'existe plus dans la table", async () => {
    // La sonde porte sur le catalogue, pas sur Prisma : le client généré ne
    // saurait pas décrire une colonne qu'il ignore, donc il ne peut pas
    // témoigner de son absence.
    const colonne = await ctx.prisma.$queryRaw<{ column_name: string }[]>`
      SELECT column_name FROM information_schema.columns
       WHERE table_name = 'quotes' AND column_name = 'valid_until'
    `;
    expect(colonne, "la colonne survit : la migration Q4 n'est pas appliquée").toHaveLength(0);
  });

  it("⚠ les DEUX index partiels, eux, sont TOUJOURS là", async () => {
    // Q4 ne les emporte pas, et l'assertion le fige.
    // `quotes_one_sent_per_chain` est inerte mais contraint encore les lignes
    // héritées de D166 — et sert de témoin : le voir disparaître signale un
    // `prisma migrate dev` égaré, lequel emporterait aussi l'anti-double-booking.
    // `quotes_one_accepted_per_chain` va REDEVENIR actif avec E3.
    const idx = await ctx.prisma.$queryRaw<{ indexname: string }[]>`
      SELECT indexname FROM pg_indexes
       WHERE indexname IN ('quotes_one_sent_per_chain', 'quotes_one_accepted_per_chain')
    `;
    expect(idx.map((r) => r.indexname).sort()).toEqual([
      "quotes_one_accepted_per_chain",
      "quotes_one_sent_per_chain"
    ]);
  });

  it("le DTO ne porte ni `isExpired` ni `validUntil`", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;

    const list = (await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes`).set(authH(f.token)).expect(200))
      .body as QuoteDTO[];
    const found = list.find((row) => row.id === q.id) as unknown as Record<string, unknown>;
    // ⚠ Sur le FIL, pas sur le type : TypeScript ne voit pas ce qu'un `select`
    // Prisma élargi expédierait réellement au navigateur.
    expect(found).not.toHaveProperty("isExpired");
    expect(found).not.toHaveProperty("validUntil");
  });

  it("une conversion aboutit, sans qu'aucune date de validité n'intervienne", async () => {
    // L'écart avec l'avant : ce cas rendait 409 `QUOTE_EXPIRED`.
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    const after = (await act(f, q.id, "convert", CONTACT).expect(201)).body as QuoteDTO;
    expect(after.bookingId).not.toBeNull();
  });
});

describe("Taux de transformation — la raison d'être de la table", () => {
  it("compte des CHAÎNES, pas des versions : trois révisions sont UNE affaire", async () => {
    const f = await setup();
    const v1 = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, v1.id).expect(201);
    const v2 = (
      await api()
        .post(`/api/v1/quotes/${v1.id}/revise`)
        .set(authH(f.token))
        .send({ eventDate: EVENT_DATE, slotTemplateId: f.slotId, guests: 300 })
        .expect(201)
    ).body as QuoteDTO;
    await remettre(f, v2.id).expect(201);
    await act(f, v2.id, "convert", CONTACT).expect(201);

    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    // UNE affaire, malgré deux versions remises.
    expect(res.delivered).toBe(1);
    // ⚠ Pas encore ACCEPTED : le devis attend l'acompte. Ce compteur ne bougera
    // qu'avec E3 — et c'est exactement ce qu'il doit dire.
    expect(res.accepted).toBe(0);
  });

  it("un devis qui n'aboutit PAS existe quand même — c'était impossible avant", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await remettre(f, q.id).expect(201);
    await act(f, q.id, "cancel").expect(201);

    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    expect(res.delivered).toBe(1);
    expect(res.cancelled).toBe(1);
    expect(res.accepted).toBe(0);
  });

  it("un devis jamais REMIS ne compte pas", async () => {
    const f = await setup();
    await makeQuote(f).expect(201);
    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    expect(res.delivered).toBe(0);
  });

  /** ⚠ LE CAS QUI PROUVE QUE LE DÉNOMINATEUR A VRAIMENT CHANGÉ (D162).
   *
   *  Un devis CONVERTI mais jamais remis porte un `bookingId`, et — avant Q2 —
   *  aurait porté un `sentAt` non nul, donc serait entré dans l'entonnoir. Il
   *  n'y entre plus : personne ne lui a remis quoi que ce soit.
   *
   *  Sans ce cas, un `conversion()` resté sur `sentAt: { not: null }` passerait
   *  TOUS les autres tests de ce bloc — puisque `deliver()` écrit les deux
   *  colonnes. C'est le seul endroit où les deux critères divergent. */
  it("⚠ un devis converti SANS remise n'entre PAS dans l'entonnoir", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await act(f, q.id, "convert", CONTACT).expect(201);

    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    expect(res.delivered, "l'entonnoir compte encore sur sentAt").toBe(0);
  });

  /** ⚠ Et le versant « données anciennes » : une ligne avec `sent_at` posé mais
   *  `sent_via` nul — exactement ce que la migration a laissé — ne compte pas.
   *  L'entonnoir REPART DE ZÉRO, et c'est la conséquence assumée de D168. */
  it("⚠ une ligne HÉRITÉE (sentAt posé, sentVia nul) sort du dénominateur", async () => {
    const f = await setup();
    const q = (await makeQuote(f).expect(201)).body as QuoteDTO;
    await ctx.prisma.quote.update({ where: { id: q.id }, data: { sentAt: new Date() } });

    const res = (
      await api().get(`/api/v1/pro/venues/${f.venue.id}/quotes/conversion`).set(authH(f.token)).expect(200)
    ).body as QuoteConversionDTO;
    expect(res.delivered).toBe(0);
  });
});
