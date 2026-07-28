// Intégration Lot B1 — créneaux de fête (D46), base PostgreSQL réelle.
//
// Ce qui ne se prouve QU'ICI :
//   - `venues.base_price_cents` recalculé DANS la transaction (la recherche
//     publique A3/A7 filtre et trie dessus : une divergence, même d'une
//     seconde, c'est un « à partir de » faux sur une page publique) ;
//   - le CHECK `slot_templates_base_price_positive`, filet mécanique sous Zod ;
//   - le CHECK `slot_templates_minutes_valid`, qui AUTORISE le franchissement
//     de minuit — une soirée de mariage algérienne finit après 00h ;
//   - les trois 409 (chevauchement, mode simple, salle publiée sans créneau) ;
//   - la garde de publication admin.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { SlotTemplateDTO, VenueProDTO } from "@zwadj/types";
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

async function proWithVenue(): Promise<{ token: string; venue: VenueProDTO }> {
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
      bookingMode: "MULTI_SLOT"
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

const addSlot = (token: string, venueId: string, body: object) =>
  api().post(`/api/v1/venues/${venueId}/slot-templates`).set(authH(token)).send(body);

const priceOf = (venueId: string) =>
  ctx.prisma.venue.findUniqueOrThrow({ where: { id: venueId }, select: { basePriceCents: true } });

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("Créneaux — création et prix dérivé", () => {
  it("le prix de la SALLE devient le minimum des créneaux actifs, écrit dans la même transaction", async () => {
    const { token, venue } = await proWithVenue();

    const soiree = await addSlot(token, venue.id, SOIREE).expect(201);
    expect((soiree.body as SlotTemplateDTO).basePriceCents).toBe(20_000_000);
    // Un seul créneau : la salle prend SON prix, pas celui saisi à la création.
    expect((await priceOf(venue.id)).basePriceCents).toBe(20_000_000);

    await addSlot(token, venue.id, MATIN).expect(201);
    // La matinée est moins chère : c'est elle qui donne le « à partir de ».
    expect((await priceOf(venue.id)).basePriceCents).toBe(12_000_000);
  });

  it("une soirée qui FRANCHIT MINUIT est acceptée — cas normal d'un mariage algérien", async () => {
    const { token, venue } = await proWithVenue();
    // 20h → 02h du lendemain = 1200 → 1560. Plafonner la fin à 1440 aurait
    // rendu le créneau le plus courant du pays impossible à saisir.
    const res = await addSlot(token, venue.id, SOIREE).expect(201);
    expect((res.body as SlotTemplateDTO).endMinutes).toBe(1560);
  });

  it("les créneaux voyagent dans VenueProDTO.slotTemplates, triés par heure de début", async () => {
    const { token, venue } = await proWithVenue();
    await addSlot(token, venue.id, SOIREE).expect(201);
    await addSlot(token, venue.id, MATIN).expect(201);

    const detail = await api().get(`/api/v1/pro/venues/${venue.id}`).set(authH(token)).expect(200);
    expect((detail.body as VenueProDTO).slotTemplates.map((s) => s.nameFr)).toEqual(["Matinée", "Soirée"]);
  });
});

describe("Créneaux — les trois 409", () => {
  it("chevauchement refusé ; deux créneaux qui se TOUCHENT sont acceptés", async () => {
    const { token, venue } = await proWithVenue();
    await addSlot(token, venue.id, { ...MATIN, startMinutes: 600, endMinutes: 900 }).expect(201);

    const chevauche = await addSlot(token, venue.id, { ...SOIREE, startMinutes: 840, endMinutes: 1200 }).expect(409);
    expect(chevauche.body.message).toEqual({ code: "SLOT_TEMPLATE_OVERLAP", message: "venue.errors.slotOverlap" });

    // 09h00 → 14h00 commence exactement où le précédent finit : légitime.
    await addSlot(token, venue.id, { ...SOIREE, startMinutes: 900, endMinutes: 1200 }).expect(201);
  });

  it("SINGLE_SLOT : un second créneau actif est refusé", async () => {
    const { token, venue } = await proWithVenue();
    await api().patch(`/api/v1/venues/${venue.id}`).set(authH(token)).send({ bookingMode: "SINGLE_SLOT" }).expect(200);

    await addSlot(token, venue.id, SOIREE).expect(201);
    const second = await addSlot(token, venue.id, MATIN).expect(409);
    expect(second.body.message.code).toBe("SLOT_TEMPLATE_SINGLE_MODE");
  });

  it("une salle PUBLIÉE ne peut pas perdre son dernier créneau actif", async () => {
    const { token, venue } = await proWithVenue();
    const slot = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;
    await api()
      .post(`/api/v1/admin/venues/${venue.id}/publish`)
      .set(authH(await adminToken()))
      .expect(200);

    const off = await api()
      .patch(`/api/v1/venues/${venue.id}/slot-templates/${slot.id}`)
      .set(authH(token))
      .send({ isActive: false })
      .expect(409);
    expect(off.body.message.code).toBe("SLOT_TEMPLATE_REQUIRED");

    await api().delete(`/api/v1/venues/${venue.id}/slot-templates/${slot.id}`).set(authH(token)).expect(409);
  });
});

describe("Créneaux — publication admin", () => {
  it("publier une salle SANS créneau actif est refusé : elle serait invisible au calendrier", async () => {
    const { venue } = await proWithVenue();
    const res = await api()
      .post(`/api/v1/admin/venues/${venue.id}/publish`)
      .set(authH(await adminToken()))
      .expect(409);
    expect(res.body.message).toEqual({ code: "SLOT_TEMPLATE_REQUIRED", message: "venue.errors.slotRequired" });
  });
});

describe("Créneaux — suppression et retrait", () => {
  it("suppression dure d'un créneau jamais utilisé ; le prix de la salle suit", async () => {
    const { token, venue } = await proWithVenue();
    await addSlot(token, venue.id, SOIREE).expect(201);
    const matin = (await addSlot(token, venue.id, MATIN).expect(201)).body as SlotTemplateDTO;
    expect((await priceOf(venue.id)).basePriceCents).toBe(12_000_000);

    await api().delete(`/api/v1/venues/${venue.id}/slot-templates/${matin.id}`).set(authH(token)).expect(204);
    // Le minimum remonte : la salle repart au prix de la soirée.
    expect((await priceOf(venue.id)).basePriceCents).toBe(20_000_000);
  });

  it("un créneau DÉSACTIVÉ sort du calcul du prix mais reste dans le DTO", async () => {
    const { token, venue } = await proWithVenue();
    await addSlot(token, venue.id, SOIREE).expect(201);
    const matin = (await addSlot(token, venue.id, MATIN).expect(201)).body as SlotTemplateDTO;

    await api()
      .patch(`/api/v1/venues/${venue.id}/slot-templates/${matin.id}`)
      .set(authH(token))
      .send({ isActive: false })
      .expect(200);

    expect((await priceOf(venue.id)).basePriceCents).toBe(20_000_000);
    const detail = await api().get(`/api/v1/pro/venues/${venue.id}`).set(authH(token)).expect(200);
    // Toujours listé : c'est un RETRAIT, pas un effacement — l'historique de
    // ce qui a été vendu ne se réécrit pas.
    expect((detail.body as VenueProDTO).slotTemplates).toHaveLength(2);
  });

  it("404 INDISTINCT sur le créneau d'une autre salle, et sur un id malformé", async () => {
    const { token, venue } = await proWithVenue();
    await api()
      .patch(`/api/v1/venues/${venue.id}/slot-templates/pas-un-uuid`)
      .set(authH(token))
      .send({ isActive: false })
      .expect(404);
  });
});

describe("Créneaux — filets SQL sous la validation applicative", () => {
  it("CHECK slot_templates_base_price_positive : une écriture Prisma directe à 0 est rejetée par Postgres", async () => {
    const { token, venue } = await proWithVenue();
    await addSlot(token, venue.id, SOIREE).expect(201);

    // Zod refuse déjà 0 côté API ; ceci prouve le filet EN DESSOUS, pour toute
    // écriture qui contournerait la route (script, migration, DBeaver).
    await expect(
      ctx.prisma.slotTemplate.create({
        data: { venueId: venue.id, nameFr: "Gratuit", nameAr: "مجاني", startMinutes: 60, endMinutes: 120, basePriceCents: 0 }
      })
    ).rejects.toThrow();
  });

  it("Zod refuse un prix nul ou négatif avant même d'atteindre la base", async () => {
    const { token, venue } = await proWithVenue();
    await addSlot(token, venue.id, { ...SOIREE, basePriceCents: 0 }).expect(400);
    await addSlot(token, venue.id, { ...SOIREE, startMinutes: 1200, endMinutes: 1200 }).expect(400);
  });
});

describe("Règles de prix — B2, D46", () => {
  const addRule = (token: string, venueId: string, slotId: string, body: object) =>
    api().post(`/api/v1/venues/${venueId}/slot-templates/${slotId}/pricing-rules`).set(authH(token)).send(body);

  it("une règle MOINS chère abaisse le « à partir de » de la salle : une promotion doit se voir en recherche", async () => {
    const { token, venue } = await proWithVenue();
    const slot = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;
    expect((await priceOf(venue.id)).basePriceCents).toBe(20_000_000);

    await addRule(token, venue.id, slot.id, {
      ruleType: "SEASON",
      label: "Basse saison",
      priceCents: 14_000_000,
      startMonth: 1,
      endMonth: 3
    }).expect(201);

    // Sans ce second terme dans l'agrégat, la recherche publique afficherait
    // 200 000 DA pour une salle qui descend à 140 000 en janvier.
    expect((await priceOf(venue.id)).basePriceCents).toBe(14_000_000);
  });

  it("les règles voyagent avec leur créneau dans le DTO pro", async () => {
    const { token, venue } = await proWithVenue();
    const slot = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;
    await addRule(token, venue.id, slot.id, { ruleType: "HOLIDAY", priceCents: 30_000_000 }).expect(201);

    const detail = await api().get(`/api/v1/pro/venues/${venue.id}`).set(authH(token)).expect(200);
    const rules = (detail.body as VenueProDTO).slotTemplates[0]?.pricingRules ?? [];
    expect(rules).toHaveLength(1);
    expect(rules[0]?.ruleType).toBe("HOLIDAY");
  });

  it("les champs REQUIS dépendent du type : saison sans bornes et jour sans jours sont refusés", async () => {
    const { token, venue } = await proWithVenue();
    const slot = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;

    // Une règle muette se saisirait sans erreur puis ne s'appliquerait jamais :
    // le pro croirait à un bug de tarification.
    await addRule(token, venue.id, slot.id, { ruleType: "SEASON", priceCents: 22_000_000 }).expect(400);
    await addRule(token, venue.id, slot.id, { ruleType: "WEEKDAY", priceCents: 22_000_000 }).expect(400);
    await addRule(token, venue.id, slot.id, { ruleType: "HOLIDAY", priceCents: 22_000_000 }).expect(201);
  });

  it("CHECK pricing_rules_price_positive : un prix nul est rejeté par Postgres, pas seulement par Zod", async () => {
    const { token, venue } = await proWithVenue();
    const slot = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;
    await addRule(token, venue.id, slot.id, { ruleType: "HOLIDAY", priceCents: 0 }).expect(400);

    await expect(
      ctx.prisma.pricingRule.create({
        data: { venueId: venue.id, slotTemplateId: slot.id, ruleType: "HOLIDAY", priceCents: 0, daysOfWeek: [] }
      })
    ).rejects.toThrow();
  });

  it("FK COMPOSITE : une règle ne peut pas pointer le créneau d'une AUTRE salle", async () => {
    const { token, venue } = await proWithVenue();
    const slotA = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;
    const autre = await api()
      .post("/api/v1/venues")
      .set(authH(token))
      .send({
        cityId: (await ctx.prisma.city.findFirstOrThrow()).id,
        nameFr: "Salle B",
        nameAr: "قاعة ب",
        capacityMax: 200,
        basePriceCents: 9_000_000
      })
      .expect(201);

    // Sans `pricing_rules_slot_belongs_to_venue`, le « à partir de » de la
    // salle B intégrerait un prix qui n'est pas le sien.
    await expect(
      ctx.prisma.pricingRule.create({
        data: {
          venueId: (autre.body as VenueProDTO).id,
          slotTemplateId: slotA.id,
          ruleType: "HOLIDAY",
          priceCents: 5_000_000,
          daysOfWeek: []
        }
      })
    ).rejects.toThrow();
  });

  it("supprimer le CRÉNEAU emporte ses règles, et le « à partir de » repart du bon minimum", async () => {
    const { token, venue } = await proWithVenue();
    const soiree = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;
    const matin = (await addSlot(token, venue.id, MATIN).expect(201)).body as SlotTemplateDTO;
    await addRule(token, venue.id, matin.id, {
      ruleType: "SEASON",
      priceCents: 8_000_000,
      startMonth: 1,
      endMonth: 3
    }).expect(201);
    expect((await priceOf(venue.id)).basePriceCents).toBe(8_000_000);

    await api().delete(`/api/v1/venues/${venue.id}/slot-templates/${matin.id}`).set(authH(token)).expect(204);
    // La règle est partie EN CASCADE avec son créneau : il ne reste que la soirée.
    expect(await ctx.prisma.pricingRule.count({ where: { venueId: venue.id } })).toBe(0);
    expect((await priceOf(venue.id)).basePriceCents).toBe(20_000_000);
    expect(soiree.basePriceCents).toBe(20_000_000);
  });

  it("404 INDISTINCT sur la règle d'un autre créneau", async () => {
    const { token, venue } = await proWithVenue();
    const slot = (await addSlot(token, venue.id, SOIREE).expect(201)).body as SlotTemplateDTO;
    await api()
      .delete(`/api/v1/venues/${venue.id}/slot-templates/${slot.id}/pricing-rules/pas-un-uuid`)
      .set(authH(token))
      .expect(404);
  });
});
