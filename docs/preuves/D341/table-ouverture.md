# D341 — rang 44 (SUITE) — table d'ouverture

Lot : **le rang 44 continue — L36-3a-1, « la couche et son Manager », LE CODE**, sur le cadrage de D340 (`docs/preuves/D340/cadrage.md`, § 6.3) et la consigne du relecteur adoptée par Ko, collée en tête de la session (`docs/preuves/D341/consigne.md`). Lot de **CODE** par destination, méthode **RENFORCÉE** (R-3 de D340 : chemin d'identité) **sous la pause** de certification (DR1 de D336 ; R-2 de D340) : ni session adverse B, ni certification immédiate ; restent dus les rouges avant le code (D334 item 5), le harnais `neutralize-r44.py`, la lecture adverse de la consigne et le contrôle de fin de lot. **Aucune certification, aucune marque.** Compteur pour mémoire : TROIS → QUATRE à la clôture. **Aucun écran dans ce lot** : les gestes de Ko sont vides, et le rapport le dit.

- **SHA de départ** : `e40c141` (clôture du contrôle de fin de lot de D340). `HEAD` = `origin/main` après `git fetch` (les deux = `e40c14150881716448afc0a94334556370641716`, `git rev-list --left-right --count HEAD...origin/main` = `0 0`), arbre propre (`git status --short` vide), aucun stash, branche `main`. Poste **sur secteur** à l'ouverture (`PowerLineStatus` = `Online`, `BatteryStatus` = 2), démon Docker répondant, conteneur `zwadj-db` « Up ».
- **Numéro** : D341 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D340) ; `D341` ne figure dans aucun des quatre fichiers d'autorité (compte 0, mesuré sur le texte aplati).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; D334 item 5 ; consigne, section 0 ; R-7) : (1) ce fichier, SEUL ; (2) la consigne en pièce, la sortie de la lecture adverse de la consigne, l'audit de secrets scellé et son tri, **avant toute écriture d'autorité** ; (3) les `.md` d'autorité, **la section 1 de la consigne (a, b) en PREMIÈRE écriture**, avec les décisions du relecteur R-1 à R-10 ; (4) une extension de cette table, SEULE, **avant** tout versement qu'elle déclare ; (5) les rouges — fichiers de test et pièces (sorties lues contre l'état d'avant, empreinte sha256 de chaque fichier de test joué) — dans un commit **ANTÉRIEUR** au premier commit de code ; (6) **le premier commit de code est SIG-1, SEUL** (R-7 : une ligne d'`apps/api/src/app.module.ts`, avant tout cookie neuf), puis le reste du code ; (7) le harnais `neutralisation/neutralize-r44.py` et ses journaux ; (8) les pièces de clôture, puis les autres `.md` d'autorité **en dernier** ; (9) le contrôle de fin de lot, écrit APRÈS la poussée.
- **Règle des affirmations fausses** (consigne, section 0, mot pour mot) : « Si une affirmation de cette consigne est fausse contre le dépôt, tu t'arrêtes et tu le dis ; tu ne l'adaptes pas seul. » La migration obéit à la sienne (consigne, section 3, mot pour mot) : « Si ta lecture contredit la tranche, 1 a ou 1 b : NE MIGRE PAS, rapporte l'écart (DR8) et attends. »
- **Règle de la batterie** (consigne, section 0 ; R-9 de D340, `AGENTS.md`) : un poste sur batterie au moment d'une porte de clôture ⇒ la porte n'est pas lancée, la session s'arrête et le dit. Le pilote `docs/preuves/D340/portes/passe-secteur.sh` (R-10) est employé tel quel pour les portes de clôture ; il refuse aussi si Docker ou la base sont absents, si un port d'e2e est occupé, ou si l'arbre n'est pas propre.
- Les numéros de ligne et les citations que la consigne et le cadrage portent (`app.module.ts:71-73`, `auth.controller.ts:223`, `ZWADJ_CONTINUITE.md:2129-2133`, les articles du cadrage cités par numéro) sont **revérifiés** par la lecture adverse, pas recopiés.

## La liste des mots de passe courants (R-5) — source, licence et empreinte, écrites ICI

| champ | valeur |
|---|---|
| source | dépôt public `danielmiessler/SecLists` (<https://github.com/danielmiessler/SecLists>), fichier `Passwords/Common-Credentials/10k-most-common.txt` |
| version | commit `4afe4d3de0a5d227c59ae2f162d22b93b4c27bfd` (HEAD distant relevé par `git ls-remote` le 04/11/2026) ; le fichier téléchargé depuis `master` et celui téléchargé à ce commit ont **les mêmes octets** (mesuré) |
| licence | **MIT**, « Copyright (c) 2018 Daniel Miessler » — texte du fichier `LICENSE` du même commit, 1 072 octets, sha256 `3dbdc93d5f8829de0941744841730a09c106d0732e5ae0e98ca1d77be7ded66c` ; le `README.md` du dépôt dit « This project is licensed under the MIT license ». La licence MIT autorise copie et redistribution **à condition que l'avis de droit d'auteur et le texte de permission accompagnent les copies** : ils sont versés à côté de la liste et reproduits dans l'en-tête du module généré |
| sha256 du fichier source | `68782d6a4a19a4768d5f15dd66bd534e7a33055cc755411e33f16d18c50fdcce` (73 026 octets, fins de ligne LF) |
| entrées | **10 001** lignes, toutes distinctes, également distinctes après mise en minuscules, ASCII seul, aucune vide (mesuré) — au-dessus du seuil de R-5 (10 000) |
| comparaison | après mise en **minuscules** (R-5) : le candidat est mis en minuscules, la liste l'est aussi |
| ce que la licence NE dit PAS | la licence est celle du **dépôt** ; elle ne documente pas l'origine des données de ce fichier. Écrit pour ne pas se lire comme établi : l'origine des mots n'est pas relevée |
| ce que la liste ajoute au schéma actuel | **340** des 10 001 entrées passent déjà `passwordSchema` (≥ 8 caractères, une lettre, un chiffre) ; les 9 661 autres sont refusées avant la liste. La liste n'ajoute donc que **340 refus** à la règle d'aujourd'hui (mesuré sur le fichier) |

## Fichiers attendus — chemins COMPLETS

### Les pièces et l'outillage (existent dans tous les cas)

| fichier | pour |
|---|---|
| `docs/preuves/D341/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D341/consigne.md` | la consigne entière du rang 44 (suite), copiée telle que reçue (consigne, section 0, dernier point) |
| `docs/preuves/D341/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse (forme allégée) : chaque affirmation vérifiable de la consigne confrontée au dépôt à `e40c141`, calibré sur deux bras |
| `docs/preuves/D341/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité et restituée en entier |
| `docs/preuves/D341/audit-secrets-d341a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la consigne et de la lecture adverse |
| `docs/preuves/D341/tri-audit-d341a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D340/audit-secrets-d340f.txt`) |
| `docs/preuves/D341/liste-mots-de-passe/LISEZ-MOI.md` | la provenance de la liste (R-5) : source, commit, licence, empreintes, comptes, ce qu'elle ajoute au schéma, le rejeu du générateur |
| `docs/preuves/D341/liste-mots-de-passe/10k-most-common.txt` | la liste, **octet pour octet** (73 026 octets) — c'est elle que l'empreinte ci-dessus désigne |
| `docs/preuves/D341/liste-mots-de-passe/LICENSE-SecLists-MIT.txt` | l'avis de licence MIT, octet pour octet (1 072 octets) |
| `docs/preuves/D341/liste-mots-de-passe/generer-liste.py` | le générateur de `apps/api/src/staff/staff-common-passwords.ts` à partir de la liste ; procédure archivée comme PREUVE, jamais promue en instrument (D291) |
| `docs/preuves/D341/carte-modes-de-defaillance.md` | la carte des modes de défaillance du lot (MP-… du § 4 du cadrage) vers leur test et leur cible de neutralisation ; un mode absent du § 4 ne s'y trouve pas (D126) |
| `docs/preuves/D341/mesure/LISEZ-MOI.md` | la mesure demandée (« le coût de la lecture du drapeau par requête Pro », limite 6 du cadrage), sans budget : procédure, état machine, résultats AVANT et APRÈS |
| `docs/preuves/D341/mesure/mesure-lecture-drapeau.int-spec.ts` | le script de mesure (archivé comme PREUVE, jamais promu en test) ; il n'asserte aucune durée |
| `docs/preuves/D341/mesure/vitest.mesure.config.ts` | la configuration qui le joue (dérivée de `apps/api/vitest.config.int.ts`) |
| `docs/preuves/D341/mesure/mesure-avant.txt` | sa sortie AVANT le code du lot (état machine relevé), à `e40c141` |
| `docs/preuves/D341/mesure/mesure-apres.txt` | sa sortie APRÈS le code du lot, même procédure, même poste |
| `docs/preuves/D341/derive-prisma.txt` | la sortie de la sonde de dérive de D334 (`prisma migrate diff` sur la base migrée), rejouée sans modification (MP-42) |
| `docs/preuves/D341/audit-secrets-d341b.txt` | audit de secrets scellé, AVANT le commit des rouges |
| `docs/preuves/D341/tri-audit-d341b.txt` | son tri différentiel contre `audit-secrets-d341a.txt` |
| `docs/preuves/D341/audit-secrets-d341c.txt` | audit de secrets scellé, AVANT le commit des pièces de neutralisation et des verts |
| `docs/preuves/D341/tri-audit-d341c.txt` | son tri différentiel contre `audit-secrets-d341b.txt` |
| `docs/preuves/D341/audit-secrets-d341d.txt` | audit de secrets scellé de la clôture |
| `docs/preuves/D341/tri-audit-d341d.txt` | son tri différentiel contre `audit-secrets-d341c.txt` |
| `docs/preuves/D341/aucune-valeur-reelle.txt` | le contrôle « 0 valeur réelle » (D299) de la clôture |
| `docs/preuves/D341/passe-d277.md` | la passe D277 des DEUX sens, écrite |
| `docs/preuves/D341/passe-d277/passe-d277.py` | son instrument (texte APLATI, calibré sur deux bras) |
| `docs/preuves/D341/passe-d277/sortie-avant.txt` | sa sortie AVANT les écritures de clôture |
| `docs/preuves/D341/passe-d277/sortie-apres.txt` | sa sortie APRÈS les écritures de clôture |
| `docs/preuves/D341/controle-fin-de-lot.txt` | le contrôle de fin de lot (D288, D328, D334 item 5), écrit APRÈS la poussée |
| `docs/preuves/D341/controle-fin-de-lot.py` | son instrument (COPIE de `docs/preuves/D340/controle-fin-de-lot.py`, seuls les SHA et les noms changent ; calibré à chaque lancement) |

### Les pièces du code (chemins complets ; les journaux de campagnes sont déclarés par extension, leur nombre dépendant de l'union calculée)

| fichier | pour |
|---|---|
| `docs/preuves/D341/rouges/LISEZ-MOI.md` | comment les rouges ont été joués et lus (patron de `docs/preuves/D339/rouges/LISEZ-MOI.md`) |
| `docs/preuves/D341/rouges/empreintes-fichiers-de-test.txt` | l'empreinte sha256 de CHAQUE fichier de test joué (D334 item 5) |
| `docs/preuves/D341/rouges/lire-rouges.py` | le lecteur des rouges (COPIE de `docs/preuves/D336/rouges/lire-rouges.py`, calibrée à deux bras à chaque lancement) ; procédure archivée comme PREUVE |
| `docs/preuves/D341/rouges/lecture-rouges.txt` | sa sortie : chaque test en échec, sa première ligne d'erreur, sa classe (assertion, exécution, collecte) |
| `docs/preuves/D341/rouges/rouge-api-unitaire.txt` | les rouges unitaires de l'API, lus contre l'état d'avant |
| `docs/preuves/D341/rouges/rouge-integration.txt` | les rouges d'intégration (PostgreSQL réel), lus contre l'état d'avant |
| `docs/preuves/D341/rouges/rouge-api-client.txt` | les rouges du client d'API, lus contre l'état d'avant |
| `docs/preuves/D341/verts/vert-api-unitaire.txt` | les tests du lot, au vert |
| `docs/preuves/D341/verts/vert-integration.txt` | idem |
| `docs/preuves/D341/verts/vert-api-client.txt` | idem |
| `docs/preuves/D341/portes/_index.txt` | l'index de la passe sur secteur : heure de départ, SHA, état de l'arbre, alimentation, code de sortie et durée de chaque porte |
| `docs/preuves/D341/portes/typecheck.txt` | `pnpm typecheck` |
| `docs/preuves/D341/portes/lint.txt` | `pnpm lint` |
| `docs/preuves/D341/portes/test.txt` | `pnpm test` |
| `docs/preuves/D341/portes/build.txt` | `pnpm build` |
| `docs/preuves/D341/portes/test-int.txt` | `pnpm test:int` |
| `docs/preuves/D341/portes/test-e2e.txt` | `pnpm test:e2e` — PIÈCE MASQUÉE si elle porte des jetons de vérification d'e-mail d'une base jetable |
| `docs/preuves/D341/portes/etat-machine-pendant.txt` | l'état machine de la passe (une ligne toutes les 30 s) |
| `docs/preuves/D341/portes/FIN` | le marqueur de fin que écrit le pilote (une ligne) |

### Pièces CONDITIONNELLES (leur existence dépend d'un défaut ou d'un cas — D328)

| fichier | condition |
|---|---|
| `docs/preuves/D341/lecture-adverse/defauts-instrument.txt` | existe seulement si la première passe de l'instrument de lecture adverse révèle un défaut d'instrument |
| `docs/preuves/D341/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | existe seulement dans ce même cas : la sortie de la passe qui a montré le défaut, gardée à côté de la passe réparée (D295) |
| `docs/preuves/D341/signalements.md` | existe seulement si le code ou la lecture trouve un défaut croisé à RAPPORTER (il ne se corrige pas dans ce lot) |
| `docs/preuves/D341/ecritures-base-dev.md` | existe seulement si une écriture sur la base de développement de Ko a lieu (règle permanente de D337) — **aucune n'est prévue** : `test:int` et l'e2e travaillent sur leurs propres bases, et la migration n'est jamais appliquée à `zwadj` par ce lot |
| `docs/preuves/D341/portes/rejeu-*` | existent seulement si une porte rougit hors du lot à la clôture et que la règle R-6 de D339 s'applique |
| `docs/preuves/D341/portes/arret-*` | idem : la pièce de l'arrêt et la lecture du rouge (répartition par fichier, première ligne de chaque bloc d'échec) |
| `docs/preuves/D341/neutralisation/` (chemins complets par extension) | les journaux de `neutralize-r44.py` et des campagnes que le tri de `lancer-campagnes.py` retient : leur liste dépend du `git diff` final |

### Les fichiers d'autorité (existent dans tous les cas)

| fichier | pour |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture** : la section 1 de la consigne (a, b — par adoption) et les décisions du relecteur R-1 à R-10, écrites comme telles ; la table recopiée à l'identique (D328 point 3) ; puis, EN DERNIER, la section D341, le point d'entrée du rang 44, l'ordre des rangs (« RANG 44 : CLOS SUR LE CODE », puis « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR »), le registre (D341), la rubrique « Patrons », la passe D277 |
| `ZWADJ_BACKLOG.md` | les entrées que le lot découvre ; la fermeture de SIG-1 ; l'état de l'entrée du recours administrateur d'un Manager seul ; **sans rang** (D302) |
| `AGENTS.md` | la chaîne du compteur et des rangs (annotation, jamais de réécriture) ; l'invariant de la couche du personnel ; la contrainte de mise en service de `SameSite=Strict` (R-2) |

### La migration, le schéma, les contrats (CODE)

| fichier | pour |
|---|---|
| `apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql` | **toute la tranche [L36-3]** (une seule migration, les colonnes de PIN comprises : le lot 3b n'aura aucun schéma à changer) avec la nullabilité du § 5.2 du cadrage et les six garanties du § 5.3 (1 a, 1 b) ; écrite à la main (D186), testée sur base non vide (D123). **Elle ne s'écrit que si la lecture ne contredit ni la tranche ni 1 a ni 1 b** |
| `apps/api/prisma/schema.prisma` | trois modèles, trois énumérations, `ProProfile.staffLayerEnabledAt`, `AuditLog.actorMemberId` (les garanties vivent dans la migration, D186) |
| `apps/api/test/int/migration-non-empty.int-spec.ts` | la sonde se retarge (la dernière migration change) ; une base non vide traverse la migration (D123) |
| `packages/types/src/staff.ts` | les codes d'erreur, les schémas Zod (activation, connexion, changement de mot de passe), les DTO, les constantes de durée (UN levier, MP-43), la table des rôles |
| `packages/types/src/staff-account-name.ts` | le normaliseur du nom de compte (S-110 + R-4) : UNE fonction partagée |
| `packages/types/src/index.ts` | l'export des deux modules |

### Le module du personnel (CODE)

| fichier | pour |
|---|---|
| `apps/api/src/staff/staff.module.ts` | le module (contrôleur, service, port du magasin, garde exporté) |
| `apps/api/src/staff/staff-session.controller.ts` | K-14 à K-18 : activer, se connecter, se déconnecter, l'état, changer son mot de passe |
| `apps/api/src/staff/staff-session.service.ts` | l'orchestration : politiques pures, hachage, jetons, magasin |
| `apps/api/src/staff/staff-session.guard.ts` | le quatrième garde global, fermé par défaut |
| `apps/api/src/staff/staff-decorators.ts` | `@StaffExempt()`, `@CurrentStaff()`, le contexte posé sur la requête |
| `apps/api/src/staff/staff-cookies.ts` | module pur : noms, attributs, lecture bornée des cookies d'appareil |
| `apps/api/src/staff/staff-store.types.ts` | le port du magasin et ses lignes |
| `apps/api/src/staff/staff-store.prisma.ts` | l'adaptateur : réservation atomique, activation, session, audit |
| `apps/api/src/staff/staff-session-policy.ts` | module pur : décisions de connexion, de session, du garde, choix de l'appareil |
| `apps/api/src/staff/staff-password-policy.ts` | module pur : mot de passe courant, réutilisé |
| `apps/api/src/staff/staff-common-passwords.ts` | la liste (R-5), module GÉNÉRÉ par `generer-liste.py`, avec l'avis de licence dans son en-tête |

### Le câblage (CODE)

| fichier | pour |
|---|---|
| `apps/api/src/app.module.ts` | **premier commit de code, SEUL : SIG-1** (R-7) — la rédaction de `res.headers["set-cookie"]` ; puis, plus tard, le module du personnel et le quatrième garde global |
| `apps/api/src/auth/auth.throttle.ts` | les clés `staffActivate` et `staffLogin` (le même levier, D128 ; MP-36) |
| `apps/api/src/auth/auth.controller.ts` | `@StaffExempt()` sur `GET /auth/me` |
| `apps/api/test/int/setup-env.ts` | les leviers de test des deux clés neuves (le même mécanisme que les autres) |
| `apps/api/test/int/throttle.int-spec.ts` | la preuve du 429 des deux clés neuves (MP-36) |
| `packages/api-client/src/staff-client.ts` | K-14 à K-18, chemins écrits EN TOUTES LETTRES dans chaque appel à `request(...)` (D182) |
| `packages/api-client/src/index.ts` | l'export |
| `packages/i18n/messages/fr.json` | les messages d'erreur et de validation neufs (FR), dont le message de R-3 mot pour mot |
| `packages/i18n/messages/ar.json` | les messages neufs (AR), parité FR = AR |

### Les tests et le harnais

| fichier | pour |
|---|---|
| `apps/api/src/staff/staff-session-policy.spec.ts` | les décisions pures : connexion (réel / factice), refus de session (inactivité, plafond, membre désactivé, autre salle), garde (rôle, exemption, couche), choix de l'appareil |
| `apps/api/src/staff/staff-password-policy.spec.ts` | mot de passe courant (minuscules), réutilisé ; **fidélité de la liste à sa source** (octets, empreinte, 10 001 entrées) |
| `apps/api/src/staff/staff-cookies.spec.ts` | tous les attributs, `Secure` suit `AUTH_COOKIE_SECURE`, bornes de lecture (8) |
| `apps/api/src/staff/staff-session.guard.spec.ts` | le garde avec un double du port : l'ordre des sorties, aucune lecture au-delà du drapeau quand la couche est éteinte |
| `apps/api/src/staff/staff-session.service.spec.ts` | le service avec des doubles : **espions sur le nombre de vérifications argon2** (réelle / factice), la réponse identique, l'ordre des appels |
| `apps/api/src/staff/staff-store.prisma.spec.ts` | les requêtes de l'adaptateur (`WHERE`, ordre, paramètres), l'unique site d'écriture de l'audit |
| `apps/api/src/staff/staff-source-guards.spec.ts` | gardes de SOURCE : aucun `new Date()` dans les services du personnel (MP-41), aucun littéral de durée hors du module partagé (MP-43), aucun journal ne reçoit un secret (MP-11), le garde est le quatrième |
| `apps/api/src/common/staff-account-name.spec.ts` | la table de cas FR/AR : au moins 12 paires équivalentes, au moins 6 paires distinctes (MP-9, S-110, R-4) |
| `apps/api/src/common/staff-contract.spec.ts` | les schémas Zod, les durées, chaque code d'erreur ↔ une clé des DEUX catalogues, le message de R-3 mot pour mot (FR = AR en parité) |
| `apps/api/test/int/staff-helpers.ts` | aides des specs du personnel (compte pro vérifié, activation, lecture des cookies posés, vieillissement SQL) |
| `apps/api/test/int/route-collector.ts` | le collecteur de routes dérivé du routeur (COPIE de la logique de `rbac-all-routes.int-spec.ts`, D119 : ce fichier-là n'est pas modifié) |
| `apps/api/test/int/log-capture.ts` | l'application de test dont le journal des requêtes est CAPTURÉ (options réelles de l'`AppModule`, destination remplacée par un flux) |
| `apps/api/test/int/log-set-cookie.int-spec.ts` | **SIG-1** : la garde qui lit la sortie réelle du journal de l'application Nest démarrée (R-7) |
| `apps/api/test/int/staff-activation.int-spec.ts` | K-14 : activation, concurrence ×10, e-mail non vérifié, audit, un seul Manager |
| `apps/api/test/int/staff-login.int-spec.ts` | K-15 à K-17 : connexion, pause de 5 échecs (20 parallèles), réponse identique à l'octet, plafond et inactivité par vieillissement SQL |
| `apps/api/test/int/staff-session-guard.int-spec.ts` | le garde : dérivé du routeur (toutes les routes atteignables par un PRO), couche activée en cours de session, autre salle, membre désactivé, jeton rejoué, ADMIN et CLIENT, avant l'activation rien ne change |
| `apps/api/test/int/staff-password.int-spec.ts` | K-18 : changement, fin des AUTRES sessions, courant, réutilisé, compteur partagé |
| `apps/api/test/int/staff-schema.int-spec.ts` | la migration en SQL direct : chaque `CHECK` de 1 b, l'unicité du nom normalisé, `ON DELETE SET NULL` de l'audit |
| `packages/api-client/src/staff-client.test.ts` | les chemins et méthodes de K-14 à K-18 |
| `neutralisation/neutralize-r44.py` | le harnais du lot (`--int` pour la base) |

### Fichiers CONDITIONNELS — modifiés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `apps/api/test/int/contract-api-client.int-spec.ts`, `apps/api/test/int/rbac-all-routes.int-spec.ts` | seulement si leur lecture des routes ou de la liste blanche ne suit pas les routes neuves sans retouche |
| `neutralisation/neutralize-r33.py`, `neutralisation/neutralize-r38.py`, `neutralisation/neutralize-r39.py` | le tri des campagnes (`lancer-campagnes.py`) périme une ancre des catalogues `fr.json` / `ar.json` : l'ancre se répare, par extension, avant son commit. La liste est une PRÉVISION ; le tri en donne la liste exacte |
| tout autre harnais de `neutralisation/` | même condition |
| `apps/api/src/auth/auth.service.ts` | seulement si le lot a besoin d'une lecture qu'il n'expose pas (rien n'est prévu : le magasin du personnel lit `users` lui-même) |
| tout autre fichier de test ou double qui construit un objet dont le type change | le typecheck les relève ; chacun est déclaré par extension, en chemin complet, avant son commit |

## Ce que cette table NE déclare PAS (et pourquoi)

- **Hors lot (consigne, section 3)** : L36-3a-2 (création, liste, réinitialisation, désactivation, capacités, audit des fiches, S-107), L36-3b (le PIN), L36-4 (les écrans), le recours administrateur d'un Manager seul (backlog), l'annuaire, les notifications, Q4 (b), l'enquête D265, la garde des sorties console, NB-6. **Aucun** fichier d'écran (`apps/pro/src/…`, `apps/client/src/…`), de l'e2e (`e2e/…`), de l'annuaire, des notifications, de la fiche client, de `visit_bookings`, du paiement (E3, R1).
- **Les routes ADMIN** : le lot n'y touche pas, et le garde ne s'applique pas à `ADMIN` (cadrage, § 1).
- **`apps/api/src/config/env.ts`** : « pas de variable en 1 » (cadrage, § 5.5) — le secret HMAC du PIN est du lot 3b.
- **Le diff final** (`git diff e40c141..HEAD --name-only`) doit rester inclus dans cette table, extensions comprises ; un fichier hors table est un incident, pas une omission.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, **AVANT** le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*
