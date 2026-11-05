# FC-7 — LE REPLI `maxPriceCents` EST RETIRÉ — table d'ouverture (premier commit du lot, SEUL)

SHA de départ : `06261c3e6d9c3623847e740ecaab1dfeb2c62117` (dernier commit de FC-6, poussé, local = origin vérifié). Méthode : NORMALE (l'URL publique ne porte que des dinars sous `maxPrice`,
la conversion vers l'API — `centsFromDinars`, `toApiQuery` — est INCHANGÉE ; aucun montant n'est calculé ni affiché autrement).
Entrée du backlog, mot pour mot : « Retirer le repli `maxPriceCents` — échéance 19/11/2026 (3 mois). Retirer aussi la clé de
`SEARCH_VARIANT_PARAMS`. Un repli sans date de retrait devient un second nom officiel. (D228) ». Les paliers de budget : HORS lot.
Ordre des commits : (1) cette table seule ; (2) la prémisse et le ROUGE — la garde de l'absence du repli, lue contre l'état
d'avant, empreinte sha256 ; (3) le code ; (4) les harnais, les campagnes, les portes, l'audit, le contrôle, le rapport.

## Fichiers du lot — chemins complets

| # | fichier | rôle | commit |
|---|---|---|---|
| 1 | `docs/preuves/front-client/FC-7/table-ouverture.md` | cette table | 1 |
| 2 | `docs/preuves/front-client/FC-7/premisse.md` | la prémisse vérifiée au SHA de départ (D231), dont la clé de `SEARCH_VARIANT_PARAMS` | 2 |
| 3 | `apps/client/src/lib/search-query.test.ts` | le test qui EXIGEAIT le repli devient la garde qui exige son ABSENCE (dit dans le test et au rapport) ; la réciprocité avec `dinarsFromCents` retirée avec elle | 2 |
| 4 | `docs/preuves/front-client/FC-7/rouges/rouge-client.txt` | sa sortie contre l'état d'avant + sha256 | 2 |
| 5 | `apps/client/src/lib/search-query.ts` | le repli retiré : `maxPriceFromRaw`, `dinarsFromCents`, leurs commentaires ; `maxPrice` lu seul | 3 |
| 6 | `neutralisation/neutralize-fc7.py` | NEUF — le harnais du lot (le repli qui revient, entier ou à moitié) | 4 |
| 7 | `neutralisation/neutralize-maxprice.py` | M5, M6, M7 RETIRÉES par écrit (elles mutaient le code retiré) ; son contrôle d'arbre exige l'ABSENCE du repli | 4 |
| 8 | `docs/preuves/front-client/FC-7/neutralisation/sortie.txt` | sortie du harnais du lot | 4 |
| 9 | `docs/preuves/front-client/FC-7/ancres-campagnes.txt` | le relevé statique des ancres des campagnes concernées (`releve-ancres.py`) | 4 |
| 10 | `docs/preuves/front-client/FC-7/campagnes.txt` | sortie de `lancer-campagnes.py` | 4 |
| 11 | `docs/preuves/front-client/FC-7/crlf/maxprice.txt` | `neutralize-maxprice.py` joué sous CRLF simulé (ses ancres M6/M7 l'étaient en dur ; ce lot les retire, M2 et les autres restent à prouver) | 4 |
| 12 | `docs/preuves/front-client/FC-7/portes/typecheck.txt` | journal de porte | 4 |
| 13 | `docs/preuves/front-client/FC-7/portes/lint.txt` | journal de porte | 4 |
| 14 | `docs/preuves/front-client/FC-7/portes/test.txt` | journal de porte | 4 |
| 15 | `docs/preuves/front-client/FC-7/portes/build.txt` | journal de porte | 4 |
| 16 | `docs/preuves/front-client/FC-7/portes/test-int.txt` | journal de porte | 4 |
| 17 | `docs/preuves/front-client/FC-7/portes/test-e2e.txt` | journal de porte | 4 |
| 18 | `docs/preuves/front-client/FC-7/portes/resume.txt` | journal de porte | 4 |
| 19 | `docs/preuves/front-client/FC-7/audit-secrets-fc7.txt` | audit de secrets scellé | 4 |
| 20 | `docs/preuves/front-client/FC-7/tri-audit-fc7.txt` | son tri | 4 |
| 21 | `docs/preuves/front-client/FC-7/controle.txt` | sortie du contrôle de fin de lot | 4 |
| 22 | `docs/preuves/front-client/FC-7/rapport.md` | le rapport du lot | 4 |

Conditionnels : un harnais d'un autre rang dont une ANCRE serait périmée par ce lot (le relevé le dira) — déclaré par une
extension, commitée seule, avant sa réorientation. Aucune chaîne visible n'est ajoutée ⇒ aucune clé arabe à relire.

## Extension 1 — commitée SEULE, avant le fichier qu'elle déclare

| # | fichier | rôle | commit |
|---|---|---|---|
| 23 | `docs/preuves/front-client/FC-7/rouges/rouge-client-v2.txt` | le rouge REJOUÉ contre l'état d'avant après le retrait d'un import devenu inutile du test (lint) | 2 bis |

Motif : `centsFromDinars` n'était plus employé par `search-query.test.ts` une fois le test de réciprocité retiré — `pnpm lint`
le refuse (`no-unused-vars`). L'import est retiré AVANT le commit du code, le code mis de côté, et le rouge rejoué sur l'état
d'avant : l'empreinte versée est celle du test livré (même faute qu'en FC-3 et FC-5, même réparation).
