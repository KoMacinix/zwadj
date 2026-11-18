// Intégration CA-1 (session « carte ») — GET /api/v1/venue-map sur base réelle.
// LA chose à prouver : pour une même requête, la carte et la liste parlent des
// MÊMES salles. Le test ne recopie aucun filtre : il lit la liste (toutes ses
// pages), lit la carte, et confronte les identifiants.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import { VENUE_MAP_MAX_POINTS, type VenueListResponse, type VenueMapPointDTO, type VenueMapResponse } from "@zwadj/types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer());

interface Ids {
  ownerId: string;
  cityHydra: string;
  cityCheraga: string;
  parking: string;
  wifi: string;
}

async function seedFixtures(): Promise<Ids> {
  const user = await ctx.prisma.user.create({
    data: { email: "owner@example.dz", passwordHash: "x", role: "PRO", emailVerifiedAt: new Date() }
  });
  const proProfile = await ctx.prisma.proProfile.create({
    data: { userId: user.id, businessName: "Propriétaire", phone: "+213550000010" }
  });
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const hydra = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const cheraga = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Chéraga", nameAr: "الشراقة", lat: 36.7669, lng: 2.9586 }
  });
  const parking = await ctx.prisma.amenity.create({
    data: { key: "parking", nameFr: "Parking privé", nameAr: "موقف", icon: "square-parking" }
  });
  const wifi = await ctx.prisma.amenity.create({ data: { key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" } });
  return { ownerId: proProfile.id, cityHydra: hydra.id, cityCheraga: cheraga.id, parking: parking.id, wifi: wifi.id };
}

let seq = 0;
async function makeVenue(
  ids: Ids,
  over: {
    slug?: string;
    publicationStatus?: string;
    status?: string;
    deletedAt?: Date | null;
    cityId?: string;
    basePriceCents?: number;
    capacityMax?: number;
    amenityIds?: string[];
    lat?: number | null;
    lng?: number | null;
  } = {}
) {
  seq += 1;
  return ctx.prisma.venue.create({
    data: {
      ownerId: ids.ownerId,
      cityId: over.cityId ?? ids.cityHydra,
      slug: over.slug ?? `salle-${seq}`,
      nameFr: `Salle ${seq}`,
      nameAr: `قاعة ${seq}`,
      capacityMax: over.capacityMax ?? 450,
      basePriceCents: over.basePriceCents ?? 18_000_000,
      publicationStatus: (over.publicationStatus ?? "PUBLISHED") as never,
      status: (over.status ?? "ACTIVE") as never,
      deletedAt: over.deletedAt ?? null,
      // ⚠ `undefined` ≠ `null` : sans précision la salle EST située (le cas courant
      // de ces tests) ; `null` la laisse sans coordonnée.
      lat: over.lat === undefined ? 36.75 + seq / 1000 : over.lat,
      lng: over.lng === undefined ? 3.04 + seq / 1000 : over.lng,
      ...(over.amenityIds ? { amenities: { create: over.amenityIds.map((amenityId) => ({ amenityId })) } } : {})
    }
  });
}

/** TOUS les identifiants de la liste pour cette requête, page après page. */
async function idsDeLaListe(query: string): Promise<{ ids: string[]; total: number }> {
  const ids: string[] = [];
  let total = 0;
  for (let page = 1; page < 50; page += 1) {
    const res = await api().get(`/api/v1/venues?${query}${query ? "&" : ""}pageSize=50&page=${page}`);
    expect(res.status).toBe(200);
    const body = res.body as VenueListResponse;
    total = body.total;
    ids.push(...body.items.map((v) => v.id));
    if (ids.length >= total || body.items.length === 0) break;
  }
  return { ids, total };
}

async function carte(query: string): Promise<VenueMapResponse> {
  const res = await api().get(`/api/v1/venue-map${query ? `?${query}` : ""}`);
  expect(res.status).toBe(200);
  return res.body as VenueMapResponse;
}

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

describe("GET /venue-map — la carte et la liste parlent des mêmes salles", () => {
  it("⛔ pour CHAQUE requête : les points sont les salles de la liste qui ont des coordonnées, et le reste est COMPTÉ", async () => {
    const ids = await seedFixtures();
    // Situées, de profils différents pour que chaque filtre en retienne et en écarte.
    await makeVenue(ids, { basePriceCents: 10_000_000, capacityMax: 200, amenityIds: [ids.parking] });
    await makeVenue(ids, { basePriceCents: 20_000_000, capacityMax: 450, amenityIds: [ids.parking, ids.wifi] });
    await makeVenue(ids, { basePriceCents: 30_000_000, capacityMax: 800, cityId: ids.cityCheraga });
    // Sans coordonnées, ou avec UNE seule : dans la liste, pas sur la carte.
    const sansCoordonnees = await makeVenue(ids, { lat: null, lng: null, amenityIds: [ids.parking] });
    const latitudeSeule = await makeVenue(ids, { lng: null });
    const longitudeSeule = await makeVenue(ids, { lat: null, cityId: ids.cityCheraga });
    // Situées mais NON publiques : ni dans la liste, ni sur la carte.
    await makeVenue(ids, { publicationStatus: "DRAFT" });
    await makeVenue(ids, { status: "HIDDEN" });
    await makeVenue(ids, { status: "TEMPORARILY_UNAVAILABLE" });
    await makeVenue(ids, { deletedAt: new Date() });

    const nonSituees = new Set([sansCoordonnees.id, latitudeSeule.id, longitudeSeule.id]);
    const requetes = [
      "",
      `cityId=${ids.cityHydra}`,
      `cityId=${ids.cityCheraga}`,
      "guests=300",
      "maxCapacity=450",
      "minPriceCents=15000000",
      "maxPriceCents=20000000",
      "amenities=parking",
      "amenities=parking,wifi",
      "sort=price_desc",
      `cityId=${ids.cityHydra}&guests=300&amenities=parking`
    ];

    let comparees = 0;
    for (const query of requetes) {
      const liste = await idsDeLaListe(query);
      const reponse = await carte(query);
      const attendus = liste.ids.filter((id) => !nonSituees.has(id)).sort();
      expect(reponse.points.map((p) => p.id).sort(), `points pour « ${query} »`).toEqual(attendus);
      expect(reponse.total, `total pour « ${query} »`).toBe(liste.total);
      expect(reponse.withoutCoordinates, `sans coordonnées pour « ${query} »`).toBe(liste.total - attendus.length);
      expect(reponse.truncated).toBe(false);
      comparees += 1;
    }
    // Un compteur dit ce qu'il a parcouru : onze requêtes, dont la première rend six salles.
    expect(comparees).toBe(requetes.length);
    const tout = await idsDeLaListe("");
    expect(tout.total).toBe(6);
    expect((await carte("")).points).toHaveLength(3);
  });

  it("l'ordre des points est celui de la liste (le tri décide quels points restent si le plafond tronque)", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { basePriceCents: 30_000_000 });
    await makeVenue(ids, { basePriceCents: 10_000_000 });
    await makeVenue(ids, { basePriceCents: 20_000_000 });
    const liste = await idsDeLaListe("sort=price_asc");
    expect((await carte("sort=price_asc")).points.map((p) => p.id)).toEqual(liste.ids);
  });

  it("⛔ un point ne porte QUE les champs du contrat : ni taux, ni adresse, ni propriétaire", async () => {
    const ids = await seedFixtures();
    const salle = await makeVenue(ids, { lat: 36.745312, lng: 3.031987 });
    const reponse = await carte("");
    expect(Object.keys(reponse).sort()).toEqual(
      ["availableOn", "limit", "points", "total", "truncated", "withoutCoordinates"].sort()
    );
    const point = reponse.points[0] as VenueMapPointDTO;
    expect(Object.keys(point).sort()).toEqual(
      ["basePriceCents", "capacityMax", "coverThumbUrl", "id", "lat", "lng", "nameAr", "nameFr", "slug"].sort()
    );
    expect(point.id).toBe(salle.id);
    expect(point.slug).toBe(salle.slug);
    // Les coordonnées sortent en NOMBRES, à la précision de la colonne (9,6).
    expect(point.lat).toBe(36.745312);
    expect(point.lng).toBe(3.031987);
    expect(point.basePriceCents).toBe(salle.basePriceCents);
    expect(point.capacityMax).toBe(salle.capacityMax);
    expect(point.coverThumbUrl).toBeNull();
    expect(reponse.limit).toBe(VENUE_MAP_MAX_POINTS);
    expect(reponse.availableOn).toBeNull();
    expect(JSON.stringify(reponse)).not.toMatch(/commission|cashback|ownerId|address/i);
  });

  it("`page` et `pageSize` ne découpent pas la carte : tous les points, quelle que soit la page demandée", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids);
    await makeVenue(ids);
    await makeVenue(ids);
    expect((await carte("page=3&pageSize=1")).points).toHaveLength(3);
  });

  it("⛔ une salle située de plus que le plafond : les points s'arrêtent au plafond et la réponse le DIT", async () => {
    const ids = await seedFixtures();
    await ctx.prisma.venue.createMany({
      data: Array.from({ length: VENUE_MAP_MAX_POINTS + 1 }, (_, i) => ({
        ownerId: ids.ownerId,
        cityId: ids.cityHydra,
        slug: `plafond-${i}`,
        nameFr: `Plafond ${i}`,
        nameAr: `سقف ${i}`,
        capacityMax: 100,
        basePriceCents: 1_000_000 + i,
        publicationStatus: "PUBLISHED" as never,
        status: "ACTIVE" as never,
        lat: 36.7,
        lng: 3.05
      }))
    });
    const reponse = await carte("sort=price_asc");
    expect(reponse.total).toBe(VENUE_MAP_MAX_POINTS + 1);
    expect(reponse.points).toHaveLength(VENUE_MAP_MAX_POINTS);
    expect(reponse.truncated).toBe(true);
    expect(reponse.withoutCoordinates).toBe(0);
  });
});

describe("GET /venue-map — ce que la route refuse, et ce qu'elle ne masque pas", () => {
  it("route PUBLIQUE : aucune session n'est demandée", async () => {
    const res = await api().get("/api/v1/venue-map");
    expect(res.status).toBe(200);
    expect(res.body.points).toEqual([]);
    expect(res.body.total).toBe(0);
  });

  it("une date passée est refusée avec le code de la liste (400 AVAILABLE_ON_PAST), pas rendue vide", async () => {
    const res = await api().get("/api/v1/venue-map?availableOn=2020-01-01");
    expect(res.status).toBe(400);
    expect((res.body as { message?: { code?: string } }).message?.code).toBe("AVAILABLE_ON_PAST");
  });

  it("un filtre mal formé est un 400, comme pour la liste (même schéma)", async () => {
    const mal = "guests=abc";
    expect((await api().get(`/api/v1/venues?${mal}`)).status).toBe(400);
    expect((await api().get(`/api/v1/venue-map?${mal}`)).status).toBe(400);
  });

  it("⛔ la route de carte ne MASQUE aucune fiche : une salle dont le slug est « map » reste lisible", async () => {
    const ids = await seedFixtures();
    const salle = await makeVenue(ids, { slug: "map" });
    const res = await api().get("/api/v1/venues/map");
    expect(res.status).toBe(200);
    expect((res.body as { id?: string }).id).toBe(salle.id);
  });
});
