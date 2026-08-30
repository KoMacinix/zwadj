// Date civile d'Alger — UNE SEULE autorité (D48 : UTC+1 toute l'année, aucun
// changement d'heure).
//
// ⚠ Cette fonction existait déjà, en privé, dans `visits-section.tsx`. UIP-A en
// a besoin une deuxième fois (le compteur « visites du jour » du panneau
// gauche). Deux copies d'un décalage de fuseau, c'est le jour où l'une est
// corrigée et pas l'autre — et un compteur qui compte la veille. Elle est donc
// remontée ici et la section de visites la consomme désormais.
//
// Décaler puis lire en UTC donne la date civile locale sans jamais dépendre du
// fuseau de la machine qui exécute le code (le navigateur du pro peut être en
// tout autre fuseau ; la salle, elle, est à Alger).

const ALGIERS_OFFSET_MS = 3_600_000;

/** `YYYY-MM-DD` civil d'Alger pour un instant donné en millisecondes epoch. */
export function algiersCivilDate(ms: number): string {
  return new Date(ms + ALGIERS_OFFSET_MS).toISOString().slice(0, 10);
}

/** Aujourd'hui à Alger. Paramètre injectable : un test qui dépend de l'horloge
 *  réelle échoue une fois par an, à minuit, sur la machine de quelqu'un. */
export function algiersToday(nowMs: number = Date.now()): string {
  return algiersCivilDate(nowMs);
}
