// Chiffrage d'une demande — lot S11-b, arbitrages D278.
//
// Module PUR : aucune horloge, aucun accès base, aucune dépendance Nest. Il se
// rejoue en millisecondes, sans PostgreSQL et sans client généré — c'est ce qui
// permet de le NEUTRALISER à chaque passage (D187, motif réécrit par D192 : ce
// qui tient la règle est la vitesse de rejeu, pas l'exécutabilité).
//
// ⛔ POURQUOI IL EXISTE. Le même chiffrage était écrit DEUX FOIS, presque au mot
// près, dans `BookingsService.create` et dans `QuotesService` : mêmes fériés,
// même boucle `find`, même `reduce`, même acompte. `quote.convert` ne recalcule
// pas — il RECOPIE les montants snapshotés du devis — donc une divergence entre
// les deux copies aurait été GRAVÉE dans la réservation, sans rattrapage.
// « Deux formules concurrentes du même calcul finissent toujours par diverger,
// et la divergence est silencieuse. »
//
// ⚠ CE QUI RESTE LÉGITIMEMENT DIFFÉRENT : la confrontation D75 (`confrontExpectedCharge`
// ci-dessous) n'est appelée que par la demande CLIENT. Un devis est chiffré par
// le pro : il n'y a pas d'attente client à confronter. Ce n'est pas un oubli, et
// l'« harmoniser » inventerait une exigence.
//
// ⚠ ORDRE DES REFUS — c'est une RÈGLE MÉTIER, pas un détail d'implémentation :
//   1. doublon de prestation   (la requête est malformée : rien à voir avec le
//                               catalogue, donc rien à lire pour le dire) ;
//   2. prestation indisponible (absente du catalogue, OU d'une autre salle) ;
//   3. refus de ligne          (palier, quantité) rendu par `resolveServiceLine`.
// Une demande qui n'enfreint QU'UNE règle est verte quel que soit l'ordre : la
// garde se mesure sur un cas DOUBLEMENT fautif.
import { ServiceErrorCode } from "@zwadj/types";
import { resolveDepositCents, type DepositPolicyRow } from "./deposit";
import { resolveServiceLine, type ResolvedLine, type ServiceRow } from "./service-pricing";

/** Une ligne du catalogue telle que `SERVICE_SELECT` la ramène. `venueId` n'est
 *  pas décoratif : voir `resolveCharge`. */
export type CatalogueRow = ServiceRow & { venueId: string };

export interface ChargeChoice {
  serviceId: string;
  tierId?: string;
  quantity?: number;
}

export interface ChargeInput {
  /** La salle DONT on chiffre la demande — confrontée à celle de chaque ligne. */
  venueId: string;
  /** Prix de la salle DÉJÀ résolu à la date (moteur B3). Le module ne lit ni
   *  fériés ni règles : il ne doit pas exister deux endroits qui résolvent un
   *  prix de créneau. */
  basePriceCents: number;
  guests: number;
  choices: readonly ChargeChoice[];
  catalogue: readonly CatalogueRow[];
  deposit: DepositPolicyRow;
}

export interface Charge {
  basePriceCents: number;
  servicesTotalCents: number;
  totalCents: number;
  depositCents: number;
  lines: ResolvedLine[];
}

/** Les codes que ce module peut rendre, DÉRIVÉS de l'autorité partagée plutôt
 *  qu'écrits en littéraux : renommer un code casse ici au typecheck, au lieu de
 *  laisser une chaîne orpheline voyager jusqu'au client. */
export type ChargeFailureCode =
  | typeof ServiceErrorCode.SERVICE_DUPLICATE
  | typeof ServiceErrorCode.SERVICE_UNAVAILABLE
  | typeof ServiceErrorCode.SERVICE_TIER_MISMATCH
  | typeof ServiceErrorCode.SERVICE_QUANTITY_OUT_OF_RANGE;

export type ChargeResult =
  | { ok: true; charge: Charge }
  | { ok: false; failure: { code: ChargeFailureCode } };

const refus = (code: ChargeFailureCode): ChargeResult => ({ ok: false, failure: { code } });

/**
 * Chiffre une demande : prestations résolues, total, acompte.
 *
 * ⛔ IL NE LÈVE PAS. Il rend un verdict discriminé, comme `booking-admission` et
 * `booking-locks` : les codes HTTP et les clés i18n n'ont rien à faire dans un
 * module de calcul, et l'appelant est seul à savoir en quoi les traduire.
 *
 * ⚠ L'ORDRE DES TROIS CALCULS EST FIGÉ PAR LA SIGNATURE, et il compte :
 * `resolveDepositCents` reçoit le total FINAL, prestations comprises. Calculer
 * l'acompte plus tôt — sur le seul prix de salle, par exemple — donnerait un
 * acompte qui ne s'écrête plus au bon endroit (`deposit.ts` borne à `total`),
 * et l'écrêtage est justement ce qui empêche un acompte fixe de dépasser un
 * créneau de semaine bon marché.
 */
export function resolveCharge(input: ChargeInput): ChargeResult {
  // 1. Doublon. ⚠ Ni Zod (`.max(20)` seul), ni la base (aucun UNIQUE
  //    `(booking_id, service_id)`) ne l'empêchent : sans ce refus, une
  //    prestation FIXED envoyée deux fois est FACTURÉE deux fois, et l'acompte
  //    suit puisqu'il est un pourcentage du total.
  //    ⚠ D75 NE COUVRE PAS CE CAS : elle garantit que le client n'est jamais
  //    engagé sur un montant qu'il n'a pas VU — un double envoi du front produit
  //    un montant attendu cohérent avec le doublon, et la confrontation passe.
  //    Arbitrage D278 : REFUS, jamais de fusion — fusionner devinerait une
  //    intention qu'on n'a pas.
  const vus = new Set<string>();
  for (const choice of input.choices) {
    if (vus.has(choice.serviceId)) return refus(ServiceErrorCode.SERVICE_DUPLICATE);
    vus.add(choice.serviceId);
  }

  const lines: ResolvedLine[] = [];
  for (const choice of input.choices) {
    const found = input.catalogue.find((row) => row.id === choice.serviceId);
    // 2. ⚠ LA PROPRIÉTÉ EST VÉRIFIÉE, PAS DÉDUITE. Les deux appelants filtrent
    //    déjà par salle dans leur `where`, donc une prestation d'une AUTRE salle
    //    n'arrive pas jusqu'ici — le refus tombait par ABSENCE. Le jour où ce
    //    `where` perdrait son `venueId` (pagination, cache, « simplification »),
    //    la prestation d'une autre salle serait facturée et aucun test ne
    //    rougirait, le code d'erreur existant toujours pour « id inconnu ».
    //    Un bon résultat obtenu par le mauvais mécanisme n'est pas une garde.
    if (!found || found.venueId !== input.venueId) {
      return refus(ServiceErrorCode.SERVICE_UNAVAILABLE);
    }
    const resolved = resolveServiceLine(found, choice, input.guests);
    if (!resolved.ok) return refus(resolved.failure.code);
    lines.push(resolved.line);
  }

  const servicesTotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
  const totalCents = input.basePriceCents + servicesTotalCents;

  return {
    ok: true,
    charge: {
      basePriceCents: input.basePriceCents,
      servicesTotalCents,
      totalCents,
      depositCents: resolveDepositCents(input.deposit, totalCents),
      lines
    }
  };
}

export type ConfrontationResult =
  | { ok: true }
  | { ok: false; totalCents: number; depositCents: number };

/**
 * D75 — le client annonce ce qu'il a vu.
 *
 * ⚠ LE REFUS PORTE LES MONTANTS RÉELS, et c'est tout l'objet de la fonction :
 * sans eux, le client rejoue à l'aveugle un montant qu'il ne connaît toujours
 * pas. Il n'est jamais engagé sur un montant qu'il n'a pas lu.
 */
export function confrontExpectedCharge(
  charge: Pick<Charge, "totalCents" | "depositCents">,
  expected: { expectedTotalCents: number; expectedDepositCents: number }
): ConfrontationResult {
  if (
    expected.expectedTotalCents !== charge.totalCents ||
    expected.expectedDepositCents !== charge.depositCents
  ) {
    return { ok: false, totalCents: charge.totalCents, depositCents: charge.depositCents };
  }
  return { ok: true };
}
