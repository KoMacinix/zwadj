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

#### Extension 2 — la reprise sous la consigne VERSION 3 (22/10/2026) : la troisième lecture adverse, son audit, et les chemins de la section 6 e

**Motif** : la seconde lecture a relevé une affirmation fausse de la version 2 (V3-DR5 ; `9f85228`) ; la consigne **version 3**, adoptée par Ko, remplace la version 2 en entier, garde le lot D336, et exige, en premier geste, une extension commitée SEULE qui déclare la troisième lecture, l'audit « c » et son tri, et tout chemin qu'écrirait la section 6 e que l'extension 1 ne déclare pas déjà. **SHA de départ de cette reprise** : `9f85228` (`HEAD` = `origin/main` après `git fetch`, arbre propre, aucun stash). **La règle d'arrêt est reconduite** (consigne v3, section 0) : tout ce qui suit la troisième lecture reste **CONDITIONNEL** à elle.

| fichier | pour |
|---|---|
| `docs/preuves/D336/lecture-adverse-v3/confronter-consigne-v3.py` | l'instrument de la TROISIÈME lecture : il reprend l'instrument de la seconde (`confronter-consigne-v2.py`, lu à `9f85228` et vérifié par empreinte, son préfixe EXÉCUTÉ tel quel — lequel exécute à son tour celui de la première) et ne rejoue que ce qui change (consigne v3 : sections 0, 2 b, 3 en-tête et DR5, 6 e h, 9) |
| `docs/preuves/D336/lecture-adverse-v3/confronter-sortie-v3.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D336/audit-secrets-d336c.txt` | audit de secrets scellé « c », avant le commit de la troisième lecture |
| `docs/preuves/D336/tri-audit-d336c.txt` | son tri différentiel contre « b » (`docs/preuves/D336/audit-secrets-d336b.txt`) |

##### Fichiers CONDITIONNELS de l'extension 2

| fichier | condition |
|---|---|
| `docs/preuves/D336/lecture-adverse-v3/confronter-sortie-v3-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument v3 porte un ✗ qui est un défaut de l'instrument |
| `docs/preuves/D336/lecture-adverse-v3/defauts-instrument-v3.txt` | un tel défaut est trouvé |

##### La section 6 e (le découpage du nom à la conversion) : AUCUN chemin neuf

Vérifié contre les chemins de l'extension 1 (59 cités ; « 54 » = les 4 de la seconde lecture et de son audit + les 50 du code et des pièces du lot, hors les 2 fichiers conditionnels d'un défaut d'instrument et les 3 `.md` déjà déclarés à l'ouverture). Le découpage est une règle d'ÉCRAN, jamais stockée : elle vit dans le module pur `apps/pro/src/dashboard/walkin-client.ts` (testé par `apps/pro/src/dashboard/walkin-client.test.ts`), elle est appelée par `apps/pro/src/dashboard/walkin-journey.tsx` (testé par `apps/pro/src/dashboard/walkin-journey.test.tsx`), jouée de bout en bout par `e2e/specs/r41-fiche-client.e2e.ts` et neutralisée par `neutralisation/neutralize-r41.py` — **les six sont déjà déclarés par l'extension 1**. Rien ne manque pour 6 e.

#### Extension 3 — ce que le code touche hors de l'extension 1, et les pièces des ROUGES, déclarés AVANT le premier commit qui les contient

**Motif** : relevé du code avant d'écrire la première ligne (la troisième lecture est passée, `68bd32b` ; les arbitrages sont écrits, `aa42f4a` et `39ec96d` ; les modes de défaillance, `1a8e8f2`) : le contrat `QuoteDTO` gagne trois champs OBLIGATOIRES, la source du PDF change de forme (`client` → la copie du nom), et le client des fiches doit s'injecter dans l'application comme les autres. Quatre fichiers non déclarés en dépendent. Les **rouges** (D334, item 5) se versent dans un commit ANTÉRIEUR au premier commit de code, avec l'empreinte de chaque fichier de test qu'ils ont joué.

| fichier | pour |
|---|---|
| `apps/pro/src/App.tsx` | `AppProviders` reçoit le double du client des fiches, comme ceux des devis et du catalogue |
| `apps/pro/src/venues/quotes-section.test.tsx` | sa fabrique de `QuoteDTO` porte les trois champs neufs (le typage l'exige) |
| `apps/api/src/documents/quote-document.service.spec.ts` | la source du PDF rend la COPIE du nom, plus le compte (M-7) |
| `apps/api/test/int/pdf-renderer.int-spec.ts` | même raison : son enregistrement de devis porte la copie |
| `docs/preuves/D336/rouges/empreintes-tests.txt` | l'empreinte SHA-256 de chaque fichier de test joué rouge, à l'octet |
| `docs/preuves/D336/rouges/rouge-api-unitaire.txt` | la sortie de vitest (API, unitaire) contre l'état d'avant le code |
| `docs/preuves/D336/rouges/rouge-api-client.txt` | la sortie de vitest (`@zwadj/api-client`) contre l'état d'avant |
| `docs/preuves/D336/rouges/rouge-pro.txt` | la sortie de vitest (`@zwadj/pro`) contre l'état d'avant |
| `docs/preuves/D336/rouges/rouge-integration.txt` | la sortie de vitest (intégration, PostgreSQL réel) contre l'état d'avant |
| `docs/preuves/D336/rouges/lecture-rouges.txt` | la lecture des rouges : chaque test, sa première ligne d'échec, et s'il échoue par une assertion ou à la collecte |

#### Extension 4 — la procédure des rouges, les audits « d » et « e », les pièces de la fin du lot ; les harnais que le code peut périmer, déclarés CONDITIONNELS

**Motif** : les rouges sont joués contre l'état d'avant (`18e1113`, aucun fichier de code du lot n'existe) et lus — 268 tests en échec lus, 268 annoncés par vitest, écart 0 ; quatre échecs de collecte. Avant leur commit, trois choses manquent à la table : (1) la PROCÉDURE qui les a produits et le LECTEUR qui les classe (« les journaux cités ET la procédure qui les a produits », D291 ; le lecteur porte sa calibration à deux bras, D286) ; (2) l'audit de secrets scellé qui précède tout versement de preuves (D291, D298), et celui de la clôture ; (3) ce que la fin du lot versera — les verts des mêmes suites, les portes, le harnais du lot, les campagnes touchées, la passe D277. ⚠ **Seize harnais** lisent des fichiers que ce lot modifie (relevé par recherche des chemins dans `neutralisation/neutralize-*.py` à `18e1113`) : une ancre, un titre de test ou un compte peut s'y périmer ; chacun est déclaré CONDITIONNEL, et sa réparation, s'il en faut une, est consignée cible par cible au rapport. Tout ce qui suit est déclaré AVANT le commit qui le contient.

| fichier | pour |
|---|---|
| `docs/preuves/D336/rouges/jouer-rouges.py` | la procédure qui a joué les rouges (les empreintes et les quatre sorties), archivée comme preuve (D291), jamais promue en instrument |
| `docs/preuves/D336/rouges/lire-rouges.py` | le lecteur qui écrit `lecture-rouges.txt` (calibration à deux bras rejouée à chaque lancement, abandon si un bras manque) |
| `docs/preuves/D336/audit-secrets-d336d.txt` | audit de secrets scellé « d », avant le commit des rouges |
| `docs/preuves/D336/tri-audit-d336d.txt` | son tri au contexte contre « c » (`docs/preuves/D336/audit-secrets-d336c.txt`) |
| `docs/preuves/D336/audit-secrets-d336e.txt` | audit de secrets scellé « e », avant le commit de clôture |
| `docs/preuves/D336/tri-audit-d336e.txt` | son tri au contexte contre « d » |
| `docs/preuves/D336/verts/empreintes-tests.txt` | l'empreinte SHA-256 des fichiers de test rejoués APRÈS le code (un écart avec celle des rouges est dit, fichier par fichier) |
| `docs/preuves/D336/verts/vert-api-unitaire.txt` | la même suite que `rouge-api-unitaire.txt`, rejouée après le code |
| `docs/preuves/D336/verts/vert-api-client.txt` | la même suite que `rouge-api-client.txt`, rejouée après le code |
| `docs/preuves/D336/verts/vert-pro.txt` | la même suite que `rouge-pro.txt`, rejouée après le code |
| `docs/preuves/D336/verts/vert-integration.txt` | la même suite que `rouge-integration.txt`, rejouée après le code |
| `docs/preuves/D336/portes/extraire-portes.py` | l'extracteur des portes (le brut d'une porte porte des liens à jeton et des chemins de poste : le dépôt garde un EXTRAIT, avec l'empreinte du brut et le code de sortie réel), calibré à deux bras |
| `docs/preuves/D336/portes/typecheck.txt` | porte `typecheck`, extrait |
| `docs/preuves/D336/portes/lint.txt` | porte `lint`, extrait |
| `docs/preuves/D336/portes/test.txt` | porte `test`, extrait |
| `docs/preuves/D336/portes/build.txt` | porte `build`, extrait |
| `docs/preuves/D336/portes/test-int.txt` | porte `test:int`, extrait |
| `docs/preuves/D336/portes/e2e.txt` | `test:e2e` (exigée par la consigne v3, § 6 i), extrait |
| `docs/preuves/D336/portes/etat-machine.txt` | l'état de la machine à la passe des portes (D270 : aucune durée ne se lit sans lui ; ce paquet n'est PAS une fenêtre certifiante) |
| `docs/preuves/D336/neutralisation/r41.txt` | la sortie du harnais du lot (`neutralisation/neutralize-r41.py`) |
| `docs/preuves/D336/neutralisation/campagnes.txt` | la sortie de `neutralisation/lancer-campagnes.py` : les campagnes que le lot TOUCHE |
| `docs/preuves/D336/passe-d277/balayage.py` | l'instrument de la passe D277 des deux sens (copie octet pour octet de `docs/preuves/D335/passe-d277/balayage.py`) |
| `docs/preuves/D336/passe-d277/motifs.txt` | ses motifs, pour ce lot |
| `docs/preuves/D336/passe-d277/balayage-final.txt` | sa sortie, sur les fichiers d'autorité à la clôture |

##### Fichiers CONDITIONNELS de l'extension 4

| fichier | condition |
|---|---|
| `neutralisation/neutralize-act-plafonds.py` | une de ses ancres, un de ses titres de test ou un de ses comptes ne se retrouve plus après le code du lot (vaut pour chacune des seize lignes ci-dessous) |
| `neutralisation/neutralize-booking-status.py` | même condition |
| `neutralisation/neutralize-horloge.py` | même condition |
| `neutralisation/neutralize-journey.py` | même condition |
| `neutralisation/neutralize-r29.py` | même condition |
| `neutralisation/neutralize-r32.py` | même condition |
| `neutralisation/neutralize-r33.py` | même condition |
| `neutralisation/neutralize-r37.py` | même condition |
| `neutralisation/neutralize-r38.py` | même condition |
| `neutralisation/neutralize-r39.py` | même condition |
| `neutralisation/neutralize-r4.py` | même condition |
| `neutralisation/neutralize-s10b.py` | même condition |
| `neutralisation/neutralize-s11b.py` | même condition |
| `neutralisation/neutralize-s9.py` | même condition |
| `neutralisation/neutralize-solid-s3.py` | même condition |
| `neutralisation/neutralize-solid-s7.py` | même condition |
| `docs/preuves/D336/neutralisation/act-plafonds.txt` | la copie du journal de la campagne (D291), si `campagnes.txt` la joue (vaut pour chacune des seize lignes ci-dessous) |
| `docs/preuves/D336/neutralisation/booking-status.txt` | même condition |
| `docs/preuves/D336/neutralisation/horloge.txt` | même condition |
| `docs/preuves/D336/neutralisation/journey.txt` | même condition |
| `docs/preuves/D336/neutralisation/r29.txt` | même condition |
| `docs/preuves/D336/neutralisation/r32.txt` | même condition |
| `docs/preuves/D336/neutralisation/r33.txt` | même condition |
| `docs/preuves/D336/neutralisation/r37.txt` | même condition |
| `docs/preuves/D336/neutralisation/r38.txt` | même condition |
| `docs/preuves/D336/neutralisation/r39.txt` | même condition |
| `docs/preuves/D336/neutralisation/r4.txt` | même condition |
| `docs/preuves/D336/neutralisation/s10b.txt` | même condition |
| `docs/preuves/D336/neutralisation/s11b.txt` | même condition |
| `docs/preuves/D336/neutralisation/s9.txt` | même condition |
| `docs/preuves/D336/neutralisation/solid-s3.txt` | même condition |
| `docs/preuves/D336/neutralisation/solid-s7.txt` | même condition |
| `docs/preuves/D336/passe-d277/balayage-1-AVANT-ECRITURE.txt` | la première passe D277 trouve une occurrence à traiter (patron de D333) |
| `docs/preuves/D336/aucune-valeur-reelle.txt` | un journal à valeurs réelles est ouvert pendant la session (le brut de l'e2e porte des liens à jeton) : le contrôle dédié de D299 sur les pièces versées |
| `apps/api/test/int/contract-api-client.int-spec.ts` | une de ses listes ou un de ses comptes exige les chemins neufs du client d'API |
| `apps/api/test/int/rbac-all-routes.int-spec.ts` | une de ses listes ou un de ses comptes exige les routes neuves (`@Roles(PRO)`) |

#### Extension 5 — un fichier de test que le code touche hors des extensions 1 à 4, déclaré AVANT le commit qui le contient

**Motif** : le devis chiffré que le service passe au magasin (`DevisChiffre`, `apps/api/src/venues/quote-store.types.ts`) a perdu `clientId` au profit de la fiche et des deux copies du nom (K-4). `apps/api/test/int/quote-numbering.int-spec.ts` construit un `DevisChiffre` à la main pour appeler le magasin directement (F-7) : sans les trois champs, il ne compile plus — mesuré par `tsc` de l'API. Relevé en confrontant l'arbre de travail aux chemins déclarés ci-dessus : 38 fichiers parcourus (26 modifiés, 12 nouveaux), 142 chemins déclarés, **1 hors table** — celui-ci. Le changement est d'une ligne : `clientId: null` devient `clientRecordId: null, clientNameAr: null, clientNameLatin: null` ; le test ne change pas d'objet.

| fichier | pour |
|---|---|
| `apps/api/test/int/quote-numbering.int-spec.ts` | son `DevisChiffre` construit à la main (F-7) porte la fiche et les deux copies du nom, à `null`, au lieu de `clientId` |

#### Extension 6 — les procédures des VERTS et de l'UNION des campagnes, et les sorties de découverte du harnais, déclarées AVANT le commit qui les contient

**Motif** : trois relevés, faits avant d'écrire la moindre de ces pièces. (1) **Les verts** : l'extension 4 déclare leurs sorties (`docs/preuves/D336/verts/*.txt`) mais pas la procédure qui les produit — or « les journaux cités ET la procédure qui les a produits » entrent ensemble (D291) ; la procédure est une COPIE de `docs/preuves/D336/rouges/jouer-rouges.py` (mêmes groupes, mêmes fichiers, mêmes commandes), dont seuls le dossier, l'en-tête et la comparaison des empreintes aux rouges changent. (2) **Les campagnes** : l'extension 4 prévoyait la sortie de `neutralisation/lancer-campagnes.py`, mais ce tri compare à `HEAD` — **mesuré à `edb9387`** : il retient 12 campagnes, alors que le lot, de `b8ba85a` à l'arbre de travail, en touche **13** par le même tri (`neutralize-r37.py` lit `apps/pro/src/test-support/client-doubles.ts`, modifié par le commit des rouges seulement), et **17** par une recherche des chemins relative au paquet — les seize harnais conditionnels de l'extension 4 et `neutralize-r41.py`. Le patron de D333 est repris : l'UNION est CALCULÉE par une copie de `docs/preuves/D333/neutralisation/union-campagnes.py` (seuls le SHA de départ et les noms changent), VERSÉE avec sa sortie AVANT de jouer, puis JOUÉE par une copie de `docs/preuves/D333/neutralisation/jouer-union.py` ; les campagnes qui ont des cibles d'intégration sur des fichiers du lot (`neutralize-r33.py`, `neutralize-r39.py`, `neutralize-r41.py`, `neutralize-s11b.py`, `neutralize-solid-s3.py`) sont jouées UNE fois, avec `--int`. `docs/preuves/D336/neutralisation/campagnes.txt` (extension 4) reçoit la sortie de `lancer-campagnes.py --liste`, le tri tel qu'il est, pour que l'écart se lise. (3) **Le harnais du lot** : ses titres attendus se relèvent par le mode DÉCOUVERTE (« ils ne s'écrivent pas de mémoire ») ; sa sortie est la preuve d'où viennent les titres.

| fichier | pour |
|---|---|
| `docs/preuves/D336/verts/jouer-verts.py` | la procédure des verts : copie de `docs/preuves/D336/rouges/jouer-rouges.py` ; empreintes comparées aux rouges, fichier par fichier |
| `docs/preuves/D336/neutralisation/union-campagnes.py` | le calcul de l'UNION des campagnes à rejouer (copie de celui de D333, calibré ; SHA de départ `b8ba85a`) |
| `docs/preuves/D336/neutralisation/union-sortie.txt` | sa sortie, versée AVANT de jouer les campagnes |
| `docs/preuves/D336/neutralisation/jouer-union.py` | le jeu de l'union, en série (copie de celui de D333 ; les cinq campagnes à cibles d'intégration jouées une fois, avec `--int`) |
| `docs/preuves/D336/neutralisation/union-jeu.txt` | son rapport : par campagne, ce qu'elle a parcouru, mordu, tu, et sa sortie |
| `docs/preuves/D336/neutralisation/r41-decouverte.txt` | la sortie de `neutralisation/neutralize-r41.py` en mode DÉCOUVERTE, sans `--int` : ce qui rougit, cible par cible |
| `docs/preuves/D336/neutralisation/r41-decouverte-int.txt` | la même, avec `--int` (cibles d'intégration seules) |

##### Fichiers CONDITIONNELS de l'extension 6

| fichier | condition |
|---|---|
| `docs/preuves/D336/neutralisation/premier-jeu/act-plafonds.txt`, `docs/preuves/D336/neutralisation/premier-jeu/booking-status.txt`, `docs/preuves/D336/neutralisation/premier-jeu/horloge.txt`, `docs/preuves/D336/neutralisation/premier-jeu/journey.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r29.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r32.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r33.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r37.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r38.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r39.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r4.txt`, `docs/preuves/D336/neutralisation/premier-jeu/s10b.txt`, `docs/preuves/D336/neutralisation/premier-jeu/s11b.txt`, `docs/preuves/D336/neutralisation/premier-jeu/s9.txt`, `docs/preuves/D336/neutralisation/premier-jeu/solid-s3.txt`, `docs/preuves/D336/neutralisation/premier-jeu/solid-s7.txt`, `docs/preuves/D336/neutralisation/premier-jeu/r41.txt` | le premier jeu de l'union n'est pas entièrement vert : la sortie de chaque campagne de ce premier jeu se verse AVANT sa réparation (patron de D333) |
| `docs/preuves/D336/neutralisation/r41-premier-jeu.txt` | le premier jeu du harnais du lot, titres écrits, n'est pas entièrement vert |
