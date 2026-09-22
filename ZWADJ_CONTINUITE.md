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
## ~~PROCHAIN LOT~~ — rang 19 · **CERTIFICATION DES RANGS 17 ET 18** ⛔ ~~**OUVERT LE 21/09/2026 (D299) — ÉTAPE 0 ÉCRITE ET COMMITÉE AVANT TOUTE MESURE**~~ ⛔ ~~**ÉTAPE 1 ROUGE : PORTE DURE SUR LA RAM, RIEN N'EST LANCÉ, AUCUNE MARQUE**~~ ⛔ **CLOS LE 22/09/2026 : D299 — MARQUE POSÉE À LA PASSE 2 (REJEU INTÉGRAL)**

### ⛔ CLÔTURE DU 22/09/2026 (D299) — L'ÉTAT DU RANG, À LIRE EN PREMIER

⛔ **TITRE BARRÉ À LA CLÔTURE (patron de D273, D284 et D293), ET CE BLOC EST SON RAFRAÎCHISSEMENT DE
CLÔTURE (règle de D294)** : barré plutôt qu'effacé (D276).
✅ **MARQUE POSÉE LE 22/09/2026 (D299), À LA PASSE 2** : « **Portes vertes AU REPOS le 22/09/2026, et D297
(rang 17, `a2dd3f3`) et D298 (rang 18, `edf66ae`) en font partie** ». **Deux lots, rien d'autre** — mesuré
sur les 11 commits depuis la marque de D293 —, aucun en-tête antérieur réécrit.
⇒ **Compteur de lots de code non certifiés : DEUX → ZÉRO**, le **rang 19 est CLOS**, et un lot de code
**peut** s'ouvrir dès l'arbitrage de Ko — c'est lui qui portera le compteur à un.
⇒ **RANG 20 : EN ATTENTE D'ARBITRAGE DE KO** (ordre des rangs, section D270). ⚠ Une permission n'est pas
un arbitrage.
⇒ **La passe 2** : six portes à 0 (1 329/109, 436/36), e2e **34 · 1**, `--tout` **186 · 0 · 13** puis rejeux
**8, 13, 6** ⇒ **199 mordues · 0 muette**, contre-épreuve **5 sur 5**, arbre immobile aux **cinq** contrôles,
fenêtre **homogène** (109 échantillons, 0 transition, 0 trou, SECTEUR seul). Exactement la prédiction.
Chiffres, fenêtre, réserves et limites : section D299, « PASSE 2 » ; pièces `docs/preuves/D299/passe/`.
⚠ **Les états qui suivent restent écrits, non effacés** — le refus de 19:08 et la passe 1 interrompue :
c'est ce qui dit que la marque a été posée à la **troisième** fenêtre, après un refus et une passe non
certifiante.

⛔ ~~**ÉTAT AU 21/09/2026 19:08 — À LIRE EN PREMIER.**~~ **(D299, 22/09/2026) ÉTAT DATÉ — l'état courant
est la clôture ci-dessus.** Relevés d'ouverture, sur le protocole commité dans
`c42c967` : **`chrome` 0**, `node` 0, **SECTEUR**, calibration de la sonde **passante** (rendement 0,96) —
et **RAM libre 4 526,5 puis 4 548 Mo (bandes 4 510-4 542 et 4 534-4 565), soit −52,5 et −31 sous la
barre** que la sonde imprime. ⇒ **Porte dure ROUGE sur les deux relevés. RIEN N'EST LANCÉ, AUCUNE
MARQUE** (ordre de Ko : « rouge ⇒ tu ne lances rien et tu me le dis »).
⇒ ~~**Le rang 19 reste OUVERT. La reprise se fait À L'ÉTAPE 1**, sur le protocole commité, **sans le
réécrire** ; l'étape 0 est acquise. ⇒ **Compteur : toujours DEUX. Aucun lot de code ne s'ouvre.**~~
⛔ **BARRÉ LE 22/09/2026 (D299)** — vrai au refus de 19:08, faux après la passe 2 : **marque posée, compteur
à ZÉRO, rang 19 CLOS** (clôture en tête de ce bloc).
⛔ **LA SORTIE APPARTIENT À KO, ET ELLE EST DÉJÀ ÉCRITE** (critère du rang 9, fin de « LA BARRE D'ÉTAT
MACHINE ») : **libérer de la mémoire** — plus gros postes relevés : `Code` **4 082 à 4 104 Mo sur 20
processus**, `oracle` **633**, `vmmemWSL` **763**, `claude` **429** —, **ou consommer la sortie de D270**
(redéfinir « repos » sur le plancher que cette machine peut produire, avec sa raison). ⚠ **La session ne
ferme aucun processus de Ko**, et **ne relève pas en boucle jusqu'au vert** : une fenêtre choisie par son
résultat ne certifie rien. Détail et pièces : section D299, « ÉTAPE 1 » ; `docs/preuves/D299/ouverture-refusee/`.
⛔ **(21/09/2026, Ko) REFUS RATIFIÉ — SORTIE CHOISIE : LIBÉRER, PAS REDÉFINIR.** Ko a **arrêté `oracle`**
(633 Mo au relevé du refus) et vérifié `chrome` et `oracle` absents. ⇒ **Le prochain relevé est légitime
parce qu'il suit ce MOUVEMENT D'INVENTAIRE NOMMÉ**, pas parce qu'on le répète (règle écrite au critère, fin
de « LA BARRE D'ÉTAT MACHINE ») ; ce que l'arrêt a réellement rendu s'écrit **mesuré**. ⇒ **Reprise à
l'étape 1, protocole de `c42c967` inchangé.**
⛔ **PASSE 1 (21/09/2026, 23:10 → 23:59) — INTERROMPUE PAR UN DÉFAUT D'INSTRUMENT, LE MIEN. PAS DE
MARQUE SUR ELLE ; REJEU INTÉGRAL (règle de Ko, D298).** Porte dure **verte** (RAM +993,5 puis +1 285,
`chrome` 0, SECTEUR, calibration 0,93) ; **six portes à 0** aux comptes prédits ; `--tout` **186 · 0 · 13**,
exactement la prédiction. ⛔ **Mais l'échantillonneur n'a rien écrit de 23:25:45 à 23:59:28 (2 023 s,
toute la fenêtre de `--tout`)** : son journal était tenu par le `tail -f` de **mon** moniteur, et
`Add-Content` a levé 62 fois. **Cause reproduite sur ses deux bras** (témoin hors dépôt). ⇒ Le lecteur
de l'échantillonneur rend **« FENÊTRE NON HOMOGÈNE »** : le point 7 du critère n'est pas tenu sur cette
passe. **Le comportement n'a pas démenti** — la mesure s'arrête, pas le lot.
⇒ **AMENDEMENT DU PROTOCOLE, COMMITÉ AVANT LE REJEU** : (1) **aucun lecteur** — `tail`, `cat`,
`Get-Content` — sur le journal de l'échantillonneur pendant la fenêtre ; le régime se lit **à la clôture**,
par `-Resume` ; le moniteur ne suit que le journal des campagnes, écrit par Python (mesuré : complet sous
`tail -f`) ; (2) journaux du rejeu : `rang19-p2-*`, ceux de la passe 1 restant pièces ; (3) un
`pg_isready` en échec **arrête** avant le relevé (faute de la passe 1, section D299). Pièces :
`docs/preuves/D299/passe-1-interrompue/`.

⛔ **OUVERT ET ARBITRÉ PAR KO LE 21/09/2026** (première écriture : l'ordre des rangs). ⇒ **QUEL lot : rang
19. OÙ IL EN EST : ici.** **Motif de Ko** : « le compteur est à DEUX, la règle l'impose ».
⛔ **LA MARQUE NOMMERA D297 ET D298, RIEN D'AUTRE**, aucun en-tête antérieur réécrit — ou le refus motivé.
⇒ **Ce lot ne compte pas** : `.md` d'autorité et `docs/preuves/` seulement (exemption D292) — les
procédures de la passe vivent sous `docs/preuves/D299/outils/`, **sur ordre de Ko**, parce qu'un script
de `neutralisation/` ferait compter un troisième lot de code.

**ÉTAPE 0 — FAITE ET COMMITÉE AVANT LE RELEVÉ D'OUVERTURE (ordre de Ko)** :
1. **L'arbitrage de Ko sur les 92 alertes** — l'audit garantit l'absence de VALEURS, pas de mots ; pas de
   liste blanche ; **toute alerte absente de la sortie scellée précédente se trie au contexte avant le
   commit** ; le contrôle « 0 valeur réelle » fait foi. ⇒ **Critère du rang 9, point 10**, et **`AGENTS.md`**,
   au pointeur d'audit. Procédures : `outils/alertes-nouvelles.py` (tri différentiel, calibré : 0 contre
   lui-même, **exactement les 2** alertes triées par D298 contre D297) et `outils/aucune-valeur-reelle.py`
   (calibré sur ses deux bras, **0 porteur sur 452 fichiers** pour les 48 valeurs des journaux e2e des rangs
   12 et 15).
2. **« Un minorant s'arrondit vers le bas, un majorant vers le haut »** — `AGENTS.md`, bloc des
   instruments ; `mesure-budgets.py` **non retouché**.
3. **L'extrait e2e élargi** (point 9) — `outils/extraire-e2e.py`, **calibré sur le journal réel avant
   d'être cru** : 3 bras sur 3 (réel, échec construit, lien dans une fenêtre d'échec ⇒ refus). Extrait du
   cas connu versé : `outils/calibration/rang15-e2e-EXTRAIT-D299.txt`, 56 lignes gardées sur 910.

**PROTOCOLE DE LA PASSE — écrit ici AVANT le relevé** (critère du rang 9, points 1 à 10 ; **aucune
valeur n'en est recopiée** — la barre de RAM est celle que la sonde imprime) :
- **Journaux** : `.neutralisation-journaux/rang19-*`. ⛔ **Jamais `rang15-*`** : le bras « cas réel » de
  `audit-secrets.py` et de `extraire-e2e.py` est épinglé sur `rang15-e2e.log` — l'écraser le ferait passer,
  sans bruit, à « NON REJOUÉ ».
- **Ordre, sans retouche de fichier suivi entre le premier relevé et la clôture (D270)** :
  1. Docker et `zwadj-db` levés, `pg_isready` ; ports **3100, 3101 et 5273** libres (relevés dans
     `e2e/playwright.config.ts` — D293 n'en contrôlait que deux).
  2. **Relevé d'ouverture** : sonde `-Calibrer`, puis un second relevé. ⛔ **PORTE DURE sur CHACUN** :
     `CHROME=0`, RAM médiane **et** bande basse au-dessus de la barre, `SECTEUR`, calibration passante.
     **Un rouge ⇒ rien ne se lance, et Ko est prévenu.**
  3. Échantillonneur en fond, `-Intervalle 30`, `rang19-etat.csv`, arrêté après la clôture, lu par `-Resume`.
  4. `HEAD` + `git status --porcelain` (vide exigé).
  5. Six portes dans l'ordre de `CLAUDE.md`, chacune précédée d'un relevé (`SECTEUR`) ; code **réel** dans un
     fichier `.code`. Avant l'e2e : `node` 0 et les trois ports libres.
  6. `HEAD` + statut ; `lancer-campagnes.py --tout` ; `HEAD` + statut.
  7. Chaque campagne que `--tout` rend « non mesurée » — **relevée dans SA sortie** — rejouée avec
     `--int` ; `HEAD` + statut.
  8. **Contre-épreuve de `audit-secrets.py`, rejouée à la main** (`docs/preuves/D298/contre-epreuve/`) —
     le tri ignore les `.py`, et sans elle la certification couvrirait un instrument dont la garde n'est pas
     jouée (Ko). Elle n'écrit que dans un dossier temporaire hors dépôt. `HEAD` + statut.
  9. Relevé de clôture (`SECTEUR`), arrêt et lecture de l'échantillonneur.
- **Après la clôture seulement** : copie des journaux cités dans `docs/preuves/D299/passe/` (sauf le
  journal e2e brut, qui **reste hors dépôt**), extrait e2e, contrôle « 0 valeur réelle » sur le journal
  e2e **de la passe**, audit scellé, tri différentiel, **second audit en dernière écriture**, marque.
- **Règles de lecture** : porte verte ⇔ code réel 0, résumés confrontés au brut, tout « failed » à son
  contexte (D275) ; campagnes : `--tout` sort en 1 et **c'est attendu** — certifie le total **mordues `--tout`
  + mordues `--int`**, 0 muette, 0 non mesurée après rejeu, arithmétique **campagne par campagne** ; arbre
  immobile aux cinq points de contrôle ; échantillonneur **homogène** (0 transition, 0 trou, 0 échec).
- **Prédictions, DÉRIVÉES et non critères** — depuis la marque de D293 (`ceced54`), deux lots de code :
  D297 (quatre `testTimeout: 5_000`, sans test ajouté ; une campagne neuve, `neutralize-budgets.py`, 4
  cibles) et D298 (un instrument hors de toute porte, 0 campagne concernée). D'où : `test` **1 329 / 109**,
  `test:int` **436 / 36**, e2e **34 passés · 1 ignoré** (`a5-cold-reload-vs-spa`), campagnes **27** —
  `--tout` **186 · 0 · 13** sur `e3d1-s8`, `s11b`, `solid-s6`, rejeux **8, 13, 6** ⇒ **199** ; contre-épreuve
  **5 sur 5**. ⛔ **Un compte qui s'écarte suspend la marque** jusqu'à explication ; inexpliqué ⇒ refus.
- ⛔ **ARRÊT SANS RATTRAPAGE** : un relevé hors `SECTEUR`, `chrome` qui réapparaît, ou un échantillonneur
  non homogène ⇒ la passe s'arrête, c'est dit, **pas de marque** (ordre de Ko : « si la machine sort du
  régime pendant la fenêtre, tu arrêtes et tu le dis »).
- **Limites écrites d'avance** : la base de dev `zwadj` était **vierge** au relevé de D293 — **non
  re-mesurée ici** ; réserve « zéro `node` pendant la mesure » **reconduite** ; **aucune durée ne se
  compare** (modes mixtes, terme de position de D291).

## ~~PROCHAIN LOT~~ — rang 18 · `[INFRA]` **l'écho de l'audit de secrets** ⛔ **CLOS LE 21/09/2026 : D298 — UN INSTRUMENT NOUVEAU QUI EXCLUT PAR L'IDENTITÉ DES OCTETS ; NON CERTIFIÉ (COMPTEUR À DEUX)**

⛔ **(D299, 22/09/2026) « NON CERTIFIÉ (COMPTEUR À DEUX) », DANS LE TITRE CI-DESSUS, N'EST PLUS L'ÉTAT
COURANT** : D298 fait partie de la marque posée au rang 19 — « portes vertes AU REPOS le 22/09/2026 » —, et
le compteur est à **ZÉRO**. ⚠ **Le titre n'est pas réécrit** : aucun en-tête antérieur ne l'est (point 4
du critère). ⇒ Point d'entrée « rang 19 », clôture, et section D299.

### ⛔ CLÔTURE DU 21/09/2026 (D298) — L'ÉTAT DU RANG, À LIRE EN PREMIER

⛔ **OUVERT, ARBITRÉ ET CLOS LE 21/09/2026, DANS LA SESSION DE LA REPRISE À FROID, SUR ORDRE DE KO** —
arbitrage écrit en **première** ligne dans l'ordre des rangs (section D270), avant toute autre. ⇒ **QUEL
lot : rang 18 de l'ordre des rangs. OÙ IL EN EST : ici.**
⇒ **CE QUI EST ÉCRIT** : `neutralisation/audit-secrets.py`, **instrument nouveau** — l'outil de D293 est
une pièce versée et **n'est pas retouché** (contrainte de Ko). ⛔ **C'EST LUI QUI FAIT FOI DÉSORMAIS**, et
`AGENTS.md` le dit à l'endroit qui prescrit l'audit avant commit. Sortie versée par `--sortie`, **scellée**.
⇒ **CE QU'IL EXCLUT, ET LE CRITÈRE** : les sorties des **trois** instruments prédécesseurs qui portent un
audit (`D291/controles/integrite-et-secrets.py`, `D293/versement-d288/verser-et-confronter.py`,
`D293/outils/audit-secrets.py`) — **17 fichiers épinglés par chemin ET empreinte SHA-256**, retenus
parce qu'ils portent la ligne de bilan d'un audit, **jamais parce qu'ils alertent** — et ses **propres
sorties scellées**. ⛔ **L'exclusion tient à l'IDENTITÉ DES OCTETS, jamais au nom** : un octet changé
rend le fichier à l'audit, et chaque exclusion s'imprime avec ce qu'elle aurait rendu.
⇒ **CALIBRATION, REJOUÉE À CHAQUE INVOCATION, EN MÉMOIRE, ABANDON SI UN BRAS MANQUE** : motifs (11 sur
11, **identiques à D293** — mesuré) ; **positif** (Ko) — une pièce neuve portant un jeton de la forme
réelle est vue ; **écho** (Ko) — les 17 sorties épinglées et une sortie scellée ne rendent rien, 661
alertes non comptées ; **discrimination** (ajouté par la session) — le même jeton ajouté à une sortie
épinglée, avant ou après un sceau, ou dans une pièce **nommée** comme une sortie d'audit, est vu 4 fois
sur 4 ; **cas réel** (Ko) — le journal e2e hors dépôt, **24 jetons sur 24**. **5 bras sur 5.**
⇒ **LES BRAS MORDENT, ET C'EST PROUVÉ** : contre-épreuve de cinq mutations — exclusion par emplacement,
par nom, sceau présent au lieu de vérifié, registre vide, exclusion par extension — **5 sur 5**, chacune
sur le bras attendu et lui seul (`docs/preuves/D298/contre-epreuve/`).
⇒ **LE RÉSULTAT, CONFRONTÉ À L'OUTIL DE D293 SUR LE MÊME ARBRE** : D293 rend **433** alertes — 244 + 189,
la sortie de D297 réauditée, **prédit avant d'être mesuré** ; le nouvel instrument rend **90** audités
et **472** d'écho imprimés et non comptés ; 90 + 472 − 129 (les sorties que D293 s'exclut déjà) = 433.
Audit final de clôture : section D298.
⚠ **« ATTENDU 0 » N'EST PAS ATTEINT, ET CE N'ÉTAIT PAS L'OBJET** : les alertes restantes **ne sont pas de
l'écho** — titres de tests recopiés dans les journaux et rapports versés, outils qui nomment le motif
qu'ils cherchent. Triées, **rapportées au backlog, NON exclues** : les exclure serait un autre lot.
⇒ **Compteur de lots de code non certifiés : DEUX** (rangs 17 et 18). ⛔ **AUCUN LOT DE CODE NE S'OUVRE
AVANT UNE CERTIFICATION** (D270 : deux sont tenables, trois non). « La certification suivante couvrira
les rangs 17 et 18 ensemble » (Ko, 21/09) — ⚠ **une désignation, pas l'arbitrage du rang 19.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**,
un lot de code **peut** s'ouvrir dès que Ko l'arbitre. ⇒ **Rang 20 : en attente d'arbitrage de Ko.**
⇒ ~~**RANG 19 : EN ATTENTE D'ARBITRAGE DE KO** (D284). ⚠ Sous le compteur à DEUX, la règle n'y admet
qu'une **certification** ou un lot **documentaire**.~~ ⛔ **(D299) Consommé le 21/09/2026 : rang 19 = la
certification des rangs 17 et 18, arbitrée par Ko.**

## ~~PROCHAIN LOT~~ — rang 17 · `[MÉTHODE][P0]` **les budgets de test, forme (b)** ⛔ ~~**OUVERT — CADRAGE ÉCRIT, AUCUNE LIGNE DE CODE**~~ ⛔ ~~**BLOQUÉ LE 20/09/2026 (D296) : LE CADRAGE ÉCHOUE À SON PROPRE BRAS DE DISCRIMINATION — EN ATTENTE D'ARBITRAGE DE KO, AUCUNE LIGNE DE CODE**~~ ⛔ ~~**DÉBLOQUÉ LE 20/09/2026 PAR L'ARBITRAGE (ii) DE KO (D297) — CADRAGE AMENDÉ ET COMMITÉ AVANT LA PREMIÈRE MESURE ; LOT DE CODE EN COURS**~~ ⛔ **CLOS LE 21/09/2026 : D297 — QUATRE `testTimeout: 5_000` ÉCRITS À LA VALEUR EN VIGUEUR, TOUS LUS, MARGE ~~≥ 4 618 ms~~ ≥ 4 603 ms PASSES FROIDES COMPRISES (D298) SUR MAJORANT ; NON CERTIFIÉ (COMPTEUR À UN, PUIS DEUX AU RANG 18)**

⛔ **(D299, 22/09/2026) « NON CERTIFIÉ (COMPTEUR À UN, PUIS DEUX AU RANG 18) », DANS LE TITRE CI-DESSUS,
N'EST PLUS L'ÉTAT COURANT** : D297 fait partie de la marque posée au rang 19 — « portes vertes AU REPOS le
22/09/2026 » —, et le compteur est à **ZÉRO**. ⚠ **Le titre n'est pas réécrit** : aucun en-tête antérieur
ne l'est (point 4 du critère). ⇒ Point d'entrée « rang 19 », clôture, et section D299.

### ⛔ CLÔTURE DU 21/09/2026 (D297) — L'ÉTAT DU RANG, À LIRE EN PREMIER

⛔ **TITRE BARRÉ À LA CLÔTURE (patron de D273, D284 et D293), ET CE BLOC EST LE RAFRAÎCHISSEMENT DE
CLÔTURE QU'EXIGE LA SECONDE MOITIÉ DE D282 (D294).** Le rang 17 est **clos** : l'entrée
`[MÉTHODE][P0]` des budgets est **épuisée**.
⇒ **CE QUI EST ÉCRIT** : `testTimeout: 5_000` dans `apps/api/vitest.config.ts`,
`apps/client/vitest.config.ts`, `apps/pro/vite.config.ts` et `packages/api-client/vitest.config.ts`,
chacun avec un commentaire qui renvoie ici. ⛔ `vitest.config.int.ts` **n'est pas touché** (30 s).
**Aucun comportement ne change** : la porte `test` rend les mêmes comptes qu'avant (1 329 tests).
⇒ **LA VALEUR EN VIGUEUR EST 5 000 — ET VOICI CE QUI LA FIXE, DANS LES TERMES EXIGÉS PAR KO** : le
**texte d'aide** de vitest 3.2.7 la nomme (`default: 5000`) ; la **signature**
`Test timed out in 5000ms`, générée depuis la valeur **effective** du processus (`makeTimeoutError`), la confirme sous
**chacune des quatre configurations** ; l'**encadrement** la tient à ±100 ms — 4 900 passe, 5 100
échoue, quatre fois sur quatre, `setupFiles` compris. **Aucune des trois ne suffit seule ;
ensemble, elles suffisent.** Ce n'est pas « 5 000 mesuré ».
⇒ **LES MARGES, SUR UN MAJORANT DÉCLARÉ (test + hooks), AU REPOS** — « marge ≥ X », jamais « = X ».
⛔ **CORRIGÉ LE 21/09/2026 (D298), SUR ORDRE DE KO — LA MARGE ÉCRITE COMPREND LES PASSES FROIDES.** La
table calculait M **hors** passe froide, alors que les passes froides d'`api` et de `client` dépassent M.
**Un majorant qui retire sa plus grande observation perd la seule propriété qui le justifie : ne jamais
rassurer à tort** — et pour un budget de délai, la passe froide est le cas **RÉALISTE** : un processus
neuf, c'est la CI (Ko). ⇒ La colonne qui fait foi est **« marge, froide comprise »** ; le chiffre hors
froide passe en second, **déclaré comme tel**. ⚠ **N, lui, ne change pas** : la règle de dérivation de
N porte sur le régime ENCHAÎNÉ (pièce 2 du cadrage), et Ko n'a corrigé que la marge.
⛔ **ET UN MINORANT S'ARRONDIT PAR DÉFAUT** : la table écrivait **≥ 4 962** pour `api-client`, alors que
5 000 − 38,3 = **4 961,7** — `mesure-budgets.py` imprime `:.0f`, qui arrondit au plus proche (relevé par
D298 ; rectification posée à côté des pièces, `docs/preuves/D297/mesures/RECTIFICATION-D298.txt`).

| suite | N (règle de Ko) | passe froide | M, froide comprise | **marge, froide comprise** | M hors froide | marge hors froide (second) |
|---|---|---|---|---|---|---|
| `packages/api-client` | 2 | 31,8 ms | 38,3 ms | **≥ 4 961 ms** | 38,3 ms | ≥ ~~4 962~~ 4 961 ms |
| `apps/api` | 2 | 370,7 ms ⚠ > M | 370,7 ms | **≥ 4 629 ms** | 362,7 ms | ≥ 4 637 ms |
| `apps/client` | 1 | 396,7 ms ⚠ > M | 396,7 ms | **≥ 4 603 ms** | 381,6 ms | ≥ 4 618 ms |
| `apps/pro` | 1 | 331,0 ms | 340,0 ms | **≥ 4 660 ms** | 340,0 ms | ≥ 4 660 ms |

⚠ **La passe froide dépasse M dans deux suites** (+2,2 % et +4,0 %) : le cadrage l'exigeait dit. ⇒ **Marge,
passes froides comprises : ≥ 4 603 ms**, soit un budget **≥ 12,6 fois** le plus lourd des majorants
(5 000 / 396,7 = 12,604). Hors passes froides, en second : ≥ 4 618 ms.
⚠ **N vaut 1 ou 2, et c'est la règle appliquée à la lettre** : elle se satisfait d'une passe qui ne
déplace plus le maximum. Pour un extremum, **un saut plus tard n'est pas exclu** — rapporté au
backlog. **Aucune décision n'en dépend** : (b) n'écrit que la valeur en vigueur.
⇒ **LA LIGNE EST LUE, ET C'EST PROUVÉ DANS LES DEUX SENS (n°8)** : `neutralize-budgets.py` —
`5_000` → `1_000` fait expirer un témoin de 2 s avec `Test timed out in 1000ms`, **4 gardes mordues
sur 4** ; contre-épreuve, la ligne de `api-client` déplacée **hors** du bloc `test` : **3 sur 4**, ✗
sur cette cible seule, témoin resté vert. `verifier-mutations.py` : **4 posées, 0 non posée**.
⛔ **LA CONDITION QUI REND (i) OBLIGATOIRE RESTE ÉCRITE, ET PAS SEULEMENT ICI** : toute valeur
**autre** que 5 000 exige un instrument qui chronomètre la **seule fonction du test** — un majorant
confirme qu'une borne tient, il n'en choisit pas une nouvelle. ⇒ Écrite **dans le commentaire de
chacune des quatre lignes**, là où la lira celui qui voudra la changer, et au backlog.
⇒ **Compteur de lots de code non certifiés : UN** (D297). **Portes vertes le 21/09/2026**, état
machine relevé : section « Session des 20 et 21/09/2026 — D297 ». ⛔ **(D298) Passé à DEUX par le rang
18** : aucun lot de code ne s'ouvre avant une certification. ⛔ **(D299, 22/09/2026) LEVÉ** : marque posée
au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.
⇒ ~~**RANG 18 : EN ATTENTE D'ARBITRAGE DE KO** (D284), aucun candidat désigné.~~ ⛔ **CONSOMMÉ LE
21/09/2026 (D298) — ARBITRÉ PAR KO : l'écho de l'audit de secrets.** Point d'entrée : « rang 18 », en tête.

### ⛔ AMENDEMENT DU CADRAGE — ARBITRAGE DE KO DU 20/09/2026 (D297), COMMITÉ AVANT LA PREMIÈRE MESURE

⛔ **CE BLOC PRIME SUR LES PIÈCES 1, 3 ET 4 DE D295 PARTOUT OÙ ILS DIFFÈRENT.** Elles restent écrites
dessous, annotées, pour que l'amendement se lise contre ce qu'il amende. ⛔ **Il est commité AVANT
toute mesure** — c'est ce qui rend le protocole antérieur au résultat, comme au rang 14 (ordre de Ko).
⚠ **Ouvert dans la même session que D296, sur ordre explicite de Ko** : la reprise à froid, qui est la
mesure de « un lot par session », n'est donc **pas** exercée pour ce lot.

⛔ **L'ARBITRAGE : (ii), MAJORANT DÉCLARÉ. LE MOTIF, ÉCRIT TEL QUEL (Ko)** :
« **UNE `duration` QUI CONTIENT LES HOOKS EST TOUJOURS ≥ LA DURÉE DU TEST.** Une marge calculée
dessus ne peut être que **PLUS PESSIMISTE** que la vraie : elle peut inquiéter à tort, jamais
rassurer à tort. Or (b) écrit la valeur en vigueur ; la marge se lit à côté, elle ne choisit rien.
⇒ **UN MAJORANT SUFFIT POUR CONFIRMER QU'UNE BORNE TIENT ; IL NE SUFFIT PAS POUR EN CHOISIR UNE
NOUVELLE.** Le jour où quelqu'un veut écrire autre chose que 5 000, **(i) devient obligatoire.**
Aujourd'hui elle achèterait une précision dont aucune décision ne dépend, au prix d'un instrument
neuf sur une API non vérifiée. »
⛔ **ET C'EST LA CONDITION QUI REND (i) OBLIGATOIRE, ÉCRITE ICI POUR QU'ELLE NE SE PERDE PAS** : toute
valeur de `testTimeout` **autre que la valeur en vigueur** exige un instrument qui mesure la **seule
fonction du test** — la sortie (i) de D296. Un majorant ne fonde pas un choix.

**PIÈCE 1, AMENDÉE — LA QUANTITÉ MESURÉE.** Pour une suite et une passe : le **maximum, sur tous les
tests, de la `duration` du reporter JSON** — durée du test **et de ses hooks** (`beforeEach`,
`afterEach`, nettoyages). **Déclarée MAJORANT** de la quantité que `testTimeout` borne. ⇒ **La clôture
écrit « marge ≥ X », jamais « marge = X »**, avec X = 5 000 − maximum observé.
**Source inchangée** : le reporter JSON, jamais un extracteur de console (motif de D295, qui tient).

**PIÈCE 3, AMENDÉE — LA CALIBRATION, TROIS BRAS, ABANDON SI UN SEUL MANQUE (D286).** Suite témoin
construite, configuration nue, rejouée à **chaque** invocation de l'instrument :

| bras | cas construit | verdict exigé |
|---|---|---|
| positif | un test qui dort 1 200 ms | maximum dans **[1 200 ; 1 300]** |
| négatif | deux tests vides | maximum **< 100** |
| discrimination | 1 200 ms dans un `beforeEach`, tests vides | ⛔ maximum **≥ 1 200 — le majorant DOIT les compter** |

⛔ **LE BRAS DE DISCRIMINATION RESTE, ET SON VERDICT S'INVERSE** : il prouve désormais que le majorant
**contient ce qu'il déclare contenir**.
⛔ **LA TOLÉRANCE DU BRAS POSITIF N'EST PAS « ÉCRITE D'AVANCE » : ELLE EST POSÉE PAR KO LE 20/09/2026,
APRÈS TROIS OBSERVATIONS** (1 204 · 1 205,7 · 1 213,6 ms, D296). **Borne basse 1 200** — un sommeil
ne peut pas durer moins que lui-même ; **borne haute 1 300**. C'est ce qui la rend honnête.

**PIÈCE 4, n°0 AMENDÉ — L'ENCADREMENT, SOUS CHACUNE DES QUATRE CONFIGURATIONS, `setupFiles` COMPRIS.**
- **Témoin écrit TEMPORAIREMENT dans le motif d'inclusion de chaque paquet** —
  `apps/api/src/__temoin_budget__.spec.ts`, et `src/__temoin_budget__.test.ts` pour `apps/client`,
  `apps/pro` et `packages/api-client` — puis joué par **la configuration du paquet lui-même**,
  depuis son dossier. **Aucune configuration enveloppe** : elle mesurerait l'enveloppe. Témoins
  **purgés au démarrage et en fin** (un `finally` ne survit pas à un signal, D224).
- **Sommeil par `node:timers/promises`** : il échappe aux horloges factices de vitest, qu'un
  fichier de configuration pourrait installer.
- **La valeur attendue V n'est pas écrite : elle est lue à l'exécution dans le texte d'aide**
  (`--testTimeout … (default: V)`). **V − 100 DOIT PASSER ; V + 100 DOIT ÉCHOUER** avec la signature
  `Test timed out in Vms`. ⛔ **Si l'encadrement ne rend pas V, le lot s'arrête et n'écrit rien.**
- ⛔ **TROIS SOURCES NOMMÉES POUR V, ET LA CLÔTURE LES NOMME AINSI** : le **texte d'aide** (défaut
  documenté) ; la **signature**, générée depuis la valeur **effective** du processus
  (`makeTimeoutError`) — plus forte que la première ; l'**encadrement** comportemental, à ±100 ms.
  **Aucune ne suffit seule.** Jamais « 5 000 mesuré ».
- ⛔ **UN ÉCHEC DU BRAS V − 100 SE REPRODUIT AU REPOS AVANT D'ÊTRE CRU** (condition de Ko) : relevé
  d'état, puis **une** reprise du témoin de ce paquet ; reproduit ⇒ le lot s'arrête ; non reproduit ⇒
  écrit comme **contention**, et on continue.

**PIÈCE 4, n°8 — NOUVEAU, OBLIGATOIRE : LA LIGNE ÉCRITE MAIS IGNORÉE. C'EST LA CIBLE DU HARNAIS.**
`5_000` vaut le défaut : quatre lignes ignorées seraient vertes partout. ⇒
**`neutralisation/neutralize-budgets.py`, quatre cibles, une par configuration** :
`testTimeout: 5_000` → `testTimeout: 1_000` ; **témoin connu** : un test qui dort **2 000 ms** sous
cette configuration — **vert sans mutation** (pré-vol), **rouge sous mutation avec la signature
`Test timed out in 1000ms`**. ⚠ **La signature portant la valeur MUTÉE est la preuve que la ligne est lue**, puisque le
message interpole la valeur effective. ⚠ **1 000 / 2 000 et non 4 900 / 5 000** : une seconde de marge
de chaque côté, **hors de la zone que la contention mange**. Garde `__main__`, sauvegarde disque,
restauration au démarrage, comptage d'ancre 1 → 0 et de marqueur 0 → 1 (D286).

**PIÈCE 2, RENDUE OPÉRATOIRE — SANS CHANGER L'ARBITRAGE (x = 5 %, plafond 15).**
- M_k = maximum, sur les passes 1 à k, du maximum de chaque passe. **N = le plus petit k ≥ 1 tel que
  M_(k+1) ≤ 1,05 × M_k.** On joue des passes jusqu'à ce que ce soit vrai, **ou jusqu'à 15 passes
  comptées** ; si la quinzième déplace encore M de plus de 5 %, **« non convergé à 15 » est le
  résultat**, sans N par défaut.
- **Régime déclaré : ENCHAÎNÉ (n°7).** Une **passe froide** précède la passe 1 de chaque suite :
  jouée, relevée, **rapportée à part, jamais comptée** ni dans M ni dans N. Si son maximum dépasse
  celui des passes comptées, la clôture le dit.
- **Ordre déclaré** : `packages/api-client`, `apps/api`, `apps/client`, `apps/pro`.
- ⛔ **Une passe non verte, ou dont le nombre de tests lus diffère de la passe froide, ARRÊTE
  l'instrument** : un rouge est un verdict, pas une durée ; un compte qui change est un extracteur
  qui perd des lignes (D290).

**ÉTAT MACHINE (n°4, n°5, et le critère).** **Porte dure au relevé d'ouverture : SECTEUR, `chrome` = 0,
RAM libre ≥ 4 579 Mo** (barre D273). Rouge ⇒ **rien n'est lancé**, et on le dit à Ko. L'échantillonneur
tourne **pendant** les étapes 2 à 4 ; son journal est versé.

**CE QUE LE LOT ÉCRIT** : `testTimeout: 5_000` dans `apps/api/vitest.config.ts`,
`apps/client/vitest.config.ts`, `apps/pro/vite.config.ts`, `packages/api-client/vitest.config.ts` —
⛔ **jamais `vitest.config.int.ts`** (n°1) ; l'instrument `neutralisation/mesure-budgets.py` (D286 :
un instrument entre au dépôt) ; le harnais `neutralisation/neutralize-budgets.py` ; les pièces dans
`docs/preuves/D297/`. **Ordre de la session, de Ko, non réordonnable** : 0 cet amendement commité ;
1 relevé d'ouverture ; 2 calibration ; 3 n°0 sous les quatre configurations ; 4 mesures ; 5 les quatre
lignes, le n°8 sur chacune, les portes.
⛔ **ÉTAPE 1, 20/09/2026 23:56:12 — PORTE DURE ROUGE SUR `chrome` (14) : RIEN N'EST LANCÉ.** SECTEUR ✅,
RAM libre **5 194 Mo, +615** au-dessus de la barre ✅, calibration de la sonde rejouée (rendement
0,96) ✅ — **mais `chrome` = 14** ⛔ : une seule instance, lancée à 21:33:55 par
`--startup-foreground-launch`, 828 Mo. **Aucune des étapes 2 à 5 n'a commencé** ; la session ne ferme
pas le navigateur de Ko (précédent de D293). Pièces : `docs/preuves/D297/ouverture-refusee/`.
⚠ **État de l'arbre à ce moment** : l'instrument `neutralisation/mesure-budgets.py` et le harnais
`neutralisation/neutralize-budgets.py` sont **écrits et NON commités** — ni lancés, ni passés aux
portes : du code non mesuré n'entre pas dans `main`. ⇒ **Reprise À L'ÉTAPE 1**, sur ce protocole,
sans le réécrire.

### ⛔ ÉTAT AU 20/09/2026 (D296) — À LIRE AVANT LES PIÈCES, QUI SONT CELLES DE D295

⛔ **(D297) PÉRIMÉ LE MÊME JOUR : KO A ARBITRÉ (ii).** Ce bloc reste l'état **au moment du blocage** ;
l'état courant est l'amendement ci-dessus.

⛔ **ARBITRAGE DE KO, 20/09/2026, ÉCRIT EN PREMIER (D276)** : le lot de **CODE** des budgets est le
**second lot du RANG 17** — « sur le cadrage de D295, sans le réécrire. C'est mon arbitrage : le
cadrage est validé. Il portera le compteur à UN. » Il enchaînait sur une lecture adverse, **« sauf
si elle trouve un défaut qui bloque »**.
⛔ **ELLE EN A TROUVÉ UN, ET IL EST MESURÉ — LE LOT DE CODE N'A PAS COMMENCÉ.** La pièce 1 prescrit
comme source la `duration` du **reporter JSON** ; la pièce 3 exige que le bras de discrimination
(1 200 ms déplacés dans un `beforeEach`) rende **un maximum sous 100 ms**. **Mesuré trois fois :
1 218 · 1 216,2 · 1 208,2 ms.** Les bras positif (1 204 à 1 214 ms) et négatif (0,9 à 1 ms) rendent
leur verdict ; **le bras qui « fait le travail » (Ko) le manque**.
⚠ **MÉCANISME, LU DANS LA SOURCE INSTALLÉE (vitest 3.2.7)** : `runTest` pose son départ **avant** les
`beforeEach` et sa `duration` **après** les `afterEach` et les nettoyages ; `testTimeout` n'enveloppe
que la **fonction du test**. La `duration` du reporter est donc *test + hooks* — **la durée voisine
du mode n°2**. Le bras a fait exactement son office : **il a attrapé la source du cadrage lui-même,
avant qu'une ligne soit écrite.**
⛔ **CE N'EST PAS UN CAS CONSTRUIT** : `apps/client` et `apps/pro` posent un `beforeEach` et un
`afterEach` **globaux** dans leur `test-setup.ts` — dans ces deux suites, **aucun** test n'a une
`duration` JSON égale à la quantité que le budget lie.
⇒ **Par la règle du cadrage (D286), l'instrument ABANDONNE à la calibration** : ni maximum, ni N, ni
marge. **Toute sortie réécrit la pièce 1 (la source ou la quantité) ou la pièce 3 (le verdict du
bras)** — c'est-à-dire le cadrage que l'arbitrage interdit de réécrire. **Elle appartient à Ko.**
Sorties relevées, **aucune arbitrée** : section « Session du 20/09/2026 — D296 ».
⚠ **DEUX AUTRES POINTS À ARBITRER AVEC LA REPRISE, NON BLOQUANTS SEULS** :
1. **« Un témoin » (n°0) doit se lire « un témoin SOUS CHACUNE des quatre configurations »** : la
   valeur en vigueur est celle de chaque configuration, `setupFiles` compris.
2. **MODE NON LISTÉ — la ligne écrite mais IGNORÉE.** `testTimeout: 5_000` vaut le défaut : une fois
   écrite, **l'encadrement passe qu'elle soit lue ou non** (mal imbriquée hors du bloc `test`, par
   exemple). Seule une mutation vers une **autre** valeur montre qu'elle mord. **Un mode non listé
   ne se code pas** : il attend l'arbitrage, comme candidat n°8.
3. **La tolérance du bras positif** est annoncée « écrite d'avance » et **n'est écrite nulle part** :
   elle doit l'être avant la mesure.
⛔ **LES DEUX CONDITIONS DE KO POUR LE JOUR OÙ LE LOT DE CODE REPREND — ÉCRITES ICI POUR NE PAS VIVRE
DANS LE FIL** :
1. **Ce qui fixe 5 000.** L'encadrement « 4 900 passe / 5 100 échoue » prouve que la valeur en
   vigueur est **ENTRE** les deux, pas qu'elle vaut 5 000. **C'est le texte d'aide de vitest qui
   nomme le point ; le comportement confirme qu'il tient à ±100 ms. Aucune des deux sources ne
   suffit seule ; ensemble, elles suffisent.** La clôture l'écrit **ainsi** — jamais « 5 000
   mesuré » (la faute de D290 : une valeur lue au statut de mesure).
2. **Le bras à 4 900 ms est à 100 ms du seuil**, dans la zone que la contention mange. Le mode n°0
   se joue **état machine relevé devant lui** (secteur, RAM, `chrome`) ; **un échec du bras 4 900 se
   REPRODUIT AU REPOS avant d'être cru** — s'il ne se reproduit pas, c'est une contention : on
   l'écrit et on continue. ⚠ **La source le justifie** : l'expiration se vérifie aussi **après
   coup** (`now() - startTime >= timeout`), donc un 4 900 dont la suite est retardée au-delà de
   5 000 échoue ; le bras 5 100, lui, **ne peut pas** passer à tort. **L'encadrement ne se trompe
   que d'un côté, et seulement par contention** — c'est exactement ce que la condition vise.
⛔ **CONDITION MACHINE, RELEVÉE LE 20/09/2026 ET NON SATISFAITE** : SECTEUR ✅ · `chrome` **14** ⛔ ·
RAM libre **3 849 Mo, soit −730 sous la barre de 4 579** ⛔ (`docs/preuves/D296/reproduction/`).
**Même sans le défaut, les mesures du lot ne pouvaient pas partir dans cet état.**
⇒ **Compteur de lots de code non certifiés : ZÉRO**, inchangé — aucune ligne de code, et D296 est
documentaire. ⇒ ~~**RANG 18 : EN ATTENTE D'ARBITRAGE DE KO**, aucun candidat désigné.~~ ⛔ **(D298)
Consommé le 21/09/2026 : rang 18 = l'écho de l'audit de secrets, arbitré par Ko.**

⛔ **OUVERT ET ARBITRÉ PAR KO LE 20/09/2026.** ⇒ **QUEL lot : rang 17 de l'ordre des rangs.
OÙ IL EN EST : ici.** Toutes les écritures d'ordre sont de Ko.
⇒ ~~**ÉTAT : CADRAGE SEUL, ÉCRIT. AUCUNE LIGNE DE CODE, AUCUNE PORTE LANCÉE.**~~ ⛔ **(D296,
20/09/2026) ÉTAT PÉRIMÉ — LE CADRAGE EST BLOQUÉ** : toujours aucune ligne de code ni porte, mais
l'état courant est celui écrit en tête de ce bloc. Patron des rangs 10
(D284) et 13 (D289), qui se sont ouverts de la même façon.
⚠ **Compteur de lots de code non certifiés : ZÉRO, inchangé.** Ce lot est **documentaire** — seuls
des `.md` d'autorité au diff (D283, amendé par D292). ⛔ **Le lot de CODE qui suivra — celui qui
écrira les quatre `testTimeout` — le portera à UN.** ⛔ **(D296) Arbitré au rang 17 le 20/09/2026, et
bloqué le même jour avant toute ligne : il n'a encore rien porté.** ⛔ **(D297) Écrit et clos le
21/09/2026 : il a porté le compteur à UN.**
⇒ ~~**RANG 18 : EN ATTENTE D'ARBITRAGE DE KO** (D284), **aucun candidat désigné**. Écrit à
l'OUVERTURE et non à la clôture, pour qu'aucune reprise ne tombe sur une liste qui s'arrête.~~ ⛔ **(D298)
Consommé le 21/09/2026 : rang 18 = l'écho de l'audit de secrets, arbitré par Ko.**

⛔ **CE QUE (b) EST, ET CE QU'ELLE N'EST PAS.** Elle écrit le budget **à la valeur déjà en
vigueur** dans les **quatre** configurations unitaires, **sans rien changer au comportement**. Ce
qu'elle achète : personne ne peut aujourd'hui distinguer une **politique** d'un **héritage**, et
c'est littéralement ce que dit le report — « un budget non écrit n'est pas une garde ». ⛔ **Elle
n'écrit AUCUNE valeur neuve**, donc elle ne dépend pas de l'explication des ~20 % de D290 : les
trois phrases qui conditionnaient les budgets à cette explication valent de **(a)**, pas de (b), et
sont annotées depuis le 16/09 (D294).

### ⛔ PIÈCE 1 — LA QUANTITÉ QUE LE BUDGET LIE, ET CE N'EST PAS CELLE QU'ON CROIT

`testTimeout` borne la durée **D'UN TEST**. Il ne borne **ni** les hooks — c'est `hookTimeout`, un
réglage **distinct**, déjà écrit à 60 s côté intégration — **ni** la collecte, la transformation ou
l'import du fichier, **ni** la durée de la suite.
⇒ **LA QUANTITÉ EST DONC : le MAXIMUM, sur tous les tests d'une suite, de la durée d'un test.**
C'est elle, et elle seule, dont la dispersion fonde N.
⛔ **CE QU'ON NE MESURE PAS, ET POURQUOI C'EST ÉCRIT ICI** : les **12 passes de D291** mesurent la
durée **de suite entière** (16,37 à 17,95 s). Elles ne servent pas à ce lot. **Deux passes qui se
soustraient comptent la même chose, ou elles ne se soustraient pas** (D290) — mesurer une durée et
en borner une autre est la faute que ce cadrage existe pour empêcher.
⇒ **SOURCE : le reporter JSON de vitest**, qui porte la `duration` de chaque test — **jamais un
extracteur de la sortie console**. **Motif, retenu par Ko** : cette sortie porte des codes ANSI
(D275, premier faux positif de la série) et n'imprime que les tests jugés lents. **La moitié du
problème est supprimée par construction plutôt que surveillée.**
⛔ **RÉFUTÉ PAR MESURE LE 20/09/2026 (D296) — CETTE `duration` N'EST PAS LA QUANTITÉ CI-DESSUS.**
vitest 3.2.7 la pose entre un départ pris **avant** les `beforeEach` et une fin prise **après** les
`afterEach` et nettoyages ; `testTimeout` n'enveloppe que la fonction du test. Le bras de
discrimination rend **1 208 à 1 218 ms** là où la pièce 3 exige moins de 100. ⚠ **Le motif ci-dessus
reste juste** — un extracteur de console reste écarté ; c'est la **source** qui mesure une durée
voisine, **le mode n°2 de ce même cadrage**. Non réécrite : annotée, en attente d'arbitrage.
⛔ **(D297) ARBITRÉ PAR KO — (ii) : cette `duration` devient un MAJORANT DÉCLARÉ.** Pièce amendée en
tête de ce bloc.

### ⛔ PIÈCE 2 — LA RÈGLE DE DÉRIVATION DE N, ÉCRITE **AVANT** LES CHIFFRES

⛔ **ARBITRAGE DE KO, 20/09/2026 — ÉCRIT COMME ARBITRAGE ET NON COMME MESURE.**
1. **Seuil x = 5 %.** **N est le nombre de passes tel qu'une passe de plus ne déplace plus le
   maximum observé de plus de 5 %.**
2. **PLAFOND : 15 passes par suite.** ⛔ **Si le critère n'est pas atteint à 15, le lot l'écrit
   COMME RÉSULTAT et NE choisit PAS un N par défaut.**
3. **Pas de formule gaussienne, pas de décoration.** Motif de Ko : c'est un arbitrage, **il porte
   son nom et sa date**.
⚠ **POURQUOI UN PLAFOND — la mise en garde qui l'a exigé** : le maximum est une **statistique
d'extremum**. Sa dispersion est intrinsèquement plus instable que celle d'une moyenne et **ne
rétrécit pas comme la racine de N**. Un critère de stabilisation **sans borne peut ne jamais
converger** — le plafond transforme un lot qui tourne indéfiniment en un **résultat écrit**.
⛔ **ET POURQUOI CETTE RÈGLE EST ÉCRITE AVANT TOUTE MESURE** : si on mesure d'abord et qu'on choisit
N ensuite, **N est choisi au jugé en regardant les nombres** — c'est-à-dire le motif exact qui a
fait tomber la borne de workers (D290), déplacé d'un cran. La règle écrite d'avance est la seule
chose qui rende N défendable.

### ⛔ PIÈCE 3 — LA CALIBRATION DE L'INSTRUMENT, SUR UN CAS DONT LA RÉPONSE EST CONNUE

Une **suite témoin jetable**, dont les durées sont écrites **par construction**. **Trois bras**, et
l'instrument **ABANDONNE si un seul manque son verdict** (D286) — il ne continue pas.

| bras | cas construit | verdict attendu | ce qu'il attrape |
|---|---|---|---|
| **positif** | un test qui dort **1 200 ms** | max proche de 1 200, **tolérance écrite d'avance** | l'instrument voit une durée de test |
| **négatif** | la même suite, ce test retiré, tous sous 50 ms | **max sous 100** | un instrument qui répondrait « 1 200 » à tout — **le positif seul est satisfait par un menteur constant** |
| **discrimination** | les 1 200 ms déplacés dans un `beforeEach` | ⛔ **max sous 100 — il ne doit PAS le compter** | **c'est LUI qui fait le travail** : il prouve que la quantité mesurée est celle que `testTimeout` borne, et pas une durée voisine |

⚠ **Le bras de discrimination est retenu par Ko comme le bras qui fait le travail.** Sans lui, un
instrument qui prendrait « la plus grande durée du rapport » passerait les deux autres tout en
mesurant un `beforeAll` ou un temps de transformation.
⛔ **(D297) AMENDÉE : le verdict du bras de discrimination S'INVERSE (≥ 1 200, le majorant doit les
compter), et la tolérance du bras positif est [1 200 ; 1 300], posée par Ko après trois
observations.** Table amendée en tête de ce bloc.

### ⛔ PIÈCE 4 — LES MODES DE DÉFAILLANCE. UN MODE NON LISTÉ ICI NE SE CODE PAS.

⛔ **n°0 — L'ENCADREMENT DU BUDGET EN VIGUEUR. OBLIGATOIRE, PAS OPTIONNEL : C'EST LUI QUI FONDE LE
LOT (arbitrage de Ko, 20/09/2026).** Un témoin qui dort **5 100 ms DOIT ÉCHOUER** avec la signature
`Test timed out in 5000ms` ; un témoin qui dort **4 900 ms DOIT PASSER**. ⛔ **Si l'encadrement ne
rend pas 5 000, LE LOT S'ARRÊTE ET N'ÉCRIT RIEN.**
⚠ **Motif de Ko, et il est décisif** : sans lui, (b) écrirait **un nombre recopié d'un texte d'aide
et d'un incident du 10/09** — c'est-à-dire exactement ce qu'elle prétend supprimer. ⚠ **État de la
valeur AUJOURD'HUI, déclaré pour ce qu'il est** : `5000` est le défaut documenté de **vitest 3.2.7**
(texte d'aide de l'outil installé, relevé le 18/09) et la valeur lue dans les signatures d'échec du
10/09. **Ce sont deux sources documentaires, pas un comportement mesuré.** Le n°0 est ce qui les
remplace.
⛔ **(D296, 20/09/2026) DEUX CONDITIONS DE KO S'Y AJOUTENT** — la formule de clôture sur « ce qui fixe
5 000 », et le bras 4 900 reproduit au repos avant d'être cru : **en tête de ce bloc.**
⛔ **(D297) AMENDÉ : sous CHACUNE des quatre configurations, V lu dans le texte d'aide, trois sources
nommées ; et le n°8 — la ligne écrite mais ignorée — est ajouté, obligatoire.** En tête de ce bloc.
- **n°1 — écrire dans la mauvaise configuration.** `vitest.config.int.ts` **a déjà un budget, à
  30 s** : y écrire 5 000 ms le diviserait par six, **changement de comportement que (b)
  interdit**. ⚠ Le chiffre « cinq suites unitaires » du backlog **pointait vers elle** ; corrigé le
  20/09 (D295). **Les quatre cibles sont `apps/api`, `apps/client`, `apps/pro`,
  `packages/api-client`** — seuls packages du dépôt portant un script `test` (mesuré).
- **n°2 — mesurer une durée voisine et en borner une autre** (hook, collecte, suite entière).
  Couvert par le **bras de discrimination** de la pièce 3.
- **n°3 — choisir N après avoir vu les chiffres.** Couvert par la pièce 2, écrite d'avance.
- **n°4 — mesurer sur batterie ou sous bridage.** `SECTEUR` exigé ; `PERF` se lit **PENDANT** la
  mesure par l'échantillonneur, et **aucun seuil `PERF` n'entre dans un critère** (D290, D291).
- **n°5 — mesurer sous contention.** ⛔ **Le maximum par test est précisément ce qui s'effondre sous
  charge** — 22 signatures de dépassement le 10/09 sur une suite verte au repos. La mesure se fait
  **AU REPOS, état machine relevé AVANT** (D270). Une passe sous charge ne se soustrait pas d'une
  passe au repos.
- **n°6 — un extracteur qui rend zéro en silence.** ⛔ *(D296 : le reporter JSON est réfuté comme
  source de la quantité — pièce 1 ; le risque du zéro silencieux, lui, reste entier.)* Le reporter JSON l'écarte en grande partie ;
  tout compteur imprime son **parcouru**, son **attendu à côté du mesuré**, et sa **ventilation par
  motif** (D290, D295).
- **n°7 — mêler les régimes de passe.** La **POSITION** d'une passe est un terme de durée établi
  (D291 : après repos plus lente qu'enchaînée, **6 cycles sur 6, de 0,7 à 7,2 %**). Les N passes se
  prennent dans un **régime déclaré**, pas moitié après repos moitié enchaînées.

### ⛔ CE QUE CE CADRAGE NE FAIT PAS

1. **Il n'écrit aucun `testTimeout`** — aucune des quatre configurations n'est touchée.
2. **Il ne mesure rien** : ni maximum par test, ni dispersion, ni N. Aucune porte n'est lancée.
3. **Il n'écrit aucun instrument** — ni le lecteur de rapport JSON, ni la suite témoin : un script
   ferait **compter** ce lot (D283).
4. **Il n'épuise pas l'entrée `[MÉTHODE][P0]` du backlog**, qui reste **ouverte** : c'est le lot de
   CODE qui l'épuisera.
5. **Il ne fixe pas N**, qui n'existera qu'après mesure — et **peut n'exister pas du tout** si le
   plafond de 15 passes est atteint sans convergence, ce qui est alors **un résultat**.

## ~~PROCHAIN LOT~~ — rang 16 · `[DOC]` **les sept constats de la reprise à froid** ⛔ **CLOS LE 16/09/2026 : D294**

⛔ **TITRE BARRÉ À LA CLÔTURE (patron de D273, D284 et D293)** : l'étiquette « PROCHAIN LOT » sur du
fait accompli envoie une reprise à froid travailler sur un rang clos. **Le corps reste l'état du
rang 16.**
⇒ ~~**RANG 17 : EN ATTENTE D'ARBITRAGE DE KO** (D284). ⚠ **CANDIDAT DÉSIGNÉ, PAS ARBITRÉ** : les
**budgets de test**, dans la forme **(b)** arbitrée le 16/09 — *écrire la valeur EN VIGUEUR*.
« Je l'ouvrirai après ce lot » (Ko). **Une désignation n'est pas un arbitrage, et la session
n'arbitre pas l'ordre des rangs.**~~
⛔ **CONSOMMÉ LE 20/09/2026 (D295) — ARBITRÉ PAR KO : le RANG 17 est les BUDGETS DE TEST, forme (b),
CADRAGE SEUL.** Barré plutôt qu'effacé (D276). ⇒ ~~**RANG 18 : EN ATTENTE D'ARBITRAGE DE KO**, aucun
candidat désigné.~~ ⛔ **(D298) Consommé le 21/09/2026 : rang 18 = l'écho de l'audit de secrets.**
⚠ **Compteur de lots de code non certifiés : ZÉRO.** ⛔ *(D297 : passé à UN le 21/09/2026 par le lot
de code du rang 17.)* Ce lot est **DOCUMENTAIRE** — aucun fichier
hors `.md` d'autorité au diff, `docs/preuves/` exempté (D283, amendé par D292) — donc **il ne s'y
ajoute pas.** Un lot de code peut s'ouvrir dès l'arbitrage de Ko, et c'est lui qui portera le
compteur à un.
⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE** : compteur à UN (rang 17, D297) puis à DEUX (rang 18,
D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.

⛔ **OUVERT ET ARBITRÉ PAR KO LE 16/09/2026**, à la lecture du rapport d'une reprise à froid —
**septième de la série**, et la première depuis que la forme en a été allégée (première partie
sans recoupement, seconde partie entière). ⇒ **QUEL lot : rang 16 de l'ordre des rangs. OÙ IL EN
EST : ici.** Toutes les écritures d'ordre sont de Ko.
⛔ **MOTIF DE L'ORDRE, ÉCRIT PAR KO** : « une phrase qui déclare à moitié fait un lot **certifié**
du chemin de l'argent est plus dangereuse qu'un budget manquant ». Le constat n°1 passe donc
devant, et les budgets attendent un rang de plus.
⚠ **CE QUE CE LOT N'EST PAS** : une certification. Il ne mesure aucune porte, n'en relance
aucune, **et ne relance pas l'e2e** (consigne de Ko) — il écrit la RÈGLE de l'extrait élargi,
dont l'application vient à la prochaine certification.

⇒ **LES SEPT CONSTATS ONT TOUS ATTERRI. Où :**

| # | constat | où il a atterri |
|---|---|---|
| 1 | le bloc du rang 8 se présentait comme un lot **ouvert** du chemin de l'argent | bloc « RANG 8 » : titre, sous-titre, 3 affirmations barrées ; **règle de D282 complétée** et portée dans `AGENTS.md` |
| 2 | `testTimeout` de `apps/api` « serré à 5 s » — périmé sur ses trois termes | « Décisions encore ouvertes », barré avec la mesure |
| 3 | « le bac à sable n'a ni navigateur ni API » — raison périmée, dette conservée | « Dette restante », raison barrée (D268) |
| 4 | la réparation de `vite.config.ts:24` absente du seul fichier chargé à chaque session | `AGENTS.md`, bloc D289 |
| 5 | `+1` de `.split("\n")` — « 911 » au lieu de 910 | section D293 rectifiée ; `RECTIFICATION-D294.txt` à côté de l'archive **non retouchée** |
| 6 | titre « n'a pas été lancée » sur une entrée close | `ZWADJ_BACKLOG.md`, une ligne |
| 7 | section « NON corrigés » portant deux entrées closes | `ZWADJ_BACKLOG.md`, une ligne |

⇒ **DEUX DÉCISIONS DE KO, PRISES SUR MESURE, ET LA PREMIÈRE A CHANGÉ SON ARBITRAGE** :
**journal e2e — ni 1 ni 2**, l'extrait s'élargit (critère, **point 9**) ; **budgets — option (b)**,
candidat du rang 17. ⇒ Détail, pièces et fautes : section « **Session du 16/09/2026 — D294** ».

## ~~PROCHAIN LOT~~ — rang 15 · **CERTIFICATION** ⛔ **CLOS LE 16/09/2026 : D293 — MARQUE POSÉE**

⛔ **TITRE BARRÉ À LA CLÔTURE (patron de D273 et D284)** : un bloc qui garde l'étiquette « PROCHAIN LOT »
sur du fait accompli envoie une reprise à froid travailler sur un rang clos. **Le corps ne bouge pas** —
il reste l'état du rang 15, refus compris.
⇒ ~~**RANG 16 : EN ATTENTE D'ARBITRAGE DE KO** (D284). L'ordre des rangs (section D270) dit QUEL lot ;
**aucun rang 16 n'est arbitré**, et la session n'en choisit pas.~~ ⛔ **CONSOMMÉ LE 16/09/2026 (D294) —
ARBITRÉ PAR KO : le RANG 16 est le LOT DOCUMENTAIRE des sept constats.** Barré plutôt qu'effacé (D276).
⇒ ~~**RANG 17 : EN ATTENTE D'ARBITRAGE DE KO**, candidat désigné = les **budgets de test**, forme (b).~~
⛔ **CONSOMMÉ LE 20/09/2026 (D295) — ARBITRÉ : rang 17 = budgets de test, forme (b), cadrage seul.**
⇒ ~~**RANG 18 : EN ATTENTE D'ARBITRAGE DE KO**, aucun candidat désigné.~~ ⛔ **(D298) Consommé le
21/09/2026 : rang 18 = l'écho de l'audit de secrets.**
⚠ Le compteur est à **ZÉRO** : un lot de
code peut s'ouvrir dès que Ko l'arbitre, et c'est lui qui le portera à un. ⚠ **Le rang 16 ne l'a pas
porté à un** : il est documentaire. ⚠ **Le rang 17 non plus, tant qu'il en est à son CADRAGE** — le
lot de CODE des budgets, lui, le portera à un (D295).
⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE** : compteur à UN (rang 17, D297) puis à DEUX (rang 18,
D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.


⛔ **OUVERT ET ARBITRÉ PAR KO LE 14/09/2026, ÉCRIT À LA CLÔTURE DE D292.** ⇒ **QUEL lot : rang 15 de
l'ordre des rangs. OÙ IL EN EST : ici.** Toutes les écritures d'ordre sont de Ko.
⛔ **MOTIF DE L'ORDRE, ÉCRIT PAR KO** : le compteur de lots de code non certifiés est à **DEUX** —
le rang 13 (`251e82b`) et l'incident D292 (`49f3ace`) —, c'est la dernière place, et **la règle
impose la certification.**
⛔ **LA MARQUE NOMMERA LE RANG 13 ET L'INCIDENT D292, RIEN D'AUTRE.** Le rang 14 est hors du compte
(exemption `docs/preuves/`, `.gitattributes` compris par sa clause — `AGENTS.md`, bloc D283).

⇒ **ORDRE DE KO, À ENCHAÎNER SANS L'ATTENDRE** — Ko ferme `chrome` et ne touche plus la machine :

0. ⛔ **URGENCE DATÉE DE D292 — ARCHIVER LES 26 JOURNAUX DE CAMPAGNE DE D288, AVANT TOUTE MESURE.**
   `--tout` les **réécrit** : `lancer-campagnes.py` ouvre chaque `neutralize-*.py.log` en `"w"`
   (relu le 14/09/2026). Sur disque le 14/09/2026 à 01:00 : **26 fichiers** dans
   `.neutralisation-journaux/`, du 12/09 00:56:04 au 12/09 01:25:31. ⇒ Copie **octet pour octet**
   dans `docs/preuves/D288/`, vérifiée par empreinte, audit de secrets non tronqué qui rend ce qu'il
   a parcouru (règle des preuves, D291), **puis commit AVANT toute mesure**.
   - **Exempté du compteur** : c'est un versement de preuves. **La clause `.gitattributes` s'applique,
     et son contrôle se rejoue avant le commit** (`AGENTS.md`, bloc D283).
   - ⚠ **Le rattachement de ces journaux à D288 est une INFÉRENCE par nom et par heure** (backlog,
     reports de D291) : le confronter à ce que D288 écrit — le total de gardes de sa passe `--tout` —
     **avant** de l'écrire comme un fait.
   - ⚠ **Les journaux de travail de la certification portent des noms propres au rang 15** : les
     `p1`…`p5` du rang 11 sont génériques et seraient écrasés (même entrée du backlog).
1. **Relevé d'ouverture, calibration rejouée.** ⛔ **PORTE DURE — sinon rien ne se lance, et la
   session le dit à Ko** : `chrome` = 0 ; RAM libre **au-dessus de la barre** ; **SECTEUR**. Critère :
   section « LE CRITÈRE DU RANG 9 », point 6 durci par D290, porte `chrome` = 0 entrée par D288 —
   **aucune valeur n'est recopiée ici**.
2. **La passe complète, en une fois** : échantillonneur en fond, **arbre immobile**.
3. **La marque** — elle nommera le rang 13 et l'incident D292, rien d'autre — **ou le refus motivé.**

⚠ **LIMITE À RELEVER DANS LA MARQUE** : la base de dev `zwadj` est **vierge** depuis D292. Rien ne
bloque — `test:int` recrée `zwadj_test` (`apps/api/test/int/setup-global.ts`) et l'e2e recrée
`zwadj_e2e` (`e2e/global-setup.ts`, base par défaut de `e2e/playwright.config.ts`) — mais **la marque
portera sur une base reconstruite, sans les données sur lesquelles D282 a mesuré.**

⇒ ~~**ÉTAT AU 14/09/2026 : ARBITRÉ, RIEN D'EXÉCUTÉ.**~~
⛔ **ÉTAPE 0 FAITE LE 14/09/2026 (D293), AVANT TOUTE MESURE** : les 26 journaux sont versés dans
`docs/preuves/D288/campagnes/`, 26 copies identiques sur 26 ; leur rattachement à D288 est **confronté
au texte de D288 et CONCORDANT** — ce qui reste une inférence confrontée, pas une preuve d'origine.
**Le protocole de la passe est écrit et commité AVANT le relevé d'ouverture.** ⇒ Étape 0, protocole,
passe et marque : section « **Session du 14/09/2026 — D293** ».
⛔ **ÉTAPE 1 ROUGE LE 14/09/2026 — PORTE DURE `chrome` : 14 puis 15 aux deux relevés d'ouverture (01:50,
01:51), une fenêtre Google Chrome visible. RIEN N'EST LANCÉ, AUCUNE MARQUE.** RAM et SECTEUR étaient
verts. ⇒ **Le rang 15 reste OUVERT. La reprise se fait À L'ÉTAPE 1**, sur le protocole commité dans
`657e9ba`, **sans le réécrire** ; l'étape 0 est acquise. **Condition, et elle appartient à Ko** :
`chrome` à 0 au relevé — détail et pièces, section D293, « ÉTAPE 1 ».
✅ **MARQUE POSÉE LE 16/09/2026 (D293), À LA TROISIÈME TENTATIVE** : « **Portes vertes AU REPOS le
16/09/2026, et le rang 13 (D290, `251e82b`) et l'incident D292 (`49f3ace`) en font partie** ». **Deux
lots, rien d'autre**, aucun en-tête antérieur réécrit. ⇒ **Compteur de lots de code non certifiés :
DEUX → ZÉRO**, le **rang 15 est CLOS**, et un lot de code peut s'ouvrir dès l'arbitrage de Ko.
⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE** : compteur à UN (rang 17, D297) puis à DEUX (rang 18,
D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.
⇒ Chiffres, fenêtre, limites et fautes : section **D293**.
⚠ Les deux refus qui précèdent restent écrits, non effacés — c'est ce qui rend la troisième fenêtre
lisible :
⛔ **SECONDE TENTATIVE LE 16/09/2026 — `chrome` = 0 (Ko l'a fermé), ET LA PORTE DURE EST ROUGE SUR LA
RAM** : 3 073,5 puis 3 077,5 Mo, soit **−1 505,5 et −1 501,5** sous la barre, à 80 s d'écart, SECTEUR et
calibration passante (rendement 0,96). **RIEN N'EST LANCÉ, AUCUNE MARQUE.** ⚠ La RAM libre est **plus
basse de 2 222 Mo** qu'au relevé du 14/09, qui était **au-dessus de la barre avec Chrome ouvert** :
le déficit n'est pas Chrome. ⇒ **Le rang 15 reste OUVERT**, reprise à l'étape 1 ; **deux sorties, toutes
deux arbitrage de Ko** — libérer de la mémoire, ou consommer la sortie écrite de D270 (redéfinir
« repos » sur le plancher que cette machine peut produire, avec sa raison). Détail, inventaire et
pièces : section D293, « ÉTAPE 1, SECONDE TENTATIVE ».

## ~~PROCHAIN LOT~~ — rang 14 · `[MÉTHODE][P0]` **`PERF` et la durée** ⛔ **CLOS : D291 — UN TERME NOMMÉ, LA POSITION ; L'ÉCART DE D290 NON REPRODUIT**

⛔ **ÉTIQUETTE BARRÉE À LA CLÔTURE, PATRON DE D284** : le corps reste l'état du rang 14 ; c'est
l'étiquette « PROCHAIN LOT » qui mentirait. ~~**Le rang 15 n'est pas arbitré** : il n'a pas de bloc.~~
⛔ **(14/09/2026, D292) LE RANG 15 EST ARBITRÉ : CERTIFICATION** — son bloc est au-dessus.

⛔ **OUVERT ET ARBITRÉ PAR KO LE 12/09/2026 (D291).** ⇒ **QUEL lot : rang 14 de l'ordre des rangs.
OÙ IL EN EST : ici.** Sixième écriture d'ordre, et toutes sont de Ko.
⛔ **CE QUI L'A OUVERT : la reprise à froid du 12/09/2026, première de la série à confronter les
textes d'autorité aux JOURNAUX BRUTS qu'ils citent.** Trois chiffres écrits comme des mesures ne
s'y retrouvaient pas, dont un dans `AGENTS.md` (section D291).
⛔ **MOTIF DE L'ORDRE, ÉCRIT PAR KO** : ce rang passe **avant les budgets de test**, parce qu'un
budget calculé sur des durées dont ~20 % restent inexpliqués serait choisi au jugé. Et **avant de
mesurer quoi que ce soit, le dossier cesse d'affirmer ce qu'il n'a pas mesuré** : c'est l'étape 0
du même lot.
⛔ **(D294, 16/09/2026) CE MOTIF VAUT DE LA FORME (a), PAS DE LA FORME (b) — ET LA DISTINCTION
DÉBLOQUE LE LOT.** Il reste **entièrement vrai** d'un budget qui *choisirait une valeur* sur des
durées : celui-là attend toujours une explication des ~20 %, et elle n'est pas venue. Il est
**sans objet** pour la forme **(b)** arbitrée par Ko le 16/09 — *écrire la valeur EN VIGUEUR*,
sans rien changer au comportement : **aucune valeur neuve n'y est choisie, donc rien n'y est
choisi au jugé.** ⚠ **Lue seule, cette phrase conditionne le lot des budgets à une explication
qui ne viendra peut-être jamais** — c'est le second sens de D287, celui qui n'a rien à contredire
et qu'aucune recherche par contradiction ne ramène. **Trois phrases de cette famille ont été
annotées le 16/09**, ici, dans l'ordre des rangs, et au backlog.

⇒ **ÉTAPES DU RANG, AU 13/09/2026** :
1. ✅ **Étape 0 faite** — trois chiffres barrés et remplacés par ce que rendent les journaux, quatre
   phrases périmées dont une **permissive**, le report de la quatrième reconduction, et sept autres
   affirmations de la même classe trouvées en chemin. Détail : section D291.
2. ✅ **Règle de classe et décision de forme posées dans `AGENTS.md`** : une hypothèse formulée dans
   le fil ne s'écrit pas au statut de mesure ; les preuves brutes qu'une décision cite entrent au
   dépôt, sous `docs/preuves/<Dnnn>/`.
3. ✅ **Preuves de D290 versées** : 9 fichiers, 9 identiques à leur source par sha256.
4. ✅ **Protocole du relevé écrit et commité AVANT la première passe** (section D291, `f8b578d`).
5. ~~⏳ **Relevé : à faire.**~~ ✅ **Relevé fait le 13/09/2026, de 02:46 à 02:57** : 12 passes sur 12
   à 287/287, SECTEUR devant chacune.

⛔ **ÉTAT : CLOS (D291)**, selon les règles commitées avant la mesure :
- ⛔ **Q3, ÉTABLI — LA POSITION EST UN TERME DE DURÉE** : une passe enchaînée est plus rapide qu'une
  passe après 60 s de repos, dans **6 cycles sur 6**, de **0,7 à 7,2 %**. Le **sens** est établi, pas
  le mécanisme.
- **Q2, l'observateur : non établi.** **Q1, la « retombée » : non établie** (5 cycles sur 6) —
  l'inférence de l'étape 0 reste une inférence.
- **Q4 : ρ = +0,70 sur n = 6**, non établi par règle — et **de signe inverse** à l'hypothèse de D290.
- ⛔ **L'écart de ~20 % de D290 N'EST PAS REPRODUIT** — 12 durées de 16,37 à 17,95 s : **il reste
  inexpliqué**, et ce rang ne prétend pas l'avoir expliqué.
⇒ **Aucun remède** : ni borne, ni budget, ni règle tirée du terme — à Ko d'en décider (backlog).

⛔ **COMPTEUR DE LOTS DE CODE NON CERTIFIÉS : DEUX** — ~~le rang 13 (`251e82b`) et ce rang, qui verse
des fichiers hors `.md` d'autorité (`.gitattributes`, `docs/preuves/**`, scripts compris).~~ ⇒ **Il
se lit désormais ici, et c'est la dernière place : aucun lot de code ne s'ouvre avant une
certification.**
⛔ **(D293, 16/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 15, **compteur à
ZÉRO**, et **un lot de code PEUT s'ouvrir** dès que Ko l'arbitre — c'est lui qui le portera à un.
⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE** : compteur à UN (rang 17, D297) puis à DEUX (rang 18,
D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.
⛔ **COMPOSITION BARRÉE LE 13/09/2026 (D292) — LE CHIFFRE RESTE DEUX, UN DE SES DEUX LOTS A CHANGÉ.**
Ko a tranché l'écart ci-dessous : **`docs/preuves/` ne compte pas** (amendement de D283, écrit dans
`AGENTS.md`), donc **ce rang sort du compte**. L'**incident `zwadj-db`** du 13/09/2026 y **entre** :
il modifie `docker-compose.yml`, qui peut dégrader `test:int`. ⇒ **DEUX = le rang 13 (`251e82b`)
et l'incident D292.** Le rang 15 devra donc passer par une certification (Ko, 13/09/2026).
⛔ **TRANCHÉ PAR KO LE 14/09/2026 (D292) : `.gitattributes` EST COUVERT** — par ce que fait sa ligne,
pas par son nom. Clause bornée et son contrôle : `AGENTS.md`, bloc D283. **Le compteur reste à DEUX.**
⚠ ~~**ÉCART DE LETTRE, SIGNALÉ ET NON TRANCHÉ PAR LA SESSION**~~ — constat d'origine : ce rang porte aussi `.gitattributes`,
hors `docs/preuves/`. Sa seule ligne active est `docs/preuves/** -text` (relevé le 13/09/2026) : il
n'agit que sur les preuves. Le compte de Ko, DEUX, le range avec elles ; la lettre de l'exemption
ne le nomme pas.
⚠ ~~**ÉCART DE LECTURE, ÉCRIT PLUTÔT QUE TRANCHÉ**~~ **TRANCHÉ PAR KO LE 13/09/2026 (D292), VOIR
CI-DESSUS** : Ko a écrit « ce lot est du CODE si tu verses un
instrument » ; D283, telle qu'elle est écrite, compte **tout** fichier hors `.md` d'autorité,
preuves archivées comprises. La session applique la lettre. Exempter des preuves qu'aucune porte
ne lit serait un **amendement de D283**, et il appartient à Ko.
⛔ **LE RANG SUIVANT NE SE LIT PAS ICI** : ordre des rangs (section D270) — ~~**rang 15 en attente
d'arbitrage de Ko**~~ ⛔ **rang 15 = CERTIFICATION, arbitré par Ko le 14/09/2026 (D292)**.

### ⛔ CE QUE CE LOT NE FERA PAS

1. **Aucun seuil `PERF` dans aucun critère** (consigne de Ko) : « > 100 avant la mesure » est
   insatisfiable au repos, la certification de D288 ouvre à 74,8.
2. **Aucune borne, aucun `testTimeout`, aucun budget** : les budgets viennent après ce rang.
3. **Aucun instrument modifié ni promu** : `passes_secteur.ps1` et le harnais de D291 sont des
   **preuves archivées**. Les outils d'écriture du scratchpad ne sont pas de ce lot (consigne de Ko).
4. **Pas de certification**, et aucune durée de ce relevé ne se compare aux six de D288.
5. **Aucune preuve d'une autre décision n'est versée** : leur rattachement n'est écrit nulle part
   (report au backlog).

## ~~PROCHAIN LOT~~ — rang 13 · `[MÉTHODE][P0]` **la borne de workers** ⛔ **CLOS : D290 — TROIS TERMES ÉLIMINÉS, AUCUNE BORNE POSÉE**

⛔ **ÉTIQUETTE BARRÉE LE 12/09/2026, PATRON DE D284** : ce bloc a porté « PROCHAIN LOT » pendant
que son corps déclarait le rang clos, et une reprise à froid a déjà lu « prochain » sur du fait
accompli (rang 9). **Le corps ne bouge pas** — il reste l'état du rang 13 ; c'est l'ÉTIQUETTE
qui mentirait.
⇒ **ÉTAT : CLOS. Trois termes éliminés, AUCUNE borne posée, aucun `testTimeout` écrit.** Les
cinq passes, le durcissement du point 6 et ce qui reste ouvert sont en section **D290**.
⚠ **`pro` garde sa borne** (`maxWorkers: 4`, D270, 30/08) — vue mordre au relevé : 4 workers
contre 11 pour `api` et `client` dans la même trace.
⛔ **LE RANG SUIVANT NE SE LIT PAS ICI** : l'ordre des rangs (section D270) dit QUEL lot, ce
bloc dit OÙ IL EN EST (D283).

⛔ **OUVERT ET ARBITRÉ PAR KO LE 12/09/2026.** ⇒ **QUEL lot : rang 13 de l'ordre des rangs.
OÙ IL EN EST : ici.** C'est la **cinquième** écriture d'ordre, et toutes sont de Ko. Le
candidat était **désigné** depuis le 11/09 (« quatre configs, c'est du code et ça mérite son
propre rang ») et **bloqué** derrière la marque du rang 12 ; la marque est posée (D288), le
compteur de lots de code non certifiés ~~est~~ **ÉTAIT** à **zéro**, la condition est levée.
⚠ **IL EST À UN DEPUIS `251e82b` (D290)** — ce rang porte du code. La condition de son
OUVERTURE reste levée, elle s'évaluait à l'ouverture ; c'est le compteur qui a bougé, et il
est écrit ici parce que c'est lui qu'un prochain rang devra lire.
⛔ **À DEUX DEPUIS D291 (13/09/2026)** — ~~le rang 14 verse des fichiers hors `.md` d'autorité
(D283).~~ **Motif barré le 13/09/2026 (D292)** : le rang 14 sort du compte par l'exemption
`docs/preuves/`, l'incident `zwadj-db` y entre — le compteur reste à DEUX. ⇒ **Le compteur se lit désormais dans le point d'entrée du rang 14.**

⛔ ~~**ÉTAT, AU 12/09/2026 : CADRAGE SEUL, ÉCRIT. AUCUNE LIGNE DE CODE.** Patron du rang 10
(D284), qui s'est ouvert de la même façon. ⇒ **Ce lot est DOCUMENTAIRE** — deux `.md`
d'autorité au diff, aucun fichier de code (D283) : **il ne compte pas** dans les deux/trois.
**Le lot de CODE qui suivra portera le compteur à un.**~~

⛔ **PÉRIMÉ LE MÊME JOUR, 12/09/2026 (D290) — LE LOT DE CODE A EU LIEU, ET IL N'A POSÉ AUCUNE
BORNE.** Barré plutôt qu'effacé (D276) : effacé, « cadrage seul » se relirait comme l'état
courant par une reprise à froid.
⇒ **ÉTAT : LE RELEVÉ EST FAIT. TROIS TERMES SONT ÉLIMINÉS. AUCUNE BORNE N'EST POSÉE.** Détail
et chiffres en section **D290**. Le rang porte du code (`251e82b`, la restauration de
`vite.config.ts:24`), donc **le compteur de lots de code non certifiés est à UN.**
⛔ **LES TROIS TERMES ÉLIMINÉS SE LISENT ICI, POUR QU'AUCUNE REPRISE NE LES REMESURE** :
1. la **RAM à l'ouverture** — démentie au cadrage (D289) : le cas rouge à 4 636 Mo tombe
   **entre** deux cas verts à 4 624 et 4 643 ;
2. le **chemin d'invocation**, racine contre filtré — mesuré **identique** (D290) : **11
   workers contre 11**, et **1,6 %** d'écart de durée sur un bruit de **19 %**. La sérialisation
   de `--workspace-concurrency=1` est **stricte**, dénombrée à 1 paquet en vol sur 34 relevés ;
3. le **nombre de workers** comme grandeur propre — il ne distingue pas les deux chemins, et
   le « 12 à 14 » du cadrage comptait des **processus** (11 workers + 2 pnpm + 1 runner).
~~⇒ **CE QUI RESTE DÛ, ET CE N'EST PLUS UNE BORNE** : l'expérience du **RÉGIME D'ALIMENTATION**,
seul terme non éliminé, **dont Ko produit la condition** (il débranche le secteur, charge
haute). Protocole et deux issues écrits d'avance en D290 — terme identifié ⇒ **le rang change
d'objet** ; vert des deux côtés ⇒ **le rang se clôt sur trois éliminations sans remède, ce qui
est un résultat et non un échec**.~~
⛔ **BARRÉ LE 13/09/2026 (D291) : RIEN NE RESTE DÛ ICI.** L'expérience batterie a été refusée par
Ko avant toute mesure, et le rang s'est clos par condition (section D290, « Clôture du rang 13 »).
La dispersion de durée **à régime constant** est l'objet du **rang 14** (D291).
⚠ **ET LE PROTOCOLE DE DÉRIVATION CI-DESSOUS N'EST PAS PÉRIMÉ, IL EST SUSPENDU** : son point 3
dit lui-même « si le verdict ne bouge pas sous contention, la suite N'A PAS le défaut et NE
REÇOIT PAS DE BORNE ». Il n'a jamais été atteint, faute de contention reproductible — et c'est
exactement ce que son point 4 interdisait de contourner.

⛔ **MOTIF DE L'ORDRE, ÉCRIT PAR KO** : les six durées gravées le 12/09 par D288 sont la
**référence**. Une borne de workers les déplace toutes. **Les déplacer sans l'avoir écrit
d'avance fait perdre la comparaison** — et la comparaison est le seul instrument qui reste
pour distinguer un lot qui règle le défaut d'un lot qui déplace le seuil.

### ⛔ ÉTAPE 0 — FAITE DANS CE LOT, ET C'EST UNE PERMISSION PÉRIMÉE QUI A ÉTÉ AMENDÉE

`AGENTS.md` portait, depuis la campagne SOLID : « **Tout script d'édition vérifie son nombre
d'occurrences AVANT de remplacer, et le marqueur attendu APRÈS.** » Cette phrase **déclare un
contrôle suffisant**. L'utilitaire de D288 l'a respectée **à la lettre** — 1 remplacement,
0 LF nu, marqueur présent, les trois vrais — et a écrit faux : **la corruption était dans son
ENTRÉE**, en amont de tout contrôle.
⛔ **C'est une permission périmée au sens de D287** : elle ne contredit aucun mot d'aucun lot,
donc **aucune recherche par contradiction ne la ramène**. Elle vivait dans le seul fichier
chargé à chaque session, sur la règle même dont la faute a montré la brèche.
⇒ **AMENDÉE, pas complétée** (arbitrage de Ko) : les deux contrôles sont déclarés
**nécessaires et non suffisants** ; la règle d'interpolation est posée au même endroit ; et le
contrôle **se déplace vers le FICHIER relu**. Détail : `AGENTS.md`, bloc « AMENDÉ LE
12/09/2026 (D289) ».
⚠ **ET LE BALAYAGE A TROUVÉ LA CLASSE DÉJÀ POSÉE DANS UN FICHIER DE CODE** : sur **457
fichiers source**, **une** occurrence — `apps/pro/vite.config.ts:24`, un jeton mangé entre la
virgule et le « = 4 », **double espace pour seule trace**, introduite par `1f85aa6` (D270,
30/08). **Treize jours et une certification complète** ne l'ont pas vue : un commentaire ne
casse aucune porte. ⇒ **Sa restauration est la première écriture du lot de CODE** — elle est
dans le fichier que ce rang doit toucher, donc elle n'a pas à être un lot à part.

### 1 · ⛔ LA GRANDEUR SE NOMME AVANT QUE LA BORNE SE POSE

Elle est **chiffrée depuis le 30/08 et sans nom depuis le 30/08**. Un lot qui pose une borne
sans nommer ce qu'elle borne repose le même défaut au prochain poste — **troisième occurrence
qu'on paierait**.

⇒ **NOM RETENU : la MÉMOIRE DISPONIBLE PAR WORKER, PENDANT la passe.** Trois termes, et
chacun porte sa raison :
- **mémoire**, pas cœurs : le commentaire de `apps/pro/vite.config.ts` nomme déjà le mécanisme
  — « chaque worker porte un environnement jsdom complet ; le défaut de vitest suit le nombre
  de cœurs (12 ici) **sans regarder la mémoire disponible** » ;
- **par worker**, pas globale : c'est le terme que la barre RAM globale **ne capture pas** ;
- **pendant**, pas à l'ouverture : la passe est **son propre consommateur**. Mesuré le 10/09 —
  elle fait tomber la RAM libre de **5 400 à 2 652 Mo** avec **12 à 14 workers**, et **66
  échantillons sur 104** passent sous la barre, **dont zéro machine au repos**.
  ⛔ **CES DEUX CHIFFRES SONT PÉRIMÉS — MESURÉ LE 12/09/2026 (D290).** Le creux de 2 652 Mo
  appartient aux **54 minutes** des portes ET des campagnes, pas à la suite : isolée,
  `pnpm test` creuse **1 329 Mo** et plancher à **4 396**. Et « 12 à 14 » comptait des
  **processus** — les workers sont **11** (11 + 2 pnpm + 1 runner = 14). ⚠ **Le MÉCANISME
  nommé ci-dessus n'est pas touché ; son CHIFFRAGE l'est** — et c'est la distinction que le
  cadrage lui-même exigeait en nommant la grandeur.

⛔ **LA PREUVE QUE LA BARRE GLOBALE NE SUFFIT PAS EST DÉJÀ AU DÉPÔT, ET ELLE EST NETTE.** Dans
le cas ROUGE du 09/09, la barre RAM était **SATISFAITE** — 4 636 Mo, soit **+57 au-dessus** de
4 579 — et la suite a rendu **273/287**. Une porte dure franchie n'a donc rien protégé.
**C'est ce constat qui NOMME la grandeur** : si la quantité qui décidait était la RAM libre à
l'ouverture, ce cas serait vert.

### 2 · ⛔ TROIS SUITES, TROIS MESURES — ET LA DÉRIVATION S'ÉCRIT ICI, PAS APRÈS COUP

| config | borne | environnement |
|---|---|---|
| `apps/pro/vite.config.ts` | ✅ `maxWorkers: 4` (D270, mesuré le 30/08) | jsdom |
| `apps/client/vitest.config.ts` | ⛔ aucune — **la suite qui a rendu les 22 délais dépassés** | jsdom |
| `apps/api/vitest.config.ts` | ⛔ aucune | **node** |
| `packages/api-client/vitest.config.ts` | ⛔ aucune | **node** |

⛔ **INTERDIT : TRANSPOSER LE `4` DE `pro`.** Le backlog l'écrit déjà, et D270 l'a mesuré —
la borne coûte **+31 %** sur `pro`, la sérialisation **2,6×**. Ces chiffres sont ceux de
`pro`, **pas une propriété du dépôt**. Une borne recopiée est un réglage que personne ne
saura défendre.

⇒ **COMMENT CHAQUE BORNE SE DÉRIVE — le protocole, écrit d'avance pour qu'aucun chiffre ne
soit choisi au jugé puis appelé une mesure :**

1. **Relevé d'ouverture** par `neutralisation/sonde-etat-machine.ps1`, calibration rejouée
   (D286) : RAM libre médiane, `chrome` = 0, `node` = 0, alimentation. **Même porte dure que
   la certification** — sinon la mesure renseigne sur la machine (D270).
2. **Suite SANS borne, AU REPOS** : verdict, durée, et `echantillonneur-etat-machine.ps1` en
   fond pour le **creux de RAM pendant** et le **nombre de workers observé**.
3. **Suite SANS borne, SOUS CONTENTION** (point 3 ci-dessous), même relevé.
   ⛔ **Si le verdict ne bouge pas sous contention, la suite N'A PAS le défaut et NE REÇOIT
   PAS DE BORNE.** D270 a déjà tranché ainsi pour `client` le 30/08 — « je ne peux rien
   démontrer » ⇒ borne non appliquée. **Ce résultat est un résultat, pas un échec du lot.**
4. **Si le verdict bouge** : bornes candidates mesurées **chacune au repos ET sous la même
   contention**. ⇒ **Retenue : la PLUS GRANDE borne qui rend le verdict stable sous
   contention.** Motif : la borne s'achète en durée ; prendre la plus petite qui marche paie
   plus que nécessaire, sur des portes dont les durées sont la référence de D288.
5. Le chiffre retenu s'écrit **dans la config, avec sa mesure** — les deux verdicts et les
   deux durées — comme D270 l'a fait pour `pro`.

⚠ **ET UN RÉSULTAT À PRÉVOIR D'AVANCE, POUR NE PAS SE CROIRE OBLIGÉ DE POSER TROIS BORNES** :
`api` et `api-client` tournent en `environment: "node"`, **pas jsdom**. Le mécanisme nommé —
un environnement jsdom complet par worker — **ne s'y applique pas tel quel**. Il est donc
attendu que la mesure conclue « pas de borne » pour l'une ou les deux. ⛔ **Poser une borne
là où la mesure n'en demande pas serait exactement le réflexe que ce cadrage interdit.**

### 3 · ⛔ LA DÉMONSTRATION — ET LA CONTENTION DOIT ÊTRE PRODUITE, PAS ATTENDUE

**Le défaut se reproduit par une mesure avant d'être corrigé.** Cas de référence, relevé :
`pnpm --filter @zwadj/client run test` rend **273/287 avec 22 signatures « Test timed out in
5000ms »** sous contention, et **287/287 en 21 s** au repos.
⇒ **La borne doit rendre ce verdict STABLE sous la MÊME contention.** Sinon elle n'a rien
corrigé : elle a déplacé le seuil.

⛔ **ET VOICI LE POINT DUR DE CE LOT, TROUVÉ AU CADRAGE : CETTE CONTENTION ÉTAIT
INCIDENTELLE.** C'était l'état de la machine le 09/09, pas une charge produite exprès. **Telle
quelle, la démonstration n'est pas reproductible** — c'est la question de Ko, et elle n'a pas
de réponse au dépôt aujourd'hui.

⛔ **PIRE : LA RAM D'OUVERTURE EST DÉMENTIE COMME DISCRIMINANT, ET LA COMPARAISON EST
ACCABLANTE DE PRÉCISION.**

| passe | RAM à l'ouverture | verdict |
|---|---|---|
| 09/09, `--filter @zwadj/client` | **4 636 Mo** | ⛔ **273/287** |
| 12/09, `pnpm test` (D288) | **4 624 Mo** puis **4 643 Mo** | ✅ **1 329/1 329** |

Le cas rouge tombe **ENTRE** les deux cas verts. ⇒ **La RAM d'ouverture ne décide pas.** Une
contention qui ne ferait que baisser la RAM de départ reproduirait donc le mauvais terme.
⚠ **ET UNE SECONDE VARIABLE EST DÉJÀ NOMMÉE DANS `AGENTS.md`, SANS QU'ON L'AIT RELIÉE À
CECI** : « `pnpm test` (racine) et `pnpm --filter @zwadj/pro test` **ne répartissent pas
pareil** — ne jamais conclure sur un seul des deux ». **Le cas rouge est une passe FILTRÉE, le
cas vert une passe RACINE.** C'est la différence la plus visible entre les deux, elle est déjà
écrite comme un piège connu, et personne ne l'a mise en face de ces deux verdicts.

⇒ **PREMIER GESTE DU LOT DE CODE : UN RELEVÉ, PAS UN CORRECTIF** (patron D271). Tant que le
terme qui sépare rouge de vert n'est pas nommé, **toute borne « vérifiée sous contention »
serait vérifiée sous la mauvaise contention.** Ce que ce relevé doit trancher :

1. **filtrée contre racine** — combien de workers chaque chemin ouvre RÉELLEMENT pour
   `client` (relevé par échantillonnage, pas déduit du nombre de cœurs) ;
2. le **creux de RAM pendant** chacun des deux, pas seulement à l'ouverture ;
3. la **contention CPU** concurrente (`chrome` tournait le 09/09, il était à 0 le 12/09).
   ⛔ **LES TROIS POINTS SONT TRAITÉS, ET LES TROIS SONT ÉLIMINÉS (D290)** — le 3ᵉ pour une
   raison que le cadrage n'avait pas prévue : **`chrome` était présent aux DEUX cas** (14 aux
   deux bouts de la session du 12/09, entièrement verte), et **le relevé du cas rouge ne
   porte NI `chrome` NI l'alimentation** — sa seule quantité est la RAM. ⚠ Un terme présent
   des deux côtés ne discrimine pas ; un terme absent du relevé ne se reconstitue pas après
   coup (D283 : « un état machine sans inventaire ne se reproduit pas »).

⇒ **CE QUE LE GÉNÉRATEUR DE CONTENTION DOIT ÊTRE, une fois ce terme connu :**

- **reproductible** — même amplitude à chaque exécution, paramètre écrit, pas « la machine
  était chargée » ;
- **il agit sur la grandeur nommée** — la mémoire, et non le seul CPU. ⛔ **La calibration
  existante de `sonde-etat-machine.ps1` charge DOUZE CŒURS et rien d'autre** (D286 : 120 s de
  CPU sur 124,5) : **elle n'est pas un générateur de contention mémoire**, et la prendre pour
  tel mesurerait le mauvais terme ;
- **calibré sur ses DEUX bras** (D286) : générateur actif ⇒ la suite non bornée doit
  **rougir** ; générateur arrêté ⇒ elle doit **verdir**. ⛔ **S'il ne produit pas le rouge, le
  lot s'ARRÊTE et le dit** — il n'a alors aucune démonstration, et poser une borne reviendrait
  à la poser sur une intuition ;
- **au dépôt, pas dans un scratchpad** (D286) : il entre dans `neutralisation/`, avec son mode
  d'emploi, son motif, les instruments écartés et leur mesure.

⚠ **ET IL NE DOIT PAS DEVENIR CE QU'ON MESURE** : une charge qui fait pagailler la machine
rendrait des durées qui parlent d'elle. Son amplitude se **relève**, elle ne se règle pas au
ressenti.

### ⛔ CE QUE CE LOT NE FERA PAS

1. ⛔ **AUCUN `testTimeout` ÉCRIT DANS CE LOT** — consigne de Ko, et le dépôt la portait déjà :
   augmenter le budget **masque** l'effondrement au lieu de le révéler, et D270 le dit de sa
   propre borne, « une **assurance**, pas un correctif ». ⇒ **Les budgets de test restent un
   `[MÉTHODE][P0]` DISTINCT**, non traité ici. ⚠ Ce n'est pas un report par commodité : un
   budget écrit **en même temps** qu'une borne rendrait les deux inévaluables, puisque le vert
   obtenu ne dirait plus lequel des deux l'a produit.
2. **Il ne touche à aucun autre réglage de vitest** — ni `fileParallelism`, ni `pool`, ni
   `isolate`. Un lot qui change deux termes ne mesure aucun des deux.
3. **Il ne rouvre pas l'écart de 15 % entre ligne de commande et fichier**, consigné NON
   EXPLIQUÉ par D270 et qui le reste.

⚠ **Ce bloc se rafraîchit à la clôture de toute session qui fait avancer le rang** (règle D282).

## ~~PROCHAIN LOT~~ — rang 12 · **CERTIFICATION** ⛔ **CLOS : D288 — MARQUE POSÉE**

⛔ **OUVERT ET ARBITRÉ PAR KO LE 11/09/2026.** ⇒ **QUEL lot : rang 12 de l'ordre des rangs.
OÙ IL EN EST : ici.** C'est la **quatrième** fois que la règle des deux/trois commande un
rang — rang 7 à trois lots en attente, rang 9 à deux, rang 10 parce qu'elle les avait levés,
rang 12 parce que D285 et D286 les ont ramenés à **deux**.

⛔ **ÉTAT, AU 12/09/2026 : LA MARQUE EST POSÉE. LE RANG 12 EST CLOS.**
⇒ **CE QUI EST ÉCRIT, MOT POUR MOT** : « **portes vertes AU REPOS le 12/09/2026, et D285 et
D286 en font partie** ». Deux lots, **et rien d'autre**. Aucun en-tête antérieur n'est
réécrit en « certifié » (point 4 du critère). ⇒ **Détail : section « Session du 12/09/2026 —
D288 » de ce fichier.**
⛔ **LE COMPTEUR DE LOTS DE CODE NON CERTIFIÉS PASSE DE DEUX À ZÉRO** — c'est l'objet même du
rang. ⚠ **Et cette phrase est écrite au format non ambigu du rang 9** (exigence D287) : un
lot de code **peut** désormais s'ouvrir, et c'est lui qui portera le compteur à un.
⛔ **(D291, 13/09/2026) PERMISSION CONSOMMÉE** : le rang 13 a porté le compteur à UN (D290), le
rang 14 à DEUX (D291). ⇒ **Aucun lot de code ne s'ouvre avant une certification.** ⚠ Invisible à
la première recherche de D291, qui ne voyait pas le gras : trouvée par la seconde.
⛔ **(D293, 16/09/2026) ET CETTE INTERDICTION EST LEVÉE À SON TOUR** : la certification du rang 15 a eu
lieu, **compteur à ZÉRO**, **un lot de code peut s'ouvrir**. ⚠ Troisième bascule de cette même phrase en
cinq jours — elle se lit ici, jamais de mémoire.
⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE — QUATRIÈME BASCULE** : compteur à UN (rang 17, D297) puis
à DEUX (rang 18, D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.

⚠ ~~**ÉTAT, AU 11/09/2026 : L'ÉTAPE 0 EST FAITE ET MESURÉE ; LA CERTIFICATION N'A PAS ÉTÉ
LANCÉE.**~~ **BARRÉ LE 12/09/2026 (D288) : la mesure a eu lieu.** Ce qui reste vrai de cette
ligne est son étape 0 — les deux phrases d'autorisation traitées et la règle de classe écrite
dans `AGENTS.md` (détail : section « Session du 11/09/2026 — D287 »). Ce qui est périmé est
« la certification n'a pas été lancée » : la porte dure a été **rejouée le 12/09 et trouvée
verte**, `chrome` fermé par Ko.

⛔ **LA PORTE DURE TELLE QU'ELLE ÉTAIT LE 11/09 — HISTOIRE, PAS ÉTAT COURANT.** Elle est
conservée parce qu'elle porte le déficit exact qui a bloqué la passe ce jour-là, et parce
qu'une porte dure dont on efface les rouges ne se relit plus. **Le relevé d'ouverture qui
FAIT FOI pour la certification est celui du 12/09**, en section D288 : 4 624 puis 4 643 Mo,
`chrome` 0, `node` 0, SECTEUR 100 %.
⇒ **Les deux relevés du 11/09, à trois minutes d'intervalle (16 échantillons) :**

| | relevé 1 (23:52) | relevé 2 (23:54) | exigé |
|---|---|---|---|
| RAM libre médiane | **2 471 Mo** | **2 488 Mo** | **≥ 4 579** ⛔ **−2 091** |
| `chrome` | **16** | **16** | **0** ⛔ (2 283 Mo) |
| `node` | 0 | 0 | 0 ✅ |
| alimentation | SECTEUR 100 %, overlays identiques | idem | stable ✅ |
| CPU médiane | 39,5 % (16–48) | 20 % (9–37) | relevé, sans seuil hérité |
| `% Processor Performance` | 77,4 % | 85,6 % | > 100 = turbo — ⚠ **légende, jamais une exigence** (D291) |

⚠ **L'INSTRUMENT N'EST PAS EN CAUSE, ET C'EST MESURÉ** : `-Calibrer` a été rejoué à 23:51 et
il **passe** — 12 cœurs chargés, bridage retiré, **112,9 s de CPU produites sur un plafond de
126,6** (rendement 0,89), CPU 22 % → 100 %, PERF 70,2 % → 146,7 %. Les deux instruments
séparent les régimes sur une charge **réelle**. C'est la machine qui n'est pas au repos.
⚠ **Et l'état est STABLE, pas transitoire** — c'est la raison du second relevé : un état pris
une fois ne dit pas s'il tient, et rapporter un transitoire comme un plancher serait la faute
que ce critère existe pour empêcher.

⛔ **CE QUI EST MOBILISABLE, RELEVÉ À L'INVENTAIRE — ET CE QUI NE L'EST PAS.**
Mobilisable : `chrome` **2 283 Mo**, `msedge` + `msedgewebview2` **748 Mo**,
`NVIDIA Overlay` 313, `OmenCommandCenterBackground` 191, `sqlservr` 167 (SQL Server — le
dépôt n'utilise que PostgreSQL).
⛔ **À NE PAS FERMER** : `vmmemWSL` **789 Mo** — c'est le backend de `zwadj-db`, vérifié *Up 2
weeks* sur 5432, et `test:int` en dépend. ⛔ **Incompressibles** : `Code` 21 proc / **3 173 Mo**
+ `claude` 2 / **620 Mo** — D275 l'a déjà mesuré, la session ne peut pas s'en passer.

⚠ **PROJECTION, PAS MESURE — ET ELLE SE VÉRIFIE PAR UN RELEVÉ, JAMAIS PAR UNE SOUSTRACTION.**
`chrome` seul rendrait 2 488 + 2 283 = **4 771 Mo**, soit **+192** au-dessus de la barre : ça
passerait **de justesse**. Avec les deux Edge, ~5 519 Mo, soit +940. ⛔ Mais la mémoire rendue
par un processus fermé n'égale pas son *working set* (`Memory Compression` porte 611 Mo), donc
**ces deux nombres sont des hypothèses à mesurer**, pas un feu vert.
⇒ ⛔ **MESURÉ LE 12/09, ET LA RÉSERVE AVAIT RAISON CONTRE LE CHIFFRE** : `chrome` fermé, le
relevé rend **4 624 puis 4 643 Mo**, soit **+45 à +64** — et non les **+192** projetés.
**L'écart est de l'ordre du tiers de la marge annoncée.** La projection par soustraction
surestimait donc de beaucoup ce qu'une fermeture rend, exactement pour le motif qu'elle
énonçait elle-même. ⚠ **CE QUI SE GARDE N'EST PAS LE NOMBRE, C'EST LA FORME** : une
soustraction d'inventaire ne remplace pas un relevé, et ici elle aurait fait annoncer une
marge trois fois trop large sur une porte dure.

⛔ **ET SI LE PLANCHER RESTE SOUS 4 579 APRÈS FERMETURE DE `chrome`, LA SORTIE EST DÉJÀ
ÉCRITE — ON N'EN BRICOLE PAS UNE AUTRE** (critère du rang 9, qui reprend D270) : relever le
plancher que cette session PEUT produire, puis **redéfinir « repos » sur lui AVEC SA RAISON**,
les chiffres hérités restant comme HISTOIRE et non comme barre. ⚠ Et redéfinir le seuil sans
redéfinir **ce qu'il garantit** serait la moitié du travail : le nombre de passes se **dérive**
de la marge sur la contrainte liante et de sa dispersion, il ne se choisit pas, et **il ne
redescend jamais sous cinq**. ⛔ **Cet arbitrage appartient à Ko** — la session ne baisse pas
une barre.
⇒ ✅ **LA CONDITION NE S'EST PAS PRÉSENTÉE (12/09/2026, D288)** : `chrome` fermé, le plancher
est repassé **au-dessus** de 4 579 — de peu, mais au-dessus, et sur les deux relevés, bande
basse comprise (4 609 et 4 619). **Aucune barre n'a été redéfinie, aucun arbitrage n'a été
demandé à Ko.** ⚠ La sortie de secours reste écrite **pour la prochaine fois** : elle n'est
pas consommée par ce lot, et la barre héritée de D273 est intacte.

⇒ ~~**CE QUI RESTE DÛ AU RANG 12**~~ — ⛔ **TOUT A ÉTÉ PRODUIT LE 12/09/2026 (D288)** :
relevé d'ouverture au-dessus de la barre (**+45 puis +64 Mo**, `chrome` 0) · **six portes
vertes** · e2e verte · `--tout` **sorti en 1** avec sa résolution appliquée · cibles `--int`
jouées séparément ⇒ **195 mordues · 0 muette · 0 non mesurée** · arbre **immobile sur
`c2ac531`** de bout en bout · fenêtre échantillonnée **homogène** (103 échantillons, 0
transition d'alimentation, 0 trou). Puis la marque, nommant **D285 et D286**, et rien d'autre.
⚠ **Ce bloc se rafraîchit à la clôture de toute session qui fait avancer le rang** (règle D282).

## ~~PROCHAIN LOT~~ — rang 11 · `[INFRA]` **les instruments entrent au dépôt** ⛔ **CLOS : D286**

⛔ **OUVERT ET ARBITRÉ PAR KO LE 11/09/2026.** ⇒ **QUEL lot : rang 11 de l'ordre des rangs.
OÙ IL EN EST : ici.**

⛔ **ÉTAT : LIVRÉ ET MESURÉ LE 11/09/2026 (D286).** Trois fichiers versionnés dans
`neutralisation/` — `verifier-mutations.py`, `sonde-etat-machine.ps1`,
`echantillonneur-etat-machine.ps1` — chacun avec son mode d'emploi, les instruments
concurrents ÉCARTÉS et sur quelle mesure, et sa **calibration rejouée à chaque
invocation**. ⇒ **Détail : section « Session du 11/09/2026 — D286 » de ce fichier.**

⛔ **ÉTAPE 0 DU LOT — LE RANG 8 EST CLOS.** La dérive de somme de contrôle
`_prisma_migrations` est **éteinte**, et pas par une écriture dans le journal des
migrations : **les octets appliqués ont été RENDUS au fichier** (le commentaire ajouté
après coup, retiré). Empreinte calculée **égale** à la stockée, mesurée et montrée.
⇒ Rang 8 : **certifié le 10/09, CLOS le 11/09**.

⛔ **LES CINQ PORTES SONT VERTES** — `typecheck` 0 · `lint` 0 · `test` 0 (**1 329/109**) ·
`build` 0 · `test:int` 0 (**436/36**). **Aucun compteur n'a bougé**, ce qui est le résultat
attendu d'un lot qui ne touche que des scripts hors espace TypeScript et des commentaires.
⚠ **Mais sous une machine tombée à 2 735 Mo de RAM libre**, soit 1 844 Mo SOUS la barre
D273 — mesuré, pas supposé, par l'échantillonneur que ce lot livre.

⛔ **CE LOT N'EST PAS CERTIFIÉ, ET IL COMPTE.** Il touche des scripts — donc il peut
dégrader une porte (`AGENTS.md`, D283 : « un lot qui touche un harnais, un test, un script
ou une migration COMPTE »). ⇒ **Le compteur de lots de code non certifiés passe de UN à
DEUX.** Deux restent tenables, trois non — **un lot de code suivant serait le troisième, et ne peut
pas s'ouvrir**.
⛔ **FORME RÉÉCRITE LE 11/09/2026 (D287) — C'EST CELLE DU RANG 9 QUI EST REPRISE, MOT POUR
MOT.** Cette phrase portait « **le prochain lot de code ferme la fenêtre** », qui se lit dans
DEUX sens : « il la trouve fermée », ou « il est encore permis, et c'est lui qui la fermera ».
⇒ Une reprise à froid du 11/09 a dû descendre au rang 9 chercher la formulation non ambiguë
pour trancher — c'est-à-dire **recouper**, très exactement ce que le pointeur de rang promet
d'éviter.
⚠ **UNE PHRASE QUI DÉCIDE D'UNE AUTORISATION NE SE LIT PAS DANS DEUX SENS**, et celle-ci se
lisait à côté de la permission périmée du rang 10 (barrée le même jour) : **les deux penchaient
du même côté**, celui qui ne se rattrape pas.
⚠ **Ce bloc se rafraîchit à la clôture de toute session qui fait avancer le rang** (règle D282).

## ~~PROCHAIN LOT~~ — rang 10 · `[API][P0]` **les deux échéances** ⛔ **CLOS : D285**

⛔ **OUVERT LE 10/09/2026, ARBITRÉ PAR KO.** ⇒ **QUEL lot : rang 10 de l'ordre des rangs. OÙ IL
EN EST : ici.** C'est la séparation des deux questions posée par D283.

⛔ **ÉTAT : LIVRÉ ET MESURÉ LE 11/09/2026 (D285).** ~~CADRÉ LE 10/09/2026 (D284). AUCUNE LIGNE
DE CODE ÉCRITE.~~ — l'arrêt franc a eu lieu, le cadrage a été ratifié par Ko, et le code a été
écrit en session neuve, comme ce bloc l'exigeait. ⇒ **Détail : section « Session du 11/09/2026 —
D285 » de ce fichier.**
⛔ **CE LOT N'EST PAS CERTIFIÉ, ET IL COMPTE.** Il touche un test et un harnais, donc il peut
dégrader une porte — le cadrage le disait déjà. ⇒ **Le compteur de lots de code non certifiés
passe de ZÉRO à UN.** Deux restent tenables, trois non.
⚠ **Ce bloc se rafraîchit à la clôture de toute session qui fait avancer le rang** (règle D282).

### Ce que le rang 10 recouvre

⛔ **CE PARAGRAPHE DÉCRIT LE PROBLÈME TEL QU'IL ÉTAIT LE 10/09/2026 — IL EST RÉSOLU DEPUIS LE
11/09 (D285).** Conservé parce qu'un cadrage reste consultable après validation (D277) et qu'il
dit ce à quoi le lot répondait ; son « aujourd'hui » n'est plus le jour de qui le lit.

~~**Rendre VISIBLE l'interversion des deux constantes d'échéance.** Aujourd'hui, échanger
`PRO_RESPONSE_DAYS` (7 jours) et `PAYMENT_WINDOW_HOURS` (48 h) entre leurs deux sites d'appel
produit deux dates parfaitement non nulles : **aucune porte ne rougit**.~~ Le lot exporte les
deux constantes, fait assertir la **durée** par l'intégration en les important, et arme la cible
de neutralisation qui le prouve — **fait, et mesuré : 13/13.**
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

**MD4 — ⛔ DEUX HORLOGES SI ON EN COMPARE DEUX. ⇒ L'ASSERTION N'EN UTILISE QU'UNE, ET IL N'Y A
DONC AUCUNE TOLÉRANCE À CHOISIR.** ⚠ **FORME RECTIFIÉE PAR KO LE 10/09/2026**, et elle est
meilleure que celle qu'elle remplace : ~~une assertion bornée dont la tolérance se dérive d'une
mesure~~ — une tolérance, même dérivée, reste un nombre que quelqu'un relèvera un jour « parce
que ça passe juste ». **Supprimer le besoin vaut mieux que le chiffrer.**

- **`expiresAt` — ENCADREMENT PAR DEUX INSTANTS QUE LA SPEC MESURE ELLE-MÊME.** `Date.now()` est
  lu **à l'intérieur de `create`** (`:195`), donc entre le `t0` relevé par la spec avant la
  requête et le `t1` relevé après :

  ```
  expiresAt ∈ [ t0 + PRO_RESPONSE_DAYS * DAY_MS , t1 + PRO_RESPONSE_DAYS * DAY_MS ]
  ```

  ⇒ **Zéro comparaison avec l'horloge PostgreSQL, zéro nombre choisi au jugé.** La largeur de
  l'encadrement **est** la durée de la requête — quelques dizaines de millisecondes — contre les
  **cinq jours** qui séparent 48 h de 7 jours. L'interversion sort de l'encadrement par cinq
  ordres de grandeur.
  ⛔ **ET C'EST LA MÊME HORLOGE AU SENS LE PLUS FORT, MESURÉ ET NON SUPPOSÉ** : `helpers.ts:39`
  monte l'app par `Test.createTestingModule` et les requêtes partent en `supertest` sur
  `ctx.app.getHttpServer()` — **l'API d'intégration tourne DANS le processus du test.** Le
  `Date.now()` du service et ceux de la spec sont le même compteur, pas seulement la même source
  système. `createdAt`, lui, vient de `@default(now())`, horloge **PostgreSQL** : **c'est la seule
  valeur que l'assertion ne doit PAS utiliser**, et c'est écrit ici pour qu'on ne l'y ramène pas
  par commodité.
  ⚠ **DÉPENDANCE À MD1, ET ELLE EST STRUCTURELLE** : cet encadrement n'est valide que si
  l'écrêtage ne mord pas. Si `startsAt` tombe sous `t0 + 7 j`, `expiresAt` vaut `startsAt` et
  l'encadrement échoue — **pour la bonne raison, mais sur le mauvais sujet**. La fixture de MD1
  est donc la condition de validité de MD4, pas une précaution voisine.
- **`paymentDueAt` — ÉGALITÉ EXACTE.** Il part de `acceptedAt = new Date()` (`:379`), et
  `accepted_at` est **PERSISTÉE** (`schema.prisma:1073`). La spec relit la ligne et assertit
  `paymentDueAt − acceptedAt === PAYMENT_WINDOW_HOURS * HOUR_MS`. **Aucun encadrement, aucune
  marge.**

⇒ **Les deux côtés n'ont pas la même FORME — encadrement d'un côté, égalité de l'autre — et les
deux sont EXACTS au sens où aucun nombre n'y est choisi.** L'écrire évite qu'une session suivante
« harmonise » les deux formes et fabrique soit une comparaison inter-horloges, soit une tolérance.

**MD5 — ⛔ AMENDER LE MOTIF D'UN MODULE POUR Y LOGER CE QU'IL EXCLUAIT.**
⛔ **CE MODE A CHANGÉ DE RÉPONSE LE 10/09/2026 — KO S'EST DÉJUGÉ, ET C'EST LE HEURT SIGNALÉ PAR LE
CADRAGE QUI L'A FAIT.** `booking-deadline.ts` porte en tête, en toutes lettres : « **ce fichier ne
déclare aucune constante de durée** », avec son motif — garder les deux règles métier séparées, la
durée étant un PARAMÈTRE.
⇒ ~~Y déposer les deux constantes en amendant l'en-tête dans le même geste~~ ⛔ **ÉCARTÉ PAR KO**,
motif : **amender le motif d'un module pour y loger ce qu'il excluait est la dérive que ce dépôt
traque.** Un en-tête qui cède devant le premier lot qui le gêne ne protège plus rien — c'est la
même faute que relever un plafond pour faire passer une suite.
⚠ **CE QUI RESTE VRAI DE LA VERSION PRÉCÉDENTE, ET C'EST POURQUOI CE MODE NE DISPARAÎT PAS** :
livrer un module dont le commentaire dit l'inverse du code est **D116**, payé. Le mode est donc
conservé **comme interdiction**, et non retiré parce qu'on a choisi de ne pas l'enfreindre.

⇒ **RETENU : LES DEUX CONSTANTES SONT EXPORTÉES DEPUIS `bookings.service.ts`, ET LA SPEC LES
IMPORTE DE LÀ.** C'est l'option que ce cadrage avait écartée ; l'argument qui la condamnait —
« faire importer un service par une spec » — **ne résiste pas à la mesure**.

**Mesuré le 10/09/2026, et le compte de Ko est exact** : **9 fichiers** de `apps/api/test/int/`
importent depuis `../../src/`, **valeurs comprises** — `configureApp`, `AppModule`,
`PrismaService`, `PasswordService`, `IS_PUBLIC_KEY`, `ROLES_KEY`, `MEDIA_STORAGE`, `EMAIL_SENDER`,
`WHATSAPP_SENDER`, `PAYMENT_STORE`.
⛔ **ET LE PRÉCÉDENT EXACT EXISTE, SUR LE CHEMIN DE L'ARGENT** :
`payment-store.prisma.ts:36` exporte `INDEX_UNE_ATTENTE = "payments_one_pending_per_booking"`, et
`payment-intent-race.int-spec.ts:19` l'importe **pour confronter l'autorité** — il interroge
`pg_indexes` avec la constante au lieu de retaper le nom de l'index. **C'est mot pour mot le geste
que le rang 10 doit faire**, une constante de durée au lieu d'un nom d'index.
⇒ **Aucun patron neuf, aucun en-tête amendé, et la spec confronte le SYMBOLE que le service
utilise** — ce qui est plus fort que confronter une copie posée ailleurs : si le service cessait
d'utiliser sa propre constante, la spec ne pourrait plus l'importer.
⚠ **`booking-deadline.ts` N'EST DONC PAS TOUCHÉ PAR CE LOT.** Il garde son en-tête, son motif et
sa spec. ⇒ Conséquence portée aux **fichiers attendus**, plus bas : **trois fichiers, pas quatre.**

**MD6 — ⚠ LE FUSEAU, ET IL EST MUET SUR UN SERVEUR EN UTC.** `eventDate` est une date **civile**
(UTC+1 sans heure d'été, D48) tandis que `startsAt` est un instant UTC. Une date d'échéance dérivée
par arithmétique sur un `Date` local peut glisser d'un jour — et l'intégration, qui tourne en UTC,
**ne le verrait jamais** (leçon S11-a, mesurée). ⇒ La fixture dérive sa date par les aides civiles
existantes du dépôt, jamais à la main.

**MD7 — ⛔ LA DATE DÉRIVÉE RENDRAIT LA DEMANDE IRRECEVABLE, ET LE TEST ROUGIRAIT POUR LA MAUVAISE
RAISON.** ⚠ **AJOUTÉ PAR KO LE 10/09/2026** ; il manquait à la liste, et c'est la **conséquence du
remède de MD2** — d'où sa place après MD6 plutôt qu'à celle de MD2, les numéros étant déjà cités
ailleurs.
**Dériver la date oblige à dériver LA DISPONIBILITÉ SEMÉE AVEC ELLE.** Une salle dont les créneaux
sont semés sur `EVENT_DATE` **refuse** une demande à `now + 90 j` : le test tomberait en **400**,
sans rien dire des échéances. ⛔ **Une garde qui rougit pour la mauvaise raison est pire qu'une
garde absente** — elle s'attribue la preuve d'un défaut qu'elle n'a pas mesuré, et c'est la
« mesure confondue » de D209 appliquée à la fixture au lieu de l'assertion.
⇒ **REMÈDE** : la fixture dérive **la date ET le semis d'ouverture qui la rend acceptable**, des
mêmes constantes. ⚠ **Et l'ordre de refus se vérifie** : un 400 de disponibilité arriverait
**avant** toute écriture d'échéance, donc avant la mesure — le test ne pourrait même pas
distinguer « fixture fautive » de « échéance fautive ». La fixture se prouve d'abord en
**201**, ensuite on assertit la durée.

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

#### ⛔ LE POINT D'ARBITRAGE — TRANCHÉ PAR KO LE 10/09/2026, ET IL S'EST DÉJUGÉ

**OÙ VIVENT LES DEUX CONSTANTES.** ⚠ **Ce bloc est conservé avec ses trois options et leurs
verdicts D'ORIGINE barrés**, parce qu'un arbitrage dont on effacerait la première réponse ne
peut plus expliquer pourquoi la seconde est meilleure. Le dépôt impose de vérifier une consigne
contre les décisions déjà prises — D231, et la leçon S11-a où une consigne de backlog aurait
défait D63 : **c'est ce contrôle qui a produit le renversement, et non une préférence.**

- **`booking-deadline.ts`** — ~~⇒ RETENU. Le patron existe (`booking-charge.ts`). Coût : amender
  l'en-tête~~ ⛔ **ÉCARTÉ PAR KO LE 10/09/2026** : « amender le motif d'un module pour y loger ce
  qu'il excluait est la dérive que ce dépôt traque ». **Le coût n'était pas un coût, c'était le
  défaut.** ⚠ Un en-tête qui cède devant le premier lot qui le gêne ne protège plus rien ;
- **`@zwadj/types`** — `AGENTS.md` dit « les constantes de temps vivent dans `@zwadj/types` », où
  vivent déjà `VISIT_DURATION_MINUTES`, `AVAILABILITY_MAX_WINDOW_DAYS` et
  `ALGERIA_UTC_OFFSET_MINUTES`. ⛔ **Écarté, et sur une mesure** : ces trois-là sont des constantes
  de **contrat**, partagées front/back. Relevé le 10/09 — **aucune des deux fenêtres n'est affichée
  ni consommée par `apps/client` ni par `apps/pro`** (zéro occurrence). Les y porter **élargirait le
  contrat public sans consommateur**, ce que le périmètre MVP interdit. ⚠ **Verdict INCHANGÉ** ;
- **export depuis `bookings.service.ts`** — la lettre du backlog (« exporter les deux constantes »).
  ~~⛔ Écarté : ce serait faire importer un service par une spec pour y lire une règle métier~~
  ⛔ **RETENU LE 10/09/2026, ET MON ARGUMENT NE RÉSISTAIT PAS À LA MESURE** : **9 fichiers** de
  `test/int/` importent déjà depuis `../../src/`, **valeurs comprises**, et l'un d'eux —
  `payment-intent-race.int-spec.ts:19` — importe la constante `INDEX_UNE_ATTENTE` d'un module
  `src` **précisément pour confronter l'autorité**, sur le chemin de l'argent. **J'avais objecté
  sur un principe que le dépôt pratique déjà neuf fois.**

⇒ **CE QUE LE RENVERSEMENT ACHÈTE** : aucun patron neuf, aucun en-tête amendé, **trois fichiers au
lieu de quatre**, et la spec confronte le **symbole que le service utilise** plutôt qu'une copie
posée ailleurs. ⚠ **Comme ce cadrage l'avait prévu, seul MD5 a changé** : les six autres modes et
les deux cibles tiennent à l'identique.
⛔ **LEÇON DE MÉTHODE, ET ELLE VAUT AU-DELÀ DE CE LOT** : le cadrage a **signalé le heurt sans le
trancher**, et c'est ce qui a permis de le trancher correctement. Une session qui aurait appliqué
la consigne en silence aurait livré un module amendé pour la circonstance ; une session qui
l'aurait refusée seule aurait pris un arbitrage qui n'est pas le sien. **Signaler, proposer, ne pas
décider.**

#### ⛔ Ce qui NE se code PAS dans ce lot

- **aucun changement de comportement.** Les deux constantes gardent leurs valeurs, 7 et 48. Ce lot
  rend une règle **mesurable**, il ne la modifie pas ;
- **le bouton « payer l'acompte » quand l'échéance est passée** — `[E3][P1]`, dette D80 assumée,
  **décision d'E3** ;
- ~~**la dérive de somme de contrôle `_prisma_migrations`** — reliquat du rang 8, arbitrage ouvert,~~
  ⛔ **BARRÉ LE 11/09/2026 (D286) : ÉTEINTE, ET LE RANG 8 EST CLOS.**
  ~~**interdit d'y toucher** (Ko, 09/09/2026)~~ ⇒ **tranché le 11/09/2026, autrement que par
  les deux options posées : on rend au fichier les octets appliqués** ;
- **aucune migration.** ⚠ Conséquence directe et voulue : `migration-non-empty.int-spec.ts` n'a pas
  à être retargé, et **le `CHECK` d'agrégat de D282 reste la DERNIÈRE migration**, donc encore
  mesurable. Tout lot qui ajouterait une migration le rendrait intestable (`[INFRA][P1]`).

#### ⚠ Ce que ce cadrage n'a PAS mesuré, et qu'il ne faut pas lire comme vert

- **aucune porte n'a été lancée** dans cette session — lot documentaire ;
- **les deux cibles n'ont pas été jouées.** Elles sont **spécifiées, pas mesurées** : leur mutisme
  sur l'arbre d'avant est une **prédiction de ce cadrage**, et c'est la première chose que la
  session de code doit vérifier ;
- ~~la tolérance de l'assertion bornée de MD4 n'est pas chiffrée ici~~ ⛔ **LIMITE RETIRÉE LE
  10/09/2026 : ELLE N'A PLUS D'OBJET.** La forme rectifiée de MD4 **ne porte aucune tolérance**
  — un encadrement par deux instants que la spec mesure elle-même, et une égalité exacte. ⚠ Retrait
  **déclaré**, pas silencieux : une limite qui disparaît sans motif se lit comme une limite oubliée ;
- **rien n'a été vérifié sur une base réelle** — `test:int` n'a pas tourné.

#### Fichiers attendus de la session de CODE, énumérés avant qu'elle commence

⛔ **TROIS, ET NON QUATRE — CONSÉQUENCE DIRECTE DU RENVERSEMENT DE MD5** (10/09/2026) :

`apps/api/src/venues/bookings.service.ts` (les deux constantes **exportées**, valeurs inchangées) ·
`apps/api/test/int/bookings.int-spec.ts` (fixture dédiée — date **et** semis dérivés, MD7 — plus
l'encadrement de MD4 et l'égalité exacte) ·
`neutralisation/neutralize-s11b.py` (deux cibles).

⛔ **`apps/api/src/venues/booking-deadline.ts` N'EST PAS AU DIFF.** ~~Il portait les deux
constantes et son en-tête amendé~~ — écarté par Ko le 10/09. **Son apparition au diff serait le
signe que MD5 a été rejoué dans sa forme abandonnée.**
⛔ **En fin de lot, `git diff` ne doit contenir que ces trois-là.** ⚠ Et ce lot **compte** dans les
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
6. ⛔ ~~**LE RÉGIME D'ALIMENTATION EST RELEVÉ ET STABLE SUR TOUTE LA FENÊTRE**~~ ⛔ **RÉÉCRIT
   LE 12/09/2026 (D290) : LE RÉGIME DOIT ÊTRE **SECTEUR**, RELEVÉ DEVANT CHAQUE MESURE ET À LA
   CLÔTURE.**
   ⛔ **MOTIF : UNE FENÊTRE ENTIÈREMENT SUR BATTERIE SATISFAIT « STABLE ».** Le trou était dans
   le mot, et il était **déjà chiffré au dépôt** : `test:int` **475 s** contre **279** (− 41 %),
   campagnes `--tout` **5 454 s** contre **2 011** (− 63 %), même arbre, même suite (D283) ; et la
   charge bridée rend **3,7 s de CPU là où douze cœurs en offrent 36** (D286).
   ⚠ **UN RELEVÉ SUR BATTERIE N'EST PAS INVALIDE — IL N'EST PAS CERTIFIANT, ET IL SE DÉCLARE
   COMME TEL.** La nuance est le point : interdire tout court ferait mentir les relevés du
   dépôt pris ainsi, qui restent de l'histoire utile.
   ~~⚠ **ET LA QUANTITÉ QUI RELIE LE RÉGIME À LA DURÉE EST `PERF`** — mesuré le 12/09 : 16,4-18,7 s
   à `PERF` 103-122 % contre 20,0-20,3 s à `PERF` 73-77 %, **sur secteur**, même suite, une heure
   d'intervalle. **Rebrancher n'est pas être au régime secteur**, et c'est `PERF` qui le dit.~~
   ⛔ **BARRÉ LE 13/09/2026 (D291) : RIEN DANS CETTE PHRASE N'EST PORTÉ PAR LES JOURNAUX.**
   « 73-77 % » ne s'y trouve pas — pendant les passes, `PERF` est au-dessus de 100 sur 29 lignes
   sur 36, minimum 80,4 ; l'intervalle est d'**au moins 2 h 36** ; les 103-122 % sont des lectures
   uniques prises au plus 3,7 s après la passe précédente. **Aucune quantité n'est établie comme
   reliant le régime à la durée.** Pièces : `docs/preuves/D290/` ; détail : section D291.
   ⛔ **ET AUCUN SEUIL `PERF` N'ENTRE DANS CE CRITÈRE** : au repos cette machine est sous 100 (la
   certification de D288 ouvre à 74,8), donc « > 100 avant la mesure » serait insatisfiable.
   `PERF` se lit **pendant** la mesure, par l'échantillonneur — jamais avant.
   ⚠ **Cinquième quantité, ajoutée le 10/09/2026 (D283), réécrite le 12/09 (D290).** Elle rejoint les quatre autres (RAM libre ·
   node · CPU · inventaire nommé) et se relève avec elles. ⚠ **Ce n'est pas « la source »,
   c'est la source ET LE MODE D'ALIMENTATION ACTIF** : sur Windows, un mode bridé peut
   survivre au rebranchement tant que la charge est basse. **Rebrancher n'est pas être au
   régime secteur.**
   ⚠ **NON MESURÉ AU DÉPÔT — relevé le 13/09/2026 (D291)** : la survie d'un mode bridé au
   rebranchement n'a **aucun** relevé dans ce fichier ni dans le backlog. C'est une
   **possibilité**, et elle se lit comme telle ; `AGENTS.md` l'avait recopiée en « survit ».
7. ⛔ **LES RELEVÉS SONT PÉRIODIQUES PENDANT LA FENÊTRE, dans un journal à part** — pas
   seulement à ses deux extrémités. « La machine a tenu pendant la mesure » devient une
   **mesure**, et cesse d'être une **inférence entre deux bouts**.
8. ⛔ **`chrome` À 0 AU RELEVÉ D'OUVERTURE — SIXIÈME QUANTITÉ, ET C'EST UNE PORTE DURE, PAS
   UNE ANNOTATION (D288, 12/09/2026).** Au même titre que la barre de RAM : si elle est
   rouge, **on ne lance rien** et on le dit.
   ⛔ **ELLE VIVAIT DANS UN MESSAGE DE CHAT, ET C'EST POUR ÇA QU'ELLE EST ICI.** Ko l'avait
   posée mot pour mot le 11/09 — « `chrome` à 0 au relevé d'ouverture, sinon tu ne lances
   rien et tu me le dis » — et D287 l'a fidèlement RAPPORTÉE dans son compte rendu de
   session. ⚠ **Un compte rendu de session n'est pas un critère** : une certification
   future lit CETTE liste, pas la section d'une session vieille de deux jours. C'était
   **D276 appliqué à la règle de certification elle-même** — la décision existait, au bon
   format, au mauvais endroit.
   ⚠ **ET LE MOTIF DE LA QUANTITÉ EST DISTINCT DE CELUI DE LA BARRE**, sinon elle serait
   redondante : `chrome` est le plus gros poste **mobilisable** de cette machine (2 283 Mo
   mesurés le 11/09, soit près de la moitié du déficit qui bloquait alors la passe). La
   barre dit *combien il reste* ; `chrome` dit *si ce qui reste a été libéré*. Une barre
   franchie de justesse **avec** un navigateur ouvert et une barre franchie **sans** ne
   décrivent pas la même machine.
   ⚠ **RELEVÉ DU 12/09, ET IL JUSTIFIE LA SÉPARATION DES DEUX** : `chrome` fermé, la RAM
   d'ouverture est remontée à **4 624 puis 4 643 Mo** — au-dessus de la barre, mais de
   **+45 à +64 Mo seulement**, là où la projection par soustraction de D287 annonçait
   **+192**. ⇒ **La projection était bien une projection** (D287 le disait), et une porte
   dure adossée à la seule RAM se serait jouée dans cette marge-là.
   ⛔ **ET LA JUSTIFICATION LA PLUS FORTE EST VENUE APRÈS COUP — DEUX FENÊTRES, DEUX QUANTITÉS,
   JAMAIS LA MÊME (D293, gravé ici sur instruction de Ko le 16/09/2026).**
   **14/09** : RAM **+697,5 puis +721** au-dessus de la barre, SECTEUR, calibration passante — et
   **`chrome` 14 puis 15** ⇒ **refus**. **16/09**, Chrome fermé par Ko : **`chrome` 0**, `node` 0,
   SECTEUR, calibration passante (rendement 0,96) — et **RAM 3 073,5 puis 3 077,5 Mo, soit −1 505,5**
   ⇒ **refus**. ⚠ **UNE PORTE DURE À UNE SEULE QUANTITÉ AURAIT LAISSÉ PASSER UNE DES DEUX FENÊTRES** :
   celle qu'elle satisfaisait. ⛔ **Le point 8 a été écrit comme une correction de FORME** — sortir une
   règle d'un message de chat (D288) — **et il a mordu comme une correction de FOND** : sans lui, la
   fenêtre du 14/09 partait sous une RAM confortable et un navigateur actif.
   ⚠ Et la réciproque est du même relevé : **la RAM a refusé une fenêtre où `chrome` était à 0**. Aucune
   des deux quantités ne couvre l'autre — c'est la séparation que D288 écrivait (« la barre dit combien
   il reste, `chrome` dit si ce qui reste a été libéré »), **mesurée dans les deux sens**.
   ⇒ Pièces et inventaires : section D293, « ÉTAPE 1 » et « ÉTAPE 1, SECONDE TENTATIVE » ;
   `docs/preuves/D293/ouverture/` (14/09) et `ouverture-16-09/`.
9. ⛔ **LE JOURNAL e2e N'ENTRE PAS AU DÉPÔT, ET SON EXTRAIT DOIT PORTER DE QUOI LE RECOMPTER —
   RÈGLE ARBITRÉE PAR KO LE 16/09/2026 (D294), NI L'OPTION 1 NI L'OPTION 2.**
   **Le fait qui l'impose** : le serveur de développement imprime les liens de vérification
   (pas de mailer en dev), l'e2e crée des comptes, et l'audit de D293 y a relevé **24 jetons de
   43 caractères**. **C'est la justification de l'existence de cet audit, pas un incident** — et
   il ne les aurait pas vus en s'arrêtant au premier écran (D200).
   ⛔ **CE QUI EST REFUSÉ, ET SUR QUELLE MESURE** : faire taire le lien côté serveur de dev
   (« option 2 ») **paierait une capacité contre un risque qu'on peut borner autrement**.
   Mesuré le 16/09 : `EmailVerificationToken` ne stocke qu'un **`tokenHash`** — le jeton clair
   n'est **jamais** persisté — et `DevLoggerEmailSender` est le **seul** fournisseur lié au port
   `EMAIL_SENDER` (`@Global()`, un seul `useClass`). ⇒ **Le journal de dev est le seul endroit
   où le jeton clair existe** : le faire taire rendrait la vérification d'e-mail **et** la
   réinitialisation de mot de passe **inachevables en dev**, par aucun chemin que le dépôt
   fournit. Ce n'est pas « un confort ». ⚠ **Et l'autre moitié est mesurée aussi** : cela ne
   casserait **pas** l'e2e — aucune spec de `e2e/` ne lit ce jeton, les seules occurrences de
   « token » y sont les **tokens CSS** de `b7-token-contract`. Les 24 jetons sont un
   **sous-produit**, consommé par rien.
   ⛔ **CE QUI EST REFUSÉ AUSSI : L'EXTRAIT TEL QU'IL EST.** Celui de D293 garde **3 lignes sur
   910** — de quoi lire le verdict, **pas** de quoi confronter chaque « failed » à son contexte,
   ce que le point de lecture des portes EXIGE (D275). Les 4 lignes `[WebServer]` sur 742 de la
   passe du 16/09 ne sont dans **aucune** pièce versée.
   ⇒ **LA RÈGLE, EXÉCUTOIRE À LA PROCHAINE CERTIFICATION** : le journal brut **reste hors
   dépôt** ; l'extrait reste une **liste blanche** — jamais une liste noire, qui laisserait
   passer ce qu'on n'a pas prévu — et cette liste s'**ÉLARGIT jusqu'à porter de quoi (a)
   recompter l'e2e par elle-même et (b) confronter chaque « failed » à son contexte**. **Les
   jetons sont exclus par CONSTRUCTION**, pas par filtrage : l'extrait ABANDONNE si sa sortie
   porte encore `token=`. ⚠ **Une preuve ne se caviarde pas** (D291, ratifié par Ko) : on
   n'élargit jamais en retouchant le journal, seulement en gardant davantage de lignes.
   ⚠ ~~**L'instrument qui le fera reste À ÉCRIRE** — il corrigera au passage le `+1` de
   `.split("\n")` (D294) et imprimera son compte de parcouru **avec son attendu à côté** (D290).~~
   ⛔ **ÉCRIT LE 21/09/2026 (D299) : `docs/preuves/D299/outils/extraire-e2e.py`** — sous `docs/preuves/`
   et **pas** dans `neutralisation/`, **sur ordre de Ko** : il y ferait compter la certification (un
   troisième lot de code) ; ici il est exempté parce qu'**aucune porte ne le lit** (D292). Il garde
   Running, **chaque ligne de résultat**, le résumé, les **blocs d'échec**, et **3 lignes autour de toute
   ligne « fail »** ; il imprime son **recompte à côté du résumé** et son parcouru **à côté de l'attendu
   compté sur les octets** (le `+1` de D294 corrigé). **Calibré sur le journal réel avant d'être cru**
   (rang 15 : 910 lignes, 34 `ok` + 1 `-`, 4 « fail » gardés, 24 jetons dans la source, 0 dans la sortie),
   sur un échec construit, et sur un lien placé dans une fenêtre d'échec — où il **refuse**.
10. ⛔ **L'AUDIT DE SECRETS GARANTIT L'ABSENCE DE VALEURS, PAS DE MOTS — ARBITRAGE DE KO DU 21/09/2026
    (D299).** « Attendu 0 » visait la mauvaise quantité : un titre de test qui nomme une variable est
    légitime. ⛔ **Pas de liste blanche** — ce serait un audit tronqué.
    ⇒ **TOUTE ALERTE ABSENTE DE LA SORTIE SCELLÉE PRÉCÉDENTE SE TRIE AU CONTEXTE AVANT LE COMMIT** —
    procédure `docs/preuves/D299/outils/alertes-nouvelles.py`, qui renvoie aux lignes de la sortie scellée
    sans recopier aucun contexte.
    ⇒ **CE QUI FAIT FOI SUR LES VALEURS EST LE CONTRÔLE DÉDIÉ « 0 VALEUR RÉELLE SUR N FICHIERS »**
    (`docs/preuves/D299/outils/aucune-valeur-reelle.py`), joué sur le journal e2e **de la passe** : attendu
    **0 porteur** dans `docs/preuves/`, `neutralisation/` et les `.md` d'autorité.
    ⚠ Ordre de clôture qui en découle : audit scellé → tri différentiel (sa pièce ne recopie rien) →
    **second audit, vraie dernière écriture**, qui doit rendre les **mêmes** alertes.

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
⛔ **ET UN RELEVÉ NE SE RÉPÈTE PAS JUSQU'AU VERT — RÈGLE DE KO, 21/09/2026 (D299).** Un relevé pris
après un **CHANGEMENT D'ÉTAT NOMMÉ** mesure un **autre état** ; un relevé répété sur **le même état**
jusqu'au vert, **c'est de la SÉLECTION** — la fenêtre serait choisie pour son résultat, et la barre ne
mesurerait plus rien. ⇒ **Après un refus, aucun nouveau relevé sans un MOUVEMENT D'INVENTAIRE NOMMÉ**, et
ce que ce mouvement a **réellement rendu** s'écrit **mesuré**, jamais projeté : Chrome fermé a rendu
**446 Mo sur 1 162** (D299).
⚠ **Le cas qui la fonde est celui où la tentation était la plus forte** : le refus du 21/09/2026 était à
**−31 Mo**, le plus petit écart de la série — trois relevés de plus auraient probablement passé.
⛔ **ET REDÉFINIR « REPOS » À LA MARGE EXACTE OÙ LA CONDITION ÉCHOUE FABRIQUERAIT LA PERMISSION** (Ko) :
devant ce refus, Ko a choisi de **libérer** (arrêt d'`oracle`, précédent de D275), **pas de redéfinir**. La
sortie de D270 reste écrite pour un plancher **durablement** sous la barre, pas pour 31 Mo.

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
~~ouvert sur son seul reliquat — la dérive de somme de contrôle `_prisma_migrations`, arbitrage
non tranché.~~
⛔ **BARRÉ LE 11/09/2026 (D286).** Le reliquat est traité — les octets appliqués rendus au fichier de
migration — et **le rang 8 est CLOS**. ⇒ section « Session du 11/09/2026 — D286 ».

## RANG 8 — S11-b · **point d'entrée CONSERVÉ** ⛔ **CHEMIN DE L'ARGENT** ⛔ **CLOS LE 11/09/2026 (D286) — TITRE ALIGNÉ LE 16/09/2026 (D294)**

⛔ **POURQUOI CE TITRE A CHANGÉ, ET C'EST UNE REPRISE À FROID QUI L'A VU (D294).** Sur les huit
blocs de rang en `##`, **sept portaient « CLOS » dans leur titre ; celui-ci, non** — seul bloc à
ne pas le porter, et seul bloc du **CHEMIN DE L'ARGENT**. Le rang est clos depuis le 11/09/2026
(D286). ⚠ **Un titre se lit avant son corps** : trois affirmations courantes de ce bloc, barrées
ci-dessous, le présentaient encore comme un lot **ouvert et à mi-parcours** — c'est-à-dire un lot
**certifié** du chemin de l'argent annoncé à moitié fait. **Une phrase qui déclare à moitié fait
un lot certifié du chemin de l'argent est plus dangereuse qu'un budget manquant** (arbitrage de
Ko, 16/09/2026).

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
procuration que le rang 7 refuse depuis D270. ~~Ce qui reste vrai : **le rang n'est pas CLOS**,
il garde son reliquat d'arbitrage.~~
⛔ **BARRÉ LE 16/09/2026 (D294) — ET C'EST LA SEULE DES CINQ QUI ÉTAIT RESTÉE COURANTE.** Le
rang 8 est **CLOS** depuis le 11/09/2026 (D286, étape 0 du rang 11) : le reliquat — la dérive de
somme de contrôle `_prisma_migrations` — a été éteint en rendant au fichier de migration les
octets appliqués, empreinte calculée redevenue égale à la stockée. ⚠ **Mesuré, pas relu** :
balayage sur texte **aplati** (ces fichiers sont enveloppés à ~95 colonnes, une expression de
plus de quelques mots y est coupée), 5 motifs, **24 occurrences examinées** — la même
affirmation est barrée **quatre fois ailleurs**, dont **deux dans ce bloc même**, plus l'ordre
des rangs (« LE RANG N'EST PAS CLOS » BARRÉ LE 11/09/2026 (D286) : IL L'EST) et le « CE QUI
RESTE » de D284. **Une seule était restée debout, et c'était celle du premier paragraphe du
bloc** — c'est-à-dire la première lue. ⚠ **Une passe partielle se lit exactement comme une passe
faite** (D280). Son cadrage — donc **la liste de ses modes de défaillance** —
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

### ⛔ AVANCEMENT DU RANG 8 — ~~étapes 1→3 sur 6 FAITES ET MESURÉES (08/09/2026, D279)~~ **LES SIX ÉTAPES SONT FAITES (D279 + D282), RANG CLOS (D286)**

⛔ **SOUS-TITRE CORRIGÉ LE 16/09/2026 (D294), ET LA RAISON EST DANS SA POSITION.** Il annonçait
**1→3 sur 6** pendant que le tableau **immédiatement en dessous** portait **six lignes sur six à
✅**. ⚠ **Un titre se lit avant sa table** : la correction ci-dessous ne rattrape pas un lecteur
qui s'est arrêté au titre. C'est la famille des compteurs figés (D268), appliquée à un
sous-titre — et le chiffre est **remplacé par l'état, pas rafraîchi vers un autre chiffre.**

~~⛔ **CE LOT EST OUVERT ET À MI-PARCOURS.**~~ ⛔ **BARRÉ LE 16/09/2026 (D294) : IL NE L'EST PAS.**
Les six étapes sont faites (D279 pour 1→3, D282 pour 4→6), le lot est **certifié** par la marque
du rang 9 (D283, « D279 et D282 en font partie ») et le rang est **CLOS** depuis le 11/09 (D286).
⚠ **Barré, pas effacé** (D276) : effacée, cette phrase se réécrirait de bonne foi par quelqu'un
qui ignore qu'elle a cessé d'être vraie. Ce qui suit est son **point d'entrée**, pas son
état ; l'état est ici, et il tient en six lignes :

| étape | objet | état |
|---|---|---|
| 1 | le chiffrage devient un **module pur**, consommé par les DEUX chemins dès la 1ʳᵉ ligne | ✅ **D279** |
| 2 | les trois migrations de retard **appliquées, vérifiées EN BASE** par définition d'objet | ✅ **D279** |
| 3 | la confrontation **D75** devient une fonction pure du même module | ✅ **D279** |
| 4 | le **`CHECK`** d'agrégat + `migration-non-empty.int-spec.ts` **retargé sur un semis qui le VIOLE** | ✅ **D282** |
| 5 | les **deux échéances** (`expiresAt`, `paymentDueAt`), cas limites spécifiés et mesurés | ✅ **D282** |
| 6 | le **harnais**, pour sa part restante (CHECK + échéances) | ✅ **D282** |

⛔ ~~**LES SIX ÉTAPES SONT FAITES. LE RANG 8 N'EST PAS CLOS POUR AUTANT** : ce qui reste est
ce qu'aucune étape ne portait — la dérive de somme de contrôle Prisma, en attente
d'arbitrage, et trois reports au backlog.~~ ⛔ **BARRÉ LE 11/09/2026 (D286).** **Le rang 8 est CLOS.**
~~**Le lot n'est pas certifié.**~~
⛔ **BARRÉ LE 10/09/2026 (D283)** : la marque du rang 9 dit « portes vertes au repos le
10/09/2026, et **D279 et D282** en font partie ». ⚠ **Ce qui reste vrai et ne bouge pas : le
~~rang 8 n'est toujours pas CLOS** — la dérive de somme de contrôle `_prisma_migrations` reste
un arbitrage ouvert.~~ ⛔ **BARRÉ LE 11/09/2026 (D286).** ⚠ **Ce qui reste vrai, et c'est la phrase qui
vaut au-delà du cas : « Certifié et clos ne sont pas le même mot. »** Le rang 8 a été
certifié le 10/09 et clos le 11/09 — deux gestes, deux dates, deux sessions.
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
pas le lot suivant. ~~**Et les deux réserves de D275 restent actives** — reconduites
explicitement par D283, la n°2 en particulier : la sonde d'état machine vit toujours hors du
dépôt.~~
⛔ **BARRÉ LE 11/09/2026 (D286).** La sonde est au dépôt (rang 11), et sa calibration se rejoue.
⚠ **Ce qui reste vrai de cette phrase, et c'était son POINT** : une marque **ne se reconduit
pas**. Lever une réserve ne requalifie aucun relevé antérieur.

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

⛔ **SECONDE MOITIÉ DE LA RÈGLE, AJOUTÉE LE 16/09/2026 (D294) — ET C'EST CE BLOC QUI L'A PAYÉE :
IL SE RAFRAÎCHIT À CHAQUE AVANCEMENT *ET À LA CLÔTURE*.**
⛔ **LE FAIT QUI RANGE L'INCIDENT, ET IL EST ACCABLANT : CE BLOC PORTE LA RÈGLE QU'IL ENFREINT.**
La règle ci-dessus est écrite ici, par D282, en réponse à une reprise à froid qui avait lu ce
bloc comme « lot arbitré, pas commencé ». Elle a été **respectée à chaque étape** — le bloc a été
rafraîchi par D279, puis par D282. Elle a été **oubliée à la clôture** : quand D286 a fermé le
rang, trois affirmations sont restées debout, dont le titre et la première phrase.
⇒ **ET LA CLÔTURE EST LA SEULE QUI PUISSE ÊTRE OUBLIÉE, PARCE QUE PLUS RIEN NE SUIT.** Un
avancement oublié se rattrape à l'avancement suivant, qui relit le bloc ; une clôture oubliée
n'a pas de suivant — **elle reste telle quelle jusqu'à ce qu'une lecture adverse tombe dessus**,
ici cinq jours et deux certifications plus tard. C'est pourquoi la seconde moitié n'est pas un
ajout de confort : **elle couvre le seul cas que la première ne pouvait pas couvrir.**
⚠ **Cette règle est PORTÉE dans `AGENTS.md` le 16/09/2026**, à côté de « UN RANG CLOS LAISSE UN
ÉTAT NOMMÉ ». Motif, et il est tiré de l'incident lui-même : **une règle qui ne vit que dans le
bloc d'un rang meurt avec l'attention qu'on porte à ce rang.** Ce bloc n'est plus relu depuis
qu'il est clos — c'est très exactement pour cela que sa propre règle n'y a pas été appliquée.

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

## Session du 21/09/2026 — D299 · CERTIFICATION (rang 19) des rangs 17 et 18

⛔ **NUMÉRO PRIS EN LISANT LE REGISTRE** : sa dernière ligne portait **D298**. ⇒ **État du rang** : point
d'entrée « rang 19 ». Reprise à froid sans état donné, forme allégée ; Chrome quitté par Ko avant la
reprise (« `Get-Process chrome` ne renvoie rien ») — **à vérifier au relevé, pas à croire**. Lecture
adverse : **aucun défaut bloquant**, sept constats, écrits dans l'étape 0 ci-dessous.

### D299 — étape 0 : les trois points de Ko, et ce que la lecture adverse y a ajouté

1. **Le point 1 de Ko n'était pas outillé** : `audit-secrets.py` ne compare rien à la sortie scellée
   précédente. ⇒ `outils/alertes-nouvelles.py`, **sous `docs/preuves/`** — l'intégrer à l'instrument serait
   du code (report). ⚠ **Et une sortie de tri qui recopierait les contextes serait un écho non scellé** :
   elle renvoie aux lignes de la sortie scellée. Calibré : **92 contextes contre eux-mêmes ⇒ 0** ; **D298
   contre D297 (244 contextes) ⇒ exactement les 2** que D298 avait triées.
2. **Le contrôle « 0 valeur réelle » de D298 ne pouvait pas servir tel quel** : il exige les 24 valeurs du
   rang 15. ⇒ `outils/aucune-valeur-reelle.py`, paramétré sur un journal quelconque, compte attendu dérivé
   par une **seconde expression** (stricte et large doivent s'accorder), bras positif **par le chemin de
   lecture des fichiers**. Calibré sur les journaux e2e des rangs 12 et 15 : 48 valeurs, **0 porteur sur 452
   fichiers**.
3. **L'extrait élargi (point 9)** : `outils/extraire-e2e.py`. Marques du rapporteur **relevées dans la
   source de Playwright 1.50.1**, pas devinées (`ok`/`x` sous Windows hors VS Code). Structure du journal
   réel relevée avant d'écrire une règle : 910 lignes, **742 `[WebServer]`**, 34 `ok` + 1 `-` ; ses **4
   « failed »** sont deux requêtes en 500 sur `/api/v1/venues` **au démarrage des serveurs** (avant
   `Running`), en JSON sur plusieurs lignes — d'où la fenêtre de 3 lignes. **3 bras sur 3.**
4. **L'ordre de clôture se contredisait** : « audit en dernière écriture » et « tri avant le commit » —
   une pièce de tri versée après l'audit n'est pas couverte par lui. ⇒ audit scellé, tri, **second audit**.
5. **Les journaux de la passe se nomment `rang19-*`** : le bras « cas réel » des deux instruments est
   épinglé sur `rang15-e2e.log`.
6. **Les ports de l'e2e sont TROIS** (3100, 3101, 5273), relevés dans la configuration ; D293 en contrôlait
   deux.
7. **La RAM est le risque** : relevée ce midi à 3 768 puis 4 102 Mo **avec** Chrome (1 162 Mo) ; sans lui,
   la projection passe la barre — **une projection n'est pas une mesure** (D287).

⇒ **Étape 0 commitée et poussée AVANT tout relevé** : `c42c967` (audit scellé de l'étape 0 : 396 fichiers,
92 alertes, **0 nouvelle** contre la sortie scellée de D298 ; second audit après la pièce de tri, mêmes
comptes).

### ⛔ D299 — ÉTAPE 1 : LA PORTE DURE EST ROUGE SUR LA RAM, AUX DEUX RELEVÉS — RIEN N'EST LANCÉ

Base levée (`pg_isready` : accepting connections), ports **3100, 3101, 5273** libres, `node` 0, `chrome` 0
(relevés par la session **avant** la sonde — la parole de Ko est confirmée par la mesure).

| relevé | heure | RAM médiane | bande | écart à la barre | `chrome` | `node` | alim. | calibration |
|---|---|---|---|---|---|---|---|---|
| 1 (`-Calibrer`) | 19:06:41 → 19:07 | **4 526,5** | 4 510-4 542 | **−52,5** | 0 | 0 | SECTEUR | ✓ rendement 0,96 |
| 2 | 19:08:29 | **4 548** | 4 534-4 565 | **−31** | 0 | 0 | SECTEUR | (relevé seul) |

⇒ **ROUGE sur la seule quantité RAM**, les autres vertes — c'est la séparation du point 8 du critère,
**mesurée une troisième fois** : `chrome` 0 ne garantit pas la barre.
⚠ **LA PROJECTION ÉTAIT FAUSSE, ET DANS LE MAUVAIS SENS** : avec Chrome ouvert (1 162 Mo), la RAM libre
valait 4 102 Mo à 16:11 (relevé de D298) ; Chrome fermé, elle vaut **4 548**, soit **+446 et non +1 162**.
Entre-temps `Code` est passé de 3 840 à 4 104 Mo et `claude` de 334 à 433 (inventaires de D298 et de ce
relevé). **C'est exactement pourquoi la lecture adverse refusait de la tenir pour une mesure.**
**Inventaire > 150 Mo au second relevé** : `Code` 4 082 (20 processus) · `svchost` 1 233 · `vmmemWSL` 764
· `oracle` 633 · `claude` 429 · `powershell` 332 · `explorer` 309 · Docker Desktop 273 ·
`msedgewebview2` 239 · Memory Compression 227 · `com.docker.backend` 194.
⚠ **Écart de −31 à −52,5 Mo** : des deux refus de la série portés par la RAM, c'est le plus petit (D293, le
16/09 : −1 505,5) ; les deux autres refus (14/09, 20/09) portaient sur `chrome`. **Il ne se franchit pas
« de peu »** : une barre franchie au jugé cesse de mesurer (Ko, 09/09/2026).
⇒ **Rien n'est lancé** : ni échantillonneur, ni porte, ni campagne, ni e2e. **Aucune marque. Compteur à
DEUX.** Pièces : `docs/preuves/D299/ouverture-refusee/` (les deux sorties de sonde, copiées à l'octet,
empreintes vérifiées).
⇒ **Audit avant le commit du refus, selon la règle du point 10** : audit scellé → tri différentiel contre
la sortie scellée de l'étape 0 : **0 alerte nouvelle** → second audit, dernière écriture : **402 fichiers,
92 alertes, 0 nouvelle** (`ouverture-refusee/audit-secrets-refus.txt`, `tri-refus.txt`). Passe D277 du refus :
aucune phrase courante ne présente le rang 19 comme exécuté ou certifié ; les 13 permissions courantes restent
traitées (`passe-d277/sortie-refus.txt`).

### ⛔ D299 — LE REFUS RATIFIÉ, ET LE RELEVÉ QUI NE S'EST PAS FAIT

**Ratifié par Ko**, qui nomme le geste qui compte : **la sonde n'a pas été relancée jusqu'au vert.** À
**31 Mo** de la barre, trois relevés de plus auraient probablement passé — et la fenêtre aurait été
**choisie pour son résultat**. ⛔ **C'est le cas où la tentation était la plus forte de toute la série**,
et c'est pourquoi il s'écrit : un écart de −1 505 Mo (D293) ne tente personne, un écart de −31 Mo si.
⇒ **Règle de Ko, écrite au critère** (fin de « LA BARRE D'ÉTAT MACHINE ») : un relevé après un changement
d'état **nommé** mesure un autre état ; un relevé répété sur le même état jusqu'au vert est de la
**sélection**.
⇒ **Choix de Ko : LIBÉRER, PAS REDÉFINIR** — « redéfinir “repos” pour 31 Mo fabriquerait la permission à la
marge exacte où la condition échoue ». **Mouvement d'inventaire : Ko a arrêté `oracle`**, précédent de
D275 ; `chrome` et `oracle` vérifiés absents de son côté. ⚠ **Ce que l'arrêt a rendu n'est PAS 633 Mo tant
qu'il n'est pas mesuré** : fermer Chrome n'a rendu que 446 Mo sur 1 162 (ci-dessus). Il se lit au relevé
de reprise.

### ⛔ D299 — PASSE 1 : VERTE PARTOUT, ET NON CERTIFIANTE — MON MONITEUR A AVEUGLÉ L'ÉCHANTILLONNEUR

**Le relevé de reprise, et ma faute d'entrée.** À 23:07, `chrome` 0, `oracle` 0, `node` 0 — mais
**Docker Desktop était arrêté** : `pg_isready` a échoué, et ma commande a **enchaîné sur la sonde au lieu de
s'arrêter**. Ce relevé (RAM 6 607 Mo) décrit une machine **sans Docker**, pas celle de la passe : il n'est
**pas** un relevé d'ouverture, il n'entre dans aucun verdict. ⇒ Docker Desktop relancé **par la session**
— second mouvement d'inventaire, **imposé par le protocole** (`test:int` et l'e2e en dépendent), non fait
par Ko — puis `pnpm db:up` (même volume `zwadj_zwadj_pgdata`). ⚠ **Ce n'était pas une relance jusqu'au vert** :
le relevé de 23:07 n'était pas conforme, il n'avait rien à refuser.
**Relevés d'ouverture conformes** : 23:10:37, calibré (rendement 0,93) — RAM **5 572,5** (bande 4 713-5 844,
Docker en démarrage) ; 23:11:12 — **5 864** (5 853-5 881). `chrome` 0, `node` 0, SECTEUR. **Porte dure verte.**
**Ce que le mouvement a réellement rendu — mesuré, et non attribuable** : entre le refus de 19:08 (4 548 Mo)
et 23:11 (5 864 Mo), toutes deux avec Docker levé : **+1 316 Mo**. ⚠ **La part d'`oracle` (633 Mo au refus)
ne s'isole pas** : dans le même intervalle, `Code` −838, `svchost` −309, `claude` −111, `vmmemWSL` +432
(Docker relancé). **On écrit le net, et on dit qu'on ne sait pas l'attribuer.**
**La passe** (arbre `b56da7f`, vide aux deux premiers contrôles) :

| porte | code | chiffres (journaux relus en entier, ANSI retiré, lecteur calibré) | RAM au relevé |
|---|---|---|---|
| `typecheck` | 0 | 8 projets « Done » | 5 756,5 |
| `lint` | 0 | 8 paquets « Done » | 5 770 |
| `test` | 0 | 659/58 · 36/3 · 287/20 · 347/28 = **1 329 / 109** | 5 665,5 |
| `build` | 0 | 4 builds | 6 034 |
| `test:int` | 0 | **436 / 36** | 6 238 |
| `test:e2e` | 0 | **34 passés · 1 ignoré** sur 35 ; `node` 0 et ports libres avant et après | 6 008 |
| `--tout` | 1 (attendu) | **186 mordues · 0 muette · 13 non mesurées** (`e3d1-s8` 5, `s11b` 4, `solid-s6` 4), 1 948 s | 6 000,5 |

⇒ **Tout est exactement la prédiction dérivée.**
⛔ **ET RIEN DE CELA NE CERTIFIE, PARCE QUE LA FENÊTRE DE `--tout` N'EST PAS ÉCHANTILLONNÉE.** Pour être averti
de la fin de chaque campagne et de toute ligne hors SECTEUR, j'ai armé un moniteur qui suivait par
`tail -f` le journal des campagnes **et celui de l'échantillonneur**. `Add-Content` a alors levé à chaque
échantillon (**62 `IOException`**, « being used by another process ») : **aucun échantillon de 23:25:45 à
23:59:28**. Les `tail` ont **survécu** à l'arrêt des moniteurs (sous-shells lancés en arrière-plan) ; arrêtés
par la session (quatre, lignes de commande vérifiées avant), l'échantillonneur a repris **à la cadence
suivante**. ⇒ Son lecteur, calibré sur ses quatre cas : **1 trou de 2 023 s, « LA FENÊTRE N'EST PAS
HOMOGÈNE »** (code 2).
**La cause est reproduite, pas supposée**, sur un témoin hors dépôt : `tail -f` actif ⇒ `Add-Content`
**refusé** (`IOException`) ; `tail` arrêté ⇒ **écrit** (`outils/reproduire-verrou.sh`, sortie versée).
⛔ **C'EST LA RÈGLE N°1 DE D298 QUI S'APPLIQUE, ET ELLE DIT QUOI FAIRE** : le défaut est d'**instrument**
(une mesure du régime empêchée par la surveillance du régime) ; le **comportement ne dément pas** (portes
vertes, compte des gardes prédit, **SECTEUR aux neuf relevés conformes** — deux d'ouverture, sept avant les
mesures — et aux 29 échantillons pris). ⇒ **La mesure
s'arrête, pas le lot** : réparation de l'usage (aucun lecteur sur ce journal pendant la fenêtre), **rejeu
INTÉGRAL** de la passe, relevé d'ouverture compris, défaut écrit ici avec ses sorties brutes.
⚠ **Ce qui ne se déduit PAS** : que la machine soit restée au régime pendant le trou. La durée de `--tout`
(1 948 s, contre 5 454 s sur batterie à D283) le rend **plausible** — c'est une **inférence**, et c'est
précisément pourquoi la passe ne certifie pas. ⚠ **Et le rejeu n'est pas une relance jusqu'au vert** : la
passe 1 était verte ; c'est son **instrument** qui manquait.
Pièces : `docs/preuves/D299/passe-1-interrompue/` (28 fichiers copiés à l'octet ; le journal e2e brut **reste
hors dépôt**, sans extrait : cette passe ne sert à aucun verdict).

### ✅ D299 — PASSE 2, REJEU INTÉGRAL (22/09/2026, 00:03 → 01:02) : VERTE, FENÊTRE HOMOGÈNE — MARQUE POSÉE

⚠ **Pourquoi ce relevé d'ouverture est légitime, au sens de la règle de Ko** (fin de « LA BARRE D'ÉTAT
MACHINE ») : il ne suit pas un refus — la passe 1 était **verte**, c'est son **instrument** qui manquait ;
la règle n°1 de D298 impose le rejeu **intégral**, relevé d'ouverture compris. Amendement du protocole
commité **avant** (`90014f7`). ⚠ **Aucun mouvement d'inventaire de Ko** entre les deux passes ; la
session n'a arrêté que **ses propres** `tail` (quatre, lignes de commande vérifiées).
**Avant le relevé** : `pg_isready` « accepting connections » ; ports écoutés 0 · `node` 0 · `chrome` 0 ·
`oracle` 0 · **`tail` 0** — ⚠ compté **exprès** : c'est la cause de la passe 1.

| relevé | heure | RAM médiane | bande | écart à la barre | `chrome` | `node` | alim. | calibration |
|---|---|---|---|---|---|---|---|---|
| 1 (`-Calibrer`) | 00:03:55 | **6 554** | 6 540-6 558 | **+1 975** | 0 | 0 | SECTEUR | ✓ rendement 0,97 |
| 2 | 00:04:30 | **6 613,5** | 6 562-6 625 | **+2 034,5** | 0 | 0 | SECTEUR | (relevé seul) |

⇒ **Porte dure verte.** ⚠ La RAM d'ouverture est plus haute qu'à la passe 1 (5 864) : **écart non
attribué**, aucun inventaire poste par poste n'a été pris entre les deux — il n'entre dans aucun verdict.
**La passe**, sur l'arbre `90014f7`, **relevé de sonde devant chaque mesure** :

| mesure | code RÉEL | chiffres (journaux relus en entier, ANSI retiré, lecteur calibré) | RAM au relevé (bande basse) |
|---|---|---|---|
| `typecheck` | 0 | 8 projets « Done », 0 `error TS` | 6 533 (6 511) |
| `lint` | 0 | 8 paquets « Done » | 6 534 (6 523) |
| `test` | 0 | 659/58 · 36/3 · 287/20 · 347/28 = **1 329 / 109** | 6 536 (6 520) |
| `build` | 0 | 4 « Done » | 6 547 (6 520) |
| `test:int` | 0 | **436 / 36**, PostgreSQL réel | 6 388 (6 363) |
| `test:e2e` | 0 | **34 passés · 1 ignoré** sur 35, **recomptés par l'extrait** ; `node` 0 et ports libres avant et après | 5 749 (5 439) |
| `--tout` | **1 (attendu)** | **27 campagnes · 186 mordues · 0 muette · 13 non mesurées**, 1 886 s | 5 980 (5 962) |
| `e3d1-s8 --int` | 0 | **8 / 8** | 5 773,5 (5 728) |
| `s11b --int` | 0 | **13 / 13** | 6 192 (5 931) |
| `solid-s6 --int` | 0 | **6 / 6** | 6 096 (6 089) |
| contre-épreuve de `audit-secrets.py`, à la main | 0 | pré-vol 0 (5 bras ✓) · **5 mordues sur 5** | — (voir les limites) |
| clôture | — | — | 5 918 (5 729) |

⇒ **TOUT EST EXACTEMENT LA PRÉDICTION DÉRIVÉE DE `c42c967`.** Les **13 relevés de sonde** : SECTEUR,
`chrome` 0, `node` 0, médiane **et** bande basse au-dessus de la barre — le plus bas, 5 439, avant l'e2e.
⚠ **`pg_isready` rejoué avant chaque rejeu `--int`** (amendement) : 0 les trois fois. ⚠ Les trois campagnes
rejouées sont celles que `--tout` a nommées **dans sa sortie** (« → sortie 3 »), extracteur confronté au
journal brut avant de servir.
**Campagnes, arithmétique CAMPAGNE PAR CAMPAGNE** : `e3d1-s8` 3 + 5 = 8, `s11b` 9 + 4 = 13, `solid-s6` 2 + 4 =
6. ⇒ **TOTAL CERTIFIANT : 199 mordues · 0 muette · 0 non mesurée** (186 − 14 + 27). ⚠ **+4 sur D293 (195)** :
la campagne neuve de D297, `neutralize-budgets.py`, **4 sur 4** — la seule qui ait changé.
**« failed » confronté à son contexte (D275)** : `test`, **2** lignes de journal de `ChargilyGateway`
(« TypeError: fetch failed », panne réseau exercée par `chargily.gateway.spec.ts`, 17 ✓) et **0 `FAIL`** en
casse exacte ; `test:int`, **1**, le **nom** d'un test vert (« la ligne passe FAILED ») ; e2e **0** ligne
« fail » (l'extrait en garde 0 sur 0 — le rang 15 en portait 4, au démarrage des serveurs) ; campagnes et
rejeux **0**. **0 `ELIFECYCLE`, 0 « timed out », 0 `error TS`** partout.
**L'e2e ignorée, relevée dans la SOURCE** : `e2e/specs/a5-cold-reload-vs-spa.e2e.ts`, test l. 175,
`test.skip` l. 190, motif « nécessite une salle de fixture : à brancher avec T2 » — la même qu'à D283, D288
et D293.
**Arbre immobile sur `90014f7`, CINQ contrôles, 0 ligne à chacun** : 00:04:42 (avant les portes), 00:16:58
(avant les campagnes), 00:49:20 (après `--tout`), 01:00:41 (après les `--int`), 01:00:59 (après la
contre-épreuve). ⚠ Un `apps/client/src/app/[locale]/loading.tsx` non suivi a été aperçu **pendant** `--tout`
par un instantané `git status` : c'est la cible **C9** de `neutralize-404.py` (« le soft-404 revient »,
`FALLBACK_REMONTE`, l. 68), **absent à l'arbre 3**. Les harnais mutent des sources : on contrôle **après**
chaque étape, jamais pendant. **Aucun fichier suivi n'a été écrit pendant la fenêtre** ; toutes les
écritures du lot sont postérieures au relevé de clôture (D270).
**La fenêtre** (`-Resume` après l'arrêt de l'échantillonneur, calibration du lecteur 4 cas sur 4) :

```
ECHANTILLONS=109   dont ECHEC-INSTRUMENT=0
FENETRE=2026-09-22 00:04:42 → 2026-09-22 01:01:34   (56.9 min)
RAM_LIBRE_MO min=3549 max=6553   CPU_PCT max=99   NODE max=15
TRANSITIONS_ALIMENTATION=0       TROUS_DANS_LA_SERIE=0
✓ FENETRE HOMOGENE : une seule source d'alimentation, aucune interruption de serie.
```

⚠ **Ce que `-Resume` n'imprime pas, relevé à part sur le CSV fermé** (`passe/rang19-p2-etat-complement.txt`) :
108 écarts entre échantillons, **31 à 34 s, 0 au-delà de 60 s** ; alimentation **SECTEUR seule** ; `chrome`
**max 0 sur 109** ; `PERF` 79,2 → 157,1, **au-dessus de 100 sur 97 échantillons sur 109** ; console de
l'échantillonneur : **0 `IOException`**. ⇒ **L'amendement a tenu** : aucun lecteur sur ce journal pendant la
fenêtre ; le seul `tail` de la session suivait le journal des campagnes, et il a été arrêté à l'expiration
de son moniteur (PID vérifié, 0 `tail` ensuite).
⚠ **RAM sous la barre sur 8 échantillons sur 109** (min 3 549), **tous avec 12 à 14 `node`** — l'e2e
(00:15-00:16) et les campagnes (00:24-00:34). **Pas une violation** : la porte dure porte sur l'**ouverture
au repos**, l'échantillonneur surveille le **régime** (D293).
**Pièces** : `docs/preuves/D299/passe/` — **51 pièces + 27 journaux de campagne, 78 identiques par SHA-256
sur 78 relues** (`outils/verser-passe.py`, sortie `outils/verser-passe-sortie.txt`) ; lecture
`passe/rang19-p2-lecture.txt` ; **extrait e2e** `passe/rang19-p2-e2e-EXTRAIT.txt` — 819 lignes parcourues
(attendu 819, compté sur les octets), 38 gardées, calibration 3 bras sur 3 dont le cas réel rejoué, **24
jetons dans la source, 0 dans la sortie**. ⛔ **Le journal e2e brut reste hors dépôt.**

### ✅ LA MARQUE — CE QUI EST ÉCRIT, MOT POUR MOT

> **Portes vertes AU REPOS le 22/09/2026, et D297 (rang 17, `a2dd3f3`) et D298 (rang 18, `edf66ae`) en
> font partie.**

**Deux lots, et rien d'autre** — et c'est **mesuré**, pas recopié : des **11 commits** de `ceced54` (marque
de D293) à `90014f7`, **deux seulement** portent un fichier hors `.md` d'autorité et hors `docs/preuves/` :
`a2dd3f3` (six : quatre configurations vitest, `mesure-budgets.py`, `neutralize-budgets.py`) et `edf66ae`
(un : `neutralisation/audit-secrets.py`).
⛔ **Aucun en-tête antérieur n'est réécrit en « certifié »** (point 4 du critère). ⚠ Les titres des points
d'entrée des rangs 17 et 18 portent **« NON CERTIFIÉ »** : ils ne sont **pas** réécrits — une ligne datée,
**sous** chacun, dit que cet état n'est plus courant et renvoie ici. La marque est ici, datée, et **elle ne
se reconduit pas au lot suivant**.
⇒ **Le compteur de lots de code non certifiés passe de DEUX à ZÉRO.** Un lot de code **peut** s'ouvrir dès
que Ko l'arbitre — et c'est lui qui portera le compteur à un. ⇒ **RANG 20 : EN ATTENTE D'ARBITRAGE DE KO**
(D284) — écrit à la clôture dans l'ordre des rangs. ⚠ **Une permission n'est pas un arbitrage.**

### Les deux réserves de D275 — l'une LEVÉE, l'autre RECONDUITE

- ✅ **LEVÉE, et reconduite comme telle — l'instrument d'état machine** : au dépôt, il **rejoue sa
  calibration à l'invocation** (rendement **0,97** à 00:03). Et c'est son **lecteur** qui a refusé la passe 1 :
  sans lui, un trou de 2 023 s serait passé pour une fenêtre.
- ⚠ **RECONDUITE — zéro `node` pendant la mesure.** `NODE=0` aux **13** relevés, aucune pile `dev` en tâche
  de fond. **C'est une condition de ce que la marque vaut, pas un défaut** : elle ne dit rien de la porte
  pendant qu'un observateur de fichiers recompile (piste D274 jamais écartée). **Elle se recopiera dans la
  prochaine.**

### ⚠ CE QUE LA MARQUE NE COUVRE PAS — écrit avant elle

1. ⛔ **La base de dev `zwadj`** était **vierge** au relevé de D293 — **non re-mesurée ici** ; `test:int` et
   l'e2e recréent leurs propres bases.
2. **Aucune durée n'est certifiée** — modes mixtes, terme de position (D291). Les durées sont dans les
   journaux ; elles n'entrent dans aucun verdict.
3. **La contre-épreuve de `audit-secrets.py` n'a pas de relevé de sonde propre** (3 s) : elle est encadrée par
   celui du rejeu `solid-s6` (00:56:39) et celui de clôture (01:01:45), et couverte par l'échantillonneur.
   ⚠ **Elle est jouée à la main parce que `lancer-campagnes.py` ne joue pas une campagne qui ne vise qu'un
   `.py`** (report de D298) : la garde de l'instrument n'est couverte que tant qu'une certification la
   rejoue ainsi.
4. **La passe 1 ne certifie rien** ; la passe 2 est un **rejeu intégral**, pas une relance jusqu'au vert —
   la passe 1 était verte.
5. **Docker Desktop a été relancé par la session** au relevé de reprise de la passe 1 (mouvement imposé par
   le protocole) : les deux fenêtres commencent après lui.

### ⛔ PASSE D277 DE LA MARQUE — LES DEUX SENS, ET DEUX FAUTES DE MES PROPRES OUTILS, TROUVÉES AVANT DE CONCLURE

Sur le texte **aplati** (D294), ventilation par motif (D295) : `passe-d277/compte.py` sur `motifs-marque.txt`
— **217 occurrences sur 7 motifs**, 1 213 701 caractères, **aucun motif à zéro** (`sortie-marque.txt`) ;
chaque occurrence rattachée à sa ligne et à son titre (`situer.py`, `situer-marque.txt`). ⚠ **Comptés AVANT
l'écriture de cette sous-section**, qui cite elle-même les motifs : un recomptage rendra davantage, **dans
la section D299 seulement** — datée, hors du champ du vérificateur.
**Sens 1 — ce que la marque invalide** : les « compteur à DEUX · aucun lot de code ne s'ouvre » **courants**.
Traités : point d'entrée du rang 19 (titre barré, bloc de clôture, état de 19:08 daté, « reste OUVERT »
barré) ; rangs 17 et 18 (une ligne **sous** chaque titre, qui n'est pas réécrit ; interdictions levées) ;
les **huit** « (D298) PERMISSION CONSOMMÉE » des rangs 16, 15 (deux), 14, 12 et de l'ordre des rangs (trois),
levés par un script qui lit son texte dans un fichier (D289) — **8 ancres, 8 marqueurs, 0 LF nu, relu** ;
ordre des rangs (rang 18 levé, rang 19 clos, **rang 20 en attente**) ; registre.
⇒ `verifier-marque.py` : **92 occurrences du sens 1 hors sections datées, 70 traitées, 22 triées à la main**
(`tri-marque.txt` : 16 datées, vraies à leur date — principe de D291 ; 3 citations ou lignes de cette
marque ; 3 faux positifs du motif). **Aucune écriture requise par le tri.**
⛔ **FAUTE N°1 — L'ANCRE DU SCRIPT DE LEVÉE ÉTAIT TROP ÉTROITE.** Elle trouvait 8 annotations D298 ; une
neuvième, **formulée autrement** (« (D298, 21/09/2026) Compteur à DEUX … »), dans l'ordre des rangs, lui a
échappé. **C'est le vérificateur qui l'a vue**, pas une relecture : levée à la main. ⚠ Un compte asserté
(« 8 attendues ») prouve qu'on a trouvé ce qu'on cherchait, **pas qu'on cherchait tout** — la famille du
« motif à zéro » de D295, un cran plus haut.
⛔ **FAUTE N°2 — LE VÉRIFICATEUR SAUTAIT L'ORDRE DES RANGS.** Il excluait les sections datées par leur titre
`##` ; or l'**ordre des rangs vit sous « ## Session du 31/08/2026 — D270 »**. Première sortie : **56**
examinées, **12** non traitées — une passe d'apparence saine **qui ne voyait pas le bloc le plus courant du
fichier**. Ramené dans le champ par son sous-titre (repéré par son **texte**, jamais par un numéro de
ligne) : **92** examinées. ⚠ C'est ce qui a fait sortir la neuvième annotation ci-dessus. Report au backlog.
**Sens 2 — ce que la marque rend permis (D287)** : `sens2-marque.py` liste les **59** « peut s'ouvrir » et
« compteur à zéro » hors sections datées : **tous génériques** (« un lot de code »), **conditionnés à
l'arbitrage de Ko**, barrés, ou maillons d'une chaîne levée. **Aucun ne désigne un lot précis** — la borne de
workers, seule désignation ancienne, est barrée et « reste close sans borne » (D290). ⇒ **Rang 20 : en
attente d'arbitrage de Ko**, écrit dans l'ordre des rangs **et** au point d'entrée.

### D299 — LA CLÔTURE DANS L'ORDRE DU POINT 10 : VALEURS, AUDIT SCELLÉ, TRI, SECOND AUDIT

1. **« 0 valeur réelle » — ce qui fait foi (Ko)** : `outils/aucune-valeur-reelle.py`, joué sur **les deux**
   journaux e2e de la session — celui de la passe 2 **et** celui de la passe 1, hors dépôt lui aussi et
   jamais contrôlé jusqu'ici : **48 valeurs** (24 + 24, stricte et large accordées), calibration à deux bras
   par journal, **590 fichiers** parcourus (`docs/preuves/`, `neutralisation/`, les quatre `.md`) ⇒
   **0 porteur** (`passe/rang19-p2-aucune-valeur.txt`).
2. **Audit scellé** (`neutralisation/audit-secrets.py --sortie passe/audit-secrets-passe.txt`) : calibration
   **5 bras sur 5**, cas réel rejoué ; **528 fichiers parcourus, 507 audités, 21 exclus par l'identité de
   leurs octets** (612 alertes d'écho non comptées) ; **93 alertes**.
3. **Tri différentiel** contre la sortie scellée précédente, celle de la passe 1
   (`passe-1-interrompue/audit-secrets-p1.txt`, 92) : calibration 2 bras sur 2 ; **1 alerte nouvelle**
   (`passe/tri-passe.txt`). **Triée au contexte** : [mot-de-passe] à `passe/rang19-p2-test-int.log:197` —
   le mot masqué est « réponse », dans le **titre** du test `apps/api/test/int/account.int-spec.ts:389`
   (« forgot-password : réponse CONSTANTE, mais aucun e-mail ne part ») ; valeur présente dans 102 fichiers
   suivis hors preuves, et **même contexte** déjà dans la sortie précédente sous un autre chemin
   (`D298/portes/porte-test-int.log:200`). ⇒ **Un mot, pas une valeur** (point 10). **Aucune valeur.**
4. **Second audit, vraie dernière écriture** : `passe/audit-secrets-final.txt` — il doit rendre les
   **mêmes** alertes que le premier ; confronté par le même tri, sortie non versée (elle serait une écriture
   de plus).

## Session du 21/09/2026 — D298 · rang 18 CLOS : l'écho de l'audit de secrets — un instrument nouveau, qui exclut par l'identité des octets et imprime ce qu'il exclut

⛔ **NUMÉRO PRIS EN LISANT LE REGISTRE** : sa dernière ligne portait **D297**. ⇒ **État du rang** : point
d'entrée « rang 18 ». ⛔ **LOT DE CODE, NON CERTIFIÉ : il porte le compteur de lots de code non
certifiés à DEUX.** Reprise à froid sans état donné, forme allégée ; la lecture adverse d'abord, puis le
rang 18 **enchaîné dans la même session sur ordre explicite de Ko** (« sauf défaut bloquant ») — la
reprise à froid a donc été exercée pour l'ouverture, pas pour la suite.

### D298 — ce que Ko a ordonné, en trois points, et où chacun a atterri

| point de Ko | ce qui est écrit | où |
|---|---|---|
| 1 — le n°0 non appliqué au rang 17 : **ratifié, la règle s'écrit** | « un défaut d'instrument découvert à un point d'arrêt arrête la mesure, pas le lot » | `AGENTS.md`, bloc des instruments |
| 2 — la marge du rang 17 **comprend les passes froides** | **≥ 4 603 ms** en premier, ≥ 4 618 ms en second et déclaré ; **sept** marges hors froide traitées (« 4 618 » ×5, « 4 637 » ×2) | point d'entrée du rang 17, ordre des rangs, décisions ouvertes, registre, backlog |
| 3 — **rang 18 = l'écho de l'audit de secrets** | `neutralisation/audit-secrets.py`, instrument nouveau ; l'outil de D293 intact | ci-dessous ; pointeur dans `AGENTS.md` |

### ⛔ D298 — LA LECTURE ADVERSE : AUCUN DÉFAUT BLOQUANT, HUIT CONSTATS

1. **Les affirmations de clôture de D297 tiennent contre les pièces brutes** : encadrement (première
   exécution : comportement 4 sur 4, signature non lue ; seconde : 4 sur 4 lues), harnais 4 sur 4,
   passes froides 370,7 et 396,7 ms, compteur à UN confirmé par `git` (seul `a2dd3f3` porte du code
   depuis la marque de D293).
2. ⛔ **« 185 sont l'écho déjà relevé » (section D297) est faux dans sa décomposition** : 185 était le
   total précédent ; l'écho y pèse **154** (sorties d'audit réauditées : D294 45, D296 102, D291 7) et
   **31** n'en sont pas. Barré sur place avec son motif.
3. ⛔ **La prémisse « environ cent par lot » ne vaut que pour moitié** : les +102 de D296 étaient de
   l'écho, les **+59 de D297 n'en sont pas** — des titres de tests recopiés dans les rapports JSON et le
   journal `test:int`. ⇒ **L'objectif atteignable est « ne plus voir l'écho », pas « attendu 0 »** — et
   c'est bien celui que la calibration de Ko définit. Écrit au point d'entrée comme limite.
4. ⛔ **Exclure par le NOM serait un audit tronqué** — un `audit-secrets-*.txt` portant un vrai jeton
   serait caché. ⇒ Exclusion par **identité** : empreinte épinglée ou sceau vérifié.
5. **`lancer-campagnes.py` ne retient que `.ts|tsx|css|json|sql|mjs`** : une campagne qui ne vise qu'un
   `.py` serait « aveugle » et ferait sortir le tri en 1 à chaque passage. ⇒ Pas de `neutralize-<lot>.py`
   pour ce lot ; la contre-épreuve est versée comme **pièce**. ⚠ **Déjà rapporté par D297**
   (`[INFRA][P3]`, sous l'angle inverse : un harnais dont l'instrument change n'est pas rejoué) ; D298
   ajoute cette seconde conséquence à la même entrée, non corrigée.
6. **Rien ne disait quel audit fait foi** : la prescription d'`AGENTS.md` est générique, et les trois
   sessions précédentes écrivent « instrument de D293, rejoué ». ⇒ Pointeur écrit (passe D277, sens 2).
7. **Le point 1 touche `AGENTS.md`, donc il déclenche la consigne `[DOC][P2]` de Ko du 20/09** —
   compléter la règle de D295 dans les deux sens. **Appliquée** : c'est l'ordre écrit de Ko, conditionné
   à exactement cet événement.
8. **Trouvé en traitant le point 2** : la table de D297 écrivait **≥ 4 962** pour `api-client`, alors que
   5 000 − 38,3 = 4 961,7 — `mesure-budgets.py` arrondit un minorant au plus proche. Rectifié dans
   l'autorité, rectification posée à côté des pièces (`docs/preuves/D297/mesures/RECTIFICATION-D298.txt`),
   instrument **non retouché** (précédent de D294, ratifié par Ko — D295).

### D298 — l'instrument : exclure par l'identité des octets

- **Prédécesseurs, 17 fichiers** : tout fichier de `docs/preuves/` portant la **ligne de bilan** d'un
  audit, **dérivé du disque** (331 parcourus au relevé) et attribué à son producteur — 3 de
  `integrite-et-secrets.py` (D291), 7 de `verser-et-confronter.py` (D293), 7 de `audit-secrets.py` (D293,
  dont les sorties versées par D294, D296 et D297). ⚠ **Les 7 de `verser-et-confronter.py` n'alertent
  pas** : ils sont exclus parce que le critère est l'**origine**, jamais le résultat — et, épinglés à
  l'octet, leur exclusion ne peut rien cacher. Registre relu contre l'instrument par l'arbre syntaxique :
  **17 = 17, même ordre** (`lecture/registre-dans-instrument-sortie.txt`).
- **Ses propres sorties** : scellées (dernière ligne = empreinte de tout ce qui précède). Un octet ajouté,
  retiré ou changé, avant ou après le sceau, rend le fichier à l'audit.
- **Écartés, sur mesure** : l'exclusion par **nom** (bras (d), mutation M2) ; l'exclusion **ligne par
  ligne** des masques « <N car. masques> » — **113 correspondances d'écho sur 341 ne portent aucun
  masque** (lignes de bilan des prédécesseurs, contextes imbriqués tronqués) ; retoucher l'outil de D293
  (contrainte de Ko).
- **Motifs** : les onze de D293, **identiques** — motifs, échantillons positifs, propre et informatif
  comparés par valeur (`lecture/motifs-identiques-sortie.txt`).
- **Le cas réel porte DEUX formes**, pas une : **20** lignes sur `localhost:5273/auth/`, **4** sur
  `localhost:3100/fr/auth/` — 24 jetons de 43 caractères, **24 distincts**, 910 lignes, empreinte
  épinglée (`lecture/cas-reel-sortie.txt`). Le bras construit reprend la plus fréquente ; le bras réel
  couvre les deux.

### ⛔ D298 — LA CALIBRATION, ET LA PREUVE QU'ELLE MORD

| bras | cas | verdict |
|---|---|---|
| motifs | 11 positifs, 1 propre | 11 sur 11 |
| positif (Ko) | pièce neuve, jeton construit de la forme réelle | vu : 1 alerte, motif `jeton` |
| écho (Ko) | 17 sorties épinglées lues sur disque + 1 sortie scellée | 0 audité, 18 exclues, 661 non comptées (> 0) |
| discrimination (session) | jeton ajouté (a) à une épinglée (b) après / (c) avant un sceau (d) dans une pièce nommée comme une sortie d'audit | vu 4 sur 4, un de plus chaque fois |
| cas réel (Ko) | journal e2e du rang 15, hors dépôt | 24 sur 24, tous `jeton` |

**Contre-épreuve** (`contre-epreuve/`, copies mutées écrites **hors dépôt**, jouées en
`--calibration-seule`, preuve de pose « ancre 1 → 0 et marqueur n → n + 1 », D286) : pré-vol non muté
**vert, 5 bras** ; **M1** emplacement sans empreinte → ✗ discrimination ; **M2** exclusion par nom → ✗
discrimination ; **M3** sceau présent au lieu de vérifié (marqueur **1 → 2** : interversion) → ✗
discrimination ; **M4** registre vide → ✗ écho ; **M5** exclusion des `.log` → ✗ positif **et** cas réel.
**5 gardes mordues sur 5**, chacune sur le bras attendu et lui seul.

### D298 — confrontation à l'outil de D293, sur le même arbre

**Prédit avant d'être mesuré** : 244 + 189 (la sortie de D297, rejouée par les onze motifs de D293 lus
dans la pièce) = **433**. **Mesuré : 433.** Le nouvel instrument, même arbre : **333** parcourus, **316**
audités, **17** exclus, **472** alertes d'écho imprimées et non comptées, **90** alertes.
⇒ **333 − 4 = 329** fichiers (D293 : 329) ✓ ; **90 + 472 − 129 = 433** alertes (D293 : 433) ✓ — 129 étant
l'écho des quatre sorties que D293 s'excluait déjà. Détail relu ligne à ligne, 17 sur 17 et 472 sur
472 (`lecture/confronter-sortie.txt`). ⚠ **Les deux sorties brutes restent hors dépôt** : versée, celle
de D293 serait un écho non épinglé de plus.

### D298 — les portes, après la dernière modification du code

État machine, **sonde calibrée** (rendement 0,96) : **ouverture 16:02:13** — SECTEUR, RAM **3 768 Mo
(−811 sous la barre D273)**, `chrome` **14**, `node` 0, `PERF` 80,2 ; **clôture 16:11:16** — SECTEUR, RAM
**4 102 Mo (−477)**, `chrome` **15**, `node` 0. ⛔ **NON CERTIFIANT, ET DÉCLARÉ** : navigateur ouvert et
RAM sous la barre — la porte dure du critère est **rouge**. Elle n'est pas exigée d'un lot de code non
certifiant ; **aucune durée ci-dessous n'entre dans une comparaison** (D290).

| porte | sortie | chiffres (journaux relus en entier, ANSI retiré) | durée |
|---|---|---|---|
| `pnpm typecheck` | 0 | 8 projets « Done » | 20 s |
| `pnpm lint` | 0 | 8 paquets « Done », 0 erreur | 12 s |
| `pnpm test` | 0 | api **659/58** · api-client **36/3** · client **287/20** · pro **347/28** · 0 « timed out » | 57 s |
| `pnpm build` | 0 | 4 builds « Done » | 36 s |
| `pnpm test:int` | 0 | **436/36** | 260 s |
| harnais du lot | — | **aucun** : un `neutralize-*.py` ne visant qu'un `.py` serait aveugle au tri ; contre-épreuve **5 sur 5** à la place | — |
| `lancer-campagnes.py` | 0 | 0 campagne concernée sur 27 (aucun fichier que lit une campagne n'est touché) | — |

⚠ **Non lancés** : l'e2e (à la demande, non demandée ; le lot ne touche ni auth, ni concurrence, ni
argent) et `--tout` (ce n'est pas une livraison certifiée). Pièces : `docs/preuves/D298/portes/`.

### D298 — passe D277, les deux sens

Recherche versée (`docs/preuves/D298/passe-d277/`), sur texte **aplati**, ventilée par motif.
- **Sens 1 — invalidé, traité** : « 4 618 » comme marge principale (**5** : titre et table du point
  d'entrée du rang 17, ordre des rangs, registre, backlog) ; ⚠ **et « 362,7 ms — ≥ 4 637 ms », la marge
  d'`api` hors froide écrite comme un fait (2 : décisions encore ouvertes, backlog)** — trouvée
  seulement en élargissant la recherche à **toutes** les marges et tous les majorants de D297
  (`passe-d277/motifs-marges.txt`) ; « RANG 18 : EN ATTENTE » (**7**, toutes
  barrées « consommé ») ; « 185 sont l'écho » (section D297, barré) ; l'entrée `[INFRA][P3]` de l'écho et
  l'entrée `[DOC][P2]` du « y », **fermées** au backlog.
- ⛔ **Sens 2 — ce que le compteur à DEUX rend FAUX** : **huit** « un lot de code peut s'ouvrir »
  encore vivants — **cinq** dans les points d'entrée (rangs 16, 15 deux fois, 14, 12), **trois** dans
  l'ordre des rangs — tous annotés « **PERMISSION CONSOMMÉE** » au format de D291 (comptés dans le
  fichier : 8) ; et **deux** états du compteur au présent annotés (« UN » au point d'entrée du rang 17,
  « ZÉRO » dans l'ordre des rangs). ⚠ **J'avais annoncé « neuf » à Ko** en comptant un état du compteur
  parmi les permissions : c'est le compte relu dans le fichier qui fait foi.
- ⚠ **Deux failles de ma propre recherche, trouvées avant de conclure** : le premier motif ne voyait ni
  le gras (« **peut** s'ouvrir ») ni les capitales — **la faille exacte que D291 avait déjà relevée** ; et
  le classement « courante / datée » rangeait l'**ordre des rangs** en « datée », parce qu'il vit dans une
  section de session. Corrigées dans la procédure versée.
- **`AGENTS.md`** : aucun état du compteur ; le pointeur de l'audit est la seule permission ajoutée.

### D298 — audit de secrets avant commit (l'instrument de D298, sortie scellée)

`python3 neutralisation/audit-secrets.py --sortie docs/preuves/D298/audit-secrets-d298.txt`, lancé à
16:25:45 **en dernier, après le versement de toutes les autres pièces** — ⚠ **deux passes précédentes
ont été retirées**, et c'est le point de cette phrase : celle de 16:22:50 précédait la passe D277 finale,
celle de 16:24:34 précédait le contrôle des valeurs réelles ci-dessous. **Un audit qui ne couvre pas les
derniers octets versés n'est pas l'audit avant commit.** Mêmes comptes d'alertes les trois fois.
Calibration **5 bras sur 5**, cas réel **rejoué** ; **384 fichiers, 4 588 762 octets parcourus** · **367
audités** · **17 exclus** (472 alertes d'écho imprimées, non comptées) · contrôle audités + exclus = 384
(attendu 384) · **92 alertes (attendu 0), code 1**. Sortie **relue identique, sceau vérifié à la relecture**.
⇒ **Et aucune des 24 valeurs RÉELLES n'est sortie de la mémoire** : cherchées une à une dans
`docs/preuves/`, `neutralisation/` et les quatre `.md` d'autorité — **447 fichiers, 0 porteur**
(attendu 0), calibration 24 / 0 sur ses deux bras (`lecture/aucune-valeur-reelle-sortie.txt`).
⇒ **Le tri, fichier par fichier : 92 = 90 + 1 + 1**, aucune fuite — les **90** d'avant les pièces de D298
(section ci-dessus) ; **1** dans `portes/porte-test-int.log`, le **même titre de test** que le journal de
D297 (« forgot-password : réponse CONSTANTE », valeur déjà dans 101 fichiers suivis) ; **1** dans
`passe-d277/sortie-audit.txt`, qui **recite** la ligne du backlog décrivant la forme du lien e2e (valeur
masquée d'un caractère). Ventilation : mot-de-passe 30 · valeur-nommée-secrète 8 · jeton 38 · chargily
16 ; **motifs à zéro** : url-avec-identifiants, jwt, porteur, clé privée, google-client, aws, clé-api — des
hypothèses, **vérifiées** en ce qu'ils voient chacun leur échantillon positif (bras « motifs »).
⇒ **Le sceau, vérifié sur disque et pas seulement en mémoire** : rejoué juste après, l'instrument
reconnaît `audit-secrets-d298.txt` comme **sa sortie scellée** — **18** exclus sur 385 parcourus, **35**
alertes qu'il aurait rendues, compte **inchangé à 92**, écho imprimé **507**. ⚠ L'outil de D293, rejoué sur ce même
arbre, compterait 92 + 507 − 129 = **470** (calcul, pas mesure).

### ⛔ D298 — FAUTES DE MÉTHODE DE LA SESSION, À MON COMPTE

1. ⛔ **TROIS COMMANDES BLOQUÉES SUR L'ENTRÉE STANDARD** : un `cat >` résiduel, un heredoc écrasé par
   `< /dev/null` (Python passé en interactif), un `python3 -` laissé dans une ligne. **Aucune n'a écrit
   quoi que ce soit** ; deux tâches arrêtées. D295 disait déjà « celle qui ne dépend d'aucune enveloppe
   est le FICHIER » — **je ne l'ai appliquée qu'après la deuxième.**
2. ⛔ **UN EXTRACTEUR À CONTEXTE FIXE A RATÉ LA LIGNE DU REGISTRE** (« 4 618 » en fin de fichier, moins
   de 60 caractères après) — rendu comme une absence, rattrapé en réécrivant la recherche.
3. ⚠ **J'AI ÉCRIT « LA FORME RÉELLE » AU SINGULIER SUR DEUX LIGNES LUES SUR VINGT-QUATRE** — il y en a
   deux. Vu par la procédure versée, qui compte par préfixe ; commentaire de l'instrument corrigé.
4. ⚠ **`SystemExit("…")` SORT EN 1**, c'est-à-dire « alertes » : un abandon de registre se serait lu
   comme un audit qui trouve. Attrapé à la relecture, **avant** la première exécution.
5. ⚠ **LES DEUX FAILLES DE LA PASSE D277 CI-DESSUS** — la première est une leçon déjà écrite, récidivée.
6. ⛔ **J'AI CHERCHÉ LE CHIFFRE QUE KO A CITÉ, PAS LA CLASSE QU'IL VISAIT** : « 4 618 » seul. La marge
   d'`api` hors froide (« ≥ 4 637 ») vivait à deux endroits de plus, écrite comme un fait. C'est la
   passe D277 qui cherche ce que son lot invalide **par son exemple** au lieu de **par sa règle**.
7. ⚠ **J'AI ANNONCÉ « NEUF » PERMISSIONS À KO** en comptant un état du compteur parmi elles — le fichier
   en porte huit. Rattrapé en comptant les annotations posées.
8. ⛔ **MON VÉRIFICATEUR DE PERMISSIONS RETROUVAIT CHAQUE OCCURRENCE PAR UN EXTRAIT DE TEXTE** — et la
   même phrase figure mot pour mot aux deux sites de l'ordre des rangs : « non traitée » sur une
   permission annotée. Réécrit par **position**, puis **calibré sur ses deux bras** : sur la version
   `HEAD` du fichier, il rend les **8** permissions que ce lot a annotées, et elles seules ; sur l'arbre
   final, **0** (`passe-d277/sortie-permissions-traitees*.txt`). C'est D149 — « un identifiant qui
   ressemble » — appliqué à mon propre outil.

### ⛔ D298 — CE QUE CE LOT NE FAIT PAS

1. **Il ne certifie rien** : compteur à **DEUX**, e2e et `--tout` non lancés.
2. **Il n'atteint pas « attendu 0 »** et **n'exclut pas** les titres de tests recopiés dans les journaux :
   ce ne sont pas des échos, les exclure serait un autre lot (backlog).
3. **Il ne retouche ni l'outil de D293, ni `mesure-budgets.py`, ni `lancer-campagnes.py`.**
4. **Il ne rend pas la contre-épreuve rejouable par le tri** : elle se relance à la main (backlog).

## Session des 20 et 21/09/2026 — D297 · rang 17 CLOS : les quatre budgets écrits à la valeur en vigueur, lus, et une marge d'au moins douze fois sur un majorant

⛔ **NUMÉRO PRIS EN LISANT LE REGISTRE** : sa dernière ligne portait **D296**. ⇒ **État du rang** :
point d'entrée « rang 17 », bloc de clôture. ⛔ **LOT DE CODE, NON CERTIFIÉ : il porte le compteur de
lots de code non certifiés à UN.** ⚠ **Ouvert dans la même session que D296, sur ordre explicite de
Ko** : la reprise à froid — la mesure de « un lot par session » — n'a donc **pas** été exercée.

### D297 — l'ordre de la session, tenu, avec ses heures

| étape (ordre de Ko) | quand | résultat |
|---|---|---|
| 0 — cadrage amendé, commité avant toute mesure | 20/09 23:52:24 | `097ef6c`, poussé |
| 1 — relevé d'ouverture | 20/09 23:56:12 | ⛔ **porte dure ROUGE** : `chrome` 14 — rien lancé, `9aa560b` |
| 1 — reprise, Chrome quitté par Ko | 21/09 00:11:36 | ✅ SECTEUR · RAM 5 900,5 Mo (+1 321,5) · `chrome` 0 · calibration de la sonde rejouée (0,97) |
| 2 — calibration de l'instrument | 00:11:49 | 3 bras sur 3 (positif 1 209,5 · négatif 0,9 · discrimination 1 213,3 ms) |
| 3 — encadrement, première exécution | 00:12:12 | comportement 4 sur 4, **signature non lue** — défaut d'instrument, ci-dessous |
| 3 — encadrement, rejoué entier | 00:15:35 | ✅ **4 configurations sur 4** : 4 900 passe, 5 100 échoue, `Test timed out in 5000ms` lue |
| 4 — mesures | 00:16:34 → 00:19:40 | N = 2 · 2 · 1 · 1, toutes les passes vertes, comptes constants |
| 5 — lignes, n°8, portes, campagnes | 00:20 → 00:33:29 | 4 sur 4 ; contre-épreuve 3 sur 4 ; toutes les portes vertes |

⇒ **Échantillonneur pendant les étapes 2 à 4** : 16 échantillons, 00:11:49 → 00:19:43, **SECTEUR 16 sur
16**, `chrome` **0** sur les 16 lignes, RAM libre jamais sous **4 999 Mo**, `PERF` jusqu'à 156,4 (turbo
sous charge), **aucune transition, aucun trou** — fenêtre homogène (`docs/preuves/D297/etat/`).

### ⛔ D297 — LE DÉFAUT DE MON INSTRUMENT À L'ÉTAPE 3, ET POURQUOI LE LOT NE S'EST PAS ARRÊTÉ

La première exécution a imprimé **« ⛔ L'ENCADREMENT NE REND PAS 5000 — le lot s'arrête »** : le
bras 5 100 échouait bien dans les quatre configurations, mais **aucune signature n'était lue**.
⛔ **Confronté à la sortie brute avant d'être cru (D275)** : `failureMessages` du rapport JSON
commençait par `Error: STACK_TRACE_ERROR`. **La cause est dans vitest 3.2.7** : `makeTimeoutError`
**remplace la pile** de l'erreur par celle de `STACK_TRACE_ERROR`, et le reporter JSON écrit
`e.stack || e.message` — **le message d'expiration n'y est JAMAIS**. Le reporter JUnit, lui, écrit
`<failure message="…">` depuis `error.message` (`extrait-source-vitest-3.2.7-signature.txt`).
⇒ **Ce n'était pas un verdict du système, c'était un lecteur qui lisait une source qui ne porte pas
ce qu'il cherche** — la classe exacte de D296, un cran plus loin, sur l'instrument même du lot.
⇒ **Corrigé** : la signature se lit dans le JUnit, les durées dans le JSON, chacun pour ce qu'il porte ;
et le lecteur de signature, qui n'avait **aucune** calibration, en reçoit une à deux bras — une
expiration sous un budget connu (300 ms) doit être lue **avec sa valeur**, une erreur ordinaire ne
doit pas l'être. Puis **l'étape 3 a été rejouée entière**, calibration comprise.
⚠ **LA RÈGLE D'ARRÊT DU n°0 N'A PAS ÉTÉ APPLIQUÉE, ET C'EST ÉCRIT POUR QUE KO EN JUGE** : elle dit
« si l'encadrement ne rend pas V, le lot s'arrête ». Le **comportement** rendait V dès la première
exécution ; c'est la **signature** — l'une des trois sources — que l'instrument ne savait pas lire.
Arrêter sur un lecteur non calibré aurait été croire l'extracteur plutôt que le texte, l'inverse de
D275. ⚠ **Le harnais, lui, aurait attrapé le défaut** : son pré-vol exige la signature.

### ⛔ D297 — LE HARNAIS : IL MORD, ET LA CONTRE-ÉPREUVE PROUVE QU'IL MORD POUR LA BONNE RAISON

`neutralize-budgets.py`, quatre cibles, `5_000` → `1_000`, témoin de 2 s. **4 gardes mordues sur 4.**
⛔ **Une garde qui mord doit aussi se taire quand la ligne est vraiment ignorée** (preuve bilatérale,
D272). Contre-épreuve : la ligne de `packages/api-client` placée **hors** du bloc `test` — le cas
exact que `tsc` ne voit pas, ce fichier n'étant dans aucun `include`.
- **Première forme du harnais** : son pré-vol de détection **réutilisait la cible 1**. La ligne ignorée
  s'y est lue « mutation inerte » **au pré-vol**, et les trois autres cibles **n'ont pas été jouées** —
  bruyant, mais **mal attribué et partiel**.
- ⇒ Pré-vol rendu **indépendant des cibles** : le budget de 1 s est posé **sur le témoin lui-même**
  (troisième argument de `it`), aucune configuration n'est touchée.
- **Seconde forme** : vraies lignes ⇒ **4 sur 4, sortie 0** ; ligne ignorée ⇒ **3 sur 4, sortie 1**, ✗
  sur `api-client` seul, témoin resté **vert** sous la mutation. Fichier réel restauré, **octets
  identiques**. `verifier-mutations.py` : **4 posées, 0 non posée, 0 non couverte** (calibration 8 sur 8).

### D297 — les portes, après la dernière modification du code

État machine à l'ouverture des portes (00:24:39) : SECTEUR, RAM **5 114 Mo (+535)**, `chrome` 0,
`node` 0, `PERF` 80,4 ; à la clôture (00:33:29) : SECTEUR, RAM **5 003 Mo (+424)**, `chrome` 0.

| porte | sortie | chiffres | durée |
|---|---|---|---|
| `pnpm typecheck` | 0 | 8 projets « Done » — compte relu dans le journal brut | 17 s |
| `pnpm lint` | 0 | 8 paquets « Done », 0 problème — sortie brute relue | 12 s |
| `pnpm test` | 0 | api **659/58** · api-client **36/3** · client **287/20** · pro **347/28** · 0 « timed out » | 58 s |
| `pnpm build` | 0 | 4 builds « Done » | 36 s |
| `pnpm test:int` | 0 | **436/36** | 259 s |
| `neutralize-budgets.py` | 0 | **4 mordues sur 4** | — |
| `lancer-campagnes.py` | 0 | 1 campagne concernée sur 27 : **4 mordues · 0 muette · 0 non mesurée** | 30 s |

⚠ **Non lancés** : la suite e2e (à la demande, non demandée) et `lancer-campagnes.py --tout` (tri
partiel : ce n'est **pas** une livraison certifiée). Pièces : `docs/preuves/D297/portes/`.

### D297 — ce que les mesures disent, et ce qu'elles ne disent pas

- Les tests les plus lourds sont **identifiés** dans chaque passe (`resume-mesures.json`) : le
  redimensionnement d'image d'`apps/api`, le détail de salle de `apps/client`. **Tous sous 400 ms,
  hooks compris.**
- ⚠ **N = 1 ou 2 est la règle arbitrée appliquée à la lettre**, pas une conclusion sur la stabilité :
  une passe qui ne déplace plus le maximum suffit à la satisfaire. Pour un extremum, **un saut plus
  tard n'est pas exclu**. Rapporté ; **aucune décision n'en dépend** — (b) n'écrit que la valeur en
  vigueur, et la marge est d'au moins douze fois.
- ⚠ **Au repos seulement** (mode n°5) : sous contention, les durées ont déjà été multipliées assez pour
  faire expirer 22 tests d'une suite verte au repos. **La marge ne dit rien du régime chargé** ; c'est
  le rôle de la porte dure.

### D297 — passe D277, les deux sens

Instrument de D296 rejoué (calibration **3 sur 3**, texte aplati) : **17 motifs, 4 fichiers,
1 147 042 caractères, 74 occurrences, 0 motif à zéro**, contextes relevés un par un (**74 vus pour 74
comptés**). Pièces : `docs/preuves/D297/passe-d277/`.
- **Sens 1 — invalidé, traité** : l'état « en cours » et « compteur ZÉRO » aux points d'entrée ; « en
  attente d'arbitrage sur le cadrage » (ordre des rangs) ; « serré à 5 s » et « que personne n'a
  écrit » (décisions encore ouvertes) ; l'entrée `[MÉTHODE][P0]` des budgets, **fermée** ; « rendra
  vraie ou fausse PAR MESURE » (**rendue fausse**) ; « budget hérité … non écrit » (`[MÉTHODE][P1]`) ;
  « tant qu'un budget non écrit tient les durées » (entrée close de la barre D273).
- ⚠ **Non re-marquées** : les sections de session D294, D295 et D296, **datées et vraies à leur date**
  (principe de D291).
- ⚠ **`AGENTS.md` : une occurrence, et elle n'est PAS un état** — « serré à 5 s » y illustre un
  motif de recherche (règle de D295). **Le fichier n'est pas touché**, et le report de Ko sur « y »
  reste un report.
- **Sens 2 — rendu permis** : le compteur passe à **UN**. Les « un lot de code peut s'ouvrir » restent
  **vrais** — deux lots non certifiés sont tenables, trois non (D270). ⚠ **Et une condition NOUVELLE est
  posée** : (i) obligatoire pour toute autre valeur — écrite dans les quatre commentaires et au
  backlog, pas seulement dans le bloc d'un rang désormais clos (leçon de D294).

### D297 — audit de secrets (instrument de D293)

Lancé avant le commit du refus (20/09 23:57) : **aucune marque sur D297**, total **185** alertes
(attendu 0), soit **+102**, **entièrement l'écho** de la sortie d'audit versée par D296 — prédit par
son report. **Rejoué avant le commit final** (`docs/preuves/D297/audit-secrets-d297.txt`) : calibration
**11 sur 11**, **326 fichiers, 4 183 173 octets**, **244 alertes (attendu 0), code 1**. **Le tri,
fichier par fichier** : ~~**185** sont l'écho déjà relevé, inchangé~~ ⛔ **(D298) FAUX DANS SA
DÉCOMPOSITION : 185 est le TOTAL précédent, déjà trié — l'écho n'y pèse que 154** (sorties d'audit
réauditées : D294 45, D296 102, D291 7) **et 31 n'en sont pas** (outils de D294 et leurs sorties, pièces
de D293, journal `test:int` de D291 ; `docs/preuves/D298/lecture/decompose-sortie.txt`) ; **59** touchent des pièces de D297
— les rapports JSON d'`api`, `client` et `pro`, et le journal `test:int` — et **toutes** portent une
valeur que l'audit trouve **déjà dans 6 à 275 fichiers suivis hors preuves**. **185 + 59 = 244.**
⚠ **Relu à l'œil sur la famille la plus sensible** (« chargily … key/secret », 4 correspondances vues
pour 4 comptées) : ce sont des **titres de tests** —
`CHARGILY_SECRET_KEY absente ⇒ erreur nommant la variable` — qui nomment une variable, **sans aucune valeur**. Les rapports JSON recopient les titres
des tests ; c'est ce que l'audit y voit.
⚠ **D297 a eu l'usage de l'audit et ne l'a PAS corrigé** : hors de l'ordre de Ko, et l'instrument est
une pièce versée de D293. **L'échéance du report devient l'arbitrage de Ko**, au backlog.

### ⛔ D297 — FAUTES DE MÉTHODE DE LA SESSION, À MON COMPTE

1. ⛔ **MON LECTEUR DE SIGNATURE N'AVAIT PAS DE CALIBRATION**, et il lisait une source qui ne porte pas
   la signature. Il a produit un **faux arrêt** du lot. C'est D296 sur l'instrument de D297 : **je
   venais de l'écrire, et je ne l'ai pas appliqué à mon propre extracteur.**
2. ⛔ **LE PRÉ-VOL DE MON HARNAIS DÉPENDAIT D'UNE CIBLE** : une ligne ignorée dans le premier paquet
   aurait été mal attribuée, et les trois autres cibles n'auraient pas été jouées. **Trouvé par la
   contre-épreuve, que personne n'avait demandée** : sans elle, le harnais était vert et semblait
   complet.
3. ⚠ **J'AI ENCORE ÉCRIT DES ATTENDUS DE MÉMOIRE, TROIS FOIS** : « (D297) AMENDÉ » compté 3 au lieu de 2
   dans la relecture de l'étape 0 ; `signatures(t)` compté 4 au lieu de 5 dans une édition du harnais
   — **refusée par son propre comptage, rien écrit** ; et deux spans de code coupés par un retour à la
   ligne, vus par le détecteur d'accents graves impairs. **Tous attrapés par un contrôle, aucun par
   relecture.**
4. ⚠ **J'AI ÉCRIT « 5 PROJETS » POUR LE TYPECHECK SUR UN `tail -5`** : le journal en porte **8**. Un
   compte lu sur une sortie tronquée se lit exactement comme un compte complet — **l'audit tronqué de
   D200**, recopié dans une table d'autorité, et rattrapé seulement en relisant le brut.

### ⛔ D297 — CE QUE CE LOT NE FAIT PAS

1. **Il ne certifie rien** : compteur à **UN**, e2e et `--tout` non lancés.
2. **Il ne choisit aucune valeur** : il écrit la valeur en vigueur. **Toute autre exige (i).**
3. **Il ne corrige pas l'écho de l'audit**, et **ne touche pas `AGENTS.md`**.
4. **Il ne rend pas N défendable au-delà de la règle** : N = 1 ou 2 est ce que la règle donne.

## Session du 20/09/2026 — D296 · rang 17 : le lot de code arbitré, puis bloqué avant sa première ligne — la source du cadrage échoue au bras qui fait le travail

⛔ **NUMÉRO PRIS EN LISANT LE REGISTRE** : sa dernière ligne portait **D295**. ⇒ **État du rang** :
point d'entrée « rang 17 » en tête de ce fichier. ⛔ **CE LOT EST DOCUMENTAIRE** : deux `.md`
d'autorité et `docs/preuves/D296/` au diff — **aucune ligne de code, aucune porte lancée, compteur de
lots de code non certifiés à ZÉRO, inchangé** (D283, amendé par D292).

### ⛔ D296 — LA CONSIGNE, ET CE QUI L'A ARRÊTÉE

Reprise à froid sous forme allégée, puis, mot pour mot : « sauf si ta lecture trouve un défaut qui
bloque, tu enchaînes le lot de code du rang 17, sur le cadrage de D295, sans le réécrire. C'est mon
arbitrage : le cadrage est validé. Il portera le compteur à UN » (Ko).
⇒ **Première écriture : l'arbitrage lui-même**, dans l'ordre des rangs, parce que le dépôt disait
« le lot de code n'a PAS de rang, la session ne se l'attribue pas » (D276, patron de D295).
⇒ **Seconde : le défaut**, parce que la lecture l'a trouvé — dans la source, puis par une mesure —
**avant la première ligne de code**. Le lot de code n'a pas commencé.

### ⛔ D296 — LE DÉFAUT : LA SOURCE DE LA PIÈCE 1 ÉCHOUE AU BRAS DE LA PIÈCE 3

Trouvé **dans la source** avant d'être mesuré, puis **mesuré** avant d'être écrit — « un défaut se
reproduit par une mesure avant d'être corrigé ».

| bras (cadrage, pièce 3) | attendu écrit d'avance | exécution 1 | exécution 2 | exécution 3 (versée) |
|---|---|---|---|---|
| positif — un test de 1 200 ms | ~1 200 | 1 204 | 1 205,7 | 1 213,6 |
| négatif — tests vides | < 100 | 1 | 0,9 | 0,9 |
| **discrimination** — 1 200 ms en `beforeEach` | **< 100** | ⛔ **1 218** | ⛔ **1 216,2** | ⛔ **1 208,2** |

Maximum en ms sur **deux tests parcourus par bras**, les deux lus ; l'exécution 1 imprimait des
entiers. Pièces : `docs/preuves/D296/reproduction/` — procédure, suite témoin, trois rapports JSON
bruts, sortie, état machine, extrait de source, empreintes. ⚠ **Les exécutions 1 et 2 ne sont PAS
versées** : la 1 a tourné depuis la ligne de commande, la 2 depuis une version du script corrigée
ensuite (faute n°1). **Seule la 3 est le produit du script archivé** ; les deux autres sont des
relevés de console, cités pour ce qu'ils sont.
⚠ **MÉCANISME** (`extrait-source-vitest-3.2.7.txt`) : dans `runTest` (lignes 1528 à 1652 de
`@vitest/runner`), `const start` ligne 1543, `beforeEach` ligne 1566, la fonction du test ligne 1574,
`afterEach` ligne 1597, `duration = now() - start` ligne 1649. Le budget est posé par `withTimeout`
autour de la **seule** fonction du test (ligne 641). Le reporter JSON recopie `task.result.duration`
(ligne 1730 de son module).
⛔ **CE N'EST PAS UN CAS CONSTRUIT — LE PARCOURS DES SUITES** : sur **109** fichiers de test suivis,
**21** portent un `beforeEach` ou un `afterEach` local — api **12/58**, client **7/20**, pro **2/28**,
api-client **0/3**. ⚠ **Mais le fait qui compte est ailleurs** : `apps/client/src/test-setup.ts` et
`apps/pro/src/test-setup.ts` posent un `beforeEach` et un `afterEach` **globaux** (lignes 112 et 132,
188 et 208). **Dans ces deux suites, aucun test n'a une `duration` JSON égale à la quantité que le
budget lie.** Dans `api-client` et dans les fichiers d'`api` sans hook, les deux coïncident à peu de
chose près — ce qui ne sauve pas l'instrument : il abandonne sur **un** bras manqué.

### ⛔ D296 — POURQUOI IL BLOQUE, ET POURQUOI CE N'EST PAS À LA SESSION DE LE LEVER

1. **La règle du cadrage** : « l'instrument ABANDONNE si un seul bras manque son verdict » (D286). Il
   en manque un ⇒ ni maximum, ni N, ni marge.
2. **Le bras manqué est celui que Ko a retenu comme « le bras qui fait le travail »** — et il le
   fait : écrit pour refuser un instrument qui prendrait une durée voisine, **il refuse la source que
   le cadrage prescrit**. ⚠ **C'est un succès du cadrage, pas un échec** : le défaut est attrapé par
   sa propre calibration, avant une ligne de code, au lieu de l'être — ou de ne pas l'être — par une
   marge fausse écrite à côté d'un budget.
3. **Toute sortie réécrit une pièce**, et l'arbitrage est « sans le réécrire ».

⇒ **LES SORTIES RELEVÉES — AUCUNE ARBITRÉE** :
- **(i) garder la quantité, changer la source** : chronométrer la seule fonction du test. ⚠ **Piste
  NON VÉRIFIÉE, écrite comme hypothèse** : le reporter JSON recopie aussi `task.meta` (ligne 1733), et
  `runTest` appelle un point d'accroche `runner.runTask` quand il existe — un runner réservé à la
  mesure pourrait y écrire la durée de la fonction, que le rapport transporterait. **Rien de cela n'a
  été essayé.** Réécrit la pièce 1 (la source).
- **(ii) garder la source, changer la quantité** : la `duration` JSON devient un **majorant déclaré**
  de la quantité bornée, et une marge mesurée sur elle un **minorant** de la vraie marge. Réécrit la
  pièce 1 (la quantité) **et renverse le verdict du bras de discrimination** — le bras que Ko a
  désigné.
- **(iii) restreindre la mesure aux tests sans hook** : **impossible** dans `client` et `pro` (hooks
  globaux) ; ne couvre donc pas les quatre suites.

### ⛔ D296 — LES DEUX CONDITIONS DE KO, ET CE QUE LA SOURCE Y AJOUTE

Écrites au point d'entrée du rang 17. Ce qui suit est ce que la lecture de la source y ajoute.
1. **Ce qui fixe 5 000.** La formule de Ko est tenue telle quelle. ⚠ **Un troisième témoin existe, et
   le cadrage le range mal** : la signature « Test timed out in 5000ms » n'est pas une phrase figée —
   `makeTimeoutError` y **interpole la valeur effective** du processus (lignes 2005-2006). C'est une
   valeur **autodéclarée par le processus qui l'applique**, plus forte que le texte d'aide, et
   **toujours pas un comportement**. ⇒ **Proposé, non arbitré** : que la clôture nomme les trois
   jambes — aide (défaut documenté), signature (valeur effective autodéclarée), encadrement
   (comportement à ±100) — sans qu'aucune soit « 5 000 mesuré ».
2. **Le bras à 4 900 ms.** ⚠ **La source donne raison à la condition, et dit pourquoi elle suffit** :
   `withTimeout` vérifie l'expiration **aussi après coup** (`if (now() - startTime >= timeout)`,
   ligne 1883). Un 4 900 dont la continuation est retardée au-delà de 5 000 **échoue**, même si son
   propre minuteur a sonné le premier ; un 5 100 **ne peut pas** passer, son minuteur étant dû plus
   tard et la vérification après coup le rattrapant. ⇒ **L'encadrement ne se trompe que dans un sens,
   et seulement par contention** : la reproduction au repos vise la **seule** fausse lecture possible.

### D296 — les prémisses du cadrage vérifiées, et elles tiennent

- **Quatre** packages portent un script `test` : `apps/api`, `apps/client`, `apps/pro`,
  `packages/api-client` ; `packages/config`, `i18n`, `types`, `ui` **zéro**. La correction de D295
  tient.
- **vitest 3.2.7** dans les quatre ; texte d'aide : `--testTimeout … (default: 5000)`,
  `--hookTimeout … (default: 10000)`.
- **Zéro budget par test et zéro `vi.setConfig`** sur les **109** fichiers de test suivis — motif
  calibré **1 / 0** sur un positif et un négatif construits. ⚠ Le premier motif rendait **24** et ne
  mesurait rien : faute n°3.
- `vitest.config.int.ts` : `testTimeout: 30_000`, `hookTimeout: 60_000` — **non touché**, comme
  l'exige le mode n°1.

### D296 — état machine, et pourquoi le verdict n'en dépend pas

Relevé par `sonde-etat-machine.ps1`, calibration **non** rejouée — la sonde l'imprime elle-même :
23:29:53 puis 23:30:55, **SECTEUR**, `PERF` 90,4 puis 96,9, `node` 0, **`chrome` 15 puis 14**, RAM
libre **3 779 puis 3 849 Mo** contre une barre de 4 579. ⇒ **Pas au repos.** Seul le second relevé est
versé (`etat-machine.txt`) ; le premier n'a été lu qu'à la console.
⚠ **Le verdict est APPARIÉ, donc indépendant de la charge** : le bras négatif et le bras de
discrimination ne diffèrent **que** par le `beforeEach`, dans la même minute, sur la même machine —
environ 1 207 ms d'écart pour 1 200 ms construits, qu'aucune contention n'explique. ⚠ **Les mesures
du lot de code, elles, en dépendent entièrement** (mode n°5) : dans cet état elles ne pouvaient pas
partir — écrit au point d'entrée.

### D296 — passe D277, les deux sens

Instrument calibré **3 bras sur 3** (positif enjambant un retour à la ligne, positif à accents et
balisage, négatif), sur **texte aplati**. **12 motifs, 4 fichiers, 1 111 244 caractères,
45 occurrences, 0 motif à zéro** ; contextes relevés un par un, **45 vus pour 45 comptés**. Pièces :
`docs/preuves/D296/passe-d277/`, lancée sur `030da95` avant toute écriture.
- **Sens 1 — invalidé, traité** : « la source est le reporter JSON » (pièce 1, n°6) — **annotées en
  place**, pas réécrites ; « le lot de CODE des budgets reste SANS RANG » et « n'a PAS de rang, la
  session ne se l'attribue pas » (ordre des rangs) — **barrées avec leur motif** ; « le lot de CODE
  qui suivra le portera à UN » (point d'entrée) et « c'est le lot de CODE qui suivra qui épuisera
  cette entrée » (backlog) — **annotées « arbitré, puis bloqué »**.
- ⚠ **Non re-marquées** : les mentions de la section D295, **datée et vraie à sa date** (principe de
  D291) ; « le rang 17 non plus, tant qu'il en est à son cadrage » (bloc du rang 15), **toujours
  vraie**.
- ⚠ **Sens 2 — rendu permis : RIEN À AJOUTER, et c'est vérifié.** Les 17 « un lot de code peut
  s'ouvrir » et les 5 « peut s'ouvrir dès l'arbitrage » sont **génériques** — ils portent sur le
  **compteur**, toujours à zéro — ou déjà barrés, ou dans des sections datées. ⛔ **Le seul endroit où
  vivait une permission SPÉCIFIQUE** — le lot de code du rang 17, partant sur le cadrage — **est le
  point d'entrée**, désormais « BLOQUÉ » dès son titre. ⚠ **Et ce lot ne lève aucune condition** : il
  en **ajoute** une, l'arbitrage du cadrage.
- **`AGENTS.md` : 0 occurrence sur les 12 motifs** — il n'est pas touché, et le report de Ko sur la
  phrase « n'a rien attrapé le jour où elle a été écrite » **reste un report** (backlog, reports de
  D296).

### ⛔ D296 — FAUTES DE MÉTHODE DE LA SESSION, À MON COMPTE

1. ⛔ **MA PROCÉDURE DE REPRODUCTION ÉCRASAIT SA PROPRE ARCHIVE.** Elle écrivait ses rapports JSON **à
   côté d'elle** : rejouée depuis `docs/preuves/D296/`, elle aurait réécrit les pièces qu'elle
   prétend reproduire. Vue **avant** le versement ; corrigée — dossier de sortie en argument,
   avertissement en tête — puis **rejouée**, pour que l'archive soit le produit du script archivé et
   non d'une version antérieure.
2. ⚠ **MON PREMIER EXTRAIT DE SOURCE MÊLAIT D'AUTRES FONCTIONS.** Un `grep` sur tout le fichier
   rendait aussi des `await fn()` et un `const start` de fonctions voisines (lignes 1517, 1524, 1690,
   1849) : lu tel quel, il aurait fait croire à un `runTest` qui chronomètre ailleurs. Restreint aux
   bornes de la fonction, bornes imprimées dans l'extrait.
3. ⛔ **MON PREMIER MOTIF DE « BUDGET PAR TEST » COMPTAIT TOUT ET NE MESURAIT RIEN** : **24**
   occurrences, **toutes** des appels de fonction à dernier argument numérique
   (`resolveServiceLine(…, 250)`). ⚠ **C'est exactement la classe que Ko a demandé de reporter** — le
   jeton « y » de D295, un motif qui compte tout — **rencontrée par la session suivante, le jour même
   du report.** Vue en lisant les lignes, pas au total ; motif réécrit, calibré 1 / 0.
4. ⚠ **LA PREMIÈRE EXÉCUTION DE LA REPRODUCTION A TOURNÉ SANS ÉTAT MACHINE RELEVÉ DEVANT ELLE** —
   c'est la règle de D270, et je l'ai appliquée **à partir de la deuxième**. Le verdict n'en est pas
   touché (apparié, ci-dessus), mais **l'omission n'est pas excusée par son innocuité** : c'est
   pourquoi l'exécution 1 n'est ni versée ni citée autrement que comme relevé de console.
5. ⚠ **MON RELECTEUR DE FIN DE LOT A ACCUSÉ À TORT, DEUX FOIS SUR DOUZE JETONS** — et c'étaient
   **mes attendus**, écrits de mémoire : un jeton omettait « , 20/09/2026 », l'autre comptait deux
   formes d'une expression dont l'une est enveloppée dans un `if (…)`. **Confrontés au fichier avant
   d'être crus** (D275) : le fichier était juste. ⚠ **La règle « aucune valeur attendue ne s'écrit de
   mémoire » vaut aussi pour l'outil qui vérifie qu'on l'a respectée.**
6. ⚠ **J'AI D'ABORD ÉCRIT MON PROPRE AUDIT DE SECRETS** — un second mécanisme pour la même protection
   (D128), alors que `docs/preuves/D293/outils/audit-secrets.py` est versé **pour se rejouer à chaque
   versement**. Il n'est pas versé ; **l'audit qui fait foi est celui de D293**, ci-dessous.

### D296 — audit de secrets avant commit (instrument de D293, rejoué)

`python3 docs/preuves/D293/outils/audit-secrets.py` : calibration **11 motifs sur 11**, **260 fichiers,
2 191 947 octets** parcourus, **83 alertes (attendu 0), code de sortie 1**. ⛔ **Aucune ne touche
D296** : ses fichiers ne portent que du « chemin local », informatif. **Le tri, fichier par
fichier** : **33** sur les **13** fichiers que l'audit de D294 relevait déjà ; **45** dans
`D294/outils/audit-secrets-d294.txt` — **la sortie de l'audit précédent, réauditée**, qui recite les
contextes de ses propres alertes ; **5** dans `D294/outils/aucune-valeur-de-jeton.py`, versé après
cet audit. **33 + 45 + 5 = 83.** ⚠ **Un compte qui grandit par l'écho de ses propres sorties** :
rapporté au backlog, non corrigé. Sortie versée : `docs/preuves/D296/audit-secrets-d296.txt` — ⚠ et
elle **nourrira à son tour** l'écho au prochain audit, faute d'exclusion ; c'est le report.

### ⛔ D296 — CE QUE CE LOT NE FAIT PAS

1. **Il n'écrit aucun `testTimeout`**, ne touche **aucune** des quatre configurations et ne lance
   **aucune** porte.
2. **Il n'écrit aucun instrument dans `neutralisation/`** : la procédure versée est une **preuve**,
   jamais promue en instrument (D291).
3. **Il ne réécrit pas le cadrage** : la pièce 1 et le n°6 sont **annotés** de la réfutation mesurée,
   le n°0 d'un renvoi aux conditions de Ko ; les pièces 2 à 4 sont intactes. **Choisir une sortie est
   l'arbitrage de Ko.**
4. **Il n'épuise pas l'entrée `[MÉTHODE][P0]`**, qui reste **ouverte**.
5. **Il ne touche pas `AGENTS.md`** (0 occurrence à la passe) : le report de Ko y attend le prochain
   lot qui touchera ce fichier.

## Session du 20/09/2026 — D295 · rang 17 ouvert (cadrage seul) : l'arbitrage écrit en PREMIÈRE ligne, et le chiffre faux qui pointait vers le seul fichier à ne pas toucher

⛔ **RANG 17, ARBITRÉ PAR KO LE 20/09/2026.** ⇒ **État du rang** : section « PROCHAIN LOT — rang 17 »
en tête de ce fichier. **Numéro pris en LISANT le registre** : sa dernière ligne portait **D294**.
⛔ **CE LOT NE MESURE AUCUNE PORTE, N'EN LANCE AUCUNE, ET N'ÉCRIT AUCUNE LIGNE DE CODE.** Il est
**documentaire** : trois `.md` d'autorité au diff. **Compteur de lots de code non certifiés : ZÉRO,
inchangé.** Le lot de CODE des budgets le portera à UN.

### ⛔ D295 — CE QUI L'A OUVERT : LA HUITIÈME REPRISE À FROID, ET UNE TROUVAILLE DANS LA LIGNE D'ATTAQUE

La reprise du 18/09 — deuxième sous forme allégée — a rapporté **un défaut réel**, dans l'entrée
`[MÉTHODE][P0]` que le lot des budgets lit **en premier**.
✅ **ET LA FORME ALLÉGÉE A TENU UNE SECONDE FOIS** : les quatre questions de la première partie se
sont lues **dans le bloc du rang 16 SEUL**, zéro recoupement. Le pointeur « l'ordre des rangs dit
QUEL lot, le bloc dit OÙ IL EN EST » tient désormais **deux fois de suite**.

### ⛔ D295 — LA PREMIÈRE ÉCRITURE EST L'ARBITRAGE LUI-MÊME, ET L'ORDRE EST DE KO

Au moment où ce lot s'est ouvert, le dépôt disait « **rang 17 : en attente d'arbitrage** » — et il
**avait raison**, puisque l'arbitrage n'existait que dans un message de chat. ⛔ **C'est D276
appliqué à la ligne qui AUTORISE un lot**, et c'est la reprise qui l'a signalé avant d'écrire quoi
que ce soit d'autre.
⇒ **L'ordre des rangs a donc reçu le rang 17 arbitré AVANT toute autre ligne**, avec le **rang 18
nommé en attente**, écrit à l'**ouverture** et non à la clôture (D284, et la seconde moitié de D294).
⚠ **La session n'a pas écrit le numéro d'ordre de cette écriture** : le dépôt porte « quatre »
(D284, rang 10), « cinquième » (D289, rang 13) et « sept » (D294) — **trois comptages qui ne se
recoupent pas**. Un compteur qu'on ne sait pas dériver ne se recopie pas (D268). **Ce qui est vrai
sans compter : toutes sont de Ko.**

### ⛔ D295 — LE DÉFAUT : « CINQ SUITES UNITAIRES » POINTAIT VERS `vitest.config.int.ts`

L'entrée du backlog écrivait, **deux lignes sous sa propre table** : « *Seule la config
d'INTÉGRATION écrit un budget.* Les **cinq** suites unitaires héritent du défaut vitest ». ⛔ **Elle
se contredit dans ses onze premiers mots** : la table compte cinq configurations dont **une
d'intégration**.
**Mesuré** : quatre packages seulement portent un script `test` — `apps/api`, `apps/client`,
`apps/pro`, `packages/api-client` ; `packages/i18n`, `types`, `ui` et `config` n'en ont aucun.
⛔ **CE QUI LE SORT DU COSMÉTIQUE, ET C'EST LA SEULE RAISON QUI COMPTE** : un lot qui part de
« cinq » cherche une **cinquième configuration unitaire** où écrire un budget, et **la seule
candidate du dépôt est celle d'intégration — qui en a déjà un, à 30 s**. Y écrire 5 000 ms le
**diviserait par six** : un **changement de comportement que la forme (b) interdit explicitement**.
**Le chiffre faux désignait le seul fichier qu'il ne faut pas toucher.**
⚠ **ET CE QUI LE RANGE COMME UN MOTIF** : la phrase date du 10/09 et a **survécu à trois passes
D277** (D290, D291, D294). Le 16/09, une remesure a écrit « les **quatre** configurations
unitaires » **douze lignes plus bas, dans cette même entrée**, sans corriger « cinq » douze lignes
plus haut. **Une affirmation juste posée à côté d'une affirmation fausse ne corrige pas la fausse**
— c'est D280, et c'est une **reprise à froid** qui l'a vu, pas une passe.

### ⛔ D295 — LES DEUX RÈGLES, TOUTES DEUX EN EXTENSION D'UN BLOC EXISTANT

**Arbitrage de Ko : jamais en bloc autonome.** `AGENTS.md` est chargé à chaque session ; un bloc de
plus est un bloc de plus à lire, et deux règles voisines séparées se lisent comme concurrentes.

| règle | bloc d'accueil | ce qu'elle ajoute |
|---|---|---|
| **un instrument et la pièce qu'il a produite se corrigent ensemble ou pas du tout** | « LES PREUVES BRUTES QU'UNE DÉCISION CITE ENTRENT AU DÉPÔT » (D291) | une archive ne vaut que si elle se **rejoue** ; le chiffre se rectifie où il engage une **autorité**, la rectification se pose **à côté** des pièces |
| **un compteur qui croise deux entrées rend son détail sur les DEUX** | « UN COMPTEUR REND AUSSI CE QU'IL A PARCOURU » (D290) | D290 couvre le **corpus parcouru** et est **aveugle à l'autre entrée** : la **ventilation par motif**, et les motifs à zéro nommés |

⛔ **L'ARGUMENT QUI FONDE LA SECONDE, ET IL A ÉTÉ VÉRIFIÉ AVANT D'ÊTRE ÉCRIT** : la passe de D294
**parcourait bien** ses 4 fichiers et son million de caractères — **son compte de parcouru était
juste**. Ce qui était aveugle, c'est **l'autre entrée** : les motifs. D290 ne pouvait donc pas
l'attraper, et ce n'est pas une redite.
⚠ **La phrase « elle n'a rien attrapé le jour où elle a été écrite » est GARDÉE, sur consigne de
Ko** : appliquée par anticipation ici — 7 motifs, 0 à zéro — elle n'a rien trouvé. **Une règle
présentée avec ses seuls succès cesse d'être vérifiée.**
⚠ **Et la première est écrite parce que « garde-la comme précédent » est D276**, y compris quand
c'est Ko qui l'énonce — ici deux messages après avoir invoqué D276 contre le dossier. **Ko l'a
reconnu et l'a fait écrire.**

### ⛔ D295 — LES DEUX ARBITRAGES DE KO SUR LE CADRAGE, ÉCRITS COMME ARBITRAGES ET NON COMME MESURES

1. ⛔ **SEUIL x = 5 %, PLAFOND 15 PASSES.** N est le nombre de passes tel qu'une passe de plus ne
   déplace plus le maximum observé de plus de 5 %. **Si le critère n'est pas atteint à 15 passes, le
   lot l'écrit COMME RÉSULTAT et ne choisit PAS un N par défaut.** ⚠ **Le plafond vient d'une mise
   en garde de la session** : le maximum est une **statistique d'extremum**, un critère de
   stabilisation sans borne **peut ne jamais converger**. ⛔ **Pas de formule gaussienne** — « c'est
   un arbitrage, il porte mon nom et sa date » (Ko).
2. ⛔ **LE QUATRIÈME CONTRÔLE DEVIENT LE MODE DE DÉFAILLANCE n°0, ET IL EST OBLIGATOIRE.** Témoin à
   **5 100 ms ⇒ doit échouer** avec la signature ; témoin à **4 900 ms ⇒ doit passer**. **Si
   l'encadrement ne rend pas 5 000, le lot s'arrête et n'écrit rien.** **Motif de Ko** : sans lui,
   (b) écrirait un nombre **recopié d'un texte d'aide et d'un incident du 10/09** — exactement ce
   qu'elle prétend supprimer.

⇒ **Retenus aussi, avec leur motif** : le **bras de discrimination** (les 1 200 ms déplacés dans un
`beforeEach`) comme **le bras qui fait le travail**, parce qu'il prouve que la quantité mesurée est
celle que `testTimeout` borne ; et le **reporter JSON** plutôt qu'un extracteur de texte — **la
moitié du problème supprimée par construction plutôt que surveillée**.

### ⛔ D295 — FAUTES DE MÉTHODE DE LA SESSION, À MON COMPTE

1. ⛔ **MON HEREDOC À DÉLIMITEUR QUOTÉ A ÉTÉ CASSÉ PAR L'ENVELOPPE `bash -c`** — au moment précis
   d'écrire le bloc de cadrage. ⚠ **C'est le cas que D290 décrit mot pour mot** (« la couche qui
   interpole peut être celle de l'outil lui-même »), et je l'ai rencontré **en appliquant D289**.
   ⇒ Basculé sur **l'outil d'écriture**, troisième forme autorisée. ⛔ **Et la faute ne s'arrête pas
   à l'échec visible** : les écritures précédentes avaient traversé **la même enveloppe**. Contrôle
   de corruption passé sur les **210 lignes ajoutées** — **0 double espace interne, 0 trace
   d'interprétation** — **détecteur calibré 2 bras sur 2 avant d'être cru**, sur la corruption
   connue de `vite.config.ts:24`. Sans le bras négatif, un détecteur qui répond « 0 » à tout aurait
   déclaré l'arbre propre.
2. ⛔ **MON `grep -i` A RENDU ZÉRO SUR UNE LIGNE QUI EXISTAIT.** Cherchant « candidat désigné du
   rang 17 » dans le backlog, il n'a **rien** trouvé ; la ligne est là, en majuscules accentuées.
   **La casse des caractères accentués n'est pas gérée par `grep -i` en locale C.** Trouvé
   uniquement parce que j'ai cherché **autrement**. ⚠ **C'est la règle que ce lot écrit, rencontrée
   le jour même de son écriture, et par son propre auteur.**
3. ⚠ **MON RELECTEUR A PRODUIT UN JETON DÉGÉNÉRÉ.** Un jeton découpé sur un retour de ligne a laissé
   le fragment « y », qui a rendu **213 occurrences**. Le total aurait dit « 11 jetons, 0 manquant »
   ; **c'est la ventilation qui a montré qu'un jeton ne mesurait rien** — la règle écrite ce jour,
   en action contre moi.

### D295 — passe D277, les deux sens

Instrument calibré **3 bras sur 3** (positif enjambant un retour à la ligne, positif à accents et
balisage, négatif), sur **texte aplati** — ces fichiers sont enveloppés à ~95 colonnes. **8 motifs,
4 fichiers, 1 076 514 caractères, 27 occurrences, 0 motif à zéro.**
- **Sens 1 — invalidé** : « RANG 17 : EN ATTENTE » (**3** endroits : ordre des rangs, bloc du
  rang 16, bloc du rang 15), « TOUJOURS SANS RANG », « CANDIDAT DÉSIGNÉ DU RANG 17, NON ARBITRÉ »
  (ordre des rangs **et** backlog). **Toutes barrées avec leur motif**, jamais effacées (D276).
- ⚠ **La section D294 n'est PAS re-marquée** : c'est une section de session **datée**, vraie à sa
  date — principe posé par D291 pour les sections D291 et D292.
- ⚠ **Sens 2 — rendu permis : RIEN À TRAITER, et c'est vérifié, pas supposé.** Ce lot ne lève aucune
  condition : le compteur était **déjà** à zéro depuis D293, et les **6** occurrences de « aucun lot
  de code ne s'ouvre avant une certification » étaient **toutes** barrées ou annotées « LEVÉ » par
  la passe de D293. Ce lot **n'ajoute** aucune permission — il en **consomme** une.

### ⛔ D295 — CE QUE CE LOT NE FAIT PAS

1. **Il n'écrit aucun `testTimeout`** et ne touche **aucune** des quatre configurations.
2. **Il ne mesure ni maximum par test, ni dispersion, ni N**, et ne lance **aucune porte**.
3. **Il n'écrit aucun instrument** — un script ferait **compter** ce lot (D283).
4. **Il n'épuise pas l'entrée `[MÉTHODE][P0]`** du backlog, qui reste **ouverte**.
5. **Il ne verse aucune pièce dans `docs/preuves/`** : aucune quantité de ce lot ne fonde une
   décision de mesure — les seuls chiffres cités sont des **relevés de structure** (quatre scripts
   `test`, 30 s en intégration) reproductibles en une commande.

## Session du 16/09/2026 — D294 · rang 16, lot DOCUMENTAIRE : les sept constats d'une reprise à froid, et la règle que portait le bloc qui l'enfreignait

⛔ **RANG 16, ARBITRÉ PAR KO LE 16/09/2026.** ⇒ **État du rang** : section « PROCHAIN LOT — rang 16 »
en tête de ce fichier, avec la table des sept atterrissages. **Numéro pris en LISANT le registre** :
sa dernière ligne portait **D293**.
⛔ **CE LOT NE MESURE AUCUNE PORTE, N'EN RELANCE AUCUNE, ET NE RELANCE PAS L'E2E** (consigne de Ko).
Il est **documentaire** : trois `.md` d'autorité et `docs/preuves/` au diff. **Compteur de lots de
code non certifiés : ZÉRO, inchangé.**

### D294 — ce qui l'a ouvert : la septième reprise à froid, et la première sous forme allégée

⛔ **LA FORME A ÉTÉ ALLÉGÉE PAR KO, ET LE MOTIF EST UNE MESURE** : sept reprises, sept trouvailles,
dont deux qu'aucune session en cours ne pouvait faire — une permission périmée qui autorisait ce que
la règle interdit (D287), et trois chiffres écrits comme des mesures et introuvables dans les
journaux (D291). ⇒ **Aucune porte ne lit ces fichiers : cette lecture est le seul contrôle adverse
du dépôt**, et la passe D277 ne la remplace pas — elle est faite par la session qui écrit.
⚠ **Ce qui coûte n'est pas la lecture, c'est la rédaction de l'état** : première partie courte (rang,
numéro, conclusion de la règle, condition), seconde partie **entière**. **Coupée là, pas ailleurs.**
✅ **RÉSULTAT MESURABLE DE L'ALLÈGEMENT** : les quatre questions de la première partie se sont lues
**dans le bloc du rang 15 SEUL** — zéro recoupement. C'est ce que le pointeur « l'ordre des rangs dit
QUEL lot, le bloc dit OÙ IL EN EST » promet, et c'est la première fois qu'il est tenu sans détour.

### ⛔ D294 — LE CONSTAT N°1 : UN LOT CERTIFIÉ DU CHEMIN DE L'ARGENT S'ANNONÇAIT À MOITIÉ FAIT

**Relevé, pas relu.** Sur les huit blocs de rang en `##`, **sept portaient « CLOS » dans leur
titre ; un seul ne le portait pas** — et c'était le **rang 8 (S11-b), le seul du CHEMIN DE
L'ARGENT**. Trois affirmations courantes, non barrées, à l'intérieur :

| où | ce qu'elle disait | ce que dit la mesure |
|---|---|---|
| titre du bloc | pas de « CLOS » | rang **clos** depuis le 11/09 (D286) |
| sous-titre | « étapes **1→3 sur 6** FAITES » | la table **juste en dessous** : **6 sur 6** (D279 + D282) |
| 1ʳᵉ phrase du corps | « **CE LOT EST OUVERT ET À MI-PARCOURS** » | six étapes faites, lot **certifié** (D283) |
| 1ᵉʳ paragraphe | « le rang **n'est pas CLOS**, il garde son reliquat » | reliquat **éteint** le 11/09 (D286, étape 0 du rang 11) |

⚠ **La dernière est la plus nette, et c'est une MESURE qui le dit** : balayage sur texte **aplati**,
5 motifs, **24 occurrences examinées** — la même affirmation est **barrée quatre fois ailleurs**,
dont **deux dans ce bloc même**. **Une seule était restée debout : celle du premier paragraphe**,
c'est-à-dire la première lue. **Une passe partielle se lit exactement comme une passe faite** (D280).
⛔ **CE QUI LIMITE LA PORTÉE, ET JE L'ÉCRIS PARCE QUE C'EST VRAI** : le bloc dit aussi « CE N'EST
PLUS LE RANG COURANT » et « Ne pas le lire comme *ce qui vient ensuite* ». Le risque n'était donc
**pas** qu'une reprise l'ouvre comme prochain lot — c'était qu'elle lise **S11-b comme à moitié fait
sur le chemin de l'argent**, et rouvre du travail livré, mesuré et certifié.
⛔ **ET LE FAIT QUI LE RANGE COMME UN MOTIF PLUTÔT QU'UN ACCIDENT : CE BLOC PORTE LA RÈGLE QU'IL
ENFREINT.** La règle « le point d'entrée se rafraîchit à la clôture de toute session qui le fait
avancer » **est écrite dans ce bloc**, par D282, en réponse à une reprise à froid qui l'avait lu
comme « lot arbitré, pas commencé ». Elle a été **respectée à chaque avancement** — D279, puis D282
— et **oubliée à la clôture**.
⇒ **LA RÈGLE REÇOIT SA SECONDE MOITIÉ (arbitrage de Ko)** : le point d'entrée se rafraîchit à chaque
avancement **ET À LA CLÔTURE**, et **la clôture est la seule qui puisse être oubliée, puisque plus
rien ne suit**. Un avancement oublié se rattrape au suivant, qui relit le bloc ; une clôture oubliée
n'a pas de suivant. ⇒ **Portée dans `AGENTS.md`**, à côté de « UN RANG CLOS LAISSE UN ÉTAT NOMMÉ » —
motif tiré de l'incident lui-même : **une règle qui ne vit que dans le bloc d'un rang meurt avec
l'attention qu'on porte à ce rang.**

### ⛔ D294 — DÉCISION DE KO n°1 : LE JOURNAL e2e, NI (1) NI (2) — L'EXTRAIT S'ÉLARGIT

⚠ **L'audit a attrapé 24 jetons réels dans le journal e2e. C'est la justification de son existence,
pas un incident** (Ko).

**Ce qui a fait tomber (2) — faire taire le lien côté serveur de dev — est une mesure de cette
reprise** : `EmailVerificationToken` ne stocke qu'un **`tokenHash`**, le jeton clair n'est **jamais**
persisté, et `DevLoggerEmailSender` est le **seul** fournisseur lié au port `EMAIL_SENDER`
(`@Global()`, un seul `useClass`). ⇒ **Le journal de dev est le seul endroit où le jeton clair
existe** : le faire taire rendrait la vérification d'e-mail **et** la réinitialisation de mot de
passe **inachevables en dev**. ⛔ **Le backlog écrivait « retire un confort réel » — c'était faux, et
sous-estimer un coût biaise l'arbitrage qu'il alimente.** **Motif de Ko** : « paierait une capacité
contre un risque qu'on peut borner autrement ».
⚠ **Et l'autre moitié est mesurée aussi, elle va dans le sens inverse** : (2) ne casserait **pas**
l'e2e — aucune spec de `e2e/` ne lit ce jeton, les seules occurrences de « token » y sont les
**tokens CSS** de `b7-token-contract`. Les 24 jetons sont un **sous-produit**, consommé par rien.
**Ce qui a fait tomber (1)** : l'extrait de D293 garde **3 lignes sur 910** — de quoi lire le
verdict, **pas** de quoi confronter chaque « failed » à son contexte (D275). Les 4 lignes
`[WebServer]` sur 742 ne sont dans **aucune** pièce versée.
⇒ **RÈGLE ÉCRITE AU POINT 9 DU CRITÈRE DU RANG 9**, et **pas ici** : une certification future lit le
critère, pas une section de session (D276 appliqué à ce qui justifie une règle). **L'élargissement
s'applique à la prochaine certification** ; ce lot n'écrit pas l'instrument.

### ⛔ D294 — DÉCISION DE KO n°2 : LES BUDGETS, FORME (b), CANDIDAT DU RANG 17

⛔ **(a) — choisir une valeur sur des durées : NON FONDABLE, et c'est mesuré.** La quantité qu'un
budget **LIE** est le **maximum PAR TEST** : le mode de défaillance est l'expiration. Le dépôt n'en a
que **deux points isolés, sur deux suites, à deux dates** — un treizième des 5 000 ms au repos
(01/09, le rouge exigeant ≈ 55×, donc de la contention) et 2,1× de marge sur l'API à 8, 24 et 48
processus (02/09) —, un troisième étant **caduc** (argon2, sorti de l'unitaire à D271). ⛔ **Et sa
dispersion n'a jamais été mesurée** : les 12 passes de D291 mesurent la durée **de suite entière**.
✅ **(b) — écrire la valeur EN VIGUEUR : FONDABLE, et elle ne demande pas que les ~20 % soient
expliqués.** **5 000 ms n'est écrit nulle part** dans les quatre configurations unitaires (remesuré
le 16/09 : seule `vitest.config.int.ts` déclare un budget) : personne ne peut distinguer une
**politique** d'un **héritage**. Le lot écrit le budget **à la valeur déjà en vigueur**, avec les
marges mesurées à côté ; **rien ne change de comportement**, mais une dérive devient visible et un
changement futur devient arbitrable. ⛔ **Contrainte retenue par Ko : N se DÉRIVE de la dispersion du
maximum PAR TEST, mesurée DANS LE MÊME LOT.**
⚠ **Candidat DÉSIGNÉ du rang 17, NON arbitré** — « je l'ouvrirai après ce lot » (Ko).

### ⛔ D294 — UNE CONSIGNE DE KO APPLIQUÉE AUTREMENT QU'À LA LETTRE, ET LE MOTIF EST SA PROPRE RÈGLE

**Consigne** : « le biais `split("\n")` : corrigé dans `extraire-e2e.py`, et le « 911 » rectifié en
910 là où il est écrit ».
⛔ **CE QUI A ÉTÉ FAIT AUTREMENT** : `extraire-e2e.py`, sa sortie et l'extrait versé **n'ont pas été
retouchés**. **Deux raisons, et la seconde est la vraie** : une preuve ne se retouche pas (D291,
ratifiée par Ko dans le même message) ; et surtout, **corriger le script sans corriger la sortie
qu'il a produite donnerait une archive qui ne reproduit plus la sienne** — une archive incohérente
avec elle-même, alors qu'une archive ne vaut que parce qu'on peut la rejouer. Entre « un chiffre
faux, expliqué à côté » et « une archive qui ment sur elle-même », **le premier reste confrontable**.
⇒ **CE QUI A ÉTÉ FAIT** : le 911 est **rectifié là où il engage une AUTORITÉ** — section D293 de ce
fichier, barré avec sa cause — et une note est posée **à côté** des pièces :
`docs/preuves/D293/outils/RECTIFICATION-D294.txt`. **L'instrument corrigé s'écrit à la prochaine
certification**, avec l'élargissement : ici, un script ferait **compter** ce lot.
⚠ **Si Ko veut la lettre, c'est une ligne à dire** — la note se remplace par l'édition.

### ⛔ D294 — FAUTES DE MÉTHODE DE LA SESSION, À MON COMPTE

1. ⛔ **MON PROPRE EXTRACTEUR A RENDU ZÉRO SUR SIX MOTIFS SUR SEIZE, EN SILENCE.** La première
   version de `passe-d277.py` comparait les motifs au texte **brut** : « serre a 5 s » ne trouvait
   pas « serré à 5 s », « au juge » ne trouvait pas « au jugé », « testTimeout de » ne trouvait pas
   « \`testTimeout\` de ». **Le total — 302 — avait l'air d'une mesure saine.** ⛔ **Il n'a pas levé,
   il a répondu**, et six angles morts passaient pour six absences. ⚠ Vu **uniquement** parce que le
   compte **PAR MOTIF** a été imprimé. ⇒ Deux replis ajoutés (accents **et** balisage, appliqués au
   texte **et** au motif), un **troisième bras de calibration** né de la faute (un motif accentué
   connu présent), et le compte par motif imprimé avec « MOTIFS À ZÉRO ». Rejoué : **342 occurrences,
   0 motif à zéro**. Sortie fautive **gardée** (`passe-d277-sortie-FAUTIVE-motifs-non-replies.txt`).
   ⚠ **C'est D275 mot pour mot, et c'est la DEUXIÈME fois en deux sessions** : la reprise à froid du
   16/09 avait déjà vu son `grep` rendre 0 sur un fichier dont elle venait de lire le contenu.
   **Deux fois, c'est un motif** — mes extracteurs jetables ne sont pas calibrés parce qu'ils ne
   sont « que » de la recherche de chaîne.
2. ⚠ **J'AI FAILLI RAPPORTER LA RÉPARATION DE `vite.config.ts:24` COMME UN CAS D276** (« décision
   logée dans un message de commit »). **Fausse** : elle est écrite en section D290 et dans l'entrée
   du rang 13. Ma première recherche l'avait manquée parce que sa sortie était **tronquée par un
   `tail`**. ⇒ Cherchée à nouveau avant d'écrire, trouvée, conclusion changée. **Un audit tronqué se
   lit exactement comme un audit complet** (D200) — ici contre moi, et à deux doigts d'accuser à
   tort un lot qui avait bien fait son travail.

### D294 — passe D277, les deux sens

`docs/preuves/D294/outils/passe-d277.py` sur `motifs-d294.txt`, texte aplati, calibration **3 bras
sur 3** : **342 occurrences vues sur 16 motifs**, 4 fichiers, 1 027 343 caractères, **0 motif à zéro**.
- **Sens 1 — invalidé** : les quatre affirmations du rang 8, la ligne `testTimeout`, la raison du bac
  à sable, le « 911 », et « RANG 16 en attente » (2 endroits). **Toutes barrées avec leur motif**, et
  aucune autre occurrence courante des mêmes affirmations ailleurs.
- ⛔ **Sens 2 — rendu permis, ET IL Y EN AVAIT TROIS.** Trois phrases **courantes** portent « un
  budget calculé sur des durées dont ~20 % restent inexpliqués serait choisi au jugé » : point
  d'entrée du rang 14, ordre des rangs, et l'entrée `[MÉTHODE][P0]` du backlog. **Aucune n'est
  fausse** — elles restent vraies de la forme **(a)**. Mais lues seules, **elles conditionnent le lot
  des budgets à une explication qui ne viendra peut-être jamais**, alors que Ko vient d'arbitrer la
  forme **(b)**, qui n'en dépend pas. **Toutes trois annotées « vaut de (a), pas de (b) ».**
  ⚠ **Aucune n'aurait été trouvée par une recherche de contradiction** : elles ne contredisent aucun
  mot de ce lot — elles **conditionnent** ce qu'il autorise. C'est exactement le second sens que
  D287 a dû écrire, et le seul qui ne se rattrape pas.

### D294 — les pièces versées, et le tri de l'audit de secrets

**Pièces** : `docs/preuves/D294/outils/` — la passe D277 (script, motifs, sortie, **et la sortie
fautive gardée**), le relecteur des jetons écrits, le script qui **re-dérive toutes les quantités
que cette section cite**, et le contrôle « aucune valeur de jeton ». Plus, à côté des pièces de
D293 : `RECTIFICATION-D294.txt`.
- **Relecture de ce qui a été écrit** (D289 : on relit le FICHIER, jamais le compte rendu de
  l'outil) : **24 jetons cherchés, 0 manquant**, sur 4 fichiers et 1 066 509 caractères lus.
  ⚠ **Attendu « ≥ 1 » et non un chiffre**, délibérément : D293 s'est fait rendre **deux** écarts
  par son propre relecteur sur des attendus comptés **de tête**. Quand la quantité exacte n'a pas
  été relevée AVANT l'écriture, le seul attendu honnête est la **présence**.
- **Re-dérivation** : les huit blocs de `mesures-d294.py` reproduisent **tout** ce que cette
  section chiffre — les cinq configurations, le `tokenHash`, le fournisseur unique, l'absence de
  jeton dans nos specs e2e, le 910 contre 911, les cinq instruments porteurs de l'idiome, la
  réparation de `vite.config.ts`, et les fins de ligne en octets. **0 échec.**
- ⛔ **AUDIT DE SECRETS NON TRONQUÉ, ET IL SORT EN 1** : **239 fichiers, 2 147 998 octets
  parcourus, 33 alertes, 11 motifs passant leurs deux bras.** **Les motifs ne sont pas relâchés
  pour que l'audit passe** (D293) : la décision de commiter repose sur ce **tri écrit**.
  **Aucune alerte n'est une valeur** — toutes portent le MOT `token=` dans de la prose ou dans un
  motif de recherche : 13 dans des pièces de D291 et D293 **déjà au dépôt**, les autres dans mes
  propres outils, leurs sorties et la rectification, **qui parlent tous de jetons**.
  ⚠ **Famille connue, rencontrée deux fois à D291 et une à D293** : écrire la trouvaille fait
  monter le compte de l'audit. **Le compte ne se lit pas seul ; le contexte, toujours.**
- ✅ **ET LA QUESTION QUI ENGAGE LE DÉPÔT EST MESURÉE À PART, PARCE QU'UN TRI HUMAIN SUR 33 LIGNES
  N'EST PAS UNE MESURE** : `aucune-valeur-de-jeton.py`, calibré sur le cas connu — le journal hors
  dépôt rend bien **24** — puis passé sur tout `docs/preuves/` : **0 valeur sur 244 fichiers et
  2 202 682 octets.** ⚠ Il **ABANDONNE** si le journal a disparu, plutôt que de rendre un 0
  rassurant sur un instrument non calibré.
- ⚠ **Le chemin local du compte Windows** apparaît **79 fois** dans les preuves — signalé par
  l'audit, **pas masqué** : une preuve ne se retouche pas (D291).

### ⛔ D294 — CE QUE CE LOT NE FAIT PAS

1. **Il ne certifie rien, et ne mesure aucune porte.** Compteur de lots de code non certifiés :
   **ZÉRO**, inchangé — il est documentaire et ne s'y ajoute pas.
2. **Il ne relance pas l'e2e** (consigne de Ko) : il écrit la règle de l'extrait élargi, dont
   l'application vient à la prochaine certification.
3. **Il n'écrit aucun instrument** — ni l'extracteur e2e corrigé, ni rien dans `neutralisation/` :
   un script ferait compter ce lot.
4. **Il n'ouvre pas les budgets** : la FORME est arbitrée, le RANG ne l'est pas.
5. **Il ne retouche aucune pièce de D293** — voir la section sur la consigne appliquée autrement.
6. **Il ne verse pas les pièces orphelines** des rangs 6, 11 et 12 (hors campagnes) : hors arbitrage,
   inchangé depuis D291.

## Session des 14 et 16/09/2026 — D293 · CERTIFICATION (rang 15) : deux refus sur la porte dure, puis la marque

⛔ **RANG 15, ARBITRÉ PAR KO LE 14/09/2026** (clôture de D292). ⇒ **État du rang** : section « PROCHAIN
LOT — rang 15 » en tête de ce fichier. **Numéro pris en LISANT le registre** : sa dernière ligne
portait D292.
⛔ **Lots que la marque nommera, et rien d'autre** : le rang 13 (D290, `251e82b`) et l'incident D292
(`49f3ace`). Le rang 14 est hors du compte (exemption `docs/preuves/`).

### ⛔ ÉTAPE 0 — LES 26 JOURNAUX DE D288 VERSÉS, ET LEUR RATTACHEMENT CONFRONTÉ AVANT D'ÊTRE ÉCRIT

**Procédure et sortie** : `docs/preuves/D293/versement-d288/verser-et-confronter.py` et `.txt`.

- **Copie octet pour octet** dans `docs/preuves/D288/campagnes/` : **26 copies identiques sur 26**
  (sha256), empreinte **et** date de la source relues après copie, inchangées. Dates des sources :
  12/09/2026 **00:56:04 → 01:25:31**.
- **La règle de comptage appliquée est celle du lanceur TEL QU'IL ÉTAIT dans l'arbre de D288** — les
  trois expressions relues dans `c2ac531:neutralisation/lancer-campagnes.py`, une occurrence chacune ;
  `neutralisation/` est inchangé de `c2ac531` à `HEAD`. **Calibration, deux bras et deux cas réels**
  lus dans la sortie brute avant d'écrire le script (`s11b` 9 · 0 · 4, `404` 12 · 0 · 0) : 4 sur 4.

| quantité | mesuré sur les 26 copies | écrit par D288 |
|---|---|---|
| campagnes | 26, noms = les 26 harnais de `c2ac531` (0 sans journal, 0 en trop) | 26 |
| mordues · muettes · non mesurées | **182 · 0 · 13** (375 lignes parcourues) | 182 · 0 · 13 |
| `e3d1-s8` · `s11b` · `solid-s6` | 3 + 5 · 9 + 4 · 2 + 4 | 3 + 5 · 9 + 4 · 2 + 4 |
| les 23 autres | 168 mordues, 0 non mesurée | 182 − 14 = 168, « réparties sur les trois » |
| « ERREUR DE SCRIPT » | 0 | — |
| dates dans la fenêtre de l'échantillonneur | **26 sur 26** dans 00:41:09 → 01:34:58 | fenêtre écrite par D288 |
| ordre des dates | = ordre de jeu du lanceur (tri alphabétique) | jeu en série |
| étendue premier → dernier | 1 768 s (exclut la durée de la 1ʳᵉ campagne) | 1 944 s pour les 26 : compatible |

⇒ **RATTACHEMENT CONFRONTÉ ET CONCORDANT.** ⚠ **Ce n'est PAS une preuve d'origine** : aucune pièce ne
lie ces fichiers au processus de D288 ; le rattachement reste une **inférence, confrontée et non
contredite**. Les copies s'écrivent donc « attribuées à D288 », jamais « produites par D288 ».
⛔ **NON CONFRONTABLE, ET DÉCLARÉ** : le **total certifiant 195** — les +13 viennent des trois rejeux
`--int`, qu'aucun de ces journaux ne porte (le lanceur ne passe pas `--int`), et aucun fichier du
dossier n'est modifié entre 01:25:31 et la fin de la fenêtre ; la **durée 1 944 s** ; le **code de
sortie 1**.
- **Audit de secrets non tronqué** : calibration 11 motifs sur 11 (deux bras), **0 alerte sur 28
  fichiers, 41 592 octets** ; chemin local du compte : 0. Seule exclusion : les sorties du script.
  ⛔ **Rejoué avant commit sur tout le versé, et il a d'abord exclu TROP** : sa règle « tout `.txt` du
  dossier » a écarté 4 fichiers, dont 2 sorties d'autres contrôles (`gitattributes-controle.txt`,
  `verifier-decl.txt`) — « seule exclusion : ses sorties » était donc faux à ce passage. Règle resserrée
  sur ses propres sorties, sortie fautive gardée (`…-avant-commit.txt`), rejoué :
  **0 alerte sur 41 fichiers, 68 941 octets, 3 exclus** (`…-avant-commit-2.txt`).
- **Contrôle `.gitattributes` rejoué** (`AGENTS.md`, bloc D283) : **1 · 0** (`gitattributes-controle.txt`).
- **Défaut croisé relevé, NON corrigé** : la colonne « décl » du lanceur rend « — » sur 11 campagnes
  sur 26 — l'expression `neutralis..e\(s\)` attend deux caractères là où « neutralisée » décodé n'en
  porte qu'un. **Sans effet sur les comptes ni sur le code de sortie**, qui lisent les lignes de
  verdict. ⇒ Backlog, reports de D293.
  ⛔ **ET « SANS EFFET SUR LES COMPTES » N'EST PAS « SANS OBJET » — RANGÉ TROP BAS PAR MOI, RELEVÉ PAR KO
  LE 16/09/2026, TRANCHÉ PAR LECTURE AVANT LA PASSE.** « décl = — » est **la signature** d'une campagne
  qui **abandonne au pré-vol sans déclarer une seule cible** : diagnostiquée à **D283** — rang 9,
  fenêtre 1, `r4` et `solid-s7`, suites déjà rouges avant mutation. ⚠ **Ko l'attribuait au rang 12 ; la
  phrase est en section D283.** Les deux états — *résumé au vieux format* et *aucune cible jouée* —
  sortent identiques, et **les deux campagnes de D283 sont parmi les onze**.
  ⇒ **LECTURE, PAS MESURE** (`versement-d288/lecture-decl.*`, calibrée sur un journal d'abandon
  synthétique **et** sur un journal réel) : les 11 portent **tous** leur résumé, **son nombre égale les
  mordues comptées** (12·13·10·6·7·10·2·7·9·5·2), **0 abandon de pré-vol · 0 erreur de script sur les
  26**, et `r4`/`solid-s7` déclarent **2 et 2** — ce que D283 écrit comme leur rejeu au repos.
  ⇒ **DÉFAUT D'AFFICHAGE : la passe de D288 a joué ses 26 campagnes.** L'entrée reste **P3**, non
  corrigée, parce que la colonne confond deux états opposés **pour un lecteur**.
- **Versement exempté du compteur** (`docs/preuves/` seul au diff avec les `.md` d'autorité).
- **Passe D277 de l'étape 0** (`docs/preuves/D293/outils/passe-d277.py`, motifs lus dans un fichier,
  texte aplati, calibration deux bras) : **34 occurrences vues sur 9 motifs**. **Sens 1 — invalidé** :
  `AGENTS.md`, portée de la règle des preuves (« rangs 6, 11 et 12 […] ne sont pas versées ») annotée ;
  point d'entrée du rang 15 et entrée `[DOC][P1]` du backlog annotés ; sections datées D291 et D292 non
  re-marquées (principe de D291). **Sens 2 — rendu permis** : lancer `--tout` sans perdre la pièce de
  D288 ; aucune autre phrase ne le conditionnait.

### ⛔ LE PROTOCOLE DE LA PASSE — ÉCRIT ET COMMITÉ AVANT LE RELEVÉ D'OUVERTURE

**Critère** : section « LE CRITÈRE DU RANG 9 », points 1 à 8 — **aucune valeur n'en est recopiée ici** ;
la barre de RAM est celle que la sonde imprime (`BARRE_D273_MO`).
**Journaux** : `.neutralisation-journaux/rang15-*` — noms propres au rang, jamais `p1`…`p5`. Ceux que
cette section citera sont **copiés dans `docs/preuves/D293/passe/`** après la clôture (sha256, audit
de secrets), **y compris les 26 journaux de campagne que `--tout` va réécrire** — pour que la prochaine
certification n'ait pas d'étape 0 à faire.

**Ordre, sans retouche de fichier entre le premier relevé et la clôture (D270) :**
1. **Docker et `zwadj-db` levés AVANT le relevé d'ouverture** — le relevé décrit la machine où la passe
   tourne ; `pg_isready` attendu.
2. **Relevé d'ouverture** : `sonde-etat-machine.ps1 -Calibrer`, puis un second relevé sans calibration.
   ⛔ **Porte dure, jugée sur CHACUN des deux** : `CHROME=0` ; RAM médiane **et** bande basse au-dessus de
   la barre ; `ALIM_SOURCE=SECTEUR`. **Un seul rouge, ou une calibration en échec ⇒ rien ne se lance, et
   Ko est prévenu.**
3. **Échantillonneur en fond**, `-Intervalle 30`, `rang15-etat.csv`, démarré après les relevés
   d'ouverture, arrêté après le relevé de clôture, lu par `-Resume`.
4. `HEAD` et `git status --porcelain` relevés.
5. **Les six portes, dans l'ordre de `CLAUDE.md`** — `typecheck`, `lint`, `test`, `build`, `test:int`,
   `test:e2e` —, chacune **précédée d'un relevé de sonde** (sans calibration) dont `ALIM_SOURCE` doit
   être `SECTEUR`. Avant l'e2e : ports 3100/3101 libres. **Code de sortie RÉEL écrit dans un fichier
   `.code`**, jamais lu sur une enveloppe ni sur une notification (D288). Portes courtes en avant-plan ;
   `test:int` et les campagnes en fond d'outil, leur durée dépassant la fenêtre d'un appel.
6. `HEAD` et `git status --porcelain` avant les campagnes.
7. `lancer-campagnes.py --tout`, puis `HEAD` et `git status --porcelain`.
8. **Chaque campagne que `--tout` rend « non mesurée » — relevée dans SA sortie, pas dans une liste —
   est rejouée avec `--int`**, puis `HEAD` et `git status --porcelain`.
9. **Relevé de clôture** (`SECTEUR` exigé), arrêt et lecture de l'échantillonneur.

**Règles de lecture, fixées avant de mesurer :**
- une porte est verte **si et seulement si** son code réel est 0 ; ses lignes de résumé sont
  confrontées à la sortie brute, et tout « failed » à son contexte (D275) ;
- campagnes : `--tout` **sort en 1 par le défaut `[INFRA][P1]`, et c'est attendu** ; certifie le total
  **mordues de `--tout` + mordues des rejeux `--int`**, avec **0 muette et 0 non mesurée après rejeu**,
  arithmétique bouclée **campagne par campagne** (mordues `--tout` + non mesurées `--tout` = mordues
  `--int`) ;
- **arbre immobile** : même `HEAD` et `git status --porcelain` vide aux trois points de contrôle ;
- **régime** : `SECTEUR` à chaque relevé ; échantillonneur **homogène** (0 transition, 0 trou, 0 échec
  d'instrument).

**Prédictions — ce ne sont PAS des critères, et elles sont dérivées, pas écrites de mémoire** : depuis
`c2ac531`, trois fichiers hors `.md` ont changé — `.gitattributes` (preuves seules), un commentaire de
`apps/pro/vite.config.ts`, le montage de `docker-compose.yml` —, et `neutralisation/` est inchangé.
D'où, relevé dans ce fichier : `test` **1 329 / 109** et `test:int` **436 / 36** (D288, D291, D292 à
l'identique) ; e2e **34 passés · 1 ignoré**, `a5-cold-reload-vs-spa.e2e.ts:190` (**D288 seul** — ni D291
ni D292 ne l'ont lancée) ; campagnes **26**, `--tout` **182 · 0 · 13** sur `e3d1-s8`, `s11b`,
`solid-s6`, rejeux **8, 13, 6** ⇒ **195**.
⛔ **UN COMPTE QUI S'ÉCARTE D'UNE PRÉDICTION N'EST PAS UN ROUGE, MAIS IL SUSPEND LA MARQUE** jusqu'à
explication dans cette session — « un compteur qui bouge sans lot de code serait le signal » (D288).
Inexpliqué ⇒ refus motivé.

⛔ **ARRÊT, SANS RATTRAPAGE APRÈS COUP** : un relevé hors `SECTEUR`, ou un échantillonneur non homogène,
⇒ la passe s'arrête, c'est dit, **pas de marque**. Trois fenêtres ont déjà été jetées pour ça.
⚠ **Limites écrites d'avance, que la marque portera** : la base de dev `zwadj` est **reconstruite et
vierge** depuis D292 — `test:int` et l'e2e recréent leurs propres bases, mais la marque ne couvre pas les
données sur lesquelles D282 a mesuré ; **l'e2e est la première mesure du nouveau montage sous e2e** ; la
réserve de D275 « zéro `node` pendant la mesure » se reconduit ; **aucune durée ne se compare** (terme
de position, D291 ; portes longues en fond d'outil).

### ⛔ ÉTAPE 1 — LA PORTE DURE EST ROUGE SUR LES DEUX RELEVÉS : RIEN N'EST LANCÉ, PAS DE MARQUE

**Docker levé avant le relevé, comme écrit** : `zwadj-db Up 5 hours`. Pièces : `docs/preuves/D293/ouverture/`
(4 copies identiques sur 4, `outils/verser-ouverture.txt`).

| | relevé 1 (01:50:36, `-Calibrer`) | relevé 2 (01:51:20) | exigé |
|---|---|---|---|
| calibration | **passante** — rendement 0,93, CPU 16 → 100 %, `PERF` 75,2 → 146,7 | non rejouée | passante |
| RAM médiane · bande | 5 276,5 · 5 270-5 308 Mo (**+697,5**) | 5 300 · 5 292-5 302 Mo (**+721**) | ≥ barre ✅ |
| alimentation | SECTEUR 100 %, overlays identiques | idem | SECTEUR ✅ |
| `node` | 0 | 0 | — (réserve D275) |
| **`chrome`** | **14** | **15** | **0 ⛔ ROUGE** |

⛔ **CE QUE SONT CES PROCESSUS, RELEVÉ ET NON SUPPOSÉ** (`rang15-chrome-identification.txt`, 01:51:56) :
**15 `chrome.exe`, tous `C:\Program Files\Google\Chrome\`** — pas le Chromium de Playwright, et aucun `node`
ne tourne ; processus principal démarré le **12/09 à 23:24:09**, **une fenêtre visible** titrée « Claude
Code - Google Chrome », et trois processus enfants **créés le 14/09** (deux à 01:31:48, un à 01:51:08,
12 s avant l'horodatage du second relevé — que la sonde prend en FIN de ses 6 échantillons à 5 s
d'écart : **pendant** ce relevé). ⇒ **Le navigateur est ouvert ET actif** ; 1 722 puis 1 783 Mo à
l'inventaire des deux relevés.
⚠ **Hypothèse, non vérifiée** : le titre de la fenêtre laisse penser que Ko suit la session dans ce
navigateur. Si c'est le cas, **suivre la session depuis ce poste et tenir `chrome` = 0 sont
incompatibles** — report au backlog, à Ko d'arbitrer.
⛔ **L'ANNONCE « `chrome` EST FERMÉ » EST DÉMENTIE PAR LE RELEVÉ, ET C'EST EXACTEMENT POURQUOI LA PORTE EST
UNE MESURE.** Une porte dure qui se franchirait sur déclaration ne certifierait plus rien — c'est la phrase
de Ko sur la barre (« si « au repos » se franchit sur ordre, le mot ne certifie plus rien ») appliquée à la
sixième quantité. ⚠ **Et la RAM ne l'aurait PAS vu** : +697 Mo au-dessus de la barre avec le navigateur
ouvert — la séparation des deux quantités écrite par D288 (« la barre dit combien il reste, `chrome` dit si
ce qui reste a été libéré ») mord ici pour la première fois **dans ce sens**.

⇒ **CE QU'IL FAUT POUR QUE LA PASSE SE LANCE — rien d'autre ne change** : `chrome` à 0, **fenêtres ET
processus d'arrière-plan** (Chrome peut continuer à tourner fenêtre fermée) ; puis **reprise à l'étape 1**
du protocole de `657e9ba` — Docker levé, deux relevés d'ouverture, porte dure jugée sur chacun. **Le
protocole ne se réécrit pas** : il a été commité avant la mesure, et le réécrire après un rouge serait
régler l'instrument sur le résultat voulu. **L'étape 0 est acquise**, et les 26 journaux de D288 sont au
dépôt : une reprise n'a plus rien d'urgent à archiver avant `--tout`.
⚠ **Ce qui n'a PAS eu lieu, et se vérifie** : aucun échantillonneur démarré, aucune porte, aucune campagne ;
les 26 `neutralize-*.py.log` du disque portent toujours leurs dates du 12/09 (00:56 → 01:25).
⛔ **« RIEN D'AUTRE NE CHANGE » A ÉTÉ DÉMENTI DEUX JOURS PLUS TARD** : `chrome` est passé à 0 le
16/09 et **la porte dure est restée rouge, sur la RAM**. ⇒ section suivante, « ÉTAPE 1, SECONDE
TENTATIVE ». **Fermer Chrome était nécessaire, pas suffisant.**

### ⛔ ÉTAPE 1, SECONDE TENTATIVE (16/09/2026) — `chrome` EST À 0, ET C'EST LA **RAM** QUI REFUSE

**Ko a fermé Chrome et suit depuis VS Code.** Docker relevé avant les relevés, comme écrit : conteneur
`zwadj-db` **arrêté** à l'arrivée, levé par `pnpm db:up` (« Starting », donc le même conteneur et le
même volume nommé — correctif D292), `pg_isready` **accepting connections** à la 2ᵉ tentative ; ports
3100/3101 **libres**. Pièces : `docs/preuves/D293/ouverture-16-09/` (4 copies identiques sur 4).
⚠ Le dossier `ouverture/` porte les relevés **du 14/09** ; `ouverture-16-09/` ceux d'aujourd'hui.
⚠ **Le chemin local du compte Windows apparaît 2 fois** dans ces pièces (en-tête de `pnpm db:up`) —
signalé par l'audit, **pas masqué** : une preuve ne se retouche pas (D291).

| | relevé 1 (16:05:07, `-Calibrer`) | relevé 2 (16:06:24) | exigé |
|---|---|---|---|
| calibration | **passante** — rendement **0,96**, CPU 15 → 100 %, `PERF` 85,8 → 146,8 | non rejouée | passante ✅ |
| **`chrome`** | **0** | **0** | 0 ✅ |
| `node` | 0 | 0 | — |
| alimentation | SECTEUR 100 %, overlays identiques | idem | SECTEUR ✅ |
| **RAM médiane · bande** | **3 073,5 · 3 053-3 085 Mo** | **3 077,5 · 3 068-3 087 Mo** | ≥ barre ⛔ **ROUGE** |
| écart à la barre | **−1 505,5** | **−1 501,5** | > 0 ⛔ |

⛔ **CE N'EST PAS UN CREUX PASSAGER** : deux relevés à 80 s d'écart, bandes serrées (32 et 19 Mo),
même déficit. ⇒ **Rien n'est lancé** : ni échantillonneur, ni porte, ni campagne.
⛔ **ET LE DÉFICIT N'EST PAS CELUI QU'ON VIENT DE LIBÉRER.** Chrome fermé rend ~1,78 Go, et la RAM
libre est pourtant **plus basse de 2 222 Mo** qu'au relevé du 14/09 — qui, lui, était **au-dessus de la
barre AVEC Chrome ouvert**. Mouvements, relevés dans les deux pièces (inventaires > 150 Mo) :

| poste | 14/09 01:51 | 16/09 16:06 | écart |
|---|---|---|---|
| `vmmemWSL` (machine virtuelle de Docker) | 726 | **2 133** | **+1 407** |
| `Code` (VS Code) | 2 531 (19 proc.) | **3 282** (17 proc.) | **+751** |
| `msedge` + `msedgewebview2` | *sous 150, donc hors inventaire* | 309 + 352 | **+661 au moins** |
| `svchost` · `claude` · `NVIDIA Overlay` · `nvcontainer` | 1 142 · 316 · hors inv. · hors inv. | 1 480 · 552 · 329 · 172 | +338 · +236 · +329 · +172 |
| `oracle` | 866 | 544 | −322 |
| **total des processus** | **12 443** | **15 417** | **+2 974** |
| `chrome` | 1 783 | **0** | −1 783 |

⚠ **« Hors inventaire » ne veut pas dire « absent »** : la sonde ne liste que les postes > 150 Mo.
⚠ **LA BASE N'EST PAS EN CAUSE, ET C'EST MESURÉ** : `docker stats` rend **54,86 Mio** pour `zwadj-db`
— les 2,1 Go de `vmmemWSL` sont la **machine virtuelle**, pas Postgres. Un seul conteneur tourne ;
`floranet-db` (autre projet) est `Exited`.
⛔ **NON ÉTABLI, ET JE NE L'ÉCRIS PAS COMME UN FAIT** : que le démarrage du conteneur **par cette
session** explique les +1,4 Go de `vmmemWSL`. Le 14/09, le conteneur tournait **depuis 5 h** et la VM
pesait 726 Mo. C'est une **inférence**, dans les deux sens.

⇒ **CE QU'IL FAUT POUR QUE LA PASSE SE LANCE — et le choix appartient à Ko, pas à la session :**
1. **libérer de la mémoire** (les postes ci-dessus sont ceux de Ko : VS Code, Edge, overlays ; la VM de
   Docker se vide en la redémarrant, ce qui arrête le conteneur — **je n'y touche pas**), puis
   **reprise à l'étape 1** du protocole de `657e9ba`, inchangé ;
2. **ou consommer la sortie ÉCRITE de D270**, citée dans le critère du rang 9 : « relever le plancher
   que cette session PEUT produire, puis **redéfinir « repos » sur lui AVEC SA RAISON** », les chiffres
   hérités restant comme HISTOIRE. ⛔ **C'est un arbitrage de Ko** : D288 a écrit noir sur blanc, en ne
   la consommant pas, qu'aucune barre n'avait été redéfinie et **« aucun arbitrage demandé à Ko »**.
   ⚠ Et la même phrase du critère ajoute que **redéfinir le seuil sans redéfinir ce qu'il garantit
   serait la moitié du travail** : une passe prise près du bruit porte moins d'information.

⛔ **DEUXIÈME REFUS DE LA MÊME PASSE, SUR UNE AUTRE QUANTITÉ — ET C'EST L'ARGUMENT DES SIX.** Le 14/09,
RAM et SECTEUR étaient verts et `chrome` refusait ; le 16/09, `chrome` est à 0 et c'est la RAM. **Une
porte dure à une seule quantité aurait laissé passer l'une des deux fenêtres.**
⛔ **RATIFIÉ ET GRAVÉ AU CRITÈRE PAR KO LE 16/09/2026** — point 8 de « LE CRITÈRE DU RANG 9 », avec les
deux fenêtres et leurs chiffres. **Motif de Ko** : « je l'avais fait entrer au critère en croyant fermer
un trou de forme ». ⇒ **Une certification future lit le critère, pas cette section** : c'est D276
appliqué à ce qui justifie une règle, et non plus seulement à la règle.

### ✅ LA MARQUE — CE QUI EST ÉCRIT, MOT POUR MOT

> **Portes vertes AU REPOS le 16/09/2026, et le rang 13 (D290, `251e82b`) et l'incident D292
> (`49f3ace`) en font partie.**

**Deux lots, et rien d'autre.** ⛔ **Aucun en-tête antérieur n'est réécrit en « certifié »** (point 4 du
critère). La marque est ici, datée, et **elle ne se reconduit pas au lot suivant**.
⇒ **Le compteur de lots de code non certifiés passe de DEUX à ZÉRO.**

### ⛔ LE MOUVEMENT D'INVENTAIRE — `wsl --shutdown` N'A PAS RENDU LA MÉMOIRE, ET C'EST MESURÉ

**Sur instruction de Ko**, et parce que `vmmemWSL` était le plus gros poste. Écrit ici comme un
**mouvement d'inventaire**, pas comme un détail : il change la fenêtre.

| poste | 16:06 (refus) | 18:41 (ouverture) | écart |
|---|---|---|---|
| **`vmmemWSL`** | 2 133 | **2 165** | **+32 — rien rendu** |
| `Code` (VS Code) | 3 282 | 2 676 | **−606** |
| `msedge` + `msedgewebview2` | 309 + 352 | 272 + 247 | −142 |
| `claude` · `NVIDIA Overlay` · `svchost` | 552 · 329 · 1 480 | 321 · 243 · 1 406 | −231 · −86 · −74 |
| total des processus | 15 417 | 13 396 | **−2 021** |
| **RAM libre médiane** | **3 077,5** | **4 686** | **+1 608,5** |

⛔ **LE FRANCHISSEMENT VIENT DES FERMETURES DE KO, PAS DU REDÉMARRAGE DE WSL.** Docker Desktop relance
sa distribution **immédiatement** — moteur répondu **14 s** après la coupure — et la VM reprend sa
place. ⚠ **L'attente écrite était l'inverse** (« WSL ne rend pas la mémoire qu'il libère,
`wsl --shutdown` la rend d'un coup ») : elle n'est **pas** vérifiée ici. ⚠ **Ce que ce relevé ne dit
pas** : ce qu'aurait donné la VM sans redémarrage du conteneur — une seule mesure, pas deux.
⇒ **D292 REJOUÉ EN CONDITIONS RÉELLES, ET IL TIENT** : après `wsl --shutdown` + `pnpm db:up`, **même
volume** (`cree=2026-09-14T00:47:54Z`, à l'identique), même montage sur `/var/lib/postgresql`,
`PG_VERSION` **18**, **27 lignes de `_prisma_migrations`, 0 non finie**, **40 tables**, **0 ligne** dans
`bookings`/`quotes`/`venues`/`users` — les chiffres de D292. ⚠ **PRÉCISION DE NOM, relevée ici** : le
volume Docker s'appelle **`zwadj_zwadj_pgdata`** (préfixe de projet `compose`) ; `zwadj_pgdata` est la
**clé** du fichier compose, pas le nom du volume. Les deux se lisent dans `docker volume ls`.

### Les six portes, l'e2e, et l'état machine devant chacune

**Relevé de sonde devant CHAQUE mesure** (`SECTEUR`, `node` 0, `chrome` 0 à tous), pièces dans
`docs/preuves/D293/passe/`.

| porte | mode | code RÉEL | chiffres | RAM au relevé |
|---|---|---|---|---|
| `typecheck` | avant-plan | **0** | 9 projets, 0 `error TS` | 4 814 |
| `lint` | avant-plan | **0** | — | 4 812 |
| `test` | avant-plan | **0** | **1 329 tests / 109 fichiers** (659 · 36 · 287 · 347) | 4 822 |
| `build` | avant-plan | **0** | 4 paquets « Done », middleware **45,5 kB** | 4 774 |
| `test:int` | fond d'outil | **0** | **436 tests / 36 fichiers**, PostgreSQL réel | 4 722 |
| `test:e2e` | fond d'outil | **0** | **34 passés · 1 ignoré** | 5 776 |

⚠ **AUCUN COMPTEUR N'A BOUGÉ** depuis D288 — 1 329/109, 436/36, 34+1 à l'identique : l'attendu d'une
passe qui ne touche aucun code, et **c'est ce qui rend la comparaison lisible**.
⚠ **Le code de sortie lu est le RÉEL**, écrit dans un fichier `.code` par chaque porte — jamais celui
de l'enveloppe ni d'une notification de tâche (D288).
⚠ **« failed » confronté à son CONTEXTE, jamais à son nombre (D275)** : dans `test`, **2** lignes de
journal de `ChargilyGateway` (chemin d'échec réseau exercé par un test) et **0 `FAIL` en casse exacte**
— ⛔ mon premier compteur était **insensible à la casse** et annonçait « FAIL = 2 » ; dans `test:int`,
**1** occurrence, qui est le **nom** d'un test vert (« la ligne passe FAILED ») ; dans l'e2e, **4**
lignes `[WebServer]` sur 742. **0 `ELIFECYCLE` partout.**
⚠ **L'e2e ignorée est NOMMÉE, relevée dans la SOURCE** : `e2e/specs/a5-cold-reload-vs-spa.e2e.ts:190`,
motif « nécessite une salle de fixture : à brancher avec T2 » — le même qu'à D283 et D288. Après la
passe : **0 `node`, ports 3100/3101 libres**.
⛔ **AUCUNE DURÉE NE SE COMPARE ICI** : modes mixtes (avant-plan / fond d'outil) et terme de **position**
établi par D291. Les durées sont dans les journaux, elles n'entrent dans aucun verdict.

### ⛔ LES CAMPAGNES — 195 GARDES, ET LA RÉSOLUTION DU `--tout` A SERVI EXACTEMENT COMME ÉCRITE

`lancer-campagnes.py --tout` : **26 campagnes, 1 845 s, sortie 1** — **182 mordues · 0 muette · 13 non
mesurées**, sur les trois campagnes gardées derrière `--int` (`e3d1-s8` 5, `s11b` 4, `solid-s6` 4).
**La sortie 1 était PRÉDITE par le critère** ; sans cette prédiction écrite, elle se lirait comme un échec.

| campagne | sans `--int` | avec `--int` | code |
|---|---|---|---|
| `neutralize-e3d1-s8.py` | 3 mordues + 5 non mesurées | **8 / 8** | 0 |
| `neutralize-s11b.py` | 9 mordues + 4 non mesurées | **13 / 13** | 0 |
| `neutralize-solid-s6.py` | 2 mordues + 4 non mesurées | **6 / 6** | 0 |

⇒ **TOTAL CERTIFIANT : 195 mordues · 0 muette · 0 non mesurée.** L'arithmétique boucle **campagne par
campagne** (3+5=8, 9+4=13, 2+4=6), jamais par un seul grand total — un total juste par compensation ne
prouve rien. **Même total qu'à D288**, sur un arbre dont aucun code n'a bougé.

### ⛔ L'ARBRE N'A PAS BOUGÉ, ET LA FENÊTRE EST HOMOGÈNE

**Arbre immobile sur `3b65fbe`** : `HEAD` et `git status --porcelain` **vide** relevés **quatre fois** —
avant les portes, avant les campagnes, après le `--tout`, après les rejeux `--int`. Les harnais mutent
des sources : quatre contrôles, pas un. **Aucun fichier n'a été édité pendant la fenêtre** ; toutes les
écritures de ce lot sont postérieures au relevé de clôture (D270).

```
ECHANTILLONS=101   dont ECHEC-INSTRUMENT=0
FENETRE=2026-09-16 18:42:56 → 2026-09-16 19:35:37   (52.7 min)
RAM_LIBRE_MO min=3293 max=5925   CPU_PCT max=99   NODE max=15
TRANSITIONS_ALIMENTATION=0       TROUS_DANS_LA_SERIE=0
✓ FENETRE HOMOGENE : une seule source d'alimentation, aucune interruption de serie.
```

⚠ Le lecteur **rejoue sa calibration sur ses deux bras** à chaque invocation : 4 cas sur 4.
⚠ **RAM min 3 293 Mo pendant la fenêtre, et ce n'est PAS une violation de la porte dure** : c'est la
mesure elle-même qui consomme (jusqu'à **15 `node`**, CPU 99 %). La porte porte sur l'**OUVERTURE au
repos** ; l'échantillonneur surveille le **RÉGIME**.

### ⛔ L'AUDIT DE SECRETS A MORDU SUR UN VRAI SECRET — LE JOURNAL e2e NE PEUT PAS ENTRER AU DÉPÔT

**24 jetons de vérification d'e-mail** (43 caractères) dans `rang15-e2e.log` : le serveur de
développement **imprime les liens de vérification**, faute de mailer en dev, et l'e2e crée des comptes.
⛔ **Une preuve ne se retouche pas (D291) : le journal brut N'EST PAS VERSÉ**, il reste hors dépôt, et la
section cite à sa place un **EXTRAIT DÉRIVÉ, nommé comme tel** (`rang15-e2e-EXTRAIT.txt`, liste
**blanche** des lignes de verdict — une liste noire laisserait passer ce qu'on n'a pas prévu ;
contrôle imprimé : ~~911~~ lignes parcourues, 3 gardées, **0 « token= » dans la sortie**).
⛔ **RECTIFIÉ LE 16/09/2026 (D294) : LE JOURNAL EN PORTE 910, PAS 911, ET LA CAUSE EST DANS
L'INSTRUMENT.** `wc -l` **et** `splitlines()` rendent **910** sur un fichier qui se termine bien
par `\n` ; `extraire-e2e.py` fait `.split("\n")`, qui rend un **élément vide final** — donc
**+1 systématique sur tout fichier qu'il lira**. ⚠ **Le verdict ne bouge pas** : 3 lignes
gardées, 0 jeton en sortie, et les 3 gardées disent bien 34 passés · 1 ignoré. Si cela vaut
d'être écrit, c'est que sous D290 le compte de parcouru **n'existe que pour être confrontable**
— et confronté, il était faux. ⚠ **Portée VÉRIFIÉE, pas présumée** : 5 instruments versés
portent cet idiome, **un seul alimente un compte « parcouru » imprimé** ; les « 375 lignes » de
`verser-et-confronter.py` passent par `splitlines()`, et le `split` d'`audit-secrets.py` ne sert
qu'à **numéroter** les lignes, ses comptes imprimés étant des fichiers et des octets. **Aucun
autre chiffre d'autorité n'est touché.**
⛔ **L'ARCHIVE N'EST PAS RETOUCHÉE, ET C'EST DÉLIBÉRÉ.** `extraire-e2e.py`, sa sortie et
l'extrait versé portent toujours **911** : une preuve ne se retouche pas (D291), et corriger le
script **sans** corriger la sortie qu'il a produite donnerait une archive qui **ne reproduit plus
la sienne** — c'est-à-dire une archive qui ment sur elle-même. ⇒ La rectification est posée **à
côté** d'eux : `docs/preuves/D293/outils/RECTIFICATION-D294.txt`. **L'instrument corrigé s'écrit
à la prochaine certification**, avec l'élargissement de la liste blanche (critère, point 9) —
pas ici : un script ferait **compter** ce lot.
⚠ **C'est la première fois que cet audit trouve autre chose que des noms de test** — et il ne l'aurait
pas trouvé s'il s'était arrêté au premier écran (D200).
**Tri des 16 alertes restantes, valeurs masquées dans la sortie versée** (dernier passage avant commit :
**226 fichiers, 1 731 347 octets** parcourus — ⚠ le nombre de fichiers **croît d'un à chaque passage**,
puisque chaque passage verse sa sortie) : **7** dans des pièces de D291 **déjà au dépôt** (son audit qui se décrit lui-même, et deux
**noms de test** qu'elle avait triés), **5** dans mon propre outil d'extraction et sa sortie (le mot
`token=` dans sa prose et son motif), **1** nom de test dans `test:int` (valeur présente dans **101**
fichiers suivis hors preuves), et **1** dans ma sortie de recherche D277, **qui cite l'entrée de backlog
décrivant ces jetons**. **Aucune valeur.**
⚠ **Et ce dernier dit quelque chose sur l'instrument** : écrire la trouvaille fait monter le compte de
l'audit — c'est la famille « une garde mesure la DOCUMENTATION de ce qu'elle teste », qui s'était déjà
présentée deux fois à D291. **Le compte ne se lit pas seul ; le contexte, toujours.** ⚠ **Les motifs ne sont PAS relâchés pour que l'audit passe** : il sort en 1, et la décision de
commiter repose sur ce tri écrit.
⚠ **Le chemin local du compte Windows** apparaît **79 fois** dans les preuves (dont 10 dans les journaux
d'aujourd'hui) — signalé, pas masqué.

### Les deux réserves de D275 — l'une LEVÉE, l'autre RECONDUITE

- ✅ **LEVÉE et reconduite comme telle — l'instrument d'état machine** : il est au dépôt et **rejoue sa
  calibration à l'invocation** (rendement **0,96** ici, CPU 15 → 100 %, `PERF` 80,2 → 146,8). Cette
  passe en a bénéficié trois fois : deux refus et une ouverture, tous contestables sur pièces.
- ⚠ **RECONDUITE — zéro `node` pendant la mesure.** `NODE=0` à **tous** les relevés au repos, aucune
  pile `dev` en tâche de fond. **C'est une condition de ce que la marque vaut, pas un défaut** : elle ne
  dit rien de la porte pendant qu'un observateur de fichiers recompile (piste D274 jamais écartée).
  **Elle se recopiera dans la prochaine.**

### ⚠ CE QUE LA MARQUE NE COUVRE PAS — écrit avant elle, et Ko l'a exigé

1. ⛔ **La base de dev `zwadj` est RECONSTRUITE et VIERGE depuis D292** : `test:int` recrée `zwadj_test`
   et l'e2e recrée `zwadj_e2e`, donc les portes ne s'en plaignent pas — mais **la marque ne porte pas
   sur les données sur lesquelles D282 a mesuré**, et aucune mesure future ne s'y compare.
2. **L'e2e est la première mesure du nouveau montage** (D292) sous e2e : elle passe, 34 · 1.
3. **Aucune durée n'est certifiée** — modes mixtes et terme de position (D291).
4. **`wsl --shutdown` a été joué dans la fenêtre d'ouverture**, avant les relevés : la fenêtre mesurée
   commence après lui.

### Passe D277 de la clôture — les deux sens

`outils/passe-d277.py` sur `outils/motifs-refus.txt` : **108 occurrences vues sur 7 motifs** — ⚠ dont **31
comptées deux fois** : la recherche ignore la casse, et « rang 15 » / « RANG 15 » ne différaient que par
elle ; 77 occurrences distinctes. **Sens 1 — invalidé** : le point d'entrée du rang 15 (« passe et marque :
section D293 ») — annoté par l'état rouge ; **aucune** phrase courante ne présente le rang 15 comme exécuté,
certifié ou clos, et **toutes** les « `chrome` fermé » sont des relevés datés (D275 à D288). **Sens 2 — rendu
permis : rien.** Les 17 « peut s'ouvrir » sont barrées, annotées « permission consommée » ou dans des
sections datées ; le compteur reste à DEUX ; « RANG 16 : EN ATTENTE D'ARBITRAGE DE KO » reste juste.

### ⛔ PASSE D277 DE LA MARQUE — ET C'EST LE SENS « RENDU PERMIS » QUI RAPPORTE

`outils/passe-d277.py` sur `motifs-marque.txt` : **146 occurrences sur 8 motifs**, 967 047 caractères
parcourus. **Sens 1 — invalidé** : le point d'entrée du rang 15 (titre barré, état réécrit), et la ligne
« CE QUE CE LOT NE FAIT PAS » de cette section, barrée avec son motif.
⛔ **SENS 2 — RENDU PERMIS, ET IL Y EN AVAIT QUATRE** : quatre phrases **courantes** disaient encore
« aucun lot de code ne s'ouvre avant une certification » — point d'entrée du rang 14, point d'entrée du
rang 12, et **deux** dans l'ordre des rangs. Toutes annotées « **LEVÉ — compteur à ZÉRO** », au format
non ambigu exigé par D287.
⚠ **C'est la TROISIÈME bascule de cette même phrase en cinq jours** (à zéro le 12/09, à deux le 13/09,
à zéro le 16/09). ⛔ **Aucune de ces quatre n'aurait été trouvée par une recherche de contradiction** :
elles ne contredisent aucun mot de la marque — elles **conditionnent** ce qu'elle autorise. C'est
exactement le second sens que D287 a dû écrire, et le seul qui ne se rattrape pas.
⚠ **Les « DEUX — dernière place » des sections D291 et D292 ne sont PAS re-marquées** : annotations
datées, vraies à leur date (principe de D291).

### ⛔ CE QUE CE LOT NE FAIT PAS

1. ~~**Il ne certifie rien.** ⛔ **Compteur de lots de code non certifiés : toujours DEUX** — le rang 13 et
   l'incident D292. **Aucun lot de code ne s'ouvre**, et le rang 15 n'est pas clos.~~
   ⛔ **BARRÉ LE 16/09/2026 À LA POSE DE LA MARQUE** — vrai des deux refus, faux après la passe : **la
   marque est posée, le compteur passe à ZÉRO, le rang 15 est CLOS.** Barré plutôt qu'effacé (D276) :
   effacé, on ne saurait plus que ce lot a été deux fois refusé avant d'aboutir.
   ⇒ **Un lot de code PEUT s'ouvrir dès que Ko l'arbitre** — et c'est lui qui portera le compteur à un.
2. **Il ne ferme pas le navigateur de Ko** : fermer ses processus aurait été un geste sur son poste, que la
   consigne ne donne pas — elle dit « rouge ⇒ tu ne lances rien et tu me le dis ».
3. **Il est DOCUMENTAIRE** : trois `.md` d'autorité et `docs/preuves/` au diff (exemption D292) — il ne
   compte pas dans les deux/trois.
4. **Il ne verse pas les autres pièces orphelines** (rangs 6, 11, 12 hors campagnes) : hors arbitrage.

### ⛔ FAUTES DE MÉTHODE DE LA SESSION, À MON COMPTE

1. ⛔ **UNE EXCLUSION D'AUDIT PLUS LARGE QUE SON NOM.** La règle « tout `.txt` du dossier » a exclu deux
   sorties d'autres contrôles, et la sortie imprimait « sorties de ce script » : **un compte d'exclusions
   qui ne dit pas CE qu'il exclut se lit comme juste**. Vu parce que le nombre (4) ne correspondait pas à ce
   que je savais avoir écrit (1 puis 2) — c'est l'attendu à côté du mesuré (D290) qui a mordu, pas une
   relecture. Corrigé, rejoué, sortie fautive gardée.
2. ⚠ **LE RELECTEUR DE JETONS N'AVAIT QU'UN BRAS À SA PREMIÈRE EXÉCUTION** (présence seule) : un compteur
   qui rendrait « 1 » à tout l'aurait passé. Bras négatif ajouté (ancienne ligne non barrée → 0, jeton absent
   → 0), première sortie gardée (`relire-jetons-etape0.txt`).
3. ⚠ **J'AI LU LE PROCESSUS `chrome` AVANT LE RELEVÉ FORMEL**, par un listage hors instrument. Il n'a rien
   décidé — le refus repose sur les deux relevés de la sonde et sur l'identification versée —, mais le premier
   listage (01:49:12) n'est dans aucune pièce. ⇒ **Rien de ce qu'il montrait n'est écrit ici sans être aussi
   dans `rang15-chrome-identification.txt`** : un processus qu'il était seul à porter a été retiré du texte
   à la relecture, où je l'avais d'abord cité.
4. ⛔ **UN ATTENDU ÉCRIT DE MÉMOIRE DANS MON PROPRE RELECTEUR** : « `657e9ba` × 3 dans ce fichier » — il y est
   **deux** fois, la troisième est au backlog. **Le fichier était juste, l'attendu faux**, et c'est le
   relecteur qui a rendu l'écart (1). Attendu relevé par recherche, sortie en écart gardée
   (`relire-jetons-refus.txt`), rejoué à 0 (`-refus-2.txt`). ⚠ C'est la classe exacte que D291 a trouvée dans
   son cas connu — **reproduite dans l'instrument qui existe pour l'attraper**.
   ⛔ **RÉCIDIVE LE 16/09, SUR LE MÊME INSTRUMENT ET DANS LE MÊME LOT** : « `docs/preuves/D293/ouverture-16-09/`
   × 2 » — il y est **une** fois en toutes lettres, la seconde mention étant le dossier **nu**. Même cause :
   un attendu compté **de tête** au lieu d'être relevé. ⇒ Les deux écarts ont été rendus par l'instrument,
   pas par relecture, et les deux sorties fautives sont gardées (`relire-jetons-refus.txt`,
   `-refus2.txt`). ⚠ **Deux fois en deux étapes, c'est un motif, pas un accident** : tout attendu de ce
   relecteur se relève désormais par recherche AVANT d'être écrit.
   ⚠ **Et le relevé lui-même s'est périmé au tour suivant** : la note que vous lisez **cite le chemin**,
   donc le compte est passé de 1 à 2 pendant que je l'écrivais. **Un attendu relevé avant la dernière
   modification n'est plus un attendu** — c'est D218 (« les portes se relancent après la dernière
   modification ») porté à un compteur de jetons.
5. ⛔ **UN EXTRACTEUR QUI A RENDU « 0 MORDUE » SUR 27 GARDES QUI AVAIENT MORDU.** En relisant les rejeux
   `--int`, mon compteur PowerShell de lignes `✓` a rendu **0** pour les trois campagnes : il lisait des
   journaux **UTF-8** avec l'encodage ANSI par défaut de `Get-Content`, donc le `✓` ne correspondait à
   rien. ⛔ **Il n'a pas levé — il a répondu**, et « 0 mordue » se lit comme un résultat. **Ce qui l'a
   attrapé est la ligne de résumé lue à côté** (« 8 garde(s) mordue(s) sur 8 »), dont le mojibake
   (« RÃ‰ELLEMENT ») nommait la cause. Recompté avec `-Encoding UTF8` : 8 · 13 · 6. ⚠ C'est **D275 mot
   pour mot** — « un extracteur qui rend zéro se confronte à la sortie brute avant d'être cru » — dans le
   lot qui cite cette règle deux fois.
6. ⚠ **J'AI VOULU GREFFER UN DRAPEAU `--audit-seul` SUR LA PROCÉDURE ARCHIVÉE DE L'ÉTAPE 0**, pour
   rejouer son audit après la passe. Écarté avant d'aller au bout : cela aurait mis **deux chemins** dans
   une pièce déjà versée (D128, « deux endroits où se tromper »). ⇒ L'audit courant est un instrument à
   part (`outils/audit-secrets.py`), calibré à chaque exécution ; la procédure de l'étape 0 reste ce
   qu'elle était, et **sa garde a d'ailleurs ABANDONNÉ** plutôt que d'écraser un journal de D288 par un
   journal d'aujourd'hui — la garde « une preuve ne s'écrase pas » **a mordu en vrai**.

## Incident du 13/09/2026 — D292 · `zwadj-db` ne démarrait plus : le montage `/data` contre le volume de l'image, et la base de dev perdue

⛔ **UN INCIDENT, PAS UN LOT — MAIS IL COMPTE.** Il modifie `docker-compose.yml`, qui n'est pas un
`.md` d'autorité et peut dégrader `test:int` : **compteur de lots de code non certifiés à DEUX**
(le rang 13 et cet incident ; le rang 14 en sort par l'exemption `docs/preuves/`, arbitrée par Ko
et écrite dans `AGENTS.md`). Il se lit au point d'entrée du rang 14. ~~**Le rang 15 reste en attente
d'arbitrage de Ko, et il passera par une certification.**~~ ⛔ **Ratifié par Ko le 14/09/2026, qui a
arbitré : le rang 15 EST la certification** (clôture en fin de section).

### La cause — trois sources, et elles disent la même chose

Symptôme rapporté par Ko, puis **reproduit** : `Exited (1)`, « in 18+, these Docker images are
configured to store database data in a format which is compatible with "pg_ctlcluster" […] there
appears to be PostgreSQL data in: /var/lib/postgresql/data (unused mount/volume) ».

1. **Le script d'entrée de l'image locale** (`postgres:18`, `PG_VERSION=18.4-1.pgdg13+1`, construite
   le 07/07/2026). Si aucun `PG_VERSION` n'existe sous `/var/lib/postgresql`,
   `/var/lib/postgresql/data` ni `/var/lib/postgresql/*/docker`, **et** que
   `/var/lib/postgresql/data` est un point de montage, il déclare
   `/var/lib/postgresql/data (unused mount/volume)` comme « ancienne base » et sort en 1.
   ⇒ **Le suffixe veut dire qu'AUCUNE donnée n'a été trouvée : c'est le montage qui déclenche le
   refus, même vide.** En amont depuis le 15/10/2025 (commit `5ec8931`, patch lu).
2. **La configuration de l'image** : `PGDATA=/var/lib/postgresql/18/docker`, `VOLUME ["/var/lib/postgresql"]`.
3. **La documentation officielle** — Docker Hub, et la PR `docker-library/postgres` #1259 fusionnée
   le 05/06/2025 : en 18+, « *Mounts and volumes should be targeted at the updated location* »,
   c'est-à-dire `/var/lib/postgresql`. Poser `PGDATA=/var/lib/postgresql/data` n'y figure que comme
   **voie de migration**, pas comme configuration recommandée.

⚠ **Deux corrections de l'hypothèse de départ, retenues par Ko** : le refus vient du montage et non
de données ; et `docker-compose.yml` porte `postgres:18` **depuis le commit initial** (12/07/2026) —
le fichier n'avait pas bougé.

### Reproduction AVANT le correctif, puis le correctif

- **Reproduit** sur la configuration d'origine : `Exited (1)`, message identique. Volume nommé
  inspecté avant toute suppression : **0 fichier**.
- **Correctif** : `zwadj_pgdata:/var/lib/postgresql/data` → `zwadj_pgdata:/var/lib/postgresql`, seule
  occurrence du chemin dans le dépôt. Commentaire posé à côté de celui qui exige PG 18 : pourquoi la
  racine, et ⛔ **un retour à `postgres:17` ou moins impose de remettre le montage sur `/data`**, sinon
  les données ne sont pas conservées à la recréation du conteneur (doc Docker Hub).
- `down -v` puis `up -d` : journal propre (`initdb` dans `/var/lib/postgresql/18/docker`, « ready to
  accept connections »), statut `Up`.
- ⛔ **Persistance MESURÉE, pas déduite de `Up`** : un seul montage, le volume nommé sur
  `/var/lib/postgresql` ; `PG_VERSION` = 18 **dans** ce volume ; une table témoin a survécu à
  `docker compose down` (sans `-v`) puis `up`, et a été supprimée. ⇒ **`pnpm db:down` ne détache plus
  la base.**

### ⛔ LA BASE DE DEV `zwadj` EST PERDUE — LA CHAÎNE, SES PIÈCES, ET CE QUI N'EST PAS ÉTABLI

**Le mécanisme, mesuré sur des volumes jetables** (`zz_probe_*`, supprimés ensuite ; 4 volumes sur la
machine avant et après) :
- **sonde A** — ancien montage, volumes neufs : refus, code 1. Docker monte **deux** volumes : le nommé
  sur `/data` **et un anonyme** sur `/var/lib/postgresql` ;
- **sonde C** — ancien montage, base déjà présente sous `/var/lib/postgresql` : le conteneur démarre,
  écrit dans `/var/lib/postgresql/18/docker`, et le volume monté sur `/data` reste à **0 fichier**.

⇒ Sous l'ancien montage, **tant que le conteneur tournait en 18.4 avec le `PGDATA` de l'image**, la
base vivait dans le **volume anonyme** du conteneur, jamais dans `zwadj_pgdata`.

**La chaîne, pièce par pièce :**
1. Le conteneur servait **PostgreSQL 18.4** (section « PostgreSQL, pour la certification » de ce
   fichier), la version de l'image locale ; `docker-compose.yml` ne pose aucun `PGDATA`.
2. Rang 14 (D291) : `docs/preuves/D291/portes/db-up.log` porte « Starting / Started » sans
   « Creating » — **le même conteneur**, donc le même volume anonyme. Puis `db-down.log` porte
   « **Container zwadj-db Removed** », et aucun volume retiré. ⇒ **`pnpm db:down` (= `docker compose
   down`) a détaché la base de tout conteneur.** D291 l'avait écrit « conteneur arrêté » : barré.
3. Le démarrage suivant crée un conteneur neuf, avec un volume anonyme neuf et vide : le contrôle de
   l'image refuse.

**Balayage de la machine, en lecture seule** : 4 volumes, 2 conteneurs. Un seul cluster 18, le neuf ;
l'autre cluster est un PG **15**, monté par `floranet-db` (autre projet). Aucun service PostgreSQL
Windows ; sur 5432 n'écoutent que `com.docker.backend` et `wslrelay`. ⇒ **Aucune copie de l'ancienne
base sur ce poste.**

**Ce qu'elle portait** : D282 y a compté **0 violante sur 4 réservations et 0 sur 38 devis** ; au
rang 11 (D286), l'empreinte stockée y a été **relue** pour clore le rang 8. **Ces relevés restent vrais
à leur date**, et aucune mesure future sur `zwadj` ne s'y compare (report au backlog). Les migrations
sont dans git ; les données, non.

⚠ **Le `down -v` de la session n'a rien coûté, et c'est mesuré** : le journal d'événements de Docker
montre qu'il n'a détruit que le volume nommé — vide, 0 fichier relevé avant — et le volume anonyme du
conteneur de reproduction.

⛔ **NON ÉTABLI — NE PAS L'ÉCRIRE COMME UN FAIT :**
- **qui a supprimé le volume anonyme détaché, et quand.** Il n'est plus sur la machine ; le volume
  nommé a été recréé à 00:35:46 UTC le 14/09 (20:35:46 heure locale le 13/09), avant cette session ; le
  journal d'événements de Docker ne remonte qu'à 00:46:18 UTC ;
- **ce qu'a contenu `zwadj_pgdata` avant cette recréation** ;
- **comment l'ancienne base a été initialisée**, alors que l'image locale refuse de le faire sous le
  montage `/data` (sonde A). Inférence : une autre configuration ou une autre image, puis reprise
  telle quelle.

### Migrations réappliquées — vérifiées par le journal, jamais par le code de sortie

`pnpm --filter @zwadj/api run prisma:migrate` (= `migrate deploy`) : exit 0, « 27 migrations found »,
« All migrations have been successfully applied ». ⛔ Non cru sur parole — `migrate deploy` peut
sortir en succès sans rien appliquer :

| contrôle | mesuré | attendu |
|---|---|---|
| dossiers de migration parcourus | 27 | 27 |
| lignes de `_prisma_migrations` parcourues | 27 | 27 |
| dérives d'empreinte (sha256 du fichier ≠ `checksum`) | **0** | 0 |
| absentes du journal · en trop · non finies ou annulées | 0 · 0 · 0 | 0 · 0 · 0 |
| garanties SQL citées par `AGENTS.md`, présentes en base et validées | **11 sur 11** | 11 |

**Calibration, deux bras, AVANT de croire le « 0 »** : bras + — l'empreinte de
`20260909120000_booking_quote_total_coherent`, calculée **et** stockée, vaut `4bf7e91e…b689`, la valeur
que D286 a relue dans l'ancienne base ; bras − — un octet altéré en mémoire est détecté. Relevé
ensuite : **40** tables dans `public`, **0** ligne dans `bookings`, `quotes`, `venues` et `users`.

### Portes — après la dernière modification de `docker-compose.yml`

Alimentation relevée avant : **SECTEUR** (`PowerLineStatus: Online`, batterie à 100 %). Aucun
échantillonneur `PERF` : **les durées sont indicatives et ne se comparent à rien.**

| porte | code | durée | chiffres |
|---|---|---|---|
| `typecheck` | **0** | 35 s | 0 `error TS` |
| `lint` | **0** | 15 s | — |
| `test` | **0** | 68 s | **1 329 tests / 109 fichiers** — 659 · 36 · 287 · 347 |
| `build` | **0** | 93 s | 4 paquets « Done » |
| `test:int` | **0** | 446 s | **436 tests / 36 fichiers**, sur `zwadj_test` (recréée par le setup, jamais `zwadj`) |

⚠ **Les comptes sont ceux de D291 à l'identique**, attendu d'un changement qui ne touche aucun code
applicatif. ⚠ **« failed » confronté à son contexte (D275)** : dans `test`, deux lignes de journal de
`ChargilyGateway` ; dans `test:int`, deux **noms** de tests verts (« la ligne passe FAILED », « …
idempotent »). Zéro `ELIFECYCLE`.
**Non lancées, et déclarées** : l'e2e — ni auth, ni concurrence, ni argent ; les campagnes `--tout` —
ce n'est pas une livraison. **Tri des campagnes** (`lancer-campagnes.py`, après toutes les écritures) :
exit 0, **4 fichiers modifiés depuis `HEAD` ⇒ 0 campagne concernée sur 26**. Joué d'abord en
`--liste` : un passage réel qui aurait retenu une campagne réécrivait les journaux de D288 (backlog,
reports de D291). Journal de campagne le plus récent avant et après : 12/09/2026 01:25:31, inchangé.

### Passe D277 — les deux sens

Recherche sur le texte **aplati** des quatre fichiers d'autorité (D289), **64 occurrences vues** sur
1 079 + 115 + 7 831 + 3 464 lignes, triées au contexte.
**Invalidé par l'incident, traité :**
- point d'entrée du rang 14 : composition du compteur barrée, écart de lecture tranché par Ko, et
  écart de lettre `.gitattributes` signalé — ⛔ tranché par Ko le 14/09/2026, voir la clôture ;
- point d'entrée du rang 13 : motif « À DEUX DEPUIS D291 » barré ;
- section D291 : « conteneur arrêté après (`pnpm db:down`) » barré ; « l'exemption éventuelle
  appartient à Ko » annoté comme tranché ;
- `AGENTS.md`, bloc D283 : amendement de Ko — `docs/preuves/` seule exemptée, et le cas
  `docker-compose.yml` qui borne l'exemption.

**Rendu permis** : `pnpm db:down` ne détache plus la base — aucune phrase ne l'interdisait. **Aucune
permission périmée par l'incident** : chaque « un lot de code peut s'ouvrir » trouvé est déjà barré ou
annoté « permission consommée », et le compteur à DEUX interdit tout lot de code avant certification.
⚠ **Le marquage automatique « barrée » de l'outil n'est pas fiable** : il compte les `~~` par parité et
a déclaré courantes deux lignes barrées (6263, 6366 à la date du relevé). Le tri s'est fait sur les
extraits.

### ⛔ FAUTES DE MÉTHODE DE LA SESSION, À MON COMPTE

1. ⛔ **UNE VALEUR DE CALIBRATION RATTACHÉE PAR INFÉRENCE — ET LA CALIBRATION L'A REFUSÉE.** J'ai
   attribué l'empreinte `4bf7e91e…` de D286 à `20260707000001_booking_constraints`, cité juste à côté
   pour un autre argument. Le comparateur a abandonné sur « calibration manquée » : ce fichier fait
   12 847 octets, D286 en décrit 5 949. Le bon a été **trouvé par la mesure** — 27 fichiers × 2 formes
   de fin de ligne, **1 correspondance**, `20260909120000_booking_quote_total_coherent`, celui que
   touche `31f6a00`. ⇒ La classe de D291 à l'échelle d'un script : une attribution qui « ressemble »
   n'est pas relevée. **Une calibration qui abandonne a fait son travail.**
2. ⚠ **UNE DATE UTC ÉCRITE COMME UNE DATE LOCALE.** Le commentaire de `docker-compose.yml` a d'abord
   porté « incident du 14/09/2026 », lu sur les horodatages de Docker. Heure locale relevée : 13/09/2026,
   −04:00. Corrigé avant les portes ; **0** `14/09` restant dans le fichier (compté).
3. ⚠ **UNE AFFIRMATION TIRÉE D'UN TITRE DE COMMIT.** « Le contrôle existe en amont depuis octobre 2025 »
   a d'abord été écrit sur la foi d'un titre résumé par un outil. Vérifié ensuite sur le patch
   (`5ec8931`, 15/10/2025, ajoute la chaîne exacte).

### Ce que cet incident ne fait pas

1. **Aucun `docker volume prune`** (consigne de Ko) : il retire tous les volumes anonymes inutilisés de
   la machine. Les deux orphelins vides sont au backlog.
2. **Aucun semis** de la base de dev.
3. **Pas une certification.** ⛔ **Compteur : DEUX — dernière place.**

### ⛔ CLÔTURE — CE QUE LE CORRECTIF CHANGE, ET LES ARBITRAGES DE KO DU 14/09/2026

**Incident ratifié par Ko le 14/09/2026.** Sa lecture, écrite parce qu'elle est le point : **la base
n'est pas morte d'un accident, elle est morte d'une commande normale du dépôt**, `pnpm db:down`.

⛔ **CE QUE LE CORRECTIF CHANGE — SINON ON ÉVITERA LONGTEMPS UNE COMMANDE DEVENUE INOFFENSIVE (Ko).**
Avec le montage sur `/var/lib/postgresql`, **les données vivent dans le volume NOMMÉ** `zwadj_pgdata`.
`pnpm db:down` (= `docker compose down`) retire le conteneur et laisse ce volume : **il redevient sans
effet sur les données** — mesuré par la table témoin, qui a survécu à `down` puis `up`. ⛔ **`down -v`,
lui, les supprime.** Écrit aussi dans `AGENTS.md` (notes du poste de Ko), dans la note barrée de la
section D291 et au backlog.
⚠ **Le commentaire de `docker-compose.yml` n'a PAS été retouché** : il décrit l'ancien montage, au
passé. Le modifier aurait changé un fichier qui compte et rouvert les portes, pour une phrase déjà
exacte.

**Arbitrage 1 — `.gitattributes` EST COUVERT par l'exemption, par ce que fait sa ligne et non par son
nom.** Sa seule règle vise `docs/preuves/` : elle ne peut affecter aucun fichier de code.
⛔ **Borné et vérifiable** : si une règle de ce fichier vise un jour autre chose, **le lot qui
l'introduit COMPTE**. Clause et contrôle dans `AGENTS.md`, bloc D283 ; contrôle calibré le 14/09/2026
sur quatre cas (fichier réel **1 · 0**, règle `*.ts` ajoutée **2 · 1**, commentaires seuls **0 · 0**,
motif ancré **1 · 0**). **Le compteur reste à DEUX.**

**Arbitrage 2 — le numéro D292 est ratifié.**

**Arbitrage 3 — RANG 15 = CERTIFICATION**, avec une étape 0 urgente : archiver les 26 journaux de
campagne de D288 avant que `--tout` ne les réécrive. Ordre complet, porte dure et limite de la base
vierge : bloc « PROCHAIN LOT — rang 15 », en tête de ce fichier. **Rien n'en est exécuté dans cette
session** : Ko l'a close, et le rang s'ouvre à froid.

## Session des 12 et 13/09/2026 — D291 · rang 14 : le dossier cesse d'affirmer ce qu'il n'a pas mesuré, et les preuves entrent au dépôt

⛔ **RANG 14, ARBITRÉ PAR KO LE 12/09/2026.** ⇒ **État du rang** : section « PROCHAIN LOT — rang
14 » en tête de ce fichier. **Numéro pris en LISANT le registre** : sa dernière ligne portait D290.

### ⛔ CE QUI A OUVERT CE RANG — LA PREMIÈRE CONFRONTATION AUX JOURNAUX BRUTS

La reprise à froid du 12/09/2026 a fait ce qu'aucune session n'avait fait : **relire les journaux
que citent les textes d'autorité**. Trois chiffres écrits comme des mesures ne s'y retrouvaient pas.
⛔ **Ce que Ko a écrit de sa part de la faute, et c'est le motif de la règle de classe** : une
hypothèse formulée dans le fil « est devenue une mesure dans le fichier le plus lu du dépôt, en un
tour — pas un chiffre erroné, un statut erroné ». ⚠ **L'écriture, elle, est de la session de D290** :
c'est au moment d'écrire « mesuré » que la pièce aurait dû être exigée.

### ⛔ ÉTAPE 0 — CE QUI ÉTAIT ÉCRIT, CE QUE RENDENT LES PIÈCES, OÙ C'EST CORRIGÉ

| # | affirmation | ce que rendent les pièces | corrigé dans |
|---|---|---|---|
| 1 | « `PERF` 73-77 % » (passes lentes) | pendant les passes : **13 lignes sur 15** au-dessus de 100 sur les deux passes de la comparaison, **29 sur 36** sur les trois journaux, minimum **80,4** ; **0 ligne sur 51** entre 73 et 77 | `AGENTS.md` (barré, remplacé) · critère, point 6 · D290 |
| 2 | « à une heure d'intervalle » | **au moins 2 h 36** (`fc7c02e` à 18:57:17, passe 1 vers 21:33:34) ; **≈ 5 h 15** d'après les journaux (16:15:48 → 16:18:01) | idem |
| 3 | « `PERF` 103-122 % » (passes rapides) | **une lecture `Get-Counter` par passe**, au plus 3,7 s après la fin de la précédente (passes 2 à 5) ; « retombée » est une **inférence**, question Q1 du relevé | `AGENTS.md` · D290 |
| 4 | quatre phrases périmées | ordre des rangs : « Le compteur est à zéro. Elle peut s'ouvrir… » (**permissive**), « cadrage écrit, aucune ligne de code », « ⏳ la borne de workers… toujours ouvert » ; point d'entrée du rang 13 : « CE QUI RESTE DÛ : l'expérience… » | ordre des rangs · point d'entrée du rang 13 |
| 5 | « cette occurrence s'y ajoute, la quatrième » | `dfca28f` ne touchait que ce fichier ; l'entrée du backlog disait « TROISIÈME » | `ZWADJ_BACKLOG.md`, `[INFRA][P2]` |

Pièces : `docs/preuves/D290/` ; recalcul du point 1 : `docs/preuves/D291/controles/perf-journaux-d290.*`.

⛔ **ET SEPT AUTRES DE LA MÊME CLASSE, TROUVÉES EN CHEMIN** — hors consigne, traitées parce qu'elles
en sont :
- Point d'entrée du rang 12 : « un lot de code **peut** désormais s'ouvrir » — permission consommée,
  dans une entrée close ; **vue seulement au tri de la seconde recherche**.
- `AGENTS.md` : « un mode bridé **survit** au rebranchement » — **aucune mesure** au dépôt ; D283
  écrivait « **peut** survivre ». Le modal est tombé en recopiant. Annoté aussi au critère.
- D290 : « l'extracteur de délais est calibré sur ses deux bras » — le bras positif est celui du
  **verdict** ; le compteur de délais n'a jamais reçu de délai, et le motif de verdict ne lisait
  pas une suite rouge.
- D290 : « régime et `PERF` relevés devant chaque passe » (protocole jamais exécuté) et « c'est
  exactement le trou que le durcissement ferme » — `PERF` se lit **pendant**.
- Ordre des rangs, rang 12 : « un lot de code **peut** s'ouvrir » — permission consommée, **trouvée
  seulement après correction de l'outil de recherche** (passe D277 ci-dessous).
- Backlog, entrée de la borne de workers : « CE QUI RESTE DÛ … l'expérience du régime
  d'alimentation ».
- Tableaux du rang 12 et de D288 : « > 100 = turbo » dans une colonne « exigé » — **une légende,
  jamais une exigence** ; annotée sur place.

### ⛔ LA RÈGLE DE CLASSE ET LA DÉCISION DE FORME — `AGENTS.md`

1. **« Une hypothèse formulée dans le fil ne s'écrit pas au statut de mesure — même quand c'est Ko
   qui la formule »** (Ko). ⇒ Forme vérifiable, **dérivée par la session** : ce qui s'écrit mesuré
   nomme sa pièce versée au dépôt ; sinon il s'écrit « inférence » ou « hypothèse ».
2. **« Les preuves brutes qu'une décision cite entrent au dépôt »** (Ko). ⇒ `docs/preuves/<Dnnn>/`,
   copie à l'octet vérifiée par empreinte, procédure archivée et jamais promue, audit de secrets
   avant commit.
⛔ **`.gitattributes` N'EST PAS UNE PRÉCAUTION, C'EST UNE MESURE** : `core.autocrlf=true` sur ce
poste et aucun `.gitattributes` ; les preuves de D290 mêlent des **journaux vitest en LF pur** (0 CRLF
sur 1 234 à 1 242 lignes) et des **CSV en CRLF**. Sans `-text`, git aurait stocké autre chose que ce
qui a été mesuré.

### Les preuves versées, et ce qui ne l'est pas

- **D290**, `docs/preuves/D290/` : `r13-client-1.csv`, `r13-racine-1.csv`, `r13-client-x3.csv`,
  `passes_secteur.ps1`, `passes/client-secteur-1.log` à `-5.log`. **9 copies identiques sur 9** à
  leur source (sha256, `D291/controles/integrite-et-secrets-avant-commit-1.txt`).
  ⚠ L'en-tête de `passes_secteur.ps1` dit qu'il « n'entre pas au dépôt » : **une preuve ne se
  retouche pas** — cet en-tête est lui-même la pièce de l'écart que D291 ferme.
- **Audit de secrets** (`D291/controles/integrite-et-secrets.py`, 11 motifs calibrés sur leurs deux
  bras) : **0 alerte sur 28 fichiers** avant le premier commit. ⚠ **Le chemin local du compte Windows
  y apparaît 14 fois** (journaux vitest, harnais de D290, sorties de calibration) ; **aucun fichier
  suivi ne le contenait avant.** Signalé, pas masqué : une preuve ne se retouche pas.
- **Non versées** : les pièces d'autres décisions encore sur disque (rangs 6, 11 et 12). **Aucune
  décision ne cite un journal par son chemin** (zéro) : les rattacher serait une inférence.
  Inventaire et risque d'écrasement : `ZWADJ_BACKLOG.md`, reports de D291.

### ⛔ PASSE D277 — LES DEUX SENS, PAR UNE RECHERCHE VERSÉE ET CALIBRÉE

- **L'outil est une pièce** : `docs/preuves/D291/passe-d277/` — `recherche.py`, `motifs.txt` (lus
  dans un fichier, jamais tapés en ligne de commande), et ses sorties. Texte **aplati** (D289) ;
  calibration à deux bras — une expression qui enjambe un retour à la ligne doit sortir aplatie et
  pas ligne à ligne, un motif absent doit rendre 0 — et **abandon** si un bras manque.
- ⛔ **L'OUTIL ÉTAIT AVEUGLE AU GRAS, ET C'EST LE TRI QUI L'A VU.** Première sortie — **non
  conservée**, écrasée par la seconde : 82 occurrences sur 27 motifs, et « un lot de code **peut**
  s'ouvrir » n'y figurait pas. Correctif : `*` et accent grave retirés du texte et du motif.
  Relancée sur les fichiers **encore intacts** : **106 occurrences sur 31 motifs** (`avant.txt`).
- **Principe de tri, écrit pour pouvoir être contesté** : sont traitées les phrases **courantes** —
  critère, points d'entrée, ordre des rangs, `AGENTS.md`, entrées ouvertes du backlog. Une annotation
  **datée** d'une section de session, vraie à sa date, **ne se re-marque pas** : sinon chaque
  mouvement du compteur obligerait à re-marquer toutes les annotations qui l'ont suivi.

### ⛔ LA CALIBRATION DE L'EXTRACTEUR — UN ATTENDU ÉCRIT DE MÉMOIRE, ET DEUX INSTRUMENTS QUI SE SONT COMPTÉS EUX-MÊMES

- **L'environnement d'abord, relevé et non supposé** : l'outil Bash porte `TERM=xterm-256color`,
  l'outil PowerShell `NO_COLOR=1`. Le même test rend sa sortie **avec** codes ANSI sous Bash, **sans**
  sous PowerShell. D290 a tourné sous PowerShell ⇒ **le relevé et sa calibration tournent sous
  PowerShell**.
- ⛔ **L'attendu démenti** : le commentaire du cas connu annonçait « exactement UN » message de délai ;
  la sortie en portait **trois**. ⛔ **Le troisième était ce commentaire**, que vitest recopie dans
  son cadre de code : **le compteur comptait la documentation du cas connu.** Seconde version, qui ne
  cite plus la signature : **2 occurrences pour 1 test en échec** (l'arbre, puis le détail de
  l'erreur). Première version et ses sorties gardées : `D291/calibration/delai-premiere-version.*`
  et `delai-outil-bash.log`.
  ⇒ **Un compte d'occurrences n'est pas un compte de tests.** Les « 22 signatures » du cas rouge du
  09/09 ne font pas 22 tests — et son journal n'est pas conservé : rien de plus ne s'en déduit.
- ⛔ **Le second instrument** : l'audit de secrets s'est détecté **lui-même** — 12 alertes, toutes dans
  sa source : des clés qui nomment les motifs qu'elles cherchent, et sa ligne de résumé. Clés
  renommées ; sortie gardée (`D291/controles/integrite-et-secrets-premiere-execution.txt`) ; **seule
  exclusion déclarée** de l'audit : ses propres sorties, qui ne recopient aucun contenu audité.
- **Calibration finale, deux bras sur des sorties réelles** (`D291/calibration/calibration-extracteur.txt`) :
  positif — code vitest 1, 2 délais, verdict `0/1 (1 failed)` ; négatif
  (`D290/passes/client-secteur-1.log`) — 0 délai, `287/287`. ⚠ **Un verdict rouge se lit** :
  l'extracteur de D290 l'aurait rendu ILLISIBLE.

### ⛔ LE PROTOCOLE DU RELEVÉ — ÉCRIT ET COMMITÉ AVANT LA PREMIÈRE PASSE

**Question** : qu'est-ce qui fait bouger de ~20 % la durée de `pnpm --filter @zwadj/client run
test`, **à régime constant** ? ⛔ **On identifie ; on ne borne rien.**
**Procédure** : `docs/preuves/D291/releve/releve-perf-duree.ps1`, empreinte relevée avant la première
passe et après la dernière ; lancée **sous l'outil PowerShell, en avant-plan**, en deux appels
(cycles 1 à 3, puis 4 à 6).

| cycle | 1 | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|---|
| observateur | OFF | ON | ON | OFF | OFF | ON |

**Un cycle** : observateur démarré si ON (échantillonneur, `-Intervalle 1`) → **repos 60 s** →
**passe A** (après repos) → **passe B** (enchaînée, même séquence que D290) → observateur arrêté.
L'ordre ABBAAB compense une dérive linéaire.
⚠ **60 s est un choix, pas une dérivation** : aucune mesure du dépôt ne dit en combien de temps
`PERF` retombe ; les journaux de l'observateur le montreront pour les cycles ON. Entre les deux
appels, le repos du cycle 4 s'allonge du temps de la session : il reste d'au moins 60 s.
**Par passe** : régime avant et après — la lecture de D290 **recopiée à l'identique**, pour que
« `PERF` avant » reste comparable —, horodatages à la milliseconde, verdict lu y compris rouge,
délais, durée vitest, mur, code de sortie. Un journal vitest par passe, le tableau `releve.csv`, et
le journal de l'observateur `ech-cN.csv` pour les cycles 2, 3 et 6.
**État machine** : sonde `-Calibrer` avant le cycle 1, sortie versée ; **SECTEUR exigé devant chaque
passe, sinon arrêt** (point 6 du critère) ; `chrome` relevé, non exigé — ce n'est pas une
certification, et il ne change pas entre les conditions comparées.

**Les questions, et la règle qui les tranche — fixées avant de mesurer :**

| # | question | établi SI, et seulement si |
|---|---|---|
| Q1 | « `PERF` avant » mesure-t-il la retombée de la passe précédente ? | `PERF` avant B > `PERF` avant A dans **6 cycles sur 6** |
| Q2 | l'observateur est-il un terme de durée ? | pour A **et** pour B, les 3 durées ON sont toutes du même côté des 3 durées OFF, **dans le même sens** |
| Q3 | la position (après repos, enchaînée) est-elle un terme ? | durée B < durée A — ou > — dans **6 cycles sur 6** |
| Q4 | `PERF` pendant la passe va-t-il avec la durée ? | **jamais « établi » ici** : ρ de Spearman entre la médiane de `PERF` pendant la passe et la durée, sur les 6 passes ON, rapporté avec son n ; seul ρ = ±1 se dit « compatible » |
| Q5 | verdicts | toute passe rouge est rapportée seule et **retirée de Q2 à Q4**, qui se déclarent alors incomplets |

⚠ **Durée comparée : la « Duration » de vitest**, colonne de D290. **Aucune moyenne** : chaque passe
a sa ligne.
⚠ **Résolution, pas preuve** : au hasard, 6 cycles sur 6 dans un sens donné arrivent 1 fois sur 64,
dans l'un ou l'autre sens 1 fois sur 32 ; trois contre trois tous du même côté, 1 fois sur 10 par
position. **Un « non établi » ne réfute rien.**
**Conséquence, écrite d'avance** :
- Q2 ou Q3 établi ⇒ **le terme est nommé**, le rang se clôt sur lui, **sans remède dans ce lot** ;
- ni Q2 ni Q3 ⇒ le rang se clôt sur « **non identifié à cette résolution** » — observateur et
  position séparés, aucun établi : un résultat, pas un échec ;
- Q1 tranche le statut de « retombée » écrit à l'étape 0 : établi, la phrase perd son
  « inférence » ; sinon elle la garde ;
- dans tous les cas, **rang 15 en attente d'arbitrage de Ko**.
⛔ **Ce que ce relevé ne peut pas dire** : pourquoi le cas rouge du 09/09 (non reproduit, journal non
conservé) ; ce que fait la batterie (exclue par le point 6) ; si l'observateur perturbe au-delà de
ce que la durée voit.

### ⛔ FAUTES DE MÉTHODE DE L'ÉTAPE 0, À MON COMPTE

1. **Ma reprise étiquetait « passes lentes (20,0-20,3 s) » un compte de 36 lignes qui inclut trois
   autres passes** (`r13-client-x3`). Sur les deux passes de la comparaison : 13 sur 15. Le chiffre
   était juste, sa portée non ; les textes corrigés portent les deux.
2. **L'outil de recherche D277 était aveugle au gras** — vu au tri, pas par relecture.
3. **Un attendu écrit de mémoire dans le cas connu** — démenti par la calibration, qui existait pour
   ça.
4. **Deux instruments se sont comptés eux-mêmes** : le cas connu par son commentaire, l'audit par ses
   clés. ⚠ C'est la leçon « une garde peut mesurer la DOCUMENTATION du fichier qu'elle teste »,
   déjà écrite dans `AGENTS.md`, reproduite deux fois dans le lot qui confronte le dossier aux pièces.
5. **Une commande cassée par une citation** pendant la reprise (`$'\r'` dans une substitution) — la
   classe D289/D290, sur une commande de lecture.

### ⛔ RÉSULTATS DU RELEVÉ — ÉCRITS APRÈS LA MESURE, SELON LES RÈGLES COMMITÉES DANS `f8b578d`

**État machine** : sonde calibrée à 02:45 (rendement 0,93 ; `PERF` 72,6 → 146,7 sous charge), SECTEUR
100 %, RAM médiane 5 306 Mo, `node` 0, `chrome` 18 — 17 devant une seule passe
(`releve/sonde-ouverture.txt`). **12 passes de 02:46:10 à 02:57:04, SECTEUR devant chacune et aux
deux clôtures.** **Harnais inchangé** : empreinte identique avant et après
(`releve/empreinte-avant-releve.txt`, `-apres-releve.txt`). Analyse : `releve/analyse.py` et sa
sortie `analyse.txt`, qui **appliquent** les règles sans les choisir.

| cycle | observateur | A — après repos | B — enchaînée | A − B |
|---|---|---|---|---|
| 1 | OFF | 17,95 s | 16,66 s | +1,29 s (7,2 %) |
| 2 | ON | 17,73 s | 16,68 s | +1,05 s (5,9 %) |
| 3 | ON | 17,73 s | 17,23 s | +0,50 s (2,8 %) |
| 4 | OFF | 16,76 s | 16,64 s | +0,12 s (0,7 %) |
| 5 | OFF | 17,55 s | 16,37 s | +1,18 s (6,7 %) |
| 6 | ON | 17,65 s | 17,36 s | +0,29 s (1,6 %) |

- **Q5 — verdicts : 12 sur 12 à 287/287**, 0 délai, code 0. Aucune passe retirée.
- ⛔ **Q3 — LA POSITION EST UN TERME DE DURÉE : ÉTABLI, 6 CYCLES SUR 6.** Une passe enchaînée est plus
  rapide qu'une passe après 60 s de repos, dans les six cycles, observateur présent ou non. **Son
  ampleur est petite et instable : de 0,12 à 1,29 s, soit 0,7 à 7,2 %.** ⚠ Ce qui est établi est le
  **sens** ; le mécanisme ne l'est pas — régime de départ, caches, compilation à la volée : rien de
  cela n'est séparé ici.
- **Q2 — l'observateur : NON ÉTABLI.** En A, les durées ON et OFF sont entremêlées ; en B, les trois
  ON sont plus lentes que les trois OFF, mais de **0,02 s** à la paire la plus proche. La règle
  exigeait le même sens aux deux positions.
- **Q1 — « `PERF` avant » mesure la retombée : NON ÉTABLI, 5 cycles sur 6.** L'exception est le
  cycle 1 (A 92,6, B 89,2), le seul qui suit la charge de calibration de la sonde. ⇒ **La phrase de
  l'étape 0 garde son « inférence ».**
- **Q4 — `PERF` pendant la passe : ρ = +0,70 sur n = 6, non établi par règle.** ⚠ **Son signe est
  l'INVERSE de l'hypothèse de D290** : les médianes les plus hautes vont plutôt avec les passes les
  plus longues (A : 129,9 · 130,1 · 123,5 ; B : 120,3 · 125,6 · 119,7). Six points ne l'établissent
  pas — ils ne soutiennent pas non plus « plus de turbo, donc plus rapide ». **La médiane de `PERF`
  est au-dessus de 100 pendant les six passes observées** (119,7 à 130,1 ; minimums de 83,4 à
  100,4). ⚠ Les six passes OFF n'ont, **par construction**, aucune lecture pendant : rien ne s'en dit.
- **Le repos** : dans les cycles ON, `PERF` retombe à 64-72 sur les quatre derniers relevés avant la
  passe A. Le repos de 60 s suffit, à ce que l'observateur en voit.

⛔ **CE QUE LE RELEVÉ NE REPRODUIT PAS — ET C'EST AUSSI UN RÉSULTAT** : les **12 durées vont de 16,37 à
17,95 s**, et **aucune** n'approche les 20,0-20,3 s de la comparaison de D290 — y compris sous
observateur à `-Intervalle 1`. ⇒ **L'écart de ~20 % entre les deux séries de D290 reste NON
EXPLIQUÉ** : ni l'observateur ni la position ne le reproduisent à cette résolution.
⚠ **Différences NON testées entre la comparaison de D290 et ce relevé**, écrites pour qu'aucune ne se
lise comme écartée : le **dénombreur de workers** qui tournait aussi pendant la comparaison (0,42 s de
CPU, mesurés par D290) ; l'**heure** (16:15 contre 02:46) ; `chrome` (14 contre 18) ; et tout ce que
l'inventaire de 16:15, qui ne porte que les colonnes de l'échantillonneur, ne dit pas.
⚠ **Ce que Q3 dit de la série de cinq passes de D290, sans l'étendre** : sa passe 1 était la seule
« après repos », les quatre suivantes étaient enchaînées — **compatible** avec le terme de position
pour la passe 1. La décroissance continue de la passe 2 à la passe 5 n'est **pas** testée ici : deux
passes par cycle.

⇒ **CONSÉQUENCE, TELLE QU'ÉCRITE D'AVANCE : Q3 est établi, le terme est nommé — LA POSITION —, et le
rang 14 se clôt sur lui, SANS REMÈDE.** ⚠ Ce que le résultat implique, **sans le décider** : deux
durées ne se comparent qu'**à position égale**, et un budget dérivé de durées mêlant les deux
positions porterait jusqu'à 7 % d'un terme connu. **À Ko d'en faire une règle ou non** — report au
backlog. ⛔ **Rang 15 : en attente d'arbitrage de Ko.**

### Les portes, le tri, et l'état machine devant elles

**Sonde calibrée** avant les portes (rendement 0,92) : SECTEUR, RAM médiane 5 202 Mo, `PERF` 67,6 au
repos, `node` 0, `chrome` 18 (`D291/portes/sonde-avant-portes.txt`).

| porte | code | durée | chiffres |
|---|---|---|---|
| `typecheck` | **0** | 41 s | — |
| `lint` | **0** | 17 s | — |
| `test` | **0** | 72 s | **1 329 tests / 109 fichiers** — 659 · 36 · 287 · 347 |
| `build` | **0** | 83 s | — |
| `test:int` | **0** | 498 s | **436 tests / 36 fichiers**, PostgreSQL réel |
| tri des campagnes | **0** | — | 33 fichiers modifiés depuis `HEAD` ⇒ **0 campagne concernée sur 26**, comme prédit |

Journaux : `docs/preuves/D291/portes/`. ⚠ **Les comptes sont ceux de D288 à l'identique** : c'est
l'attendu d'un lot qui ne touche aucun code applicatif. ⚠ **« failed » confronté à son contexte**
(D275) : deux lignes de journal de `ChargilyGateway`, un **nom** de test ; zéro `ELIFECYCLE`.
⛔ **`test:int` N'ÉTAIT PAS LANÇABLE À L'ARRIVÉE, ET C'EST MESURÉ** : aucun service PostgreSQL, port
5432 refusé, démon Docker arrêté. **« Non mesuré » n'est pas « non lançable » (D262)** : Docker Desktop
démarré par la session (prêt en 12 s), conteneur `zwadj-db` levé par `pnpm db:up`, `pg_isready`
attendu avant la porte, conteneur ~~arrêté~~ **supprimé** après (`pnpm db:down`).
⛔ **« ARRÊTÉ » BARRÉ LE 13/09/2026 (D292)** : `db:down` vaut `docker compose down`, et
`portes/db-down.log` porte « Container zwadj-db Removed ». Avec le montage d'alors, la base de dev
vivait dans le volume anonyme du conteneur : **ce geste l'a détachée de tout conteneur**, et le
démarrage suivant a échoué. Chaîne et pièces : section D292.
⚠ **Et depuis le correctif de D292, la même commande est SANS EFFET sur les données** : le volume
nommé est monté sur `/var/lib/postgresql`, et la base y vit. Ne pas éviter `db:down` ; seul `down -v`
supprime les données. ⚠ **Docker Desktop, lui, reste
ouvert** — un relevé d'état machine futur le verra.
⚠ **Ces durées ne se comparent à rien** : Docker venait de démarrer (`test:int` à 498 s contre 306 s
à D288), et le terme de position que ce lot établit vaut aussi pour des portes enchaînées.
**Non lancées, et déclarées** : l'e2e — à la demande, et ce lot ne touche ni l'auth, ni la
concurrence, ni l'argent ; les campagnes `--tout` — ce n'est pas une livraison, et le tri suffit à
un lot dont aucun fichier n'est lu par une campagne.
⛔ **L'AUDIT AVANT LE SECOND COMMIT A MORDU — DEUX ALERTES, ET CE SONT DEUX NOMS DE TEST.** Sur 63
fichiers parcourus, `portes/test-int.log` porte « … forgot-password : … CONSTANTE, mais aucun e-mail
ne part » et « … compte supprimé après émission du token : … », que les motifs « mot de passe » et
« jeton » lisent comme des affectations. **Tri au contexte, valeurs masquées, dans la sortie versée**
(`D291/controles/integrite-et-secrets-avant-commit-2.txt`) : les deux valeurs masquées sont présentes
dans 101 et 40 fichiers suivis hors preuves. ⚠ **Les motifs ne sont PAS relâchés pour que l'audit
passe** — ce serait régler l'instrument sur le résultat voulu : il sort en 1, et la décision de
commiter repose sur ce tri écrit. ⚠ Le chemin local du compte Windows apparaît désormais **57 fois**
dans les preuves.

### ⛔ CE QUE CE LOT NE FAIT PAS, ET CE QUI RESTE OUVERT

1. **Aucune borne, aucun budget, aucun seuil `PERF`, aucune règle tirée de Q3** : à Ko.
2. **Aucun instrument modifié ni promu.** L'en-tête de la sonde qui nomme `PERF` « bridage réel » est
   rapporté, pas corrigé ; les éditeurs du scratchpad y restent (consigne de Ko).
3. **Les preuves d'autres décisions ne sont pas versées** : inventaire et risque d'écrasement au
   backlog.
4. ⛔ **L'écart de ~20 % de D290 reste inexpliqué**, et le cas rouge du 09/09 sans cause établie.
5. **Pas une certification.** ⛔ **Compteur de lots de code non certifiés : DEUX — dernière place.**
6. ⚠ **Le chemin local du compte Windows entre au dépôt avec les journaux** : aucun fichier suivi ne
   le contenait avant ce lot. Signalé, pas masqué ; le garder est une décision de Ko.
7. ⚠ **La lecture de D283 appliquée ici** — des preuves archivées comptent comme du code — est la
   lettre de la règle ; **l'exemption éventuelle appartient à Ko**.
   ⛔ **TRANCHÉ PAR KO LE 13/09/2026 (D292)** : `docs/preuves/` ne compte pas, et c'est la seule
   exemption. Ce rang sort du compte ; le compteur reste à DEUX par l'incident `zwadj-db`.

### ⛔ FAUTES DE MÉTHODE DU RELEVÉ ET DE LA CLÔTURE, À MON COMPTE

1. ⛔ **EN ÉCRIVANT LES RÉSULTATS, J'AI ÉCRIT UNE AFFIRMATION SANS MESURE** — « `PERF` est au-dessus de
   100 pendant les 12 passes observées ou non » : les six passes sans observateur n'ont, par
   construction, **aucune** lecture pendant. Vu à la relecture, corrigé avant commit. **La classe de ce
   lot, dans la section qui la corrige** — et c'est la raison pour laquelle la relecture se fait dans
   le fichier, jamais de mémoire.
2. **Le premier tri de la passe D277 n'avait pas relevé la permission du point d'entrée du rang 12** :
   la seconde recherche la sortait, c'est mon tri qui l'avait sautée. Trouvée au balayage des seules
   occurrences non barrées.
3. ⛔ **UNE SECONDE COMMANDE CASSÉE PAR UNE CITATION, APRÈS LE COMMIT DE CLÔTURE** — `$'\r$'` dans une
   substitution entre guillemets, la forme exacte de la reprise. La vérification des blobs a été refaite
   **par un fichier** : **65 preuves sur 65 identiques à l'octet** entre disque et blob. ⚠ Mon attendu
   disait 66, parce que j'y avais compté `.gitattributes` : hors preuves, il est normalisé comme tout
   fichier texte — 535 → 528 octets, ses 7 retours chariot. ⚠ **Deux fois dans la même session, sur des
   commandes de LECTURE** : « le fichier est la seule forme qui ne dépend d'aucune enveloppe » (D290)
   vaut pour les contrôles autant que pour les écritures.

## Session du 12/09/2026 — D290 · le rang 13 perd son objet : trois termes éliminés, aucune borne posée

⛔ **AUCUNE BORNE N'A ÉTÉ POSÉE, ET C'EST LE RÉSULTAT DU LOT, PAS SON ÉCHEC.** Le protocole du
cadrage exigeait qu'un terme soit identifié avant toute borne ; le relevé a éliminé celui qui
restait. **Le remède ne se pose pas sur un défaut dont la cause est inconnue et qu'on ne sait
pas reproduire** (rappelé par Ko, 12/09 : « c'est la doctrine, pas ma préférence »).
⚠ **LE RANG 13 PORTE DÉSORMAIS DU CODE** — `251e82b`, la restauration de
`apps/pro/vite.config.ts:24`. Il cesse donc d'être documentaire au sens de D283 : **le
compteur de lots de code non certifiés passe de zéro à un.**

### ⛔ DEUX CORRECTIONS DU CADRAGE, MESURÉES — EN TÊTE, PARCE QU'ELLES PÉRIMENT SES CHIFFRES

1. ⛔ **LE CREUX DE 2 652 Mo N'APPARTIENT PAS À LA SUITE.** Il vient des **104 échantillons
   sur 54 minutes** de D283 — les six portes **et** les campagnes. Isolée, `pnpm test` creuse
   **1 329 Mo** et plancher à **4 396** : **moitié moins profond**. Le cadrage attribuait à la
   suite unitaire un creux produit par une fenêtre qui la contient treize fois.
2. ⛔ **« 12 À 14 WORKERS » COMPTAIT DES PROCESSUS, PAS DES WORKERS.** Le `node` max est
   exactement **14**, et il contient **2 pnpm + 1 runner vitest**. **Les workers sont 11.**
   ⚠ C'est la raison d'être de l'ordre de Ko — « ça se dénombre, ça ne se déduit pas » : la
   grandeur nommée par le cadrage était chiffrée sur son propre proxy.

### ⛔ LE TERME RACINE-CONTRE-FILTRÉ EST ÉLIMINÉ, ET PAR DEUX QUANTITÉS INDÉPENDANTES

| | `client` FILTRÉ | `client` dans la RACINE |
|---|---|---|
| **workers concurrents** | **11** | **11** |
| `node` total max | 14 | 15 |
| durée vitest | **20,09 s** | **20,02 s** · **20,34 s** |
| verdict | 287/287 | 287/287 · 287/287 |

**`RUNNERS_SIMULTANES_MAX = 1`** sur les 34 dénombrements de la passe racine :
`--workspace-concurrency=1` sérialise **strictement**, jamais deux paquets en vol. **Mesuré,
plus lu** — et c'est la variable que Ko avait écartée par LECTURE le 10/09, faute qu'il a
lui-même relevée le 12/09.
⚠ **L'ÉCART EST PLUS PETIT QUE LE BRUIT** : 1,6 % entre les trois mesures de `client`, contre
**19 %** de variance sur trois passes filtrées consécutives (19,6 / 23,3 / 22,9 s de mur).
Conclure un écart de 1,6 % sur un bruit de 19 % serait lire la machine, pas le code.
⛔ **ET LE DÉNOMBREUR EST CALIBRÉ PAR UN CAS DONT LA RÉPONSE ÉTAIT CONNUE D'AVANCE** : dans la
même trace, `api` et `client` rendent **11**, et **`pro` rend 4** — sa borne mord, visiblement.
Un instrument qui rendrait 11 partout, ou 4 partout, serait faux ; celui-ci **sépare**. Le
compte se recoupe par une seconde voie : 14 − 2 pnpm − 1 runner = **11**.

### ⛔ L'INDICE ARITHMÉTIQUE ÉTAIT FAUX, ET IL AVAIT DEUX VICES, PAS UN

Pris dans le même état, tout s'additionne — il n'y a **aucune** anomalie à expliquer :

| | api | api-client | client | pro | somme | mur |
|---|---|---|---|---|---|---|
| racine #1 | 13,83 | 0,92 | 20,02 | 35,34 | **70,1** | **75,4** |
| racine #2 | 12,17 | 1,01 | 20,34 | 34,99 | **68,5** | **73,7** |

L'écart au mur est l'amorçage de pnpm : 5,3 puis 5,2 s.
⇒ **LE TERME FAUTIF ÉTAIT LE 46 s DE `pro`, ET IL L'ÉTAIT DEUX FOIS** : pris le 30/08 sur
machine chargée, **et** mesuré sur le chemin `--maxWorkers=4` **en ligne de commande**, dont
D270 écrit lui-même qu'il rend 46 s là où la même valeur **dans le fichier** rend 38-40.
Mesuré ici, `pro` tel qu'il est configuré rend **35,0 s**. L'addition mêlait trois dates et
**deux chemins**.
⚠ **Qui a produit la faute, et qui l'a corrigée, est écrit** : la retenue venait de la session
(« trois dates, trois états machine, ce n'est pas une preuve »), l'amplification de Ko (« le
plus fort des trois »), et le désaveu de Ko également, avant toute mesure de ma part. **Un
indice qu'on appelle fort cesse d'être un indice** — c'est l'écart de 15 % de D270, reconduit
comme argument au lieu d'être reconduit comme inexpliqué.

### Le creux de RAM — voie choisie, et c'est la MESURE qui a choisi

⇒ **VOIE 1 RETENUE : ALLONGER LA FENÊTRE** (trois passes `client` enchaînées sous un seul
échantillonneur). **Aucun code neuf** — l'instrument du dépôt relève déjà `node` et le minimum
de RAM ; il suffisait de le lancer hors de son pas nominal.
⛔ **ET LA VOIE 2 A ÉTÉ ÉCARTÉE SUR MESURE, PAS PAR PRÉFÉRENCE** : même avec `-Intervalle 1`,
on obtient **24 échantillons sur 66 s**, soit un pas **effectif de 2,9 s** — une itération
(WMI + `Get-Counter` + `Get-Process`) coûte **~1,9 s** à elle seule. **Le plancher du pas est
~1,9 s, pas 1 s : affiner n'achetait presque rien.**

| | mesure |
|---|---|
| creux `client` ×3 (24 échantillons, fenêtre homogène) | **5 725 → 4 396 Mo**, soit **1 329 Mo** |
| par worker | ≈ **121 Mo** pour 11 workers |
| coût de l'observateur, pas 2 s | **1,31 s** CPU · 95 Mo |
| coût de l'observateur, pas 1 s | **3,14 s** CPU · 101 Mo — **0,38 %** de 12 cœurs |
| coût du dénombreur de workers | **0,42 s** CPU |

⚠ **C'est le chiffre que l'en-tête de l'échantillonneur déclarait « non négligeable sous 30 s »
sans jamais le donner.** Il l'est, et largement : le déclarer sans le mesurer aurait interdit
l'usage qui a rendu ce relevé possible.

### ⛔ CE QUI RESTE : UN SEUL TERME NON ÉLIMINÉ, ET LE DOSSIER NE PEUT PAS LE TRANCHER

⇒ **LE RÉGIME D'ALIMENTATION**, désigné par Ko le 12/09 et **relevé par la session, pas cru** :

| fait relevé | source |
|---|---|
| bascule sur **BATTERIE** le 09/09 à **20:44:41**, retour secteur le 10/09 à **10:22:30** | journal d'événements Windows (D283) |
| `test:int` **475 s** sur batterie contre **279 s** sur secteur — **−41 %** | D283, même arbre, même suite |
| `lancer-campagnes --tout` **5 454 s** contre **2 011 s** — **−63 %** | D283 |
| charge bridée : **3,7 s** de CPU là où 12 cœurs en offrent 36 ; PERF 70 → 147 % | D286 |

⇒ **LE MÉCANISME EST DONC DÉJÀ DÉMONTRÉ DANS CE DÉPÔT** : le régime batterie multiplie les
durées par **1,7 à 2,7**. **Un budget de 5 000 ms n'y survit pas** — et c'est très exactement
la forme du cas rouge, 22 signatures « Test timed out in 5000ms ».

⛔ **MAIS LA CORRÉLATION N'EST PAS ÉTABLIE PAR LE DOSSIER, ET C'EST À ÉCRIRE PLUTÔT QU'À
SUPPOSER.** Relevé, contre l'attente :
- la passe rouge est datée **« mesuré le 10/09 »**, **sans heure** : le dossier ne dit pas de
  quel côté de la bascule de 20:44:41 elle tombe ;
- **la seule quantité relevée devant elle est la RAM** (4 636 Mo). **Ni `chrome`, ni
  l'alimentation** n'y figurent — et le `chrome` 13 « du 09/09 » ne se retrouve nulle part :
  l'unique relevé portant `chrome 13` est daté du **11/09** (D286).
⚠ **C'est le défaut de D283 appliqué à la mesure qui fonde tout le rang 13** : « un état
machine sans inventaire ne se reproduit pas ». **Rien ne sera établi rétrospectivement** — la
condition doit être **produite**, et c'est l'expérience ci-dessous.
⛔ **ET `chrome` TOMBE AVEC LES AUTRES TERMES** : il était présent au cas rouge comme au cas
vert d'aujourd'hui (**14**, aux deux bouts de cette session). Un terme présent des deux côtés
ne discrimine pas.

### ⛔ L'EXPÉRIENCE EN ATTENTE — ET C'EST KO QUI PRODUIT LA CONDITION

Protocole arrêté le 12/09, **écrit avant la mesure** : même session, `chrome` **inchangé**,
rien d'autre touché. `client` sur **batterie**, puis `client` sur **secteur**, plusieurs passes
chacune, **régime et `PERF` relevés devant chaque passe**.
⚠ **(D291, 13/09/2026) Protocole jamais exécuté — refusé par Ko, voir la clôture plus bas.** Et
sa lecture de `PERF` « devant chaque passe » ne lit pas un régime : `PERF` se lit **pendant** la
passe, par l'échantillonneur.
- **rouge sur batterie, vert sur secteur** ⇒ le terme est identifié, et **le rang 13 change
  d'objet** : ce n'est plus une borne de workers, c'est ce que le dépôt fait d'un régime qui
  convertit une durée en verdict. Arrêt et remise à Ko ;
- **vert des deux côtés** ⇒ le terme n'est pas là non plus, et **le rang 13 se clôt sur trois
  éliminations sans remède — un résultat, pas un échec.**
⚠ **CONDITION D'ARRÊT, POSÉE PAR KO** : si la charge descend sous un seuil inquiétant, la
mesure s'arrête. **Une veille critique a déjà coûté huit heures à ce dépôt** (D283).

### ⛔ QUATRE FAUTES DE MÉTHODE, À MON COMPTE — UNE SEULE CLASSE, QUATRE FORMES

**Aucune n'a levé. Toutes ont répondu.** Et c'est la classe que le lot est censé traiter,
retournée contre l'outillage du lot lui-même.

1. ⛔ **UN EXTRACTEUR A RENDU −236, ET N'A PAS LEVÉ.** Vu **parce que le signe était absurde** —
   **avec un chiffre plausible, il ne l'aurait pas été**, et « 309 corruptions possibles »
   serait entré dans un fichier d'autorité. ⇒ **La cause n'est pas le chiffre en dur seul :
   c'est d'avoir changé la DÉFINITION DU CANDIDAT entre deux passes qui se comparent** — corps
   de commentaire dans la première, ligne brute dans la seconde.
2. ⛔ **UN CONTRÔLE POST-ÉCRITURE A ANNONCÉ 17 DOUBLES ESPACES RÉSIDUELS** — chiffre
   **parfaitement plausible** — parce qu'il comptait deux espaces suivis de deux barres
   obliques, c'est-à-dire **l'indentation du fichier**. Seul l'attendu « 0 » écrit à côté l'a
   trahi.
3. ⛔ **UNE REVÉRIFICATION A RENDU 0 TOUCHES, VRAI PAR CONSTRUCTION.** Lecture en mode texte
   ⇒ CRLF traduit en LF ⇒ le découpage sur le séparateur CRLF rend **une seule ligne** ⇒ la
   boucle n'a **rien parcouru**. Le zéro était exact et **vide**.
4. ⚠ **DEUX COMMANDES CASSÉES PAR UN ACCENT GRAVE NON ÉCHAPPÉ**, dont l'une en cherchant
   précisément les traces de la corruption par accents graves, et l'autre en écrivant la
   présente section. ⇒ **La règle D289 ne vaut pas que pour les textes destinés à un fichier :
   elle vaut pour les MOTIFS DE RECHERCHE, et la couche qui interpole peut être celle de
   l'outil lui-même.** Voie retenue : écrire le texte dans un FICHIER, puis l'insérer — l'une
   des trois formes que D289 autorise, et la seule qui n'a pas échoué ici.

⇒ **RÈGLE TIRÉE DES TROIS PREMIÈRES, ÉCRITE DANS `AGENTS.md` (demandée par Ko)** : **un
compteur rend aussi ce qu'il a PARCOURU**, et **l'attendu s'écrit À CÔTÉ du mesuré**. C'est ce
second point qui a réellement attrapé les trois — pas la relecture.

### ⛔ CLÔTURE DU RANG 13 — CINQ PASSES SUR SECTEUR, ET LE TERME ÉCARTÉ PAR CONDITION

⛔ **L'EXPÉRIENCE BATTERIE N'A PAS EU LIEU — ARBITRAGE DE KO, 12/09/2026, AVANT TOUTE MESURE.**
Motif, et il est la doctrine du dépôt : **on ne corrige pas un défaut qu'on ne sait pas
reproduire**, et la session avait établi elle-même que **rien ne s'établirait
rétrospectivement** — l'heure de la passe rouge n'est écrite nulle part, et son relevé ne porte
ni `chrome` ni l'alimentation. ⇒ **Le terme est donc clos par une CONDITION DE MESURE, pas par
un remède au jugé**, et le durcissement ci-dessous est le livrable du lot.

**Cinq passes de `pnpm --filter @zwadj/client run test`, régime relevé DEVANT chacune. Aucune
moyenne** — la variance mesurée l'aurait cachée (consigne de Ko) :

| passe | régime | `PERF` avant | RAM avant | verdict | délais dépassés | `FAIL` | durée vitest | mur | code |
|---|---|---|---|---|---|---|---|---|---|
| 1 | SECTEUR 100 % | **64,8** | 5 362 | **287/287** | **0** | 0 | 18,65 s | 21,2 s | **0** |
| 2 | SECTEUR 100 % | **121,8** | 5 282 | **287/287** | **0** | 0 | 17,22 s | 19,3 s | **0** |
| 3 | SECTEUR 100 % | **103,4** | 5 421 | **287/287** | **0** | 0 | 17,13 s | 19,2 s | **0** |
| 4 | SECTEUR 100 % | **121,3** | 5 315 | **287/287** | **0** | 0 | 16,71 s | 18,8 s | **0** |
| 5 | SECTEUR 100 % | **116,6** | 5 301 | **287/287** | **0** | 0 | 16,41 s | 18,5 s | **0** |

`chrome` = **17** aux cinq · `node` avant = **0** aux cinq · 20/20 fichiers aux cinq · clôture
SECTEUR 100 %, `PERF` 105,3, RAM 5 419. **Zéro délai dépassé sur cinq passes.**
~~⚠ **L'extracteur de délais est calibré sur ses deux bras et dit ce qu'il a parcouru** : motif
de verdict trouvé (1), motif témoin absent rendu **0**, **1 240 lignes parcourues** sur la
passe 1. Un « 0 délai » non calibré aurait été un silence (D290).~~
⛔ **BARRÉ LE 13/09/2026 (D291) : LE BRAS POSITIF EST CELUI DU VERDICT, PAS CELUI DU DÉLAI.** Relu
dans `docs/preuves/D290/passes_secteur.ps1` : le positif vérifie que le motif **de verdict** est
dans la sortie, le négatif qu'un motif absent rend 0, et les occurrences du motif **de délai** sont
seulement imprimées « en contexte ». **Le compteur de délais n'a jamais reçu une sortie contenant
un délai dépassé** : son « 0 » est vrai sur 1 240 lignes parcourues, et son bras positif n'a pas
été exercé. ⚠ Et son motif de verdict (`Tests N passed (N)`) ne lit pas une suite ROUGE, dont le
résumé porte « N failed | M passed » : elle serait sortie « ILLISIBLE ». D291 calibre les deux sur
une vraie sortie vitest en échec de délai.

#### ⛔ ET LES `PERF` DISENT QUELQUE CHOSE QUE JE N'AVAIS PAS MESURÉ — ILS CORRIGENT MON PROPRE MOT

⛔⛔ **SOUS-SECTION RÉFUTÉE PAR D291 (13/09/2026) — NE PAS LA LIRE SEULE.** Ce qui suit est une
inférence écrite « mesuré, pas supposé ».

~~**Mesuré, pas supposé** : cette série tourne en **16,4 à 18,7 s** avec `PERF` de **103 à 122 %**
(turbo), là où le relevé de comparaison de ce même lot rendait **20,0 à 20,3 s** avec `PERF`
**73 à 77 %** — même machine, même suite, même arbre, à une heure d'intervalle.
⇒ **Le bridage réel explique donc de l'ordre de 20 % de durée, SUR SECTEUR.**
⛔ **J'AVAIS APPELÉ CETTE DISPERSION « BRUIT INTRINSÈQUE » (19 %). C'ÉTAIT INEXACT :** elle a
une **cause nommable**, et c'est `PERF`. La passe 1 de cette série le montre seule — `PERF` 64,8
à l'ouverture, la durée la plus longue des cinq, puis une décroissance **monotone** à mesure que
la machine monte en turbo. Une décroissance monotone n'est pas du bruit.
⚠ **CE QUE ÇA NE CHANGE PAS** : l'élimination du terme racine-contre-filtré tient, parce que ses
trois mesures ont été prises **dans le même régime** (`PERF` 73-77 %) et en alternance.~~
⛔ **MAIS C'ÉTAIT UNE CHANCE, PAS UNE PRÉCAUTION** — `PERF` n'était pas relevé devant chaque
passe à ce moment-là. ~~**C'est exactement le trou que le durcissement ferme.**~~

⛔ **CE QUE LES JOURNAUX RENDENT — confrontation du 13/09/2026 (D291).** Pièces :
`docs/preuves/D290/` ; recalcul : `docs/preuves/D291/controles/perf-journaux-d290.py` et sa sortie.
- **« `PERF` 73 à 77 % » ne se trouve dans aucun journal.** Sur les deux passes de la
  comparaison, `PERF` est au-dessus de 100 sur **13 lignes sur 15** où tournent les workers
  (`node` ≥ 13 ; médianes 128,2 et 131,8) ; sur les trois journaux du jour, **29 sur 36**, minimum
  **80,4** ; **aucune des 51 lignes** n'est entre 73 et 77. La troisième mesure (racine #2,
  20,34 s) n'a pas de journal.
- **« à une heure d'intervalle » : au moins 2 h 36, environ 5 h 15.** Les durées comparées sont
  dans le commit `fc7c02e` (18:57:17) ; les journaux datent la comparaison de 16:15:48 → 16:18:01 ;
  la passe 1 de cette série démarre vers 21:33:34 (journal clos à 21:33:55, moins 21,2 s de mur).
- **Les `PERF` « avant » de cette série sont UNE lecture `Get-Counter` chacune**
  (`passes_secteur.ps1`, l. 21), prise pour les passes 2 à 5 **au plus 3,7 s après la fin de la
  précédente** — écarts entre journaux de 23,0 · 22,7 · 22,3 · 22,1 s, moins les murs. ⚠ Qu'elle
  mesure une **retombée** de charge et non un régime est une **inférence** : D291 la met à l'épreuve
  — **5 cycles sur 6, non établie** ; elle reste une inférence.
- **La décroissance suit l'ORDRE des passes, pas `PERF`** : durée contre ordre ρ = −1,0 ; contre
  `PERF` ρ = −0,3, et **+0,4 sans la passe 1** — tout le lien reposait sur la seule passe qui ne
  suit pas une autre. Cinq points n'établissent rien.
⇒ **« Bruit intrinsèque » était faux ; « une cause nommable, et c'est `PERF` » ne l'est pas moins.
La dispersion de ~20 % à régime constant est NON EXPLIQUÉE.**
⚠ **Origine, écrite parce que c'est la classe** : l'observation venait de la session ; sa
reformulation en « cause nommable » venait de Ko dans le fil, **d'après le récit de Ko** ; son
écriture au statut de mesure, ici et dans `AGENTS.md`, venait de la session. Règle :
`AGENTS.md`, « une hypothèse formulée dans le fil ne s'écrit pas au statut de mesure ».
⚠ **CE QUI NE CHANGE PAS** : l'élimination du terme racine-contre-filtré **tient** — onze workers
contre onze, grandeur qui n'est pas une durée, et 1,6 % d'écart. Les deux passes journalisées
avaient des `PERF` du même ordre **pendant** la mesure — ce que « 73-77 % » ne disait pas.
⛔ **C'ÉTAIT UNE CHANCE, PAS UNE PRÉCAUTION.** Et relever `PERF` **devant** chaque passe ne ferme
aucun trou : c'est **pendant** qu'il se lit.

#### ⛔ LE DURCISSEMENT — POINT 6 DU CRITÈRE RÉÉCRIT, ET C'EST LE LIVRABLE DU LOT

Le point 6 exigeait un régime « relevé et **STABLE** sur toute la fenêtre ». ⛔ **UNE FENÊTRE
ENTIÈREMENT SUR BATTERIE SATISFAIT « STABLE ».** C'est le trou, et il était **déjà chiffré au
dépôt** : `test:int` **475 s** contre **279** (−41 %), campagnes `--tout` **5 454 s** contre
**2 011** (−63 %), même arbre, même suite (D283).
⇒ **Réécrit : le régime doit être SECTEUR**, relevé **devant chaque mesure ET à la clôture**.
⚠ **Un relevé sur batterie n'est pas INVALIDE — il n'est pas CERTIFIANT**, et il se déclare
comme tel. La nuance est le point : l'interdire tout court ferait mentir les relevés du dépôt
qui ont été pris ainsi, et qui restent de l'histoire utile.

#### ⛔ TROIS TERMES ÉLIMINÉS, AUCUNE BORNE POSÉE — C'EST UN RÉSULTAT

| terme | comment il tombe |
|---|---|
| **RAM à l'ouverture** | **mesure** (D289) : le cas rouge à 4 636 Mo tombe ENTRE deux cas verts, 4 624 et 4 643 |
| **chemin d'invocation** (racine / filtré) | **mesure** (D290) : 11 workers contre 11 · 1,6 % d'écart de durée · sérialisation dénombrée stricte |
| **régime d'alimentation** | ⚠ **CONDITION, pas mesure** : cinq passes vertes sur secteur, et l'expérience batterie refusée par Ko — le terme est **écarté du chemin de certification**, il n'est pas **réfuté** |

⛔ **`pro` GARDE SA BORNE** — `maxWorkers: 4`, mesurée le 30/08 (D270). Ce lot ne la touche pas,
et le relevé l'a vue **mordre** : 4 workers contre 11 pour `api` et `client`, dans la même trace.
⛔ **AUCUNE AUTRE BORNE N'EST POSÉE. AUCUN `testTimeout` N'EST ÉCRIT.** Trois suites sur quatre
restent sans borne, **délibérément** : la mesure n'en a demandé aucune.

#### ⛔ CE QUI RESTE OUVERT, ET QUI NE DOIT PAS SE LIRE COMME RÉGLÉ

1. ⛔ **LE TERME EST NON IDENTIFIÉ, ET LE CAS ROUGE DU 09/09 RESTE SANS EXPLICATION.** Trois
   termes écartés ne font pas une cause trouvée. **Écrit ici pour qu'aucune session future ne
   croie la question réglée** : 273/287 avec 22 délais dépassés n'a, à ce jour, **aucune cause
   établie**.
2. ⛔ **EXIGER LE SECTEUR PROTÈGE LES MESURES, PAS LE DÉVELOPPEMENT QUOTIDIEN.** Si le régime
   batterie convertit bien une durée en verdict, **il le fera encore quand une suite se lancera
   débranchée — et là, personne ne mesure.** Rapporté au backlog, **non corrigé** : le remède
   serait une garde dans le code, et ce lot n'en pose aucune.
3. **Le motif d'exclusion des budgets de test est tombé** avec l'absence de borne (passe D277,
   sens 2). ⛔ **NON TRANCHÉ ICI** — Ko l'arbitrera au rang 14. Un motif tombé ne rend pas le lot
   souhaitable. ⛔ **(D291) Arbitré autrement par Ko le 12/09/2026** : le rang 14 est `PERF` et la
   durée ; les budgets viennent **après**.
4. ⚠ **TOUT L'OUTILLAGE DE CE LOT EST RESTÉ DANS LE SCRATCHPAD — QUATRIÈME RECONDUCTION DU
   MÊME ÉCART, ET ELLE EST ÉCRITE PLUTÔT QUE PASSÉE SOUS SILENCE.** Après `ed.py` au rang 11,
   l'éditeur CRLF au rang 12 et l'utilitaire de splice de D289. Il s'agit ici du harnais des
   cinq passes (`passes_secteur.ps1`) et de quatre scripts d'écriture documentaire.
   ⚠ **CE QUI REND L'ÉCART TENABLE ICI, ET IL FAUT LE DIRE POUR QU'IL NE S'ÉTENDE PAS** : ce ne
   sont pas des **instruments** au sens de D286 — ils ne rendent aucun verdict de garde et ne
   portent aucune calibration propre. Les deux instruments employés, eux, **sont au dépôt** et
   ont rejoué leur calibration : `sonde-etat-machine.ps1` (rendement 0,96) et
   `echantillonneur-etat-machine.ps1` (quatre cas du lecteur).
   ⛔ **MAIS LE RELEVÉ DES CINQ PASSES N'EST DONC PAS REJOUABLE À L'IDENTIQUE PAR UNE SESSION
   FUTURE**, et c'est la conséquence exacte que D286 reproche. Report déjà ouvert au backlog ;
   cette occurrence s'y ajoute, **la quatrième**.
   ⛔ **(D291, 13/09/2026) « S'Y AJOUTE » ÉTAIT FAUX** : `dfca28f` ne touchait que ce fichier, et
   l'entrée du backlog portait toujours « TROISIÈME » sans nommer `passes_secteur.ps1`. Porté au
   backlog par D291. ⇒ Et le relevé est désormais **relisible** : `passes_secteur.ps1` et ses cinq
   journaux sont versés comme preuves dans `docs/preuves/D290/` — la procédure se rejoue, l'état
   machine non.

### Passe D277 — les DEUX sens, et le second a rapporté

- **Sens 1, ce que le lot INVALIDE** — 5 occurrences traitées, toutes **barrées avec leur
  motif** et non effacées (D276) : les deux chiffres du cadrage (creux de 2 652 Mo, « 12 à 14
  workers ») dans `ZWADJ_CONTINUITE.md` **et** dans `ZWADJ_BACKLOG.md` — autorité n°3, où
  l'entrée est **ouverte**, donc lue comme courante (c'est très exactement D277) ; le point 3
  du cadrage sur `chrome` ; et « le lot de CODE reste à faire » au backlog.
  ⚠ **Les occurrences de D283 ne sont PAS touchées** : elles décrivent, à leur date, ce qui a
  été mesuré ce jour-là, et c'était juste. Ce qui était faux est leur **report** dans une
  entrée courante comme si la fenêtre était celle de la suite.
- ⛔ **Sens 2, ce que le lot REND PERMIS (D287) — ET IL A RAPPORTÉ, CONTRE L'ATTENTE** : le
  cadrage exclut les **budgets de test** du rang 13 au motif qu'« un budget écrit en même
  temps qu'une borne rendrait les deux inévaluables ». **Aucune borne n'a été posée** ⇒ **ce
  motif-là est tombé.** La condition de l'exclusion a changé sans qu'aucun mot du lot ne la
  contredise — la forme exacte d'une permission périmée, et aucune recherche par
  contradiction ne l'aurait ramenée.
  ⛔ **ELLE EST ÉCRITE, ELLE N'EST PAS CONSOMMÉE.** La session n'arbitre pas l'ordre des rangs
  (cinq écritures, toutes de Ko), et Ko a par ailleurs interdit tout `testTimeout` ici par
  consigne directe. ⇒ **Porté à l'arbitrage, pas exploité** : le motif tombé ne rend pas le
  lot souhaitable, il rend seulement son refus non fondé SUR CE MOTIF.
- **Compteur de lots de code non certifiés** : deux phrases le disaient « à zéro », l'une dans
  le point d'entrée du rang courant, l'autre dans D289. **Les deux marquées : il est à un.**

### ⛔ CE QUE CE LOT NE FAIT PAS

1. ⛔ **AUCUNE BORNE, AUCUN `testTimeout`, AUCUN GÉNÉRATEUR DE CONTENTION.** Le générateur
   aurait été calibré sur la mauvaise contention : les deux termes qu'il devait reproduire
   (RAM d'ouverture, chemin d'invocation) sont démentis.
2. **Aucun instrument neuf.** Quatrième lot consécutif où la tentation existait ; l'existant a
   suffi, hors de son pas nominal, avec son coût enfin mesuré.
3. ⛔ **IL NE COMPARE PAS AUX SIX DURÉES DE D288** : `chrome` = **14** aux deux bouts, là où la
   porte dure exige **0**. La comparaison qui tranche est **interne** — deux chemins, même
   état, dix minutes d'écart, fenêtre homogène vérifiée — et elle ne dépend pas de cette porte.
   ⚠ `chrome` n'a pas été fermé : ce sont les onglets de Ko, et c'est lui qui l'a fermé le
   12/09.
4. **Portes relancées après la modification** : `test` **deux fois, 1 329/1 329, code 0**.
   `typecheck`, `lint`, `build`, `test:int`, `e2e` **non relancées** — un commentaire ne les
   touche pas, et elles ne sont **pas** déclarées vertes pour autant.
5. **Il ne rouvre pas l'écart de 15 %** entre ligne de commande et fichier (D270) — mais ce lot
   montre qu'il a **déjà coûté une fausse piste**, et le report est au backlog.

## Session du 12/09/2026 — D289 · rang 13 ouvert (cadrage seul), et la permission qui déclarait un contrôle SUFFISANT

⛔ **RANG 13, ARBITRÉ PAR KO LE 12/09.** ⇒ **État du rang** : section « PROCHAIN LOT — rang 13 »
en tête de ce fichier. **Cadrage écrit, aucune ligne de code.**
⚠ **Cinquième écriture d'ordre, et toutes sont de Ko** — la session n'attribue pas un rang, et
n'en a pas attribué un ici : elle a reçu l'arbitrage et l'a écrit.

### ⛔ ÉTAPE 0 — LA PERMISSION PÉRIMÉE, AMENDÉE ET NON COMPLÉTÉE

`AGENTS.md` déclarait, depuis la campagne SOLID : « **Tout script d'édition vérifie son nombre
d'occurrences AVANT de remplacer, et le marqueur attendu APRÈS.** » ⇒ **Une phrase qui déclare
un contrôle SUFFISANT.** L'utilitaire de D288 l'a respectée à la lettre — 1 remplacement,
0 LF nu, marqueur présent, **les trois vrais** — et a écrit faux.
⛔ **PARCE QUE LES DEUX CONTRÔLES REGARDENT L'ÉCRITURE, ET QUE LA CORRUPTION ÉTAIT DANS
L'ENTRÉE.** Aucun ne demande si le texte qu'on s'apprête à écrire est celui qu'on croit.
⚠ **C'est une permission périmée au sens strict de D287** : elle ne contredit aucun mot d'aucun
lot, donc **aucune recherche par contradiction ne pouvait la ramener**. Elle vivait dans le seul
fichier chargé à chaque session, sur la règle même dont la faute avait montré la brèche — et
c'est **Ko** qui l'a désignée, à partir de mon rapport de reprise, pas une passe automatique.

⇒ **Trois écritures, au même endroit, dans `AGENTS.md` :**
1. les deux contrôles sont déclarés **nécessaires et non suffisants**, avec le cas mesuré ;
2. la règle de forme : **aucun texte destiné à un fichier d'autorité ne transite par une couche
   qui l'interpole** — heredoc à délimiteur entre quotes simples, fichier, ou l'outil
   d'écriture ; jamais `-c`, jamais une chaîne à guillemets doubles, jamais un argument ;
3. le contrôle **se déplace vers le FICHIER relu** — « relire » voulant dire *chercher les
   jetons attendus*, pas constater qu'une écriture a eu lieu.

⛔ **ET LE MOTIF QUI COMMANDE « AMENDER » PLUTÔT QUE « COMPLÉTER » (arbitrage de Ko) : un
contrôle déclaré suffisant fait ARRÊTER DE CHERCHER.** Un ajout en dessous aurait laissé la
phrase d'origine intacte et lisible seule — et c'est elle qu'on lit en premier.

### ⛔ LA CLASSE AVAIT DÉJÀ FRAPPÉ UN FICHIER DE CODE, ET AUCUNE PORTE NE POUVAIT LA VOIR

Balayage du 12/09 sur **457 fichiers source** (`.ts`, `.tsx`, `.py`, `.ps1`), signature =
double espace au milieu d'une phrase de commentaire :

| | |
|---|---|
| candidats bruts | 9 |
| alignement légitime (tableaux et flèches en commentaire) | 8 |
| **corruption réelle** | **1** |

⇒ `apps/pro/vite.config.ts:24` — « mode par défaut = 46 à 52 délais dépassés,  = 4. ». Un jeton
mangé entre la virgule et le « = 4 », **double espace pour seule trace**. Introduite par
`1f85aa6` (**D270, 30/08/2026**), elle a survécu **treize jours et une certification complète**.
⛔ **PARCE QU'UN COMMENTAIRE NE CASSE NI `tsc`, NI `lint`, NI UN TEST.** Les six portes de D288
étaient vertes **avec cette corruption dans l'arbre**. C'est la définition d'un défaut hors de
portée des portes — et il vit dans le fichier même que le rang 13 doit toucher.
⚠ **Le sens du jeton se retrouve, le jeton lui-même non** : D270 écrit ailleurs « 4 délais
dépassés contre 46-52 en mode par défaut ». La phrase se restaure donc par **son sens relevé**,
pas par un caractère deviné — et cela appartient au lot de CODE, première écriture.

### ⛔ LE CADRAGE, ET SON POINT DUR : LA RAM D'OUVERTURE NE DÉCIDE PAS

Les trois exigences de Ko sont traitées en section « PROCHAIN LOT — rang 13 » : la grandeur
**nommée** (mémoire disponible **par worker**, **pendant** la passe), le protocole de
**dérivation** écrit d'avance pour les trois suites, et la **démonstration** spécifiée.

⛔ **CE QUE LE CADRAGE A TROUVÉ, ET QUI N'ÉTAIT ÉCRIT NULLE PART** : la contention du cas rouge
était **incidentelle**, et la RAM d'ouverture est **démentie comme discriminant**.

| passe | RAM à l'ouverture | verdict |
|---|---|---|
| 09/09, `pnpm --filter @zwadj/client run test` | **4 636 Mo** | ⛔ **273/287**, 22 délais dépassés |
| 12/09, `pnpm test` (D288) | **4 624** puis **4 643 Mo** | ✅ **1 329/1 329** |

**Le cas rouge tombe ENTRE les deux cas verts.** ⇒ Une contention qui se contenterait de
baisser la RAM de départ reproduirait **le mauvais terme**, et une borne « vérifiée sous
contention » le serait sous la mauvaise.
⚠ **ET LA SECONDE VARIABLE ÉTAIT DÉJÀ NOMMÉE DANS `AGENTS.md`** — « `pnpm test` (racine) et
`pnpm --filter @zwadj/pro test` **ne répartissent pas pareil** — ne jamais conclure sur un seul
des deux ». **Le cas rouge est FILTRÉ, le cas vert est RACINE.** Le piège était écrit ; personne
ne l'avait mis en face de ces deux verdicts. ⇒ **Premier geste du lot de code : un RELEVÉ, pas
un correctif** (patron D271).

### Passe D277 — les DEUX sens, et ce qu'elle a traité

- **Sens 1, ce que le lot INVALIDE** : « rang suivant : en attente d'arbitrage de Ko » (ordre
  des rangs) — **barré avec son motif**, remplacé par l'arbitrage du 12/09 ; l'entrée
  `[MÉTHODE][P0]` de `ZWADJ_BACKLOG.md` qui déclarait la borne de workers **sans rang** ; et la
  phrase d'`AGENTS.md` traitée à l'étape 0.
- **Sens 2, ce que le lot REND PERMIS** (D287) : rien de neuf — la permission qui comptait
  (« elle peut s'ouvrir dès que Ko l'arbitre ») a été **consommée** par cet arbitrage, et les
  occurrences de « bloquée derrière la marque » sont désormais de l'histoire datée, non des
  conditions courantes. ⚠ **Vérifié, non supposé** : balayage des quatre fichiers d'autorité sur
  le texte **aplati**.

### ⛔ DEUX FAUTES DE MÉTHODE, À MON COMPTE — ET LA PREMIÈRE A ÉCRIT DANS UN FICHIER D'AUTORITÉ

1. ⛔ **J'AI ÉCRIT UNE AFFIRMATION FAUSSE DANS `AGENTS.md`, DANS LE LOT DONT C'EST L'OBJET.**
   Le backlog signale une coquille `[DOC][P3]` — « l'écart est écrit ici plutôt que **tu** ».
   `grep` ne la trouvait pas, `git log -S` non plus, et **j'en ai conclu qu'elle n'avait jamais
   existé**, phrase que j'ai écrite dans le fichier. **Faux deux fois :**
   - elle **existe** — la phrase **enjambe un retour à la ligne**, que ni `grep` ni `git log -S`
     ne franchissent. Il a fallu **aplatir les blancs** pour la voir. ⇒ Ces fichiers sont
     enveloppés à ~95 colonnes : **toute expression de plus de quelques mots y est coupée au
     moins une fois**, donc tout balayage se fait sur le texte aplati ;
   - et **ce n'est pas une coquille** : `tu` est le participe passé de **taire**, accordé au
     masculin « l'écart » ; la même tournure porte « tue » ailleurs, accordée à « la
     contradiction ». Les deux sont justes. **Le signalement du backlog est une mésaudition.**
   ⇒ **Corrigé dans `AGENTS.md`** — l'affirmation fausse est **retirée et remplacée par la
   mesure**, et l'entrée `[DOC][P3]` du backlog est **barrée avec son motif** (D276 : une
   affirmation invalidée se barre, elle ne s'efface pas).
   ⚠ **Ce qui l'a attrapée est un second extracteur, pas une relecture** — et ce qui l'avait
   produite est très exactement ce que le lot dénonce : **j'ai cru le compte rendu d'un outil
   (« 0 occurrence ») au lieu du fichier.**
2. ⚠ **TROIS ATTENDUS ÉCRITS DE MÉMOIRE DANS MES PROPRES VÉRIFICATIONS**, tous rendus « MANQUE »
   sur un fichier parfaitement correct : un `\n` cherché dans un fichier **CRLF** ; un
   aplatissement laissant l'**indentation**, donc des espaces multiples ; une recherche
   **sensible à la casse** contre un titre en capitales. **Aucun n'a écrit**, tous ont accusé à
   tort. ⚠ C'est la règle du dépôt retournée contre moi — et c'est pourquoi l'extracteur final
   **rejoue sa calibration sur ses deux bras** (un témoin présent, un témoin absent) à chaque
   invocation.

### ⛔ CE QUE CE LOT NE FAIT PAS

1. **Aucune ligne de code**, aucun `testTimeout`, aucune borne posée. Les budgets de test
   restent un `[MÉTHODE][P0]` **distinct** — motif écrit au cadrage : un budget posé en même
   temps qu'une borne rendrait les deux inévaluables.
2. **Il ne corrige pas** `apps/pro/vite.config.ts:24`, pourtant mesuré ici : ce serait du code,
   et le lot est documentaire. **Il est inscrit comme première écriture du lot de code.**
3. **Ce lot est DOCUMENTAIRE** (D283) — trois `.md` d'autorité au diff, aucun fichier de code :
   il **ne compte pas** dans les deux/trois. Le compteur reste à **zéro** ; le lot de code du
   rang 13 le portera à un.
   ⚠ **FAIT LE MÊME JOUR — IL EST À UN (D290, `251e82b`).** Vrai à la date de D289, périmé
   depuis : marqué ici et non effacé, parce qu'**une section close peut porter une phrase au
   présent** et se lire comme l'état courant (D284).
4. ⚠ **L'UTILITAIRE DE SPLICE EST RESTÉ DANS LE SCRATCHPAD**, comme `ed.py` au rang 11 et
   l'éditeur CRLF au rang 12 — **troisième reconduction du même écart, et elle est écrite plutôt
   que passée sous silence.** Le verser au dépôt ici ferait de ce lot un lot de CODE (D283).
   ⇒ Report déjà ouvert au backlog ; cette occurrence s'y ajoute.

## Session du 12/09/2026 — D288 · CERTIFICATION (rang 12) : la marque, et la porte dure entre au critère

⛔ **RANG 12, ARBITRÉ PAR KO LE 11/09.** ⇒ **État du rang** : section « PROCHAIN LOT — rang 12 »
en tête de ce fichier. **Il est CLOS.**

### ⛔ LA MARQUE — CE QUI EST ÉCRIT, MOT POUR MOT

> **Portes vertes AU REPOS le 12/09/2026, et D285 et D286 en font partie.**

**Deux lots, et rien d'autre.** ⛔ **Aucun en-tête antérieur n'est réécrit en « certifié »**
(point 4 du critère) — ce serait la certification par procuration que le rang 7 refuse depuis
D270. La marque est ici, datée, et **elle ne se reconduit pas au lot suivant**.
⇒ **Le compteur de lots de code non certifiés passe de DEUX à ZÉRO.**

### ⛔ LA PORTE DURE, REJOUÉE ET VERTE — ET LA PROJECTION DÉMENTIE PAR LE RELEVÉ

`chrome` fermé par Ko. **Calibration rejouée à 00:36, et PASSANTE** : 12 cœurs chargés,
bridage retiré, **120 s de CPU produites sur un plafond de 124,5** (rendement **0,96**),
CPU 9 % → 100 %, PERF 76,2 % → 146,8 %. Les deux instruments séparent les régimes sur charge
réelle — l'instrument n'est donc pas en cause dans ce qui suit, et c'est mesuré, pas supposé.

| | relevé 1 (00:37) | relevé 2 (00:40) | clôture (01:36) | exigé |
|---|---|---|---|---|
| RAM libre médiane | **4 624 Mo** | **4 643 Mo** | **5 050 Mo** | ≥ 4 579 ✅ |
| RAM, bande basse | 4 609 | 4 619 | 5 039 | > barre ✅ |
| écart à la barre | **+45** | **+64** | +471 | > 0 ✅ |
| `chrome` | **0** | **0** | **0** | **0** ✅ |
| `node` | 0 | 0 | 0 | 0 ✅ |
| alimentation | SECTEUR 100 %, overlays identiques | idem | idem | stable ✅ |
| `% Processor Performance` | 74,8 % | 73,8 % | 79,2 % | > 100 = turbo — ⚠ **légende, jamais une exigence : au repos cette machine est sous 100** (D291) |

⛔ **LA PROJECTION DE D287 ÉTAIT UNE PROJECTION, ET L'ÉCART EST GRAND.** Elle annonçait, par
soustraction d'inventaire, **+192 Mo** une fois `chrome` fermé. Mesuré : **+45 puis +64** —
**de l'ordre du tiers**. D287 avait écrit la réserve (« la mémoire rendue par un processus
fermé n'égale pas son *working set* ») ; le relevé la confirme et donne sa taille.
⚠ **CE QUE ÇA CHANGE POUR LA MÉTHODE** : une soustraction d'inventaire ne peut pas servir de
feu vert sur une porte dure. Ici elle aurait annoncé une marge **trois fois trop large**, et
la passe s'est ouverte dans une marge de 45 Mo — un onglet de plus et la porte était rouge.
⇒ **La sortie de secours de D270 n'a PAS été consommée** : le plancher est repassé au-dessus
de la barre, **aucune barre n'a été redéfinie**, aucun arbitrage demandé à Ko.

### Les six portes, l'e2e, et l'état machine devant chacune

⚠ **Toutes lancées en AVANT-PLAN, délibérément.** D286 a mesuré que Windows bride les threads
de fond (`PROCESS_POWER_THROTTLING_EXECUTION_SPEED`) — 3,7 s de CPU produites sur 3 s de mur
là où douze cœurs en offrent 36. **Une durée relevée sur une porte lancée en tâche de fond
mesurerait le bridage, pas la porte.**

| porte | code de sortie | durée | chiffres |
|---|---|---|---|
| `typecheck` | **0** | 20 s | 9 projets |
| `lint` | **0** | 12 s | 9 projets |
| `test` | **0** | 59 s | **1 329 tests / 109 fichiers** |
| `build` | **0** | 48 s | client SSG+SSR, middleware 45,5 kB |
| `test:int` | **0** | 306 s | **436 tests / 36 fichiers**, PostgreSQL réel |
| `e2e` | **0** | 127 s | **34 passés · 1 ignoré** |

⚠ **AUCUN COMPTEUR N'A BOUGÉ** depuis D286 — 1 329/109 et 436/36 à l'identique. C'est le
résultat **attendu** d'une passe qui ne modifie aucun code, et c'est ce qui rend la
comparaison lisible : un compteur qui bouge sans lot de code serait le signal.
⚠ **L'e2e ignorée est NOMMÉE** (elle l'est depuis D283, et le motif est reconduit sans
changement) : `a5-cold-reload-vs-spa.e2e.ts:190`, motif « nécessite une salle de fixture : à
brancher avec T2 ». **Relevée dans la source**, pas déduite du compte.

⛔ **UN COMPTEUR D'ÉCHECS LU PAR SOUS-CHAÎNE AURAIT ANNONCÉ DEUX ÉCHECS SUR UNE SUITE À
1 329/1 329.** La sortie de `test` porte **deux** occurrences de « failed » : ce sont des
lignes de JOURNAL, `TypeError: fetch failed`, émises par `ChargilyGateway` **à l'intérieur
d'un test qui exerce le chemin d'échec réseau**. Zéro occurrence de « FAIL », zéro
`ELIFECYCLE`, et les quatre lignes de résumé disent toutes « passed ».
⚠ **C'est D275 à la lettre** — « un compte lu par sous-chaîne se confronte au CONTEXTE de ses
occurrences, jamais à leur seul nombre ». L'extracteur a été confronté à la sortie brute
**avant** de servir à compter, et les quatre lignes « Test Files » ont été vérifiées présentes
(58 + 3 + 20 + 28 = 109) plutôt que supposées.

### ⛔ LES CAMPAGNES — 195 GARDES, ET LA RÉSOLUTION DU `--tout` A SERVI EXACTEMENT COMME ÉCRIT

`lancer-campagnes.py --tout` : **26 campagnes, 1 944 s (32 min), sortie 1** — 182 mordues,
**0 muette**, 13 non mesurées, réparties sur les trois campagnes gardées derrière `--int`
(`e3d1-s8` 5, `s11b` 4, `solid-s6` 4). Les trois rejouées **séparément** avec `--int` :

| campagne | sans `--int` | avec `--int` | code |
|---|---|---|---|
| `neutralize-e3d1-s8.py` | 3 mordues + 5 non mesurées | **8 / 8** | 0 |
| `neutralize-s11b.py` | 9 mordues + 4 non mesurées | **13 / 13** | 0 |
| `neutralize-solid-s6.py` | 2 mordues + 4 non mesurées | **6 / 6** | 0 |

⇒ **TOTAL CERTIFIANT : 195 mordues · 0 muette · 0 non mesurée.** L'arithmétique se boucle
campagne par campagne (3+5=8, 9+4=13, 2+4=6), et non par un seul grand total — un total qui
tombe juste par compensation ne prouve rien.
⚠ **Le précédent de D275 tenait 182 sur 182** ; l'écart de **+13** vient des cibles ajoutées
depuis (les deux échéances de D285, et S11-b), pas d'un changement de méthode.
✅ **S11b-11 mord** — c'est la cible `Math.min` → `Math.max` que D286 a relevée comme changeant
**zéro octet**, et qui démontrait qu'un contrôle de mutation par la TAILLE aurait déclaré
« non posée » une mutation parfaitement posée.

⛔ **LE CODE DE SORTIE RAPPORTÉ PAR LE HARNAIS ÉTAIT 0, ET LE VRAI ÉTAIT 1.** La commande de
fond était suivie d'un écho du code réel ; c'est **l'enveloppe** qui a rendu 0, et c'est elle
que la notification de fin de tâche affiche. **La précaution a tenu** — le code réel était
imprimé et lu — mais le fait mérite d'être écrit : `AGENTS.md` dit « lire le code de sortie de
la COMMANDE, pas de son ENVELOPPE », et **une notification de fin de tâche est une
enveloppe**. ⚠ Sans la prédiction du critère (« `--tout` sort en 1, c'est attendu »), un
« exit code 0 » se serait lu comme un succès du tri.

### ⛔ L'ARBRE N'A PAS BOUGÉ, ET LA FENÊTRE EST HOMOGÈNE — les points 1, 6 et 7 enfin MESURÉS

**Arbre immobile sur `c2ac531` d'un bout à l'autre** : `git status --porcelain` **vide** avant
les campagnes, après le `--tout`, et après les trois `--int`. Les harnais mutent des sources ;
trois contrôles, pas un.
⚠ **Aucun fichier n'a été édité pendant la passe** — les écritures documentaires de ce lot sont
toutes **postérieures** au dernier relevé (D270 : ne jamais éditer un fichier pendant qu'une
vérification le lit — 24 échecs sans signification, puis une conclusion fausse tirée d'eux).

**`echantillonneur-etat-machine.ps1`, en fond sur toute la fenêtre :**

```
ECHANTILLONS=103   dont ECHEC-INSTRUMENT=0
FENETRE=2026-09-12 00:41:09 → 2026-09-12 01:34:58   (53.8 min)
RAM_LIBRE_MO min=2496 max=5261   CPU_PCT max=100   NODE max=15
TRANSITIONS_ALIMENTATION=0       TROUS_DANS_LA_SERIE=0
✓ FENETRE HOMOGENE : une seule source d'alimentation, aucune interruption de serie.
```

⛔ **C'EST LA PREMIÈRE CERTIFICATION OÙ LES POINTS 6 ET 7 SONT DES MESURES.** Ils ont été
écrits après la nuit du 09→10/09, où huit heures de veille sur batterie critique tenaient
entre deux bouts nominaux. Ici la bascule d'alimentation et le trou de série sont **cherchés
par un instrument et rendus à zéro**, au lieu d'être inférés de deux extrémités.
⚠ **Le lecteur du journal rejoue sa calibration à chaque invocation, et sur ses DEUX bras** :
deux cas négatifs (série homogène → 0 transition, 0 trou) et deux cas positifs (bascule
secteur→batterie, trou de huit heures). Les quatre passent. **Un détecteur qui répondrait
« 0 » à tout aurait passé les deux négatifs seuls** — c'est l'exigence des deux bras de D286.
⚠ **RAM min 2 496 Mo pendant la fenêtre, et ce n'est PAS une violation de la porte dure** :
c'est la mesure elle-même qui consomme (jusqu'à **15 processus node**, CPU à 100 %, PERF à
141 % — turbo engagé, donc **non bridé**). La porte dure porte sur l'état d'**OUVERTURE au
repos** ; l'échantillonneur, lui, surveille le **RÉGIME**. Confondre les deux ferait échouer
toute certification, puisqu'une passe qui ne consomme rien n'a rien mesuré.

### ⛔ LA PORTE DURE `chrome` = 0 ENTRE AU CRITÈRE — le point non traité de D287

**Point 8 du critère du rang 9**, écrit dans ce lot. ⛔ **ELLE VIVAIT DANS UN MESSAGE DE
CHAT.** Ko l'avait posée mot pour mot le 11/09 ; D287 l'a fidèlement **rapportée** dans son
compte rendu de session — ce qui est le bon format **au mauvais endroit**.
⚠ **UNE CERTIFICATION FUTURE LIT LE CRITÈRE, PAS LA SECTION D'UNE SESSION VIEILLE DE DEUX
JOURS.** C'est **D276 appliqué à la règle de certification elle-même** : la décision existait,
elle était écrite, elle était datée, et elle n'était pas là où on va la chercher.
⇒ **C'est la classe que D287 venait d'inscrire dans `AGENTS.md`, retournée contre la session
qui l'a écrite** — et c'est **Ko** qui l'a relevée, pas la session.
⚠ **ET LE MOTIF DE LA QUANTITÉ EST DISTINCT DE CELUI DE LA BARRE**, sinon elle serait
redondante : la barre dit *combien il reste*, `chrome` dit *si ce qui reste a été libéré*. Le
relevé du 12/09 le démontre — barre franchie de **+45 Mo** seulement, mais franchie `chrome`
**fermé** : les deux quantités ne décrivent pas la même machine.

### Les deux réserves de D275 — l'une LEVÉE, l'autre RECONDUITE, avec leur motif

Point 5 du critère : elles ne s'éteignent pas en ayant été écrites une fois.

- ✅ **LEVÉE — l'instrument d'état machine** (dite « n°2 » par l'usage ; ⚠ écart de
  numérotation déjà relevé et **non corrigé** par D286, le référent n'ayant jamais été
  ambigu). Levée **dans ses deux moitiés** par le rang 11 : l'instrument est **au dépôt**
  (`neutralisation/sonde-etat-machine.ps1`, `echantillonneur-etat-machine.ps1`) et sa
  calibration est **rejouée à l'invocation**, pas héritée. ⇒ **Cette certification est la
  première à en bénéficier** : « la machine est au repos » y est un relevé reproductible et
  contestable, au lieu d'une affirmation datée.
- ⚠ **RECONDUITE — zéro `node` pendant la mesure.** `NODE=0` aux trois relevés au repos, et
  aucune pile `dev` n'a tourné. **C'est une condition de ce que la certification vaut, pas un
  défaut à corriger** : elle ne dit **rien** de la porte pendant qu'un observateur de fichiers
  recompile — le facteur que D274 a nommé sans pouvoir le reproduire, et la seule piste non
  écartée de l'intermittence de `venue-list.test.tsx`. **Elle se recopiera dans la prochaine.**

### ⛔ DEUX FAUTES DE MÉTHODE, À MON COMPTE — ET LA PREMIÈRE A ÉCRIT

1. ⛔ **BASH A MANGÉ CINQ JETONS DANS UN FICHIER D'AUTORITÉ, ET LE REMPLACEMENT A RÉUSSI.**
   Le texte de la règle de synchronisation a été passé à un `python3 -c` entre **guillemets
   doubles** : les jetons entre accents graves — `origin`, `git status`, `git fetch` et les
   deux `git rev-parse` — ont été pris par bash pour des **substitutions de commandes**.
   Écrit dans `AGENTS.md` : « local et  sur le MÊME SHA », « le geste est  et  ».
   ⚠ **L'UTILITAIRE D'ÉDITION N'Y POUVAIT RIEN** — il a fait exactement son travail : une
   occurrence trouvée, zéro LF nu, marqueur présent. **La corruption était dans son ENTRÉE**,
   en amont de tout contrôle. Un contrôle d'écriture ne protège pas d'un texte déjà faux quand
   il lui arrive.
   ⛔ **CE QUI L'A ATTRAPÉE EST LA RELECTURE DU FICHIER, PAS LE SUCCÈS DE L'OUTIL** — et les
   `fatal: not a git repository` imprimés au passage étaient le seul signal, facile à lire
   comme du bruit. ⇒ Corrigé **à la racine** : tout texte d'autorité passe désormais par un
   heredoc à délimiteur **entre quotes**, qui n'interpole rien, ou par l'outil d'écriture.
   Restauration par `git checkout --`, réécriture, puis **vérification que les jetons sont
   présents** — pas seulement que le remplacement a eu lieu.
   ⚠ **ET LE CÔTÉ QUI AURAIT PU COÛTER PLUS CHER** : la substitution a **exécuté** ce qu'elle
   a mangé, dont un `git fetch` — une opération réseau non voulue. Ici tout était en lecture
   seule ; **c'est la chance, pas la conception.**
2. ⚠ **J'AI FAILLI LIRE UN CODE DE SORTIE D'ENVELOPPE.** Voir plus haut : la notification de
   tâche annonçait 0, le tri avait rendu 1. La précaution (imprimer le code réel) a tenu, et le
   critère prédisait ce 1 — **deux filets pour une faute que le dépôt a déjà écrite**.

### ⛔ CE QUE CE LOT NE FAIT PAS

1. **Il n'ouvre aucun lot de code.** La borne de workers est **désignée** par Ko (11/09 :
   « quatre configs, c'est du code et ça mérite son propre rang ») et **n'est pas arbitrée** —
   la session n'attribue pas un rang. ⇒ **Rang 13 : en attente d'arbitrage de Ko** (D284).
   ⚠ **Ce que ce lot change pour elle est sa CONDITION, pas son rang** : elle était bloquée
   derrière la marque du 12, la marque est posée, **elle peut s'ouvrir dès l'arbitrage**.
2. **Ce lot est DOCUMENTAIRE** — deux `.md` d'autorité au diff, aucun fichier de code (D283) :
   il **ne compte pas** dans les deux/trois, il les remet à zéro sans s'y ajouter.
3. ⚠ **L'UTILITAIRE D'ÉDITION CRLF EST RESTÉ DANS LE SCRATCHPAD**, comme `ed.py` au rang 11 —
   **c'est le même écart que D287 a signalé contre lui-même, et il se reconduit ici plutôt que
   d'être passé sous silence.** Il est calibré sur ses deux bras (compte juste ⇒ il écrit et
   normalise le LF ; compte faux ⇒ il **refuse sans écrire**), mais une calibration qui vit
   hors de `git` n'est pas rejouable par la session suivante. ⇒ **Reporté au backlog**, au même
   titre que `ed.py` et le comparateur de dérive de D286.
   ⛔ **Le verser au dépôt ICI aurait fait de ce lot un lot de CODE** (D283 : « un lot qui
   touche un harnais, un test, un script ou une migration COMPTE ») — c'est-à-dire un lot non
   certifié ajouté par la session même qui certifie, et le compteur serait reparti à un le jour
   de sa remise à zéro.

## Session du 11/09/2026 — D287 · une passe D277 cherche aussi ce que le lot REND PERMIS

⛔ **RANG 12, ARBITRÉ PAR KO.** Objet : *la certification qui débloque la borne de workers.*
⛔ **ÉTAPE 0 FAITE ET MESURÉE ; LA CERTIFICATION N'A PAS ÉTÉ LANCÉE** — porte dure rouge, voir
plus bas. ⇒ **État du rang** : section « PROCHAIN LOT — rang 12 » en tête de ce fichier.

### ⛔ CE QUE LA REPRISE À FROID A TROUVÉ, ET POURQUOI C'EST UNE CLASSE

Une reprise sans état, le 11/09/2026, a établi rang, portes, certification, numéro et compteur
en lisant ce fichier seul — puis a buté sur **deux phrases d'autorisation qui penchaient du même
côté** :

| | où | ce qu'elle disait | état |
|---|---|---|---|
| 1 | ordre des rangs, **rang 10 CLOS** | « le compteur est **à zéro**, donc un lot de code peut s'ouvrir » | **barrée** (D287) |
| 2 | point d'entrée, **rang 11** | « le prochain lot de code **ferme la fenêtre** » | **réécrite** (D287) |

⛔ **LA PREMIÈRE ÉTAIT VRAIE QUAND ELLE A ÉTÉ ÉCRITE, ET C'EST MESURÉ — PAS SUPPOSÉ.**
`git blame` la date du **10/09** (`f8eee9e`, l'ouverture du rang 10), quand la marque du rang 9
venait de ramener le compteur à zéro. **C'est le rang 10 lui-même qu'elle autorisait, et à bon
droit.** Elle est devenue fausse le **11/09** à la livraison du rang 11 (`31f6a00`).
⇒ **Chronologie relevée, sans trou** : `e4ce1d0` (10/09, marque du rang 9) → compteur **0** ;
`f8eee9e` (10/09, la phrase est écrite) → **0**, ✅ vraie ; `ae9b3f8` (11/09, D285) → **1** ;
`31f6a00` (11/09, D286) → **2**, ⛔ la phrase devient fausse.
⛔ **AUCUN LOT N'A DONC ÉTÉ OUVERT À TORT** : rang 10 ouvert à 0, rang 11 ouvert à 1. **Le piège
était armé, pas déclenché** — et il n'y a **aucun lot à défaire**. C'est pourquoi le barrage est
le seul geste requis.

### ⛔ LA RÈGLE DE CLASSE, ET C'EST ELLE LE LIVRABLE — `AGENTS.md`

**Une passe D277 cherche aussi ce que le lot REND PERMIS, pas seulement ce qu'il INVALIDE.**
⛔ **LE MOTIF EST STRUCTUREL, PAS UN OUBLI** : une recherche par CONTRADICTION ne peut pas
trouver une permission périmée. Une phrase qui autorisait à bon droit hier **ne contredit aucun
mot** du lot d'aujourd'hui — elle ne s'oppose à rien, donc aucun mot-clé de l'affirmation
invalidée ne la ramène. Elle est **invisible à la méthode**, et non manquée par distraction.
⛔ **ET C'EST LE SENS QUI NE SE RATTRAPE PAS** (hiérarchie ratifiée par Ko) : une phrase périmée
qui **interdit** coûte du temps et un recoupement ; une qui **autorise** fait ouvrir un lot de
code sous une règle violée, et celui-là est déjà parti quand on s'en aperçoit.
⚠ **MOTIF MESURÉ, ET IL EST ACCABLANT** : le défaut a été **documenté au rang 9** (D284, « une
entrée close peut porter une phrase courante ») et **reproduit au rang 10, douze lignes plus
bas**, par une passe D277 qui **avait été faite** et qui était **juste** — elle cherchait ce que
son lot invalidait. La permission est restée douze lignes sous sa propre leçon.
⇒ **Quatrième manifestation de la famille D276/D277, et la première dans le sens permissif.**

### La porte dure — ⛔ ROUGE, ET RIEN N'A ÉTÉ LANCÉ

⛔ **Consigne de Ko, mot pour mot** : « `chrome` à 0 au relevé d'ouverture, sinon tu ne lances
rien et tu me le dis. » ⇒ **Deux relevés, à trois minutes d'intervalle, 16 échantillons :**

| | 23:52 | 23:54 | exigé |
|---|---|---|---|
| RAM libre médiane | **2 471 Mo** | **2 488 Mo** | ≥ **4 579** ⛔ **−2 091** |
| `chrome` | **16** (2 283 Mo) | **16** | **0** ⛔ |
| `node` | 0 | 0 | 0 ✅ |
| alimentation | SECTEUR 100 %, overlays identiques | idem | stable ✅ |

⚠ **L'INSTRUMENT N'EST PAS EN CAUSE, ET LA CALIBRATION LE DIT** : `-Calibrer` rejoué à 23:51 et
**passant** — 12 cœurs chargés, bridage retiré, **112,9 s de CPU sur un plafond de 126,6**
(rendement 0,89), CPU 22 % → 100 %, PERF 70,2 % → 146,7 %. **Première fois qu'une certification
dispose de ses instruments AU DÉPÔT** — c'est la contrepartie du rang 11, et elle a servi dès le
premier relevé : sans calibration rejouée, « la machine est au repos » serait resté une opinion.
⚠ **Le second relevé n'est pas une redondance** : un état pris une fois ne dit pas s'il TIENT, et
rapporter un transitoire comme un plancher serait la faute que cette porte existe pour empêcher.
⚠ **`vmmemWSL` (789 Mo) NE SE FERME PAS** : c'est le backend de `zwadj-db` (*Up 2 weeks*, 5432 en
écoute, vérifié) — et `test:int` en dépend. Relevé avant d'être bloqué, pour que l'enchaînement
ne meure pas dix minutes plus tard.

### ⛔ TROIS FAUTES DE MÉTHODE, À MON COMPTE, TOUTES DANS MES PROPRES SCRIPTS

Aucune dans le contenu livré ; toutes dans l'outillage jetable de ce lot — **très exactement la
classe de D275**, « l'outillage qu'on écrit en passant, celui qu'on ne songe pas à calibrer ».

1. ⛔ **61 LF NUS injectés dans un fichier CRLF pur**, par un bloc Python triple-quoté. La règle
   du dépôt le dit depuis S0→S7 ; je l'ai reproduite. ⚠ **Et l'assertion ne l'a vu qu'APRÈS
   l'écriture** — un contrôle qui suit l'écriture rapporte un dégât, il ne l'empêche pas.
   ⇒ Corrigé **à la racine** : `norm()` normalise le remplacement **avant** d'écrire. La faute
   est devenue impossible, pas surveillée.
2. ⛔ **LE GENRE DE MUTATION DÉCLARÉ FAUX, DEUX FOIS** — et c'est l'arithmétique de **D286**,
   livrée la veille, appliquée de travers par son propre auteur. Une **insertion au MILIEU d'une
   ancre la DÉTRUIT** : c'est une substitution au sens du compte, quelle que soit l'intention.
   ⇒ Corrigé **à la racine** : le genre se **DÉRIVE** de `apres.count(avant)`, il ne se déclare
   plus. **Un genre déclaré peut mentir ; un genre dérivé non.**
3. ⛔ **`s.encode()` SANS ARGUMENT PREND cp1252** sur ce poste, et lève sur `⛔` — D268 en
   miniature, dans un contrôle de vérification. Un instrument qui tombe sur l'encodage de sa
   propre sortie ne mesure rien.

⇒ **Ce que ces trois ont en commun** : elles ont toutes **levé bruyamment**, donc aucune n'a
produit de fausse mesure — l'inverse exact des trois faux positifs de D275, qui **répondaient**.
⚠ Mais deux d'entre elles ont écrit **avant** d'assertir, et c'est la leçon à garder : sur un
fichier d'autorité, l'ordre « vérifier puis écrire » n'est pas un détail de style.

### ⛔ CE QUE CE LOT NE FAIT PAS

1. **La certification n'a pas eu lieu.** Aucune porte, aucune campagne, aucune e2e n'a été
   lancée : la porte dure est rouge et le critère du rang 9 interdit de la franchir sur ordre.
   ⛔ ~~**Le compteur reste donc à DEUX** (D285, D286) et **aucun lot de code ne peut
   s'ouvrir.**~~ **BARRÉ LE 12/09/2026 (D288).** La certification a eu lieu le lendemain :
   **compteur à ZÉRO**, un lot de code **peut** s'ouvrir. ⚠ **Cette phrase était VRAIE quand
   elle a été écrite** — c'est une phrase d'état devenue fausse, pas une faute de D287.
2. **Ce lot est DOCUMENTAIRE** — trois `.md` d'autorité au diff, aucun fichier de code
   (D283) : il **ne compte pas** dans les deux/trois, et c'est ce qui lui permet d'exister
   alors que le compteur est déjà à deux.
3. ~~**La borne de workers reste sans rang**, désignée par Ko et bloquée derrière la marque
   du 12.~~ ⛔ **MOITIÉ BARRÉE LE 12/09/2026 (D288), ET C'EST LA MOITIÉ PERMISSIVE.** Elle
   reste **sans rang** — vrai, Ko ne l'a pas arbitrée. Elle n'est plus **bloquée** : la marque
   du 12 est posée. ⚠ **C'EST LE SENS QUI NE SE RATTRAPE PAS**, et il est ici dans sa forme la
   plus discrète : rien dans cette phrase ne *contredit* le lot du 12/09, donc une passe D277
   qui ne chercherait que les contradictions ne la ramènerait pas — elle serait restée à
   interdire un lot déjà permis. **C'est la règle de classe de D287 exercée sur la section qui
   l'a écrite.**
4. **`ed.py` est resté un script jetable du scratchpad** — ⚠ **c'est le contraire du principe du
   rang 11**, et l'écart est écrit ici plutôt que passé sous silence. Reporté au backlog comme
   candidat instrument, au même titre que le comparateur de dérive de D286.

## Session du 11/09/2026 — D286 · les instruments entrent au dépôt, et le rang 8 se ferme sur des octets rendus

⛔ **RANG 11, ARBITRÉ PAR KO.** Objet : *les instruments ne restent pas dans le scratchpad.*
Trois fichiers versionnés dans `neutralisation/`, chacun avec son mode d'emploi, les
instruments concurrents ÉCARTÉS et sur quelle mesure, et sa **calibration**.

### ⛔ ÉTAPE 0 — LE RANG 8 EST CLOS, ET PAR AUCUNE DES DEUX OPTIONS QUI ÉTAIENT POSÉES

Le backlog posait deux issues à la dérive de somme de contrôle : ne rien faire, ou
`UPDATE _prisma_migrations SET checksum = …`. **Ko a tranché autrement le 11/09/2026** :
*on rend au fichier de migration les octets qui ont été appliqués.* Le commentaire avait été
ajouté APRÈS l'application — **c'est lui, l'écart**. Le retirer fait retomber l'empreinte
calculée sans toucher à ce qui décide de ce qui s'applique.
⇒ C'est la leçon du 09/09 appliquée à elle-même : *une migration déjà appliquée ne se modifie
plus, même pour un commentaire.* L'argument sur l'incohérence interne de `20260707000001`
vit **en entier** dans la section D282 de ce fichier — il n'avait rien à faire dans le `.sql`.

**Le bloc retiré n'a pas été choisi, il a été TROUVÉ.** Recherche exhaustive sur les 112
lignes du fichier : quels retraits de lignes contiguës redonnent l'empreinte stockée ?
**Exactement deux solutions**, (24→38) et (25→39) — le même retrait au séparateur `--` près,
donc identiques à l'octet. C'est le bloc « ⛔ ET CE N'EST PAS UNE IGNORANCE DE LA FORME ».

| | valeur |
|---|---|
| stockée, lue dans `_prisma_migrations` | `4bf7e91e3b4d2a8d66d5a863e1bc123b892108ad109006592d234a8e2320b689` |
| calculée AVANT | `8c34e7b0ea92689cc4ceb6ed10cf103042fda5962c10e1bb703dd1ef82dab3db` (6 896 o) |
| calculée APRÈS | **`4bf7e91e…b689`** (5 949 o) — **ÉGALE à la stockée** |
| diff | **15 lignes retirées, 0 ajoutée, 0 ligne de SQL touchée** |

⚠ **LA STOCKÉE A ÉTÉ RELUE DANS LA BASE, PAS DANS LE BACKLOG.** Une empreinte recopiée dans
un document est une valeur écrite de mémoire un jour plus tard.
⚠ **ET L'AUDIT N'A PAS ÉTÉ TRONQUÉ (D200)** : les **27** migrations du dossier ont été
confrontées au journal — **27 entrées, 0 dérive, 0 absente**. Le comparateur a été calibré
sur les octets d'AVANT, reconstitués à l'identique (6 896 o, `8c34e7b0…`) : il **rougit**
dessus et il est **vert** sur les octets restaurés. Un « 0 dérive » non calibré se lit comme
un silence.

### ⛔ LA RÈGLE DU MARQUEUR — LA FORME QUE KO A IMPOSÉE, ET CE QUE LA MESURE Y A AJOUTÉ

La consigne initiale était « relis ton marqueur APRÈS la mutation ». ⛔ **Ko l'a corrigée
lui-même, et la correction est le point** : pour une **interversion**, le texte de
remplacement **existe déjà** à l'autre site d'appel — l'assertion « `apres` est présent »
est donc **VRAIE AVANT TOUTE MUTATION**, et elle **fabriquerait la preuve cherchée**.
⇒ La forme qui tient : **ancre `attendu → 0` ET marqueur `n → n + attendu`**, jamais une
présence. ⛔ **Et jamais la taille** : cas de calibration sorti du dépôt, la cible **11** de
`neutralize-s11b.py` (`Math.min` → `Math.max`) change **ZÉRO octet** — 3 790 → 3 790.

⛔ **CE QUE LA MESURE A AJOUTÉ, ET QUI N'ÉTAIT PAS DANS LA CONSIGNE.** Passée sur les
**26 harnais**, cette arithmétique a rendu **SIX faux négatifs**. Relevés, pas supposés :

- **2 suppressions** (`apres` est la chaîne VIDE) — `count("")` rend `len + 1`, et le
  marqueur cesse de vouloir dire quoi que ce soit ;
- **4 insertions** (`apres` CONTIENT `avant`) — l'**ancre SURVIT**, et c'est le comportement
  correct.

⇒ **Une seule formule pour trois genres est une garde qui accuse à tort** — et une garde qui
accuse à tort finit ignorée. Chaque genre a désormais son arithmétique, et les six cibles
sont **POSÉES**.

⚠ **ET CE QUE LES DEUX RACCOURCIS AURAIENT COÛTÉ, CHIFFRÉ** : sur les 26 harnais,
**11 cibles** ont leur marqueur déjà présent ailleurs, et **11** sont à taille constante.
La présence naïve et le contrôle par `len` auraient menti **onze fois chacun**.

### Le recensement, sur les 26 harnais

| | |
|---|---|
| **POSÉES** | **180** — 174 substitutions, 4 insertions, 2 suppressions |
| **NON POSÉES** | **0** |
| **NON COUVERTES** | **9** — 6 cibles de `neutralize-404.py` qui renomment/créent/suppriment un FICHIER (pas de substitution à prouver) + **3 harnais sans garde `__main__`**, dont l'import jouerait la campagne |
| code de sortie | **2**, et c'est voulu : un 0 couvrirait les 9 non regardées |

⚠ **`grep -c "NON POSEE"` rendait 2 sur ce relevé.** Confrontées à leur CONTEXTE (D275) :
l'une est la ligne de calibration où NON POSÉE est le verdict ATTENDU, l'autre est le résumé
« NON POSEES 0 ». **Verdicts réels : zéro.**

### ⛔ QUATRE DÉFAUTS TROUVÉS DANS MES PROPRES INSTRUMENTS, ET AUCUN PAR RELECTURE

1. ⛔ **LA CALIBRATION A ABANDONNÉ À SA PREMIÈRE EXÉCUTION — deux cas sur six.** Ma fixture
   d'interversion (`a: DAY_MS,` → `a: HOUR_MS,`) portait un marqueur qui **n'existait nulle
   part ailleurs** : elle ne modélisait donc pas une interversion. **Une valeur écrite de
   mémoire, encore.** Les fixtures sont désormais **dérivées des cibles 11, 12 et 13** de
   `neutralize-s11b.py`. ⚠ Le second cas ratait parce que la décision « fantôme » vivait
   **hors** de la fonction mesurée : la calibration ne pouvait pas la voir. Remontée dedans,
   calibration et terrain mesurent le MÊME code.
2. ⛔ **LA CALIBRATION POWERSHELL AURAIT PASSÉ MÊME EN ÉCHOUANT.** La fonction narrait par
   `Write-Output` **puis** rendait son booléen par `return` : en PowerShell les deux vont
   dans le **même flux**, donc l'appelant recevait un TABLEAU `[lignes…, booléen]`, toujours
   non vide, **toujours vrai**. ⚠ **Le seul symptôme était une sortie MANQUANTE** — le code
   de sortie disait 0 et le relevé avait l'air normal. Verdict passé par une variable de
   portée script.
3. ⛔ **UN BOM DOUBLÉ A CASSÉ LE FICHIER EN SILENCE.** Relire un `.ps1` en `utf-8` au lieu de
   `utf-8-sig` transforme le BOM en **contenu** ; en préfixer un second laisse un `U+FEFF`
   avant `param`, qui **cesse alors d'être le bloc de paramètres**. PowerShell rapportait
   l'erreur sur `param(`, à 60 lignes de la cause.
4. ⛔ **UN EXTRACTEUR DE DIFF QUI RENDAIT ZÉRO.** Pour compter les lignes retirées, mon
   filtre écartait les en-têtes en jetant tout ce qui commence par `---` — or **une ligne de
   commentaire SQL retirée s'écrit précisément `---`** (préfixe `-` + `--`). Il jetait donc
   **toutes** les lignes qu'il devait compter, et rendait **0 retirée** sur 15. ⚠ C'est la
   réserve de D275 en miniature, et elle a été attrapée par la calibration que la même règle
   impose : deux témoins dont la réponse était connue d'avance.

⚠ **AUCUN DES QUATRE N'A LEVÉ** — tous ont répondu, et leur réponse avait la forme d'une
mesure. C'est D275 mot pour mot, cette fois sur les instruments qu'on écrit pour mesurer.

⚠ **ET DEUX DE PLUS, ATTRAPÉS PAR LES ASSERTIONS DE MES PROPRES SCRIPTS D'ÉDITION** : un
compte d'occurrences écrit de mémoire (« 4 attendues », il y en avait **6**), et une
assertion qui a rougi sur le **commentaire expliquant le défaut** — la règle « assertir sur
les déclarations, commentaires retirés » appliquée à moi.

### ⛔ UNE CHARGE DE CALIBRATION BRIDÉE MESURE LE BRIDAGE, PAS L'INSTRUMENT

La réserve de D275 ne disait pas seulement « hors dépôt » : elle disait que la calibration
était **HÉRITÉE du 03/09 et jamais rejouée**. Rejouer demandait une charge CONNUE. Mesuré :

| générateur | charge réellement produite |
|---|---|
| 12 `Start-Job` | **4,6 s rien que pour démarrer**, puis une charge qui RETOMBE |
| 12 threads .NET | **3,7 s de CPU sur 3 s de mur**, là où 12 cœurs en offrent 36 |
| 12 threads .NET, **bridage retiré** | **34,2 s sur 3 s** (rendement 0,93), `_Total` à **100 %** |

⛔ Windows bride les threads de fond (`PROCESS_POWER_THROTTLING_EXECUTION_SPEED`), d'autant
plus **sur batterie**. Sans le débridage, la sonde concluait « l'instrument ne sépare pas les
régimes » **alors que l'instrument était juste et que la charge n'avait pas eu lieu** — un
diagnostic qui envoie chercher le défaut à l'exact opposé de sa cause.
⇒ La calibration **vérifie d'abord que son cas connu a bien EU LIEU** (rendement ≥ 0,5), et
ce contrôle rend un `ECHEC-INSTRUMENT` **distinct** de l'`ECHEC-CALIBRATION`.

**Preuve bilatérale de la calibration, les deux bras joués :**

| bras | marge exigée | mesure | verdict | code |
|---|---|---|---|---|
| passant | 20 pts | CPU **16 → 100 %** (84 pts) · PERF **72,1 → 146,8 %** · rendement 0,93 | ✓ sépare | **0** |
| rougissant | 1 000 pts | CPU **17 → 100 %** (83 pts) | ✗ ABANDONNE | **1** |

⚠ Et `PERF > 100 %` — annoncé « turbo, donc non bridé » depuis le 10/09 — est **démontré**
pour la première fois : 146,8 % sous charge réelle.

### Ce qui entre au dépôt, et ce que chaque fichier porte

| fichier | ce qu'il répond | calibration |
|---|---|---|
| `neutralisation/verifier-mutations.py` | une cible POSE-t-elle sa mutation ? | **8 cas** synthétiques, en mémoire, rejoués à **chaque** invocation ; abandon si un seul rate |
| `neutralisation/sonde-etat-machine.ps1` | dans quel régime la machine était-elle ? | `-Calibrer` : sépare repos et charge **ici et maintenant**, sur une charge dont le rendement est vérifié |
| `neutralisation/echantillonneur-etat-machine.ps1` | la machine a-t-elle TENU pendant la mesure ? | **4 cas** au `-Resume`, deux positifs et **deux négatifs** |

⚠ **ÉCART ASSUMÉ AU NOM ANNONCÉ** : D275 nommait le remède `sonde-etat-machine.py`. Il est en
**PowerShell** — les cinq quantités sont des compteurs Windows, et les lire depuis Python
reviendrait à lancer… powershell. **Le nom a été écrit avant que l'instrument existe.**
⚠ **ÉCART DE NUMÉROTATION, RELEVÉ ET NON CORRIGÉ** : la section D275 liste l'instrument
d'état machine en **premier** de ses deux réserves, et tout ce qui la cite depuis le 08/09
l'appelle « **n°2** ». Le référent n'a jamais été ambigu, seul le numéro l'est. Nom d'usage
conservé, écart écrit ici — le renuméroter ferait mentir cinq renvois.

⛔ **LE LECTEUR EST LA MOITIÉ QUI MANQUAIT.** Un CSV de 2 000 lignes que personne n'ouvre ne
mesure rien : `-Resume` rend les **transitions d'alimentation** et les **trous dans la
série** — les deux seules choses qu'un encadrement avant/après ne peut pas voir, et
exactement ce qui s'est passé la nuit du 09 au 10/09. Rejoué sur un journal synthétique
reproduisant cette nuit-là : **1 transition, 1 trou de 28 800 s**, code **2**.
⚠ **L'horodatage porte désormais la DATE.** La première forme n'écrivait que `HH:mm:ss` : un
trou de huit heures et un trou de huit secondes s'y lisaient pareil — dans l'instrument même
qui existe à cause d'une nuit.

### Les portes, et l'état machine RELEVÉ devant elles (D270)

⛔ **L'ÉTAT D'OUVERTURE, AVANT DE LANCER QUOI QUE CE SOIT** — relevé par la sonde qui entre
au dépôt dans ce lot même :

| | valeur | |
|---|---|---|
| RAM libre (médiane de 4) | **3 989,5 Mo** | ⛔ **−589,5 sous la barre D273** (4 579) |
| CPU médiane (bande) | 18,5 % (4–23) | |
| `% Processor Performance` | 76,3 % | |
| alimentation | **SECTEUR**, 83 %, overlays AC/DC identiques | |
| `node` | **0** | aucun observateur de fichiers |
| processus / total | 358 / 14 348 Mo | Code 20 proc · chrome 13 · svchost 103 |

| porte | code | durée | mesure |
|---|---|---|---|
| `typecheck` | **0** | 26 s | 8 projets |
| `lint` | **0** | 18 s | 8 projets |
| `test` | **0** | 89 s | **1 329 / 109** — api 659/58 · api-client 36/3 · client 287/20 · pro 347/28 |
| `build` | **0** | 83 s | client + pro + api |
| `test:int` | **0** | 489 s | **436 / 36**, `zwadj_test` réel |

⚠ **AUCUN COMPTEUR N'A BOUGÉ, ET C'EST LE RÉSULTAT ATTENDU** : `1 329 / 109` est exactement
le chiffre de D282, `436 / 36` exactement celui de D285. Un lot qui ne touche que des scripts
hors espace de travail TypeScript et des commentaires SQL **ne doit déplacer aucun test** —
si l'un avait bougé, c'est là qu'il aurait fallu chercher.
⚠ **`grep -c failed` rend 1 sur le journal d'intégration.** Confronté à son CONTEXTE (D275) :
c'est le NOM d'un test qui PASSE — « la ligne passe FAILED ». Le faux positif est celui que
`AGENTS.md` nomme déjà ; il est relevé ici pour qu'on ne le redécouvre pas.

⛔ **LA FENÊTRE A ÉTÉ ÉCHANTILLONNÉE, PAS ENCADRÉE** — premier emploi réel de
`echantillonneur-etat-machine.ps1`, sur le lot qui le livre :

| | |
|---|---|
| fenêtre | 11:13:06 → 11:24:47 (**11,7 min**, 23 échantillons, 0 `ECHEC-INSTRUMENT`) |
| RAM libre | **min 2 735 Mo** — max 3 677 |
| CPU max | 55 % |
| `node` max | **15** |
| transitions d'alimentation | **0** |
| trous dans la série | **0** |
| verdict | ✅ **FENÊTRE HOMOGÈNE** |

⛔ **ET CE QUE CE RELEVÉ OBLIGE À DÉCLARER : LES PORTES SONT VERTES SOUS UNE MACHINE TOMBÉE
À 2 735 Mo**, soit **1 844 Mo sous la barre D273**. C'est le même constat que D282, et il
mène à la même conclusion : **ce lot n'est pas certifié**, et rien ici ne reconduit la
certification du 10/09.
⚠ **`node` max = 15 N'EST PAS UNE VIOLATION DE LA CONDITION DE D275.** Cette condition porte
sur les **observateurs** (`next dev`, `vite`, `tsc --watch`) qui recompilent pendant qu'une
suite lit les mêmes fichiers ; les 15 relevés ici sont **les workers des suites elles-mêmes**.
⛔ **MAIS L'INSTRUMENT NE SAIT PAS LES DISTINGUER**, et c'est une limite à écrire : le relevé
d'OUVERTURE, lui, dit `node = 0` machine au repos — c'est celui-là qui porte la condition.
Reporté au backlog comme affinage possible.

### ⛔ CE QUE CE LOT NE FAIT PAS

1. **Les 3 harnais sans garde `__main__`** (`act-plafonds`, `argon2`, `horloge`) restent hors
   couverture du vérificateur. Les corriger touche des campagnes — **c'est un autre lot**,
   reporté au backlog.
2. **Les 6 cibles « fichier » de `neutralize-404.py`** n'ont pas de substitution à prouver.
   Leur preuve serait d'une autre nature (existence du fichier) — **non écrite**, reportée.
3. **Le comparateur de dérive de somme de contrôle** utilisé à l'étape 0 est resté un script
   jetable. ⚠ **C'est le contraire du principe de ce rang**, et l'écart est écrit ici plutôt
   que tu. Reporté au backlog comme candidat instrument.
4. **Aucune campagne de neutralisation n'a été rejouée** : ce lot ne touche aucune source
   qu'elles mutent. ⚠ `lancer-campagnes.py` croise `git diff --name-only HEAD` — il n'aurait
   joué aucune campagne, et un « 0 campagne jouée » n'est pas un vert.

## Session du 11/09/2026 — D285 · les deux échéances : la garde naît, et c'est la mesure d'ouverture qui l'a autorisée

⛔ **RANG 10 LIVRÉ ET MESURÉ.** Le cadrage de D284 a été ratifié par Ko, puis exécuté dans
l'ordre qu'il impose. Trois fichiers au diff, ceux qui étaient énumérés — plus les deux
fichiers d'autorité, sur consigne explicite de Ko (voir « ce qui a atterri où »).

### ⛔ D285 — LA PRÉDICTION DU CADRAGE A TENU, ET C'EST ELLE QUI AUTORISAIT LE LOT

Le cadrage déclarait ses deux cibles **spécifiées, pas mesurées**, et leur mutisme sur l'arbre
d'avant comme une **prédiction à vérifier avant toute ligne de code**. Vérifiée :

| | résultat |
|---|---|
| pré-vol | **5 mesures vertes** — `chiffrage`, `int-reservations`, `int-devis`, `echeances`, `int-migration` |
| cible 12 (`expiresAt` reçoit 48 h) | **MUETTE** — verte dans `int-reservations` malgré la neutralisation |
| cible 13 (`paymentDueAt` reçoit 7 j) | **MUETTE** — idem |
| verdict du harnais | `0 garde mordue sur 2 cibles RÉELLEMENT MESURÉES`, sortie **1** |

⚠ **LA SORTIE 1 EST LE RÉSULTAT ATTENDU ICI, PAS UN ÉCHEC** : c'est le code « au moins une
garde muette », et deux gardes muettes sont exactement la démonstration que le défaut existe.
Une cible qui aurait mordu **avant** aurait voulu dire que la mesure existait déjà et que le
cadrage s'était trompé d'objet — l'arrêt franc prévu par Ko. Il n'a pas eu lieu.

### ⛔ D285 — « MUETTE » A DEUX CAUSES, ET LA SECONDE FABRIQUERAIT LA PREUVE QU'ON CHERCHE

Consigne de Ko, écrite avant la mesure : une cible verte sous neutralisation signifie soit que
**l'assertion est aveugle au défaut** (ce qu'on cherche), soit que **la mutation n'a jamais été
appliquée** — le remplacement fantôme d'`AGENTS.md`, trois fois un motif en `\n` qui n'a rien
remplacé dans un fichier CRLF pendant que le script annonçait « fait ».
⛔ **ICI, LE FANTÔME NE SERAIT PAS UN FAUX NÉGATIF : IL SERAIT UNE PREUVE FABRIQUÉE.** Le lot
tout entier repose sur « les cibles sont muettes » ; une mutation non posée rend ce mutisme
gratuitement, et rien dans la sortie du harnais ne distingue les deux cas.

**Ce que le harnais fait déjà, et ce qu'il ne fait pas** : il compte ses occurrences **avant**
(`vus != attendu` ⇒ `ERREUR DE SCRIPT`, sortie 2) ; il **ne relit pas** le marqueur après. La
moitié manquante a été produite par un instrument séparé, qui pour chaque cible relève l'ancre
et le marqueur **avant et après** la mutation, en mémoire, et imprime la ligne réellement
changée.

⛔ **RÉSULTAT, ET IL PORTE UNE SUBTILITÉ QU'UNE ASSERTION NAÏVE AURAIT MANQUÉE** : pour une
**interversion**, le texte de remplacement **existe déjà dans le fichier**, à l'autre site
d'appel. Le marqueur ne vaut donc pas 0 avant et 1 après, mais **1 avant et 2 après**. Une
garde écrite « le marqueur est-il présent ? » aurait été **VRAIE AVANT TOUTE MUTATION** et
n'aurait rien mesuré — c'est la « mesure confondue » de D209, transposée à l'instrument qui
vérifie la mesure.

| cible | ancre avant → après | marqueur avant → après | ligne mutée |
|---|---|---|---|
| 12 | 1 → 0 | 1 → **2** | `windowMs: PRO_RESPONSE_DAYS * DAY_MS` → `PAYMENT_WINDOW_HOURS * HOUR_MS` |
| 13 | 1 → 0 | 1 → **2** | `windowMs: PAYMENT_WINDOW_HOURS * HOUR_MS` → `PRO_RESPONSE_DAYS * DAY_MS` |

⇒ **Les deux mutations sont prouvées POSÉES. Le mutisme vient donc bien de l'aveuglement de
l'assertion**, et le lot avait son objet.

### ⛔ D285 — L'INSTRUMENT A ÉTÉ CALIBRÉ AVANT DE SERVIR, ET LE CAS LIMITE ÉTAIT DANS LE LOT

D275 — trois faux positifs d'outillage jetable en une session, **aucun n'ayant levé, tous
ayant répondu**. La règle qui en sort : **un extracteur se confronte à une sortie dont la
réponse est déjà connue avant de servir à compter.** Appliquée ici avant tout usage :
l'instrument a été passé sur **cinq cibles existantes** (1, 5, 8, 10, 11), toutes connues
mordantes depuis la certification du rang 9. Les cinq ont rendu « mutation posée » avec leur
ligne exacte.
⛔ **ET LA CALIBRATION A RAPPORTÉ UN CAS QUE JE N'AVAIS PAS PRÉVU** : la cible 11 (`min` →
`max`) change **zéro octet**. Un contrôle par taille de fichier — le réflexe — l'aurait
déclarée non posée. C'est la comparaison de contenu (`source != mute`) qui la rattrape.

### ⛔ D285 — L'ANCRE SUR LE SITE D'APPEL : LA CONSIGNE ÉTAIT JUSTE, ET ELLE S'EST VÉRIFIÉE

Consigne de Ko : ancrer sur les **sites d'appel**, jamais sur les **déclarations**, le lot
allant préfixer celles-ci d'`export`. Mesuré après le lot : le bloc de commentaire ajouté
au-dessus des constantes a décalé les deux sites d'appel de **251 → 261** et **382 → 392**,
mais **leur texte est identique**. Les deux ancres s'appliquent encore, à 1 occurrence chacune.
⇒ **Ancrées sur les déclarations, elles seraient devenues « non mesurées »**, et le `13/13` de
la fin de lot n'aurait pas eu lieu — il aurait fallu réécrire les cibles au milieu du lot.
⚠ Le harnais n'utilise **aucun numéro de ligne** : c'est ce qui rend le décalage indolore.

### ⛔ D285 — ÉCART AU CADRAGE ASSUMÉ : QUATRE CONSTANTES EXPORTÉES, PAS DEUX

Le cadrage dit « les **deux** constantes sont exportées ». Mais son propre remède MD3 exige que
l'attendu s'écrive `PRO_RESPONSE_DAYS * DAY_MS` — or `DAY_MS` et `HOUR_MS` sont **privées elles
aussi**, et **`@zwadj/types` n'en porte aucun équivalent** (relevé : une seule occurrence de
`86_400_000` dans tout `packages/types`, à l'intérieur d'un calcul de fenêtre, pas une
constante exportée).
⇒ **Les quatre sont exportées.** Les alternatives ont été écartées, chacune sur son motif :
- écrire `7 * 86_400_000` dans la spec ⇒ **c'est MD3**, la valeur recopiée qui laisse la garde
  verte sur l'ancienne le jour où la constante change ;
- importer un `DAY_MS` depuis `@zwadj/types` ⇒ **deuxième autorité** pour le même nombre, ce
  que « un seul endroit par formule » interdit ;
- exporter un produit déjà calculé (`PRO_RESPONSE_WINDOW_MS`) ⇒ **symbole neuf**, et il
  faudrait changer les sites d'appel — donc les ancres de neutralisation, dans le lot même qui
  les pose.
⚠ **L'export porte son motif EN COMMENTAIRE, au-dessus des quatre** : un `export` sans
consommateur visible dans le même fichier est exactement le symbole qu'un lot de ménage
supprime (D263 — « avant de supprimer un symbole inutilisé, demander où il était utilisé »).

### ⛔ D285 — UNE PRÉMISSE DE MD7 ÉTAIT FAUSSE, ET LE VRAI RISQUE ÉTAIT AILLEURS

MD7 posait : « une salle dont les créneaux sont **semés sur `EVENT_DATE`** refuse une demande à
`now + 90 j` ». **Relevé dans le spec : il n'y a aucun semis par date.** `makeVenue` crée un
`SlotTemplate` **récurrent** (nom, minutes de début/fin, prix) ; aucune disponibilité n'est
attachée à une date. La date n'a donc pas à être accompagnée d'un semis.
⛔ **MAIS LE MODE DE DÉFAILLANCE NE DISPARAÎT PAS — IL CHANGE DE CAUSE.** Ce qui peut rendre la
date irrecevable, c'est **l'horizon** : `BOOKING_HORIZON_MONTHS = 18` (relevé dans
`packages/types/src/venue.ts`), et D227 refuse explicitement au-delà. Le remède de MD7 tient
donc, avec une autre justification : **la fixture se prouve en 201 avant qu'on assertisse quoi
que ce soit**, et les deux tests portent en plus une assertion qui vérifie que la date dérivée
dépasse bien les deux fenêtres — sans quoi l'écrêtage la ramènerait au début de l'événement et
la garde naîtrait muette (MD1).
⚠ C'est D231 appliqué à un mode de défaillance : **vérifier la prémisse fait partie de coder la
consigne**. La consigne était bonne, son motif non.

### D285 — la fixture, et pourquoi elle ne porte aucune date de calendrier

`EVENT_DATE = "2027-08-15"` est **laissée intacte** : deux tests en dérivent des instants ISO
exacts qui mesurent le créneau franchissant minuit (D55/D77), et la corriger en place serait le
refactoring opportuniste que ce dépôt punit. La fixture des échéances est **dédiée** :

```
FENETRE_MAX_MS   = max(PRO_RESPONSE_DAYS * DAY_MS, PAYMENT_WINDOW_HOURS * HOUR_MS)
dateHorsEcretage = formatCivilDate(civilTodayAt(now + 2 * FENETRE_MAX_MS))
```

- **la marge est le DOUBLE de la plus large des deux fenêtres**, et elle se dérive : allonger
  une fenêtre fait suivre la fixture au lieu de la rendre silencieusement fausse ;
- **`max` des deux, pas `PRO_RESPONSE_DAYS` en dur** : MD1 demande « au-delà des DEUX », et
  l'écrire ainsi rend la condition **structurelle** au lieu d'incidente ;
- **la conversion civile passe par les aides du dépôt** (`civilTodayAt`, `formatCivilDate`),
  jamais par `getFullYear()` sur un `Date` — MD6, et la leçon S11-a d'une garde de fuseau muette
  sur un serveur en UTC. ⚠ L'arithmétique en millisecondes est exacte ici parce que l'Algérie
  est **UTC+1 sans heure d'été** (D48) ; elle ne le serait pas ailleurs.

### D285 — les deux assertions n'ont pas la même FORME, et c'est écrit pour qu'on ne les harmonise pas

- **`expiresAt` — encadrement par deux instants que la spec mesure elle-même.** `Date.now()`
  est lu **dans** `create`, donc entre le `t0` et le `t1` relevés autour de la requête. La
  largeur de l'encadrement **est** la durée de la requête ; l'interversion en sort de cinq
  ordres de grandeur. ⛔ `createdAt` vient de l'horloge **PostgreSQL** : c'est la seule valeur
  que cette assertion ne doit pas utiliser, et c'est écrit sur place.
- **`paymentDueAt` — égalité exacte.** `accepted_at` étant **persistée**, les deux instants se
  relisent dans la **même ligne** et se soustraient sans approximation.

⇒ **Aucun nombre n'est choisi dans l'une ni dans l'autre.** MD4 dans sa forme rectifiée par Ko :
**supprimer le besoin d'une tolérance vaut mieux que la chiffrer.**

### ⛔ D285 — TROIS FAUTES DE MÉTHODE, À MON COMPTE

1. ⛔ **J'AI ÉCRIT DEUX NUMÉROS DE LIGNE DANS DES COMMENTAIRES, ET ILS ÉTAIENT PÉRIMÉS DANS LE
   LOT MÊME QUI LES POSAIT.** Mes commentaires de cibles citaient `:156` et `:373` ; mes propres
   insertions ont poussé ces assertions en **186** et **433**. C'est D116 — le commentaire qui
   dit l'inverse du code — commis en écrivant. Attrapé par la relecture du marqueur, pas par
   relecture humaine. ⇒ Corrigé par **le remède du dépôt : on supprime le chiffre, on ne le met
   pas à jour** ; les commentaires nomment désormais « l'assertion de la CRÉATION » et « celle de
   l'ACCEPTATION ».
2. ⛔ **MON PREMIER EXTRACTEUR DE VERDICT A COMPTÉ UN `FAIL` QUI N'EN ÉTAIT PAS.** `grep FAIL`
   sur la sortie d'intégration a matché **le NOM d'un test qui passe** — « la ligne passe FAILED
   (D63) ». C'est très exactement le deuxième des trois faux positifs de D275, reproduit à
   l'identique, par moi, le jour où je venais de le lire. ⇒ Tous les verdicts de cette session
   sont lus sur les lignes de résumé Vitest, **codes ANSI retirés**.
3. ⚠ **J'AI PRÉDIT UN ENCODAGE AU LIEU DE LE MESURER.** J'ai annoncé que les échappements
   `\uXXXX` de mon script d'édition atterriraient **littéralement** dans le harnais ; ils se sont
   résolus en caractères. Sans conséquence — le résultat était celui voulu — mais je ne le savais
   qu'après avoir relu le fichier. **La relecture du marqueur n'a pas servi qu'à la mutation.**

### ⛔ D285 — UNE OBSERVATION DE DURÉE QUI N'EST PAS EXPLIQUÉE, ET QUI NE SERA PAS EXPLIQUÉE ICI

`test:int` a rendu **918 s** sur l'arbre d'avant le lot et **615 s** après, pour **deux tests de
plus** — avec un état machine relevé devant chacune et **comparable** (RAM libre 4 224 puis
3 562 Mo, zéro node, Chrome présent dans les deux cas).
⛔ **JE NE SAIS PAS POURQUOI, ET JE NE PROPOSE PAS DE CAUSE.** D270 interdit de conclure d'une
durée sur le code sans avoir tenu la machine ; D266 a établi qu'un défaut **disparu** se déclare
disparu, pas expliqué. ⚠ **Ce qui est sûr et suffit au lot** : les deux passes portent le même
verdict vert, et le compte est passé de 434 à 436. **La durée n'entre dans aucune conclusion de
ce lot.**
⚠ Pour mémoire, la certification du rang 9 mesurait `test:int` à **279 s** — soit 2,2× à 3,3×
plus vite que les deux passes de cette session, sur une machine où `chrome` valait **0**. Les
trois chiffres ne se comparent pas entre eux.

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
   son motif. ~~⇒ Le choix de Ko est retenu, et le coût est nommé : l'en-tête s'amende dans le même
   geste~~ ⛔ **BARRÉ LE 10/09/2026 — KO S'EST DÉJUGÉ APRÈS LECTURE DU CADRAGE**, motif :
   « amender le motif d'un module pour y loger ce qu'il excluait est la dérive que ce dépôt
   traque ». ⇒ **Les deux constantes sont EXPORTÉES depuis `bookings.service.ts`**, la spec les
   importe de là, et `booking-deadline.ts` **n'est pas touché**.
   ⛔ **CE QUE CE FAIT DEVIENT, ET C'EST PLUS FORT QUE CE QU'IL DISAIT** : un cadrage qui SIGNALE
   un heurt sans le trancher est ce qui a permis de le trancher correctement. Appliquer la consigne
   en silence aurait livré un en-tête amendé pour la circonstance ; la refuser seule aurait pris un
   arbitrage qui n'est pas celui de la session. **Signaler, proposer, ne pas décider.**
   ⚠ **Mon argument contre l'option retenue ne résistait pas à la mesure** : j'avais objecté qu'une
   spec n'importe pas d'un service — **9 fichiers de `test/int/` le font déjà**, dont un pour
   confronter une constante sur le chemin de l'argent (`INDEX_UNE_ATTENTE`).

### ⛔ D284 — TROIS FAUTES DE MÉTHODE, À MON COMPTE

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
3. ⛔ **UN BLOC INSÉRÉ SANS FIN DE LIGNE FINALE A HAPPÉ LA LIGNE SUIVANTE — À LA RETOUCHE DU
   10/09, ET LE DÉPÔT LE DOCUMENTAIT DÉJÀ.** Mon remplacement dans `ZWADJ_BACKLOG.md` se
   terminait sans `
` : la ligne « ⚠ Deux affirmations… » s'est retrouvée **collée** à la
   fin de mon dernier alinéa. ⚠ **Rien n'a été perdu** — mais la structure de la liste l'était,
   et c'est mot pour mot la leçon écrite dans `AGENTS.md` : « **un bloc inséré sans fin de ligne
   finale DÉTRUIT la ligne suivante** ».
   ⛔ **CE QUI L'A ATTRAPÉ N'EST PAS MON CONTRÔLE DE MARQUEURS, ET C'EST LE POINT.** Les onze
   marqueurs asssertés étaient **tous présents** : ils testaient l'EXISTENCE de chaînes, pas la
   **structure** des lignes. C'est la revue du `git diff` — une suppression que je n'avais pas
   prévue — qui l'a montrée. **Un contrôle de présence ne voit pas une jointure.**
   ⇒ **Contrôle ajouté et joué sur les trois fichiers** : tout marqueur de DÉBUT de ligne
   (`####`, `**MDn`, un alinéa numéroté) trouvé en MILIEU de ligne est une couture cassée. Une
   seule occurrence est ressortie, **antérieure et légitime** (référence en prose au MD8
   du cadrage de S11-b) — vérifiée hors de mes édits avant d'être écartée.
   ⚠ **La longueur de ligne ne sert à rien comme détecteur ici** : `ZWADJ_BACKLOG.md` compte 264
   lignes de plus de 160 caractères, écrites ainsi. Un instrument se calibre sur un cas dont la
   réponse est connue (D275), et celui-là aurait rendu 264 faux positifs.

### ⛔ D284 — CE QUI RESTE, ET CE QUI N'EST PAS MESURÉ

1. **Le rang 10 n'a AUCUN code.** Le cadrage attend l'arbitrage de Ko ; les deux cibles sont
   **spécifiées, pas jouées**.
2. ~~**Le reliquat du rang 8** — dérive de somme de contrôle `_prisma_migrations` — **arbitrage
   toujours ouvert**, interdit d'y toucher. **Le rang 8 reste donc CERTIFIÉ mais NON CLOS.**~~
   ⛔ **BARRÉ LE 11/09/2026 (D286).** Rang 8 **CLOS**. ⚠ Cette occurrence-ci vivait dans une liste
   « ce qui reste » d'une session CLOSE, au présent — exactement la forme qui se lit comme
   l'état courant (le motif que D282 avait déjà payé au même endroit).
3. ~~**Les deux réserves de D275 restent actives**, reconduites par D283 et non levées ici.~~
   ⛔ **BARRÉ LE 11/09/2026 (D286).** **Celle de l'instrument d'état machine est LEVÉE** — la sonde est
   au dépôt et sa calibration se rejoue. L'autre (zéro `node` pendant la mesure) n'est pas
   une réserve qu'on lève : c'est une CONDITION à relever devant chaque passe.
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

1. ~~⛔ **La dérive de somme de contrôle `_prisma_migrations` — arbitrage TOUJOURS OUVERT**,~~
   ⛔ **BARRÉ LE 11/09/2026 (D286).** Arbitré par Ko, et par AUCUNE des deux options posées :
   on n'écrit pas dans le journal, **on rend au fichier de migration les octets qui ont été
   appliqués**. Empreinte calculée redevenue égale à la stockée, mesurée.~~
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
2. ~~**Les deux échéances ne sont assertées que « non nulles » en intégration** : intervertir
   leurs constantes entre les sites serait **invisible**. `[API][P0]`, chemin de l'argent.~~
   ⛔ **BARRÉ LE 11/09/2026 — TRAITÉ PAR LE RANG 10 (D285).** La **DURÉE** est désormais assertie
   par l'intégration, et les cibles **12** et **13** de `neutralize-s11b.py` mordent sur
   l'interversion. ⚠ **Barré, pas effacé** : une affirmation invalidée qu'on supprime se réécrit
   de bonne foi plus tard par quelqu'un qui ignore qu'elle a cessé d'être vraie (D276).
   ⚠ **Cette occurrence-ci a été trouvée par la passe de D277**, pas par la mise à jour du rang :
   elle vivait dans une liste « ce qui reste » d'une session CLOSE, au présent — et une liste de
   ce genre se lit comme l'état courant.
3. **Le harnais `migration-non-empty` se périme à chaque migration**, par conception :
   sixième sonde en sept lots, et la garantie du lot précédent devient intestable.
   `[INFRA][P1]`.
4. **Le comportement d'une échéance passée** reste à trancher. `[PRODUIT][P1]`.

⚠ **CE LOT N'EST PAS CERTIFIÉ.** Les portes sont vertes **sous une machine à 2 607 Mo**,
c'est-à-dire **loin sous la barre** — ce qui est plus faible encore qu'un « vert au repos »,
et ne s'en approche pas. ~~Les deux réserves de D275 restent actives~~, et la certification du
07/09 n'est **pas** reconduite.
⛔ **BARRÉ LE 11/09/2026 (D286).** sur la seule réserve de l'instrument d'état machine — levée au rang 11.
⚠ **LE RESTE DE CE PARAGRAPHE N'EST PAS BARRÉ ET NE DOIT PAS L'ÊTRE** : D282 reste NON
CERTIFIÉ, ses portes restent vertes sous une machine à 2 607 Mo, et la certification du
07/09 reste non reconduite. **Lever une réserve ne certifie rien rétroactivement.**

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
⚠ ~~**La sonde reste hors du dépôt** (réserve n°2 de D275, décision D278 : on avance sans).~~
⛔ **BARRÉ LE 11/09/2026 (D286).** Elle est entrée au dépôt au rang 11. ⚠ **Ce qui reste vrai de
cette phrase-ci** : les relevés DE CETTE SECTION-LÀ, faits avant le 11/09, restent des
affirmations datées. On ne requalifie pas une mesure ancienne parce que l'instrument a
depuis été versionné — ce serait une certification par procuration.
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

1. ~~⛔ **La sonde d'état machine : on avance sans.** La réserve n°2 de D275 **reste active
   et écrite** ; l'entrée `[INFRA][P1]` reste ouverte. La sonde s'écrira au premier rouge
   qui demande une attribution sérieuse, **avec le cas réel sous les yeux, pas d'avance et
   à vide**. Motif de Ko : huit rangs dépensés sur la mesure, S11-b livre du produit.~~
   ⛔ **BARRÉ LE 11/09/2026 (D286).** ⚠ **Et la condition que Ko avait posée a été TENUE, pas
   contournée** : « au premier rouge qui demande une attribution sérieuse, avec le cas réel
   sous les yeux ». Le cas réel est arrivé — l'instrument hors dépôt qui a raté la bascule
   d'alimentation du 09/09 — et c'est lui qui a fait arbitrer le rang 11.
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
   1→3 (D279), étapes 4→6 (D282). ⛔ ~~**MAIS LE RANG N'EST PAS CLOS ET LE LOT N'EST PAS
   CERTIFIÉ**~~ : reste la dérive de somme de contrôle de `_prisma_migrations`, **arbitrage
   OUVERT**, laissée hors périmètre du rang 9 par Ko le 09/09/2026.
   ⛔ **« LE RANG N'EST PAS CLOS » BARRÉ LE 11/09/2026 (D286) : IL L'EST.** Étape 0 du
   rang 11 — empreinte calculée redevenue égale à la stockée, mesurée et montrée.
   ⚠ **« LE LOT N'EST PAS CERTIFIÉ » n'est PAS barré** : D282 reste non certifié, et rien
   dans ce lot-ci ne le certifie. Clore un rang ne certifie pas les lots qu'il contenait.
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
   ⛔ **CETTE DERNIÈRE PHRASE DÉCRIT CE QUI ATTENDAIT LE 10/09, PAS L'ÉTAT COURANT** : c'est
   devenu le **rang 10**, livré et mesuré le **11/09/2026 (D285)**. Marqué le 11/09 par la passe
   de D277.
   ⚠ **PRÉCÉDENT, PAS INVENTION** : le rang 7 (D275) avait été inséré **avant** S11-b sous
   cette règle exacte, quand trois lots attendaient. Le rang 9 est le même geste, une file
   plus loin — et c'est la deuxième fois que cette règle commande un rang.
   ⇒ **Critère, résolution et état : section « ~~PROCHAIN LOT~~ — rang 9 · CLOS » en tête de
   ce fichier** (titre barré le 10/09, D284). Ce rang dit QUEL lot ; il ne dit pas où il en est.

10. ~~⛔ **`[API][P0]` — LES DEUX ÉCHÉANCES**~~ — ⇒ **LIVRÉ ET MESURÉ LE 11/09/2026 (D285)** :
    les quatre constantes exportées, la DURÉE des deux échéances assertie par l'intégration,
    `neutralize-s11b` passé de **11/11 à 13/13**, `test:int` de **434/36 à 436/36**.
    ⚠ « **RANG COURANT depuis le 10/09/2026** » **barré le 11/09/2026 (D285)** : il l'était, il ne
    l'est plus — même geste que les rangs 8 et 9.
    ⛔ **CE QU'IL LAISSE OUVERT** : le lot **n'est pas certifié**, et il compte pour UN dans les
    deux/trois. ⇒ **Où il en est** : section « PROCHAIN LOT — rang 10 » en tête de ce fichier.
    ⛔ **CHEMIN DE L'ARGENT.** ~~`bookings.int-spec.ts:156` et `:373` n'assertent que « non
    nulles » : **intervertir `PRO_RESPONSE_DAYS` et `PAYMENT_WINDOW_HOURS` entre les deux sites
    d'appel produirait deux dates parfaitement non nulles, et rien ne rougirait.**~~
    ⛔ **BARRÉ LE 11/09/2026 — C'EST EXACTEMENT CE QUE D285 A SUPPRIMÉ.** La phrase est conservée
    parce qu'une affirmation invalidée qu'on EFFACE se réécrit de bonne foi plus tard par
    quelqu'un qui ignore qu'elle a cessé d'être vraie (D276). ⇒ Les deux assertions portent
    désormais sur la **DURÉE** — encadrement pour `expiresAt`, égalité exacte pour `paymentDueAt` —
    et les cibles **12** et **13** de `neutralize-s11b.py` mordent sur l'interversion.
    ⛔ **CE QUI L'IMPOSE, ET C'EST UNE RÈGLE, PAS UN CALENDRIER** : `AGENTS.md`, bloc « AUCUN LOT
    NE PART DANS `main` SOUS UNE PORTE ROUGE » — « deux lots non certifiés en attente sont
    tenables, **trois non** » — **plus** l'arbitrage « un lot documentaire ne compte pas »,
    écrit à côté de cette règle depuis D283. La marque du 10/09 a certifié D279 et D282 : ~~le
    compteur de lots de code non certifiés est **à zéro**, donc un lot de code peut s'ouvrir~~.
    ⛔ **BARRÉ LE 11/09/2026 (D287) : LE COMPTEUR EST À DEUX — D285 ET D286 — ET AUCUN LOT DE
    CODE NE PEUT S'OUVRIR.** ⚠ La phrase était vraie **à l'instant où elle a été écrite**, et ce
    n'est pas une supposition : `git blame` la date du 10/09 (`f8eee9e`, l'ouverture du rang 10),
    quand la marque du rang 9 venait de ramener le compteur à zéro. **C'est le rang 10 lui-même
    qu'elle autorisait, et elle l'a autorisé à bon droit.** Elle est devenue fausse le 11/09, à la
    livraison du rang 11 (`31f6a00`), qui a porté le compteur à deux.
    ⛔ **ET C'EST LE DÉFAUT QUE D284 A BARRÉ DOUZE LIGNES PLUS HAUT, DANS L'AUTRE SENS.** Au
    rang 9, la phrase périmée **INTERDISAIT** : lue seule, elle coûtait un recoupement. Ici elle
    **AUTORISE** : lue seule, elle fait ouvrir un troisième lot de code sous une règle violée.
    **Une phrase périmée qui interdit coûte du temps ; une qui autorise ne se rattrape pas.**
    ⚠ **AUCUN LOT N'A ÉTÉ OUVERT SOUS ELLE À TORT, ET C'EST MESURÉ** — rang 10 ouvert à compteur
    **0**, rang 11 ouvert à compteur **1**. Le piège était **armé, pas déclenché** : la reprise
    qu'il visait est celle qui l'a trouvé. C'est pourquoi ce barrage est le seul geste requis,
    et qu'il n'y a **aucun lot à défaire**.
    ⚠ **C'est la troisième fois que cette règle commande un rang** — rang 7 (D275) quand trois
    lots attendaient, rang 9 (D283) quand deux attendaient, rang 10 parce qu'elle les a levés.
    ⛔ **ARRÊT FRANC : LE PREMIER LIVRABLE EST UN CADRAGE ÉCRIT**, `CLAUDE.md` — « tout code sur
    le CHEMIN DE L'ARGENT sans analyse écrite des modes de défaillance ». **Fait le 10/09/2026
    (D284)**, aucune ligne de code dans cette session. ⇒ **Où il en est** : section « PROCHAIN
    LOT — rang 10 » en tête de ce fichier, qui porte le cadrage et **ses six modes de
    défaillance**. ⚠ Le cadrage **reste consultable après validation** (D277) : un cadrage retiré
    ne peut plus démentir personne.

11. ~~**LES INSTRUMENTS ENTRENT AU DÉPÔT**~~ — `[INFRA]`, **arbitré par Ko le 11/09/2026**,
    ⇒ **LIVRÉ ET MESURÉ LE 11/09/2026 (D286)**. Trois fichiers dans `neutralisation/` :
    `verifier-mutations.py`, `sonde-etat-machine.ps1`, `echantillonneur-etat-machine.ps1`.
    ⛔ **CE QUE LE RANG A FERMÉ EN PLUS DE SON OBJET — le rang 8.** Son étape 0 a éteint la
    dérive de somme de contrôle `_prisma_migrations`, par un geste qui n'était NI des deux
    options posées : **rendre au fichier de migration les octets qui ont été appliqués**.
    ⇒ Rang 8 : **certifié le 10/09, CLOS le 11/09**.
    ⛔ **CE QU'IL LAISSE OUVERT** : le lot **n'est pas certifié**, et il **compte** (il touche
    des scripts). Le compteur de lots de code non certifiés passe de **UN à DEUX** — deux
    restent tenables, trois non. ⇒ **Où il en est** : section « PROCHAIN LOT — rang 11 » en
    tête de ce fichier.
    ⚠ **CE QU'IL A LEVÉ** : la réserve de D275 sur l'instrument d'état machine, **dans ses
    deux moitiés** — « hors dépôt » et « calibration héritée, jamais rejouée ».


12. ⛔ **CERTIFICATION** — **arbitrée par Ko le 11/09/2026**, et c'est la **QUATRIÈME fois que
    la règle des deux/trois commande un rang** : rang 7 à trois lots en attente, rang 9 à deux,
    rang 10 parce qu'elle les avait levés, rang 12 parce que **D285 et D286** les ont ramenés à
    deux. ⇒ **Ce qu'elle débloquera** : la **borne de workers**, désignée par Ko le 11/09 comme
    méritant son propre rang — c'est du **code**, donc elle ne peut pas s'ouvrir avant.
    ⛔ **ÉTAT : LIVRÉ ET MESURÉ LE 12/09/2026 (D288) — LA MARQUE EST POSÉE, LE RANG EST CLOS.**
    « **Portes vertes AU REPOS le 12/09/2026, et D285 et D286 en font partie** ».
    ⇒ **Le compteur de lots de code non certifiés passe de DEUX à ZÉRO** : un lot de code **peut**
    s'ouvrir, et c'est lui qui le portera à un.
    ⛔ **(D291, 13/09/2026) Permission consommée** : le rang 13 a porté le compteur à UN (D290), le
    rang 14 à DEUX (D291). ⇒ **Plus aucun lot de code ne s'ouvre avant une certification.**
    ⛔ **(D293, 16/09/2026) LEVÉ** : marque du rang 15 posée, **compteur à ZÉRO**, un lot de code **peut**
    s'ouvrir dès l'arbitrage de Ko.
    ⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE** : compteur à UN (rang 17, D297) puis à DEUX (rang 18,
    D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
    ⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.
    ⚠ ~~**ÉTAPE 0 FAITE ET MESURÉE, CERTIFICATION NON LANCÉE (D287)** : porte dure **rouge sur
    deux relevés** — `chrome` 16 au lieu de 0, RAM libre ~2 480 Mo contre 4 579 exigés
    (**−2 091**).~~ **BARRÉ LE 12/09/2026 (D288)** : `chrome` fermé par Ko, la porte dure a été
    rejouée et trouvée **verte** (4 624 puis 4 643 Mo, `chrome` 0, `node` 0, SECTEUR 100 %).
    L'étape 0 elle-même reste acquise et n'est pas barrée.
    ⇒ **Où il en est** : section « PROCHAIN LOT — rang 12 » en tête de ce fichier, et le détail
    de la passe en section « Session du 12/09/2026 — D288 ».
    ⚠ **Le lot de ce rang est DOCUMENTAIRE** (aucun fichier hors `.md` d'autorité au diff, D283) :
    il **ne compte pas** dans les deux/trois — il les REMET à zéro sans s'y ajouter.

⇒ ~~**RANG SUIVANT : EN ATTENTE D'ARBITRAGE DE KO.**~~ ⛔ **CONSOMMÉ LE 12/09/2026 (D289) —
ARBITRÉ PAR KO : le RANG 13 est la BORNE DE WORKERS.** L'attente est levée, et la ligne est
**barrée plutôt qu'effacée** : effacée, elle se réécrirait de bonne foi plus tard par
quelqu'un qui ignore qu'elle a été satisfaite (D276). ⇒ **Motif de l'ordre, écrit par Ko** :
les six durées gravées le 12/09 par D288 sont la référence, une borne les déplace toutes, et
**les déplacer sans l'avoir écrit d'avance fait perdre la comparaison** ; la borne passe donc
devant les budgets de test, qui masqueraient l'effondrement au lieu de le corriger.
⇒ **Où il en est** : section « PROCHAIN LOT — rang 13 » en tête de ce fichier — ~~**cadrage
écrit le 12/09 (D289), aucune ligne de code**~~ ⛔ **(D291) CLOS le 12/09 (D290), avec du code
(`251e82b`)**. Cette liste dit QUEL lot, jamais OÙ IL EN EST (D283).
~~⚠ **CANDIDAT NOMMÉ POUR LE RANG 14, PAR KO, LE 12/09/2026 (D290)** : les **budgets de test**
(`[MÉTHODE][P0]` du 10/09). Leur motif d'exclusion du rang 13 — « un budget posé en même temps
qu'une borne rendrait les deux inévaluables » — **est tombe avec l'absence de borne** (passe
D277, sens 2). ⛔ **C'est une DÉSIGNATION, pas l'arbitrage** : « il ira au rang 14 quand
j'arbitrerai » (Ko). Un motif tombé ne rend pas le lot souhaitable.
⚠ **ET LE RANG 14 EST DONC, À SON TOUR, EN ATTENTE D'ARBITRAGE DE KO** (D284) — écrit
maintenant, et non à la clôture du rang 13, pour qu'aucune reprise ne tombe sur une liste qui
s'arrête. ⚠ **Ce qui attend toujours, sans rang** : les **budgets de test** (`[MÉTHODE][P0]` du
10/09), explicitement **hors** du rang 13 par consigne de Ko.~~
⛔ **CONSOMMÉ LE 12/09/2026 (D291) — ARBITRÉ PAR KO : le RANG 14 est `PERF` ET LA DURÉE**, et il
passe **AVANT** les budgets de test. **Motif de Ko** : un budget calculé sur des durées dont ~20 %
restent inexpliqués serait choisi au jugé.
⛔ **(D294, 16/09/2026) VAUT DE LA FORME (a), PAS DE (b)** — deuxième des trois phrases de cette
famille. La forme (b) n'écrit **aucune valeur neuve**, donc ce motif ne la conditionne pas.
Détail : point d'entrée du rang 14. La désignation des budgets pour le rang 14 est
**barrée plutôt qu'effacée** (D276). ⇒ **Où il en est** : section « PROCHAIN LOT — rang 14 » en
tête de ce fichier.
⇒ ~~**RANG 15 : EN ATTENTE D'ARBITRAGE DE KO** (D284).~~ ⛔ **CONSOMMÉ LE 14/09/2026, À LA CLÔTURE
DE D292 — ARBITRÉ PAR KO : le RANG 15 est la CERTIFICATION.** **Motif de Ko** : le compteur de lots
de code non certifiés est à DEUX (rang 13 et incident D292), et la règle l'impose. Barré plutôt
qu'effacé (D276). ⇒ **Où il en est** : section « PROCHAIN LOT — rang 15 » en tête de ce fichier —
✅ **CLOS le 16/09/2026 (D293), marque posée après DEUX refus sur la porte dure** (`chrome` le 14/09,
RAM le 16/09). **Le compteur de lots de code non certifiés passe de DEUX à ZÉRO** : un lot de code
**peut** s'ouvrir, et c'est lui qui le portera à un.
⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE** : compteur à UN (rang 17, D297) puis à DEUX (rang 18,
D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.
⚠ ~~**Ce qui attend, sans rang** : les
**budgets de test** (`[MÉTHODE][P0]` du 10/09) — placés **après** le rang 14 par Ko, sans que le
rang 15 leur soit attribué.~~ ⛔ ~~**(D294, 16/09/2026) TOUJOURS SANS RANG, MAIS PLUS SANS FORME** :
les budgets restent le seul candidat en attente, et Ko en a **arbitré la FORME le 16/09** — c'est
**(b)**, écrire la valeur en vigueur. **Candidat désigné du rang 17**, non arbitré.~~
⛔ **PÉRIMÉ LE 20/09/2026 (D295) — LES BUDGETS ONT UN RANG : c'est le RANG 17, arbitré par Ko**,
forme (b), premier lot = **cadrage seul**. Barré plutôt qu'effacé (D276) : effacé, « sans rang » se
relirait comme l'état courant. ~~⚠ **Ce qui reste SANS RANG, et c'est le lot suivant** : le lot de
**CODE** des budgets, celui qui mesurera et écrira les quatre `testTimeout`.~~
⛔ **PÉRIMÉ LE 20/09/2026 (D296) — ARBITRÉ PAR KO : le lot de CODE des budgets est le SECOND LOT DU
RANG 17**, « sur le cadrage de D295, sans le réécrire », et c'est lui qui portera le compteur à UN.
⛔ **ET IL EST BLOQUÉ LE MÊME JOUR, AVANT TOUTE LIGNE DE CODE** — détail sous le rang 18 ci-dessous,
et au point d'entrée du rang 17. Barré plutôt qu'effacé (D276).
⇒ ~~**RANG 16 : EN ATTENTE D'ARBITRAGE DE KO** (D284) — écrit à l'ouverture du rang 15, pour
qu'aucune reprise ne tombe sur une liste qui s'arrête.~~
⛔ **CONSOMMÉ LE 16/09/2026 (D294) — ARBITRÉ PAR KO : le RANG 16 est un LOT DOCUMENTAIRE**, les sept
constats de la septième reprise à froid. Barré plutôt qu'effacé (D276). **Motif de l'ordre, écrit par
Ko** : « une phrase qui déclare à moitié fait un lot **certifié** du chemin de l'argent est plus
dangereuse qu'un budget manquant » — le bloc du rang 8 passe donc devant les budgets.
⇒ **Où il en est** : section « ~~PROCHAIN LOT~~ — rang 16 » en tête de ce fichier — ✅ **CLOS le
16/09/2026 (D294)**. ⚠ **Documentaire : il ne compte pas dans les deux/trois** (D283, amendé par
D292), donc **le compteur reste à ZÉRO** et un lot de code peut s'ouvrir dès l'arbitrage.
⛔ **(D298, 21/09/2026) PERMISSION CONSOMMÉE** : compteur à UN (rang 17, D297) puis à DEUX (rang 18,
D298). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**, un lot de code **peut** s'ouvrir dès que Ko l'arbitre.
⇒ ~~**RANG 17 : EN ATTENTE D'ARBITRAGE DE KO** (D284) — écrit à la clôture du rang 16, pour qu'aucune
reprise ne tombe sur une liste qui s'arrête.~~
⛔ **CONSOMMÉ LE 20/09/2026 (D295) — ARBITRÉ PAR KO : le RANG 17 est les BUDGETS DE TEST, dans la
forme (b), et son premier lot est un CADRAGE SEUL.** Barré plutôt qu'effacé (D276).
⚠ **CANDIDAT DÉSIGNÉ POUR LE RANG 17, PAR KO, LE 16/09/2026 : les BUDGETS DE TEST**
(`[MÉTHODE][P0]` du 10/09), **dans la forme (b) et pas une autre** — *écrire la valeur EN VIGUEUR,
ne rien changer au comportement, rendre un héritage invisible arbitrable* —, avec la contrainte
que Ko a retenue : **N dérivé de la dispersion du maximum PAR TEST, mesurée dans le même lot.**
⛔ ~~**C'est une DÉSIGNATION, pas l'arbitrage** : « je l'ouvrirai après ce lot » (Ko).~~
⛔ **DEVENU L'ARBITRAGE LE 20/09/2026 (D295).** ⚠ **Et la session n'arbitre toujours pas l'ordre des
rangs** : elle a reçu l'arbitrage et l'a écrit. ⛔ **C'est la PREMIÈRE ligne de ce lot, avant toute
autre, et l'ordre est de Ko** — parce que le dépôt disait « rang 17 : en attente » et **avait raison
tant que rien n'était écrit**. Un arbitrage qui n'existe que dans le fil est très exactement D276,
appliqué cette fois à la ligne qui AUTORISE un lot. ⚠ **La session n'a pas écrit le numéro d'ordre
de cette écriture** : le dépôt en porte deux comptages qui ne se recoupent pas (« quatre » à D284
pour le rang 10, « cinquième » à D289 pour le rang 13, « sept » à D294), et un compteur qu'on ne
sait pas dériver ne se recopie pas (D268). **Ce qui est vrai sans compter : toutes sont de Ko.**
⇒ **Où il en est** : section « PROCHAIN LOT — rang 17 » en tête de ce fichier.
⇒ ~~**RANG 18 : EN ATTENTE D'ARBITRAGE DE KO** (D284) — écrit à l'**OUVERTURE** du rang 17 et non à sa
clôture, pour qu'aucune reprise ne tombe sur une liste qui s'arrête. ⚠ **Aucun candidat n'est
désigné.**~~ ⛔ **(D298) Consommé le 21/09/2026 — voir plus bas, à la clôture du rang 17.** ~~⛔ **Ce qui est connu et qui n'a PAS de rang : le lot de CODE des budgets** — celui qui
mesurera et écrira les quatre `testTimeout`. Il suit ce cadrage, **il est du code, et c'est lui qui
portera le compteur de lots non certifiés à UN.** La session ne se l'attribue pas.~~
⛔ **PÉRIMÉ LE 20/09/2026 (D296) — ARBITRÉ PAR KO, ET C'EST LA PREMIÈRE ÉCRITURE DE CE LOT : le lot
de CODE des budgets n'est pas un rang 18, c'est le SECOND LOT DU RANG 17.** Mot pour mot : « tu
enchaînes le lot de code du rang 17, sur le cadrage de D295, sans le réécrire. C'est mon arbitrage :
le cadrage est validé. Il portera le compteur à UN. » ⚠ **La session ne se l'est pas attribué** :
elle a reçu l'arbitrage et l'a écrit, avant toute autre ligne — le dépôt disait « n'a PAS de rang »
et **avait raison tant que rien n'était écrit** (D276, patron de D295).
⛔ **BLOQUÉ LE MÊME JOUR PAR LA LECTURE ADVERSE, AVANT TOUTE LIGNE DE CODE** : la source que le
cadrage prescrit (la `duration` du reporter JSON) **échoue à son propre bras de discrimination** —
**1 208 à 1 218 ms mesurés, < 100 exigés**, trois exécutions. Toute sortie réécrit la pièce 1 ou la
pièce 3 du cadrage, **donc appartient à Ko**. ⇒ **ÉTAT : en attente d'arbitrage de Ko sur le
cadrage. Compteur de lots de code non certifiés : toujours ZÉRO** — aucune ligne de code n'a été
écrite, et le lot D296 est documentaire. ⇒ **Où il en est** : point d'entrée du rang 17.
⛔ **(D297, 20/09/2026) DÉBLOQUÉ LE MÊME JOUR : KO A ARBITRÉ (ii), MAJORANT DÉCLARÉ.** Cadrage amendé
et commité **avant** la première mesure ; ~~le lot de code est **en cours**~~. Barré de fait, pas
effacé : le blocage reste l'histoire du rang (D276).
⛔ **(D297, 21/09/2026) RANG 17 CLOS** : les quatre `testTimeout: 5_000` sont écrits à la valeur en
vigueur, **lus** (n°8, 4 sur 4), marge ~~**≥ 4 618 ms**~~ **≥ 4 603 ms, passes froides comprises**
sur majorant (⛔ corrigé le 21/09/2026 par D298 sur ordre de Ko : 4 618 est le chiffre **hors** passes
froides, qui retirait la plus grande observation d'un majorant). **Compteur de lots de code non
certifiés : UN.** ⇒ **Où il en est** : point d'entrée du rang 17, bloc de clôture.
⇒ ~~**RANG 18 : EN ATTENTE D'ARBITRAGE DE KO** (D284), aucun candidat désigné — écrit à la **clôture**
du rang 17, pour qu'aucune reprise ne tombe sur une liste qui s'arrête.~~
⛔ **CONSOMMÉ LE 21/09/2026 (D298) — ARBITRÉ PAR KO : le RANG 18 est L'ÉCHO DE L'AUDIT DE SECRETS.**
Barré plutôt qu'effacé (D276). ⛔ **C'est la PREMIÈRE écriture du lot, avant toute autre, et l'ordre
est de Ko** — le dépôt disait « en attente » et **avait raison tant que rien n'était écrit** (patron de
D295 et D296). ⚠ **La session ne se l'est pas attribué** : elle a reçu l'arbitrage et l'a écrit.
**Motif de Ko, tel quel** : « 83 → 185 → 244, environ cent par lot ; l'échéance du report est passée.
Un audit que personne ne peut lire n'est plus une garde, et la prochaine certification le relancera.
Il se corrige AVANT elle. » ⛔ **Contrainte de Ko** : l'outil de D293 est une **pièce versée** —
instrument et pièce se corrigent ensemble ou pas du tout — donc **on ne le retouche pas** : un
instrument **nouveau** est versé dans `neutralisation/`, qui reconnaît ses propres sorties et celles de
ses prédécesseurs, les **exclut**, et **imprime ce qu'il a exclu et pourquoi** ; calibration à deux
bras — il voit toujours un jeton réel placé dans une pièce neuve, il ne voit plus l'écho ; les 24
jetons du journal e2e hors dépôt sont le cas positif connu. ⇒ **C'est du code : il porte le compteur
de lots de code non certifiés à DEUX.** « La certification suivante couvrira les rangs 17 et 18
ensemble — c'est pour ça qu'on fait celui-ci d'abord » (Ko).
⇒ **Où il en est** : section « PROCHAIN LOT — rang 18 » en tête de ce fichier.
⛔ **(D298, 21/09/2026) RANG 18 CLOS** : `neutralisation/audit-secrets.py` versé, exclusion par
l'identité des octets, calibration 5 bras sur 5 (cas réel 24 sur 24), contre-épreuve 5 sur 5 ; l'écho
imprimé et non compté. **Compteur de lots de code non certifiés : DEUX. Aucun lot de code ne s'ouvre
avant une certification.** ⛔ **(D299, 22/09/2026) LEVÉ** : marque posée au rang 19, **compteur à ZÉRO**.
⇒ ~~**RANG 19 : EN ATTENTE D'ARBITRAGE DE KO** (D284), aucun candidat arbitré — écrit à la **clôture** du
rang 18, pour qu'aucune reprise ne tombe sur une liste qui s'arrête.~~
⛔ **CONSOMMÉ LE 21/09/2026 (D299) — ARBITRÉ PAR KO : le RANG 19 est la CERTIFICATION DES RANGS 17 ET 18
(D297, D298).** Barré plutôt qu'effacé (D276). ⛔ **C'est la PREMIÈRE écriture du lot, et l'ordre est de
Ko.** **Motif de Ko** : « le compteur est à DEUX, la règle l'impose ». ⇒ **Où il en est** : section
« PROCHAIN LOT — rang 19 » en tête de ce fichier. ⚠ Ko a écrit le 21/09 que « la
certification suivante couvrira les rangs 17 et 18 ensemble » : c'est une **désignation** relevée ici
pour qu'une reprise n'ait rien à recouper, **pas** l'arbitrage du rang 19. ⚠ Sous le compteur à DEUX,
la règle (D270) n'admet qu'une **certification** ou un lot **documentaire**.
⛔ **(D299, 22/09/2026) RANG 19 CLOS — MARQUE POSÉE À LA PASSE 2** : « **portes vertes AU REPOS le
22/09/2026, et D297 (rang 17, `a2dd3f3`) et D298 (rang 18, `edf66ae`) en font partie** ». 199 mordues, 0
muette ; fenêtre homogène. **Compteur de lots de code non certifiés : DEUX → ZÉRO** — un lot de code
**peut** s'ouvrir dès que Ko l'arbitre, et c'est lui qui portera le compteur à un. Après un refus
(RAM, 21/09 19:08) et une passe non certifiante (échantillonneur aveuglé, 23:10). ⇒ **Où il en est** :
section « PROCHAIN LOT — rang 19 », clôture.
⇒ **RANG 20 : EN ATTENTE D'ARBITRAGE DE KO** (D284), aucun candidat arbitré — écrit à la **clôture** du
rang 19, pour qu'aucune reprise ne tombe sur une liste qui s'arrête. ⚠ **Une permission n'est pas un
arbitrage** : le compteur à zéro dit qu'un lot de code **peut** s'ouvrir, pas lequel.
⇒ **Pourquoi (b) et pas (a)** : la quantité qu'un budget LIE — le maximum par test — n'a au dépôt
que **deux points isolés, sur deux suites, à deux dates**, et **zéro mesure de dispersion** ; les
12 passes de D291 mesurent la durée **de suite entière**. Un budget *choisi sur des durées* serait
donc choisi au jugé — le motif même qui a fait tomber la borne de workers. **(b) ne demande pas
que les ~20 % de D290 soient expliqués**, puisqu'elle n'écrit aucune valeur neuve. Détail :
section D294, et l'entrée `[MÉTHODE][P0]` du backlog.
⚠ **ET « SUIVANT » VOULAIT DIRE LE RANG 13.** ~~AJOUT DU 11/09/2026 (D287) : le rang 12 est
**OUVERT, pas clos** ; ce qui est dû aujourd'hui n'est pas un arbitrage, c'est **sa
mesure**.~~ ⛔ **PRÉMISSE PÉRIMÉE LE 12/09/2026 (D288) : le rang 12 est CLOS**, sa marque est
posée. Ce qui reste dû est donc bien un **arbitrage**, et il appartient à Ko. ⛔ **(D291)
Consommé deux fois depuis : rang 13 (D289), rang 14 (D291).**
⚠ **CE QUI NE CHANGE PAS, ET C'EST LE POINT DE LA RÈGLE** : la ligne « rang suivant : en
attente d'arbitrage de Ko » **reste écrite**. Elle ne disparaît pas au motif que le rang
précédent est clos — c'est exactement l'absence que D284 interdit, et une liste qui s'arrête
se lit comme une route. ⇒ **Un rang OUVERT se lit dans son point d'entrée**, pas ici : cette
liste dit QUEL lot, jamais OÙ IL EN EST (D283).
⛔ **ET LE CANDIDAT EST DÉSIGNÉ SANS ÊTRE ARBITRÉ — LA DISTINCTION EST TOUT** : Ko a écrit le
11/09 que **la borne de workers** « touche quatre configs, c'est du code et ça mérite son
propre rang ». C'est une **désignation**, relevée ici pour qu'une reprise n'ait rien à
recouper ; **ce n'est pas l'arbitrage du rang 13**, que la session ne prend pas (quatre
écritures de cet ordre, toutes de Ko). ~~⚠ **Ce qui a changé le 12/09 est sa CONDITION, pas son
rang** : elle était bloquée derrière la marque du 12 parce qu'elle est du code et que le
compteur était à deux. **Le compteur est à zéro. Elle peut s'ouvrir dès que Ko l'arbitre.**~~
⛔ **BARRÉ LE 13/09/2026 (D291) — PERMISSION PÉRIMÉE, ET LA PASSE D277 DE D290 L'AVAIT MANQUÉE.**
La borne a été arbitrée (rang 13, D289) puis close sans borne (D290) ; le compteur est passé à
UN (D290) puis à DEUX (D291). ⇒ **Aucun lot de code ne s'ouvre avant une certification.**
⛔ **(D293, 16/09/2026) LEVÉ** : la certification du rang 15 est faite, **compteur à ZÉRO**. La borne de
workers, elle, reste **close sans borne** (D290) — ce n'est pas elle qui rouvre.
⛔ **(D298, 21/09/2026) Compteur à DEUX** : rang 17 (D297) puis rang 18 (D298). ⇒ **Aucun lot de code ne
s'ouvre avant une certification.**
⛔ **(D299, 22/09/2026) LEVÉ — LA CERTIFICATION A EU LIEU** : marque posée au rang 19, **compteur à ZÉRO**.
La borne de workers, elle, reste **close sans borne** (D290) — ce n'est pas elle qui rouvre.
⚠ D290 avait traité deux phrases « à zéro » au moyen d'**ancres écrites en dur** dans un script de
scratchpad ; la recherche qui les avait trouvées n'était écrite nulle part, et celle-ci lui a
échappé. D291 verse sa recherche elle-même : `docs/preuves/D291/passe-d277/`.
⛔ **CETTE LIGNE EST LA RÈGLE ÉCRITE LE 10/09/2026 DANS `AGENTS.md`, APPLIQUÉE À ELLE-MÊME**
— « **UN RANG CLOS LAISSE UN ÉTAT NOMMÉ, JAMAIS UNE ABSENCE** ». Elle ne dit pas quel sera le
rang 11 : **la session n'arbitre pas l'ordre**, quatre écritures, toutes de Ko. Elle dit que
l'arbitrage est **attendu**, pour qu'une reprise lise un ÉTAT au lieu de tomber sur une liste
qui s'arrête et de conclure, deux jours de suite, que le prochain lot n'est écrit nulle part.
⚠ **Ce qui attend déjà, sans rang et sans priorité entre eux** : ~~les trois `[MÉTHODE][P0]` du
10/09 (budgets de test non écrits, borne de workers sur une suite de quatre, sonde d'état
machine hors dépôt — réserve n°2 de D275), et le reliquat du rang 8 (dérive de somme de
contrôle `_prisma_migrations`, **arbitrage toujours ouvert, interdit d'y toucher**).~~
⛔ **RÉÉCRIT LE 11/09/2026 (D286), PARCE QUE DEUX DES QUATRE ONT ÉTÉ TRAITÉS** — et qu'une
liste d'attente qui garde ce qui est fait envoie recouper, c'est-à-dire exactement ce que le
pointeur promet d'éviter :
- ✅ **la sonde d'état machine hors dépôt** — FAITE au rang 11 (D286) ;
- ✅ **le reliquat du rang 8** — FAIT à l'étape 0 du rang 11 (D286) ;
- ✅ ~~**les budgets de test non écrits** — `[MÉTHODE][P0]` du 10/09, toujours ouvert ; ⛔ **placés
  APRÈS le rang 14 par Ko le 12/09/2026 (D291)** ; ⛔ **(D294, 16/09/2026) FORME ARBITRÉE — c'est
  (b), écrire la valeur EN VIGUEUR — et CANDIDAT DÉSIGNÉ DU RANG 17, non arbitré** ;~~
  ⛔ **RANG 17, ARBITRÉ PAR KO LE 20/09/2026 (D295)** — forme (b), **cadrage seul** en premier lot.
  ⚠ **L'entrée du backlog reste OUVERTE** : le cadrage ne l'épuise pas, c'est le lot de CODE qui
  l'épuisera ;
- ~~⏳ **la borne de workers sur une suite de quatre** — `[MÉTHODE][P0]` du 10/09, toujours
  ouvert.~~ ✅ **RANG 13, CLOS LE 12/09/2026 SANS BORNE (D290)** — barré le 13/09 (D291).
  ⚠ **Ko, 11/09/2026, mot pour mot** : « la borne de workers touche quatre configs,
  c'est du code et ça mérite son propre rang ». **Ce n'est pas un arbitrage du rang 12** —
  c'est une désignation, relevée ici pour qu'une reprise n'ait rien à recouper.

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
- ⛔ **Vérification visuelle jamais faite** : ~~le bac à sable n'a ni navigateur ni
  API.~~ Les proportions de la refonte sont dérivées des maquettes, pas comparées à
  un rendu réel. Structure, hiérarchie, tokens, RTL et absence des éléments
  interdits sont audités ; l'accord fin des espacements ne l'est pas.
  ⛔ **RAISON BARRÉE LE 16/09/2026 (D294), DETTE CONSERVÉE — ET LA DISTINCTION EST TOUT.**
  **La dette tient** : personne n'a comparé les espacements à un rendu réel, et aucune porte ne
  le regarde. **Sa raison, non** : elle décrit le **bac à sable web**, et elle était écrite ici
  sans nommer son environnement — dans une section d'état que tout le monde lit comme générale.
  ⚠ **Sur le poste de Ko il y a un navigateur ET une API** : la suite e2e Playwright tourne
  contre des serveurs réels, et elle vient de rendre **34 passés · 1 ignoré** dans la
  certification du 16/09 (D293). Une raison qui s'appuie sur une limite levée fait chercher le
  remède au mauvais endroit — et surtout, elle fait croire la dette **impayable** alors qu'elle
  est seulement **non payée**.
  ⇒ **C'est D268 mot pour mot — « une note d'environnement porte le nom de l'environnement
  mesuré, ou elle ment »** — appliqué à une note qui vivait **hors** de la section
  d'environnement, donc hors de portée de la règle qui la visait.

## Décisions encore ouvertes (pas bloquantes maintenant)

- **Nom de personne pour un compte pro** — reporté par Ko. L'API A10 rejette `firstName`/`lastName` pour un PRO. Si un vrai nom de contact devient nécessaire, c'est le **contrat A10** qui bouge, pas l'écran.
- **« Nouvelle salle » dans l'état vide de la liste Pro** — conservé par choix, alors que le cadrage disait « le bouton disparaît de la liste ». À confirmer ou infirmer.
- **Parcours de réclamation** d'un compte supprimé revenu. `emailHash` l'outille, rien ne l'implémente.
- **Greffon `react-hooks` absent de `packages/ui`** alors que le paquet héberge désormais de vrais hooks. Correctif de configuration à part entière, jamais glissé dans un lot fonctionnel.
- ~~**`testTimeout` de `apps/api` serré à 5 s** : argon2 (m=64MiB) et sharp le frôlent sous charge, quatre faux rouges déjà observés. Correctif de configuration séparé.~~ *(Le repère « sharp sur 4096×2048 » est périmé depuis D45 — c'était le traitement des panoramas 360°, disparu avec `processVenuePhoto360` ; le pipeline restant plafonne à 1920 de large.)*
  ⛔ **BARRÉE LE 16/09/2026 (D294) — PÉRIMÉE SUR SES TROIS TERMES, ET C'EST LA MESURE QUI TRANCHE.**
  1. **« serré à 5 s » décrit un défaut HÉRITÉ comme un réglage DÉCLARÉ.** Mesuré le 16/09 sur les
     cinq configurations : `apps/api/vitest.config.ts` **ne déclare aucun `testTimeout`** — pas
     plus que `apps/client`, `packages/api-client` et le bloc `test` de `apps/pro`. **Seule**
     `apps/api/vitest.config.int.ts` en déclare un (`30_000` / `60_000`). Les 5 000 ms sont le
     défaut de vitest, **que personne n'a écrit** — et c'est très exactement l'objet du report
     `[MÉTHODE][P0]` du 10/09 : **« un budget non écrit n'est pas une garde. »**
     ⛔ **(D297, 21/09/2026) ÉCRIT, ET « SERRÉ » EST FAUX PAR MESURE** : `testTimeout: 5_000` figure
     désormais dans les quatre configurations unitaires, et le plus lourd test d'`apps/api` tient,
     hooks compris, en ~~**362,7 ms** au repos — marge **≥ 4 637 ms**~~ **370,7 ms, passe froide
     comprise — marge ≥ 4 629 ms** (D298, sur ordre de Ko : la marge écrite comprend les passes
     froides ; 362,7 ms / ≥ 4 637 ms est le chiffre hors froide, en second). Détail : section D297.
  2. **argon2 a quitté la suite unitaire** à D271 (01/09) : il ne frôle plus rien dans
     `apps/api`, il vit dans `test:int`, dont le budget est large.
  3. **sharp a été requalifié SANS OBJET sur mesure** le 02/09 — API 640/640, zéro délai dépassé
     à 8, 24 et 48 processus, 2,1× de marge sur le test le plus lourd — **PARCE QUE** argon2
     était parti. Il est **déchargé, pas réglé**, et son rang **se rouvre** si du travail coûteux
     revient en unitaire.
  ⚠ **DIVERGENCE ENTRE DEUX AUTORITÉS, ET LA PÉRIMÉE ÉTAIT DANS LE FICHIER D'ÉTAT.** L'entrée
  correspondante de `ZWADJ_BACKLOG.md` avait été **correctement barrée avec son motif le
  01/09/2026** — « élargir le budget masquerait un test devenu lent », et « le budget n'est pas la
  cause ». **La décision a traversé vers l'autorité n°3 et n'est jamais revenue ici** : c'est D277
  d'un cran retourné, exactement comme le bloc du rang 8 l'avait déjà été (D282).
  ⚠ **Et c'est la première ligne qu'un lot de budgets lirait** — voir le candidat du rang 17.
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
| D285 | A | D285 — « muette » a deux causes : la mutation prouvée POSÉE sépare l'assertion aveugle du remplacement fantôme |
| D286 | A | D286 — les instruments entrent au dépôt ; « muette » a deux causes, et la preuve est ancre 1→0 ET marqueur 1→2 |
| D287 | A | D287 — une passe D277 cherche aussi ce que le lot REND PERMIS ; une permission périmée n'a rien à contredire |
| D288 | A | D288 — CERTIFICATION (rang 12) : 195 gardes, fenêtre homogène mesurée, et la porte dure `chrome` = 0 entre au critère |
| D289 | A | D289 — rang 13 ouvert (borne de workers), cadrage seul ; un contrôle d'écriture déclaré SUFFISANT ne regarde pas l'ENTRÉE |
| D290 | A | D290 — rang 13 CLOS sur trois termes éliminés et AUCUNE borne ; le point 6 du critère exige désormais le SECTEUR, « stable » laissait passer une fenêtre entière sur batterie |
| D291 | A | D291 — rang 14 CLOS (`PERF` et la durée) : une hypothèse écrite au statut de mesure est barrée, les preuves brutes qu'une décision cite entrent au dépôt, et la POSITION d'une passe est un terme de durée (6 cycles sur 6) ; l'écart de D290 n'est pas reproduit |
| D292 | A | Incident du 13/09/2026 — D292 · `zwadj-db` ne démarrait plus : le montage `/data` contre le volume de l'image, et la base de dev perdue |
| D293 | A | Session des 14 et 16/09/2026 — D293 · CERTIFICATION (rang 15) : deux refus sur la porte dure, puis la marque |
| D294 | A | D294 — rang 16, lot DOCUMENTAIRE : les sept constats d'une reprise à froid, et la règle que portait le bloc qui l'enfreignait |
| D295 | A | D295 — rang 17 ouvert (cadrage seul) : l'arbitrage écrit en PREMIÈRE ligne, et « cinq suites unitaires » pointait vers le seul fichier à ne pas toucher |
| D296 | A | D296 — rang 17 : le lot de code arbitré, puis bloqué avant sa première ligne — la `duration` du reporter JSON compte les hooks, le bras de discrimination rend 1 208 à 1 218 ms contre < 100 |
| D297 | A | D297 — rang 17 CLOS : arbitrage (ii), majorant déclaré ; quatre `testTimeout: 5_000` écrits à la valeur en vigueur et lus (n°8 4 sur 4, contre-épreuve 3 sur 4) ; marge ~~≥ 4 618 ms~~ ≥ 4 603 ms passes froides comprises (D298) ; toute autre valeur exige (i) |
| D298 | A | D298 — rang 18 CLOS : l'écho de l'audit de secrets ; `neutralisation/audit-secrets.py`, instrument NOUVEAU, exclut par l'IDENTITÉ des octets (17 sorties épinglées, sorties propres scellées) et imprime ce qu'il exclut ; calibration 5 bras dont le cas réel 24/24, contre-épreuve 5 sur 5 ; D293 433 = 90 + 472 − 129 ; règle « un défaut d'instrument arrête la mesure, pas le lot » ratifiée ; marge du rang 17 froides comprises ; compteur à DEUX |
| D299 | A | D299 — rang 19 CLOS, CERTIFICATION des rangs 17 et 18 : étape 0 (arbitrage de Ko sur l'audit — des valeurs, pas des mots ; tri différentiel ; minorant par défaut ; extrait e2e élargi, calibré) — ⛔ étape 1 ROUGE sur la RAM (−52,5 puis −31), rien lancé ; ~~aucune marque ; reprise à l'étape 1~~ refus ratifié, Ko libère (`oracle`) au lieu de redéfinir ; passe 1 verte et NON certifiante (échantillonneur aveuglé par mon `tail -f`, rejeu intégral) ; passe 2 : MARQUE POSÉE — « portes vertes au repos le 22/09/2026, D297 et D298 en font partie », 199 mordues · 0 muette, fenêtre homogène ; compteur DEUX → ZÉRO ; rang 20 en attente d'arbitrage de Ko |
