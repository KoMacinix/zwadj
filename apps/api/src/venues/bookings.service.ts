// Demandes de réservation de salle — Flux E, Lot E1a, D74 → D83.
//
// Frontière HTTP : seul endroit à lire l'horloge et à convertir une date civile
// en instant (D48). Les deux calculs qui méritent d'être prouvés seuls vivent
// dans des modules PURS — `booking-window` (D77) et `deposit` (D81).
//
// ── Trois questions, trois autorités, jamais redoublées ──────────────────────
// « Ce créneau EXISTE-t-il ? »  → les SlotTemplate actifs + le calendrier B3.
// « Est-il DÉJÀ PRIS ? »        → la BASE, et elle seule : l'EXCLUDE
//                                 `bookings_no_overlap_accepted_confirmed`.
// « Recouvre-t-il un BLOCAGE ? »→ vérification APPLICATIVE, dans la transaction,
//                                 sous verrou — une EXCLUDE ne traverse pas deux
//                                 tables (D51/D78).
//
// C'est pourquoi l'acceptation n'interroge JAMAIS les autres réservations avant
// d'écrire. Entre le test et l'écriture reste toujours une fenêtre, et deux pros
// qui acceptent deux demandes concurrentes sur la même date sont le cas
// PROBABLE, pas l'exception. Le seul chemin vers `BOOKING_SLOT_TAKEN` est la
// traduction du `23P01`.
//
// ⚠ D80 — ce lot s'arrête à ACCEPTED. Aucune route ne mène à CONFIRMED, aucun
// job n'expire quoi que ce soit. `expiresAt` et `paymentDueAt` sont posés pour
// le lot Paiement ; en attendant, une demande acceptée verrouille son créneau
// jusqu'à ce que le pro l'annule. Dette assumée, pas un oubli.
import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from "@nestjs/common";
import {
  AuthErrorCode,
  BOOKING_HORIZON_MONTHS,
  BookingErrorCode,
  BookingStatus,
  ServiceErrorCode,
  type BookingCancelInput,
  type BookingCreateInput,
  type BookingDTO,
  type BookingDeclineInput,
  type ProBookingDTO
} from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  addMonthsCivil,
  civilTodayAt,
  civilUtcMs,
  formatCivilDate,
  holidayKey,
  parseCivilDate,
  toCalendarDay,
  type CivilDate
} from "./availability-time";
import { BookingNotificationsService, type BookingNotificationInput } from "./booking-notifications.service";
import { computeBookingWindow } from "./booking-window";
import { resolveDepositCents } from "./deposit";
import { resolveServiceLine, type ResolvedLine } from "./service-pricing";
import { SERVICE_SELECT } from "./services.service";
import { resolveSlotPrice } from "./pricing-engine";
// Le SELECT des règles est celui du service qui les possède : en recopier un
// ici ferait deux vérités sur les colonnes que le moteur de prix attend.
import { RULE_SELECT } from "./pricing-rules.service";
import { PUBLIC_BASE_WHERE, PUBLIC_DETAIL_STATUSES, SLUG_PATTERN } from "./venues-public.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** Code PostgreSQL `exclusion_violation`. C'est l'EXCLUDE
 *  `bookings_no_overlap_accepted_confirmed` qui parle — le seul chemin vers
 *  `BOOKING_SLOT_TAKEN`. */
const PG_EXCLUSION_VIOLATION = "23P01";

/** Nom de LA contrainte qui porte l'exclusivité. Le lire permet de ne pas
 *  confondre notre règle avec une autre EXCLUDE future sur la même table. */
const BOOKING_OVERLAP_CONSTRAINT = "bookings_no_overlap_accepted_confirmed";

/** Délai de réponse laissé au pro (D82). Borné par le début de l'événement :
 *  une demande pour dans cinq jours ne doit pas expirer après la fête. */
const PRO_RESPONSE_DAYS = 7;
/** Fenêtre d'acompte après acceptation (D82). Posée, pas encore consommée (D80). */
const PAYMENT_WINDOW_HOURS = 48;

const DAY_MS = 86_400_000;
const HOUR_MS = 3_600_000;

/** Statuts qui VERROUILLENT le créneau. Miroir exact du `WHERE` de l'EXCLUDE :
 *  les deux doivent bouger ensemble, ou l'écran mentirait sur la base. */
const LOCKING_STATUSES = [BookingStatus.ACCEPTED, BookingStatus.CONFIRMED] as const;

const BOOKING_SELECT = {
  id: true,
  venueId: true,
  clientId: true,
  status: true,
  paymentMethod: true,
  eventDate: true,
  startsAt: true,
  endsAt: true,
  slotNameFr: true,
  slotNameAr: true,
  guests: true,
  basePriceCents: true,
  servicesTotalCents: true,
  totalCents: true,
  depositCents: true,
  clientMessage: true,
  services: {
    orderBy: { id: "asc" },
    select: {
      id: true,
      serviceId: true,
      tierId: true,
      nameFr: true,
      nameAr: true,
      pricingType: true,
      tierLabelFr: true,
      tierLabelAr: true,
      unitPriceCents: true,
      quantity: true,
      lineTotalCents: true
    }
  },
  declineReason: true,
  cancellationReason: true,
  contactFirstName: true,
  contactLastName: true,
  contactPhone: true,
  contactEmail: true,
  expiresAt: true,
  paymentDueAt: true,
  createdAt: true,
  venue: { select: { slug: true, nameFr: true, nameAr: true } }
} as const;

type BookingRow = Prisma.BookingGetPayload<{ select: typeof BOOKING_SELECT }>;

@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly notifications: BookingNotificationsService
  ) {}

  // ───────────────────────────────────────────────────────────────────────────
  // Création — POST /venues/:slug/bookings
  // ───────────────────────────────────────────────────────────────────────────

  async create(userId: string, slug: string, input: BookingCreateInput): Promise<BookingDTO> {
    // Zod a déjà refusé une date irréelle : le `as` ne masque aucun cas.
    const date = parseCivilDate(input.eventDate) as CivilDate;

    if (!SLUG_PATTERN.test(slug)) this.throwVenueNotFound();

    // MÊME règle de visibilité que le détail public et que la disponibilité
    // (D33) : une règle plus stricte proposerait au calendrier des créneaux que
    // ce POST refuserait.
    const venue = await this.prisma.venue.findFirst({
      where: { slug, ...PUBLIC_BASE_WHERE, status: { in: [...PUBLIC_DETAIL_STATUSES] } },
      select: {
        id: true,
        bookingMode: true,
        capacityMax: true,
        depositRateBps: true,
        depositAmountCents: true,
        nameFr: true,
        nameAr: true,
        slotTemplates: {
          where: { id: input.slotTemplateId, isActive: true },
          select: {
            id: true,
            nameFr: true,
            nameAr: true,
            startMinutes: true,
            endMinutes: true,
            basePriceCents: true,
            pricingRules: { where: { isActive: true }, select: RULE_SELECT }
          }
        },
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

    const slot = venue.slotTemplates[0];
    // Créneau inconnu, retiré, ou appartenant à une autre salle : « ce créneau
    // n'existe pas », pas « il est pris ». Les deux phrases n'appellent pas la
    // même action du client.
    if (!slot) this.throwSlotUnavailable();

    if (input.guests > venue.capacityMax) {
      throw new BadRequestException({
        code: BookingErrorCode.BOOKING_GUESTS_EXCEED_CAPACITY,
        message: "booking.errors.guestsExceedCapacity"
      });
    }

    // UNE seule lecture d'horloge par requête (D48).
    const nowMs = Date.now();
    const today = civilTodayAt(nowMs);

    // Strictement future : on ne prend pas une demande pour aujourd'hui — la
    // salle n'aurait pas le temps de répondre, et le créneau du soir est
    // peut-être déjà commencé. Même autorité que le calendrier pour l'horizon
    // (D49) : une écriture au-delà se REFUSE, elle ne se déplace pas.
    const horizon = addMonthsCivil(today, BOOKING_HORIZON_MONTHS);
    if (civilUtcMs(date) <= civilUtcMs(today) || civilUtcMs(date) > civilUtcMs(horizon)) {
      this.throwSlotUnavailable();
    }

    const window = computeBookingWindow(date, venue.bookingMode === "SINGLE_SLOT" ? null : slot);

    // Prix : la MÊME résolution que le calendrier public, sur la vraie date.
    const holidays = await this.prisma.holiday.findMany({
      where: { date: new Date(civilUtcMs(date)) },
      select: { date: true }
    });
    const day = toCalendarDay(date, new Set(holidays.map((row) => holidayKey(row.date))));
    const price = resolveSlotPrice(slot.basePriceCents, slot.pricingRules, day);

    // E2a — les PRESTATIONS. Résolues depuis le catalogue de la salle, jamais
    // depuis le corps de la requête (D91) : un prix reçu du navigateur est un
    // prix éditable.
    const choices = input.services ?? [];
    const lines: ResolvedLine[] = [];
    if (choices.length > 0) {
      const catalogue = await this.prisma.service.findMany({
        where: { venueId: venue.id, id: { in: choices.map((choice) => choice.serviceId) } },
        select: SERVICE_SELECT
      });
      for (const choice of choices) {
        const found = catalogue.find((row) => row.id === choice.serviceId);
        // Une prestation d'une AUTRE salle, ou retirée du catalogue depuis que
        // l'onglet est ouvert : refus explicite, jamais un silence à zéro dinar.
        if (!found) this.throwServiceUnavailable(ServiceErrorCode.SERVICE_UNAVAILABLE);
        const resolved = resolveServiceLine(found, choice, input.guests);
        if (!resolved.ok) this.throwServiceUnavailable(resolved.failure.code);
        lines.push(resolved.line);
      }
    }

    const basePriceCents = price.priceCents;
    const servicesTotalCents = lines.reduce((sum, line) => sum + line.lineTotalCents, 0);
    const totalCents = basePriceCents + servicesTotalCents;
    const depositCents = resolveDepositCents(venue, totalCents);

    // D75 — le client annonce ce qu'il a vu. Divergence ⇒ 409 portant les
    // montants RÉELS : il rejoue en connaissance de cause, jamais engagé sur un
    // montant qu'il n'a pas lu.
    if (input.expectedTotalCents !== totalCents || input.expectedDepositCents !== depositCents) {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_PRICE_CHANGED,
        message: "booking.errors.priceChanged",
        totalCents,
        depositCents
      });
    }

    // Le JWT est stateless : il peut désigner un compte disparu depuis. La
    // réponse utile est « reconnecte-toi », pas une erreur Prisma en 500.
    const client = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { id: true, email: true, locale: true }
    });
    if (!client) {
      throw new UnauthorizedException({ code: AuthErrorCode.UNAUTHENTICATED, message: "auth.errors.unauthenticated" });
    }

    // D82 — bornée par le début de l'événement.
    const expiresAt = new Date(Math.min(nowMs + PRO_RESPONSE_DAYS * DAY_MS, window.startsAt.getTime()));

    // ⚠ Aucune transaction ici, et c'est voulu : une demande PENDING ne
    // verrouille RIEN (décision produit actée). Il n'y a donc aucun invariant
    // multi-lignes à protéger — l'EXCLUDE ne regarde même pas cette ligne.
    const row = await this.prisma.booking.create({
      data: {
        venueId: venue.id,
        clientId: userId,
        slotTemplateId: slot.id,
        source: "CLIENT",
        status: BookingStatus.PENDING,
        paymentMethod: input.paymentMethod,
        eventDate: new Date(civilUtcMs(date)),
        startsAt: window.startsAt,
        endsAt: window.endsAt,
        // Snapshots : la ligne survit au renommage ou au retrait du créneau.
        slotNameFr: slot.nameFr,
        slotNameAr: slot.nameAr,
        guests: input.guests,
        basePriceCents,
        servicesTotalCents,
        totalCents,
        depositCents,
        contactFirstName: input.contactFirstName,
        contactLastName: input.contactLastName,
        contactPhone: input.contactPhone,
        contactEmail: input.contactEmail,
        clientMessage: input.clientMessage ?? null,
        expiresAt,
        // Écriture NESTÉE : les lignes naissent avec la réservation, dans la
        // même instruction. Un `createMany` séparé laisserait une réservation
        // dont le `services_total_cents` ne correspond à aucune ligne.
        services: {
          create: lines.map((line) => ({
            serviceId: line.serviceId,
            tierId: line.tierId,
            nameFr: line.nameFr,
            nameAr: line.nameAr,
            pricingType: line.pricingType as "FIXED" | "PER_GUEST" | "TIERED" | "PER_UNIT",
            tierLabelFr: line.tierLabelFr,
            tierLabelAr: line.tierLabelAr,
            unitPriceCents: line.unitPriceCents,
            quantity: line.quantity,
            lineTotalCents: line.lineTotalCents
          }))
        }
      },
      select: BOOKING_SELECT
    });

    // D63 — APRÈS l'écriture, jamais dedans, et sans lever : un e-mail tombé ne
    // défait pas une demande enregistrée.
    await this.notifications.notifyProRequested(this.notificationInput(row, venue, client, null));

    return this.toDTO(row);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Lectures
  // ───────────────────────────────────────────────────────────────────────────

  /** Mes demandes, la plus proche d'abord. Refusées et annulées INCLUSES et
   *  marquées : « cette demande n'a pas abouti » est une information, sa
   *  disparition silencieuse en est le contraire.
   *
   *  Aucune pagination : un client a quelques demandes, pas des centaines.
   *  Décision, pas oubli. */
  async listMine(userId: string): Promise<BookingDTO[]> {
    const rows = await this.prisma.booking.findMany({
      where: { clientId: userId },
      orderBy: [{ eventDate: "asc" }, { startsAt: "asc" }, { id: "asc" }],
      select: BOOKING_SELECT
    });
    return rows.map((row) => this.toDTO(row));
  }

  /** Les demandes d'UNE de mes salles, avec les CONFLITS calculés à la lecture.
   *
   *  ⚠ `conflictIds` n'est jamais persisté : une réservation acceptée peut
   *  s'annuler ensuite, et un drapeau stocké deviendrait faux en silence. Le
   *  calcul s'appuie sur `bookings_venue_timerange_gist`, posé pour ça. */
  async listForVenue(userId: string, venueId: string): Promise<ProBookingDTO[]> {
    await this.ownedVenue(userId, venueId);

    const rows = await this.prisma.booking.findMany({
      where: { venueId },
      orderBy: [{ eventDate: "asc" }, { startsAt: "asc" }, { id: "asc" }],
      select: BOOKING_SELECT
    });

    // Le conflit ne concerne que ce qui est encore VIVANT : une demande refusée
    // ou annulée ne dispute plus rien à personne.
    const live = rows.filter((row) => row.status === BookingStatus.PENDING || this.locks(row.status));

    return rows.map((row) => ({
      ...this.toDTO(row),
      contactFirstName: row.contactFirstName,
      contactLastName: row.contactLastName,
      contactPhone: row.contactPhone,
      contactEmail: row.contactEmail,
      conflictIds:
        row.status === BookingStatus.PENDING || this.locks(row.status)
          ? live
              .filter(
                (other) =>
                  other.id !== row.id &&
                  other.startsAt.getTime() < row.endsAt.getTime() &&
                  other.endsAt.getTime() > row.startsAt.getTime()
              )
              .map((other) => other.id)
          : []
    }));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Transitions
  // ───────────────────────────────────────────────────────────────────────────

  /** Le pro accepte. C'est LE moment où le créneau se verrouille — et le seul
   *  endroit du lot où la base peut dire non. */
  async accept(userId: string, bookingId: string): Promise<BookingDTO> {
    const { row, venue } = await this.ownedBooking(userId, bookingId);

    const acceptedAt = new Date();
    const paymentDueAt = new Date(
      Math.min(acceptedAt.getTime() + PAYMENT_WINDOW_HOURS * HOUR_MS, row.startsAt.getTime())
    );

    const updated = await this.prisma.$transaction(async (tx) => {
      // Verrou de sérialisation par SALLE. Le même que prend la création d'un
      // blocage (D51) : c'est ce qui rend les contrôles ci-dessous fiables
      // malgré deux écritures concurrentes sur deux tables différentes.
      await tx.$queryRaw`SELECT id FROM venues WHERE id = ${row.venueId}::uuid FOR UPDATE`;

      // D117 — LE STATUT SE LIT ICI, ET NULLE PART AILLEURS.
      //
      // Il se lisait AVANT la transaction, sur la ligne rapportée par
      // `ownedBooking` : deux acceptations concurrentes de la MÊME demande le
      // trouvaient toutes les deux à PENDING et passaient toutes les deux.
      // L'`EXCLUDE` ne les arrête pas — une ligne ne chevauche pas elle-même —
      // donc la seconde réécrivait `acceptedAt`/`paymentDueAt` et RENOTIFIAIT
      // le client. Le double accept SÉQUENTIEL rendait bien 409, ce qui a
      // masqué le trou : c'est le cas concurrent, et lui seul, qui passait.
      //
      // Une seule autorité par question (D78) : le contrôle d'avant
      // transaction est SUPPRIMÉ, pas doublé.
      const fresh = await tx.booking.findUniqueOrThrow({
        where: { id: row.id },
        select: { status: true }
      });
      this.assertStatus(fresh, [BookingStatus.PENDING]);

      // Conflit avec un BLOCAGE. Une EXCLUDE ne traverse pas deux tables : ce
      // contrôle-là DOIT être applicatif, et il est correct parce qu'il est
      // sous verrou.
      const block = await tx.availabilityBlock.findFirst({
        where: {
          venueId: row.venueId,
          blockedFrom: { lt: row.endsAt },
          blockedUntil: { gt: row.startsAt }
        },
        select: { id: true }
      });
      if (block) {
        throw new ConflictException({
          code: BookingErrorCode.BOOKING_BLOCKED_PERIOD,
          message: "booking.errors.blockedPeriod"
        });
      }

      try {
        return await tx.booking.update({
          where: { id: row.id },
          data: { status: BookingStatus.ACCEPTED, acceptedAt, paymentDueAt },
          select: BOOKING_SELECT
        });
      } catch (error) {
        // SEUL chemin vers BOOKING_SLOT_TAKEN. On ne fait que traduire le refus
        // de l'EXCLUDE : l'exclusivité appartient à la base, jamais à un
        // `SELECT` préalable qui laisserait une fenêtre ouverte.
        if (this.isExclusionViolation(error)) {
          throw new ConflictException({
            code: BookingErrorCode.BOOKING_SLOT_TAKEN,
            message: "booking.errors.slotTaken"
          });
        }
        throw error;
      }
    });

    await this.notifications.notifyClientAccepted(await this.notificationFor(updated, venue, null));
    return this.toDTO(updated);
  }

  /** Le pro refuse. Motif FACULTATIF (D83) : contraindre un pro à justifier au
   *  téléphone, dans une seconde langue, produit « ... » comme motif. */
  async decline(userId: string, bookingId: string, input: BookingDeclineInput): Promise<BookingDTO> {
    const { row, venue } = await this.ownedBooking(userId, bookingId);

    const updated = await this.transitionStatus(row.id, [BookingStatus.PENDING], {
      status: BookingStatus.DECLINED,
      declinedAt: new Date(),
      declineReason: input.reason ?? null
    });

    await this.notifications.notifyClientDeclined(await this.notificationFor(updated, venue, input.reason ?? null));
    return this.toDTO(updated);
  }

  /** Le pro annule une demande DÉJÀ ACCEPTÉE. C'est aujourd'hui le seul moyen de
   *  libérer un créneau verrouillé, tant que le lot Paiement n'existe pas (D80). */
  async cancelAsPro(userId: string, bookingId: string, input: BookingCancelInput): Promise<BookingDTO> {
    const { row, venue } = await this.ownedBooking(userId, bookingId);

    const updated = await this.transitionStatus(row.id, [BookingStatus.ACCEPTED], {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: input.reason ?? null
    });

    await this.notifications.notifyClientDeclined(await this.notificationFor(updated, venue, input.reason ?? null));
    return this.toDTO(updated);
  }

  /** Le client annule.
   *
   *  D83 — motif LIBRE tant que la demande est PENDING : rien n'est verrouillé,
   *  il ne doit d'explication à personne. Motif OBLIGATOIRE sur une demande
   *  ACCEPTED : le pro a peut-être refusé d'autres dates entre-temps.
   *  L'asymétrie suit celle du préjudice, elle n'est pas décorative. */
  async cancelAsClient(userId: string, bookingId: string, input: BookingCancelInput): Promise<BookingDTO> {
    if (!UUID_PATTERN.test(bookingId)) this.throwBookingNotFound();

    const row = await this.prisma.booking.findFirst({
      where: { id: bookingId, clientId: userId },
      select: BOOKING_SELECT
    });
    if (!row) this.throwBookingNotFound();

    this.assertStatus(row, [BookingStatus.PENDING, BookingStatus.ACCEPTED]);

    if (row.status === BookingStatus.ACCEPTED && (input.reason === undefined || input.reason === "")) {
      throw new BadRequestException({
        code: BookingErrorCode.BOOKING_STATUS_CONFLICT,
        message: "booking.errors.cancelReasonRequired",
        status: row.status
      });
    }

    const updated = await this.transitionStatus(row.id, [BookingStatus.PENDING, BookingStatus.ACCEPTED], {
      status: BookingStatus.CANCELLED,
      cancelledAt: new Date(),
      cancellationReason: input.reason ?? null
    });

    return this.toDTO(updated);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Aides
  // ───────────────────────────────────────────────────────────────────────────

  /** 404 INDISTINCT « dans MA salle » (D47) : id malformé, inexistant, ou salle
   *  d'un autre pro rendent le même 404. Distinguer les trois apprendrait à un
   *  curieux ce qui existe. */
  private async ownedVenue(userId: string, venueId: string): Promise<void> {
    if (!UUID_PATTERN.test(venueId)) this.throwVenueNotFound();
    const owned = await this.prisma.venue.findFirst({
      where: { id: venueId, deletedAt: null, owner: { userId } },
      select: { id: true }
    });
    if (!owned) this.throwVenueNotFound();
  }

  private async ownedBooking(
    userId: string,
    bookingId: string
  ): Promise<{ row: BookingRow; venue: VenueForNotification }> {
    if (!UUID_PATTERN.test(bookingId)) this.throwBookingNotFound();

    const row = await this.prisma.booking.findFirst({
      where: { id: bookingId, venue: { deletedAt: null, owner: { userId } } },
      select: BOOKING_SELECT
    });
    if (!row) this.throwBookingNotFound();

    const venue = await this.prisma.venue.findUniqueOrThrow({
      where: { id: row.venueId },
      select: {
        id: true,
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

    return { row, venue };
  }

  /** Une transition interdite rend le statut RÉEL : l'écran se remet d'aplomb
   *  sans recharger à l'aveugle, et l'utilisateur comprend ce qui s'est passé
   *  entre son affichage et son clic. */

  /**
   * D121 — TRANSITION DE STATUT ATOMIQUE, en un seul endroit.
   *
   * `decline`, `cancelAsPro` et `cancelAsClient` lisaient le statut hors de
   * toute transaction puis écrivaient sans condition : deux appels concurrents
   * passaient tous les deux, réécrivaient la date et envoyaient DEUX fois le
   * même message au client.
   *
   * ⚠ Pas de verrou ici, contrairement à `accept` (D117) : il n'y a aucun
   * invariant à travers plusieurs lignes ou plusieurs tables. Une seule ligne
   * change, donc un check-and-set suffit — le `WHERE status IN (...)` fait le
   * travail que le verrou ferait, sans en payer le prix. C'est le même idiome
   * que la rotation du refresh token (D9).
   */
  private async transitionStatus(
    id: string,
    from: readonly BookingStatus[],
    data: Prisma.BookingUpdateManyMutationInput
  ): Promise<BookingRow> {
    return this.prisma.$transaction(async (tx) => {
      const consumed = await tx.booking.updateMany({ where: { id, status: { in: [...from] } }, data });
      if (consumed.count === 0) {
        // Quelqu'un a changé le statut entre notre lecture et notre écriture.
        // La relecture est l'AUTORITÉ : elle produit le 409 avec le statut réel.
        const fresh = await tx.booking.findUniqueOrThrow({ where: { id }, select: { status: true } });
        this.assertStatus(fresh, from);
        // Inatteignable : si `fresh.status` était permis, le check-and-set
        // aurait mordu. On ne laisse pas pour autant un chemin sans issue.
        throw new ConflictException({
          code: BookingErrorCode.BOOKING_STATUS_CONFLICT,
          message: "booking.errors.statusConflict",
          status: fresh.status
        });
      }
      return tx.booking.findUniqueOrThrow({ where: { id }, select: BOOKING_SELECT });
    });
  }

  /** ⚠ D117 — prend `{ status }` et non `BookingRow` : les transitions qui
   *  verrouillent relisent le statut SOUS VERROU avec un `select` minimal.
   *  Élargir ici évitait de refaire un `BOOKING_SELECT` complet uniquement
   *  pour relire une colonne. */
  private assertStatus(row: { status: string }, allowed: readonly string[]): void {
    if (!allowed.includes(row.status)) {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_STATUS_CONFLICT,
        message: "booking.errors.statusConflict",
        status: row.status
      });
    }
  }

  private locks(status: string): boolean {
    return (LOCKING_STATUSES as readonly string[]).includes(status);
  }

  /** Vrai si la base a refusé pour cause de CHEVAUCHEMENT.
   *
   *  ⚠ Forme relevée à l'exécution, pas devinée : sous l'adaptateur pilote, une
   *  violation d'exclusion ne remonte PAS en `PrismaClientKnownRequestError`
   *  mais en `DriverAdapterError`, dont le code PostgreSQL vit dans `cause`.
   *  On lit donc `cause.code` — stable et documenté — et, à défaut, le NOM de
   *  la contrainte, qui nous appartient. Jamais le message brut : il est
   *  traduit selon la locale du serveur PostgreSQL.
   *
   *  Le nom en second n'est pas une ceinture de plus : c'est ce qui distingue
   *  NOTRE règle d'une autre `EXCLUDE` qui apparaîtrait un jour sur la table. */
  private isExclusionViolation(error: unknown): boolean {
    const cause = (error as { cause?: { code?: string; message?: string } }).cause;
    if (cause?.code === PG_EXCLUSION_VIOLATION) {
      return (cause.message ?? "").includes(BOOKING_OVERLAP_CONSTRAINT);
    }
    if (error instanceof Prisma.PrismaClientKnownRequestError) {
      const meta = error.meta as { code?: string } | undefined;
      if (meta?.code === PG_EXCLUSION_VIOLATION) return true;
    }
    return false;
  }

  private async notificationFor(
    row: BookingRow,
    venue: VenueForNotification,
    reason: string | null
  ): Promise<BookingNotificationInput> {
    const client =
      row.clientId === null
        ? null
        : await this.prisma.user.findUnique({
            where: { id: row.clientId },
            select: { id: true, email: true, locale: true }
          });
    return this.notificationInput(row, venue, client, reason);
  }

  private notificationInput(
    row: BookingRow,
    venue: VenueForNotification,
    client: { id: string; email: string; locale: string } | null,
    reason: string | null
  ): BookingNotificationInput {
    return {
      bookingId: row.id,
      venueId: row.venueId,
      venueNameFr: venue.nameFr,
      venueNameAr: venue.nameAr,
      eventDate: formatCivilDate(this.civilOf(row.eventDate)),
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

  /** `Booking.eventDate` est une colonne `@db.Date` : Prisma la rend à minuit
   *  UTC. On lit donc ses composantes en UTC, jamais en local — sinon le
   *  fuseau du serveur choisirait le jour en silence. */
  private civilOf(date: Date): CivilDate {
    return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };
  }

  private toDTO(row: BookingRow): BookingDTO {
    return {
      id: row.id,
      venueId: row.venueId,
      venueSlug: row.venue.slug,
      venueNameFr: row.venue.nameFr,
      venueNameAr: row.venue.nameAr,
      status: row.status,
      paymentMethod: row.paymentMethod,
      eventDate: formatCivilDate(this.civilOf(row.eventDate)),
      startsAt: row.startsAt.toISOString(),
      endsAt: row.endsAt.toISOString(),
      slotNameFr: row.slotNameFr,
      slotNameAr: row.slotNameAr,
      guests: row.guests,
      basePriceCents: row.basePriceCents,
      servicesTotalCents: row.servicesTotalCents,
      totalCents: row.totalCents,
      depositCents: row.depositCents,
      services: row.services,
      clientMessage: row.clientMessage,
      declineReason: row.declineReason,
      cancellationReason: row.cancellationReason,
      expiresAt: row.expiresAt?.toISOString() ?? null,
      paymentDueAt: row.paymentDueAt?.toISOString() ?? null,
      createdAt: row.createdAt.toISOString()
    };
  }

  private throwVenueNotFound(): never {
    throw new NotFoundException({ code: BookingErrorCode.BOOKING_NOT_FOUND, message: "booking.errors.notFound" });
  }

  private throwBookingNotFound(): never {
    throw new NotFoundException({ code: BookingErrorCode.BOOKING_NOT_FOUND, message: "booking.errors.notFound" });
  }

  /** Un refus de PRESTATION est un 409 : la demande est bien formée, c'est le
   *  catalogue qui a bougé sous les pieds du client. */
  private throwServiceUnavailable(code: string): never {
    throw new ConflictException({ code, message: `service.errors.${code}` });
  }

  private throwSlotUnavailable(): never {
    throw new ConflictException({
      code: BookingErrorCode.BOOKING_SLOT_UNAVAILABLE,
      message: "booking.errors.slotUnavailable"
    });
  }
}

interface VenueForNotification {
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
