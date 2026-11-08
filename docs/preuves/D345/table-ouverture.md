# D345 — rang 47 — table d'ouverture

Lot : **le parcours « Nouvelle réservation » du pro (client sur place) garde son étape et ses saisies quand on change d'onglet** (apps/pro). Demande de Ko, mot pour mot (chat du relecteur, 08/11/2026) : « faire en sorte de garder en memoir l'etape et les donner dans le processus du client sur place, et ne pas revenir au debut des qu'en passe a un onglet demande ou autre et revenir pour trouver qu'on reviens a l'etape de depart ». Consigne du relecteur « RANG 47 », adoptée par Ko telle quelle (`docs/preuves/D345/consigne.md`). Lot de **CODE** : il compte (D283), compteur POUR MÉMOIRE VINGT → VINGT ET UN à sa clôture. Aucun contrat d'API, aucune migration, `apps/api` intouché (R-5).

- **SHA de départ** : `942d45025ded6556a11f8a5310ebe93b4c997c85` = `origin/main` (relevé après `git fetch`, avant toute écriture). Branche `main`, arbre propre, aucun stash.
- **Numéro** : **D345** — dernière ligne du registre lue : D344.
- **Poste à l'ouverture** : sur secteur (`Win32_Battery.BatteryStatus` = 2), RAM libre 3 513 Mo, `chrome` 0, Docker 29.8.0 lancé.

## Fichiers du lot (chemins COMPLETS)

| Fichier | Rôle | Statut |
|---|---|---|
| `docs/preuves/D345/table-ouverture.md` | cette table | ferme |
| `docs/preuves/D345/consigne.md` | la consigne versée | ferme |
| `docs/preuves/D345/lecture-adverse/lecture-adverse.md` | la lecture adverse de la consigne | ferme |
| `docs/preuves/D345/rouges/rouges.md` | les rouges lus, avec l'empreinte sha256 des fichiers de test joués | ferme |
| `docs/preuves/D345/regle-e2e.md` | la règle des deux passes e2e vertes, commitée avant | ferme |
| `docs/preuves/D345/comptage-secret.md` | R-9 : comptage de GOCSPX par `.env` (nombres seuls) | ferme |
| `docs/preuves/D345/neutralisation/neutralize-r47.txt` | la sortie du harnais r47 | ferme |
| `docs/preuves/D345/portes/portes.md` | les six portes avec leurs chiffres | ferme |
| `docs/preuves/D345/e2e/passe-1.txt` | première passe e2e complète | ferme |
| `docs/preuves/D345/e2e/passe-2.txt` | seconde passe e2e complète | ferme |
| `docs/preuves/D345/scenarios-ko.md` | les gestes de Ko | ferme |
| `docs/preuves/D345/controle-fin-de-lot.txt` | la sortie du contrôle de fin de lot | ferme |
| `docs/preuves/D345/audit-secrets-d345a.txt` | audit de secrets avant versement (D298) | ferme |
| `apps/pro/src/dashboard/walkin-draft.ts` | module PUR : forme du brouillon, `brouillonVierge`, `brouillonPourSalle` | ferme |
| `apps/pro/src/dashboard/walkin-draft-context.tsx` | le fournisseur React, en mémoire seulement | ferme |
| `apps/pro/src/dashboard/walkin-draft.test.tsx` | tests du fournisseur et du module pur, garde de SOURCE (aucun stockage navigateur) | ferme |
| `apps/pro/src/dashboard/walkin-journey.tsx` | le parcours lit et écrit le brouillon | ferme |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` | tests de l'aller-retour, du rechargement, de « Recommencer » ; trois matchers « Annuler » → « Recommencer » | ferme |
| `apps/pro/src/App.tsx` | monte le fournisseur au-dessus des routes | ferme |
| `packages/i18n/messages/fr.json` | `venue.ui.walkin.reset` : « Annuler » → « Recommencer » | ferme |
| `packages/i18n/messages/ar.json` | `venue.ui.walkin.reset` : « إلغاء » → « إعادة البدء » | ferme |
| `e2e/specs/r47-brouillon-onglet.e2e.ts` | l'aller-retour d'onglet, contre l'écran d'aujourd'hui | ferme |
| `neutralisation/neutralize-r47.py` | le harnais du lot | ferme |
| `ZWADJ_CONTINUITE.md` | section D345, registre, ordre des rangs, point d'entrée, compteur | ferme |
| `ZWADJ_BACKLOG.md` | entrées neuves (L36-4, S-142 repositionnée) ; annotation de l'entrée [SÉCU] (R-9) | ferme |
| `AGENTS.md` | annotation additive (clôture du rang 47) | ferme |

## Fichiers CONDITIONNELS (leur existence dépend d'un défaut ou d'un résultat)

| Fichier | Condition |
|---|---|
| `docs/preuves/D345/e2e/rejeu.txt` | seulement si une passe e2e sort rouge |
| `docs/preuves/D345/audit-secrets-d345b.txt` (et suivants) | un audit par versement supplémentaire |
| `docs/preuves/D345/lecture-adverse/ecarts.md` | seulement si la lecture adverse trouve un écart |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` — autres tests existants | seulement si un test existant dépend du texte « Annuler » ailleurs que les trois lignes relevées (499, 520, 3022) |
| `neutralisation/lancer-campagnes.py` | seulement si le tri par fichiers touchés exige d'enregistrer r47 (sinon NON touché) |

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif. *(Aucune à l'ouverture.)*

**Extension 1** (08/11/2026, commitée SEULE). Relevé : en comparant les fichiers de `docs/preuves/D345/` aux chemins de la table d'ouverture, **les pièces produites par le lot sont plus nombreuses que celles que la table nommait** (une ligne par famille, pas par fichier : les sorties que `rouges.md` et `portes.md` citent n'avaient pas leur ligne).

⚠ **Écart écrit, pour ne pas se lire comme tenu** : la règle de `AGENTS.md` (D328, point 4) veut qu'une extension précède le commit du fichier qu'elle couvre. **Sept fichiers, déjà commités, sont déclarés ICI APRÈS leur commit** ; `git` le montre, le contrôle de fin de lot le rapporte : `docs/preuves/D345/rouges/rouge-2-comportement.txt`, `docs/preuves/D345/rouges/rouge-3-bouton.txt`, `docs/preuves/D345/rouges/rouge-4-e2e.txt`, `docs/preuves/D345/portes/masquer-jetons.py` (commit `3d25c8a`) ; `docs/preuves/D345/neutralisation/neutralize-r47-passe-1-AVANT-CORRECTIF-DE-DEUX-TESTS.txt` (`e641678`) ; `docs/preuves/D345/portes/deux-passes-e2e.sh` (`e3bf91f`, déclaré par la ligne « pilote » de la famille ci-dessous), `docs/preuves/D345/portes/defaut-pilote-ports.md` et `docs/preuves/D345/portes/tentative-1/` (`e3bf91f`, `f98be80`). Les **autres** fichiers listés ci-dessous ne sont pas encore commités.

| chemin | rôle |
|---|---|
| `docs/preuves/D345/rouges/rouge-2-comportement.txt` | la sortie du rouge 2 (le comportement, contre le parcours inchangé), citée par `rouges.md` — **déclarée après son commit** |
| `docs/preuves/D345/rouges/rouge-3-bouton.txt` | la sortie du rouge 3 (le libellé « Recommencer ») — **déclarée après son commit** |
| `docs/preuves/D345/rouges/rouge-4-e2e.txt` | la sortie du rouge 4 (la spec e2e contre l'écran sans la fonctionnalité), MASQUÉE — **déclarée après son commit** |
| `docs/preuves/D345/neutralisation/neutralize-r47-passe-1-AVANT-CORRECTIF-DE-DEUX-TESTS.txt` | la première passe du harnais (23 mordues, 2 muettes), gardée telle quelle — **déclarée après son commit** |
| `docs/preuves/D345/portes/masquer-jetons.py` | la procédure de masquage des jetons (copie à l'octet de celle de D344), archivée comme PREUVE — **déclarée après son commit** |
| `docs/preuves/D345/portes/deux-passes-e2e.sh` | le pilote des deux passes e2e (copie de celui de D344, noms seuls, plus l'attente de libération des ports) — **déclaré après son commit** |
| `docs/preuves/D345/portes/defaut-pilote-ports.md` | le défaut d'instrument du pilote (D298), écrit — **déclaré après son commit** |
| `docs/preuves/D345/portes/tentative-1/deux-passes-index.txt`, `docs/preuves/D345/portes/tentative-1/console.txt` | la première tentative des deux passes (passe 1 verte, passe 2 refusée par le pilote), gardée telle quelle — **déclarés après leur commit** |
| `docs/preuves/D345/portes/portes.md` | le compte rendu des six portes, avec leurs chiffres et l'attendu à côté |
| `docs/preuves/D345/portes/typecheck.txt`, `docs/preuves/D345/portes/lint.txt`, `docs/preuves/D345/portes/test.txt`, `docs/preuves/D345/portes/build.txt`, `docs/preuves/D345/portes/test-int.txt` | les sorties des cinq portes, masquées si besoin |
| `docs/preuves/D345/e2e/deux-passes-index.txt`, `docs/preuves/D345/e2e/deux-passes-etat-machine.txt` | l'index des deux passes et l'état machine pendant elles |
| `docs/preuves/D345/e2e/etat-env-d345-ouverture.txt`, `docs/preuves/D345/e2e/etat-env-d345-cloture.txt`, `docs/preuves/D345/e2e/env-comparaison.txt` | l'état des `.env` (empreintes et hôtes locaux, aucune valeur) à l'ouverture et à la clôture, et leur comparaison |
| `docs/preuves/D345/campagnes/_index.txt`, `docs/preuves/D345/campagnes/campagnes.md` | les campagnes que le lot touche, jouées, et leur lecture |
| `docs/preuves/D345/campagnes/*.txt` | la sortie de chacune des seize autres campagnes touchées (une par fichier, nommée comme la campagne) |
| `docs/preuves/D345/passe-d277.md`, `docs/preuves/D345/passe-d277/passe-d277.py`, `docs/preuves/D345/passe-d277/sortie-avant.txt`, `docs/preuves/D345/passe-d277/sortie-apres.txt` | la passe D277 des deux sens |
| `docs/preuves/D345/audit-secrets-d345b.txt`, `docs/preuves/D345/tri-audit-d345b.txt` | l'audit de secrets scellé des pièces de clôture, et son tri différentiel |
| `docs/preuves/D345/controle-fin-de-lot.py`, `docs/preuves/D345/controle-fin-de-lot.txt` | le contrôle de fin de lot (D288, D328, D334), écrit APRÈS la poussée, et sa sortie |
