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

### Extension 3 — les pièces de l'audit de secrets « b » et de son tri

Écrite **avant** le commit qui verse les pièces de l'extension 2 (le deuxième versement). Ces trois fichiers n'étaient pas dans l'extension 2 : ils sont nés de l'audit « b » lui-même (la sortie scellée, son tri différentiel, le contrôle « 0 valeur réelle » de D299). Chemins COMPLETS :

```
docs/preuves/D353/audit-secrets-d353b.txt
docs/preuves/D353/tri-audit-d353b.txt
docs/preuves/D353/aucune-valeur-reelle-d353b.txt
```

**Ce que cette extension écrit de ce que les mesures ont changé du plan** (détail : `rouges/rouges.md`, `mesures/choix-e2e.md`, versés à l'extension suivante) : la correction e2e candidate (`e2e/global-setup.ts`, `e2e/playwright.config.ts`) a été écrite, mesurée et **NE SERA PAS LIVRÉE** — la relecture des listes vides côté application (`apps/client/src/lib/api.ts`, R-3) rend `r48` verte depuis les deux états sans elle ; ces deux fichiers restent donc déclarés CONDITIONNELS et **n'existent pas au diff** (le rapport de fin de lot le dit).

### Extension 4 — les pièces du choix de la correction e2e et du rouge unitaire de R-3, et le STATUT des fichiers de code

Écrite **avant** le commit qui verse ces pièces et **avant le premier commit de code**. **Pièces** (chemins COMPLETS, relevés sur le disque, `git ls-files --others --exclude-standard docs/preuves/D353`, 19 fichiers) :

```
docs/preuves/D353/mesures/choix-e2e.md
docs/preuves/D353/mesures/choix/M1-OP-depuis-F-sortie-masquee.txt
docs/preuves/D353/mesures/choix/M5-QOP-depuis-F-sortie-masquee.txt
docs/preuves/D353/mesures/choix/M6-QOP-depuis-E-sortie-masquee.txt
docs/preuves/D353/mesures/choix/M7-QO-sans-purge-depuis-E-sortie-masquee.txt
docs/preuves/D353/mesures/choix/M8-QP-sans-semis-depuis-F-sortie-masquee.txt
docs/preuves/D353/mesures/choix/beta-seule-bilan.txt
docs/preuves/D353/mesures/choix/beta-seule-depuis-E-sortie-masquee.txt
docs/preuves/D353/mesures/choix/beta-seule-depuis-F-sortie-masquee.txt
docs/preuves/D353/mesures/choix/cache-apres-M1-OP-sans-sonde-statique.txt
docs/preuves/D353/mesures/choix/cache-apres-M5-sonde-semis-purge-depuis-F.txt
docs/preuves/D353/mesures/choix/cache-apres-M6-sonde-semis-purge-depuis-E.txt
docs/preuves/D353/mesures/choix/cache-apres-M7-sonde-semis-SANS-purge-depuis-E.txt
docs/preuves/D353/mesures/choix/cache-apres-M8-sonde-purge-SANS-semis-depuis-F.txt
docs/preuves/D353/mesures/choix/candidat-e2e-correction-ecartee.diff
docs/preuves/D353/mesures/choix/mesure-beta-seule.py
docs/preuves/D353/mesures/choix/rapport-masquage.txt
docs/preuves/D353/rouges/r3-rouge-tests-referentiels.py
docs/preuves/D353/rouges/r3-tests-referentiels-contre-code-d-avant.txt
```

**Le STATUT des fichiers de code, écrit avant leur commit** (la table dit « conditionnel » pour ceux dont l'existence dépendait d'un résultat) :

| fichier | statut | motif |
|---|---|---|
| `apps/client/src/lib/api.ts` | **EXISTE au diff** (R-3) | la condition de la table est REMPLIE : le cas (i) de la mesure sur un build de production est **ROUGE** (`docs/preuves/D353/mesures/r2-production.md` : la page reste vide 4 sondes de suite pendant que l'API rend ses listes ; sur `next dev`, 34 sondes sur 37). Le **plus petit** changement qui tient le critère : une relecture SANS cache d'une réponse VIDE, dans un assistant privé (`lireReferentiel`) ; les trois fonctions publiques gardent leur nom, leur type et leur retour. Options écartées, écrites dans le commentaire du code : `no-store` sur les trois listes, `unstable_cache`, `revalidateTag`. Rouge unitaire versé AVANT (`rouges/r3-tests-referentiels-contre-code-d-avant.txt` : 6 échecs sur 32, tous en `AssertionError`) |
| `apps/client/src/lib/api.test.ts`, `apps/api/test/int/venue-map.int-spec.ts`, `e2e/specs/r48-assistant-choix.e2e.ts`, `neutralisation/neutralize-r55.py` | **EXISTENT au diff** | déclarés en B à l'ouverture |
| `e2e/global-setup.ts`, `e2e/playwright.config.ts` | **N'EXISTENT PAS au diff** (conditionnels de la table, condition « la mesure désigne un de ces fichiers » **NON retenue**) | la correction e2e candidate (trois gestes : sonde de disponibilité statique, semis, purge) a été écrite et mesurée nécessaire AVANT R-3 ; avec la relecture de R-3, `r48` seule est verte depuis F et depuis E **sans elle** : décision de la session S-232 (plus petit changement, pas de couplage à un chemin interne de Next). Diff versé comme option écartée : `docs/preuves/D353/mesures/choix/candidat-e2e-correction-ecartee.diff` |
| `neutralisation/neutralize-r48.py`, `neutralize-pub1.py`, `neutralize-ca1.py`, `neutralize-ca6.py` | **à relever** | conditionnels : seulement si `lancer-touchees.py` trouve une ancre périmée ; leur éventuelle révision sera déclarée par une extension, avant son commit |

**Pièces encore À VENIR** (déclarées par des extensions ultérieures, avant leurs commits) : les journaux de `neutralize-r55.py` et des campagnes touchées, les portes, les deux passes e2e, les audits « c » et suivants, le contrôle de fin de lot.

### Extension 5 — les pièces de l'audit de secrets « c » et de son tri, et le script du contrôle de fin de lot

Écrite **avant** le commit qui verse les pièces de l'extension 4 (le troisième versement). Chemins COMPLETS :

```
docs/preuves/D353/audit-secrets-d353c.txt
docs/preuves/D353/tri-audit-d353c.txt
docs/preuves/D353/aucune-valeur-reelle-d353c.txt
docs/preuves/D353/controle-fin-de-lot.py
```

`controle-fin-de-lot.py` (le script, adapté de `docs/preuves/D352/controle-fin-de-lot.py`) n'existe pas encore : il est écrit à la fin du lot, avec sa sortie `controle-fin-de-lot.txt` (déjà déclarée en B). Il est déclaré ICI, avant son commit.

### Extension 6 — les pièces des campagnes, des portes et des gestes de Ko, et le script du contrôle de fin de lot

Écrite **avant** le commit qui verse ces pièces (le quatrième versement) et avant l'audit de secrets « d » qui les couvre. Elle déclare, en chemins COMPLETS relevés sur le disque (`git ls-files --others --exclude-standard docs/preuves/D353`, 42 fichiers non suivis dont 41 pas encore déclarés), **tout ce que ce versement ajoute**, sauf les trois pièces de l'audit « d » (sortie scellée, tri, contrôle « 0 valeur réelle »), déclarées par l'extension suivante, avant leur commit. `controle-fin-de-lot.py` et `scenarios-ko.md` (conditionnel de la table : R-3 corrige quelque chose de VISIBLE) existent maintenant.

```
docs/preuves/D353/mesures/pieces/fin-suppression-base-jetable.txt
docs/preuves/D353/neutralisation/campagne-ca1-int.txt
docs/preuves/D353/neutralisation/campagne-pub1-e2e.txt
docs/preuves/D353/neutralisation/campagne-r48-e2e.txt
docs/preuves/D353/neutralisation/campagne-r55-complete.txt
docs/preuves/D353/neutralisation/empreintes-harnais-apres.txt
docs/preuves/D353/neutralisation/empreintes-harnais-avant.txt
docs/preuves/D353/neutralisation/lancer-touchees-journaux/neutralize-available-on.py.log
docs/preuves/D353/neutralisation/lancer-touchees-journaux/neutralize-ca2.py.log
docs/preuves/D353/neutralisation/lancer-touchees-journaux/neutralize-horizon.py.log
docs/preuves/D353/neutralisation/lancer-touchees-sortie.txt
docs/preuves/D353/neutralisation/r55-journaux/R55-1-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/R55-10-e2e-r48.log
docs/preuves/D353/neutralisation/r55-journaux/R55-2-int-carte.log
docs/preuves/D353/neutralisation/r55-journaux/R55-3-int-carte.log
docs/preuves/D353/neutralisation/r55-journaux/R55-4-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/R55-5-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/R55-6-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/R55-7-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/R55-8-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/R55-9-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/prevol-client-api.log
docs/preuves/D353/neutralisation/r55-journaux/prevol-e2e-r48.log
docs/preuves/D353/neutralisation/r55-journaux/prevol-int-carte.log
docs/preuves/D353/neutralisation/rapport-masquage.txt
docs/preuves/D353/portes/FIN
docs/preuves/D353/portes/_index.txt
docs/preuves/D353/portes/attendu-e2e.txt
docs/preuves/D353/portes/build.txt
docs/preuves/D353/portes/e2e-liste.txt
docs/preuves/D353/portes/etat-avant-passe-2.txt
docs/preuves/D353/portes/etat-machine-pendant.txt
docs/preuves/D353/portes/lint.txt
docs/preuves/D353/portes/portes.md
docs/preuves/D353/portes/rapport-masquage.txt
docs/preuves/D353/portes/test-e2e-passe-2.txt
docs/preuves/D353/portes/test-e2e.txt
docs/preuves/D353/portes/test-int.txt
docs/preuves/D353/portes/test.txt
docs/preuves/D353/portes/typecheck.txt
docs/preuves/D353/scenarios-ko.md
```

**Ce que ces pièces portent** : `neutralisation/` — la campagne complète de `neutralize-r55.py` (**10 gardes mordues sur 10**, empreinte `94bea8a2…be75c` en première ligne de chaque journal), les trois campagnes du lanceur, `r48 --e2e`, `ca1 --int`, `pub1 --e2e`, les empreintes de TOUS les harnais avant et après (70 contre 70, 0 différent) ; `portes/` — les six portes du pilote, la passe 2 de l'e2e, l'attendu dérivé, le relevé de l'état machine ; `scenarios-ko.md` — le geste de Ko ; `mesures/pieces/fin-suppression-base-jetable.txt` — la suppression de la base jetable de mesure.
