# Zwadj — monorepo

Marketplace de réservation de salles de mariage (Algérie). Bilingue FR/AR + RTL, mobile-first, request-to-book, paiement Chargily (tranche ultérieure).

**Source de vérité technique : `AGENTS.md`.** Ce squelette n'embarque aucune logique métier — c'est la fondation validée sur laquelle les tranches (auth, réservation, paiement) s'ajoutent.

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

# 5. Migrations — première exécution réelle de migrate dev
pnpm --filter @zwadj/api prisma:migrate
#   Attendu : applique 20260707000000_init puis 20260707000001_booking_constraints,
#   crée la table _prisma_migrations, et déclare la base "in sync" SANS proposer
#   de migration supplémentaire ni de reset.
#   ⚠ Si un drift est signalé ou un reset proposé : répondre NON et remonter la
#   sortie complète — ne pas laisser Prisma régénérer quoi que ce soit.

# 6. Tests (4 tests, 3 apps, depuis la racine)
pnpm test

# 7. Lancement des trois apps
pnpm dev
#   API     http://localhost:3001/api/v1/health   → {"status":"ok","db":"up",...}
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
