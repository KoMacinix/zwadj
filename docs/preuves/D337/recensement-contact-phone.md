# D337 — recensement des consommateurs de `contact_phone` (consigne 3 d), refait à l'ouverture

Relevé sur `299582c` (objets git ; l'instrument `lecture-adverse/confronter-consigne.py`, contrôles 3d.1 à 3d.5, rend le même décompte).
Méthode : tous les fichiers `.ts` / `.tsx` de `apps/`, `packages/`, `e2e/` qui portent `contactPhone` ou `contact_phone` (512 fichiers TypeScript parcourus ; **39** portent le champ ; **15** de production, **24** de test ou d'e2e), plus `schema.prisma`, les migrations, et les deux harnais Python qui le citent. Un consommateur qui ne NOMME pas le champ (il lit le DTO en bloc) est cherché à part : `ProBookingDTO` (`apps/pro/src/venues/booking-requests-section.tsx`, `packages/api-client/src/bookings-client.ts`), les liens `tel:` / `sms:` / `wa.me` (aucun dans `apps/pro/src` ni `apps/client/src`).

## Production — 15 fichiers TypeScript

| # | fichier | ce qu'il fait du champ | décision |
|---|---|---|---|
| 1 | `packages/types/src/booking.ts` | `bookingCreateSchema.contactPhone: dzPhoneSchema` (obligatoire) ; `ProBookingDTO.contactPhone: string` | **TOUCHÉ** — le numéro devient facultatif, la règle « numéro OU e-mail » s'y pose ; le DTO du pro rend `string \| null` |
| 2 | `packages/types/src/quote.ts` | `quoteConvertSchema.contactPhone: dzPhoneSchema` ; deux commentaires disent « le téléphone reste obligatoire » | **TOUCHÉ** — même règle ; les commentaires périmés sont corrigés |
| 3 | `packages/types/src/venue.ts` | `ProVisitBookingDTO` et le DTO client de la visite portent `contactPhone: string \| null` | **NON TOUCHÉ, parce que** c'est `visit_bookings` (D61), hors lot (consigne 3 f) ; ces DTO sont DÉJÀ nullables |
| 4 | `apps/api/src/venues/booking-locks.types.ts` | `BOOKING_SELECT` : `contactPhone: true` | **NON TOUCHÉ, parce que** la sélection ne change pas ; le type de la ligne vient de Prisma et devient nullable de lui-même |
| 5 | `apps/api/src/venues/booking-notification-input.ts` | `contact: row.contactPhone` — le texte « contact » de la notification au pro | **TOUCHÉ** — le numéro, à défaut l'e-mail (même patron que `visit-bookings.service.ts`, `contact: contactPhone ?? client.email`). Le type de la charge utile reste une chaîne ; **aucun gabarit ne change** (la notification est hors lot, L36-9) |
| 6 | `apps/api/src/venues/bookings.service.ts` | `create` écrit `contactPhone: input.contactPhone` ; la lecture du pro rend `row.contactPhone` | **TOUCHÉ** — `?? null` explicite (même règle que `contactEmail`, D135) ; le DTO rend le null tel quel |
| 7 | `apps/api/src/venues/quote-store.prisma.ts` | `convertirEnDemande` écrit `contactPhone: donnees.contactPhone` | **NON TOUCHÉ en principe, parce que** la ligne passe la valeur telle quelle ; seul le type de son entrée change (#8). Modifié seulement si le compilateur l'exige |
| 8 | `apps/api/src/venues/quote-store.types.ts` | `contactPhone: string` dans l'entrée de la conversion | **TOUCHÉ** — `string \| null` |
| 9 | `apps/api/src/venues/quotes.service.ts` | `convert` : `contactPhone: input.contactPhone` | **TOUCHÉ** — `?? null` explicite |
| 10 | `apps/api/src/venues/visit-bookings.service.ts` | 12 occurrences : le snapshot du contact d'un rendez-vous de VISITE | **NON TOUCHÉ, parce que** c'est `visit_bookings`, hors lot ; sa colonne est nullable depuis `20260730000000` (D61) |
| 11 | `apps/client/src/components/venue/booking-request-panel.tsx` | le formulaire en ligne : champ « Téléphone » obligatoire (`required`, condition `complete`), corps `contactPhone: toE164(…)` | **TOUCHÉ** — numéro OU e-mail ; la clé du numéro est absente du corps quand il est vide |
| 12 | `apps/pro/src/dashboard/walkin-contact.ts` | `contactBlockers` exige le numéro ; `contactPayload` l'envoie toujours | **TOUCHÉ** — le numéro n'est plus exigé quand un e-mail valide est donné ; clé absente quand il est vide |
| 13 | `apps/pro/src/venues/booking-requests-section.tsx` | affiche `row.contactPhone` (« le pro rappelle ») | **TOUCHÉ** — l'e-mail à défaut du numéro |
| 14 | `apps/pro/src/venues/quotes-section.tsx` | l'ancienne conversion du devis : quatre champs, `contactPhone: contact.phone.trim()` | **NON TOUCHÉ, parce que** `QuotesSection` n'est plus montée (commentaire de `dashboard-page.tsx`) ; son corps envoie toujours un numéro, que le contrat accepte encore. Écart écrit : remontée, elle exigerait le numéro alors que le contrat ne le fait plus — au backlog |
| 15 | `apps/pro/src/venues/visits-section.tsx` | affiche `row.contactPhone ?? row.clientEmail` pour une VISITE | **NON TOUCHÉ, parce que** c'est la visite, qui fait déjà « numéro, à défaut e-mail » ; c'est le patron que ce lot reprend |

## Consommateurs qui ne portent pas le littéral

| fichier | ce qu'il fait | décision |
|---|---|---|
| `apps/pro/src/dashboard/walkin-journey.tsx` | l'écran de conversion (K-12) : `contactBlockers`, `contactPayload`, le champ téléphone, `channelBlockers(canal, { phoneOk, emailOk })` | **TOUCHÉ** — il ne demande plus le numéro pour une fiche qui a un e-mail ; les canaux SMS et appel restent bloqués sans numéro (`telOk`) — le geste qui exige un numéro n'est pas proposé sans numéro (déjà vrai, **à mesurer**) |
| `apps/pro/src/dashboard/walkin-client.ts` | `prefillConversion` : préremplit le numéro depuis la fiche (chaîne vide quand elle n'en a pas) | **NON TOUCHÉ, parce que** il rend déjà `phone: ""` pour une fiche sans numéro (testé par `walkin-client.test.ts`) |
| `apps/api/src/venues/bookings.controller.ts` | la description de l'opération dit « les quatre champs de contact — obligatoires » | **TOUCHÉ** — texte seulement |
| `apps/api/src/venues/quotes.controller.ts` | la description dit « bookings.contact_* est NOT NULL » | **TOUCHÉ** — texte seulement |
| `packages/api-client/src/bookings-client.ts` | porte `ProBookingDTO` | **NON TOUCHÉ, parce que** il type par le DTO partagé (#1) |
| un `tel:`, un `sms:`, un `wa.me` | **aucun** dans les deux applications | **NON CONCERNÉ** — il n'existe aucun geste d'appel ni de SMS côté application ; « un geste d'appel ou de SMS sans numéro » se réduit à `channelBlockers` (les canaux de remise d'un devis). Une garde de source le surveille (cible du harnais) |
| fichiers de PAIEMENT | aucun fichier de production de paiement ne lit `contact_phone` (15 fichiers de nom `payment` / `chargily` / `webhook` parcourus) | **RIEN À SIGNALER** en production. **Un TEST** de paiement le NOMME : `apps/api/test/int/payment-intent-race.int-spec.ts:69` **sème** `contactPhone: "+213550000001"` dans une réservation de test (il ne le lit pas) — **non touché** |

## Base, schéma, migrations

| objet | état | décision |
|---|---|---|
| `bookings.contact_phone` | `TEXT NOT NULL` depuis `20260707000000_init`, aucune migration ultérieure ne le modifie (instrument, 3a.2) | **migration neuve** : `DROP NOT NULL` |
| `bookings.contact_email` | `TEXT` nullable | inchangé |
| `CHECK` sur `contact_*` | aucun (instrument, 3a.3) | **neuf** : `CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)` |
| lignes existantes | 10 sur la base de développement, 0 sans numéro (lecture seule) ; `contact_phone` NOT NULL partout ailleurs par construction | le `CHECK` ne peut les violer |
| `visit_bookings.contact_phone` | `TEXT` nullable (`20260730000000`) | **hors lot** |
| `schema.prisma` | `Booking.contactPhone String` | **TOUCHÉ** — `String?` (la `CHECK` n'a pas de déclaration Prisma, D186) |
| anonymisation / suppression de compte | aucun code ne met `contact_email` ou `contact_phone` à NULL (recherche sur `apps/api/src`) | aucun chemin ne peut produire deux NULL |

## Tests et e2e — 24 fichiers qui nomment le champ

Touchés (déjà déclarés dans la table) : `apps/api/src/common/contact.spec.ts`, `apps/api/src/venues/booking-notification-input.spec.ts`, `apps/api/src/venues/bookings.schemas.spec.ts`, `apps/api/src/venues/quotes.service.spec.ts`, `apps/api/src/venues/quote-store.prisma.spec.ts` (si l'écriture du null s'y mesure), `apps/api/test/int/bookings.int-spec.ts`, `apps/api/test/int/quotes.int-spec.ts`, `apps/api/test/int/migration-non-empty.int-spec.ts`, `apps/client/src/components/venue/booking-request-panel.test.tsx`, `apps/pro/src/dashboard/walkin-contact.test.ts`, `apps/pro/src/dashboard/walkin-journey.test.tsx`, `apps/pro/src/venues/booking-requests-section.test.tsx`.

**Non touchés, parce qu'ils sèment ou lisent un numéro qui reste valide** (un `string` est assignable à `string | null`) : `availability-blocks.int-spec.ts`, `availability.int-spec.ts`, `payment-intent-race.int-spec.ts`, `services.int-spec.ts`, `visit-bookings.int-spec.ts`, `visit-slots.int-spec.ts`, `visit-bookings-section.test.tsx` (client), `dashboard-aside.test.tsx`, `request-scope.test.tsx`, `quotes-section.test.tsx` (écran non monté), `visits-section.test.tsx`, `e2e/specs/r41-fiche-client.e2e.ts`. Si le compilateur ou une assertion en demande un, **extension de la table, avant son commit**.

## Les deux harnais Python qui citent le champ

`neutralisation/neutralize-r32.py` et `neutralisation/neutralize-s11a.py` : leurs ancres peuvent être déplacées par ce lot (conditionnels de la table). Le tri `lancer-campagnes.py` le dira ; une ancre périmée se répare par extension, jamais en silence (AGENTS.md : « une ancre de cible se revérifie »).
