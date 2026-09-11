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
// traduction du refus d'exclusion.
//
// ⚠ DEPUIS LE LOT S5b, CE FICHIER N'OUVRE PLUS DE TRANSACTION. Le verrou de
// salle, la relecture D117, le contrôle de blocage et la traduction du refus
// d'exclusion vivent dans `booking-locks.prisma.ts`, derrière le port
// `BOOKING_LOCKS`. Ce service reçoit un RÉSULTAT DISCRIMINÉ et le traduit en
// HTTP : les règles ci-dessus n'ont pas changé, elles ont changé de fichier.
//
// ⚠ D80 — ce lot s'arrête à ACCEPTED. Aucune route ne mène à CONFIRMED, aucun
// job n'expire quoi que ce soit. `expiresAt` et `paymentDueAt` sont posés pour
// le lot Paiement ; en attendant, une demande acceptée verrouille son créneau
// jusqu'à ce que le pro l'annule. Dette assumée, pas un oubli.
import {
  BadRequestException,
  ConflictException,
  Inject,
  Injectable,
  NotFoundException,
  UnauthorizedException
} from "@nestjs/common";
import {
  AuthErrorCode,
  BookingErrorCode,
  BookingStatus,
  HARD_BOOKING_STATUSES,
  type BookingCancelInput,
  type BookingCreateInput,
  type BookingDTO,
  type BookingDeclineInput,
  type ProBookingDTO
} from "@zwadj/types";
import { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import {
  civilOfUtcDate,
  civilTodayAt,
  civilUtcMs,
  formatCivilDate,
  holidayKey,
  parseCivilDate,
  toCalendarDay,
  type CivilDate
} from "./availability-time";
// ⚠ S11-a — L'HORIZON DE RÉSERVATION, L'AJOUT DE MOIS ET LE CALCUL DE FENÊTRE
// ne sont plus importés ici : ils sont partis ENTIERS dans `booking-admission`,
// pas recopiés. Les laisser dans cette liste aurait donné à croire que le
// service décide encore de la fenêtre de dates. Seuls les deux TYPES restent —
// ils décrivent ce que le verdict rend, ils ne calculent rien.
//
// ⚠ Et ce commentaire ÉPELLE VOLONTAIREMENT LES NOMS EN TOUTES LETTRES plutôt
// qu'en identifiants : une garde de source, dans `booking-admission.spec.ts`,
// vérifie que la constante d'horizon n'apparaît plus dans ce fichier. Écrite
// ici, elle aurait fait rougir la garde sur un simple commentaire — et une
// garde qui accuse à tort finit ignorée.
import type { BookingWindow, SlotBounds } from "./booking-window";
import { decideBookingAdmission } from "./booking-admission";
import type { BookingNotificationInput } from "./booking-notifications.service";
import {
  buildBookingNotification,
  type VenueForNotification
} from "./booking-notification-input";
import {
  BookingCommand,
  allowedFrom,
  decideBookingTransition,
  targetOf
} from "./booking-transitions";
import {
  BOOKING_LOCKS,
  BOOKING_SELECT,
  type BookingLocks,
  type BookingRow
} from "./booking-locks.types";
import { deadlineClampedToEventStart } from "./booking-deadline";
import { DomainEvents } from "./domain-events";
// ⚠ S11-b — `deposit` et `service-pricing` ne sont plus importés ICI : ils sont
// consommés par `booking-charge`, qui est désormais le SEUL endroit où le total
// et l'acompte d'une demande se calculent. Les laisser dans cette liste aurait
// donné à croire que ce service chiffre encore.
import { confrontExpectedCharge, resolveCharge, type Charge } from "./booking-charge";
import { SERVICE_SELECT } from "./services.service";
import { resolveSlotPrice } from "./pricing-engine";
// Le SELECT des règles est celui du service qui les possède : en recopier un
// ici ferait deux vérités sur les colonnes que le moteur de prix attend.
import { RULE_SELECT } from "./pricing-rules.service";
import { PUBLIC_BASE_WHERE, PUBLIC_DETAIL_STATUSES, SLUG_PATTERN } from "./venues-public.service";

const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// ⚠ `PG_EXCLUSION_VIOLATION` ET `BOOKING_OVERLAP_CONSTRAINT` SONT PARTIS avec
// `isExclusionViolation`, dans `booking-locks.prisma.ts` (lot S5b). Un code
// SQLSTATE et un nom de contrainte n'ont rien à faire dans un service qui ne
// parle plus à PostgreSQL : les laisser ici aurait été garder l'étiquette après
// avoir déménagé la boîte.

// ⛔ CES QUATRE CONSTANTES SONT EXPORTÉES POUR ÊTRE MESURÉES, ET L'EXPORT N'EST
//   PAS DU MÉNAGE À SUPPRIMER (rang 10). `bookings.int-spec.ts` les IMPORTE pour
//   assertir la DURÉE des deux échéances : sans cela, intervertir les deux
//   fenêtres entre leurs sites d'appel (plus bas) produit deux dates
//   parfaitement non nulles et AUCUNE porte ne rougit — sur le chemin de
//   l'argent, `paymentDueAt` étant ce sur quoi E3 décidera si un règlement
//   arrive à temps.
// ⚠ La spec confronte le SYMBOLE que ce service utilise, jamais une copie posée
//   ailleurs : recopier « 7 » ou « 48 » dans le test laisserait la garde verte
//   sur l'ancienne valeur le jour où la constante change.
/** Délai de réponse laissé au pro (D82). Borné par le début de l'événement :
 *  une demande pour dans cinq jours ne doit pas expirer après la fête. */
export const PRO_RESPONSE_DAYS = 7;
/** Fenêtre d'acompte après acceptation (D82). Posée, pas encore consommée (D80). */
export const PAYMENT_WINDOW_HOURS = 48;

export const DAY_MS = 86_400_000;
export const HOUR_MS = 3_600_000;

/** Statuts qui VERROUILLENT le créneau. Miroir exact du `WHERE` de l'EXCLUDE :
 *  les deux doivent bouger ensemble, ou l'écran mentirait sur la base.
 *
 *  ⚠ La LISTE vient de `@zwadj/types` (une seule autorité, lot S1) ; le nom
 *  local n'est qu'un alias de lecture. Ce fichier en portait une COPIE
 *  littérale : le jour où un statut verrouillant s'ajoute, la copie ne l'a pas,
 *  `locks()` rend `false`, et la projection des conflits cesse d'annoncer une
 *  date pourtant prise — sans qu'aucun test ne rougisse. */
const LOCKING_STATUSES = HARD_BOOKING_STATUSES;


@Injectable()
export class BookingsService {
  constructor(
    private readonly prisma: PrismaService,
    @Inject(BOOKING_LOCKS) private readonly verrous: BookingLocks,
    // ⚠ LE SERVICE NE CONNAÎT PLUS SES DESTINATAIRES. Il publie un FAIT ; qui
    // en fait quoi est déclaré dans le module. C'est la couture que E3c
    // remplacera par pg-boss sans toucher à ce fichier (D63 étendu).
    private readonly events: DomainEvents
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

    // UNE seule lecture d'horloge par requête (D48). Elle remonte d'un cran :
    // le module qui décide de la recevabilité est PUR, il REÇOIT la date du
    // jour au lieu de la lire.
    const nowMs = Date.now();

    const { slot, window } = this.admitOrThrow(date, nowMs, venue, input.guests);

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
    //
    // ⚠ S11-b — LE CHIFFRAGE EST PARTI ENTIER dans `booking-charge`, module PUR,
    // et c'est le MÊME que consomme `QuotesService`. Il était écrit deux fois,
    // presque au mot près ; `quote.convert` RECOPIANT les montants snapshotés du
    // devis, une divergence entre les deux copies se serait gravée dans la
    // réservation, sans rattrapage possible. Ce service lit et écrit ; il ne
    // calcule plus.
    //
    // ⚠ ET L'APPEL PASSE PAR UNE AIDE PRIVÉE, MÊME IDIOME QU'`admitOrThrow`
    // ci-dessus — parce que c'est MESURÉ, pas parce que c'est plus joli : écrit
    // en ligne, ce même appel laissait `create` à 123 lignes exécutables, c'est
    // à dire EXACTEMENT son poids d'avant le lot. Un lot de SRP qui ne se mesure
    // pas avant ET après s'auto-décerne son résultat (D261).
    const { basePriceCents, servicesTotalCents, totalCents, depositCents, lines } =
      await this.chargeOrThrow(venue, price.priceCents, input);

    // D75 — le client annonce ce qu'il a vu. Divergence ⇒ 409 portant les
    // montants RÉELS : il rejoue en connaissance de cause, jamais engagé sur un
    // montant qu'il n'a pas lu.
    const attendu = confrontExpectedCharge({ totalCents, depositCents }, input);
    if (!attendu.ok) {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_PRICE_CHANGED,
        message: "booking.errors.priceChanged",
        totalCents: attendu.totalCents,
        depositCents: attendu.depositCents
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

    // D82 — bornée par le début de l'événement. La formule vit dans
    // `booking-deadline`, avec ses deux cas limites spécifiés (D282).
    const expiresAt = deadlineClampedToEventStart({ fromMs: nowMs, windowMs: PRO_RESPONSE_DAYS * DAY_MS, eventStartsAt: window.startsAt });

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
        // D135 — clé absente ⇒ NULL explicite, comme `clientMessage` juste en
        // dessous. Laisser passer `undefined` marcherait ici (Prisma l'ignore sur
        // une colonne nullable) mais dirait « je n'ai pas d'avis » au lieu de
        // « ce client n'a pas d'e-mail ».
        contactEmail: input.contactEmail ?? null,
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
    await this.events.publish("booking.requested", buildBookingNotification(row, venue, client, null));

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
    // ⚠ MÊME formule que `expiresAt`, DEUX constantes métier distinctes (D282) :
    // la durée est un paramètre, jamais une valeur harmonisée entre les deux.
    const paymentDueAt = deadlineClampedToEventStart({ fromMs: acceptedAt.getTime(), windowMs: PAYMENT_WINDOW_HOURS * HOUR_MS, eventStartsAt: row.startsAt });

    // ⚠ UN SEUL APPEL DE PORT : verrou, relecture D117, contrôle de blocage,
    // écriture et traduction de l'EXCLUDE forment une séquence indivisible. La
    // découper en appels séparés rouvrirait la fenêtre que D117 a fermée.
    const resultat = await this.verrous.acceptUnderVenueLock({
      bookingId: row.id,
      venueId: row.venueId,
      startsAt: row.startsAt,
      endsAt: row.endsAt,
      allowedFrom: allowedFrom(BookingCommand.ACCEPT),
      to: targetOf(BookingCommand.ACCEPT),
      acceptedAt,
      paymentDueAt
    });

    // ⚠ LA TRADUCTION EN HTTP RESTE ICI, et rien qu'ici. Le port constate un
    // refus de la base et le NOMME ; les codes applicatifs et les clés i18n
    // n'ont jamais à descendre dans la couche qui parle à PostgreSQL.
    if (resultat.outcome === "STATUS_CONFLICT") {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_STATUS_CONFLICT,
        message: "booking.errors.statusConflict",
        status: resultat.status
      });
    }
    if (resultat.outcome === "BLOCKED_PERIOD") {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_BLOCKED_PERIOD,
        message: "booking.errors.blockedPeriod"
      });
    }
    if (resultat.outcome === "SLOT_TAKEN") {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_SLOT_TAKEN,
        message: "booking.errors.slotTaken"
      });
    }
    const updated = resultat.row;

    await this.events.publish("booking.accepted", await this.notificationFor(updated, venue, null));
    return this.toDTO(updated);
  }

  /** Le pro refuse. Motif FACULTATIF (D83) : contraindre un pro à justifier au
   *  téléphone, dans une seconde langue, produit « ... » comme motif. */
  async decline(userId: string, bookingId: string, input: BookingDeclineInput): Promise<BookingDTO> {
    const { row, venue } = await this.ownedBooking(userId, bookingId);

    const updated = await this.transitionStatus(row.id, allowedFrom(BookingCommand.DECLINE), {
      status: targetOf(BookingCommand.DECLINE),
      declinedAt: new Date(),
      declineReason: input.reason ?? null
    });

    await this.events.publish("booking.declined", await this.notificationFor(updated, venue, input.reason ?? null));
    return this.toDTO(updated);
  }

  /** Le pro annule une demande DÉJÀ ACCEPTÉE. C'est aujourd'hui le seul moyen de
   *  libérer un créneau verrouillé, tant que le lot Paiement n'existe pas (D80). */
  async cancelAsPro(userId: string, bookingId: string, input: BookingCancelInput): Promise<BookingDTO> {
    const { row, venue } = await this.ownedBooking(userId, bookingId);

    const updated = await this.transitionStatus(row.id, allowedFrom(BookingCommand.CANCEL_AS_PRO), {
      status: targetOf(BookingCommand.CANCEL_AS_PRO),
      cancelledAt: new Date(),
      cancellationReason: input.reason ?? null
    });

    // ⚠ MÊME ENVOI QUE `booking.declined` AUJOURD'HUI, événement DISTINCT
    // quand même : un refus et une annulation pro ne sont pas le même fait.
    // Le comportement ne change pas ; il devient seulement modifiable.
    await this.events.publish("booking.cancelledByPro", await this.notificationFor(updated, venue, input.reason ?? null));
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

    // ⚠ UNE SEULE décision, dans l'ORDRE d'origine : le statut d'abord (409),
    // le motif ensuite (400). La politique rend le verdict, le service le
    // traduit en HTTP — elle ne connaît ni Nest ni les codes i18n.
    const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, row.status, input.reason);
    if (decision.outcome === "STATUS_CONFLICT") {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_STATUS_CONFLICT,
        message: "booking.errors.statusConflict",
        status: decision.status
      });
    }
    if (decision.outcome === "REASON_REQUIRED") {
      throw new BadRequestException({
        code: BookingErrorCode.BOOKING_STATUS_CONFLICT,
        message: "booking.errors.cancelReasonRequired",
        status: decision.status
      });
    }

    const updated = await this.transitionStatus(row.id, allowedFrom(BookingCommand.CANCEL_AS_CLIENT), {
      status: decision.to,
      cancelledAt: new Date(),
      cancellationReason: input.reason ?? null
    });

    return this.toDTO(updated);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Aides
  // ───────────────────────────────────────────────────────────────────────────

  /**
   * Les trois refus PRÉALABLES au chiffrage, traduits en HTTP.
   *
   * ⚠ LA DÉCISION N'EST PLUS ICI. Elle est dans `booking-admission.ts` (S11-a),
   * module pur. Chacun de ces trois refus gardait une frontière — créneau
   * introuvable, capacité, fenêtre de dates — et aucun n'était neutralisable
   * tant qu'il vivait dans `create` : ce service n'a AUCUNE spec unitaire, sa
   * seule mesure demande un PostgreSQL réel. Leur ORDRE fait partie de la règle
   * et il est désormais mesuré : la capacité (400) avant la date (409).
   *
   * ⚠ CE QUI RESTE ICI EST LA TRADUCTION, et rien qu'elle — même partage que
   * `transitionStatus` juste au-dessus. La politique rend un verdict ; le
   * service seul connaît les codes applicatifs et les clés i18n.
   *
   * ⚠ `slot` REVIENT PAR LE VERDICT, il ne se relit pas dans `venue`. Une
   * seconde lecture obligerait `create` à réécrire la garde de nullité que le
   * module vient de rendre — c'est-à-dire à garder un `if` dont plus aucune
   * branche ne se déclenche. Une garde sans objet se retire, elle ne se
   * conserve pas « au cas où » (D258, leçon des gardes fantômes).
   */
  private admitOrThrow<S extends SlotBounds>(
    date: CivilDate,
    nowMs: number,
    venue: { bookingMode: string; capacityMax: number; slotTemplates: S[] },
    guests: number
  ): { slot: S; window: BookingWindow } {
    const admission = decideBookingAdmission({
      date,
      today: civilTodayAt(nowMs),
      slot: venue.slotTemplates[0] ?? null,
      wholeDay: venue.bookingMode === "SINGLE_SLOT",
      capacityMax: venue.capacityMax,
      guests
    });

    if (admission.outcome === "SLOT_UNAVAILABLE") this.throwSlotUnavailable();
    if (admission.outcome === "GUESTS_EXCEED_CAPACITY") {
      throw new BadRequestException({
        code: BookingErrorCode.BOOKING_GUESTS_EXCEED_CAPACITY,
        message: "booking.errors.guestsExceedCapacity"
      });
    }
    return { slot: admission.slot, window: admission.window };
  }

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
    const resultat = await this.verrous.transition({ bookingId: id, from, data });
    if (resultat.outcome === "STATUS_CONFLICT") {
      throw new ConflictException({
        code: BookingErrorCode.BOOKING_STATUS_CONFLICT,
        message: "booking.errors.statusConflict",
        status: resultat.status
      });
    }
    return resultat.row;
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

  /** La LECTURE qui manque à la charge utile, et rien d'autre.
   *
   *  ⚠ CE QUI RESTE ICI EST UN ACCÈS BASE, PAS UNE DÉCISION. La construction de
   *  la charge est partie dans `booking-notification-input.ts` (S11-a) ; ce
   *  qui subsiste est le seul motif pour lequel cette méthode était `async` —
   *  une ligne ancienne dont le client n'est plus en main. `create`, lui, tient
   *  déjà le sien et appelle le constructeur en direct. */
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
    return buildBookingNotification(row, venue, client, reason);
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
      eventDate: formatCivilDate(civilOfUtcDate(row.eventDate)),
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

  /** Lit le catalogue de la salle et chiffre la demande.
   *
   *  ⚠ LA DÉCISION N'EST PAS ICI : elle vit dans `booking-charge`, module pur,
   *  partagé avec `QuotesService`. Cette aide ne fait que l'entrée-sortie et la
   *  traduction du refus en HTTP — exactement le partage qu'`admitOrThrow` tient
   *  pour la recevabilité. */
  private async chargeOrThrow(
    venue: { id: string; depositRateBps: number | null; depositAmountCents: number | null },
    basePriceCents: number,
    input: BookingCreateInput
  ): Promise<Charge> {
    const choices = input.services ?? [];
    const catalogue =
      choices.length > 0
        ? await this.prisma.service.findMany({
            where: { venueId: venue.id, id: { in: choices.map((choice) => choice.serviceId) } },
            select: SERVICE_SELECT
          })
        : [];
    const chiffrage = resolveCharge({
      venueId: venue.id,
      basePriceCents,
      guests: input.guests,
      choices,
      catalogue,
      deposit: venue
    });
    if (!chiffrage.ok) this.throwServiceUnavailable(chiffrage.failure.code);
    return chiffrage.charge;
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
