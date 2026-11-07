# D343 — lecture du rouge d'AVANT la correction (R-13 : « on ne corrige pas une panne qu'on n'a pas nommée »)

Écrite APRÈS les sorties qu'elle lit, AVANT toute ligne de code du lot. Chaque nombre cité est LU dans une pièce versée à côté (D291) ; ce qui ne l'est pas s'écrit **inférence** ou **non établi**.

## 1. Ce qui a été joué, et contre quoi

Toutes les exécutions : poste sur **secteur**, `chrome` 0, `headless_shell` 0, `node` 0 avant, Node v22.14.0, Playwright 1.50.1, undici 6.21.1, le **vrai** serveur d'API (`nest start`, la commande et l'environnement de la suite, repris de `e2e/playwright.config.ts`), les **vraies** fonctions du fixture (`e2e/fixtures/harness.ts`, **non modifié** : l'en-tête de chaque sortie porte `git status --short`, qui ne montre aucune modification d'un fichier suivi ; empreinte du fichier joué `778941c85b09…`, dans les fichiers d'empreintes), dans un **vrai worker** Playwright (`retries: 0`).

| pièce | ce qu'elle montre |
|---|---|
| `mesure-keepalive-sortie.txt` | le serveur d'API **annonce** `Keep-Alive: timeout=5` et **ferme** une connexion inactive après **6 004 à 6 018 ms** (3 mesures IPv4, 1 mesure IPv6 : 6 018 ms). L'instrument est calibré : un serveur dont le délai est imposé à 2 000 ms est mesuré à 3 005 ms (annonce + la seconde que Node ajoute) |
| `mesure-minuterie-client-sortie.txt` | le **client** (undici) ferme ses propres connexions inactives **entre 3 000 et 3 500 ms** d'inactivité asynchrone (connexion intacte à 3 000 ms, une neuve à 3 500 ms) ; trois appels successifs laissent **deux** connexions dans son pool |
| `rouge-avant-passe-1-AVANT-CORRECTIFS.txt` | la première passe de la reproduction, gardée telle quelle : A, B, C verts, **D1 rouge par la chaîne de production** ; les trois bras suivants ne sont pas joués (mode `serial`, défaut d'instrument n° 1 de `defauts-instrument.txt`) |
| `rouge-avant.txt` | la passe corrigée, **rejouée en entier** : `4 passed · 4 failed` — voir 2 |
| `rouge-avant-garde.txt` | la garde de la suite (`e2e/specs/d265-socket-perimee.e2e.ts`), jouée contre le harnais d'avant : `2 failed` — voir 3 |

## 2. La reproduction (`rouge-avant.txt`)

| bras | forme | résultat | lu dans la sortie |
|---|---|---|---|
| A | négatif : aucun blocage | **vert** | 1,1 s |
| B | négatif : attente ASYNCHRONE plus longue que la fermeture serveur (la boucle tourne) | **vert** | 15,5 s |
| C | négatif : blocage synchrone, PUIS un tour de boucle complet, puis l'appel | **vert** | 15,6 s |
| D1, D2, D3 | positif : trois appels du vrai fixture, blocage synchrone de `délai + 1 000 ms`, appel immédiat | **rouge, trois fois sur trois** | `POST …/api/v1/auth/register a échoué après 8 ms` · `19 ms` · `15 ms` ← `TypeError: fetch failed` ← `Error [ECONNRESET]: read ECONNRESET` |
| E | positif : le VRAI `seedReferentials()` après 1,5 s libre | **vert** — ⚠ **la prédiction de la spec est démentie** | semis mesuré à **3 583 ms** |
| F | positif : `apiCall` (l'autre fonction du harnais qui appelle le `fetch` global), blocage synchrone, appel immédiat | **rouge** | `TypeError: fetch failed` (`apiCall` n'enveloppe pas l'erreur : la cause n'y est pas imprimée ; elle est lue dans la garde, voir 3) |

La calibration se lit avant la conclusion : **les trois bras négatifs passent, donc le montage ne mesure pas autre chose que ce qu'il croit** ; la signature de D est celle de la suite (`POST …/auth/register`, quelques ms, `fetch failed` ← `ECONNRESET`, dans `harness.ts:65` côté suite), et la durée des échecs (8 à 19 ms) est celle des échecs de la suite (3 à 4 ms).

⚠ **La prédiction du bras E est fausse, et c'est écrit ici plutôt que retouché dans la spec** (la spec jouée est celle dont l'empreinte est versée). La spec annonçait « idem D » : l'API a répondu autre chose. 1,5 s libre + 3,58 s de semis = **5,1 s d'inactivité totale < 6,0 s** : le serveur n'avait pas encore fermé ses connexions. La panne n'exige donc pas « un blocage », elle exige **une inactivité totale (libre + bloquée) d'au moins ≈ 6,0 s alors que la boucle a été bloquée assez longtemps pour que le client n'ait pas fermé ses connexions à ≈ 3,0 s**.

## 3. La garde de la suite contre le harnais d'avant (`rouge-avant-garde.txt`)

`2 failed`, aux deux sites, par une assertion native — `expect(received).toBeNull()` — dont la valeur reçue est la chaîne des causes :
- `createVerifiedAccount` (donc `postJson`) : `Error: POST http://localhost:3101/api/v1/auth/register a échoué après 11 ms. ← TypeError: fetch failed ← Error [ECONNRESET]: read ECONNRESET`
- `apiCall` : `TypeError: fetch failed ← Error [ECONNRESET]: read ECONNRESET` — **la cause qu'`apiCall` ne déplie pas est lue par la garde elle-même**.
Délais mesurés par la garde, à chaque worker : 6 016 ms et 6 009 ms.

## 4. La cause, telle que la mesure la nomme — et ce qui n'est PAS établi

**NOMMÉE (mesurée, chaque terme est dans une pièce ci-dessus)** : le `fetch` global garde les connexions dans un pool ; trois appels successifs en laissent deux ; le serveur d'API ferme une connexion inactive après ≈ 6,0 s alors que le client ferme la sienne vers 3,0 à 3,5 s, **à condition que sa boucle tourne** ; si la boucle est bloquée plus longtemps que la fermeture serveur (bras D, F, garde), le client ne ferme rien, le serveur ferme tout, et le **premier appel suivant prend une connexion morte du pool** et reçoit `ECONNRESET` en quelques ms. Si la boucle tourne (bras B) ou fait UN tour avant l'appel (bras C), l'appel réussit. **Les montages de D322 et de D325 n'avaient qu'une connexion dans le pool** — undici la tient alors pour « occupée » tant que sa notification de libération n'a pas eu de tour de boucle, et en ouvre une neuve : ils ne pouvaient pas échouer.

**INFÉRENCE (non mesurée) : que ce soit `seedReferentials()` qui bloque la boucle dans les échecs de la suite.** Ce qui la soutient : les trois échecs de D342 (`fc2`, `r43`, `r26`) sont tous le premier appel du fixture après un `seedReferentials()` dans le `beforeAll` de leur spec (contrôle 2.4 de la lecture adverse) ; D322 avait mesuré le semis à 5,2–5,4 s. Ce qui la limite : ici le semis dure 3,58 s, et le bras E ne rougit pas ; la durée du semis **pendant les passes qui ont échoué** n'a jamais été relevée. La fenêtre d'échec, pour un pool encore chaud (≤ 3,0 s d'inactivité avant le semis), est : `inactivité avant + durée du semis ≥ ≈ 6,0 s` — large (≈ 2,3 s) si le semis dure 5,2–5,4 s, étroite (≈ 0,6 s) s'il dure 3,6 s. C'est ce qui rend la panne **intermittente** : elle dépend de l'écart entre le dernier appel de la spec précédente et le semis de la suivante, jamais du code.

**NON ÉTABLI** : (a) si `loginContext` (`context.request` de Playwright, un autre client HTTP) a la même faille — non mesuré, hors de ce lot ; (b) la fréquence de la panne dans la suite ; (c) pour d'autres versions de Node, les délais ci-dessus (la garde les mesure à chaque lancement et ne suppose aucun chiffre).

## 5. Ce que la preuve du vert devra montrer

Le même `rouge-avant.txt` rejoué contre le harnais corrigé : **A à F tous verts** (`vert-apres.txt`) ; la garde de la suite verte ; puis la correction neutralisée, et le rouge qui revient (`correction-neutralisee.txt`, puis `neutralisation/neutralize-r45.py`) ; puis l'e2e complète deux fois de suite (`portes/regle-deux-passes.md`, commitée avant).
