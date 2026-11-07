// FC-5 (session `front-client`) — LA SEMAINE ALGÉRIENNE, UNE SEULE DÉFINITION pour le client ET le pro.
//
// ⚠ ARBITRAGE DE KO DU 04/10/2026, mot pour mot : « Le week-end : une seule définition, partagée par le client et le pro. »
// Les deux constantes vivaient deux fois, recopiées dans `apps/client/src/lib/calendar.ts` et `apps/pro/src/venues/pro-calendar.ts`
// (« la DÉCISION n'est pas dupliquée […] si elle change, elle change aux deux endroits ») : deux copies d'une même règle finissent
// toujours par diverger, et la divergence est silencieuse (AGENTS.md, « un seul endroit par formule »). Elles montent ici, avec le
// fuseau (D48) : les constantes de temps vivent dans `@zwadj/types`.
//
// ⛔ JAMAIS DÉRIVÉES DE LA LOCALE (D56). CLDR répond « samedi » pour `ar-DZ` (`Intl.Locale("ar-DZ").getWeekInfo()` rend
// `firstDay: 6`) : s'en écarter est DÉLIBÉRÉ — en Algérie la semaine scolaire et de travail commence le DIMANCHE, et le week-end
// est vendredi-samedi, le PIC de la demande en salle des fêtes (pas un creux à griser). Ne pas « réaligner ».
// ⚠ Numérotation JS (`Date.getUTCDay()`) : 0 = dimanche … 6 = samedi — tous les modules de grille raisonnent en JS.

/** Dimanche : premier jour de la grille. */
export const WEEK_START_DAY = 0;

/** Vendredi et samedi : le repos hebdomadaire algérien. Avec un départ dimanche, ils ferment chaque ligne. */
export const WEEKEND_DAYS: readonly number[] = [5, 6];
