# ZWADJ — Atomic Development Backlog (A → Z)

> Exhaustive, ordered, atomic task list. Format: `Phase → Epic → - [ ] task [LABELS] (dep: …)`.
> Labels: `[CLIENT] [PRO] [BACK] [DB] [SHARED] [ADMIN] [INFRA]` · Priority: `[P0]=MVP [P1] [P2] [P3]`.

## Assumptions (updated after design/stack/task audit — supersedes earlier defaults)

- **Repo:** monorepo with pnpm workspaces (`apps/client`, `apps/pro`, `apps/api`, `packages/ui`, `packages/i18n`, `packages/types`, `packages/config`). **No `apps/admin`** — validation/publishing handled via protected endpoints + direct DB access (DBeaver) at MVP scale.
- **Frontend (client, public):** **Next.js (App Router, SSR/SSG)** — corrected from Vite CSR for SEO (Google ≈97% share in Algeria). `next-intl` for i18n.
- **Frontend (pro):** React + Vite (SPA, behind auth, no SEO need). i18next for i18n.
- **Backend:** Node.js + NestJS + TypeScript; REST + OpenAPI; validation via Zod/class-validator.
- **DB:** PostgreSQL + Prisma ORM. **No Redis at MVP** — deferred jobs (reminders, hold-expiry, rate limiting) via `pg-boss` on Postgres; migrate to Redis/BullMQ later behind the same interface when volume justifies it.
- **Maps:** deferred from MVP — a static blurred map image + "coming soon" placeholder (FR/AR) on home + search pages. Real Leaflet/tile-provider integration is a v1.1 decision.
- **Storage/CDN:** S3-compatible object storage + CDN for media.
- **Infra:** Docker; CI/CD via GitHub Actions; hosting on a VPS/managed container platform; Sentry for errors; Prometheus/Grafana or hosted APM.
- **Payments:** **Chargily only at MVP** (aggregates CIB/SATIM + Edahabia in one integration). BaridiMob deferred — it requires a separate merchant onboarding (Algérie Poste) and is not part of Chargily's aggregation; evaluate as its own integration post-MVP.
- **Email/SMS:** transactional email provider (SPF/DKIM/DMARC configured from day one — see Phase 8). SMS deferred from MVP.
- **Booking model:** venues operate in `single_slot` or `multi_slot` mode with configurable `SlotTemplate`s (name + start/end time) — not a fixed enum. Flow is **request-to-book**, never instant-book. Overlap between `pending` requests is allowed (venue decides manually); overlap between `accepted`/`confirmed` bookings is forbidden and enforced at the DB level (`EXCLUDE USING gist`, btree_gist).
- **Design palette (updated post-Auth, D26 — see AGENTS.md for the authoritative version):** per-app accent, not a single shared color anymore. Client = `#DA3642` (warm coral, AA-verified on pure white only — never as text color on `--bg-2`/`--bg-3`). Pro = `#211C1B` (near-black, passes AA broadly). Zinc remains the shared neutral base in both apps. Any reference to the old single raspberry `#C81E63` or the intermediate `#E8495F` (never shipped) in this document is obsolete — ignore them, as with earlier "gold/cream/Cormorant Garamond" mentions.
- **360° visit (D45, remplace l'hypothèse initiale ci-dessous — Lot A6a) :** visite virtuelle **Matterport**, scan interne (compte UNIQUE Zwadj, 5 premières salles — coût devenu un abonnement unique plutôt qu'un coût par salle, ce qui invalide la note « ~$20/mois/salle » ayant motivé le report initial). Le pro saisit un ID ou une URL de partage Matterport dans le Pro ; `Venue.matterportModelId` (nullable, `@unique`) porte l'identifiant canonique côté Zwadj. Aucun éditeur de tour maison, aucune dépendance à Pannellum/Photo Sphere Viewer. *(Hypothèse initiale, périmée : one 360° photo per venue, pan/zoom, no linked navigation, free lightweight viewer library, no Matterport — un tour multi-photos liées avait ensuite été livré au Lot A4 sous D34, lui-même remplacé par ce qui précède.)*
- **Venue services (prestations):** each venue defines its own services with a `pricingType` — `fixed`, `per_guest`, `tiered`, or `per_unit`. No free-form pricing formulas at MVP; these 4 types cover the real cases (e.g. in-house catering priced per guest, decoration priced by tier).
- **Commission:** variable **1–5% per venue**, set and adjusted by Zwadj admin only (not the pro, not automatic) via a protected endpoint. Snapshotted onto each `Commission` record at booking time so later rate changes don't retroactively affect past bookings.
- **Visits:** a fully separate booking system from party reservations — its own `VisitAvailability`/`VisitBooking` models, no DB exclusion constraint, **auto-confirmed on creation** (no venue approval step). The venue is notified and can cancel/contact the client directly for conflicts.
- **Anti-leakage incentive:** paying the deposit online gets an automatic **−1000 DA discount**. Paying cash on-site and submitting a receipt gets a **1000 DA cashback after Zwadj verifies with the venue** — but a cashback claim is only ever accepted if a real `Booking` (status pending+) already exists for that client/venue; never awarded without a prior Zwadj-tracked request. Either way, the 1000 DA comes out of the venue's owed commission, never Zwadj's own funds — mathematically safe as long as `commissionRate × venue price ≥ 1000 DA`, which holds at the stated 1% minimum rate and 100,000 DA minimum venue price (break-even in the absolute worst case, never a loss).
- **Client navigation:** full nav kept visually (Accueil, Salles, Prestataires, Inspirations, Mes outils, Communauté) to match the design, but only **Accueil** and **Salles** are functional at MVP — the other four are rendered as **non-interactive `<span>`s marked "Bientôt"**, outside the tab order — ⚠ **deliberate deviation (lot UI-N1)**: wiring them without pages would produce 4 × 404, which is *worse* than an absence (the visitor assumes a breakage, not a work in progress). No placeholder page was built. "Connexion/Inscription" becomes "Mon compte" once authenticated.
- **Offline-first** applies primarily to the **Pro** app; Client app gets a lighter PWA cache.

---

## PHASE 0 — Pre-project

### 0.1 Decisions & accounts
- [ ] Write a one-page architecture decision record (ADR) confirming the stack [SHARED][P0]
- [ ] Confirm monolith-modular API + separate frontends decision in an ADR [SHARED][P0]
- [ ] Create the version-control account/org and a private repo [INFRA][P0]
- [ ] Create the hosting/cloud account [INFRA][P0]
- [ ] Create the object-storage/CDN account [INFRA][P0]
- [ ] Create the transactional email provider account [INFRA][P0]
- [ ] Create the SMS gateway account (Algeria-capable) [INFRA][P1]
- [ ] Create the error-tracking (Sentry) account [INFRA][P1]
- [ ] Create a Chargily Pay merchant/sandbox account [INFRA][P0]
- [ ] Request CIB/SATIM e-payment onboarding info [INFRA][P1]
- [ ] Request Edahabia / BaridiMob acceptance requirements [INFRA][P1]
- [ ] Register a staging domain and a production domain [INFRA][P1]
- [ ] Define environment naming (dev/staging/prod) in an ADR [INFRA][P0]
- [ ] Define branching strategy (trunk-based or GitFlow) in CONTRIBUTING.md [SHARED][P0]
- [ ] Define commit-message convention (Conventional Commits) [SHARED][P0]
- [ ] Define semantic-versioning policy for packages [SHARED][P2]

---

## PHASE 1 — Repo initialization & tooling

### 1.1 Repo & workspace
- [ ] `git init` and push initial empty commit [INFRA][P0]
- [ ] Add root `.gitignore` (node, env, build, OS files) [INFRA][P0]
- [ ] Add `.gitattributes` (line endings, lockfile diff) [INFRA][P2] — ⚠ **(14/09/2026, D292)** le fichier existe et ne vise que `docs/preuves/` ; une règle de fins de ligne ou de lockfile viserait **autre chose**, donc **le lot qui l'ajoute COMPTE** (clause bornée, `AGENTS.md`, bloc D283)
- [ ] Initialize pnpm workspace (`pnpm-workspace.yaml`) [INFRA][P0]
- [ ] Create root `package.json` with workspace scripts [INFRA][P0]
- [ ] Create folders `apps/` and `packages/` [INFRA][P0]
- [ ] Add `.nvmrc` / `engines` to pin Node version [INFRA][P0]
- [ ] Add root `README.md` (project overview, run instructions) [SHARED][P0]
- [ ] Add `LICENSE` file [SHARED][P2]
- [ ] Add `CONTRIBUTING.md` (branching, commits, PR rules) [SHARED][P1]

### 1.2 Code quality tooling
- [ ] Install and configure TypeScript at root (`tsconfig.base.json`) [SHARED][P0]
- [ ] Install ESLint + shared config in `packages/config` [SHARED][P0]
- [ ] Install Prettier + shared config [SHARED][P0]
- [ ] Add `.editorconfig` [SHARED][P1]
- [ ] Install Husky and init git hooks [INFRA][P1]
- [ ] Add lint-staged pre-commit hook [INFRA][P1]
- [ ] Add commit-msg hook validating Conventional Commits [INFRA][P2]
- [ ] Add root scripts: `lint`, `format`, `typecheck`, `test`, `build` [SHARED][P0]
- [ ] Ajouter le greffon `react-hooks` à la configuration ESLint de `packages/ui` [SHARED][P1] — le paquet héberge désormais de vrais hooks (`useDismissLayer`) sans AUCUNE règle react-hooks. Deux directives `eslint-disable-next-line react-hooks/exhaustive-deps` y ont cassé le lint en A11a (« Definition for rule was not found »), faute de greffon. Correctif de configuration à part entière, jamais glissé dans un lot fonctionnel

### 1.3 Shared packages scaffolding
- [ ] Scaffold `packages/types` (shared TS types/contracts) [SHARED][P0]
- [ ] Scaffold `packages/config` (eslint/tsconfig/tailwind presets) [SHARED][P0]
- [ ] Scaffold `packages/ui` (component library) [SHARED][P0]
- [ ] Scaffold `packages/i18n` (translation infra) [SHARED][P0]
- [ ] Scaffold `apps/api` (NestJS) [BACK][P0]
- [ ] Scaffold `apps/client` (Next.js, App Router) [CLIENT][P0]
- [ ] Scaffold `apps/pro` (Vite React TS) [PRO][P0]
- [ ] Verify cross-package imports build correctly [SHARED][P0]

---

## PHASE 2 — Shared foundations

### 2.1 Design tokens & UI library
- [ ] Extract color tokens from prototype (zinc neutrals + raspberry accent `#C81E63`; rename any `--gold*` variable to `--accent*`) [SHARED][P0]
- [ ] Define typography tokens (Readex Pro, scales) [SHARED][P0]
- [ ] Define spacing, radius, shadow, z-index tokens [SHARED][P0]
- [ ] Configure Tailwind (or CSS vars) with tokens in `packages/config` [SHARED][P0]
- [ ] Load web fonts (self-host or CDN) with FR/AR subsets [SHARED][P0]
- [ ] Build `Button` component + variants + states [SHARED][P0]
- [ ] Build `Input`, `Select`, `Textarea`, `Checkbox`, `Toggle` [SHARED][P0]
- [ ] Build `Slider` (range) component [SHARED][P0]
- [ ] Build `Card`, `Badge`, `Tag`, `Avatar` [SHARED][P0]
- [ ] Build `Modal`/`Dialog` + focus trap [SHARED][P0]
- [ ] Build `Drawer`/`Sheet` (mobile filters) [SHARED][P1]
- [ ] Build `Tabs`, `Accordion` [SHARED][P1]
- [ ] Build `Toast`/notification component [SHARED][P1]
- [ ] Build `Skeleton` loading component [SHARED][P1]
- [ ] Build `EmptyState` component [SHARED][P1]
- [ ] Build `ErrorState` component [SHARED][P1]
- [x] Build `Spinner`/loader component [SHARED][P0] — `BrandLoader` = variante ANIMÉE du logo (D44), pas un spinner générique. UN SEUL sous-chemin SVG (un second `M` ferait deux serpents, le motif de tirets se réinitialisant par sous-chemin). Zéro JS, zéro dépendance. `prefers-reduced-motion` traité APRÈS la règle globale, avec `opacity: 1` reposé
- [x] Build `AccountMenu` (rond à initiales + menu déroulant accessible) [SHARED][P0] — Lot A11a : `aria-haspopup`/`aria-expanded`, `role=menu` SANS `aria-modal`, fermeture au focus sortant via `relatedTarget`. `initialsOf` itère par POINT DE CODE (`mot[0]` couperait un caractère hors BMP ou une ligature arabe)
- [x] Extract `useDismissLayer` (Escape, piège de focus, focus d'entrée, restitution au déclencheur) [SHARED][P0] — Lot A11a : partagé par `ConfirmDialog` et `AccountMenu`, un seul piège de focus dans le dépôt. `restoreFocusRef` ajouté au correctif A11a — la restitution de focus ne peut pas reposer sur `document.activeElement` seul : sur macOS, cliquer un bouton ne lui donne pas le focus
- [x] Utilitaire `.sr-only` [SHARED][P0] — **introduit par A9** (description masquée de l'unité monétaire, D43) et **réutilisé par A12** : intégrer A12 sans A9 afficherait « Chargement… » à l'écran
- [ ] Build `Pagination` component [SHARED][P1]
- [ ] Build `DatePicker`/calendar primitive [SHARED][P0]
- [ ] Build `Rating` (stars) component [SHARED][P1]
- [ ] Set up Storybook for `packages/ui` [SHARED][P2]
- [ ] Write stories for each component [SHARED][P2]

### 2.2 Internationalization & RTL
- [ ] Install i18n library (e.g. i18next) in `packages/i18n` [SHARED][P0]
- [ ] Create `fr` and `ar` namespace structure [SHARED][P0]
- [ ] Create i18n provider + hook export [SHARED][P0]
- [ ] Implement language detection + persistence [SHARED][P0]
- [ ] Implement `dir` (ltr/rtl) switching on `<html>` [SHARED][P0]
- [ ] Add RTL-aware logical CSS properties convention [SHARED][P0]
- [ ] Build DZD currency formatter (FR/AR digits) [SHARED][P0]
- [ ] Build date/time formatter with timezone (Africa/Algiers) [SHARED][P0]
- [ ] Build number/percent formatter localized [SHARED][P1]
- [ ] Add a missing-translation reporter (dev warning) [SHARED][P2]

### 2.3 Shared API client & contracts
- [ ] Define shared DTO/types in `packages/types` (User, Venue, Booking…) [SHARED][P0]
- [ ] Build typed HTTP client wrapper (fetch + interceptors) [SHARED][P0]
- [ ] Add auth-token attach/refresh interceptor [SHARED][P0]
- [ ] Add error-normalization layer [SHARED][P0]
- [ ] Configure TanStack Query defaults (retry, stale time) [SHARED][P1]

---

## PHASE 3 — Database & data model

### 3.1 Setup
- [ ] Add PostgreSQL service (Docker compose for dev) [DB][P0]
- [ ] Install Prisma in `apps/api` [DB][P0]
- [ ] Configure Prisma datasource + env URL [DB][P0]
- [ ] Enable `btree_gist` PostgreSQL extension (required for the overlap-exclusion constraint, see 3.4) [DB][P0]
- [ ] Install `pg-boss` in `apps/api` for deferred jobs (reminders, hold-expiry, rate limiting) — no Redis at MVP [BACK][P0]

### 3.2 Schema — identity & access
- [ ] Model `User` (id, email, password_hash, role, locale, status, timestamps) [DB][P0]
- [ ] Model `Role`/permissions (or enum + policy table) [DB][P0]
- [ ] Model `Session`/`RefreshToken` [DB][P0]
- [ ] Model `EmailVerificationToken` [DB][P0]
- [ ] Model `PasswordResetToken` [DB][P0]
- [x] Model `ProProfile` (links user → business) [DB][P0] — étendu Lot A10 : `phone2` nullable (D38, un seul numéro reste obligatoire)
- [x] Model `AccountDeletionRequest` + `AccountDeletionArchivedVenue` + enum `AccountDeletionStatus` [DB][P0] — Lot A10 : index unique PARTIEL `WHERE status='PENDING'` en SQL manuel — prouvé en base : 409 sur une seconde demande en attente ; table fille pour la trace d'archivage (D41), pas un tableau scalaire
- [x] Model `EmailChangeToken` (userId, newEmail, tokenHash, expiresAt, usedAt) [DB][P0] — Lot A10 : table SÉPARÉE d'`EmailVerificationToken` (sinon un même token signifierait deux choses, et la règle « un seul lien valide à la fois » ferait s'annuler les deux flux)

### 3.3 Schema — venues & vendors
- [x] Model `Wilaya` and `City` (with GPS) [DB][P0] — Flux A / Lot A1, seed réel 58 wilayas + 23 villes Alger
- [x] Model `Venue` (name FR/AR, capacity **max seule — D36/Lot A9, `capacity_min` SUPPRIMÉE par migration**, base price, coords, **publicationStatus: draft/pending/published**, bookingMode: single_slot/multi_slot, **commissionRate: decimal 1–5%, set per-venue by Zwadj admin, not client-facing**) [DB][P0] — étendu Lots A2/A3 : `status` (D33, visibilité pro), `deletedAt` (soft delete), `cashbackRateBps` (D35, 0–commissionRate). ⚠ A9 : le CHECK `venues_capacity_valid` portait sur les DEUX colonnes — retiré puis REPOSÉ sur `capacity_max > 0`, sinon `DROP COLUMN` l'aurait emporté en silence
- [x] Model `VenuePhoto` (url, order, alt FR/AR) [DB][P0] — étendu `thumbUrl` (A4)
- [x] ~~Model `VenuePhoto360` (single equirectangular photo per venue...)~~ **PÉRIMÉ, voir D34 puis D45** : le tour multi-photos liées (`VenuePhoto360` + `VenuePhoto360Link`, livré au Lot A4 avec 3 renforts SQL — FK composites anti-inter-salles, CHECK photos distinctes, index unique `LEAST/GREATEST`) a lui-même été **supprimé** au Lot A6a, remplacé par `Venue.matterportModelId` (nullable, `@unique`) — vérifié en base réelle : zéro table, zéro contrainte, zéro index résiduel portant `360`
- [x] Model `Amenity` and `VenueAmenity` join [DB][P0] — Flux A / Lot A1 (seed 23 entrées) + Lot A3 (assignation pro, filtre public)
- [ ] Model `VendorCategory` (16 categories — **"Bientôt" placeholder page at MVP, not a browsable directory**; keep the model for when it's activated) [DB][P2]

### 3.4 Schema — availability, slots & pricing
- [ ] Model `SlotTemplate` (per venue: name FR/AR, startTime, endTime — customizable, seeded with 3 standard examples: après-midi court, après-midi standard, soirée) [DB][P0]
- [ ] Add PostgreSQL **`EXCLUDE USING gist`** constraint (btree_gist) on venue + date + time-range, scoped to `status IN ('accepted','confirmed')` — this is the DB-level double-booking guarantee, not an application check [DB][P0]
- [ ] Model `PricingRule` (season, weekday, holiday multiplier — applies to the venue's base price only, not services) [DB][P0]
- [ ] Model `Holiday` (Algerian public/religious holidays) [DB][P1]
- [ ] Model `Service` (per venue: name FR/AR, description, **pricingType: fixed / per_guest / tiered / per_unit**) [DB][P0]
- [ ] Model `ServiceTier` (for `tiered` services: label FR/AR + price — e.g. standard/premium/luxe) [DB][P0]
- [ ] Model `ServicePricing` — **separate table from `Service`** (one-to-one, `serviceId` unique), for `fixed`/`per_guest`/`per_unit` values (unit label + optional min/max for `per_unit`); a `tiered` service has no row here, its prices live in `ServiceTier`. The match between `Service.pricingType` and which mode is filled is an **application-level guarantee** (covered by tests), not a DB constraint across two tables — a deliberate, documented exception to "garanti par la BDD" [DB][P0]
- [ ] Model `PromoCode` [DB][P2]

### 3.5 Schema — visits (separate from party bookings — no overlap, no DB exclusion constraint needed)
- [ ] Model `VisitAvailability` (per venue: day-of-week + time ranges dedicated to visits, fully independent from `SlotTemplate`) [DB][P0]
- [ ] Model `VisitBooking` (venue, client, date, time, status: confirmed/cancelled — **auto-confirmed on creation, no venue approval step**) [DB][P0]

### 3.6 Schema — bookings, quotes, payments, commission & cashback
- [ ] Model `Booking` — **single model, no separate `BookingRequest`**: one row traverses `status: pending/accepted/declined/expired/confirmed/cancelled` from creation to completion (venue, client, date, slotTemplate/custom time range, guests, **paymentMethod: online/cash**, totals) [DB][P0]
- [ ] Model `BookingService` (selected service + resolved price at time of quote — snapshot, since `Service`/`ServiceTier` prices can change later) [DB][P0]
- [ ] Model `Quote` (snapshot of pricing, including guest count used for `per_guest` services) [DB][P0]
- [ ] Model `Payment` (provider=Chargily, amount, status, ref, idempotency key, **discountApplied: 1000 DA if online**) [DB][P0]
- [ ] Model `Commission` (bookingId, **rate snapshot from Venue.commissionRate at booking time**, amount, status) — **assiette = le prix de base de la salle résolu à la date (avec règles saisonnières), JAMAIS le total incluant les prestations** — P0: without this the revenue/GMV KPI is unmeasurable at launch [DB][P0]
- [ ] Model `CashbackClaim` (bookingId, receiptUrl, status: pending_review/verified/paid/rejected, verifiedWithVenueAt) — **for the cash-payment 1000 DA reimbursement flow, requires an existing `Booking` with status pending+ — never awarded without a prior Zwadj request** [DB][P0]
- [ ] Model `Invoice`/`Receipt` [DB][P1]
- [ ] Model `Refund` [DB][P1]

### 3.7 Schema — engagement & ops
- [ ] Model `Review` + `ReviewModeration` [DB][P1]
- [ ] Model `Favorite` (client ↔ venue) [DB][P2]
- [ ] Model `Notification` + `NotificationPreference` [DB][P1]
- [ ] Model `AuditLog` (actor, action, entity, before/after) [DB][P1]

### 3.8 Migrations, indexes, seeds
- [x] Add unique index on `User.email` [DB][P0] — migration initiale ; ⚠ Lot A10 : c'est cette contrainte qui tranche l'unicité à la CONSOMMATION d'un token de changement d'e-mail, le pré-contrôle n'est qu'une courtoisie
- [~] Add index on `Venue` coords + city [DB][P1] — Lot A3 : index partiel `(city_id, base_price_cents) WHERE published/active/non-supprimée` livré (le prédicat réel de `GET /venues`) ; un index géo sur les coordonnées reste à faire si la recherche par rayon sort un jour du statut différé
- [ ] Add composite index on `Booking(venueId, date)` [DB][P0]
- [ ] Add indexes on foreign keys used in filters [DB][P1]
- [ ] Generate the initial migration [DB][P0]
- [x] Write seed: wilayas + major cities w/ GPS [DB][P0] — Lot A1, idempotent, 58 wilayas (D-décision 58-et-non-69, loi 26-06), 23 villes Alger seule
- [x] Write seed: amenities list [DB][P0] — Lot A1, 23 entrées, à faire valider par l'équipe terrain/SEO
- [ ] Write seed: 3 standard `SlotTemplate` examples (après-midi court 14h-17h, après-midi standard 13h-18h/19h, soirée/dîner 17h-22h/23h) [DB][P0]
- [ ] Write seed: sample venues (from prototype data), each with a `commissionRate` between 1–5% [DB][P1]
- [ ] Write seed: sample `VisitAvailability` per seeded venue [DB][P1]
- [ ] Write seed: Algerian holidays [DB][P1]

---

## PHASE 4 — Backend foundations

- [x] Configure NestJS app bootstrap + global prefix `/api/v1` [BACK][P0] — ✅ squelette
- [x] Add config module + env validation (Zod) [BACK][P0] — ✅ squelette, étendu Lot 0 (7 vars auth)
- [x] Add Prisma module/service + connection lifecycle [BACK][P0] — ✅ squelette
- [x] Add global validation pipe [BACK][P0] — ✅ squelette (ZodValidationPipe maison)
- [x] Add global exception filter + error schema [BACK][P0] — ✅ squelette
- [x] Add request logging middleware [BACK][P0] — ✅ Lot 0 (pino-http)
- [x] Add structured logger (pino) [BACK][P1] — ✅ Lot 0 (nestjs-pino, redaction headers auth/cookie) ⛔ *(D302, 23/09/2026 : redaction INCOMPLÈTE selon l'audit sécu du 09/09 — le jeton dans l'URL de verify-email et le `Set-Cookie` sortant restent journalisés ; ouvert à `HEAD`. Reports de D302, « audit sécu 09/09 · journaux ».)*
- [x] Add health-check endpoint `GET /health` [BACK][P0] — ✅ squelette
- [ ] Add readiness endpoint `GET /ready` (DB) [BACK][P1] — pas un endpoint séparé ; `/health` répond déjà `db: up/down`, à toi de voir si un `/ready` distinct reste utile
- [ ] Add pagination helper (cursor/offset) [BACK][P0]
- [ ] Add response-shaping interceptor [BACK][P1]
- [x] Add CORS config per app origin [BACK][P0] — ✅ Lot 1 (`CORS_ORIGINS` env, `credentials: true` pour le cookie D2)
- [x] Set up Swagger/OpenAPI generation [BACK][P0] — ✅ squelette/Lot 1 (`/api/docs`)
- [ ] Add API versioning strategy [BACK][P1] — le préfixe `/api/v1` en fait office de facto ; à toi de trancher si tu veux quelque chose de plus formel
- [x] Add rate-limiting middleware primitive (reused by auth & domain) [BACK][P0] — ✅ Lot 0 (ThrottlerModule global) + Lot 1 (limites par route)
- [x] Add minimal transactional-email send primitive (used before full Phase 8) [BACK][P0] — ✅ Lot 0 (port `EMAIL_SENDER` + adaptateur dev)
- [ ] Add idempotency-key middleware (for unsafe POSTs: booking, payment) [BACK][P0]
- [ ] Enforce money as integer minor units (or Decimal) everywhere — no floats [SHARED][P0]
- [ ] Enforce UTC storage in DB + locale formatting only at the edges [SHARED][P0]
- [ ] Add client-generated UUIDv7 for entities (collision-free offline creation) [SHARED][P0]

---

## PHASE 5 — Auth, authorization & KYC

### 5.1 Authentication
- [x] Install password-hashing lib (argon2) [BACK][P0] — ✅ Lot 0 (argon2id, params m=64MiB/t=3/p=4)
- [x] Implement `POST /auth/register` [BACK][P0] — ✅ Lot 1 (CLIENT/PRO, union discriminée, ADMIN inéligible)
- [x] Validate email format + password strength [BACK][P0] — ✅ Lot 0/1 (schémas Zod partagés `packages/types`)
- [x] Hash password before insert [BACK][P0] — ✅ Lot 1
- [x] Handle "email already in use" [BACK][P0] — ✅ Lot 1 (409 `EMAIL_ALREADY_USED`, tranché par la contrainte BDD, pas de pré-check) ⛔ *(D302 : l'audit sécu du 09/09 y voit une énumération d'adresses — contrôle 26, « partiel » — à l'inscription et au changement d'e-mail. Choix produit, à ordonner par Ko : reports de D302, « audit sécu 09/09 · divers », 4.)*
- [x] Generate email-verification token [BACK][P0] — ✅ Lot 1 (token opaque 256 bits, hash SHA-256 en base)
- [~] Enqueue verification email job (FR/AR) [BACK][P0] (dep: 4 email primitive) — **partiel** : envoi direct via le port `EMAIL_SENDER` (échec loggé, n'annule pas l'inscription), pas encore une vraie queue pg-boss. Revoir à la Phase 8.1 quand un vrai provider remplace le DevLogger.
- [x] Implement `GET /auth/verify-email/:token` [BACK][P0] — ✅ Lot 1 (usage unique, un seul code d'erreur inconnu/expiré/déjà utilisé)
- [x] Implement `POST /auth/resend-verification` [BACK][P0] — ✅ Lot 1 (réponse constante anti-énumération) — **ajouté hors périmètre initial de cette section, non listé plus haut à l'origine mais livré et testé**
- [x] Implement `POST /auth/login` [BACK][P0] — ✅ Lot 2 (anti-énumération D5, dummy argon2 verify, D1 vérifié après le mot de passe)
- [x] Compare password to hash [BACK][P0] — ✅ Lot 2
- [x] Issue JWT access token [BACK][P0] — ✅ Lot 2 (HS256, payload minimal `{sub, role}`, D4)
- [x] Issue + persist refresh token [BACK][P0] — ✅ Lot 2 (déplacé de Lot 3 → Lot 2 au verrouillage des décisions, cf. continuité)
- [x] Implement `POST /auth/refresh` [BACK][P0] — ✅ Lot 3 (rotation D9 par compare-and-swap, détection de réutilisation D10 → révocation globale, prouvé manuellement en plus des tests)
- [x] Implement `POST /auth/logout` (revoke refresh) [BACK][P0] — ✅ Lot 3 (idempotent D11, ne révoque que la session courante)
- [x] Implement `POST /auth/forgot-password` [BACK][P0] — ✅ Lot 4 (D14, anti-énumération, un seul lien valide à la fois)
- [x] Implement `POST /auth/reset-password` [BACK][P0] — ✅ Lot 4 (D15 révocation globale des sessions, D16 code unique, D17 ne connecte pas — atomique en une transaction) ⛔ *(D302, 23/09/2026, APRÈS CONFRONTATION au code de `HEAD` : « atomique » est vrai des TROIS ÉCRITURES — jeton consommé, nouveau hash, révocation D15 —, pas de l'USAGE UNIQUE. `AuthService.resetPassword` lit le jeton AVANT la transaction et le consomme par `update({ where: { id } })` sans `usedAt: null` : deux requêtes concurrentes peuvent réussir toutes les deux — audit SOLID 09/09 · F3, reproduit par l'audit. **Annotée, pas barrée** : la phrase n'est pas fausse, elle se lit plus forte qu'elle n'est. Reports de D302.)*
- [x] Add rate limiting on auth endpoints [BACK][P0] (dep: 4 rate-limit primitive) — ✅ Lots 1-4, les 9 routes ont chacune leur limite dédiée (register 5, verify 10, resend 3, login 10, refresh 30, logout 10, forgot 3, reset 10 / 15min/IP) ; 429 positif prouvé sur register/resend/login/reset

### 5.1bis `UserStatus` lu par les chemins d'authentification (Lot A10 — préalable à D37)
> **Constat qui a motivé le lot** : l'enum `UserStatus { ACTIVE, SUSPENDED, ANONYMIZED }` existait en base mais **aucun chemin d'authentification ne le consultait**. Poser `status = ANONYMIZED` ne désactivait donc RIEN — le compte « supprimé » continuait à se connecter. Chaque chemin refuse dans SON propre vocabulaire ; on n'importe pas le code d'erreur du login ailleurs.

- [x] `POST /auth/login` → `INVALID_CREDENTIALS` (D5, aucun oracle) — test placé **APRÈS** la vérification argon2 (un refus anticipé économiserait le coût et la latence trahirait le statut) et **AVANT** D1 [BACK][P0]
- [x] `POST /auth/google` → `GOOGLE_ACCOUNT_CONFLICT`, code DÉJÀ EXISTANT du chemin (jamais un code neuf) ; placé avant le test de rôle pour que la réponse soit uniforme [BACK][P0]
- [x] `POST /auth/refresh` → 401 standard du chemin. Ceinture ET bretelles : une SUSPENSION manuelle en base ne révoque aucun token [BACK][P0]
- [x] `POST /auth/reset-password` → `TOKEN_INVALID_OR_EXPIRED` — ce chemin raisonne en TOKEN (D16), pas en identifiants ; un lien émis avant la décision cesse d'être exploitable [BACK][P0]
- [x] `POST /auth/forgot-password` · `resend-verification` → réponse CONSTANTE inchangée, mais **aucun token émis ni e-mail envoyé** [BACK][P0]
- [x] `GET /auth/me` → 401 (**6ᵉ chemin, hors du tableau d'origine**) : son commentaire promettait déjà ce comportement alors que le code testait `!user`, qui ne se déclenche jamais après anonymisation [BACK][P0]
- [ ] **Exposition résiduelle ASSUMÉE et documentée** : le `JwtAuthGuard` reste sans accès base (D4 — pas de lecture BDD par requête). La fenêtre est la durée de vie restante d'un access token, bornée par la révocation de TOUS les refresh tokens au moment de l'exécution [BACK][P2] ⛔ *(D302 : l'audit sécu du 09/09 la relève — contrôles 9 et 18, « un JWT déjà émis n'est pas immédiatement invalidé » : conforme à ce qui est assumé ici. Il ajoute AUTRE CHOSE : aucun plafond ABSOLU de durée de session — entrée neuve, reports de D302.)*

### 5.1ter Gestion du compte (Lot A10 — chemins sensibles, revue humaine obligatoire)
- [x] `PATCH /me/profile` — patch PARTIEL réel ; champs triés par rôle **côté serveur** (pro : `businessName`/`phone`/`phone2` ; client : `firstName`/`lastName`/`phone`). Le corps ne porte pas de discriminant : en accepter un du client ouvrirait une écriture croisée. Répond un `AuthUserDTO` complet (D12) [BACK][P0]
- [x] `POST /me/change-email` — dépose une DEMANDE, ne bascule RIEN. Le lien part **À LA NOUVELLE adresse** : une faute de frappe ne peut pas verrouiller quelqu'un dehors [BACK][P0]
- [x] `GET /auth/confirm-email-change/:token` — **PUBLIQUE** (le lien arrive dans une boîte peut-être ouverte sans session ; le token EST l'authentification, patron `verify-email`). C'est ICI et seulement ici que l'e-mail bascule. **N'était pas au cadrage** : sans elle, la nouvelle adresse ne pouvait jamais prendre effet [BACK][P0]
- [x] `POST /me/change-password` — D42, mode décidé par le SERVEUR d'après `passwordHash`. Révoque toutes les sessions SAUF la courante, qui est rotée [BACK][P0]
- [x] `GET /me/deletion-request` — demande en cours ou `null`. **Obligatoire** : sans lui, l'UI re-proposerait la suppression à quelqu'un qui a déjà une demande, et la soumission taperait dans l'index unique [BACK][P0]
- [x] `POST /me/deletion-request` + `POST /me/deletion-request/cancel` — D37. La réversibilité de l'annulation est ce qui rend D37 tenable [BACK][P0]
- [x] `GET /admin/deletion-requests` + `POST /admin/deletion-requests/:id/{approve,reject}` — validation MANUELLE par l'admin Zwadj. `venueCount` exposé = salles qui SERAIENT archivées (même prédicat que l'exécution) [BACK][P0]
- [x] Exécution d'une approbation = **une transaction, cinq effets, ZÉRO `DELETE` SQL** : salles vivantes → `deletedAt` + trace ; `status=ANONYMIZED`, e-mail non routable (`.invalid`, RFC 2606), PII effacée, **`googleSub` → null** (sinon un clic Google ressusciterait le compte) ; refresh + reset + vérification + changement d'e-mail invalidés ; `ProProfile.phone`/`phone2` effacés mais `businessName` CONSERVÉ ; `emailHash` SHA-256 de l'adresse détruite [BACK][P0]
- [x] E-mails de décision **hors transaction, après commit**, adresse **capturée avant** l'anonymisation ; échec loggé jamais bloquant [BACK][P0]
- [x] Throttle dédié : `change-password` 10/15 min (vérifie ET hache un mot de passe), `change-email` 3/15 min (envoie un e-mail à une adresse choisie par l'appelant) [BACK][P0]
- [x] i18n FR/AR de tous les nouveaux codes (`account.errors.*`, `account.validation.*`) + parité, namespace épinglé dans le test permanent [SHARED][P0]
- [ ] **Décider le parcours de RÉCLAMATION** d'un compte supprimé revenu (comment prouver son identité et récupérer les salles). `emailHash` l'outille, rien ne l'implémente. La restauration n'est PAS un endpoint au MVP : opération manuelle DBeaver (D4) [BACK][P1]
- [ ] `ParseUUIDPipe` sur les routes admin ⇒ **400** sur id malformé, et non le 404 indistinct d'A3. Divergence assumée (admin de confiance, aucun enjeu d'énumération) — à confirmer si un jour ces endpoints s'ouvrent [BACK][P2]

### 5.2 Authorization (RBAC)
- [x] Create JWT auth guard [BACK][P0] — ✅ Lot 2 (`JwtAuthGuard` global via `APP_GUARD`, opt-out `@Public()`)
- [x] Create roles guard + `@Roles()` decorator [BACK][P0] — ✅ Lot 2 (`RolesGuard` global, ordre Throttler→Jwt→Roles, D6)
- [~] Define permission matrix (client/pro/admin/super/support) [BACK][P0] — **partiel/à corriger** : le schéma Prisma (`UserRole`) ne définit que `CLIENT`/`PRO`/`ADMIN` — `super`/`support` n'existent nulle part dans le code ou le schéma. Soit cet item vise un futur enrichissement du modèle de rôles (à trancher), soit le libellé du backlog est à corriger pour ne citer que les 3 rôles réels.
- [x] Add ownership checks (pro can only touch own venues) [BACK][P0] — Lots A2/A4 : `assertOwnedLivingVenueId` public, WHERE unique partagé, court-circuit `UUID_PATTERN` → 404 indistinct, **jamais de gate sur `status` D33**
- [x] Write unit tests for guards [BACK][P1] — ✅ Lot 2 (`jwt-auth.guard.spec.ts`, `roles.guard.spec.ts`) + preuve d'intégration dédiée (`rbac.int-spec.ts`, sonde `@Roles` réelle)
- [x] RBAC exhaustif sur les routes RÉELLES [BACK][P0] — ✅ **T2/D119** : `rbac-all-routes.int-spec.ts`. ⚠ `rbac.int-spec.ts` ne testait qu'un contrôleur-**sonde** : il prouvait que le guard fonctionne, **rien** sur les 38 routes pro réelles. La table est **dérivée du routeur Nest à l'exécution** — 77 routes (38 PRO, 5 ADMIN, 8 CLIENT, 16 authentifiées sans rôle, 10 publiques). ⚠ Un huitième test **renverse la logique** : les routes sans rôle sont confrontées à une **liste blanche** de 16 entrées justifiées, parce qu'une route privée de son `@Roles` sortait du périmètre des sept autres

### 5.3 KYC (venues/vendors)
- [ ] Implement `POST /pro/kyc/documents` upload [BACK][P1]
- [ ] Store doc metadata + file in object storage [BACK][P1]
- [ ] Implement KYC status states (pending/approved/rejected) [BACK][P1]
- [ ] Block venue publishing until KYC approved [BACK][P1]
- [ ] Admin endpoint to review/approve KYC [ADMIN][P1]

### 5.4 OAuth Google (Client uniquement — ajouté post-Auth, Lots 7-9, Apple hors périmètre)
- [x] Migration `User.passwordHash` nullable + `User.googleSub` (string, nullable, unique) [BACK][P0] — ✅ Lot 8 (`20260718150000_user_google_oauth`, additive ; `passwordHash` NULL impossible via le register classique, uniquement via le flux Google)
- [x] Port/adapter de vérification d'ID token Google (`google-auth-library`, audience = `GOOGLE_CLIENT_ID`) [BACK][P0] — ✅ Lot 8 (port `GOOGLE_TOKEN_VERIFIER` + adapter à construction paresseuse : l'API boote sans `GOOGLE_CLIENT_ID` et la route répond 503 `GOOGLE_AUTH_DISABLED` ; variable ajoutée à `PROD_REQUIRED_EXPLICIT` → fail-fast au boot en prod. Arbitré à la revue.)
- [x] `POST /auth/google` : 3 branches (CLIENT existant → connexion + liaison ; PRO/ADMIN existant → 403 explicite ; introuvable → création `emailVerifiedAt=now()`) [BACK][P0] — ✅ Lot 8. Arbitrages de revue verrouillés : **200 même à la création** (sémantique « se connecter », un seul chemin d'hydratation front) ; `locale` du body appliquée **à la création uniquement** (défaut `fr`, un compte existant garde la sienne) ; **backfill `emailVerifiedAt`** à la liaison d'un compte classique non vérifié (même base de confiance que la création) ; course P2002 → relire → même matrice ; **sub divergent → 409 `GOOGLE_ACCOUNT_CONFLICT` sans auto-réparation** (cf. D33 ci-dessous)
- [x] Refus si `email_verified` du token Google est `false` [BACK][P0] — ✅ Lot 8 (403 `GOOGLE_EMAIL_NOT_VERIFIED` ; comparaison `=== true` stricte : claim absent = non vérifié)
- [x] Extension du hash factice anti-timing (D5) aux comptes `googleSub`-only sur le login classique [BACK][P0] — ✅ Lot 8 (même 401 `INVALID_CREDENTIALS` au corps identique, coût argon2 payé — prouvé en intégration)
- [x] `forgot-password` fonctionnel sur un compte Google-only (parcours hybride) [BACK][P1] — ✅ Lot 8 (prouvé en intégration : le reset pose un mot de passe, les DEUX voies connectent ensuite)
- [x] Throttle dédié `POST /auth/google` (ordre de grandeur de `register`) [BACK][P1] — ✅ Lot 8 (5/15 min/IP, identique à register — la route peut créer un compte)
- [x] Bouton officiel Google Identity Services sur connexion + inscription (Client uniquement, D29) [CLIENT][P0] — Lot 9
- [x] Écran d'erreur dédié "compte Professionnel" côté Client [CLIENT][P0] — Lot 9
- [x] Lot 9 — exigences héritées de la revue Lot 8 : transmettre la **locale COURANTE du front** dans le body de `POST /auth/google` (le défaut `fr` n'est qu'un filet côté API) ; créer les clés FR/AR `auth.errors.google*` pour les 5 codes (`GOOGLE_TOKEN_INVALID`, `GOOGLE_EMAIL_NOT_VERIFIED`, `GOOGLE_ACCOUNT_NOT_CLIENT`, `GOOGLE_ACCOUNT_CONFLICT`, `GOOGLE_AUTH_DISABLED`) ; exposer le client ID côté front (`NEXT_PUBLIC_…`, valeur publique par nature, à ne pas confondre avec le secret) [CLIENT][P0]
- [ ] **D33 (proposée à la revue Lot 8, NON tranchée — post-MVP)** : parcours de récupération du cas « email changé côté Google après liaison » (sub divergent). Aujourd'hui : 409 propre, aucun silence ni corruption — mais un compte Google-only (sans mot de passe) touché n'a plus de porte de sortie. Rare mais réel, accepté tel quel au MVP. Pistes : lookup par `sub` avant l'email, ou parcours support/re-liaison encadré. [BACK][P2]
- [ ] Hygiène secrets (constat revue Lot 8) : retirer `GOOGLE_CLIENT_SECRET` de `apps/api/.env` (inutile au flux GIS ID-token — zéro secret par cadrage — et non consommé par le code) et le révoquer/régénérer dans la console Google Cloud car il a circulé dans des zips ; ne plus inclure de `.env` dans les zips échangés [INFRA][P0] — action Ko
- [x] Remember-me fonctionnel (`RefreshToken.persistent`, D27) [BACK][P0] — ✅ Lot 7 CLOS, migration confirmée par Ko en local sur PG18 réel. D31 verrouillée : remember-me reste Client uniquement, le Pro garde un cookie toujours persistant.
- [x] Correctif 7.1 (accessibilité `required`/D32) + Correctif 7.2 (nom/prénom obligatoires + téléphone optionnel à l'inscription Client, suppression de la sous-légende sous le logo, lien "Vous êtes un professionnel ? Accès entreprises" → `PRO_URL`) [BACK][P0] — ✅ CLOS : les 2 défauts de livraison (dossier `apps/api/src/generated/prisma` absent, assertion `lastName: null` périmée dans `me.int-spec.ts`) sont corrigés dans la livraison Lot 8 et re-vérifiés en bac à sable (`generated/prisma` présent dans le zip, assertion alignée sur `"Boudiaf"`, 83/83 tests d'intégration).

---

## PHASE 6 — Backend business domain

### 6.1 Venues & vendors
- [x] `GET /venues` (filters: city, capacity, budget, amenities) — **only `publicationStatus=published`** [BACK][P0] — Lot A3, + `status=ACTIVE` (D33), tri price_asc/price_desc/recent, pagination offset
- [x] `GET /venues/:id` (full detail) [BACK][P0] — livré en `GET /venues/:slug` (résolution par slug, décision Flux A), Lot A3 ; visibilité D33 étendue à `TEMPORARILY_UNAVAILABLE` (bandeau)
- [x] `POST /venues` (pro) — created as `publicationStatus=draft` [BACK][P0] — Lot A2
- [x] `PATCH /venues/:id` (pro) [BACK][P0] — Lot A2 (update partiel réel) + Lot A3 (amenityIds, remplacement d'ensemble)
- [x] `DELETE /venues/:id` (soft delete) [BACK][P1] — Lot A2
- [x] Venue photo upload + resize/thumbnail pipeline + ordering [BACK][P0] — Lot A4 : 7 endpoints pro, la base stocke des CLÉS (URL recalculées à chaque lecture ⇒ bascule disque→S3 sans réécrire une ligne), plafonds 30/12, compensation d'orphelin d'upload prouvée, `PHOTO_ORDER_MISMATCH` sur ensemble incomplet
- [x] ~~`POST /venues/:id/photo-360`...~~ **PÉRIMÉ, voir D34 puis D45** : le tour multi-photos liées (Lot A4, `buildViewer360Data` pure, `initialSceneId` déterministe `(createdAt, id)`) est lui-même remplacé par `PATCH /venues/:id/virtual-tour` (Lot A6a) — body `{ matterportInput }`, 400 `INVALID_MATTERPORT_LINK`, 409 `MATTERPORT_ALREADY_LINKED` (code ajouté à l'exécution, non prévu au cadrage initial)
- [x] `POST /admin/venues/:id/publish` (protected endpoint, sets draft/pending → published) [BACK][P0] — Lot A3, one-way idempotent (pas de dépublication au MVP, `status`=D33 couvre ce besoin côté pro)
- [ ] `GET /vendor-categories` (directory listing only, no booking flow) [BACK][P1] — explicitement hors périmètre Flux A, page "Bientôt disponible" inchangée

### 6.2 Slots, availability & pricing engine
- [ ] Decide/confirm per-venue `bookingMode` at creation (single_slot vs multi_slot) [BACK][P0]
- [x] ~~`GET /venues/:id/slot-templates`~~ — **pas d'endpoint dédié** : les créneaux voyagent dans `VenueProDTO.slotTemplates` (Lot B1). Un créneau sans sa salle n'a pas de sens. [BACK][P0]
- [x] `POST` / `PATCH` / `DELETE /venues/:id/slot-templates[/:slotId]` — **Lot B1**. Chevauchement semi-ouvert (deux créneaux qui se TOUCHENT ne se chevauchent pas), 409 `SLOT_TEMPLATE_OVERLAP` / `SLOT_TEMPLATE_SINGLE_MODE` / `SLOT_TEMPLATE_IN_USE`. ⚠ `endMinutes` va jusqu'à **2880** : la soirée 20h→02h est le cas NORMAL (D52). [BACK][P0]
- [x] `GET /venues/:slug/availability?from=&to=` — **Lot B3, public, par SLUG** (pas par id). Fenêtre ≤ **92 jours rendus**, bornes du passé et de l'horizon **écrêtées** et non rejetées (D49). Pas de `ruleId` dans la réponse (D50). [BACK][P0]
- [x] Logique des états — **Lot B3**, `availability-engine.ts` PUR (13 tests). `BLOCKED` > `BOOKED` > `REQUESTED` > `AVAILABLE`. Fenêtre de chargement à **+2880 min** : sans cela une soirée 20h→02h du dernier jour ne verrait pas une réservation de 00h30 le lendemain. [BACK][P0]
- [x] Prix par date — **Lot B2**, `pricing-engine.ts` PUR. Résolution HOLIDAY > WEEKDAY > SEASON, puis priorité décroissante, puis date de création, puis **`id`** (sans ce dernier départage, deux règles créées dans la même transaction donnent un résultat non déterministe). ⚠ `Holiday.date` est `@db.Date` rendu à **minuit UTC** : interroger la table avec `dayStartMs` décalerait la fenêtre d'un jour (D50). [BACK][P0]
- [ ] **D39 — CONTRAINTE DE CONCEPTION (à intégrer AVANT d'écrire le moteur, pas après) : le prix doit pouvoir varier PAR CRÉNEAU** (matin/soir), pas seulement par date. Aujourd'hui `PricingRule` n'a aucun lien vers `SlotTemplate` et `SlotTemplate` ne porte aucun prix — décider ici de la forme (`PricingRule.slotTemplateId` nullable + nouveau `PricingRuleType`, ou override de prix porté par `SlotTemplate`) et la poser dans le même mouvement que le résolveur. Chemin d'argent (base de calcul de la commission) ⇒ tests + revue humaine [BACK][P0]
- [x] ~~`POST /venues/:id/availability/block`~~ **ROUTE PÉRIMÉE.** La vraie API (Lot B3, D51) est : `POST /venues/:id/availability-blocks`, `DELETE /venues/:id/availability-blocks/:blockId`, `GET /pro/venues/:id/availability-blocks?from=&to=`. Ressource **plurielle** (elle se liste et se supprime) et topologie A2 : écritures **nues**, lectures préfixées **`/pro`**. Corps en date-heure civile LOCALE `YYYY-MM-DDTHH:mm` **sans offset** — l'API applique UTC+1 elle-même. [BACK][P0]
- [ ] Implement overlap detection for `pending` requests (allowed, surfaced as a conflict list — not rejected) [BACK][P0]
- [ ] Implement double-booking prevention for `accepted`/`confirmed` via the DB exclusion constraint (dep: 3.4) — catch the constraint violation and return a clean conflict error, don't just rely on app-level checks [BACK][P0]
- [ ] `GET /venues/:id/services` (each service includes its `pricingType` + resolved pricing/tiers) [BACK][P0]
- [ ] `POST /venues/:id/services` (pro creates a service, picks a `pricingType`, fills price/tiers accordingly) [BACK][P0]
- [ ] `PATCH /venues/:id/services/:serviceId` (pro edits price/tiers) [BACK][P1]
- [ ] Implement per-type price resolution: `fixed` → flat price; `per_guest` → price × guest count from the quote; `tiered` → selected tier's price; `per_unit` → price × client-chosen quantity [BACK][P0]
- [ ] Implement quote total calculation (venue base price + resolved services total) [BACK][P0]
- [ ] Implement deposit (30%) calculation, **minus 1000 DA if paid online** (dep: Phase 7 discount logic) [BACK][P0]
- [ ] Display TVA + platform/service fee breakdown to client on the quote [BACK][P0]
- [ ] Implement promo-code application + validation [BACK][P2]

### 6.3 Quotes & booking lifecycle (request-to-book)
- [ ] `POST /quotes` (build quote snapshot — **snapshot resolved service prices**, since a `per_guest`/`tiered` price depends on the guest count and Service prices can change later) [BACK][P0]
- [ ] `GET /quotes/:id` [BACK][P0]
- [ ] Define booking status enum + allowed transitions (pending → accepted/declined/expired ; accepted → confirmed/cancelled) [BACK][P0]
- [ ] Build a generic transition guard (rejects any move not in the allowed-transitions map) [BACK][P0]
- [ ] `POST /bookings` (create as "pending" — this is the client's request, not yet a hold on the slot) [BACK][P0]
- [ ] Require idempotency key on `POST /bookings` (prevent double-submit) [BACK][P0] (dep: 4 idempotency middleware)
- [ ] `POST /bookings/:id/accept` (pro) — transition pending → accepted; this is what actually locks the slot via the DB constraint; on constraint violation, return conflict [BACK][P0]
- [ ] `POST /bookings/:id/decline` (pro) — transition pending → declined [BACK][P0]
- [ ] Implement pending-request expiration job (pending → expired if pro doesn't respond in X days) via pg-boss [BACK][P0]
- [ ] `POST /bookings/:id/confirm` (system, triggered by successful payment) — transition accepted → confirmed [BACK][P0] (dep: Phase 7)
- [ ] Implement orphaned-payment recovery: payment succeeded but confirm failed → auto-refund or manual reconciliation queue [BACK][P0]
- [ ] `PATCH /bookings/:id` (modify guests/services, pending only) [BACK][P1]
- [ ] `POST /bookings/:id/cancel` + cancellation policy [BACK][P1]
- [ ] Implement refund eligibility logic [BACK][P1]
- [ ] `GET /bookings` (client list, with status) [BACK][P0]
- [ ] `GET /pro/bookings` (pro list w/ filters, surfacing overlapping-pending conflicts) [BACK][P0]
- [x] ~~`POST /pro/bookings` (walk-in manual booking, created directly as `confirmed`…)~~ — **RETIRÉE, pas faite : elle n'est pas nécessaire.** Le parcours sur place se compose d'endpoints déjà livrés : `POST /venues/:id/quotes` (PRO, `clientId` facultatif) → `send` → `convert` (le corps porte le contact) → `POST /pro/bookings/:id/accept`. ⚠ Et son énoncé était **périmé face à D101** : « created directly as `confirmed` » est exactement la logique séparée que D101 interdit — en ligne comme en présentiel, mêmes lignes, mêmes statuts, mêmes transitions. Vérifié dans les contrôleurs avant d'écrire une ligne (tranche UIP) [BACK][P0]

### 6.4 Visits (separate flow, no venue approval, no double-booking constraint)
- [ ] `GET /venues/:id/visit-availability` [BACK][P0]
- [ ] `POST /venues/:id/visit-availability` (pro sets day-of-week + time ranges dedicated to visits) [BACK][P0]
- [ ] `POST /venues/:id/visits` (client books a visit slot — **auto-confirmed immediately**, no pro approval step) [BACK][P0]
- [ ] Notify pro on new visit booking (message and/or email) [BACK][P0] (dep: Phase 8)
- [ ] `POST /visits/:id/cancel` (pro-initiated, for unforeseen conflicts — pro contacts client directly, this just updates status) [BACK][P1]
- [ ] `GET /pro/visits` (pro's upcoming visit bookings) [BACK][P0]

### 6.5 Cashback & online-payment discount (anti-leakage incentive)
> **Préparatoire livré (Lot A3, D35)** : `Venue.cashbackRateBps` (% du prix de base, défaut 0, réglable par l'admin dans le même geste que la commission), contrainte bloquante `cashback ≤ commission` (CHECK SQL + validation applicative, message explicite). Remplace les montants fixes -1000/+1000 DA ci-dessous par un taux variable par salle — la mécanique de réservation/paiement elle-même reste à construire (items ci-dessous, Phase 7).
- [ ] Implement the -1000 DA discount at deposit calculation time when `paymentMethod=online` (already in 6.2) [BACK][P0] — **montant à revoir en % via `cashbackRateBps` (D35)**
- [ ] `POST /bookings/:id/cashback-claim` (client submits a receipt after paying cash) — **only allowed if the booking already exists with status pending or later; never accept a claim with no prior Zwadj booking** [BACK][P0]
- [ ] `POST /admin/cashback-claims/:id/verify` (protected endpoint — Zwadj confirms with the venue before payout) [BACK][P0]
- [ ] `POST /admin/cashback-claims/:id/pay` (marks as paid; the 1000 DA is deducted from the venue's owed commission, not from Zwadj's own funds) [BACK][P0]
- [ ] `GET /cashback-claims/:id` (client can check claim status) [BACK][P1]

### 6.6 Reviews & search
- [ ] `POST /reviews` (client, post-event only) [BACK][P1]
- [ ] Review moderation queue + states [BACK][P1]
- [ ] `GET /venues/:id/reviews` [BACK][P1]
- [~] Implement search filtering + sorting (price/rating/recommended) [BACK][P0] — Lot A3 : filtres (ville/capacité/budget/amenities) + tri `price_asc`/`price_desc`/`recent`. **Lot A9** : le filtre capacité ne compare plus qu'à `capacityMax` (`guests ≤ capacityMax`) — le minimum excluait des salles à tort. Tri "rating"/"recommandé" : l'algorithme reste au 23.8, A4 a posé la donnée (`photoCount`, couverture)
- [ ] Add full-text search on venue name/tagline [BACK][P2]

---

## PHASE 7 — Payments & finance (Chargily only at MVP)

> ⛔ **ARBITRAGES DE KO DU 23/09/2026 (D302) — À LIRE AVANT TOUTE ENTRÉE DE CETTE PHASE.** Le lot argent (E3) est
> **codé par Claude Code** ; les **décisions** sur le paiement sont prises par **le relecteur du chat** — pas par la
> session qui code, qui signale et propose —, avec l'intervention de Ko ; la **revue** a la forme ratifiée
> (« D39 ») : une AUTRE session, ouverte à froid, tente de casser le code et rapporte sans corriger, le relecteur
> audite et décide, Ko garde le veto. Avant toute ligne de code E3 : un rang arbitré par Ko, puis l'état des lieux
> et le cadrage du sous-lot, sur lesquels le relecteur décide. Texte complet, mot pour mot : `AGENTS.md`,
> « À NE PAS faire », point E3 ; et `ZWADJ_CONTINUITE.md`, tête de « ⛔ E3 — MÉTHODE RENFORCÉE ».
> ⛔ **(D303, 23/09/2026) — décisions du relecteur (chat), déléguées par Ko** : **(1)** la forme de revue ratifiée
> s'applique à **TOUT lot de code du chemin de l'argent**, y compris ceux qui n'ont pas besoin de Chargily
> (audit SOLID 09/09 · F1, F2, F6, et F5 que Ko ordonne avec eux — rang 23) ; **(2)** R1 : sur ce chemin, une garde
> n'est prouvée que par une neutralisation dont on a **lu** l'échec (tests collectés > 0 **et** assertion en échec),
> et la correction de R1 dans ses harnais **bloque la levée du drapeau des paiements**, avec F8 ⛔ *(D304 : et la
> prochaine certification qui compte des cibles de ce chemin — (b) ci-dessous)* ; **(3)** la
> provenance de chaque sous-lot : SHA de départ rapporté, `git diff` depuis lui limité aux fichiers du cadrage, aucun
> fichier non suivi hors `a-verser/`. ⚠ **« D39 »** désigne la **dernière phrase** de D39 (« Chemin d'argent ⇒ revue
> humaine »), **pas son objet** (prix par créneau). ⛔ **Et un fait** : Ko n'a pas de compte Chargily en mode test —
> tableau des sous-lots ci-dessous. Détail et motifs : tête de la méthode renforcée, bloc D303.
> ⛔ **(D304, 24/09/2026) — décisions du relecteur (chat), déléguées par Ko** : **(a)** « chemin de l'argent » est une
> **RÈGLE** — (1) calcule, arrondit ou valide un montant ; (2) transition qui ouvre, modifie ou éteint une obligation
> de payer ; (3) le paiement ; (4) les harnais qui en prouvent les gardes ; en cas de doute, la session demande — texte
> entier dans `AGENTS.md`, point E3 ; **(b)** la correction de R1 bloque aussi **la prochaine certification qui compte
> des cibles de ce chemin** ; ⛔ **(c) l'audit de secrets ne voit pas une clé au format Chargily : cela BLOQUE LA
> REPRISE D'E3**, c'est-à-dire tout lot qui manipule des clés Chargily — entrée `[OUTIL]`, reports de D303. Détail et
> motifs : tête de la méthode renforcée, bloc D304.

> ⚠ **MÉTHODE RENFORCÉE (D126) — cette phase ne se livre PAS comme les autres.**
> Cinq sous-lots, **un arrêt franc entre chacun**, six portes **et** suite e2e
> avant que le suivant ne commence :
>
> | Sous-lot | Périmètre | Ce qui n'y entre PAS |
> |---|---|---|
> | **E3a** ✅ | Cadrage + modes de défaillance + drapeau `PAYMENTS_ENABLED` | Aucun code métier |
> | **E3b-1** ✅ | Port de paiement, décision PURE, `Payment` en `PENDING` | Aucune bascule de statut, aucune route |
> | **E3b-2** ⛔ | Adaptateur Chargily + session de règlement | **bloqué : compte bac à sable** — ⛔ **ACTUEL** (Ko, 23/09/2026, D303) |
> | **E3c** ⛔ | Webhook : signature, déduplication, mise en file | Aucune logique métier dans le handler HTTP — ⛔ **bloqué : compte bac à sable** (D303) |
> | **E3d** ⛔ | `PAID` → `Booking CONFIRMED` + `Quote ACCEPTED` + `Commission` | Remboursements, factures — ⛔ **suit E3c** (D303) |
> | **E3e** ⛔ | Remboursements, factures, réconciliation | — ⛔ **suit E3d** (D303) |
>
> ⛔ **UN FAIT, DÉCLARÉ PAR KO LE 23/09/2026 (D303) : KO N'A PAS DE COMPTE CHARGILY EN MODE TEST.** Conséquences,
> écrites telles que Ko les a données :
> - **le blocage d'E3b-2 (« compte bac à sable ») est ACTUEL** ;
> - **E3c est bloqué aussi** : la méthode exige des charges utiles **capturées du bac à sable réel** (exigence 2
>   ci-dessous ; « ⛔ E3 — MÉTHODE RENFORCÉE », point 4) — un webhook signé ne se capture pas sans compte ;
> - **E3d et E3e suivent.**
> ⇒ **E3 ATTEND SUR CE FAIT, PAS SUR UNE PRIORITÉ.** Un rang arbitré ne suffit pas à ouvrir E3b-2 ni E3c tant qu'il
> tient.
> ⚠ **ÉCART RELEVÉ, NON TRANCHÉ (D303, lecture seule)** : `chargily.gateway.ts` et ses trois fixtures existent au dépôt
> depuis `dc63afb` (16/08/2026, « E3b ») ; la spec les dit « captures réelles du bac à sable » (`livemode` = `false`
> dans la réponse capturée) ; l'« État des lots » d'`AGENTS.md` (instantané du 20/08) porte « E3b (Chargily) ✅ livré
> et mesuré », et le journal de ce jour-là précise « exercé contre `fetch` espionné, pas contre le bac à sable ». Ce
> que ce tableau dit bloqué n'est donc pas l'écriture de l'adaptateur mais **tout ce qui exige le bac à sable réel** :
> son exercice contre le réseau, le renouvellement des captures, les charges utiles de webhook. **Avec quel compte les
> captures du 16/08 ont été faites n'est écrit nulle part** — question à Ko, section D303 de `ZWADJ_CONTINUITE.md`.
>
> Quatre exigences qui n'existaient pour aucune phase précédente :
> 1. **Toute garde neuve est NEUTRALISÉE pour prouver que son test mord** — les deux
>    mesures (rouge sans la garde, vert avec) figurent au rapport de livraison.
> 2. **Aucune valeur écrite de mémoire** : charges utiles Chargily **capturées du bac
>    à sable réel** et versionnées comme fixtures ; **aucun montant en dur**, tout
>    dérive de `roundToDinar`.
> 3. **Aucune référence « gelée »** sur le chemin de l'argent — la seule référence
>    acceptable est **zéro**. (La tolérance de D125 pour la dette d'accessibilité ne
>    s'étend pas ici.)
> 4. **Un mode de défaillance non listé en E3a ne se code pas** : on rouvre E3a.
>
> ⚠ Modes de défaillance à couvrir, au minimum : webhook reçu **deux fois** /
> **dans le désordre** / **très en retard** / **jamais** ; Chargily dit `PAID` mais
> l'écriture en base échoue ; le client paie **deux fois** ; le pro enregistre un
> acompte **en espèces** pendant qu'un paiement est **en vol** (D101 impose la même
> bascule — **cette course existe**) ; un remboursement croise un paiement ; la
> réservation a été annulée entre la création de la session et le paiement ; le
> créneau a été pris entre-temps.
>
> ⚠ **DEUX MODES AJOUTÉS LE 16/08/2026 — E3a rouverte, périmètre limité (D197).**
> Ils manquaient, et l'adaptateur E3b ne pouvait pas se coder sans eux.
>
> | Mode | Traitement retenu |
> |---|---|
> | **La création de session TEMPORISE** — le délai expire après l'envoi, donc le checkout existe peut-être | **Aucun réessai automatique.** Réessayer créerait une seconde session pour une seule affaire. L'orpheline est inatteignable (son URL n'est jamais parvenue au client) et expire seule. ⚠ **E3c doit ignorer proprement** un webhook au `providerCheckoutId` inconnu. |
> | **La création de session est REFUSÉE** (montant hors bornes, clé révoquée, compte non vérifié) | **502**, distinct du **503** d'injoignable : le fournisseur répond, c'est la demande qu'il rejette. Message du fournisseur **journalisé, jamais renvoyé au client**. |
>
> ⚠ **L'idempotence n'existe nulle part dans le dépôt aujourd'hui** (vérifié août
> 2026). `AGENTS.md` l'affirmait comme un invariant tenu — c'était faux, la ligne
> est corrigée. `WebhookEvent @@unique(provider, eventId)` existe au schéma, le code
> non.
>
> ⚠ **CE QUI EXISTE DÉJÀ EN BASE — relevé des MIGRATIONS, pas de `schema.prisma`
> (D186).** Un cadrage a conclu que « rien n'empêche deux paiements `PAID` » sur
> la foi de `@@index([bookingId])` : **faux**, Prisma n'exprime pas les index
> uniques partiels.
>
> | Garantie | Objet |
> |---|---|
> | `payments_one_paid_per_booking` | **un seul `PAID` par réservation** — existe depuis juillet 2026 |
> | `payments_amounts_valid` | `amount_cents >= 0` **et** `discount_applied_cents >= 0` |
> | `commissions_booking_id_key` | une seule commission par réservation |
> | `commissions_rate_range` | taux entre 100 et 500 bps |
> | `commissions_amounts_valid` | net ≥ 0 — break-even au pire cas gravé en base |
> | `webhook_events_provider_event_id_key` | déduplication (**code absent**) |
> | `cashback_one_active_per_booking` | un seul cashback actif |
> | `bookings_venue_timerange_gist` | `EXCLUDE` sur `('ACCEPTED','CONFIRMED')` |
>
> ⚠ **`payments_amounts_valid` autorise `amount_cents = 0`** : la base accepterait
> un paiement de zéro. Refusé applicativement (`NOTHING_TO_PAY`), à retenir pour E3d.
>
> ⚠ **Un mode de défaillance listé n'existe pas encore** : « le pro encaisse en
> espèces pendant qu'un paiement est en vol » suppose une route d'encaissement
> espèces — il n'y en a **aucune** (`bookings-pro.controller.ts` n'expose
> qu'`accept`, `decline`, `cancel`). Il naîtra avec elle.
>
> ⚠ **`pg-boss` est VALIDÉ mais pas encore ajouté** : il sert à la mise en file du
> webhook (E3c). Une dépendance installée mais inutilisée est du bruit qu'on cesse
> de voir ; elle arrivera avec le code qui s'en sert.
> ✅ **Confirmé par Ko le 16/08/2026** : `pg-boss` entre **avec E3c**, pas avant.
> ⏸ **E3c EST EN PAUSE depuis le 17/08/2026** (arbitrage Ko) — priorité donnée au
> parcours Client. `pg-boss` attend donc sa reprise.
> ⛔ *(D303, 23/09/2026 : la pause n'est plus la seule chose qui retient E3c — **pas de compte Chargily en mode test**
> (fait déclaré par Ko), donc pas de charge utile de webhook capturée. Un arbitrage de rang lèverait la pause, pas ce
> fait. Tableau des sous-lots, ci-dessus.)*

- [ ] Create payment abstraction interface (provider-agnostic, even with one provider — keeps BaridiMob addable later without refactor) [BACK][P0]
- [ ] Chargily: create checkout session (amount, currency, success/failure return URLs) [BACK][P0]
- [ ] Chargily: persist the payment intent before redirecting (so a webhook arriving first has something to match) [BACK][P0]
- [ ] Build the two return pages (success/failure) the client lands on after Chargily redirect [CLIENT][P0]
- [ ] Implement Chargily webhook receiver endpoint [BACK][P0]
- [ ] Verify Chargily webhook signature before processing [BACK][P0]
- [ ] Make webhook handler idempotent (dedupe by event id) [BACK][P0]
- [ ] Map Chargily statuses → internal Payment status [BACK][P0]
- [ ] Link successful payment → `POST /bookings/:id/confirm` (dep: 6.3) [BACK][P0]
- [ ] Apply the -1000 DA online-payment discount when generating the Chargily checkout amount (dep: 6.2) [BACK][P0]
- [ ] Calculate and store the `Commission` record on every confirmed booking, using **`Venue.commissionRate` (1–5%, set per-venue by Zwadj admin) snapshotted at booking time, applied to the venue's resolved base price only — never the services/prestations total** — **P0, not deferred**: this is the only revenue/GMV signal you have at launch [BACK][P0] (dep: 3.6 Commission model)
- [ ] `PATCH /admin/venues/:id/commission-rate` (protected endpoint for Zwadj to set/adjust a venue's rate) [BACK][P0]
- [ ] Implement refund execution via Chargily [BACK][P1]
- [ ] Generate invoice/receipt PDF (FR/AR) [BACK][P1]
- [ ] Write tests with Chargily sandbox + mocked webhooks (including duplicate/out-of-order delivery) [BACK][P0] — ⚠ **charges utiles capturées du bac à sable, jamais écrites à la main** ; la signature se vérifie contre une charge **réelle**, pas contre une chaîne fabriquée par le test
- [ ] **Idempotence PROUVÉE, pas déclarée** : tirer N fois le MÊME événement **en concurrence**, exiger **exactement une** transition d'état et **exactement une** notification [BACK][P0]
- [ ] **Webhook mince** : signature → déduplication → **mise en file pg-boss** → 200 rapide. Aucune logique métier dans le handler HTTP : un handler lent fait **retenter Chargily**, et une retentative multiplie les courses [BACK][P0]
- [ ] **Livraison sombre** : drapeau de fonctionnalité, `CASH` reste le seul chemin vivant jusqu'à la bascule [BACK][P0]
- [ ] **Réconciliation testée comme invariant** sur base réelle : au plus un `PAID` par réservation (index partiel existant), `Commission` dérivée par l'unique source d'arrondi, aucun `Payment` orphelin [BACK][P0]

> Deferred to post-MVP: CIB/SATIM/Edahabia direct integration (already covered by Chargily's aggregation), BaridiMob (separate merchant onboarding — see assumptions), installment payments, reconciliation reports, payout ledger.


---

## PHASE 8 — Notifications & communication

### 8.1 Infrastructure
- [ ] Create notification service abstraction (port/adapter — swappable provider) [BACK][P0]
- [ ] Integrate transactional email provider [BACK][P0] ⛔ *(D302 : à `HEAD`, `EmailModule` lie `DevLoggerEmailSender` SANS CONDITION, production comprise — audit sécu 09/09 · journaux, reports de D302. Le jeton du journal de DEV, lui, est arbitré (D294) et ne se rouvre pas.)*
- [ ] Configure SPF, DKIM, DMARC for the sending domain — **do this now**: the very first email (account verification) depends on it, and without it everything lands in spam [INFRA][P0]
- [ ] Create email template engine + layout (FR/AR, RTL) [BACK][P0]
- [ ] Use `pg-boss` (already installed, Phase 3) for the async send queue + retry/backoff — no separate BullMQ/Redis at MVP [BACK][P0]

### 8.2 Events — account & booking basics
- [ ] Email: verify account [BACK][P0]
- [ ] Email: reset password [BACK][P0]
- [ ] Email: booking confirmation (post-payment) [BACK][P0]
- [ ] Email: payment receipt [BACK][P1]
- [ ] Email: cancellation/refund notice [BACK][P1]

### 8.3 Events — request-to-book cycle (previously missing — this is what makes the model actually work)
- [ ] Pro notification: new booking request received [PRO][P0]
- [ ] Email to client: "your request was accepted — pay your deposit within [X] days" **with a deep link straight to the payment step** [BACK][P0]
- [ ] Email to client: "your request was declined" [BACK][P0]
- [ ] Email to client: "your request expired (no response from the venue)" [BACK][P0]

### 8.4 Events — visits & cashback
- [ ] Pro notification (message and/or email): new visit booked, with date/time [PRO][P0]
- [ ] Email to client: visit booking confirmation [BACK][P0]
- [ ] Email to client: visit cancelled by venue [BACK][P1]
- [ ] Email to client: cashback claim received / under review [BACK][P0]
- [ ] Email to client: cashback claim verified & paid [BACK][P0]
- [ ] Email to client: cashback claim rejected (with reason) [BACK][P1]

> Deferred to post-MVP: SMS (any channel), booking reminders (T-7/T-1), in-app notification center, notification preferences, web push.

---

## PHASE 9 — Frontend: Client app (Next.js, App Router, SSR/SSG)

### 9.1 Setup & shell
- [x] Wire `packages/ui`, `i18n` (next-intl), `types`, API client into the Next.js app [CLIENT][P0] — ✅ Lot 5, consolidé Lot 6 (`@zwadj/api-client` partagé avec le Pro, D18)
- [x] Configure App Router structure + locale segment (`/fr`, `/ar`) [CLIENT][P0] — ✅ squelette, renforcé Lot 5 (`dir` RTL réel vérifié au build)
- [~] Build header (...) [CLIENT][P0] — **partiel** : seul le volet état de session (marque, Connexion/Inscription ↔ compte+déconnexion) est livré (Lot 5). La vraie nav (Salles/Prestataires/etc.) est explicitement hors périmètre de la tranche Auth — appartient à la tranche Accueil/nav, pas encore commencée.
- [ ] Build a single reusable "Bientôt disponible / قريباً" page (FR/AR) [CLIENT][P0]
- [ ] Build footer [CLIENT][P1]
- [ ] Add global toast/notification host [CLIENT][P1]
- [x] Add auth context + protected routes — ⚠ **« middleware-based » est une hypothèse ERRONÉE, corrigée au Lot A11b** [CLIENT][P0] : contexte auth ✅ Lot 5 ; la protection est **côté client** parce que le middleware ne peut voir aucun signal de session (access token en mémoire D2, cookie refresh restreint au path `/api/v1/auth`). Première page protégée : `/compte` (A11b)
- [ ] Add scroll-restore on route change [CLIENT][P2]

### 9.2 Auth screens
> Each screen below must be responsive (mobile/tablet/desktop) and keyboard/focus-navigable (AA) **before it's considered done** — not as a separate pass at the end.
- [x] Register screen + validation [CLIENT][P0] — ✅ Lot 5
- [x] Login screen + validation [CLIENT][P0] — ✅ Lot 5
- [x] Email-verification screen [CLIENT][P0] — ✅ Lot 5 (gère lien ouvert connecté/non connecté, protection double-montage StrictMode)
- [x] Forgot/reset password screens [CLIENT][P0] — ✅ Lot 5 (état "lien tronqué sans token" géré explicitement)
- [x] Loading/error/success states for each [CLIENT][P0] — ✅ Lot 5

### 9.3 Home (SSG/ISR)
- [ ] Hero + structured search bar (place/date/guests/budget) [CLIENT][P0]
- [ ] Map placeholder: blurred Alger map background image + "Carte à venir / قريباً الخريطة" overlay (FR/AR) — no map library, no tile provider decision needed at MVP [CLIENT][P0]
- [ ] Featured venues grid + photo carousel (`next/image`) [CLIENT][P0]
- [ ] "How it works" / "Why Zwadj" sections [CLIENT][P2]

### 9.4 Search & filters (SSR)
- [ ] Results list bound to `GET /venues` (server-rendered) [CLIENT][P0]
- [ ] Map placeholder (same component as 9.3, above or beside the results list) [CLIENT][P0]
- [ ] Capacity slider filter [CLIENT][P0]
- [ ] Budget slider filter [CLIENT][P0]
- [ ] Amenities multi-select filter [CLIENT][P0]
- [ ] Sort control (recommended/price/rating) [CLIENT][P0]
- [ ] Reset filters [CLIENT][P1]
- [ ] Results count + empty/loading/error states [CLIENT][P0]
- [ ] URL-synced filter state (search params — natural fit for SSR) [CLIENT][P1]

### 9.5 Venue detail (SSG/ISR)
- [ ] Magazine gallery (5 photos) + lightbox [CLIENT][P0]
- [ ] Visite virtuelle Matterport : iframe montée **au geste utilisateur uniquement** (D45 — même principe que l'ancien viewer 360° envisagé), depuis `matterportModelId` du DTO public. Aucune bibliothèque de viewer à intégrer côté Zwadj (contrairement à Photo Sphere Viewer/Pannellum envisagés initialement) — Matterport sert son propre embed [CLIENT][P0]
- [ ] Rating/reviews count, capacity, base price [CLIENT][P0]
- [ ] Amenities icons [CLIENT][P0]
- [ ] Tabs: description / services / reviews [CLIENT][P1]
- [ ] Save ♥ button [CLIENT][P2]
- [ ] "Réserver une visite" button → visit slot picker (dep: 6.4) — separate CTA from the party-booking sticky panel [CLIENT][P0]
- [ ] Sticky booking panel → shows venue's slot templates → opens calendar [CLIENT][P0]

### 9.6 Calendar, quote & request submission (request-to-book, not instant-book)
- [ ] Slot selector: show available `SlotTemplate`s for the date/venue (not just a single day toggle) [CLIENT][P0]
- [ ] Dual-month calendar with per-date pricing [CLIENT][P0]
- [ ] Season color legend + cheapest-months strip [CLIENT][P1]
- [ ] Block past/fully-booked dates; show partially-available dates when in multi-slot mode [CLIENT][P0]
- [ ] Guest count selector (±, min/max) [CLIENT][P0]
- [ ] Service selection UI adapted per `pricingType`: checkbox for `fixed`, auto-computed total (× guests) for `per_guest`, tier radio-select for `tiered`, quantity stepper for `per_unit` — live total updates on every change [CLIENT][P0]
- [ ] Quote summary panel + deposit (30%) + TVA/fee breakdown [CLIENT][P0]
- [ ] Payment-method choice on the request form: "online (−1000 DA)" vs "cash on-site" — sets `Booking.paymentMethod`, informational only at request stage since payment happens after acceptance [CLIENT][P0]
- [ ] Request form (contact details) + validation [CLIENT][P0]
- [ ] Submit as **booking request** (not payment) — `POST /bookings` [CLIENT][P0]
- [ ] **CTA label must read "Envoyer la demande" (or equivalent), never "Procéder au paiement"** at this step — the quote screen submits a request, it never triggers Chargily checkout. A "Procéder au paiement" button here is a request-to-book regression (caught once already in a redesigned mockup) [CLIENT][P0]
- [ ] "Request sent" confirmation screen — explains the venue must accept before payment, and links to "Mes réservations" showing the request as "En attente" [CLIENT][P0]

### 9.7 Post-request client screens (previously missing)
- [ ] "My requests/bookings" page listing all statuses (pending, accepted, declined, expired, confirmed, cancelled) [CLIENT][P0]
- [ ] "My visits" page listing booked visit slots [CLIENT][P0]
- [ ] Request detail view showing current status + next action [CLIENT][P0]
- [ ] Payment step screen — reached only after a request is accepted (via email deep link or from "my requests") [CLIENT][P0] (dep: Phase 7)
- [ ] On the payment step: clear online-payment CTA showing the −1000 DA discount already applied [CLIENT][P0]
- [ ] On the payment step: "I'll pay cash on-site" path — explains the booking stays "accepted" until the venue confirms cash receipt, and shows the cashback-claim option [CLIENT][P0]
- [ ] Payment success screen (return from Chargily) → shows booking confirmed [CLIENT][P0]
- [ ] Payment failure screen (return from Chargily) → retry option, request stays "accepted" until paid [CLIENT][P0]
- [ ] Cashback claim form: upload receipt photo/file + submit (dep: 6.5) [CLIENT][P0]
- [ ] Cashback claim status view (pending review / verified / paid / rejected) [CLIENT][P1]

### 9.8 Other client pages
- [x] Account/profile — settings livrés au Lot A11b : `/{locale}/compte`, profil (`firstName`/`lastName`/`phone` sur `User`), e-mail, mot de passe (D42), demande de suppression. `robots: noindex`. Bookings/visits/cashback claims restent à faire [CLIENT][P1]
- [x] Rond à initiales + menu de compte dans l'en-tête (Lot A11b) — `AccountMenu` de `@zwadj/ui` réutilisé tel quel, **sans** « Ajouter une salle » [CLIENT][P0]
- [x] **Garde de session de `/compte` CÔTÉ CLIENT, pas middleware** [CLIENT][P0] — corrige l'hypothèse de 9.1 : l'access token vit en mémoire (D2) et le cookie refresh est restreint au path `/api/v1/auth`, le middleware ne voit AUCUN signal de session

### 9.9 Client cross-cutting
- [ ] Locale routing `/fr` `/ar` + hreflang tags [CLIENT][P0]
- [ ] Meta tags, sitemap, robots.txt, OG tags [CLIENT][P1]
- [ ] Code splitting per route (default with App Router — verify no accidental large client bundles) [CLIENT][P1]
- [ ] Image lazy-loading + responsive images via `next/image` [CLIENT][P1]

> Deferred to post-MVP: "Prestataires" vendor directory (shows "Bientôt" for now), Inspirations/magazine, "Mes outils" planning tools, "Communauté" forum, favorites, real interactive map (Leaflet + tile provider decision), multi-point guided 360° tour (Matterport/Kuula), PWA offline cache.

---

## PHASE 10 — Frontend: Pro app (React + Vite SPA)
> Each screen below must be responsive and keyboard/focus-navigable **before it's considered done** — not as a separate pass at the end.

- [x] Wire shared packages into pro app [PRO][P0] — ✅ Lot 6 (`@zwadj/api-client`, `@zwadj/i18n` via i18next, `@zwadj/ui`)
- [x] Pro auth + role-gated routing [PRO][P0] — ✅ Lot 6 (`RequireProSession` : anonyme→login, CLIENT connecté→écran de refus explicite D23, PRO→coquille protégée)
- [ ] Dashboard overview (bookings, revenue, KPIs) [PRO][P0]
- [ ] Booking requests inbox — list `pending` requests + status filters [PRO][P0]
- [ ] Request detail view + **accept/decline actions** [PRO][P0]
- [ ] Surface overlapping-pending-requests warning when viewing/accepting a request (dep: 6.2 overlap detection) — this is where the pro makes the manual call your booking model requires [PRO][P0]
- [ ] Handle accept failure cleanly (DB exclusion constraint rejected it — another request was already accepted for that slot) [PRO][P0]
- [ ] Calendar view of accepted/confirmed bookings, per slot [PRO][P0]
- [ ] Availability blocking UI [PRO][P0]
- [ ] Slot template editor (create/edit custom slots, pick from the 3 standard examples) [PRO][P0]
- [ ] Dynamic pricing rules editor [PRO][P1]
- [ ] **Service editor**: create a service, choose `pricingType` (fixed/per_guest/tiered/per_unit), fill price/tiers accordingly [PRO][P0]
- [ ] **Visit availability editor**: set day-of-week + time ranges dedicated to visits (dep: 6.4) [PRO][P0]
- [ ] "My visits" list — upcoming visit bookings, with client contact info to reach out on conflicts [PRO][P0]
- [ ] Walk-in booking creation form (creates as `confirmed` directly), **using the same service-picking UI as the client quote** (dep: 6.3) [PRO][P0]
- [ ] Client management view [PRO][P1]
- [ ] Revenue dashboard + commission breakdown — **commission rate shown read-only** (set by Zwadj admin, not editable by the pro) [PRO][P1]
- [x] Venue listing editor (info, amenities, bookingMode single/multi) [PRO][P0] — Lot A5 : liste + formulaire partagé création/édition FR/AR RTL, sélecteur ville en `<optgroup>`, suppression via `ConfirmDialog`, statut D33 optimiste avec revert. Volet **visite virtuelle Matterport** livré au Lot A6a (D45) ; volet **photos** reste à faire (à coder par-dessus la même page)
- [x] Media upload/manage UI — volet PHOTOS (upload, ordre ↑/↓, alt FR/AR) [PRO][P1] — ✅ **Lot A6a-P.** File d'upload SÉQUENTIELLE (ré-encodage sharp côté serveur), plafond compté AVANT de démarrer la file, échec unitaire non bloquant. Réordonnancement SÉRIALISÉ, sans état optimiste : l'ordre affiché ne change qu'au remplacement en bloc du tableau serveur, tout échec ⇒ refetch + « rafraîchis et réessaie ». Alt FR/AR : les DEUX champs partent toujours (`.strict()` + `.refine(len>0)` ⇒ un corps `{}` part en 400) et un champ vidé part en **`null`, jamais en `""`** (`optionalText` est `.trim().min(1)`). Suppression = 204 sans corps ⇒ **refetch obligatoire**, la couverture est re-résolue depuis l'état rechargé
- [x] **Correctif A6a-P-① — URL des médias relatives** [PRO][P0] — `publicUrl()` renvoie `/api/v1/media/<clé>` et son contrat dit « les fronts préfixent leur base API » : personne ne le faisait. Vite sert le Pro sur `:5173`, l'API écoute sur `:3001`, **sans proxy `/api`** ⇒ toutes les vignettes cassées, **y compris la couverture de la liste (défaut antérieur, A11a)**. `mediaSrc()` ne préfixe QUE le relatif — préfixer aveuglément casserait l'adapter S3/CDN de prod
- [x] **Même préfixage refait côté CLIENT** (`apps/client/src/lib/media-url.ts`, Lots A7/A8) [FRONT][P0] — **sans `remotePatterns` : `next/image` n'est PAS utilisé**, les vignettes sont déjà générées à la bonne taille par le pipeline A4 et un second ré-encodage n'apporterait rien

### A7 — Recherche SSR Client (livrée)
- [x] Route `/[locale]/salles`, rendue par le serveur, trois états DISTINCTS : résultats, zéro résultat, **API muette** — on ne dit pas « aucune salle » quand on n'en sait rien [FRONT][P0]
- [x] Filtres/tri/pagination **fonctionnels sans JavaScript** : `<form method="get">`, tri dans le formulaire, pagination en LIENS (un « charger plus » ne produit aucune URL indexable) [FRONT][P0]
- [x] `search-query.ts` PUR et testé à part : dinars ⇄ centimes, rejet des saisies non entières (pour qu'aucun 400 n'atteigne une page indexée), omission des valeurs par défaut dans l'URL (sinon contenu dupliqué), fenêtre de pagination bornée [FRONT][P0]
- [x] Placeholder carte « Carte à venir/قريباً » (décision produit n°2) [FRONT][P1]
- [ ] Tri « recommandé » — **volontairement NON fait** : absent de `VENUE_LIST_SORTS`, sans signal à consommer avant le Flux B ; l'ajouter rouvrirait le contrat A3 et sa requête SQL [BACK][P2]

### Flux B — Créneaux & tarification (B1 et B2 livrés, B3 à moitié)

**B1 — Créneaux de fête ✅**
- [x] Migration `slot_templates.base_price_cents` + `CHECK > 0`. D46 : le prix appartient au CRÉNEAU [BACK][P0]
- [x] CRUD pro `/venues/:id/slot-templates` ; les créneaux voyagent dans `VenueProDTO.slotTemplates` (patron des photos, aucun GET dédié) [BACK][P0]
- [x] 4 invariants dans la TRANSACTION : chevauchement (intervalles semi-ouverts — deux créneaux qui se touchent sont légaux), `SINGLE_SLOT` ⇒ exactement un actif, salle publiée jamais sans créneau, `venues.base_price_cents` recalculé [BACK][P0]
- [x] Suppression dure refusée dès qu'un devis/réservation référence le créneau (409 `SLOT_TEMPLATE_IN_USE`) — le retrait passe par `isActive: false` [BACK][P0]
- [x] Garde de publication admin : ≥ 1 créneau actif [BACK][P0]
- ⚠ **LEÇON** : j'avais plafonné `endMinutes` à 1440, ce qui **interdisait la soirée de mariage algérienne**. Le CHECK `slot_templates_minutes_valid` (posé en `20260707000001`) autorise 2880 et donne l'exemple « 20h→02h = 1200→1560 ». **Le schéma existant fait autorité sur une intuition.**
- ⚠ **LEÇON** : ma migration redéclarait une contrainte existante ⇒ `42710` au rejeu. **Grepper les migrations avant d'ajouter une contrainte nommée.**
- [ ] B4 devra DIRE au pro que le prix saisi à la création de la salle est écrasé dès le premier créneau, sinon il croira à un bug [PRO][P1]

**B2 — Moteur de prix ✅** (migration destructive relue par Ko)
- [x] `DELETE FROM pricing_rules` (table jamais utilisée) ; `multiplier_bps` → `price_cents` ABSOLU ; `slot_template_id` NOT NULL ; `CHECK > 0` [BACK][P0]
- [x] **FK COMPOSITE `(slot_template_id, venue_id)`** + clé candidate `UNIQUE (id, venue_id)` : sans elle une règle de la salle A pointerait un créneau de la salle B et le « à partir de » de A intégrerait un prix étranger. Prouvée en intégration [BACK][P0]
- [x] `pricing-engine.ts` PUR : `HOLIDAY > WEEKDAY > SEASON`, puis priorité, puis la plus récente, **puis l'`id`** — sans ce dernier départage, deux règles créées dans la même transaction donneraient un prix dépendant de l'ordre de lecture SQL, donc **un prix qui change tout seul entre l'affichage et le devis** [BACK][P0]
- [x] Il reçoit un `CalendarDay` déjà décomposé : extraire le jour de la semaine d'un `Date` choisirait un fuseau en silence, et un mariage du vendredi soir deviendrait un jeudi sur un serveur UTC [BACK][P0]
- [x] **UNE SEULE formule du « à partir de »**, `syncVenueBasePrice`, partagée par les deux services — minimum des créneaux actifs ET de leurs règles actives, sinon une promotion de basse saison ne se voit jamais en recherche [BACK][P0]
- [x] Type de règle NON modifiable ; champs requis dépendants du type (une règle muette se saisirait sans erreur puis ne s'appliquerait jamais) [BACK][P0]
- [x] `roundToDinar` écrite et testée mais **jamais appelée** : la résolution ne fait aucune arithmétique. Elle attend le premier calcul dérivé — **commission** [BACK][P1]
- [ ] B4 devra montrer au pro le **prix résolu par date**, pas seulement sa grille : c'est le seul moyen qu'il vérifie que « une seule règle gagne » produit ce qu'il croyait saisir [PRO][P1]

**B3 — Disponibilité 🟡**
- [x] `availability-engine.ts` PUR (13 tests). **Aucune migration nécessaire** : `AvailabilityBlock` + index GiST existent déjà [BACK][P0]
- [x] Tout en **millisecondes époque**, `dayStartMs` fourni par l'appelant ⇒ le fuseau se décide à la frontière, une seule fois. Fait marcher la soirée 20h→02h contre une réservation de la nuit suivante [BACK][P0]
- [x] `BLOCKED` > `BOOKED` > `REQUESTED` > `AVAILABLE`. `REQUESTED` ne verrouille rien mais est SIGNALÉ [BACK][P0]
- [x] Recouvrement HORAIRE, pas identité de créneau (walk-in sans `slotTemplateId`) ; `SINGLE_SLOT` ferme la journée sans écraser un `BLOCKED` [BACK][P0]
- [x] **`GET /venues/:slug/availability?from=&to=`** — **LIVRÉ (D48–D50)**. Fenêtre ≤ 92 jours rendus, dans les 18 mois de D46. C'est LÀ que le fuseau Algérie (UTC+1, sans heure d'été) se décide [BACK][P0]
- [x] Tests d'intégration de l'endpoint — **22 tests** [BACK][P0]
- [x] CRUD des **blocages pro** — **LIVRÉ (D51)**, 17 tests d'intégration. Verrou `SELECT … FOR UPDATE` sur `venues` : une contrainte `EXCLUDE` ne traverse pas deux tables, le conflit bloc↔réservation est applicatif [BACK][P0]
- [x] ~~⛔ **RESTE** — à l'acceptation d'une réservation : **attraper** `bookings_no_overlap_accepted_confirmed`, ne jamais la redoubler en code [BACK][P0]~~ ⛔ **PÉRIMÉE, BARRÉE LE 23/09/2026 (D303), CONFRONTÉE À `HEAD`** : la traduction existe — `isExclusionViolation` → 409 `BOOKING_SLOT_TAKEN` dans `acceptUnderVenueLock`, seul site qui écrit `ACCEPTED` ; depuis `909702a` (03/08), déplacée par S5b (`682ea4c`) ; mesurée en intégration, gardée par S5b-4. ⚠ La correction de F1 touche ce même `try/catch` : `ZWADJ_CONTINUITE.md`, cadrage du rang 23, § 9 et MD-F1-3.

**B4 / B5 / B6 — LIVRÉS**
- [x] **B4a** — les **9 méthodes** `@zwadj/api-client` (créneaux, règles, blocages) + 10 tests. ⚠ **B1, B2 et B3 avaient livré leurs endpoints sans AUCUNE contrepartie client** : vérifier la présence des méthodes fait désormais partie de la revue d'un lot API. [FRONT][P0]
- [x] **B4b** — volet créneaux + prix (`slots-section.tsx`). **D52 : l'heure de fin est DÉDUITE** — `<input type="time">` plafonne à 23:59 et ne peut pas dire « 02h du lendemain ». Fin ≤ début ⇒ +1440, et l'écran le DIT. [PRO][P0]
- [x] **B4c** — variantes de prix par créneau (`pricing-rules-editor.tsx`). **D53 : une saison PEUT enjamber décembre** (nov→fév) — aucune validation d'ordre côté écran, les mois couverts sont affichés. Type non modifiable, ordre de résolution ANNONCÉ (sinon le pro croit à un cumul). [PRO][P0]
- [x] **B4d** — volet blocages (`blocks-section.tsx`). **D54 : la date de fin est INCLUSIVE à l'écran**, exclusive dans l'API — « du 3 au 10 » doit bloquer le 10. [PRO][P0]
- [x] **B5** — calendrier client (prix par date × créneau, sélection). **D56 : semaine du DIMANCHE au samedi**, week-end vendredi-samedi. Le prix d'une case est le minimum des créneaux **réellement libres**. [FRONT][P0]
- [x] **B6** — calendrier de la salle côté PRO (l'écran du design), route `/salles/:id/calendrier`. **LECTURE SEULE**, consomme l'endpoint **public** : un endpoint pro parallèle finirait par répondre autrement et le pro verrait autre chose que ses clients. ⚠ La légende « Acompte reçu » du design appartient au **lot Réservations**, pas ici. [PRO][P0]
- [x] **UI-N1** — navigation principale du site client (`site-nav.tsx`). ⚠ `usePathname` DOIT venir de `../i18n/navigation` (rend `/salles`) et non de `next/navigation` (rend `/fr/salles`) : l'erreur casserait l'onglet actif **en arabe seulement**. [FRONT][P0]
- [x] **Dette de test soldée** — `apps/pro/src/test-support/client-doubles.ts` : `VenueProClient` était recopié dans **sept** fichiers, ~230 lignes supprimées. [FRONT][P1]

**Flux C — Visites (D47, D58, D59, D60 — C1/C2/C2b livrés)**
- [x] `VisitAvailability` / `VisitBooking` existaient DÉJÀ en base avec leurs `CHECK` : **C1 et C2 n'ont exigé AUCUNE migration**. Auto-confirmées, **aucune approbation pro**. [BACK][P0]
- [x] **C1 — plages hebdomadaires de visite, CRUD pro.** `POST` / `PATCH` / `DELETE /venues/:id/visit-availabilities[/:availabilityId]` + `GET /pro/venues/:id/visit-availabilities`. 15 tests d'intégration. [BACK][P0]
  - Chevauchement **refusé le MÊME jour seulement** (dimanche et lundi ne se rencontrent jamais) ; deux plages **bout à bout** (fin 12:00, début 12:00) sont **acceptées**. Refusé parce que C2 découpe les plages en créneaux : deux plages qui se recouvrent sortiraient le même rendez-vous deux fois.
  - La modification vérifie l'**état RÉSULTANT**, pas le patch : déplacer une plage d'une heure peut la faire tomber sur sa voisine sans qu'aucun champ envoyé ne le laisse voir.
  - ⚠ Une visite **ne franchit PAS minuit** (`CHECK` à **1440**), contrairement aux créneaux de fête (**2880**). Deux systèmes, deux bornes — le schéma fait autorité.
  - Les plages **ne voyagent PAS dans `VenueProDTO`** : D47 en fait un système à part avec son propre écran.
  - Suppression **DURE** : `VisitBooking` porte un `scheduledAt`, pas un `visitAvailabilityId` — retirer une plage n'annule aucun rendez-vous pris.
- [x] **C2 — découpage en créneaux + `GET /venues/:slug/visit-slots?from=&to=`** (public). `visit-slots-engine.ts` PUR, 13 tests unitaires + 10 d'intégration. [BACK][P0]
  - **D58 — une visite dure 30 minutes** (`VISIT_DURATION_MINUTES`), constante partagée, **jamais une colonne**. Une plage ne rend que des créneaux **ENTIERS** : 09:00→10:20 rend deux rendez-vous et s'arrête à 09:30.
  - Les visites **ignorent totalement les fêtes** : une salle louée toute la soirée du dimanche expose quand même ses créneaux de visite du matin (*testé*).
  - Le passé se filtre **à la MINUTE**, pas au jour : un rendez-vous de 09:00 n'a plus de sens à 14:00.
  - Un rendez-vous `CANCELLED` **libère** son créneau.
- [x] **C2b — exclusivité + canaux.** Migration `20260729000000_visits_exclusive_and_pro_channels`, 7 tests d'intégration. [BACK][P0]
  - ⚠ **D59 SUPERSÈDE D47** : le chevauchement n'est **plus toléré**. Index unique **PARTIEL** `visit_bookings_no_double_confirmed` sur `(venue_id, scheduled_at) WHERE status = 'CONFIRMED'`. Garanti **en base** — une vérification applicative laisse une fenêtre entre le test et l'insertion, et deux clients qui cliquent sur le même créneau à la même seconde sont le cas **probable**. Le filtre partiel est ce qui permet à une **annulation de LIBÉRER** le créneau.
  - Un créneau pris reste **RENDU**, marqué `taken`, plutôt que retiré : une liste qui se contracte donne l'impression que la salle ne fait pas de visites ce jour-là.
- [x] **D60 — canal de notification TRANCHÉ.** ~~⚠ canal SMS NON tranché~~ → `ProProfile.notifyByEmail` / `notifyBySms`, **deux booléens** (un enum `{EMAIL,SMS,BOTH}` exploserait dès le troisième canal). `CHECK pro_profiles_one_channel_required` **interdit de tout couper** — un pro sans canal ne verrait plus jamais une demande arriver. `NotificationChannel += SMS`, **transport WhatsApp** (ce que les pros algériens utilisent réellement), destinataire `ProProfile.phone`. [OPS][P0]
- [ ] ⛔ **C3 — PROCHAIN LOT : prise de rendez-vous par le client.** Auto-confirmée ; **409 si le créneau est pris** — la base le garantit déjà (D59), le service doit **traduire le `P2002`** en conflit propre et **jamais le redoubler** d'une vérification applicative ; notification du pro selon D60. Reste à concevoir : corps de la demande, annulation par le client, service d'envoi WhatsApp. [BACK][P0]
- [ ] ⚠ **À DÉCIDER AVANT C3** : fournisseur WhatsApp (API Cloud de Meta ? agrégateur local ?) et envoi **synchrone ou via pg-boss**. [OPS][P0]
- [ ] **C4 — écran pro des plages de visite** [PRO][P0]
- [ ] **C5 — écran client de prise de rendez-vous** [FRONT][P0]
- [ ] `@zwadj/api-client` n'a **aucune** méthode pour les visites : volontaire, elles appartiennent à C4/C5. Ne pas les inventer avant. [FRONT][P1]

### A8 — Détail salle Client (livré)
- [x] Route `/[locale]/salles/[slug]`, **rendu à la demande + `revalidate: 300`** (pas de `generateStaticParams` : interroger l'API au build ferait un site sans salles quand la CI tourne API éteinte) [FRONT][P0]
- [x] **404 HTTP** sur slug inconnu / non publiée / `HIDDEN` (D33) / API muette — jamais de soft-404 en 200 [FRONT][P0]
- [x] Bandeau `TEMPORARILY_UNAVAILABLE`, page entièrement consultable (D33) [FRONT][P0]
- [x] **iframe Matterport montée AU GESTE**, coût de données annoncé avant le clic, lien externe toujours rendu comme repli sans JS [FRONT][P0]
- [x] Galerie sans visionneuse JS (lien vers l'original) ; couverture en `loading="eager"` (LCP), suivantes en `lazy` ; alt du pro faisant foi [FRONT][P0]
- [x] CTA réservation/visite présents et réellement `disabled`, avec la raison écrite (Flux B/C) [FRONT][P0]
- [x] `generateMetadata` : titre, description (accroche du pro, jamais la description longue tronquée), image OG depuis la couverture [FRONT][P1]
- [ ] Page **404 bilingue** dédiée aux salles (aujourd'hui `_not-found` par défaut) [FRONT][P1]
- [ ] Données structurées schema.org sur le détail (backlog 23.8) [FRONT][P1]
- [x] Rond à initiales + menu de compte (Lot A11a) — `useDismissLayer` EXTRAIT de `ConfirmDialog` et partagé (un seul piège de focus dans le dépôt) ; `ConfirmDialog` recâblé dessus, ses tests A5 servant de filet de régression [PRO][P0]
- [x] Page « Configuration du compte » (Lot A11a) — profil (`businessName`/`phone`/`phone2`), e-mail, mot de passe (D42 : AUCUN champ « ancien » quand il n'en existe pas), demande de suppression (TROIS états, formulation verrouillée « validée par Zwadj ») [PRO][P0]
- [x] « Nouvelle salle » DÉPLACÉ de l'en-tête de liste vers le menu (A11a) — **mais conservé dans l'état vide** : un pro sans aucune salle ne doit pas deviner qu'il faut ouvrir un menu. Écart assumé, à confirmer [PRO][P0]
- [x] **Section « Visite virtuelle » (Lot A6a, D45)** — champ de saisie ID/URL Matterport, bouton « Enregistrer » et « Retirer la visite », lien « Ouvrir dans un nouvel onglet » (aucun aperçu embarqué au MVP, A6b annulé). **Section AUTONOME, hors du `<form>` principal** : son endpoint (`PATCH .../virtual-tour`) est distinct du PATCH général de la salle, donc son propre bouton — un submit imbriqué aurait fait partir deux requêtes sur une touche Entrée. À la création : renvoi textuel (même patron que les équipements), le champ n'existe qu'en édition [PRO][P0]

---

## PHASE 11 — Offline-first & synchronization (Pro) — **DEFERRED, POST-MVP**
> Not part of the MVP scope. Kept here for when the pro app's usage volume justifies it. Two cheap decisions to preserve now for free: UUIDv7 IDs (already an MVP invariant) and server-authoritative bookings (already an MVP invariant) — both make this phase easier to add later without a rewrite.

- [ ] Register Service Worker in pro app [PRO][P0]
- [ ] Precache app shell + static assets [PRO][P0]
- [ ] Runtime-cache GET API responses (stale-while-revalidate) [PRO][P0]
- [ ] Init IndexedDB stores (venues, bookings, syncQueue, txLog) [PRO][P0]
- [ ] Read path: serve bookings from IndexedDB when offline [PRO][P0]
- [ ] Write path: queue mutations with timestamp + version [PRO][P0]
- [ ] Online/offline status detection + UI indicator [PRO][P0]
- [ ] Sync trigger on reconnect [PRO][P0]
- [ ] Push queued changes to `POST /sync` [PRO][P0]
- [ ] Implement `POST /sync` server handler [BACK][P0]
- [ ] Implement `GET /sync` pull (since last sync) [BACK][P0]
- [ ] Conflict detection (server vs local timestamp/version) [PRO][P0] (dep: 3.7 AuditLog)
- [ ] Conflict resolution: last-write-wins for editable fields only [PRO][P0]
- [ ] Conflict resolution: BOOKINGS/AVAILABILITY are server-authoritative — reject the losing write, never LWW (prevents double-booking) [PRO][P0]
- [ ] Surface rejected-booking conflict to the pro with a clear resolution prompt [PRO][P0]
- [ ] Use client-generated UUIDv7 for offline-created bookings (no ID collision on sync) [PRO][P0] (dep: 4 UUID convention)
- [ ] Implement tombstones for offline deletes (sync deletions correctly) [PRO][P1]
- [ ] Maintain a per-device "last pulled at" cursor [PRO][P0]
- [ ] Conflict resolution: manual-merge UI [PRO][P1]
- [ ] Retry with exponential backoff on sync failure [PRO][P1]
- [ ] Write offline + conflict integration tests [PRO][P0]

---

## PHASE 12 — Back-office / Admin — **NO SEPARATE APP AT MVP**
> Decision: at MVP scale (a handful of venues in one city), a 4th application is unjustified surface area. Validation/publishing is done via protected API endpoints + direct DB access (DBeaver) for internal use. Revisit once volume or a non-technical team member needs a guided UI.

- [ ] `POST /admin/venues/:id/publish` — protected endpoint (already listed in 6.1) [BACK][P0]
- [ ] `PATCH /admin/venues/:id/reject` — protected endpoint, sets back to draft with a reason [BACK][P1]
- [ ] `PATCH /admin/venues/:id/commission-rate` — protected endpoint (already listed in Phase 7) [BACK][P0]
- [ ] `POST /admin/cashback-claims/:id/verify` and `/pay` — protected endpoints (already listed in 6.5) [BACK][P0]
- [ ] Admin role + guard reused from Phase 5 RBAC (no separate admin auth system) [BACK][P0]
- [ ] Document the DBeaver-based workflow for internal use (which tables, which fields to check before publishing, verifying cashback claims) [SHARED][P1]

> Deferred to post-MVP (build a real `apps/admin` only if/when justified): users management UI, review moderation queue UI, dispute/refund handling UI, promo-code management, editorial CMS, BI/KPI dashboards, audit-log viewer.

---

## PHASE 13 — Security

- [ ] Enforce HTTPS + HSTS [INFRA][P0]
- [ ] Set secure headers (CSP, X-Frame-Options, etc.) [BACK][P0]
  ⛔ *(D302, 23/09/2026 : toujours absents de l'application — l'audit sécu du 09/09 le relève (contrôles 13, 16,
  17), et à `HEAD` : **0** occurrence de HSTS, CSP, nosniff, anti-encadrement, Referrer-Policy ou
  Permissions-Policy dans `app.setup.ts`, `main.ts`, `next.config.ts`, `vite.config.ts`, et pas de `helmet`. Une
  CSP doit rester compatible avec le script de thème, Google GIS et Matterport (audit). **Pas d'entrée neuve** :
  celles-ci suffisent. Des URL `http://` passent en production : « invariants de production », reports de D302.)*
- [ ] Sanitize/escape all user-rendered content (XSS) [SHARED][P0]
- [ ] CSRF protection for cookie-based flows [BACK][P0]
- [ ] Parameterized queries / ORM only (no raw concat) [BACK][P0]
- [ ] Global + per-endpoint rate limiting [BACK][P0] ⛔ *(D302 : présent, mais stockage mémoire du processus, confiance du proxy non configurée, et `@SkipThrottle` dans cinq contrôleurs à `HEAD` — audit sécu 09/09 · divers, 2 ; reports de D302.)*
- [ ] Brute-force/lockout on login [BACK][P1]
- [ ] Secrets management (env/secret store, no secrets in repo) [INFRA][P0]
- [ ] Encrypt sensitive fields at rest [BACK][P1]
- [ ] Payment anti-fraud checks (amount/idempotency) [BACK][P1]
- [ ] Input validation on every endpoint [BACK][P0]
- [ ] Write audit-log entries on sensitive actions [BACK][P1]
- [ ] Dependency vulnerability scanning in CI [INFRA][P1] ⛔ *(D302 : `pnpm audit` rejoué à la main le 23/09/2026 — 55 avis, 53 GHSA, pièces `docs/preuves/D302/dependances/` ; aucun scan en CI. Reports de D302, « audit sécu 09/09 · dépendances ».)*
- [ ] File-upload validation (type/size/scan) [BACK][P1]

---

## PHASE 14 — Legal compliance (Algeria)

- [ ] Map data flows for Law 18-07 compliance [SHARED][P1]
- [ ] Draft Terms of Service (FR/AR) [SHARED][P1]
- [ ] Draft Privacy Policy (FR/AR) [SHARED][P1]
- [ ] Cookie/tracking consent banner + storage [CLIENT][P1]
- [ ] Implement data export (access right) [BACK][P2]
- [ ] Implement account/data deletion (erasure right) [BACK][P2]
- [ ] Reconcile soft-delete vs erasure: anonymize (not delete) records tied to financial/legal retention [BACK][P2]
- [ ] Draft cancellation & payment terms [SHARED][P1]
- [ ] Add consent checkboxes at registration/booking [CLIENT][P1]

⛔ *(D302, 23/09/2026 : l'audit sécu du 09/09 — contrôle 30 — relève, et c'est vrai à `HEAD` : pages `cgu` et
`confidentialite` réduites à « Bientôt disponible » ; la case d'acceptation de `register-form.tsx` n'est pas
transmise à l'API, sans version du texte ; l'anonymisation d'un compte ne touche pas les instantanés de contact des
réservations. Entrées de D302 : « audit sécu 09/09 · divers », 5, et « · conformité ». L'applicabilité du RGPD ou
du CCPA dépend de l'exploitant et des marchés visés — l'audit ne la tranche pas ; « l'absence d'une bannière
cookies n'est pas à elle seule une preuve de non-conformité » (audit).)*

---

## PHASE 15 — Testing & quality

- [ ] Configure unit test runner (Vitest/Jest) per app [SHARED][P0]
- [ ] Backend unit tests (services, pricing, state machine) [BACK][P0]
- [ ] Backend integration tests (auth, booking, payment webhook) [BACK][P0]
- [ ] Frontend component tests (Client) [CLIENT][P1]
- [ ] Frontend component tests (Pro) [PRO][P1]
- [ ] E2E setup (Playwright) [SHARED][P1]
- [ ] E2E: full request-to-book flow — client requests → pro accepts → client pays via Chargily sandbox → confirmed [CLIENT][P0]
- [ ] E2E: pro walk-in booking [PRO][P1]
- [ ] Concurrency test: two simultaneous "accept" calls on overlapping pending requests → exactly one succeeds (dep: 3.4 exclusion constraint) [BACK][P0]
- [ ] Test: pro walk-in booking + client accepted-but-unpaid request on an overlapping slot → walk-in wins if it locks first, the pending request's later accept is cleanly rejected [BACK][P0]
- [ ] Test: replayed/duplicate `POST /bookings` (same idempotency key) creates one booking [BACK][P0]
- [ ] Test: duplicate/out-of-order Chargily webhook delivery doesn't double-confirm or double-count commission [BACK][P0]
- [ ] Load test critical endpoints (search, availability) [BACK][P1]
- [ ] Security test pass (auth, injection, rate limit) [BACK][P1]
- [ ] Accessibility automated checks (axe) [SHARED][P1]
- [ ] **D43 — les deux volets que `axe` ne teste PAS** [SHARED][P1] — ⚠ le volet **contraste** est propre : le champ prix n'apparaît pas dans la référence. Restent en dette **visuelle** l'**anneau de focus au clavier** et le **placement de l'unité en RTL**. `color-contrast` ne couvre ni l'un ni l'autre — les fermer demande un contrôle humain ou un test de focus dédié
- [x] FR/AR + RTL visual regression checks [SHARED][P1] — ✅ **T4/D124** : pas de captures d'écran (les pixels diffèrent entre Windows et Linux, et un diff de pixels ne dit pas QUOI a bougé). Contrat des **valeurs résolues** des variables CSS, lues après cascade dans le navigateur, 2 apps × 2 thèmes + RTL. Divergences légitimes entre thèmes **gelées** dans `e2e/baselines/tokens-divergents.json`
- [x] **Programme qualité T1 → T4 CLOS** [SHARED][P0] — vérifié par Ko sous Windows : **33 passés, 1 ignoré, 0 échec** en 2,5 min. Compteurs : 808 unitaires, **398** intégration, **34** e2e / 6 fichiers, i18n 844 = 844
- [ ] **Dette d'accessibilité — 19 catégories, priorisée** [SHARED][P1] (dep: T4/D125) — ⚠ **70 nœuds axe = 19 problèmes** ; deux causes pèsent 54 nœuds. Zéro violation ARIA / `label` / `button-name` / `link-name` / `image-alt` / `tabindex` : la dette est **entièrement** du contraste. Ordre de rendement : **(1) 34 nœuds** `opacity: 0.55` sur `.site-nav-link.is-soon` — un `<span>`, non focusable, correction purement chromatique, fichier **partagé** donc à vérifier via D124 ; **(2) 24 nœuds** texte secondaire des cartes salle ; **(3)** 4 paragraphes d'aide + 3 titres `h2` sombres + 3 panneau de filtres + 1 `.field-hint`. ✅ `.alert` du compte client **fermé par D129**
- [x] Accessibilité automatisée (contraste D43, focus clavier, ARIA) [SHARED][P1] — ✅ **T4/D125** : `@axe-core/playwright`, 10 écrans, 2 thèmes, page arabe RTL avec vérification du `dir`, 11 règles ciblées. Remplace le contrôle « à l'œil » de D43/D44. ⚠ Les manquements connus sont **gelés** dans `e2e/baselines/a11y.json` — exiger zéro d'entrée rendrait le test rouge à la livraison, et « rouge = régression » doit rester vrai
- [x] Socle e2e Playwright + concurrence/montage React [SHARED][P0] — ✅ **T1/D118** : `e2e/` à la racine, pile dédiée (ports 3101/3100/5273, base `zwadj_e2e`), A1 bootstrap de session, A2 un appel par montage, A5 parité navigation interne/rechargement. **À la demande, pas une septième porte.** Vérifié par Ko sous Windows : 16 passés, 1 ignoré, 0 échec
- [x] Migration testée sur base NON VIDE [BACK][P0] — ✅ **T3/D123** : `migration-non-empty.int-spec.ts`. ⚠ Applique le SQL directement (`prisma migrate deploy` sort en succès **sans rien appliquer** quand le schema-engine est absent)
- [ ] Seed deterministic test data + factories [SHARED][P1]
- [x] ~~Élargir le `testTimeout` de `apps/api` (5 s par défaut) [BACK][P1] — argon2 à
      m=64MiB/t=3/p=4 et sharp le frôlent sous charge ; quatre faux rouges observés lors
      de l'intégration d'A10. Correctif de configuration séparé, à mesurer avant de
      choisir la valeur~~ — ⛔ **PÉRIMÉE LE 01/09/2026, BARRÉE AVEC SON MOTIF, PAS
      SUPPRIMÉE.** Une décision dont la raison a été invalidée se corrige ; effacée, elle
      serait rouverte de bonne foi comme une piste neuve.
      ⛔ **Motif du retrait, en deux points** : (1) élargir le budget **masquerait un test
      devenu lent** au lieu de le montrer ; (2) la campagne du 01/09 a établi que **le
      budget n'est pas la cause** — au repos le test le plus lourd tient dans environ un
      treizième des 5 000 ms, et le rouge exige un facteur d'environ 55×, c'est-à-dire de
      la CONTENTION. Un budget élargi déplacerait le seuil sans toucher à ce qui le
      franchit.
      ⚠ Ce qui remplace cette piste : sortir de la suite unitaire ce qui paie le KDF réel
      (lot argon2, fait) et traiter la contention de la porte unitaire dans son ensemble
      (lot sharp, ci-dessous).
- [x] Configurer `server.deps.inline: ["next-intl"]` dans `apps/client/vitest.config.ts` [CLIENT][P0] — next-intl est publié en ESM et importe `next/navigation` SANS extension ; hors résolveur Vite, toute suite montant un composant qui touche `src/i18n/navigation` NE SE CHARGE PAS. Découvert en A11b, premier test client à monter un `Link` localisé

> Deferred to post-MVP: offline/sync/conflict tests (Phase 11 is deferred).

---

## PHASE 16 — i18n/localization final validation

- [ ] Audit all strings extracted (no hardcoded text) [SHARED][P0]
- [ ] Complete FR translations [SHARED][P0]
- [ ] Complete AR translations [SHARED][P0]
- [ ] RTL visual check on every screen [SHARED][P0]
- [ ] Verify DZD/date/number formats per locale [SHARED][P1]
- [ ] Verify bilingual emails/SMS/invoices [SHARED][P1]

---

## PHASE 17 — DevOps & infrastructure

- [ ] Write Dockerfile for API [INFRA][P0]
- [ ] Write Dockerfiles for client/pro/admin builds [INFRA][P1]
- [ ] Write docker-compose for local dev (api, db) [INFRA][P0]
- [ ] Define env var schema per environment [INFRA][P0]
  ⛔ *(D302, 23/09/2026 : PARTIELS à `HEAD`, cases laissées telles quelles. Le compose existe — montage PG18 corrigé
  par D292 ; il publie `5432` et crée la base par le superutilisateur de l'image. Le schéma existe
  (`config/env.ts`, `PROD_REQUIRED_EXPLICIT`) mais n'exige en production que la PRÉSENCE. Reports de D302 :
  « audit sécu 09/09 · invariants de production » et « · base ».)*
- [ ] CI: install + lint + typecheck + test on PR [INFRA][P0]
- [ ] CI: build all apps [INFRA][P0]
- [ ] CI: run DB migrations check [INFRA][P1]
- [ ] CD: deploy API to staging on merge [INFRA][P1]
- [ ] CD: deploy frontends to staging [INFRA][P1]
- [ ] CD: production deploy (manual approval) [INFRA][P1]
- [ ] Configure CDN + media bucket [INFRA][P1]
- [ ] Configure reverse proxy / load balancer + TLS [INFRA][P1]
- [ ] Add feature-flag mechanism [INFRA][P2]
- [ ] Define rollback procedure [INFRA][P1]
- [ ] DB migration deploy strategy (zero-downtime) [INFRA][P1]

---

## PHASE 18 — Observability

- [ ] Integrate Sentry (frontend ×3 + API) [INFRA][P1]
- [ ] Centralized structured logging + aggregation [INFRA][P1]
- [ ] Metrics (request rate, latency, error rate) [INFRA][P1]
- [ ] Dashboards (API, DB, queues) [INFRA][P2]
- [ ] Alerting rules (error spikes, downtime, queue backlog) [INFRA][P1]
- [ ] Uptime/health monitoring [INFRA][P1]
- [ ] Privacy-respecting product analytics + funnels [INFRA][P2]

---

## PHASE 19 — Backup & disaster recovery

- [ ] Automated daily DB backups [INFRA][P0]
- [ ] Object-storage backup/versioning [INFRA][P1]
- [ ] Test restore from backup [INFRA][P1]
  ⛔ *(D302, 23/09/2026 : toujours rien au dépôt — audit sécu 09/09, contrôle 29 : « un volume persistant n'est pas
  une sauvegarde ». Reports de D302, « audit sécu 09/09 · base ».)*
- [ ] Define retention/archiving policy [INFRA][P2]
- [ ] Write business-continuity/DR runbook [INFRA][P2]

---

## PHASE 20 — Documentation

- [ ] Architecture overview + ADR index [SHARED][P1]
- [ ] API docs published (OpenAPI/Swagger UI) [BACK][P1]
- [ ] Developer onboarding guide (run locally) [SHARED][P1]
- [ ] Operational runbooks (deploy, rollback, incidents) [INFRA][P2]
- [ ] User/support help docs (FR/AR) [SHARED][P2]
- [ ] Data model diagram [DB][P2]

---

## PHASE 21 — Pre-launch & launch

- [ ] Full QA regression on staging [SHARED][P0]
- [ ] External/security audit pass [SHARED][P1]
- [ ] Performance audit (Core Web Vitals, API latency) [SHARED][P1]
- [ ] SEO basics (meta, sitemap, robots, OG tags) [CLIENT][P1]
- [ ] Load production seed (real venues/cities) [DB][P1]
- [ ] Production data migration dry-run [INFRA][P1]
- [ ] Go-live checklist sign-off [SHARED][P0]
- [ ] DNS cutover + TLS verification [INFRA][P0]
- [ ] Production deploy [INFRA][P0]
- [ ] Post-deploy smoke tests [SHARED][P0]

---

## PHASE 22 — Post-launch & maintenance

- [ ] Set up support/ticketing channel [SHARED][P1]
- [ ] Monitor errors/alerts daily (first weeks) [INFRA][P1]
- [ ] Hotfix process defined [SHARED][P1]
- [ ] Scheduled dependency/security updates [INFRA][P1]
- [ ] Collect & triage user feedback [SHARED][P2]
- [ ] Roadmap: multi-wilaya / multi-city expansion [SHARED][P2]
- [ ] Roadmap: native mobile / enhanced PWA [SHARED][P3]
- [ ] Roadmap: AI wedding assistant [SHARED][P3]

---

## PHASE 23 — Aspects missed in earlier rounds (coverage audit)

> These are not refinements — several are core marketplace pillars that were absent. Grouped by theme; slot each into the phase noted.

### 23.1 Two-sided marketplace & cold-start (was entirely missing)
- [ ] Venue-owner self-onboarding wizard (signup → listing → KYC → publish) [PRO][P0]
- [ ] Listing-completeness score + guidance to improve it [PRO][P1]
- [ ] "Claim your venue" flow (pre-seeded listing → owner takes over) [PRO][P2]
- [ ] Bulk venue import tool (CSV/admin) to seed initial supply [ADMIN][P1]
- [ ] Supply-side acquisition landing page (for venue owners) [CLIENT][P2]
- [ ] Empty-state onboarding tours for first-time pros [PRO][P2]

### 23.2 Client ↔ venue messaging & booking-request model (was missing)
- [ ] Pre-booking inquiry/message thread (client ↔ venue) [BACK][P0]
- [ ] Inquiry inbox UI (client) [CLIENT][P1]
- [ ] Inquiry inbox UI (pro) [PRO][P1]
- [ ] Decide & implement request-to-book vs instant-book per venue [BACK][P0]
- [ ] Pro accept/decline booking-request flow + expiry [PRO][P0]
- [ ] Off-platform contact/payment leakage mitigation (mask contact pre-booking) [BACK][P1]
- [ ] Message moderation + report-abuse on threads [ADMIN][P2]

### 23.3 Calendar interoperability & slot granularity (interacts with double-booking)
- [ ] Define booking granularity: full-day / evening / half-day + buffers [BACK][P0]
- [ ] Setup/teardown buffer + same-day turnaround logic [BACK][P1]
- [ ] Multi-day booking support [BACK][P2]
- [ ] iCal export of venue availability [PRO][P1]
- [ ] iCal/Google calendar import (block external bookings) [PRO][P1]
- [ ] Reconcile external-source bookings with server-authority rule [BACK][P1] (dep: 11)

### 23.4 Media pipeline (was only "upload")
- [ ] Image processing: resize + thumbnails on upload [BACK][P0]
- [ ] Serve modern formats (WebP/AVIF) via CDN transforms [INFRA][P1]
- [ ] Strip EXIF/GPS metadata from uploaded photos (privacy) [BACK][P1]
- [ ] Video upload + transcoding (venue tours) [BACK][P3]
- [x] ~~360° virtual-tour asset storage + viewer wiring [BACK][P3]~~ **SANS OBJET, D45** : Matterport héberge lui-même le scan, Zwadj ne stocke qu'un identifiant (`Venue.matterportModelId`)
- [ ] Image moderation (block explicit/irrelevant) [ADMIN][P2]

### 23.5 Money-safety edge cases (beyond happy path)
- [ ] Orphaned-payment recovery: paid but booking failed → auto-refund/reconcile [BACK][P0]
- [ ] Webhook dead-letter queue + manual reprocessing [BACK][P1]
- [ ] Sequential, gapless invoice numbering (Algerian legal requirement) [BACK][P1]
- [ ] Display TVA (19%) + platform/service fee breakdown to client [BACK][P0]
- [ ] Quote expiration (price snapshot valid until T) [BACK][P1]
- [ ] Partial-refund handling + refund status tracking UI [BACK][P1]
- [ ] Downloadable revenue statements/exports for venues (accounting) [PRO][P2]

### 23.6 Account & admin security hardening (was thin)
- [ ] MFA/2FA for admin & super-admin accounts [ADMIN][P0] ⛔ *(D302 : absent à `HEAD` — audit sécu 09/09, contrôle 12 ; reports de D302, « audit sécu 09/09 · divers », 3.)*
- [ ] Optional 2FA for pro accounts [PRO][P1]
- [ ] Active-sessions list + "log out everywhere" [SHARED][P2]
- [ ] Phone OTP verification (primary contact in Algeria) [BACK][P1]

### 23.7 Communications deliverability (emails will hit spam without this)
- [ ] Configure SPF / DKIM / DMARC for sending domain [INFRA][P0]
- [ ] Bounce + complaint handling, suppression list [BACK][P1]
- [ ] `List-Unsubscribe` header + working unsubscribe link [BACK][P1]
- [ ] Arabic SMS UCS-2 encoding + segment/cost handling [BACK][P1]
- [ ] Register SMS sender ID [INFRA][P2]

### 23.8 Discoverability & SEO depth (organic acquisition)
- [ ] Locale-prefixed routing (`/fr`, `/ar`) + hreflang tags [CLIENT][P1]
- [ ] Programmatic per-city & per-venue landing pages [CLIENT][P1]
- [ ] schema.org structured data (LocalBusiness/Event/Review) [CLIENT][P1]
- [ ] Saved searches + availability/price-drop alerts [BACK][P2]
- [ ] Define & implement the "recommended" ranking algorithm [BACK][P1]

### 23.9 Localization & cultural depth (Algeria-specific)
- [ ] Phone number normalization/validation (+213, libphonenumber) [SHARED][P0]
- [ ] Map pin-drop + reverse geocoding during venue creation [PRO][P1]
- [ ] Address validation/normalization [BACK][P2]
- [ ] Hijri/Islamic calendar awareness (Ramadan, religious dates) in calendar [CLIENT][P2]
- [ ] MSA vs Darija copy review for AR strings [SHARED][P2]

### 23.10 Accessibility depth (palette contrast is a real risk regardless of the pivot)
- [ ] Validate WCAG AA contrast of the current zinc + raspberry (`#C81E63`) palette on all text/background pairs; adjust tokens if failing [SHARED][P0]
- [ ] `prefers-reduced-motion` support for animations [CLIENT][P1]
- [ ] Skip-to-content links [SHARED][P2]
- [~] Announce form errors to screen readers (aria-live) [SHARED][P1] — partiel : bandeaux `role="alert"`/`role="status"` sur les écrans A11a/A11b, `role="status" aria-live="polite"` sur `BrandLoader`. Audit systématique restant
- [ ] Publish accessibility statement [SHARED][P3]

### 23.11 Privacy & legal depth (beyond policy text)
- [ ] Maintain data-processing register (Law 18-07) [SHARED][P2]
- [ ] Sign DPAs/sub-processor agreements (email, SMS, payment, hosting) [SHARED][P1]
- [ ] Breach-detection + notification procedure [SHARED][P2]
- [ ] Gate analytics/scripts behind consent (no firing pre-consent) [CLIENT][P1]
- [ ] Terms/policy versioning + re-consent on change [BACK][P2]
- [ ] Generate booking agreement/contract PDF (distinct from invoice) [BACK][P2]

### 23.12 Ops, scale & data-safety depth
- [ ] DB connection pooling (PgBouncer) [INFRA][P1]
- [ ] Scheduled/cron job framework (reminders, hold expiry, statements) [BACK][P1]
- [ ] Secrets rotation policy + procedure [INFRA][P2]
- [ ] Define analytics event taxonomy / tracking plan [SHARED][P2]
- [ ] Public status page + incident communication [INFRA][P2]
- [ ] Define SLOs + error budgets [INFRA][P3]
- [ ] Read replicas plan (post-scale) [INFRA][P3]
- [ ] "Unsynced changes" warning before logout/cache clear (pro offline data-loss) [PRO][P0]
- [ ] Keep booking/pricing rules in shared/backend only — prevent Client/Pro logic drift [SHARED][P0] ⛔ *(D302 : la dérive existe — `previewDeposit`, `lineTotal` ; audit SOLID 09/09 · A3, et le relecteur (chat) a décidé qu'elle BLOQUE l'ajout de tout nouveau type de tarification de prestation. Reports de D302.)*

---

## PHASE 24 — Further gaps (commercial, scope & resilience audit)

> At this depth most remaining items are either business-model decisions or specialized/secondary concerns. The ones below are still genuine gaps, not padding.

### 24.1 Platform monetization & growth (only per-booking commission was contemplated)
- [ ] Featured/promoted listings (paid placement) — model, ranking boost, billing [BACK][P2]
- [ ] Venue subscription tiers (free/premium) + entitlements [BACK][P2]
- [ ] Billing for subscriptions/promotions (recurring) [BACK][P2]
- [ ] Referral program (client invites) + reward tracking [BACK][P3]
- [ ] Lifecycle/marketing email (consent-based, separate from transactional) [BACK][P2]
- [ ] Newsletter/campaign tooling or ESP integration [BACK][P3]

### 24.2 Booking scope gaps
- [ ] Decide: do vendors transact on-platform (booked + paid) or listings-only? [BACK][P0]
- [ ] If vendors transact: parallel vendor booking + payment + payout flow [BACK][P2] (dep: 24.2 decision)
- [ ] Decide supported event types (wedding only vs khtana/engagement/birthday) [BACK][P1]
- [ ] Venue-initiated cancellation flow (refund + compensation + re-accommodation) [BACK][P1]
- [ ] No-show handling (client or venue) + policy [BACK][P2]
- [ ] Security/damage deposit (caution) collection, hold & release [BACK][P1]
- [ ] E-signature on booking agreement/contract [BACK][P2]

### 24.3 Dispute resolution process & payouts/KYB
- [ ] Dispute initiation by client/venue (reason, status) [BACK][P1]
- [ ] Evidence upload + mediation thread for disputes [BACK][P2]
- [ ] Dispute outcomes → refund/payout adjustments [BACK][P2]
- [ ] Collect venue bank/payout details (KYB) + verification [BACK][P1]
- [ ] Payout scheduling + disbursement runs + statements [BACK][P2]
- [ ] Hold/escrow funds until event completed (chargeback protection) [BACK][P2]

### 24.4 Reliability & third-party resilience
- [ ] Circuit breakers + timeouts on payment/SMS/email/maps calls [BACK][P1]
- [ ] Graceful degradation when a provider is down (queue/fallback/clear messaging) [BACK][P1]
- [ ] Maintenance-mode page + toggle [INFRA][P1]
- [ ] Choose/configure a map tile provider (OSM usage policy / own tiles) [INFRA][P1]
- [ ] Cloud + third-party API cost monitoring & budget alerts (SMS, tiles) [INFRA][P2]
- [ ] Quota/backpressure on cost-bearing third-party calls [BACK][P2]

### 24.5 Offline durability (critical for offline-first Pro)
- [ ] IndexedDB schema versioning + migration for existing pro devices [PRO][P0]
- [ ] Sync-contract versioning (old clients must not break or lose data) [PRO][P0]
- [ ] Forced-update path when offline client is too old to sync safely [PRO][P1]

### 24.6 Market-specific performance (Algeria: low-end Android, slow networks)
- [ ] Performance budget for low-end devices + 3G/slow networks [SHARED][P0]
- [ ] Test on representative low-end Android + throttled network [CLIENT][P1]
- [ ] Data-saver / reduced-image-quality mode [CLIENT][P2]
- [ ] Minimize bundle size + measure against budget in CI [SHARED][P1]

### 24.7 Security maturity (beyond baseline)
- [ ] WAF + DDoS protection [INFRA][P1]
- [ ] SAST + DAST in CI (distinct from dependency scan) [INFRA][P1]
- [ ] Secrets scanning in repo/CI (gitleaks) [INFRA][P1]
- [ ] `security.txt` + responsible-disclosure policy [INFRA][P2]
- [ ] Suspicious-login detection + alert email [BACK][P2]
- [ ] Admin "impersonate user" for support — with mandatory audit log [ADMIN][P2]
- [ ] Periodic penetration test scheduling [SHARED][P2]

### 24.8 Engineering governance & QA depth
- [ ] Definition of Done + PR template + code-review checklist [SHARED][P1]
- [ ] Issue templates (bug/feature) [SHARED][P2]
- [x] Contract tests between front-ends and API (shared types drift) [SHARED][P1] — ✅ **T3/D122** : `contract-api-client.int-spec.ts`. Chemins appelés par `@zwadj/api-client` confrontés au routeur Nest (les deux côtés **dérivés**, rien de recopié) + formes gelées sur le fil, écart contrôlé **dans les deux sens** (un champ en trop est une fuite, un champ manquant casse le client). ⚠ TypeScript accepte qu'une ligne Prisma porte **plus** de champs que le DTO : un `select` élargi passe le typecheck et part quand même sur le fil. ⚠ **`apps/client/src/lib/api.ts` n'est PAS couvert** — hors du paquet, 8 `as` non validés sur des `fetch` SSR. ⚠ 4 chemins concaténés multi-lignes échappent au contrôle, nombre **gelé**
- [ ] Anonymize/scrub PII in staging data [INFRA][P1]
- [ ] Synthetic monitoring of critical prod flows (booking, payment) [INFRA][P1]
- [ ] Changelog + release notes process [SHARED][P2]
- [ ] On-call rotation + incident roles [INFRA][P2]
- [ ] Access management: onboarding/offboarding of team credentials [INFRA][P2]
- [ ] Durcir la règle d'auto-contrôle des zips de livraison [SHARED][P0] — contrôler la présence des fichiers NEUFS ne suffit pas : A10 et A11 ont été livrés amputés de TOUS leurs édits aux fichiers pré-existants, et l'auto-contrôle est passé au vert. Le contrôle doit porter sur un motif présent dans un fichier que le lot devait MODIFIER
- [ ] Inscrire `git status --short` immédiatement après chaque extraction de zip dans la Definition of Done d'intégration [SHARED][P0] — tout fichier modifié hors du périmètre annoncé est un retour en arrière silencieux. Les zips de Opus sont des instantanés complets construits sur SA base : ils réécrivent les correctifs locaux. Observé sur A11a (2 fichiers) puis A11b (6 fichiers)

### 24.9 Regulatory & financial registration (Algeria)
- [ ] Verify e-commerce/online-payment regulatory requirements (DZ) [SHARED][P0]
- [ ] Business + tax registration prerequisites for collecting payments [SHARED][P0]
- [ ] Confirm e-invoicing/fiscal mandates + retention periods [SHARED][P1]
- [ ] Document PCI-DSS scope (provider-hosted) + SAQ if required [SHARED][P1]
- [ ] Check commercial-communication language requirements (AR) [SHARED][P2]

### 24.10 Content, UGC & i18n edge cases
- [ ] Bidi handling: mixed AR/Latin text, numbers, venue names [SHARED][P1]
- [ ] Optional auto-translation of reviews/UGC across FR/AR [BACK][P3]
- [ ] Profanity/spam filter on UGC (reviews, messages, forum) [BACK][P2]

---

## Task totals (approx.)

| Phase | Tasks |
|---|---|
| 0 Pre-project | 16 |
| 1 Repo & tooling | 27 |
| 2 Shared foundations | 42 |
| 3 Database | 45 |
| 4 Backend foundations | 16 |
| 5 Auth/RBAC/KYC | 38 |
| 6 Business domain | 33 |
| 7 Payments | 19 |
| 8 Notifications | 15 |
| 9 Client app | 55 |
| 10 Pro app | 14 |
| 11 Offline/sync | 16 |
| 12 Admin | 11 |
| 13 Security | 14 |
| 14 Legal | 8 |
| 15 Testing | 15 |
| 16 i18n validation | 6 |
| 17 DevOps | 15 |
| 18 Observability | 7 |
| 19 Backup/DR | 5 |
| 20 Documentation | 6 |
| 21 Launch | 10 |
| 22 Maintenance | 8 |
| 23 Audit additions | 66 |
| 24 Further gaps | 52 |
| **Total** | **~563** |

---

## Assumptions made (flagged)

- Concrete stack chosen (see top) since the prompt allows defaults; swap freely without changing task structure.
- Offline-first scoped mainly to Pro; Client gets read-only PWA caching.
- Single country (Algeria), single currency (DZD) at launch; multi-city is post-launch.
- Vendors/marketplace and forum/magazine are lower priority (P2–P3) vs the core venue-booking loop.
- One shared API serves all front-ends; conflict strategy defaults to last-write-wins with manual-merge fallback.

## Blind spots & decisions to make

- **Commission model:** does Zwadj take a % per booking, charge venues a subscription, or both? Affects payments, payouts, invoicing.
- **Payment timing:** deposit-only online with balance paid offline, or full online? Changes booking/refund logic.
- **Who owns venue content & pricing** — venues self-serve, or admin-curated at launch? Affects KYC, moderation, admin scope.
- **SMS deliverability in Algeria** — confirm a reliable gateway; OTP may be needed for phone verification.
- **Tax/invoicing legal format** — confirm Algerian invoice/receipt requirements.
- **Data residency** — does Law 18-07 require local hosting? Impacts infra choice.
- **Cancellation policy rules** — tiers/refund percentages must be defined before 6.3/7 refunds.
- **Real-time needs** — are live availability updates required (WebSockets), or is polling enough for MVP?
- **Mobile strategy** — PWA-only or native apps later? Affects push notifications and offline scope.

## What the 3 review passes added

- Pass 1 (granularity): split lumped items into atomic endpoints/states (e.g. each auth endpoint, each UI state, each payment provider separately).
- Pass 2 (technical/ops): added readiness checks, secure headers, dependency scanning, zero-downtime migrations, restore testing, alerting.
- Pass 3 (product/legal/blind spots): added KYC gating, review moderation, Law 18-07 export/erasure, consent, cancellation terms, commission/payout ledger, and the open decisions above.

---

## Review round 2 — Correlation pass (do all tasks line up?)

Issues found and fixed:

1. **Forward dependencies in auth (broken ordering).** Phase 5 auth referenced `8.1` (notifications) and `13.4` (security) which come *later*. Fixed by adding three P0 primitives to Phase 4 — a rate-limit middleware, a minimal email-send primitive, and an idempotency-key middleware — and re-pointing the auth deps to them. Auth no longer depends on anything that comes after it.
2. **Idempotency missing on booking creation.** Payments had idempotent webhooks, but `POST /bookings` could double-submit. Added an idempotency-key requirement (dep on the new Phase 4 middleware).
3. **No global money/time/ID conventions.** Added three P0 foundation rules: money as integer minor units (no floats), UTC storage with locale formatting only at the edges, and client-generated UUIDv7 — the last is a prerequisite for collision-free offline creation, so Phase 11 now depends on it.

## SESSION DES 23 ET 24/08/2026 — état d'entrée de la prochaine session

## ⚠ À LIRE EN PREMIER

**Trois suppressions manuelles accompagnent la dernière archive** — un zip
n'efface pas. Aucun oubli ne passe inaperçu, c'est vérifié un par un :

| À supprimer | Ce qui se produit si on oublie |
|---|---|
| `apps/client/src/app/_not-found.tsx` | suite ROUGE (cible C2) |
| `apps/client/src/app/[locale]/loading.tsx` | suite ROUGE (cible C9) |
| `apps/client/src/app/[locale]/salles/page.tsx` | **le build s'arrête** : deux pages résolvent `/fr/salles` |

⚠ **Un dossier NEUF** : `apps/client/public/` n'existait pas ; l'archive le crée
avec `404-nuage.svg`.

**Ordre recommandé :**
1. **Défaut B de D228** — les paliers 2 M et 4 M du formulaire d'accueil ne
   filtrent rien. Décision **produit**, pas technique.
2. **Lot ③ — assistant (D229–D231).** Cadrage figé. ⚠ Il réécrit
   `filter-wizard.tsx` : la séparation des deux contrats livrée en D228 est à
   **conserver**, pas à refondre.
3. Baseline a11y à régénérer.

---

## ✅ FERMÉ PAR CETTE SESSION

- [x] **[CLIENT][P0]** `maxPrice` / `maxPriceCents` — **corrigé et mesuré**.
      Repli daté au 19/11/2026 dans le code, `toPublicQuery` seule à écrire,
      l'assistant sépare la requête d'API de l'URL publique. (D228)
- [x] **[TEST][P0]** Les deux pages 404 **sont rendues en test** — 14 tests,
      dont des gardes sur les **noms de fichiers**, qui sont ce qui avait cédé.
      ⚠ Le motif écrit en D221 (« locale invalide ») était **faux** : mesuré,
      `/xx/quoi` part en 307. (D249)
- [x] **[CLIENT][P1]** Page **404 bilingue** : livrée, atteinte, mesurée sur
      serveur réel. (D249, D251)
- [x] **[BACK][P1]** Refus **hors horizon** `AVAILABLE_ON_BEYOND_HORIZON`,
      code distinct de `AVAILABLE_ON_PAST`. (D227)

## À OUVRIR — bloquants

- [ ] **[CLIENT][P0]** ⛔ **DÉFAUT B — deux paliers de budget sur quatre ne
      filtrent RIEN.** `atCeiling` efface tout plafond `>= BUDGET_CEILING`
      (1 500 000 DA, D69) ; l'accueil propose 2 000 000 et 4 000 000 DA. État
      **inchangé** par la correction du nom : ni recul, ni réparation. Trois
      issues, toutes des décisions produit — descendre les paliers sous la
      butée, relever `BUDGET_CEILING`, ou assumer que « 4 000 000 DA » veut
      dire « pas de plafond ». (D228)

- [ ] **[TEST][P0]** ⚠ **Intégration et typecheck API NON MESURÉS** sur les lots
      D227 / D228 / D249–D251. `prisma generate` échoue en bac à sable
      (`binaries.prisma.sh` refusé en sortie, 403) : un **talon** local a permis
      de jouer les 560 tests unitaires, mais **pas** de typer contre le vrai
      client Prisma. ⚠ `venues-public.int-spec` touche `availableOn` — à
      relancer en premier.

- [ ] **[FRONT][P1]** ⚠ **Le HTML initial des deux pages 404 est VIDE.** En
      production, elles délivrent `<html id="__next_error__">` avec une frontière
      Suspense non résolue ; le contenu n'arrive que par la charge RSC, donc
      après hydratation. Statut HTTP correct, navigateur correct, **robot sans
      JS : page blanche**. Antérieur à cette session, prouvé en A/B sur le même
      build. La correction connue passe par un `app/layout.tsx` racine, ce qui
      déplacerait le `<html>` porté par `[locale]/layout.tsx` : **décision de
      structure, non prise**.

## À OUVRIR — suites

- [ ] **[A11Y][P1]** Régénérer la baseline axe-core : la 404 se rend désormais
      pour de bon et **n'y a jamais été passée** ; le panneau de refus de
      `/salles` a un second jeu de textes (D227) ; la page de recherche a changé
      de dossier sans changer de rendu (D250).

- [ ] **[I18N][P1]** Trois clés arabes neuves non relues :
      `search.availableOn.horizonTitle`, `horizonBody`,
      `venue.errors.availableOnBeyondHorizon`. ⚠ `search.availableOn.pastAction`
      a été **renommée** `clearDateAction` — elle sert les deux refus, garder
      « past » dans son nom l'aurait fait mentir.

- [ ] **[INFRA][P2]** Autoriser `binaries.prisma.sh` en sortie du bac à sable,
      pour que les portes API redeviennent pleinement mesurables sans talon.

- [ ] **[FRONT][P3]** `404-nuage.svg` porte des couleurs **gravées** (`#77777f`,
      `#c8434f`) : elles ne suivent pas `--ink-2` / `--accent`. Tout changement
      de palette demande de régénérer l'image — la recette est dans son en-tête.

---

## SESSIONS DES 19 ET 20/08/2026 — état d'entrée de la prochaine session

## ⚠ À LIRE EN PREMIER DANS LA PROCHAINE SESSION

**Repartir d'un export FRAIS du dépôt, pas d'un arbre de travail hérité.**
Du code non retracé est apparu **deux fois** dans l'arbre de travail (D232) : une
fonction et une constante d'abord, puis une réécriture complète de 17 tests
ensuite. Ni l'archive téléversée ni le dépôt de Ko ne les contenaient.

**Premier geste de la session :** énumérer les fichiers attendus AVANT de coder,
et vérifier en fin de lot que le diff ne contient qu'eux.

⛔ **UN NUMÉRO DE DÉCISION SE PREND EN LISANT `ZWADJ_CONTINUITE.md`.** ~~Dernier
attribué au 28/08/2026 : **D267**.~~
⛔ **BARRÉ LE 08/09/2026 (D280) — UN COMPTEUR FIGÉ, DANS LE BLOC « À LIRE EN PREMIER ».**
Il était périmé de plusieurs lots. C'est le compteur que le registre de
`ZWADJ_CONTINUITE.md` dit avoir retiré de trois autres endroits, réapparu dans le seul bloc
qui s'annonce comme la première chose à lire d'une session.
⛔ **ET LE PREMIER JET DE CE BARRAGE-CI ÉCRIVAIT LE NUMÉRO COURANT À LA PLACE** — donc
replantait exactement ce qu'il retirait, sous le mot « barré ». Retiré à la relecture, le
08/09 : le précédent applicable est dans `CLAUDE.md`, où « D1 à D266 » est barré **SANS
nouveau numéro**. ⚠ Un ÉCART chiffré ne vaut pas mieux qu'un numéro : il le reconstruit, et
il grandit tout seul au lot suivant.
⇒ **AUCUN NUMÉRO N'EST RÉÉCRIT ICI, ET C'EST LE REMÈDE** : il se prend en lisant la
**dernière ligne de la table du registre**, en bas de `ZWADJ_CONTINUITE.md`, et nulle part
ailleurs — pas même dans une ligne qui prétendrait le rappeler.

⛔ **LES HARNAIS SONT DANS `neutralisation/`** et se lancent depuis la RACINE :
`python3 neutralisation/neutralize-xxx.py`.
⛔ **LE COMPTE « 20 scripts, 170 cibles » QUI FINISSAIT CETTE LIGNE EST RETIRÉ, PAS
RAFRAÎCHI (D280, 08/09/2026).** D268 l'interdit nommément — « aucun compteur de harnais
n'est écrit ici, et c'est délibéré » — et le chiffre était faux, dans les deux moitiés.
⛔ **AUCUN COMPTE N'EST ÉCRIT ICI À SA PLACE** : le relevé du 08/09 vit dans la section
D280 de `ZWADJ_CONTINUITE.md`, daté. Le nombre de scripts et le nombre de cibles bougent à
chaque lot — un chiffre posé ici serait faux au lot suivant, et il aurait l'air d'un fait.
⇒ **Pour l'état du jour** : `ls neutralisation/` pour les scripts, et
`python3 neutralisation/lancer-campagnes.py` pour le relevé mordues / muettes / non
mesurées, campagne par campagne.

**Ordre recommandé**, du plus risqué au moins risqué :

1. ~~**`migration-non-empty.int-spec.ts` bloqué.** `beforeAll` expire à 60 000 ms,
   deux fois de suite, et les **sept tests sont sautés** — dont la garde qui prouve
   qu'une migration passe sur une base non vide. Ce n'est pas de la lenteur. Un
   diagnostic est en place et **nommera les occupants** de `zwadj_migration_test`
   au prochain run : commencer par lire ce message.~~
   ⛔ **BARRÉ LE 08/09/2026 (D280) — PÉRIMÉ, ET LA LECTURE SEULE SUFFISAIT À LE DIRE.**
   Trois faits qui se recoupent : le dépôt porte **36 fichiers `*.int-spec.ts`** ;
   `pnpm test:int` a rendu **434 tests / 36 fichiers, exit 0** le 08/09 (D279) ; et le
   tableau de mesures de D279 **sait écrire « 1 ignoré »** — il le fait pour la suite e2e,
   et pas pour `test:int`. **Sept tests sautés se verraient.**
   ⚠ **Le « 60 000 ms » existe bel et bien**, et le chercher dans le spec était l'erreur :
   c'est `hookTimeout: 60_000`, dans `apps/api/vitest.config.int.ts:20`. Dire « le fichier
   ne porte pas de `beforeAll` à 60 s » était **vrai et trompeur** — une réponse exacte à
   la mauvaise question se lit comme une réponse à la bonne.
   ⛔ **RIEN N'EST DÉCLARÉ VERT AU-DELÀ DE CELA.** Ce barrage dit que l'entrée décrit un
   état révolu, pas que le harnais fera son office : **la vérification réelle a lieu à
   l'ouverture de l'étape 4, en LANÇANT ce fichier** — c'est lui qui doit rougir sur un
   semis qui viole le `CHECK`.
2. ~~**S11 — SRP sur `BookingsService`**, moitié amont~~ — **S11-a LIVRÉ**
   (D261, 16/16). ~~Reste **S11-b — le chiffrage** : tarification, prestations,
   confrontation D75, échéance d'acompte.~~ ⛔ **CHEMIN DE L'ARGENT** : modes de
   défaillance écrits AVANT tout code, arrêt franc pour arbitrage.
   ~~⚠ Repartir des mesures RÉELLES, pas de l'estimation d'origine : `create`
   pèse **168 lignes / 123 exécutables** après S11-a, et non « 200 sur 729 ».~~
   ⛔ **BARRÉ LE 08/09/2026 (D280) — DEUX FAUTES, ET LA SECONDE EST CELLE DE D277
   ELLE-MÊME.** (a) S11-b n'est plus « à faire » : ses **étapes 1 à 3 sur 6 sont livrées
   et mesurées** (D279) — module pur `booking-charge.ts` consommé par `bookings` ET
   `quotes`, 8 gardes mordues sur 8. Restent les étapes **4 (le `CHECK`)**, **5 (les deux
   échéances)** et **6 (le reste du harnais)**. (b) « **168 lignes** » a été **barré dans
   `ZWADJ_CONTINUITE.md` par D277**, comme ne correspondant à aucune des trois façons de
   compter ; et « 123 exécutables » est périmé — `create` a été réduite par D279.
   ⛔ **AUCUN CHIFFRE COURANT N'EST ÉCRIT ICI**, pour la même raison que les deux compteurs
   ci-dessus : il bougera encore aux étapes 4 et 5, dans un bloc qui se lit comme l'état du
   jour. Le relevé daté vit dans la section du rang 8, avec la commande qui le reproduit.
   ⛔ **C'EST L'OCCURRENCE QUE D277 A MANQUÉE DANS SA PROPRE PASSE** : ce lot-là existait
   pour porter un barrage jusqu'aux autres autorités, il l'a fait pour la phrase
   « Bloquant avant S11-b » et **pas pour le chiffre barré, deux entrées plus haut dans ce
   même fichier**. ⇒ Chiffres du jour : section du rang 8 de `ZWADJ_CONTINUITE.md`, avec
   la commande qui les relève.
3. **E3d-2 — expiration des `PENDING`.** Attend la durée de vie d'un lien
   Chargily. Ne pas figer le nombre avant de l'avoir mesurée : plus courte qu'elle,
   un visiteur paie une intention marquée morte.
4. **Lot ③ — assistant (D229–D231).** Cadrage figé, aucune question ouverte.

⚠ **Ce qui n'est plus ouvert** : D227 (hors horizon), D228 et son défaut B
(`maxPrice`, fermé par D254), E3d-1 (atomicité du paiement), S8 (plafonds console),
S9 (ISP `VenueProClient`), S10a et S10b (DIP salles et devis).

## À OUVRIR — bloquants

⚠ **QUATRE ENTRÉES DE CETTE SECTION SONT FERMÉES** depuis le 23/08/2026 — voir
« FERMÉ PAR CETTE SESSION », plus haut dans ce document. Conservées telles
quelles pour la trace du raisonnement.
- [ ] **[CLIENT][P0]** ⛔ **`maxPrice` / `maxPriceCents` — DÉFAUT DE PRODUCTION
      ACTIF.** L'URL publique porte des dinars, l'API des centimes, et
      l'accueil comme l'assistant émettent le nom de l'API dans l'URL. Mesuré :
      `/salles?maxPriceCents=50000000` produit une requête API **sans aucun
      filtre de prix**. Correction validée : lecture `maxPrice` prioritaire,
      `maxPriceCents` en repli, `toPublicQuery` seule à écrire. (D228)

- [ ] **[CLIENT][P1]** Retirer le repli `maxPriceCents` — **échéance 19/11/2026**
      (3 mois). Retirer aussi la clé de `SEARCH_VARIANT_PARAMS`. Un repli sans
      date de retrait devient un second nom officiel. (D228)

- [ ] **[SEO][P0]** ⚠ **`NEXT_PUBLIC_SITE_URL` à poser AVANT tout déploiement.**
      Documentée dans `.env.example`, absente de la configuration réelle. Sans
      elle, chaque page annonce une canonical `localhost` — le site se
      désindexe lui-même. (D216)

- [ ] **[TEST][P0]** ⚠ **Les deux pages 404 n'ont JAMAIS ÉTÉ RENDUES.** Seule la
      couche API du point B est mesurée (6 tests). Le cas le plus fragile est le
      404 racine : il ne se déclenche que sur une locale invalide, chemin
      qu'aucun test n'emprunte. (D221)

- [ ] **[TEST][P0]** ⚠ **Intégration non exécutée sur une zone TOUCHÉE.** La
      consolidation de `HARD_BOOKING_STATUSES` modifie
      `availability-blocks.service.ts`, donc le chemin du 409
      `AVAILABILITY_BLOCK_CONFLICT` et ses **17 tests d'intégration**.

- [ ] **[OPS][P0]** ⚠ **Confirmer si le zip « exclusion situation B » a été
      appliqué** (5 fichiers, livré le 20/08). Son application n'est pas
      confirmée ; sans elle, D225 n'est pas dans le dépôt.

## À OUVRIR — lot ③

- [ ] **[CLIENT][P1]** Lot ③ complet, **entièrement cadré, rien d'ouvert** :
      assistant en MODE de `/salles` (D229), `?guide=<étape>` (D230), overlay
      sans navigation, formulaire d'accueil à trois champs (D231), suppression de
      `/[locale]/assistant`, libellé « Li hwas lqa ».
      ⚠ **La réécriture périme le harnais de test de l'assistant** : chaque
      réponse devient une navigation, donc un composant ne peut plus être cliqué
      quatre fois sur un seul montage. Prévoir un harnais qui rejoue le rendu
      avec l'état que l'URL poussée produirait.
      ⚠ **Le test qui assertait `maxPriceCents` dans l'URL poussée doit devenir
      une garde sur `maxPrice`** — c'est lui qui validait le bug ; le réécrire
      sans le dire ferait passer une correction pour un effet de bord.

- [ ] **[API][P1]** D227 — refus hors horizon, code `AVAILABLE_ON_BEYOND_HORIZON`,
      quatrième issue `SearchOutcome`, un seul panneau et deux jeux de textes.

- [ ] **[UI][P1]** ⚠ **Garde `.wz-rail` / `.zj-rail` à vérifier.** Le dernier
      état observé la montrait rouge (`Expected: wz-rail, Received: zj-rail`) :
      la `className` d'application ne passait plus, donc le rail quittait sa
      colonne de grille. Défaut visuel réel — à mesurer avant toute livraison
      touchant `journey.tsx` ou `filter-wizard.tsx`. (D232)

## À OUVRIR — lots séparés

- [ ] **[API][P2]** **Recherche libre (`q`) — LOT DÉDIÉ, pas un ajout de champ.**
      N'existe nulle part : contrat public à douze clés sans `q`, service sans
      `contains`, migrations sans index texte, ville en `<select>`. Trois raisons
      d'en faire un lot : `cityId` est un UUID (résolution texte → ville
      nécessaire), il faut un index (migration), et `nameAr` demande des
      décisions de **normalisation arabe** (alef, hamza, diacritiques) qu'un
      `LIKE` ne couvre pas. Livrée à moitié, elle marcherait en français et
      échouerait en arabe sur la moitié des saisies. (D231)

- [ ] **[SEO][P2]** Revisiter la règle `isVariant` quand le catalogue atteint
      **~150–200 salles actives OU 6 mois après le lancement public**, le premier
      des deux — sur données Search Console, pour identifier d'éventuelles
      combinaisons à sortir de `isVariant`. **Ne rien coder avant.** (D216)

- [ ] **[UI][P2]** Baseline a11y à régénérer : la chrome de parcours a changé de
      classes dans les deux applications. `pro walkin` et `client assistant`
      sortent de leur référence. (D223)

- [ ] **[UI][P3]** `revealAndFocus` reste DUPLIQUÉ (`apps/pro/src/lib/reveal.ts`
      + garde `scrollIntoView?.()` recopiée dans `filter-wizard.tsx`).
      ⚠ Entrée **renforcée** : c'est exactement le schéma qui a produit les trois
      écarts de chrome du point D. `@zwadj/ui` héberge désormais du code de
      parcours partagé — l'endroit existe.

- [ ] **[I18N][P1]** ~17 clés arabes neuves non relues (`search.availableOn.*`,
      `search.guide.*`, `notFound.*`, `common.errors.routeNotFound`,
      `venue.errors.*`, `home.search.city*`). **S'ajoutent aux ~136 en attente.**

- [ ] **[CLIENT][P2]** Réintégrer la DATE comme 5ᵉ étape de l'assistant.
      ✅ **DÉBLOQUÉE** : la réponse affecte désormais réellement l'affichage.
      Position dans la séquence toujours à décider.

---

## Modifications de contrat à répercuter

- `searchVenues` rend `SearchOutcome` (`ok` / `past-date` / `unreachable`), et
  gagnera `beyond-horizon` avec D227.
- `SearchView` reçoit `outcome`, non plus `results`.
- `AllExceptionsFilter` exporte `ROUTE_NOT_FOUND`.
- **Les classes de chrome `.wk-*` et `.wz-*` n'existent plus** — remplacées par
  `.zj-*`. Tout code externe accroché dessus casse **silencieusement** : le CSS
  ne rougit nulle part.
- Avec `availableOn`, `total` ne compte que les salles ayant au moins un créneau
  actif (D225).

## Review round 3 — Future-proofing pass (will it pass real tests?)

The single biggest correctness risk and its fix:

4. **Last-write-wins would cause double-bookings.** Generic LWW is fine for editing a profile, but applied to bookings/availability it silently overwrites a competing reservation = two weddings booked on the same date. Fixed: bookings and availability are now **server-authoritative** — the losing write is *rejected*, not merged — while LWW is restricted to non-conflicting editable fields. Added a pro-facing prompt when a write is rejected.
5. **Offline correctness gaps.** Added tombstones for offline deletes and a per-device "last pulled at" cursor, so deletions and incremental pulls sync correctly rather than resurrecting deleted rows.
6. **Tests that actually prove the guarantees.** Added three targeted tests: two concurrent bookings on the same slot (exactly one wins), offline-pro + online-client on the same date (no double-booking), and a replayed booking POST (same idempotency key → one booking).
7. **Soft-delete vs erasure-right conflict.** Law 18-07 erasure clashes with financial/legal retention. Added a task to **anonymize** rather than hard-delete records tied to invoices/payments, satisfying both.

### Still requires a human decision before build (unchanged, re-confirmed)
The blind-spots list above stands — especially the **commission model**, **payment timing (deposit online vs full)**, and **data residency**, because cancellation/refund logic, payout ledgers, and infra choice all hang on them. These are product/legal calls, not engineering gaps.

---

## Coverage audit — what was missing (Phase 23)

The earlier three passes hardened *correctness* but assumed a fairly transactional "browse → book → pay" product. Re-auditing as a real two-sided marketplace surfaced whole pillars that were absent, not just details:

- **Marketplace mechanics (biggest gap):** no venue self-onboarding, no client↔venue messaging, and no booking-*request* (accept/decline) model — only instant-book. Real venue markets run on inquiries and approvals. Added 23.1 + 23.2.
- **Calendar reality:** bookings were modeled as a whole date with no evening/half-day slots, no buffers, and no sync with the calendars venues already use (iCal/Google) — which would reintroduce the double-booking we just fixed. Added 23.3.
- **Money-safety beyond the happy path:** no recovery for "paid but booking failed", no webhook dead-letter, no legal sequential invoice numbering, and TVA/fees weren't shown to the client. Added 23.5.
- **Deliverability & admin security:** emails would land in spam (no SPF/DKIM/DMARC), Arabic SMS encoding unhandled, and admins handling money/data had no MFA. Added 23.6 + 23.7.
- **A real risk in the design itself:** the signature gold-on-cream palette likely fails WCAG AA contrast — added an explicit task to validate and adjust the tokens.
- **Plus** SEO/locale routing, phone/geocoding/Hijri-calendar localization, privacy depth (DPAs, breach procedure, consent-gated analytics, booking-contract PDF), and ops depth (connection pooling, cron framework, unsynced-data warning, anti-drift rule for the two apps).

These 66 additions are folded into existing phases via the labels; Phase 23 is just where they're listed. Net backlog ≈ 511 atomic tasks.

---

## Second coverage audit — what was still missing (Phase 24)

Phase 23 closed the marketplace-mechanics gaps. This pass found a further 52 tasks, now mostly in **commercial, scope, and resilience** territory rather than missing core features:

- **Monetization was barely modeled.** Only per-booking commission was on the table — no featured/promoted listings (a paid ad product), no subscription tiers, no recurring billing. For revenue, these matter.
- **Booking scope had unresolved branches:** whether **vendors transact on-platform** (a whole parallel flow), which **event types** are supported, **venue-initiated cancellation**, no-shows, and the **security/damage deposit** that venue rentals almost always require.
- **Payouts & disputes as processes**, not screens: collecting and verifying venue **bank details (KYB)**, disbursement runs, and a real dispute flow with evidence/mediation/escrow.
- **Two genuinely important engineering gaps:** **IndexedDB schema + sync-contract versioning** (without it, an app update can break or wipe an offline pro's unsynced data), and a **performance budget for low-end Android + slow networks** — which is not optional for the Algerian market.
- **Plus** third-party resilience (circuit breakers, maintenance mode, map-tile provider/cost), deeper security (WAF/DDoS, SAST/DAST, secrets scanning, disclosure policy, admin impersonation with audit), engineering governance (DoD, contract tests, staging PII scrubbing, synthetic monitoring), Algerian regulatory/fiscal registration, and bidi/UGC i18n edges.

### Honest status after three audit rounds
The backlog now spans the full lifecycle plus marketplace, commercial, resilience, security, legal and ops depth — ~563 atomic tasks. From here, "what else is missing" largely stops being *forgotten features* and becomes **(a) product/business-model decisions** (commission, vendor transactions, event types, deposit policy, payment timing, data residency) and **(b) continuous concerns** that are never "done" — security, performance, accessibility, observability, and iterating from real user feedback. Those aren't gaps to enumerate further; they're decisions to make and disciplines to sustain.

---

## PHASE A+ — Lots A9 → A12 (INTÉGRÉS ET VÉRIFIÉS)
*A6a/A6b/A7/A8 restaient réservés (médias Pro, éditeur de tour, recherche Client, détail Client) — d'où la reprise à A9. A11 a été scindé en A11a (Pro) / A11b (Client), conformément au « Pro d'abord, Client ensuite » du cadrage.*

> ✅ **Les cinq lots sont intégrés, corrigés et prouvés.** Ordre d'intégration
> retenu : A9 → A12 → A10 → A11a → A11b. Sept correctifs ont été nécessaires,
> tous trouvés à l'exécution et invisibles en relecture — ils sont listés dans
> `ZWADJ_CONTINUITE.md` et ne figurent dans AUCUN zip de Opus.
> Compteurs de référence : typecheck 8/8, lint 0, **39 fichiers / 339 tests**
> unitaires, **20 fichiers / 162 tests** d'intégration, i18n 354 = 354.

### A9 — Suppression réelle de `capacityMin` (D36) + unité monétaire (D43)
- [x] ~~Supprimer `/prisma/schema.prisma` (copie périmée à la racine)~~ — **sans objet : le fichier n'existait pas dans le zip reçu**
- [x] Migration `venue_drop_capacity_min` : `DROP CONSTRAINT venues_capacity_valid` (il portait sur les DEUX colonnes et aurait été emporté EN SILENCE), `DROP COLUMN capacity_min`, puis CHECK **reposé** sur `capacity_max > 0` [BACK][P0]
- [x] `@zwadj/types` : `capacityMin` retiré des schémas Zod et des 3 DTO, les 2 `superRefine` min≤max supprimés, `CAPACITY_RANGE_INVALID` supprimé [SHARED][P0]
- [x] i18n : `venue.validation.capacityMin`/`capacityMax` **ne sont PAS les clés du champ supprimé** mais les messages de BORNES du champ survivant — **renommées** `capacityTooSmall`/`capacityTooLarge` (les retirer aurait cassé la validation) [SHARED][P0]
- [x] D43 : libellé sans « (DA) », aide visible supprimée, boîte unique + `text-align: end`, focus sur `:focus-within`, **description masquée** reliée par `aria-describedby`. **`dir="ltr"` RETIRÉ de l'input** [FRONT][P0]
- [ ] **À VÉRIFIER À L'ŒIL, FR *et* AR** : anneau de focus au clavier, et unité à l'inline-end en RTL. C'est le retrait de `dir="ltr"` qui se valide ou s'infirme là [FRONT][P0]
- [x] Front Client : **no-op** — aucune occurrence de `capacity` dans `apps/client` (A7/A8 non livrés)

### A12 — Loader de marque (D44)
- [x] `packages/ui/src/brand-loader.tsx` + CSS + namespace i18n `common` + branchements (`RequireProSession`, `apps/client/src/app/[locale]/loading.tsx` en composant CLIENT — un fallback de Suspense doit se rendre SYNCHRONEMENT) [SHARED][P0]
- [ ] **À VÉRIFIER À L'ŒIL** : rendu, puis rendu avec « réduire les animations » activé — le logo doit rester ENTIER et STATIQUE, pas un fragment figé [SHARED][P0]

### A10 — API compte (chemins sensibles)
> Détail des endpoints et de l'exécution : voir **5.1bis** et **5.1ter** ci-dessus.
- [x] Deux migrations : `account_profile_email_change` (`phone2` + `email_change_tokens`) puis `account_deletion_request` (2 tables + enum + index unique partiel) [BACK][P0]
- [x] `AuthUserDTO` +4 champs (`phone`, `hasPassword`, `hasGoogle`, `proProfile.phone2`) ⇒ **7 fixtures manuelles** des deux apps + **2 assertions d'égalité exacte** en intégration mises à jour dans le même commit [SHARED][P0]
- [x] `passwordHash` désormais SÉLECTIONNÉ dans `AUTH_USER_SELECT` (`hasPassword` ne peut pas se dériver autrement) — `toAuthUserDTO()` construit champ par champ, **jamais par spread** [BACK][P0]
- [x] Revue humaine ligne à ligne **obligatoire** avant intégration (chemin sensible) [SHARED][P0] — faite, sept correctifs en résultent (voir `ZWADJ_CONTINUITE.md`)

### A11a — UI compte Pro
- [x] `useDismissLayer` extrait + `AccountMenu` + `AccountClient` (bâti sur `authedRequest` ⇒ mutex de refresh partagé, **`AuthClient` PAS étendu**) + page `/compte` (4 sections indépendantes) [PRO][P0]
- [x] `AuthContext` Pro : `applyUser` (le PATCH profil renvoie déjà le DTO) + `reloadUser` (`change-password` ne le renvoie pas — **sans lui, `hasPassword` reste `false` en mémoire et l'écran reste bloqué en mode « définir »**) [PRO][P0]

### A11b — UI compte Client
- [x] `AccountMenu` réutilisé sans « Ajouter une salle » ; page `/{locale}/compte` (serveur minimal + vue `"use client"`) ; profil porté par `User` ; `applyUser` ajouté (`refreshUser` existait déjà) ; `robots: noindex` [CLIENT][P0]
- [x] **Pas de promesse d'archivage** sur l'écran de suppression Client : un client n'a pas de salle [CLIENT][P0]

### A6a — Visite virtuelle Matterport (D45, remplace le tour maison de D34)
> Le brief initial d'A6a prévoyait médias + scènes/liaisons 360°. D45, décidée en cours de cadrage, a retiré tout le volet scènes/liaisons et annulé A6b (éditeur de tour) : ce lot ne portait donc plus que la visite virtuelle Matterport côté API/Pro, plus le volet photos resté à faire.
- [x] Migration `a6a_matterport_replace_360_tour` **écrite à la main** (`migrate dev --create-only`, jamais un diff généré) : `DROP TABLE` de `venue_photo_360_links` puis `venue_photos_360` (enfant → parent, sans CASCADE), ajout `venues.matterport_model_id` (`varchar(24)` nullable) + index unique. **Vérifié en base réelle** (`pg_tables`/`pg_constraint`/`pg_indexes`) : zéro résidu portant `360`, et les contraintes des AUTRES tables (`venues_capacity_valid`, `venues_cashback_rate_range`, `venues_commission_rate_range`, l'`EXCLUDE` gist `bookings_no_overlap_accepted_confirmed`) intactes [BACK][P0]
- [x] `parseMatterportInput` (`@zwadj/types`) : ID brut ou URL de partage, trois retours distincts (chaîne vide = désactivation, `null` = rejet, sinon l'ID canonique). **Ne peut pas utiliser `new URL()`** — ce paquet compile en `lib: ["ES2022"]` seule (ni DOM, ni `@types/node`) ; réécrit en découpage manuel de chaîne, avec retrait du userinfo et du port avant comparaison d'hôte [SHARED][P0]
- [x] `PATCH /venues/:id/virtual-tour` — **sans préfixe `pro/`** (les écritures pro restent toujours nues). 400 `INVALID_MATTERPORT_LINK` sur format invalide, jamais un échec muet [BACK][P0]
- [x] 409 `MATTERPORT_ALREADY_LINKED` [BACK][P0] — **code non prévu au cadrage, ajouté à l'exécution** : conséquence directe du `@unique` sur `matterportModelId` — le compte Matterport étant unique pour tout Zwadj, coller la même URL sur deux salles est l'accident le plus probable ; sans ce catch, le P2002 sous-jacent remontait en 500 brut
- [x] Section Pro « Visite virtuelle » (`virtual-tour-section.tsx`), **hors du `<form>` principal** : endpoint séparé du PATCH général de la salle, donc son propre bouton — un submit imbriqué aurait fait partir deux requêtes sur une touche Entrée [PRO][P0]
- [x] `VenuePhoto` (galerie classique) INTACTE : non-régression prouvée en intégration après la migration [BACK][P0]
- [x] i18n : 9 clés 360° retirées, 15 clés Matterport ajoutées. 360 = 360 [SHARED][P0]
- [x] **Volet photos d'A6a** (upload, ordre ↑/↓, alt FR/AR) [PRO][P0] — ✅ **livré au Lot A6a-P**, gates vertes, intégration 20/165 INCHANGÉE (l'API n'a pas été touchée : c'est la preuve)

### UI-P1 — Passe UI Pro (livrée)
- [x] `.btn` NUE était **invisible** : le reset global de `styles.css` retire `background`/`border`/`padding` de tout `<button>` et `.btn` ne reposait que la police — « Enregistrer la visite » et « Enregistrer le texte alternatif » s'affichaient comme du texte gras. `.btn` porte désormais le niveau SECONDAIRE ; les variantes pleines le recouvrent **filet compris** [SHARED][P0]
- [x] Aucun risque pour l'app Client : **zéro occurrence de `.btn` nue** chez elle (toutes portent `-accent`/`-ghost`/`-danger`) — vérifié par grep, puis build Next refait [SHARED][P0]
- [x] `ArrowBackIcon` (`@zwadj/ui`, SVG inline, **aucune dépendance d'icônes introduite**) sur les 6 `.backlink` du dépôt, **miroitée en RTL par la CSS** (`scaleX(-1)`) et non par un glyphe choisi par langue [SHARED][P0]
- [x] Sortie de page explicite : à côté de « Créer » sur la création, **à la toute fin** sur l'édition — un « Retour » dans la rangée du submit ferait croire que la page s'arrête là alors que photos et visite virtuelle suivent [PRO][P0]
- [x] Zéro clé i18n neuve : `venue.ui.form.back` disait déjà « Retour à mes salles » [SHARED][P0]
- [x] Garde-fou `apps/pro/src/ui-tokens.test.ts` — relit la feuille partagée et interdit le retour du bouton invisible. **Aucune assertion de couleur** : on n'y fige pas une esthétique [SHARED][P0]
- [ ] Hiérarchie visuelle plus large de l'app Pro (densité, échelle typographique, espacements) — **non traitée**, demanderait des arbitrages de direction artistique non posés [PRO][P2]

~~A6b (éditeur de tour Pannellum)~~ — **ANNULÉ ENTIÈREMENT (D45)**. Plus de clic-pour-placer, plus de `mouseEventToCoords`, plus d'aperçu de tour complet à coder côté Zwadj.

### Contrôles visuels restants (aucune automatisation ne les couvre)
- [ ] **D43, champ prix en FR *et* en AR** : anneau de focus sur la boîte au clavier, unité à l'inline-end en RTL. C'est là que le retrait de `dir="ltr"` se valide ou s'infirme [FRONT][P0]
- [ ] **D44, loader** : DevTools → Network → **Slow 3G** puis rechargement du Pro (le bootstrap dépasse alors les 200 ms d'anti-flash et le loader devient visible — en local il ne l'est jamais, c'est voulu). Puis `Ctrl+Shift+P` → « Show Rendering » → **Emulate prefers-reduced-motion: reduce** : le logo doit rester **entier et statique**, pas un fragment figé [SHARED][P0]

### Dette identifiée (à faire avant prod, non bloquante)
- [ ] **Communes** : 23 des 57 communes d'Alger sont seedées. Ajouter les 34 manquantes = une ligne chacune dans `apps/api/prisma/seed-data/cities.ts`, **zéro migration**. Graphies arabes officielles + coordonnées à valider avant usage marketing [BACK][P1]
- [ ] Normalisation E.164 `+213` des téléphones (libphonenumber, cf. 23.9) — **non faite**, ne pas la simuler à la main. Le format actuel est un simple `^\+213\d{8,9}$` [BACK][P1]
- [ ] Décider si un numéro **par salle** (`Venue.phone`) est nécessaire — aujourd'hui les numéros vivent sur le compte pro et sont partagés par toutes ses salles [PRODUCT][P2]
- [ ] **Nom de personne pour un compte pro** — reporté par Ko. L'API A10 rejette `firstName`/`lastName` pour un PRO ; si un vrai nom de contact devient nécessaire, c'est le contrat A10 qui bouge (schéma Zod + service + tests), pas l'écran [PRODUCT][P2]
- [ ] Liste `Amenity` (23 entrées) à valider par l'équipe terrain + l'expert SEO ; icône de `kosha` à choisir. Ajouter/retirer = une ligne de seed, jamais une migration [PRODUCT][P1]
- [ ] Révoquer/régénérer le `GOOGLE_CLIENT_SECRET` ayant circulé dans deux zips (jamais consommé, jamais nécessaire au flux ID-token) [INFRA][P0] — action Ko
- [ ] **Contrainte de compilation `packages/types`** : `lib: ["ES2022"]` seule (ni DOM, ni `@types/node`, cf. `packages/config/tsconfig/base.json`) — tout futur helper partagé touchant réseau/URL/fichiers doit en tenir compte, sous peine de `TS2304: Cannot find name`. Découvert au Lot A6a (`new URL()` indisponible dans `parseMatterportInput`) [SHARED][P2]

---

## TRANCHE R + Q — Correctifs UI, téléphone, machine à états du devis (14/08/2026)

⚠ **Collision de noms résolue.** Les lots de machine à états portaient `C1x`,
préfixe déjà pris par « Flux C, lot 1 » (livré). Renommés `Q0`→`Q5`.

### R2 — correctifs UI — ✅ LIVRÉS (D150→D157)
- [x] **R2a** — survol du bouton principal illisible : défaut de **spécificité**
      (`.wk-btn:hover:not(:disabled)` en (0,3,0) écrasait `.wk-btn-primary` en
      (0,1,0)). Contraste **1,10 → 19,73** en clair, 1,11 → 18,79 en sombre, les
      deux thèmes. Jeton fantôme `--accent-ink` éliminé. Filet du total en
      dégradé, crénage des titres, « 01 » sur l'accent. [PRO][P1]
- [x] **R2b** — panneau gauche réordonné, « Compte » retiré (atteignable par le
      bandeau, vérifié), quatre icônes lucide. 3 tests, 3 neutralisations. [PRO][P1]
- [x] **R2c** — chevrons de mois, client **et** pro. `aria-label` textuel + miroir
      RTL (`data-mirror-rtl` **et** classe `.btn`). Classe `.btn-icon` pour la
      cible tactile 34×34. [PRO][CLIENT][P1]
- [x] **R2d** — `apps/pro/src/lib/reveal.ts` : défilement **et** focus,
      `preventScroll`, `prefers-reduced-motion`. 6 + 3 tests. [PRO][P1]
- [x] **R2e** — prestations : case native redessinée (`appearance: none`, l'input
      reste l'unique autorité sur l'état), 4 contrats CSS. [PRO][P1]
- [ ] ⚠ **Bouton « annuler le devis »** — reporté : dépend de l'état `CANCELLED`,
      donc de **Q3**. [PRO][P1]

### R3 — téléphone — ✅ LIVRÉ (D158)
- [x] `packages/types/src/phone.ts`, fonction unique et partagée. 31 cas,
      idempotence mesurée. Message d'erreur refait FR/AR. [SHARED][P0]
- [x] ⚠ **Base vérifiée par Ko après livraison : aucune ligne non conforme.**
- [ ] ⚠ **Relecture humaine de l'arabe** du message `auth.validation.phoneInvalid`
      — écrit par un modèle. [I18N][P1]

### Q — machine à états du devis
- [x] **Q0** — cadrage écrit + 7 décisions arbitrées. **Remplace D101.** (D159→D167)
- [x] **Q1** — `quotes.sent_via` TEXT nullable + `CHECK`, jeu de valeurs dans
      `@zwadj/types`, aucune reprise de données. Test de migration **re-pointé**
      sur la nouvelle dernière migration et semant de vrais devis ; 3
      neutralisations. Intégration 405/405. (D168) [BACK][P0]
- [x] **Q2 — basculement.** `deliver(quoteId, sentVia)` remplace `send()` et
      n'écrit plus `SENT` ; `convert()` accepte `DRAFT` ; entonnoir sur `sentVia` ;
      `validUntil` / `isQuoteExpired` retirés du schéma, du DTO, du service et du
      formulaire ; `supersedeActive()` **supprimée** ; sélecteur des 4 canaux.
      Migration `20260814140000_quote_delivery_switch` (tri D166).
      ⚠ **QUATRE pièges traités, deux non prévus au cadrage** : `walkin-journey.tsx`
      appelait `send()` avant `convert()` (les deux issues du parcours principal
      cassaient au clic), et la garde de forme D120 de `dashboard-aside.tsx`
      portait sur `expired` — elle serait devenue définitivement fausse.
      **Intégration VERTE sur base réelle.** (D169→D177)
- [x] **Q3a** — `CANCELLED` absorbe `DECLINED`, **sans reprise de données**.
      Route `/decline` → `/cancel`, entonnoir sur les **deux** statuts perdus,
      historique retiré de l'écran. Aucune migration.
      **Intégration VERTE sur base réelle.** (D178→D181)
- [x] ~~**Q3b** — immuabilité en base + `revise()` qui écrase.~~ **ANNULÉ par la
      décision A** : le versionnement est conservé, donc il n'y a rien à garder.
      ⚠ D163 reposait sur une prémisse fausse — la réservation recopie déjà les
      montants, écraser un devis ne peut pas changer ce qui sera facturé.
- [x] **Q4** — `ALTER TABLE quotes DROP COLUMN valid_until`. ⚠ **Réduit à une
      seule colonne** : la décision A a retiré `chain_id` / `version` /
      `parent_quote_id` de ce lot, elles sont ACTIVES. Les **deux index partiels
      sont conservés** — l'un contraint les lignes héritées de D166 et sert de
      témoin à un `prisma migrate dev` égaré, l'autre redevient actif avec E3.
      ⚠ **Premier point de non-retour de la série.** Migration écrite,
      **non exécutée en bac à sable**. (D183→D186)
- [ ] **[PRO][P2]** Chemin de lecture des versions antérieures d'un devis (D180).
      L'historique a quitté l'écran ; la donnée reste en base mais n'est
      atteignable depuis **aucune** interface. Écran ou export — sans lui, la
      traçabilité conservée par la décision A est inaccessible le jour du litige.
- [ ] **[E3][P1]** `quotes_one_accepted_per_chain` redevient actif avec E3 : deux
      versions d'une même chaîne peuvent chacune porter une réservation
      (`convert()` ne regarde que le devis visé), donc deux passages en
      `ACCEPTED` violeraient l'index **en 500**. (D184)
- [x] ✅ **FERMÉE (20/08)** — les quatre arbitrages sont rendus et le lot est livré (D210→D215, D225). Énoncé d'origine conservé ci-dessous.
- [ ] ~~**[API][P0]** `availableOn` — CADRÉ, quatre arbitrages en attente.~~
      Voir `CADRAGE_AVAILABLE_ON.md`. Rappel du fait qui décide du coût : le
      moteur de disponibilité est **pur** et le service ne fait que **quatre
      requêtes**, toutes bornées par `venueId` — `venue_id IN (…)` les rend
      collectives sans en ajouter une. Annoter (grisé) coûte O(page) ; filtrer ou
      trier « disponibles d'abord » coûte O(catalogue).
      Arbitrages : ① `PENDING` grise-t-il ? ② tri « disponibles d'abord » hors
      lot ? ③ `robots`/`canonical` ici ou à part ? ④ date passée : refus ou
      annotation ?
- [x] ✅ **FERMÉE (20/08)** — ⚠ **l'énoncé était FAUX** : `/compte` portait déjà un `robots`. La règle existe (`lib/seo.ts` + 9 tests), câblée sur 9 pages (D216). Reste sa conséquence, voir `[SEO][P2]` plus bas.
- [ ] ~~**[SEO][P1]** Le dépôt n'a AUCUNE balise `robots` ni `canonical`~~ —
      vérifié. `availableOn` ouvrirait 365 URL par combinaison de filtres, mais le
      problème EXISTE DÉJÀ pour la pagination et les filtres actuels, en silence.
      Introduire la règle, pas seulement l'exception.
- [ ] **[CLIENT][P2]** ✅ **DÉBLOQUÉE (20/08)** — Réintégrer la DATE comme 5ᵉ étape de l'assistant, **après**
      `availableOn`. ⚠ Cette fois la réponse devra réellement affecter l'affichage
      (grisé), contrairement à la maquette qui la jette. Position dans la séquence
      à décider : avant ou après les invités.
- [ ] **[CLIENT][P2]** Filtre par **quartier** absent du contrat public : les
      puces de l'accueil ne sont donc pas cliquables (D204). Contrat neuf.
- [ ] **[CLIENT][P3]** Photos des catégories de prestataires : la zone média
      existe et attend des **visuels locaux** (D208). Un `<img>` à poser, rien
      d'autre. Ne pas rebrancher Unsplash en production.
- [ ] **[UI][P3]** ⚠ **RENFORCÉE (D223)** — c'est exactement le schéma qui a produit les trois écarts de chrome du point D ; `@zwadj/ui` héberge désormais du code de parcours partagé, l'endroit existe. `revealAndFocus` est DUPLIQUÉ : `apps/pro/src/lib/reveal.ts` et
      la garde `scrollIntoView?.()` recopiée dans `filter-wizard.tsx`. Deux copies
      d'un comportement d'accessibilité divergeront. À consolider dans `@zwadj/ui`.
- [ ] **[I18N][P1]** ⚠ **~136 clés arabes ajoutées cette session ne sont pas
      relues** par un locuteur (walkin, home, footer, wizard, payment). La porte
      de parité compte, elle ne lit pas.
- [ ] **[SEC][P0]** ⚠ **Rotation des identifiants — TOUJOURS PAS FAITE.**
      `GOOGLE_CLIENT_SECRET` (Lot 8) et les clés Chargily de test, qui ont vécu en
      clair dans `.env.example` SUIVI (D200) et dans un fil de discussion.
- [ ] **[E3C][P0]** ⚠ **Webhook au `providerCheckoutId` INCONNU** : l'ignorer
      proprement, pas échouer. Un délai dépassé à la création peut laisser une
      session que nous n'avons jamais enregistrée. (D197)
- [ ] **[TEST][P1]** ⚠ **Rien ne relie une clé i18n LEVÉE par le code à une clé
      EXISTANTE au catalogue.** La porte de parité compare FR à AR : trois clés
      `payment.errors.*` ont vécu absentes **des deux côtés** sans rien faire
      rougir. Un test qui relève les littéraux `"x.errors.y"` des sources et
      exige leur présence rendrait ce silence bruyant — même angle mort que D182.
      (D199)
- [ ] **[E3][P1]** Trancher si `Venue.cashbackRateBps` (D35) **est** la remise de
      checkout ou un mécanisme distinct. `cashback_claims` décrit une réclamation
      vérifiée *après coup* — pas une réduction *au moment de payer*.
      `discountAppliedCents = 0` tant que ce n'est pas arbitré, et un test le
      fige : il rougira le jour de la décision. (D189)
- [ ] **[TEST][P2]** `contract-api-client.int-spec.ts` ne voit pas un chemin
      construit hors d'un appel direct à `request`. Un test qui **compte** les
      appels relevés par fichier client rendrait ce silence bruyant : aujourd'hui,
      un client dont tous les chemins deviennent invisibles ne fait rougir rien.
      (D182)
- [ ] **[I18N][P1]** Relecture humaine de l'arabe : **16 clés de Q2 + 3 de Q3a**
      (`stats`, `st_CANCELLED`, `cancel`). Deux choix de traduction signalés —
      registre de `sv_IN_PERSON`, et la négation de `deliverHint`. Même statut
      que R3 : écrit par le modèle, **non relu, à faire avant prod**.
- [x] **[REPO][P1]** ~~Remplacer `AGENTS.md` du **dépôt** par la copie du
      projet~~ — ✅ **clos le 16/08/2026** : l'écart mesuré dépôt ↔ projet était
      d'**une ligne vide finale**, pas de ~150 lignes. La resynchronisation avait
      déjà eu lieu ; c'est la dette qui était périmée.
- [ ] **[BACK][PRO][P3]** ⏸ **Q5 — REPORTÉ jusqu'aux comptes salariés (D193).**
      `Venue.ownerId` → `ProProfile.userId` **`@unique`** : une salle a
      **exactement un** utilisateur pro, aucune table d'appartenance. Un verrou
      exclusif n'a personne à exclure, et ses deux « cas limites » (onglet fermé,
      deux onglets du même pro) sont les **seuls** cas existants. **Rien n'est
      construit d'ici là.** Déclencheur de réouverture : le jour où une salle
      pourra avoir un second utilisateur.
- [ ] **[BACK][P2]** Divergence de chaîne sur `revise()` concurrent (D194) — **à
      ne pas confondre avec Q5**. Deux onglets créent deux **versions**, pas une
      écriture perdue ; deux `ACCEPTED` sur la même chaîne violeraient
      `quotes_one_accepted_per_chain` **en 500** (D184). Un verrou d'écran ne
      couvre pas ça : c'est un contrôle de version à l'écriture. Non cadré.

### Dettes ouvertes relevées pendant la tranche
- [ ] `venue.ui.aside.account` **orpheline** dans `fr.json`/`ar.json` depuis R2b
      (parité intacte). Nettoyer ou rétablir l'entrée. [I18N][P3]
- [ ] `e2e/baselines/a11y.json` : `h2` et `p` de « pro nouvelle salle » **non
      touchés** — à retirer seulement s'ils sont réellement résorbés au prochain
      passage complet, jamais par régénération globale (D152). [E2E][P2]
- [ ] Salle de fixture e2e : `/` reste `donneesPropres: false`, mesuré à vide.
      Solderait aussi la dette T2 du calendrier. [E2E][P2]
- [ ] ⚠ Commentaire **inversé** dans `schema.prisma` sur `quoteId` (« NULL pour un
      walk-in ») : c'est le parcours EN LIGNE qui le laisse nul (D159). [BACK][P3]
- [ ] Le panneau gauche et `ProNav` portent désormais les **mêmes** entrées dans
      le **même** ordre. La maquette duplique pareillement ; nommé pour que ce
      soit un choix. [PRO][P3]

## PHASE B+C — Flux B (créneaux/prix) et Flux C (visites) — ✅ LIVRÉS

> Audit du **01/08/2026** sur le zip de Ko. ⛔ **Le dépôt est actuellement CASSÉ** —
> voir la section « Dette de réconciliation » en fin de document, à traiter AVANT
> tout nouveau lot.

### Flux B — ✅ TERMINÉ (B1 → B6)
- [x] **B1** — CRUD créneaux de fête `/venues/:id/slot-templates` [BACK][P0]
- [x] **B2** — moteur de prix PUR + `PricingRule` par créneau (D46), FK composite, `roundToDinar` [BACK][P0]
- [x] **B3** — `GET /venues/:slug/availability` + blocages pro (D48–D51), moteur pur à 4 états [BACK][P0]
- [x] **B4a→d** — UI Pro : 9 méthodes `api-client`, créneaux+prix (D52), variantes (D53), blocages (D54) [PRO][P0]
- [x] **B5** — calendrier client de disponibilité et de prix (D56) [CLIENT][P0]
- [x] **B6** — calendrier de la salle côté pro, **lecture seule**, sur l'endpoint PUBLIC [PRO][P0]
- [x] ~~**À l'acceptation d'une réservation** (lot ultérieur) : attraper `bookings_no_overlap_accepted_confirmed` pour la traduire en conflit propre, **jamais la redoubler** applicativement [BACK][P0]~~ ⛔ **PÉRIMÉE, BARRÉE LE 23/09/2026 (D303)** — même entrée que celle de B3 (PHASE 10), même motif : la traduction existe depuis `909702a` et est mesurée ; c'est le chemin de F1 (cadrage du rang 23, § 9).

### Flux C — ✅ TERMINÉ (C1 → C5b)
- [x] **C1** — plages hebdomadaires de visite, CRUD pro, aucune migration [BACK][P0]
- [x] **C2** — `GET /venues/:slug/visit-slots`, moteur pur, durée fixe 30 min (D58) [BACK][P0]
- [x] **C2b** — exclusivité en base (D59) + canaux pro (D60), migration `visits_exclusive_and_pro_channels` [BACK][P0]
- [x] **C3** — 3 routes client (`POST /venues/:slug/visit-bookings`, `GET /me/visit-bookings`, `DELETE /visit-bookings/:id`), migration `visit_booking_contact_phone`, port WhatsApp + adaptateur dev (D61/D62/D63) [BACK][P0]
- [x] **C3b** — `GET`/`DELETE /pro/venues/:id/visit-bookings`, notification du CLIENT à l'annulation par le pro, section pro dédiée (D70) [BACK][PRO][P0]
- [x] **C4** — écran pro des plages de visite [PRO][P0]
- [x] **C5** — panneau de prise de rendez-vous sur la page salle + `createVisitBookingsClient` [CLIENT][P0]
- [x] **C5b** — « Mes rendez-vous » dans l'espace compte (liste, annulation, garde de forme) [CLIENT][P0]
- [ ] ⛔ **Surface de réglage des canaux D60** — le pro **subit** ses défauts (e-mail activé, WhatsApp désactivé) depuis C2b : schéma, `CHECK pro_profiles_one_channel_required` et `proNotificationChannelsSchema` existent, **aucun endpoint, aucun écran**. Dernière dette du Flux C [BACK][PRO][P0]
- [ ] **Fournisseur WhatsApp réel** — le port existe (D63), le transport non. Variables à ajouter à `PROD_REQUIRED_EXPLICIT` [BACK][P1]
- [ ] **Onglet « historique »** des rendez-vous pro — `listForVenue` autorise le passé (D70), l'écran ne demande que 92 jours à venir [PRO][P2]

### Tranche A13 — styles et type de mariage — ✅ LIVRÉE
- [x] **A13a** — migration `venue_styles_and_ceremony_type`, filtre styles en **OU** (D65), type de cérémonie **inclusif et asymétrique** (D66), plage de capacité (D68) [BACK][P0]
- [x] **A13b** — panneau de filtres au design : curseurs à **deux poignées**, règle « poignée en butée ⇒ paramètre OMIS » (D69) [CLIENT][P0]
- [x] **A13c** — saisie pro des styles et du type ; effacer le type envoie **`null`**, jamais rien [PRO][P0]
- [ ] **Leçon de découpage** — A13b a livré des filtres client sur une donnée que le pro ne pouvait pas encore saisir. **Un sujet API + pro + client tient désormais dans UN lot** (décision de Ko) [PROCESS][P0]

### Passes UI — ✅ LIVRÉES (UI-D1 → UI-D5)
- [x] **UI-D1** — onglet actif souligné + mode sombre (D64) ; `globals.css` MORT supprimé (543 lignes, palette framboise périmée) [CLIENT][P0]
- [x] **UI-D2** — correction de la régression causée par UI-D1 côté pro (accent à **1,12:1**, invisible) ; bascule de thème partagée dans `packages/ui` [SHARED][P0]
- [x] **UI-D3** — **clair par défaut** (`prefers-color-scheme` retiré des 3 feuilles) ; listes du panneau stylées ; icônes d'équipements partagées [SHARED][P0]
- [x] **UI-D4** — filtres en colonne gauche ; boutons langue/thème sur **toutes** les pages pro (`shell/pro-header.tsx`, pas `dashboard.tsx` qui n'est plus routé) ; seed de démonstration séparé [SHARED][P0]
- [x] **UI-D5** — cartes de résultats au design + jeu de salles fictives (`preview-venues.ts`, non-production, bandeau visible) ; `formatRating` [CLIENT][P0]
- [ ] ⛔ **Étiquette de tri « Recommandé » alors que la valeur reste `recent`** — l'écran annonce un classement que le serveur ne fait pas, et aucun algorithme n'est défini (23.8). Revenir au libellé honnête, ou tenir la promesse [PRODUCT][P0]

---

## ⛔ DETTE DE RÉCONCILIATION — à traiter AVANT tout nouveau lot

Trois régressions constatées sur le zip de Ko, **un seul mécanisme** : UI-D5 a été construit sur une base antérieure à C5/C5b et a écrasé des fichiers déjà corrigés.

- [ ] **①** Remettre dans `packages/api-client/src/index.ts` :
      `export { createVisitBookingsClient, type VisitBookingsClient } from "./visit-bookings-client";`
      — sans elle, **C5 et C5b ne compilent pas** (4 erreurs `TS2305`) [SHARED][P0]
- [ ] **②** Restaurer **21 clés i18n** dans les deux locales : les 8 de `account.ui.visits`, les 12 de `venueDetail.visit`. 6 tests en échec (`MISSING_MESSAGE`) [SHARED][P0]
- [ ] **③** Supprimer deux fichiers **orphelins** que les zips différentiels n'ont pas pu retirer : `apps/client/src/components/theme-toggle.tsx` et `apps/pro/src/venues/amenity-icon.tsx` [SHARED][P1]
- [ ] **④** Rejouer les six portes et vérifier les repères : **7 projets · 688 unitaires · 297 intégration · 631 = 631** [PROCESS][P0]

### Ce que cet incident apprend, à appliquer désormais
- [ ] **La porte i18n ne voit PAS une suppression symétrique.** 21 clés retirées des DEUX locales laissent `i18n-parity.spec.ts` **vert**. Comparer le **TOTAL** au repère du document de continuité, pas seulement FR à AR [PROCESS][P0]
- [ ] **Un zip différentiel ne peut pas exprimer une suppression.** Toute livraison qui supprime ou déplace un fichier doit le **dire explicitement** (`git diff --name-only --diff-filter=D`) [PROCESS][P0]
- [ ] **Un lot construit sur une base antérieure écrase les corrections.** Après chaque extraction : `git status --short`, et diff des fichiers PARTAGÉS (`index.ts`, JSON i18n) avant de commiter [PROCESS][P0]

---

## PHASE UIP — Refonte de l'app Pro — ✅ LIVRÉE (D130 → D149)

### Livré
- [x] **UIP-A — Coquille** : top panel 5 entrées, libellé adaptatif « Ma salle / Mes salles », panneau gauche sur le seul tableau de bord, table de routes régularisée (`/` = tableau de bord, `/salles` **déclarée**, `/demandes`, `/calendrier`, `/reservations`) [PRO][P0]
- [x] **UIP-B — Parcours « client sur place »** : trois étapes numérotées, total serveur, deux issues ⑥ (« Bloquer la date » = convert + accept ; « Enregistrer » = convert seul, ne verrouille rien) [PRO][P0]
- [x] **D135 — contact** : e-mail facultatif, téléphone obligatoire. ⚠ Aucune migration : la base le disait déjà, seules les bornes Zod étaient plus strictes [BACK][SHARED][P0]
- [x] **UIP-C — Assistant de salle en 7 étapes**, salle créée à la fin de l'étape 1, étape portée par l'URL [PRO][P0]
- [x] **Refonte graphique** : top panel en capitales, panneau gauche avec section « Devis » dépliable, calendrier réel comme sélecteur de date, labels visibles, « Modifier le devis » (révision, pas création) [PRO][P0]
- [x] **Correctif calendrier + visites** : route pro `GET /pro/venues/:id/availability` (D145/D146), fenêtre importée du contrat (D147) [BACK][PRO][P0]
- [x] **Correctif portes d'entrée** : `RedirectIfSession` sur connexion/inscription/mot-de-passe-oublié, exceptions assumées sur les deux routes à jeton (D148) [PRO][P0]

### ⛔ À faire par Ko — ces trois-là ne peuvent PAS être faites dans le bac à sable
- [ ] **Exécuter `pnpm test:int`.** ⚠ **Sept tests d'intégration écrits et JAMAIS exécutés** : 2 pour D135 (conversion sans e-mail ⇒ 201 + colonne NULL ; sans téléphone ⇒ 400), 5 pour D145/D147 (salle non publiée ⇒ 404 public / 200 pro ; égalité stricte des deux portes ; salle d'un autre pro ⇒ 404 ; CLIENT ⇒ 403 ; fenêtre 92 j ⇒ 200 / 93 j ⇒ 400). Ils sont le **seul** endroit qui prouve ces contrats [PROCESS][P0]
- [ ] **Régénérer ET RELIRE la baseline a11y** : `UPDATE_A11Y_BASELINE=1 pnpm test:e2e`. ⚠ Référence **bidirectionnelle** — une violation corrigée doit sortir du fichier. Écran neuf sans référence (tableau de bord), `pro nouvelle salle` reconstruit, top panel sur quatre écrans figés. Lire en premier : contraste des capitales 12 px, cases du calendrier [PROCESS][P0]
- [ ] **Vérification visuelle** de la refonte contre les maquettes : proportions dérivées des images, jamais comparées à un rendu réel [PRO][P1]

### Reste de la tranche UIP
- [ ] **UIP-D — PDF de devis** (génération serveur). ⚠ Mini-cadrage écrit AVANT code : bibliothèque, endpoint, `@Roles`, **PDF bilingue FR/AR** (polices embarquées + façonnage RTL — LA difficulté, à prouver sur un devis réel), montants venus du serveur, stockage à trancher [BACK][P1]
- [ ] **UIP-E — Fiche client** : entrée « Clients » dans le menu du profil, rattachement d'un devis à une fiche, saisie à la volée au clic sur « Envoyer ». ⚠ Mini-cadrage écrit avant code [BACK][PRO][P1]
- [ ] **Remonter `QuotesSection`**, démontée par la refonte : cinq gestes inatteignables (envoyer un brouillon existant, marquer refusé, convertir un devis ancien, historique des versions, réviser hors session) [PRO][P0]

### Ce que cette tranche apprend, à appliquer désormais
- [ ] **Un script de neutralisation compte ses EXÉCUTIONS, pas seulement ses remplacements.** `vitest -t <filtre>` sort en 0 quand rien ne correspond : trois gardes ont été lues « inutiles » alors qu'elles n'avaient jamais été mesurées (D144) [PROCESS][P0]
- [ ] **Une garde de forme se met devant un RENDU, jamais devant un chargeur sous `try/catch`** — là, elle transforme un échec honnête en valeur fausse (D133/D142) [PROCESS][P0]
- [ ] **Une décision de réutilisation d'endpoint se vérifie sur l'état RÉEL le plus courant de la donnée**, pas sur son état nominal (D146) [PROCESS][P0]
- [ ] **Un identifiant qui « ressemble » se relève, il ne se devine pas** : `Venue.ownerId` référence `ProProfile.id`, pas `User.id` (D149) [PROCESS][P0]
- [ ] **Toute borne côté front est importée du contrat**, jamais recopiée — les fenêtres se comptent **bornes incluses** (D147) [PROCESS][P0]
- [ ] **Recopier une référence, c'est parfois recopier la règle qu'on prétend réfuter** : deux fixtures d'acompte valaient pile 30 % du total, dont celles de la maquette, et ne prouvaient donc rien contre `Math.round(total * 0.3)` [PROCESS][P1]


## Lot R1 — réduction documentaire, part mécanique — 28/08/2026 (D267)

✅ **FAIT.** `ZWADJ_CONTINUITE.md` : **3 289 → 1 277 lignes**, **250 → 109 Ko** (−57 %).
Vingt-deux sections de journal déplacées **sans modification** vers trois fichiers de
`docs/history/`. ⛔ **Preuve de non-perte ligne à ligne : 0 ligne perdue**, vérifiée
contre l'archive reçue, pas contre ma propre sortie.

⚠ **Huit lignes ont été RETIRÉES, et c'est déclaré** : la consigne « exactement trois
fichiers » (caduque avec `CLAUDE.md`) et un état e2e périmé (« 33 passés », « E3 seul
verrou restant »). Retrait explicite, jamais perte silencieuse.

⛔ **Le registre des décisions D1 → D266 reste dans `ZWADJ_CONTINUITE.md`** : sans lui,
le fichier qui fait autorité sur la numérotation aurait cessé de contenir les numéros.
⚠ C'est un **LOCALISATEUR, pas un résumé** — chaque entrée est la ligne de définition
relevée dans le texte, jamais une reformulation. Mesuré : **217 des 241** numéros ont
une définition repérable, **22** n'ont qu'une mention (marquées `?`), **2** ne sont
ancrées que par leur section.

### Reste à faire — deux lots, tous deux pour Claude Code

- [ ] **[GOUVERNANCE][P0]** **R2 — réconcilier `ZWADJ_BACKLOG.md`.** 645 cases ouvertes,
      245 fermées. Les phases 0 à 24 sont le plan initial exhaustif : beaucoup de cases
      sont faites mais jamais cochées. ⚠ **Ce n'est pas une coupe, c'est un AUDIT** —
      chaque case se vérifie contre le code. Non mécanisable, donc pas faisable par
      archives : c'est un lot Claude Code.
- [ ] **[GOUVERNANCE][P1]** **R3 — `AGENTS.md` (619 lignes) vers `.claude/rules/`.**
      La documentation vise moins de 200 lignes ; un import `@` charge tout à chaque
      session, alors qu'une règle avec frontmatter `paths:` ne se charge que sur les
      fichiers correspondants. ⚠ **À vérifier avec `/context` après découpage** : le
      gain est nul s'il n'est pas mesuré.

- [ ] **[GOUVERNANCE][P2]** ⚠ **DIX-SEPT NUMÉROS DE DÉCISION NE SONT DOCUMENTÉS NULLE
      PART** — D7, D8, D13, D19 à D22, D24, D25, D28, D67, D104, D105, D108, D109, D112,
      D113. Aucun des trois documents ne les cite. Le trou préexiste à R1. ⛔ **Ne pas
      les reconstituer** : un numéro réinventé vaut moins que rien. Les rapporter et les
      considérer comme brûlés.

## Reports — bascule Claude Code — 28/08/2026 (D266)

- [ ] **[E2E][P1]** ⛔ **`fetch failed` : DISPARU, PAS EXPLIQUÉ — NE PAS FERMER.**
      Les douze échecs ne se sont pas reproduits sur le run complet (34 passés, 1 sauté).
      Rien n'a été corrigé : seule l'instrumentation D265 a été ajoutée, et elle n'a pas
      parlé faute d'occurrence. ⚠ **Une intermittence qui ne se reproduit pas une fois
      n'est pas fermée** — l'absence est même compatible avec l'hypothèse de tête (course
      keep-alive undici ↔ serveur Node, qui dépend du délai entre appels et de la charge).
      L'instrumentation reste armée : à la prochaine occurrence, relever la CHAÎNE DES
      CAUSES et rouvrir avec elle. Arbitrage toujours en attente sur une nouvelle
      tentative en mise en place.

- [x] **[E2E]** Les quinze tests B7/B8 masqués ont réellement tourné — compte réconcilié
      (17 + 2 + 1 + 15 = 35 = 34 + 1). Les trois violations de contraste de D264 ont
      disparu par la correction CSS, sans toucher à la référence.

- [ ] **[GOUVERNANCE][P0]** **Réduction documentaire — premier objet : `AGENTS.md`.**
      619 lignes importées à CHAQUE session Claude Code, contre les moins de 200
      recommandées. Total des trois documents : **496 Ko ≈ 141 k tokens**. **642 cases
      ouvertes** au backlog, dont une part correspond à des sujets déjà réglés.
      Découpage par deltas ancrés avec preuve de non-perte, jamais par régénération.
      Piste : `.claude/rules/` avec frontmatter `paths:` — ces règles ne se chargent que
      sur les fichiers correspondants, alors qu'un import `@` charge toujours tout.

- [ ] **[GOUVERNANCE][P1]** **Mémoire automatique de Claude Code : décision non prise.**
      Active par défaut, elle recharge des notes que le modèle écrit lui-même. Face à une
      discipline qui interdit de prendre un numéro de décision ailleurs que dans
      `ZWADJ_CONTINUITE.md`, c'est une seconde autorité. La couper ou l'accepter
      sciemment — mais trancher.

## Reports du lot e2e — 28/08/2026 (D265)

- [ ] **[E2E][P0]** ⛔ **`neutralize-b7.py` N'A PAS ÉTÉ EXÉCUTÉ** — Playwright n'est pas
      lançable dans l'environnement de rédaction. Les trois cibles sont écrites et leurs
      ancres vérifiées à l'unité, mais **tant que la campagne n'a pas tourné, la
      correction B7 n'est pas prouvée**. ⚠ Compter ~3 à 5 min par cible : chaque
      mutation relance une pile complète.

- [ ] **[E2E][P0]** ⛔ **`fetch failed` : cause encore INCONNUE.** L'instrumentation la
      nommera au prochain run. Hypothèse de tête : course keep-alive undici ↔ serveur
      Node (asymétrie mesurée : seul `register` utilise le `fetch` global, `login` passe
      par `context.request` et ne tombe pas). Seconde piste : `nest start --watch`
      redémarre l'API pendant la suite — à écarter en lisant les journaux `webServer`
      (« Nest application successfully started » ne doit apparaître qu'UNE fois).
      ⚠ **Arbitrage en attente** : si la cause est bien la socket, faut-il une nouvelle
      tentative sur les erreurs de CONNEXION dans le harnais ? Le `retries: 0` de la
      config vise les ASSERTIONS ; réessayer une mise en place n'est pas la même chose.
      Décision non prise.

- [ ] **[A11Y][P1]** **`.filters-reset` et `.range-value` sont TOLÉRÉES depuis toujours**
      dans `a11y.json` (`client recherche de salles`). `--accent-text` (D264) les rend
      corrigeables : deux lignes de CSS, puis **retrait** de deux entrées de la référence.
      Gain net, hors du périmètre de D264. `.results-count-n` et `.wz-eyebrow` ne sont pas
      dans la référence — elles rougiront si l'étape 3 les atteint.

## Reports du lot B8 — contraste Client — 28/08/2026 (D264)

- [ ] **[A11Y][P0]** ⛔ **CINQ AUTRES TEXTES EN `--accent`, mesurés, non corrigés** :
      `.filters-reset` (l. 104, 12 px, 4,16:1), `.range-value` (l. 194, 13 px, 4,16:1),
      `.results-count-n` (l. 395, 4,39:1), `.wz-eyebrow` (l. 1270, 12 px, 4,39:1).
      Toutes sous 4,5:1. Hors du périmètre validé de D264 (trois sélecteurs nommés).
      ⚠ **B8 s'est arrêté au premier écran** : ses onze tests suivants n'ont pas tourné.
      Ces quatre-là les feront rougir. Correctif identique : `var(--accent-text)`.
      `.locale-switch:hover` (l. 68 et 298) passe — elle est sur `--surface`.

- [ ] **[CSS][P3]** `.locale-switch:hover` est déclaré **deux fois à l'identique**
      (`theme.css` l. 68 et l. 298). Sans effet observable, mais deux endroits pour
      une même règle.

- [x] **[E2E][P1]** ⛔ **NE PAS RÉGÉNÉRER LA RÉFÉRENCE B7 AVANT LE CORRECTIF DU HARNAIS.**
      L'ajout de `--accent-text` fera légitimement rougir B7. La régénérer maintenant
      graverait au passage `--hm-gutter: ""` — une valeur vide prise pour une mesure.
      Ordre : correctif B7, PUIS régénération.
      ✅ **FERMÉE le 30/08/2026 — l'ordre prescrit A ÉTÉ respecté.** Relevé dans
      `e2e/baselines/tokens.json` (et non déduit) : `"--accent-text": "#b32c36"` en
      clair et `"#e07a84"` en sombre, `"--dark-accent-text": "#e07a84"`, et surtout
      `".hm --hm-gutter": "clamp(18px, 5vw, 80px)"` — **une vraie valeur**, pas la
      chaîne vide que l'entrée existait pour empêcher. Le correctif B7 (D265) a donc
      précédé la régénération. ⚠ Fermée sur la LECTURE DU FICHIER, pas sur un run e2e :
      la suite est validée par Ko (34 passés, 1 saut légitime T2).

## Reports du lot L1 — porte lint — 28/08/2026 (D263)

### ⛔ Ouverts, mesurés, NON corrigés

- [x] **[API][P0]** ⛔ **CHEMIN DE L'ARGENT — le statut de la demande est un LITTÉRAL.**
      `quote-store.prisma.ts` l. 140 écrit `status: "PENDING"` au lieu de
      `BookingStatus.PENDING`. Mesuré : le littéral est écrit **trois fois** et aucune
      des trois ne dérive de l'autorité — l'adaptateur, `quote-store.prisma.spec.ts`
      l. 254, `quotes.int-spec.ts` l. 449. Elles s'accorderaient entre elles et se
      tromperaient ensemble. Même classe que **D259** (`BookingSource`).
      ⚠ **Correctif tenu prêt, en attente d'arbitrage** : chemin de l'argent, donc
      analyse des modes de défaillance écrite avant code. Le lot tient en trois lignes
      + deux attentes reliées à l'autorité.
      ⛔ **L'import `BookingStatus` qui le signalait a été supprimé** pour fermer la
      porte lint : cette entrée et le commentaire posé sur `convertirEnDemande` sont
      désormais la seule trace.
      ✅ **FERMÉ le 30/08/2026 par D268** — mais **PAS comme demandé ici**, et l'écart
      est le cœur du lot : faire dériver les TROIS sites ne traitait pas le motif
      invoqué (« se tromperaient ensemble »), il le déplaçait — trois sites dérivés
      d'une même source s'accordent encore (D241). Retenu : l'adaptateur et la spec
      unitaire dérivent, **`quotes.int-spec.ts` GARDE son littéral** comme témoin
      indépendant contre PostgreSQL, exigé par une garde de source **bilatérale**.
      Motif complet en D268, pas seulement en commentaire. 3/3 cibles mordent.

- [ ] **[QUALITÉ][P1]** ⛔ **AUCUNE RÈGLE ESLINT À INFORMATION DE TYPES N'EST ACTIVE.**
      `packages/config/eslint/base.mjs` n'utilise que `tseslint.configs.recommended`.
      Sont donc éteintes : `no-floating-promises`, `await-thenable`,
      `no-misused-promises`, `only-throw-error`. Sur une base NestJS pleine d'`async`
      et de `$transaction`, **`no-floating-promises` est celle qui coûte** — une
      promesse non attendue sur le chemin de l'argent n'apparaît dans aucun test.
      ⚠ Découvert parce qu'une directive `eslint-disable` exemptait une règle qui
      n'avait jamais tourné : **une exemption peut être la preuve qu'une garde
      n'existe pas.** Les activer allumerait tout le dépôt : lot à part entière,
      à chiffrer avant de décider.

## Reports du lot S11-a — 28/08/2026 (D261, D262)

### ⛔ Défaut LIVRÉ puis corrigé — à ne pas oublier (D262)

- [x] **[QUALITÉ][P0]** ⛔ **L'archive S11-a a cassé la porte typecheck.** Une seule
      erreur (`TS2339` sur `SlotBounds`), dans un fichier de test, causée par
      `Parameters<>` appliqué à une fonction **générique** — qui efface le paramètre
      de type et le remplace par sa contrainte. **Corrigé.** ⛔ **La faute de méthode
      est plus grave que le défaut** : l'erreur était visible dans le bac à sable
      depuis le début, noyée dans 586 erreurs de talon, et `tsc` n'a **jamais été
      lancé** parce que la porte était déclarée « non mesurée ». Le harnais porte
      désormais une mesure `types` restreinte et **deux cibles que seul `tsc` voit**.
- [ ] **[INFRA][P2]** ⚠ **La mesure `types` du harnais est PARTIELLE et le dit.**
      Elle couvre `booking-admission.ts`, son spec et `availability-time.ts` — les
      seuls fichiers du lot sans import Prisma. `booking-notification-input.ts` et
      `bookings.service.ts` n'y sont pas : leur typecheck dépend du client généré.
      Se lève en autorisant `binaries.prisma.sh` en sortie du bac à sable (déjà au
      backlog).

⚠ Mêmes règles : mesurés, délibérément non corrigés. Un lot de refactoring rapporte un
défaut, il ne le corrige pas au passage.

### ⛔ Deux constats sur l'ÉTAT DU DÉPÔT REÇU, pas sur le code de ce lot

- [ ] **[QUALITÉ][P0]** ⛔ **LA PORTE LINT ÉTAIT DÉJÀ ROUGE À L'ENTRÉE.**
      `pnpm --filter @zwadj/api lint` rend **3 erreurs + 1 avertissement**, toutes dans
      `quotes.service.ts` : `BookingStatus` (l. 49), `QUOTE_SELECT` (l. 75) et
      `DevisChiffre` (l. 76) sont **importés et jamais utilisés** — restes de S10b-1/S10b-2.
      Vérifié : le fichier est **identique** dans l'archive reçue, donc le défaut préexiste
      à S11-a. ⛔ **S10b a été déclaré complet avec une porte rouge** — exactement ce que
      D218 interdit. Non corrigé ici : S11-a n'a pas à toucher `quotes.service.ts`.
      (Le quatrième signalement est un `eslint-disable` devenu inutile dans
      `domain-events.spec.ts` l. 122.)

- [ ] **[GOUVERNANCE][P0]** ⛔ **`AGENTS.md` DU DÉPÔT EST PÉRIMÉ DEPUIS ~LE 20/08.**
      Mesuré : la copie du dépôt fait **370 lignes**, celle de la base de connaissances
      **538**. Il lui manque **cinq sections entières** — « Harnais de neutralisation : cinq
      exigences », « Campagne DIP/ISP/SRP (S8→S10b) », « Campagne SOLID/Strategy », « Session
      des 23 et 24/08 », « Notes d'environnement (bac à sable) » — et son tableau d'état
      s'arrête au **16/08/2026**. Seules **2 lignes** existent côté dépôt sans exister côté
      base, et toutes deux sont **périmées** (le titre daté, et `availableOn` marqué « cadré,
      4 arbitrages en attente » alors que D227 est livré depuis le 24/08).
      ⚠ **Conséquence** : un repartir-d'un-export-frais donne les règles du 16/08 — c'est-à-dire
      sans la discipline des harnais ni les notes de bac à sable. L'archive de ce lot livre
      la version **complète** ; à vérifier côté dépôt de Ko avant de la reprendre.

### Décisions produit non prises

- **`cancelAsClient` ne publie AUCUN événement.** Mesuré : les quatre autres transitions
  appellent `events.publish`, celle-ci non. Le pro n'est donc **jamais prévenu** qu'un
  client annule — y compris depuis `ACCEPTED`, où D83 juge le préjudice assez sérieux pour
  exiger un motif du client. Soit le motif est demandé pour rien, soit la notification
  manque. **Personne n'a tranché.**

### Reports décidés, non oubliés

- **`addMonthsCivil(today, BOOKING_HORIZON_MONTHS)` est écrit dans QUATRE fichiers** :
  `venues-public.service.ts` l. 312, `visit-bookings.service.ts` l. 122,
  `availability-time.ts` l. 148, `booking-admission.ts` (déplacé depuis
  `bookings.service.ts`). La CONSTANTE est bien autorité unique (S1) ; l'EXPRESSION ne
  l'est pas. Sans effet tant que les quatre disent la même chose — à fermer le jour où
  l'une doit diverger, pas avant.
- ⚠ **Et les deux flux ne comparent PAS pareil** : la réservation refuse aussi le passé et
  le jour même (`<= today`), la visite ne borne que le haut (`> horizon`). C'est
  vraisemblablement voulu — une visite cet après-midi a du sens, un mariage ce soir non —
  mais ce n'est **écrit nulle part**. À consigner ou à corriger, pas à laisser deviner.
- **Un nom de client peut porter des espaces INTÉRIEURS.** `clientName` recolle prénom et
  nom puis `trim()` — qui ne nettoie que les bords. Mesuré (trois espaces au lieu de deux
  sur une fixture réaliste), consigné dans le test, **non corrigé** : resserrer une chaîne
  au passage d'un lot de refactoring, c'est changer le comportement en douce.
- **`BookingsService` reste sans spec unitaire.** S11-a rend ses DÉCISIONS mesurables en
  les sortant ; il ne mesure toujours pas l'orchestration (l'ordre des lectures, la
  publication après écriture). Cela demanderait un septième `as unknown as PrismaService`
  — voir D258. À rouvrir avec S11-b, pas avant.

## Reports de la campagne DIP/ISP/SRP — 28/08/2026 (D252 à D260)

⚠ Mêmes règles qu'en S : mesurés, délibérément non corrigés, chacun rattaché à son
D-numéro. Un lot de refactoring rapporte un défaut, il ne le corrige pas au passage.

### ⛔ Bloquants pour la suite

- **`migration-non-empty.int-spec.ts` — `beforeAll` bloqué à 60 000 ms, DEUX FOIS.**
  Ce n'est pas de la lenteur : c'est un `DROP DATABASE` qui attend, pile au plafond du
  hook. **Les sept tests sont SAUTÉS**, donc la garde de migration — la seule qui prouve
  qu'une migration passe sur une base ayant déjà servi — ne tourne plus. Un diagnostic a
  été posé (`statement_timeout = 20s`, occupants de `zwadj_migration_test` relevés et
  **nommés dans le message**), mais **la cause n'est pas établie**. Pistes non vérifiées :
  session pgAdmin/psql ouverte, process vitest tué lors d'un run précédent.
- **E3d-2 — expiration des `PENDING` (D255).** Cadrée, arbitrée à **30 minutes sous
  condition**, non livrée : la durée de vie d'un lien Chargily n'est pas mesurée, et une
  expiration plus courte qu'elle produit un **paiement orphelin**.

### Décisions produit non prises

- **`PROCESSING` doit-il bloquer comme `PENDING` ?** (D255) L'index partiel ne couvre que
  `PENDING`. Ce n'est pas une régression — `findFirst` ne regardait déjà que `PENDING` —
  mais personne n'a tranché.
- **Le trou au-dessus de `BUDGET_CEILING`** (D254, option (a) retenue) : aucun plafond
  entre 1 500 000 DA et l'infini n'est exprimable, alors que `basePriceSchema` n'a
  **aucune borne haute**. Sans effet tant qu'aucune salle n'y est publiée ; à rouvrir le
  jour où c'est le cas.

### Reports décidés, non oubliés

- ~~**S11 — SRP sur `BookingsService`**~~ — **S11-a LIVRÉ le 28/08 (D261).** ⚠ Deux
  points du découpage proposé se sont révélés faux à la vérification, et c'est consigné
  dans `ZWADJ_CONTINUITE.md` : (1) la mesure réelle de `create` était **189 lignes**, pas
  200 ; (2) mettre les aides de notification **dans** `booking-notifications.service.ts`
  aurait défait **D63** — le service aurait dû injecter son propre destinataire. Elles
  vivent dans un module pur voisin. **S11-b (chiffrage) reste entier**, cadrage exigé.
- **S12 à S14** — `AuthService` (825 lignes, 22 accès, double casté), `WalkinJourney`
  (798 lignes, 293 avertissements exemptés), longue traîne DIP. ⚠ Par la règle de **D258**,
  la longue traîne n'est PAS justifiée par le compte d'imports Prisma : seuls comptent les
  blocs transactionnels et les six doubles castés restants.
  ⛔ *(D302, 23/09/2026 : l'audit SOLID du 09/09 les retrouve — **A2, reste** : `BookingsService.create`,
  `QuotesService` (lectures et `Prisma.InputJsonValue`), `AuthService` ; **A4** : `WalkinJourney`, « un seul
  composant d'environ 650 lignes physiques » selon l'audit — le fichier en compte 798 à `HEAD` : deux définitions
  différentes, non soustraites (D290). **Pas d'entrée neuve.** Le chiffrage extrait par S11-b y est compté comme
  résolu.)*
- **Les six doubles `as unknown as PrismaService` restants** (D258) — c'est le défaut
  chiffrable, pas les 21 imports. `auth.service.spec.ts` est le plus gros, et il simule
  `$transaction` par un passe-plat.
- **`schema.prisma` vs énumérations partagées** (D237, confirmé par **D259**) —
  `BookingSource` manquait depuis l'origine dans `@zwadj/types`. Un test qui diffe les
  deux fermerait la classe entière ; il n'existe toujours pas.
- **`password.service.spec.ts`** — argon2 consomme 3,4 s d'un budget de 5 s au repos.
  Rougit sous charge. Non traité : relever le délai masquerait un vrai test devenu lent.
  ⛔ **REQUALIFIÉ EN BLOQUANT le 30/08/2026 (D269).** Mesuré **en isolation, machine
  libérée** : rouge (1/7) puis vert (7/7) sur deux runs consécutifs. Il est donc
  intermittent **AU REPOS**, pas seulement sous charge — la formulation ci-dessus le
  sous-estimait. C'est le SEUL rouge de la passe de portes du 30/08, et il suffit à
  empêcher « 6 portes fiables à 100 % », seuil posé avant S11-b.
  ⚠ Il avorte aussi les paquets suivants depuis `--workspace-concurrency=1` : client,
  pro et api-client n'ont pas tourné du run rouge. **Décision attendue de Ko** — la
  consigne « ne pas relever le délai » tient toujours, mais elle laisse la porte rouge.
- **Sept exemptions de la garde console** (D247/D256) — désormais **plafonnées et
  vérifiées**, plus décoratives. À faire décroître ; `walkin-journey.test.tsx` (293) ne
  baissera qu'avec S13.
- **`S6 · 6/6` à relire `2/6`** (D253) si la campagne n'a pas tourné avec `--int`.

## Reports de la campagne SOLID/Strategy — 22/08/2026 (D233 à D248)

⚠ Inscrits ici parce qu'ils ont été **mesurés puis délibérément non corrigés** : un lot de
refactoring rapporte un défaut, il ne le corrige pas au passage. Chacun porte son D-numéro.

⚠ ~~**Bloquant avant E3**~~ ⛔ **BLOQUE E3d** *(décision du relecteur (chat), déléguée par Ko le 23/09/2026, D303 — motif : c'est E3d qui pose `ACCEPTED`)* — `ACCEPTED` face à `quotes_sent_at_coherent` (D238) : un brouillon se convertit sans remise, E3 posera `ACCEPTED` sur une ligne à `sent_at` nul, la contrainte lèvera **sur le chemin de l'argent**. Non corrigé faute de test rouge (E3c en pause, `PAYMENTS_ENABLED=false`).

⚠ ~~**Avant E3c** — rendre atomique `findOrCreatePendingIntent` (D244) : la séquence chercher-puis-créer n'est pas transactionnelle ; le port est désormais l'endroit où la fermer sans toucher au service.~~ ✅ **CLOSE PAR D255** *(décision du relecteur (chat), déléguée par Ko le 23/09/2026, D303)* — l'index unique partiel `UNIQUE (booking_id) WHERE status = 'PENDING'` (migration `20260824120000_payment_one_pending_per_booking`) et la relecture du perdant ; cibles **E1 à E5** de `neutralisation/neutralize-e3d1-s8.py`, confirmées par D302. ⛔ **AVEC LA RÉSERVE DE R1** (décision du même jour) : ce harnais juge par le **seul code de sortie** et ses journaux ne gardent pas la sortie en échec (relevé D303) — tant qu'il n'est pas corrigé, E1 à E5 ne valent preuve que par une neutralisation dont on a **lu** l'échec. Entrée R1, reports de D302.

**Reports décidés, non oubliés :**
- **F2** — décomposition d'`AuthService`, `BookingsService`, `WalkinJourney`. À réévaluer maintenant que S5b a dégagé la concurrence. ⛔ *(D302 : même objet que l'A2 (reste) et l'A4 de l'audit SOLID du 09/09 — à ne pas confondre avec « audit SOLID 09/09 · F2 », un défaut de conversion de devis. Voir S12 à S14.)*
- **F7** — découpe de `VenueProClient` : pas de pression de changement.
- **Ports auth et devis** — écartés au cadrage S5a ; l'un demande F2 d'abord, l'autre n'a pas de consommateur.
- **Port de LECTURE de la réservation** — `ownedBooking`/`ownedVenue` portent les règles de propriété et restent mesurées en intégration seulement (D245).
- **Garde D166** — retirée (D239). La regagner demanderait un harnais qui sème AVANT une migration choisie, pas avant la dernière : autre chose que B9/D123.
- **Sept exemptions de la garde console** (D247) — 119 avertissements, datés et comptés dans les deux `test-setup.ts`. À faire décroître, jamais croître.
- **`schema.prisma` vs base** — rien ne les compare (D237). Un test qui diffe les énumérations fermerait la classe entière de défauts.
- ~~**D227 (hors horizon) et D228 (`maxPrice`)** — toujours non livrés~~ — **LIVRÉS**
  (D227/D228 le 24/08, défaut B fermé par **D254** le 25/08).

## Report — 30/08/2026, trouvé en marge du lot `BookingStatus.PENDING`

### ⛔ Ouverts, mesurés, NON corrigés

- [ ] **[API][P1]** ⚠ **`payment-intent.spec.ts` recopie SEPT statuts en littéraux — même
      classe que D263 et D259, un troisième site.** `BookingSnapshot.status`
      (`payment-intent.ts` l. 17) est typé `string`, pas `BookingStatus` : rien n'oblige les
      appelants à dériver de l'autorité. Le spec écrit en dur `"ACCEPTED"` (l. 11),
      `"PENDING"` (l. 23, 47, 50), `"CONFIRMED"` (l. 58, 69), et la liste de la ligne 58
      (`"PENDING", "CONFIRMED", "DECLINED", "CANCELLED", "COMPLETED", "NO_SHOW", "EXPIRED"`).
      ⚠ **Le commentaire des lignes 55-56 affirme le contraire du code** : « on boucle sur
      les statuts RÉELS de l'énuméré plutôt que sur une liste écrite ici » — mesuré, la
      liste EST écrite ici, à la main, et ne dérive de rien. C'est **D264** (« la règle
      existait, elle vivait dans un commentaire ») retourné : ici le commentaire décrit une
      garde qui n'existe pas.
      ⚠ **Deux valeurs de cette liste n'existent PAS dans `BookingStatus`** (`COMPLETED`,
      `NO_SHOW` — l'énuméré n'a que PENDING/ACCEPTED/DECLINED/EXPIRED/CONFIRMED/CANCELLED) :
      à vérifier si c'est un autre modèle de statut mélangé par erreur, ou une liste
      délibérément plus large que le domaine réel pour éprouver la robustesse à tout
      littéral inconnu. **Non tranché ici.**
      Non corrigé — hors périmètre du lot `BookingStatus.PENDING`, et chemin de l'argent
      (`payment-intent.ts` décide l'ouverture d'un paiement) : arbitrage écrit avant tout
      code, à la même exigence que lui.
      ⚠ **L'arbitrage de D268 s'y appliquera** : la question n'est pas « tout faire
      dériver » mais « quelle est l'autorité de CE site ». Ici il n'y a pas de témoin
      base à préserver — `payment-intent.spec.ts` est un module pur, sans I/O.

- [x] **[INFRA][P1]** ⛔ **LES 21 HARNAIS DE `neutralisation/` LÈVENT SUR LA CONSOLE
      WINDOWS et n'ont jamais tourné sur le poste de Ko.** Mesuré le 30/08 : au premier
      `✓` imprimé, `UnicodeEncodeError: '✓' … maps to <undefined>` (console cp1252,
      Python 3.13). ⚠ **Le pré-vol avait DÉJÀ tourné et était vert** — la trace Python
      ressemble donc à un défaut de harnais alors que la campagne allait bien, et invite
      à chercher au mauvais endroit.
      ✅ **CORRIGÉ le 30/08/2026 (D268)** — trois lignes propagées aux 21 scripts, ancre
      `import sys` unique dans chacun, compte vérifié avant et marqueur après. **22/22
      pourvus, CRLF pur, tous compilent.** Puis campagnes lancées **en série** (jamais en
      parallèle : elles mutent des sources partagées) : **164 gardes mordues sur
      173 cibles**, 0 muette, 9 `NON MESURÉE` déjà documentées.
      ⚠ **Le compteur du dépôt (« 19 scripts, 165 cibles ») est FAUX** : 22 et 173.
      Écart relevé, non expliqué.

- [ ] **[PRO][P0]** ⛔ **`venue-list.test.tsx` ÉCHOUE PAR INTERMITTENCE, ET CE N'EST PAS
      D273.** Relevé le 02/09/2026 pendant le barème de sortie de `PLAFONDS` : **3 passes
      de la suite pro sur 5** rouges sur ce fichier, message
      `Unable to find role="heading" and name "Salle El Ryad"` — c'est-à-dire une liste
      pas encore arrivée au moment de l'assertion. État machine relevé devant chaque
      passe (D270) : RAM libre 2 247–3 017 Mo, CPU 30–65 %, zéro node avant lancement.
      ⛔ **ATTRIBUÉ PAR CONTRÔLE, PAS SUPPOSÉ — et c'est le point de cette entrée.**
      L'arbre **d'avant D273** a été remonté (`git stash`) et mesuré dans les mêmes
      conditions : `venue-list.test.tsx` y échoue **aussi** (RAM 2 572 Mo, CPU 35 %).
      **Le défaut est donc ANTÉRIEUR à D273 et étranger à lui.** Sans ce contrôle, il se
      serait lu comme une régression de ce lot — et le lot aurait été refait pour rien.
      ⚠ **Famille probable : D269** — une assertion qui interroge par RÔLE et par NOM
      pendant que la donnée est encore en vol. À confronter à la règle désormais écrite
      dans `apps/pro/src/test-setup.ts` (« une attente interroge un nœud déjà tenu »),
      et à l'aide `laisserRetomber()` de `walkin-journey.test.tsx`, qui traite la même
      classe de défaut par une fenêtre `act` au lieu d'une attente.
      ⛔ **NE PAS le traiter en relevant un plafond** : ce fichier n'est pas dans
      `PLAFONDS`, et son échec n'est pas un avertissement — c'est une assertion qui
      tombe. Un plafond n'y peut rien.
      ⚠ **Deux autres fichiers ont été vus rouges une fois chacun** dans la même
      campagne — `account-settings-page.test.tsx` (avec 2 avertissements console) et,
      sous charge produite, une grappe qui touche jusqu'à 12 fichiers. **Ces derniers
      sont des EXPIRATIONS à 5 000 ms sous contention**, pas la même chose : ils
      apparaissent aussi sur l'arbre d'avant le lot, et relèvent de D270.

- [ ] **[PRO][P1]** ⛔ **LA GARDE DES SORTIES CONSOLE TOMBE SOUS CHARGE, ET LE FICHIER
      FAUTIF CHANGE — DEUX SESSIONS, MÊME SYMPTÔME.** Fil produit par la campagne du rang 6
      (03/09/2026) et **non suivi** : il sort du périmètre du lot.
      **Les trois occurrences, avec leurs mesures :**
      1. **02/09 (D272)** — `account-settings-page.test.tsx` classé **SENSIBLE à tort** par
         la sonde horloge : ses seuls échecs étaient `2 avertissement(s) de console`. La
         sonde écarte désormais un rouge dont toutes les causes sont cette garde.
      2. **02/09 (D273)** — pendant le barème de sortie de `PLAFONDS`, **3 passes sur 5**
         rouges : `venue-list.test.tsx` ×3, `account-settings-page.test.tsx` ×1.
      3. **03/09 (rang 6)** — sous **charge pure assertée** (RAM 2 408–3 020 Mo, CPU
         20–68 %, 4 processus de charge comptés devant chaque passe) : **2 rouges sur 15**,
         **tous deux `account-settings-page.test.tsx`**, message identique au caractère
         près — `Error: 2 avertissement(s) de console dans un fichier NON exempté`. Et
         **ZÉRO `venue-list` sur 30 passes**, plancher et charge confondus.
      ⚠ **HYPOTHÈSE, PAS CONCLUSION** : ce ne serait pas un fichier qui porte un défaut,
      mais **la garde console qui tombe sous charge sur le fichier que l'ordonnancement
      désigne** — le fautif variant d'une campagne à l'autre. C'est le motif que D270
      décrit pour la suite pro, vu ici sur un autre mécanisme que l'expiration.
      ⛔ **CE QUI N'EST PAS ÉTABLI** : par quel chemin la charge produit ces
      avertissements. D273 a mesuré que **sous charge, les avertissements sont la
      CONSÉQUENCE de tests interrompus** — donc un rouge de cette famille ne se juge pas
      sur une suite par ailleurs rouge. Ici la suite était **verte par ailleurs** (27/28),
      ce qui n'est pas le même cas et mérite d'être distingué.
      ⚠ **À vérifier AVANT d'ouvrir** : quels composants émettent ces deux avertissements,
      et si le nombre **2** est stable ou s'il flotte comme le compte de `walkin-journey`
      flottait (293 · 294 · 295). Un plafond n'y peut rien — c'est la question de savoir si
      la garde doit se juger différemment sous charge.

- [ ] **[CLIENT][P2]** ⚠ **LA SUITE CLIENT ÉMET DES `act(...)`.** Vu le 03/09/2026 dans le
      journal d'une passe racine (`pnpm test`), pendant la campagne du rang 6 :
      « When testing, code that causes React state updates should be wrapped into
      act(...) » y apparaît plusieurs fois pendant `@zwadj/client`, sur une suite pourtant
      **verte à 287/287**.
      ⛔ **C'EST TOUT CE QUI A ÉTÉ VU, ET RIEN DE PLUS.** Ni compte exact, ni composant
      émetteur, ni fichier de test : le journal n'a pas été dépouillé, et cette entrée
      n'affirme donc rien sur l'ampleur ni sur la cause. Famille APPARENTE D269/D273
      (`apps/pro`), dans une app que le lot en cours **ne touche pas**.
      ⚠ Point à vérifier AVANT d'ouvrir : `apps/client` a-t-il seulement une garde de
      sorties console équivalente à celle d'`apps/pro` ? Si non, ces avertissements n'ont
      jamais eu de quoi faire rougir quoi que ce soit, et l'entrée change de nature.

- [ ] **[INFRA][P1]** ⛔ **`--tout` NE JOUE PAS LES MESURES D'INTÉGRATION, ET NE LE DIT
      PAS.** Relevé le 07/09/2026 pendant la certification (D275), **non corrigé ici** :
      défaut croisé. `lancer-campagnes.py --tout` rend « **9 non mesurées** » sur
      `neutralize-e3d1-s8` (5) et `neutralize-solid-s6` (4) ; ces cibles portent
      `hors exécution : course / int-reservations / int-visites` et vivent derrière un
      drapeau **`--int`** que le tri n'emploie pas. ⛔ **Mesuré : les neuf MORDENT** —
      s6 **6/6**, e3d1-s8 **8/8**, soit **182 sur 182** au lieu des 173 annoncés.
      ⚠ **Ce sont des gardes du chemin de l'argent et des notifications** (index partiel
      d'intention de paiement, relecture du perdant sur P2002, abonnements
      `visit.booked`) : les laisser figurer comme « non mesurées » les fait lire comme
      structurellement inaccessibles, alors qu'elles sont mesurables **sur ce poste
      depuis le 30/08/2026**. C'est **D262/D268 une troisième fois** — un empêchement du
      bac à sable web recopié après sa disparition, qui couvre exactement ce qu'il
      prétend signaler.
      ⇒ **REMÈDE, deux options, à trancher** : soit `--tout` joue aussi les mesures
      `--int` (coût : ~10 min de plus, PostgreSQL requis), soit il **nomme le drapeau**
      dans son relevé au lieu d'écrire « non mesurées » sans dire par quoi. ⛔ Le
      relevé de référence « 164 mordues sur 173, 9 non mesurées déjà documentées » de
      D268 est à **relire à cette lumière** : il sous-estimait par construction.

- [ ] **[INFRA][P1]** ⛔ **LE RELEVÉ D'ÉTAT MACHINE N'A PAS D'INSTRUMENT DANS LE DÉPÔT.**
      Rapporté le 03/09/2026, **non corrigé ici** : c'est un défaut croisé, et le lot en
      cours parle de `venue-list`. ⚠ **Mesuré, pas supposé** : `LoadPercentage`,
      `FreePhysicalMemory`, `PerfFormattedData` et `Get-Counter` ont **zéro occurrence**
      dans tout le dépôt, `neutralisation/` compris. Depuis D270, **chaque** décision
      d'intermittence s'appuie sur un état machine relevé À LA MAIN, par un outil que
      personne ne peut nommer et que la session suivante ne peut pas reproduire.
      ⛔ **CE QUE ÇA A DÉJÀ COÛTÉ** : le « CPU 6 % » du cadrage D273 est devenu une cible
      inatteignable-par-construction, parce qu'on ne peut ni la reproduire ni la
      convertir — l'instrument retenu après calibration (`Win32_PerfFormattedData_PerfOS_Processor`)
      lit ~17 % là où l'écarté (`Win32_Processor.LoadPercentage`) lit `28, 30, 9, 0` sur
      la même machine à la même seconde.
      ⇒ **REMÈDE** : une sonde `neutralisation/sonde-etat-machine.py`, sur le modèle de
      `sonde-horloge.py` — un **instrument**, invoqué explicitement, pas une campagne
      (elle ne se nommerait donc pas `neutralize-*`, que le tri seul découvre). Elle rend
      RAM libre, compte de node, **inventaire des processus ≥ 100 Mo**, et CPU par
      **médiane de ≥ 5 relevés avec sa dispersion**, jamais un échantillon unique.
      ⛔ **PLUS le TOTAL des processus et leur NOMBRE — corrigé le 07/09/2026 après en
      avoir payé l'absence** (voir la section CERTIFICATION de `ZWADJ_CONTINUITE.md`).
      Cette spec portait exactement le défaut qu'elle devait corriger : un inventaire
      coupé à 100 Mo ne se compare qu'au-dessus de sa coupe, et **seul le total borne ce
      qui n'a pas été listé**. Sans lui, 300 Mo sur 1 500 sont restés inattribuables
      entre deux relevés à quatre jours d'écart. **Cinq quantités, pas trois.**
      ⚠ **Elle porte les trois lignes de reconfiguration UTF-8** (D268), sans quoi elle
      lèvera au premier caractère non-cp1252 sur ce poste.

- [ ] **[PRO][P0]** ⛔ **`act(…)` TARDIF DANS LA COQUILLE — deux fichiers de plus, et la
      porte pro n'est PAS fiable.** ⚠ **Diagnostic ISOLÉ le 30/08 (D268), pas supposé.**
      L'échec n'est **pas** une assertion : c'est la garde des sorties console
      (`apps/pro/src/test-setup.ts:172`) qui lève sur `2 avertissement(s) … dans un
      fichier NON exempté`, les deux `not wrapped in act(...)`, émis par **`BlocksSection`**
      et **`ProVenuesProvider`** — qui mettent à jour leur état APRÈS la fin du corps de
      test.
      ⛔ **C'est EXACTEMENT la cause déjà écrite** dans le commentaire de
      `venue-wizard.test.tsx` (`PLAFONDS`) : « une assertion qui finit avant la dernière
      mise à jour laisse un `act(…)` tomber après le test, tantôt un, tantôt deux ».
      **Fichiers concernés** : `services-section.test.tsx` (8ᵉ, déjà en commentaire dans
      `PLAFONDS`, « DÉCISION EN ATTENTE (Ko) ») et **`slots-section.test.tsx` (9ᵉ, jamais
      relevé)** — ce dernier reproductible **2/2** sous `--no-file-parallelism`.
      ⚠ **Trois hypothèses écartées PAR MESURE**, pour qu'on ne les reprenne pas :
      ce n'est pas un ordre de fichiers, pas un singleton i18n, **pas une pollution
      inter-fichiers** — apparié à chacun de ses pollueurs supposés (`blocks-section`,
      `a3-unexpected-responses`, `App`), `slots-section` **PASSE** ; **seul, il ÉCHOUE**.
      Les deux composants sont montés **transitivement** par le fichier lui-même
      (`EditVenuePage` dans `AppProviders`) — un grep du fichier de test ne le voit pas.
      ⚠ Le fichier fautif CHANGE selon l'ordonnancement (garde par fichier + compte qui
      flotte, D256) : `services-section` en parallèle, `slots-section` en série.
      ⚠ **Piège de diagnostic** : `pnpm test` (racine) et `pnpm --filter @zwadj/pro test`
      ne répartissent pas les fichiers pareil — le premier peut être VERT quand le second
      est ROUGE, sur le même arbre. Ne jamais conclure sur un seul des deux.
      ⚠ **Effet de bord** : le pré-vol de `neutralize-solid-s7.py` lance la suite pro
      entière, donc cette campagne **avorte au hasard**, zéro cible jouée.
      ⛔ **DÉCISION REQUISE (Ko), la même que pour le 8ᵉ fichier** : corriger les tests
      (attendre la décantation avant de rendre la main) ou inscrire des plafonds datés.
      Le dépôt tranche déjà contre la seconde : « le plafond contient le symptôme ; il ne
      soigne pas la cause ». ~~**Bloquant déclaré avant S11-b** : le chemin de l'argent
      ne s'attaque pas avec une porte fiable à 90 %.~~
      ⛔ **BARRÉ LE 08/09/2026 (D277) — LA LEVÉE DATE DU 07/09 ET N'AVAIT PAS TRAVERSÉ
      JUSQU'ICI.** La porte n'est plus « fiable à 90 % » : D275 l'a mesurée verte AU REPOS
      (six portes, e2e, **182 gardes mordues sur 182**), et D276 a ouvert le rang 8 en
      levant la consigne « aucun lot de produit ne s'ouvre avant que la porte soit verte ».
      ⛔ **DEUX AUTORITÉS NE PEUVENT PAS SE CONTREDIRE SUR « LE LOT PEUT-IL S'OUVRIR ».**
      `ZWADJ_CONTINUITE.md` ouvrait S11-b pendant que cette entrée — **ouverte**, donc lue
      comme courante — le déclarait bloqué.
      ⚠ **L'ENTRÉE, ELLE, RESTE OUVERTE, ET CE N'EST PAS UNE CONTRADICTION** : le défaut
      `act(…)` tardif sur ces deux fichiers **n'est pas corrigé**. Il est classé **défaut
      croisé de S11-b** (section « PROCHAIN LOT » de `ZWADJ_CONTINUITE.md`) : rapporté, à
      ne pas corriger dans ce lot-là. Ce qui est barré est le **verrou**, pas le défaut.
      ⚠ **Barré, pas effacé** : supprimée, la phrase se réécrirait de bonne foi plus tard.
      ⚠ **CORRECTIF LIVRÉ le 30/08/2026 (D269), ENTRÉE VOLONTAIREMENT ROUVERTE.**
      Les deux fichiers attendent désormais l'état final rendu, par deux idiomes relevés
      du dépôt. Mesuré 9/9 et 8/8 trois fois chacun, puis 17/17 deux fois ensemble.
      ⚠ Le 8ᵉ fichier (`services-section`) reste **commenté** dans `PLAFONDS` : la ligne
      n'a pas été décommentée, elle est devenue sans objet. Ne pas la réactiver.
      ⛔ **POURQUOI ELLE RESTE OUVERTE** : je l'avais cochée alors que la porte `test`
      était ROUGE (argon2). Un lot ne se certifie pas sous une porte rouge, même quand le
      rouge vient d'ailleurs — la provenance dit qui corrige, pas si la porte est verte.
      ⛔ Et la preuve manquait : j'avais mesuré la stabilité de DEUX FICHIERS, jamais
      celle des SUITES — or c'est la suite entière qui rougissait. Campagne de quinze
      exécutions demandée par Ko ; résultats consignés dans D269.

## Reports du 25/09/2026 — rang 23, sous-lot 23a : F1 et F5 codés (D305)

⚠ **Ce que 23a a croisé se RAPPORTE ici** (un lot, un objet). Détail : section D305 de `ZWADJ_CONTINUITE.md`. Forme de
Ko (D302) : ce que l'entrée **BLOQUE** ou « **à ordonner par Ko** », et son **COÛT**.
⚠ **Ce que ce lot a écrit AILLEURS dans ce fichier** : tête de la section « chemin de l'argent » (décision reçue, 23a
codé) ; entrées F1 et F5 (codées, **restent ouvertes**) ; entrée R1 (décisions du § 9, trois constats proposés comme
modes, `neutralize-rang23.py` dans sa portée).

- [ ] **[OUTIL]** **Le lint de l'API ne couvre pas `test/int`** — `apps/api` lance `eslint src prisma` (relevé dans le
  journal de la porte, `docs/preuves/D305/portes/lint.log`) : les specs d'intégration, dont celles du chemin de l'argent
  (`bookings.int-spec.ts`, `payment-intent-race.int-spec.ts`), ne sont vues que par `tsc`. Combien de fautes de lint y
  dorment : **non relevé**.
  ⇒ **BLOQUE : à ordonner par Ko.** ⇒ **COÛT** : code (le script ou la configuration eslint de `apps/api`, compte) ;
  et ce que le premier passage trouvera dans `test/int`, non estimé ; e2e : non ; cadrage chemin de l'argent : non —
  *dérivé par la session* : un outil de lint ne prouve aucune garde ; migration : non ; dépendance : non.
- [ ] **[MÉTHODE]** **La décision 4 du § 9 de R1 (« un délai dépassé n'est JAMAIS une morsure ») contre
  `neutralize-budgets.py`**, dont la garde **EST** un délai (rang 17 : il lit « Test timed out in N ms » dans le
  JUnit, **par construction**). `budgets` est **hors** de la portée de R1 (décision 4 de D304) : aujourd'hui rien ne
  se contredit. ⚠ Mais le **module de lecture partagé** (décision 2 du § 9) pourrait un jour servir à `budgets`, et
  « jamais » y serait faux. Question de portée, **au relecteur**, pas une faute de `budgets`.
  ⇒ **BLOQUE** : l'usage du module de R1 par un harnais hors de sa portée — rien avant. ⇒ **COÛT** : documentaire (une
  phrase de portée) ; aucun fichier de code tant que `budgets` n'utilise pas le module.
- [ ] **[API]** ⚠ **Pour 23b, AVANT son cadrage de code : la garde « déjà converti » de `convert` protège ce que
  l'écriture conditionnelle au statut ne couvre pas** — la conversion laisse le devis en `DRAFT` (MD-F2-2), donc un
  devis déjà converti passe toute condition de statut ; ce qui arrête la seconde conversion est l'index unique
  `bookings_quote_id_key` et la traduction de son P2002 (MD-F2-3). *Lecture de code à `6e87430`, non mesurée* ; écrite
  au § 8 du cadrage du rang 23, **au relecteur** (« dis-le avant 23b : la décision changerait »).
  ⇒ **BLOQUE : 23b** (la décision 2 du relecteur pour F2 en dépend). ⇒ **COÛT** : documentaire jusqu'à la décision ;
  puis dans 23b, sans fichier de plus que ceux du § 6.

## Reports du 24/09/2026 — rang 23 : ordre des sous-lots, décisions du relecteur, cadrage de R1, deux inférences mesurées (D304)

⚠ **Lot DOCUMENTAIRE : ce qu'il a croisé se RAPPORTE ici.** Détail : section D304 et « ⛔ CADRAGE DE R1 » de
`ZWADJ_CONTINUITE.md`. Forme de Ko (D302) : ce que l'entrée **BLOQUE** ou « **à ordonner par Ko** », et son **COÛT**.
⚠ **Ce que ce lot a écrit AILLEURS dans ce fichier** : tête de PHASE 7 (décisions D304) ; entrée `[OUTIL]` Chargily
(ce qu'elle bloque, forme de la correction) ; entrée R1 (ordonnée au rang 23, cadrée, portée, coût) ; entrée F5
(branche (2)) ; ligne de tête des entrées F1, F2, F6 (ordre arbitré).

- [ ] **[OUTIL]** ⚠ **LES SEPT HARNAIS HORS DE LA PORTÉE DE R1 NE SÉPARENT PAS NON PLUS UNE ASSERTION D'UN PLANTAGE —
  mesuré.** `horizon`, `maxprice`, `404` et `argon2` comptent une cible mordue sur « × » + titre ; or un plantage
  (`TypeError`) et un délai dépassé portent aussi « × » (`docs/preuves/D304/r1/signatures/`). `404` compte en outre deux
  cibles (C1, C3) sur une ANCRE LIBRE — une collecte en échec —, **par écrit dans le harnais** (« ne prouve pas la
  garde de C2 ») ; `act-plafonds` et `horloge` comptent les collectés puis jugent au code seul. `budgets` lit une
  signature nommée (« Test timed out in ») et n'est pas concerné. Relevé : `docs/preuves/D304/r1/lecture-sortie*`.
  ⇒ **BLOQUE : à ordonner par Ko.** ⇒ **COÛT** : code de `neutralisation/` (compte) ; six harnais ; le module de
  lecture de R1 s'il existe (sinon le même travail deux fois) ; calibration à deux bras ; e2e : non ; cadrage chemin
  de l'argent : non — *dérivé par la session* : aucun de ces six ne mute un fichier de la carte de D304 ; migration :
  non ; dépendance : non.

## Reports du 23/09/2026 — rang 23 : décisions du relecteur, et cadrage de F1, F2, F5, F6 (D303)

⚠ **Lot DOCUMENTAIRE : ce qu'il a croisé se RAPPORTE ici.** Détail : section D303 et « ⛔ CADRAGE DU RANG 23 » de
`ZWADJ_CONTINUITE.md`. Forme de Ko (D302) : ce que l'entrée **BLOQUE** ou « **à ordonner par Ko** », et son **COÛT**.
⚠ **Ce que ce lot a écrit AILLEURS dans ce fichier, pour qu'une reprise le retrouve** : le fait « pas de compte
Chargily en mode test » (PHASE 7, tableau des sous-lots et pause d'E3c) ; les décisions du relecteur (tête de PHASE 7 ;
R1, F8, R2 dans les reports de D302) ; D238 → « bloque E3d » et `findOrCreatePendingIntent` close (reports du 22/08) ;
les deux entrées « traduire l'`EXCLUDE` », barrées (B3 et Flux B) ; l'entrée « point 10 », sortie des audits et close.

### Ouverts, mesurés, NON corrigés

- [ ] **[OUTIL]** ⛔ **L'AUDIT DE SECRETS EST AVEUGLE À LA FORME D'UNE CLÉ CHARGILY — mesuré sur le seul cas réel du
  dépôt.** Les onze motifs de `neutralisation/audit-secrets.py` (D293, D298), appliqués aux **deux lignes** qui
  portaient les clés au format Chargily (`test_pk_` / `test_sk_` + 40 caractères) dans `apps/api/.env.example` aux
  commits `dc63afb` et `d52c721`, rendent **0 alerte** ; le fichier entier en rend 7, **sur d'autres lignes**
  (`docs/preuves/D303/releves/motifs-contre-cas-chargily-sortie.txt`). Le motif `chargily` exige « key » ou « secret »
  dans les 40 caractères qui SUIVENT le mot : sur ces lignes, « Chargily » est suivi de « : » puis de la valeur, et le
  mot « secrète » le précède ; une valeur nue ne porte rien de tout cela. ⇒ Une clé Chargily
  seule dans une pièce versée passerait l'audit. ⚠ D303 a ajouté un contrôle de forme **à part**, dans son enveloppant
  (`docs/preuves/D303/outils/audit-copie-hors-depot.py`) — l'instrument, lui, n'est pas retouché (D295).
  ⇒ ~~**BLOQUE : à ordonner par Ko**~~ — ⚠ mais c'est l'audit qui passera sur les **charges utiles capturées d'E3** le jour
  où elles existeront. ⛔ **(D304) BLOQUE LA REPRISE D'E3, c'est-à-dire tout lot qui manipule des clés Chargily** —
  *décision du relecteur (chat), déléguée par Ko le 24/09/2026* ; *motif* : « la seule fuite connue du dépôt a cette
  forme, et l'instrument ne la voit pas ». ✅ **La cause que la décision cite est portée par cette entrée** — vérifié le
  24/09/2026 contre la source : motif `"char" + "gily" + r"[^\n]{0,40}(k" + "ey|sec" + "ret)"`, appliqué avec
  `re.IGNORECASE` (`neutralisation/audit-secrets.py`, table `MOTIFS`). ⇒ **Forme de la correction, décidée** : la
  valeur se reconnaît **par sa FORME, pas par les mots voisins** — forme relevée par D303 : `test_pk_` ou `test_sk_`
  suivis de **40** caractères alphanumériques ; ⚠ **la variante de production est à vérifier dans la documentation
  Chargily** (non vérifiée à D304). ⇒ ~~**COÛT** : code de `neutralisation/` (compte) ; l'instrument et sa calibration (un bras
  positif de la forme réelle, un bras négatif), et sa sortie corrigée avec lui (D295) ; e2e : non ; cadrage chemin de
  l'argent : non ; migration : non ; dépendance : non.~~ ⛔ *(D304 : « forme réelle » se lisait comme « une vraie clé ».)*
  ⇒ **COÛT** : code de `neutralisation/` (compte) ; l'instrument et sa calibration — **bras positif : une valeur
  SYNTHÉTIQUE de cette forme, ASSEMBLÉE À L'EXÉCUTION, jamais une vraie clé sur le disque** ; bras négatif — et sa
  sortie corrigée avec lui (D295) ; e2e : non ; cadrage chemin de l'argent : non — *dérivé par la session, pas
  tranché* : l'audit n'est ni un calcul, ni une transition, ni le paiement, ni un harnais de garde ; migration : non ;
  dépendance : non.
- [ ] **[API]** ⚠ **UNE ATTENTE DE VERROU PLUS LONGUE QUE LE DÉLAI D'UNE TRANSACTION INTERACTIVE SORT EN 500 — INFÉRENCE,
  NON MESURÉE.** `acceptUnderVenueLock` attend le verrou de salle dans un `$transaction` interactif ; au-delà du délai de
  la transaction, l'erreur remonterait sans traduction. Relevé par le cadrage du rang 23 (« Transverse ») comme
  **existant, non introduit, non codé** ; la correction de F1 et F2 ajoute des attentes de même nature.
  ⇒ **BLOQUE : à ordonner par Ko.** ⇒ **COÛT** : d'abord une **mesure** (un rival qui tient le verrou au-delà du délai,
  sur PostgreSQL réel) ; code API si elle confirme (compte) ; e2e exigée (concurrence) ; cadrage chemin de l'argent :
  oui (`accept`) ; migration : non ; dépendance : non.

## Reports du 23/09/2026 — rang 22 : arbitrages de Ko, et les deux audits externes du 09/09 (D302)

⚠ **Lot DOCUMENTAIRE : ce qu'il a croisé se RAPPORTE ici.** Détail : section D302 de `ZWADJ_CONTINUITE.md`.
⛔ **PREMIÈRES ENTRÉES À LA FORME DE KO** (règle dans `AGENTS.md`, « Méthode ») : chaque entrée dit **CE QU'ELLE
BLOQUE** ou « **à ordonner par Ko** », et son **COÛT** en termes qui se relèvent. **Aucune étiquette P0-P3** : un
« P1 » ou « P2 » cité ici est celui **de l'audit**, et se lit comme le sien.
⇒ **SOURCES, octet pour octet** : `docs/preuves/D302/sources/zwadj-solid-strategy-audit.md` (SHA-256
`f2ab7a58…`) et `docs/preuves/D302/sources/zwadj-audit-securite.md` (`f53fe074…`) — empreintes **égales** à
celles que Ko a données. Audits faits sur `zwadj(6).zip`, mis à jour le 09/09/2026.
⇒ **« REPRODUIT PAR L'AUDIT »** : l'auditeur a rejoué le défaut avec le vrai code et une persistance **simulée**,
sous Node 24.19.0 et pnpm 11.19.0 — **ni PostgreSQL, ni ce dépôt**. Ce n'est jamais « mesuré au dépôt ». **Aucun
compteur de l'audit ne s'écrit ici comme état courant.**
⇒ **LA BASE DE L'ARCHIVE, ET CE QUI A BOUGÉ DEPUIS** — *inférence confrontée, pas une preuve d'origine* : les
fichiers que l'audit dit modifiés sont ceux de `3b327c0` (S11-b, étapes 1→3, 08/09) ; son lockfile
(`99018400…`) est celui du dépôt sous sa forme CRLF, à `3b327c0` **et à `HEAD`**. Depuis `3b327c0`, dans `apps/`,
`packages/` et à la racine, **seuls** ont bougé `bookings.service.ts` (échéances, D282 et D285),
`booking-deadline.ts` (neuf), une migration, quatre configs de test et `docker-compose.yml` (D292) : **tout autre
fichier que les audits citent est identique.** `neutralize-s11b.py` a bougé (rangs 8 et 10).
⇒ **CONFRONTATION PAR SYMBOLE, JAMAIS PAR NUMÉRO DE LIGNE** (le code a bougé depuis l'archive) : chaque entrée
nomme le symbole relu à `HEAD` (`d0a1ec4`) et son statut — **ouvert**, **clos** (par quel commit), **partiel**
ou **non confrontable**. **Nommage** : préfixé par la source — le dépôt a déjà un « F1 » (canaux D60) et des « F2 »,
« F7 » (campagne du 22/08).

### ⛔ CHEMIN DE L'ARGENT — décisions du relecteur (chat), déléguées par Ko le 23/09/2026

⚠ **La session ne les a pas prises** : elle les écrit telles que Ko les a transmises, avec leur motif (règle de
Ko, `AGENTS.md`, point E3). Un motif non transmis est écrit **non transmis**, pas complété.
⛔ **(D303, 23/09/2026) F1, F2, F6 ci-dessous — et F5, plus bas — sont CADRÉS AU RANG 23** (arbitrage de Ko) :
`ZWADJ_CONTINUITE.md`, « ⛔ CADRAGE DU RANG 23 ». Aucune ligne de code ; les entrées restent ouvertes jusqu'aux sous-lots.
⛔ **(D304, 24/09/2026) ORDRE ARBITRÉ PAR KO** : 23a (F1 + F5) → R1 → certification → 23b (F2) → 23c (F6) →
certification, tous au rang 23. ~~**23a attend la décision du relecteur sur les choix 1 à 4 du § 8 du cadrage.**~~
⛔ **(D305, 25/09/2026) Décision reçue** (méthode renforcée, bloc D305) **et 23a CODÉ** — F1 et F5 ci-dessous. Elles
restent **ouvertes** : la forme de revue ratifiée exige encore la session adverse, la décision du relecteur, puis la
certification (bloquée par R1).

- [ ] **[API]** ⛔ **audit SOLID 09/09 · F1 — `accept` peut écrire `ACCEPTED` par-dessus un `DECLINED` ou un
  `CANCELLED` déjà commité** (P1 de l'audit). **OUVERT à `HEAD`** : `PrismaBookingLocks.acceptUnderVenueLock` lit
  le statut sous le verrou de **salle**, puis écrit `tx.booking.update({ where: { id } })` **sans condition sur le
  statut de départ** ; `transition` (refus, annulations) écrit par `updateMany` conditionné **sans** prendre ce
  verrou. Fichier inchangé depuis `682ea4c`. Reproduit par l'audit.
  ⇒ **BLOQUE E3d.** *Décision du relecteur (chat), déléguée par Ko le 23/09/2026* — **motif** : l'invariant 1
  d'E3 repose sur des transitions conditionnées par leur état de départ.
  ⇒ **COÛT** : code API (compte) ; `booking-locks.prisma.ts` et sa mesure d'intégration sur PostgreSQL réel
  (accept contre refus, accept contre annulation) ; e2e exigée (concurrence) ; cadrage chemin de l'argent : oui ;
  migration : aucune nommée par l'audit ; dépendance : non ; mord sous concurrence, pas seulement en production.
  ⛔ **(D305, 25/09/2026) CODÉ AU SOUS-LOT 23a — forme (ii)** (décision du relecteur) : l'`updateMany` d'`accept` est
  conditionné au statut source, compte = 1 exigé, verrou de salle conservé. Rouge avant correctif et vert après **sur
  PostgreSQL réel** ; cibles R23-F1-a et -b, échecs LUS ; la relecture D117 reste pour l'ordre des refus (MD-F1-8, cible
  S5b-2 réorientée) et le verrou de salle pour la création de blocage concurrente (MD-F1-5, test T5, cible S5b-1
  réorientée — trouvée muette par `lancer-campagnes.py`). **Reste ouvert** jusqu'à la session adverse, la décision du relecteur et la certification.
  Détail : `ZWADJ_CONTINUITE.md`, section D305.
- [ ] **[API]** ⛔ **audit SOLID 09/09 · F2 — un devis annulé entre-temps se convertit ; `revise` ne revalide pas le
  statut du parent** (P1 de l'audit). **OUVERT à `HEAD`** : `QuotesService.convert` contrôle le statut
  (`assertStatus`) **avant**, puis `PrismaQuoteStore.convertirEnDemande` crée la réservation **sans transaction ni
  relecture** du statut du devis ; `creerRevision` verrouille la chaîne (`verrouillerChaine`) sans relire le statut
  du parent, contrôlé avant par `QuotesService.revise`. Conversion reproduite par l'audit ; `revise` relevé au
  source par l'audit. ⚠ `bookings_quote_id_key` (migration `20260707000000_init`) empêche la **double** conversion,
  pas celle d'un devis annulé (D186 : cherché dans les migrations).
  ⇒ **BLOQUE E3d.** *Décision du relecteur (chat), déléguée par Ko le 23/09/2026* — **motif** : le montant de la
  réservation vient du devis.
  ⇒ **COÛT** : code API (compte) ; `quote-store.prisma.ts`, `quotes.service.ts` et leurs mesures d'intégration
  (conversion contre annulation, révision contre annulation) ; e2e exigée ; cadrage chemin de l'argent : oui ;
  migration : aucune nommée ; dépendance : non ; mord sous concurrence.
- [ ] **[API]** ⛔ **audit SOLID 09/09 · F6 — l'enrichissement de notification, attendu après le commit et hors du
  `catch` du publieur, fait échouer une opération déjà faite** (P2 de l'audit). **OUVERT à `HEAD`** :
  `BookingsService.accept`, `.decline` et `.cancelAsPro` écrivent
  `await this.events.publish(…, await this.notificationFor(…))` — `notificationFor` s'évalue **avant** `publish`,
  donc hors de son `catch`. Reproduit par l'audit. Lié à A5 ci-dessous.
  ⇒ **BLOQUE E3d.** *Décision du relecteur (chat), déléguée par Ko le 23/09/2026* — **motif** : la même forme
  après un `PAID` ferait lire un échec sur un paiement abouti.
  ⇒ **COÛT** : code API (compte) ; `bookings.service.ts` (trois sites), et `domain-events.ts` si la correction passe
  par A5 ; e2e exigée (argent) ; cadrage chemin de l'argent : oui ; migration : non ; dépendance : non ; mord à
  toute panne de lecture postérieure au commit.
- [ ] **[API]** ⛔ **audit SOLID 09/09 · F8 — un `null` JSON du fournisseur échappe à `PAYMENT_PROVIDER_MALFORMED`**
  (P2 de l'audit). **OUVERT à `HEAD`** : `ChargilyGateway.readSession` fait
  `body = (await response.json()) as ChargilyCheckoutResponse` ; le `catch` ne couvre que l'échec d'analyse — un
  `null` valide passe, puis `typeof body.id` lève une `TypeError`. Reproduit par l'audit (réponse HTTP simulée).
  ⇒ **BLOQUE LA LEVÉE DU DRAPEAU DES PAIEMENTS** (`PAYMENTS_ENABLED`). *Décision du relecteur (chat), déléguée par
  Ko le 23/09/2026* — ~~**motif : non transmis avec la décision.**~~ ⛔ **MOTIF TRANSMIS LE 23/09/2026 (D303)** : drapeau
  éteint, la fabrique sélectionne `UnavailablePaymentGateway`, et aucune réponse Chargily n'atteint l'adaptateur.
  ✅ **Prémisse vérifiée par la session avant d'écrire, comme Ko l'exigeait** (`docs/preuves/D303/releves/`,
  `premisse-f8-sortie.txt`) : `createPaymentGateway` rend `new UnavailablePaymentGateway()` quand `PAYMENTS_ENABLED`
  est faux, avant toute lecture de clé ; `new ChargilyGateway` n'existe qu'en ce site-là hors specs ; `readSession`
  est privée et n'est appelée que par `createCheckout` de l'adaptateur Chargily ; l'adaptateur de refus lève 503
  sans appel réseau ; `PAYMENTS_ENABLED` vaut `false` en l'absence de valeur (`env.ts`).
  ⇒ **COÛT** : code API (compte) ; `chargily.gateway.ts` et sa spec ; e2e exigée (argent) ; cadrage chemin de
  l'argent : oui ; migration : non ; dépendance : non ; ne mord qu'avec le drapeau levé.
- [ ] **[CLIENT]** ⛔ **audit SOLID 09/09 · A3 — acompte recalculé dans le navigateur, aperçu de prestation non
  exhaustif.** **OUVERT à `HEAD`** : dans `booking-request-panel.tsx`, `previewDeposit` recalcule l'acompte, et
  `lineTotal` traite `TIERED`, `PER_GUEST`, `PER_UNIT` puis **retombe sur `fixedPriceCents` pour tout autre type**.
  Relevé au source par l'audit. **Déjà connu du dépôt, sans ce blocage** : « Deux arithmétiques monétaires
  dupliquées côté navigateur » (`ZWADJ_CONTINUITE.md`, « Dette restante ») et 23.12 « Keep booking/pricing rules in
  shared/backend only » — **annotées**, pas dupliquées.
  ⇒ **BLOQUE L'AJOUT DE TOUT NOUVEAU TYPE DE TARIFICATION DE PRESTATION ; cadrage chemin de l'argent.** *Décision du
  relecteur (chat), déléguée par Ko le 23/09/2026* — **motif** : le serveur reste l'autorité.
  ⇒ **COÛT** : code client, et un paquet partagé si l'arithmétique y passe (l'audit le recommande, sans importer
  l'API dans le navigateur) — compte ; e2e exigée (montants affichés) ; cadrage chemin de l'argent : oui ;
  migration : non ; dépendance : non.
- [ ] **[API]** ⛔ **audit SOLID 09/09 · R2 — l'ordre des refus de `booking-charge` contredit son commentaire.**
  **OUVERT à `HEAD`** : `resolveCharge` promet en tête « doublon → indisponible → refus de ligne » ; les doublons
  sont bien vus d'abord, par une boucle globale, mais indisponibilité et validité de ligne se testent **dans la
  même boucle, choix par choix** — un refus de palier sur le premier choix masque l'indisponibilité du second.
  Reproduit par l'audit (sonde).
  ⇒ **BLOQUE : rien. Se traite avec le prochain lot qui touche `booking-charge`.** *Décision du relecteur (chat),
  déléguée par Ko le 23/09/2026* — ~~**motif : non transmis avec la décision.**~~ ⛔ **MOTIF TRANSMIS LE 23/09/2026
  (D303)** : toute requête invalide reste refusée (audit) ; seul change le code d'erreur rendu quand une requête cumule
  deux fautes, et aucun montant n'en dépend.
  ⇒ **COÛT** : code API (compte) ; `booking-charge.ts` et sa spec, mesurée sur un cas **doublement** fautif
  (leçon S11-a) ; e2e : celle du lot porteur ; cadrage chemin de l'argent : oui ; migration : non ; dépendance : non.

### À ordonner par Ko — audit SOLID du 09/09

- [ ] **[OUTIL]** **audit SOLID 09/09 · R1 — `neutralize-s11b.py` compte tout code de sortie non nul comme garde
  détectée.** **OUVERT à `HEAD`** : dans `main`, le pré-vol est vert sur un code 0 sans compter les tests
  collectés ; sous mutation, `lancer(m)[0]` garde le code et **jette la sortie**, et **tout code ≠ 0 compte
  « mordue »** — une erreur de chargement ou de collecte se lit comme une assertion qui mord.
  ⛔ **CONFRONTÉ À D286 — ET D286 NE LE FERME PAS** : D286 ferme la cause **inverse**, un faux « muette » par
  mutation jamais posée (`verifier-mutations.py`, ancre 1 → 0 **et** marqueur) ; **rien ne ferme le faux
  « mordue »**. Calibration de l'audit sur une copie isolée, sorties simulées ; l'audit ajoute que les sept cibles
  locales qu'il a rejouées ont mordu par de vraies assertions. ⚠ Même forme possible dans les autres harnais qui ne
  lisent que le code de sortie — **non relevé ici**.
  ⇒ ~~**À ordonner par Ko.**~~ ⛔ **(D304) ORDONNÉ PAR KO AU RANG 23, entre 23a et la certification** ; **CADRÉ** :
  `ZWADJ_CONTINUITE.md`, « ⛔ CADRAGE DE R1 » (méthode renforcée). ⇒ **BLOQUE** : la levée du drapeau (D303) **et la
  prochaine certification qui compte des cibles du chemin de l'argent** (D304, décision 4).
  ⇒ **COÛT** : code de `neutralisation/` (compte) ; `neutralize-s11b.py`, et chaque
  harnais de même forme s'il est étendu ; calibration à deux bras (D286) ; e2e : non ; cadrage chemin de
  l'argent : ~~non (outillage, même s'il mesure ce chemin)~~ ⛔ *(D304 : **oui** — branche (4) de la règle, les harnais
  qui prouvent les gardes du chemin ; décision 3 du relecteur)* ; migration : non ; dépendance : non. ⛔ *(D304 : le
  coût se relève — **les 20 harnais, 158 cibles** à la dernière certification, chacune devant nommer son titre
  attendu, relevé d'un échec LU ; un module de lecture partagé ; cadrage, § 6 et § 8.)*
  ⛔ **DÉCISION DU RELECTEUR (chat), DÉLÉGUÉE PAR KO LE 24/09/2026 (D304) — R1 :** **portée** — les 20 harnais relevés
  ci-dessous **et tout harnais neuf** qui mute un fichier du chemin de l'argent ; **morsures passées** ni infirmées ni
  prouvées, la première certification après la correction les rétablit sur échec lu ; la correction **bloque la
  prochaine certification qui compte des cibles du chemin de l'argent** — *motif* : par la règle b de D303, ces cibles
  ne se comptent pas sans elle ; **par morsure**, le harnais corrigé garde le nombre de tests collectés, le test en
  échec et la première ligne de son assertion — pas la sortie entière ; `neutralize-e3d1-s8.py` : annoté, la
  correction vient avec R1.
  ⛔ **DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO LE 24/09/2026 (D305) — les choix du § 9 du cadrage de R1 :**
  texte **fermé par défaut** et **lié à vitest 3.2.7** ; **module partagé** ; **(β)** pour le harnais de 23a ; **aucune
  exception « délai »** ; une **liste** de titres par cible, chacun exigé. Texte et motifs : méthode renforcée, bloc
  D305. ⇒ **Le cadrage de R1 est complet côté décisions** ; ⚠ **trois constats mesurés par 23a y sont PROPOSÉS comme
  modes, au relecteur** (§ 4 du cadrage, annotation D305) : `.expect(<statut>)` de supertest lève une `Error` (non-morsure
  sous la lecture fermée — combien des 158 cibles en dépendent : non relevé) ; le glyphe « × » dans des titres existants ;
  ce que désignent « les 8 signatures ». ⇒ **Coût relevé en plus** : `neutralize-rang23.py` (5 cibles, titres déjà
  déclarés en 7ᵉ champ) entre dans les harnais que R1 corrige.
  ⛔ **DÉCISION DU RELECTEUR (chat), DÉLÉGUÉE PAR KO LE 23/09/2026 (D303) — R1 SUR LE CHEMIN DE L'ARGENT :**
  1. **tant que le harnais concerné n'est pas corrigé, une garde n'est prouvée que par une neutralisation dont on a
     LU l'échec : tests collectés > 0 ET assertion en échec.** *Motif* : « un code de sortie non nul, seul, ne prouve
     rien » ;
  2. ⇒ **LA CORRECTION DE R1 DANS LES HARNAIS DU CHEMIN DE L'ARGENT BLOQUE LA LEVÉE DU DRAPEAU DES PAIEMENTS**
     (`PAYMENTS_ENABLED`) — aux côtés de F8. ~~Le reste de R1 (harnais hors du chemin de l'argent) reste **à ordonner
     par Ko**.~~ ⛔ *(D304 : plus de « reste » — la portée de R1 couvre les **vingt**, décision 4 ; Ko l'a ordonné au rang 23.)*
  ⚠ **RELEVÉ EN LECTURE SEULE, DEMANDÉ PAR KO — sans conclusion sur les certifications passées** (pièces :
  `docs/preuves/D303/releves/verdicts-harnais*`, `fichiers-mutes-par-harnais*`, `journaux-sortie-echec*`) :
  - **27 harnais** `neutralize-*.py` au dépôt. **5** jugent sur la sortie — code ≠ 0 **et** signature attendue sur
    une ligne d'échec (`404`, `argon2`, `budgets`, `horizon`, `maxprice`) ; **2** comptent les tests collectés puis
    jugent au code (`act-plafonds`, `horloge`) ; **20 jugent par le SEUL code de sortie** : `available-on-api`,
    `available-on`, `b7`, `booking-status`, `e3d1-s8`, `journey`, `r4`, `s9`, `s10a`, `s10b`, `s11a`, `s11b`,
    `solid-s1` à `solid-s7`.
  - **Parmi les 20, ceux qui mutent un fichier que D187, D302 ou le cadrage du rang 23 placent sur le chemin de
    l'argent** : `e3d1-s8` (`payments/`, migration d'unicité de l'intention), `s11b` (`booking-charge.ts`),
    `solid-s4` (`pricing-engine.ts`), `solid-s5a` (`payments/`), `solid-s5b` (`booking-locks.prisma.ts`),
    `solid-s3` (`booking-transitions.ts`, `quote-transitions.ts`), `s10b` et `booking-status`
    (`quote-store.prisma.ts`). ⚠ **Liste dérivée par la session, pas énumérée par la décision** — ~~à arrêter par le
    relecteur.~~ ⛔ *(D304 : **arrêtée** — portée de R1 = les vingt, décision 4. Pour la FORME DE REVUE, la carte de la
    règle, pièce datée, retrouve ces huit et **ajoute `r4`** — il mute deux migrations de statut du devis, branche
    (2) ; `s11a`, `solid-s1`, `s10a`, `solid-s6` y sont **en doute, au relecteur** : `docs/preuves/D304/carte-chemin-argent/tri.txt`.)*
  - ⛔ **`neutralize-e3d1-s8.py` DIT LE CONTRAIRE DE CE QU'IL FAIT** : son en-tête promet « une cible ne compte que si
    le code de sortie est non nul ET que le titre attendu apparaît sur une ligne d'échec » ; sa boucle fait
    `codes = {m: lancer(m)[0] …}` — la sortie est jetée. C'est le harnais des cibles E1–E5 de D255.
    ⛔ *(D304 — **ANNOTÉ, décision 4 du relecteur : l'en-tête promet une lecture que la boucle ne fait pas ; la
    correction vient avec R1.** Confirmé à `2b9f8d5`. ⚠ Le fichier lui-même n'est **pas** touché par D304 — lot
    documentaire, qui n'écrit que dans les `.md` d'autorité et `docs/preuves/` ; toucher un harnais le ferait compter
    (D283). Sa signature `lancer(nom: str) -> int` rend un tuple : même lot.)*
  - **Les journaux de certification ne conservent pas, par cible, la sortie qui montre l'assertion en échec** :
    **85** journaux de campagne versés (`docs/preuves/*/campagnes/`, `*/passe/`), **1 219** lignes, **666** lignes
    « ✓ » ; **0** porte un marqueur d'échec Vitest (croix ou `FAIL` sur une ligne de spec, `AssertionError`,
    `expected … to`, `Tests N failed`) — calibration deux bras. Chaque cible y tient en une ligne
    « ✓ <cible> [mesure] ».
- [ ] **[API]** **audit SOLID 09/09 · F3 — un jeton de réinitialisation se consomme deux fois ; même forme sur la
  vérification d'e-mail et le changement d'e-mail** (P1 de l'audit ; l'audit sécu le reprend en P1). **OUVERT à
  `HEAD`, les trois** : `AuthService.resetPassword`, `AuthService.verifyEmail` et `AccountService.confirmEmailChange`
  lisent le jeton (`findFirst`, `usedAt: null`) **avant** la transaction, puis le consomment par
  `update({ where: { id } })` **sans** `usedAt: null`. Reset reproduit par l'audit ; les deux autres relevés au
  source par l'audit et confirmés ici par symbole. ⚠ **Contredit l'entrée ✅ de `POST /auth/reset-password`**
  (section 5.1) — **annotée** après confrontation.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : code API (compte) ; `auth.service.ts`, `account.service.ts` et leurs
  mesures d'intégration (deux consommations concurrentes, PostgreSQL réel) ; e2e exigée (auth) ; cadrage chemin de
  l'argent : non ; migration : aucune nommée ; dépendance : non ; mord sous concurrence.
- [ ] **[API]** **audit SOLID 09/09 · F4 — l'approbation d'une suppression de compte peut agir sur une demande
  annulée ; le refus admin a la même forme** (P1 de l'audit). **OUVERT à `HEAD`** : `AccountDeletionService.approve`
  et `.reject` lisent la demande par `loadPending` **avant** d'écrire, puis écrivent `update({ where: { id } })`
  sans condition `PENDING` — alors que `cancel` est un check-and-set (`updateMany`, `status: "PENDING"`). Relevé
  au source par l'audit, sans sonde ; l'audit sécu le rappelle. Même famille que F1.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : code API (compte) ; `account-deletion.service.ts` et sa mesure
  d'intégration ; e2e exigée (auth) ; cadrage chemin de l'argent : non ; migration : non ; dépendance : non ; mord
  sous concurrence.
- [ ] **[API]** **audit SOLID 09/09 · F5 — une annulation client contourne le motif exigé** (P2 de l'audit ; même
  famille que F1). **OUVERT à `HEAD`** : `BookingsService.cancelAsClient` décide par `decideBookingTransition` sur
  un statut lu **avant**, puis écrit par `transitionStatus(…, allowedFrom(CANCEL_AS_CLIENT), …)`, qui admet **les
  deux** statuts de départ — un `PENDING` devenu `ACCEPTED` entre-temps s'annule sans motif. Reproduit par l'audit.
  ⇒ ~~**À ordonner par Ko.**~~ ⛔ **ORDONNÉ PAR KO AU RANG 23 LE 23/09/2026 (D303)**, avec F1, F2 et F6 ; la forme de
  revue ratifiée s'y applique (décision du relecteur). Cadrage : `ZWADJ_CONTINUITE.md`, « ⛔ CADRAGE DU RANG 23 ».
  ⇒ **COÛT** : code API (compte) ; `bookings.service.ts`, et `booking-transitions.ts` si la
  condition y passe ; mesure d'intégration ; e2e exigée (concurrence) ; cadrage chemin de l'argent : ~~non posé par
  le relecteur~~ ⛔ *(D304 : **oui** — « F5 relève du (2) », note du relecteur sur la règle de portée, décision 3)* ;
  migration : non ; dépendance : non. ⛔ *(D304 : ordre arbitré par Ko — **23a**, avec F1.)*
  ⛔ **(D305, 25/09/2026) CODÉ AU SOUS-LOT 23a** : le contrôle d'avant transaction a disparu ; l'écriture porte la règle
  du motif (`writableFrom`, fonction pure de `booking-transitions.ts`) ; sur un compte à 0, la relecture ne choisit
  que le code — **400 `cancelReasonRequired`** (décision du relecteur). Rouge et vert sur PostgreSQL réel ; cibles
  R23-F5-a, -b, -c, échecs LUS. **Reste ouvert** jusqu'à la session adverse, le relecteur et la certification.
- [ ] **[API]** **audit SOLID 09/09 · F7 — les notifications de réservation en arabe partent en français** (P2 de
  l'audit). **OUVERT à `HEAD`** : `booking-notification-input.ts` compare `locale === "AR"`, alors que l'énuméré
  `Locale` du schéma est `fr` / `ar` ; et `booking-notification-input.spec.ts` **attend** `["ar", "fr"]` — le test
  entérine le défaut. Reproduit par l'audit.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : code API (compte) ; le module et sa spec, corrigés ensemble ; e2e : non ;
  cadrage chemin de l'argent : non ; migration : non ; dépendance : non ; mord à chaque notification d'un compte `ar`.
- [ ] **[API]** **audit SOLID 09/09 · A1 — des contrats de persistance exprimés en types Prisma.** **OUVERT à `HEAD`,
  aux contrats que l'audit NOMME** : `booking-locks.types.ts` (`BookingRow = Prisma.BookingGetPayload`, et
  `transition` qui prend un `Record<string, unknown>` que l'adaptateur coule en
  `Prisma.BookingUpdateManyMutationInput`) ; `BookingsService.transitionStatus` (même type Prisma) ;
  `venue-store.types.ts` (`Prisma`, et `RULE_SELECT` importé **à l'exécution** depuis `pricing-rules.service`) ;
  `quote-store.types.ts` (`QuoteRow = Prisma.QuoteGetPayload`, `lines: Prisma.InputJsonValue`).
  ⛔ **D258 — LE COMPTE D'IMPORTS NE JUSTIFIE RIEN** : « 19 fichiers de service sur 25 importent `PrismaService` »
  est le chiffre **de l'audit**, et la tâche ne le vise pas ; elle vise ces contrats. L'audit note lui-même que
  l'exception de `BookingRow` est documentée à dessein.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : code API (compte) ; les quatre contrats et leurs adaptateurs ; e2e exigée
  (réservations) ; cadrage chemin de l'argent : oui pour `booking-locks` et `transitionStatus` ; migration : non ;
  dépendance : non.
- [ ] **[API]** **audit SOLID 09/09 · A5 — le contrat d'événements reste concret : un contrat « publish-only ».**
  **OUVERT à `HEAD`** : `domain-events.ts` tire ses charges utiles des types de `booking-notifications.service` et de
  `visit-notifications.service` ; les services dépendent de la classe `DomainEvents` et construisent eux-mêmes les
  destinataires — F6 en est la conséquence pratique, selon l'audit.
  ⇒ **À ordonner par Ko** (lié à F6, bloquant d'E3d : la correction de F6 peut passer par lui). ⇒ **COÛT** : code
  API (compte) ; `domain-events.ts`, les services émetteurs, `notification-subscriptions.ts` ; e2e exigée ;
  cadrage chemin de l'argent : oui si F6 passe par lui ; migration : non ; dépendance : non.
- [ ] **[OUTIL]** **audit SOLID 09/09 · garde d'architecture sur les modules purs** (« a small dependency guard for
  designated pure modules and port contracts », section « Database and tooling observations »). **Non
  confrontable comme défaut** : c'est une recommandation. Aujourd'hui la pureté des modules du chemin de l'argent
  (D187 : `payment-intent.ts`, `pricing-engine`, `booking-charge.ts`) tient par leurs specs et par la relecture.
  ⇒ **À ordonner par Ko — APRÈS A1** (ordre donné par Ko). ⇒ **COÛT** : code — test ou règle de lint (compte) ;
  e2e : non ; migration : non ; dépendance : aucune si la garde est un test.

### À ordonner par Ko — audit sécurité du 09/09

- [ ] **[API]** **audit sécu 09/09 · journaux — jeton dans le chemin de verify-email, `Set-Cookie` sortant, adaptateur
  e-mail de dev en production** (P1 de l'audit). **OUVERT à `HEAD`** : `AppModule` ne masque que
  `req.headers.authorization` et `req.headers.cookie` ; `AuthController` expose `@Get("verify-email/:token")` — le
  jeton est dans l'URL journalisée ; le `Set-Cookie` des réponses n'est pas masqué ; `EmailModule` lie
  `DevLoggerEmailSender` **sans condition** (un seul `useClass`, aucun `NODE_ENV`). Sondes de l'audit (pino-http
  installé ; `NODE_ENV=production` pour l'adaptateur).
  ⛔ **CE QUI NE SE ROUVRE PAS — D294** : le jeton clair dans le journal de **DEV** est arbitré — ce journal est le
  seul endroit où il existe, le faire taire rendrait vérification et réinitialisation inachevables en dev. **La
  tâche porte sur l'adaptateur de dev lié sans condition EN PRODUCTION**, et sur la redaction des journaux HTTP.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : code API (compte) ; `app.module.ts`, `email.module.ts`, et un vrai
  fournisseur (8.1 « Integrate transactional email provider », annotée) ; e2e exigée (auth) ; cadrage chemin de
  l'argent : non ; migration : non ; dépendance : **oui** si un fournisseur réel entre ; **ne mord qu'en
  production** (en dev, D294).
- [ ] **[API]** **audit sécu 09/09 · invariants de production au démarrage** (P1 de l'audit). **OUVERT à `HEAD`** :
  `validateEnv` n'exige en production que la **présence** de `PROD_REQUIRED_EXPLICIT` (`CLIENT_URL`, `PRO_URL`,
  `AUTH_COOKIE_SECURE`, `GOOGLE_CLIENT_ID`, `PAYMENTS_ENABLED`) — `AUTH_COOKIE_SECURE=false` passe ;
  `CLIENT_URL`/`PRO_URL` en `http://` passent ; `CORS_ORIGINS` n'y figure pas et retombe sur
  `http://localhost:3000,http://localhost:5173` ; `DATABASE_URL` n'impose pas TLS ; `main.ts` porte une **note**
  « activer trust proxy », aucune configuration. Sondes de l'audit (Secure=false en production).
  ⚠ **`THROTTLE_*` hors schéma est une DÉCISION ÉCRITE (D128)**, pas un oubli : l'audit demande des valeurs
  **valides** — à arbitrer contre D128, pas à corriger d'office.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : code API (compte) ; `config/env.ts`, `main.ts`, et `auth.throttle.ts` si
  D128 bouge ; e2e exigée (auth : le cookie) ; cadrage chemin de l'argent : non ; migration : non ; dépendance :
  non ; **ne mord qu'en production**. Existant : PHASE 17 « Define env var schema per environment », annotée.
- [ ] **[INFRA]** **audit sécu 09/09 · dépendances** (P1 de l'audit). **REJOUÉ LE 23/09/2026** — pièces
  `docs/preuves/D302/dependances/`. ⚠ **La commande exacte de l'annexe ÉCHOUE avec le pnpm du dépôt** (10.34.4,
  épinglé) : `Unknown options: 'fetch-retries', 'fetch-timeout'` — code 1 **sans aucun avis**, l'auditeur avait
  pnpm 11.19.0. Rejouée **sans ces deux options** : **55 avis, 53 GHSA distincts — 2 critiques, 30 élevés,
  21 modérés, 2 faibles**, recomptés sur les avis ; ⚠ le compteur de l'outil (`metadata`) dit **31** élevés : écart
  de un entre l'outil et ses propres avis, écrit tel quel. Mêmes 17 paquets que l'annexe, mêmes comptes par paquet.
  **Versions RÉSOLUES aujourd'hui** (lockfile, inchangé depuis l'audit) : next 15.5.20 · multer 2.1.1 · sharp
  0.35.3 (API) et 0.34.5 (Next) · react-router 7.18.1 · hono 4.12.28 · fast-uri 3.1.3 · brace-expansion 1.1.15 et
  5.0.7 · postcss 8.4.31 et 8.5.16 (8.4.31 seule signalée) · @hono/node-server 1.19.11 · browserslist 4.28.5 ·
  js-yaml 4.3.0 · mysql2 3.15.3 · nanoid 3.3.15 · qs 6.15.3 · baseline-browser-mapping 2.10.42 · deepmerge-ts 7.1.5
  · valibot 1.2.0. **Aucun changement de dépendance dans ce lot.**
  ⚠ **Ajout (audit sécu, contrôle 22 — Ko ne le listait pas)** : dans `image-pipeline.ts`, `sniff` appelle
  `sharp(input).metadata()` **avant** de confronter le format à `ACCEPTED_IMAGE_FORMATS` ; l'audit en **déduit**
  qu'un refus après cette lecture ne prouve pas que le parseur signalé n'a pas touché les octets. Ouvert à `HEAD`.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : **dépendances** (manifestes et lockfile) ; code si la lecture de `sharp` est
  réordonnée ; les six portes et l'e2e (build, téléversement) ; cadrage chemin de l'argent : non ; migration :
  non. Existant : PHASE 13 « Dependency vulnerability scanning in CI », annotée.
- [ ] **[INFRA]** **audit sécu 09/09 · base** (P1 de l'audit, en partie). **OUVERT à `HEAD`** : aucune sauvegarde
  automatique ni restauration testée au dépôt (PHASE 19, annotée) ; `docker-compose.yml` publie `5432:5432` et crée
  la base par `POSTGRES_USER: zwadj`, superutilisateur de l'image selon l'audit (source S5) — pas de rôle de
  migration distinct du rôle applicatif.
  ✅ **LE MONTAGE PG18 DE CE P1 EST CLOS PAR D292** (`49f3ace`, 13/09/2026) : le volume nommé monte sur
  `/var/lib/postgresql` ; `db:down` est sans effet sur les données, mesuré (section D292). L'audit l'avait relevé
  par rapprochement de la documentation, sans Docker ; l'incident de D292 l'a démontré.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : infra ; `docker-compose.yml` — **il COMPTE** (D292 : il peut dégrader
  `test:int`) ; rôles SQL à cadrer (`migrate dev` interdit) ; un test de restauration ; e2e : non ; cadrage chemin
  de l'argent : non ; sauvegardes et rôles **ne mordent qu'en production** ; le port publié vaut pour le poste.
- [ ] **[SÉCU]** **audit sécu 09/09 · divers — cinq constats, chacun à ordonner par Ko :**
  1. **`.env.production` et `.env.staging` non ignorés** — `.gitignore` couvre `.env`, `.env.local`, `.env.*.local`.
     Ouvert. **COÛT** : 1 fichier, `.gitignore` — hors exemption D292, **il compte** ; ne mord qu'au premier tel
     fichier créé.
  2. **Limiteur en mémoire derrière un proxy** (P2 de l'audit) — stockage du processus (`app.module.ts` :
     « suffisant mono-instance »), confiance du proxy non configurée (`main.ts`, note). Ouvert. ⚠ **Ajout** :
     `@SkipThrottle` se trouve dans **cinq** fichiers de contrôleurs à `HEAD` (`health`, `media`, `referentials`,
     `availability`, `venues-public`) ; l'audit n'en nommait que deux (médias, health). **COÛT** : code API
     (compte) ; dépendance si le stockage devient partagé ; ne mord qu'en production. Existant : PHASE 13 « Global +
     per-endpoint rate limiting », annotée.
  3. **MFA admin** (contrôle 12, « absent ») — aucun TOTP ni WebAuthn. Ouvert. Existant : 23.6 « MFA/2FA for admin »,
     annotée. **COÛT** : code API et front, e2e exigée (auth), dépendance probable.
  4. **Énumération par `EMAIL_ALREADY_USED`** à l'inscription et au changement d'e-mail (contrôle 26, « partiel »)
     — **choix produit** (Lot 1 : 409 tranché par la contrainte). Existant : entrée ✅ de 5.1, annotée. **COÛT** :
     décision produit d'abord ; code API ensuite, e2e exigée (auth).
  5. **Pages CGU et confidentialité vides** (« Bientôt disponible ») et **version d'acceptation non transmise** —
     `register-form.tsx` exige la case, l'API ne la reçoit pas (« contrat Lot 1 »). Ouvert. → PHASE 14, annotée.
     **COÛT** : texte juridique (hors code) ; code client et API pour la version, **contrat d'API** (à demander
     avant, `CLAUDE.md`) ; migration si la version se stocke.

### Ajoutés — constats des audits que la liste de Ko ne nommait pas

- [ ] **[API]** **audit sécu 09/09 · conformité — l'anonymisation laisse les instantanés de contact des
  réservations.** **OUVERT à `HEAD`** : `AccountDeletionService.approve` anonymise l'utilisateur, archive les salles
  et consomme les jetons — **aucune écriture sur `bookings`** (0 mention de `booking` dans le service). L'audit :
  l'étiquette ANONYMIZED « ne suffit pas à rendre tout le jeu de données anonyme » ; une conservation peut être
  légitime si elle est justifiée et bornée. Existant : PHASE 14 « Reconcile soft-delete vs erasure », annotée.
  ⇒ **À ordonner par Ko** (décision de conservation d'abord). ⇒ **COÛT** : décision juridique ; code API (compte) ;
  migration possible ; e2e exigée (auth).
- [ ] **[API]** **audit sécu 09/09 · sessions — aucun plafond absolu de durée de session** (contrôle 9). **OUVERT à
  `HEAD`** : la rotation du refresh recalcule `expiresAt` à `REFRESH_TOKEN_TTL_DAYS` (30 par défaut) — « fenêtre
  GLISSANTE » écrit le code — et aucun plafond absolu n'existe (0 occurrence). Voisin de D4 (entrée de 5.1bis,
  annotée) : D4 assume la fenêtre d'un access token ; **ceci est autre chose**, la durée totale d'une session.
  ⇒ **À ordonner par Ko.** ⇒ **COÛT** : code API (compte) ; migration probable (date d'origine de la session) ;
  e2e exigée (auth).
- **Rattachés à des entrées existantes, sans entrée neuve** : **audit SOLID 09/09 · A2** (reste : `create`,
  `QuotesService`, `AuthService`) et **· A4** (`WalkinJourney`) → S12 à S14 et « F2 — décomposition » du 22/08,
  annotées.
- **Non confrontables au dépôt** (hébergement, exploitation) : WAF et DDoS (contrôle 6), chiffrement au repos (23),
  alerting (28). **Pas d'entrée** : l'audit les déclare lui-même « non vérifiables » depuis l'archive.
- **Non repris en entrée, et l'audit le dit lui-même** : RLS (contrôle 19 — « ne doit pas être ajoutée
  mécaniquement ») ; le `console.error` de rendu de `GuardedSection` (contrôle 25, « globalement présent »).
### Trouvaille de la session D302 — PAS un constat des audits (sortie de la sous-section ci-dessus par D303)

⛔ *(D303, 23/09/2026, consigne de Ko : cette entrée était rangée sous « Ajoutés — constats des audits » ; c'est une
trouvaille de la session D302, pas un constat d'audit. Elle quitte cette sous-section, à la même place du fichier.)*

- [x] ~~**[DOC]** **Le point 10 de la méthode renforcée d'E3 prescrit un contrôle de provenance de l'ère des
  archives** — « `diff` contre le zip livré », `git apply --check`. Depuis la bascule Claude Code (D266), le contrôle
  de provenance est l'énumération des fichiers attendus (`CLAUDE.md`). Croisé par ce lot en annotant ce point,
  **non corrigé**. ⇒ **À ordonner par Ko** — mais le cadrage d'E3 le lira. ⇒ **COÛT** : documentaire (ne compte
  pas) ; 1 fichier, `ZWADJ_CONTINUITE.md`.~~ ✅ **CLOSE LE 23/09/2026 (D303)** — décision du relecteur (chat),
  déléguée par Ko : le point 10 est réécrit (SHA de départ rapporté ; `git diff` depuis lui limité aux fichiers du
  cadrage ; aucun fichier non suivi hors `a-verser/`). `ZWADJ_CONTINUITE.md`, « ⛔ E3 — MÉTHODE RENFORCÉE », point 10.

## Reports du 22/09/2026 — lot documentaire hors rang (D301)

⛔ *(D302, 23/09/2026 : « hors rang » rejeté par Ko — aucun lot hors de l'ordre des rangs ; D301 est le **rang 21**,
rétroactivement. Titre daté, non réécrit.)*

⚠ **Lot DOCUMENTAIRE : ce qu'il a croisé se RAPPORTE ici.** Détail : section D301 de `ZWADJ_CONTINUITE.md`.
⇒ **Traitée par ce lot, ailleurs dans ce fichier** : l'entrée `[INFRA][P3]` du 10/09 sur le compte des `node`
(annotée : la clause de disqualification qui s'y adossait est retirée).

### ⛔ Ouverts, mesurés, NON corrigés

- **[INFRA]** ~~[P3]~~ ⛔ **L'ÉCHANTILLONNEUR NE NOMME RIEN PENDANT LA FENÊTRE — OUTILLER L'INVENTAIRE, POUR QUE « PROCESSUS
  ÉTRANGER » REDEVIENNE MESURABLE.** Ko a réduit le point 7 du critère à ce qui se mesure (D301) : un creux avec
  `chrome` > 0 disqualifie la fenêtre ; les autres processus étrangers ne sont pas mesurés pendant la fenêtre —
  **limite déclarée**. `neutralisation/echantillonneur-etat-machine.ps1` relève `node`, `chrome` et `nb_proc`,
  **sans nom ni ligne de commande** (section D300, constat n°4) ; la sonde nomme les processus au-dessus de son seuil,
  mais seulement aux relevés qui ENCADRENT une mesure. ⇒ **À faire** : un inventaire nommé à chaque échantillon,
  **calibré sur ses deux bras** (D286) — un étranger lancé exprès pendant une mesure doit sortir, une mesure seule
  ne doit rien sortir d'étranger. ⇒ Alors seulement la clause pourra se réécrire, et c'est à Ko de le décider.
  ⛔ **C'est du code de `neutralisation/` : le lot qui le fera COMPTE** (Ko). ~~⚠ **Priorité posée par la session**,
  alignée sur l'entrée voisine du 10/09 ; elle appartient à Ko.~~ ⚠ **Voisine, pas doublon** : l'entrée
  `[INFRA][P3]` du 10/09 veut **classer** les `node` (observateur ou worker) ; celle-ci veut **nommer** tout ce qui
  tourne. Un même relevé servirait les deux.
  ⛔ **FORME DE KO (D302, 23/09/2026) : ce report passe à la forme des entrées neuves — sa priorité est retirée.**
  ⇒ **BLOQUE : rien dans le critère courant — donc « à ordonner par Ko ».** Vérifié le 23/09/2026 : après D301,
  **aucune règle de certification ne dépend d'un inventaire EN VOL**. Une en dépend **DEVANT chaque mesure** — le
  point 2 du critère du rang 9 (« l'état machine ET son INVENTAIRE NOMMÉ relevés devant chaque mesure ») — et
  celui-là existe : la sonde l'imprime (`neutralisation/sonde-etat-machine.ps1`, section « INVENTAIRE > 150 Mo » ;
  pièce relevée `docs/preuves/D299/passe/rang19-p2-sonde-avant-e2e.txt`). Cet outillage ne débloquerait que la
  **réécriture** de la clause « processus étranger » du point 7, qui appartient à Ko.
  ⇒ **COÛT** : **code** (`neutralisation/`, il **compte**) ; 1 fichier, `neutralisation/echantillonneur-etat-machine.ps1`,
  avec son en-tête et sa calibration à deux bras (D286) ; pas d'e2e, pas de cadrage chemin de l'argent, pas de
  migration, pas de dépendance ; ne mord qu'en certification, sur le poste de Ko.

## Reports du 22/09/2026 — rang 20, l'ordre des rangs sort de la section D270 (D300)

⚠ **Lot DOCUMENTAIRE : ce qu'il a croisé se RAPPORTE ici.** Détail : section D300 de `ZWADJ_CONTINUITE.md`.
⇒ **Traitées par ce lot, ailleurs dans ce fichier** : l'entrée `[DOC][P2]` de D299 (fermée), l'entrée
`[DOC][P1]` du 11/09 sur la distance du pointeur (annotée, **reste ouverte**), l'entrée `[INFRA][P3]` du 10/09
sur le compte des `node` (annotée : la règle du point 7 s'y adosse).

### ⛔ Ouverts, mesurés, NON corrigés

- **[DOC][P3]** ⚠ **« ⇒ POURQUOI (b) ET PAS (a) » SE LIT SOUS LE RANG COURANT, SÉPARÉ DE SON RANG 17.** Ce
  paragraphe de l'ordre des rangs — écrit le 16/09 par D294 (`git blame` : `16ca01a`) — justifiait la forme
  (b) des budgets, **candidat du rang 17**. Les lignes des rangs 17 à 21 se sont insérées **au-dessus de lui**,
  une par lot (D295 → D300) : il suit aujourd'hui « RANG 21 : EN ATTENTE D'ARBITRAGE DE KO » ⛔ *(D302, 23/09/2026 :
  il suit désormais la ligne « RANG 23 : EN ATTENTE » et la décision due à Ko sur les étiquettes P0-P3 — le défaut
  s'aggrave d'un paragraphe, il ne change pas de nature ; non corrigé, ce lot n'y touche pas)* ⛔ *(D303, 23/09/2026 :
  il suit désormais « RANG 24 : EN ATTENTE D'ARBITRAGE DE KO », puis la même décision due à Ko — même défaut,
  toujours non corrigé)* et **se lit comme
  le motif du rang courant**. Même famille, juste en dessous : « ⚠ ET « SUIVANT » VOULAIT DIRE LE RANG 13 » et
  « CETTE LIGNE EST LA RÈGLE… », qui visent une ligne « rang suivant » écrite plus haut, et dont les
  insertions des rangs suivants les ont éloignées.
  ⇒ **Non corrigé par D300, et c'est délibéré** : le lot DÉPLACE l'ordre à l'octet — réordonner son intérieur
  serait un autre lot, et effacerait la preuve d'empreinte. ⇒ **Remède possible, NON arbitré** : garder les
  paragraphes de motif hors de la chaîne des rangs, pour qu'un rang ajouté ne s'intercale plus entre un motif
  et son rang. C'est une décision de **FORME** ; elle appartient à Ko.

## Reports du 21/09/2026 — rang 19, certification des rangs 17 et 18 (D299)

⚠ **UNE CERTIFICATION NE CORRIGE RIEN.** Ce qui est croisé se **rapporte** ici. Détail : section D299 de
`ZWADJ_CONTINUITE.md`.

### ⛔ Ouverts, mesurés, NON corrigés

- **[INFRA][P3]** ⚠ **LE TRI DIFFÉRENTIEL N'EST PAS DANS L'INSTRUMENT.** La règle de Ko (critère, point
  10) exige de trier au contexte toute alerte absente de la sortie scellée précédente ; `audit-secrets.py`
  ne compare rien. D299 le fait par une **procédure versée** (`docs/preuves/D299/outils/alertes-nouvelles.py`)
  parce qu'une certification ne peut pas porter de code. ⇒ **À intégrer à l'instrument au prochain lot de
  code qui en a l'usage** — avec la même contrainte : **ne recopier aucun contexte** hors de la sortie
  scellée, sans quoi le tri produit un écho.
- **[INFRA][P2]** ⛔ **L'ÉCHANTILLONNEUR PERD SES ÉCHANTILLONS EN SILENCE QUAND SON JOURNAL EST TENU.**
  Mesuré le 21/09/2026 (passe 1 du rang 19) : un `tail -f` sur `rang19-etat.csv` fait lever `Add-Content`
  (`echantillonneur-etat-machine.ps1`, l. 184) **à chaque cadence** — 62 fois — et l'instrument **continue
  sans écrire** : rien ne s'affiche sur la console de la passe, seul le trou le révèle à la clôture. Une
  certification a été perdue ainsi (section D299). ⚠ **Et son lecteur (`-Resume`) nomme « veille, gel, ou
  échantillonneur tué »** : la quatrième cause — **journal verrouillé** — n'y figure pas, ce qui enverrait
  chercher un défaut de machine. ⇒ **À corriger avec l'instrument** (code de `neutralisation/`, donc un lot
  qui compte) : écrire par un flux ouvert une fois avec partage en lecture, ou compter et **imprimer** les
  échecs d'écriture ; ajouter la cause au lecteur. **Contournement écrit** (`AGENTS.md`, notes du poste de
  Ko) : aucun lecteur sur ce journal pendant une fenêtre.
- **[INFRA][P3]** ⚠ **LE CONTRÔLE « 0 VALEUR RÉELLE » N'EST PAS DANS L'INSTRUMENT NON PLUS** — il fait foi
  (Ko), et il vit en procédure (`docs/preuves/D299/outils/aucune-valeur-reelle.py`), qu'il faut nommer à
  chaque fois avec le journal à contrôler. Même report, même lot.
- [x] ~~**[DOC][P2]** ⛔ **L'ORDRE DES RANGS VIT SOUS UN TITRE DE SESSION DATÉE — « ## Session du 31/08/2026 —
  D270 » —, ET TOUT OUTIL QUI CLASSE PAR TITRE `##` LE SAUTE.**~~ ⛔ **FERMÉE LE 22/09/2026 (D300) — ARBITRÉE PAR
  KO EN RANG 20 ET FAITE** : l'ordre a son titre, « ## ORDRE DES RANGS — QUEL lot vient ensuite », juste
  au-dessus des points d'entrée ; corps déplacé à l'octet (606 lignes, SHA-256 égal), renvoi daté à sa place
  d'origine, pointeurs courants mis à jour, passe D277 dans les deux sens (`docs/preuves/D300/`). ⇒ **Mesuré
  après coup, par un balayage qui ne connaît aucun titre** : la ligne « RANG 20 » de l'ordre, classée **DATÉE**
  avant le déplacement, est classée **COURANTE** après — le cas particulier de `verifier-marque.py` n'a plus
  d'objet. Barrée, pas effacée (D276). Texte d'origine :
  Mesuré à la passe D277 de la marque (22/09) :
  le vérificateur excluait les sections datées par leur titre, et a rendu **56** occurrences examinées au
  lieu de **92** — **le bloc le plus courant du fichier était hors champ**, et une interdiction courante
  (« (D298) Compteur à DEUX ») y restait non levée. Corrigé **dans la procédure** (sous-titre ramené par son
  texte : `docs/preuves/D299/passe-d277/verifier-marque.py`), **pas dans le fichier**.
  ⇒ **À ARBITRER PAR KO** : donner à l'ordre des rangs **son propre titre `##`** — un lot documentaire,
  mais qui déplace un bloc que chaque reprise lit en premier, et dont le nom est cité ailleurs
  (« section D270 ») : ⚠ une passe D277 dans les deux sens, sur ces renvois, en ferait partie.

## Reports du 21/09/2026 — rang 18, l'écho de l'audit de secrets (D298)

⚠ **Ce qui a été croisé en écrivant l'instrument se RAPPORTE ici.** Détail : section D298 de
`ZWADJ_CONTINUITE.md`.

### ⛔ Ouverts, mesurés, NON corrigés

- **[INFRA][P2]** ⛔ **L'AUDIT SANS ÉCHO N'ATTEINT PAS « ATTENDU 0 » — ET CE QUI RESTE CROÎT AUSSI, SANS
  ÊTRE DE L'ÉCHO.** Mesuré le 21/09/2026 par `neutralisation/audit-secrets.py` : **90** alertes avant les
  pièces de D298, toutes triées, **aucune fuite** — valeurs déjà présentes dans des fichiers suivis hors
  preuves. **Trois familles** : titres de tests recopiés dans les **rapports JSON** et les **journaux**
  `test:int` versés (59 pour D297 seul : 10 par rapport JSON d'`api`, 2 par rapport de `client`, 4 par
  rapport de `pro`, 1 par journal `test:int` — ex. « forgot-password : réponse CONSTANTE ») ; **outils
  qui nomment le motif qu'ils cherchent**, et leurs sorties (21 pour D294) ; pièces de D293 et de D291.
  ⚠ **Pourquoi c'est P2 et pas P3** : chaque lot qui verse un journal de portes ajoute au moins une
  alerte — **D298 lui-même : 90 → 92**, le même titre de test que D297 dans son journal `test:int`, et
  sa propre sortie de passe D277 qui recite la ligne du backlog décrivant le lien e2e. **Un « attendu 0 » jamais atteint apprend à ne
  plus lire le compte** (D275) — c'est l'argument même de Ko pour le rang 18, et il vaut ici aussi.
  ⇒ **NON CORRIGÉ, ET LA FORME N'EST PAS DÉCIDÉE** : les exclure par contenu serait une exclusion par
  le résultat, précisément ce que le rang 18 a refusé. ~~**À arbitrer par Ko.**~~
  ✅ **ARBITRÉ PAR KO LE 21/09/2026 (D299)** : « attendu 0 » visait la mauvaise quantité — **l'audit
  garantit l'absence de VALEURS, pas de mots** ; **pas de liste blanche** (audit tronqué) ; **toute alerte
  absente de la sortie scellée précédente se trie au contexte avant le commit** ; le contrôle « 0 valeur
  réelle sur N fichiers » **fait foi**. Écrit au critère (point 10) et au pointeur d'audit d'`AGENTS.md`.
  **Les 92 ne sont pas exclues** : elles restent imprimées, et seules les nouvelles se trient.

- **[INFRA][P3]** ⚠ **`mesure-budgets.py` ARRONDIT UN MINORANT AU PLUS PROCHE.** Ligne 417 :
  `{v - m_courant:.0f}` et `{v / m_courant:.1f}` impriment « ≥ 4962 » pour 4 961,67 et « ≥ 13.8× » pour
  13,785× — un « ≥ » arrondi vers le haut **rassure à tort**, fût-ce de 0,3 ms. Relevé par D298 en
  corrigeant la marge du rang 17 (point 2 de Ko). ⇒ Chiffre rectifié là où il engage une autorité (table
  du rang 17) ; `docs/preuves/D297/mesures/RECTIFICATION-D298.txt` posé **à côté** des pièces ;
  **instrument NON retouché** (précédent de D294, ratifié par Ko — D295). **Il se corrige au prochain lot
  qui en a l'usage**, avec la même règle pour tout « ≥ » : partie entière, jamais arrondi.
  ⚠ **(D299, 21/09/2026) LA RÈGLE EST ÉCRITE, L'INSTRUMENT NE L'EST PAS** : « un minorant s'arrondit vers
  le bas, un majorant vers le haut » vit dans `AGENTS.md`, bloc des instruments (Ko). **L'entrée reste
  ouverte** jusqu'au lot qui corrigera `mesure-budgets.py` avec sa pièce.

## Reports des 20 et 21/09/2026 — rang 17, lot de code des budgets (D297)

⚠ **Ce qui a été croisé en écrivant les budgets se RAPPORTE ici.** Détail : section D297 de
`ZWADJ_CONTINUITE.md`.

### Reports décidés, non oubliés

- **[MÉTHODE][P1]** ⛔ **TOUTE VALEUR DE `testTimeout` AUTRE QUE LA VALEUR EN VIGUEUR EXIGE LA SORTIE
  (i) — CONDITION DE KO, 20/09/2026 (D297).** La marge écrite au rang 17 est mesurée sur un
  **majorant** (test + hooks) : « un majorant suffit pour confirmer qu'une borne tient ; il ne suffit
  pas pour en choisir une nouvelle ». ⇒ Le jour où quelqu'un veut écrire autre chose que 5 000, il
  faut d'abord un instrument qui chronomètre la **seule fonction du test** — piste relevée par D296,
  **non vérifiée** : un runner réservé à la mesure (`runner.runTask`), la durée transportée par
  `task.meta`, que le reporter JSON recopie. ⚠ **La condition est aussi écrite dans le commentaire de
  chacune des quatre lignes**, là où la lira celui qui voudra la changer.

### ⛔ Ouverts, mesurés, NON corrigés

- **[MÉTHODE][P3]** ⚠ **LA RÈGLE DE N SE SATISFAIT D'UNE SEULE PASSE QUI NE DÉPLACE PAS LE MAXIMUM.**
  Mesuré le 21/09/2026 : **N = 2, 2, 1, 1** — deux suites ont convergé après **deux** passes comptées.
  C'est la règle arbitrée (x = 5 %, plafond 15) **appliquée à la lettre** ; mais le maximum est un
  **extremum**, et une passe calme ne dit rien de la suivante. ⚠ **Aucune décision n'en dépend
  aujourd'hui** : (b) écrit la valeur en vigueur, la marge est d'au moins douze fois. ⇒ **À revoir
  seulement si (a) ou (i) est un jour poursuivi** — c'est-à-dire si une valeur doit être CHOISIE.

- **[INFRA][P3]** ⚠ **`lancer-campagnes.py` NE REJOUE PAS `neutralize-budgets.py` QUAND SEUL
  L'INSTRUMENT CHANGE.** Relevé le 21/09/2026 dans sa source : le tri retient les chaînes littérales
  qui désignent un fichier existant, **avec les extensions `ts|tsx|css|json|sql|mjs`** — un `.py` n'y
  figure pas. Or la mécanique des témoins et le **lecteur de signature** du harnais vivent dans
  `neutralisation/mesure-budgets.py`. ⇒ Un lot qui ne toucherait que l'instrument **ne déclencherait
  pas** la campagne qui en dépend. ⚠ Non corrigé : `lancer-campagnes.py` est partagé par 27
  campagnes, et élargir son motif est un changement d'outillage à part entière.
  ⚠ **(D298, 21/09/2026) SECONDE CONSÉQUENCE, SOUS L'ANGLE INVERSE** : un lot dont l'objet est un
  **instrument** ne peut pas avoir de campagne `neutralize-<lot>.py` — elle ne viserait qu'un `.py`,
  serait « aveugle », et ferait sortir le tri en **1** à chaque passage. D298 a donc versé sa
  contre-épreuve comme **pièce** (`docs/preuves/D298/contre-epreuve/`, 5 sur 5) : **elle ne se rejoue
  qu'à la main**, et une modification future de `neutralisation/audit-secrets.py` ne la déclenchera pas.
  Toujours non corrigé.

## Reports du 20/09/2026 — rang 17, lecture adverse du cadrage (D296)

⚠ **UN LOT DOCUMENTAIRE NE CORRIGE RIEN.** Ce qui a été croisé en lisant se **rapporte** ici. ⛔ **Le
défaut BLOQUANT n'est pas dans cette section** : il est au point d'entrée du rang 17 de
`ZWADJ_CONTINUITE.md`, où une reprise le lira **avant** le cadrage. Détail : section D296.

### ⛔ Ouverts, mesurés, NON corrigés

- **[DOC][P2]** ⛔ **LA RÈGLE DU DÉTAIL PAR MOTIF (D295) A MORDU DANS LA SESSION MÊME QUI L'A
  VERSÉE — ET DANS LE SENS INVERSE DE CELUI QUI L'A FAIT NAÎTRE. REPORT DE KO, 20/09/2026, NON
  CORRIGÉ PAR CONSIGNE.** Le jeton dégénéré « y » — fragment laissé par un découpage sur un retour de
  ligne — a rendu **213 occurrences**, que le total « 11 jetons, 0 manquant » aurait noyées ; **c'est
  la ventilation qui l'a montré** (section D295, faute n°3). ⚠ **Ce n'était pas un motif MUET — le cas
  qui a fait naître la règle — mais un motif qui COMPTE TOUT et ne mesure rien.**
  ⛔ **LA PHRASE D'`AGENTS.md` EST DONC INCOMPLÈTE** : « ET ELLE N'A RIEN ATTRAPÉ LE JOUR OÙ ELLE A
  ÉTÉ ÉCRITE » (bloc « UN COMPTEUR QUI CROISE DEUX ENTRÉES », D295). Vraie de la passe anticipée —
  7 motifs, 0 à zéro —, fausse du relecteur du même lot. ⚠ La section D295 porte les deux
  affirmations **à 42 lignes d'écart** (relevé à `030da95`) sans les confronter.
  ⇒ **Consigne de Ko : elle se complète DANS LES DEUX SENS au prochain lot qui touche `AGENTS.md`** —
  un motif à zéro est une hypothèse à vérifier, **un motif au compte invraisemblablement haut
  aussi**. ⚠ **Pas dans D296, qui ne touche pas `AGENTS.md`** (passe D277 : 0 occurrence).
  ⚠ **Récidive mesurée le jour même du report** : le premier motif de « budget par test » de D296
  rendait **24** occurrences, **toutes** des appels de fonction — même classe (section D296, faute
  n°3).
  ✅ **CLOS LE 21/09/2026 (D298)** : le rang 18 touche `AGENTS.md` (point 1 de Ko), donc la consigne
  s'applique. La phrase « ET ELLE N'A RIEN ATTRAPÉ… » est **barrée avec son motif** (vraie de la passe
  anticipée, fausse du relecteur), et la règle se lit désormais **dans les deux sens** : un motif au
  compte invraisemblablement haut est lui aussi une hypothèse à vérifier.

- **[DOC][P3]** ⚠ **LE CAS ROUGE DE `client` — 273/287, 22 EXPIRATIONS, 4 636 Mo — PORTE DEUX DATES
  DANS LES AUTORITÉS.** Relevé le 20/09/2026 **en lisant, pas par balayage** : **09/09** au bloc du
  rang 13 de `ZWADJ_CONTINUITE.md` (« le cas ROUGE du 09/09 ») et dans l'entrée `[MÉTHODE][P1]` de ce
  fichier ; **10/09** au mode n°5 du cadrage du rang 17 et dans l'entrée `[MÉTHODE][P0]` de ce fichier
  (« Mesuré le 10/09 »). Le message de Ko du 20/09 dit « 09/09 ». ⚠ **Laquelle est juste n'est PAS
  établi** — d'autres sections parlent de « la nuit du 09 au 10/09 », ce qui rend les deux lectures
  plausibles : c'est une **inférence**. ⇒ À trancher **sur la pièce d'origine** si elle existe, jamais
  en alignant l'une sur l'autre. Non bloquant : aucune décision ne dépend du jour.

- **[INFRA][P3]** ⚠ **L'AUDIT DE SECRETS VERSÉ PAR D293 GRANDIT PAR L'ÉCHO DE SES PROPRES SORTIES.**
  Mesuré le 20/09/2026 : **33** alertes à l'audit de D294, **83** à celui de D296, **pour zéro fuite
  nouvelle** — le tri fichier par fichier rend **33 + 45 + 5** : les 13 mêmes fichiers ;
  `D294/outils/audit-secrets-d294.txt`, **sortie d'audit réauditée**, qui recite les contextes de ses
  alertes ; et un outil de D294 versé après son audit. ⛔ **La cause est de forme** : l'exclusion
  déclarée ne couvre que `audit-secrets*.txt` **du dossier de D293** ; toute sortie versée ailleurs —
  D294 hier, D296 aujourd'hui — est réauditée au versement suivant. ⚠ **Pourquoi ce n'est pas du
  bruit** : un « attendu 0 » qui n'est jamais atteint **apprend à ne plus lire le compte** (D275),
  et c'est là qu'une vraie fuite passerait. ⇒ **Non corrigé** : un instrument et ses sorties versées
  se corrigent ensemble ou pas du tout (précédent de D295) — ~~**au prochain lot qui a l'usage de
  l'audit**~~. Détail : section D296 de `ZWADJ_CONTINUITE.md`.
  ⛔ **(D297, 20-21/09/2026) PRÉDICTION VÉRIFIÉE, ÉCHÉANCE MANQUÉE.** Rejoué le 20/09 à 23:57 : **185**
  alertes, soit **+102**, entièrement la sortie versée par D296, réauditée — et aucune marque sur
  D297. **D297 a eu l'usage de l'audit et ne l'a PAS corrigé** : hors de l'ordre de Ko, et l'instrument
  est une pièce versée de D293. ⇒ **L'échéance devient l'arbitrage de Ko.** ⚠ Deux mesures seulement
  (33 → 83 → 185) : le compte a plus que doublé à chaque sortie versée — c'est une **inférence sur deux
  points**, pas une loi.
  ✅ **CLOS LE 21/09/2026 — RANG 18 (D298), ARBITRÉ PAR KO.** Instrument **nouveau**,
  `neutralisation/audit-secrets.py` ; l'outil de D293 **n'est pas retouché** et ne se rejoue plus
  (`AGENTS.md`, « AVANT LE COMMIT »). Il exclut les sorties des trois instruments prédécesseurs — **17
  fichiers épinglés par chemin et empreinte** — et ses **propres sorties scellées**, **par l'identité des
  octets, jamais par le nom**, et imprime chaque exclusion avec ce qu'elle aurait rendu. Calibration 5
  bras sur 5 (cas réel : les 24 jetons du journal e2e, vus), contre-épreuve 5 sur 5.
  ⇒ **Mesuré sur le même arbre** : l'outil de D293 rend **433** (244 + 189, prédit), le nouvel instrument
  **90** alertes et **472** d'écho imprimées, non comptées — 90 + 472 − 129 = 433.
  ⚠ **« Attendu 0 » N'EST PAS ATTEINT** : les alertes restantes ne sont pas de l'écho — entrée
  `[INFRA][P2]` des reports de D298. ⚠ **Et la décomposition de D297 était fausse** : sur 185, l'écho ne
  pesait que 154 (section D298).

## Reports du 16/09/2026 — rang 16, lot documentaire (D294)

⚠ **UN LOT DOCUMENTAIRE NE CORRIGE PAS DU CODE.** Ce qui a été croisé en écrivant les sept constats
se **rapporte** ici. Détail : section D294 de `ZWADJ_CONTINUITE.md`.

### ⛔ Ouverts, mesurés, NON corrigés

- **[INFRA][P3]** ⛔ **`.split("\n")` REND UN ÉLÉMENT VIDE FINAL — UN COMPTE DE « PARCOURU » BIAISÉ
  DE +1, DANS UN INSTRUMENT VERSÉ.** Relevé le 16/09/2026 : `docs/preuves/D293/outils/extraire-e2e.py`
  imprime « 911 lignes parcourues » là où `wc -l` **et** `splitlines()` rendent **910**, sur un
  fichier bien terminé par `\n`. **Biais systématique**, pour tout fichier que cet instrument lira.
  ⚠ **Le verdict de D293 ne bouge pas** : 3 lignes gardées, 0 jeton en sortie, et les 3 gardées
  disent bien 34 passés · 1 ignoré. ⚠ **Mais sous D290 le compte de parcouru n'existe QUE pour être
  confrontable** — confronté, il était faux.
  ⚠ **Portée VÉRIFIÉE, pas présumée** : **5** instruments versés portent l'idiome (`D291/controles`,
  `D291/passe-d277`, `D293/outils/audit-secrets.py`, `D293/outils/extraire-e2e.py`,
  `D293/versement-d288`), mais **un seul alimente un compte imprimé**. Les « 375 lignes » de
  `verser-et-confronter.py` passent par `splitlines()` ; le `split` d'`audit-secrets.py` ne sert qu'à
  **numéroter** les lignes. **Aucun autre chiffre d'autorité n'est touché.**
  ⛔ **NON corrigé, et c'est délibéré** : l'archive de D293 n'est **pas** retouchée — une preuve ne se
  retouche pas (D291), et corriger le script sans corriger sa sortie donnerait une archive qui **ne
  reproduit plus la sienne**. ⇒ Rectification posée **à côté** :
  `docs/preuves/D293/outils/RECTIFICATION-D294.txt` ; chiffre rectifié là où il engage une autorité
  (section D293). **L'instrument corrigé s'écrit à la prochaine certification**, avec
  l'élargissement de la liste blanche — ici, un script ferait **compter** le lot.
  ✅ **ÉCRIT À L'ÉTAPE 0 DE LA CERTIFICATION DU RANG 19 (D299)** : `docs/preuves/D299/outils/extraire-e2e.py`
  compte ses lignes par `splitlines()` **et** son attendu sur les octets de saut de ligne — 910 et 910 sur le
  journal du rang 15. L'archive de D293 reste **non retouchée**.

- **[INFRA][P3]** ⚠ **`python3` ET `python` NE SONT PAS LE MÊME INTERPRÉTEUR SUR CE POSTE — RELEVÉ,
  NON ÉTABLI COMME UN DÉFAUT.** Mesuré le 16/09/2026 : `python3` → **3.14.3**
  (`…/WindowsApps/python3`), `python` → **3.13.3** (`C:\Python313`). ⚠ `CLAUDE.md` et `AGENTS.md`
  invoquent les harnais par **`python3`** ; les scripts de lecture de ce lot ont tourné sous
  `python`. ⛔ **Aucune mesure ne montre que cela change quoi que ce soit** — c'est écrit comme un
  **terme non calibré**, pas comme une cause : dans un dépôt où un instrument rejoue sa calibration
  à chaque invocation, deux interpréteurs pour un même nom méritent d'être connus avant qu'une
  divergence soit attribuée au code. ⇒ **À vérifier le jour où un harnais se comporte différemment
  selon la commande employée**, pas avant.

- **[DOC][P3]** ⚠ **DIX SECTIONS DE REPORTS PORTENT LE TITRE « Ouverts, mesurés, NON corrigés », ET
  CERTAINES CONTIENNENT DES ENTRÉES CLOSES.** Relevé le 16/09/2026 sur les reports de D293 : deux
  entrées sur quatre y sont ✅ closes. **Convention inchangée** (arbitrage de Ko : « sans réécrire les
  conventions »), et chaque entrée porte son ✅/⛔ — mais **un titre se lit avant sa liste**, et c'est
  la même famille que le sous-titre du rang 8 corrigé par ce lot. ⇒ Une ligne d'avertissement a été
  posée sous le titre de la section D293 ; **les neuf autres ne sont pas touchées.**

## Reports du 14/09/2026 — rang 15, certification (D293)

⚠ **UNE CERTIFICATION NE CORRIGE RIEN.** Ce qui est croisé pendant l'étape 0 et la passe se **rapporte**.
Détail : section D293 de `ZWADJ_CONTINUITE.md`.

### ⛔ Ouverts, mesurés, NON corrigés

⚠ **(D294, 16/09/2026) DEUX DES QUATRE ENTRÉES CI-DESSOUS SONT CLOSES** (`chrome`, puis la RAM) : le
titre nomme ce que la section a RECUEILLI, pas l'état de chaque entrée — lire le ✅/⛔ de chacune.
**Convention inchangée** (dix sections portent ce titre), signalé parce qu'un titre se lit avant sa
liste.

- **[INFRA][P2]** ⛔ **LE JOURNAL e2e NE PEUT PAS ENTRER AU DÉPÔT : IL PORTE DES JETONS DE VÉRIFICATION
  D'E-MAIL.** Relevé le 16/09/2026 par l'audit de secrets, sur la passe du rang 15 : **24 occurrences**
  de `…/auth/verification-email?token=` avec une valeur de **43 caractères**, imprimées par le serveur
  de **développement** (pas de mailer en dev) pour les comptes créés par l'e2e.
  ⇒ **Ce que D293 en a fait** : le journal brut **n'est pas versé** (il reste dans
  `.neutralisation-journaux/`, ignoré par git) et la section cite un **EXTRAIT DÉRIVÉ** nommé comme tel,
  construit par **liste blanche** des lignes de verdict (`docs/preuves/D293/outils/extraire-e2e.py`).
  ⛔ **NON corrigé, et c'est une décision de Ko** : (1) laisser ainsi — toute certification future versera
  un extrait, jamais le journal ; (2) ou faire taire le lien de vérification côté serveur de dev, ce qui
  **touche du code** et retire un confort réel. ⚠ **Ne pas « caviarder » le journal** : une preuve ne se
  retouche pas (D291).
  ⚠ **Portée** : tout journal qui capture la sortie d'un serveur de dev est concerné, pas seulement
  l'e2e.
  ✅ **ARBITRÉ PAR KO LE 16/09/2026 (D294) — NI (1) NI (2) : L'EXTRAIT S'ÉLARGIT.** La règle est
  écrite au **point 9 du critère du rang 9**, parce qu'une certification future lit le critère, pas
  une section de session (D276 appliqué à ce qui justifie une règle).
  ⛔ **CE QUI A FAIT TOMBER (2), ET C'EST UNE MESURE DE LA REPRISE À FROID** : `EmailVerificationToken`
  ne stocke qu'un **`tokenHash`** — le jeton clair n'est **jamais** persisté — et
  `DevLoggerEmailSender` est le **seul** fournisseur lié au port `EMAIL_SENDER` (`@Global()`, un
  seul `useClass`). ⇒ **le journal de dev est le seul endroit où le jeton clair existe** : le faire
  taire rendrait la vérification d'e-mail **et** la réinitialisation de mot de passe
  **inachevables en dev**, par aucun chemin que le dépôt fournit. ⚠ **Cette entrée écrivait « retire
  un confort réel » : c'était faux, et sous-estimer un coût biaise l'arbitrage qu'il alimente.**
  **Motif de Ko** : « faire taire le seul chemin de dev pour protéger un journal qui ne quitte pas
  la machine paierait une capacité contre un risque qu'on peut borner autrement. »
  ⚠ **Mesuré aussi, et dans l'autre sens** : (2) ne casserait **pas** l'e2e — aucune spec de `e2e/`
  ne lit ce jeton, les seules occurrences de « token » y sont les **tokens CSS** de
  `b7-token-contract`. Les 24 jetons sont un **sous-produit** de la création de comptes, consommé
  par rien.
  ⛔ **CE QUI A FAIT TOMBER (1)** : l'extrait de D293 garde **3 lignes sur 910** — de quoi lire le
  verdict, **pas** de quoi confronter chaque « failed » à son contexte (D275). Les 4 lignes
  `[WebServer]` sur 742 de la passe du 16/09 ne sont dans **aucune** pièce versée.
  ⇒ **CE QUI EST DÛ, À LA PROCHAINE CERTIFICATION** : journal brut toujours hors dépôt ; liste
  **blanche** élargie jusqu'à porter de quoi **(a) recompter l'e2e** et **(b) confronter chaque
  « failed » à son contexte** ; **jetons exclus par CONSTRUCTION** — l'extrait ABANDONNE si sa
  sortie porte encore `token=`. ⚠ **Ce lot-ci ne relance pas l'e2e** (consigne de Ko) : il écrit la
  règle, pas l'instrument.
  ⛔ **(D299, 21/09/2026) L'INSTRUMENT EST ÉCRIT À L'ÉTAPE 0 DE LA CERTIFICATION DU RANG 19** —
  `docs/preuves/D299/outils/extraire-e2e.py`, sous `docs/preuves/` **sur ordre de Ko** (exempté : aucune porte
  ne le lit), **calibré sur le journal réel** (3 bras sur 3, dont un lien dans une fenêtre d'échec ⇒ refus).
  Son application à la passe : section D299.
  ⚠ **La règle « une preuve ne se caviarde pas » (D291) est RATIFIÉE et elle reste, quelle que soit
  l'option** (Ko, 16/09) : on n'élargit jamais en retouchant le journal, seulement en gardant
  davantage de lignes.
- **[MÉTHODE][P1]** ⛔ **LA CERTIFICATION DU RANG 15 N'A PAS ÉTÉ LANCÉE : PORTE DURE ROUGE SUR `chrome`
  (14 PUIS 15), ALORS QU'IL ÉTAIT ANNONCÉ FERMÉ.** Relevé le 14/09/2026 à 01:50 et 01:51 : 15 processus
  Google Chrome, **une fenêtre visible titrée « Claude Code - Google Chrome »**, des processus enfants
  créés pendant le second relevé (pièces : `docs/preuves/D293/ouverture/`). RAM +697 et +721 au-dessus de
  la barre, SECTEUR : **seul `chrome` bloque.**
  ⚠ **Hypothèse, NON vérifiée** : Ko suit la session dans ce navigateur. ⇒ **Si c'est le cas, suivre une
  certification depuis ce poste et tenir `chrome` = 0 sont incompatibles**, et la porte restera rouge à
  chaque reprise. ⇒ **À ARBITRER PAR KO** : suivre depuis un autre appareil, ou fermer le navigateur (y
  compris ses processus d'arrière-plan) et ne pas suivre. **La porte ne se relâche pas** : elle vient de
  mordre exactement sur ce qu'elle existe pour voir, et la RAM, seule, ne l'aurait pas vu.
  ⇒ **Reprise** : rang 15, **étape 1**, protocole de `657e9ba` inchangé (section D293).
  ✅ **`chrome` RÉGLÉ LE 16/09/2026** : Ko l'a fermé, `CHROME=0` aux deux relevés — la question du suivi
  depuis ce poste **ne se pose plus** (Ko suit depuis VS Code). **Cette ligne est close sur `chrome`.**
  ⚠ **(D294) LE TITRE DE CETTE ENTRÉE — « LA CERTIFICATION DU RANG 15 N'A PAS ÉTÉ LANCÉE » — EST
  PÉRIMÉ** : elle a été lancée et la marque est posée (D293, 16/09). Titre conservé, il date le
  constat d'origine ; l'état est le ✅ ci-dessus.
- **[MÉTHODE][P1]** ⛔ **ET LA PASSE A ÉTÉ REFUSÉE UNE SECONDE FOIS, SUR LA RAM (16/09/2026).**
  3 073,5 puis 3 077,5 Mo de RAM libre médiane, **−1 505,5 et −1 501,5** sous la barre, deux relevés à
  80 s d'écart, `chrome` 0, `node` 0, SECTEUR, calibration passante (pièces :
  `docs/preuves/D293/ouverture-16-09/`). ⚠ **La RAM libre est plus basse de 2 222 Mo qu'au relevé du
  14/09, qui passait la barre AVEC Chrome ouvert** : `vmmemWSL` +1 407, `Code` +751, `msedge` +661 au
  moins, total des processus +2 974. `zwadj-db` ne pèse que **54,86 Mio** — la VM de Docker n'est pas la
  base. ⛔ **Que le démarrage du conteneur par la session explique les +1,4 Go n'est PAS établi.**
  ⇒ **DEUX SORTIES, TOUTES DEUX ARBITRAGE DE KO** : (1) libérer de la mémoire, puis reprise à l'étape 1 ;
  (2) consommer la sortie écrite de D270 — redéfinir « repos » sur le plancher que cette machine peut
  produire, **avec sa raison**, et redéfinir **ce que le seuil garantit** (le critère l'exige). ⛔ **La
  session ne redéfinit pas la barre** : D288 a écrit, en ne consommant pas cette sortie, « aucun
  arbitrage demandé à Ko ».
  ✅ **CLOS LE 16/09/2026 — ET AUCUNE BARRE N'A ÉTÉ REDÉFINIE.** Ko a refusé la sortie de D270 (« redéfinir
  « repos » sur un plancher dégradé fabriquerait la permission au lieu de la condition »), a fermé Edge et
  allégé VS Code, et a fait jouer `wsl --shutdown`. RAM libre remontée à **4 686 puis 4 718 Mo** (+107,
  +139) ⇒ **porte dure verte, passe lancée, marque posée**. ⚠ **Mesuré au passage, et contraire à
  l'attente** : `wsl --shutdown` **n'a pas rendu la mémoire** (`vmmemWSL` 2 133 → 2 165) ; le
  franchissement vient des fermetures de Ko. Détail : section D293, « LE MOUVEMENT D'INVENTAIRE ».
  ⇒ **CE QUI RESTE, ET CE N'EST PAS RIEN** : deux fenêtres ont été perdues, et **la marge à l'ouverture
  était de +107 Mo**. Aucune règle n'en est tirée — à Ko.
- **[INFRA][P3]** ⚠ **LA COLONNE « décl » DE `lancer-campagnes.py` REND « — » SUR 11 CAMPAGNES SUR 26.**
  Relevé le 14/09/2026 sur les journaux attribués à D288 : l'expression `ROUGES` attend
  `neutralis..e\(s\)` — deux caractères — alors que « neutralisée », décodé en UTF-8, n'en porte qu'un.
  **Mesuré** : les 11 résumés sont retrouvés dès qu'un seul caractère remplace les deux (pièce :
  `docs/preuves/D293/versement-d288/verifier-decl.txt`).
  Campagnes concernées : `404`, `available-on-api`, `available-on`, `horizon`, `journey`, `maxprice`,
  `r4`, `solid-s4`, `solid-s5a`, `solid-s5b`, `solid-s7`.
  ⚠ **Sans effet sur les comptes ni sur le code de sortie** : mordues, muettes et non mesurées se
  comptent sur les lignes de verdict, et la colonne n'entre dans aucun total. **Mais une colonne qui
  affiche « — » sur une campagne à 12 gardes mordues se lit comme « aucun résumé »**, c'est-à-dire
  comme une campagne arrêtée en cours. ⇒ **NON corrigé** : le lanceur est un instrument, donc du code.
  ⛔ **TRANCHÉ LE 16/09/2026 (D293), SUR LECTURE DES 26 JOURNAUX VERSÉS — ET LE DOUTE ÉTAIT FONDÉ.**
  Ko a relevé que « décl = — » est **la signature exacte** d'une campagne qui **abandonne au pré-vol
  sans déclarer une seule cible** — diagnostiquée à **D283** (rang 9, fenêtre 1 : `r4` et `solid-s7`,
  suites déjà rouges avant mutation). ⚠ **C'est bien la même colonne, et c'est pourquoi ce n'est pas
  cosmétique** : deux états opposés — *résumé au vieux format* et *aucune cible jouée* — sortent
  identiques.
  ⇒ **Lecture** (`docs/preuves/D293/versement-d288/lecture-decl.txt`, calibrée sur un journal
  d'abandon synthétique et sur un journal réel) : les **11** journaux sans « décl » portent **tous**
  leur résumé, son nombre **égale** les mordues comptées (12·13·10·6·7·10·2·7·9·5·2), **0 abandon de
  pré-vol et 0 erreur de script sur les 26**. ⚠ `r4` et `solid-s7` — les deux de D283 — déclarent ici
  **2 et 2**, ce que D283 écrit comme leur rejeu au repos.
  ⇒ **DÉFAUT D'AFFICHAGE, P3, et la passe de D288 a bien joué ses 26 campagnes.** ⚠ Ce que la lecture
  ne dit pas : que la colonne soit sans conséquence **pour un lecteur** — c'est précisément parce
  qu'elle confond ces deux états qu'elle reste ouverte.

## Reports du 13/09/2026 — incident `zwadj-db`, postgres:18 et le montage (D292)

⚠ **UN INCIDENT, PAS UN LOT.** Le correctif (montage sur `/var/lib/postgresql`) est fait et mesuré ;
ce qui suit est **rapporté**. Cause, pièces et portes : section D292 de `ZWADJ_CONTINUITE.md`.

### ⛔ Ouverts, mesurés, NON corrigés

- **[DOC][P1]** ⛔ **LA BASE DE DEV `zwadj` EST REPARTIE DE ZÉRO LE 13/09/2026 — AUCUNE MESURE FUTURE
  SUR `zwadj` NE SE COMPARE PLUS À CELLES D'AVANT.** Recréée vide, puis les **27** migrations
  appliquées (`migrate deploy`, journal confronté aux fichiers : 0 dérive). Relevé après migration :
  **0** ligne dans `bookings`, `quotes`, `venues` et `users`.
  ⛔ **Ce que l'ancienne base portait et qui est perdu** : c'est sur elle que D282 a compté
  **0 violante sur 4 réservations et 0 sur 38 devis**, et qu'au rang 11 (D286) l'empreinte stockée a
  été relue pour clore le rang 8. **Ces relevés restent vrais à leur date** ; ils ne décrivent plus
  la base. ⚠ Les migrations sont dans git, **les données non** : rien ne les restitue.
  ⚠ **Aucun semis n'a été rejoué** (`db:seed`, `db:seed:demo`) : ce n'était pas demandé, et un semis
  ne rendrait pas les lignes perdues — il en fabriquerait d'autres. À Ko.
- **[INFRA][P3]** ⚠ **DEUX VOLUMES ANONYMES ORPHELINS, VIDES, LAISSÉS EN PLACE.** Relevés le 13/09/2026,
  montés en lecture seule :

  | volume | créé (UTC) | contenu |
  |---|---|---|
  | `c9d8107231a9…` | 2026-07-10 04:11:10 | répertoires `18` et `data`, **0 fichier** |
  | `9380cdd3bcc6…` | 2026-09-14 00:35:46 | répertoires `18` et `data`, **0 fichier** |

  Leur forme est celle d'un démarrage refusé sous l'ancien montage (sonde A de D292) : volume anonyme
  sur `/var/lib/postgresql`, répertoire `18` créé, `data` créé comme point de montage.
  ⛔ **NE PAS LANCER `docker volume prune`** (consigne de Ko) : il retire **tous** les volumes anonymes
  inutilisés de la machine, pas ces deux-là. ⇒ Si Ko décide de les retirer : `docker volume rm` par
  identifiant complet, **après** avoir revérifié qu'ils sont vides.
- **[DOC][P3]** ⚠ **LE SORT DU VOLUME ANONYME QUI PORTAIT LA BASE N'EST PAS ÉTABLI.** Détaché par
  `pnpm db:down` le 13/09/2026 (pièce : `docs/preuves/D291/portes/db-down.log`), il ne figure plus
  parmi les 4 volumes de la machine, et le volume nommé a été **recréé** à 00:35:46 UTC le 14/09, soit
  20:35:46 heure locale le 13/09, avant la session D292. Le journal d'événements de Docker ne remonte
  qu'à 00:46:18 UTC : **le geste qui les a supprimés n'a pas de pièce.** Ne pas l'écrire comme un fait.
  ⚠ **Ce qui ne doit pas s'en déduire** : depuis le correctif, `pnpm db:down` est **sans effet** sur
  les données — elles vivent dans le volume nommé (mesuré par table témoin). Ne pas éviter la
  commande ; seul `down -v` les supprime.
- **[DOC][P3]** ⚠ **COMMENT L'ANCIENNE BASE A PASSÉ LE CONTRÔLE D'INITIALISATION N'EST PAS ÉTABLI.**
  L'image locale (18.4, construite le 07/07/2026) refuse d'**initialiser** une base sous le montage
  `/data` (sonde A), et le contrôle existe en amont depuis le 15/10/2025 (commit `5ec8931` de
  `docker-library/postgres`, patch lu le 13/09/2026). La base de dev a pourtant
  existé et servi 18.4. **Inférence non vérifiée** : initialisée sous une autre configuration ou une
  autre image, puis reprise telle quelle. Sans effet sur le correctif.

## Reports des 12 et 13/09/2026 — rang 14, `PERF` et la durée (D291)

⚠ **AUCUN N'EST CORRIGÉ, ET C'EST LA RÈGLE.** Le rang 14 retire du dossier ce qu'il affirmait sans
mesure, verse les preuves de D290 et mesure la durée à régime constant ; le reste se **rapporte**.

### ⛔ Ouverts, mesurés, NON corrigés

- **[MÉTHODE][P1]** ⛔ **LA POSITION D'UNE PASSE EST UN TERME DE DURÉE — ÉTABLI LE 13/09/2026 (D291),
  ET AUCUNE RÈGLE N'EN EST TIRÉE.** Une passe enchaînée est plus rapide qu'une passe après 60 s de
  repos dans 6 cycles sur 6, de 0,12 à 1,29 s (0,7 à 7,2 %) ; le sens est établi, pas le mécanisme.
  ⇒ **Ce que ça implique, à arbitrer** : deux durées ne se comparent qu'à **position égale** — une
  certification qui enchaîne ses portes, un budget dérivé de passes mêlées, une comparaison
  « avant/après » sur des passes de rang différent portent ce terme sans le dire.
  ⛔ **NON corrigé** : fixer la position dans les relevés de durée serait une règle de méthode, et
  elle appartient à Ko.
- **[DOC][P2]** ⚠ **L'ÉCART DE ~20 % DE D290 N'EST PAS REPRODUIT, ET RESTE INEXPLIQUÉ.** Le relevé de
  D291 rend 12 durées de 16,37 à 17,95 s, observateur présent ou non ; la comparaison de D290 rendait
  20,0-20,3 s. **Différences non testées** : le dénombreur de workers qui tournait pendant la
  comparaison, l'heure (16:15 contre 02:46), `chrome` (14 contre 18), et ce que l'inventaire de 16:15
  ne porte pas. ⚠ À ne pas lire comme « réglé par la position » : elle pèse au plus 7,2 % ici.
- **[DOC][P1]** ⛔ **DES PREUVES D'AUTRES DÉCISIONS SONT ENCORE SUR DISQUE, HORS DÉPÔT — ET UNE
  PARTIE SERA ÉCRASÉE À LA PROCHAINE EXÉCUTION.** Inventaire de `.neutralisation-journaux/` le
  12/09/2026 à 23:46 (42 entrées) :

  | pièces | rattachement PROBABLE (nom, heure) | risque |
  |---|---|---|
  | `venue-list-03-09/` (03/09) | rang 6, D274 — la continuité cite le dossier, pas les fichiers | aucun écrasement connu |
  | `p1-typecheck.log` … `p5-testint.log`, `portes-r11.txt`, `etat-r11.csv` (11/09) | rang 11, D286 | `p1`…`p5` : noms génériques |
  | `porte-{test,build,testint,e2e}-rang12.log`, `etat-rang12.csv` (12/09, 00:43 → 01:34) | rang 12, D288 | noms propres au rang |
  | `neutralize-*.py.log` × 26 (12/09, 00:56 → 01:25) | rang 12, D288, passe `--tout` | ⛔ **réécrits à la prochaine exécution de chaque campagne** |

  ⛔ **NON VERSÉES PAR D291, ET C'EST DÉLIBÉRÉ** : aucune décision ne cite un journal par son
  chemin (zéro, relevé le 13/09) ; le rattachement ci-dessus est une **inférence** par nom et par
  heure, et l'écrire comme un fait serait l'erreur de statut que D291 corrige. Et deux de ces
  journaux (`porte-e2e-rang12.log`, 363 Ko ; `porte-testint-rang12.log`) demandent un audit de
  secrets plus large que ce lot.
  ⇒ **Ce que demande le lot qui les versera** : un rattachement **écrit et confronté** (contenu
  contre chiffres de la décision), un audit de secrets non tronqué — et, pour les 26 journaux de
  campagne, **avant la prochaine passe `--tout`**, sans quoi la pièce de la certification D288
  disparaît.
  ⛔ **ARBITRÉ PAR KO LE 14/09/2026 (clôture de D292) — POUR LES 26 JOURNAUX DE CAMPAGNE SEULEMENT :
  ÉTAPE 0 DU RANG 15, AVANT `--tout`.** Archivés dans `docs/preuves/D288/` ; versement de preuves,
  donc exempté du compteur. **Motif de l'urgence** : le rang 15 est une certification, et une
  certification lance `--tout`, qui les réécrit (`lancer-campagnes.py` ouvre chaque journal en `"w"`,
  relu le 14/09). ⚠ **Encore sur disque le 14/09/2026 à 01:00** : 26 fichiers, du 12/09 00:56:04 au
  12/09 01:25:31. ⚠ **Le rattachement à D288 reste à confronter** au total de gardes que D288 écrit,
  avant d'être écrit comme un fait. ⚠ **Les autres lignes du tableau ne sont pas couvertes** par cet
  arbitrage : elles restent ouvertes ici.
  ✅ **LES 26 JOURNAUX DE CAMPAGNE SONT VERSÉS LE 14/09/2026 (D293), AVANT TOUTE MESURE** :
  `docs/preuves/D288/campagnes/`, 26 copies identiques sur 26 (sha256). **Rattachement confronté au
  texte de D288 et CONCORDANT** — 182 · 0 · 13, répartition des non mesurées, noms, fenêtre et ordre
  de jeu — ⚠ **ce qui reste une inférence confrontée, pas une preuve d'origine** ; le total 195 n'est
  pas confrontable sur ces pièces. Détail : section D293 de `ZWADJ_CONTINUITE.md`.
  ⚠ **CE QUI RESTE OUVERT DANS CETTE ENTRÉE** : les lignes `venue-list-03-09/`, `p1`…`p5` /
  `portes-r11.txt` / `etat-r11.csv`, et `porte-*-rang12.log` / `etat-rang12.csv` — non versées.
- **[INFRA][P3]** ⚠ **L'EN-TÊTE DE `sonde-etat-machine.ps1` NOMME `PERF` « BRIDAGE RÉEL » ET ÉCRIT
  « > 100 % = turbo, donc NON bridé ».** Vrai dans ce sens, sous charge (D286). Mais le nom invite
  la lecture réciproque — « sous 100 ⇒ bridé » — qui est **fausse au repos** (D288 ouvre à 74,8).
  ⇒ **NON corrigé** : c'est un fichier d'instrument, donc du code, hors de ce lot.
- **[MÉTHODE][P2]** ⚠ **UNE RECHERCHE LITTÉRALE SUR DU MARKDOWN EST AVEUGLE AU GRAS.** Trouvé au tri
  de la passe D277 de D291 : « un lot de code **peut** s'ouvrir » ne sortait pas sur le motif
  « peut s'ouvrir » — une permission périmée de l'ordre des rangs restait invisible. Corrigé **dans
  l'outil de D291** (`*` et accent grave retirés du texte et du motif, `~~` gardés pour l'indice
  de barrage). ⚠ Cousin de D289 : le texte aplati rend visible ce qui enjambe une ligne, pas ce
  que coupe un marqueur. **Pas porté dans `AGENTS.md`** — premier constat ; à Ko d'en décider.

## Reports du 12/09/2026 — rang 13, cadrage (D289)

⚠ **AUCUN N'EST CORRIGÉ, ET C'EST LA RÈGLE.** Le rang 13 parle de la borne de workers ; tout
le reste se **rapporte**.

### ⛔ Ouverts, mesurés, NON corrigés

- **[DOC][P0]** ⛔ **LE FICHIER CHARGÉ D'OFFICE PAR TOUTE SESSION EST DEVENU LE POSTE PRINCIPAL,
  ET C'EST LE SEUL QUI NE PEUT PAS SE PLIER À LA LECTURE PAR SECTION.** ⚠ **Arbitrage de Ko,
  12/09/2026 : c'est un RANG À LUI SEUL — découper ce qui est chargé d'office ne se fait pas en
  marge d'un lot de code.** Reporté ici, non traité.

  Mesuré le 12/09 par une reprise à froid, sur le compteur de contexte de la session :

  | | mesure |
  |---|---|
  | démarrage de session, **avant la première lecture** | **91 659 jetons** |
  | lecture ciblée entière de `ZWADJ_CONTINUITE.md` (6 sections + 3 index) | **28 199 jetons** |
  | part du fichier de 495 905 o effectivement lue | **6,3 %** |
  | part de `ZWADJ_BACKLOG.md` (280 280 o) lue | **0,7 %** |

  ⇒ **Le chargement d'office coûte plus de TROIS FOIS la lecture ciblée complète du plus gros
  fichier du dépôt.** La discipline « lire par section » fonctionne et est mesurée ; elle ne
  s'applique simplement pas à `AGENTS.md`, importé en entier par `CLAUDE.md` à chaque session.
  ⛔ **HONNÊTETÉ DE LA MESURE — LE PREMIER CHIFFRE EST UN MAJORANT, PAS LE COÛT D'`AGENTS.md`
  SEUL.** Les 91 659 jetons couvrent l'invite système complète (dont `AGENTS.md` importé et
  `CLAUDE.md`), le message d'ouverture et le premier aller-retour d'outil. `AGENTS.md` en est
  la composante dominante — **103 327 o au relevé du 12/09** — mais **le décomposer demanderait
  une mesure que cette session n'a pas faite**. Le rapport de trois est donc un ordre de
  grandeur mesuré, pas une attribution.
  ⚠ **ET LE LOT D289 A FAIT GROSSIR CE FICHIER** : 103 327 → **107 627 o**, +4 300 o pour
  l'amendement de l'étape 0. **Le poste rapporté ici augmente donc du fait même de la session
  qui le rapporte** — ce n'est pas une raison de ne pas écrire la règle, c'en est une de traiter
  ce report.
  ⛔ **CE QUE CE REPORT NE DEMANDE PAS** : un élagage. Chaque bloc d'`AGENTS.md` porte un défaut
  payé, et « ce n'est qu'un vieux paragraphe » est l'argument qui a laissé passer les compteurs
  figés. ⇒ **Il demande une décision de FORME** — par exemple ce qui doit rester chargé d'office
  et ce qui se lit à la demande — et cette décision appartient à Ko.

- **[INFRA][P2]** ⚠ ~~**TROISIÈME RECONDUCTION DU MÊME ÉCART**~~ ⛔ **QUATRIÈME — ET LA QUATRIÈME
  N'ÉTAIT ÉCRITE NULLE PART ICI (relevé le 13/09/2026, D291)** : **L'OUTIL D'ÉDITION DES FICHIERS
  D'AUTORITÉ EST RESTÉ DANS LE SCRATCHPAD.** `ed.py` au rang 11, l'éditeur CRLF au rang 12, et
  `splice.py` au rang 13. Celui-ci porte trois gardes payées dans son propre lot : ancre comptée
  **avant** écriture (abandon si ≠ 1), normalisation CRLF du remplacement, et **refus d'écrire**
  si un LF nu subsiste après splice.
  ⛔ **LA QUATRIÈME (D290, 12/09/2026)** : `passes_secteur.ps1` — le harnais des cinq passes — et
  les scripts d'écriture documentaire du lot, relevés sur disque le 13/09 (`inserer_d290.py`,
  `inserer_etat_et_regle.py`, `passe_d277.py`, `cloture_rang13.py`, `ajout_scratchpad.py`). D290
  écrivait « cette occurrence s'y ajoute » : **`dfca28f` ne touchait que `ZWADJ_CONTINUITE.md`**, et
  cette entrée disait encore « TROISIÈME ». **Une affirmation fausse, pas un oubli.**
  ⇒ **CE QUE D291 EN A FAIT** : `passes_secteur.ps1` et ses cinq journaux sont versés comme
  **preuves** de D290 (`docs/preuves/D290/`) — archivés, **jamais promus en instrument** : il
  emporterait son défaut de mesure (`PERF` lu une fois, avant la passe, juste après la
  précédente). Les autres outils **ne sont pas** de ce lot (consigne de Ko).
  ⚠ **DEUX FAITS NEUFS POUR LE LOT QUI SOLDERA CETTE ENTRÉE** :
  1. **Copier `passe_d277.py` ne rendrait pas la passe de D290 rejouable** : il contient les deux
     ancres remplacées, pas la recherche qui les a trouvées — et cette recherche, écrite nulle
     part, a manqué une troisième occurrence (ordre des rangs, « Le compteur est à zéro »). D291
     verse la sienne, calibrée : `docs/preuves/D291/passe-d277/`.
  2. **Mesuré le 13/09/2026 : l'outil d'écriture de Claude Code PRÉSERVE le CRLF** sur les trois
     fichiers d'autorité de ce lot — 0 LF nu après une vingtaine d'écritures ; sur `AGENTS.md`,
     après la première, le CRLF est passé de 1 007 à 1 031, exactement les 24 lignes ajoutées.
     ⚠ Mesuré sur ce poste et sur cet outil : à confronter avant de conclure que les éditeurs CRLF
     du scratchpad sont sans objet.
  ⛔ **LE VERSER AU DÉPÔT DANS UN LOT DOCUMENTAIRE EN FERAIT UN LOT DE CODE** (D283) — c'est-à-
  dire un lot non certifié ajouté par une session qui n'en ouvre aucun. **C'est la raison pour
  laquelle l'écart se reconduit, et elle est structurelle, pas de la négligence.** ⇒ Il demande
  un lot d'infrastructure qui assume d'être du code, avec la calibration sur ses deux bras que
  D286 exige de tout instrument versionné.

## Reports du 10/09/2026 — rang 10, cadrage (D284)

⚠ **AUCUN N'EST CORRIGÉ, ET C'EST LA RÈGLE.** Ce lot est documentaire : il n'a touché aucun code.

### ⛔ Ouverts, mesurés, NON corrigés

- **[API][P2]** ⚠ **`DAY_MS` EST REDÉCLARÉ DANS CINQ FICHIERS, `HOUR_MS` DANS UN.** Relevé le
  10/09/2026 en marge du cadrage du rang 10 : `86_400_000` est écrit en dur dans
  `availability-time.ts:19`, `booking-window.ts:31`, `bookings.service.ts:120`,
  `visit-bookings.service.ts:49` et `visit-slots.service.ts:35`.
  ⚠ **CE N'EST PAS UNE FORMULE, ET C'EST POURQUOI C'EST UN P2 ET NON UN P0** : une conversion
  d'unité ne peut pas diverger silencieusement comme deux calculs concurrents du même montant —
  un jour fait 86 400 000 ms partout ou le test tombe. ⛔ **Mais `AGENTS.md` dit « les constantes
  de temps vivent dans `@zwadj/types` »**, et cinq déclarations locales sont cinq endroits où
  quelqu'un écrira un jour `86_400` ou `8_640_000` sans que rien ne le confronte.
  ⇒ **RAPPORTÉ, NON CORRIGÉ** : le rang 10 parle des deux **fenêtres métier**, pas des unités.
  Les toucher serait le refactoring opportuniste que ce dépôt punit — **un défaut croisé se
  rapporte, il ne se corrige pas dans un lot qui parle d'autre chose.**

### Reports décidés, non oubliés

- **[DOC][P3]** ⚠ **LE CADRAGE DU RANG 10 PORTE UNE PRÉDICTION, ET ELLE DOIT ÊTRE VÉRIFIÉE AVANT
  D'ÊTRE CRUE.** Il affirme que les deux cibles d'interversion sont **muettes sur l'arbre
  d'avant** — c'est la démonstration que le défaut existe, et elle **n'a pas été jouée** (lot
  documentaire, aucune porte lancée). ⛔ **Si elles mordaient déjà, le cadrage se serait trompé
  d'objet** et le lot de code devrait s'arrêter pour le dire. C'est la première mesure de la
  session de code, pas une formalité.

## Reports du 10/09/2026 — rang 9, CERTIFICATION (D283)

⚠ **AUCUN N'EST CORRIGÉ, ET C'EST LA RÈGLE.** ⛔ **Et ces trois-là ne dépendent PAS du
verdict de la certification** : ils partaient au backlog qu'elle se pose ou non.

### ⛔ Ouverts, mesurés, NON corrigés

- [x] ~~**[MÉTHODE][P0]** ⛔ **AUCUNE SUITE UNITAIRE NE DÉCLARE DE BUDGET DE TEST — LE VERDICT DES
  PORTES REPOSE SUR UN DÉFAUT QUE PERSONNE N'A ÉCRIT.**~~
  ✅ **ÉPUISÉE LE 21/09/2026 (D297), RANG 17 CLOS.** `testTimeout: 5_000` est écrit dans les quatre
  configurations unitaires, à la valeur **en vigueur** (aide, signature effective, encadrement — trois
  sources, aucune seule) ; la ligne est **lue** (n°8 : 4 sur 4, contre-épreuve 3 sur 4) ; marge
  ~~**≥ 4 618 ms**~~ **≥ 4 603 ms, passes froides comprises** (D298, sur ordre de Ko ; 4 618 est le
  chiffre hors froide) sur un majorant, au repos. ⛔ **Toute AUTRE valeur exige un instrument qui chronomètre
  la seule fonction du test** — report décidé, section D297 ci-dessous.
  ⚠ **LE TABLEAU ET LES PHRASES QUI SUIVENT DÉCRIVENT L'ÉTAT AVANT D297** — ne pas les lire comme
  l'état courant (une entrée close peut porter une phrase courante, D284).
  Relevé le 10/09/2026 sur les cinq
  configurations du dépôt :

  | config | budget |
  |---|---|
  | `apps/api/vitest.config.int.ts` | ✅ `testTimeout: 30_000`, `hookTimeout: 60_000` |
  | `apps/api/vitest.config.ts` | ⛔ aucun |
  | `apps/client/vitest.config.ts` | ⛔ aucun |
  | `packages/api-client/vitest.config.ts` | ⛔ aucun |
  | `apps/pro/vite.config.ts` (bloc `test`) | ⛔ aucun |

  **Seule la config d'INTÉGRATION écrit un budget.** ~~Les cinq suites unitaires héritent du
  défaut vitest~~ — **5 000 ms**, valeur relevée dans la sortie des échecs eux-mêmes, pas de
  mémoire.
  ⛔ **« CINQ » CORRIGÉ EN **QUATRE** LE 20/09/2026 (D295), ET LE MOTIF N'EST PAS L'ARITHMÉTIQUE.**
  Mesuré : quatre packages seulement portent un script `test` — `apps/api`, `apps/client`,
  `apps/pro`, `packages/api-client` ; `packages/i18n`, `types`, `ui` et `config` n'en ont aucun.
  La table ci-dessus compte **cinq configurations**, dont **une d'intégration** : cinq moins une
  fait quatre, et la phrase se contredisait **dans ses onze premiers mots**.
  ⛔ **CE QUI REND LA CORRECTION URGENTE, ET C'EST LA SEULE RAISON QUI COMPTE : CE CHIFFRE POINTE
  VERS `vitest.config.int.ts`.** Un lot qui part de « cinq » cherche une cinquième configuration
  unitaire où écrire un budget, et **la seule candidate du dépôt est celle d'intégration — qui en
  a déjà un, à 30 s.** Y écrire 5 000 ms le diviserait par six : **un CHANGEMENT DE COMPORTEMENT,
  que la forme (b) interdit explicitement.** Le chiffre faux désignait le seul fichier qu'il ne
  faut pas toucher, et il le désignait dans **la ligne d'attaque du lot**.
  ⚠ **ET CE QUI LE RANGE COMME UN MOTIF PLUTÔT QUE COMME UNE COQUILLE** : la phrase date du relevé
  du 10/09 et a **survécu à trois passes D277** (D290, D291, D294). Le 16/09, une remesure a écrit
  « **les quatre configurations unitaires** » **douze lignes plus bas, dans cette même entrée**,
  sans corriger « cinq » douze lignes plus haut. **Une affirmation juste posée à côté d'une
  affirmation fausse ne corrige pas la fausse** — et une passe partielle se lit exactement comme
  une passe faite (D280). ⇒ Trouvée par une **reprise à froid**, pas par une passe.
  ⛔ **CE QUE ÇA FALSIFIE, ET C'EST LA PHRASE QUI NOUS SERVAIT DE GARDE-FOU** : « les verdicts
  valent, les durées ne valent rien » (D282). **Mesuré le 10/09 : une dérive de durée EST
  DEVENUE un verdict.** Même arbre, même commande — `pnpm --filter @zwadj/client run test`
  rend **273/287 avec 22 signatures « Test timed out in 5000ms »** sous contention, et
  **287/287 en 21 s** au repos. La barre RAM était **satisfaite** dans le cas rouge (4 636 Mo,
  soit +57 au-dessus).
  ⇒ **La barre ne protège pas les verdicts en soi : elle les protège parce qu'elle tient les
  durées sous un budget QUE PERSONNE N'A ÉCRIT. Un budget non écrit n'est pas une garde.**
  ⚠ **ET LE REMÈDE N'EST PAS D'ÉCRIRE UN `testTimeout` PLUS GRAND** : augmenter le budget
  **masque** l'effondrement au lieu de le révéler. D270 le disait déjà de sa propre borne —
  « une assurance, pas un correctif ». Ce report demande une décision, pas un réglage.
  ⛔ **ORDRE ARBITRÉ PAR KO LE 12/09/2026 (D291)** : le **rang 14 — `PERF` et la durée — passe
  AVANT ce report.** Motif de Ko : un budget calculé sur des durées dont ~20 % restent
  inexpliqués serait choisi au jugé. ⚠ La désignation « rang 14 » que D290 lui donnait est
  barrée dans l'ordre des rangs ; aucun rang ne lui est attribué.
  ⚠ **RÉSULTAT DU RANG 14, À LIRE AVANT D'ÉCRIRE UN BUDGET (D291, 13/09/2026)** : la **position**
  d'une passe est un terme de durée — après repos plus lente qu'enchaînée, 6 cycles sur 6, de 0,7 à
  7,2 % ; et l'écart de ~20 % de D290 **n'est pas reproduit** : il reste inexpliqué.

  ⛔ **FORME ARBITRÉE PAR KO LE 16/09/2026 (D294) — C'EST (b), ET CE REPORT A ENFIN SA FORME.**
  ⚠ **LE MOTIF CI-DESSUS VAUT DE (a), PAS DE (b)** : troisième des trois phrases de cette famille
  annotées le 16/09 (les deux autres sont au point d'entrée du rang 14 et dans l'ordre des rangs).
  Lue seule, elle conditionne ce report à une explication des ~20 % qui n'est pas venue et ne
  viendra peut-être jamais — **c'est le second sens de D287**, celui qui n'a rien à contredire.
  - ⛔ **(a) — CHOISIR UNE VALEUR SUR DES DURÉES : NON FONDABLE AUJOURD'HUI, ET C'EST MESURÉ.** La
    quantité qu'un budget **LIE** est le **maximum PAR TEST** — le mode de défaillance est
    l'expiration, les 22 signatures du 10/09 sont par test. Or le dépôt n'en a que **deux points
    isolés, sur deux suites, à deux dates** : le test le plus lourd au repos tient dans environ
    **un treizième** des 5 000 ms (01/09, le rouge exigeant un facteur d'environ **55×**, donc de
    la contention), et l'API rend **2,1× de marge** à 8, 24 et 48 processus (02/09, après le
    départ d'argon2). Un troisième point est **caduc** : argon2 à 3,4 s de 5 s au repos, sorti de
    l'unitaire à D271. ⛔ **Et sa DISPERSION n'a jamais été mesurée** — les 12 passes de D291
    mesurent la durée **de suite entière** (16,37 à 17,95 s), pas le maximum par test. Le critère
    du rang 9 exige déjà, pour un simple nombre de passes, **la marge sur la contrainte liante ET
    sa dispersion** : un budget en demande au moins autant.
  - ✅ **(b) — ÉCRIRE LA VALEUR EN VIGUEUR : FONDABLE, ET ELLE NE DEMANDE PAS QUE LES ~20 %
    SOIENT EXPLIQUÉS.** Aujourd'hui **5 000 ms n'est écrit nulle part** dans les quatre
    configurations unitaires (remesuré le 16/09 : seule `vitest.config.int.ts` déclare un budget).
    Personne ne peut donc distinguer une **politique** d'un **héritage** — et c'est littéralement
    ce que dit ce report : « un budget non écrit n'est pas une garde ». Le lot mesure le maximum
    par test des quatre suites **au repos**, écrit le budget **à la valeur déjà en vigueur**, avec
    les marges mesurées à côté. **Rien ne change de comportement** ; ce qui change, c'est qu'une
    dérive devient visible et qu'un changement futur devient arbitrable.
    ⛔ **CONTRAINTE RETENUE PAR KO** : **N — le nombre de passes — se DÉRIVE de la dispersion du
    maximum PAR TEST, mesurée DANS LE MÊME LOT.** Il ne se choisit pas, et il ne s'hérite pas
    d'un autre relevé : la quantité n'a jamais été mesurée, donc sa dispersion se produit ici ou
    le lot n'a pas de base.
    ⚠ **COMPATIBLE AVEC L'INTERDIT DE CE REPORT** — « le remède n'est pas d'écrire un
    `testTimeout` plus grand » : (b) écrit **la même** valeur, pas une plus grande. ⚠ **Et tout
    multiplicateur au-dessus du maximum observé serait une ASSURANCE, pas une mesure** : il
    s'écrirait comme telle, d'avance. (b) n'en porte aucun.
  ⇒ ~~**CANDIDAT DÉSIGNÉ DU RANG 17, NON ARBITRÉ** : « je l'ouvrirai après ce lot » (Ko, 16/09).~~
  ⛔ **ARBITRÉ PAR KO LE 20/09/2026 (D295) — C'EST LE RANG 17, FORME (b), ET SON PREMIER LOT EST UN
  CADRAGE SEUL.** Barré plutôt qu'effacé (D276).
  ⛔ **CETTE ENTRÉE RESTE OUVERTE, ET CE N'EST PAS UN OUBLI** : le cadrage n'écrit **aucun**
  `testTimeout` — il écrit la quantité que le budget lie, la règle de dérivation de N **avant** les
  chiffres, le protocole de calibration et les modes de défaillance. **C'est le lot de CODE qui
  suivra qui épuisera cette entrée**, et c'est lui qui portera le compteur de lots non certifiés à
  UN. ⇒ Le cadrage : section « PROCHAIN LOT — rang 17 » de `ZWADJ_CONTINUITE.md`.
  ⛔ **(D296, 20/09/2026) LE LOT DE CODE EST ARBITRÉ AU RANG 17 PAR KO — ET BLOQUÉ LE MÊME JOUR, AVANT
  TOUTE LIGNE.** La source que le cadrage prescrit, la `duration` du **reporter JSON**, compte les
  `beforeEach`/`afterEach` ; `testTimeout` n'enveloppe que la fonction du test. Le bras de
  discrimination rend **1 208 à 1 218 ms** là où il exige moins de 100 — et `client` comme `pro`
  portent des hooks **globaux**, donc aucun de leurs tests n'y échappe. **Toute sortie réécrit une
  pièce du cadrage : elle appartient à Ko.** Cette entrée reste **ouverte**, le compteur à **zéro**.
  ⇒ État et sorties : point d'entrée du rang 17 et section D296 de `ZWADJ_CONTINUITE.md`.
  ⛔ **(D297, 21/09/2026) RENDUE FAUSSE PAR MESURE** : le plus lourd test d'`apps/api` tient, hooks
  compris, en ~~362,7 ms au repos — marge ≥ 4 637 ms~~ **370,7 ms passe froide comprise — marge ≥ 4 629 ms**
  (D298 : la marge écrite comprend les passes froides ; 362,7 / ≥ 4 637 est le chiffre hors froide).
  ⚠ **Ce lot rendra vraie ou fausse PAR MESURE** la ligne « `testTimeout` de `apps/api` serré à
  5 s » des « décisions encore ouvertes », barrée le 16/09 pour cause d'héritage pris pour un
  réglage (D294).

- **[MÉTHODE][P1]** ⛔ **EXIGER LE SECTEUR PROTÈGE LES MESURES, PAS LE DÉVELOPPEMENT QUOTIDIEN —
  RAPPORTÉ LE 12/09/2026 (D290), NON CORRIGÉ, ET C'EST DÉLIBÉRÉ.**
  Le point 6 du critère et la règle d'`AGENTS.md` interdisent désormais qu'une mesure qui entre
  dans une décision soit prise sur batterie. ⛔ **Mais si le régime batterie convertit bien une
  durée en verdict, il le fera encore quand une suite se lancera débranchée — et là, personne ne
  mesure.** Un développeur qui lance `pnpm test` dans un train verra des échecs que le code n'a
  pas produits, et cherchera dans le code.
  ⚠ **CE QUI EST MESURÉ** : − 41 % sur `test:int`, − 63 % sur les campagnes (D283) ; un budget
  hérité de **5 000 ms** non écrit dans les quatre suites unitaires. ⛔ *(D297 : écrit depuis le
  21/09/2026, à la même valeur — le budget n'est plus hérité, il est déclaré.)*
  ⛔ **CE QUI N'EST PAS MESURÉ, ET C'EST LE POINT** : **que ce soit la cause du cas rouge du
  09/09.** Le terme reste **NON IDENTIFIÉ** — trois termes écartés ne font pas une cause trouvée,
  et **273/287 avec 22 délais dépassés n'a à ce jour aucune explication établie**. ⚠ Écrit pour
  qu'aucune session future ne lise la clotûre du rang 13 comme « la question est réglée ».
  ⇒ **Remède possible, NON arbitré** : une garde qui refuse ou avertit quand une suite démarre
  hors secteur. Ce serait du **code**, donc un lot, donc un rang — et la session n'arbitre pas
  l'ordre des rangs.

- **[MÉTHODE][P0]** ⛔ **LA BORNE DE WORKERS DE D270 N'EXISTE QUE DANS `pro` — UN REMÈDE
  MESURÉ, CHIFFRÉ, ÉCRIT, ET APPLIQUÉ À UNE SUITE SUR QUATRE.**

  ⛔ **CETTE ENTRÉE A UN RANG DEPUIS LE 12/09/2026 (D289) : c'est le RANG 13**, arbitré par Ko.
  ~~Sans rang, désignée seulement.~~ ⇒ **Son cadrage est ÉCRIT** — section « PROCHAIN LOT —
  rang 13 » de `ZWADJ_CONTINUITE.md` : la grandeur y est **nommée** (mémoire disponible **par
  worker**, **pendant** la passe), le protocole de dérivation des bornes est fixé d'avance, et
  la démonstration est spécifiée. ~~⚠ **Le lot de CODE reste à faire**~~ ⛔ **LE LOT DE CODE A EU LIEU LE 12/09/2026 (D290),
  ET IL N'A POSÉ AUCUNE BORNE** ; cette entrée n'est donc **pas** close, et ce qui suit reste
  la mesure d'origine.
  ⇒ **TROIS TERMES SONT ÉLIMINÉS** : la RAM d'ouverture (D289), le **chemin d'invocation**
  racine-contre-filtré (**11 workers contre 11**, 1,6 % d'écart de durée sur un bruit de
  19 %, sérialisation dénombrée stricte), et le **nombre de workers** comme grandeur propre.
  ⛔ **ET LES DEUX CHIFFRES DE CETTE ENTRÉE SONT PÉRIMÉS** : le creux de 2 652 Mo appartient
  aux **54 min** des portes et campagnes — isolée, la suite creuse **1 329 Mo** — et
  « 12 à 14 workers » comptait des **processus**, les workers sont **11**.
  ~~⇒ **CE QUI RESTE DÛ N'EST PLUS UNE BORNE** : c'est l'expérience du **RÉGIME
  D'ALIMENTATION**, seul terme non éliminé, dont **Ko produit la condition**. Protocole et
  deux issues en section D290.~~
  ⛔ **BARRÉ LE 13/09/2026 (D291)** : l'expérience batterie a été **refusée par Ko** avant toute
  mesure (clôture de D290). La dispersion de durée **à régime constant** est l'objet du
  **rang 14** (D291).
  ⛔ **ET LE CADRAGE A TROUVÉ QUE LA RAM D'OUVERTURE NE DISCRIMINE PAS** : le cas rouge du 09/09
  (4 636 Mo) tombe **entre** les deux cas verts du 12/09 (4 624 et 4 643). La contention à
  reproduire n'est donc pas une simple baisse de RAM de départ — voir le cadrage.

  | config | borne |
  |---|---|
  | `apps/pro/vite.config.ts` | ✅ `maxWorkers: 4` (D270, mesuré le 30/08) |
  | `apps/client/vitest.config.ts` | ⛔ aucune — **c'est la suite qui a rendu les 22 délais dépassés** |
  | `apps/api/vitest.config.ts` | ⛔ aucune |
  | `packages/api-client/vitest.config.ts` | ⛔ aucune |

  ⛔ **C'EST LA CONFIGURATION DE D277 SUR UN REMÈDE DE CODE** — la décision est écrite au bon
  endroit, elle n'a pas traversé jusqu'aux trois autres — **et elle vient de convertir une
  durée en verdict pour la DEUXIÈME fois** (30/08 sur `pro`, 09/09 sur `client`).
  ⚠ **LA GRANDEUR QUI DÉCIDE N'A TOUJOURS PAS DE NOM, ET ELLE EST MAINTENANT CHIFFRÉE.** Le
  commentaire de `apps/pro/vite.config.ts` nomme le mécanisme : « chaque worker porte un
  environnement jsdom complet ; le défaut de vitest suit le nombre de cœurs (12 ici) **SANS
  REGARDER LA MÉMOIRE DISPONIBLE** ». Mesuré le 10/09 par échantillonnage périodique : la
  passe fait tomber la RAM libre de **5 400 à 2 652 Mo** avec **12 à 14 workers**, et **66
  échantillons sur 104 sont SOUS la barre** — dont **zéro** machine au repos. ⇒ La grandeur
  est la **mémoire disponible PAR WORKER**, et personne ne l'a nommée ni le 30/08 ni le 10/09.
  ⛔ **NE PAS PROPAGER `maxWorkers: 4` PAR RÉFLEXE** : D270 a mesuré qu'elle coûte **+31 %**
  sur `pro` et que la sérialisation coûterait 2,6×. Une borne se **mesure** par suite ; celle
  de `pro` n'est pas transposable sans sa mesure.

- [x] ~~**[MÉTHODE][P0]** ⛔ **LA SOURCE D'ALIMENTATION N'EST DANS AUCUN RELEVÉ DU DÉPÔT, ET SON
  ABSENCE A COÛTÉ DEUX FENÊTRES DE CERTIFICATION.** Les relevés d'état machine ont toujours
  porté quatre quantités — RAM libre · `node` · CPU · inventaire. **Aucune ne voit
  l'alimentation.**
  ⇒ **Mesuré la nuit du 09→10/09/2026** : bascule sur batterie à **20:44:41** (au milieu de la
  porte `test:int`, qui enjambe l'instant), puis `Critical Battery Trigger Met` à **02:22:11**
  et **huit heures de veille**. **Pendant tout ce temps les quatre quantités étaient
  NOMINALES.** La porte dure a été tenue et elle n'a rien vu.
  ⇒ **Effet chiffré sur le même arbre et la même suite** : `test:int` **475 s sur batterie
  contre 279 s sur secteur** (−41 %) ; `lancer-campagnes --tout` **5 454 s contre 2 011 s**
  (−63 %). Le « +57 % inexpliqué » du 09/09 avait cette cause.
  ⚠ **CE N'EST PAS « LA SOURCE », C'EST LA SOURCE ET LE MODE ACTIF** : un mode bridé peut
  survivre au rebranchement tant que la charge est basse. **Rebrancher n'est pas être au
  régime secteur**, et seul un instrument calibré le distingue (retenu le 10/09 :
  `% Processor Performance`, repos 83,5 % / charge connue 128,6 % ; `CurrentClockSpeed`
  écarté, il rend `MaxClockSpeed` et ne distingue rien).
  ⇒ **DÉJÀ FAIT, et ce n'est pas ce report** : le critère du rang 9 porte désormais la
  cinquième quantité et les relevés périodiques. **CE QUI RESTE DÛ ICI** : les porter dans
  `neutralisation/sonde-etat-machine.py` — l'instrument vit toujours dans le **scratchpad**
  (réserve n°2 de D275, jamais levée), donc **irreproductible et incontestable par la session
  suivante**. ⚠ La nuit du 09→10/09 est la démonstration de ce que cette réserve coûte :
  l'instrument qui a raté la cause était précisément un instrument hors dépôt.~~
  ⛔ **TRAITÉ LE 11/09/2026 — RANG 11 (D286).** L'instrument est au dépôt : `neutralisation/sonde-etat-machine.ps1`
  (+ `echantillonneur-etat-machine.ps1` pour l'INTERVALLE, que deux extrémités ne voient
  jamais). ⚠ **Écart au nom annoncé** : `.ps1` et non `.py` — les cinq quantités sont des
  compteurs Windows, et les lire depuis Python reviendrait à lancer powershell.
  ⚠ **ET LA CALIBRATION DE 2024 N'EST PLUS HÉRITÉE** : `-Calibrer` rejoue la séparation des
  régimes ici et maintenant. Motif mesuré le 11/09 : une charge de calibration **elle-même
  bridée** rendait 3,7 s de CPU sur 3 s là où 12 cœurs en offrent 36, et faisait conclure
  « l'instrument ne sépare pas les régimes ». Bridage retiré : **34,2 s sur 3 s**.
  ⛔ **CONTRADICTION RELEVÉE, ET TRANCHÉE PAR LA MESURE** : le message de Ko du 11/09 dit
  « les trois `[MÉTHODE][P0]` du 10/09 restent ouverts et ne sont pas de ce lot ». Celui-ci
  **en était**, et le rang 11 qu'il a lui-même arbitré le traite. Quand une phrase et l'état
  mesuré se contredisent, **c'est l'état qui fait foi** (D276) — l'entrée est donc fermée,
  et la contradiction écrite plutôt que tue. **Les deux AUTRES restent ouverts.**

- **[INFRA][P3]** ⚠ **LA SONDE COMPTE LES PROCESSUS `node` SANS DISTINGUER UN OBSERVATEUR
  D'UN WORKER DE TEST.** La condition écrite par D275 porte sur les **observateurs de
  fichiers** (`next dev`, `vite`, `tsc --watch`) qui recompilent pendant qu'une suite lit les
  mêmes fichiers — c'est la seule piste non écartée de l'intermittence de D274. Mais
  `NODE=15` relevé pendant `pnpm test:int` le 11/09/2026, ce sont **les workers des suites
  elles-mêmes**, et le chiffre ne dit pas lequel est lequel.
  ⇒ **Conséquence actuelle, et elle tient** : c'est le relevé d'**OUVERTURE**, machine au
  repos, qui porte la condition (`NODE=0`). Le relevé pendant la mesure ne peut pas la porter.
  ⇒ **Affinage possible** : relever la **ligne de commande** des processus `node`
  (`Get-CimInstance Win32_Process`) et compter séparément ceux qui portent `dev`, `vite`,
  `--watch`. ⚠ **À calibrer** sur un cas connu — une pile `dev` lancée exprès — sinon
  l'instrument classerait sans qu'on sache s'il classe juste.
  ⛔ **(D300, 22/09/2026) UNE RÈGLE DE CERTIFICATION S'ADOSSE DÉSORMAIS À CETTE DISTINCTION.** Ko a comblé le
  point 7 du critère : la barre porte sur l'état ambiant, relevé à `node` = 0 ; un creux pendant une mesure
  **« avec les seuls `node` de cette mesure »** est la charge certifiée ; un creux avec `chrome` ou un
  **processus étranger** disqualifie la fenêtre. ⇒ **Ce que l'instrument en voit, mesuré sur les huit creux
  de D299** (`docs/preuves/D300/etape0/`) : l'**échantillonneur** — pas seulement la sonde — ne relève que
  `node`, `chrome` et `nb_proc`, **sans nom ni ligne de commande**. La clause `chrome` est outillée ; « les
  seuls `node` de cette mesure » ne s'établit que **par encadrement** (0 avant, 0 après) ; un étranger qui ne
  s'appelle ni `chrome` ni `node` ne se voit qu'au compte `nb_proc`, que la mesure fait elle-même bouger
  (**+6 à +20** dans les huit creux, sous Playwright comme sous vitest). ⇒ **L'affinage ci-dessus vaudrait
  pour les deux instruments.** ⚠ **Le P3 date d'avant qu'une règle de certification en dépende** — sa
  réévaluation appartient à Ko ; c'est du code de `neutralisation/`, donc un lot qui compte.
  ⛔ **(D301, 22/09/2026) LA CLAUSE DE DISQUALIFICATION QUI S'Y ADOSSAIT EST RETIRÉE.** Ko a réduit le point 7 à ce
  qui se mesure : ~~un creux avec `chrome` ou un **processus étranger** disqualifie la fenêtre~~ ⇒ un creux avec
  `chrome` > 0 disqualifie ; les autres processus étrangers, `node` compris, **ne sont pas mesurés** pendant la
  fenêtre — limite déclarée. L'**inventaire** a son entrée propre (`[INFRA]` du 22/09/2026, D301). Celle-ci garde
  son objet : **classer** les `node` — ce qui rendrait « les seuls `node` de cette mesure » mesurable PENDANT la
  fenêtre, et plus seulement par encadrement.

- **[DOC][P1]** ⛔ **LE POINTEUR « RANG SUIVANT » EST À ~330 LIGNES DU DÉBUT DE L'ORDRE DES
  RANGS, ET IL S'ÉLOIGNE D'UN RANG PAR LOT.** Relevé le 11/09/2026 par une reprise à froid :
  la section D270 de `ZWADJ_CONTINUITE.md` — celle que l'en-tête désigne pour répondre à
  « QUEL lot vient ensuite » — ouvre l. 4412 et sa réponse vit l. **4838**. Entre les deux,
  douze rangs clos et leurs cadrages, dont le seul critère de certification du rang 7 fait
  ~90 lignes.
  ⇒ **Le coût est mesuré, pas supposé** : une reprise doit soit traverser les 330 lignes,
  soit **savoir d'avance** d'aller à la fin — c'est-à-dire disposer d'une information que le
  pointeur ne donne pas.
  ⚠ **CE N'EST PAS UN APPEL À RÉSUMER LA SECTION.** Chaque rang clos porte son MOTIF, et
  l'ordre lui-même écrit pourquoi : « un ordre sans motif ne se corrige pas, il se recopie »
  (quatrième écriture, 03/09). Élaguer les motifs rouvrirait la porte que quatre révisions
  d'ordre ont fermée. ⛔ **Ce report demande une décision de FORME, pas un élagage** — par
  exemple porter l'état courant en TÊTE de la section, les rangs clos restant dessous.
  ⚠ **Et il ne se traite pas en écrivant un numéro de rang quelque part** : c'est très
  exactement le compteur figé que D283 a retiré de l'en-tête pour cette raison.
  ⛔ **(D300, 22/09/2026) TRAITÉE À MOITIÉ PAR LE RANG 20 — L'ENTRÉE RESTE OUVERTE.** Ko a arbitré le
  **titre** (« ## ORDRE DES RANGS — QUEL lot vient ensuite »), pas la forme que cette entrée proposait.
  **Mesuré** (`docs/preuves/D300/deplacement/distances.py`, sur `0a8235d` puis sur l'arbre) : le pointeur
  « section D270 » tombait **333** lignes au-dessus de l'ordre et **840** au-dessus du rang courant — ce
  préambule-là **a disparu**. ⛔ **Mais la distance que CETTE entrée chiffre — dans l'ordre, de son début à
  la réponse — ne raccourcit pas** : **507** au commit d'avant, davantage après (le titre et son introduction
  s'y ajoutent ; valeur de clôture dans la même pièce). ⇒ **Ce qui a changé** : l'introduction de l'ordre dit
  désormais **où** est la réponse — « la DERNIÈRE ligne “⇒ RANG N” » —, soit l'information que « le pointeur
  ne donne pas », **sans écrire de numéro de rang**. **Ce qui reste** : la traversée elle-même ; une décision
  de forme au-delà du titre appartient à Ko.

- [x] ~~**[DOC][P3]** ⚠ **COQUILLE DANS UN FICHIER D'AUTORITÉ** : section D286 de
  `ZWADJ_CONTINUITE.md`, « l'écart est écrit ici plutôt que **tu** » — phrase tronquée
  (« plutôt que tu », pour « plutôt que passé sous silence » ou « que tu »). Relevée le
  11/09/2026, **non corrigée**, parce qu'elle vit dans une section de session close et que
  la corriger seule vaut moins qu'une passe groupée. Sans conséquence de lecture.~~
  ⛔ **FERMÉE LE 12/09/2026 (D289) — CE N'EST PAS UNE COQUILLE, ET LE SIGNALEMENT ÉTAIT UNE
  MÉSAUDITION.** `tu` est le **participe passé de « taire »**, accordé au masculin « l'écart » :
  « l'écart est écrit ici plutôt que **tu** » = *plutôt que passé sous silence*. La même
  tournure porte « tu**e** » ailleurs dans le backlog, accordée à « la **contradiction** ».
  **Les deux sont justes ; il n'y a rien à corriger.**
  ⚠ **ENTRÉE BARRÉE, PAS EFFACÉE** (D276) : effacée, elle se resignalerait de bonne foi au
  prochain balayage, par quelqu'un qui ignore qu'elle a déjà été jugée.
  ⛔ **ET CE QU'ELLE A COÛTÉ EN PASSANT, QUI VAUT PLUS QUE L'ENTRÉE** : en la vérifiant, une
  session a d'abord conclu — et **écrit dans `AGENTS.md`** — que la chaîne « n'avait jamais
  existé dans aucun commit », parce que `grep` et `git log -S` ne la trouvaient pas. **Elle
  existe** : la phrase **enjambe un retour à la ligne**, et ni l'un ni l'autre ne franchit un
  saut de ligne. ⇒ **Ces fichiers sont enveloppés à ~95 colonnes — toute expression de plus de
  quelques mots y est coupée au moins une fois.** Tout balayage d'un fichier d'autorité se fait
  donc sur le **texte aplati**, jamais sur ses lignes. Affirmation fausse retirée d'`AGENTS.md`
  et remplacée par cette mesure le 12/09.

- **[INFRA][P2]** ⚠ **L'OUTIL D'ÉDITION DES FICHIERS D'AUTORITÉ EST RESTÉ UN SCRIPT JETABLE
  DU SCRATCHPAD, ET C'EST LE CONTRAIRE DU PRINCIPE DU RANG 11.** `ed.py`, écrit le
  11/09/2026 pour D287, porte deux gardes payées **dans ce lot même** :
  1. `norm()` — normalise le remplacement en CRLF **avant** d'écrire. Motif : un bloc
     triple-quoté a injecté **61 LF nus** dans un fichier CRLF pur, et l'assertion ne l'a vu
     qu'APRÈS l'écriture ;
  2. le **genre dérivé** — `substitution` / `insertion` / `suppression` se déduit de
     `apres.count(avant)`, il ne se déclare plus. Motif : le genre a été déclaré **faux deux
     fois**, parce qu'une **insertion au MILIEU d'une ancre la DÉTRUIT** et devient une
     substitution au sens du compte. **Un genre déclaré peut mentir ; un genre dérivé non.**
  ⇒ **Ce qui est dû** : le versionner sous `neutralisation/` avec l'en-tête exigé par D286 —
  mode d'emploi, pourquoi il existe, instruments écartés, calibration rejouée à chaque
  invocation. ⚠ **Sa calibration a un cas limite tout prêt** : une insertion au milieu d'une
  ancre, dont le verdict attendu est `substitution` — c'est le cas qui l'a fait naître.
  ⚠ **MÊME CLASSE QUE LE COMPARATEUR DE DÉRIVE DE D286**, resté jetable lui aussi : deux
  instruments hors dépôt en deux lots, sur le lot qui a fait entrer les instruments au dépôt.
  ⛔ **TROISIÈME DE LA MÊME CLASSE, AJOUTÉ LE 12/09/2026 (D288)** : `edcrlf.py`, écrit pour
  les écritures documentaires du rang 12 et **resté dans le scratchpad**. Il porte une garde
  de plus, payée elle aussi dans son propre lot : **il assertit le compte d'occurrences AVANT
  d'écrire et refuse sans rien toucher** s'il ne trouve pas le compte attendu. ⚠ Il est
  calibré sur ses **deux bras** (compte juste ⇒ écrit et normalise le LF ; compte faux ⇒
  refuse, fichier inchangé) — mais **une calibration hors `git` n'est pas rejouable**, ce qui
  est le reproche exact de D286. ⇒ **Trois instruments, trois lots consécutifs.**
  ⛔ **ET CE QUE D288 A MESURÉ SUR LUI VAUT POUR SON EN-TÊTE, LE JOUR OÙ IL SERA VERSÉ** :
  un outil d'édition **ne protège pas d'une entrée déjà corrompue**. Le 12/09, bash a mangé
  cinq jetons entre accents graves d'un texte passé à `python3 -c` entre guillemets doubles ;
  l'outil a rapporté « 1 remplacement, 0 LF nu, marqueur présent » — **tout juste, et le
  fichier était faux**. ⇒ Son mode d'emploi doit dire que **la vérification qui compte est la
  relecture du fichier**, pas le succès de l'outil.
  ⛔ ~~**Il touche `neutralisation/`, donc c'est du code : il ne s'ouvre pas à deux lots non
  certifiés.**~~ **CONDITION LEVÉE LE 12/09/2026 (D288)** : la certification du rang 12 a
  ramené le compteur de lots de code non certifiés **à ZÉRO**. Il touche toujours
  `neutralisation/`, c'est toujours du code — **mais plus rien ne le bloque**, il lui manque
  seulement un rang arbitré par Ko.
  ⚠ **C'EST UNE PERMISSION PÉRIMÉE AU SENS DE D287, ET ELLE A ÉTÉ TROUVÉE PAR LA PASSE QUI
  CHERCHE CE QUE LE LOT REND PERMIS** — pas par une recherche de contradiction : cette phrase
  ne contredisait **aucun mot** du lot de certification, elle en dépendait.

- **[INFRA][P2]** ⚠ **TROIS HARNAIS N'ONT PAS DE GARDE `if __name__ == "__main__"`, ET LES
  IMPORTER JOUE LA CAMPAGNE.** Relevé le 11/09/2026 sur les 26 harnais :
  `neutralize-act-plafonds.py`, `neutralize-argon2.py`, `neutralize-horloge.py`.
  ⇒ **Conséquence exécutoire** : `neutralisation/verifier-mutations.py` **REFUSE** de les
  importer et les compte NON COUVERTS — il ne peut donc pas prouver que leurs mutations sont
  posées, et une de leurs cibles déclarée « muette » resterait indistinguable d'un
  remplacement fantôme.
  ⚠ **Ce n'est pas un défaut du vérificateur, c'est une limite nommée** : le refus vaut mieux
  que l'import, qui muterait des fichiers sources sur un arbre propre.
  ⇒ **Remède** : envelopper le corps de ces trois harnais dans une fonction `main()` sous
  garde. ⛔ **C'est un lot qui touche des campagnes, donc il peut dégrader une porte** — il ne
  s'ouvre pas dans la foulée d'un autre.

- **[INFRA][P2]** ⚠ **SIX CIBLES DE `neutralize-404.py` NE SONT PAS DES SUBSTITUTIONS DE
  TEXTE**, et le vérificateur de mutations n'a rien à y prouver : elles RENOMMENT, CRÉENT ou
  SUPPRIMENT un fichier (`genre` = `renommer` / `creer` / `supprimer`). Comptées NON
  COUVERTES au 11/09/2026.
  ⇒ **Ce qui serait dû** : une preuve d'une autre nature — le fichier cible existe-t-il avant,
  a-t-il disparu après. ⚠ **Elle n'est pas écrite, et l'écrire n'est pas gratuit** : c'est
  précisément la classe de cibles qui a fait naître la garde de ROUTAGE de D249 (« un nom de
  fichier spécial est une liste fermée »), donc leur preuve porte sur des noms de fichiers,
  pas sur du contenu.

- **[INFRA][P2]** ⚠ **LE COMPARATEUR DE DÉRIVE DE SOMME DE CONTRÔLE EST RESTÉ UN SCRIPT
  JETABLE — ET C'EST LE CONTRAIRE DU PRINCIPE DU RANG 11.** Écrit le 11/09/2026 pour l'étape 0
  (confronter les 27 migrations du dossier à `_prisma_migrations`), calibré sur les octets
  d'avant restauration, puis **jeté**. Le rang qui a fait entrer les instruments au dépôt en a
  donc laissé un dehors, et l'écart est écrit plutôt que tu.
  ⇒ **Ce qu'il ferait** : `neutralisation/sonde-derive-migrations.py` — pour chaque dossier de
  `prisma/migrations/`, comparer le sha256 des octets au `checksum` stocké ; rendre ≠ 0 sur
  toute dérive ou toute migration absente du journal. Calibration : les octets d'une migration
  volontairement modifiés doivent le faire ROUGIR.
  ⚠ **Motif de l'utilité, et il est mesuré** : `migrate deploy` et `migrate status` sortent
  **tous deux en 0** sur une base dérivée, sans un mot. Aucune porte du dépôt ne voit cette
  classe de défaut.

- **[INFRA][P1]** ⚠ **UN `.ps1` NON-ASCII SANS BOM NE S'EXÉCUTE PAS, ET LA TÂCHE REND
  « exit code 0 ».** Mesuré le 10/09 : la passe complète est morte sur `Missing closing '}'`
  — Windows PowerShell 5.1 lit un fichier sans BOM en **ANSI**, et le décodage casse la
  structure. ⛔ **C'est le pendant EN ENTRÉE du piège de console cp1252 (D268)**, que le dépôt
  n'avait jamais nommé : D268 a corrigé la SORTIE des scripts Python, personne n'avait regardé
  l'ENTRÉE des scripts PowerShell.
  ⚠ **ET LE SYMÉTRIQUE, MESURÉ LE 11/09/2026 : UN BOM *DOUBLÉ* CASSE AUTANT QU'UN BOM
  ABSENT.** Relire un `.ps1` en `utf-8` au lieu de `utf-8-sig` transforme le BOM existant en
  **contenu** ; en préfixer un second laisse un `U+FEFF` devant `param`, qui **cesse alors
  d'être le bloc de paramètres**. PowerShell rapporte l'erreur sur `param(`, **à 60 lignes
  de la cause**. ⇒ **Tout script qui réécrit un `.ps1` retire les BOM empilés avant d'en
  reposer UN**, et le vérifie en octets.
  ⇒ **Règle** : tout `.ps1` portant un octet non-ASCII s'écrit **avec BOM**, et **le parse se
  contrôle avant de lancer** (`[System.Management.Automation.Language.Parser]::ParseFile`).
  ⚠ Le contrôle a découvert au passage un second script **jamais exécuté depuis sa
  réécriture** : il aurait échoué de la même façon. **Un code 0 sur un script qui n'a pas
  parsé est le vert le plus creux de la série.**

### Reports décidés, non oubliés

- **[DOC][P2]** Le préambule du **registre des décisions** empile cinq avertissements contre
  les compteurs figés, puis en porte un : « 217 des 241 … 218 sur 242 », déclaré « non
  recompté depuis » le 28/08. Il est aujourd'hui en retard de **quatorze** décisions.
  ⚠ **Déclaré, donc ce n'est pas un défaut** — c'est la forme que le fichier exige. Rapporté
  parce que c'est exactement la forme dont il se méfie ailleurs, dans le paragraphe qui existe
  pour s'en méfier.

## Reports du 09/09/2026 — S11-b étapes 4→6 (D282)

⚠ **AUCUN N'EST CORRIGÉ, ET C'EST LA RÈGLE** : un défaut croisé se rapporte, il ne se
corrige pas dans un lot qui parle d'autre chose.

### ⛔ Ouverts, mesurés, NON corrigés

- **[INFRA][P1]** ⛔ **`migration-non-empty.int-spec.ts` SE PÉRIME À CHAQUE MIGRATION, ET
  CE N'EST PLUS UN ACCIDENT — C'EST SA CONCEPTION.** Ce harnais mesure « ce que fait **LA
  DERNIÈRE** migration sur une base non vide ». Conséquence mécanique : à chaque lot qui en
  ajoute une, sa sonde doit changer — **sixième changement en sept lots**, relevé dans ses
  propres commentaires (`sent_via`, effet du tri D166, `valid_until`, `CANCELLED`, l'index
  d'E3d-1, puis l'agrégat de D282).
  ⛔ **ET CE N'EST PAS QU'UNE CORVÉE : LA GARANTIE DU LOT PRÉCÉDENT DEVIENT INTESTABLE.**
  Mesuré le 09/09 : E3d-1 ayant cessé d'être la dernière, son nettoyage — départage sur
  `(created_at, id)`, doublons EXPIRÉS et non supprimés — n'a **plus jamais** de base non
  vide à doublons où se prouver, et son semis à trois `PENDING` est devenu **impossible**
  (l'index unique partiel s'applique désormais avant le semis). Trois assertions retirées
  par écrit. **Le même sort attend l'agrégat de D282 au prochain lot qui ajoutera une
  migration** — c'est écrit d'avance dans le fichier.
  ⇒ **REMÈDE, NON FAIT** : un harnais qui sème AVANT une migration **CHOISIE**, pas avant
  la dernière. C'est autre chose que B9/D123, et le fichier le disait déjà pour la sonde
  D166 : « à inscrire au backlog, pas à improviser ici ».

- **[DOC][P3]** ⚠ **UN TITRE AU FUTUR QUI SURVIT À SA RÉPONSE COÛTE TROIS LECTURES À CHAQUE
  REPRISE.** Relevé le 10/09/2026 par une reprise à froid, **rapporté sans être corrigé** sur
  consigne de Ko. `ZWADJ_CONTINUITE.md` porte le titre « **Prochaine mesure : SÉPARER les deux
  variables confondues** », dernière sous-section de « Session du 03/09/2026 — rang 6 ».
  ⇒ **LA MESURE A ÉTÉ JOUÉE**, et sa réponse vit sous un autre titre, dans une section
  physiquement plus haute donc plus récente : « D274 — ⛔ CE QUE L'EXPÉRIENCE DE SÉPARATION A
  RENDU, ET CE QU'ELLE N'A PAS RENDU » — elle n'a départagé ni la contention ni les observateurs
  de fichiers. **Rien n'est en suspens.**
  ⚠ **CE N'EST DONC PAS UN DÉFAUT D'ÉTAT, C'EST UN DÉFAUT DE FORME** — et il ne se voit que par
  la voie que `CLAUDE.md` prescrit : lire **par SECTION**, donc naviguer par la carte des titres.
  Un lecteur descendant croise la réponse avant la question et ne voit rien ; un lecteur qui
  relève les titres lit « Prochaine mesure » au futur et l'ouvre pour rien. **Coût mesuré sur la
  reprise du 10/09 : trois lectures** — la sous-section, sa section englobante, puis celle qui
  portait la réponse.
  ⇒ **REMÈDE, NON FAIT** : un titre de sous-section datée se met au PASSÉ une fois répondu, ou
  porte son renvoi (« → réponse : D274 »). ⚠ **Le corriger n'entrait pas dans le rang 10** : un
  défaut croisé se RAPPORTE, il ne se corrige pas dans un lot qui parle d'autre chose.

- ~~**[API][P0]** ⛔ **LES DEUX ÉCHÉANCES NE SONT ASSERTÉES QUE « NON NULLES » — INTERVERTIR
  LEURS CONSTANTES SERAIT INVISIBLE.**~~ ⇒ ⛔ **CORRIGÉ ET MESURÉ LE 11/09/2026 (D285)** — clôture
  en fin d'entrée. Le constat d'origine est conservé tel quel : il dit ce à quoi le lot répondait. Relevé le 09/09 sur l'ensemble des specs :
  `bookings.int-spec.ts:156` vérifie `expiresAt` **not null**, `:373` vérifie
  `paymentDueAt` **not null**. **Aucune assertion ne porte sur leur VALEUR.**
  ⇒ Échanger `PRO_RESPONSE_DAYS` (7 jours) et `PAYMENT_WINDOW_HOURS` (48 h) entre les deux
  sites d'appel produirait deux dates parfaitement non nulles, et **rien ne rougirait** —
  y compris la spec unitaire neuve de D282, qui mesure la FORMULE et ne peut rien dire de
  la constante que l'appelant lui passe.
  ⛔ **C'EST LE CHEMIN DE L'ARGENT** : `paymentDueAt` est ce sur quoi E3 décidera si un
  règlement arrive à temps. ⚠ **Aucune cible de neutralisation n'a été écrite pour ce cas
  dans D282, et c'est délibéré** : elle serait **muette par construction** avec les mesures
  existantes, et une cible muette fait sortir la campagne en échec sans rien apprendre.
  ⇒ **REMÈDE, NON FAIT** : exporter les deux constantes et faire assertir la DURÉE par la
  spec d'intégration — l'attendu venant de la constante partagée, jamais recopié.
  ⛔ **DEVENU LE RANG 10 LE 10/09/2026, ARBITRÉ PAR KO — CADRÉ, TOUJOURS PAS CORRIGÉ (D284).**
  Le cadrage vit dans `ZWADJ_CONTINUITE.md`, section « **PROCHAIN LOT — rang 10** » : six modes
  de défaillance écrits avant toute ligne de code, deux cibles de neutralisation nommées
  d'avance, un point d'arbitrage soulevé. ⚠ **Le remède reste NON FAIT** : cette entrée ne se
  barre qu'avec le code, en session neuve.
  ⇒ **TROIS FAITS QUE CETTE ENTRÉE N'AVAIT PAS, et qui changent le geste** :
  1. la garde à écrire **porterait une date de péremption** — `bookings.int-spec.ts:32` porte
     `EVENT_DATE = "2027-08-15"`, qui satisfait la condition « au-delà des deux fenêtres »
     **par accident du calendrier** et cesse de la satisfaire le **08/08/2027**. La fixture doit
     **dériver** sa date des constantes ; et `EVENT_DATE` **ne se corrige pas en place**, `:167`
     et `:511` en dérivant des instants ISO exacts qui mesurent le créneau franchissant minuit ;
  2. **l'égalité exacte n'est disponible que d'un côté** : `expiresAt` naît de l'horloge **Node**
     alors que le seul instant exposé (`createdAt`) naît de l'horloge **PostgreSQL** ⇒ assertion
     **bornée** ; `accepted_at` étant **persistée**, l'acceptation admet l'égalité **exacte** ;
  3. ~~la consigne « les constantes rejoignent `booking-deadline.ts` » contredit une phrase
     écrite de ce module : l'en-tête s'amende dans le même geste~~ ⛔ **BARRÉ LE 10/09/2026 —
     KO S'EST DÉJUGÉ**, le heurt signalé par le cadrage ayant montré que l'amendement ÉTAIT le
     défaut. ⇒ **Les deux constantes sont EXPORTÉES depuis `bookings.service.ts`** et la spec les
     importe de là ; `booking-deadline.ts` n'est pas au diff. Précédent mesuré : **9 fichiers** de
     `test/int/` importent depuis `../../src/`, dont `INDEX_UNE_ATTENTE` pour confronter
     l'autorité. ⇒ **Trois fichiers attendus au lieu de quatre.**
  ⚠ **Deux affirmations de cette entrée ont été confrontées à la source le 10/09 : `:156` et
  `:373` sont EXACTES au mot.** Relevé au passage et absent d'ici : `:157` assertit que
  `paymentDueAt` est **nulle à la création** — une vraie garde, que le lot ne touche pas.
  ⛔ **CLÔTURE, 11/09/2026 (D285) — LE REMÈDE EST FAIT, ET IL EST MESURÉ.** Les quatre constantes
  (`PRO_RESPONSE_DAYS`, `PAYMENT_WINDOW_HOURS`, `DAY_MS`, `HOUR_MS`) sont **exportées** de
  `bookings.service.ts` ; `bookings.int-spec.ts` les **importe** et assertit la DURÉE —
  encadrement par deux instants qu'elle mesure elle-même pour `expiresAt`, **égalité exacte**
  contre `accepted_at` persistée pour `paymentDueAt`. Fixture **dédiée**, date et marge
  **dérivées des constantes** ; `EVENT_DATE` laissée intacte.
  ⇒ **L'AVANT/APRÈS, ET C'EST LUI QUI FAIT LA CLÔTURE** : les cibles **12** et **13** de
  `neutralize-s11b.py`, jouées sur l'arbre d'AVANT, étaient **MUETTES toutes les deux** —
  mutations pourtant **prouvées POSÉES** par un instrument séparé, ce qui écarte le remplacement
  fantôme. Après le lot elles **mordent** : `neutralize-s11b --int` passe de **11/11 à 13/13**, et
  `test:int` de **434/36 à 436/36**.
  ⚠ **ÉCART AU CADRAGE, ASSUMÉ ET ÉCRIT** : le cadrage annonçait **deux** constantes exportées ; il
  en faut **quatre**, `DAY_MS`/`HOUR_MS` étant privées elles aussi et `@zwadj/types` n'en portant
  aucun équivalent. Motif complet en section **D285** de `ZWADJ_CONTINUITE.md`.
  ⚠ **CE LOT N'EST PAS CERTIFIÉ** : il compte pour UN dans les deux/trois.

- [x] ~~**[INFRA][P1]** ⚠ **MODIFIER UN FICHIER DE MIGRATION DÉJÀ APPLIQUÉ CRÉE UNE DÉRIVE DE
  SOMME DE CONTRÔLE, ET PRISMA N'EN DIT RIEN.** Mesuré le 09/09 : après ajout d'un
  commentaire à `20260909120000` (SQL inchangé), `_prisma_migrations` porte
  `4bf7e91e…b689` — le sha256 du fichier **avant** — tandis que le fichier vaut
  `8c34e7b0…b3db`. ⛔ **`migrate deploy` répond « No pending migrations to apply » et sort
  en 0**, `migrate status` répond « Database schema is up to date! ». Même famille que le
  piège déjà consigné : un code 0 qui ne dit pas ce qu'on croit.
  ⛔ **LES FAITS, EN ENTIER, POUR QUE LA SESSION QUI REPRENDRA N'AIT RIEN À REDÉRIVER** —
  c'est là qu'on improvise, sinon :

  | | valeur |
  |---|---|
  | migration | `20260909120000_booking_quote_total_coherent` |
  | base concernée | `zwadj` (dev). ⚠ `zwadj_test` est recréée à chaque `test:int` : elle n'a **pas** la dérive |
  | empreinte STOCKÉE | `4bf7e91e3b4d2a8d66d5a863e1bc123b892108ad109006592d234a8e2320b689` |
  | empreinte CALCULÉE | `8c34e7b0ea92689cc4ceb6ed10cf103042fda5962c10e1bb703dd1ef82dab3db` |
  | nature de l'écart | **commentaire ajouté**, SQL **identique** — vérifié commentaires retirés |

  ```
  # stockée
  docker exec -i zwadj-db psql -U zwadj -d zwadj -t -c \
    "SELECT checksum FROM _prisma_migrations WHERE migration_name = '20260909120000_booking_quote_total_coherent';"
  # calculée (la somme de Prisma EST le sha256 des octets du fichier — vérifié deux fois)
  python3 -c "import hashlib;print(hashlib.sha256(open('apps/api/prisma/migrations/20260909120000_booking_quote_total_coherent/migration.sql','rb').read()).hexdigest())"
  ```

  ⇒ **REMÈDE POSSIBLE, NON FAIT ET NON AUTORISÉ** : `UPDATE _prisma_migrations SET checksum
  = '<la calculée>' WHERE migration_name = '20260909120000_booking_quote_total_coherent'`.
  ⛔ **KO A INTERDIT D'Y TOUCHER LE 09/09/2026**, et le refus d'improviser est le bon geste :
  c'est une écriture à la main dans le journal qui décide de ce qui s'applique.
  ⚠ Ne rien faire reste un piège différé — Prisma 8 est proposé par l'outil, et rien ne dit
  qu'il restera aussi silencieux.
  ⚠ **LEÇON GÉNÉRALE, indépendante de l'arbitrage** : une migration **déjà appliquée** ne se
  modifie plus, **même pour un commentaire**. Ce qu'on veut y ajouter après coup vit dans le
  fichier de continuité, pas dans le fichier de migration.~~
  ⛔ **TRAITÉ LE 11/09/2026 — RANG 11 (D286).** ⛔ **NI PAR L'UN NI PAR L'AUTRE DES DEUX REMÈDES POSÉS CI-DESSUS.**
  Ko a tranché : on **rend au fichier de migration les octets qui ont été appliqués** —
  le commentaire ajouté après coup est retiré. Rien n'est écrit dans `_prisma_migrations`.
  ⇒ **Mesuré** : empreinte calculée redevenue `4bf7e91e…b689`, **égale à la stockée relue
  dans la base** ; 15 lignes de commentaire retirées, **0 ligne de SQL touchée** ; audit
  complet des **27** migrations — **0 dérive, 0 absente**.
  ⚠ **CE QUI RESTE VRAI ET NE SE BARRE PAS** : la leçon générale ci-dessus, et le constat
  que `migrate deploy` comme `migrate status` **sortent en 0 sans un mot** sur une base
  dérivée. C'est ce constat qui fait naître l'entrée « sonde de dérive » plus bas.
  ⇒ **Le rang 8 est CLOS** : certifié le 10/09, clos le 11/09.

- **[E3][P1]** ⚠ **CE QUE VAUT LE BOUTON « PAYER L'ACOMPTE » QUAND L'ÉCHÉANCE EST PASSÉE —
  ENTRÉE RENVOYÉE À D80, ET ADRESSÉE À E3.**
  ⛔ **CE N'EST PAS UNE LACUNE DE S11-b, ET LE RANGER AINSI SERAIT UNE ERREUR DE LECTURE**
  (corrigé par Ko, 09/09/2026). `bookings.service.ts:27-30` le porte **depuis D80**, mot pour
  mot : « ce lot s'arrête à ACCEPTED. Aucune route ne mène à CONFIRMED, aucun job n'expire
  quoi que ce soit. `expiresAt` et `paymentDueAt` sont posés pour le lot Paiement ; en
  attendant, une demande acceptée verrouille son créneau jusqu'à ce que le pro l'annule.
  **Dette assumée, pas un oubli.** »
  ⇒ **CE QUE D282 A CHANGÉ, ET RIEN DE PLUS** : le comportement d'une échéance passée était
  *implicite* — il tombait d'un `Math.min` écrit en ligne, sans spec. Il est désormais
  **spécifié et mesuré** (`booking-deadline.spec.ts`, cas limite 2 : échéance antérieure à
  son propre point de départ). La dette n'a pas bougé ; elle est simplement devenue
  **visible et gardée**.
  ⇒ **LA DÉCISION APPARTIENT À E3** — refus explicite, réouverture de fenêtre, ou acceptation
  tardive assumée — et c'est E3 qui aura les deux autres moitiés du problème : la route vers
  `CONFIRMED` et le job d'expiration. Le test qui fige le comportement actuel dira alors ce
  qu'il a remplacé.

- [x] ~~**[MÉTHODE][P0]** ⛔ **LA BARRE D273 A ÉTÉ REFUSÉE PUIS FRANCHIE DANS LA MÊME
  SESSION — EST-ELLE UNE PORTE DURE, OU L'ANNOTATION D'UN RELEVÉ ?**~~
  ⇒ ✅ **TRANCHÉ PAR KO LE 09/09/2026, ET APPLIQUÉ LE 10/09 (D283) : c'est (a) une PORTE DURE
  pour une CERTIFICATION, et (b) une ANNOTATION partout ailleurs** — sur les durées et
  l'intermittence, **jamais sur un verdict**.
  ⛔ **Motif de Ko, en une phrase** : *si « au repos » se franchit sur ordre, le mot ne
  certifie plus rien.*
  ⇒ **Ce que la distinction achète** : sous la barre, un **verdict déterministe** (code de
  sortie, `23514`, garde qui mord) reste valide et se lance ; ce qui tombe est le droit d'en
  tirer une **durée**, une **intermittence** ou une **certification**. D282 avait raison de
  lancer ; il ne pouvait pas certifier.
  ⚠ **ÉPROUVÉE TROIS FOIS LE 10/09, ET DANS LES DEUX SENS** : trois fenêtres de certification
  ont été **refusées sur le régime** (`chrome` revenu ; huit heures de veille sur batterie ;
  puis un relevé d'ouverture à 4 008 Mo, **571 sous la barre, refusé alors que Ko venait
  d'annoncer la fermeture du navigateur** — la porte dure vaut aussi contre Ko). La quatrième
  a tenu, et **la sortie de secours de D270 — redéfinir « repos » sur le plancher que la
  session peut produire — n'a PAS servi** : le plancher mesuré était de 6 585 Mo, soit 2 006
  au-dessus. **La barre a été tenue, pas déplacée.**
  ⛔ **MAIS ELLE NE SUFFIT PAS À DÉFINIR « REPOS », ET C'EST MESURÉ** : voir les trois
  `[MÉTHODE][P0]` du 10/09. Le plancher RAM est une **condition nécessaire**, pas une
  définition — il protège les verdicts **tant qu'un budget non écrit tient les durées** *(D297 : écrit
  depuis le 21/09/2026, même valeur)*, et il
  ne voit ni l'alimentation ni ce qui se passe **pendant** la mesure.
  ⚠ **Constat d'origine conservé ci-dessous pour la trace ; ne pas le lire comme l'état
  courant.** Relevé le 09/09/2026, et les deux
  faits sont écrits côte à côte dans la section D282 :
  `test:int` **refusé à 2 926 Mo** (arrêt franc, demande à Ko), puis **toutes les portes
  lancées à 2 607 Mo** — c'est-à-dire **plus bas encore** — sur ordre de Ko, verdicts retenus
  et durées explicitement écartées.
  ⚠ **Les deux gestes sont défendables, et leurs motifs sont écrits.** Ce n'est donc pas un
  incident : c'est un **trou dans la règle**. ⛔ **UNE BARRE QU'ON FRANCHIT SUR ORDRE, SANS
  QU'AUCUNE RÈGLE NE DISE QUAND, CESSE DE MESURER** — et c'est la faute que ce dépôt nomme
  partout ailleurs : un seuil renégocié au cas par cas finit par se baisser en catastrophe le
  jour où l'attente devient intenable (le raisonnement exact du critère de certification,
  D275).
  ⇒ **À TRANCHER, ET KO NE L'A PAS FAIT LE 09/09** : (a) **porte dure** — rien ne se lance
  sous la barre, et une session bloquée est une session bloquée ; ou (b) **annotation d'un
  relevé** — on lance, on écrit l'état devant la mesure, et on déclare ce que cette mesure ne
  vaut plus. ⚠ Si c'est (b), la barre doit dire **ce qu'elle disqualifie** (les durées, la
  certification) et **ce qu'elle laisse valide** (les verdicts déterministes), sans quoi elle
  redevient une barre franchie au jugé.
  ⚠ **Rappel de contexte, pour ne pas rejouer le débat à vide** : la barre 4 579 Mo vient du
  cadrage de D273, et D270 avait déjà posé la règle d'arbitrage — « relever le plancher que
  cette session PEUT produire », puis redéfinir « repos » sur lui **avec sa raison** si la
  barre héritée est impayable. Cette règle n'a jamais été jouée.

### Reports décidés, non oubliés

- [x] ~~**[DOC][P2]** `ZWADJ_CONTINUITE.md` — **deux pointeurs qui se contredisent dans le
  même en-tête** : l. 25 « Où lire le prochain lot : l'ordre des rangs, section D270, **et
  lui seul** » ; l. 114 (barrage de D280) « l'ordre des rangs (D270), **et la section
  PROCHAIN LOT** ».~~ ⇒ **FAIT LE 09/09/2026 (D283)**, mais **PAS comme cette entrée le
  demandait.**
  ⛔ **L'ARBITRAGE « C'EST LA L. 114 QUI DOIT CÉDER » ÉTAIT FAUX, ET IL EST BARRÉ AVEC SON
  MOTIF PLUTÔT QU'EFFACÉ** (corrigé par Ko, 09/09/2026, après relevé) : ~~la 114 cède~~.
  Les deux pointeurs ne se contredisent pas — **ils répondent à DEUX questions** : D270 dit
  **QUEL** lot vient ensuite, le point d'entrée dit **OÙ CE LOT EN EST**. Faire céder la
  l. 114 aurait retiré le seul pointeur vers le bloc que **D282 venait de rendre autoritaire
  sur l'état du rang**, et dont la règle de D282 exige le rafraîchissement à chaque clôture
  de session : c'est-à-dire rétabli la route que D282 a mesurée comme trompeuse.
  ⇒ **CE QUI TOMBE EST « ET LUI SEUL », À LA L. 25**, et les deux questions y sont désormais
  séparées. **Le remède n'était pas de choisir un vainqueur, c'était de séparer les
  questions** — c'est bien le défaut du rang 5 de D270, mais son remède n'est pas d'élire un
  pointeur.
  ⚠ **CE QUE « ET LUI SEUL » A COÛTÉ, MESURÉ LE MÊME JOUR** : une reprise à froid l'a suivi
  et l'ordre des rangs **ne portait aucun rang 9** — le prochain lot n'était écrit nulle
  part, dans aucun des trois fichiers d'autorité. **Un pointeur exclusif sur un endroit
  incomplet empêche le recoupement qu'il rend nécessaire.** Le rang 9 est désormais écrit.
  ⛔ **ET LA CLASSE S'EST REFERMÉE LE LENDEMAIN, CE QUI A FAIT ÉCRIRE UNE RÈGLE (D284,
  10/09/2026).** Rang 9 clos le matin, **l'ordre s'arrêtait à nouveau** : la reprise à froid du
  10/09 a dû refaire le même recoupement, le prochain lot ne vivant plus que dans une **incise**
  du rang précédent. ⇒ **Inscrire un rang corrige l'INSTANCE ; un rang inscrit se referme.**
  ⇒ **RÈGLE ÉCRITE DANS `AGENTS.md` LE 10/09/2026** : « **UN RANG CLOS LAISSE UN ÉTAT NOMMÉ,
  JAMAIS UNE ABSENCE** » — si le rang suivant n'est pas arbitré, l'ordre écrit qu'il est
  **attendu**. ⚠ Appliquée à elle-même dans le même commit : l'ordre porte « rang suivant : en
  attente d'arbitrage de Ko » sous le rang 10.

- **[DOC][P2]** `ZWADJ_BACKLOG.md:2111` — « **S11-b (chiffrage) reste entier, cadrage
  exigé** », écrit **au présent**, faux depuis le 08/09. La clause vit sous une entrée
  `~~S11~~` barrée, mais **le barré ne couvre que le titre**. ⚠ C'est la configuration
  exacte que D277 décrit : sur deux occurrences, l'une correctement encadrée (`:2657`,
  « CONSTAT D'ORIGINE, CONSERVÉ POUR LA TRACE ») et l'autre non.

- [x] ~~**[DOC][P2]** `AGENTS.md` — « deux lots non certifiés en attente sont tenables,
  **trois non** » ne dit pas si un lot **DOCUMENTAIRE** compte.~~ ⇒ **ÉCRIT DANS `AGENTS.md`,
  À CÔTÉ DE LA RÈGLE, LE 09/09/2026 (D283)**, daté, avec son motif et le renvoi à cet
  arbitrage. **Arbitrage inchangé : il ne compte pas** — il ne touche aucun code et ne peut
  dégrader aucune porte. Sur les sept lots non certifiés au 09/09 (D276 → D282), **deux**
  portent du code : D279 et D282.
  ⛔ **CE QUI EST BARRÉ ICI EST LE REPORT D'ÉCRITURE, ET C'EST KO QUI L'A ANNULÉ** :
  ~~à écrire la prochaine fois qu'on touche `AGENTS.md`, pas dans un lot ouvert pour ça~~.
  **Faux, et sur la règle la plus structurante du dépôt.** La règle vivait dans `AGENTS.md`
  et l'arbitrage qui la rend **CALCULABLE** dans ce fichier : configuration **D277** exacte.
  Lue seule, `AGENTS.md` comptait **sept** lots non certifiés, concluait « trois, donc non »
  et **interdisait tout** — y compris le lot de certification qui lève le blocage.
  ⇒ **RÈGLE QUI EN SORT** : un report d'écriture sur une règle de **blocage** est un report
  sur la décision d'ouvrir un lot. Il ne se différencie pas au prochain passage.
  ⚠ **Complété à l'écriture, dérivé du motif de Ko et non ajouté à côté** : « documentaire »
  veut dire **aucun fichier hors `.md` d'autorité au diff**. Un lot qui touche un harnais, un
  test, un script ou une migration **COMPTE** — il peut dégrader une porte.

## Report du 08/09/2026 — la base de développement

- [x] ~~**[INFRA][P1]** ⛔ **`zwadj` (BASE DE DEV) EST EN RETARD DE TROIS MIGRATIONS, DONT
      L'INDEX PARTIEL DU CHEMIN DE L'ARGENT.**~~
      ✅ **CLOSE LE 08/09/2026 (D280) — KO A APPLIQUÉ LES TROIS, ET LA PREUVE EST EN BASE,
      PAS DANS UN CODE DE SORTIE.** Vérifié par **définition d'objet** (D279) :
      `_prisma_migrations` rend **26 appliquées** contre 23 au matin ; `QuoteStatus`
      contient `CANCELLED` ; `quotes_sent_at_coherent` porte son exemption ; et
      `payments_one_pending_per_booking` est présent avec **`indisunique` ET
      `indpred IS NOT NULL`** — unique **et** partiel, c'est-à-dire la garantie elle-même
      et pas seulement un index qui en porte le nom.
      ⚠ **Le constat d'origine est conservé ci-dessous**, barré en tête : il a existé, il
      était juste, et une entrée supprimée se réécrit de bonne foi plus tard.
      Relevé le 08/09/2026 (D278) en comparant
      `_prisma_migrations` au contenu de `prisma/migrations/` : **23 appliquées, 26 au
      dépôt**. Manquent `20260821000000_quote_status_cancelled`,
      `20260821000100_quote_cancel_without_delivery` et surtout
      ⛔ `20260824120000_payment_one_pending_per_booking`.
      ⚠ **LA CERTIFICATION D275 N'EST PAS EN CAUSE, ET IL FAUT LE DIRE D'ABORD** :
      `test:int` travaille sur `zwadj_test`, recréée et remigrée à chaque exécution
      (`test/int/db-url.ts`). Les 434 tests ont couru sur le schéma de tête.
      ⛔ **CE QUI EST EN CAUSE** : `pnpm dev` tape sur `zwadj`, qui **n'a pas** l'unicité
      partielle des intentions de paiement. Exercer le chemin de l'argent à la main sur
      cette base n'est protégé par **rien**, pendant qu'une campagne verte affirme — à
      juste titre, ailleurs — que la garantie tient. **Deux bases, deux schémas, un seul
      mot pour les deux.**
      ⇒ **REMÈDE** : `pnpm --filter @zwadj/api run prisma:migrate` (= `migrate deploy`),
      puis ⛔ **VÉRIFIER EN BASE que `payments_one_pending_per_booking` existe** — jamais
      se fier au code de sortie : `migrate deploy` sort en **succès sans rien appliquer**
      quand le schema-engine manque.
      ⚠ **Non fait le 08/09 et c'est délibéré** : appliquer trois migrations à la base de
      travail de Ko est un geste d'ÉTAT, pas une lecture, et il n'avait pas été demandé.

## Reports du 30/08/2026 — suites, concurrence, outillage

### ⛔ Ouverts, mesurés, NON corrigés

- [ ] **[PRO][P1]** ⛔ **L'ATTENTE DE LA COQUILLE DEVRAIT ÊTRE UN UTILITAIRE PARTAGÉ,
      PAS UNE COPIE PAR FICHIER.** Cause structurelle : `AppProviders` monte
      `ProVenuesProvider`, qui appelle `listMine()` puis `setState()` de façon
      asynchrone. **Tout fichier de test pro qui monte `AppProviders` hérite donc du
      défaut**, qu'il teste la coquille ou non.
      Mesuré le 30/08 : **19 fichiers montent `AppProviders`** ; **5 seulement**
      mentionnent `listMine` (`App`, `pro-venues-context`, `services-section`,
      `slots-section`, `venue-list`), et chacun écrit SA propre attente. Les
      14 autres n'en ont aucune — ils ne rougissent pas aujourd'hui, mais rien ne les
      en protège : c'est l'ordonnancement qui décide.
      ⇒ Un utilitaire unique (`test-support/`, à côté de `client-doubles.ts`, qui
      centralise déjà les doubles pour la même raison) supprimerait la classe entière
      au lieu de la traiter fichier par fichier. Chaque copie est une occasion
      d'oublier l'attente, ou de l'écrire un peu différemment.
      ⚠ Non fait : hors périmètre du lot qui a corrigé deux fichiers, et un utilitaire
      de test partagé se conçoit une fois, pas dans l'urgence d'une porte rouge.

- [x] ~~**[INFRA][P0]** LA SUITE PRO EST INEXPLOITABLE EN PARALLÈLE DE FICHIERS~~
      ⛔ **ENTRÉE FAUSSE, RETIRÉE PAR D270.** Elle reposait sur quinze exécutions
      prises sur machine chargée, sans relevé d'état. Rejouée sous charge légère, la
      commande **exacte de la porte** rend **7 verts sur 8 en ~35 s**, et le
      contrefactuel pré-D269 rend **347/347 en 34-35 s** : le correctif d'attente
      n'aggrave rien. Conservée barrée plutôt que supprimée — l'entrée a existé,
      quelqu'un a pu la lire.
      ✅ **Borne appliquée quand même** (`maxWorkers: 4`, `apps/pro/vite.config.ts`)
      comme **assurance sous charge** : 46-52 délais dépassés en mode par défaut
      contre 4 avec la borne, machine chargée. Coût mesuré à charge égale : 35 s → 46 s
      (+31 %), contre 92 s pour la sérialisation. Vérifié : 347/347 deux fois, 38-40 s.

- [ ] **[INFRA][P3]** ⚠ **OBSERVATION NON EXPLIQUÉE — 15 % D'ÉCART ENTRE DEUX CHEMINS
      QUI POSENT LE MÊME RÉGLAGE.** `--maxWorkers=4` en ligne de commande rend **46 s** ;
      `maxWorkers: 4` écrit dans `apps/pro/vite.config.ts` rend **38-40 s**, à charge
      égale. ⚠ **La clé de config n'est PAS ignorée** — vérifié en posant
      `maxWorkers: 1` dans le même fichier : la durée passe à **88 s** (contre 35 s par
      défaut). Le réglage mord donc ; c'est l'écart entre les deux CHEMINS qui n'est pas
      élucidé. Piste non vérifiée : ligne de commande et fichier ne fixent peut-être pas
      le même pool.
      ⚠ **Consigné comme observation, PAS comme défaut** : aucune chasse ouverte, aucune
      conclusion tirée. Inscrit ici parce que le corps de D270 ne se relit pas.

- [ ] **[INFRA][P2]** ⚠ **AUCUNE CONFIGURATION VITEST PARTAGÉE N'EXISTE.** Relevé :
      `apps/api` (×2), `apps/client`, `packages/api-client` ont chacun la leur, et
      **`apps/pro` n'en a aucune** — ses réglages vivent dans `vite.config.ts`.
      `packages/config/` porte `eslint/` et `tsconfig/`, pas de `vitest/`.
      ⛔ **REQUALIFIÉ P1 → P2 par D270** : j'avais présenté cette absence comme
      BLOQUANTE pour borner les workers (« quatre fichiers à toucher »). C'était
      répondre à un problème général au lieu du problème posé — le paquet qui avait
      le défaut est le seul à corriger, et son bloc `test` existait déjà. **Un seul
      fichier a suffi.** L'absence de base partagée reste un vrai sujet, elle n'est
      simplement bloquante pour rien aujourd'hui.

- [ ] **[DOC][P2]** ⚠ **`AGENTS.md` PORTE ENCORE UNE DURÉE FIGÉE : « Compter ~40
      minutes » pour `lancer-campagnes.py`.** Même classe que les trois chiffres retirés
      par l'autocorrection de D270, mais **antérieure à D270** — donc pas corrigée dans ce
      lot, qui parlait d'autre chose. ⚠ Elle est dans la section même où D268 a écrit
      qu'aucun compteur ne s'y écrit, et pour la raison exacte qui s'applique ici : le
      nombre de campagnes bouge à chaque lot, et une durée sans état machine ne renseigne
      pas sur le code. **En OBSERVATION** : la corriger demande de décider ce qui remplace
      le repère (rien, ou « relever la durée avant de dimensionner », comme pour la fenêtre
      d'appel). ⚠ Voisines de même classe à trancher en même temps : « meurt en 8 s sur
      already used » dans la note e2e.

- [ ] **[API][P2]** ⚠ **MARGE DE `test:int` : À SURVEILLER, PAS À CORRIGER.** Relevé le
      01/09/2026 pendant la vérification du lot argon2 (D271), sous charge produite
      (9 processus ; état machine au démarrage : RAM libre 1 896 Mo, CPU 70 %) : la suite
      d'intégration complète rend 434/434 en 641 s, **et son test le plus lent consomme
      13 504 ms** — « D116 — la déconnexion ferme TOUT ce que la fenêtre de grâce… ».
      Budget : `testTimeout: 30_000`. **Facteur 2,2, pas davantage.**
      ⚠ Pourquoi c'est noté maintenant : **ce lot vient de DÉPLACER du travail dans cette
      suite**. La destination n'est pas infiniment élastique, et le raisonnement « le
      budget est large là-bas » cesse d'être vrai en silence à mesure qu'on l'y remplit.
      ⛔ **EN OBSERVATION, aucune action** : 2,2 sous une charge délibérément sévère n'est
      pas un défaut. Ce qu'il faut, c'est **relever ce chiffre à chaque lot qui ajoute du
      travail à `test:int`**, avec son état machine — pas décider aujourd'hui d'un seuil
      qu'on ne saurait pas défendre. ⚠ Et surtout **ne pas relever le budget** si le
      facteur se dégrade : ce serait la piste `testTimeout` barrée plus haut, rouverte
      sous un autre nom.

- [ ] **[TESTS][P1]** ⚠ **QUARANTE-DEUX FICHIERS NON TRIÉS HORS `apps/pro` — L'INSTRUMENT
      EXISTE, IL EST CALIBRÉ, IL N'A PAS ÉTÉ APPLIQUÉ.** C'est ce qui sépare une dette d'un
      travail pas fait : il ne reste pas à inventer une méthode, il reste à la jouer.
      Fichiers de test portant une date en dur (relevé du 02/09/2026) : **`apps/api` 31
      (1 gelé) · `apps/client` 10 (1 gelé) · `packages/api-client` 1 (0 gelé)**.
      `apps/pro` est trié : 16 fichiers, 1 gelé, et c'était le seul sensible.
      ⇒ **Instrument : `neutralisation/sonde-horloge.py`**, calibré sur trois cas — un
      positif SYNTHÉTIQUE (le fichier corrigé privé de son gel, qui doit ressortir
      sensible), un négatif sans date, et un négatif AVEC une date en dur. Il abandonne si
      un seul cas manque son verdict.
      ⛔ **COMMENT ON LA LANCE — rien ne l'invoque à votre place.** Elle n'est PAS une
      campagne : ni `lancer-campagnes.py` (qui ne découvre que `neutralize-*.py`), ni
      aucune porte ne la joue. **Depuis la RACINE du dépôt**, jamais depuis
      `neutralisation/` :

      ```
      python3 neutralisation/sonde-horloge.py                      # calibration seule
      python3 neutralisation/sonde-horloge.py src/lib/calendar.spec.ts   # + des cibles
      ```

      Les chemins passés en argument sont **relatifs au paquet** (`apps/pro`), pas à la
      racine. Sans argument elle ne fait que sa calibration — utile pour vérifier qu'elle
      mesure encore avant de lui faire confiance.
      ⚠ **Un instrument calibré que personne ne sait invoquer est un script mort en trois
      semaines.** C'est pourquoi la commande est ici et pas seulement dans son en-tête.
      ⛔ **NE PAS LE TRANSPOSER SANS LE RECALIBRER** : il porte `PAQUET_NOM = "pro"` et
      trois cas propres à ce paquet. Changer de paquet sans désigner trois nouveaux cas
      dont la réponse est connue AVANT de mesurer donne une sonde qui rend un verdict sans
      l'avoir jamais prouvé — exactement ce que faisaient ses deux prédécesseurs écartés.
      ⚠ **`test:int` est compris dans les 31 d'`apps/api`.** La sonde ne sait pas encore les
      jouer (elle appelle `vitest run` sans `-c vitest.config.int.ts`) : adaptation à faire,
      pas obstacle.
      ⚠ **P1 et non P0, honnêtement** : aucun de ces 42 fichiers ne tient la porte
      aujourd'hui. Ce qui justifie de ne pas attendre, c'est la table d'échéances ci-dessous
      — neuf fichiers tombent le même jour de 2027.

- [ ] **[TESTS][P1]** ⚠ **DIX-NEUF FICHIERS À ÉCHÉANCE CONNUE — CE SONT DES DATES DE
      PÉREMPTION, PAS DES DÉFAUTS.** Relevé le 02/09/2026. Toutes leurs dates en dur sont
      **futures** et aucun ne fige l'horloge : ils passent aujourd'hui et tomberont le jour
      dit, sans qu'une ligne ait bougé — exactement comme `walkin-journey.test.tsx` le
      01/09. **C'est la seule information du relevé qui soit sûre SANS instrument** : elle
      ne demande aucun jugement sur ce qui compare une date à « maintenant ».
      ⚠ **Extraction VALIDÉE** (`fromisoformat`) : un premier extracteur rendait
      `2026-13-01` et `2027-02-31`, c'est-à-dire qu'il attrapait des chaînes qui ne sont pas
      des dates. **12 chaînes écartées à ce titre**, et le compte est passé de 20 à 19.

      ⛔ **CETTE TABLE DIT QUAND UNE FIXTURE CESSE D'ÊTRE FUTURE, PAS QU'ELLE CASSERA.**
      Démontré par la sonde du lot horloge (D272) : `request-scope.test.tsx` expire le
      **12/09/2026** et ressort **INSENSIBLE** — sa date `eventDate` n'est comparée à rien.
      À l'inverse, `walkin-journey.test.tsx` n'a jamais figuré dans cette table (ses dates
      étaient déjà passées) et c'est pourtant lui qui tenait la porte rouge.
      ⚠ **Sans cette phrase, dix-neuf échéances se lisent comme dix-neuf défauts** — et on
      corrigerait dix-huit fichiers qui n'ont rien. Le tri revient à la sonde, jamais à la
      lecture de cette table.

      | Première échéance | Fichier |
      |---|---|
      | **2026-09-12** ⛔ | `apps/pro/src/venues/request-scope.test.tsx` — **voir la note sous la table** |
      | 2026-12-31 | `apps/pro/src/venues/block-time.spec.ts` |
      | 2027-01-01 | `apps/api/src/payments/payment-store.prisma.spec.ts` |
      | 2027-01-01 | `apps/api/src/payments/payments.service.spec.ts` |
      | 2027-01-01 | `apps/api/src/venues/quotes.service.spec.ts` |
      | 2027-01-01 | `apps/pro/src/venues/visits-section.test.tsx` |
      | 2027-02-01 | `apps/api/src/venues/quote-store.prisma.spec.ts` |
      | 2027-02-01 | `apps/client/src/lib/calendar.spec.ts` |
      | 2027-02-01 | `apps/pro/src/venues/pro-calendar.spec.ts` |
      | 2027-08-01 | `apps/client/src/components/venue/booking-request-panel.test.tsx` |
      | 2027-08-14 | `apps/api/test/int/bookings.int-spec.ts` |
      | 2027-08-15 | `apps/api/src/common/notifications/notification-dispatch.spec.ts` |
      | 2027-08-15 | `apps/api/src/venues/bookings.schemas.spec.ts` |
      | 2027-08-15 | `apps/api/src/venues/visit-bookings.schemas.spec.ts` |
      | 2027-08-15 | `apps/api/src/venues/visit-notifications.service.spec.ts` |
      | 2027-08-15 | `apps/api/test/int/services.int-spec.ts` |
      | 2027-08-15 | `apps/api/test/int/visit-availabilities.int-spec.ts` |
      | 2027-08-15 | `apps/api/test/int/visit-bookings.int-spec.ts` |
      | 2027-09-18 | `apps/api/test/int/quotes.int-spec.ts` |

      ⛔ **`request-scope.test.tsx` EXPIRE LE SAMEDI 12 SEPTEMBRE 2026** — soit dix jours
      après ce relevé, **pendant le lot sharp**. Sa date `eventDate: "2026-09-12"` cessera
      d'être future ce jour-là.
      ⚠ **La sonde le classe INSENSIBLE** : cette date n'est comparée à rien, il ne devrait
      donc pas tomber. Mais « ne devrait pas » n'est pas « ne peut pas », et le verdict
      porte sur les deux dates que la sonde dérive, pas sur toutes. **Si la suite pro rougit
      autour du 12/09 sur ce fichier, la cause est écrite ici** — inutile de rouvrir
      l'enquête depuis le début, comme il a fallu le faire le 01/09.
      ⇒ C'est le seul intérêt d'écrire une échéance : ne pas la redécouvrir.

      ⛔ **`request-scope.test.tsx` EXPIRE LE 12/09/2026 — DANS DIX JOURS**, et il est dans
      `apps/pro`. Il entre donc dans le lot horloge en cours, au critère posé par Ko : ce
      qui compte est ce que l'instrument désigne comme sensible, pas ce qui rougit déjà.
      ⚠ **Neuf fichiers partagent l'échéance 2027-08-15** : le jour venu, ce n'est pas un
      test qui tombe, c'est une grappe — et une grappe se lit comme une panne, pas comme
      une péremption. Raison de plus pour ne pas attendre.
      ⚠ **Une échéance future n'est pas une preuve de sensibilité** : ces dates peuvent
      n'être que de la métadonnée (`createdAt`) que rien ne compare à maintenant. Cette
      table dit QUAND une fixture cesse d'être future, pas qu'elle cassera. Le tri revient
      à l'instrument du lot horloge.

- [x] ~~**[PRO][P0]** `walkin-journey.test.tsx` rougit depuis le passage au 01/09/2026,
      et c'est l'horloge~~ — ✅ **FAIT le 02/09/2026 (D272).** Horloge gelée, et **toutes**
      les fixtures dérivées de l'ancre : il ne reste qu'**une seule date écrite** dans le
      fichier. Preuve **BILATÉRALE** (`neutralize-horloge.py`, 2 cibles, 2 mordues) —
      classique : le gel retiré ⇒ ROUGE ; **inversée** : l'ancre déplacée de dix ans ⇒ le
      fichier doit rester **VERT**, seule façon de mesurer une INSENSIBILITÉ.
      ⚠ **Le balayage demandé ci-dessous a eu lieu** : sur les 28 fichiers de test d'
      `apps/pro`, la sonde n'en désigne qu'**UN**, celui-ci.
      ⚠ **Constat d'origine conservé ci-dessous :**
      ⛔ **`walkin-journey.test.tsx` ROUGIT DEPUIS LE PASSAGE AU
      01/09/2026, ET C'EST L'HORLOGE.** Découvert le 01/09 en relançant les portes du lot
      argon2 : **24 échecs sur 41**, tous en `expect(element).toBeEnabled()`, sur un arbre
      où **aucune ligne n'a bougé**. La même commande rendait 347/347 la veille.
      ⛔ **CAUSE PROUVÉE, pas supposée** : le fichier fixe une fenêtre de disponibilité
      `from: "2026-08-01", to: "2026-08-31"` et des dates `2026-08-15/16/22`, **sans figer
      l'horloge**. Depuis minuit, ces dates sont PASSÉES : le calendrier les refuse, le
      bouton reste désactivé. **Mesure de reproduction** : `vi.setSystemTime` au
      `2026-08-10` ⇒ **41/41 vert** ; horloge réelle ⇒ 24 rouges. Horloge restaurée après
      mesure, rien laissé dans l'arbre.
      ⚠ **C'est la leçon déjà écrite du dépôt** (D213, D227) : « figer l'horloge, jamais
      choisir une date dans le futur — elle cesse de l'être, et la suite rougit sans qu'une
      ligne de code ait bougé ». Elle était consignée ; ce fichier ne l'applique pas.
      ⛔ **CE DÉFAUT EST DÉTERMINISTE, PAS INTERMITTENT** — contrairement à argon2 et sharp,
      il ne dépend d'aucune charge : il rougit à chaque exécution, et il ne se réparera pas
      tout seul. **Il devient la cause DOMINANTE de la porte `test` rouge**, devant les deux
      autres. ⇒ **À traiter AVANT la certification de D269 et D270**, sans quoi la porte ne
      redeviendra verte à aucune charge.
      ⚠ **Le correctif n'est pas « décaler les dates »** : ce serait reconduire le défaut
      d'un mois. C'est **figer l'horloge** et dériver les dates de fixture de cette horloge
      figée. ⚠ **Balayer les autres fichiers pour la même faute** avant de conclure : rien
      ne dit que celui-ci soit le seul.
      ⚠ **PISTE, PAS CONCLUSION — elle explique peut-être une part de ce qu'on a appelé
      « suite pro intermittente » pendant trois sessions.** D270 a relevé deux rouges
      isolés qu'il n'a PAS pu nommer, leur sortie n'ayant jamais touché un fichier. Une
      faute d'horloge produit exactement cette signature : un rouge qui apparaît sans
      qu'une ligne ait bougé, et qu'on attribue à la charge faute de mieux.
      ⛔ **CE N'EST PAS UNE RÉFUTATION DE D270.** La contention est MESURÉE par ailleurs,
      et solidement : 0 vert sur 3 sans borne contre 2 sur 5 avec, et des grappes de six à
      seize échecs sous charge. Les deux causes coexistent. ⚠ Cette piste ne se vérifiera
      qu'en datant précisément les rouges non nommés — et leurs journaux sont perdus,
      **donc elle restera peut-être une piste pour toujours**. L'écrire comme telle vaut
      mieux que la laisser se durcir en explication commode.

- [x] ~~**[API][P0]** sharp — `image-pipeline.spec.ts` tient la porte autant qu'argon2~~
      — ⛔ **REQUALIFIÉ SANS OBJET LE 02/09/2026, SUR MESURE.** Après le départ des cinq
      tests argon2 vers `test:int` (D271), la suite unitaire API **ne rougit plus à
      aucune charge produite**. État machine relevé avant chaque exécution :

      | Charge | RAM libre | Résultat | Délais | Test le plus lent |
      |---|---|---|---|---|
      | 8 procs (×3) | 3 507–3 567 Mo | 640/640 | 0 | 738 ms |
      | 24 procs (×2) | 2 599–2 901 Mo | 640/640 | 0 | 1 589 ms |
      | 48 procs (×2) | 1 750–1 832 Mo | 640/640 | 0 | 2 346 ms |

      À **8 processus** — la charge exacte qui produisait 3 à 8 échecs le 01/09 — l'API est
      verte trois fois sur trois. Le test sharp le plus lourd garde **2,1× de marge** même
      à 48 processus, contre un budget de 5 000 ms.
      ⛔ **CONDITION DE VALIDITÉ DE CE CONSTAT, ET ELLE EST STRICTE : sharp ne tombe plus
      PARCE QUE les cinq tests argon2 ont quitté la suite unitaire API.** Ce n'est pas
      sharp qui s'est amélioré, c'est la pression qui a baissé. **Si du travail coûteux
      revient dans `apps/api` en unitaire — un KDF, un traitement d'image, un chiffrement —
      la marge se referme et sharp retombe.** ⚠ Sans cette phrase, la prochaine lecture
      sera « sharp est réglé », et il ne l'est pas : il est **déchargé**.
      ⇒ **Rien à faire aujourd'hui.** Rouvrir cette entrée si la suite unitaire API
      s'alourdit, ou si une mesure sous charge redonne un rouge sur ce fichier.

- [x] ~~**[API][P0]** ⛔ **CONSTAT D'ORIGINE, CONSERVÉ POUR LA TRACE — il était exact
      le 01/09 et il a cessé de l'être le 02/09.** Ce qui suit décrit la mesure telle
      qu'elle a été prise, avec argon2 encore dans la suite unitaire. Ne pas le lire comme
      l'état courant : voir la requalification ci-dessus.~~
      ⛔ **`image-pipeline.spec.ts` TENAIT LA PORTE AUTANT
      QU'ARGON2.** Ouvert le 01/09/2026 sur MESURE, pas sur soupçon : campagne de 8
      exécutions de la suite API sous charge vérifiée (9 processus), état machine relevé
      avant chacune, sortie de chacune dans un fichier. `src/media/image-pipeline.spec.ts`
      dépasse le budget de **5 000 ms** dans **5 des 6 exécutions rouges — parfois SEUL**
      (« au-delà du plafond : la grande redescend à 1920 de large » 6 020 ms ; « PNG
      accepté en entrée, sortie webp quand même » 5 134 ms).
      ⛔ **CONSÉQUENCE EXÉCUTOIRE** : le lot argon2 **ne rendra pas la porte verte**. Tant
      que celui-ci n'est pas fait, la porte reste non fiable sous charge, donc D269 et D270
      restent non certifiés, donc **S11-b — chemin de l'argent — ne s'ouvre pas**.
      ⚠ **Même décision de cadrage qu'argon2, à confirmer** : ne relever aucun délai, ne
      toucher à aucun paramètre de coût ; ce qui paie le traitement d'image réel part vers
      `test:int` (budget 30 s, `fileParallelism: false`), l'unitaire garde ce qui n'en a
      pas besoin — **et au moins un test qui exerce le vrai pipeline**, par le même motif
      que MD7 côté argon2 : une régression de configuration doit se voir tout de suite,
      pas à la porte lourde.
      ⚠ **La borne `maxWorkers: 4` a été mesurée et écartée** : 2 verts sur 5 contre 0 sur
      3 sans elle. Elle déplace le taux, elle ne tranche pas. Relevé complet dans la
      section D270 de `ZWADJ_CONTINUITE.md`.
      ⛔ **CE LOT PORTE AUSSI LE RÉSIDUEL LAISSÉ PAR ARGON2, ET C'EST DÉLIBÉRÉ.** Le lot
      argon2 a fait passer l'exposition de la suite unitaire de CINQ tests payant le KDF
      réel à UN seul (le préfixe `$argon2id$`, gardé exprès — une régression de
      configuration du hachage doit se voir tout de suite, pas à la porte lourde). Ce test
      reste théoriquement capable de dépasser le budget sous une charge extrême.
      ⚠ **Il ne se traite pas fichier par fichier** : à ce niveau de charge, la porte
      entière rendait déjà des grappes de six à seize échecs — un état où elle ne mesure
      plus rien, et où un test qui rougit ne se distingue plus des autres. **Ce lot doit
      prendre la contention de la porte unitaire DANS SON ENSEMBLE**, pas ajouter un
      troisième déplacement de fichier.

- [x] ~~**[API][P0]** argon2 — le vrai hachage quitte l'unitaire pour `test:int`~~
      — ✅ **FAIT le 01/09/2026 (D271).** Cinq tests exposés au KDF réel deviennent un ;
      aucun délai relevé, aucun paramètre de coût touché, comme Ko l'avait tranché.
      ⚠ **N'a PAS rendu la porte verte, et ne l'a jamais prétendu.**
      ⚠ **Consigne d'origine conservée ci-dessous, elle dit ce à quoi le lot répondait :**
      Décision de Ko : **ne relever aucun délai, ne toucher à aucun paramètre de coût**.
      Les tests qui paient le KDF réel partent vers `test:int`, où le budget est large ;
      l'unitaire garde ce qui n'a pas besoin du hachage réel.
      ⚠ **Surface d'AUTHENTIFICATION** ⇒ analyse écrite des modes de défaillance avant
      toute ligne de code, même exigence que pour un lot du chemin de l'argent.
      ⛔ **Doit passer AVANT S11-b**, mais **NE SUFFIRA PAS** : corrigé le 01/09/2026 sur
      mesure — cette ligne disait « c'est CE test qui tient la porte rouge ». Sharp la tient
      aussi (entrée ci-dessus).
      ⛔ **L'ORDRE DES LOTS QUI VIVAIT ICI EST RETIRÉ LE 03/09/2026.** Il prescrivait
      « argon2, puis sharp, puis certification de D269 et D270 ensemble, puis S11-b » —
      **périmé trois fois** : argon2 fait (D271), sharp requalifié SANS OBJET sur mesure,
      et la certification porte désormais sur cinq lots, pas deux.
      ⇒ **L'ordre vit dans UN seul endroit** : la section D270 de `ZWADJ_CONTINUITE.md`.
      En trois exemplaires, deux finissent par dire autre chose — c'est exactement ce qui
      venait d'arriver.

- [ ] **[E2E][P2]** ⚠ **UNE E2E INTERROMPUE LAISSE SES SERVEURS VIVANTS.** Vécu quatre
      fois le 30/08 : les processus tiennent 3100/3101 **et** la mémoire (4,5 → 2,25 Go
      libres). La tentative suivante échoue en 8 s sur
      `localhost:3101 is already used`, ou son worker Next s'effondre — un message qui
      ne parle ni de tests ni de la vraie panne.
      ⇒ Purger les processus node et vérifier 3100/3101 avant toute e2e. Automatisable
      dans le script `test:e2e` ; non fait ici.

- [x] ~~**[QUALITÉ][P2]** AUCUNE CAMPAGNE DE NEUTRALISATION NE GARDE LES FICHIERS DE
      TEST PRO~~ — ⛔ **ENTRÉE RETIRÉE PAR D270, ELLE N'AURAIT PAS DÛ ÊTRE OUVERTE.**
      Vrai au sens strict (le tri ne désigne rien pour ces deux fichiers, et c'est le
      **comportement correct**), faux au sens qui compte : **la garde de ce défaut
      existe** — c'est l'`afterEach` de `apps/pro/src/test-setup.ts`, qui lève sur les
      avertissements console non exemptés. C'est elle qui a RÉVÉLÉ le défaut, et elle
      remordra si quelqu'un réintroduit une assertion synchrone. **Aucune campagne de
      neutralisation à créer sur ces fichiers.**
      ⚠ Seule chose à retenir du relevé : deux chemins de `neutralize-s9.py`
      (`src/venue-families.test.ts`, `src/venues/venue-client-narrowing.test.ts`) sont
      écrits **relativement à un paquet** et ne résolvent pas depuis la racine, donc
      restent invisibles au tri. Sans effet aujourd'hui ; forme fragile.
