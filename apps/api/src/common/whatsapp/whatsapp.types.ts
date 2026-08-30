// Port d'envoi WhatsApp — Flux C, Lot C3, D63.
//
// Symétrique de `EMAIL_SENDER` (common/email), et pour la même raison : les
// appelants ne connaissent qu'un port, le transport se remplace derrière eux.
//
// ── Pourquoi « WhatsApp » et non « SMS » ─────────────────────────────────────
// L'enum `NotificationChannel.SMS` porte le canal ; D60 tranche le TRANSPORT :
// les pros algériens conduisent leur activité sur WhatsApp, pas par SMS
// opérateur. Le port porte donc le nom du transport réel — appeler ce fichier
// `sms` obligerait chaque lecteur à se rappeler que « SMS » veut dire autre
// chose.
//
// ⚠ AUCUN fournisseur réel dans ce lot (D63) : l'API Cloud de Meta exige un
// compte business vérifié, un numéro dédié et un modèle de message approuvé.
// L'adaptateur de dev logge ; quand le vrai transport arrivera, il prendra sa
// place sans qu'un seul appelant change, et ses variables rejoindront
// `PROD_REQUIRED_EXPLICIT`.
export interface SendWhatsAppInput {
  /** Numéro destinataire, déjà normalisé +213 (`ProProfile.phone`). */
  to: string;
  /** Corps texte brut. Pas de sujet : WhatsApp n'en a pas. */
  text: string;
}

export interface WhatsAppSender {
  send(input: SendWhatsAppInput): Promise<void>;
}

/** Jeton d'injection du port (interface TS = pas de runtime, d'où le Symbol). */
export const WHATSAPP_SENDER = Symbol("WHATSAPP_SENDER");
