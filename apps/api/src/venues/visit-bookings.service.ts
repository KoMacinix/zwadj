// Prise de rendez-vous de visite — Flux C, Lot C3, D61/D62/D63.
//
// Frontière HTTP : seul endroit à lire l'horloge et à convertir une date civile
// en instant (D48). Le découpage reste dans le moteur pur `visit-slots-engine`.
//
// ── Deux questions, deux autorités ───────────────────────────────────────────
// « Ce créneau EXISTE-t-il ? »   → les plages du pro, donc le moteur.
// « Ce créneau est-il PRIS ? »   → la BASE, et elle seule : l'index unique
//                                 partiel `visit_bookings_no_double_confirmed`.
//
// C'est pourquoi la vérification d'existence appelle `computeVisitSlots` avec
// `bookings: []`. Recharger les rendez-vous pour tester `taken` avant
// d'insérer serait le redoublement applicatif que la doctrine interdit : entre
// le test et l'insertion il reste toujours une fenêtre, et deux clients qui
// cliquent sur le même créneau à la même seconde sont le cas PROBABLE. Le seul
// chemin vers `VISIT_SLOT_TAKEN` est donc la traduction du `P2002`.
//
// ⚠ Aucune arithmétique `% VISIT_DURATION_MINUTES` ici, nulle part. Une plage
// 09:20→11:00 rend légitimement 09:20, 09:50 et 10:20 : un modulo refuserait
// des créneaux RÉELS. Quatrième occurrence de cette famille de bugs — D55 dit
// d'écrire d'abord le cas que la validation doit accepter.
import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import {
  AuthErrorCode,
  BOOKING_HORIZON_MONTHS,
  VenueErrorCode,
  type AvailabilityWindowQueryInput,
  type ProVisitBookingDTO,
  type VisitBookingCreateInput,
  type VisitBookingDTO
} from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import {
  addMonthsCivil,
  civilDayStartMs,
  civilTodayAt,
  civilUtcMs,
  formatCivilDate,
  msToCivilDateTime,
  parseCivilDate,
  type CivilDate
} from "./availability-time";
import { computeVisitSlots } from "./visit-slots-engine";
import { PUBLIC_BASE_WHERE, PUBLIC_DETAIL_STATUSES, SLUG_PATTERN } from "./venues-public.service";
import { VisitNotificationsService, type VisitNotificationInput } from "./visit-notifications.service";

const MINUTE_MS = 60_000;
const DAY_MS = 86_400_000;

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Code Prisma de violation d'unicité — ici, celle de
 *  `visit_bookings_no_double_confirmed`. */
const PRISMA_UNIQUE_VIOLATION = "P2002";

const BOOKING_SELECT = {
  id: true,
  venueId: true,
  scheduledAt: true,
  status: true,
  contactPhone: true,
  cancelledAt: true,
  createdAt: true,
  venue: { select: { slug: true, nameFr: true, nameAr: true } }
} as const;

interface BookingRow {
  id: string;
  venueId: string;
  scheduledAt: Date;
  status: string;
  contactPhone: string | null;
  cancelledAt: Date | null;
  createdAt: Date;
  venue: { slug: string; nameFr: string; nameAr: string };
}

@Injectable()
export class VisitBookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: VisitNotificationsService
  ) {}

  async create(userId: string, slug: string, input: VisitBookingCreateInput): Promise<VisitBookingDTO> {
    // Zod a déjà refusé une date irréelle : le `as` ne masque donc aucun cas.
    const date = parseCivilDate(input.date) as CivilDate;

    if (!SLUG_PATTERN.test(slug)) this.throwVenueNotFound();

    // MÊME règle de visibilité que le détail public et que /visit-slots (D33) :
    // une règle plus stricte proposerait des créneaux que ce POST refuserait.
    // `TEMPORARILY_UNAVAILABLE` reste donc réservable — un pro qui ne veut plus
    // de visites suspend ses plages (`isActive: false`), le levier est à lui.
    const venue = await this.prisma.venue.findFirst({
      where: { slug, ...PUBLIC_BASE_WHERE, status: { in: [...PUBLIC_DETAIL_STATUSES] } },
      select: {
        id: true,
        slug: true,
        nameFr: true,
        nameAr: true,
        owner: {
          select: {
            phone: true,
            notifyByEmail: true,
            notifyBySms: true,
            user: { select: { id: true, email: true, locale: true } }
          }
        }
      }
    });
    if (!venue) this.throwVenueNotFound();

    // UNE seule lecture d'horloge par requête (D48).
    const nowMs = Date.now();

    // D49 écrête les FENÊTRES DE LECTURE ; une écriture hors horizon se REFUSE.
    // Déplacer silencieusement un rendez-vous de dix-huit mois serait pire que
    // de le refuser.
    const horizon = addMonthsCivil(civilTodayAt(nowMs), BOOKING_HORIZON_MONTHS);
    if (civilUtcMs(date) > civilUtcMs(horizon)) this.throwSlotUnavailable();

    const dayStartMs = civilDayStartMs(date);
    // Le jour de la semaine vient de la date CIVILE (D56), jamais d'un `Date`
    // local qui choisirait le fuseau du serveur en silence.
    const dayOfWeek = new Date(civilUtcMs(date)).getUTCDay();

    const windows = await this.prisma.visitAvailability.findMany({
      where: { venueId: venue.id, isActive: true, dayOfWeek },
      select: { dayOfWeek: true, startMinutes: true, endMinutes: true }
    });

    // `bookings: []` est VOULU (voir l'en-tête). Le moteur écarte aussi les
    // créneaux passés À LA MINUTE : un créneau de 09:00 n'existe plus à 09:01.
    const slots = computeVisitSlots({ dayStartMs, dayOfWeek, windows, bookings: [], nowMs });
    if (!slots.some((slot) => slot.startMinutes === input.startMinutes)) this.throwSlotUnavailable();

    const scheduledAt = new Date(dayStartMs + input.startMinutes * MINUTE_MS);

    // Le JWT est stateless : il peut désigner un compte disparu depuis. La
    // réponse utile est « reconnecte-toi », pas une erreur Prisma en 500.
    const client = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, locale: true, firstName: true, lastName: true, phone: true }
    });
    if (!client) {
      throw new UnauthorizedException({
        code: AuthErrorCode.UNAUTHENTICATED,
        message: "auth.errors.unauthenticated"
      });
    }

    // D61 — snapshot du contact : corps, puis profil, puis rien.
    const contactPhone = input.phone ?? client.phone ?? null;

    const row = await this.prisma.$transaction(async (tx) => {
      // D62 — garde anti-nuisance, APPLICATIVE et assumée : aucun index ne peut
      // l'exprimer sans interdire aussi de revenir six mois plus tard. Une
      // course simultanée donne au pire deux rendez-vous au même client —
      // bénin, contrairement au double-booking que la base garantit seule.
      const existing = await tx.visitBooking.findFirst({
        where: {
          venueId: venue.id,
          clientId: userId,
          status: "CONFIRMED",
          scheduledAt: { gte: new Date(nowMs) }
        },
        select: { id: true }
      });
      if (existing) {
        throw new ConflictException({
          code: VenueErrorCode.VISIT_ALREADY_BOOKED,
          message: "venue.errors.visitAlreadyBooked"
        });
      }

      try {
        return await tx.visitBooking.create({
          data: { venueId: venue.id, clientId: userId, scheduledAt, contactPhone },
          select: BOOKING_SELECT
        });
      } catch (error) {
        // SEUL chemin vers VISIT_SLOT_TAKEN : l'exclusivité D59 appartient à
        // l'index unique partiel, on ne fait que traduire son refus.
        if (this.isUniqueViolation(error)) {
          throw new ConflictException({
            code: VenueErrorCode.VISIT_SLOT_TAKEN,
            message: "venue.errors.visitSlotTaken"
          });
        }
        throw error;
      }
    });

    // D63 — APRÈS le commit, jamais dedans. Le service de notification ne lève
    // pas : un e-mail tombé ne dé-réserve pas un rendez-vous confirmé.
    const payload = this.notificationInput(row, venue, client, contactPhone, date, input.startMinutes);
    await this.notifications.notifyProBooked(payload);
    await this.notifications.confirmToClient(payload);

    return this.toDTO(row);
  }

  /** Mes rendez-vous, triés par date CROISSANTE : ce qui arrive bientôt d'abord.
   *  Annulés INCLUS et marqués — « ce rendez-vous n'existe plus » est une
   *  information, sa disparition silencieuse en est le contraire.
   *
   *  Aucune pagination : un client a quelques rendez-vous, pas des centaines.
   *  Décision, pas oubli. */
  async listMine(userId: string): Promise<VisitBookingDTO[]> {
    const rows = await this.prisma.visitBooking.findMany({
      where: { clientId: userId },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      select: BOOKING_SELECT
    });
    return rows.map((row) => this.toDTO(row));
  }

  /** C3b — les rendez-vous d'UNE salle, pour son pro.
   *
   *  ⚠ D70 — la fenêtre n'est PAS écrêtée au présent. `clampWindow` (D49) sert
   *  aux DISPONIBILITÉS : proposer un créneau passé n'a aucun sens. Ici le passé
   *  est l'historique du pro — qui est venu, qui ne s'est pas présenté — et
   *  l'écrêter le lui retirerait à chaque requête.
   *
   *  Annulés INCLUS : un rendez-vous qui disparaît sans un mot ressemble à un
   *  bug, et le pro qui a bloqué son après-midi doit voir qu'il est libéré. */
  async listForVenue(userId: string, venueId: string, window: AvailabilityWindowQueryInput): Promise<ProVisitBookingDTO[]> {
    await this.ownedVenue(userId, venueId);

    const from = parseCivilDate(window.from);
    const to = parseCivilDate(window.to);
    if (!from || !to) this.throwSlotUnavailable();

    // Bornes en INSTANTS : début du premier jour inclus, début du lendemain du
    // dernier jour exclu. Comparer des dates civiles à un `timestamptz` en base
    // ferait dépendre le résultat du fuseau de la session PostgreSQL.
    const fromMs = civilDayStartMs(from);
    const toMs = civilDayStartMs(to) + DAY_MS;

    const rows = await this.prisma.visitBooking.findMany({
      where: { venueId, scheduledAt: { gte: new Date(fromMs), lt: new Date(toMs) } },
      orderBy: [{ scheduledAt: "asc" }, { id: "asc" }],
      select: {
        id: true,
        scheduledAt: true,
        status: true,
        contactPhone: true,
        cancelledAt: true,
        createdAt: true,
        client: { select: { email: true, firstName: true, lastName: true } }
      }
    });

    return rows.map((row) => {
      const { date, startMinutes } = this.civilOf(row.scheduledAt);
      return {
        id: row.id,
        // `formatCivilDate` et non le repère brut : le DTO transporte une chaîne
        // `YYYY-MM-DD`, jamais la structure interne du moteur de dates.
        date: formatCivilDate(date),
        startMinutes,
        scheduledAt: row.scheduledAt.toISOString(),
        status: row.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
        clientFirstName: row.client.firstName,
        clientLastName: row.client.lastName,
        clientEmail: row.client.email,
        contactPhone: row.contactPhone,
        cancelledAt: row.cancelledAt?.toISOString() ?? null,
        createdAt: row.createdAt.toISOString()
      } satisfies ProVisitBookingDTO;
    });
  }

  /** C3b — annulation par le PRO. Mêmes règles que D62 côté client (douce,
   *  idempotente, refusée sur le passé), mais c'est le CLIENT qu'on prévient :
   *  il a bloqué son samedi pour cette visite.
   *
   *  ⚠ La propriété se vérifie sur la SALLE, et le rendez-vous se cherche
   *  ensuite DANS cette salle. Chercher le rendez-vous d'abord permettrait à un
   *  pro de découvrir, par la différence entre 404 et 403, qu'un identifiant
   *  existe ailleurs. */
  async cancelAsPro(userId: string, venueId: string, bookingId: string): Promise<void> {
    await this.ownedVenue(userId, venueId);

    const row = UUID_PATTERN.test(bookingId)
      ? await this.prisma.visitBooking.findFirst({
          where: { id: bookingId, venueId },
          select: {
            ...BOOKING_SELECT,
            venue: {
              select: {
                slug: true,
                nameFr: true,
                nameAr: true,
                owner: {
                  select: {
                    phone: true,
                    notifyByEmail: true,
                    notifyBySms: true,
                    user: { select: { id: true, email: true, locale: true } }
                  }
                }
              }
            },
            client: { select: { id: true, email: true, locale: true, firstName: true, lastName: true } }
          }
        })
      : null;

    if (!row) {
      throw new NotFoundException({
        code: VenueErrorCode.VISIT_BOOKING_NOT_FOUND,
        message: "venue.errors.visitBookingNotFound"
      });
    }

    if (row.status === "CANCELLED") return;

    const nowMs = Date.now();
    if (row.scheduledAt.getTime() < nowMs) {
      throw new ConflictException({
        code: VenueErrorCode.VISIT_BOOKING_PAST,
        message: "venue.errors.visitBookingPast"
      });
    }

    await this.prisma.visitBooking.update({
      where: { id: row.id },
      data: { status: "CANCELLED", cancelledAt: new Date(nowMs) }
    });

    const { date, startMinutes } = this.civilOf(row.scheduledAt);
    await this.notifications.notifyClientCancelledByPro(
      this.notificationInput(row, { id: row.venueId, ...row.venue }, row.client, row.contactPhone, date, startMinutes)
    );
  }

  /** 404 INDISTINCT sur une salle qui n'est pas la sienne — anti-énumération. */
  private async ownedVenue(userId: string, venueId: string): Promise<void> {
    const venue = UUID_PATTERN.test(venueId)
      ? await this.prisma.venue.findFirst({
          where: { id: venueId, deletedAt: null, owner: { userId } },
          select: { id: true }
        })
      : null;
    if (!venue) {
      throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
    }
  }

  /** D62 — annulation DOUCE : c'est le filtre `WHERE status = 'CONFIRMED'` de
   *  l'index qui libère le créneau, et la ligne annulée reste la trace de ce qui
   *  a été libéré. Un DELETE effacerait la seconde information. */
  async cancel(userId: string, bookingId: string): Promise<void> {
    const row = UUID_PATTERN.test(bookingId)
      ? await this.prisma.visitBooking.findFirst({
          where: { id: bookingId, clientId: userId },
          select: {
            ...BOOKING_SELECT,
            venue: {
              select: {
                slug: true,
                nameFr: true,
                nameAr: true,
                owner: {
                  select: {
                    phone: true,
                    notifyByEmail: true,
                    notifyBySms: true,
                    user: { select: { id: true, email: true, locale: true } }
                  }
                }
              }
            },
            client: { select: { id: true, email: true, locale: true, firstName: true, lastName: true } }
          }
        })
      : null;

    // 404 INDISTINCT « parmi MES rendez-vous » : id malformé, inexistant, ou
    // rendez-vous d'un autre client — anti-énumération (doctrine A2).
    if (!row) {
      throw new NotFoundException({
        code: VenueErrorCode.VISIT_BOOKING_NOT_FOUND,
        message: "venue.errors.visitBookingNotFound"
      });
    }

    // Idempotent : annuler deux fois ne réécrit pas `cancelledAt`, sinon la date
    // d'annulation deviendrait celle du dernier clic.
    if (row.status === "CANCELLED") return;

    const nowMs = Date.now();
    if (row.scheduledAt.getTime() < nowMs) {
      throw new ConflictException({
        code: VenueErrorCode.VISIT_BOOKING_PAST,
        message: "venue.errors.visitBookingPast"
      });
    }

    await this.prisma.visitBooking.update({
      where: { id: row.id },
      data: { status: "CANCELLED", cancelledAt: new Date(nowMs) }
    });

    const { date, startMinutes } = this.civilOf(row.scheduledAt);
    await this.notifications.notifyProCancelled(
      this.notificationInput(row, { id: row.venueId, ...row.venue }, row.client, row.contactPhone, date, startMinutes)
    );
  }

  /** Repère civil d'un instant stocké (symétrie D51) : le client relit
   *  exactement la date et l'heure qu'il a envoyées. Aucun `getHours()` local,
   *  aucun `Intl` — le fuseau d'Alger et lui seul. */
  private civilOf(scheduledAt: Date): { date: CivilDate; startMinutes: number } {
    // `msToCivilDateTime` est la SEULE fonction du dépôt qui applique le
    // décalage d'Alger dans ce sens : recalculer l'offset ici en créerait une
    // seconde vérité, et c'est toujours la seconde qui dérive.
    const civil = msToCivilDateTime(scheduledAt.getTime());
    const date = parseCivilDate(civil.slice(0, 10)) as CivilDate;
    return { date, startMinutes: Number(civil.slice(11, 13)) * 60 + Number(civil.slice(14, 16)) };
  }

  private toDTO(row: BookingRow): VisitBookingDTO {
    const { date, startMinutes } = this.civilOf(row.scheduledAt);
    return {
      id: row.id,
      venueId: row.venueId,
      venueSlug: row.venue.slug,
      venueNameFr: row.venue.nameFr,
      venueNameAr: row.venue.nameAr,
      date: formatCivilDate(date),
      startMinutes,
      scheduledAt: row.scheduledAt.toISOString(),
      status: row.status === "CANCELLED" ? "CANCELLED" : "CONFIRMED",
      contactPhone: row.contactPhone,
      cancelledAt: row.cancelledAt ? row.cancelledAt.toISOString() : null,
      createdAt: row.createdAt.toISOString()
    };
  }

  private notificationInput(
    row: { id: string },
    venue: {
      id: string;
      nameFr: string;
      nameAr: string;
      owner: {
        phone: string;
        notifyByEmail: boolean;
        notifyBySms: boolean;
        user: { id: string; email: string; locale: string };
      };
    },
    client: { id: string; email: string; locale: string; firstName: string | null; lastName: string | null },
    contactPhone: string | null,
    date: CivilDate,
    startMinutes: number
  ): VisitNotificationInput {
    const name = [client.firstName, client.lastName].filter((part) => part && part.trim()).join(" ");
    return {
      visitBookingId: row.id,
      venueId: venue.id,
      venueNameFr: venue.nameFr,
      venueNameAr: venue.nameAr,
      date: formatCivilDate(date),
      startMinutes,
      // Un compte peut n'avoir aucun nom (inscription Google) : l'e-mail est un
      // repli lisible, « undefined » n'en est pas un.
      clientName: name.length > 0 ? name : client.email,
      // D61 — le téléphone s'il existe, SINON l'e-mail. Le pro doit toujours
      // avoir un moyen de rappeler ; un message affichant « null » est un bug.
      contact: contactPhone ?? client.email,
      pro: {
        userId: venue.owner.user.id,
        email: venue.owner.user.email,
        locale: venue.owner.user.locale === "ar" ? "ar" : "fr",
        phone: venue.owner.phone,
        notifyByEmail: venue.owner.notifyByEmail,
        notifyBySms: venue.owner.notifyBySms
      },
      client: {
        userId: client.id,
        email: client.email,
        locale: client.locale === "ar" ? "ar" : "fr"
      }
    };
  }

  private isUniqueViolation(error: unknown): boolean {
    return (
      typeof error === "object" &&
      error !== null &&
      "code" in error &&
      (error as { code?: unknown }).code === PRISMA_UNIQUE_VIOLATION
    );
  }

  /** 404 INDISTINCT, doctrine A2/A3 — anti-énumération : brouillon, masquée,
   *  supprimée et slug inconnu répondent la même chose. */
  private throwVenueNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }

  private throwSlotUnavailable(): never {
    throw new ConflictException({
      code: VenueErrorCode.VISIT_SLOT_UNAVAILABLE,
      message: "venue.errors.visitSlotUnavailable"
    });
  }
}
