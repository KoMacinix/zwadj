# AGENTS.md — Règles pour l'agent de code (Zwadj)

## Contexte
Marketplace de réservation de salles de mariage (Algérie), bilingue FR/AR + RTL, mobile-first.
Deux apps : Client (public, SSR) et Pro (offline-first plus tard). Périmètre actuel = MVP étroit.

## Stack (ne pas dévier sans accord)
- Monorepo pnpm : apps/client (Next.js, App Router), apps/pro (React+Vite), apps/api (NestJS), packages/{ui,i18n,types,config}.
- TypeScript strict partout. PostgreSQL + Prisma. **Jobs différés via pg-boss (pas de Redis au MVP — migration possible vers Redis/BullMQ plus tard sans refonte)**.
- Paiement : **Chargily uniquement au MVP** (agrège CIB + Edahabia ; BaridiMob différé, intégration séparée à évaluer plus tard).
- i18n : **next-intl** côté apps/client (SSR), i18next côté apps/pro. packages/i18n contient messages + formatters, pas le runtime.
- Validation : Zod (partagé front/back). Tests : Vitest (+ Playwright pour l'e2e).
- **Pas d'apps/admin au MVP.** Validation/publication des salles via endpoints admin protégés + accès direct DB (DBeaver) en interne.

## Palette & design tokens
- **Palette double, une par app** (pivot décidé après la tranche Auth — remplace l'ancien accent unique) :
  - **Client** (`apps/client`, `theme.css`) : `--accent: #da3642`, `--accent-strong: #b32c36` (hover/actif), `--accent-soft: #fdeef0` (fond décoratif clair, jamais du texte dessus), `--on-accent: #ffffff`. Ramp de support pour les tranches marketing : `--rose-pale: #fdeef0`, `--sage: #f5a7b0`, `--star: #ebb04a`.
  - **Pro** (`apps/pro`, `theme.css`) : `--accent: #211c1b`, `--accent-strong: #0d0a09`, `--accent-soft: #f1efee`, `--on-accent: #ffffff`.
  - Zinc reste la base neutre partagée (`--bg`, `--ink`, `--line`, etc.) dans `packages/ui/styles.css`, qui ne définit plus AUCUNE valeur d'accent — chaque app pose son bloc accent dans son propre `theme.css`, importé après `packages/ui/styles.css`.
- **Contrainte AA vérifiée, à respecter strictement** : `#DA3642` passe le contraste AA (4.58:1) sur fond blanc pur uniquement — **jamais** comme couleur de texte sur `--bg-2`/`--bg-3` (cartes, sections, ratio 4.32:1 = échec). Sur ces fonds, utiliser `--ink`/`--ink-2` pour le texte, `--accent` réservé aux boutons pleins (fond accent + texte blanc) et aux éléments non-textuels.
- Police : Readex Pro, **auto-hébergée via `@fontsource`** — jamais d'import Google Fonts (`fonts.googleapis.com`), même si un document de référence plus ancien l'utilise ainsi.
- **Ignorer toute mention de "gold/cream/Cormorant Garamond/Manrope"** dans d'anciens documents — obsolète, pivot déjà effectué.
- Toute variable de token nommée `--gold*` doit être renommée `--accent*` lors de l'extraction — ne pas propager l'ancien nom. Idem pour toute référence à l'ancien `#C81E63` (framboise) ou `#E8495F` (corail intermédiaire, jamais passé en prod) : périmés, remplacés par les valeurs ci-dessus.

## Architecture
- Couches : Controller → Service/Use-case → Repository → DB. Adapters (ports) pour tout SDK externe (paiement, email, stockage).
- La logique métier ne dépend pas du framework ni des SDK. Interfaces > implémentations (DI NestJS).
- DTOs + validation Zod aux frontières.

## SOLID & patterns
- Respecter SOLID. Utiliser : Repository, Service, Strategy (paiement + tarification), Adapter, State machine (cycle de vie réservation), Factory, événements pour les notifications.
- NE PAS sur-abstraire. Pas de CQRS/event-sourcing/DDD lourd. Simplicité > cleverness. Un pattern doit enlever une vraie douleur.

## Modèle de réservation (décisions produit validées — ne pas redécider)
- Une salle définit un **mode** : `single_slot` (1 réservation/jour) ou `multi_slot` (plusieurs créneaux/jour).
- Chaque salle a des **SlotTemplate** (créneaux) : nom + heure début + heure fin, personnalisables dès le MVP (pas seulement une liste figée).
- Le flux est **request-to-book**, jamais instant-book : Client envoie une demande (pending) → Pro accepte/refuse → si accepté, paiement de l'acompte → confirmed.
- **Un seul modèle `Booking`** traverse tous les statuts (pending → accepted/declined/expired → confirmed → cancelled) — pas de `BookingRequest` séparé.
- **Chevauchement de créneaux entre demandes "pending" est autorisé** (la salle tranche manuellement laquelle accepter).
- **Chevauchement entre réservations "accepted/confirmed" est INTERDIT** — garanti par contrainte BDD (EXCLUDE USING gist sur la plage date+heure, btree_gist), jamais une simple vérification applicative.
- Dès qu'une demande passe à "accepted", toute autre demande "pending" qui chevauche doit être marquée en conflit visible côté Pro (pas auto-refusée sans confirmation).

## Prestations, commission, visites & incitation cashback (décisions produit validées — ne pas redécider)
- Chaque salle définit ses propres `Service` avec un `pricingType` parmi 4 : `fixed`, `per_guest`, `tiered`, `per_unit`. Pas de formule libre.
- `ServicePricing` est une **table séparée** de `Service` (relation 1-1) pour les 3 modes non-tiered ; les services `tiered` n'y ont pas de ligne, leurs prix vivent dans `ServiceTier`. La correspondance entre `Service.pricingType` et quel mode est rempli est une garantie **applicative** (couverte par des tests), pas une contrainte de base de données entre les deux tables — exception consciente et documentée à "garanti par la BDD".
- `Venue.commissionRate` est variable (1–5%), fixée et modifiable uniquement par Zwadj admin (endpoint protégé), jamais par le pro. Snapshotée sur chaque `Commission` au moment de la réservation.
- **La commission se calcule uniquement sur le prix de base de la salle** (résolu à la date, règles saisonnières incluses) — **jamais sur le total incluant les prestations**.
- Les **visites** sont un système entièrement séparé des réservations de fête : `VisitAvailability`/`VisitBooking`, aucune contrainte d'exclusion BDD, **auto-confirmées à la création** (pas d'approbation pro). Le pro est notifié et peut annuler/contacter le client directement en cas de conflit.
- Incitation anti-fuite : paiement acompte en ligne = **−1000 DA automatique**. Paiement cash + reçu envoyé = **1000 DA reversé après vérification avec la salle**, jamais sans une vraie demande de réservation Zwadj préexistante (`CashbackClaim` toujours lié à un `Booking` existant). Le 1000 DA est prélevé sur la commission due par la salle, jamais sur les fonds propres de Zwadj.
- Navigation client : nav complète visuelle (Accueil/Salles/Prestataires/Inspirations/Mes outils/Communauté) mais seuls Accueil et Salles sont fonctionnels au MVP — les 4 autres affichent une page "Bientôt disponible / قريباً".

## Invariants (INTERDIT de les casser)
- Réservations/disponibilités : autoritaires serveur, rejeter l'écriture perdante sur les statuts confirmés. JAMAIS de last-write-wins sur une réservation acceptée/confirmée.
- Anti-double-réservation garanti par la BDD (EXCLUSION btree_gist) pour les réservations acceptées/confirmées — pas juste une vérif applicative.
- Idempotence sur POST /bookings (création de demande) et sur les webhooks paiement Chargily. Vérifier la signature du webhook avant tout traitement.
- Argent en entiers (centimes)/Decimal, jamais de float. Dates en UTC. IDs en UUIDv7.
- Bilingue FR/AR + RTL, aucune chaîne en dur. Propriétés CSS logiques (pas physiques) pour le support RTL. Pages publiques en SSR/SSG. Accessibilité AA.
- Aucun secret dans le code. Entrées validées/assainies. ORM paramétré, pas de SQL concaténé.
- D32 — Champs obligatoires : l'astérisque visuel est aria-hidden et vit hors du `<label>` ; l'attribut natif `required` est TOUJOURS posé sur l'input réel correspondant ; les formulaires restent `noValidate` avec erreurs Zod localisées — jamais de validation native navigateur.
- OAuth Google (Lot 8) : ne JAMAIS créer ni lier un compte sans `email_verified === true` dans le token vérifié. La création via Google produit TOUJOURS role=CLIENT ; PRO/ADMIN ne sont jamais connectables via Google. Le cookie refresh du flux Google est TOUJOURS persistant (D30). Un compte sans mot de passe (`passwordHash` null, impossible via register) répond au login classique par le MÊME 401 INVALID_CREDENTIALS avec coût argon2 factice (D5 étendu). La vérification du token passe par le port GOOGLE_TOKEN_VERIFIER (adapter `google-auth-library`, audience = GOOGLE_CLIENT_ID) — jamais de décodage maison du JWT Google.
- Médias (Flux A, dès le Lot A0) : JAMAIS de SDK de stockage appelé directement — tout passe par le port MEDIA_STORAGE (adapter dev = disque local ; adapter S3-compatible différé au déploiement). Clés d'objet MONO-SEGMENT générées côté serveur (`[a-z0-9-]` + extension) — jamais dérivées du nom de fichier utilisateur, qui n'est ni conservé ni reflété. Toute image est RE-ENCODÉE (webp) par le pipeline : les métadonnées EXIF (position GPS incluse) ne survivent jamais. Le format est établi par sniffing, jamais par le Content-Type déclaré. Les limites (octets, dimensions, ratio 2:1) vivent dans @zwadj/types : l'API les applique, la pré-validation front n'est qu'un confort.
- OAuth Google côté front (Lot 9) : bouton OFFICIEL GIS `renderButton` (D29), jamais custom-stylé, jamais de hover-lift ni de tokens de palette sur CE bouton ; présent UNIQUEMENT sur connexion + inscription de `apps/client`, jamais dans `apps/pro`. Sans `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, le bloc entier (séparateur inclus) n'est PAS rendu et le script Google n'est PAS chargé. Le body de `POST /auth/google` porte TOUJOURS la locale courante du segment `[locale]`. Le client ID est une valeur PUBLIQUE (audience) — le `GOOGLE_CLIENT_SECRET` ne doit exister nulle part côté front ni dans le code.

## Méthode
- Livrer par tranches verticales fines (schéma → API → tests → UI). Écrire les tests et les faire passer.
- Petites PR, messages Conventional Commits. Expliquer les choix d'architecture dans la PR.
- Marquer clairement le code des chemins critiques (paiement, auth, concurrence) → requiert revue humaine.
- Le design fourni (App.tsx) est une **référence visuelle par écran**, jamais une base de code à refactorer telle quelle : il est desktop-only, en instant-book, et hors périmètre MVP sur plusieurs écrans (forum, magazine, carte, 360°, planning). Ne construire que les écrans du MVP en cours, en respectant ce présent fichier, pas l'intégralité du prototype.

## À NE PAS faire
- Ne pas élargir le périmètre au-delà du MVP demandé, même si le design fourni montre plus.
- Ne pas introduire de dépendance lourde sans justification (pas de Redis, pas d'app admin, pas de 2ᵉ provider de paiement au MVP).
- Ne pas coder les chemins d'argent sans tests + demande de revue.
- Ne pas copier le flux "instant-book" du prototype : toujours request-to-book.
