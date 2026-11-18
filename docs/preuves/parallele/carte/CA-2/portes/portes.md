# CA-2 — LES PORTES, après la dernière modification

Arbre mesuré : `4618122` + le code du lot (non commité à l'instant de la mesure ; aucun fichier du dépôt modifié pendant).
Date : 13/11/2026. État machine : celui de `../../CA-1/portes/portes.md` (conteneur cloud, PostgreSQL 16 + polyfill, pas le
poste de Ko). ⚠ Le conteneur a été SUSPENDU puis repris entre CA-1 et CA-2 : PostgreSQL ne tournait plus à la reprise
(« Connection refused », vu par la campagne `b7`) ; redémarré avant la porte `test:int`.

| porte | code | chiffres (paquet : fichiers / tests, RELEVÉS sur `test.txt` avec le nom du paquet de chaque ligne `RUN`) |
|---|---|---|
| `pnpm typecheck` | 0 | tous les paquets |
| `pnpm lint` | 0 | tous les paquets |
| `pnpm test` | 0 | api-client 7 / 66 ; api 81 / 1355 ; **client 45 / 546** (entrée : 41 / 499 ; + 4 fichiers, + 47 tests) ; pro 46 / 727 — 0 échec |
| `pnpm build` | 0 | tous les paquets |
| `pnpm test:int` (sous verrou) | **1** | 47 fichiers ; 737 passés, **7 en échec** |

### ⛔ `test:int` N'EST PAS VERT
Les 7 échecs sont dans les DEUX fichiers rouges à l'entrée de la session, sur `origin/main` (`pro-clients.int-spec.ts` ×2,
`quote-numbering.int-spec.ts` ×5) : `ECONNRESET` sur les requêtes simultanées, et leurs cascades (`deadlock detected` au
`TRUNCATE` suivant) dont le nombre varie d'une passe à l'autre (4 à l'entrée, 6 à CA-1, 7 ici). Ce lot ne touche NI l'API
NI ses tests. Même lecture et même réserve qu'à CA-1 : à rejouer sur le poste de Ko à l'intégration.

## Harnais du lot
`python3 neutralisation/neutralize-ca2.py` : **42 gardes mordues sur 42 · 0 muette · 0 non mesurée**, code 0, arbre rendu à
l'octet (`../neutralisation/neutralize-ca2.txt`) ; rejoué à l'identique par le tri des campagnes (42 sur 42).
Deux passes ont précédé, arrêtées par le socle AVANT de juger (une cible mal typée, « insertion » pour une substitution).

## Campagnes touchées par le diff (`lancer-campagnes.py`) : 13 sur 61, 2 485 s — code 1
251 mordues · 4 erreurs · 7 non mesurées. Les 7 « non mesurées » sont des cibles e2e (`fc1`, `fc2`, `fc8`, `r48` : sans
`--e2e`, sortie 3 par construction). Les 4 erreurs, UNE PAR UNE — aucune n'est une garde rendue muette par ce lot :
| campagne | ce qui est sorti | lecture |
|---|---|---|
| `available-on`, cible 6 | « ERREUR DE SCRIPT : 0 occurrence(s) » dans `search-query.ts` | l'ancre porte un `\r\n` EN DUR : elle suppose un fichier en CRLF (poste de Ko, `core.autocrlf`). Ce conteneur a les fichiers en LF. Le texte visé est présent et inchangé par ce lot (`toApiQuery` n'est pas modifiée). Artefact d'ENVIRONNEMENT ; les cibles qui suivent la 6 n'ont pas été jouées ici. |
| `b7` (e2e) | `connect ECONNREFUSED 127.0.0.1:5432` | PostgreSQL arrêté par la suspension du conteneur. Mesure NON DÉMARRÉE, pas un verdict. À rejouer avec la suite e2e (lot CA-6). |
| `horizon`, cible H6 | « ERREUR DE SCRIPT : 0 occurrence(s) » dans `search-view.tsx` | DÉJÀ rouge à CA-1, quand ce fichier était identique à `origin/main` : ancre périmée avant la session (`a-reporter-au-backlog.md`). |
| `r33`, cible M-12 | MUETTE : « la date d'un événement dérive du fuseau du serveur » — 61 passés, 0 échec | une garde de FUSEAU est muette sur une machine en UTC (AGENTS.md, leçon S11-a) : ce conteneur est en UTC. Le lot ne touche aucun fichier de `r33` hors les catalogues (bloc `map` ajouté en fin). |
⇒ `r48` (qui mute `search-view.tsx`, modifié par ce lot) : 10 mordues sur 10 jouées — ses ancres tiennent.
⇒ Ce tri n'est PAS « vert » ici et n'est pas déclaré tel ; trois des quatre erreurs tiennent au conteneur, la quatrième
préexiste. À rejouer sur le poste de Ko.

## Empreintes finales des fichiers de test (plusieurs ont changé depuis les rouges)
Changés après les rouges, et pourquoi : `venue-points-map.test.tsx`, `venue-map-loader.test.tsx`, `search-view.test.tsx` —
assertions réécrites en assertions NATIVES pour qu'une neutralisation échoue par `AssertionError` (D316) ; deux espaces
insécables écrits tels quels remplacés par leur code (refusés par le lint) ; `search-query.test.ts` — un attendu écrit de
mémoire (« wifi,parking ») était faux : `parseSearchParams` trie les équipements ; l'attendu ne dépend plus de l'ordre.
    f238a1ef1870817d4a77de483a5cf444c7bea499f26fd2f8fab38a7296d4c904  apps/client/src/components/map/map-test-support.tsx
    ecd3cb1ed435edc838049996c5f525e7b6cba44a0827176086ec8cc44e933558  apps/client/src/components/map/venue-points-map.test.tsx
    046155996a387caa7b74d91029140af17aeef83748d992065f80aba187917213  apps/client/src/components/map/venue-map-loader.test.tsx
    83c420a4efa42f2a4a5008810110aa6eaadb9636c9aca05b4213407b0a3d8365  apps/client/src/components/ui-map-tiles.test.ts
    7c899cd4529fe5e73aa141ecd27acf94494635ebf1d8cc628d6a1a40f0e91a36  apps/client/src/lib/leaflet-import-guard.test.ts
    f7a353362d39e5b41a95d3ce39398e3800d98cbd6c90552d179454282a8d0e93  apps/client/src/lib/api.test.ts
    a988e6ff237b9d35a68262c38f70049b49fed9c781d9c015e293111f1bf8804f  apps/client/src/lib/search-query.test.ts
    17620b790c93a6d23de7f78c87d9439cfb800dd4e4f20ed7c0b898e19192661b  apps/client/src/components/search/search-view.test.tsx
