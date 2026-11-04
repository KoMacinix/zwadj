# D340 — rang 44 — table d'ouverture

Lot : **le rang 44, L36-3 — « le personnel et le PIN, côté serveur »** (DR5 de D336 et tranche [L36-3] de la section 4 de la consigne v3), sur la consigne du relecteur adoptée par Ko et collée en tête de la session (`docs/preuves/D340/consigne.md`). **Cadrage PUIS code dans la MÊME session, avec une règle d'arrêt** (R-4). Lot de **CODE** par destination, méthode **RENFORCÉE** (R-3 : chemin d'identité) **sous la pause** de certification (DR1 de D336 ; R-2) : ni session adverse B, ni certification immédiate ; restent dus le cadrage et les modes de défaillance **avant** le code, les rouges avant le code (D334 item 5), le harnais `neutralize-r44.py`, la lecture adverse d'ouverture et le contrôle de fin de lot. **Aucune certification, aucune marque.**

- **SHA de départ** : `ec44937` (clôture du contrôle de fin de lot de D339). `HEAD` = `origin/main` après `git fetch` (les deux = `ec449378595f8eeb8cc6cddaccfb94f8d2eddbef`), arbre propre (`git status --short` vide), aucun stash, branche `main`.
- **Numéro** : D340 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D339) ; `D340` ne figure dans aucun des quatre fichiers d'autorité (compte 0, mesuré).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; D334 item 5 ; consigne, section 0) : (1) ce fichier, SEUL ; (2) la consigne en pièce, la sortie de la lecture adverse de la consigne, l'audit de secrets scellé et son tri, **avant toute écriture d'autorité** ; (3) les `.md` d'autorité, **la section 1 de la consigne (a à d) en PREMIÈRE écriture** ; (4) le cadrage `docs/preuves/D340/cadrage.md` et les mesures qu'il cite, **commités ET POUSSÉS avant toute ligne de code** ; (5) si — et seulement si — la règle d'arrêt ne joue pas : une extension de cette table, SEULE, qui donne la liste exacte des fichiers de code et de test ; puis les pièces des rouges (sorties lues contre l'état d'avant, empreinte sha256 de chaque fichier de test joué) dans un commit **ANTÉRIEUR** au premier commit de code ; puis le code ; (6) les autres `.md` d'autorité et les pièces de clôture en dernier ; (7) le contrôle de fin de lot, écrit APRÈS la poussée.
- **Règle d'arrêt** (consigne, 3, mot pour mot en substance) : si le relevé contredit DR5 ou la tranche [L36-3] (DR8), montre un mode de défaillance que le cadrage ne sait pas garder, exige un découpage (R-5), ou pose une question qui n'a de réponse que chez Ko : la session s'arrête **sans coder**, pousse le cadrage et rapporte. Le rang reste alors **OUVERT, documentaire** (il ne compte pas, D283) et le compteur pour mémoire reste **TROIS**. **Les fichiers de code ci-dessous sont donc CONDITIONNELS** : ils n'existent que si la règle d'arrêt ne joue pas. Le rapport de fin de lot dit lesquels existent.
- **Règle des affirmations fausses** (consigne, section 0, mot pour mot) : « Si une affirmation de cette consigne est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. » La migration obéit à la sienne (consigne, section 4) : « Si ta lecture contredit la tranche : NE MIGRE PAS, rapporte l'écart (DR8) et attends. »
- Les numéros de ligne cités par la consigne (`app.module.ts:71-73`, `env.ts:150`, `schema.prisma:1438`, `quote-store.prisma.ts:322`, `schema.prisma:409`) sont **revérifiés** par la lecture adverse, pas recopiés.

## Fichiers attendus — chemins COMPLETS

### Les pièces et l'outillage (existent dans tous les cas)

| fichier | pour |
|---|---|
| `docs/preuves/D340/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D340/consigne.md` | la consigne entière du rang 44, copiée telle que reçue (consigne, 0, dernier point) |
| `docs/preuves/D340/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse (forme allégée) : chaque affirmation vérifiable de la consigne confrontée au dépôt à `ec44937`, calibré sur deux bras |
| `docs/preuves/D340/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité et restituée en entier |
| `docs/preuves/D340/audit-secrets-d340a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la consigne et de la lecture adverse |
| `docs/preuves/D340/tri-audit-d340a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D339/audit-secrets-d339f.txt`) |
| `docs/preuves/D340/mesures-cadrage.sh` | les mesures du cadrage, chaque commande imprimée avant sa sortie brute ; rejouable depuis la racine |
| `docs/preuves/D340/mesures-cadrage.txt` | sa sortie brute, versée telle quelle |
| `docs/preuves/D340/cadrage.md` | le cadrage de L36-3 (consigne 3 a à f) : le relevé du code, le transport des jetons, l'ordre des verrous, les modes de défaillance, la table des fichiers, la migration, les contrats K à nommer, la table des capacités par rôle, la taille estimée ; et, si la règle d'arrêt joue, **les questions pour Ko** |
| `docs/preuves/D340/audit-secrets-d340b.txt` | audit de secrets scellé, AVANT le commit du cadrage et des mesures |
| `docs/preuves/D340/tri-audit-d340b.txt` | son tri différentiel contre `audit-secrets-d340a.txt` |
| `docs/preuves/D340/audit-secrets-d340c.txt` | audit de secrets scellé de la clôture |
| `docs/preuves/D340/tri-audit-d340c.txt` | son tri |
| `docs/preuves/D340/aucune-valeur-reelle.txt` | le contrôle « 0 valeur réelle » (D299) de la clôture |
| `docs/preuves/D340/controle-fin-de-lot.txt` | le contrôle de fin de lot (D288, D328), écrit APRÈS la poussée |

### Pièces de CLÔTURE (existent dans tous les cas : D338 les a produites alors que la règle d'arrêt avait joué)

| fichier | pour |
|---|---|
| `docs/preuves/D340/portes/_index.txt` | l'index de la chaîne des portes : l'heure de départ, le SHA, l'état de l'arbre, l'alimentation, le code de sortie et la durée de chaque porte |
| `docs/preuves/D340/portes/typecheck.txt` | `pnpm typecheck` |
| `docs/preuves/D340/portes/lint.txt` | `pnpm lint` |
| `docs/preuves/D340/portes/test.txt` | `pnpm test` |
| `docs/preuves/D340/portes/build.txt` | `pnpm build` |
| `docs/preuves/D340/portes/test-int.txt` | `pnpm test:int` |
| `docs/preuves/D340/portes/test-e2e.txt` | `pnpm test:e2e` — PIÈCE MASQUÉE si elle porte des jetons d'une base jetable |
| `docs/preuves/D340/passe-d277/passe-d277.py` | l'instrument de la passe D277 des deux sens (texte APLATI, calibré sur deux bras) |
| `docs/preuves/D340/passe-d277/sortie-avant.txt` | sa sortie AVANT les écritures de clôture |
| `docs/preuves/D340/passe-d277/sortie-apres.txt` | sa sortie APRÈS les écritures de clôture |
| `docs/preuves/D340/passe-d277.md` | la passe écrite : chaque occurrence trouvée, traitée ou laissée, avec son motif |

### Pièces CONDITIONNELLES (leur existence dépend d'un défaut à trouver — D328)

| fichier | condition |
|---|---|
| `docs/preuves/D340/lecture-adverse/defauts-instrument.txt` | existe seulement si la première passe de l'instrument de lecture adverse révèle un défaut d'instrument |
| `docs/preuves/D340/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | existe seulement dans ce même cas : la sortie de la passe qui a montré le défaut, gardée à côté de la passe réparée (D295) |
| `docs/preuves/D340/signalements.md` | existe seulement si le cadrage ou la lecture trouve un défaut croisé à RAPPORTER (il ne se corrige pas dans ce lot) |
| `docs/preuves/D340/ecritures-base-dev.md` | existe seulement si une écriture sur la base de développement de Ko a lieu (règle permanente de D337) — **aucune n'est prévue** |
| `docs/preuves/D340/portes/test-rejeu-1.txt` | existe seulement si une porte rougit hors du lot à la clôture et que la règle R-6 de D339 s'applique (R-6 de la consigne) : le rejeu unique, versé à côté de la première passe |
| `docs/preuves/D340/portes/rejeu-etat-machine.txt` | idem : l'état machine relevé avant, pendant et après le rejeu |

### Les fichiers d'autorité (existent dans tous les cas)

| fichier | pour |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture** : la section 1 de la consigne (a à d) ; puis la section D340, le point d'entrée du rang 44, l'ordre des rangs (« RANG 44 : CLOS SUR LE CODE » ou « OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE », puis « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR »), le registre (D340) |
| `AGENTS.md` | la chaîne du compteur et des rangs (annotation, jamais de réécriture) ; un invariant du personnel et du PIN seulement si le code part |
| `ZWADJ_BACKLOG.md` | l'entrée L36-3 mise à jour ; les entrées ouvertes que le lot découvre ; **sans rang** (D302) |

### CONDITIONNELS — le code de L36-3 (n'existent que si la règle d'arrêt ne joue PAS)

Liste **prévisible** à la lecture du code, pour les fichiers EXISTANTS que le lot ne peut pas ne pas toucher ; les fichiers NEUFS (module du personnel, garde, ports, contrats, tests) n'ont pas de nom avant le cadrage : leurs chemins complets se donnent par l'**extension 1** de cette table, SEULE, **avant** le commit des rouges. Un fichier absent de cette liste et de l'extension 1 n'est pas touché.

| fichier | pour |
|---|---|
| `apps/api/prisma/schema.prisma` | la tranche [L36-3] : `staff_layer_enabled_at`, trois modèles, deux énumérations, `actor_member_id` (les garanties vivent dans la migration, D186) |
| `apps/api/test/int/migration-non-empty.int-spec.ts` | la sonde se retarge (la dernière migration change) ; une base non vide traverse la migration (D123) |
| `apps/api/src/app.module.ts` | le quatrième garde global et son rang dans la chaîne |
| `apps/api/src/config/env.ts` | le secret HMAC du PIN, exigé explicitement en production (`PROD_REQUIRED_EXPLICIT`) |
| `packages/i18n/messages/fr.json` | les messages d'erreur neufs (FR) |
| `packages/i18n/messages/ar.json` | les messages d'erreur neufs (AR), parité FR = AR |
| `neutralisation/neutralize-r44.py` | le harnais du lot (`--int` pour la base) |

### CONDITIONNELS — les pièces du code (liste exacte par l'extension 1)

| fichier | pour |
|---|---|
| `docs/preuves/D340/rouges/` | les pièces des rouges, commitées AVANT le premier commit de code (D334 item 5) |
| `docs/preuves/D340/verts/` | les sorties vertes des tests du lot |
| `docs/preuves/D340/neutralisation/` | les journaux de `neutralize-r44.py` et des campagnes touchées |
| `docs/preuves/D340/scenarios-ko.md` | les gestes de Ko (dix lignes au plus) — un lot sans écran peut n'en avoir aucun, et le rapport le dit |

(Les quatre lignes ci-dessus nomment des DOSSIERS : elles sont **l'annonce** que l'extension 1 remplacera par des chemins complets avant tout commit qui y verserait un fichier ; aucun fichier n'y entre tant que l'extension ne les a pas nommés.)

## Ce que cette table NE déclare PAS (et pourquoi)

- **Aucun fichier de test, de l'e2e, ni de module neuf n'est nommé ici** : leurs chemins complets se donnent par l'extension 1, après le cadrage, **si** le code part. Les nommer avant le cadrage serait écrire de mémoire.
- **Aucun fichier d'écran** (`apps/pro/src/…`) : les écrans sont L36-4, hors lot. Avant la première activation, l'app Pro marche exactement comme aujourd'hui (la suite e2e existante, inchangée, le mesure).
- **Aucun fichier de l'annuaire (L36-5), de la fiche client, des notifications (L36-9), de `visit_bookings`, du paiement (E3, R1)** : hors lot.
- **Les routes ADMIN** : le lot ne les touche pas (consigne 3 a).

## Extension 1 — 03/11/2026 — commitée SEULE, AVANT le versement qu'elle couvre : l'arrêt des portes, le rejeu unique (R-6), l'instrument du contrôle de fin de lot

Motif : la première passe des portes (sur batterie, arbre sans code modifié) est sortie **rouge sur deux portes** — `pnpm test` (39 échecs sur 2 paquets) et `pnpm test:e2e` (3 échecs) —, ce que les pièces déclarées plus haut ne prévoyaient pas. La consigne (section 2, R-6) renvoie à la règle R-6 de D339 : un seul rejeu complet à la main, sa règle écrite et commitée AVANT, les deux passes versées côte à côte, l'état machine relevé pendant. Les pièces ci-dessous en sortent, plus l'instrument du contrôle de fin de lot (un instrument entre au dépôt, il ne reste pas dans un scratchpad : D286).

⚠ **Numérotation des audits** : la table d'ouverture annonçait « c » pour la clôture ; l'audit « c » sert maintenant à verser la **règle du rejeu AVANT son lancement** (D298 : tout versement passe par l'audit avant son commit) ; l'audit de **clôture** s'appelle donc « d ». Rien n'est retiré de ce qui précède.

| fichier | pour |
|---|---|
| `docs/preuves/D340/portes/arret-portes.md` | l'arrêt (chiffres et signatures lues sur la sortie brute), la règle du rejeu écrite AVANT, puis le résultat |
| `docs/preuves/D340/portes/chaine-portes.sh` | le pilote de la chaîne des six portes de la première passe |
| `docs/preuves/D340/portes/rejeu-portes.sh` | le pilote du rejeu unique (`pnpm test` puis `pnpm test:e2e`), état machine toutes les 30 s |
| `docs/preuves/D340/portes/etat-machine-pendant.txt` | l'état machine de la première passe (une ligne par minute) |
| `docs/preuves/D340/portes/test-e2e-rejeu.txt` | la sortie du rejeu de l'e2e (pièce MASQUÉE si elle porte des jetons d'une base jetable) |
| `docs/preuves/D340/controle-fin-de-lot.py` | l'instrument du contrôle de fin de lot (calibré à quatre bras, familles 1 à 8) |
| `docs/preuves/D340/audit-secrets-d340d.txt` | audit de secrets scellé de la clôture |
| `docs/preuves/D340/tri-audit-d340d.txt` | son tri différentiel |
