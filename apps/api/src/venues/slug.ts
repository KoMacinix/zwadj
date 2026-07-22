// Slug d'une salle (Lot A2) — FIGÉ à la création (arbitrage Flux A : jamais
// modifié ensuite, pas de 301). Fonction PURE : l'unicité (suffixes -2, -3…)
// est l'affaire du service, qui s'appuie sur la contrainte UNIQUE en base.

/** Repli quand le nom ne laisse aucun caractère latin/chiffre (ex. nom saisi
 *  en arabe dans nameFr) — le service suffixera à la première collision. */
export const SLUG_FALLBACK = "salle";

/** Longueur max de la BASE (les suffixes de collision s'ajoutent par-dessus,
 *  le total reste très en deçà de toute limite d'index PostgreSQL). */
export const SLUG_MAX_BASE_LENGTH = 60;

export function slugify(name: string): string {
  const base = name
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "") // diacritiques combinants : é→e, ï→i, ç→c…
    .toLowerCase()
    .replace(/œ/g, "oe")
    .replace(/æ/g, "ae")
    .replace(/[^a-z0-9]+/g, "-") // tout le reste (espaces, ', &, arabe…) → tiret
    .replace(/^-+|-+$/g, "")
    .slice(0, SLUG_MAX_BASE_LENGTH)
    .replace(/-+$/g, ""); // si la coupe tombe sur un tiret
  return base.length > 0 ? base : SLUG_FALLBACK;
}
