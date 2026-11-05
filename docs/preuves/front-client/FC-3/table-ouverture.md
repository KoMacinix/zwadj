# FC-3 — NOMS EN ARABE DANS LE PANNEAU DE DEMANDE — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `71133562c6f70fc8c5b630bba749d0bfc81a96f4` (dernier commit de FC-2, poussé). Méthode : NORMALE — décision du relecteur (consigne) : « affichage seul,
aucun montant touché ». Ordre des commits : (1) cette table seule ; (2) les ROUGES — le test du panneau, sa sortie lue contre
l'état d'avant, empreintes sha256 ; (3) le code — le module pur, son test (il ne peut pas rougir par assertion avant d'exister :
sa garde se prouve par le harnais) et le panneau ; (4) le harnais, les campagnes, les portes, l'audit, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-3/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-3/premisse.md` | la prémisse vérifiée à ce SHA (D231) | 2 |
| 3 | `apps/client/src/components/venue/booking-request-panel-langue.test.tsx` | NEUF — la garde du panneau : en arabe, chaque nom (créneau, prestation, unité, palier) vient de son champ arabe ; repli dit ; le français ne change pas | 2 |
| 4 | `docs/preuves/front-client/FC-3/rouges/rouge-panneau.txt` | sa sortie contre l'état d'avant + sha256 | 2 |
| 5 | `apps/client/src/lib/nom-localise.ts` | NEUF — la règle du nom localisé, module pur (D205) | 3 |
| 6 | `apps/client/src/lib/nom-localise.test.ts` | NEUF — sa garde unitaire | 3 |
| 7 | `apps/client/src/components/venue/booking-request-panel.tsx` | le CODE : chaque nom passe par la règle | 3 |
| 8 | `neutralisation/neutralize-fc3.py` | NEUF — le harnais du lot | 4 |
| 9 | `docs/preuves/front-client/FC-3/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 10 | `docs/preuves/front-client/FC-3/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 11 | `docs/preuves/front-client/FC-3/portes/typecheck.txt` | journal de porte | 4 |
| 12 | `docs/preuves/front-client/FC-3/portes/lint.txt` | journal de porte | 4 |
| 13 | `docs/preuves/front-client/FC-3/portes/test.txt` | journal de porte | 4 |
| 14 | `docs/preuves/front-client/FC-3/portes/build.txt` | journal de porte | 4 |
| 15 | `docs/preuves/front-client/FC-3/portes/test-int.txt` | journal de porte | 4 |
| 16 | `docs/preuves/front-client/FC-3/portes/test-e2e.txt` | journal de porte (sans lignes `[WebServer]`) | 4 |
| 17 | `docs/preuves/front-client/FC-3/portes/resume.txt` | code de sortie et durée de chaque porte | 4 |
| 18 | `docs/preuves/front-client/FC-3/audit-secrets-fc3.txt` | audit de secrets scellé | 4 |
| 19 | `docs/preuves/front-client/FC-3/tri-audit-fc3.txt` | son tri différentiel | 4 |
| 20 | `docs/preuves/front-client/FC-3/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 21 | `docs/preuves/front-client/FC-3/rapport.md` | le rapport du lot | 4 |

Conditionnels : aucun. Aucune clé de message n'est ajoutée (les noms viennent des DTO) ⇒ aucune clé arabe à relire.
