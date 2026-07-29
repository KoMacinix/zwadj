// Découpage des plages de visite en créneaux — Flux C, Lot C2, D58.
//
// Module PUR, sur le modèle d'`availability-engine.ts` : aucune horloge, aucune
// base, aucun fuseau. Tout est en MILLISECONDES ÉPOQUE ou en minutes depuis
// minuit ; l'appelant fournit `dayStartMs` et `nowMs`.
//
// ── Ce que ce moteur ne fait PAS ─────────────────────────────────────────────
// Il n'arbitre aucun conflit. D47 tolère le chevauchement des visites : deux
// familles peuvent visiter à 15:00, il n'y a pas de contrainte d'exclusion en
// base et il n'y en aura pas ici. `taken` est INFORMATIF — il permet à un
// client de préférer un horaire libre, il ne lui interdit rien.
//
// Il ne connaît pas non plus les réservations de fête : une salle louée le
// samedi peut parfaitement se visiter le dimanche. Les deux systèmes ne se
// parlent pas (D47).
import { VISIT_DURATION_MINUTES } from "@zwadj/types";

const MINUTE_MS = 60_000;

/** Plage hebdomadaire ACTIVE, telle que le pro l'a déclarée (C1). */
export interface VisitWindow {
  dayOfWeek: number;
  startMinutes: number;
  endMinutes: number;
}

/** Rendez-vous déjà pris, en instant absolu. */
export interface VisitBookingInstant {
  startMs: number;
}

export interface VisitDayInput {
  /** Minuit LOCAL du jour considéré (D48). */
  dayStartMs: number;
  /** 0 = dimanche … 6 = samedi (D56). */
  dayOfWeek: number;
  windows: readonly VisitWindow[];
  bookings: readonly VisitBookingInstant[];
  /** Instant courant : tout créneau qui commence avant est écarté. */
  nowMs: number;
}

export interface VisitSlot {
  startMinutes: number;
  taken: boolean;
}

/** Créneaux d'UNE journée, triés, sans doublon.
 *
 *  ⚠ Deux plages du même jour ne peuvent pas se chevaucher (refusé en C1), mais
 *  elles peuvent être BOUT À BOUT : 09:00→12:00 puis 12:00→15:00. Le découpage
 *  ne produit alors aucun doublon à 12:00 puisque la première plage s'arrête
 *  avant. La déduplication reste faite malgré tout — une règle de C1 relâchée
 *  un jour ne doit pas faire sortir deux fois le même rendez-vous. */
export function computeVisitSlots(input: VisitDayInput): VisitSlot[] {
  const takenAt = new Set(
    input.bookings.map((b) => Math.round((b.startMs - input.dayStartMs) / MINUTE_MS))
  );

  const starts = new Set<number>();
  for (const window of input.windows) {
    if (window.dayOfWeek !== input.dayOfWeek) continue;
    // Créneaux ENTIERS seulement : une plage de 20 minutes n'en produit aucun,
    // et une plage 09:00→17:20 s'arrête à 16:30, pas à 16:50.
    for (let start = window.startMinutes; start + VISIT_DURATION_MINUTES <= window.endMinutes; start += VISIT_DURATION_MINUTES) {
      starts.add(start);
    }
  }

  return [...starts]
    .sort((a, b) => a - b)
    // Un créneau de 09:00 n'a plus de sens à 14:00 : le passé se filtre à la
    // MINUTE, pas seulement au jour comme le fait l'écrêtage D49.
    .filter((start) => input.dayStartMs + start * MINUTE_MS >= input.nowMs)
    .map((start) => ({ start, taken: takenAt.has(start) }))
    .map(({ start, taken }) => ({ startMinutes: start, taken }));
}
