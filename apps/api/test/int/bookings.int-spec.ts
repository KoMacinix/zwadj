// Intégration Flux E, Lot E1a — demandes de réservation (D74 → D83).
//
// Ce qui ne se prouve QU'ICI, contre une vraie base :
//   - que deux demandes PENDING sur la MÊME date coexistent : sous
//     request-to-book, c'est la salle qui arbitre, pas le premier arrivé ;
//   - que l'exclusivité vient de la BASE : la seconde ACCEPTATION reçoit 409 via
//     le `23P01` de `bookings_no_overlap_accepted_confirmed`, jamais d'un SELECT
//     préalable qui laisserait une fenêtre ;
//   - qu'un BLOCAGE recouvrant fait échouer l'acceptation — une EXCLUDE ne
//     traverse pas deux tables, ce contrôle-là est applicatif et sous verrou ;
//   - qu'un créneau 20h→02h produit une plage qui finit LE LENDEMAIN (D55/D77) ;
//   - qu'une salle SINGLE_SLOT bloque la JOURNÉE entière, sans règle en plus ;
//   - qu'un acompte fixe SUPÉRIEUR au total est ÉCRÊTÉ et non refusé (D81/D55) ;
//   - que des montants périmés rendent 409 BOOKING_PRICE_CHANGED (D75) ;
//   - que les salles existantes reprennent à 30 % (migration).
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { BookingDTO, ProBookingDTO, VenueProDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";
// ⛔ RANG 10 — les DEUX fenêtres viennent du service qui les applique, jamais
//   d'une copie : c'est la seule façon qu'une valeur changée en production ne
//   laisse pas cette garde verte sur l'ancienne. Neuf specs d'intégration
//   importent déjà depuis `../../src/`, valeurs comprises.
import { DAY_MS, HOUR_MS, PAYMENT_WINDOW_HOURS, PRO_RESPONSE_DAYS } from "../../src/venues/bookings.service";
import { civilTodayAt, formatCivilDate } from "../../src/venues/availability-time";

let ctx: TestContext;

const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Amina", lastName: "Bensalem" };
const CLIENT2 = { role: "CLIENT", email: "client2@example.dz", password: "Motdepasse1", firstName: "Yacine", lastName: "Haddad" };

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Date LOINTAINE mais dans l'horizon de 18 mois : ni passée, ni écrêtée. */
const EVENT_DATE = "2027-08-15";

/** Créneau du soir, VOLONTAIREMENT à cheval sur minuit : 20:00 → 02:00. C'est le
 *  cas que le schéma autorise (end_minutes ≤ 2880) et qu'un calcul naïf casse. */
const SOIREE_START = 1200;
const SOIREE_END = 1560;
const SLOT_PRICE = 20_000_000; // 200 000 DA

// ─────────────────────────────────────────────────────────────────────────────
// ⛔ FIXTURE DÉDIÉE AUX ÉCHÉANCES — elle ne réutilise PAS `EVENT_DATE`, et c'est
//   le point.
//
// L'échéance rendue est `min(from + fenêtre, début de l'événement)`. Si la date
// de fête tombe DANS l'une des deux fenêtres, l'échéance vaut le début de
// l'événement et la constante DISPARAÎT du résultat : l'assertion passerait,
// l'interversion resterait invisible, et on aurait écrit exactement la garde
// que ce lot existe pour supprimer.
//
// ⚠ `EVENT_DATE` satisfait cette condition AUJOURD'HUI, mais par accident du
//   calendrier : elle cesse de la satisfaire le 08/08/2027, sept jours avant la
//   fête, et la garde deviendrait muette SANS QU'UNE LIGNE AIT BOUGÉ. Elle ne se
//   corrige pas en place non plus — deux tests en dérivent des instants ISO
//   exacts qui mesurent le créneau franchissant minuit (D55/D77).
// ⇒ La date se DÉRIVE donc des constantes, et la marge vaut le DOUBLE de la plus
//   large des deux fenêtres : si quelqu'un allonge une fenêtre, la fixture suit
//   au lieu de devenir silencieusement fausse.
const FENETRE_MAX_MS = Math.max(PRO_RESPONSE_DAYS * DAY_MS, PAYMENT_WINDOW_HOURS * HOUR_MS);

/** Date civile d'Alger (UTC+1, D48) très au-delà des DEUX fenêtres, dérivée de
 *  l'horloge et des constantes — jamais un littéral de calendrier (D213/D227). */
const dateHorsEcretage = (nowMs: number) => formatCivilDate(civilTodayAt(nowMs + 2 * FENETRE_MAX_MS));

interface Fixture {
  proToken: string;
  clientToken: string;
  client2Token: string;
  venue: VenueProDTO;
  slotId: string;
  cityId: string;
}

async function makeVenue(
  proToken: string,
  cityId: string,
  nameFr: string,
  bookingMode: "SINGLE_SLOT" | "MULTI_SLOT"
): Promise<{ dto: VenueProDTO; slotId: string }> {
  const created = await api()
    .post("/api/v1/venues")
    .set(authH(proToken))
    .send({ cityId, nameFr, nameAr: "قاعة", capacityMax: 400, basePriceCents: 18_000_000, bookingMode })
    .expect(201);
  const dto = created.body as VenueProDTO;
  const slot = await api()
    .post(`/api/v1/venues/${dto.id}/slot-templates`)
    .set(authH(proToken))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: SOIREE_START, endMinutes: SOIREE_END, basePriceCents: SLOT_PRICE })
    .expect(201);
  return { dto, slotId: (slot.body as { id: string }).id };
}

async function setup(bookingMode: "SINGLE_SLOT" | "MULTI_SLOT" = "MULTI_SLOT"): Promise<Fixture> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const proToken = await loginAs(ctx, PRO.email, PRO.password);

  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });

  const { dto, slotId } = await makeVenue(proToken, city.id, "Salle El Ryad", bookingMode);

  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  const adminToken = await loginAs(ctx, ADMIN.email, ADMIN.password);
  await api().post(`/api/v1/admin/venues/${dto.id}/publish`).set(authH(adminToken)).expect(200);

  await registerUser(ctx, CLIENT);
  await verifyLastRegistered(ctx);
  const clientToken = await loginAs(ctx, CLIENT.email, CLIENT.password);

  await registerUser(ctx, CLIENT2);
  await verifyLastRegistered(ctx);
  const client2Token = await loginAs(ctx, CLIENT2.email, CLIENT2.password);

  return { proToken, clientToken, client2Token, venue: dto, slotId, cityId: city.id };
}

const body = (f: Fixture, over: Record<string, unknown> = {}) => ({
  eventDate: EVENT_DATE,
  slotTemplateId: f.slotId,
  guests: 250,
  paymentMethod: "ONLINE",
  contactFirstName: "Amina",
  contactLastName: "Bensalem",
  contactPhone: "+213550000001",
  contactEmail: "amina@example.dz",
  expectedTotalCents: SLOT_PRICE,
  expectedDepositCents: SLOT_PRICE * 0.3,
  ...over
});

const post = (token: string, slug: string, payload: Record<string, unknown>) =>
  api().post(`/api/v1/venues/${slug}/bookings`).set(authH(token)).send(payload);

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await truncateAll(ctx.prisma);
  ctx.emails.length = 0;
  ctx.whatsapps.length = 0;
  ctx.senders.failEmail = false;
  ctx.senders.failWhatsApp = false;
});

describe("Reprise des salles existantes (migration D81)", () => {
  it("une salle créée sans rien dire reçoit 30 % — les 30 % implicites d'avant", async () => {
    const f = await setup();
    expect(f.venue.depositRateBps).toBe(3000);
    expect(f.venue.depositAmountCents).toBeNull();
  });

  it("l'acompte est exposé sur la fiche PUBLIQUE, avant la demande", async () => {
    const f = await setup();
    const res = await api().get(`/api/v1/venues/${f.venue.slug}`).expect(200);
    expect((res.body as { depositRateBps: number | null }).depositRateBps).toBe(3000);
  });
});

describe("POST /venues/:slug/bookings — création", () => {
  it("crée une demande PENDING et NE VERROUILLE RIEN", async () => {
    const f = await setup();
    const res = await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    const dto = res.body as BookingDTO;

    expect(dto.status).toBe("PENDING");
    expect(dto.totalCents).toBe(SLOT_PRICE);
    expect(dto.depositCents).toBe(SLOT_PRICE * 0.3);
    // La demande porte déjà sa date d'expiration (D82), que rien ne consomme
    // encore — D80 assume la dette.
    expect(dto.expiresAt).not.toBeNull();
    expect(dto.paymentDueAt).toBeNull();
  });

  // ⛔ CHEMIN DE L'ARGENT (rang 10). Le test ci-dessus n'assertit que « non
  //   nulle » : servir 48 h au lieu de 7 jours produirait une date tout aussi
  //   non nulle, et rien ne rougirait.
  // ⚠ AUCUNE TOLÉRANCE N'EST CHOISIE ICI. `Date.now()` est lu DANS `create`,
  //   donc entre les deux instants que ce test relève lui-même : la largeur de
  //   l'encadrement EST la durée de la requête — quelques dizaines de ms —
  //   contre les cinq jours qui séparent 48 h de 7 jours.
  // ⛔ Et c'est la MÊME horloge au sens fort : l'app d'intégration tourne DANS le
  //   processus du test. `createdAt`, lui, vient de `now()` PostgreSQL — c'est la
  //   seule valeur que cette assertion ne doit PAS utiliser.
  it("expiresAt vaut la fenêtre de réponse PRO, encadrée par deux instants mesurés ici", async () => {
    const f = await setup();
    const eventDate = dateHorsEcretage(Date.now());

    // La fixture se prouve AVANT l'assertion : sans cette garde, une date que la
    // salle refuserait ferait tomber le test en 400 — rouge pour la mauvaise
    // raison, et il s'attribuerait la preuve d'un défaut qu'il n'a pas mesuré.
    expect(Date.parse(`${eventDate}T00:00:00Z`) - Date.now()).toBeGreaterThan(FENETRE_MAX_MS);

    const t0 = Date.now();
    const res = await post(f.clientToken, f.venue.slug, body(f, { eventDate })).expect(201);
    const t1 = Date.now();

    const dto = res.body as BookingDTO;
    expect(dto.expiresAt).not.toBeNull();
    const expiresAt = Date.parse(dto.expiresAt as string);
    expect(expiresAt).toBeGreaterThanOrEqual(t0 + PRO_RESPONSE_DAYS * DAY_MS);
    expect(expiresAt).toBeLessThanOrEqual(t1 + PRO_RESPONSE_DAYS * DAY_MS);
  });

  it("le créneau 20h→02h produit une plage qui finit LE LENDEMAIN (D55/D77)", async () => {
    const f = await setup();
    const res = await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    const dto = res.body as BookingDTO;

    // Alger = UTC+1 fixe : 20:00 local le 15 = 19:00Z le 15 ; 02:00 local le 16
    // = 01:00Z le 16.
    expect(dto.startsAt).toBe("2027-08-15T19:00:00.000Z");
    expect(dto.endsAt).toBe("2027-08-16T01:00:00.000Z");
  });

  it("DEUX demandes concurrentes sur la même date coexistent en PENDING", async () => {
    const f = await setup();
    await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    // Aucun 409 : sous request-to-book, c'est la salle qui arbitre.
    await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201);

    const rows = await ctx.prisma.booking.findMany({ where: { venueId: f.venue.id } });
    expect(rows).toHaveLength(2);
    expect(rows.every((r) => r.status === "PENDING")).toBe(true);
  });

  it("le pro est notifié — sans notification, la demande expirerait toute seule", async () => {
    const f = await setup();
    await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    expect(ctx.emails.some((m) => m.to === PRO.email)).toBe(true);
    const rows = await ctx.prisma.notification.findMany({ where: { type: "booking.requested" } });
    expect(rows.length).toBeGreaterThan(0);
  });

  it("⚠ la ligne Notification est RÉSOLUE, pas laissée en QUEUED (S2-bis)", async () => {
    // Trou de couverture MESURÉ : la garde ci-dessus ne compte que des lignes.
    // Supprimer la résolution `SENT` du cœur commun la laissait VERTE, alors
    // que la suite des visites, elle, rougissait — elle asserte le triplet.
    // Une ligne éternellement QUEUED est une notification qu'un rejeu futur
    // renverrait à l'infini.
    const f = await setup();
    await post(f.clientToken, f.venue.slug, body(f)).expect(201);

    const rows = await ctx.prisma.notification.findMany({ orderBy: { createdAt: "asc" } });
    // Un seul canal : `notifyByEmail` vaut `true` par défaut, `notifyBySms`
    // vaut `false` (schema.prisma) — relevé, pas supposé.
    expect(rows.map((row) => [row.type, row.channel, row.status])).toEqual([["booking.requested", "EMAIL", "SENT"]]);
    expect(rows[0]?.sentAt).not.toBeNull();
  });

  it("un envoi qui TOMBE laisse la demande enregistrée (D63)", async () => {
    const f = await setup();
    ctx.senders.failEmail = true;
    await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    const rows = await ctx.prisma.notification.findMany({ where: { type: "booking.requested" } });
    expect(rows.some((r) => r.status === "FAILED")).toBe(true);
  });

  it("des montants PÉRIMÉS rendent 409 avec les montants RÉELS (D75)", async () => {
    const f = await setup();
    const res = await post(f.clientToken, f.venue.slug, body(f, { expectedTotalCents: 1_000_000 })).expect(409);
    expect(res.body.message.code).toBe("BOOKING_PRICE_CHANGED");
    expect(res.body.message.totalCents).toBe(SLOT_PRICE);
    expect(res.body.message.depositCents).toBe(SLOT_PRICE * 0.3);
  });

  it("un ACOMPTE périmé suffit à refuser, même si le total est bon", async () => {
    const f = await setup();
    const res = await post(f.clientToken, f.venue.slug, body(f, { expectedDepositCents: 1 })).expect(409);
    expect(res.body.message.code).toBe("BOOKING_PRICE_CHANGED");
  });

  it("plus d'invités que la capacité : refusé AVANT l'écriture", async () => {
    const f = await setup();
    const res = await post(f.clientToken, f.venue.slug, body(f, { guests: 5000 })).expect(400);
    expect(res.body.message.code).toBe("BOOKING_GUESTS_EXCEED_CAPACITY");
  });

  it("une date au-delà de l'horizon de 18 mois se REFUSE, elle ne se déplace pas (D49)", async () => {
    const f = await setup();
    const far = new Date(Date.now() + 600 * 86_400_000).toISOString().slice(0, 10);
    const res = await post(f.clientToken, f.venue.slug, body(f, { eventDate: far })).expect(409);
    expect(res.body.message.code).toBe("BOOKING_SLOT_UNAVAILABLE");
  });

  it("un créneau d'une AUTRE salle : « n'existe pas », pas « est pris »", async () => {
    const f = await setup();
    const other = await makeVenue(f.proToken, f.cityId, "Salle El Firdaws", "MULTI_SLOT");
    const res = await post(f.clientToken, f.venue.slug, body(f, { slotTemplateId: other.slotId })).expect(409);
    expect(res.body.message.code).toBe("BOOKING_SLOT_UNAVAILABLE");
  });
});

describe("Acompte — le cas limite REEL (D81/D55)", () => {
  it("un acompte fixe SUPÉRIEUR au total est écrêté, la demande passe", async () => {
    const f = await setup();
    // 500 000 DA d'acompte fixe sur un créneau à 200 000 DA.
    await api()
      .patch(`/api/v1/venues/${f.venue.id}`)
      .set(authH(f.proToken))
      .send({ depositRateBps: null, depositAmountCents: 50_000_000 })
      .expect(200);

    const res = await post(f.clientToken, f.venue.slug, body(f, { expectedDepositCents: SLOT_PRICE })).expect(201);
    // Écrêté au total : on ne réclame jamais plus que le total, et le CHECK
    // `bookings_amounts_valid` aurait refusé l'insertion sinon.
    expect((res.body as BookingDTO).depositCents).toBe(SLOT_PRICE);
  });

  it("le PATCH refuse un pourcentage ET un montant à la fois", async () => {
    const f = await setup();
    await api()
      .patch(`/api/v1/venues/${f.venue.id}`)
      .set(authH(f.proToken))
      .send({ depositRateBps: 4000, depositAmountCents: 1_000_000 })
      .expect(400);
  });

  it("le PATCH refuse la paire incomplète", async () => {
    const f = await setup();
    await api().patch(`/api/v1/venues/${f.venue.id}`).set(authH(f.proToken)).send({ depositRateBps: 4000 }).expect(400);
  });

  it("un taux de 4 % est sous le plancher", async () => {
    const f = await setup();
    await api()
      .patch(`/api/v1/venues/${f.venue.id}`)
      .set(authH(f.proToken))
      .send({ depositRateBps: 400, depositAmountCents: null })
      .expect(400);
  });
});

describe("Acceptation — l'exclusivité appartient à la BASE (D78)", () => {
  it("la SECONDE acceptation reçoit 409 via le 23P01, et la première survit", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const b = (await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201))
      .body as BookingDTO;

    await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);
    const res = await api().post(`/api/v1/pro/bookings/${b.id}/accept`).set(authH(f.proToken)).expect(409);
    expect(res.body.message.code).toBe("BOOKING_SLOT_TAKEN");

    const kept = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: a.id } });
    expect(kept.status).toBe("ACCEPTED");
  });

  it("annuler la première LIBÈRE le créneau : la seconde passe alors", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const b = (await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201))
      .body as BookingDTO;

    await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);
    await api()
      .post(`/api/v1/pro/bookings/${a.id}/cancel`)
      .set(authH(f.proToken))
      .send({ reason: "Dégât des eaux" })
      .expect(201);
    // Le WHERE partiel de l'EXCLUDE ne regarde plus une ligne CANCELLED.
    await api().post(`/api/v1/pro/bookings/${b.id}/accept`).set(authH(f.proToken)).expect(201);
  });

  it("⚠ le pro NE PEUT PAS annuler une demande encore PENDING — il la REFUSE (S3)", async () => {
    // Trou de couverture mesuré par la cible S3-4 : aucun test n'exerçait ce
    // refus, ni en unitaire ni en base. Ouvrir `cancelAsPro` à PENDING passait
    // donc inaperçu — alors que les deux chemins écrivent des statuts et des
    // motifs différents, et que l'entonnoir les compte séparément.
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;

    const res = await api()
      .post(`/api/v1/pro/bookings/${a.id}/cancel`)
      .set(authH(f.proToken))
      .send({ reason: "Dégât des eaux" })
      .expect(409);
    expect(res.body.message.code).toBe("BOOKING_STATUS_CONFLICT");

    // Et la demande n'a pas bougé : un refus qui laisse une trace serait pire
    // qu'un refus franc.
    const apres = await ctx.prisma.booking.findUniqueOrThrow({
      where: { id: a.id },
      select: { status: true, cancelledAt: true }
    });
    expect(apres.status).toBe("PENDING");
    expect(apres.cancelledAt).toBeNull();
  });

  it("un BLOCAGE recouvrant refuse l'acceptation — contrôle applicatif sous verrou", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;

    await api()
      .post(`/api/v1/venues/${f.venue.id}/availability-blocks`)
      .set(authH(f.proToken))
      .send({ startsAt: `${EVENT_DATE}T18:00`, endsAt: `${EVENT_DATE}T23:00`, reason: "Travaux" })
      .expect(201);

    const res = await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(409);
    expect(res.body.message.code).toBe("BOOKING_BLOCKED_PERIOD");
  });

  it("accepter deux fois : BOOKING_STATUS_CONFLICT, avec le statut réel", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);
    const res = await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(409);
    expect(res.body.message.code).toBe("BOOKING_STATUS_CONFLICT");
    expect(res.body.message.status).toBe("ACCEPTED");
  });

  it("l'acceptation pose paymentDueAt et prévient le client", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    ctx.emails.length = 0;
    const res = await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);
    expect((res.body as BookingDTO).paymentDueAt).not.toBeNull();
    expect(ctx.emails.some((m) => m.to === CLIENT.email)).toBe(true);
  });

  // ⛔ CHEMIN DE L'ARGENT (rang 10) — et c'est le côté qui coûte le plus cher :
  //   `paymentDueAt` est ce sur quoi E3 décidera si un règlement arrive à temps.
  // ⚠ ÉGALITÉ EXACTE, aucune marge, et la forme diffère volontairement de celle
  //   du test d'`expiresAt` : `accepted_at` est PERSISTÉE, donc les deux instants
  //   se relisent dans la MÊME ligne et se soustraient sans approximation.
  //   « Harmoniser » les deux formes réintroduirait soit une comparaison entre
  //   deux horloges, soit une tolérance — un nombre que quelqu'un relèverait un
  //   jour « parce que ça passe juste ».
  it("paymentDueAt − acceptedAt vaut EXACTEMENT la fenêtre d'acompte", async () => {
    const f = await setup();
    const eventDate = dateHorsEcretage(Date.now());
    expect(Date.parse(`${eventDate}T00:00:00Z`) - Date.now()).toBeGreaterThan(FENETRE_MAX_MS);

    const a = (await post(f.clientToken, f.venue.slug, body(f, { eventDate })).expect(201)).body as BookingDTO;
    await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);

    const row = await ctx.prisma.booking.findUniqueOrThrow({
      where: { id: a.id },
      select: { acceptedAt: true, paymentDueAt: true }
    });
    expect(row.acceptedAt).not.toBeNull();
    expect(row.paymentDueAt).not.toBeNull();
    expect((row.paymentDueAt as Date).getTime() - (row.acceptedAt as Date).getTime())
      .toBe(PAYMENT_WINDOW_HOURS * HOUR_MS);
  });
});

// ─────────────────────────────────────────────────────────────────────────────
// D117 — CONCURRENCE RÉELLE. Deux requêtes EN VOL EN MÊME TEMPS.
//
// Aucun test du dépôt ne faisait ça avant : les deux specs qui portaient le mot
// « concurrent » enchaînaient deux appels l'un APRÈS l'autre. Le double clic du
// pro, lui, part deux fois avant que la première réponse revienne — et c'est
// exactement le trou : le double accept SÉQUENTIEL rendait déjà 409, ce qui
// donnait l'illusion d'une couverture.
// ─────────────────────────────────────────────────────────────────────────────
describe("Acceptation CONCURRENTE (D117)", () => {
  it("deux acceptations SIMULTANÉES de la MÊME demande : une seule aboutit, l'autre 409 — jamais 500", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    ctx.emails.length = 0;

    const accept = () => api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken));
    const [first, second] = await Promise.all([accept(), accept()]);

    const codes = [first.status, second.status].sort((x, y) => x - y);
    expect(codes).toEqual([201, 409]);

    // « Conflit PROPRE » : le code métier, pas une fuite d'erreur Prisma.
    const loser = first.status === 409 ? first : second;
    expect(loser.body.message.code).toBe("BOOKING_STATUS_CONFLICT");
    expect(loser.body.message.status).toBe("ACCEPTED");

    // La demande n'a été acceptée qu'UNE fois : sans la relecture sous verrou,
    // la seconde écrasait `acceptedAt` et `paymentDueAt`.
    const row = await ctx.prisma.booking.findUniqueOrThrow({ where: { id: a.id } });
    expect(row.status).toBe("ACCEPTED");

    // Et le client n'a été prévenu qu'UNE fois. C'est le symptôme visible du
    // défaut : deux emails « votre date est confirmée » pour une seule date.
    expect(ctx.emails.filter((m) => m.to === CLIENT.email)).toHaveLength(1);
    const notifications = await ctx.prisma.notification.findMany({ where: { type: "booking.accepted" } });
    expect(notifications).toHaveLength(1);
  });

  it("deux demandes DIFFÉRENTES acceptées simultanément sur le même créneau : 201 + 409 BOOKING_SLOT_TAKEN", async () => {
    // Garde-fou du correctif lui-même : déplacer le contrôle de statut ne doit
    // pas avoir déplacé l'autorité de l'EXCLUSIVITÉ, qui reste la BASE (D78).
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const b = (await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201))
      .body as BookingDTO;

    const [first, second] = await Promise.all([
      api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)),
      api().post(`/api/v1/pro/bookings/${b.id}/accept`).set(authH(f.proToken))
    ]);

    const codes = [first.status, second.status].sort((x, y) => x - y);
    expect(codes).toEqual([201, 409]);
    const loser = first.status === 409 ? first : second;
    expect(loser.body.message.code).toBe("BOOKING_SLOT_TAKEN");

    const accepted = await ctx.prisma.booking.findMany({ where: { venueId: f.venue.id, status: "ACCEPTED" } });
    expect(accepted).toHaveLength(1);
  });

  // ── D121 — LES TRANSITIONS SŒURS ────────────────────────────────────────
  //
  // D117 avait délibérément laissé `decline` et les annulations hors périmètre.
  // Elles portent le MÊME motif : `assertStatus` lu hors de toute transaction,
  // puis un `update` inconditionnel. Enjeu plus faible — aucun verrou de créneau
  // en jeu — mais la conséquence visible est la même : la date est réécrite et
  // le client reçoit DEUX fois le même message.

  it("D121 — deux refus SIMULTANÉS : un seul aboutit, un seul e-mail au client", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    ctx.emails.length = 0;

    const decline = () =>
      api().post(`/api/v1/pro/bookings/${a.id}/decline`).set(authH(f.proToken)).send({ reason: "Salle indisponible" });
    const [first, second] = await Promise.all([decline(), decline()]);

    expect([first.status, second.status].sort((x, y) => x - y)).toEqual([201, 409]);
    const loser = first.status === 409 ? first : second;
    expect(loser.body.message.code).toBe("BOOKING_STATUS_CONFLICT");
    expect(ctx.emails.filter((m) => m.to === CLIENT.email)).toHaveLength(1);
  });

  it("D121 — deux annulations PRO SIMULTANÉES d'une demande acceptée : une seule aboutit", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);
    ctx.emails.length = 0;

    const cancel = () =>
      api().post(`/api/v1/pro/bookings/${a.id}/cancel`).set(authH(f.proToken)).send({ reason: "Dégât des eaux" });
    const [first, second] = await Promise.all([cancel(), cancel()]);

    expect([first.status, second.status].sort((x, y) => x - y)).toEqual([201, 409]);
    expect(ctx.emails.filter((m) => m.to === CLIENT.email)).toHaveLength(1);
  });

  it("D121 — deux annulations CLIENT SIMULTANÉES : une seule aboutit, jamais 500", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;

    // ⚠ La route exige un CORPS (`bookingCancelSchema`) même quand le motif est
    // facultatif — sur une demande PENDING, D83 le rend libre, pas absent.
    // Sans `.send({})`, les deux appels rendaient 400 avant toute concurrence :
    // le test aurait été « rouge » sans rien mesurer.
    const cancel = () => api().delete(`/api/v1/bookings/${a.id}`).set(authH(f.clientToken)).send({});
    const results = await Promise.all([cancel(), cancel()]);

    const detail = results.map((r) => `${r.status} ${JSON.stringify(r.body)}`).join("\n");
    expect(results.filter((r) => r.status >= 500), detail).toHaveLength(0);
    expect(results.filter((r) => r.status < 400), detail).toHaveLength(1);
  });

  it("trois acceptations SIMULTANÉES de la même demande : une seule passe, deux 409", async () => {
    // Le mutex du navigateur ne protège pas d'un pro qui a trois onglets. La
    // sérialisation doit venir du verrou serveur, à N quelconque.
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;

    const accept = () => api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken));
    const results = await Promise.all([accept(), accept(), accept()]);

    expect(results.filter((r) => r.status === 201)).toHaveLength(1);
    expect(results.filter((r) => r.status === 409)).toHaveLength(2);
    expect(results.filter((r) => r.status >= 500)).toHaveLength(0);
  });
});

describe("SINGLE_SLOT — la journée entière (D77)", () => {
  it("la plage couvre les 24 heures locales, sans règle applicative en plus", async () => {
    const f = await setup("SINGLE_SLOT");
    const res = await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    const dto = res.body as BookingDTO;
    expect(dto.startsAt).toBe("2027-08-14T23:00:00.000Z");
    expect(dto.endsAt).toBe("2027-08-15T23:00:00.000Z");
  });

  it("le créneau reste la source du PRIX, même si ses heures sont ignorées", async () => {
    const f = await setup("SINGLE_SLOT");
    const res = await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    expect((res.body as BookingDTO).totalCents).toBe(SLOT_PRICE);
    expect((res.body as BookingDTO).slotNameFr).toBe("Soirée");
  });
});

describe("Refus et annulations (D83)", () => {
  it("le pro refuse SANS motif — c'est permis", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const res = await api().post(`/api/v1/pro/bookings/${a.id}/decline`).set(authH(f.proToken)).send({}).expect(201);
    expect((res.body as BookingDTO).status).toBe("DECLINED");
  });

  it("le client annule une demande PENDING sans motif", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const res = await api().delete(`/api/v1/bookings/${a.id}`).set(authH(f.clientToken)).send({}).expect(200);
    expect((res.body as BookingDTO).status).toBe("CANCELLED");
  });

  it("le client DOIT un motif pour annuler une demande ACCEPTÉE", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);

    const refused = await api().delete(`/api/v1/bookings/${a.id}`).set(authH(f.clientToken)).send({}).expect(400);
    expect(refused.body.message.message).toBe("booking.errors.cancelReasonRequired");

    await api()
      .delete(`/api/v1/bookings/${a.id}`)
      .set(authH(f.clientToken))
      .send({ reason: "Changement de date de mariage" })
      .expect(200);
  });

  it("404 INDISTINCT sur la demande d'un autre client (D47)", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    await api().delete(`/api/v1/bookings/${a.id}`).set(authH(f.client2Token)).send({}).expect(404);
  });
});

describe("Lectures", () => {
  it("GET /me/bookings ne rend QUE mes demandes, refusées comprises", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201);
    await api().post(`/api/v1/pro/bookings/${a.id}/decline`).set(authH(f.proToken)).send({}).expect(201);

    const res = await api().get("/api/v1/me/bookings").set(authH(f.clientToken)).expect(200);
    const rows = res.body as BookingDTO[];
    expect(rows).toHaveLength(1);
    // Refusée et MARQUÉE : sa disparition silencieuse serait le contraire d'une
    // information.
    expect(rows[0]?.status).toBe("DECLINED");
  });

  it("le pro voit les CONFLITS, calculés à la lecture", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const b = (await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201))
      .body as BookingDTO;

    const res = await api().get(`/api/v1/pro/venues/${f.venue.id}/bookings`).set(authH(f.proToken)).expect(200);
    const rows = res.body as ProBookingDTO[];
    expect(rows.find((r) => r.id === a.id)?.conflictIds).toContain(b.id);
    expect(rows.find((r) => r.id === b.id)?.conflictIds).toContain(a.id);
  });

  it("⚠ une réservation ACCEPTÉE dispute ENCORE — `locks()` n'était exercé QUE par des PENDING (S2-bis)", async () => {
    // Trou de couverture MESURÉ : les deux gardes de conflit ne créaient que
    // des PENDING, et la projection court-circuite `locks()` sur un PENDING.
    // Le site que `HARD_BOOKING_STATUSES` alimente n'était donc atteint par
    // AUCUN test d'intégration.
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const b = (await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201))
      .body as BookingDTO;
    await api().post(`/api/v1/pro/bookings/${a.id}/accept`).set(authH(f.proToken)).expect(201);

    const res = await api().get(`/api/v1/pro/venues/${f.venue.id}/bookings`).set(authH(f.proToken)).expect(200);
    const rows = res.body as ProBookingDTO[];
    expect(rows.find((r) => r.id === a.id)?.status).toBe("ACCEPTED");
    // Une date prise reste DISPUTÉE tant que la demande rivale vit : c'est ce
    // qui dit au pro pourquoi il ne peut pas accepter la seconde.
    expect(rows.find((r) => r.id === a.id)?.conflictIds).toContain(b.id);
    expect(rows.find((r) => r.id === b.id)?.conflictIds).toContain(a.id);
  });

  it("⚠ une réservation CONFIRMED dispute ENCORE — le paiement ne la sort pas de la vue (S2-bis)", async () => {
    // Trou de couverture MESURÉ : AUCUNE réservation `CONFIRMED` n'existait
    // dans toute la suite d'intégration. L'autorité partagée pouvait perdre
    // CONFIRMED sans qu'un seul test rougisse — alors que c'est le statut
    // d'une réservation PAYÉE, celle qu'on peut le moins se permettre de
    // laisser disparaître d'un écran.
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const b = (await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201))
      .body as BookingDTO;
    // E3c n'existe pas encore : rien dans l'application ne pose `CONFIRMED`.
    // Le statut se sème donc ici, comme `availability.int-spec.ts` sème les
    // siens. L'EXCLUDE ne s'y oppose pas : une seule ligne verrouillante.
    await ctx.prisma.booking.update({ where: { id: a.id }, data: { status: "CONFIRMED" } });

    const res = await api().get(`/api/v1/pro/venues/${f.venue.id}/bookings`).set(authH(f.proToken)).expect(200);
    const rows = res.body as ProBookingDTO[];
    expect(rows.find((r) => r.id === a.id)?.status).toBe("CONFIRMED");
    expect(rows.find((r) => r.id === a.id)?.conflictIds).toContain(b.id);
    expect(rows.find((r) => r.id === b.id)?.conflictIds).toContain(a.id);
  });

  it("une demande REFUSÉE ne dispute plus rien : elle sort des conflits", async () => {
    const f = await setup();
    const a = (await post(f.clientToken, f.venue.slug, body(f)).expect(201)).body as BookingDTO;
    const b = (await post(f.client2Token, f.venue.slug, body(f, { contactEmail: "yacine@example.dz" })).expect(201))
      .body as BookingDTO;
    await api().post(`/api/v1/pro/bookings/${b.id}/decline`).set(authH(f.proToken)).send({}).expect(201);

    const res = await api().get(`/api/v1/pro/venues/${f.venue.id}/bookings`).set(authH(f.proToken)).expect(200);
    const rows = res.body as ProBookingDTO[];
    expect(rows.find((r) => r.id === a.id)?.conflictIds).toEqual([]);
  });

  it("le pro voit le CONTACT — il doit pouvoir rappeler", async () => {
    const f = await setup();
    await post(f.clientToken, f.venue.slug, body(f)).expect(201);
    const res = await api().get(`/api/v1/pro/venues/${f.venue.id}/bookings`).set(authH(f.proToken)).expect(200);
    expect((res.body as ProBookingDTO[])[0]?.contactPhone).toBe("+213550000001");
  });
});
