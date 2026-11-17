# D348 (suite) — le rejeu de la porte `test` : les deux sorties côte à côte (R-1)

Règle : `portes/regle-rejeu.md`, commitée (`f53fdef`) avant le lancement. Pilote : `portes/rejeu-test.sh` (une seule passe, aucun rejeu du rejeu). Les deux sorties sont **brutes** (la rouge est versée telle quelle, `portes/test.txt` ; la rejouée aussi, `portes/rejeu-test.txt`, sha256 `21ee6f86ea034a3c6c114d4446f59def403f339c0e829965c4f8baaab4086704`, 75 390 octets, 590 lignes ; aucun jeton à masquer : 0 occurrence).

## Les deux passes

| | première passe (rouge) | rejeu (UNE fois) |
|---|---|---|
| lancée par | `passe-secteur.sh` (six portes), 16/11/2026 | `rejeu-test.sh` (la seule porte `test`), 16/11/2026 à 23:35 |
| code de sortie de `pnpm test` | **1** | **0** |
| arbre au départ | propre, `HEAD` = `26ad5c7` + commits de lot | propre, `HEAD` = `f53fdef` ; `git diff 2b9a5e1..HEAD` = `.md` et pièces de `docs/preuves/D348/` seulement |
| `packages/api-client` | 7 fichiers · 66 tests, tout passé | 7 fichiers · 66 tests, tout passé |
| `apps/api` | 80 fichiers · 1 336 tests, tout passé | 80 fichiers · 1 336 tests, tout passé |
| `apps/client` | 41 fichiers · 499 tests, tout passé | 41 fichiers · 499 tests, tout passé |
| `apps/pro` | **1 fichier en échec sur 46 · 1 test en échec sur 727** | **46 fichiers passés sur 46 · 727 tests passés sur 727** |
| durée de `pnpm test` | 1 porte parmi six (durée à `portes/_index.txt`) | **123 s** (`portes/rejeu-index.txt`) |
| alimentation | SECTEUR (relevé avant, pendant, après) | SECTEUR : **0 échantillon BATTERIE sur 5** |

Les nombres viennent des lignes `Test Files` et `Tests` de chaque sortie, lues (D275) ; la ventilation par paquet est celle des quatre résumés `RUN v3.2.7` de chacune. **Le seul écart entre les deux passes est `apps/pro` : 727/727 contre 726/727.**

## Ce que cela dit — et ce que cela ne dit pas

- **Dit** : sur secteur, sur un arbre dont aucun fichier de code ne diffère, la porte `test` entière sort en **0** à la seconde passe. Selon la règle (§ 2) la porte est donc déclarée **« verte au rejeu, première passe rouge sur un fichier non touché »** — le fichier est `apps/pro/src/account/account-settings-page.test.tsx`, que ce lot ne touche pas (`git diff --name-only 26ad5c7 HEAD -- apps packages` : trois fichiers, tous sous `apps/client/`).
- **Dit aussi** : c'est la forme exacte des précédents D338 et D342 (première passe rouge, rejeu vert, arbre inchangé) — ils la rendent plausible ; ils ne la prouvent pas.
- **Ne dit PAS** que le test est réparé : le fichier a échoué **1 fois sur 5** rejoué seul (`portes/test-rejeux-fichier-seul.txt`), puis la porte entière a échoué 1 fois sur 2 passes. **Le défaut intermittent reste ouvert** ; entrée du backlog, annotation additive (R-3).
- **Ne dit PAS** que le défaut préexistait à `26ad5c7` : « antérieur à D348 » reste un argument de dépendance (aucun fichier commun), **non mesuré sur l'arbre d'avant**. Deux passes (une rouge, une verte) sur le MÊME code sont ce que l'on a mesuré ; c'est ce qui, avec les cinq rejeux du fichier seul, montre que le résultat ne dépend pas du code du lot — **c'est une lecture, pas une mesure sur `26ad5c7`**.
- **Relevé machine, déclaré** (non bloquant, `regle-rejeu.md` § 3) : 8 processus `chrome` du Chrome personnel de Ko, RAM libre entre 2 569 et 3 854 Mo pendant la passe, `headless_shell` 0. Aucune règle de certification n'est invoquée (les certifications sont en pause).
