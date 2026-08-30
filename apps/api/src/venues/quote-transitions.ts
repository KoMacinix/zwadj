// Politique de transition des DEVIS — module PUR, lot S3 (audit F5).
//
// ⚠ CE TABLEAU DIT UNE CHOSE QUE LE CODE NE DISAIT NULLE PART : trois des
// quatre commandes NE CHANGENT PAS le statut. `deliver` écrit un canal et un
// horodatage, `revise` crée une version N+1 sans toucher la courante, `convert`
// crée une réservation. Seul `cancel` écrit un statut. Toutes les quatre sont
// pourtant GARDÉES par le même jeu de statuts ouverts — c'est cette symétrie-là
// qui se lisait mal, éparpillée en quatre `status: { in: OPEN }`.
//
// ⚠ `QUOTE_OPEN_STATUSES` RESTE L'AUTORITÉ, ce module ne la redéfinit pas : il
// la référence. Poser ici une seconde liste « ouverte » aurait exactement
// reproduit le défaut F5 en le déplaçant d'un cran.
//
// ⚠ LES STATUTS HÉRITÉS SONT LUS, JAMAIS ÉCRITS (Q2/Q3a). `SENT` figure dans
// `QUOTE_OPEN_STATUSES` et reste donc une source LÉGALE — un devis hérité en
// `SENT` se remet, se révise, se convertit et se clôt, ce que mesure
// `quotes.int-spec.ts`. Mais aucune commande ne peut le prendre pour CIBLE, ni
// lui, ni `SUPERSEDED`, ni `DECLINED`. La spec de ce module le vérifie sur
// l'ensemble du tableau plutôt que commande par commande : une garde qui
// n'énumère pas ne peut pas oublier la commande ajoutée demain.
//
// ⚠ Tableau relevé sur `quotes.service.ts` (deliver 215, revise 244,
// convert 295, cancel 397) — aucune valeur écrite de mémoire.
import { QUOTE_OPEN_STATUSES, QuoteStatus } from "@zwadj/types";

export const QuoteCommand = {
  DELIVER: "deliver",
  REVISE: "revise",
  CONVERT: "convert",
  CANCEL: "cancel"
} as const;
export type QuoteCommand = (typeof QuoteCommand)[keyof typeof QuoteCommand];

interface QuoteTransition {
  /** Statuts SOURCE qui autorisent la commande. */
  readonly from: readonly QuoteStatus[];
  /** Statut écrit, ou `null` quand la commande NE TOUCHE PAS au statut. */
  readonly to: QuoteStatus | null;
}

export const QUOTE_TRANSITIONS: Readonly<Record<QuoteCommand, QuoteTransition>> = {
  [QuoteCommand.DELIVER]: { from: QUOTE_OPEN_STATUSES, to: null },
  [QuoteCommand.REVISE]: { from: QUOTE_OPEN_STATUSES, to: null },
  [QuoteCommand.CONVERT]: { from: QUOTE_OPEN_STATUSES, to: null },
  [QuoteCommand.CANCEL]: { from: QUOTE_OPEN_STATUSES, to: QuoteStatus.CANCELLED }
};

/** Statuts source autorisés — l'UNIQUE source des `status: { in: … }` et des
 *  `assertStatus` du service. */
export function quoteAllowedFrom(command: QuoteCommand): readonly QuoteStatus[] {
  return QUOTE_TRANSITIONS[command].from;
}

/** Statut écrit par la commande, ou `null` si elle n'en écrit aucun. */
export function quoteTargetOf(command: QuoteCommand): QuoteStatus | null {
  return QUOTE_TRANSITIONS[command].to;
}

/** Statut écrit, pour les commandes qui en écrivent un.
 *
 *  ⚠ LÈVE plutôt que de rendre un repli. Un repli — `?? QuoteStatus.CANCELLED`
 *  au site d'appel — rendrait le champ `to` DÉCORATIF : le tableau pourrait
 *  dire `null` pendant que le service écrit `CANCELLED`, et rien ne le
 *  signalerait. C'est une erreur de PROGRAMMATION, pas un cas métier : elle
 *  n'a donc ni code d'erreur ni traduction, et la spec la mesure. */
export function quoteWrittenStatus(command: QuoteCommand): QuoteStatus {
  const to = QUOTE_TRANSITIONS[command].to;
  if (to === null) {
    throw new Error(`La commande « ${command} » n'écrit aucun statut.`);
  }
  return to;
}

export type QuoteTransitionDecision =
  | { readonly outcome: "ALLOWED"; readonly to: QuoteStatus | null }
  | { readonly outcome: "STATUS_CONFLICT"; readonly status: string };

/** Décide, sans rien lire ni rien écrire.
 *
 *  ⚠ Aucune règle ne déborde du tableau côté devis — contrairement aux
 *  réservations et leur motif obligatoire. Ce qui reste au service n'est PAS
 *  une règle de statut : la garde « déjà converti » lit `booking !== null`,
 *  donc une RELATION, pas un statut. La faire entrer ici obligerait la
 *  politique à connaître le modèle de données. */
export function decideQuoteTransition(command: QuoteCommand, status: string): QuoteTransitionDecision {
  const transition = QUOTE_TRANSITIONS[command];
  if (!(transition.from as readonly string[]).includes(status)) {
    return { outcome: "STATUS_CONFLICT", status };
  }
  return { outcome: "ALLOWED", to: transition.to };
}
