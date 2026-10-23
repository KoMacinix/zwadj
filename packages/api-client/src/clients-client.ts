// La FICHE CLIENT d'un pro — rang 41 (D336, L35-4 amendé) : K-1 (rechercher), K-2 (créer ou rendre), K-3 (compléter un nom), K-3b (modifier).
//
// ⚠ CHEMINS ÉCRITS EN TOUTES LETTRES DANS CHAQUE APPEL À `request(...)` (D182) : `contract-api-client.int-spec.ts` relève les chemins dans les SOURCES et les
// confronte aux routes de l'API — un chemin construit hors de l'appel lui serait invisible.
// ⚠ Aucune règle ici : le numéro, l'e-mail et les noms sont validés par le contrat (`@zwadj/types`), à l'écran avant l'envoi et au serveur à l'arrivée.
import type {
  ClientRecordCreateDTO,
  ClientRecordCreateInput,
  ClientRecordDTO,
  ClientRecordLookupDTO,
  ClientRecordLookupInput,
  ClientRecordNamesInput,
  ClientRecordUpdateInput
} from "@zwadj/types";
import type { AuthedRequest } from "./venue-client";

export interface ProClientsClient {
  /** K-1 — la fiche du pro qui porte ce numéro OU cet e-mail ; `{ found: false }`, de forme identique, pour tout identifiant sans fiche (M-4). */
  lookup(input: ClientRecordLookupInput): Promise<ClientRecordLookupDTO>;
  /** K-2 — crée la fiche, ou rend celle qui existe (telle quelle) ; `created` dit si elle vient de naître. */
  create(input: ClientRecordCreateInput): Promise<ClientRecordCreateDTO>;
  /** K-3 — complète un nom MANQUANT ; ne remplace jamais. */
  completeNames(id: string, input: ClientRecordNamesInput): Promise<ClientRecordDTO>;
  /** K-3b — modifie une fiche non liée ; ne touche aucune copie déjà faite sur un devis. */
  update(id: string, input: ClientRecordUpdateInput): Promise<ClientRecordDTO>;
}

export function createProClientsClient(request: AuthedRequest): ProClientsClient {
  return {
    lookup: (input) => request<ClientRecordLookupDTO>("/pro/clients/lookup", { method: "POST", body: input }),
    create: (input) => request<ClientRecordCreateDTO>("/pro/clients", { method: "POST", body: input }),
    completeNames: (id, input) => request<ClientRecordDTO>(`/pro/clients/${encodeURIComponent(id)}/names`, { method: "PATCH", body: input }),
    update: (id, input) => request<ClientRecordDTO>(`/pro/clients/${encodeURIComponent(id)}`, { method: "PATCH", body: input })
  };
}
