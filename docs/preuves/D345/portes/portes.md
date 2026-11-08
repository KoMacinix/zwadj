# D345 — les portes, APRÈS la dernière modification de code (08/11/2026)

Dernier commit de code : `06347f6` (le parcours), `4e009af` (le harnais), `303c480` (la spec e2e). Aucune ligne de code n'a changé depuis ; seuls des fichiers de `docs/preuves/` ont été ajoutés (commits `*e5*` à venir : les pièces ci-dessous). Poste : **sur secteur** à chaque porte (relevé `Win32_Battery.BatteryStatus` = 2), RAM libre ≈ 3,5 Go, `chrome` 0, `headless_shell` 0, Docker 29.8.0 lancé. Les sorties sont **lues**, jamais déduites d'un code : les nombres ci-dessous sont ceux des lignes `Test Files` / `Tests` de chaque paquet (D275, D290), à côté de l'attendu dérivé de D344.

| Porte | Code | Chiffres lus dans la sortie | Attendu (dérivé) | Pièce |
|---|---|---|---|---|
| `pnpm typecheck` | **0** | 5 paquets `Done` (client, pro, api, e2e et les paquets partagés) | — | `typecheck.txt` |
| `pnpm lint` | **0** | `Done` pour client, pro, api (et e2e) | — | `lint.txt` |
| `pnpm test` | **0** | **174 fichiers · 2 617 tests** (66 + 1 336 + 488 + 727) en quatre résumés de paquet | D344 : 173 fichiers / 2 601 tests ; ce lot : **+1 fichier, +16 tests** (`walkin-draft.test.tsx`) ⇒ 174 / 2 617 ✓ | `test.txt` |
| `pnpm build` | **0** | build des paquets | — | `build.txt` |
| `pnpm test:int` | **0** | **46 fichiers · 735 tests** | D344 : 46 / 735 (le lot n'ajoute aucun test d'intégration, `apps/api` est intouché) ✓ | `test-int.txt` |
| `pnpm test:e2e` ×2 | **0** et **0** | passe 1 : `1 skipped; 80 passed (4.1m)` · passe 2 : `1 skipped; 80 passed (4.1m)` (250 s et 247 s) | **81 listés** par `playwright test --list` avant la première passe (79 + 2 tests de r47) ; 80 + 1 = 81 ✓ chacune | `../e2e/` |

**Deux passes e2e consécutives, complètes, sur secteur, VERTES** (`docs/preuves/D345/e2e/deux-passes-index.txt` : 34 échantillons d'état machine pendant les passes, **0 sur batterie** ; `.env` identiques à l'ouverture et à la clôture, `etat-env comparer` code 0, aucune valeur). ⚠ **Elles sont les secondes de deux tentatives** : la première, sur `e6416783`, a joué sa passe 1 (verte, 80 + 1) puis le pilote a **refusé** de démarrer la passe 2 (port 3101 encore en cours de libération — défaut d'**instrument**, pas un rouge ; `defaut-pilote-ports.md`, `tentative-1/`). La règle n'a pas été contournée : aucune passe rouge n'a été rejouée. ⚠ **Le bras « un port qui se libère PENDANT l'attente » n'a pas été exercé** : les deux passes de la tentative réelle ont lu **0 tour d'attente** (la course ne s'est pas reproduite).

**Le harnais du lot** : `neutralisation/neutralize-r47.py` — **25 gardes mordues sur 25, 0 muette, 0 non mesurée** (`../neutralisation/neutralize-r47.txt`) ; la première passe (23 mordues, 2 muettes — deux tests dont la première ligne d'échec n'était pas une `AssertionError`) est gardée telle quelle à côté (`neutralize-r47-passe-1-AVANT-CORRECTIF-DE-DEUX-TESTS.txt`), les deux tests ayant reçu une assertion native avant tout rejeu intégral.
