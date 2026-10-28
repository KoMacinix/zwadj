# D338 — rang 43 — table d'ouverture

Lot : **le rang 43, arbitré par Ko le 27/10/2026 — L36-2, « le devis brouillon non officiel »** (consigne du relecteur, adoptée par Ko, collée en tête de la session). Lot de **CODE** par destination, méthode **RENFORCÉE** (DR4 de D336) **sous la pause** de certification (DR1 de D336) : ni session adverse B, ni certification immédiate ; restent dus le cadrage et les modes de défaillance **avant** le code, les rouges avant le code, le harnais, la lecture adverse et le contrôle de fin de lot. **Aucune certification, aucune marque.**

- **SHA de départ** : `985fd20` (clôture du contrôle de fin de lot de D337). `HEAD` = `origin/main` après `git fetch` (les deux = `985fd2096fb184fa0b09915a2e394b50ab281d57`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D338 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D337), comme la consigne l'attendait.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; D334 item 5) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse de la consigne, l'audit de secrets scellé et son tri, **avant toute écriture d'autorité** ; (3) les `.md` d'autorité, **la section 1 de la consigne (arbitrages de Ko) en PREMIÈRE écriture** ; (4) le cadrage `docs/preuves/D338/cadrage.md`, **avant toute ligne de code** ; (5) si — et seulement si — la règle d'arrêt ne joue pas : une extension de cette table, SEULE, qui donne la liste exacte des fichiers de code et de test ; puis les pièces des rouges (sorties lues contre l'état d'avant, empreinte sha256 de chaque fichier de test joué) dans un commit **ANTÉRIEUR** au premier commit de code ; puis le code ; (6) les autres `.md` d'autorité et les pièces de clôture en dernier.
- **Règle d'arrêt** (consigne, 4 b, mot pour mot en substance) : si le cadrage trouve une question produit que DR4 ne tranche pas, le cadrage est commité, chaque question est écrite en une phrase simple avec ses options (a)/(b) et ce qu'elles changent pour Ko, et la session s'arrête **sans code** : le lot est alors **documentaire**, le rang 43 reste **OUVERT**, le compteur reste **DEUX**. **Les fichiers de code ci-dessous sont donc CONDITIONNELS** : ils n'existent que si la règle d'arrêt ne joue pas. Le rapport de fin de lot dit lesquels existent.
- **Règle des affirmations fausses** (consigne, section 0) : si une affirmation de la consigne est fausse contre le dépôt, la session s'arrête et le dit ; elle ne l'adapte pas seule.
- Les numéros de ligne cités par la consigne (`quotes.service.ts:175`, `quote.ts:371`, `:319`, `:337`, `quotes.service.ts:216`, `:253`, `:302`, `:394`, `ZWADJ_CONTINUITE.md:2104`, `:2128`, `ZWADJ_BACKLOG.md:2513`, `e2e/global-setup.ts:30`) sont **revérifiés** par la lecture adverse, pas recopiés.

## Fichiers attendus — chemins COMPLETS

### Les pièces et l'outillage (existent dans tous les cas)

| fichier | pour |
|---|---|
| `docs/preuves/D338/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D338/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse (forme allégée) : chaque affirmation vérifiable de la consigne confrontée au dépôt à `985fd20`, calibré sur deux bras |
| `docs/preuves/D338/lecture-adverse/confronter-sortie.txt` | sa sortie (première partie courte, seconde partie en entier), versée avant toute écriture d'autorité |
| `docs/preuves/D338/audit-secrets-d338a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la lecture adverse |
| `docs/preuves/D338/tri-audit-d338a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D337/audit-secrets-d337b.txt`) |
| `docs/preuves/D338/cadrage.md` | le cadrage de L36-2 (consigne 4 a) : l'état des lieux mesuré, la forme, les contrats nommés, les écrans, les modes de défaillance ; et, si la règle d'arrêt joue, **les questions pour Ko** (une phrase simple, options (a)/(b), ce que chacune change) |
| `docs/preuves/D338/audit-secrets-d338b.txt` | audit de secrets scellé de la clôture |
| `docs/preuves/D338/tri-audit-d338b.txt` | son tri |
| `docs/preuves/D338/aucune-valeur-reelle.txt` | le contrôle « 0 valeur réelle » (D299) de la clôture |
| `docs/preuves/D338/controle-fin-de-lot.txt` | le contrôle de fin de lot (D288, D328), écrit APRÈS la poussée |

### Pièces CONDITIONNELLES (leur existence dépend d'un défaut à trouver — D328)

| fichier | condition |
|---|---|
| `docs/preuves/D338/lecture-adverse/defauts-instrument.txt` | existe seulement si la première passe de l'instrument de lecture adverse révèle un défaut d'instrument |
| `docs/preuves/D338/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | existe seulement dans ce même cas : la sortie de la passe qui a montré le défaut, gardée à côté de la passe réparée (D295) |
| `docs/preuves/D338/signalements.md` | existe seulement si le cadrage ou la lecture trouve un défaut croisé à RAPPORTER (il ne se corrige pas dans ce lot) |
| `docs/preuves/D338/ecritures-base-dev.md` | existe seulement si une écriture sur la base de développement de Ko a lieu (règle permanente de D337) — **aucune n'est prévue** ; si la règle d'arrêt joue, ce fichier n'existe pas |

### Les fichiers d'autorité (existent dans tous les cas)

| fichier | pour |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture** : les arbitrages et adoptions de la section 1 de la consigne (rang 43 = L36-2 option (a) ; NB-6 hors lot ; S-68 à S-75 ratifiées par adoption ; réponse à la question de D337 ; condition de clôture du rang 42 levée) ; puis les annotations de la section D337 (1 d, 1 e, R-2 — ajout seul), la section D338, le point d'entrée du rang 43, l'ordre des rangs, le registre (D338) |
| `AGENTS.md` | la chaîne du compteur et des rangs (annotation, jamais de réécriture) ; la rubrique « Patrons » seulement si le lot en produit |
| `ZWADJ_BACKLOG.md` | l'entrée du `CHECK bookings_contact_reachable` qui ne teste que NULL (consigne 3 b, R-3, mot pour mot) ; l'entrée L36-2 mise à jour ; les entrées ouvertes que le lot découvre ; **sans rang** (D302) |

### CONDITIONNELS — le code de L36-2 (n'existent que si la règle d'arrêt ne joue PAS)

Liste **prévisible** à la lecture du code ; l'**extension 1** de cette table la rend exacte (avec les fichiers de test, en chemins complets) **avant** le commit des rouges. Un fichier absent de l'extension 1 n'est pas touché.

| fichier | pour |
|---|---|
| `apps/api/prisma/migrations/20261027100000_quote_unofficial_draft/migration.sql` | `quotes.is_official boolean NOT NULL DEFAULT true` et son `CHECK`, écrite à la main (D186), testée sur base non vide (D123) |
| `apps/api/prisma/schema.prisma` | `Quote.isOfficial` (le `CHECK` n'a pas de déclaration Prisma) |
| `apps/api/test/int/migration-non-empty.int-spec.ts` | la sonde se retarge (la dernière migration change) ; les devis existants passent intacts, ligne à ligne |
| `packages/types/src/quote.ts` | le champ de création, la promotion, `QuoteDTO.isOfficial`, la référence `BROUILLON-…`, le préfixe du nom de fichier, les codes de refus |
| `packages/i18n/messages/fr.json` | les messages neufs (FR) |
| `packages/i18n/messages/ar.json` | les messages neufs (AR), parité FR = AR |
| `apps/api/src/venues/quotes.service.ts` | création, remise, révision, conversion, annulation, promotion |
| `apps/api/src/venues/quote-store.types.ts` | le port : la promotion et ses résultats |
| `apps/api/src/venues/quote-store.prisma.ts` | l'adaptateur : la promotion en check-and-set, la ligne d'audit dans la même transaction |
| `apps/api/src/venues/quote-transitions.ts` | la politique pure des commandes sur un devis non officiel |
| `apps/api/src/venues/quotes.controller.ts` | la route de promotion |
| `apps/api/src/documents/quote-document.ts` | le filigrane sur chaque page |
| `apps/api/src/documents/quote-document-source.ts` | `isOfficial` lu avec le devis |
| `apps/api/src/documents/quote-document-source.prisma.ts` | idem, côté lecture |
| `packages/api-client/src/quotes-client.ts` | l'appel de promotion (le chemin en toutes lettres, D182) |
| `apps/pro/src/dashboard/walkin-journey.tsx` | l'écran (où le pro crée, promeut, voit un brouillon) |
| `neutralisation/neutralize-r43.py` | le harnais du lot |

### CONDITIONNELS — les tests, l'e2e, les pièces du code (liste exacte par l'extension 1)

| fichier | pour |
|---|---|
| `docs/preuves/D338/rouges/` | les pièces des rouges, commitées AVANT le premier commit de code (D334 item 5) |
| `docs/preuves/D338/verts/` | les sorties vertes des tests du lot |
| `docs/preuves/D338/portes/` | les six portes et l'e2e, rejouées après la dernière modification |
| `docs/preuves/D338/neutralisation/` | les journaux de `neutralize-r43.py` et des campagnes touchées |
| `docs/preuves/D338/scenarios-ko.md` | les gestes de Ko (dix lignes au plus) |
| `docs/preuves/D338/modes-de-defaillance.md` | existe seulement si le cadrage les sépare de `cadrage.md` ; sinon ils vivent dans `cadrage.md` |
| `docs/preuves/D338/passe-d277.md` | la passe D277 des deux sens, pour un lot qui change l'état d'un fichier d'autorité de plus que la clôture |

## Ce que cette table NE déclare PAS (et pourquoi)

- **Aucun fichier de l'e2e, des suites unitaires ou d'intégration n'est nommé ici** : leurs chemins complets se donnent par l'extension 1, après le cadrage, **si** le code part. Les nommer avant le cadrage serait écrire de mémoire.
- **Aucun fichier de `visit_bookings`, de paiement (E3, R1), de notification (L36-9), ni de la fiche client (`pro-client-*`)** : hors lot (consigne 4 c).
- **NB-6** (date d'événement passée) : hors lot — il reste un petit lot à placer par Ko (consigne 1 b).

## Extension 1 — 27/10/2026 — commitée SEULE, AVANT le versement qu'elle couvre : les MESURES du cadrage et leur audit

Motif : le cadrage (`cadrage.md`) cite des mesures — des commandes et un spike du filigrane — dont les sorties brutes doivent entrer au dépôt (`AGENTS.md`, D291 : « les preuves brutes qu'une décision cite entrent au dépôt »), et un versement passe par l'audit de secrets **avant** son commit (D298). Ces fichiers n'étaient pas dans la table d'ouverture : les voici, en chemins complets, avant qu'ils ne soient commités.

⚠ **Numérotation** : la table d'ouverture annonçait « l'extension 1 » pour la liste exacte du CODE (si la règle d'arrêt ne joue pas). **Cette extension-ci prend le numéro 1** ; celle du code, si elle a lieu, s'appellera **extension 2** (même contenu, autre numéro). Rien n'est retiré de ce qui précède.

| fichier | pour |
|---|---|
| `docs/preuves/D338/mesures-cadrage.sh` | les mesures du cadrage (treize), chaque commande imprimée avant sa sortie brute ; rejouable depuis la racine |
| `docs/preuves/D338/mesures-cadrage.txt` | sa sortie brute (188 lignes), versée telle quelle |
| `docs/preuves/D338/spike-filigrane/spike-filigrane-passe-1.js` | la PASSE 1 du spike du filigrane, conservée telle que jouée — son extracteur est défectueux (il rend zéro partout) |
| `docs/preuves/D338/spike-filigrane/sortie-passe-1.txt` | sa sortie : les zéros |
| `docs/preuves/D338/spike-filigrane/calibrage-couleurs.js` | le calibrage de l'extracteur : toutes les couleurs posées, avec et sans filigrane |
| `docs/preuves/D338/spike-filigrane/sortie-calibrage.txt` | sa sortie : le format réel (« .1216 .498 .7882 rg »), absent du bras faux, présent dans le bras vrai |
| `docs/preuves/D338/spike-filigrane/spike-filigrane.js` | le spike réparé : un filigrane `position: fixed` et le nombre de pages, sur 1, 4 (fr et ar) et 7 pages, plus deux bras faux |
| `docs/preuves/D338/spike-filigrane/sortie.txt` | sa sortie |
| `docs/preuves/D338/audit-secrets-d338c.txt` | audit de secrets scellé, AVANT le commit du cadrage et de ces pièces (l'audit « a » est celui de l'ouverture, l'audit « b » celui de la clôture ; celui-ci est entre les deux) |
| `docs/preuves/D338/tri-audit-d338c.txt` | son tri différentiel contre `audit-secrets-d338a.txt` |
