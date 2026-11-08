# D345 — les campagnes que le lot touche (rejouées APRÈS la dernière modification de code)

⚠ **Comment la liste a été établie, et pourquoi à la main.** `neutralisation/lancer-campagnes.py` croise `git diff --name-only HEAD` (plus les fichiers non suivis) avec les fichiers que lit chaque campagne : **dès que le code est commité, ce tri est VIDE** (relevé : « 12 fichier(s) modifié(s) depuis HEAD → 0 campagne(s) concernée(s) sur 57 », alors que le lot a modifié 10 fichiers hors `docs/preuves/`). La liste est donc calculée sur `git diff --name-only 942d450..HEAD`, hors `docs/preuves/`, avec **la même fonction de lecture** (`CHEMIN` / `fichiers_lus`) : **17 campagnes** lisent au moins un de ces fichiers — celle du lot (`r47`) et **16 autres**. Entrée de backlog. Chaque campagne a été jouée en MODE UNITAIRE (le mode du tri), l'une après l'autre (elles mutent des sources partagées), sur secteur.

| campagne | sortie | gardes mordues / jouées | non jouées sans `--int` | fichier du lot qui la désigne |
|---|---|---|---|---|
| `act-plafonds` | 0 | 4 / 4 | — | `walkin-journey.test.tsx` |
| `fc5` | 0 | 11 / 11 | — | `App.tsx` |
| `fc6` | 0 | 12 / 12 | — | `walkin-journey.tsx` |
| `fp1` | 0 | 18 / 18 | — | `walkin-journey.tsx` |
| `fp2` | 0 | 6 / 6 | — | `walkin-journey.tsx` |
| `fp3` | **1 → 0** | **9 / 10 → 10 / 10** | — | `walkin-journey.tsx` |
| `horloge` | 0 | 2 / 2 | — | `walkin-journey.test.tsx` |
| `journey` | 0 | 7 neutralisées et ROUGES | — | `walkin-journey.tsx` |
| `r29` | 0 | 15 / 15 | — | `App.tsx` |
| `r32` | 0 | 65 / 65 | — | `walkin-journey.tsx` |
| `r33` | 0 | 87 / 87 | 8 | `walkin-journey.tsx`, `fr.json`, `ar.json` |
| `r38` | 0 | 46 / 46 | — | `walkin-journey.tsx`, `ar.json` |
| `r39` | 0 | 35 / 35 | 16 | `walkin-journey.tsx`, `ar.json` |
| `r41` | 0 | 54 / 54 | 16 | `walkin-journey.tsx` |
| `r42` | 0 | 22 / 22 | 6 | `walkin-journey.tsx` |
| `r43` | 0 | 52 / 52 | 35 | `walkin-journey.tsx` |
| **total des seize autres** | | **446 mordues, 0 muette, 0 non mesurée** (après la mise à jour de fp3) | **81 non jouées sans `--int`** | |
| `r47` (la campagne du lot) | 0 | **25 / 25** | — | `walkin-draft-context.tsx`, `walkin-draft.ts`, `walkin-journey.tsx` |

**Une campagne a trouvé une ANCRE PÉRIMÉE PAR CE LOT** : `fp3`, cible **E-4** (« la version gardée n'est plus liée à la chaîne en cours : après « Annuler », la copie de l'ancien devis fuit »), cherchait le titre de test « ⛔ « Annuler » puis un NOUVEAU devis pour la même fiche » ; le lot l'a renommé « ⛔ « Recommencer » puis un NOUVEAU devis… » (le bouton s'appelle « Recommencer »). Première passe : `9 garde(s) mordue(s) sur 10 cible(s) jouée(s) · 1 muette(s)` — `SANS-TITRE`, **aucun « × » ne porte le titre** (`campagnes/fp3-AVANT-MISE-A-JOUR.txt`, gardée telle quelle). L'ancre est mise à jour (le titre et le libellé ; **aucune mutation ni assertion ne change**), la campagne rejouée EN ENTIER : `10 / 10 · 0 muette` (`campagnes/fp3-APRES-MISE-A-JOUR.txt`). Les autres titres renommés par le lot (cinq) ne sont cherchés par aucune campagne (`grep « Annuler » neutralisation/*.py` : `fp3` ×3, `r38` ×3 — ces derniers parlent du bouton « Annuler » de la boîte de choix, qui n'a pas changé).

**Les 81 cibles « non jouées sans `--int` »** (r33 ×8, r39 ×16, r41 ×16, r42 ×6, r43 ×35) jouent contre PostgreSQL : le lot ne touche ni `apps/api`, ni une migration, ni la base ; elles ne sont **pas mesurées par ce lot** et ne sont **pas** déclarées mordues. `--tout` (une certification) et `--int` n'ont pas été joués : les certifications sont en pause (Ko, DR1 de D336).

**Toutes les sorties sont lues** (`docs/preuves/D345/campagnes/*.txt`, masquées par `masquer-jetons.py` — 0 suite de forme jeton dans chacune) ; **treize** des seize campagnes impriment l'empreinte de leurs fichiers ciblés au départ et à l'arrivée, **0 différente** chacune ; `act-plafonds`, `horloge` et `journey` (d'un format plus ancien) **ne l'impriment pas** — pour elles, la restauration est établie par `git status --short`, relevé **vide** à la fin de la boucle des quinze premières (à la seule exception de `docs/preuves/` en cours d'écriture).
