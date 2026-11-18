# CA-3 — LES PORTES, après la dernière modification

Arbre mesuré : `45dbdc0` + le code du lot (non commité à l'instant de la mesure ; aucun fichier du dépôt modifié pendant).
Date : 13/11/2026. État machine : conteneur cloud (voir `../../CA-1/portes/portes.md`) — pas le poste de Ko.
⚠ Le conteneur a été REDÉMARRÉ avant ce lot : PostgreSQL relancé, client Prisma régénéré, liens Chromium toujours en place.
⚠ Ajout d'ENVIRONNEMENT avant ce lot, hors dépôt : la fonction `uuidv7()` de substitution posée dans `template1`, pour que la
base de l'e2e (créée par `prisma migrate deploy`, sans le levier `ALLOW_PG_LT18_POLYFILL` de `test:int`) puisse se migrer
sur PostgreSQL 16.

| porte | code | chiffres (paquet : fichiers / tests, relevés sur `test.txt`) |
|---|---|---|
| `pnpm typecheck` | 0 | tous les paquets |
| `pnpm lint` | 0 | tous les paquets |
| `pnpm test` | 0 | api-client 7 / 66 ; api 81 / 1355 ; **client 46 / 553** (CA-2 : 45 / 546 ; + 1 fichier, + 7 tests) ; pro 46 / 727 — 0 échec |
| `pnpm build` | 0 | tous les paquets |
| `pnpm test:int` (sous verrou) | **1** | voir ci-dessous |

### ⛔ `test:int` N'EST PAS VERT — le rouge de référence du conteneur
    637: Test Files  2 failed | 45 passed (47)
    638:      Tests  9 failed | 735 passed (744)
9 échecs cette fois (4 à l'entrée, 6 à CA-1, 7 à CA-2) : le nombre de CASCADES varie d'une passe à l'autre — les tests
qui suivent un `ECONNRESET` tombent en `deadlock detected` au `TRUNCATE` de leur `beforeEach` (ici trois tests « F-6 »).
Tous les échecs sont dans `pro-clients.int-spec.ts` et `quote-numbering.int-spec.ts` (requêtes simultanées : `ECONNRESET`
et leurs cascades), rouges sur `origin/main` à l'entrée de la session. Ce lot ne touche ni l'API ni ses tests.
À rejouer sur le poste de Ko à l'intégration.

## Harnais du lot
`python3 neutralisation/neutralize-ca3.py` : **12 gardes mordues sur 12 · 0 muette · 0 non mesurée**, code 0, arbre rendu à
l'octet. Deux passes ont précédé : la première rendait 11 sur 12 — la cible N-3 faisait échouer son test par une erreur de
requête Testing Library, pas par une assertion (« PAS-ASSERTION ») ; le test a reçu une assertion native AVANT la requête
(D316), puis les deux cibles N-3 et N-4, déclarées avec un genre faux, ont été réécrites.

## Campagnes touchées par le diff : 9 sur 62, 2 009 s — code 1
202 mordues · 1 muette · 5 non mesurées (cibles e2e de `fc1`, `fc2`, `fc8` sans `--e2e`).
- `b7` (e2e) : **3 mordues sur 3**. ⇒ Elle n'avait pas démarré à CA-2 (PostgreSQL arrêté) : elle est mesurée ici, sur un arbre
  qui contient CA-2 et CA-3. La suite e2e DÉMARRE donc dans ce conteneur (premier relevé ; la suite entière : lot CA-6).
- `fc8` et `maxprice`, qui mutent `home-view.tsx` (modifié par ce lot) : 10 sur 10 jouées et 6 sur 6 — leurs ancres tiennent.
- `r33`, cible M-12 : MUETTE, comme à CA-2 — garde de fuseau sur une machine en UTC (`a-reporter-au-backlog.md`). Seule
  « erreur » de ce tri ; elle ne tient pas à ce lot.

## Empreintes finales des fichiers de test (changés depuis les rouges : un attendu sans préfixe de langue, une assertion native)
    c3a6cd90f7b53d5d559b71bb60b8bff13f72ddbc84d24ddf6c403e19356af0b1  apps/client/src/components/map/near-viewport-map.test.tsx
    90b58b94c7643959229415ffd7935728d5830fb6e016ba28bc9152cc50da1e14  apps/client/src/app/[locale]/page.test.tsx
