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

**Extension 1** (28/10/2026, commitée SEULE, AVANT le commit des pièces qu'elle déclare — le complément du cadrage, 3 b, passe par un audit de secrets avant son commit, D298 ; l'audit « c » vient entre l'audit « a » de l'ouverture et l'audit « b » de la clôture, comme à D338) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/audit-secrets-d339c.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), AVANT le commit du complément du cadrage |
| `docs/preuves/D339/tri-audit-d339c.txt` | son tri différentiel contre `docs/preuves/D339/audit-secrets-d339a.txt` |

**Extension 2** (28/10/2026, commitée SEULE, AVANT le commit des rouges qui contiennent le fichier — relevé en comparant les fichiers touchés aux chemins complets de cette table, `git status` contre les backticks de ce fichier : un seul fichier de test hors table) :

| fichier | motif |
|---|---|
| `apps/api/test/int/pdf-renderer.int-spec.ts` | son devis-témoin (`devisArabe`) est un `QuoteDocumentRecord` écrit à la main : le type du port exige désormais `isOfficial`, il compile et passe avec `isOfficial: true` (aucune autre ligne ne change) |

**Extension 3** (28/10/2026, commitée SEULE, AVANT le commit des rouges — les pièces des rouges (155 échecs lus, dont une e2e masquée) sont un versement : elles passent par un audit de secrets AVANT leur commit, D298 ; l'audit « d » vient entre l'audit « c » du complément et l'audit « b » de la clôture) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/audit-secrets-d339d.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), AVANT le commit des rouges |
| `docs/preuves/D339/tri-audit-d339d.txt` | son tri différentiel contre `docs/preuves/D339/audit-secrets-d339c.txt` |

**Extension 4** (30/10/2026, REPRISE — la session qui finit D339 après l'arrêt de la précédente ; commitée SEULE, AVANT le commit de la pièce qu'elle déclare, règle de D328 point 4. Relevé en comparant le fichier que la consigne de reprise (§ 2) demande de verser aux chemins complets de cette table : il n'y est pas) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/reprise/etat.md` | l'état relevé à la reprise, en lecture seule, versé AVANT toute autre écriture : la déclaration de Ko (§ 0), les sauvegardes (branche et empreintes), les sept fichiers de l'arbre contre cette table (a), l'ordre des dix commits prouvé par `git` (b), le diff de chacun des cinq fichiers modifiés (c), la base de développement de Ko (d), ce qui reste de la consigne (e) |

**Extension 5** (02/11/2026, REPRISE — après la note de Ko du 02/11/2026 (chargeur branché, Chrome fermé) ; commitée SEULE, AVANT le commit des fichiers qu'elle couvre, règle de D328 point 4. Relevé en comparant les pièces que la note de Ko et la suite de la consigne exigent aux chemins complets de cette table : aucune n'y est. Les journaux **par campagne** de l'union ne sont PAS déclarés ici — leur liste dépend du calcul de l'union, déclaré ci-dessous avant d'être joué : ils feront l'objet d'une extension à part, avant leur commit) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/consigne-sections-2-4-5.md` | note de Ko du 02/11/2026, point 3 : le texte, mot pour mot, des sections 2, 4 et 5 de la consigne du 28/10/2026, versé comme pièce ; il entre dans le commit des pièces de clôture, APRÈS l'audit de secrets qui le couvre |
| `docs/preuves/D339/portes/etat-machine.txt` | note de Ko, point 1 : l'état machine (secteur ou batterie, RAM libre, `chrome`, `headless_shell`) relevé AVANT les six portes et l'e2e de clôture ; un poste encore sur batterie : ces portes ne sont pas lancées |
| `docs/preuves/D339/neutralisation/sortie-r43-int.txt` | la sortie ENTIÈRE de `neutralize-r43.py --int` (87 cibles), copiée octet pour octet du fichier de travail ; ⚠ **jouée sur batterie** (relevé du 30/10 à 18:45 : secteur `False`), fait que le rapport dit (note de Ko, point 2) |
| `docs/preuves/D339/neutralisation/union-campagnes.py` | le calcul de l'union des campagnes à rejouer (COPIE de celui de D337 ; seuls le SHA de départ par défaut et les noms changent) ; procédure archivée comme PREUVE (D291), jamais promue en instrument |
| `docs/preuves/D339/neutralisation/union-sortie.txt` | sa sortie, versée AVANT de jouer les campagnes (la dernière ligne `UNION: …` est ce que lit le lanceur) |
| `docs/preuves/D339/neutralisation/jouer-union.py` | le lanceur en série de l'union (COPIE de celui de D337 ; mêmes changements) |
| `docs/preuves/D339/neutralisation/e2e-a-la-main.py` | la neutralisation À LA MAIN de la spec `e2e/specs/r43-devis-brouillon.e2e.ts` (patron : `docs/preuves/D333/neutralisation/e2e-a-la-main.py`), qui porte aussi **la mesure du filtre d'audit de l'e2e** (note de Ko, point 4 : au moins un test exécuté, D144) |
| `docs/preuves/D339/neutralisation/e2e-a-la-main.txt` | sa sortie, LUE |
| `docs/preuves/D339/neutralisation/mutations-equivalentes.py` | la preuve que les cibles M-2 et M-5 de `neutralize-r43.py`, retirées comme mutations équivalentes, le sont (note de Ko, point 4 ; D325) ; procédure archivée comme PREUVE, jamais promue en instrument |
| `docs/preuves/D339/neutralisation/mutations-equivalentes.txt` | sa sortie, LUE |

**Extension 6** (02/11/2026, REPRISE — après le jeu de l'union des campagnes ; commitée SEULE, AVANT le commit des fichiers qu'elle couvre, règle de D328 point 4. Relevé en lisant la sortie du jeu de l'union (17 campagnes jouées, `union-jeu.txt`) : **cinq campagnes ne se sont pas jouées**, `neutralize-r32.py`, `neutralize-r38.py`, `neutralize-r39.py`, `neutralize-r41.py` (« ARBRE NON CONFORME AU DÉPART », ancres à ×0 ou ×2 : le code de D339 a déplacé ou dédoublé le site qu'elles visent) et `neutralize-s10b.py` (S10b1-2, « ERREUR DE SCRIPT : 0 occurrence(s), 1 attendue(s) »). Ce sont des cibles **NON MESURÉES** — pas des gardes muettes — : aucune n'a muté quoi que ce soit. Les ré-ancrer est une modification de code du lot (les harnais sont dans `neutralisation/`, D283 : le lot compte déjà) :

| fichier | motif |
|---|---|
| `neutralisation/neutralize-r32.py` | cibles W-4 et N-1 ré-ancrées (la règle « nombre d'invités » vit dans `invitesBlockers`, et la liste des raisons du bouton « Continuer » choisit selon `sansCoordonnees`) |
| `neutralisation/neutralize-r38.py` | cibles J-8, J-9, J-10 ré-ancrées : le site de la boîte de langue des CANAUX n'est plus unique (la boîte de langue du téléchargement du brouillon en est la copie) ; l'ancre porte son voisinage |
| `neutralisation/neutralize-r39.py` | cibles U-8 (la forme de la référence accepte désormais deux préfixes), P-3 (deux sites de `quoteDocumentFilename`), I-15 (`creeLe` suivi de `officiel`) et I-16 (`official: row.isOfficial` après la version) ré-ancrées |
| `neutralisation/neutralize-r41.py` | cibles T-8 (`porteUnNom(corps)`), T-9 (la clé est dans `corpsDuDevis`, indentée de deux espaces), K-1 (`isOfficial: true` dans le `WHERE`) et J-6 (`sansCoordonnees \|\| chaineBrouillon`) ré-ancrées |
| `neutralisation/neutralize-s10b.py` | cible S10b1-2 ré-ancrée (la plus haute version se lit par `plusHauteVersion`, et un commentaire sépare le verrou de cette lecture) |
| `docs/preuves/D339/neutralisation/union-jeu.txt` | la sortie ENTIÈRE du premier jeu de l'union, telle qu'imprimée (17 passages, 193 gardes mordues, 5 sorties non nulles) |
| `docs/preuves/D339/neutralisation/union-jeu-2.txt` | la sortie du second jeu : les cinq campagnes ré-ancrées, rejouées sur secteur (note de Ko, point 2) |
| `docs/preuves/D339/neutralisation/journal-avant-reancrage-neutralize-r32.txt` | le journal du PREMIER passage de `neutralize-r32.py` (le refus de l'arbre), gardé à côté du passage réparé (D295) |
| `docs/preuves/D339/neutralisation/journal-avant-reancrage-neutralize-r38.txt` | idem pour `neutralize-r38.py` |
| `docs/preuves/D339/neutralisation/journal-avant-reancrage-neutralize-r39.txt` | idem pour `neutralize-r39.py` (passage `--int`) |
| `docs/preuves/D339/neutralisation/journal-avant-reancrage-neutralize-r41.txt` | idem pour `neutralize-r41.py` (passage `--int`) |
| `docs/preuves/D339/neutralisation/journal-avant-reancrage-neutralize-s10b.txt` | idem pour `neutralize-s10b.py` |
| `docs/preuves/D339/neutralisation/verification-mutations.txt` | la sortie de `neutralisation/verifier-mutations.py` sur les cinq harnais ré-ancrés : ancre 1 → 0 ET marqueur n → n + attendu, pour CHAQUE cible (D286), avant de les rejouer |
| `docs/preuves/D339/neutralisation/journal-neutralize-act-plafonds.txt` | le journal de la campagne, copié octet pour octet de `.neutralisation-journaux/d339-union/` |
| `docs/preuves/D339/neutralisation/journal-neutralize-b7.txt` | idem |
| `docs/preuves/D339/neutralisation/journal-neutralize-booking-status.txt` | idem |
| `docs/preuves/D339/neutralisation/journal-neutralize-e3d1-s8.txt` | idem (passage `--int`) |
| `docs/preuves/D339/neutralisation/journal-neutralize-horloge.txt` | idem |
| `docs/preuves/D339/neutralisation/journal-neutralize-journey.txt` | idem |
| `docs/preuves/D339/neutralisation/journal-neutralize-r32.txt` | idem (passage réparé) |
| `docs/preuves/D339/neutralisation/journal-neutralize-r33.txt` | idem (passage `--int`) |
| `docs/preuves/D339/neutralisation/journal-neutralize-r37.txt` | idem |
| `docs/preuves/D339/neutralisation/journal-neutralize-r38.txt` | idem (passage réparé) |
| `docs/preuves/D339/neutralisation/journal-neutralize-r39.txt` | idem (passage réparé, `--int`) |
| `docs/preuves/D339/neutralisation/journal-neutralize-r4.txt` | idem |
| `docs/preuves/D339/neutralisation/journal-neutralize-r41.txt` | idem (passage réparé, `--int`) |
| `docs/preuves/D339/neutralisation/journal-neutralize-r42.txt` | idem (passage `--int`) |
| `docs/preuves/D339/neutralisation/journal-neutralize-s10b.txt` | idem (passage réparé) |
| `docs/preuves/D339/neutralisation/journal-neutralize-s11b.txt` | idem (passage `--int`) |
| `docs/preuves/D339/neutralisation/journal-neutralize-solid-s3.txt` | idem (passage `--int`) |

⚠ **Conditionnel, déclaré ici avec sa condition** : si le rejeu d'une des cinq campagnes révèle une garde MUETTE ou une cible non mesurée, la réparation suivante est une extension de plus, commitée seule AVANT son fichier ; ce paragraphe ne la déclare pas d'avance. Les journaux de `neutralize-r43.py` et de l'e2e à la main sont déjà déclarés par l'extension 5 (`sortie-r43-int.txt`, `e2e-a-la-main.txt`).

**Extension 7** (02/11/2026, REPRISE — après le second jeu de l'union (cinq campagnes ré-ancrées, `union-jeu-2.txt`) ; commitée SEULE, AVANT le commit des pièces qu'elle déclare, règle de D328 point 4. Relevé en lisant la sortie du second jeu : **quatre campagnes mordent sans reste** (`r32` 65/65, `r38` 46/46, `r41` 70/70, `s10b` 20/20) et `neutralize-r39.py --int` rend **50 gardes mordues sur 51**. La garde « muette » est S-9, et la sortie brute montre une **cause d'INSTRUMENT** (D298) : sa première mesure (`store`) MORD (`AssertionError: expected [ 'FOR UPDATE', 'compteur', …(2) ] to not include 'compteur'`), sa seconde (`store#2`) rend `SANS-TITRE` — le titre attendu, « `FOR UPDATE` puis `aggregate` puis `create` », n'existe plus : D339 a renommé ce test (« `FOR UPDATE` puis la plus haute version (L36-2 : son numéro ET son drapeau, en une lecture) puis `create` »). Le titre attendu se corrige dans `neutralisation/neutralize-r39.py` (déjà déclaré par l'extension 6) ; le jeu de r39 se REJOUE EN ENTIER, calibration comprise (D298) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/neutralisation/journal-avant-titre-neutralize-r39.txt` | le journal du passage de `neutralize-r39.py --int` qui a montré S-9 `SANS-TITRE`, gardé à côté du passage réparé (D295) |
| `docs/preuves/D339/neutralisation/union-jeu-3.txt` | la sortie du troisième jeu : `neutralize-r39.py` seul, rejoué en entier sur secteur après la correction du titre attendu |

**Extension 8** (02/11/2026, REPRISE — après la première passe de l'e2e à la main (`e2e-a-la-main.txt`) ; commitée SEULE, AVANT le commit des pièces qu'elle déclare, règle de D328 point 4. Relevé en LISANT la sortie : le témoin est vert (3 tests exécutés), E-1, E-2, E-3 et E-5 mordent par une assertion lue, **E-4 ne mord PAS** (« joué-et-rouge NON », 1 test exécuté, 0 en échec). La cause est un **défaut d'INSTRUMENT** (D298), pas une spec aveugle : la mutation de E-4 vise `packages/types/src/quote.ts`, or l'API de l'e2e charge `@zwadj/types` par son `main`, `packages/types/dist/index.js` (`vite.config.ts` de l'app Pro : « `@zwadj/types` a main → dist (runtime NestJS) », et seul l'alias de Vite lit `src`) ; la référence que la spec lit vient de l'API. La mutation est posée dans le fichier (ancre 1 → 0, marqueur 0 → 1) **et ne change rien à ce que l'API exécute** — la mutation auto-neutralisée de D209 (2). E-4 doit muter AUSSI `packages/types/dist/quote.js` (fichier compilé, ignoré par git, restauré à l'octet). Le script est corrigé puis REJOUÉ EN ENTIER, témoin et calibration compris (D298) ; la sortie de la première passe est gardée à côté de la passe réparée (D295) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/neutralisation/e2e-a-la-main-passe-1.txt` | la sortie de la première passe de l'e2e à la main, où E-4 est inerte (mutation hors du code que l'API exécute), versée telle quelle à côté de la passe réparée |

**Extension 9** (03/11/2026, REPRISE — après la note de Ko du 03/11/2026, décisions R-6 à R-10 du relecteur, adoptées par Ko : l'e2e de clôture se rejoue UNE fois, en entier, à la main, sa règle écrite AVANT ; l'arrêt se consigne dans une pièce ; l'état machine se relève pendant le rejeu ; commitée SEULE, AVANT le commit des fichiers qu'elle couvre, règle de D328 point 4. Relevé en LISANT les sorties de la seconde passe des portes (03/11/2026 09:08-09:20, `HEAD` `138a7dc`) et en comparant les pièces que R-6, R-7 et R-8 exigent aux chemins complets de cette table : `typecheck`, `lint`, `test`, `build` et `test:int` sortent en 0 (619 sur 619) ; `test:e2e` sort en 1 — 62 passés, 1 échec, 1 ignoré — sur **`r41-fiche-client.e2e.ts:65`**, `fetch failed` ← `ECONNRESET` au PREMIER appel du fixture (`POST /auth/register`), après 3 ms : la signature de D265, dans une spec qui n'est pas celle du lot. Les trois tests de la spec du lot passent. **Deux fichiers de la liste ci-dessous existaient AVANT cette déclaration** — `portes/etat-env-ouverture.txt` (relevé des `.env` de la passe 1) et la sortie brute de la passe 1, déjà déclarée par l'ouverture (`portes/test-e2e.txt`), qui est **remplacée sur place par sa forme MASQUÉE** (77 jetons de liens de vérification d'une base jetable, le brut est gardé hors dépôt, empreinte dans la pièce). Aucun n'est commité à cette date. Le rejeu est un seul lancement : si une porte dure l'empêche de démarrer (`.env` non local, batterie, `chrome` ou `headless_shell` > 0), les fichiers `rejeu-*` et `test-e2e-rejeu.txt` n'existent pas et la pièce le dit) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/portes/arret-e2e-r41.md` | décision R-7 : l'arrêt et ses chiffres, les trois passes isolées, **la règle de R-6 écrite AVANT le rejeu** (commit antérieur au rejeu, `git` le prouve), puis le résultat du rejeu |
| `docs/preuves/D339/portes/etat-env-ouverture.txt` | relevé des `.env` à l'ouverture de la passe 1 (empreintes et classe d'hôte, aucune valeur, D330) |
| `docs/preuves/D339/portes/etat-env-cloture.txt` | idem à la clôture de la passe 1 (identique à l'ouverture, `comparer` : code 0) |
| `docs/preuves/D339/portes/isolee-r41-1.txt` | R-7 : première passe isolée de `r41-fiche-client`, MASQUÉE (6 jetons), hors porte, `retries` inchangé |
| `docs/preuves/D339/portes/isolee-r41-2.txt` | idem, deuxième passe |
| `docs/preuves/D339/portes/isolee-r41-3.txt` | idem, troisième passe |
| `docs/preuves/D339/portes/rejeu-etat-machine.txt` | R-8 : l'état machine JUSTE AVANT, toutes les 30 s PENDANT, juste APRÈS le rejeu (secteur, batterie, RAM libre, `chrome`, `headless_shell`, `node`, processeur) ; relevé hors dépôt pendant le rejeu, copié après |
| `docs/preuves/D339/portes/rejeu-etat-env-ouverture.txt` | les `.env` à l'ouverture du rejeu (D330 : hôte non local ⇒ le rejeu ne démarre pas) |
| `docs/preuves/D339/portes/rejeu-etat-env-cloture.txt` | les `.env` à la clôture du rejeu |
| `docs/preuves/D339/portes/rejeu-lancement.txt` | `HEAD` et arbre au lancement, codes des relevés, heures de départ et de fin, code du rejeu, comparaison des `.env` |
| `docs/preuves/D339/portes/test-e2e-rejeu.txt` | la sortie du rejeu, MASQUÉE si elle porte des jetons ; **versée à côté** de la passe rouge (`portes/test-e2e.txt`), jamais à sa place (« une porte ne se déclare pas verte en taisant sa première passe ») |
| `docs/preuves/D339/portes/outils/masquer.py` | le masqueur des jetons (calibré sur deux bras à chaque lancement) ; procédure archivée comme PREUVE, jamais promue en instrument (D291) |
| `docs/preuves/D339/portes/outils/releve-machine.ps1` | l'échantillonneur de l'état machine du rejeu (R-8) ; idem, archivé comme preuve |
| `docs/preuves/D339/portes/outils/rejeu.sh` | le lanceur du rejeu (portes dures, relevés, commande de la porte, comparaison des `.env`) ; idem |
| `docs/preuves/D339/audit-secrets-d339e.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), AVANT le commit des pièces ci-dessus qui entrent avant le rejeu (D298) ; l'audit « b » de la clôture reste déclaré plus haut |
| `docs/preuves/D339/tri-audit-d339e.txt` | son tri différentiel contre `docs/preuves/D339/audit-secrets-d339d.txt` |

**Extension 10** (03/11/2026, REPRISE — commitée SEULE, AVANT le commit des fichiers qu'elle couvre, règle de D328 point 4. Relevé en rédigeant la pièce de l'arrêt (extension 9, `portes/arret-e2e-r41.md`) : elle compare la seconde passe de `test:e2e` (03/11, 62 passés, 1 échec) à **la première passe du 02/11/2026, sur le même `HEAD` `138a7dc`** (63 passés, 0 échec, 1 ignoré, `r41:65` vert). Cette comparaison est une affirmation de MESURE : sa sortie brute doit être versée (note de Ko du 02/11 : « une affirmation écrite comme mesurée nomme la pièce brute qui la porte »). Elle existait seulement hors dépôt. Les trois pièces ci-dessous sont les seules de cette première passe du 02/11 qui entrent ; sa sortie `test:int` (rouge, causée par un `.env` non local, corrigé par Ko) n'entre PAS) :

| fichier | motif |
|---|---|
| `docs/preuves/D339/portes/passe-02-11-test-e2e.txt` | la sortie de `pnpm test:e2e` de la première passe des portes du 02/11/2026 (code 0, 63 passés), MASQUÉE (jetons de liens de vérification d'une base jetable) ; copiée du fichier de travail, brut gardé hors dépôt |
| `docs/preuves/D339/portes/passe-02-11-etat-machine.txt` | l'état machine relevé avant cette passe (secteur, RAM libre 4 229 Mo, `chrome` 0, `headless_shell` 0) |
| `docs/preuves/D339/portes/passe-02-11-index.txt` | l'index de cette passe (heures, `HEAD`, code et durée de chaque porte) |
