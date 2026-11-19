# D354 — les six portes, UNE passe, par le pilote de D340 non modifié ; la seconde passe e2e (R-15 de D343)

**Règle** : `docs/preuves/D354/regle-portes.md`, § 3 et § 5, commitée avant (`11ff3d2`). **Pilote** : `bash docs/preuves/D340/portes/passe-secteur.sh <dossier hors dépôt>` — non modifié. **Poste** : sur secteur (`BatteryStatus` = 2), `HEAD` `ea0c86d` (la première écriture d'autorité), arbre propre, `origin/main` = `0423963` (le départ ; le lot n'est pas encore poussé), Docker et `zwadj-db` « Up », ports 3100, 3101, 5273 et 5274 libres, `chrome` et `headless_shell` à 0 à l'ouverture. **Aucun rejeu** : les six portes sont à 0 dès la première passe.

## 1. Les portes — chiffres LUS dans les sorties brutes (masquées), pas recalculés

| porte | code | durée | ce que la sortie brute dit | pièce |
|---|---|---|---|---|
| `typecheck` | **0** | 22 s | — | `typecheck.txt` |
| `lint` | **0** | 15 s | — | `lint.txt` |
| `test` | **0** | 136 s | `@zwadj/api-client` **9 fichiers / 81 tests** · `@zwadj/api` **91 / 1 593** · `@zwadj/client` **47 / 583** · `@zwadj/pro` **58 / 862** | `test.txt` |
| `build` | **0** | 37 s | — | `build.txt` |
| `test:int` | **0** | 559 s | **56 fichiers / 907 tests** (PostgreSQL réel) | `test-int.txt` |
| `test:e2e` — passe 1 (le pilote) | **0** | 425 s | **109 passés + 1 ignoré** (7,0 min) | `test-e2e.txt` |
| `test:e2e` — passe 2 (`pnpm test:e2e` seul, juste après) | **0** | ≈ 7 min | **109 passés + 1 ignoré** (6,6 min) | `test-e2e-passe-2.txt` |

**Deux passes e2e vertes consécutives (R-15 de D343) : la porte e2e est verte.** L'attendu est **dérivé avant la passe 1** (`playwright test --list` : **« Total: 110 tests in 26 files »**, `e2e-liste.txt`, `attendu-e2e.txt`) : 109 + 1 ignoré = 110, le même total qu'à D353 — ce lot ne crée aucun test e2e (aucun écran).

## 2. Ce que le lot ajoute aux comptes (le compte d'avant, relevé à D353, est celui de la section D353 de `ZWADJ_CONTINUITE.md`)

- `@zwadj/api-client` : 9 / **77 → 81** (+4 : les quatre appels K-19 à K-22) ; `@zwadj/api` : 85 / 1 469 → **91 / 1 593** (+6 fichiers, +124 tests : les modules purs, le contrôleur et le service de gestion, la table des capacités, les gardes de source) ; `test:int` : 51 / 808 → **56 / 907** (+5 fichiers, +99 tests : K-19 à K-22, « jamais zéro Manager » sous course, les capacités dérivées du routeur, S-104 de bout en bout, le journal) ; `@zwadj/client` **583** et `@zwadj/pro` **862** : **inchangés** (aucun écran).
- ⚠ **Écrit pour ne pas se lire comme tenu** : ces différences sont des soustractions de comptes lus dans deux sections, pas une mesure de ce que chaque fichier ajoute ; la liste fichier par fichier est celle du diff du lot.

## 3. L'état machine pendant la passe (échantillonneur du pilote, toutes les 30 s ; `etat-machine-pendant.txt`)

**39 échantillons, 0 sur batterie.** `chrome` à 0 sur les 39. `headless_shell` > 0 sur **13** relevés (de 14:57 à 15:12) : le navigateur sans tête des tests PDF (`test:int`, le moteur de D326) puis celui de l'e2e — jamais à l'ouverture ni à la clôture de la passe. RAM libre : minimum 650 Mo (pendant l'e2e), maximum 3 786 Mo. **Ce n'est pas une certification** : aucune barre de RAM, aucune marque (pause de Ko) ; ces relevés disent seulement dans quel état la passe a tourné.

## 4. Prédiction de `regle-portes.md` § 3 contre la mesure

« Les six à 0 ; `test:e2e` inchangée dans sa liste (110 listés) » : **TENUE**, sans rejeu.

## 5. Ce que ces portes ne regardent PAS

Un navigateur réel sur un écran du personnel (il n'y en a pas) ; la fréquence en production du défaut croisé « connexion ‖ réinitialisation » (mesuré par une séquence au niveau du magasin, `docs/preuves/D354/mesures/`) ; le coût de la couche activée ; la qualité des messages arabes ; un autre poste (une seule machine, sur secteur).

## 6. L'ordre des campagnes et des portes — un ÉCART à la règle, déclaré

`regle-portes.md` (§ 4.1) dit : « Après les portes, jamais en parallèle d'une porte ». **Les campagnes ont été jouées AVANT les portes** (la découverte des trois trous de garde, puis la campagne entière, puis les campagnes touchées, dont `r44` en entier : plus de quatre heures de campagnes au total) ; **aucun code produit n'a changé entre elles et les portes** (les trois corrections de tests, commitées en `9af4f85`, précèdent les deux), donc les portes ont mesuré **le même arbre** que celui des campagnes. Décision de la session **S-251**, à ratifier.
