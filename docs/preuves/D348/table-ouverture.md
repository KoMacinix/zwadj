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

**Extension 1** (16/11/2026, commitée SEULE, AVANT les pièces qu'elle couvre). Motif : la table nommait les pièces de mesure par famille (« sorties brutes, captures ») ; la règle (D328, point 4) veut le chemin complet. Aucune de ces pièces n'est encore commitée. Le premier défaut mesuré (la fiche d'une salle masquée ou supprimée reste servie, M-3) ne déclare AUCUN fichier de code ici : sa correction fera l'objet de l'extension 2, après le commit des rouges.

| chemin | rôle | statut |
|---|---|---|
| `docs/preuves/D348/rouges/rouges.md` | les rouges lus, avec l'empreinte des fichiers joués | à venir |
| `docs/preuves/D348/rouges/rouge-1-e2e-r50-contre-etat-avant.txt` | la spec contre le code d'avant (9 passés, 1 échec), jetons retirés | à venir |
| `docs/preuves/D348/mesures/m1-chemin-reel.md` | M-1 rédigée | à venir |
| `docs/preuves/D348/mesures/m2-table.md` | M-2 rédigée | à venir |
| `docs/preuves/D348/mesures/m3-delais.md` | M-3, état ROUGE (l'état « après la correction » s'y ajoutera) | à venir |
| `docs/preuves/D348/mesures/pieces/m2-table-brute.json` | la table M-2 brute, extraite de la sortie du rouge 1 | à venir |
| `docs/preuves/D348/mesures/pieces/m3-rouge-sortie-brute.txt` | la sortie brute de la mesure de production | à venir |
| `docs/preuves/D348/mesures/pieces/m3-instrument.mjs` | l'instrument jetable de M-3, archivé comme pièce | à venir |
| `docs/preuves/D348/mesures/pieces/avant-fr-accueil.png`, `docs/preuves/D348/mesures/pieces/avant-fr-salles.png`, `docs/preuves/D348/mesures/pieces/avant-ar-accueil.png`, `docs/preuves/D348/mesures/pieces/avant-ar-salles.png` | l'état d'avant la publication (catalogue vide : salles fictives et bandeau) | à venir |
| `docs/preuves/D348/mesures/pieces/apres-fr-salles.png`, `docs/preuves/D348/mesures/pieces/apres-ar-salles.png` | l'état d'après (cartes réelles, pas de bandeau) | à venir |
| `docs/preuves/D348/audit-secrets-d348b.txt`, `docs/preuves/D348/aucune-valeur-reelle-b.txt` | l'audit de secrets de ce versement et son tri | à venir |

**Extension 2** (16/11/2026, commitée SEULE, AVANT les fichiers qu'elle couvre). Motif : **R-4 joue** — la mesure M-3 a trouvé un défaut réel (la fiche d'une salle MASQUÉE ou SUPPRIMÉE reste servie en 200, sur un build de production, plus de dix minutes et après un redémarrage, alors que l'API répond 404 ; le nom, le prix et les photos d'une salle modifiée restent périmés jusqu'à 5 minutes) ; le rouge est versé (`docs/preuves/D348/rouges/rouges.md`, rouges 1 et 2) AVANT le premier commit de code. La correction est la plus petite possible : **une seule ligne de code** (`next: { revalidate: 300 }` → `cache: "no-store"` dans `getVenueBySlug`), plus les commentaires que cette ligne rendait faux. Les mêmes trois fichiers sont déclarés ici, nominativement :

| chemin | rôle | statut |
|---|---|---|
| `apps/client/src/lib/api.ts` | la correction : l'appel de `getVenueBySlug` (1 ligne de code) et son commentaire (+7 −3 lignes de commentaire). ⚠ **Fichier de la liste de `par-carte`** (R-6) : `par-carte` y modifie la ligne d'import (l. 10) et AJOUTE `getVenueMap` en fin de fichier ; les lignes de cette correction (l. 183 à 198) ne sont dans aucun de ses blocs — pas de conflit attendu, à vérifier par `git merge-tree` au rapport | ferme |
| `apps/client/src/app/[locale]/salles/[slug]/page.tsx` | commentaire d'en-tête seulement (3 lignes) ; HORS de la liste de `par-carte` | ferme |
| `apps/client/src/app/[locale]/salles/(recherche)/loading.tsx` | commentaire seulement (3 lignes) ; HORS de la liste de `par-carte` | ferme |
| `docs/preuves/D348/rouges/verser-journal.py` | le script qui a retiré les lignes à jeton du journal brut avant versement, archivé comme preuve (jamais promu en instrument, D291) | à venir |

**Extension 3** (16/11/2026, commitée SEULE, AVANT les pièces qu'elle couvre). Motif : la table nommait la campagne, les portes et les passes e2e par famille (« la sortie du harnais », « les six portes », « les deux passes ») ; la règle (D328, point 4) veut les chemins complets. Aucune de ces pièces n'est encore commitée. Le code (la correction, la spec, le harnais) est déjà commité (`411d373`, `ac728d8`) ; il n'ajoute aucun fichier hors table.

| chemin | rôle | statut |
|---|---|---|
| `docs/preuves/D348/neutralisation/campagne-passe-1.txt`, `docs/preuves/D348/neutralisation/campagne-passe-2.txt` | les deux premières passes de la campagne (harnais v1, v2), arrêtées sur PUB1-17 ; versées pour dire ce qu'elles ont montré | à venir |
| `docs/preuves/D348/neutralisation/campagne-passe-3.txt`, `docs/preuves/D348/neutralisation/campagne-passe-3-reprise-avortee.txt`, `docs/preuves/D348/neutralisation/campagne-passe-3-reprise.txt` | la passe du harnais FINAL (20 cibles) : cibles 1 à 12, puis la reprise avortée (Docker arrêté), puis la reprise déclarée `--seulement` de 13 à 21 | à venir |
| `docs/preuves/D348/neutralisation/extraits-des-echecs.txt` | par cible, le bloc d'échec lu (20 cibles) | à venir |
| `docs/preuves/D348/neutralisation/campagnes-existantes/neutralize-404.txt`, `docs/preuves/D348/neutralisation/campagnes-existantes/neutralize-available-on.txt`, `docs/preuves/D348/neutralisation/campagnes-existantes/neutralize-fc10.txt`, `docs/preuves/D348/neutralisation/campagnes-existantes/neutralize-fc10-e2e.txt`, `docs/preuves/D348/neutralisation/campagnes-existantes/neutralize-horizon.txt` | les campagnes existantes qui lisent un fichier de ce lot (`lancer-campagnes.py` ne les voit pas : arbre propre, comparaison à `HEAD`) | à venir |
| `docs/preuves/D348/portes/_index.txt`, `docs/preuves/D348/portes/etat-machine-pendant.txt`, `docs/preuves/D348/portes/typecheck.txt`, `docs/preuves/D348/portes/lint.txt`, `docs/preuves/D348/portes/test.txt`, `docs/preuves/D348/portes/build.txt`, `docs/preuves/D348/portes/test-int.txt`, `docs/preuves/D348/portes/test-e2e.txt` | la passe des six portes (pilote `docs/preuves/D340/portes/passe-secteur.sh`, non modifié) ; `test-e2e.txt` est la PASSE 1 de l'e2e | à venir |
| `docs/preuves/D348/portes/test-rouge-instruction.md`, `docs/preuves/D348/portes/test-rejeux-fichier-seul.txt` | la porte `test` est rouge (un test de `apps/pro`, hors du lot) : ce qui a été instruit | à venir |
| `docs/preuves/D348/e2e/passe-2.txt`, `docs/preuves/D348/e2e/passe-2-batterie-avant.txt`, `docs/preuves/D348/e2e/passe-2-batterie-apres.txt` | la seconde passe e2e et l'alimentation avant et après | à venir |
| `docs/preuves/D348/mesures/pieces/m3-apres-sortie.txt`, `docs/preuves/D348/mesures/pieces/m3-instrument-apres.mjs` | M-3 rejouée APRÈS la correction, et sa copie d'instrument | à venir |
| `docs/preuves/D348/audit-secrets-d348c.txt` | l'audit de secrets de ce versement | à venir |

**Extension 4** (16/11/2026, commitée SEULE, AVANT le fichier qu'elle couvre). Motif : l'extension 3 nommait l'audit de secrets du dernier versement mais pas son tri ; la table n'avait pas non plus la sortie du contrôle de fin de lot sous son chemin de versement tardif. Aucun de ces fichiers n'est encore commité.

| chemin | rôle | statut |
|---|---|---|
| `docs/preuves/D348/aucune-valeur-reelle-c.txt` | le tri des alertes nouvelles de l'audit « c » et le contrôle dédié « 0 valeur réelle » (55 journaux, 354 valeurs, 0 porteur) | à venir |
