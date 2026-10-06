/**
 * D326 — RASTÉRISATION DES PAGES D'UN PDF EN IMAGES (critère (b) de la décision 2 : « les pages rastérisées en images sont versées et envoyées à Ko, qui les regarde »).
 *
 * POURQUOI CET OUTIL ET PAS LE VISIONNEUR DE CHROMIUM : le PDF est l'ARTEFACT ; le rastériser par le moteur qui l'a écrit (Skia) validerait le rendu par lui-même. `pdf.js` (Mozilla, Apache-2.0,
 * version 4.10.38, installée HORS du dépôt, dans le scratchpad) est un second lecteur INDÉPENDANT : il lit la table des polices embarquées et trace les glyphes lui-même.
 * INSTRUMENTS ÉCARTÉS : `pdftoppm`/`mutool`/`gs` — absents du poste ; `Windows.Data.Pdf` (WinRT) — fiable mais lourd à appeler depuis PowerShell 5.1 et propre à Windows.
 *
 * USAGE, depuis la racine :  node docs/preuves/D326/arabe/rasteriser.mjs <dossier de pdf.js> <dossier de sortie> <fichier.pdf>…
 * (le dossier de pdf.js est `node_modules/pdfjs-dist` de l'installation hors dépôt). Un petit serveur HTTP local sert pdf.js et le PDF à une page : un module ES ne se charge pas depuis `file://`.
 * Le navigateur sert ici de TOILE (le JavaScript y est nécessaire à pdf.js) ; ce n'est PAS la page de rendu du PDF, dont le JavaScript est coupé.
 *
 * CALIBRATION, deux bras, ABANDON si un seul manque : un PDF construit à la main dont la page est VIDE doit rendre ZÉRO pixel non blanc (négatif) ; le PDF de la preuve en rend plusieurs milliers (positif).
 * Il imprime, à côté de chaque image, la TAILLE de la toile et le NOMBRE de pixels non blancs qu'il a parcourus (D290).
 */
import { createServer } from "node:http";
import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { basename, resolve } from "node:path";

const [, , pdfjsDir, sortieDir, ...pdfs] = process.argv;
if (!pdfjsDir || !sortieDir || pdfs.length === 0) {
  console.error("usage : node rasteriser.mjs <dossier pdfjs-dist> <dossier de sortie> <fichier.pdf>…");
  process.exit(2);
}
const require_ = createRequire(resolve(process.cwd(), "e2e/package.json"));
const { chromium } = require_("@playwright/test");

const PAGE = `<!doctype html><meta charset="utf-8"><body>
<script type="module">
import * as pdfjs from "/pdfjs/build/pdf.mjs";
pdfjs.GlobalWorkerOptions.workerSrc = "/pdfjs/build/pdf.worker.mjs";
window.rasteriser = async (url, echelle) => {
  const doc = await pdfjs.getDocument({ url, isEvalSupported: false }).promise;
  const sortie = [];
  for (let n = 1; n <= doc.numPages; n++) {
    const page = await doc.getPage(n);
    const vp = page.getViewport({ scale: echelle });
    const c = document.createElement("canvas");
    c.width = Math.ceil(vp.width); c.height = Math.ceil(vp.height);
    const ctx = c.getContext("2d");
    ctx.fillStyle = "#fff"; ctx.fillRect(0, 0, c.width, c.height);
    await page.render({ canvasContext: ctx, viewport: vp }).promise;
    const d = ctx.getImageData(0, 0, c.width, c.height).data;
    let nonBlancs = 0;
    for (let i = 0; i < d.length; i += 4) if (d[i] < 250 || d[i + 1] < 250 || d[i + 2] < 250) nonBlancs++;
    sortie.push({ n, largeur: c.width, hauteur: c.height, nonBlancs, png: c.toDataURL("image/png") });
  }
  return sortie;
};
window.pret = true;
</script></body>`;

const BLANC = Buffer.from(
  "%PDF-1.4\n1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj\n2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj\n3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 200 100]>>endobj\ntrailer<</Root 1 0 R/Size 4>>\n%%EOF\n",
  "latin1"
);

const tenus = new Map(); // chemin servi → octets
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
  const blanc = await page.evaluate(([u, e]) => window.rasteriser(u, e), ["/blanc.pdf", 2]);
  const vrai = await page.evaluate(([u, e]) => window.rasteriser(u, e), ["/vrai.pdf", 2]);
  const cal = [
    ["page VIDE : zéro pixel non blanc (négatif)", blanc[0].nonBlancs === 0, `${blanc[0].largeur}×${blanc[0].hauteur}, ${blanc[0].nonBlancs} non blancs`],
    ["PDF de la preuve : des milliers de pixels non blancs (positif)", vrai[0].nonBlancs > 2000, `${vrai[0].largeur}×${vrai[0].hauteur}, ${vrai[0].nonBlancs} non blancs`]
  ];
  for (const [nom, ok, detail] of cal) console.log(`   ${ok ? "✓" : "✗"} ${nom} — ${detail}`);
  if (!cal.every(([, ok]) => ok)) { console.log("CALIBRATION : un bras manqué — l'outil ne rend rien"); process.exit(2); }
  console.log(`== calibration : ${cal.length} bras, 0 manqué\n`);

  // ── Les pages ──
  for (const f of pdfs) {
    const nom = basename(f, ".pdf");
    tenus.set(`/${nom}.pdf`, readFileSync(f));
    const pages = await page.evaluate(([u, e]) => window.rasteriser(u, e), [`/${nom}.pdf`, 1.6]);
    for (const p of pages) {
      const sortie = resolve(sortieDir, `${nom}-p${p.n}.png`);
      writeFileSync(sortie, Buffer.from(p.png.split(",")[1], "base64"));
      console.log(`${sortie} — ${p.largeur}×${p.hauteur} px · ${p.nonBlancs} pixels non blancs parcourus sur ${p.largeur * p.hauteur}`);
    }
  }
} catch (e) {
  console.error(e);
  code = 1;
} finally {
  await browser.close();
  serveur.close();
}
process.exit(code);
