// Spec unitaire de VenuesPublicService (Lot A3), Prisma mocké — LA chose à
// prouver ici : la construction EXACTE des deux WHERE D33 (liste stricte
// ACTIVE ; détail élargi à TEMPORARILY_UNAVAILABLE) et des filtres combinés.
// Résultats réels, pagination et anti-fuite des taux : en intégration.
import { NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { VenueListQueryInput } from "@zwadj/types";
import type { PrismaService } from "../prisma/prisma.service";
import { VenuesPublicService } from "./venues-public.service";

const fakeStorage = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  publicUrl: (key: string) => `/api/v1/media/${key}`
} as unknown as import("../media/media.types").MediaStorage;

function buildService() {
  const prisma = {
    venue: { findMany: vi.fn().mockResolvedValue([]), count: vi.fn().mockResolvedValue(0), findFirst: vi.fn() },
    // Les mocks renvoient des promesses ordinaires : $transaction = Promise.all.
    $transaction: vi.fn((ops: Promise<unknown>[]) => Promise.all(ops))
  };
  return { service: new VenuesPublicService(prisma as unknown as PrismaService, fakeStorage), prisma };
}

const QUERY_DEFAULTS: VenueListQueryInput = { sort: "recent", page: 1, pageSize: 12 };

describe("VenuesPublicService.list — WHERE D33 + filtres", () => {
  it("sans filtre : prédicat strict de la liste (PUBLISHED, vivante, ACTIVE) + tri recent + fenêtre", async () => {
    const { service, prisma } = buildService();
    await service.list(QUERY_DEFAULTS);

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: { publicationStatus: "PUBLISHED", deletedAt: null, status: "ACTIVE" },
        orderBy: [{ updatedAt: "desc" }, { id: "asc" }],
        skip: 0,
        take: 12
      })
    );
    expect(prisma.venue.count).toHaveBeenCalledWith({
      where: { publicationStatus: "PUBLISHED", deletedAt: null, status: "ACTIVE" }
    });
  });

  it("filtres combinés : ville + invités (bornes croisées) + fourchette de prix + amenities en ET", async () => {
    const { service, prisma } = buildService();
    await service.list({
      ...QUERY_DEFAULTS,
      cityId: "018f0000-0000-7000-8000-00000000cccc",
      guests: 250,
      minPriceCents: 10_000_000,
      maxPriceCents: 30_000_000,
      amenities: "parking,wifi,parking", // doublon volontaire → dédupliqué
      sort: "price_asc",
      page: 3,
      pageSize: 10
    });

    expect(prisma.venue.findMany).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          publicationStatus: "PUBLISHED",
          deletedAt: null,
          status: "ACTIVE",
          cityId: "018f0000-0000-7000-8000-00000000cccc",
          capacityMin: { lte: 250 },
          capacityMax: { gte: 250 },
          basePriceCents: { gte: 10_000_000, lte: 30_000_000 },
          AND: [
            { amenities: { some: { amenity: { key: "parking" } } } },
            { amenities: { some: { amenity: { key: "wifi" } } } }
          ]
        },
        orderBy: [{ basePriceCents: "asc" }, { id: "asc" }],
        skip: 20,
        take: 10
      })
    );
  });
});

describe("VenuesPublicService.bySlug — WHERE D33 détail + court-circuit", () => {
  it("slug hors motif (majuscule, espace, underscore…) : 404 sans toucher la base", async () => {
    const { service, prisma } = buildService();
    for (const bad of ["Pas-Un-Slug", "salle el ferdous", "salle_el", "salle-", "-salle", ""]) {
      await expect(service.bySlug(bad)).rejects.toSatisfy(
        (e: unknown) =>
          e instanceof NotFoundException && (e.getResponse() as { code?: string }).code === "VENUE_NOT_FOUND"
      );
    }
    expect(prisma.venue.findFirst).not.toHaveBeenCalled();
  });

  it("WHERE du détail : PUBLISHED, vivante, status ∈ {ACTIVE, TEMPORARILY_UNAVAILABLE} — HIDDEN exclu", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(null);

    await expect(service.bySlug("salle-el-ferdous-2")).rejects.toThrow(NotFoundException);
    expect(prisma.venue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({
        where: {
          slug: "salle-el-ferdous-2",
          publicationStatus: "PUBLISHED",
          deletedAt: null,
          status: { in: ["ACTIVE", "TEMPORARILY_UNAVAILABLE"] }
        }
      })
    );
  });
});
