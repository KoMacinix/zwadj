// Plage bloquante d'une réservation — Lot E1a, D77.
//
// Module PUR : aucune horloge, aucun accès base. Il ne fait qu'une chose, et
// c'est celle que le schéma décrit depuis le début :
//
//   MULTI_SLOT  → la date + les heures du SlotTemplate
//   SINGLE_SLOT → la JOURNÉE LOCALE ENTIÈRE [date 00:00, date+1 00:00)
//
// Le second cas est ce qui matérialise « une réservation par jour ». Aucune
// règle applicative ne l'énonce : c'est la plage elle-même qui, passée à
// l'EXCLUDE `bookings_no_overlap_accepted_confirmed`, rend le jour entier
// exclusif. Une règle en plus serait une seconde vérité à faire diverger.
//
// ⚠ Deux pièges, tous deux déjà payés ailleurs dans ce dépôt.
//
// 1. `endMinutes` monte jusqu'à SLOT_END_MAX = 2880 (D55). Un créneau 20h→02h
//    vaut startMinutes=1200, endMinutes=1560 : il finit LE LENDEMAIN. Écrire
//    `dayStart + endMinutes` marche pour lui parce que les minutes se comptent
//    depuis le minuit de DÉBUT — mais tout calcul qui « ramènerait » endMinutes
//    dans [0,1440[ produirait endsAt < startsAt, que le CHECK
//    `bookings_range_valid` rejetterait. On ne ramène rien.
//
// 2. Alger est UTC+1 FIXE, sans heure d'été (D48). La conversion passe par
//    `civilDayStartMs`, seul endroit du dépôt où une date civile devient un
//    instant. Jamais `Intl`, jamais une bibliothèque de fuseaux : une journée
//    de 23 h ou de 25 h n'existe pas ici, et un décalage qui « s'adapterait »
//    déplacerait des mariages.
import { civilDayStartMs, type CivilDate } from "./availability-time";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

/** Bornes du créneau, en minutes depuis minuit du jour de DÉBUT. */
export interface SlotBounds {
  startMinutes: number;
  endMinutes: number;
}

export interface BookingWindow {
  startsAt: Date;
  endsAt: Date;
}

/**
 * Plage bloquante `[startsAt, endsAt)` d'une réservation.
 *
 * `slot` est `null` en SINGLE_SLOT — et il DOIT l'être : sur une salle qui ne
 * prend qu'une réservation par jour, réduire la plage aux heures du créneau
 * laisserait le reste de la journée libre, ce qui contredirait le mode que la
 * salle a choisi.
 *
 * ⚠ Le créneau EXISTE quand même dans ce mode : c'est lui qui porte le prix et
 * le libellé snapshotés sur la réservation. Ce sont ses HEURES qu'on ignore, pas
 * son identité — le service passe `null` ici tout en gardant `slotTemplateId`
 * sur la ligne.
 */
export function computeBookingWindow(date: CivilDate, slot: SlotBounds | null): BookingWindow {
  const dayStartMs = civilDayStartMs(date);

  if (slot === null) {
    return {
      startsAt: new Date(dayStartMs),
      endsAt: new Date(dayStartMs + DAY_MS)
    };
  }

  return {
    startsAt: new Date(dayStartMs + slot.startMinutes * MINUTE_MS),
    endsAt: new Date(dayStartMs + slot.endMinutes * MINUTE_MS)
  };
}
