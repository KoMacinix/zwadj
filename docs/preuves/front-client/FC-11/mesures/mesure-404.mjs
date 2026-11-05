// FC-11 — mesure du HTML SERVI des pages 404 par un serveur de PRODUCTION (`next start`).
// Usage : node mesure-404.mjs <base, ex. http://localhost:3300>
// Pour chaque URL : statut HTTP, `<html id="__next_error__">` présent ?, `lang`/`dir` de <html>, et le TEXTE VISIBLE du document
// une fois retirés <script>, <style>, <template> et les commentaires (sans quoi une phrase se trouverait dans la charge RSC — leçon
// de la session des 23-24/08). Calibré sur une page témoin (l'accueil, dont le HTML porte du texte) avant les 404.
const base = process.argv[2];
if (!base) { console.error("usage : node mesure-404.mjs <base>"); process.exit(2); }

const CAS = [
  ["témoin : l'accueil FR (doit porter du texte)", "/fr", 200, null],
  ["404 localisée FR (attrape-tout)", "/fr/nimportequoi", 404, "Cette page n'existe pas"],
  ["404 localisée AR (attrape-tout)", "/ar/nimportequoi", 404, "هذه الصفحة غير موجودة"],
  ["404 localisée FR (fiche inconnue)", "/fr/salles/salle-qui-nexiste-pas", 404, "Cette page n'existe pas"],
  ["404 racine (chemin à point, hors intergiciel)", "/wp-login.php", 404, "Cette page n’existe pas"],
];

function visible(html) {
  return html
    .replace(/<script\b[\s\S]*?<\/script>/gi, " ")
    .replace(/<style\b[\s\S]*?<\/style>/gi, " ")
    .replace(/<template\b[\s\S]*?<\/template>/gi, " ")
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;|&#160;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

let manques = 0;
for (const [nom, chemin, statutAttendu, phrase] of CAS) {
  const r = await fetch(base + chemin, { redirect: "manual" });
  const html = await r.text();
  const ouvrant = (html.match(/<html\b[^>]*>/i) ?? [""])[0];
  const lang = (ouvrant.match(/\blang="([^"]*)"/) ?? [, "∅"])[1];
  const dir = (ouvrant.match(/\bdir="([^"]*)"/) ?? [, "∅"])[1];
  const erreur = /id="__next_error__"/.test(ouvrant);
  const texte = visible(html);
  const h1 = (html.replace(/<script\b[\s\S]*?<\/script>/gi, "").match(/<h1\b[\s\S]*?<\/h1>/i) ?? [""])[0].replace(/<[^>]+>/g, " ").replace(/\s+/g, " ").trim();
  const porte = phrase === null ? null : texte.includes(phrase);
  console.log(`${nom}\n  GET ${chemin} → ${r.status} (attendu ${statutAttendu}) · <html> ${erreur ? "id=__next_error__" : "normal"} · lang=${lang} dir=${dir}`);
  console.log(`  texte visible : ${texte.length} caractère(s) · <h1> servi : ${h1 === "" ? "AUCUN" : JSON.stringify(h1)}${porte === null ? "" : ` · « ${phrase} » ${porte ? "PRÉSENTE" : "ABSENTE"}`}`);
  if (r.status !== statutAttendu) manques += 1;
}
console.log(`\ncas parcourus : ${CAS.length} · statuts inattendus : ${manques} (attendu 0)`);
