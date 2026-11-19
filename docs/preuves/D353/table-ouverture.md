# D353 — rang 55 — table d'ouverture

Lot : **la mémoire du site client — ce qu'il garde et ce qu'il ne doit pas garder (les listes de référentiels, la carte)** — consigne du relecteur « RANG 55 » du 19/11/2026, adoptée par Ko tel quel (`docs/preuves/D353/consigne.md`, versée dans le commit suivant). Trois entrées du backlog, un seul sujet : (i) « LES LISTES DE RÉFÉRENTIELS DU CLIENT SONT MISES EN CACHE UNE HEURE… » (`[E2E][INFRA]`, D346), (ii) « LE `no-store` DE `getVenueMap` N'EST AFFIRMÉ PAR AUCUN TEST » (`[TESTS][CARTE]`, D351), (iii) « « SANS CRÉNEAU ACTIF » (AVEC UNE DATE) N'EST PAS JOUÉE SUR LA CARTE » (`[TESTS][CARTE]`, D351). Lot de **CODE** (il compte, D283) : compteur POUR MÉMOIRE TRENTE-QUATRE → TRENTE-CINQ à la clôture ; limite de cinq SUSPENDUE par Ko ; **aucune certification, aucune marque** (pause de Ko).

- **SHA de départ** : `cd8e07921a4c18c2559506c463ede06eed3178a1` (clôture de D352). `HEAD` = `origin/main` après `git fetch` (les deux sur ce SHA), arbre propre (`git status --short` : 0 ligne), aucun stash (0 ligne), branche `main`. Branches distantes gardées, relevées : `origin/front-client` = `43996e2`, `origin/integration-45` = `63511ce`, `origin/par-carte` = `7fdc679`.
- **Numéro** : D353 — pris en lisant le registre de `ZWADJ_CONTINUITE.md` : 307 lignes `| Dnnn |` (expression `^\| D(\d+) \|`), dernier numéro **352** ; `D353` ne figure dans aucun des quatre fichiers d'autorité (compte 0 sur le texte APLATI : 0, 0, 0, 0 ; caractères aplatis examinés : 4 500 187).
- **Reprise (consigne, § 0), relevée avant toute écriture** : rang 54 CLOS (D352) ; compteur POUR MÉMOIRE TRENTE-QUATRE ; « RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat : la mémoire du site client) ; `origin/main` = `cd8e079` ; arbre propre, sans stash, sur `main` ; **aucun écart**.
- **Poste à l'ouverture** : **sur secteur** (`BatteryStatus` = 2, `PowerLineStatus` = Online, charge 65 %), RAM libre 5 251 Mo, `chrome` 0, `headless_shell` 0, `node` 0, Docker 29.8.0 lancé, conteneur `zwadj-db` « Up 2 days », ports 3100, 3101, 5273 et 5274 libres.
- **Les constats du relecteur (consigne, § 2), RELEVÉS au dépôt avant d'écrire — par lecture, à MESURER ensuite** : `getWilayas`, `getAmenities`, `getVenueStyles` (`apps/client/src/lib/api.ts`) lisent l'API en `next: { revalidate: 3600 }` et rendent `[]` sur une réponse non ok ou une exception ; `getVenueMap` est en `cache: "no-store"` ; le projet `warmup` de `e2e/playwright.config.ts` est une dépendance de `chromium` ; `r48-assistant-choix.e2e.ts` tolère l'absence de puces (`if (… .wz-chip … count() > 0)`) et son commentaire dit « la base e2e ne publie AUCUN style » alors que D346 écrit « 4 styles en base » ; `apps/api/prisma/seed.ts` sème **les quatre listes** (wilayas, villes, équipements, styles) et **aucune migration n'en insère** : avant le semis, les quatre listes sont vides, et le préchauffage les voit dans cet état (**non encore mesuré**). `apps/client/.next/cache/fetch-cache` (ignoré par git) porte aujourd'hui des listes PLEINES, écrites le 18/11/2026 à 20:25-20:26 : **l'état de ce cache dépend de l'historique des passes**.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 et D334 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) l'extension 1 de cette table, SEULE ; (3) la consigne en pièce, la règle des portes (écrite et commitée AVANT les passes) et la sortie de la lecture adverse de la consigne contre le dépôt, avec le premier audit de secrets, **avant tout `.md` d'autorité** ; (4) **les pièces des rouges** — r48 durcie dans la suite COMPLÈTE (R-1), les mesures sur un build de production (R-2), la mutation `no-store` sous le test neuf (R-4), le cas de R-5 — **avec l'empreinte sha256 de chaque fichier de test joué, AVANT le premier commit de code** ; (5) le code et les tests ; (6) le harnais, les campagnes, les portes, l'e2e ; (7) les `.md` d'autorité, les arbitrages de Ko en première écriture ; (8) le contrôle de fin de lot, push puis fetch. Toute extension de cette table : un commit propre qui l'ajoute **avant** le commit du fichier qu'elle couvre.
- **Règle d'arrêt** (consigne, § 0, R-5) : « Un écart : tu t'arrêtes et tu le dis. » Aucun écart à l'ouverture. **Et** (R-5) : si la carte et la liste DIVERGENT pour « sans créneau actif, avec une date », c'est un défaut : le rouge est versé, il est rapporté, **et le lot s'arrête sur ce point** — aucun correctif de filtre dans ce lot.
- **Écrit pour ne pas se lire comme tenu** : cette table ne dit pas que les référentiels sont gardés vides en production, ni que la suite e2e voit des listes vides — ce sont les constats du relecteur, à mesurer (R-1 sur la suite complète, R-2 sur un build de production). Elle ne dit pas non plus qu'un correctif de `apps/client/src/lib/api.ts` aura lieu : il n'est déclaré qu'à titre **conditionnel** (R-3).

## A. Le départ

Voir les puces ci-dessus (SHA, numéro, reprise, poste). Aucun fichier n'est modifié à l'ouverture : ce fichier est le premier commit du lot.

## B. Les fichiers de CE lot — chemins COMPLETS

Code et tests (R-1 : la tolérance de `r48` retirée ; R-4 : le `no-store` de la carte ; R-5 : « sans créneau actif » sur la carte), harnais :

```
e2e/specs/r48-assistant-choix.e2e.ts
apps/client/src/lib/api.test.ts
apps/api/test/int/venue-map.int-spec.ts
neutralisation/neutralize-r55.py
```

Pièces du lot (celles qu'on connaît à l'ouverture ; les autres entrent par extension, avant leur commit) :

```
docs/preuves/D353/table-ouverture.md
docs/preuves/D353/consigne.md
docs/preuves/D353/regle-portes.md
docs/preuves/D353/lecture-adverse/confronter-consigne.py
docs/preuves/D353/lecture-adverse/confronter-sortie.txt
docs/preuves/D353/controle-fin-de-lot.txt
```

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

```
ZWADJ_CONTINUITE.md
ZWADJ_BACKLOG.md
AGENTS.md
```

`AGENTS.md` : annotations seules (le compteur de la chaîne « AUCUN LOT NE PART DANS `main` SOUS UNE PORTE ROUGE… » ; l'invariant « LA FICHE D'UNE SALLE N'EST JAMAIS EN CACHE (D348) », qui dit que les listes de référentiels « n'ont pas été mesurées sous ce mécanisme » ; et, **seulement si R-3 corrige**, un invariant sur les référentiels) — annoté, pas réécrit. `CLAUDE.md` n'est pas modifié.

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucune migration, aucun contrat d'API neuf, aucun montant, rien dans `apps/pro`** (consigne, R-6). `getVenueBySlug` et `searchVenues` restent en `no-store` : l'invariant de D348 ne bouge pas.
- **Rien de `apps/api/src/`** : « pas de correctif de filtre dans ce lot » (R-5). Si la carte et la liste divergent, le lot s'arrête sur ce point.
- **Hors lot** (consigne, R-7) : le saut de l'en-tête de l'assistant d'une salle (c'est une entrée de backlog `[PRO]`, sans rang : le seul fichier touché est `ZWADJ_BACKLOG.md`) ; les trois clés mortes du catalogue (D351) ; le titre « Carte des salles · Alger » ; le fournisseur des tuiles (BLOQUE le lancement, Ko).
- **`neutralisation/lancer-campagnes.py`** n'est pas modifié ; **`packages/i18n/messages/*.json`** ne sont pas touchés (aucune clé neuve).

## Fichiers CONDITIONNELS (leur existence ou leur modification dépend d'un résultat)

Chacun est déclaré **avec sa condition** ; le rapport de fin de lot dit lesquels existent.

| fichier | condition |
|---|---|
| `e2e/global-setup.ts`, `e2e/playwright.config.ts`, `e2e/fixtures/harness.ts`, `e2e/specs/warmup.setup.ts` | **R-1, partie e2e** : le correctif vit dans `e2e/` seul (ordre du semis et du préchauffage, ou purge du cache de fetch du client au démarrage de la suite) ; **lequel de ces fichiers, la mesure le désigne** — le motif est écrit dans une extension de cette table, **avant** le premier d'entre eux |
| `apps/client/src/lib/api.ts` | **R-3 seulement** : si la mesure sur un build de production est ROUGE sous le critère (une réponse VIDE ou en ÉCHEC ne doit jamais être gardée) ; rouge versé AVANT le code, le plus petit changement qui tient le critère, les options écartées écrites ; **vert ⇒ rien n'est changé dans `apps/`, et le rapport le dit** |
| `neutralisation/neutralize-r48.py`, `neutralisation/neutralize-pub1.py`, `neutralisation/neutralize-ca1.py`, `neutralisation/neutralize-ca6.py` | seulement si `lancer-touchees.py` trouve une ANCRE périmée par ce lot (un fichier lu par la campagne a changé) ; la révision est déclarée par extension **avant** son commit, et la campagne est rejouée EN ENTIER (précédent S-230 de D352) |
| `docs/preuves/D353/scenarios-ko.md` | seulement si R-3 corrige quelque chose de **visible** (consigne, § 4 : « Gestes de Ko : aucun, sauf si R-3 corrige quelque chose de visible ») |
| `docs/preuves/D353/mesures/`, `docs/preuves/D353/rouges/`, `docs/preuves/D353/neutralisation/`, `docs/preuves/D353/portes/` | les pièces des mesures, des rouges, des campagnes et des portes ; **leurs noms dépendent des résultats** : chacune est déclarée par une extension, en chemins complets, avant son commit |

## Extensions de la table

*(chaque extension est un commit propre, avant le commit du fichier qu'elle couvre)*

### Extension 1 — les pièces du premier versement : la note de la lecture adverse, la première passe de son instrument, l'audit de secrets « a » et son tri

Écrite **avant** le commit qui verse la consigne, la règle des portes et la lecture adverse (et avant le commit des rouges). Les fichiers déjà listés en B (`consigne.md`, `regle-portes.md`, `lecture-adverse/confronter-consigne.py`, `lecture-adverse/confronter-sortie.txt`) entrent dans ce même commit. **Chemins COMPLETS des pièces qui s'y ajoutent** :

```
docs/preuves/D353/lecture-adverse/lecture-adverse.md
docs/preuves/D353/lecture-adverse/confronter-sortie-passe-1.txt
docs/preuves/D353/audit-secrets-d353a.txt
docs/preuves/D353/tri-audit-d353a.txt
```

**Pourquoi `confronter-sortie-passe-1.txt`** : la première passe de l'instrument de lecture adverse a rendu deux ✗ qui étaient des défauts DE L'INSTRUMENT (contrôles 1.c et 2.h), confrontés à la source avant d'être crus (D275). Cette sortie est gardée, non retouchée ; la sortie finale (`confronter-sortie.txt`) vient de l'instrument corrigé, rejoué en entier, calibration comprise (règle de D298). La note `lecture-adverse.md` écrit les deux défauts et les six « ≈ ».

### Extension 2 — les pièces des ROUGES (R-1, R-4, R-5) et des mesures de production (R-2)

Écrite **avant** le commit qui verse ces pièces, et donc **avant le premier commit de code** (D334, point 5). Elle déclare AUSSI les pièces de ce versement qui ne sont pas des rouges (l'instrument de mesure et ses sorties, la lecture des mesures de production) : tout ce qui est sorti du scratchpad de la session pour entrer au dépôt. Chemins COMPLETS, relevés sur le disque (`git ls-files --others --exclude-standard docs/preuves/D353`, 32 fichiers) :

```
docs/preuves/D353/mesures/pieces/calibration.txt
docs/preuves/D353/mesures/pieces/cas-i-dev.txt
docs/preuves/D353/mesures/pieces/cas-i-passe-1-instrument-bloquant.txt
docs/preuves/D353/mesures/pieces/cas-i.txt
docs/preuves/D353/mesures/pieces/cas-ii-500.txt
docs/preuves/D353/mesures/pieces/cas-ii-arret.txt
docs/preuves/D353/mesures/pieces/cas-iii-bis.txt
docs/preuves/D353/mesures/pieces/cas-iii.txt
docs/preuves/D353/mesures/pieces/cas-reload-dev.txt
docs/preuves/D353/mesures/pieces/depouillement.txt
docs/preuves/D353/mesures/pieces/depouiller.py
docs/preuves/D353/mesures/pieces/instrument-r55.mjs
docs/preuves/D353/mesures/pieces/lire-cache.py
docs/preuves/D353/mesures/r2-production.md
docs/preuves/D353/rouges/cache-00-avant-D353-ouverture.txt
docs/preuves/D353/rouges/cache-01-apres-r48-seule-depuis-F.txt
docs/preuves/D353/rouges/cache-02-etat-E-empoisonne-par-la-mesure-dev.txt
docs/preuves/D353/rouges/cache-03-apres-warmup-seul-1.txt
docs/preuves/D353/rouges/cache-04-apres-warmup-seul-2.txt
docs/preuves/D353/rouges/masquer-jetons.py
docs/preuves/D353/rouges/r1-etat-avant-rouge-F.txt
docs/preuves/D353/rouges/r1-r48-seule-etat-E-ROUGE-sortie-masquee.txt
docs/preuves/D353/rouges/r1-r48-seule-etat-F-ROUGE-sortie-masquee.txt
docs/preuves/D353/rouges/r1-suite-complete-etat-F-VERTE-sortie-masquee.txt
docs/preuves/D353/rouges/r1-warmup-seul-etat-F-2-base-timeline.txt
docs/preuves/D353/rouges/r1-warmup-seul-etat-F-2-sortie-masquee.txt
docs/preuves/D353/rouges/r1-warmup-seul-etat-F-sortie-masquee.txt
docs/preuves/D353/rouges/r4-mutation-no-store-sous-test-neuf.txt
docs/preuves/D353/rouges/r4-mutation-no-store.py
docs/preuves/D353/rouges/r5-carte-sans-creneau-actif-sortie.txt
docs/preuves/D353/rouges/rapport-masquage.txt
docs/preuves/D353/rouges/rouges.md
```

**Ce que cette extension écrit de ce que le rouge a trouvé** (détail : `docs/preuves/D353/rouges/rouges.md`) : la prédiction P1 de `regle-portes.md` (« la suite COMPLÈTE depuis F est rouge ») est **CONTREDITE par la mesure** — 109 passés, 1 ignoré ; le rouge du lot est celui de `r48` **jouée seule**, depuis F et depuis E. La décision de la session (S-231) est écrite dans `rouges.md`, § 1. **Les fichiers de code que la mesure du choix désignera** (`e2e/global-setup.ts`, éventuellement `e2e/playwright.config.ts`) restent déclarés CONDITIONNELS par la table ci-dessus ; leur extension, avec le motif, précède leur commit.

**Pièces de la table qui N'ENTRENT PAS dans ce commit** : `neutralisation/neutralize-r55.py`, les trois fichiers de test, `docs/preuves/D353/controle-fin-de-lot.txt` — ils viennent après.
