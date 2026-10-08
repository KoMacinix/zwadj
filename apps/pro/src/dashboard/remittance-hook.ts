// LE POINT DE BRANCHEMENT DE L'ENVOI RÉEL (SMS, e-mail) — rang 33 (D326), décision 10 du relecteur.
//
// ⛔ CETTE FONCTION NE FAIT RIEN, ET C'EST LE POINT. Elle est le SEUL endroit, côté écran, où l'envoi réel d'un SMS ou d'un e-mail se branchera, au lot de
// l'envoi réel. Aujourd'hui : AUCUN appel d'API, AUCUN contrat neuf, AUCUN effet. Le contrat réel — destinataire, gabarit, accusé de réception — se
// définira AVEC le fournisseur ; l'inventer ici serait un contrat d'API sans interlocuteur (`CLAUDE.md` : « s'arrêter et demander »).
//
// Qui l'appelle : `walkin-journey.tsx`, une fois la remise ENREGISTRÉE, et SEULEMENT pour un canal où un envoi réel viendra (`wantsRealSending` de
// `remittance.ts` : le SMS et l'e-mail). Pas pour l'impression, l'annonce de vive voix, ni le téléphone. `walkin-journey.test.tsx` mesure les deux faces :
// il est appelé pour le SMS et l'e-mail, et jamais pour les autres canaux ; `remittance.test.ts` mesure que ce fichier n'importe rien et n'écrit aucun
// appel réseau.
//
// ⛔ TANT QU'ELLE NE FAIT RIEN, AUCUN ÉCRAN NE DIT QUE ZWADJ A ENVOYÉ QUELQUE CHOSE (Ko, 04/10/2026). Le jour où elle enverra pour de bon, c'est ce lot-là
// qui changera les textes de la fenêtre (`remitNotSent*`) — ils sont aujourd'hui l'inverse exact : « Zwadj n'envoie pas encore ».
import type { QuoteDTO, QuoteSentVia } from "@zwadj/types";

export function onQuoteRemitted(channel: QuoteSentVia, quote: QuoteDTO): void {
  // Volontairement vide. Les deux paramètres existent pour que le point d'appel soit DÉJÀ le bon : le futur envoi aura besoin du canal et du devis.
  void channel;
  void quote;
}
