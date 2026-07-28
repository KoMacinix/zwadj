// Créneaux de fête — Lot B1, D46. Le prix appartient au CRÉNEAU.
//
// Quatre invariants, tous vérifiés DANS la transaction qui écrit :
//   1. pas de chevauchement entre créneaux ACTIFS d'une même salle ;
//   2. `SINGLE_SLOT` ⇒ exactement un créneau actif ;
//   3. une salle PUBLIÉE garde au moins un créneau actif ;
//   4. `venues.base_price_cents` = minimum des créneaux actifs.
//
// Le point 4 est la raison d'être de la transaction : la recherche publique
// (A3/A7) filtre et trie sur cette colonne. La laisser diverger, ne serait-ce
// qu'une seconde, c'est afficher un « à partir de » faux sur une page publique
// — un problème d'argent, pas d'affichage.
import { BadRequestException, ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  VenueErrorCode,
  type SlotTemplateCreateInput,
  type SlotTemplateDTO,
  type SlotTemplateUpdateInput
} from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import { syncVenueBasePrice, toPricingRuleDTO } from "./pricing-rules.service";

/** Ligne minimale : tout ce que le DTO expose, plus rien. */
const SLOT_SELECT = {
  id: true,
  nameFr: true,
  nameAr: true,
  startMinutes: true,
  endMinutes: true,
  basePriceCents: true,
  isActive: true,
  createdAt: true
} as const;

/** Ordre DÉTERMINISTE partout (discipline A3) : heure de début, puis id. */
export const SLOT_ORDER_BY = [{ startMinutes: "asc" }, { id: "asc" }] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface SlotRow {
  /** Optionnel : le service des créneaux ne les sélectionne pas, le DTO pro si. */
  pricingRules?: Parameters<typeof toPricingRuleDTO>[0][];
  id: string;
  nameFr: string;
  nameAr: string;
  startMinutes: number;
  endMinutes: number;
  basePriceCents: number;
  isActive: boolean;
  createdAt: Date;
}

export function toSlotTemplateDTO(row: SlotRow): SlotTemplateDTO {
  return {
    id: row.id,
    nameFr: row.nameFr,
    nameAr: row.nameAr,
    startMinutes: row.startMinutes,
    endMinutes: row.endMinutes,
    basePriceCents: row.basePriceCents,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString(),
    pricingRules: (row.pricingRules ?? []).map(toPricingRuleDTO)
  };
}

/** Chevauchement de deux intervalles semi-ouverts [start, end), exprimés en
 *  minutes depuis minuit du jour de DÉBUT. Deux créneaux qui se TOUCHENT
 *  (14h–18h et 18h–22h) ne se chevauchent PAS : c'est le cas normal d'une
 *  salle matin/soir, il doit passer.
 *
 *  La fin peut dépasser 1440 — une soirée 20h → 02h vaut 1200 → 1560, et c'est
 *  le cas NORMAL d'un mariage algérien. La comparaison reste juste tant que les
 *  deux créneaux sont exprimés dans ce même repère, ce que garantit le CHECK
 *  `slot_templates_minutes_valid`. */
export function overlaps(a: { startMinutes: number; endMinutes: number }, b: SlotRow): boolean {
  return a.startMinutes < b.endMinutes && b.startMinutes < a.endMinutes;
}

@Injectable()
export class SlotTemplatesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(userId: string, venueId: string, input: SlotTemplateCreateInput): Promise<SlotTemplateDTO> {
    return this.prisma.$transaction(async (tx) => {
      const venue = await this.ownedVenue(tx, userId, venueId);
      const existing = await this.activeSlots(tx, venueId);

      this.assertNoOverlap(input, existing);
      // SINGLE_SLOT : un créneau actif existe déjà ⇒ le second est refusé. Le
      // pro doit d'abord désactiver l'ancien, ou passer la salle en MULTI_SLOT.
      if (venue.bookingMode === "SINGLE_SLOT" && existing.length >= 1) {
        throw new ConflictException({
          code: VenueErrorCode.SLOT_TEMPLATE_SINGLE_MODE,
          message: "venue.errors.slotSingleMode"
        });
      }

      const row = await tx.slotTemplate.create({
        data: { venueId, ...input },
        select: SLOT_SELECT
      });
      await syncVenueBasePrice(tx, venueId);
      return toSlotTemplateDTO(row);
    });
  }

  async update(
    userId: string,
    venueId: string,
    slotId: string,
    input: SlotTemplateUpdateInput
  ): Promise<SlotTemplateDTO> {
    return this.prisma.$transaction(async (tx) => {
      const venue = await this.ownedVenue(tx, userId, venueId);
      const current = await this.ownedSlot(tx, venueId, slotId);

      // Le futur état du créneau, tel qu'il sera APRÈS écriture : c'est lui
      // qu'on valide, jamais l'entrée seule. Un PATCH ne portant que
      // `startMinutes` doit être confronté à l'`endMinutes` déjà stocké.
      const next = { ...current, ...input };
      if (next.startMinutes >= next.endMinutes) {
        throw new BadRequestException({
          code: VenueErrorCode.SLOT_TEMPLATE_OVERLAP,
          message: "venue.validation.slotEndBeforeStart"
        });
      }

      const others = (await this.activeSlots(tx, venueId)).filter((slot) => slot.id !== slotId);
      if (next.isActive) {
        this.assertNoOverlap(next, others);
        if (venue.bookingMode === "SINGLE_SLOT" && others.length >= 1) {
          throw new ConflictException({
            code: VenueErrorCode.SLOT_TEMPLATE_SINGLE_MODE,
            message: "venue.errors.slotSingleMode"
          });
        }
      } else {
        // Désactivation : elle ne doit pas laisser une salle publiée sans
        // aucun créneau — elle disparaîtrait du calendrier sans que le pro
        // comprenne pourquoi.
        this.assertStillBookable(venue.publicationStatus, others.length);
      }

      const row = await tx.slotTemplate.update({ where: { id: slotId }, data: input, select: SLOT_SELECT });
      await syncVenueBasePrice(tx, venueId);
      return toSlotTemplateDTO(row);
    });
  }

  async remove(userId: string, venueId: string, slotId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      const venue = await this.ownedVenue(tx, userId, venueId);
      const current = await this.ownedSlot(tx, venueId, slotId);

      // Suppression DURE réservée aux créneaux jamais utilisés. Dès qu'un
      // devis ou une réservation le référence, l'historique de ce qui a été
      // vendu prime : le pro doit désactiver, pas effacer.
      const [quotes, bookings] = await Promise.all([
        tx.quote.count({ where: { slotTemplateId: slotId } }),
        tx.booking.count({ where: { slotTemplateId: slotId } })
      ]);
      if (quotes + bookings > 0) {
        throw new ConflictException({ code: VenueErrorCode.SLOT_TEMPLATE_IN_USE, message: "venue.errors.slotInUse" });
      }

      if (current.isActive) {
        const remaining = (await this.activeSlots(tx, venueId)).filter((slot) => slot.id !== slotId).length;
        this.assertStillBookable(venue.publicationStatus, remaining);
      }

      await tx.slotTemplate.delete({ where: { id: slotId } });
      await syncVenueBasePrice(tx, venueId);
    });
  }

  // ── Garde-fous ─────────────────────────────────────────────────────────────

  private assertNoOverlap(candidate: { startMinutes: number; endMinutes: number }, others: SlotRow[]): void {
    if (others.some((slot) => overlaps(candidate, slot))) {
      throw new ConflictException({ code: VenueErrorCode.SLOT_TEMPLATE_OVERLAP, message: "venue.errors.slotOverlap" });
    }
  }

  private assertStillBookable(publicationStatus: string, remainingActive: number): void {
    if (publicationStatus === "PUBLISHED" && remainingActive === 0) {
      throw new ConflictException({
        code: VenueErrorCode.SLOT_TEMPLATE_REQUIRED,
        message: "venue.errors.slotRequired"
      });
    }
  }

  private async activeSlots(tx: TxClient, venueId: string): Promise<SlotRow[]> {
    return tx.slotTemplate.findMany({ where: { venueId, isActive: true }, select: SLOT_SELECT });
  }

  /** 404 INDISTINCT (doctrine A2) : inexistante, supprimée, id malformé ou
   *  salle d'un autre pro — anti-énumération. */
  private async ownedVenue(
    tx: TxClient,
    userId: string,
    venueId: string
  ): Promise<{ bookingMode: string; publicationStatus: string }> {
    const venue = UUID_PATTERN.test(venueId)
      ? await tx.venue.findFirst({
          where: { id: venueId, deletedAt: null, owner: { userId } },
          select: { bookingMode: true, publicationStatus: true }
        })
      : null;
    if (!venue) {
      throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
    }
    return venue;
  }

  /** Même doctrine, un cran plus bas : « dans MA salle vivante ». */
  private async ownedSlot(tx: TxClient, venueId: string, slotId: string): Promise<SlotRow> {
    const slot = UUID_PATTERN.test(slotId)
      ? await tx.slotTemplate.findFirst({ where: { id: slotId, venueId }, select: SLOT_SELECT })
      : null;
    if (!slot) {
      throw new NotFoundException({
        code: VenueErrorCode.SLOT_TEMPLATE_NOT_FOUND,
        message: "venue.errors.slotNotFound"
      });
    }
    return slot;
  }
}

/** Client transactionnel Prisma, réduit aux modèles touchés ici.
 *  Le calcul du « à partir de » est DÉLÉGUÉ à `syncVenueBasePrice` de
 *  `pricing-rules.service` : deux formules concurrentes du même minimum
 *  finiraient par diverger, et la divergence s'afficherait sur une page
 *  publique. */
type TxClient = Pick<PrismaService, "slotTemplate" | "venue" | "quote" | "booking" | "pricingRule">;
