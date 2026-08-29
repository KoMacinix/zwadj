// Charge utile de notification d'une réservation — module PUR, lot S11-a (D261).
//
// ⚠ POURQUOI ICI ET PAS DANS `booking-notifications.service.ts`.
// Ce module produit exactement ce que ce service-là consomme, et le voisiner
// est le but. Mais l'y METTRE aurait obligé `BookingsService` à injecter le
// service de notification pour construire sa charge — c'est-à-dire à défaire
// D63, qui dit que le service PUBLIE UN FAIT et ne connaît plus ses
// destinataires. Un module pur entre les deux les laisse tous deux à leur
// place : le producteur ne connaît pas l'envoyeur, l'envoyeur ne connaît pas
// le producteur, et le type qui les relie garde son unique déclaration.
//
// ⚠ CE MODULE NE LIT RIEN. Le client d'une réservation se lit en base quand la
// ligne est vieille ; cette lecture reste chez l'appelant. Ici, `client` est
// une donnée reçue — y compris `null`, qui n'est pas un échec mais l'ABSENCE
// DE DESTINATAIRE : un walk-in n'a aucun compte derrière lui.
import { formatCivilDate, civilOfUtcDate } from "./availability-time";
import type { BookingNotificationInput } from "./booking-notifications.service";
import type { BookingRow } from "./booking-locks.types";

/** Ce que la notification a besoin de savoir de la SALLE, et rien de plus.
 *
 *  ⚠ Forme relevée sur les deux `select` qui l'alimentent (`create` et
 *  `ownedBooking`), pas écrite de mémoire. Élargir ce type ferait payer des
 *  colonnes que le gabarit n'affiche pas ; le rétrécir ferait mentir l'un des
 *  deux appelants. */
export interface VenueForNotification {
  id: string;
  nameFr: string;
  nameAr: string;
  owner: {
    phone: string;
    notifyByEmail: boolean;
    notifyBySms: boolean;
    user: { id: string; email: string; locale: string };
  };
}

/** Le compte destinataire, tel que les deux appelants le lisent déjà. */
export interface ClientForNotification {
  id: string;
  email: string;
  locale: string;
}

/**
 * Construit la charge utile publiée sur le bus d'événements.
 *
 * ⚠ `eventDate` SORT EN DATE CIVILE `YYYY-MM-DD`, jamais en instant. Le
 * gabarit la reformate ensuite dans la langue du destinataire ; lui passer un
 * `Date` ferait afficher une heure que personne n'a réservée, et un `toISOString`
 * sur une colonne `@db.Date` rendrait le jour du fuseau du serveur.
 *
 * ⚠ LA LOCALE RETOMBE SUR « fr » PAR DÉFAUT, et c'est délibéré : la colonne
 * est une chaîne libre côté base, et une valeur inattendue doit produire un
 * message lisible plutôt qu'un gabarit introuvable.
 */
export function buildBookingNotification(
  row: BookingRow,
  venue: VenueForNotification,
  client: ClientForNotification | null,
  reason: string | null
): BookingNotificationInput {
  return {
    bookingId: row.id,
    venueId: row.venueId,
    venueNameFr: venue.nameFr,
    venueNameAr: venue.nameAr,
    eventDate: formatCivilDate(civilOfUtcDate(row.eventDate)),
    slotNameFr: row.slotNameFr,
    slotNameAr: row.slotNameAr,
    guests: row.guests,
    totalCents: row.totalCents,
    depositCents: row.depositCents,
    clientName: `${row.contactFirstName} ${row.contactLastName}`.trim(),
    contact: row.contactPhone,
    reason,
    pro: {
      userId: venue.owner.user.id,
      email: venue.owner.user.email,
      locale: venue.owner.user.locale === "AR" ? "ar" : "fr",
      phone: venue.owner.phone,
      notifyByEmail: venue.owner.notifyByEmail,
      notifyBySms: venue.owner.notifyBySms
    },
    client:
      client === null
        ? null
        : { userId: client.id, email: client.email, locale: client.locale === "AR" ? "ar" : "fr" }
  };
}
