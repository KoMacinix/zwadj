# D353 — les portes : une passe, deux passes e2e vertes de suite, et ce qu'elles ne regardent pas

Règle : `docs/preuves/D353/regle-portes.md`, § 4 à § 6 (commitée AVANT toute passe). Code mesuré : **`HEAD` = `d70be45`**, le dernier commit de code du lot (`git status --short` : 0 ligne au lancement ; aucune porte n'a été lancée avant la dernière modification de code). Pilote de D340, **non modifié** (`docs/preuves/D340/portes/passe-secteur.sh`) : en série, UNE fois, **aucun rejeu**. Journaux bruts masqués par `masquer-jetons.py` (copie de `docs/preuves/D352/portes/masquer-jetons.py`, versée dans `rouges/`, non modifiée) ; rapport : `portes/rapport-masquage.txt` (**0 suite de forme jeton restante** dans chaque pièce ; 129 remplacées dans chacune des deux sorties e2e).

## Les six portes (pilote, `_index.txt`)

| porte | code | durée | ce que la sortie brute dit |
|---|---|---|---|
| `typecheck` | **0** | 27 s | tous les paquets, « Done » |
| `lint` | **0** | 16 s | tous les paquets, « Done » |
| `test` | **0** | 146 s | api-client **9 fichiers / 77 tests** · api **85 / 1 469** · **client 47 / 583** (+19 : 1 test de R-4, 18 de R-3) · pro 58 / 862 (inchangé) |
| `build` | **0** | 40 s | tous les paquets, « Done » |
| `test:int` | **0** | 584 s | **51 fichiers / 808 tests** (+1 : le cas de R-5 ; D352 : 807) |
| `test:e2e` | **0** | 464 s | **109 passés + 1 ignoré = 110**, l'attendu dérivé (`attendu-e2e.txt`) |

Les deltas de comptes sont ceux que le lot a écrits : **583 = 564 + 1 + 18** (client), **808 = 807 + 1** (intégration) ; aucun autre fichier de test n'a bougé. (Extracteur confronté à la sortie brute : les motifs `Test Files` / `Tests ` trouvent bien les quatre paquets de `test`, et le compte attendu sort.)

## Deux passes e2e COMPLÈTES, vertes, consécutives (R-15 de D343)

- **Passe 1** : celle du pilote, 04:03:35 → 04:11:19, **109 passés + 1 ignoré**, 7,7 min (`test-e2e.txt`).
- **Passe 2** : `pnpm test:e2e` seul, tout de suite après (04:11:49 → 04:19:03), **109 passés + 1 ignoré**, 7,2 min, code 0 (`test-e2e-passe-2.txt`). État avant : secteur, ports libres (`etat-avant-passe-2.txt`).
⇒ **la porte e2e est verte** (deux passes consécutives).

## État machine (relevé par le pilote, un relevé toutes les 30 s)

**Sur secteur : 0 échantillon sur batterie sur 42** (R-9 de D340 tenu) ; `chrome` à 0 pendant toute la passe ; RAM libre de 1 862 à 4 805 Mo (le minimum pendant l'e2e) ; **`headless_shell` > 0 sur 13 relevés, tous de 04:04:48 à 04:10:59 — c'est le navigateur de l'e2e lui-même, pendant la porte e2e**, pas un navigateur résiduel (avant et après : 0). Aucune porte n'a été lancée sur batterie. Les durées ne sont pas des mesures de performance (D290 : aucune comparaison de durée n'entre dans une décision de ce lot).

## Ce que les portes ne regardent PAS

- **Un navigateur réel sur l'écran corrigé** (le geste de Ko, `docs/preuves/D353/scenarios-ko.md`) : l'e2e joue `r48` (et le reste) contre les serveurs de développement et une base jetable.
- **La valeur réelle de 3 600 s** et **un build de production à cette valeur** : ils ne sont pas dans la suite (les serveurs de l'e2e sont des serveurs de développement) ; la mesure de production est une PIÈCE (`mesures/`), pas une porte.
- **Que `r48` mord seule** : la suite complète est verte avec ou sans la correction (mesuré, `rouges/rouges.md`) ; la garde de la partie e2e est la cible R55-10 de `neutralize-r55.py` (`r48` SEULE depuis un cache empoisonné), pas ces portes.
- **Le coût** d'une lecture d'API de plus par liste et par rendu tant que la liste est vide.
