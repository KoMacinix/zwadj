// Notifications des demandes de réservation — Flux E, Lot E1a, D60/D63.
//
// Trois événements, et le choix du destinataire n'est pas symétrique :
//   booking.requested → au PRO,    sur les canaux qu'il a choisis (D60)
//   booking.accepted  → au CLIENT, e-mail
//   booking.declined  → au CLIENT, e-mail
//
// Le client n'a pas de canaux à régler : il reçoit par e-mail, comme pour les
// visites. Le pro, lui, subit encore ses réglages par défaut tant que la surface
// D60 n'existe pas — dette déjà consignée, pas un oubli de ce lot.
//
// ── Les deux interdits de D63, inchangés ─────────────────────────────────────
// 1. JAMAIS appelé dans un `$transaction` : un envoi lent tiendrait un verrou —
//    et ici le verrou en question est `SELECT … FOR UPDATE` sur la salle, donc
//    il bloquerait TOUTES les acceptations de cette salle.
// 2. JAMAIS de levée vers l'appelant : une demande acceptée en base ne se
//    dé-accepte pas parce qu'un e-mail est tombé. L'échec s'écrit (`FAILED`).
//
// La ligne `Notification` est écrite AVANT l'envoi, en `QUEUED`, pour la même
// raison qu'en C3 : un process tué au milieu laisse une trace rejouable.
import { Inject, Injectable } from "@nestjs/common";
import arMessages from "@zwadj/i18n/messages/ar.json";
import frMessages from "@zwadj/i18n/messages/fr.json";
import { PinoLogger } from "nestjs-pino";
import { EMAIL_SENDER, type EmailSender } from "../common/email/email.types";
import { renderTemplate } from "../common/email/render";
import { dispatchNotification } from "../common/notifications/notification-dispatch";
import { WHATSAPP_SENDER, type WhatsAppSender } from "../common/whatsapp/whatsapp.types";
import { PrismaService } from "../prisma/prisma.service";

const MESSAGES = { fr: frMessages, ar: arMessages } as const;

type Locale = "fr" | "ar";
type Channel = "EMAIL" | "SMS";

export interface BookingNotificationParty {
  userId: string;
  email: string;
  locale: Locale;
}

export interface BookingNotificationInput {
  bookingId: string;
  venueId: string;
  venueNameFr: string;
  venueNameAr: string;
  /** Date civile locale `YYYY-MM-DD` — jamais un `Date`, jamais un instant. */
  eventDate: string;
  /** Libellé du créneau, ou `null` en SINGLE_SLOT : la salle bloque la journée,
   *  il n'y a pas d'heure à annoncer. */
  slotNameFr: string | null;
  slotNameAr: string | null;
  guests: number;
  totalCents: number;
  depositCents: number;
  clientName: string;
  /** Téléphone snapshoté à la demande — toujours présent, il est obligatoire. */
  contact: string;
  /** Motif d'un refus. Facultatif (D83) : le gabarit s'en passe s'il manque. */
  reason: string | null;
  pro: BookingNotificationParty & { phone: string; notifyByEmail: boolean; notifyBySms: boolean };
  /** `null` pour un walk-in — pas de destinataire, donc pas d'envoi. */
  client: BookingNotificationParty | null;
}

@Injectable()
export class BookingNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext("BookingNotifications");
  }

  /** Une demande vient d'arriver. C'est la notification la plus importante du
   *  lot : sous request-to-book, une demande que le pro ne voit pas est une
   *  demande qui expirera toute seule. */
  async notifyProRequested(input: BookingNotificationInput): Promise<void> {
    const vars = this.templateVars(input, input.pro.locale);
    const m = MESSAGES[input.pro.locale].booking;

    if (input.pro.notifyByEmail) {
      await this.dispatch("booking.requested", "EMAIL", input, input.pro.userId, () =>
        this.email.send({
          to: input.pro.email,
          subject: renderTemplate(m.emails.proRequestedSubject, vars),
          text: renderTemplate(m.emails.proRequestedBody, vars)
        })
      );
    }
    if (input.pro.notifyBySms) {
      await this.dispatch("booking.requested", "SMS", input, input.pro.userId, () =>
        this.whatsapp.send({ to: input.pro.phone, text: renderTemplate(m.whatsapp.proRequested, vars) })
      );
    }
  }

  /** La salle a accepté. Le message porte l'ACOMPTE : c'est l'information qui
   *  déclenche l'action suivante du client. */
  async notifyClientAccepted(input: BookingNotificationInput): Promise<void> {
    await this.toClient(input, "booking.accepted", (m, vars) => ({
      subject: renderTemplate(m.emails.clientAcceptedSubject, vars),
      text: renderTemplate(m.emails.clientAcceptedBody, vars)
    }));
  }

  /** La salle a refusé. Le client doit pouvoir chercher ailleurs tout de suite —
   *  un refus silencieux lui ferait attendre une date déjà perdue. */
  async notifyClientDeclined(input: BookingNotificationInput): Promise<void> {
    await this.toClient(input, "booking.declined", (m, vars) => ({
      subject: renderTemplate(m.emails.clientDeclinedSubject, vars),
      text: renderTemplate(m.emails.clientDeclinedBody, vars)
    }));
  }

  private async toClient(
    input: BookingNotificationInput,
    type: string,
    build: (m: typeof MESSAGES.fr.booking, vars: Record<string, string>) => { subject: string; text: string }
  ): Promise<void> {
    const client = input.client;
    // Walk-in : aucun compte derrière la réservation, donc rien à envoyer. Ce
    // n'est pas un échec, c'est l'absence de destinataire.
    if (client === null) return;

    const vars = this.templateVars(input, client.locale);
    const built = build(MESSAGES[client.locale].booking, vars);
    await this.dispatch(type, "EMAIL", input, client.userId, () =>
      this.email.send({ to: client.email, subject: built.subject, text: built.text })
    );
  }

  /** Adapte la CHARGE UTILE des réservations au cœur commun (S2). Ce service
   *  n'a AUCUNE spec unitaire : sa seule mesure est `bookings.int-spec.ts`.
   *  C'est précisément pourquoi la règle partagée devait sortir d'ici — elle y
   *  était invisible, et une divergence côté réservation ne se serait vue
   *  qu'en base réelle, si tant est qu'on l'ait cherchée. */
  private async dispatch(
    type: string,
    channel: Channel,
    input: BookingNotificationInput,
    userId: string,
    send: () => Promise<void>
  ): Promise<void> {
    await dispatchNotification({
      prisma: this.prisma,
      logger: this.logger,
      type,
      channel,
      userId,
      payload: { bookingId: input.bookingId, venueId: input.venueId, eventDate: input.eventDate },
      send
    });
  }

  private templateVars(input: BookingNotificationInput, locale: Locale): Record<string, string> {
    const slot = locale === "ar" ? input.slotNameAr : input.slotNameFr;
    return {
      venue: locale === "ar" ? input.venueNameAr : input.venueNameFr,
      date: this.dateLabel(input.eventDate, locale),
      // SINGLE_SLOT : pas de créneau nommé. Le repli dit « la journée » plutôt
      // que d'afficher un trou — un gabarit qui montre « créneau : null » est
      // un bug, pas une nuance.
      slot: slot ?? MESSAGES[locale].booking.wholeDay,
      guests: String(input.guests),
      client: input.clientName,
      contact: input.contact,
      total: this.amountLabel(input.totalCents),
      deposit: this.amountLabel(input.depositCents),
      reason: input.reason ?? ""
    };
  }

  /** Date en clair. `Intl` reste autorisé pour les DATES : D57 n'interdit que le
   *  formatage des HEURES, qui basculerait en AM/PM. */
  private dateLabel(eventDate: string, locale: Locale): string {
    const at = new Date(`${eventDate}T00:00:00Z`);
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", {
      dateStyle: "long",
      timeZone: "UTC"
    }).format(at);
  }

  /** Montant en dinars entiers. Les centimes ne s'affichent jamais : ils
   *  n'existent que pour l'arithmétique interne (D46). */
  private amountLabel(cents: number): string {
    return String(Math.round(cents / 100));
  }
}
