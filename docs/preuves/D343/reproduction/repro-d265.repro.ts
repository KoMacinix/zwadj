/**
 * D343 — REPRODUCTION ISOLÉE DE D265 (`fetch failed` ← `ECONNRESET`, au PREMIER appel du fixture) — pièce versée, jamais promue en instrument (D291).
 *
 * R-13 de la consigne : « tu la reproduis isolément, ROUGE, avant toute correction ; si la reproduction échoue : aucune correction ».
 *
 * CE QUE CETTE SPEC UTILISE DE RÉEL, et pourquoi (les deux montages antérieurs — D322, D325 — n'avaient rien de tout cela et n'ont rien reproduit) :
 *   · le VRAI serveur d'API (`nest start`, la commande et l'environnement de la suite — `repro.config.ts` les reprend de `e2e/playwright.config.ts`) ;
 *   · les VRAIES fonctions du fixture (`createVerifiedAccount`, `seedReferentials`) dans un VRAI worker Playwright ;
 *   · le délai de fermeture des connexions inactives du serveur est MESURÉ à chaque lancement, sur une socket TCP brute — jamais supposé.
 *
 * LE MÉCANISME TESTÉ (hypothèse écrite avant la mesure, à confirmer ou à infirmer par elle) : le `fetch` global (undici) garde les connexions HTTP ouvertes dans
 * un POOL. Si la boucle d'événements du worker est BLOQUÉE (un `execFileSync` — celui de `seedReferentials()` — ou un `Atomics.wait`) plus longtemps que le
 * serveur ne garde une connexion inactive, le serveur la ferme pendant le blocage ; la minuterie du client, qui fermerait la sienne plus tôt, ne peut pas tourner ;
 * à la reprise, le premier appel prend la connexion MORTE du pool et reçoit un `ECONNRESET` en quelques ms.
 * L'ÉTAT DU POOL COMPTE : avec UNE seule connexion, undici la tient encore pour « occupée » (sa notification de libération n'a pas eu de tour de boucle) et en ouvre
 * une neuve — le montage passe. Il faut DEUX connexions libres ou plus : c'est ce que `batirLePool()` construit, par trois appels successifs du vrai fixture.
 *
 * LES BRAS (chacun commence par un repos qui laisse mourir toute connexion des bras précédents, PUIS bâtit son pool) :
 *   A  NÉGATIF  aucun blocage, aucune attente                          → attendu : succès
 *   B  NÉGATIF  attente ASYNCHRONE plus longue que la fermeture serveur → succès (la boucle tourne : le client ferme ses connexions lui-même)
 *   C  NÉGATIF  blocage synchrone PUIS un tour de boucle complet        → succès (la fermeture serveur est lue avant le premier appel)
 *   D  POSITIF  blocage synchrone, premier appel IMMÉDIAT (×3)          → attendu AVANT correction : ÉCHEC `ECONNRESET` ; APRÈS : succès
 *   E  POSITIF  le VRAI `seedReferentials()` (≈ 5 s) après 1,5 s libre  → idem D, avec la durée et la forme exactes de la suite
 *   F  POSITIF  `apiCall` (l'AUTRE fonction du harnais qui appelle le `fetch` global), blocage synchrone, premier appel immédiat → idem D
 * La CALIBRATION se lit avant la conclusion : si un bras négatif échoue, le montage ne mesure pas ce qu'il croit mesurer.
 */
import net from "node:net";
import { expect, test } from "../../../../e2e/node_modules/@playwright/test";
import { apiCall, createVerifiedAccount, seedReferentials } from "../../../../e2e/fixtures/harness";
import { API } from "../../../../e2e/playwright.config";

// ⚠ DÉFAUT D'INSTRUMENT DE LA PASSE 1 (gardée : `rouge-avant-passe-1-AVANT-CORRECTIFS.txt`) : la spec était en mode `serial`. Le premier échec (D1) a SAUTÉ D2, D3 et E (« 3 did not run »), et
// un test en échec fait redémarrer le worker : la mesure du délai, gardée en mémoire par un test, y serait perdue. Ici chaque bras est INDÉPENDANT et la mesure est faite par un `beforeAll`
// (rejoué dans chaque worker). Un bras qui n'a pas tourné n'est pas un bras négatif : il n'a rien mesuré (D312).

const attendre = (ms: number): Promise<void> => new Promise((fin) => setTimeout(fin, ms));

/** Bloque la boucle d'événements du worker, comme `execFileSync` dans `seedReferentials()`, sans lancer de processus. */
function bloquer(ms: number): void {
  Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
}

let delaiServeurMs = 0;

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

/** Trois appels successifs du VRAI fixture : c'est ce qui laisse deux connexions libres dans le pool du `fetch` global (avant correction). */
async function batirLePool(): Promise<void> {
  for (let i = 0; i < 3; i += 1) await createVerifiedAccount("CLIENT");
}

/** Laisse mourir TOUTE connexion des bras précédents, des deux côtés (la boucle tourne : le client ferme les siennes, le serveur les siennes). */
async function repos(): Promise<void> {
  await attendre(delaiServeurMs + 1500);
}

async function premierAppel(raison: string): Promise<void> {
  await expect(createVerifiedAccount("CLIENT"), raison).resolves.toMatchObject({ role: "CLIENT" });
}

test.beforeAll(async () => {
  delaiServeurMs = await mesurerFermetureInactive();
  console.log(`MESURE delai_fermeture_inactive_ms=${delaiServeurMs} (api=${API}, node ${process.version})`);
  expect(delaiServeurMs, "le délai doit avoir été mesuré (> 1 s) et le serveur doit finir par fermer (< 60 s)").toBeGreaterThan(1000);
  expect(delaiServeurMs).toBeLessThan(60_000);
});

test("A — NÉGATIF — aucun blocage : le premier appel après le pool réussit", async () => {
  await batirLePool();
  await premierAppel("bras A (aucun blocage) : le montage est faux si cet appel échoue");
});

test("B — NÉGATIF — attente ASYNCHRONE plus longue que la fermeture serveur : réussit (la boucle tourne)", async () => {
  await repos();
  await batirLePool();
  await attendre(delaiServeurMs + 1000);
  await premierAppel("bras B (attente asynchrone) : le client ferme ses connexions inactives lui-même, l'appel doit réussir");
});

test("C — NÉGATIF — blocage synchrone PUIS un tour de boucle complet : réussit", async () => {
  await repos();
  await batirLePool();
  bloquer(delaiServeurMs + 1000);
  await attendre(100);
  await premierAppel("bras C (blocage + un tour de boucle) : la fermeture serveur est lue avant l'appel, l'appel doit réussir");
});

for (const essai of [1, 2, 3]) {
  test(`D${essai} — POSITIF — blocage synchrone plus long que la fermeture serveur, premier appel IMMÉDIAT`, async () => {
    await repos();
    await batirLePool();
    bloquer(delaiServeurMs + 1000);
    await premierAppel(`bras D${essai} (blocage synchrone, appel immédiat) : AVANT correction, ECONNRESET en quelques ms ; APRÈS, succès`);
  });
}

test("E — POSITIF — le VRAI seedReferentials() après 1,5 s libre", async () => {
  await repos();
  await batirLePool();
  await attendre(1500);
  const debut = Date.now();
  seedReferentials();
  console.log(`MESURE seedReferentials_ms=${Date.now() - debut}`);
  await premierAppel("bras E (le vrai semis, bloquant) : AVANT correction, ECONNRESET en quelques ms ; APRÈS, succès");
});

test("F — POSITIF — l'AUTRE fonction du harnais qui appelle le fetch global : apiCall, blocage synchrone, premier appel IMMÉDIAT", async () => {
  await repos();
  for (let i = 0; i < 3; i += 1) await apiCall("GET", "/health");
  bloquer(delaiServeurMs + 1000);
  await expect(apiCall("GET", "/health"), "bras F (apiCall) : AVANT correction, ECONNRESET en quelques ms ; APRÈS, succès").resolves.toMatchObject({ status: 200 });
});
