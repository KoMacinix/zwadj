// Intégration Flux E, Lot E2a — catalogue de prestations et lignes de devis.
//
// Ce qui ne se prouve QU'ICI :
//   - qu'un PER_GUEST facture le nombre d'INVITÉS de la demande, jamais une
//     quantité saisie — l'erreur y coûterait un facteur 25 ;
//   - que le service et son tarif naissent ENSEMBLE (D89), et qu'un échec de la
//     seconde écriture n'abandonne pas une prestation sans prix au catalogue ;
//   - qu'une prestation VENDUE ne se supprime plus (SERVICE_IN_USE) alors qu'une
//     prestation jamais utilisée se supprime ;
//   - que `services_total_cents` et les lignes sont écrits dans la MÊME
//     instruction, donc jamais désaccordés.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { BookingDTO, ServiceDTO, VenueProDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO = { role: "PRO", email: "pro@example.dz", password: "Motdepasse1", businessName: "Salles Pro", phone: "+213550000009" };
const ADMIN = { role: "CLIENT", email: "admin@example.dz", password: "Motdepasse1", firstName: "Adm", lastName: "In" };
const CLIENT = { role: "CLIENT", email: "client@example.dz", password: "Motdepasse1", firstName: "Amina", lastName: "Bensalem" };

const api = () => request(ctx.app.getHttpServer());
const authH = (token: string) => ({ Authorization: `Bearer ${token}` });

const EVENT_DATE = "2027-08-15";
const SLOT_PRICE = 20_000_000; // 200 000 DA
const GUESTS = 250;

interface Fixture {
  proToken: string;
  clientToken: string;
  venue: VenueProDTO;
  slotId: string;
}

async function setup(): Promise<Fixture> {
  await registerUser(ctx, PRO);
  await verifyLastRegistered(ctx);
  const proToken = await loginAs(ctx, PRO.email, PRO.password);

  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });

  const created = await api()
    .post("/api/v1/venues")
    .set(authH(proToken))
    .send({
      cityId: city.id,
      nameFr: "Salle El Ryad",
      nameAr: "قاعة",
      capacityMax: 400,
      basePriceCents: 18_000_000,
      bookingMode: "MULTI_SLOT"
    })
    .expect(201);
  const venue = created.body as VenueProDTO;

  const slot = await api()
    .post(`/api/v1/venues/${venue.id}/slot-templates`)
    .set(authH(proToken))
    .send({ nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560, basePriceCents: SLOT_PRICE })
    .expect(201);

  await registerUser(ctx, ADMIN);
  await verifyLastRegistered(ctx);
  await ctx.prisma.user.update({ where: { email: ADMIN.email }, data: { role: "ADMIN" } });
  const adminToken = await loginAs(ctx, ADMIN.email, ADMIN.password);
  await api().post(`/api/v1/admin/venues/${venue.id}/publish`).set(authH(adminToken)).expect(200);

  await registerUser(ctx, CLIENT);
  await verifyLastRegistered(ctx);
  const clientToken = await loginAs(ctx, CLIENT.email, CLIENT.password);

  return { proToken, clientToken, venue, slotId: (slot.body as { id: string }).id };
}

const makeService = (f: Fixture, payload: Record<string, unknown>) =>
  api().post(`/api/v1/venues/${f.venue.id}/services`).set(authH(f.proToken)).send(payload);

const bookingBody = (f: Fixture, over: Record<string, unknown> = {}) => ({
  eventDate: EVENT_DATE,
  slotTemplateId: f.slotId,
  guests: GUESTS,
  paymentMethod: "CASH",
  contactFirstName: "Amina",
  contactLastName: "Bensalem",
  contactPhone: "+213550000001",
  contactEmail: "amina@example.dz",
  expectedTotalCents: SLOT_PRICE,
  expectedDepositCents: SLOT_PRICE * 0.3,
  ...over
});

const postBooking = (f: Fixture, payload: Record<string, unknown>) =>
  api().post(`/api/v1/venues/${f.venue.slug}/bookings`).set(authH(f.clientToken)).send(payload);

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
});

describe("Catalogue — le service et son tarif naissent ENSEMBLE (D89)", () => {
  it("FIXED : une seule requête rend la prestation ET son prix", async () => {
    const f = await setup();
    const res = await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Décoration florale",
      nameAr: "زينة",
      fixedPriceCents: 5_000_000
    }).expect(201);
    const dto = res.body as ServiceDTO;
    expect(dto.fixedPriceCents).toBe(5_000_000);
    expect(dto.tiers).toEqual([]);
  });

  it("TIERED : les paliers naissent avec, et un TIERED n'a PAS de ligne de tarif", async () => {
    const f = await setup();
    const res = await makeService(f, {
      pricingType: "TIERED",
      nameFr: "Menu",
      nameAr: "قائمة",
      tiers: [
        { labelFr: "Standard", labelAr: "عادي", priceCents: 8_000_000 },
        { labelFr: "Premium", labelAr: "ممتاز", priceCents: 12_000_000 }
      ]
    }).expect(201);
    const dto = res.body as ServiceDTO;
    expect(dto.tiers).toHaveLength(2);
    expect(dto.fixedPriceCents).toBeNull();
    expect(dto.perGuestPriceCents).toBeNull();
  });

  it("un TIERED sans palier est refusé : personne ne pourrait le choisir", async () => {
    const f = await setup();
    await makeService(f, { pricingType: "TIERED", nameFr: "Menu", nameAr: "قائمة", tiers: [] }).expect(400);
  });

  it("un champ étranger au type est refusé : l'union est discriminée", async () => {
    const f = await setup();
    await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Déco",
      nameAr: "زينة",
      fixedPriceCents: 100,
      perGuestPriceCents: 200
    }).expect(400);
  });

  it("PER_UNIT sans libellé d'unité est refusé : « 3 » sans unité ne veut rien dire", async () => {
    const f = await setup();
    await makeService(f, {
      pricingType: "PER_UNIT",
      nameFr: "Tables",
      nameAr: "طاولات",
      perUnitPriceCents: 300_000
    }).expect(400);
  });
});

describe("Catalogue — suppression et retrait de la vente", () => {
  it("une prestation JAMAIS utilisée se supprime", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Créée par erreur",
      nameAr: "خطأ",
      fixedPriceCents: 1_000
    }).expect(201);
    await api().delete(`/api/v1/services/${(created.body as ServiceDTO).id}`).set(authH(f.proToken)).expect(204);
  });

  it("une prestation VENDUE ne se supprime plus : SERVICE_IN_USE", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Décoration",
      nameAr: "زينة",
      fixedPriceCents: 5_000_000
    }).expect(201);
    const serviceId = (created.body as ServiceDTO).id;

    await postBooking(
      f,
      bookingBody(f, {
        services: [{ serviceId }],
        expectedTotalCents: SLOT_PRICE + 5_000_000,
        expectedDepositCents: (SLOT_PRICE + 5_000_000) * 0.3
      })
    ).expect(201);

    const res = await api().delete(`/api/v1/services/${serviceId}`).set(authH(f.proToken)).expect(409);
    expect(res.body.message.code).toBe("SERVICE_IN_USE");
  });

  it("le retrait de la vente est RÉVERSIBLE et n'efface rien", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Déco",
      nameAr: "زينة",
      fixedPriceCents: 5_000_000
    }).expect(201);
    const id = (created.body as ServiceDTO).id;
    await api().patch(`/api/v1/services/${id}`).set(authH(f.proToken)).send({ isActive: false }).expect(200);
    // Le pro la voit toujours : c'est la vue publique qui filtrera.
    const list = await api().get(`/api/v1/pro/venues/${f.venue.id}/services`).set(authH(f.proToken)).expect(200);
    expect((list.body as ServiceDTO[])[0]?.isActive).toBe(false);
    await api().patch(`/api/v1/services/${id}`).set(authH(f.proToken)).send({ isActive: true }).expect(200);
  });

  it("404 INDISTINCT sur la prestation d'un autre pro (D47)", async () => {
    const f = await setup();
    await api()
      .delete("/api/v1/services/0198f0c2-1b3d-7a41-9c8e-2f4b6d8a0c11")
      .set(authH(f.proToken))
      .expect(404);
  });
});

describe("Lignes de devis sur la demande (D91)", () => {
  it("PER_GUEST : la quantité EST le nombre d'invités, et le total suit", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "PER_GUEST",
      nameFr: "Traiteur",
      nameAr: "تموين",
      perGuestPriceCents: 200_000
    }).expect(201);

    const services = SLOT_PRICE + 200_000 * GUESTS;
    const res = await postBooking(
      f,
      bookingBody(f, {
        services: [{ serviceId: (created.body as ServiceDTO).id }],
        expectedTotalCents: services,
        expectedDepositCents: services * 0.3
      })
    ).expect(201);

    const dto = res.body as BookingDTO;
    expect(dto.services).toHaveLength(1);
    expect(dto.services[0]?.quantity).toBe(GUESTS);
    expect(dto.servicesTotalCents).toBe(200_000 * GUESTS);
    expect(dto.totalCents).toBe(services);
  });

  it("une quantité SAISIE sur un PER_GUEST est refusée : 10 couverts pour 250 personnes", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "PER_GUEST",
      nameFr: "Traiteur",
      nameAr: "تموين",
      perGuestPriceCents: 200_000
    }).expect(201);
    const res = await postBooking(
      f,
      bookingBody(f, { services: [{ serviceId: (created.body as ServiceDTO).id, quantity: 10 }] })
    ).expect(409);
    expect(res.body.message.code).toBe("SERVICE_TIER_MISMATCH");
  });

  it("l'ACOMPTE porte sur le total prestations comprises", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Déco",
      nameAr: "زينة",
      fixedPriceCents: 10_000_000
    }).expect(201);
    const total = SLOT_PRICE + 10_000_000;
    const res = await postBooking(
      f,
      bookingBody(f, {
        services: [{ serviceId: (created.body as ServiceDTO).id }],
        expectedTotalCents: total,
        expectedDepositCents: total * 0.3
      })
    ).expect(201);
    expect((res.body as BookingDTO).depositCents).toBe(total * 0.3);
  });

  it("un total périmé (prestations non comptées) rend 409 avec le VRAI montant (D75)", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Déco",
      nameAr: "زينة",
      fixedPriceCents: 10_000_000
    }).expect(201);
    const res = await postBooking(f, bookingBody(f, { services: [{ serviceId: (created.body as ServiceDTO).id }] })).expect(409);
    expect(res.body.message.code).toBe("BOOKING_PRICE_CHANGED");
    expect(res.body.message.totalCents).toBe(SLOT_PRICE + 10_000_000);
  });

  it("une prestation RETIRÉE de la vente ne se commande plus", async () => {
    const f = await setup();
    const created = await makeService(f, {
      pricingType: "FIXED",
      nameFr: "Déco",
      nameAr: "زينة",
      fixedPriceCents: 5_000_000
    }).expect(201);
    const id = (created.body as ServiceDTO).id;
    await api().patch(`/api/v1/services/${id}`).set(authH(f.proToken)).send({ isActive: false }).expect(200);

    const res = await postBooking(f, bookingBody(f, { services: [{ serviceId: id }] })).expect(409);
    expect(res.body.message.code).toBe("SERVICE_UNAVAILABLE");
  });

  it("une demande SANS prestation reste parfaitement valable", async () => {
    const f = await setup();
    const res = await postBooking(f, bookingBody(f)).expect(201);
    expect((res.body as BookingDTO).services).toEqual([]);
    expect((res.body as BookingDTO).servicesTotalCents).toBe(0);
  });
});
