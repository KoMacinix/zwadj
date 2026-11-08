# D345 — la passe D277 des deux sens (AGENTS.md : D277, D287), avant → après les écritures d'autorité

Instrument : `docs/preuves/D345/passe-d277/passe-d277.py` (calibré sur deux bras à chaque lancement, imprime le nombre de caractères examinés par fichier et ses motifs à zéro). Sorties : `passe-d277/sortie-avant.txt` (avant la clôture : 3 fichiers, 3 178 427 + 686 357 + 230 725 caractères aplatis) et `passe-d277/sortie-apres.txt`. La recherche porte sur le texte **APLATI** (les lignes des fichiers d'autorité sont coupées à ~95 colonnes).

## Sens A — ce que le lot INVALIDE

| motif | avant | après | occurrences APRÈS, triées (ligne de `ZWADJ_CONTINUITE.md` / `AGENTS.md`) |
|---|---|---|---|
| **A1** « RANG 47 : EN ATTENTE DE CADRAGE » | 5 | 9 | **2522** : la table d'ouverture du rang 46, recopiée à l'identique (copie : protégée, D344 la compare) — instantané historique, **non touché** ; **2550** : le barré de l'ordre des rangs (motif écrit) ; **2766** et **2773** : l'état à la clôture du rang 46, dont le titre est **barré avec son motif** (D345) ; **6467** : l'annotation de la section D344 ; **26568** (×2) : la ligne du registre D344 et son annotation additive D345 ; **AGENTS 719** : l'annotation de D344, qui porte désormais, en dessous (720), « PÉRIMÉ » ; **AGENTS 720** : l'annotation de D345. **Aucune occurrence courante non annotée.** |
| **A2** compteur POUR MÉMOIRE VINGT (l'état courant) | 3 | 8 | **2576, 2652, 6407** : le texte de D345 lui-même (« VINGT → VINGT ET UN ») ; **2775** : le bloc du rang 46, barré ; **6467**, **26568** : annotations D345 ; **AGENTS 720** : l'annotation D345. **Le compteur courant est VINGT ET UN** (point d'entrée du rang 47, annotation AGENTS). |
| **A3** « dernier numéro attribué : D344 » | 1 | 1 | **2774** : le bloc du rang 46, barré. Le bloc courant dit D345. |
| **A4** « D344 est au registre » | 1 | 1 | **2774** : idem. |
| **A5** libellé « Annuler » du bouton de remise à zéro | 0 | 0 | **motif à zéro, vérifié à la main** : les 6 titres de test renommés sont dans `walkin-journey.test.tsx` (hors périmètre de cette passe) ; la seule autre occurrence en dehors est le bouton « Annuler » de la **boîte de choix** (rang 38), qui n'a pas changé. |
| **A6** « perd son état » / « revient à la première question » au changement d'onglet | 0 | 0 | **motif à zéro** : aucune phrase des trois fichiers n'affirmait que le parcours repart du début au changement d'onglet. |

## Sens B — ce que le lot REND PERMIS (D287 : le sens qui ne se rattrape pas)

| motif | avant | après | triage |
|---|---|---|---|
| **B1** « un lot de code PEUT s'ouvrir » | 20 | 20 | inchangé : la condition de ces phrases (le compteur de lots non certifiés, une certification passée, l'arbitrage d'un rang) n'est **pas** touchée par ce lot ; la limite de cinq reste **SUSPENDUE** par Ko, le compteur est « pour mémoire ». Ce sont des phrases d'historique, chacune déjà datée et annotée par le lot qui les a rendues fausses. |
| **B2** « aucun lot de code ne s'ouvre » | 57 | 57 | idem : **aucune** phrase de ce genre n'est ajoutée ni rendue vraie ou fausse par D345 (aucune certification, aucune marque). |
| **B3** candidat « L36-3a-2 » pour le rang 47 | 3 | 4 | **2522** (copie de table : protégée), **2773** (bloc du rang 46, barré), **AGENTS 719** (annotation de D344, à laquelle D345 répond en 720), **AGENTS 720** : « L36-3a-2 n'en était pas ». Le candidat de D344 était une **permission** (« le rang 47 pourra être L36-3a-2 ») : elle est **retirée par écrit** — c'est le sens que la recherche par contradiction ne ramène pas. |
| **B4** « le rang 47, à cadrer » | 1 | 2 | **2766** et **2782** : le bloc du rang 46, barré. |

## Ce que cette passe n'a PAS cherché (écrit pour ne pas se lire comme complet)

- Les **motifs sont dérivés des affirmations de CE lot** ; une phrase sur le parcours « Nouvelle réservation » qui s'exprimerait autrement (« l'écran repart de zéro », « les saisies sont perdues ») ne ressortirait pas. Les motifs A5 et A6 à zéro sont **des hypothèses à vérifier**, pas des absences constatées : elles ont été vérifiées à la main sur les trois fichiers aplatis (recherche de « d'onglet », « un onglet », « repart… », « saisies perdues », « revient à la première », « formulaire vidé », « remet tout à zéro » : 29 occurrences dans les trois fichiers, **toutes dans le texte de D345 lui-même**, sauf deux phrases de la consigne copiées dans l'arbitrage, qui disent le contraire d'une affirmation périmée).
- `docs/history/` n'est pas ouvert (les journaux archivés ne décrivent pas l'état courant).
