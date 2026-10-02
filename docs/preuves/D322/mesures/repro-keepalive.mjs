// D322 — REPRODUCTION ISOLÉE de l'échec `fetch failed` / `ECONNRESET` vu deux fois sur la spec e2e `r30` dans la suite
// complète (jamais seule). Pièce versée, pas un instrument promu.
//
// HYPOTHÈSE MISE À L'ÉPREUVE : `seedReferentials()` (e2e/fixtures/harness.ts) appelle `execFileSync`, qui BLOQUE la boucle
// d'événements du worker pendant le semis. Si le worker vient d'utiliser le `fetch` global (undici), la connexion gardée
// ouverte (keep-alive) reste dans son pool : son minuteur d'inactivité ne peut pas tourner pendant le blocage, le SERVEUR
// la ferme à son `keepAliveTimeout` (5 s par défaut dans Node), et le premier `fetch` suivant la réutilise morte.
//
// LE SERVEUR VIT DANS UN AUTRE PROCESSUS (comme l'API de l'e2e) : bloquer le client ne bloque pas ses minuteurs.
// QUATRE BRAS, chacun avec sa réponse attendue (D286 : les deux sens) :
//   A · fetch, puis blocage synchrone de 7 s, puis fetch  → attendu ÉCHEC (ECONNRESET / socket fermée)
//   B · fetch, puis attente ASYNCHRONE de 7 s, puis fetch → attendu SUCCÈS (undici expire la socket lui-même)
//   C · fetch, puis blocage synchrone de 1 s, puis fetch  → attendu SUCCÈS (sous le délai du serveur)
//   D · fetch, puis blocage synchrone de 7 s, puis fetch avec `Connection: close` au premier appel → attendu SUCCÈS
// Usage, depuis la racine :  node docs/preuves/D322/mesures/repro-keepalive.mjs
import { execFileSync, spawn } from "node:child_process";

const PORT = 39_122;
const serveur = spawn(process.execPath, ["-e", `
  const http = require("node:http");
  const s = http.createServer((req, res) => { req.resume(); req.on("end", () => res.end("ok")); });
  s.listen(${PORT}, () => console.log("PRET keepAliveTimeout=" + s.keepAliveTimeout));
`], { stdio: ["ignore", "pipe", "inherit"] });
await new Promise((ok) => serveur.stdout.on("data", (d) => { process.stdout.write(`serveur : ${d}`); ok(); }));

const bloquer = (ms) => execFileSync(process.execPath, ["-e", `const t = Date.now(); while (Date.now() - t < ${ms});`]);
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
const url = `http://127.0.0.1:${PORT}/`;

async function appel(entetes = {}) {
  const t = Date.now();
  try {
    const r = await fetch(url, { method: "POST", body: "{}", headers: { "content-type": "application/json", ...entetes } });
    await r.text();
    return `succès ${r.status} en ${Date.now() - t} ms`;
  } catch (e) {
    const causes = [];
    for (let c = e; c instanceof Error; c = c.cause) causes.push(`${c.name}${c.code ? ` [${c.code}]` : ""}: ${c.message}`);
    return `ÉCHEC en ${Date.now() - t} ms — ${causes.join(" ← ")}`;
  }
}

const bras = [
  ["A", "blocage synchrone 7 s", "ÉCHEC", async () => { await appel(); bloquer(7000); return appel(); }],
  ["B", "attente asynchrone 7 s", "succès", async () => { await appel(); await attendre(7000); return appel(); }],
  ["C", "blocage synchrone 1 s", "succès", async () => { await appel(); bloquer(1000); return appel(); }],
  ["D", "blocage 7 s, premier appel en Connection: close", "succès", async () => { await appel({ connection: "close" }); bloquer(7000); return appel(); }]
];
let manques = 0;
for (const [id, quoi, attendu, jouer] of bras) {
  await attendre(6500); // chaque bras part d'un pool VIDE : la socket du bras précédent a expiré des deux côtés
  const r = await jouer();
  const ok = r.startsWith(attendu);
  manques += ok ? 0 : 1;
  console.log(`${ok ? "✓" : "✗"} bras ${id} · ${quoi} : ${r} (attendu ${attendu})`);
}
console.log(`node ${process.version} · ${bras.length} bras · ${manques} manqué(s) (attendu 0)`);
serveur.kill();
process.exit(manques ? 1 : 0);
