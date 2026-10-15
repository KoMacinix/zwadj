# D334 — rang 40 — table d'ouverture

Lot : **la session ADVERSE de L35-3, puis la certification qui couvre D331, D332 et D333** (rang 40, arbitré par Ko : « 4. Rang 40 : la session adverse de L35-3, puis la certification qui couvre D331, D332 et D333. »). Il est **DOCUMENTAIRE** (`.md` d'autorité et `docs/preuves/` seulement, D283 amendé par D292 : aucune ligne de code, de test, de harnais ni de migration) ; il ne compte pas dans le compteur de lots de code non certifiés. Compteur à l'ouverture : **TROIS** (rangs 37, 38 et 39) ; il ne repasse à **ZÉRO** que si la certification **PASSE**. La première condition de Ko (14/10/2026) s'applique : le dernier lot (L35-3) est à méthode RENFORCÉE, la certification le suit immédiatement ; **aucun lot de code ne s'ouvre avant elle**.

- **SHA de départ** : `83929a6` (dernier commit de D333). `HEAD` = `origin/main` après `git fetch` (les deux = `83929a696ada7a52654e491d168581990fc2b081`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D334 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D333) ; `git grep -c D334` : 0 fichier.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; consigne du rang 40) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse de D333 (instrument, sortie), **avant toute écriture d'autorité** ; (2 bis) la première passe D277, avant toute écriture d'autorité ; (3) les `.md` d'autorité : **les arbitrages de Ko en première écriture, mot pour mot, seuls dans leur commit**, puis les décisions du relecteur ; la table « Fichiers attendus » y est recopiée **à l'identique**, extensions comprises ; (4) la sortie de la session adverse (entrée par une extension propre qui précède son commit), **avant le protocole** ; (5) l'étape 0 de la certification (outil de la passe avec les trois règles neuves et leurs calibrations, planchers), chaque pièce déclarée par une extension propre AVANT son commit ; (6) le protocole de la passe, commité et POUSSÉ AVANT toute mesure de la passe ; (7) toute extension : un commit propre qui l'ajoute ICI, avec son motif, AVANT le commit du fichier qu'elle couvre.
- **Ce que la session adverse fait** : session à froid (elle n'a pas écrit L35-3), elle tente de casser la numérotation, **ne corrige rien, rapporte**. Elle rejoue F-1 à F-19 du cadrage du sous-lot sur PostgreSQL réel quand le mode touche la base ; neutralise chaque garde neuve par **ses propres** mutations (écrites ici, pas reprises de `neutralize-r39.py`), échec LU par assertion native ; cherche au moins : une création à 23 h 59 à Alger le 31 décembre, deux salles créées en même temps, une restauration de sauvegarde (séquence en retard), une révision d'une révision, la suppression d'une salle qui a des devis, la migration B rejouée sur une copie de la base de développement. **Un défaut BLOQUANT** (numéro dupliqué, révision qui change de numéro, interblocage, donnée perdue, montant touché) : pas de certification, rapport, retour à Ko. Un défaut non bloquant : entrée du backlog, la certification part.
- **Ce que la certification fait** : le critère du rang 9 (points 1 à 12), la forme de D330, avec les **trois règles neuves** de D331 écrites dans l'outil de la passe et calibrées à deux bras **avant** le protocole (RAM à l'ouverture ET à la clôture ; contrôle des `.env` ; `headless_shell` = 0 porte dure) ; les planchers réutilisés seulement pour les harnais inchangés depuis leur dernière mesure (prouvé par `git`), mesurés pour les autres dont au moins `r37`, `r38`, `r39` ; les écarts à la forme NOMMÉS dans le protocole avant la mesure (règle de D-11) ; les prédictions chiffrées ; le rejeu seul, après la passe, des deux specs sorties de la suite.
- **Règle d'arrêt de la certification** : si une porte est rouge ou une cible muette, PAS de marque, rien de corrigé ; la troisième condition de Ko s'applique (trouver d'abord quel lot a introduit le rouge, en rejouant le test fautif sur le commit de chaque lot) ; rapport, retour à Ko.
- **Pourquoi des extensions sont PRÉVUES** : les pièces de la session adverse, de l'étape 0 et de la passe portent des noms qui **dépendent de la mesure** (identifiant de passe, un fichier par mutation, un journal par porte). Elles sont déclarées **en chemins complets, un par un**, par des extensions commitées avant leur versement — jamais par un préfixe (un préfixe rend « 0 non déclaré » vrai par construction : constat P-C1 de D328).

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D334/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D334/lecture-adverse/confronter-d333.py` | l'instrument de la lecture adverse de D333 : objets `git` à SHA fixes, extracteurs calibrés sur un cas vrai et un cas faux |
| `docs/preuves/D334/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D334/passe-d277/balayage.py` | la passe D277, les deux sens (copie à l'octet de celle de D333) |
| `docs/preuves/D334/passe-d277/motifs.txt` | ses motifs, adaptés à ce lot |
| `docs/preuves/D334/passe-d277/balayage-1-AVANT-ECRITURE.txt` | sa première passe, avant toute écriture d'autorité |
| `docs/preuves/D334/passe-d277/balayage-final.txt` | sa dernière passe |
| `docs/preuves/D334/audit-secrets-d334a.txt` | audit de secrets scellé, avant la passe |
| `docs/preuves/D334/tri-audit-d334a.txt` | son tri différentiel contre la dernière sortie scellée |
| `docs/preuves/D334/audit-secrets-d334b.txt` | dernier audit scellé, après la dernière écriture |
| `docs/preuves/D334/tri-audit-d334b.txt` | son tri différentiel |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko du 15/10 (première écriture), décisions du relecteur, ordre des rangs, point d'entrée du rang 40, section D334, protocole de la passe, marque ou refus, registre |
| `AGENTS.md` | la chaîne du compteur (rang 40, marque ou refus) ; la règle de l'ordre des commits étendue (les rouges avant le code, décision 2 du relecteur) ; annotations, jamais de réécriture |
| `ZWADJ_BACKLOG.md` | « Reports du 16/10/2026 — rang 40 » ; entrées de la session adverse ; entrées annotées ou fermées |

### Fichiers CONDITIONNELS — créés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D334/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327 à D333) |
| `docs/preuves/D334/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `docs/preuves/D334/aucune-valeur-reelle.txt`, `docs/preuves/D334/aucun-cookie-reel.txt` | un journal à valeurs réelles est produit par la passe (le journal e2e brut, les journaux par cible de `r25`/`r26`, le journal brut de `test:int` s'il porte des jetons) : les contrôles « 0 valeur réelle » de D299 et D315 |

*(Un diagnostic NON certifiant après un rouge de la passe, ou une pièce de la session adverse, s'il est nécessaire, se déclare lui aussi par extension, fichier par fichier : aucune ligne de cette table ne nomme un répertoire.)*

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur versement

| famille | contenu |
|---|---|
| la session adverse | l'instrument (script), les mutations PROPRES de la session (une pièce par mutation ou un script qui les joue et les restaure), les sorties lues (une par mode de défaillance F-1 à F-19, par mutation, par recherche demandée) ; la sortie versée AVANT le protocole |
| étape 0 (avant le commit du protocole) | l'outil de la passe (copie de celui de D330 avec les trois règles neuves : RAM ouverture ET clôture, `.env`, `headless_shell` = 0 porte dure) et ses calibrations à deux bras ; l'état de la machine aux relevés d'ouverture (`chrome` ET `headless_shell`) ; l'état des `.env` (empreinte, classe d'hôte, aucune valeur) ; les planchers (repris pour les harnais inchangés, prouvé par `git` ; mesurés pour les autres) avec leurs dérivations |
| la passe | les pièces de **SA** passe (point 11) : journaux des six portes, de `--tout`, de `--int`, de `--e2e`, relevés d'arbre, de l'état des `.env` à l'ouverture et à la clôture, de l'inventaire, de la RAM, échantillonneur, lectures, extrait e2e |
| le rejeu des deux specs sorties de la suite | `docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts` et `docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts` rejouées SEULES, sans retouche, après la passe ; sorties versées comme pièces, pas comme portes |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*

#### Extension 1 — les pièces de la SESSION ADVERSE de L35-3 (décision 1 du relecteur), déclarées AVANT leur versement

**Motif** : la famille « la session adverse » de la table d'ouverture ne nomme aucun fichier ; la règle exige des chemins complets. Ces quatorze fichiers existent, non suivis, au moment où cette extension s'écrit ; ils sont versés par le commit qui suit. Aucun fichier du dépôt (hors `docs/preuves/`) n'a été modifié par la session adverse.

| fichier | pour |
|---|---|
| `docs/preuves/D334/session-adverse/RAPPORT.txt` | le rapport de la session adverse : chaque mode de défaillance (fait · attendu · mesuré), les constats non bloquants NB-1 à NB-9 |
| `docs/preuves/D334/session-adverse/adverse-numerotation.int-spec.ts` | sonde 4 : le VRAI code (deux instances Nest/Prisma), quinze tests ; copiée dans `apps/api/test/int/` le temps de la mesure puis RETIRÉE (pièce, jamais suite) |
| `docs/preuves/D334/session-adverse/adverse_base.py` | sonde 2 : les gardes de base attaquées en SQL brut |
| `docs/preuves/D334/session-adverse/adverse_concurrence.py` | sonde 3 : la concurrence, un processus psql par session, étalonnage d'un interblocage |
| `docs/preuves/D334/session-adverse/adverse_derive.py` | sonde 6 : la dérive entre schema.prisma et la base migrée |
| `docs/preuves/D334/session-adverse/adverse_migration.py` | sonde 1 : les migrations A et B rejouées (copie de la base de développement, cas durs, chaîne cassée) |
| `docs/preuves/D334/session-adverse/adverse_mutations.py` | sonde 5 : 54 mutations propres, deux étalons, restauration vérifiée à l'octet |
| `docs/preuves/D334/session-adverse/adverse_outils.py` | outillage commun des sondes SQL |
| `docs/preuves/D334/session-adverse/sortie-1-migrations.txt` | sortie de la sonde 1 |
| `docs/preuves/D334/session-adverse/sortie-2-gardes-de-base.txt` | sortie de la sonde 2 |
| `docs/preuves/D334/session-adverse/sortie-3-concurrence.txt` | sortie de la sonde 3 |
| `docs/preuves/D334/session-adverse/sortie-4-api.txt` | sortie de la sonde 4 sous six fuseaux d'hôte |
| `docs/preuves/D334/session-adverse/sortie-5-mutations.txt` | sortie de la sonde 5 |
| `docs/preuves/D334/session-adverse/sortie-6-derive.txt` | sortie de la sonde 6 |
