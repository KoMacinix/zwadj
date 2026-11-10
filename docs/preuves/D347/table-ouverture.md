# D347 — rang 49 — table d'ouverture

Lot : **le parcours « Nouvelle réservation » du pro retrouve une spec navigateur** (entrée de backlog de S-142, D344). Consigne du relecteur « RANG 49 », adoptée par Ko telle quelle (`docs/preuves/D347/consigne.md`). Lot de **CODE DE TEST** : il compte (D283), compteur POUR MÉMOIRE VINGT-DEUX → VINGT-TROIS à sa clôture. **Aucune ligne d'`apps/` (R-3)** ; un vrai défaut trouvé s'arrête et se rapporte au backlog.

- **SHA de départ** : `b0db574ec20b733832ec19f22a92e7ceba84fc7d` = `origin/main` (relevé après `git fetch`, avant toute écriture). Branche `main`, arbre propre, aucun stash.
- **Numéro** : **D347** — dernière ligne du registre lue : D346.
- **Poste à l'ouverture** : sur secteur (`Win32_Battery.BatteryStatus` = 2), RAM libre 2 616 Mo, `chrome` et `headless_shell` 0, Docker 29.8.0 lancé, ports 3100/3101 libres. (La barre de RAM est celle d'une certification ; les certifications sont en pause.)

## Fichiers du lot (chemins COMPLETS)

| Fichier | Rôle | Statut |
|---|---|---|
| `docs/preuves/D347/table-ouverture.md` | cette table | ferme |
| `docs/preuves/D347/consigne.md` | la consigne versée | ferme |
| `docs/preuves/D347/lecture-adverse/lecture-adverse.md` | la lecture adverse de la consigne, versée AVANT tout `.md` d'autorité | ferme |
| `docs/preuves/D347/carte.md` | R-2 : pour chaque garde de r32, ce qui la mesure déjà aujourd'hui, ou « personne » | ferme |
| `docs/preuves/D347/rouges/rouges.md` | les rouges lus (spec contre garde neutralisée) avec l'empreinte sha256 du fichier de test joué ; commité AVANT le commit de la spec (D334, point 5) | ferme |
| `docs/preuves/D347/regle-e2e.md` | la règle des deux passes e2e vertes, commitée avant elles (R-15 de D343) | ferme |
| `docs/preuves/D347/audit-secrets-d347a.txt` | audit de secrets avant versement (D298) | ferme |
| `docs/preuves/D347/aucune-valeur-reelle.txt` | contrôle « 0 valeur réelle » (D299) | ferme |
| `docs/preuves/D347/controle-fin-de-lot.txt` | la sortie du contrôle de fin de lot (D288, D328) | ferme |
| `e2e/specs/r49-nouvelle-reservation.e2e.ts` | la spec neuve (R-1), écrite contre l'écran d'aujourd'hui | ferme |
| `neutralisation/neutralize-r49.py` | le harnais du lot (R-4) | ferme |
| `ZWADJ_CONTINUITE.md` | section D347, registre, ordre des rangs, point d'entrée, compteur | ferme |
| `ZWADJ_BACKLOG.md` | R-6 : annotation additive de l'entrée de S-142 ; entrées neuves éventuelles | ferme |
| `AGENTS.md` | R-6 : annotation additive de r32 ; clôture du rang 49 | ferme |

## Fichiers CONDITIONNELS (leur existence dépend d'un résultat)

| Fichier | Condition |
|---|---|
| `docs/preuves/D347/rouges/rouge-1.txt` | seulement si une garde est jouée : sortie brute du rouge numéro 1 ; autant de fichiers `rouge-N.txt` que de gardes, déclarés par EXTENSION avant leur commit |
| `docs/preuves/D347/arret-garde.md` | seulement si l'application contredit une garde (R-3) : la garde arrêtée, la mesure, l'entrée de backlog |
| `docs/preuves/D347/lecture-adverse/ecarts.md` | seulement si la lecture adverse trouve un écart |
| `docs/preuves/D347/portes/portes.md` | les six portes avec leurs chiffres |
| `docs/preuves/D347/e2e/passe-1.txt`, `docs/preuves/D347/e2e/passe-2.txt` | les deux passes e2e complètes |
| `docs/preuves/D347/e2e/rejeu.txt` | seulement si une passe e2e sort rouge |
| `docs/preuves/D347/neutralisation/neutralize-r49.txt` | la sortie du harnais |
| `docs/preuves/D347/audit-secrets-d347b.txt` (et suivants) | un audit par versement supplémentaire |
| `e2e/fixtures/harness.ts` | seulement si une garde exige une aide de préparation absente ; sinon NON touché |
| `neutralisation/lancer-campagnes.py` | seulement si le tri par fichiers touchés exige d'enregistrer r49 ; sinon NON touché |

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, **avant** le commit du fichier qu'elle couvre, avec son motif. *(Aucune à l'ouverture.)*

**Extension 1** (10/11/2026, commitée SEULE, AVANT les pièces qu'elle couvre). Motif : la table nommait certaines pièces par famille (« les six portes », « les deux passes ») ; la règle (D328, point 4) veut le chemin complet. Aucune de ces pièces n'est encore commitée.

| chemin | rôle | statut |
|---|---|---|
| `docs/preuves/D347/rouges/campagne-passe-1.txt` | sortie du harnais, passe 1 (cibles R49-1 à R49-18 mordues, R49-11 muette = mutation équivalente, R49-19 en erreur de script) | à venir |
| `docs/preuves/D347/rouges/campagne-passe-2.txt` | sortie du harnais, reprise (`--seulement`) : R49-11 corrigée, R49-19 à R49-36 | à venir |
| `docs/preuves/D347/rouges/extraits-des-echecs.txt` | par cible, le bloc d'échec lu (journaux bruts NON versés : ils portent des jetons de développement) | à venir |
| `docs/preuves/D347/portes/_index.txt`, `docs/preuves/D347/portes/etat-machine-pendant.txt`, `docs/preuves/D347/portes/typecheck.txt`, `docs/preuves/D347/portes/lint.txt`, `docs/preuves/D347/portes/test.txt`, `docs/preuves/D347/portes/build.txt`, `docs/preuves/D347/portes/test-int.txt`, `docs/preuves/D347/portes/test-e2e.txt` | la passe des six portes (pilote `docs/preuves/D340/portes/passe-secteur.sh`, non modifié) | à venir |
| `docs/preuves/D347/e2e/passe-2-batterie-avant.txt`, `docs/preuves/D347/e2e/passe-2-batterie-apres.txt` | l'alimentation avant et après la seconde passe e2e | à venir |
| `docs/preuves/D347/audit-secrets-d347b.txt`, `docs/preuves/D347/audit-secrets-d347c.txt` | audits de secrets des versements suivants | à venir |
