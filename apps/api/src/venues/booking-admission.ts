// Recevabilité d'une demande de réservation — module PUR, lot S11-a (D261).
//
// ⚠ CE QUI VIT ICI, ET CE QUI N'Y VIT SURTOUT PAS.
// Ici : les trois refus que `create` opposait AVANT de chiffrer quoi que ce
// soit — créneau introuvable, capacité dépassée, date hors de la fenêtre
// ouverte — et la plage bloquante qui en découle.
// PAS ici : la lecture de la salle (base), la lecture de l'horloge (D48), le
// prix, les prestations, la confrontation D75, l'acompte. Le chiffrage est le
// CHEMIN DE L'ARGENT : il part en S11-b, avec son propre cadrage.
//
// ⚠ POURQUOI SORTIR CES TROIS REFUS D'UN SERVICE QUI N'A AUCUNE SPEC UNITAIRE.
// `BookingsService` n'est mesuré que par `bookings.int-spec.ts`, qui demande un
// PostgreSQL réel. Ces trois décisions — dont deux gardent une frontière de
// date — n'étaient donc jamais neutralisables en millisecondes. Sorties ici,
// elles le deviennent : c'est le motif exact de D187, réécrit par D192.
//
// ⚠ L'ORDRE DES REFUS EST UNE RÈGLE, PAS UN DÉTAIL D'ÉCRITURE.
// Relevé sur `bookings.service.ts` avant déplacement (créneau l. 178, capacité
// l. 180, date l. 196) : le créneau d'abord, la CAPACITÉ ensuite, la DATE en
// dernier. Le service traduit la capacité en 400 et les deux autres en 409.
// Intervertir capacité et date ferait répondre « ce créneau n'est pas
// disponible » à une demande dont le seul tort est de compter trop d'invités —
// le client changerait de date au lieu de réduire sa table. Une garde mesure
// cet ordre ; elle n'existait pas.
import { BOOKING_HORIZON_MONTHS } from "@zwadj/types";
import { addMonthsCivil, civilUtcMs, type CivilDate } from "./availability-time";
import { computeBookingWindow, type BookingWindow, type SlotBounds } from "./booking-window";

/**
 * Verdict de recevabilité.
 *
 * ⚠ `slot` EST REPORTÉ DANS LE VERDICT, et c'est structurel, pas cosmétique.
 * L'appelant a besoin du créneau COMPLET ensuite (identifiant, libellés,
 * prix de base, règles) alors que ce module ne lit que ses bornes horaires.
 * Le paramètre de type le laisse traverser sans être redéclaré : le service
 * récupère le type exact que Prisma lui a rendu, et TypeScript sait qu'il
 * n'est plus absent — sans qu'aucune garde de nullité ne soit réécrite après
 * coup dans le service, où elle serait devenue du code mort.
 */
export type BookingAdmission<S> =
  | { readonly outcome: "ADMITTED"; readonly slot: S; readonly window: BookingWindow }
  | { readonly outcome: "SLOT_UNAVAILABLE" }
  | { readonly outcome: "GUESTS_EXCEED_CAPACITY" };

export interface BookingAdmissionInput<S extends SlotBounds> {
  /** Date civile demandée, déjà validée par Zod. */
  readonly date: CivilDate;
  /** Date civile d'Alger à l'instant de la requête. UNE seule lecture
   *  d'horloge par requête (D48) : elle se fait chez l'appelant. */
  readonly today: CivilDate;
  /** `null` ⇒ aucun créneau ACTIF de CETTE salle ne porte l'identifiant
   *  demandé. « Ce créneau n'existe pas », pas « il est pris » : les deux
   *  phrases n'appellent pas la même action du client. */
  readonly slot: S | null;
  /** `true` en SINGLE_SLOT ⇒ la salle bloque la JOURNÉE ENTIÈRE et les heures
   *  du créneau sont ignorées (D77).
   *
   *  ⚠ DEUX `null` DIFFÉRENTS SE CROISENT ICI, et les confondre coûterait un
   *  jour de calendrier. `slot === null` veut dire « introuvable » et refuse ;
   *  le `null` que `computeBookingWindow` attend veut dire « ignore les
   *  heures » et réserve la journée. C'est pourquoi le mode voyage dans un
   *  drapeau distinct au lieu d'être encodé par un créneau absent. */
  readonly wholeDay: boolean;
  readonly capacityMax: number;
  readonly guests: number;
}

/**
 * Décide, sans rien lire ni rien écrire.
 *
 * ⚠ LA BORNE BASSE EST STRICTE, ET C'EST UNE DÉCISION. Une demande pour
 * AUJOURD'HUI se refuse : la salle n'aurait pas le temps de répondre, et le
 * créneau du soir est peut-être déjà commencé. Elle est reprise au caractère
 * près du service (`<= civilUtcMs(today)`), pas réécrite.
 *
 * ⚠ LA BORNE HAUTE EST LA MÊME AUTORITÉ QUE LE CALENDRIER (D49) :
 * `BOOKING_HORIZON_MONTHS`. Une écriture au-delà se REFUSE, elle ne se déplace
 * pas — écrêter silencieusement un mariage de dix-huit mois serait pire que de
 * le refuser.
 */
export function decideBookingAdmission<S extends SlotBounds>(
  input: BookingAdmissionInput<S>
): BookingAdmission<S> {
  const { date, today, slot, wholeDay, capacityMax, guests } = input;

  if (slot === null) return { outcome: "SLOT_UNAVAILABLE" };

  if (guests > capacityMax) return { outcome: "GUESTS_EXCEED_CAPACITY" };

  const horizon = addMonthsCivil(today, BOOKING_HORIZON_MONTHS);
  if (civilUtcMs(date) <= civilUtcMs(today) || civilUtcMs(date) > civilUtcMs(horizon)) {
    return { outcome: "SLOT_UNAVAILABLE" };
  }

  return { outcome: "ADMITTED", slot, window: computeBookingWindow(date, wholeDay ? null : slot) };
}
