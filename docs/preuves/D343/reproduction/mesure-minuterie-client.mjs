// D343 — relève si, après une inactivité ASYNCHRONE donnée, le CLIENT (le `fetch` global de Node, undici) a fermé ses propres connexions, et combien de connexions trois appels successifs laissent
// dans son pool. Pièce versée, jamais promue en instrument (D291).
//
// POURQUOI : la lecture du bras E de la reproduction (le vrai `seedReferentials()`, vert à l'état d'avant sur un poste au repos) dépend d'un chiffre qu'on n'avait pas — la durée pendant laquelle les
// connexions du pool survivent côté CLIENT quand la boucle tourne. Sans lui, « la fenêtre est étroite » serait une impression. Mesure par `diagnostics_channel` (`undici:client:connected` :
// une connexion neuve est établie), pas par un chronomètre : on compte les connexions que l'appel suivant OUVRE.
// UN PROCESSUS NEUF PAR VALEUR : le pool d'une mesure ne peut pas contaminer la suivante. La boucle sur les valeurs est dans le shell (voir la sortie versée).
//
// Usage : node docs/preuves/D343/reproduction/mesure-minuterie-client.mjs <base> <inactivité en ms>      (le serveur doit déjà tourner)
import dc from "node:diagnostics_channel";

const [base, msBrut] = process.argv.slice(2);
const ms = Number(msBrut);
if (!base || !Number.isFinite(ms)) throw new Error("usage: node mesure-minuterie-client.mjs <base> <ms>");

let connexions = 0;
dc.subscribe("undici:client:connected", () => { connexions += 1; });
const appel = () => fetch(`${base}/api/v1/health`).then((r) => r.text());

for (let i = 0; i < 3; i += 1) await appel();
const avant = connexions;
await new Promise((fin) => setTimeout(fin, ms));
await appel();
console.log(`inactivité asynchrone ${ms} ms → connexions établies par les 3 premiers appels : ${avant} · connexions NEUVES ouvertes par l'appel suivant : ${connexions - avant}`);
