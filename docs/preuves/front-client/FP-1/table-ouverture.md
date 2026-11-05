# FP-1 — LA QUANTITÉ (PER_UNIT) ET LE PALIER (TIERED) AU COMPTOIR — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `aec8141e16cd537bac558b2efa4d601487faeb66` (dernier commit de FC-12, poussé, local = origin vérifié). Méthode :
**RENFORCÉE** (consigne : FP-1) — la donnée qui entre dans le calcul d'un montant par le serveur (branche 5 de la règle de portée,
D311) ; l'écran ne fait que la SAISIR (règle des montants, D325 : la valeur enregistrée est celle saisie, aucun montant calculé dans le
navigateur). Le contrat EXISTE et ne change pas : `bookingServiceChoiceSchema` (`packages/types/src/service.ts`).
Ordre des commits : (1) cette table seule ; (2) les MODES DE DÉFAILLANCE, écrits avant tout test et tout code ; (3) les tests et leurs
ROUGES — lus contre l'état d'avant, empreintes sha256 ; (4) le code ; (5) le harnais (chaque garde neutralisée, échec LU en assertion),
les campagnes, les portes, l'audit, le contrôle, le rapport.
⚠ La forme de revue d'un lot du chemin de l'argent (une session ADVERSE ouverte à froid, le relecteur qui décide — D302, D303) ne se
joue pas dans cette session : elle est DUE à l'intégration, et le rapport le dit.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FP-1/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FP-1/modes-de-defaillance.md` | le cadrage : les modes de défaillance et leur garde, AVANT tout code | 2 |
| 3 | `apps/pro/src/dashboard/walkin-services.test.ts` | NEUF — la règle PURE : un choix par type de tarification, conforme au contrat | 3 |
| 4 | `apps/pro/src/dashboard/walkin-journey.test.tsx` | l'écran : le palier et la quantité se saisissent, « Voir le devis » dit ce qui manque, le corps envoyé porte la valeur saisie, création ET révision | 3 |
| 5 | `docs/preuves/front-client/FP-1/rouges/rouge-pro.txt` | sortie des tests contre l'état d'avant + sha256 | 3 |
| 6 | `apps/pro/src/dashboard/walkin-services.ts` | NEUF — la règle PURE (D187) : le choix d'une prestation tel que le contrat l'attend, ou ce qui manque | 4 |
| 7 | `apps/pro/src/dashboard/walkin-journey.tsx` | l'étape « Prestations » saisit le palier et la quantité ; le corps du devis passe par la règle pure | 4 |
| 8 | `apps/pro/src/theme.css` | la mise en page des champs de détail (propriétés logiques, aucune couleur en dur) | 4 |
| 9 | `packages/i18n/messages/fr.json` | les libellés du palier et de la quantité | 4 |
| 10 | `packages/i18n/messages/ar.json` | leurs pendants arabes (à relire) | 4 |
| 11 | `docs/preuves/front-client/FP-1/arabe-a-relire.md` | les clés arabes neuves | 4 |
| 12 | `neutralisation/neutralize-fp1.py` | NEUF — le harnais du lot | 5 |
| 13 | `docs/preuves/front-client/FP-1/neutralisation/sortie.txt` | sortie du harnais | 5 |
| 14 | `docs/preuves/front-client/FP-1/ancres-campagnes.txt` | relevé statique des ancres des campagnes concernées | 5 |
| 15 | `docs/preuves/front-client/FP-1/campagnes.txt` | sortie de `lancer-campagnes.py` | 5 |
| 16 | `docs/preuves/front-client/FP-1/portes/typecheck.txt` | journal de porte | 5 |
| 17 | `docs/preuves/front-client/FP-1/portes/lint.txt` | journal de porte | 5 |
| 18 | `docs/preuves/front-client/FP-1/portes/test.txt` | journal de porte | 5 |
| 19 | `docs/preuves/front-client/FP-1/portes/build.txt` | journal de porte | 5 |
| 20 | `docs/preuves/front-client/FP-1/portes/test-int.txt` | journal de porte | 5 |
| 21 | `docs/preuves/front-client/FP-1/portes/test-e2e.txt` | journal de porte | 5 |
| 22 | `docs/preuves/front-client/FP-1/portes/resume.txt` | journal de porte | 5 |
| 23 | `docs/preuves/front-client/FP-1/audit-secrets-fp1.txt` | audit de secrets scellé | 5 |
| 24 | `docs/preuves/front-client/FP-1/tri-audit-fp1.txt` | son tri | 5 |
| 25 | `docs/preuves/front-client/FP-1/controle.txt` | sortie du contrôle de fin de lot | 5 |
| 26 | `docs/preuves/front-client/FP-1/rapport.md` | le rapport du lot | 5 |

Conditionnels : un harnais d'un autre rang dont une ancre ou une mesure serait périmée par ce lot (le relevé et les campagnes le
diront) — déclaré par une extension, commitée seule, avant sa réorientation ; et sa sortie sous CRLF simulé s'il porte des ancres CRLF.
