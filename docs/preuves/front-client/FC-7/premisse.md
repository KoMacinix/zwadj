# FC-7 — la prémisse, vérifiée à `13c2cb6` (D231)

**L'entrée du backlog**, mot pour mot (`ZWADJ_BACKLOG.md`) : « Retirer le repli `maxPriceCents` — **échéance 19/11/2026** (3 mois).
Retirer aussi la clé de `SEARCH_VARIANT_PARAMS`. Un repli sans date de retrait devient un second nom officiel. (D228) »

**Le repli existe** : `apps/client/src/lib/search-query.ts`, `maxPriceFromRaw` — `maxPrice` d'abord, sinon `maxPriceCents`
converti par `dinarsFromCents` (multiples de 100 seulement). `dinarsFromCents` n'a AUCUN autre appelant que ce repli (relevé :
`grep -rn dinarsFromCents apps/client/src` — le module et ses tests). Le commentaire du code le date lui aussi : « ⛔ DETTE DATÉE
AU 19/11/2026 ».

**⚠ La seconde moitié de la prémisse est FAUSSE : `maxPriceCents` n'est PAS dans `SEARCH_VARIANT_PARAMS`, et n'y a JAMAIS été.**
La liste (`apps/client/src/lib/seo.ts`) porte `maxPrice`, pas `maxPriceCents` ; `git log -S'"maxPriceCents"' --
apps/client/src/lib/seo.ts` ne rend AUCUN commit. L'entrée vient de D230 (« ⚠ `guide` ET `maxPriceCents` entrent dans
`isVariant` (D216) »), une décision du lot ③ marquée « NON LIVRÉE » (D232) : la clé était PRÉVUE, jamais ajoutée. ⇒ Il n'y a rien à
retirer de `SEARCH_VARIANT_PARAMS` ; après ce lot, un `?maxPriceCents=` n'a plus d'effet sur la page, il n'en fait donc pas une
variante — c'est l'état actuel, il est juste.

**L'échéance et l'intégration** : ce lot est écrit le 05/11/2026, quatorze jours avant l'échéance. Le commentaire du repli dit
qu'il sert les « liens partagés portant l'ancien nom » jusqu'à ce qu'ils soient « assez vieux ». **Aucun déploiement n'a eu
lieu** (AGENTS.md : « AUCUN DÉPLOIEMENT TANT QUE LA MFA (D-7) ET LA RELECTURE EN BASE SUR LES ROUTES ADMIN (D-9, e3-c) NE SONT PAS
FAITES ») : aucun lien partagé n'existe hors des postes de développement. Retirer le repli avant l'échéance ne casse aucun lien
réel ; Ko intègre quand il le décide.

**Ce que le repli rattrapait, et qui reste corrigé sans lui** : les deux formulaires du front écrivaient le nom de l'API dans
l'URL (D228). Ils écrivent `maxPrice` depuis D228 — gardé par `neutralize-maxprice.py` (M1, M3, M8, qui restent) et par
`search-query.test.ts` (« l'URL publique n'émet JAMAIS l'ancien nom »).

**Ce qui ne change pas** : la conversion vers l'API (`centsFromDinars`, `toApiQuery` → `maxPriceCents`, le contrat de l'API) ;
les paliers de budget (hors lot, consigne).
