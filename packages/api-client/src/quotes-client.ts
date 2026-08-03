// Devis — Lot E2e.
//
// ⚠ Aucun calcul de montant ici, et ce n'est pas un oubli. Toutes les routes
// rendent un `QuoteDTO` déjà chiffré par le serveur : `basePriceCents`,
// `servicesTotalCents`, `totalCents`, `depositCents`. L'écran n'a donc RIEN à
// recalculer — un devis en DRAFT est, à lui seul, l'estimation à blanc dont on
// aurait autrement eu besoin.
import type { QuoteConversionDTO, QuoteConvertInput, QuoteCreateInput, QuoteDTO } from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface QuotesClient {
  /** Tous les devis d'une salle, toutes versions, triés par chaîne puis version
   *  croissante : l'historique d'une négociation se lit dans l'ordre. */
  listForVenue(venueId: string): Promise<QuoteDTO[]>;
  /** Compte des CHAÎNES, pas des versions : trois révisions sont UNE affaire. */
  conversion(venueId: string): Promise<QuoteConversionDTO>;
  /** v1 d'une chaîne, en DRAFT. Le serveur chiffre tout. */
  create(venueId: string, input: QuoteCreateInput): Promise<QuoteDTO>;
  /** Le devis devient ACTIF et remplace la version active précédente. */
  send(quoteId: string): Promise<QuoteDTO>;
  /** Version N+1, en DRAFT — elle ne remplace rien tant qu'elle n'est pas envoyée. */
  revise(quoteId: string, input: QuoteCreateInput): Promise<QuoteDTO>;
  /** Crée une DEMANDE de réservation en PENDING. Le devis reste `SENT` : il ne
   *  passera `ACCEPTED` qu'à l'encaissement de l'acompte (D101). */
  convert(quoteId: string, input: QuoteConvertInput): Promise<QuoteDTO>;
  /** Refus EXPLICITE — à ne pas confondre avec un remplacement. */
  decline(quoteId: string): Promise<QuoteDTO>;
}

export function createQuotesClient(request: AuthedRequest): QuotesClient {
  const act = (quoteId: string, action: string, body?: unknown) =>
    request<QuoteDTO>(`/quotes/${encodeURIComponent(quoteId)}/${action}`, { method: "POST", body: body ?? {} });

  return {
    listForVenue: (venueId) => request<QuoteDTO[]>(`/pro/venues/${encodeURIComponent(venueId)}/quotes`),
    conversion: (venueId) => request<QuoteConversionDTO>(`/pro/venues/${encodeURIComponent(venueId)}/quotes/conversion`),
    create: (venueId, input) =>
      request<QuoteDTO>(`/venues/${encodeURIComponent(venueId)}/quotes`, { method: "POST", body: input }),
    send: (quoteId) => act(quoteId, "send"),
    revise: (quoteId, input) => act(quoteId, "revise", input),
    convert: (quoteId, input) => act(quoteId, "convert", input),
    decline: (quoteId) => act(quoteId, "decline")
  };
}
