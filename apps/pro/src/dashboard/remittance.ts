// La REMISE du devis — ce que l'écran DIT, en fonctions PURES. Rang 33 (D326), décisions 8, 9 et 10 du relecteur.
//
// ── Pourquoi un module à part ───────────────────────────────────────────────────────────────────────────────────────────────────────────────
// Chaque bouton de remise fait DEUX choses indépendantes — ENREGISTRER le canal (`POST /quotes/:id/deliver`) et TÉLÉCHARGER le PDF
// (`GET /quotes/:id/document`) — qui peuvent réussir ou échouer séparément. Ce que la fenêtre annonce dépend des DEUX issues, et une phrase
// fausse (« tout est fait » alors que le PDF a échoué, ou l'inverse) est le défaut de la décision 9 : « la fenêtre dit ce qui a réellement eu
// lieu ». Cette décision vivait dans un composant : elle vit ici, où elle se rejoue sans DOM (D187, D205).
//
// ⛔ AUCUN TEXTE NE DIT QUE ZWADJ A ENVOYÉ QUOI QUE CE SOIT (Ko, 04/10/2026 : « tant que l'envoi réel n'existe pas, aucun écran ne dit que Zwadj a envoyé
// quoi que ce soit »). Pour le SMS et l'e-mail la fenêtre dit même l'INVERSE : Zwadj n'envoie pas encore, le pro envoie lui-même. `remittance.test.ts`
// mesure, sur toutes les issues et tous les canaux, qu'aucune ligne ne porte un verbe d'envoi à l'actif de Zwadj.
//
// Ce module rend des CLÉS de catalogue et des paramètres — jamais une phrase : le composant traduit (`t`), ce qui garde la parité FR/AR sous la porte.
import { QUOTE_SENT_VIA, quoteSentViaNeedsEmail, quoteSentViaNeedsPhone, type QuoteSentVia } from "@zwadj/types";

/** Ce qui retient un canal : le contact qu'on n'a pas. `needPhone` et `needEmail` sont des CLÉS de raison, pas des phrases. */
export type ChannelBlocker = "needPhone" | "needEmail";

/**
 * Pourquoi un canal est inactif. Le SMS et le téléphone exigent un mobile valide (D158, D160) ; l'e-mail exige une adresse valide (rang 33 : « on ne
 * remet pas par e-mail une adresse qu'on n'a pas »). Les deux règles viennent du CONTRAT (`quoteSentViaNeedsPhone`, `quoteSentViaNeedsEmail`) :
 * jamais une liste de canaux recopiée ici.
 */
export function channelBlockers(channel: QuoteSentVia, contact: { phoneOk: boolean; emailOk: boolean }): ChannelBlocker[] {
  const out: ChannelBlocker[] = [];
  if (quoteSentViaNeedsPhone(channel) && !contact.phoneOk) out.push("needPhone");
  if (quoteSentViaNeedsEmail(channel) && !contact.emailOk) out.push("needEmail");
  return out;
}

/** Les canaux pour lesquels un ENVOI RÉEL viendra (le SMS et l'e-mail) : seuls eux appellent le point de branchement (`remittance-hook.ts`). */
export const CHANNELS_WITH_FUTURE_SENDING: readonly QuoteSentVia[] = [QUOTE_SENT_VIA.SMS, QUOTE_SENT_VIA.EMAIL];

export function wantsRealSending(channel: QuoteSentVia): boolean {
  return CHANNELS_WITH_FUTURE_SENDING.includes(channel);
}

/** Une ligne de la fenêtre : une clé de catalogue `venue.ui.walkin.<key>`, le canal à nommer, et l'ÉCHEC dont le motif se traduira. */
export interface RemitLine {
  readonly key: string;
  readonly channel?: QuoteSentVia;
  readonly failure?: unknown;
}

export interface RemitView {
  /** Clé de catalogue `venue.ui.walkin.<titleKey>`. */
  readonly titleKey: string;
  readonly lines: readonly RemitLine[];
}

/** Les deux issues, SÉPARÉES. `failure` porte l'erreur d'origine (le composant la traduit : `useApiErrorMessage`). */
export interface RemitOutcome {
  readonly channel: QuoteSentVia;
  readonly recorded: { readonly ok: true } | { readonly ok: false; readonly failure: unknown };
  readonly pdf: { readonly ok: true } | { readonly ok: false; readonly failure: unknown };
}

/**
 * Ce que la fenêtre dit — l'enregistrement d'abord, le PDF ensuite, puis, pour le SMS et l'e-mail, ce que Zwadj ne fait PAS encore.
 *
 * ⚠ La ligne « Zwadj n'envoie pas encore… » n'est posée que si la remise est ENREGISTRÉE : quand l'enregistrement a échoué, le pro va recommencer, et
 * la ligne l'alourdirait ; dès qu'il a réussi, elle lui dit ce qui reste À SA CHARGE.
 */
export function describeRemittance(outcome: RemitOutcome): RemitView {
  const { channel, recorded, pdf } = outcome;
  const titleKey = recorded.ok
    ? pdf.ok
      ? "remitTitleDone"
      : "remitTitleRecordedOnly"
    : pdf.ok
      ? "remitTitlePdfOnly"
      : "remitTitleNone";
  const lines: RemitLine[] = [
    recorded.ok ? { key: "remitRecorded", channel } : { key: "remitRecordFailed", failure: recorded.failure },
    pdf.ok ? { key: "remitPdfDone" } : { key: "remitPdfFailed", failure: pdf.failure }
  ];
  if (recorded.ok && wantsRealSending(channel)) lines.push({ key: `remitNotSent${channel}` });
  return { titleKey, lines };
}
