// D321 — relevé EN LECTURE SEULE des adresses de PAGES écrites en dur dans les deux applications (consigne de Ko, rang 29,
// point 3 : « relève les autres adresses de pages écrites en dur dans les deux applications. Ne les corrige pas »).
//
// POURQUOI UN INSTRUMENT : une liste tapée de mémoire est une affirmation (D291). Celui-ci lit l'ARBRE TypeScript des sources
// (hors tests) — chaînes, gabarits, texte JSX ; jamais un commentaire — et ne retient qu'une chaîne qui a la forme d'un
// chemin de page (`/` suivi d'une lettre, sans `/api/`, sans extension de fichier) ; il dit OÙ elle est employée (attribut
// JSX, appel, propriété) pour qu'on la juge au contexte (D275). Il rend ce qu'il a parcouru (D290).
// USAGE, depuis la racine : node docs/preuves/D321/adresses/relever-adresses.mjs > docs/preuves/D321/adresses/releve.txt
// INSTRUMENT ÉCARTÉ : `grep "/[a-z]"` — il prend les commentaires, les imports et les clés de messages.
// CALIBRATION, deux bras : un lien JSX connu et un gabarit sont vus ; un commentaire, un import, une URL d'API et un nom de
// fichier ne le sont pas. Abandon si un bras manque.
import { readdirSync, readFileSync, statSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative } from "node:path";

const RACINE = process.cwd();
const ts = createRequire(join(RACINE, "apps/client/package.json"))("typescript");
const PAGE = /^\/(?!api\/)[a-z\[][a-z0-9\-\[\]\/._]*$/i;
const FICHIER = /\.(svg|png|jpe?g|webp|ico|json|txt|xml|js|css)$/i;
const HORS = /(\.test\.|\.spec\.|[\\/]test-setup\.|[\\/]test-support[\\/])/;

function sources(d) {
  return readdirSync(d).flatMap((n) => {
    const p = join(d, n);
    if (statSync(p).isDirectory()) return sources(p);
    return /\.tsx?$/.test(n) && !HORS.test(p) ? [p] : [];
  });
}

function contexte(n) {
  const p = n.parent;
  if (!p) return "?";
  if (ts.isJsxAttribute(p)) return `attribut ${p.name.getText()}=`;
  if (ts.isPropertyAssignment(p)) return `propriété ${p.name.getText()}:`;
  if (ts.isCallExpression(p)) return `appel ${p.expression.getText().slice(0, 40)}(…)`;
  if (ts.isTemplateSpan(p) || ts.isTemplateExpression(p)) return "gabarit";
  if (ts.isImportDeclaration(p) || ts.isExportDeclaration(p)) return "import";
  if (ts.isJsxExpression(p)) return contexte(p);
  if (ts.isConditionalExpression(p) || ts.isBinaryExpression(p)) return contexte(p);
  return ts.SyntaxKind[p.kind];
}

export function relever(nom, texte) {
  const f = ts.createSourceFile(nom, texte, ts.ScriptTarget.Latest, true, nom.endsWith(".tsx") ? ts.ScriptKind.TSX : ts.ScriptKind.TS);
  const out = [];
  const v = (n) => {
    const estTexte = ts.isStringLiteral(n) || ts.isNoSubstitutionTemplateLiteral(n) || ts.isTemplateHead(n) || ts.isTemplateTail(n);
    if (estTexte) {
      const t = n.text.trim();
      const ctx = contexte(n);
      if (PAGE.test(t) && !FICHIER.test(t) && ctx !== "import") out.push({ ligne: f.getLineAndCharacterOfPosition(n.getStart(f)).line + 1, texte: t, ctx });
    }
    ts.forEachChild(n, v);
  };
  v(f);
  return out;
}

const bras = [
  ["positif : lien JSX", relever("a.tsx", '<Link href="/salles">x</Link>').length, 1],
  ["positif : gabarit", relever("a.ts", "const u = `/salles/${slug}`;").length, 1],
  ["négatif : commentaire", relever("a.ts", '// <Link href="/salles">').length, 0],
  ["négatif : import", relever("a.ts", 'import x from "/salles";').length, 0],
  ["négatif : API et fichier", relever("a.ts", 'f("/api/v1/venues"); g("/logo.svg");').length, 0],
];
let manque = 0;
for (const [nom, m, a] of bras) {
  manque += m !== a;
  console.log(`  calibration ${m === a ? "✓" : "✗"} ${nom} : ${m} (attendu ${a})`);
}
console.log(`  calibration : ${bras.length} bras · ${manque} manqué(s) (attendu 0)`);
if (manque) process.exit(2);

for (const app of ["apps/client/src", "apps/pro/src"]) {
  const fichiers = sources(join(RACINE, app));
  const occ = fichiers.flatMap((p) => relever(p, readFileSync(p, "utf8")).map((o) => ({ ...o, p: relative(RACINE, p).replace(/\\/g, "/") })));
  const parAdresse = new Map();
  for (const o of occ) parAdresse.set(o.texte, [...(parAdresse.get(o.texte) ?? []), o]);
  console.log(`\n== ${app} : ${fichiers.length} fichiers parcourus · ${occ.length} occurrence(s) · ${parAdresse.size} adresse(s) distincte(s)`);
  for (const [adresse, liste] of [...parAdresse].sort((a, b) => b[1].length - a[1].length || a[0].localeCompare(b[0]))) {
    console.log(`  ${String(liste.length).padStart(3)} × ${adresse}`);
    for (const o of liste) console.log(`        ${o.p}:${o.ligne} — ${o.ctx}`);
  }
}
