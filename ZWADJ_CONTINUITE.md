# ZWADJ — Document de continuité (consolidé)

> **Comment l'utiliser :**
> - **Claude Code** : `CLAUDE.md` importe `AGENTS.md` ; ce document-ci et
>   `ZWADJ_BACKLOG.md` se lisent À LA DEMANDE, par section, jamais en entier.
> - **Chat avec archive** : ce document + `AGENTS.md` + `ZWADJ_BACKLOG.md` + le zip.
> - Mettre à jour « État actuel » à chaque étape franchie.
>
> ⚠ **LES JOURNAUX DATÉS NE SONT PLUS ICI (lot R1, 28/08/2026).** Ils vivent dans
> `docs/history/` — trois fichiers, aucune ligne modifiée, non-perte vérifiée ligne
> à ligne. Ce fichier ne garde que l'ÉTAT ACTIF. ⛔ **Le registre des décisions, en
> bas de page, reste ici** : un numéro se prend toujours en lisant CE fichier.
>
> **Révision courante : réduction documentaire R1 faite (D267), bascule ouverte.**
> Six portes vertes, lint à 0 problème, API **638 / 55**, e2e **34 passés, 1 sauté,
> 0 échec** (4,7 min), harnais **18/18** et **3/3**.
> **Prochain lot : `BookingStatus.PENDING` (D263)** — chemin de l'argent, modes de
> défaillance écrits avant tout code.
>
> ⚠ Huit lignes périmées ont été RETIRÉES ici par R1 : l'ancienne consigne
> « exactement trois fichiers » et un état e2e caduc (« 33 passés » / « E3 seul
> verrou restant »). Retrait déclaré, pas perte silencieuse.
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
## Session du 30/08/2026 — D269 · `act(…)` tardif, concurrence, tri des campagnes

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D268**.

⛔⛔ **ÉTAT : LIVRÉ, NON CERTIFIÉ — PORTE `test` ROUGE** (cause antérieure au lot :
`password.service.spec.ts`, argon2). **Ce lot n'est PAS clos.**
⚠ Je l'avais d'abord présenté comme terminé au motif que le rouge « venait
d'ailleurs ». **C'est une faute de raisonnement, et Ko l'a refusée** : un lot ne se
certifie pas sous une porte rouge, même quand le rouge n'est pas le sien. La
provenance du défaut change qui doit le corriger ; elle ne change pas l'état de la
porte. Accepter une exception ici, c'est rouvrir D218 par la petite porte — une
mesure exacte présentée comme un feu vert qu'elle n'est pas.
⇒ Reclassement en clôture : **argon2 doit passer AVANT S11-b**, puisque c'est lui
qui tient la porte.

### D269 — la cause était dans l'ATTENTE, pas dans le code

`services-section.test.tsx` et `slots-section.test.tsx` rougissaient un run sur
deux. L'échec n'était pas une assertion : c'était la garde des sorties console
(`test-setup.ts:172`), sur des `not wrapped in act(...)` émis par
**`BlocksSection`** et **`ProVenuesProvider`** — montés **transitivement**
(`EditVenuePage` dans `AppProviders`), ce qu'un grep du fichier de test ne voit
pas. Les tests attendaient un titre ou la décantation des prestations, puis
assertionnaient en SYNCHRONE et rendaient la main ; les mises à jour tombaient
après la fin du test.

⛔ **Corrigé à la cause, PAS plafonné.** `PLAFONDS` contenait déjà ce fichier en
commentaire (« DÉCISION EN ATTENTE ») et le dépôt tranche : « le plafond contient
le symptôme ; il ne soigne pas la cause ». Les deux attentes sont des **idiomes
relevés du dépôt** — `blocks-section.test.tsx` pour le texte de chargement qui
disparaît, `a3-unexpected-responses.test.tsx` pour la file de microtâches vidée
DANS `act`, seul moyen d'attendre un composant qui ne rend rien d'observable.
Mesuré : 9/9 et 8/8, trois fois chacun.

⚠ **MON CORRECTIF A D'ABORD AGGRAVÉ LA PORTE, ET C'EST MESURÉ.** Sans lui : 5
échecs, 8 timeouts. Avec : 24–28 échecs, **48 timeouts**. La cause : `waitFor`
rejouant `getByRole(…, { name })`, dont le calcul du NOM ACCESSIBLE parcourt tout
le sous-arbre à chaque tour. Remplacé par une interrogation directe du nœud de
chargement. **Une attente juste peut coûter assez cher pour casser ses voisines.**

### D269 — le MÉCANISME remplace la règle (décision de Ko)

D268 proposait une règle : « le périmètre d'un lot inclut les campagnes qui lisent
les lignes qu'il touche ». ⛔ **Ko l'a REJETÉE**, et le motif est plus fort que la
règle : **une règle écrite s'oublie** — D226 disait déjà « relancer les campagnes
après toute inversion de décision », elle était écrite, elle n'a pas été appliquée.
⇒ `neutralisation/lancer-campagnes.py` lit `git diff --name-only HEAD` **plus les
fichiers non suivis** (l'index seul raterait un lot déjà `git add`é), croise avec
les fichiers que chaque campagne lit, et ne joue que les concernées. `--tout` pour
les livraisons, `--liste` pour voir le tri sans exécuter.
⚠ **Le tri est validé sur le cas qui l'a fait naître** : sur `quote-store.prisma.ts`
il désigne `neutralize-s10b.py` — la campagne que D268 a cassée sans le voir.
⚠ Un détecteur limité aux CONSTANTES de chemin aurait raté `available-on` et
`available-on-api`, qui n'en déclarent aucune, **en silence**. Le balayage retient
toute chaîne désignant un fichier existant : 22/22 campagnes rendent au moins un
fichier. Une campagne qui n'en rendrait aucun ne pourrait jamais être
sélectionnée — le script le DIT au lieu de la passer sous silence.

### D269 — concurrence : ce que le changement donne ET ce qu'il coûte

`pnpm test` devient `pnpm -r --workspace-concurrency=1 run test`. Le timeout n'est
PAS relevé : le test client fait **702 ms** contre un budget de 5 000 ms, il ne
tombait que sous cinq paquets simultanés, chacun avec son pool vitest sur 12 cœurs.
⚠ **CONTREPARTIE MESURÉE, à trancher** : en séquentiel, l'échec du PREMIER paquet
**avorte les suivants** — l'API rouge a laissé client, pro et api-client sans
exécution, d'où un run rouge en 34 s au lieu de plusieurs minutes. On gagne le
déterminisme, on perd l'information sur un run rouge. Trois issues ouvertes :
garder, ajouter `--no-bail`, ou revenir en parallèle en bornant les workers vitest
(4 configs à toucher, aucune partagée n'existe — mesuré : `maxWorkers=4` ramène
48 timeouts à 4).

### D269 — ⛔ CE QUI RESTE ROUGE, ET CE N'EST PAS CE LOT

`password.service.spec.ts` : argon2 dépasse 5 000 ms. **Déjà au backlog** —
« 3,4 s d'un budget de 5 s au repos, rougit sous charge ». Mesuré en isolation
sur machine libérée : **rouge puis vert** sur deux runs consécutifs. Donc
intermittent AU REPOS, pas seulement sous charge. La décision consignée est de ne
pas relever le délai ; elle n'est pas révoquée ici. **Tant qu'il est là, la porte
`test` n'est pas fiable à 100 %** — c'est le seuil posé avant S11-b.

### D269 — l'e2e s'est vérifiée en DEUX MOITIÉS, et il faut le déclarer

⚠ **Ce n'est pas équivalent à une passe entière.** Amorçage (~2 min) plus 35 tests
à 2 workers dépassent le plafond d'un appel. Découpé en `--shard=1/2` et `2/2` :
**17 passés + 1 sauté**, puis **18 passés**, exit 0 des deux côtés.
⚠ **Compte réconcilié avant d'être publié** : 34 tests chromium + **2** amorçages
(le projet `warmup` rejoue une fois par moitié, chacune démarrant ses serveurs) =
36 entrées, contre 35 en run unique. Sans cette réconciliation, « 35 passés »
aurait paru contredire le relevé historique.
⛔ **Le découpage change l'ordre d'attribution aux workers** — précisément la
classe de défauts que cette suite existe pour attraper. Deux moitiés vertes ne
valent pas un run entier vert.

⛔ **UNE E2E INTERROMPUE NE MEURT PAS SEULE.** Elle laisse deux serveurs qui
tiennent 3100/3101 **et** la mémoire. Vécu quatre fois : la tentative suivante
échoue en 8 s sur `localhost:3101 is already used`, ou son worker Next
s'effondre faute de RAM (4,5 → 2,25 Go libres). Le message ne parle alors ni de
tests ni de la vraie panne. **Avant toute e2e : purger les processus node et
vérifier que 3100/3101 sont libres.**

### D269 — trois fautes de méthode, à mon compte

1. ⛔ **J'ai édité les fichiers qu'une vérification était en train de mesurer.**
   Résultat : 24 échecs sans signification.
2. ⛔ **Puis j'ai conclu que ces 24 échecs VENAIENT de cette édition.** Faux : ils
   se reproduisaient sur arbre stabilisé. Une explication commode, adoptée avant
   d'être mesurée — la faute que ce lot passe son temps à corriger ailleurs.
3. ⛔ **J'ai sous-dimensionné trois fenêtres d'appel de suite**, et lu les morts
   qui en résultaient comme des échecs de la suite. `build`+`test:int` valaient
   15 min sur une fenêtre de 9,8 que j'avais fixée moi-même, après avoir mesuré
   `test:int` à 731 s.

## Session du 30/08/2026 — D268 · `BookingStatus.PENDING`, premier lot Claude Code

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D267**.
⚠ Et il est inscrit **ICI D'ABORD**, avant le backlog — l'inverse est la faute
que D267 a commise dans le lot dont l'objet était de protéger la numérotation.

### D268 — l'objet du lot, et ce qu'il ne change pas

`quote-store.prisma.ts` écrivait `status: "PENDING"` en chaîne littérale sur le
chemin de l'argent (conversion d'un devis en demande). D263 l'avait relevé, puis
**l'import qui le signalait a été supprimé** pour fermer la porte lint : le
défaut ne tenait plus qu'à une case de backlog.

⚠ **AUCUN COMPORTEMENT NE CHANGE.** `BookingStatus.PENDING` *vaut* la chaîne
« PENDING ». Un lot qui ne change rien à l'exécution ne peut pas se prouver par
un test qui passe — d'où une garde de source et trois cibles.

### D268 — ⛔ LA CONSIGNE DE D263 ÉTAIT JUSTE SUR LE DÉFAUT, FAUSSE SUR LE REMÈDE

D263 demandait que les **trois** sites dérivent de l'énuméré, au motif qu'ils
« s'accorderaient entre elles et se tromperaient ensemble ». Vérification faite,
le remède ne traite pas ce motif : **trois sites dérivés d'une même source
s'accordent encore, et se trompent encore ensemble** — c'est exactement D241,
une garde qui se relit elle-même.

Ce qui protège n'est pas que tout dérive, c'est que **chaque site confronte SON
autorité** :

| Site | Son autorité | Décision |
|---|---|---|
| `quote-store.prisma.ts` | l'énuméré TS (le champ Prisma est typé dessus) | **dérive** |
| `quote-store.prisma.spec.ts` | l'énuméré TS | **dérive** — mesure QUEL membre est choisi |
| `quotes.int-spec.ts` | **PostgreSQL** | ⚠ **littéral CONSERVÉ** |

Le troisième est le seul point du dépôt où la valeur **relue depuis la base
réelle** est confrontée à une chaîne qui ne vient pas de notre code. Le faire
dériver lui ferait poser la mauvaise question — « mon code est-il d'accord avec
lui-même ? » au lieu de « qu'est-ce que la base a stocké ? ».
⚠ Et le couplage n'est pas théorique : les prédicats qui **verrouillent le
créneau** vivent en **SQL BRUT dans les migrations**
(`status IN ('ACCEPTED','CONFIRMED')` de l'EXCLUDE GiST), qu'aucun typecheck ne
relie à l'énuméré. Un renommage coordonné TS + schéma laisserait ce SQL en
arrière **sans qu'une seule porte ne bouge**.

⛔ **LA GARDE EST DONC BILATÉRALE** : elle interdit le littéral dans
l'adaptateur **et EXIGE sa présence** dans `quotes.int-spec.ts`. Sans le second
versant, un « nettoyage » bien intentionné — lire D263, voir un littéral dans un
test, le faire dériver — effacerait le témoin sans que rien ne rougisse.
⚠ **La dérogation est écrite ICI, pas seulement en commentaire** : un motif qui
ne vit que dans le fichier qu'il justifie se fait supprimer avec lui.

### D268 — la garde de source rend mesurable un fichier d'intégration

Les trois cibles sont mesurées par **une spec unitaire**, y compris celle qui
mute `quotes.int-spec.ts` : la garde lit ce fichier **depuis le disque**. Une
propriété d'un test qui exige PostgreSQL se rejoue en millisecondes, sans base.
C'est le motif de D187/D192 appliqué à une garde de provenance.
⚠ Les cibles 1 et 2 partagent leur ancre et font rougir les **deux** gardes à la
fois : ce qui est prouvé est qu'aucune des deux mutations ne peut être livrée,
pas laquelle des deux l'attrape.

### D268 — ⛔ CE QUE CE LOT A APPRIS SUR L'ENVIRONNEMENT, ET QUI PÉRIME `AGENTS.md`

Les « Notes d'environnement (bac à sable) » décrivaient un poste **sans** client
Prisma et **sans** PostgreSQL, **sans déclarer leur portée** — donc lues comme
des propriétés du dépôt. Mesuré sur le poste de Ko : client Prisma **réel**,
`typecheck` **exit 0**, `test:int` **432/432 sur 35 fichiers**. La section est
désormais scindée par POSTE. ⚠ **C'est D262 une seconde fois** : un empêchement
d'environnement se recopie de rapport en rapport bien après avoir disparu, et
couvre exactement ce qu'il prétendait signaler. **Une note d'environnement porte
le nom de l'environnement mesuré, ou elle ment.**

Deux mesures locales, trouvées en exécutant et non en relisant :
- ⛔ **`grep -c $'\r$'` MENT sur ce poste.** Sur un fichier neuf réellement en LF,
  il annonce « 229 lignes CRLF » ; la lecture en octets dit **0**. Le fichier
  serait parti en LF dans un dépôt CRLF — la faute exacte que le dépôt a déjà
  payée deux fois. La règle « compter sur les OCTETS » n'est pas de la prudence
  ici, c'est la seule mesure qui tienne.
- ⛔ **La console cp1252 fait LEVER les harnais** au premier `✓`, avec une trace
  Python qui ressemble à un défaut de harnais alors que le pré-vol vient de
  passer. Corrigé dans `neutralize-booking-status.py` ; **les 21 autres scripts
  portent le même défaut** et n'ont jamais tourné ici. Reporté, non corrigé —
  un lot ne corrige pas un défaut croisé au passage.

### D268 — ⛔ CE LOT A CASSÉ UNE CAMPAGNE EXISTANTE, ET NE L'A PAS VU

⛔ **LA FAUTE DE MÉTHODE EST PLUS GRAVE QUE LE DÉFAUT.** `neutralize-s10b.py`
portait une cible `S10b2-C3` ancrée sur `status: "PENDING",` — **la ligne exacte
que ce lot a réécrite**. Résultat mesuré : `ERREUR DE SCRIPT : 0 occurrence(s),
1 attendue(s)`. Le harnais a fait ce qu'il devait — refuser de mentir — mais il
**s'arrête là**, et les **CINQ cibles suivantes (C4 → C8) n'ont pas été jouées**.

⚠ La règle existait, écrite noir sur blanc : « après toute inversion de décision,
relancer les campagnes avant de croire les compteurs » (D226) et « une ancre de
cible se revérifie à chaque refonte du balisage ». **Je ne l'ai pas appliquée.**
Toutes les portes de ce lot étaient vertes, la campagne du lot mordait 3/3, et
une autre campagne était cassée sans que rien ne le dise. C'est **exactement** le
motif de D218 déplacé d'un cran : une mesure juste sur un périmètre trop étroit.
⇒ ⚠ **RÈGLE PROPOSÉE, PAS ENCORE EN VIGUEUR — soumise à Ko le 30/08, en attente
de validation explicite** : *« le périmètre d'un lot inclut les campagnes qui
lisent les lignes qu'il touche »*. Elle est écrite ici pour ne pas se perdre,
**elle ne s'applique à aucun lot tant qu'elle n'est pas validée**. ⛔ Je l'avais
d'abord posée comme acquise : ajouter une règle permanente sans la soumettre est
précisément le geste qu'`AGENTS.md` interdit (« toute modification de
comportement non demandée »), et il est plus grave sur une règle de MÉTHODE, qui
s'appliquera à tous les lots suivants sans que personne ne la relise.
Réancrée, s10b passe de « 15 jouées + 1 erreur + 5 muettes » à **20/20**.
⚠ Recouvrement assumé et écrit : C3 est désormais identique à BS-2. Conservée
pour que s10b reste AUTONOME — la retirer rendrait sa complétude dépendante
d'une autre campagne.

### D268 — les 22 harnais ont tourné pour la première fois sur ce poste

**164 gardes mordues sur 173 cibles, 22 scripts** — mesuré le 30/08, script par
script, pas estimé. Les 9 restantes sont des cibles `NON MESURÉE` déjà
documentées (5 dans `e3d1-s8`, hors exécution « course » ; 4 dans `solid-s6`,
hors « int-visites »). Zéro garde muette, zéro échec après correctifs.
⚠ **Ce chiffre est DATÉ, pas courant** : il vaut pour le 30/08 et rien d'autre.
`AGENTS.md` portait « 19 scripts, 165 cibles » — faux au moment où on le lisait.
**Décision de Ko : plus aucun compteur de harnais dans la documentation.** L'état
courant se mesure en lançant `neutralisation/lancer-campagnes.py`, ajouté par ce
lot. Un chiffre figé sur une quantité mouvante finit par couvrir exactement ce
qu'il prétend mesurer.

⛔ **Rien de tout cela n'était mesurable avant ce lot** : les 21 harnais levaient
sur la console cp1252 au premier `✓`, APRÈS le pré-vol. Correctif de trois lignes
propagé aux 21, ancre uniforme `import sys`, compte vérifié avant et marqueur
après, refus explicite sur toute ancre absente ou multiple — zéro refus.
⚠ Le même défaut a mordu mon propre script d'analyse pendant ce lot, ce qui est
la meilleure démonstration qu'il n'était pas anecdotique.

### D268 — la suite pro : DEUX diagnostics faux avant le bon

⚠ **Ce paragraphe garde ses erreurs, parce qu'elles sont l'objet de la leçon.**

1. **« instable »** — mesuré rouge ×2 puis vert ×2, arbre inchangé. Vrai comme
   symptôme, inutile comme diagnostic.
2. **« classe D127 »** — une ÉTIQUETTE posée sur un symptôme, pas une cause. Ko
   l'a refusée : *« ne documente pas D127 comme conclusion tant que la cause
   réelle n'est pas isolée »*. Elle avait l'apparence d'un résultat.
3. **« pollution inter-fichiers, confirmée »** — ⛔ **FAUX, et je l'avais écrit
   comme acquis.** Le grep direct de `slots-section.test.tsx` ne trouvait ni
   `BlocksSection` ni `ProVenuesProvider`, j'en ai conclu que les avertissements
   venaient d'ailleurs. **Le rendu TRANSITIF ne se voit pas dans un grep** : le
   fichier monte `EditVenuePage` dans `AppProviders`, qui rendent l'un et
   l'autre. L'expérience qui a tranché : apparier le fichier avec chaque
   pollueur supposé. Résultat inverse de l'hypothèse — **seul il ÉCHOUE, apparié
   il PASSE**.

**La cause, isolée :** l'échec n'est pas une assertion, c'est la **garde des
sorties console** (`test-setup.ts:172`) qui lève sur
`2 avertissement(s) … dans un fichier NON exempté`, tous deux
`not wrapped in act(...)`. `BlocksSection` et `ProVenuesProvider` mettent à jour
leur état **après la fin du corps de test** — le test assertionne et rend la main
avant que leurs lectures réseau n'aient décanté.

⛔ **Le dépôt le savait déjà, et l'avait écrit.** Le commentaire de
`venue-wizard.test.tsx` dans `PLAFONDS` dit mot pour mot : *« une assertion qui
finit avant la dernière mise à jour laisse un `act(…)` tomber après le test,
tantôt un, tantôt deux »*, et désigne ce fichier comme *« le prochain candidat »*.
`services-section.test.tsx` y est présent **en commentaire**, marqué
« ⛔ HUITIÈME FICHIER — DÉCISION EN ATTENTE (Ko) ».
`slots-section.test.tsx` est le **neuvième**, jamais relevé.

⚠ Pourquoi le fichier fautif CHANGE : la garde est par fichier et le compte
d'avertissements FLOTTE (D256). Selon l'ordonnancement, la mise à jour tardive
tombe pendant `services-section` (mode parallèle) ou `slots-section`
(`--no-file-parallelism`, reproductible 2/2). Ce n'est pas le même fichier qui
est malade : c'est la même faute, dans plusieurs fichiers qui montent la coquille.

⇒ **Conséquence exécutoire** : le pré-vol de `neutralize-solid-s7.py` lance la
suite pro entière, donc cette campagne **avorte au hasard**, zéro cible jouée.
⇒ **Décision requise de Ko**, la même que pour le huitième fichier : corriger les
tests (attendre la décantation) ou inscrire des plafonds datés. ⚠ Le dépôt
tranche déjà contre la seconde option : *« le plafond contient le symptôme ; il
ne soigne pas la cause »*.

### D268 — un troisième site de la même classe, RAPPORTÉ et NON touché

`payment-intent.spec.ts` recopie **sept** statuts en littéraux, et son
commentaire affirme le contraire du code (« on boucle sur les statuts RÉELS de
l'énuméré plutôt que sur une liste écrite ici » — la liste EST écrite là, à la
main). Deux de ses valeurs (`COMPLETED`, `NO_SHOW`) **n'existent pas** dans
`BookingStatus`. C'est du chemin de l'argent : arbitrage écrit avant tout code,
comme ici. Au backlog, non corrigé.

## Session du 28/08/2026 — D267 · R1, réduction documentaire (part mécanique)

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D266**.

⛔ **ET CE NUMÉRO A D'ABORD ÉTÉ MAL POSÉ.** R1 a été inscrit « D267 » dans
`ZWADJ_BACKLOG.md` sans qu'aucune section D267 n'existe ICI, et le registre
continuait d'annoncer « dernier attribué : D266 ». Deux documents en désaccord
sur un numéro — **la collision exacte que D233 et D249 ont payée**, commise dans
le lot dont l'objet était de protéger la numérotation.

⚠ **C'est Claude Code qui l'a trouvée**, à sa première lecture, en répondant
« D266 » : elle avait lu l'AUTORITÉ, pas le backlog. La règle a fonctionné —
c'est le rédacteur qui ne l'a pas suivie. **Un numéro s'inscrit d'abord ici,
ensuite ailleurs. Jamais l'inverse.** Décision non révoquée, correctement posée.

### D267 — ce qui a été fait, et comment il a été vérifié

Vingt-deux sections de journal sorties vers `docs/history/` (trois fichiers),
**aucune ligne modifiée**. **3 289 → 1 277 lignes, 250 → 109 Ko (−57 %).**
⛔ **Non-perte prouvée ligne à ligne CONTRE L'ARCHIVE REÇUE**, pas contre ma
propre sortie : un contrôle qui compare une sortie à elle-même ne mesure rien.

⚠ **Huit lignes RETIRÉES, déclarées** : la consigne « exactement trois fichiers »
(caduque avec `CLAUDE.md`) et un état e2e périmé. Retrait explicite ≠ perte.

### D267 — le registre est un LOCALISATEUR, pas un résumé

Réécrire 241 décisions en une ligne chacune aurait demandé de les réinterpréter,
et une réinterprétation faite à la chaîne devient une source d'erreur qui a
l'apparence d'une source de vérité. Chaque entrée est donc la **ligne de
définition relevée dans le texte**, tronquée, jamais reformulée.

Mesuré : **217 des 241** ont une définition repérable · **22** n'ont qu'une
mention (marquées `?`) · **2** ne sont ancrées que par leur section.

⚠ **DIX-SEPT NUMÉROS NE SONT DOCUMENTÉS NULLE PART** — trouvés en construisant
l'index, pas creusés par lui. ⛔ **Ne pas les reconstituer** : un numéro réinventé
aurait l'autorité d'une décision sans en être une. Brûlés et rapportés.

### D267 — ce qui reste, et pourquoi pas ici

**R2** (réconcilier les 645 cases du backlog) est un **audit** : chaque case se
vérifie contre le code. **R3** (`AGENTS.md` → `.claude/rules/`) demande de
**mesurer le gain avec `/context`** après découpage. Ni l'un ni l'autre n'est
mécanisable par archives : lots Claude Code.

## Session du 28/08/2026 — D266 · suite e2e VERTE, `CLAUDE.md`, bascule

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D265**.

### État des six portes, mesuré — c'est l'état de référence de la bascule

| Porte | Résultat |
|---|---|
| `pnpm typecheck` | ✅ vert |
| `pnpm lint` | ✅ **0 problème** (D263) |
| `pnpm test` (unitaires) | ✅ API **638 / 55** |
| `pnpm build` | ✅ vert |
| `pnpm test:int` | ✅ vert |
| `pnpm test:e2e` | ✅ **34 passés, 1 sauté, 0 échec** — 4,7 min |
| `neutralize-s11a.py` | ✅ **18 / 18** |
| `neutralize-b7.py` | ✅ **3 / 3** |

⚠ **Le compte e2e se réconcilie** avec le run précédent : 17 passés + 2 échoués
+ 1 sauté + 15 non exécutés = 35 = 34 + 1. Les quinze tests masqués ont donc
RÉELLEMENT tourné, ils n'ont pas disparu du décompte. Vérification faite parce
qu'une suite qui « passe » en exécutant moins de tests est le piège classique.

### D266 — ⛔ `fetch failed` : DISPARU, PAS EXPLIQUÉ

Les douze échecs `TypeError: fetch failed` sur `/auth/register` **ne se sont pas
reproduits**. ⛔ **CE N'EST PAS UNE RÉSOLUTION.** Rien n'a été corrigé : le seul
changement est l'instrumentation de D265, qui déplie la cause — et elle **n'a
pas parlé**, puisqu'aucun appel n'a échoué.

⚠ **Un défaut intermittent qui ne se reproduit pas une fois n'est pas un défaut
fermé.** L'absence de reproduction est même COMPATIBLE avec l'hypothèse de tête
(course keep-alive undici ↔ serveur Node) : par construction, elle dépend du
temps écoulé entre deux appels et de la charge de la machine.

Ce qui reste vrai et mesuré : seul `register` utilise le `fetch` global de Node ;
`login` passe par `context.request` de Playwright et n'est jamais tombé.
L'asymétrie de transport tient toujours.

⇒ **L'instrumentation reste ARMÉE.** À la prochaine occurrence, elle nommera la
cause. Report maintenu ouvert au backlog ; ne pas le fermer sur ce run.

### D266 — `CLAUDE.md` créé, et pourquoi si court

**71 lignes.** Claude Code ne lit PAS `AGENTS.md` de lui-même : il faut
l'importer par `@AGENTS.md`, ce que fait la première ligne.

⛔ **LES DEUX GROS DOCUMENTS NE SONT PAS IMPORTÉS, ET LEUR NOM EST ÉCRIT ENTRE
ACCENTS GRAVES.** Un `@` devant `ZWADJ_CONTINUITE.md` en ferait un import :
247 Ko chargés à chaque lancement. Le piège est mécanique, pas théorique — le
parseur d'imports ignore ce qui est entre accents graves, et rien d'autre.

⚠ **Ce qui reste à payer** : `@AGENTS.md` charge **619 lignes** à chaque
session, contre les moins de 200 que la documentation recommande. C'est le
premier objet de la réduction documentaire. Volume actuel des trois documents :
**496 Ko, ≈ 141 000 tokens**, et **642 cases ouvertes** au backlog dont une part
correspond à des sujets déjà réglés.

### D266 — ordre de bascule, révisé sur une mesure

⚠ **Je m'étais trompé de premier lot.** J'avais proposé le `fetch failed` :
c'était bon tant qu'il était reproductible. Il ne l'est plus. **On ne débogue
pas ce qui refuse de se produire**, et le premier lot d'un outil neuf doit avoir
un critère de réussite net.

Premier lot Claude Code : **`BookingStatus.PENDING`** (D263) — isolé,
déterministe, chemin de l'argent, avec modes de défaillance et neutralisation
sur l'autorité. Petit, mesurable, et il ferme un défaut réel.

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

## Registre des décisions — D1 à D269

⛔ **CE REGISTRE EXISTE POUR QU'UN NUMÉRO SE PRENNE TOUJOURS EN LISANT CE FICHIER.**
Les journaux datés sont partis dans `docs/history/` (lot R1). Sans registre, le
fichier qui fait autorité sur la numérotation aurait cessé de contenir les numéros —
exactement la collision que D233 et D249 ont payée.

⚠ **CE N'EST PAS UN RÉSUMÉ, C'EST UN LOCALISATEUR.** Réécrire 241 décisions en une
ligne chacune aurait demandé de les réinterpréter. Chaque entrée est la ligne de
DÉFINITION **relevée dans le texte**, tronquée, jamais reformulée.
Mesuré : **217 des 241** ont une définition repérable ; **22** n'ont qu'une
mention (marquées `?`) ; **2** ne sont ancrées que par leur section.
⚠ Chiffres de l'audit R1 (28/08), **non recomptés depuis** : D268 s'y ajoute avec
sa ligne de définition, soit 218 sur 242 — dérivé, pas remesuré.

⛔ **DERNIER NUMÉRO ATTRIBUÉ : D269. Le prochain est D270.**

⚠ **D267 a été mal posé une première fois** : inscrit au backlog sans section ici,
pendant que le registre annonçait encore D266. Corrigé le 28/08.
**Un numéro s'inscrit D'ABORD dans ce fichier, ensuite ailleurs.**

⚠ **DIX-SEPT NUMÉROS NE SONT DOCUMENTÉS NULLE PART** dans les trois documents :
D7, D8, D13, D19, D20, D21, D22, D24, D25, D28, D67, D104, D105, D108, D109, D112, D113.
Ils l'étaient déjà avant ce lot. À **rapporter**, pas à combler par reconstitution :
un numéro réinventé vaut moins que rien. Huit autres (D9, D11, D12, D14, D16, D17,
D18, D23) ne vivent que dans `ZWADJ_BACKLOG.md`.

Où lire — **A** `ZWADJ_CONTINUITE.md` · **F** `docs/history/CONTINUITE-flux-A-E.md`
· **C** `…-campagnes-D115-D199.md` · **S** `…-sessions-D200-D265.md`

| D | où | ligne de définition relevée |
|---|---|---|
| D1 | F | Passes UI (D1 → D4) — thème sombre, langue, mise en page |
| D2 ? | F | La garde de session de /compte côté Client est CÔTÉ CLIENT, pas dans le m… |
| D3 ? | F | Puces de style = cases (OU) ; type = radios (choix unique). Pas de puce «… |
| D4 | F | Passes UI (D1 → D4) — thème sombre, langue, mise en page |
| D5 ? | F | UserStatus est désormais lu par SEPT chemins : login, google, refresh, re… |
| D6 ? | A | D34 — Tour 360° multi-photos liées, remplace D6. VenuePhoto360 + VenuePho… |
| D10 ? | A | réutilisation de jeton (D10) et révoquait toutes les sessions de l'utilis… |
| D15 ? | A | (D15–D32 posées pendant les tranches Auth et Pivot visuel — closes, non r… |
| D26 ? | C | exigerait une PAIRE de jetons, clair et sombre. D26 tient. |
| D27 ? | A | ✅ TRANCHE PIVOT VISUEL + OAUTH GOOGLE (Lots 7–9) : palette par app (D26),… |
| D29 ? | A | ✅ TRANCHE PIVOT VISUEL + OAUTH GOOGLE (Lots 7–9) : palette par app (D26),… |
| D30 ? | A | ✅ TRANCHE PIVOT VISUEL + OAUTH GOOGLE (Lots 7–9) : palette par app (D26),… |
| D31 ? | A | ✅ TRANCHE PIVOT VISUEL + OAUTH GOOGLE (Lots 7–9) : palette par app (D26),… |
| D32 ? | A | (D15–D32 posées pendant les tranches Auth et Pivot visuel — closes, non r… |
| D33 | F | D33 : TEMPORARILY_UNAVAILABLE ⇒ bandeau, et la page reste ENTIÈREMENT con… |
| D34 | A | D34 — Tour 360° multi-photos liées, remplace D6. VenuePhoto360 + VenuePho… |
| D35 | A | D35 — Taux de cashback variable par salle, en % du prix de base. Venue.ca… |
| D36 | A | D36 — Capacité minimale SUPPRIMÉE. ✅ Fait et vérifié au Lot A9. capacity_… |
| D37 | A | D37 — Suppression d'un compte : DEMANDE, jamais exécution directe. ✅ Fait… |
| D38 | A | D38 — Deux numéros de téléphone pour le pro. ✅ Fait et vérifié au Lot A10… |
| D39 | A | D39 — Prix par créneau : CONTRAINTE DE CONCEPTION du Flux B. PricingRule … |
| D40 | A | D40 — Saisie du prix : affichage groupé + unité, valeur brute stockée. ✅ … |
| D41 | A | D41 — Salles d'un compte supprimé : archivage réversible. ✅ Fait et vérif… |
| D42 | A | D42 — Définir un mot de passe sur un compte Google-only. ✅ Fait et vérifi… |
| D43 | A | D43 — Unité monétaire collée au chiffre par ALIGNEMENT. ✅ Code fait au Lo… |
| D44 | A | D44 — Loader de marque animé. ✅ Code fait au Lot A12, tests verts. UN SEU… |
| D45 | F | A6a — Visite virtuelle Matterport (D45, remplace le tour 360° maison) |
| D46 | A | D46 — Le prix appartient au CRÉNEAU, plus à la salle. Contrainte de conce… |
| D47 | A | D47 — Les visites ne sont PAS des réservations de fête, et ne partagent a… |
| D48 | A | D48 — Le fuseau de l'Algérie se décide à la FRONTIÈRE HTTP, une seule foi… |
| D49 | A | D49 — Format ⇒ 400 · bornes temporelles ⇒ ÉCRÊTAGE silencieux. Zod refuse… |
| D50 | A | D50 — Le contrat PUBLIC ne dit pas au client comment le pro fabrique ses … |
| D51 | A | D51 — Les blocages pro se saisissent en heure LOCALE, sans décalage. POST… |
| D52 | A | D52 — L'heure de fin d'un créneau est DÉDUITE, jamais saisie au-delà de 2… |
| D53 | A | D53 — Une saison PEUT enjamber décembre, et l'écran ne l'en empêche pas. … |
| D54 | A | D54 — La date de fin d'un blocage est INCLUSIVE à l'écran, exclusive dans… |
| D55 | C | D55, cinquième occurrence. La clé est omise quand le champ est vide, |
| D56 | A | D56 — La semaine algérienne commence le DIMANCHE, et se termine par le we… |
| D57 | A | D57 — L'Algérie utilise EXCLUSIVEMENT le format 24 h. Pas d'AM/PM, nulle … |
| D58 | A | D58 — Une visite dure 30 minutes, pour toute la plateforme. VISIT_DURATIO… |
| D59 | A | D59 — Un rendez-vous de visite est EXCLUSIF. ⚠ SUPERSÈDE D47 sur ce point… |
| D60 | A | D60 — Le pro choisit ses canaux de notification. Ferme la décision laissé… |
| D61 | F | D61 — corps de la demande. { date, startMinutes, phone? } strict, jamais … |
| D62 | F | D62 — annulation. status = CANCELLED + cancelledAt, jamais de DELETE : le… |
| D63 | F | D63 — notification. Port WHATSAPP_SENDER + DevLoggerWhatsAppSender, symét… |
| D64 ? | F | UI-D1 — ✅ Onglet actif souligné + mode sombre (D64). Soulignement de 2 px… |
| D65 | F | D65 — styles : référentiel, filtre en OU. Modèle calqué sur Amenity. Coch… |
| D66 | F | D66 — type de cérémonie : filtre INCLUSIF et ASYMÉTRIQUE. outdoor rend au… |
| D68 | F | D68 — plage de capacité. guests (plancher, D36 inchangé) et maxCapacity (… |
| D69 | F | D69 — une poignée EN BUTÉE ne filtre pas. Un curseur exprime un rétréciss… |
| D70 | F | D70 — la fenêtre pro n'est PAS écrêtée au présent. clampWindow (D49) sert… |
| D71 | F | D71 — La porte i18n compare le TOTAL, pas seulement les deux locales |
| D72 | F | D72 — Les codes d'erreur API se traduisent par table explicite, jamais |
| D73 | F | D73 — Un seul appel à l'action par intention sur le détail salle. Bouton |
| D74 | F | D74 — Aucune ligne Quote en E1 : Booking snapshote déjà ses montants. |
| D75 | F | D75 — Le prix est recalculé par le serveur ; le client annonce |
| D76 ? | F | D81 (remplace D76) — Acompte PAR SALLE : pourcentage ou montant |
| D77 | F | D77 — Plage bloquante matérialisée à la création. SINGLE_SLOT = la |
| D78 | F | D78 — Trois questions, trois autorités, jamais redoublées. L'existence |
| D79 | F | D79 — bookings.client_message, plafonné par Zod seulement. |
| D80 | F | D80 — E1 s'arrête à ACCEPTED. ⚠ Dette assumée : une demande acceptée |
| D81 | F | D81 (remplace D76) — Acompte PAR SALLE : pourcentage ou montant |
| D82 | F | D82 — Date strictement future, horizon 18 mois (D49) ; |
| D83 | F | D83 — Motifs asymétriques : le pro refuse sans motif ; le client doit un |
| D84 | F | D84 — Le défaut d'acompte appartient à la COLONNE (DEFAULT 3000), pas |
| D85 | F | D85 — Le dernier appel à l'action inerte a disparu du détail salle. |
| D86 | F | D86 — Le volet acompte n'existe qu'à l'édition (la colonne a son |
| D87 ? | F | défaut). D87 — Pourcentage saisi en pourcents, stocké en bps, |
| D88 ? | F | conversion à un seul endroit. D88 — Toute action pro recharge la liste, |
| D89 | F | D89 — Le service et son tarif naissent ensemble, une transaction : la |
| D90 | F | D90 — Ni le pricingType ni les prix ne se modifient : supprimer et |
| D91 | F | D91 — ⚠ La quantité n'est pas toujours choisie par le client. |
| D92 | F | D92 — expectedTotalCents inclut les prestations. D93 — La suppression |
| D93 ? | F | D92 — expectedTotalCents inclut les prestations. D93 — La suppression |
| D94 | F | D94 — Cinq statuts de devis stockés, pas d'EXPIRED : dérivé de |
| D95 ? | F | (leçon D80). D95 — SUPERSEDED ≠ DECLINED : « remplacé » et « refusé » |
| D96 | F | D96 — chainId dénormalisé, seule autorité de l'unicité : un index |
| D97 | F | D97 — ⚠ Rétrograder PUIS activer, même transaction. Les index partiels |
| D98 | F | D98 — Règle unique : toute version qui devient active remplace la |
| D99 | F | D99 — Un DRAFT ne s'accepte pas ; la supersession est irréversible. |
| D100 ? | F | D101 (remplace D100) — ⚠ L'acceptation d'un devis n'est PAS une action, |
| D101 | F | D101 (remplace D100) — ⚠ L'acceptation d'un devis n'est PAS une action, |
| D102 | F | D102 — POST /quotes/:id/convert crée une demande PENDING ; le devis |
| D103 | F | D103–D106 (écran catalogue) — Le type est annoncé avant le sélecteur ; |
| D106 ? | F | D103–D106 (écran catalogue) — Le type est annoncé avant le sélecteur ; |
| D107 | F | D107–D110 (catalogue public + sélecteur client) — Exposé sur le détail, |
| D110 ? | F | D107–D110 (catalogue public + sélecteur client) — Exposé sur le détail, |
| D111 | F | D111–D114 (écran devis) — Le bouton dit « Créer la demande », jamais |
| D114 ? | F | D111–D114 (écran devis) — Le bouton dit « Créer la demande », jamais |
| D115 | F | D115 — Deux booléens exposés tels quels, pas un enum. |
| D116 | F | D116 — Les canaux voyagent avec la session (AuthUserDTO.proProfile) : |
| D117 | F | D117 — ⚠ Garde anti-silence à TROIS niveaux, aucun de trop. Zod attrape |
| D118 | F | D118 — L'écran annonce le refus avant l'envoi, et dit ce qui est en jeu |
| D119 | C | D119 — RBAC dérivé du routeur, jamais d'une liste écrite à la main. 77 ro… |
| D120 | C | D120 — garde de forme ET frontière d'erreur, les deux. Array.isArray sur |
| D121 | C | D121 — transitions sœurs en check-and-set. decline, cancelAsPro, |
| D122 | C | D122 — contrats api ↔ api-client. Chemins appelés par @zwadj/api-client |
| D123 | C | D123 — migration sur base NON VIDE. Migrations appliquées sauf la dernièr… |
| D124 | C | D124 — contrat des tokens RÉSOLUS, pas de captures d'écran. Les valeurs |
| D125 | C | D125 — accessibilité automatisée (axe-core). 10 écrans, deux thèmes, page |
| D126 | A | ⛔ E3 — MÉTHODE RENFORCÉE (D126) |
| D127 | C | D127 — préchauffage des routes avant la suite e2e. Next et Vite compilent… |
| D128 | A | 11. Un seul levier, jamais deux (D128) |
| D129 | A | 12. Un token partagé ne se déplace pas pour un écran (D129) |
| D130 | C | D130 — La table de routes pro suit le top panel. / est le tableau de |
| D131 | C | D131 — « Réservations » montre les DATES VERROUILLÉES (ACCEPTED + |
| D132 | C | D132 — Le parcours de devis est le corps du tableau de bord. QuotesSection |
| D133 | C | D133 — ⚠ Une garde de forme devant un CHARGEUR sous try/catch est NUISIBL… |
| D134 | C | D134 — ~~Deux compositions de devis cohabitent sur le tableau de bord~~ — |
| D135 | C | D135 — L'e-mail de contact est FACULTATIF, le téléphone ne l'est pas. |
| D136 | C | D136 — L'étape 1 de l'assistant de salle est CRÉATRICE, et porte exacteme… |
| D137 | C | D137 — L'étape courante vit dans l'URL (?etape=N), jamais dans un état |
| D138 | C | D138 — Un « Suivant » inactif DOIT dire ce qui manque, et les messages par |
| D139 | C | D139 — « Franchissable » ≠ « déjà visitée ». Une salle existante ouvre les |
| D140 | C | D140 — Un seul calendrier, PILOTABLE. VenueCalendar sert l'écran Calendri… |
| D141 | C | D141 — Une seule chaîne de devis par session. Le premier calcul crée, les |
| D142 | C | D142 — Une garde de forme se met devant un RENDU (complète D133). |
| D143 | C | D143 — Un champ de saisie porte un <label> VISIBLE. aria-label seul sert |
| D144 | C | D144 — ⚠ Un script de neutralisation compte ses EXÉCUTIONS autant que ses |
| D145 | C | D145 — Le calendrier a DEUX PORTES et UN SEUL MOTEUR. bySlug (publique, |
| D146 | C | D146 — ⚠ Une décision de RÉUTILISATION d'endpoint se vérifie sur l'état R… |
| D147 | C | D147 — Toute borne de fenêtre côté front est IMPORTÉE du contrat. |
| D148 | C | D148 — Les points d'ENTRÉE sont fermés à une session ouverte. |
| D149 | C | D149 — La propriété d'une salle se traverse par la RELATION, jamais par |
| D150 | C | D150 — Un chemin d'API se construit D'UN SEUL TENANT dans @zwadj/api-clie… |
| D151 | C | D151 — Depuis UIP-A, GET /pro/venues appartient à la COQUILLE, pas à l'éc… |
| D152 | C | D152 — « Sortie de la référence a11y » ne veut PAS dire « corrigée ». |
| D153 | C | D153 — Un projet qui linte . doit ignorer ce que ses outils ÉCRIVENT. |
| D154 | C | D154 — Ordre du panneau gauche pro, VOULU et divergent de la maquette (R2… |
| D155 | C | D155 — Le voile d'accent, jamais la couleur écrite en dur de la maquette. |
| D156 | C | D156 — Une flèche remplace un libellé sans perdre son NOM ACCESSIBLE. |
| D157 | C | D157 — Révéler un bloc, c'est déplacer le FOCUS, pas seulement défiler (R… |
| D158 | C | D158 — Téléphone : MOBILE uniquement, saisie locale acceptée, normalisati… |
| D159 | C | D159 — REMPLACE D101. Les deux parcours sont DISTINCTS, et Quote est walk… |
| D160 | C | D160 — Imprimer / envoyer un devis est un PARTAGE, sans effet sur le prix. |
| D161 | C | D161 — CANCELLED absorbe DECLINED. Un seul état, un seul bouton. La nuance |
| D162 | C | D162 — Entonnoir : le dénominateur est le devis REMIS, et expired dispara… |
| D163 | S | D260 — D163 : le MOTIF corrigé, la décision conservée |
| D164 | C | D164 — Édition concurrente : verrou EXCLUSIF à l'ouverture (lot Q5). |
| D165 | C | D165 — chain_id / version / parent_quote_id : neutralisées d'abord, suppr… |
| D166 | C | D166 — ⚠ REDÉCOUPAGE 1 : SENT existants se trient par booking_id, pas en … |
| D167 | C | D167 — ⚠ REDÉCOUPAGE 2 : Q2 est INDIVISIBLE, et le versionnement passe en… |
| D168 | C | D168 — Q1 (livré) : le canal de remise arrive SEUL, sans changer aucun co… |
| D169 | C | D169 — supersedeActive() DISPARAÎT, elle ne change pas de cible. Elle vis… |
| D170 | C | D170 — La garde du téléphone (D160/D158) vit dans l'ÉCRAN, et sur deux ca… |
| D171 | C | D171 — Les quatre canaux sont DÉCLARATIFS, PRINT et SMS compris. Zwadj |
| D172 | C | D172 — SENT et SUPERSEDED deviennent LEGACY : plus écrits, toujours lus. |
| D173 | C | D173 — « Ce devis est-il encore ouvert ? » a UNE autorité : isQuoteOpen. |
| D174 | C | D174 — La disparition d'un BOUTON ne se voit que par une assertion de PRÉ… |
| D175 | C | D175 — L'entonnoir REPART DE ZÉRO, prix d'un indicateur qui dit vrai. Auc… |
| D176 | C | D176 — La garde de forme D120 suit le CONTRAT, sinon elle refuse la forme |
| D177 | C | D177 — Une garde dont l'OBJET disparaît se retire par écrit, pas par oubl… |
| D178 | C | D178 — CANCELLED absorbe DECLINED, SANS reprise. Troisième statut LEGACY. |
| D179 | C | D179 — L'entonnoir compte DEUX statuts perdus, et c'est la garde du lot. |
| D180 | C | D180 — L'historique quitte l'ÉCRAN, pas la BASE. Seule la dernière version |
| D181 | C | D181 — Tout statut de l'énuméré doit avoir un libellé, et c'est mesuré. |
| D182 | C | D182 — Un chemin d'API dont l'ACTION est une variable échappe au test de … |
| D183 | C | D183 — Q4 est le premier POINT DE NON-RETOUR. Voir AGENTS.md, invariants. |
| D184 | C | D184 — Ce que Q4 ne touche pas, chaque exception motivée. |
| D185 | C | D185 — Deux tests ne pouvaient PAS survivre à Q4, et c'est le signe qu'il… |
| D186 | C | D186 — L'autorité sur les garanties de la base est la MIGRATION. Voir |
| D187 | C | D187 — Une garde du chemin de l'argent vit dans un module PUR. |
| D188 | C | D188 — Le montant du paiement est LU sur la réservation, jamais recalculé. |
| D189 | C | D189 — Aucune remise appliquée au checkout, et le test le FIGE. Reste à |
| D190 | C | D190 — L'adaptateur de paiement par défaut REFUSE, il ne simule pas. 503,… |
| D191 | C | D191 — Le module de paiement est enregistré sans avoir de route. Nest rés… |
| D192 | C | D192 — Les portes API SONT exécutables en bac à sable ; le contraire étai… |
| D193 | C | D193 — Q5 est REPORTÉ jusqu'aux comptes salariés : le verrou n'a personne… |
| D194 | C | D194 — Le risque de concurrence RÉEL est ailleurs, et reste ouvert. |
| D195 | C | D195 — Chargily compte en DINARS. Mesuré, pas déduit. |
| D196 | C | D196 — Deux URL de retour, et aucune ne fait foi. |
| D197 | C | D197 — E3a ROUVERTE, périmètre limité : deux modes de défaillance de l'ap… |
| D198 | C | D198 — PAYMENTS_ENABLED allumé sans clé Chargily : le boot ÉCHOUE. |
| D199 | C | D199 — ⚠ LA PORTE DE PARITÉ NE VOIT PAS UNE ABSENCE SYMÉTRIQUE. |
| D200 | S | D200 — Aucune valeur réelle dans un fichier d'EXEMPLE. |
| D201 | S | D201 — Le flux Pro devient un assistant EXCLUSIF, et le récapitulatif ne … |
| D202 | S | D202 — Aucun montant dans le récapitulatif avant l'étape Devis. |
| D203 | S | D203 — Un seul VenueCalendar monté, une prop show. |
| D204 | S | D204 — L'accueil ne promet pas ce que le produit n'a pas. |
| D205 | S | D205 — ⚠ UNE GARDE QUI VIT DANS UN COMPOSANT SERVEUR NEXT EST INVISIBLE. |
| D206 | S | D206 — L'assistant de filtres vit sur une ROUTE DÉDIÉE. |
| D207 | S | D207 — Le compteur de salles vient du SERVEUR. |
| D208 | S | D208 — Les photos de la maquette ne partent pas en production. |
| D209 | S | D209 — ⚠ SIX FAÇONS DONT UN TEST NE MESURE RIEN. |
| D210 | A | D210 — availableOn ANNOTE la page, il ne la filtre pas. |
| D211 | A | D211 — availableOnDate a TROIS valeurs, et null ne grise JAMAIS. |
| D212 | A | D212 — L'ÉCHO de la date fait partie du contrat. |
| D213 | A | D213 — AVAILABLE_ON_PAST : ÉCART ASSUMÉ AVEC D49. |
| D214 | A | D214 — PENDING ne grise pas, et n'est même pas CHARGÉ (D101). |
| D215 | A | D215 — Le moteur est SCINDÉ, pas trompé. |
| D216 | A | D216 — Règle SEO : une page de recherche portant un paramètre est une VAR… |
| D217 | A | D217 — SearchOutcome : trois issues, parce qu'elles se disent en trois ph… |
| D218 | A | D218 — ⛔ UNE PORTE MESURÉE N'EST PAS UNE PORTE VERTE À LA LIVRAISON. |
| D219 | A | D219 — ⛔ LE CODE D'ERREUR EST SOUS message, PAS À LA RACINE. |
| D220 | A | D220 — HttpException.getResponse() ENVELOPPE une chaîne. |
| D221 | S | D221 justifiait la page racine par « un chemin dont la LOCALE est invalide |
| D222 | A | D222 — ⚠⚠ L'ANIMATION CARTE-À-CARTE N'A JAMAIS JOUÉ. |
| D223 | A | D223 — La chrome de parcours est FUSIONNÉE, pas alignée. |
| D224 | A | D224 — ⛔ LE HARNAIS DE NEUTRALISATION CORROMPAIT L'ARBRE. |
| D225 | A | D225 — ⚠ CORRIGE D211. Une salle sans AUCUN créneau est EXCLUE, pas grisé… |
| D226 | A | D226 — Le harnais a signalé sa propre péremption, et c'est le comportement |
| D227 | S | D227 — ✅ LIVRÉ. Refus hors horizon, code distinct |
| D228 | S | D228 — ✅ LIVRÉ, avec un SECOND défaut laissé OUVERT. |
| D229 | A | D229 — L'assistant n'est plus une route, c'est un MODE de /salles. ⛔ NON … |
| D230 | A | D230 — ?guide= porte l'ÉTAPE, pas un booléen. ⛔ NON LIVRÉ. |
| D231 | A | D231 — Accueil : formulaire SSR à TROIS champs, strictement additif. ⛔ NO… |
| D232 | A | D232 — ⛔ INCIDENT D'INTÉGRITÉ : du code non retracé est apparu dans l'arb… |
| D233 | S | D233 — prisma migrate dev ALIGNE la base sur le schéma ; il ne « propose … |
| D234 | S | D234 — L'autorité sur les statuts verrouillants est HARD_BOOKING_STATUSES… |
| D235 | S | D235 — [ÉCART] Le cœur commun des notifications est une FONCTION, pas un … |
| D236 | S | D236 — Une garde posée sur du code partagé se vérifie chez TOUS ses conso… |
| D237 | S | D237 — ⛔ DÉFAUT DE PRODUCTION : CANCELLED n'a jamais été ajouté au type P… |
| D238 | S | D238 — quotes_sent_at_coherent portait une prémisse que Q2 avait rendue f… |
| D239 | S | D239 — Une garde dont l'objet disparaît se retire PAR ÉCRIT, jamais en so… |
| D240 | S | D240 — Les transitions vivent dans deux modules PURS ; le code transactio… |
| D241 | S | D241 — Une matrice qui se relit elle-même n'est pas une garde. |
| D242 | S | D242 — [ÉCART] Un pricingType inconnu est REFUSÉ, il ne se vend plus au p… |
| D243 | S | D243 — Sur le chemin de l'argent, on pose le filet AVANT de déplacer le c… |
| D244 | S | D244 — Port de persistance du paiement ; les gardes suivent le code qu'el… |
| D245 | S | D245 — [ÉCART] S5b prend la CONCURRENCE, pas la persistance entière. |
| D246 | S | D246 — D63 n'est pas révoquée, son motif est ÉTENDU. |
| D247 | S | D247 — La garde des sorties de test ferme l'avenir, elle ne nettoie pas l… |
| D248 | S | D248 — Une cible de neutralisation SANS MESURE n'a pas eu lieu ; elle n'e… |
| D249 | S | D249 — ⛔ LES DEUX PAGES 404 N'ÉTAIENT ATTEINTES PAR PERSONNE. |
| D250 | S | D250 — ⛔ TOUS LES 404 DU SEGMENT SORTAIENT EN HTTP 200. |
| D251 | S | D251 — Le décor de la 404 est une IMAGE STATIQUE, pas un nuage engendré. |
| D252 | S | D252 — une INTERSECTION sur l'objet, pas sur le résultat de l'appel |
| D253 | S | D253 — une cible de neutralisation SANS MESURE était comptée MORDUE |
| D254 | S | D254 — les paliers de budget : une seule autorité, tous sous la butée |
| D255 | S | D255 — atomicité de l'intention de paiement : la base, pas un verrou |
| D256 | S | D256 — les plafonds d'avertissements : un PLAFOND, pas une égalité |
| D257 | S | D257 — ISP : six interfaces là où il y en avait une de vingt-deux membres |
| D258 | S | D258 — la frontière DIP est le BLOC TRANSACTIONNEL, pas la lecture |
| D259 | S | D259 — BookingSource manquait aux énumérations partagées |
| D260 | S | D260 — D163 : le MOTIF corrigé, la décision conservée |
| D261 | S | D261 — ce qui a commandé le découpage : l'ABSENCE de spec unitaire |
| D262 | S | D262 — « NON MESURÉ » N'EST PAS « NON LANÇABLE ». Correctif S11-a-1. |
| D263 | S | D263 — les trois imports n'étaient PAS équivalents |
| D264 | S | D264 — la règle existait, elle vivait dans un commentaire |
| D265 | S | D265 — --hm-gutter : artefact de mesure, DÉMONTRÉ |
| D266 | A | D266 — ⛔ fetch failed : DISPARU, PAS EXPLIQUÉ |
| D267 | A | ## Session du 28/08/2026 — D267 · R1, réduction documentaire (part mécan… |
| D268 | A | D268 — ⛔ LA CONSIGNE DE D263 ÉTAIT JUSTE SUR LE DÉFAUT, FAUSSE SUR LE R… |
| D269 | A | D269 — la cause était dans l'ATTENTE, pas dans le code |
