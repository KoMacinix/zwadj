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
  VenueErrorCode,
  type AvailabilityWindowQueryInput,
  type BookingMode,
  type VenueAvailabilityDayDTO,
  type VenueAvailabilityResponse,
  type VenueAvailabilitySlotDTO
} from "@zwadj/types";
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
  type CivilDate
} from "./availability-time";
import { RULE_SELECT } from "./pricing-rules.service";
import { SLOT_ORDER_BY } from "./slot-templates.service";
import { PUBLIC_BASE_WHERE, PUBLIC_DETAIL_STATUSES, SLUG_PATTERN } from "./venues-public.service";

/** Plafond du CHECK `slot_templates_minutes_valid` : 48 h. Rien de plus tardif
 *  ne peut recouvrir un créneau du dernier jour de la fenêtre. */
const SLOT_END_MAX_MINUTES = 2880;
const MINUTE_MS = 60_000;

/** Statuts qui DISENT quelque chose. DECLINED, EXPIRED et CANCELLED libèrent le
 *  créneau : ne pas les charger est plus sûr que les filtrer plus loin. */
const BLOCKING_BOOKING_STATUSES = ["PENDING", "ACCEPTED", "CONFIRMED"] as const;
/** Verrou DUR, doublé en base par `bookings_no_overlap_accepted_confirmed`. */
const HARD_BOOKING_STATUSES = new Set<string>(["ACCEPTED", "CONFIRMED"]);

@Injectable()
export class AvailabilityService {
  constructor(private readonly prisma: PrismaService) {}

  async bySlug(slug: string, query: AvailabilityWindowQueryInput): Promise<VenueAvailabilityResponse> {
    // Zod a déjà garanti la forme : dates réelles, ordre, largeur ≤ 92 jours.
    // Ce qui reste ne peut plus échouer.
    const requestedFrom = parseCivilDate(query.from) as CivilDate;
    const requestedTo = parseCivilDate(query.to) as CivilDate;

    if (!SLUG_PATTERN.test(slug)) this.throwNotFound();

    const venue = await this.prisma.venue.findFirst({
      where: { slug, ...PUBLIC_BASE_WHERE, status: { in: [...PUBLIC_DETAIL_STATUSES] } },
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
      hard: HARD_BOOKING_STATUSES.has(row.status)
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
