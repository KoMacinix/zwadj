// D325 — SONDE D265 (version 2) : un `execFileSync` qui bloque la boucle d'un client plus longtemps que le `keepAliveTimeout` du serveur fait-il échouer, en quelques ms,
// le PREMIER `fetch` suivant, par la chaîne « fetch failed ← ECONNRESET » ? (pièce jetable, versée ; ce n'est PAS l'enquête de D265, qui est un lot à part — c'est un montage.)
//
// ⚠ DÉFAUT DE LA VERSION 1, GARDÉ COMME PIÈCE (D298) : le serveur vivait dans le MÊME processus que le client. Le `execFileSync` bloquait donc AUSSI la boucle du serveur,
// dont la minuterie de fermeture keep-alive ne pouvait pas partir : le bras positif rendait « succès » 5 fois sur 5 — le défaut de l'INSTRUMENT, pas la réponse. L'API réelle
// (`nest start`) est un processus SÉPARÉ du worker Playwright : ici aussi.
//
// Montage : un serveur `node:http` aux réglages par défaut (keepAliveTimeout = 5 000 ms) dans SON processus ; un client `fetch` global (undici) dans un processus NEUF par essai :
//   1. premier appel (une socket keep-alive entre dans le pool du client),
//   2. blocage de SA boucle par un `execFileSync` de <blocage> ms — comme `seedReferentials()` —,
//   3. nouvel appel POST (le premier après le blocage) : chaîne des causes et durée.
// BRAS : NÉGATIF 1 — aucun blocage ; NÉGATIF 2 — blocage 3 000 ms (< 5 000) ; POSITIF — blocage 6 500 ms (> 5 000). Attendu : seul le positif échoue.
// ⚠ La CALIBRATION se lit avant la conclusion : si un bras négatif échoue, ou si le positif ne rend pas la chaîne documentée par D322 (« fetch failed » ← « ECONNRESET »),
// le montage ne reproduit pas le défaut documenté et NE CONCLUT PAS.
import http from "node:http";
import { execFileSync, spawn, spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";

const mode = process.argv[2];
const script = fileURLToPath(import.meta.url);

if (mode === "serveur") {
  const serveur = http.createServer((req, res) => {
    req.resume();
    req.on("end", () => res.end("ok"));
  });
  serveur.listen(0, "127.0.0.1", () => console.log(`PORT ${serveur.address().port} keepAliveTimeout=${serveur.keepAliveTimeout}`));
} else if (mode === "client") {
  const port = process.argv[3];
  const blocage = Number(process.argv[4]);
  const url = `http://127.0.0.1:${port}/auth/register`;
  const appel = async () => (await fetch(url, { method: "POST", body: "{}", headers: { "content-type": "application/json" } })).text();
  await appel();
  if (blocage > 0) execFileSync(process.execPath, ["-e", `setTimeout(() => {}, ${blocage})`]);
  const debut = Date.now();
  let resultat;
  try {
    await appel();
    resultat = { issue: "succès", ms: Date.now() - debut };
  } catch (erreur) {
    const causes = [];
    for (let c = erreur; c; c = c.cause) causes.push(`${c.name}: ${c.message}${c.code ? ` [${c.code}]` : ""}`);
    resultat = { issue: "échec", ms: Date.now() - debut, causes };
  }
  console.log(JSON.stringify(resultat));
  process.exit(0);
} else {
  const ESSAIS = Number(process.argv[2] ?? "5");
  const enfant = spawn(process.execPath, [script, "serveur"], { stdio: ["ignore", "pipe", "inherit"] });
  const ligne = await new Promise((resolve) => enfant.stdout.once("data", (d) => resolve(String(d).trim())));
  const port = /PORT (\d+)/.exec(ligne)?.[1];
  console.log(`node ${process.version} · serveur dans SON processus (${ligne}) · ${ESSAIS} essais par bras, un processus client neuf chacun`);
  const bras = [
    ["NÉGATIF 1 — aucun blocage", 0],
    ["NÉGATIF 2 — blocage 3 000 ms (< keepAliveTimeout 5 000)", 3000],
    ["POSITIF — blocage 6 500 ms (> keepAliveTimeout 5 000)", 6500]
  ];
  for (const [nom, ms] of bras) {
    const issues = [];
    for (let i = 0; i < ESSAIS; i++) {
      const r = spawnSync(process.execPath, [script, "client", port, String(ms)], { encoding: "utf8" });
      const derniere = (r.stdout ?? "").trim().split("\n").pop() ?? "";
      try {
        issues.push(JSON.parse(derniere));
      } catch {
        issues.push({ issue: "SORTIE ILLISIBLE", brut: derniere, erreur: (r.stderr ?? "").slice(0, 200) });
      }
    }
    const echecs = issues.filter((x) => x.issue === "échec");
    const succes = issues.filter((x) => x.issue === "succès");
    console.log(`\n■ ${nom}\n  essais lus : ${issues.length} (attendu ${ESSAIS}) · échecs : ${echecs.length} · succès : ${succes.length} · illisibles : ${issues.filter((x) => x.issue === "SORTIE ILLISIBLE").length} (attendu 0)`);
    for (const e of echecs) console.log(`  échec après ${e.ms} ms : ${e.causes.join(" ← ")}`);
    if (succes.length) console.log(`  succès : de ${Math.min(...succes.map((x) => x.ms))} à ${Math.max(...succes.map((x) => x.ms))} ms`);
  }
  enfant.kill();
}
