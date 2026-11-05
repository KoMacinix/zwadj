# FC-2 — DÉBORDEMENT À 360 px — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `5f95ba35c53d649a83464808a28f68b21edc574d` (dernier commit de FC-1, poussé). Méthode : NORMALE (CSS d'affichage). Ordre des commits : (1) cette table
seule ; (2) les ROUGES — la spec e2e neuve, sa sortie lue contre l'état d'avant, empreintes sha256 ; (3) le code ; (4) le harnais,
les campagnes, les portes, l'audit, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-2/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-2/premisse.md` | la prémisse vérifiée à ce SHA, dans un navigateur (D231) | 2 |
| 3 | `e2e/specs/fc2-debordement-360.e2e.ts` | NEUF — la garde : à 360 px, accueil, recherche et fiche, en FR et en AR, la page tient dans la fenêtre | 2 |
| 4 | `docs/preuves/front-client/FC-2/rouges/rouge-e2e.txt` | sortie de la spec contre l'état d'avant (sans lignes `[WebServer]`) + sha256 | 2 |
| 5 | `apps/client/src/app/theme.css` | le CODE : la barre de session de l'en-tête du client passe à la ligne au lieu de déborder (propriétés logiques) | 3 |
| 6 | `neutralisation/neutralize-fc2.py` | NEUF — le harnais du lot (cibles e2e) | 4 |
| 7 | `docs/preuves/front-client/FC-2/neutralisation/sortie-e2e.txt` | sortie du harnais avec `--e2e` (sans lignes `[WebServer]`) | 4 |
| 8 | `docs/preuves/front-client/FC-2/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 9 | `docs/preuves/front-client/FC-2/portes/typecheck.txt` | journal de porte | 4 |
| 10 | `docs/preuves/front-client/FC-2/portes/lint.txt` | journal de porte | 4 |
| 11 | `docs/preuves/front-client/FC-2/portes/test.txt` | journal de porte | 4 |
| 12 | `docs/preuves/front-client/FC-2/portes/build.txt` | journal de porte | 4 |
| 13 | `docs/preuves/front-client/FC-2/portes/test-int.txt` | journal de porte | 4 |
| 14 | `docs/preuves/front-client/FC-2/portes/test-e2e.txt` | journal de porte (sans lignes `[WebServer]`) | 4 |
| 15 | `docs/preuves/front-client/FC-2/portes/resume.txt` | code de sortie et durée de chaque porte | 4 |
| 16 | `docs/preuves/front-client/FC-2/audit-secrets-fc2.txt` | audit de secrets scellé | 4 |
| 17 | `docs/preuves/front-client/FC-2/tri-audit-fc2.txt` | son tri différentiel | 4 |
| 18 | `docs/preuves/front-client/FC-2/rapport.md` | le rapport du lot, avec le contrôle de fin de lot | 4 |

Conditionnels : aucun. Aucune chaîne visible n'est ajoutée ⇒ aucune clé arabe à relire.
