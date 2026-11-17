// ADM-1 (D349, rang 51) — la file « en attente de publication » et le refus : ce qui se DÉCIDE sans base. Module PUR (une règle qui se rejoue en millisecondes se neutralise à chaque passage, D187).
//
// Quatre décisions, chacune écrite UNE fois :
//  · les statuts SOURCES de publier et de rejeter — l'un et l'autre s'écrivent par check-and-set (`updateMany` conditionné au statut, compte = 1 exigé : D117, D121, D305) ;
//  · la découpe d'une page sur DEUX groupes (les brouillons jamais rejetés d'abord, les rejetés ensuite : R-2) — un `orderBy` ne peut pas l'exprimer, il rangerait les rejetés par l'ordre
//    ALPHABÉTIQUE de leur motif ;
//  · le refus tel qu'il est lu — jamais sur une salle publiée ;
//  · la date d'un refus, lue au journal : la ligne la plus récente de chaque salle.
import { VenuePublicationStatus, type VenueRejectionDTO } from "@zwadj/types";

/** Publier part de tout ce qui n'est pas déjà publié : le brouillon, et le `PENDING` verrouillé et inutilisé au MVP (A3-④ — publier l'a toujours accepté). Jamais de `PUBLISHED` : publier une salle
 *  publiée est un 200 sans écriture. */
export const PUBLISHABLE_FROM: readonly VenuePublicationStatus[] = [VenuePublicationStatus.DRAFT, VenuePublicationStatus.PENDING];

/** Rejeter ne part que du brouillon : une salle publiée ne se rejette pas (le sens unique d'A3-④, MD-ADM-4) ; la salle rejetée RESTE un brouillon (D-4). */
export const REJECTABLE_FROM: readonly VenuePublicationStatus[] = [VenuePublicationStatus.DRAFT];

export interface PageSlice {
  readonly skip: number;
  readonly take: number;
}

/**
 * La page `page` de taille `pageSize` d'une liste faite de DEUX groupes consécutifs — `firstTotal` lignes, puis `secondTotal` — rendue comme une tranche de chaque groupe.
 * Le second groupe n'est lu que si la page y entre ; un groupe qui n'a rien à rendre a `take: 0` (la requête n'a pas lieu d'être). Une page au-delà de la fin ne rend RIEN : jamais un retour au début.
 */
export function pageAcrossGroups(input: { firstTotal: number; secondTotal: number; page: number; pageSize: number }): { first: PageSlice; second: PageSlice } {
  const { firstTotal, secondTotal, page, pageSize } = input;
  const offset = (page - 1) * pageSize;
  const firstSkip = Math.min(offset, firstTotal);
  const firstTake = Math.max(0, Math.min(pageSize, firstTotal - offset));
  const secondSkip = Math.max(0, offset - firstTotal);
  const secondTake = Math.max(0, Math.min(pageSize - firstTake, secondTotal - secondSkip));
  return { first: { skip: firstSkip, take: firstTake }, second: { skip: secondSkip, take: secondTake } };
}

/** Le refus d'une salle tel que l'admin et le pro le lisent. `null` quand il n'y a pas de motif, et TOUJOURS `null` sur une salle publiée : publier efface le motif, et une valeur périmée restée dans la
 *  colonne ne doit jamais se lire comme un refus en cours. `rejectedAt` vaut `null` quand le journal n'a pas de ligne — jamais une date inventée. */
export function toRejection(status: VenuePublicationStatus, reason: string | null, rejectedAt: Date | null): VenueRejectionDTO | null {
  if (reason === null || status === VenuePublicationStatus.PUBLISHED) return null;
  return { reason, rejectedAt: rejectedAt === null ? null : rejectedAt.toISOString() };
}

/** UNE requête pour toute la page : les lignes du journal, triées du plus récent au plus ancien, se réduisent à la PREMIÈRE de chaque entité. Une ligne sans entité n'entre pas. */
export function latestDatePerEntity(rows: ReadonlyArray<{ entityId: string | null; createdAt: Date }>): Map<string, Date> {
  const out = new Map<string, Date>();
  for (const row of rows) {
    if (row.entityId !== null && !out.has(row.entityId)) out.set(row.entityId, row.createdAt);
  }
  return out;
}
