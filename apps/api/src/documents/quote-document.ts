// LE MODÈLE du document d'un devis — module PUR. Rang 33 (D326), décisions 1, 3, 6 et 7 du relecteur.
//
// Il reçoit un devis tel que STOCKÉ, une langue et du CSS de polices ; il rend un document HTML complet et autonome. Il ne lit ni l'horloge (la date
// d'émission lui est PASSÉE : « ce qui dépend de l'horloge ne vit pas dans un module pur », D48), ni le disque, ni la base.
//
// ⛔ LA RÈGLE DES MONTANTS (précision de Ko, 05/10/2026) : « le PDF ne doit jamais recalculer tout seul à partir des règles de prix actuelles ; il
// imprime toujours la valeur stockée ». Ce module ne fait QUE METTRE EN FORME des centimes reçus (`formatDZD`, la formule de l'écran) : il n'importe ni
// `pricing-engine`, ni `deposit`, ni `service-pricing`, et `quote-document.spec.ts` le garde par une lecture de SOURCE.
// ⚠ Les montants s'impriment comme l'ÉCRAN DU PRO les affiche — `formatDZD(cents)` SANS locale (« 189 000 DA »), même quand la page est arabe :
// la décision 1 craint un devis imprimé « différent de celui affiché à l'écran ». (En arabe l'algorithme bidirectionnel place l'unité à gauche du
// nombre à l'affichage : c'est son résultat normal ; la preuve de l'arabe l'a rendu et Ko le regarde.)
//
// ⛔ TOUT CE QUI EST INSÉRÉ EST ÉCHAPPÉ (décision 3) : le document est écrit avec la balise `html`, qui échappe par défaut. Le CSS et les polices
// — des octets que le dépôt écrit — sont les SEULS `raw()`.
//
// ⚠ Le moteur n'est pas écrit pour ce seul document (décision 6) : la page, les polices et l'échappement sont ici ; `UIP-D` aura son modèle et
// passera par le même port `PdfRenderer`.
import { formatDZD, formatSlotRange, type QuoteDocumentLocale } from "@zwadj/types";
import arMessages from "@zwadj/i18n/messages/ar.json";
import frMessages from "@zwadj/i18n/messages/fr.json";
import { DOCUMENT_FONT_FAMILY } from "./quote-document-fonts";
import { html, raw, toHtmlString } from "./html";
import type { QuoteDocumentRecord } from "./quote-document-source";

const MESSAGES = { fr: frMessages, ar: arMessages } as const;

const CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "${DOCUMENT_FONT_FAMILY}", sans-serif; font-size: 11pt; color: #18181b; line-height: 1.55; }
h1 { font-size: 22pt; font-weight: 600; margin: 0 0 2mm; }
.sous { color: #52525b; margin: 0 0 8mm; }
.grille { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-block-end: 8mm; }
.champ { border-block-end: 0.3mm solid #d4d4d8; padding-block-end: 1.5mm; }
.champ small { display: block; color: #52525b; font-size: 9pt; }
table { width: 100%; border-collapse: collapse; margin-block-end: 6mm; }
th { text-align: start; font-weight: 600; border-block-end: 0.4mm solid #18181b; padding-block: 2mm; }
td { padding-block: 2mm; border-block-end: 0.2mm solid #e4e4e7; }
td.num, th.num { text-align: end; white-space: nowrap; }
.totaux { margin-inline-start: auto; inline-size: 95mm; }
.totaux div { display: flex; justify-content: space-between; padding-block: 1.5mm; }
.totaux .acompte { font-weight: 600; font-size: 13pt; border-block-start: 0.4mm solid #18181b; margin-block-start: 2mm; padding-block-start: 3mm; }
.note { margin-block-start: 12mm; color: #52525b; font-size: 9pt; }
`;

/** Date civile `AAAA-MM-JJ` en toutes lettres. `Intl` reste autorisé pour les DATES (D57 n'interdit que l'HEURE) ; `timeZone: "UTC"` parce que la date civile n'est pas un instant. */
export function longDate(isoDate: string, locale: QuoteDocumentLocale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

/** La référence imprimée : huit premiers caractères de l'identifiant et la version — elle dit QUELLE version a été imprimée. */
export function quoteReference(record: Pick<QuoteDocumentRecord, "id" | "version">): string {
  return `${record.id.slice(0, 8)}-v${record.version}`;
}

export function buildQuoteDocumentHtml(input: {
  readonly record: QuoteDocumentRecord;
  readonly locale: QuoteDocumentLocale;
  /** Date civile du jour (`AAAA-MM-JJ`), lue par l'appelant : ce module ne lit pas l'horloge. */
  readonly issuedOn: string;
  /** Le bloc `@font-face` (`loadDocumentFontCss`), du dépôt. */
  readonly fontCss: string;
}): string {
  const { record, locale, issuedOn, fontCss } = input;
  const L = MESSAGES[locale].quote.document;
  const rtl = locale === "ar";
  const salle = rtl ? record.venue.nameAr : record.venue.nameFr;
  const creneau =
    record.slot === null
      ? "—"
      : `${rtl ? record.slot.nameAr : record.slot.nameFr} · ${formatSlotRange(record.slot.startMinutes, record.slot.endMinutes)}`;
  // `users.first_name` / `last_name` sont NULLABLES (un compte peut n'avoir ni l'un ni l'autre) : un nom absent s'imprime « — », jamais « null ».
  const nom = record.client === null ? [] : [record.client.firstName, record.client.lastName].filter((p): p is string => p !== null && p.trim() !== "");
  const client = nom.length === 0 ? "—" : nom.join(" ");

  const page = html`<!doctype html>
<html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${L.title} ${quoteReference(record)}</title>
<style>
${raw(fontCss)}
${raw(CSS)}
</style></head>
<body>
<h1>${salle}</h1>
<p class="sous">${L.title} · ${L.reference} ${quoteReference(record)} · ${L.issuedOn} ${longDate(issuedOn, locale)}</p>
<div class="grille">
  <div class="champ"><small>${L.client}</small>${client}</div>
  <div class="champ"><small>${L.eventDate}</small>${longDate(record.eventDate, locale)}</div>
  <div class="champ"><small>${L.slot}</small>${creneau}</div>
  <div class="champ"><small>${L.guests}</small>${record.guests}</div>
</div>
<table>
  <thead><tr><th>${L.service}</th><th class="num">${L.quantity}</th><th class="num">${L.amount}</th></tr></thead>
  <tbody>
${record.lines.map((l) => html`    <tr><td>${rtl ? l.nameAr : l.nameFr}</td><td class="num">${l.quantity}</td><td class="num">${formatDZD(l.lineTotalCents)}</td></tr>\n`)}
  </tbody>
</table>
<div class="totaux">
  <div><span>${L.basePrice}</span><span>${formatDZD(record.basePriceCents)}</span></div>
  <div><span>${L.servicesTotal}</span><span>${formatDZD(record.servicesTotalCents)}</span></div>
  <div><span>${L.total}</span><span>${formatDZD(record.totalCents)}</span></div>
  <div class="acompte"><span>${L.deposit}</span><span>${formatDZD(record.depositCents)}</span></div>
</div>
<p class="note">${L.note}</p>
</body></html>`;
  return toHtmlString(page);
}
