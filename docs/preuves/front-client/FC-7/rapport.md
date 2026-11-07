# FC-7 — LE REPLI `maxPriceCents` EST RETIRÉ — rapport · **PRÊT À INTÉGRER**

Session `front-client`, 05/11/2026. Départ `06261c3` (FC-6 poussé, local = origin vérifié). Commits du lot : `13c2cb6` (table,
seule) → `b329ff2` (prémisse, rouge) → `dfe07dc` (extension 1, seule) → `9ce3c4f` (le test sans son import inutile, son rouge
rejoué) → `f1ac680` (extension 2, seule) → `9c7918e` (code) → le commit de clôture. Méthode NORMALE : l'URL publique ne porte que des dinars sous `maxPrice` ; la
conversion vers l'API (`centsFromDinars`, `toApiQuery`) est inchangée ; aucun montant n'est calculé ni affiché autrement.

## Fait
- **Le repli est retiré** (`apps/client/src/lib/search-query.ts`) : `maxPriceFromRaw` et `dinarsFromCents` disparaissent ; `maxPrice`
  se lit seul. Le front ne divise plus jamais par 100 — la seule conversion est `centsFromDinars`, à l'aller. Le commentaire « pas
  de repli symétrique pour `minPrice` », devenu faux de contexte, dit désormais « aucun repli de nom ».
- **⚠ LE TEST QUI EXIGEAIT LE REPLI EST DEVENU LA GARDE QUI EXIGE SON ABSENCE — dit ici, dans le test, et dans `campagnes.txt`.**
  Le bloc « ⛔ D228 — le repli `maxPriceCents` → `maxPrice` » s'appelle « ⛔ D228 (FC-7) — `maxPriceCents` n'est PLUS lu dans
  l'URL » : son premier test exigeait qu'un ancien lien retrouve son plafond, il exige qu'il n'en ait AUCUN (et que l'API n'en
  reçoive aucun). Les règles de lecture de `maxPrice` restent gardées (seul décideur, vide = « peu importe », malformé
  abandonné, l'URL publique n'émet jamais l'ancien nom). Retirés avec `dinarsFromCents` : son test de forme et le test de
  réciprocité ; `centsFromDinars` reste confrontée au contrat de l'API, palier par palier.
- **Rouge avant le code** (`b329ff2`, rejoué après le retrait d'un import inutile) : 1 échec par AssertionError — « 500000 » au
  lieu de « » (aucun plafond).
- **Harnais** `neutralisation/neutralize-fc7.py` : **2 sur 2 mordues** — le repli qui REVIENT, entier (P-1) ou à moitié, quand
  `maxPrice` est absent (P-2, la forme d'une restauration fidèle).
- **`neutralisation/neutralize-maxprice.py`** : **M5, M6, M7 RETIRÉES par écrit** (elles mutaient le code retiré : « le repli
  disparaît », « le repli part dans l'autre sens », « l'arrondi s'invente ») ; son contrôle d'arbre exigeait la présence de
  `dinarsFromCents`, il exige l'ABSENCE du repli ; le titre attendu de M8 est RÉALIGNÉ sur le test renommé. maxprice rejouée **7/7**.
- **Campagnes touchées** (`campagnes.txt`) : fc7 2/2, maxprice 7/7 après réalignement, available-on arrêtée sur son ancre CRLF
  (environnement) → **sous CRLF simulé** : available-on **10/10**, maxprice **7/7** (`crlf/`). Relevé statique des ancres :
  19 cibles examinées sur 19, 0 périmée, 2 CRLF (available-on 6 et 7).

## La prémisse : une moitié était fausse (`premisse.md`, D231)
**`maxPriceCents` n'a JAMAIS été dans `SEARCH_VARIANT_PARAMS`** (`git log -S` : 0 commit) — l'entrée du backlog venait de D230, une
décision du lot ③ jamais livrée (D232). Il n'y avait rien à retirer ; après ce lot, un `?maxPriceCents=` n'a plus d'effet sur la
page, il n'en fait donc pas une variante : l'état est juste.

## Pas fait, et pourquoi
- Les paliers de budget : hors lot (consigne).

## Décisions prises seul — ce qu'elles changent pour Ko
1. **Retrait AVANT l'échéance du 19/11/2026** : aucun déploiement n'a eu lieu (AGENTS.md), donc aucun lien partagé n'existe hors des
   postes de développement — le retrait ne casse aucun lien réel. Pour Ko : rien à faire ; il intègre quand il le décide.
2. **Une entrée de backlog à fausse prémisse** (la clé de `SEARCH_VARIANT_PARAMS`) : écrite ici, pas corrigée dans le backlog (la
   session n'écrit pas les fichiers d'autorité). Pour Ko : à barrer à l'intégration.
3. **Trois cibles d'un autre harnais retirées par écrit, un titre réaligné** (maxprice) : même règle que « une cible devenue sans
   objet se retire ou se réoriente, par écrit » (AGENTS.md).

## Arabe à relire
Aucune chaîne visible n'est ajoutée.

## Portes (APRÈS la dernière modification ; `portes/resume.txt`)
typecheck 0 · lint 0 · test 0 (api-client 59/6 · api 1 096/71 · **client 454/39** · pro 676/43 — 2 285 tests, 159 fichiers ; client
−3 tests : les huit tests du repli et de sa réciprocité deviennent les cinq de son absence) · build 0 · test:int **616/619** — les 3
rouges sont EXACTEMENT l'ensemble d'entrée relevé avec le pont (`etat-entree.md` : MD-1 ×2, F-1, `read ECONNRESET`) : **pas
« vert », à jouer à l'intégration** · e2e 0 (69 passés, 1 ignoré, 0 échec ; « token= » restants 0).

## Audit de secrets
`audit-secrets-fc7.txt` (scellée) et `tri-audit-fc7.txt` : 5 alertes nouvelles, lues au contexte — 0 valeur réelle.

## Contrôle de fin de lot
`controle.txt` (avant le commit de clôture).
