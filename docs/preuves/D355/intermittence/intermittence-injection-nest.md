# Intermittence : l'injection de `Reflector` échoue à l'amorçage de l'application d'intégration — rang 57 (D355) — **CAUSE NON ÉLUCIDÉE**

Pièce **datée du 19/11/2026**, écrite pendant le lot, **versée parce que la décision D355 la cite** (D291). Elle dit ce qui a été **observé**, ce qui est **inféré**, ce qui a été **essayé** et ce qui reste **inconnu**. Rien ici n'est corrigé : l'objet du lot est ailleurs (R-4 : rien hors de ses fichiers déclarés) et un défaut croisé **se rapporte, il ne se corrige pas** (CLAUDE.md).

## 1. Le symptôme (relevé, sortie brute versée)

`createTestApp()` (`apps/api/test/int/helpers.ts`) échoue dans le `beforeAll` du fichier :

```
Error: Nest can't resolve dependencies of the JwtAuthGuard (JwtService, ?). Please make sure that the argument Reflector at index [1] is available in the AuthModule module.
```

Toutes les suites du fichier sont alors « skipped », puis `TypeError: Cannot read properties of undefined (reading 'prisma' | 'app')` dans l'`afterAll` (le contexte n'a jamais été créé). C'est une erreur d'**amorçage**, pas d'un test : aucune assertion du fichier n'a joué.

## 2. Ce qui a été **mesuré** (chaque ligne a sa pièce)

| Fenêtre (heure locale, 19/11/2026) | Lancement | Résultat | Pièce |
|---|---|---|---|
| avant le résumé de session (≈ 21:50) | les deux specs neuves et `staff-login.int-spec.ts` | **échec** à l'amorçage (3 lancements) | ⚠ sorties **NON conservées** (rapportées seulement par le résumé de la session) |
| 21:5x | `staff-login.int-spec.ts`, avec chaque groupe de fichiers de production appliqué seul, puis tous ensemble | réussite, 34 sur 34 | `bissection.txt` |
| 21:58:22 → 21:58:53 | `staff-login-race.int-spec.ts` (arbre de production complet) | **réussite**, 8 sur 8 | `vert-course-1.txt` |
| **21:58:59** → 21:59:20 | `client-record-audit.int-spec.ts` (le MÊME arbre) | **échec** à l'amorçage | `echec-audit-1.txt` |
| **21:59:56** → 22:00:18 | une sonde jetable (les mêmes imports que la spec d'audit) | **échec** | `echec-sonde-1.txt` |
| **22:00:34** → 22:01:17 | trois sondes jetables (A : `./helpers` seul ; B : `./helpers` + `./staff-helpers` ; C : `./helpers` + un import de type) | **échec ×3** | `echec-sondes-abc.txt` |
| 22:02 | la sonde A avec le code de production **d'avant** | réussite | `bissection.txt` |
| 22:02 → 22:05 | la sonde A : chaque groupe de fichiers seul, chaque paire, puis tous ensemble | **réussite** à chaque fois | `bissection.txt` |
| 22:05:33 et 22:05:53 | la sonde A, arbre de production complet, deux lancements | **réussite** ×2 | — (sorties non versées : deux lignes « 1 passed ») |
| 22:07:13 → 22:08:10 | `staff-login-race.int-spec.ts` puis `client-record-audit.int-spec.ts` (le MÊME arbre qu'à 21:58) | **réussite**, 8 sur 8 puis 19 sur 19 | `reussite-rejeu-course.txt`, `reussite-rejeu-audit.txt` |

⇒ **Cinq lancements consécutifs ont échoué** (21:58:59 → 22:01:17) sur un arbre de production **dont les douze fichiers ont une empreinte identique** à celle des lancements qui ont réussi avant (21:58:22) et après (22:05 →). Ce n'est donc **ni** le code de production, **ni** un groupe de fichiers, **ni** l'ordre des imports de la spec (la sonde A, qui n'importe que `./helpers`, a échoué puis réussi sans qu'une ligne de source ait changé entre les deux autres que celles que la bissection rejouait à l'identique).

État de la machine, **relevé une fois, avant la fenêtre** (entre 21:53 et 21:58) : sur secteur (`BatteryStatus` = 2), aucun processus `node`, `chrome` ni `headless_shell`. **Pendant** la fenêtre, un processus Python — l'audit de secrets b du lot, qui lit l'arbre — tournait depuis 21:45:50 ; **il tournait aussi pendant les réussites de 22:05 à 22:09** : sa seule présence n'est donc pas une condition suffisante. La RAM n'a pas été relevée.

## 3. Ce qui a été **lu** (code) et ce qui est **inféré**

`vitest 3.2.7` s'appuie sur `vite-node 3.2.4`. Dans `node_modules/.pnpm/vite-node@3.2.4_…/node_modules/vite-node/dist/server.mjs`, `isValidNodeImport(id)` (lignes 112 à 128) décide, pour chaque fichier d'un paquet, s'il se charge **nativement** (externalisé) ou s'il est **exécuté par vite-node** (« inline ») : il lit le fichier et l'analyse, et **rend `false` — donc « inline » — sur n'importe quelle exception de lecture ou d'analyse** (`} catch { return false; }`, lignes 125 à 127). La décision est ensuite **mise en cache pour toute la durée du lancement** (`shouldExternalize`, lignes 129 à 133 : `externalizeCache`).

⚠ **INFÉRENCE, non mesurée** : une lecture transitoirement refusée (verrou d'un antivirus ou d'un indexeur, épuisement de descripteurs) ferait exécuter **deux fois** un module de `@nestjs/core` — une fois nativement, une fois par vite-node —, ce qui donnerait deux classes `Reflector` distinctes ; l'injecteur chercherait alors dans le module global l'**autre** classe que celle du garde. C'est cohérent avec le message (« argument **Reflector** … is available » : le nom est connu, la classe diffère) et avec la **durée** du phénomène (la décision se met en cache pour un lancement, pas pour la suivante).

## 4. Ce qui a été **essayé** pour mesurer ce mécanisme — et qui ne l'établit PAS

Une configuration jetable (`vitest.config.zz-inline.ts`, supprimée après la mesure) identique à celle de l'intégration, avec **une seule** différence : `server.deps.inline` forçait « inline » le fichier qui définit `Reflector` (`@nestjs/core/services/reflector.service`). Résultat : **la sonde A réussit** (1 test passé, `mecanisme-inline-reflector.txt`). Forcer l'inline de **ce** fichier ne reproduit donc **pas** l'erreur : la forme la plus simple du mécanisme n'est **pas** la cause, ou le déclencheur est un autre fichier, ou une autre forme de la divergence. **La cause reste inconnue.**

Autres hypothèses examinées et écartées par la mesure : une **seconde copie** de `@nestjs/core` dans le magasin pnpm (une seule : `@nestjs+core@11.1.27_@nestj_678d…`, installée le 10/07/2026, inchangée) ; le **code de production** de ce lot (douze fichiers, bissectés par groupe, par paire et en entier : la sonde passe dans tous les cas après la fenêtre d'échec) ; l'**ordre des imports** de la spec.

## 5. Ce que ce lot en fait, et ce qu'il ne fait pas

- **Rien dans `apps/api/vitest.config.int.ts`** : le toucher ne figure pas dans la table d'ouverture ni dans la consigne (R-4), et un défaut croisé **se rapporte**. Une piste de réparation, **non essayée**, est de forcer l'externalisation de `@nestjs/*` (`server.deps.external`), qui court-circuite `isValidNodeImport` ; elle est notée au backlog, **à ordonner par Ko**.
- **Pour les six portes du lot** : aucun lecteur lourd du disque (audit de secrets, campagne) ne tourne **pendant** une porte d'intégration ; l'état de la machine est relevé avec chaque lancement (le pilote de D340 le fait). Si `test:int` rougit de cette façon, le rapport le dit — **ce n'est pas « l'environnement » tant que le relevé ne l'établit pas** (D262) — et la **règle des portes du lot** (`regle-portes.md`, § 2, cas 1 à 3) décide de ce qui s'en suit : la session ne choisit pas (D270 : aucun lot ne part sous une porte rouge).
- **Ce qui reste inconnu** : la cause ; la fréquence (cinq échecs de suite dans une fenêtre d'environ deux minutes et demie, puis aucun sur une dizaine de lancements) ; si l'échec peut frapper une porte `test:int` complète (une seule fenêtre a été vue, et seulement quand un processus lourd lisait l'arbre en parallèle — c'est une **corrélation**, pas une cause).

## 6. Pièces versées avec cette note (dossier `intermittence/`)

`echec-audit-1.txt`, `echec-sonde-1.txt`, `echec-sondes-abc.txt`, `vert-course-1.txt`, `reussite-rejeu-course.txt`, `reussite-rejeu-audit.txt`, `mecanisme-inline-reflector.txt`, `bissection.txt` (le tableau des résultats de la bissection), `bisect.sh` (la procédure, **archivée comme pièce, jamais promue en instrument**).
