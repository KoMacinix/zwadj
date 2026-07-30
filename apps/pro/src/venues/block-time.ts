// Composition des date-heures de blocage — Lot B4d, D51.
//
// ── Piège n°1 : ne JAMAIS passer par un `Date` pour fabriquer la chaîne ──────
// `new Date(...).toISOString()` appliquerait le fuseau du NAVIGATEUR. Un pro
// qui gère sa salle depuis la France, ou un test qui tourne sur un runner en
// UTC, créerait un blocage décalé d'une ou deux heures sans le voir. D51 confie
// le fuseau à l'API et à elle seule : l'écran assemble une chaîne civile
// `YYYY-MM-DDTHH:mm` par concaténation, sans jamais instancier d'horloge.
//
// ── Piège n°2 : la borne de fin est EXCLUSIVE ────────────────────────────────
// Un pro qui bloque « du 3 au 10 août » veut que le 10 soit bloqué. L'API
// travaille en intervalle semi-ouvert : envoyer `2027-08-10T00:00` en fin
// laisserait le 10 entièrement LIBRE. La date de fin saisie est donc INCLUSIVE
// à l'écran et convertie en `lendemain T00:00` avant l'envoi.
// C'est la même famille d'erreur que B1 (`endMinutes` plafonné), D52 (l'heure
// de fin du lendemain) et B4c (la saison qui enjambe décembre) : une borne dont
// la sémantique est décidée au mauvais endroit.

/** Ajoute des jours à une date civile `YYYY-MM-DD`, en arithmétique UTC pure —
 *  aucun fuseau local n'intervient. */
export function addDaysCivil(date: string, days: number): string {
  const ms = Date.parse(`${date}T00:00:00Z`);
  if (Number.isNaN(ms)) throw new Error(`date civile invalide : ${date}`);
  return new Date(ms + days * 86_400_000).toISOString().slice(0, 10);
}

/** Assemble une date-heure civile SANS instancier de `Date` : concaténation
 *  pure, donc aucun fuseau ne peut s'y glisser. */
export function civilDateTime(date: string, time: string): string {
  return `${date}T${time}`;
}

export interface BlockDraftInput {
  startDate: string;
  /** Ignorée si `allDay`. */
  startTime: string;
  /** INCLUSIVE à l'écran : « du 3 au 10 » bloque bien le 10. */
  endDate: string;
  /** Ignorée si `allDay`. */
  endTime: string;
  allDay: boolean;
}

/** Traduit la saisie de l'écran en corps d'API (bornes semi-ouvertes). */
export function toBlockPayload(input: BlockDraftInput): { startsAt: string; endsAt: string } {
  if (input.allDay) {
    return {
      startsAt: civilDateTime(input.startDate, "00:00"),
      // +1 jour : la fin exclusive du lendemain rend la journée saisie ENTIÈRE.
      endsAt: civilDateTime(addDaysCivil(input.endDate, 1), "00:00")
    };
  }
  return {
    startsAt: civilDateTime(input.startDate, input.startTime),
    endsAt: civilDateTime(input.endDate, input.endTime)
  };
}

/** Le blocage couvre-t-il des journées entières ? Sert à le RELIRE dans les
 *  mêmes termes que la saisie : un « 3 → 11 août 00:00 » stocké se réaffiche
 *  « du 3 au 10 », sinon le pro croit à un décalage. */
export function isWholeDays(startsAt: string, endsAt: string): boolean {
  return startsAt.endsWith("T00:00") && endsAt.endsWith("T00:00") && startsAt.slice(0, 10) < endsAt.slice(0, 10);
}

/** Dernière journée réellement bloquée, pour l'affichage. */
export function inclusiveEndDate(endsAt: string): string {
  return addDaysCivil(endsAt.slice(0, 10), -1);
}

/** Fenêtre par défaut de la liste : d'aujourd'hui à +92 jours rendus, soit le
 *  plafond exact d'`AVAILABILITY_MAX_WINDOW_DAYS`. Le décalage d'Alger est
 *  appliqué ici pour que « aujourd'hui » soit celui de la salle, pas celui du
 *  navigateur — seul endroit de l'écran où l'heure courante intervient. */
export function defaultWindow(nowMs: number): { from: string; to: string } {
  const from = new Date(nowMs + 60 * 60_000).toISOString().slice(0, 10);
  return { from, to: addDaysCivil(from, 91) };
}
