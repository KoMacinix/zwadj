// PIÈCE D338 — LE SPIKE DU FILIGRANE (extracteur réparé et calibré par calibrage-couleurs.js). Hors dépôt de production : il utilise le code COMPILÉ (apps/api/dist), n'écrit rien.
// QUESTION : un élément `position: fixed` se répète-t-il sur CHAQUE page du PDF rendu par le moteur du dépôt ? MESURE : le nombre de fois où la couleur UNIQUE du filigrane est posée,
// comparé au nombre de pages (/Type /Page), sur un PDF de 1, 4 (fr et ar) et 7 pages ; la mutation `absolute` et l'absence de filigrane sont les bras faux.
const API = (process.env.ZWADJ_ROOT || process.cwd()) + "/apps/api"; // depuis la RACINE du dépôt
const zlib = require("zlib");
const { buildQuoteDocumentHtml } = require(API + "/dist/documents/quote-document.js");
const { loadDocumentFontCss } = require(API + "/dist/documents/quote-document-fonts.js");
const { PlaywrightPdfRenderer } = require(API + "/dist/documents/playwright-pdf.renderer.js");
const rec = (n) => ({ id: "x", reference: "DEVIS-2026-0001-0089 v1", version: 1, latestVersion: 1, status: "DRAFT", eventDate: "2026-12-04", guests: 300, basePriceCents: 18900000, servicesTotalCents: n * 100000, totalCents: 18900000 + n * 100000, depositCents: 5000000,
  lines: Array.from({ length: n }, (_, i) => ({ nameFr: "Prestation " + (i + 1), nameAr: "خدمة " + (i + 1), pricingType: "FIXED", quantity: 1, tierLabelFr: null, tierLabelAr: null, lineTotalCents: 100000 })),
  venue: { nameFr: "Salle", nameAr: "قاعة" }, slot: null, clientNameAr: null, clientNameLatin: null });
const MOTIF = /\.1216 \.498 \.7882 rg/g; // calibré par la passe précédente : Chromium écrit « .1216 .498 .7882 rg », SANS « 0 » devant la virgule
function mesure(pdf) {
  const s = pdf.toString("latin1"); let n = 0, i = 0;
  for (;;) { const a = s.indexOf("stream", i); if (a < 0) break; const d = s[a + 6] === "\r" ? a + 8 : a + 7; const b = s.indexOf("endstream", d); if (b < 0) break;
    try { n += (zlib.inflateSync(Buffer.from(s.slice(d, b), "latin1")).toString("latin1").match(MOTIF) || []).length; } catch (e) {} i = b + 9; }
  return { pages: (s.match(/\/Type\s*\/Page(?!s)/g) || []).length, couleurFiligrane: n };
}
const wm = (pos, txt) => `<div style="position:${pos};inset-inline:0;top:42%;text-align:center;font-size:84pt;font-weight:700;color:rgb(31,127,201);opacity:0.18;transform:rotate(-28deg)">${txt}</div>`;
(async () => {
  const r = new PlaywrightPdfRenderer();
  const cas = [["fr", 70, "fixed", "BROUILLON"], ["ar", 70, "fixed", "مسودة"], ["fr", 3, "fixed", "BROUILLON"], ["fr", 150, "fixed", "BROUILLON"], ["fr", 70, "absolute", "BROUILLON (MUTATION : absolute)"], ["fr", 70, null, ""]];
  for (const [loc, n, pos, txt] of cas) {
    const base = buildQuoteDocumentHtml({ record: rec(n), locale: loc, issuedOn: "2026-10-27", fontCss: loadDocumentFontCss() });
    const html = pos === null ? base : base.replace("</body>", wm(pos, txt) + "</body>");
    const m = mesure(await r.render(html));
    console.log(JSON.stringify({ locale: loc, lignes: n, position: pos ?? "(aucun filigrane)", ...m, "couleur==pages": m.couleurFiligrane === m.pages }));
  }
})().catch((e) => { console.error("ECHEC", e); process.exit(1); });
