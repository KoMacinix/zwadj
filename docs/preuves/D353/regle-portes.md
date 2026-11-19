# D353 — règle des mesures, des choix, des portes et des campagnes, commitée AVANT toute passe et avant le premier code

**Sources** : la consigne du rang 55 (`docs/preuves/D353/consigne.md`), R-1 à R-7 et § 3, mot pour mot là où elle est citée ; les précédents `docs/preuves/D352/regle-portes.md` (les portes, l'e2e, les campagnes, ce qu'on fait d'un rouge) et `docs/preuves/D348/mesures/m3-delais.md` (la mesure sur un build de production) ; R-9 de D340 (batterie) ; R-15 de D343 (deux passes e2e) ; D348 (« un délai de cache se corrige s'il fait mentir la page »).

⛔ **Ce que ce document est** : des prédictions et des critères écrits AVANT de mesurer. Il ne dit pas ce que les mesures donneront ; chaque prédiction est une hypothèse, et une mesure qui la contredit se lit et s'écrit comme telle (D291), elle n'est pas « corrigée » ici après coup.

## 1. R-1 — la partie e2e : les deux états de départ, les prédictions, les critères du choix

**Le fait qui commande la méthode** (lu, vérifié à la lecture adverse : contrôles 2.f et 2.h) : aucune migration n'insère de référentiel ; `seed.ts` sème les QUATRE listes (wilayas, villes, équipements, styles) ; `global-setup.ts` ne sème rien ; `seedReferentials()` est appelé par les specs, donc APRÈS le projet `warmup`. Avant le semis les quatre listes sont **vides**, et le préchauffage visite `/fr/salles`. Les serveurs (`webServer`) démarrent **avant** `globalSetup` (code de Playwright 1.50.1, contrôle 2.i).

**Ce qui rend la mesure délicate** : le cache de données de Next du client vit sur disque, **ignoré par git** (`apps/client/.next/cache/fetch-cache`), et survit aux relances. Son état dépend de l'historique des passes (mesuré à l'ouverture : listes PLEINES écrites le 18/11/2026 à 20:25-20:26). **Une mesure s'écrit donc dans un état DÉCLARÉ** :
- **État F (« clone neuf »)** : `fetch-cache` absent. Obtenu en **déplaçant** le dossier (`fetch-cache` → `fetch-cache.avant-D353`, jamais supprimé), écriture locale déclarée au rapport.
- **État E (« empoisonné »)** : celui que laisse une passe jouée depuis F avec l'application d'aujourd'hui — le préchauffage a mis des listes vides en cache, moins d'une heure.

**Le test durci** : `r48-assistant-choix.e2e.ts` perd les deux gardes `if (… .wz-chip … count() > 0)`. Il exige, à l'étape des goûts, **autant de puces de styles que `SELECT count(*) FROM venue_styles` et autant de puces d'équipements que `SELECT count(*) FROM amenities`** (l'attendu se DÉRIVE de la base de l'e2e par le client `pg` du harnais, jamais un nombre écrit ; chaque puce est rendue, le composant ne tronque pas : `filter-wizard.tsx`), puis coche **une puce de chaque**. Les deux commentaires périmés (« la base e2e ne publie AUCUN style ») sont corrigés. Le renforcement d'assertion est déclaré dans la table (consigne, R-1).

**Prédictions (écrites avant la mesure)** — chacune est une hypothèse :
- **P1** — depuis l'état F, `r48` durcie, dans la suite COMPLÈTE, application et e2e d'aujourd'hui, est **ROUGE sur une assertion** (`expect(...)` en échec, lu à la première ligne du bloc d'échec, D304). Laquelle d'abord (la commune, ou les puces) est elle-même une mesure : les wilayas se mettent en cache comme les autres listes.
- **P2** — une seconde passe complète jouée juste après (état E) reste ROUGE : l'entrée vide, de moins d'une heure, est servie.
- **P3** — **l'ordre seul** (semer dans `global-setup.ts`, après la migration, avant le préchauffage) est VERT depuis F et ROUGE depuis E.
- **P4** — **la purge seule** (supprimer `fetch-cache` avant la première visite) est ROUGE depuis F et depuis E : le préchauffage remet des listes vides avant le semis.
- **P5** — **ordre + purge** est VERT depuis F et depuis E.

**Critère du choix, écrit avant** : la correction est acceptée **si et seulement si** (a) `r48` durcie est verte dans la suite complète depuis F **et** depuis E (un correctif qui ne tient que depuis un poste neuf ne protège pas un poste déjà empoisonné) ; (b) elle vit dans `e2e/` seul — **aucune ligne d'`apps/`** pour cette partie ; (c) le rouge est versé AVANT ; (d) deux passes complètes consécutives sont vertes. **Entre plusieurs corrections qui tiennent (a) à (d), la plus petite** ; le motif et les options écartées sont écrits dans l'extension de la table qui précède le premier fichier de la correction. Si la mesure contredit P3 à P5, **le choix suit la mesure**.

## 2. R-2 — la partie production : le montage, les cas, ce qui est vu et à quel moment

**Le montage (déclaré, jamais commité)** : une COPIE de `HEAD` hors du dépôt (`git archive`, dossier du scratchpad), où **seule** la ligne `revalidate: 3600` de `apps/client/src/lib/api.ts` est ramenée à **20 secondes** (consigne : « durée réduite pour la mesure seule »). `next build` puis `next start` de ce client (`NODE_ENV` = production) sur le port 3100 ; l'API est celle du dépôt, **inchangée** (`nest start`, port 3101), sur une base JETABLE `zwadj_r55mesure` (`DROP`/`CREATE` sur le serveur de `zwadj-db`, migrations rejouées par `prisma migrate deploy` ; **jamais la base de développement de Ko**). Aucun serveur de l'e2e ne tourne pendant ces mesures. Les pages qui lisent les listes (`/[locale]` et `/[locale]/salles`) sont `force-dynamic` (contrôle fait à l'ouverture) : rien n'est figé au build, seul le cache de données entre en jeu.

**L'instrument** : un script `.mjs` jetable (pièce versée, jamais promue en instrument, D291) qui interroge `GET /fr/salles` toutes les 2 s et imprime, par ligne horodatée en secondes depuis l'acte, le statut HTTP et **ce que la page montre** (nombre de styles, d'équipements, de communes), et **ce que l'API répond au même instant** (`GET /api/v1/venue-styles`, `/amenities`, `/wilayas`). Un instrument se **calibre sur un cas dont la réponse est connue** (D275) avant de servir : état seedé ⇒ la page montre les listes pleines ; état vide ⇒ zéros.

**Les cas** (chacun, une pièce, avec ce qui est vu et à quel moment) :
- **(i)** l'API rend **200 avec une liste VIDE** (base migrée, non semée), la page est visitée, **puis** la base est semée : combien de temps la page montre-t-elle encore des listes vides alors que l'API en rend de pleines ?
- **(ii)** une liste **PLEINE** est déjà gardée ; **puis** l'API rend **500** (la table `amenities` de la base jetable est renommée, l'erreur est réelle, pas simulée), ou est **arrêtée** ; la fenêtre expire ; **puis** l'API revient : que montre la page pendant la panne, et après le retour ?
- **(iii)** la **première** visite (cache vide) se fait **API arrêtée** ; **puis** l'API revient : combien de temps la page reste-t-elle sans listes ?
- **(iii-bis)** même chose avec l'API qui répond **500** à la première visite.

**Prédictions (écrites avant)** — hypothèses : **(i) ROUGE** (la liste vide est gardée toute la fenêtre) ; **(ii) VERT** (l'entrée pleine, périmée, est gardée tant que la relecture échoue ; elle ne devient pas `[]`) ; **(iii) et (iii-bis) VERTS** (une exception ou un 500 ne sont pas mis en cache : la page montre `[]` pendant la panne seulement). ⚠ La CAUSE de ce qu'on verra (le cache de données de Next ne retient pas une réponse non-200) est une **inférence non lue dans le code de Next** (D348) ; la mesure dit le COMPORTEMENT, pas le mécanisme.

**Le critère (consigne, R-3), tel quel** : « une liste PLEINE peut rester gardée une heure ; une réponse VIDE ou en ÉCHEC ne doit jamais être gardée — la page ne doit pas montrer des filtres vides pendant une heure alors que l'API a ses listes. » **Lecture écrite avant** : un cas est **ROUGE** si, à un instant où l'API (sondée au même instant) rend une liste pleine, la page montre cette liste vide plus longtemps qu'**un sondage** après que l'API est pleine ou revenue (on mesure en FENÊTRES : un défaut qui dure toute la fenêtre — 20 s ici, une heure en production — est rouge ; un décalage d'une requête ne l'est pas). Un cas où une liste pleine gardée reste affichée pendant une panne est **VERT** (c'est permis).

**Si au moins un cas est rouge** : le rouge est versé AVANT le code ; on corrige **ICI**, par le **plus petit** changement qui tient le critère ; les options écartées sont **écrites avec leur coût** — au minimum : (α) `no-store` sur les trois listes (le plus simple ; coût : trois lectures d'API de plus à chaque vue de `/salles` et de l'accueil, entrée `[CLIENT][PERF]` de D348, non mesurée), (β) une relecture SANS cache quand la réponse gardée est vide (le coût ne tombe que tant que la liste est vide), (γ) `unstable_cache` (API marquée instable par Next 15). La correction est gardée par un **test unitaire** (`api.test.ts`) et **rejouée sur le même montage** (mêmes cas, même instrument, calibré de nouveau). **Si tous les cas sont verts** : rien n'est changé dans `apps/`, et le rapport le dit.

## 3. R-4 et R-5 — les tests neufs, leurs rouges, leurs cibles

**R-4** : un test de `apps/client/src/lib/api.test.ts` affirme que `getVenueMap` passe `cache: "no-store"` (second argument de `fetch`, valeur lue — jamais « un objet quelconque »). **Rouge de référence** : la mutation de D351 (`docs/preuves/D351/r4/mutation-no-store.txt`, la suite entière reste verte sous `force-cache`) ; **rouge du lot** : la même mutation, jouée SOUS le test neuf, rougit par `AssertionError` ; restauration à l'octet prouvée. Une cible de `neutralisation/neutralize-r55.py` la porte.

**R-5** : un test d'intégration de `venue-map.int-spec.ts`, sur PostgreSQL réel, horloge figée (`vi.useFakeTimers({ toFake: ["Date"] })`, précédent `quote-numbering.int-spec.ts`), **date demandée dérivée de l'horloge figée par `civilTodayAt`/`formatCivilDate`** (jamais une date écrite). Fixtures : une salle publiée avec un créneau ACTIF, une publiée **sans aucun créneau**, une publiée dont **le seul créneau est inactif**. Il lit la LISTE (toutes ses pages) et la CARTE pour la même requête **sans date** (les trois y sont, des deux côtés) et **avec date** (seule la première y est, des deux côtés), et confronte les identifiants. **Prédiction** : VERT (une seule autorité, `publicFilter`). **Si la carte et la liste divergent** : c'est un DÉFAUT, le rouge est versé, il est RAPPORTÉ, et **le lot s'arrête sur ce point** — pas de correctif de filtre. Les cibles de `neutralize-r55.py` mutent la carte seule, puis `publicFilter` (la clause « sans créneau actif ») : chacune doit rougir par `AssertionError`.

## 4. Préparation, état machine, ce qu'on fait d'un rouge des portes

1. `git status --short` vide ; `git fetch` puis local = `origin/main` + les commits du lot en début de chaque passe ; ports 3100, 3101, 5273 et 5274 libres ; Docker lancé, `zwadj-db` « Up » ; `chrome` et `headless_shell` à 0.
2. **Sur batterie : aucune porte, aucune campagne, aucune mesure de durée** (R-9 de D340, D290) — la session s'arrête et le dit.
3. Aucun fichier n'est édité pendant qu'une porte, une campagne ou une mesure le lit (D270).
4. Les cas 1 à 3 de `docs/preuves/D352/regle-portes.md`, § 4, **s'appliquent tels quels** : un rouge dans un fichier du lot est un défaut du lot (corriger, rejouer les portes EN ENTIER, dire la première passe) ; un rouge hors du lot ⇒ **un seul rejeu** de la porte entière, `retries` inchangé (0), aucun délai changé ; un rejeu rouge ⇒ rien n'est poussé.

## 5. Les six portes — UNE passe, par le pilote de D340, non modifié

`bash docs/preuves/D340/portes/passe-secteur.sh <dossier hors dépôt>` : `typecheck`, `lint`, `test`, `build`, `test:int`, `test:e2e`, en série, **après la DERNIÈRE modification de code** ; aucun rejeu automatique. Les journaux bruts portent des jetons de développement : versés **MASQUÉS** par `masquer-jetons.py` (copie de `docs/preuves/D352/portes/masquer-jetons.py`, non modifiée), le compte des suites restantes rapporté.

## 6. L'e2e — deux passes complètes, vertes, consécutives (R-15 de D343)

L'attendu est **dérivé** (`playwright test --list`, lancé avant la première passe, son total écrit dans `portes/portes.md` avant elle). Passe 1 : celle du pilote. Passe 2 : `pnpm test:e2e` seul, juste après. **Deux passes vertes consécutives ⇒ la porte e2e est verte.** Les passes de la suite sont jouées dans l'état **E** et dans l'état **F** pour la correction de R-1 (§ 1, critère (a)).

## 7. Les campagnes

1. **Après les portes, jamais en parallèle d'une porte** (une campagne MUTE des fichiers sources, D270). En série, sur secteur.
2. **`python3 neutralisation/neutralize-r55.py`** (avec ses modes `--int` et `--e2e` pour les cibles qui l'exigent) : **chaque garde neuve est neutralisée, son échec LU** à la première ligne du bloc d'échec (`AssertionError`, D304 ; un délai, un `TypeError` ou une collecte à zéro ne sont jamais une morsure). L'empreinte sha256 du harnais est imprimée en tête de chaque journal ; **un harnais modifié en cours de campagne ⇒ la campagne est rejouée EN ENTIER**.
3. **Les campagnes que le lot TOUCHE** : `lancer-touchees.py` (copie de `docs/preuves/D352/neutralisation/lancer-touchees.py`, non modifiée ; la consigne le cite « (D352) » : c'est une **pièce versée**, pas un fichier de `neutralisation/`), qui croise `git diff` depuis le SHA de départ avec les fichiers que lit chaque campagne ; **dont `r48` et `ca1`** (consigne, § 3). Une ancre périmée est révisée par extension de la table, avant son commit, et la campagne rejouée en entier.
4. Les empreintes sha256 de TOUS les harnais sont relevées avant et après : identiques sauf ceux que le lot modifie (déclarés) et `neutralize-r55.py` (neuf).
5. Une campagne n'est jamais déclarée verte sans que sa ligne de résumé ait été **lue** (« N garde(s) mordue(s) sur M cible(s) · 0 muette · 0 non mesurée ») ; « ERREUR DE SCRIPT » = campagne **arrêtée**.

## 8. Ce que ce lot écrit sur la machine de Ko (déclaré ici, repris au rapport — règle de D337)

- **La base de développement de Ko : ni lue ni écrite.** `test:int` travaille sur `zwadj_test` et l'e2e sur `zwadj_e2e`, recréées à chaque lancement ; la mesure de production sur **`zwadj_r55mesure`**, créée puis SUPPRIMÉE par la session — toutes sur le serveur de `zwadj-db`.
- **`apps/client/.next/cache/fetch-cache`** (ignoré par git) : déplacé en `fetch-cache.avant-D353` pour produire l'état F ; les passes suivantes le réécrivent.
- **Une copie du dépôt** dans le scratchpad (hors dépôt), avec son propre `node_modules` (installation hors ligne depuis le magasin pnpm) : jamais commitée, supprimée à la fin ou nommée au rapport.
- Aucun `.env` n'est lu ; aucune migration ; rien dans `apps/pro` ; rien sur le chemin de l'argent.

## 9. Ce que ce lot n'écrit pas

La carte et la liste restent sur `publicFilter` : **aucun correctif de filtre**. `getVenueBySlug` et `searchVenues` restent en `no-store`. Hors lot (consigne, R-7) : l'en-tête de l'assistant d'une salle, les trois clés mortes, le titre « Carte des salles · Alger », le fournisseur des tuiles.
