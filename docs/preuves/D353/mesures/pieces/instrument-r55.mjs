// D353 — R-2 : INSTRUMENT JETABLE de mesure du cache de données de Next sur un BUILD DE PRODUCTION (pièce versée, jamais promue en instrument — D291).
//
// Usage : node instrument-r55.mjs <scenario> <fichier-de-sortie> [--client <dossier-apps-client>]
// Scénarios : calibration | cas-i | cas-ii-500 | cas-ii-arret | cas-iii | cas-iii-bis | fin
//
// CE QU'IL FAIT : pilote lui-même (a) une base JETABLE `zwadj_r55mesure` (DROP/CREATE + migrations + semis, sur le serveur de `zwadj-db` ; JAMAIS la base de
// développement), (b) l'API du dépôt, INCHANGÉE (`node apps/api/dist/main.js`, port 3101), (c) `next start` d'une COPIE du client hors du dépôt, dont les trois
// `revalidate: 3600` ont été ramenés à 20 s (port 3100). Il sonde toutes les 2 s `GET /fr/salles` (ce que la PAGE montre : puces de styles, puces d'équipements,
// communes) ET, au même instant, l'API (`/venue-styles`, `/amenities`, `/wilayas`) : « ce que la page montre » contre « ce que l'API répond ». Chaque acte
// (semer, casser une table, arrêter l'API…) est horodaté dans la même sortie.
// L'API est lancée avec les leviers de test `THROTTLE_*` (comme l'e2e, `playwright.config.ts`) : 3 sondes d'API + les lectures du client dépasseraient 100 requêtes/min.
// Le sondage de PRÊT du client vise `/icon.svg` (statique) : `/fr` ou `/fr/salles` rempliraient le cache de données avant la première visite mesurée.
import { spawn, execFileSync } from "node:child_process";
import { createRequire } from "node:module";
import { appendFileSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const REPO = "C:/Users/benla/Desktop/MyProjct/Zwadj";
const COPIE_CLIENT = (process.argv.includes("--client") ? process.argv[process.argv.indexOf("--client") + 1] : null)
  ?? "C:/Users/benla/AppData/Local/Temp/claude/5acfabb9f267091b/c7c54815-19bf-4908-b4a1-b9a3c863de17/scratchpad/copie-d353/apps/client";
const SCENARIO = process.argv[2];
const SORTIE = process.argv[3];
const require = createRequire(REPO + "/e2e/package.json");
const { Client } = require("pg");

const DBNAME = "zwadj_r55mesure";
const SERVEUR = "postgresql://zwadj:zwadj@localhost:5432";
const DB_URL = `${SERVEUR}/${DBNAME}?schema=public`;
const API = "http://localhost:3101";
const CLIENT = "http://localhost:3100";
const SONDE_MS = 2000;
const THROTTLE = Object.fromEntries(
  ["DEFAULT", "REGISTER", "VERIFY", "RESEND", "LOGIN", "REFRESH", "LOGOUT", "FORGOT", "RESET", "GOOGLE", "CHANGE_PASSWORD", "CHANGE_EMAIL"].map((k) => [`THROTTLE_${k}_LIMIT`, "1000000"])
);

writeFileSync(SORTIE, "", "utf8");
let T0 = Date.now();
const t = () => ((Date.now() - T0) / 1000).toFixed(1).padStart(6);
function log(ligne) {
  const texte = `+${t()}s  ${ligne}`;
  console.log(texte);
  appendFileSync(SORTIE, texte + "\n", "utf8");
}
const dormir = (ms) => new Promise((r) => setTimeout(r, ms));

// ── la base jetable
async function admin(sql) {
  const c = new Client({ connectionString: `${SERVEUR}/postgres` });
  await c.connect();
  try { await c.query(sql); } finally { await c.end(); }
}
async function surBase(sql) {
  const c = new Client({ connectionString: DB_URL });
  await c.connect();
  try { return await c.query(sql); } finally { await c.end(); }
}
function pnpm(args) {
  execFileSync("pnpm", args, { cwd: REPO, env: { ...process.env, DATABASE_URL: DB_URL }, shell: true, stdio: ["ignore", "pipe", "pipe"] });
}
function pnpmAsync(args) {
  // ASYNCHRONE : un `execFileSync` bloque la boucle de CE processus plus longtemps que la fermeture d'une connexion inactive (≈ 6 s côté API) et le premier sondage suivant
  // part sur une connexion morte (`ECONNRESET`) — D265. Mesuré à la première passe de ce scénario (`cas-i-passe-1-instrument-bloquant.txt`).
  return new Promise((resolve, reject) => {
    const p = spawn("pnpm", args, { cwd: REPO, env: { ...process.env, DATABASE_URL: DB_URL }, shell: true, stdio: ["ignore", "pipe", "pipe"] });
    p.on("exit", (c) => (c === 0 ? resolve() : reject(new Error("pnpm " + args.join(" ") + " : code " + c))));
  });
}
async function baseNeuve({ semer }) {
  await admin(`DROP DATABASE IF EXISTS "${DBNAME}" WITH (FORCE)`);
  await admin(`CREATE DATABASE "${DBNAME}"`);
  pnpm(["--filter", "@zwadj/api", "run", "prisma:migrate"]);
  if (semer) pnpm(["--filter", "@zwadj/api", "run", "db:seed"]);
}
const TABLES = ["amenities", "venue_styles", "wilayas"];
async function renommer(vers) {
  for (const tb of TABLES) {
    if (vers === "off") await surBase(`ALTER TABLE ${tb} RENAME TO ${tb}_off`);
    else await surBase(`ALTER TABLE ${tb}_off RENAME TO ${tb}`);
  }
}

// ── les serveurs
function lancer(nom, args, options, journal) {
  const enfant = spawn(process.execPath, args, { ...options, stdio: ["ignore", "pipe", "pipe"] });
  enfant.stdout.on("data", (d) => appendFileSync(journal, d));
  enfant.stderr.on("data", (d) => appendFileSync(journal, d));
  enfant.sortie = new Promise((r) => enfant.on("exit", r));
  return enfant;
}
async function attendre(url, ms) {
  const fin = Date.now() + ms;
  while (Date.now() < fin) {
    try { if ((await fetch(url)).status < 400) return true; } catch { /* pas encore */ }
    await dormir(500);
  }
  return false;
}
const media = mkdtempSync(join(tmpdir(), "zwadj-media-r55-"));
let api = null;
let client = null;
async function demarrerApi() {
  api = lancer("api", ["dist/main.js"], {
    cwd: `${REPO}/apps/api`,
    env: { ...process.env, ...THROTTLE, DATABASE_URL: DB_URL, PORT: "3101", CORS_ORIGINS: CLIENT, CLIENT_URL: CLIENT, PRO_URL: "http://localhost:5273", MEDIA_DISK_ROOT: media }
  }, join(tmpdir(), "r55-api.log"));
  const pret = await attendre(`${API}/api/v1/health`, 90_000);
  log(pret ? "API prête (health 200)" : "✗ API NON PRÊTE après 90 s");
  if (!pret) throw new Error("API non prête");
}
async function arreterApi() {
  if (!api) return;
  api.kill();
  await api.sortie;
  api = null;
  log("API arrêtée (processus terminé)");
}
async function demarrerClient() {
  rmSync(`${COPIE_CLIENT}/.next/cache/fetch-cache`, { recursive: true, force: true });
  // CLIENT_MODE=dev : le VRAI serveur de développement du dépôt (celui de l'e2e, `next dev`, revalidate: 3600 réel) au lieu de `next start` de la copie.
  const dev = process.env.CLIENT_MODE === "dev";
  client = lancer("client", [`${COPIE_CLIENT}/node_modules/next/dist/bin/next`, dev ? "dev" : "start", "-p", "3100"], {
    cwd: COPIE_CLIENT,
    env: dev ? { ...process.env, NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_PRO_URL: "http://localhost:5273" } : { ...process.env, NODE_ENV: "production", NEXT_PUBLIC_API_URL: API, NEXT_PUBLIC_SITE_URL: CLIENT }
  }, join(tmpdir(), "r55-client.log"));
  log(dev ? "mode : next DEV (serveur de développement du dépôt)" : "mode : next START (build de production de la copie)");
  const pret = await attendre(`${CLIENT}/icon.svg`, 90_000);
  log(pret ? "client prêt (`next start`, cache de données de la copie purgé, `/icon.svg` 200)" : "✗ CLIENT NON PRÊT après 90 s");
  if (!pret) throw new Error("client non prêt");
}
async function arreterTout() {
  if (client) { client.kill(); await client.sortie; client = null; }
  await arreterApi();
}

// ── ce que la PAGE montre, et ce que l'API répond au même instant
function lirePage(html) {
  const compte = (re) => (html.match(re) ?? []).length;
  const i = html.indexOf('id="f-city"');
  const j = i < 0 ? -1 : html.indexOf("</select>", i);
  const select = i < 0 || j < 0 ? "" : html.slice(i, j);
  return {
    styles: compte(/name="styles"/g),
    amenities: compte(/name="amenities"/g),
    communes: (select.match(/<option value="[^"]+"/g) ?? []).length
  };
}
async function sondePage(entetes = {}) {
  const debut = Date.now();
  try {
    const res = await fetch(`${CLIENT}/fr/salles`, { headers: entetes });
    const html = await res.text();
    const p = lirePage(html);
    return { texte: `page[HTTP ${res.status} styles=${p.styles} amenities=${p.amenities} communes=${p.communes} · ${((Date.now() - debut) / 1000).toFixed(2)}s]`, ...p, http: res.status };
  } catch (e) {
    return { texte: `page[ERREUR ${e.cause?.code ?? e.message}]`, styles: -1, amenities: -1, communes: -1, http: 0 };
  }
}
async function sondeApi() {
  const lire = async (chemin, f) => {
    try {
      const res = await fetch(`${API}/api/v1/${chemin}`);
      if (!res.ok) return `HTTP${res.status}`;
      return String(f(await res.json()));
    } catch (e) { return `ERR(${e.cause?.code ?? "?"})`; }
  };
  const [s, a, w] = await Promise.all([
    lire("venue-styles", (j) => j.length),
    lire("amenities", (j) => j.length),
    lire("wilayas", (j) => j.reduce((n, x) => n + x.cities.length, 0))
  ]);
  return { texte: `api[styles=${s} amenities=${a} communes=${w}]`, s, a, w };
}
async function sonder(secondes, etiquette = "") {
  const fin = Date.now() + secondes * 1000;
  const lignes = [];
  while (Date.now() < fin) {
    const [p, q] = await Promise.all([sondePage(), sondeApi()]);
    log(`${p.texte}  ${q.texte}${etiquette ? "  " + etiquette : ""}`);
    lignes.push({ p, q, tt: (Date.now() - T0) / 1000 });
    await dormir(SONDE_MS);
  }
  return lignes;
}
const acte = (texte) => log(`>>> ACTE : ${texte}`);

// ── les scénarios
async function calibration() {
  log("CALIBRATION — l'instrument doit lire des états DONT LA RÉPONSE EST CONNUE (D275)");
  log("état 1 : base SEMÉE, cache neuf ⇒ la page doit montrer les listes PLEINES (celles de l'API)");
  await baseNeuve({ semer: true });
  await demarrerApi(); await demarrerClient();
  T0 = Date.now();
  const r1 = (await sonder(1))[0];
  const ok1 = r1.p.styles > 0 && r1.p.styles === Number(r1.q.s) && r1.p.amenities === Number(r1.q.a) && r1.p.communes === Number(r1.q.w) && r1.p.communes > 0;
  log(`calibration état 1 : ${ok1 ? "✓" : "✗"} (page = API, listes non vides)`);
  await arreterTout();
  log("état 2 : base MIGRÉE NON SEMÉE, cache neuf ⇒ la page doit montrer ZÉRO partout, comme l'API");
  await baseNeuve({ semer: false });
  await demarrerApi(); await demarrerClient();
  T0 = Date.now();
  const r2 = (await sonder(1))[0];
  const ok2 = r2.p.styles === 0 && r2.p.amenities === 0 && r2.p.communes === 0 && r2.q.s === "0" && r2.q.a === "0" && r2.q.w === "0";
  log(`calibration état 2 : ${ok2 ? "✓" : "✗"} (page = API = zéros)`);
  log(`CALIBRATION : ${ok1 && ok2 ? "RÉUSSIE (2 bras sur 2)" : "✗ MANQUÉE — aucune mesure ne doit être crue"}`);
  return ok1 && ok2;
}
async function casI() {
  log("CAS (i) — l'API rend 200 avec des listes VIDES (base migrée, non semée), PUIS la base est semée");
  await baseNeuve({ semer: false });
  await demarrerApi(); await demarrerClient();
  T0 = Date.now();
  await sonder(4, "(avant le semis)");
  acte("`db:seed` LANCÉ (asynchrone : les sondes continuent) — l'API rendra les listes pleines quand il aura fini");
  const semis = pnpmAsync(["--filter", "@zwadj/api", "run", "db:seed"]);
  const lignes = await sonder(80);
  await semis;
  const apiPleine = lignes.find((l) => Number(l.q.s) > 0 && Number(l.q.a) > 0 && Number(l.q.w) > 0);
  const pagePleine = lignes.find((l) => l.p.styles > 0 && l.p.amenities > 0 && l.p.communes > 0);
  const premiere = lignes[0].tt;
  log(`RÉSULTAT (i) : première visite à +${premiere.toFixed(1)} s ; l'API rend les listes PLEINES depuis +${apiPleine ? apiPleine.tt.toFixed(1) : "jamais"} s ; `
    + (pagePleine
      ? `la page les montre pour la PREMIÈRE fois à +${pagePleine.tt.toFixed(1)} s — soit ${(pagePleine.tt - apiPleine.tt).toFixed(1)} s APRÈS que l'API les rend (fenêtre de la copie : 20 s, comptée depuis la première visite : expire à ≈ +${(premiere + 20).toFixed(1)} s)`
      : "la page n'a JAMAIS montré les listes pleines en 84 s (≥ 4 fenêtres)"));
}
async function casIIcasse(mode) {
  log(`CAS (ii, ${mode}) — une liste PLEINE est déjà gardée ; PUIS l'API ${mode === "500" ? "rend 500 (tables renommées dans la base jetable : l'erreur est réelle)" : "est ARRÊTÉE"} ; la fenêtre expire ; PUIS l'API revient`);
  await baseNeuve({ semer: true });
  await demarrerApi(); await demarrerClient();
  T0 = Date.now();
  await sonder(5, "(listes pleines, première visite à +0 s)");
  if (mode === "500") { acte("tables `amenities`, `venue_styles`, `wilayas` RENOMMÉES : l'API rend 500"); await renommer("off"); }
  else { acte("API ARRÊTÉE"); await arreterApi(); }
  const panne = await sonder(60, "(PANNE)");
  const vide = panne.filter((l) => l.p.styles === 0 || l.p.amenities === 0 || l.p.communes === 0);
  log(`RÉSULTAT (ii, pendant la panne) : ${panne.length} sondes, dont ${vide.length} où la page montre au moins une liste VIDE ${vide.length ? `(la première à +${vide[0].tt.toFixed(1)} s)` : "(aucune : la liste pleine gardée reste affichée)"}`);
  if (mode === "500") { acte("tables RENOMMÉES en retour : l'API revient"); await renommer("on"); }
  else { acte("API REDÉMARRÉE"); await demarrerApi(); }
  const tRetour = (Date.now() - T0) / 1000;
  const apres = await sonder(50, "(APRÈS le retour)");
  const plein = apres.find((l) => l.p.styles > 0 && l.p.amenities > 0 && l.p.communes > 0 && l.q.s !== "?" && Number(l.q.s) > 0 && Number(l.q.a) > 0);
  log(plein ? `RÉSULTAT (ii, après le retour) : la page montre les listes pleines à +${plein.tt.toFixed(1)} s (${(plein.tt - tRetour).toFixed(1)} s après le retour de l'API)` : "RÉSULTAT (ii, après le retour) : la page n'a PAS retrouvé les listes pleines en 50 s");
}
async function casIII(mode) {
  log(`CAS (iii${mode === "500" ? "-bis" : ""}) — la PREMIÈRE visite se fait ${mode === "500" ? "API qui rend 500" : "API ARRÊTÉE"} ; PUIS l'API revient`);
  await baseNeuve({ semer: true });
  if (mode === "500") { await demarrerApi(); await renommer("off"); await demarrerClient(); }
  else { await demarrerClient(); }
  T0 = Date.now();
  await sonder(8, mode === "500" ? "(API en 500)" : "(API arrêtée)");
  if (mode === "500") { acte("tables RENOMMÉES en retour : l'API revient"); await renommer("on"); }
  else { acte("API DÉMARRÉE"); await demarrerApi(); }
  const tRetour = (Date.now() - T0) / 1000;
  const apres = await sonder(60, "(APRÈS le retour)");
  const plein = apres.find((l) => l.p.styles > 0 && l.p.amenities > 0 && l.p.communes > 0);
  log(plein ? `RÉSULTAT (iii${mode === "500" ? "-bis" : ""}) : la page montre les listes pleines à +${plein.tt.toFixed(1)} s, soit ${(plein.tt - tRetour).toFixed(1)} s après le retour de l'API` : `RÉSULTAT (iii) : la page n'a JAMAIS montré les listes pleines en 60 s`);
}

async function casReload() {
  log("CAS « rechargement » — un cache EMPOISONNÉ (listes vides gardées) est-il rafraîchi par une requête portant `Cache-Control: no-cache` (ce qu'envoie un rechargement du navigateur) ?");
  await baseNeuve({ semer: false });
  await demarrerApi(); await demarrerClient();
  T0 = Date.now();
  await sonder(2, "(avant le semis : le cache se remplit de listes VIDES)");
  acte("`db:seed` LANCÉ (asynchrone)");
  const semis = pnpmAsync(["--filter", "@zwadj/api", "run", "db:seed"]);
  await sonder(14, "(requêtes SIMPLES, sans en-tête)");
  await semis;
  acte("une requête portant `Cache-Control: no-cache` + `Pragma: no-cache` (comme un rechargement du navigateur)");
  const [p, q] = await Promise.all([sondePage({ "cache-control": "no-cache", pragma: "no-cache" }), sondeApi()]);
  log(`${p.texte}  ${q.texte}  (requête AVEC no-cache)`);
  await sonder(8, "(requêtes SIMPLES, APRÈS la requête no-cache)");
}

let code = 0;
try {
  log(`scénario « ${SCENARIO} » — fenêtre de la copie : 20 s ; sonde toutes les ${SONDE_MS / 1000} s ; Node ${process.version}`);
  if (SCENARIO === "calibration") { if (!(await calibration())) code = 1; }
  else if (SCENARIO === "cas-i") await casI();
  else if (SCENARIO === "cas-reload") await casReload();
  else if (SCENARIO === "cas-ii-500") await casIIcasse("500");
  else if (SCENARIO === "cas-ii-arret") await casIIcasse("arret");
  else if (SCENARIO === "cas-iii") await casIII("arret");
  else if (SCENARIO === "cas-iii-bis") await casIII("500");
  else if (SCENARIO === "fin") { await admin(`DROP DATABASE IF EXISTS "${DBNAME}" WITH (FORCE)`); log(`base jetable ${DBNAME} SUPPRIMÉE`); }
  else { log(`scénario inconnu : ${SCENARIO}`); code = 2; }
} catch (e) {
  log(`✗ ERREUR : ${e.stack ?? e}`);
  code = 2;
} finally {
  await arreterTout();
  rmSync(media, { recursive: true, force: true });
}
process.exit(code);
