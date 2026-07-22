// Intégration Lot A1 : le VRAI seed (importé de prisma/seed.ts, jamais une
// copie) + les deux endpoints publics de référentiels, sur base PostgreSQL
// réelle (schéma = migrations committées, dont city_natural_key).
//
// Les assertions d'ORDRE comparent la réponse HTTP au résultat du MÊME
// orderBy demandé à Prisma — jamais à un re-tri JavaScript : la collation de
// la base (accents, espaces) fait foi, un localeCompare JS pourrait diverger.
import request from "supertest";
import { afterAll, beforeAll, beforeEach, describe, expect, it } from "vitest";
import type { AmenityDTO, WilayaDTO } from "@zwadj/types";
import { seed } from "../../prisma/seed";
import { AMENITIES } from "../../prisma/seed-data/amenities";
import { CITIES } from "../../prisma/seed-data/cities";
import { WILAYAS } from "../../prisma/seed-data/wilayas";
import { createTestApp, truncateAll, type TestContext } from "./helpers";

let ctx: TestContext;

beforeAll(async () => {
  ctx = await createTestApp();
});

afterAll(async () => {
  await ctx.app.close();
});

beforeEach(async () => {
  await truncateAll(ctx.prisma);
});

describe("prisma/seed.ts — référentiels (Lot A1)", () => {
  it("base vide → comptes exacts décidés : 58 wilayas / 23 villes (Alger seule) / 23 équipements", async () => {
    const summary = await seed(ctx.prisma);

    expect(summary).toEqual({ wilayas: 58, cities: 23, amenities: 23 });
    expect(await ctx.prisma.wilaya.count()).toBe(58);
    expect(await ctx.prisma.city.count()).toBe(23);
    expect(await ctx.prisma.amenity.count()).toBe(23);

    // Périmètre Lot A1 : TOUTES les villes rattachées à Alger (16) — les 57
    // autres wilayas existent (cible de FK) mais sans ville.
    const alger = await ctx.prisma.wilaya.findUniqueOrThrow({ where: { code: 16 } });
    expect(await ctx.prisma.city.count({ where: { wilayaId: alger.id } })).toBe(23);
  });

  it("idempotent : seed ×2 → mêmes comptes ET mêmes ids (upsert, zéro doublon, zéro recréation)", async () => {
    await seed(ctx.prisma);
    const wilayasBefore = await ctx.prisma.wilaya.findMany({ orderBy: { code: "asc" } });
    const cityIdsBefore = (await ctx.prisma.city.findMany({ orderBy: { nameFr: "asc" } })).map((c) => c.id);
    const amenityIdsBefore = (await ctx.prisma.amenity.findMany({ orderBy: { key: "asc" } })).map((a) => a.id);

    await seed(ctx.prisma);

    expect((await ctx.prisma.wilaya.findMany({ orderBy: { code: "asc" } })).map((w) => w.id)).toEqual(
      wilayasBefore.map((w) => w.id)
    );
    expect((await ctx.prisma.city.findMany({ orderBy: { nameFr: "asc" } })).map((c) => c.id)).toEqual(cityIdsBefore);
    expect((await ctx.prisma.amenity.findMany({ orderBy: { key: "asc" } })).map((a) => a.id)).toEqual(amenityIdsBefore);
  });

  it("convergent : des lignes mutées en base sont RESTAURÉES par re-seed (update de l'upsert)", async () => {
    await seed(ctx.prisma);
    await ctx.prisma.wilaya.update({ where: { code: 16 }, data: { nameFr: "MUTÉE", nameAr: "x" } });
    await ctx.prisma.amenity.update({ where: { key: "kosha" }, data: { icon: "poubelle" } });
    const hydraBefore = await ctx.prisma.city.findFirstOrThrow({ where: { nameFr: "Hydra" } });
    await ctx.prisma.city.update({ where: { id: hydraBefore.id }, data: { lat: "0", nameAr: "x" } });

    await seed(ctx.prisma);

    const alger = await ctx.prisma.wilaya.findUniqueOrThrow({ where: { code: 16 } });
    expect({ nameFr: alger.nameFr, nameAr: alger.nameAr }).toEqual({ nameFr: "Alger", nameAr: "الجزائر" });
    expect((await ctx.prisma.amenity.findUniqueOrThrow({ where: { key: "kosha" } })).icon).toBe("sofa");
    const hydra = await ctx.prisma.city.findUniqueOrThrow({ where: { id: hydraBefore.id } });
    expect(hydra.lat?.toNumber()).toBe(36.7453);
    expect(hydra.nameAr).toBe("حيدرة");
  });

  it("clé naturelle City EN BASE : un doublon (wilayaId, nameFr) est rejeté par PostgreSQL (P2002)", async () => {
    await seed(ctx.prisma);
    const alger = await ctx.prisma.wilaya.findUniqueOrThrow({ where: { code: 16 } });
    await expect(
      ctx.prisma.city.create({ data: { wilayaId: alger.id, nameFr: "Hydra", nameAr: "دخيلة" } })
    ).rejects.toMatchObject({ code: "P2002" });
  });
});

describe("GET /api/v1/wilayas (Lot A1)", () => {
  beforeEach(async () => {
    await seed(ctx.prisma);
  });

  it("SANS aucun token (route publique) : 200, 58 wilayas triées par code, la 16 porte les 23 villes", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/wilayas").expect(200);
    const body = res.body as WilayaDTO[];

    expect(body).toHaveLength(58);
    expect(body.map((w) => w.code)).toEqual(WILAYAS.map((w) => w.code).sort((a, b) => a - b));

    const alger = body.find((w) => w.code === 16);
    expect(alger).toBeDefined();
    expect(alger?.cities).toHaveLength(23);
    expect(new Set(alger?.cities.map((c) => c.nameFr))).toEqual(new Set(CITIES.map((c) => c.nameFr)));

    // Toutes les autres wilayas : présentes, mais sans ville (périmètre A1).
    for (const w of body.filter((x) => x.code !== 16)) {
      expect(w.cities).toEqual([]);
    }
  });

  it("villes triées comme la BASE les trie (orderBy nameFr, collation comprise) et GPS numériques exacts", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/wilayas").expect(200);
    const alger = (res.body as WilayaDTO[]).find((w) => w.code === 16);

    const dbOrder = await ctx.prisma.city.findMany({ orderBy: { nameFr: "asc" }, select: { nameFr: true } });
    expect(alger?.cities.map((c) => c.nameFr)).toEqual(dbOrder.map((c) => c.nameFr));

    const hydra = alger?.cities.find((c) => c.nameFr === "Hydra");
    const seedHydra = CITIES.find((c) => c.nameFr === "Hydra");
    expect(typeof hydra?.lat).toBe("number");
    expect(typeof hydra?.lng).toBe("number");
    expect(hydra?.lat).toBe(seedHydra?.lat);
    expect(hydra?.lng).toBe(seedHydra?.lng);
  });

  it("forme exacte d'une ville : id/nameFr/nameAr/lat/lng — le wilayaId interne n'est PAS exposé", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/wilayas").expect(200);
    const alger = (res.body as WilayaDTO[]).find((w) => w.code === 16);
    expect(Object.keys(alger?.cities[0] ?? {}).sort()).toEqual(["id", "lat", "lng", "nameAr", "nameFr"]);
  });
});

describe("GET /api/v1/amenities (Lot A1)", () => {
  beforeEach(async () => {
    await seed(ctx.prisma);
  });

  it("SANS aucun token (route publique) : 200, les 23 clés verrouillées, triées comme la base (nameFr)", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/amenities").expect(200);
    const body = res.body as AmenityDTO[];

    expect(body).toHaveLength(23);
    expect(new Set(body.map((a) => a.key))).toEqual(new Set(AMENITIES.map((a) => a.key)));

    const dbOrder = await ctx.prisma.amenity.findMany({ orderBy: { nameFr: "asc" }, select: { key: true } });
    expect(body.map((a) => a.key)).toEqual(dbOrder.map((a) => a.key));
  });

  it("chaque entrée porte sa clé stable, ses libellés FR/AR et son icône lucide (kosha → sofa)", async () => {
    const res = await request(ctx.app.getHttpServer()).get("/api/v1/amenities").expect(200);
    const body = res.body as AmenityDTO[];

    for (const a of body) {
      expect(a.id.length).toBeGreaterThan(0);
      expect(a.key.length).toBeGreaterThan(0);
      expect(a.nameFr.length).toBeGreaterThan(0);
      expect(a.nameAr.length).toBeGreaterThan(0);
      expect(a.icon, `${a.key} : icône manquante`).toBeTruthy();
    }
    expect(body.find((a) => a.key === "kosha")?.icon).toBe("sofa");
    expect(body.find((a) => a.key === "groupe-electrogene")?.nameFr).toBe("Groupe électrogène");
  });
});
