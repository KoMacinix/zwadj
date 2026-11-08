// Rang 47 (D345) — la FORME du brouillon du parcours « Nouvelle réservation », et la liste de ses étapes.
//
// ⛔ Un module SANS dépendance de React ni du navigateur (D187) : la forme du brouillon et la liste des étapes, en un seul endroit. Le fournisseur
// (`walkin-draft-context.tsx`) ne fait que garder et rendre.
//
// ⚠ IL N'Y A PAS DE RÈGLE « CE BROUILLON EST-IL VIERGE ? ». Une première version en portait une (`brouillonVierge`, pour ne pas garder un brouillon sans réponse) : MESURÉE
// équivalente — rendue toujours fausse, tous les tests de comportement restent verts (seul son test unitaire « un brouillon sans réponse est vierge » rougit), parce qu'un brouillon vierge restitué est un parcours
// neuf. Une garde qu'aucun comportement ne peut faire rougir n'en est pas une (D325, mutation équivalente) : elle est retirée avec ses tests.
//
// ⛔ EN MÉMOIRE SEULEMENT (R-1, Ko/relecteur, 08/11/2026). Le brouillon porte le numéro, l'e-mail et le nom d'un client, et le poste du comptoir est partagé :
// rien de tout cela ne s'écrit dans le stockage du navigateur. Une garde de SOURCE (`walkin-draft.test.tsx`) lit ce fichier et celui du fournisseur.
import type { ClientRecordDTO } from "@zwadj/types";
import type { Contact, Identifiant, Noms } from "./walkin-contact";
import type { DetailSaisi } from "./walkin-services";

/** Les SIX étapes, dans l'ordre — l'AUTORITÉ de la liste, importée par le parcours (une seule liste, jamais deux). */
export const WALKIN_STEPS = ["contact", "client", "date", "slot", "services", "quote"] as const;
export type WalkinStep = (typeof WALKIN_STEPS)[number];

/**
 * Tout ce que le pro a répondu, et rien de ce que le serveur a rendu pour l'affichage.
 *
 * ⛔ CE QUI Y EST, ET POURQUOI : les saisies (identifiant, noms, retouches, date, créneau, invités, prestations, détails), l'étape, la fiche trouvée ou créée, et la chaîne
 * de devis (`chainQuoteId` — la révision suivante reste dans la bonne chaîne). ⚠ Cinq états de plus que la consigne n'en listait (décision S-144, lecture adverse n° 6) :
 * `servicesAnswered`, `sansCoordonnees`, `chaineBrouillon`, `cherche`, `ficheTrouvee` — sans eux l'étape « prestations » n'est pas répondue au retour, ou la révision envoie la
 * fiche d'un brouillon, ou « Continuer » refait une recherche déjà faite.
 *
 * ⛔ CE QUI N'Y EST PAS : le devis AFFICHÉ (R-3 : la salle ou les prix ont pu changer, il est « à recalculer » — `devisAffiche` ne dit que « il y en avait un »), et les
 * issues (`outcome`, `done`, `remit`) — une issue FERME le parcours, elle ne se garde pas (R-4).
 */
export interface WalkinDraft {
  /** R-5 : le brouillon appartient à UNE salle ; celui d'une autre salle n'est jamais montré. */
  venueId: string;
  step: WalkinStep;
  identifiant: Identifiant;
  cherche: Identifiant | null;
  fiche: ClientRecordDTO | null;
  ficheTrouvee: boolean;
  noms: Noms;
  retouches: Partial<Contact>;
  eventDate: string | null;
  slotId: string | null;
  guests: string;
  picks: string[];
  details: Record<string, DetailSaisi>;
  chainQuoteId: string | null;
  servicesAnswered: boolean;
  sansCoordonnees: boolean;
  chaineBrouillon: boolean;
  /** Un devis était affiché (ou venait d'être jeté par une modification) : au retour, l'écran dit « à recalculer ». */
  devisAffiche: boolean;
}
