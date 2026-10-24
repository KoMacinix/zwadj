# D337 — rang 42 — table d'ouverture

Lot : **le rang 42, arbitré par Ko le 23/10/2026 — L36-1, « la réservation par e-mail seul »** (consigne du relecteur, section 3), précédé de la dette de preuve du rang 41 (section 2 a). Lot de **CODE**, méthode **NORMALE** (ordre des lots de la section 5 de la consigne du rang 41), avec la règle des montants sans objet (aucun montant ne change). **Aucune certification** (pause de Ko du 22/10/2026). Compteur tenu POUR MÉMOIRE : UN → DEUX à la clôture.

- **SHA de départ** : `299582c` (clôture du rang 41, D336). `HEAD` = `origin/main` après `git fetch` (les deux = `299582cf8be6fbb29c3c7f7d0f9282bd014f7cbd`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D337 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D336), comme la consigne l'attendait.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; D334 item 5) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse de la consigne, l'audit de secrets scellé et son tri, **avant toute écriture d'autorité** ; (3) le recensement et les modes de défaillance, **avant le code** ; (4) la dette de preuve (2 a) ; (5) les `.md` d'autorité, arbitrages de Ko en PREMIÈRE écriture ; (6) **les pièces des rouges, AVANT le premier commit de code** ; (7) le code ; (8) les pièces des verts, de la clôture ; (9) les `.md` de clôture. Toute extension de cette table : un commit propre, **AVANT** le commit du fichier qu'elle couvre.
- **Règle d'arrêt** (consigne, section 0, mot pour mot) : « Si une affirmation de cette consigne est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. » La migration obéit à la sienne (3 a) : si la lecture contredit la tranche [L36-1], **on ne migre pas**.
- **Le recensement de `contact_phone`** (3 d) est refait à l'ouverture, mesuré avant cette table : **15 fichiers TypeScript de production** (le décompte de DR3 tient), plus `schema.prisma`, plus 24 fichiers de test et d'e2e. Il est versé en entier, avec « touché » ou « non touché, parce que… » par fichier, dans `docs/preuves/D337/recensement-contact-phone.md`, avant le code.

## Fichiers attendus — chemins COMPLETS

### Les pièces et l'outillage

| fichier | pour |
|---|---|
| `docs/preuves/D337/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D337/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse : chaque affirmation vérifiable de la consigne confrontée au dépôt à `299582c`, calibré sur deux bras |
| `docs/preuves/D337/lecture-adverse/confronter-sortie.txt` | sa sortie (première partie courte, seconde partie en entier), versée avant toute écriture d'autorité |
| `docs/preuves/D337/audit-secrets-d337a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la lecture adverse |
| `docs/preuves/D337/tri-audit-d337a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D336/audit-secrets-d336e.txt`) |
| `docs/preuves/D337/recensement-contact-phone.md` | le recensement des consommateurs de `contact_phone` (3 d), « touché » / « non touché, parce que… » |
| `docs/preuves/D337/modes-de-defaillance.md` | les modes de défaillance (3 e), écrits avant le code |
| `docs/preuves/D337/dette-r41/` | la mesure de la cible neuve de `neutralize-r41.py` (2 a) : sortie brute, test rouge lu |
| `docs/preuves/D337/rouges/` | les pièces des rouges : sorties lues contre l'état d'avant, avec l'empreinte sha256 de chaque fichier de test joué (D334 item 5) |
| `docs/preuves/D337/verts/` | les sorties vertes des tests du lot |
| `docs/preuves/D337/portes/` | les six portes et l'e2e, rejouées après la dernière modification |
| `docs/preuves/D337/neutralisation/` | les journaux de `neutralize-r42.py`, de `neutralize-r41.py` (cible neuve) et de l'union des campagnes touchées |
| `docs/preuves/D337/scenarios-ko.md` | les gestes de Ko pour une réservation par e-mail seul (dix lignes au plus) |
| `docs/preuves/D337/ecritures-base-dev.md` | la déclaration des écritures sur la base de développement de Ko (règle permanente, section 1 c) : commande, heure, effet mesuré |
| `docs/preuves/D337/audit-secrets-d337b.txt` | audit de secrets scellé de la clôture |
| `docs/preuves/D337/tri-audit-d337b.txt` | son tri |
| `docs/preuves/D337/aucune-valeur-reelle.txt` | le contrôle « 0 valeur réelle » (D299) de la clôture |

### Les fichiers d'autorité

| fichier | pour |
|---|---|
| `ZWADJ_CONTINUITE.md` | première écriture : les arbitrages de Ko du 23/10/2026 (rang 42, adoption de S-48 à S-67, la règle permanente des écritures sur la base de développement, la condition de clôture du rang 33 levée) ; puis les annotations (C-C1, D61, précision (5) de L35-4, `bookingCreateSchema`, `bookings.contact_phone`), la section D337, le point d'entrée du rang 42, l'ordre des rangs (« RANG 42 : CLOS SUR LE CODE », « RANG 43 : EN ATTENTE D'ARBITRAGE DE KO »), le registre ; les deux omissions de D336 annotées dans la section D336 |
| `AGENTS.md` | la règle permanente (toute écriture sur la base de développement de Ko est déclarée au rapport de fin de lot), les annotations de C-C1 / D61 / `bookings.contact_phone`, la chaîne du compteur ; jamais de réécriture |
| `ZWADJ_BACKLOG.md` | l'entrée L36-1 fermée ; l'entrée de la dette de preuve (`clientId`, DB-15) fermée ou laissée ouverte selon la mesure ; la précision S-56 sur L35-6 ; les entrées ouvertes que le lot découvre |

### La migration, le schéma, les contrats

| fichier | pour |
|---|---|
| `apps/api/prisma/migrations/20261024100000_booking_contact_phone_optional/migration.sql` | `bookings.contact_phone` NULLABLE et `CHECK (contact_phone IS NOT NULL OR contact_email IS NOT NULL)`, écrite à la main (D186) |
| `apps/api/prisma/schema.prisma` | `Booking.contactPhone String?` (la CHECK n'a pas de déclaration Prisma) |
| `apps/api/test/int/migration-non-empty.int-spec.ts` | la sonde se retarge (la dernière migration change) ; le bloc « L36-1 (D337) » : les réservations existantes passent intactes, ligne à ligne (D123) |
| `packages/types/src/contact.ts` | la règle commune « un numéro OU un e-mail » (une seule fonction, importée par les deux schémas et par les trois écrans) |
| `packages/types/src/booking.ts` | `bookingCreateSchema` : numéro facultatif, un des deux exigé ; `ProBookingDTO.contactPhone: string \| null` |
| `packages/types/src/quote.ts` | `quoteConvertSchema` : même règle ; commentaires périmés corrigés |
| `packages/i18n/messages/fr.json` | les messages neufs (FR) |
| `packages/i18n/messages/ar.json` | les messages neufs (AR), parité FR = AR |

### Les consommateurs de l'API

| fichier | pour |
|---|---|
| `apps/api/src/venues/bookings.service.ts` | `create` écrit `contactPhone ?? null` ; le DTO du pro rend le numéro nul tel quel |
| `apps/api/src/venues/quotes.service.ts` | `convert` : même écriture |
| `apps/api/src/venues/quote-store.types.ts` | `contactPhone: string \| null` dans l'entrée de la conversion |
| `apps/api/src/venues/quote-store.prisma.ts` | écriture du numéro nul |
| `apps/api/src/venues/booking-notification-input.ts` | `contact` : le numéro, à défaut l'e-mail (même patron que `visit-bookings.service.ts:479`) — la charge utile reste une chaîne, aucun gabarit ne change |
| `apps/api/src/venues/bookings.controller.ts` | la description de l'opération (« quatre champs obligatoires ») corrigée |
| `apps/api/src/venues/quotes.controller.ts` | la description de l'opération corrigée |

### Les écrans

| fichier | pour |
|---|---|
| `apps/client/src/components/venue/booking-request-panel.tsx` | le formulaire en ligne : numéro OU e-mail, ni l'un ni l'autre marqué obligatoire seul, un texte visible qui le dit |
| `apps/pro/src/dashboard/walkin-contact.ts` | `contactBlockers` et `contactPayload` : le numéro n'est plus exigé quand un e-mail valide est donné ; la clé du numéro absente quand il est vide |
| `apps/pro/src/dashboard/walkin-journey.tsx` | l'écran de conversion (K-12) ne demande plus le numéro pour une fiche qui a un e-mail ; les canaux qui exigent un numéro restent bloqués sans numéro |
| `apps/pro/src/venues/booking-requests-section.tsx` | l'e-mail à défaut du numéro |
| `apps/pro/src/venues/quotes-section.tsx` | écran historique non monté : le corps de la conversion suit le contrat ; sinon dit « non touché » au recensement |

### Les tests, l'e2e, les harnais

| fichier | pour |
|---|---|
| `apps/api/src/venues/bookings.schemas.spec.ts` | le schéma : ni numéro ni e-mail refusé, l'un ou l'autre accepté, casse de l'e-mail |
| `apps/api/src/common/contact.spec.ts` | la règle commune |
| `apps/api/src/venues/booking-notification-input.spec.ts` | le numéro nul ⇒ l'e-mail |
| `apps/api/src/venues/quotes.service.spec.ts` | la conversion par e-mail seul |
| `apps/api/src/venues/quote-store.prisma.spec.ts` | l'écriture du numéro nul |
| `apps/api/test/int/bookings.int-spec.ts` | réservation en ligne par e-mail seul sur PostgreSQL réel ; ni l'un ni l'autre refusé par l'API ; la base refuse ce que l'API ne verrait pas |
| `apps/api/test/int/quotes.int-spec.ts` | conversion d'un devis par e-mail seul ; la dette de preuve (2 a) y est mesurée |
| `apps/client/src/components/venue/booking-request-panel.test.tsx` | le formulaire |
| `apps/pro/src/dashboard/walkin-contact.test.ts` | les règles pures |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` | la conversion par e-mail seul ; le canal qui exige un numéro reste bloqué |
| `apps/pro/src/venues/booking-requests-section.test.tsx` | l'e-mail à défaut du numéro |
| `apps/pro/src/venues/quotes-section.test.tsx` | si l'écran historique est touché |
| `e2e/specs/r42-reservation-email-seul.e2e.ts` | l'e2e d'une réservation par e-mail seul (exigée) |
| `neutralisation/neutralize-r42.py` | le harnais du lot |
| `neutralisation/neutralize-r41.py` | la cible neuve de la dette de preuve (2 a) |

### Fichiers CONDITIONNELS — créés ou modifiés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D337/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument |
| `docs/preuves/D337/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `docs/preuves/D337/signalements.md` | un signalement hors lot (S-55 : l'e-mail de la réservation n'est pas normalisé comme celui de la fiche ; un consommateur lié au paiement qui lit `contact_phone`) à verser avec sa mesure |
| `neutralisation/neutralize-r32.py`, `neutralisation/neutralize-s11a.py` | le tri des campagnes (`lancer-campagnes.py`) périme une ancre qu'une ligne de ce lot a déplacée : l'ancre se répare, par extension, avant son commit |
| tout autre harnais de `neutralisation/` | même condition |
| `apps/api/test/int/support/*` ou un autre double de test | si un double fabrique un `ProBookingDTO` ou une ligne `bookings` avec un numéro obligatoire ; déclaré par extension |

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur écriture

Tout fichier que cette table n'énumère pas : `git diff 299582c..HEAD --name-only` doit rester inclus dans cette table, extensions comprises. **Ne sont pas touchés** (dits ici pour que la table ne se lise pas comme une omission) : `apps/api/src/venues/visit-bookings.service.ts` et tout `visit_bookings` (hors lot, consigne 3 f), `packages/types/src/venue.ts` (les DTO de visite), `apps/api/src/venues/booking-locks.types.ts` (la sélection reste `contactPhone: true`), `apps/pro/src/venues/visits-section.tsx`, `apps/client/src/components/account/visit-bookings-section.tsx`, tout fichier de paiement.

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*
