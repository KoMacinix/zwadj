# D328 — rang 35 — table d'ouverture

Lot **DOCUMENTAIRE** : le cadrage de la base de données client (et de tout ce que le lot correctif doit porter). Aucune ligne de code.

- **SHA de départ** : `ab8e6f6` (clôture de D327). `HEAD` = `origin/main` après `git fetch`, arbre propre, aucun stash, branche `main`.
- **Numéro** : D328 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D327), et vérifié absent des quatre fichiers d'autorité (`D328` : 0, 0, 0, 0).
- **Ordre des commits de ce lot** (règle acceptée par Ko le 11/10/2026) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse, puis les pièces de l'état des lieux, avant toute écriture d'autorité ; (3) les `.md` d'autorité, les arbitrages de Ko en première écriture, cette table recopiée à l'identique ; (4) toute extension : un commit propre qui l'ajoute ICI, avant le commit du fichier qu'elle couvre.

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D328/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D328/lecture-adverse/confronter-d327.py` | l'instrument de la lecture adverse de D327 |
| `docs/preuves/D328/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D328/etat-des-lieux/sondes.py` | l'état des lieux de la base de développement : `SELECT` seulement |
| `docs/preuves/D328/etat-des-lieux/sondes-sortie.txt` | sa sortie (données personnelles masquées) |
| `docs/preuves/D328/etat-des-lieux/releve-code.py` | l'état des lieux du code : où un téléphone est saisi, normalisé ; la `Commission` ; l'origine ; les noms |
| `docs/preuves/D328/etat-des-lieux/releve-code-sortie.txt` | sa sortie |
| `docs/preuves/D328/passe-d277/balayage.py` | la passe D277, les deux sens (copie à l'octet de celle de D327) |
| `docs/preuves/D328/passe-d277/motifs.txt` | ses motifs |
| `docs/preuves/D328/passe-d277/balayage-1-AVANT-ECRITURE.txt` | sa première passe, avant toute écriture d'autorité |
| `docs/preuves/D328/passe-d277/balayage-final.txt` | sa dernière passe |
| `docs/preuves/D328/audit-secrets-d328a.txt` | audit de secrets scellé, avant les `.md` finaux |
| `docs/preuves/D328/tri-audit-d328a.txt` | son tri différentiel contre la dernière sortie scellée |
| `docs/preuves/D328/audit-secrets-d328b.txt` | dernier audit scellé, après la dernière écriture |
| `docs/preuves/D328/tri-audit-d328b.txt` | son tri différentiel |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko, ordre des rangs, point d'entrée du rang 35, section D328, bloc D328 de la méthode renforcée, registre |
| `AGENTS.md` | la règle de l'ordre des commits d'un lot (avec son motif) ; annotation de la chaîne du compteur ; passe D277 |
| `ZWADJ_BACKLOG.md` | « Reports du 11/10/2026 — rang 35 » ; entrées annotées ou fermées |

### Fichiers CONDITIONNELS — créés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D328/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327) |
| `docs/preuves/D328/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*
