# D346 — les six portes, avec leurs chiffres

Jouées le 09/11/2026 **sur secteur** (`BatteryStatus` = 2 à chaque relevé : 0 échantillon sur batterie sur 30 pendant la passe), par le pilote versé de D340 (`docs/preuves/D340/portes/passe-secteur.sh`), **sur `a209b6c`** (le dernier commit de code ; arbre propre, aucun stash, ports d'e2e libres, Docker `zwadj-db` Up). Aucune ligne de code produit ni de test n'a changé depuis : les commits suivants sont des pièces et des `.md` d'autorité. Chaque journal brut est masqué des jetons de forme réelle par le masqueur de D345 (`docs/preuves/D345/portes/masquer-jetons.py`) ; l'en-tête de chaque pièce porte l'empreinte du brut (gardé hors dépôt).

| porte | code | durée | chiffres | pièce |
|---|---|---|---|---|
| `pnpm typecheck` | **0** | 18 s | — | `portes/typecheck.txt` |
| `pnpm lint` | **0** | 14 s | — | `portes/lint.txt` |
| `pnpm test` | **0** | 108 s | quatre paquets : 7 fichiers / 66 tests, 80 / 1 336, 41 / 499, 46 / 727 — **174 fichiers, 2 628 tests, 0 échec** | `portes/test.txt` |
| `pnpm build` | **0** | 32 s | — | `portes/build.txt` |
| `pnpm test:int` | **0** | 442 s | **46 fichiers, 735 tests** | `portes/test-int.txt` |
| `pnpm test:e2e` (passe 1) | **0** | 280 s | **82 passés, 1 ignoré, 0 échec** (83 listés = les 81 de D345 + les 2 de `r48`) | `e2e/passe-1.txt` |
| `pnpm test:e2e` (passe 2, de suite) | **0** | 4,3 min | **82 passés, 1 ignoré, 0 échec**, secteur avant et après | `e2e/passe-2.txt`, `e2e/passe-2-batterie-avant.txt`, `e2e/passe-2-batterie-apres.txt` |

État machine avant, pendant (toutes les 30 s) et après : `portes/_index.txt`, `portes/etat-machine-pendant.txt` (RAM libre 3 300 à 3 540 Mo, `chrome` et `headless_shell` à 0 ; **ce lot ne certifie rien** — la barre de RAM d'une certification ne s'applique pas, les certifications sont en pause).

## Le harnais du lot et les campagnes voisines
- `neutralisation/neutralize-r48.py --e2e` : **12 gardes mordues sur 12, 0 muette, 0 non mesurée** (10 de composant, 2 vues par le navigateur) — chacune par un seul test précis, lu en `AssertionError` ; pré-vol vert, dont le navigateur. Sortie : `neutralisation/neutralize-r48.txt`.
- **Trois campagnes voisines rejouées à la main** (`lancer-campagnes.py` calcule sa liste depuis `git diff HEAD` : à un lot déjà commité elle rend « 0 campagne », comme à D345 ; la liste est donc celle des harnais qui nomment `search-view` ou la spec du lot, relevée par `grep`) : `available-on` **10 sur 10**, `horizon` **6 sur 6**, `fc8` **12 sur 12** (10 de composant, puis ses 2 cibles e2e jouées par `--e2e`). Sorties : `campagnes/`.

## Ce que ces portes ne regardent pas
- Le cas **sans JavaScript** n'a pas de mesure neuve : la clé React ne change rien au HTML servi, et la spec existante `fc8` (« sans JavaScript, le HTML servi… porte le formulaire de recherche ») est restée verte aux deux passes.
- Les **puces de goûts en navigateur** ne sont mesurées par la suite complète que si les listes de référentiels du client existent (voir `reproduction/reproduction.md`, écart 3) ; elles le sont **toujours** en composant (rouge 1, 10 tests).
- Ce qu'un humain voit : les gestes de Ko, `scenarios-ko.md`.
