// Spec unitaire de VenueMediaService (Lot A4), Prisma/storage/pipeline réels
// remplacés — branches PURES : plafonds → 400, erreurs pipeline → 400 avec clé
// i18n, COMPENSATION D'ORPHELIN (put ok, INSERT KO → delete des deux objets +
// erreur d'origine relancée), mismatch de réordonnancement, et pour A6a (D45)
// les trois issues de updateVirtualTour (set / clear / 409 d'unicité). Le vrai
// pipeline sharp et les vraies contraintes SQL vivent en intégration
// (venue-media.int-spec).
import { BadRequestException, ConflictException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import type { MediaStorage } from "../media/media.types";
import type { VenuesService } from "./venues.service";
import { VenueMediaService } from "./venue-media.service";

// Pipeline mocké : le service ne doit dépendre que du CONTRAT (paire large/thumb
// ou MediaValidationError) — les mocks sont réassignés par cas de test.
vi.mock("../media/image-pipeline", async (importOriginal) => {
  const original = await importOriginal<typeof import("../media/image-pipeline")>();
  return { ...original, processVenuePhoto: vi.fn() };
});
import { MediaValidationError, processVenuePhoto } from "../media/image-pipeline";

const USER_ID = "018f0000-0000-7000-8000-00000000aaaa";
const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";
const PHOTO_1 = "018f0000-0000-7000-8000-000000000001";
const PHOTO_2 = "018f0000-0000-7000-8000-000000000002";

const PAIR = {
  large: { buffer: Buffer.from("large"), width: 1600, height: 1200, contentType: "image/webp", extension: "webp" },
  thumb: { buffer: Buffer.from("thumb"), width: 480, height: 360, contentType: "image/webp", extension: "webp" }
} as const;

function build() {
  const prisma = {
    venuePhoto: {
      count: vi.fn(),
      aggregate: vi.fn(),
      create: vi.fn(),
      findFirst: vi.fn(),
      findMany: vi.fn(),
      update: vi.fn(),
      delete: vi.fn()
    },
    venue: { update: vi.fn() },
    $transaction: vi.fn()
  };
  const storage = { put: vi.fn(), get: vi.fn(), delete: vi.fn(), publicUrl: (k: string) => `/api/v1/media/${k}` };
  const venues = { assertOwnedLivingVenueId: vi.fn().mockResolvedValue(VENUE_ID) };
  const service = new VenueMediaService(
    prisma as unknown as PrismaService,
    venues as unknown as VenuesService,
    storage as unknown as MediaStorage
  );
  return { service, prisma, storage, venues };
}

function code(error: unknown): string | undefined {
  if (error instanceof BadRequestException || error instanceof ConflictException) {
    return (error.getResponse() as { code?: string }).code;
  }
  return undefined;
}

describe("VenueMediaService.addPhoto", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
    vi.mocked(processVenuePhoto).mockResolvedValue(PAIR);
  });

  it("plafond atteint (30) → 400 MEDIA_PHOTO_LIMIT_REACHED, AVANT tout traitement sharp et toute écriture", async () => {
    ctx.prisma.venuePhoto.count.mockResolvedValue(30);
    const error = await ctx.service.addPhoto(USER_ID, VENUE_ID, Buffer.from("x")).catch((e: unknown) => e);
    expect(code(error)).toBe("MEDIA_PHOTO_LIMIT_REACHED");
    expect(processVenuePhoto).not.toHaveBeenCalled();
    expect(ctx.storage.put).not.toHaveBeenCalled();
  });

  it("MediaValidationError du pipeline → 400 {code, clé media.errors.*} — jamais l'erreur brute", async () => {
    ctx.prisma.venuePhoto.count.mockResolvedValue(0);
    vi.mocked(processVenuePhoto).mockRejectedValue(new MediaValidationError("MEDIA_TOO_SMALL", "800×600 requis"));
    const error = await ctx.service.addPhoto(USER_ID, VENUE_ID, Buffer.from("x")).catch((e: unknown) => e);
    expect(code(error)).toBe("MEDIA_TOO_SMALL");
    expect((error as BadRequestException).getResponse()).toEqual({
      code: "MEDIA_TOO_SMALL",
      message: "media.errors.tooSmall"
    });
    expect(ctx.storage.put).not.toHaveBeenCalled();
  });

  it("COMPENSATION D'ORPHELIN : put ×2 puis INSERT KO → delete des DEUX clés fraîches + erreur d'origine relancée", async () => {
    ctx.prisma.venuePhoto.count.mockResolvedValue(0);
    ctx.prisma.venuePhoto.aggregate.mockResolvedValue({ _max: { sortOrder: null } });
    const boom = new Error("insert KO (FK, panne…)");
    ctx.prisma.venuePhoto.create.mockRejectedValue(boom);

    await expect(ctx.service.addPhoto(USER_ID, VENUE_ID, Buffer.from("x"))).rejects.toBe(boom);

    expect(ctx.storage.put).toHaveBeenCalledTimes(2);
    const putKeys = ctx.storage.put.mock.calls.map((c) => (c[0] as { key: string }).key);
    const deleted = ctx.storage.delete.mock.calls.map((c) => c[0] as string);
    expect(deleted.sort()).toEqual([...putKeys].sort()); // exactement les objets écrits
    expect(deleted).toHaveLength(2);
  });

  it("nominal : sortOrder = max+1 (append), clés serveur vp-*.webp / vp-*-thumb.webp, dimensions du large persistées", async () => {
    ctx.prisma.venuePhoto.count.mockResolvedValue(2);
    ctx.prisma.venuePhoto.aggregate.mockResolvedValue({ _max: { sortOrder: 4 } });
    ctx.prisma.venuePhoto.create.mockImplementation(({ data }: { data: Record<string, unknown> }) =>
      Promise.resolve({
        id: PHOTO_1,
        storageKey: data.storageKey,
        thumbKey: data.thumbKey,
        width: data.width,
        height: data.height,
        sortOrder: data.sortOrder,
        altFr: null,
        altAr: null,
        createdAt: new Date("2026-07-22T10:00:00.000Z")
      })
    );

    const dto = await ctx.service.addPhoto(USER_ID, VENUE_ID, Buffer.from("x"));

    expect(dto.sortOrder).toBe(5);
    expect(dto.width).toBe(1600);
    expect(dto.height).toBe(1200);
    expect(dto.url).toMatch(/^\/api\/v1\/media\/vp-[0-9a-f-]{36}\.webp$/);
    expect(dto.thumbUrl).toMatch(/^\/api\/v1\/media\/vp-[0-9a-f-]{36}-thumb\.webp$/);
    expect(ctx.storage.delete).not.toHaveBeenCalled();
  });
});

describe("VenueMediaService.reorderPhotos — ensemble complet atomique (A4-③)", () => {
  it("ensemble ≠ stocké (photo disparue OU étrangère) → 400 PHOTO_ORDER_MISMATCH, AUCUNE écriture", async () => {
    const ctx = build();
    const tx = {
      venuePhoto: { findMany: vi.fn().mockResolvedValue([{ id: PHOTO_1 }, { id: PHOTO_2 }]), update: vi.fn() }
    };
    ctx.prisma.$transaction.mockImplementation((fn: (t: unknown) => Promise<unknown>) => fn(tx));

    const error = await ctx.service
      .reorderPhotos(USER_ID, VENUE_ID, { photoIds: [PHOTO_1] }) // incomplet
      .catch((e: unknown) => e);

    expect(code(error)).toBe("PHOTO_ORDER_MISMATCH");
    expect(tx.venuePhoto.update).not.toHaveBeenCalled();
  });

  it("nominal : sortOrder = index du tableau, pour CHAQUE photo, dans la transaction", async () => {
    const ctx = build();
    const tx = {
      venuePhoto: {
        findMany: vi
          .fn()
          .mockResolvedValueOnce([{ id: PHOTO_1 }, { id: PHOTO_2 }]) // état stocké
          .mockResolvedValueOnce([]), // relecture finale (forme testée en intégration)
        update: vi.fn().mockResolvedValue({ id: "x" })
      }
    };
    ctx.prisma.$transaction.mockImplementation((fn: (t: unknown) => Promise<unknown>) => fn(tx));

    await ctx.service.reorderPhotos(USER_ID, VENUE_ID, { photoIds: [PHOTO_2, PHOTO_1] });

    expect(tx.venuePhoto.update).toHaveBeenNthCalledWith(1, {
      where: { id: PHOTO_2 },
      data: { sortOrder: 0 },
      select: { id: true }
    });
    expect(tx.venuePhoto.update).toHaveBeenNthCalledWith(2, {
      where: { id: PHOTO_1 },
      data: { sortOrder: 1 },
      select: { id: true }
    });
  });
});

describe("VenueMediaService.updateVirtualTour — D45", () => {
  it("URL de partage : c'est l'ID CANONIQUE qui est écrit, jamais l'URL brute", async () => {
    const ctx = build();
    ctx.prisma.venue.update.mockResolvedValue({ matterportModelId: "SxQL3iGyoDo" });

    await expect(
      ctx.service.updateVirtualTour(USER_ID, VENUE_ID, {
        matterportInput: "https://my.matterport.com/show/?m=SxQL3iGyoDo"
      })
    ).resolves.toEqual({ matterportModelId: "SxQL3iGyoDo" });

    expect(ctx.prisma.venue.update).toHaveBeenCalledWith({
      where: { id: VENUE_ID },
      data: { matterportModelId: "SxQL3iGyoDo" },
      select: { matterportModelId: true }
    });
  });

  it("chaîne vide → écrit NULL (désactivation), pas une chaîne vide en base", async () => {
    const ctx = build();
    ctx.prisma.venue.update.mockResolvedValue({ matterportModelId: null });

    await expect(ctx.service.updateVirtualTour(USER_ID, VENUE_ID, { matterportInput: "  " })).resolves.toEqual({
      matterportModelId: null
    });
    expect(ctx.prisma.venue.update).toHaveBeenCalledWith(
      expect.objectContaining({ data: { matterportModelId: null } })
    );
  });

  it("saisie invalide → 400 INVALID_MATTERPORT_LINK, AUCUNE écriture", async () => {
    const ctx = build();
    const error = await ctx.service
      .updateVirtualTour(USER_ID, VENUE_ID, { matterportInput: "https://exemple.dz/?m=abcdef" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(BadRequestException);
    expect(code(error)).toBe("INVALID_MATTERPORT_LINK");
    expect(ctx.prisma.venue.update).not.toHaveBeenCalled();
  });

  // L'ownership passe AVANT le parse : une salle étrangère ne doit pas pouvoir
  // se faire distinguer d'un lien mal formé (404 indistinct, doctrine A2).
  it("ownership évaluée AVANT le parse : salle étrangère ⇒ 404, jamais un 400 de format", async () => {
    const ctx = build();
    ctx.venues.assertOwnedLivingVenueId.mockRejectedValue(new Error("404"));
    await expect(
      ctx.service.updateVirtualTour(USER_ID, VENUE_ID, { matterportInput: "garbage!!" })
    ).rejects.toThrow("404");
    expect(ctx.prisma.venue.update).not.toHaveBeenCalled();
  });

  it("P2002 (unicité de matterport_model_id) → 409 MATTERPORT_ALREADY_LINKED", async () => {
    const ctx = build();
    ctx.prisma.venue.update.mockRejectedValue({ code: "P2002" });

    const error = await ctx.service
      .updateVirtualTour(USER_ID, VENUE_ID, { matterportInput: "SxQL3iGyoDo" })
      .catch((e: unknown) => e);

    expect(error).toBeInstanceOf(ConflictException);
    expect(code(error)).toBe("MATTERPORT_ALREADY_LINKED");
  });
});
