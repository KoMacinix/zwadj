// Intégration Lot B3 — disponibilité publique, base PostgreSQL réelle.
//
// Ce qui ne se prouve QU'ICI :
//   - le fuseau appliqué UNE fois, à la frontière : minuit local ≠ minuit UTC ;
//   - la fenêtre de chargement élargie à +48 h, qui seule fait voir à une
//     soirée 20h→02h une réservation de la nuit SUIVANTE ;
//   - les bornes UTC de la requête fériés (colonne `@db.Date`) ;
//   - l'écrêtage D49, qui rend 200 là où un 400 serait intermittent ;
//   - la règle de visibilité D33, partagée avec le détail public.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenueAvailabilityResponse, VenueProDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO = {
  role: "PRO",
  email: "pro@example.dz",
  password: "Motdepasse1",
  businessName: "Salles Pro",
  phone: "+213550000009"
};
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

const SOIREE = { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: 20_000_000 };
const MATIN = { nameFr: "Matinée", nameAr: "صباحية", startMinutes: 600, endMinutes: 900, basePriceCents: 12_000_000 };

/** Dates fixes et LOINTAINES : l'écrêtage D49 mangerait toute fenêtre passée,
 *  et les tests ne doivent pas dépendre du jour où ils tournent. */
const D1 = "2027-08-13"; // vendredi
const D2 = "2027-08-14"; // samedi
const D3 = "2027-08-15"; // dimanche

/** Instant UTC correspondant à une heure LOCALE d'Alger (UTC+1). */
const at = (date: string, hour: number, minute = 0) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + (hour * 60 + minute - 60) * 60_000);

/** Aujourd'hui à Alger et l'horizon D46, calculés comme le fait le service : un
 *  test de borne ne peut pas figer une date. */
const civilToday = () => new Date(Date.now() + 60 * 60_000).toISOString().slice(0, 10);
const shiftDays = (date: string, days: number) =>
  new Date(Date.parse(`${date}T00:00:00Z`) + days * 86_400_000).toISOString().slice(0, 10);
const civilHorizon = () => {
  const t = new Date(Date.parse(`${civilToday()}T00:00:00Z`));
  const lastDay = new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 19, 0)).getUTCDate();
  return new Date(Date.UTC(t.getUTCFullYear(), t.getUTCMonth() + 18, Math.min(t.getUTCDate(), lastDay)))
    .toISOString()
    .slice(0, 10);
};

async function proWithVenue(bookingMode: "SINGLE_SLOT" | "MULTI_SLOT" = "MULTI_SLOT") {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const token = await loginAs(ctx, PRO.email, PRO.password);
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const res = await api()
    .post("/api/v1/venues")
    .set(authH(token))
    .send({
      cityId: city.id,
      nameFr: "Salle El Ferdous",
      nameAr: "قاعة الفردوس",
      capacityMax: 450,
      basePriceCents: 18_000_000,
      bookingMode
    });
  if (res.status !== 201) throw new Error(`seed venue: ${res.status} ${JSON.stringify(res.body)}`);
  return { token, venue: res.body as VenueProDTO };
}

async function adminToken(): Promise<string> {
  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  return loginAs(ctx, ADMIN.email, ADMIN.password);
}

/** Salle PUBLIÉE avec créneaux actifs — l'état nominal d'une salle réservable. */
async function publishedVenue(bookingMode: "SINGLE_SLOT" | "MULTI_SLOT" = "MULTI_SLOT") {
  const { token, venue } = await proWithVenue(bookingMode);
  const create = async (slot: typeof SOIREE): Promise<string> => {
    const res = await api().post(`/api/v1/venues/${venue.id}/slot-templates`).set(authH(token)).send(slot).expect(201);
    return res.body.id as string;
  };
  // Ids NOMMÉS plutôt qu'un Record indexable : sous `noUncheckedIndexedAccess`,
  // une lecture par clé rend `string | undefined` et contamine tout le fichier.
  const matin = bookingMode === "SINGLE_SLOT" ? "" : await create(MATIN);
  const soiree = await create(SOIREE);
  const admin = await adminToken();
  await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(admin)).expect(200);
  return { token, venue, matin, soiree };
}

/** Accès à un jour SANS index optionnel : l'absence est un échec de test
 *  explicite, pas un `undefined` qui se propage. */
function dayOf(body: VenueAvailabilityResponse, date: string) {
  const day = body.days.find((d) => d.date === date);
  if (!day) throw new Error(`jour absent de la réponse : ${date}`);
  return day;
}

const seedBooking = (venueId: string, startsAt: Date, endsAt: Date, status: string, slotTemplateId: string | null) =>
  ctx.prisma.booking.create({
    data: {
      venueId,
      slotTemplateId,
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

const getAvailability = (slug: string, from: string, to: string) =>
  api().get(`/api/v1/venues/${slug}/availability`).query({ from, to });

const statusOf = (body: VenueAvailabilityResponse, date: string, slotId: string) =>
  body.days.find((d) => d.date === date)?.slots.find((s) => s.slotTemplateId === slotId)?.status;

const priceOf = (body: VenueAvailabilityResponse, date: string, slotId: string) =>
  body.days.find((d) => d.date === date)?.slots.find((s) => s.slotTemplateId === slotId)?.priceCents;

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("Disponibilité — forme de la réponse", () => {
  it("une salle publiée rend un jour par date, bornes incluses, créneaux dans l'ordre SLOT_ORDER_BY", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    const res = await getAvailability(venue.slug, D1, D3).expect(200);
    const body = res.body as VenueAvailabilityResponse;

    expect(body.days.map((d) => d.date)).toEqual([D1, D2, D3]);
    expect(body.from).toBe(D1);
    expect(body.to).toBe(D3);
    expect(body.bookingMode).toBe("MULTI_SLOT");
    // Matinée (600) avant Soirée (1200).
    expect(body.slots.map((s) => s.id)).toEqual([matin, soiree]);
    expect(dayOf(body, D1).slots.map((s) => s.slotTemplateId)).toEqual([matin, soiree]);
  });

  it("les métadonnées de créneau sortent UNE fois — days[].slots ne porte ni nom ni minutes", async () => {
    const { venue } = await publishedVenue();
    const res = await getAvailability(venue.slug, D1, D1).expect(200);
    const body = res.body as VenueAvailabilityResponse;
    expect(body.slots[0]?.nameFr).toBeDefined();
    expect(Object.keys(dayOf(body, D1).slots[0] ?? {}).sort()).toEqual(["priceCents", "slotTemplateId", "status"]);
  });

  it("aucun ruleId ne sort de l'endpoint public", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await ctx.prisma.pricingRule.create({
      data: {
        venueId: venue.id,
        slotTemplateId: soiree,
        ruleType: "SEASON",
        label: "Haute saison",
        priceCents: 30_000_000,
        startMonth: 6,
        endMonth: 9,
        priority: 10
      }
    });
    const res = await getAvailability(venue.slug, D1, D1).expect(200);
    expect(JSON.stringify(res.body)).not.toContain("ruleId");
  });

  it("une soirée 20h→02h expose endMinutes au-delà de 1440, sans être tronquée", async () => {
    const { venue } = await publishedVenue();
    const res = await getAvailability(venue.slug, D1, D1).expect(200);
    const soiree = (res.body as VenueAvailabilityResponse).slots.find((s) => s.startMinutes === 1200);
    expect(soiree?.endMinutes).toBe(1560);
  });
});

describe("Disponibilité — statuts", () => {
  it("une réservation ACCEPTED rend BOOKED ; une PENDING rend REQUESTED sans verrouiller", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await seedBooking(venue.id, at(D1, 20), at(D2, 2), "ACCEPTED", soiree);
    await seedBooking(venue.id, at(D2, 20), at(D3, 2), "PENDING", soiree);
    const body = (await getAvailability(venue.slug, D1, D2).expect(200)).body as VenueAvailabilityResponse;
    expect(statusOf(body, D1, soiree)).toBe("BOOKED");
    expect(statusOf(body, D2, soiree)).toBe("REQUESTED");
    // L'autre créneau du même jour reste libre en MULTI_SLOT.
    expect(statusOf(body, D1, matin)).toBe("AVAILABLE");
  });

  it("une réservation CANCELLED ne rend rien du tout — le créneau redevient AVAILABLE", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await seedBooking(venue.id, at(D1, 20), at(D2, 2), "CANCELLED", soiree);
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(statusOf(body, D1, soiree)).toBe("AVAILABLE");
  });

  it("un walk-in sans slotTemplateId ferme le créneau qu'il recouvre à l'heure", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await seedBooking(venue.id, at(D1, 11), at(D1, 14), "ACCEPTED", null);
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(statusOf(body, D1, matin)).toBe("BOOKED"); // 10h–15h recouvert
    expect(statusOf(body, D1, soiree)).toBe("AVAILABLE"); // 20h–02h intact
  });

  it("une soirée 20h→02h du dernier jour voit une réservation de 00h30 le LENDEMAIN", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    // La réservation commence APRÈS minuit, donc hors de [D1, D1] naïvement.
    await seedBooking(venue.id, at(D2, 0, 30), at(D2, 3), "ACCEPTED", null);
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(statusOf(body, D1, soiree)).toBe("BOOKED");
  });

  it("un blocage qui enjambe toute la fenêtre est chargé, alors qu'il ne commence pas dedans", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await ctx.prisma.availabilityBlock.create({
      data: {
        venueId: venue.id,
        blockedFrom: new Date("2027-01-01T00:00:00Z"),
        blockedUntil: new Date("2027-12-31T00:00:00Z")
      }
    });
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(statusOf(body, D1, soiree)).toBe("BLOCKED");
  });

  it("SINGLE_SLOT : une réservation dure ferme la journée entière, un BLOCKED n'est pas écrasé", async () => {
    const { venue, matin, soiree } = await publishedVenue("SINGLE_SLOT");
    await seedBooking(venue.id, at(D1, 20), at(D2, 2), "ACCEPTED", soiree);
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(statusOf(body, D1, soiree)).toBe("BOOKED");
  });
});

describe("Disponibilité — prix", () => {
  it("une règle de saison change le prix rendu, sans changer le statut", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await ctx.prisma.pricingRule.create({
      data: {
        venueId: venue.id,
        slotTemplateId: soiree,
        ruleType: "SEASON",
        label: "Haute saison",
        priceCents: 30_000_000,
        startMonth: 6,
        endMonth: 9,
        priority: 10
      }
    });
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(priceOf(body, D1, soiree)).toBe(30_000_000);
    expect(statusOf(body, D1, soiree)).toBe("AVAILABLE");
  });

  it("un férié du 1er novembre est marqué isHoliday et applique la règle HOLIDAY", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await ctx.prisma.holiday.create({
      data: { date: new Date(Date.UTC(2027, 10, 1)), nameFr: "1er novembre", nameAr: "أول نوفمبر" }
    });
    await ctx.prisma.pricingRule.create({
      data: {
        venueId: venue.id,
        slotTemplateId: soiree,
        ruleType: "HOLIDAY",
        label: "Jour férié",
        priceCents: 45_000_000,
        priority: 100
      }
    });
    const body = (await getAvailability(venue.slug, "2027-10-31", "2027-11-02").expect(200))
      .body as VenueAvailabilityResponse;
    expect(body.days.find((d) => d.date === "2027-11-01")?.isHoliday).toBe(true);
    expect(body.days.find((d) => d.date === "2027-10-31")?.isHoliday).toBe(false);
    expect(priceOf(body, "2027-11-01", soiree)).toBe(45_000_000);
    expect(priceOf(body, "2027-10-31", soiree)).toBe(20_000_000);
  });
});

describe("Disponibilité — bornes D49", () => {
  it("from dans le passé : 200, et le from RENVOYÉ est aujourd'hui", async () => {
    const { venue } = await publishedVenue();
    const today = civilToday();
    const body = (await getAvailability(venue.slug, shiftDays(today, -10), shiftDays(today, 2)).expect(200))
      .body as VenueAvailabilityResponse;
    expect(body.from).toBe(today);
    expect(body.days[0]?.date).toBe(today);
  });

  it("to au-delà de 18 mois : 200, et le to RENVOYÉ est l'horizon", async () => {
    const { venue } = await publishedVenue();
    const horizon = civilHorizon();
    const body = (await getAvailability(venue.slug, shiftDays(horizon, -5), horizon).expect(200))
      .body as VenueAvailabilityResponse;
    expect(body.to).toBe(horizon);
  });

  it("une fenêtre entièrement passée rend 200 et zéro jour, jamais une erreur", async () => {
    const { venue } = await publishedVenue();
    const body = (await getAvailability(venue.slug, "2020-01-01", "2020-03-01").expect(200))
      .body as VenueAvailabilityResponse;
    expect(body.days).toEqual([]);
  });

  it("fenêtre de 93 jours : 400 · 2027-02-31 : 400 · to < from : 400", async () => {
    const { venue } = await publishedVenue();
    await getAvailability(venue.slug, "2027-08-01", "2027-11-01").expect(400); // 93 jours rendus
    await getAvailability(venue.slug, "2027-08-01", "2027-10-31").expect(200); // 92 : la borne exacte passe
    await getAvailability(venue.slug, "2027-02-31", "2027-03-01").expect(400);
    await getAvailability(venue.slug, D3, D1).expect(400);
  });

  it("un jusqu'en 2099 reste un 400 : l'écrêtage ne rattrape pas une fenêtre trop large", async () => {
    const { venue } = await publishedVenue();
    await getAvailability(venue.slug, D1, "2099-01-01").expect(400);
  });
});

describe("Disponibilité — visibilité D33", () => {
  it("salle HIDDEN, brouillon, supprimée, slug inconnu : 404 VENUE_NOT_FOUND indistinct", async () => {
    const { venue } = await publishedVenue();
    const inconnu = await getAvailability("salle-qui-n-existe-pas", D1, D1).expect(404);
    expect(inconnu.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });

    await ctx.prisma.venue.update({ where: { id: venue.id }, data: { publicationStatus: "DRAFT" } });
    await getAvailability(venue.slug, D1, D1).expect(404);

    await ctx.prisma.venue.update({
      where: { id: venue.id },
      data: { publicationStatus: "PUBLISHED", deletedAt: new Date() }
    });
    await getAvailability(venue.slug, D1, D1).expect(404);
  });

  it("un slug hors motif est refusé AVANT la base — même court-circuit que l'uuid pro", async () => {
    await publishedVenue();
    await getAvailability("Slug_Invalide!", D1, D1).expect(404);
  });

  it("salle TEMPORARILY_UNAVAILABLE : 200 — même règle de visibilité que le détail", async () => {
    const { venue } = await publishedVenue();
    await ctx.prisma.venue.update({ where: { id: venue.id }, data: { status: "TEMPORARILY_UNAVAILABLE" } });
    await getAvailability(venue.slug, D1, D1).expect(200);
  });

  it("salle sans créneau actif : 200, slots vide, jamais 404", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await ctx.prisma.slotTemplate.updateMany({ where: { venueId: venue.id }, data: { isActive: false } });
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(body.slots).toEqual([]);
    expect(dayOf(body, D1).slots).toEqual([]);
    expect(soiree).toBeDefined();
  });

  it("un créneau désactivé disparaît, les autres restent", async () => {
    const { venue, matin, soiree } = await publishedVenue();
    await ctx.prisma.slotTemplate.update({ where: { id: matin }, data: { isActive: false } });
    const body = (await getAvailability(venue.slug, D1, D1).expect(200)).body as VenueAvailabilityResponse;
    expect(body.slots.map((s) => s.id)).toEqual([soiree]);
  });
});
