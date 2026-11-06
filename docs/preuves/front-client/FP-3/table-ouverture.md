# FP-3 — UNE RÉVISION REPREND LA COPIE DU NOM DE LA VERSION COURANTE — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `843207022a1a0ddd9e6ba89d9ff30d786a6abaf9` (dernier commit de FP-2, poussé, local = origin vérifié). Méthode : NORMALE (aucun montant : la copie du nom d'un
devis est une donnée d'identité ; l'écran n'envoie que des noms que le pro a tapés). Consigne : « au moment de réviser un devis,
préremplir la copie du nom depuis la version courante (ne touche ni L36-2 ni K-5) ».
**La prémisse est vérifiée AVANT cette table** (lecture du code, D231) : le serveur l'ÉCRIT lui-même — `QuotesService.revise` : « une révision
porte le corps ENTIER, la copie du nom comprise (celle que l'écran a préremplie du devis précédent, DB-17) : le serveur n'y substitue PAS la
fiche vivante ». Le défaut, lu : l'écran bâtit le corps d'une révision depuis ses propres champs (`copiePourDevis(nomsEffectifs, fiche.id)`),
qui ne connaissent pas la copie que K-5 (la boîte de langue) a COMPLÉTÉE sur la version précédente ; la version N+1 perd donc la copie et
K-5 repose sa question à la prochaine remise dans cette langue. ⚠ Et un devis jeté par une modification (`invalidate`) n'est plus dans l'état :
la version précédente doit être gardée à part.
**Une limite du SERVEUR, lue et écrite avant le code** : `copieDuNomPourDevis` (`apps/api/src/clients/pro-client-policy.ts`) REFUSE (409
`CLIENT_RECORD_LINKED`) un nom que la fiche LIÉE n'a pas — « le nom manquant d'une fiche liée se complète sur le DEVIS seulement, par la boîte
de langue ». ⇒ Pour une fiche liée la copie complétée par K-5 ne peut PAS être reprise par une révision sans changer cette règle (`apps/api`,
hors session) : le lot ne la reprend que pour une fiche NON liée, et le rapport dit le reste.
Ordre des commits : (1) cette table seule ; (2) les tests et leurs ROUGES — lus contre l'état d'avant, empreintes sha256 ; (3) le code ;
(4) le harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FP-3/table-ouverture.md` | cette table | 1 |
| 2 | `apps/pro/src/dashboard/walkin-revision.test.ts` | NEUF — la règle PURE `copiePourRevision` : un nom absent de l'écran est repris de la version courante, un nom tapé l'emporte, une fiche liée et un autre client n'en reçoivent rien | 2 |
| 3 | `apps/pro/src/dashboard/walkin-journey.test.tsx` | l'écran : la révision porte la copie complétée par la boîte de langue (devis affiché ou jeté), le nom tapé l'emporte, la fiche liée ne reçoit pas de nom que le serveur refuserait | 2 |
| 4 | `docs/preuves/front-client/FP-3/rouges/rouge-pro.txt` | sortie des tests contre l'état d'avant + sha256 | 2 |
| 5 | `apps/pro/src/dashboard/walkin-client.ts` | `copiePourRevision` — la règle pure | 3 |
| 6 | `apps/pro/src/dashboard/walkin-journey.tsx` | la dernière version rendue par le serveur est gardée à part ; le corps d'une révision passe par la règle | 3 |
| 7 | `neutralisation/neutralize-fp3.py` | NEUF — le harnais du lot | 4 |
| 8 | `docs/preuves/front-client/FP-3/neutralisation/sortie.txt` | sortie du harnais | 4 |
| 9 | `docs/preuves/front-client/FP-3/ancres-campagnes.txt` | relevé statique des ancres des campagnes concernées | 4 |
| 10 | `docs/preuves/front-client/FP-3/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 11 | `docs/preuves/front-client/FP-3/portes/typecheck.txt` | journal de porte | 4 |
| 12 | `docs/preuves/front-client/FP-3/portes/lint.txt` | journal de porte | 4 |
| 13 | `docs/preuves/front-client/FP-3/portes/test.txt` | journal de porte | 4 |
| 14 | `docs/preuves/front-client/FP-3/portes/build.txt` | journal de porte | 4 |
| 15 | `docs/preuves/front-client/FP-3/portes/test-int.txt` | journal de porte | 4 |
| 16 | `docs/preuves/front-client/FP-3/portes/test-e2e.txt` | journal de porte | 4 |
| 17 | `docs/preuves/front-client/FP-3/portes/resume.txt` | journal de porte | 4 |
| 18 | `docs/preuves/front-client/FP-3/audit-secrets-fp3.txt` | audit de secrets scellé | 4 |
| 19 | `docs/preuves/front-client/FP-3/tri-audit-fp3.txt` | son tri | 4 |
| 20 | `docs/preuves/front-client/FP-3/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 21 | `docs/preuves/front-client/FP-3/rapport.md` | le rapport du lot | 4 |

Conditionnels : un harnais d'un autre rang dont une ancre ou une mesure serait périmée par ce lot (le relevé et les campagnes le diront)
— déclaré par une extension, commitée seule, avant sa réorientation ; et sa sortie sous CRLF simulé s'il porte des ancres CRLF.
Aucune chaîne visible n'est ajoutée ⇒ aucune clé arabe à relire.
