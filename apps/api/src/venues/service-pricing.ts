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

type ServiceChoice = { serviceId: string; tierId?: string; quantity?: number };

/** Ce que TOUTE ligne porte, quel que soit le mode de tarification. */
type LineBase = { serviceId: string; nameFr: string; nameAr: string; pricingType: string };

/** Une stratégie de tarification — lot S4 (audit F3). */
type ServiceLineResolver = (
  service: ServiceRow,
  choice: ServiceChoice,
  guests: number,
  base: LineBase
) => LineResult;

type NonTieredEntry =
  | { ok: true; pricing: NonNullable<ServiceRow["pricing"]>; common: LineBase & { tierId: null; tierLabelFr: null; tierLabelAr: null } }
  | { ok: false; failure: LineFailure };

/** Les deux refus communs aux modes NON paliers, dans l'ORDRE d'origine.
 *
 *  ⚠ Extraits pour n'exister QU'UNE FOIS : recopiés dans les trois stratégies,
 *  ils auraient reproduit à l'identique le défaut que S1 vient de fermer sur
 *  les statuts. TIERED ne les subit pas — un service à paliers se vend depuis
 *  `tiers`, et n'a aucune raison d'avoir une ligne `pricing`. */
function enterNonTiered(service: ServiceRow, choice: ServiceChoice, base: LineBase): NonTieredEntry {
  // Hors TIERED, un palier fourni est une erreur de contrat, pas un détail à
  // ignorer : l'ignorer masquerait un front qui envoie n'importe quoi.
  if (choice.tierId !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };

  const pricing = service.pricing;
  // Un service non-TIERED sans ligne de tarif est le trou que la base ne sait
  // pas fermer (cf. migration). Il ne devrait pas exister — D89 crée les deux
  // ensemble — mais s'il existe, il ne se vend pas en silence à zéro dinar.
  if (pricing === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };

  return { ok: true, pricing, common: { ...base, tierId: null, tierLabelFr: null, tierLabelAr: null } };
}

/** Registre des stratégies — EXHAUSTIF sur `ServicePricingType`.
 *
 *  ⚠ Aucun arrondi n'est né ici : `roundToDinar` est appelé aux MÊMES deux
 *  endroits qu'avant, sur les MÊMES produits. Un lot de refactoring qui touche
 *  au chemin de l'argent ne déplace pas une multiplication. */
const RESOLVERS: Record<ServicePricingType, ServiceLineResolver> = {
  [ServicePricingType.TIERED]: (service, choice, _guests, base) => {
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
  },

  [ServicePricingType.FIXED]: (service, choice, _guests, base) => {
    const entree = enterNonTiered(service, choice, base);
    if (!entree.ok) return entree;
    if (choice.quantity !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };
    const unit = entree.pricing.fixedPriceCents;
    if (unit === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };
    return { ok: true, line: { ...entree.common, unitPriceCents: unit, quantity: 1, lineTotalCents: unit } };
  },

  [ServicePricingType.PER_GUEST]: (service, choice, guests, base) => {
    const entree = enterNonTiered(service, choice, base);
    if (!entree.ok) return entree;
    if (choice.quantity !== undefined) return { ok: false, failure: { code: "SERVICE_TIER_MISMATCH" } };
    const unit = entree.pricing.perGuestPriceCents;
    if (unit === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };
    // La quantité EST le nombre d'invités. Elle n'est pas négociable, et elle
    // suit automatiquement toute correction du nombre d'invités.
    return {
      ok: true,
      line: { ...entree.common, unitPriceCents: unit, quantity: guests, lineTotalCents: roundToDinar(unit * guests) }
    };
  },

  [ServicePricingType.PER_UNIT]: (service, choice, _guests, base) => {
    const entree = enterNonTiered(service, choice, base);
    if (!entree.ok) return entree;
    const unit = entree.pricing.perUnitPriceCents;
    if (unit === null) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };
    const quantity = choice.quantity;
    if (quantity === undefined) return { ok: false, failure: { code: "SERVICE_QUANTITY_OUT_OF_RANGE" } };
    if (entree.pricing.minUnits !== null && quantity < entree.pricing.minUnits) {
      return { ok: false, failure: { code: "SERVICE_QUANTITY_OUT_OF_RANGE" } };
    }
    if (entree.pricing.maxUnits !== null && quantity > entree.pricing.maxUnits) {
      return { ok: false, failure: { code: "SERVICE_QUANTITY_OUT_OF_RANGE" } };
    }
    return {
      ok: true,
      line: { ...entree.common, unitPriceCents: unit, quantity, lineTotalCents: roundToDinar(unit * quantity) }
    };
  }
};

export function resolveServiceLine(service: ServiceRow, choice: ServiceChoice, guests: number): LineResult {
  // Une prestation retirée du catalogue reste choisissable dans un onglet
  // ouvert depuis une heure. Le refus est donc un cas NORMAL, pas une anomalie.
  if (!service.isActive) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };

  const base = {
    serviceId: service.id,
    nameFr: service.nameFr,
    nameAr: service.nameAr,
    pricingType: service.pricingType
  };

  // ⚠ [ÉCART SIGNALÉ] — UN TYPE INCONNU EST DÉSORMAIS REFUSÉ.
  // La cascade d'origine n'avait pas de branche `PER_UNIT` : c'était le
  // RETOMBÉ. Un `pricingType` que le code ignore se vendait donc au prix
  // « à l'unité », en silence, sur le chemin de l'argent. Conserver ce
  // comportement aurait voulu dire écrire `?? RESOLVERS.PER_UNIT` — coder
  // sciemment le piège. Il refuse maintenant, comme toute autre incohérence de
  // catalogue. Le cas est inatteignable par le typage et par l'énumération de
  // base ; il est mesuré quand même, et neutralisable (cible S4-5).
  const resolver = (RESOLVERS as Record<string, ServiceLineResolver | undefined>)[service.pricingType];
  if (resolver === undefined) return { ok: false, failure: { code: "SERVICE_UNAVAILABLE" } };

  return resolver(service, choice, guests, base);
}
