// Intégration Flux C, Lot C2 — créneaux de visite publics (D47, D58).
//
// Ce qui ne se prouve QU'ICI :
//   - les plages HEBDOMADAIRES se projettent sur les bonnes dates (D56 : le
//     jour vient de la date civile, pas d'un `Date` local) ;
//   - une plage suspendue (`isActive: false`) disparaît ;
//   - un rendez-vous CONFIRMÉ marque le créneau sans le retirer (D47), un
//     ANNULÉ ne marque rien ;
//   - même règle de visibilité que le détail public (D33) ;
//   - les créneaux durent 30 minutes, et un reliquat de plage n'en crée pas.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenueProDTO, VenueVisitSlotsResponse } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Ami", lastName: "Ne" };

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

/** Dates LOINTAINES : l'écrêtage D49 mangerait toute fenêtre passée. */
const DIMANCHE_DATE = "2027-08-15";
const LUNDI_DATE = "2027-08-16";
const DIMANCHE = 0;
const LUNDI = 1;

/** Instant UTC d'une heure LOCALE d'Alger (UTC+1). */
const at = (date: string, minutes: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + (minutes - 60) * 60_000);

async function publishedVenue() {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, PRO.email, PRO.password);
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const created = await api().post("/api/v1/venues").set(authH(token)).send({
    cityId: city.id, nameFr: "Salle El Ryad", nameAr: "قاعة", capacityMax: 400,
    basePriceCents: 18_000_000, bookingMode: "MULTI_SLOT"
  }).expect(201);
  const venue = created.body as VenueProDTO;
  await api().post(`/api/v1/venues/${venue.id}/slot-templates`).set(authH(token)).send({
    nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 20_000_000
  }).expect(201);
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  const admin = await loginAs(ctx, ADMIN.email, ADMIN.password);
  await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(admin)).expect(200);
  return { token, venue };
}

const addWindow = (token: string, venueId: string, body: object) =>
  api().post(`/api/v1/venues/${venueId}/visit-availabilities`).set(authH(token)).send(body).expect(201);

const getSlots = (slug: string, from: string, to: string) =>
  api().get(`/api/v1/venues/${slug}/visit-slots`).query({ from, to });

async function seedClient() {
  await registerUser(ctx, CLIENT);
  await verifyLastRegistered(ctx);
  return ctx.prisma.user.findFirstOrThrow({ where: { email: CLIENT.email } });
}

beforeAll(async () => { ctx = await createTestApp(); });
afterAll(async () => { await ctx.app.close(); });
beforeEach(async () => { await truncateAll(ctx.prisma); });

describe("Créneaux de visite — projection hebdomadaire", () => {
  it("une plage du dimanche ne sort QUE les dimanches", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });

    const body = (await getSlots(venue.slug, DIMANCHE_DATE, LUNDI_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    expect(new Set(body.slots.map((s) => s.date))).toEqual(new Set([DIMANCHE_DATE]));
    expect(body.durationMinutes).toBe(30);
    // 09:00 → 12:00 = 6 créneaux de 30 min.
    expect(body.slots.map((s) => s.startMinutes)).toEqual([540, 570, 600, 630, 660, 690]);
  });

  it("un reliquat de plage ne crée PAS de créneau tronqué", async () => {
    const { token, venue } = await publishedVenue();
    // 09:00 → 10:20 : deux créneaux entiers, le reliquat de 20 min est ignoré.
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 620 });
    const body = (await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    expect(body.slots.map((s) => s.startMinutes)).toEqual([540, 570]);
  });

  it("une plage SUSPENDUE disparaît, sans être supprimée", async () => {
    const { token, venue } = await publishedVenue();
    const res = await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    await api()
      .patch(`/api/v1/venues/${venue.id}/visit-availabilities/${res.body.id}`)
      .set(authH(token))
      .send({ isActive: false })
      .expect(200);

    const body = (await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    expect(body.slots).toEqual([]);
    expect(await ctx.prisma.visitAvailability.count({ where: { venueId: venue.id } })).toBe(1);
  });

  it("sans aucune plage : 200 et zéro créneau, jamais 404", async () => {
    const { venue } = await publishedVenue();
    const body = (await getSlots(venue.slug, DIMANCHE_DATE, LUNDI_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    expect(body.slots).toEqual([]);
  });
});

describe("Créneaux de visite — rendez-vous pris (D47)", () => {
  it("un rendez-vous CONFIRMÉ marque le créneau sans le retirer", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    const client = await seedClient();
    await ctx.prisma.visitBooking.create({
      data: { venueId: venue.id, clientId: client.id, scheduledAt: at(DIMANCHE_DATE, 600) }
    });

    const body = (await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    // Toujours six créneaux : le chevauchement est TOLÉRÉ, on informe seulement.
    expect(body.slots).toHaveLength(6);
    expect(body.slots.find((s) => s.startMinutes === 600)?.taken).toBe(true);
    expect(body.slots.find((s) => s.startMinutes === 570)?.taken).toBe(false);
  });

  it("un rendez-vous ANNULÉ libère son créneau", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    const client = await seedClient();
    await ctx.prisma.visitBooking.create({
      data: {
        venueId: venue.id,
        clientId: client.id,
        scheduledAt: at(DIMANCHE_DATE, 600),
        status: "CANCELLED",
        cancelledAt: new Date()
      }
    });

    const body = (await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    expect(body.slots.every((s) => !s.taken)).toBe(true);
  });
});

describe("Créneaux de visite — bornes et visibilité", () => {
  it("fenêtre entièrement passée : 200 et zéro créneau", async () => {
    const { venue } = await publishedVenue();
    const body = (await getSlots(venue.slug, "2020-01-01", "2020-03-01").expect(200))
      .body as VenueVisitSlotsResponse;
    expect(body.slots).toEqual([]);
  });

  it("fenêtre de 93 jours : 400 · date irréelle : 400", async () => {
    const { venue } = await publishedVenue();
    await getSlots(venue.slug, "2027-08-01", "2027-11-01").expect(400);
    await getSlots(venue.slug, "2027-02-31", "2027-03-01").expect(400);
  });

  it("salle brouillon, supprimée ou slug inconnu : 404 VENUE_NOT_FOUND indistinct", async () => {
    const { venue } = await publishedVenue();
    const inconnu = await getSlots("salle-fantome", DIMANCHE_DATE, DIMANCHE_DATE).expect(404);
    expect(inconnu.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });

    await ctx.prisma.venue.update({ where: { id: venue.id }, data: { publicationStatus: "DRAFT" } });
    await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(404);
  });

  it("les visites ignorent TOTALEMENT les réservations de fête (D47)", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    // La salle est louée toute la soirée du dimanche : elle se visite quand même.
    await ctx.prisma.booking.create({
      data: {
        venueId: venue.id, slotTemplateId: null, status: "ACCEPTED",
        eventDate: new Date(`${DIMANCHE_DATE}T00:00:00Z`),
        startsAt: at(DIMANCHE_DATE, 1200), endsAt: at(LUNDI_DATE, 120),
        guests: 200, basePriceCents: 20_000_000, servicesTotalCents: 0,
        totalCents: 20_000_000, depositCents: 6_000_000,
        contactFirstName: "Amine", contactLastName: "B", contactPhone: "+213550000001"
      }
    });
    const body = (await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    expect(body.slots).toHaveLength(6);
  });
});

describe("D59 — un rendez-vous pris est EXCLUSIF (supersède D47)", () => {
  it("la base REFUSE un second rendez-vous confirmé sur le même créneau", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    const client = await seedClient();
    const quand = at(DIMANCHE_DATE, 600);

    await ctx.prisma.visitBooking.create({ data: { venueId: venue.id, clientId: client.id, scheduledAt: quand } });

    // Garanti par l'index unique PARTIEL, pas par une vérification applicative :
    // deux clients qui cliquent à la même seconde sont le cas probable.
    await expect(
      ctx.prisma.visitBooking.create({ data: { venueId: venue.id, clientId: client.id, scheduledAt: quand } })
    ).rejects.toThrow();
  });

  it("une visite ANNULÉE LIBÈRE son créneau : l'index est partiel, pas total", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    const client = await seedClient();
    const quand = at(DIMANCHE_DATE, 600);

    const first = await ctx.prisma.visitBooking.create({
      data: { venueId: venue.id, clientId: client.id, scheduledAt: quand }
    });
    await ctx.prisma.visitBooking.update({
      where: { id: first.id },
      data: { status: "CANCELLED", cancelledAt: new Date() }
    });

    // Le créneau est de nouveau libre — et l'endpoint le redit.
    await ctx.prisma.visitBooking.create({ data: { venueId: venue.id, clientId: client.id, scheduledAt: quand } });
    const body = (await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    expect(body.slots.find((s) => s.startMinutes === 600)?.taken).toBe(true);
  });

  it("le même créneau dans une AUTRE salle reste libre", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    const client = await seedClient();
    const quand = at(DIMANCHE_DATE, 600);
    await ctx.prisma.visitBooking.create({ data: { venueId: venue.id, clientId: client.id, scheduledAt: quand } });

    const other = await ctx.prisma.venue.findFirstOrThrow({ where: { id: venue.id } });
    const clone = await ctx.prisma.venue.create({
      data: {
        ownerId: other.ownerId, cityId: other.cityId, slug: "salle-voisine",
        nameFr: "Salle Voisine", nameAr: "قاعة", capacityMax: 300, basePriceCents: 15_000_000
      }
    });
    // L'unicité porte sur (venue_id, scheduled_at) : une autre salle ne
    // partage pas ses créneaux.
    await ctx.prisma.visitBooking.create({ data: { venueId: clone.id, clientId: client.id, scheduledAt: quand } });
    expect(await ctx.prisma.visitBooking.count()).toBe(2);
  });

  it("un créneau pris reste RENDU, marqué taken — il ne disparaît pas de la liste", async () => {
    const { token, venue } = await publishedVenue();
    await addWindow(token, venue.id, { dayOfWeek: DIMANCHE, startMinutes: 540, endMinutes: 720 });
    const client = await seedClient();
    await ctx.prisma.visitBooking.create({
      data: { venueId: venue.id, clientId: client.id, scheduledAt: at(DIMANCHE_DATE, 600) }
    });
    const body = (await getSlots(venue.slug, DIMANCHE_DATE, DIMANCHE_DATE).expect(200))
      .body as VenueVisitSlotsResponse;
    // Six créneaux toujours : une liste qui se contracte ferait croire que la
    // salle ne fait pas de visites ce jour-là.
    expect(body.slots).toHaveLength(6);
    expect(body.slots.find((s) => s.startMinutes === 600)?.taken).toBe(true);
  });
});

describe("D60 — canaux de notification du pro", () => {
  it("par défaut, un pro est notifié par e-mail et pas par SMS", async () => {
    await publishedVenue();
    const profile = await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: PRO.email } } });
    expect(profile.notifyByEmail).toBe(true);
    expect(profile.notifyBySms).toBe(false);
  });

  it("le SMS seul est un choix valide", async () => {
    await publishedVenue();
    const profile = await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: PRO.email } } });
    const updated = await ctx.prisma.proProfile.update({
      where: { id: profile.id },
      data: { notifyByEmail: false, notifyBySms: true }
    });
    expect(updated.notifyBySms).toBe(true);
  });

  it("la base INTERDIT de tout couper — un pro sans canal ne verrait plus rien arriver", async () => {
    await publishedVenue();
    const profile = await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: PRO.email } } });
    await expect(
      ctx.prisma.proProfile.update({
        where: { id: profile.id },
        data: { notifyByEmail: false, notifyBySms: false }
      })
    ).rejects.toThrow();
  });
});
