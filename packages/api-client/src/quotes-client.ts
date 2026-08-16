// Devis — Lot E2e.
//
// ⚠ Aucun calcul de montant ici, et ce n'est pas un oubli. Toutes les routes
// rendent un `QuoteDTO` déjà chiffré par le serveur : `basePriceCents`,
// `servicesTotalCents`, `totalCents`, `depositCents`. L'écran n'a donc RIEN à
// recalculer — un devis en DRAFT est, à lui seul, l'estimation à blanc dont on
// aurait autrement eu besoin.
import type {
  QuoteConversionDTO,
  QuoteConvertInput,
  QuoteCreateInput,
  QuoteDTO,
  QuoteDeliverInput
} from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface QuotesClient {
  /** Tous les devis d'une salle, toutes versions, triés par chaîne puis version
   *  croissante : l'historique d'une négociation se lit dans l'ordre. */
  listForVenue(venueId: string): Promise<QuoteDTO[]>;
  /** Compte des CHAÎNES, pas des versions : trois révisions sont UNE affaire. */
  conversion(venueId: string): Promise<QuoteConversionDTO>;
  /** v1 d'une chaîne, en DRAFT. Le serveur chiffre tout. */
  create(venueId: string, input: QuoteCreateInput): Promise<QuoteDTO>;
  /** Enregistre la REMISE du devis au client, par un canal (Q2).
   *
   *  ⚠ Ne change AUCUN statut, et remplace `send()` — qui n'envoyait rien : il
   *  posait un `sentAt` et un état `SENT` dont le seul effet était de débloquer
   *  la conversion. Le devis reste DRAFT ; c'est `sentVia` qui le fait entrer
   *  dans l'entonnoir. Appel RÉPÉTABLE : deux canaux = deux remises. */
  deliver(quoteId: string, input: QuoteDeliverInput): Promise<QuoteDTO>;
  /** Version N+1, en DRAFT — elle ne remplace rien tant qu'elle n'est pas remise. */
  revise(quoteId: string, input: QuoteCreateInput): Promise<QuoteDTO>;
  /** Crée une DEMANDE de réservation en PENDING. Le devis ne bouge pas : il ne
   *  passera `ACCEPTED` qu'à l'encaissement de l'acompte. */
  convert(quoteId: string, input: QuoteConvertInput): Promise<QuoteDTO>;
  /** Refus EXPLICITE — à ne pas confondre avec un remplacement. */
  /** Clôt un devis qui n'aboutira pas. ⚠ Remplace `decline()` (D161) : un seul
   *  état pour « le client a refusé » et « le pro a renoncé ». */
  cancel(quoteId: string): Promise<QuoteDTO>;
}

export function createQuotesClient(request: AuthedRequest): QuotesClient {
  // ⚠ CHEMINS ÉCRITS EN TOUTES LETTRES, ET C'EST DÉLIBÉRÉ MALGRÉ LA RÉPÉTITION.
  //
  // Le raccourci précédent — `act(quoteId, action)` avec l'action en variable —
  // produisait un seul littéral, `` `/quotes/${id}/${action}` ``. Or
  // `contract-api-client.int-spec.ts` relève les chemins dans les SOURCES et
  // remplace chaque `${...}` par un joker : le client déclarait donc appeler
  // `/quotes/*/*`, qui correspond à `send` comme à `deliver`, à `decline` comme
  // à `cancel`, et à n'importe quel chemin jamais implémenté.
  //
  // ⚠ LE SEUL TEST CONÇU POUR VOIR UNE ROUTE RENOMMÉE ÉTAIT AVEUGLE À CE
  // CLIENT — et les deux renommages de Q2 (`send` → `deliver`) et de Q3a
  // (`decline` → `cancel`) sont précisément de cette famille. Un joker qui
  // couvre tout ne couvre rien ; quatre lignes répétées valent mieux qu'une
  // garde qui ne peut pas rougir.
  return {
    listForVenue: (venueId) => request<QuoteDTO[]>(`/pro/venues/${encodeURIComponent(venueId)}/quotes`),
    conversion: (venueId) => request<QuoteConversionDTO>(`/pro/venues/${encodeURIComponent(venueId)}/quotes/conversion`),
    create: (venueId, input) =>
      request<QuoteDTO>(`/venues/${encodeURIComponent(venueId)}/quotes`, { method: "POST", body: input }),
    deliver: (quoteId, input) =>
      request<QuoteDTO>(`/quotes/${encodeURIComponent(quoteId)}/deliver`, { method: "POST", body: input }),
    revise: (quoteId, input) =>
      request<QuoteDTO>(`/quotes/${encodeURIComponent(quoteId)}/revise`, { method: "POST", body: input }),
    convert: (quoteId, input) =>
      request<QuoteDTO>(`/quotes/${encodeURIComponent(quoteId)}/convert`, { method: "POST", body: input }),
    cancel: (quoteId) =>
      request<QuoteDTO>(`/quotes/${encodeURIComponent(quoteId)}/cancel`, { method: "POST", body: {} })
  };
}
