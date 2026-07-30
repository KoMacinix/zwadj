// Plages hebdomadaires de visite — Flux C, Lot C1, D47.
//
// ── Ce que ce service n'est PAS ──────────────────────────────────────────────
// Les visites ne partagent RIEN avec les réservations de fête : pas de
// `SlotTemplate`, pas de `PricingRule`, pas de prix, et pas de contrainte
// d'exclusion en base. Un pro déclare ici QUAND il fait visiter — « le dimanche
// de 09:00 à 17:00 » —, pas ce qu'il vend. Une visite est gratuite et
// s'auto-confirme (D47) ; l'approbation du pro n'existe pas dans ce flux.
//
// Le service vit dans le module `venues` parce que la propriété d'une salle s'y
// vérifie déjà : la séparation qu'impose D47 porte sur les DONNÉES et les
// ÉCRANS, pas sur le découpage NestJS. Aucun code de créneau de fête n'est
// réutilisé ici.
//
// ── Pourquoi refuser le chevauchement ────────────────────────────────────────
// Deux plages du même jour qui se recouvrent sont tolérables tant qu'on les
// lit ; elles cessent de l'être dès C2, qui les DÉCOUPERA en créneaux de
// rendez-vous : le même créneau sortirait deux fois. On refuse donc à
// l'écriture, là où le pro peut encore comprendre pourquoi.
//
// ⚠ Le chevauchement se calcule entre plages du MÊME `dayOfWeek` uniquement.
// Une plage du dimanche et une du lundi ne se rencontrent jamais, même si leurs
// minutes se recouvrent — ce sont deux jours différents de la semaine.
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  VenueErrorCode,
  type VisitAvailabilityCreateInput,
  type VisitAvailabilityDTO,
  type VisitAvailabilityUpdateInput
} from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";

const VISIT_SELECT = {
  id: true,
  dayOfWeek: true,
  startMinutes: true,
  endMinutes: true,
  isActive: true,
  createdAt: true
} as const;

/** Même ordre partout : par jour, puis par heure, puis par id. L'ordre ne doit
 *  pas dépendre de l'endroit d'où on regarde. */
const VISIT_ORDER_BY = [{ dayOfWeek: "asc" }, { startMinutes: "asc" }, { id: "asc" }] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface VisitRow {
  id: string;
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
  isActive: boolean;
  createdAt: Date;
}

const toDTO = (row: VisitRow): VisitAvailabilityDTO => ({
  id: row.id,
  dayOfWeek: row.dayOfWeek,
  startMinutes: row.startMinutes,
  endMinutes: row.endMinutes,
  isActive: row.isActive,
  createdAt: row.createdAt.toISOString()
});

type VisitTx = Pick<PrismaService, "venue" | "visitAvailability">;

@Injectable()
export class VisitAvailabilitiesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, venueId: string): Promise<VisitAvailabilityDTO[]> {
    await this.ownedVenue(this.prisma, userId, venueId);
    const rows = await this.prisma.visitAvailability.findMany({
      where: { venueId },
      orderBy: [...VISIT_ORDER_BY],
      select: VISIT_SELECT
    });
    return rows.map(toDTO);
  }

  async create(
    userId: string,
    venueId: string,
    input: VisitAvailabilityCreateInput
  ): Promise<VisitAvailabilityDTO> {
    return this.prisma.$transaction(async (tx) => {
      await this.ownedVenue(tx, userId, venueId);
      await this.assertNoOverlap(tx, venueId, input.dayOfWeek, input.startMinutes, input.endMinutes, null);
      const row = await tx.visitAvailability.create({ data: { venueId, ...input }, select: VISIT_SELECT });
      return toDTO(row);
    });
  }

  async update(
    userId: string,
    venueId: string,
    availabilityId: string,
    input: VisitAvailabilityUpdateInput
  ): Promise<VisitAvailabilityDTO> {
    return this.prisma.$transaction(async (tx) => {
      await this.ownedVenue(tx, userId, venueId);
      const existing = await this.owned(tx, venueId, availabilityId);

      // Le chevauchement se vérifie sur l'état RÉSULTANT, pas sur le patch :
      // déplacer une plage d'une heure peut la faire tomber sur sa voisine,
      // alors qu'aucun champ du patch ne le laissait voir.
      const next = {
        dayOfWeek: input.dayOfWeek ?? existing.dayOfWeek,
        startMinutes: input.startMinutes ?? existing.startMinutes,
        endMinutes: input.endMinutes ?? existing.endMinutes
      };
      if (next.endMinutes <= next.startMinutes) {
        throw new ConflictException({
          code: VenueErrorCode.VISIT_AVAILABILITY_OVERLAP,
          message: "venue.errors.visitOverlap"
        });
      }
      await this.assertNoOverlap(
        tx,
        venueId,
        next.dayOfWeek,
        next.startMinutes,
        next.endMinutes,
        availabilityId
      );

      const row = await tx.visitAvailability.update({
        where: { id: availabilityId },
        data: input,
        select: VISIT_SELECT
      });
      return toDTO(row);
    });
  }

  /** Suppression DURE. Une visite déjà réservée ne référence PAS sa plage
   *  (`VisitBooking` porte un `scheduledAt`, pas un `visitAvailabilityId`) :
   *  retirer la plage n'orpheline rien et n'annule aucun rendez-vous pris. */
  async remove(userId: string, venueId: string, availabilityId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.ownedVenue(tx, userId, venueId);
      await this.owned(tx, venueId, availabilityId);
      await tx.visitAvailability.delete({ where: { id: availabilityId } });
    });
  }

  /** Recouvrement SEMI-OUVERT : deux plages qui se touchent (17:00 puis 17:00)
   *  ne se chevauchent pas — un pro qui déclare « matin » et « après-midi »
   *  bout à bout ne doit pas être refusé. */
  private async assertNoOverlap(
    tx: VisitTx,
    venueId: string,
    dayOfWeek: number,
    startMinutes: number,
    endMinutes: number,
    exceptId: string | null
  ): Promise<void> {
    const clash = await tx.visitAvailability.findFirst({
      where: {
        venueId,
        dayOfWeek,
        ...(exceptId ? { id: { not: exceptId } } : {}),
        startMinutes: { lt: endMinutes },
        endMinutes: { gt: startMinutes }
      },
      select: { id: true }
    });
    if (clash) {
      throw new ConflictException({
        code: VenueErrorCode.VISIT_AVAILABILITY_OVERLAP,
        message: "venue.errors.visitOverlap"
      });
    }
  }

  /** 404 INDISTINCT « dans MA salle » : id malformé, inexistant, ou plage
   *  d'une autre salle — anti-énumération (doctrine A2). */
  private async owned(tx: VisitTx, venueId: string, availabilityId: string): Promise<VisitRow> {
    const row = UUID_PATTERN.test(availabilityId)
      ? await tx.visitAvailability.findFirst({ where: { id: availabilityId, venueId }, select: VISIT_SELECT })
      : null;
    if (!row) {
      throw new NotFoundException({
        code: VenueErrorCode.VISIT_AVAILABILITY_NOT_FOUND,
        message: "venue.errors.visitNotFound"
      });
    }
    return row;
  }

  private async ownedVenue(tx: VisitTx, userId: string, venueId: string): Promise<void> {
    const venue = UUID_PATTERN.test(venueId)
      ? await tx.venue.findFirst({ where: { id: venueId, deletedAt: null, owner: { userId } }, select: { id: true } })
      : null;
    if (!venue) {
      throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
    }
  }
}
