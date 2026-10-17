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
