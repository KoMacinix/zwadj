// Créneaux de visite d'une salle, en LECTURE PUBLIQUE — Flux C, Lot C2.
//
// Frontière HTTP : seul endroit à appeler `Date.now()`, seul à convertir des
// dates civiles en instants (D48). Le moteur (`visit-slots-engine.ts`) reste
// pur.
//
// ── Trois requêtes, jamais une par jour ──────────────────────────────────────
// Les plages sont hebdomadaires : on les charge UNE fois et on les applique aux
// 92 jours au plus. Seuls les rendez-vous déjà pris dépendent de la fenêtre.
//
// ⚠ Une visite ne franchit pas minuit (CHECK à 1440, C1). La fenêtre de
// chargement des rendez-vous n'a donc PAS besoin des 48 h qu'exige la
// disponibilité des fêtes : `[dayStart(from), dayStart(to) + 24 h[` suffit, et
// prétendre le contraire ferait croire à une symétrie qui n'existe pas.
import { Injectable, NotFoundException } from "@nestjs/common";
import {
  VISIT_DURATION_MINUTES,
  VenueErrorCode,
  type AvailabilityWindowQueryInput,
  type VenueVisitSlotsResponse,
  type VisitSlotDTO
} from "@zwadj/types";
import { PrismaService } from "../prisma/prisma.service";
import {
  civilDayStartMs,
  clampWindow,
  enumerateDays,
  formatCivilDate,
  parseCivilDate,
  type CivilDate
} from "./availability-time";
import { computeVisitSlots } from "./visit-slots-engine";
import { PUBLIC_BASE_WHERE, PUBLIC_DETAIL_STATUSES, SLUG_PATTERN } from "./venues-public.service";

const DAY_MS = 86_400_000;

@Injectable()
export class VisitSlotsService {
  constructor(private readonly prisma: PrismaService) {}

  async bySlug(slug: string, query: AvailabilityWindowQueryInput): Promise<VenueVisitSlotsResponse> {
    const requestedFrom = parseCivilDate(query.from) as CivilDate;
    const requestedTo = parseCivilDate(query.to) as CivilDate;

    if (!SLUG_PATTERN.test(slug)) this.throwNotFound();

    // MÊME règle de visibilité que le détail public et que la disponibilité
    // (D33) : trois `where` concurrents finiraient par diverger.
    const venue = await this.prisma.venue.findFirst({
      where: { slug, ...PUBLIC_BASE_WHERE, status: { in: [...PUBLIC_DETAIL_STATUSES] } },
      select: { id: true, slug: true }
    });
    if (!venue) this.throwNotFound();

    // UNE seule lecture d'horloge par requête (D48).
    const nowMs = Date.now();
    const window = clampWindow(requestedFrom, requestedTo, nowMs);
    const base = {
      venueId: venue.id,
      slug: venue.slug,
      from: formatCivilDate(window.from),
      to: formatCivilDate(window.to),
      durationMinutes: VISIT_DURATION_MINUTES
    };
    if (window.empty) return { ...base, slots: [] };

    const windowStartMs = civilDayStartMs(window.from);
    const windowEndMs = civilDayStartMs(window.to) + DAY_MS;

    const [windows, bookingRows] = await Promise.all([
      this.prisma.visitAvailability.findMany({
        where: { venueId: venue.id, isActive: true },
        select: { dayOfWeek: true, startMinutes: true, endMinutes: true }
      }),
      // Seuls les rendez-vous CONFIRMÉS occupent : un rendez-vous annulé libère
      // son créneau, exactement comme une réservation de fête annulée.
      this.prisma.visitBooking.findMany({
        where: {
          venueId: venue.id,
          status: "CONFIRMED",
          scheduledAt: { gte: new Date(windowStartMs), lt: new Date(windowEndMs) }
        },
        select: { scheduledAt: true }
      })
    ]);

    const bookings = bookingRows.map((row) => ({ startMs: row.scheduledAt.getTime() }));

    const slots: VisitSlotDTO[] = [];
    for (const date of enumerateDays(window.from, window.to)) {
      const dayStartMs = civilDayStartMs(date);
      // Le jour de la semaine vient de la date CIVILE (D56), jamais d'un
      // `Date` local qui choisirait le fuseau du serveur en silence.
      const dayOfWeek = new Date(Date.UTC(date.year, date.month - 1, date.day)).getUTCDay();
      const computed = computeVisitSlots({ dayStartMs, dayOfWeek, windows, bookings, nowMs });
      for (const slot of computed) {
        slots.push({ date: formatCivilDate(date), startMinutes: slot.startMinutes, taken: slot.taken });
      }
    }

    return { ...base, slots };
  }

  /** 404 INDISTINCT, doctrine A2/A3 — anti-énumération. */
  private throwNotFound(): never {
    throw new NotFoundException({ code: VenueErrorCode.VENUE_NOT_FOUND, message: "venue.errors.notFound" });
  }
}
