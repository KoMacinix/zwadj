// PIÈCE D338 — CALIBRAGE DE L'EXTRACTEUR DU SPIKE : liste TOUTES les couleurs posées (opérateurs rg/RG/scn) dans les flux décompressés, avec et sans filigrane.
// C'est la sortie brute qui a montré le format réel (« .1216 .498 .7882 rg ») et que la couleur du filigrane est ABSENTE du PDF sans filigrane (bras faux) et PRÉSENTE dans l'autre (bras vrai).
const API = (process.env.ZWADJ_ROOT || process.cwd()) + "/apps/api"; // depuis la RACINE du dépôt
const zlib = require("zlib");
const { buildQuoteDocumentHtml } = require(API + "/dist/documents/quote-document.js");
const { loadDocumentFontCss } = require(API + "/dist/documents/quote-document-fonts.js");
const { PlaywrightPdfRenderer } = require(API + "/dist/documents/playwright-pdf.renderer.js");
const rec = { id: "x", reference: "DEVIS-2026-0001-0089 v1", version: 1, latestVersion: 1, status: "DRAFT", eventDate: "2026-12-04", guests: 300, basePriceCents: 18900000, servicesTotalCents: 7000000, totalCents: 25900000, depositCents: 5000000,
  lines: Array.from({ length: 70 }, (_, i) => ({ nameFr: "Prestation " + (i + 1), nameAr: "خدمة " + (i + 1), pricingType: "FIXED", quantity: 1, tierLabelFr: null, tierLabelAr: null, lineTotalCents: 100000 })),
  venue: { nameFr: "Salle", nameAr: "قاعة" }, slot: null, clientNameAr: null, clientNameLatin: null };
function flux(pdf) {
  const s = pdf.toString("latin1"); const out = []; let i = 0;
  for (;;) { const a = s.indexOf("stream", i); if (a < 0) break; const d = s[a + 6] === "\r" ? a + 8 : a + 7; const b = s.indexOf("endstream", d); if (b < 0) break;
    try { out.push(zlib.inflateSync(Buffer.from(s.slice(d, b), "latin1")).toString("latin1")); } catch (e) {} i = b + 9; }
  return out;
}
(async () => {
  const r = new PlaywrightPdfRenderer();
  const base = buildQuoteDocumentHtml({ record: rec, locale: "fr", issuedOn: "2026-10-27", fontCss: loadDocumentFontCss() });
  const wm = base.replace("</body>", '<div style="position:fixed;inset-inline:0;top:42%;text-align:center;font-size:84pt;font-weight:700;color:rgb(31,127,201);opacity:0.18;transform:rotate(-28deg)">BROUILLON</div></body>');
  for (const [nom, html] of [["sans", base], ["avec", wm]]) {
    const pdf = await r.render(html); const fl = flux(pdf);
    const ops = {}; for (const t of fl) for (const m of t.matchAll(/([0-9.]+ [0-9.]+ [0-9.]+) (rg|scn|RG|SCN)/g)) { const k = m[1] + " " + m[2]; ops[k] = (ops[k] || 0) + 1; }
    const pages = (pdf.toString("latin1").match(/\/Type\s*\/Page(?!s)/g) || []).length;
    console.log(nom, "octets", pdf.length, "pages", pages, "flux", fl.length);
    console.log("  couleurs posées (opérande → occurrences):", JSON.stringify(ops));
    const gs = fl.reduce((n, t) => n + (t.match(/\/G\d+ gs|\/[A-Za-z0-9]+ gs/g) || []).length, 0);
    console.log("  opérateurs d'état graphique (gs):", gs, "; formes XObject (Do):", fl.reduce((n, t) => n + (t.match(/\/[A-Za-z0-9]+ Do/g) || []).length, 0));
  }
})().catch((e) => { console.error("ECHEC", e); process.exit(1); });
