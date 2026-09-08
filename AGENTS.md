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
- Les **visites** sont un système entièrement séparé des réservations de fête : `VisitAvailability`/`VisitBooking`, **auto-confirmées à la création** (pas d'approbation pro). Une visite dure **30 minutes fixes** pour toute la plateforme (D58, `VISIT_DURATION_MINUTES`) et **ne franchit jamais minuit** (`CHECK` à 1440, contre 2880 pour les créneaux de fête). ⚠ **D59 a RENVERSÉ la tolérance au chevauchement** : un créneau de visite `CONFIRMED` est **EXCLUSIF**, garanti par l'index unique **partiel** `visit_bookings_no_double_confirmed` (`WHERE status = 'CONFIRMED'` — c'est ce filtre qui permet à une annulation de LIBÉRER le créneau). Le pro est notifié sur les canaux qu'il choisit (D60 : `notifyByEmail`/`notifyBySms`, au moins un obligatoire par `CHECK`, transport SMS = **WhatsApp**) et peut annuler/contacter le client.
- Incitation anti-fuite : paiement acompte en ligne = **−1000 DA automatique**. Paiement cash + reçu envoyé = **1000 DA reversé après vérification avec la salle**, jamais sans une vraie demande de réservation Zwadj préexistante (`CashbackClaim` toujours lié à un `Booking` existant). Le 1000 DA est prélevé sur la commission due par la salle, jamais sur les fonds propres de Zwadj.
- Navigation client : nav complète visuelle (Accueil/Salles/Prestataires/Inspirations/Mes outils/Communauté), seuls Accueil et Salles fonctionnels au MVP. ⚠ **Écart assumé au cadrage initial (lot UI-N1)** : les 4 rubriques non construites ne sont **PAS des liens vers une page « Bientôt disponible »** — ce sont des `<span>` marqués « Bientôt », hors de l'ordre de tabulation. Les câbler sans page produirait 4 × 404, **pire qu'une absence** : le visiteur croit à une panne, pas à un chantier. Pour créer les vraies pages plus tard, remplacer les `<span>` par des `<Link>` dans `site-nav.tsx` — un tableau à une ligne près.

## Invariants (INTERDIT de les casser)

- ⚠ **L'AUTORITÉ SUR LES GARANTIES DE LA BASE EST LA MIGRATION, JAMAIS `schema.prisma` (D186).**
  Prisma **n'exprime pas** les index uniques partiels, les `CHECK`, les `EXCLUDE`
  ni les FK composites — c'est la raison d'être de toute la doctrine de
  migrations manuelles de ce dépôt. ⚠ **Erreur commise sur le chemin de
  l'argent** : `schema.prisma` montrant `@@index([bookingId])` sur `payments`, un
  cadrage a conclu que « rien n'empêche deux paiements `PAID` » et a proposé
  d'ajouter l'index — or `payments_one_paid_per_booking` **existait depuis
  juillet 2026**, avec exactement cette définition. **Avant d'affirmer qu'une
  garantie manque, la chercher dans `prisma/migrations/`, pas dans le schéma.**
- ⚠ **UNE GARDE DU CHEMIN DE L'ARGENT VIT DANS UN MODULE PUR (D187 — motif
  RÉÉCRIT par D192).** L'architecture ne bouge pas ; le motif écrit, si. Il
  disait : « une garde enfouie dans un service qui importe Prisma n'est pas
  exécutable là où le client n'est pas généré ». **Cette limite d'environnement
  n'existe plus** (D192) — et une règle adossée à une limite levée cesse d'être
  une règle, elle devient une habitude que personne ne sait plus défendre.
  ⚠ Le motif qui TIENT est la vitesse, pas l'exécutabilité : un module sans
  dépendance se rejoue en millisecondes, sans base, sans client généré, sans
  amorçage Nest. C'est ce qui permet de le **neutraliser et le rejouer à chaque
  passage** — une spec de service ne se rejoue qu'aux portes lourdes, donc plus
  rarement, donc plus tard. Sur le chemin de l'argent, « plus tard » est le
  défaut. Les règles vont dans un module sans dépendance (`payment-intent.ts`,
  comme `pricing-engine`), le service ne fait que lire et écrire.
- ⚠ **AUCUNE VALEUR RÉELLE DANS UN FICHIER D'EXEMPLE (D200).** `.gitignore` ne
  couvre que `.env` — **pas `.env.example`**, qui est SUIVI, poussé, et recopié
  par chaque poste. Les clés Chargily de test y ont vécu en clair. Un fichier
  d'exemple documente des NOMS de variables et des FORMATS, jamais des valeurs.
  ⚠ Corollaire de méthode : **un audit de secrets ne se tronque pas.** Le premier
  balayage s'était terminé sur un `head -10` rempli de faux positifs et affichait
  « (fin) » — un audit tronqué se lit exactement comme un audit complet.
- ⚠ **UNE GARDE QUI VIT DANS UN COMPOSANT SERVEUR NEXT EST INVISIBLE (D205).**
  Le repli sur des salles fictives était un ternaire dans `page.tsx` : correct, et
  jamais exécuté par un test — muter la page laissait 19 tests verts et aurait
  envoyé six salles inventées aux visiteurs. Toute décision de ce genre devient
  une **fonction pure** qui reçoit son environnement en paramètre
  (`previewVenuesFor(nodeEnv)`), appelée par la page. Elle ne décide toujours pas
  seule ; elle devient seulement mesurable.
- ⚠ **SIX FAÇONS DONT UN TEST NE MESURE RIEN (D209).** Toutes relevées par le
  harnais de neutralisation, aucune par relecture :
  1. **mesure confondue** — l'assertion est vraie pour une autre raison que celle
     qu'on croit (la ligne « créneau » manquait au récapitulatif parce qu'on était
     À l'étape créneau, pas parce que le créneau avait été effacé) ;
  2. **mutation auto-neutralisée** — muter un `useMemo` dont les dépendances
     n'incluent pas la variable mutée ne change rien ;
  3. **rôle absent** — `queryByRole("link")` sur un `<a>` SANS `href` rend `null`
     même quand le bloc s'affiche : le test passait sur un écran cassé ;
  4. **fixture à un seul élément** — `join(";")` et `join(",")` rendent la même
     chaîne sur une liste d'un élément : le séparateur ne se mesure qu'à deux ;
  5. **nom accessible plus riche qu'attendu** — le nom d'un jour de calendrier
     porte son état et son tarif, donc `/^15$/` ne correspond à rien ;
  6. **valeur monétaire tapée à la main** — `Intl` en `fr-DZ` insère des espaces
     insécables ÉTROITES (U+202F) ; « 1 000 000 » écrit au clavier ne correspond
     à rien. La valeur attendue vient du formateur.
- ⚠ **CHARGILY COMPTE EN DINARS, PAS EN CENTIMES (D195).** Mesuré : `amount: 5000`
  affiche « 5 000,00 DA » sur sa page de règlement, et `amount: 1` est refusé par
  « must be greater than or equal to 50 ». Notre système compte en **centimes**
  partout ; la conversion vit dans `chargily.gateway.ts` et **nulle part
  ailleurs**. ⚠ Elle **refuse** un montant qui n'est pas un dinar entier au lieu
  de l'arrondir : arrondir là serait un second calcul du même montant (D188) et
  masquerait le défaut amont derrière un paiement qui « marche ». Le facteur 100
  était silencieux — aucune porte ne l'aurait vu.
- ⚠ **AUCUNE URL DE RETOUR NE FAIT FOI DU PAIEMENT (D196).** `successUrl` et
  `failureUrl` disent au fournisseur où renvoyer, rien d'autre. Une redirection
  de navigateur se rejoue, se forge et se perd : la seule source de vérité est le
  webhook signé. Les deux pages affichent « vérification en cours » et lisent le
  statut chez nous.
- ⚠ **LES PORTES API S'EXÉCUTENT EN BAC À SABLE — NE PLUS LES DÉCLARER AVEUGLES (D192).**
  Pendant toute la tranche Q + E3, `typecheck`, `test` et `build` de l'API ont
  été rapportés « non exécutables », et une erreur de type est partie en
  livraison par ce trou. **Le diagnostic était faux.** `prisma generate` échoue
  pour deux raisons distinctes, dont une seule est un mur :
  1. `prisma.config.ts` appelle `env("DATABASE_URL")` et **jette avant de
     générer** — une URL factice suffit, `generate` ne se connecte à rien ;
  2. le téléchargement du `schema-engine` rend **403** — contourné par
     `PRISMA_SCHEMA_ENGINE_BINARY=/bin/true`, le générateur `prisma-client` de
     Prisma 7 étant en WASM et n'ayant jamais eu besoin de ce binaire.

  ```
  pnpm install --filter "@zwadj/api..." --ignore-scripts
  cd apps/api && DATABASE_URL="postgresql://u:p@localhost:5432/zwadj" \
    PRISMA_SCHEMA_ENGINE_BINARY=/bin/true npx prisma generate
  ```
  Après quoi : `typecheck` exit 0, `lint` exit 0, **41 fichiers / 424 tests**,
  `nest build` exit 0. ⛔ **Reste hors de portée** : tout ce qui exige un
  PostgreSQL réel — migrations et tests d'intégration. Il n'y a ni serveur ni
  utilisateur `postgres` dans le bac à sable.
  ⚠ **La leçon dépasse Prisma** : « non exécutable » est une **mesure**, pas une
  impression. Un empêchement se relève avec son message d'erreur exact, et se
  re-teste à chaque tranche — sinon il se recopie de rapport en rapport bien
  après avoir disparu, et couvre exactement ce qu'il prétendait signaler.
- ⚠ **UN CHEMIN D'API DONT L'ACTION EST UNE VARIABLE ÉCHAPPE AU TEST DE CONTRAT (D182).**
  `contract-api-client.int-spec.ts` relève les chemins dans les **sources** du
  client et remplace chaque `${…}` par un joker. Le raccourci
  `act(id, action)` déclarait donc `/quotes/*/*`, qui correspond à `send` comme à
  `deliver`, à `decline` comme à `cancel` : **les deux renommages de Q2 et Q3a
  étaient invisibles au seul test conçu pour les voir.** Le littéral doit être
  **dans** l'appel à `request(...)`, sans intermédiaire — un `post(path)` maison
  rend les routes invisibles au lieu de les révéler. Un joker qui couvre tout ne
  couvre rien.
- **NEUTRALISER D'ABORD, VÉRIFIER EN RÉEL, SUPPRIMER ENSUITE (D183).** Trois
  lots, pas un. Une colonne se neutralise (plus lue ni écrite), la bascule est
  vérifiée sur base réelle, **puis** elle se supprime. Tant que la colonne est
  là, le retour arrière est un déploiement ; après, c'est une restauration de
  sauvegarde. ⚠ Q4 est le premier point de non-retour de la série `Q`.
- **UN DÉFAUT DE CONFIGURATION SUR LE CHEMIN DE L'ARGENT NE FAIT RIEN.**
  `PAYMENTS_ENABLED` vaut `false` en l'absence de valeur — un drapeau dont
  l'absence vaudrait « activé » s'allumerait seul au premier déploiement où la
  variable manque. Et il est **exigé explicitement en production** malgré ce
  défaut : le défaut protège de l'allumage accidentel, l'exigence protège de
  l'inverse. ⚠ Les variables d'environnement sont des **chaînes** :
  `Boolean("false")` vaut `true`.

- **DOCTRINE DES BORNES (D55).** ⚠ **SIX bugs de la même famille.** **Avant d'écrire une validation de borne, écrire le cas RÉEL qu'elle doit accepter** : la soirée 20h→02h, la saison novembre→février, le blocage qui inclut son dernier jour. Si la validation le refuse, **c'est la validation qui a tort**. Une borne ne se valide **jamais deux fois** : si le schéma l'autorise, l'écran ne la restreint que délibérément et par écrit. Une borne traduite doit **se relire dans les mêmes termes** — écrire « au 10 » et relire « au 11 » fait corriger une erreur qui n'existe pas.
  ⚠ **5ᵉ (D135)** : `contactEmail` était **requis** en Zod alors que `bookings.contact_email` est `String?` **depuis toujours**. Le cas rejeté n'avait rien d'un cas limite — c'était le client algérien au comptoir, sans e-mail — et il rendait le parcours sur place inachevable. **La base disait déjà le contraire de la borne.**
  ⚠ **6ᵉ (D147)** : la fenêtre des visites demandait `to = aujourd'hui + 92 jours`, alors que le schéma compte **bornes INCLUSES** (`(to - from) / 86400000 + 1 > 92`) — donc 93 jours, donc 400 à chaque chargement. **Toute borne côté front est IMPORTÉE du contrat** (`AVAILABILITY_MAX_WINDOW_DAYS`), jamais recopiée : le « −1 » n'est pas un ajustement empirique, c'est la traduction de « bornes incluses ».
- **Le fuseau et le calendrier ne se dérivent JAMAIS de la locale (D48, D56).** UTC+1 sans heure d'été ; semaine du **dimanche** au samedi ; week-end **vendredi-samedi** (et c'est le PIC de la demande, pas un creux à griser). ⚠ CLDR/`Intl` répond « samedi » pour `ar-DZ` : **s'en écarter est délibéré, ne pas « réaligner »**. Deux numérotations coexistent : JS/API `0 = dimanche … 6 = samedi`, ISO `1 = lundi … 7 = dimanche` — tous les modules de grille raisonnent en **JS**.
- **24 h EXCLUSIVEMENT (D57).** `formatWallClock`/`formatSlotRange` de `@zwadj/types` sont les **seuls** formateurs d'heure. `Intl.DateTimeFormat` est **interdit pour l'heure** (bascule en AM/PM selon la locale du moteur), autorisé pour dates/mois/jours. **Aucun `<input type="time">` dans le dépôt** : il est rendu par le navigateur dans SA locale et affiche AM/PM en anglais → utiliser `TimeSelect` (`apps/pro/src/venues/time-select.tsx`).
- **UN SEUL LEVIER DE TEST PAR CLASSE DE PROTECTION (D128).** Les variables `THROTTLE_*` de `auth.throttle.ts` couvrent **toutes** les limites, `/auth` **et** le limiteur par défaut (`DEFAULT_THROTTLE`). ⚠ Le limiteur global était codé en dur dans `app.module.ts` et échappait au levier : mesuré, **51 refus en 429 sur 150 lectures** d'une route publique, ce qui fait échouer une suite par grappes sur des tests sans rapport. **Ne jamais créer un second mécanisme** pour relâcher la même protection — c'est deux endroits où se tromper, et un jour un seul des deux désactivé en croyant les avoir tous les deux. ⚠ Ces variables restent **hors du schéma env validé** : en production rien n'est défini, les défauts (100 / 60 s) s'appliquent.
- **UN TOKEN PARTAGÉ NE SE DÉPLACE PAS POUR UN ÉCRAN (D129).** `.alert-error` rendait `--danger` sur `--danger-soft` à 4,41:1 (AA en demande 4,5 à 13 px). Corriger en bougeant `--danger` aurait touché `.btn-danger`, les bordures d'erreur et les textes d'erreur, **dans les deux apps et les deux thèmes** — c'est exactement UI-D1 → UI-D2. La réponse est un token **dédié** (`--danger-ink`), déclaré sur **tous** les thèmes : un token absent d'un thème retombe sur `inherit` et rend l'écran **pire** qu'avant.
- **Un seul endroit par formule.** Les constantes de temps vivent dans `@zwadj/types` ; `PUBLIC_BASE_WHERE`/`PUBLIC_DETAIL_STATUSES`/`SLUG_PATTERN` sont exportés de `venues-public.service.ts` et partagés par le détail, `/availability` et `/visit-slots` ; `PriceInput` est exporté de `venue-form.tsx`. Deux formules concurrentes du même calcul finissent toujours par diverger — et la divergence est silencieuse.
- **Les doubles de test du client venue vivent dans `apps/pro/src/test-support/client-doubles.ts`, un seul endroit.** Ils étaient recopiés dans sept fichiers ; chaque extension du contrat les cassait tous les sept.
- Réservations/disponibilités : autoritaires serveur, rejeter l'écriture perdante sur les statuts confirmés. JAMAIS de last-write-wins sur une réservation acceptée/confirmée.
- Anti-double-réservation garanti par la BDD (EXCLUSION btree_gist) pour les réservations acceptées/confirmées — pas juste une vérif applicative.
- ⚠ **L'IDEMPOTENCE N'EST PAS IMPLÉMENTÉE. Cette ligne a longtemps prétendu le contraire.** Vérifié en août 2026 : **zéro** mécanisme de clé d'idempotence dans le dépôt. `POST /venues/:slug/bookings` **crée deux demandes PENDING** sur un double clic. Le webhook Chargily n'existe pas encore. Ce qui est DÛ, et qui reste dû : clé d'idempotence sur `POST /bookings`, signature du webhook vérifiée **avant tout traitement**, déduplication par `event id`. `WebhookEvent` porte déjà `@@unique(provider, eventId)` au schéma — la table existe, le code non. **Un invariant écrit au présent alors qu'il n'est pas tenu est pire qu'une absence de ligne** : il fait croire le travail fait.
- **TOUT STATUT SERVANT À DÉCIDER UNE TRANSITION SE LIT DANS LA TRANSACTION (D117, D121).** Sous verrou (`SELECT … FOR UPDATE`) ou par check-and-set (`updateMany` conditionné au statut) — **jamais avant**. Le contrôle d'avant transaction est **supprimé**, pas doublé : une seule autorité par question (D78). ⚠ Le cas SÉQUENTIEL peut rendre un 409 correct pendant que le cas CONCURRENT passe : c'est ce qui a masqué le trou pendant quatre lots. Deux acceptations simultanées de la même demande écrasaient les dates et **notifiaient le client deux fois** ; l'`EXCLUDE` n'y peut rien, une ligne ne chevauche pas elle-même.
- **TOUTE VIOLATION DE CONTRAINTE SE TRADUIT EN ERREUR MÉTIER.** `quote.convert` rendait **409** quand la garde applicative voyait le conflit et **500** quand la base l'arrêtait — le même empêchement, deux réponses. Sur un paiement, ce serait un client qui ne sait pas s'il a payé.
- **TOUTE LISTE VENUE DU RÉSEAU PASSE PAR `Array.isArray` (D120) — ⚠ DEVANT UN RENDU, PAS DEVANT UN CHARGEUR (D133, D142).** Sans garde, une réponse malformée fait tomber la section au rendu (`rows.map is not a function`). ⚠ **Mais devant un `.filter` situé DANS un chargeur sous `try/catch`, la même garde est NUISIBLE** : le `catch` contient déjà l'échec et affiche « Indisponible » ; la garde le remplace par un **0**, c'est-à-dire un compte FAUX présenté comme un fait sur une réponse de proxy en 502. Deux sentinelles rougissent si on la réintroduit par réflexe. ⚠ Et un champ de mauvais **type** n'écroule pas React — **il l'affiche** : sans garde devant le rendu, l'entonnoir annonce « deux envoyés · undefined aboutis », plus insidieux qu'une chute, parce qu'une chute se voit. ⚠ Et **chaque section a SA frontière d'erreur** (`SectionErrorBoundary`), jamais une seule autour de la page : la garde de forme ne peut rien contre un tableau **valide** dont les **lignes** sont amputées. Avant D120, il n'existait **aucune** frontière dans le dépôt — une section qui levait emportait l'écran entier, devis compris.
- **LE MUTEX SINGLE-FLIGHT COUVRE TOUT EFFET DE MONTAGE À EFFET DE BORD (D115), pas seulement le refresh.** Il existait et fonctionnait, mais `bootstrap()` appelait le réseau en direct : un seul des deux chemins était couvert, et `StrictMode` suffisait à révoquer toutes les sessions de l'utilisateur. ⚠ Aucun mutex JS ne peut couvrir **deux onglets** — l'arbitrage remonte au serveur (D116).
- **UNE ROUTE SANS `@Roles` EST UN CHOIX ÉCRIT, PAS UN OUBLI (D119).** Les routes authentifiées sans rôle sont confrontées à une liste blanche justifiée dans `rbac-all-routes.int-spec.ts`. Une route privée de son `@Roles` **sortait du périmètre** des tests « pour chaque route pro », donc de toute surveillance.
- **LA PROPRIÉTÉ D'UNE SALLE SE TRAVERSE PAR LA RELATION (D149).** `Venue.ownerId` référence **`ProProfile.id`**, PAS `User.id` — le schéma le dit : `owner ProProfile @relation(fields: [ownerId], references: [id])`. L'idiome est `where: { id, deletedAt: null, owner: { userId } }`. ⚠ Un correctif a passé l'id **utilisateur** dans `ownerId` : la route rendait **404 pour tous les pros**, et le nom du champ avait suffi à le rendre crédible. **Un identifiant qui « ressemble » se relève, il ne se devine pas.**
- **UNE RÉUTILISATION D'ENDPOINT SE VÉRIFIE SUR L'ÉTAT RÉEL LE PLUS COURANT DE LA DONNÉE (D146).** Le calendrier pro consommait la route publique : le motif était juste (ne pas dupliquer le moteur), la vérification manquait. `PUBLIC_BASE_WHERE` exige `publicationStatus = PUBLISHED`, or l'état courant d'une salle neuve est **brouillon** — aucun pro ne voyait son propre calendrier avant publication. La réponse n'est pas un second moteur mais une **seconde porte de recherche** sur le même `compute` (D145), avec un test d'intégration qui exige l'**égalité stricte** des deux réponses.
- **LES POINTS D'ENTRÉE SONT FERMÉS À UNE SESSION OUVERTE (D148).** `RequireProSession` empêchait d'entrer sans session ; rien n'empêchait d'en sortir vers `/auth/connexion` **avec** une session valide. ⚠ **Deux routes restent ouvertes et ce n'est PAS un oubli** : `/auth/reinitialisation` et `/auth/verification-email` consomment un jeton reçu par e-mail — la vérification d'adresse est même atteinte *après* un changement d'e-mail, donc forcément connecté.
- **UN CHAMP DE SAISIE PORTE UN `<label>` VISIBLE (D143).** `aria-label` seul sert les tests et la voix, et laisse des cases nues indistinguables à l'œil.
- Argent en entiers (centimes)/Decimal, jamais de float. Dates en UTC. IDs en UUIDv7.
- Bilingue FR/AR + RTL, aucune chaîne en dur. Propriétés CSS logiques (pas physiques) pour le support RTL. Pages publiques en SSR/SSG. Accessibilité AA.
- Aucun secret dans le code. Entrées validées/assainies. ORM paramétré, pas de SQL concaténé.
- D32 — Champs obligatoires : l'astérisque visuel est aria-hidden et vit hors du `<label>` ; l'attribut natif `required` est TOUJOURS posé sur l'input réel correspondant ; les formulaires restent `noValidate` avec erreurs Zod localisées — jamais de validation native navigateur.
- OAuth Google (Lot 8) : ne JAMAIS créer ni lier un compte sans `email_verified === true` dans le token vérifié. La création via Google produit TOUJOURS role=CLIENT ; PRO/ADMIN ne sont jamais connectables via Google. Le cookie refresh du flux Google est TOUJOURS persistant (D30). Un compte sans mot de passe (`passwordHash` null, impossible via register) répond au login classique par le MÊME 401 INVALID_CREDENTIALS avec coût argon2 factice (D5 étendu). La vérification du token passe par le port GOOGLE_TOKEN_VERIFIER (adapter `google-auth-library`, audience = GOOGLE_CLIENT_ID) — jamais de décodage maison du JWT Google.
- Médias (Flux A, dès le Lot A0) : JAMAIS de SDK de stockage appelé directement — tout passe par le port MEDIA_STORAGE (adapter dev = disque local ; adapter S3-compatible différé au déploiement). Clés d'objet MONO-SEGMENT générées côté serveur (`[a-z0-9-]` + extension) — jamais dérivées du nom de fichier utilisateur, qui n'est ni conservé ni reflété. Toute image est RE-ENCODÉE (webp) par le pipeline : les métadonnées EXIF (position GPS incluse) ne survivent jamais. Le format est établi par sniffing, jamais par le Content-Type déclaré. Les limites (octets, dimensions) vivent dans @zwadj/types : l'API les applique, la pré-validation front n'est qu'un confort.
- **Visite virtuelle : Matterport, pas de viewer maison (D45, Lot A6a — supersède l'ancien tour 360° multi-photos/Pannellum du Lot A4).** `Venue.matterportModelId` (nullable, `@unique`) est le SEUL artefact stocké côté Zwadj — aucune table de scènes/liaisons, aucun pipeline d'image dédié au 360°, aucune dépendance à Pannellum. Le pro saisit un ID ou une URL de partage Matterport via `PATCH /venues/:id/virtual-tour` ; la normalisation (`parseMatterportInput`) accepte les deux formes, une chaîne vide désactive explicitement la visite. 400 `INVALID_MATTERPORT_LINK` sur format invalide, 409 `MATTERPORT_ALREADY_LINKED` sur violation de l'unicité SQL (deux salles ne peuvent pas partager un scan). Aucune validation d'existence côté API Matterport (dépendance réseau à l'écriture jugée non nécessaire au MVP) — format seulement. Le viewer public se monte AU GESTE UTILISATEUR uniquement, jamais automatiquement.
- **`packages/types` compile avec `lib: ["ES2022"]` SEULE** (`packages/config/tsconfig/base.json`) — ni DOM, ni `@types/node`. Toute fonction partagée doit éviter les globals navigateur/Node (`URL`, `fetch`, `Buffer`…), sous peine de `TS2304: Cannot find name`. Constaté au Lot A6a : `parseMatterportInput` ne peut pas utiliser `new URL()`, réécrit en découpage manuel de chaîne (authority/host/query).
- OAuth Google côté front (Lot 9) : bouton OFFICIEL GIS `renderButton` (D29), jamais custom-stylé, jamais de hover-lift ni de tokens de palette sur CE bouton ; présent UNIQUEMENT sur connexion + inscription de `apps/client`, jamais dans `apps/pro`. Sans `NEXT_PUBLIC_GOOGLE_CLIENT_ID`, le bloc entier (séparateur inclus) n'est PAS rendu et le script Google n'est PAS chargé. Le body de `POST /auth/google` porte TOUJOURS la locale courante du segment `[locale]`. Le client ID est une valeur PUBLIQUE (audience) — le `GOOGLE_CLIENT_SECRET` ne doit exister nulle part côté front ni dans le code.

⚠ **CE QUI DÉPEND DE L'HORLOGE NE VIT PAS DANS UN SCHÉMA ZOD.** Un schéma est pur et partagé ; y lire `Date.now()` le rend non déterministe pour tous ses appelants, dont leurs tests. Le service est seul autorisé à lire l'heure (D48). Corollaire côté test : **figer l'horloge** (`vi.setSystemTime`), jamais choisir une date « dans le futur » — elle cesse de l'être, et la suite rougit sans qu'une ligne de code ait bougé. (D213, D227)

⚠ **ÉCRÊTER UNE FENÊTRE ≠ ÉCRÊTER UN POINT.** D49 écrête parce qu'une fenêtre qui rétrécit reste une réponse à la question posée. Un paramètre-POINT écrêté répond sur autre chose, en silence : il se **refuse**. (D213)

⚠ **UN BOOLÉEN NULLABLE EST UN TYPE À TROIS VALEURS.** `null` ne veut pas dire `false`. Tout écran qui le consomme teste `=== false` explicitement : un `!valeur` traite « je ne sais pas » comme « non ». (D211, D225)

⚠ **TOUTE RÉPONSE PARAMÉTRÉE PORTE L'ÉCHO DE SON PARAMÈTRE.** Sans écho, l'appelant PRÉSUME que la réponse porte sur ce qu'il croit avoir envoyé. Généralisation des bornes effectives de D49. (D212)

⚠ **UN REFUS MÉTIER NE SE REPLIE PAS SUR UNE PANNE.** « Momentanément indisponible » invite à réessayer une requête qui ne marchera jamais. Distinguer coûte un type ; ne pas distinguer coûte un visiteur qui recharge en boucle. (D217)

⚠ **UN FILTRE VIT DANS LE `where`, JAMAIS APRÈS LA PAGE.** Retirer des lignes après que `count()` les a comptées fait mentir `total` et laisse la dernière page vide. Les deux requêtes du `$transaction` doivent partager le même `where` : l'accord est alors structurel, il n'y a rien à resynchroniser. (D225)

⚠ **PAS DE CHROME DUPLIQUÉE ENTRE PRO ET CLIENT.** Deux copies d'un même écran avaient déjà divergé sur trois points, et aucun n'était un choix. Ce qui est visuellement commun vit dans `@zwadj/ui` (`journey.tsx` + bloc dédié de `styles.css`) ; les feuilles des apps ne gardent que la MISE EN PAGE (`grid-area`, position). (D223)

⚠ **UNE SEULE AUTORITÉ DE CONVERSION D'UNITÉ.** L'URL publique porte des **dinars** (`maxPrice`), l'API des **centimes** (`maxPriceCents`), et `toApiQuery` fait seule le passage. Tout écran qui construit sa propre querystring contourne cette autorité — c'est par là que le budget partait sous le mauvais nom. (D228)

⚠ **RÈGLE SEO** : une page de recherche portant le moindre paramètre est une VARIANTE ⇒ `noindex, follow`, canonical sur la page nue. Le `follow` est le point : les FICHES, seules pages qu'on veut indexer, sont atteintes **depuis** ces variantes. `NEXT_PUBLIC_SITE_URL` est **obligatoire en production**. (D216)

⚠ **AUCUNE FRONTIÈRE SUSPENSE AU-DESSUS D'UNE PAGE QUI PEUT REFUSER.** Un `loading.tsx` place les pages du segment sous une frontière ; Next vide alors la coquille AVANT que `notFound()` ne remonte, l'en-tête HTTP est déjà parti, et le 404 sort en **200**. Un soft-404 se fait indexer comme une vraie page et fait mentir toute sonde. Mesuré des deux côtés : fichier en place ⇒ 200, fichier retiré ⇒ 404. Borner la frontière par un **groupe de routes** plutôt que la supprimer. (D250)

⚠ **UN NOM DE FICHIER SPÉCIAL EST UNE LISTE FERMÉE.** `page`, `layout`, `loading`, `not-found`, `error`… Tout autre nom n'est pas une route en erreur : ce n'est **pas une route**. Un `_not-found.tsx` a vécu quatre jours dans l'arbre sans jamais se rendre, et aucun test de rendu n'aurait pu s'en apercevoir. Les gardes de routage mesurent des **noms de fichiers**. (D249)

⚠ **UNE FRONTIÈRE IMBRIQUÉE N'ATTRAPE PAS CE QUI N'APPARIE RIEN.** `[locale]/not-found.tsx` ne couvre qu'un `notFound()` levé dans un segment DÉJÀ apparié. Une URL inconnue n'apparie pas `[locale]` : il faut un attrape-tout `[locale]/[...rest]/page.tsx`, dont le travail n'est pas d'appeler `notFound()` mais de faire **apparier le segment** pour que le layout se monte. (D249)

⚠ **UNE IMAGE EN `<img>` EST UN DOCUMENT ISOLÉ.** Elle n'accède ni au CSS de la page, ni à ses polices auto-hébergées, ni à son thème. Trois conséquences : du `<text>` y retombe sur une police système — et sur l'arabe cela donne des lettres **NON LIÉES**, illisibles, défaut invisible pour qui ne lit pas l'arabe ; les couleurs y sont gravées, pas héritées ; les opacités se gravent au niveau du **mode sombre**, la page atténuant en clair, car `opacity` ne dépasse pas 1. (D251)

⚠ **UN DÉCOR PORTE `alt=""`, PAS UN `alt` ABSENT.** Sans `alt`, une image est annoncée par son **nom de fichier** — « quatre cent quatre tiret nuage point s v g » lu avant le message d'erreur. `alt=""` la sort de l'arbre d'accessibilité, ce qui est le traitement exact d'un élément sans valeur d'information. (D251)
## Routes de l'app Pro (tranche UIP — D130)

| Route | Écran | Note |
|---|---|---|
| `/` | Tableau de bord — « Nouvelle réservation » | Le `<h1>` annonce la TÂCHE, « Tableau de bord » reste le nom de l'onglet |
| `/salles` | Liste des salles | ⚠ Route **déclarée** depuis D130 — elle tombait sur `<Route path="*">` |
| `/salles/nouvelle` | Assistant, étape 1 — **crée la salle** puis part sur `?etape=2` | STATIQUE avant PARAM |
| `/salles/:id` | Assistant, 7 étapes, `?etape=N` | Édition et création convergent après l'étape 1 |
| `/demandes` | Demandes de date (hors verrouillées) + rendez-vous de visite | Deux volets, **jamais** une liste unique (D47) |
| `/calendrier` | Calendrier de la salle | ⚠ `/salles/:id/calendrier` **supprimée** |
| `/reservations` | Dates **verrouillées** (`ACCEPTED` + `CONFIRMED`) | D131 — devient « payées/confirmées » à E3 sans retouche |
| `/compte` | Salle & profil | |
| `/auth/connexion`, `/auth/inscription`, `/auth/mot-de-passe-oublie` | Entrées — **fermées à une session ouverte** (D148) | |
| `/auth/reinitialisation`, `/auth/verification-email` | ⚠ **Ouvertes même connecté** : elles consomment un jeton d'e-mail | |

⚠ Les écrans **globaux** (tableau de bord, demandes, calendrier, réservations)
portent sur une salle résolue par `ProVenuesProvider` — **une seule lecture de
`listMine()` pour toute la coquille**. Le libellé adaptatif « Ma salle / Mes
salles » et la liste lisent la MÊME source : deux lectures indépendantes
laissaient le libellé au pluriel après la suppression d'une seconde salle (D78).
⚠ Ce provider **ne charge rien avant qu'un PRO soit connecté** — monté au-dessus
de toutes les routes, il tirait sinon un `GET /pro/venues` en 401 sur l'écran de
connexion (famille D115).

## Méthode
- Livrer par tranches verticales fines (schéma → API → tests → UI). Écrire les tests et les faire passer.
- **Reproduire avant de corriger.** Un défaut se prouve par un test rouge AVANT tout correctif. Un correctif sans reproduction mesurée n'est pas un correctif, c'est une hypothèse.
- ⚠ **NEUTRALISER LA GARDE POUR PROUVER QUE LE TEST MORD.** Reproduire ne suffit pas : la campagne qualité a produit **quatre tests verts qui ne mesuraient rien** — assertion sur le mauvais niveau de titre, assertion posée avant l'arrivée de la donnée, comparaison d'un rechargement à froid avec un autre rechargement à froid, et une neutralisation qui n'avait **rien remplacé**. Pour chaque garde neuve : la neutraliser, montrer le rouge, la restaurer, montrer le vert. Et tout script de neutralisation **assure son nombre de remplacements** — sinon il ne prouve rien en silence.
  ⚠ **IL COMPTE AUSSI SES EXÉCUTIONS (D144).** `vitest -t <filtre>` sort en **0 quand aucun test ne correspond** : après une réécriture de tests, trois filtres ne matchaient plus rien et le script a lu ces « 0 » comme *« la garde est inutile »*, alors qu'elle n'avait **jamais été mesurée**. C'est le vert creux que ce script existe pour attraper, un étage au-dessus de lui. ⚠ Et la première correction ne lisait que les « passed » : elle ratait le format `Tests 1 failed (1)` et **déplaçait** le faux négatif au lieu de le supprimer — le compteur lit le **total entre parenthèses**.
- ⚠ **AUCUNE VALEUR ATTENDUE NE S'ÉCRIT DE MÉMOIRE.** Quatre fois, une attente inventée a produit un rouge sans objet : `/api/v1/venues/mine` et `/api/v1/reference/wilayas` n'existent pas, `/auth/me` a onze clés et non six, les référentiels utilisent `nameFr`/`nameAr` et non `labelFr`/`labelAr`. **On relève, on ne devine pas.** Un test qui accuse à tort est pire qu'un test absent : on apprend à l'ignorer.
  ⚠ Cela vaut aussi pour les **chemins d'import** (`AuthenticatedUser` vit dans `auth.types`, pas dans `auth.decorators` qui l'importe sans le réexporter), pour les **types de champ** (`WilayaDTO.code` est un **nombre**, pas une chaîne, même s'il s'écrit « 16 »), et pour les **chaînes de format** — `formatDZD` rend **zéro décimale** et des espaces **insécables** que Testing Library normalise d'un seul côté : un attendu littéral échoue sur un écran parfaitement correct. **Dériver l'attendu du formateur partagé.**
  ⚠ **Recopier une référence, c'est parfois recopier la règle qu'on prétend réfuter** : deux fixtures d'acompte valaient **pile 30 %** du total — dont celles de la maquette — et ne prouvaient donc rien contre un `Math.round(total * 0.3)` côté navigateur.
- **Vérifier la provenance de l'arbre avant d'y toucher.** L'arbre de travail a divergé deux fois pendant la campagne — du code non attribué est apparu entre deux tours, dont un lot entier sur la rotation des jetons. `diff` contre le zip livré, `git apply --check` avant toute extraction.
- **Suite e2e (`e2e/`, Playwright) : à la demande, PAS une septième porte.** À lancer avant tout lot touchant **auth, concurrence ou argent**, et avant chaque livraison finale. Elle tourne contre les serveurs de **développement** : `StrictMode` ne double le montage que là, et c'est ce double montage qui révèle la classe de défauts pour laquelle elle existe.
- ⛔ **UN EXTRACTEUR SE VÉRIFIE CONTRE LA SORTIE BRUTE AVANT DE SERVIR À COMPTER (D275).**
  **Trois faux positifs dans une seule session**, tous sur l'outillage jetable d'une
  certification, aucun sur le code mesuré : `grep "Test Files"` ne voyait **rien** parce
  que les résumés Vitest portent des **codes ANSI** ; un compteur de `FAIL` rendait 1 sur
  une suite à 434/434 parce que le mot est dans le **NOM** d'un test qui passe (« la ligne
  passe FAILED ») ; un chronomètre rendait **1 788 796 851 s**, un horodatage epoch, sa
  variable de départ perdue au passage en arrière-plan. ⛔ **AUCUN N'A LEVÉ — TOUS ONT
  RÉPONDU**, et leur réponse avait la forme exacte d'une mesure : zéro ligne se lit comme
  « rien à signaler », un `1` comme un échec, un grand nombre comme une durée.
  ⚠ **C'est un MOTIF, pas un incident** : c'est la règle du rang 6 (« un instrument se
  calibre sur un cas dont la réponse est déjà connue ») appliquée aux extracteurs qu'on
  écrit en passant — précisément ceux qu'on ne songe pas à calibrer parce qu'ils ne sont
  « que » du `grep`. ⇒ **Avant de compter sur une sortie : l'ouvrir, la lire, et vérifier
  que le motif trouve ce qu'on sait y être.** Un extracteur qui rend zéro se confronte à
  la sortie brute avant d'être cru — et un compte lu par sous-chaîne se confronte au
  **contexte** de ses occurrences, jamais à leur seul nombre.
- ⚠ **UN COMPTE DE VIOLATIONS N'EST PAS UN COMPTE DE PROBLÈMES.** La première référence d'accessibilité annonçait **70 violations** ; c'étaient **19 problèmes**, dont deux pesaient 54 nœuds. Un outil qui compte par nœud DOM surestime toujours. Regrouper par cause **avant** de prioriser — et geler par **catégorie**, pas par nœud : 96 % des signatures initiales contenaient un `:nth-child()` ou un `[href$=…]`, donc churnaient sur un changement de graine ou l'insertion d'un champ. Un gel qu'on régénère sans le lire ne gèle rien.
- ⚠ **UN ÉCHEC QUI SE DÉPLACE EST PIRE QU'UN ÉCHEC STABLE (D127).** Next et Vite compilent une route à la première demande : le test qui paie la compilation dépend de l'ordre d'attribution aux workers. Un tel échec finit relancé sans être lu. On paie le coût **hors de toute mesure** (projet `warmup`) plutôt que de monter les délais d'attente. ⚠ Un délai qu'on augmente à chaque échec finit par ne plus rien mesurer.
- **Ce qu'une porte verte ne regarde pas** : qu'un composant soit **monté** quelque part (leçon R1 — deux écrans livrés et inatteignables, six portes vertes), ce qui se passe dans un vrai navigateur, et ce qu'une migration fait sur une base **non vide** (D123). ⚠ **Ni la clause `WHERE` d'une réutilisation d'endpoint** (D146 — le calendrier pro rendait 404 pour toute salle non publiée, toutes portes vertes), **ni un identifiant qui « ressemble »** (D149 — id utilisateur passé dans un champ qui référence un profil pro).
- ⚠ **UN REMPLACEMENT DE TEXTE SANS ASSERTION EST UN REMPLACEMENT FANTÔME.** Trois fois dans une même tranche, un motif écrit en `\n` n'a rien remplacé dans un fichier en **CRLF** — et le script annonçait « fait ». Un branchement entier est resté non câblé, typecheck vert. **Tout script d'édition vérifie son nombre d'occurrences AVANT de remplacer, et le marqueur attendu APRÈS.** L'audit du zip est le dernier filet : il a attrapé celui-là.
- Petites PR, messages Conventional Commits. Expliquer les choix d'architecture dans la PR.
- Marquer clairement le code des chemins critiques (paiement, auth, concurrence) → requiert revue humaine.
- Le design fourni (App.tsx) est une **référence visuelle par écran**, jamais une base de code à refactorer telle quelle : il est desktop-only, en instant-book, et hors périmètre MVP sur plusieurs écrans (forum, magazine, carte, 360°, planning). Ne construire que les écrans du MVP en cours, en respectant ce présent fichier, pas l'intégralité du prototype.
  ⚠ **La fidélité au design est STRUCTURELLE, jamais chromatique** (D26, confirmée par la tranche UIP). Le design déclare lui-même `body[data-mode="pro"]{--accent:#222222}` : le rose est son accent **client**. Mais ses écrans pro portent **9 valeurs roses en dur** qui traversent l'override de token — transposées telles quelles, elles réintroduisent le rose. **Auditer l'absence de couleur en dur dans toute zone refondue.**
  ⚠ **Le design ne fait pas foi sur une phrase qui DÉCRIT le comportement du système** : sa boîte de suppression annonce « supprimées définitivement » alors que `DELETE /venues/:id` est un **soft delete**.
  ⚠ **Une maquette peut compter à l'envers.** Ses colonnes plaçaient les étapes 01/03 à gauche et 02 à droite : lu dans le DOM — donc au clavier et au lecteur d'écran — cela donne 01 → 03 → 02. **Le DOM énumère, `grid-template-areas` place.**

⛔ **AUCUN LOT NE PART DANS `main` SOUS UNE PORTE ROUGE, même quand le rouge vient
d'ailleurs (D270).** La provenance dit QUI corrige, pas si la porte est verte ; D269
fusionné rouge a brouillé l'attribution des mesures. ⚠ Deux lots non certifiés en
attente sont tenables, **trois non**. Et une porte redevenue verte ne certifie QUE le
lot mesuré : on écrit « porte verte à cette date, tel lot en fait partie », on ne
réécrit pas les en-têtes des précédents — ce serait une certification par procuration.

⛔ **RELEVER L'ÉTAT MACHINE AVANT TOUTE MESURE DE DURÉE OU D'INTERMITTENCE (D270).**
Trois fois en deux sessions une mesure a renseigné sur la MACHINE et non sur le code,
dont une conclusion publiée puis fusionnée : **la même commande, sur le même arbre,
a rendu une suite entièrement verte en quelques dizaines de secondes, et des dizaines
d'échecs en plusieurs minutes.** ⛔ Les relevés ne sont pas recopiés ici : une durée
sans son état machine est exactement la mesure que cette règle interdit. Ils vivent
dans la section **D270** de `ZWADJ_CONTINUITE.md`, chacun précédé de sa charge.
**« Intermittent » sans état relevé ne veut rien dire.**

⛔ **NE JAMAIS ÉDITER UN FICHIER PENDANT QU'UNE VÉRIFICATION LE LIT (D270)** — 24 échecs
sans signification, puis une conclusion fausse tirée d'eux. ⚠ Et une campagne de N
exécutions écrit dans un **FICHIER**, jamais dans une variable de shell : un rouge
qu'on ne peut plus relire se relance sans être lu.

⚠ **LES PORTES SE RELANCENT APRÈS LA DERNIÈRE MODIFICATION, JAMAIS AVANT.** Une archive a été livrée **rouge au typecheck**, avec une note annonçant « 0 erreur » : la mesure était exacte, des fichiers avaient changé entre la mesure et l'emballage. Une porte mesurée n'est pas une porte verte à la livraison. Corollaire : une archive fautive déjà partagée se **supprime** — un lien mort vaut mieux qu'une archive qu'on extrait par erreur. (D218)

⚠ **UN TEST ÉCRIT DANS LA MÊME SÉANCE QUE LE CODE PEUT VALIDER LA FAUTE.** Deux fois dans cette série : la lecture d'un code d'erreur écrite de mémoire à la racine du corps au lieu de `message.code`, avec un test posant la même enveloppe imaginée — cohérents entre eux, faux tous les deux (D219) ; et le test de l'assistant assertant l'URL poussée contre le contrat de l'**API** au lieu de celui de l'**URL**, vert depuis la livraison sur un budget silencieusement jeté (D228). **Toute forme de donnée qui traverse une frontière (HTTP, URL, base, fichier) se relève d'un appelant existant qui la lit déjà, ou se MESURE.**

⚠ **UN DÉFAUT PEUT NAÎTRE DE LA RENCONTRE DE DEUX CORRECTIONS.** Le CSS déclarait une animation, le JSX était correct, et l'animation n'a jamais joué parce que React réconciliait un nœud stable. Ni la relecture du CSS ni celle du JSX ne pouvait le voir. **Quand un effet dépend du cycle de vie d'un nœud, la garde mesure l'IDENTITÉ DU NŒUD**, pas une classe ni un style — jsdom ne calcule pas les animations. (D222)

⚠ **UNE GARDE PEUT ÊTRE TAUTOLOGIQUE.** Après extraction d'un cœur commun, un test « A rend la même chose que B » ne peut plus rougir si B appelle A. Il se lit comme une garde anti-divergence et n'en est pas une. Retirée **par écrit**, remplacée par une garde de SOURCE. (D223)

⚠ **VÉRIFIER LA PRÉMISSE AVANT DE CODER LA DEMANDE.** Une consigne partait de « ne pas perdre la recherche par mots-clés » ; vérification faite, cette fonctionnalité **n'existait nulle part** — ni dans le contrat public, ni dans le service, ni en base. Coder dessus aurait produit une correction sans objet et masqué la régression réelle. Quand une consigne s'appuie sur un existant, **mesurer cet existant fait partie de la consigne**. (D231)

### Harnais de neutralisation — cinq exigences (D223, D224, D226)

- ⚠ **SURVIVRE À UN SIGNAL, pas seulement à une exception.** Un `finally` ne s'exécute pas quand le processus est tué. Deux fois, un harnais interrompu a laissé un fichier **sciemment cassé** dans l'arbre. Exigé : sauvegarde disque **avant** mutation, restauration au démarrage, purge en fin de campagne.
- ⚠ **CHAQUE CIBLE DÉSIGNE SON FICHIER DE TEST.** Sans lui, la campagne dépassait quinze minutes et se faisait tuer. **Une campagne qu'on n'ose plus lancer ne mesure plus rien.**
- ⚠ **L'ASSERTION DE COMPTAGE PROTÈGE DU FAUX POSITIF INVERSE.** Une cible visait UNE occurrence d'un rendu qui en a DEUX : neutraliser une seule branche aurait laissé l'autre produire le bon rendu, et la garde aurait **paru mordre sans rien mesurer**.
- ⚠ **APRÈS TOUTE INVERSION DE DÉCISION, RELANCER LES CAMPAGNES AVANT DE CROIRE LES COMPTEURS DE TESTS.** Une décision inversée périme les cibles qui mesuraient l'ancien comportement. Une suite verte ne prouve rien si les gardes qui la surveillaient ne mordent plus. Arrivé **deux fois**.
- ⚠ **UNE GARDE SUR DU CODE PARTAGÉ SE VÉRIFIE DANS TOUS SES CONSOMMATEURS.** Neutraliser dans `@zwadj/ui` doit faire rougir **client ET pro**. Un rouge d'un seul côté signale que l'autre ne mesure rien.

- ⚠ **UNE ANCRE DE CIBLE SE REVÉRIFIE À CHAQUE REFONTE DU BALISAGE.** Un lot visuel a déplacé un `<p style=…>` vers un `<span>` : l'ancre ne trouvait plus rien, la campagne s'arrêtait sur `ERREUR DE SCRIPT` — comportement voulu — mais **quatre cibles suivantes n'ont pas été jouées**. Une campagne partiellement jouée n'est pas une campagne verte.
- ⚠ **UNE GARDE QUI SE CONTENTE D'UN EXEMPLE CESSE DE MESURER DÈS QU'IL Y EN A DEUX.** Un `toMatch(/lang="ar"[^>]*dir="rtl"/)` écrit quand la page comptait UN passage arabe est resté VERT sous neutralisation le jour où elle en a compté trois : les deux autres le satisfaisaient. Ces gardes s'écrivent en règle **universelle** — *tout* élément qui déclare `lang` déclare sa direction — et se comptent, elles ne se cherchent pas.
- ⚠ **UNE CIBLE DEVENUE SANS OBJET SE RÉORIENTE OU SE RETIRE, PAR ÉCRIT.** Quand le décor est passé d'un composant à une image, « le décor disparaît » a cessé d'être la faute possible : c'est devenu « le décor se met à parler » (perte de `alt`). Quatre cibles ont été retirées avec le code qu'elles mesuraient, une réorientée, une ajoutée.
## À NE PAS faire
- Ne pas élargir le périmètre au-delà du MVP demandé, même si le design fourni montre plus.
- Ne pas introduire de dépendance lourde sans justification (pas de Redis, pas d'app admin, pas de 2ᵉ provider de paiement au MVP).
- Ne pas coder les chemins d'argent sans tests + demande de revue.
- ⛔ **NE PAS LIVRER E3 (paiement Chargily) COMME UN LOT ORDINAIRE.** La méthode est **durcie (D126)** et décrite dans `ZWADJ_CONTINUITE.md` → « ⛔ E3 — MÉTHODE RENFORCÉE » : **cinq sous-lots** avec arrêt franc entre chacun, cadrage listant les **modes de défaillance** avant tout code, **toute garde neutralisée pour prouver que son test mord**, **aucune valeur écrite de mémoire** (charges utiles Chargily capturées du bac à sable, aucun montant en dur), **aucune référence gelée** sur le chemin de l'argent (la seule valeur acceptable est zéro), webhook **mince** (signature → dédup → file → 200 : un handler lent fait retenter Chargily et multiplie les courses), **livraison sombre** derrière un drapeau. Un mode de défaillance non listé au cadrage **ne se code pas**.
- Ne pas copier le flux "instant-book" du prototype : toujours request-to-book.
- ⛔ **NE JAMAIS LIVRER DU CODE DONT LA PROVENANCE N'EST PAS CERTIFIABLE.** Du code non retracé est apparu **deux fois** dans l'arbre de travail (D232). Devant ce cas : arrêter, le dire, ne pas emballer. Une note de livraison qui annonce « mesuré » sur du code d'origine inconnue est le défaut de D218 en pire. **Contrôle de fin de lot** : le diff livré ne doit contenir que des fichiers attendus, énumérés AVANT l'emballage.

- ⛔ **NE PAS PRENDRE UN NUMÉRO DE DÉCISION DANS UN RÉSUMÉ DE SESSION.** Deux décisions ont été écrites `D233` et `D234` dans **sept fichiers livrés** alors que ces numéros appartenaient déjà à la campagne SOLID/Strategy. Repéré seulement en mettant `ZWADJ_CONTINUITE.md` à jour. Un numéro se prend en lisant le **dernier attribué dans ce fichier**, jamais ailleurs.
## État des lots — au 20/08/2026

| Lot | Objet | État |
|---|---|---|
| R2a→R2e | Correctifs CSS, panneau gauche, flèches RTL, focus, prestations | ✅ livrés |
| R3 | Téléphone mobile, normalisation unique partagée | ✅ livré, **base vérifiée** |
| Q0 | Cadrage machine à états + décisions arbitrées (D159→D167) | ✅ arbitré |
| Q1 | Canal de remise `quotes.sent_via` (ex-C1b) | ✅ livré et mesuré |
| Q2 | Basculement : `SENT` retiré, `convert()` accepte `DRAFT`, entonnoir sur `sentVia` | ✅ **livré, intégration VERTE sur base réelle** |
| Q3a | `CANCELLED` absorbe `DECLINED`, sans reprise de données | ✅ **livré, intégration VERTE** |
| ~~Q3b~~ | ~~Immuabilité en base + écrasement de `revise()`~~ | ❌ **ANNULÉ — décision A** |
| Q4 | Migration : `DROP COLUMN valid_until` | ✅ **livré** — ⚠ non exécuté en bac à sable |
| Q5 | Verrou exclusif à l'ouverture | ⏸ **REPORTÉ (D193)** — le verrou n'a personne à exclure |
| E3a | Cadrage paiement + modes de défaillance + drapeau `PAYMENTS_ENABLED` | ✅ livré et mesuré |
| E3b (socle) | Port de paiement, `Payment` en `PENDING`, décision pure | ✅ livré et mesuré |
| E3b (Chargily) | Adaptateur, session de règlement | ✅ **livré et mesuré** — 12/12 gardes neutralisées |
| E3c | Webhook : signature, déduplication, mise en file (`pg-boss`) | ⏸ **EN PAUSE** (arbitrage Ko, 17/08) |
| Nettoyage dépôt | Secrets hors `.env.example`, résidus, cohérence env | ✅ livré et mesuré |
| Flux Pro par étapes | `walkin-journey` en assistant exclusif | ✅ livré — 14/14 gardes |
| Accueil Client | 8 sections, SSR, sans JavaScript | ✅ livré — 11/11 gardes |
| Retouches visuelles | Rail vertical, devis, carte, pied de page | ✅ livré et mesuré |
| Assistant de filtres | 4 étapes → `/salles`, route dédiée | ✅ livré — 9/9 gardes |
| `availableOn` | Annotation par date, exclusion situation B | ✅ **livré et mesuré** — 10/10 + 12/12 gardes |
| SEO `robots`/`canonical` | Règle `isVariant` + câblage 9 pages | ✅ **livré et mesuré** — 9 tests |
| Point B — 404 | Front localisé + racine + API `ROUTE_NOT_FOUND` | ⚠ **livré ; front JAMAIS rendu en test** |
| Point D — chrome partagée | `@zwadj/ui/journey`, pro + client | ✅ **livré et mesuré** — 7/7 gardes |
| Exclusion situation B | Salles sans créneau retirées si date demandée | ⚠ **zip livré ; application NON confirmée** |
| D227 — hors horizon | Refus explicite, code distinct | ⛔ **NON livré** |
| D228 — `maxPrice` | Budget silencieusement jeté | ⛔ **NON livré — DÉFAUT ACTIF** |
| Lot ③ — assistant | Mode de `/salles`, `?guide=`, accueil 3 champs | ⛔ **NON livrable (D232)** |
| **Campagne SOLID/Strategy** | S0→S7 + R4 (défaut de production) + R5 | ✅ **livrée et mesurée** — 74 gardes rouges, 12 campagnes, intégration 424/424 |

⚠ **`C1` est ambigu** : il désigne « Flux C, lot 1 — plages de visite » (livré).
Les lots de machine à états sont `Q0`→`Q5`. Correspondance en tête de la section
« Machine à états du devis » de `ZWADJ_CONTINUITE.md`.

### ⚠ DÉCISION A — le versionnement est CONSERVÉ

Pas de déclencheur SQL, pas d'écrasement de `revise()`. Seul l'AFFICHAGE de
l'historique quitte l'écran pro. Conséquence : `chain_id`, `version` et
`parent_quote_id` sont **ACTIVES** — D165 les condamnait, elle est **révoquée**
pour ces trois colonnes. Q4 s'est réduit à `valid_until` seule.

⚠ **D163 reposait sur une prémisse FAUSSE** : elle disait que `Booking` référence
le devis « sans recopier les montants ». Le schéma dit le contraire —
`bookings.base_price_cents` et suivantes sont commentées « *snapshots copiés du
devis à la création* », et E3 facturera sur la RÉSERVATION. Écraser un devis ne
pouvait donc pas changer ce qui serait facturé.

### Statuts LEGACY du devis — lus, jamais écrits

`SENT`, `SUPERSEDED` (Q2) et `DECLINED` (Q3a). **Aucune reprise de données** :
les basculer réécrirait l'histoire pour un gain cosmétique. Conséquence
exécutoire : **l'entonnoir compte `CANCELLED` ET `DECLINED`**
(`QUOTE_LOST_STATUSES`) — sans quoi le compteur des affaires perdues retomberait
à zéro le jour du déploiement, sans erreur et sans test rouge.
⚠ `BookingStatus.DECLINED` n'est **pas** concerné : refuser une demande de
réservation reste un acte distinct.

## Leçons de méthode — répétées, donc consignées

### Campagne DIP/ISP/SRP (S8 → S10b) — 24 au 28/08/2026

- ⛔ **LES HARNAIS VIVENT DANS `neutralisation/`** et se lancent **depuis la racine** :
  `python3 neutralisation/neutralize-xxx.py`. Aucun ne se repère par `__file__` — tous
  leurs chemins sont relatifs au **dossier courant**. Chacun porte une garde qui refuse
  de démarrer si `pnpm-workspace.yaml` n'est pas là, sans quoi un `cd neutralisation`
  produirait « ERREUR DE SCRIPT : 0 occurrence(s) », c'est-à-dire un message qui envoie
  chercher un défaut de code là où il n'y a qu'un dossier.
- ⛔ **UN HARNAIS SE NOMME `neutralize-<lot>.py`, SINON IL NE SERA JAMAIS JOUÉ (D272).**
  `lancer-campagnes.py` ne découvre que ce motif. Un harnais nommé autrement vit dans
  `neutralisation/`, se lance à la main, et n'est plus jamais rejoué par le tri — ni par
  personne. ⚠ Les autres scripts du dossier sont des **instruments** de diagnostic, pas
  des campagnes : `sonde-horloge.py` s'invoque explicitement et ne rend aucun compte de
  gardes mordues.
- ⛔ **UNE CIBLE DONT UNE MESURE NE PEUT PAS ROUGIR EST MUETTE PAR CONSTRUCTION.**
  Trois fois dans cette campagne : une mutation de l'ADAPTATEUR déclarée aussi sur la
  mesure du SERVICE (qui bouchonne le port et ne voit rien) ; une mesure pointée sur un
  fichier NON exempté pour tester un plafond qui ne s'y applique pas ; une cible qui
  neutralisait un `if` dont aucune branche ne se déclenche en régime nominal.
  **Avant d'écrire une cible : par quel chemin cette mesure voit-elle la mutation ?**
- ⛔ **`toContain` NE MESURE PAS UNE LISTE.** Une garde assertait
  `toContain("DRAFT")` ; la neutralisation posait `["DRAFT", "CONVERTED"]`, qui contient
  bien « DRAFT ». **Verte.** On compare à l'AUTORITÉ (`toEqual([...quoteAllowedFrom(…)])`),
  jamais à une liste écrite dans le test.
- ⛔ **ÉLARGIR UN TYPE DE RETOUR NE CASSE JAMAIS UN APPELANT** — seul un type rétréci le
  fait. Un découpage d'interfaces peut donc se défaire méthode par méthode, en silence,
  sans qu'aucune porte ne bouge. Ce qui le tient, ce sont des assertions
  `Identiques<ReturnType<typeof crochet>, Interface>` portées par `tsc`, pas par vitest.
- ⛔ **UNE GARDE STATIQUE CHERCHE L'IDENTIFIANT, PAS L'APPEL.**
  `import { useVenues as useVenueCrud }` laisse le site d'appel intact : chercher
  `useVenues(` ne voit rien, chercher `\buseVenues\b` attrape l'import comme l'appel.
- ⛔ **UNE ASSERTION CONDITIONNELLE NE MESURE RIEN.** `if (mock.calls.length > 0) expect(…)`
  est vert quand le chemin a marché, vert quand il a échoué, vert toujours. Écrite puis
  retirée dans le spec de `QuotesService` — avec la raison consignée à la place, là où le
  lecteur cherchera le test manquant.
- ⛔ **UN RELEVÉ NE DOIT JAMAIS SORTIR EN VERT.** `UPDATE_CONSOLE_CEILINGS=1` désactive
  ENTIÈREMENT la garde des sorties console. Une variable restée dans le shell rend toutes
  les portes suivantes vertes **sans rien mesurer** — vécu. Le mode relevé lève désormais,
  et un **pré-vol inversé** dans le harnais abandonne si un run de relevé sort en 0.
- ⚠ **UN PLAFOND SE RELÈVE SUR PLUSIEURS PASSES.** Le compte d'avertissements `act(…)`
  FLOTTE : le même fichier a rendu 1 puis 0, un autre 3 puis 4, sans qu'une ligne bouge.
  Une égalité stricte sur une mesure qui flotte fabrique une suite qui rougit au hasard.
  On gèle le **maximum observé**, dépasser fait tomber, descendre s'imprime.
- ⚠ **`satisfies`, JAMAIS `as unknown as`, pour un double de port.** Avec `as`, un double
  incomplet ou désynchronisé passe ; avec `satisfies`, TypeScript exige les signatures.
  ⛔ Et le cast n'est PAS de la paresse quand la cible est Prisma : ses délégués sont des
  génériques surchargés, `vi.fn()` ne leur est pas assignable. **C'est l'argument du port**,
  pas un défaut de discipline. Le cast reste légitime dans le spec d'un ADAPTATEUR, dont
  le métier est de parler à Prisma et dont on mesure la charge utile.
- ⛔ **UN DOUBLE `vi.fn()` SANS PARAMÈTRE DÉCLARÉ REND `mock.calls[0][0]` INCOMPILABLE**
  (`TS2493`, tuple vide). Chaque bouchon déclare sa charge et son retour.
- ⛔ **UN SQL EXTRAIT SE NETTOIE AVANT D'ÊTRE DÉCOUPÉ.** Un extracteur coupait sur `;`
  puis retirait les commentaires : un point-virgule DANS une phrase française scinde le
  bloc, le fragment perd son `--`, et PostgreSQL répond `syntax error at or near "les"`.
  ⚠ **Et l'extracteur avait été vérifié — avant qu'on modifie le fichier qu'il lit.** Une
  mesure faite une fois ne couvre pas l'entrée qu'on change ensuite.
- ⛔ **UNE FUITE DE CONNEXION DANS UN TEST NE SE VOIT PAS DANS CE TEST** — elle se voit
  dans le suivant, et on cherche au mauvais endroit. Tout client `pg` brut ouvert par un
  spec doit avoir un chemin de fermeture appelé en `finally`, y compris quand l'assertion
  qui précède lève **par conception**.
- ⛔ **`migration-non-empty.int-spec.ts` SE RETARGE À CHAQUE MIGRATION AJOUTÉE.** Il
  applique tout SAUF la dernière, puis vérifie qu'elle n'est pas là. Ajouter une migration
  sans suivre sa sonde le fait échouer sur l'avant-dernière — cinq changements de sonde en
  six lots. Le semis doit produire l'état sur lequel la NOUVELLE migration peut échouer,
  sinon elle s'applique sur du vide et le test est vert et muet.
- ⚠ **`import.meta` : la leçon existait déjà et j'ai récidivé.** Écrit dans un
  `int-spec`, il passe sous Vitest (SWC rend le fichier en ESM) et tombe en `TS1343` au
  typecheck. `__dirname` ferait l'inverse. On passe par `process.cwd()` **et on vérifie
  le chemin**, au lieu d'y croire.
- ⛔ **`noUncheckedIndexedAccess` : indexer par un CALCUL rend `T | undefined`**, même sur
  un tuple `as const`. `TIERS[TIERS.length - 1]` ne compile pas ; `Math.max(...TIERS)` si,
  et dit mieux ce qu'on veut.
- ⚠ **UN REFACTORING QUI EMPORTE UN AVERTISSEMENT EN EMPORTE LA RAISON D'ÊTRE.** Le
  découpage de `VenueProClient` a failli effacer « Topologie A2, volontairement
  asymétrique — NE PAS harmoniser ». Relire ce qu'on remplace, pas seulement ce qu'on écrit.

### Lot S11-a (SRP sur `BookingsService`) — 28/08/2026

- ⛔ **CE QUI COMMANDE UN DÉCOUPAGE, C'EST OÙ LA MESURE POURRA VIVRE.** `BookingsService`
  n'a **aucune spec unitaire** : sa seule mesure demande un PostgreSQL réel. Toute cible
  posée dans ce service était donc muette par construction. Le choix n'a pas été « quel
  découpage est le plus élégant » mais « lequel rend ces décisions neutralisables en
  millisecondes ». **Modules purs**, pas un septième `as unknown as PrismaService` (D258).
- ⛔ **UN LOT DE SRP SE MESURE AVANT ET APRÈS, SINON IL S'AUTO-DÉCERNE SON RÉSULTAT.**
  Premier jet : l'appel écrit en ligne dans `create` **faisait grossir la méthode**
  (136 → 138 lignes exécutables). Le lot ratait son objet et rien ne l'aurait dit. La
  traduction du verdict est passée dans une aide privée — même idiome que la méthode
  voisine — et `create` est descendu à **123**. **On mesure, on n'annonce pas.**
- ⚠ **UN CHIFFRE DE BACKLOG PEUT ÊTRE UNE ESTIMATION.** « `create` pèse 200 lignes sur
  729 » : la mesure dit **189**. Sans gravité ici, mais un lot suivant qui part de ce
  chiffre part d'à peu près. **Recompter fait partie de la reprise.**
- ⛔ **UNE CONSIGNE DE DÉCOUPAGE SE VÉRIFIE CONTRE LES DÉCISIONS DÉJÀ PRISES.** Le backlog
  proposait de déplacer les aides de notification **dans** `booking-notifications.service.ts`.
  Appliqué tel quel, cela obligeait le service à **injecter son propre destinataire** —
  c'est-à-dire à défaire **D63**. Un module pur voisin satisfait les deux. C'est D231
  (« vérifier la prémisse avant de coder la demande ») appliqué à une consigne d'archi.
- ⛔ **DEUX `null` DE SENS DIFFÉRENT NE VOYAGENT PAS DANS LA MÊME VARIABLE.** Ici,
  « créneau introuvable » et « ignore les heures du créneau » (SINGLE_SLOT). Les
  confondre coûte un jour de calendrier. Le second voyage dans un **drapeau nommé**.
- ⛔ **UN ORDRE DE REFUS EST UNE RÈGLE MÉTIER, ET IL SE MESURE SUR UN CAS DOUBLEMENT
  FAUTIF.** Un test qui n'enfreint qu'une règle à la fois est vert quel que soit l'ordre.
  Ici : capacité (400) AVANT date (409) — intervertir enverrait le client changer de
  date au lieu de réduire sa table.
- ⛔ **UNE GARDE DE FUSEAU EST MUETTE SUR UN SERVEUR EN UTC.** Une colonne `@db.Date` lue
  avec `getFullYear()` recule d'un jour à l'ouest de Greenwich — et l'intégration, en
  UTC, ne le voit **jamais**. La spec **épingle `process.env.TZ`** (mesuré : Node 22 le
  prend en compte à chaud) et le **restaure en `afterAll`**, sinon elle contamine ses
  voisines.
- ⚠ **UNE GARDE DE SOURCE PEUT ROUGIR SUR UN COMMENTAIRE.** Le commentaire qui explique
  pourquoi un import a disparu **épelait le jeton** que la garde interdit. Reformulé en
  toutes lettres, avec la raison écrite sur place : une garde qui accuse à tort finit
  ignorée.
- ⛔ **UN RENOMMAGE DE NEUTRALISATION NE DOIT PAS ÊTRE UN PRÉFIXE DU NOM CHERCHÉ**, sinon
  `toContain` reste vert sans rien mesurer. Même famille que la leçon `toContain` de S10b.
- ⚠ **UN ATTENDU ÉCRIT DE MÉMOIRE SE FAIT ENCORE ATTRAPER, MÊME PETIT.** `"Yasmine  Belkacem"`
  contre `"Yasmine   Belkacem"` : `trim()` ne nettoie que les **bords**. La mesure a
  tranché, l'attendu a suivi.
- ⛔ **UN IMPORT MORT PEUT ÊTRE UN PANNEAU INDICATEUR (D263).** Trois imports signalés
  par `eslint` dans le même fichier : deux étaient du mort pur, le troisième
  (`BookingStatus`) désignait un défaut OUVERT — un refactoring l'avait dépouillé de son
  consommateur en remplaçant, ailleurs, l'énumération par une **chaîne littérale sur le
  chemin de l'argent**. **Avant de supprimer un symbole inutilisé, demander où il était
  utilisé avant.** Et s'il désignait quelque chose, écrire le report AVANT de couper.
- ⛔ **UNE EXEMPTION PEUT ÊTRE LA PREUVE QU'UNE GARDE N'EXISTE PAS (D263).** Un
  `eslint-disable` signalé « inutile » n'est pas forcément du ménage : ici, la règle
  exemptée demandait l'information de TYPES et n'était **pas activée du tout**. La
  directive faisait taire un silence. Vérifier la config avant de conclure au ménage.
- ⛔⛔ **« NON MESURÉ » N'EST PAS « NON LANÇABLE » — ET CE LOT A ÉTÉ LIVRÉ ROUGE (D262).**
  Le typecheck API est non concluant sur les FORMES Prisma. Ce constat a été étendu, sans
  que personne l'écrive, en « le typecheck ne dit rien » — et `tsc` n'a **pas été lancé
  du tout**. L'erreur qui a cassé la porte chez Ko était présente en bac à sable **depuis
  le début**, noyée dans 586 erreurs de talon. **On lance l'outil, PUIS on trie.** Deux
  gestes qui rendent le tri possible : renforcer le talon (index de délégués sur
  `PrismaClient` : 586 → 151 erreurs) et **restreindre la mesure aux fichiers sans import
  Prisma** (zéro bruit).
- ⛔ **`Parameters<typeof f>` SUR UNE FONCTION GÉNÉRIQUE EFFACE LE PARAMÈTRE DE TYPE** et
  le remplace par sa **contrainte**. Une aide de test qui s'en sert reçoit `S = Contrainte`
  et perd tout champ concret. **On nomme le type d'entrée exporté par le module**, on ne le
  reconstruit pas depuis la signature.
- ⛔ **UNE FAUTE DE TYPE PEUT ÊTRE TOTALEMENT INVISIBLE À VITEST.** Vérifié, pas supposé :
  sous la mutation qui retire le paramètre de type, la spec reste **15/15 verte** — rien ne
  change à l'exécution. **Toute garde qui ne vit que dans les types exige une mesure `tsc`
  dans le harnais**, sinon elle est muette par construction.
- ⛔ **VÉRIFIER L'ÉTAT DES PORTES À L'ENTRÉE, PAS SEULEMENT À LA SORTIE.** La porte **lint
  était déjà rouge** dans l'archive reçue (trois imports morts laissés par S10b), et
  `AGENTS.md` du dépôt était **périmé de cinq sections**. Deux constats qu'un lot ne
  produit pas mais qu'il doit **relever et rapporter**, sinon il les endosse.

### Campagne SOLID/Strategy (S0→S7, R4, R5) — 20 au 22/08/2026

- **Vérifier que le filet EXISTE avant de s'y suspendre.** Deux lots ont différé la moitié de leur preuve à l'intégration ; cette moitié est revenue muette (D236). Une preuve différée n'est pas une preuve.
- **Un compte de remplacements asserté prouve que la mutation a EU LIEU, pas qu'elle CHANGE quelque chose.** Deux cibles de S5a-0 remplaçaient une expression par une autre de même valeur : comptes justes, mutations inertes, gardes vertes.
- **Une garde qui se relit elle-même ne mesure rien** (D241). Une matrice qui recalcule ses attentes depuis la source qu'elle teste est verte par construction.
- **Une cible sans mesure n'est pas un succès** (D248).
- **Vitest transpile sans typer.** Une spec peut être verte et ne pas compiler : ne jamais conclure d'un vitest ciblé sans repasser le typecheck.
- **`str_replace` insère des LF nus dans un fichier CRLF**, et un fichier neuf naît en LF. Normaliser puis mesurer en octets, dans le fichier ET dans l'archive.
- **Un motif multi-lignes de harnais doit porter `\r\n`**, sinon il ne matche rien — et seul le compte asserté le dit.
- **Sous Windows, `subprocess` ne résout pas `pnpm.cmd`** : passer par `shutil.which`, et imposer `encoding="utf-8"` (cp1252 casse sur la sortie de vitest).
- **`pgrep -f <motif>` se voit lui-même** quand le motif est dans sa propre ligne de commande.
- **Un `finally` ne s'exécute pas quand le processus est tué.** Vu deux fois de plus pendant cette campagne : contrôler l'intégrité de l'arbre APRÈS chaque campagne, pas seulement à la fin.

⚠ **Ne jamais écrire une valeur de mémoire.** Quatre occurrences dans une seule
session : `capacity_min` (supprimée par `20260723090000`), `quotes.updated_at`
(n'existe pas), `venues.owner_id → users` (référence en réalité
`pro_profiles(id)`, D149), et le libellé « Enregistrer la date » (le vrai est
« Enregistrer sans bloquer »). ⚠ **Lire une migration ancienne n'apprend pas
l'état actuel du schéma** — lire `schema.prisma`, ou la base.

⚠ **Un audit de livraison assertit sur les DÉCLARATIONS, commentaires retirés.**
Trois fois une garde a rougi sur le commentaire qui expliquait justement
pourquoi la valeur interdite n'était pas employée (`--accent-ink`, `/compte`,
le rose de la maquette). Retirer les commentaires avant d'assertir — **et
vérifier séparément que l'explication est bien restée**.

⚠ **Vérifier les fins de ligne en OCTETS.** `grep -c $'\r$'` a annoncé « LF »
sur dix fichiers réellement en CRLF, et `read_text()` en Python traduit CRLF→LF
en silence — ce qui a fait passer une vérification de forme à côté d'un titre
coupé en deux. Compter `\r\n` contre `\n` sur les octets.

⚠ **Un fichier neuf naît en LF** : le normaliser avant livraison. Détecté deux
fois par la campagne de neutralisation, pas par relecture.

⚠ **Une garde qui ne mord pas ne prouve rien.** Un test comptait les
`svg[aria-hidden]` : lucide pose cet attribut **tout seul**, l'assertion ne
pouvait pas rougir. Un autre affirmait un compteur **avant** que l'action
mesurée soit rendue. Les deux étaient verts et vides.

### Session des 23 et 24/08/2026 — 404, `maxPrice`, hors horizon, décor

- **Un test de RENDU ne mesure pas qu'on ATTEINT la page.** Deux pages 404 correctes n'ont jamais été rendues pour un visiteur ; monter le composant et lire son titre serait resté vert tout du long. Quand ce qui a cédé est du **routage**, la garde porte sur des noms de fichiers et des chemins.
- **Chercher une phrase par sous-chaîne dans une réponse HTTP, c'est aussi chercher dans ses SCRIPTS.** Une note de livraison a annoncé « layout complet » sur une page dont le HTML rendu était **vide** : la phrase se trouvait dans la charge de streaming. Retirer `<script>`, `<style>` et `<template>` avant d'extraire, et **valider l'extracteur sur une page témoin**.
- **Une valeur « très loin » finit par entrer dans un domaine refusé.** La fixture `2099-06-02`, choisie pour n'être jamais passée, est devenue exactement ce que le nouvel horizon refuse, et faisait tomber trois tests qui ne parlaient pas d'horizon. Les bornes de test se **dérivent** de l'horloge figée et de la constante du code.
- **Arrondir APRÈS avoir testé fait mentir le test.** Deux boîtes exactement jointives sont ressorties chevauchantes d'un demi-pixel : le calcul disait « libre », la sortie disait le contraire. On teste les coordonnées qu'on écrira.
- **Un tirage AVEC REMISE échantillonne un vocabulaire, il ne le couvre pas.** Deux mots n'apparaissaient nulle part, et rien à l'écran ne le disait. Paquet battu, distribué **sans remise**.
- **Indexer une taille sur la mauvaise dimension vide un canevas.** Corps calculés sur la hauteur d'un canevas portrait : 13 mots posés sur 56, le reste refusé faute de largeur. Suivre la **plus petite** dimension.
- **`str.rstrip("0")` sur un nombre rabote aussi les zéros de POSITION.** `100` est devenu `1` sur tous les glyphes d'une image : lettres méconnaissables. Un arrondi s'écrit avec une condition, pas avec un `rstrip`.
- **Une garde peut mesurer la DOCUMENTATION du fichier qu'elle teste.** `expect(svg).not.toContain("<text")` rougissait sur le commentaire expliquant justement pourquoi le fichier n'en utilise pas. Retirer les commentaires avant d'assertir — la règle existait pour les audits de livraison, elle vaut aussi pour les tests.
- **Un bloc inséré sans fin de ligne finale DÉTRUIT la ligne suivante.** La vérification de non-perte l'a attrapé (50 lignes annoncées perdues) avant toute écriture. Une faute qu'on peut rendre impossible se rend impossible : l'outil d'insertion l'assertit désormais.
- **Une contrainte de rendu peut rendre une demande contradictoire, et il faut le dire.** « Une image unique » + « rien derrière le rectangle central » ne tenaient ensemble qu'à condition de calibrer le vide pour les deux aspects extrêmes ; un vide étroit laissait des mots sous les boutons sur mobile, un vide large vidait l'écran de bureau.
- **Retirer un module retire ses gardes, et c'est le résultat attendu.** Seize tests ont disparu avec le générateur qu'ils mesuraient ; les garder aurait voulu dire garder le code. Un compteur de tests qui BAISSE n'est pas une régression s'il est expliqué.
### Notes d'environnement

⛔ **CES NOTES DÉCRIVENT LE BAC À SABLE WEB, PAS TOUS LES POSTES (D268).** Elles
ont été écrites depuis un environnement sans accès à `binaries.prisma.sh` et
sans PostgreSQL, et leur portée n'était pas déclarée — un lecteur les prenait
donc pour des propriétés du DÉPÔT. **Mesuré le 30/08/2026 depuis Claude Code sur
le poste de Ko** : le vrai client Prisma est présent dans
`apps/api/src/generated/prisma/` (47 fichiers, `BookingStatus` en union de
littéraux, identique à `@zwadj/types`), `pnpm --filter @zwadj/api typecheck`
sort en **0**, et `test:int` rend **432/432 sur 35 fichiers** contre un
PostgreSQL réel. ⚠ **La conséquence dépasse Prisma** : c'est D262 une seconde
fois — un empêchement d'environnement se recopie de rapport en rapport bien
après avoir disparu, et couvre exactement ce qu'il prétendait signaler. **Une
note d'environnement porte le nom de l'environnement mesuré, ou elle ment.**

#### Bac à sable web (Claude via archives)

- **`prisma generate` fonctionne HORS LIGNE avec Prisma 7** (générateur `prisma-client`, TypeScript natif) : un `DATABASE_URL` factice suffit, aucun binaire de moteur à télécharger. La porte typecheck API est donc **atteignable** — l'affirmation contraire, faite en début de session du 19/08, était fausse.
  ⚠ **CORRIGÉ LE 23/08/2026 : ce n'est PAS vrai dans tous les bacs à sable.** Mesuré : `prisma generate` échoue en `Failed to fetch the engine file at https://binaries.prisma.sh/… — 403 Forbidden`, ce domaine n'étant pas autorisé en sortie et les moteurs n'étant pas embarqués dans le paquet npm. **Sans client généré, AUCUNE spec de l'API ne se collecte.** Contournement employé : un **talon** dans `apps/api/src/generated/` (répertoire ignoré par git, absent de toute archive, écrasé au premier `prisma:generate`), exposant les types plus deux valeurs (`Prisma.Decimal`, `Prisma.PrismaClientKnownRequestError`). ⚠ Conséquence à déclarer : les **tests unitaires API sont mesurés**, le **typecheck API ne l'est PAS** — types du talon volontairement lâches. Le déclarer NON MESURÉ, jamais vert. Pour lever la limite : autoriser `binaries.prisma.sh` en sortie.
- **`import.meta` est une erreur de compilation côté API** (`TS1343`, tsconfig CommonJS) alors qu'il passe côté client. Pour lire un fichier depuis un test API : `process.cwd()`, vitest s'exécutant depuis `apps/api`.
- **Les scripts de harnais sont en CRLF** comme le reste du dépôt : toute édition programmatique doit le relever **en octets**, pas le supposer.
- **Compteurs de la dernière mesure certifiable** : API **482/44** · client **239/18** · pro **344/27** · i18n **1090 = 1090**.
  ⚠ **Au 24/08/2026** : API **560/50** · client **264/19** · i18n **1093 = 1093**.
  ⚠ **Au 28/08/2026** : API **602/53** · api-client **36/3** · client **287/20** ·
  pro **347/28** · intégration **432/35**. Base de départ API relevée AVANT le lot (**556/50**) pour que le « +4 » mesure quelque chose.
  ⚠ **Après S11-a (28/08/2026, D261)** : API **638/55**, base d'entrée relevée à
  **602/53** avant toute modification.
  ⚠ **`pnpm install --ignore-scripts` SUFFIT pour les specs unitaires API** (772 paquets,
  ~22 s) : argon2 et sharp ne sont pas requis à la collecte. `prisma generate` reste en
  **403** sur `binaries.prisma.sh`, y compris avec `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`
  — mesuré, ce contournement ne lève QUE la vérification de somme, pas le téléchargement.
  Le talon de `apps/api/src/generated/` reste donc obligatoire, et le **typecheck API
  NON MESURÉ**. ⚠ **Vrai DANS CE BAC À SABLE UNIQUEMENT** — voir l'encadré en tête
  de section : sur le poste de Ko le client est réel et le typecheck sort en 0.
  ⚠ **La porte LINT, elle, est mesurable en bac à sable** et n'était pas relevée jusqu'ici.
- ⛔ **Jamais exécutés en bac à sable** : intégration (PostgreSQL réel), e2e, axe-core, `pnpm build`.
  ⚠ **CORRIGÉ LE 23/08/2026 : `next build` A ÉTÉ EXÉCUTÉ**, plusieurs fois, ainsi que `next start` — c'est ce qui a permis de mesurer les statuts HTTP réels des 404 et de prouver le soft-404. Restent jamais exécutés : intégration (PostgreSQL réel), e2e, axe-core.

#### Poste de Ko (Claude Code local) — mesuré le 30/08/2026

- **Client Prisma RÉEL**, `test:int` et `typecheck` tous deux **exécutables et verts**.
  Les deux limites majeures du bac à sable web ne s'y appliquent pas.
- ⛔ **La console est en cp1252 et faisait LEVER tous les harnais.** Mesuré : le
  premier `✓` imprimé rend `UnicodeEncodeError: '✓' … maps to <undefined>`, avec
  une trace Python qui ressemble à un défaut de harnais — alors que le pré-vol
  venait de passer. **Corrigé pour tout le parc le 30/08/2026 (D268)** : chaque
  script reconfigure `sys.stdout`/`sys.stderr` en UTF-8 dès l'import. Avant ce
  correctif, **aucun harnais n'avait jamais tourné sur ce poste.**
  ⚠ Tout nouveau script de `neutralisation/` doit porter ces trois lignes.
- ⚠ **`grep -c $'\r$'` MENT ICI.** Mesuré sur un fichier neuf réellement en LF :
  grep annonce « 229 lignes CRLF », la lecture en octets dit **0**. La règle du
  dépôt (« compter `\r\n` contre `\n` sur les OCTETS ») n'est donc pas un excès de
  prudence sur ce poste, c'est la seule mesure qui tienne.
- ⛔ **AUCUN COMPTEUR DE HARNAIS N'EST ÉCRIT ICI, ET C'EST DÉLIBÉRÉ (D268).**
  Ce document a porté « 18 scripts, 149 cibles » puis « 19 scripts, 165 cibles » ;
  les deux étaient faux au moment où on les lisait. Le nombre de cibles bouge à
  **chaque lot** — un chiffre figé sur une quantité mouvante se recopie de rapport
  en rapport bien après avoir cessé d'être vrai, et finit par couvrir exactement
  ce qu'il prétendait mesurer.
  ⇒ **Pour l'état courant, LANCER `python3 neutralisation/lancer-campagnes.py`**
  depuis la racine. Il joue les campagnes **en série** — jamais en parallèle,
  chacune MUTE des fichiers sources partagés — et rend le relevé complet
  (mordues / muettes / non mesurées, par campagne). Il ne sort en 0 que si tout
  a été joué ET tout a mordu. Compter ~40 minutes.
  ⚠ Il écrit ses journaux dans `.neutralisation-journaux/`, ignoré par git.
- ✅ **SUITE PRO : BORNÉE À `maxWorkers: 4`** (`apps/pro/vite.config.ts`, D270) — elle
  n'est **PAS** « intermittente », l'ancien cadrage prenait la CHARGE MACHINE pour le
  mode d'exécution. La clé **MORD** — démontré en la poussant à 1, qui ralentit la suite
  d'un facteur net — et ce qu'elle achète est le comportement **sous charge** : au repos,
  tous les modes sont verts. ⛔ **Les durées comparées ne sont pas recopiées ici** : la
  règle « relever l'état machine » ci-dessus les interdirait. Section **D270** de
  `ZWADJ_CONTINUITE.md`, avec la charge relevée devant chaque mesure.
  ⚠ Reste vrai : `pnpm test` (racine) et `pnpm --filter @zwadj/pro test` ne répartissent
  pas pareil — **ne jamais conclure sur un seul des deux**.
- ⛔ **UNE E2E INTERROMPUE LAISSE SES SERVEURS SUR 3100/3101** (et la mémoire) : la
  suivante meurt en 8 s sur « already used ». Purger node et les ports AVANT.
- ⛔ **LA PASSE COMPLÈTE DES PORTES DÉPASSE LA FENÊTRE D'UN APPEL** : la découper, et
  RELEVER la durée de chaque morceau pour dimensionner le suivant. Trois tâches tuées
  ont été lues comme des échecs de suite. ⚠ **Aucun ordre de grandeur n'est écrit ici** —
  « ce n'est qu'un ordre de grandeur » est l'argument qui a laissé passer les autres
  chiffres figés — celui-là même que D268 refuse plus haut dans cette section.
- ⛔ **LIRE LE CODE DE SORTIE DE LA COMMANDE, PAS DE SON ENVELOPPE** : `{ …; } > f` rend
  0 quand la commande dedans a rendu 1.

## Migrations — `prisma migrate dev` est INTERDIT

Le schéma repose sur des garanties SQL écrites à la main que Prisma ne sait pas
exprimer, donc ne voit pas, donc propose de SUPPRIMER à chaque `migrate dev` :

- `bookings_no_overlap_accepted_confirmed` (EXCLUDE GiST) — l'anti-double-booking ;
- `visit_bookings_no_double_confirmed` (unique PARTIEL, D59) — l'exclusivité des visites ;
- `pricing_rules_slot_belongs_to_venue` (FK COMPOSITE, B2) — une règle de prix ne peut
  pas pointer le créneau d'une autre salle ;
- `payments_one_paid_per_booking`, `cashback_one_active_per_booking`,
  `account_deletion_requests_one_pending`, `venues_public_list_idx` (uniques et index PARTIELS) ;
- `bookings_venue_timerange_gist`, `availability_blocks_venue_timerange_gist` (GiST) ;
- tous les `CHECK`.

Une seule exécution de `migrate dev` a déjà détruit la FK composite B2 en base de
développement. La migration générée échoue en cours de route (elle émet
`DROP INDEX` sur un index qui porte une contrainte), et ce qu'elle a supprimé
AVANT l'échec n'est pas rendu.

**Procédure : la migration s'écrit à la MAIN** dans
`apps/api/prisma/migrations/<horodatage>_<nom>/migration.sql`, puis
`pnpm --filter @zwadj/api run prisma:migrate` (= `migrate deploy`, qui applique
sans jamais générer). Tout objet créé en SQL doit recevoir sa déclaration Prisma
quand elle existe (`@@index`, `@@unique`) — sinon c'est une dérive permanente.
⚠ **MAIS un index PARTIEL ne reçoit AUCUN `@@index` nu.** Prisma ne sait pas
exprimer le `WHERE` : déclarer un `@@index` simple créerait un **second** index,
complet celui-là, que rien ne crée en base — une dérive dans l'autre sens. D116 a
livré un commentaire affirmant qu'un `@@index` existait alors qu'il n'existait
pas ; le commentaire disait l'inverse du code, et un relecteur l'aurait cru.

⚠ **`prisma migrate deploy` SORT EN SUCCÈS SANS RIEN APPLIQUER** quand le
schema-engine est absent (environnement hors ligne, `binaries.prisma.sh`
inaccessible). Base restée vide **et** code de retour zéro : le pire des deux
mondes. Toujours vérifier qu'une table attendue existe après une migration, ne
jamais se fier au code de sortie seul.

⚠ **Toute migration se teste sur une base NON VIDE (D123).** `test:int` fait
`DROP DATABASE` et rejoue tout sur du vide : une colonne `NOT NULL` sans défaut,
un `UNIQUE` que les lignes existantes violent, un `CHECK` qu'elles ne passent pas
— aucun ne se voit sur une table vide, tous se voient en production. Le harnais
est `apps/api/test/int/migration-non-empty.int-spec.ts`.
Ce qui n'est pas exprimable (EXCLUDE, partiels, CHECK, FK composite) reste
invisible à Prisma : c'est précisément pourquoi `migrate dev` ne doit jamais
tourner.
