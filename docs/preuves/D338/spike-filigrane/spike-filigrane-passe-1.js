// PIÈCE D338 — PASSE 1 DU SPIKE DU FILIGRANE, CONSERVÉE TELLE QU'ELLE A ÉTÉ JOUÉE (seul le chemin de la racine a été rendu relatif).
// ⚠ SON EXTRACTEUR EST DÉFECTUEUX : le motif de couleur exigeait « 0.1215… » alors que Chromium écrit « .1216 .498 .7882 rg » (SANS « 0 » devant la virgule).
// Il a rendu ZÉRO partout, y compris sur le cas qui porte le filigrane : un zéro sur un extracteur non calibré (D275, D290). Voir calibrage-couleurs.js et spike-filigrane.js.
// SPIKE JETABLE (hors dépôt) — le filigrane `position: fixed` se répète-t-il sur CHAQUE page du PDF rendu par le moteur du dépôt ?
// Il utilise le code COMPILÉ du dépôt (apps/api/dist : le modèle de document et l'adaptateur Playwright), un document de plusieurs pages,
// et un filigrane inséré dans le HTML avant </body>. Mesure : pages (/Type /Page) et, par flux de contenu décompressé, le nombre de fois
// où la couleur UNIQUE du filigrane est posée (opérateur `rg`). Rien n'est écrit dans le dépôt.
const API = (process.env.ZWADJ_ROOT || process.cwd()) + "/apps/api"; // depuis la RACINE du dépôt
const zlib = require("zlib");
const { buildQuoteDocumentHtml } = require(API + "/dist/documents/quote-document.js");
const { loadDocumentFontCss } = require(API + "/dist/documents/quote-document-fonts.js");
const { PlaywrightPdfRenderer } = require(API + "/dist/documents/playwright-pdf.renderer.js");

function record(nLignes) {
  return {
    id: "00000000-0000-0000-0000-000000000001",
    reference: "DEVIS-2026-0001-0089 v1",
    version: 1, latestVersion: 1, status: "DRAFT", eventDate: "2026-12-04", guests: 300,
    basePriceCents: 18_900_000, servicesTotalCents: 4_000_000 * 0 + nLignes * 100_000, totalCents: 18_900_000 + nLignes * 100_000, depositCents: 5_000_000,
    lines: Array.from({ length: nLignes }, (_, i) => ({
      nameFr: `Prestation numéro ${i + 1}`, nameAr: `خدمة رقم ${i + 1}`, pricingType: "FIXED", quantity: 1,
      tierLabelFr: null, tierLabelAr: null, lineTotalCents: 100_000
    })),
    venue: { nameFr: "Salle Les Jasmins", nameAr: "قاعة الياسمين" },
    slot: { nameFr: "Soirée", nameAr: "سهرة", startMinutes: 1200, endMinutes: 1560 },
    clientNameAr: null, clientNameLatin: null
  };
}

const COULEUR_UNIQUE = "rgb(31, 127, 201)"; // 31/255 = 0,12157 ; 127/255 = 0,49804 ; 201/255 = 0,78824
const MOTIF_RG = /0\.1215\d* 0\.498\d* 0\.788\d* rg/g;

function filigrane(texte, rtl) {
  return `<div style="position:fixed; inset-inline:0; top:42%; text-align:center; font-size:84pt; font-weight:700; color:${COULEUR_UNIQUE}; opacity:0.18; transform:rotate(-28deg); pointer-events:none; z-index:9999">${texte}</div>`;
}

function mesurer(pdf) {
  const s = pdf.toString("latin1");
  const pages = (s.match(/\/Type\s*\/Page(?!s)/g) || []).length;
  const flux = [];
  let i = 0;
  while (true) {
    const a = s.indexOf("stream", i);
    if (a < 0) break;
    const debut = s[a + 6] === "\r" ? a + 8 : a + 7;
    const b = s.indexOf("endstream", debut);
    if (b < 0) break;
    const brut = Buffer.from(s.slice(debut, b), "latin1");
    try {
      const txt = zlib.inflateSync(brut).toString("latin1");
      flux.push(txt);
    } catch (e) { /* flux non compressé ou binaire (police, image) : ignoré */ }
    i = b + 9;
  }
  const parFlux = flux.map((t) => (t.match(MOTIF_RG) || []).length).filter((n) => n > 0);
  return { octets: pdf.length, pages, fluxDecompresses: flux.length, fluxAvecLaCouleurDuFiligrane: parFlux.length, occurrencesParFlux: parFlux };
}

(async () => {
  const renderer = new PlaywrightPdfRenderer();
  for (const [locale, nLignes, avec] of [["fr", 70, true], ["ar", 70, true], ["fr", 70, false], ["fr", 3, true]]) {
    const base = buildQuoteDocumentHtml({ record: record(nLignes), locale, issuedOn: "2026-10-27", fontCss: loadDocumentFontCss() });
    const html = avec ? base.replace("</body>", filigrane(locale === "ar" ? "مسودة" : "BROUILLON", locale === "ar") + "</body>") : base;
    const t0 = Date.now();
    const pdf = await renderer.render(html);
    const m = mesurer(pdf);
    console.log(JSON.stringify({ locale, lignes: nLignes, filigrane: avec, ms: Date.now() - t0, ...m }));
  }
})().catch((e) => { console.error("ECHEC", e); process.exit(1); });
