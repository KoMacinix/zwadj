# État d'entrée de la session `front-client` — 05/11/2026

Relevé AVANT le premier lot, sur `e40c14150881716448afc0a94334556370641716` (= `origin/main` après `git fetch`), arbre propre.
Rien dans ce fichier n'est une écriture d'autorité (consigne, 0 c) : c'est l'état mesuré que chaque lot compare au sien.

## L'environnement — un conteneur cloud, PAS le poste de Ko

| quoi | relevé | conséquence |
|---|---|---|
| machine | Linux 6.18, 4 cœurs, 16 Go, sans batterie (machine virtuelle) | R-9 (D340) ne s'applique pas ici : il n'y a pas de batterie ; les durées ne se comparent à AUCUNE durée du poste de Ko (D290) |
| Node, pnpm | v22.23.4, pnpm 10.34.4 | `.nvmrc` = 22 |
| installation | `pnpm install --frozen-lockfile` : 772 paquets, sortie 0 | — |
| Prisma | `DATABASE_URL` factice + `npx prisma generate` : « Generated Prisma Client (7.8.0) », sortie 0 | le contournement `PRISMA_SCHEMA_ENGINE_BINARY` de D192 n'a PAS été nécessaire |
| PostgreSQL | démon Docker démarré dans le conteneur (`dockerd`), puis `docker compose up -d` : **PostgreSQL 18.6** | `test:int` et `test:e2e` SE JOUENT ICI |
| fichiers `.env` | `apps/api/.env`, `apps/client/.env.local`, `apps/pro/.env` copiés des `.env.example` (aucune valeur réelle, D200) ; ignorés par git | hôtes locaux uniquement |
| navigateur | le conteneur fournit Chromium 153 (`chromium-1243`) ; la suite e2e ET le moteur PDF de l'API (`playwright-core` 1.50.1) attendent `chromium-1155` | un dossier HORS DÉPÔT (scratchpad) fait correspondre les noms attendus aux binaires présents (liens symboliques), passé par `PLAYWRIGHT_BROWSERS_PATH` ; **aucun fichier du dépôt n'est touché**. ⚠ Le moteur n'est donc pas celui du poste de Ko : une e2e verte ici n'est pas la mesure de l'intégration |

## Les portes à l'entrée (code de sortie lu par porte, jamais celui d'une enveloppe)

| porte | sortie | chiffres | durée (ici) |
|---|---|---|---|
| `pnpm typecheck` | **0** | — | 30 s |
| `pnpm lint` | **0** | — | 12 s |
| `pnpm test` | **0** | api-client 59 / 6 · api 1 096 / 71 · client 386 / 30 · pro 653 / 41 — **2 194 tests, 148 fichiers** (mêmes totaux que la passe sur secteur de D340) | 93 s |
| `pnpm build` | **0** | — | 50 s |
| `pnpm test:int` (sans pont navigateur) | **1** | 598 / 619 — 21 rouges : **15** du moteur PDF (« le VRAI moteur… », réponse 503 : Chromium introuvable) et **6** de concurrence (`read ECONNRESET`, puis `deadlock detected` en cascade dans `truncateAll`) | 365 s |
| `pnpm test:int` (avec le pont navigateur) | **1** | **616 / 619** — les 15 du PDF passent ; **3 rouges** : `pro-clients.int-spec.ts` MD-1 ×2 (dix créations simultanées) et `quote-numbering.int-spec.ts` F-1 (vingt créations simultanées), tous `read ECONNRESET` | 410 s |
| `pnpm test:int` — deux fichiers seuls, avec le pont | **1** | `pro-clients` + `quote-numbering` : **8** rouges (MD-1 ×2, F-1, F-2 en `ECONNRESET` ; F-3, F-4, F-6 ×2 en `deadlock detected` dans `truncateAll`, à la suite) | — |

### Ce que la session en conclut — DÉCISION PRISE SEULE, dite pour Ko

Les rouges de `test:int` à l'entrée sont **d'ENVIRONNEMENT, pas de code** : même SHA que la passe sur secteur de D340, où
`test:int` rendait **619 / 619** sur le poste de Ko ; les 15 rouges du PDF disparaissent avec le navigateur ; les rouges de
concurrence **varient d'une passe à l'autre** (3, puis 8) et sont tous `ECONNRESET` sur des requêtes **simultanées** — la classe
D265. ⚠ *Hypothèse de cause, NON mesurée (lecture de code seulement)* : `request(app.getHttpServer())` de supertest 7.2.2 appelle
`listen(0)` sur un serveur qui n'écoute pas ; la PREMIÈRE requête terminée referme ce serveur, et Node ≥ 19 ferme alors les
connexions inactives — celles des requêtes simultanées pas encore lues. Course qui dépend du rythme de la machine.

⇒ **La session continue** (la règle d'arrêt vise « une porte rouge sur du code que tu n'as pas touché » ; ici le code est vert
ailleurs et le rouge suit la machine). **Aucun lot ne touche `apps/api`.** Pour chaque lot, `test:int` se rejoue ici avec le
pont et se juge **contre cet ensemble d'entrée** : un rouge hors de ces tests de concurrence (MD-1, F-1 à F-6) arrête la
session ; un rouge DANS cet ensemble est dit « rouge d'entrée, environnement ». **`test:int` n'est jamais déclaré « vert » ici
— il est à jouer à l'intégration**, sur le poste de Ko.

## L'e2e à l'entrée

Voir `docs/preuves/front-client/etat-entree-e2e.md` (relevé après la passe, même pont navigateur).
