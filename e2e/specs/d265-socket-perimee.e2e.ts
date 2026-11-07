import net from "node:net";
import { expect, test } from "@playwright/test";
import { apiCall, createVerifiedAccount } from "../fixtures/harness";
import { API } from "../playwright.config";

/**
 * D265 — LA GARDE : un appel de préparation ne reprend jamais une connexion MORTE (D343).
 *
 * Le défaut, nommé par la mesure (`docs/preuves/D343/reproduction/`) : le `fetch` global garde les connexions HTTP dans un pool. Quand la boucle du worker est BLOQUÉE — `seedReferentials()`
 * fait un `execFileSync` de quelques secondes — plus longtemps que le serveur d'API ne garde une connexion inactive, le serveur ferme ses connexions pendant le blocage ; le client, dont la
 * boucle est figée, ne l'apprend pas ; son PREMIER appel suivant prend une connexion morte et lève `fetch failed` ← `ECONNRESET` en quelques ms. Avant la correction, cela tombait sur le premier
 * appel du fixture d'une spec au hasard, une fois sur quelques passes — d'où trois rejeux de clôture (D339, D340, D342). La correction est dans `fixtures/harness.ts` (`connection: close`).
 *
 * CE QUE CETTE SPEC FAIT : elle REPRODUIT la condition, déterministement, et exige que l'appel réussisse. (1) elle MESURE le délai de fermeture des connexions inactives du serveur, sur une socket
 * brute — jamais supposé : c'est une propriété de Node et de sa version, pas du dépôt (l'API ne fixe rien) ; (2) elle fait trois appels successifs du VRAI fixture — c'est ce qui laisse deux
 * connexions libres dans le pool (avec une seule, undici la tient encore pour « occupée » et en ouvre une neuve : les montages de D322 et D325 n'avaient qu'une connexion et ne pouvaient pas
 * échouer) ; (3) elle bloque la boucle plus longtemps que la fermeture serveur ; (4) elle fait un appel de plus. DEUX tests, un par fonction du harnais qui appelle le `fetch` global.
 *
 * ⚠ LE DÉLAI S'AJOUTE À LA SUITE : une mesure de la fermeture serveur (~6 s) puis deux blocages d'un peu plus de cette durée. C'est le prix d'une garde qui ne suppose aucun chiffre. Le blocage est
 * `Atomics.wait` (aucun processus lancé) : il fige la boucle de CE worker et d'aucun autre.
 * ⚠ SANS CORRECTION cette spec ÉCHOUE, et l'assertion LIT la chaîne des causes (`issue`) : elle ne dépend pas de ce que le harnais veut bien déplier — `apiCall` n'enveloppait pas l'erreur de
 * `fetch`, un `TypeError: fetch failed` seul ne dit pas LAQUELLE des trois pannes. Si elle passe sans que la correction soit en place, elle ne mesure plus rien.
 * Mutation : `neutralisation/neutralize-r45.py` retire la correction à chacune des deux fonctions, et sa valeur.
 * ⚠ PAS DE MODE `serial` : en mode serial l'échec du premier test SAUTE le second (« did not run »), et un bras qui n'a pas tourné n'a rien mesuré (D312). Les deux tests sont indépendants ;
 * un échec fait redémarrer le worker, et c'est pour cela que la mesure du délai est faite par un `beforeAll` (rejoué dans chaque worker) et non gardée en mémoire par un test.
 */
let delaiServeurMs = 0;

/** Bloque la boucle d'événements du worker, comme l'`execFileSync` de `seedReferentials()`, sans lancer de processus. */
function bloquer(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

/** La chaîne des causes d'un rejet, de l'enveloppe à la vraie : c'est elle qui dit si c'est ECONNRESET, ECONNREFUSED ou un délai. */
function chaineDesCauses(erreur: unknown): string {
  const parts: string[] = [];
  for (let courante: unknown = erreur; courante instanceof Error; courante = courante.cause) {
    const code = (courante as NodeJS.ErrnoException).code;
    parts.push(`${courante.name}${code ? ` [${code}]` : ""}: ${courante.message.split("\n")[0]}`);
  }
  return parts.join(" ← ");
}

/** `null` si l'appel a réussi, sinon sa chaîne des causes. L'assertion porte sur ce texte : un rejet reste une assertion `expect(…)` qui MONTRE sa cause. */
async function issue(appel: Promise<unknown>): Promise<string | null> {
  try {
    await appel;
    return null;
  } catch (erreur) {
    return chaineDesCauses(erreur);
  }
}

/** Combien de temps le serveur garde-t-il une connexion INACTIVE ? Socket brute : aucun client HTTP entre le serveur et la mesure. */
function mesurerFermetureInactive(): Promise<number> {
  const { hostname, port } = new URL(API);
  return new Promise((resoudre, rejeter) => {
    const socket = net.connect({ host: hostname, port: Number(port) });
    let tampon = "";
    let reponseVueA: number | null = null;
    const garde = setTimeout(() => {
      socket.destroy();
      rejeter(new Error("le serveur n'a fermé la connexion inactive dans aucun délai de 60 s"));
    }, 60_000);
    socket.on("connect", () => socket.write(`GET /api/v1/health HTTP/1.1\r\nHost: ${hostname}:${port}\r\nConnection: keep-alive\r\n\r\n`));
    socket.on("data", (morceau) => {
      tampon += morceau.toString("latin1");
      if (reponseVueA === null && tampon.includes("\r\n\r\n")) reponseVueA = Date.now();
    });
    socket.on("end", () => {
      clearTimeout(garde);
      if (reponseVueA === null) rejeter(new Error("la connexion s'est fermée avant toute réponse"));
      else resoudre(Date.now() - reponseVueA);
    });
    socket.on("error", (e) => {
      clearTimeout(garde);
      rejeter(e);
    });
  });
}

test.beforeAll(async () => {
  delaiServeurMs = await mesurerFermetureInactive();
  // Ce que la garde a RÉELLEMENT mesuré s'imprime : une garde qui bloquerait 0 ms passerait sans rien mesurer (D290).
  console.log(`D265 garde — fermeture d'une connexion inactive mesurée à ${delaiServeurMs} ms ; blocage de ${delaiServeurMs + 1000} ms`);
  expect(delaiServeurMs, "le délai de fermeture serveur doit avoir été mesuré (> 1 s)").toBeGreaterThan(1000);
});

test("D265 — createVerifiedAccount (postJson) : le premier appel après un blocage plus long que la fermeture serveur réussit", async () => {
  for (let i = 0; i < 3; i += 1) await createVerifiedAccount("CLIENT");
  bloquer(delaiServeurMs + 1000);
  expect(
    await issue(createVerifiedAccount("CLIENT")),
    "l'appel qui suit un blocage synchrone ne doit pas reprendre une connexion fermée par le serveur (D265, ECONNRESET) — null = il a réussi"
  ).toBeNull();
});

test("D265 — apiCall : le premier appel après un blocage plus long que la fermeture serveur réussit", async () => {
  for (let i = 0; i < 3; i += 1) await apiCall("GET", "/health");
  bloquer(delaiServeurMs + 1000);
  expect(
    await issue(apiCall("GET", "/health")),
    "l'appel qui suit un blocage synchrone ne doit pas reprendre une connexion fermée par le serveur (D265, ECONNRESET) — null = il a réussi"
  ).toBeNull();
});
