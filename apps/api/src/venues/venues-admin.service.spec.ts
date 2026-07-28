// Spec unitaire de VenuesAdminService (Lot A3), Prisma mocké — branches pures :
// publish idempotent SANS update (updatedAt intact), fusion des taux contre
// l'existant (égalité admise, dépassement refusé), 404 court-circuit uuid.
// Le bout-en-bout (guards ADMIN, CHECK SQL, visibilité publique) vit en int.
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { VenuesAdminService } from "./venues-admin.service";

const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";

function adminRow(overrides: Record<string, unknown> = {}) {
  return {
    id: VENUE_ID,
    slug: "salle-el-ferdous",
    cityId: "018f0000-0000-7000-8000-00000000cccc",
    nameFr: "Salle El Ferdous",
    nameAr: "قاعة الفردوس",
    taglineFr: null,
    taglineAr: null,
    descriptionFr: null,
    descriptionAr: null,
    districtFr: null,
    districtAr: null,
    address: null,
    lat: null,
    lng: null,
    capacityMax: 450,
    basePriceCents: 18_000_000,
    bookingMode: "SINGLE_SLOT",
    publicationStatus: "DRAFT",
    status: "ACTIVE",
    amenities: [],
    photos: [],
    slotTemplates: [],
    matterportModelId: null,
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    commissionRateBps: 100,
    cashbackRateBps: 0,
    ...overrides
  };
}

const fakeStorage = {
  put: vi.fn(),
  get: vi.fn(),
  delete: vi.fn(),
  publicUrl: (key: string) => `/api/v1/media/${key}`
} as unknown as import("../media/media.types").MediaStorage;

function buildService() {
  // D46 (B1) — la publication compte désormais les créneaux ACTIFS : sans ce
  // double, la garde ferait échouer tous les scénarios de publication.
  const prisma = {
    venue: { findFirst: vi.fn(), update: vi.fn() },
    slotTemplate: { count: vi.fn().mockResolvedValue(1) }
  };
  return { service: new VenuesAdminService(prisma as unknown as PrismaService, fakeStorage), prisma };
}

describe("VenuesAdminService.publish", () => {
  it("id hors motif UUID : 404 VENUE_NOT_FOUND sans toucher la base", async () => {
    const { service, prisma } = buildService();
    await expect(service.publish("pas-un-uuid")).rejects.toSatisfy(
      (e: unknown) => e instanceof NotFoundException && (e.getResponse() as { code?: string }).code === "VENUE_NOT_FOUND"
    );
    expect(prisma.venue.findFirst).not.toHaveBeenCalled();
  });

  it("DRAFT → update vers PUBLISHED ; le WHERE admin voit toutes les vivantes (pas de filtre owner)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow());
    prisma.venue.update.mockResolvedValue(adminRow({ publicationStatus: "PUBLISHED" }));

    const dto = await service.publish(VENUE_ID);

    expect(prisma.venue.findFirst).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VENUE_ID, deletedAt: null } })
    );
    expect(prisma.venue.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VENUE_ID }, data: { publicationStatus: "PUBLISHED" } })
    );
    expect(dto.publicationStatus).toBe("PUBLISHED");
    expect(dto.commissionRateBps).toBe(100); // la vue admin porte les taux
    expect(dto.cashbackRateBps).toBe(0);
  });

  it("déjà PUBLISHED : idempotent, AUCUN update (updatedAt intact, tri « recent » non faussé)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ publicationStatus: "PUBLISHED" }));

    const dto = await service.publish(VENUE_ID);

    expect(prisma.venue.update).not.toHaveBeenCalled();
    expect(dto.publicationStatus).toBe("PUBLISHED");
  });
});

describe("VenuesAdminService.setRates — fusion D35 contre l'existant", () => {
  it("cashback seul > commission stockée : 400 CASHBACK_EXCEEDS_COMMISSION, update jamais appelé", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ commissionRateBps: 200 }));

    await expect(service.setRates(VENUE_ID, { cashbackRateBps: 300 })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BadRequestException &&
        (e.getResponse() as { code?: string }).code === "CASHBACK_EXCEEDS_COMMISSION"
    );
    expect(prisma.venue.update).not.toHaveBeenCalled();
  });

  it("égalité admise (cashback = commission, D35 : ≤) ; corps partiel écrit tel quel", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ commissionRateBps: 300 }));
    prisma.venue.update.mockResolvedValue(adminRow({ commissionRateBps: 300, cashbackRateBps: 300 }));

    const dto = await service.setRates(VENUE_ID, { cashbackRateBps: 300 });

    expect(prisma.venue.update).toHaveBeenCalledWith(
      expect.objectContaining({ where: { id: VENUE_ID }, data: { cashbackRateBps: 300 } })
    );
    expect(dto.cashbackRateBps).toBe(300);
  });

  it("baisser la commission SOUS le cashback stocké est refusé aussi (fusion symétrique)", async () => {
    const { service, prisma } = buildService();
    prisma.venue.findFirst.mockResolvedValue(adminRow({ commissionRateBps: 400, cashbackRateBps: 300 }));

    await expect(service.setRates(VENUE_ID, { commissionRateBps: 200 })).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BadRequestException &&
        (e.getResponse() as { code?: string }).code === "CASHBACK_EXCEEDS_COMMISSION"
    );
    expect(prisma.venue.update).not.toHaveBeenCalled();
  });
});
