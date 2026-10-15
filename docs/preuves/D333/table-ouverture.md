# D333 — rang 39 — table d'ouverture

Lot : **L35-3, la numérotation des devis** (rang 39, arbitré par Ko le 15/10/2026 : « 3. Rang 39 : L35-3, la numérotation. Lot de code, méthode renforcée, suivi d'une certification immédiate. »). C'est un **lot de CODE** : il **compte** dans le compteur de lots de code non certifiés (D283 amendé par D292 : un lot qui touche du code, un test, un harnais, une migration ou une spec e2e compte). Compteur à l'ouverture : **DEUX** (clôture de D332) ; à la clôture : **TROIS**, sous la limite de **CINQ** (arbitrage de Ko du 14/10/2026). Méthode **RENFORCÉE** : le numéro du devis s'écrit dans la transaction qui enregistre les montants d'un devis (cadrage de D328, § 5) ⇒ **première condition de Ko : une certification IMMÉDIATE suit le lot**, quel que soit le compteur.

- **SHA de départ** : `2782be9` (dernier commit de D332). `HEAD` = `origin/main` après `git fetch` (les deux = `2782be98104f70bc6130850f90e76f5a5086e61b`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D333 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D332) ; `grep -c D333` dans `ZWADJ_CONTINUITE.md`, `ZWADJ_BACKLOG.md` et `AGENTS.md` : 0, 0, 0.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; consigne du rang 39) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse de D332 (instrument, sortie), **avant toute écriture d'autorité** ; (3) les `.md` d'autorité : **les arbitrages de Ko en première écriture, mot pour mot, seuls dans leur commit**, puis les décisions du relecteur ; la table « Fichiers attendus » y est recopiée **à l'identique**, extensions comprises ; (4) **le cadrage du sous-lot** (relevé du code actuel, ordre des verrous, modes de défaillance, table des fichiers), commité **et poussé AVANT la première ligne de code** ; (5) toute extension : un commit propre qui l'ajoute à ce fichier, **AVANT** le commit du fichier qu'elle couvre.
- **Règle d'arrêt** (décision 1 du relecteur) : si le relevé du code contredit une règle de R3, ou montre un mode de défaillance que le cadrage ne sait pas garder, la session s'arrête **sans coder**, verse le cadrage et revient à Ko.
- **Pourquoi des extensions sont PRÉVUES** : les pièces des portes, des campagnes, des rouges, des verts, des captures et de l'audit portent des noms qui **dépendent de la mesure**. Elles sont déclarées **en chemins complets, un par un**, par des extensions commitées avant leur versement — jamais par un préfixe (un préfixe rend « 0 non déclaré » vrai par construction : constat P-C1 de D328).

## Ce que le lot fait, et ce qu'il ne fait pas

**Ce qu'il fait** (R3, ratifiée par Ko le 11/10/2026, et K-6, K-7 du cadrage de D328) :
1. **`venues.number`** : une SÉQUENCE PostgreSQL sur toute la plateforme ; les salles existantes, **supprimées comprises**, numérotées dans l'ordre de création (départage par identifiant) ; `setval` au maximum ; `NOT NULL`, défaut, unicité. Il peut sauter une valeur, il ne se répète jamais.
2. **Le numéro du devis** : une **TABLE DE COMPTEURS** dédiée, une ligne par (salle, année), incrémentée de façon atomique dans la transaction de création de la version 1. **Jamais** « lire le plus grand puis ajouter 1 ». **Aucun compteur sur la ligne `venues`** (D327 : verrou de l'acceptation, clé de tri de la liste).
3. **L'unicité en base** : (salle, année, numéro) pour la PREMIÈRE version ; les versions suivantes recopient année et numéro (clé étrangère composite vers la tête de chaîne), et un test le prouve.
4. **L'année** : celle de la création de la version 1, **à l'heure d'Alger** (D48). Une révision garde année et numéro, même l'année suivante.
5. **Les devis existants** numérotés par la migration, par ordre de création au sein de (salle, année d'Alger) ; test sur base **NON VIDE** (D123), `migration-non-empty.int-spec.ts` re-pointé.
6. **Au moins 4 chiffres** pour chaque numéro, plus au-delà de 9 999.
7. **La référence** `DEVIS-2026-0001-0089 v1` dans `QuoteDTO` (K-6, la référence seule), affichée après « Calculer le devis » et dans la fenêtre de remise (DB-10), imprimée sur le PDF ; **le nom de fichier** `DEVIS-2026-0001-0089_fr_v1.pdf` (K-7 : `quoteDocumentFilename` et ses consommateurs). L'ancienne référence (`id.slice(0, 8)`) et son défaut disparaissent.
8. **Test de concurrence sur PostgreSQL réel** : N créations simultanées dans la même salle donnent N numéros distincts ; une création et une révision simultanées n'interbloquent pas.

**Ce qu'il ne fait pas** : la fiche client, la copie du nom sur le devis, l'origine figée (L35-4, L35-7) ; **aucun contrat d'API autre que K-6 et K-7** — si le lot en exigeait un, il s'arrêterait et demanderait ; l'idempotence d'une création (M-17 : deux clics donnent deux numéros consécutifs, comportement correct, signalé au backlog) ; la condition de clôture du rang 33 reste OUVERTE (le nom du client vient avec L35-4).

## Fichiers attendus — chemins COMPLETS

Les chemins de code ci-dessous sont ceux que la lecture du code, faite AVANT le cadrage, désigne. Le cadrage les confirme ou les corrige **par une extension**, jamais en silence.

| fichier | pour |
|---|---|
| `docs/preuves/D333/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D333/lecture-adverse/confronter-d332.py` | l'instrument de la lecture adverse de D332 : objets `git` à SHA fixes, extracteurs calibrés sur un cas vrai et un cas faux |
| `docs/preuves/D333/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D333/releve-code/releve-transactions.py` | le relevé du code actuel pour le cadrage (décision 1 du relecteur, (a)) : les transactions de création et de révision d'un devis, les verrous qu'elles prennent, ceux de l'acceptation d'une réservation et de la création d'un blocage ; lecture seule, calibré à deux bras |
| `docs/preuves/D333/releve-code/releve-transactions-sortie.txt` | sa sortie |
| `apps/api/prisma/schema.prisma` | `Venue.number`, le modèle des compteurs, `Quote.referenceYear` et `Quote.referenceNumber` (déclarations ; les garanties vivent dans la migration, D186) |
| `apps/api/prisma/migrations/20261015100000_venue_number/migration.sql` | M-A : la séquence, la numérotation des salles existantes (supprimées comprises), `NOT NULL`, défaut, unicité, immuabilité |
| `apps/api/prisma/migrations/20261015100100_quote_reference/migration.sql` | M-B : la table de compteurs, les colonnes du devis, la numérotation des devis existants, l'unicité de la version 1, la clé étrangère composite vers la tête de chaîne |
| `apps/api/src/venues/quote-reference.ts` | NOUVEAU — module PUR : l'année d'Alger d'un instant (UTC+1 sans heure d'été, D48) |
| `apps/api/src/venues/quote-store.types.ts` | le port : l'année passée à la création, la référence dans la ligne lue |
| `apps/api/src/venues/quote-store.prisma.ts` | l'adaptateur : le compteur incrémenté dans la transaction de création ; la révision recopie année et numéro |
| `apps/api/src/venues/quotes.service.ts` | le service lit l'horloge (seul autorisé, D48) et passe l'année ; `toDTO` porte la référence |
| `apps/api/src/documents/quote-document-source.ts` | la ligne du document porte la référence |
| `apps/api/src/documents/quote-document-source.prisma.ts` | l'adaptateur de lecture du document lit la référence |
| `apps/api/src/documents/quote-document.ts` | le modèle imprime la référence stockée ; `quoteReference` (`id.slice(0, 8)`) disparaît |
| `apps/api/src/documents/quote-document.service.ts` | le nom du fichier dit la langue et la version |
| `packages/types/src/quote.ts` | K-6 : `QuoteDTO.reference` ; K-7 : `quoteDocumentFilename` ; la formule de la référence en UN endroit (`formatQuoteReference`) |
| `packages/i18n/messages/fr.json` | catalogue français : l'intitulé de la référence, sa ligne dans la fenêtre de remise |
| `packages/i18n/messages/ar.json` | catalogue arabe : les mêmes clés (parité) |
| `apps/pro/src/dashboard/walkin-journey.tsx` | la référence après « Calculer le devis » et dans la fenêtre de remise ; le nom de fichier avec la langue choisie |
| `apps/pro/src/dashboard/remittance.ts` | la fenêtre de remise porte la référence (fonction pure) |
| `apps/api/src/common/quote-reference.spec.ts` | NOUVEAU — la formule de la référence et du nom de fichier (4 chiffres au moins, plus au-delà de 9 999 ; caractères sûrs ; langue ; version) |
| `apps/api/src/venues/quote-reference.spec.ts` | NOUVEAU — l'année d'Alger, aux bornes (31/12 à 23 h 30 UTC, 31/12 à 22 h 59 UTC, 1ᵉʳ janvier) |
| `apps/api/src/venues/quote-store.prisma.spec.ts` | l'adaptateur : l'ordre des écritures de la transaction, le compteur dedans |
| `apps/api/src/venues/quotes.service.spec.ts` | le service passe l'année d'Alger de l'horloge figée ; une révision n'en passe aucune |
| `apps/api/src/documents/quote-document.spec.ts` | le modèle imprime la référence stockée, plus l'ancienne ; la garde de source |
| `apps/api/src/documents/quote-document.service.spec.ts` | le nom du fichier du service |
| `apps/api/test/int/quote-numbering.int-spec.ts` | NOUVEAU — l'intégration sur PostgreSQL réel : concurrence (N créations, N numéros distincts ; création et révision sans interblocage), clé composite, unicité, année d'Alger, échec au milieu de la transaction, séquence des salles |
| `apps/api/test/int/quotes.int-spec.ts` | les devis portent leur référence |
| `apps/api/test/int/quote-document.int-spec.ts` | l'en-tête `Content-Disposition` porte le nom du fichier du lot |
| `apps/api/test/int/migration-non-empty.int-spec.ts` | re-pointé sur les nouvelles dernières migrations, semis avec chaînes de révisions et salles supprimées (D123) |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` | la référence à l'écran, dans la fenêtre de remise, le nom du fichier téléchargé |
| `apps/pro/src/dashboard/remittance.test.ts` | la fenêtre de remise porte la référence |
| `apps/pro/src/venues/quotes-section.test.tsx` | la fixture `QuoteDTO` porte la référence (le type l'exige) |
| `e2e/specs/r33-remise-devis.e2e.ts` | l'e2e : la référence à l'écran, dans la fenêtre de remise, et le nom du fichier téléchargé |
| `neutralisation/neutralize-r39.py` | NOUVEAU — le harnais de neutralisation du lot (`--int` pour les gardes en base) |
| `neutralisation/neutralize-r33.py` | les ancres que ce diff périme (le nom de fichier, l'ancienne référence) |
| `neutralisation/neutralize-r38.py` | idem |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko du 15/10 (première écriture), décisions du relecteur, ordre des rangs, point d'entrée du rang 39, cadrage du sous-lot, section D333, registre |
| `AGENTS.md` | la chaîne du compteur (DEUX → TROIS), la condition « certification immédiate » ; annotations, jamais de réécriture |
| `ZWADJ_BACKLOG.md` | l'entrée « la cellule de détail vide d'une ligne « fixe » » fermée avec renvoi ; les reports du 15/10/2026 |

### Fichiers CONDITIONNELS — créés ou modifiés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D333/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327 à D332) |
| `docs/preuves/D333/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `docs/preuves/D333/passe-d277/balayage.py`, `docs/preuves/D333/passe-d277/motifs.txt`, `docs/preuves/D333/passe-d277/balayage-1-AVANT-ECRITURE.txt`, `docs/preuves/D333/passe-d277/balayage-final.txt` | la passe D277 dans les deux sens est jouée (copie à l'octet de celle de D332) |
| `docs/preuves/D333/audit-secrets-d333a.txt`, `docs/preuves/D333/tri-audit-d333a.txt`, `docs/preuves/D333/audit-secrets-d333b.txt`, `docs/preuves/D333/tri-audit-d333b.txt` | les audits de secrets scellés et leur tri différentiel, avant les pièces de code et à la clôture |
| `docs/preuves/D333/aucune-valeur-reelle.txt` | un journal de la session porte des valeurs réelles (liens de vérification de la pile e2e) : le contrôle dédié « aucune valeur réelle » |
| `apps/api/test/int/pdf-renderer.int-spec.ts`, `apps/api/src/documents/playwright-pdf.renderer.spec.ts` | la forme du devis de test (la référence) casse à la compilation |
| `apps/api/src/venues/venue-store.prisma.ts`, `apps/api/src/venues/venue-store.prisma.spec.ts` | la création d'une salle exige de ne pas écrire `number` — ou le contraire : le défaut de la base suffit, ces fichiers ne changent pas |
| `apps/pro/src/test-support/client-doubles.ts` | un double de test construit un `QuoteDTO` complet |
| `apps/api/test/int/contract-api-client.int-spec.ts`, `packages/api-client/src/quotes-client.ts` | un chemin d'API changerait — ce qui serait un contrat : le lot s'arrêterait et demanderait |
| `neutralisation/neutralize-journey.py`, `neutralisation/neutralize-r32.py`, `neutralisation/neutralize-r37.py`, `neutralisation/neutralize-act-plafonds.py`, `neutralisation/neutralize-horloge.py` | une ancre de cible, ou le nombre de tests de `walkin-journey.test.tsx`, est périmé par ce diff (leçon D286, D332) ; fichier par fichier, par extension, avec la mesure qui le prouve |
| `e2e/fixtures/harness.ts` | un auxiliaire de l'e2e (lire la référence du devis créé) ne peut pas vivre dans la spec |
| `apps/api/prisma/seed.ts`, `apps/api/prisma/seed-demo.ts` | une graine crée une salle ou un devis d'une façon que la nouvelle colonne casse |

*(Un diagnostic NON certifiant, s'il est nécessaire, se déclare lui aussi par extension, fichier par fichier : aucune ligne de cette table ne nomme un répertoire.)*

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur versement

| famille | contenu |
|---|---|
| les rouges et les verts | `docs/preuves/D333/rouge/…` et `docs/preuves/D333/vert/…` : un rouge LU contre l'état d'avant pour chaque point (assertion native), puis le vert ; l'extracteur calibré |
| les portes | `docs/preuves/D333/portes/<porte>.txt` : les six portes, avec leurs chiffres, **extraits** (jamais le journal brut des suites qui portent des jetons) |
| les campagnes | `docs/preuves/D333/neutralisation/…` : la sortie de `neutralize-r39.py` (avec `--int`), l'UNION des campagnes (décision 3 du relecteur) et le script calibré qui la calcule, versé avec sa sortie AVANT de jouer |
| le test de concurrence | `docs/preuves/D333/concurrence/…` : les chiffres du test sur PostgreSQL réel (N, numéros obtenus, durée non certifiante) |
| les captures | `docs/preuves/D333/navigateur/…` : la référence après « Calculer le devis », dans la fenêtre de remise, le nom du fichier téléchargé, en français et en arabe, à 1 280 et 360 px |
| la liste de scénarios pour Ko | `docs/preuves/D333/scenarios-ko.md` : écrite AVANT le code (décision 4 du relecteur) |

### Extensions de la table

*(Aucune à l'ouverture. Chaque extension s'ajoute ici, en chemins complets, par un commit propre qui précède le commit du fichier qu'elle couvre.)*

#### Extension 1 — la liste de scénarios pour Ko (décision 4 du relecteur), déclarée AVANT d'être écrite

*Motif* : la famille « la liste de scénarios pour Ko » de la table d'ouverture nommait un chemin sans passer par une extension ; la règle exige une extension commitée avant le fichier. Le fichier est écrit **avant le code** (décision 4 : « écris pour Ko, avant le code, une courte liste de scénarios en langage simple »).

| fichier | pour |
|---|---|
| `docs/preuves/D333/scenarios-ko.md` | les scénarios de Ko, en langage simple : la référence après « Calculer le devis », dans la fenêtre de remise, le nom du fichier téléchargé, le deuxième devis de la salle, la révision |

#### Extension 2 — les prémisses de PostgreSQL mesurées avant le code, déclarées AVANT leur versement

*Motif* : le cadrage (D231, « vérifier la prémisse avant de coder la demande ») pose six affirmations sur le moteur (clé étrangère composite immédiate qui se référence elle-même, index unique partiel, compteur `ON CONFLICT`, année d'Alger, séquence annulée, déclencheur d'immuabilité). Elles sont **mesurées** sur une base jetable du conteneur de développement avant d'être écrites dans le cadrage. Diagnostic NON certifiant ; la base jetable est supprimée par le script (sa sortie le dit).

| fichier | pour |
|---|---|
| `docs/preuves/D333/releve-code/premisses-postgres.py` | le script : une base jetable, des tables qui imitent `venues` et `quotes`, chaque prémisse en paire acceptée / refusée, abandon si un bras manque |
| `docs/preuves/D333/releve-code/premisses-postgres-sortie.txt` | sa sortie : 0 prémisse manquée |

#### Extension 3 — la feuille de style de la référence, et les rouges LUS contre l'état d'avant (déclarés AVANT leur versement)

*Motif* : (1) la table de base ne nommait pas `apps/pro/src/theme.css` : la référence affichée après « Calculer le devis » a besoin d'un style (`.wk-reference`), seul fichier de style de l'application Pro. (2) Les rouges ont été joués AVANT tout fichier de production du lot (HEAD `01b0240`, tests du lot seuls dans l'arbre) ; leurs journaux bruts restent hors dépôt, l'EXTRAIT calibré est versé avec son hachage. L'extracteur est une **copie** de celui de D332 (seules les mentions « D332 » de l'usage et de l'en-tête de sortie deviennent « D333 »).

| fichier | pour |
|---|---|
| `apps/pro/src/theme.css` | la règle `.wk-reference` (la référence du devis, sous l'intitulé du total) |
| `docs/preuves/D333/rouge/extraire-rouge.py` | l'extracteur des rouges et des verts d'un journal vitest, calibré à deux bras |
| `docs/preuves/D333/rouge/rouge-api-pur.txt` | rouge : la référence, le nom du fichier (`@zwadj/types`) et l'année d'Alger — composants neufs |
| `docs/preuves/D333/rouge/rouge-api-ecriture.txt` | rouge : l'adaptateur de création et de révision |
| `docs/preuves/D333/rouge/rouge-api-service.txt` | rouge : la référence du DTO rendue par le service |
| `docs/preuves/D333/rouge/rouge-api-documents.txt` | rouge : le document imprime la référence stockée, le nom du fichier |
| `docs/preuves/D333/rouge/rouge-api-int.txt` | rouge : la numérotation sur PostgreSQL réel (concurrence, année, séquence, gardes de base, migrations sur base non vide) |
| `docs/preuves/D333/rouge/rouge-pro.txt` | rouge : la référence à l'écran, dans la fenêtre de remise, le nom du fichier avec la langue choisie |

#### Extension 4 — l'union des campagnes à rejouer (décision 3 du relecteur) : le script calibré et sa sortie, VERSÉS AVANT de jouer ; le lanceur ; les sorties des quatorze campagnes retenues

*Motif* : la décision 3 reprend la décision 1 de D332 — l'union du tri et des campagnes qui citent un fichier du diff, calculée par un script calibré, versée avec sa sortie AVANT de jouer. Les deux scripts sont des COPIES de ceux de D332 (« D332 » devient « D333 », le SHA de départ devient `2782be9`) ; le lanceur ne joue `r33` et `r39` qu'UNE fois, avec `--int` (N-C1 de la lecture adverse : sans et avec `--int` comptaient deux fois les mêmes gardes). La liste est fixée par la sortie versée : **14 campagnes sur 37**, dont 5 que le tri seul ne retient pas (`b7`, `e3d1-s8`, `r4`, `s11b`, `solid-s3` : elles citent `theme.css`, `migration.sql` ou `quotes.int-spec.ts`).

| fichier | pour |
|---|---|
| `docs/preuves/D333/neutralisation/union-campagnes.py` | le script calibré qui calcule l'union |
| `docs/preuves/D333/neutralisation/union-sortie.txt` | sa sortie, versée avant de jouer |
| `docs/preuves/D333/neutralisation/jouer-union.py` | le lanceur : joue chaque campagne de la liste versée, en série |
| `docs/preuves/D333/neutralisation/union-jeu.txt` | son rapport : ce qui a été parcouru, mordu, muet, non mesuré |
| `docs/preuves/D333/neutralisation/act-plafonds.txt` | sortie de `neutralize-act-plafonds.py` |
| `docs/preuves/D333/neutralisation/b7.txt` | sortie de `neutralize-b7.py` |
| `docs/preuves/D333/neutralisation/booking-status.txt` | sortie de `neutralize-booking-status.py` |
| `docs/preuves/D333/neutralisation/e3d1-s8.txt` | sortie de `neutralize-e3d1-s8.py` |
| `docs/preuves/D333/neutralisation/horloge.txt` | sortie de `neutralize-horloge.py` |
| `docs/preuves/D333/neutralisation/journey.txt` | sortie de `neutralize-journey.py` |
| `docs/preuves/D333/neutralisation/r32.txt` | sortie de `neutralize-r32.py` |
| `docs/preuves/D333/neutralisation/r33.txt` | sortie de `neutralize-r33.py` (jouée avec `--int`) |
| `docs/preuves/D333/neutralisation/r38.txt` | sortie de `neutralize-r38.py` |
| `docs/preuves/D333/neutralisation/r39.txt` | sortie de `neutralize-r39.py` (jouée avec `--int`) |
| `docs/preuves/D333/neutralisation/r4.txt` | sortie de `neutralize-r4.py` |
| `docs/preuves/D333/neutralisation/s10b.txt` | sortie de `neutralize-s10b.py` |
| `docs/preuves/D333/neutralisation/s11b.txt` | sortie de `neutralize-s11b.py` |
| `docs/preuves/D333/neutralisation/solid-s3.txt` | sortie de `neutralize-solid-s3.py` |

#### Extension 5 — une campagne de plus que l'union a retenue et dont une ancre était périmée

*Motif* : l'union (extension 4) a retenu `neutralize-s10b.py` ; son ancre « le verrou de chaîne disparaît » (`await this.verrouillerChaine(tx, args.chainId);`) et celle des « deux écritures de la tête » visaient du code que le lot a changé (le verrou rend désormais la tête dont la révision recopie la référence ; la tête naît en UNE écriture). Le fichier n'était ni dans la base ni dans les conditionnels de la table : il est déclaré ici, AVANT son commit, avec la mesure qui le prouve (la campagne s'arrêtait sur « ERREUR DE SCRIPT : 0 occurrence(s), 1 attendue(s) »).

| fichier | pour |
|---|---|
| `neutralisation/neutralize-s10b.py` | trois cibles réorientées par écrit (S10b1-1, S10b1-2, S10b1-5) : 20 gardes sur 20 mordues après |

#### Extension 6 — les pièces de clôture : les verts, les six portes, la neutralisation à la main de l'e2e, les premiers jeux des campagnes réparées, la concurrence rejouée, les captures (déclarées AVANT leur versement)

*Motif* : ces fichiers existent dans l'arbre de travail, NON suivis, au moment où cette extension s'écrit ; ils sont versés par le commit qui suit, jamais avant elle. Les sorties finales des quatorze campagnes et le rapport `union-jeu.txt` sont déjà déclarés par l'extension 4 ; les fichiers de la section « conditionnels » (passe D277, audits « b », contrôle « aucune valeur réelle ») restent déclarés par la table d'origine et seront ou non créés selon le cas, ce que le rapport dit.

| fichier | pour |
|---|---|
| `docs/preuves/D333/concurrence/concurrence-5-passes.txt` | la concurrence rejouée cinq fois sur PostgreSQL réel (18 tests sur 18, code 0, chaque fois) |
| `docs/preuves/D333/navigateur/images/reference-ar-1280.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/images/reference-ar-360.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/images/reference-fr-1280.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/images/reference-fr-360.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/images/remise-ar-1280.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/images/remise-ar-360.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/images/remise-fr-1280.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/images/remise-fr-360.png` | capture (français ou arabe, 1 280 ou 360 px) |
| `docs/preuves/D333/navigateur/mesures-capture.txt` | les lignes `MESURE …` de la sonde : référence du serveur, texte à l'écran, débordement, nom du fichier, fenêtre de remise |
| `docs/preuves/D333/navigateur/playwright.capture.config.ts` | configuration de la sonde de capture (copie de celle de D332, chemin du dossier changé) |
| `docs/preuves/D333/navigateur/reference-devis.capture.ts` | la sonde : joue le parcours, capture, relève ; ne juge rien |
| `docs/preuves/D333/neutralisation/e2e-a-la-main.py` | la neutralisation à la main de la spec e2e (E-1 à E-4), archivée comme preuve, jamais promue en instrument |
| `docs/preuves/D333/neutralisation/e2e-a-la-main.txt` | sa sortie : quatre mutations, quatre échecs `expect` lus, fichiers restaurés à l'octet |
| `docs/preuves/D333/neutralisation/premier-jeu/act-plafonds.txt` | le PREMIER jeu de la campagne, avant réparation de ses ancres ou de ses constantes (la sortie finale est à côté, déclarée par l'extension 4) |
| `docs/preuves/D333/neutralisation/premier-jeu/e3d1-s8.txt` | le PREMIER jeu de la campagne, avant réparation de ses ancres ou de ses constantes (la sortie finale est à côté, déclarée par l'extension 4) |
| `docs/preuves/D333/neutralisation/premier-jeu/horloge.txt` | le PREMIER jeu de la campagne, avant réparation de ses ancres ou de ses constantes (la sortie finale est à côté, déclarée par l'extension 4) |
| `docs/preuves/D333/neutralisation/premier-jeu/r33.txt` | le PREMIER jeu de la campagne, avant réparation de ses ancres ou de ses constantes (la sortie finale est à côté, déclarée par l'extension 4) |
| `docs/preuves/D333/neutralisation/premier-jeu/r39.txt` | le PREMIER jeu de la campagne, avant réparation de ses ancres ou de ses constantes (la sortie finale est à côté, déclarée par l'extension 4) |
| `docs/preuves/D333/neutralisation/premier-jeu/s10b.txt` | le PREMIER jeu de la campagne, avant réparation de ses ancres ou de ses constantes (la sortie finale est à côté, déclarée par l'extension 4) |
| `docs/preuves/D333/neutralisation/premier-jeu/s11b.txt` | le PREMIER jeu de la campagne, avant réparation de ses ancres ou de ses constantes (la sortie finale est à côté, déclarée par l'extension 4) |
| `docs/preuves/D333/portes/build.txt` | la porte, ses chiffres extraits (jamais le journal brut) |
| `docs/preuves/D333/portes/e2e.txt` | la porte, ses chiffres extraits (jamais le journal brut) |
| `docs/preuves/D333/portes/etat-machine.txt` | l'état de la machine à la fin du paquet de portes — NON certifiant, écrit comme tel |
| `docs/preuves/D333/portes/extraire-portes.py` | l'extracteur des portes (copie de celui de D332 ; seule la lecture de la base de `test-int` change) |
| `docs/preuves/D333/portes/lint.txt` | la porte, ses chiffres extraits (jamais le journal brut) |
| `docs/preuves/D333/portes/test-int.txt` | la porte, ses chiffres extraits (jamais le journal brut) |
| `docs/preuves/D333/portes/test.txt` | la porte, ses chiffres extraits (jamais le journal brut) |
| `docs/preuves/D333/portes/typecheck.txt` | la porte, ses chiffres extraits (jamais le journal brut) |
| `docs/preuves/D333/vert/vert-api-documents.txt` | le VERT de ce point, lu contre le rouge de `rouge/` |
| `docs/preuves/D333/vert/vert-api-ecriture.txt` | le VERT de ce point, lu contre le rouge de `rouge/` |
| `docs/preuves/D333/vert/vert-api-int.txt` | le VERT de ce point, lu contre le rouge de `rouge/` |
| `docs/preuves/D333/vert/vert-api-pur.txt` | le VERT de ce point, lu contre le rouge de `rouge/` |
| `docs/preuves/D333/vert/vert-api-service.txt` | le VERT de ce point, lu contre le rouge de `rouge/` |
| `docs/preuves/D333/vert/vert-pro.txt` | le VERT de ce point, lu contre le rouge de `rouge/` |
