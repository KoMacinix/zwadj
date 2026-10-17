# D335 — rang 40, REPRISE — table d'ouverture

Lot : **la REPRISE du rang 40 — la PASSE de la certification qui couvre D331, D332 et D333**, après une lecture adverse de tout ce qui s'est écrit depuis la clôture de D334 (rang 40, arbitré par Ko le 15/10/2026 : « 4. Rang 40 : la session adverse de L35-3, puis la certification qui couvre D331, D332 et D333. » ; consigne de reprise du 17/10/2026). Il est **DOCUMENTAIRE** (`.md` d'autorité et `docs/preuves/` seulement, D283 amendé par D292 : aucune ligne de code, de test, de harnais ni de migration) ; il ne compte pas dans le compteur de lots de code non certifiés. Compteur à l'ouverture : **TROIS** ; il ne repasse à **ZÉRO** que si la certification **PASSE**.

- **SHA de départ** : `b92dc7a` (dernier commit de D334, clôture de la session du 15/10/2026). `HEAD` = `origin/main` après `git fetch` (les deux = `b92dc7af5111f40291a7b544fb183b9d6edda022`), arbre propre, aucun stash, branche `main`. Le code mesuré est celui de `83929a6` : `git diff --name-only 83929a6..b92dc7a` ne contient, hors `docs/preuves/`, que `AGENTS.md`, `ZWADJ_BACKLOG.md` et `ZWADJ_CONTINUITE.md`.
- **Numéro** : D335 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D334) ; `git grep -c D335` avant le lot : aucun fichier de texte (une seule occurrence, dans les octets d'une image JPEG de `docs/preuves/D315/captures/`).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; consigne de reprise) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse de D334 (instrument, sortie), puis la première passe D277, **avant toute écriture d'autorité** ; (3) les `.md` d'autorité : **les arbitrages de Ko du 17/10/2026 en première écriture, mot pour mot, seuls dans leur commit**, puis les décisions du relecteur ; la table « Fichiers attendus » y est recopiée **à l'identique**, extensions comprises ; (4) la **note d'ouverture de la reprise** (décision S-38 de D334, ratifiée par Ko) — nouvel identifiant de passe, état machine relevé avant elle, SHA du code mesuré —, commitée ET POUSSÉE **avant toute mesure de la passe** ; (5) toute extension : un commit propre qui l'ajoute ICI, avec son motif, AVANT le commit du fichier qu'elle couvre. Les pièces de la passe elle-même se versent **après** elle.
- **Ce que cette reprise ne change pas** : le protocole de D334 (`6e78b23`) — même outil (`docs/preuves/D334/outils/passe.py`), mêmes planchers, mêmes prédictions, mêmes écarts nommés. Le dossier de destination de `verser.py` est resté `docs/preuves/D334/passe-<ID>/` : les pièces de la passe y seront versées, **déclarées une à une par une extension de cette table**, sans retouche de l'outil.
- **Règle d'arrêt de la passe** : une porte dure rouge (RAM, `.env`, `chrome`, `headless_shell`, `node`, secteur) ⇒ elle ne démarre pas, la pièce est versée comme à D334, le blocage revient à Ko ; **la barre n'est pas abaissée, même pour un essai**. Une porte rouge ou une cible muette ⇒ PAS de marque, rien de corrigé, la troisième condition de Ko s'applique (trouver d'abord quel lot a introduit le rouge, en rejouant le test fautif sur le commit de chaque lot).
- **Pourquoi des extensions sont PRÉVUES** : les pièces de la passe portent des noms qui **dépendent de la mesure** (identifiant de passe, un journal par porte et par campagne). Elles sont déclarées **en chemins complets, un par un**, par des extensions commitées avant leur versement — jamais par un préfixe (constat P-C1 de D328).

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D335/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D335/lecture-adverse/confronter-d334.py` | l'instrument de la lecture adverse de D334 : objets `git` à SHA fixes, extracteurs calibrés sur un cas vrai et un cas faux |
| `docs/preuves/D335/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D335/passe-d277/balayage.py` | la passe D277, les deux sens (copie à l'octet de celle de D334) |
| `docs/preuves/D335/passe-d277/motifs.txt` | ses motifs, adaptés à ce lot |
| `docs/preuves/D335/passe-d277/balayage-1-AVANT-ECRITURE.txt` | sa première passe, avant toute écriture d'autorité |
| `docs/preuves/D335/passe-d277/balayage-final.txt` | sa dernière passe |
| `docs/preuves/D335/audit-secrets-d335a.txt` | audit de secrets scellé, avant la passe |
| `docs/preuves/D335/tri-audit-d335a.txt` | son tri différentiel contre la dernière sortie scellée |
| `docs/preuves/D335/audit-secrets-d335b.txt` | dernier audit scellé, après la dernière écriture |
| `docs/preuves/D335/tri-audit-d335b.txt` | son tri différentiel |
| `docs/preuves/D335/etat/sonde-avant-passe.txt` | l'état de la machine relevé avant la passe (sonde, RAM) : source de la note d'ouverture |
| `docs/preuves/D335/etat/inventaire-avant-passe.txt` | l'inventaire des processus avant la passe (`chrome`, `headless_shell`, `node`) |
| `docs/preuves/D335/etat/etat-env-avant-passe.txt` | l'état des `.env` avant la passe (empreintes, classes d'hôte, aucune valeur) |
| `docs/preuves/D335/rejeu-specs/r32-nouvelle-reservation-sortie.txt` | le rejeu SEUL, après la passe, de la spec sortie de la suite (rang 32) : pièce, pas porte |
| `docs/preuves/D335/rejeu-specs/r30-lien-calendrier-pro-sortie.txt` | le rejeu SEUL, après la passe, de la spec sortie de la suite (rang 30) : pièce, pas porte |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko du 17/10 (première écriture), décisions du relecteur, ordre des rangs, note d'ouverture de la reprise, section D335, marque ou refus, registre |
| `AGENTS.md` | la chaîne du compteur (marque ou refus) ; l'annotation de la liste « `prisma migrate dev` est INTERDIT » (NB-4) ; annotations, jamais de réécriture |
| `ZWADJ_BACKLOG.md` | NB-5 fermée avec renvoi, NB-3 étendue (compteurs de devis), NB-6 devenue décision de Ko, « Reports du 17/10/2026 — rang 40 reprise » |

### Fichiers CONDITIONNELS — créés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D335/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327 à D334) |
| `docs/preuves/D335/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `docs/preuves/D335/aucune-valeur-reelle.txt`, `docs/preuves/D335/aucun-cookie-reel.txt` | un journal à valeurs réelles est produit par la passe : les contrôles « 0 valeur réelle » de D299 et D315 |
| `docs/preuves/D335/passe-NON-DEMARREE/*` | la porte dure d'ouverture est rouge : les pièces brutes du non-démarrage, déclarées une à une par extension |

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur versement

| famille | contenu |
|---|---|
| la passe | les pièces de **SA** passe (point 11), versées par `docs/preuves/D334/outils/verser.py` dans `docs/preuves/D334/passe-<IDENTIFIANT>/` (destination du protocole, outil non retouché) : journaux des six portes, de `--tout`, de `--int`, de `--e2e`, relevés d'arbre, de l'état des `.env` à l'ouverture et à la clôture, de l'inventaire, de la RAM, échantillonneur, lectures, extrait e2e |
| la troisième condition | si une porte est rouge : les sorties du rejeu du test fautif sur le commit de chaque lot (D331, D332, D333) |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre.

#### Extension 1 — les pièces de la PASSE `r40-20261017-reprise` (portes, campagnes, lectures, extrait e2e) et les deux inventaires du rejeu des specs, déclarées AVANT leur versement

**Motif** : la famille « la passe » de la table d'ouverture ne nomme aucun fichier ; la règle exige des chemins complets. La passe a eu lieu (17/10/2026 14:27:46 → 17:39:10, code de sortie 0) sur le commit `f2aca6e` ; ses 203 pièces existent dans `.neutralisation-journaux/r40-20261017-reprise/` (ignoré par git) et sont versées par `docs/preuves/D334/outils/verser.py` (destination du protocole, outil non retouché) dans `docs/preuves/D334/passe-r40-20261017-reprise/` ; le journal e2e brut (`e2e.log`) est REFUSÉ par l'outil (point 9) et remplacé par `e2e-EXTRAIT.txt`. Les lectures (`lecture-*.txt`, `lecture-r26/`) et l'extrait sont ceux que le protocole écrit APRÈS la clôture, dans le dossier de la passe, avant le versement.

| fichier | pour |
|---|---|
| `docs/preuves/D334/passe-r40-20261017-reprise/arbre-1.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/arbre-2.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/arbre-3.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/arbre-4.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/arbre-5.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/arbre-6.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A1.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A10.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A13.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A2.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A3.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A4.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A5.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A6.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A7.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A8.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/A9.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/B1.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/B2.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/calibration-1-defaut-d310.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/calibration-2-commande-introuvable.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/calibration-3-filtre-sans-titre.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/calibration-4-mutation-connue.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/calibration-5-mutation-neutre.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-1.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-10.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-11.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-12.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-2.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-3.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-4.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-5.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-6.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-7.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-8.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/available-on-api/pre-vol-9.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/build.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/build.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/build.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes-tout.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes-tout.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes-tout.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-404.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-act-plafonds.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-argon2.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-available-on-api.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-available-on.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-b7.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-booking-status.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-budgets.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-e3d1-s8.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-horizon.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-horloge.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-journey.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-maxprice.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r25.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r26.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r29.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r30.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r32.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r33.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r37.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r38.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r39.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-r4.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-rang23.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-s10a.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-s10b.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-s11a.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-s11b.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-s9.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s1.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s2.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s3.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s4.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s5a.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s5b.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s6.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/campagnes/neutralize-solid-s7.py.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/contre-epreuve.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/contre-epreuve.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/contre-epreuve.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/e2e-EXTRAIT.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/e2e-r26.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/e2e-r26.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/e2e-r26.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/e2e.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/e2e.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/echantillonneur-sortie.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/etat-env-cloture.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/etat-env-comparaison.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/etat-env-ouverture.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/etat-resume.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/etat.csv` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-e3d1-s8.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-e3d1-s8.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-e3d1-s8.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r25.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r25.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r25.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r33.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r33.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r33.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r39.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r39.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-r39.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-s11b.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-s11b.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-s11b.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s1.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s1.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s1.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s2.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s2.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s2.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s3.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s3.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s3.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s6.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s6.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/int-solid-s6.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/inventaire-apres-e2e.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/inventaire-cloture.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/inventaire-ouverture.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-available-on-api.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-campagnes.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-etat.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-main-r26.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-portes.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-r26/R26-1.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-r26/R26-2.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-r26/R26-3.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-r26/R26-4.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lecture-rang23.txt` | lecture ou extrait écrit APRÈS la clôture de la passe, dans le dossier de la passe, versé avec lui (le journal e2e brut n'entre pas, point 9) |
| `docs/preuves/D334/passe-r40-20261017-reprise/lint.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/lint.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/lint.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-avant-e2e.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-avant-testint.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-e2e-r26.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-e3d1-s8.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-r25.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-r33.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-r39.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-s11b.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-solid-s1.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-solid-s2.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-solid-s3.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-int-solid-s6.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/pg-ouverture.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/porte-dure.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/ports-apres-e2e.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/ports-avant-e2e-r26.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/ports-avant-e2e.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/ports-ouverture.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/progression.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/ram-intermediaires.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C1-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C1-t-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C1-t-unit-transitions.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C2-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C3-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C4-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C5-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-C6-unit-transitions.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-F1-a-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-F1-b-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-F5-a-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-F5-b-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/R23-F5-c-unit-transitions.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/pre-vol-int-reservations.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/rang23/pre-vol-unit-transitions.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-apres-e2e-r26.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-apres-e2e.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-build.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-campagnes.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-e2e-r26.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-e2e.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-e3d1-s8.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-r25.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-r33.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-r39.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-s11b.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-solid-s1.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-solid-s2.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-solid-s3.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-int-solid-s6.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-lint.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-test.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-testint.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-avant-typecheck.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-cloture.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-ouverture-1.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/sonde-ouverture-2.txt` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/test.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/test.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/test.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/testint.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/testint.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/testint.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/typecheck.code` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/typecheck.heures` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D334/passe-r40-20261017-reprise/typecheck.log` | pièce de SA passe (point 11) : copie octet pour octet du dossier de la passe, relue par SHA-256 |
| `docs/preuves/D335/rejeu-specs/inventaire-avant-rejeu.txt` | inventaire des navigateurs et de `node` avant / après le rejeu SEUL des deux specs sorties de la suite (pièce, pas porte) |
| `docs/preuves/D335/rejeu-specs/inventaire-apres-rejeu.txt` | inventaire des navigateurs et de `node` avant / après le rejeu SEUL des deux specs sorties de la suite (pièce, pas porte) |
