# D329 — rang 36 — table d'ouverture

Lot : **la certification qui couvre D325 et D326** (rang 36, à arbitrer par Ko — consigne d'ouverture : « Rang 36 : j'arbitre la certification », 12/10/2026). Il commence **DOCUMENTAIRE** (`.md` d'autorité et `docs/preuves/` seulement, D283 amendé par D292 — aucune ligne de code) ; il ne compte pas dans le compteur de lots de code non certifiés. Compteur : **DEUX** (rangs 32 et 33) ; il ne repasse à ZÉRO que si la certification PASSE.

- **SHA de départ** : `d468064` (clôture de D328). `HEAD` = `origin/main` après `git fetch` (les deux = `d4680647ac67e5adcb05f97a2b229eb18cdf27b5`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D329 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D328), et vérifié absent du dépôt (`git grep D329` : 0 fichier).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse (instrument, sortie), avant toute écriture d'autorité ; (3) les `.md` d'autorité, **les arbitrages de Ko en première écriture**, cette table recopiée à l'identique ; (4) **toute extension** : un commit propre qui l'ajoute ICI, avec son motif, AVANT le commit du fichier qu'elle couvre ; (5) le protocole de la certification est commité AVANT toute mesure de la passe (forme de D324).
- **Pourquoi des extensions sont PRÉVUES** : les pièces de l'étape 0 (planchers mesurés, relevés de la machine) et de la passe (journaux, lectures) portent des noms qui **dépendent de la mesure** (identifiant de passe, un fichier par campagne et par harnais). Elles sont déclarées **en chemins complets, un par un**, par des extensions commitées avant leur versement — jamais par un préfixe (un préfixe rend « 0 non déclaré » vrai par construction : constat P-C1 de D328). L'ordre dans `git` le prouvera.

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D329/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D329/lecture-adverse/confronter-d328.py` | l'instrument de la lecture adverse de D328 |
| `docs/preuves/D329/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D329/passe-d277/balayage.py` | la passe D277, les deux sens (copie à l'octet de celle de D328) |
| `docs/preuves/D329/passe-d277/motifs.txt` | ses motifs |
| `docs/preuves/D329/passe-d277/balayage-1-AVANT-ECRITURE.txt` | sa première passe, avant toute écriture d'autorité |
| `docs/preuves/D329/passe-d277/balayage-final.txt` | sa dernière passe |
| `docs/preuves/D329/audit-secrets-d329a.txt` | audit de secrets scellé, avant la passe |
| `docs/preuves/D329/tri-audit-d329a.txt` | son tri différentiel contre la dernière sortie scellée |
| `docs/preuves/D329/audit-secrets-d329b.txt` | dernier audit scellé, après la dernière écriture |
| `docs/preuves/D329/tri-audit-d329b.txt` | son tri différentiel |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko du 12/10 (première écriture), décisions du relecteur, ordre des rangs, point d'entrée du rang 36, section D329, protocole de la certification, marque ou refus, bloc D329 de la méthode renforcée, registre |
| `AGENTS.md` | l'annotation de la chaîne du compteur (rang 36, marque ou refus) ; passe D277 |
| `ZWADJ_BACKLOG.md` | « Reports du 12/10/2026 — rang 36 » ; entrées annotées ou fermées |

### Fichiers CONDITIONNELS — créés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D329/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327, D328) |
| `docs/preuves/D329/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `docs/preuves/D329/aucune-valeur-reelle.txt`, `docs/preuves/D329/aucun-cookie-reel.txt` | un journal à valeurs réelles est produit par la passe (le journal e2e brut) : les contrôles « 0 valeur réelle » de D299 et D315 ont alors un objet |

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur versement

| famille | contenu |
|---|---|
| étape 0 (avant le commit du protocole) | l'état de la machine aux relevés d'ouverture, **`headless_shell` relevé à côté de `chrome`** (ajout (a) du relecteur) ; la dérivation des planchers (`git diff` des harnais depuis la mesure de D324 : lesquels sont réutilisés, lesquels sont mesurés) ; les planchers MESURÉS (au moins `r32`, `r33`, `act-plafonds`, `horloge`) ; les outils copiés avec leurs modifications comptées |
| la passe | les pièces de **SA** passe (point 11) : journaux des six portes, de `--tout`, de `--int`, de `--e2e`, relevés d'arbre, échantillonneur, lectures, extrait e2e |
| le rejeu des deux specs sorties de la suite (ajout (b) du relecteur) | `docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts` et `docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts` rejouées SEULES, sans retouche, après la passe ; sorties versées en pièce, pas en porte |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*

#### Extension 1

**Motif** : les pièces de l'ÉTAPE 0 (planchers, outils de la passe, relevés de la machine, audit scellé « a ») portent des noms qui dépendent de la mesure ; elles sont déclarées ici, une par une, **avant** le commit qui les verse, et **avant** le commit du protocole (qui précède toute mesure de la passe). Chemins COMPLETS — jamais un préfixe. Ce commit n'ajoute que cette extension.

| fichier | pour |
|---|---|
| `docs/preuves/D329/etat/inventaire-avant-protocole.txt` | pièce de l'étape |
| `docs/preuves/D329/etat/inventaire-avant-simulation.txt` | pièce de l'étape |
| `docs/preuves/D329/etat/sonde-avant-protocole.txt` | pièce de l'étape |
| `docs/preuves/D329/etat/sonde-avant-simulation.txt` | pièce de l'étape |
| `docs/preuves/D329/outils/inventaire.py` | pièce de l'étape |
| `docs/preuves/D329/outils/lire-campagnes-calibration.txt` | pièce de l'étape |
| `docs/preuves/D329/outils/lire-campagnes.py` | pièce de l'étape |
| `docs/preuves/D329/outils/passe.py` | pièce de l'étape |
| `docs/preuves/D329/outils/verser.py` | pièce de l'étape |
| `docs/preuves/D329/plancher/deriver-plancher-sortie.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/deriver-plancher.py` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/cale-A/node.cmd` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/cale-A/pnpm.cmd` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/cale-B/node.cmd` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/cale-B/pnpm.cmd` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/cale_b.py` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-a-A-6.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-a-B-1.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-a-B-6.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-b-A-available-on-api.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-b-A-available-on-api.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-b-B-available-on-api.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-b-B-available-on-api.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-c-argon2.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/calib-c-argon2.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-act-plafonds.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-act-plafonds.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-horloge.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-horloge.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-r32.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-r32.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-r33-int.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-A-r33-int.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-act-plafonds.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-act-plafonds.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-horloge.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-horloge.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-r32.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-r32.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-r33-int.cale.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/journaux/sim-B-r33-int.log` | pièce de l'étape |
| `docs/preuves/D329/plancher/plancher.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/simulation-sortie.txt` | pièce de l'étape |
| `docs/preuves/D329/plancher/simuler-non-demarrage.py` | pièce de l'étape |
