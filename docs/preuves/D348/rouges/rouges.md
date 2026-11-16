# D348 — les rouges, lus AVANT tout commit de code d'application (D334, point 5)

Fichiers joués (non encore commités à l'écriture de cette pièce ; empreintes du contenu LF, qui est celui du dépôt — `git ls-files --eol` : `i/lf`) :

| fichier | sha256 |
|---|---|
| `e2e/specs/r50-salle-publiee.e2e.ts` | `662f3ebb3898c55dad17aba4e37ec9aa177d9c96d07aae2a112be4edbc878bde` |
| `docs/preuves/D348/mesures/pieces/m3-instrument.mjs` | `317ea18f04ab426fa054ceced0549b37a169947bbb5d67011b58c8a8a76eca6e` |

Code d'application : celui de `26ad5c7`, **inchangé** à ces mesures (aucun fichier sous `apps/` ni `packages/` n'est modifié à l'écriture de cette pièce : `git diff --stat 26ad5c7 -- apps packages` vide).

## Rouge 1 — la spec contre le code d'AVANT, par la VRAIE configuration e2e

Commande : `pnpm --filter @zwadj/e2e exec playwright test specs/r50-salle-publiee.e2e.ts` (serveurs de développement démarrés par la configuration, base `zwadj_e2e` recréée, secteur). Sortie : `rouge-1-e2e-r50-contre-etat-avant.txt` (lignes retirées : celles qui portent un jeton de développement ; chiffres en tête de la pièce).

Résultat : **9 passés, 1 en échec** (préchauffage + 7 tests de M-1 + le test de M-2 ; le test de M-3 échoue).

| # | test | verdict | ce que cela veut dire |
|---|---|---|---|
| 2 à 8 | M-1 : création par l'écran, publication, accueil, `/salles` et ses six filtres (jumeaux négatifs), fiche — en FR et en AR | **verts** | « une salle publiée s'affiche » : mesuré, **pas de défaut** sur ce chemin |
| 9 | M-2 : la table des sept conditions, le pro, les filtres « invités » | **vert** | les conditions du code sont celles que la table dit |
| 10 | **M-3 (garde) : « publiée après une visite en 404 ; renommée ; masquée ; supprimée : chaque relecture de la fiche suit l'état réel »** | **ROUGE** — `Error: la fiche annonce encore l'ancien nom` / `Timed out 7000ms waiting for expect(locator).toBeVisible()`, `Locator: getByRole('heading', { level: 1, name: 'R50 M3 RENOMMEE …' })`, `Received: <element(s) not found>` | **échec d'une ASSERTION `expect`** (D305, D323), pas un délai d'action : la fiche d'une salle renommée, vue avant son changement, annonce encore l'ancien nom. Les deux assertions suivantes (masquée → 404, supprimée → 404) ne sont pas atteintes dans ce test ; elles l'étaient dans la mesure de production (voir ci-dessous) |

## Rouge 2 — le même défaut sur un BUILD DE PRODUCTION

`mesures/pieces/m3-rouge-sortie-brute.txt` (instrument `m3-instrument.mjs`) : la fiche d'une salle **masquée** et celle d'une salle **supprimée** sont toujours servies en 200 à T+663 s, plus de douze minutes après, et après un redémarrage du serveur, alors que l'API répond 404 ; le nom, le prix et la photo d'une salle modifiée sont servis périmés pendant 308 s. Détail, conditions et inférences : `mesures/m3-delais.md`.

## Ce qui n'est PAS un rouge

- Aucune autre garde de la spec ne contredit l'application : M-1 et M-2 sont verts contre le code d'avant, et c'est un résultat (R-5 de la consigne : « Ce n'est pas un échec : c'est la preuve qui manquait »). Leur MORSURE (chacune des assertions rougit-elle quand on casse la règle qu'elle garde ?) est la campagne `neutralisation/neutralize-pub1.py`, rejouée après la correction.
- L'état d'avant la publication (catalogue vide, salles fictives) est une mesure jouée seule (`mesures/m1-chemin-reel.md`), pas une garde de la suite.
