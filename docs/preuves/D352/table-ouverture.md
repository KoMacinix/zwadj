# D352 — rang 54 — table d'ouverture

Lot : **la liste « Mes salles » du pro dit « Refusée » pour une salle refusée (R-1), et les 29 gardes d'écran des écrans `/admin` passent en assertion native (R-2, S-192 refusée)** — consigne du relecteur du 18/11/2026 adoptée par Ko tel quel (`docs/preuves/D352/consigne.md`, versée dans le commit suivant). Lot de **CODE** (il compte, D283) : compteur POUR MÉMOIRE TRENTE-TROIS → TRENTE-QUATRE à la clôture ; limite de cinq SUSPENDUE par Ko ; **aucune certification, aucune marque** (pause de Ko).

- **SHA de départ** : `95b68af01273fd40140089a2c1320ba1ae775016` (clôture de D351). `HEAD` = `origin/main` après `git fetch` (les deux sur ce SHA), arbre propre (`git status --short` : 0 ligne), aucun stash (0 ligne), branche `main`. Branches distantes gardées, relevées : `origin/front-client` = `43996e2`, `origin/integration-45` = `63511ce`, `origin/par-carte` = `7fdc679` (conformes à l'attendu de la consigne, § 0).
- **Numéro** : D352 — pris en lisant le registre de `ZWADJ_CONTINUITE.md` : 306 lignes `| Dnnn |` (expression `^\| D(\d+) \|`), dernier numéro **351** ; `D352` ne figure dans aucun des quatre fichiers d'autorité (compte 0 sur le texte APLATI : 0, 0, 0, 0 ; caractères aplatis examinés : 3 422 141, 743 698, 255 873, 5 206).
- **Reprise (consigne, § 0), relevée avant toute écriture** : rang 53 CLOS (D351) ; compteur POUR MÉMOIRE TRENTE-TROIS ; « RANG 54 : EN ATTENTE DE CADRAGE DU RELECTEUR » ; ordre des rangs, ligne « ⇒ RANG 54 » lue (`ZWADJ_CONTINUITE.md`, ordre des rangs) ; les deux entrées du backlog du rang 54 lues (« LA LISTE « MES SALLES » DU PRO DOIT DIRE « REFUSÉE »… » et « S-192 EST REFUSÉE… ») ; **aucun écart**.
- **Poste à l'ouverture** : **sur secteur** (`BatteryStatus` = 2, `PowerLineStatus` = Online, charge 100), RAM libre 4 037 Mo, `chrome` 0, `headless_shell` 0, `node` 0, Docker 29.8.0 lancé, conteneur `zwadj-db` « Up 2 days », ports 3100, 3101, 5273 et 5274 libres.
- **Le constat de la consigne (R-1), relevé au dépôt avant d'écrire** : `venue-list-page.tsx` rend `<PublicationBadge status={venue.publicationStatus} />` (« En attente de publication par Zwadj » pour `DRAFT`, que la salle soit refusée ou non) ; l'assistant d'une salle lit le refus par `usePublicationReview` + `PublicationHeaderState` (`publication-review.tsx`, D350) et la clé `publicationReview.refusedBadge` (« Refusée ») **existe déjà** dans les deux catalogues. La liste n'a aujourd'hui **aucun** appel à `GET /pro/venues/:id/publication`. `venue-list.test.tsx` monte `AppProviders` **sans** client de publication (le client réel est construit sur `authedRequest`, un `vi.fn()`).
- **Un piège relevé avant d'écrire** : `e2e/specs/a2-mount-effects.e2e.ts` compte `net.count("/api/v1/pro/venues")` par `includes` (`e2e/fixtures/harness.ts`, `count`) : une lecture `GET /api/v1/pro/venues/:id/publication` par carte de salle non publiée **entrerait dans ce compte** si un compte de ces tests porte une salle. À mesurer à l'e2e (deux passes) ; **si la garde refuse la voie (A), c'est un motif écrit pour la voie (B)** (consigne, R-1) — ou une révision écrite du compte, jamais un assouplissement silencieux.
- **Les 29 gardes de R-2, relevées au dépôt** (passe 3 de D350, `docs/preuves/D350/neutralisation/campagne-adm2-passe-3.txt`, 304 lignes examinées : 30 lignes « TestingLibraryElementError » pour 29 cibles — G-4 compte deux mesures) : `G-1 G-4 G-5 G-6 G-7 G-9` (`require-admin.test.tsx`, `use-no-index.test.tsx`), `Q-1 Q-2 Q-4 Q-5 Q-6 Q-8 Q-10 Q-11` (`venue-queue-page.test.tsx`), `P-2 P-3 P-6 P-9 P-10 P-11` (`venue-review-page.test.tsx`), `X-1 X-2 X-3 X-6 X-8` (`deletion-requests-page.test.tsx`), `R-2 R-3 R-6 R-7` (`publication-review.test.tsx`) = 6 + 8 + 6 + 5 + 4 = **29**.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 et D334 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) la consigne en pièce, la règle des portes (écrite et commitée AVANT les passes) et la sortie de la lecture adverse de la consigne contre le dépôt, **avant tout `.md` d'autorité** ; (3) **les pièces des rouges de R-1 (R-3 : « le test qui montre « En attente » sur une salle refusée »), avec l'empreinte sha256 de chaque fichier de test joué, AVANT le premier commit de code** ; (4) le code ; (5) les tests de R-2 (assertions natives), puis le harnais corrigé ; (6) les campagnes, les portes, l'e2e ; (7) les `.md` d'autorité, les arbitrages de Ko en première écriture ; (8) le contrôle de fin de lot, push puis fetch. Toute extension de cette table : un commit propre qui l'ajoute **avant** le commit du fichier qu'elle couvre.
- **Règle d'arrêt** (consigne, § 0) : « Un écart : tu t'arrêtes et tu le dis. » Aucun écart à l'ouverture. **Et** (R-1) : la voie (A) d'abord, sans contrat neuf ; la voie (B) — un champ BOOLÉEN « refusée » dans la liste du pro — **seulement si (A) est mesuré insuffisant, avec le motif écrit** (nombre d'appels, affichage qui saute, refus d'une garde) ; dans les deux cas **le motif d'un refus n'entre jamais dans la liste** (la garde de `venues.service.spec.ts`, « JAMAIS … rejectionReason », reste ENTIÈRE).
- **Écrit pour ne pas se lire comme tenu** : cette table ne dit pas que la voie (A) tient — elle dit qu'elle est tentée la première. Elle ne dit pas non plus que les 29 gardes de R-2 mordent déjà en assertion native : c'est la campagne `neutralize-adm2.py` rejouée EN ENTIER sur le harnais final qui le dira, chaque verdict lu à la première ligne du bloc d'échec (D304).

## A. Le départ

Voir les puces ci-dessus (SHA, numéro, reprise, poste). Aucun fichier n'est modifié à l'ouverture : ce fichier est le premier commit du lot.

## B. Les fichiers de CE lot — chemins COMPLETS

Code et tests de R-1 (la liste « Mes salles »), de R-2 (les 29 gardes), harnais :

```
apps/pro/src/venues/venue-list-page.tsx
apps/pro/src/venues/publication-review.tsx
apps/pro/src/venues/venue-form.tsx
apps/pro/src/venues/venue-list.test.tsx
apps/pro/src/venues/publication-review.test.tsx
apps/pro/src/auth/require-admin.test.tsx
apps/pro/src/admin/use-no-index.test.tsx
apps/pro/src/admin/venue-queue-page.test.tsx
apps/pro/src/admin/venue-review-page.test.tsx
apps/pro/src/admin/deletion-requests-page.test.tsx
neutralisation/neutralize-adm2.py
neutralisation/neutralize-r54.py
```

Pièces du lot (celles qu'on connaît à l'ouverture ; les autres entrent par extension, avant leur commit) :

```
docs/preuves/D352/table-ouverture.md
docs/preuves/D352/consigne.md
docs/preuves/D352/regle-portes.md
docs/preuves/D352/lecture-adverse/confronter-consigne.py
docs/preuves/D352/lecture-adverse/confronter-sortie.txt
docs/preuves/D352/scenarios-ko.md
docs/preuves/D352/controle-fin-de-lot.txt
```

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

```
ZWADJ_CONTINUITE.md
ZWADJ_BACKLOG.md
AGENTS.md
```

`AGENTS.md` : annotations seules (le bloc « LES ÉCRANS `/admin` » dit encore que « la LISTE « Mes salles » du pro dit encore « en attente » pour une salle refusée » et que « 29 gardes d'écran se lisent en erreur de requête de Testing Library (S-192, à ratifier) » ; le compteur) — annoté, pas réécrit. `CLAUDE.md` n'est pas modifié.

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucune migration, rien dans `apps/client`, rien sur le chemin de l'argent** (consigne, R-4 ; D316, par la fonction). `setRates` et `VENUE_ADMIN_SELECT` (`apps/api/src/venues/venues-admin.service.ts`) **intouchés** : le contrôle d'invariance de `neutralize-adm2.py` (comparaison au texte de `b8e5511`) le prouve.
- **Pas de contrat d'API neuf par défaut** : `packages/types/src/venue.ts`, `apps/api/src/venues/venues.service.ts`, `packages/api-client/src/venue-client.ts` ne sont déclarés qu'au titre de la voie (B), ci-dessous.
- **`neutralisation/lancer-campagnes.py`** n'est pas modifié (il découvre `neutralize-*.py`) ; **`packages/i18n/messages/*.json`** ne sont déclarés qu'au titre des fichiers conditionnels : la clé `publicationReview.refusedBadge` existe déjà en FR et en AR.
- **Le candidat du rang 55** (« la mémoire du site client », consigne R-5) : rien n'en est codé ici.

## Fichiers CONDITIONNELS (leur existence ou leur modification dépend d'un résultat)

Chacun est déclaré **avec sa condition** ; le rapport de fin de lot dit lesquels existent.

| fichier | condition |
|---|---|
| `packages/i18n/messages/fr.json`, `packages/i18n/messages/ar.json` | seulement si une clé neuve s'avère nécessaire à l'état « vérification » de la carte (attendu : aucune ; `publicationReview.refusedBadge` et `publicationReview.loadError` existent) ; alors les deux catalogues, la parité, les clés arabes listées « à relire par un humain » |
| `apps/pro/src/test-support/client-doubles.ts` | seulement si un double du client de publication partagé s'avère nécessaire (le test de la liste en construit un localement, comme `publication-review.test.tsx`) |
| `e2e/specs/a2-mount-effects.e2e.ts` | seulement si l'e2e MESURE que le compte `net.count("/api/v1/pro/venues")` change par la lecture de la voie (A) ; sa révision serait **écrite, avec sa mesure** |
| `packages/types/src/venue.ts`, `apps/api/src/venues/venues.service.ts`, `apps/api/src/venues/venues.service.spec.ts`, `packages/api-client/src/venue-client.ts`, `packages/api-client/src/venue-client.test.ts`, `apps/api/test/int/contract-api-client.int-spec.ts` | **voie (B) seulement** : un champ BOOLÉEN « refusée » dans la liste du pro, si (A) est MESURÉ insuffisant ; le motif est écrit dans l'extension **avant** le premier de ces fichiers ; `venues.service.spec.ts` n'y gagne qu'un champ, la garde « JAMAIS … rejectionReason » y reste ENTIÈRE |

## Extensions de la table

*(chaque extension est un commit propre, avant le commit du fichier qu'elle couvre)*

### Extension 1 — les pièces du premier versement, des rouges de R-1 et de la mesure de la voie (A), et le fichier d'aide des assertions natives

Écrite **avant** le commit qui verse la consigne, la règle des portes et la lecture adverse avec le premier audit de secrets, et **avant** le commit des rouges. Chemins COMPLETS :

```
docs/preuves/D352/audit-secrets-d352a.txt
docs/preuves/D352/tri-audit-d352a.txt
docs/preuves/D352/audit-secrets-d352b.txt
docs/preuves/D352/tri-audit-d352b.txt
docs/preuves/D352/rouges/rouges.md
docs/preuves/D352/rouges/venue-list-rouge-brut.txt
docs/preuves/D352/mesures/diagnostic-appels.md
docs/preuves/D352/mesures/diagnostic-appels-sortie-1.txt
docs/preuves/D352/mesures/diagnostic-appels-sortie.txt
docs/preuves/D352/mesures/zz-diag-r54.test.tsx.txt
apps/pro/src/test-support/native-presence.ts
```

- **Les audits de secrets (D298)** : `audit-secrets-d352a.txt` couvre le premier versement (consigne, règle, lecture adverse) ; `audit-secrets-d352b.txt` couvre les rouges et la mesure. Chaque sortie est scellée (`--sortie`), chaque tri est celui de `docs/preuves/D299/outils/alertes-nouvelles.py`.
- **Les rouges de R-1** (`rouges/`) : la sortie brute du fichier de test de la liste joué CONTRE L'ANCIEN CODE (10 échecs sur 24, tous en `AssertionError`), l'empreinte sha256 de `apps/pro/src/venues/venue-list.test.tsx` à cet instant, la lecture de chaque échec. **Elles entrent dans un commit ANTÉRIEUR au premier commit de code** (D334, item 5).
- **La mesure de la voie (A)** (`mesures/`) : un test JETABLE (copié ici en `.txt`, retiré de `apps/pro`) compte les lectures du refus à la relecture silencieuse d'entrée et à la relecture voulue ; sa sortie est versée, **avec celle du premier essai** (`diagnostic-appels-sortie-1.txt`, NON représentatif — la liste du double répondait à l'instant et les cartes n'ont jamais été démontées : gardé, dit tel quel dans `diagnostic-appels.md`). C'est la mesure du critère 1 de `regle-portes.md`.
- **`apps/pro/src/test-support/native-presence.ts`** (code de test, NEUF, déclaré conditionnel à l'ouverture — « seulement si… » n'était pas écrit pour lui ; il l'est ici) : deux fonctions, `elementPresent` et `elementAttendu`, qui écrivent le verdict de présence d'un élément en assertion NATIVE (`queryBy…` + `expect(…).not.toBeNull()`). Motif : les 29 gardes de R-2 passent en assertion native dans six fichiers ; la règle s'écrit UNE fois, pas six. Elle ne remplace aucune autorité (D78).
- **Le fichier de test de la liste** (`venue-list.test.tsx`) et le code de R-1 (`venue-list-page.tsx`, `publication-review.tsx`, `venue-form.tsx`) étaient déjà déclarés à l'ouverture.
