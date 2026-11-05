// FC-6 (session `front-client`) — RELEVÉ NAVIGATEUR de ce que `ar`, `ar-DZ` (et, en témoins, `fr`, `fr-DZ`) affichent, AVANT tout
// code. Arbitrage de Ko du 04/10/2026, mot pour mot : « Les dates et les nombres en arabe se formatent en ar-DZ. Le catalogue et les
// routes restent ar. Le lot qui le fera relèvera d'abord, dans le navigateur, ce que ar et ar-DZ affichent pour un mois, une date et
// un prix. » Une pièce versée qui sert d'outil ; elle ne lit ni n'écrit rien du dépôt.
//
// USAGE : node <ce fichier> [chemin de sortie]   — Playwright et le Chromium du conteneur (`require("playwright")`), page vide.
// Ce qui est relevé, dans le MOTEUR DU NAVIGATEUR (pas dans Node : leurs données ICU peuvent différer), EXACTEMENT avec les options
// des formateurs des deux applications (relevées dans leurs sources au SHA de départ de FC-6) :
//   jourNum   { day }                                  booking-calendar.ts `dayNumber`
//   dateLong  { weekday, day, month long, year }       booking-calendar.ts `longDate` (le nom accessible d'un jour)
//   jourCourt { weekday: "short" }, jourLong { weekday: "long" }   calendar.ts / pro-calendar.ts `weekdayHeaders`, pricing-rules-editor
//   moisAn    { month long, year }                     calendar.ts / pro-calendar.ts `monthLabel`
//   mois      { month long }                           pricing-rules-editor.tsx `monthNames`
//   jma       { day, month long, year }                walkin-journey.tsx `longDate`
//   dateNum   { day, month, year numériques }          le remplaçant de `toLocaleDateString()` (deux écrans de compte)
//   pdf       { dateStyle: "long" }                    le PDF du devis (apps/api, quote-document.ts) — pour comparaison
//   prix      formatDZD (devise DZD, sans décimale) ; nombre (groupé) ; note (formatRating, deux décimales)
//   semaine   getWeekInfo() — pour montrer que la semaine CLDR de `ar-DZ` (samedi) n'est PAS celle de l'Algérie (D56).
// CALIBRATION (deux bras, en tête de sortie) : `fr` rend « août » pour le mois 8 (bras positif connu) et `ar` ne rend PAS ce texte
// (bras négatif) ; sans cela, rien n'est relevé. ÉGALITÉS imprimées : pour chaque format, `fr` = `fr-DZ` ? et `ar` = `ar-DZ` ?
import { createRequire } from "node:module";
import { writeFileSync } from "node:fs";

// `require` et non `import` : le Playwright du conteneur se résout depuis n'importe quel dossier par `require` (outil hors dépôt).
const { chromium } = createRequire(import.meta.url)("playwright");

const sortie = process.argv[2] ?? "releve-ar-dz.txt";
const navigateur = await chromium.launch();
const page = await navigateur.newPage();
await page.setContent("<!doctype html><title>releve</title>");
const r = await page.evaluate(() => {
  const D = Date.UTC(2027, 7, 15); // dimanche 15 août 2027
  const locales = ["fr", "fr-DZ", "ar", "ar-DZ"];
  const ligne = (loc) => {
    const f = (o, d = D) => new Intl.DateTimeFormat(loc, { timeZone: "UTC", ...o }).format(d);
    const jours = (format) =>
      Array.from({ length: 7 }, (_, i) => new Intl.DateTimeFormat(loc, { weekday: format, timeZone: "UTC" }).format(Date.UTC(2026, 10, 1 + i))).join(" ");
    const mois = Array.from({ length: 12 }, (_, i) => new Intl.DateTimeFormat(loc, { month: "long", timeZone: "UTC" }).format(Date.UTC(2026, i, 1))).join(" ");
    const prix = new Intl.NumberFormat(loc, { style: "currency", currency: "DZD", maximumFractionDigits: 0 }).format(23500000 / 100);
    const nombre = new Intl.NumberFormat(loc).format(1234567);
    const note = new Intl.NumberFormat(loc, { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(4.9);
    let semaine = "—";
    try {
      const w = new Intl.Locale(loc).getWeekInfo?.() ?? new Intl.Locale(loc).weekInfo;
      semaine = JSON.stringify(w);
    } catch (e) {
      semaine = String(e);
    }
    return {
      loc,
      jourNum: f({ day: "numeric" }),
      dateLong: f({ weekday: "long", day: "numeric", month: "long", year: "numeric" }),
      jourCourt: jours("short"),
      jourLong: jours("long"),
      moisAn: f({ month: "long", year: "numeric" }),
      mois,
      jma: f({ day: "numeric", month: "long", year: "numeric" }),
      dateNum: f({ day: "numeric", month: "numeric", year: "numeric" }),
      pdf: f({ dateStyle: "long" }),
      prix,
      nombre,
      note,
      semaine
    };
  };
  return { agent: navigator.userAgent, lignes: locales.map(ligne) };
});
await navigateur.close();

const L = Object.fromEntries(r.lignes.map((l) => [l.loc, l]));
const bras = [
  ["positif : fr nomme le mois 8 « août »", L["fr"].moisAn.startsWith("août")],
  ["négatif : ar ne le nomme pas « août »", !L["ar"].moisAn.startsWith("août")]
];
const CLES = ["jourNum", "dateLong", "jourCourt", "jourLong", "moisAn", "mois", "jma", "dateNum", "pdf", "prix", "nombre", "note", "semaine"];
const out = [`FC-6 — relevé navigateur ar / ar-DZ (témoins fr / fr-DZ) · ${new Date().toISOString()}`, `moteur : ${r.agent}`, ""];
for (const [nom, ok] of bras) out.push(`calibration ${ok ? "✓" : "✗"} ${nom}`);
out.push(`calibration : ${bras.length} bras · ${bras.filter(([, ok]) => !ok).length} manqué(s) (attendu 0)`, "");
if (bras.every(([, ok]) => ok)) {
  for (const l of r.lignes) {
    out.push(`== ${l.loc}`);
    for (const k of CLES) out.push(`   ${k.padEnd(10)} ${l[k]}`);
  }
  out.push("", "ÉGALITÉS, format par format (les octets, pas l'œil) :");
  for (const k of CLES) {
    out.push(`   ${k.padEnd(10)} fr = fr-DZ : ${L["fr"][k] === L["fr-DZ"][k] ? "OUI" : "NON"} · ar = ar-DZ : ${L["ar"][k] === L["ar-DZ"][k] ? "OUI" : "NON"}`);
  }
  const egauxFr = CLES.filter((k) => k !== "prix" && k !== "nombre" && k !== "note" && k !== "semaine" && L["fr"][k] === L["fr-DZ"][k]).length;
  const datesFr = CLES.filter((k) => k !== "prix" && k !== "nombre" && k !== "note" && k !== "semaine").length;
  out.push(`   dates : fr = fr-DZ sur ${egauxFr} format(s) de ${datesFr} examiné(s)`);
}
writeFileSync(sortie, out.join("\n") + "\n");
console.log(out.join("\n"));
