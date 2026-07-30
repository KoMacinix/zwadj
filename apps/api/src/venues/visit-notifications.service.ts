// Notifications des rendez-vous de visite — Flux C, Lot C3, D63.
//
// Premier producteur de lignes `Notification` du dépôt. Trois événements :
//   visit.booked     → au PRO,    sur les canaux qu'il a choisis (D60)
//   visit.cancelled  → au PRO,    mêmes canaux
//   visit.confirmed  → au CLIENT, e-mail (il n'a pas de canaux à régler)
//
// ── Deux interdits absolus (D63) ─────────────────────────────────────────────
// 1. JAMAIS appelé dans un `$transaction` : un envoi lent tiendrait un verrou.
// 2. JAMAIS de levée vers l'appelant : un rendez-vous confirmé en base ne se
//    dé-réserve pas parce qu'un e-mail est tombé. L'échec s'ÉCRIT
//    (`status: FAILED` + `error`) et se logge.
//
// ── Pourquoi la ligne est écrite AVANT l'envoi ───────────────────────────────
// `QUEUED` puis résolution en `SENT`/`FAILED` coûte deux écritures, et c'est le
// but : un process tué au milieu d'un envoi laisse une ligne `QUEUED` qu'un job
// de rejeu retrouvera. Écrire la ligne après l'envoi perdrait exactement les
// notifications qu'on voudrait rejouer. `pg-boss` n'est dépendance de rien
// aujourd'hui (D63) — ces lignes sont ce qu'il consommera quand il existera.
import { Inject, Injectable } from "@nestjs/common";
import { formatWallClock } from "@zwadj/types";
// Import DIRECT des JSON (patron `auth-emails.service.ts`) : le build tsc de
// l'API ne compile pas le TypeScript de node_modules, les JSON s'y résolvent.
import arMessages from "@zwadj/i18n/messages/ar.json";
import frMessages from "@zwadj/i18n/messages/fr.json";
import { PinoLogger } from "nestjs-pino";
import { EMAIL_SENDER, type EmailSender } from "../common/email/email.types";
import { renderTemplate } from "../common/email/render";
import { WHATSAPP_SENDER, type WhatsAppSender } from "../common/whatsapp/whatsapp.types";
import { PrismaService } from "../prisma/prisma.service";

const MESSAGES = { fr: frMessages, ar: arMessages } as const;

type Locale = "fr" | "ar";

/** Canal de `NotificationChannel` (Prisma). Littéral et non enum importé : le
 *  reste de l'API écrit ses valeurs d'enum en littéraux (`status: "CONFIRMED"`),
 *  et publier ce canal dans `@zwadj/types` serait de la surface qu'aucun front
 *  ne consomme — le réglage des canaux du pro (D60) reste à faire. */
type Channel = "EMAIL" | "SMS";

export interface VisitNotificationParty {
  userId: string;
  email: string;
  locale: Locale;
}

export interface VisitNotificationInput {
  visitBookingId: string;
  venueId: string;
  venueNameFr: string;
  venueNameAr: string;
  /** Date civile locale `YYYY-MM-DD` — jamais un `Date`, jamais un instant. */
  date: string;
  startMinutes: number;
  /** Nom affiché du client ; l'e-mail sert de repli quand le compte n'a pas de nom. */
  clientName: string;
  /** D61 — téléphone snapshoté s'il existe, SINON l'e-mail. Jamais vide : un
   *  message qui afficherait « téléphone : null » est un bug. */
  contact: string;
  pro: VisitNotificationParty & { phone: string; notifyByEmail: boolean; notifyBySms: boolean };
  client: VisitNotificationParty;
}

@Injectable()
export class VisitNotificationsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(EMAIL_SENDER) private readonly email: EmailSender,
    @Inject(WHATSAPP_SENDER) private readonly whatsapp: WhatsAppSender,
    private readonly logger: PinoLogger
  ) {
    this.logger.setContext("VisitNotifications");
  }

  /** Un rendez-vous vient d'être pris. Le pro n'a rien à valider (D47) : on
   *  l'informe, sur les canaux qu'il a choisis. */
  async notifyProBooked(input: VisitNotificationInput): Promise<void> {
    const vars = this.templateVars(input, input.pro.locale);
    const m = MESSAGES[input.pro.locale].visit;

    if (input.pro.notifyByEmail) {
      await this.dispatch("visit.booked", "EMAIL", input, input.pro.userId, () =>
        this.email.send({
          to: input.pro.email,
          subject: renderTemplate(m.emails.proBookedSubject, vars),
          text: renderTemplate(m.emails.proBookedBody, vars)
        })
      );
    }
    if (input.pro.notifyBySms) {
      await this.dispatch("visit.booked", "SMS", input, input.pro.userId, () =>
        this.whatsapp.send({ to: input.pro.phone, text: renderTemplate(m.whatsapp.proBooked, vars) })
      );
    }
  }

  /** Le client a annulé. Le créneau est libéré (D62) : c'est cette phrase que le
   *  pro doit lire, sinon il croit sa journée toujours prise. */
  async notifyProCancelled(input: VisitNotificationInput): Promise<void> {
    const vars = this.templateVars(input, input.pro.locale);
    const m = MESSAGES[input.pro.locale].visit;

    if (input.pro.notifyByEmail) {
      await this.dispatch("visit.cancelled", "EMAIL", input, input.pro.userId, () =>
        this.email.send({
          to: input.pro.email,
          subject: renderTemplate(m.emails.proCancelledSubject, vars),
          text: renderTemplate(m.emails.proCancelledBody, vars)
        })
      );
    }
    if (input.pro.notifyBySms) {
      await this.dispatch("visit.cancelled", "SMS", input, input.pro.userId, () =>
        this.whatsapp.send({ to: input.pro.phone, text: renderTemplate(m.whatsapp.proCancelled, vars) })
      );
    }
  }

  /** Le client reçoit sa confirmation par e-mail. Pas de canaux à choisir : D60
   *  règle les préférences du PRO, et un rendez-vous sans trace écrite est un
   *  rendez-vous oublié. */
  async confirmToClient(input: VisitNotificationInput): Promise<void> {
    const vars = this.templateVars(input, input.client.locale);
    const m = MESSAGES[input.client.locale].visit;

    await this.dispatch("visit.confirmed", "EMAIL", input, input.client.userId, () =>
      this.email.send({
        to: input.client.email,
        subject: renderTemplate(m.emails.clientConfirmedSubject, vars),
        text: renderTemplate(m.emails.clientConfirmedBody, vars)
      })
    );
  }

  /** Écrit la ligne, envoie, résout. Ne lève JAMAIS — y compris si c'est
   *  l'écriture de la trace qui échoue. */
  private async dispatch(
    type: string,
    channel: Channel,
    input: VisitNotificationInput,
    userId: string,
    send: () => Promise<void>
  ): Promise<void> {
    try {
      const row = await this.prisma.notification.create({
        data: {
          userId,
          channel,
          type,
          status: "QUEUED",
          payload: {
            visitBookingId: input.visitBookingId,
            venueId: input.venueId,
            date: input.date,
            startMinutes: input.startMinutes
          }
        },
        select: { id: true }
      });

      try {
        await send();
        await this.prisma.notification.update({
          where: { id: row.id },
          data: { status: "SENT", sentAt: new Date() }
        });
      } catch (error) {
        const reason = error instanceof Error ? error.message : String(error);
        await this.prisma.notification.update({
          where: { id: row.id },
          data: { status: "FAILED", error: reason.slice(0, 500) }
        });
        this.logger.error({ notificationId: row.id, type, channel }, `Envoi ${channel} échoué : ${reason}`);
      }
    } catch (error) {
      // La trace elle-même n'a pas pu s'écrire (base indisponible). Il reste le
      // log : ce n'est pas une raison pour renvoyer une erreur au client dont le
      // rendez-vous, lui, est bel et bien confirmé.
      this.logger.error({ type, channel, userId }, `Notification non journalisée : ${String(error)}`);
    }
  }

  private templateVars(input: VisitNotificationInput, locale: Locale): Record<string, string> {
    return {
      venue: locale === "ar" ? input.venueNameAr : input.venueNameFr,
      date: this.dateLabel(input.date, locale),
      // D57 — `formatWallClock` est le SEUL formateur d'heure du dépôt.
      // `Intl.DateTimeFormat` basculerait en AM/PM selon la locale du moteur.
      time: formatWallClock(input.startMinutes),
      client: input.clientName,
      contact: input.contact
    };
  }

  /** Date en clair. `Intl` est autorisé pour les DATES (D57 ne l'interdit que
   *  pour l'heure), et le repère est le minuit UTC de la date civile avec
   *  `timeZone: "UTC"` : aucun décalage ne peut faire glisser le jour. */
  private dateLabel(date: string, locale: Locale): string {
    const year = Number(date.slice(0, 4));
    const month = Number(date.slice(5, 7));
    const day = Number(date.slice(8, 10));
    return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", {
      weekday: "long",
      day: "numeric",
      month: "long",
      year: "numeric",
      timeZone: "UTC"
    }).format(new Date(Date.UTC(year, month - 1, day)));
  }
}
