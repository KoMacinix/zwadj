// Lot A7 — traduction ENTRE l'URL publique et le contrat A3. Pure, sans I/O :
// c'est ici que vivent les conversions risquées, donc c'est ici qu'on les teste.
//
// Deux écarts ASSUMÉS entre l'URL et l'API, chacun pour une raison :
//
//  1. L'URL porte des DINARS (`minPrice`), l'API des CENTIMES
//     (`minPriceCents`). Un `maxPriceCents=30000000` dans une URL partagée est
//     illisible et invite à la faute d'un facteur 100. Le suffixe `Cents` est
//     donc retiré du nom : sans unité explicite, c'est le dinar.
//
//  2. L'URL répète `amenities` (`?amenities=wifi&amenities=parking`), l'API
//     attend une liste jointe par des virgules. Un `<form method="get">` SANS
//     JavaScript ne sait produire QUE la forme répétée — et cette page doit
//     fonctionner sans JS (SEO + Android bas de gamme, backlog 24.6). La forme
//     répétée est donc la CANONIQUE ; la jointure se fait au dernier moment,
//     à l'appel de l'API.
import {
  CEREMONY_TYPE_FILTERS,
  isRealCivilDate,
  VENUE_LIST_SORTS,
  type CeremonyTypeFilter,
  type VenueListSort
} from "@zwadj/types";

export const PAGE_SIZE = 12;

/* ── Bornes des curseurs (Lot A13b — D69) ────────────────────────────────────
   Déclarées ICI et pas dans la vue : le parseur DOIT connaître les mêmes
   valeurs pour reconnaître qu'une poignée est au bout de sa course. Deux
   copies, c'est un jour où le curseur affiche « 500+ » pendant que l'API reçoit
   un plafond de 500.

   ⚠ RÈGLE D69 — une poignée EN BUTÉE ne filtre pas. Un curseur exprime un
   RÉTRÉCISSEMENT : à pleine largeur il ne rétrécit rien, donc le paramètre est
   OMIS. Sans cette règle, le panneau au repos exclurait déjà des salles — celle
   de 1 200 places disparaîtrait d'une recherche que personne n'a touchée, et
   « 500+ » afficherait moins de résultats que « 500 ».

   Le sentinelle est la borne elle-même, pas une valeur magique : `maxCapacity`
   à 500 SIGNIFIE « 500 ou plus ». C'est ce que le libellé annonce, et cela
   survit à l'absence de JavaScript — un `input[type=range]` soumet toujours sa
   valeur, il n'a aucun moyen de se taire. */
export const CAPACITY_FLOOR = 20;
export const CAPACITY_CEILING = 500;
export const CAPACITY_STEP = 10;

/** En DINARS, comme le reste de l'URL publique (les centimes vivent côté API). */
export const BUDGET_FLOOR = 0;
export const BUDGET_CEILING = 1_500_000;
export const BUDGET_STEP = 50_000;

/** Ce que porte l'URL, déjà nettoyé. Les champs texte restent des chaînes :
 *  ils réalimentent les `<input>` à l'identique, y compris quand la saisie est
 *  absurde — on ne réécrit pas ce que le visiteur a tapé. */
export interface SearchState {
  cityId: string;
  guests: string;
  minPrice: string;
  maxPrice: string;
  /** Plafond de capacité (D68). `""` = pas de plafond. */
  maxCapacity: string;
  amenities: string[];
  /** Clés de styles, sémantique OU (D65). */
  styles: string[];
  /** `""` | `"indoor"` | `"outdoor"` | `"mixed"` — filtre INCLUSIF (D66). */
  ceremonyType: string;
  /** Lot `availableOn` — date civile `YYYY-MM-DD`, `""` si absente.
   *
   *  ⚠ ANNOTE, NE FILTRE PAS : les salles prises restent dans la page, grisées.
   *  Le client cherche une salle ; lui en cacher une parce qu'elle est prise le
   *  2 juin l'empêche de constater qu'elle est libre le 9.
   *
   *  ⚠ AUCUNE NOTION DE « PASSÉ » ICI, et c'est structurel. « Hier » dépend de
   *  l'horloge d'Alger, que ce module ne lit pas et ne doit pas lire : un
   *  navigateur au Canada ne calcule pas le même « aujourd'hui ». L'API est
   *  seule autorité et refuse en 400 (`AVAILABLE_ON_PAST`) ; la page rend ce
   *  refus. Trancher ici créerait une SECONDE autorité, qui dirait « date
   *  passée » là où Alger dit « c'est aujourd'hui ». */
  availableOn: string;
  sort: VenueListSort;
  page: number;
}

export type RawSearchParams = Record<string, string | string[] | undefined>;

function first(value: string | string[] | undefined): string {
  return (Array.isArray(value) ? value[0] : value)?.trim() ?? "";
}

/** Entier positif, ou chaîne vide. Toute saisie non entière est REJETÉE ici et
 *  n'atteint jamais l'API : `venueListQuerySchema` la refuserait en 400, et un
 *  400 sur une page publique indexée est un accident. */
function positiveInteger(value: string): string {
  return /^\d+$/.test(value) && Number(value) > 0 ? String(Number(value)) : "";
}

/** Remet deux bornes dans l'ordre. Une borne absente n'est pas « zéro » : elle
 *  ne participe pas à la comparaison. */
function ordered(low: string, high: string): [string, string] {
  if (low === "" || high === "") return [low, high];
  return Number(low) <= Number(high) ? [low, high] : [high, low];
}

/** Poignée basse au plancher = aucun minimum demandé (D69). */
function atFloor(value: string, floor: number): string {
  return value === "" || Number(value) <= floor ? "" : value;
}

/** Poignée haute en butée = aucun maximum demandé (D69). Le `>=` couvre une URL
 *  bricolée à la main au-delà de la borne : elle veut dire « tout », pas « rien ». */
function atCeiling(value: string, ceiling: number): string {
  return value === "" || Number(value) >= ceiling ? "" : value;
}

export function parseSearchParams(raw: RawSearchParams): SearchState {
  const amenitiesRaw = raw.amenities;
  const amenities = (Array.isArray(amenitiesRaw) ? amenitiesRaw : amenitiesRaw ? [amenitiesRaw] : [])
    // On accepte aussi la forme jointe : une URL copiée depuis un appel d'API
    // ne doit pas silencieusement perdre les filtres.
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => /^[a-z0-9-]+$/.test(value));

  const stylesRaw = raw.styles;
  const styles = (Array.isArray(stylesRaw) ? stylesRaw : stylesRaw ? [stylesRaw] : [])
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => /^[a-z0-9-]+$/.test(value));

  const ceremonyRaw = first(raw.ceremonyType);

  // D69 — sans JavaScript, rien n'empêche de traîner la poignée basse au-dessus
  // de la haute : les deux `input` sont indépendants. On REDRESSE ici plutôt que
  // de laisser partir une plage inversée, que l'API refuserait en 400 (D68) —
  // un 400 sur une page publique indexée est un accident, et le visiteur n'a
  // rien fait d'illégitime, il a juste croisé deux poignées.
  const [guests, maxCapacity] = ordered(
    atFloor(positiveInteger(first(raw.guests)), CAPACITY_FLOOR),
    atCeiling(positiveInteger(first(raw.maxCapacity)), CAPACITY_CEILING)
  );
  const [minPrice, maxPrice] = ordered(
    atFloor(positiveInteger(first(raw.minPrice)), BUDGET_FLOOR),
    atCeiling(positiveInteger(first(raw.maxPrice)), BUDGET_CEILING)
  );

  // ⚠ D55 — le cas RÉEL avant la borne : `2026-06-02` doit passer, et
  // `2026-02-31` doit tomber. La bonne FORME ne fait pas une date : février n'a
  // pas de 31. `isRealCivilDate` valide par aller-retour, et c'est la MÊME
  // fonction que le schéma de l'API — pas une seconde règle à faire diverger.
  const availableOnRaw = first(raw.availableOn);

  const sortRaw = first(raw.sort) as VenueListSort;
  const pageRaw = Number(first(raw.page));

  return {
    cityId: first(raw.cityId),
    // D69 — une poignée en butée est effacée DÈS LA LECTURE de l'URL : l'état
    // ne porte que ce qui filtre réellement, donc `toApiQuery` et
    // `toPublicQuery` n'ont pas chacune à se souvenir de la règle.
    guests,
    maxCapacity,
    minPrice,
    maxPrice,
    // Dédoublonné : cocher deux fois la même clé ne doit pas produire deux
    // conditions ET identiques dans la requête.
    amenities: [...new Set(amenities)].sort(),
    styles: [...new Set(styles)].sort(),
    ceremonyType: CEREMONY_TYPE_FILTERS.includes(ceremonyRaw as CeremonyTypeFilter) ? ceremonyRaw : "",
    // Une date irréelle est SILENCIEUSEMENT abandonnée, comme les autres
    // valeurs mal formées de cette fonction : l'envoyer produirait un 400 sur
    // une page publique indexée, ce qui est un accident (même motif que
    // `positiveInteger`).
    availableOn: isRealCivilDate(availableOnRaw) ? availableOnRaw : "",
    sort: VENUE_LIST_SORTS.includes(sortRaw) ? sortRaw : "recent",
    page: Number.isInteger(pageRaw) && pageRaw >= 1 ? pageRaw : 1
  };
}

/** Querystring destinée à l'API (centimes, amenities jointes). */
export function toApiQuery(state: SearchState): URLSearchParams {
  const query = new URLSearchParams();
  if (state.cityId) query.set("cityId", state.cityId);
  if (state.guests) query.set("guests", state.guests);
  // Dinars → centimes. Le seul endroit du front où cette multiplication existe.
  if (state.minPrice) query.set("minPriceCents", String(Number(state.minPrice) * 100));
  if (state.maxPrice) query.set("maxPriceCents", String(Number(state.maxPrice) * 100));
  if (state.maxCapacity) query.set("maxCapacity", state.maxCapacity);
  if (state.amenities.length > 0) query.set("amenities", state.amenities.join(","));
  if (state.styles.length > 0) query.set("styles", state.styles.join(","));
  if (state.ceremonyType) query.set("ceremonyType", state.ceremonyType);
  if (state.availableOn) query.set("availableOn", state.availableOn);
  query.set("sort", state.sort);
  query.set("page", String(state.page));
  query.set("pageSize", String(PAGE_SIZE));
  return query;
}

/** Querystring destinée à l'URL PUBLIQUE (dinars, amenities répétées).
 *  Les valeurs par défaut sont OMISES : `?sort=recent&page=1` et l'URL nue
 *  rendraient la même page sous deux adresses — du contenu dupliqué pour un
 *  écran dont la raison d'être est le référencement. */
export function toPublicQuery(state: SearchState, page = state.page): string {
  const query = new URLSearchParams();
  if (state.cityId) query.set("cityId", state.cityId);
  if (state.guests) query.set("guests", state.guests);
  if (state.minPrice) query.set("minPrice", state.minPrice);
  if (state.maxPrice) query.set("maxPrice", state.maxPrice);
  if (state.maxCapacity) query.set("maxCapacity", state.maxCapacity);
  for (const amenity of state.amenities) query.append("amenities", amenity);
  for (const style of state.styles) query.append("styles", style);
  if (state.ceremonyType) query.set("ceremonyType", state.ceremonyType);
  if (state.availableOn) query.set("availableOn", state.availableOn);
  if (state.sort !== "recent") query.set("sort", state.sort);
  if (page > 1) query.set("page", String(page));
  const serialized = query.toString();
  return serialized ? `?${serialized}` : "";
}

/** Fenêtre de pagination : bornes toujours présentes, voisins de la courante,
 *  `null` pour les ellipses. Une salle de plus ne doit pas ajouter un lien de
 *  plus indéfiniment en bas de page. */
export function pageWindow(current: number, totalPages: number): (number | null)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1);
  const pages = new Set([1, totalPages, current, current - 1, current + 1]);
  const kept = [...pages].filter((page) => page >= 1 && page <= totalPages).sort((a, b) => a - b);
  const out: (number | null)[] = [];
  let previous = 0;
  for (const page of kept) {
    if (previous && page - previous > 1) out.push(null);
    out.push(page);
    previous = page;
  }
  return out;
}
