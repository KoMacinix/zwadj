// Rang 25 (D316) — la fenêtre du panneau de demande, DÉCOUPÉE en fenêtres que
// le contrat accepte.
//
// ⚠ LE DÉFAUT QUE CE MODULE FERME, MESURÉ PAR D315. Le panneau demandait six
// mois d'un coup (182 jours, bornes incluses) ; le contrat en refuse plus de
// `AVAILABILITY_MAX_WINDOW_DAYS` (D147, D49). Le 400 devenait `null`, `null`
// s'affichait « aucune date » : aucune demande de réservation ne partait de
// l'écran, pendant huit semaines, derrière une suite verte.
//
// ⚠ POURQUOI UN MODULE PUR (D187, D205) : sans navigateur, sans React, sans
// réseau, il se rejoue en millisecondes — donc se neutralise à chaque passage.
// Le panneau ne fait qu'appeler et afficher.
import { AVAILABILITY_MAX_WINDOW_DAYS, type VenueAvailabilityResponse } from "@zwadj/types";

export interface CivilWindow {
  from: string;
  to: string;
}

const DAY_MS = 86_400_000;

function toMs(civil: string): number {
  return Date.parse(`${civil}T00:00:00Z`);
}

function toCivil(ms: number): string {
  return new Date(ms).toISOString().slice(0, 10);
}

/** Découpe `[from, to]` — dates civiles, bornes INCLUSES — en fenêtres
 *  CONSÉCUTIVES, sans trou ni chevauchement, chacune d'au plus
 *  `AVAILABILITY_MAX_WINDOW_DAYS` jours comptés comme le contrat les compte
 *  (`(to - from) / 86400000 + 1`, D147). ⚠ La borne est IMPORTÉE, jamais
 *  recopiée : « −1 » n'est pas un ajustement, c'est « bornes incluses ». */
export function splitAvailabilityWindow(from: string, to: string): CivilWindow[] {
  const end = toMs(to);
  const windows: CivilWindow[] = [];
  for (let start = toMs(from); start <= end; start += AVAILABILITY_MAX_WINDOW_DAYS * DAY_MS) {
    windows.push({ from: toCivil(start), to: toCivil(Math.min(start + (AVAILABILITY_MAX_WINDOW_DAYS - 1) * DAY_MS, end)) });
  }
  return windows;
}

export type AvailabilityDays = Pick<VenueAvailabilityResponse, "days" | "slots">;

/** Réunit les réponses des fenêtres, DANS L'ORDRE des fenêtres.
 *
 *  ⚠ TOUT OU RIEN : une seule réponse absente (`null` : statut non 2xx, réseau)
 *  ou sans la forme attendue, et c'est `null` — l'ÉCHEC du chargement. Un
 *  calendrier partiel présenté comme complet cacherait des dates, et c'est
 *  précisément un échec déguisé en « rien » qui a caché le défaut (D315).
 *
 *  ⚠ Chaque jour passe TEL QUE LE SERVEUR L'A RENDU — le même objet, son prix
 *  compris. Recopier ou recalculer un jour ici créerait une seconde vérité
 *  tarifaire (D75), et ce module n'a pas le droit de toucher un montant
 *  (décision du relecteur, D316). */
export function mergeAvailabilityWindows(parts: ReadonlyArray<VenueAvailabilityResponse | null>): AvailabilityDays | null {
  const days: VenueAvailabilityResponse["days"] = [];
  const slots = new Map<string, VenueAvailabilityResponse["slots"][number]>();
  for (const part of parts) {
    // D120 — une liste venue du réseau passe par `Array.isArray` devant un rendu.
    if (part === null || !Array.isArray(part.days) || !Array.isArray(part.slots)) return null;
    days.push(...part.days);
    for (const slot of part.slots) if (!slots.has(slot.id)) slots.set(slot.id, slot);
  }
  return { days, slots: [...slots.values()] };
}
