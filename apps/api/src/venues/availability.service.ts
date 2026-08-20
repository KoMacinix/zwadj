// Disponibilité publique d'une salle — Lot B3, D48/D49/D50.
//
// Ce service est la FRONTIÈRE : il est le seul à appeler `Date.now()`, le seul
// à convertir des dates civiles en instants, et il ne décide lui-même ni une
// disponibilité ni un prix — il alimente deux moteurs purs déjà testés.
//
// ── Quatre requêtes, jamais une par jour ─────────────────────────────────────
// 92 jours × N créneaux est un produit cartésien tentant à requêter jour par
// jour. On charge tout en quatre lectures, puis on calcule en mémoire.
//
// ── La fenêtre de chargement n'est PAS [from, to] ────────────────────────────
// Un filtre `startsAt >= from` raterait deux cas parfaitement réels : un
// blocage de six mois qui enjambe toute la fenêtre sans y commencer, et une
// soirée 20h → 02h du dernier jour confrontée à une réservation de 00h30 le
// lendemain. La borne haute monte donc à +48 h (plafond du CHECK
// `slot_templates_minutes_valid`) et le test de recouvrement est semi-ouvert.
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  HARD_BOOKING_STATUSES,
  VenueErrorCode,
  type AvailabilityWindowQueryInput,
  type BookingMode,
  type VenueAvailabilityDayDTO,
  type VenueAvailabilityResponse,
  type VenueAvailabilitySlotDTO
} from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";
import { PrismaService } from "../prisma/prisma.service";
import { computeDayAvailability, type BookingWindow, type Interval } from "./availability-engine";
import {
  civilDayStartMs,
  civilUtcMs,
  clampWindow,
  enumerateDays,
  formatCivilDate,
  holidayKey,
  parseCivilDate,
  toCalendarDay,
  SLOT_END_MAX_MINUTES,
  type CivilDate
} from "./availability-time";
import { RULE_SELECT } from "./pricing-rules.service";
import { SLOT_ORDER_BY } from "./slot-templates.service";
import { PUBLIC_BASE_WHERE, PUBLIC_DETAIL_STATUSES, SLUG_PATTERN } from "./venues-public.service";

// ⚠ `SLOT_END_MAX_MINUTES` a DÉMÉNAGÉ dans `availability-time.ts` au lot
// `availableOn` : la liste publique borne la même fenêtre de chargement, et
// deux copies de cette borne divergeraient en silence.
const MINUTE_MS = 60_000;

/** Statuts qui DISENT quelque chose. DECLINED, EXPIRED et CANCELLED libèrent le
 *  créneau : ne pas les charger est plus sûr que les filtrer plus loin. */
const BLOCKING_BOOKING_STATUSES = ["PENDING", "ACCEPTED", "CONFIRMED"] as const;
/** Verrou DUR, doublé en base par `bookings_no_overlap_accepted_confirmed`.
 *  ⚠ La LISTE vient de `@zwadj/types` (une seule autorité) ; le `Set` n'est
 *  qu'une forme d'appel — ce fichier interroge l'appartenance ligne à ligne. */
const HARD_BOOKING_STATUS_SET = new Set<string>(HARD_BOOKING_STATUSES);

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  /** Porte PUBLIQUE : par slug, et seulement si la salle est PUBLIÉE. */
  async bySlug(slug: string, query: AvailabilityWindowQueryInput): Promise<VenueAvailabilityResponse> {
    if (!SLUG_PATTERN.test(slug)) this.throwNotFound();
    return this.compute({ slug, ...PUBLIC_BASE_WHERE, status: { in: [...PUBLIC_DETAIL_STATUSES] } }, query);
  }

  /** Porte PRO : par id, pour le PROPRIÉTAIRE, SANS condition de publication.
   *
   *  ⚠ POURQUOI CETTE SECONDE PORTE EXISTE. Le calendrier pro consommait
   *  l'endpoint public — décision de B6, et son motif était juste : ne pas
   *  dupliquer le moteur. Mais la conséquence n'avait jamais été vérifiée sur une
   *  salle réelle : `PUBLIC_BASE_WHERE` exige `publicationStatus = PUBLISHED`, si
   *  bien qu'un pro dont la salle est encore en brouillon recevait un 404 sur SON
   *  PROPRE calendrier. Depuis la refonte, cela tuait aussi l'écran « Nouvelle
   *  réservation », qui en fait son sélecteur de date.
   *
   *  ⚠ Ce n'est PAS un second moteur : même `compute`, mêmes règles de prix,
   *  mêmes statuts, même écrêtage. Seule la CLAUSE DE RECHERCHE change. Un calcul
   *  parallèle finirait par répondre autrement, et le pro verrait alors autre
   *  chose que ses clients — le pire des écarts (D78).
   *
   *  `deletedAt: null` reste : une salle supprimée n'a plus de calendrier, même
   *  pour son propriétaire. */
  async byIdForOwner(
    venueId: string,
    userId: string,
    query: AvailabilityWindowQueryInput
  ): Promise<VenueAvailabilityResponse> {
    // ⚠ `owner: { userId }` et NON `ownerId: userId`. `Venue.ownerId` référence
    // `ProProfile.id`, pas `User.id` — le schéma le dit :
    //   `owner ProProfile @relation(fields: [ownerId], references: [id])`
    // Mon premier jet passait l'id UTILISATEUR dans `ownerId`, qui ne peut jamais
    // correspondre : la route rendait donc 404 pour TOUS les pros, publiée ou pas.
    // Le nom du champ m'a induit en erreur là où la relation était écrite noir sur
    // blanc — un identifiant qui « ressemble » se relève, il ne se devine pas.
    // C'est l'idiome employé par `visit-bookings.service.ts`, et il traverse la
    // relation au lieu de supposer une égalité d'ids.
    return this.compute({ id: venueId, deletedAt: null, owner: { userId } }, query);
  }

  private async compute(
    where: Prisma.VenueWhereInput,
    query: AvailabilityWindowQueryInput
  ): Promise<VenueAvailabilityResponse> {
    // Zod a déjà garanti la forme : dates réelles, ordre, largeur ≤ 92 jours.
    // Ce qui reste ne peut plus échouer.
    const requestedFrom = parseCivilDate(query.from) as CivilDate;
    const requestedTo = parseCivilDate(query.to) as CivilDate;

    const venue = await this.prisma.venue.findFirst({
      where,
      select: {
        id: true,
        slug: true,
        bookingMode: true,
        slotTemplates: {
          where: { isActive: true },
          orderBy: [...SLOT_ORDER_BY],
          select: {
            id: true,
            nameFr: true,
            nameAr: true,
            startMinutes: true,
            endMinutes: true,
            basePriceCents: true,
            pricingRules: { where: { isActive: true }, select: RULE_SELECT }
          }
        }
      }
    });
    if (!venue) this.throwNotFound();

    const slots: VenueAvailabilitySlotDTO[] = venue.slotTemplates.map((slot) => ({
      id: slot.id,
      nameFr: slot.nameFr,
      nameAr: slot.nameAr,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes
    }));

    // D48 — UN SEUL appel à l'horloge par requête. Deux appels pourraient
    // tomber de part et d'autre de minuit et rendre l'écrêtage incohérent
    // entre la borne basse et l'horizon.
    const window = clampWindow(requestedFrom, requestedTo, Date.now());
    const base = {
      venueId: venue.id,
      slug: venue.slug,
      bookingMode: venue.bookingMode as BookingMode,
      // D49 — bornes EFFECTIVES : l'appelant doit savoir ce qu'il a réellement
      // reçu, sans quoi un calendrier afficherait des jours qu'il n'a pas.
      from: formatCivilDate(window.from),
      to: formatCivilDate(window.to),
      slots
    };
    if (window.empty) return { ...base, days: [] };

    const windowStartMs = civilDayStartMs(window.from);
    const windowEndMs = civilDayStartMs(window.to) + SLOT_END_MAX_MINUTES * MINUTE_MS;

    const [bookingRows, blockRows, holidayRows] = await Promise.all([
      this.prisma.booking.findMany({
        where: {
          venueId: venue.id,
          status: { in: [...BLOCKING_BOOKING_STATUSES] },
          startsAt: { lt: new Date(windowEndMs) },
          endsAt: { gt: new Date(windowStartMs) }
        },
        select: { startsAt: true, endsAt: true, slotTemplateId: true, status: true }
      }),
      this.prisma.availabilityBlock.findMany({
        where: {
          venueId: venue.id,
          blockedFrom: { lt: new Date(windowEndMs) },
          blockedUntil: { gt: new Date(windowStartMs) }
        },
        select: { blockedFrom: true, blockedUntil: true }
      }),
      // ⚠ Bornes en minuits UTC des dates CIVILES, jamais `civilDayStartMs` :
      // `Holiday.date` est une colonne `@db.Date` que Prisma rend à minuit UTC
      // (vérifié en base). Passer l'instant local — 23h00 UTC la veille —
      // décalerait la fenêtre d'un jour à ses DEUX extrémités.
      this.prisma.holiday.findMany({
        where: { date: { gte: new Date(civilUtcMs(window.from)), lte: new Date(civilUtcMs(window.to)) } },
        select: { date: true }
      })
    ]);

    const bookings: BookingWindow[] = bookingRows.map((row) => ({
      startMs: row.startsAt.getTime(),
      endMs: row.endsAt.getTime(),
      slotTemplateId: row.slotTemplateId,
      // Une demande PENDING dont l'`expiresAt` est dépassé mais que le job n'a
      // pas encore basculée compte QUAND MÊME : le statut fait foi. Une
      // seconde règle d'expiration lue à la volée finirait par diverger de
      // celle du job, et le client verrait deux vérités selon la page.
      hard: HARD_BOOKING_STATUS_SET.has(row.status)
    }));
    const blocks: Interval[] = blockRows.map((row) => ({
      startMs: row.blockedFrom.getTime(),
      endMs: row.blockedUntil.getTime()
    }));
    const holidays = new Set(holidayRows.map((row) => holidayKey(row.date)));

    const singleSlot = venue.bookingMode === "SINGLE_SLOT";
    const engineSlots = venue.slotTemplates.map((slot) => ({
      id: slot.id,
      startMinutes: slot.startMinutes,
      endMinutes: slot.endMinutes,
      basePriceCents: slot.basePriceCents,
      rules: slot.pricingRules
    }));

    const days: VenueAvailabilityDayDTO[] = enumerateDays(window.from, window.to).map((date) => {
      const day = toCalendarDay(date, holidays);
      // Les tableaux ENTIERS sont passés à chaque jour : le test de
      // recouvrement du moteur fait déjà autorité, un pré-filtrage par jour
      // ajouterait une SECONDE règle de recouvrement à maintenir.
      const computed = computeDayAvailability({
        dayStartMs: civilDayStartMs(date),
        day,
        slots: engineSlots,
        bookings,
        blocks,
        singleSlot
      });
      return {
        date: formatCivilDate(date),
        isHoliday: day.isHoliday,
        // D50 — `ruleId` est écarté ICI, à la sortie : le moteur le produit
        // pour l'UI pro de B4, le contrat public n'en veut pas.
        slots: computed.map((entry) => ({
          slotTemplateId: entry.slotTemplateId,
          status: entry.status,
          priceCents: entry.priceCents
        }))
      };
    });

    return { ...base, days };
  }

  /** 404 INDISTINCT (doctrine A2/A3) : brouillon, masquée, supprimée, slug
   *  inconnu ou hors motif — anti-énumération. */
  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }
}
