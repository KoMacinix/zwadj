# Zwadj — monorepo

Marketplace de réservation de salles de mariage (Algérie). Bilingue FR/AR + RTL, mobile-first, request-to-book, paiement Chargily.

⚠ **État réel du paiement** (il n'est plus « à venir », il n'est pas non plus complet) : le port `PAYMENT_GATEWAY`, l'adaptateur `chargily.gateway.ts` et la décision pure `payment-intent.ts` sont livrés et mesurés (E3a/E3b) ; **le webhook signé est EN PAUSE** (E3c), donc rien ne bascule un `Payment` en `PAID` ni une réservation en `CONFIRMED`. Tout le chemin est derrière `PAYMENTS_ENABLED`, qui vaut **`false`** en l'absence de valeur — voir `apps/api/src/config/env.ts`.

**Source de vérité technique : `AGENTS.md`.** Ce dépôt n'est plus un squelette : neuf modules Nest (`auth`, `account`, `venues`, `payments`, `media`, `referentials`, `health`, `config`, `prisma`), quinze contrôleurs sur le seul domaine `venues`, 23 migrations écrites à la main, et des moteurs métier purs (`pricing-engine`, `service-pricing`, `availability-engine`, `booking-window`, `deposit`, `payment-intent`). L'état des lots, les décisions arbitrées et les invariants à ne pas casser vivent dans `AGENTS.md` et `ZWADJ_CONTINUITE.md` — **ce fichier ne décrit que la mise en route**, il n'a autorité sur rien d'autre.

## Structure

```
apps/api      NestJS 11 · Prisma 7 (client TS + @prisma/adapter-pg) · pino · Swagger · Zod
apps/client   Next.js 15 App Router · next-intl (/fr /ar, RTL) · SSR
apps/pro      Vite 6 · React 19 · i18next
packages/     types (DTO partagés) · i18n (messages + formatters) · ui · config (eslint/tsconfig)
```

Base : PostgreSQL 18 (fonction native `uuidv7()` utilisée par les DEFAULT — ne pas descendre en dessous).

## Première validation — commandes dans l'ordre

Prérequis : Node 22 (`nvm use`), pnpm 10 (`corepack enable`), Docker.

```bash
# 1. Base de données (PostgreSQL 18)
docker compose up -d

# 2. Variables d'environnement
cp apps/api/.env.example apps/api/.env
cp apps/client/.env.example apps/client/.env
cp apps/pro/.env.example apps/pro/.env

# 3. Dépendances (postinstall autorisés via onlyBuiltDependencies)
pnpm install

# 4. Client Prisma (génère apps/api/src/generated/prisma — gitignoré)
pnpm --filter @zwadj/api prisma:generate

# 5. Migrations — `migrate deploy`, JAMAIS `migrate dev`
pnpm --filter @zwadj/api prisma:migrate
#   ⛔ `prisma migrate dev` est INTERDIT dans ce dépôt. Il ne connaît QUE ce que
#   `schema.prisma` déclare : toute table, colonne ou contrainte présente en
#   base mais absente du schéma — au premier rang celles que le langage Prisma
#   ne sait pas exprimer (`EXCLUDE` anti-double-booking, index PARTIELS,
#   certains `CHECK`, FK composites) — lui apparaît comme un écart à corriger.
#   Et « corriger », pour lui, veut dire SUPPRIMER cet objet de la base réelle :
#   il ne défait pas un changement accidentel, il aligne la base sur un schéma
#   qui ignore l'existence de ces garanties. Une seule exécution a déjà détruit
#   la FK composite B2 en base de dev. Le script `prisma:migrate:dev` existe
#   uniquement pour REFUSER. Toute migration neuve s'écrit à la main —
#   procédure complète : AGENTS.md § « Migrations ».
#
#   Ce que `prisma:migrate` (= `migrate deploy`) fait : applique les migrations
#   committées non encore appliquées, dans l'ordre (…_init →
#   …_quote_drop_valid_until), et crée _prisma_migrations si besoin.
#   Ce qu'il ne fait PAS : il ne régénère pas le client Prisma (c'est l'étape
#   4), et il ne compare jamais la base au schéma — donc aucune invite de
#   « drift » ni de reset ne peut venir de lui. En voir une signifie qu'une
#   AUTRE commande tourne : arrêter et remonter la sortie complète.
#
#   ⚠ `migrate deploy` SORT EN SUCCÈS SANS RIEN APPLIQUER quand le
#   schema-engine est inaccessible (poste hors ligne) : base restée vide ET
#   code de retour zéro. Vérifier qu'une table attendue existe — ne jamais se
#   fier au code de sortie seul.

# 5bis. Seed des référentiels (Lot A1 — 58 wilayas, 23 communes d'Alger,
#       23 équipements). IDEMPOTENT : ré-exécutable à volonté, converge vers
#       les fichiers apps/api/prisma/seed-data/ sans jamais dupliquer.
pnpm db:seed
#   Attendu : « Seed OK — 58 wilayas, 23 villes, 23 équipements (idempotent). »

# 6. Tests unitaires (3 apps, depuis la racine)
pnpm test

# 6bis. Tests d'INTÉGRATION auth (base zwadj_test recréée à chaque run —
#       nécessite le PostgreSQL du docker compose démarré)
pnpm test:int

# 7. Lancement des trois apps
pnpm dev
#   API     http://localhost:3001/api/v1/health   → {"status":"ok","db":"up",...}
#   Référentiels (après 5bis) : /api/v1/wilayas (58, la 16 avec 23 villes)
#                               /api/v1/amenities (23)
#   Swagger http://localhost:3001/api/docs
#   Client  http://localhost:3000/fr   et   http://localhost:3000/ar (dir="rtl")
#   Pro     http://localhost:5173

# 8. Qualité
pnpm typecheck && pnpm lint
```

## Notes d'architecture (rappels)

- **Prisma 7** : la config (URL, chemin migrations) vit dans `apps/api/prisma.config.ts` (+ `dotenv/config` explicite). Le client généré est 100 % TypeScript, sans moteur Rust, et exige un **driver adapter** — câblé dans `PrismaService` via `@prisma/adapter-pg`.
- **Validation** : Zod aux frontières (AGENTS.md). `ZodValidationPipe` maison enregistré globalement (pass-through tant qu'aucun schéma n'est attaché) ; les routes des tranches suivantes fournissent leurs schémas.
- **i18n** : les messages et formatters vivent dans `packages/i18n` ; `apps/client` (next-intl) et `apps/pro` (i18next) ne portent que le runtime.
- **Argent** : centimes entiers partout ; `formatDZD` refuse les floats. **Dates** : UTC en base, locale à l'affichage.
- La contrainte d'exclusion anti-double-réservation (`btree_gist`) et les CHECKs vivent dans la migration `20260707000001_booking_constraints` — comportement validé par un banc de 44 assertions.
