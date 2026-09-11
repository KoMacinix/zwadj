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
> ⛔ **AUCUN ÉTAT COURANT NI PROCHAIN LOT N'EST ÉCRIT DANS CET EN-TÊTE.**
> Cette place portait « Six portes vertes, lint à 0 problème, API **638 / 55**, e2e
> 34 passés » et « **Prochain lot : `BookingStatus.PENDING` (D263)** » — un lot fait le
> 30/08 sous **D268**, annoncé sous une porte qui n'est pas verte. En tête du fichier,
> ces lignes se lisaient comme l'état du jour.
> ⛔ **ET ELLES CONTREDISAIENT LA RÈGLE POSÉE DANS LE MÊME COMMIT**, section « État
> actuel » (« ⛔ AUCUN COMPTEUR COURANT N'EST ÉCRIT ICI ») : le remède avait été
> appliqué au CORPS du document et pas à sa TÊTE, c'est-à-dire pas à l'endroit qu'une
> reprise lit en premier.
> ⇒ **Où lire l'état** : les compteurs se MESURENT en lançant les portes ; les chiffres
> d'un lot vivent dans l'en-tête de SA session, avec l'état machine relevé devant eux
> (D270). **Où lire le prochain lot — DEUX QUESTIONS, DEUX ENDROITS** : l'ordre des rangs
> (section D270) dit **QUEL** lot vient ensuite ; le point d'entrée du rang courant, section
> « PROCHAIN LOT » du corps, dit **OÙ CE LOT EN EST**.
> ⛔ **« ET LUI SEUL » RETIRÉ LE 09/09/2026 (D283) — ET C'EST L'INVERSE DE L'ARBITRAGE QUI
> AVAIT ÉTÉ PRIS LE MATIN MÊME.** L'entrée `[DOC][P2]` tranchait que la l. 114 — celle qui
> nomme les DEUX endroits — devait céder devant celle-ci. **Faux, corrigé par Ko** : elle
> aurait retiré le seul pointeur vers le bloc que D282 venait de rendre autoritaire sur
> l'état du rang, c'est-à-dire rétabli la route que D282 a mesurée comme trompeuse. **Le
> remède n'est pas de choisir un vainqueur entre deux pointeurs qui ne répondent pas à la
> même question : c'est de séparer les questions.**
> ⚠ **CE QUI RENDAIT « ET LUI SEUL » FAUX EST MESURÉ, PAS SUPPOSÉ** : une reprise à froid
> du 09/09/2026 a suivi ce pointeur, et l'ordre des rangs **ne portait AUCUN rang 9** — le
> prochain lot n'était **écrit nulle part**. Il a fallu recouper `AGENTS.md` et
> `ZWADJ_BACKLOG.md` pour l'établir. ⛔ **Un pointeur qui dit « et lui seul » sur un endroit
> incomplet EMPÊCHE le recoupement qu'il rend nécessaire** — c'est le premier défaut que le
> rang 9 corrige.
> **Où prendre un numéro** : la dernière ligne de la table du registre, en bas.
> ⚠ **Retrait déclaré, pas mise à jour** — un compteur rafraîchi redevient faux au lot
> suivant. C'est le même geste que pour les trois autres de la série (D268, « D1 à
> D266 » dans `CLAUDE.md`, le bandeau du registre).
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
> ~~**➡️ PROCHAIN LOT — E3, PAIEMENT CHARGILY. C'est le lot de Ko** (chemin critique,
> revue humaine D39), et c'est **le seul verrou restant**. Il débloque à lui seul :
> `Booking → CONFIRMED`, la bascule `Quote → ACCEPTED`, le compteur « aboutis » de
> l'écran devis (aujourd'hui structurellement à 0), la libération automatique des
> créneaux, et la ligne `Commission`.~~
>
> ⛔ **BARRÉ LE 08/09/2026 (D280) — ET ELLE A SURVÉCU SOUS SA PROPRE RÈGLE.** Quatre-vingts
> lignes PLUS HAUT, dans ce même bloc d'en-tête, est écrit : « **AUCUN ÉTAT COURANT NI
> PROCHAIN LOT N'EST ÉCRIT DANS CET EN-TÊTE** » — règle posée précisément parce qu'un
> « Prochain lot » figé y avait déjà menti. **Le jumeau a été retiré, celui-ci est resté**,
> dans le paragraphe qui raconte le retrait. Une passe de barrage qui ne se relit pas dans
> son propre fichier laisse derrière elle ce qu'elle est venue chercher.
> ⇒ **Où lire le prochain lot** : l'ORDRE DES RANGS (D270) pour **QUEL** lot, et la section
> « PROCHAIN LOT » du corps pour **OÙ IL EN EST** — deux questions, deux endroits (D283).
> ~~Au 08/09/2026 le rang courant est **8 — S11-b**~~, et **E3 n'est pas le prochain lot** ;
> « le seul verrou restant » était faux dès l'ouverture du rang 8.
> ⛔ **LE NUMÉRO DE RANG EST BARRÉ, PAS RAFRAÎCHI (09/09/2026, D283).** Il était exact à sa
> date — et **un numéro de rang dans l'en-tête est un compteur figé dans le bloc qu'une
> reprise lit EN PREMIER** : au 09/09 le rang courant est le **9**, un jour après. Le
> remplacer ici le rendrait faux au rang suivant, et le même paragraphe l'a déjà payé pour
> « Prochain lot : E3 ». **Où se lit le rang courant : l'ordre des rangs, nulle part
> ailleurs.** ⚠ Ce qui reste vrai sans date, et qui est le POINT de la phrase : E3 n'est pas
> le prochain lot.
> ⚠ Ce qui reste VRAI dans la phrase barrée, et qui vit ailleurs : E3 est un lot du chemin
> critique à revue humaine (D39), et sa méthode renforcée est décrite plus bas.
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
- ✅ **Schéma Prisma complet.** ⛔ **LE COMPTE DE MIGRATIONS QUI VIVAIT ICI EST RETIRÉ, PAS CORRIGÉ (D280, 08/09/2026).** Il annonçait « 18 entrées (17 migrations + `migration_lock.toml`) », et le dépôt en portait bien davantage. Un compteur figé dans « État actuel » se recopie longtemps après avoir cessé d'être vrai — c'est D268, appliqué ici pour la cinquième fois. **Le rafraîchir aurait reconduit la faute d'un lot** ; ⛔ **et écrire le compte du jour à sa place l'aurait REPLANTÉE**, dans le bloc même qui se lit comme l'état courant. Le compte mesuré le 08/09 vit dans la section D280, daté. ⇒ **Ici, la commande seule** : `ls apps/api/prisma/migrations`, ou `SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL` sur la base visée.
- ✅ **TRANCHE AUTHENTIFICATION (Lots 0–6)** : 9 routes `/auth/*`.
- ✅ **TRANCHE PIVOT VISUEL + OAUTH GOOGLE (Lots 7–9)** : palette par app (D26), remember-me (D27/D31), invariant `required` (D32), OAuth Google ID-token GIS (D29/D30).
- ✅ **FLUX A — Lots A0 à A5** + correctif prix D40.
- ✅ **FLUX A — Lots A9, A12, A10, A11a, A11b** : intégrés dans cet ordre, sept correctifs appliqués (voir plus bas), **toutes gates vertes**.
- ✅ **FLUX A — Lot A6a (visite virtuelle Matterport, D45)** : intégré, gates vertes, migration prouvée en base réelle.
- ✅ **TRANCHE UIP — refonte de l'app Pro (D130 → D149)** : coquille + top panel, parcours « client sur place », assistant de salle en 7 étapes, refonte graphique, contrat de contact D135. ⚠ Livrée sur **cinq portes** : le bac à sable ne peut pas exécuter l'API (voir les compteurs UIP). ~~**Sept tests d'intégration restent à passer chez Ko.**~~ ⛔ **BARRÉ LE 08/09/2026 (D277)** : mesuré sur CETTE machine le 07/09, `test:int` rend **434 tests / 36 fichiers, exit 0** contre `zwadj-db` (postgres:18) réel — D275. La phrase datait du bac à sable web, où l'API n'était pas exécutable ; elle est restée écrite **au présent**, en tête de la section qui existe pour dire l'état, onze jours après avoir cessé d'être vraie. **Barré, pas effacé.**

### ⛔ AUCUN COMPTEUR COURANT N'EST ÉCRIT ICI

Cette place portait un tableau **« Compteurs — clôture de la campagne qualité
(07/08/2026) »** : 76 fichiers / 808 tests, 8 projets au typecheck, 34 fichiers
d'intégration. En tête d'« État actuel », il se lisait comme l'état du jour. **Il
avait un mois**, et l'API à elle seule était passée de 374 à 640 tests entre-temps.
⛔ **Un chiffre figé en tête d'un document d'état finit par couvrir exactement ce
qu'il prétendait mesurer** — c'est D268 (« aucun compteur de harnais n'est écrit
ici ») appliqué aux compteurs de PORTES.
⇒ **Les compteurs courants se MESURENT en lançant les portes** — `pnpm typecheck`,
`lint`, `test`, `build`, `test:int` — jamais en lisant ce fichier. Les chiffres d'un
lot donné vivent dans l'**en-tête de sa session**, avec l'état machine relevé devant
eux, sans quoi ils ne veulent rien dire (D270).
⚠ **Les tableaux qui suivent sont des RELEVÉS DE CLÔTURE DATÉS**, conservés comme
histoire : ils disent ce qui a été mesuré tel jour, jamais l'état courant.
⛔ **ET ILS NE SONT PAS EN ORDRE CHRONOLOGIQUE (clause ajoutée le 08/09/2026, D281) :
le SECOND est ANTÉRIEUR au premier**, et il est le seul dont le titre ne portait pas de
date. Une lecture linéaire prend le dernier tableau pour le plus récent — c'est la
lecture normale, et elle est fausse ici. La suite
e2e n'est toujours **PAS** une septième porte — elle se lance à la demande, avant
tout lot touchant **auth, concurrence ou argent**, et avant chaque livraison.

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

**Compteurs de référence à la clôture du Flux C (C1 → C5b) + tranche A13 + passes UI-D1→D4** — ~~tout écart futur est une régression~~. Valeurs **MESURÉES en bac à sable**, jamais déduites :

⛔ **DATE : NON RELEVABLE AU 08/09/2026. BORNE BASSE RELEVÉE : 30/07/2026.** Cherché, et
c'est la mesure — pas une impression : `docs/history/CONTINUITE-flux-A-E.md`, où vit le
détail du Flux C et de la tranche A13, ne porte **aucune date au format JJ/MM/2026** ; le
titre de ce tableau nomme un ÉVÉNEMENT, pas un jour ; et `git log -S` sur cette ligne rend
**28/08/2026**, qui date le **déplacement documentaire de R1 (D267)**, pas la clôture.
⇒ Ce qui SE relève : la migration la plus tardive du périmètre couvert est
`20260730120000_venue_styles_and_ceremony_type` (A13a) — la clôture n'est donc **pas
antérieure au 30/07/2026**. ⛔ **Une borne n'est pas une date, et aucun jour n'est inventé
ici** : le tableau F1 qui PRÉCÈDE porte, lui, sa date au titre (02/08/2026).

⛔ **« TOUT ÉCART FUTUR EST UNE RÉGRESSION » EST BARRÉ LE 08/09/2026 (D281), ET C'EST CETTE
PHRASE QUI FAISAIT LE MAL.** Elle transforme un relevé d'histoire en **norme tournée vers
l'avenir**, et elle contredit frontalement le chapeau posé trente lignes plus haut
(« ils disent ce qui a été mesuré tel jour, jamais l'état courant »). Des deux, c'est la
phrase normative qui gagne à la lecture, parce qu'elle parle du futur. ⇒ Le chapeau
n'était pas absent : **il était contredit en dessous.**
⚠ **CE QUE LA PHRASE COÛTAIT, MESURÉ** : ses cinq nombres sont périmés, et une reprise à
froid qui les prend pour une base y lit une **régression massive** — 72 fichiers / 688
tests unitaires contre 1 323 / 108 mesurés le 08/09 (D279), 27 / 297 en intégration contre
434 / 36, et 18 entrées de migrations contre le contenu réel du dossier.
⚠ **ET LES DEUX TABLEAUX SE CONTREDISAIENT DÉJÀ SUR UN POINT** : F1 annonce « typecheck
**8 projets**, valeur mesurée, jamais déduite », celui-ci « **7 projets** », chacun avec sa
note de correction. Une reprise obtenait 7 ou 8 **selon le tableau qu'elle ouvrait**.
⇒ **Aucun des deux chiffres n'est faux, et aucun n'est touché** : `api-client` s'est ajouté
entre les deux clôtures. C'est l'ABSENCE DE DATE qui rendait la contradiction insoluble —
la dater la résout **sans corriger un seul nombre**.
⚠ **Les deux tables restent INTACTES.** On ne réécrit pas un relevé d'histoire : on lui
rend sa date et on lui retire ce qui le faisait passer pour une norme.

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
## PROCHAIN LOT — rang 10 · `[API][P0]` **les deux échéances** ⛔ **CHEMIN DE L'ARGENT**

⛔ **OUVERT LE 10/09/2026, ARBITRÉ PAR KO.** ⇒ **QUEL lot : rang 10 de l'ordre des rangs. OÙ IL
EN EST : ici.** C'est la séparation des deux questions posée par D283.

⛔ **ÉTAT : CADRÉ LE 10/09/2026 (D284). AUCUNE LIGNE DE CODE ÉCRITE.** L'arrêt franc de
`CLAUDE.md` s'applique — « tout code sur le CHEMIN DE L'ARGENT sans analyse écrite des modes de
défaillance » — et le cadrage est le **premier livrable**, pas un préalable que la session aurait
trouvé écrit. Le code s'écrit en **session neuve**, après arbitrage de Ko sur ce cadrage.
⚠ **Ce bloc se rafraîchit à la clôture de toute session qui fait avancer le rang** (règle D282).

### Ce que le rang 10 recouvre

**Rendre VISIBLE l'interversion des deux constantes d'échéance.** Aujourd'hui, échanger
`PRO_RESPONSE_DAYS` (7 jours) et `PAYMENT_WINDOW_HOURS` (48 h) entre leurs deux sites d'appel
produit deux dates parfaitement non nulles : **aucune porte ne rougit**. Le lot exporte les deux
constantes, fait assertir la **durée** par l'intégration en les important, et arme la cible de
neutralisation qui le prouve.
⛔ **POURQUOI C'EST LE CHEMIN DE L'ARGENT** : `paymentDueAt` est ce sur quoi **E3 décidera si un
règlement arrive à temps**. Une fenêtre de 48 h servie à 7 jours — ou l'inverse — ne se voit ni à
la lecture ni à l'exécution ; elle se verrait au premier litige de paiement.

### ⛔ CADRAGE — écrit le 10/09/2026, AVANT toute ligne de code

#### ⛔ LE FAIT CENTRAL, RELEVÉ ET NON SUPPOSÉ

**Tout ce qui suit a été lu dans le dépôt ce jour, jamais écrit de mémoire.** Les deux
affirmations du backlog ont été confrontées à la source : **exactes au mot, y compris leurs
numéros de ligne.**

| relevé | fait |
|---|---|
| `bookings.service.ts:116` | `const PRO_RESPONSE_DAYS = 7;` — **privée, non exportée** |
| `bookings.service.ts:118` | `const PAYMENT_WINDOW_HOURS = 48;` — **privée, non exportée** |
| `bookings.service.ts:120-121` | `DAY_MS = 86_400_000` · `HOUR_MS = 3_600_000` |
| `bookings.service.ts:251` | `expiresAt = …({ fromMs: nowMs, windowMs: PRO_RESPONSE_DAYS * DAY_MS, eventStartsAt: window.startsAt })` |
| `bookings.service.ts:382` | `paymentDueAt = …({ fromMs: acceptedAt.getTime(), windowMs: PAYMENT_WINDOW_HOURS * HOUR_MS, eventStartsAt: row.startsAt })` |
| `bookings.int-spec.ts:156` | `expect(dto.expiresAt).not.toBeNull();` |
| `bookings.int-spec.ts:157` | `expect(dto.paymentDueAt).toBeNull();` |
| `bookings.int-spec.ts:373` | `expect((res.body as BookingDTO).paymentDueAt).not.toBeNull();` |
| `booking-deadline.spec.ts` | **6 tests, tous** passent `windowMs` en PARAMÈTRE |

⛔ **CE QUE LA DERNIÈRE LIGNE TRANCHE, ET C'EST CE QUI REND LE LOT NÉCESSAIRE** : la spec unitaire
de D282 mesure la **FORMULE**, `min(fromMs + windowMs, début)`, et reçoit `windowMs` de son
appelant. **Elle est donc aveugle PAR CONSTRUCTION à la constante que le service lui passe** — et
aucune quantité de tests ajoutés à ce fichier ne pourra jamais voir l'interversion. La mesure
manquante est à l'ÉTAGE DU DESSUS, dans l'intégration.
⚠ **Relevé au passage, absent du backlog, et à garder** : `:157` assertit que `paymentDueAt` est
**nulle à la création**. C'est une vraie garde — l'échéance d'acompte ne doit pas exister avant
l'acceptation — et ce lot **ne la touche pas**.

#### ⛔ LES MODES DE DÉFAILLANCE — ÉCRITS AVANT LE CODE. UN MODE NON LISTÉ NE SE CODE PAS.

**MD1 — ⛔ L'ÉCRÊTAGE FAIT DISPARAÎTRE LA CONSTANTE DU RÉSULTAT, ET LA GARDE NAÎTRAIT MUETTE.**
Nommé par Ko avant toute mesure, et confirmé par la lecture du module : le rendu est
`min(fromMs + windowMs, eventStartsAt)`. **Si la fixture place l'événement à moins de 48 h ou
moins de 7 jours, l'échéance VAUT `startsAt` et la constante n'est plus dans le résultat.**
L'assertion de durée passerait, l'interversion resterait invisible — on aurait construit
exactement la garde que ce lot existe pour supprimer.
⇒ **REMÈDE** : la fixture des deux tests d'échéance place `startsAt` **au-delà des DEUX** fenêtres.
C'est le mode n°1, et il commande la **fixture** avant de commander l'assertion.

**MD2 — ⛔ LA GARDE PORTERAIT UNE DATE DE PÉREMPTION, ET ELLE EST DÉJÀ DANS LE FICHIER.**
Mesuré : `bookings.int-spec.ts:32` porte `const EVENT_DATE = "2027-08-15"`, une **date calendaire
figée**. Elle satisfait MD1 aujourd'hui — mais **par accident du calendrier**, et elle cesse de le
faire le **08/08/2027**, sept jours avant l'événement : la garde deviendrait muette **sans qu'une
ligne de code ait bougé**, et la session qui le découvrirait chercherait la cause ailleurs.
⚠ **PRÉCÉDENT EXACT DANS CE DÉPÔT** : la fixture `2099-06-02`, choisie pour n'être jamais passée,
est devenue exactement ce que le nouvel horizon refusait et faisait tomber trois tests qui ne
parlaient pas d'horizon. Et D213/D227 : « **figer l'horloge, jamais choisir une date dans le
futur — elle cesse de l'être** ».
⇒ **REMÈDE** : la date des deux tests d'échéance se **DÉRIVE** des constantes importées plus une
marge, jamais d'un littéral de calendrier.
⛔ **ET LA CONTRAINTE QUI INTERDIT DE CORRIGER `EVENT_DATE` EN PLACE** : `:167` et `:511` assertent
des instants ISO **exacts** dérivés d'elle (`"2027-08-15T19:00:00.000Z"`,
`"2027-08-14T23:00:00.000Z"`) et mesurent **autre chose** — le créneau 20h→02h qui franchit minuit
(D55/D77). Les toucher serait le refactoring opportuniste que ce dépôt punit.
⇒ **Le lot ajoute une fixture DÉDIÉE aux échéances et laisse `EVENT_DATE` intacte.**

**MD3 — ⛔ L'ATTENDU RECOPIÉ AU LIEU D'ÊTRE IMPORTÉ.** Écrire `7 * 86_400_000` ou `48` dans la
spec, c'est **recopier une liste au lieu de confronter l'autorité** — interdit par `CLAUDE.md`, et
déjà payé par le `toContain` de S10b. Une constante changée en production laisserait la spec verte
sur l'ancienne valeur.
⇒ **REMÈDE** : les deux constantes sont **exportées** et la spec les **importe**. L'attendu s'écrit
`PRO_RESPONSE_DAYS * DAY_MS`, jamais un nombre.

**MD4 — ⛔ DEUX HORLOGES : L'ÉGALITÉ EXACTE N'EST PAS DISPONIBLE DES DEUX CÔTÉS, ET LE CADRAGE LE
DIT PLUTÔT QUE DE LA PROMETTRE.** Mesuré :

- `expiresAt` part de `nowMs = Date.now()` (`:195`), horloge **Node** ; le seul instant de référence
  exposé par le DTO est `createdAt`, qui vient de `@default(now())`, horloge **PostgreSQL**.
  **Deux horloges ⇒ aucune égalité exacte possible.** L'assertion est donc **bornée**, et sa
  tolérance s'écrit avec son motif : ce qui la rend suffisante n'est pas sa finesse, c'est que
  **48 h et 7 jours sont séparés de cinq jours** — toute borne très inférieure à cet écart rend
  l'interversion visible ;
- `paymentDueAt` part de `acceptedAt = new Date()` (`:379`), et **`accepted_at` est PERSISTÉE**
  (`schema.prisma:1073`). La spec d'intégration peut donc relire la ligne et assertir **l'égalité
  EXACTE** : `paymentDueAt − acceptedAt === PAYMENT_WINDOW_HOURS * HOUR_MS`.

⇒ **Les deux côtés n'ont pas la même force, pour une raison MESURÉE. L'écrire ici évite qu'une
session suivante lise l'assertion bornée comme un relâchement** — ou qu'elle « corrige » la
bornée en exacte et fabrique une suite qui rougit au hasard.

**MD5 — ⛔ LE MODULE NIERAIT SON PROPRE CORPS.** `booking-deadline.ts` porte, en tête et en toutes
lettres : « **ce fichier ne déclare aucune constante de durée** », avec son motif — garder les deux
règles métier séparées, la durée étant un PARAMÈTRE. Y déposer les deux constantes **sans toucher à
cet en-tête** livrerait un module dont le commentaire dit l'inverse du code, et **D116 a déjà payé
exactement cela** (« le commentaire disait l'inverse du code, et un relecteur l'aurait cru »).
⇒ **REMÈDE** : l'en-tête est **amendé dans le même geste**, pour dire ce qui reste vrai — **ce que
le motif interdit est une valeur HARMONISÉE, pas deux constantes distinctes et nommées**.
⚠ **La garde qui empêche la fusion existe déjà** : `booking-deadline.spec.ts:108`, « LES DEUX
FENÊTRES RESTENT DISTINCTES — la garde qui interdit de les fusionner ».

**MD6 — ⚠ LE FUSEAU, ET IL EST MUET SUR UN SERVEUR EN UTC.** `eventDate` est une date **civile**
(UTC+1 sans heure d'été, D48) tandis que `startsAt` est un instant UTC. Une date d'échéance dérivée
par arithmétique sur un `Date` local peut glisser d'un jour — et l'intégration, qui tourne en UTC,
**ne le verrait jamais** (leçon S11-a, mesurée). ⇒ La fixture dérive sa date par les aides civiles
existantes du dépôt, jamais à la main.

#### Les cibles de neutralisation, nommées d'avance

⛔ **LA CIBLE DU LOT : INTERVERTIR LES DEUX CONSTANTES DOIT ROUGIR.** Le backlog note qu'aucune
cible n'a été écrite dans D282 **parce qu'elle aurait été muette** avec les mesures existantes — et
une cible muette fait sortir la campagne en échec sans rien apprendre. **C'est ce lot qui crée la
mesure : la cible naît donc avec elle, et se vérifie.**

| cible | mutation | mesure |
|---|---|---|
| **A**, `attendu = 1` | `:251` reçoit `PAYMENT_WINDOW_HOURS * HOUR_MS` | `int-reservations` |
| **B**, `attendu = 1` | `:382` reçoit `PRO_RESPONSE_DAYS * DAY_MS` | `int-reservations` |

⚠ **DEUX CIBLES, PAS UNE, ET C'EST UN CHOIX** : une interversion réelle mute les deux sites à la
fois ; muter **un seul** prouve que **chaque** assertion voit **son** site. Une cible unique
laisserait passer le cas où une seule des deux assertions mord — c'est l'assertion de comptage de
D226 transposée aux sites d'appel.
⚠ **Le harnais et la mesure existent déjà** : `neutralisation/neutralize-s11b.py` déclare
`int-reservations` → `test/int/bookings.int-spec.ts`, derrière `--int`. Ses cibles **10 et 11**
mutent la **formule** et sont mesurées par la spec **unitaire** ; les deux nouvelles mutent les
**sites d'appel** et sont mesurées par l'**intégration**. **Elles ne se recouvrent pas.**

#### Ce qui se MESURE avant et après — sinon le lot s'auto-décerne son résultat (D261)

1. **Avant** : les deux cibles, écrites et jouées **sur l'arbre d'AVANT le lot**.
   ⛔ **Elles DOIVENT être muettes.** C'est la démonstration que le défaut existe. Une cible qui
   mordrait déjà voudrait dire que la mesure existait et que ce cadrage s'est trompé d'objet.
2. **Après** : les deux mêmes cibles **mordent**, et `neutralize-s11b.py --int` passe de **11/11**
   à **13/13**.
3. **Le compte d'intégration relevé AVANT toute modification** — dernier relevé certifié
   **434 / 36** (D283) — pour que le « +N » mesure quelque chose. **Recompter fait partie de la
   reprise** (leçon S11-a) : ce chiffre est un renvoi, pas une mesure du jour.

#### ⛔ UN POINT D'ARBITRAGE POUR KO — soulevé, non tranché par la session

**OÙ VIVENT LES DEUX CONSTANTES.** La consigne dit `booking-deadline.ts`, et c'est le choix retenu
par ce cadrage. ⚠ **Mais il entre en collision frontale avec une phrase écrite du module** (MD5), et
le dépôt impose de vérifier une consigne contre les décisions déjà prises — D231, et la leçon S11-a
où une consigne de backlog aurait défait D63. Les trois options, mesurées :

- **`booking-deadline.ts`** — ⇒ **RETENU**. Le patron existe (`booking-charge.ts` : le module pur
  est l'autorité, service **et** spec importent de lui). **Coût : amender l'en-tête** (MD5) ;
- **`@zwadj/types`** — `AGENTS.md` dit « les constantes de temps vivent dans `@zwadj/types` », où
  vivent déjà `VISIT_DURATION_MINUTES`, `AVAILABILITY_MAX_WINDOW_DAYS` et
  `ALGERIA_UTC_OFFSET_MINUTES`. ⛔ **Écarté, et sur une mesure** : ces trois-là sont des constantes
  de **contrat**, partagées front/back. Relevé ce jour — **aucune des deux fenêtres n'est affichée
  ni consommée par `apps/client` ni par `apps/pro`** (zéro occurrence). Les y porter **élargirait le
  contrat public sans consommateur**, ce que le périmètre MVP interdit ;
- **export depuis `bookings.service.ts`** — la lettre du backlog (« exporter les deux constantes »).
  ⛔ **Écarté** : ce serait faire importer un **service** par une spec pour y lire une règle métier,
  alors que S11-a et S11-b ont précisément sorti ces règles du service.

⇒ **Si Ko préfère une autre maison, seul MD5 change** ; les cinq autres modes et les deux cibles
tiennent à l'identique.

#### ⛔ Ce qui NE se code PAS dans ce lot

- **aucun changement de comportement.** Les deux constantes gardent leurs valeurs, 7 et 48. Ce lot
  rend une règle **mesurable**, il ne la modifie pas ;
- **le bouton « payer l'acompte » quand l'échéance est passée** — `[E3][P1]`, dette D80 assumée,
  **décision d'E3** ;
- **la dérive de somme de contrôle `_prisma_migrations`** — reliquat du rang 8, arbitrage ouvert,
  **interdit d'y toucher** (Ko, 09/09/2026) ;
- **aucune migration.** ⚠ Conséquence directe et voulue : `migration-non-empty.int-spec.ts` n'a pas
  à être retargé, et **le `CHECK` d'agrégat de D282 reste la DERNIÈRE migration**, donc encore
  mesurable. Tout lot qui ajouterait une migration le rendrait intestable (`[INFRA][P1]`).

#### ⚠ Ce que ce cadrage n'a PAS mesuré, et qu'il ne faut pas lire comme vert

- **aucune porte n'a été lancée** dans cette session — lot documentaire ;
- **les deux cibles n'ont pas été jouées.** Elles sont **spécifiées, pas mesurées** : leur mutisme
  sur l'arbre d'avant est une **prédiction de ce cadrage**, et c'est la première chose que la
  session de code doit vérifier ;
- **la tolérance de l'assertion bornée de MD4 n'est pas chiffrée ici** : elle se dérive d'une
  mesure, et un nombre choisi au jugé dans un cadrage se recopierait tel quel ;
- **rien n'a été vérifié sur une base réelle** — `test:int` n'a pas tourné.

#### Fichiers attendus de la session de CODE, énumérés avant qu'elle commence

`apps/api/src/venues/booking-deadline.ts` (les deux constantes + en-tête amendé) ·
`apps/api/src/venues/bookings.service.ts` (import au lieu de déclaration) ·
`apps/api/test/int/bookings.int-spec.ts` (fixture dédiée + deux assertions de durée) ·
`neutralisation/neutralize-s11b.py` (deux cibles).
⛔ **En fin de lot, `git diff` ne doit contenir que ceux-là.** ⚠ Et ce lot **compte** dans les
deux/trois lots non certifiés : il touche un test et un harnais, donc il peut dégrader une porte.

---

## ~~PROCHAIN LOT~~ — rang 9 · **CERTIFICATION** · ⛔ **CLOS : D283**

⛔ **TITRE BARRÉ LE 10/09/2026 (D284), PATRON DE D273** — « `## ~~PROCHAIN LOT~~ … ⛔ FAIT` »,
six cents lignes plus bas. Ce bloc a porté le titre « PROCHAIN LOT » pendant que son propre
corps déclarait le rang **CLOS** : une reprise à froid du 10/09 a donc lu « prochain » sur du
fait accompli. **Le corps ne bouge pas**, il reste l'état du rang 9 ; c'est son ÉTIQUETTE qui
mentait. ⇒ **Le point d'entrée du rang courant est désormais la section « PROCHAIN LOT —
rang 10 », juste au-dessus.**

⛔ **OUVERT ET EXÉCUTÉ LE 09/09/2026, DANS LA SESSION QUI L'A INSCRIT AU PLAN.** Ce rang
n'existait pas : voir le rang 9 de l'ordre (section D270) pour la règle qui l'impose et
pour la mesure qui a montré son absence.
⇒ **QUEL lot : rang 9 de l'ordre des rangs. OÙ IL EN EST : ici.** C'est la séparation des
deux questions posée par D283 ; ce bloc ne redit pas ce qui l'impose, il dit son état.

### ⛔ LE CRITÈRE DU RANG 9 — ÉCRIT AVANT DE MESURER, ET IL PORTE SA RÉSOLUTION EN CLAIR

Reprise du critère du rang 7, **fixé par Ko le 04/09/2026 avant de mesurer** pour la raison
qui vaut partout ici : un critère choisi APRÈS les résultats ne mesure plus rien.

1. **Les six portes + la suite e2e + les campagnes de neutralisation, en UNE SEULE passe,
   sur un arbre qui ne bouge pas.** Des portes vertes relevées à des moments différents, sur
   un arbre qui change entre elles, ne certifient rien ensemble (D218).
2. **Porte verte AU REPOS**, avec l'**état machine ET son INVENTAIRE NOMMÉ** relevés devant
   **chaque** mesure — ce qui tourne, pas seulement RAM libre, CPU et compte de node.
3. ⛔ **LA RÉSOLUTION DU `--tout`, ÉCRITE ICI PARCE QU'UN CRITÈRE QUI SE CORRIGE AILLEURS
   COÛTE LE MÊME DÉTOUR À CHAQUE LECTEUR FROID.** `lancer-campagnes.py --tout` **sort en 1**
   par le défaut d'outillage `[INFRA][P1]` déjà au backlog : le tri **ne joue pas** les
   cibles gardées derrière `--int`, et les rend « non mesurées ». ⇒ **Ces cibles se jouent
   SÉPARÉMENT avec `--int`, et c'est le TOTAL mordues / muettes qui certifie**, pas le code
   de sortie du tri.
   ⚠ **Précédent exact, et il est ce qui rend cette clause légitime** : à D275, `--tout` a
   rendu **1** (173 mordues · 0 muette · 9 non mesurées), les neuf ont été jouées avec
   `--int` ⇒ **182 sur 182, zéro muette**, et la certification a été prise sur ce total.
   ⛔ **CE QUE ÇA A COÛTÉ TANT QUE C'ÉTAIT AILLEURS** : la reprise à froid du 09/09 a lu
   « en UNE SEULE passe » au rang 7, mesuré que le tri sort en 1, et **conclu « certification
   bloquée »** — avant d'ouvrir la section D275 pour se corriger. Le critère était
   insatisfiable **tel qu'écrit**, et sa résolution ne vivait que dans un compte rendu de
   session.
4. **La marque nomme les lots, et rien d'autre** : « portes vertes au repos à cette date,
   tels lots en font partie ». ⛔ **Aucun en-tête antérieur n'est réécrit en « certifié »** —
   ce serait la certification par procuration que le rang 7 refuse depuis D270.
5. **Les deux réserves de D275 se reconduisent ou se lèvent EXPLICITEMENT, avec leur
   motif** — elles ne s'éteignent pas en ayant été écrites une fois.
6. ⛔ **LE RÉGIME D'ALIMENTATION EST RELEVÉ ET STABLE SUR TOUTE LA FENÊTRE — CINQUIÈME
   QUANTITÉ, AJOUTÉE LE 10/09/2026 (D283).** Elle rejoint les quatre autres (RAM libre ·
   node · CPU · inventaire nommé) et se relève avec elles. ⚠ **Ce n'est pas « la source »,
   c'est la source ET LE MODE D'ALIMENTATION ACTIF** : sur Windows, un mode bridé peut
   survivre au rebranchement tant que la charge est basse. **Rebrancher n'est pas être au
   régime secteur.**
7. ⛔ **LES RELEVÉS SONT PÉRIODIQUES PENDANT LA FENÊTRE, dans un journal à part** — pas
   seulement à ses deux extrémités. « La machine a tenu pendant la mesure » devient une
   **mesure**, et cesse d'être une **inférence entre deux bouts**.

#### ⛔ LE MOTIF DES POINTS 6 ET 7, ET IL EST MESURÉ — LA NUIT DU 09 AU 10/09/2026

**Les quatre quantités sont restées NOMINALES pendant que la passe ne mesurait plus rien.**
Relevé au journal d'événements Windows, pas déduit :

| moment | fait |
|---|---|
| 09/09 **20:44:41** | bascule sur **BATTERIE** — au milieu de la porte `test:int`, qui enjambe l'instant |
| 20:44 → 10:22 | **toute la suite de la passe** en régime batterie : e2e, les deux passes de campagnes, les cibles `--int` |
| 10/09 **02:22:11** | `Critical Battery Trigger Met`, puis `The system is entering sleep` |
| 02:22 → **10:22:30** | **huit heures de VEILLE**. Le rejeu des campagnes affiche 32 168 s au chronomètre pour ~50 min de travail |
| 10:22:30 | `Power source change` — et `neutralize-s9.py.log` s'écrit **21 s plus tard** |

⛔ **CE QUE LA BARRE A LAISSÉ PASSER** : pendant ces heures, RAM libre **au-dessus** de la
barre, `node` 0, `chrome` 0, CPU nominal, inventaire propre. **La porte dure a été TENUE et
elle n'a RIEN VU** — parce que la grandeur qui gouvernait les durées n'était dans **aucun**
instrument du dépôt.
⚠ **Et la distinction entre les deux points neufs est le cœur de la leçon** : des relevés
périodiques (point 7) auraient vu le **trou de huit heures** ; **aucun d'eux n'aurait vu la
bascule** de 20:44 (point 6). Il fallait les deux, et le second manquait à l'instrument.
⚠ **La localisation du trou n'a pas été devinée** : elle vient des dates de modification des
journaux par campagne — 21 campagnes en 42 min, **+481 min sur `neutralize-s9`**, puis 5
campagnes en 2 min 30. Un chronomètre global aurait rendu « 8 h 56 » et n'aurait rien appris.

⇒ **RÉSULTAT INDÉPENDANT DU VERDICT, ET IL SE GARDE** : les deux fenêtres — l'une finissant
hors repos, l'autre coupée par huit heures de veille — rendent le **MÊME 182 mordues**.
**Les comptes de gardes sont stables ; c'est le RÉGIME DE MESURE qui ne l'est pas.** C'est ce
qui autorise à traiter le régime comme le défaut, plutôt que de soupçonner les gardes.

#### ⛔ LA BARRE D'ÉTAT MACHINE : PORTE DURE POUR UNE CERTIFICATION — réponse au `[MÉTHODE][P0]` (arbitrage de Ko, 09/09/2026)

**La question était ouverte et elle est tranchée** : la barre de **4 579 Mo de RAM libre**
(cadrage D273) est une **PORTE DURE pour une certification** — et une **ANNOTATION** partout
ailleurs, sur les durées et l'intermittence, **jamais sur un verdict**.
⛔ **LE MOTIF, EN UNE PHRASE DE KO** : si « au repos » se franchit sur ordre, **le mot ne
certifie plus rien.**
⚠ **SA DÉMONSTRATION EST DANS LA SESSION QUI A POSÉ LA QUESTION**, et les deux faits sont
écrits côte à côte en section D282 : `test:int` **refusé à 2 926 Mo** (arrêt franc, demande
à Ko), puis **toutes les portes lancées à 2 607 Mo** — plus bas encore — sur ordre, verdicts
retenus et durées explicitement écartées. Les deux gestes étaient défendables ; **mis bout à
bout ils laissaient une barre qu'on franchit sans qu'aucune règle ne dise quand**, et une
barre franchie au jugé cesse de mesurer.
⇒ **CE QUE LA DISTINCTION ACHÈTE, ET C'EST POURQUOI ELLE N'EST PAS UN COMPROMIS** : sous la
barre, un **verdict déterministe** (un code de sortie, un `23514`, une garde qui mord) reste
valide et se lance ; ce qui tombe est le droit d'en tirer une **durée**, une
**intermittence** ou une **certification**. D282 avait raison de lancer ; il ne pouvait pas
certifier. **Le rang 9, lui, ne se lance pas sous la barre.**
⛔ **ET SI LE PLANCHER RESTE SOUS 4 579 APRÈS FERMETURE DE `chrome` : LA SORTIE EST DÉJÀ
ÉCRITE, ON N'EN BRICOLE PAS UNE AUTRE.** D270 l'a posée — **relever le plancher que cette
session PEUT produire, puis redéfinir « repos » sur lui AVEC SA RAISON**, les chiffres
hérités restant comme HISTOIRE et non comme barre. ⚠ Et redéfinir le seuil sans redéfinir ce
qu'il garantit serait la moitié du travail : une passe prise près du bruit porte moins
d'information qu'une passe prise loin de lui.

### État du rang 9 — ✅ **MARQUE POSÉE LE 10/09/2026 (D283)**

⛔ **CE QUI EST ÉCRIT, MOT POUR MOT** : « **portes vertes AU REPOS le 10/09/2026, et D279 et
D282 en font partie** ». Deux lots, **et rien d'autre**. Les en-têtes de ces deux sections ne
sont **pas** réécrits en « certifié » — ce serait la certification par procuration que le
rang 7 refuse depuis D270. La marque est ici, datée, et **elle ne se reconduit pas au lot
suivant**.
⚠ **Ce qu'elle n'a pas joué est nommé** : `a5-cold-reload-vs-spa.e2e.ts:190`, ignorée avec
son motif (« nécessite une salle de fixture : à brancher avec T2 »).
⚠ **Les deux réserves de D275 sont RECONDUITES, aucune n'est levée.** La n°2 en particulier :
la sonde d'état machine **vit toujours dans le scratchpad** — et la nuit du 09→10/09 vient de
montrer ce que ça coûte, puisque l'instrument qui a raté la cause était précisément un
instrument hors dépôt, non relu, non versionné.
⇒ **Le rang 9 est CLOS.** Chiffres, régime et méthode : section **D283**. Le rang 8 reste
ouvert sur son seul reliquat — la dérive de somme de contrôle `_prisma_migrations`, arbitrage
non tranché.

## RANG 8 — S11-b · **point d'entrée CONSERVÉ** ⛔ **CHEMIN DE L'ARGENT**

⛔ **CE N'EST PLUS LE RANG COURANT depuis le 09/09/2026 (D283)** — ~~c'est le rang 9,
CERTIFICATION~~ ⛔ **BARRÉ LE 10/09/2026 (D284) : le rang 9 est clos, le rang courant est le
10.** ⚠ **Le numéro est barré, pas rafraîchi** — un numéro de rang recopié dans le bloc d'un
AUTRE rang est un compteur figé, et celui-ci a vécu un jour. **Où se lit le rang courant :
l'ordre des rangs, nulle part ailleurs.** Ce qui reste vrai sans date, et qui est le POINT de
la phrase : **ce bloc n'est pas ce qui vient ensuite.**
Ce bloc reste **entier et à sa place** : ses six étapes sont faites,
~~**le lot n'est pas certifié**~~ — ⛔ **BARRÉ LE 10/09/2026 : la marque du rang 9 (D283)
nomme D279 ET D282**, c'est-à-dire les deux lots de code de ce rang. La phrase était vraie
jusqu'au matin du 10/09. ⚠ **Et l'en-tête de ce bloc n'est PAS réécrit en « certifié »** : la
marque vit en section D283, datée, et ne se reconduit pas — c'est la certification par
procuration que le rang 7 refuse depuis D270. Ce qui reste vrai : **le rang n'est pas CLOS**,
il garde son reliquat d'arbitrage. Son cadrage — donc **la liste de ses modes de défaillance** —
doit rester consultable (D277 : un cadrage retiré après validation ne peut plus démentir
personne). ⚠ **Ne pas le lire comme « ce qui vient ensuite ».**

⛔ **OUVERT LE 07/09/2026 PAR D276**, quand la consigne « aucun lot de produit ne s'ouvre
avant que la porte soit verte » a été levée par la certification D275. ⚠ **Cette section
est un POINT D'ENTRÉE, pas un cadrage.** ~~Le cadrage de S11-b **n'existe pas** : il est le
**premier livrable** de la session qui ouvrira ce lot, pas un préalable qu'elle
trouverait écrit.~~
⛔ **BARRÉ LE 08/09/2026 (D280)** : le cadrage **existe**, il a été écrit le 08/09 et il est
**dans ce fichier**, section « ⛔ CADRAGE DE S11-b », une centaine de lignes plus bas. La
phrase était exacte quand elle a été écrite le 07/09 et fausse le lendemain matin ; elle est
restée en tête du bloc qu'une reprise lit EN PREMIER pour ce lot. ⚠ Le reste de la phrase
tient : cette section est bien un point d'entrée, pas le cadrage.

### ⛔ AVANCEMENT DU RANG 8 — étapes 1→3 sur 6 FAITES ET MESURÉES (08/09/2026, D279)

⛔ **CE LOT EST OUVERT ET À MI-PARCOURS.** Ce qui suit est son **point d'entrée**, pas son
état ; l'état est ici, et il tient en six lignes :

| étape | objet | état |
|---|---|---|
| 1 | le chiffrage devient un **module pur**, consommé par les DEUX chemins dès la 1ʳᵉ ligne | ✅ **D279** |
| 2 | les trois migrations de retard **appliquées, vérifiées EN BASE** par définition d'objet | ✅ **D279** |
| 3 | la confrontation **D75** devient une fonction pure du même module | ✅ **D279** |
| 4 | le **`CHECK`** d'agrégat + `migration-non-empty.int-spec.ts` **retargé sur un semis qui le VIOLE** | ✅ **D282** |
| 5 | les **deux échéances** (`expiresAt`, `paymentDueAt`), cas limites spécifiés et mesurés | ✅ **D282** |
| 6 | le **harnais**, pour sa part restante (CHECK + échéances) | ✅ **D282** |

⛔ **LES SIX ÉTAPES SONT FAITES. LE RANG 8 N'EST PAS CLOS POUR AUTANT** : ce qui reste est
ce qu'aucune étape ne portait — la dérive de somme de contrôle Prisma, en attente
d'arbitrage, et trois reports au backlog. ~~**Le lot n'est pas certifié.**~~
⛔ **BARRÉ LE 10/09/2026 (D283)** : la marque du rang 9 dit « portes vertes au repos le
10/09/2026, et **D279 et D282** en font partie ». ⚠ **Ce qui reste vrai et ne bouge pas : le
rang 8 n'est toujours pas CLOS** — la dérive de somme de contrôle `_prisma_migrations` reste
un arbitrage ouvert. **Certifié et clos ne sont pas le même mot.**
⚠ **DATATION, POUR QU'ON N'Y VOIE PAS UNE INCOHÉRENCE** : les dates portées ci-dessus sont
celles des ÉVÉNEMENTS — D278 a levé l'arrêt franc le 08/09, D279 a livré les étapes 1→3 le
08/09. La session qui écrit ces lignes est du **09/09/2026**, d'où l'horodatage
`20260909120000` de la migration. Le passage de minuit a eu lieu **pendant** la reprise à
froid, entre l'étape 0 et l'étape 2.

⇒ **LES CHIFFRES VIVENT DANS LA SECTION D279, ET NULLE PART AILLEURS** : poids du module,
poids de l'aide privée, poids de `create` avant et après, portes avec leurs durées, cibles
mordues. ⛔ **Aucun n'est recopié ici, et c'est délibéré** — un compteur posé dans le bloc
qui se lit comme l'état courant est exactement ce que D280 a dû retirer de quatre endroits.
**Ce qui est écrit ici est un RENVOI, pas une mesure.**
⚠ **L'étape 4 porte sa justification ailleurs qu'en elle-même** : c'est l'**observation** de
la cible muette de D279 — des lignes dont l'agrégat est faux SONT entrées en base, portes
vertes — et non la déduction MD2 du cadrage. **À lire avant d'écrire cette migration, et
surtout avant de la retirer.**
⚠ ~~**CE LOT N'EST PAS CERTIFIÉ.** Portes vertes **au repos le 08/09/2026** (D279) : la
marque ne se reconduit ni aux étapes 4 à 6 ni au lot suivant~~ — ⛔ **BARRÉ LE 10/09/2026
(D283)** : le rang 9 a posé une marque **« portes vertes au repos le 10/09/2026 »** qui nomme
**D279 et D282**, donc les deux lots de code de ce rang.
⚠ **Ce qui reste vrai, et c'était le POINT de la phrase barrée** : une marque **ne se
reconduit pas**. Celle du 08/09 ne couvrait pas les étapes 4 à 6 ; celle du 10/09 ne couvrira
pas le lot suivant. **Et les deux réserves de D275 restent actives** — reconduites
explicitement par D283, la n°2 en particulier : la sonde d'état machine vit toujours hors du
dépôt.

#### ⛔ POURQUOI CE BLOC EXISTE, ET LA RÈGLE QU'IL POSE (D282, 09/09/2026)

**Mesuré par une reprise RÉELLEMENT à froid** — celle que D280 avait annoncée pour
l'ouverture de l'étape 4, et qui a eu lieu : de l'ouverture de cette section à la fin du
cadrage, il y avait **zéro occurrence** de « étape », de « D279 » et du poids de sortie de
`create`, pendant que « ARRÊT FRANC ICI » y était toujours écrit sans qualification. Une
reprise qui s'arrête ici — c'est-à-dire qui **suit l'indication du fichier** — conclut
« lot arbitré, pas commencé », avec un jour et trois étapes de retard.
⛔ **ET L'INVERSION QUI REND LE POINT SÉRIEUX : `ZWADJ_BACKLOG.md`, AUTORITÉ N°3, ÉTAIT PLUS
À JOUR QUE CE BLOC** — il y est écrit que les étapes 1 à 3 sont livrées et mesurées. C'est
**D277 d'un cran retourné** : la décision a bien traversé vers les autres autorités, et elle
n'est **pas revenue** dans le bloc de lecture de la première.

⇒ **RÈGLE EXÉCUTOIRE : LE POINT D'ENTRÉE DU RANG COURANT SE RAFRAÎCHIT À LA CLÔTURE DE
TOUTE SESSION QUI LE FAIT AVANCER**, au même titre que le registre, et **jamais « au
prochain lot »**. Ce n'est pas un lot documentaire : c'est la comptabilité du rang courant à
propos du rang courant, et elle tient en un renvoi.
⚠ **Sans cette règle, ce bloc se périme à l'étape suivante**, et quelqu'un le réécrira sous
le même constat. C'est D276 — « ce qui vaut décision s'écrit dans un fichier » — appliqué à
l'endroit qui répond à *où en est-on*.

### Ce que le rang 8 recouvre
**S11-b — le chiffrage de `BookingsService`** : tarification, prestations, confrontation
à **D75**, échéance d'acompte. Il fait suite à **S11-a** (D261), qui a pris la moitié
amont.
⚠ **Repartir des mesures RÉELLES, jamais de l'estimation d'origine** : après S11-a,
`create` pèse ~~**168 lignes / 123 exécutables**~~ — et non « 200 sur 729 », qui était une
estimation de backlog. **Recompter fait partie de la reprise** (leçon S11-a).

#### ⛔ Le chiffre d'entrée de S11-b, recompté le 08/09/2026 (D277) — **avec sa définition**

`BookingsService.create` occupe les lignes **146 à 324** de
`apps/api/src/venues/bookings.service.ts`, signature et accolade fermante comprises
(le fichier en compte 720). **Trois comptes en sortent, et ils ne disent pas la même
chose** :

| compte | définition | valeur |
|---|---|---|
| lignes totales | `324 − 146 + 1` | **179** |
| lignes non vides | total moins les lignes blanches | **164** |
| ⭐ **lignes exécutables** | non vides, **hors** `//`, `/*` et `*` de continuation | **123** |

```
sed -n '146,324p' apps/api/src/venues/bookings.service.ts \
  | grep -v '^\s*$' | grep -v '^\s*//' | grep -v '^\s*\*' | grep -v '^\s*/\*' | wc -l
```

⇒ **LE CHIFFRE D'ENTRÉE EST 123 LIGNES EXÉCUTABLES**, et c'est lui qui se remesure **à la
sortie du lot**, avec la commande ci-dessus et la même définition. ⚠ Les bornes `146,324`
**se relèvent à nouveau** avant la mesure de sortie : le lot va les déplacer.

⛔ **« 168 » EST BARRÉ PARCE QU'IL NE CORRESPOND À AUCUNE DES TROIS.** Ni 179, ni 164, ni
123. Sa définition n'a jamais été écrite, donc il ne peut ni se reproduire ni se
contester — et personne ne peut plus dire ce qu'il mesurait.
⚠ **CE QUI REND LE CONSTAT SÛR PLUTÔT QU'ACCUSATEUR : l'autre moitié, elle, retombe À
L'UNITÉ PRÈS.** « 123 exécutables » est reproduit exactement, onze jours après, par une
commande écrite après coup. Ce n'est donc pas la mesure de S11-a qui était fausse : c'est
**la moitié qui n'avait pas de définition** qui est devenue inutilisable, pendant que la
moitié définie tenait. **Un chiffre sans définition ne vieillit pas, il devient muet.**
⚠ **Et c'est la moitié qui compte** : D261 exige qu'un lot de SRP se mesure AVANT et
APRÈS, **sinon il s'auto-décerne son résultat** — le premier jet de S11-a faisait
**grossir** la méthode qu'il prétendait réduire, et rien ne l'aurait dit. Un « avant »
sans définition rend cette mesure inopérante : on peut toujours trouver, après coup, une
façon de compter qui donne une baisse.

### ⛔ Ce qui ne se négocie pas
- **C'est un lot du CHEMIN DE L'ARGENT.** Les modes de défaillance s'écrivent **AVANT**
  tout code, et un mode non listé au cadrage **ne se code pas**. Arrêt franc pour
  arbitrage de Ko après le cadrage, avant la première ligne.
- **Ce qui commande le découpage, c'est OÙ LA MESURE POURRA VIVRE** (D261) :
  `BookingsService` n'a **aucune spec unitaire**, et sa seule mesure demande un
  PostgreSQL réel. Toute décision laissée dans le service est **muette par
  construction** — elles vont dans des **modules purs** (D187, motif réécrit par D192 :
  ce qui tient la règle est la **vitesse** de rejeu, pas l'exécutabilité).
- **Un lot de SRP se mesure AVANT et APRÈS, sinon il s'auto-décerne son résultat**
  (D261) : le premier jet de S11-a faisait **grossir** la méthode qu'il prétendait
  réduire, et rien ne l'aurait dit.
- **Vérifier la prémisse avant de coder la consigne** (D231) : deux points du découpage
  proposé pour S11-a se sont révélés faux à la vérification, dont un qui aurait **défait
  D63**.

### ⚠ Ce que la certification du 07/09 NE dit PAS, et qui borne ce lot
Les deux réserves de D275 sont **actives**, et elles ne s'éteignent pas en ayant été
écrites une fois :
1. **la porte n'est verte qu'AU REPOS** — rien n'est mesuré sous charge, ni pendant
   qu'une pile `dev` tourne, c'est-à-dire pendant le régime de travail ordinaire ;
2. **l'instrument d'état machine ne vit pas dans le dépôt** — `sonde-etat-machine.py`
   reste à écrire (`[INFRA][P1]`), et tant qu'elle manque, aucun relevé n'est
   reproductible ni contestable par la session suivante.
⇒ **Conséquence exécutoire** : un rouge rencontré pendant S11-b **ne se juge pas** sans
relever l'état machine devant lui (D270), et ce relevé porte **CINQ quantités** — RAM
libre · compte de node · CPU (médiane et dispersion) · **total des processus** · **leur
nombre** — puis l'inventaire nommé au-dessus du seuil.

⛔ **DÉCISION DE KO, 08/09/2026 (D277) — ON AVANCE SANS LA SONDE, ET LA RÉSERVE RESTE
ACTIVE.** Les deux ne se contredisent pas, et c'est le point : **la réserve dit ce que les
relevés ne valent pas, la décision dit qu'on paie ce prix-là** plutôt que d'ajourner le
produit. Motif écrit de Ko : *« huit rangs viennent d'être dépensés sur la mesure, et
S11-b livre du produit »*.
⇒ **CE QUI DÉCLENCHE L'ÉCRITURE DE LA SONDE EST UN CAS RÉEL, PAS UN CALENDRIER** : le
premier rouge de S11-b qui demande une attribution sérieuse. Elle s'écrit **à ce
moment-là, avec le cas sous les yeux — pas d'avance et à vide.**
⚠ **CE N'EST PAS UNE DISPENSE DE RELEVÉ.** Les cinq quantités se relèvent devant chaque
mesure, à la main, comme pour D275. Ce qui manque est l'**instrument reproductible**, pas
le relevé — et un relevé fait à la main reste une affirmation datée (D275, réserve n°1).
⚠ **Ce qu'on accepte en connaissance de cause est nommé** : la session suivante ne pourra
ni rejouer ces relevés, ni les contester, ni distinguer un écart de MACHINE d'un écart
d'INSTRUMENT. L'entrée `[INFRA][P1]` reste ouverte au backlog, elle n'est pas requalifiée.

### Défauts croisés à NE PAS corriger dans ce lot — ils sont au backlog
`--tout` qui ne joue ni ne nomme les mesures `--int` (`[INFRA][P1]`) · la sonde d'état
machine (`[INFRA][P1]`) · `venue-list.test.tsx`, documenté sans avoir été reproduit
(`[PRO][P0]`, D274 : **0 rouge sur 30**, ce qui **borne un taux et ne prouve pas un
zéro**) · `act(…)` tardif sur deux autres fichiers de la coquille (`[PRO][P0]`) ·
`QuotesSection` démontée, cinq gestes inatteignables (`[PRO][P0]`).

### ⛔ Où s'écrit le cadrage de S11-b, et il y RESTE (décision de Ko, 08/09/2026 — D277)

Le cadrage s'écrit **dans ce fichier, dans cette section, AVANT toute ligne de code** —
pas dans le chat, pas dans un message de commit, pas dans un document annexe. C'est D276
appliqué par avance au livrable qui y était le plus exposé : un cadrage est très
exactement « ce qui vaut décision ».
⛔ **ET IL Y RESTE, MÊME UNE FOIS ARBITRÉ ET VALIDÉ PAR KO** — c'est la moitié de la
consigne qu'on serait tenté de sauter. Un cadrage retiré après validation emporte avec
lui **la liste des modes de défaillance** : la session qui livrera E3d, ou un correctif
sur ce chemin, ne pourra plus vérifier qu'un mode rencontré avait été prévu. Or la règle
« **un mode de défaillance non listé au cadrage ne se code pas** » n'a de sens que si la
liste est encore là pour être consultée — sinon elle devient invérifiable, donc décorative.
⚠ Même motif que le cadrage ARCHIVÉ du rang 5, conservé sans retouche par D273 : **un
cadrage réécrit après coup ne peut plus démentir personne.**

---

## ⛔ CADRAGE DE S11-b — écrit le 08/09/2026, AVANT toute ligne de code

⛔ **CE CADRAGE NE PREND PAS DE NUMÉRO DE DÉCISION, ET C'EST VOULU.** Il ne tranche rien :
il relève l'état réel, énumère les modes de défaillance, et pose **trois points ouverts**
qui demandent l'arbitrage de Ko. **L'arbitrage prendra un numéro** ; le cadrage seul n'en
mérite pas, sans quoi le registre porterait une décision que personne n'a prise.
~~⛔ **ARRÊT FRANC ICI.** Aucune ligne de code avant la réponse de Ko aux trois points.~~
⛔ **LEVÉ LE 08/09/2026 (D278) — LES TROIS POINTS SONT ARBITRÉS**, chacun par un ✅ posé **à
l'endroit du point**, plus bas dans ce cadrage : (1) le `CHECK`, (2) le refus en 409 sans
fusion, (3) les deux échéances. L'arrêt a été demandé, tenu, et **il a produit ce pour quoi
il existait** : trois arbitrages écrits, motivés, datés. ⚠ **Barré, pas effacé** — sinon la
session qui livrera E3d lira un cadrage dont les trois points semblent avoir été tranchés
par personne.
⇒ **CE QUI NE SE LÈVE PAS AVEC LUI** : un mode de défaillance non listé à ce cadrage **ne se
code pas**, et le cadrage **reste ici** une fois validé (D277).

⚠ **ÉTAT MACHINE RELEVÉ AVANT TOUTE MESURE (D270), et il INTERDIT les mesures de porte** :
RAM libre **médiane 3 304 Mo** (6 relevés sur 60 s, bande 3 299–3 360) · **node 0** · CPU
médiane **4 %** (bande 2–5) · total **14 411 Mo** sur **348 processus**. Inventaire au-dessus
de 100 Mo : chrome 18 proc / 2 851 Mo · Code 21 / 2 584 · svchost 99 / 1 233 · Memory
Compression 1 142 · vmmemWSL 482 · claude 334 · msedgewebview2 325 · explorer 289 · msedge
259 · powershell 244 · le reste sous 200.
⛔ **3 304 Mo contre une barre D273 à 4 579 : la machine n'est PAS au repos** — Chrome est
ouvert, il pèse le premier poste. **Aucune passe de portes n'a donc été lancée**, et aucun
chiffre de suite n'est produit par ce cadrage. Il n'en avait pas besoin : **il LIT**. Les
seules mesures prises sont des lectures de fichiers et des comptes de lignes, insensibles
à la charge. ⚠ La certification de D275 **n'est pas reconduite** par ce cadrage.

### ⛔ LE FAIT CENTRAL, ET IL N'ÉTAIT PAS DANS LE POINT D'ENTRÉE : LE CHIFFRAGE EXISTE DEUX FOIS

Le point d'entrée du rang 8 annonce « S11-b — le chiffrage de `BookingsService` ». **Relevé
dans le code, l'objet est plus large d'un fichier.** Le même chiffrage est écrit **deux
fois, presque au mot près** :

| | `BookingsService.create` | `QuotesService` |
|---|---|---|
| jours fériés + jour calendaire | lignes **196–200** | lignes **425–429** |
| `resolveSlotPrice` | 201 | 430 |
| catalogue `findMany` + boucle `find` | 205–221 | 432–448 |
| refus « prestation absente » | `SERVICE_UNAVAILABLE` | `SERVICE_UNAVAILABLE` |
| `reduce` des lignes | 224 | 451 |
| `total = base + prestations` | 225 | 452 |
| `resolveDepositCents(venue, total)` | 228 | 468 |
| confrontation **D75** | **233–240** | ⛔ **absente** |

⚠ **Les différences sont relevées, pas supposées, et elles ne sont pas toutes des défauts** :
`quotes` lève un `ConflictException` en ligne avec une clé i18n construite par gabarit
(`service.errors.${code}`) là où `bookings` passe par deux aides privées ; `bookings`
écrit des LIGNES filles, `quotes` stocke un JSON. ⛔ **L'absence de la confrontation D75
côté devis est LÉGITIME** : un devis est chiffré par le pro, il n'y a pas d'attente client
à confronter. **Ne pas « harmoniser » ce point** — ce serait inventer une exigence.

⛔ **CE QUE ÇA COÛTE, ET C'EST LE CHEMIN DE L'ARGENT** : `AGENTS.md` dit « un seul endroit
par formule — deux formules concurrentes du même calcul finissent toujours par diverger, et
la divergence est silencieuse ». Ici, une correction portée à l'un et pas à l'autre donne
**deux totaux pour les mêmes choix** : celui d'une affaire passée en direct, et celui de la
même affaire passée par devis. ⚠ **`quote.convert` ne recalcule pas** — il **recopie** les
montants snapshotés du devis (lignes 337–340) — donc la divergence ne se rattrape à aucun
moment : elle est **gravée** dans la réservation.

⇒ **Conséquence sur le périmètre, à valider par Ko** : S11-b ne peut pas prendre « le
chiffrage de `BookingsService` » sans prendre celui de `QuotesService`. Le prendre seul
extrairait un module pur consommé par **un** appelant, en laissant la copie vivante à côté
— c'est-à-dire en produisant exactement la divergence que le lot prétend fermer.

✅ **VALIDÉ PAR KO LE 08/09/2026 (D278) — LE LOT PREND LES DEUX CHEMINS.** Motif écrit de
Ko : *« extraire le module pur pour un seul appelant en laissant la copie vivante créerait
la divergence qu'on veut fermer »*. ⇒ Le périmètre du rang 8 est **élargi de
`QuotesService`**, sur constat de code, pas sur préférence d'architecture.

### Les modes de défaillance — ⛔ ÉCRITS AVANT LE CODE, ET UN MODE NON LISTÉ NE SE CODE PAS

| # | mode | protégé aujourd'hui par | ce que S11-b en fait |
|---|---|---|---|
| MD1 | les deux chiffrages **divergent** | ⛔ **rien** — aucune garde ne les compare | un module pur unique + une garde de **source** |
| MD2 | `total ≠ base + prestations` écrit en base | ⛔ **rien en base** (voir ci-dessous) | **point ouvert n°1** |
| MD3 | un `serviceId` **en double** facturé deux fois | ⛔ **rien** : ni Zod, ni la base, ni le code | **point ouvert n°2** |
| MD4 | l'**ordre des refus** s'inverse | rien : aucune spec ne le mesure | garde sur un cas **doublement fautif** |
| MD5 | la confrontation D75 rend un 409 **sans les vrais montants** | rien en unitaire | fonction pure + spec |
| MD6 | les deux **échéances** divergent | rien : deux expressions en ligne | **point ouvert n°3** |
| MD7 | l'**écrêtage** de l'acompte se perd au déménagement | le module `deposit` et sa spec | ordre de calcul figé par la signature |
| MD8 | une prestation d'une **autre salle** est facturée | le `where venueId` — **par accident** | garde sur la CAUSE, pas sur le code d'erreur |
| MD9 | une notification tombée **défait** l'écriture | ✅ D63 + couture S6 (cibles S6-1, S6-2) | rien — déjà tenu |
| MD10 | course sur l'intention de paiement | ✅ index partiel + relecture (cibles E1→E5) | rien — **hors périmètre** |

#### ⛔ MD2 — la base garantit le DÉTAIL et **pas** l'AGRÉGAT (relevé dans la MIGRATION, pas dans `schema.prisma`)

`20260707000001_booking_constraints/migration.sql` :

- `booking_services_amounts_valid` impose **`line_total_cents = unit_price_cents × quantity`**
  — l'arithmétique d'une LIGNE est garantie par PostgreSQL ;
- `bookings_amounts_valid` impose `guests > 0`, les quatre montants `>= 0`, et
  **`deposit_cents <= total_cents`** — **mais PAS `total_cents = base_price_cents +
  services_total_cents`**, ni l'accord entre `services_total_cents` et la somme des lignes.

⚠ **L'asymétrie est le fait, pas l'absence** : le détail est prouvé par la base, l'agrégat
repose entièrement sur une addition TypeScript qu'aucune contrainte ne relit. Une erreur
d'agrégation écrit une réservation **incohérente que la base accepte**, et c'est ce montant
qui sera facturé à E3.
⛔ **POINT OUVERT n°1 — POUR KO, JE NE TRANCHE PAS.** Deux réponses défendables :
1. **ajouter le `CHECK`** — c'est une **migration**, donc un point de non-retour, écrite à
   la main (`migrate dev` est interdit), et **à éprouver sur une base NON vide** (D123) :
   une ligne existante qui ne passe pas le `CHECK` fait échouer le déploiement, et rien
   dans `test:int` ne le verrait puisqu'il rejoue tout sur du vide ;
2. **l'assumer comme garantie APPLICATIVE documentée**, avec le précédent déjà écrit dans
   `AGENTS.md` — la correspondance `Service.pricingType` ↔ `ServicePricing`, « exception
   consciente et documentée à *garanti par la BDD* ».
⚠ **Ce que je peux dire sans arbitrage** : si c'est (2), alors le module pur devient la
**seule** autorité sur cette identité, et sa spec doit la mesurer explicitement — pas comme
effet de bord d'un cas nominal.

✅ **ARBITRÉ PAR KO LE 08/09/2026 (D278) — RÉPONSE (1), LE `CHECK`.** Motif écrit de Ko :
*« la base garantit déjà le détail, laisser l'agrégat sans garde alors que c'est lui qui
sera facturé n'est pas tenable »*.
⛔ **AVEC UN PRÉREQUIS EXIGÉ PAR KO, ET IL A ÉTÉ EXÉCUTÉ — VOIR SA PORTÉE RÉELLE EN D278** :
mesurer sur la base réelle qu'aucune ligne existante ne viole le `CHECK` avant d'écrire la
migration, *« une migration qui échoue sur des données préexistantes est le pire endroit
pour découvrir un écart »*. **Résultat : 0 violation — sur 4 réservations, et sur un schéma
en retard de 3 migrations.** ⚠ **Ce résultat ne dédouane RIEN** : lire D278 avant de s'en
servir. La vraie garde reste `migration-non-empty.int-spec.ts`, à **retarger**.

#### ⛔ MD3 — le doublon de prestation : trois autorités consultées, aucune ne l'empêche

- **Zod** (`packages/types/src/booking.ts:135`) : `z.array(...).max(20)`. Aucune unicité.
- **La base** (`20260707000000_init`) : `booking_services` porte deux index **non uniques**
  (`booking_id`, `service_id`) et trois FK. **Aucun `UNIQUE (booking_id, service_id)`.**
- **Le code** : `for (const choice of choices)` + `catalogue.find(...)` — un choix, une
  ligne. Deux choix identiques ⇒ **deux lignes**.

⇒ Une prestation `FIXED` envoyée deux fois est **facturée deux fois**, `services_total_cents`
la compte deux fois, et l'acompte suit puisqu'il est un pourcentage du total.
⚠ **D75 NE PROTÈGE PAS DE CE CAS, et c'est le point à ne pas confondre** : elle garantit que
le client n'est jamais engagé sur un montant **qu'il n'a pas vu**. Elle ne dit rien d'un
montant qu'il **a** vu et qui est **faux** — un double envoi du front produit un
`expectedTotalCents` cohérent avec le doublon, et la confrontation passe.
⛔ **POINT OUVERT n°2 — POUR KO.** **Refuser** (409, la demande est malformée) ou **fusionner**
(une ligne, quantités additionnées) ? Les deux se défendent, et le choix **change le
contrat** : fusionner accepte silencieusement une entrée que le client n'a peut-être pas
voulue ; refuser casse un front qui enverrait légitimement deux lignes d'un même service
`PER_UNIT`. ⚠ **Aucune des deux ne se code avant réponse** — et le mode s'applique
**aussi** au devis, qui partage le schéma.

✅ **ARBITRÉ PAR KO LE 08/09/2026 (D278) — REFUS EN 409, PAS DE FUSION.** Motif écrit de
Ko : *« fusionner devine une intention qu'on n'a pas. Le refus est explicite, réparable par
le client, vérifiable »*. ⛔ **Et le MÊME contrat des deux côtés, devis compris** — sinon,
mot pour mot, *« on rouvre la divergence par un autre bord »*. ⚠ C'est un **contrat d'API
neuf** (un code de refus qui n'existait pas) : il est autorisé par cet arbitrage, et par
lui seul.

#### MD4 — l'ordre des refus est une règle métier, et il n'est mesuré nulle part

Relevé dans `create` : admission (capacité, date, horizon) → prix → **prestations**
(`SERVICE_UNAVAILABLE`) → **D75** (`BOOKING_PRICE_CHANGED`) → utilisateur disparu (401).
⇒ Une prestation retirée du catalogue rend `SERVICE_UNAVAILABLE` **avant** que le client
apprenne que le prix a bougé — c'est le bon ordre : l'envoyer rejouer un montant sur une
demande de toute façon irrecevable lui ferait faire le trajet deux fois.
⚠ **La garde se mesure sur un cas DOUBLEMENT FAUTIF** (leçon S11-a) : une demande qui
enfreint **une seule** règle est verte quel que soit l'ordre.

#### MD6 — deux échéances, la même forme, deux endroits — et l'une est sur le chemin de l'argent

- `create` ligne **253** : `expiresAt = min(now + PRO_RESPONSE_DAYS×24 h, window.startsAt)` ;
- `accept` lignes **382–384** : `paymentDueAt = min(acceptedAt + PAYMENT_WINDOW_HOURS, row.startsAt)`.

Même idiome — « une échéance, écrêtée par le début de l'événement » — écrit deux fois, avec
deux constantes différentes et **aucune spec unitaire ni d'un côté ni de l'autre**.
⛔ **`paymentDueAt` est ce sur quoi E3 décidera si un règlement arrive encore à temps.** Les
cas limites ne sont écrits nulle part : événement dans moins de 48 h ⇒ l'échéance **est** le
début de l'événement ; événement déjà commencé au moment de l'acceptation ⇒ échéance **dans
le passé**, et personne n'a écrit ce que vaut alors le bouton « payer l'acompte ».
⛔ **POINT OUVERT n°3 — POUR KO** : S11-b prend-il **les deux** échéances (un seul endroit
par formule, et le chemin de l'argent en profite), ou **s'en tient-il au chiffrage** annoncé
au rang 8 ? ⚠ **Je recommande les deux**, mais c'est un **élargissement du périmètre
annoncé**, donc pas mon appel : le dépôt punit le refactoring opportuniste autant que la
formule dupliquée.

✅ **ARBITRÉ PAR KO LE 08/09/2026 (D278) — LES DEUX ÉCHÉANCES.** Motif écrit de Ko :
*« `paymentDueAt` décide si un règlement arrive à temps, et ses cas limites ne sont écrits
nulle part. Un lot du chemin du prix qui la laisse non spécifiée serait à rouvrir tout de
suite »*. ⇒ Les cas limites nommés au cadrage — événement à moins de 48 h, événement déjà
commencé — **doivent être spécifiés et mesurés**, pas seulement déplacés.

#### MD8 — le bon refus, obtenu par la bonne raison ? Non : par une absence

`create` lit le catalogue avec `where: { venueId: venue.id, id: { in: [...] } }`, puis
apparie par `find`. Une prestation appartenant à une **autre salle** n'est donc pas
ramenée, `find` rend `undefined`, et le refus tombe en `SERVICE_UNAVAILABLE`.
⚠ **Le résultat est correct ; le mécanisme est un effet de bord.** Il n'existe **aucun
contrôle de propriété** : le jour où le `where` perdrait `venueId` — une pagination, une
mise en cache, une « simplification » — la prestation d'une autre salle serait **facturée**,
et **aucun test ne rougirait**, puisque le code d'erreur qu'ils vérifient existe toujours
pour le cas « id inconnu ». ⇒ La garde de S11-b mesure **la cause** : un id valide,
appartenant à une **autre salle**, doit être refusé — cas que le module pur peut recevoir
directement.

### Ce que les neuf cibles `--int` disent DÉJÀ protégé sur ce chemin

Lues, pas supposées — `neutralize-e3d1-s8.py` (E1→E5) et `neutralize-solid-s6.py` (S6-3→S6-6) :

| cible | ce qu'elle tient |
|---|---|
| E1 | `payments_one_pending_per_booking` est **UNIQUE** et partiel : la base refuse deux intentions en attente |
| E2 | le nettoyage préalable de la migration départage par `(created_at, id)` — trois `PENDING` à la même microseconde ne bloquent pas le déploiement |
| E3 | le prédicat reconnaît **P2002** — sans lui, le perdant renvoie une erreur Prisma au visiteur |
| E4 | **le perdant RELIT et rend l'intention gagnante** au lieu de propager le conflit |
| E5 | le `return await` garde la promesse **dans** le `try` — sans lui le `catch` ne sert plus à rien |
| S6-3 / S6-4 | les abonnements « demande reçue » et « acceptée » sont réellement branchés |
| S6-5 / S6-6 | `visit.booked` a bien **deux** abonnés, et leur **ordre** est mesuré |
| S6-1 / S6-2 | la couture **n'a pas le droit de lever** (D63) et **attend** ses handlers |

⛔ **CE QU'ELLES NE DISENT PAS, ET C'EST LE PÉRIMÈTRE DE S11-b** : elles protègent
l'**intention de paiement** et l'**acheminement des notifications**. **Aucune ne regarde le
MONTANT.** Le chiffrage — ce que le client doit, ce que l'acompte vaut, ce que la base
enregistre — n'est mesuré aujourd'hui que par des specs d'**intégration**, contre un
PostgreSQL réel, à la porte lourde. C'est exactement la situation que D261 a nommée : les
décisions vivent là où la mesure est lente, donc rare, donc tardive.

### Découpage proposé — ⚠ ce qui le commande est OÙ LA MESURE POURRA VIVRE (D261)

1. **`booking-charge.ts`** — module **pur**, sans Prisma, sans Nest. Il reçoit le catalogue
   **déjà lu**, les choix, le nombre d'invités, le prix de base **déjà résolu** et la
   politique d'acompte ; il rend un **résultat discriminé** :
   `{ ok: true, basePriceCents, servicesTotalCents, totalCents, depositCents, lines }` ou
   `{ ok: false, code }`.
   ⛔ **Il ne lève pas** : même idiome que `booking-admission` et `booking-locks`, qui rendent
   un verdict que le service traduit en HTTP. Les codes applicatifs et les clés i18n ne
   descendent pas dans un module de calcul.
2. **`booking-charge.spec.ts`** — la spec unitaire qui n'existe pas aujourd'hui. Elle se
   rejoue en millisecondes, sans base, sans client généré, sans amorçage Nest : c'est ce qui
   permet de la **neutraliser à chaque passage** (D187, motif réécrit par D192).
3. **La confrontation D75** devient une fonction pure du même module, rendant l'écart **avec
   les montants réels** — c'est ce que le 409 doit porter.
4. **Les deux services appellent le même module.** `create` garde : lire la salle, lire les
   fériés, lire le catalogue, écrire, publier. `QuotesService` garde les siennes.
5. **Une garde de SOURCE** interdit la réapparition d'une seconde formule : ni
   `reduce((sum` ni `basePriceCents + servicesTotalCents` ne doivent revenir dans les deux
   services. ⚠ Elle cherche **l'identifiant**, pas l'appel (leçon S10b), et le commentaire
   qui l'explique **n'épelle pas** le jeton interdit (leçon S11-a).
6. **`neutralize-s11b.py`** — nommé ainsi, sinon `lancer-campagnes.py` ne le découvrira
   jamais (D272). Chaque cible **désigne son fichier de mesure**, et l'on se demande, cible
   par cible : *par quel chemin cette mesure voit-elle la mutation ?*

### Ce qui se MESURE avant et après — sinon le lot s'auto-décerne son résultat (D261)

| quantité | entrée (08/09/2026) | définition |
|---|---|---|
| `BookingsService.create` | **123 lignes exécutables** | lignes 146–324, non vides, hors commentaires — commande écrite en tête de section |
| `QuotesService` (fichier) | **546 lignes** | `wc -l` |
| specs unitaires du chiffrage | **0** | aucune spec ne monte `BookingsService` |

⚠ **Les bornes `146,324` se relèvent à nouveau à la sortie** : le lot va les déplacer.
⚠ **Un compteur de tests qui MONTE n'est pas la preuve du lot** : ce qui se mesure est le
nombre de décisions qui ont quitté un endroit non mesurable pour un endroit mesurable.

### ⛔ Ce qui NE se code PAS dans ce lot

- **Aucun changement de comportement.** Un montant qui change en sortie de S11-b est un
  **défaut du lot**, pas une amélioration — sauf sur les points 1, 2 et 3 si Ko les tranche
  en ce sens, auquel cas c'est écrit, numéroté, et mesuré avant/après.
- **Aucun contrat d'API neuf** (arrêt et demande — `AGENTS.md`).
- **Aucune migration**, sauf arbitrage explicite du point ouvert n°1.
- **Rien sur E3** : la course d'intention de paiement, le webhook, la bascule `CONFIRMED`.
- Les **défauts croisés** listés plus haut restent au backlog.

### ⚠ Ce que ce cadrage n'a PAS mesuré, et qu'il ne faut pas lire comme vert

- **Aucune porte n'a été lancée** — la machine était sous la barre (état relevé ci-dessus).
- **Aucune campagne de neutralisation n'a été jouée**, ni au repos ni sous charge.
- La liste des modes de défaillance est **relevée dans le code, la migration et le schéma
  Zod du jour**. Elle ne prétend pas être exhaustive — elle prétend être **vérifiable** :
  chaque ligne porte le fichier et les numéros où elle se contrôle.

---

⚠ **Le cadrage ARCHIVÉ du rang 5 suit immédiatement ci-dessous**, conservé sans retouche
par D273. **Ce n'est pas le prochain lot : c'est l'histoire d'un lot fait**, gardée parce
qu'un cadrage réécrit après coup ne peut plus démentir personne.

## ~~PROCHAIN LOT~~ — `act(...)` tardif dans `walkin-journey` · ⛔ **FAIT : D273**

⛔ **CE CADRAGE A ÉTÉ EXÉCUTÉ LE 02/09/2026 — voir la section D273 plus bas.** Il est
conservé tel quel, sans retouche, parce qu'il est ce à quoi le lot doit être confronté :
un cadrage réécrit après coup ne peut plus démentir personne. **Deux points sur
lesquels il s'est révélé juste**, et un sur lequel la mesure l'a corrigé, sont relevés
dans D273 — dont son avertissement sur `VenueCalendar`, qui a effectivement demandé un
traitement à part.
⚠ **Ce qui suit décrit donc l'ÉTAT AU MOMENT DU CADRAGE, pas l'état courant.** Le
plafond de 293 n'existe plus, le fichier est sorti de `PLAFONDS`, et le compte est à
zéro. ⛔ **Le barème fixé plus bas n'a PAS été tenu** : D273 dit lequel de ses termes,
et pourquoi.

### Ce qui tient encore la porte, mesuré

La porte racine sort en **0 au repos** (état relevé : RAM libre 4 579 Mo, CPU 6 %,
zéro node). **Sous charge (24 processus) elle sort en 1** — et ce n'est ni argon2 ni
sharp :
- api 640/640 · api-client 36/36 · client 287/287 · **pro : 347 tests passés sur 347** ;
- **c'est le FICHIER qui tombe, pas un test** :
  `295 avertissement(s) dans « walkin-journey.test.tsx », plafond 293`.

Le compte FLOTTE : **293 · 293 · 293** au repos, **294** sous charge, **295** dans la
porte complète. Le plafond gelé vaut 293 — **zéro marge**.

### ⛔ LE RELEVÉ QUI DÉCIDE DU LOT : 293 sur 293 sont des `act(...)`

| Composant émetteur | Compte |
|---|---|
| **`VenueCalendar`** | **171** |
| `AuthProvider` | 82 |
| `WalkinJourney` | 40 |
| **total** | **293** |

Aucun autre `Warning:` React, aucun `Not implemented`, aucun bruit réseau. **C'est
intégralement la famille corrigée par D269** — des mises à jour qui tombent après la
fin du test. `AuthProvider` est monté **transitivement** par `AppProviders`, le cas
exact que D269 décrit et qu'un grep du fichier de test ne voit pas.

⛔ **DONC : `walkin-journey.test.tsx` SORT DE `PLAFONDS`, il n'y monte pas d'un cran.**
⚠ **J'avais proposé de relever le plafond de 293, et Ko a refusé — à raison.** Mon
argument était qu'un `testTimeout` borne une durée « qui dit quelque chose du code »
tandis qu'un compte d'avertissements serait du bruit inerte. **Le relevé le réfute** :
ces 293 ne sont pas du bruit, ce sont 293 occurrences du défaut. Relever aurait fait
pour ce fichier ce que le dépôt a refusé pour `services-section` et `slots-section`
trois jours plus tôt — et ce refus avait produit un correctif durable.
⚠ **Et cela vaut aussi pour la certification** : quatre lots attendent une
certification qui doit vouloir dire quelque chose. La rendre verte par un plafond
relevé, ce serait certifier sous une pièce qu'on sait masquante.

### Les idiomes, RELEVÉS du dépôt et non inventés

- **Disparition du texte de chargement** — `blocks-section.test.tsx` :
  `await waitFor(() => expect(section().textContent).not.toContain("Chargement"))`.
- **File de microtâches vidée DANS `act`** — `a3-unexpected-responses.test.tsx` :
  seul moyen d'attendre un composant qui ne rend rien d'observable.

⛔ **Le piège que D269 a payé, désormais écrit dans `test-setup.ts`** : une attente
interroge un **nœud déjà tenu**, jamais un rôle par nom — `waitFor` recalculant
`getByRole(…, { name })` parcourt tout le sous-arbre à chaque tour, et le premier
correctif de D269 est passé de 8 à **48 délais dépassés** avant d'être repris.

### ⛔ BARÈME DE SORTIE DE `PLAFONDS`, FIXÉ AVANT DE MESURER

**CINQ passes à zéro au repos, DEUX sous charge, état machine relevé à chaque fois.**
L'entrée ne se retire pas avant.
⚠ **Le barème est fixé maintenant, et c'est tout l'intérêt** : « plusieurs passes,
dont une sous charge » se serait choisi APRÈS coup, en regardant les résultats — ce
n'est plus une mesure. Ce dépôt a déjà payé **deux fois** une conclusion tirée sur
deux passes (D270 sur le mode d'exécution, D271 sur la borne `maxWorkers`).
⚠ Sortir de `PLAFONDS` est un aller sans retour mesuré : le fichier tombe ensuite au
**premier** avertissement. C'est l'objectif, et c'est aussi le risque — un
avertissement intermittent rendrait la porte rouge par intermittence.

### ⚠ ATTENTION PARTICULIÈRE : `VenueCalendar`, 171 sur 293

Plus de la moitié du total, et **un composant que D269 n'a jamais traité** — il n'a vu
que `BlocksSection` et `ProVenuesProvider`. **Ne pas présumer qu'il tombe du même
geste que `AuthProvider`.**
⇒ **Mesurer le compte APRÈS CHAQUE COMPOSANT**, pas seulement à la fin. Si l'un
résiste, **le dire** : un reliquat plafonné annulerait tout le lot, qui n'a
précisément d'objet que parce qu'on refuse le plafond.

### Volet indépendant, à garder quoi qu'il arrive

`test-setup.ts` dit « on garde le MAXIMUM de trois relevés » **sans dire dans quelles
conditions**. Mesuré : un maximum relevé au repos (293) ne borne pas un compte qui
monte sous charge (295). La règle se corrige, indépendamment du reste — sinon le
prochain plafond gelé aura le même défaut.

### Fichiers attendus, énumérés avant d'écrire

`apps/pro/src/dashboard/walkin-journey.test.tsx` · `apps/pro/src/test-setup.ts`
(retrait de l'entrée `PLAFONDS` + correction de la règle) · un harnais
`neutralisation/neutralize-*.py` · `ZWADJ_CONTINUITE.md` · `ZWADJ_BACKLOG.md`.
⛔ **Aucun composant de production n'est touché.**
⚠ Le harnais **doit** se nommer `neutralize-*.py`, sinon le tri ne le jouera jamais.

## Session du 10/09/2026 — D284 · rang 10 ouvert, cadrage seul, et la règle qui ferme la CLASSE

⛔ **Numéro pris en LISANT le registre de ce fichier** : la dernière ligne de sa table portait
**D283**.

⛔ **TROIS FICHIERS AU DIFF, ÉNUMÉRÉS AVANT ÉCRITURE** : `ZWADJ_CONTINUITE.md`, `AGENTS.md`,
`ZWADJ_BACKLOG.md`. **Aucun fichier hors `.md` d'autorité** ⇒ lot **documentaire** au sens de la
règle écrite dans `AGENTS.md` le 09/09, et **il ne compte pas** dans les deux/trois lots non
certifiés. ⚠ **Le lot de CODE du rang 10, lui, comptera** : il touchera un test et un harnais.

### ⛔ D284 — CE QUI A OUVERT CE LOT : UNE REPRISE À FROID, ET LE MÊME TROU QUE LA VEILLE

Une reprise sans état donné a suivi la route que ce fichier désigne — « l'ordre des rangs dit QUEL
lot » — et **l'ordre s'arrêtait au rang 9, clos le matin même**. Le prochain lot a dû être
**dérivé** en recoupant `AGENTS.md` (« deux tenables, trois non »), l'arbitrage « documentaire » et
une **incise** du rang 9. ⛔ **C'est le défaut d'ouverture de D283, reparu au lot suivant** — la
veille il valait « écrit nulle part », ce jour il vaut « écrit dans une incise du rang précédent ».
⇒ **CE QUE D283 A CORRIGÉ ÉTAIT L'INSTANCE : il a inscrit le rang 9. Un rang inscrit se referme.**
La classe se ferme par une règle, et elle est écrite dans `AGENTS.md` ce jour : **UN RANG CLOS
LAISSE UN ÉTAT NOMMÉ, JAMAIS UNE ABSENCE.** Si le rang suivant n'est pas arbitré, l'ordre écrit
qu'il est **attendu** — la session n'arbitre pas l'ordre, quatre écritures, toutes de Ko.
⚠ **La règle est appliquée à elle-même dans le même commit** : l'ordre porte désormais, sous le
rang 10, « **RANG SUIVANT : EN ATTENTE D'ARBITRAGE DE KO** ». Écrire la règle et laisser l'absence
qu'elle interdit aurait été le report d'écriture que D283 a dû annuler.

### ⛔ D284 — CE QUE LA REPRISE A RAPPORTÉ EN PLUS, ET QUI N'ÉTAIT DEMANDÉ NULLE PART

Deux affirmations de fichier d'autorité, contredites par le dépôt, **barrées avec leur motif** :

| # | où | ce qui disait faux |
|---|---|---|
| 1 | `CONTINUITE`, titre l. 485 | « **PROCHAIN LOT** — rang 9 » sur un rang que son propre corps déclarait **CLOS** |
| 2 | `CONTINUITE`, ordre, rang 9 | « **RANG COURANT depuis le 09/09/2026** » — il l'était, il ne l'est plus |
| 3 | `CONTINUITE`, bloc rang 8 | « ce n'est plus le rang courant — **c'est le rang 9** » : un numéro d'un AUTRE rang, périmé en un jour |

⚠ **Les deux premiers avaient leur patron DANS le fichier** : le titre de D273 est barré
`## ~~PROCHAIN LOT~~ … ⛔ FAIT`, et le « RANG COURANT » du rang 8 a été barré le 09/09. **Le geste
était connu, il n'avait simplement pas été fait sur le rang qui venait de se clore** — d'où la
règle exécutoire de D282, étendue : la clôture d'un rang est une écriture, pas un constat.

### D284 — le cadrage, en une phrase et un renvoi

**Rendre visible l'interversion de `PRO_RESPONSE_DAYS` et `PAYMENT_WINDOW_HOURS`.** Six modes de
défaillance écrits avant toute ligne de code, deux cibles de neutralisation nommées d'avance, un
point d'arbitrage soulevé et non tranché.
⇒ **Il vit en tête de ce fichier, section « PROCHAIN LOT — rang 10 », et il y RESTE après
validation** (D277 : un cadrage retiré ne peut plus démentir personne). **Aucun chiffre n'est
recopié ici.**

### ⛔ D284 — TROIS FAITS DU CADRAGE QUI N'ÉTAIENT NI AU BACKLOG NI DANS LA CONSIGNE

1. ⛔ **LA GARDE À ÉCRIRE PORTERAIT UNE DATE DE PÉREMPTION.** `bookings.int-spec.ts:32` porte
   `EVENT_DATE = "2027-08-15"`, date calendaire figée. Elle satisfait la condition de Ko
   (« `startsAt` au-delà des deux fenêtres ») **aujourd'hui, par accident du calendrier**, et cesse
   de la satisfaire le **08/08/2027**. ⇒ La fixture **dérive** sa date des constantes, elle ne la
   choisit pas. ⚠ Et `EVENT_DATE` **ne se corrige pas en place** : `:167` et `:511` en dérivent des
   instants ISO exacts qui mesurent le créneau franchissant minuit (D55/D77). **Fixture dédiée.**
2. ⛔ **L'ÉGALITÉ EXACTE N'EST DISPONIBLE QUE D'UN CÔTÉ, ET C'EST MESURÉ.** `expiresAt` part de
   `Date.now()` (horloge Node) tandis que le seul instant de référence exposé, `createdAt`, vient
   de `@default(now())` (horloge PostgreSQL) : **deux horloges, donc assertion bornée**. À
   l'acceptation au contraire, `accepted_at` est **persistée** — égalité **exacte** possible. **Les
   deux côtés n'ont pas la même force, pour une raison écrite**, sinon la prochaine session lira la
   bornée comme un relâchement et la « corrigera » en une suite qui rougit au hasard.
3. ⛔ **LA CONSIGNE ENTRE EN COLLISION AVEC UNE PHRASE ÉCRITE DU MODULE VISÉ.**
   `booking-deadline.ts` porte en tête « **ce fichier ne déclare aucune constante de durée** », avec
   son motif. ⇒ **Le choix de Ko est retenu**, et le coût est nommé : l'en-tête s'amende dans le
   même geste, sans quoi on livre un module dont le commentaire dit l'inverse du code — **D116**.
   ⚠ Le motif du module interdit une valeur **harmonisée**, pas deux constantes nommées : c'est ce
   qui rend l'amendement honnête plutôt qu'une réécriture de convenance.

### ⛔ D284 — DEUX FAUTES DE MÉTHODE, À MON COMPTE

1. ⛔ **J'AI ANNONCÉ UN DÉCALAGE DE LIGNE QUI N'EXISTAIT PAS.** Ayant lu `:156` via `sed -n
   '150,160p'`, j'ai mal compté les lignes vides de la sortie et rapporté que le backlog était
   « décalé d'une ligne » sur `expiresAt`. **`grep -n` a tranché : `:156` et `:373` sont exacts.**
   ⚠ C'est l'extracteur non calibré de **D275**, sur moi : une sortie lue à l'œil au lieu d'être
   interrogée par un outil qui numérote. Corrigé avant toute écriture dans un fichier d'autorité.
2. ⚠ **UN HEREDOC TRONQUÉ A FAILLI ÉCRIRE UN SCRIPT INCOMPLET.** La commande portant le cadrage
   entier a dépassé la taille acceptée et s'est terminée sur `unexpected EOF`. Elle **a levé** — et
   c'est la seule raison pour laquelle elle ne compte pas comme un troisième fait : un script
   d'édition tronqué qui aurait **parsé** aurait écrit la moitié du cadrage sans le dire. ⇒ Le
   contenu est passé par des fichiers, et l'insertion a asserti ses comptes.

### ⛔ D284 — CE QUI RESTE, ET CE QUI N'EST PAS MESURÉ

1. **Le rang 10 n'a AUCUN code.** Le cadrage attend l'arbitrage de Ko ; les deux cibles sont
   **spécifiées, pas jouées**.
2. **Le reliquat du rang 8** — dérive de somme de contrôle `_prisma_migrations` — **arbitrage
   toujours ouvert**, interdit d'y toucher. **Le rang 8 reste donc CERTIFIÉ mais NON CLOS.**
3. **Les deux réserves de D275 restent actives**, reconduites par D283 et non levées ici.
4. **Aucune porte n'a été lancée** : lot documentaire, il ne peut dégrader aucune porte — c'est
   exactement le motif de l'arbitrage du 09/09 qui l'exclut du compte.

## Session des 09 et 10/09/2026 — D283 · CERTIFICATION (rang 9), et la nuit qui a fait ajouter une CINQUIÈME quantité

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D282**.

⛔ **TROIS FICHIERS AU DIFF, ÉNUMÉRÉS AVANT ÉCRITURE** : `ZWADJ_CONTINUITE.md`,
`ZWADJ_BACKLOG.md`, `AGENTS.md`. **Aucun fichier hors `.md` d'autorité** — ce lot est donc
**documentaire** au sens de la règle écrite dans `AGENTS.md` ce jour, et **ne compte pas**
dans les deux/trois lots non certifiés.

### ⛔ D283 — CE QUI A OUVERT CE RANG : LE PROCHAIN LOT N'ÉTAIT ÉCRIT NULLE PART

Une reprise **réellement à froid** a demandé « quel est le prochain lot » et a suivi la route
que ce fichier désigne. **L'ordre des rangs s'arrêtait au rang 8**, dont les six étapes
étaient faites. La réponse n'existait dans **aucun** des trois fichiers d'autorité : elle a dû
être **dérivée** en recoupant `AGENTS.md` (« deux tenables, trois non ») et un arbitrage qui
ne vivait qu'au backlog.
⇒ **C'est le premier défaut que ce lot corrige, et il est corrigé aux trois endroits qui le
portaient** : le rang 9 est inscrit dans l'ordre avec son motif ; l'arbitrage « un lot
documentaire ne compte pas » est écrit **à côté de la règle** dans `AGENTS.md` ; et le
« **et lui seul** » de la l. 25 est tombé.
⛔ **DEUX ARBITRAGES DE KO ONT ÉTÉ RENVERSÉS PAR LA MESURE, ET LES DEUX SONT BARRÉS AVEC LEUR
MOTIF** : ~~« c'est la l. 114 qui doit céder »~~ — faux, les deux pointeurs répondent à deux
questions différentes, et faire céder la 114 rétablissait la route que D282 avait mesurée
comme trompeuse ; ~~« à écrire la prochaine fois qu'on touche `AGENTS.md` »~~ — faux, un
report d'écriture sur une règle de **blocage** est un report sur la décision d'ouvrir un lot.

### ✅ D283 — LA MARQUE

**« Portes vertes AU REPOS le 10/09/2026, et D279 et D282 en font partie. »** Deux lots, et
rien d'autre. Passe complète **enchaînée sans interruption**, sur un arbre qui n'a pas bougé
d'un octet — vérifié à cinq reprises, toujours **trois fichiers documentaires** et zéro
sauvegarde de harnais résiduelle.

| mesure | code | durée | résultat | RAM devant |
|---|---|---|---|---|
| `typecheck` | 0 | 22 s | 8 projets | 5 370 |
| `lint` | 0 | 12 s | 8 projets | 5 397 |
| `test` | 0 | 58 s | **1 329 / 109** — api 659/58 · api-client 36/3 · client 287/20 · pro 347/28 | 5 393 |
| `build` | 0 | 52 s | 4 projets | 5 369 |
| `test:int` | 0 | **279 s** | **434 / 36**, `zwadj_test` réel | 5 346 |
| e2e | 0 | 127 s | **34 passés · 1 ignoré**, aucune ligne `flaky` | 5 000 |
| `lancer-campagnes --tout` | ⚠ 1 | 2 011 s | **182 mordues · 0 muette · 11 non mesurées** · 26 campagnes | 5 009 |
| `neutralize-e3d1-s8 --int` | 0 | 80 s | **8 / 8** | 4 977 |
| `neutralize-s11b --int` | 0 | 153 s | **11 / 11** | 4 892 |
| `neutralize-solid-s6 --int` | 0 | 244 s | **6 / 6** | 5 003 |

⇒ **TOTAL DES GARDES : 193 cibles · 193 mordues · 0 muette · 0 non mesurée.**
⚠ **Le `1` de `--tout` est PRÉVU par le critère, pas découvert après coup** : le tri ne joue
pas les cibles gardées derrière `--int` (défaut d'outillage `[INFRA][P1]`), elles se jouent
séparément, et **c'est le total qui certifie**. Précédent D275, désormais écrit **dans** le
critère plutôt que dans un compte rendu de session.
⚠ **Régime à chaque relevé** : `ALIM_SOURCE=SECTEUR`, `chrome`=0, `node`=0, RAM libre
**toujours au-dessus** de la barre (minimum +313 Mo). Charge batterie 91 → 100 %.

### ⛔ D283 — TROIS FENÊTRES ONT ÉTÉ REFUSÉES AVANT CELLE-LÀ, ET C'EST LE VRAI CONTENU DU LOT

**La première passe a été jouée, mesurée, et jetée. La deuxième aussi.** Aucune ne l'a été
pour un rouge : les trois refus portent sur le **régime de mesure**.

1. **Fenêtre 1** — les six portes vertes, puis `--tout` en 5 454 s avec **2 campagnes
   abandonnées au pré-vol** (`r4`, `solid-s7`). ⛔ Relevé après coup : **`chrome` était
   revenu pendant la fenêtre**. Refusé.
2. **Fenêtre 2** (rejeu de `--tout`) — **32 168 s au chronomètre**. Refusé, et la cause a été
   trouvée en LECTURE SEULE, sans tuer le processus.
3. **Fenêtre 3** — celle du tableau ci-dessus. Tenue.

⛔ **CE QUE LES DEUX ABANDONS ÉTAIENT, ET CE QU'ILS N'ÉTAIENT PAS.** Le tri les compte en
« muette(s)/erreur(s) » — **deux choses différentes dans la même colonne**. Ce n'étaient ni
des gardes muettes ni des ancres périmées : les deux campagnes ont **abandonné au pré-vol**,
sans déclarer une seule cible (`décl = —`), parce que leur suite était **déjà rouge avant
mutation**. Rejouées au repos : **2/2 et 2/2**. ⇒ **Un rouge non reproductible n'est pas un
rouge**, et « non mesuré » n'est ni « mordu » ni « muet ».
⚠ **Le pré-vol est ce qui a évité de fausses morsures** : sous contention, une cible mordrait
**par expiration** au lieu de mordre par la faute injectée — « mesure confondue » de D209, un
étage au-dessus. Les deux campagnes dont les suites s'étaient dégradées ont **refusé de
mesurer** plutôt que de rapporter du vert. **Le mécanisme a tenu.**

#### ⛔ D283 — LA CAUSE DE LA FENÊTRE 2 : HUIT HEURES DE VEILLE SUR BATTERIE CRITIQUE

**Localisée à la campagne près, par les dates de modification des journaux** — pas par
hypothèse : 21 campagnes en 42 min, **+481 min sur `neutralize-s9`**, puis 5 campagnes en
2 min 30. Un chronomètre global aurait rendu « 8 h 56 » et n'aurait **rien** appris.
Attribuée ensuite au **journal d'événements Windows**, pas au raisonnement :

```
09/09 20:44:41  bascule sur BATTERIE      (au milieu de la porte test:int, qui enjambe l'instant)
10/09 02:22:11  Critical Battery Trigger Met
10/09 02:22:15  The system is entering sleep
10/09 10:22:30  Power source change        → neutralize-s9.py.log s'écrit 21 s plus tard
```

⛔ **PENDANT CES HUIT HEURES, LES QUATRE QUANTITÉS DU RELEVÉ ÉTAIENT NOMINALES** : RAM
au-dessus de la barre, `node` 0, `chrome` 0, CPU normal, inventaire propre. **La porte dure a
été TENUE et elle n'a RIEN VU** — la grandeur qui gouvernait les durées n'était dans **aucun**
instrument du dépôt.
⇒ **D'où les points 6 et 7 du critère**, écrits **avant** de remesurer (règle du rang 7) :
la source **et le mode** d'alimentation, et des relevés **périodiques**. ⚠ Et la distinction
entre les deux est la leçon : des relevés périodiques auraient vu le **trou** ; **aucun
n'aurait vu la bascule**.

⚠ **L'EFFET, MESURÉ SUR LE MÊME ARBRE ET LA MÊME SUITE** — ce qui transforme une coïncidence
de fenêtres en grandeur :

| mesure | sur batterie | sur secteur | écart |
|---|---|---|---|
| `test:int` (434/36 dans les deux cas) | 475 s | **279 s** | **−41 %** |
| `lancer-campagnes --tout` | 5 454 s | **2 011 s** | **−63 %** |

⇒ **Le « +57 % sur `test:int` » relevé le 09/09 et déclaré inexpliqué avait une cause**, et
elle n'était dans aucun relevé : le poste était sur batterie depuis 20:44:41.

### ⛔ D283 — LE POINT 7 A MORDU À SON PREMIER USAGE, ET IL DIT AUTRE CHOSE QUE PRÉVU

104 échantillons sur 54 min, **zéro `ECHEC-INSTRUMENT`**, **aucun trou > 90 s**, `SECTEUR` et
`chrome`=0 aux 104. Mais : **RAM libre descend à 2 652 Mo, et 66 échantillons sur 104 sont
SOUS la barre.**
⛔ **Ce creux n'est PAS une contention étrangère, et la discrimination est mesurée** :

| | échantillons | RAM min | sous la barre |
|---|---|---|---|
| avec `node` en vie | 96 | 2 652 | **66** |
| machine au repos (`node`=0) | 8 | 4 887 | **0** |

**Aucun creux sous la barre n'arrive machine au repos.** Les 66 sont la consommation **des
mesures elles-mêmes** : 12 à 14 workers `node` aux creux les plus bas.
⇒ **CE QUE ÇA APPREND, ET C'EST NEUF** : **la barre mesure une réserve À VIDE, pas le régime
de travail.** La passe passe l'essentiel de son temps **sous la barre qu'elle vient de
satisfaire**. C'est exactement le mécanisme écrit dans `apps/pro/vite.config.ts` — « chaque
worker porte un environnement jsdom complet ; le défaut suit le nombre de cœurs **sans
regarder la mémoire disponible** » — et la grandeur qui décide est donc la **mémoire
disponible PAR WORKER**, que personne n'a nommée ni le 30/08 ni aujourd'hui. Rapportée.

### ⛔ D283 — UN RÉSULTAT QUI NE DÉPEND D'AUCUN VERDICT, ET QUI SE GARDE

**Trois fenêtres aux régimes opposés rendent le MÊME total de gardes** : 178 + 2 + 2 = **182**
(fenêtre 1, finissant hors repos), **182** (fenêtre 2, coupée par huit heures de veille),
**182** (fenêtre 3, au repos secteur) — plus les 11 cibles `--int` dans les trois cas.
⇒ **Les comptes de gardes sont STABLES ; c'est le RÉGIME DE MESURE qui ne l'est pas.** C'est
ce qui autorise à traiter le régime comme le défaut, plutôt qu'à soupçonner les gardes — et
c'est pourquoi ce lot n'a touché à aucune cible.

### ⛔ D283 — CINQ FAUTES DE MÉTHODE, À MON COMPTE

1. ⛔ **UN CODE 0 QUI NE MESURAIT RIEN, ET IL ÉTAIT DE MOI.** Le premier lancement de la passe
   complète est mort sur une **erreur de parse PowerShell** — et la tâche a rapporté
   « completed, exit code 0 ». Cause : `passe.ps1` portait **10 octets non-ASCII sans BOM**, et
   Windows PowerShell 5.1 lit alors le fichier en ANSI. ⚠ **C'est le pendant EN ENTRÉE du
   piège de console cp1252 de D268**, et le dépôt ne l'avait jamais nommé. ⇒ **Tout `.ps1`
   qui porte un octet non-ASCII s'écrit avec BOM**, et **le parse se contrôle AVANT de
   lancer** (`[Parser]::ParseFile`). Contrôlé sur les quatre scripts : les quatre parsent.
   ⚠ Le contrôle a découvert au passage que `etat-machine.ps1` **n'avait jamais été exécutée
   depuis sa réécriture** — elle aurait échoué pareil.
2. **Un relevé pris mais non lu.** La porte `build` a été lancée derrière un
   `Select-Object -Last 40` qui a coupé son état machine. **Porte rejouée**, relevé visible :
   un trou de relevé est ce que le critère refuse.
3. **Un extracteur de `FAIL` compté sans son contexte.** L'unique occurrence était dans le
   **nom** d'un test qui passe (« la ligne passe FAILED »). Confronté au contexte, pas au
   nombre — faux positif de D275 évité de justesse.
4. **Deux scripts d'analyse ont levé sur cp1252** faute de la reconfiguration UTF-8 que le
   dépôt impose pourtant à tout script de `neutralisation/`. Rejoués : le contrôle comptait.
5. **La première rédaction du critère n'avait pas la résolution du `--tout`.** Elle a coûté
   une conclusion fausse (« certification bloquée ») avant correction en ouvrant D275. C'est
   ce qui a fait écrire le point 3 du critère.

### ⛔ D283 — CE QUI RESTE, ET CE QUI N'EST PAS CERTIFIÉ

1. ⛔ **La dérive de somme de contrôle `_prisma_migrations` — arbitrage TOUJOURS OUVERT**,
   hors périmètre de ce rang. C'est le seul reliquat du rang 8.
2. **`[MÉTHODE][P0]` — la barre est une PORTE DURE pour une certification** (tranché par Ko
   le 09/09), et une **annotation** ailleurs. ⚠ Ce lot en a donné la démonstration : la barre
   a été **tenue sans recours** à la sortie de secours de D270, qui n'a pas servi.
3. **Trois constats de méthode rapportés au backlog, indépendants du verdict** : budgets de
   test non écrits · borne de workers appliquée à **une suite sur quatre** · source
   d'alimentation absente des relevés.
4. **Les deux réserves de D275 sont reconduites, aucune levée.**

⚠ **CE QUE LA MARQUE NE GARANTIT PAS** — inchangé depuis D275, et rappelé parce que le mot
« certifié » invite à l'oublier : rien n'est mesuré **sous charge étrangère** ; le navigateur
réel, une migration sur base non vide, la clause `WHERE` d'une réutilisation d'endpoint et un
composant jamais monté restent hors de portée de toute porte ; et **elle porte une DATE et
une LISTE**, pas un état permanent.

## Session du 09/09/2026 (S11-b, étapes 4→6) — D282 · le `CHECK` que la garde d'origine avait oublié, et deux échéances mesurées nulle part

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D281**.

⛔ **SEPT FICHIERS AU DIFF, ÉNUMÉRÉS AVANT ÉCRITURE** : `ZWADJ_CONTINUITE.md`,
`ZWADJ_BACKLOG.md`, `bookings.service.ts`, `migration-non-empty.int-spec.ts`,
`neutralize-s11b.py`, et trois neufs — `booking-deadline.ts`, `booking-deadline.spec.ts`,
`20260909120000_booking_quote_total_coherent/migration.sql`. ⚠ `quotes.service.ts` était
annoncé et n'a **pas** été touché : les deux échéances vivent uniquement dans
`BookingsService`, relevé avant d'écrire.

### ⛔ D282 — LA REPRISE À FROID ANNONCÉE PAR D280 A EU LIEU, ET ELLE A RAPPORTÉ

D280 avait écrit que le test « ce fichier suffit-il à reprendre sans Ko ? » aurait lieu à
l'ouverture de l'étape 4, en session réellement neuve. **Il a eu lieu.** Résultat, et il
n'est ni un succès ni un échec :

⇒ **Le fichier permet de reconstituer un état complet et juste — mais PAS par la route
qu'il indique.** Mesuré : entre l'ouverture de « PROCHAIN LOT » et la fin du cadrage,
**zéro occurrence** de « étape », de « D279 » et du poids de sortie de `create`, pendant que
« ARRÊT FRANC ICI » y était toujours écrit **sans qualification**. Une reprise qui suit
l'indication du fichier — le point d'entrée du rang courant — conclut « lot arbitré, pas
commencé », avec un jour et trois étapes de retard.
⛔ **ET L'INVERSION QUI REND LE POINT SÉRIEUX : `ZWADJ_BACKLOG.md`, AUTORITÉ N°3, ÉTAIT PLUS
À JOUR QUE LE BLOC DE LECTURE DE L'AUTORITÉ N°2.** C'est **D277 d'un cran retourné** : la
décision a bien traversé vers les autres fichiers, et elle n'est **pas revenue** là où on la
lit en premier.
⇒ **Remède posé, et c'est une RÈGLE, pas une correction** : *le point d'entrée du rang
courant se rafraîchit à la clôture de toute session qui le fait avancer*, au même titre que
le registre. Sans elle, ce bloc se périme à l'étape suivante et quelqu'un le réécrira sous
le même constat.

### ⛔ D282 — LE FAIT QUI COMMANDE LA MIGRATION : UNE INCOHÉRENCE INTERNE À UN SEUL FICHIER

MD2 disait « la base garantit le DÉTAIL et pas l'AGRÉGAT ». **C'est plus précis que ça, et
plus embarrassant.** Relevé dans `20260707000001_booking_constraints` :

- `bookings_amounts_valid` et `quotes_amounts_valid` — écrites **à quatre lignes d'écart**,
  contenu identique — gouvernent **déjà** les trois colonnes en cause
  (`base >= 0 AND services >= 0 AND total >= 0 AND deposit <= total`) et **omettent
  précisément** `total = base + services` ;
- et le **même fichier** écrit **deux identités arithmétiques** en `CHECK`, à une vingtaine
  de lignes de là, dans **deux contraintes de la MÊME famille de noms** : l. 203,
  `booking_services_amounts_valid` (`line_total = unit_price × quantity`), et l. 228,
  `commissions_amounts_valid` (`net = gross − incentive`).

⇒ **Sur les cinq `*_amounts_valid` du dépôt, celles qui avaient une identité à écrire l'ont
écrite ; les deux qui snapshotent un AGRÉGAT ne l'ont pas.** L'auteur savait écrire la
forme : elle était à la ligne d'à côté.
⛔ **Ce n'est donc pas « une contrainte a laissé passer », c'est une INCOHÉRENCE INTERNE À UN
SEUL FICHIER** — et c'est ce qui interdit de traiter les deux contraintes neuves de
redondance. Écrit dans la migration, pas seulement ici.

### ⛔ D282 — LE ROUGE EST VENU DE L'ABSENCE DE LA MIGRATION, ET MA PREMIÈRE FORME N'EN ÉTAIT PAS UNE

J'avais proposé de poser le prédicat du `CHECK` **à la main** sur la base semée et d'exiger
que PostgreSQL le refuse. ⛔ **Cette assertion est VERTE dès aujourd'hui, avant qu'aucune
migration n'existe** : un `ADD CONSTRAINT CHECK` sur une table portant une ligne incohérente
lève **toujours**. Elle mesure le SEMIS, pas la garantie. Corrigé par Ko, et **gardé à sa
place** comme contrôle de validité du semis — il a une vertu unique : s'il devenait
vert-muet, c'est que plus rien ne violerait, et le rouge d'à côté ne prouverait plus rien.
⇒ **La bonne assertion porte sur l'APPLICATION de la dernière migration** : sur un semis
violant, elle doit ÉCHOUER en **23514** et **NOMMER** la contrainte.

| moment | `migration-non-empty.int-spec.ts` |
|---|---|
| tel quel, avant tout retarget | **7 / 7, exit 0** — ni bloqué, ni sauté (barrage de D280 vérifié à l'exécution) |
| retargé, migration ABSENTE | ⛔ **1 rouge / 6 verts** — « la dernière migration s'est APPLIQUÉE sur une base portant une ligne incohérente » |
| après la migration | ✅ **7 / 7, exit 0** |
| sous mutation `NOT VALID` | ⛔ **1 rouge** — la garde mord |

### D282 — la migration : elle ne répare rien, et elle échoue franc

`20260909120000_booking_quote_total_coherent` pose `bookings_total_coherent` **et**
`quotes_total_coherent`. ⛔ **Aucun `UPDATE` correctif, aucun `NOT VALID`** (tranché par Ko) :
sur le chemin de l'argent, une migration qui recalcule des montants toute seule est pire que
celle qui s'arrête — c'est le sens du « EXPIRÉES, pas supprimées » d'E3d-1.
⚠ **Les DEUX tables, sur constat** : le dépôt les contraint ensemble et symétriquement
depuis sa première migration, et `Booking` porte des « snapshots copiés du devis » — le
devis est l'amont, contraindre la copie sans la source garderait le mauvais bout.
⚠ **Contrainte SÉPARÉE, pas un conjoint ajouté à `amounts_valid`** : un `23514` doit NOMMER
la faute. Fondu dans l'existante, six conditions rendraient le même nom et le diagnostic
serait perdu au moment précis où on en a besoin.

**Vérification par DÉFINITION D'OBJET, jamais par code de retour** : `pg_constraint` rend les
deux contraintes avec `convalidated = t`, `_prisma_migrations` **27 appliquées**.
**Preuve bilatérale** (D272) : un devis faux **refusé**, un décalage de +1 centime sur les
réservations **refusé**, et l'écriture cohérente **acceptée** (`UPDATE 4`).
**Compte avant application, exigé par Ko** : **0 violante sur 4 réservations, 0 sur 38
devis**, et 0 divergence `services_total_cents` ↔ somme des lignes filles. ⚠ **Les 38 devis
sont un relevé NEUF** : le prérequis de D278 n'avait porté que sur les 4 réservations.

### ⛔ D282 — LA NEUTRALISATION A TROUVÉ UN DÉFAUT QUE LE VERT CACHAIT, ET IL ÉTAIT DE MOI

Sous mutation, la campagne rendait **deux** rouges. Le second venait de mon semis : le devis
violant était un `DRAFT` sans `sent_at`, c'est-à-dire **la ligne exacte** que la garde R4 met
à jour. En réel, invisible — la migration échoue et la contrainte n'existe jamais.
⛔ **Une cible qui rend deux rouges ne dit plus lequel mesure quoi** (D209, « mesure
confondue »). Découplé, motif écrit sur place ; la cible rend désormais **un** rouge.
⚠ **Et une faute écrite de mémoire, attrapée par la base et non par moi** : `source =
'ONLINE'`. `BookingSource` vaut `CLIENT | WALK_IN` ; c'est `PaymentMethod` qui porte
`ONLINE`. Deux énumérations voisines, une seule avec ce libellé. Valeur relevée dans
`pg_enum`, et **le relevé est écrit à côté** pour qu'on ne la redevine pas.

### D282 — étape 5 : les deux échéances, et ce que le lot NE tranche pas

`booking-deadline.ts` — module **pur**, 8 lignes exécutables, `min(from + window, début de
l'événement)`. Il ne lit pas l'heure (D48), ne lève pas, ne connaît ni code applicatif ni
clé i18n : idiome de `booking-admission`, `booking-charge`, `booking-window`.
⛔ **LES DEUX CONSTANTES NE FUSIONNENT PAS, ET LE MODULE EST CONSTRUIT POUR QU'ELLES NE
PUISSENT PAS** : `PRO_RESPONSE_DAYS` (7 j) et `PAYMENT_WINDOW_HOURS` (48 h) sont deux valeurs
métier distinctes ; la durée est un **paramètre**, et ce fichier ne déclare **aucune**
constante de durée. Une garde de la spec le mesure : deux fenêtres différentes doivent rendre
un écart **exactement égal** à leur différence — un module qui ignorerait son paramètre
rendrait deux fois le même instant.
⚠ **LES DEUX CAS LIMITES SONT SPÉCIFIÉS TELS QUE LE CODE LES TRAITE, ET AUCUN N'EST CHANGÉ** :
événement à moins d'une fenêtre ⇒ l'échéance **EST** le début ; événement déjà commencé ⇒
échéance **antérieure à son propre point de départ**.
⛔ **CE QUE VAUT ALORS LE BOUTON « PAYER L'ACOMPTE » N'EST PAS TRANCHÉ ICI**, et c'est
délibéré : c'est une décision de COMPORTEMENT, rapportée au backlog `[PRODUIT][P1]`. Un lot
de SRP qui corrige un comportement en passant est le refactoring opportuniste que ce dépôt
punit.

### D282 — les mesures du lot, relevées AVANT rédaction (D261)

| quantité | entrée | sortie | définition |
|---|---|---|---|
| `create`, exécutables | **107** | **107** | bornes 148–320 puis 149–322, commande du rang 8 |
| `accept`, exécutables | **39** | **37** | bornes 374–425 puis 376–427 |
| `booking-deadline.ts` | — | **8** | module pur neuf |
| specs unitaires des échéances | ⛔ **0** | ✅ **6** | aucune n'existait, ni d'un côté ni de l'autre |
| `Math.min` dans `bookings.service.ts` | 2 | **0** | la formule a quitté le service |

⛔ **`create` N'A PAS MAIGRI, ET LE DIRE FAIT PARTIE DE LA MESURE.** L'expression y tenait
déjà sur une ligne : il n'y avait rien à y gagner, et l'appel a été écrit en une ligne
**exprès** pour ne pas la faire grossir — c'est la leçon de D279, appliquée d'avance plutôt
que découverte après. Le gain réel est ailleurs, et c'est ce que D261 demande de compter :
**deux décisions du chemin de l'argent ont quitté un endroit sans aucune mesure pour un
endroit qui se rejoue en 12 ms.**

⛔ **CE QUE KO RETIENT DU LOT, ET IL FAUT QUE ÇA SURVIVE AU FIL DE CHAT** : *« `create`
107 → 107, dit comme mesure NULLE et avec sa cause, est le vrai progrès »*. C'est le
**troisième passage** du chiffre d'entrée de D261 dans ce seul lot — S11-a l'avait vu
grossir, D279 l'avait vu ne pas maigrir, D282 le voit ne rien changer — et **la première
fois que la leçon est appliquée D'AVANCE plutôt que découverte après**. D279 avait écrit ce
corollaire pour le lot suivant : *« le chiffre d'entrée se relève AVANT, avec sa définition
écrite, et le chiffre de sortie se relève avant de rédiger la note »*. **Il a tenu**, et
c'est la première fois qu'un corollaire de ce fichier se vérifie sur le lot d'après au lieu
d'être repayé.

### D282 — portes et campagnes, avec l'état machine devant elles

⛔ **ÉTAT MACHINE : SOUS LA BARRE, ET C'EST ÉCRIT AVANT LES CHIFFRES.** RAM libre médiane
**2 607 Mo** (bande 2 562–2 639) contre la barre D273 à **4 579** — **1 972 sous la barre** ·
**node 0** · CPU médiane 13 % (6–32) · total **16 569 Mo sur 373 processus**. Inventaire
au-dessus de 150 Mo : chrome 26 proc / 3 507 Mo · Code 19 / 2 533 · svchost 104 / 1 302 ·
Memory Compression 1 294 · WINWORD 553 · NVIDIA App 442 · msedgewebview2 388 · vmmemWSL 373 ·
msedge 311 · NVIDIA Overlay 303 · claude 295 · explorer 291 · powershell 266 · RuntimeBroker
222 · OmenCommandCenterBackground 189 · nvcontainer 184.
⚠ **`chrome` était présent aux QUATRE relevés de la session**, y compris après annonce de sa
fermeture. La règle symétrique de D276 vaut pour un état machine : **c'est la mesure qui fait
foi sur l'état**, et elle est écrite comme telle, sans conclusion sur la cause.
⛔ **CONSÉQUENCE, ÉCRITE ET NON NÉGOCIÉE : les DURÉES ci-dessous ne sont comparables à
RIEN**, et **aucun** chiffre de cette session ne vaut pour une certification. Les **codes de
sortie**, eux, sont des verdicts.

#### ⛔ D282 — LA BARRE D273 A ÉTÉ REFUSÉE PUIS FRANCHIE DANS LA MÊME SESSION, ET LES DEUX SONT ÉCRITS CÔTE À CÔTE

| moment | RAM libre | barre | geste |
|---|---|---|---|
| étape 2, avant `test:int` | **2 926 Mo** | 4 579 | ⛔ **REFUS de lancer**, arrêt franc et demande à Ko |
| étapes 2 à 6, toutes les portes | **2 607 Mo** | 4 579 | ✅ **LANCÉ**, sur ordre de Ko, après réaffirmation |

⚠ **Le second relevé est PLUS BAS que celui qui avait motivé le refus.** Les deux gestes
sont défendables et leurs motifs sont écrits — le refus portait sur le mode d'échec
spécifique du fichier (la contention mange le `DROP DATABASE`, `statement_timeout` 20 s), et
l'exécution sur le fait que l'objet cherché était un **verdict** et non une durée, les durées
étant explicitement écartées. ⛔ **MAIS MIS BOUT À BOUT, ILS LAISSENT UNE BARRE QU'ON
FRANCHIT SUR ORDRE SANS QU'AUCUNE RÈGLE NE DISE QUAND** — et une barre qu'on franchit sans
règle cesse de mesurer. C'est la faute que ce dépôt nomme partout ailleurs : un seuil
renégocié au cas par cas est un seuil qui finit par se baisser en catastrophe.
⇒ **QUESTION PORTÉE AU BACKLOG, NON TRANCHÉE ICI (décision de Ko)** : la barre D273 est-elle
une **porte dure** — rien ne se lance en dessous — ou l'**annotation d'un relevé** — on lance,
on écrit l'état, et on déclare ce que la mesure ne vaut plus ? Les deux se défendent ; ce qui
ne se défend pas est de continuer sans le dire.

| porte | code | durée | mesure |
|---|---|---|---|
| `typecheck` | **0** | 106 s | 8 projets |
| `lint` | **0** | 64 s | 8 projets |
| `test` | **0** | 186 s | **1 329 / 109** — api 659/58 · api-client 36/3 · client 287/20 · pro 347/28 |
| `build` | **0** | 136 s | client + pro + api |
| `test:int` | **0** | 594 s | **434 / 36**, `zwadj_test` réel |
| `neutralize-s11b --int` | **0** | 337 s | ⛔ **11 mordues sur 11, ZÉRO muette** |
| `lancer-campagnes` | ⚠ **1** | 233 s | **27 mordues, 0 muette, 2 NON MESURÉES** |

⚠ **L'écart de tests est ENTIÈREMENT expliqué** : 1 323 → **1 329** (+6) et 108 → **109**
fichiers (+1), soit exactement `booking-deadline.spec.ts` et ses six cas. Aucune autre suite
n'a bougé, et `test:int` rend le **même 434 / 36** qu'à D275 et D279 — **le `CHECK` neuf n'a
cassé aucune spec d'intégration**.

⛔ **`lancer-campagnes.py` A ÉTÉ LANCÉ — IL MANQUAIT AU TABLEAU DE D279 — ET IL SORT EN 1.**
Le motif est nommé, pas couvert : le tri joue `neutralize-s11b.py` **sans `--int`**, donc
S11b-8 et S11b-9 ressortent « non mesurées » et la campagne rend **3** (incomplète). C'est le
défaut croisé **`[INFRA][P1]`** déjà au backlog — « `--tout` qui ne joue ni ne nomme les
mesures `--int` ». ⚠ **Les deux cibles ont été mesurées directement, avec `--int` : elles
mordent.** Le 1 est un défaut d'outillage, pas une garde muette — et il est écrit comme tel
plutôt que déclaré vert.

### ⛔ D282 — CE QUI RESTE, ET CE QUI N'EST PAS CERTIFIÉ

1. ⛔ **UNE DÉRIVE DE SOMME DE CONTRÔLE PRISMA, EN ATTENTE D'ARBITRAGE.** Avoir ajouté un
   commentaire à une migration **déjà appliquée** a désaligné `_prisma_migrations`
   (`4bf7e91e…`, le sha256 d'avant) du fichier (`8c34e7b0…`). ⛔ **`migrate deploy` et
   `migrate status` sortent en 0 sans un mot** — même famille que le piège déjà consigné.
   Remède proposé, **non fait** : une écriture unique dans le journal des migrations. Elle
   ne s'improvise pas. Entrée `[INFRA][P1]` au backlog.
2. **Les deux échéances ne sont assertées que « non nulles » en intégration** : intervertir
   leurs constantes entre les sites serait **invisible**. `[API][P0]`, chemin de l'argent.
3. **Le harnais `migration-non-empty` se périme à chaque migration**, par conception :
   sixième sonde en sept lots, et la garantie du lot précédent devient intestable.
   `[INFRA][P1]`.
4. **Le comportement d'une échéance passée** reste à trancher. `[PRODUIT][P1]`.

⚠ **CE LOT N'EST PAS CERTIFIÉ.** Les portes sont vertes **sous une machine à 2 607 Mo**,
c'est-à-dire **loin sous la barre** — ce qui est plus faible encore qu'un « vert au repos »,
et ne s'en approche pas. Les deux réserves de D275 restent actives, et la certification du
07/09 n'est **pas** reconduite.

## Session du 08/09/2026 (D281) — une norme sans date, et la phrase qui se racontait trop bien

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D280**.

⛔ **ÉTAT : LOT DOCUMENTAIRE, UN SEUL FICHIER AU DIFF** — `ZWADJ_CONTINUITE.md`, énuméré
avant écriture. Aucune ligne de code, aucune porte, aucune migration, aucune écriture en
base. **Rien n'est déclaré vert.**

### D281 — ce que l'audit de Ko a trouvé, et que la passe de D280 avait manqué

Le tableau « compteurs de référence à la clôture du Flux C » portait encore, **non barré et
dans la même section que le barrage de D280**, le compteur « 18 entrées (17 migrations) ».
⛔ **Le geste n'était pas celui que j'avais proposé.** J'ai suggéré d'ajouter un chapeau :
**il en existait déjà un**, trente lignes plus haut, et il dit exactement ce qu'il faut.
Ce qui manquait n'était pas un chapeau — c'était que **rien ne le contredise en dessous**.
En poser un second aurait fait grossir le fichier de la façon même que ces lots combattent.
⇒ Ce qui a bougé : **une clause ajoutée au chapeau existant**, et la phrase normative
barrée dans le titre du tableau. Rien de neuf n'a été créé.

### ⛔ D281 — DEUX FAITS QUE MON RELEVÉ N'AVAIT PAS SORTIS, ET ILS CHANGEAIENT LE GESTE

1. **Les deux tableaux sont en ordre chronologique INVERSE.** Flux C est **antérieure** à
   F1 et placée **après** elle. Une lecture linéaire prend la dernière pour la plus
   récente : c'est la lecture normale, et elle est fausse. Le défaut n'était donc pas
   « une table sans date » mais « **sans date, en dernier, et plus basse que la table datée
   qui la précède** » — trois propriétés dont aucune ne suffit seule.
2. **Les deux tableaux se contredisaient déjà** : F1 dit « typecheck **8 projets** », Flux C
   dit « **7 projets** », chacun avec sa note de correction. Une reprise obtenait 7 ou 8
   selon celui qu'elle ouvrait. ⇒ **Aucun des deux n'est faux** — `api-client` s'est ajouté
   entre les deux clôtures — et **dater les titres résout la contradiction sans toucher un
   seul chiffre**. C'est le contraire d'une correction : c'est une restitution d'ordre.

### ⚠ D281 — LA DATE NE S'EST PAS LAISSÉE RELEVER, ET C'EST ÉCRIT COMME TEL

La consigne était explicite : la date se relève, elle ne se déduit ni des nombres ni de
l'ordre des sections ; et si elle n'est pas relevable, on l'écrit.
**Elle ne l'est pas.** Cherché : `docs/history/CONTINUITE-flux-A-E.md` ne porte **aucune
date au format JJ/MM/2026** ; le titre du tableau nomme un événement ; `git log -S` rend
**28/08/2026**, qui date le déplacement documentaire de R1 (D267), **pas la clôture**.
⇒ **Ce qui se relève est une BORNE, et elle est écrite comme une borne** : la migration la
plus tardive du périmètre couvert est `20260730120000_venue_styles_and_ceremony_type`
(A13a), donc la clôture n'est **pas antérieure au 30/07/2026**.
⛔ **Aucun jour n'a été inventé.** « Date non relevable, borne basse 30/07/2026 » est une
mesure ; un mois plausible n'en aurait pas été une, et aurait eu exactement la forme d'une
date vraie.

### D281 — la phrase de D280, qualifiée sur place

D280 affirmait que son corollaire « a mordu sur son propre auteur ». **Il a mordu trois
fois et manqué la quatrième**, sans même le changement de fichier qui excusait D277. La
qualification est écrite **à l'endroit de la phrase**, pas dans une section neuve : une
section qui se raconte mieux qu'elle n'a fait est la matière première du défaut qu'elle
décrit, et la déplacer ailleurs l'aurait laissée intacte là où on la lit.

### D281 — ce qui a été écrit, et où

| Fichier | Ce qui change |
|---|---|
| `ZWADJ_CONTINUITE.md` | clause ajoutée au **chapeau existant** (ordre non chronologique) · titre du tableau Flux C : borne de date relevée + « tout écart futur est une régression » **barré** · phrase de D280 **qualifiée sur place** · cette section · registre |

⚠ **Les deux tableaux sont INTACTES** — pas un chiffre touché. ⚠ **Limite qui reste** : la
date exacte de clôture du Flux C n'est pas dans le dépôt ; seule une borne l'est.

## Session du 08/09/2026 (D280) — les décisions ne traversent pas, et c'est la cinquième fois

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D279**.

⛔ **ÉTAT : LOT DOCUMENTAIRE, AUCUNE LIGNE DE CODE, AUCUNE PORTE, AUCUNE ÉCRITURE EN BASE.**
Trois fichiers au diff, **énumérés avant écriture** : `ZWADJ_CONTINUITE.md`,
`ZWADJ_BACKLOG.md`, `AGENTS.md`. Neuf barrages, listés plus bas.

### ⛔ D280 — LE FAIT, PAS L'INCIDENT : CINQUIÈME OCCURRENCE, ET LA RÈGLE EXISTE DÉJÀ

Une décision est prise, elle est écrite **au bon endroit**, et elle **ne traverse pas**
jusqu'aux autres fichiers d'autorité — qui continuent d'affirmer le contraire, au présent,
dans des blocs qu'une reprise lit en premier.

| | où | ce qui a manqué |
|---|---|---|
| 1 · 02/09 | un message de chat | la décision n'était dans aucun fichier |
| 2 · 04/09 (D270) | un fichier, bloc de provenance | il affirmait « aucune branche en attente » pendant que quatre lots vivaient sur une branche |
| 3 · 07/09 (D276) | un message de commit de fusion | la fusion et la levée du verrou n'étaient dans aucun fichier |
| 4 · 08/09 (D277) | `ZWADJ_CONTINUITE.md`, correctement | `ZWADJ_BACKLOG.md` la contredisait, non barré |
| **5 · 08/09 (ici)** | **partout où il fallait, une fois** | **neuf affirmations périmées survivaient dans les TROIS fichiers** |

⛔ **CE QUI REND CELLE-CI DIFFÉRENTE, ET PIRE : DEUX DES NEUF ONT ÉTÉ MANQUÉES PAR LA PASSE
QUI EXISTAIT POUR LES ATTRAPER.**
1. **Le « PROCHAIN LOT — E3 » de l'en-tête** a survécu **quatre-vingts lignes sous la règle
   qui l'interdit nommément**, dans le paragraphe même qui raconte avoir retiré son jumeau.
2. **Le « 168 lignes » du backlog** a survécu à **D277**, dont l'objet unique était de
   porter ce barrage-là jusqu'aux autres autorités : la passe a traité une occurrence et
   pas l'autre, **deux entrées plus haut dans le même fichier**.

⇒ **COROLLAIRE EXÉCUTOIRE, ET IL A DEUX MOITIÉS — c'est la seconde qui manquait :**
- **le barrage se fait dans TOUS les fichiers d'autorité au moment où la décision est
  prise**, jamais seulement dans celui où elle est écrite ;
- **et une passe de barrage se RELIT dans son propre fichier avant d'être close.** Chercher
  ailleurs sans se relire soi-même est exactement ce qui a produit les points 1 et 7.
⚠ La recherche est mécanique et n'a aucune excuse : on cherche les MOTS de l'affirmation
qu'on vient d'invalider, on compte les occurrences AVANT, on les traite toutes.

### ⚠ D280 — LA REPRISE ANNONCÉE « À FROID » N'EN ÉTAIT PAS UNE, ET LE TEST RESTE À FAIRE

Le rapport qui a produit ces neuf points a été demandé comme une reprise à froid, sans état
fourni. **Ce n'en était pas une** : la session n'avait pas été rouverte, et le rapport a
donc été produit **avec le contexte de la session précédente en mémoire**. Ko l'a relevé.
⛔ **CONSÉQUENCE, ÉCRITE POUR QU'ON NE SE PAIE PAS DE MOTS** : les neuf contradictions sont
vraies — elles ont été recoupées contre les fichiers, une par une — mais **elles ne
démontrent PAS que `ZWADJ_CONTINUITE.md` suffit à reprendre sans Ko.** Ce test-là n'a pas
eu lieu. Il reste entier.
⇒ **Il aura lieu à l'ouverture de l'étape 4, en session RÉELLEMENT neuve** — et il portera
sur le fichier **réparé par ce lot**, ce qui vaut mieux que sur le fichier cassé : un
document qui ment en neuf endroits ne teste pas la reprise, il teste la mémoire de celui
qui le lit.
⚠ **C'est la raison d'être de « un lot par session »** : tant qu'on enchaîne dans le même
fil, la question « ce fichier suffit-il ? » reste théorique, et le fichier peut se dégrader
sans que personne le voie. **Neuf affirmations périmées, c'est la mesure de cette
dégradation.**

### D280 — les neuf, et ce que chacune disait

| # | où | ce qui était écrit | traitement |
|---|---|---|---|
| 1 | `CONTINUITE`, en-tête | « PROCHAIN LOT — E3 […] **le seul verrou restant** » | **barré** — renvoi à l'ordre des rangs (D270) ; rang courant **8, S11-b** |
| 2 | `CONTINUITE`, rang 8 | « le cadrage de S11-b **n'existe pas** » | **barré** — il existe, écrit le 08/09, dans ce fichier |
| 3 | `CONTINUITE`, « État actuel » | « **18 entrées** (17 migrations + lock) » | **retiré**, pas corrigé — `ls apps/api/prisma/migrations` |
| 4 | `BACKLOG`, « À LIRE EN PREMIER » | « dernier attribué : **D267** » | **barré** — c'était **D279**, douze d'écart ; renvoi au registre |
| 5 | `BACKLOG`, « À LIRE EN PREMIER » | « **20 scripts, 170 cibles** » | **retiré** (D268 l'interdit) — `ls neutralisation/` |
| 6 | `BACKLOG`, ordre recommandé | « `migration-non-empty` **bloqué**, sept tests sautés » | **barré** avec sa mesure — rien déclaré vert au-delà |
| 7 | `BACKLOG`, ordre recommandé | « **Reste** S11-b » · « **168 lignes** / 123 exécutables » | **barrés** — étapes 1→3 faites ; 168 barré depuis D277 ; **107** aujourd'hui |
| 8 | `BACKLOG`, report 08/09 | `[INFRA][P1]` retard de trois migrations | **CLOSE**, datée, preuve en base (26/26, index unique ET partiel) |
| 9 | `AGENTS`, table des lots | « État des lots — au 20/08/2026 » | **table INTACTE**, chapeau ajouté : instantané daté, non courant, et où lire l'état |

### ⚠ D280 — LE POINT 6 A ÉTÉ SOUS-RÉSOLU, ET LA CORRECTION VAUT COMME MÉTHODE

Le rapport disait : « le fichier ne porte pas de `beforeAll` à 60 s mais un
`statement_timeout` à 20 s ». ⛔ **Vrai, et trompeur.** Le « 60 000 ms » existe — c'est
`hookTimeout: 60_000`, dans **`apps/api/vitest.config.int.ts:20`**, pas dans le spec. Une
réponse exacte à la mauvaise question se lit comme une réponse à la bonne.
⛔ **Et la lecture seule TRANCHAIT, sans rien lancer** : 36 fichiers `*.int-spec.ts` au
dépôt, `test:int` à **434 / 36, exit 0** le 08/09, et un tableau de mesures qui **sait
écrire « 1 ignoré »** puisqu'il le fait pour l'e2e et pas pour `test:int`. **Sept tests
sautés se verraient.** Le rapport a conclu « je ne peux pas trancher sans lancer » alors
que trois relevés déjà écrits se recoupaient.
⇒ **Leçon** : avant de déclarer une question indécidable, épuiser ce que les mesures DÉJÀ
consignées disent ensemble. « Non concluant » est une mesure, pas une impression (D192).

### ⛔ D280 — LES DEUX COMPTEURS REPLANTÉS, ET LE RELEVÉ DATÉ QUI LES REMPLACE

⛔ **LE PREMIER JET DE CE LOT A REPLANTÉ LE DÉFAUT QU'IL RETIRAIT.** En barrant « 18
entrées » et « 20 scripts, 170 cibles », il a écrit **le compte du jour à leur place** —
c'est-à-dire un compteur neuf, dans « État actuel » et dans « À LIRE EN PREMIER », les deux
blocs qui se lisent comme l'état courant. Le rapport de fin de lot les a signalés « à
surveiller » : **ce n'était pas une réponse**, un chiffre qu'on surveille est un chiffre
qu'on a laissé.
⇒ **Retirés le 08/09/2026 à la relecture**, avec la commande seule à leur place. **Le
précédent est dans `CLAUDE.md`, deux fois** : la taille du fichier a été retirée sous
« AUCUNE TAILLE N'EST ÉCRITE ICI, ET C'EST DÉLIBÉRÉ » avec renvoi à `ls -l` ; et la ligne
du registre porte « D1 à D266 » barré **sans nouveau numéro**.

**Relevé du 08/09/2026 — daté, non reconduit, et c'est ici qu'il vit :**

| mesure | valeur au 08/09/2026 | comment la reprendre |
|---|---|---|
| migrations au dépôt | **26** (+ `migration_lock.toml`) | `ls apps/api/prisma/migrations` |
| migrations appliquées sur `zwadj` | **26** | `SELECT count(*) FROM _prisma_migrations WHERE finished_at IS NOT NULL` |
| harnais `neutralize-*.py` | **26** | `ls neutralisation/` |
| `create`, lignes exécutables | **107** | commande écrite dans la section du rang 8 |

⚠ **Ces quatre nombres ne valent que pour le 08/09/2026**, et aucun n'est recopié ailleurs.
Une session qui les lit lit une **section datée**, pas un état — c'est toute la différence
entre le journal d'un lot et un compteur.
⚠ **Trois occurrences de plus ont été retirées à la même relecture** : mon barrage du
« dernier attribué : D267 » écrivait **le numéro courant** à la place — donc replantait le
compteur sous le mot « barré » — et son titre en donnait l'**écart chiffré**, qui le
reconstruit et grandit tout seul ; et le « chiffre courant est 107 » avait été posé dans le
bloc de lecture du backlog. ⛔ **Une passe de barrage se relit dans son propre fichier** :
c'est le corollaire écrit plus haut, et il vient de mordre sur son propre auteur.
⛔ **QUALIFIÉ LE 08/09/2026 (D281) — CETTE PHRASE SURESTIME CE QUI S'EST PASSÉ.** Le
corollaire a mordu **trois fois et manqué la quatrième** : `ZWADJ_CONTINUITE.md:318`
portait encore, non barré, le compteur « 18 entrées (17 migrations) » que la passe venait
de retirer **cinquante-deux lignes plus haut, dans la MÊME section**. C'est le point 7 de
la liste ci-dessus — « une occurrence traitée, l'autre laissée » — appliqué à la passe qui
l'écrivait, et sans même le changement de fichier qui l'excusait chez D277.
⚠ **La correction n'est pas cosmétique, et c'est pour cela qu'elle est ici et pas dans une
section neuve** : une section qui se raconte mieux qu'elle n'a fait est **la matière
première du défaut qu'elle décrit**. Relevé par Ko, à l'audit ; la recherche mécanique que
ce corollaire prescrit n'avait pas été jouée par la passe qui le prescrivait.

### D280 — ce qui a été écrit, et où

| Fichier | Ce qui change |
|---|---|
| `ZWADJ_CONTINUITE.md` | points 1, 2, 3 · cette section · registre |
| `ZWADJ_BACKLOG.md` | points 4, 5, 6, 7, 8 |
| `AGENTS.md` | point 9 — chapeau au-dessus de la table, **table inchangée** |

⚠ **AUCUNE PORTE N'A ÉTÉ LANCÉE**, et le motif n'est pas recopié : aucune porte, aucun test
et aucun harnais ne LIT ces trois fichiers — vérifié le 08/09 sur les lectures réelles.
**Rien n'est déclaré vert, et la certification de D275 n'est pas reconduite.**

## Session du 08/09/2026 (S11-b, étapes 1→3) — D279 · le chiffrage devient un module pur, et il n'a pas maigri du premier coup

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D278**.

⛔ **ARRÊT DEMANDÉ PAR KO, ET TENU : rien n'a été fait de l'étape 4 (le `CHECK`).** Aucune
migration écrite, aucune migration appliquée par moi, `migration-non-empty.int-spec.ts`
NON retargé. Ko veut voir le harnais non vide rougir sur un semis qui viole la contrainte
**avant que la migration parte**. Les étapes 5 (les deux échéances) et 6 (le harnais, pour
sa part restante) suivent l'étape 4 et ne sont pas faites non plus.

**Neuf fichiers au diff, énumérés avant écriture** : `booking-charge.ts` et
`booking-charge.spec.ts` (neufs), `neutralize-s11b.py` (neuf), `bookings.service.ts`,
`quotes.service.ts`, `service.ts`, `fr.json`, `ar.json`, et ce fichier.

### D279 — étape 2 : les trois migrations VÉRIFIÉES EN BASE, pas au code de sortie

Ko les a appliquées. Contrôlé par **définition d'objet**, jamais sur un code de retour —
`migrate deploy` sort en succès sans rien appliquer quand le schema-engine manque :

| objet | état relevé |
|---|---|
| `_prisma_migrations` | **26 appliquées** (contre 23 le 08/09 au matin) |
| `QuoteStatus.CANCELLED` | **présent** dans `pg_enum` |
| `quotes_sent_at_coherent` | présent, avec l'exemption `CANCELLED` |
| `payments_one_pending_per_booking` | présent, ⛔ **`indisunique` ET `indpred IS NOT NULL`** — unique **et** partiel |

⚠ **Et la distinction qui manquait au report** : `test:int` travaille sur **`zwadj_test`**,
recréée à chaque exécution ; `pnpm dev` sur **`zwadj`**. C'est `zwadj` qui était en retard.
L'entrée `[INFRA][P1]` peut être close par Ko.

### ⛔ D279 — étape 1 puis 3 : LE LOT A RATÉ SON OBJET AU PREMIER JET, ET LA MESURE L'A DIT

⛔ **CE N'EST PAS UN INCIDENT DE SESSION, C'EST UN FAIT SUR LA MÉTHODE, ET C'EST LA
DEUXIÈME FOIS.** La première était **S11-a** (D261) : son premier jet faisait *grossir* la
méthode qu'il prétendait réduire, et rien d'autre que le chiffre d'entrée ne l'aurait dit.
Ici, le second jet ne la faisait pas grossir — il ne la réduisait **pas du tout**, ce qui se
raconte encore plus facilement comme un succès.
⇒ **Le chiffre d'entrée de D261 a donc empêché DEUX lots consécutifs de s'auto-décerner
leur résultat.** Deux occurrences sur deux lots de SRP, c'est un taux, pas une malchance :
**un lot de SRP ne sait pas, de l'intérieur, s'il a réduit quoi que ce soit.** L'extraction
donne le sentiment du travail fait — les décisions ONT bougé, le module pur existe, les
gardes mordent — et ce sentiment est exactement ce qui rend le relevé indispensable plutôt
que cérémoniel.
⚠ **Corollaire exécutoire, pour le prochain lot de SRP** : le chiffre d'entrée se relève
AVANT, avec sa définition écrite, et le chiffre de sortie se relève **avant de rédiger la
note**, jamais après — une note écrite d'abord cherche ensuite la façon de compter qui la
confirme.


| moment | `create`, lignes exécutables |
|---|---|
| entrée (relevée deux fois, 08/09) | **123** |
| après extraction, **appel écrit EN LIGNE** | ⛔ **123** — *aucun gain* |
| après passage par une aide privée | ✅ **107** |

⛔ **L'extraction seule n'a rien réduit.** Les décisions étaient parties dans un module pur
— l'objet réel du lot — mais l'appel en ligne (objet littéral de sept lignes, déstructuration,
traduction du refus) rendait exactement ce que la boucle supprimée coûtait. **Un lot de SRP
qui ne se mesure pas avant ET après s'auto-décerne son résultat** : sans ce relevé, la note
aurait annoncé « chiffrage extrait » sur une méthode au poids inchangé.
⇒ **Le remède est l'idiome de la méthode VOISINE, pas une invention** : `create` appelait
déjà `this.admitOrThrow(...)` en une ligne. Le chiffrage passe par `chargeOrThrow` — lecture
du catalogue, appel du module pur, traduction du refus en HTTP — **24 lignes exécutables**.

| | lignes exécutables |
|---|---|
| `booking-charge.ts` (module PUR) | **77** |
| `chargeOrThrow` (aide privée, E/S + traduction) | **24** |
| `create` | 123 → **107** |

### D279 — ce que le module tient, et pourquoi il est consommé par les DEUX dès la première ligne

`resolveCharge` ne lève pas : il rend un verdict discriminé, comme `booking-admission` et
`booking-locks`. Il porte l'ordre des refus (**doublon → indisponible → refus de ligne**),
l'agrégat, et l'acompte sur le total FINAL. `confrontExpectedCharge` porte D75 — appelée
par la demande CLIENT **seulement** : un devis est chiffré par le pro, il n'y a pas
d'attente à confronter, et l'« harmoniser » inventerait une exigence.

⚠ **`SERVICE_DUPLICATE` est le contrat d'API neuf autorisé par D278**, et il est **identique
des deux côtés**. Clés i18n FR et AR posées ; la parité i18n reste verte.

⚠ **MD8 est fermé par la CAUSE** : `resolveCharge` compare `found.venueId` à la salle de la
demande. Avant, le refus tombait parce que le `where venueId` des deux services empêchait la
ligne d'arriver — un bon résultat obtenu par le mauvais mécanisme, qui aurait cédé en
silence le jour où ce `where` aurait bougé.

### ⛔ D279 — UNE CIBLE DE NEUTRALISATION EST SORTIE MUETTE, ET SON ÉCHEC EST UNE MESURE

La cible **S11b-8** — celle qui prouve l'exigence de Ko, « le module partagé muté doit
rougir chez les DEUX consommateurs » — est sortie **VERTE des deux côtés** au premier jet.

⛔ **Cause : elle mutait `basePriceCents`, un champ qu'AUCUNE des deux specs d'intégration
n'asserte.** C'est la faute nommée dans la campagne S10b — *avant d'écrire une cible : par
quel chemin cette mesure voit-elle la mutation ?* — et je l'avais posée pour les cibles 1 à
7 sans la reposer pour la 8ᵉ.

⛔ **MAIS CE QU'ELLE A MONTRÉ VAUT PLUS QUE LA CIBLE : c'est MD2 observé EN VRAI.** Sous la
mutation, les deux chemins ont écrit en base des réservations et des devis dont
`base_price_cents` **ne correspond plus** à `total_cents − services_total_cents` — et
**PostgreSQL comme les 36 fichiers d'intégration les ont acceptées, en vert.** L'agrégat
n'est gardé par rien, et il n'a pas fallu le raisonner : **on l'a vu.**

⛔ **C'EST DÉSORMAIS LA JUSTIFICATION DU `CHECK` DE L'ÉTAPE 4, ET ELLE EST ÉCRITE ICI EXPRÈS.**
Jusqu'à cette mutation, MD2 était un **raisonnement** : « la migration impose
`line_total = unit_price × quantity` au niveau ligne et rien au niveau agrégat, donc une
erreur d'agrégation passerait ». Un raisonnement se discute — et le jour où quelqu'un
trouvera ce `CHECK` coûteux, gênant pour une reprise de données ou « manifestement
redondant », c'est ce raisonnement qu'il croira pouvoir défaire.
⇒ **Ce n'est plus un raisonnement, c'est une OBSERVATION, datée et reproductible** :
`neutralisation/neutralize-s11b.py`, cible 8, première version — conservée en commentaire
avec son motif exactement pour cela. On modifie une ligne du calcul, on lance les portes,
et **des lignes incohérentes entrent en base sans qu'un seul test rougisse**. La question
n'est donc pas « une erreur d'agrégation pourrait-elle passer ? » mais « **combien de temps
est-elle passée sans que rien ne le dise ?** ».
⚠ **Et c'est le contraire d'une preuve cherchée** : elle est tombée d'un instrument mal
réglé, dans une cible qui visait autre chose. Une observation qu'on n'a pas construite pour
gagner un argument est la plus difficile à écarter.
⛔ **Qui voudra retirer ce `CHECK` devra donc expliquer ce que devient CETTE mesure-là**,
pas répondre à une inquiétude théorique.
⇒ Cible refaite sur le **total**, asserté des deux côtés (`bookings.int-spec.ts:152`,
`quotes.int-spec.ts:93`), avec un `+ 100` qui la rend fausse **même sans prestation** —
sinon la mutation serait inerte sur le cas nominal. ⚠ La première version est **conservée
en commentaire dans le harnais**, avec son motif : une cible retirée sans trace se réécrit.

### D279 — les mesures, avec l'état machine devant elles

⚠ **Chrome fermé par Ko avant la session.** Relevé d'ouverture : RAM libre **médiane
5 327 Mo** (bande 5 296–5 364) · **node 0** · **chrome 0** · CPU médiane 11 % (6–20) ·
total **11 587 Mo sur 335 processus**. Relevé devant la passe finale : **5 242 Mo**
(5 219–5 267) · node 0 · chrome 0 · CPU 16 % (5–34) · **11 630 Mo sur 332 processus**.
⛔ **Les deux sont AU-DESSUS de la barre D273 (4 579 Mo)** — inventaire au-dessus de 150 Mo :
Code 2 577 · svchost 1 239 · Memory Compression 889 · vmmemWSL 640 · msedgewebview2 312 ·
explorer 308 · claude 306 · powershell 291 · msedge 262 · le reste sous 200.
⚠ **La sonde reste hors du dépôt** (réserve n°2 de D275, décision D278 : on avance sans).
Ces relevés sont donc des **affirmations datées**, pas des mesures rejouables.

| porte | code | durée | mesure |
|---|---|---|---|
| `typecheck` | **0** | 18 s | 8 projets |
| `lint` | **0** | 12 s | 8 projets |
| `test` | **0** | 60 s | **1 323 tests / 108 fichiers** — api 653/57 · api-client 36/3 · client 287/20 · pro 347/28 |
| `build` | **0** | 52 s | client + pro + api |
| `test:int` | **0** | 342 s | **434 / 36**, `zwadj_test` réel |
| `e2e` | **0** | 144 s | **34 passés, 1 ignoré, 0 instable** |
| `neutralize-s11b --int` | **0** | 166 s | ⛔ **8 mordues sur 8, ZÉRO muette** |

⚠ **L'écart de tests est ENTIÈREMENT expliqué** : 1 310 → **1 323** (+13) et 107 → **108**
fichiers (+1), soit exactement `booking-charge.spec.ts`. Aucune autre suite n'a bougé, et
`test:int` rend le même **434 / 36** qu'à D275 — **aucune spec d'intégration n'a été
cassée par le refus du doublon**, qui est pourtant un changement de comportement.

### ⛔ D279 — CE QUI RESTE, ET CE QUI N'EST PAS CERTIFIÉ

1. ⛔ **Étape 4 — le `CHECK`** : migration écrite à la MAIN, et **`migration-non-empty.int-spec.ts`
   retargé avec un semis qui VIOLE la contrainte**. ⚠ Le prérequis mesuré en D278 (0 violation)
   portait sur **4 réservations** : il ne borne à peu près rien, et c'est le harnais non vide
   qui porte la garantie. **Ko veut voir ce harnais rougir avant que la migration parte.**
   ⛔ **SA JUSTIFICATION N'EST PAS DANS CE POINT-CI, ELLE EST DANS LA SECTION SUR LA CIBLE
   MUETTE CI-DESSUS** — l'observation, pas le raisonnement : des lignes incohérentes SONT
   entrées en base, portes vertes. **À lire avant d'écrire cette migration, et surtout avant
   de la retirer.**
2. **Étape 5 — les deux échéances** (`expiresAt`, `paymentDueAt`), cas limites spécifiés.
3. **Étape 6 — le harnais**, pour sa part restante (CHECK + échéances).

⚠ **CE LOT N'EST PAS CERTIFIÉ.** Les portes sont vertes **au repos, le 08/09/2026**, et cette
marque ne se reconduit pas — ni au lot suivant, ni aux étapes 4 à 6. Les deux réserves de
D275 restent actives.

## Session du 08/09/2026 (suite) — D278 · arbitrage de S11-b, et le prérequis qui ne prouve presque rien

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D277**.

⛔ **ÉTAT : AUCUNE LIGNE DE CODE, AUCUNE PORTE, AUCUNE MIGRATION APPLIQUÉE.** Deux fichiers
au diff, `ZWADJ_CONTINUITE.md` et `ZWADJ_BACKLOG.md`, **énumérés avant écriture**. Les
seules commandes exécutées sont des **lectures** : `SELECT` en lecture seule sur `zwadj`,
et une comparaison de listes de migrations. **Rien n'a été écrit en base.**

### D278 — les quatre arbitrages de Ko, et le périmètre qui s'élargit sur CONSTAT

| point | verdict | ce qui l'a emporté |
|---|---|---|
| périmètre | **les deux chemins**, `bookings` ET `quotes` | extraire pour un seul appelant créerait la divergence qu'on ferme |
| n°1 — l'agrégat | **le `CHECK`**, avec prérequis mesuré | l'agrégat est ce qui sera facturé ; le laisser sans garde n'est pas tenable |
| n°2 — le doublon | **refus 409**, jamais de fusion, **même contrat côté devis** | fusionner devine une intention qu'on n'a pas |
| n°3 — les échéances | **les deux** | `paymentDueAt` décide si un règlement arrive à temps |

⚠ **Le point n°2 autorise un CONTRAT D'API NEUF**, ce que `AGENTS.md` interdit sans accord
explicite. L'accord est ici, daté, avec son motif. **Il ne s'étend à rien d'autre.**

### ⛔ D278 — LE PRÉREQUIS DU `CHECK` A ÉTÉ EXÉCUTÉ, ET IL NE PROUVE PRESQUE RIEN

**Mesuré sur `zwadj` (la base de développement permanente), en lecture seule :**

| mesure | valeur |
|---|---|
| réservations | **4** |
| lignes de prestation | **4** |
| violations de `total_cents = base_price_cents + services_total_cents` | **0** |
| désaccords `services_total_cents` ↔ somme des lignes | **0** |
| doublons `(booking_id, service_id)` | **0** |

⛔ **ZÉRO SUR QUATRE NE BORNE À PEU PRÈS RIEN, ET C'EST LA SEULE LECTURE HONNÊTE.** C'est la
leçon de D274 (« 0 sur 30 borne un taux et ne prouve PAS un zéro ») à un ordre de grandeur
plus faible. Le prérequis de Ko visait le cas *« une migration qui échoue sur des données
préexistantes »* : sur quatre lignes écrites à la main, la migration réussira quoi qu'il
arrive et **n'apprendra rien**. ⚠ **Le résultat est vert et il est presque vide** — les deux
se lisent pareil, et c'est exactement ce que ce dépôt corrige en boucle.
⇒ **CE QUI PORTE RÉELLEMENT LA GARANTIE, ET C'EST DÉJÀ LA DOCTRINE (D123)** :
`apps/api/test/int/migration-non-empty.int-spec.ts`, qui applique tout SAUF la dernière
migration, **sème l'état sur lequel la nouvelle peut échouer**, puis vérifie. ⛔ Il **se
retarge à chaque migration ajoutée** — cinq changements de sonde en six lots — et le semis
doit produire une réservation dont `total_cents ≠ base + prestations`, **sinon la migration
s'applique sur du vide et le test est vert et muet.** C'est une obligation de la session de
code, pas une option.

### ⛔ D278 — DÉCOUVERT EN CHEMIN : LA BASE DE DEV EST EN RETARD DE TROIS MIGRATIONS

Relevé, pas supposé — `_prisma_migrations` contre le contenu de `prisma/migrations/` :
**23 appliquées sur `zwadj`, 26 au dépôt.** Les trois absentes :

- `20260821000000_quote_status_cancelled`
- `20260821000100_quote_cancel_without_delivery`
- ⛔ `20260824120000_payment_one_pending_per_booking` — **l'index partiel du chemin de
  l'argent**, celui que les cibles E1→E5 mesurent.

⚠ **CE QUE CE N'EST PAS, ET IL FAUT LE DIRE D'ABORD : la certification de D275 n'est PAS
en cause.** `test:int` travaille sur **`zwadj_test`**, recréée de zéro et remigrée à chaque
exécution (`db-url.ts`) — les 434 tests ont donc bien couru sur le schéma de tête. Les
bases présentes sont `zwadj`, `zwadj_test`, `zwadj_e2e`, `zwadj_migration_test`.
⛔ **CE QUE C'EST** : la base contre laquelle tourne `pnpm dev` **n'a pas** l'unicité
partielle des intentions de paiement. Quelqu'un qui exercerait le chemin de l'argent à la
main sur cette base ne serait protégé par **rien**, pendant qu'une campagne verte affirme
— à juste titre, sur `zwadj_test` — que la garantie tient. **Deux bases, deux schémas, un
seul mot pour les deux.**
⛔ **AUCUNE MIGRATION N'A ÉTÉ APPLIQUÉE, ET C'EST DÉLIBÉRÉ.** Appliquer trois migrations à
la base de travail de Ko sans le lui demander est un geste d'état, pas une lecture — et
`AGENTS.md` rappelle que `migrate deploy` peut **sortir en succès sans rien appliquer**
quand le schema-engine manque, donc que le code de retour ne fait pas foi. ⇒ **Rapporté au
backlog** (`[INFRA][P1]`), à faire par Ko ou en ouverture de la session de code, **avec
vérification qu'une table/contrainte attendue existe après**, jamais sur le code de sortie.

### D278 — ce que la session de code devra faire, dans l'ordre

1. **Relever à nouveau** les bornes de `create` (`146,324` bougeront) et le chiffre
   d'entrée **123 lignes exécutables**, avec la commande écrite au rang 8.
2. **Appliquer les trois migrations manquantes sur `zwadj`** et **vérifier en base** que
   `payments_one_pending_per_booking` existe — pas lire un code de sortie.
3. **Le module pur**, consommé par les DEUX services, avec le refus 409 du doublon posé au
   même endroit pour les deux.
4. **Le `CHECK`** — migration écrite à la MAIN (`migrate dev` est interdit), et
   `migration-non-empty.int-spec.ts` **retargé avec un semis qui viole le `CHECK`**.
5. **Les deux échéances**, avec leurs cas limites spécifiés.
6. `neutralize-s11b.py` — nommé ainsi, sinon jamais découvert (D272).

⚠ **Mesurer avant ET après** (D261), sinon le lot s'auto-décerne son résultat.

### D278 — ce qui a été écrit, et où

| Fichier | Ce qui change |
|---|---|
| `ZWADJ_CONTINUITE.md` | les quatre arbitrages **annotés sous chaque point ouvert**, la question laissée INTACTE · le prérequis mesuré et sa portée réelle · le retard de la base de dev · cette section · registre |
| `ZWADJ_BACKLOG.md` | entrée `[INFRA][P1]` : trois migrations non appliquées sur `zwadj`, dont l'index partiel du chemin de l'argent |

⚠ **LE CADRAGE N'A PAS ÉTÉ RÉÉCRIT.** Chaque point ouvert garde sa question mot pour mot et
reçoit une annotation **en dessous**. Un cadrage réécrit après arbitrage ne peut plus
démentir personne (D277) — et il ne pourrait notamment plus montrer que la question posée
n'était pas celle qui a été tranchée, le jour où cela arrivera.

## Session du 08/09/2026 — D277 · la levée était bien dans un fichier, et elle n'a pas traversé

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D276**.

⛔ **ÉTAT : LOT DOCUMENTAIRE, AUCUNE LIGNE DE CODE.** Trois fichiers au diff —
`ZWADJ_CONTINUITE.md`, `ZWADJ_BACKLOG.md`, `AGENTS.md` — **énumérés avant écriture**.
Aucune porte n'a été lancée, et le motif n'est pas recopié de D276 : **revérifié le
08/09**, aucune porte, aucun test et aucun harnais ne LIT ces trois fichiers (cherché sur
les lectures réelles — `readFileSync`, `readFile`, `open(`, `Path(`, `read_text` — dans
tout le dépôt, hors `node_modules` et `dist`). **Rien n'est déclaré vert.**

### ⛔ D277 — QUATRIÈME FOIS, ET CETTE FOIS LA RÈGLE DE D276 ÉTAIT RESPECTÉE

C'est ce qui rend ce lot différent des trois précédents, et ce qui justifie d'étendre la
règle plutôt que de la répéter :

| | où vivait la décision | ce qui a manqué |
|---|---|---|
| 02/09 | un message de **chat** | elle n'était dans aucun fichier |
| 04/09 (D270) | un fichier, mais le bloc de provenance **mentait** | l'état n'était pas relevé |
| 07/09 (D276) | un message de **commit** de fusion | elle n'était dans aucun fichier |
| **08/09 (ici)** | **`ZWADJ_CONTINUITE.md`, correctement** | **un AUTRE fichier d'autorité la contredisait, non barré** |

⛔ **LA LEVÉE DU VERROU ÉTAIT ÉCRITE AU BON ENDROIT DEPUIS LE 07/09.** D276 l'a posée dans
`ZWADJ_CONTINUITE.md`, datée et motivée, et a rouvert la section « PROCHAIN LOT » sur le
rang 8. **La règle de D276 a été suivie à la lettre — et elle n'a pas suffi.**
`ZWADJ_BACKLOG.md`, autorité n°3 de `CLAUDE.md`, portait toujours, dans une entrée
**ouverte** `[PRO][P0]` donc lue comme courante : « **Bloquant déclaré avant S11-b** : le
chemin de l'argent ne s'attaque pas avec une porte fiable à 90 % ».

⚠ **MESURÉ, ET C'EST LA MESURE QUI DÉSIGNE LE REMÈDE** : `S11-b` apparaît **8 fois** dans
`ZWADJ_BACKLOG.md`, dont **deux** déclarent le lot bloqué. **L'une des deux était
correctement encadrée** — elle vit dans une entrée `[x]` dont l'en-tête barré dit « CONSTAT
D'ORIGINE, CONSERVÉ POUR LA TRACE […] ne pas le lire comme l'état courant » — **l'autre
non.** Le passage n'était donc pas absent, il était **partiel** : quelqu'un a bien traité
l'une des deux occurrences. **Une passe partielle se lit exactement comme une passe
faite** — c'est le motif de l'audit tronqué (D200) appliqué à la documentation.

⇒ **RÈGLE ÉTENDUE, ÉCRITE DANS `AGENTS.md`** : écrire la décision dans **un** fichier
d'autorité ne suffit pas. **Le geste suivant est de CHERCHER, dans les autres fichiers
d'autorité, l'affirmation qu'elle invalide, et de la barrer avec son motif.** Cette
recherche est mécanique et n'a aucune excuse : on cherche les mots de l'affirmation
elle-même. ⚠ **Et elle se compte** : on relève le nombre d'occurrences AVANT, on les
traite toutes, et un `[x]` déjà barré ne dispense pas de regarder les autres.

### D277 — les trois écritures, et ce que chacune corrige

| # | où | ce qui était écrit | ce qui l'a démenti |
|---|---|---|---|
| 1 | `ZWADJ_BACKLOG.md`, entrée `[ ]` `[PRO][P0]` | « Bloquant déclaré avant S11-b » | D275 (porte verte au repos) + D276 (verrou levé) |
| 2 | `ZWADJ_CONTINUITE.md`, « État actuel » | « Sept tests d'intégration restent à passer chez Ko » | D275 : `test:int` **434 / 36, exit 0**, sur cette machine |
| 3 | `ZWADJ_CONTINUITE.md`, rang 8 | « `create` pèse **168 lignes** / 123 exécutables » | recompte du 08/09 : **179** total · **164** non vides · **123** exécutables |

⚠ **Les trois sont BARRÉES avec leur motif et leur date, aucune n'est effacée** — forme
attendue depuis D276. Une affirmation supprimée se réécrit de bonne foi plus tard, par
quelqu'un qui n'a aucun moyen de savoir qu'elle a déjà été fausse.

### ⚠ D277 — le chiffre barré n'était pas faux : il était SANS DÉFINITION

Le détail est en tête de la section du rang 8. Ce qui vaut au-delà de ce lot :
**« 123 exécutables » se reproduit à l'unité près onze jours plus tard, « 168 lignes » ne
correspond à aucune des trois façons de compter.** La même mesure, prise le même jour, a
donc vieilli des deux façons possibles — et c'est la **définition écrite**, pas la
fraîcheur, qui a fait la différence.
⇒ Conséquence pour S11-b : le chiffre d'entrée est **123 lignes exécutables**, sa
commande est écrite dans le fichier, et **il se remesure à la sortie** (D261 — un lot de
SRP qui ne se mesure pas avant ET après s'auto-décerne son résultat).

### D277 — les deux décisions de Ko posées dans un fichier, comme l'exige D276

1. ⛔ **La sonde d'état machine : on avance sans.** La réserve n°2 de D275 **reste active
   et écrite** ; l'entrée `[INFRA][P1]` reste ouverte. La sonde s'écrira au premier rouge
   qui demande une attribution sérieuse, **avec le cas réel sous les yeux, pas d'avance et
   à vide**. Motif de Ko : huit rangs dépensés sur la mesure, S11-b livre du produit.
   ⚠ Écrit en toutes lettres dans la section du rang 8, là où la réserve est lue.
2. ⛔ **Le cadrage de S11-b s'écrit dans `ZWADJ_CONTINUITE.md`, dans la section du lot,
   avant toute ligne de code — et il y RESTE, même arbitré et validé.** Motif écrit sur
   place : un cadrage retiré après validation emporte la liste des modes de défaillance,
   et « un mode non listé au cadrage ne se code pas » cesse alors d'être vérifiable.

### D277 — ce qui a été écrit, et où

| Fichier | Ce qui change |
|---|---|
| `ZWADJ_BACKLOG.md` | la phrase « Bloquant déclaré avant S11-b » **barrée** avec son motif et sa date · l'entrée reste **ouverte**, le défaut `act(…)` n'étant pas corrigé — seul le verrou est levé |
| `ZWADJ_CONTINUITE.md` | « Sept tests d'intégration » **barré** · « 168 lignes » **barré**, remplacé par le chiffre d'entrée **123 exécutables** avec sa définition et sa commande · la décision « on avance sans la sonde » · la décision « où vit le cadrage, et il y reste » · cette section · registre |
| `AGENTS.md` | la règle **étendue** : porter la décision partout où un autre fichier d'autorité la contredit, et **compter les occurrences** |

⚠ **POURQUOI `AGENTS.md` EST AU DIFF ALORS QUE KO A DEMANDÉ « TROIS POINTS D'ÉCRITURE »**,
et c'est un élargissement assumé, à trancher : la **leçon** de ce lot est une règle
permanente, et une règle qui ne vit que dans une section de session est de l'histoire, pas
une règle. D276 a mis la sienne dans `AGENTS.md` ; celle-ci l'étend de six lignes, dans le
**même bloc**, sans ouvrir de sujet nouveau. ⚠ Si Ko juge l'élargissement non désiré, il
se retire seul — c'est un bloc contigu.

## Session du 07/09/2026 (après la fusion) — D276 · ce qui vaut décision s'écrit dans un FICHIER

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D275**.

⛔ **ÉTAT : LOT DOCUMENTAIRE, AUCUNE LIGNE DE CODE.** Deux fichiers au diff,
`ZWADJ_CONTINUITE.md` et `AGENTS.md`, **énumérés avant écriture**. Aucune porte n'a été
lancée, et c'est motivé et mesuré plus bas — **rien n'est déclaré vert.**

⚠ **CE LOT NE DÉCOUVRE RIEN : IL CONSTATE.** Tout ce qu'il écrit avait déjà eu lieu la
veille au soir. **C'est exactement le problème.**

### D276 — ⛔ LA FUSION A EU LIEU, ET AUCUN FICHIER D'AUTORITÉ NE LE DISAIT

Relevé `git` le 07/09/2026, pas de mémoire :

| Ce que `ZWADJ_CONTINUITE.md` affirmait | Ce que `git` mesure |
|---|---|
| D271→D275 vivent sur `argon2-vers-test-int`, **non fusionnée** | **fusionnée dans `main`** (`c9f49ed`), **et poussée** sur `origin/main` |
| « **Rien n'est fusionné du fait de cette certification** » (D275) | la fusion a suivi la certification **dans la même heure** (20:31) |
| `D270-autocorrection-chiffres-figes` **existe toujours** | **supprimée**, emportée par la fusion |

**Contrôlé, pas supposé** : `git log main..argon2-vers-test-int` rend **0 commit**,
`git diff main argon2-vers-test-int` rend **0 ligne**, et `git ls-remote --heads origin`
ne liste que `main`.

⛔ **CINQ ENDROITS PORTAIENT L'AFFIRMATION PÉRIMÉE**, tous en gras, tous à l'endroit
exact où on vient les lire : la provenance de D275, les trois blocs « OÙ IL VIT »
identiques de D274, D273 et D272, et le **tableau de provenance** de D270 — c'est-à-dire
le bloc écrit tout exprès pour dire OÙ CHERCHER.
⚠ **C'est le défaut que D270 a corrigé le 04/09, revenu par le même chemin trois jours
plus tard.** Le bloc qui existe pour empêcher qu'on cherche au mauvais endroit est
précisément celui que personne ne pense à mettre à jour — **parce qu'on ne le lit que
quand on cherche déjà.**

### D276 — ⛔ CE QUE ÇA A FAILLI COÛTER : LE VERROU DU CHEMIN DE L'ARGENT

La consigne **« aucun lot de produit ne s'ouvre avant que la porte soit verte »** a tenu
quatre lots durant. La certification D275 l'a **levée** — mais la levée n'existait que
dans le message de la fusion :

> « La consigne "aucun lot de produit ne s'ouvre avant que la porte soit verte" est
> levée. Rang 8, S11-b, chemin de l'argent : nouvelle session, à froid. »

⛔ **Dans les fichiers, la consigne restait écrite comme ACTIVE.** Une session à froid —
c'est-à-dire le test même que « un lot par session » existe pour produire — aurait lu un
verrou **fermé** sur le chemin de l'argent, et un « PROCHAIN LOT » barré « FAIT : D273 »
que rien n'avait remplacé. **La contradiction jouait dans les deux sens à la fois** : le
fichier interdisait ce que la fusion autorisait, et ne nommait pas ce qui venait ensuite.

### D276 — ⚠ TROISIÈME FOIS EN TROIS SESSIONS, SOUS TROIS FORMES DIFFÉRENTES

C'est ce qui en fait une règle et non un incident :
1. **02/09** — « un lot par session » avait vécu plusieurs sessions dans un **message de
   chat** sans jamais atterrir dans un fichier : zéro occurrence dans les trois
   documents, donc plus appliquée, donc trois décisions prises dans la même session ;
2. **04/09 (D270)** — le bloc de provenance affirmait « aucune branche ne porte de lot
   en attente » pendant que quatre lots vivaient sur une branche ;
3. **07/09 (ici)** — la **fusion** et la **levée du verrou** n'existent que dans un
   message de commit.
⛔ **Un message de commit n'est lu par personne à la reprise.** La reprise se fait par
`ZWADJ_CONTINUITE.md` **seul** — c'est la définition de « un lot par session », et c'est
ce qui la rend mesurable. ⇒ **Règle écrite dans `AGENTS.md`**, à côté de celle sur les
extracteurs (D275).

### D276 — la branche : deux affirmations ne pouvaient pas être vraies ensemble

Le message de fusion annonçait « elle est supprimée avec cette fusion » ; `git branch` la
listait toujours. ⇒ **Supprimée**, après contrôle qu'elle ne porte rien.
⛔ **L'autre option — corriger le message — a été ÉCARTÉE, et c'est délibéré** : c'est un
commit de fusion **déjà poussé**, le réécrire est une réécriture d'historique partagé
pour un gain cosmétique. **On rend l'affirmation vraie, on ne la maquille pas.**

### D276 — ce qui a été écrit, et où

| Fichier | Ce qui change |
|---|---|
| `ZWADJ_CONTINUITE.md` | 5 mentions « non fusionnée » **barrées avec leur motif** · tableau de provenance D270 corrigé sur sa colonne « où il vit » · consigne levée, datée et motivée · rangs 7 et 8 mis à jour · section **PROCHAIN LOT** rouverte sur le rang 8 · cette section · registre |
| `AGENTS.md` | la règle « ce qui vaut décision s'écrit dans un fichier d'autorité », **et sa réciproque** : un lot documentaire se commite avant la fin de session, au même titre qu'un lot de code (ajout de Ko, en clôture de ce lot — le cas inverse serait la décision écrite dans le fichier, et le fichier jamais commité) |

⚠ **BARRÉ, PAS EFFACÉ — consigne de Ko, écrite ici pour qu'elle survive à la session** :
une affirmation invalidée qu'on **supprime** se réécrit de bonne foi plus tard, par
quelqu'un qui n'a aucun moyen de savoir qu'elle a déjà été fausse et corrigée. Le dépôt
le pratiquait déjà (le bloc de provenance de D270, la phrase démentie de D272) ; c'est
désormais **la forme attendue**, pas un usage.

### ⛔ D276 — POURQUOI AUCUNE PORTE N'A ÉTÉ LANCÉE, ET COMMENT C'EST MESURÉ

**Ce lot ne touche que deux `.md`.** ⚠ Ce n'est pas une dispense décrétée — « non
concerné » est une **mesure**, pas une impression (D192). **Vérifié** : aucune porte,
aucun test et aucun harnais ne LIT ces fichiers. Cherché sur les lectures réelles
(`readFileSync`, `readFile`, `open(`, `Path(`, `read_text`) visant `ZWADJ_CONTINUITE.md`,
`ZWADJ_BACKLOG.md` ou `AGENTS.md`, dans tout le dépôt, en `.ts`, `.tsx`, `.py`, `.js`,
`.mjs` et `.json`, hors `node_modules` et `dist` : **zéro occurrence**. Les seules
mentions sont des **commentaires** qui citent la doctrine en prose.
⛔ **CE QUI EST DONC AFFIRMÉ, ET RIEN DE PLUS** : la certification de D275 porte sur
l'arbre au commit `f7a87dd`, et ce lot n'ajoute aucun fichier qu'une porte regarde.
⚠ **Elle n'est pas reconduite pour autant.** Elle est datée du 07/09 et **ne se reconduit
pas au lot suivant**, S11-b compris. C'est la règle du rang 7, et elle vaut contre moi
ici comme contre n'importe qui.

## Session du 07/09/2026 — D275 · CERTIFICATION (rang 7) : portes vertes AU REPOS

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D274**.

⛔ **ÉTAT : PASSE COMPLÈTE TENUE, EN UNE SEULE, SUR UN ARBRE QUI N'A PAS BOUGÉ.** Six
portes vertes, e2e verte, barème de D273 tenu en sa moitié repos, `neutralize-solid-s7`
entière, et **182 gardes mordues sur 182 cibles, zéro muette**. État machine relevé avec
son inventaire devant chaque mesure. Le détail est plus bas, et **les réserves qui le
bornent sont écrites AVANT lui**, à la demande de Ko.
⇒ **~~OÙ VIT CE QUI EST CERTIFIÉ : branche `argon2-vers-test-int`, non fusionnée
(section D270). Rien n'est fusionné du fait de cette certification.~~**
⛔ **PÉRIMÉ LE SOIR MÊME, ET LA PHRASE RESTE BARRÉE POUR QU'ON VOIE CE QUI S'EST PASSÉ
ENTRE ELLE ET LA FUSION.** Elle était exacte à la minute où elle a été écrite ; la
fusion a suivi **dans la même heure** (`c9f49ed`, 20:31), et personne n'est revenu la
corriger. ⇒ **Ce qui est certifié vit dans `main`, fusionné et poussé** — relevé `git`
le 07/09/2026, voir **D276**.
⚠ **CE QUI EST ÉCRIT, MOT POUR MOT : « portes vertes AU REPOS le 07/09/2026, et D269,
D270, D271, D272, D273 et D274 en font partie ».** ⛔ **Les en-têtes de ces six sections
ne sont PAS réécrits en « certifié »** — ce serait la certification par procuration que
le rang 7 refuse depuis D270. Ils restent « livré, NON certifié » ; **la marque est
ici, datée, et elle ne se reconduit pas au lot suivant.**

### ⛔ LE PREMIER RELEVÉ A BLOQUÉ, ET C'EST LUI QUI A RENDU LE SECOND POSSIBLE

**Rien n'a rougi : rien n'avait été mesuré.** Les deux ne se ressemblent pas et ne
doivent pas se lire pareil. À la première tentative, le repos n'était pas produisible —
**3 793 Mo** contre une barre à 4 579 — et **aucune passe n'a été lancée**. L'écart a été
attribué par inventaire (`oracle` +607 Mo, `svchost` +484), Ko a arrêté `oracle`, et le
plancher est tombé. ⚠ **Sans le refus initial, cinq passes seraient sorties vertes à
3 793 Mo et auraient été comptées comme « cinq passes au repos »** : le mot sans la
chose, dans une section intitulée « certification ».

### Les deux réserves de la certification — écrites AVANT elle, à la demande de Ko

Elles ne dépendent pas du résultat, et elles s'écrivent **avec** la certification, pas
seulement au backlog : **c'est ce qui distingue une mesure d'une affirmation datée.**

- ⛔ **L'INSTRUMENT D'ÉTAT MACHINE NE VIT PAS DANS LE DÉPÔT.** Tous les états relevés
  pour cette certification l'ont été par un script qui vit dans le **scratchpad de la
  session**, hors du dépôt et hors de `git`. Conséquence exécutoire : **la session
  suivante ne pourra ni le rejouer, ni le contester, ni distinguer un écart de machine
  d'un écart d'instrument.** Un relevé irreproductible n'est pas une mesure — c'est une
  affirmation datée, et elle doit être lue comme telle. ⚠ Et la **calibration est
  HÉRITÉE du 03/09/2026** : l'instrument retenu ce jour-là sur charge connue
  (`Win32_PerfFormattedData_PerfOS_Processor`, contre `Win32_Processor.LoadPercentage`
  écarté) a été **réemployé sans être recalibré**. Ce qui a été vérifié à chaque relevé
  est bien plus faible : que les champs ne sortent pas **vides** (`ECHEC-INSTRUMENT`
  plutôt qu'une chaîne vide, leçon du rang 6). **Non vide n'est pas juste.**
  ⇒ Remède déjà rapporté, **non fait ici** : `neutralisation/sonde-etat-machine.py`,
  entrée `[INFRA][P1]`. Tant qu'elle n'existe pas, **cette réserve se recopie dans
  chaque certification** — elle ne s'éteint pas en étant écrite une fois.
- ✅ **ZÉRO NODE PENDANT LA MESURE — C'EST UN FAIT DE LA CERTIFICATION, PAS UN DÉTAIL.**
  Aucune pile `pnpm dev`, aucun `next dev`, aucun `vite`, aucun `tsc --watch` : **aucun
  observateur de fichiers ne recompilait pendant que les suites lisaient les mêmes
  fichiers.** C'est exactement le facteur que **D274 a nommé sans pouvoir le
  reproduire** — neuf processus node relevés le 03/09 à 00:10, dont quatre observateurs
  — et qui reste à ce jour la seule piste non écartée de l'intermittence de
  `venue-list.test.tsx`. **Son absence fait donc partie des conditions dans lesquelles
  la porte sera déclarée verte**, et par là de ce que la certification vaut : elle ne
  dira **rien** de la porte pendant qu'une pile `dev` tourne — c'est-à-dire pendant le
  régime de travail ordinaire. Le compte de node se relève devant **chaque** passe,
  jamais une seule fois en ouverture.

### Le relevé du 07/09/2026 qui BLOQUE, avec son inventaire

Chrome fermé sur demande — **absent de l'inventaire, vérifié** (`CHROME=0`).
⚠ **ET LA RAM N'A PAS SUIVI : mon estimation « ~5 990 Mo » était FAUSSE.** Elle
additionnait naïvement le working set de Chrome à la RAM libre ; la mesure dit
**3 793 Mo** (médiane de 6 relevés sur 60 s, bande 3 726–3 834, stable et en légère
remontée). **Une addition n'est pas une mesure** — elle en a seulement la forme, ce qui
est très exactement le motif des instruments écartés au rang 6.

| | Plancher 03/09 | Barre D273 | Mesuré 07/09 | |
|---|---|---|---|---|
| RAM libre | 5 326 Mo | 4 579 Mo | **3 793 Mo** | ⛔ **−1 533 / −786** |
| node | 0 | 0 | **0** | ✅ |
| CPU médiane (étendue) | 17 % (5–28) | *barre annulée* | 18 % (0–28) | ✅ même régime |

**Inventaire** : Code 22 proc / 2 545 Mo · svchost 105 / 1 715 · **oracle 1 / 1 199** ·
Memory Compression 671 · vmmemWSL 554 · msedgewebview2 396 · explorer 335 · msedge 311 ·
claude 309 · powershell 272 (dont la session) · Docker 247 · MsMpEng 175 · sqlservr 112 ·
le reste sous 230. Total **14 049 Mo sur 367 processus**. `zwadj-db` (postgres:18) debout
depuis 10 jours, 5432 exposé — `test:int` aura ce qu'il lui faut.

⚠ **CE QUE L'ÉCART EST, ET CE QU'IL N'EST PAS — attribué par INVENTAIRE, à MOITIÉ.**
Postes **nommés dans les DEUX relevés**, seuls comparables : `oracle` **+607** ·
`svchost` **+484** · WSL **+125** · Code +54 · Docker −53 · `claude` −34. Soit **~1,2 Go
sur les 1,5 Go manquants**. ⛔ **Le reste n'est PAS attribuable** : l'inventaire du 03/09
s'arrêtait à « le reste sous 200 Mo » sans le détailler, donc aucun poste absent de sa
liste ne peut être déclaré « nouveau » — il était probablement là, sous le seuil affiché.
**C'est la limite d'un inventaire tronqué : il ne se compare qu'AU-DESSUS de sa coupe.**

⛔ **RÈGLE CORRIGÉE, ET C'EST LA LEÇON DU JOUR (dictée par Ko, 07/09/2026) : UN
INVENTAIRE PORTE LE TOTAL DES PROCESSUS ET LEUR NOMBRE, pas seulement les postes
au-dessus d'un seuil.** Le seuil reste — lister 367 processus n'apprend rien — mais
**seul le total borne ce qu'on n'a pas listé.** Sans lui, la coupe est un trou muet : ici
elle laisse **~300 Mo sur 1 500 inattribuables**, et rien dans le relevé du 03/09 ne
permet de dire si ces 300 Mo sont un poste qui a grossi sous la barre ou une centaine de
petits qui ont bougé ensemble. **Avec le total, le résidu se calcule** (total moins la
somme des postes nommés) : il cesse d'être inconnu pour devenir **borné**, ce qui suffit
à conclure ou à s'abstenir en connaissance de cause.
⚠ **La forme minimale d'un relevé d'état est donc de CINQ quantités**, pas trois : RAM
libre · compte de node · CPU (médiane et dispersion) · **total des processus** · **leur
nombre** — puis l'inventaire nommé au-dessus du seuil. Le relevé du 07/09 les porte
toutes ; celui du 03/09 n'en portait pas les deux dernières, **et c'est pour cela que
cette comparaison-ci est restée à moitié faite**. La prochaine certification héritera du
même trou si la règle n'est pas dans la sonde.
⇒ Deux postes portent l'essentiel et **n'ont rien à voir avec Zwadj** : `oracle`
(1,2 Go) et `sqlservr` (112 Mo). ⚠ Docker, lui, **doit rester** : il porte `zwadj-db`,
sans quoi `test:int` n'a plus de base.

### ⛔ POURQUOI LA PASSE N'A PAS ÉTÉ LANCÉE QUAND MÊME

Une passe jouée hors de l'état cible **mesure autre chose et se lit exactement pareil** —
c'est ce qui a fait écarter la 6ᵉ passe du rang 6 (RAM 1 306 Mo, Chrome revenu), et sans
cette assertion elle serait « probablement sortie verte » et serait entrée dans le compte.
Cinq passes vertes prises à 3 793 Mo ne seraient pas « cinq passes au repos » : elles
porteraient le mot sans la chose, dans une section intitulée « certification ».
⛔ **Et il n'était pas question de redéfinir « repos » sur ce plancher-ci en passant** :
la règle d'arbitrage a **déjà** été jouée le 03/09, verdict « le barème de D273 tient tel
quel ». La rejouer trois jours plus tard parce que la machine est plus chargée, ce serait
la certification obtenue en déplaçant la barre — ce que le refus du plafond relevé de
`walkin-journey` a écarté quatre jours plus tôt. **Si la barre doit bouger, c'est une
décision de Ko, elle prend un numéro, et le nombre de passes se DÉRIVE** (marge sur le
`testTimeout` de 5 000 ms + dispersion entre passes), **sans jamais redescendre sous
cinq**.

### D275 — la passe, dans l'ordre où elle a été jouée

⚠ **Le plancher retrouvé, mesuré avant de lancer quoi que ce soit** : RAM libre
**4 732 Mo** (médiane de 6 relevés sur 60 s, bande 4 666–4 974), **node 0**, CPU médiane
18 % (13–28), total **12 344 Mo sur 347 processus**. ⛔ **La marge est MINCE : +153 Mo sur
la médiane, +87 au point bas.** C'est pourquoi chaque passe porte son assertion, et non
la campagne entière.
⚠ `sqlservr` (107 Mo) est **resté allumé** — relevé, sans conséquence sur la barre.

| Étape | Code | Durée | Ce qui a été mesuré |
|---|---|---|---|
| 5 passes suite pro | **0** ×5 | 31–34 s | 28/28 fichiers, **347/347** tests, **0 avertissement `walkin-journey`** |
| `neutralize-solid-s7` | **0** | 83 s | pré-vol **client ET pro** verts, **2/2 mordues** |
| `typecheck` | **0** | 19 s | 4 paquets, **API comprise** |
| `lint` | **0** | 13 s | 4 paquets |
| `test` (racine) | **0** | 59 s | **1 310 tests / 107 fichiers** — api 640 · api-client 36 · client 287 · pro 347 |
| `build` | **0** | 39 s | client + pro + api |
| `test:int` | **0** | 303 s | **434 tests / 36 fichiers**, `zwadj-db` (postgres:18) réel |
| `e2e` | **0** | 118 s | **34 passés, 1 ignoré, 0 instable** |
| `lancer-campagnes --tout` | 1 | 1 844 s | **173 mordues · 0 muette · 9 non mesurées** · 25 campagnes |
| les 9, en mode `--int` | **0** | — | **9/9 mordues** ⇒ **182 sur 182, zéro muette** |

**État devant les cinq passes** (RAM · node · CPU médiane) : 4 740 · 0 · 21 % — 4 819 · 0
· 21 % — 4 823 · 0 · 7 % — 4 906 · 0 · 16 % — 4 940 · 0 · 0 %. Toutes au-dessus de la
barre, aucune écartée.
⚠ **Les 9 `act(...)` du journal pro viennent de `venue-form` (6) et `venue-wizard` (3)**,
couverts par leurs entrées `PLAFONDS` — **aucun de `walkin-journey`** — et leurs comptes
sont **identiques sur les cinq passes**, là où ce compte flottait (293 · 294 · 295) sous
charge. **Le barème de D273 est tenu en sa moitié repos.**
⚠ **Le test e2e ignoré est NOMMÉ**, parce qu'une certification doit dire ce qu'elle n'a
pas joué : `a5-cold-reload-vs-spa.e2e.ts:175` — « le calendrier d'une salle survit au
rechargement ».

### ⛔ D275 — LES « 9 NON MESURÉES » N'ÉTAIENT PAS MUETTES : ELLES N'ÉTAIENT PAS JOUÉES

**C'est le fait nouveau de cette passe, et il vaut au-delà d'elle.** Le relevé de
référence du dépôt annonce depuis D268 « **164 mordues sur 173, 9 NON MESURÉE déjà
documentées** », formule qui se lit comme une limite acquise. **Mesuré : les neuf mordent
toutes.** Elles portent `hors exécution : course / int-reservations / int-visites`, et
`lancer-campagnes.py --tout` **ne joue pas les mesures d'intégration** — les harnais
concernés les gardent derrière un drapeau `--int`. Joué : `neutralize-solid-s6` **6/6**,
`neutralize-e3d1-s8` **8/8**.
⛔ **C'est D262 et D268 une TROISIÈME fois** : un empêchement du bac à sable web — pas de
PostgreSQL — s'est recopié de rapport en rapport après avoir disparu, et **couvrait
exactement ce qu'il prétendait signaler**. Neuf gardes du chemin de l'argent et des
notifications (index partiel d'intention de paiement, relecture du perdant, abonnements
`visit.booked`) figuraient comme « non mesurées » alors qu'elles sont mesurables **sur ce
poste depuis le 30/08**.
⇒ **Rapporté au backlog, PAS corrigé ici** (défaut croisé) : `--tout` devrait soit jouer
les mesures `--int`, soit **dire qu'il ne les joue pas** — aujourd'hui il rend « 9 non
mesurées » sans nommer le drapeau qui les mesure.

### ⚠ D275 — TROIS FOIS L'INSTRUMENT A ÉTÉ PLUS FRAGILE QUE LA MESURE

Aucun n'a faussé un résultat, **tous ont failli** — et c'est le motif du rang 6, appliqué
cette fois à mes propres extracteurs :
1. `grep "Test Files"` **ne voyait rien** : les résumés Vitest portent des codes ANSI. Il
   rendait zéro ligne sur une passe qui en avait quatre ;
2. le compteur `FAIL` de `test:int` a rendu **1** sur une suite à 434/434 : le mot est
   dans le **NOM** d'un test qui passe (« la ligne passe FAILED (D63) ») ;
3. le chronomètre des campagnes a rendu **1 788 796 851 s** — un horodatage epoch, `t0`
   perdu au passage en arrière-plan. La durée retenue (1 844 s) est celle que l'outil
   mesure lui-même.
⇒ **Les trois se lisaient comme des mesures.** Aucun n'a levé. C'est la règle du rang 6
— *un instrument défaillant ne lève pas, il répond* — et elle vaut pour l'outillage
jetable d'une session autant que pour les sondes du dépôt.

## Session du 03/09/2026 — D274 · `venue-list` : 0 sur 30, et l'écart n'est PAS le code

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D273**.

⛔ **~~OÙ IL VIT : branche `argon2-vers-test-int`, NON fusionnée dans `main`~~** (relevé
`git` le 04/09/2026). ⛔ **PÉRIMÉ PAR LA FUSION DU 07/09/2026 (`c9f49ed`) — barré, pas
effacé : ce lot vit désormais dans `main`.** Tableau de provenance complet en section
D270, corrigé par **D276**.

⛔ **ÉTAT : RANG 6 CLOS EN DOCUMENTANT, PAS EN CORRIGEANT — ET AUCUNE LIGNE DE CODE N'A
ÉTÉ ÉCRITE.** Le rang existait pour reproduire puis corriger une intermittence. **Elle ne
se reproduit pas** : 30 passes, deux formes, deux états machine, **zéro rouge
`venue-list`**. On ne corrige pas ce qu'on ne peut pas faire rougir — on écrit ce qu'on a
mesuré, et ce qu'on n'a pas pu établir.

### D274 — le taux, aux quatre coins

| État | Forme | Passes | Rouges | dont `venue-list` | Durée | RAM devant | CPU devant |
|---|---|---|---|---|---|---|---|
| plancher | A — pro | 10 | 0 | 0 | 28–29 s | 5 340–5 743 Mo | ⚠ non relevé |
| plancher | B — racine | 5 | 0 | 0 | 53–57 s | 5 513–5 560 Mo | 10–19 % |
| charge | A — pro | 10 | **1** | **0** | 34–48 s | 2 408–2 852 Mo | 24–68 % |
| charge | B — racine | 5 | **1** | **0** | 67–69 s | 2 848–3 020 Mo | 20–39 % |

⇒ **`venue-list.test.tsx` : 0 rouge sur 30.** Le fichier est présent dans les 30 journaux,
en échec dans aucun. Contre les **3 sur 5** de D273.

### D274 — ⛔ CE QUI TRANCHE : LE CODE EST LE MÊME, À L'OCTET

**Mesuré, et c'est ce qui clôt le rang** : `git diff --name-only <commit D273> HEAD` rend
**deux fichiers, tous deux `.md`**. **Zéro fichier de code modifié.** `apps/pro` à HEAD est
identique à `apps/pro` au commit de D273.
⚠ **Et les trois rouges de D273 ont été mesurés APRÈS son correctif**, pendant le barème —
son texte le dit, et il avait en plus contrôlé l'arbre d'AVANT, où le fichier rougissait
aussi.
⇒ **Même code, 3 sur 5 chez D273, 0 sur 20 en forme A ici. L'écart ne peut pas être le
code.** ⚠ Piste écartée **par mesure** ; j'avais écrit « cinq commits documentaires, aucun
de code » **sans l'avoir vérifié**, alors que D273 touchait bien deux fichiers du paquet
pro. La conclusion était juste et ne tenait qu'à la chance — c'est Ko qui a exigé le
contrôle.

### D274 — ⛔ CE QUE L'EXPÉRIENCE DE SÉPARATION A RENDU, ET CE QU'ELLE N'A PAS RENDU

Elle devait départager **contention** et **observateurs de fichiers**, en supposant que
`venue-list` rougirait d'un côté. **Il ne rougit d'aucun.** La séparation ne s'est donc pas
faite.
- **Établi** : la contention seule, dans l'état de D273 (RAM 2 408–3 020 contre ses
  2 247–3 017 ; CPU 20–68 % contre ses 27–79 %), **ne suffit pas** à faire rougir
  `venue-list`. Et la charge **mord réellement** — mesuré, pas supposé : +20 à +65 % sur la
  durée des passes.
- ⛔ **NON établi** : que la pile `dev` soit en cause. Ne pas reproduire une chose n'en
  désigne pas une autre.
- ⛔ **NON établi non plus** : que `venue-list` aille bien. Une absence de reproduction
  n'est pas une absence de défaut, et 0 sur 30 borne un taux, il ne prouve pas un zéro.
⚠ **Deux facteurs de D273 restent NON reproduits, et ils sont nommés pour que personne ne
les redécouvre** : (1) la pile `dev` et ses quatre observateurs ; (2) la NATURE de sa
charge — la sienne venait de processus **occupés par des tests**, la mienne de brûleurs
CPU et de porteurs de RAM. Ce n'est pas la même contention (disque, ordonnancement).

### D274 — le fil produit et NON suivi : ce n'est peut-être pas un fichier, c'est la garde

Les **deux** rouges sous charge tombent sur `account-settings-page.test.tsx`, par un
mécanisme qui **n'est pas une assertion** : `Error: 2 avertissement(s) de console dans un
fichier NON exempté`. **Même fichier, même nombre, même message** que ce que D272 avait
classé SENSIBLE à tort la veille.
⇒ Hypothèse écrite au backlog, **[PRO][P1]**, avec ses trois occurrences datées : ce ne
serait pas un fichier qui porte un défaut, mais **la garde console qui tombe sous charge
sur le fichier que l'ordonnancement désigne**. C'est peut-être ce que `venue-list` a été.
⛔ **Rapporté, pas ouvert** : un défaut croisé se rapporte.

### D274 — ⚠ CE QUE CE LOT NE LIVRE PAS À LA CERTIFICATION

Le rang 6 existait pour rendre la porte fiable. **Il ne la rend pas verte sous charge** :
il remplace un bloqueur non reproductible par un bloqueur **nommé et mesuré** (2 rouges sur
15 sous charge, sur la garde console). Au **plancher**, en revanche, **0 rouge sur 15** aux
deux formes.
⇒ Conséquence pour le rang 7 : son barème exige « cinq passes au repos **plus deux sous
charge encaissable** ». La moitié « repos » est atteignable aujourd'hui ; la moitié « sous
charge » rencontrera la garde console. **Le dire maintenant évite de le découvrir au
moment de certifier cinq lots.**

## Session du 03/09/2026 — rang 6 · les mesures (détail)

⛔ **Aucun numéro de décision : rien n'est tranché.** Ce sont des mesures, et elles sont
consignées ICI parce que leurs journaux vivent dans `.neutralisation-journaux/`, **ignoré
par git** : ils disparaîtront au premier nettoyage, et un chiffre dont la preuve s'est
évaporée redevient un chiffre de mémoire (demandé par Ko).

### Le plancher, AVEC son inventaire — la donnée qui manquait à tous les relevés

| | Barre | Mesuré le 03/09 |
|---|---|---|
| RAM libre | 4 579 Mo | **5 326 Mo** ✅ |
| node | zéro | **0** ✅ |
| CPU (instrument calibré) | *barre annulée* | médiane **17 %**, étendue 5–28 |

**Inventaire** : `Code` 21 proc / 2 491 Mo · `svchost` 99 / 1 231 · `oracle` 592 · WSL 429
· `claude` 343 · Edge d'arrière-plan 613 · Docker 300 · le reste sous 200 Mo.
⇒ **Verdict de la règle écrite d'avance (rang 7) : le barème de D273 TIENT tel quel.** La
session produit 5 326 Mo **avec VS Code ouvert**, donc la question « 4 579 incluait-il VS
Code ? » est sans objet en pratique. Rien n'est redéfini, le nombre de passes ne monte pas.

### ⛔ LE TAUX AU PLANCHER : **0 SUR 15**, LES DEUX FORMES

| Forme | Passes | Rouges | `venue-list` | Durée | RAM devant | CPU devant |
|---|---|---|---|---|---|---|
| A — `--filter @zwadj/pro test` | 10 | **0** | jamais | 28–29 s | 5 340–5 743 Mo | ⚠ non relevé |
| B — racine, tous paquets | 5 | **0** | jamais | 53–57 s | 5 513–5 560 Mo | 10–19 % |

La forme B a bien joué **tout** l'espace de travail — vérifié dans le journal, pas
supposé : api **640/640** (56 fichiers) · api-client **36/36** (3) · client **287/287**
(20) · pro **347/347** (28), soit **1 310 tests sur 107 fichiers**. ⚠ Le résumé de
campagne n'affichait que la DERNIÈRE ligne `Test Files` — celle de `pro` — ce qui donnait
« 28 passed » pour une passe qui en jouait 107. L'extracteur montrait moins que la mesure.

⇒ **Ce que le chiffre autorise** : contre les **3 rouges sur 5** de D273, si le taux
d'échec était resté celui-là, quinze passes vertes d'affilée seraient de l'ordre du
**millionième**. **Quelque chose a réellement changé.** C'est un fait sur les TAUX.
⛔ **Ce qu'il n'autorise PAS** : une absence de reproduction n'est pas une absence de
défaut, et **deux variables ont bougé ENSEMBLE** entre D273 et cette campagne — la pile
`dev` s'est arrêtée **et** la RAM libre est passée de ~2,5 Go à ~5,5 Go. Les attribuer ici
serait ce que D270 a payé trois fois.

### ⚠ LIMITE DÉCLARÉE DE CETTE CAMPAGNE : PAS DE CPU PAR PASSE EN FORME A

Le champ CPU du relevé par passe est sorti **vide sur les dix**, et **sans jamais
échouer** (`RAM=5340Mo CPU=% node=0`). Cause : le filtre `Name='_Total'` s'est perdu dans
l'imbrication des guillemets entre bash et PowerShell, la commande rendant une chaîne vide
au lieu de lever. **C'est le remplacement fantôme du dépôt appliqué à un relevé** — un
champ vide se lit exactement comme un champ mesuré.
⇒ Réparé pour la forme B : instrument déplacé dans un `.ps1` dédié, qui rend
`ECHEC-INSTRUMENT` au lieu du vide, et **pré-volé** avant campagne (les trois champs
doivent être remplis, sinon on n'avance pas).
⛔ **La forme A n'a PAS été rejouée** : la relancer maintenant mesurerait une AUTRE
machine. RAM et node — les deux quantités qui LIENT le plancher — sont relevés
correctement sur les dix passes ; le CPU y manque, et cela reste vrai.

### PostgreSQL, pour la certification

`zwadj-db` (postgres:18) debout depuis 6 jours, 5432 exposé, **PostgreSQL 18.4 répond**,
**40 tables** dans `public`. ⚠ Le rôle est **`zwadj`**, pas `postgres` : ma première
vérification a échoué en supposant le superutilisateur conventionnel au lieu de le
relever. `test:int` aura ce qu'il lui faut.

### ⛔ TROIS INSTRUMENTS ÉCARTÉS PAR LEUR PROPRE CONTRÔLE EN UNE SESSION — C'EST UN MOTIF

Écrit une fois pour toutes à la demande de Ko, pour qu'il cesse d'être redécouvert. Le
relevé HORLOGE (02/09) en avait déjà écarté deux ; cette session en écarte **trois de
plus**, dont deux qui ont failli produire un résultat au lieu d'une erreur :

1. **`Win32_Processor.LoadPercentage`** — ne distingue pas une charge connue de son
   absence (`27, 0, 30, 4` sous charge contre `28, 30, 9, 0` au repos). Écarté par
   **calibration sur charge connue**. ⇒ Sans elle, tous les CPU de cette session — et la
   cible « 6 % » héritée — auraient été du bruit présenté comme des mesures.
2. **Le relevé CPU par passe de la forme A** — filtre `Name='_Total'` perdu dans
   l'imbrication bash/PowerShell : la commande rendait une **chaîne vide sans jamais
   échouer**. Écarté par la **lecture du résumé** (`CPU=%`). ⇒ Un champ vide se lit
   exactement comme un champ mesuré.
3. **Ma propre charge RAM** — première version touchant **un seul octet** toutes les 5 s :
   Windows a rogné l'ensemble de travail des porteurs et la RAM libre est remontée de
   2 352 à **4 299 Mo** pendant qu'on la croyait tenue. Écartée par un **contrôle de
   stabilité sur 60 s** posé avant de s'y fier. ⇒ Sans lui, la campagne aurait tourné à
   ~4,3 Go libres **en s'annonçant « sous charge de D273 »**, serait sortie verte, et
   aurait fait conclure que la contention n'explique rien — sur une charge qui n'existait
   plus.

⛔ **CE QUE LES CINQ ONT EN COMMUN : AUCUN N'AURAIT ÉCHOUÉ.** Tous rendaient une sortie
bien formée. Un instrument défaillant ne lève pas — **il répond**, et sa réponse a la
forme exacte d'une mesure. C'est pourquoi la règle n'est pas « vérifier ses outils » mais
la seule qui morde : **un instrument se calibre sur un cas dont la réponse est déjà
connue, AVANT de lui faire trier ce qu'on ignore.**
⚠ Corollaire, appliqué ici trois fois : le cas connu doit être **produit exprès** —
charge connue, sortie attendue non vide, état devant tenir dans le temps. Un instrument
confronté aux seules données qu'on cherche à trier ne peut pas être pris en défaut.

### ⚠ UN ABANDON EN COURS DE CAMPAGNE N'EST PAS UN ÉCHEC DE CAMPAGNE

La 6ᵉ passe sous charge a **abandonné** : RAM libre 1 306 Mo, hors de la bande
1 900–3 300 assertie avant chaque passe. Cause attribuée **par inventaire, pas supposée** :
**Chrome était revenu** (13 processus, 1 802 Mo), les quatre processus de charge étant
intacts. ⇒ Les cinq passes précédentes **restent valides**, chacune portant l'état relevé
devant elle.
⛔ **Sans cette assertion, la sixième aurait tourné à 1 306 Mo avec Chrome dessus, serait
probablement sortie verte, et serait entrée dans le compte comme « une passe sous la
charge de D273 ».** Une passe jouée hors de l'état cible mesure autre chose et **se lit
exactement pareil**.

### Prochaine mesure : SÉPARER les deux variables confondues

Charge **pure** — CPU et RAM occupés, **aucun observateur de fichiers** — jusqu'à
retrouver l'état de D273 (~2,5 Go libres), puis les deux formes.
- rouge sous charge pure ⇒ c'est la contention ; la piste de la pile `dev` tombe, le
  défaut est réel mais **conditionnel** ;
- vert sous charge pure équivalente ⇒ la charge ne suffit pas, et la piste des quatre
  observateurs qui recompilent pendant la lecture gagne du poids.

## Session du 02/09/2026 — D273 · `act(...)` tardif : 293 → 0, et la sortie de `PLAFONDS`

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D272**.

⛔ **~~OÙ IL VIT : branche `argon2-vers-test-int`, NON fusionnée dans `main`~~** (relevé
`git` le 04/09/2026). ⛔ **PÉRIMÉ PAR LA FUSION DU 07/09/2026 (`c9f49ed`) — barré, pas
effacé : ce lot vit désormais dans `main`.** Tableau de provenance complet en section
D270, corrigé par **D276**.

⛔ **ÉTAT : LIVRÉ, NON CERTIFIÉ — ET LE BARÈME N'EST PAS SATISFAIT.** Il exigeait
**cinq passes à zéro au repos et deux sous charge**. Ce qui a été obtenu, mesuré :
`walkin-journey.test.tsx` est à **zéro avertissement sur 5 passes de la suite pro sur
5**, mais **aucune de ces passes n'a eu lieu au repos** (CPU 27–65 %, RAM ~2,6 Go, là
où le cadrage relevait 6 % et 4 579 Mo), et **trois des cinq sont rouges sur d'AUTRES
fichiers**. ⛔ **Le barème a été fixé avant de mesurer, et c'est précisément pour ne
pas se réécrire maintenant.** Il n'est pas déclaré tenu ; il est déclaré NON TENU, et
la raison est ci-dessous.

### D273 — le relevé qui a commandé le correctif

Reproduit à l'identique du cadrage : **293**, et 293 sur 293 sont des `act(...)`.
L'attribution par test — que le cadrage n'avait pas — montre un motif **parfaitement
régulier**, ce qui exclut l'aléa :

| Émetteur | Compte | Rythme relevé |
|---|---|---|
| `VenueCalendar` | 171 | **3 par montage** ; 6 dans les parcours qui dépassent l'étape date |
| `AuthProvider` | 82 | **2 dans CHACUN des 41 tests** |
| `WalkinJourney` | 40 | **1 par test** (40, un test n'en produit pas) |

23 tests à 6 + 11 à 3 = 171 ; 41 × 2 = 82. **Le total ne se devine pas, il se
décompose.**

### D273 — ⛔ CE N'ÉTAIT PAS « UNE MISE À JOUR APRÈS LA FIN DU TEST »

C'est la phrase que `test-setup.ts` emploie, et elle décrit la famille D269 — pas ce
cas-ci. Ici les trois `setState` de `VenueCalendar` (`setData`, `setError`,
`setLoading`) tombent **PENDANT** le test, simplement **hors de toute fenêtre `act`**.
⇒ **Conséquence qui a orienté tout le lot : ATTENDRE NE LES SUPPRIME PAS.**
`repondreDate` attendait déjà que la case du jour soit ACTIVE — donc que la donnée
soit arrivée — et laissait quand même passer ses 3 avertissements : quand l'attente
rend la main, React a déjà écrit son message. Une attente demande « est-ce arrivé ? » ;
il fallait **ouvrir une fenêtre pour recevoir**, ce que fait `laisserRetomber()`.

### D273 — aucun composant de production n'a bougé, et ce n'est pas une précaution

`VenueCalendar` a **raison** de poser ses trois `setState` après son `await` ; le
défaut était dans le test, qui rendait la main pendant que le travail était en vol.
Les fichiers touchés sont ceux qui étaient énumérés au cadrage, et eux seuls.

### D273 — le correctif, en trois fenêtres et une aide

`laisserRetomber()` = `await act(async () => { await Promise.resolve(); })`, appelée à
**trois moments distincts**, chacun mesuré séparément :

| Front | Moment | Avant → après |
|---|---|---|
| 1 | fin de `setup()` — le bootstrap d'`AppProviders` est encore en vol | 293 → **171** |
| 2 | après l'étape client — l'étape date MONTE `VenueCalendar` | — |
| 3 | après le choix de la date — l'effet du calendrier REJOUE | 171 → **0** |

⚠ **Le compte a été relevé APRÈS CHAQUE FRONT**, comme le cadrage l'exigeait :
`AuthProvider` et `WalkinJourney` sont tombés à zéro au front 1, `VenueCalendar` aux
fronts 2 et 3. ⛔ **Le cadrage disait « ne pas présumer que `VenueCalendar` tombe du
même geste » — il avait raison, mais pas comme prévu** : il ne demandait pas un autre
geste, il en demandait **deux du même**, parce que son effet s'exécute deux fois.
Un seul aurait laissé la moitié des 171 et fait échouer le lot.

### D273 — la preuve : `neutralize-act-plafonds.py`, 4 cibles, 4 mordues

- **C1, C2, C3 — classiques** : chaque fenêtre `act` est retirée à son tour, le
  fichier doit devenir **ROUGE**. Les trois mordent. ⚠ Sans les trois séparément, une
  seule fenêtre pourrait porter toute la charge pendant que les deux autres décorent.
- **C4 — INVERSÉE, et c'est elle qui mesure la SORTIE de `PLAFONDS`** : on retire la
  même fenêtre que C1 **et** on remet l'exemption, plafond 999. Le fichier doit rester
  **VERT**. Il l'est. ⇒ Le rouge de C1 vient donc de **l'absence d'exemption**,
  c'est-à-dire que la garde est bien **armée** sur ce fichier — et non d'un test qui
  casserait pour une autre raison. **Sans C4, C1–C3 seraient compatibles avec un
  fichier toujours exempté dont un test tombe.**

### D273 — ⚠ MON PROPRE HARNAIS A PRODUIT UNE ERREUR DE SCRIPT, ET ELLE VALAIT LA PEINE

La vérification post-mutation était « l'ancre a disparu ». **C4 est une INSERTION** :
son remplacement CONTIENT l'ancre, qui est donc toujours là après coup. Le harnais a
donc levé « la mutation n'a pas été appliquée » sur une mutation **parfaitement
appliquée** — une erreur d'outil qui se lit exactement comme un défaut de code.
⇒ La vérification compare désormais à l'**ÉTAT ATTENDU**, ce qui couvre les deux
formes et attrape en prime la **mutation inerte** (un remplacement de même valeur, qui
ne mesure rien — D236).
⚠ Au passage, la sauvegarde disque de D224 a fait son travail : l'arbre est reparti
propre au démarrage suivant, sans intervention.

### D273 — ⛔ POURQUOI LE BARÈME N'EST PAS TENU, EN DEUX FAITS MESURÉS

**1. La machine n'a jamais été au repos de la session.** État relevé DEVANT chaque
passe (D270) : CPU 27 %, 30 %, 31 %, 34 %, 35 %, 57 %, 65 %, 79 % ; RAM libre 2 247 à
3 017 Mo. Le cadrage appelait « repos » 4 579 Mo et 6 %. **Cinq passes prises dans ces
conditions ne sont pas cinq passes au repos**, et les appeler ainsi ferait exactement
ce que D270 interdit.

**2. Trois passes sur cinq sont rouges — sur des fichiers que ce lot ne touche pas.**
`venue-list.test.tsx` (×3) et `account-settings-page.test.tsx` (×1).
⛔ **ATTRIBUÉ PAR CONTRÔLE, PAS SUPPOSÉ** : l'arbre **d'avant le lot** a été remonté et
mesuré dans les mêmes conditions — `venue-list.test.tsx` y échoue **aussi**
(RAM 2 572 Mo, CPU 35 %). **Cette intermittence est antérieure et étrangère à ce lot.**
Reportée au backlog, non corrigée ici : un défaut croisé se rapporte.

**3. Sous charge produite, la suite s'effondre — sur les DEUX arbres.** À 12 processus
occupés : 72 échecs, 76 délais dépassés. À 4 processus : 14 échecs sur l'arbre du lot,
3 sur l'arbre d'avant, **`walkin-journey` en échec dans les deux cas, par EXPIRATION à
5 000 ms**. ⚠ Ses avertissements sous charge (4, puis 7) sont la **conséquence** des
tests interrompus — `test-setup.ts` écrit noir sur blanc que ce bruit-là ne se juge pas
sur une suite par ailleurs rouge. **Ce ne sont pas des avertissements de la famille
corrigée ici.**
⇒ **Ce qui reste vrai et mesuré : dès que le fichier va au bout, il est à ZÉRO.**

### D273 — le volet indépendant : la règle du maximum déclare enfin ses conditions

`test-setup.ts` disait « on garde le MAXIMUM de trois relevés » **sans dire de quoi**.
Trois relevés au repos rendent trois fois le même chiffre et se lisent comme une
confirmation ; c'est une confirmation de la MACHINE. Mesuré : 293 · 293 · 293 au repos,
294 sous charge, 295 dans la porte complète — le plafond gelé valait 293, c'est-à-dire
le maximum de trois passes qui ne pouvaient pas le dépasser, et il a fait tomber la
porte. La règle exige désormais **au moins une exécution sous charge et une dans la
porte complète**, avec l'état machine relevé devant chacune.

### D273 — ⛔ CE LOT A PÉRIMÉ L'ANCRE D'UNE AUTRE CAMPAGNE, ET IL LA RÉPARE

Le tri (`lancer-campagnes.py`) a retenu **trois** campagnes. Deux passent :
`neutralize-act-plafonds` **4/4** et — contrôle qui comptait — `neutralize-horloge`
(D272) **2/2**, donc mes fenêtres `act` n'ont pas périmé les ancres du lot précédent.
La troisième, `neutralize-solid-s7`, s'est arrêtée sur `ERREUR DE SCRIPT : 0
occurrence(s)`.

⛔ **C'est ce lot qui l'a cassée.** Sa cible **S7-2** renommait la clé
`"src/dashboard/walkin-journey.test.tsx"` dans `PLAFONDS` pour prouver que vider la
liste d'exemptions fait tomber les fichiers qu'elle couvre. **Cette clé n'existe
plus** — c'est l'objet même du lot. ⚠ **Un lot ne laisse pas derrière lui une campagne
qui ne démarre pas** : elle se lirait comme un défaut de code au prochain passage,
exactement le piège que le dépôt a déjà payé.
⇒ **Cible RÉORIENTÉE, par écrit, dans le script** : son INTENTION est inchangée
(« vider la liste d'exemptions du pro fait tomber ce qu'elle couvre »), seul son SUJET
passe à `venue-form.test.tsx`, exemption qui subsiste. Le commentaire dit aussi ce
qu'il faudra en faire le jour où `PLAFONDS` sera vide côté pro : **la retirer**, pas
la re-pointer au hasard.
⚠ **Son intitulé ne porte plus de compte.** Il annonçait « les 64 avertissements du
parcours » — faux depuis longtemps. Mesuré en le réorientant : `venue-form` rend **6**
au relevé et **1** sous une autre répartition, sans qu'une ligne bouge. Ce que la
cible mesure est « le fichier TOMBE », pas « il tombe avec n ».

⛔ **SIXIÈME FICHIER AU DIFF, HORS DE L'ÉNUMÉRATION DU CADRAGE, ET DÉCLARÉ COMME TEL :**
`neutralisation/neutralize-solid-s7.py`. Le cadrage en énumérait cinq. Celui-ci n'est
pas un élargissement de périmètre — c'est la réparation de ce que le lot a cassé.

### D273 — ⚠ LA CIBLE RÉORIENTÉE A ÉTÉ VÉRIFIÉE SÉPARÉMENT, ET VOICI POURQUOI

`neutralize-solid-s7` **n'a pas pu être rejouée en entier** : son pré-vol exige une
suite **client** verte, et la suite client est rouge. ⛔ **Mesuré, pas supposé** :
l'arbre **d'avant ce lot** a été remonté et la suite client y est rouge **aussi**
(2 fichiers), avec un ensemble de fichiers fautifs qui **change d'une passe à
l'autre** — `venue-detail-view` deux fois, puis `search-view`, `availability-calendar`,
`account-settings-view`. ⚠ Un test **SYNCHRONE** y expire à 5 000 ms, avec
`collect` à 284 s : **c'est la machine qui est mesurée, pas le code** (D270). Ce lot
ne touche rien dans `apps/client`.
⇒ La cible S7-2 a donc été vérifiée **sur sa moitié pro**, isolément : ancre présente
**une fois**, mutation appliquée, `venue-form.test.tsx` **tombe** avec
« avertissement(s) de console dans un fichier NON exempté », arbre restauré et
vérifié. **La campagne complète reste à rejouer sur une machine calme** — c'est une
limite déclarée, pas un résultat.

### D273 — portes

`typecheck` **0** · `lint` **0** · `walkin-journey.test.tsx` seul : **41/41, 0
avertissement** · harnais du lot **4/4** · `neutralize-horloge` **2/2** · suite pro :
**347/347** sur les passes vertes, rouge par intermittence pour la cause antérieure
ci-dessus.
⛔ **NON LANCÉS, ET DÉCLARÉS TELS** : `pnpm build`, `test:int`, la suite e2e, et
`lancer-campagnes.py --tout`. Ce lot ne touche aucun code de production, mais **cela
ne les rend pas verts** — cela les rend non mesurés, ce qui n'est pas la même chose
(D262).
⛔ **Rien n'est déclaré vert au-delà de ce qui a été lancé.**

## Session du 02/09/2026 — D272 · l'horloge gelée, et les fixtures qui en dérivent

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D271**.

⛔ **~~OÙ IL VIT : branche `argon2-vers-test-int`, NON fusionnée dans `main`~~** (relevé
`git` le 04/09/2026). ⛔ **PÉRIMÉ PAR LA FUSION DU 07/09/2026 (`c9f49ed`) — barré, pas
effacé : ce lot vit désormais dans `main`.** Tableau de provenance complet en section
D270, corrigé par **D276**.

⛔ **ÉTAT : LIVRÉ, NON CERTIFIÉ.** ⚠ Cette ligne portait « LIVRÉ » seul : en tête
d'une file de quatre lots non certifiés, c'est le mot qui décide de la lecture, et
« LIVRÉ » se lit comme clos. **La porte `test` sort en 0 AU REPOS** — état machine relevé
avant la mesure : RAM libre 4 579 Mo, CPU 6 %, zéro processus node. api 640/640 ·
api-client 36/36 · client 287/287 · **pro 347/347**, zéro délai dépassé.
⛔ **« Verte au repos » n'est PAS « verte ».** ~~argon2 (1 test) et sharp (2 tests)
restent capables de la faire rougir sous charge : c'est le lot sharp qui suit.~~
⚠ **RECTIFIÉ LE 02/09/2026, QUELQUES HEURES PLUS TARD DANS LA MÊME JOURNÉE.** La
phrase barrée était exacte quand elle a été écrite ; elle a cessé de l'être avant la
fin du jour. argon2 a quitté la suite unitaire (D271), et **sharp est requalifié SANS
OBJET SUR MESURE** : API **640/640, zéro délai dépassé, à 8, 24 et 48 processus**,
état machine relevé avant chacune — le test sharp le plus lourd garde **2,1× de
marge** à 48 processus contre un budget de 5 000 ms. Relevé complet dans
`ZWADJ_BACKLOG.md`.
⛔ **SA CONDITION DE VALIDITÉ EST STRICTE, ET ELLE FAIT PARTIE DU CONSTAT : sharp ne
tombe plus PARCE QUE les cinq tests argon2 ont quitté la suite unitaire API.** Ce
n'est pas sharp qui s'est amélioré, c'est la pression qui a baissé. **Si du travail
coûteux revient en unitaire dans `apps/api` — un KDF, un traitement d'image, un
chiffrement — la marge se referme et sharp retombe.** Il est **déchargé, pas réglé** :
sans cette phrase, la prochaine lecture sera « sharp est réglé ».
⇒ Ce qui tient encore la porte sous charge n'est donc **ni argon2 ni sharp**, mais le
plafond d'avertissements de `walkin-journey.test.tsx` — c'est le lot qui suit, cadré
en tête de ce fichier. **Ce lot ne certifie rien** — ni D269, ni D270, ni D271, ni
lui-même.

### D272 — un seul fichier, et c'est le verdict de la sonde qui l'a dit

Sur les **28 fichiers de test d'`apps/pro`**, la sonde en désigne **UN** :
`walkin-journey.test.tsx`. Deux méritent d'être nommés parmi les insensibles :
- `account-settings-page.test.tsx` — d'abord classé SENSIBLE, **à tort** : ses
  échecs étaient `2 avertissement(s) de console`, c'est-à-dire un artefact de la
  sonde elle-même (voir plus bas) ;
- `request-scope.test.tsx` — **insensible bien que sa fixture expire le 12/09/2026**.
  Sa date n'est comparée à rien. ⇒ **La table des échéances n'est pas une liste de
  défauts**, et cette phrase est désormais écrite au-dessus d'elle au backlog.

### D272 — ⛔ LA PROPRIÉTÉ VISÉE N'EST PAS « ÇA REPASSE AU VERT »

C'est **l'insensibilité à TOUTE date**, et elle tient à une condition : `MAINTENANT`
est la **seule date écrite** du fichier, tout le reste en DÉRIVE (`jour(5)`,
`jour(-9)`, `jour(21)`…). Vérifié en relevant les littéraux : il en reste **un**.

⚠ **Pourquoi la formulation compte.** Décaler les dates aurait rendu le vert
immédiat et reconduit le défaut d'un mois. Garder une date en dur à côté du gel
aurait laissé **deux valeurs à maintenir**, qui divergent au premier changement de
fixture. La dérivation supprime la seconde valeur ; c'est la propriété, le vert
n'en est que la conséquence.

### D272 — la preuve est BILATÉRALE, et c'est ce qui la rend une preuve

`neutralisation/neutralize-horloge.py`, **2 cibles, 2 mordues** :
- **C1, classique** — le gel est retiré ⇒ le fichier doit devenir **ROUGE**. Prouve
  que le gel MORD, et non qu'il décore.
- **C2, INVERSÉE** — l'ancre est déplacée de **dix ans** ⇒ le fichier doit rester
  **VERT**. Prouve que toutes les fixtures dérivent : s'il en restait une écrite en
  dur, elle divergerait et le test tomberait.
⚠ **Une cible inversée se lit à l'envers** : « la mutation ne change RIEN » est le
succès. C'est la seule façon de mesurer une INSENSIBILITÉ — aucune
mutation-qui-fait-rougir ne peut la démontrer.

### D272 — ⛔ TROISIÈME INSTRUMENT ÉCARTÉ… PUIS RÉPARÉ ET GARDÉ

Après les deux du relevé (gel global, détection statique), la sonde elle-même a
produit un faux positif : `account-settings-page.test.tsx` désigné SENSIBLE alors
que ses seuls échecs étaient la garde des avertissements console. **Les faux timers
perturbent l'ordonnancement asynchrone de React**, produisent des `act(...)`, et la
garde les transforme en échecs. C'est **le mécanisme qui avait déjà invalidé
l'instrument global, revenu par fichier — assez discret pour passer pour un
résultat.**
⇒ La sonde écarte désormais un rouge dont **toutes** les causes sont cette garde.

### D272 — la sonde a ABANDONNÉ sur le fichier qu'elle venait de faire corriger

Rejouée après le correctif, elle a refusé de rendre un verdict : son cas de
calibration positif était `walkin-journey.test.tsx`, **que ce lot vient de rendre
insensible**. Un lot qui corrige son propre cas de calibration détruit la preuve que
l'instrument sait détecter.
⇒ **Cas positif SYNTHÉTIQUE** : la sonde fabrique une copie temporaire du fichier
corrigé, **privée de son gel**, et exige qu'elle ressorte SENSIBLE. Elle se
recalibre donc sur le correctif lui-même, et reste capable de prouver qu'elle
détecte. **Calibrée 3/3.**
⚠ C'est la leçon « une cible devenue sans objet se réoriente ou se retire, par
écrit » — appliquée cette fois à l'instrument, pas à une cible.

### D272 — le gel vit PAR FICHIER, et la raison est écrite là où on serait tenté de factoriser

`apps/pro/src/test-setup.ts` porte désormais l'interdiction et sa **mesure** : gel
global posé à la date du jour ⇒ **26 échecs au lieu de 24** ; posé loin ⇒ la
collecte entière tombe. Sans cette note, quelqu'un remonterait le gel un jour en
croyant simplifier, et casserait la suite de la même façon.

## Session du 02/09/2026 — lot HORLOGE, relevé préalable (sans numéro)

⛔ **Aucun numéro de décision** : ce relevé ne tranche rien, il prépare. Le numéro
se prendra au cadrage du correctif, en LISANT le registre.

### HORLOGE — le relevé statique

**57 fichiers de test portent une date en dur. DEUX figent l'horloge**
(`venues-public.service.spec.ts`, `availability-calendar.test.tsx`). Aucun des deux
`test-setup.ts` partagés n'en pose. 37 fichiers portent des dates déjà passées.

### HORLOGE — ⛔ DEUX INSTRUMENTS CONSTRUITS, DEUX INSTRUMENTS ÉCARTÉS PAR LEUR PROPRE CONTRÔLE

⚠ **C'est le vrai produit de ce relevé, et il vaut mieux que la liste qu'il devait
produire.**

**Instrument 1 — le voyage dans le temps.** Injecter un gel d'horloge dans le
`test-setup.ts` partagé, avancer à 2027 puis 2028, lire ce qui tombe. Sortie
apparente : 28 fichiers rouges côté pro, 18 côté client — **dont `ui-tokens.test.ts`
et `theme-toggle.test.tsx`, qui ne contiennent aucune date.**
⇒ **Contrôle qui l'invalide** : la même injection posée à la date **du jour**, où
rien ne doit changer, rend **26 échecs au lieu de 24**. L'instrument perturbe ce
qu'il mesure ; aux dates lointaines il fait tomber la collecte entière (« no
tests »). Un `useFakeTimers` global entre en conflit avec les tests asynchrones.
**Écarté.**

**Instrument 2 — la détection statique des lectures d'horloge.** Chercher
`new Date()`, `Date.now()`, `today` dans le test et dans le module voisin qu'il
exerce, pour ne garder que les fichiers réellement exposés. Sortie : 24 candidats
sur 56, ce qui avait l'air d'un bon tri.
⇒ **Invalidé par le SEUL cas dont la réponse est connue** :
`walkin-journey.test.tsx` — le fichier qui échoue en ce moment même — en ressort
**classé sans risque**. La lecture d'horloge est faite par un composant plus bas
dans l'arbre, pas par le module de même nom. **Un classificateur qui rate le cas
connu ne peut pas trier les 56 autres. Écarté.**

⛔ **CE QUE J'AURAIS LIVRÉ SANS CES DEUX CONTRÔLES** : une liste de 24 fichiers « à
corriger » **dont celui qui est cassé aurait été absent**. Elle aurait eu l'air
d'un relevé complet — la forme exacte d'un audit tronqué (D200).
⚠ **Un instrument se calibre sur des cas dont on connaît déjà la réponse, AVANT de
lui faire trier ce qu'on ignore.** Cette règle existait pour les tests ; elle vaut
pour les outils de relevé.

### HORLOGE — la seule information sûre SANS instrument : les échéances

**19 fichiers** n'ont que des dates futures : ils passent aujourd'hui et tomberont
le jour dit. Cela ne demande aucun jugement sur ce qui compare une date à
« maintenant » — c'est une date de péremption, pas un défaut. **Table complète au
backlog.**
⚠ **Extraction VALIDÉE** (`fromisoformat`) après que le premier extracteur eut rendu
`2026-13-01` et `2027-02-31` : **12 chaînes écartées, le compte passe de 20 à 19.**
⛔ **`request-scope.test.tsx` expire le 12/09/2026 — dans dix jours.**
⚠ **Neuf fichiers partagent l'échéance 2027-08-15** : le jour venu, ce n'est pas un
test qui tombe mais une grappe — et une grappe se lit comme une panne, pas comme une
péremption.

## Session du 01/09/2026 — D271 · argon2 quitte l'unitaire pour `test:int`

⛔ **Numéro pris en LISANT le registre de ce fichier** : le dernier attribué était **D270**.

⛔ **ÉTAT : LIVRÉ, NON CERTIFIÉ.** La porte `test` reste rouge **sous charge** — ~~sharp
la tient encore (lot suivant)~~. Ce lot ne prétend pas la rendre verte, et il ne
certifie donc ni D269 ni D270.
⚠ **LE RENVOI EST PÉRIMÉ DEPUIS LE 02/09/2026 : sharp est requalifié SANS OBJET sur
mesure** (rang 4 de l'ordre des lots), précisément **parce que** ce lot-ci a sorti les
cinq tests argon2 de la suite unitaire. Le constat daté reste vrai au 01/09 ; c'est le
« lot suivant » qui a changé — il est désormais le rang 5, `act(...)` tardif.

### D271 — ⛔ UNE TROISIÈME CAUSE, TROUVÉE EN RELANÇANT LES PORTES : L'HORLOGE

⛔ **La porte `test` est rouge sur `@zwadj/pro`, et ce n'est ni argon2 ni sharp.**
Trouvé le 01/09 en relançant la passe finale : `walkin-journey.test.tsx` rend **24
échecs sur 41**, tous en `expect(element).toBeEnabled()`. **Mesuré aussi sur `main`,
sans mes changements : 24 échecs identiques.** Le défaut n'est pas de ce lot.

⚠ **ET LA MÊME COMMANDE RENDAIT 347/347 LA VEILLE, DANS CETTE SESSION.** Aucune
ligne n'a bougé entre les deux. Ce qui a bougé, c'est **la date** : la session a
franchi minuit, on est passé au 01/09/2026.

⛔ **CAUSE PROUVÉE, PAS DÉDUITE.** Le fichier fixe une fenêtre
`from: "2026-08-01", to: "2026-08-31"` et des dates `2026-08-15/16/22`, **sans figer
l'horloge**. Ces dates sont désormais PASSÉES, le calendrier les refuse, le bouton
reste désactivé. Reproduction : `vi.setSystemTime("2026-08-10")` ⇒ **41/41 VERT** ;
horloge réelle ⇒ 24 rouges. Horloge restaurée après la mesure, rien laissé dans
l'arbre — vérifié.

⚠ **LA LEÇON EXISTAIT DÉJÀ, ÉCRITE, ET N'A PAS ÉTÉ APPLIQUÉE ICI** (D213, D227) :
« figer l'horloge, jamais choisir une date dans le futur — elle cesse de l'être, et
la suite rougit sans qu'une ligne de code ait bougé ». Une règle consignée ne
protège que les fichiers qui l'appliquent.

⛔ **CE QUE ÇA CHANGE POUR L'ORDRE DES LOTS.** Contrairement à argon2 et sharp, ce
défaut est **DÉTERMINISTE** : il ne dépend d'aucune charge, il rougit à chaque
exécution, et il ne se réparera pas seul. **Il devient la cause dominante de la
porte rouge**, devant les deux autres. Tant qu'il est là, la porte ne redeviendra
verte à AUCUNE charge — donc D269 et D270 ne pourront pas être certifiés.
⇒ **Entrée backlog P0 ouverte.** ⛔ **NON corrigé dans ce lot** : il ne touche ni
l'authentification ni argon2, et un défaut croisé se RAPPORTE, il ne se corrige pas
dans un lot qui parle d'autre chose.
⚠ **Le correctif n'est pas « décaler les dates »** — ce serait reconduire le défaut
d'un mois. Et **rien ne dit que ce fichier soit le seul** : un balayage fait partie
du correctif.

⚠ **CE QUE CET ÉPISODE DIT DE MES PROPRES MESURES.** Ma première mesure de la
session — « la porte racine sort en 0 » — était **exacte au moment où je l'ai
prise**, et fausse quelques heures plus tard. Une porte n'est pas verte : elle a
été verte, à une date, sur une machine. C'est D218 sous un autre angle — la mesure
était juste, ce qui a changé, c'est le monde autour d'elle.

### D271 — ce que le lot achète exactement : CINQ exposés deviennent UN

`password.service.spec.ts` payait le KDF réel sur **5 de ses 7 tests**, dans une
suite au budget de 5 000 ms qui parallélise ses fichiers. Après le lot, **un seul**
test de la suite unitaire paie un vrai argon2.

| Test d'origine | Coût mesuré au repos | Sort |
|---|---|---|
| produit un hash `$argon2id$` différent du mot de passe | ~80 ms | **reste unitaire** (écart MD7) |
| retourne `false` sans lever sur hash malformé | **0 ms** | reste unitaire — argon2 rejette avant tout calcul |
| vérifie le bon mot de passe et rejette le mauvais | ~210 ms | → `test:int` |
| deux hashs du même mot de passe diffèrent (sel) | ~90 ms | → `test:int` |
| `verifyAgainstDummy` retourne toujours `false` | ~270 ms | reste unitaire, **bouchonné** |
| paie un vrai coût argon2 | ~340 ms | **garde REMPLACÉE** |
| mémoïse le hash factice | ~200 ms | **garde REMPLACÉE** |

⚠ **ÉCART AU CADRAGE, déclaré** : le cadrage annonçait TROIS tests partant vers
`test:int`. Il n'y en a que **deux**. « Retourne toujours `false` » ne dépendait
d'aucun argon2 — il payait 270 ms de KDF pour une assertion qui n'en avait pas
besoin. Bouchonné, il reste unitaire et cesse de payer. **Moins de tests
franchissent la frontière que prévu, ce qui réduit d'autant l'exposition à MD6.**

### D271 — MD2 : les deux gardes temporelles sont REMPLACÉES, pas supprimées

Elles comparaient des **durées** : « le factice coûte au moins un tiers d'un verify
réel », « le second appel est plus rapide que le premier ». Une garde qui compare
des durées cesse de mesurer ce qu'elle prétend dès que la machine bouge — et ces
deux-là figuraient parmi les tests qui dépassaient 5 000 ms sous charge.

Elles deviennent **structurelles**, sans horloge : `argon2.verify` est appelé **avec
le hash factice**, et `argon2.hash` est appelé **exactement une fois** sur deux
invocations.

⛔ **CE QU'ON PERD, ÉCRIT PLUTÔT QUE TAIRE** : la preuve par le chronomètre que le
chemin n'est pas gratuit. **CE QU'ON GAGNE** : des gardes qui ne dépendent plus de
la machine, donc qui mesurent encore quelque chose le jour où elle bouge. La
propriété D5 reste couverte pour le **corps** de la réponse par `login.int-spec.ts`
et `google.int-spec.ts` ; ces gardes tiennent le **chemin d'exécution**.

⚠ **Une garde AJOUTÉE, et il faut le dire** : « la préimage du hash factice n'est
PAS le mot de passe soumis ». Elle n'existait pas — la propriété ne vivait que dans
un commentaire. C'est elle qui rend la troisième mutation neutralisable.

### D271 — ⛔ `vi.spyOn` SUR UN OBJET DE MODULE EST REFUSÉ, ET C'EST MESURÉ

Le cadrage signalait le risque sans trancher. Mesuré :

```
Cannot spy on export "verify". Module namespace is not configurable in ESM.
```

⇒ La garde passe par `vi.mock`, **qui bouchonne le module pour TOUT le fichier**.
C'est ce qui impose un **second fichier de spec** : le bouchon ne peut pas cohabiter
avec le test qui exige un vrai argon2. **Deux fichiers, deux régimes, chacun écrit
en tête du sien.**
⚠ La sentinelle `argon2id` du bouchon est un `Symbol`, **jamais la valeur réelle
recopiée de mémoire** : le service ne fait que la transmettre.

### D271 — ⛔ LE HARNAIS A FAILLI RAPPORTER TROIS GARDES MUETTES QUI MORDAIENT

Premier passage : **les trois cibles « MUETTES »**. La garde mordait — vérifié à la
main, 2 échecs sur 3 sous la première mutation. **C'était le LECTEUR qui était
faux** : le motif cherchait `× B1` alors que le rapporteur écrit
`× <chemin> > <describe> > B1 — …`. Un motif qui ne trouve rien se lit **exactement**
comme « la garde est muette ».
⇒ **Le harnais porte désormais un PRÉ-VOL DE SA PROPRE DÉTECTION** : il mute une
fois, exige que le lecteur voie des rouges, et abandonne sinon. Sans lui, ce lot
concluait que la garde MD2 ne mordait pas — et je retirais des gardes en croyant
avoir mesuré. C'est D144 à un étage de plus.

### D271 — ⛔ UN HARNAIS QUI SORT EN 0 PEUT ÊTRE AGRÉGÉ À ZÉRO GARDE

Le harnais mordait sur ses trois cibles et sortait en 0. Passé au tri
(`lancer-campagnes.py`), il a été compté **« 0 mordue, 0 muette, 0 non mesurée »**.

⛔ **Cause** : le tri compte les lignes commençant par `✓` / `✗` et cherche une
ligne de résumé « N garde(s) mordue(s) sur M cible(s) ». Mon harnais écrivait
`MORD | …` et « toutes les gardes mordent ». **Format non conforme ⇒ campagne
invisible à l'agrégat, sans jamais échouer.** C'est pire qu'un rouge : un rouge se
voit. Le format a été **relevé dans la source du tri**, pas deviné.

⚠ **ET DEUX CIBLES ONT ÉTÉ RAPPORTÉES MUETTES POUR UNE RAISON ENCORE PLUS BÊTE** :
en réécrivant le harnais en ASCII, j'ai retapé les noms de tests **sans leurs
accents** — « execute » pour « exécute », « moise » pour « mémoïse ». La garde
mordait ; l'ancre ne correspondait plus. **Un attendu écrit de mémoire, la faute
que ce dépôt attrape en boucle.**
⇒ **Le harnais porte désormais un PRÉ-VOL DES ANCRES** : chaque libellé attendu
doit exister dans la source du spec, sinon il abandonne. Avec les deux pré-vols
(détection et ancres), les trois façons dont ce harnais pouvait mentir en silence
sont fermées.

### D271 — la réserve sur `test:int`, et la mesure qui la lève (ou pas)

⛔ **`test:int` N'EST PAS UNE IMMUNITÉ.** Il tourne sur la même machine. Ce que le
déplacement achète : un budget de 30 000 ms au lieu de 5 000, et
`fileParallelism: false`, qui retire la contention que vitest s'infligeait à
lui-même. **La contention externe demeure entière.**

**Vérification, sous le MÊME proxy de charge que la campagne du 31/08** (charge
comptée et assertie à 9 processus, état machine relevé avant chaque exécution,
sortie dans un fichier) :

| Exécution | RAM libre · CPU | Résultat | Délais | Test le plus lourd |
|---|---|---|---|---|
| fichier déplacé, run 1 | 2 035 Mo · 68 % | 2/2 | 0 | 285 ms |
| fichier déplacé, run 2 | 2 036 Mo · 76 % | 2/2 | 0 | 288 ms |

⚠ **CE QUE CETTE MESURE NE DIT PAS** : un fichier joué seul n'a pas la contention
d'une suite. L'argument qui la rend représentative est **structurel** — `test:int`
tourne en `fileParallelism: false`, un fichier à la fois y est la règle — mais un
argument structurel non mesuré reste une déduction. **Mesuré, donc :**

**Suite d'intégration COMPLÈTE sous la même charge** (9 processus, RAM libre
1 896 Mo, CPU 70 %) :

| Mesure | Valeur |
|---|---|
| résultat | **434/434, sortie 0** |
| délais dépassés | **0** |
| durée | 641 s, contre 477 s au repos — **facteur 1,34** |
| `password-hashing.int-spec.ts` | **443 ms** |
| test le plus lent de toute la suite | 13 504 ms, sous le budget de 30 000 ms |

⇒ **443 ms sous la charge exacte qui faisait dépasser 5 000 ms à ces mêmes tests
dans la suite unitaire.** Et la suite entière ne ralentit que d'un facteur 1,34 là
où l'unitaire ralentissait au point de rendre des grappes d'échecs : c'est la
sérialisation qui fait la différence, pas le budget seul.
⚠ **Ce qui reste à surveiller, et qui n'est pas de ce lot** : le test le plus lent
de `test:int` consomme déjà 13 504 ms sous charge, soit moins de la moitié du
budget de marge. La destination n'est pas infiniment élastique.

⛔ **UNE FAUTE DE MÉTHODE À CONSIGNER, PARCE QU'ELLE EST EXACTEMENT LA RÈGLE QUE
D270 VENAIT D'ÉCRIRE.** Une première exécution de cette suite complète a été lancée
en arrière-plan, **puis le harnais de neutralisation a tourné pendant qu'elle
tournait** — or ce harnais MUTE `password.service.ts`, que cette suite lit. La
mesure était sans valeur : arrêtée, arbre vérifié non muté après la mise à mort,
charge purgée, mesure refaite **seule**. Les chiffres ci-dessus sont ceux de la
mesure propre.
⇒ **Corollaire pratique** : une mesure de fond et un harnais de mutation ne
cohabitent jamais, même quand l'un est « juste en arrière-plan ».


## Session du 31/08/2026 — D270 · le mode d'exécution de la suite pro

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D269**.

⛔ **ÉTAT : LIVRÉ, NON CERTIFIÉ — la porte `test` reste rouge SOUS CHARGE.**
⚠ **Corrigé le 01/09/2026** : cette ligne portait « rouge sur argon2 ». **Faux, et
mesuré faux** — `image-pipeline.spec.ts` (sharp) tient la porte tout autant. Relevé
complet plus bas : « LA PORTE N'EST PAS ROUGE SUR ARGON2 SEUL ».
Les changements de CE lot sont vérifiés (pro 347/347 deux fois avec la borne,
38-40 s), mais la porte prise dans son ensemble ne l'est pas. **Même règle que
pour D269** : un lot ne se certifie pas sous une porte rouge, quelle qu'en soit
la cause. La certification des deux lots viendra avec argon2, qui est le seul
rouge restant.

### D270 — OÙ VIVENT LES LOTS NON CERTIFIÉS : DEUX ENDROITS, ET CE BLOC DISAIT L'INVERSE

⛔ **~~AUCUNE BRANCHE NE PORTE DE LOT EN ATTENTE. LES DEUX SONT DANS `main`.~~**
⛔ **RÉÉCRIT LE 04/09/2026 SUR MESURE `git`, ET LA PHRASE BARRÉE RESTE POUR QU'ON VOIE
CE QU'ELLE A COÛTÉ.** Elle était exacte le 31/08, quand deux lots existaient. **Quatre
lots ont été livrés depuis, tous sur une branche**, et personne n'est revenu ici : le
bloc écrit pour dire OÙ CHERCHER affirmait donc l'inverse de l'état réel, en gras, à
l'endroit exact où on vient le lire. **C'est le défaut que ce dépôt corrige en boucle,
appliqué au bloc qui devait l'empêcher.**

Relevé le 04/09/2026 par `git`, pas de mémoire — `main` et `origin/main` sont tous deux
à `790ae01` :

| Lot | Où il vit | État |
|---|---|---|
| **D269** | **`main`**, fusionné | livré, **NON certifié** |
| **D270** | **`main`**, fusionné (`1f85aa6`, puis un commit documentaire) | livré, **NON certifié** |
| **D271** | ~~branche `argon2-vers-test-int`, non fusionnée~~ ⇒ **`main`**, fusionné (`c9f49ed`) | livré, **NON certifié** |
| **D272** | ~~branche `argon2-vers-test-int`, non fusionnée~~ ⇒ **`main`**, fusionné (`c9f49ed`) | livré, **NON certifié** |
| **D273** | ~~branche `argon2-vers-test-int`, non fusionnée~~ ⇒ **`main`**, fusionné (`c9f49ed`) | livré, **NON certifié** |
| **D274** | ~~branche `argon2-vers-test-int`, non fusionnée~~ ⇒ **`main`**, fusionné (`c9f49ed`) | livré (aucune ligne de code), **NON certifié** |

⛔ **COLONNE « OÙ IL VIT » CORRIGÉE LE 07/09/2026 SUR RELEVÉ `git` (D276) — COLONNE
« ÉTAT » VOLONTAIREMENT INTACTE.** Une fusion change **où un lot vit**, elle ne certifie
rien. ⚠ **Et ces lots SONT couverts** par la certification du 07/09 — **mais sa marque
vit à UN SEUL endroit, daté, en section D275**, et ne se recopie pas colonne par
colonne : ce serait la certification par procuration que le rang 7 refuse depuis D270.
**Pour savoir ce qui est certifié, on lit D275, pas cette table.**

⛔ **~~`argon2-vers-test-int` porte VINGT ET UN commits d'avance sur `main`~~**
(`git log --oneline main..HEAD`) : D271 à D274 et leurs commits documentaires.
⛔ **PÉRIMÉ LE 07/09/2026 — la branche a été fusionnée puis SUPPRIMÉE (D276).** Elle en
portait **23** au moment de la fusion : les 21 relevés le 04/09, plus les deux commits
documentaires de D275. ⚠ **Ce chiffre n'était pas faux quand il a été écrit — il a péri
parce que le travail a continué.** C'est le motif des compteurs figés appliqué à un
compte de commits : un nombre relevé un jour se lit comme un fait le lendemain.
⚠ **~~`D270-autocorrection-chiffres-figes` EXISTE TOUJOURS (`8d1bd4f`), non
fusionnée.~~** ⛔ **PLUS VRAI (D276)** : elle était **entièrement contenue** dans
`argon2-vers-test-int`, la fusion l'a donc emportée, et elle n'existe plus. Vérifié le
07/09/2026 : `git branch -a` ne liste que `main` et `origin/main`. **La prédiction de
D271 — « elle se supprime une fois la première partie » — s'est vérifiée, avec trois
jours de retard sur ce que ce bloc annonçait.**

⛔ **DEUX fichiers tiennent la porte, pas un** (mesuré le 01/09/2026) :
`password.service.spec.ts` (argon2) **et** `src/media/image-pipeline.spec.ts`
(sharp). Les deux dépassent le même budget de 5 000 ms sous charge, et le second
est apparu **seul** dans une exécution rouge. ⚠ La phrase précédente disait « le
seul rouge restant » : c'est elle qui aurait orienté la session suivante vers un
lot argon2 censé rendre la porte verte.

⚠ **CE QUI NE SE VOIT NULLE PART AILLEURS, ET QUI EST TOUT L'OBJET DE CE BLOC** :
un lot non certifié peut attendre **dans `main`** (D269, D270) **ou sur une branche**
(D271 à D274), et **les deux cas coexistent aujourd'hui**. Qui ne cherche qu'à un seul
des deux endroits en trouve la moitié et conclut sur le tout — c'est ce que la première
écriture de ce bloc garantissait. Rien dans `git`, aucune porte, aucun fichier de
configuration ne dit que des lots non certifiés dorment dans `main` ; une branche, au
moins, se voit. **La seule marque est ici**, et dans l'en-tête d'état de CHAQUE section
concernée — c'est pourquoi elle est posée des DEUX côtés, et pourquoi **D272, D273 et
D274 ont reçu la leur le 04/09/2026** : elles ne disaient pas où elles vivaient. D271
la portait déjà, dans sa sous-section « DEUX BRANCHES EMPILÉES ».

⚠ **Ce que la porte redevenue verte permettra d'écrire, et rien de plus** :
« porte `test` verte à cette date, D269 et D270 en font partie ». ⛔ **NE PAS
réécrire leurs en-têtes en « certifié »** — ce serait la certification par
procuration refusée plus bas.

### D270 — ⛔ LA CONTRADICTION, ET CE QU'ELLE TRANCHE : MES QUINZE EXÉCUTIONS MESURAIENT LA MACHINE

Ko a relevé une incohérence que je n'avais pas vue : `apps/pro/package.json`
définit `test` comme **`vitest run`, sans drapeau**, et le bloc `test` de
`apps/pro/vite.config.ts` ne portait **ni `fileParallelism` ni `maxWorkers`**
(vérifié : `environment`, `setupFiles`, `globals`, rien d'autre). La porte tourne
donc exactement dans le mode que j'avais mesuré à 32-36 échecs — elle aurait dû
être massivement rouge sur pro, pas « rouge à cause d'argon2 ».

**Commandes exactes de chaque mesure, pour qu'on sache ce que chacune vaut :**

| Étiquette | Commande réelle | Ce que c'est |
|---|---|---|
| « PRO-PAR » | `pnpm --filter @zwadj/pro test` → `vitest run` | **le mode de la porte** |
| « PRO-SER » | `pnpm --filter @zwadj/pro exec vitest run --no-file-parallelism` | drapeau que la porte n'utilise **jamais** |
| porte | `pnpm test` → … → `vitest run` par paquet | **identique à PRO-PAR** |

⇒ **PRO-PAR ET LA PORTE SONT LA MÊME COMMANDE.** La contradiction n'était donc pas
entre deux modes, mais entre deux **états de machine**. Rejouée sous charge légère,
la commande exacte de la porte rend :

| Run | RAM libre · CPU | Résultat | Délais dépassés | Durée |
|---|---|---|---|---|
| 1 | 3841 Mo · 17 % | 347/347 | 0 | 36 s |
| 2 | 3875 Mo · 14 % | 1 échec / 346 | 0 | 35 s |
| 3-8 | 3783-3912 Mo · 7-19 % | 347/347 (×6) | 0 | 34-35 s |

**7 verts sur 8, ~35 s.** Contre 32-36 échecs et 125-177 s pendant les quinze
exécutions. ⛔ **Même commande, 4× plus lente : c'était la charge.**

⛔ **CE QUE JE DOIS RETIRER.** D269 affirme « LE CORRECTIF D'ATTENTE AGGRAVE LE MODE
PARALLÈLE » et « la suite pro est inexploitable en parallèle ». **Les deux sont
FAUX**, et ils sont déjà fusionnés dans `main`. Contrefactuel mesuré sous charge
légère, fichiers pré-D269 restaurés depuis `d334fc5` :

| Version | 3 runs | Durée |
|---|---|---|
| **pré-D269** | 347/347 · 347/347 · 347/347 | 34-35 s |
| **D269** | 7 verts sur 8 | 34-36 s |

⇒ **D269 n'a PAS aggravé la porte.** Il n'a pas non plus certifié quoi que ce soit
sous une porte rouge — cela reste vrai — mais la porte n'était pas rouge pour la
raison que j'avais écrite.
⚠ **Troisième fois dans cette session qu'une mesure me renseigne sur la machine
plutôt que sur le code**, et la première où j'en tire une conclusion publiée puis
fusionnée. Une mesure sans état machine relevé n'est pas une mesure.

### D270 — la borne tient dans UN fichier, pas quatre

⛔ **J'avais écrit que borner les workers était « bloqué par l'absence de config
vitest partagée, quatre fichiers à toucher ». Faux pour le cas qui compte** :
`apps/pro/vite.config.ts` a déjà son bloc `test`. Le paquet qui a le problème est
le seul à corriger. Le raisonnement « il faudrait une base partagée » répondait à
un problème général au lieu du problème posé.

Durées mesurées sous charge **identique et légère** (RAM ~4,2 Go, CPU 1-2 %,
zéro processus node — relevé avant chacune) :

| Mode | Durée | Résultat |
|---|---|---|
| défaut (porte) | **35 s** | 347/347 |
| `maxWorkers=4` | **46 s** | 347/347 |
| `--no-file-parallelism` | **92 s** | 347/347 |

⇒ **Retenu : `maxWorkers: 4`** dans `apps/pro/vite.config.ts`. +31 % de durée
contre 2,6× pour la sérialisation, et c'est le mode qui encaissait la charge
(4 délais dépassés contre 46-52 en mode par défaut, mesuré le 30/08).
**Vérifié après application : 347/347 deux fois, 38-40 s.**
⚠ **C'est une ASSURANCE, pas un correctif** : au repos les trois modes sont verts.
Ce qu'on achète, c'est le comportement sous charge.

⚠ **CÔTÉ CLIENT, JE NE PEUX RIEN DÉMONTRER.** `filter-wizard` ne rougit pas au
repos (287/287, défaut 20 s, borne 25 s). Son échec n'apparaît que sous `pnpm test`
complet. **Donc : borne NON appliquée au client**, faute de pouvoir mesurer qu'elle
règle quoi que ce soit. Une borne posée sur une intuition serait un réglage de
plus que personne ne saurait défendre.

### D270 — `maxWorkers` EST BIEN PRIS EN COMPTE : preuve par la borne à 1

⚠ Signal relevé par Ko : `--maxWorkers=4` en ligne de commande donne **46 s**, la
même valeur écrite dans `vite.config.ts` donne **38-40 s**. Deux chemins censés
poser le même réglage ne devraient pas s'écarter de 15 % — et **une option de
config silencieusement ignorée est exactement la classe de défaut que ce dépôt
traque partout ailleurs** : un réglage qui rassure sans rien faire.

Preuve directe — `maxWorkers: 1` posé **dans le fichier**, charge relevée
(RAM 3636 Mo, CPU 28 %, zéro node) :

| Réglage, dans le FICHIER | Durée |
|---|---|
| défaut (aucune clé) | 35 s |
| `maxWorkers: 4` | 38-40 s |
| **`maxWorkers: 1`** | **88 s** |
| (référence) `--no-file-parallelism` en ligne de commande | 92 s |

⇒ **88 s contre 35 s : la clé MORD.** Elle n'est pas décorative. Restauré à 4.
⚠ **L'écart de 15 % entre les deux chemins n'est PAS élucidé, et ne le sera pas
ici** : la question posée était « la clé est-elle prise en compte », pas « d'où
viennent les 15 % ». Ligne de commande et fichier ne fixent pas forcément le même
pool. Consigné comme non expliqué plutôt que comblé par une hypothèse.

### D270 — l'échec isolé : ce que je peux nommer, et ce que je ne peux pas

⛔ **UN ROUGE ÉTIQUETÉ AVANT D'ÊTRE IDENTIFIÉ EST CE QUI A OUVERT TOUTE CETTE
AFFAIRE.** Sept verts sur huit avaient été rapportés sans que le huitième soit
nommé. Reprise du fil :

**Ce que les journaux sauvegardés permettent de nommer** — trois rouges isolés,
tous **ANTÉRIEURS au correctif D269**, tous dans le même fichier :
- `slots-section.test.tsx > l'écran DIT ce qu'il a déduit, avant même l'envoi`
  (`--no-file-parallelism`, machine chargée) ;
- `slots-section.test.tsx > 20:00 → 02:00 part en endMinutes 1560`
  (même mode, graine fixée) ;
- côté client, `filter-wizard.test.tsx > construit l'URL avec les noms et
  l'encodage que /salles LIT` — délai dépassé, défaut connu et distinct.

Les deux premiers sont des instances du défaut que D269 a corrigé : le fichier
rougissait sur des tests VARIÉS, ce qui est la signature d'une garde de fichier
qui lève sur un avertissement tardif, non d'une assertion fausse.

⛔ **CE QUE JE NE PEUX PAS NOMMER, ET JE LE DIS PLUTÔT QUE DE L'HABILLER** : les
deux rouges isolés survenus APRÈS le correctif (un en mode par défaut sous charge
légère, un pendant les quinze exécutions) **n'ont pas été capturés** — leur sortie
n'a jamais touché un fichier. Ils sont perdus.
⚠ **Ils ne se reproduisent pas** : avec la borne en place, **9 exécutions sur 9
vertes**. Ce n'est pas une explication, c'est une absence de récidive.
⇒ **Règle qui en découle, appliquée dès maintenant** : toute campagne de N
exécutions écrit sa sortie dans un FICHIER, pas dans une variable de shell. Un
rouge qu'on ne peut plus relire est un rouge qu'on relancera sans le lire.

### D270 — la garde de ce défaut EXISTE, et le tri a raison de ne rien désigner

⛔ **RETRAIT D'UN REPORT QUE J'AVAIS OUVERT À TORT.** J'avais écrit « aucune
campagne ne garde ce défaut » et proposé d'en créer une. Ko a tranché : vrai au
sens strict, faux au sens qui compte. **La garde est l'`afterEach` de
`apps/pro/src/test-setup.ts`** — celle qui lève sur les avertissements console non
exemptés. C'est elle qui a RÉVÉLÉ le défaut, et elle remordra si quelqu'un
réintroduit une assertion synchrone.
⇒ Le tri ne désigne rien pour ces fichiers, **et c'est le comportement correct**.
Aucune entrée backlog, aucune campagne à créer. Le point est CLOS.

### D270 — ⛔ LA CERTIFICATION À VENIR NE VAUDRA PAS PAR PROCURATION

⚠ **PRÉMISSE CORRIGÉE LE 01/09/2026.** Cette section s'ouvrait sur « le lot argon2
rendra la porte `test` verte » : **il ne le fera pas à lui seul**, sharp la tient
aussi. Ce qui suit reste vrai mot pour mot, et le devient même davantage — la porte
verte viendra d'un TROISIÈME lot, ce qui rendrait la procuration plus tentante
encore.
⛔ **Une porte verte ne certifiera PAS D269 et D270 pour autant.** Trois raisons,
posées par Ko :
- deux lots antérieurs déclarés certifiés par la porte d'un troisième, c'est une
  **certification par procuration** ;
- les deux correctifs pro sont **déjà dans l'arbre** depuis, donc un relevé de
  porte ne dira pas ce que chaque lot a fait **individuellement** ;
- un seul relevé ne peut pas servir de preuve pour trois lots.

⇒ **Ce qu'il faudra écrire, exactement, et rien de plus** :
« porte `test` verte à cette date, D269 et D270 en font partie ».
⛔ **NE PAS réécrire leurs en-têtes en « certifié ».** Ils resteront « livré, non
certifié » — c'est l'état vrai, et le relevé daté suffit à dire le reste.

### D270 — AUTOCORRECTION : SA PROPRE LIVRAISON A FIGÉ TROIS CHIFFRES

⛔ **Le commit `1f85aa6` ajoutait à `AGENTS.md` la règle « RELEVER L'ÉTAT MACHINE
AVANT TOUTE MESURE DE DURÉE » — et gravait, dans le MÊME diff, trois durées sans
état machine.** Trois emplacements :
- la note d'environnement « SUITE PRO » comparait trois durées comme si elles
  étaient des propriétés du dépôt ;
- la règle sur l'état machine citait elle-même une durée et un **compte de tests** ;
- la consigne de fenêtre d'appel dimensionnait le découpage sur un ordre de grandeur.

⚠ **Et les deux premières sont dans la section même où D268 avait écrit qu'aucun
compteur ne s'écrit ici, avec la raison.** Une règle contredite par sa voisine,
dans le fichier chargé à CHAQUE session — donc lue par chaque lecteur avant tout
le reste. ⚠ Ces durées sont par surcroît celles que ce lot venait de démontrer
dépendantes de la charge : elles ne se recopient pas sans l'état qui les rend
lisibles.

⛔ **« CELUI-LÀ EST VÉNIEL, C'EST UN ORDRE DE GRANDEUR » EST LE DÉFAUT LUI-MÊME.**
J'avais classé le troisième à part à ce motif, et Ko l'a refusé. « 18 scripts,
149 cibles » était aussi un ordre de grandeur le jour où on l'a écrit ; D268 l'a
retiré pour cette raison exacte. **Les trois sont traités pareil.**

⇒ **Corrigé** : le VERDICT reste dans `AGENTS.md` — `maxWorkers: 4` retenu, la clé
mord, c'est une **assurance sous charge** et non un correctif ; les CHIFFRES
renvoient à cette section, seule à les porter avec la charge relevée devant
chacune. La consigne de fenêtre d'appel ne contient **plus aucun nombre** : la
passe complète des portes dépasse la fenêtre d'un appel, on la découpe et on relève
la durée de chaque morceau pour dimensionner le suivant.

⚠ **Sans nouveau numéro, et c'est délibéré** : le défaut a été introduit par la
livraison de D270, il lui appartient. `1f85aa6` n'est **pas** réécrit — il est dans
`main`.

⚠ **REPORT, non corrigé ici** (un lot à la fois) : la même section d'`AGENTS.md`
porte encore « Compter ~40 minutes » pour `lancer-campagnes.py`. Même classe,
antérieur à D270 — il ne se corrige pas dans un lot qui parle d'autre chose.

### D270 — ⛔ LA PORTE N'EST PAS ROUGE SUR ARGON2 SEUL (mesuré le 01/09/2026)

⛔ **Consigné SANS nouveau numéro**, comme l'autocorrection ci-dessus : c'est une
mesure qui corrige l'état décrit par D270, pas une décision neuve.

**Objet de la campagne** : Ko a proposé de traiter la contention là où elle naît —
`maxWorkers: 4` dans `apps/api/vitest.config.ts`, comme D270 l'a fait pour pro. Si
la borne suffisait, le lot argon2 devenait **inutile** : aucun test déplacé, aucune
garde de sécurité déportée, aucun compteur bougé.

**Méthode** — charge produite par un générateur **auto-terminant** (il porte son
échéance, donc il meurt seul si le harnais est tué — D224) ; charge **comptée et
assertie** avant chaque exécution par un pré-vol inversé qui ABANDONNE si elle
n'est pas établie ou si des résidus traînent ; état machine relevé avant chaque
mesure ; **sortie de chaque exécution dans un fichier**.

**Suite API complète, charge identique vérifiée à 9 processus :**

| Bras | Résultat | Délais dépassés | Durée | Sortie |
|---|---|---|---|---|
| sans borne | 3 échecs / 638 | 6 | 87 s | 1 |
| sans borne | 6 échecs / 635 | 12 | 211 s | 1 |
| sans borne | 8 échecs / 633 | 16 | 151 s | 1 |
| `maxWorkers: 4` | **641/641** | **0** | 133 s | **0** |
| `maxWorkers: 4` | **641/641** | **0** | 123 s | **0** |
| `maxWorkers: 4` | 5 échecs / 636 | 10 | 212 s | 1 |
| `maxWorkers: 4` | 6 échecs / 635 | 12 | 130 s | 1 |
| `maxWorkers: 4` | 4 échecs / 637 | 8 | 231 s | 1 |

⇒ **Sans borne 0 vert sur 3 ; avec borne 2 verts sur 5.** La borne déplace le taux,
elle ne rend rien de déterministe. **Elle n'est PAS retenue** — un réglage qui
rassure sans trancher est exactement ce que ce dépôt traque.

⛔ **J'AI FAILLI PUBLIER L'INVERSE.** Après les deux premières exécutions bornées —
641/641, zéro délai — « la borne suffit » était écrit. **C'est la troisième qui l'a
réfutée.** Deux exécutions vertes ne sont pas une garantie : c'est mot pour mot la
faute que D270 venait de payer, et elle s'est représentée dans la campagne montée
pour l'éviter.
⚠ Et les deux verts sont tombés aux **RAM libres les plus basses de la campagne**
(2 319 et 2 793 Mo, contre 3 771-4 120 Mo pour trois des rouges) : ils ne
s'expliquent pas par une machine plus clémente. C'est de la variance.

⛔ **CE QUE LA CAMPAGNE A TROUVÉ EN PLUS, ET QUI CHANGE LE PLAN.**
`src/media/image-pipeline.spec.ts` (sharp) dépasse le même budget de 5 000 ms dans
les mêmes conditions, et figure dans **5 des 6 exécutions rouges — parfois seul**.
Le backlog le disait déjà (« argon2 **et sharp** le frôlent sous charge ») ; l'état
courant, lui, décrivait la porte comme rouge sur `password.service.spec.ts`
**uniquement**. ⇒ **Déporter les tests argon2 ne rendra pas la porte déterministe.**

⚠ **LIMITE DE LA MESURE, DÉCLARÉE.** La charge est un **proxy calibré pour
reproduire le rouge**, pas un relevé de conditions ordinaires : au repos la porte
est verte, borne ou pas, avec une marge d'environ 13× sur le test le plus lourd.
Ce qui est établi : sous une charge qui produit le défaut, la borne ne l'élimine
pas. Ce qui ne l'est pas : son effet aux charges intermédiaires, non balayées.

### D270 — ordre des lots, révisé par Ko

⚠ **CET ORDRE EN EST À SA QUATRIÈME ÉCRITURE, ET LES TROIS PRÉCÉDENTES SONT
CONSERVÉES DANS L'HISTORIQUE DU DÉPÔT, PAS ICI.** Écrit « argon2 → S11-b » au motif
qu'argon2 rendrait la porte verte (faux, 01/09) ; puis « argon2 → sharp » au motif
que ces deux-là la tenaient (incomplet, 02/09). **Deux fois la mesure a démenti la
prémisse, jamais le raisonnement.** C'est pourquoi le motif est écrit sous chaque
rang : un ordre sans motif ne se corrige pas, il se recopie.
⚠ **QUATRIÈME ÉCRITURE, 03/09/2026 — ET CELLE-CI NE CORRIGE PAS UNE PRÉMISSE, ELLE
COMBLE UN TROU.** Les trois précédentes changeaient l'ordre parce que la CAUSE du
rouge avait été mal nommée. Ici la cause est bien nommée : c'est le PLAN qui était
incomplet. Il exigeait une porte verte au rang de certification **sans porter le lot
qui l'en empêche** — `venue-list.test.tsx`, qui ne vivait qu'au backlog. Une reprise
par ce fichier seul partait donc sur la certification et découvrait le blocage en le
heurtant. **Un rang faux se voit ; un rang manquant, non.**

⛔ **ORDRE RE-RÉVISÉ LE 02/09/2026 — L'HORLOGE PASSE EN TÊTE** (tranché par Ko).
⛔ **RANG 6 INSÉRÉ LE 03/09/2026 — `venue-list.test.tsx` PASSE AVANT LA CERTIFICATION**
(tranché par Ko) : la certification devient le rang **7**, S11-b le rang **8**.

1. ~~mode d'exécution de la suite pro (D270)~~ — **fait** ;
2. ~~argon2 → `test:int` (D271)~~ — **fait**. ⚠ N'a **pas** rendu la porte verte,
   et ne l'a jamais prétendu ;
3. ~~⛔ **HORLOGE — `walkin-journey.test.tsx` et tout fichier de même famille**~~ —
   **fait (D272)**. ⚠ N'a **pas** rendu la porte verte sous charge, et ne l'a jamais
   prétendu ;
4. ~~**sharp / `image-pipeline.spec.ts`** — entrée backlog P0, campagne pour preuve~~
   — ⛔ **REQUALIFIÉ SANS OBJET SUR MESURE le 02/09/2026**, après le départ des cinq
   tests argon2 : API **640/640, zéro délai dépassé à 8, 24 et 48 processus**, 2,1× de
   marge sur le test le plus lourd. ⛔ **Condition de validité, stricte** : sharp ne
   tombe plus **PARCE QUE** argon2 a quitté la suite unitaire API — il est **déchargé,
   pas réglé**. **Ce rang se ROUVRE** si du travail coûteux (KDF, image, chiffrement)
   revient en unitaire dans `apps/api`, ou si une mesure sous charge redonne un rouge
   sur ce fichier ;
5. ~~⛔ **`act(...)` TARDIF — `walkin-journey.test.tsx` SORT DE `PLAFONDS`**~~ —
   **fait (D273)** : 293 → **0**, entrée retirée, garde armée, harnais 4/4.
   ⚠ **N'a pas rendu la porte verte pour autant**, et ne le prétend pas : il reste une
   intermittence sur `venue-list.test.tsx`, **antérieure et étrangère**, prouvée telle
   par un contrôle sur l'arbre d'avant le lot. Elle est au backlog.
   ⇒ **Ce rang portait le constat d'entrée** : **295 avertissements contre un plafond
   gelé à 293**, dont **293 sur 293 des `act(...)`**
   (`VenueCalendar` 171 · `AuthProvider` 82 · `WalkinJourney` 40).
   ⚠ **Le cadrage validé, le barème de sortie et les fichiers attendus sont en tête de
   ce fichier**, section « PROCHAIN LOT » ; ce rang ne les répète pas. **Deux endroits
   qui répondent à « quoi ensuite » finissent par ne plus dire la même chose** — c'est
   arrivé à ce rang même, qui a annoncé le lot sharp pendant que le backlog le
   fermait ;
6. ~~⛔ **`venue-list.test.tsx` — L'INTERMITTENCE QUI TIENT ENCORE LA PORTE.**~~ — ⛔ **CLOS
   EN DOCUMENTANT le 03/09/2026 (D274) : NE SE REPRODUIT PAS.** 30 passes, deux formes,
   deux états machine, **zéro rouge `venue-list`** — et `apps/pro` est identique À
   L'OCTET au commit de D273, donc l'écart avec ses 3 sur 5 **n'est pas le code**.
   ⚠ **Ne rend PAS la porte verte sous charge** : il remplace un bloqueur non
   reproductible par un bloqueur nommé — la garde console, 2 rouges sur 15 sous charge,
   sur `account-settings-page.test.tsx` (backlog [PRO][P1]). Au plancher : 0 sur 15.
   ⇒ Constat d'origine conservé ci-dessous, il dit ce à quoi le lot devait répondre :
   ⛔ **`venue-list.test.tsx` — L'INTERMITTENCE QUI TIENT ENCORE LA PORTE.** Rouge sur
   **trois passes de la suite pro sur cinq**, relevées le 02/09 pendant le barème de
   sortie de `PLAFONDS` : `Unable to find role="heading" and name "Salle El Ryad"`,
   c'est-à-dire une liste pas encore arrivée au moment de l'assertion. État machine
   relevé devant chaque passe (D270) : RAM libre 2 247–3 017 Mo, CPU 30–65 %.
   ⛔ **ANTÉRIORITÉ PROUVÉE PAR CONTRÔLE, PAS SUPPOSÉE** : l'arbre d'AVANT D273 a été
   remonté et mesuré dans les mêmes conditions — le fichier y échoue **aussi**. Le
   défaut est donc étranger à D273 ; sans ce contrôle il se serait lu comme une
   régression de ce lot, et le lot aurait été refait pour rien.
   ⛔ **NE PAS le traiter en relevant un plafond** : ce fichier n'est pas dans
   `PLAFONDS`, et son échec n'est pas un avertissement — c'est une assertion qui tombe.
   ⚠ **Famille PROBABLE, pas établie : D269** — une attente qui interroge par RÔLE et
   par NOM pendant que la donnée est en vol. **À reproduire et attribuer par mesure
   avant tout correctif**, méthode de D273 : rien n'est présumé de la cause.
   ⇒ Entrée détaillée au backlog, **[PRO][P0] `venue-list.test.tsx`**.
   ⚠ **PISTE, PAS CONCLUSION (03/09/2026) — UNE PILE `pnpm dev` TOURNAIT SUR LE POSTE.**
   Relevé au démarrage de cette session : **9 processus node lancés à 00:10**, soit
   `next dev`, `vite`, l'API Nest et un `tsc --watch` — **quatre observateurs de
   fichiers qui recompilent pendant que les suites lisent les mêmes fichiers**. C'est
   la classe de D270 (« ne jamais éditer un fichier pendant qu'une vérification le
   lit » — 24 échecs sans signification, puis une conclusion fausse tirée d'eux).
   ⛔ **CE QUI EST MESURÉ ET CE QUI NE L'EST PAS.** Mesuré : la pile tournait le
   03/09 à 00:10. **NON mesuré : qu'une pile équivalente ait tourné pendant les
   sessions des 01 et 02/09** — et c'est **invérifiable après coup**, puisque aucun
   relevé du dépôt ne consigne d'inventaire de processus (voir le rang 7). La piste
   est donc plausible et **hors de portée de toute preuve rétrospective**.
   ⛔ **ELLE N'EXPLIQUE RIEN TANT QUE LA MESURE NE L'A PAS DIT**, et il se peut très
   bien que `venue-list` rougisse **aussi machine propre** — c'est exactement ce que
   la première campagne doit trancher. Écrite comme piste pour qu'elle ne se durcisse
   pas en explication commode, même traitement que la piste horloge de D272 ;
7. ~~**CERTIFICATION**~~ — ⇒ **FAIT LE 07/09/2026 (D275)** : six portes vertes au
   repos en une seule passe, e2e verte, **182 gardes mordues sur 182**, six lots nommés.
   ⛔ **une RÈGLE, pas une liste.** Elle porte sur **TOUS les lots
   non certifiés à sa date, quel qu'en soit le nombre**, sur la porte redevenue verte,
   dans les termes fixés plus haut (« porte verte à cette date, tels lots en font
   partie », **sans réécrire leurs en-têtes**). ⚠ **Ce rang portait la liste « D269,
   D270 ET D271 », et elle était déjà fausse en la lisant** : D272 s'est ajouté après,
   sans que personne réécrive la phrase. Une liste de lots dans un plan se périme au
   lot suivant ; une règle non — et c'est la seule raison de ce changement de
   formulation.
   ⛔ **LA LISTE NOMMÉE, TRANCHÉE PAR KO LE 04/09/2026 : D269, D270, D271, D272, D273
   ET D274.** Six lots. ⚠ **La règle ci-dessus ne change pas** — la certification porte
   sur TOUS les lots non certifiés à sa date — **mais elle ne dispense pas de les
   NOMMER.** « Quel qu'en soit le nombre » n'apprend à personne lesquels, et le nombre
   lui-même a déjà été faux deux fois dans ce fichier : « quatre lots attendent
   aujourd'hui » en section D272, « certifier cinq lots » en section D274, alors qu'ils
   sont **six**. ⇒ **Un nombre se périme au lot suivant ; une liste se COMPLÈTE** — un
   lot livré avant la certification s'y ajoute d'une ligne, et l'omission se voit.

   ⛔ **CRITÈRE DE CERTIFICATION — TRANCHÉ PAR KO LE 04/09/2026, ÉCRIT AVANT DE
   MESURER.** C'est le point qui manquait au rang, et il est fixé maintenant pour la
   raison qui vaut partout ici : un critère choisi APRÈS les résultats ne mesure plus
   rien (D273 vient de le payer sur son barème).
   - **CE QUI EST EXIGÉ : la porte verte AU REPOS**, avec l'**état machine relevé et son
     INVENTAIRE** devant chaque mesure — ce qui tourne, pas seulement RAM libre, CPU et
     compte de node. C'est la donnée qui manquait à tous les relevés antérieurs (rang 6,
     03/09), et sans laquelle un état ne se reproduit pas.
   - ⛔ **CE QUI N'EST PAS EXIGÉ : la porte verte SOUS CHARGE.** La fragilité de la garde
     des sorties console **reste au backlog comme DETTE MESURÉE** — `[PRO][P1]`, avec ses
     **trois occurrences datées** (02/09 par la sonde horloge, 02/09 pendant le barème,
     03/09 sous charge assertée). Elle n'est ni effacée, ni requalifiée, ni comptée comme
     réglée : elle est **sortie du critère et laissée visible**, ce qui n'est pas la même
     chose.
   - **LA RAISON, ÉCRITE POUR NE PAS ÊTRE REDÉCOUVERTE** : exiger une porte
     **déterministe sous n'importe quelle charge** est une propriété que **cette machine
     ne peut pas offrir aujourd'hui**. Mesuré, pas supposé : 2 rouges sur 15 sous charge
     assertée, sur un fichier que l'ordonnancement désigne et **qui change d'une campagne
     à l'autre** (D274). Et **six lots attendent depuis cinq jours** — D269 est du 30/08.
     Une barre qu'aucune mesure ne peut franchir ne protège rien : elle immobilise, puis
     elle finit par se baisser en catastrophe le jour où l'attente devient intenable —
     c'est-à-dire exactement la « certification obtenue en déplaçant la barre » que ce
     fichier refuse par ailleurs, mais obtenue plus tard et sous pression. **Une barre
     franchissable qui dit ce qu'elle vaut protège davantage qu'une barre impayable.**

   ⛔ **CE QUE LA CERTIFICATION NE GARANTIT PAS — CE PARAGRAPHE S'ÉCRIT AVEC ELLE, MOT
   POUR MOT.** Sans lui, « certifié » se lira comme « sûr », et c'est plus que ce qui
   aura été mesuré :
   - **elle ne dit rien de la porte SOUS CHARGE.** Elle est prise au repos ; sous
     contention, la garde console tombe encore, sur un fichier variable ;
   - **elle ne dit pas que `venue-list.test.tsx` va bien.** 0 sur 30 **borne un taux, il
     ne prouve pas un zéro** (D274), et le défaut n'a jamais été attribué ;
   - **elle ne dit pas que `sharp` est réglé** : il est **déchargé** parce qu'argon2 a
     quitté l'unitaire, et son rang **se rouvre** si du travail coûteux y revient (D272) ;
   - **elle ne couvre pas ce qu'aucune porte ne regarde** : le navigateur réel, une
     migration sur base NON VIDE, la clause `WHERE` d'une réutilisation d'endpoint, un
     composant jamais monté. Inchangé — rappelé ici parce qu'un mot comme « certifié »
     invite précisément à l'oublier ;
   - **elle porte une DATE et une LISTE, pas un état permanent** : « portes vertes au
     repos à cette date, tels lots en font partie ». Elle ne se reconduit pas au lot
     suivant, et **ne réécrit aucun en-tête** en « certifié ».
   ⛔ **CE QUE LA CERTIFICATION DEVRA PAYER, ÉCRIT LE 03/09/2026 POUR NE PAS ÊTRE
   REDÉCOUVERT** (dicté par Ko ; il ne vivait que dans un fil de chat, et un fil se
   ferme) :
   - **le barème de D273 reste DÛ** — cinq passes de la suite pro à **zéro**
     avertissement sur `walkin-journey.test.tsx` **au repos**, plus **deux sous charge
     encaissable**. D273 a obtenu 5 passes à zéro sur 5, mais **aucune au repos**, et
     l'a déclaré NON TENU plutôt que de réécrire son barème après coup.
     ⛔ **MAIS « AU REPOS » N'EST PAS ENCORE DÉFINI DE FAÇON PAYABLE — QUESTION POSÉE
     PAR KO LE 03/09/2026** : le « 4 579 Mo / 6 % » du cadrage D273 a-t-il été relevé
     **avec ou sans** la session Claude Code et son hôte VS Code, qui coûtent à eux
     seuls **2,4 Go et 21 processus** (mesuré ; `claude.exe` est un enfant de
     `Code.exe`, donc la session ne peut pas s'en passer) ? Si c'était sans, le barème
     exige un état que la session **ne peut pas produire**, et il serait impayable une
     seconde fois.
     ⛔ **LE DÉPÔT NE PEUT PAS RÉPONDRE, ET C'EST LE VRAI CONSTAT.** `VS Code`,
     `Code.exe` et `vscode` ont **zéro occurrence** dans les quatre documents, et
     **TOUS** les relevés du dépôt ne portent que trois quantités — RAM libre, CPU,
     nombre de node. **Aucun ne dit ce qui tournait.** Un état machine sans inventaire
     ne se reproduit pas : c'est la faute des compteurs figés, appliquée aux mesures.
     ⇒ **RÈGLE D'ARBITRAGE FIXÉE AVANT DE MESURER** — D273 vient de payer qu'un barème
     choisi APRÈS coup ne mesure plus rien. On relève le **plancher que cette session
     PEUT produire** : VS Code et `claude` seuls, sans navigateur, sans pile `dev`,
     zéro node.
     - **Si ce plancher atteint 4 579 Mo et 6 %** : le barème de D273 tient tel quel,
       il est payable, **rien n'est redéfini** ;
     - **s'il ne les atteint pas** : « repos » est **redéfini sur ce plancher mesuré**,
       avec sa raison, et les chiffres de D273 restent comme **HISTOIRE, pas comme
       barre**. Le numéro de décision se prendra à ce moment-là, pas avant : rien n'est
       encore tranché.
     ⛔ **REDÉFINIR LE SEUIL SANS REDÉFINIR CE QU'IL GARANTIT SERAIT LA MOITIÉ DU
     TRAVAIL** (ajout de Ko, 03/09/2026, écrit AVANT la mesure). **Cinq passes à zéro
     sur un plancher plus contendu prouvent MOINS que cinq passes sur un plancher
     calme** : chaque passe y est plus près du régime où D273 a mesuré l'expiration à
     5 000 ms et des avertissements qui ne sont que la **conséquence** de tests
     interrompus. Une passe prise près du bruit porte moins d'information qu'une passe
     prise loin de lui — donc il en faut davantage pour la même garantie.
     ⇒ **LE NOMBRE DE PASSES MONTE, ET IL SE DÉRIVE — IL NE SE CHOISIT PAS.** Deux
     quantités se mesurent au nouveau plancher, **avant de compter la moindre passe** :
     1. **la marge sur la contrainte LIANTE** — le test le plus lent de
        `walkin-journey.test.tsx` contre son `testTimeout` de 5 000 ms. C'est par
        expiration que le fichier tombe sous charge (D273) : c'est donc elle qui borne,
        et non la RAM, qui n'est qu'un proxy ;
     2. **la dispersion de cette marge entre passes** — une marge moyenne ne dit rien
        si elle varie du simple au double.
     Le nombre est **fixé et écrit avec ces deux mesures devant lui**, puis les passes
     se comptent. Marge plus mince ou dispersion plus large ⇒ plus de passes.
     ⛔ **ET IL NE REDESCEND JAMAIS SOUS CINQ** : le barème de D273 est un **plancher**,
     pas une référence à renégocier à la baisse. Un seuil redéfini qui achèterait moins
     qu'avant serait une certification obtenue en déplaçant la barre — exactement ce que
     le refus du plafond relevé de `walkin-journey` a écarté trois jours plus tôt.
     ⛔ **L'INSTRUMENT CPU EST DISQUALIFIÉ, ET LA CIBLE AVEC LUI — CALIBRÉ LE
     03/09/2026 SUR UNE CHARGE CONNUE**, parce qu'un instrument se calibre sur des cas
     dont la réponse est déjà connue AVANT de lui faire trier ce qu'on ignore (règle du
     relevé HORLOGE, appliquée cette fois à moi). Quatre boucles saturantes sur
     **12 cœurs logiques**, soit **+33 points attendus** :
     - `Win32_Processor.LoadPercentage` — au repos `28, 30, 9, 0` ; **sous la charge
       connue** `27, 0, 30, 4`. **Il ne distingue pas les deux cas** et rend `0` à
       répétition. ⛔ **ÉCARTÉ** — c'est lui qui a servi à annoncer « CPU 25 % » en
       ouverture de cette session, chiffre qui ne valait donc rien.
     - `Win32_PerfFormattedData_PerfOS_Processor` (`_Total`) — au repos `17, 17, 30,
       16` ; sous charge `49, 53, 53, 22`, soit la ligne de base **+33** sur trois
       relevés sur quatre. ✅ **RETENU**, et **jamais en échantillon unique** : médiane
       d'au moins cinq relevés, dispersion écrite à côté — il varie lui aussi.
     ⛔ **CONSÉQUENCE EN AMONT, ET ELLE PORTE SUR LA CIBLE ELLE-MÊME** (point soulevé
     par Ko) : le « CPU 6 % » du cadrage D273 vient d'un instrument **dont le dépôt ne
     garde aucune trace**. Vérifié : `LoadPercentage`, `FreePhysicalMemory`,
     `PerfFormattedData` et `Get-Counter` ont **zéro occurrence** dans tout le dépôt,
     `neutralisation/` compris. Les relevés d'état machine ont **toujours** été pris à
     la main, par un outil que personne ne peut nommer. **Un 6 % non attribuable ne se
     convertit pas** vers l'instrument retenu : il n'y a rien à convertir. Calibrer
     soigneusement pour viser un nombre produit par un instrument non calibré serait
     absurde.
     ⇒ **LA BARRE CPU HÉRITÉE EST ANNULÉE.** Le CPU **reste relevé** — l'instrument
     existe et il est calibré — mais il **ne porte plus de seuil hérité** : sa valeur
     de plancher s'établit à neuf, en même temps que celle de la RAM. **Ce qui LIE le
     plancher reste : RAM libre + compte de node + INVENTAIRE.** C'est ce qui manquait ;
     un quatrième nombre gardé pour la forme n'aurait rien ajouté.
     ⛔ **Dans les deux cas, tout relevé porte désormais son INVENTAIRE** — ce qui
     tourne, pas seulement ses trois nombres — sinon la question se reposera à la
     session suivante, sans plus de moyen d'y répondre ;
   - **`neutralize-solid-s7` est à rejouer ENTIÈRE.** D273 n'a vérifié que sa moitié
     pro, isolément : son pré-vol exige une suite client verte, qui ne l'était pas.
     Une cible réorientée vérifiée à moitié n'est pas une campagne jouée ;
   - **les six portes, la suite e2e, et `lancer-campagnes.py --tout`** — en **UNE
     SEULE passe**. ⚠ Le point est « une seule » : des portes vertes relevées à des
     moments différents, sur un arbre qui bouge entre elles, ne certifient rien
     ensemble (D218 — l'archive livrée rouge avec une note annonçant « 0 erreur ») ;
8. ~~**S11-b**~~ — ⇒ **SES SIX ÉTAPES SONT FAITES** : cadrage et arbitrage (D278), étapes
   1→3 (D279), étapes 4→6 (D282). ⛔ **MAIS LE RANG N'EST PAS CLOS ET LE LOT N'EST PAS
   CERTIFIÉ** : reste la dérive de somme de contrôle de `_prisma_migrations`, **arbitrage
   OUVERT**, laissée hors périmètre du rang 9 par Ko le 09/09/2026.
   ⚠ « **RANG COURANT depuis le 07/09/2026** » **barré le 09/09/2026 (D283)** : il l'était,
   il ne l'est plus. ⇒ **Où il en est** : section « RANG 8 — S11-b · point d'entrée
   CONSERVÉ », qui garde le cadrage et **la liste de ses modes de défaillance** (D277).
   ⛔ Chemin de l'argent : les modes de défaillance ont été écrits AVANT tout code, et
   l'arrêt franc pour arbitrage a eu lieu — **c'est fait, ce n'est plus une consigne à
   suivre ici.**
9. ~~**CERTIFICATION**~~ — ⇒ **CLOS LE 10/09/2026 (D283)** : marque posée, « portes vertes au
   repos le 10/09/2026, et **D279 et D282** en font partie ». 193 cibles, 193 mordues, zéro
   muette. ⚠ « **RANG COURANT depuis le 09/09/2026** » **barré le 10/09/2026 (D284)** : il
   l'était, il ne l'est plus — même geste que le rang 8 la veille.
   ⛔ **CE QU'IL LAISSE OUVERT** : les deux réserves de D275, reconduites et non levées.
   ⛔ **CE RANG A ÉTÉ ÉCRIT PARCE QU'IL N'ÉTAIT ÉCRIT NULLE PART.** La reprise à froid du
   09/09/2026 a demandé « quel est le prochain lot » et a suivi la route que ce fichier
   désigne : **cette liste s'arrêtait au rang 8**, dont les six étapes étaient faites. Le
   prochain lot n'existait dans aucun des trois fichiers d'autorité. ⚠ **Un rang faux se
   voit ; un rang manquant, non** — la phrase est de la quatrième écriture de cet ordre,
   trois rangs plus haut, et elle vient de se vérifier une seconde fois.
   ⛔ **CE QUI L'IMPOSE, ET CE N'EST PAS UN CHOIX DE CALENDRIER** : `AGENTS.md`, bloc
   « **AUCUN LOT NE PART DANS `main` SOUS UNE PORTE ROUGE** » — « deux lots non certifiés en
   attente sont tenables, **trois non** » (l. 333 au 09/09/2026 ; **c'est la phrase qui fait
   autorité, pas le numéro de ligne**) — **plus** l'arbitrage de Ko du 09/09 selon lequel un
   lot **documentaire** ne compte pas, désormais écrit **à côté de la règle** dans
   `AGENTS.md` et non plus au backlog seul. Les deux lots de code non certifiés étaient **D279
   et D282** ; ~~tout lot de code suivant serait le troisième, et ne peut pas s'ouvrir~~
   ⛔ **BARRÉ LE 10/09/2026 (D284) : la marque du rang 9 a certifié ces deux-là, le compteur
   est retombé à ZÉRO, et c'est ce qui a permis au rang 10 de s'ouvrir.** ⚠ La phrase était
   vraie le 09/09 et elle est au PRÉSENT dans une entrée désormais close : lue seule, elle
   interdit le lot que l'entrée suivante ouvre. **Une entrée close peut porter une phrase
   courante — c'est la passe partielle de D280, et elle se lit comme une passe faite.**
   ⚠ **CE N'EST DONC PAS « IL FAUT CERTIFIER AUJOURD'HUI »** — deux est tenable, et le dire
   fait partie de la règle. C'est « **rien de ce qui touche du code ne s'ouvre avant** ». Ce
   qui attend derrière est `[API][P0]`, sur le chemin de l'argent : les deux échéances ne
   sont assertées que « non nulles », intervertir leurs constantes serait invisible.
   ⚠ **PRÉCÉDENT, PAS INVENTION** : le rang 7 (D275) avait été inséré **avant** S11-b sous
   cette règle exacte, quand trois lots attendaient. Le rang 9 est le même geste, une file
   plus loin — et c'est la deuxième fois que cette règle commande un rang.
   ⇒ **Critère, résolution et état : section « ~~PROCHAIN LOT~~ — rang 9 · CLOS » en tête de
   ce fichier** (titre barré le 10/09, D284). Ce rang dit QUEL lot ; il ne dit pas où il en est.

10. ⛔ **`[API][P0]` — LES DEUX ÉCHÉANCES · RANG COURANT depuis le 10/09/2026 (D284).**
    ⛔ **CHEMIN DE L'ARGENT.** `bookings.int-spec.ts:156` et `:373` n'assertent que « non
    nulles » : **intervertir `PRO_RESPONSE_DAYS` et `PAYMENT_WINDOW_HOURS` entre les deux sites
    d'appel produirait deux dates parfaitement non nulles, et rien ne rougirait.**
    ⛔ **CE QUI L'IMPOSE, ET C'EST UNE RÈGLE, PAS UN CALENDRIER** : `AGENTS.md`, bloc « AUCUN LOT
    NE PART DANS `main` SOUS UNE PORTE ROUGE » — « deux lots non certifiés en attente sont
    tenables, **trois non** » — **plus** l'arbitrage « un lot documentaire ne compte pas »,
    écrit à côté de cette règle depuis D283. La marque du 10/09 a certifié D279 et D282 : le
    compteur de lots de code non certifiés est **à zéro**, donc un lot de code peut s'ouvrir.
    ⚠ **C'est la troisième fois que cette règle commande un rang** — rang 7 (D275) quand trois
    lots attendaient, rang 9 (D283) quand deux attendaient, rang 10 parce qu'elle les a levés.
    ⛔ **ARRÊT FRANC : LE PREMIER LIVRABLE EST UN CADRAGE ÉCRIT**, `CLAUDE.md` — « tout code sur
    le CHEMIN DE L'ARGENT sans analyse écrite des modes de défaillance ». **Fait le 10/09/2026
    (D284)**, aucune ligne de code dans cette session. ⇒ **Où il en est** : section « PROCHAIN
    LOT — rang 10 » en tête de ce fichier, qui porte le cadrage et **ses six modes de
    défaillance**. ⚠ Le cadrage **reste consultable après validation** (D277) : un cadrage retiré
    ne peut plus démentir personne.

⇒ **RANG SUIVANT : EN ATTENTE D'ARBITRAGE DE KO.**
⛔ **CETTE LIGNE EST LA RÈGLE ÉCRITE LE 10/09/2026 DANS `AGENTS.md`, APPLIQUÉE À ELLE-MÊME**
— « **UN RANG CLOS LAISSE UN ÉTAT NOMMÉ, JAMAIS UNE ABSENCE** ». Elle ne dit pas quel sera le
rang 11 : **la session n'arbitre pas l'ordre**, quatre écritures, toutes de Ko. Elle dit que
l'arbitrage est **attendu**, pour qu'une reprise lise un ÉTAT au lieu de tomber sur une liste
qui s'arrête et de conclure, deux jours de suite, que le prochain lot n'est écrit nulle part.
⚠ **Ce qui attend déjà, sans rang et sans priorité entre eux** : les trois `[MÉTHODE][P0]` du
10/09 (budgets de test non écrits, borne de workers sur une suite de quatre, sonde d'état
machine hors dépôt — réserve n°2 de D275), et le reliquat du rang 8 (dérive de somme de
contrôle `_prisma_migrations`, **arbitrage toujours ouvert, interdit d'y toucher**).

⛔ **POURQUOI L'HORLOGE PASSE DEVANT, ET C'EST LE MOTIF QUI COMPTE.** Des trois
causes de la porte rouge, elle est **la seule qui rougisse de façon DÉTERMINISTE**,
sans condition de charge. argon2 et sharp exigent une contention pour tomber : au
repos, ils passent. L'horloge, elle, tombe à **chaque exécution, sur toute machine,
et de plus en plus** à mesure que la fenêtre de fixture s'éloigne dans le passé.
⇒ **Elle rend la porte incertifiable QUOI QU'IL ARRIVE.** Tant qu'elle est là,
aucune charge, aucune borne, aucun déplacement de test ne peut rendre la porte
verte — donc aucune certification n'est possible, pour aucun des lots en attente.
⚠ Cette phrase disait « pour aucun des **trois** lots » : le compte a bougé le
lendemain. Un plan écrit avec le nombre de lots dedans se périme au lot suivant.

⛔ **S11-b EST UN LOT DU CHEMIN DE L'ARGENT ET NE S'OUVRE PAS SOUS UNE PORTE NON
FIABLE.** C'est le point de cet ordre qui ne se négocie pas : sans les rangs 3 à 6,
le rang 8 se mesurerait contre une porte qui ne dit rien.

⛔ **LE CORRECTIF DE L'HORLOGE EST DE FIGER L'HORLOGE, JAMAIS DE DÉCALER LA
FENÊTRE.** Décaler les dates de fixture reconduit le défaut d'un mois : la même
porte redeviendra rouge, un matin, sans qu'une ligne ait bougé — et la prochaine
session cherchera la cause dans le code. ⚠ **Premier geste du lot : un RELEVÉ, pas
un correctif** — rien ne dit que `walkin-journey.test.tsx` soit le seul fichier
concerné, et corriger le seul cas connu laisserait les autres armés.

### D271 — ⚠ DEUX BRANCHES EMPILÉES : ELLES PARTENT ENSEMBLE OU AUCUNE

⛔ **`argon2-vers-test-int` est empilée sur `D270-autocorrection-chiffres-figes`**,
dont elle CONTIENT les commits. Fusionner la seconde sans la première n'a pas de
sens ; fusionner la première seule emporte la seconde. **Cette dépendance est
invisible dès que la session se ferme** — `git` ne la nomme nulle part, et deux
branches côte à côte dans une liste ne disent pas laquelle porte l'autre.

| Branche | Contenu | Dépend de |
|---|---|---|
| `D270-autocorrection-chiffres-figes` | 3 commits documentaires : chiffres figés retirés d'`AGENTS.md`, provenance des lots réécrite, report backlog, correction « la porte n'est pas rouge sur argon2 seul » | `main` |
| `argon2-vers-test-int` | D271, **plus les 3 commits ci-dessus** | la branche ci-dessus |

⇒ **Fusionner `argon2-vers-test-int` suffit** : elle emporte tout. L'autre branche
n'a pas à être fusionnée séparément, et se supprime une fois la première partie.
⇒ ✅ **EXÉCUTÉ LE 07/09/2026, ET LA PRÉDICTION ÉTAIT JUSTE (D276)** : `argon2-vers-test-int`
a été fusionnée dans `main` (`c9f49ed`), elle a bien emporté l'autre, et **les DEUX
branches n'existent plus** — `git branch -a` ne liste que `main` et `origin/main`.
⛔ **Ce bloc reste comme MÉTHODE, il ne décrit plus un ÉTAT** : aucune des deux branches
n'est à chercher.

⚠ **TROIS lots non certifiés sont désormais en attente : D269, D270 et D271.**
La règle disait « deux, c'est tenable ; trois, non ». Le seuil est franchi — et il
l'est parce que la cause du rouge a changé deux fois en deux jours, pas parce qu'on
a empilé des lots de produit. ⚠ Les rangs 3 et 4 sont des lots de FIABILITÉ DE
PORTE : ils ne créent pas de quatrième lot non certifié, ils lèvent ce qui bloque
les trois. ⛔ **~~Aucun lot de produit ne s'ouvre avant que la porte soit verte.~~**
⛔ **LEVÉE LE 07/09/2026 PAR LA CERTIFICATION D275**, et barrée plutôt qu'effacée : elle
a tenu quatre lots durant, et c'est elle qui explique pourquoi S11-b a attendu. **Motif
de la levée** : la porte est verte **au repos**, en une seule passe, sur un arbre qui
n'a pas bougé — la condition que cette consigne posait est payée, et mesurée. ⚠ **Ce
qu'elle ne dit pas** : la porte n'est verte ni **sous charge**, ni pendant qu'une pile
`dev` tourne (les deux réserves de D275). **La levée porte sur ce qui a été mesuré, pas
plus.**
⇒ ⛔ **ET LA LEVÉE N'A EXISTÉ QUE DANS UN MESSAGE DE FUSION JUSQU'À D276** — pendant que
cette ligne-ci restait écrite comme active. C'est le défaut que D276 corrige, et il
touchait précisément le verrou qui autorise le chemin de l'argent.
⚠ **DÉMENTI LE 02/09/2026, ET LA PHRASE RESTE POUR QU'ON LE VOIE : D272 EST CE
QUATRIÈME LOT NON CERTIFIÉ.** Un lot de fiabilité de porte qui ne rend pas la porte
verte s'ajoute à la file au lieu de la vider. **Quatre lots attendent aujourd'hui** —
et ce compte-ci se périmera aussi, ce qui est pourquoi le rang de certification est
désormais écrit en règle et non en liste.

## Session du 30/08/2026 — D269 · `act(…)` tardif, concurrence, tri des campagnes

⛔ **Numéro pris en LISANT ce fichier** : le dernier attribué était **D268**.

⛔⛔ **ÉTAT : LIVRÉ, NON CERTIFIÉ — PORTE `test` ROUGE** (cause antérieure au lot :
`password.service.spec.ts` (argon2) **et `image-pipeline.spec.ts` (sharp)** — le
second ajouté le 01/09/2026 après mesure ; cette ligne ne nommait qu'argon2).
**Ce lot n'est PAS clos.**
⚠ Je l'avais d'abord présenté comme terminé au motif que le rouge « venait
d'ailleurs ». **C'est une faute de raisonnement, et Ko l'a refusée** : un lot ne se
certifie pas sous une porte rouge, même quand le rouge n'est pas le sien. La
provenance du défaut change qui doit le corriger ; elle ne change pas l'état de la
porte. Accepter une exception ici, c'est rouvrir D218 par la petite porte — une
mesure exacte présentée comme un feu vert qu'elle n'est pas.
⇒ Reclassement en clôture : **argon2 doit passer AVANT S11-b**, puisque c'est lui
qui tient la porte.

⚠ **OÙ CE LOT VIT AUJOURD'HUI (31/08/2026) : dans `main`, fusionné, et TOUJOURS
non certifié.** Aucune branche ne le porte — le chercher là où on cherche un lot
en attente ne donnera rien. Tableau des deux lots non certifiés et de ce qui les
tient : section **D270**.

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

### D269 — ⛔⛔ SECTION SUIVANTE RÉFUTÉE PAR D270 — NE PAS LA LIRE SEULE

⛔ **Tout ce paragraphe conclut faux, et il est FUSIONNÉ dans `main`.** Les quinze
exécutions ci-dessous ont été prises sur une machine chargée, sans que j'en relève
l'état. Rejouée sous charge légère, **la commande exacte de la porte rend 7 verts
sur 8 en ~35 s**, et le contrefactuel pré-D269 rend 347/347 en 34-35 s.
⇒ **« Le correctif aggrave le mode parallèle » et « la suite pro est inexploitable
en parallèle » sont FAUX.** Détail et mesures : **D270**.
⚠ Conservé tel quel, non réécrit : c'est la trace de la faute, et elle est plus
utile que sa correction silencieuse.

### D269 — ⛔ QUINZE EXÉCUTIONS : LE CORRECTIF NE TIENT QU'EN SÉRIALISÉ

⛔ **J'avais prouvé la stabilité de DEUX FICHIERS, jamais celle des SUITES** — or
c'est la suite entière qui rougissait. Ko a exigé la mesure ; elle me donne tort.

| Mode | 5 exécutions | Délais dépassés |
|---|---|---|
| pro, parallèle de fichiers | **35 · 32 · 36 · 35 · 33** échecs | **48 · 46 · 52 · 48 · 50** |
| pro, `--no-file-parallelism` | **0 · 0 · 0 · 0 · 1** échec | **0 · 0 · 0 · 0 · 0** |
| client (`pnpm --filter`) | **0 · 0 · 0 · 0 · 0** | **0 · 0 · 0 · 0 · 0** |

⛔ **LE CORRECTIF D'ATTENTE AGGRAVE LE MODE PARALLÈLE.** Sans lui : 5 échecs,
8 délais dépassés. Avec : ~48. L'attente est JUSTE — sérialisé, la suite est à
347/347 avec zéro délai dépassé, ce qu'elle n'atteignait jamais avant — mais elle
COÛTE, et le parallélisme de fichiers n'avait plus de marge.
⚠ **Mon « optimisation » (`queryByText` au lieu de `getByRole`) n'a rien réglé au
niveau de la SUITE.** Je l'avais déclarée efficace sur la foi de deux fichiers
isolés à 17/17. Deux fichiers verts ne disent rien d'une suite de vingt-huit.
⇒ Reporté : borner les workers vitest, bloqué par l'absence de config partagée.

### D269 — concurrence : la mesure, enfin produite

⚠ **Promise deux fois, jamais donnée avant que Ko ne l'exige.** Un changement
resté dans l'arbre sans mesure est un changement qu'on ne peut ni défendre ni
retirer.

| Forme | Durée | Paquets exécutés |
|---|---|---|
| `pnpm -r run test` | **47 s** | **2 sur 4** — api, api-client |
| `--workspace-concurrency=1 --no-bail` | **284 s** | **4 sur 4** |

⛔ **CE QUE LA MESURE DIT VRAIMENT, ET QUI CORRIGE MON RAPPORT PRÉCÉDENT** : le
gain vient de **`--no-bail`**, pas de la sérialisation. L'ancienne forme
s'arrêtait AUSSI au premier paquet rouge — j'avais écrit l'inverse, sur un run où
l'échec arrivait tard, une fois les autres déjà terminés.
⚠ **Et la sérialisation seule n'a PAS rendu le client déterministe** : sous
`pnpm test` séquentiel il tombe encore à 1 échec sur 287, alors qu'il est à 5/5
vert lancé seul. Le coût est réel (47 s → 284 s), le bénéfice propre à la
sérialisation n'est pas démontré. **Les deux drapeaux sont conservés par décision
de Ko ; ce paragraphe existe pour que la moitié non démontrée soit relisible.**

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

⚠ **CONSTAT INCOMPLET, corrigé le 01/09/2026** : il ne nomme qu'argon2, alors que
`image-pipeline.spec.ts` (sharp) dépasse le même budget dans les mêmes conditions.
Conservé tel quel, non réécrit — c'est la trace de ce qui avait été vu.

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

### D269 — le tri des campagnes, passé sur SON PROPRE lot

Sortie brute, lancée sur D269 lui-même :

```
33 fichier(s) modifié(s) depuis HEAD → 2 campagne(s) concernée(s) sur 22.
  · neutralize-booking-status.py  (2 fichier(s) en commun)
  · neutralize-s10b.py            (1 fichier en commun)
```

⛔ **Il ne désigne RIEN pour les deux fichiers que D269 a corrigés**, et c'est
**correct** : vérifié, aucune campagne ne lit `services-section.test.tsx` ni
`slots-section.test.tsx`. La plus proche, `neutralize-s9.py`, lit
`slots-section.tsx` — le COMPOSANT, que ce lot n'a pas touché.
⇒ Conséquence à ne pas enjoliver : **le correctif d'attente n'est gardé par
aucune campagne**. Le supprimer ne ferait rougir aucune neutralisation. Reporté.
⚠ Limite du tri relevée au passage : deux chemins de `neutralize-s9.py` sont
écrits relativement à un paquet et ne résolvent pas depuis la racine — invisibles
au croisement. Sans effet aujourd'hui, forme fragile.

### D269 — SIX fautes de méthode, à mon compte

1. ⛔ **J'ai édité les fichiers qu'une vérification était en train de mesurer.**
   Résultat : 24 échecs sans signification.
2. ⛔ **Puis j'ai conclu que ces 24 échecs VENAIENT de cette édition.** Faux : ils
   se reproduisaient sur arbre stabilisé. Une explication commode, adoptée avant
   d'être mesurée — la faute que ce lot passe son temps à corriger ailleurs.
3. ⛔ **J'ai sous-dimensionné trois fenêtres d'appel de suite**, et lu les morts
   qui en résultaient comme des échecs de la suite. `build`+`test:int` valaient
   15 min sur une fenêtre de 9,8 que j'avais fixée moi-même, après avoir mesuré
   `test:int` à 731 s.
4. ⛔ **J'ai déclaré ce lot CLOS sous une porte rouge**, au motif que le rouge
   venait d'ailleurs. Refusé par Ko. La provenance dit QUI corrige, pas si la
   porte est verte.
5. ⛔ **J'ai généralisé de deux fichiers à une suite.** 17/17 en isolation, puis
   « corrigé » annoncé — alors que la suite tournait à ~48 délais dépassés. Une
   mesure sur un périmètre plus étroit que la conclusion n'est pas une mesure.
6. ⛔ **J'ai laissé deux fois un changement dans l'arbre en promettant sa mesure
   pour plus tard.** Elle a fini par contredire une partie de ce que j'en disais.

### D269 — ce qui reste OUVERT à la clôture de la session

⛔ **Le lot est LIVRÉ, pas CERTIFIÉ.** Porte `test` rouge (argon2).
- **argon2 → `test:int`** : lot séparé, surface d'authentification, analyse des
  modes de défaillance avant code. **Doit passer AVANT S11-b.**
  ⚠ **INSUFFISANT À LUI SEUL (01/09/2026)** : sharp tient la porte aussi. Ordre
  complet dans la section D270, « ORDRE RÉVISÉ ».
- **Borner les workers vitest** : mesuré efficace (48 → 4), bloqué par l'absence
  de configuration vitest partagée — lot séparé.
- **Utilitaire d'attente partagé** : 19 fichiers pro montent `AppProviders`, 2
  seulement portent l'attente de D269.
- **Aucune campagne ne garde les fichiers de test pro.**
- **S11-b n'est pas commencé** — son cadrage attend une porte verte.

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

## Registre des décisions

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

⛔ **AUCUN « DERNIER NUMÉRO » N'EST ÉCRIT ICI, ET C'EST LE REMÈDE.** Cette ligne a
porté **« DERNIER NUMÉRO ATTRIBUÉ : D270 »** pendant que le titre de ce registre
annonçait « D1 à D272 » et que sa table listait D271 **et** D272 : un compteur figé
dans l'endroit même qui existe pour empêcher les compteurs figés. C'est le troisième
de la série — après « 18 scripts, 149 cibles » (D268) et « D1 à D266 » dans
`CLAUDE.md` — et il reçoit le même traitement que les deux autres : **on supprime le
chiffre, on ne le met pas à jour.**
⚠ **QUATRIÈME DE LA MÊME SÉRIE, RETIRÉ LE 03/09/2026 : LE TITRE DE CE REGISTRE.** Il
portait « — D1 à D272 » pendant que sa table portait déjà **D273**. Le titre d'un
registre est ce qu'on lit AVANT sa table ; annoncer une plage close, c'est proposer un
numéro déjà pris à qui ne descendra pas jusqu'en bas. **Plage supprimée, pas
rafraîchie.**
⇒ **Le numéro se prend en lisant la DERNIÈRE LIGNE DE LA TABLE ci-dessous**, et nulle
part ailleurs — **pas même ici**.
⚠ **CETTE PHRASE PORTAIT SON PROPRE EXEMPLE CHIFFRÉ, ET IL A PÉRIMÉ EN UN LOT** :
« au 02/09 elle porte D272, donc le prochain est D273 ». Elle annonçait donc comme
libre un numéro **déjà attribué**, dans le paragraphe même qui existe pour empêcher
cela. Elle se savait périssable et le disait — **se déclarer périmable n'empêche pas
de tromper une fois périmé.** Exemple supprimé le 03/09/2026, pas mis à jour.

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
| D270 | A | D270 — mes quinze exécutions mesuraient la MACHINE, pas le mode |
| D271 | A | D271 — argon2 quitte l'unitaire ; cinq tests exposés deviennent UN |
| D272 | A | D272 — l'horloge gelée, et les fixtures qui DÉRIVENT de l'ancre |
| D273 | A | D273 — attendre ne supprime pas l'avertissement ; il faut une fenêtre pour le recevoir |
| D274 | A | D274 — même code, 3 sur 5 chez D273 et 0 sur 30 ici : l'écart n'est pas le code |
| D275 | A | D275 — CERTIFICATION : portes vertes AU REPOS le 07/09/2026, six lots nommés, réserves écrites |
| D276 | A | D276 — ce qui vaut décision s'écrit dans un FICHIER d'autorité, jamais dans un message de commit |
| D277 | A | D277 — la levée était bien dans un fichier, et elle n'a pas traversé jusqu'à l'autre autorité |
| D278 | A | D278 — arbitrage de S11-b : les deux chemins, le CHECK, refus 409, les deux échéances |
| D279 | A | D279 — le chiffrage devient un module pur ; extrait, il n'avait PAS réduit `create` |
| D280 | A | D280 — neuf affirmations périmées dans les trois autorités ; une passe de barrage se relit dans son propre fichier |
| D281 | A | D281 — une norme sans date : « tout écart futur est une régression » barré, borne de date relevée |
| D282 | A | D282 — le CHECK d'agrégat : la garde d'origine l'avait omis À CÔTÉ de deux identités qu'elle écrivait |
| D283 | A | D283 — CERTIFICATION (rang 9) : trois fenêtres refusées sur leur RÉGIME, et une cinquième quantité au relevé |
| D284 | A | D284 — rang 10 ouvert et cadré ; un rang clos laisse un ÉTAT NOMMÉ, jamais une absence |
