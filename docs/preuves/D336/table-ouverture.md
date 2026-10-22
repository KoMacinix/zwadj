# D336 — rang 41 — table d'ouverture

Lot : **le rang 41, arbitré par Ko le 22/10/2026 — L35-4 AMENDÉ, « la fiche client d'un pro et le nom sur le devis »** (consigne du relecteur du 22/10/2026, section 6), lot de **CODE**, méthode **NORMALE avec la garde d'égalité stricte de M-4**, sans certification (pause de Ko, consigne, section 1b, point 1). Il ne s'écrit qu'après une **lecture adverse de D335 ET de la consigne, contre le dépôt** (consigne, section 0, point 2).

- **SHA de départ** : `b8ba85a` (dernier commit de D335, clôture du rang 40). `HEAD` = `origin/main` après `git fetch` (les deux = `b8ba85a0f235d44445e95b35b784efbd4fafcbc6`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D336 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D335). `git grep -l D336` à `b8ba85a` : un seul fichier, `ZWADJ_CONTINUITE.md`, une seule ligne — le pointeur « le prochain lot prend **D336** » de l'état à la clôture du rang 40, qui n'attribue rien.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; consigne, section 0) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse de D335 et de la consigne (instrument, sortie, audit de secrets scellé et son tri), **avant toute écriture d'autorité** ; (3) le premier `.md` d'autorité : la section 1 de la consigne (les arbitrages de Ko du 21/10 et du 22/10/2026), mot pour mot, avant tout texte de la session ; (4) puis seulement les annotations, les décisions du relecteur, le schéma, le plan et le lot ; (5) toute extension : un commit propre qui l'ajoute ICI, avec son motif, AVANT le commit du fichier qu'elle couvre ; pour un lot de code, **le commit des pièces de rouge précède le premier commit de code** (D334, item 5).
- **RÈGLE D'ARRÊT, écrite avant la lecture** (consigne, section 0, mot pour mot) : « Si une affirmation de ce message est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. » ⇒ si la lecture adverse trouve une affirmation de la consigne fausse contre le dépôt, **le lot s'arrête après le commit (2)** : aucun `.md` d'autorité n'est écrit, aucune ligne de code ; la sortie est restituée en entier dans le rapport et la décision revient à Ko et au relecteur. Les fichiers des étapes (3) et suivantes sont donc **CONDITIONNELS**, plus bas.
- **Bloc 1c de la consigne** : à la réception, il porte encore les signes « ⟦ ⟧ » (les questions Q1 à Q8 n'y sont pas collées) ⇒ **rien de Q3, Q4 et Q5 ne s'écrit dans un fichier d'autorité** (consigne, section 1c), quelle que soit l'issue de la lecture.

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D336/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D336/lecture-adverse/confronter-d335-et-consigne.py` | l'instrument de la lecture adverse : D335 (objets `git` à SHA fixés, pièces versées) et la consigne du 22/10/2026 (chaque affirmation vérifiable confrontée au dépôt à `b8ba85a`) ; extracteurs calibrés sur un cas vrai et un cas faux |
| `docs/preuves/D336/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D336/audit-secrets-d336a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la lecture adverse |
| `docs/preuves/D336/tri-audit-d336a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D335/audit-secrets-d335b.txt`) |

### Fichiers CONDITIONNELS — créés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D336/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327 à D335) |
| `docs/preuves/D336/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `ZWADJ_CONTINUITE.md` | la lecture adverse ne trouve **aucune** affirmation de la consigne fausse contre le dépôt : la section 1 mot pour mot (première écriture d'autorité), puis les annotations, les décisions du relecteur, le schéma ratifié, l'ordre des lots, le point d'entrée du rang 41, la section D336, le registre |
| `AGENTS.md` | même condition : les annotations de la section 2 de la consigne (D270 / D332 suspendu, chaîne du compteur), jamais de réécriture |
| `ZWADJ_BACKLOG.md` | même condition : les annotations de la section 2, les entrées ouvertes L36-1 à L36-9, K-13 et les tâches de Ko (section 8) |

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur écriture

| famille | contenu |
|---|---|
| le code de L35-4 amendé | **même condition que les `.md` d'autorité** : la migration `pro_client_records` et colonnes de `quotes` (tranche [41] du schéma ratifié), `schema.prisma`, `@zwadj/types`, le client d'API, le module de l'API (fiches, recherche, création, modification), la création, la révision, la conversion et le document du devis, l'écran du pro, les catalogues FR et AR, leurs tests (unitaires, d'intégration sur base non vide, e2e du parcours de réservation), le harnais `neutralisation/neutralize-r41.py`, et ses pièces sous `docs/preuves/D336/` (modes de défaillance écrits avant le code, rouges lus contre l'état d'avant avec l'empreinte des fichiers de test joués) |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*

#### Extension 1 — la REPRISE du lot sous la consigne VERSION 2 (22/10/2026) : la seconde lecture adverse, son audit, et ce que la suite écrirait, en chemins complets

**Motif** : la première session s'est arrêtée à la lecture adverse (trois affirmations fausses ; `feea423`). La consigne **version 2** du relecteur, adoptée par Ko, remplace la première en entier et **garde le lot D336** ; elle exige, en premier geste, une extension commitée SEULE qui déclare en chemins COMPLETS tout ce que la suite écrira, `.md` d'autorité compris. **SHA de départ de la reprise** : `feea423` (`HEAD` = `origin/main` après `git fetch`, arbre propre, aucun stash). **La règle d'arrêt est reconduite** (consigne v2, section 0) : si la seconde lecture trouve une affirmation de la version 2 fausse contre le dépôt, le lot s'arrête après le commit de cette lecture — rien d'autorité, rien de code ; tout ce qui suit la seconde lecture est donc **CONDITIONNEL**.

| fichier | pour |
|---|---|
| `docs/preuves/D336/lecture-adverse-v2/confronter-consigne-v2.py` | l'instrument de la SECONDE lecture : il reprend l'instrument de la première (`confronter-d335-et-consigne.py`, lu à `feea423` et vérifié par empreinte, extracteurs et calibration EXÉCUTÉS tels quels) et ne rejoue que ce qui change (consigne v2 : sections 0, 1c, 2 b d f i j, 3 DR3 DR5 DR9, 4 [L36-2], 6 e h, 8, 9) |
| `docs/preuves/D336/lecture-adverse-v2/confronter-sortie-v2.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D336/audit-secrets-d336b.txt` | audit de secrets scellé « b », avant le commit de la seconde lecture |
| `docs/preuves/D336/tri-audit-d336b.txt` | son tri différentiel contre « a » (`docs/preuves/D336/audit-secrets-d336a.txt`) |

##### Fichiers CONDITIONNELS de l'extension 1

| fichier | condition |
|---|---|
| `docs/preuves/D336/lecture-adverse-v2/confronter-sortie-v2-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument v2 porte un ✗ qui est un défaut de l'instrument |
| `docs/preuves/D336/lecture-adverse-v2/defauts-instrument-v2.txt` | un tel défaut est trouvé |
| `ZWADJ_CONTINUITE.md`, `AGENTS.md`, `ZWADJ_BACKLOG.md` | la seconde lecture ne trouve **aucune** affirmation de la version 2 fausse contre le dépôt (déjà déclarés sous cette condition à l'ouverture) |
| `apps/api/prisma/migrations/20261022120000_pro_client_records/migration.sql`, `apps/api/prisma/schema.prisma` | même condition : la tranche [41] du schéma ratifié (M-C amendée) |
| `packages/types/src/client-record.ts`, `packages/types/src/quote.ts`, `packages/types/src/contact.ts`, `packages/types/src/index.ts` | même condition : contrats K-1, K-2, K-3, K-3b, K-4, K-5 ; e-mail normalisé |
| `apps/api/src/clients/pro-clients.module.ts`, `apps/api/src/clients/pro-clients.controller.ts`, `apps/api/src/clients/pro-clients.service.ts`, `apps/api/src/clients/pro-client-store.types.ts`, `apps/api/src/clients/pro-client-store.prisma.ts`, `apps/api/src/clients/pro-client-policy.ts`, `apps/api/src/app.module.ts` | même condition : le module des fiches (recherche, création, complément, modification), la politique en module pur (D187) |
| `apps/api/src/venues/quotes.service.ts`, `apps/api/src/venues/quotes.controller.ts`, `apps/api/src/venues/quote-store.types.ts`, `apps/api/src/venues/quote-store.prisma.ts` | même condition : la création avec `clientRecordId` et la copie du nom (K-4), le complément du nom (K-5) |
| `apps/api/src/documents/quote-document-source.ts`, `apps/api/src/documents/quote-document-source.prisma.ts`, `apps/api/src/documents/quote-document.ts` | même condition : le PDF imprime la COPIE du nom (M-7), plus le compte |
| `packages/api-client/src/clients-client.ts`, `packages/api-client/src/quotes-client.ts`, `packages/api-client/src/index.ts` | même condition : le client d'API (littéraux de chemin dans l'appel, D182) |
| `packages/i18n/messages/fr.json`, `packages/i18n/messages/ar.json` | même condition : libellés et erreurs, parité FR = AR |
| `apps/pro/src/dashboard/walkin-journey.tsx`, `apps/pro/src/dashboard/walkin-contact.ts`, `apps/pro/src/dashboard/walkin-client.ts`, `apps/pro/src/venues/venue-client-context.tsx`, `apps/pro/src/test-support/client-doubles.ts` | même condition : l'écran du pro (contact d'abord, puis les noms ; boîte de langue ; conversion préremplie, K-12 écran seul) |
| `apps/api/src/clients/pro-client-policy.spec.ts`, `apps/api/src/clients/pro-clients.service.spec.ts`, `apps/api/src/common/client-record.spec.ts`, `apps/api/src/venues/quotes.service.spec.ts`, `apps/api/src/venues/quote-store.prisma.spec.ts`, `apps/api/src/documents/quote-document.spec.ts` | même condition : tests unitaires |
| `apps/api/test/int/pro-clients.int-spec.ts`, `apps/api/test/int/quotes.int-spec.ts`, `apps/api/test/int/quote-document.int-spec.ts`, `apps/api/test/int/migration-non-empty.int-spec.ts` | même condition : intégration sur PostgreSQL réel (égalité stricte de M-4, concurrence, base non vide) |
| `packages/api-client/src/clients-client.test.ts`, `packages/api-client/src/quotes-client.test.ts`, `apps/pro/src/dashboard/walkin-journey.test.tsx`, `apps/pro/src/dashboard/walkin-contact.test.ts`, `apps/pro/src/dashboard/walkin-client.test.ts` | même condition : tests du client d'API et de l'écran |
| `e2e/specs/r33-remise-devis.e2e.ts`, `e2e/specs/r41-fiche-client.e2e.ts` | même condition : le parcours sur place (contact d'abord) et la fiche, en e2e |
| `neutralisation/neutralize-r41.py` | même condition : le harnais du lot |
| `docs/preuves/D336/modes-de-defaillance.md`, `docs/preuves/D336/scenarios-ko.md` | même condition : les modes de défaillance écrits AVANT le code ; les gestes de Ko (rang 33) |

⚠ Les pièces du code dont le nom dépend de la mesure (rouges lus contre l'état d'avant avec l'empreinte des tests joués, journaux des portes et du harnais, captures) se déclarent par une extension suivante, en chemins complets, **avant** leur versement ; tout chemin de code qui manquerait ci-dessus aussi.
