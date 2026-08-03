// Lignes de prestations d'un devis — Lot E2a, D91.
//
// Module PUR : aucune horloge, aucun accès base. Il répond à une seule question,
// et c'est la seule qui compte pour l'argent — « combien vaut cette ligne ? ».
//
// ⚠ La QUANTITÉ n'est pas toujours choisie par le client, et c'est le cœur du
// module :
//   FIXED     → 1. Un forfait ne se multiplie pas.
//   TIERED    → 1, au prix du palier choisi.
//   PER_GUEST → le nombre d'INVITÉS de la demande, jamais une saisie libre. Un
//               client qui pourrait taper « 10 » sur un menu à 2 000 DA pour
//               250 personnes paierait 20 000 DA au lieu de 500 000.
//   PER_UNIT  → la quantité saisie, bornée par minUnits/maxUnits.
//
// C'est pourquoi ce calcul ne reçoit JAMAIS de prix : il les lit dans le
// catalogue. Un prix venu du navigateur est un prix que le visiteur peut éditer.
import { ServicePricingType } from "@zwadj/types";
import { roundToDinar } from "./pricing-engine";

export interface ServiceRow {
  id: string;
  nameFr: string;
  nameAr: string;
  pricingType: string;
  isActive: boolean;
  pricing: {
    fixedPriceCents: number | null;
    perGuestPriceCents: number | null;
    perUnitPriceCents: number | null;
    minUnits: number | null;
    maxUnits: number | null;
  } | null;
  tiers: { id: string; labelFr: string; labelAr: string; priceCents: number; isActive: boolean }[];
}

export interface ResolvedLine {
  serviceId: string;
  tierId: string | null;
  nameFr: string;
  nameAr: string;
  pricingType: string;
  tierLabelFr: string | null;
  tierLabelAr: string | null;
  unitPriceCents: number;
  quantity: number;
  lineTotalCents: number;
}

/** Raison d'un refus. On rend un CODE plutôt qu'on ne lève : l'appelant boucle
 *  sur plusieurs lignes et doit pouvoir dire laquelle pose problème. */
export type LineFailure =
  | { code: "SERVICE_UNAVAILABLE" }
  | { code: "SERVICE_TIER_MISMATCH" }
  | { code: "SERVICE_QUANTITY_OUT_OF_RANGE" };

export type LineResult = { ok: true; line: ResolvedLine } | { ok: false; failure: LineFailure };

export function resolveServiceLine(
  service: ServiceRow,
  choice: { serviceId: string; tierId?: string; quantity?: number },
  guests: number
): LineResult {
  // Une prestation retirée du catalogue reste choisissable dans un onglet
  // ouvert depuis une heure. Le refus est donc un cas NORMAL, pas une anomalie.
  if (!service.isActive) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };

  const base = {
    serviceId: service.id,
    nameFr: service.nameFr,
    nameAr: service.nameAr,
    pricingType: service.pricingType
  };

  if (service.pricingType === ServicePricingType.TIERED) {
    if (choice.tierId === undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };
    const tier = service.tiers.find((candidate) => candidate.id === choice.tierId && candidate.isActive);
    if (!tier) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };
    // La quantité n'a pas de sens ici : un palier est un forfait.
    if (choice.quantity !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };
    return {
      ok: true,
      line: {
        ...base,
        tierId: tier.id,
        tierLabelFr: tier.labelFr,
        tierLabelAr: tier.labelAr,
        unitPriceCents: tier.priceCents,
        quantity: 1,
        lineTotalCents: tier.priceCents
      }
    };
  }

  // Hors TIERED, un palier fourni est une erreur de contrat, pas un détail à
  // ignorer : l'ignorer masquerait un front qui envoie n'importe quoi.
  if (choice.tierId !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };

  const pricing = service.pricing;
  // Un service non-TIERED sans ligne de tarif est le trou que la base ne sait
  // pas fermer (cf. migration). Il ne devrait pas exister — D89 crée les deux
  // ensemble — mais s'il existe, il ne se vend pas en silence à zéro dinar.
  if (pricing === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };

  const common = { ...base, tierId: null, tierLabelFr: null, tierLabelAr: null };

  if (service.pricingType === ServicePricingType.FIXED) {
    if (choice.quantity !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };
    const unit = pricing.fixedPriceCents;
    if (unit === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };
    return { ok: true, line: { ...common, unitPriceCents: unit, quantity: 1, lineTotalCents: unit } };
  }

  if (service.pricingType === ServicePricingType.PER_GUEST) {
    if (choice.quantity !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };
    const unit = pricing.perGuestPriceCents;
    if (unit === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };
    // La quantité EST le nombre d'invités. Elle n'est pas négociable, et elle
    // suit automatiquement toute correction du nombre d'invités.
    return {
      ok: true,
      line: { ...common, unitPriceCents: unit, quantity: guests, lineTotalCents: roundToDinar(unit * guests) }
    };
  }

  // PER_UNIT
  const unit = pricing.perUnitPriceCents;
  if (unit === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };
  const quantity = choice.quantity;
  if (quantity === undefined) return { ok: false, failure: { code: "SERVICE_QUANTITY_OUT_OF_RANGE" } };
  if (pricing.minUnits !== null && quantity < pricing.minUnits) {
    return { ok: false, failure: { code: "SERVICE_QUANTITY_OUT_OF_RANGE" } };
  }
  if (pricing.maxUnits !== null && quantity > pricing.maxUnits) {
    return { ok: false, failure: { code: "SERVICE_QUANTITY_OUT_OF_RANGE" } };
  }
  return {
    ok: true,
    line: { ...common, unitPriceCents: unit, quantity, lineTotalCents: roundToDinar(unit * quantity) }
  };
}
