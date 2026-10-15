// Port de LECTURE du devis pour son document — rang 33 (D326), décisions 1, 4 et 7 du relecteur.
//
// ⛔ LECTURE SEULE, PAR CONSTRUCTION : ce port n'a QU'UNE méthode, et elle lit. Le document n'écrit aucun statut, aucune ligne, aucun fichier
// (décision 4 : « le serveur imprime ; il ne calcule pas de montant et n'écrit aucun statut »). Il ne prolonge pas `QuoteStore` (le port du cycle
// de vie, S10b) : aucun appelant du document ne doit pouvoir atteindre `marquerRemis` ou `convertirEnDemande` par accident.
//
// ⛔ LES MONTANTS ARRIVENT TELS QU'ILS SONT STOCKÉS (`quotes.base_price_cents`, `services_total_cents`, `total_cents`, `deposit_cents`, `lines`) et
// repartent tels quels : aucune arithmétique monétaire ne traverse ce port, comme celui des devis (précision de Ko, 05/10/2026 : « il imprime
// toujours la valeur stockée telle qu'elle est au moment du téléchargement »).
//
// ⚠ LA PROPRIÉTÉ SE TRAVERSE PAR LA RELATION (D149) : `Venue.ownerId` référence `ProProfile.id`, PAS `User.id` — l'idiome est
// `venue: { deletedAt: null, owner: { userId } }`. Un autre pro, une salle supprimée ou un identifiant inexistant rendent la MÊME réponse, `null` :
// le contrôleur répond 404 indistinct, et un identifiant de devis deviné ne livre pas les données d'un client.
import type { QuoteStatus, ServicePricingType } from "@zwadj/types";

/**
 * Une ligne de devis TELLE QUE STOCKÉE (`quotes.lines` : l'instantané de `ResolvedLine`). ⛔ Rang 38 (D332, DB-9 et décision 3 du relecteur) : le type de tarification et le
 * nom du palier (FR et AR) sont des champs de la LIGNE — le PDF n'imprime que ce qui est stocké, il ne relit RIEN dans le catalogue actuel de la salle. Le nom de l'UNITÉ
 * n'est pas stocké (il vit sur `ServicePricing`) et DB-9 ne l'exige pas : « par invité » et « à l'unité » n'impriment que la quantité.
 */
export interface QuoteDocumentLine {
  readonly nameFr: string;
  readonly nameAr: string;
  /** Le type de tarification de la ligne : ce que DB-9 imprime en détail suit ce TYPE, jamais la valeur de la quantité. */
  readonly pricingType: ServicePricingType;
  readonly quantity: number;
  /** Le nom du palier choisi, dans les deux langues — `null` hors « à paliers » (l'adaptateur de lecture refuse une ligne « à paliers » qui n'en porte pas). */
  readonly tierLabelFr: string | null;
  readonly tierLabelAr: string | null;
  readonly lineTotalCents: number;
}

export interface QuoteDocumentRecord {
  readonly id: string;
  /** Rang 39 (D333, K-6) — la RÉFÉRENCE du devis, `DEVIS-2026-0001-0089 v1`, bâtie par l'adaptateur de lecture sur la ligne STOCKÉE (année, numéro du devis, numéro de la salle, version). Le modèle
   *  l'imprime telle quelle, le service en DÉRIVE le nom du fichier : ni l'un ni l'autre n'en bâtit une, et l'ancienne (les huit premiers caractères de l'identifiant) a disparu. */
  readonly reference: string;
  readonly version: number;
  /** La plus haute `version` de la CHAÎNE du devis — ce qui dit si CETTE version est encore la dernière. */
  readonly latestVersion: number;
  readonly status: QuoteStatus;
  /** Date civile `AAAA-MM-JJ` (`@db.Date`, jamais un instant). */
  readonly eventDate: string;
  readonly guests: number;
  readonly basePriceCents: number;
  readonly servicesTotalCents: number;
  readonly totalCents: number;
  readonly depositCents: number;
  readonly lines: readonly QuoteDocumentLine[];
  readonly venue: { readonly nameFr: string; readonly nameAr: string };
  readonly slot: { readonly nameFr: string; readonly nameAr: string; readonly startMinutes: number; readonly endMinutes: number } | null;
  /** Le compte client QUAND le devis y est lié (`clientId`), sinon `null` — le devis du parcours sur place n'en a pas. ⛔ Rang 38 (D332) : la langue du compte n'est PLUS lue — la langue du PDF est celle que le pro choisit (décision A de Ko). */
  readonly client: { readonly firstName: string | null; readonly lastName: string | null } | null;
}

export const QUOTE_DOCUMENT_SOURCE = Symbol("QUOTE_DOCUMENT_SOURCE");

export interface QuoteDocumentSource {
  /** Le devis `quoteId` s'il appartient à une salle (non supprimée) du pro `userId`, sinon `null`. */
  findForOwner(userId: string, quoteId: string): Promise<QuoteDocumentRecord | null>;
}
