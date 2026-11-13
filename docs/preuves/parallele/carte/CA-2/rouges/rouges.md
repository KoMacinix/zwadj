# CA-2 — LES ROUGES, lus contre l'état d'avant (aucune ligne de code du lot n'existe ; `leaflet` n'est pas installé)

Joués le 13/11/2026 sur `e76562d` + les fichiers de test ci-dessous, non commités à cet instant. vitest 3.2.7, jsdom.
Sortie : `client-vitest.txt` (une commande, les huit fichiers).

    4095: Test Files  7 failed (7)
    4096:      Tests  24 failed | 105 passed (129)

| fichier | lecture |
|---|---|
| `components/map/venue-points-map.test.tsx`, `components/map/venue-map-loader.test.tsx` | ⚠ PAS des assertions : chute À LA COLLECTE (les composants n'existent pas). Aucun test n'a tourné. |
| `components/ui-map-tiles.test.ts` | 12 tests en échec, tous `TypeError` (`resolveMapTiles is not a function`…) : `@zwadj/ui` n'exporte rien de la carte. ⚠ Des plantages, pas des assertions — l'état d'avant ne permet pas mieux. |
| `lib/api.test.ts` | 5 en échec (`getVenueMap is not a function`) ; les tests EXISTANTS du fichier restent verts. |
| `lib/search-query.test.ts` | 2 en échec : `AssertionError` (`expected undefined to be '…'`) — `toMapQuery` n'existe pas (lue par son nom sur le module, donc sans plantage). |
| `lib/leaflet-import-guard.test.ts` | 2 en échec, `AssertionError` : `expected [] to deeply equal [ 'packages/ui/src/map/leaflet-canvas.tsx' ]` — aucun fichier n'importe la bibliothèque, et la garde EXIGE qu'un seul le fasse. Les deux calibrations sont vertes. |
| `components/search/search-view.test.tsx` | 3 en échec : la vue « carte » rend encore le cartouche, donc aucun chargeur (`Unable to find … chargeur-de-carte`, erreurs de Testing Library) ; le refus de date ne passe pas avant la carte. TROIS tests de la bascule sont VERTS avant comme après, et c'est attendu : « aucune carte avant le geste », « revenir à Grille », `aria-pressed` — des gardes que le harnais neutralisera. |

⚠ Deux des trois échecs de `search-view.test.tsx` sont des erreurs de requête Testing Library, pas des `AssertionError` : à
l'état d'APRÈS ces tests n'en dépendent plus (ils lisent un nœud présent par assertions natives), et c'est à l'état d'après
que le harnais les juge.

## Empreintes sha256 des fichiers de test joués
    f238a1ef1870817d4a77de483a5cf444c7bea499f26fd2f8fab38a7296d4c904  apps/client/src/components/map/map-test-support.tsx
    37c55dc45ec2ca3e2577ee040e7335d75f3a95b9ef5d387ffb67f8a13e802b68  apps/client/src/components/map/venue-points-map.test.tsx
    032b5f9c24e49df47334bfc21207129775927bb6a95f3bcea911167f6d181eb9  apps/client/src/components/map/venue-map-loader.test.tsx
    83c420a4efa42f2a4a5008810110aa6eaadb9636c9aca05b4213407b0a3d8365  apps/client/src/components/ui-map-tiles.test.ts
    7c899cd4529fe5e73aa141ecd27acf94494635ebf1d8cc628d6a1a40f0e91a36  apps/client/src/lib/leaflet-import-guard.test.ts
    f7a353362d39e5b41a95d3ce39398e3800d98cbd6c90552d179454282a8d0e93  apps/client/src/lib/api.test.ts
    cd4f9cfea99e9182d615ee470d4a3c55e941dd03df76c71c8d789bffd74b4019  apps/client/src/lib/search-query.test.ts
    e4d581d779bb35a273b2bc79642457cdd55cdec9fa8ddb7a22848274b5f5e771  apps/client/src/components/search/search-view.test.tsx
