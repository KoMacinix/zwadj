# D348 — rang 50 — table d'ouverture

Lot : **PUB-1 — une salle publiée se voit sur le site client : vérifier le chemin réel après publication, corriger seulement ce qui est rouge.** Consigne du relecteur « RANG 50 » du 14/11/2026, adoptée par Ko par adoption de son message (elle sera versée dans `docs/preuves/D348/consigne.md`). Lot de **CODE DE TEST** au minimum (une spec e2e neuve et son harnais) : il compte (D283), compteur POUR MÉMOIRE VINGT-TROIS → VINGT-QUATRE à sa clôture. Un correctif de code d'application n'est PAS déclaré ici : il exige une extension de cette table, commitée seule avant son fichier (D328, point 4), et un rouge versé avant le code (R-4, D334 point 5).

- **SHA de départ** : `26ad5c77ec03a73d82e92368f7d97c4beac7556f` = `origin/main` (relevé après `git fetch`, avant toute écriture). Branche `main`, arbre propre, aucun stash.
- **Numéro** : **D348** — dernière ligne du registre lue : D347.
- **Poste à l'ouverture** : sur secteur (`Win32_Battery.BatteryStatus` = 2, 100 %), RAM libre ≈ 4 028 Mo, `chrome` et `headless_shell` 0, Docker 29.8.0 lancé.
- **Branches distantes relevées** : `main`, `front-client`, `par-carte`, et `integration-45` (non annoncée par la consigne ; non touchée).

## Fichiers du lot (chemins COMPLETS)

| Fichier | Rôle | Statut |
|---|---|---|
| `docs/preuves/D348/table-ouverture.md` | cette table | ferme |
| `docs/preuves/D348/consigne.md` | la consigne versée | ferme |
| `docs/preuves/D348/lecture-adverse/lecture-adverse.md` | la lecture adverse de la consigne contre le dépôt, versée AVANT tout `.md` d'autorité | ferme |
| `docs/preuves/D348/par-carte-fichiers.txt` | R-6 : `git diff --name-only origin/main origin/par-carte` et son recoupement avec les fichiers de ce lot | ferme |
| `docs/preuves/D348/regle-e2e.md` | la règle des deux passes e2e vertes, commitée avant elles (R-15 de D343) | ferme |
| `docs/preuves/D348/mesures/m1-chemin-reel.md` | M-1 : le chemin réel, étape par étape, « vu » ou « pas vu », avec renvoi à la pièce | ferme |
| `docs/preuves/D348/mesures/m2-table.md` | M-2 : la table « pourquoi une salle publiée ne s'affiche pas » (condition, liste, fiche, ce que le pro lit), chaque ligne JOUÉE | ferme |
| `docs/preuves/D348/mesures/m3-delais.md` | M-3 : les délais sur un build de production local, durée réduite pour la mesure seule | ferme |
| `docs/preuves/D348/rouges/rouges.md` | les rouges lus (spec contre garde neutralisée, ou contre l'état d'avant) avec l'empreinte sha256 de chaque fichier de test joué ; commité AVANT tout commit de code (D334, point 5) | ferme |
| `docs/preuves/D348/audit-secrets-d348a.txt` | audit de secrets avant versement (D298) | ferme |
| `docs/preuves/D348/aucune-valeur-reelle.txt` | contrôle « 0 valeur réelle » (D299) | ferme |
| `docs/preuves/D348/controle-fin-de-lot.txt` | la sortie du contrôle de fin de lot (D288, D328) | ferme |
| `e2e/specs/r50-salle-publiee.e2e.ts` | la spec neuve (R-1, R-2), écrite contre le chemin réel | ferme |
| `neutralisation/neutralize-pub1.py` | le harnais du lot : chaque garde neuve neutralisée, rouge lu, restaurée | ferme |
| `ZWADJ_CONTINUITE.md` | section D348, registre, ordre des rangs, point d'entrée, compteur | ferme |
| `ZWADJ_BACKLOG.md` | ce que R-4 et R-8 reportent ; l'entrée du cache des référentiels reste candidate | ferme |
| `AGENTS.md` | clôture du rang 50 (annotation additive), si une règle permanente en découle | ferme |

## Fichiers CONDITIONNELS (leur existence dépend d'un résultat)

| Fichier | Condition |
|---|---|
| `docs/preuves/D348/lecture-adverse/ecarts.md` | seulement si la lecture adverse trouve un écart avec la consigne |
| `docs/preuves/D348/mesures/pieces/` (sorties brutes, captures) | chaque pièce citée par M-1, M-2 ou M-3 ; déclarée par EXTENSION, avec ses chemins complets, avant son commit ; journaux bruts versés MASQUÉS (`masquer-jetons.py`) |
| `docs/preuves/D348/rouges/rouge-N.txt` | seulement si une garde est jouée rouge ; un fichier par rouge, déclaré par extension |
| `docs/preuves/D348/arret.md` | seulement si R-7 joue (contrat d'API neuf, migration ou montant dans le navigateur nécessaire) : le besoin et les options, le lot s'arrête |
| `docs/preuves/D348/portes/` (les six portes) et `docs/preuves/D348/e2e/` (les deux passes) | les sorties des portes, déclarées par extension avec chemins complets avant leur commit |
| `docs/preuves/D348/neutralisation/neutralize-pub1.txt` | la sortie du harnais |
| tout fichier sous `apps/`, `packages/`, `e2e/fixtures/` | **AUCUN n'est déclaré** : un correctif (R-4) ou une aide de préparation absente exige une extension, commitée seule, qui nomme le fichier, le rouge qui le justifie et — pour un fichier de la liste de `par-carte` — chaque ligne déplacée (R-6) |
| `neutralisation/lancer-campagnes.py` | seulement si le tri par fichiers touchés exige d'enregistrer le harnais ; sinon NON touché |

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, **avant** le commit du fichier qu'elle couvre, avec son motif. *(Aucune à l'ouverture.)*
