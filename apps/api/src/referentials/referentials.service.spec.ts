// Spec unitaire du service des référentiels (Lot A1) — Prisma mocké : on
// vérifie les tris DEMANDÉS à la base (le tri effectif, collation comprise,
// est prouvé en intégration), le mapping Decimal→number et la forme exposée
// (wilayaId interne des villes jamais rendu).
import { describe, expect, it, vi } from "vitest";
import { Prisma } from "../generated/prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { ReferentialsService } from "./referentials.service";

function buildService(rows: { wilayas?: unknown[]; amenities?: unknown[] }) {
  const wilayaFindMany = vi.fn().mockResolvedValue(rows.wilayas ?? []);
  const amenityFindMany = vi.fn().mockResolvedValue(rows.amenities ?? []);
  const prisma = {
    wilaya: { findMany: wilayaFindMany },
    amenity: { findMany: amenityFindMany }
  } as unknown as PrismaService;
  return { service: new ReferentialsService(prisma), wilayaFindMany, amenityFindMany };
}

describe("ReferentialsService.listWilayas", () => {
  const algerRow = {
    id: "w-16",
    code: 16,
    nameFr: "Alger",
    nameAr: "الجزائر",
    cities: [
      {
        id: "c-1",
        wilayaId: "w-16", // présent côté base…
        nameFr: "Hydra",
        nameAr: "حيدرة",
        lat: new Prisma.Decimal("36.745300"),
        lng: new Prisma.Decimal("3.031900")
      },
      { id: "c-2", wilayaId: "w-16", nameFr: "Sans GPS", nameAr: "بدون", lat: null, lng: null }
    ]
  };
  const adrarRow = { id: "w-01", code: 1, nameFr: "Adrar", nameAr: "أدرار", cities: [] };

  it("demande le tri code asc + villes imbriquées triées par nameFr", async () => {
    const { service, wilayaFindMany } = buildService({ wilayas: [adrarRow, algerRow] });
    await service.listWilayas();
    expect(wilayaFindMany).toHaveBeenCalledExactlyOnceWith({
      orderBy: { code: "asc" },
      include: { cities: { orderBy: { nameFr: "asc" } } }
    });
  });

  it("mappe Decimal→number, préserve les null, et n'expose PAS wilayaId sur les villes", async () => {
    const { service } = buildService({ wilayas: [algerRow] });
    const [alger] = await service.listWilayas();
    expect(alger).toBeDefined(); // garde noUncheckedIndexedAccess — le mock garantit l'élément

    expect(alger).toEqual({
      id: "w-16",
      code: 16,
      nameFr: "Alger",
      nameAr: "الجزائر",
      cities: [
        { id: "c-1", nameFr: "Hydra", nameAr: "حيدرة", lat: 36.7453, lng: 3.0319 },
        { id: "c-2", nameFr: "Sans GPS", nameAr: "بدون", lat: null, lng: null }
      ]
    });
    expect(typeof alger!.cities[0]!.lat).toBe("number");
    expect(Object.keys(alger!.cities[0]!).sort()).toEqual(["id", "lat", "lng", "nameAr", "nameFr"]);
  });

  it("wilaya sans ville : cities = [] (jamais null/undefined)", async () => {
    const { service } = buildService({ wilayas: [adrarRow] });
    const [adrar] = await service.listWilayas();
    expect(adrar).toBeDefined(); // garde noUncheckedIndexedAccess — le mock garantit l'élément
    expect(adrar!.cities).toEqual([]);
  });
});

describe("ReferentialsService.listAmenities", () => {
  it("demande le tri nameFr asc et rend id/key/nameFr/nameAr/icon tels quels (icon null accepté)", async () => {
    const rows = [
      { id: "a-1", key: "kosha", nameFr: "Kosha (podium des mariés)", nameAr: "كوشة العروسين", icon: "sofa" },
      { id: "a-2", key: "wifi", nameFr: "Wifi", nameAr: "واي فاي", icon: null }
    ];
    const { service, amenityFindMany } = buildService({ amenities: rows });
    const result = await service.listAmenities();

    expect(amenityFindMany).toHaveBeenCalledExactlyOnceWith({ orderBy: { nameFr: "asc" } });
    expect(result).toEqual(rows);
  });
});
