/**
 * D327 — RANG 34, RELEVÉ n° 1 : LIRE LES PDF AVEC UN SECOND LECTEUR INDÉPENDANT — pages rastérisées ET positions des textes (pièce versée ; lot DOCUMENTAIRE, aucun code du dépôt n'est touché).
 *
 * POURQUOI CET OUTIL : le PDF est l'ARTEFACT ; le lire par le moteur qui l'a écrit (Skia / Chromium) validerait le rendu par lui-même. `pdf.js` (Mozilla, Apache-2.0, 4.10.38, installée HORS du dépôt,
 * dans le scratchpad) est un lecteur INDÉPENDANT, comme à D326 (`docs/preuves/D326/arabe/rasteriser.mjs`, dont ceci reprend le montage : un petit serveur local, le navigateur sert de TOILE).
 * CE QUI S'AJOUTE à l'outil de D326 : les POSITIONS des textes. Le `pdftotext` du poste est un Xpdf 4.00 — SANS `-bbox` ni `-bbox-layout` (mesuré : `pdftotext -h`, et le « poppler 4.00 » de D326 est une
 * erreur de nom : la bannière de l'outil dit « Glyph & Cog », c'est Xpdf) ; `pdf.js` rend, par fragment de texte, sa matrice de placement (x, y en points, origine en bas à gauche) — de quoi MESURER un alignement.
 * INSTRUMENTS ÉCARTÉS : `pdftotext -bbox-layout` (absent de cette version) ; lire les images à l'œil (elles sont versées pour le regard de Ko, mais un alignement se lit en nombres).
 *
 * USAGE, depuis la racine :  node docs/preuves/D327/releve/pdf/lire-pdf.mjs <dossier pdfjs-dist> <dossier de sortie> <fichier.pdf>…
 * Écrit, par PDF : `<nom>-p<n>.png` (1,6 × : 952×1348 px pour une A4) et `<nom>.positions.json` ({pages: [{n, largeur, hauteur, items: [{str, x, yHaut, w}]}]}, `yHaut` mesuré depuis le HAUT de la page).
 *
 * CALIBRATION, deux bras, ABANDON si un seul manque (D286) : (1) pixels — une page VIDE rend ZÉRO pixel non blanc (négatif), un PDF réel en rend plusieurs milliers (positif) ; (2) positions — la page VIDE
 * rend ZÉRO fragment de texte (négatif), un PDF réel en rend plusieurs (positif). Chaque image s'imprime avec la TAILLE de sa toile et le NOMBRE de pixels non blancs parcourus (D290).
 */
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";

const [, , pdfjsDir, sortieDir, ...pdfs] = process.argv;
if (!pdfjsDir || !sortieDir || pdfs.length === 0) {
  console.error("usage : node lire-pdf.mjs <dossier pdfjs-dist> <dossier de sortie> <fichier.pdf>…");
  process.exit(2);
}
const require_ = createRequire(resolve(process.cwd(), "e2e/package.json"));
const { chromium } = require_("@playwright/test");

const PAGE = `<!doctype html><meta charset="utf-8"><body>
<script type="module">
import * as pdfjs from "/pdfjs/build/pdf.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/build/pdf.worker.mjs";
window.lire = async (url, echelle) => {
  const doc = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
  const sortie = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const base = page.getViewport({ scale: 1 });
    const vp = page.getViewport({ scale: echelle });
    const c = document.createElement("canvas");
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonBlancs = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) nonBlancs++;
    const texte = await page.getTextContent();
    const items = texte.items.filter((it) => it.str !== "").map((it) => ({ str: it.str, x: it.transform[4], yHaut: base.height - it.transform[5], w: it.width }));
    sortie.push({ n, largeur: base.width, hauteur: base.height, canevasL: c.width, canevasH: c.height, nonBlancs, items, png: c.toDataURL("image/png") });
  }
  return sortie;
};
window.pret = true;
</script></body>`;

const BLANC = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n",
  "latin1"
);

const tenus = new Map();
const serveur = createServer((req, res) => {
  const chemin = decodeURIComponent((req.url ?? "/").split("?")[0]);
  if (chemin === "/") { res.writeHead(200, { "content-type": "text/html; charset=utf-8" }); res.end(PAGE); return; }
  if (chemin.startsWith("/pdfjs/")) {
    try {
      const octets = readFileSync(resolve(pdfjsDir, chemin.slice("/pdfjs/".length)));
      res.writeHead(200, { "content-type": chemin.endsWith(".mjs") ? "text/javascript" : "application/octet-stream" });
      res.end(octets);
    } catch { res.writeHead(404); res.end(); }
    return;
  }
  const octets = tenus.get(chemin);
  if (octets) { res.writeHead(200, { "content-type": "application/pdf" }); res.end(octets); return; }
  res.writeHead(404); res.end();
});
await new Promise((ok) => serveur.listen(0, "127.0.0.1", ok));
const port = serveur.address().port;

mkdirSync(sortieDir, { recursive: true });
const browser = await chromium.launch();
let code = 0;
try {
  const page = await (await browser.newContext()).newPage();
  await page.goto(`http://127.0.0.1:${port}/`);
  await page.waitForFunction(() => window.pret === true, null, { timeout: 30_000 });

  // ── Calibration ──
  tenus.set("/blanc.pdf", BLANC);
  tenus.set("/vrai.pdf", readFileSync(pdfs[0]));
  const blanc = await page.evaluate(([u, e]) => window.lire(u, e), ["/blanc.pdf", 2]);
  const vrai = await page.evaluate(([u, e]) => window.lire(u, e), ["/vrai.pdf", 2]);
  const cal = [
    ["pixels, négatif : page VIDE → zéro pixel non blanc", blanc[0].nonBlancs === 0, `${blanc[0].canevasL}×${blanc[0].canevasH}, ${blanc[0].nonBlancs} non blancs`],
    ["pixels, positif : PDF réel → des milliers de pixels non blancs", vrai[0].nonBlancs > 2000, `${vrai[0].canevasL}×${vrai[0].canevasH}, ${vrai[0].nonBlancs} non blancs`],
    ["positions, négatif : page VIDE → zéro fragment de texte", blanc[0].items.length === 0, `${blanc[0].items.length} fragment(s)`],
    ["positions, positif : PDF réel → plusieurs fragments de texte", vrai[0].items.length >= 8, `${vrai[0].items.length} fragment(s)`]
  ];
  for (const [nom, ok, detail] of cal) console.log(`   ${ok ? "✓" : "✗"} ${nom} — ${detail}`);
  if (!cal.every(([, ok]) => ok)) { console.log("CALIBRATION : un bras manqué — l'outil ne rend rien"); process.exit(2); }
  console.log(`== calibration : ${cal.length} bras, 0 manqué\n`);

  // ── Les pages et les positions ──
  for (const f of pdfs) {
    const nom = basename(f, ".pdf");
    tenus.set(`/${nom}.pdf`, readFileSync(f));
    const pages = await page.evaluate(([u, e]) => window.lire(u, e), [`/${nom}.pdf`, 1.6]);
    for (const p of pages) {
      const sortie = resolve(sortieDir, `${nom}-p${p.n}.png`);
      writeFileSync(sortie, Buffer.from(p.png.split(",")[1], "base64"));
      console.log(`${nom}-p${p.n}.png — ${p.canevasL}×${p.canevasH} px · ${p.nonBlancs} pixels non blancs parcourus sur ${p.canevasL * p.canevasH} · ${p.items.length} fragments de texte`);
    }
    writeFileSync(
      resolve(sortieDir, `${nom}.positions.json`),
      JSON.stringify({ pages: pages.map((p) => ({ n: p.n, largeur: p.largeur, hauteur: p.hauteur, items: p.items })) }, null, 1),
      "utf-8"
    );
  }
} catch (e) {
  console.error(e);
  code = 1;
} finally {
  await browser.close();
  serveur.close();
}
process.exit(code);
