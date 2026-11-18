// Carte des salles (lot CA-1, session « carte ») — module PUR.
//
// Ce que `GET /api/v1/venue-map` DÉCIDE vit ici, sans Nest, sans base et sans
// client généré (le seul import de Prisma est un TYPE, effacé à la
// compilation) : quelles colonnes sont lues, ce qu'« avoir des coordonnées »
// veut dire, la forme d'un point, et l'enveloppe (sans coordonnées, tronqué).
// Le service ne fait que lire et appeler. Motif : ces décisions se rejouent et
// se neutralisent en millisecondes, là où le service demande un PostgreSQL.
import type { VenueMapPointDTO, VenueMapResponse } from "@zwadj/types";
import type { Prisma } from "../generated/prisma/client";

/** « La salle a une position » = latitude ET longitude.
 *
 *  ⚠ Aucun `CHECK` n'apparie les deux colonnes en base (cherché dans les
 *  migrations, D186) : le schéma partagé les exige ensemble à l'écriture, mais
 *  une ligne à une seule coordonnée reste possible. Elle n'est PAS un point —
 *  elle compte parmi les salles « sans coordonnées ». */
export const HAS_COORDINATES = { lat: { not: null }, lng: { not: null } } as const;

/** Colonnes lues pour un point. Ni taux, ni adresse, ni propriétaire : ce qui
 *  n'est pas lu ne peut pas sortir. Couverture = PREMIÈRE photo par `sortOrder`,
 *  la règle de la liste (A4). */
export const VENUE_MAP_SELECT = {
  id: true,
  slug: true,
  nameFr: true,
  nameAr: true,
  lat: true,
  lng: true,
  capacityMax: true,
  basePriceCents: true,
  photos: {
    orderBy: [{ sortOrder: "asc" }, { id: "asc" }],
    take: 1,
    select: { thumbKey: true }
  }
} satisfies Prisma.VenueSelect;

/** Ce que le module lit d'un `Decimal` de Prisma — rien de plus. */
interface DecimalLike {
  toNumber(): number;
}

/** Une ligne telle que `VENUE_MAP_SELECT` la rend, réduite à ce qui est lu. */
export interface VenueMapRow {
  id: string;
  slug: string;
  nameFr: string;
  nameAr: string;
  lat: DecimalLike | null;
  lng: DecimalLike | null;
  capacityMax: number;
  basePriceCents: number;
  photos: readonly { thumbKey: string }[];
}

/** Ligne → point, ou `null` si la ligne n'a pas ses DEUX coordonnées.
 *
 *  ⚠ Champ par champ, jamais un `...row` : une colonne ajoutée un jour au
 *  SELECT ne doit pas sortir d'ici sans avoir été écrite dans le contrat. */
export function toVenueMapPoint(row: VenueMapRow, urlOf: (key: string) => string): VenueMapPointDTO | null {
  if (row.lat === null || row.lng === null) return null;
  const cover = row.photos[0];
  return {
    id: row.id,
    slug: row.slug,
    nameFr: row.nameFr,
    nameAr: row.nameAr,
    lat: row.lat.toNumber(),
    lng: row.lng.toNumber(),
    basePriceCents: row.basePriceCents,
    capacityMax: row.capacityMax,
    coverThumbUrl: cover === undefined ? null : urlOf(cover.thumbKey)
  };
}

export interface VenueMapEnvelopeInput {
  /** Lignes SITUÉES, déjà ordonnées, au plus `limit` (le service borne par `take`). */
  rows: readonly VenueMapRow[];
  /** Salles qui répondent au filtre, situées ou non. */
  total: number;
  /** Salles situées qui répondent au filtre — peut dépasser `limit`. */
  located: number;
  limit: number;
  /** La date demandée, telle que la requête la porte : `undefined` si aucune. */
  requestedOn: string | undefined;
  urlOf: (key: string) => string;
}

export function venueMapResponse(input: VenueMapEnvelopeInput): VenueMapResponse {
  const points: VenueMapPointDTO[] = [];
  // ⚠ Le plafond est RÉAPPLIQUÉ ici, pas présumé : la promesse « au plus
  // `limit` points » appartient à ce module, pas au `take` d'un appelant.
  for (const row of input.rows.slice(0, input.limit)) {
    const point = toVenueMapPoint(row, input.urlOf);
    if (point !== null) points.push(point);
  }
  return {
    points,
    total: input.total,
    // ⚠ Deux comptes d'une même transaction en READ COMMITTED voient chacun SON
    // instantané : une salle supprimée entre les deux peut rendre `located`
    // plus grand que `total`. Un nombre négatif de salles ne se dit pas.
    withoutCoordinates: Math.max(0, input.total - input.located),
    // `>` et non `>=` : au plafond pile, tout est montré.
    truncated: input.located > input.limit,
    limit: input.limit,
    // ÉCHO (D212) : `null` dit « aucune date demandée », comme `VenueListResponse.availableOn`.
    availableOn: input.requestedOn ?? null
  };
}
