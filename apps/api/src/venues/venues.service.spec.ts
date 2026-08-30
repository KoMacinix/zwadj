// Spec unitaire de VenuesService (Lot A2) — branches PURES : court-circuit uuid,
// 404 indistinct, boucle de reprise du slug, déduplication, forme du DTO.
// Les garanties de bout en bout (guards, contraintes SQL, soft delete) vivent
// en intégration.
//
// ⛔ S10a — PLUS DE FAUX PRISMA CASTÉ. Le double était passé en
// `as unknown as PrismaService`, ce qui désactivait TOUT contrôle de type :
// une méthode renommée, un `select` élargi, et le double continuait de rendre
// l'ancienne forme sans que rien ne rougisse. Il satisfait désormais les deux
// ports — `satisfies`, pas `as` — donc TypeScript le confronte.
//
// ⚠ LES ASSERTIONS DE FORME DE REQUÊTE ONT DÉMÉNAGÉ, elles n'ont pas disparu :
// WHERE d'appartenance, traduction du P2002, remplacement imbriqué et
// allow-list vivent dans `venue-store.prisma.spec.ts`, avec le code qu'elles
// mesurent. Ce fichier ne juge plus que des DÉCISIONS.
import { BadRequestException, NotFoundException } from "@nestjs/common";
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { VenueCreateInput } from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import { VenuesService } from "./venues.service";
import type { ReferentielsExistence, VenueProRow, VenueStore } from "./venue-store.types";

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
    capacityMax: 450,
    basePriceCents: 18_000_000,
    bookingMode: "SINGLE_SLOT",
    publicationStatus: "DRAFT",
    status: "ACTIVE",
    amenities: [], // relation VenueAmenity (ids seuls) — A3-①
    styles: [], // relation VenueStyleLink (ids seuls) — A13/D65
    ceremonyType: null, // D66 — non déclaré par cette salle
    photos: [], // relations médias (Lot A4) — salles neuves sans média
    slotTemplates: [], // D46 (B1) — créneaux, même patron que les photos
    matterportModelId: null,
    createdAt: new Date("2026-07-20T10:00:00.000Z"),
    updatedAt: new Date("2026-07-20T10:00:00.000Z"),
    ...overrides
  };
}

const CREATE_INPUT: VenueCreateInput = {
  cityId: CITY_ID,
  nameFr: "Salle El Ferdous",
  nameAr: "قاعة الفردوس",
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
  // ⚠ `satisfies` ET NON `as` : c'est toute la différence. Avec `as`, un
  // double incomplet ou désync passe ; avec `satisfies`, TypeScript exige
  // que les sept méthodes existent et que leurs signatures correspondent.
  // Ajouter une méthode au port sans l'ajouter ici fait rougir le typecheck.
  const salles = {
    creer: vi.fn(),
    listerDuPro: vi.fn(),
    trouverVivante: vi.fn(),
    trouverIdVivante: vi.fn(),
    mettreAJour: vi.fn(),
    archiver: vi.fn(),
    idProfilPro: vi.fn()
  } satisfies VenueStore;
  const referentiels = {
    communeExiste: vi.fn().mockResolvedValue(true),
    stylesExistent: vi.fn().mockResolvedValue(true),
    equipementsExistent: vi.fn().mockResolvedValue(true)
  } satisfies ReferentielsExistence;
  return { service: new VenuesService(salles, referentiels, fakeStorage), salles, referentiels };
}

/** Le port rend une LIGNE, pas un DTO : la fabrique la type pour que le double
 *  ne puisse pas rendre une forme que le mappeur ne saurait pas lire. */
const ligne = (overrides: Record<string, unknown> = {}) => venueRow(overrides) as unknown as VenueProRow;

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
    // La base n'est pas touchée : c'est le PORT qu'on vérifie muet, pas Prisma.
    expect(ctx.salles.trouverVivante).not.toHaveBeenCalled();
  });

  it("le port rend `null` (inexistante / supprimée / à un autre pro) : même 404", async () => {
    ctx.salles.trouverVivante.mockResolvedValue(null);
    await expect(ctx.service.getMine(USER_ID, VENUE_ID)).rejects.toSatisfy(isNotFoundVenue);
    // ⚠ Ce qui est mesuré ici est la TRADUCTION : `null` → 404 indistinct. La
    // forme du WHERE d'appartenance (id + vivante + à moi) est mesurée dans
    // `venue-store.prisma.spec.ts`, où elle est écrite.
    expect(ctx.salles.trouverVivante).toHaveBeenCalledWith(USER_ID, VENUE_ID);
  });
});

describe("VenuesService.update — mise à jour PARTIELLE réelle", () => {
  it("mise à jour partielle sans cityId : la ville n'est PAS re-vérifiée ; { status } seul passe tel quel", async () => {
    const { service, salles, referentiels } = buildService();
    salles.trouverVivante.mockResolvedValue(ligne());
    salles.mettreAJour.mockResolvedValue(ligne({ status: "HIDDEN" }));

    const dto = await service.update(USER_ID, VENUE_ID, { status: "HIDDEN" });

    expect(referentiels.communeExiste).not.toHaveBeenCalled();
    // ⚠ `undefined` sur les deux ensembles veut dire « ne touche pas » — c'est
    // ce qui distingue une mise à jour PARTIELLE d'un effacement de sélection.
    expect(salles.mettreAJour).toHaveBeenCalledWith(VENUE_ID, {
      champs: { status: "HIDDEN" },
      equipementIds: undefined,
      styleIds: undefined
    });
    expect(dto.status).toBe("HIDDEN");
  });
});

describe("VenuesService.create — slug unique avec reprise", () => {
  it("collision P2002 sur le premier candidat : retente avec le suffixe -2", async () => {
    const { service, salles } = buildService();
    salles.idProfilPro.mockResolvedValue("pp-1");
    // ⚠ LE SERVICE NE VOIT PLUS DE P2002. Il lit « slug pris », ce qui est la
    // seule chose dont sa boucle a besoin ; la traduction du code driver est
    // mesurée dans le spec de l'adaptateur.
    salles.creer
      .mockResolvedValueOnce({ ok: false, raison: "slugPris" })
      .mockResolvedValueOnce({ ok: true, salle: ligne({ slug: "salle-el-ferdous-2" }) });

    const dto = await service.create(USER_ID, CREATE_INPUT);

    expect(salles.creer).toHaveBeenCalledTimes(2);
    const slugs = salles.creer.mock.calls.map((c) => (c[0] as { slug: string }).slug);
    expect(slugs).toEqual(["salle-el-ferdous", "salle-el-ferdous-2"]);
    expect(dto.slug).toBe("salle-el-ferdous-2");
  });

  it("une panne du port remonte telle quelle — pas de reprise aveugle sur huit slugs", async () => {
    const { service, salles } = buildService();
    salles.idProfilPro.mockResolvedValue("pp-1");
    // ⚠ Une erreur N'EST PAS un « slug pris ». Si le service réessayait, il
    // taperait huit fois sur une base en panne avant de rendre un message qui
    // ne dirait rien de ce qui s'est passé.
    salles.creer.mockRejectedValue(new Error("panne réseau"));

    await expect(service.create(USER_ID, CREATE_INPUT)).rejects.toThrow("panne réseau");
    expect(salles.creer).toHaveBeenCalledTimes(1);
  });

  it("PRO sans ProProfile : rupture d'invariant D3 → Error (500), jamais un 4xx", async () => {
    const { service, salles } = buildService();
    salles.idProfilPro.mockResolvedValue(null);
    await expect(service.create(USER_ID, CREATE_INPUT)).rejects.toThrow(/Invariant D3/);
  });
});

describe("VenuesService.update — amenityIds (A3-① : remplacement d'ensemble)", () => {
  it("id inconnu du référentiel : 400 AMENITY_NOT_FOUND (comptage), update jamais appelé", async () => {
    const { service, salles, referentiels } = buildService();
    salles.trouverVivante.mockResolvedValue(ligne());
    referentiels.equipementsExistent.mockResolvedValue(false);

    await expect(
      service.update(USER_ID, VENUE_ID, {
        amenityIds: ["018f0000-0000-7000-8000-00000000a001", "018f0000-0000-7000-8000-00000000a002"]
      })
    ).rejects.toSatisfy(
      (e: unknown) =>
        e instanceof BadRequestException && (e.getResponse() as { code?: string }).code === "AMENITY_NOT_FOUND"
    );
    expect(salles.mettreAJour).not.toHaveBeenCalled();
  });

  it("doublons dédupliqués AVANT comptage et écriture ; remplacement imbriqué atomique (deleteMany + create)", async () => {
    const { service, salles, referentiels } = buildService();
    const A1 = "018f0000-0000-7000-8000-00000000a001";
    const A2 = "018f0000-0000-7000-8000-00000000a002";
    salles.trouverVivante.mockResolvedValue(ligne());
    salles.mettreAJour.mockResolvedValue(ligne({ amenities: [{ amenityId: A1 }, { amenityId: A2 }] }));

    const dto = await service.update(USER_ID, VENUE_ID, { amenityIds: [A1, A1, A2] });

    // ⚠ LA DÉDUPLICATION EST UNE DÉCISION DU SERVICE : elle se mesure ici, aux
    // DEUX endroits où elle compte — la vérification et l'écriture. Comment le
    // remplacement d'ensemble s'écrit en Prisma est mesuré dans l'adaptateur.
    expect(referentiels.equipementsExistent).toHaveBeenCalledWith([A1, A2]);
    expect(salles.mettreAJour).toHaveBeenCalledWith(VENUE_ID, {
      champs: {},
      equipementIds: [A1, A2],
      styleIds: undefined
    });
    expect(dto.amenityIds).toEqual([A1, A2]);
  });
});

describe("VenuesService — forme du DTO pro (allow-list)", () => {
  it("Decimal→number, dates ISO, et JAMAIS commissionRateBps/rejectionReason/deletedAt/ownerId", async () => {
    const { service, salles } = buildService();
    salles.trouverVivante.mockResolvedValue(ligne());

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
        "capacityMax",
        "basePriceCents",
        "bookingMode",
        "publicationStatus",
        "status",
        "amenityIds",
        "styleIds",
        "ceremonyType",
        "photos",
        "slotTemplates",
        "matterportModelId",
        "createdAt",
      "depositAmountCents",
      "depositRateBps",
        "updatedAt"
      ].sort()
    );
  });
});
