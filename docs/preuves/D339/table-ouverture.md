# D339 — rang 43 (SUITE) — table d'ouverture

Lot : **le rang 43 continue — L36-2, « le devis brouillon non officiel », LE CODE**, sur le cadrage de D338 (`docs/preuves/D338/cadrage.md`) et les réponses de Ko Q1 à Q5 (consigne du relecteur, collée par Ko en tête de la session). Lot de **CODE** par destination, méthode **RENFORCÉE** (DR4 de D336) **sous la pause** de certification (DR1 de D336) : ni session adverse B, ni certification immédiate ; restent dus les rouges avant le code (D334 item 5), le harnais, la lecture adverse, le contrôle de fin de lot. **Aucune certification, aucune marque.** Compteur pour mémoire : DEUX → TROIS à la clôture.

- **SHA de départ** : `d703117` (clôture du contrôle de fin de lot de D338). `HEAD` = `origin/main` après `git fetch` (les deux = `d703117037be32a1a65249c786e340d0fb1e7e88`), arbre propre (`git status --short` vide), aucun stash, branche `main`.
- **Numéro** : D339 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D338), comme la consigne l'attendait.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; D334 item 5 ; consigne, section 0) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse de la consigne, l'audit de secrets scellé et son tri, **avant toute écriture d'autorité** ; (3) les `.md` d'autorité, **la section 1 de la consigne (réponses de Ko et décisions du relecteur) en PREMIÈRE écriture** — puis, avant le code, les deux écritures que la consigne place en 3 a (l'entrée du backlog) et 3 c (l'annotation de la section D338) ; (4) le complément du cadrage (3 b) `docs/preuves/D339/cadrage-complement.md`, **avant les rouges** ; (5) une extension de cette table, SEULE, qui donne la liste exacte des fichiers de test des rouges, **avant** leur commit ; (6) les rouges (fichiers de test + pièces : sorties lues contre l'état d'avant, empreinte sha256 de chaque fichier de test joué) dans un commit **ANTÉRIEUR** au premier commit de code ; (7) le code ; (8) le harnais `neutralisation/neutralize-r43.py` et ses journaux ; (9) les pièces de clôture, puis les autres `.md` d'autorité **en dernier** ; (10) le contrôle de fin de lot, écrit APRÈS la poussée.
- **Règle des affirmations fausses** (consigne, section 0, mot pour mot) : « Si une affirmation de cette consigne est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. » La migration obéit à la sienne (consigne, section 4) : « Si ta lecture contredit la tranche ou ces extensions : NE MIGRE PAS, rapporte l'écart (DR8) et attends. »
- **Lecture de la consigne sur les deux écritures de 3 a et 3 c** (décision de la session, à signaler au rapport) : la consigne fixe « la section 1 en PREMIÈRE écriture d'autorité » et « les autres `.md` d'autorité en dernier », et place en même temps 3 a (backlog) et 3 c (annotation de D338) sous « AVANT LE CODE ». Les deux se tiennent ainsi : la section 1 est la première écriture ; 3 a et 3 c suivent, **avant le code** ; tout le reste (section D339 complète, point d'entrée, ordre des rangs, registre, `AGENTS.md`) vient en dernier.
- Les numéros de ligne cités par la consigne (`quote.ts:408`, `quotes.controller.ts:168-185`, `quote-store.prisma.ts:316-323`, `ZWADJ_CONTINUITE.md:2041`) sont **revérifiés** par la lecture adverse, pas recopiés.

## Fichiers attendus — chemins COMPLETS

### Les pièces et l'outillage (existent dans tous les cas)

| fichier | pour |
|---|---|
| `docs/preuves/D339/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D339/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse (forme allégée) : chaque affirmation vérifiable de la consigne confrontée au dépôt à `d703117`, calibré sur deux bras |
| `docs/preuves/D339/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D339/audit-secrets-d339a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la lecture adverse |
| `docs/preuves/D339/tri-audit-d339a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D338/audit-secrets-d338b.txt`) |
| `docs/preuves/D339/cadrage-complement.md` | le complément du cadrage (3 b) : Q1 à Q5 appliquées aux sections 2 à 5 de D338, la forme exacte de la `CHECK` étendue et du déclencheur, les écrans, les modes de défaillance D-15 à D-19 |
| `docs/preuves/D339/scenarios-ko.md` | les gestes de Ko (dix lignes au plus), dont la lisibilité du filigrane en FR et en AR (S-82) |
| `docs/preuves/D339/audit-secrets-d339b.txt` | audit de secrets scellé de la clôture |
| `docs/preuves/D339/tri-audit-d339b.txt` | son tri |
| `docs/preuves/D339/aucune-valeur-reelle.txt` | le contrôle « 0 valeur réelle » (D299) de la clôture |
| `docs/preuves/D339/controle-fin-de-lot.txt` | le contrôle de fin de lot (D288, D328, D334 item 5), écrit APRÈS la poussée |
| `docs/preuves/D339/passe-d277.md` | la passe D277 des DEUX sens, écrite |
| `docs/preuves/D339/passe-d277/passe-d277.py` | son instrument (texte APLATI, calibré sur deux bras) |
| `docs/preuves/D339/passe-d277/sortie-avant.txt` | sa sortie AVANT les écritures de clôture |
| `docs/preuves/D339/passe-d277/sortie-apres.txt` | sa sortie APRÈS les écritures de clôture |

### Les pièces du code (chemins complets ; les journaux de campagnes sont déclarés par extension, leur nombre dépendant de l'union calculée)

| fichier | pour |
|---|---|
| `docs/preuves/D339/rouges/LISEZ-MOI.md` | comment les rouges ont été joués et lus (patron de `docs/preuves/D337/rouges/LISEZ-MOI.md`) |
| `docs/preuves/D339/rouges/empreintes-fichiers-de-test.txt` | l'empreinte sha256 de CHAQUE fichier de test joué (D334 item 5) |
| `docs/preuves/D339/rouges/rouge-api-unitaire.txt` | les rouges unitaires de l'API, lus contre l'état d'avant |
| `docs/preuves/D339/rouges/rouge-integration.txt` | les rouges d'intégration (PostgreSQL réel), lus contre l'état d'avant |
| `docs/preuves/D339/rouges/rouge-pro.txt` | les rouges de l'application Pro, lus contre l'état d'avant |
| `docs/preuves/D339/rouges/rouge-api-client.txt` | les rouges du client d'API, lus contre l'état d'avant |
| `docs/preuves/D339/rouges/rouge-e2e.txt` | l'e2e, lue contre l'état d'avant (pièce MASQUÉE si elle porte des jetons d'une base jetable) |
| `docs/preuves/D339/verts/vert-api-unitaire.txt` | les tests du lot, au vert |
| `docs/preuves/D339/verts/vert-integration.txt` | idem |
| `docs/preuves/D339/verts/vert-pro.txt` | idem |
| `docs/preuves/D339/verts/vert-api-client.txt` | idem |
| `docs/preuves/D339/portes/_index.txt` | l'index de la chaîne des portes : heure de départ, SHA, état de l'arbre, code de sortie et durée de chaque porte |
| `docs/preuves/D339/portes/typecheck.txt` | `pnpm typecheck` |
| `docs/preuves/D339/portes/lint.txt` | `pnpm lint` |
| `docs/preuves/D339/portes/test.txt` | `pnpm test` |
| `docs/preuves/D339/portes/build.txt` | `pnpm build` |
| `docs/preuves/D339/portes/test-int.txt` | `pnpm test:int` |
| `docs/preuves/D339/portes/test-e2e.txt` | `pnpm test:e2e` — PIÈCE MASQUÉE si elle porte des jetons de vérification d'e-mail d'une base jetable |

### Pièces CONDITIONNELLES (leur existence dépend d'un défaut ou d'un cas — D328)

| fichier | condition |
|---|---|
| `docs/preuves/D339/lecture-adverse/defauts-instrument.txt` | existe seulement si la première passe de l'instrument de lecture adverse révèle un défaut d'instrument |
| `docs/preuves/D339/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | existe seulement dans ce même cas : la sortie de la passe qui a montré le défaut, gardée à côté de la passe réparée (D295) |
| `docs/preuves/D339/signalements.md` | existe seulement si le code ou la lecture trouve un défaut croisé à RAPPORTER (il ne se corrige pas dans ce lot) |
| `docs/preuves/D339/ecritures-base-dev.md` | existe seulement si une écriture sur la base de développement de Ko a lieu (règle permanente de D337) — **aucune n'est prévue** : `test:int` et l'e2e travaillent sur leurs propres bases |
| `docs/preuves/D339/portes/test-rejeu-1.txt` | existe seulement si une porte rend un échec de la classe « act tardif » à sa première passe et qu'un rejeu seul est versé à côté (précédent de D338) |
| `docs/preuves/D339/neutralisation/` (chemins complets par extension) | les journaux de `neutralize-r43.py` et des campagnes que le tri de `lancer-campagnes.py` retient : leur liste dépend du `git diff` final |

### Les fichiers d'autorité (existent dans tous les cas)

| fichier | pour |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture** : la section 1 de la consigne (Q1 à Q5, S-76 à S-82 avec les précisions R-1 et R-2, décisions du relecteur R-1 à R-5), écrite comme adoption, jamais comme parole de Ko ; puis l'annotation de la section D338 (3 c, ajout seul) ; puis, EN DERNIER, la section D339, le point d'entrée du rang 43 (« CLOS SUR LE CODE »), l'ordre des rangs (« RANG 44 : EN ATTENTE D'ARBITRAGE DE KO »), le registre (D339), la rubrique « Patrons », la passe D277 |
| `ZWADJ_BACKLOG.md` | l'entrée de 3 a (l'API crée encore un devis OFFICIEL sans fiche), **sans rang** (D302) ; les entrées que le lot découvre ; la fermeture des entrées que le lot ferme |
| `AGENTS.md` | la chaîne du compteur et des rangs (annotation, jamais de réécriture), l'invariant du devis non officiel (annoté à côté des invariants du devis), la rubrique « Patrons » seulement si le lot en produit |

### La migration, le schéma, les contrats

| fichier | pour |
|---|---|
| `apps/api/prisma/migrations/20261028100000_quote_unofficial_draft/migration.sql` | `quotes.is_official boolean NOT NULL DEFAULT true`, la `CHECK` étendue (Q2 : ni fiche ni nom pour un devis non officiel), le déclencheur sur `bookings` (Q5 (b), R-4 : `INSERT` ET `UPDATE` de `quote_id`) ; écrite à la main (D186), testée sur base non vide (D123). **Elle ne s'écrit que si la lecture ne contredit ni la tranche [L36-2] ni les extensions de Ko** |
| `apps/api/prisma/schema.prisma` | `Quote.isOfficial` (la `CHECK` et le déclencheur n'ont pas de déclaration Prisma) |
| `packages/types/src/quote.ts` | `isOfficial` à la création (`false` seul), `quoteReviseSchema` qui cesse d'être `quoteCreateSchema`, `quotePromoteSchema`, `QuoteDTO.isOfficial`, la référence `BROUILLON-…`, le préfixe du nom de fichier, les codes de refus |
| `packages/i18n/messages/fr.json` | les messages neufs (FR) : refus, validation, PDF, écran |
| `packages/i18n/messages/ar.json` | les messages neufs (AR), parité FR = AR |

### Les consommateurs de l'API

| fichier | pour |
|---|---|
| `apps/api/src/venues/quotes.service.ts` | création (brouillon), remise et conversion (refus d'un brouillon), révision (drapeau hérité), promotion, K-5 (refus d'un brouillon) |
| `apps/api/src/venues/quote-store.types.ts` | le port : `isOfficial` lu, la promotion et ses résultats, les résultats élargis de la remise et de la révision |
| `apps/api/src/venues/quote-store.prisma.ts` | l'adaptateur : la condition `is_official` dans le `WHERE` de la remise, le drapeau hérité sous le verrou de la tête, la promotion en check-and-set, la ligne `audit_logs` dans la même transaction, K-5 sur un brouillon |
| `apps/api/src/venues/quote-transitions.ts` | la politique pure : la commande de promotion (source DRAFT seul) |
| `apps/api/src/venues/quotes.controller.ts` | la route `POST /quotes/:id/promote` ; les descriptions des opérations |
| `apps/api/src/documents/quote-document.ts` | le filigrane sur chaque page, « — » pour le client d'un brouillon |
| `apps/api/src/documents/quote-document-source.ts` | `isOfficial` lu avec le devis |
| `apps/api/src/documents/quote-document-source.prisma.ts` | idem, côté lecture ; la référence bâtie avec le préfixe du devis |
| `packages/api-client/src/quotes-client.ts` | l'appel de promotion (chemin en toutes lettres, D182) |

### Les écrans

| fichier | pour |
|---|---|
| `apps/pro/src/dashboard/walkin-journey.tsx` | le second bouton de l'étape Contact (Q1), le brouillon sans nom (Q2), le bandeau « BROUILLON », le téléchargement du brouillon sans remise, la promotion |
| `apps/pro/src/dashboard/walkin-contact.ts` | la règle pure des invités, partagée entre l'étape Client complète et l'étape Client du brouillon |
| `apps/pro/src/theme.css` | les classes du bandeau « BROUILLON » (jetons existants, aucune couleur en dur) |
| `apps/pro/src/test-support/client-doubles.ts` | le double du client des devis (`promote`) |

### Les tests, l'e2e, le harnais

| fichier | pour |
|---|---|
| `apps/api/src/common/quote-reference.spec.ts` | la référence `BROUILLON-…`, le nom de fichier d'un brouillon, la forme de chaque |
| `apps/api/src/common/quote-draft.spec.ts` | (NEUF) les contrats : création `isOfficial: false` (R-2), `true` refusé, révision sans `isOfficial` (R-1), promotion, messages localisés |
| `apps/api/src/venues/quotes.service.spec.ts` | création, remise, conversion, révision, promotion, K-5 sur un brouillon, ordre des refus sur le cas doublement fautif |
| `apps/api/src/venues/quote-store.prisma.spec.ts` | les `WHERE`, le drapeau hérité sous le verrou, la ligne d'audit sans donnée personnelle |
| `apps/api/src/venues/quote-transitions.spec.ts` | la commande de promotion dans le tableau des transitions |
| `apps/api/src/documents/quote-document.spec.ts` | le filigrane, le client « — », la référence dans le titre |
| `apps/api/src/documents/quote-document.service.spec.ts` | le nom de fichier d'un brouillon ; la fabrique de `QuoteDocumentRecord` |
| `apps/api/test/int/quotes.int-spec.ts` | le cycle d'un brouillon sur PostgreSQL réel : refus de remise et de conversion, `CHECK` et déclencheur en SQL direct, promotion, concurrence, ligne d'audit |
| `apps/api/test/int/quote-numbering.int-spec.ts` | D-8 (les numéros ne sautent ni ne se réutilisent) ; la fabrique de `DevisChiffre` suit le port |
| `apps/api/test/int/quote-document.int-spec.ts` | le PDF d'un brouillon : même nombre de pages avec et sans filigrane, en FR et en AR (R-5), filigrane sur chaque page |
| `apps/api/test/int/pdf-inspect.ts` | la lecture du filigrane par page dans les flux décompressés (sans dépendance neuve) |
| `apps/api/test/int/migration-non-empty.int-spec.ts` | le bloc « L36-2 (D339) » : devis existants dans chaque état et réservations existantes intacts, ligne à ligne (D123) |
| `packages/api-client/src/quotes-client.test.ts` | le chemin de la promotion |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` | le bouton de Q1, le brouillon, le téléchargement sans remise, la promotion, la parité FR = AR |
| `apps/pro/src/dashboard/walkin-contact.test.ts` | la règle pure des invités |
| `apps/pro/src/dashboard/remittance.test.ts` | la fabrique de `QuoteDTO` suit le contrat (`isOfficial`) |
| `apps/pro/src/venues/quotes-section.test.tsx` | idem (écran historique non monté) |
| `e2e/specs/r43-devis-brouillon.e2e.ts` | (NEUF) un brouillon créé au comptoir par le bouton de Q1, refusé à la remise, promu, puis remis ; FR et AR |
| `neutralisation/neutralize-r43.py` | le harnais du lot (`--int` pour la base) |

### Fichiers CONDITIONNELS — modifiés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `apps/pro/src/dashboard/walkin-client.ts` | seulement si une règle pure du brouillon y trouve sa place (patron de `walkin-contact.ts`) |
| `apps/pro/src/dashboard/walkin-client.test.ts` | idem |
| `apps/pro/src/venues/quotes-section.tsx` | seulement si le type `QuoteDTO` élargi l'oblige à compiler (écran historique non monté) |
| `e2e/specs/r41-fiche-client.e2e.ts` | seulement si le type local `DevisRendu` ou un libellé de l'écran déplacé l'oblige |
| `neutralisation/neutralize-act-plafonds.py`, `neutralisation/neutralize-horloge.py` | la constante du nombre de tests de `walkin-journey.test.tsx` périmée par les tests du lot : la constante SEULE change (précédent des rangs 33, 38, 39, 41, 42) |
| `neutralisation/neutralize-r32.py`, `neutralisation/neutralize-r33.py`, `neutralisation/neutralize-r38.py`, `neutralisation/neutralize-r39.py`, `neutralisation/neutralize-r41.py`, `neutralisation/neutralize-r42.py`, `neutralisation/neutralize-s10b.py`, `neutralisation/neutralize-s11a.py`, `neutralisation/neutralize-solid-s6.py` | le tri des campagnes (`lancer-campagnes.py`) périme une ancre qu'une ligne de ce lot a déplacée : l'ancre se répare, par extension, avant son commit. La liste est une PRÉVISION (campagnes qui lisent les fichiers que ce lot touche) ; le tri en donne la liste exacte |
| tout autre harnais de `neutralisation/` | même condition |
| `apps/api/test/int/contract-api-client.int-spec.ts`, `apps/api/test/int/rbac-all-routes.int-spec.ts` | seulement si leur lecture des routes ou de la liste blanche ne suit pas la route neuve sans retouche |
| tout autre double ou fabrique de test qui construit un `QuoteDTO`, un `QuoteRow`, un `DevisChiffre` ou un `QuoteDocumentRecord` | le typecheck les relève ; chacun est déclaré par extension, en chemin complet, avant son commit |

## Ce que cette table NE déclare PAS (et pourquoi)

- **Hors lot (consigne, section 4)** : NB-6 (date d'événement passée) ; le paiement en ligne (E3, R1) ; les notifications (L36-9) ; Q4 (b) — l'API qui refuserait un devis officiel sans fiche (entrée 3 a du backlog) ; la révision d'une version ancienne (entrée ouverte de D338) ; la garde des sorties console (entrée ouverte). **Aucun** fichier de `visit_bookings`, de paiement, de notification ni de la fiche client (`pro-client-*`).
- **Ne sont pas touchés** (dits ici pour que la table ne se lise pas comme une omission) : `apps/api/src/documents/quote-document.service.ts` et `apps/api/src/documents/quote-document-policy.ts` (un brouillon s'imprime déjà : mesure M12 de D338 ; le nom du fichier se dérive de la référence STOCKÉE par `quoteDocumentFilename`, qui change dans `packages/types`), `apps/api/src/documents/quote-document.controller.ts`, `apps/api/src/documents/pdf-renderer.port.ts` et `apps/api/src/documents/playwright-pdf.renderer.ts` (« le moteur n'est pas modifié », cadrage D-9), `apps/pro/src/dashboard/remittance.ts` et `remittance-hook.ts` (aucun canal de remise n'existe pour un brouillon), `apps/pro/src/dashboard/save-file.ts`.
- **Le diff final** (`git diff d703117..HEAD --name-only`) doit rester inclus dans cette table, extensions comprises ; un fichier hors table est un incident, pas une omission.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, **AVANT** le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*
