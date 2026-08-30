// ⛔ S10a — LES FORMES DE REQUÊTE, MESURÉES LÀ OÙ ELLES SONT ÉCRITES.
//
// ⚠ CE FICHIER N'EST PAS NEUF : quatre de ses assertions viennent de
// `venues.service.spec.ts`, où elles ne pouvaient plus vivre — le service ne
// connaît plus Prisma. Elles n'ont pas disparu dans le déménagement, elles ont
// suivi le code qu'elles mesurent (MD2 du cadrage S10).
//
// ⚠ ET LE CAST N'A PAS DISPARU DU DÉPÔT, IL A CHANGÉ D'ENDROIT — c'est le point
// du lot. `as unknown as PrismaService` était intenable dans le spec du
// SERVICE : il y désactivait le contrôle de type sur des DÉCISIONS. Ici, la
// classe testée a pour métier de parler à Prisma, et ce qu'on mesure est la
// CHARGE UTILE envoyée. Mesurer une liste d'appels est le bon niveau pour un
// adaptateur ; c'était le mauvais pour un service (MD7).
import { beforeEach, describe, expect, it, vi } from "vitest";
import type { PrismaService } from "../prisma/prisma.service";
import { PrismaReferentielsExistence, PrismaVenueStore } from "./venue-store.prisma";
import { VENUE_PRO_SELECT } from "./venue-store.types";

const USER_ID = "018f0000-0000-7000-8000-00000000aaaa";
const VENUE_ID = "018f0000-0000-7000-8000-00000000eeee";
const CITY_ID = "018f0000-0000-7000-8000-00000000cccc";

function build() {
  const prisma = {
    proProfile: { findUnique: vi.fn() },
    city: { findUnique: vi.fn() },
    amenity: { count: vi.fn() },
    venueStyle: { count: vi.fn() },
    venue: { create: vi.fn(), findFirst: vi.fn(), findMany: vi.fn(), update: vi.fn() }
  };
  const client = prisma as unknown as PrismaService;
  return { prisma, salles: new PrismaVenueStore(client), referentiels: new PrismaReferentielsExistence(client) };
}

describe("PrismaVenueStore — le WHERE d'appartenance n'existe qu'à UN endroit", () => {
  let ctx: ReturnType<typeof build>;
  beforeEach(() => {
    ctx = build();
  });

  it("⛔ `trouverVivante` : id + vivante + à moi, en un seul WHERE, avec l'allow-list", async () => {
    // Assertion VENUE DU SPEC DU SERVICE. Toute divergence de ce WHERE rouvre un
    // trou d'énumération : la doctrine ne doit jamais exister en double (A4-④).
    ctx.prisma.venue.findFirst.mockResolvedValue(null);
    await ctx.salles.trouverVivante(USER_ID, VENUE_ID);
    expect(ctx.prisma.venue.findFirst).toHaveBeenCalledWith({
      where: { id: VENUE_ID, deletedAt: null, owner: { userId: USER_ID } },
      select: VENUE_PRO_SELECT
    });
  });

  it("⚠ `trouverIdVivante` : MÊME WHERE, mais un select ID SEUL", async () => {
    // Le select complet embarque photos, scènes et liaisons. Le module média
    // n'a besoin que de l'id ; fusionner les deux méthodes ferait payer ce
    // select à CHAQUE contrôle d'appartenance.
    ctx.prisma.venue.findFirst.mockResolvedValue({ id: VENUE_ID });
    const id = await ctx.salles.trouverIdVivante(USER_ID, VENUE_ID);
    expect(ctx.prisma.venue.findFirst).toHaveBeenCalledWith({
      where: { id: VENUE_ID, deletedAt: null, owner: { userId: USER_ID } },
      select: { id: true }
    });
    expect(id).toBe(VENUE_ID);
  });

  it("les deux rendent `null` — jamais une exception : le port ne lève pas", async () => {
    ctx.prisma.venue.findFirst.mockResolvedValue(null);
    await expect(ctx.salles.trouverVivante(USER_ID, VENUE_ID)).resolves.toBeNull();
    await expect(ctx.salles.trouverIdVivante(USER_ID, VENUE_ID)).resolves.toBeNull();
  });
});

describe("PrismaVenueStore.creer — P2002 devient une RÉPONSE, le reste remonte", () => {
  it("⛔ collision d'unicité : `{ ok: false, raison: 'slugPris' }`", async () => {
    // Assertion VENUE DU SPEC DU SERVICE. C'est ICI que le code du driver est
    // traduit ; le service, lui, ne doit plus jamais voir « P2002 ».
    const { prisma, salles } = build();
    prisma.venue.create.mockRejectedValue({ code: "P2002" });
    await expect(salles.creer({ ownerId: "pp-1", slug: "s", cityId: CITY_ID, nameFr: "A", nameAr: "ب", capacityMax: 1, basePriceCents: 1 })).resolves.toEqual({
      ok: false,
      raison: "slugPris"
    });
  });

  it("⛔ toute AUTRE erreur remonte — une base en panne n'est pas un slug pris", async () => {
    // Assertion VENUE DU SPEC DU SERVICE. Si l'adaptateur l'avalait, le service
    // boucherait sur huit candidats avant de rendre un message muet.
    const { prisma, salles } = build();
    prisma.venue.create.mockRejectedValue(new Error("panne réseau"));
    await expect(
      salles.creer({ ownerId: "pp-1", slug: "s", cityId: CITY_ID, nameFr: "A", nameAr: "ب", capacityMax: 1, basePriceCents: 1 })
    ).rejects.toThrow("panne réseau");
  });

  it("⚠ le slug et le propriétaire sont écrits, jamais le statut de publication", async () => {
    // publicationStatus (DRAFT), status (ACTIVE) et commissionRateBps (100) sont
    // des défauts Prisma/SQL : un pro ne les fournit JAMAIS, et l'adaptateur ne
    // doit pas les inventer.
    const { prisma, salles } = build();
    prisma.venue.create.mockResolvedValue({ id: VENUE_ID });
    await salles.creer({ ownerId: "pp-1", slug: "salle-2", cityId: CITY_ID, nameFr: "A", nameAr: "ب", capacityMax: 1, basePriceCents: 1 });
    const charge = prisma.venue.create.mock.calls[0]![0] as { data: Record<string, unknown>; select: unknown };
    expect(charge.data.slug).toBe("salle-2");
    expect(charge.data.ownerId).toBe("pp-1");
    expect(Object.keys(charge.data)).not.toContain("publicationStatus");
    expect(Object.keys(charge.data)).not.toContain("status");
    expect(charge.select).toBe(VENUE_PRO_SELECT);
  });
});

describe("PrismaVenueStore.mettreAJour — le remplacement d'ensemble s'écrit ici", () => {
  it("⛔ `deleteMany` + `create` dans le MÊME update — atomique, et `@updatedAt` bouge", async () => {
    // Assertion VENUE DU SPEC DU SERVICE. En deux requêtes, une salle pourrait
    // rester un instant sans aucun équipement.
    const A1 = "a-1";
    const A2 = "a-2";
    const { prisma, salles } = build();
    prisma.venue.update.mockResolvedValue({ id: VENUE_ID });
    await salles.mettreAJour(VENUE_ID, { champs: {}, equipementIds: [A1, A2] });
    expect(prisma.venue.update).toHaveBeenCalledWith({
      where: { id: VENUE_ID },
      data: { amenities: { deleteMany: {}, create: [{ amenityId: A1 }, { amenityId: A2 }] } },
      select: VENUE_PRO_SELECT
    });
  });

  it("⚠ `undefined` ne touche PAS l'ensemble — une liste VIDE l'efface", async () => {
    // La distinction qui fait qu'une mise à jour partielle reste partielle.
    const { prisma, salles } = build();
    prisma.venue.update.mockResolvedValue({ id: VENUE_ID });

    await salles.mettreAJour(VENUE_ID, { champs: { status: "HIDDEN" } });
    expect((prisma.venue.update.mock.calls[0]![0] as { data: Record<string, unknown> }).data).toEqual({ status: "HIDDEN" });

    await salles.mettreAJour(VENUE_ID, { champs: {}, styleIds: [] });
    expect((prisma.venue.update.mock.calls[1]![0] as { data: Record<string, unknown> }).data).toEqual({
      styles: { deleteMany: {}, create: [] }
    });
  });

  it("⛔ `archiver` est un SOFT delete — jamais un DELETE sur `venues`", async () => {
    const { prisma, salles } = build();
    prisma.venue.update.mockResolvedValue({ id: VENUE_ID });
    await salles.archiver(VENUE_ID);
    const charge = prisma.venue.update.mock.calls[0]![0] as { data: { deletedAt?: Date } };
    expect(charge.data.deletedAt).toBeInstanceOf(Date);
    expect(prisma.venue).not.toHaveProperty("delete");
  });
});

describe("PrismaReferentielsExistence — une DÉCISION, pas un compte", () => {
  it("⛔ une liste VIDE est vraie SANS interroger la base", async () => {
    const { prisma, referentiels } = build();
    await expect(referentiels.stylesExistent([])).resolves.toBe(true);
    await expect(referentiels.equipementsExistent([])).resolves.toBe(true);
    expect(prisma.venueStyle.count).not.toHaveBeenCalled();
    expect(prisma.amenity.count).not.toHaveBeenCalled();
  });

  it("⛔ un id manquant rend FAUX — la comparaison est faite ici, pas chez l'appelant", async () => {
    // Assertion VENUE DU SPEC DU SERVICE (`amenity.count` avec les ids
    // dédupliqués). Rendre le compte obligerait chaque appelant à refaire la
    // comparaison — et à se tromper de sens un jour, en silence.
    const { prisma, referentiels } = build();
    prisma.amenity.count.mockResolvedValue(1);
    await expect(referentiels.equipementsExistent(["a-1", "a-2"])).resolves.toBe(false);
    expect(prisma.amenity.count).toHaveBeenCalledWith({ where: { id: { in: ["a-1", "a-2"] } } });

    prisma.venueStyle.count.mockResolvedValue(2);
    await expect(referentiels.stylesExistent(["s-1", "s-2"])).resolves.toBe(true);
  });

  it("`communeExiste` rend un booléen, jamais la ligne", async () => {
    const { prisma, referentiels } = build();
    prisma.city.findUnique.mockResolvedValue(null);
    await expect(referentiels.communeExiste(CITY_ID)).resolves.toBe(false);
    prisma.city.findUnique.mockResolvedValue({ id: CITY_ID });
    await expect(referentiels.communeExiste(CITY_ID)).resolves.toBe(true);
  });

  it("⚠ `idProfilPro` CONSTATE l'absence, il ne la juge pas", async () => {
    // La rupture d'invariant D3 est levée par le SERVICE. Un port qui lèverait
    // remettrait un code applicatif dans la couche qui parle à PostgreSQL.
    const { prisma, salles } = build();
    prisma.proProfile.findUnique.mockResolvedValue(null);
    await expect(salles.idProfilPro(USER_ID)).resolves.toBeNull();
  });
});
