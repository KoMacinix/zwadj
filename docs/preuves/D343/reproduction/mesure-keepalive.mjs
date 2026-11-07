// D343 — relève le délai RÉEL après lequel le serveur d'API ferme une connexion HTTP inactive (keep-alive). Pièce versée, jamais promue en instrument (D291).
//
// POURQUOI : R-13 de la consigne exige « le keepAliveTimeout RÉEL du serveur d'API (relevé, jamais supposé) ». L'API ne le fixe nulle part dans son code (`git grep` : 0 ligne) :
// le serveur retombe sur le défaut de Node, et ce défaut n'est ni lu dans la documentation ni déduit d'un en-tête — il se MESURE sur le serveur qui tourne.
// ⚠ L'EN-TÊTE `Keep-Alive: timeout=N` que le serveur envoie dit ce que le serveur ANNONCE, pas quand il ferme : cette pièce relève les deux, côte à côte.
//
// INSTRUMENTS ÉCARTÉS : un client HTTP (`fetch`, `http.get`) — il met une couche entre le serveur et la mesure, et c'est précisément cette couche (son pool de connexions) qui est
// en cause dans D265. Socket TCP BRUTE (`node:net`) : on envoie une requête, on lit la réponse, on chronomètre jusqu'à l'événement `end` (le FIN du serveur).
// CALIBRATION : un serveur dont le délai est connu — voir plus bas, `--calibrer` : un serveur `node:http` auquel on impose `keepAliveTimeout = 2 000` doit être mesuré à ≈ 2 000 ms
// (+ la marge que Node ajoute) ; si l'instrument rend 5 000 ou 0, il ne mesure pas ce qu'il croit mesurer et il abandonne.
//
// Usage : node docs/preuves/D343/reproduction/mesure-keepalive.mjs <hôte> <port> [essais]      (le serveur doit déjà tourner)
//         node docs/preuves/D343/reproduction/mesure-keepalive.mjs --calibrer
import http from "node:http";
import net from "node:net";

function mesurer(hote, port) {
  return new Promise((resolve) => {
    const s = net.connect({ host: hote, port: Number(port) });
    let tampon = "";
    let reponseVueA = null;
    let finVueA = null;
    let t0 = null;
    s.on("connect", () => {
      t0 = Date.now();
      s.write(`GET /api/v1/health HTTP/1.1\r\nHost: ${hote}:${port}\r\nConnection: keep-alive\r\n\r\n`);
    });
    s.on("data", (d) => {
      tampon += d.toString("latin1");
      if (reponseVueA === null && tampon.includes("\r\n\r\n")) reponseVueA = Date.now();
    });
    s.on("end", () => { finVueA = Date.now(); });
    s.on("close", (avecErreur) => {
      const entetes = tampon.split("\r\n\r\n")[0] ?? "";
      resolve({
        statut: /^HTTP\/1\.1 (\d+)/.exec(entetes)?.[1] ?? null,
        entete_connection: /^connection:\s*(.*)$/im.exec(entetes)?.[1] ?? "(absent)",
        entete_keep_alive: /^keep-alive:\s*(.*)$/im.exec(entetes)?.[1] ?? "(absent)",
        ms_inactif_avant_fermeture: reponseVueA === null ? null : (finVueA ?? Date.now()) - reponseVueA,
        fermeture_avec_erreur: avecErreur
      });
    });
    s.on("error", (e) => resolve({ erreur: `${e.code ?? ""} ${e.message}` }));
  });
}

if (process.argv[2] === "--calibrer") {
  const serveur = http.createServer((req, res) => { req.resume(); req.on("end", () => res.end("ok")); });
  serveur.keepAliveTimeout = 2000;
  await new Promise((r) => serveur.listen(0, "127.0.0.1", r));
  const port = serveur.address().port;
  const r = await mesurer("127.0.0.1", port);
  serveur.close();
  serveur.closeAllConnections?.();
  console.log(`CALIBRATION — serveur node:http, keepAliveTimeout imposé = 2000 ms → mesuré ${r.ms_inactif_avant_fermeture} ms · en-tête annoncé « ${r.entete_keep_alive} »`);
  if (!(r.ms_inactif_avant_fermeture >= 1900 && r.ms_inactif_avant_fermeture <= 3500)) {
    console.error("CALIBRATION RATÉE : un délai imposé de 2 000 ms doit être mesuré entre 1 900 et 3 500 ms. ABANDON, rien n'a été jugé.");
    process.exit(2);
  }
  console.log("calibration tenue (dans [1 900 ; 3 500] ms).");
  process.exit(0);
}

const [hote, port, essais = "3"] = process.argv.slice(2);
if (!hote || !port) throw new Error("usage: node mesure-keepalive.mjs <hôte> <port> [essais] | --calibrer");
console.log(`node ${process.version} · ${hote}:${port} · ${essais} essai(s) · socket TCP brute`);
for (let i = 1; i <= Number(essais); i += 1) console.log(`essai ${i}:`, JSON.stringify(await mesurer(hote, port)));
