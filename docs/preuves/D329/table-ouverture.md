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

#### Extension 2

**Motif** : les pièces de **SA** passe (point 11) — le dossier `docs/preuves/D329/passe-r36a-20261012-1651/`, versé par `outils/verser.py` : **191 fichiers copiés et RELUS identiques par SHA-256** (192 parcourus, **1 refusé : le journal brut `e2e.log`**, qui porte des jetons et des cookies) —, plus les pièces qui naissent APRÈS la passe et qui ne sont pas les siennes : le rejeu des deux specs sorties de la suite (ajout (b) du relecteur), le diagnostic non certifiant de l'échec de `test:int`, l'extracteur de ce diagnostic. Chemins COMPLETS, un par un — jamais un préfixe. ⚠ Le journal brut de `pnpm test:int` n'est PAS versé (il porte deux jetons et un hôte de tunnel de développement) : son extrait, `passe-r36a-20261012-1651/testint-EXTRAIT.txt`, l'est. Les deux contrôles « 0 valeur réelle » et « 0 cookie » sont déjà déclarés (fichiers conditionnels) et existent. Ce commit n'ajoute que cette extension.

| fichier | pour |
|---|---|
| `docs/preuves/D329/diagnostic-test-int/bras-avec-client-url-EXTRAIT.txt` | pièce de l'étape |
| `docs/preuves/D329/diagnostic-test-int/bras-sans-surcharge-EXTRAIT.txt` | pièce de l'étape |
| `docs/preuves/D329/outils/extraire-testint.py` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/arbre-1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/arbre-2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/arbre-3.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/arbre-4.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/arbre-5.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/arbre-6.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A10.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A13.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A3.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A4.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A5.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A6.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A7.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A8.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/A9.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/B1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/B2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/calibration-1-defaut-d310.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/calibration-2-commande-introuvable.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/calibration-3-filtre-sans-titre.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/calibration-4-mutation-connue.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/calibration-5-mutation-neutre.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-10.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-11.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-12.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-3.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-4.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-5.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-6.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-7.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-8.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/available-on-api/pre-vol-9.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/build.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/build.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/build.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes-tout.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes-tout.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes-tout.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-404.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-act-plafonds.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-argon2.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-available-on-api.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-available-on.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-b7.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-booking-status.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-budgets.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-e3d1-s8.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-horizon.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-horloge.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-journey.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-maxprice.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-r25.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-r26.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-r29.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-r30.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-r32.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-r33.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-r4.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-rang23.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-s10a.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-s10b.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-s11a.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-s11b.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-s9.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s1.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s2.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s3.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s4.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s5a.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s5b.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s6.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/campagnes/neutralize-solid-s7.py.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/contre-epreuve.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/contre-epreuve.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/contre-epreuve.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/e2e-EXTRAIT.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/e2e-r26.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/e2e-r26.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/e2e-r26.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/e2e.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/e2e.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/echantillonneur-sortie.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/etat-resume.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/etat.csv` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-e3d1-s8.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-e3d1-s8.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-e3d1-s8.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-r25.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-r25.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-r25.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-r33.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-r33.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-r33.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-s11b.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-s11b.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-s11b.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s1.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s1.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s1.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s2.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s2.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s2.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s3.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s3.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s3.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s6.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s6.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/int-solid-s6.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/inventaire-apres-e2e.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/inventaire-cloture.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/inventaire-ouverture.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-available-on-api.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-campagnes.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-etat.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-main-r26.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-portes.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-r26/R26-1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-r26/R26-2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-r26/R26-3.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-r26/R26-4.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lecture-rang23.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lint.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lint.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/lint.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-avant-e2e.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-avant-testint.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-e2e-r26.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-e3d1-s8.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-r25.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-r33.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-s11b.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-solid-s1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-solid-s2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-solid-s3.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-int-solid-s6.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/pg-ouverture.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/porte-dure.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/ports-apres-e2e.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/ports-avant-e2e-r26.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/ports-avant-e2e.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/ports-ouverture.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/progression.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C1-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C1-t-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C1-t-unit-transitions.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C2-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C3-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C4-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C5-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-C6-unit-transitions.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-F1-a-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-F1-b-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-F5-a-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-F5-b-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/R23-F5-c-unit-transitions.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/pre-vol-int-reservations.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/rang23/pre-vol-unit-transitions.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-apres-e2e-r26.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-apres-e2e.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-build.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-campagnes.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-e2e-r26.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-e2e.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-e3d1-s8.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-r25.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-r33.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-s11b.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-solid-s1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-solid-s2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-solid-s3.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-int-solid-s6.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-lint.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-test.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-testint.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-avant-typecheck.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-cloture.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-ouverture-1.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/sonde-ouverture-2.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/test.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/test.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/test.log` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/testint-EXTRAIT.txt` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/testint.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/testint.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/typecheck.code` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/typecheck.heures` | pièce de l'étape |
| `docs/preuves/D329/passe-r36a-20261012-1651/typecheck.log` | pièce de l'étape |
| `docs/preuves/D329/rejeu-specs/inventaire-apres-rejeu.txt` | pièce de l'étape |
| `docs/preuves/D329/rejeu-specs/inventaire-avant-rejeu.txt` | pièce de l'étape |
| `docs/preuves/D329/rejeu-specs/r30-lien-calendrier-pro-EXTRAIT.txt` | pièce de l'étape |
| `docs/preuves/D329/rejeu-specs/r32-nouvelle-reservation-EXTRAIT.txt` | pièce de l'étape |
