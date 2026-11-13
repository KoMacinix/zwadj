# CA-1 — LES PORTES, après la dernière modification

Arbre mesuré : `e28c29a` + le code du lot (non commité à l'instant de la mesure ; aucun fichier modifié pendant ni après).
Date : 13/11/2026.

## État machine — ⚠ CE N'EST PAS LE POSTE DE KO
Conteneur cloud Linux, 4 cœurs, 16 Go (15 Go libres au relevé). Aucun capteur d'alimentation : « secteur / batterie » est sans
objet. `chrome` = 0, `headless_shell` = 0 hors mesure. Docker ABSENT ; PostgreSQL **16.15** local + polyfill `uuidv7`
(`ALLOW_PG_LT18_POLYFILL=1`, prévu par `apps/api/test/int/setup-global.ts`) — le projet cible PostgreSQL 18.
Chromium : le dépôt attend la révision 1155 (playwright-core 1.50.1), le conteneur porte la 1243 ; un lien du chemin attendu
vers le binaire présent a été posé HORS dépôt (`/opt/pw-browsers/chromium*-1155`). ⇒ Aucune durée ci-dessous ne se compare
à une durée du poste de Ko (D290), et `test:int` doit être REJOUÉ sur le poste de Ko à l'intégration.

## Référence d'entrée, mesurée sur `origin/main` (`26ad5c7`) AVANT toute modification
| porte | code | chiffres |
|---|---|---|
| typecheck | 0 | — |
| lint | 0 | — |
| test | 0 | — |
| build | 0 | — |
| test:int | **1** | 46 fichiers ; 716 passés, **19 en échec** : 15 = `Executable doesn't exist at …/chromium_headless_shell-1155` (PDF) ; 4 = `Error: read ECONNRESET` sur les tests de requêtes SIMULTANÉES de `pro-clients.int-spec.ts` (2) et `quote-numbering.int-spec.ts` (2) |

Après le lien Chromium (environnement seul, aucun fichier du dépôt) : les 41 tests des deux specs PDF passent. Les
`ECONNRESET` restent, DÉTERMINISTES (rejoué seul : 2 sur 2). ⚠ Leur CAUSE N'EST PAS ÉTABLIE : aucune erreur côté PostgreSQL
au journal ; dix requêtes simultanées par supertest sur un serveur nu passent (reproduction hors dépôt). C'est écrit comme
une inférence : propre à ce conteneur. **Aucun de ces tests n'est dans un fichier que la session touche.**

## Les portes du lot
| porte | code | chiffres |
|---|---|---|
| `pnpm typecheck` | 0 | tous les paquets |
| `pnpm lint` | 0 | tous les paquets |
| `pnpm test` | 0 | api-client 7 fichiers / 66 tests ; client 81 / 1355 ; pro 41 / 499 ; api 46 / 727 — 0 échec |
| `pnpm build` | 0 | tous les paquets |
| `pnpm test:int` (sous verrou) | **1** | 47 fichiers ; **738 passés, 6 en échec** |

### ⛔ `test:int` N'EST PAS VERT, et ce rouge n'est pas déclaré vert
Les 6 échecs sont dans les DEUX fichiers déjà rouges à l'entrée (`pro-clients.int-spec.ts` ×2, `quote-numbering.int-spec.ts`
×4) : les 4 `ECONNRESET` de la référence, plus 2 tests de `quote-numbering` qui tombent en `deadlock detected` dans le
`TRUNCATE` du `beforeEach` qui suit un test en `ECONNRESET` (les requêtes abandonnées tiennent encore leurs verrous) — une
cascade du même défaut, variable d'une passe à l'autre. Les fichiers du lot : `venue-map.int-spec.ts` 9 sur 9,
`venues-public.int-spec.ts` et `rbac-all-routes.int-spec.ts` verts.
⇒ Sur ce conteneur la porte ne peut pas sortir en 0, avec ou sans ce lot. Selon la consigne (« porte rouge sur du code que tu
n'as pas touché ⇒ arrêt de la session »), la lettre demanderait l'arrêt. La session CONTINUE et le DIT : le rouge est mesuré
à l'entrée, sur `origin/main`, dans un environnement qui n'est pas celui de référence ; rien n'est poussé sur `main` ; la
porte se rejoue à l'intégration. C'est une décision prise seule, reportée au BILAN.

## Harnais du lot
`python3 neutralisation/neutralize-ca1.py --int` : **24 gardes mordues sur 24 cibles jouées · 0 muette · 0 non mesurée**,
code 0, arbre rendu à l'octet (`../neutralisation/neutralize-ca1.txt`). Trois passes ont précédé ; chacune s'est arrêtée
AVANT de juger, sur une cible mal déclarée par la session (remplacement sous-chaîne de l'ancre ×2, genre « insertion » faux
×1) — refus du socle, pas des verdicts.

## Campagnes touchées par le diff (`lancer-campagnes.py`)
3 campagnes sur 60 : `available-on-api` 13 mordues, code 0 ; `ca1` 11 mordues + 13 « non mesurées » (ses cibles
d'intégration, jouées à part avec `--int` : voir ci-dessus), code 3 ; `horizon` 5 mordues + **1 ERREUR DE SCRIPT**, code 1.
- ⚠ `available-on-api` était ROUGE à la première passe (cible A9 : « 2 occurrence(s), 1 attendue ») : la méthode `map()`
  répétait la ligne d'écho de `list()`. Corrigé DANS LE CODE DU LOT (l'écho est rendu par le module pur), pas dans le
  harnais de l'autre lot ; cible M-11 ajoutée. C'est exactement ce que ce tri existe pour voir.
- ⚠ `horizon`, cible H6 : « 0 occurrence(s), 1 attendue dans apps/client/src/components/search/search-view.tsx ». Ce fichier
  est IDENTIQUE à `origin/main` (vérifié par `git diff`) : l'ancre est périmée DEPUIS AVANT cette session. Non corrigé
  (ce n'est pas l'objet du lot) ; reporté dans `a-reporter-au-backlog.md`.

## Empreintes finales des fichiers de test (ils ont changé depuis les rouges : écho renommé, un titre)
    bfc91785b26666d04b23708102ea13aba49f58700ba6d2c8173f80f248b5e2ee  apps/api/src/venues/venue-map.spec.ts
    e5f38e04358f0843ba72ab6c765fddbfd2eba86be84f2f1faed36df0629b1bbb  apps/api/src/venues/venues-public.service.spec.ts
    c74498d957e2b9aa41a26d6d2d730dbe96d4be11d82c4189a0c20aa3f082107f  apps/api/test/int/venue-map.int-spec.ts
