// Intégration Flux A, Lot A13 — styles (D65), type de cérémonie (D66), bornes
// de capacité (D68), sur base réelle.
//
// Ce qui ne se prouve QU'ICI : la sémantique des trois filtres. Un test unitaire
// vérifie qu'un paramètre est accepté ; seule la base dit quelles salles sortent.
// Les trois pièges, dans l'ordre de gravité :
//   1. `ceremonyType=outdoor` doit rendre les salles MIXTES — un filtre par
//      égalité les cacherait, ce qui est exactement la mauvaise réponse ;
//   2. les styles sont en OU, les équipements en ET, dans la MÊME requête ;
//   3. les deux poignées de capacité portent sur la même colonne : mal fusionnées,
//      la seconde écrase la première et le plancher disparaît en silence.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenuePublicDTO, VenueStyleDTO, VenueSummaryDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer());

interface Ids {
  ownerId: string;
  cityId: string;
  royal: string;
  jardin: string;
  bordDeMer: string;
  parking: string;
}

async function seedFixtures(): Promise<Ids> {
  const user = await ctx.prisma.user.create({
    data: { email: "owner-a13@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const pro = await ctx.prisma.proProfile.create({
    data: { userId: user.id, businessName: "Propriétaire A13", phone: "+213550000011" }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const city = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  // sortOrder VOLONTAIREMENT non alphabétique : c'est ce que l'API doit rendre.
  const royal = await ctx.prisma.venueStyle.create({
    data: { key: "royal", nameFr: "Royal", nameAr: "ملكي", sortOrder: 1 }
  });
  const jardin = await ctx.prisma.venueStyle.create({
    data: { key: "jardin", nameFr: "Jardin", nameAr: "حديقة", sortOrder: 2 }
  });
  const bordDeMer = await ctx.prisma.venueStyle.create({
    data: { key: "bord-de-mer", nameFr: "Bord de mer", nameAr: "على البحر", sortOrder: 3 }
  });
  const parking = await ctx.prisma.amenity.create({
    data: { key: "parking", nameFr: "Parking privé", nameAr: "موقف", icon: "square-parking" }
  });
  return {
    ownerId: pro.id,
    cityId: city.id,
    royal: royal.id,
    jardin: jardin.id,
    bordDeMer: bordDeMer.id,
    parking: parking.id
  };
}

let seq = 0;
async function makeVenue(
  ids: Ids,
  over: {
    slug?: string;
    capacityMax?: number;
    ceremonyType?: "INDOOR" | "OUTDOOR" | "MIXED" | null;
    styleIds?: string[];
    amenityIds?: string[];
  } = {}
) {
  seq += 1;
  return ctx.prisma.venue.create({
    data: {
      ownerId: ids.ownerId,
      cityId: ids.cityId,
      slug: over.slug ?? `salle-a13-${seq}`,
      nameFr: `Salle ${seq}`,
      nameAr: `قاعة ${seq}`,
      capacityMax: over.capacityMax ?? 300,
      basePriceCents: 18_000_000,
      publicationStatus: "PUBLISHED",
      status: "ACTIVE",
      ceremonyType: over.ceremonyType ?? null,
      ...(over.styleIds ? { styles: { create: over.styleIds.map((styleId) => ({ styleId })) } } : {}),
      ...(over.amenityIds ? { amenities: { create: over.amenityIds.map((amenityId) => ({ amenityId })) } } : {})
    }
  });
}

const slugs = (body: { items: VenueSummaryDTO[] }) => body.items.map((v) => v.slug).sort();

beforeAll(async () => {
  ctx = await createTestApp();
});
afterAll(async () => {
  await ctx.app.close();
});
beforeEach(async () => {
  seq = 0;
  await truncateAll(ctx.prisma);
});

describe("GET /venue-styles — référentiel (D65)", () => {
  it("trié par sortOrder ÉDITORIAL, pas par libellé (« Royal » avant « Jardin »)", async () => {
    await seedFixtures();
    const res = await api().get("/api/v1/venue-styles").expect(200);
    const body = res.body as VenueStyleDTO[];

    expect(body.map((s) => s.key)).toEqual(["royal", "jardin", "bord-de-mer"]);
    // Un tri par nameFr aurait donné Bord de mer, Jardin, Royal — et un ordre
    // arabe encore différent. Le référentiel impose UN ordre aux deux langues.
    expect(body[0]?.nameAr).toBe("ملكي");
  });
});

describe("GET /venues?ceremonyType — filtre INCLUSIF, jamais une égalité (D66)", () => {
  it("« extérieur » rend AUSSI les salles mixtes", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "plein-air", ceremonyType: "OUTDOOR" });
    await makeVenue(ids, { slug: "les-deux", ceremonyType: "MIXED" });
    await makeVenue(ids, { slug: "en-salle", ceremonyType: "INDOOR" });

    const res = await api().get("/api/v1/venues?ceremonyType=outdoor").expect(200);
    expect(slugs(res.body)).toEqual(["les-deux", "plein-air"]);
  });

  it("« intérieur » rend aussi les mixtes — la règle est symétrique de ce côté", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "plein-air", ceremonyType: "OUTDOOR" });
    await makeVenue(ids, { slug: "les-deux", ceremonyType: "MIXED" });
    await makeVenue(ids, { slug: "en-salle", ceremonyType: "INDOOR" });

    const res = await api().get("/api/v1/venues?ceremonyType=indoor").expect(200);
    expect(slugs(res.body)).toEqual(["en-salle", "les-deux"]);
  });

  it("« mixte » ne rend QUE les mixtes — là, la demande porte sur les deux à la fois", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "plein-air", ceremonyType: "OUTDOOR" });
    await makeVenue(ids, { slug: "les-deux", ceremonyType: "MIXED" });

    const res = await api().get("/api/v1/venues?ceremonyType=mixed").expect(200);
    expect(slugs(res.body)).toEqual(["les-deux"]);
  });

  it("une salle qui n'a RIEN déclaré ne répond à aucun filtre de type", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "muette", ceremonyType: null });

    for (const value of ["indoor", "outdoor", "mixed"]) {
      const res = await api().get(`/api/v1/venues?ceremonyType=${value}`).expect(200);
      expect(res.body.items).toHaveLength(0);
    }
    // …mais elle reste visible SANS filtre : ne pas avoir répondu à la question
    // ne la retire pas du catalogue.
    const all = await api().get("/api/v1/venues").expect(200);
    expect(slugs(all.body)).toEqual(["muette"]);
  });
});

describe("GET /venues?styles — sémantique OU (D65)", () => {
  it("deux clés cochées : l'UNION, pas l'intersection", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "au-jardin", styleIds: [ids.jardin] });
    await makeVenue(ids, { slug: "sur-la-mer", styleIds: [ids.bordDeMer] });
    await makeVenue(ids, { slug: "palais", styleIds: [ids.royal] });

    const res = await api().get("/api/v1/venues?styles=jardin,bord-de-mer").expect(200);
    expect(slugs(res.body)).toEqual(["au-jardin", "sur-la-mer"]);
  });

  it("une salle à DEUX styles sort une seule fois", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "jardin-et-mer", styleIds: [ids.jardin, ids.bordDeMer] });

    const res = await api().get("/api/v1/venues?styles=jardin,bord-de-mer").expect(200);
    expect(res.body.items).toHaveLength(1);
    expect(res.body.total).toBe(1);
  });

  it("styles en OU et équipements en ET dans la MÊME requête", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "jardin-parking", styleIds: [ids.jardin], amenityIds: [ids.parking] });
    await makeVenue(ids, { slug: "jardin-nu", styleIds: [ids.jardin] });

    const res = await api().get("/api/v1/venues?styles=jardin,royal&amenities=parking").expect(200);
    expect(slugs(res.body)).toEqual(["jardin-parking"]);
  });

  it("une clé INCONNUE ne rend rien — et ne lève pas (sémantique A3 des filtres)", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "au-jardin", styleIds: [ids.jardin] });

    const res = await api().get("/api/v1/venues?styles=chalet-suisse").expect(200);
    expect(res.body.items).toHaveLength(0);
  });
});

describe("GET /venues — les deux poignées de capacité (D68)", () => {
  it("plancher ET plafond s'appliquent ENSEMBLE sur la même colonne", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "petite", capacityMax: 60 });
    await makeVenue(ids, { slug: "moyenne", capacityMax: 300 });
    await makeVenue(ids, { slug: "immense", capacityMax: 900 });

    const res = await api().get("/api/v1/venues?guests=100&maxCapacity=500").expect(200);
    // Si les deux bornes n'étaient pas fusionnées en un seul objet, la seconde
    // écraserait la première : « petite » réapparaîtrait.
    expect(slugs(res.body)).toEqual(["moyenne"]);
  });

  it("les bornes sont INCLUSIVES aux deux extrémités", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "pile-en-bas", capacityMax: 100 });
    await makeVenue(ids, { slug: "pile-en-haut", capacityMax: 500 });

    const res = await api().get("/api/v1/venues?guests=100&maxCapacity=500").expect(200);
    expect(slugs(res.body)).toEqual(["pile-en-bas", "pile-en-haut"]);
  });

  it("plafond OMIS : la grande salle revient (c'est ce que fera la poignée au maximum)", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "immense", capacityMax: 900 });

    expect((await api().get("/api/v1/venues?guests=100&maxCapacity=500").expect(200)).body.items).toHaveLength(0);
    expect((await api().get("/api/v1/venues?guests=100").expect(200)).body.items).toHaveLength(1);
  });

  it("plage inversée : 400 avec la clé i18n, pas une liste vide", async () => {
    await seedFixtures();
    const res = await api().get("/api/v1/venues?guests=500&maxCapacity=20").expect(400);
    expect(JSON.stringify(res.body)).toContain("venue.validation.capacityRangeInvalid");
  });
});

describe("Détail public et écriture pro (D65, D66)", () => {
  it("le détail rend les styles dans l'ordre éditorial + le type de cérémonie", async () => {
    const ids = await seedFixtures();
    // Créés dans l'ordre INVERSE de l'affichage attendu : c'est le tri en base
    // qui doit trancher, pas l'ordre d'insertion.
    await makeVenue(ids, { slug: "complete", ceremonyType: "MIXED", styleIds: [ids.bordDeMer, ids.royal] });

    const res = await api().get("/api/v1/venues/complete").expect(200);
    const body = res.body as VenuePublicDTO;
    expect(body.styles.map((s) => s.key)).toEqual(["royal", "bord-de-mer"]);
    expect(body.ceremonyType).toBe("MIXED");
  });

  it("PATCH pro : remplacement d'ensemble des styles + type, et un id inconnu → 400", async () => {
    const ids = await seedFixtures();
    const venue = await makeVenue(ids, { slug: "a-moi", styleIds: [ids.royal] });

    // Le propriétaire de la salle doit être le pro connecté : on rattache le
    // ProProfile du compte créé par l'API à la salle du fixture.
    await registerUser(ctx, {
      role: "PRO",
      email: "pro-a13@example.dz",
      password: "Motdepasse1",
      businessName: "Salles A13",
      phone: "+213550000012"
    });
    await verifyLastRegistered(ctx);
    const token = await loginAs(ctx, "pro-a13@example.dz", "Motdepasse1");
    const profile = await ctx.prisma.proProfile.findFirstOrThrow({ where: { user: { email: "pro-a13@example.dz" } } });
    await ctx.prisma.venue.update({ where: { id: venue.id }, data: { ownerId: profile.id } });

    const ok = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ styleIds: [ids.jardin, ids.bordDeMer], ceremonyType: "OUTDOOR" })
      .expect(200);
    expect(ok.body.styleIds).toHaveLength(2);
    expect(ok.body.styleIds).not.toContain(ids.royal); // remplacement, pas ajout
    expect(ok.body.ceremonyType).toBe("OUTDOOR");

    // `null` efface explicitement.
    const cleared = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ ceremonyType: null })
      .expect(200);
    expect(cleared.body.ceremonyType).toBeNull();

    // Un id absent du référentiel est refusé AVANT l'écriture : 400, pas une
    // violation de clé étrangère en 500.
    const bad = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set("Authorization", `Bearer ${token}`)
      .send({ styleIds: ["11111111-1111-1111-1111-111111111111"] })
      .expect(400);
    expect(JSON.stringify(bad.body)).toContain("VENUE_STYLE_NOT_FOUND");

    // …et les styles précédents sont INTACTS (rien n'a été supprimé au passage).
    const after = await api().get("/api/v1/venues/a-moi").expect(200);
    expect((after.body as VenuePublicDTO).styles.map((s) => s.key)).toEqual(["jardin", "bord-de-mer"]);
  });
});
