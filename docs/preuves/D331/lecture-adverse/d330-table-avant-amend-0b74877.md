# D330 — rang 36 (reprise) — table d'ouverture

Lot : **la seconde passe de la certification qui couvre D325 et D326** (rang 36, arbitré par Ko le 12/10/2026 : « Rang 36 : j'arbitre la certification. » ; première passe : D329, marque REFUSÉE, `test:int` rouge, cause locale mesurée dans le `.env` du poste). Il commence **DOCUMENTAIRE** (`.md` d'autorité et `docs/preuves/` seulement, D283 amendé par D292 — aucune ligne de code) ; il ne compte pas dans le compteur de lots de code non certifiés. Compteur : **DEUX** (rangs 32 et 33) ; il ne repasse à ZÉRO que si la certification PASSE.

- **SHA de départ** : `8f53011` (clôture de D329). `HEAD` = `origin/main` après `git fetch` (les deux = `8f530117b10662705f78ab494851fcd15fc02ade`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D330 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D329), et vérifié absent du dépôt (`git grep D330` : 0 fichier).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse (instrument, sortie), avant toute écriture d'autorité ; (2 bis) la première passe D277, avant toute écriture d'autorité (comme à D329) ; (3) les `.md` d'autorité, **les arbitrages de Ko en première écriture** (seuls dans leur commit), puis les décisions du relecteur ; cette table recopiée à l'identique ; (4) **toute extension** : un commit propre qui l'ajoute ICI, avec son motif, AVANT le commit du fichier qu'elle couvre ; (5) le protocole de la passe est commité et POUSSÉ AVANT toute mesure de la passe (forme de D324 et de D329).
- **Pourquoi des extensions sont PRÉVUES** : les pièces de l'étape 0 (outils copiés, relevés de la machine, état des fichiers `.env`) et de la passe (journaux, lectures) portent des noms qui **dépendent de la mesure** (identifiant de passe, un fichier par campagne et par harnais). Elles sont déclarées **en chemins complets, un par un**, par des extensions commitées avant leur versement — jamais par un préfixe (un préfixe rend « 0 non déclaré » vrai par construction : constat P-C1 de D328). L'ordre dans `git` le prouvera.

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D330/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D330/lecture-adverse/confronter-d329.py` | l'instrument de la lecture adverse de D329 |
| `docs/preuves/D330/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D330/passe-d277/balayage.py` | la passe D277, les deux sens (copie à l'octet de celle de D329) |
| `docs/preuves/D330/passe-d277/motifs.txt` | ses motifs |
| `docs/preuves/D330/passe-d277/balayage-1-AVANT-ECRITURE.txt` | sa première passe, avant toute écriture d'autorité |
| `docs/preuves/D330/passe-d277/balayage-final.txt` | sa dernière passe |
| `docs/preuves/D330/audit-secrets-d330a.txt` | audit de secrets scellé, avant la passe |
| `docs/preuves/D330/tri-audit-d330a.txt` | son tri différentiel contre la dernière sortie scellée |
| `docs/preuves/D330/audit-secrets-d330b.txt` | dernier audit scellé, après la dernière écriture |
| `docs/preuves/D330/tri-audit-d330b.txt` | son tri différentiel |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko du 12/10 (première écriture), décisions du relecteur, ordre des rangs, point d'entrée du rang 36, section D330, protocole de la seconde passe, marque ou refus, bloc D330 de la méthode renforcée, registre |
| `AGENTS.md` | l'annotation de la chaîne du compteur (rang 36, marque ou refus) ; l'écart sur les fichiers `.env` ; passe D277 |
| `ZWADJ_BACKLOG.md` | « Reports du 13/10/2026 — rang 36 (reprise) » ; entrées L35-4, L35-5, L35-6 complétées ; entrée « relecture humaine extérieure » ouverte ; option (b) de D329 fermée ; entrées annotées ou fermées |

### Fichiers CONDITIONNELS — créés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D330/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327, D328, D329) |
| `docs/preuves/D330/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `docs/preuves/D330/aucune-valeur-reelle.txt`, `docs/preuves/D330/aucun-cookie-reel.txt` | un journal à valeurs réelles est produit par la passe (le journal e2e brut ; le journal brut de `test:int` s'il porte des jetons) : les contrôles « 0 valeur réelle » de D299 et D315 ont alors un objet |
| `docs/preuves/D330/diagnostic/` (fichiers déclarés par extension) | un diagnostic NON certifiant est nécessaire après un rouge de la passe |

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur versement

| famille | contenu |
|---|---|
| étape 0 (avant le commit du protocole) | l'état de la machine aux relevés d'ouverture (`chrome` ET `headless_shell`) ; l'**état des fichiers `.env`** (empreinte sha256 et hôte de chaque variable d'URL, **aucune valeur**) avec son outil et sa calibration ; la dérivation des planchers (`git diff` des harnais depuis les deux mesures : lesquels sont réutilisés) ; les outils copiés de D329 avec leurs modifications comptées |
| la passe | les pièces de **SA** passe (point 11) : journaux des six portes, de `--tout`, de `--int`, de `--e2e`, relevés d'arbre, de l'état des `.env` à l'ouverture et à la clôture, échantillonneur, lectures, extrait e2e |
| le rejeu des deux specs sorties de la suite (ajout (b) du relecteur) | `docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts` et `docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts` rejouées SEULES, sans retouche, après la passe ; sorties versées en pièce, pas en porte |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*
