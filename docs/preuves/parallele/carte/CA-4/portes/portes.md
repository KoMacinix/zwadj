# CA-4 — LES PORTES, après la dernière modification

Arbre mesuré : le commit des rouges de CA-4 + le code du lot (non commité à l'instant de la mesure ; rien de modifié pendant).
Date : 13 et 14/11/2026. État machine : conteneur cloud (voir `../../CA-1/portes/portes.md`) — pas le poste de Ko.

| porte | code | chiffres (paquet : fichiers / tests, relevés sur `test.txt`) |
|---|---|---|
| `pnpm typecheck` | 0 | tous les paquets |
| `pnpm lint` | 0 | tous les paquets |
| `pnpm test` | 0 | api-client 7 / 66 ; api 81 / 1355 ; **client 47 / 561** (CA-3 : 46 / 553 ; + 1 fichier, + 8 tests) ; pro 46 / 727 — 0 échec |
| `pnpm build` | 0 | tous les paquets |
| `pnpm test:int` (sous verrou) | **1** | 47 fichiers ; 733 passés, **11 en échec** |

### ⛔ `test:int` N'EST PAS VERT — le rouge de référence du conteneur
Les 11 échecs sont dans `pro-clients.int-spec.ts` (2) et `quote-numbering.int-spec.ts` (9) : `ECONNRESET` sur les requêtes
simultanées et leurs cascades de verrous, en nombre variable (4 à l'entrée de la session, puis 6, 7, 9, 11). Ce lot ne
touche ni l'API ni ses tests. À rejouer sur le poste de Ko à l'intégration.

## Harnais du lot
`python3 neutralisation/neutralize-ca4.py` : **12 gardes mordues sur 12 · 0 muette · 0 non mesurée**, code 0, à la première
passe ; rejoué à l'identique par le tri.

## Campagnes touchées par le diff : 4 sur 63, 199 s — code 3 (campagne incomplète, pas une erreur)
19 mordues · 0 muette · 0 erreur · 3 non mesurées (cibles e2e de `fc1` et `fc2`, sans `--e2e`). `b7` (e2e) : 3 sur 3.

## Empreintes des fichiers de test (inchangés depuis les rouges)
    3ecebc783b8c64beef5b56b4d00c27b4b11ae294a2e40613d9eea75531556d35  apps/client/src/components/venue/venue-location-map.test.tsx
    6f6615d28e8b477b2a389c2271e8a94710410f3cd2b0508d05b436ca83ca5326  apps/client/src/components/venue/venue-detail-view.test.tsx
