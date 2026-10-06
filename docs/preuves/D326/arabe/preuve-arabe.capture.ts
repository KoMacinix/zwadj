import { chromium, expect, test } from "@playwright/test";
import { createRequire } from "node:module";
import { execFileSync } from "node:child_process";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { randomUUID } from "node:crypto";
import { resolve } from "node:path";
import fr from "../../../../packages/i18n/messages/fr.json";
import ar from "../../../../packages/i18n/messages/ar.json";
import { formatDZD } from "../../../../packages/i18n/src/format";
import { formatSlotRange } from "../../../../packages/types/src/venue";
import { accessTokenOf, apiCall, createPublishedVenue, seedReferentials } from "../../../../e2e/fixtures/harness";

/**
 * D326 — PREUVE DE L'ARABE (décision 2 du relecteur, rang 33), AVANT toute ligne de code du lot.
 *
 * QUESTION : le Chromium de Playwright rend-il, en PDF, un devis arabe lisible — police CHOISIE et EMBARQUÉE, lettres LIÉES, sens droite-gauche, chiffres et « DA » à leur place ?
 *
 * MONTAGE (décision 2) : un devis RÉEL — créé par l'API (salle, prestations, compte client à la langue `ar`, devis lié à ce client), puis RELU par l'API —, rempli dans un modèle HTML, rendu
 * par le Chromium de Playwright (`page.pdf`), avec les gardes que la décision 3 exige (JavaScript coupé, réseau bloqué, police et styles du dépôt, navigateur fermé en `finally`).
 * ⚠ Ce modèle est un BROUILLON JETABLE : il sert à la preuve, il ne devient pas le modèle du lot (qui s'écrit dans `apps/api`, module pur, avec ses propres tests).
 *
 * CE QUE LE SCRIPT ÉCRIT, dans `sortie/` : trois PDF (arabe avec la police, arabe SANS la police — le témoin —, français avec la police), `sources.json` (les chaînes source, pour la
 * comparaison avec l'extraction de texte), `processus.txt` (les processus du navigateur pendant et après le rendu). Les contrôles — police embarquée, pages rastérisées, extraction de texte —
 * sont des scripts SÉPARÉS (`pdf-fonts.py`, `rasteriser.mjs`, `comparer-texte.py`) : un script qui juge sa propre sortie ne se calibre pas.
 *
 * USAGE : voir `playwright.capture.config.ts`.
 */
const ici = __dirname;
const SORTIE = resolve(ici, "sortie");
const e2e = resolve(ici, "../../../../e2e");
const require_ = createRequire(resolve(e2e, "package.json"));
const DATABASE_URL = process.env.E2E_DATABASE_URL ?? "postgresql://zwadj:zwadj@localhost:5432/zwadj_e2e?schema=public";

// ── Les polices : celles du DÉPÔT (`@fontsource/readex-pro`, SIL OFL 1.1), lues sur disque, jamais d'une adresse ───────────────────────────────────────────
const FONTS = resolve(ici, "../../../../apps/pro/node_modules/@fontsource/readex-pro/files");
const police = (nom: string) => readFileSync(resolve(FONTS, nom)).toString("base64");
const PLAGES = {
  // Plages des sous-ensembles « arabic » et « latin » de Google Fonts : ce sont celles-ci qui décident quelle face sert quel caractère. Vérifiées par le contrôle (a) :
  // si l'une est trop étroite, un caractère retombe sur une police système et le PDF en porte une SECONDE.
  arabic:
    "U+0600-06FF, U+0750-077F, U+0870-088E, U+0890-0891, U+0898-08E1, U+08E3-08FF, U+200C-200E, U+2010-2011, U+204F, U+2E41, U+FB50-FDFF, U+FE70-FE74, U+FE76-FEFC, U+102E0-102FB, U+10E60-10E7E, U+10EFD-10EFF, U+1EE00-1EEFF",
  latin:
    "U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+02C6, U+02DA, U+02DC, U+0304, U+0308, U+0329, U+2000-206F, U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD"
};
function facesDePolice(): string {
  const face = (sousEnsemble: "arabic" | "latin", poids: number) =>
    `@font-face { font-family: "Readex Pro"; font-style: normal; font-weight: ${poids}; unicode-range: ${PLAGES[sousEnsemble]};
       src: url(data:font/woff2;base64,${police(`readex-pro-${sousEnsemble}-${poids}-normal.woff2`)}) format("woff2"); }`;
  return [face("arabic", 400), face("arabic", 600), face("latin", 400), face("latin", 600)].join("\n");
}

// ── ÉCHAPPEMENT : tout ce qui est inséré passe par ici ─────────────────────────────────────────────────────────────────────────────────────────────────────
const esc = (s: string | number) =>
  String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;").replace(/'/g, "&#39;");

type Langue = "fr" | "ar";
interface Donnees {
  salle: string;
  client: string | null;
  reference: string;
  etabli: string;
  date: string;
  creneau: string;
  invites: number;
  lignes: { nom: string; quantite: number; total: string }[];
  base: string;
  prestations: string;
  total: string;
  acompte: string;
}

const MESSAGES = { fr, ar } as const;
function modele(langue: Langue, d: Donnees, avecPolice: boolean): string {
  const w = MESSAGES[langue].venue.ui.walkin;
  const rtl = langue === "ar";
  const L = {
    titre: w.qQuote,
    reference: rtl ? "المرجع" : "Référence",
    etabli: rtl ? "حُرّر في" : "Établi le",
    client: rtl ? "الزبون" : "Client",
    date: rtl ? "تاريخ المناسبة" : "Date de l'événement",
    creneau: rtl ? "الفترة" : "Créneau",
    invites: rtl ? "عدد الضيوف" : "Invités",
    prestation: rtl ? "الخدمة" : "Prestation",
    quantite: rtl ? "الكمية" : "Qté",
    montant: rtl ? "المبلغ" : "Montant",
    base: w.basePrice,
    prestations: w.servicesTotal,
    total: w.total,
    acompte: w.deposit,
    note: rtl ? "تلخّص هذه الوثيقة القيم المسجّلة وقت تنزيلها." : "Ce document récapitule les valeurs enregistrées au moment de son téléchargement."
  };
  const famille = avecPolice ? `"Readex Pro", sans-serif` : `sans-serif`;
  return `<!doctype html>
<html lang="${langue}" dir="${rtl ? "rtl" : "ltr"}"><head><meta charset="utf-8"><title>${esc(L.titre)}</title>
<style>
${avecPolice ? facesDePolice() : ""}
@page { size: A4; margin: 16mm 14mm; }
* { box-sizing: border-box; }
body { margin: 0; font-family: ${famille}; font-size: 11pt; color: #18181b; line-height: 1.55; }
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
.num-ltr { unicode-bidi: isolate; direction: ltr; }
</style></head>
<body>
<h1>${esc(d.salle)}</h1>
<p class="sous">${esc(L.titre)} · ${esc(L.reference)} ${esc(d.reference)} · ${esc(L.etabli)} ${esc(d.etabli)}</p>
<div class="grille">
  <div class="champ"><small>${esc(L.client)}</small>${d.client === null ? "—" : esc(d.client)}</div>
  <div class="champ"><small>${esc(L.date)}</small>${esc(d.date)}</div>
  <div class="champ"><small>${esc(L.creneau)}</small>${esc(d.creneau)}</div>
  <div class="champ"><small>${esc(L.invites)}</small>${esc(d.invites)}</div>
</div>
<table>
  <thead><tr><th>${esc(L.prestation)}</th><th class="num">${esc(L.quantite)}</th><th class="num">${esc(L.montant)}</th></tr></thead>
  <tbody>
${d.lignes.map((l) => `    <tr><td>${esc(l.nom)}</td><td class="num">${esc(l.quantite)}</td><td class="num">${esc(l.total)}</td></tr>`).join("\n")}
  </tbody>
</table>
<div class="totaux">
  <div><span>${esc(L.base)}</span><span>${esc(d.base)}</span></div>
  <div><span>${esc(L.prestations)}</span><span>${esc(d.prestations)}</span></div>
  <div><span>${esc(L.total)}</span><span>${esc(d.total)}</span></div>
  <div class="acompte"><span>${esc(L.acompte)}</span><span>${esc(d.acompte)}</span></div>
</div>
<p class="note">${esc(L.note)}</p>
</body></html>`;
}

function powershell(commande: string): string {
  return execFileSync("powershell", ["-NoProfile", "-NonInteractive", "-Command", commande], { encoding: "utf-8" }).trim();
}
const PROCESSUS_DU_NAVIGATEUR =
  "Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*ms-playwright*' } | ForEach-Object { $_.Name + ' · ' + $_.ProcessId + ' · ' + $_.ExecutablePath }";
const COMPTE_CHROME = "@(Get-Process chrome -ErrorAction SilentlyContinue).Count";
const COMPTE_PLAYWRIGHT = "@(Get-CimInstance Win32_Process | Where-Object { $_.ExecutablePath -like '*ms-playwright*' }).Count";

const journalProcessus: string[] = [];
async function rendre(html: string, fichier: string, mesurer: boolean): Promise<void> {
  const browser = await chromium.launch();
  try {
    const context = await browser.newContext({ javaScriptEnabled: false });
    const requetes: string[] = [];
    await context.route("**/*", (route) => {
      requetes.push(route.request().url().slice(0, 80));
      return route.abort();
    });
    const page = await context.newPage();
    await page.setContent(html, { waitUntil: "load" });
    if (mesurer) {
      journalProcessus.push(`== PENDANT le rendu (navigateur ouvert) — ${new Date().toISOString()}`);
      journalProcessus.push(`exécutable lancé : ${chromium.executablePath()}`);
      journalProcessus.push(`version du navigateur : ${browser.version()}`);
      journalProcessus.push(`processus dont le chemin contient « ms-playwright » :\n${powershell(PROCESSUS_DU_NAVIGATEUR)}`);
      journalProcessus.push(`compté par « Get-Process chrome » : ${powershell(COMPTE_CHROME)}`);
      journalProcessus.push(`compté par le chemin « ms-playwright » : ${powershell(COMPTE_PLAYWRIGHT)}`);
    }
    const pdf = await page.pdf({ format: "A4", printBackground: true, preferCSSPageSize: true });
    writeFileSync(resolve(SORTIE, fichier), pdf);
    journalProcessus.push(`rendu « ${fichier} » : ${pdf.length} octets ; requêtes interceptées (toutes avortées) : ${requetes.length}`);
  } finally {
    await browser.close();
  }
  if (mesurer) {
    journalProcessus.push(`== APRÈS la fermeture — ${new Date().toISOString()}`);
    journalProcessus.push(`compté par « Get-Process chrome » : ${powershell(COMPTE_CHROME)}`);
    journalProcessus.push(`compté par le chemin « ms-playwright » : ${powershell(COMPTE_PLAYWRIGHT)}`);
  }
}

test("preuve de l'arabe : un devis RÉEL, créé par l'API, rendu en PDF par le Chromium de Playwright", async () => {
  mkdirSync(SORTIE, { recursive: true });
  seedReferentials();

  // ── 1. La salle (créée par l'API, publiée comme le feraient ses rôles), son nom arabe, ses prestations ───────────────────────────────────────────────────
  const salle = await createPublishedVenue();
  const tPro = await accessTokenOf(salle.pro);
  const NOM_SALLE_AR = "قاعة الياسمين للأفراح والمناسبات";
  const maj = await apiCall("PATCH", `/venues/${salle.id}`, tPro, { nameAr: NOM_SALLE_AR });
  expect(maj.status, `PATCH /venues/:id : ${maj.text}`).toBe(200);
  const fiche = await apiCall("GET", `/pro/venues/${salle.id}`, tPro);
  expect(fiche.status).toBe(200);
  const slot = (fiche.json as { slotTemplates: { id: string; nameAr: string; nameFr: string; startMinutes: number; endMinutes: number }[] }).slotTemplates[0]!;

  const prestations = [
    { pricingType: "FIXED", nameFr: "Animation musicale (orchestre)", nameAr: "تنشيط موسيقي بفرقة حيّة", fixedPriceCents: 4_500_000 },
    { pricingType: "PER_GUEST", nameFr: "Buffet ouvert", nameAr: "بوفيه مفتوح للضيوف", perGuestPriceCents: 250_000 },
    { pricingType: "FIXED", nameFr: "Photographie et vidéo", nameAr: "تصوير فوتوغرافي وفيديو للحفل", fixedPriceCents: 3_000_000 }
  ];
  const ids: string[] = [];
  for (const p of prestations) {
    const r = await apiCall("POST", `/venues/${salle.id}/services`, tPro, p);
    expect(r.status, `POST services : ${r.text}`).toBe(201);
    ids.push((r.json as { id: string }).id);
  }

  // ── 2. Le CLIENT : un vrai compte, de langue `ar`, au nom arabe — c'est la branche « langue du client » de la décision 7 ─────────────────────────────────
  const email = `e2e-ar-${randomUUID()}@example.dz`;
  const PRENOM = "آمنة";
  const NOM = "بن سالم";
  const inscription = await apiCall("POST", "/auth/register", undefined, {
    role: "CLIENT", email, password: "Motdepasse1", firstName: PRENOM, lastName: NOM, locale: "ar"
  });
  expect(inscription.status, `register : ${inscription.text}`).toBe(201);
  const { Client } = require_("pg") as typeof import("pg");
  const db = new Client({ connectionString: DATABASE_URL });
  await db.connect();
  let clientId: string;
  try {
    await db.query(`UPDATE users SET email_verified_at = now() WHERE email = $1`, [email]);
    const { rows } = await db.query<{ id: string; locale: string }>(`SELECT id, locale FROM users WHERE email = $1`, [email]);
    clientId = rows[0]!.id;
    expect(rows[0]!.locale, "la langue du compte est bien stockée").toBe("ar");
  } finally {
    await db.end();
  }

  // ── 3. Le DEVIS : créé par l'API (elle chiffre), lié au client, puis RELU par l'API ───────────────────────────────────────────────────────────────────────
  const dans60Jours = new Date(Date.now() + 60 * 86_400_000).toISOString().slice(0, 10);
  const INVITES = 150;
  const cree = await apiCall("POST", `/venues/${salle.id}/quotes`, tPro, {
    eventDate: dans60Jours, slotTemplateId: slot.id, guests: INVITES, clientId, services: ids.map((serviceId) => ({ serviceId }))
  });
  expect(cree.status, `POST quotes : ${cree.text}`).toBe(201);
  const liste = await apiCall("GET", `/pro/venues/${salle.id}/quotes`, tPro);
  expect(liste.status).toBe(200);
  const devis = (liste.json as { id: string; version: number; clientId: string | null; eventDate: string; guests: number; basePriceCents: number;
    servicesTotalCents: number; totalCents: number; depositCents: number;
    lines: { nameFr: string; nameAr: string; quantity: number; lineTotalCents: number }[] }[]).find((q) => q.id === (cree.json as { id: string }).id)!;
  expect(devis.clientId).toBe(clientId);
  expect(devis.lines.length).toBe(3);

  // ── 4. Le MODÈLE, rempli UNIQUEMENT de valeurs lues (jamais recalculées) ─────────────────────────────────────────────────────────────────────────────────
  const jour = (iso: string, l: Langue) =>
    new Intl.DateTimeFormat(l === "ar" ? "ar-DZ" : "fr-DZ", { dateStyle: "long", timeZone: "UTC" }).format(new Date(`${iso}T00:00:00Z`));
  const donnees = (l: Langue): Donnees => ({
    salle: l === "ar" ? NOM_SALLE_AR : salle.nameFr,
    client: `${PRENOM} ${NOM}`,
    reference: `${devis.id.slice(0, 8)}-v${devis.version}`,
    etabli: jour(new Date().toISOString().slice(0, 10), l),
    date: jour(devis.eventDate, l),
    creneau: `${l === "ar" ? slot.nameAr : slot.nameFr} · ${formatSlotRange(slot.startMinutes, slot.endMinutes)}`,
    invites: devis.guests,
    lignes: devis.lines.map((x) => ({ nom: l === "ar" ? x.nameAr : x.nameFr, quantite: x.quantity, total: formatDZD(x.lineTotalCents) })),
    base: formatDZD(devis.basePriceCents),
    prestations: formatDZD(devis.servicesTotalCents),
    total: formatDZD(devis.totalCents),
    acompte: formatDZD(devis.depositCents)
  });
  // Les chaînes SOURCE, pour la comparaison avec l'extraction de texte (critère c).
  const arD = donnees("ar");
  const sources = {
    salle: arD.salle, client: arD.client, creneau_nom: slot.nameAr, prestations: devis.lines.map((x) => x.nameAr),
    montants: [arD.base, arD.prestations, arD.total, arD.acompte, ...arD.lignes.map((x) => x.total)],
    montants_ar_DZ: [formatDZD(devis.depositCents, "ar"), formatDZD(devis.totalCents, "ar")],
    valeurs_stockees_centimes: { base: devis.basePriceCents, prestations: devis.servicesTotalCents, total: devis.totalCents, acompte: devis.depositCents },
    libelles_ar: [MESSAGES.ar.venue.ui.walkin.qQuote, MESSAGES.ar.venue.ui.walkin.deposit, MESSAGES.ar.venue.ui.walkin.basePrice, MESSAGES.ar.venue.ui.walkin.servicesTotal]
  };
  writeFileSync(resolve(SORTIE, "sources.json"), JSON.stringify(sources, null, 2), "utf-8");

  // ── 5. Les rendus : arabe AVEC la police, arabe SANS la police (le témoin), français AVEC la police ───────────────────────────────────────────────────────
  await rendre(modele("ar", arD, true), "devis-ar-avec-police.pdf", true);
  await rendre(modele("ar", arD, false), "devis-ar-temoin-sans-police.pdf", false);
  await rendre(modele("fr", donnees("fr"), true), "devis-fr-avec-police.pdf", false);
  writeFileSync(resolve(SORTIE, "processus.txt"), journalProcessus.join("\n") + "\n", "utf-8");
});
