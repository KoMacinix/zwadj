# D343 — le résultat des deux passes de l'e2e (R-15), 07/11/2026

*(Écrit APRÈS les deux passes, dans un commit postérieur au commit `69671a4` qui porte la règle `regle-deux-passes.md`. La règle n'a pas été retouchée.)*

Pièces : `passe-1-test-e2e.txt` et `passe-2-test-e2e.txt` (les sorties, **MASQUÉES** : 87 et 87 jetons d'une base jetable, de la forme exacte de jetons réels, par `masquer-jetons.py` dans sa version RÉPARÉE — la règle d'origine laissait passer un jeton sans chiffre : `defaut-masquage.txt` ; bruts gardés HORS dépôt, 1 351 978 et 1 351 969 octets, sha256 `20a76c9ae393059169eab61e9279c712638c07f09681968f80ebfa737dfac2bf` et `86ddb1fd8052616ebe190dd2d5f4032fcb1bcb7e307fde1502fb68b0ab887220` — `NO_COLOR=1` : les bruts ne portent aucun code ANSI), `deux-passes-index.txt`, `deux-passes-etat-machine.txt`, `etat-env-d343-ouverture.txt`, `etat-env-d343-cloture.txt`, `deux-passes-env-comparaison.txt`.

## 1. Ce qui s'est passé

- **Un seul lancement de la chaîne**, par `portes/deux-passes-e2e.sh`, `retries` inchangé (0) : passe 1 de 13:26:02 à 13:31:22 (**319 s**), passe 2 de 13:31:27 à 13:36:44 (**316 s**). `HEAD` au lancement : `3ada4f7c62e843da3ce4b4d6557eab76edd314e0` (la première écriture d'autorité, **postérieure** au commit de la règle — `git log`). Arbre propre au départ, entre les deux passes et à l'arrivée, aucun stash.
- **Portes dures** (règle, section 2) toutes passées **avant chaque passe** : secteur, `chrome` 0, `headless_shell` 0, Docker et `zwadj-db` « Up », ports 3100, 3101, 5273, 5274 libres, arbre propre ; `.env` : « COMPARAISON : IDENTIQUE — mêmes fichiers, mêmes empreintes, hôtes locaux » (3 fichiers, ouverture et clôture).
- **État machine** : 21 relevés (toutes les 30 s), **0 sur batterie**, `chrome` 0 partout ; RAM libre de 802 Mo au plus bas (pendant l'e2e, avec jusqu'à 12 `headless_shell` — le navigateur de Playwright — et 18 `node`) à 3 494 Mo ; 3 501 Mo après.

## 2. Le verdict, lu sur la sortie BRUTE (D275), l'attendu à côté du mesuré

| quoi | passe 1 | passe 2 | attendu pour « verte » |
|---|---|---|---|
| code de sortie de la commande | **0** | **0** | 0 |
| résumé de Playwright | **`1 skipped` · `77 passed (5.3m)`** | **`1 skipped` · `77 passed (5.2m)`** | aucune ligne `failed`, aucune `did not run`, aucune `flaky` |
| passés + ignorés | 77 + 1 = **78** | 77 + 1 = **78** | **78** — dérivé par `playwright test --list` avant la première passe (« Total: 78 tests in 19 files »), pas écrit de mémoire |
| « Nest application successfully started » | 1 | 1 | 1 (l'API ne redémarre pas pendant la suite) |
| la garde `d265-socket-perimee` | 2 tests passés | 2 tests passés (7,9 s et 7,1 s ; fermeture serveur mesurée à 6 009 ms) | passés |

Les 78 sont les 76 tests de la passe de D342 **plus les 2 de la garde**. Le test ignoré est le même qu'à D342 (1 ignoré).

## 3. La lecture, selon la règle écrite avant les passes

- **Passe 1 verte, passe 2 verte** : la ligne « verte · verte » du tableau de la règle. **La porte `test:e2e` est VERTE au sens de R-15** : deux passes complètes consécutives, vertes, sur secteur, après la correction de D265, **sans que rien ait bougé entre elles** (le script a revérifié l'arbre propre avant la seconde).
- **Ce que cette lecture n'est PAS** : pas une certification (aucune marque, pause de Ko, DR1 de D336) ; pas la preuve que la panne ne reviendra jamais — **deux passes vertes sont l'absence d'un rouge, pas la présence d'une garantie** ; la garantie est la garde de la suite (`d265-socket-perimee`), qui reproduit la condition au lieu de l'attendre, et dont la campagne montre qu'elle rougit quand la correction est retirée.
- **Comparaison avec D342**, mesurée sur les mêmes specs : à D342, `fc2-debordement-360`, `r43-devis-brouillon` et `r26-parcours-reservation` avaient échoué chacune dans une passe ; elles passent dans les deux passes de D343. **Aucun `ECONNRESET` au premier appel du fixture dans les deux passes qui suivent la correction** (0 occurrence de `a échoué après` dans les deux sorties masquées — comptée dans la clôture). Ce n'est pas un taux : le taux de la panne n'a jamais été mesuré (limite écrite dans la section D343).
