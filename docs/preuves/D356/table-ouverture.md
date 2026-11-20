# D356 — rang 58 — table d'ouverture

Lot : **L36-3b, le PIN, côté serveur — le PIN tiré par un générateur cryptographique, haché par HMAC-SHA-256 avec un secret HORS base, rendu UNE fois ; trois essais par un compteur ATOMIQUE réservé avant la vérification ; verrouillage au troisième ÉCHEC ; déblocage seulement par nom de compte et mot de passe, qui génère un PIN neuf ; expiration à 90 jours ; connexion par PIN (K-23) ; le PIN effacé par la réinitialisation et la désactivation ; le journal des actions du PIN ; la ligne `quote.promote` qui porte le membre** — consigne du relecteur « RANG 58 — L36-3b : LE PIN, CÔTÉ SERVEUR » du 20/11/2026, adoptée par Ko telle quelle (`docs/preuves/D356/consigne.md`, versée dans le commit suivant). Lot de **CODE**, **chemin d'identité**, méthode **RENFORCÉE** (R-3 de D340), sous la pause de certification (Ko, 22/10/2026) ; il **compte** (D283) : compteur POUR MÉMOIRE TRENTE-SEPT → TRENTE-HUIT à la clôture.

- **SHA de départ** : `b54e383d31e763adbdbb4bf46fff4250c992af65` (clôture de D355). `HEAD` = `origin/main` après `git fetch` (les deux sur ce SHA), arbre propre (`git status --porcelain` : 0 ligne), aucun stash (0 ligne), branche `main`. Branches distantes gardées, relevées : `origin/front-client`, `origin/integration-45`, `origin/par-carte`.
- **Numéro** : D356 — pris en lisant le registre de `ZWADJ_CONTINUITE.md` : 310 lignes `| Dnnn |` (expression `^\| D(\d+) \|`), dernier numéro **355** ; `D356` ne figure dans aucun des quatre fichiers d'autorité (compte 0 sur le texte APLATI : 0, 0, 0, 0 ; caractères aplatis examinés : 4 783 269 ; calibré sur `D355`, qui rend 253, 14, 15 et 0). **S-269** est le premier numéro de décision de la session (le plus grand `S-nnn` relevé est S-268, 1 272 occurrences examinées ; S-269 : 0 occurrence ; calibré sur `S-268`, qui rend 8, 0, 1 et 0). S-252 à S-268 (D355) sont ratifiées par adoption (consigne, § 1 c).
- **Reprise (consigne, § 0), relevée avant toute écriture** : rang 57 CLOS (D355) ; compteur POUR MÉMOIRE TRENTE-SEPT ; « RANG 58 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat : L36-3b, le PIN) ; `origin/main` = `b54e383` ; arbre propre, sans stash, sur `main` ; **aucun écart**. Lus : `CLAUDE.md` et `AGENTS.md` (importés, en entier), `ZWADJ_CONTINUITE.md` (le bloc « ÉTAT À LA CLÔTURE DU RANG 57 », la section D355, l'ordre des rangs, le registre, le bloc DR1 à DR8 — DR5 en entier —, le bloc d'arbitrage du rang 44 avec R-1 à R-10 de D341), `docs/preuves/D340/cadrage.md` EN ENTIER (§ 4 : MP-1, MP-2, MP-3, MP-10, MP-11, MP-12, MP-15, MP-26, MP-27, MP-28, MP-33, MP-36, MP-39, MP-41, MP-43 ; § 5.1 : K-14, K-15, K-18, K-23 ; § 5.5 : les fichiers « P » ; § 6.3 ; § 9 points 7 et 8).
- **Poste à l'ouverture** (20/11/2026, 18:56) : **sur secteur** (`BatteryStatus` = 2, `PowerLineStatus` = Online, charge 100 %), RAM libre 3 749 Mo sur 16 095 Mo, `chrome` 9 (le navigateur de Ko), `headless_shell` 0, `node` 0, Docker 29.8.0 lancé (`zwadj-db` « Up 6 hours », port 5432), ports 3100, 3101, 5273 et 5274 libres. ⚠ La barre de RAM de D273 (4 579 Mo) est un critère de **certification**, en pause : elle n'est pas appliquée à des portes ordinaires, et ce relevé est noté pour que personne ne le lise comme tel. Sur batterie au moment d'une porte de clôture : aucune porte ne se lance (R-9 de D340).
- **Ce que la consigne décide** (texte complet dans `consigne.md`) : **1 a** — rang 58 = L36-3b, méthode RENFORCÉE, la certification immédiate reste suspendue par la pause de Ko ; **1 b** — les contrats d'API autorisés par l'adoption de ce message, et eux seuls : K-23 (`POST /pro/staff/pin-login`, `{ memberId, pin }` + cookie d'appareil) ; les réponses de K-14, K-15 et K-18 (« si le cadrage le dit ») amendées pour rendre le PIN UNE fois (`Cache-Control: no-store`) ; K-21 et K-22 amendées pour effacer le PIN ; chacun dans `packages/api-client`, chemin en toutes lettres (D182) ; **1 c** — S-252 à S-268 ratifiées par adoption, le rejeu unique de la porte `test` accepté ; **1 d** — la liste du « Journal » de DR5 est limitative pour ce qui s'AJOUTE, mais toute ligne d'audit QUI EXISTE DÉJÀ et qu'une action de personnel écrit porte `actor_member_id` : `quote.promote` le reçoit dans ce lot (R-6) ; **1 e** — l'intermittence d'amorçage des tests d'intégration dort, avec son piège (si elle revient : trace complète versée, piste essayée sur une COPIE hors du dépôt, rien commité dans la configuration). **R-1** aucune migration, une colonne qui manque ⇒ ARRÊT (DR8) ; **R-2** le secret HMAC suit le précédent du secret JWT (variable OBLIGATOIRE partout, `min(32)`, sans défaut, dans `PROD_REQUIRED_EXPLICIT`, démarrage refusé avec un message qui NOMME la variable ; `.env.example` reçoit le NOM seul ; les tests posent leur valeur jetable ; **aucun `.env` n'est lu**, la présence du NOM seul est comptée) ; **R-3** la connexion par PIN réutilise le contrôle de D355 (la session ne s'ouvre que si, sous verrou, le PIN haché, `pin_locked_at` nul, le membre actif et l'appareil vivant sont toujours ceux de la vérification), quatre courses mesurées sur PostgreSQL réel par entrelacement forcé (PIN ‖ PIN, PIN ‖ réinitialisation, PIN ‖ désactivation, PIN ‖ déblocage par mot de passe), le refus à la même forme et au même coût quelle qu'en soit la cause ; **R-4** `etatDuCompte` porte aussi l'état du PIN (absent, valide, expiré, verrouillé), UNE copie de la règle ; **R-5** le journal du PIN (connexion, échec, verrouillage, déblocage) dans la transaction, `actor_member_id` renseigné, aucun PIN ni haché dans la ligne, mesuré sur le journal réel ; la carte du journal de DR5 de D355 mise à jour additivement ; **R-6** `quote.promote` porte `actor_member_id`, la promotion ne change pas (sinon ARRÊT) ; **R-7** aucun écran, rien dans `apps/pro` ni `apps/client`, aucun montant, aucun code d'erreur neuf sauf si le cadrage en nomme un pour le PIN (alors FR ET AR sous la parité) ; **R-8** hors lot : les écrans (L36-4), le recours d'un Manager seul, la réactivation et le changement de rôle, l'intermittence.
- **Relevé du code, par lecture, avant d'écrire** : **(a) aucun PIN n'existe dans le code** — dans `apps/api/src/staff/`, hors specs et hors la liste des mots de passe courants, le mot `pin` n'apparaît que dans des commentaires et dans `PIN_VALIDITY_DAYS` ; `STAFF_PIN` et `HMAC` n'apparaissent dans aucun fichier TypeScript, JSON ou `.env*` de `apps/`, `packages/` et `e2e/`. **(b) les colonnes existent** : la migration `20261104170000_staff_layer` porte `pin_hash`, `pin_generated_at`, `pin_expires_at`, `pin_failed_count` (`NOT NULL DEFAULT 0`, `CHECK … BETWEEN 0 AND 3`), `pin_locked_at`, et `pro_staff_members_pin_triple_coherent` (les trois premières nulles ou toutes non nulles) : **aucune migration n'est nécessaire** (R-1). **(c) le point d'entrée du PIN existe déjà** : `OpenSessionInput.expectedPasswordHash` et le check-and-set d'`openSession` (`apps/api/src/staff/staff-store.prisma.ts`, ligne 221 et suivantes) sont écrits pour que le PIN « ouvre ses sessions par ce même appel et y ajoute SA preuve » (D355, R-1) ; `etatDuCompte` (`staff-account-state.ts`) ne dit rien du PIN. **(d) le précédent d'un secret** : `JWT_ACCESS_SECRET: z.string().min(32, …)` sans défaut (`apps/api/src/config/env.ts`, ligne 21), `PROD_REQUIRED_EXPLICIT` (ligne 150) ; les tests d'intégration lisent `apps/api/.env` par `import "dotenv/config"` (`test/int/setup-env.ts`) — c'est pourquoi la valeur jetable du secret s'y pose en toutes lettres ; le serveur d'API de l'e2e reçoit son environnement de `e2e/playwright.config.ts` (ligne 167). **(e) quatre routes exemptées** du garde (`@StaffExempt()` : `auth.controller.ts:132` et `staff-session.controller.ts:58, 74, 91`) : `pin-login` sera la **cinquième**, et la liste fermée est confrontée au routeur par `staff-session-guard.int-spec.ts` et comptée dans les sources par `staff-source-guards.spec.ts` — deux tests EXISTANTS qui changent (leçon de S-264 : la lecture adverse CHERCHE les tests existants qui comptent ce que le lot change). **(f) `quote.promote`** : `quote-store.prisma.ts` (ligne 323) écrit `auditLog.create` SANS `actorMemberId` (S-260) ; la chaîne contrôleur → service → port n'a pas de membre. **(g) fins de ligne**, relevées en OCTETS : `apps/api/src/staff/*`, `packages/types/src/staff.ts`, `packages/api-client/src/staff-client.ts`, `apps/api/src/common/staff-contract.spec.ts`, `apps/api/test/int/staff-*.int-spec.ts` et `staff-helpers.ts` sont en LF ; `apps/api/src/venues/*`, `config/env.ts`, `config/env.spec.ts`, `auth/auth.throttle.ts`, `apps/api/test/int/setup-env.ts`, `throttle.int-spec.ts`, `row-lock.ts`, `e2e/playwright.config.ts`, `apps/api/.env.example`, `packages/i18n/messages/*.json` et les trois `.md` d'autorité sont en CRLF ; chaque fichier garde la sienne (vérifiée en octets après chaque édition).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 et D334 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) la consigne en pièce, la règle des portes (écrite et commitée AVANT les passes), la sortie de la lecture adverse de la consigne ET du cadrage contre le dépôt, la carte du journal de DR5 mise à jour et le premier audit de secrets avec son tri — **avant tout `.md` d'autorité et avant tout code** ; (3) **les pièces des rouges** (sorties lues contre l'état d'avant, avec l'empreinte sha256 de chaque fichier de test joué) dans un commit **ANTÉRIEUR au premier commit de code** (D334, item 5) ; (4) le code et ses tests ; (5) le harnais, les campagnes, les portes ; (6) les trois `.md` d'autorité, **l'arbitrage de Ko en première écriture** ; (7) le contrôle de fin de lot, push puis fetch. Toute extension de cette table : un commit propre, **avant** le commit du fichier qu'elle couvre.
- **Règle d'arrêt** (consigne, § 0, R-1, R-6) : un écart à la reprise ⇒ arrêt, et le dire. Une colonne qui manquerait ⇒ ARRÊT, rapport (DR8). La promotion d'un devis qui devrait changer autrement que par sa ligne d'audit ⇒ ARRÊT (D316, par la fonction).
- **Écrit pour ne pas se lire comme tenu** : cette table dit ce que le lot **prévoit** de toucher. Elle ne dit pas qu'un PIN existe, qu'une garde mord ou qu'une course est tenue : chacun se **mesure** (rouge d'abord, neutralisation ensuite) et se rapporte avec ses chiffres. ⚠ Plusieurs choix que la consigne et le cadrage ne fixent pas — où le verrou se pose, ce que K-18 rend, comment le secret se lie au membre, les noms des actions du journal, la forme des messages de validation — sont des **propositions de la session** : elles s'écriront en décisions S-269 et suivantes, **à ratifier**, avec ce qu'elles changent pour Ko.

## A. Le départ

Voir les puces ci-dessus (SHA, numéro, reprise, poste, relevé du code). Aucun fichier n'est modifié à l'ouverture : ce fichier est le premier commit du lot.

## B. Les fichiers de CE lot — chemins COMPLETS

**Le contrat** (`@zwadj/types`, le client d'API, les catalogues) — le levier (longueur et nombre d'essais), l'état du PIN, le schéma de K-23, les réponses de K-14, K-15 et K-18, K-23 dans le client :

```
packages/types/src/staff.ts
packages/api-client/src/staff-client.ts
packages/api-client/src/staff-client.test.ts
packages/i18n/messages/fr.json
packages/i18n/messages/ar.json
apps/api/src/common/staff-contract.spec.ts
```

**Les modules purs et leurs specs** (D187 : une garde du chemin d'identité vit dans un module sans dépendance) — le générateur et la liste fermée des PIN triviaux ; l'état du PIN, ajouté à la règle de l'état du compte ; le hacheur (le seul fichier qui connaît le secret) :

```
apps/api/src/staff/staff-pin.ts
apps/api/src/staff/staff-pin.spec.ts
apps/api/src/staff/staff-pin-hasher.ts
apps/api/src/staff/staff-pin-hasher.spec.ts
apps/api/src/staff/staff-account-state.ts
apps/api/src/staff/staff-account-state.spec.ts
```

**Le port, l'adaptateur, le service, le contrôleur, le module** — la réservation atomique, l'échec et le verrouillage, l'ouverture par PIN, l'émission du PIN (activation, connexion, changement de mot de passe), l'effacement (réinitialisation, désactivation), K-23, le câblage :

```
apps/api/src/staff/staff-store.types.ts
apps/api/src/staff/staff-store.prisma.ts
apps/api/src/staff/staff-store.prisma.spec.ts
apps/api/src/staff/staff-session.service.ts
apps/api/src/staff/staff-session.service.spec.ts
apps/api/src/staff/staff-session.controller.ts
apps/api/src/staff/staff-decorators.ts
apps/api/src/staff/staff.module.ts
apps/api/src/staff/staff-source-guards.spec.ts
```

**Le secret, la limite de débit** — la variable (obligatoire, sans défaut, nommée au refus), son exemple (le NOM seul), le levier de débit de K-23 (le MÊME que les autres, D128) :

```
apps/api/src/config/env.ts
apps/api/src/config/env.spec.ts
apps/api/.env.example
apps/api/src/auth/auth.throttle.ts
```

**La ligne d'audit de la promotion d'un devis** (R-6) — le port, l'adaptateur, le service, le contrôleur et leurs specs ; la promotion elle-même ne change pas :

```
apps/api/src/venues/quote-store.types.ts
apps/api/src/venues/quote-store.prisma.ts
apps/api/src/venues/quote-store.prisma.spec.ts
apps/api/src/venues/quotes.service.ts
apps/api/src/venues/quotes.service.spec.ts
apps/api/src/venues/quotes.controller.ts
```

**Les tests d'intégration** (PostgreSQL réel) — l'environnement des tests (la valeur jetable du secret, le levier de débit), les aides, les suites neuves du PIN (la connexion et les mesures MP, l'émission et l'effacement, les quatre courses de R-3, le journal de R-5), la ligne de la promotion, le test de débit étendu, la liste fermée des routes exemptées :

```
apps/api/test/int/setup-env.ts
apps/api/test/int/staff-helpers.ts
apps/api/test/int/staff-pin.int-spec.ts
apps/api/test/int/staff-pin-issue.int-spec.ts
apps/api/test/int/staff-pin-race.int-spec.ts
apps/api/test/int/staff-pin-audit.int-spec.ts
apps/api/test/int/quote-promote-actor.int-spec.ts
apps/api/test/int/throttle.int-spec.ts
apps/api/test/int/staff-session-guard.int-spec.ts
```

**L'e2e** — le serveur d'API de l'e2e reçoit sa valeur jetable du secret (sans elle il refuse de démarrer) :

```
e2e/playwright.config.ts
```

**Le harnais de neutralisation du lot** (chaque garde neuve est neutralisée, son échec LU) :

```
neutralisation/neutralize-r58.py
```

**Les pièces du premier versement** (la table elle-même, la consigne, la règle des portes écrite avant les passes, la carte du journal de DR5 mise à jour, l'annotation additive de la carte de D355, la lecture adverse de la consigne et du cadrage et sa sortie) :

```
docs/preuves/D356/table-ouverture.md
docs/preuves/D356/consigne.md
docs/preuves/D356/regle-portes.md
docs/preuves/D356/carte-journal-dr5.md
docs/preuves/D355/carte-journal-dr5.md
docs/preuves/D356/lecture-adverse/confronter-consigne.py
docs/preuves/D356/lecture-adverse/confronter-sortie.txt
docs/preuves/D356/lecture-adverse/lecture-adverse.md
```

Les autres pièces — audits de secrets et leurs tris, les sorties des rouges, la neutralisation, les campagnes touchées, les portes, la passe D277, le contrôle de fin de lot, **la procédure du geste de Ko (`secret-pin-ko.md`)** — sont déclarées par des **extensions**, en chemins COMPLETS, **avant** le commit qui les verse (aucun préfixe : une table par préfixe rendrait « 0 fichier non déclaré » vrai par construction).

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

```
ZWADJ_CONTINUITE.md
ZWADJ_BACKLOG.md
AGENTS.md
```

`AGENTS.md` : annotations seules (le compteur de la chaîne « AUCUN LOT NE PART DANS `main` SOUS UNE PORTE ROUGE… » ; l'invariant de la couche du personnel de D354 et celui de D355, dont les phrases « le PIN (3b) … n'existe pas » et « `quote.promote` n'écrit pas `actor_member_id` » que ce lot périme ; un invariant neuf pour le PIN, son secret et ses courses). Aucune phrase n'est réécrite : barrée avec son motif, annotée (D276, D277). `ZWADJ_BACKLOG.md` : l'annotation additive de l'entrée de l'intermittence (1 e) et les reports neufs.

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucune migration** (R-1 : aucune colonne ne manque ; si l'une manque à la mesure, ARRÊT et rapport), **aucun écran** (rien dans `apps/pro` ni `apps/client`), **aucun montant**, **aucun code d'erreur neuf** (R-7) : `STAFF_INVALID_CREDENTIALS` est le code de tout refus de K-23, comme celui de K-15 ; seules des clés de MESSAGE DE VALIDATION de K-23 (le corps mal formé) s'ajoutent aux catalogues, FR et AR, sous la parité — si la mesure montre qu'elles ne sont pas nécessaires, elles ne sont pas écrites.
- **`apps/api/src/staff/staff-members.service.ts` et `staff-members.controller.ts` ne sont PAS déclarés** : l'effacement du PIN par K-21 et K-22 est écrit par les instructions du magasin, dans leur transaction ; le service de K-20 à K-22 n'a rien à changer. Si la mesure disait autrement : extension.
- **`apps/api/src/staff/staff-session.guard.ts` n'est PAS déclaré** : le garde ne décide rien sur le PIN (une session ne se refuse pas parce qu'un PIN a expiré ; le verrouillage met fin aux sessions du membre à la base). La règle de l'état du PIN est UNE copie (R-4), lue par la connexion par mot de passe, par le changement de mot de passe et par la connexion par PIN ; **cette lecture de R-4 — « lue par le garde » n'est pas prise à la lettre — est une décision de la session, à ratifier** (S-269 et suivantes).
- **La promotion d'un devis n'est PAS touchée dans ce qu'elle décide** : ni un statut, ni un montant, ni un compteur, ni la copie du nom ; seule la clé `actorMemberId` de sa ligne d'audit s'ajoute (R-6). Si la mesure disait autrement : ARRÊT (D316).
- **Rien du chemin de l'argent** (D316, par la fonction : aucun montant, aucune transition de réservation ou de devis).
- **Hors lot** (consigne, R-8) : les écrans du personnel et de verrouillage (L36-4 — où il faudra mesurer le brouillon de D345 au changement de membre, la saisie masquée de l'écran de verrouillage et « si une AUTRE personne déverrouille, la saisie est effacée »), le recours d'un Manager seul, la réactivation et le changement de rôle, l'intermittence de l'amorçage (1 e), la recherche d'annuaire (L36-5).
- **`neutralisation/lancer-campagnes.py`** n'est pas modifié ; les campagnes que le lot touche sont **rejouées**, et ne sont modifiées que si une ancre est périmée (conditionnel ci-dessous).

## Fichiers CONDITIONNELS (leur existence ou leur modification dépend d'un résultat)

Le rapport dit lesquels existent.

- **Les suites d'intégration EXISTANTES qui comptent ce que le lot change** — condition : une assertion existante porte sur la forme de la réponse de K-14, K-15 ou K-18 (le corps gagne la clé `pin`), sur le nombre de lignes d'`audit_logs`, sur la liste des routes ou des clés de débit, ou sur la liste des colonnes de `pro_staff_members` ; la porte `test:int` et la découverte des campagnes le disent, leur lecture AVANT n'a pas pu les épuiser (S-264) :

```
apps/api/test/int/staff-activation.int-spec.ts
apps/api/test/int/staff-login.int-spec.ts
apps/api/test/int/staff-password.int-spec.ts
apps/api/test/int/staff-members.int-spec.ts
apps/api/test/int/staff-capabilities.int-spec.ts
apps/api/test/int/staff-last-manager.int-spec.ts
apps/api/test/int/staff-password-expiry.int-spec.ts
apps/api/test/int/staff-schema.int-spec.ts
apps/api/test/int/contract-api-client.int-spec.ts
apps/api/test/int/log-temporary-password.int-spec.ts
apps/api/test/int/log-set-cookie.int-spec.ts
apps/api/test/int/rbac-all-routes.int-spec.ts
apps/api/test/int/staff-login-race.int-spec.ts
apps/api/test/int/row-lock.ts
```

- **Les specs unitaires EXISTANTES dont un double de port ou une attente de forme change** — condition : le port `StaffStore` gagne des méthodes (un double écrit avec `satisfies` ne compile plus) ou une réponse gagne une clé :

```
apps/api/src/staff/staff-session.guard.spec.ts
apps/api/src/staff/staff-members.service.spec.ts
apps/api/src/staff/staff-session-policy.spec.ts
apps/api/src/staff/staff-cookies.spec.ts
```

- **Les harnais de campagnes EXISTANTES dont une ancre se périme** — condition : le texte visé a changé de forme (le magasin, le service et le port du personnel, le fichier des devis) ; chaque ancre révisée compte son fragment avant d'écrire, et la campagne est rejouée EN ENTIER :

```
neutralisation/neutralize-r44.py
neutralisation/neutralize-r56.py
neutralisation/neutralize-r57.py
neutralisation/neutralize-r41.py
neutralisation/neutralize-r43.py
```

- **Les pièces d'un lot précédent annotées** — condition : le tri de la passe D277 trouve une affirmation périmée dans une pièce versée (annotation additive, jamais une réécriture) : aucune à l'ouverture.

## Extensions de la table

Aucune à l'ouverture.
