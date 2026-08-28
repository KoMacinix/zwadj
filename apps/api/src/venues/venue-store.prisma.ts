// ⛔ S10a — L'ADAPTATEUR PRISMA DES DEUX PORTS SALLE.
//
// ⚠ C'EST LE SEUL FICHIER DU MODULE QUI SAIT QUE LA BASE EST PostgreSQL.
// Les formes de requête — allow-list, WHERE d'appartenance, remplacement
// d'ensemble, codes d'erreur du driver — vivent ici et nulle part ailleurs.
// Les tests qui les mesuraient ont déménagé avec elles
// (`venue-store.prisma.spec.ts`) : ils n'ont pas disparu, ils ont suivi le code.
import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import {
  type DonneesCreationSalle,
  type MiseAJourSalle,
  type ReferentielsExistence,
  type ResultatCreationSalle,
  VENUE_PRO_SELECT,
  type VenueProRow,
  type VenueStore
} from "./venue-store.types";

/** P2002 sans dépendre de la classe d'erreur générée — le client est régénéré à
 *  chaque `prisma generate`, et `instanceof` sur un type régénéré est une
 *  promesse fragile. Forme reprise de `venues.service.ts`, d'où elle vient. */
function estViolationUnicite(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: unknown }).code === "P2002";
}

@Injectable()
export class PrismaVenueStore implements VenueStore {
  constructor(private readonly prisma: PrismaService) {}

  /** ⛔ L'UNIQUE DÉFINITION DU WHERE D'APPARTENANCE (A4-④) : id + vivante + à
   *  moi. Volontairement SANS filtre sur `status` — un pro gère les médias
   *  d'une salle HIDDEN ou TEMPORARILY_UNAVAILABLE, c'est souvent pour ça
   *  qu'elle est masquée. Toute divergence (un 403 quelque part…) rouvrirait un
   *  trou d'énumération : la doctrine ne doit jamais exister en double. */
  private appartenance(userId: string, venueId: string): { id: string; deletedAt: null; owner: { userId: string } } {
    return { id: venueId, deletedAt: null, owner: { userId } };
  }

  async creer(donnees: DonneesCreationSalle): Promise<ResultatCreationSalle> {
    const { ownerId, slug, ...champs } = donnees;
    try {
      const salle = await this.prisma.venue.create({
        data: {
          ownerId,
          slug,
          cityId: champs.cityId,
          nameFr: champs.nameFr,
          nameAr: champs.nameAr,
          taglineFr: champs.taglineFr,
          taglineAr: champs.taglineAr,
          descriptionFr: champs.descriptionFr,
          descriptionAr: champs.descriptionAr,
          districtFr: champs.districtFr,
          districtAr: champs.districtAr,
          address: champs.address,
          lat: champs.lat,
          lng: champs.lng,
          capacityMax: champs.capacityMax,
          basePriceCents: champs.basePriceCents,
          bookingMode: champs.bookingMode
          // publicationStatus (DRAFT), status (ACTIVE), commissionRateBps (100) :
          // défauts Prisma/SQL — un pro ne les fournit jamais.
        },
        select: VENUE_PRO_SELECT
      });
      return { ok: true, salle };
    } catch (error) {
      // ⚠ SEULE la collision d'unicité devient un résultat. Tout le reste
      // remonte : une base injoignable n'est pas un slug pris, et l'avaler
      // ferait boucler le service sur huit candidats avant de rendre une
      // erreur qui ne dirait rien de ce qui s'est passé.
      if (!estViolationUnicite(error)) throw error;
      return { ok: false, raison: "slugPris" };
    }
  }

  async listerDuPro(userId: string): Promise<VenueProRow[]> {
    return this.prisma.venue.findMany({
      where: { deletedAt: null, owner: { userId } },
      orderBy: { updatedAt: "desc" }, // la plus récemment touchée en tête (UI Pro, A5)
      select: VENUE_PRO_SELECT
    });
  }

  async trouverVivante(userId: string, venueId: string): Promise<VenueProRow | null> {
    return this.prisma.venue.findFirst({ where: this.appartenance(userId, venueId), select: VENUE_PRO_SELECT });
  }

  async trouverIdVivante(userId: string, venueId: string): Promise<string | null> {
    const row = await this.prisma.venue.findFirst({
      where: this.appartenance(userId, venueId),
      select: { id: true }
    });
    return row?.id ?? null;
  }

  async mettreAJour(venueId: string, maj: MiseAJourSalle): Promise<VenueProRow> {
    return this.prisma.venue.update({
      where: { id: venueId },
      // ⚠ Le remplacement d'ensemble s'écrit ICI, dans le MÊME update que les
      // colonnes : atomique, et `@updatedAt` bouge — changer ses équipements,
      // c'est bien « toucher » la salle. En deux requêtes, une salle pourrait
      // rester un instant sans aucun équipement.
      data: {
        ...maj.champs,
        ...(maj.equipementIds === undefined
          ? {}
          : { amenities: { deleteMany: {}, create: maj.equipementIds.map((amenityId) => ({ amenityId })) } }),
        ...(maj.styleIds === undefined
          ? {}
          : { styles: { deleteMany: {}, create: maj.styleIds.map((styleId) => ({ styleId })) } })
      },
      select: VENUE_PRO_SELECT
    });
  }

  async archiver(venueId: string): Promise<void> {
    // Soft delete uniquement — jamais de DELETE SQL sur `venues`.
    await this.prisma.venue.update({ where: { id: venueId }, data: { deletedAt: new Date() }, select: { id: true } });
  }

  async idProfilPro(userId: string): Promise<string | null> {
    const profil = await this.prisma.proProfile.findUnique({ where: { userId }, select: { id: true } });
    return profil?.id ?? null;
  }
}

@Injectable()
export class PrismaReferentielsExistence implements ReferentielsExistence {
  constructor(private readonly prisma: PrismaService) {}

  async communeExiste(cityId: string): Promise<boolean> {
    const city = await this.prisma.city.findUnique({ where: { id: cityId }, select: { id: true } });
    return city !== null;
  }

  async stylesExistent(styleIds: string[]): Promise<boolean> {
    // ⚠ Liste vide : vrai SANS requête. « Tous ces zéro ids existent » est
    // vacuement vrai, et effacer une sélection est légitime (A3-①, D65).
    if (styleIds.length === 0) return true;
    const trouves = await this.prisma.venueStyle.count({ where: { id: { in: styleIds } } });
    // ⚠ La comparaison appartient à celui qui a fait la requête. Rendre le
    // compte obligerait chaque appelant à la refaire — et à se tromper de sens
    // un jour, en silence.
    return trouves === styleIds.length;
  }

  async equipementsExistent(amenityIds: string[]): Promise<boolean> {
    if (amenityIds.length === 0) return true;
    const trouves = await this.prisma.amenity.count({ where: { id: { in: amenityIds } } });
    return trouves === amenityIds.length;
  }
}
