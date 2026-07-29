// Intégration Lot B3 — blocages pro (D51), base PostgreSQL réelle.
//
// Ce qui ne se prouve QU'ICI :
//   - la SYMÉTRIE du repère civil : ce que le pro écrit est ce qu'il relit ;
//   - le décalage UTC+1 appliqué UNE seule fois, visible en base et nulle part
//     dans le DTO ;
//   - le conflit bloc ↔ réservation ACCEPTED/CONFIRMED, qu'aucune contrainte
//     BDD ne peut porter (une EXCLUDE ne traverse pas deux tables) ;
//   - qu'une demande PENDING ne s'y oppose PAS — poser un bloc par-dessus est
//     la façon dont le pro dit non ;
//   - l'effet réel du blocage sur la lecture publique de disponibilité.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AvailabilityBlockDTO, VenueAvailabilityResponse, VenueProDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO = {
  role: "PRO",
  email: "pro@example.dz",
  password: "Motdepasse1",
  businessName: "Salles Pro",
  phone: "+213550000009"
};
const PRO2 = {
  role: "PRO",
  email: "pro2@example.dz",
  password: "Motdepasse1",
  businessName: "Autres Salles",
  phone: "+213550000010"
};
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Ami", lastName: "Ne" };
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

const SOIREE = { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 20_000_000 };

/** Dates fixes et LOINTAINES : l'écrêtage D49 mangerait toute fenêtre passée. */
const D1 = "2027-08-14"; // vendredi
const D2 = "2027-08-15"; // samedi

/** Instant UTC correspondant à une heure LOCALE d'Alger (UTC+1). */
const at = (date: string, hour: number, minute = 0) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + (hour * 60 + minute - 60) * 60_000);

async function proWithVenue(who = PRO, nameFr = "Salle El Ferdous") {
  await registerUser(ctx, who);
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, who.email, who.password);
  const wilaya = await ctx.prisma.wilaya.findFirst({ where: { code: 16 } })
    ?? (await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } }));
  const city = await ctx.prisma.city.findFirst({ where: { wilayaId: wilaya.id } })
    ?? (await ctx.prisma.city.create({
      data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
    }));
  const res = await api()
    .post("/api/v1/venues")
    .set(authH(token))
    .send({
      cityId: city.id,
      nameFr,
      nameAr: "قاعة الفردوس",
      capacityMax: 450,
      basePriceCents: 18_000_000,
      bookingMode: "MULTI_SLOT"
    });
  if (res.status !== 201) throw new Error(`seed venue: ${res.status} ${JSON.stringify(res.body)}`);
  return { token, venue: res.body as VenueProDTO };
}

async function publishedVenue() {
  const { token, venue } = await proWithVenue();
  const slot = await api()
    .post(`/api/v1/venues/${venue.id}/slot-templates`)
    .set(authH(token))
    .send(SOIREE)
    .expect(201);
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  const admin = await loginAs(ctx, ADMIN.email, ADMIN.password);
  await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(admin)).expect(200);
  return { token, venue, slotId: slot.body.id as string };
}

const seedBooking = (venueId: string, startsAt: Date, endsAt: Date, status: string) =>
  ctx.prisma.booking.create({
    data: {
      venueId,
      slotTemplateId: null,
      status: status as never,
      eventDate: new Date(`${startsAt.toISOString().slice(0, 10)}T00:00:00Z`),
      startsAt,
      endsAt,
      guests: 200,
      basePriceCents: 20_000_000,
      servicesTotalCents: 0,
      totalCents: 20_000_000,
      depositCents: 6_000_000,
      contactFirstName: "Amine",
      contactLastName: "Bekkouche",
      contactPhone: "+213550000001"
    }
  });

const createBlock = (token: string, venueId: string, body: object) =>
  api().post(`/api/v1/venues/${venueId}/availability-blocks`).set(authH(token)).send(body);

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("Blocages pro — écriture et repère de temps", () => {
  it("création : 201, et le DTO relu porte le MÊME repère civil local que l'écriture", async () => {
    const { token, venue } = await proWithVenue();
    const res = await createBlock(token, venue.id, {
      startsAt: `${D1}T08:00`,
      endsAt: `${D1}T18:00`,
      reason: "Travaux"
    }).expect(201);
    const dto = res.body as AvailabilityBlockDTO;
    expect(dto.startsAt).toBe(`${D1}T08:00`);
    expect(dto.endsAt).toBe(`${D1}T18:00`);
    expect(dto.reason).toBe("Travaux");
  });

  it("le blocage écrit en base est décalé de 60 minutes — UTC+1 appliqué une seule fois", async () => {
    const { token, venue } = await proWithVenue();
    await createBlock(token, venue.id, { startsAt: `${D1}T08:00`, endsAt: `${D1}T18:00` }).expect(201);
    const row = await ctx.prisma.availabilityBlock.findFirstOrThrow({ where: { venueId: venue.id } });
    expect(row.blockedFrom.toISOString()).toBe(`${D1}T07:00:00.000Z`);
    expect(row.blockedUntil.toISOString()).toBe(`${D1}T17:00:00.000Z`);
  });

  it("un blocage recouvrant une réservation ACCEPTED : 409 AVAILABILITY_BLOCK_CONFLICT", async () => {
    const { token, venue } = await proWithVenue();
    await seedBooking(venue.id, at(D1, 20), at(D1, 23), "ACCEPTED");
    const res = await createBlock(token, venue.id, { startsAt: `${D1}T18:00`, endsAt: `${D1}T22:00` }).expect(409);
    expect(res.body.message).toEqual({ code: "AVAILABILITY_BLOCK_CONFLICT", message: "venue.errors.blockConflict" });
  });

  it("un blocage recouvrant une réservation PENDING : 201 — une demande ne verrouille rien", async () => {
    const { token, venue } = await proWithVenue();
    await seedBooking(venue.id, at(D1, 20), at(D1, 23), "PENDING");
    await createBlock(token, venue.id, { startsAt: `${D1}T18:00`, endsAt: `${D1}T22:00` }).expect(201);
  });

  it("un blocage qui TOUCHE une réservation sans la recouvrir : 201 — bornes semi-ouvertes", async () => {
    const { token, venue } = await proWithVenue();
    await seedBooking(venue.id, at(D1, 20), at(D1, 23), "ACCEPTED");
    await createBlock(token, venue.id, { startsAt: `${D1}T14:00`, endsAt: `${D1}T20:00` }).expect(201);
  });

  it("deux blocages qui se chevauchent : 201 tous les deux", async () => {
    const { token, venue } = await proWithVenue();
    await createBlock(token, venue.id, { startsAt: `${D1}T08:00`, endsAt: `${D1}T18:00` }).expect(201);
    await createBlock(token, venue.id, { startsAt: `${D1}T12:00`, endsAt: `${D2}T02:00` }).expect(201);
    expect(await ctx.prisma.availabilityBlock.count({ where: { venueId: venue.id } })).toBe(2);
  });

  it("endsAt ≤ startsAt : 400", async () => {
    const { token, venue } = await proWithVenue();
    await createBlock(token, venue.id, { startsAt: `${D1}T18:00`, endsAt: `${D1}T08:00` }).expect(400);
    await createBlock(token, venue.id, { startsAt: `${D1}T18:00`, endsAt: `${D1}T18:00` }).expect(400);
  });

  it("une date-heure irréelle est refusée : 2027-02-31 passe la regex, pas le calendrier", async () => {
    const { token, venue } = await proWithVenue();
    await createBlock(token, venue.id, { startsAt: "2027-02-31T08:00", endsAt: "2027-02-31T18:00" }).expect(400);
  });

  it("reason absente part en null, jamais en chaîne vide", async () => {
    const { token, venue } = await proWithVenue();
    const res = await createBlock(token, venue.id, { startsAt: `${D1}T08:00`, endsAt: `${D1}T18:00` }).expect(201);
    expect((res.body as AvailabilityBlockDTO).reason).toBeNull();
  });
});

describe("Blocages pro — ownership et suppression", () => {
  it("la salle d'un autre pro : 404 VENUE_NOT_FOUND indistinct", async () => {
    const { venue } = await proWithVenue();
    const { token: other } = await proWithVenue(PRO2, "Salle Rivale");
    const res = await createBlock(other, venue.id, { startsAt: `${D1}T08:00`, endsAt: `${D1}T18:00` }).expect(404);
    expect(res.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });
  });

  it("un blockId malformé, ou d'une autre salle : 404 AVAILABILITY_BLOCK_NOT_FOUND", async () => {
    const { token, venue } = await proWithVenue();
    const malformed = await api()
      .delete(`/api/v1/venues/${venue.id}/availability-blocks/pas-un-uuid`)
      .set(authH(token))
      .expect(404);
    expect(malformed.body.message).toEqual({ code: "AVAILABILITY_BLOCK_NOT_FOUND", message: "venue.errors.blockNotFound" });
  });

  it("DELETE : 204 sans corps, et le créneau redevient AVAILABLE à la relecture publique", async () => {
    const { token, venue, slotId } = await publishedVenue();
    const created = await createBlock(token, venue.id, {
      startsAt: `${D1}T18:00`,
      endsAt: `${D2}T04:00`
    }).expect(201);

    const blocked = await api()
      .get(`/api/v1/venues/${venue.slug}/availability`)
      .query({ from: D1, to: D1 })
      .expect(200);
    const before = (blocked.body as VenueAvailabilityResponse).days[0]?.slots.find(
      (s) => s.slotTemplateId === slotId
    );
    expect(before?.status).toBe("BLOCKED");

    const del = await api()
      .delete(`/api/v1/venues/${venue.id}/availability-blocks/${(created.body as AvailabilityBlockDTO).id}`)
      .set(authH(token))
      .expect(204);
    expect(del.body).toEqual({});

    const freed = await api()
      .get(`/api/v1/venues/${venue.slug}/availability`)
      .query({ from: D1, to: D1 })
      .expect(200);
    const after = (freed.body as VenueAvailabilityResponse).days[0]?.slots.find((s) => s.slotTemplateId === slotId);
    expect(after?.status).toBe("AVAILABLE");
  });

  it("DELETE d'un blocage passé : 204 — un blocage n'est pas un historique de vente", async () => {
    const { token, venue } = await proWithVenue();
    const past = await ctx.prisma.availabilityBlock.create({
      data: {
        venueId: venue.id,
        blockedFrom: new Date("2020-01-01T00:00:00Z"),
        blockedUntil: new Date("2020-01-02T00:00:00Z")
      }
    });
    await api().delete(`/api/v1/venues/${venue.id}/availability-blocks/${past.id}`).set(authH(token)).expect(204);
  });
});

describe("Blocages pro — lecture", () => {
  it("GET /pro : ne rend que les blocages recouvrant la fenêtre, triés blockedFrom asc", async () => {
    const { token, venue } = await proWithVenue();
    await createBlock(token, venue.id, { startsAt: `${D2}T08:00`, endsAt: `${D2}T18:00` }).expect(201);
    await createBlock(token, venue.id, { startsAt: `${D1}T08:00`, endsAt: `${D1}T18:00` }).expect(201);
    await createBlock(token, venue.id, { startsAt: "2027-12-01T08:00", endsAt: "2027-12-01T18:00" }).expect(201);

    const res = await api()
      .get(`/api/v1/pro/venues/${venue.id}/availability-blocks`)
      .query({ from: D1, to: D2 })
      .set(authH(token))
      .expect(200);
    const rows = res.body as AvailabilityBlockDTO[];
    expect(rows.map((r) => r.startsAt)).toEqual([`${D1}T08:00`, `${D2}T08:00`]);
  });

  it("GET /pro : un blocage qui ENJAMBE la fenêtre sans y commencer est rendu", async () => {
    const { token, venue } = await proWithVenue();
    await createBlock(token, venue.id, { startsAt: "2027-07-01T00:00", endsAt: "2027-10-01T00:00" }).expect(201);
    const res = await api()
      .get(`/api/v1/pro/venues/${venue.id}/availability-blocks`)
      .query({ from: D1, to: D2 })
      .set(authH(token))
      .expect(200);
    expect((res.body as AvailabilityBlockDTO[]).length).toBe(1);
  });

  it("GET /pro : la fenêtre suit le MÊME schéma que le public — 93 jours rendus : 400", async () => {
    const { token, venue } = await proWithVenue();
    await api()
      .get(`/api/v1/pro/venues/${venue.id}/availability-blocks`)
      .query({ from: "2027-08-01", to: "2027-11-01" })
      .set(authH(token))
      .expect(400);
  });
});

describe("Blocages pro — RBAC", () => {
  it("CLIENT authentifié : 403 ; anonyme : 401", async () => {
    const { venue } = await proWithVenue();
    await registerUser(ctx, CLIENT);
    await verifyLastRegistered(ctx);
    const client = await loginAs(ctx, CLIENT.email, CLIENT.password);
    await createBlock(client, venue.id, { startsAt: `${D1}T08:00`, endsAt: `${D1}T18:00` }).expect(403);
    await api()
      .post(`/api/v1/venues/${venue.id}/availability-blocks`)
      .send({ startsAt: `${D1}T08:00`, endsAt: `${D1}T18:00` })
      .expect(401);
  });
});
