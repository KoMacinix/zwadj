// Catalogue de prestations d'une salle — Flux E, Lot E2a.
//
// ── D89 : le service et son tarif naissent ENSEMBLE ──────────────────────────
// La migration `20260707000001` l'écrit noir sur blanc : la base garantit la
// FORME d'une ligne `service_pricings` isolée, mais elle ne peut PAS vérifier
// que le mode rempli corresponde au `pricingType` déclaré, ni qu'un TIERED ait
// des paliers sans ligne de prix. Cette moitié-là est applicative.
//
// D'où un seul endpoint et une seule transaction. Deux appels laisseraient une
// fenêtre — courte, mais réelle — pendant laquelle un service FIXED existe sans
// prix, donc apparaît au catalogue à zéro dinar.
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  ServiceErrorCode,
  ServicePricingType,
  type ServiceCreateInput,
  type ServiceDTO,
  type ServiceUpdateInput
} from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

const SERVICE_SELECT = {
  id: true,
  venueId: true,
  nameFr: true,
  nameAr: true,
  descriptionFr: true,
  descriptionAr: true,
  pricingType: true,
  isActive: true,
  sortOrder: true,
  pricing: {
    select: {
      fixedPriceCents: true,
      perGuestPriceCents: true,
      perUnitPriceCents: true,
      unitNameFr: true,
      unitNameAr: true,
      minUnits: true,
      maxUnits: true
    }
  },
  tiers: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    select: { id: true, labelFr: true, labelAr: true, priceCents: true, sortOrder: true, isActive: true }
  }
  // ⚠ `satisfies` et NON `as const` : `as const` rend le tableau `orderBy`
  //   *readonly*, et les types générés par Prisma refusent un tableau
  //   immuable à cet endroit. `satisfies` valide la forme sans élargir les
  //   littéraux `true` — ce qu'un simple annotation de type ferait.
} satisfies Prisma.ServiceSelect;

/** Plafond du catalogue d'une salle. Ce n'est pas une limite technique : une
 *  liste de cinquante prestations ne se choisit pas sur un téléphone, et un pro
 *  qui en arrive là a besoin de catégories, pas d'une case de plus. */
const MAX_SERVICES_PER_VENUE = 40;

@Injectable()
export class ServicesService {
  constructor(private readonly prisma: PrismaService) {}

  async listForVenue(userId: string, venueId: string): Promise<ServiceDTO[]> {
    await this.ownedVenue(userId, venueId);
    const rows = await this.prisma.service.findMany({
      where: { venueId },
      orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
      select: SERVICE_SELECT
    });
    return rows.map(toServiceDTO);
  }

  async create(userId: string, venueId: string, input: ServiceCreateInput): Promise<ServiceDTO> {
    await this.ownedVenue(userId, venueId);

    const existing = await this.prisma.service.count({ where: { venueId } });
    if (existing >= MAX_SERVICES_PER_VENUE) {
      throw new ConflictException({
        code: ServiceErrorCode.SERVICE_UNAVAILABLE,
        message: "service.errors.tooMany"
      });
    }

    // UNE transaction : le service, puis SON tarif ou SES paliers. Si la seconde
    // écriture échoue, la première est annulée — pas de prestation orpheline au
    // catalogue.
    const created = await this.prisma.$transaction(async (tx) => {
      const service = await tx.service.create({
        data: {
          venueId,
          nameFr: input.nameFr,
          nameAr: input.nameAr,
          descriptionFr: input.descriptionFr ?? null,
          descriptionAr: input.descriptionAr ?? null,
          pricingType: input.pricingType,
          sortOrder: input.sortOrder ?? 0
        },
        select: { id: true }
      });

      if (input.pricingType === ServicePricingType.TIERED) {
        // Zod a déjà exigé au moins un palier : le catalogue ne peut pas
        // contenir un TIERED que personne ne peut choisir.
        await tx.serviceTier.createMany({
          data: input.tiers.map((tier, index) => ({
            serviceId: service.id,
            labelFr: tier.labelFr,
            labelAr: tier.labelAr,
            priceCents: tier.priceCents,
            sortOrder: tier.sortOrder ?? index
          }))
        });
      } else {
        await tx.servicePricing.create({
          data: {
            serviceId: service.id,
            fixedPriceCents: input.pricingType === ServicePricingType.FIXED ? input.fixedPriceCents : null,
            perGuestPriceCents: input.pricingType === ServicePricingType.PER_GUEST ? input.perGuestPriceCents : null,
            perUnitPriceCents: input.pricingType === ServicePricingType.PER_UNIT ? input.perUnitPriceCents : null,
            unitNameFr: input.pricingType === ServicePricingType.PER_UNIT ? input.unitNameFr : null,
            unitNameAr: input.pricingType === ServicePricingType.PER_UNIT ? input.unitNameAr : null,
            minUnits: input.pricingType === ServicePricingType.PER_UNIT ? (input.minUnits ?? null) : null,
            maxUnits: input.pricingType === ServicePricingType.PER_UNIT ? (input.maxUnits ?? null) : null
          }
        });
      }

      return tx.service.findUniqueOrThrow({ where: { id: service.id }, select: SERVICE_SELECT });
    });

    return toServiceDTO(created);
  }

  /** Mise à jour des seuls champs qui n'engagent aucun montant.
   *
   *  ⚠ Le `pricingType` NE CHANGE PAS, et les PRIX non plus. Basculer un FIXED
   *  en TIERED laisserait derrière des lignes de réservation snapshotées sur un
   *  type qui n'existe plus. Supprimer puis recréer est plus honnête — et c'est
   *  un geste que le pro comprend, contrairement à une bascule silencieuse. */
  async update(userId: string, serviceId: string, input: ServiceUpdateInput): Promise<ServiceDTO> {
    const row = await this.ownedService(userId, serviceId);
    const updated = await this.prisma.service.update({
      where: { id: row.id },
      data: {
        ...(input.nameFr === undefined ? {} : { nameFr: input.nameFr }),
        ...(input.nameAr === undefined ? {} : { nameAr: input.nameAr }),
        ...(input.descriptionFr === undefined ? {} : { descriptionFr: input.descriptionFr }),
        ...(input.descriptionAr === undefined ? {} : { descriptionAr: input.descriptionAr }),
        ...(input.isActive === undefined ? {} : { isActive: input.isActive }),
        ...(input.sortOrder === undefined ? {} : { sortOrder: input.sortOrder })
      },
      select: SERVICE_SELECT
    });
    return toServiceDTO(updated);
  }

  /** Suppression DURE, réservée au cas RARE : « créée par erreur, jamais
   *  utilisée ». Elle est refusée dès que la prestation figure sur une
   *  réservation.
   *
   *  Le geste COURANT — un pro qui arrête un service — est `isActive: false` :
   *  réversible, et c'est celui que l'écran met en avant.
   *
   *  ⚠ Pourquoi refuser alors que `onDelete: SetNull` protège déjà les
   *  snapshots ? Parce que le snapshot sauve l'AFFICHAGE, pas la JOINTURE :
   *  une fois `serviceId` mis à NULL, plus rien ne permet de répondre à
   *  « combien de fois cette prestation a-t-elle été vendue ». Un nettoyage de
   *  catalogue effacerait en silence l'historique commercial du pro. */
  async remove(userId: string, serviceId: string): Promise<void> {
    const row = await this.ownedService(userId, serviceId);

    const used = await this.prisma.bookingService.count({ where: { serviceId: row.id } });
    if (used > 0) {
      throw new ConflictException({
        code: ServiceErrorCode.SERVICE_IN_USE,
        message: "service.errors.inUse"
      });
    }

    await this.prisma.service.delete({ where: { id: row.id } });
  }

  /** 404 INDISTINCT (D47) : id malformé, inexistant, ou salle d'un autre pro. */
  private async ownedVenue(userId: string, venueId: string): Promise<void> {
    if (!UUID_PATTERN.test(venueId)) this.throwNotFound();
    const owned = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null, owner: { userId } },
      select: { id: true }
    });
    if (!owned) this.throwNotFound();
  }

  private async ownedService(userId: string, serviceId: string): Promise<{ id: string }> {
    if (!UUID_PATTERN.test(serviceId)) this.throwNotFound();
    const row = await this.prisma.service.findFirst({
      where: { id: serviceId, venue: { deletedAt: null, owner: { userId } } },
      select: { id: true }
    });
    if (!row) this.throwNotFound();
    return row;
  }

  private throwNotFound(): never {
    throw new NotFoundException({ code: ServiceErrorCode.SERVICE_NOT_FOUND, message: "service.errors.notFound" });
  }

}

/** Réexporté pour le service des réservations : une seule définition du SELECT,
 *  sinon deux vérités sur les colonnes que le calcul de ligne attend. */
/** Mapper PARTAGÉ avec la vue publique. Une seconde copie divergerait au
 *  premier champ ajouté — et c'est le contrat client qui mentirait. */
export function toServiceDTO(row: {
  id: string;
  venueId: string;
  nameFr: string;
  nameAr: string;
  descriptionFr: string | null;
  descriptionAr: string | null;
  pricingType: string;
  isActive: boolean;
  sortOrder: number;
  pricing: {
    fixedPriceCents: number | null;
    perGuestPriceCents: number | null;
    perUnitPriceCents: number | null;
    unitNameFr: string | null;
    unitNameAr: string | null;
    minUnits: number | null;
    maxUnits: number | null;
  } | null;
  tiers: { id: string; labelFr: string; labelAr: string; priceCents: number; sortOrder: number; isActive: boolean }[];
}): ServiceDTO {
  return {
    id: row.id,
    venueId: row.venueId,
    nameFr: row.nameFr,
    nameAr: row.nameAr,
    descriptionFr: row.descriptionFr,
    descriptionAr: row.descriptionAr,
    pricingType: row.pricingType as ServiceDTO["pricingType"],
    isActive: row.isActive,
    sortOrder: row.sortOrder,
    fixedPriceCents: row.pricing?.fixedPriceCents ?? null,
    perGuestPriceCents: row.pricing?.perGuestPriceCents ?? null,
    perUnitPriceCents: row.pricing?.perUnitPriceCents ?? null,
    unitNameFr: row.pricing?.unitNameFr ?? null,
    unitNameAr: row.pricing?.unitNameAr ?? null,
    minUnits: row.pricing?.minUnits ?? null,
    maxUnits: row.pricing?.maxUnits ?? null,
    tiers: row.tiers
  };
}

export { SERVICE_SELECT };


