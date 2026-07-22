// Intégration Lot A3 — lecture PUBLIQUE (@Public()) sur base réelle. Cœur du
// test : la matrice de visibilité D33 sur cinq salles dans les cinq états, et
// la garantie qu'aucun taux ne fuit dans une réponse publique. Filtres,
// pagination et tris sont éprouvés sur des données réelles (pas des mocks).
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenuePublicDTO, VenueSummaryDTO } from "@zwadj/types";
import { createTestApp, truncateAll, type TestContext } from "./helpers";

let ctx: TestContext;
const api = () => request(ctx.app.getHttpServer());

interface Ids {
  ownerId: string;
  cityHydra: string;
  cityCheraga: string;
  parking: string;
  wifi: string;
  climatisation: string;
}

/** Un ProProfile support + géo + trois amenities, en direct (les écritures pro
 *  sont déjà couvertes ailleurs — ici on prépare le terrain de lecture). */
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
  const climatisation = await ctx.prisma.amenity.create({
    data: { key: "climatisation", nameFr: "Climatisation", nameAr: "تكييف", icon: "snowflake" }
  });
  return {
    ownerId: proProfile.id,
    cityHydra: hydra.id,
    cityCheraga: cheraga.id,
    parking: parking.id,
    wifi: wifi.id,
    climatisation: climatisation.id
  };
}

let seq = 0;
/** Crée une salle directement en base avec un état complet maîtrisé. */
async function makeVenue(
  ids: Ids,
  over: {
    slug?: string;
    publicationStatus?: string;
    status?: string;
    deletedAt?: Date | null;
    cityId?: string;
    basePriceCents?: number;
    capacityMin?: number;
    capacityMax?: number;
    amenityIds?: string[];
    updatedAt?: Date;
  } = {}
) {
  seq += 1;
  const venue = await ctx.prisma.venue.create({
    data: {
      ownerId: ids.ownerId,
      cityId: over.cityId ?? ids.cityHydra,
      slug: over.slug ?? `salle-${seq}`,
      nameFr: `Salle ${seq}`,
      nameAr: `قاعة ${seq}`,
      taglineFr: "Belle salle",
      taglineAr: "قاعة جميلة",
      capacityMin: over.capacityMin ?? 100,
      capacityMax: over.capacityMax ?? 450,
      basePriceCents: over.basePriceCents ?? 18_000_000,
      publicationStatus: (over.publicationStatus ?? "PUBLISHED") as never,
      status: (over.status ?? "ACTIVE") as never,
      deletedAt: over.deletedAt ?? null,
      ...(over.amenityIds ? { amenities: { create: over.amenityIds.map((amenityId) => ({ amenityId })) } } : {})
    }
  });
  if (over.updatedAt) {
    await ctx.prisma.venue.update({ where: { id: venue.id }, data: { updatedAt: over.updatedAt } });
  }
  return venue;
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

describe("GET /venues — matrice de visibilité D33 (liste = ACTIVE seul)", () => {
  it("cinq états, une seule salle visible : PUBLISHED+ACTIVE+vivante", async () => {
    const ids = await seedFixtures();
    const visible = await makeVenue(ids, { slug: "la-bonne", publicationStatus: "PUBLISHED", status: "ACTIVE" });
    await makeVenue(ids, { slug: "brouillon", publicationStatus: "DRAFT", status: "ACTIVE" });
    await makeVenue(ids, { slug: "masquee", publicationStatus: "PUBLISHED", status: "HIDDEN" });
    await makeVenue(ids, { slug: "indispo", publicationStatus: "PUBLISHED", status: "TEMPORARILY_UNAVAILABLE" });
    await makeVenue(ids, { slug: "supprimee", publicationStatus: "PUBLISHED", status: "ACTIVE", deletedAt: new Date() });

    const res = await api().get("/api/v1/venues").expect(200);
    expect(res.body.total).toBe(1);
    expect(res.body.items).toHaveLength(1);
    expect((res.body.items[0] as VenueSummaryDTO).slug).toBe("la-bonne");
    expect((res.body.items[0] as VenueSummaryDTO).id).toBe(visible.id);
  });

  it("aucune clé de taux (commission/cashback) ni GPS dans les cartes de la liste", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, {});
    const card = (await api().get("/api/v1/venues").expect(200)).body.items[0] as Record<string, unknown>;

    expect(Object.keys(card).sort()).toEqual(
      [
        "id",
        "slug",
        "cityId",
        "nameFr",
        "nameAr",
        "taglineFr",
        "taglineAr",
        "districtFr",
        "districtAr",
        "capacityMin",
        "capacityMax",
        "basePriceCents",
        "bookingMode",
        "publicationStatus",
        "coverThumbUrl", // Lot A4 — couverture (thumb de la 1ʳᵉ photo)
        "photoCount" // Lot A4 — signal « complétude »
      ].sort()
    );
    for (const forbidden of ["commissionRateBps", "cashbackRateBps", "lat", "lng"]) {
      expect(card).not.toHaveProperty(forbidden);
    }
  });
});

describe("GET /venues — filtres, tris, pagination", () => {
  it("ville, invités (bornes), fourchette de prix, amenities en ET (toutes requises)", async () => {
    const ids = await seedFixtures();
    // Cible : Hydra, capacité 100–450, prix 18M, parking+wifi.
    const target = await makeVenue(ids, {
      slug: "cible",
      cityId: ids.cityHydra,
      basePriceCents: 18_000_000,
      capacityMin: 100,
      capacityMax: 450,
      amenityIds: [ids.parking, ids.wifi]
    });
    await makeVenue(ids, { slug: "autre-ville", cityId: ids.cityCheraga, amenityIds: [ids.parking, ids.wifi] });
    await makeVenue(ids, { slug: "trop-petite", cityId: ids.cityHydra, capacityMin: 10, capacityMax: 80, amenityIds: [ids.parking, ids.wifi] });
    await makeVenue(ids, { slug: "trop-chere", cityId: ids.cityHydra, basePriceCents: 90_000_000, amenityIds: [ids.parking, ids.wifi] });
    await makeVenue(ids, { slug: "un-seul-amenity", cityId: ids.cityHydra, amenityIds: [ids.parking] });

    const res = await api()
      .get("/api/v1/venues")
      .query({ cityId: ids.cityHydra, guests: 250, minPriceCents: 10_000_000, maxPriceCents: 30_000_000, amenities: "parking,wifi" })
      .expect(200);

    expect(res.body.total).toBe(1);
    expect((res.body.items[0] as VenueSummaryDTO).id).toBe(target.id);
  });

  it("valeur de filtre inconnue (ville sans salle, clé d'amenity inexistante) : liste vide, pas d'erreur", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { amenityIds: [ids.parking] });

    expect((await api().get("/api/v1/venues").query({ cityId: "018f0000-0000-7000-8000-0000000000ff" }).expect(200)).body.total).toBe(0);
    expect((await api().get("/api/v1/venues").query({ amenities: "inexistante" }).expect(200)).body.total).toBe(0);
  });

  it("tri prix asc/desc, et recent (updatedAt desc) par défaut", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "chere", basePriceCents: 30_000_000, updatedAt: new Date("2026-07-01T00:00:00Z") });
    await makeVenue(ids, { slug: "eco", basePriceCents: 10_000_000, updatedAt: new Date("2026-07-10T00:00:00Z") });
    await makeVenue(ids, { slug: "moyenne", basePriceCents: 20_000_000, updatedAt: new Date("2026-07-20T00:00:00Z") });

    const asc = await api().get("/api/v1/venues").query({ sort: "price_asc" }).expect(200);
    expect(asc.body.items.map((v: VenueSummaryDTO) => v.basePriceCents)).toEqual([10_000_000, 20_000_000, 30_000_000]);

    const desc = await api().get("/api/v1/venues").query({ sort: "price_desc" }).expect(200);
    expect(desc.body.items.map((v: VenueSummaryDTO) => v.basePriceCents)).toEqual([30_000_000, 20_000_000, 10_000_000]);

    // Défaut = recent : la plus récemment mise à jour en tête.
    const recent = await api().get("/api/v1/venues").expect(200);
    expect(recent.body.items.map((v: VenueSummaryDTO) => v.slug)).toEqual(["moyenne", "eco", "chere"]);
  });

  it("pagination offset : total global, fenêtre par page, bornes Zod (pageSize > 50 → 400)", async () => {
    const ids = await seedFixtures();
    for (let i = 0; i < 5; i += 1) {
      await makeVenue(ids, { slug: `p-${i}`, basePriceCents: 10_000_000 + i, updatedAt: new Date(`2026-07-0${i + 1}T00:00:00Z`) });
    }
    const page1 = await api().get("/api/v1/venues").query({ sort: "price_asc", page: 1, pageSize: 2 }).expect(200);
    expect([page1.body.total, page1.body.page, page1.body.pageSize, page1.body.items.length]).toEqual([5, 1, 2, 2]);

    const page3 = await api().get("/api/v1/venues").query({ sort: "price_asc", page: 3, pageSize: 2 }).expect(200);
    expect(page3.body.items.length).toBe(1); // 5 = 2 + 2 + 1

    await api().get("/api/v1/venues").query({ pageSize: 51 }).expect(400);
    await api().get("/api/v1/venues").query({ page: 0 }).expect(400);
  });

  it("clé de querystring inconnue (utm_source, fbclid) ignorée — pas de 400 (URL marketing)", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, {});
    await api().get("/api/v1/venues").query({ utm_source: "instagram", fbclid: "xyz" }).expect(200);
  });
});

describe("GET /venues/:slug — détail public (D33 : ACTIVE + TEMPORARILY_UNAVAILABLE)", () => {
  it("visible pour ACTIVE et TEMPORARILY_UNAVAILABLE (status présent pour le bandeau) ; 404 pour les autres", async () => {
    const ids = await seedFixtures();
    await makeVenue(ids, { slug: "active", publicationStatus: "PUBLISHED", status: "ACTIVE" });
    await makeVenue(ids, { slug: "indispo", publicationStatus: "PUBLISHED", status: "TEMPORARILY_UNAVAILABLE" });
    await makeVenue(ids, { slug: "masquee", publicationStatus: "PUBLISHED", status: "HIDDEN" });
    await makeVenue(ids, { slug: "brouillon", publicationStatus: "DRAFT", status: "ACTIVE" });
    await makeVenue(ids, { slug: "supprimee", publicationStatus: "PUBLISHED", status: "ACTIVE", deletedAt: new Date() });

    const active = await api().get("/api/v1/venues/active").expect(200);
    expect((active.body as VenuePublicDTO).status).toBe("ACTIVE");

    const indispo = await api().get("/api/v1/venues/indispo").expect(200);
    expect((indispo.body as VenuePublicDTO).status).toBe("TEMPORARILY_UNAVAILABLE"); // bandeau A8

    for (const slug of ["masquee", "brouillon", "supprimee", "slug-inexistant"]) {
      const res = await api().get(`/api/v1/venues/${slug}`);
      expect(res.status).toBe(404);
      expect(res.body.message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });
    }
  });

  it("slug hors motif (majuscule, espace encodé, underscore) : 404 indistinct", async () => {
    await seedFixtures();
    for (const bad of ["Majuscule", "avec%20espace", "sous_tiret"]) {
      await api().get(`/api/v1/venues/${bad}`).expect(404);
    }
  });

  it("charge la ville imbriquée et les amenities triées par nameFr ; aucun taux, publicationStatus absent", async () => {
    const ids = await seedFixtures();
    // Ordre d'insertion volontairement non alphabétique : wifi, climatisation, parking.
    await makeVenue(ids, { slug: "complete", cityId: ids.cityHydra, amenityIds: [ids.wifi, ids.climatisation, ids.parking] });

    const dto = (await api().get("/api/v1/venues/complete").expect(200)).body as VenuePublicDTO & Record<string, unknown>;

    expect(dto.city).toEqual({ id: ids.cityHydra, nameFr: "Hydra", nameAr: "حيدرة" });
    expect(dto.amenities.map((a) => a.nameFr)).toEqual(["Climatisation", "Parking privé", "Wifi"]); // tri fr
    expect(dto.amenities[0]).toEqual(
      expect.objectContaining({ key: "climatisation", nameFr: "Climatisation", icon: "snowflake" })
    );
    for (const forbidden of ["commissionRateBps", "cashbackRateBps", "publicationStatus", "ownerId"]) {
      expect(dto).not.toHaveProperty(forbidden);
    }
  });
});
