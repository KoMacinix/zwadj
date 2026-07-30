// Moteur de disponibilité — Lot B3. FONCTION PURE, comme le moteur de prix :
// aucun accès base, aucun `new Date()`, aucun fuseau deviné.
//
// ── Le choix qui gouverne le fichier ────────────────────────────────────────
// Tout est en MILLISECONDES ÉPOQUE. L'appelant fournit `dayStartMs`, l'instant
// de minuit local du jour considéré ; le moteur y ajoute les minutes du
// créneau. La décision de fuseau est donc prise UNE fois, à la frontière, et
// jamais ici. C'est ce qui permet aux créneaux qui franchissent minuit
// (20h → 02h, cas normal d'un mariage algérien) de se comparer correctement à
// une réservation de la nuit suivante.
//
// ── Ce qui rend une case indisponible, par ordre de gravité ─────────────────
//   BLOCKED   : le pro a fermé la plage (congés, travaux) ;
//   BOOKED    : réservation ACCEPTED ou CONFIRMED — verrou dur, doublé en base
//               par `bookings_no_overlap_accepted_confirmed` (EXCLUDE gist) ;
//   REQUESTED : une demande PENDING existe. Elle ne verrouille RIEN (deux
//               couples peuvent demander la même date, le pro tranche) mais on
//               le DIT : laisser croire à une case libre puis annoncer un
//               concurrent au moment du devis est la pire des surprises ;
//   AVAILABLE : rien de tout cela.
import type { PricingRuleLike, CalendarDay } from "./pricing-engine";
import { resolveSlotPrice } from "./pricing-engine";

export const SLOT_AVAILABILITY_STATUSES = ["AVAILABLE", "REQUESTED", "BOOKED", "BLOCKED"] as const;
export type SlotAvailabilityStatus = (typeof SLOT_AVAILABILITY_STATUSES)[number];

/** Gravité croissante : le plus grave l'emporte quand plusieurs s'appliquent. */
const SEVERITY: Record<SlotAvailabilityStatus, number> = { AVAILABLE: 0, REQUESTED: 1, BOOKED: 2, BLOCKED: 3 };

export interface SlotForAvailability {
  id: string;
  startMinutes: number;
  endMinutes: number;
  basePriceCents: number;
  rules: readonly PricingRuleLike[];
}

/** Intervalle absolu semi-ouvert [start, end). */
export interface Interval {
  startMs: number;
  endMs: number;
}

export interface BookingWindow extends Interval {
  /** `null` pour une plage libre saisie par le pro (walk-in) : elle bloque par
   *  RECOUVREMENT HORAIRE, pas par identité de créneau. */
  slotTemplateId: string | null;
  /** Seuls PENDING (souple) et ACCEPTED/CONFIRMED (dur) sont passés ici :
   *  DECLINED, EXPIRED et CANCELLED ne bloquent rien et sont filtrés en amont. */
  hard: boolean;
}

export interface SlotAvailability {
  slotTemplateId: string;
  status: SlotAvailabilityStatus;
  priceCents: number;
  /** Règle gagnante, ou `null` si c'est le prix de base — pour que l'UI puisse
   *  DIRE pourquoi ce prix-là. */
  ruleId: string | null;
}

const MINUTE_MS = 60_000;

/** Deux intervalles semi-ouverts se recouvrent-ils ? Se toucher ne compte pas :
 *  une fête qui finit à 18h et une autre qui commence à 18h coexistent. */
export function intervalsOverlap(a: Interval, b: Interval): boolean {
  return a.startMs < b.endMs && b.startMs < a.endMs;
}

function worst(a: SlotAvailabilityStatus, b: SlotAvailabilityStatus): SlotAvailabilityStatus {
  return SEVERITY[a] >= SEVERITY[b] ? a : b;
}

/**
 * Disponibilité et prix de chaque créneau, pour UN jour.
 *
 * `singleSlot` : la salle n'accepte qu'une fête par jour. Une réservation dure
 * sur n'importe quel créneau ferme donc TOUS les créneaux du jour — sinon le
 * client choisirait une case que la salle ne peut pas honorer.
 */
export function computeDayAvailability(params: {
  dayStartMs: number;
  day: CalendarDay;
  slots: readonly SlotForAvailability[];
  bookings: readonly BookingWindow[];
  blocks: readonly Interval[];
  singleSlot: boolean;
}): SlotAvailability[] {
  const { dayStartMs, day, slots, bookings, blocks, singleSlot } = params;

  const computed = slots.map((slot) => {
    const window: Interval = {
      startMs: dayStartMs + slot.startMinutes * MINUTE_MS,
      endMs: dayStartMs + slot.endMinutes * MINUTE_MS
    };

    let status: SlotAvailabilityStatus = "AVAILABLE";
    if (blocks.some((block) => intervalsOverlap(window, block))) {
      status = "BLOCKED";
    }
    for (const booking of bookings) {
      // Le recouvrement HORAIRE fait foi, pas l'identité du créneau : un
      // walk-in saisi de 19h à 23h occupe la soirée même s'il n'est rattaché à
      // aucun `slotTemplateId`.
      if (!intervalsOverlap(window, booking)) continue;
      status = worst(status, booking.hard ? "BOOKED" : "REQUESTED");
    }

    const price = resolveSlotPrice(slot.basePriceCents, slot.rules, day);
    return { slotTemplateId: slot.id, status, priceCents: price.priceCents, ruleId: price.ruleId };
  });

  if (singleSlot && computed.some((entry) => entry.status === "BOOKED")) {
    // On ne remonte pas un BLOCKED en BOOKED : un blocage reste un blocage,
    // il est plus grave et se lève autrement.
    return computed.map((entry) => (entry.status === "BLOCKED" ? entry : { ...entry, status: "BOOKED" as const }));
  }
  return computed;
}
