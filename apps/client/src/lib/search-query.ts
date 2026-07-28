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
import { VENUE_LIST_SORTS, type VenueListSort } from "@zwadj/types";

export const PAGE_SIZE = 12;

/** Ce que porte l'URL, déjà nettoyé. Les champs texte restent des chaînes :
 *  ils réalimentent les `<input>` à l'identique, y compris quand la saisie est
 *  absurde — on ne réécrit pas ce que le visiteur a tapé. */
export interface SearchState {
  cityId: string;
  guests: string;
  minPrice: string;
  maxPrice: string;
  amenities: string[];
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

export function parseSearchParams(raw: RawSearchParams): SearchState {
  const amenitiesRaw = raw.amenities;
  const amenities = (Array.isArray(amenitiesRaw) ? amenitiesRaw : amenitiesRaw ? [amenitiesRaw] : [])
    // On accepte aussi la forme jointe : une URL copiée depuis un appel d'API
    // ne doit pas silencieusement perdre les filtres.
    .flatMap((value) => value.split(","))
    .map((value) => value.trim())
    .filter((value) => /^[a-z0-9-]+$/.test(value));

  const sortRaw = first(raw.sort) as VenueListSort;
  const pageRaw = Number(first(raw.page));

  return {
    cityId: first(raw.cityId),
    guests: positiveInteger(first(raw.guests)),
    minPrice: positiveInteger(first(raw.minPrice)),
    maxPrice: positiveInteger(first(raw.maxPrice)),
    // Dédoublonné : cocher deux fois la même clé ne doit pas produire deux
    // conditions ET identiques dans la requête.
    amenities: [...new Set(amenities)].sort(),
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
  if (state.amenities.length > 0) query.set("amenities", state.amenities.join(","));
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
  for (const amenity of state.amenities) query.append("amenities", amenity);
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
