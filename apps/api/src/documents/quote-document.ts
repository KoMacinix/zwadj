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
//
// ⛔ RANG 38 (D332, L35-2) — LE TABLEAU, LE DÉTAIL, LE RÉCAPITULATIF (constat 1 de Ko, 08/10/2026 : « un tableau sans colonne vide et aligné : les prestations
// choisies en lignes, avec une quantité seulement quand elle existe, et le récapitulatif dans un bloc séparé ») :
//   · le tableau des prestations n'a AUCUNE colonne vide : la colonne de DÉTAIL n'existe que si au moins une ligne a un détail ; sans prestation il n'y a PAS de tableau,
//     une phrase dit qu'aucune prestation n'est choisie ;
//   · DB-9 : le détail suit le TYPE de tarification de la ligne STOCKÉE, jamais la valeur de la quantité — « par invité » et « à l'unité » : la quantité ; « à paliers » :
//     le nom du palier, lu SUR LA LIGNE (jamais dans le catalogue actuel de la salle) ; « fixe » : rien. Une ligne « à paliers » sans nom de palier LÈVE, elle ne s'imprime pas à moitié ;
//   · le récapitulatif (location, prestations, total, acompte) est un bloc SÉPARÉ, de toute la largeur : libellés alignés au début, montants à la fin — des propriétés LOGIQUES,
//     donc le même rendu, inversé, en arabe. Le DOM l'énumère dans l'ordre de lecture ; la feuille de style ne fait que le placer.
import { formatDZD, formatSlotRange, ServicePricingType, type QuoteDocumentLocale } from "@zwadj/types";
import arMessages from "@zwadj/i18n/messages/ar.json";
import frMessages from "@zwadj/i18n/messages/fr.json";
import { DOCUMENT_FONT_FAMILY } from "./quote-document-fonts";
import { html, raw, toHtmlString } from "./html";
import type { QuoteDocumentLine, QuoteDocumentRecord } from "./quote-document-source";

const MESSAGES = { fr: frMessages, ar: arMessages } as const;

const CSS = `
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: "${DOCUMENT_FONT_FAMILY}", sans-serif; font-size: 11pt; color: #18181b; line-height: 1.55; }
h1 { font-size: 22pt; font-weight: 600; margin: 0 0 2mm; }
h2 { font-size: 12pt; font-weight: 600; margin: 0 0 3mm; }
.sous { color: #52525b; margin: 0 0 8mm; }
.grille { display: grid; grid-template-columns: 1fr 1fr; gap: 3mm 8mm; margin-block-end: 8mm; }
.champ { border-block-end: 0.3mm solid #d4d4d8; padding-block-end: 1.5mm; }
.champ small { display: block; color: #52525b; font-size: 9pt; }
.prestations { margin-block-end: 8mm; }
table { width: 100%; border-collapse: collapse; }
thead { display: table-header-group; }
tr { break-inside: avoid; }
th { text-align: start; font-weight: 600; border-block-end: 0.4mm solid #18181b; padding-block: 2mm; }
td { padding-block: 2mm; border-block-end: 0.2mm solid #e4e4e7; vertical-align: top; }
th.det, td.det { padding-inline-start: 5mm; color: #3f3f46; }
td.num, th.num { text-align: end; white-space: nowrap; padding-inline-start: 5mm; }
.aucune { color: #52525b; margin: 0 0 8mm; }
.recap { break-inside: avoid; border: 0.3mm solid #d4d4d8; border-radius: 1.5mm; padding: 4mm 6mm; }
.recap dl { margin: 0; }
.ligne { display: flex; justify-content: space-between; gap: 6mm; padding-block: 1.5mm; }
.ligne dt, .ligne dd { margin: 0; }
.ligne dd { white-space: nowrap; }
.ligne.total { border-block-start: 0.3mm solid #d4d4d8; margin-block-start: 1.5mm; padding-block-start: 3mm; font-weight: 600; }
.ligne.acompte { font-weight: 600; font-size: 13pt; }
.note { margin-block-start: 12mm; color: #52525b; font-size: 9pt; }
`;

/** Date civile `AAAA-MM-JJ` en toutes lettres. `Intl` reste autorisé pour les DATES (D57 n'interdit que l'HEURE) ; `timeZone: "UTC"` parce que la date civile n'est pas un instant. */
export function longDate(isoDate: string, locale: QuoteDocumentLocale): string {
  return new Intl.DateTimeFormat(locale === "ar" ? "ar-DZ" : "fr-DZ", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${isoDate}T00:00:00Z`));
}

/**
 * LE DÉTAIL d'une ligne (DB-9, ratifiée par Ko le 12/10/2026) : « la quantité n'est imprimée que pour les prestations « à l'unité » et « par invité » ; pour « à paliers », le
 * nom du palier ; rien pour « fixe » ». La règle suit le TYPE de tarification stocké sur la ligne, jamais la valeur de la quantité (une prestation « à l'unité » de quantité 1
 * imprime « × 1 » ; une « fixe » de quantité 7 n'imprime rien). `null` = aucun détail.
 * ⚠ Le nom du palier est celui de la LIGNE stockée, dans la langue du document ; sa valeur est PASSÉE par l'appelant, ce module ne lit pas le catalogue. Une ligne « à paliers » dont
 * le nom manque LÈVE : elle ne s'imprime pas à moitié (l'adaptateur de lecture la refuse déjà, c'est la seconde barrière d'une même question posée à deux endroits du chemin).
 */
export function lineDetail(line: QuoteDocumentLine, locale: QuoteDocumentLocale): string | null {
  switch (line.pricingType) {
    case ServicePricingType.PER_GUEST:
    case ServicePricingType.PER_UNIT:
      return `× ${line.quantity}`;
    case ServicePricingType.TIERED: {
      const nom = locale === "ar" ? line.tierLabelAr : line.tierLabelFr;
      if (nom === null || nom.trim() === "") throw new TypeError(`la ligne « ${line.nameFr} » est « à paliers » mais ne porte pas le nom de son palier (${locale})`);
      return nom;
    }
    case ServicePricingType.FIXED:
      return null;
  }
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

  // Le détail de CHAQUE ligne est calculé une fois ; la colonne de détail n'existe que si l'une d'elles en a un (aucune colonne vide).
  const details = record.lines.map((l) => lineDetail(l, locale));
  const avecDetail = details.some((d) => d !== null);
  const prestations =
    record.lines.length === 0
      ? html`<p class="aucune">${L.noServices}</p>`
      : html`<section class="prestations">
<table>
  <thead><tr><th>${L.service}</th>${avecDetail ? html`<th class="det">${L.detail}</th>` : ""}<th class="num">${L.amount}</th></tr></thead>
  <tbody>
${record.lines.map((l, i) => html`    <tr><td>${rtl ? l.nameAr : l.nameFr}</td>${avecDetail ? html`<td class="det">${details[i] ?? ""}</td>` : ""}<td class="num">${formatDZD(l.lineTotalCents)}</td></tr>\n`)}
  </tbody>
</table>
</section>`;

  const page = html`<!doctype html>
<html lang="${locale}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${L.title} ${record.reference}</title>
<style>
${raw(fontCss)}
${raw(CSS)}
</style></head>
<body>
<h1>${salle}</h1>
<p class="sous">${L.title} · ${L.reference} <bdi dir="ltr">${record.reference}</bdi> · ${L.issuedOn} ${longDate(issuedOn, locale)}</p>
<div class="grille">
  <div class="champ"><small>${L.client}</small>${client}</div>
  <div class="champ"><small>${L.eventDate}</small>${longDate(record.eventDate, locale)}</div>
  <div class="champ"><small>${L.slot}</small>${creneau}</div>
  <div class="champ"><small>${L.guests}</small>${record.guests}</div>
</div>
${prestations}
<section class="recap">
  <h2>${L.recap}</h2>
  <dl>
    <div class="ligne"><dt>${L.basePrice}</dt><dd>${formatDZD(record.basePriceCents)}</dd></div>
    <div class="ligne"><dt>${L.servicesTotal}</dt><dd>${formatDZD(record.servicesTotalCents)}</dd></div>
    <div class="ligne total"><dt>${L.total}</dt><dd>${formatDZD(record.totalCents)}</dd></div>
    <div class="ligne acompte"><dt>${L.deposit}</dt><dd>${formatDZD(record.depositCents)}</dd></div>
  </dl>
</section>
<p class="note">${L.note}</p>
</body></html>`;
  return toHtmlString(page);
}
