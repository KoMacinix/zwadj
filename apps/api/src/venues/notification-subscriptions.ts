// ABONNEMENTS AUX ÉVÉNEMENTS — lot S6.
//
// ⚠ TOUTE LA TABLE DE ROUTAGE EST ICI, ET NULLE PART AILLEURS. Un seul fichier
// répond à « qui est prévenu quand ? », et il se lit en dix lignes. Avant S6,
// la réponse était éparpillée dans huit sites d'appel de deux services, et il
// fallait les lire tous pour savoir qu'une annulation pro envoyait le courrier
// de refus.
//
// ⚠ AUCUNE CHAÎNE MAGIQUE, AUCUNE DÉCOUVERTE DYNAMIQUE. Chaque abonnement est
// une ligne typée : un mauvais couple type/handler ne compile pas. C'est
// exactement ce qu'un émetteur générique aurait perdu.
import { Injectable, type OnModuleInit } from "@nestjs/common";
import { BookingNotificationsService } from "./booking-notifications.service";
import { DomainEvents } from "./domain-events";
import { VisitNotificationsService } from "./visit-notifications.service";

@Injectable()
export class NotificationSubscriptions implements OnModuleInit {
  constructor(
    private readonly events: DomainEvents,
    private readonly bookings: BookingNotificationsService,
    private readonly visits: VisitNotificationsService
  ) {}

  onModuleInit(): void {
    this.events.subscribe("booking.requested", (p) => this.bookings.notifyProRequested(p));
    this.events.subscribe("booking.accepted", (p) => this.bookings.notifyClientAccepted(p));
    this.events.subscribe("booking.declined", (p) => this.bookings.notifyClientDeclined(p));

    // ⚠ MÊME HANDLER QUE `booking.declined`, ET C'EST LE COMPORTEMENT ACTUEL.
    // Une annulation par le pro envoie aujourd'hui le courrier de refus. S6 ne
    // tranche pas cette question — il la rend visible en une ligne.
    this.events.subscribe("booking.cancelledByPro", (p) => this.bookings.notifyClientDeclined(p));

    // ⚠ L'ORDRE EST LA GARANTIE : le pro d'abord, le client ensuite, comme
    // avant S6. L'inverser changerait l'ordre d'écriture des lignes
    // `Notification`, que l'intégration mesure.
    this.events.subscribe("visit.booked", (p) => this.visits.notifyProBooked(p));
    this.events.subscribe("visit.booked", (p) => this.visits.confirmToClient(p));

    this.events.subscribe("visit.cancelledByPro", (p) => this.visits.notifyClientCancelledByPro(p));
    this.events.subscribe("visit.cancelledByClient", (p) => this.visits.notifyProCancelled(p));
  }
}
