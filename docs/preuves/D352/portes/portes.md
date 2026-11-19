# D352 — les portes du rang 54 (une passe du pilote de D340 + une seconde passe e2e), sur secteur, arbre propre

**Règle** : `docs/preuves/D352/regle-portes.md` (commitée avant toute passe). **Pilote** : `docs/preuves/D340/portes/passe-secteur.sh`, NON modifié, lancé depuis la racine avec un dossier de sortie HORS du dépôt ; il refuse sur batterie, sans Docker, avec un port d'e2e occupé ou un arbre sale. **Code mesuré** : `HEAD` = `da3ac4d5aa437fa59cccbf6bcdd2891df53a77d8` (arbre propre, aucun stash, `origin/main` = `95b68af`), **après la DERNIÈRE modification de code** (les gardes de ce lot et le spec `r50` sont commités ; la seule écriture suivante est la documentation).

## Résultat — les six portes, UNE passe, zéro rejeu

| porte | code | durée | chiffres lus dans la sortie brute (`test.txt`, `test-int.txt`, `test-e2e.txt`) |
|---|---|---|---|
| `typecheck` | **0** | 19 s | `apps/client`, `apps/pro`, `apps/api` : « Done » |
| `lint` | **0** | 15 s | idem |
| `test` | **0** | 131 s | api-client **9 fichiers / 77** · api **85 / 1 469** · client **47 / 564** · pro **58 / 862** (D351 : 58 / 851 — **+11** : les onze tests de la liste) |
| `build` | **0** | 33 s | `apps/client` « Done » |
| `test:int` | **0** | 490 s | **51 fichiers / 807 tests** (D351 : 51 / 807 — inchangé : ce lot ne touche aucun code d'API) |
| `test:e2e` | **0** | 414 s (6,8 min) | **109 passés + 1 ignoré**, 110 listés |

## L'e2e — deux passes complètes, vertes, consécutives (R-15 de D343)

- **L'attendu est DÉRIVÉ** (`attendu-e2e.txt`, écrit AVANT la première passe) : `playwright test --list` → **110 tests dans 26 fichiers** (109 lignes `[chromium]` + 1 ignoré, comme D351).
- **Passe 1** (celle du pilote) : 109 passés + 1 ignoré, 6,8 min. **Passe 2** (`pnpm test:e2e` seul, juste après) : **109 passés + 1 ignoré, 6,4 min**. **Deux passes vertes de suite ⇒ la porte e2e est verte.** Aucun rejeu, aucun délai changé, `retries` inchangé.
- **État machine** : passe 1 relevée toutes les 30 s (`etat-machine-pendant.txt`) — **37 relevés, 0 sur batterie** ; passe 2 relevée avant et après (`etat-machine-passe-2.txt`) : **SECTEUR** aux deux, `chrome` 0, `headless_shell` 0.
- Les sorties de l'e2e portent des jetons de développement (courriels d'activation journalisés) : **versées MASQUÉES** par `masquer-jetons.py` (copie non modifiée de D351), rapport dans `rapport-masquage.txt` ; les sorties brutes restent hors dépôt.

## Ce que ces portes ne regardent PAS

Un navigateur réel pour la carte de la liste (les gestes de Ko, `scenarios-ko.md`) ; une latence réelle d'API sur les 109 tests (une latence de 1,5 s est mesurée pour `r50` M-2 seulement, `mesures/e2e-latence.md`) ; le coût de N lectures sur le réseau.
