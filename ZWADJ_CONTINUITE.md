# ZWADJ — Document de continuité (consolidé)

> **Comment l'utiliser :**
> - **Nouveau chat avec Claude Opus 5** : ce document en premier message + `AGENTS.md` + `ZWADJ_BACKLOG.md` + le zip du repo actuel. **Exactement trois fichiers, jamais moins.**
> - Mets à jour « État actuel » à chaque étape franchie.
>
> **Révision courante : CAMPAGNE QUALITÉ CLOSE ET VÉRIFIÉE (D115 → D129, lots T1 → T4).**
> Suite e2e exécutée par Ko sous Windows : **33 passés, 1 ignoré, 0 échec** en 2,5 min.
> Flux A, B, C, E clos ; tranche A13 et passes UI livrées. **E3 est le seul verrou restant**,
> et sa méthode a été DURCIE — voir « E3 — méthode renforcée ».
>
> **Flux A — terminé et prouvé gates en main.** A9, A12, A10, A11a, A11b, A6a intégrés et corrigés ; **A6a-P** (photos Pro) avec son **correctif ①** ; **UI-P1** ; **A7** (recherche SSR) et **A8** (détail salle). A6b **ANNULÉ** (D45).
>
> **Flux B — terminé (B1 → B6).** D46 a remplacé la piste D39 : le prix appartient au créneau.
>
> **Flux C — terminé (C1 → C5b).** Plages de visite, découpage en créneaux, exclusivité en base (D59), canaux pro (D60), prise de rendez-vous client (D61–D63), lecture et annulation pro (D70), écrans client de réservation et « Mes rendez-vous ».
>
> **Tranche A13 — terminée (A13a → A13c).** Styles (D65) et type de mariage (D66) : API, filtres client, saisie pro. **Passes UI-D1 → UI-D4** : mode sombre, clair par défaut, panneau de filtres au design, seed de démonstration.
>
> ## ✅ DÉPÔT RÉPARÉ (lot R1) — puis FLUX E LIVRÉ
>
> **L'alerte « dépôt cassé » de la révision précédente est CLOSE.** Le lot **R1**
> (02/08/2026) a réparé les régressions d'UI-D5 et rejoué les six portes.
>
> ⚠ **L'audit a trouvé SIX régressions, pas trois.** Les trois nouvelles étaient
> les plus graves parce qu'elles **ne cassaient aucune porte** :
> `getVisitSlots` effacée de `lib/api.ts`, **`VisitBookingPanel` monté nulle part**
> (le bouton inerte « Réserver une visite » était revenu), et
> **`VisitBookingsSection` montée nulle part**. Typecheck, lint, tests et builds
> auraient pu être verts avec **deux écrans livrés et inatteignables**. Aucune des
> six portes ne regarde « ce composant est-il monté quelque part ? ».
>
> **Depuis, le FLUX E est livré de bout en bout** (E1a → E2e) et la dernière dette
> du Flux C est fermée (**F1 — canaux D60**).
>
> | Lot | Sujet | État |
> |---|---|---|
> | **R1** | Réconciliation post-UI-D5 | ✅ |
> | **E1a** | API demande de réservation + politique d'acompte | ✅ |
> | **E1b** | Écrans demande (pro + client) | ✅ |
> | **E2a** | Catalogue de prestations (API) + lignes de devis | ✅ |
> | **E2b** | Table `Quote` : cycle de vie, versions, supersession | ✅ |
> | **E2c** | Écran catalogue pro | ✅ |
> | **E2d** | Catalogue public + sélecteur client | ✅ |
> | **E2e** | Écran devis pro | ✅ |
> | **F1** | Canaux de notification D60 | ✅ |
>
> ## ✅ CAMPAGNE QUALITÉ CLOSE (D115 → D125)
>
> Un défaut a déclenché cette campagne : un **double `POST /auth/refresh` au démarrage**
> qu'**aucune des six portes n'a détecté**, parce qu'il ne vivait que dans
> l'interaction navigateur réel + montage React + timing réseau. L'API y voyait une
> réutilisation de jeton (D10) et **révoquait toutes les sessions de l'utilisateur,
> sur tous ses appareils**. Deux onglets rechargés en même temps suffisaient.
>
> | Lot | Sujet | État |
> |---|---|---|
> | **D115** | Mutex single-flight élargi à la session — `bootstrap()` passait hors mutex | ✅ |
> | **D116** | Fenêtre de grâce à la rotation, **sans re-rotation** | ✅ |
> | **D117** | TOCTOU sur `accept()` / `send()` — statut relu SOUS VERROU | ✅ |
> | **T1** | Socle e2e Playwright (`e2e/`) + A1/A2/A5 | ✅ |
> | **T2** | A3 (gardes de forme + frontières d'erreur), A4/D121, B10 RBAC | ✅ |
> | **T3** | B6 contrats api ↔ api-client, B9 migration sur base non vide | ✅ |
> | **T4** | B7 tokens résolus, B8 accessibilité axe-core | ✅ |
>
> ⚠ **LA LEÇON DE LA CAMPAGNE, ET ELLE COMMANDE LA MÉTHODE D'E3.**
> Sur l'ensemble des lots, **un rouge se lit ; un vert creux ne se voit pas**.
> Quatre tests ont été **verts en ne mesurant rien** avant d'être corrigés :
> assertion sur le mauvais niveau de titre, assertion posée avant l'arrivée de la
> donnée, comparaison d'un rechargement à froid avec un autre rechargement à
> froid, et une neutralisation de garde qui n'avait rien remplacé. Et **quatre
> fois** une attente écrite **de mémoire** a produit un rouge qui ne prouvait rien
> (chemins d'API inexistants, clés de DTO inventées).
>
> D'où deux règles neuves, non négociables sur le chemin de l'argent :
> **toute garde neuve doit être NEUTRALISÉE pour prouver que son test mord**, et
> **aucune valeur attendue ne s'écrit de mémoire — elle se relève**.
>
> **➡️ PROCHAIN LOT — E3, PAIEMENT CHARGILY. C'est le lot de Ko** (chemin critique,
> revue humaine D39), et c'est **le seul verrou restant**. Il débloque à lui seul :
> `Booking → CONFIRMED`, la bascule `Quote → ACCEPTED`, le compteur « aboutis » de
> l'écran devis (aujourd'hui structurellement à 0), la libération automatique des
> créneaux, et la ligne `Commission`.
>
> ⚠ **E3 NE SE FAIT PAS COMME LES AUTRES LOTS.** Cinq sous-lots, un arrêt franc
> entre chacun, et six exigences qui n'existaient pour aucun lot précédent. Voir
> **« ⛔ E3 — méthode renforcée »**.
>
> ⚠ **Avant toute migration, lire la section « MIGRATIONS — `prisma migrate dev` est INTERDIT »** : une seule exécution a déjà détruit une contrainte en base de développement.

---

## Le projet en une phrase
Zwadj — marketplace de réservation de salles de mariage en Algérie (Alger d'abord), modèle commission (1-5%, variable par salle), bilingue FR/AR + RTL, mobile-first. Fondateur technique junior (moi) + expert SEO + expert marketing, développement à temps partiel depuis le Canada.

## Stack verrouillée
Monorepo pnpm : `apps/api` (NestJS), `apps/client` (Next.js App Router, SSR), `apps/pro` (React+Vite), `packages/{ui,i18n,types,config,api-client}`. PostgreSQL 18 + Prisma 7 (driver adapter, pas de moteur Rust). Pas de Redis (pg-boss). Pas d'`apps/admin` (endpoints protégés + DBeaver). Paiement Chargily uniquement au MVP. TypeScript strict, Zod partagé, tests Vitest/Playwright.

## Les décisions produit tranchées (ne jamais redemander)

1. **Créneaux** : `SlotTemplate` personnalisables par salle, mode `single_slot`/`multi_slot`. Chevauchement autorisé entre demandes `pending`, interdit entre `accepted/confirmed` (contrainte BDD `EXCLUDE USING gist`).
2. **Carte interactive** : reportée post-MVP, placeholder "Carte à venir/قريباً" sur Accueil + Recherche.
3. **Redis** : reporté, pg-boss au MVP.
4. **App Admin** : aucune, endpoints protégés + DBeaver.
5. **Paiement** : Chargily seul (agrège CIB+Edahabia), BaridiMob différé.
6. ~~**Visite 360°** : une seule photo équirectangulaire par salle.~~ **SUPERSÉDÉE — voir D34.**
7. **Cashback anti-fuite** : demande de réservation Zwadj obligatoire au préalable pour être éligible. Montants remplacés par **D35** (taux variable par salle). Toujours prélevé sur la commission de la salle, jamais sur les fonds Zwadj — D35 en fait une garantie mécanique.
8. **Prestations** : chaque salle définit ses `Service` avec un `pricingType` parmi 4 (fixed/per_guest/tiered/per_unit). `ServicePricing` = table séparée (garantie applicative, exception documentée).
9. **Visites** : système entièrement séparé des réservations de fête (`VisitAvailability`/`VisitBooking`), auto-confirmées. ⚠ ~~pas de contrainte BDD~~ — **RENVERSÉ par D59** : un créneau confirmé est EXCLUSIF, garanti par un index unique partiel en base.
10. **Incitation acompte** : rabais en ligne / cashback si cash+vérifié (taux D35).
11. **Navigation** : Accueil + Salles fonctionnels au MVP ; Prestataires/Inspirations/Mes outils/Communauté = pages "Bientôt disponible".
12. **Commission** : variable 1-5% par salle (fixée par Zwadj admin, jamais le pro), calculée **uniquement sur le prix de base de la salle, jamais sur les prestations**.
13. **Booking** : un seul modèle `Booking` traverse tous les statuts, pas de `BookingRequest` séparé.
14. **Request-to-book strict** : jamais d'instant-book. Devis → "Envoyer la demande" → salle accepte/refuse → paiement seulement après acceptation.

- **D33 — Statut de visibilité pro, distinct de la publication admin.** `status: VenueAvailabilityStatus` (`ACTIVE`/`HIDDEN`/`TEMPORARILY_UNAVAILABLE`), contrôlé librement par le pro, réversible, sans repasser par la modération. Liste : `PUBLISHED AND deletedAt IS NULL AND status=ACTIVE`. Détail : idem mais `status IN (ACTIVE, TEMPORARILY_UNAVAILABLE)` — bandeau « indisponible » ; `HIDDEN` fait 404 même en accès direct.
- **D34 — Tour 360° multi-photos liées, remplace D6.** `VenuePhoto360` + `VenuePhoto360Link` (liaison bidirectionnelle, `yawA/pitchA` et `yawB/pitchB`). Renforts SQL manuels : `venue_id` dénormalisé + FK composites anti-inter-salles, `CHECK (photo_a_id <> photo_b_id)`, index unique `LEAST/GREATEST`. Scène d'ouverture = plus ancienne par `(createdAt, id)`. Viewer : **Pannellum** (MIT, ~21 Ko gz).
- **D35 — Taux de cashback variable par salle**, en % du prix de base. `Venue.cashbackRateBps ≤ commissionRateBps`, CHECK SQL **et** validation applicative.
- **D36 — Capacité minimale SUPPRIMÉE.** ✅ **Fait et vérifié au Lot A9.** `capacity_min` retirée par migration ; `capacityMax` porte seul l'information.
- **D37 — Suppression d'un compte : DEMANDE, jamais exécution directe.** ✅ **Fait et vérifié au Lot A10.** Validation manuelle par l'admin. L'exécution est une anonymisation, jamais un `DELETE`. Réversible tant que `PENDING`.
- **D38 — Deux numéros de téléphone pour le pro.** ✅ **Fait et vérifié au Lot A10.** `ProProfile.phone` (NOT NULL) + `phone2` (nullable). Normalisation E.164 `+213` (backlog 23.9) **toujours non faite**.
- **D39 — Prix par créneau : CONTRAINTE DE CONCEPTION du Flux B.** `PricingRule` n'a aucun lien vers `SlotTemplate`. Le besoin est acté et doit être pris en compte **dès la conception du moteur de résolution de prix** (backlog 6.2). Interdit de le bricoler avant. Chemin d'argent ⇒ revue humaine.
- **D40 — Saisie du prix : affichage groupé + unité, valeur brute stockée.** ✅ Espace insécable U+00A0, curseur repositionné, état en chiffres bruts. Le formateur ne groupe pas une saisie non entièrement numérique.
- **D41 — Salles d'un compte supprimé : archivage réversible.** ✅ **Fait et vérifié au Lot A10.** `deletedAt` sur chaque salle VIVANTE, trace exacte dans `AccountDeletionArchivedVenue`. `businessName` conservé. `emailHash` = SHA-256 de l'adresse détruite. **La restauration n'est PAS un endpoint** : opération manuelle DBeaver.
- **D42 — Définir un mot de passe sur un compte Google-only.** ✅ **Fait et vérifié aux Lots A10/A11.** Un seul endpoint `POST /me/change-password`, **mode décidé par le SERVEUR** d'après `passwordHash`. Sessions toutes révoquées SAUF la courante, qui est rotée. `AuthUserDTO` gagne `phone`, `hasPassword`, `hasGoogle`, `proProfile.phone2`.
- **D43 — Unité monétaire collée au chiffre par ALIGNEMENT.** ✅ Code fait au Lot A9. Une boîte porte la bordure, input en `text-align: end`, `:focus-within`, description masquée par `aria-describedby`. **`dir="ltr"` retiré de l'input du prix.** ⚠ **Contrôle visuel FR/AR encore à faire.**
- **D44 — Loader de marque animé.** ✅ Code fait au Lot A12, tests verts. UN SEUL sous-chemin SVG, zéro JS, zéro dépendance. Anti-flash : `opacity: 0` puis fondu **après 200 ms** — en local il ne devient donc jamais visible, c'est voulu. `prefers-reduced-motion` traité après la règle globale. ⚠ **Contrôle visuel encore à faire** (throttling réseau Slow 3G + émulation DevTools du mouvement réduit).
- **D45 — Remplacement de Pannellum par Matterport pour la visite 360°, supersède D34.** Scan interne, compte Matterport UNIQUE Zwadj, 5 premières salles. Aucun fallback Pannellum. ✅ **Fait et vérifié au Lot A6a.** `VenuePhoto360`/`VenuePhoto360Link` (+ les 3 renforts SQL manuels du Lot A4 — FK composites anti-inter-salles, `CHECK` photos distinctes, index unique `LEAST/GREATEST`) SUPPRIMÉS par migration — **vérifié en base réelle** : zéro table, zéro contrainte, zéro index portant `360` dans `pg_tables`/`pg_constraint`/`pg_indexes`, et aucun dommage collatéral sur `venues_capacity_valid`, `venues_cashback_rate_range`, `venues_commission_rate_range` ni sur l'`EXCLUDE USING gist` des bookings. Nouveau : `Venue.matterportModelId` (`varchar(24)`, nullable, `@unique`). `PATCH /venues/:id/virtual-tour` (**sans préfixe `pro/`** — les écritures pro restent toujours nues, seules les lectures pro portent le préfixe), body `{ matterportInput: string }` (ID brut ou URL de partage, normalisés par `parseMatterportInput`), chaîne vide = désactivation explicite, saisie invalide = 400 `INVALID_MATTERPORT_LINK`. **Code ajouté à l'exécution, absent du cadrage initial** : 409 `MATTERPORT_ALREADY_LINKED` sur violation de l'unicité SQL — le compte Matterport étant unique pour tout Zwadj, coller la même URL sur deux salles est l'accident le plus probable ; sans ce catch le pro recevait un 500 brut sur le P2002 sous-jacent. `VenuePhoto` (galerie classique) INTACTE, non-régression prouvée en intégration. A6b (éditeur de tour Pannellum) **ANNULÉ**.

- **D46 — Le prix appartient au CRÉNEAU, plus à la salle. Contrainte de conception du Flux B, elle REMPLACE la piste ouverte par D39.**
  - `SlotTemplate` porte `basePriceCents`. Le pro crée de 1 à N créneaux de fête par salle, chacun avec nom FR/AR, début, fin **et son prix**.
  - `PricingRule.slotTemplateId` devient **OBLIGATOIRE** : toute règle appartient à un créneau. Il n'existe plus de règle « au niveau salle », donc **aucune question de précédence entre deux niveaux**. « +20 % l'été partout » est une commodité d'ÉCRAN qui crée N règles, jamais une règle unique.
  - `PricingRule.multiplierBps` devient un **PRIX ABSOLU** (`priceCents`). C'est ce que Ko a demandé — « mettre un prix différent selon la saison » — et c'est ce qui tranche la combinaison : **des prix absolus ne se multiplient pas, donc UNE SEULE règle gagne**.
  - **Ordre de résolution, du plus spécifique au moins spécifique : `HOLIDAY` > `WEEKDAY` > `SEASON`**, puis `priority` décroissante, puis la plus récente. Un 1ᵉʳ novembre tombant un vendredi de haute saison prend le prix férié. Sans règle applicable : `SlotTemplate.basePriceCents`.
  - **Contrepartie ACTÉE, pas subie : aucun cumul.** « Été ET vendredi = +30 % » se saisit en dur, ne s'additionne pas. En échange le pro lit un montant en dinars sur chaque ligne, et le chemin d'argent n'a plus de chaîne d'arrondis.
  - **`bookingMode` est CONSERVÉ** et ne se déduit pas du nombre de créneaux : une salle peut proposer matin et soir tout en n'acceptant qu'une fête par jour. Question posée au pro en clair — « Acceptez-vous plusieurs fêtes le même jour ? » — jamais en jargon.
  - **`Venue.basePriceCents` devient DÉRIVÉ** : minimum des `basePriceCents` des créneaux actifs, recalculé dans la MÊME transaction que toute modification de créneau. La colonne est gardée : la recherche A3/A7 filtre et trie dessus, elle continue de fonctionner sans jointure ni réécriture de contrat.
  - **Au moins un créneau actif est exigé pour publier** une salle (contrôlé à la publication admin) : publiée sans créneau, elle est invisible au calendrier et non réservable.
  - **Commission et cashback se calculent sur le prix RÉSOLU du créneau réservé**, plus sur un prix de salle. Mécaniquement plus juste : la commission suit ce que le client paie réellement pour la location.
  - Arrondi **au dinar le plus proche, moitié vers le haut**, dans une seule fonction partagée. Aucune fraction de dinar affichée ni servant de base de commission. Fenêtre de réservation : **18 mois**, constante partagée, jamais une colonne.
  - **Le prix est FIGÉ à la demande** : `Quote` et `Booking` stockent les centimes résolus. Une règle modifiée après coup ne change jamais le prix d'une demande déjà envoyée — sans quoi un pro pourrait augmenter le prix d'une réservation acceptée.
  - Le résolveur est une **fonction PURE, sans accès base**, testée à part (patron de `search-query.ts`). **Chemin d'argent ⇒ revue humaine obligatoire.**
- **D47 — Les visites ne sont PAS des réservations de fête, et ne partagent aucune structure avec elles.** Déjà en base : `VisitAvailability` (jour de semaine + début/fin, `isActive`) et `VisitBooking` (créée directement `CONFIRMED`, **aucune approbation du pro**, chevauchements tolérés donc **aucune contrainte d'exclusion**). Le pro saisit ses jours et créneaux de visite séparément de ses créneaux de fête — deux écrans, deux tables, aucun `SlotTemplate` impliqué. **Le pro est NOTIFIÉ à chaque réservation de visite.** ⚠ **PARTIELLEMENT SUPERSÉDÉE : voir D59** (le chevauchement n'est plus toléré) **et D60** (le canal est tranché).
  - ~~⚠ **Canal non tranché.**~~ **TRANCHÉ — voir D60** : e-mail et/ou SMS-WhatsApp, au choix du pro, au moins un obligatoire.

- **D48 — Le fuseau de l'Algérie se décide à la FRONTIÈRE HTTP, une seule fois.** L'Algérie est à **UTC+1 toute l'année**, sans heure d'été depuis 1981. Trois constantes partagées dans `@zwadj/types` — `ALGERIA_UTC_OFFSET_MINUTES = 60`, `BOOKING_HORIZON_MONTHS = 18`, `AVAILABILITY_MAX_WINDOW_DAYS = 92` — et **jamais une colonne, jamais une variable d'environnement** : un fuseau configurable est un fuseau qui finit faux. Les moteurs restent purs en ne manipulant que des instants ; seul le service appelle `Date.now()`, **une fois par requête** — deux appels pourraient tomber de part et d'autre de minuit et rendre l'écrêtage incohérent.
  - Une « date civile » n'est **pas** un instant : `{year, month, day}` ne devient un instant qu'en lui appliquant un fuseau. `availability-time.ts` manipule le triplet et ne le convertit qu'au dernier moment. Le jour de la semaine vient de la date **civile** (`Date.UTC(...).getUTCDay()`) — un `getDay()` local choisirait le fuseau du serveur en silence et un mariage du vendredi soir deviendrait un jeudi.
  - **92 = le plus long trimestre civil** (juillet+août+septembre), soit le trois-mois qu'un calendrier affiche d'un coup.

- **D49 — Format ⇒ 400 · bornes temporelles ⇒ ÉCRÊTAGE silencieux.** Zod refuse ce qui est **déterministe** : forme, date irréelle, `to < from`, fenêtre > 92 jours rendus. Le **passé** et l'**horizon 18 mois** dépendent de l'instant de la requête et sont **écrêtés, jamais rejetés** — un navigateur au Canada ne calcule pas le même « aujourd'hui » qu'Alger, et un 400 sur cette frontière serait intermittent et incompréhensible.
  - La réponse renvoie les bornes **EFFECTIVES**, sans quoi un calendrier afficherait des jours qu'il n'a pas reçus.
  - Fenêtre entièrement écrêtée ⇒ **200 avec `days: []`**, jamais une erreur. L'écrêtage ne fait que RÉTRÉCIR : il ne peut violer la largeur déjà validée.
  - **Aucun cinquième statut `PAST`** : le moteur en a quatre, ils sont testés.
  - `2026-02-31` passe la regex et n'existe pas — validation par **aller-retour** (`isRealCivilDate`).

- **D50 — Le contrat PUBLIC ne dit pas au client comment le pro fabrique ses prix.** `GET /venues/:slug/availability?from=&to=`, public, par **slug**, throttle global conservé.
  - **`ruleId` ne sort PAS.** Le moteur le produit pour l'UI pro, mais un identifiant de règle n'apprend rien à un client et exposerait la cardinalité de la grille tarifaire du pro. Écarté **à la sortie du service**, pas dans le moteur.
  - Les **métadonnées de créneau** sortent **UNE fois** dans `slots[]` ; `days[].slots[]` garde le même ordre **et répète `slotTemplateId`** : le contrat reste auto-descriptif, donc immunisé contre un bug d'ordre côté client.
  - **Quatre requêtes, jamais une par jour.** La fenêtre de chargement n'est **pas** `[from, to]` : borne haute à `dayStart(to) + 2880 min`, test de recouvrement **semi-ouvert des deux côtés**. Sans cela, un blocage de six mois qui enjambe la fenêtre serait invisible, et une soirée 20h→02h du dernier jour ne verrait pas une réservation de 00h30 le lendemain.
  - ⚠ **`Holiday.date` est une colonne `@db.Date` que Prisma rend à minuit UTC** (vérifié en base). Les bornes de la requête fériés sont donc les **minuits UTC des dates civiles**, **jamais** `dayStartMs` — qui vaut 23h00 UTC la veille et décalerait la fenêtre d'un jour à ses **deux** extrémités.
  - Une demande `PENDING` dont l'`expiresAt` est dépassé mais que le job n'a pas encore basculée compte **quand même** comme `REQUESTED` : **le statut fait foi**. Une seconde règle d'expiration finirait par diverger de celle du job.
  - Visibilité **identique au détail public** (D33) : `PUBLIC_BASE_WHERE`, `PUBLIC_DETAIL_STATUSES` et `SLUG_PATTERN` sont **exportés** de `venues-public.service.ts`. Un 404 de calendrier sur une page qui, elle, s'affiche est un bug muet. Salle sans créneau actif ⇒ `slots: []`, **pas un 404**.

- **D51 — Les blocages pro se saisissent en heure LOCALE, sans décalage.** `POST`/`DELETE /venues/:id/availability-blocks` (écritures **nues**) et `GET /pro/venues/:id/availability-blocks` (lecture **préfixée**). *Le backlog écrivait `POST /venues/:id/availability/block` : périmé.*
  - Corps en date-heures civiles `YYYY-MM-DDTHH:mm`, **sans offset**. Accepter un ISO offsetté laisserait un navigateur étranger créer un blocage aux mauvaises heures d'Alger.
  - **SYMÉTRIE obligatoire** : le DTO relu renvoie le **même repère civil local**. `createdAt` fait exception (métadonnée d'audit).
  - **Verrou `SELECT … FOR UPDATE` sur la ligne `venues`**, avant le test de conflit — le même verrou que prendra l'acceptation d'une réservation. **Premier SQL brut applicatif du dépôt** : template balisé, paramètre lié. ⚠ **Vérifié en base : aucun cast `::uuid` n'est nécessaire** — avec Prisma 7 + l'adapter `pg`, le driver infère le type depuis la colonne.
  - Conflits : bloc ↔ **`ACCEPTED`/`CONFIRMED`** ⇒ **409 `AVAILABILITY_BLOCK_CONFLICT`**, vérifié applicativement (une `EXCLUDE` ne traverse pas deux tables — exception assumée). Bloc ↔ **`PENDING`** ⇒ **rien** : une demande ne verrouille rien, et poser un bloc par-dessus est la façon dont le pro dit non. Bloc ↔ bloc ⇒ **autorisé** (l'union est la sémantique voulue).
  - Suppression **DURE**, autorisée même sur une plage passée : un blocage n'est pas un historique de vente.
  - Le `GET` pro réutilise **le même schéma de fenêtre** que le public.

- **D52 — L'heure de fin d'un créneau est DÉDUITE, jamais saisie au-delà de 24 h.** Un `<input type="time">` plafonne à 23:59 : il ne PEUT pas exprimer « 02h du lendemain », donc pas la soirée de mariage la plus courante du pays (20h→02h, `endMinutes: 1560`). Règle : **fin ≤ début ⇒ +1440**.
  - L'écran **DIT** ce qu'il a déduit (« se termine le lendemain »).
  - ⚠ **Rétrécissement ASSUMÉ** : la saisie plafonne à 2879 minutes là où le CHECK autorise 2880. **Le schéma reste plus permissif que l'écran, jamais l'inverse** — l'inverse est la faute de B1.

- **D53 — Une saison PEUT enjamber décembre, et l'écran ne l'en empêche pas.** « Novembre → février » s'écrit `startMonth: 11, endMonth: 2`. Valider `startMonth <= endMonth` interdirait la saison d'hiver. L'UI n'ajoute **aucune** validation d'ordre et **affiche les mois couverts**.
  - Les champs requis PAR TYPE restent à l'API : les dupliquer créerait deux règles à faire diverger.
  - Le **type n'est pas modifiable** : le formulaire ne l'offre pas, le PATCH ne le contient pas, et l'écran **explique pourquoi**.
  - **L'ordre de résolution est ANNONCÉ** (férié > jour > saison, puis priorité décroissante) : sans cela le pro croit à un cumul. Les prix sont **absolus**, jamais des pourcentages.

- **D54 — La date de fin d'un blocage est INCLUSIVE à l'écran, exclusive dans l'API.** « Du 3 au 10 août » doit bloquer le 10 ; envoyer `2027-08-10T00:00` le laisserait **entièrement libre**. La conversion (`+1 jour`) se fait dans `toBlockPayload`, **une seule fois**, et la relecture la défait symétriquement.
  - **Aucun `new Date().toISOString()` dans l'écran** : il appliquerait le fuseau du NAVIGATEUR. Concaténation pure. Un pro connecté depuis la France bloquerait sinon les mauvaises heures d'Alger — un test le vérifie.

- **D55 — DOCTRINE DES BORNES.** *Quatre bugs de la même famille en quatre lots : c'est un motif.* B1 (`endMinutes` plafonné), D52, D53, D54. Dans chaque cas, **la sémantique d'une borne a été décidée au mauvais endroit**, et le symptôme est toujours silencieux, plausible, découvert par un utilisateur.
  - **Avant d'écrire une validation de borne, écrire le cas RÉEL qu'elle doit accepter.** La soirée 20h→02h, la saison nov→fév, le blocage qui inclut son dernier jour. Si la validation le refuse, **c'est la validation qui a tort**.
  - **Une borne ne se valide jamais deux fois.** Si le schéma l'autorise, l'écran ne la restreint que délibérément et par écrit.
  - **Une borne traduite doit se relire dans les mêmes termes.** Écrire « au 10 » et relire « au 11 » fait corriger au pro une erreur qui n'existe pas.

- **D56 — La semaine algérienne commence le DIMANCHE, et se termine par le week-end.** Le repos hebdomadaire est **vendredi-samedi** ; le premier jour de travail et d'école est donc le **dimanche**. Toute grille va **dimanche → samedi**, vendredi et samedi en **fin de ligne**.
  - ⚠ **CLDR / `Intl` n'est PAS d'accord, et l'écart est délibéré.** `Intl.Locale("ar-DZ").getWeekInfo()` rend `{ firstDay: 6 (samedi), weekend: [5, 6] }`. CLDR décrit une convention d'affichage ; on suit **l'usage réel**, tranché par Ko. **Ne jamais « aligner » `WEEK_START_DAY` sur `getWeekInfo()`** : le week-end se retrouverait en TÊTE de grille au lieu de la clore. Un test existe dans chaque app pour qu'un alignement bien intentionné le casse.
  - **La langue de l'interface ne décide RIEN.** La locale `fr` répondrait « lundi, week-end samedi-dimanche » — faux deux fois. Un Algérois qui lit le français vit toujours en Algérie.
  - Vendredi-samedi n'est **pas un creux à griser** : c'est le **pic** de la demande en salle des fêtes.
  - ⚠ **Deux numérotations coexistent** : `getUTCDay()` et le contrat API (0 = dimanche … 6 = samedi) ; `Intl` weekInfo en ISO (1 = lundi … 7 = dimanche). Vendredi vaut 5 et samedi 6 dans les deux, **dimanche vaut 0 en JS et 7 en ISO**. Tous les modules de grille raisonnent en **numérotation JS**.
  - *Historique : implémenté « samedi en tête » d'après CLDR, puis corrigé par Ko dans le même échange.*

- **D57 — L'Algérie utilise EXCLUSIVEMENT le format 24 h.** Pas d'AM/PM, nulle part : ni écran, ni e-mail, ni SMS.
  - `formatWallClock(minutes)` et `formatSlotRange(start, end)` dans **`@zwadj/types`** sont les **seuls** formateurs d'heure de la plateforme. `apps/pro/src/venues/slot-time.ts` y **délègue**.
  - **`Intl.DateTimeFormat` est INTERDIT pour l'heure** : selon la locale et le moteur, il bascule en AM/PM sans prévenir (`en-US` le fait). Une concaténation ne peut pas dériver. `Intl` reste utilisé pour dates, mois et jours.
  - ⚠ **AUCUN `<input type="time">` dans le dépôt.** Il est rendu par le NAVIGATEUR dans SA locale — un navigateur en anglais y affiche un sélecteur AM/PM, et rien en HTML ne permet de l'en empêcher. Remplacé par **`TimeSelect`** (`apps/pro/src/venues/time-select.tsx`) : deux `<select>` que nous rendons, donc les options sont notre texte. On garde la molette native du mobile, le clavier et les lecteurs d'écran.
  - ⚠ **Une valeur existante hors pas doit rester sélectionnable** : sans cela, ouvrir puis enregistrer un créneau de 20:05 le déplacerait à 20:00 **en silence**.
  - Séparateur de plage : tiret demi-cadratin entre **espaces insécables** (en RTL, un tiret nu se réordonne visuellement). `font-variant-numeric: tabular-nums` sur les heures.

- **D58 — Une visite dure 30 minutes, pour toute la plateforme.** `VISIT_DURATION_MINUTES = 30` dans `@zwadj/types`. **Constante partagée, jamais une colonne** : une durée par salle donnerait au pro un réglage de plus pour un gain nul, et rendrait incomparables les créneaux de deux salles voisines.
  - Conséquence : une plage ne rend que des créneaux **ENTIERS**. 09:00→10:20 rend deux rendez-vous et s'arrête à 09:30 — pas un de 20 minutes.
  - Une visite **ne franchit pas minuit** (`CHECK visit_availabilities_minutes_valid`, `end_minutes <= 1440`), contrairement aux créneaux de fête (2880, D52). Deux systèmes, deux bornes — le schéma fait autorité (D55).
  - La fenêtre de chargement des rendez-vous n'a donc **pas** besoin des 48 h qu'exige `/availability` : `[dayStart(from), dayStart(to) + 24 h[` suffit.

- **D59 — Un rendez-vous de visite est EXCLUSIF.** ⚠ **SUPERSÈDE D47** sur ce point précis. D47 tolérait le chevauchement ; **décision renversée par Ko** : un créneau déjà pris ne peut plus être pris par quelqu'un d'autre.
  - **Garanti EN BASE**, pas seulement dans le service : index unique `visit_bookings_no_double_confirmed` sur `(venue_id, scheduled_at)`. Une vérification applicative laisse toujours une fenêtre entre le test et l'insertion, et **deux clients qui cliquent sur le même créneau à la même seconde sont le cas probable**.
  - **Index unique PARTIEL, pas contrainte d'exclusion** : la durée est fixe (D58) et un rendez-vous commence toujours sur un multiple de créneau, donc l'égalité de `scheduled_at` suffit.
  - ⚠ **Le filtre `WHERE status = 'CONFIRMED'` est essentiel** : une visite **annulée doit LIBÉRER** son créneau ; un index total l'en empêcherait à jamais. *Prouvé en base.*
  - L'unicité porte sur `(venue_id, scheduled_at)` : le même horaire dans une **autre salle** reste libre.
  - **Un créneau pris reste RENDU**, marqué `taken`, plutôt que retiré : voir qu'un horaire est occupé aide à en choisir un autre, alors qu'une liste qui se contracte donne l'impression que la salle ne fait pas de visites ce jour-là.

- **D60 — Le pro choisit ses canaux de notification.** Ferme la décision laissée ouverte par D47.
  - **DEUX booléens** sur `ProProfile` : `notifyByEmail` (défaut `true`), `notifyBySms` (défaut `false`). « Les deux » = les deux à `true`.
  - ⚠ **Écart assumé à la formulation de Ko** (qui parlait d'un choix « sms, email, ou les deux ») : un enum `{ EMAIL, SMS, BOTH }` explose dès le troisième canal (`EMAIL_PUSH`, `SMS_PUSH`, `EMAIL_SMS_PUSH`…). Deux drapeaux se combinent, le suivant s'ajoute sans toucher aux existants. *Si Ko préfère l'enum, c'est une petite migration.*
  - **Le revers des booléens est qu'ils autorisent « aucun canal »** — un pro qui coupe tout ne verrait plus jamais une demande arriver. `CHECK pro_profiles_one_channel_required` l'**interdit en base** : ce n'est pas au formulaire de s'en souvenir. *Prouvé en base.*
  - `NotificationChannel` gagne `SMS`. **Transport = WhatsApp** : c'est ce que les pros algériens utilisent réellement pour leur activité, pas le SMS opérateur. Destinataire = `ProProfile.phone`, déjà normalisé +213.

*(D15–D32 posées pendant les tranches Auth et Pivot visuel — closes, non révisables, non reproduites ici.)*

> **D61 → D70 ne sont PAS dans cette liste**, elles sont écrites au plus près de leur lot :
> **D61, D62, D63, D70** dans « Découpage du Flux C » ; **D64** dans « Passes UI » ; **D65, D66, D68** dans « Tranche A13 » ; **D69** dans A13b. Elles ont la même autorité que celles ci-dessus.

---

## État actuel

### Livré, intégré et VÉRIFIÉ
- ✅ **Schéma Prisma complet**, **18 entrées** dans `prisma/migrations` (17 migrations + `migration_lock.toml`).
- ✅ **TRANCHE AUTHENTIFICATION (Lots 0–6)** : 9 routes `/auth/*`.
- ✅ **TRANCHE PIVOT VISUEL + OAUTH GOOGLE (Lots 7–9)** : palette par app (D26), remember-me (D27/D31), invariant `required` (D32), OAuth Google ID-token GIS (D29/D30).
- ✅ **FLUX A — Lots A0 à A5** + correctif prix D40.
- ✅ **FLUX A — Lots A9, A12, A10, A11a, A11b** : intégrés dans cet ordre, sept correctifs appliqués (voir plus bas), **toutes gates vertes**.
- ✅ **FLUX A — Lot A6a (visite virtuelle Matterport, D45)** : intégré, gates vertes, migration prouvée en base réelle.
- ✅ **TRANCHE UIP — refonte de l'app Pro (D130 → D149)** : coquille + top panel, parcours « client sur place », assistant de salle en 7 étapes, refonte graphique, contrat de contact D135. ⚠ Livrée sur **cinq portes** : le bac à sable ne peut pas exécuter l'API (voir les compteurs UIP). **Sept tests d'intégration restent à passer chez Ko.**

### Compteurs — MESURÉS à la clôture de la campagne qualité (07/08/2026)

| Gate | Valeur |
|---|---|
| typecheck | **8 projets**, 0 erreur — `@zwadj/e2e` s'est ajouté |
| lint | exit 0 |
| tests unitaires | **76 fichiers / 808 tests** — api 39/374 · api-client 2/34 · client 15/160 · pro 20/240 |
| tests d'intégration | **34 fichiers / 398 tests**, base recréée de zéro |
| i18n | **844 = 844** |
| builds | Next ✅ · Vite ✅ |
| suite e2e (à la demande) | **34 tests / 6 fichiers** — exécutée par Ko sous Windows : **33 passés, 1 ignoré, 0 échec**, 2,5 min |
| `prisma/migrations` | **21 entrées** (20 migrations + `migration_lock.toml`) |

> ⚠ **Le typecheck compte 8 projets** dont `@zwadj/e2e`. La suite e2e n'est
> **PAS** une septième porte : elle se lance à la demande, avant tout lot touchant
> **auth, concurrence ou argent**, et avant chaque livraison finale.

### Compteurs — MESURÉS à la clôture de F1 (02/08/2026)

| Gate | Valeur |
|---|---|
| typecheck | **8 projets**, 0 erreur |
| lint | exit 0 |
| tests unitaires | **75 fichiers / 788 tests** — api 39/370 · api-client 2/30 · client 15/160 · pro 19/228 |
| tests d'intégration | **30 fichiers / 361 tests**, base recréée de zéro (3 shards : 120 + 110 + 131) |
| i18n | **843 = 843**, plancher D71 dans `i18n-parity.spec.ts` |
| builds | Next ✅ (`[slug]` toujours `ƒ Dynamic`) · Vite ✅ |
| `prisma/migrations` | **20 entrées** (19 migrations + `migration_lock.toml`) |

> ⚠ **Le typecheck compte 8 projets et non 7** : `@zwadj/api-client` s'est ajouté.
> Valeur mesurée, jamais déduite.

**Compteurs de référence à la clôture du Flux C (C1 → C5b) + tranche A13 + passes UI-D1→D4** — tout écart futur est une régression. Valeurs **MESURÉES en bac à sable**, jamais déduites :

| Gate | Valeur |
|---|---|
| `pnpm -r --no-bail run typecheck` | **7 projets exécutés**, 0 erreur — api, api-client, client, **i18n**, pro, types, ui (seul `config` n'a pas de script) |
| `pnpm -r run lint` | exit 0 |
| tests unitaires | **72 fichiers / 688 tests** — api 35/323, pro 16/200, client 13/135, api-client 2/30 |
| `ALLOW_PG_LT18_POLYFILL=1 pnpm test:int` | **27 fichiers / 297 tests**, base recréée de zéro |
| i18n | **631 clés FR = 631 clés AR**, symétrie vérifiée |
| `pnpm --filter @zwadj/client run build` | ✅ (Next) |
| `pnpm --filter @zwadj/pro run build` | ✅ (Vite) |
| `prisma/migrations` | **18 entrées** (17 migrations + `migration_lock.toml`) |

> ⚠ **Le repère « 6 projets » était FAUX**, et la note qui « corrigeait » 7 → 6 l'était aussi. `@zwadj/i18n` **a** un script `typecheck` ; seul `@zwadj/config` n'en a pas. Compté par `pnpm -r --no-bail run typecheck | grep -c "typecheck /home"` — **7**.

*(Compteurs à la clôture d'A11b, pour mémoire : 39 fichiers / 339 tests unitaires, 20 fichiers / 162 tests d'intégration, 354 = 354 clés i18n. L'écart avec A6a s'explique entièrement : `viewer360.spec.ts` supprimé — Matterport n'a plus de calcul de scène d'ouverture à tester en isolation —, 6 tests 360° retirés (scènes, liaisons, ratio 2:1), 14 tests neufs ajoutés — parse Matterport, schéma, service, client, UI Pro.)*

### Les sept correctifs appliqués par-dessus les zips livrés
Aucun n'était visible en relecture ; tous ont été trouvés à l'exécution. **Ils ne sont dans aucun zip de Opus** : si un futur lot réécrit ces fichiers, il les révoque.

1. `apps/api/src/account/account-deletion.service.spec.ts` — `TS2677`, prédicat de type non assignable sur `Object.values(prisma)`. Remplacé par un `filter` simple + `as object`.
2. `apps/api/src/auth/auth.service.spec.ts` — deux mocks de `passwordResetToken.findFirst` sans le sous-objet `user`, alors qu'A10 lit `token.user.status`. Ajout de `user: { status: "ACTIVE" }` aux deux.
3. `packages/ui/src/use-dismiss-layer.ts` — deux `// eslint-disable-next-line react-hooks/exhaustive-deps` référençant une règle **non enregistrée** dans `@zwadj/config/eslint/base` ⇒ lint rouge. Retirées.
4. `packages/ui/src/use-dismiss-layer.ts` + `packages/ui/src/account-menu.tsx` — la restitution de focus reposait sur `document.activeElement` à l'ouverture. **Sur macOS, cliquer un bouton ne lui donne pas le focus** : la promesse du cadrage était cassée en vrai, pas seulement en test. Ajout de `restoreFocusRef` (défaut inchangé, `ConfirmDialog` intact) et d'un `triggerRef` sur le déclencheur du menu.
5. `apps/pro/src/App.test.tsx` — assertion périmée : A11a retire le nom en clair de l'en-tête au profit du rond à initiales. Remplacée par le déclencheur + les initiales.
6. `apps/pro/src/account/account-settings-page.test.tsx` — la page était montée **hors** `RequireProSession`, donc avec `user` encore `null` ; le formulaire profil initialise son état par `useState` et restait vide. Montée sous la garde, comme en production.
7. `apps/client/vitest.config.ts` — `server: { deps: { inline: ["next-intl"] } }`. next-intl est publié en ESM et importe `next/navigation` sans extension : hors résolveur Vite, toute suite qui monte un composant touchant `src/i18n/navigation` **ne se charge pas**.

### Reste à faire par Ko, hors code
- ⚠ **D43 à l'œil, FR *et* AR** : anneau de focus sur la boîte du prix au clavier, unité à l'inline-end en RTL. C'est là que le retrait de `dir="ltr"` se valide ou s'infirme.
- ⚠ **D44 à l'œil** : DevTools → Network → **Slow 3G**, puis rechargement du Pro (le bootstrap dure alors assez pour que le loader dépasse les 200 ms d'anti-flash). Puis `Ctrl+Shift+P` → « Show Rendering » → **Emulate prefers-reduced-motion: reduce** : le logo doit rester **entier et statique**, pas un fragment figé.
- ⚠ **`GOOGLE_CLIENT_SECRET`** : révoquer et régénérer dans la console Google Cloud. Il a circulé dans deux zips. Jamais consommé par le code, jamais nécessaire au flux ID-token. **En attente depuis le Lot 8.**

---

## Découpage du Flux A — ✅ TERMINÉ (référence, plus rien à faire)

- **A6a** — ✅ **Visite virtuelle Matterport livrée et vérifiée** (D45).
- **A6a-P** — ✅ **Volet photos Pro livré et vérifié.** `photos-section.tsx`, section autonome hors du `<form>` (quatre endpoints à elle). État possédé par la section, jamais de `load()` de la page. Réconciliation imposée par opération : ajout = la réponse en fin de liste ; ordre = remplacement EN BLOC du tableau retourné ; alt = remplacement en place ; suppression (204) = **seul cas qui force un refetch**. Réordonnancement **sérialisé** : pendant un PATCH en vol, TOUTES les flèches sont `disabled` — aucun état optimiste, donc aucun instantané de rollback. Multipart en **passe-plat** dans `raw()` (ni `JSON.stringify`, ni `Content-Type` : la boundary est posée par le navigateur), avec l'assertion INVERSE testée — le chemin JSON est celui de tous les autres appels du dépôt.
  - **Correctif ① — URL des médias.** `publicUrl()` de l'adapter disque renvoie du **relatif** (`/api/v1/media/<clé>`) et son contrat dit « les fronts préfixent leur base API » : aucun ne le faisait. En dev, Vite sert le Pro sur `:5173` et l'API écoute sur `:3001`, **sans proxy `/api`** — toutes les vignettes étaient cassées, y compris la couverture de la liste (défaut ANTÉRIEUR, hérité d'A11a). Corrigé par `apps/pro/src/lib/media-url.ts` : `mediaSrc()` ne préfixe QUE si l'URL est relative, sinon l'adapter S3/CDN de prod produirait `https://api…/https://cdn…`.
- **UI-P1** — ✅ **Passe UI Pro livrée.** `.btn` NUE était **invisible** : le reset global de `styles.css` retire `background`, `border` et `padding` de tout `<button>`, et `.btn` ne reposait que la police. Elle porte désormais le niveau secondaire (surface + filet), les variantes pleines le recouvrent **filet compris** (sans quoi elles héritaient d'un liseré gris). Sans risque pour le Client : il n'utilise jamais `.btn` seule — vérifié. Flèche de retour `ArrowBackIcon` (`@zwadj/ui`, SVG inline, zéro dépendance), **miroitée en RTL par la CSS** (`[dir="rtl"] … scaleX(-1)`) et non par un glyphe par langue. Sortie de page explicite : à côté de « Créer » sur la création, **à la toute fin** sur l'édition (photos et visite virtuelle suivent le formulaire). Zéro clé i18n neuve — `venue.ui.form.back` existait. Garde-fou `apps/pro/src/ui-tokens.test.ts` : il relit `styles.css` et vérifie que `.btn` repose fond/filet/couleur, que les variantes posent leur `border-color`, et que la règle miroir RTL existe. **Aucune assertion de couleur : on n'y fige pas une esthétique, on empêche le retour du bouton invisible.**
- ~~**A6b**~~ — **ANNULÉ entièrement (D45).** Plus d'éditeur de liaisons/hotspots en interne : Matterport gère son propre scan, aucun clic-pour-placer à coder côté Zwadj.
- **A7** — ✅ **Recherche SSR livrée.** L'API est livrée et prouvée au Lot A3 : `GET /venues`, `venueListQuerySchema` (`cityId`, `guests`, `minPriceCents`, `maxPriceCents`, `amenities` en clés séparées par virgules **sémantique ET**, `sort` ∈ `recent|price_asc|price_desc`, `page`, `pageSize` défaut 12 / max 50), enveloppe `{ items, total, page, pageSize }`. Querystring **non-stricte** : `utm_*`/`fbclid` sont ignorés, jamais un 400 ; une VALEUR inconnue (ville ou amenity absente du référentiel) donne un résultat VIDE, pas une erreur. Rien à changer côté API — comme A6a-P, ce lot ne fait que consommer.
  - **La page filtre, trie et pagine SANS JavaScript.** Le panneau est un vrai `<form method="get">`, le tri vit dedans, la pagination est faite de LIENS. Le `"use client"` ne sert qu'au confort (le tri se soumet au changement). Décision de performance : cible Android bas de gamme, réseau lent (backlog 24.6).
  - **Écart assumé n°1 — `amenities` est RÉPÉTÉ dans l'URL** (`?amenities=wifi&amenities=parking`), pas joint par virgules comme l'API : un formulaire GET sans JS ne sait produire que la forme répétée. La jointure se fait à l'appel de l'API. La forme jointe reste acceptée EN LECTURE (une URL copiée depuis un appel d'API ne perd pas ses filtres).
  - **Écart assumé n°2 — pas de `next/image`**, `<img loading="lazy">` nu : la vignette est déjà générée à la bonne taille par le pipeline A4. La repasser dans l'optimiseur imposerait `remotePatterns`, un proxy en dev et un second ré-encodage, pour zéro gain. **Aucun `remotePatterns` n'a donc été ajouté**, contrairement au cadrage initial.
  - **Décision ① tenue : PAS de tri « recommandé ».** Il n'existe pas dans `VENUE_LIST_SORTS` et n'aurait aucun signal à consommer avant le Flux B. L'ajouter rouvrirait le contrat A3, sa requête SQL et ses tests d'intégration.
  - **L'URL porte des DINARS** (`minPrice`), l'API des centimes. Conversion dans `search-query.ts` — pur, testé à part : c'est la faute à facteur 100 la plus banale du projet. Une saisie non entière y est rejetée côté front, pour qu'un 400 n'atteigne jamais une page indexée.
  - `mediaSrc` refait côté Client (`apps/client/src/lib/media-url.ts`) : deux fichiers plutôt qu'un partagé, la base n'ayant pas la même source (`import.meta.env` contre `process.env.NEXT_PUBLIC_*`).
  - ⚠ **Fausse alerte consignée** : le `●` de la table des routes Next a été lu comme « prérendu en statique ». Le manifeste de prérendu dit le contraire — `routes` ne contient AUCUNE entrée `salles`, avec ou sans `force-dynamic` (les deux builds ont été faits). Le `●` désigne les combinaisons de `[locale]` connues, pas du HTML sur disque. La directive a été gardée comme garde-fou explicite, avec un commentaire honnête et un test.
- **A8** — ✅ **Détail salle livré.**
  - **Pas de `generateStaticParams`** : il faudrait interroger l'API AU BUILD pour lister les slugs. API éteinte en CI ⇒ site sans aucune page de salle ; et toute salle publiée après le build resterait invisible. Rendu à la demande + `revalidate: 300` sur le `fetch` — l'ISR utile, sans dépendance au build. Route confirmée `ƒ (Dynamic)`.
  - **404 HTTP, jamais de soft-404** : `null` (slug inconnu, non publiée, `HIDDEN` par D33, ou API muette) ⇒ `notFound()`. Une page « introuvable » servie en 200 se fait indexer comme une vraie page.
  - **D33** : `TEMPORARILY_UNAVAILABLE` ⇒ bandeau, et la page reste ENTIÈREMENT consultable (test dédié). `HIDDEN` n'arrive jamais jusqu'à la vue.
  - **L'iframe Matterport n'est montée QU'AU GESTE**, avec le coût de données ANNONCÉ avant le clic. Le lien externe est rendu dans tous les cas : c'est le repli sans JavaScript.
  - **Galerie sans visionneuse JS** : chaque photo est un lien vers l'original, que l'API sert déjà. La couverture est en `loading="eager"` (c'est le plus grand élément affiché, métrique LCP), les suivantes en `lazy`. L'alt saisi par le pro fait foi ; absent, l'image est décorative.
  - **CTA Flux B/C présents et réellement `disabled`** (donc hors ordre de tabulation), avec la raison écrite. `generateMetadata` : titre, description (l'accroche du pro, jamais la description longue tronquée) et image OG depuis la couverture.
  - ⚠ **Reste à faire** : page 404 bilingue dédiée (aujourd'hui le `_not-found` par défaut), données structurées schema.org (backlog 23.8).

**Arbitrages A4 verrouillés, à respecter dans le volet photos restant d'A6a** : **couverture = première photo par `sortOrder`** (le réordonnancement fait office de sélecteur de couverture) ; réordonnancement = **ensemble complet**, `PHOTO_ORDER_MISMATCH` à traduire en « rafraîchis et réessaie », jamais un échec muet ; plafond **30 photos** ; **jamais de gate sur `status` D33** (un pro gère les médias d'une salle `HIDDEN`).

**L'API du volet photos existe déjà et est prouvée** (Lot A4, tests d'intégration verts). Ce qui reste d'A6a ne fait que la consommer côté UI : aucune migration, aucun changement de contrat, aucun `prisma generate`.

---

## Ce que les lots A9–A12 ont changé dans le code (à connaître avant d'y toucher)

### A9
- Le CHECK `venues_capacity_valid` portait sur les **deux** colonnes (`capacity_min > 0 AND capacity_max >= capacity_min`) : `DROP COLUMN` l'aurait emporté **en silence**. La migration le retire explicitement puis le **repose** sur `capacity_max > 0`. Vérifié en base réelle.
- `venue.validation.capacityMin`/`capacityMax` n'étaient pas les clés du champ supprimé mais les messages de **bornes** du champ survivant. Renommées `capacityTooSmall`/`capacityTooLarge`.
- `.sr-only` **introduit par A9** dans `packages/ui/styles.css` et **réutilisé par A12** : intégrer A12 sans A9 afficherait « Chargement… » à l'écran.

### A10
- **`UserStatus` est désormais lu par SEPT chemins** : login, google, refresh, reset-password, forgot-password, resend-verification et `/auth/me`. Sur le login, le test est placé **APRÈS** argon2 (sinon la latence trahit le statut, D5) et **AVANT** D1.
- **`EmailChangeToken` : troisième table**, avec la route publique `GET /auth/confirm-email-change/:token` dans un contrôleur séparé. Sans elle, la nouvelle adresse ne pouvait jamais prendre effet.
- **`passwordHash` et `googleSub` sont désormais SÉLECTIONNÉS** dans `AUTH_USER_SELECT` — `hasPassword`/`hasGoogle` ne peuvent pas se dériver autrement. `toAuthUserDTO()` construit champ par champ, **jamais par spread** ; `me.int-spec.ts` assert `not.toHaveProperty("passwordHash")`.
- **`ProProfile.phone` est NOT NULL** : « effacé » = chaîne vide, pas `null`.
- Neuf routes : `PATCH /me/profile`, `POST /me/change-email`, `POST /me/change-password`, `GET|POST /me/deletion-request`, `POST /me/deletion-request/cancel`, `GET /admin/deletion-requests`, `POST /admin/deletion-requests/:id/{approve,reject}`, `GET /auth/confirm-email-change/:token`.
- Throttles dédiés : `change-password` 10/15 min, `change-email` 3/15 min.
- **Index unique PARTIEL** `WHERE status = 'PENDING'` en SQL manuel : une seule demande en attente par compte, garantie en base. Prouvé (409 sur la seconde).
- L'exécution d'une approbation : **une transaction, cinq effets, ZÉRO `DELETE` SQL** — vérifié au grep et par un double de test qui n'expose aucune méthode `delete`.

### A11a / A11b
- **`useDismissLayer` extrait** de `ConfirmDialog` et partagé avec `AccountMenu` — un seul piège de focus dans le dépôt. `ConfirmDialog` est recâblé dessus, ses tests A5 sont le filet de régression.
- **`AuthClient` n'a PAS été étendu** : `AccountClient` et `reloadUser` sont bâtis sur `authedRequest`, donc partagent le mutex single-flight du refresh. Le piège §0.4 ne se redéclenche pas.
- `AuthContext` Pro gagne `applyUser` + `reloadUser` ; Client gagne `applyUser` (`refreshUser` existait). **La réhydratation après `change-password` est obligatoire**, sinon `hasPassword` reste `false` en mémoire.
- **La garde de session de `/compte` côté Client est CÔTÉ CLIENT, pas dans le middleware Next** : l'access token vit en mémoire (D2) et le cookie refresh est restreint au path `/api/v1/auth`. Le backlog 9.1 supposait le contraire, il est corrigé.
- **`initialsOf` itère par POINT DE CODE.** Cas arabe et cas emoji tous deux testés et verts.
- **`AccountSettingsPage` (Pro) suppose `user` présent au montage** : hors `RequireProSession`, l'écran affiche un profil vide. La vue Client, elle, porte sa garde dans le même composant.
- **« Nouvelle salle » déplacé** de l'en-tête de liste Pro vers le menu, **mais conservé dans l'état vide**. Écart assumé au cadrage, à confirmer ou infirmer par Ko.

---

### A6a — Visite virtuelle Matterport (D45, remplace le tour 360° maison)
- Migration `a6a_matterport_replace_360_tour` **écrite à la main** (`migrate dev --create-only`), jamais un diff généré : ce schéma porte une trentaine de `CHECK`, un `EXCLUDE USING gist` et des index partiels/d'expression que Prisma ne peut pas exprimer, donc n'a aucune autorité pour les modifier. `DROP TABLE` enfant → parent (`venue_photo_360_links` avant `venue_photos_360`), sans `CASCADE` : un `CASCADE` aurait masqué toute dépendance imprévue.
- **`venue_photos_360` avait été créée par la migration `init`, pas par le Lot A4** — A4 n'a fait que la remanier (`thumb_key`, unique composite). Le DROP vise les DEUX tables depuis leur origine réelle, pas seulement ce qu'A4 y a ajouté.
- `venues.matterport_model_id` : `varchar(24)` nullable + index unique. Nullable parce que toutes les salles n'ont pas de scan ; Postgres autorisant plusieurs `NULL` dans un index unique, les salles sans visite cohabitent sans index partiel.
- `parseMatterportInput` (dans `@zwadj/types`) accepte l'ID brut ET l'URL de partage complète, retourne trois valeurs distinctes jamais confondues : chaîne vide = désactivation, `null` = rejet (400), sinon l'ID canonique à stocker. **Ne peut PAS utiliser `new URL()`** — `packages/types` compile en `lib: ["ES2022"]` seule (ni DOM ni `@types/node`), le global n'existe pas à la compilation. Réécrit en découpage manuel de chaîne (authority/host/query), avec retrait explicite du userinfo (`user@host`) et du port avant comparaison d'hôte.
- `MATTERPORT_ALREADY_LINKED` (409) : code **non prévu au cadrage initial**, ajouté à l'exécution en conséquence directe du `@unique` — le compte Matterport étant unique pour tout Zwadj, coller la même URL sur deux salles est l'accident le plus probable, et sans ce catch le P2002 sous-jacent remontait en 500 brut.
- Section Pro (`virtual-tour-section.tsx`) **hors du `<form>` principal** : endpoint séparé (`PATCH .../virtual-tour` vs `PATCH /venues/:id`), donc son propre bouton — imbriquer un second submit dans le formulaire aurait fait partir les deux requêtes sur une touche Entrée.
- Vérifié en base réelle après migration (requêtes directes `pg_tables`/`pg_constraint`/`pg_indexes`) : zéro résidu portant `360`, et les contraintes des AUTRES tables (`venues_capacity_valid`, `venues_cashback_rate_range`, `venues_commission_rate_range`, l'`EXCLUDE` gist `bookings_no_overlap_accepted_confirmed`) intactes.
- i18n : 9 clés 360° retirées (`media.errors.badAspectRatio`/`sceneLimitReached`, `venue.validation.hotspot*`/`link*`, `venue.errors.scene*`/`link*`), 15 clés Matterport ajoutées. 360 = 360.

## Méthode de travail (à respecter dans tout nouveau chat)

- **Un seul flux actif à la fois.** Les comptes Opus additionnels servent uniquement de relais si la session en cours atteint sa limite sur LE FLUX EN COURS.
- **Toujours faire proposer un découpage en lots avant qu'un agent écrive du code**, valider chaque lot avant le suivant.
- **Toujours joindre les TROIS fichiers** (`ZWADJ_CONTINUITE.md`, `ZWADJ_BACKLOG.md`, zip du repo) à chaque session. Cause d'un vrai incident (Lot A0 livré sous le nom A1).
- **Chemins critiques (paiement, auth, concurrence, suppression de compte) = revue humaine obligatoire.**
- ⛔ **`prisma migrate dev` est INTERDIT** — voir la section dédiée. Les migrations s'écrivent à la MAIN, puis `prisma:migrate` (= `migrate deploy`).
- **Ne jamais traiter un parse syntaxique comme un typecheck.** Les environnements d'exécution de certains agents n'ont ni réseau ni pnpm : `prisma generate`, `typecheck`, `lint`, `test`, `test:int` y sont **impossibles**. Exiger que l'agent dise explicitement ce qu'il a *réellement* exécuté.
- **Après CHAQUE extraction de zip, avant toute autre chose :**
  ```
  git status --short
  ```
  **Tout fichier modifié hors du périmètre annoncé du lot est un retour en arrière silencieux.** C'est le détecteur qui manquait : cinq lots ont été intégrés en Frankenstein faute de cette ligne. Les zips de Opus sont des instantanés complets construits sur SA base : ils réécrivent les fichiers corrigés localement.
- **Étendre un contrat partagé casse les mocks manuels des DEUX apps** — et **toute modification d'un `select` Prisma casse les mocks des tests qui doublent cette requête** (règle élargie après A10). Mettre à jour dans le même commit.
- **Zips : `git archive` uniquement**, avec auto-contrôle avant envoi portant sur les **modifications**, pas seulement sur les fichiers neufs :
  ```
  unzip -p projet.zip <un fichier PRÉ-EXISTANT que le lot devait modifier> | grep -c "<motif du lot>"
  ```
  Contrôler uniquement la présence des fichiers neufs est ce qui a laissé passer A10 et A11 amputés de tous leurs édits.
- **Fins de ligne** : le repo est en CRLF. Nouveaux fichiers en CRLF ; fichiers modifiés : conserver leur convention.
- Le design existant (`design.tsx` / Figma Make) sert de **référence visuelle uniquement**.

### Bac à sable de vérification (Claude)
```
su postgres -c "pg_ctlcluster 16 main start"
pnpm install
pnpm --filter @zwadj/types run build          # AVANT tout typecheck de l'API
PRISMA_SCHEMA_ENGINE_BINARY=/bin/true pnpm --filter @zwadj/api run prisma:generate
pnpm -r --no-bail run typecheck               # --no-bail : sinon 1 projet sur 8 visible
pnpm -r run lint
pnpm -r run test
ALLOW_PG_LT18_POLYFILL=1 pnpm test:int        # setup-global rejoue chaque migration.sql dans l'ordre
```
PostgreSQL 16 + polyfill, pas 18 : le passage local de Ko reste la référence.

⚠ **Correction d'une commande fausse** : `pnpm prisma:generate` à la racine n'existe pas — c'est un script d'`apps/api` uniquement (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL` sinon). La ligne correcte est celle ci-dessus, `pnpm --filter @zwadj/api run prisma:generate`. Découvert au Lot A6a en reconstruisant l'environnement depuis zéro.

---

## Découpage du Flux B — ✅ TERMINÉ (B1 → B6)

- **B1 — ✅ Créneaux de fête.** CRUD pro `/venues/:id/slot-templates`.
  - ⚠ **Erreur de conception rattrapée, à ne PAS refaire** : `endMinutes` avait été plafonné à 1440 en Zod, ce qui interdisait la soirée 20h→02h — le créneau le plus courant du pays. Le `CHECK` autorisait 2880. **Le schéma fait autorité sur l'intuition** (origine de D55).
  - ⚠ **Second piège** : une migration redéclarait `slot_templates_minutes_valid`, déjà posée. `setup-global` rejoue chaque `migration.sql` → erreur `42710`. **Grep des migrations existantes avant de nommer quoi que ce soit.**
  - Chevauchement sur intervalles **semi-ouverts** : deux créneaux qui se TOUCHENT (14h–18h et 18h–22h) ne se chevauchent pas.
  - Contrat pro ÉTENDU (`VenueProDTO.slotTemplates`) : a cassé les fixtures de l'app Pro — voir la dette de test soldée plus bas.
- **B2 — ✅ Moteur de prix.** `pricing-engine.ts` **PUR**, zéro accès base, zéro `new Date()`.
  - Migration DESTRUCTIVE : `DELETE FROM pricing_rules`. **FK COMPOSITE `(slot_template_id, venue_id)`** (patron A4).
  - Départage FINAL par `id` après la date de création : sinon deux règles créées dans la même transaction donneraient un résultat non déterministe.
  - **`venues.base_price_cents` = minimum des créneaux actifs ET de leurs règles actives.** Recalculé transactionnellement.
  - Le TYPE d'une règle n'est **pas modifiable** ; les champs requis dépendent du type. `roundToDinar` existe mais n'est pas encore appelée.
  - ⚠ **`PricingRule.venueId` est OBLIGATOIRE** : un seed qui ne pose que `slotTemplateId` échoue en `PrismaClientValidationError`.
- **B3 — ✅ Disponibilité publique + blocages pro** (D48–D51). `AvailabilityBlock` et ses index GiST existaient DÉJÀ : **aucune migration**.
  - `availability-engine.ts` **pur**, 13 tests. Tout en **millisecondes époque**.
  - **Quatre états par gravité : `BLOCKED` > `BOOKED` > `REQUESTED` > `AVAILABLE`.** `REQUESTED` ne verrouille rien mais **on le dit** — laisser croire à une case libre puis annoncer un concurrent au devis est la pire surprise d'un parcours de mariage.
  - **Le recouvrement HORAIRE fait foi, pas l'identité du créneau** : un walk-in 19h→23h sans `slotTemplateId` occupe la soirée.
  - **`SINGLE_SLOT` : une réservation dure ferme TOUTE la journée**, mais un `BLOCKED` n'est **pas** écrasé en `BOOKED`.
  - ⛔ **Reste, à l'acceptation d'une réservation (lot ultérieur)** : **attraper** `bookings_no_overlap_accepted_confirmed` pour la traduire en conflit propre, **jamais la redoubler** en code applicatif. Le verrou `FOR UPDATE` de D51 est déjà en place.
- **B4 — ✅ UI Pro, en quatre tranches.**
  - **B4a** — les **9 méthodes** `@zwadj/api-client` (créneaux, règles, blocages). ⚠ **B1, B2 et B3 avaient livré leurs endpoints sans AUCUNE contrepartie client** ; le vérifier fait désormais partie de la revue d'un lot API.
  - **B4b** — volet créneaux + prix (`slots-section.tsx`, `slot-time.ts`), D52.
  - **B4c** — variantes de prix par créneau (`pricing-rules-editor.tsx`), D53.
  - **B4d** — volet blocages (`blocks-section.tsx`, `block-time.ts`), D54.
  - ⚠ **Bug réel attrapé en B4d** : `useApiErrorMessage` rend une **nouvelle fonction à chaque rendu**. La mettre en dépendance d'un `useEffect` **relance la requête sans fin**. En test la boucle s'arrête à deux appels (le mock rend la même référence, React court-circuite) — **contre une vraie API, elle ne s'arrêterait pas**. À lire par `useRef`. *Vaut pour toute fonction rendue par un hook de traduction.*
  - **Couplage assumé, non synchronisé** : toute écriture de créneau recalcule `Venue.basePriceCents`, que le volet n'affiche pas. Le synchroniser exigerait de recharger la salle, donc d'écraser des saisies en cours. L'écran l'annonce en clair.
- **B5 — ✅ UI Client : calendrier de disponibilité et de prix** (D56). Composant client dans une fiche rendue au serveur.
  - Le prix d'une case est le minimum des créneaux **réellement libres** : le minimum tous statuts confondus annoncerait un prix inaccessible.
  - Les **quatre** états sont nommés, `REQUESTED` compris.
- **B6 — ✅ Calendrier de la salle côté PRO** — l'écran du design fourni. Route `/salles/:id/calendrier`, lien depuis la fiche.
  - **Vue de LECTURE seule.** Les blocages se posent dans B4d, les prix dans B4b/B4c : **deux endroits pour écrire la même chose finiraient par diverger**.
  - **Il consomme l'endpoint PUBLIC**, et c'est voulu : c'est la seule source de vérité (moteur B3 + règles B2). Un endpoint pro parallèle finirait par répondre autrement, et **le pro verrait alors autre chose que ses clients**.
  - ⚠ **Conséquence assumée** : cet écran ne montre QUE ce qu'un visiteur voit. Identité des clients, acomptes et historique appartiennent au **lot Réservations** — la légende « Acompte reçu » du design attend ce lot-là.
  - **Statut du JOUR = le plus GRAVE de ses créneaux.** Prendre le plus favorable ferait passer une journée déjà vendue pour libre.
  - **La couleur est toujours doublée d'un mot** (légende + `sr-only`) : la couleur seule exclurait un pro daltonien, et ce sont ses réservations.
  - ⚠ **`pro-calendar.ts` est une COPIE assumée** de `apps/client/src/lib/calendar.ts` (bundles séparés ; `@zwadj/types` n'a pas de place pour une grille d'affichage, `@zwadj/ui` n'a pas de logique). Les deux specs existent séparément pour rendre toute dérive visible. **Si un troisième consommateur apparaît, extraire.**

## Découpage du Flux C — Visites — ✅ TERMINÉ (C1 → C5b)

- **C1 — ✅ Plages hebdomadaires de visite, CRUD pro.** `VisitAvailability` existait déjà avec ses `CHECK` : **aucune migration**.
  - Chevauchement **refusé, le MÊME jour seulement** — dimanche et lundi ne se rencontrent jamais. Deux plages **bout à bout** (fin 12:00, début 12:00) sont **acceptées**.
  - La modification vérifie l'**état RÉSULTANT**, pas le patch.
  - **Les plages ne voyagent PAS dans `VenueProDTO`.** Suppression **DURE** : `VisitBooking` porte un `scheduledAt`, pas un `visitAvailabilityId`.
- **C2 — ✅ Découpage en créneaux + `GET /venues/:slug/visit-slots`** (D58). `visit-slots-engine.ts` **pur**.
  - Les visites **ignorent totalement les fêtes**. Le passé se filtre **à la MINUTE**. Un rendez-vous `CANCELLED` **libère** son créneau.
- **C2b — ✅ Exclusivité et canaux** (D59, D60). Migration `20260729000000_visits_exclusive_and_pro_channels`.
- **C3 — ✅ Prise de rendez-vous par le client (API).** Trois routes : `POST /venues/:slug/visit-bookings`, `GET /me/visit-bookings`, `DELETE /visit-bookings/:id`. **Premières routes `@Roles(UserRole.CLIENT)` du dépôt.** Migration `20260730000000_visit_booking_contact_phone`.
  - ⚠ **Deux autorités, jamais redoublées.** L'EXISTENCE d'un créneau se décide sur les plages du pro (`computeVisitSlots` appelé avec `bookings: []`, puis test d'APPARTENANCE → 409 `VISIT_SLOT_UNAVAILABLE`). L'EXCLUSIVITÉ se décide en base et **nulle part ailleurs** : `VISIT_SLOT_TAKEN` ne sort que de la traduction du `P2002` sur `visit_bookings_no_double_confirmed`.
  - ⚠ **INTERDIT : `startMinutes % VISIT_DURATION_MINUTES`** (famille D55). Une plage 09:20→10:20 rend légitimement 09:20 et 09:50 : un modulo refuserait des créneaux **réels**. *Un test d'intégration le prouve : 09:40 refusé, 09:20 et 09:50 acceptés.*
  - ⚠ La notification part **après le commit**, jamais dans le `$transaction`, et un échec d'envoi **ne dé-réserve pas** : la ligne `Notification` passe `FAILED`.
  - **Limite ASSUMÉE de D59** : l'index porte sur l'ÉGALITÉ de `scheduled_at`. Si le pro décale une plage d'un pas non trentenaire (09:00 → 09:15), un rendez-vous à 09:00 et un à 09:15 se recouvrent sans que l'index les voie. L'alternative serait une `EXCLUDE` sur `tsrange` — migration + renversement de D59.
- **C3b — ✅ Lecture et annulation côté PRO.** `GET /pro/venues/:id/visit-bookings`, `DELETE /pro/venues/:id/visit-bookings/:bookingId`, section « Rendez-vous de visite » sur la page calendrier pro.
  - ⚠ **Le contrôleur porte `@Roles(UserRole.CLIENT)` au niveau CLASSE.** Les routes pro ne sont fermées aux clients que parce que la garde utilise `getAllAndOverride` (le décorateur de MÉTHODE remplace celui de classe). Un test d'intégration l'exige de bout en bout (403).
  - **Le CLIENT est prévenu** quand le pro annule (`visit.cancelledByPro`, e-mail). D60 règle ce que reçoit le **pro**, jamais ce que reçoit le client.
- **C4 — ✅ Écran pro des plages de visite** (livré avec C1/C3b).
- **C5 — ✅ Écran client de prise de rendez-vous.** `visit-booking-panel.tsx` sur la page salle + `createVisitBookingsClient` dans `@zwadj/api-client`.
  - Les créneaux s'affichent **sans compte** (route `/visit-slots` anonyme) ; seule la RÉSERVATION exige la session. Exiger de se connecter pour *regarder* ferait fuir avant de montrer.
  - Un créneau **pris reste affiché**, `disabled` (D59). Après un **409**, la liste est **rechargée** : le cas est réel (deux visiteurs, une seconde d'écart), et réafficher une liste périmée invite à rejouer le même échec.
  - Le bouton « Réserver une visite » **inerte a été RETIRÉ** : deux appels à l'action pour la même chose, dont un mort, apprennent surtout que le site ne marche pas. Celui de *réservation de fête* reste inerte (Flux B), avec sa raison écrite.
- **C5b — ✅ « Mes rendez-vous » côté client.** `visit-bookings-section.tsx`, montée dans la page compte.
  - Les rendez-vous **passés restent listés** (historique) mais **sans bouton** : l'API répondrait 409 `VISIT_BOOKING_PAST`, et proposer un geste qui échoue toujours est pire que ne rien proposer.
  - ⚠ **Garde de FORME sur la réponse** (`Array.isArray`) : montée dans la page compte, cette section faisait tomber **profil, e-mail et mot de passe** quand `rows.map` levait. **Une section qui échoue doit échouer seule.**

### Décisions verrouillées du Flux C (C3 → C5b)

- **D61 — corps de la demande.** `{ date, startMinutes, phone? }` strict, **jamais un instant ISO** (sinon le navigateur choisit le fuseau, contre D48). Téléphone client **FACULTATIF** (décision de Ko : l'exiger coûterait des rendez-vous ; le pro a toujours l'e-mail) ; celui du **pro** est structurellement obligatoire, c'est le destinataire WhatsApp. Résolution : `body.phone ?? User.phone ?? null`, **snapshotée** dans `visit_bookings.contact_phone` (nullable, **aucun `CHECK`** — `dzPhoneSchema` valide déjà, et valider deux fois la même borne est interdit par D55). Nom et prénom lus par la relation, **jamais snapshotés** : un compte anonymisé (loi 18-07) doit faire disparaître le nom d'un rendez-vous passé.
- **D62 — annulation.** `status = CANCELLED` + `cancelledAt`, **jamais de DELETE** : le filtre partiel libère le créneau, la ligne reste la trace. Idempotente (204 sans seconde écriture), **409 `VISIT_BOOKING_PAST`** sur un rendez-vous passé — « le client a annulé » et « le client n'est pas venu » ne sont pas le même fait. Garde anti-nuisance : **un seul rendez-vous CONFIRMÉ à venir par (client, salle)** → 409 `VISIT_ALREADY_BOOKED`. ⚠ Cette garde est **applicative et c'est assumé** : aucun index ne l'exprime sans interdire aussi de revenir six mois plus tard. Une course donne au pire **deux** rendez-vous au même client — bénin, contrairement au double-booking.
- **D63 — notification.** Port `WHATSAPP_SENDER` + `DevLoggerWhatsAppSender`, symétrique d'`EMAIL_SENDER`. **Aucun fournisseur réel** : l'API Cloud de Meta exige un compte business vérifié, un numéro dédié et un modèle approuvé — des semaines d'ops qui ne doivent pas retenir un lot. Envoi **synchrone après commit** ; `pg-boss` n'est dépendance de rien et l'introduire signifierait un worker, un schéma et un mode de déploiement de plus. Les lignes `FAILED` sont exactement ce qu'un job de rejeu consommera. Langue décidée par `User.locale` du **destinataire**, jamais par l'`Accept-Language` de la requête déclenchante.
- **D70 — la fenêtre pro n'est PAS écrêtée au présent.** `clampWindow` (D49) sert aux **disponibilités** : proposer un créneau passé n'a aucun sens. Ici le passé est l'**historique** du pro — qui est venu, qui ne s'est pas présenté — et l'écrêter le lui retirerait à chaque requête. Le schéma `availabilityWindowQuerySchema` est réutilisé pour la forme et la largeur maximale ; seul l'écrêtage ne s'applique pas.

## Tranche A13 — Styles et type de mariage (✅ A13a → A13c)

Un seul sujet, découpé en trois lots — **et le découpage a été une erreur** : A13b a livré des filtres client sur une donnée que le pro ne pouvait pas encore saisir. Ko a demandé qu'un sujet API + pro + client tienne désormais dans **un seul lot**.

- **A13a — ✅ API + données.** Migration `20260730120000_venue_styles_and_ceremony_type` : table `venue_styles` + jointure `venue_style_links` + enum `CeremonyType` + colonne nullable sur `venues`.
  - **D65 — styles : référentiel, filtre en OU.** Modèle calqué sur `Amenity`. Cocher Jardin *et* Bord de mer rend l'**union**, pas l'intersection — c'est l'**inverse des équipements**, qui restent en **ET** dans la même requête. Un style est un goût, un équipement une exigence. *Un test prouve les deux sémantiques dans une seule requête.*
  - **D66 — type de cérémonie : filtre INCLUSIF et ASYMÉTRIQUE.** `outdoor` rend aussi les `MIXED`, `indoor` aussi ; mais `mixed` ne rend **que** les `MIXED`. Filtrer par égalité cacherait toutes les salles mixtes à qui cherche l'extérieur. Colonne **nullable** : « non déclaré » doit rester distinct d'« Intérieur ».
  - **D68 — plage de capacité.** `guests` (plancher, D36 inchangé) et `maxCapacity` (plafond) portent **tous deux sur `capacityMax`** : ils doivent être fusionnés en **un seul** objet Prisma, sinon le second écrase le premier dans le littéral. Plage inversée ⇒ **400** avec clé i18n, jamais une liste vide (qui laisserait croire qu'il n'y a pas de salles).
- **A13b — ✅ Panneau de filtres client.** Curseurs à **deux poignées** (capacité 20→500+, budget 0→1,5 M+), puces de style et de type, services avec icônes.
  - **D69 — une poignée EN BUTÉE ne filtre pas.** Un curseur exprime un *rétrécissement* : à pleine largeur il ne rétrécit rien, donc le paramètre est **OMIS**. Sans cette règle, le panneau au repos excluait déjà des salles, et « 500+ » affichait **moins** de résultats que « 500 ». La sentinelle est la **borne elle-même** — `maxCapacity=500` SIGNIFIE « 500 ou plus » — ce qui survit à l'absence de JS (un `input[type=range]` soumet toujours sa valeur).
  - Bornes déclarées dans `search-query.ts`, lues par la vue **et** par le parseur : deux copies = un jour où l'écran affiche « 500+ » pendant que l'API reçoit un plafond de 500.
  - **Plage inversée redressée côté serveur** : sans JS rien n'empêche de croiser les poignées, et un 400 sur une page publique indexée est un accident.
  - Puces de style = **cases** (OU) ; type = **radios** (choix unique). Pas de puce « Tous » (retirée en UI-D3) : recliquer la puce choisie la décoche ; sans JS c'est « Réinitialiser » qui joue ce rôle.
- **A13c — ✅ Saisie côté pro.** `StylesPicker` dans le formulaire salle + `listVenueStyles` dans `@zwadj/api-client`.
  - ⚠ **Effacer le type envoie `null`, jamais rien** : omettre le champ voudrait dire « ne change pas », alors que le pro vient d'effacer sa déclaration. C'est ce que D66 achetait en rendant la colonne nullable.
  - ⚠ Piège de fixture : `venueUpdateSchema` valide `styleIds` en **UUID**. Une fixture en « st-1 » échoue la validation **avant tout appel réseau**, et le test se lit « le formulaire n'envoie rien » alors qu'il refuse la fixture.

## Découpage du Flux E — Réservation, prestations, devis — ✅ TERMINÉ (E1a → E2e)

**Constat d'audit qui a évité une migration inutile :** la migration
`20260707000001_booking_constraints` avait TOUT posé depuis juillet — l'`EXCLUDE
USING gist` anti-double-réservation `WHERE status IN ('ACCEPTED','CONFIRMED')`,
l'index GiST tous statuts pour les conflits `PENDING`, celui des blocages, les
`CHECK` de montants, et `service_pricings_shape`. Le Flux E entier n'a demandé
que **deux migrations minuscules**.

### Décisions verrouillées du Flux E

- **D71** — La porte i18n compare le **TOTAL**, pas seulement les deux locales
  entre elles : plancher + listes nominatives des namespaces déjà effacés une
  fois. La parité FR = AR reste verte devant une suppression **symétrique**.
- **D72** — Les codes d'erreur API se traduisent par **table explicite**, jamais
  par concaténation `venue.errors.${code}` : les codes sont en `SCREAMING_SNAKE`,
  les clés en `camelCase`, et une clé bâtie à la volée **s'affiche** au lieu
  d'échouer bruyamment.
- **D73** — Un seul appel à l'action par intention sur le détail salle. Bouton
  inerte de visite retiré, **figé par un test**.
- **D74** — Aucune ligne `Quote` en E1 : `Booking` snapshote déjà ses montants.
- **D75** — Le prix est **recalculé par le serveur** ; le client annonce
  `expectedTotalCents` **et** `expectedDepositCents`. Divergence ⇒ 409
  `BOOKING_PRICE_CHANGED` portant les montants réels. Sans cette garde, un pro
  qui change son tarif entre l'affichage et l'envoi engagerait le client sur un
  montant jamais vu.
- **D77** — Plage bloquante matérialisée à la création. `SINGLE_SLOT` = la
  **journée locale entière** : c'est la plage, et non une règle applicative, qui
  matérialise « une réservation par jour ». ⚠ `endMinutes` monte à 2880 : un
  20h→02h finit **le lendemain**.
- **D78** — Trois questions, trois autorités, **jamais redoublées**. L'existence
  du créneau vient du calendrier B3 ; l'**exclusivité** vient de la base et
  d'elle seule (`23P01`) ; le conflit avec un **blocage** est applicatif, dans la
  transaction, sous `SELECT … FOR UPDATE` — une `EXCLUDE` ne traverse pas deux
  tables.
- **D79** — `bookings.client_message`, plafonné par Zod **seulement**.
- **D80** — E1 s'arrête à `ACCEPTED`. ⚠ **Dette assumée** : une demande acceptée
  verrouille son créneau **indéfiniment** jusqu'au lot Paiement ; seule
  l'annulation par le pro la libère. L'écran pro le **dit** explicitement.
- **D81** (remplace D76) — **Acompte PAR SALLE** : pourcentage **ou** montant
  fixe, deux colonnes + `CHECK` d'exclusivité. ⚠ Un acompte fixe **supérieur au
  total** est **ÉCRÊTÉ**, pas refusé (D55 : la salle est légitime, le créneau
  aussi, c'est le calcul qui plie).
- **D82** — Date strictement future, horizon 18 mois (D49) ;
  `expiresAt = min(création + 7 j, startsAt)` ;
  `paymentDueAt = min(acceptation + 48 h, startsAt)`.
- **D83** — Motifs **asymétriques** : le pro refuse sans motif ; le client doit un
  motif pour annuler une demande **ACCEPTED**. L'asymétrie suit celle du
  préjudice.
- **D84** — Le défaut d'acompte appartient à la **COLONNE** (`DEFAULT 3000`), pas
  au service : sinon un seed ou un `INSERT` brut produit une salle invalide.
- **D85** — Le **dernier** appel à l'action inerte a disparu du détail salle.
  `bookingCta` et `ctaSoon` supprimées **symétriquement**, absence figée par deux
  tests.
- **D86** — Le volet acompte n'existe qu'à l'**édition** (la colonne a son
  défaut). **D87** — Pourcentage saisi en **pourcents**, stocké en **bps**,
  conversion à un seul endroit. **D88** — Toute action pro **recharge** la liste,
  y compris après un 409 : l'échec signifie précisément que l'affichage est
  périmé.
- **D89** — Le service et son tarif naissent **ensemble**, une transaction : la
  base garantit la *forme* d'une ligne `service_pricings`, **pas** qu'elle
  corresponde au type déclaré.
- **D90** — Ni le `pricingType` ni les prix ne se modifient : supprimer et
  recréer est plus honnête que des lignes snapshotées sur un type disparu.
- **D91** — ⚠ **La quantité n'est pas toujours choisie par le client.**
  `PER_GUEST` prend les **invités de la demande**, jamais une saisie — sans quoi
  « 10 » sur un menu à 2 000 DA pour 250 personnes donnerait 20 000 DA au lieu de
  500 000. Une quantité fournie sur un `PER_GUEST` est **refusée**.
- **D92** — `expectedTotalCents` inclut les prestations. **D93** — La suppression
  d'une prestation ne couvre que « créée par erreur, jamais utilisée » : 409
  `SERVICE_IN_USE` sinon. ⚠ Le snapshot sauve l'**affichage**, pas la
  **jointure** — un nettoyage effacerait l'historique commercial.
- **D94** — Cinq statuts de devis stockés, **pas d'`EXPIRED`** : dérivé de
  `validUntil`. Un statut que rien ne fait basculer devient un mensonge en base
  (leçon D80). **D95** — `SUPERSEDED` ≠ `DECLINED` : « remplacé » et « refusé »
  n'appellent pas la même réponse devant un litige.
- **D96** — `chainId` **dénormalisé**, seule autorité de l'unicité : un index
  unique **ne peut pas s'appuyer sur une CTE récursive**, donc `parentQuoteId`
  seul ne suffit pas.
- **D97** — ⚠ **Rétrograder PUIS activer**, même transaction. Les index partiels
  `quotes_one_*_per_chain` **ne sont pas différables** (`DEFERRABLE` ne
  s'applique qu'aux *contraintes*, et `UNIQUE` n'accepte pas de `WHERE`) : ils
  sont vérifiés à chaque instruction. **L'ordre n'est pas une précaution, c'est
  le seul chemin qui passe.**
- **D98** — Règle unique : toute version qui devient active remplace la
  précédente active de sa chaîne (« active » = `SENT` ou `ACCEPTED`).
  **D99** — Un `DRAFT` ne s'accepte pas ; la supersession est irréversible.
- **D101** (remplace D100) — ⚠ **L'acceptation d'un devis n'est PAS une action,
  c'est une CONSÉQUENCE.** Chaîne obligatoire, dans cet ordre : devis `SENT` →
  demande `PENDING` → **le pro accepte la date** → **l'acompte est encaissé** ⇒
  `Booking CONFIRMED` **et** `Quote ACCEPTED`. Les deux conditions sont
  nécessaires. **Corollaire majeur : les parcours en ligne et en présentiel ne se
  distinguent que par l'ACTEUR et l'INTERFACE — mêmes lignes, mêmes statuts,
  mêmes transitions, aucune logique séparée.**
- **D102** — `POST /quotes/:id/convert` crée une demande **`PENDING`** ; le devis
  reste `SENT`. `bookings.quote_id` étant `UNIQUE`, un devis ne se convertit
  qu'une fois : 409 `QUOTE_ALREADY_CONVERTED`, une nouvelle négociation passe par
  une nouvelle **version**.
- **D103–D106** (écran catalogue) — Le type est annoncé **avant** le sélecteur ;
  l'avertissement `PER_GUEST` est **chiffré** (« pour 250 invités, 2 000 DA
  donnent 500 000 DA ») ; « Retirer de la vente » passe **avant** « Supprimer » ;
  le corps envoyé dépend **strictement** du type.
- **D107–D110** (catalogue public + sélecteur client) — Exposé sur le **détail**,
  jamais sur la liste ; **`toServiceDTO` partagé**, jamais recopié ; ⚠ **le
  nombre d'invités vit HORS du bloc connecté** — il multiplie le prix des
  prestations, le cacher afficherait un prix faux à qui n'a pas de compte ;
  palier et quantité n'apparaissent que si la prestation est cochée.
- **D111–D114** (écran devis) — Le bouton dit **« Créer la demande », jamais
  « Accepter »** (conséquence de D101) ; un devis converti l'annonce ; les devis
  sont groupés par **chaîne** avec l'historique repliable ; l'expiration s'affiche
  là où elle est calculée.

### ⚠ Le point d'architecture à retenir du Flux E

**Un `Quote` en `DRAFT` EST une estimation à blanc.** Le pro le crée, le serveur
le chiffre, l'écran affiche ce qu'il rend. C'est ce qui a évité une **troisième**
arithmétique monétaire côté navigateur en E2e — il n'y avait pas de route à
inventer, elle existait déjà.

⚠ **Seuil posé avec Ko, toujours valable** : `previewDeposit` et `lineTotal`
dupliquent déjà des calculs serveur côté client (affichages protégés par le 409
de D75). **Au prochain besoin de calcul monétaire dans un navigateur, passer par
le serveur** plutôt qu'ajouter une copie.

---

## Lot F1 — Canaux de notification D60 — ✅ TERMINÉ

La dernière dette du Flux C, ouverte depuis C2b. **Aucune migration** : le
`CHECK pro_profiles_one_channel_required` existait depuis `20260729000000`, il ne
manquait que la surface.

- **D115** — Deux booléens exposés tels quels, pas un enum.
- **D116** — Les canaux voyagent **avec la session** (`AuthUserDTO.proProfile`) :
  sinon l'écran ne saurait pas quoi cocher au montage.
- **D117** — ⚠ **Garde anti-silence à TROIS niveaux, aucun de trop.** Zod attrape
  les deux canaux coupés dans le **même corps** ; le **service relit la ligne**
  (le PATCH est partiel — couper l'e-mail coupe *tout* si le SMS était déjà à
  `false`, et Zod ne voit pas la base) et rend un 400 lisible ; le **`CHECK` SQL
  reste le dernier mot**. On ne prétend pas fermer la course entre la lecture et
  l'écriture — seulement rendre le cas courant compréhensible.
- **D118** — L'écran annonce le refus **avant** l'envoi, et dit ce qui est en jeu
  plutôt que la règle : « sans e-mail ni SMS, vous ne verrez plus les demandes
  arriver ». Sous request-to-book, une demande que personne ne voit **expire
  toute seule**.

---

## Passes UI (D1 → D4) — thème sombre, langue, mise en page

- **UI-D1 — ✅ Onglet actif souligné + mode sombre (D64).** Soulignement de 2 px avec `margin-block-end: -1px` (sans ce décalage, le trait et la bordure d'en-tête se superposent et l'onglet flotte).
  - **Correction ASSUMÉE du design** : il gardait `--on-accent: #fff` en sombre, soit **2,88:1** sur son accent — échec AA sur chaque bouton plein. L'encre d'un bouton accent sombre est donc **sombre** (6,55:1). Un accent qui s'éclaircit **inverse** la couleur du texte qu'il porte.
  - **Trouvé mort** : `apps/client/src/app/globals.css`, importé par personne, portait encore la palette framboise `#C81E63` périmée et un `:root` complet de neutres. **Supprimé** (543 lignes) — réimporté par erreur, il écrasait les tokens de `@zwadj/ui` selon l'ordre d'import.
- **UI-D2 — ✅ Correction d'une RÉGRESSION que UI-D1 avait causée.** Les neutres sombres posés dans `@zwadj/ui/styles.css` s'appliquaient aussi au **pro**, qui gardait ses accents clairs : bouton `#211C1B` sur fond `#111111`, **1,12:1**, invisible. **Poser des tokens partagés sans traiter TOUS leurs consommateurs livre la moitié d'un changement.**
  - L'accent pro est monochrome : en sombre il ne s'éclaircit pas, il **s'inverse**.
  - Les 4 remplissages d'état du calendrier pro étaient **en dur dans les règles** : passés en variables, versions profondes qui gardent la **teinte** (c'est elle qui porte le sens, pas la clarté).
  - ⚠ **`packages/ui/theme-storage.ts` est SANS React et à la racine du paquet** : le layout racine du client est un composant **serveur**, y importer le baril `@zwadj/ui` y ferait entrer `useRef`/`useEffect` et Next refuse de compiler.
- **UI-D3 — ✅ CLAIR PAR DÉFAUT.** `prefers-color-scheme` **retiré des trois feuilles** : Zwadj s'ouvre en clair, en français comme en arabe ; le sombre est un **choix**, jamais un état subi. `currentTheme()` aligné dans la foulée — si le JS consultait encore le système pendant que le CSS ne le fait plus, le premier clic sous système sombre poserait `light` sur une page **déjà claire** (deux clics pour un changement).
  - Les listes du panneau sortaient **sans aucun style** : `.filter-block` n'hérite pas de `.field`. Flèche laissée **native** — la dessiner impose un `background-position` **physique** que le RTL n'inverse pas.
  - `amenity-icon.tsx` **déplacé** de `apps/pro` vers `packages/ui` : une copie aurait divergé au premier équipement ajouté. `lucide-react` devient dépendance de `packages/ui`.
- **UI-D4 — ✅ Filtres en colonne gauche + parité des boutons.** `280px + résultats` au-delà de 900 px ; barre `sticky`.
  - ⚠ **`dashboard.tsx` n'est PLUS routé** : le vrai en-tête pro est `shell/pro-header.tsx`. Câbler le premier laissait le pro sans thème ni langue après connexion.
  - **Seed de DÉMONSTRATION séparé** : `pnpm --filter @zwadj/api run db:seed:demo`. Séparé parce qu'un test d'intégration vérifie les **comptes exacts** du seed de production — y glisser de fausses salles les enverrait en prod et casserait ce test. Idempotent, six salles, styles et types renseignés, **sans photos** (une photo suppose un fichier réel sur le stockage ; en inventer les lignes donnerait des vignettes 404).

- **UI-D5 — ✅ Cartes de résultats au design + jeu de salles FICTIVES.** *Lot livré hors des sessions de vérification ; audité a posteriori sur le zip de Ko.*
  - `apps/client/src/lib/preview-venues.ts` : six salles inventées pour juger la grille quand la base est vide ou l'API éteinte. **Trois garde-fous** : activation décidée dans la page SERVEUR (`NODE_ENV !== "production"`), bandeau visible au-dessus de la grille, et `PreviewVenue` **étend** `VenueSummaryDTO` — un jeu de démonstration qui passerait par un autre chemin de rendu ne prouverait rien du rendu réel.
  - `formatRating` ajouté à `@zwadj/i18n` : note **toujours à deux décimales** (« 4,9 » et « 4,90 » se lisent comme deux notes différentes dans une grille où les cartes se comparent du regard).
  - Note, nombre d'avis et badges sont **fictifs à part** : `VenueSummaryDTO` ne les porte pas, l'API ne les sert pas encore (les avis relèvent d'une tranche ultérieure). La carte les rend **conditionnellement** — une salle réelle sort sans étoile, sans que rien ne casse.
  - ⚠ **`icons.tsx` corrige un commentaire devenu faux** : « le dépôt n'a aucune dépendance d'icônes » n'est plus vrai depuis que `amenity-icon.tsx` consomme `lucide-react`. Imports **nommés explicites** uniquement.
  - ⛔ **RISQUE PRODUIT à trancher** : l'étiquette du tri est passée de « Plus récentes » à **« Recommandé »**, alors que la valeur envoyée à l'API reste `recent` et qu'**aucun algorithme de recommandation n'existe** (backlog 23.8). L'écran annonce donc un classement que le serveur ne fait pas. Deux issues : revenir au libellé honnête, ou tenir la promesse.
  - ⛔ **C'est ce lot qui a écrasé C5/C5b** (voir l'alerte en tête de document).

## ⛔ MIGRATIONS — `prisma migrate dev` est INTERDIT

Une seule exécution a **détruit la FK composite B2** en base de développement. Prisma propose de supprimer tout ce qu'il ne sait pas exprimer :

- `bookings_no_overlap_accepted_confirmed` (EXCLUDE GiST) — l'anti-double-booking ;
- `visit_bookings_no_double_confirmed` (unique PARTIEL, D59) ;
- `pricing_rules_slot_belongs_to_venue` (**FK COMPOSITE**, B2) ;
- `payments_one_paid_per_booking`, `cashback_one_active_per_booking`, `account_deletion_requests_one_pending`, `venues_public_list_idx` (partiels) ;
- `bookings_venue_timerange_gist`, `availability_blocks_venue_timerange_gist` (GiST) ; tous les `CHECK`.

La migration générée échoue en cours de route (`DROP INDEX` sur un index qui porte une contrainte) et **ce qu'elle a supprimé avant l'échec n'est pas rendu**.

**Procédure : la migration s'écrit à la MAIN**, puis `pnpm --filter @zwadj/api run prisma:migrate` (= `migrate deploy`, qui applique sans jamais générer). `prisma:migrate:dev` échoue volontairement avec le motif. Tout objet créé en SQL **doit** recevoir sa déclaration Prisma quand elle existe (`@@index`, `@@unique`) — deux dérives ont été corrigées ainsi : `@@index([ceremonyType])` sur `Venue` et `@@unique([id, venueId])` sur `SlotTemplate`.

## Lots transverses livrés

- **UI-N1 — ✅ Navigation principale du site client.** `site-nav.tsx`, placé par `site-chrome.tsx`. Elle manquait : il fallait taper `/fr/salles` à la main.
  - **Les rubriques non construites ne sont PAS des liens.** Le design en prévoit six, deux existent. Câbler les quatre autres produirait quatre 404 — **pire qu'une absence**, parce que le visiteur croit à une panne plutôt qu'à un chantier. Elles sont du texte marqué « Bientôt », hors de l'ordre de tabulation.
  - ⚠ **`usePathname` vient de `../i18n/navigation`, jamais de `next/navigation`** : le premier rend `/salles`, le second `/fr/salles`. Comparer au chemin brut casserait l'état actif **en arabe seulement**. Un test fige ce contrat.
  - `aria-current="page"` porte l'état actif ; une classe CSS n'apprend rien à un lecteur d'écran. Pas de menu burger : sur mobile la barre **défile**. Propriétés **logiques** partout (`inline`), sinon l'arabe RTL décale la barre.
- **Dette de test soldée — `apps/pro/src/test-support/client-doubles.ts`.** `VenueProClient` était recopié à l'identique dans **sept** fichiers de test ; chaque extension du contrat les cassait tous les sept (vécu en B1, puis en B4a). Une seule définition désormais : `makeVenueClientDouble`, `makeAuthDouble`, `makeReferentialsDouble`, `PRO_USER`. **~230 lignes supprimées.**
  - ⚠ Les mocks sont créés **à chaque appel** de fabrique, jamais partagés : un `vi.fn()` de portée module garderait ses appels d'un test à l'autre et rendrait les compteurs faux **dans l'ordre d'exécution seulement** — échec qui n'apparaît qu'en CI.
- **`PriceInput` est EXPORTÉ** de `venue-form.tsx` : une seconde saisie de prix dériverait de D40 (groupement + curseur) et D43 (unité par alignement).
- **`Intl` pour les mois et les jours**, pas de clés i18n : 19 clés de plus auraient été 19 occasions de divergence FR/AR pour des libellés que la plateforme connaît déjà.

## Pièges d'outillage rencontrés à l'exécution (pas en relecture)

- ⚠ **`noUncheckedIndexedAccess` est actif** : un `Record<string, string>` indexé rend `string | undefined` et contamine tout un fichier de test. Ids **nommés** + helper qui **lève** au lieu de propager `undefined`.
- ⚠ **Ne pas utiliser `vi.useFakeTimers()` avec `waitFor`** : `waitFor` s'appuie sur de vrais timers et se bloque jusqu'à expiration. Espionner `Date.now` suffit quand le composant ne lit l'horloge qu'une fois.
- ⚠ **D40 utilise l'espace INSÉCABLE U+00A0** : `toContain("300 000")` avec une espace ordinaire échoue.
- ⚠ **`getWeekInfo()` n'existe pas dans l'environnement de test** — et asserter dessus contredirait D56 (on **fige**, on ne dérive pas).
- ⚠ **`apps/api/.env` est absent des zips** (`git archive` respecte `.gitignore`) : `prisma:generate` échoue sans lui. `cp apps/api/.env.example apps/api/.env`.
- ⚠ **Les erreurs d'API s'assertent en `res.body.message = { code, message }`**, pas `res.body.code`.
- ⚠ **Fins de ligne CRLF** : le dépôt est intégralement en CRLF. Un script Python qui lit en *universal newlines* et réécrit sans traduction convertit le fichier en **LF** — diff de 1 878 lignes pour un import changé. Et `pnpm install` réécrit `pnpm-lock.yaml` en LF : **17 350 lignes fantômes**. Vérifier `file -b` sur chaque fichier touché avant de commiter.
- ⚠ **i18next n'est initialisé que par `main.tsx`**, que les tests ne montent pas : un test de composant pro doit appeler `initI18n()`, sinon `t()` rend la **clé**. Sournois — les tests qui n'assertent que de la donnée passent quand même.
- ⚠ **`renderTemplate` LÈVE sur une variable manquante** (volontaire : on n'envoie jamais un message troué). Un gabarit qui dit `{clientName}` là où le contexte fournit `{client}` fait partir la ligne `Notification` en **FAILED** sans qu'aucune exception ne remonte. **Asserter le statut de la ligne**, pas seulement l'appel d'envoi.
- ⚠ **La porte i18n ne détecte PAS une suppression SYMÉTRIQUE.** `i18n-parity.spec.ts` compare FR à AR : 21 clés retirées des deux locales laissent la porte **verte**. Seuls les tests de composant les ont vues (`MISSING_MESSAGE`). **Comparer le TOTAL au repère du document**, pas seulement les deux locales entre elles.
- ⚠ **Un zip DIFFÉRENTIEL ne peut pas exprimer une SUPPRESSION.** Si un lot supprime ou déplace un fichier, il faut le dire explicitement — sinon le fichier reste chez Ko. Lister `git diff --name-only --diff-filter=D` à chaque livraison.
- ⚠ **Le moteur de schéma Prisma ne se télécharge pas en bac à sable** (domaine bloqué) : `migrate diff` et `db:seed` via le CLI échouent. Contournements : `pnpm exec tsx prisma/seed.ts` directement, et appliquer les migrations par `psql` après avoir posé le polyfill `uuidv7()`.

- ⚠ **`prisma generate` échoue désormais MÊME sur `--help`** : le CLI 7.8 exige le `schema-engine` **au démarrage** alors que la génération passe par WASM, et `binaries.prisma.sh` est bloqué. Contournement vérifié — poser un stub exécutable dans `~/.cache/prisma/master/<hash>/debian-openssl-3.0.x/schema-engine` qui affiche `schema-engine-cli <hash>` (hash = `@prisma/engines-version`), puis `PRISMA_ENGINES_CHECKSUM_IGNORE_MISSING=1`.
- ⚠ **`$'\r'` n'existe pas dans `dash`.** Un contrôle de fins de ligne écrit `grep -c $'\r$'` cherche la chaîne **littérale** `\r$` et **rend 0 sur un fichier intégralement CRLF** — une porte verte pour une mauvaise raison. Mesurer en Python (`b.count(b'\r\n')`), jamais au shell POSIX.
- ⚠ **`as const` sur un `select` Prisma rend `orderBy` *readonly***, ce que les types générés refusent. Utiliser **`satisfies Prisma.XSelect`** : valide la forme sans élargir les littéraux `true` (ce qu'une annotation de type ferait). **Trois occurrences payées sur ce cycle.**
- ⚠ **`z.discriminatedUnion` refuse une option enveloppée par `.refine()`** : Zod ne lit son discriminant que sur un `ZodObject` **nu**, et `.refine()` produit un `ZodEffects`. Le schéma se charge sans erreur et **lève à l'évaluation du module**. Remonter la contrainte en `superRefine` sur l'union.
- ⚠ **`ServicePricingType.FIXED as const` ne compile pas** (`TS1355`) : c'est une propriété d'objet, pas un membre d'enum TypeScript. Le littéral direct suffit au discriminant.
- ⚠ **Sous l'adaptateur pilote, une violation d'exclusion ne remonte PAS en `PrismaClientKnownRequestError`** mais en **`DriverAdapterError`**, dont le code PostgreSQL vit dans **`cause.code`**. Lire `cause.code` **et** le nom de la contrainte — jamais le message brut, il est traduit selon la locale du serveur.
- ⚠ **Toute section qui remplit une liste depuis le réseau doit garder sa forme** (`Array.isArray`). **Trois occurrences**, dont une qui a fait tomber **49 tests d'un coup** en emportant toute la page d'édition pro. Le typage décrit ce que l'API *promet*, pas ce qu'elle *rend*.
- ⚠ **Une porte ne voit que ce qu'on lui donne à regarder.** Aucune des six ne demande « ce composant est-il monté quelque part ? » : R1 a trouvé deux écrans livrés, compilables et **inatteignables**, sans qu'aucun signal ne s'allume.
## Décisions verrouillées de la campagne qualité (D115 → D125)

**D115 — le mutex porte la SESSION, pas le jeton.** `bootstrap()` appelait
`raw("/auth/refresh")` en direct : le mutex single-flight existait et
fonctionnait, mais ne couvrait **qu'un des deux chemins** qui rafraîchissent.
Élargir le type de retour de `refreshAccessToken` → `refreshSession` est ce qui
rend l'unique chemin possible. Mesuré : 2 appels → 1.
⚠ **Ce mutex ne peut PAS couvrir deux ONGLETS** : il est par instance JS.

**D116 — fenêtre de grâce à la rotation, SANS re-rotation.** Colonne
`rotated_at` : la rotation seule donne droit à la grâce, jamais une déconnexion
ni une révocation après vol. Le rejeu gracié rend **un access token seul, aucun
`Set-Cookie`** — le pot à cookies porte déjà le jeton frais du gagnant.
⚠ La variante qui **rotait** dans la fenêtre laissait **un jeton orphelin vivant
par rechargement à deux onglets** : mesuré 1 → 2 → 11 sur dix cycles, et **10
survivaient à une déconnexion explicite**. « Se déconnecter » cessait de
déconnecter. La grâce exige aussi un **héritier vivant** (comparaison de
`created_at`, horloge Postgres des deux côtés).
⚠ **Résidu assumé** : une session ouverte sur un AUTRE appareil après ce jeton
rachète la lignée pendant 30 s. Colonne `replaced_by_id` refusée par Ko.

**D117 — le statut se lit SOUS VERROU, et une seule fois.** `assertStatus` était
lu hors transaction : deux acceptations concurrentes de la **même** demande
passaient toutes les deux, écrasaient `acceptedAt`/`paymentDueAt` et
**notifiaient le client deux fois**. L'`EXCLUDE` n'y peut rien — une ligne ne
chevauche pas elle-même. Le contrôle d'avant transaction est **supprimé**, pas
doublé (D78).
⚠ Le double `accept` **séquentiel** rendait déjà 409 : c'est ce qui masquait le
trou. Seul le cas **concurrent** passait.
⚠ Sur `send()`, **aucun défaut n'a pu être reproduit** — la sérialisation venait
de l'ordonnancement du pool de connexions, pas d'une garantie. Le correctif rend
structurel ce qui n'était qu'observé ; c'est écrit dans le code pour qu'aucune
relecture ne croie à un bug corrigé.

**D118 — socle e2e Playwright, à la demande.** Dossier `e2e/` à la racine, pile
**dédiée** sur ports dédiés (API 3101, Client 3100, Pro 5273), base `zwadj_e2e`,
`reuseExistingServer: false`, `retries: 0`.
⚠ **Serveurs de DÉVELOPPEMENT, délibérément** : `StrictMode` ne double le montage
que là, et c'est ce double montage qui a révélé D115. Contre un build de prod,
tous les tests A2 seraient verts sans rien garantir.
⚠ Le throttle se relâche par le **levier `THROTTLE_*` qui existait déjà** —
aucun aménagement du code de production n'était nécessaire.

**D119 — RBAC dérivé du routeur, jamais d'une liste écrite à la main.** 77 routes
(38 PRO, 5 ADMIN, 8 CLIENT, 16 authentifiées sans rôle, 10 publiques). Les
métadonnées sont lues là où le guard les lit.
⚠ Un huitième test **renverse la logique** : les routes authentifiées **sans**
rôle sont confrontées à une liste blanche de 16 entrées justifiées. Sans lui, une
route privée de son `@Roles` **sortait du périmètre** des sept autres.

**D120 — garde de forme ET frontière d'erreur, les deux.** `Array.isArray` sur
toute liste venue du réseau ; `SectionErrorBoundary` (la première du dépôt) posée
**par section**, jamais autour de la page.
⚠ Ce que la garde de forme ne peut pas couvrir : un tableau **valide** dont les
**lignes** sont amputées. Il faudrait valider chaque champ de chaque ligne à
chaque écran — c'est la place de la frontière.

**D121 — transitions sœurs en check-and-set.** `decline`, `cancelAsPro`,
`cancelAsClient`, `quote.decline` : `updateMany` conditionné au statut, rassemblé
dans `transitionStatus`. ⚠ **Pas de verrou ici** : aucun invariant ne traverse
plusieurs lignes ni plusieurs tables. Le `WHERE status IN (...)` fait le travail
du verrou sans en payer le prix.
⚠ `quote.convert` était différent et **pire** : la base arrêtait bien la seconde
conversion (`bookings.quote_id` UNIQUE), mais la violation remontait en **500** —
le même empêchement rendait 409 une milliseconde plus tôt.

**D122 — contrats api ↔ api-client.** Chemins appelés par `@zwadj/api-client`
confrontés au routeur Nest ; formes gelées sur le fil, écart contrôlé **dans les
deux sens** (un champ en trop est une fuite, un champ manquant casse le client).
⚠ TypeScript accepte qu'une ligne Prisma porte **plus** de champs que le DTO : un
`select` élargi passe le typecheck et part quand même sur le fil.
⚠ **4 chemins échappent au contrôle** (concaténés multi-lignes), nombre **gelé**.
⚠ `apps/client/src/lib/api.ts` **n'est pas couvert** — hors du paquet, 8 `as` non
validés.

**D123 — migration sur base NON VIDE.** Migrations appliquées sauf la dernière,
données réalistes semées, puis la dernière appliquée. `test:int` fait
`DROP DATABASE` : la classe entière des défauts qui n'existent qu'avec des
données lui échappe par construction.
⚠ **`prisma migrate deploy` sort en SUCCÈS sans rien appliquer** quand le
schema-engine est absent. Le harnais applique le SQL lui-même via `pg`. En
contrepartie il ne couvre pas `_prisma_migrations` ni les sommes de contrôle.

**D124 — contrat des tokens RÉSOLUS, pas de captures d'écran.** Les valeurs
résolues des variables CSS sont lues après cascade dans le navigateur, par app et
par thème.
⚠ Les pixels diffèrent entre Windows et Linux : des références d'image seraient
rouges au premier changement de machine, et un diff de pixels dit « quelque chose
a bougé » sans dire quoi.
⚠ Les **divergences légitimes** entre les deux thèmes sont **gelées** — exiger
zéro serait absurde, les thèmes diffèrent par dessein.

**D125 — accessibilité automatisée (axe-core).** 10 écrans, deux thèmes, page
arabe en RTL avec vérification du `dir`. 11 règles ciblées.
⚠ Les manquements connus sont **gelés au premier lancement** : exiger zéro
d'entrée rendrait le test rouge à la livraison, et « rouge = régression » doit
rester vrai. Le test refuse aussi les violations **corrigées** restées dans la
référence.
⚠ Les références de D124 et D125 **ne sont pas livrées** : elles se génèrent
(`UPDATE_TOKEN_BASELINE=1`, `UPDATE_A11Y_BASELINE=1`) puis **se relisent**. Une
référence écrite de mémoire serait fausse.
⚠ **La signature est `règle @ catégorie d'élément`, pas le nœud DOM.** La première
référence générée en vrai l'a imposé : **96 % de ses signatures (67 sur 70)**
contenaient un `:nth-child()` ou un `[href$=…]`. Vingt étaient indexées sur les
données de démonstration (`palais-des-rais`, `venue-card:nth-child(1..6)`), trois
sur la position d'un `h2` dans un formulaire. Insérer un champ ou changer une
graine aurait produit une violation « nouvelle » ET une « corrigée » pour un
simple déplacement — et on aurait pris l'habitude de régénérer sans lire. **Un gel
qu'on ne lit plus ne gèle rien.** Mesuré après réduction : **70 → 19 signatures,
0 % de fragiles.**

**D127 — préchauffage des routes avant la suite e2e.** Next et Vite compilent une
route à la PREMIÈRE demande ; avec deux workers, deux tests peuvent la demander
en même temps. Le premier vrai lancement de T4 a produit un `Test timeout` sur un
`page.goto` — pas une assertion, une navigation qui n'a pas fini.
⚠ **Le défaut n'était pas la lenteur mais la VARIANCE** : le test qui paie la
compilation dépend de l'ordre d'attribution aux workers, donc l'échec se déplace.
Un échec qui bouge finit relancé sans être lu — ce que `retries: 0` cherche à
empêcher. Un projet `warmup` avec `dependencies` paie la compilation hors de toute
mesure. ⚠ **Pas dans `globalSetup`** : rien n'y garantit que les serveurs soient
debout, et un préchauffage trop tôt échoue **en silence** en donnant l'impression
que le problème est traité. Effet mesuré : 5,1 min → **2,5 min**, 0 échec.

**D128 — le levier `THROTTLE_*` couvre AUSSI le limiteur par défaut.** Il ne
couvrait que `/auth` ; le limiteur global (100 / 60 s / IP, toutes les autres
routes) était **codé en dur** dans `app.module.ts`. Reproduit avant correctif :
sur 150 lectures consécutives d'une route publique, **51 refusées en 429**. Une
suite qui grossit échoue alors par grappes, sur des tests sans rapport avec ce
qu'ils mesurent. `DEFAULT_THROTTLE` vit désormais dans `auth.throttle.ts`, à côté
des limites d'auth : **un seul levier**, pas deux façons de désactiver la même
classe de protection. Après : **0 sur 150**.
⚠ **En production rien ne change** : `THROTTLE_DEFAULT_*` reste hors du schéma env
validé, et un test dédié vérifie **sur la source** que les défauts sont toujours
100 / 60 s — le spec tourne avec le levier posé, il ne peut pas observer le défaut
par lui-même.

**D129 — un token partagé ne se déplace PAS pour un écran.** `.alert-error`
rendait `--danger` (#dc2626) sur `--danger-soft` (#fef2f2) : **4,41:1**, sous les
4,5:1 de l'AA à 13 px. ⚠ **La cause vérifiée, pas supposée** : ce n'était pas
l'`opacity: 0.55` de `.is-soon` comme on pouvait le croire.
Correctif : token **dédié** `--danger-ink` (#b91c1c → **5,91:1**), déclaré sur les
DEUX thèmes. `--danger` est **inchangé** : il porte aussi le fond de `.btn-danger`,
les bordures d'erreur de champ et le texte d'erreur, dans les deux apps et les
deux thèmes — le bouger pour un écran, c'est exactement UI-D1 → UI-D2.
⚠ Sans la déclaration sombre, le token retomberait sur `inherit` et l'alerte
serait **pire** qu'avant. En sombre, `--dark-danger` mesure déjà 6,07:1.
⚠ `.alert-success` (#15803d sur #f0fdf4 = 4,80:1) est conforme, non touché.

**D126 — E3 se fait autrement.** Voir « ⛔ E3 — MÉTHODE RENFORCÉE ».

## Tranche UIP — Refonte de l'app Pro (D130 → D149)

Cinq livraisons enchaînées : **UIP-A** (coquille), **UIP-B** (parcours client sur
place), **D135** (contrat de contact), **UIP-C** (assistant de salle), **refonte
graphique**, puis deux correctifs de terrain. Aucun contrat d'API n'a bougé sur
A/B/C ; D135 et le correctif calendrier en ont bougé, chacun avec sa raison écrite.

### Ce que l'audit du dépôt a corrigé AVANT d'écrire une ligne

Trois « blocages » annoncés au cadrage n'existaient pas. Vérifié dans les
contrôleurs, pas supposé :

- **`POST /pro/bookings` n'est pas nécessaire.** Le parcours sur place se compose
  d'endpoints livrés : `POST /venues/:id/quotes` (PRO, `clientId` **facultatif**)
  → `send` → `convert` → `POST /pro/bookings/:id/accept`. La ligne du backlog qui
  le réclamait était en outre **périmée face à D101** : elle disait « created
  directly as `confirmed` », ce que D101 interdit.
- **Un devis converti PORTE un contact.** `quoteConvertSchema` l'exige dans le
  corps, « parce que `bookings.contact_*` est NOT NULL ». La dette « un devis sans
  `clientId` ne porte aucun contact » décrivait le devis, pas la conversion.
- **Bloquer une date, c'est `accept()`, pas E3.** `ACCEPTED` verrouille par la
  contrainte `EXCLUDE`. E3 n'ajoute que `CONFIRMED`.

### Les décisions

**D130 — La table de routes pro suit le top panel.** `/` est le **tableau de
bord**, la liste des salles passe à **`/salles`** — route enfin **déclarée** : elle
tombait sur `<Route path="*">` et redirigeait en silence, alors que la spec e2e A5
la listait déjà. `/salles/:id/calendrier` **disparaît** ; son calendrier devient
l'entrée « Calendrier », ses demandes et visites l'entrée « Demandes ».

**D131 — « Réservations » montre les DATES VERROUILLÉES** (`ACCEPTED` +
`CONFIRMED`), pas seulement `CONFIRMED`. Motif relevé dans `bookings.service.ts` :
« ce lot s'arrête à ACCEPTED. Aucune route ne mène à CONFIRMED ». Un écran filtré
sur `CONFIRMED` serait vide en permanence **et en silence**, pendant que le statut
qui verrouille réellement n'aurait aucun écran. Le jour d'E3, la ligne passe
`CONFIRMED` et l'écran devient littéralement « payées/confirmées » **sans être
retouché**. Partition étanche avec « Demandes » : une réservation ne s'annule que
depuis un seul écran.

**D132 — Le parcours de devis est le corps du tableau de bord.** `QuotesSection`
vivait sur une route démontée ; c'est déjà le parcours walk-in.

**D133 — ⚠ Une garde de forme devant un CHARGEUR sous `try/catch` est NUISIBLE.**
Trouvée par la campagne de neutralisation : deux `Array.isArray` du panneau gauche
ne mordaient pas. En cherchant pourquoi, la mesure a montré qu'elles étaient
redondantes **et** nocives — le `catch` contient déjà l'échec et affiche
« Indisponible » ; la garde le remplaçait par un **0**, c'est-à-dire un compte
FAUX présenté comme un fait sur une réponse de proxy en 502. D120 vise un `.map`
**dans le JSX**, où l'absence de garde emporte la section. Deux sentinelles
rougissent si quelqu'un les réintroduit par réflexe.

**D134 — ~~Deux compositions de devis cohabitent sur le tableau de bord~~** —
**annulée par la refonte graphique** : `QuotesSection` a été démontée sur demande
de Ko, pour être retravaillée. Voir la dette ci-dessous : cinq gestes sont
devenus inatteignables.

**D135 — L'e-mail de contact est FACULTATIF, le téléphone ne l'est pas.**
⚠ **Il n'y a eu AUCUNE migration** : `bookings.contact_email` est `String?` depuis
toujours et `contact_phone` est NOT NULL. **Seules les bornes Zod étaient plus
strictes que la base**, et elles rendaient inachevable le parcours sur place — le
cas qu'elles rejetaient est le client algérien au comptoir, pas un cas limite.
**D55, cinquième occurrence.** La clé est **omise** quand le champ est vide,
jamais `""` : `.email()` refuse la chaîne vide.

**D136 — L'étape 1 de l'assistant de salle est CRÉATRICE**, et porte exactement
les cinq champs que `venueCreateSchema` exige : `nameFr`, `nameAr`, `cityId`,
`capacityMax`, `basePriceCents`. C'est ce qui permet aux six étapes suivantes
d'écrire sur un **id réel**, et ce qui supprime l'asymétrie création/édition.
⚠ Alternative écartée par écrit : rendre `cityId`, `capacityMax` et
`basePriceCents` facultatifs fabriquerait des salles **sans prix de base**, que le
moteur de disponibilité, les règles de prix, la recherche et le devis devraient
tous apprendre à contourner.

**D137 — L'étape courante vit dans l'URL** (`?etape=N`), jamais dans un état
local : rechargement, bouton retour et adressabilité a11y viennent gratuitement.

**D138 — Un « Suivant » inactif DOIT dire ce qui manque**, et les messages par
champ n'apparaissent que sur les champs **remplis**. Défaut trouvé en exécutant :
désactiver le bouton supprimait du même coup l'affichage des messages, si bien
qu'un prix « 150000.5 » laissait le bouton grisé **sans indiquer le champ fautif**.
Une validation qui se tait accuse sans instruire ; une validation qui parle trop
tôt accuse d'avance.

**D139 — « Franchissable » ≠ « déjà visitée ».** Une salle existante ouvre les
sept étapes ; elles se referment toutes si l'étape 1 cesse d'être valide.

**D140 — Un seul calendrier, PILOTABLE.** `VenueCalendar` sert l'écran Calendrier
et le sélecteur de date du parcours. Une copie aurait été une seconde autorité sur
« ce jour est-il libre ? » (D78).

**D141 — Une seule chaîne de devis par session.** Le premier calcul crée, les
suivants appellent `revise`. Un devis par clic gonflerait de trois le dénominateur
du compteur de transformation pour une négociation à trois allers-retours.

**D142 — Une garde de forme se met devant un RENDU** (complète D133).
⚠ La mesure a corrigé la justification elle-même : un champ de mauvais **type**
n'écroule pas React, **il l'affiche**. Sans garde, l'entonnoir annonce « deux
envoyés · undefined aboutis ». Plus insidieux qu'une chute — une chute se voit.

**D143 — Un champ de saisie porte un `<label>` VISIBLE.** `aria-label` seul sert
les tests et la voix, et laisse quatre cases nues indistinguables à l'œil.

**D144 — ⚠ Un script de neutralisation compte ses EXÉCUTIONS autant que ses
remplacements.** `vitest -t <filtre>` sort en **0 quand aucun test ne
correspond** : après réécriture des tests, trois filtres ne matchaient plus rien
et le script lisait ces « 0 » comme « la garde est inutile ». C'est le vert creux
que ce script existe pour attraper, un étage au-dessus de lui. ⚠ La première
correction ne lisait que les « passed » et ratait le format `Tests 1 failed (1)` :
elle déplaçait le faux négatif au lieu de le supprimer. Le compteur lit le total
entre parenthèses.

**D145 — Le calendrier a DEUX PORTES et UN SEUL MOTEUR.** `bySlug` (publique,
filtre de publication intact) et `byIdForOwner` (pro, par propriétaire, sans ce
filtre) appellent le même `compute`. Un test d'intégration exige
`expect(pro).toEqual(pub)` sur une salle publiée : si les deux divergeaient d'un
centime ou d'un statut, le pro verrait autre chose que ses clients.

**D146 — ⚠ Une décision de RÉUTILISATION d'endpoint se vérifie sur l'état RÉEL le
plus courant de la donnée.** Le calendrier pro consommait la route publique — le
motif de B6 était juste (ne pas dupliquer le moteur), la vérification manquait.
`PUBLIC_BASE_WHERE` exige `publicationStatus = PUBLISHED`, or l'état courant d'une
salle neuve est **brouillon** : aucun pro ne pouvait voir son propre calendrier
avant publication, et la refonte a fait mourir l'écran principal avec.

**D147 — Toute borne de fenêtre côté front est IMPORTÉE du contrat.**
`AVAILABILITY_MAX_WINDOW_DAYS` compte **bornes incluses**
(`(to - from) / 86400000 + 1 > 92`). La section des visites demandait
`to = aujourd'hui + 92 jours`, soit **93 jours comptés**, et recevait un 400 à
chaque chargement. **D55, sixième occurrence** : la borne avait été écrite
d'intuition au lieu d'être dérivée du schéma.

**D148 — Les points d'ENTRÉE sont fermés à une session ouverte.**
`RequireProSession` empêchait d'entrer sans session ; rien n'empêchait d'en sortir
vers `/auth/connexion` **avec** une session valide — un pro connecté pouvait donc
se reconnecter par-dessus lui-même, voire avec un autre compte, en échangeant le
jeton sous une application déjà montée.
⚠ **Deux routes restent OUVERTES et ce n'est pas un oubli** :
`/auth/reinitialisation` et `/auth/verification-email` **consomment un jeton reçu
par e-mail**, et la vérification d'adresse est même atteinte *après* un changement
d'e-mail, donc forcément connecté. Les fermer casserait le parcours qu'elles
servent. Une neutralisation vérifie qu'y ajouter le garde rougit.

**D149 — La propriété d'une salle se traverse par la RELATION**, jamais par
égalité d'ids. `Venue.ownerId` référence **`ProProfile.id`**, pas `User.id` — le
schéma le dit : `owner ProProfile @relation(fields: [ownerId], references: [id])`.
Le premier correctif de D145 passait l'id **utilisateur** dans `ownerId` : la route
rendait 404 pour **tous** les pros. L'idiome correct est `owner: { userId }`, celui
de `visit-bookings.service.ts`. ⚠ Un identifiant qui « ressemble » se relève, il ne
se devine pas.

**D150 — Un chemin d'API se construit D'UN SEUL TENANT dans `@zwadj/api-client`.**
Le contrôle de chemins B6/D122 lit les **littéraux** : un chemin concaténé n'est
jamais comparé au routeur, il est seulement *compté*. Le plafond de chemins
non vérifiés passe de 4 à **0** et les cinq appels concernés sont réécrits en un
littéral. ⚠ Passer 4 à 5 aurait élargi l'angle mort en ayant l'air de le
documenter — un gel qui monte n'est plus un gel.

**D151 — Depuis UIP-A, `GET /pro/venues` appartient à la COQUILLE, pas à l'écran.**
`ProVenuesProvider` est monté au-dessus de toutes les routes : **un appel par
DÉMARRAGE**, zéro sur un aller-retour SPA. ⚠ Le nombre est **1, pas
`MONTAGES_PAR_RENDU`** : l'effet est déclenché par l'ARRIVÉE de l'utilisateur
(garde `isPro`), pas par le montage — StrictMode a déjà doublé quand la
condition devient vraie. A5 compare donc les empreintes une fois
`EMPREINTE_COQUILLE` retirée des deux côtés, **et vérifie qu'elle est réellement
demandée à froid**, sinon la constante devient un laissez-passer silencieux.
Le sens « présent à froid, absent en SPA » est bénin ; l'inverse reste interdit.

**D152 — « Sortie de la référence a11y » ne veut PAS dire « corrigée ».**
`color-contrast @ .field-hint` a quitté le tableau de bord parce que **D134** y a
démonté `QuotesSection` : l'élément a changé d'écran, son contraste n'avait pas
bougé d'un centième. Avant de retirer une ligne de `e2e/baselines/a11y.json`, il
faut trancher entre les deux cas **et l'écrire**. Le message d'axe a été corrigé
pour l'exiger.

**D153 — Un projet qui linte `.` doit ignorer ce que ses outils ÉCRIVENT.**
`e2e` n'a pas de `src` : `eslint .` avalait `playwright-report/` et
`test-results/`, soit **2 934 erreurs sur du JavaScript minifié**. Ignores
globaux dans `e2e/eslint.config.mjs` **et** trois lignes de `.gitignore` — ces
dossiers n'étaient couverts nulle part et seraient partis au dépôt. ⚠ Corriger
le lint sans le versionnement aurait traité le symptôme et laissé la cause.

**D154 — Ordre du panneau gauche pro, VOULU et divergent de la maquette (R2b).**
`Ma salle → Demandes → Calendrier → Réservations`, et rien d'autre. La maquette
range autrement ; l'écart est un choix produit. ⚠ Les **icônes sont conservées**
— il n'y avait aucune raison de perdre l'habillage parce que la séquence change.
« Compte » quitte le panneau et reste atteignable par le menu du bandeau
(`account.ui.menu.settings`), **vérifié avant retrait** : une entrée supprimée
sans second chemin est une page orpheline.

**D155 — Le voile d'accent, jamais la couleur écrite en dur de la maquette.**
Bandeau « Acompte reçu » et prestations sélectionnées utilisent `--accent-soft`
(#F1EFEE clair / #24201F sombre) et non le `rgba(200,30,99,0.0x)` de la maquette.
⚠ Raison technique, pas préférence : cette valeur **resterait rose sur une page
noire** — exactement la régression qu'UI-D2 a corrigée. Un rose littéral
exigerait une PAIRE de jetons, clair et sombre. D26 tient.

**D156 — Une flèche remplace un libellé sans perdre son NOM ACCESSIBLE.**
Les boutons de mois portent `aria-label` textuel, le glyphe est décoratif.
⚠ Le miroir RTL demande **deux** choses : `data-mirror-rtl` sur le `svg` **et** la
classe `.btn` sur le bouton, parce que la règle est scopée
`[dir="rtl"] .btn svg[data-mirror-rtl]`. En arabe, « suivant » pointe à gauche :
sans miroir, le visiteur part dans le mois opposé, sans erreur visible.
⚠ Lucide pose `aria-hidden` **tout seul** quand une icône n'a ni enfant ni prop
d'accessibilité : le risque n'est pas qu'on le retire, c'est qu'on AJOUTE un
`aria-label` — le nom du lien devient alors « Ma salle bâtiment ».

**D157 — Révéler un bloc, c'est déplacer le FOCUS, pas seulement défiler (R2d).**
Un défilement visuel ne déplace pas le curseur d'un lecteur d'écran. ⚠ Et
`focus()` défile tout seul, sèchement, en ignorant `prefers-reduced-motion` :
`preventScroll: true` est obligatoire, sinon l'écran saute PUIS glisse. Quand
`matchMedia` est absent, le défaut est « mouvement réduit » — se tromper vers
l'animation peut déclencher un vertige, se tromper vers le saut ne coûte que de
l'élégance. Helper unique : `apps/pro/src/lib/reveal.ts`.

**D158 — Téléphone : MOBILE uniquement, saisie locale acceptée, normalisation UNIQUE (R3).**
Borne `/^\+213[5-7]\d{8}$/`. Le schéma **accepte la saisie locale** (`0555 12 34 56`,
tirets, points, `00213…`, `213…`) et rend l'E.164 — personne ne tape `+213` de
lui-même. ⚠ Les fixes ne passent plus : `ProProfile.phone` est la **destination
WhatsApp** des notifications (D60), et un pro inscrit avec un fixe ne recevait
rien, sans erreur nulle part. Fonction unique et partagée
`packages/types/src/phone.ts`, sur le modèle de `roundToDinar` — le
dédoublonnage du futur portefeuille en dépend, et son **idempotence** est
mesurée. Message d'erreur refait : il disait « format attendu : +213XXXXXXXXX »,
c'est-à-dire qu'il enseignait ce qu'on a décidé de ne plus exiger.
⚠ Vérifié en base par Ko après livraison : **aucune ligne non conforme**.

---

### Machine à états du devis — cadrage Q (ex-« C1 »)

⚠ **RENOMMAGE.** Ces lots portaient le préfixe `C1`, déjà pris par « Flux C, lot 1
— plages hebdomadaires de visite » (livré). Correspondance :
`Q0` = ex-C1 cadrage · `Q1` = ex-C1b **livré** · `Q2` = ex-C1c · `Q3` = ex-C1d ·
`Q4` = ex-C1e · `Q5` = ex-C1f.

**D159 — REMPLACE D101. Les deux parcours sont DISTINCTS, et `Quote` est walk-in seul.**
D101 affirmait « mêmes lignes, mêmes statuts, mêmes transitions ». ⚠ Le code ne
l'a jamais fait : `booking-request-panel.tsx` appelle `POST /venues/:slug/bookings`
et **aucun `Quote` n'est créé** pour le parcours en ligne. La doctrine écrite
avait quitté le code, pas l'inverse. Corollaire : le commentaire de
`schema.prisma` sur `quoteId` (« NULL pour un walk-in ») est **inversé** — c'est
le parcours EN LIGNE qui laisse ce champ nul.

**D160 — Imprimer / envoyer un devis est un PARTAGE, sans effet sur le prix.**
Aucun état bloquant « remis ». `validUntil` disparaît : rien n'engage tant que
l'acompte n'est pas payé. L'acte est **bloqué si le téléphone ne passe pas
D158**. ⚠ La création d'une fiche client par ce geste est **hors périmètre** —
voir D166.

**D161 — `CANCELLED` absorbe `DECLINED`.** Un seul état, un seul bouton. La nuance
« le client a refusé » / « le pro a annulé » perd sa valeur opérationnelle dès
que le devis n'est plus envoyé à distance.

**D162 — Entonnoir : le dénominateur est le devis REMIS, et `expired` disparaît.**
Compté sur `sentVia`, pas sur `sentAt`. ⚠ Les quatre canaux incluent `IN_PERSON`
et `PHONE` précisément pour que le devis conclu de vive voix au comptoir — le
cas le plus courant — entre dans l'entonnoir au lieu d'en disparaître : sans
eux, l'indicateur **sous-compterait les affaires gagnées**.

**D163 — Un devis rattaché à une réservation est IMMUABLE, garanti EN BASE.**
⚠ Le versionnement était ce qui protégeait les montants : réviser créait une
ligne neuve, l'ancienne restait figée. `Booking.quoteId` **référence** le devis
sans recopier les montants — donc l'écrasement, sans cette garde, changerait
rétroactivement le montant d'une réservation acceptée, et payée une fois E3 en
place. Aucune erreur ne serait levée. Contrainte ou déclencheur SQL, pas une
vérification de service.

**D164 — Édition concurrente : verrou EXCLUSIF à l'ouverture (lot Q5).**
Un devis ouvert en modification n'a qu'un seul accès en écriture. Message
explicite au second, expiration après 5 min d'inactivité. ⚠ Deux cas à trancher
avant code : un pro qui ferme son onglet se verrouille **lui-même** dehors, et
deux onglets du même pro se bloquent mutuellement.
⏸ **REPORTÉE SANS ÊTRE RÉVOQUÉE — voir D193.** Les « deux cas à trancher » ne
sont pas des cas limites du verrou : ce sont les **seuls** qu'il rencontrera
tant qu'une salle n'aura qu'un utilisateur. La décision reprend vie avec les
comptes salariés.

**D165 — `chain_id` / `version` / `parent_quote_id` : neutralisées d'abord, supprimées en Q4.**
Tant que les colonnes existent, le retour arrière est une bascule de code ; une
fois supprimées, il faut une restauration de sauvegarde.

**D166 — ⚠ REDÉCOUPAGE 1 : `SENT` existants se trient par `booking_id`, pas en bloc.**
L'arbitrage initial disait « `SENT` → `DRAFT`, sans distinction de cas ».
`convert()` crée la réservation et **laisse le devis en `SENT`** : un `SENT` peut
donc déjà porter un `Booking`. Le basculer en `DRAFT` le rendrait éditable alors
qu'il adosse une réservation vivante — **la migration violerait D163**. Le
critère n'est pas « imprimé ou non » (irrécupérable, et l'arbitrage tient sur ce
point) mais `booking_id IS NULL`, information exacte et gratuite.

**D167 — ⚠ REDÉCOUPAGE 2 : Q2 est INDIVISIBLE, et le versionnement passe en Q3.**
Retirer `SENT` sans que rien n'écrive `sentVia` fait retomber l'entonnoir à zéro
en silence ; ne changer que `convert()` n'avance rien ; livrer l'API sans le
sélecteur de canal casse l'app pro. **Le canal ne peut être choisi que par une
personne : le basculement n'existe qu'avec son interface.** Et le passage de
`revise()` à l'écrasement quitte Q2 pour Q3 : il ouvre le trou de D163, donc il
arrive **avec** sa garde, jamais avant.

**D168 — Q1 (livré) : le canal de remise arrive SEUL, sans changer aucun comportement.**
Colonne `quotes.sent_via` **TEXT nullable** + `CHECK` anti-blanc. TEXT et non un
énuméré PostgreSQL : la liste des canaux est ouverte, un `ALTER TYPE` par
libellé serait une migration à chaque fois. Autorité unique du jeu de valeurs :
`quoteSentViaSchema` dans `@zwadj/types`. ⚠ **Aucune reprise de données** : un
vieux devis ne reçoit pas un canal inventé — l'entonnoir aurait l'air juste.
L'entonnoir compte encore sur `sentAt` à ce lot ; le basculement est Q2.

---

## Tranche Q + E3 (14→16/08/2026) — D169 à D191

⚠ **Deux décisions antérieures sont AMENDÉES par cette tranche. Lire d'abord.**

**D163 — PRÉMISSE FAUSSE, la décision tombe.** Elle justifiait une garde
d'immuabilité en base par : « `Booking.quoteId` référence le devis **sans
recopier les montants** ». Le code dit le contraire, vérifié :
`bookings.base_price_cents` / `services_total_cents` / `total_cents` /
`deposit_cents` sont commentées au schéma « *snapshots copiés du devis à la
création* », `convert()` les recopie une par une, recrée les lignes en
`bookingService`, fige le nom du créneau — et E3 facturera sur
`booking.basePriceCents`. **Aucun code ne remonte de la réservation vers le
devis** (recherche sur les quatre arbres : zéro occurrence). Écraser un devis ne
pouvait donc pas changer ce qui serait facturé. Même famille que D159 : doctrine
écrite qui a quitté le code.

**D165 — RÉVOQUÉE pour trois colonnes sur quatre.** `chain_id`, `version` et
`parent_quote_id` ne sont **pas** en sursis : la décision A garde le
versionnement. Seule `valid_until` a été supprimée (Q4).

---

**D169 — `supersedeActive()` DISPARAÎT, elle ne change pas de cible.** Elle visait
`ACTIVE_STATUSES = [SENT, ACCEPTED]` ; `ACCEPTED` n'a **jamais** été écrit (deux
lectures, zéro écriture) et `SENT` ne l'est plus. Conservée, elle serait devenue
un `updateMany` qui ne touche jamais une ligne — aucune erreur, aucun test rouge,
une protection qu'on croirait en place. ⚠ `lockChain()` est **conservée** :
`revise()` lit `MAX(version)` puis écrit `version + 1`, et
`quotes_chain_version_unique` refuserait la seconde de deux révisions
simultanées. La retirer « avec le reste » était le geste facile et faux.

**D170 — La garde du téléphone (D160/D158) vit dans l'ÉCRAN, et sur deux canaux.**
`SMS` et `PHONE` exigent un mobile valide ; `PRINT` et `IN_PERSON` non —
l'imposer aux quatre interdirait de déclarer un devis remis **en main propre** à
quelqu'un dont on n'a pas le numéro, le cas même que les canaux déclaratifs
couvrent. Et la garde est côté écran : `Quote` ne porte **aucun** téléphone
(`contact_phone` est sur `Booking`), donc une garde API demanderait un champ de
plus — un contrat neuf pour valider une donnée que le devis ne connaît pas.

**D171 — Les quatre canaux sont DÉCLARATIFS, `PRINT` et `SMS` compris.** Zwadj
n'imprime rien et n'envoie rien : ni générateur de PDF ni transport SMS dans le
dépôt. Les libellés disent « remis par », jamais « envoyer ». ⚠ « Envoyer par
e-mail » disparaît du parcours sur place : `EMAIL` n'est pas un canal.

**D172 — `SENT` et `SUPERSEDED` deviennent LEGACY : plus écrits, toujours lus.**
La migration a ramené en `DRAFT` les `SENT` **sans** réservation ; ceux qui en
portaient une l'ont gardé (D166) — les basculer aurait rendu éditable un devis
adossé à une réservation vivante. Retirer une valeur d'un énuméré PostgreSQL
impose de recréer le type : ce n'est pas l'affaire d'un lot de basculement.

**D173 — « Ce devis est-il encore ouvert ? » a UNE autorité : `isQuoteOpen`.**
Trois littéraux `status === "SENT"` recopiés dans l'écran, c'était trois endroits
où se tromper — et un jour un seul des trois corrigé.

**D174 — La disparition d'un BOUTON ne se voit que par une assertion de PRÉSENCE.**
Un bouton qui quitte un écran ne casse rien : pas d'exception, pas de type
invalide, pas de requête en échec. Les six portes passent au vert et le pro ne
peut plus conclure. ⚠ Corollaire : quand un lot retire un statut, **les fixtures
changent d'abord** — une fixture restée sur l'ancien état laisse la suite verte
sur un monde que la production ne produit plus.

**D175 — L'entonnoir REPART DE ZÉRO, prix d'un indicateur qui dit vrai.** Aucune
reprise de `sent_via` (D168) : les devis conservés en `SENT` sortent du
dénominateur. Le champ du DTO est renommé `sent` → `delivered` : le dénominateur
a changé de **définition**, et le renommage fait passer TypeScript sur chaque
lecture.

**D176 — La garde de forme D120 suit le CONTRAT, sinon elle refuse la forme
correcte.** `dashboard-aside.tsx` testait `expired` dans
`["sent","accepted","declined","expired"]`. Le champ disparaissant du DTO, la
garde devenait **définitivement fausse** : « Résumé indisponible » en permanence,
sur des données saines. Une garde de forme qui refuse la forme correcte est
**pire** qu'une garde absente — indistinguable d'une panne réseau.

**D177 — Une garde dont l'OBJET disparaît se retire par écrit, pas par oubli.**
La garde D117 protégeait `sentAt` : « le second envoi réécrirait la date que le
client a sous les yeux ». Cela supposait un envoi **unique et irréversible**. Une
remise ne l'est pas — imprimer puis envoyer par SMS sont deux gestes réels, et
réécrire `sentAt` est le comportement **attendu**. Le test « 201 + 409 » devient
« deux remises simultanées ne rendent jamais 500 », qui assertit **deux succès**.

**D178 — `CANCELLED` absorbe `DECLINED`, SANS reprise.** Troisième statut LEGACY.
Les basculer réécrirait l'histoire — « refusé par le client » deviendrait
« annulé » sur des affaires closes il y a des mois — pour un gain cosmétique.
⚠ **`BookingStatus.DECLINED` n'est PAS concerné.**

**D179 — L'entonnoir compte DEUX statuts perdus, et c'est la garde du lot.**
`QUOTE_LOST_STATUSES = [CANCELLED, DECLINED]`, importée par le service, jamais
recopiée. Sans elle, le compteur des affaires perdues **retomberait à zéro le
jour du déploiement** — tout l'historique est en `DECLINED`, et rien ne le
bascule. Champ renommé `declined` → `cancelled`, même raison qu'en D175.

**D180 — L'historique quitte l'ÉCRAN, pas la BASE.** Seule la dernière version
d'une chaîne est affichée ; le numéro de version reste. ⚠ **Conséquence
ouverte** : les versions antérieures ne sont atteignables depuis **aucune**
interface. C'est le pendant de la décision A — on garde la donnée *pour* le
litige, et le chemin d'accès reste à écrire (`[PRO][P2]`).

**D181 — Tout statut de l'énuméré doit avoir un libellé, et c'est mesuré.**
`t(`venue.ui.quotes.st_${status}`)` : ajouter `CANCELLED` sans `st_CANCELLED`
n'aurait produit **aucune** erreur — i18next rend la clé brute, et le pro aurait
lu « venue.ui.quotes.st_CANCELLED ». Le test boucle sur `Object.values(QuoteStatus)`,
pas sur une liste recopiée, sinon il ne verrait pas le statut oublié.

**D182 — Un chemin d'API dont l'ACTION est une variable échappe au test de contrat.**
Voir `AGENTS.md`, invariants. ⚠ Ma première correction — un intermédiaire
`post(path, body)` — a **supprimé** les routes de la vue du test au lieu de les
révéler : l'extracteur ne reconnaît que `request(...)` avec un littéral direct.
Trouvé en exécutant **l'extracteur lui-même**, recopié depuis le fichier, qui ne
touche ni la base ni Nest. **Quand une porte est inatteignable, sa partie pure
l'est souvent — l'exécuter vaut mieux que relire son code.**

**D183 — Q4 est le premier POINT DE NON-RETOUR.** Voir `AGENTS.md`, invariants.

**D184 — Ce que Q4 ne touche pas, chaque exception motivée.**
`quotes_one_sent_per_chain` : contraint encore les lignes héritées de D166 **et**
sert de TÉMOIN — le voir tomber signale un `prisma migrate dev` égaré, lequel
emporterait l'anti-double-booking et la FK composite B2.
`quotes_one_accepted_per_chain` : **redevient actif** avec E3.
⚠ **Point E3** : deux versions d'une même chaîne peuvent chacune porter une
réservation (`convert()` ne regarde que le devis visé) — deux passages en
`ACCEPTED` violeraient cet index **en 500**.

**D185 — Deux tests ne pouvaient PAS survivre à Q4, et c'est le signe qu'il a mordu.**
Ils écrivaient une `valid_until` passée en base. Les remplacer par des
« équivalents » qui n'écrivent plus rien aurait produit deux verts qui ne
mesurent rien : ils deviennent des assertions d'**absence**.

**D186 — L'autorité sur les garanties de la base est la MIGRATION.** Voir
`AGENTS.md`, invariants. ⚠ Erreur commise sur le chemin de l'argent, dans un
document de cadrage accepté.

**D187 — Une garde du chemin de l'argent vit dans un module PUR.**
⚠ **ARCHITECTURE CONFIRMÉE, MOTIF RÉÉCRIT (arbitrage Ko, 16/08/2026).** Le motif
d'origine — « les specs de service ne s'exécutent pas là où le client Prisma
n'est pas généré » — reposait sur une limite d'environnement **qui n'existe
plus** (D192). Le module pur reste, pour la raison qui survit à la mesure : il
se rejoue en millisecondes, sans base ni amorçage Nest, donc sa **neutralisation
est rejouable à chaque passage** au lieu d'attendre les portes lourdes. Sur le
chemin de l'argent, une garde vérifiée rarement est une garde vérifiée tard.
Effet mesuré à la livraison E3b : 12 tests, **6 gardes neutralisées 6/6**.

**D188 — Le montant du paiement est LU sur la réservation, jamais recalculé.**
`bookings.deposit_cents` est un instantané. Rejouer `resolveDepositCents`
produirait un second calcul du même montant — donc, le jour où une règle de dépôt
changera, deux montants pour une seule affaire. Un test fige un acompte **non
rond** qui passe tel quel : aucun arrondi correctif ne s'est glissé là.

**D189 — Aucune remise appliquée au checkout, et le test le FIGE.** Reste à
trancher si `Venue.cashbackRateBps` (D35) **est** la remise de checkout ou un
mécanisme distinct — `cashback_claims` décrit une réclamation vérifiée *après
coup*, ce qui n'est pas une réduction *au moment de payer*. Inventer la réponse
écrirait une règle monétaire par déduction. `discountAppliedCents = 0` est la
seule valeur qui n'affirme rien.

**D190 — L'adaptateur de paiement par défaut REFUSE, il ne simule pas.** 503, pas
une fausse session. Un faux qui marche ferait construire le reste du chemin
contre une forme **inventée**, et le vrai adaptateur devrait ensuite se conformer
à cette fiction plutôt qu'à l'API réelle (D126).

**D191 — Le module de paiement est enregistré sans avoir de route.** Nest résout
les providers d'un module **importé** au démarrage : laissé de côté jusqu'à E3c,
un câblage fautif ne se serait découvert qu'au moment de brancher Chargily — au
pire moment. ⚠ **Aucun contrôleur** : arrêt franc avant tout contrat d'API neuf,
et une route de paiement n'aurait rien à rendre sans session.

---

## Arbitrages du 16/08/2026 — D192 à D194

**D192 — Les portes API SONT exécutables en bac à sable ; le contraire était un
diagnostic, pas une mesure.**
Une erreur de type (`TS2345`, `quotes.service.ts:168`) est partie en livraison
avec Q3a et n'a été vue que par le `tsc --watch` de Ko. **La porte qui la voit
n'avait jamais tourné** : le rapport E3b annonçait « typecheck 4 paquets », API
non comprise, et l'empêchement était attribué au binaire Prisma.
⚠ Le blocage réel était **double, et le premier n'a rien à voir avec Prisma** :
`prisma.config.ts` appelle `env("DATABASE_URL")` et **jette avant que la
génération ne commence**. Une URL factice suffit — `generate` ne se connecte
pas. Le second (403 sur `binaries.prisma.sh`) se contourne par
`PRISMA_SCHEMA_ENGINE_BINARY=/bin/true` : le générateur `prisma-client` de
Prisma 7 est en **WASM** et n'a jamais eu besoin de ce binaire. Recette complète
dans `AGENTS.md`, invariants.
Mesuré après correction : `typecheck` **exit 0**, `lint` **exit 0**, **41
fichiers / 424 tests**, `nest build` **exit 0**. Contre-mesure faite : fichier
d'origine remis → **exit 2** avec exactement `TS2345` ligne 168 ; correctif remis
→ **exit 0**. La porte mord.
⛔ **Ce qui reste hors de portée** : migrations et tests d'intégration — il n'y a
ni serveur ni utilisateur `postgres` dans le bac à sable. Cette limite-là est
mesurée, pas supposée.
⚠ **Conséquence de méthode, plus large que Prisma** : « non exécutable » est une
mesure et se relève avec son message d'erreur exact. Recopié de rapport en
rapport, un empêchement survit à sa propre disparition — et couvre alors
précisément ce qu'il prétendait signaler. **Un empêchement se re-teste à chaque
tranche.**

**D193 — Q5 est REPORTÉ jusqu'aux comptes salariés : le verrou n'a personne à
exclure.**
`Venue.ownerId` pointe `ProProfile`, dont `userId` est **`@unique`**. Il n'existe
aucune table d'appartenance, aucun compte salarié : une salle a **exactement un**
utilisateur pro, et `ownedVenue()` le vérifie à chaque appel.
⚠ Un verrou exclusif d'édition n'a donc **aucune seconde personne** à écarter.
Les deux cas que D164 réservait à l'arbitrage — l'onglet fermé, les deux onglets
du même pro — ne sont pas des cas limites : **ce sont les seuls cas qui
existent**. Livré tel quel, Q5 n'aurait produit qu'un seul effet observable : un
pro qui se bloque lui-même cinq minutes.
Le verrou naîtra avec les gens qu'il sépare. **Rien n'est construit d'ici là**
(arbitrage Ko) — ni verrou par `userId` ré-entrant, qui serait un no-op tant
qu'il n'y a qu'un utilisateur.

**D194 — Le risque de concurrence RÉEL est ailleurs, et reste ouvert.**
Deux onglets qui `revise()` en parallèle ne perdent pas une écriture : la
décision A ayant conservé le versionnement, ils créent **deux versions** de la
même chaîne. D184 relève déjà que deux versions peuvent chacune porter une
réservation, et que deux passages en `ACCEPTED` violeraient
`quotes_one_accepted_per_chain` **en 500**.
⚠ C'est une divergence de chaîne, pas une écriture perdue — **un verrou d'écran
ne la couvre pas** ; un contrôle de version à l'écriture, oui. Lot distinct, non
cadré, à ne pas confondre avec Q5 le jour où celui-ci reprendra.

## Lot E3b (Chargily) — D195 à D199

**D195 — Chargily compte en DINARS. Mesuré, pas déduit.**
`amount: 5000` affiche « 5 000,00 DA » sur la page de règlement ; `amount: 1` est
refusé par « The amount field must be greater than or equal to 50. » Notre port
reste en **centimes** — c'est l'unité du système, et la faire varier selon le
destinataire ferait de chaque appelant un convertisseur. La conversion vit dans
l'adaptateur, seul fichier du dépôt qui connaît Chargily.
⚠ **Elle refuse, elle n'arrondit pas.** `roundToDinar` garantit des multiples de
100 : la division est exacte par construction. Si elle ne l'est pas, un montant
non arrondi est arrivé jusque-là — et arrondir produirait un **second calcul du
même montant** (D188) tout en masquant le défaut amont derrière un paiement qui
marche. 500 assumé : c'est notre incohérence, pas une erreur du client.
⚠ **Le minimum de 50 DA n'est PAS recopié.** Dupliquer une borne du fournisseur,
c'est promettre de la maintenir : le jour où il la déplace, nous refuserions des
paiements qu'il accepte, sans rien de rouge (D55). Son refus se traduit, il ne se
devance pas.
⚠ **Ce qui rend ce défaut redoutable** : un facteur 100 ne casse rien. Le
parcours marche, le client voit un montant, personne ne rougit.

**D196 — Deux URL de retour, et aucune ne fait foi.**
`returnUrl` devient `successUrl` + `failureUrl` (arbitrage Ko). ⚠ L'invariant
écrit dans le port : une redirection de navigateur **n'est pas une preuve de
paiement** — elle se rejoue, se forge à la main, se perd si le client ferme
l'onglet. Les deux pages affichent « vérification en cours » et lisent le statut
du `Payment` chez nous ; la vérité arrive par le webhook signé (E3c).

**D197 — E3a ROUVERTE, périmètre limité : deux modes de défaillance de l'appel
sortant.**
Ils manquaient à la liste, et D126 règle 4 interdit de coder un mode non listé.
1. **La création de session temporise.** ⚠ Le délai expire APRÈS l'envoi : le
   checkout existe peut-être. **Traitement : aucun réessai automatique.** Une
   nouvelle tentative créerait une seconde session pour une seule affaire. La
   session éventuellement orpheline est **inatteignable par le client** — son URL
   ne lui est jamais parvenue — et expire seule.
   ⚠ **Conséquence exécutoire pour E3c** : un webhook portant un
   `providerCheckoutId` inconnu doit être ignoré proprement, pas échouer.
2. **La création de session est refusée.** 502 et non 503 : le fournisseur est
   joignable, c'est la demande qu'il rejette. La distinction porte pour la
   supervision — l'un se réessaie, l'autre non.

**D198 — `PAYMENTS_ENABLED` allumé sans clé Chargily : le boot ÉCHOUE.**
Cette configuration bootait jusqu'ici sur `UnavailablePaymentGateway` :
l'exploitant croyait les paiements ouverts, chaque tentative rendait 503, et rien
au démarrage ne disait pourquoi. ⚠ **Aucun repli silencieux** — un repli rend
« configuration cassée » indiscernable de « paiements éteints ».
⚠ `CHARGILY_BASE_URL` n'a **aucun défaut** : seule la base de test a été
observée. Un défaut pointant le test ferait qu'une production mal configurée
encaisserait dans le vide. C'est le symétrique de `PAYMENTS_ENABLED` — là un
drapeau qui s'allume seul, ici une cible qui se choisit seule.
⚠ Le contrôle ne vit pas dans `PROD_REQUIRED_EXPLICIT` : il dépend du drapeau,
pas de `NODE_ENV`. Une recette allumée sans clé est aussi cassée qu'une prod.

**D199 — ⚠ LA PORTE DE PARITÉ NE VOIT PAS UNE ABSENCE SYMÉTRIQUE.**
E3b-socle levait `payment.errors.providerUnavailable` et
`` `payment.errors.${code}` `` : **aucune de ces clés n'existait, dans aucun des
deux catalogues.** La porte i18n compare FR à AR — une clé manquante des deux
côtés lui est parfaitement invisible. Le namespace `payment` est créé (8 clés,
951 = 951).
⚠ Second défaut du même endroit : `` `payment.errors.${decision.code}` ``
produisait `payment.errors.PAYMENTS_DISABLED` alors que tout le dépôt nomme en
`namespace.errors.camelCase`. Remplacé par une table
`Record<IntentRefusal["code"], string>` — un code neuf sans message ne compile
plus.
⚠ **Dette ouverte** : rien ne relie encore une clé LEVÉE par le code à une clé
EXISTANTE au catalogue. C'est le même angle mort que D182.

---

## Session du 17/08/2026 — D200 à D209

**D200 — Aucune valeur réelle dans un fichier d'EXEMPLE.**
Les clés Chargily de test — publique et **secrète** — vivaient en clair dans
`apps/api/.env.example`. ⚠ `.gitignore` ne couvre que `.env` : ce fichier est
SUIVI, poussé, et recopié par chaque poste qui fait `cp .env.example .env`. Un
fichier d'exemple documente des NOMS et des FORMATS, jamais des valeurs.
Retirées ; le bloc porte l'avertissement en tête. Deux variables fantômes
(`CHARGILY_API_KEY`, `CHARGILY_WEBHOOK_SECRET`) qui n'existent pas dans `env.ts`
sont supprimées, trois manquantes documentées.
⚠ **Leçon de méthode, plus large** : mon premier balayage de secrets s'est
terminé sur un `head -10` saturé de faux positifs, et affichait « (fin) ». **Un
audit tronqué se lit comme un audit complet.** Le second, sans troncature ni
filtre, a sorti les deux lignes en une seconde.
⚠ La rotation d'identifiants reste la dette la plus ancienne du dépôt : signalée
au Lot 8 pour `GOOGLE_CLIENT_SECRET`, jamais faite.

**D201 — Le flux Pro devient un assistant EXCLUSIF, et le récapitulatif ne se
replie jamais.**
Une seule question à l'écran ; chaque réponse validée se fige dans un
récapitulatif qui grandit au-dessus.
⚠ **Ce qui est répondu SE DÉDUIT DES DONNÉES, jamais d'un compteur.** La maquette
tient un `confirmedUpTo` et le remet à `n - 1` quand on modifie l'étape `n` :
corriger une faute de frappe au nom du client ferait disparaître la date, le
créneau et les prestations. Un compteur peut diverger de l'état réel ; une
réponse présente en mémoire, non. Seule l'étape des prestations porte un drapeau,
parce que « aucune prestation » est une réponse valable et indiscernable de « pas
encore répondu ».
⚠ Corollaire : une correction qui INVALIDE une réponse suivante l'efface et le
DIT (changer la date rend le créneau caduc). Garder à l'écran un créneau qui
n'existe plus serait pire que de le perdre.
⚠ Le récapitulatif étant AU-DESSUS (maquette), `revealAndFocus` devient
STRUCTUREL : chaque étape franchie pousse la carte active vers le bas, et sans
lui la question sortirait de l'écran sur un portable. En position basse il
n'aurait été qu'un confort.

**D202 — Aucun montant dans le récapitulatif avant l'étape Devis.**
Seul écart assumé avec la maquette, qui met un prix dans la ligne « Date », un
sous-total dans celle des prestations, et calcule `Math.round(total * 0.3)` —
exactement ce que le fichier refusait déjà (D81 : acompte PAR SALLE ; D188 : pas
de second calcul du même montant). Le récapitulatif accumule des RÉPONSES.
⚠ Chiffrer étape par étape exigerait une route d'essai à blanc : appeler
`create`/`revise` à chaque étape ferait cinq versions pour une affaire.

**D203 — Un seul `VenueCalendar` monté, une prop `show`.**
Date et créneau sont deux ÉCRANS (maquette), mais deux `<VenueCalendar>` dans
deux branches distinctes se démonteraient l'un l'autre : rechargement de la
disponibilité et clignotement de la grille, au moment précis du clic. Une seule
instance, dont on change ce qu'elle MONTRE (`month` / `slots` / `all`).
⚠ Et `onSelectDate` est OBLIGATOIRE dans les deux cas : sans lui le calendrier
n'est pas piloté, il ignore `selectedDate` et retombe sur sa sélection interne à
`null` — donc aucun jour, donc aucun créneau. Défaut réel, trouvé avant test.

**D204 — L'accueil ne promet pas ce que le produit n'a pas.**
⛔ **Les Awards ne se construisent pas.** La maquette nomme des lauréats : un
concours qui n'existe pas, décerné par nous, à un professionnel qui ne l'a pas
gagné. Ce n'est pas un placeholder, c'est une allégation commerciale sur une
entreprise réelle — le garde-fou « données de démonstration signalées » a été
écrit pour des salles fictives dans une grille, il ne couvre pas ça.
⚠ **Les catégories de prestataires** sont rendues « à venir » : les NOMS sont
autorisés (ils annoncent une intention), les COMPTES non (`142`, `87`… sont des
affirmations vérifiables et fausses), les liens non (rien à ouvrir), les photos
non (D208). Ce sont des `<li>`, pas des boutons désactivés : il n'y a rien à
ouvrir, donc rien à désactiver.
⚠ « Les salles d'exception » est devenue « Récemment ajoutées » et la petite
grille prend `price_asc` : la maquette affichait `slice(0,6)` puis `slice(3,6)`,
soit les mêmes salles deux fois, et « d'exception » revendiquait une curation
sans mécanisme de curation. Les deux grilles s'adossent aux deux SEULS tris que
l'API expose.
⚠ Les quartiers sont RELEVÉS des salles publiées, sans compte (un compte tiré
d'une page serait faux) et NON CLIQUABLES : le contrat filtre par `cityId`, pas
par quartier — une puce cliquable serait un lien mort.

**D205 — ⚠ UNE GARDE QUI VIT DANS UN COMPOSANT SERVEUR NEXT EST INVISIBLE.**
« Aucune salle de démonstration en production » était un ternaire dans
`page.tsx`. Correct — et jamais exécuté : nul test ne rend un composant serveur.
Le harnais l'a montré, **muter la page laissait 19 tests verts**, et six salles
inventées seraient parties chez les visiteurs.
La décision devient `previewVenuesFor(nodeEnv)`, fonction pure et testée.
⚠ Elle ne viole PAS le garde-fou « un module de données ne décide pas seul
quand il s'affiche » : l'environnement lui est PASSÉ. Ce qui était interdit,
c'est de lire `process.env` soi-même — pas de savoir répondre quand on demande.

**D206 — L'assistant de filtres vit sur une ROUTE DÉDIÉE.**
Il exige JavaScript (étapes, compteur). `/salles` n'en a pas besoin et n'en aura
pas besoin — filtres en `<form method="get">`, pagination en liens — parce
qu'elle vise un Android bas de gamme sur réseau lent et qu'elle existe pour le
référencement. Le mettre À LA PLACE de son formulaire aurait privé de recherche
tout visiteur sans JS. L'accueil y renvoie par un LIEN, à côté du formulaire.
⚠ Quatre étapes, toutes FILTRANTES. La maquette en pose six et jette deux
réponses : son `SearchPage` n'utilise ni `district` ni `date`. Le « quartier »
devient la COMMUNE (`cityId`, le vrai filtre) ; la date attend `availableOn`.
⚠ Défaut réel trouvé en écrivant : un client qui PASSE toutes les questions
retombait indéfiniment sur la première et n'atteignait jamais les résultats. On
avance vers la première question sans réponse **après celle qu'on quitte**.

**D207 — Le compteur de salles vient du SERVEUR.**
La maquette calcule `liveCount` dans le navigateur en filtrant son tableau.
Refaire ça réécrirait côté client le filtrage que le serveur porte — **une
seconde autorité sur « quelles salles correspondent »**, qui divergerait au
premier critère ajouté. C'est le `total` d'un `GET /venues?…&pageSize=1`.
⚠ Chaque coche ANNULE la requête précédente : sans cela, deux réponses lentes
arrivent dans le désordre et affichent le compte d'un état déjà quitté.
⚠ `null` = « je ne sais pas », **jamais « zéro salle »** : l'un invite à élargir,
l'autre est une panne.

**D208 — Les photos de la maquette ne partent pas en production.**
Quinze URL Unsplash absolues, servies à chaque visiteur d'une page qui vise un
Android bas de gamme sur réseau lent : quinze requêtes vers un tiers, sans
`remotePatterns`, sans trace de licence, et sans qu'aucun prestataire ne soit
référencé derrière. La zone média existe, remplie d'un dégradé dérivé des tokens
du site — coût réseau nul. ⚠ Le balisage est PRÊT : le jour où des visuels
locaux existent, c'est un `<img>` à poser dans le `<span>` et rien d'autre.

**D209 — ⚠ SIX FAÇONS DONT UN TEST NE MESURE RIEN.**
Toutes relevées par le harnais de neutralisation cette session, **aucune par
relecture**. Le harnais a rendu 6/10, 7/11 puis 7/9 au premier passage — soit,
à chaque lot, un tiers de tests qui ne mesuraient pas ce que leur nom annonçait.

| # | Forme | Exemple de la session |
|---|---|---|
| 1 | **Mesure confondue** | La ligne « créneau » manquait au récapitulatif parce qu'on était À l'étape créneau, pas parce que le créneau avait été effacé |
| 2 | **Mutation auto-neutralisée** | Muter un `useMemo` dont les dépendances n'incluent pas la variable mutée ne change rien |
| 3 | **Rôle absent** | `queryByRole("link")` sur un `<a>` SANS `href` rend `null` même quand le bloc s'affiche — le test passait sur un écran cassé |
| 4 | **Fixture à un seul élément** | `join(";")` et `join(",")` rendent la même chaîne sur une liste d'un élément |
| 5 | **Nom accessible plus riche** | Le nom d'un jour de calendrier porte son état et son tarif — `/^15$/` ne correspond à rien |
| 6 | **Valeur monétaire tapée à la main** | `Intl` en `fr-DZ` insère des espaces insécables ÉTROITES (U+202F) |

⚠ La leçon commune : **un test qui n'a jamais échoué n'a jamais rien prouvé.**
Le harnais n'est pas une formalité de fin de lot, c'est le seul instrument qui
distingue une suite qui mesure d'une suite qui décrit.

---

### Compteurs — MESURÉS au 17/08/2026, fin de session

| Gate | Valeur |
|---|---|
| typecheck | 6 paquets + API, 0 erreur |
| lint | exit 0 partout |
| tests unitaires | API **454** · pro **339** · client **203** · api-client 34 |
| i18n | **1079 = 1079** (943 en début de session) |
| builds | `pnpm -r run build` exit 0 |
| neutralisation | flux Pro **14/14** · accueil **11/11** · assistant **9/9** · E3b 12/12 |

⛔ **Non mesuré, raison vérifiée** : migrations et tests d'intégration — aucun
PostgreSQL en bac à sable (D192) ; l'appel réseau réel vers Chargily —
`pay.chargily.net` hors liste d'autorisation ; les plans de requête d'`availableOn`.

---

### Compteurs — MESURÉS au 16/08/2026, lot E3b (Chargily)

| Gate | Valeur |
|---|---|
| typecheck | **6 paquets + API**, 0 erreur |
| lint | exit 0 partout, API comprise |
| tests unitaires | **API 43 fichiers / 454** · pro 327 · client 164 · api-client 34 |
| i18n | **951 = 951** — plancher relevé 943 → 951 |
| builds | `pnpm -r run build` exit 0, `nest build` compris |
| **neutralisation** | **12 / 12** gardes neutralisées, chacune ROUGE puis restaurée VERTE |
| captures réelles | 2 fixtures versionnées, **aucune valeur attendue écrite à la main** |

⛔ **Non mesuré** : migrations et tests d'intégration (aucun PostgreSQL en bac à
sable) ; l'appel réseau réel vers Chargily (`pay.chargily.net` hors liste
d'autorisation) — l'adaptateur est exercé contre `fetch` espionné, pas contre le
bac à sable.

---

### Compteurs — MESURÉS au 16/08/2026, APRÈS réouverture des portes API (D192)

| Gate | Valeur |
|---|---|
| typecheck API (`tsc --noEmit`) | **exit 0** — première mesure réelle du dépôt |
| lint API (`eslint src prisma`) | exit 0 |
| tests unitaires API | **41 fichiers / 424 tests**, 0 échec |
| build API (`nest build`) | **exit 0** |
| contre-mesure du correctif | sans lui **exit 2 / `TS2345`** · avec lui **exit 0** |
| `AGENTS.md` dépôt ↔ projet | écart = **une ligne vide finale** — dette `[REPO][P1]` close |

⛔ **Non mesuré, et pour une raison vérifiée** : migrations et tests
d'intégration — aucun PostgreSQL dans le bac à sable.

### Compteurs — MESURÉS au 16/08/2026 (tranche Q + E3)

| Gate | Valeur |
|---|---|
| typecheck | 4 paquets hors API, 0 erreur · **lint API vert** |
| tests unitaires pro | **327** (référence d'entrée Q2 : 313) |
| tests unitaires client | 164 · api-client 34 |
| specs API **exécutables** | `payment-intent` 12 + `env` 19 + `i18n-parity` 5 = **36** |
| i18n | **943 = 943** — plancher relevé 937 → 943 |
| builds | Vite ✅ · Next ✅ |
| neutralisation | **25 / 25** (11 Q2 · 5 Q3a · 3 E3a · 6 E3b) |

⛔ **Jamais exécuté en bac à sable** (`binaries.prisma.sh` répond 403, ni
PostgreSQL ni Docker) : migrations Q2 et Q4, tous les tests d'intégration, build
API, `payments.service.ts`. ✅ **Q2 et Q3a confirmés verts sur base réelle par
Ko** ; Q4 et le socle E3b restent à vérifier.
⚠ **CE CONSTAT EST PÉRIMÉ POUR LA MOITIÉ DE SON CONTENU — voir D192.** Le
typecheck, les tests unitaires et le build de l'API s'exécutent ; c'est le
diagnostic qui était faux, pas la mesure. Seuls migrations et intégration
restent réellement hors de portée. **Le tableau ci-dessus n'est pas réécrit** :
il dit ce qui a été mesuré ce jour-là, et c'est précisément ce qu'un compteur
daté doit dire.

### Compteurs — MESURÉS à la clôture de la tranche UIP (10/08/2026)

| Gate | Valeur |
|---|---|
| typecheck | **6 paquets** hors API, 0 erreur |
| lint | exit 0 — `ui`, `api-client`, `pro`, `client` |
| tests unitaires pro | **26 fichiers / 297 tests** (référence d'entrée : 20 / 240) |
| tests unitaires client | **15 fichiers / 162 tests** (référence : 15 / 160) |
| i18n | **937 = 937** — plancher relevé 843 → 868 → 910 → 926 → 937 |
| builds | Vite ✅ · Next ✅ |
| neutralisation | **24 / 24 gardes prouvées mordantes** |

> ⛔ **Ce que le bac à sable n'a PAS pu mesurer, et pourquoi.**
> `binaries.prisma.sh` est bloqué par la politique réseau (403) et
> `apps/api/src/generated/` est ignoré par git : `prisma generate` échoue, donc ni
> typecheck API, ni tests API, ni **intégration**, ni build API. Ni PostgreSQL ni
> navigateurs Playwright non plus. **Sept tests d'intégration ont été écrits et
> JAMAIS exécutés** — deux pour D135, cinq pour D145/D147. Ils sont le seul endroit
> qui prouve ces contrats côté serveur.

## Session du 28/08/2026 — D263 · L1, la porte lint

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D262**.

| Tranche | Décisions | État |
|---|---|---|
| L1 — trois imports morts + une directive inerte | **D263** | ✅ livré, `eslint` **sortie 0** |
| Littéral `"PENDING"` sur le chemin de l'argent | D263 | ⛔ **MESURÉ, NON CORRIGÉ** — arbitrage |
| Règles eslint à information de types | D263 | ⛔ **jamais activées** — report |

Portes : lint **0 problème** (3 erreurs + 1 avertissement avant) · unitaires
**638 / 55**, inchangés · harnais S11-a **18/18**, rejoué · typecheck : aucune
erreur nouvelle sur les fichiers touchés (bruit de talon stable à 151).

### D263 — les trois imports n'étaient PAS équivalents

⛔ **`BookingStatus` était un FOSSILE QUI DÉSIGNAIT UN DÉFAUT.** Avant S10b-2, la
conversion devis → demande écrivait le statut depuis l'énumération partagée, dans
`quotes.service.ts`. S10b-2 a déplacé la transaction dans
`quote-store.prisma.ts` — et la valeur y est devenue **une chaîne littérale**.
L'import est resté derrière, sans consommateur ; `eslint` l'a signalé comme mort.
Il l'était. Mais **le supprimer sans rien dire aurait effacé le dernier panneau
indicateur d'un défaut ouvert sur le chemin de l'argent.**

**Mesuré** : le littéral « PENDING » est écrit **TROIS FOIS**, et aucune des trois
ne dérive de `BookingStatus` —
`quote-store.prisma.ts` l. 140, `quote-store.prisma.spec.ts` l. 254,
`quotes.int-spec.ts` l. 449. ⛔ **Les trois s'accorderaient entre elles et se
tromperaient ensemble** : c'est la classe que **D259** a nommée sur
`BookingSource`, et le contraire exact de la règle « on compare à l'AUTORITÉ,
jamais à une liste écrite dans le test ».

**Non corrigé, et c'est délibéré** : chemin de l'argent ⇒ arbitrage avant code.
Le défaut est nommé **à l'endroit où il vit** (commentaire sur
`convertirEnDemande`, aucun changement de comportement) et au backlog.

⚠ Les deux autres (`QUOTE_SELECT`, `DevisChiffre`) sont des résidus de S10b-1 —
vérifié, leurs seuls consommateurs sont `quote-store.types.ts`,
`quote-store.prisma.ts` et son spec. **Morts pour de bon**, eux.

### D263 — la directive `eslint-disable` faisait taire un SILENCE

`domain-events.spec.ts` l. 122 exemptait `@typescript-eslint/only-throw-error`
sur un `throw "chaîne"` volontaire. ⛔ **Mesuré : cette règle n'a jamais tourné.**
Elle demande l'information de types, et `packages/config/eslint/base.mjs`
n'active que `tseslint.configs.recommended` — pas `recommendedTypeChecked`.

⚠ **La conséquence dépasse cette ligne.** AUCUNE règle typée n'est active dans
ce dépôt : ni `no-floating-promises`, ni `await-thenable`, ni
`no-misused-promises`. Sur une base NestJS pleine d'`async` et de
`$transaction`, **`no-floating-promises` est celle qui compte** — une promesse
non attendue sur le chemin de l'argent ne se voit dans aucun test. Report au
backlog : les activer allumerait tout le dépôt d'un coup, c'est un lot en soi.

Directive retirée **par écrit**, avec le motif posé sur place et l'indication de
où reposer une exemption le jour où les règles typées seront activées.

## Session du 28/08/2026 — D261 · S11-a (SRP sur `BookingsService`, moitié amont)

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D260**.

### Où en est le code, en une lecture

| Tranche | Décisions | État |
|---|---|---|
| S11-a — recevabilité extraite en module pur | **D261** | ✅ livré, **16/16** |
| S11-a — charge utile de notification extraite | D261 | ✅ livré, comprise dans les 16 |
| S11-a — porte typecheck cassée à la livraison | **D262** | ⛔ **défaut LIVRÉ**, corrigé |
| S11-b — chiffrage (chemin de l'argent) | — | ⛔ non commencé, cadrage exigé |

Compteurs après ce lot : API **638 / 55** (base d'entrée **602 / 53**, relevée
AVANT de toucher au code pour que le « +36 » mesure quelque chose).
Harnais : **19 scripts, 167 cibles**.

⛔ **CE LOT A ÉTÉ LIVRÉ UNE PREMIÈRE FOIS AVEC LA PORTE TYPECHECK ROUGE** — voir
D262. La correction n'a touché **qu'un seul fichier de test** ; le code de
production n'a pas bougé.

### D261 — ce qui a commandé le découpage : l'ABSENCE de spec unitaire

⛔ **`BookingsService` n'a AUCUNE spec unitaire.** Mesuré : aucun fichier du
dépôt n'instancie cette classe hors `bookings.int-spec.ts`, qui demande un
PostgreSQL réel. Toute cible de neutralisation posée DANS ce service aurait
donc été **muette par construction**, exactement le défaut nommé pendant la
campagne S8→S10b.

Deux issues possibles, une seule tenable :

- lui écrire un spec unitaire — mais son constructeur prend `PrismaService`,
  dont les délégués sont des génériques surchargés : il aurait fallu un
  **septième `as unknown as PrismaService`**, alors que D258 a nommé les six
  restants comme LE défaut chiffrable ;
- **extraire les décisions dans des modules PURS**, qui se mesurent sans double
  et se neutralisent en millisecondes.

C'est la seconde qui a été prise. Le gain de S11-a n'est donc pas la taille,
c'est la **mesurabilité** — et c'est ce qu'il faut lire dans les chiffres.

### D261 — mesures AVANT / APRÈS, relevées, pas estimées

| Grandeur | Avant | Après |
|---|---|---|
| `create` — lignes | 189 (l. 131→319) | **168** |
| `create` — lignes exécutables | 136 | **123** |
| `bookings.service.ts` — lignes | 729 | 715 |
| `bookings.service.ts` — exécutables | 495 | 461 |
| accès `this.prisma.` dans le service | 12 | **12, inchangé** |

⚠ **Le backlog annonçait « 200 lignes sur 729 » ; la mesure dit 189.** L'écart
n'est pas grave, mais il est réel : le chiffre venait d'une estimation, pas
d'un comptage. Corrigé ici pour que S11-b parte d'une base vraie.

⚠ **PREMIER JET : `create` avait GROSSI.** L'appel au module de recevabilité,
écrit en ligne dans `create` avec ses deux traductions HTTP, pesait 138 lignes
exécutables contre 136 avant — le lot ratait son objet en le mesurant. La
traduction du verdict est passée dans une aide privée `admitOrThrow`, **même
idiome que `transitionStatus` juste au-dessus**, et `create` est descendu à 123.
⛔ **Sans la mesure après coup, ce lot aurait été livré en annonçant un
allègement qu'il ne produisait pas.**

⚠ **Le nombre d'accès Prisma n'a PAS bougé, et c'est voulu.** D258 a établi
qu'un port ne se justifie pas par un compte d'imports Prisma. S11-a ne touche
pas à la persistance.

### D261 — les trois refus préalables : `booking-admission.ts`

Sortis de `create` : créneau introuvable, capacité dépassée, date hors fenêtre.
Module pur, verdict discriminé (`ADMITTED` / `SLOT_UNAVAILABLE` /
`GUESTS_EXCEED_CAPACITY`), le service traduisant seul en HTTP — même partage
que `booking-transitions.ts` (S3).

⛔ **L'ORDRE DES REFUS EST UNE RÈGLE, ET RIEN NE LE MESURAIT.** Relevé sur le
fichier avant déplacement : créneau l. 178, **capacité l. 180**, **date l. 196**.
Le service traduit la capacité en **400** et les deux autres en **409**.
Intervertir ferait répondre « ce créneau n'est pas disponible » à une demande
dont le seul tort est de compter trop d'invités : le client changerait de DATE
au lieu de réduire sa table, indéfiniment. Trois tests mesurent désormais cet
ordre sur des demandes **doublement fautives** ; c'est la garde que le lot
ajoute, pas seulement déplace.

⚠ **DEUX `null` SE CROISENT DANS CE MODULE.** `slot === null` veut dire
« introuvable » et refuse ; le `null` que `computeBookingWindow` attend veut
dire « ignore les heures » et réserve la journée (SINGLE_SLOT, D77). Les
confondre coûterait un jour de calendrier sur une salle qui ne prend qu'une
réservation par jour. Le mode voyage donc dans un **drapeau distinct**
(`wholeDay`), jamais encodé par un créneau absent.

⚠ **LE CRÉNEAU EST REPORTÉ DANS LE VERDICT**, via un paramètre de type. Sans
lui, `create` devrait relire le créneau dans `venue` et y **réécrire la garde
de nullité que le module vient de rendre** — c'est-à-dire garder un `if` dont
plus aucune branche ne se déclenche. Une garde sans objet se retire.

### D261 — la charge utile : `booking-notification-input.ts`

⛔ **PAS DANS `booking-notifications.service.ts`, ET C'EST D63 QUI L'INTERDIT.**
Le backlog proposait de l'y mettre, « puisqu'il consomme déjà ce que les deux
aides construisent ». Vérifié : l'y mettre aurait obligé `BookingsService` à
**injecter le service de notification** pour construire sa charge, donc à
défaire D63 — le service publie un FAIT et ne connaît plus ses destinataires.
Un module pur entre les deux les laisse chacun à sa place. ⚠ **Une consigne
qui s'appuie sur un existant demande de mesurer cet existant** (D231).

Cette construction porte **deux montants** et **deux téléphones** — quatre
valeurs interchangeables deux à deux, dont **aucune interversion ne casse le
typage**. Elle n'avait jamais été mesurée.

⚠ **`civilOf` A CHANGÉ DE MAISON, PAS DE CORPS.** Cette conversion privée avait
DEUX appelants dans `bookings.service.ts` (`toDTO` et la charge). L'un partant,
en garder une copie de chaque côté aurait fabriqué **deux autorités sur la même
conversion**. Elle devient `civilOfUtcDate` dans `availability-time.ts`, module
qui possède déjà `CivilDate` et sa conversion aller.

⚠ **LA GARDE DE FUSEAU N'EXISTAIT NULLE PART.** `Booking.eventDate` est une
`@db.Date`, rendue à minuit UTC ; lue avec `getFullYear()`, elle recule d'un
jour à l'ouest de Greenwich — et **reste invisible sur un serveur en UTC**,
c'est-à-dire en intégration. La spec **épingle `process.env.TZ` à
`America/Toronto`** et le restaure ensuite. Mesuré : `process.env.TZ` posé à
chaud est bien pris en compte par Node 22.

### D261 — deux gardes de SOURCE, et pourquoi il en fallait

Rien n'empêche la décision de **revenir** dans le service six mois plus tard :
il y aurait alors deux autorités sur la fenêtre de réservation, et une seule
mesurée. `booking-admission.spec.ts` lit donc `bookings.service.ts` et vérifie
que la constante d'horizon n'y apparaît plus et que le module est bien appelé.

⚠ **LA PREMIÈRE RÉDACTION A FAIT ROUGIR CETTE GARDE SUR UN COMMENTAIRE.** Le
commentaire qui explique pourquoi l'import a disparu **épelait le nom de la
constante**. Reformulé en toutes lettres, avec la raison écrite sur place :
une garde qui accuse à tort finit ignorée.

### D261 — un attendu écrit de mémoire, attrapé par la mesure

Le test du nom client annonçait `"Yasmine  Belkacem"` (deux espaces). La mesure
a rendu **trois** : le prénom de la fixture en porte déjà deux à droite, le
gabarit en ajoute un, et **`trim()` ne touche que les BORDS**. Attendu corrigé
sur la mesure. ⚠ Conséquence rapportée, non corrigée : un nom de client peut
sortir de cette charge avec des **espaces intérieurs**.

### Campagne de neutralisation

`neutralisation/neutralize-s11a.py` — **16 cibles, 16 mordues**, deux mesures
unitaires toujours actives (aucune cible ne peut être comptée mordue sans avoir
été lancée, D253). ⛔ **Aucune cible ne repose sur le typecheck** : en bac à
sable le talon Prisma rend les types lâches, une telle cible serait muette.

### D262 — « NON MESURÉ » N'EST PAS « NON LANÇABLE ». Correctif S11-a-1.

⛔ **L'archive S11-a est partie avec la porte typecheck ROUGE.** Ko a mesuré,
chez lui, **une seule erreur** :
`booking-admission.spec.ts(157,42): TS2339: Property 'nameFr' does not exist on
type 'SlotBounds'`.

**Cause technique.** L'aide de test typait ses surcharges par
`Partial<Parameters<typeof decideBookingAdmission>[0]>`. ⛔ **`Parameters<>` sur
une fonction GÉNÉRIQUE efface le paramètre de type et le remplace par sa
CONTRAINTE** : `S` devenait `SlotBounds`, l'aide rendait
`BookingAdmission<SlotBounds>`, et l'assertion qui prouve justement que le
créneau traverse le verdict ne compilait plus. Corrigé en nommant le type
concret et en utilisant `BookingAdmissionInput<S>`, que le module **exporte
déjà** : on nomme le contrat, on ne le reconstruit pas depuis la signature.

**Cause de méthode — la vraie.** L'erreur était **présente dans le bac à sable
depuis le début**, à la ligne 157, noyée dans **586** erreurs induites par le
talon Prisma. Je ne l'ai pas vue parce que **je n'ai pas lancé `tsc` du tout** :
le raisonnement « le typecheck est non mesuré » (vrai des FORMES Prisma) a été
étendu sans le dire en « le typecheck ne dit rien » (faux). ⛔ **Un outil qu'on
déclare non concluant sur un point se lance quand même, puis on trie.**

**Ce qui change, mesuré :**

1. **Talon renforcé** — un index de délégués sur `PrismaClient` fait tomber le
   bruit de **586 à 151** erreurs. Le talon n'est pas livré (`.gitignore`
   l. 10) mais la recette est ici.
2. **Mesure `types` restreinte** — `tsc --noEmit` sur les **trois fichiers du
   lot qui n'importent RIEN de Prisma** rend **zéro erreur** et rendait
   **exactement une** avant correction : celle de Ko, sans aucun bruit. Options
   recopiées de `packages/config/tsconfig/base.json` et `apps/api/tsconfig.json`,
   pas écrites de mémoire — un typecheck restreint plus PERMISSIF que la porte
   réelle mentirait dans le sens le plus coûteux.
   ⚠ `booking-notification-input.ts` en est **absent** : il importe `BookingRow`,
   donc son typecheck dépend du client généré. Dit, pas caché.
3. **Deux cibles de neutralisation que SEUL `tsc` voit** (S11a-17, S11a-18).
   ⚠ **Vérifié, pas affirmé** : sous la mutation 17, `vitest` reste **15/15
   VERT** — rien ne change à l'exécution, seul le type perd `nameFr`. C'est
   exactement par ce trou que le défaut est parti en livraison.

⚠ **Ce que confirme la mesure de Ko** : les erreurs `SlotBounds` que le bac à
sable montre encore dans `bookings.service.ts` sont des **artefacts de talon**.
Chez lui, `venue` est une vraie charge Prisma, `S` s'infère, et **aucune** de
ces lignes n'est signalée. La porte réelle n'accusait qu'un seul fichier.

⛔ **Et la porte lint était rouge AVANT S11-a** : la sortie de Ko le confirme —
les trois erreurs sont dans `quotes.service.ts`, aucune dans les fichiers du
lot, dont `eslint` sort en **0**. Voir le backlog.

### Ce qui reste ouvert à la clôture

- **S11-b — le chiffrage** : tarification, prestations, confrontation D75,
  acompte. **CHEMIN DE L'ARGENT** : cadrage avec modes de défaillance écrits
  AVANT tout code. Non commencé.
- ⛔ **LA PORTE LINT ÉTAIT DÉJÀ ROUGE À L'ENTRÉE** — voir le backlog.
- ⛔ **`AGENTS.md` DU DÉPÔT ÉTAIT PÉRIMÉ** — voir le backlog.
- Les reports de la session précédente sont inchangés : E3d-2, `PROCESSING`,
  `migration-non-empty.int-spec.ts`, `password.service.spec.ts`.

## Session du 24 au 28/08/2026 — D252 à D260 · campagne DIP/ISP/SRP (S8→S10b)

⛔ **Numéros pris en LISANT ce fichier** : le dernier attribué était **D251**.
La collision D233/D249 de la session précédente venait d'avoir suivi un résumé ;
la règle a été appliquée cette fois.

### Où en est le code, en une lecture

| Tranche | Décisions | État |
|---|---|---|
| Typecheck API rouge (`getResponse`) | **D252** | ✅ livré, reproduit puis corrigé |
| Cible de harnais sans mesure comptée mordue | **D253** | ✅ livré, 4 harnais corrigés |
| Paliers de budget — autorité unique | **D254** | ✅ livré, `neutralize-maxprice` **10/10** |
| Atomicité du paiement — cadrage | **D255** | ✅ cadré · E3d-1 livré, E3d-2 reporté |
| E3d-1 — index partiel `PENDING` | D255 | ✅ livré, **8/8** |
| S8 — plafonds d'avertissements à cliquet | **D256** | ✅ livré, relevé fait |
| S9 — ISP sur `VenueProClient` | **D257** | ✅ livré, **6/6** |
| S10 — la frontière DIP | **D258** | ✅ cadré |
| S10a — ports `VenueStore` / `ReferentielsExistence` | D258 | ✅ livré, **13/13** |
| S10b-1 — cycle de vie du devis | D258 | ✅ livré |
| S10b-2 — conversion (chemin de l'argent) | D258 | ✅ livré, **20/20** avec S10b-1 |
| `BookingSource` absent des énumérations partagées | **D259** | ✅ livré |
| D163 — motif périmé | **D260** | ✅ corrigé (motif, pas décision) |
| S11 — SRP sur `BookingsService` | — | ⛔ mesuré et proposé, **non livré** |

Compteurs après cette session : API **602 / 53** · api-client **36 / 3** ·
client **287 / 20** · pro **347 / 28** · intégration **432 / 35**.
Harnais : **18 scripts, 149 cibles**, tous en `neutralisation/`.

### D252 — une INTERSECTION sur l'objet, pas sur le résultat de l'appel

`(e as BadRequestException & { getResponse(): { code?: string } })` : les deux
membres déclarent `getResponse`, TypeScript en fait une **liste de surcharges**
et retient la première — celle de Nest, qui rend `string | object`. Le membre
ajouté est mort-né, `.code` tombe en `TS2339`.

⚠ **Le typecheck était rouge pendant que les 560 tests passaient.** On caste le
RÉSULTAT de l'appel, jamais l'objet qui le porte — forme déjà employée dix-huit
lignes plus haut dans le même fichier.

### D253 — une cible de neutralisation SANS MESURE était comptée MORDUE

Dans `neutralize-solid-s6.py`, quatre cibles sur six n'ont que des mesures
d'intégration. Sans `--int`, leur liste de mesures est vide, `codes` est vide,
donc `verts` est vide, donc la branche « mordue » s'exécutait. **Le script
annonçait « 6 gardes rouges » alors que deux avaient été mesurées**, et sortait
en 0.

Mesuré en rejouant `main()` avec `lancer` bouchonné : 6 annoncées / 2 lancées.
Corrigé dans les quatre harnais portant ce construct, avec un **code de sortie 3
= CAMPAGNE INCOMPLÈTE** — un résultat partiel ne peut plus se recopier en
« n/n ».

⚠ **Conséquence sur l'historique** : `S6 · D246 · ✅ 6/6` est à lire **2/6
mesurées** si la campagne n'a pas été lancée avec `--int`.

### D254 — les paliers de budget : une seule autorité, tous sous la butée

Le même montant était déclaré **trois fois dans deux unités** : `BUDGET_CEILING`
en dinars, le `<select>` de l'accueil en dinars, `BUDGET_TIERS` de l'assistant en
**centimes**. Deux des quatre paliers valaient 2 000 000 et 4 000 000 DA, soit
au-dessus de la butée : par D69 ils signifiaient « pas de plafond », donc ils ne
filtraient **rien**. L'assistant poussait une querystring **vide** après quatre
écrans.

**Arbitrage Ko** : option (a), trois paliers — **500 000 / 750 000 / 1 000 000**,
tous strictement sous 1 500 000. Valeurs rondes délibérément **non calées sur le
jeu de démonstration** (390 000–940 000 sont des chiffres inventés pour peupler
un écran, pas une mesure du marché).

`BUDGET_TIERS` vit désormais dans `search-query.ts`, en dinars. `centsFromDinars`
devient le **seul endroit du front qui multiplie par 100**, en regard de
`dinarsFromCents` qui divise. Une garde fait tomber tout palier `>= BUDGET_CEILING` :
le commentaire d'avertissement qui existait dans `home-view.tsx` avait vécu toute
la durée du défaut sans rien empêcher.

⚠ **Divergence latente refermée** : sur les paliers hauts, le compteur de
l'assistant demandait `lte 200000000` pendant que la page de résultats, plafond
effacé par la butée, n'en demandait aucun. *Deux écrans, deux vérités*, invisible
tant qu'aucune salle ne coûtait plus que le palier.

### D255 — atomicité de l'intention de paiement : la base, pas un verrou

**Arbitrage Ko** : contrainte en base — un index unique partiel
`UNIQUE (booking_id) WHERE status = 'PENDING'`. Un verrou applicatif ne survit ni
à un crash ni à un déploiement multi-instance, qui est l'état **normal** d'une API.

⚠ **Une condition préalable annoncée était FAUSSE.** J'avais écrit que l'index
échangeait une course contre un blocage tant que les `PENDING` ne meurent pas.
Mesuré : `findFirst` rend le `PENDING` **quel que soit son âge** — le blocage
existait déjà, à l'identique. L'index et l'expiration sont donc **décorrélés**, et
E3d-1 est parti seul.

**Expiration (E3d-2) : 30 minutes, sous condition.** La durée vient du dépôt, pas
d'une référence extérieure : `AUTH.PASSWORD_RESET_TTL_MINUTES` vaut 30 et c'est
l'analogue exact (jeton à usage unique, visiteur devant son écran). ⛔ **À ne pas
confondre avec `PAYMENT_WINDOW_HOURS = 48`** : l'une borne UNE TENTATIVE, l'autre
LE DROIT DE PAYER. Les intervertir casse le produit dans les deux sens.

⛔ **Le nombre n'est pas figé** : si l'expiration est plus courte que la durée de
vie d'un lien Chargily, un visiteur paie une intention marquée morte — argent
orphelin. Cette durée n'est pas mesurée (`PAYMENTS_ENABLED=false`). Tranché **au
branchement de Chargily**, avec une assertion qui tombe si le rapport s'inverse.

⚠ `PROCESSING` existe dans l'énumération mais n'est écrit nulle part : l'index ne
le couvre pas. Ce n'est pas une régression (`findFirst` ne regardait déjà que
`PENDING`) mais c'est une **décision produit à part**, non prise.

### D256 — les plafonds d'avertissements : un PLAFOND, pas une égalité

La liste `EXEMPTES` portait un compte en toutes lettres que **rien ne vérifiait** :
un fichier exempté pouvait passer de 38 à 380 sans un bruit.

Première version livrée : cliquet à deux sens — dépasser fait tomber, **et passer
en dessous aussi**, pour qu'un progrès soit enregistré. ⛔ **C'était faux ici.**
`services-section.test.tsx` a produit 1 avertissement au relevé et 0 au run
suivant, sans qu'une ligne du dépôt ait bougé : un `act(…)` tardif tombe avant ou
après la fin du test selon l'ordre des microtâches. Une égalité stricte sur une
mesure qui flotte, c'est une suite qui rougit au hasard — et une garde à laquelle
plus personne ne croit est la maladie que ce lot devait soigner.

⚠ **L'erreur de fond** : j'ai copié la forme du cliquet a11y sans son fondement.
`b8-accessibility.e2e.ts` gèle des **signatures**, déterministes pour un DOM
donné ; j'ai transposé les deux sens sur un **compte**, qui ne l'est pas.

Retenu : dépasser fait tomber, descendre s'imprime. ⚠ **Un plafond se relève sur
plusieurs passes** : `venue-wizard.test.tsx` est passé de 3 à 4 sans qu'on le
touche, et le plafond est désormais au **maximum observé**.

⛔ **Un relevé ne sort plus jamais en vert.** Sous `UPDATE_CONSOLE_CEILINGS=1`, la
garde est **entièrement désactivée** — `afterEach` sort avant son `throw`,
`afterAll` avant toute vérification. Une variable restée dans le shell rendait
donc toutes les portes suivantes vertes **sans rien mesurer** ; vécu le
25/08/2026. Le relevé lève maintenant, et le harnais porte un **pré-vol inversé**
qui abandonne si un run de relevé sort en 0.

### D257 — ISP : six interfaces là où il y en avait une de vingt-deux membres

Le défaut n'était pas « vingt-deux méthodes » : c'est que **chaque écran en
recevait vingt-deux pour en employer entre un et cinq**. Mesuré sur les quatorze
consommateurs — aucun n'en emploie plus de cinq.

`VenueCrudClient` (5) · `VenueMediaClient` (5) · `VenueSlotTemplateClient` (3) ·
`VenuePricingRuleClient` (3) · `VenueAvailabilityClient` (4) · `VenueVisitClient` (2).
`VenueProClient` subsiste en **intersection** : aucun appelant existant ne bouge.

⚠ **Six familles et non cinq** : je proposais « disponibilité et visites » à six
membres ; la mesure dit qu'aucun écran ne croise les deux. Un regroupement qui ne
suit pas l'usage réel rend six méthodes là où deux suffisent.

⛔ **Ce qui rend l'ISP exécutoire, ce sont les CROCHETS ÉTROITS.** Le découpage
seul ne contraint personne tant que tout le monde appelle `useVenues()`. Deux
gardes muettes l'ont prouvé : **élargir un type de retour ne casse jamais un
appelant** — seul un type rétréci le fait — et un `import { useVenues as … }`
laisse le site d'appel intact. Corrigé par six assertions
`Identiques<ReturnType<…>>` et une garde statique qui cherche **l'identifiant**,
pas l'appel.

### D258 — la frontière DIP est le BLOC TRANSACTIONNEL, pas la lecture

⚠ **La prémisse de l'audit ne survit pas à la mesure.** « 21 services sur 26
importent `PrismaService` » est un **compte, pas un défaut**. Le défaut chiffrable
était ailleurs : **six specs** passaient leur faux Prisma en
`as unknown as PrismaService`, ce qui désactive tout contrôle de type. Le plus
gros, celui d'`auth`, simule `$transaction` par un passe-plat et l'admet
lui-même : *« suffisant pour vérifier QUELS appels composent la rotation »*. **Un
double casté mesure la liste des appels, jamais la décision.**

⚠ **Et le cast n'était pas de la paresse** : les délégués Prisma sont des
génériques surchargés, `vi.fn()` ne leur est pas assignable. Il n'y avait pas
d'autre issue que le cast — ou un port, dont les méthodes sont des fonctions
simples.

**La règle :** un port est justifié si le bloc est transactionnel ou concurrent,
**ou** si un spec existe et son double est casté, **ou** si le collaborateur est
réellement extérieur. **Pas** parce qu'un service importe Prisma.

⛔ **`BookingsService` n'a PAS été porté, et c'est motivé** : il porte **zéro
`$transaction`** — S5b a déplacé ses deux blocs risqués derrière `BookingLocks` —
et ses douze accès restants sont des lectures dont l'écart est **assumé par écrit**
dans `booking-locks.types.ts`. Le faire aurait défait une décision arbitrée sans
défaut mesuré.

**S10a** — `venues.service.ts` : deux ports (`VenueStore` 7 méthodes,
`ReferentielsExistence` 3). ⚠ Sept et non six : `trouverIdVivante` n'est pas un
doublon de commodité — `VENUE_PRO_SELECT` embarque photos, scènes et liaisons, et
fusionner ferait payer ce select à chaque contrôle d'appartenance.
Assertions : 22 → **49** (22 au service, 27 à l'adaptateur), aucune perdue.

**S10b-1** — les quatre transactions du devis, entières, dans l'adaptateur. Le
`ConflictException` sort de la transaction : inoffensif — un refus signifie
`count === 0`, rien n'avait été écrit — mais réel, et dit dans le code.
`QuotesService` a reçu **son premier spec unitaire**.

**S10b-2** — la conversion. Les quatre montants sont **nommés un par un** ; les
lignes de service restent dans la **même requête** que la demande, sinon un total
sans détail. ⛔ **Le refus ne se conclut pas sur un code de driver** : `bookings`
porte DEUX contraintes uniques, et sur P2002 l'adaptateur **relit** — le
diagnostic vient de l'état de la base, pas des entrailles de Prisma.

### D259 — `BookingSource` manquait aux énumérations partagées

Ses trois voisines de la même table y étaient (`BookingMode`, `BookingStatus`,
`PaymentMethod`) ; `BookingSource` avait été oublié à la constitution du fichier,
et chaque écrivain retapait `"WALK_IN"` en chaîne littérale. Le typer en union
littérale dans un port aurait créé une **seconde autorité sur un jeu de valeurs**.

⚠ C'est une instance de la classe que **D237** avait nommée : rien ne compare
`schema.prisma` aux énumérations partagées. Un test qui les diffe fermerait la
classe entière.

### D260 — D163 : le MOTIF corrigé, la décision conservée

Le commentaire affirmait que `Booking.quoteId` référence le devis **sans recopier
les montants**. Mesuré : `convert()` recopie les quatre montants, et **rien** dans
`apps/api/src` ne lit un montant à travers `quoteId`. Écraser un devis ne
toucherait aucune réservation.

La décision tient, pour une raison qu'il fallait dire correctement : **le devis
est le document remis au client**. L'écraser ferait diverger ce que le pro a en
base de ce que le client a en main.

⛔ **Q3 est planifié contre ce commentaire.** Une justification périmée sur le
chemin de l'argent coûte plus cher qu'une absence de justification.

### Ce qui reste ouvert à la clôture

- **E3d-2** — expiration des `PENDING`, bloquée sur la durée de vie d'un lien Chargily.
- **`PROCESSING`** doit-il bloquer comme `PENDING` ? Décision produit non prise.
- **S11** — SRP sur `BookingsService` : mesuré (`create` = **200 lignes sur 729**,
  onze responsabilités), découpage proposé en **S11-a** (notifications +
  recevabilité) et **S11-b** (chiffrage, chemin de l'argent). Non validé, non livré.
- **`migration-non-empty.int-spec.ts`** — `beforeAll` bloqué à 60 000 ms **deux
  fois**, tests SAUTÉS. Ce n'est pas de la lenteur : c'est un `DROP DATABASE` qui
  attend. Un diagnostic a été posé (`statement_timeout`, occupants relevés et
  nommés) mais **la cause n'est pas établie**.
- **`password.service.spec.ts`** — argon2 consomme 3,4 s d'un budget de 5 s au
  repos. Flottement latent, non traité.

## Session des 23 et 24/08/2026 — D249 à D251 · 404 atteignable, `maxPrice`, hors horizon

### ⚠⚠ COLLISION DE NUMÉROTATION, repérée en écrivant ces lignes

Les décisions de cette session ont d'abord été écrites **D233** et **D234** —
numéros DÉJÀ attribués à la campagne SOLID/Strategy des 20–22/08. L'erreur vient
d'avoir repris la numérotation annoncée par un **résumé de session** au lieu de
lire le dernier numéro attribué ICI. Corrigée dans les **sept fichiers livrés**
et dans `neutralize-404.py` ; portes et harnais rejoués après correction.
⛔ **Un numéro de décision se prend en lisant ce fichier, jamais un résumé.**

### Où en est le code, en une lecture

| Tranche | Décisions | État |
|---|---|---|
| 404 réellement atteinte | **D249** | ✅ livré, mesuré sur serveur réel |
| Soft-404 (statut 200 sur les refus) | **D250** | ✅ livré, mesuré des deux côtés |
| Décor de la 404 → image statique | **D251** | ✅ livré, mesuré |
| Correction `maxPrice` | D228 | ✅ **LIVRÉ** — ⚠ défaut B ouvert, voir ci-dessous |
| Refus hors horizon | D227 | ✅ **LIVRÉ** |
| Point B — 404 front | D221 | ⚠ **motif CORRIGÉ par D249**, décision conservée |
| Lot ③ — assistant | D229–D231 | ⛔ toujours non livré |

Compteurs après cette session : client **264 / 19** · API **560 / 50** ·
i18n **1093 = 1093**. Harnais : `neutralize-404.py` **12/12**,
`neutralize-maxprice.py` **8/8**, `neutralize-horizon.py` **6/6**.

---

**D249 — ⛔ LES DEUX PAGES 404 N'ÉTAIENT ATTEINTES PAR PERSONNE.**
Livrées le 19/08, correctes — traduites, dans la charte, deux sorties — et
jamais rendues pour un visiteur. **Deux causes, toutes deux hors du contenu.**

1. **Un nom de fichier.** La page racine s'appelait `_not-found.tsx`. Le routeur
   ne reconnaît qu'une liste **fermée** de noms spéciaux ; ce fichier n'était pas
   une route en erreur, il n'était **pas une route du tout**.
2. **Une frontière imbriquée n'attrape pas ce qui n'apparie rien.**
   `[locale]/not-found.tsx` n'est une frontière que pour un `notFound()` levé
   dans un segment DÉJÀ apparié. Une URL inconnue n'apparie pas `[locale]` :
   Next remontait au 404 racine, c'est-à-dire — vu (1) — à rien.

D'où `[locale]/[...rest]/page.tsx`. ⚠ Son travail n'est PAS d'appeler
`notFound()`, c'est de faire **apparier `[locale]`** pour que le layout localisé
se monte avant. Mesuré avant correction :

```
GET /fr/nimportequoi  → 404 « This page could not be found » (ANGLAIS)
GET /wp-login.php     → 404, corps VIDE
```

**⚠ CORRECTION DU MOTIF DE D221 — la raison écrite était FAUSSE.**
D221 justifiait la page racine par « un chemin dont la LOCALE est invalide
(`/xx/quoi`) ». Ce cas **n'arrive pas** : l'intergiciel de next-intl ne voit pas
`xx` comme une locale invalide, il ne la voit pas comme une locale du tout, et
redirige. Mesuré : `/xx/quoi` → **307** vers `/fr/xx/quoi`. Le `hasLocale(...)`
du layout ne refuse **jamais** rien en production.
La vraie raison est le `matcher` de `middleware.ts`, qui s'exclut des chemins
contenant un point : `/wp-login.php`, `/foo.bar`, `/sitemap.xml` n'obtiennent
aucun préfixe de locale et atterrissent sur la page racine — d'où son
bilinguisme en dur, aucune langue n'ayant été négociée.
⚠ **La DÉCISION est conservée ; c'est son MOTIF qui est remplacé.** Un motif
invalidé se corrige, il ne s'efface pas.

⚠ **Ce qu'un test de rendu n'aurait jamais vu.** Monter le composant et vérifier
qu'il affiche « Cette page n'existe pas » ne mesure pas que quelqu'un l'atteint.
La garde livrée mesure donc des **noms de fichiers** — la seule chose qui avait
cédé. Même famille que D218 et D228.

---

**D250 — ⛔ TOUS LES 404 DU SEGMENT SORTAIENT EN HTTP 200.**
`[locale]/loading.tsx` ouvrait une frontière Suspense au-dessus de **toutes** les
pages du segment, donc au-dessus des deux seules qui peuvent refuser. Next vide
la coquille avant que le refus ne remonte : l'en-tête est déjà parti, le 404 sort
en 200. Mesuré **des deux côtés**, à la ligne près :

```
loading.tsx en [locale]/ → GET /fr/nimportequoi = 200
loading.tsx retiré       → GET /fr/nimportequoi = 404
```

⚠ **CE N'ÉTAIT PAS UN ARBITRAGE, C'ÉTAIT UNE DETTE.** `salles/[slug]/page.tsx`
portait **déjà l'invariant par écrit**, dans son propre fichier : « dans tous ces
cas un 404 HTTP, jamais une page introuvable servie en 200 : un soft-404 se fait
indexer comme une vraie page ». Il n'a jamais été tenu.

**Correction : borner la frontière, pas la supprimer.** Le groupe de routes
`(recherche)` — invisible dans l'URL — la limite à la seule page de liste, celle
qui ne peut pas refuser. ⚠ `salles/loading.tsx` n'aurait pas suffi : il recouvre
`salles/[slug]`, donc la salle dépubliée serait restée en 200 (cible C10).

**Ce que ça coûte, relevé et non supposé** : la fiche de salle n'a plus de
squelette. `getVenueBySlug` est en `revalidate: 300` — la page la plus lue est
servie de cache la plupart du temps ; `searchVenues` est en `no-store`, c'est là
que le serveur attend vraiment, et là que le squelette reste.

Prouvé par une sonde de **forme identique** à `salles/[slug]` (segment dynamique,
`ƒ`, `notFound()` sur identifiant inconnu) : `/existe` → 200, `/inexistante` →
**404**.

⚠ **INVARIANT GÉNÉRAL QUI EN SORT** : *aucune frontière Suspense au-dessus d'une
page qui peut refuser*. La garde relève les pages **dans la source** (celles dont
le `page.tsx` contient `notFound();`) et remonte l'arborescence : une troisième
page qui apprendrait à refuser est couverte le jour où elle est écrite.

---

**D251 — Le décor de la 404 est une IMAGE STATIQUE, pas un nuage engendré.**
Le nuage de mots a d'abord été livré comme un composant qui calculait sa
disposition à chaque rendu : détection de collisions, largeurs imposées par
`textLength`, deux canevas selon l'écran. Ko a **révoqué le raisonnement qui
l'avait motivé** — « texte indexable » est sans objet sur une page en `noindex`
(D216), et un décor ne doit pas être lu à voix haute, il doit sortir de l'arbre
d'accessibilité.

Retiré : le composant, ses 16 tests, quatre cibles de harnais, et cinq règles CSS
sur six. Reste **une image**, `apps/client/public/404-nuage.svg`, posée par
`<img alt="" aria-hidden="true">` en `object-fit: cover`.

⚠ **DES TRACÉS, PAS DU TEXTE, et ce n'est pas un détail.** Une image référencée
par `<img>` est un document **isolé** : elle n'accède ni au CSS de la page ni à
ses polices auto-hébergées. Du `<text>` y retomberait sur une police système —
et sur l'arabe, cela veut dire des lettres **non liées**, illisibles. Le défaut
ne se verrait que sur la moitié arabe du public. Les glyphes sont donc façonnés
par **HarfBuzz**, le moteur des navigateurs, avec les sous-ensembles Readex Pro
du dépôt ; les formes contextuelles sont celles que la police prévoit.

⚠ **LES OPACITÉS SONT GRAVÉES AU NIVEAU DU MODE SOMBRE.** Une image en `<img>`
ne connaît pas le thème de la page : elle ne peut pas s'éclaircir sur fond noir.
On grave donc les valeurs fortes et la page **atténue** en clair (`opacity: .7`).
L'inverse était impossible : `opacity` ne dépasse pas 1.

⚠ **LE TEXTE « 404 » A DISPARU DE L'ÉCRAN**, à la demande : le code vit dans le
statut HTTP, là où les machines le lisent ; à l'écran il ne disait rien que la
phrase ne dise mieux. Une garde vérifie qu'il ne revient pas.

Mesures de l'image : 73 mots, tailles 26→130 px, **0 chevauchement**,
**0 empiètement** sur le vide central, 20 mots du vocabulaire sur 21,
188 ko brut / **27 ko** compressé. Un seul fichier pour tous les écrans ; le vide
central est calibré pour tenir au bureau **comme** sur mobile — sans ce calibrage,
une image unique ne pouvait pas servir les deux.
⚠ Sa **recette complète** (canevas, vide, police, moteur, graine `20260824`) est
écrite dans l'en-tête du fichier : aucun script de génération n'entre au dépôt,
mais l'image n'est pas orpheline.

---

**D227 — ✅ LIVRÉ.** Refus hors horizon, code **distinct**
`AVAILABLE_ON_BEYOND_HORIZON`, une seule lecture d'horloge dont les deux bornes
dérivent, quatrième issue **à plat** sur `SearchOutcome`, `switch` sans `default`
— une cinquième issue fera tomber la compilation. À l'écran : **un panneau, deux
jeux de textes**.
⚠ **Le jour de l'horizon LUI-MÊME est accepté** (`>`, pas `>=`), symétriquement à
aujourd'hui en bas. D55 : écrire la borne avant le cas réel, c'est se donner
raison.
⚠ **La fixture `LOINTAIN = "2099-06-02"` a dû disparaître.** Choisie « très
loin » pour n'être jamais passée, elle est devenue exactement ce qui se refuse et
faisait tomber trois tests qui ne parlaient pas d'horizon. Remplacée par deux
bornes **dérivées** de l'horloge figée et de `BOOKING_HORIZON_MONTHS` — une
chaîne écrite à la main aurait cessé de désigner l'horizon au premier changement
de la constante, en restant verte.
⚠ Correction d'un commentaire faux trouvé en chemin : `search-view.tsx`
justifiait son panneau par « le sélecteur de date ne propose aucune date passée ».
**Aucun sélecteur n'existe** — pas un `type="date"` dans tout `apps/client`.

---

**D228 — ✅ LIVRÉ, avec un SECOND défaut laissé OUVERT.**
La correction du nom est faite : `maxPrice` en priorité, `maxPriceCents` en repli
**jamais dans l'autre sens**, multiples de 100 seulement, reste non nul
**abandonné et non arrondi**, `toPublicQuery` seule à écrire, dette datée au
**19/11/2026** dans le code.
⚠ **La PRÉSENCE de la clé décide de la branche, sa VALIDITÉ décide de la valeur.**
`?maxPrice=` **vide** compte comme présent : un `<form method="get">` soumet ses
champs vides, donc « peu importe » s'écrit comme ça, et replier là
ressusciterait un plafond que le visiteur vient d'effacer.

⚠ **CAUSE STRUCTURELLE, dans l'assistant** : *une seule querystring servait deux
contrats*. Le même objet allait à `countVenues` (API, centimes) **et** à
`router.push("/salles?…")` (URL publique, dinars). Le compteur annonçait le bon
nombre, la page de résultats affichait tout — deux écrans, deux vérités, aucun
test pour les confronter. Un seul assembleur désormais, **une seule ligne de
différence**.

⛔ **DÉFAUT B, TROUVÉ EN MESURANT, NON TRANCHÉ.** `atCeiling` efface tout plafond
`>= BUDGET_CEILING` (1 500 000 DA) — D69, une poignée en butée ne filtre pas. Or
le formulaire d'accueil propose **2 000 000 et 4 000 000 DA**. Même le nom
corrigé, **deux des quatre options ne filtrent rien** — état inchangé, ni recul
ni réparation. Choisir les paliers offerts au visiteur est une **décision
produit** : descendre les paliers sous la butée, relever `BUDGET_CEILING`, ou
assumer que « 4 000 000 DA » veut dire « pas de plafond ».

⚠ **LE TEST VALIDAIT LE DÉFAUT** (famille D219) : `filter-wizard.test.tsx`
assertait `maxPriceCents=100000000` **dans l'URL poussée** — le contrat de l'API
sur une adresse publique. Vert depuis la livraison, sur un budget jeté. Corrigé,
**pas contourné**, et renforcé par le geste qui manquait : l'URL poussée est
**relue avec le parseur réel de la page d'arrivée**.

---

### ⛔ CONSTAT MESURÉ, NON CORRIGÉ : le HTML initial des 404 est VIDE

En production, les deux pages 404 délivrent une coquille `<html id="__next_error__">`
avec une frontière Suspense **non résolue** ; le contenu n'arrive que par la
charge RSC, donc **rendu côté client après hydratation**. Témoin `/fr/cgu` :
page complète dans le HTML. Antérieur à cette session, prouvé en A/B sur le même
build.
⚠ **Une note de livraison antérieure annonçait « 404 traduite, layout complet ».
C'était faux** : la phrase était cherchée par sous-chaîne dans la réponse
entière, et s'y trouvait dans le **script de streaming**, pas dans le HTML.
Le statut HTTP 404 est correct, un navigateur affiche bien la page ; un robot
sans JS voit une page blanche. La correction connue passe par un `app/layout.tsx`
racine, ce qui déplacerait le `<html>` porté par `[locale]/layout.tsx` :
**décision de structure, non prise**.

---

## Sessions des 20 au 22/08/2026 — D233 à D248 · campagne SOLID/Strategy

### Où en est le code, en une lecture

| Lot | Décisions | État |
|---|---|---|
| S0 / S0-bis — README | D233 | ✅ livré, appliqué |
| S1 — autorité des statuts verrouillants | D234 | ✅ livré, 2/2 mesurées avec `--int` |
| S2 — cœur commun des notifications | D235 | ✅ livré, 5/5 |
| S2-bis — trous de fixtures d'intégration | D236 | ✅ livré |
| **R4 — le refus de devis rendait 500** | **D237, D238, D239** | ✅ **défaut de production corrigé**, 2/2 |
| S3 — politique de transition pure | D240, D241 | ✅ livré, 6/6 |
| S4 — registres de stratégies | D242 | ✅ livré, 7/7 |
| S5a-0 / S5a — port du paiement | D243, D244 | ✅ livré, 9/9 |
| S5b — port de la concurrence | D245 | ✅ livré, 5/5 |
| S6 — événements post-commit | D246 | ✅ livré, 6/6 |
| S7 — garde des sorties de test | D247 | ✅ livré, 2/2 |
| R5 — faux positif du harnais | D248 | ✅ correctif livré |

**Compteurs mesurés au 22/08/2026** — API **556/50** · api-client **34/2** · client **239/18** · pro **344/27** · **intégration 424/34** · parité i18n **1090 = 1090** · typecheck, lint, build : exit 0.
**Campagnes de neutralisation : 74 gardes rouges** sur douze campagnes (13 + 10 + 7 + 2 + 2 + 5 + 6 + 7 + 9 + 5 + 6 + 2), toutes rejouées par Ko après le correctif D248.

---

**D233 — `prisma migrate dev` ALIGNE la base sur le schéma ; il ne « propose » pas.**
Le README décrivait `migrate deploy` sous le nom de `migrate dev` et promettait qu'il régénère le client. Il ne le fait pas. Le danger n'était pas l'ordre donné mais celui qu'il induisait : un opérateur constatant que le client n'a pas bougé cherche la commande qui le régénère — celle qui a détruit la FK composite B2. **Motif corrigé** : `migrate dev` ne connaît QUE ce que `schema.prisma` déclare ; toute table, colonne ou contrainte présente en base mais absente du schéma — au premier rang `EXCLUDE`, index partiels, certains `CHECK`, FK composites — lui apparaît comme un écart, et « corriger » veut dire SUPPRIMER l'objet de la base réelle. Ce n'est pas une erreur de jugement de l'outil, c'est son fonctionnement nominal.

**D234 — L'autorité sur les statuts verrouillants est `HARD_BOOKING_STATUSES`, et elle l'est en TROIS endroits, pas deux.**
L'audit en nommait deux. Le recensement en a trouvé un troisième : `availability.service.ts:53`, à **quatre lignes** de la dérivation correcte, dans un fichier dont le commentaire proclamait déjà l'autorité unique. Le danger n'y était pas la recopie mais l'**asymétrie** : un statut verrouillant ajouté serait entré dans le `Set` de classification sans entrer dans le `WHERE` de chargement — le calendrier aurait annoncé **libre un créneau que la base verrouille**. `PENDING` reste écrit sur place : c'est ce que ce fichier AJOUTE au verrou dur, pas une seconde autorité sur celui-ci.

**D235 — [ÉCART] Le cœur commun des notifications est une FONCTION, pas un service injectable.**
La directive demandait un injectable. Mesuré : `visit-notifications.service.spec.ts` construit son service par quatre arguments positionnels ; une cinquième dépendance injectée aurait imposé de MODIFIER cette spec pour la faire repasser au vert — le geste qu'un lot de refactoring n'a pas le droit de faire. Une fonction partagée laisse les constructeurs intacts et suit la convention déjà en place (`renderTemplate`). Le `logger` est **passé par l'appelant** : les deux services posent un contexte distinct, et un `setContext` par appel sur une instance partagée aurait créé une course entre requêtes concurrentes.

**D236 — Une garde posée sur du code partagé se vérifie chez TOUS ses consommateurs, et l'intégration en avait trois trous.**
S1 et S2 avaient différé la moitié de leur preuve à l'intégration. Cette moitié est revenue **muette** : aucune réservation `CONFIRMED` n'existait dans toute la suite d'intégration ; `conflictIds` n'était exercé qu'avec des `PENDING`, donc `locks()` n'était atteint par aucun test ; le statut des lignes `Notification` n'était pas asserté côté réservation. Quatre tests ajoutés. **La leçon dépasse le lot : une preuve différée n'est pas une preuve, et il faut vérifier que le filet existe AVANT de s'y suspendre.**

**D237 — ⛔ DÉFAUT DE PRODUCTION : `CANCELLED` n'a jamais été ajouté au type PostgreSQL `QuoteStatus`.**
Q3a (D161) l'a introduit dans `schema.prisma` et dans le code ; aucune migration ne l'a ajouté au type. Chaque `POST /quotes/:id/cancel` produisait un `22P02` que le filtre d'exception de Nest repliait en 500 générique. **L'action « je clos ce devis » était inopérante depuis Q3a.** Typecheck, lint, build et 1 109 tests unitaires passaient tous. Les 23 énumérations Prisma ont été diffées contre la base : **une seule divergence**, celle-ci. Aucune reprise de données nécessaire — la valeur n'existant pas, aucune ligne ne pouvait la porter. Corrigé par `20260821000000_quote_status_cancelled`.
⚠ **Ce défaut est l'invariant du dépôt pris en flagrant délit** : les migrations sont la SEULE autorité sur le schéma réel, et **rien ne compare `schema.prisma` à la base**.

**D238 — `quotes_sent_at_coherent` portait une prémisse que Q2 avait rendue fausse.**
La contrainte disait « tout état autre que DRAFT implique une remise » — vrai en août, quand `SENT` était un statut. Depuis Q2/D160, `DRAFT` est le seul état ouvert et la remise est un geste RÉPÉTABLE qui ne change pas le statut : clore un brouillon jamais remis est un cas réel, que l'entonnoir D162 compte explicitement. **D55 dans le sens qui dérange** : le cas réel existe, la borne le refuse, c'est la BORNE qui est fausse. Corrigé par `20260821000100_quote_cancel_without_delivery`, en deux migrations et non une : `ALTER TYPE … ADD VALUE` interdit d'utiliser la valeur neuve avant le commit.
⚠ **`ACCEPTED` porte la MÊME prémisse périmée** — un brouillon se convertit sans remise (D160), et E3 posera `ACCEPTED` sur une ligne à `sent_at` nul. **À trancher avant que E3 n'écrive son premier `ACCEPTED`.**

**D239 — Une garde dont l'objet disparaît se retire PAR ÉCRIT, jamais en sourdine.**
La garde qui mesurait l'effet du tri D166 sur les lignes semées n'a plus d'objet : D166 n'est plus la dernière migration, elle s'applique pendant la préparation, sur une base encore vide. Elle a été mise en `it.skip` un instant : **c'était une erreur**. Une garde en sourdine se lit comme une garde, se compte comme un test, et ne mesure rien — le pire des trois états. Ce qu'on y perd est consigné : plus rien ne vérifie que la clause `NOT EXISTS` de D166 épargne les devis convertis.

**D240 — Les transitions vivent dans deux modules PURS ; le code transactionnel n'a pas bougé.**
`booking-transitions.ts` et `quote-transitions.ts` portent la table commande → statuts source → statut cible. Le verrou `FOR UPDATE`, la relecture D117, le contrôle de blocage, le check-and-set et la traduction de l'`EXCLUDE` sont restés lettre pour lettre. Côté devis, le tableau dit ce que le code ne disait nulle part : **trois des quatre commandes n'écrivent aucun statut**. `quoteWrittenStatus` LÈVE plutôt que de rendre un repli — un `?? CANCELLED` au site d'appel aurait rendu le champ `to` décoratif.

**D241 — Une matrice qui se relit elle-même n'est pas une garde.**
La spec exhaustive de la politique recalculait les statuts permis **depuis le tableau muté** : elle prouvait que la fonction de décision est fidèle au tableau, elle ne figeait aucune valeur. Ouvrir `cancelAsPro` à `PENDING` la laissait verte — et l'intégration aussi, car **rien nulle part** ne vérifiait qu'un pro ne peut pas annuler une demande encore `PENDING`. Ce n'est pas cosmétique : `decline` écrit `DECLINED` et `declineReason`, `cancel` écrit `CANCELLED` et `cancellationReason` ; l'entonnoir compterait l'un pour l'autre. Deux gardes ajoutées, dont une comportementale et non un instantané du tableau.

**D242 — [ÉCART] Un `pricingType` inconnu est REFUSÉ, il ne se vend plus au prix « à l'unité ».**
La cascade d'origine n'avait pas de branche `PER_UNIT` : c'était le **retombé**. Un type que le code ignore se vendait au prix à l'unité, en silence, sur le chemin de l'argent. Conserver ce comportement aurait voulu dire écrire `?? RESOLVERS.PER_UNIT` — coder sciemment le piège. Le `Record` exhaustif fait mieux : il ne compile plus si l'énumération gagne une valeur sans stratégie. Côté moteur de règles, **aucun écart** : le `default: return false` est conservé, et il n'est pas redondant avec l'exhaustivité — celle-ci vaut à la compilation, une colonne de base peut porter autre chose.

**D243 — Sur le chemin de l'argent, on pose le filet AVANT de déplacer le code.**
Le cadrage S5a a mesuré que `PaymentsService` n'avait aucune spec, aucun test d'intégration touchant la table `Payment`, et **aucun appelant**. `openIntent` pouvait être cassé de dix façons sans qu'une porte ne bouge. Un sous-lot `S5a-0` a donc écrit la mesure **avant** l'extraction, sans déplacer une ligne. ⚠ **La prémisse du pilote, que j'avais moi-même écrite, était fausse** : ce qui rendait le paiement « facile » — rien ne dépend de lui — est précisément ce qui le rendait impropre à servir de pilote sans filet.

**D244 — Port de persistance du paiement ; les gardes suivent le code qu'elles surveillent.**
Quatre des treize gardes de S5a-0 mesuraient des `where` — la règle d'accès D47 et l'idempotence. Extraire le port les aurait fait disparaître du niveau service : elles ont **déménagé avec le code**, dans une spec d'adaptateur. Bilan 19 gardes contre 13. ⚠ **Nuance à retenir** : « mocker Prisma pour vérifier qu'on appelle Prisma ne mesure rien » est vrai pour « `findFirst` a été appelé », faux pour « le pro propriétaire est dans le `OR` » — celle-là mesure une règle de sécurité.
⚠ **Course rapportée, non corrigée** : `findFirst(PENDING)` puis `create` ne sont pas dans une transaction. Deux appels concurrents peuvent créer deux intentions ; `payments_one_paid_per_booking` n'interdit qu'un second `PAID`. **À rendre atomique avant E3c.**

**D245 — [ÉCART] S5b prend la CONCURRENCE, pas la persistance entière.**
`bookings.service.ts` porte 23 accès Prisma ; un port complet compterait onze à treize méthodes — l'interface fourre-tout pour laquelle `AuthService` avait été écarté. Le risque tient dans DEUX blocs. Le critère « `BookingsService` ne référence plus `PrismaService` » est **abandonné** et remplacé par un critère mesurable et tenu : **plus aucun `$transaction`, aucun SQL brut, aucun code SQLSTATE dans le service**. Vérification par lecture consignée : 19 des 36 lignes exécutables reprises au caractère près, les 17 écarts se rangeant tous dans trois transformations mécaniques.
⚠ `BookingRow`, type dérivé de Prisma, traverse le port : redéclarer une vingtaine de champs à la main aurait créé une **seconde autorité sur la forme d'une ligne**. Entre deux principes qui se contredisent, l'autorité unique l'emporte — D237 a montré le prix de l'autre choix.

**D246 — D63 n'est pas révoquée, son motif est ÉTENDU.**
Huit appels directs sont devenus sept publications et une table d'abonnements. La publication reste **synchrone, en processus, `await`ée**, aux mêmes sites d'appel qu'avant — c'est-à-dire après résolution de la transaction. Ce que le lot apporte est une **couture** : E3c substituera pg-boss sans toucher aux cas d'usage.
⚠ **Renforcement signalé** : la couture attrape et journalise les erreurs de handler. Le cœur commun n'attrapait que l'ENVOI ; un gabarit cassé remontait en 500 sur une réservation déjà écrite. Et un handler tombé ne prive plus les suivants de leur courrier.
⚠ **Risque introduit** : publier sans abonné ne lève pas. Couper une ligne de la table de routage ne casse rien de visible — d'où quatre cibles de campagne qui coupent un abonnement et se mesurent **en base**.

**D247 — La garde des sorties de test ferme l'avenir, elle ne nettoie pas le passé.**
119 avertissements `not wrapped in act(...)` sur sept fichiers, dont **102 sur deux**. Un tel avertissement signale un état mis à jour APRÈS la fin du test — le symptôme d'une régression asynchrone. Tant que la sortie en contient cent, personne ne verra la cent-unième. La garde collecte pendant le test et **juge dans le `afterEach`** : lever depuis le `console.error` que React appelle interromprait React au milieu de son rendu. Les sept fichiers sont **exemptés nommément, avec compte et date**. Aucune correction n'a été faite : aucun fichier touché par S1→S6 n'est bruyant, et les deux plus gros portent des gardes qu'on affaiblirait en les faisant taire.

**D248 — Une cible de neutralisation SANS MESURE n'a pas eu lieu ; elle n'est ni rouge ni verte.**
Quand toutes les mesures d'une cible étaient désactivées (cibles purement `int` lancées sans `--int`), la liste des verdicts était vide — donc « aucun vert » — donc la cible était comptée comme **mordue**. S6 annonçait six gardes rouges alors que quatre n'avaient rien exécuté. ⚠ **C'est la famille D209 à l'endroit le plus embarrassant possible** : l'outil dont le seul métier est de démasquer les gardes qui ne mesurent rien rapportait lui-même comme succès des cibles qui ne mesurent rien. Le défaut était latent dans S1, S2 et S3 — jamais déclenché, chacune de leurs cibles ayant au moins une mesure unitaire. Corrigé : marquage `⊘ NON MESURÉE`, listage séparé, **code de sortie 3** et mention « CAMPAGNE INCOMPLÈTE ».

## Sessions des 19 et 20/08/2026 — D210 à D232

## Où en est le code, en une lecture

| Tranche | Décisions | État réel |
|---|---|---|
| `availableOn` (annotation par date) | D210–D215 | ✅ livré, mesuré, **appliqué par Ko** |
| SEO (`robots`/`canonical`) | D216 | ✅ livré, mesuré, **appliqué par Ko** |
| Point B — 404 front + API | D221 | ⚠ livré ; **front jamais rendu en test** |
| Point D — chrome partagée | D222–D223 | ✅ livré, mesuré, **appliqué par Ko** |
| Exclusion situation B | D225–D226 | ⚠ zip livré 20/08 — **application par Ko NON confirmée** |
| Refus hors horizon | D227 | ⛔ **NON livré** — codé puis perdu au re-baselinage |
| Correction `maxPrice` | D228 | ⛔ **NON livré** — défaut de production TOUJOURS ACTIF |
| Lot ③ — assistant | D229–D231 | ⛔ **NON livrable** — voir D232 |

⚠ **TABLEAU PÉRIMÉ SUR TROIS LIGNES** — voir la section D249–D251 en tête de
document. D227 et D228 sont **livrés** depuis le 23/08/2026 ; le motif de D221
est **corrigé** par D249. Conservé tel quel pour la trace du raisonnement.

---

**D210 — `availableOn` ANNOTE la page, il ne la filtre pas.**
`GET /venues?availableOn=YYYY-MM-DD` ajoute `availableOnDate` à chaque salle de
la page ; la salle prise reste dans `items`, grisée et cliquable, `total` ne
bouge pas. Filtrer coûterait O(catalogue) là où annoter coûte O(page) — mais ce
n'est pas la vraie raison : le client cherche une salle, lui cacher celle qui est
prise le 2 juin l'empêche de découvrir qu'elle est libre le 9.
Coût : **trois requêtes**, bornées par `venueId IN (…)`. **Aucune requête de
fériés** — un férié déplace le PRIX, jamais la disponibilité.

**D211 — `availableOnDate` a TROIS valeurs, et `null` ne grise JAMAIS.**
*⚠ CORRIGÉE PAR D225. Conservée ici pour la trace du raisonnement.*

**D212 — L'ÉCHO de la date fait partie du contrat.**
`VenueListResponse.availableOn` renvoie la date annotée, `null` si non demandée.
Même raison que les bornes effectives de **D49** : sans écho, l'appelant devrait
PRÉSUMER que la réponse porte sur la date qu'il croit avoir envoyée. L'écran
affiche la date de **l'écho**, jamais celle de l'URL.

**D213 — `AVAILABLE_ON_PAST` : ÉCART ASSUMÉ AVEC D49.**
D49 écrête parce qu'elle borne une **FENÊTRE** — une fenêtre qui rétrécit reste
une réponse à la question posée. `availableOn` est un **POINT** : l'écrêter
répondrait sur un autre jour, en silence, et la grille grisée mentirait.
⚠ Le refus vit dans le **SERVICE**, jamais dans Zod : le passé dépend de
`Date.now()`, et le mettre au schéma le rendrait non déterministe pour tous ses
appelants — dont leurs tests, qui deviendraient sensibles à l'heure d'exécution.
⚠ **AUJOURD'HUI EST ACCEPTÉ** (`<`, jamais `<=`) : le cas réel écrit avant la
borne (**D55**) est un couple qui cherche une salle *pour ce soir*.
⚠ Corollaire accepté : refus **intermittent** au voisinage de minuit à Alger.

**D214 — `PENDING` ne grise pas, et n'est même pas CHARGÉ (D101).**
Ne pas le demander est plus sûr que le filtrer plus loin : un filtre s'oublie au
prochain remaniement, une requête qui ne le demande pas ne peut pas le laisser
passer.

**D215 — Le moteur est SCINDÉ, pas trompé.**
`computeDaySlotStatuses` extrait de `computeDayAvailability`. L'alternative —
passer `basePriceCents: 0` puis jeter la sortie — aurait produit un chiffre faux
issu d'un moteur pur. Une seconde implémentation du recouvrement aurait fini par
griser une salle dans la grille et la montrer libre dans son calendrier (**D78**).
⚠ **Appariement STRUCTUREL, pas positionnel** : `statuses[index]` refusé par
`noUncheckedIndexedAccess`, et le compilateur avait raison sur le fond — « même
ordre, même cardinalité » était un invariant écrit en COMMENTAIRE.

**D216 — Règle SEO : une page de recherche portant un paramètre est une VARIANTE.**
`noindex, follow`, canonical sur la page nue. Le `follow` est le point : les
FICHES, seules pages qu'on veut indexer, sont atteintes **depuis** ces variantes.
⚠ **ARBITRAGE** : renonce à la longue traîne (« salles avec parking à Bab
Ezzouar »). Réversible en sortant une combinaison de `isVariant`.
⚠ Lit les `searchParams` **BRUTS** : `parseSearchParams` normalise, et une URL
normalisée redeviendrait indexable alors qu'elle est bien une seconde adresse.
⚠ Une clé VIDE n'est pas une variante — un `<form method="get">` soumet ses
champs vides.
⚠ `NEXT_PUBLIC_SITE_URL` **OBLIGATOIRE en production** : absente, chaque page
annonce une canonical inatteignable — le site se désindexe lui-même.
⚠ **Correction** : `/compte` portait DÉJÀ un `robots`. Le « aucune balise nulle
part » du backlog était faux, repris sans vérification.

**D217 — `SearchOutcome` : trois issues, parce qu'elles se disent en trois phrases.**
Un refus MÉTIER replié sur `null` comme une panne affichait « momentanément
indisponible » — un message faux, qui invite à réessayer une requête qui ne
marchera jamais.

**D218 — ⛔ UNE PORTE MESURÉE N'EST PAS UNE PORTE VERTE À LA LIVRAISON.**
L'archive v1 a été livrée **ROUGE au typecheck API**, avec une note annonçant
« 0 erreur ». Exact à l'instant de la mesure, faux à l'instant de l'emballage :
les specs avaient été écrites entre les deux.
**Règle : relancer les portes APRÈS la dernière modification, jamais avant.**
Corollaire : une archive fautive déjà partagée se **supprime** — un lien mort
vaut mieux qu'une archive qu'on extrait par erreur.

**D219 — ⛔ LE CODE D'ERREUR EST SOUS `message`, PAS À LA RACINE.**
`AllExceptionsFilter` enveloppe en `{ statusCode, message, path, timestamp }`.
`body.code` avait été écrit **de mémoire** : la lecture n'aurait JAMAIS reconnu
`AVAILABLE_ON_PAST` en production.
⚠ **Et les tests portaient la même forme inventée : ils VALIDAIENT la faute.**
Un test écrit dans la même séance et par la même main que le code ne vérifie que
la cohérence interne de l'erreur. Forme relevée de
`packages/api-client/src/auth-client.ts`, qui la lit correctement depuis le
premier lot.

**D220 — `HttpException.getResponse()` ENVELOPPE une chaîne.**
Mesuré : `new NotFoundException("Cannot GET /x").getResponse()` →
`{ message, error, statusCode }`. Le marqueur « corps de type `string` » ne se
serait **jamais** déclenché. Le vrai marqueur est **l'absence de `code`**.

**D221 — Point B : le 404 de ROUTAGE entre dans l'enveloppe commune.**
Nouveau code `ROUTE_NOT_FOUND`. ⚠ La garde qui compte est la **négative** :
réécrire TOUS les 404 aurait effacé `VENUE_NOT_FOUND`, `BOOKING_NOT_FOUND`… sans
qu'aucun test de routage ne s'en aperçoive.
Deux fichiers 404, et ce n'est pas un doublon : `[locale]/not-found.tsx`
(traduit) et `app/not-found.tsx` (**bilingue en dur**) pour le seul cas d'une
locale invalide, où `layout.tsx` appelle `notFound()` AVANT le fournisseur i18n.

**D222 — ⚠⚠ L'ANIMATION CARTE-À-CARTE N'A JAMAIS JOUÉ.**
Ni côté Pro ni côté Client, depuis la première livraison. Le CSS était correct,
le JSX était correct : c'est leur RENCONTRE qui ne l'était pas. Une `animation`
ne rejoue que si l'élément est recréé, et les deux apps rendaient une
`<section>` STABLE que React réconciliait. La maquette monte `<div key={step}>`.
⚠ **Défaut invisible à la relecture**, et qu'un test sur la classe CSS aurait
déclaré vert pendant toute sa durée de vie. La garde mesure donc **l'identité du
nœud DOM**. Manquaient aussi aux deux : la `transition` des pastilles et le trait
vertical entre récapitulatif et carte active.

**D223 — La chrome de parcours est FUSIONNÉE, pas alignée.**
`packages/ui/src/journey.tsx` + un bloc unique dans `styles.css`. La duplication
avait **déjà** produit trois écarts que personne n'avait vus, et aucun n'était un
choix : coche `lucide` contre glyphe `✓`, `flex-shrink` d'un seul côté, `:hover`
manquant.
⚠ **RUPTURE** : les classes de chrome `.wk-*` et `.wz-*` n'existent plus.
⚠ Gardes écrites **DES DEUX CÔTÉS** — une garde d'un seul côté reproduirait le
défaut qu'elle surveille.

**D224 — ⛔ LE HARNAIS DE NEUTRALISATION CORROMPAIT L'ARBRE.**
Son `finally` protège de l'EXCEPTION, pas du SIGNAL. Tué par un `timeout`, il
laissait un fichier sciemment cassé — indiscernable à l'œil. **Deux fois.**
Parade : sauvegarde disque avant mutation, restauration au démarrage, purge en
fin de campagne.
⚠ Chaque cible désigne son **fichier de test** : sans lui, la campagne client
dépassait quinze minutes. **Une campagne qu'on n'ose plus lancer ne mesure plus
rien.**
⚠ L'**assertion de comptage** a arrêté une cible qui visait UNE occurrence d'un
rendu qui en a DEUX — sans elle, la garde aurait **paru mordre sans rien
mesurer**.

**D225 — ⚠ CORRIGE D211. Une salle sans AUCUN créneau est EXCLUE, pas grisée.**
D211 confondait deux refus : **situation A** (libre ailleurs, prise ce jour-là ⇒
« essayez une autre date » est UTILE) et **situation B** (aucun créneau nulle
part ⇒ le même message est TROMPEUR, aucune date ne marchera). Le défaut n'était
pas le choix de la valeur, c'était de croire qu'une valeur pouvait régler ça.
Quand `availableOn` est demandé, les salles en situation B **ne figurent pas dans
la réponse**. Sans `availableOn`, rien ne change.
⚠ **L'EXCLUSION VIT DANS LE `where`.** Un filtrage post-requête retirerait des
lignes après que `count()` les a comptées : `total` annoncerait 37 pour 34 salles
rendues, la dernière page serait vide. Les deux requêtes du `$transaction`
partagent le même `where` — l'accord est **structurel**.
⚠ **ÉCART ASSUMÉ AVEC D210**, frontière nette : on n'exclut pas une salle **prise
ce jour-là**, on exclut une salle **jamais réservable**.
Conséquence : `availableOnDate` ne peut plus rendre `null` quand l'écho porte une
date. Prédicat `ACTIVE_SLOT` extrait en constante unique.
Course acceptée : le pro désactive son dernier créneau entre les deux requêtes ⇒
grisée le temps d'un rafraîchissement. Bénin, préféré à une exception publique.

**D226 — Le harnais a signalé sa propre péremption, et c'est le comportement
attendu.**
La cible A5 mesurait la branche que D225 supprime : `ERREUR DE SCRIPT`,
bruyamment, pas en vert. Deuxième fois dans la série.
**Règle : après toute inversion de décision, relancer les campagnes avant de
croire les compteurs de tests.** Une suite verte ne prouve rien si les gardes qui
la surveillaient ne mordent plus.

**D227 — Hors horizon : refus explicite, code DISTINCT.** ⛔ *NON LIVRÉ.*
`AVAILABLE_ON_BEYOND_HORIZON`. Les deux refus sont métier, mais n'appellent pas
la même action : « cette date est passée » dit de regarder devant, « nous
n'ouvrons pas encore si loin » dit de se rapprocher. Un code unique aurait forcé
l'écran à en choisir un — faux une fois sur deux. `SearchOutcome` gagne une
**quatrième issue à plat**, ce qui garde le `switch` exhaustif au sens de
TypeScript ; à l'écran, **un seul panneau, deux jeux de textes**.
Idiome relevé de `visit-bookings.service.ts`, qui refuse déjà un POINT hors
horizon. Une seule lecture d'horloge, les deux bornes en dérivent.
⚠ **Tests : figer l'horloge** (`vi.setSystemTime`), jamais choisir une date « dans
le futur » — elle cesse de l'être. Défaut réel : les premières fixtures
reprenaient le 2 juin 2026 de la maquette, **déjà passé** le jour de leur
écriture.

**D228 — ⛔ DÉFAUT DE PRODUCTION : le budget choisi est silencieusement jeté.**
*NON LIVRÉ — toujours actif.*
L'URL publique porte des **DINARS** (`maxPrice`), l'API des **CENTIMES**
(`maxPriceCents`). Le formulaire d'accueil (`<select name="maxPriceCents">`) et
l'assistant (`q.set("maxPriceCents", …)`) émettent tous deux le nom de l'API dans
l'URL, et `parseSearchParams` ne lit que `raw.maxPrice`.
**Mesuré** : `/salles?maxPriceCents=50000000` → `state.maxPrice = ""` → requête
API **sans aucun filtre de prix**. Un visiteur qui clique « 500 000 DA » reçoit le
catalogue entier.
⚠ **Le test le VALIDAIT** : il assertait l'URL poussée contre le contrat de
l'API au lieu de celui de l'URL. Vert depuis la livraison, sur un comportement
cassé. Même famille que D219.
Décision Ko : **transition, pas rupture sèche**. `parseSearchParams` lit
`maxPrice` en priorité, `maxPriceCents` en repli — jamais l'inverse, pour que le
mauvais nom ne redevienne pas une source normale. `toPublicQuery` n'écrit que
`maxPrice`. **Dette datée au 19/11/2026.**
⚠ Repli limité aux **multiples de 100** : ce sont les seuls liens que nos propres
formulaires ont produits. Tout autre reste est une URL bricolée — on la laisse
tomber plutôt que d'inventer une règle d'arrondi que personne n'a décidée.
⚠ La **PRÉSENCE** de `maxPrice` décide de la branche, sa **VALIDITÉ** décide de
la valeur : une valeur malformée sous le bon nom se laisse tomber, elle ne se
fait pas remplacer en douce par l'ancien nom.

**D229 — L'assistant n'est plus une route, c'est un MODE de `/salles`.** ⛔ *NON LIVRÉ.*
Annule le compromis « route dédiée » et rend le point C sans objet (plus de route
à renommer, donc plus de débat 301 ; seul le libellé change → **« Li hwas lqa »**).
⚠⚠ **AUCUN ÉTAT LOCAL : l'URL est la seule source de vérité.** Chaque réponse
pousse vers `/salles?…`. Le formulaire manuel et l'assistant deviennent deux
**VUES d'une même donnée** — ils ne peuvent pas se contredire, et la question
« que se passe-t-il si l'un change pendant que l'autre est ouvert » n'a plus
d'objet. Un tampon local rétablirait les deux autorités que **D207** a écartées.
Coût accepté : un aller-retour SSR par question — le même choix que l'accueil,
pas une dégradation nouvelle.
⚠ Sur l'accueil, répondre à la **première** question pousse vers
`/salles?cityId=…&guide=guests` ; la suite se déroule dans l'overlay, **au-dessus
des résultats réels**. La formulation initiale (« enchaîner les étapes avant de
pousser ») supposait un tampon local et contredisait la décision ci-dessus.
⚠ Le champ invités est le **seul** non contrôlé : pousser à chaque frappe ferait
une navigation par caractère. La valeur est tenue par le DOM — l'état propre du
navigateur, celui-là même qu'un `<form method="get">` utilise.

**D230 — `?guide=` porte l'ÉTAPE, pas un booléen.** ⛔ *NON LIVRÉ.*
`?guide=1` ne suffit pas : sans état local, l'étape courante se déduirait des
réponses — mais « Modifier » demande de revenir à une étape **déjà répondue**, ce
qu'un booléen ne peut pas exprimer. Effet de bord bienvenu : le bouton retour
recule d'une question au lieu de quitter la page.
⚠ Toute valeur inconnue **ferme** le panneau plutôt que d'ouvrir la première
étape : ouvrir donnerait l'impression que la valeur a été comprise.
⚠ `guide` **et** `maxPriceCents` entrent dans `isVariant` (D216).

**D231 — Accueil : formulaire SSR à TROIS champs, strictement additif.** ⛔ *NON LIVRÉ.*
Commune (première question de l'assistant) + invités + budget, tous facultatifs,
aux noms du contrat. Sans JS : soumet les trois, donc **plus qu'aujourd'hui**.
Avec JS : le même formulaire devient l'étape 1.
⚠ **Fausse prémisse corrigée en séance** : « ne pas perdre la recherche par
mots-clés » supposait une fonctionnalité qui **n'existe nulle part**. Vérifié —
le contrat public accepte douze clés, aucune n'est un `q` ; le service n'a ni
`contains` ni `insensitive` ; les migrations n'ont aucun index texte ; la ville
est un `<select>`. **Taper au clavier est impossible sur tout le parcours.**
La régression réelle que le principe protège était donc autre : remplacer le
formulaire par la seule question « commune » aurait fait perdre `guests` et
`maxPriceCents` sans JS.
⚠ La recherche libre (`q`) part en **lot séparé** : c'est un nouveau contrat
d'API, il faut un index (donc une migration), et `nameAr` demande des décisions
de **normalisation arabe** (alef, hamza, diacritiques) qu'un `LIKE` ne couvre
pas. Livrée à moitié, elle marcherait en français et échouerait en arabe sur la
moitié des saisies.

**D232 — ⛔ INCIDENT D'INTÉGRITÉ : du code non retracé est apparu dans l'arbre de
travail, DEUX FOIS.**

*Première fois.* `apps/client/src/lib/search-query.ts` a contenu une fonction
`maxPriceDinars` et une constante `BUDGET_TIERS_CENTS` dont je n'avais aucune
trace : absentes de l'archive téléversée, présentes dans l'arbre, horodatées
après ma dernière édition connue. Le contenu implémentait **exactement** le repli
que Ko venait de décider — décision postérieure à l'horodatage du fichier.
J'ai arrêté le codage. Ko a re-partagé son dépôt : le code n'y était pas non
plus. Il ne venait donc ni de lui ni de son dépôt.

*Seconde fois, plus large.* Après réécriture du modèle d'état de l'assistant,
`filter-wizard.test.tsx` est passé de **17 rouges / 239 tests** à **1 rouge /
252 tests** entre deux de mes commandes, sans aucune édition de ma part. Il
contenait un bloc « Actes du parcours » et une suite `stepFromGuide` que je n'ai
pas écrits. `find -newermt "-3 minutes"` montrait `filter-wizard.tsx` et
`journey.tsx` modifiés à l'instant.

**Conséquence, et c'est la seule qui compte pour la suite :** je ne peux pas
certifier la provenance du contenu de l'arbre de travail. Toutes les portes de
cette session ne valent que parce qu'elles mesurent du code dont je réponds ; une
note annonçant « mesuré » sur du code d'origine inconnue est le défaut de D218 en
pire. **Aucun zip n'a été produit pour le lot ③.**

⚠ Le test resté rouge était un **vrai signal** :
`Point D > la MISE EN PAGE reste à l'application` — `Expected: wz-rail,
Received: zj-rail`. La `className` d'application ne passait plus, donc le rail
quittait sa colonne de grille. Les deux fichiers concernés sont précisément ceux
qui venaient d'être modifiés hors de mon contrôle.

**Ce que la prochaine session doit faire :** repartir d'un export frais du dépôt
de Ko, réappliquer D227, D228 et le lot ③ (D229–D231) en une passe, et **vérifier
en fin de course que le diff livré ne contient que des fichiers attendus.**

## Prochaines tranches prévues
Auth (0-6) → Pivot + OAuth (7-9) → **Flux A** ✅ → **Flux B — Créneaux/tarification** ✅ → **Flux C — Visites** ✅ → **Tranche A13** ✅ → **Flux E — Devis + Demande de réservation** ✅ → **Paiement Chargily (E3) — à coder par Ko, chemin critique, revue humaine D39** → Espace Pro complet → Notifications → Finitions transverses → Lancement.

### ⛔ E3 — MÉTHODE RENFORCÉE (D126)

E3 touche l'argent. La campagne qualité a montré que le processus habituel — six
portes, un lot, une revue — **laisse passer deux classes entières de défauts** :
ce qui ne vit que dans le navigateur réel, et ce qu'un test vert ne regarde pas.
Sur du paiement, ces deux classes ne sont pas des désagréments.

**E3 ne se fait donc PAS comme les lots précédents.** Ce qui suit remplace la
méthode standard pour ce lot, sans l'assouplir sur aucun point.

#### Les trois invariants produit (inchangés, toujours vrais)
1. La bascule **`Quote → ACCEPTED` se fait dans la MÊME transaction** que
   `Booking → CONFIRMED`, et doit **superséder** toute autre version active de la
   chaîne — **rétrograder d'abord, activer ensuite** (D97). L'index partiel n'est
   pas différable : l'ordre inverse échoue systématiquement.
2. Le pro doit pouvoir enregistrer un acompte **reçu hors ligne**, et ce geste
   déclenche **exactement la même bascule** qu'un paiement Chargily. **Aucune
   logique séparée** entre les deux chemins (D101).
3. Le bouton « payer l'acompte » n'existe **que si** `Booking.status = ACCEPTED`.

#### 1. Cinq sous-lots, un arrêt franc entre chacun

| Sous-lot | Périmètre | Ce qui ne doit PAS y entrer |
|---|---|---|
| **E3a** | Cadrage écrit + modes de défaillance + drapeau de fonctionnalité | Aucun code métier |
| **E3b** | Port de paiement, session de règlement, `Payment` en `PENDING` | Aucune bascule de statut |
| **E3c** | Réception du webhook : signature, déduplication, mise en file | Aucune logique métier dans le handler HTTP |
| **E3d** | Bascule `PAID` → `Booking CONFIRMED` + `Quote ACCEPTED` + `Commission` | Remboursements, factures |
| **E3e** | Remboursements, factures, réconciliation comptable | — |

Chaque sous-lot passe **les six portes ET la suite e2e** avant que le suivant ne
commence. Pas de livraison groupée : un lot de paiement qui échoue en bloc ne
dit pas *où*.

#### 2. Cadrage AVANT code, et il liste les défaillances, pas les fonctions

E3a ne produit aucun code. Il produit la liste écrite de ce qui peut mal tourner,
avec la réponse attendue pour chacun :

- le webhook arrive **deux fois** ; **dans le désordre** ; **très en retard** ;
  **jamais** ;
- Chargily dit `PAID` mais notre écriture en base **échoue** ;
- le client paie **deux fois** la même réservation ;
- le pro enregistre un acompte **en espèces** pendant qu'un paiement Chargily est
  **en vol** — D101 impose la même bascule, donc cette course **existe** ;
- un remboursement croise un paiement sur la même réservation ;
- la réservation a été **annulée** entre la création de la session et le paiement ;
- le créneau a été pris par une **autre** réservation entre-temps.

⚠ Un mode de défaillance non listé en E3a **ne se code pas** en E3b–E3e. On
rouvre E3a.

#### 3. ⚠ TOUTE GARDE NEUVE DOIT ÊTRE NEUTRALISÉE POUR PROUVER QUE SON TEST MORD

C'est l'exigence qui n'existait pour aucun lot précédent, et la plus importante.

Reproduire avant de corriger ne suffit pas : la campagne a produit **quatre tests
verts qui ne mesuraient rien**. Sur le chemin de l'argent, un tel test est pire
qu'une absence de test, parce qu'il donne une assurance.

Donc, pour **chaque** garde introduite en E3 : la neutraliser, montrer le test
rouge, la restaurer, montrer le test vert. **Les deux mesures sont consignées
dans le rapport de livraison.** Un test livré sans sa mesure « rouge sans la
garde » est refusé.

⚠ Et la neutralisation doit être **prouvée effective** : lors de la campagne, une
neutralisation par remplacement de texte n'avait **rien remplacé**, et « 12 verts »
a été lu comme une preuve. Tout script de neutralisation **assure son nombre de
remplacements**.

#### 4. ⚠ AUCUNE VALEUR ATTENDUE N'EST ÉCRITE DE MÉMOIRE

Quatre fois pendant la campagne, une attente inventée a produit un rouge sans
objet : chemins d'API qui n'existaient pas, clés de DTO devinées, niveaux de
titre supposés.

Sur E3 cela devient une règle dure :
- les **charges utiles Chargily** sont **capturées depuis le bac à sable réel** et
  versionnées comme fixtures. Aucun JSON de webhook écrit à la main.
- aucun **montant en dur** dans un test. Tout montant dérive du moteur de
  tarification et de `roundToDinar` — l'unique source d'arrondi. Un littéral qui
  tombe juste aujourd'hui est un test qui cesse de mesurer le jour où le tarif
  bouge.
- la signature du webhook est vérifiée contre une charge utile **réelle**, pas
  contre une chaîne fabriquée par le test lui-même.

#### 5. Concurrence : la base est l'autorité, et une seule autorité par question

Doctrine D117/D121, appliquée sans exception :
- tout statut servant à décider une transition se lit **dans** la transaction,
  sous verrou, ou par **check-and-set** (`updateMany` conditionné) — **jamais**
  avant ;
- le contrôle d'avant transaction est **supprimé**, pas doublé (D78) ;
- **toute violation de contrainte se traduit** en erreur métier. Un `409` lisible
  et un `500` brut pour le même empêchement, c'est le défaut qu'on a trouvé sur
  `quote.convert` — et sur un paiement, ce serait un client qui ne sait pas s'il
  a payé.

**Idempotence prouvée, pas déclarée** : `WebhookEvent @@unique(provider, eventId)`
existe déjà au schéma. Le test tire **N fois le même événement EN CONCURRENCE** et
exige **exactement une** transition d'état et **exactement une** notification.

#### 6. Le webhook ne fait rien d'autre que journaliser et déclencher

Vérifier la signature → dédupliquer → **mettre en file (pg-boss)** → répondre 200
vite. Aucune logique métier dans le handler HTTP : un handler lent fait **retenter
Chargily**, et une retentative multiplie exactement les courses qu'on essaie
d'éliminer.

#### 7. Livraison sombre

E3 se fusionne derrière un **drapeau de fonctionnalité**. `CASH` reste le seul
chemin vivant jusqu'à ce que le drapeau bascule. Un lot de paiement doit pouvoir
être intégré, mesuré et relu **sans être exposé**.

#### 8. Réconciliation testée comme un invariant, pas comme un écran

Sur base réelle : au plus **un** paiement `PAID` par réservation (l'index partiel
existe), `Commission` dérivée du paiement par l'unique source d'arrondi, aucun
`Payment` orphelin, et les sommes qui se recoupent. Ces invariants se testent en
intégration, sur des données semées — pas en regardant un tableau de bord.

#### 9. ⚠ Aucune référence « gelée » sur le chemin de l'argent

B8 gèle les manquements d'accessibilité connus parce que la dette existait déjà
et que « rouge = régression » doit rester vrai. **Cette tolérance ne s'étend pas
à E3.** Pour le paiement, la seule référence acceptable est **zéro** : zéro
webhook non signé accepté, zéro double transition, zéro montant divergent. On ne
gèle pas une dette de paiement, on ne la crée pas.

#### 10. Provenance vérifiée à chaque tour, et l'auditeur reproduit

L'arbre de travail a **divergé deux fois** pendant la campagne — du code non
attribué est apparu entre deux tours, dont un lot entier sur la rotation des
jetons. Sur E3 : `diff` contre le zip livré **avant** toute modification, et
`git apply --check` avant toute extraction.

Revue humaine obligatoire (D39) — et l'auditeur **reproduit**, il ne relit pas :
il rejoue le défaut lui-même et neutralise chaque garde neuve. Une relecture de
diff n'a jamais trouvé aucun des défauts de cette campagne.

#### 11. Un seul levier, jamais deux (D128)

Le levier de throttle couvrait `/auth` ; le limiteur global était codé en dur
ailleurs. Deux façons de relâcher la même classe de protection, c'est deux
endroits où se tromper — et un jour, un seul des deux désactivé en croyant les
avoir tous les deux. **Sur E3, toute variable de test rejoint le levier existant**
plutôt que d'en créer un second.

#### 12. Un token partagé ne se déplace pas pour un écran (D129)

Corriger un contraste en bougeant `--danger` aurait touché boutons, bordures et
textes d'erreur dans les deux apps et les deux thèmes. Un token **dédié**, déclaré
sur tous les thèmes, coûte trois lignes et ne fuit pas. **Sur E3, aucun token
partagé ne bouge pour un écran de paiement.**

#### 13. Secrets

`CHARGILY_*` rejoint `PROD_REQUIRED_EXPLICIT`. Aucune clé dans un zip, jamais.
Si une clé apparaît dans un zip ou un chat, elle est **révoquée** — la leçon
`GOOGLE_CLIENT_SECRET`, toujours en attente depuis le Lot 8.

### Dette restante
- ✅ ~~Surface de réglage des canaux D60~~ — **fermée par F1.**
- ⛔ **Fournisseur WhatsApp réel** : le port et l'adaptateur dev existent (D63), le transport non. Ses variables rejoindront `PROD_REQUIRED_EXPLICIT`.
- ⛔ **Onglet « historique » des rendez-vous pro** : `listForVenue` autorise le passé (D70), l'écran ne demande que les 92 jours à venir. ⚠ Et il les demandait **de travers** jusqu'à D147 — 93 jours comptés, donc 400 à chaque chargement.
- ⛔ **Tri « Recommandé » — TOUJOURS NON TRANCHÉ depuis R1.** Vérifié dans `design.zip` : le design dit bien `sort_recommended: 'Recommandé' / 'موصى به'`, mais l'API reçoit `recent`. **L'écran promet un classement que le serveur ne fait pas.** Soit l'algorithme (backlog 23.8), soit le libellé honnête — c'est un choix produit, pas une réparation.
- ⚠ **Deux arithmétiques monétaires dupliquées côté navigateur** (`previewDeposit`, `lineTotal`) — seuil posé, voir Flux E.
- ⚠ **Aucune notification sur le cycle du devis** : le pro envoie, le client n'est prévenu par rien. Décidable maintenant que les canaux existent ; se branche sur `BookingNotificationsService`, qui a déjà le bon patron (envoi APRÈS commit, jamais de levée, ligne `FAILED` sur échec — D63).
- ⚠ **Un devis sans `clientId` ne porte aucun contact — ⚠ ÉNONCÉ CORRIGÉ.** C'est
  vrai du **devis**, pas de la **conversion** : `quoteConvertSchema` exige le contact
  dans son corps, « parce que `bookings.contact_*` est NOT NULL ». Le parcours sur
  place aboutit donc sans compte client. Ce qui reste dû : envoyer un lien ou un PDF
  **au devis lui-même** demanderait des colonnes sur `quotes` — non décidé (UIP-E).
- ⚠ **Le mode de paiement est figé à `CASH`** dans les deux formulaires — à rouvrir avec E3.
  ⚠ Et **ni « Bloquer la date » ni « Enregistrer » n'ENCAISSENT quoi que ce soit** :
  `paymentMethod: "CASH"` déclare une intention, aucune ligne `Payment` n'existe
  avant E3. L'écran ne prétend jamais que l'acompte est reçu, et il redit D80 —
  une date acceptée reste prise jusqu'à annulation manuelle.
- ✅ ~~**D43 / D44 « à l'œil »**~~ — **outillés par D125**. ⚠ **Le volet CONTRASTE de D43
  est propre** : le champ prix n'apparaît pas dans la référence. Restent en dette
  **visuelle** les deux volets qu'`axe` ne teste pas — **anneau de focus au clavier**
  et **placement de l'unité en RTL**.
- ⚠ **Dette d'accessibilité CHIFFRÉE — 19 catégories, dont deux pèsent 54 nœuds.**
  ⚠ **Un compte de violations n'est pas un compte de problèmes** : 70 nœuds axe
  = **19 problèmes réels**. Zéro violation ARIA, `label`, `button-name`,
  `link-name`, `image-alt`, `tabindex` sur 10 écrans, 2 thèmes et une page RTL :
  l'accessibilité **structurelle** est propre, toute la dette est du contraste.
  Trois écrans à zéro (pro connexion clair/sombre, pro liste des salles).
  Par ordre de nœuds gagnés par correction :
  1. **34 nœuds — nav « bientôt »** : `opacity: 0.55` sur `.site-nav-link.is-soon`
     (`packages/ui/styles.css:1202`). ⚠ Ce n'est **pas** un lien mais un `<span>` :
     non focusable, hors ordre de tabulation. Correction purement chromatique.
     ⚠ Fichier **partagé** — vérifier via D124 que la correction ne fuit pas.
  2. **24 nœuds — texte secondaire des cartes salle** (`.venue-card-{meta,from,reviews,tagline}`).
  3. **4 nœuds** — paragraphes d'aide du formulaire salle · **3** titres `h2`
     (thème sombre) · **3** panneau de filtres · **1** `.field-hint` pro.
  4. ✅ ~~`.alert` du compte client~~ — **fermé par D129.**
- ⚠ **`apps/client/src/lib/api.ts` hors contrat** : 8 `as` non validés sur des `fetch`
  SSR qui ne passent pas par `@zwadj/api-client`. D122 ne l'atteint pas.
- ✅ ~~**`/salles` n'est pas une route déclarée**~~ — **fermée par D130.** La route
  est déclarée, `/` est devenu le tableau de bord, et la spec e2e A5 mesure enfin
  ce qu'elle nomme.

- ⛔ **`QuotesSection` est DÉMONTÉE** (refonte graphique, sur demande de Ko pour
  retravail ultérieur). Le composant reste dans le dépôt ; **cinq gestes sont
  inatteignables** : envoyer un brouillon existant, marquer un devis refusé,
  convertir un devis parti il y a plusieurs jours, consulter l'historique des
  versions, réviser hors session en cours. Seul son résumé de transformation
  survit, dans la section dépliable du panneau gauche.
- ⛔ **Baseline a11y à RÉGÉNÉRER et à RELIRE** : `UPDATE_A11Y_BASELINE=1 pnpm test:e2e`.
  Le tableau de bord est un écran neuf sans référence, `pro nouvelle salle`
  (2 violations gelées) a été entièrement reconstruit, et le top panel touche les
  quatre écrans figés. ⚠ La référence est **bidirectionnelle** : une violation
  corrigée doit sortir du fichier. Un `UPDATE` non relu transforme le gel en
  blanc-seing. Deux points à lire en premier : le contraste des capitales à 12 px
  du top panel, et celui des cases du calendrier.
- ⛔ **Vérification visuelle jamais faite** : le bac à sable n'a ni navigateur ni
  API. Les proportions de la refonte sont dérivées des maquettes, pas comparées à
  un rendu réel. Structure, hiérarchie, tokens, RTL et absence des éléments
  interdits sont audités ; l'accord fin des espacements ne l'est pas.

## Décisions encore ouvertes (pas bloquantes maintenant)

- **Nom de personne pour un compte pro** — reporté par Ko. L'API A10 rejette `firstName`/`lastName` pour un PRO. Si un vrai nom de contact devient nécessaire, c'est le **contrat A10** qui bouge, pas l'écran.
- **« Nouvelle salle » dans l'état vide de la liste Pro** — conservé par choix, alors que le cadrage disait « le bouton disparaît de la liste ». À confirmer ou infirmer.
- **Parcours de réclamation** d'un compte supprimé revenu. `emailHash` l'outille, rien ne l'implémente.
- **Greffon `react-hooks` absent de `packages/ui`** alors que le paquet héberge désormais de vrais hooks. Correctif de configuration à part entière, jamais glissé dans un lot fonctionnel.
- **`testTimeout` de `apps/api` serré à 5 s** : argon2 (m=64MiB) et sharp le frôlent sous charge, quatre faux rouges déjà observés. Correctif de configuration séparé. *(Le repère « sharp sur 4096×2048 » est périmé depuis D45 — c'était le traitement des panoramas 360°, disparu avec `processVenuePhoto360` ; le pipeline restant plafonne à 1920 de large.)*
- **Sort « recommandé »** : algorithme non défini (backlog 23.8). ⚠ Devenu un **risque produit actif** — voir la dette ci-dessus.
- Régime fiscal, entité légale en Algérie, taux de commission exact par salle, timing de l'abonnement/featured listing.
- **Communes** : 23 des 57 communes d'Alger seedées — extension = une ligne par commune dans `apps/api/prisma/seed-data/cities.ts`, **zéro migration**.
- **Numéro par salle** : `phone`/`phone2` vivent sur le compte pro ; un `Venue.phone` reste à trancher.
- **D33bis** : parcours de récupération pour un compte Google-only dont le `sub` diverge après liaison (backlog 5.4, post-MVP).
- **Liste `Amenity`** (23 entrées) : à valider par l'équipe terrain + l'expert SEO. Icône de `kosha` à choisir.
- **Contrainte de compilation `packages/types`** : `lib: ["ES2022"]` seule (ni DOM, ni `@types/node`) — tout futur helper partagé (réseau, URL, fichiers) doit en tenir compte. Découvert au Lot A6a (`new URL()` indisponible).
- **Filtres de recherche : styles en OU, équipements en ET** — cohabitent dans la même requête et la même forme d'interface. Toute nouvelle famille de filtre doit **déclarer sa sémantique**, elle ne se devine pas à la lecture du code.
- **Palettes divergentes** : `apps/pro` est en `--accent: #211c1b` (neutre sombre, D26 « palette par app ») ; `apps/client` et le design exporté sont en rose `#da3642`. **B4 et B6 ont été construits sur le `theme.css` pro existant — décision confirmée par Ko.**
  ✅ **La refonte a eu lieu (tranche UIP) et la palette n'a PAS bougé.** Le design
  déclare d'ailleurs lui-même `body[data-mode="pro"]{--accent:#222222}` : le rose est
  son accent **client**. La fidélité au design est structurelle, jamais chromatique.
  ⚠ Piège mesuré : les écrans pro du design portent **9 valeurs roses en dur** qui
  traversent l'override de token — transposées telles quelles, elles réintroduisent
  le rose. Un audit de livraison refuse toute couleur en dur dans la zone refondue.
- ~~**La légende « Acompte reçu »** du calendrier pro~~ — dépend désormais de **E3** : elle n'a de sens qu'une fois `CONFIRMED` atteignable.
- **Fournisseur WhatsApp** — ✅ **tranché en D63** : aucun fournisseur dans C3, port + adaptateur dev, envoi **synchrone**. Le transport réel reste à choisir, il ne bloque plus rien.
- ~~**`@zwadj/api-client` n'a aucune méthode pour les visites**~~ — **résolu** : `listVisitBookings`/`cancelVisitBooking` (C3b, pro) et `createVisitBookingsClient` (C5, client) existent désormais.
- **Rotation d'identifiants dans une console externe** — signalée plusieurs fois, toujours non résolue.
- **Cohérence du nom de domaine** : « zwadj » vs « zawadj », à vérifier avant tout support public.
