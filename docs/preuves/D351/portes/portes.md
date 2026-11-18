# D351 — les six portes, après la fusion (18/11/2026)

**Passe du pilote** `docs/preuves/D340/portes/passe-secteur.sh` (non modifié), **UNE seule, sans aucun rejeu**, sur `HEAD` = `80cb89faf86694f8ebdbad27253be140696fe131` (le commit de l'attendu de l'e2e ; le dernier changement de code est `4a0367b`, le repère de parité), arbre propre au départ et à l'arrivée, **sur secteur** (37 relevés d'état machine, **0 sur batterie** ; `chrome` à 0 à chaque relevé ; `headless_shell` à 0 à l'ouverture et à la clôture, et de 1 à 11 sur 13 relevés pendant l'e2e — le navigateur de Playwright ; RAM libre de 4 836 à 5 467 Mo aux relevés de frontière de porte, **minimum 2 075 Mo sur les 37 relevés**, pendant l'e2e ; la seconde passe : 13 relevés, minimum 2 071 Mo, `headless_shell` jusqu'à 11), Docker 29.8.0 et `zwadj-db` « Up 39 hours », ports 3100, 3101, 5273 et 5274 libres, 03:19:08 → 03:37:59. Préparation : `pnpm install --frozen-lockfile` (« Lockfile is up to date », `pnpm-lock.yaml` inchangé, arbre propre ; ⚠ Leaflet 1.9.4 était DÉJÀ dans `node_modules` avant ce lot — non installé par cette session) ; `pnpm --filter @zwadj/api run prisma:generate` (client 7.8.0, code 0).
Les chiffres ci-dessous sont **lus dans les sorties brutes** (D275), jamais dans un compte rendu d'outil ; pièces : `typecheck.txt`, `lint.txt`, `test.txt`, `build.txt`, `test-int.txt` (codes ANSI et CR retirés), `test-e2e.txt` et `test-e2e-passe-2.txt` (MASQUÉES : `rapport-masquage.txt`), `_index.txt`, `_index-passe-2.txt`, `etat-machine-pendant.txt`, `etat-machine-passe-2.txt`.

| porte | code | durée | ce que la sortie brute dit |
|---|---|---|---|
| `typecheck` | **0** | 22 s | — |
| `lint` | **0** | 15 s | — |
| `test` | **0** | 132 s | **api-client 9 fichiers / 77 tests · api 85 / 1 469 · client 47 / 564 · pro 58 / 851 = 199 fichiers / 2 961 tests**, 0 échec. Contre D350 : api +1 fichier / +19 tests (84 / 1 450), client +6 / +65 (41 / 499), pro +2 / +13 (56 / 838), api-client inchangé : les fichiers de test NEUFS de la liste A sont 1 sous `apps/api` (`venue-map.spec.ts`), 6 sous `apps/client` et 2 sous `apps/pro` — le nombre de fichiers ferme |
| `build` | **0** | 37 s | — |
| `test:int` | **0** | 500 s | **51 fichiers / 807 tests**, 0 échec, **vert à la première passe**. Contre D350 : +1 fichier / +9 tests (50 / 798) = `venue-map.int-spec.ts` (9 tests). **Les deux fichiers que la session cloud avait vus rouges — `pro-clients.int-spec.ts` (32 tests) et `quote-numbering.int-spec.ts` (20 tests) — passent** : la réserve du BILAN (§ 2), « `test:int` y est rouge dès l'entrée », **est levée sur le poste de Ko** (R-2) |
| `test:e2e` (passe 1, dans le pilote) | **0** | 412 s | **109 passés · 1 ignoré · 0 échec** (6,8 min) = l'attendu écrit AVANT (`attendu-e2e.txt` : 110 listés = 109 + 1) ; les **7 tests de `ca6-carte.e2e.ts` sont `ok`** ; 0 occurrence de `ECONNRESET`, de `fetch failed` ni de « a échoué après » |
| `test:e2e` (passe 2, `pnpm test:e2e` seul, juste après) | **0** | 383 s | **109 passés · 1 ignoré · 0 échec** (6,3 min), mêmes 7 tests de `ca6-carte` `ok`, 0 occurrence de `ECONNRESET` / « a échoué après » ; 03:38:40 → 03:45:05, sur secteur (13 relevés, 0 sur batterie), `chrome`, `headless_shell` et `node` à 0 avant et après, arbre propre avant et après |

**Deux passes e2e complètes, vertes, consécutives, sur secteur, à l'attendu dérivé : la porte e2e est verte au sens de R-15 de D343.** Aucun rouge, donc aucun rejeu (`regle-portes.md` § 3 et § 4.3 : jamais joué) ; aucune troisième passe.

## Ce que les portes ne regardent PAS (écrit pour ne pas se lire comme tenu)
- **Un regard humain sur la carte AVEC SON VRAI FOND** : l'e2e intercepte les tuiles (la spec ne parle jamais à un fournisseur) ; la lisibilité du fond et la justesse de la position des points sont un geste de Ko (`scenarios-ko.md`).
- **Un build de PRODUCTION dans un navigateur** : l'e2e tourne contre les serveurs de DÉVELOPPEMENT ; `pnpm build` compile, mais personne n'a joué la carte sur un build de production.
- **Le glissement du point du pro** : seul le clic est joué (BILAN de la branche, § 3).
- **Le `no-store` de `getVenueMap`** : aucun test n'affirme cette option (`r4/preuve-filtre-public.md`).
- **L'arabe** du bloc `map` : la parité des clés est mesurée, la justesse de la traduction ne l'est pas.

## Écritures sur la machine de Ko (règle de D337)
**Aucune sur la base de développement.** Sur le serveur PostgreSQL du conteneur `zwadj-db` : `DROP DATABASE` puis `CREATE DATABASE` de `zwadj_test` (par `setup-global`, à chaque lancement d'intégration) et de `zwadj_e2e` (par le harnais de l'e2e, à chaque lancement : deux fois), toutes deux jetables. Aucun fichier `.env` n'a été lu ni modifié par la session ; `prisma generate` en lit un seul, comme à chaque lot, pour son `DATABASE_URL`, et ne se connecte à rien.
