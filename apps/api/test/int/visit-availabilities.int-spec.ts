// Intégration Flux C, Lot C1 — plages hebdomadaires de visite (D47).
//
// Ce qui ne se prouve QU'ICI :
//   - une visite ne franchit PAS minuit : le CHECK plafonne à 1440, contrairement
//     aux créneaux de fête (2880, D52). Deux systèmes, deux bornes ;
//   - le chevauchement est refusé le MÊME jour seulement — dimanche et lundi ne
//     se rencontrent jamais ;
//   - deux plages bout à bout (fin 17:00 puis début 17:00) sont ACCEPTÉES ;
//   - la modification vérifie l'état RÉSULTANT, pas le patch seul ;
//   - retirer une plage n'annule aucun rendez-vous déjà pris.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenueProDTO, VisitAvailabilityDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const PRO2 = { role: "PRO", email: "pro2@example.dz", password: "Motdepasse1", businessName: "Rivale", phone: "+213550000010" };
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Ami", lastName: "Ne" };

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Dimanche = 0 (D56). Premier jour ouvré en Algérie, donc le plus courant
 *  pour faire visiter. */
const DIMANCHE = 0;
const LUNDI = 1;

async function proWithVenue(who = PRO, nameFr = "Salle El Ferdous") {
  await registerUser(ctx, who);
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, who.email, who.password);
  const wilaya =
    (await ctx.prisma.wilaya.findFirst({ where: { code: 16 } })) ??
    (await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } }));
  const city =
    (await ctx.prisma.city.findFirst({ where: { wilayaId: wilaya.id } })) ??
    (await ctx.prisma.city.create({
      data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
    }));
  const res = await api().post("/api/v1/venues").set(authH(token)).send({
    cityId: city.id,
    nameFr,
    nameAr: "قاعة",
    capacityMax: 450,
    basePriceCents: 18_000_000,
    bookingMode: "MULTI_SLOT"
  });
  if (res.status !== 201) throw new Error(`seed venue: ${res.status} ${JSON.stringify(res.body)}`);
  return { token, venue: res.body as VenueProDTO };
}

const create = (token: string, venueId: string, body: object) =>
  api().post(`/api/v1/venues/${venueId}/visit-availabilities`).set(authH(token)).send(body);

const MATIN = { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 }; // 09:00–12:00

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("Plages de visite — création", () => {
  it("une plage du dimanche matin est créée et relue triée", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, { dayOfWeek: LUNDI, startMinutes: 600, endMinutes: 780 }).expect(201);
    await create(token, venue.id, MATIN).expect(201);

    const res = await api().get(`/api/v1/pro/venues/${venue.id}/visit-availabilities`).set(authH(token)).expect(200);
    const rows = res.body as VisitAvailabilityDTO[];
    // Dimanche (0) avant lundi (1) : tri par jour, puis par heure.
    expect(rows.map((r) => r.dayOfWeek)).toEqual([DIMANCHE, LUNDI]);
    expect(rows[0]?.isActive).toBe(true);
  });

  it("une visite ne franchit PAS minuit — 1440 est la borne, contrairement aux fêtes", async () => {
    const { token, venue } = await proWithVenue();
    // 23:00 → 01:00 du lendemain serait légal pour une soirée (D52), pas ici.
    await create(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 1380, endMinutes: 1500 }).expect(400);
    // La borne exacte, elle, passe.
    await create(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 1080, endMinutes: 1440 }).expect(201);
  });

  it("fin ≤ début : 400", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 720, endMinutes: 540 }).expect(400);
    await create(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 720, endMinutes: 720 }).expect(400);
  });

  it("un jour hors 0–6 : 400", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, { dayOfWeek: 7, startMinutes: 540, endMinutes: 720 }).expect(400);
    await create(token, venue.id, { dayOfWeek: -1, startMinutes: 540, endMinutes: 720 }).expect(400);
  });

  it("un champ inconnu est refusé — schéma strict", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, { ...MATIN, priceCents: 1000 }).expect(400);
  });
});

describe("Plages de visite — chevauchement", () => {
  it("deux plages qui se recouvrent le MÊME jour : 409", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, MATIN).expect(201);
    const res = await create(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 660, endMinutes: 900 }).expect(409);
    expect(res.body.message).toEqual({
      code: "VISIT_AVAILABILITY_OVERLAP",
      message: "venue.errors.visitOverlap"
    });
  });

  it("les mêmes horaires un AUTRE jour : 201 — deux jours ne se rencontrent jamais", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, MATIN).expect(201);
    await create(token, venue.id, { ...MATIN, dayOfWeek: LUNDI }).expect(201);
  });

  it("deux plages BOUT À BOUT sont acceptées : 12:00 puis 12:00", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, MATIN).expect(201);
    await create(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 720, endMinutes: 1020 }).expect(201);
  });
});

describe("Plages de visite — modification", () => {
  it("le chevauchement est vérifié sur l'état RÉSULTANT, pas sur le patch seul", async () => {
    const { token, venue } = await proWithVenue();
    await create(token, venue.id, MATIN).expect(201);
    const soir = (await create(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 1020, endMinutes: 1200 }).expect(201))
      .body as VisitAvailabilityDTO;

    // Le patch ne parle QUE du début : rien n'y annonce un conflit, et
    // pourtant l'état résultant recouvre la plage du matin.
    await api()
      .patch(`/api/v1/venues/${venue.id}/visit-availabilities/${soir.id}`)
      .set(authH(token))
      .send({ startMinutes: 600 })
      .expect(409);
  });

  it("isActive:false SUSPEND la plage sans la perdre", async () => {
    const { token, venue } = await proWithVenue();
    const row = (await create(token, venue.id, MATIN).expect(201)).body as VisitAvailabilityDTO;
    const res = await api()
      .patch(`/api/v1/venues/${venue.id}/visit-availabilities/${row.id}`)
      .set(authH(token))
      .send({ isActive: false })
      .expect(200);
    expect((res.body as VisitAvailabilityDTO).isActive).toBe(false);
    expect(await ctx.prisma.visitAvailability.count({ where: { venueId: venue.id } })).toBe(1);
  });

  it("un patch vide : 400", async () => {
    const { token, venue } = await proWithVenue();
    const row = (await create(token, venue.id, MATIN).expect(201)).body as VisitAvailabilityDTO;
    await api()
      .patch(`/api/v1/venues/${venue.id}/visit-availabilities/${row.id}`)
      .set(authH(token))
      .send({})
      .expect(400);
  });
});

describe("Plages de visite — suppression et cloisonnement", () => {
  it("DELETE : 204, et un rendez-vous déjà pris SURVIT", async () => {
    const { token, venue } = await proWithVenue();
    const row = (await create(token, venue.id, MATIN).expect(201)).body as VisitAvailabilityDTO;

    await registerUser(ctx, CLIENT);
    await verifyLastRegistered(ctx);
    const client = await ctx.prisma.user.findFirstOrThrow({ where: { email: CLIENT.email } });
    // `VisitBooking` ne référence PAS sa plage : elle porte un instant.
    await ctx.prisma.visitBooking.create({
      data: { venueId: venue.id, clientId: client.id, scheduledAt: new Date("2027-08-15T09:00:00Z") }
    });

    await api()
      .delete(`/api/v1/venues/${venue.id}/visit-availabilities/${row.id}`)
      .set(authH(token))
      .expect(204);
    expect(await ctx.prisma.visitBooking.count({ where: { venueId: venue.id } })).toBe(1);
  });

  it("la salle d'un autre pro : 404 VENUE_NOT_FOUND indistinct", async () => {
    const { venue } = await proWithVenue();
    const { token: other } = await proWithVenue(PRO2, "Salle Rivale");
    const res = await create(other, venue.id, MATIN).expect(404);
    expect(res.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });
  });

  it("un id de plage malformé ou d'une autre salle : 404 VISIT_AVAILABILITY_NOT_FOUND", async () => {
    const { token, venue } = await proWithVenue();
    const res = await api()
      .delete(`/api/v1/venues/${venue.id}/visit-availabilities/pas-un-uuid`)
      .set(authH(token))
      .expect(404);
    expect(res.body.message).toEqual({
      code: "VISIT_AVAILABILITY_NOT_FOUND",
      message: "venue.errors.visitNotFound"
    });
  });

  it("CLIENT authentifié : 403 ; anonyme : 401", async () => {
    const { venue } = await proWithVenue();
    await registerUser(ctx, CLIENT);
    await verifyLastRegistered(ctx);
    const client = await loginAs(ctx, CLIENT.email, CLIENT.password);
    await create(client, venue.id, MATIN).expect(403);
    await api().post(`/api/v1/venues/${venue.id}/visit-availabilities`).send(MATIN).expect(401);
  });
});
