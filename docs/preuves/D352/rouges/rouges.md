# D352 — les rouges de R-1, versés AVANT le premier commit de code (D334, item 5 ; consigne, R-3)

**Ce que cette pièce est.** La sortie brute du fichier de test de la liste « Mes salles » (`apps/pro/src/venues/venue-list.test.tsx`) joué **contre l'ANCIEN code** de `apps/pro/src/venues/` — celui où la carte rend `PublicationBadge` sans lire le refus — et la lecture de chaque échec. Elle précède, dans `git log`, tout commit qui touche `venue-list-page.tsx`, `publication-review.tsx` ou `venue-form.tsx`.

## Ce qui a été joué

| | |
|---|---|
| commande | `NO_COLOR=1 FORCE_COLOR=0 pnpm --filter @zwadj/pro exec vitest run src/venues/venue-list.test.tsx` (vitest 3.2.7) |
| quand | 18/11/2026, fin du fichier : 17:23:12 (heure locale), poste **sur secteur** (`BatteryStatus` = 2) |
| code joué | `HEAD` = `16ff81dfea028f734013f423ac439fba5c7f9c1d` (la table d'ouverture, seule) ; `git status --short` à cet instant : **une seule ligne modifiée, le fichier de test** (` M apps/pro/src/venues/venue-list.test.tsx`) plus les pièces non suivies de `docs/preuves/D352/` ; `venue-list-page.tsx`, `publication-review.tsx`, `venue-form.tsx` **non touchés** |
| sortie brute | `docs/preuves/D352/rouges/venue-list-rouge-brut.txt` — 195 364 octets, sha256 `ae279b1427b217b47fd2eb04252d03d7f12d11b05ecf454e65fdaa3c01533773` (copie OCTET POUR OCTET de la sortie ; aucun jeton : un test unitaire sous jsdom) |
| **empreinte du fichier de test joué** (D334) | `apps/pro/src/venues/venue-list.test.tsx` — sha256 **`0750d7419aee71529c7dfda5ea9fc1ac497974d14ab0717edfb7ddab36cf30b7`** ; **le commit de code devra porter ce fichier à cette empreinte** (contrôle de fin de lot) |
| résultat | `Tests  10 failed | 14 passed (24)` ; `Test Files  1 failed (1)` ; code de sortie 1 |

## Les dix échecs, lus à la PREMIÈRE ligne de leur bloc (D304)

Les dix sont des `AssertionError` : aucun n'est un plantage, un délai ou une erreur de requête de Testing Library (la sortie est lue par un extracteur qui saute les en-têtes regroupés, D316, et dont le compte — 10 blocs lus pour « 10 failed » — se confronte au total de la ligne `Tests`).

| n° | test (fin du titre) | première ligne du bloc | ce que cela montre de l'ancien code |
|---|---|---|---|
| 1 | une salle REFUSÉE : la carte dit « Refusée » et ne dit PLUS « En attente de publication par Zwadj » | `AssertionError: expected null not to be null` | **« Refusée » n'existe pas dans la liste** : la carte d'une salle dont la route de publication répond un refus lit encore « En attente de publication par Zwadj » (le constat du relecteur, R-1) |
| 2 | en ARABE : la carte dit le mot du catalogue arabe, et plus l'attente… | `AssertionError: expected null not to be null` | idem, en arabe |
| 3 | une salle JAMAIS refusée garde « En attente… », après la lecture de SON état | `AssertionError: expected "spy" to be called with arguments: [ 'v1' ]` | **la liste n'appelle jamais la route de publication** |
| 4 | ⛔ l'affichage ne SAUTE pas… | `AssertionError: expected "spy" to be called 1 times, but got 0 times` | idem (aucune lecture n'est lancée) |
| 5 | ⛔ D133, D142 — une PANNE de lecture n'est PAS « pas refusée »… | `AssertionError: expected null not to be null` | la phrase « Impossible de vérifier… » n'existe pas dans la liste |
| 6 à 8 | ⛔ D120 — une réponse MALFORMÉE (`null` · un objet sans état de publication · un refus sans motif) est une PANNE… | `AssertionError: expected null not to be null` (× 3) | idem |
| 9 | le nombre d'appels est borné : UNE lecture par salle non publiée… | `AssertionError: expected [] to deeply equal [ 'a', 'b', 'c' ]` | zéro lecture au lieu de trois (le premier `waitFor` — trois « En attente » — passe : l'ancien code les affiche tout de suite, ce qui est justement ce que R-1 corrige) |
| 10 | ⛔ le MOTIF et la DATE du refus n'entrent JAMAIS dans la liste… | `AssertionError: expected null not to be null` | sa PRÉCONDITION (« Refusée » est affichée) échoue : le test ne mesure le motif que sur un écran qui lit le refus |

**Les 14 qui passent** : les 13 tests d'avant le lot (dont « affiche nom, commune… », dont l'attente du badge est rendue asynchrone par ce lot — elle passe aussi sur l'ancien code) et le test « une salle PUBLIÉE : « Publiée », et AUCUNE lecture du refus », **vert par construction sur l'ancien code** (il n'appelait rien) : c'est une garde, qui mord par la cible L-7 de `neutralisation/neutralize-r54.py`, pas un rouge.

## Ce que cette pièce ne dit pas

- Elle ne dit pas que les dix tests mesurent juste : c'est `neutralisation/neutralize-r54.py` (onze cibles) qui le dit, chaque échec lu à sa première ligne.
- Le test n° 1 dit « Refusée » absent ; il ne montre pas, sur l'écran de l'ancien code, le texte « En attente… » à côté d'un refus : sa seconde assertion (« En attente… » absent) n'est jamais atteinte, la première échouant. Ce que l'ancien code rend à l'écran pour une salle refusée est établi par le **code** (`<PublicationBadge status={venue.publicationStatus} />`, un badge qui ne connaît que `DRAFT`) et par le constat du relecteur ; aucun navigateur ne l'a regardé dans cette session (les gestes de Ko : `docs/preuves/D352/scenarios-ko.md`).
- Un rouge de R-2 n'existe pas (consigne, R-3) : ce sont les mêmes gardes, mieux écrites ; la preuve est la campagne `neutralize-adm2.py` rejouée en entier.
