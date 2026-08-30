# Journal — Flux A, B, C, E et passes UI (archivé par le lot R1)

⚠ **DÉPLACÉ, PAS RÉÉCRIT.** Le lot R1 a sorti ces journaux de
`ZWADJ_CONTINUITE.md` pour que le fichier d'état ne pèse plus 250 Ko à chaque
lecture. **Aucune ligne n'a été modifiée** : la non-perte a été vérifiée ligne à
ligne. Le registre des décisions, dans `ZWADJ_CONTINUITE.md`, pointe ici.

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

