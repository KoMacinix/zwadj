# D342 — le résultat du rejeu unique de l'e2e (07/11/2026)

*(Écrit APRÈS le rejeu, dans un commit postérieur au commit `cd356c7` qui porte la règle `regle-rejeu.md`. La règle n'a pas été retouchée.)*

Pièces : `rejeu-test-e2e.txt` (la sortie du rejeu, **MASQUÉE** : 80 jetons d'une base jetable ; brut gardé HORS dépôt, 1 282 305 octets, sha256 `0279b4c1678d4740d7097793c9aea46f1506a890627c4b98fc4512738e33523a`), `rejeu-index.txt`, `rejeu-etat-machine.txt` (8 relevés, 0 sur batterie), `rejeu-env-comparaison.txt`, `etat-env-d342-rejeu-ouverture.txt`, `etat-env-d342-rejeu-cloture.txt`. La passe rouge reste `test-e2e.txt` (masquée, 79 jetons ; brut sha256 `0f093dfdd1f8f6acc06a20f498614eda2ed850c38ee1eccffca413aef7e4d368`) : **versée à côté, jamais remplacée**.

## 1. Ce qui s'est passé

- **Un seul lancement**, par `portes/rejeu-e2e.sh`, `retries` inchangé : départ 01:50:06, fin 01:53:54, **227 s**, **code de sortie 1**. `HEAD` au lancement : `cd356c79f29ead24e007620bebd34910fa18e037` (le commit qui porte la règle, **antérieur** au lancement — `git log`). Arbre propre au départ et à l'arrivée, aucun stash.
- **Portes dures du lanceur** (règle, section 3) toutes passées : secteur `Online`, `chrome` 0, `headless_shell` 0, Docker et `zwadj-db` « Up », ports 3100, 3101, 5273, 5274 libres, `.env` : « COMPARAISON : IDENTIQUE — mêmes fichiers, mêmes empreintes, hôtes locaux » (3 fichiers, ouverture et clôture).
- **Le code joué est celui de la passe 1** : `git diff --name-only 2b79355 cd356c7` ne contient aucun fichier hors `docs/preuves/D342/` (0 mesuré, attendu 0).
- **État machine** : 8 relevés, tous sur secteur ; RAM libre de 1 338 Mo au plus bas (pendant l'e2e, avec 5 à 9 `headless_shell` — le navigateur de Playwright — et 13 à 15 `node`) à 3 923 Mo (avant) ; 3 784 Mo après.

## 2. Le verdict, lu sur la sortie BRUTE (D275), l'attendu à côté du mesuré

| quoi | mesuré | attendu pour « vert » |
|---|---|---|
| code de sortie de la commande | **1** | 0 |
| résumé Playwright | **`1 failed` · `1 skipped` · `74 passed (3.7m)`**, aucune ligne `did not run` | aucune ligne `failed`, aucune `did not run`, 75 passés et 1 ignoré |
| l'échec | **`specs\r26-parcours-reservation.e2e.ts:108:5`** — « le pro ACCEPTE : la demande quitte ses demandes pour ses réservations, et le client la voit acceptée » (le 54ᵉ test de la passe) | — |
| son message (première ligne du bloc, ligne 2322 de la sortie brute) | `POST http://localhost:3101/api/v1/auth/register a échoué après 4 ms` ; causes `TypeError: fetch failed` ← `Error [ECONNRESET]: read ECONNRESET` (lignes 2326, 2327, 2343, 2349 — toutes dans le bloc de l'échec unique) | — |
| `fc2-debordement-360` | **les six tests passent** | — |
| `r43-devis-brouillon` | **les trois tests passent** | — |

## 3. La lecture, selon la règle écrite avant le rejeu

- La commande sort en 1 : **le rejeu n'est pas vert**. Le seul échec porte la MÊME chaîne de causes que ceux de la passe 1, mais dans **un autre test** (`r26:108`), d'un **fichier de `main` que la fusion ne touche pas** (`git diff --name-only 499d1bf 2b79355` : 0 fichier `r26`). La règle écrit ce cas à la ligne « rouge, autre signature (**une assertion, un autre test**) » (comme R-6 de D339 : « `ECONNRESET` dans un AUTRE test (même classe D265, autre test) : la règle dit « tout autre rouge » »).
- **Conduite écrite, appliquée** : **je ne pousse pas** ; **pas de deuxième rejeu** ; le test en rouge est dans un fichier de `main`, pas de la branche : **je rapporte**, et la recherche du lot fautif n'a pas lieu (il n'y a pas de fichier de la branche en rouge au rejeu, et `fc2` y est vert).
- ⚠ **`test:e2e` s'écrit donc « ROUGE aux deux passes » — pas « verte au rejeu ».** Le rejeu n'est pas vert.

## 4. Ce que les deux passes disent, mesuré par un croisement CALCULÉ des deux sorties brutes

Pour chaque test, son résultat dans la passe 1 et dans le rejeu (75 tests lus de chaque côté, hors la préchauffe `warmup`) :

| test | passe 1 | rejeu |
|---|---|---|
| `fc2-debordement-360.e2e.ts` — « FC-2 — fr, accueil » (le premier de la spec) | **ÉCHEC** (`ECONNRESET`, dans le `beforeAll` : les cinq autres « did not run ») | ok |
| `fc2-debordement-360.e2e.ts` — les cinq autres (ar accueil, ar fiche salle, ar recherche, fr fiche salle, fr recherche) | non joués | ok |
| `r43-devis-brouillon.e2e.ts:85` — « (fr) un brouillon créé au comptoir par le bouton de Q1… » | **ÉCHEC** (`ECONNRESET`) | ok |
| `r26-parcours-reservation.e2e.ts:108` — « le pro ACCEPTE… » | ok | **ÉCHEC** (`ECONNRESET`) |
| `a5-cold-reload-vs-spa.e2e.ts:175` | ignoré | ignoré (le « 1 ignoré » de D339, D341 et des deux passes de D342) |

- **Ces neuf tests (les six de `fc2`, `r43:85`, `r26:108` et `a5:175`) sont les seuls qui ne sont pas verts dans les DEUX passes** ; sur les 75 tests lus, **le seul qui n'est vert dans aucune des deux est le test ignoré en permanence** (`a5:175`). Autrement dit : **chaque test non ignoré est vert dans au moins une des deux passes.**
- **Trois échecs, trois tests différents, deux specs de `main` et une de la branche, la même chaîne de causes** (`fetch failed` ← `ECONNRESET`), **3 à 4 ms après le départ du premier appel HTTP du fixture** (`POST /auth/register`), jamais une assertion d'écran. Aucun n'est dans la même spec que les deux autres, et aucun ne se répète d'une passe à l'autre : c'est la signature d'un **aléa de l'infrastructure de test**, pas d'un défaut d'un lot — **c'est une lecture, pas une mesure** : l'hypothèse de D265 « n'est ni reproduite ni exclue », et rien ici ne la teste.
- **Ce que cela ne permet PAS** : écrire « verte au rejeu » (le rejeu est rouge), ni déclarer la porte verte ; ni conclure que la fusion est exempte de défaut — cinq autres portes sont à 0, l'e2e est rouge aux deux passes.

## 5. Ce que la session fait de ce résultat

- **Rien n'est poussé** : `origin/main` est resté sur `d44867a`. Le rang 45 **reste OUVERT** ; son état est réécrit dans `ZWADJ_CONTINUITE.md` (point d'entrée « PROCHAIN LOT — rang 45 »), D276 : ce qui vaut décision ne vit pas seulement dans le fil.
- **Les campagnes de neutralisation ne sont pas jouées** : la poussée est interdite sous une porte rouge, et leur coût est de plusieurs heures ; la liste calculée de l'union est versée (`neutralisation/union-sortie.txt`, 35 campagnes) pour que le prochain lancement ne la recalcule pas de mémoire.
- **Décision due** (au relecteur, qui place le rang, ou à Ko) : voir la question du rapport de fin de session.
