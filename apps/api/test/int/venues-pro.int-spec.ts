// Intégration Lot A2 : CRUD Venue côté PRO sur base PostgreSQL réelle
// (schéma = migrations committées, dont venue_status_lifecycle). Tout passe
// par les VRAIES routes — sessions obtenues via register/verify/login réels.
// Doctrine vérifiée de bout en bout : 404 INDISTINCTS (inexistante, supprimée,
// id malformé, salle d'un autre pro), commissionRateBps jamais dans une
// réponse pro (mais défaut 100 EN BASE), PATCH partiel réel (arbitrage A2-③).
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { VenueProDTO } from "@zwadj/types";
import { createTestApp, loginAs, registerUser, truncateAll, verifyLastRegistered, type TestContext } from "./helpers";

let ctx: TestContext;

const PRO_A = {
  role: "PRO",
  email: "pro-a@example.dz",
  password: "Motdepasse1",
  businessName: "Salles A",
  phone: "+213550000001"
};
const PRO_B = {
  role: "PRO",
  email: "pro-b@example.dz",
  password: "Motdepasse1",
  businessName: "Salles B",
  phone: "+213550000002"
};
const CLIENT = {
  role: "CLIENT",
  email: "aya@example.dz",
  password: "Motdepasse1",
  firstName: "Aya",
  lastName: "Boudiaf"
};

/** Session PRO complète via les vraies routes (D1 : PRO doit être vérifié). */
async function proSession(account: typeof PRO_A): Promise<string> {
  await registerUser(ctx, account);
  await verifyLastRegistered(ctx);
  return loginAs(ctx, account.email, account.password);
}

/** Référentiel géo minimal, créé directement (le seed complet est prouvé par
 *  la spec A1 — ici on ne teste que les salles). */
async function seedGeo(): Promise<{ cityA: string; cityB: string }> {
  const wilaya = await ctx.prisma.wilaya.create({ data: { code: 16, nameFr: "Alger", nameAr: "الجزائر" } });
  const hydra = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 }
  });
  const cheraga = await ctx.prisma.city.create({
    data: { wilayaId: wilaya.id, nameFr: "Chéraga", nameAr: "الشراقة", lat: 36.7669, lng: 2.9586 }
  });
  return { cityA: hydra.id, cityB: cheraga.id };
}

function payload(cityId: string, overrides: Record<string, unknown> = {}) {
  return {
    cityId,
    nameFr: "Salle El Ferdous",
    nameAr: "قاعة الفردوس",
    taglineFr: "La plus belle vue d'Alger",
    address: "12 rue des Frères Boudjemaa",
    lat: 36.7453,
    lng: 3.0319,
    capacityMin: 100,
    capacityMax: 450,
    basePriceCents: 18_000_000, // 180 000 DA — argent en centimes entiers
    ...overrides
  };
}

const api = () => request(ctx.app.getHttpServer());
const auth = (token: string) => ({ Authorization: `Bearer ${token}` });

async function createVenue(token: string, cityId: string, overrides: Record<string, unknown> = {}): Promise<VenueProDTO> {
  const res = await api().post("/api/v1/venues").set(auth(token)).send(payload(cityId, overrides));
  if (res.status !== 201) throw new Error(`création de test a échoué (${res.status}) : ${JSON.stringify(res.body)}`);
  return res.body as VenueProDTO;
}

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("Accès (guards globaux)", () => {
  it("POST /venues et GET /pro/venues anonymes : 401 UNAUTHENTICATED", async () => {
    const { cityA } = await seedGeo();
    const post = await api().post("/api/v1/venues").send(payload(cityA));
    expect(post.status).toBe(401);
    expect(post.body.message).toEqual({ code: "UNAUTHENTICATED", message: "auth.errors.unauthenticated" });

    const list = await api().get("/api/v1/pro/venues");
    expect(list.status).toBe(401);
  });

  it("CLIENT puis ADMIN sur POST /venues : 403 FORBIDDEN (rôle PRO exigé — l'admin a ses endpoints en A3)", async () => {
    const { cityA } = await seedGeo();
    await registerUser(ctx, CLIENT);
    const clientToken = await loginAs(ctx, CLIENT.email, CLIENT.password);
    const asClient = await api().post("/api/v1/venues").set(auth(clientToken)).send(payload(cityA));
    expect(asClient.status).toBe(403);
    expect(asClient.body.message).toEqual({ code: "FORBIDDEN", message: "auth.errors.forbidden" });

    await ctx.prisma.user.update({
      where: { email: CLIENT.email },
      data: { role: "ADMIN", emailVerifiedAt: new Date() } // D1 : ADMIN vérifié pour se connecter
    });
    const adminToken = await loginAs(ctx, CLIENT.email, CLIENT.password);
    const asAdmin = await api().post("/api/v1/venues").set(auth(adminToken)).send(payload(cityA));
    expect(asAdmin.status).toBe(403);
  });
});

describe("POST /venues — création", () => {
  it("201 : DRAFT + ACTIVE, slug figé généré, clés EXACTES du DTO pro ; défauts admin EN BASE seulement", async () => {
    const { cityA } = await seedGeo();
    const token = await proSession(PRO_A);

    const res = await api().post("/api/v1/venues").set(auth(token)).send(payload(cityA));
    expect(res.status).toBe(201);
    const dto = res.body as VenueProDTO;

    expect(dto.slug).toBe("salle-el-ferdous");
    expect(dto.publicationStatus).toBe("DRAFT"); // la publication est un acte admin (A3)
    expect(dto.status).toBe("ACTIVE"); // D33 : défaut
    expect(dto.bookingMode).toBe("SINGLE_SLOT"); // cadrage : défaut single
    expect(dto.lat).toBe(36.7453);
    expect(typeof dto.createdAt).toBe("string");

    // La preuve « jamais exposé au pro » : les clés EXACTES, rien de plus.
    expect(Object.keys(dto).sort()).toEqual(
      [
        "id",
        "slug",
        "cityId",
        "nameFr",
        "nameAr",
        "taglineFr",
        "taglineAr",
        "descriptionFr",
        "descriptionAr",
        "districtFr",
        "districtAr",
        "address",
        "lat",
        "lng",
        "capacityMin",
        "capacityMax",
        "basePriceCents",
        "bookingMode",
        "publicationStatus",
        "status",
        "amenityIds",
        "createdAt",
        "updatedAt"
      ].sort()
    );

    // …mais les défauts pilotés par l'admin existent bien EN BASE.
    const row = await ctx.prisma.venue.findUniqueOrThrow({ where: { id: dto.id } });
    expect(row.commissionRateBps).toBe(100);
    expect(row.deletedAt).toBeNull();
  });

  it("collision de slug (y compris entre pros différents) : suffixes -2 puis -3", async () => {
    const { cityA } = await seedGeo();
    const tokenA = await proSession(PRO_A);
    const tokenB = await proSession(PRO_B);

    const first = await createVenue(tokenA, cityA);
    const second = await createVenue(tokenA, cityA);
    const third = await createVenue(tokenB, cityA);

    expect([first.slug, second.slug, third.slug]).toEqual([
      "salle-el-ferdous",
      "salle-el-ferdous-2",
      "salle-el-ferdous-3"
    ]);
  });

  it("400 Zod : capacités croisées, prix non positif, clé interdite (strict), lat sans lng", async () => {
    const { cityA } = await seedGeo();
    const token = await proSession(PRO_A);
    const issuePaths = async (overrides: Record<string, unknown>) => {
      const res = await api().post("/api/v1/venues").set(auth(token)).send(payload(cityA, overrides));
      expect(res.status).toBe(400);
      return (res.body.message as { issues: { path: string; message: string }[] }).issues.map((i) => i.path);
    };

    expect(await issuePaths({ capacityMin: 500 })).toContain("capacityMax"); // 500 > 450
    expect(await issuePaths({ basePriceCents: 0 })).toContain("basePriceCents");
    expect(await issuePaths({ commissionRateBps: 500 })).toEqual([""]); // .strict() → clé inconnue
    expect(await issuePaths({ lng: undefined })).toContain("lng"); // paire incomplète
  });

  it("400 CITY_NOT_FOUND : uuid bien formé mais ville inexistante", async () => {
    await seedGeo();
    const token = await proSession(PRO_A);
    const res = await api()
      .post("/api/v1/venues")
      .set(auth(token))
      .send(payload("018f0000-0000-7000-8000-0000000000ff"));
    expect(res.status).toBe(400);
    expect(res.body.message).toEqual({ code: "CITY_NOT_FOUND", message: "venue.errors.cityNotFound" });
  });
});

describe("Lectures pro — GET /pro/venues[/:id]", () => {
  it("isolation stricte : chaque pro ne voit QUE ses salles, tri updatedAt desc", async () => {
    const { cityA } = await seedGeo();
    const tokenA = await proSession(PRO_A);
    const tokenB = await proSession(PRO_B);

    const v1 = await createVenue(tokenA, cityA, { nameFr: "Salle Une", nameAr: "قاعة واحد" });
    const v2 = await createVenue(tokenA, cityA, { nameFr: "Salle Deux", nameAr: "قاعة اثنان" });
    await createVenue(tokenB, cityA, { nameFr: "Salle B", nameAr: "قاعة ب" });

    // Toucher v1 APRÈS la création de v2 : elle doit repasser en tête.
    await api().patch(`/api/v1/venues/${v1.id}`).set(auth(tokenA)).send({ taglineFr: "retouchée" }).expect(200);

    const res = await api().get("/api/v1/pro/venues").set(auth(tokenA)).expect(200);
    const mine = res.body as VenueProDTO[];
    expect(mine).toHaveLength(2);
    expect(mine.map((v) => v.id)).toEqual([v1.id, v2.id]);
  });

  it("404 INDISTINCTS sur le détail : salle d'un autre pro, id malformé, uuid inconnu — réponse identique", async () => {
    const { cityA } = await seedGeo();
    const tokenA = await proSession(PRO_A);
    const tokenB = await proSession(PRO_B);
    const ofB = await createVenue(tokenB, cityA);

    const bodies: unknown[] = [];
    for (const id of [ofB.id, "pas-un-uuid", "018f0000-0000-7000-8000-0000000000ff"]) {
      const res = await api().get(`/api/v1/pro/venues/${id}`).set(auth(tokenA));
      expect(res.status).toBe(404);
      bodies.push(res.body.message);
    }
    for (const message of bodies) {
      expect(message).toEqual({ code: "VENUE_NOT_FOUND", message: "venue.errors.notFound" });
    }
    // …et la mienne répond bien, par le même chemin.
    const mine = await createVenue(tokenA, cityA);
    await api().get(`/api/v1/pro/venues/${mine.id}`).set(auth(tokenA)).expect(200);
  });
});

describe("PATCH /venues/:id — mise à jour PARTIELLE réelle (A2-③) et D33", () => {
  it("{ status } SEUL bascule la visibilité, tout le reste inchangé ; réversible sur les trois états", async () => {
    const { cityA } = await seedGeo();
    const token = await proSession(PRO_A);
    const before = await createVenue(token, cityA);

    const res = await api().patch(`/api/v1/venues/${before.id}`).set(auth(token)).send({ status: "HIDDEN" });
    expect(res.status).toBe(200);
    const after = res.body as VenueProDTO;
    expect(after.status).toBe("HIDDEN");
    // Champ à champ : SEULS status et updatedAt ont bougé.
    const stable = ({ status: _status, updatedAt: _updatedAt, ...rest }: VenueProDTO) => rest;
    expect(stable(after)).toEqual(stable(before));

    for (const status of ["TEMPORARILY_UNAVAILABLE", "ACTIVE"]) {
      const step = await api().patch(`/api/v1/venues/${before.id}`).set(auth(token)).send({ status });
      expect(step.status).toBe(200);
      expect((step.body as VenueProDTO).status).toBe(status);
    }
  });

  it("renommer ne change JAMAIS le slug (figé) ; déménagement vers une ville existante OK, inexistante → 400", async () => {
    const { cityA, cityB } = await seedGeo();
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, cityA);

    const renamed = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set(auth(token))
      .send({ nameFr: "Nouveau Nom Éclatant" });
    expect(renamed.status).toBe(200);
    expect((renamed.body as VenueProDTO).nameFr).toBe("Nouveau Nom Éclatant");
    expect((renamed.body as VenueProDTO).slug).toBe(venue.slug);

    const moved = await api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send({ cityId: cityB });
    expect(moved.status).toBe(200);
    expect((moved.body as VenueProDTO).cityId).toBe(cityB);

    const badMove = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set(auth(token))
      .send({ cityId: "018f0000-0000-7000-8000-0000000000ff" });
    expect(badMove.status).toBe(400);
    expect(badMove.body.message.code).toBe("CITY_NOT_FOUND");
  });

  it("capacités fusionnées avec l'existant : min seul > max stocké → 400 CAPACITY_RANGE_INVALID ; les deux → 200", async () => {
    const { cityA } = await seedGeo();
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, cityA); // max stocké : 450

    const bad = await api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send({ capacityMin: 500 });
    expect(bad.status).toBe(400);
    expect(bad.body.message).toEqual({ code: "CAPACITY_RANGE_INVALID", message: "venue.errors.capacityRange" });

    const ok = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set(auth(token))
      .send({ capacityMin: 500, capacityMax: 600 });
    expect(ok.status).toBe(200);
    expect((ok.body as VenueProDTO).capacityMax).toBe(600);
  });

  it("clés interdites (slug/publicationStatus/commissionRateBps) et corps vide : 400", async () => {
    const { cityA } = await seedGeo();
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, cityA);
    const patch = (body: Record<string, unknown>) =>
      api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send(body);

    for (const body of [{ slug: "je-triche" }, { publicationStatus: "PUBLISHED" }, { commissionRateBps: 500 }]) {
      const res = await patch(body);
      expect(res.status).toBe(400); // .strict() : la clé n'existe pas pour le pro
    }
    const empty = await patch({});
    expect(empty.status).toBe(400);
    const issues = (empty.body.message as { issues: { message: string }[] }).issues;
    expect(issues.map((i) => i.message)).toContain("venue.validation.emptyUpdate");
  });

  it("effacement explicite par null (tagline, coordonnées) ; la salle d'un autre pro → 404", async () => {
    const { cityA } = await seedGeo();
    const tokenA = await proSession(PRO_A);
    const tokenB = await proSession(PRO_B);
    const ofA = await createVenue(tokenA, cityA);

    const cleared = await api()
      .patch(`/api/v1/venues/${ofA.id}`)
      .set(auth(tokenA))
      .send({ taglineFr: null, lat: null, lng: null });
    expect(cleared.status).toBe(200);
    const dto = cleared.body as VenueProDTO;
    expect([dto.taglineFr, dto.lat, dto.lng]).toEqual([null, null, null]);

    const intrusion = await api().patch(`/api/v1/venues/${ofA.id}`).set(auth(tokenB)).send({ nameFr: "Piratée" });
    expect(intrusion.status).toBe(404);
    expect((await api().get(`/api/v1/pro/venues/${ofA.id}`).set(auth(tokenA)).expect(200)).body.nameFr).toBe(
      payload(cityA).nameFr
    );
  });
});

describe("PATCH /venues/:id — amenityIds (A3-① : remplacement d'ensemble)", () => {
  async function seedAmenities(): Promise<{ parking: string; wifi: string }> {
    const parking = await ctx.prisma.amenity.create({
      data: { key: "parking", nameFr: "Parking privé", nameAr: "موقف سيارات خاص", icon: "square-parking" }
    });
    const wifi = await ctx.prisma.amenity.create({
      data: { key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: "wifi" }
    });
    return { parking: parking.id, wifi: wifi.id };
  }

  it("assigne (avec doublon → dédupliqué), remplace, puis efface — le DTO reflète chaque état, updatedAt bouge", async () => {
    const { cityA } = await seedGeo();
    const { parking, wifi } = await seedAmenities();
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, cityA);
    expect(venue.amenityIds).toEqual([]); // création sans amenities (l'assignation vit sur PATCH)

    const assigned = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set(auth(token))
      .send({ amenityIds: [wifi, parking, wifi] });
    expect(assigned.status).toBe(200);
    expect((assigned.body as VenueProDTO).amenityIds).toEqual([parking, wifi].sort());
  

    const replaced = await api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send({ amenityIds: [wifi] });
    expect((replaced.body as VenueProDTO).amenityIds).toEqual([wifi]);

    const cleared = await api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send({ amenityIds: [] });
    expect((cleared.body as VenueProDTO).amenityIds).toEqual([]);
    expect(await ctx.prisma.venueAmenity.count({ where: { venueId: venue.id } })).toBe(0);
  });

  it("id inconnu du référentiel : 400 AMENITY_NOT_FOUND, sélection existante intacte", async () => {
    const { cityA } = await seedGeo();
    const { parking } = await seedAmenities();
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, cityA);
    await api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send({ amenityIds: [parking] }).expect(200);

    const res = await api()
      .patch(`/api/v1/venues/${venue.id}`)
      .set(auth(token))
      .send({ amenityIds: [parking, "018f0000-0000-7000-8000-00000000dead"] });
    expect(res.status).toBe(400);
    expect(res.body.message).toEqual({ code: "AMENITY_NOT_FOUND", message: "venue.errors.amenityNotFound" });
    expect((await api().get(`/api/v1/pro/venues/${venue.id}`).set(auth(token)).expect(200)).body.amenityIds).toEqual([
      parking
    ]);
  });
});

describe("DELETE /venues/:id — soft delete", () => {
  it("cycle complet : 204, ligne conservée EN BASE (deletedAt), invisible partout, toute suite → 404", async () => {
    const { cityA } = await seedGeo();
    const token = await proSession(PRO_A);
    const venue = await createVenue(token, cityA);

    await api().delete(`/api/v1/venues/${venue.id}`).set(auth(token)).expect(204);

    // Soft, pas DELETE SQL : la ligne existe toujours, datée.
    const row = await ctx.prisma.venue.findUniqueOrThrow({ where: { id: venue.id } });
    expect(row.deletedAt).not.toBeNull();

    expect((await api().get("/api/v1/pro/venues").set(auth(token)).expect(200)).body).toEqual([]);
    await api().get(`/api/v1/pro/venues/${venue.id}`).set(auth(token)).expect(404);
    await api().patch(`/api/v1/venues/${venue.id}`).set(auth(token)).send({ status: "ACTIVE" }).expect(404);
    await api().delete(`/api/v1/venues/${venue.id}`).set(auth(token)).expect(404); // re-DELETE : même 404
  });

  it("supprimer la salle d'un autre pro : 404, et le propriétaire la voit toujours", async () => {
    const { cityA } = await seedGeo();
    const tokenA = await proSession(PRO_A);
    const tokenB = await proSession(PRO_B);
    const ofB = await createVenue(tokenB, cityA);

    await api().delete(`/api/v1/venues/${ofB.id}`).set(auth(tokenA)).expect(404);
    await api().get(`/api/v1/pro/venues/${ofB.id}`).set(auth(tokenB)).expect(200);
  });
});
