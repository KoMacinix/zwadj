// Règles de prix — Lot B2, D46. Une règle appartient à un CRÉNEAU et porte un
// PRIX ABSOLU. La résolution (quelle règle gagne un jour donné) vit dans
// `pricing-engine.ts`, pur et testé à part : ce service ne fait qu'écrire.
//
// Deux invariants tenus DANS la transaction :
//   1. la règle appartient au créneau, qui appartient à la salle du pro
//      (doublé en base par la FK composite `pricing_rules_slot_belongs_to_venue`) ;
//   2. `venues.base_price_cents` = le plus bas prix qu'un client puisse payer,
//      donc le minimum des créneaux actifs ET de leurs règles actives. Sans le
//      second terme, une promotion de basse saison ne se verrait jamais dans
//      le « à partir de » de la recherche publique.
import { ConflictException, Injectable, NotFoundException } from "@nestjs/common";
import {
  VenueErrorCode,
  type PricingRuleCreateInput,
  type PricingRuleDTO,
  type PricingRuleUpdateInput,
  type PricingRuleType
} from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";

export const RULE_SELECT = {
  id: true,
  slotTemplateId: true,
  ruleType: true,
  label: true,
  priceCents: true,
  startMonth: true,
  endMonth: true,
  daysOfWeek: true,
  priority: true,
  isActive: true,
  createdAt: true
} as const;

/** Les plus SPÉCIFIQUES d'abord, puis priorité décroissante : l'ordre
 *  d'affichage reflète l'ordre de résolution, sinon le pro lit sa grille dans
 *  un ordre et le moteur l'applique dans un autre. */
export const RULE_ORDER_BY = [{ ruleType: "asc" }, { priority: "desc" }, { createdAt: "desc" }] as const;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

interface RuleRow {
  id: string;
  slotTemplateId: string;
  ruleType: string;
  label: string | null;
  priceCents: number;
  startMonth: number | null;
  endMonth: number | null;
  daysOfWeek: number[];
  priority: number;
  isActive: boolean;
  createdAt: Date;
}

export function toPricingRuleDTO(row: RuleRow): PricingRuleDTO {
  return {
    id: row.id,
    slotTemplateId: row.slotTemplateId,
    ruleType: row.ruleType as PricingRuleType,
    label: row.label,
    priceCents: row.priceCents,
    startMonth: row.startMonth,
    endMonth: row.endMonth,
    daysOfWeek: row.daysOfWeek,
    priority: row.priority,
    isActive: row.isActive,
    createdAt: row.createdAt.toISOString()
  };
}

/** `venues.base_price_cents` = le plus bas prix ATTEIGNABLE : minimum des
 *  créneaux actifs et des règles actives de ces créneaux. Exporté pour que le
 *  service des créneaux applique EXACTEMENT le même calcul — deux formules
 *  concurrentes du même « à partir de » finiraient par diverger. */
export async function syncVenueBasePrice(tx: PriceTx, venueId: string): Promise<void> {
  const [slots, rules] = await Promise.all([
    tx.slotTemplate.aggregate({ where: { venueId, isActive: true }, _min: { basePriceCents: true } }),
    tx.pricingRule.aggregate({
      where: { venueId, isActive: true, slotTemplate: { isActive: true } },
      _min: { priceCents: true }
    })
  ]);
  const candidates = [slots._min.basePriceCents, rules._min.priceCents].filter(
    (value): value is number => value !== null && value !== undefined
  );
  // Aucun créneau actif : la valeur est laissée telle quelle. Écrire 0
  // violerait le CHECK de la colonne, et la salle n'est de toute façon pas
  // publiable dans cet état.
  if (candidates.length > 0) {
    await tx.venue.update({ where: { id: venueId }, data: { basePriceCents: Math.min(...candidates) } });
  }
}

export type PriceTx = Pick<PrismaService, "slotTemplate" | "pricingRule" | "venue">;

@Injectable()
export class PricingRulesService {
  constructor(private readonly prisma: PrismaService) {}

  async create(
    userId: string,
    venueId: string,
    slotId: string,
    input: PricingRuleCreateInput
  ): Promise<PricingRuleDTO> {
    return this.prisma.$transaction(async (tx) => {
      await this.ownedSlot(tx, userId, venueId, slotId);
      const row = await tx.pricingRule.create({
        data: { venueId, slotTemplateId: slotId, ...input },
        select: RULE_SELECT
      });
      await syncVenueBasePrice(tx, venueId);
      return toPricingRuleDTO(row);
    });
  }

  async update(
    userId: string,
    venueId: string,
    slotId: string,
    ruleId: string,
    input: PricingRuleUpdateInput
  ): Promise<PricingRuleDTO> {
    return this.prisma.$transaction(async (tx) => {
      await this.ownedSlot(tx, userId, venueId, slotId);
      const current = await this.ownedRule(tx, slotId, ruleId);

      // Le type n'étant pas modifiable, on valide l'état FUTUR contre le type
      // DÉJÀ stocké : un PATCH qui vide `daysOfWeek` d'une règle WEEKDAY la
      // rendrait muette, et le pro croirait à un bug de tarification.
      const next = { ...current, ...input };
      if (current.ruleType === "SEASON" && (next.startMonth === null || next.endMonth === null)) {
        throw new ConflictException({
          code: VenueErrorCode.PRICING_RULE_NOT_FOUND,
          message: "venue.validation.seasonBoundsRequired"
        });
      }
      if (current.ruleType === "WEEKDAY" && next.daysOfWeek.length === 0) {
        throw new ConflictException({
          code: VenueErrorCode.PRICING_RULE_NOT_FOUND,
          message: "venue.validation.weekdaysRequired"
        });
      }

      const row = await tx.pricingRule.update({ where: { id: ruleId }, data: input, select: RULE_SELECT });
      await syncVenueBasePrice(tx, venueId);
      return toPricingRuleDTO(row);
    });
  }

  async remove(userId: string, venueId: string, slotId: string, ruleId: string): Promise<void> {
    await this.prisma.$transaction(async (tx) => {
      await this.ownedSlot(tx, userId, venueId, slotId);
      await this.ownedRule(tx, slotId, ruleId);
      // Suppression DURE assumée : contrairement à un créneau, une règle n'est
      // jamais référencée par un devis ou une réservation — le prix résolu est
      // FIGÉ en centimes dans la demande (D46), pas relu depuis la règle.
      await tx.pricingRule.delete({ where: { id: ruleId } });
      await syncVenueBasePrice(tx, venueId);
    });
  }

  /** 404 INDISTINCT (doctrine A2) : salle ou créneau inexistants, id malformé,
   *  ou salle d'un autre pro. */
  private async ownedSlot(tx: PriceTx, userId: string, venueId: string, slotId: string): Promise<void> {
    const slot =
      UUID_PATTERN.test(venueId) && UUID_PATTERN.test(slotId)
        ? await tx.slotTemplate.findFirst({
            where: { id: slotId, venueId, venue: { deletedAt: null, owner: { userId } } },
            select: { id: true }
          })
        : null;
    if (!slot) {
      throw new NotFoundException({
        code: VenueErrorCode.SLOT_TEMPLATE_NOT_FOUND,
        message: "venue.errors.slotNotFound"
      });
    }
  }

  private async ownedRule(tx: PriceTx, slotId: string, ruleId: string): Promise<RuleRow> {
    const rule = UUID_PATTERN.test(ruleId)
      ? await tx.pricingRule.findFirst({ where: { id: ruleId, slotTemplateId: slotId }, select: RULE_SELECT })
      : null;
    if (!rule) {
      throw new NotFoundException({
        code: VenueErrorCode.PRICING_RULE_NOT_FOUND,
        message: "venue.errors.pricingRuleNotFound"
      });
    }
    return rule;
  }
}
