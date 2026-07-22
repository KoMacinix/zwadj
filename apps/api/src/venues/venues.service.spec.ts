// Spec unitaire de VenuesService (Lot A2), Prisma mocké — branches PURES :
// court-circuit uuid, 404 indistinct, fusion de capacités contre l'existant,
// boucle de reprise du slug (P2002), forme du DTO (allow-list). Les garanties
// de bout en bout (guards, contraintes SQL, soft delete) vivent en intégration.
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VenueCreateInput } from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import type { PrismaService } from "../prisma/prisma.service";
import { VenuesService } from "./venues.service";

const USER_ID = "018f0000-0000-7000-8000-00000000aaaa";
const CITY_ID = "018f0000-0000-7000-8000-00000000cccc";
const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";

function venueRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VENUE_ID,
    slug: "salle-el-ferdous",
    cityId: CITY_ID,
    nameFr: "Salle El Ferdous",
    nameAr: "قاعة الفردوس",
    taglineFr: null,
    taglineAr: null,
    descriptionFr: null,
    descriptionAr: null,
    districtFr: null,
    districtAr: null,
    address: null,
    lat: new Prisma.Decimal("36.745300"),
    lng: new Prisma.Decimal("3.031900"),
    capacityMin: 100,
    capacityMax: 450,
    basePriceCents: 18_000_000,
    bookingMode: "SINGLE_SLOT",
    publicationStatus: "DRAFT",
    status: "ACTIVE",
    amenities: [], // relation VenueAmenity (ids seuls) — A3-①
    photos: [], // relations médias (Lot A4) — salles neuves sans média
    photos360: [],
    photo360Links: [],
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    ...overrides
  };
}

const CREATE_INPUT: VenueCreateInput = {
  cityId: CITY_ID,
  nameFr: "Salle El Ferdous",
  nameAr: "قاعة الفردوس",
  capacityMin: 100,
  capacityMax: 450,
  basePriceCents: 18_000_000
};

const fakeStorage = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  publicUrl: (key: string) => `/api/v1/media/${key}`
} as unknown as import("../media/media.types").MediaStorage;

function buildService() {
  const prisma = {
    proProfile: { findUnique: vi.fn() },
    city: { findUnique: vi.fn() },
    amenity: { count: vi.fn() },
    venue: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() }
  };
  return { service: new VenuesService(prisma as unknown as PrismaService, fakeStorage), prisma };
}

function isNotFoundVenue(error: unknown): boolean {
  return (
    error instanceof NotFoundException &&
    (error.getResponse() as { code?: string }).code === "VENUE_NOT_FOUND"
  );
}

describe("VenuesService — 404 indistincts", () => {
  let ctx: ReturnType<typeof buildService>;
  beforeEach(() => {
    ctx = buildService();
  });

  it("id hors motif UUID : 404 SANS toucher la base (pas de P2023 driver)", async () => {
    await expect(ctx.service.getMine(USER_ID, "pas-un-uuid")).rejects.toSatisfy(isNotFoundVenue);
    expect(ctx.prisma.venue.findFirst).not.toHaveBeenCalled();
  });

  it("findFirst nul (inexistante / supprimée / à un autre pro) : même 404", async () => {
    ctx.prisma.venue.findFirst.mockResolvedValue(null);
    await expect(ctx.service.getMine(USER_ID, VENUE_ID)).rejects.toSatisfy(isNotFoundVenue);
    // LA requête d'ownership : id + vivante + à moi, en un seul WHERE.
    expect(ctx.prisma.venue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VENUE_ID, deletedAt: null, owner: { userId: USER_ID } } })
    );
  });
});

describe("VenuesService.update — fusion des capacités contre l'existant", () => {
  it("{ capacityMin: 500 } seul contre un max stocké de 450 : 400 CAPACITY_RANGE_INVALID, update jamais appelé", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(venueRow());

    await expect(service.update(USER_ID, VENUE_ID, { capacityMin: 500 })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BadRequestException && (e.getResponse() as { code?: string }).code === "CAPACITY_RANGE_INVALID"
    );
    expect(prisma.venue.update).not.toHaveBeenCalled();
  });

  it("mise à jour partielle sans cityId : la ville n'est PAS re-vérifiée ; { status } seul passe tel quel", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(venueRow());
    prisma.venue.update.mockResolvedValue(venueRow({ status: "HIDDEN" }));

    const dto = await service.update(USER_ID, VENUE_ID, { status: "HIDDEN" });

    expect(prisma.city.findUnique).not.toHaveBeenCalled();
    expect(prisma.venue.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VENUE_ID }, data: { status: "HIDDEN" } })
    );
    expect(dto.status).toBe("HIDDEN");
  });
});

describe("VenuesService.create — slug unique avec reprise", () => {
  it("collision P2002 sur le premier candidat : retente avec le suffixe -2", async () => {
    const { service, prisma } = buildService();
    prisma.proProfile.findUnique.mockResolvedValue({ id: "pp-1" });
    prisma.city.findUnique.mockResolvedValue({ id: CITY_ID });
    prisma.venue.create
      .mockRejectedValueOnce({ code: "P2002" })
      .mockResolvedValueOnce(venueRow({ slug: "salle-el-ferdous-2" }));

    const dto = await service.create(USER_ID, CREATE_INPUT);

    expect(prisma.venue.create).toHaveBeenCalledTimes(2);
    const slugs = prisma.venue.create.mock.calls.map((c) => (c[0] as { data: { slug: string } }).data.slug);
    expect(slugs).toEqual(["salle-el-ferdous", "salle-el-ferdous-2"]);
    expect(dto.slug).toBe("salle-el-ferdous-2");
  });

  it("toute autre erreur que P2002 remonte telle quelle (pas de reprise aveugle)", async () => {
    const { service, prisma } = buildService();
    prisma.proProfile.findUnique.mockResolvedValue({ id: "pp-1" });
    prisma.city.findUnique.mockResolvedValue({ id: CITY_ID });
    prisma.venue.create.mockRejectedValue(new Error("panne réseau"));

    await expect(service.create(USER_ID, CREATE_INPUT)).rejects.toThrow("panne réseau");
    expect(prisma.venue.create).toHaveBeenCalledTimes(1);
  });

  it("PRO sans ProProfile : rupture d'invariant D3 → Error (500), jamais un 4xx", async () => {
    const { service, prisma } = buildService();
    prisma.proProfile.findUnique.mockResolvedValue(null);
    await expect(service.create(USER_ID, CREATE_INPUT)).rejects.toThrow(/Invariant D3/);
  });
});

describe("VenuesService.update — amenityIds (A3-① : remplacement d'ensemble)", () => {
  it("id inconnu du référentiel : 400 AMENITY_NOT_FOUND (comptage), update jamais appelé", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(venueRow());
    prisma.amenity.count.mockResolvedValue(1); // 2 ids demandés, 1 trouvé

    await expect(
      service.update(USER_ID, VENUE_ID, {
        amenityIds: ["018f0000-0000-7000-8000-00000000a001", "018f0000-0000-7000-8000-00000000a002"]
      })
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BadRequestException && (e.getResponse() as { code?: string }).code === "AMENITY_NOT_FOUND"
    );
    expect(prisma.venue.update).not.toHaveBeenCalled();
  });

  it("doublons dédupliqués AVANT comptage et écriture ; remplacement imbriqué atomique (deleteMany + create)", async () => {
    const { service, prisma } = buildService();
    const A1 = "018f0000-0000-7000-8000-00000000a001";
    const A2 = "018f0000-0000-7000-8000-00000000a002";
    prisma.venue.findFirst.mockResolvedValue(venueRow());
    prisma.amenity.count.mockResolvedValue(2);
    prisma.venue.update.mockResolvedValue(venueRow({ amenities: [{ amenityId: A1 }, { amenityId: A2 }] }));

    const dto = await service.update(USER_ID, VENUE_ID, { amenityIds: [A1, A1, A2] });

    expect(prisma.amenity.count).toHaveBeenCalledWith({ where: { id: { in: [A1, A2] } } });
    expect(prisma.venue.update).toHaveBeenCalledWith(
      expect.objectContaining({
        data: { amenities: { deleteMany: {}, create: [{ amenityId: A1 }, { amenityId: A2 }] } }
      })
    );
    expect(dto.amenityIds).toEqual([A1, A2]);
  });
});

describe("VenuesService — forme du DTO pro (allow-list)", () => {
  it("Decimal→number, dates ISO, et JAMAIS commissionRateBps/rejectionReason/deletedAt/ownerId", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(venueRow());

    const dto = await service.getMine(USER_ID, VENUE_ID);

    expect(dto.lat).toBe(36.7453);
    expect(typeof dto.lng).toBe("number");
    expect(dto.createdAt).toBe("2026-07-20T10:00:00.000Z");
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
        "photos",
        "photos360",
        "links360",
        "viewer360",
        "createdAt",
        "updatedAt"
      ].sort()
    );
  });
});
