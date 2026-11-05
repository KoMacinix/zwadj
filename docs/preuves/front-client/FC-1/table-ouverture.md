# FC-1 — CONTRASTE — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `1e6426f7e5aa5e092349231e7fa2315d8d01227f` (branche `front-client`, ouverture de session commitée et poussée).
Méthode : NORMALE (CSS d'affichage, aucun montant, aucun contrat). Ordre des commits : (1) cette table seule ; (2) les ROUGES — le
test neuf et la référence a11y resserrée, avec leurs sorties lues contre l'état d'avant et l'empreinte sha256 des fichiers de test ;
(3) le code ; (4) le harnais, les campagnes, les portes, l'audit, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-1/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-1/premisse.md` | la prémisse vérifiée à ce SHA (D231) : les quatre sélecteurs, les deux tolérances, les mesures de contraste | 2 |
| 3 | `apps/client/src/app/theme-contrast.test.ts` | NEUF — la garde unitaire : résout les tokens des deux feuilles, exige 4,5:1 sur chaque fond neutre, clair et sombre | 2 |
| 4 | `e2e/baselines/a11y.json` | retrait de `color-contrast @ .filters-reset` et `color-contrast @ .range-value` (« client recherche de salles »), et d'elles seules | 2 |
| 5 | `docs/preuves/front-client/FC-1/rouges/rouge-unitaire.txt` | sortie du test neuf contre le `theme.css` d'avant + sha256 du fichier de test | 2 |
| 6 | `docs/preuves/front-client/FC-1/rouges/rouge-e2e-b8.txt` | extrait de B8 « client recherche de salles » contre le `theme.css` d'avant et la référence resserrée + sha256 des fichiers lus | 2 |
| 7 | `apps/client/src/app/theme.css` | le CODE : les quatre `color: var(--accent)` → `var(--accent-text)` ; le commentaire de `.results-count-n` corrigé | 3 |
| 8 | `neutralisation/socle_front_client.py` | NEUF — instrument partagé des harnais de la session (lecteurs vitest et Playwright calibrés, preuve de pose, restauration) ; né avec ce lot | 4 |
| 9 | `neutralisation/neutralize-fc1.py` | NEUF — le harnais du lot | 4 |
| 10 | `docs/preuves/front-client/FC-1/neutralisation/sortie-unitaire.txt` | sortie du harnais (cibles unitaires) | 4 |
| 11 | `docs/preuves/front-client/FC-1/neutralisation/sortie-e2e.txt` | sortie du harnais avec `--e2e` (extrait sans ligne `[WebServer]`) | 4 |
| 12 | `docs/preuves/front-client/FC-1/campagnes.txt` | sortie de `python3 neutralisation/lancer-campagnes.py` (les campagnes que le lot touche) | 4 |
| 13 | `docs/preuves/front-client/FC-1/portes.md` | les portes APRÈS la dernière modification, avec leurs chiffres | 4 |
| 14 | `docs/preuves/front-client/FC-1/audit-secrets-fc1.txt` | audit de secrets scellé | 4 |
| 15 | `docs/preuves/front-client/FC-1/tri-audit-fc1.txt` | son tri différentiel | 4 |
| 16 | `docs/preuves/front-client/FC-1/rapport.md` | le rapport du lot, avec le contrôle de fin de lot | 4 |

Conditionnels : aucun. Aucune chaîne visible n'est ajoutée ⇒ aucune clé arabe à relire.

## Extension 1 — commitée SEULE, avant les fichiers qu'elle déclare

| # | fichier | rôle | commit |
|---|---|---|---|
| 17 | `docs/preuves/front-client/outils/portes.sh` | NEUF — le pilote des portes de la session (six portes dans l'ordre de `CLAUDE.md`, code de sortie lu PAR porte, journaux sans codes ANSI ; journal e2e versé sans ses lignes `[WebServer]`) ; né avec ce lot, servi aux suivants | 4 |
| 18 | `docs/preuves/front-client/FC-1/portes/typecheck.txt` | journal de la porte | 4 |
| 19 | `docs/preuves/front-client/FC-1/portes/lint.txt` | journal de la porte | 4 |
| 20 | `docs/preuves/front-client/FC-1/portes/test.txt` | journal de la porte | 4 |
| 21 | `docs/preuves/front-client/FC-1/portes/build.txt` | journal de la porte | 4 |
| 22 | `docs/preuves/front-client/FC-1/portes/test-int.txt` | journal de la porte | 4 |
| 23 | `docs/preuves/front-client/FC-1/portes/test-e2e.txt` | journal de la porte, sans lignes `[WebServer]` | 4 |
| 24 | `docs/preuves/front-client/FC-1/portes/resume.txt` | code de sortie et durée de chaque porte | 4 |

Motif : la table d'ouverture prévoyait un `portes.md` de synthèse ; les journaux bruts que cette synthèse cite entrent au dépôt (D291).

## Extension 2 — commitée SEULE, avant les fichiers qu'elle déclare

| # | fichier | rôle | commit |
|---|---|---|---|
| 25 | `docs/preuves/front-client/outils/controle-lot.py` | NEUF — le contrôle de fin de lot de la session (premier commit = table seule, extensions seules, rouges avant le code, diff ⊆ table ; calibré à chaque lancement) ; né avec ce lot, servi aux suivants | 4 |
| 26 | `docs/preuves/front-client/FC-1/controle.txt` | sa sortie pour FC-1, avant le dernier commit | 4 |

Motif : le contrôle de fin de lot se faisait à la main ; il devient un outil versé, rejouable (D286, D291).
