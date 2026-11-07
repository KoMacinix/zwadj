# D342 — l'arrêt de l'e2e de la passe des portes (07/11/2026), et la règle du rejeu ÉCRITE AVANT LUI

Source des règles : la consigne du rang 45 (`docs/preuves/D342/consigne.md`), § 3, mot pour mot — « Rouge hors des fichiers de la branche : R-6 de D339 (un seul rejeu, règle écrite avant, les deux passes versées) ; rouge encore : tu ne pousses pas, tu rapportes. » et « Rouge dans un fichier de la branche : tu ne corriges pas ; tu trouves le lot fautif (le test rejoué sur le commit de clôture de chaque lot, comme la troisième condition de Ko du 14/10/2026) et tu rapportes. » — et R-6 de D339, dont la forme complète est `docs/preuves/D339/portes/arret-e2e-r41.md`, section 5. Ce que la session **dérive** de ces règles est marqué « ⚠ dérivé par la session, à ratifier ».

⛔ **ÉTAT DE CETTE PIÈCE À SON PREMIER COMMIT.** Les sections 1 à 5 sont écrites ; le résultat du rejeu vit dans `rejeu-resultat.md`, écrit APRÈS le rejeu, dans un commit postérieur. Le premier commit de cette pièce **précède le lancement du rejeu** : c'est `git log` qui le prouve, pas cette phrase. Aucune section de ce fichier n'est retouchée après le rejeu.

## 1. La passe des portes — chiffres lus dans les sorties brutes (D275)

Pilote : `docs/preuves/D340/portes/passe-secteur.sh`, tel quel, sur secteur (30 relevés d'état machine, **0 sur batterie**), `HEAD` = `2b79355` (le commit de fusion), arbre propre au départ et à l'arrivée, 01:22 → 01:37 le 07/11/2026. Sorties : `docs/preuves/D342/portes/`.

| porte | code | durée | ce que la sortie brute dit |
|---|---|---|---|
| `typecheck` | 0 | 24 s | |
| `lint` | 0 | 16 s | |
| `test` | 0 | 124 s | api-client 7 fichiers / 66 tests, api 80 / 1 336, client 41 / 488, pro 45 / 711 = **173 fichiers / 2 601 tests**, 0 échec |
| `build` | 0 | 38 s | |
| `test:int` | 0 | 464 s | **46 fichiers / 735 tests**, 0 échec (à la première passe) |
| **`test:e2e`** | **1** | 250 s | Playwright : **`68 passed` · `2 failed` · `1 skipped` · `5 did not run`** (68 + 2 + 1 + 5 = 76) |

## 2. L'arrêt — les deux échecs de l'e2e

Lus dans la sortie brute masquée (`portes/test-e2e.txt`), première ligne de chaque bloc d'échec (D304) :

1. `specs\fc2-debordement-360.e2e.ts:51:9` — « FC-2 — fr, accueil : à 360 px, la page tient dans la fenêtre » : `Error: POST http://localhost:3101/api/v1/auth/register a échoué après 3 ms.` — chaîne des causes `TypeError: fetch failed` ← `Error [ECONNRESET]: read ECONNRESET`, levée dans `e2e/fixtures/harness.ts:65`, appelée par `createVerifiedAccount` ← `createPublishedVenue` ← le **`test.beforeAll`** de la spec (`fc2-debordement-360.e2e.ts:27`) : le crochet échoue, le premier test porte l'échec, et les **cinq autres tests de la spec** ne sont pas joués (« did not run »).
2. `specs\r43-devis-brouillon.e2e.ts:85:7` — « un brouillon créé au comptoir par le bouton de Q1 … » (en français) : `POST …/api/v1/auth/register a échoué après 4 ms`, même chaîne de causes, même fixture, appelée par `ouvrir` (`r43-devis-brouillon.e2e.ts:31`). Les **deux autres tests de la spec passent** (en arabe et le chemin ordinaire).

**Aucune assertion d'écran n'a été atteinte dans l'un ni l'autre** : les deux sont des remises à zéro de connexion (`ECONNRESET`) au tout premier appel HTTP du fixture, 3 et 4 ms après son départ. C'est la signature décrite à D265 (« `fetch failed` ← `ECONNRESET` »), déjà vécue à D325 (deux passes sur deux), à D339 (`r41:65`) ; arbitrage de Ko du 04/10/2026 (D325), repris par R-6 de D339 : **aucune nouvelle tentative AUTOMATIQUE** ; la spec reste dans la suite ; l'enquête de D265 est un lot à part. L'hypothèse de D265 n'est ni reproduite ni exclue.

- `fc2-debordement-360.e2e.ts` est un fichier **de la branche** (FC-2, `7113356`) ; `r43-devis-brouillon.e2e.ts` est un fichier **de `main`** (L36-2, D339) que la fusion ne touche pas (`git diff --name-only 499d1bf 2b79355 -- e2e/specs` : `fc10-donnees-structurees.e2e.ts`, `fc2-debordement-360.e2e.ts`, `fc8-mode-guide.e2e.ts`).
- Les deux autres specs de la branche (`fc8-mode-guide` 4 sur 4, `fc10-donnees-structurees` 2 sur 2) passent, et les deux autres tests de `r43` aussi (2 sur 3).
- État machine : 30 relevés dans `portes/etat-machine-pendant.txt`, tous sur secteur, `chrome` 0. RAM libre : minimum **2 374 Mo hors e2e**, de **794 à 3 023 Mo pendant l'e2e** (minimum 794 Mo à 01:36:15, avec 7 `headless_shell` et 20 `node` — le navigateur de Playwright). **Aucune cause n'est établie** ; ceci est un classement, pas une explication.

## 3. La règle du rejeu — ÉCRITE AVANT LE REJEU

**Une seule commande, une seule fois** : `pnpm test:e2e` depuis la racine, EN ENTIER, par `docs/preuves/D342/portes/rejeu-e2e.sh`, `retries` inchangé (0). **Aucun** délai changé, **aucune** spec exclue ou ignorée en plus, **aucune** relance — y compris si le lancement échoue après son départ. **Pas de deuxième rejeu, quel que soit le résultat** (R-6 de D339).

**Portes dures du lanceur, avant la commande** — si l'une est rouge, le rejeu ne démarre pas, la pièce le dit, et la session rapporte sans relancer : poste sur batterie ; `chrome` ou `headless_shell` > 0 avant ; Docker ou `zwadj-db` absents ; un port d'e2e (3100, 3101, 5273, 5274) occupé ; l'arbre pas propre ; l'état des `.env` (un hôte non local, ou une erreur du relevé : D330). La RAM libre n'est **pas** une porte (elle est déclarée). Le relevé machine : une ligne juste avant, toutes les 30 s pendant, une juste après.

**Comment le verdict se lit** — sur la sortie BRUTE du rejeu (D275), avec l'attendu à côté du mesuré :
- **vert** = la commande sort en **0** ET le résumé de Playwright ne porte **aucune ligne `failed`**, **aucune ligne `did not run`** ; le nombre d'ignorés est relevé et rapporté (1 à la passe rouge) ; l'attendu est **75 passés et 1 ignoré = 76** tests ;
- **même signature** = les seuls échecs sont des `POST … a échoué après N ms` avec les causes `TypeError: fetch failed` et `Error [ECONNRESET]` ;
- **tout autre rouge** = tout le reste : une assertion, un autre message, un échec de lancement après son départ.

**Ce que chaque résultat fait :**

| résultat du rejeu | conduite |
|---|---|
| **vert** (0 échec, 0 « did not run », 75 passés, 1 ignoré) | `test:e2e` s'écrit « **verte AU REJEU** » avec les deux résultats (68 passés, 2 échecs, 5 non joués ; puis le résultat du rejeu), **jamais « verte » seul** ; la passe rouge (masquée) et le rejeu (masqué) se versent côte à côte ; la clôture reprend (campagnes, passe D277, fichiers d'autorité, contrôle de fin de lot, poussée) |
| **rouge, même signature, sur `fc2` ou `r43`** (ou les deux) | « deux sur deux n'est plus un aléa » (leçon du rang 32) : **je ne pousse pas**, je ne sors aucune spec de la suite, je ne rejoue pas, je rapporte |
| **rouge, autre signature** (une assertion, un autre test) | **je ne pousse pas** ; si le test en rouge est dans un fichier de la branche : je ne corrige rien et **je cherche le lot fautif** (le test rejoué sur le commit de clôture de chaque lot) ; si c'est dans un fichier de `main` : je rapporte ; **dans tous les cas, pas de deuxième rejeu** |

⚠ **Dérivé par la session, à ratifier par Ko ou le relecteur** — la consigne distingue deux conduites pour deux sortes de fichiers, et cette passe a UN rouge de chaque sorte, de même signature :
1. **Le rejeu unique de R-6 de D339 sert aux deux.** `r43` (fichier de `main`) est exactement le cas que la consigne confie à R-6 de D339. `fc2` (fichier de la branche) relève de la recherche du lot fautif ; mais cette recherche suppose un test **rouge par son code** — or ici l'échec précède tout code de FC-2 (la remise à zéro tombe sur le crochet `beforeAll` de la spec, avant que sa page soit chargée). Le rejeu complet **contient** `fc2` : s'il est vert, il n'y a plus de rouge à attribuer à un lot ; s'il est rouge par une assertion, la recherche du lot a lieu ; s'il est rouge par la même remise à zéro, « deux sur deux » et arrêt.
2. **Si le rejeu est vert, la recherche du lot fautif n'a pas lieu**, et le rapport le dit comme une décision de la session (elle n'a pas de rouge à rejouer sur dix-sept commits ; la rejouer sur les commits de clôture d'un test passé aurait mesuré autre chose).
3. **Ni la passe rouge ni cette règle ne sont retouchées** ; le rejeu est versé **à côté** de la passe rouge (`portes/rejeu-test-e2e.txt`), **jamais à sa place**.

## 4. Ce qui ne dépend PAS du rejeu

Les cinq autres portes sont à 0 à leur première passe et ne se rejouent pas. La fusion elle-même est contrôlée (`docs/preuves/D342/fusion/controle-fusion.txt` : 12 contrôles sur 12, l'arbre de la fusion identique à celui que `git merge-tree` recalcule seul).

## 5. Ce que cette pièce ne dit pas

- **Aucune cause de l'`ECONNRESET` n'est établie**, ni pour `fc2` ni pour `r43`. Un rejeu vert est une autre observation, pas une explication ; un rejeu rouge non plus.
- **Elle n'établit pas que la suite sera verte** : elle écrit comment un rejeu se lit.
- **Le code joué par le rejeu est celui de la passe 1** : `git diff 2b79355..HEAD --name-only` ne contiendra, au lancement, que des pièces sous `docs/preuves/D342/` (la section de résultat le relève). Aucune porte ne lit `docs/preuves/` (D292) ; ce contrôle est écrit, pas supposé.
