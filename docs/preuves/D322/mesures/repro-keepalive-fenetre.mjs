// D322 — suite de `repro-keepalive.mjs` : le bras A (blocage 7 s) n'a PAS reproduit l'échec ; le semis de l'e2e dure, lui,
// 5,2 à 5,4 s (`duree-semis.txt`), au ras du `keepAliveTimeout` de 5 s du serveur. Ce balayage cherche s'il existe une
// FENÊTRE autour de 5 s où le `fetch` qui suit un blocage synchrone réutilise une socket que le serveur ferme au même
// moment. Trois essais par durée, de 4 600 à 5 600 ms par pas de 100 ms ; chaque essai part d'un pool VIDE.
// Pièce versée, pas un instrument promu. Usage, depuis la racine :  node docs/preuves/D322/mesures/repro-keepalive-fenetre.mjs
import { execFileSync, spawn } from "node:child_process";

const PORT = 39_123;
const serveur = spawn(process.execPath, ["-e", `
  const http = require("node:http");
  const s = http.createServer((req, res) => { req.resume(); req.on("end", () => res.end("ok")); });
  s.listen(${PORT}, () => console.log("PRET keepAliveTimeout=" + s.keepAliveTimeout));
`], { stdio: ["ignore", "pipe", "inherit"] });
await new Promise((ok) => serveur.stdout.on("data", (d) => { process.stdout.write(`serveur : ${d}`); ok(); }));

const bloquer = (ms) => execFileSync(process.execPath, ["-e", `const t = Date.now(); while (Date.now() - t < ${ms});`]);
const attendre = (ms) => new Promise((ok) => setTimeout(ok, ms));
async function appel() {
  const t = Date.now();
  try {
    const r = await fetch(`http://127.0.0.1:${PORT}/`, { method: "POST", body: "{}" });
    await r.text();
    return { ok: true, texte: `succès en ${Date.now() - t} ms` };
  } catch (e) {
    const causes = [];
    for (let c = e; c instanceof Error; c = c.cause) causes.push(`${c.name}${c.code ? ` [${c.code}]` : ""}`);
    return { ok: false, texte: `ÉCHEC en ${Date.now() - t} ms — ${causes.join(" ← ")}` };
  }
}

let essais = 0;
let echecs = 0;
for (let ms = 4600; ms <= 5600; ms += 100) {
  const lignes = [];
  for (let k = 0; k < 3; k += 1) {
    await attendre(6500);
    await appel();
    bloquer(ms);
    const r = await appel();
    essais += 1;
    echecs += r.ok ? 0 : 1;
    lignes.push(r.texte);
  }
  console.log(`blocage ${ms} ms : ${lignes.join(" | ")}`);
}
console.log(`node ${process.version} · ${essais} essais parcourus · ${echecs} échec(s)`);
serveur.kill();
