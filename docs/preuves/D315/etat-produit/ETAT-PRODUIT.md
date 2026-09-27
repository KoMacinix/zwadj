# État du produit, parcours par parcours — relevé du 26/09/2026 (D315, rang 24)

⛔ **PIÈCE DATÉE, PAS UNE AUTORITÉ.** Arbitrage de Ko (rang 24) : « l'état écrit et prouvé, sans classement » ; « une
pièce datée […], pas une liste dans un fichier d'autorité, parce qu'un état se périme ». Elle décrit le code au commit
**`ffd32e9`** (le code applicatif n'a pas changé depuis `d37ea64` ; seuls des `.md` d'autorité et `docs/preuves/` ont
bougé depuis). **Elle se périme au premier lot de code.** Les fichiers d'autorité n'en reçoivent qu'un résumé et le
renvoi (`ZWADJ_CONTINUITE.md`, section D315 et point d'entrée du rang 24).
⛔ **Aucun classement, aucune recommandation, aucune durée.** L'ordre des lots suivants « sera proposé par le relecteur
et arbitré par [Ko] ».

## Comment lire

**États** : **fonctionne** · **partiel** (ce qui manque est dit) · **cassé à l'écran** (le code existe, une mesure de ce
lot montre que l'écran ne l'atteint pas) · **absent** · **Bientôt** (annoncé, non construit) · **pause** (arrêté par la
pause du chemin de l'argent, D307).
**Preuves** — le niveau est toujours dit :
- `T` test unitaire (Vitest) · `I` test d'intégration sur PostgreSQL réel · `E` spec e2e (Playwright) — ⚠ **aucune spec
  e2e n'exerce un parcours fonctionnel** : A1, A2, A5, B7, B8 mesurent session, appels au montage, rechargement, jetons
  et accessibilité (`e2e/specs/`). Un `E` dit « l'écran a été chargé dans un vrai navigateur », jamais « le parcours
  marche » ;
- `C<n>` capture n° n de ce lot (`../captures/images/`, relevé `../captures/releve.txt`) — l'écran s'est ouvert, et ce
  qu'il montre ;
- `M` mesure de ce lot, versée (`../mesures/`, `../lecture-adverse/` n'en fait pas partie) ;
- `L` lu dans le code, non exercé.
**Renvois** : `B:<ligne>` = ligne de `ZWADJ_BACKLOG.md` **à `ffd32e9`** ; les 146 entrées ouvertes des phases 6, 8, 9,
10 et 12 sont confrontées une à une dans `ENTREES-CONFRONTEES.md` (verdicts comptés par `compter-verdicts-sortie.txt`).
**Chemin de l'argent** — la **règle** de D304 (branches 1 à 4) complétée par D311 (5 et 6) et le principe de direction
de D307 ; les fichiers par la **carte datée** `docs/preuves/D304/carte-chemin-argent/carte-sortie.txt` (à `2b9f8d5`) et le
tri de D307. ⛔ **Pendant la pause, tout point marqué « chemin : OUI » ne s'ouvre pas sans Ko.** Là où la session doute,
elle l'écrit « **à trancher par le relecteur** » (D304 : « en cas de doute, la session DEMANDE ») — elle ne tranche pas.

---

## 1. La carte — chaque application et ses écrans, relevés dans le code

Relevé mécanique : `outils/carte-routes.py` → `carte-routes-sortie.txt` (calibré sur deux cas connus, dont le `@Roles`
posé après `@Get` qui avait fait défaut à sa première version).

**`apps/client` (Next.js)** — **13 pages** sous `/[locale]` (`fr`, `ar`) :

| route | écran | accès |
|---|---|---|
| `/` | accueil | public |
| `/salles` | recherche (groupe `(recherche)`, avec `loading.tsx`) | public |
| `/assistant` | assistant de filtres (4 étapes) | public |
| `/salles/[slug]` | fiche salle (calendrier, demande de réservation, visite, Matterport) | public ; demande et visite exigent un compte CLIENT |
| `/auth/connexion`, `/auth/inscription`, `/auth/mot-de-passe-oublie`, `/auth/reinitialisation`, `/auth/verification-email` | authentification | public |
| `/compte` | « Configuration du compte » : mes réservations, mes rendez-vous, profil, e-mail, mot de passe, suppression | CLIENT (garde côté client) |
| `/cgu`, `/confidentialite` | « Bientôt disponible » | public, indexables |
| `/[...rest]` | attrape-tout → 404 localisée | — |

Fichiers spéciaux : `[locale]/layout.tsx`, `[locale]/not-found.tsx`, `salles/(recherche)/loading.tsx`, `app/not-found.tsx`.
Navigation : Accueil, Salles ; **Prestataires, Inspirations, Mes outils, Communauté = « Bientôt »** (`<span>`, D-UI-N1).

**`apps/pro` (React + Vite)** — **14 routes** (`src/App.tsx`) :

| route | écran | garde |
|---|---|---|
| `/auth/connexion`, `/auth/inscription`, `/auth/mot-de-passe-oublie` | entrées | fermées à une session ouverte (D148) |
| `/auth/reinitialisation`, `/auth/verification-email` | jetons d'e-mail | ouvertes |
| `/` | tableau de bord — « Nouvelle réservation » (client sur place, 5 étapes) | PRO |
| `/salles`, `/salles/nouvelle`, `/salles/:id?etape=1…7` | liste, création, assistant de salle | PRO |
| `/demandes` | demandes de date + rendez-vous de visite | PRO |
| `/calendrier` | calendrier de la salle (lecture seule) | PRO |
| `/reservations` | dates verrouillées (`ACCEPTED` + `CONFIRMED`) | PRO |
| `/compte` | compte pro, canaux de notification (D60) | PRO |
| `*` | redirection vers `/` | — |

**`apps/api` (NestJS)** — **78 routes** dans **22 contrôleurs**, préfixe `/api/v1` (détail rôle par rôle dans la
sortie). Deux faits de structure :
- ⛔ **le module de paiement n'a AUCUNE route** : `PaymentsService` n'est appelé par aucun contrôleur
  (`verifier-deploiement-sortie.txt`, [14]) — l'ouverture d'un paiement n'est atteignable par personne ;
- ⛔ **l'administration n'a aucun écran** (décision produit n° 4) : cinq routes `ADMIN` (publier, taux de commission,
  lister / approuver / rejeter les demandes de suppression) ; **aucun chemin du produit ne crée un compte ADMIN** — le
  script de captures a dû poser le rôle en base.

---

## 2. Les parcours

### 2.1 Client — accueil → recherche → salle → demande → suivi

| étape | état | preuve | backlog | chemin de l'argent |
|---|---|---|---|---|
| **C0 · compte** (inscription, connexion, Google, mot de passe oublié) | **fonctionne** en développement ; ⚠ l'e-mail de vérification ne part que dans la console (adaptateur de dev lié sans condition) : **hors développement, une inscription ne se termine pas** | `I` register, login, google, verify-email, forgot/reset-password, refresh, remember-me ; `E` A1 ; `C05–C09`, `C17–C21` | B:568, B:574, B:575 ; audit sécu 09/09 · journaux (B:3087) ; case CGU non transmise (· divers 5) | non |
| **C1 · accueil** | **fonctionne** ; formulaire à deux champs (invités, budget) : ni lieu ni date ; carte « à venir » ; rubrique prestataires « à venir » | `T` `app/[locale]/page.test.tsx` ; `E` B7, B8 (FR clair et sombre, AR RTL) ; `C01`, `C13` ; `M3` : l'accueil **arabe** mène bien à `/ar/salles` | B:619 (partiel), B:620–B:622 | non — ⚠ le budget est converti dinars → centimes **vers l'API** (`centsFromDinars`), mais c'est un filtre, pas une valeur stockée : **à trancher par le relecteur** si un lot y touche (principe de D307) |
| **C2 · recherche** (`/salles`, `/assistant`) | **fonctionne** : filtres commune, capacité, budget, styles, type de cérémonie, équipements (`C14`) ; ⚠ **aucun sélecteur de date à l'écran** — `availableOn` n'est atteint que par l'URL (le seul `type="date"` d'`apps/client` est le commentaire qui le dit, `search-view.tsx:226`) ; tri récent / prix ; pagination par liens ; vue « carte » = panneau « à venir » ; favoris = cœur **désactivé** (« Bientôt ») | `T` search-view, filter-wizard, search-query, seo ; `I` venues-public, venue-styles-filters ; `E` B8 (`/fr/salles`) ; campagnes `maxprice`, `horizon`, `available-on` ; `C02`, `C03`, `C14`, `C15` | B:625–B:633 (réalisés, sauf tri « recommandé », B:716) ; B:390 recherche plein texte absente ; « DÉFAUT B » (B:1325) **résolu dans le code** (D254) mais ouvert ; date comme 5ᵉ étape de l'assistant (B:1548, et son double B:1769) | idem C1 |
| **C3 · fiche salle** | **fonctionne** en consultation : calendrier des prix, capacité, « à partir de », équipements, Matterport au geste, bandeau d'indisponibilité ; galerie sans visionneuse (écart A8) ; **aucun avis** (tables en base, aucune route) ; pas de schema.org | `T` venue-detail-view, availability-calendar ; `I` venues-public, availability ; `E` **aucune** — A5 porte `test.skip(… « nécessite une salle de fixture »)` ; `C04`, `C16`, `C26` | B:636–B:643 ; B:386–B:388 ; B:792 | non (affiche des prix reçus du serveur) |
| **C4 · demande de réservation** | ⛔ **CASSÉ À L'ÉCRAN — mesuré.** Le panneau demande une fenêtre de **182** jours ; le contrat refuse au-delà de **92** bornes incluses (D147) : **400 `windowTooWide`**, le panneau reçoit `null` et affiche « Cette salle ne propose aucune date pour le moment » ; aucun créneau n'est sélectionnable, « Envoyer ma demande » reste inactif. **L'API, elle, accepte la demande** (409 `BOOKING_PRICE_CHANGED` puis 201, script de captures). Constante fautive depuis `909702a` (03/08/2026). ⚠ **La règle qui l'interdit existe** : D147, « toute borne côté front est IMPORTÉE du contrat (`AVAILABILITY_MAX_WINDOW_DAYS`), jamais recopiée » (`AGENTS.md`), écrite le 16/08/2026 (`ef40c2b`) sur le panneau des **visites** ; le panneau de demande, antérieur, n'a pas été rapproché. ⛔ **Visiteur anonyme** : « Se connecter pour demander » mène à **`/fr/connexion` → 404** (la page est `/fr/auth/connexion`) — le lien voisin de la visite, lui, est juste. ⚠ Champs sans `<label>` visible : **1 `<label>` pour 8 champs** (D143). ⚠ Le panneau envoie toujours `paymentMethod: "CASH"` : le choix en ligne / espèces (et la remise) n'existe pas | `M` `mesures/mesurer-fenetre-panneau-sortie.txt` (deux bras : 182 j → 400 ; 92 j → 200) ; `M1`, `M2` (`captures/releve.txt`) ; `C25`, `C26` ; `T` booking-request-panel.test — ⚠ **son double de `fetch` répond `ok` quelle que soit l'URL** : il ne peut pas voir un refus de fenêtre (mesure confondue, D209) ; `I` bookings.int-spec (API) ; `E` aucune | B:646, B:655 (cassés) ; B:643, B:651, B:652 (partiels) ; B:653 (absent) ; B:356 idempotence absente ; A3 (B:2897), R2 (B:2908) ; **les défauts de cette ligne sont neufs** : reports de D315 | **OUI** — `booking-request-panel.tsx` est sur la carte (branche 1, `previewDeposit`) ; il transporte créneau, invités et prestations vers le calcul (branche 5) et présente l'acompte (branche 6) ; côté API `booking-charge.ts`, `deposit.ts` (1), `booking-admission.ts` (5, S11a-7). ⚠ La ligne fautive (fenêtre) ne calcule aucun montant : **à trancher par le relecteur** |
| **C4bis · prise de visite** | **fonctionne** : créneaux de 30 min sur la fiche, pris / libres, confirmation immédiate | `I` visit-bookings, visit-slots ; `C26` (panneau, 30 jours de créneaux) ; API : 201 (script de captures) ; `T` **aucun** pour `visit-booking-panel.tsx` (lu dans le code) | B:372, B:642, B:780 (réalisés) | non |
| **C5 · suivi** (`/compte`) | **fonctionne** en lecture : la demande « En attente de réponse de la salle » avec montant et acompte, le rendez-vous de visite ; annulation (`DELETE`), motif exigé sur `ACCEPTED` par `window.prompt` ; pas de vue détail. ⛔ **Même écran, section « Supprimer mon compte » : ERREUR pour tout compte sans demande — mesuré** : `GET /me/deletion-request` rend **200 à corps vide** (`Content-Length: 0`) ; `authedRequest` ne tolère un corps vide que sur un 204 et appelle `res.json()`, qui lève ⇒ « Impossible de vérifier l'état de votre demande » ; **la demande de suppression (D37) n'est proposée à personne**. Le commentaire de `account-client.ts` affirme normaliser ce cas : la normalisation vient **après** le `res.json()` qui a déjà levé | `T` bookings-section, visit-bookings-section, account-settings-view ; `I` bookings, account ; `E` A2 (un seul `GET /me/bookings` et `/me/visit-bookings` au montage), B8 ; `C27` ; `M` `mesures/mesurer-deletion-request-sortie.txt` (deux bras : sans demande 200 / 0 octet, le décodage lève ; avec demande 200 / JSON) ; `T` **aucun** pour `account-client.ts` | B:660, B:661 (réalisés), B:662 (absent) ; **défaut de suppression neuf** : reports de D315 | **OUI** en lecture — montant et acompte présentés au client comme ce qu'il doit payer (branche 6) ; l'annulation est une transition (branche 2) |
| **C6 · après acceptation : payer l'acompte, être confirmé** | ⏸ **pause** — aucune route de paiement, aucun écrivain de `CONFIRMED` ; `PAYMENTS_ENABLED` vaut `false` par défaut | `L` ; carte des routes ; `verifier-deploiement-sortie.txt` [14] | B:360, B:361, B:364, B:663–B:667 ; E3c/d/e ; R1 (B:2922) ; F2 (B:2855), F6 (B:2870), F8 (B:2883) | **OUI** (branches 2, 3) |
| **C7 · expiration et notifications** | **absent** (expiration : **0** écrivain d'`EXPIRED`, `pg-boss` absent de tous les `package.json`) ; notifications : **partiel** — abonnements présents (demande reçue, acceptée, refusée, annulée par le pro, visites), transport **journal de dev** seulement ; F7 : un compte `ar` reçoit du français ; l'annulation par le pro réutilise le message du refus (`notification-subscriptions.ts:33`) | `L` ; `I` (notifications sur transport de dev) ; carte D304 : « 0 écrivain d'EXPIRED » ; `verifier-deploiement-sortie.txt` [6], [7], [11], [12] | B:359, B:568–B:592 ; F7 (B:3053) | **OUI** pour les notifications de réservation (branche 6, S11a-11 ; la notification EST l'instruction de paiement tant que le paiement est en espèces) et l'expiration (branche 2, « expire » est nommé par D304) |

### 2.2 Pro — salles → demandes → devis → calendrier

| étape | état | preuve | backlog | chemin de l'argent |
|---|---|---|---|---|
| **P0 · compte pro** | **fonctionne** ; canaux de notification e-mail / WhatsApp au choix (D60), mais les deux transports sont des journaux de dev ; ⛔ section de suppression **en erreur, même défaut que C5** | `T` account-settings-page ; `E` A5, B8 ; `C28–C32`, `C46` | B:778 (fournisseur WhatsApp : décision ouverte) | non |
| **P1 · salles** (liste, création, assistant en 7 étapes — libellés relevés dans `fr.json`, `venue.ui.wizard.step1…7` : « L'essentiel », « Emplacement », « Présentation », « Réservation », « Prestations », « Photos et visite virtuelle », « Publication ») | **fonctionne** ; ⚠ **le pro ne peut pas publier** : l'étape « Publication » règle la visibilité (D33) et annonce « En attente de publication par Zwadj » ; la publication est une route ADMIN (au moins un créneau actif exigé) ; le prix saisi à la création est écrasé au premier créneau sans que l'écran le dise (B:728) | `T` venue-list, venue-wizard, venue-form, slots-section, pricing-rules-editor, services-section, photos-section, visits-section, blocks-section ; `I` venues-pro, slot-templates, services, venue-media, visit-availabilities, availability-blocks ; `E` A2, A5, B8 (liste et création ; **jamais** `/salles/:id`) ; `C34–C42` | B:697–B:701 (réalisés) ; B:728 (absent) ; B:738 (réalisé) | **OUI** — saisie des prix de créneau, des règles de prix, des prestations et de la politique d'acompte : conversions **vers** le serveur (D307 ; `deposit-section.tsx` et `pricing-rules.service.ts` dedans ; `packages/types/src/venue.ts`, branche 1) |
| **P2 · demandes** (`/demandes`) | **fonctionne** : demandes en attente avec montant et acompte, accepter / refuser, badge de conflit avant le clic, rechargement sur 409 ; volet visites avec annulation | `T` booking-requests-section, request-scope, visits-section ; `I` bookings (accept / decline / cancel — rang 23 : F1 et F5 **closes**, certifiées), visit-bookings ; `E` **aucune** ; `C43` | B:692–B:695, B:702 (réalisés) ; F6 (B:2870) ouvert | **OUI** (branche 2 : accepter, refuser, annuler) |
| **P3 · devis** | **partiel** — le tableau de bord porte le parcours « client sur place » en 5 étapes (client, date, créneau, prestations, devis) : devis `DRAFT` chiffré par le serveur → révision → remise → conversion en demande → acceptation (`ACCEPTED`, jamais `CONFIRMED`). ⛔ **L'écran des devis existants (`QuotesSection`) n'est plus monté** depuis la refonte UIP (retrait assumé, écrit dans `dashboard-page.tsx`) : envoyer un brouillon existant, marquer un devis refusé, convertir plus tard — **inatteignables** ; seul le taux de transformation survit dans le panneau | `T` walkin-journey, quotes-section (**composant non monté**), dashboard-aside ; `I` quotes ; `E` A5, B8 (chargent `/`) ; `C33` | B:703 (réalisé autrement) ; B:352 `GET /quotes/:id` absent ; F2 (B:2855) ouvert | **OUI** (branches 1 et 2 : `quotes.service.ts`, `quote-transitions.ts`, `quote-store.*` sur la carte) |
| **P4 · calendrier** (`/calendrier`) | **fonctionne** en lecture seule, prix par créneau au jour choisi (`venue-calendar.tsx:287`) ; les blocages se posent dans l'assistant de salle | `T` calendar-source, blocks-section ; `I` availability, availability-blocks ; `E` aucune (A5 : `test.skip`) ; `C44` | B:696, B:697, B:738 (réalisés) | non (affiche des valeurs reçues) |
| **P5 · réservations** (`/reservations`) | **fonctionne** : dates verrouillées `ACCEPTED` + `CONFIRMED` (le second n'est produit par rien) | `L` — **aucun test** de `bookings-page.tsx` ; `C45` | — | non |
| **P6 · ce que la phase 10 prévoyait et qui n'existe pas** | **absent** : revenus et commission (B:705), gestion des clients (B:704) ; tableau de bord à indicateurs **partiel** (B:691) | `L` | B:691, B:704, B:705 | B:705 : **OUI** (commission) |

### 2.3 Admin — aucun écran (décision produit n° 4 : routes protégées + DBeaver)

| étape | état | preuve | backlog | chemin de l'argent |
|---|---|---|---|---|
| **A0 · devenir ADMIN** | **absent du produit** — ni seed, ni route, ni écran : `UPDATE users SET role` en base (ce que le script de captures a fait) ; pas de MFA | `L` ; script de captures | B:834 (garde réalisée) ; MFA (B:1077) | non |
| **A1 · publier une salle** | **fonctionne par l'API** (garde « au moins un créneau actif ») | `I` venues-admin ; mesuré : **200** (`captures/releve.txt`) | B:830 (réalisé, ouvert à tort) | non |
| **A2 · rejeter une salle** | **absent** | carte des routes | B:831 | non |
| **A3 · taux de commission** | **fonctionne par l'API** (1–5 %, cashback ≤ commission : D35) | `I` venues-admin | B:832 (réalisé) | **OUI** (branche 1, `venues-admin.service.ts`) |
| **A4 · demandes de suppression** (lister, approuver, rejeter) | **fonctionne par l'API** ; ⛔ côté utilisateur, **déposer** une demande est impossible à l'écran (C5) ; l'anonymisation ne touche pas les instantanés de contact des réservations | `I` account ; `verifier-deploiement-sortie.txt` [22] | audit sécu · conformité (B:3160) | non |
| **A5 · cashback** (vérifier, payer) | **absent** (tables en base, aucune route) | carte des routes | B:381, B:382, B:833 ; décision ouverte B:1801 | **OUI** |
| **A6 · paiements, remboursements, réconciliation** | ⏸ **pause** | — | PHASE 7 | **OUI** |
| **A7 · procédure DBeaver écrite** | **absent** (aucun document hors `docs/preuves/` et `docs/history/`) | `git ls-files docs` | B:835 | non |

---

## 3. Les décisions produit

### 3.1 Écrites, non réalisées dans le code

| décision | où elle est écrite | ce que dit le code à `ffd32e9` |
|---|---|---|
| Incitation anti-fuite : −1 000 DA en ligne, cashback sur reçu (décisions 7 et 10, D35) | `AGENTS.md` (« Prestations, commission… ») ; continuité, décisions tranchées | rien : aucune remise, aucune route de cashback, le panneau de demande envoie toujours `CASH` |
| Request-to-book : paiement de l'acompte après acceptation (décision 14) | idem | aucune route de paiement (pause) |
| Commission calculée sur le prix résolu du créneau (D46) | continuité, D46 | aucune `Commission` n'est jamais créée (E3d, pause) |
| Expiration des demandes `pending` (cycle `Booking`) | `AGENTS.md` (« Modèle de réservation ») | 0 écrivain d'`EXPIRED` |
| Idempotence de `POST /bookings`, dédoublonnage du webhook | `AGENTS.md` (« ce qui est DÛ ») | 0 mécanisme |
| Notifications au pro par e-mail et/ou WhatsApp (D60) | continuité, D60 | le choix existe ; les deux transports sont des journaux de dev |
| « `NEXT_PUBLIC_SITE_URL` est obligatoire en production » (D216) | `AGENTS.md` | repli silencieux sur `http://localhost:3000`, aucune garde ([17]) |
| « Un champ de saisie porte un `<label>` visible » (D143) | `AGENTS.md` | panneau de demande : 1 `<label>` pour 8 champs |
| Contrôles visuels D43 et D44, « à faire par Ko, hors code » | continuité, « Reste à faire par Ko » | non tracés comme faits |
| Pages « Bientôt disponible » (décision 11) | continuité | écart assumé et écrit (UI-N1) ; ⚠ CGU et confidentialité sont elles aussi « Bientôt », alors que l'inscription y renvoie |

### 3.2 Ouvertes, qui attendent Ko

- **Rang 25 et l'ordre des lots suivants** — proposés par le relecteur, arbitrés par Ko (arbitrage du rang 24).
- **La reprise du chemin de l'argent** (R1 en premier, puis 23b, 23c, E3) — un rang que Ko arbitrera (D307).
- **Le sort des étiquettes P0-P3** existantes du backlog (D302).
- **Remise en ligne ou cashback** : `cashbackRateBps` est-il la remise au paiement ou un mécanisme distinct ? (B:1801)
- **Fournisseur WhatsApp**, envoi synchrone ou par file (B:778).
- **Énumération par `EMAIL_ALREADY_USED`** : « choix produit d'abord » (audit sécu · divers 4, B:3138).
- **Conservation des instantanés de contact** après anonymisation — « décision juridique d'abord » (B:3160).
- **`THROTTLE_*` hors schéma contre l'audit** — « à arbitrer contre D128 » (B:3100).
- **HTML initial des pages 404** : « décision de structure, non prise » (B:1340) — non re-mesuré ici (le constat porte sur
  un build de production ; ce lot n'a fait tourner que les serveurs de développement).

---

## 4. Ce qui bloque un déploiement — confronté au code

Relevé mécanique à `ffd32e9` : `outils/verifier-deploiement.py` → `verifier-deploiement-sortie.txt` (calibration deux bras
sur des cas synthétiques ; chaque constat imprime ce qu'il a parcouru). Les entrées de D302 (audits du 09/09, confrontés à
`d0a1ec4`) sont **rejouées** ici, pas recopiées.

**Sécurité**
- en-têtes HTTP de sécurité et `helmet` : **absents** des trois applications ([1]) — B:843, B:844 ;
- `trust proxy` : une **note** dans `main.ts:17`, aucune configuration ([2]) ; limiteur en mémoire du processus (B:3138, 2) ;
- ⚠ **Swagger (`/api/docs`) monté sans condition d'environnement** (`main.ts:33`, [3]) — **pas relevé comme risque au
  backlog** (seule la publication de la documentation y figure, B:994) ;
- MFA : **absent** ([4]) ; plafond absolu de session : absent (B:3167) ;
- `.gitignore` : seul `.env` ([5]) — `.env.production`, `.env.staging` non couverts (B:3138, 1) ;
- `GOOGLE_CLIENT_SECRET` : rotation **non faite** (B:1784 ; la partie Chargily est close sur déclaration de Ko, D307) ;
- dépendances : 55 avis, dont 2 critiques et 30 élevés, relevés le 23/09 (B:3111, `docs/preuves/D302/dependances/`) —
  non rejoués ici ; lecture de `sharp` avant le contrôle de format (même entrée).

**Configuration de production**
- e-mail et WhatsApp : adaptateur « journal de dev » **lié sans condition** ([6], [7], [8]) — rien ne part ;
- variables exigées en production : **présence** seule de 5 variables ; `CORS_ORIGINS` n'y est pas et retombe sur
  `localhost` ([9], [10]) ;
- médias : **disque local seulement**, adaptateur S3 différé ([8]) ;
- file de tâches : `pg-boss` **absent** ([11]) ⇒ ni expiration, ni envoi différé ;
- **aucun Dockerfile, aucune CI, aucun fichier d'hébergement** ([13]) ; aucune sauvegarde ni restauration testée (B:3128) ;
- paiement : **aucune route** ([14]), `PAYMENTS_ENABLED=false` par défaut — pause.

**SEO**
- `robots` et `sitemap` : **absents** ([15]) ; `alternates.languages` (hreflang) : **absent** ([16]) ;
- `NEXT_PUBLIC_SITE_URL` : repli sur `localhost`, sans garde ([17]) ⇒ des `canonical` vers `localhost` si oubliée ;
- schema.org : **absent** ([18]) ;
- CGU et confidentialité : pages **indexables** au contenu « Bientôt disponible » ([19], [20]) ;
- pages 404 : HTML initial vide sur un build de production (B:1340, non re-mesuré).

**Conformité**
- CGU et politique de confidentialité : **texte absent** ([19], [20]) ;
- case d'acceptation de l'inscription : **exigée à l'écran, non transmise à l'API**, sans version ([21]) ;
- ⛔ **demande de suppression de compte : inatteignable à l'écran** (C5, mesuré) — le droit à l'effacement passe par elle ;
- anonymisation : **aucune** écriture sur `bookings` ([22]) ;
- loi 18-07 (cartographie des flux), consentement cookies : rien au dépôt (PHASE 14 ; l'audit note qu'une absence de
  bannière n'est pas à elle seule une non-conformité).

**Relecture humaine de l'arabe**
- **1 094 clés FR = 1 094 clés AR**, symétriques ([23]) ;
- **aucune relecture humaine n'est tracée comme faite** : balayage large (`outils/relecture-arabe.py`, sortie versée) —
  6 occurrences de « relu / relue / relecture / relire » près de « arabe / AR / locuteur » dans les trois fichiers
  d'autorité, **lues à la main** : 5 sont les entrées ouvertes qui disent « non relues », 1 est sans rapport ;
- lots signalés non relus : ~136 clés (B:1781), ~17 (B:1544), 3 (B:1356), 19 (B:1811), 1 (B:1712) — chaque lot l'écrit ;
  ⚠ leur somme ne mesure pas le reste : **aucune** clé n'est tracée comme relue ;
- F7 : les notifications de réservation d'un compte `ar` partent en français (B:3053).

---

## 5. Le coût de chaque manque

En termes qui se relèvent (forme de D302) : **nature** (code ⇒ compte dans les deux/trois de D270 ; documentaire ou hors
code ⇒ ne compte pas, D283 amendé par D292) · **fichiers** · **e2e** · **chemin de l'argent** · **migration** · autre.
⛔ Aucune durée, aucun classement, aucune recommandation. Les manques déjà chiffrés au backlog par D302 et suivants gardent
leur coût là-bas ; ils sont renvoyés, pas recopiés.

| manque | nature | fichiers touchés (relevés) | e2e | chemin de l'argent | migration | autre |
|---|---|---|---|---|---|---|
| fenêtre du panneau de demande (182 > 92) | code (compte) | `apps/client/src/components/venue/booking-request-panel.tsx` ; son test (double de `fetch` aveugle à l'URL) | aucune spec ne visite la fiche salle (A5 : `test.skip`) | fichier sur la carte (branche 1) ; ligne fautive hors calcul : **à trancher par le relecteur** — pendant la pause, ne s'ouvre pas sans Ko | non | — |
| lien « Se connecter pour demander » → 404 | code (compte) | même fichier | idem | idem | non | — |
| champs sans `<label>` (D143) | code (compte) | même fichier | B8 ne visite pas la fiche | idem | non | messages i18n FR/AR |
| suppression de compte en erreur (corps vide) | code (compte) | `packages/api-client/src/auth-client.ts` **ou** `account-client.ts` (client partagé : **les deux applications**) ; ou l'API (`account.controller.ts`) — ⚠ changer la réponse de l'API est un **contrat d'API** : à demander avant (`CLAUDE.md`) | exigée (auth, compte) | non | non | aucun test de `account-client.ts` aujourd'hui |
| paiement de l'acompte, confirmation, remboursement | code | module `payments/`, webhook, file | exigée | **OUI** — pause | selon E3 | E3c/d/e, R1, F2, F6, F8 : coûts écrits au backlog |
| expiration des demandes | code (compte) | `bookings.service.ts`, `booking-transitions.ts`, planificateur | exigée (concurrence) | **OUI** (branche 2) | possible | **dépendance** (`pg-boss` absent) |
| idempotence de `POST /bookings` | code (compte) | `bookings.controller.ts`, `bookings.service.ts` | exigée | le point d'entrée appelle `booking-charge.ts` (branche 1) : **à trancher par le relecteur** | **oui** (clé stockée) | — |
| e-mail et WhatsApp réels | code (compte) | `email.module.ts`, `whatsapp.module.ts`, adaptateurs neufs | exigée (auth) | notifications de réservation : **OUI** (branche 6) | non | **dépendance** ; DNS (SPF, DKIM, DMARC) hors code ; ne mord qu'en production |
| F7 — notifications `ar` en français | code (compte) | `booking-notification-input.ts` et sa spec | non | **OUI** (branche 6, S11a-11) | non | coût écrit au backlog (B:3053) |
| gestion des devis existants (`QuotesSection` non montée) | code (compte) | `apps/pro/src/dashboard/dashboard-page.tsx` ou écran neuf ; `quotes-section.tsx` | exigée | **OUI** (branches 1 et 2) | non | — |
| détail d'une demande côté client | code (compte) | `apps/client/src/components/account/` ; route neuve si écran dédié | — | **OUI** si les montants y sont présentés (branche 6) | non | — |
| avis clients | code (compte) | API (routes neuves), client | exigée | non | non (tables présentes) | modération |
| cashback et remise | code | API, client, pro | exigée | **OUI** | à cadrer | décision ouverte B:1801 d'abord |
| créer un ADMIN, rejeter une salle, procédure DBeaver | code (compte) pour les deux premiers ; **documentaire** pour la procédure | `venues-admin.controller.ts` et service ; `docs/` | exigée (auth) pour la création | non | non | MFA : coût à B:3138 (3) |
| en-têtes de sécurité, `trust proxy`, Swagger conditionnel | code (compte) | `app.setup.ts`, `main.ts`, `next.config.ts`, `vite.config.ts` | exigée | non | non | CSP compatible thème, Google GIS, Matterport (audit) ; ne mord qu'en production |
| invariants de production, `CORS_ORIGINS` | code (compte) | `config/env.ts`, `main.ts` | exigée (auth) | non | non | coût écrit à B:3100 |
| robots, sitemap, hreflang, garde de `SITE_URL`, schema.org | code (compte) | `apps/client/src/app/` (fichiers neufs), `lib/seo.ts`, fiche salle | non | non | non | ne mord qu'en production pour `SITE_URL` |
| CGU, confidentialité, version d'acceptation | **hors code** (textes juridiques) puis code (compte) | pages `cgu`, `confidentialite` ; `register-form.tsx` ; API d'inscription — **contrat d'API** | exigée (auth) | non | si la version se stocke | coût écrit à B:3138 (5) |
| Dockerfile, CI, hébergement, sauvegardes, stockage S3 | infra (compte) | fichiers neufs ; `docker-compose.yml` (compte, D292) ; adaptateur `MEDIA_STORAGE` | — | non | non | coûts écrits à B:3111, B:3128 |
| relecture humaine de l'arabe | **hors code** (locuteur) ; corrections = code (compte) | `packages/i18n/messages/ar.json` | non | non | non | parité i18n (porte `test`) |
| accueil : lieu et date absents du formulaire | code (compte) | `home-view.tsx`, `search-query.ts` | non | à trancher par le relecteur (même doute que C1) | non | — |

---

## 6. Les écrans en image

**46 captures, toutes ouvertes** (statut 200 ; 404 là où c'est attendu : page inconnue FR et AR, et `/fr/connexion`,
qui est le défaut). **3 184 910 octets** au total, JPEG qualité 70, pleine page, 1 280 px de large, thème clair.
Script : `../captures/captures.spec.ts` et `captures.config.ts` — ils **importent** la configuration e2e (serveurs de
développement sur 3101 / 3100 / 5273, base `zwadj_e2e` recréée, comptes de fixture du harnais) ; relevé :
`../captures/releve.txt` (statut, URL finale, `h1`, octets, par capture). Données : référentiels et salles de démo par les
scripts de seed existants ; salle, créneau, plages de visite, demande et rendez-vous **par l'API réelle** ; seule écriture
de métier en base : le rôle ADMIN.

| n° | écran |
|---|---|
| 01–12 | client FR : accueil, recherche, assistant, fiche salle (anonyme), connexion, inscription, mot de passe oublié, réinitialisation sans jeton, vérification sans jeton, CGU, confidentialité, page inconnue (404) |
| 13–24 | les mêmes en arabe |
| 25 | `/fr/connexion`, cible du bouton « Se connecter pour demander » : **404** |
| 26–27 | client connecté : fiche salle (panneau de demande sans date), compte (demande en attente, rendez-vous, **suppression en erreur**) |
| 28–32 | pro, entrées : connexion, inscription, mot de passe oublié, réinitialisation, vérification |
| 33–35 | pro : tableau de bord (« Nouvelle réservation »), mes salles, nouvelle salle |
| 36–42 | pro : assistant de salle, étapes 1 à 7 |
| 43–46 | pro : demandes (demande + visite), calendrier, réservations, compte (**suppression en erreur**) |

**Ce qui ne s'ouvre pas, noté sans rien réparer** : aucun écran n'a refusé de s'ouvrir. Les défauts vus **dans** des
écrans ouverts sont en §2 et mesurés (`../mesures/`).
**Limites** : serveurs de **développement** (le badge « N » de Next est visible sur les captures client ; les constats de
build de production — 404 à HTML vide — ne sont pas couverts) ; une seule largeur (bureau) alors que le produit est
mobile-first ; thème clair seul ; écrans pro en français seulement (non publics) ; l'administration n'a pas d'écran ;
données de fixture (une salle sans photo, six salles de démo sans créneau).

---

## 7. Ce que cette pièce ne fait pas

- Elle **ne corrige rien** : les défauts mesurés vont au backlog (reports de D315), à ordonner par Ko.
- Elle **ne classe rien et ne recommande rien** (arbitrage de Ko).
- Elle **ne coche aucune entrée du backlog** : 62 entrées des phases de parcours sont réalisées et ouvertes à tort ; leur
  sort est une décision (backlog, reports de D315).
- Elle **ne mesure aucune porte** : aucun code n'a changé ; la dernière marque est celle de D314.
- Elle **ne rejoue pas** les dépendances (`pnpm audit`) ni les 404 en production.
