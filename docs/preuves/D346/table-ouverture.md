# D346 — rang 48 — table d'ouverture

Lot : **l'assistant de recherche client : les choix déjà faits doivent reparaître** (apps/client). Constat de Ko, mot pour mot (chat du relecteur, 08/11/2026) : « rien n'est autopopuler apres avoir mis les choix ». Consigne du relecteur « RANG 48 », adoptée par Ko telle quelle (`docs/preuves/D346/consigne.md`). Lot de **CODE** : il compte (D283), compteur POUR MÉMOIRE VINGT ET UN → VINGT-DEUX à sa clôture — **mais seulement si R-1 montre un rouge** ; sinon (R-4) aucun code, le lot ne compte pas. Aucun contrat d'API, aucune migration, `apps/api` et `apps/pro` intouchés (R-5).

- **SHA de départ** : `caa5e4cf4a8791b70d76acb4dd0a75ae1b75c15a` = `origin/main` (relevé après `git fetch`, avant toute écriture). Branche `main`, arbre propre, aucun stash.
- **Numéro** : **D346** — dernière ligne du registre lue : D345.
- **Poste à l'ouverture** : sur secteur (`Win32_Battery.BatteryStatus` = 2), RAM libre 4 189 Mo, `chrome` et `headless_shell` 0, Docker 29.8.0 lancé.

## Fichiers du lot (chemins COMPLETS)

| Fichier | Rôle | Statut |
|---|---|---|
| `docs/preuves/D346/table-ouverture.md` | cette table | ferme |
| `docs/preuves/D346/consigne.md` | la consigne versée | ferme |
| `docs/preuves/D346/lecture-adverse/lecture-adverse.md` | la lecture adverse de la consigne | ferme |
| `docs/preuves/D346/reproduction/reproduction.md` | R-1 : ce qui a été joué dans le navigateur, endroit par endroit, valeur mesurée | ferme |
| `docs/preuves/D346/scenarios-ko.md` | les gestes de Ko | ferme |
| `docs/preuves/D346/controle-fin-de-lot.txt` | la sortie du contrôle de fin de lot | ferme |
| `docs/preuves/D346/audit-secrets-d346a.txt` | audit de secrets avant versement (D298) | ferme |
| `ZWADJ_CONTINUITE.md` | section D346, registre, ordre des rangs, point d'entrée, compteur | ferme |
| `ZWADJ_BACKLOG.md` | R-7 : annotation additive de L36-4 ; entrées neuves éventuelles | ferme |
| `AGENTS.md` | annotation additive (clôture du rang 48) | ferme |

## Fichiers CONDITIONNELS (leur existence dépend d'un défaut ou d'un résultat)

| Fichier | Condition |
|---|---|
| `docs/preuves/D346/reproduction/rouge-*.txt` | les sorties brutes de R-1, une par endroit trouvé rouge (jamais déduit du code) |
| `docs/preuves/D346/rouges/rouges.md` et `docs/preuves/D346/rouges/rouge-*.txt` | seulement si R-1 montre un rouge : les tests rouges lus, avec l'empreinte sha256 de chaque fichier de test joué ; commités AVANT le premier commit de code (D334, point 5) |
| `docs/preuves/D346/regle-e2e.md` | seulement si du code part : la règle des deux passes e2e vertes, commitée avant elles (R-15 de D343) |
| `docs/preuves/D346/neutralisation/neutralize-r48.txt` | seulement si du code part : la sortie du harnais |
| `docs/preuves/D346/portes/portes.md` | seulement si du code part : les six portes avec leurs chiffres |
| `docs/preuves/D346/e2e/passe-1.txt`, `docs/preuves/D346/e2e/passe-2.txt` | seulement si du code part : les deux passes e2e complètes |
| `docs/preuves/D346/e2e/rejeu.txt` | seulement si une passe e2e sort rouge |
| `docs/preuves/D346/audit-secrets-d346b.txt` (et suivants) | un audit par versement supplémentaire |
| `docs/preuves/D346/lecture-adverse/ecarts.md` | seulement si la lecture adverse trouve un écart |
| `apps/client/src/components/search/search-view.tsx` | seulement si R-1 montre rouge le formulaire des filtres (piste de R-2) |
| `apps/client/src/components/search/search-view.test.tsx` | seulement si `search-view.tsx` est touché : test de composant du rouge |
| `apps/client/src/components/filter-wizard.tsx` | seulement si R-1 montre rouge l'assistant lui-même |
| `apps/client/src/components/filter-wizard.test.tsx` | seulement si `filter-wizard.tsx` est touché : test de composant du rouge |
| `e2e/specs/r48-assistant-choix.e2e.ts` | seulement si du code part : le rouge en navigateur (R-6), FR et AR |
| `neutralisation/neutralize-r48.py` | seulement si du code part : le harnais du lot (R-6) |
| `neutralisation/lancer-campagnes.py` | seulement si le tri par fichiers touchés exige d'enregistrer r48 (sinon NON touché) |

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, **avant** le commit du fichier qu'elle couvre, avec son motif. *(Aucune à l'ouverture.)*
