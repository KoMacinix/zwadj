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
import type { QuoteStatus } from "@zwadj/types";

export interface QuoteDocumentLine {
  readonly nameFr: string;
  readonly nameAr: string;
  readonly quantity: number;
  readonly lineTotalCents: number;
}

export interface QuoteDocumentRecord {
  readonly id: string;
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
  /** Le compte client QUAND le devis y est lié (`clientId`), sinon `null` — le devis du parcours sur place n'en a pas. `locale` : `users.locale`, tel que stocké. */
  readonly client: { readonly firstName: string | null; readonly lastName: string | null; readonly locale: string } | null;
}

export const QUOTE_DOCUMENT_SOURCE = Symbol("QUOTE_DOCUMENT_SOURCE");

export interface QuoteDocumentSource {
  /** Le devis `quoteId` s'il appartient à une salle (non supprimée) du pro `userId`, sinon `null`. */
  findForOwner(userId: string, quoteId: string): Promise<QuoteDocumentRecord | null>;
}
