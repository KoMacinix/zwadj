# D354 — rang 56 — table d'ouverture

Lot : **L36-3a-2 — le personnel et ses capacités, côté serveur (créer, lister, réinitialiser, désactiver ; ce qu'un employé peut faire ; le mot de passe expiré)** — consigne du relecteur « RANG 56 » du 19/11/2026, adoptée par Ko tel quelle (`docs/preuves/D354/consigne.md`, versée dans le commit suivant). Lot de **CODE**, **chemin d'identité**, méthode **RENFORCÉE** (R-3 de D340), sous la pause de certification (Ko, 22/10/2026) ; il **compte** (D283) : compteur POUR MÉMOIRE TRENTE-CINQ → TRENTE-SIX à la clôture.

- **SHA de départ** : `04239635cb09b20a06a0bf758531216c6b34b107` (clôture de D353). `HEAD` = `origin/main` après `git fetch` (les deux sur ce SHA), arbre propre (`git status --short` : 0 ligne), aucun stash (0 ligne), branche `main`. Branches distantes gardées, relevées : `origin/front-client`, `origin/integration-45`, `origin/par-carte`.
- **Numéro** : D354 — pris en lisant le registre de `ZWADJ_CONTINUITE.md` : 308 lignes `| Dnnn |` (expression `^\| D(\d+) \|`), dernier numéro **353** ; `D354` ne figure dans aucun des quatre fichiers d'autorité (compte 0 sur le texte APLATI : 0, 0, 0, 0 ; caractères aplatis examinés : 4 574 573 ; calibré sur `D353`, qui rend 185, 16, 11 et 0). **S-239** est le premier numéro de décision de la session (S-231 à S-238, de D353, sont ratifiées par adoption : consigne, § 1 d).
- **Reprise (consigne, § 0), relevée avant toute écriture** : rang 55 CLOS (D353) ; compteur POUR MÉMOIRE TRENTE-CINQ ; « RANG 56 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat : L36-3a-2 avec S-104) ; `origin/main` = `0423963` ; arbre propre, sans stash, sur `main` ; **aucun écart**. Lus : `CLAUDE.md`, `AGENTS.md` (en entier, importé), `ZWADJ_CONTINUITE.md` (état à la clôture du rang 55, ordre des rangs, registre, D341 §§ 3, 4, 13 à 16, D340 « Patrons »), `docs/preuves/D340/cadrage.md` EN ENTIER (sha256 du cadrage lu : `c5b1ae9eca0e3815eb86457614c312be9e0d9c13cf7318f4eaecd471acb02c74`), DR5 et la tranche [L36-3] de la section 4 de D336.
- **Poste à l'ouverture** : **sur secteur** (`BatteryStatus` = 2, charge 100 %), RAM libre 3 903 Mo, `chrome` 0, `headless_shell` 0, Docker 29.8.0 lancé, ports 3100 et 3101 libres. ⚠ La barre de RAM de D273 (4 579 Mo) est un critère de **certification**, en pause : elle n'est pas appliquée à des portes ordinaires, et ce relevé est noté pour que personne ne le lise comme tel.
- **Les constats du relecteur (consigne, § 2), RELEVÉS au dépôt avant d'écrire — par lecture** : (a) `ProStaffMember` (`apps/api/prisma/schema.prisma`) porte déjà `role`, `status`, `disabledAt`, `passwordExpiresAt`, `mustChangePassword`, `createdByMemberId`, `passwordFailedCount`, `passwordLockedUntil` — **aucune migration n'est nécessaire** (R-1) ; dernière migration : `20261104170000_staff_layer` ; (b) `apps/api/src/staff/` n'a qu'**un** contrôleur, `staff-session.controller.ts` (activate, login, session, logout, password) ; (c) **aucune table de capacités** n'existe (recherche de `STAFF_CAPABILIT`, `StaffCapabilit`, `peut(` dans `packages/types/src` et `apps/api/src` : 0 occurrence) ; (d) les sept contrôleurs nommés par le cadrage existent sous ces noms : `availability-blocks.controller.ts`, `availability.controller.ts` (une SECONDE classe, `pro/venues`, dans le fichier de la route publique), `bookings-pro.controller.ts`, `visit-bookings.controller.ts` (classe `@Roles(CLIENT)` avec deux handlers `@Roles(PRO)`), `quotes.controller.ts` dans `apps/api/src/venues/` ; `quote-document.controller.ts` dans `apps/api/src/documents/` ; `pro-clients.controller.ts` dans `apps/api/src/clients/` ; (e) `venues.controller.ts` porte aussi `GET pro/venues/:id/publication` (D349), une LECTURE ; (f) `StaffSessionGuard` ne regarde AUJOURD'HUI ni `must_change_password` ni `password_expires_at` (S-104 n'est pas codée) ni la méthode HTTP ni un rôle de membre ; `mustChangePassword` voyage dans les réponses et rien ne l'écrit à `true`.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 et D334 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) l'extension 1 de cette table, SEULE ; (3) la consigne en pièce, la règle des portes (écrite et commitée AVANT les passes) et la sortie de la lecture adverse de la consigne ET du cadrage contre le dépôt, avec le premier audit de secrets, **avant tout `.md` d'autorité** ; (4) **les pièces des rouges** (sorties lues contre l'état d'avant, avec l'empreinte sha256 de chaque fichier de test joué) — dans un commit **ANTÉRIEUR au premier commit de code** (D334, item 5) ; (5) le code et ses tests ; (6) les harnais, les campagnes, les portes ; (7) les trois `.md` d'autorité, **les arbitrages de Ko en première écriture**, puis la passe D277 des deux sens ; (8) le contrôle de fin de lot, après la poussée. Toute extension de cette table : un commit propre, **avant** le commit du fichier qu'elle couvre.
- **Règle d'arrêt** (consigne, § 0 et R-1) : un écart à la reprise ⇒ arrêt, et le dire. **Et** (R-1) : si une colonne manque à la mesure, **ARRÊT, rapport** — une extension du schéma est à Ko (DR8).
- **Écrit pour ne pas se lire comme tenu** : cette table dit ce que le lot **prévoit** de toucher. Elle ne dit pas qu'un mode de défaillance est tenu, ni qu'une garde mord : chacun se **mesure** (rouge d'abord, neutralisation ensuite) et se rapporte avec ses chiffres.

## A. Le départ

Voir les puces ci-dessus (SHA, numéro, reprise, poste, constats). Aucun fichier n'est modifié à l'ouverture : ce fichier est le premier commit du lot.

## B. Les fichiers de CE lot — chemins COMPLETS

**Types, catalogues et client d'API** (la table des capacités et `peut`, les schémas et les codes de K-19 à K-22, les messages FR et AR, les quatre appels) :

```
packages/types/src/staff-capabilities.ts
packages/types/src/staff.ts
packages/types/src/index.ts
apps/api/src/common/staff-capabilities.spec.ts
apps/api/src/common/staff-contract.spec.ts
packages/i18n/messages/fr.json
packages/i18n/messages/ar.json
packages/api-client/src/staff-client.ts
packages/api-client/src/staff-client.test.ts
```

**Modules purs neufs** (D187 : sans dépendance, neutralisables en millisecondes) et leurs specs — l'état du compte (`etatDuCompte`, R-3), le verdict d'accès (état + capacité + méthode), le verdict « jamais zéro Manager », le générateur du mot de passe temporaire :

```
apps/api/src/staff/staff-account-state.ts
apps/api/src/staff/staff-account-state.spec.ts
apps/api/src/staff/staff-access-policy.ts
apps/api/src/staff/staff-access-policy.spec.ts
apps/api/src/staff/staff-members-policy.ts
apps/api/src/staff/staff-members-policy.spec.ts
apps/api/src/staff/staff-temporary-password.ts
apps/api/src/staff/staff-temporary-password.spec.ts
```

**Le personnel — contrôleur, service, magasin** (K-19 à K-22 ; l'extension du magasin existant, cadrage § 5.5 : « extension du store » ; le garde et la connexion lisent la MÊME règle) :

```
apps/api/src/staff/staff-members.controller.ts
apps/api/src/staff/staff-members.service.ts
apps/api/src/staff/staff-members.service.spec.ts
apps/api/src/staff/staff-decorators.ts
apps/api/src/staff/staff-session.guard.ts
apps/api/src/staff/staff-session.guard.spec.ts
apps/api/src/staff/staff-session.service.ts
apps/api/src/staff/staff-session.service.spec.ts
apps/api/src/staff/staff-session.controller.ts
apps/api/src/staff/staff-store.types.ts
apps/api/src/staff/staff-store.prisma.ts
apps/api/src/staff/staff-store.prisma.spec.ts
apps/api/src/staff/staff.module.ts
apps/api/src/staff/staff-source-guards.spec.ts
```

**Les déclarations de capacité**, au niveau de la CLASSE (R-2). Les **sept** de l'employé (consigne, § 1 c) : `availability-blocks`, `availability` (classe `pro/venues`), `bookings-pro`, `visit-bookings`, `quotes`, `quote-document`, `pro-clients`. ⚠ **Sept de plus, déclarées par la session (S-239, à ratifier)** : `venues`, `venue-media`, `visit-availabilities`, `slot-templates` (capacité `salle`), `pricing-rules` (`prix`), `services` (`prestations`), et le compte commun `account` (`compte`) — pour que « changer d'avis = changer UNE ligne de la table » soit **vrai** de ces trois lignes aussi (sans déclaration, leur ligne serait une donnée inerte et le comportement viendrait seulement de la règle par défaut). Elles **ne changent aucun comportement** : l'employé lit et n'écrit pas, comme la règle par défaut S-107 le dit déjà :

```
apps/api/src/clients/pro-clients.controller.ts
apps/api/src/documents/quote-document.controller.ts
apps/api/src/venues/availability-blocks.controller.ts
apps/api/src/venues/availability.controller.ts
apps/api/src/venues/bookings-pro.controller.ts
apps/api/src/venues/visit-bookings.controller.ts
apps/api/src/venues/quotes.controller.ts
apps/api/src/venues/venues.controller.ts
apps/api/src/venues/venue-media.controller.ts
apps/api/src/venues/visit-availabilities.controller.ts
apps/api/src/venues/slot-templates.controller.ts
apps/api/src/venues/pricing-rules.controller.ts
apps/api/src/venues/services.controller.ts
apps/api/src/account/account.controller.ts
```

**Tests d'intégration** (PostgreSQL réel) et aides — K-19 à K-22 ; « jamais zéro Manager » sous course (R-4) ; la table des capacités dérivée du ROUTEUR avec une session d'employé (R-2) ; S-104, mesurée d'abord (R-3) ; le temporaire jamais dans le journal (R-5) ; l'audit dans la transaction (R-6) :

```
apps/api/test/int/staff-members.int-spec.ts
apps/api/test/int/staff-last-manager.int-spec.ts
apps/api/test/int/staff-capabilities.int-spec.ts
apps/api/test/int/staff-password-expiry.int-spec.ts
apps/api/test/int/log-temporary-password.int-spec.ts
apps/api/test/int/staff-helpers.ts
apps/api/test/int/route-collector.ts
apps/api/test/int/staff-session-guard.int-spec.ts
```

**Harnais** (une garde neuve se neutralise : la preuve qu'elle mord) :

```
neutralisation/neutralize-r56.py
```

**Pièces du lot** (celles qu'on connaît à l'ouverture ; les autres entrent par extension, avant leur commit) :

```
docs/preuves/D354/table-ouverture.md
docs/preuves/D354/consigne.md
docs/preuves/D354/regle-portes.md
docs/preuves/D354/lecture-adverse/confronter-consigne.py
docs/preuves/D354/lecture-adverse/confronter-sortie.txt
docs/preuves/D354/controle-fin-de-lot.txt
```

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

```
ZWADJ_CONTINUITE.md
ZWADJ_BACKLOG.md
AGENTS.md
```

`AGENTS.md` : annotations seules (le compteur de la chaîne « AUCUN LOT NE PART DANS `main` SOUS UNE PORTE ROUGE… » ; un invariant de la couche du personnel pour K-19 à K-22, les capacités et S-104 ; les phrases de l'invariant « LA COUCHE DU PERSONNEL… (D341) » que ce lot périme — **« S-104 n'est PAS codée »**, **« le recours d'un Manager seul… »** (inchangé), **« `mustChangePassword` voyage mais rien ne l'écrit à `true` »**). `ZWADJ_BACKLOG.md` : la réponse de Ko à la question de D353 en **annotation additive** de l'entrée `[CLIENT][PERF]` « LE COÛT DE LA RELECTURE D'UNE RÉPONSE VIDE N'EST PAS MESURÉ » (consigne, § 1 e), et les reports neufs de ce lot.

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucune migration** (R-1), **aucun écran** (R-7 : rien dans `apps/pro` ni `apps/client`), **aucun montant, rien du chemin de l'argent** (R-7, D316 : par la fonction), **aucun contrat d'API autre que K-19 à K-22** (consigne, § 1 b : « et eux seuls »), aucune variable d'environnement, `apps/api/src/app.module.ts` non touché (le quatrième garde y est déjà).
- **`apps/api/src/clients/pro-clients.service.ts` n'est PAS déclaré** : le cadrage (§ 5.5, ligne « lot 2 ») y met « les lignes d'audit « création et modification de fiche » », « du code du rang 41, déjà livré — à ratifier comme périmètre » ; la consigne (R-6) dit « L'audit des fiches (DR5, S-108) » **puis** décrit des actions du PERSONNEL (« chaque création, réinitialisation et désactivation, acteur = le membre Manager »). **Lecture de la session, écrite avant d'écrire** (S-240, à ratifier — c'est l'objet de la **question unique** du rapport) : l'audit du lot est celui des trois actions de gestion du personnel ; l'audit de la création et de la modification d'une **fiche client** ne s'écrit PAS ici (modifier le code du rang 41 est une modification de comportement non demandée : `CLAUDE.md`, « s'arrêter et demander »). La lecture adverse l'instruit.
- **Hors lot** (consigne, R-8) : le PIN (L36-3b), les écrans (L36-4 — où il faudra mesurer le brouillon de D345 au changement de membre), le recours d'un Manager seul qui a perdu son mot de passe (backlog), le changement de rôle d'un membre (aucune route au cadrage), le saut de l'en-tête de l'assistant d'une salle (D352).
- **Ni le PIN ni la révocation d'un PIN** : il n'existe pas encore (3b) ; la réinitialisation ne touche aucune colonne `pin_*` (R-5) — **à reprendre par 3b**, écrit au backlog.
- **`neutralisation/lancer-campagnes.py`** n'est pas modifié ; les campagnes de D341 (`neutralize-r44.py`) sont **rejouées** (le lot touche les fichiers qu'elles lisent) et ne sont modifiées que si une ancre est périmée (conditionnel ci-dessous).

## E. Le cadrage, RECOPIÉ par script depuis `docs/preuves/D340/cadrage.md` (consigne, § 2 : « depuis le fichier, jamais depuis ce message »)

⛔ Ce qui suit est la sortie de `make_table.py` lue sur le cadrage (sha256 `c5b1ae9eca0e3815eb86457614c312be9e0d9c13cf7318f4eaecd471acb02c74`) : chaque ligne est celle du fichier, à l'identique. Le script abandonne si un motif ne trouve pas sa ligne ou si le compte attendu n'est pas atteint (§ 4 : les modes dont la colonne « lot » contient « 2 » — **15 lignes relevées** ; § 5.1 : K-19 à K-22 ; § 5.4 : la table des capacités et S-107 ; § 3.1 : les verrous ; § 5.5 : les trois lignes « lot 2 »).

### E.1 § 3.1 — l'ordre total des verrous (S-101)

| rang | objet verrouillé | pris par |
|---|---|---|
| **L1** | la ligne `pro_profiles` du pro (`SELECT … FOR UPDATE`, ou l'`UPDATE` de `staff_layer_enabled_at`) | activation ; **toute opération qui peut réduire le nombre de Managers actifs** (désactivation) |
| **L2** | les lignes `pro_staff_members` (par `id` croissant s'il y en a plusieurs) | désactivation, réinitialisation, changement de mot de passe, **et l'`UPDATE` atomique des compteurs** (mot de passe, PIN) |
| **L3** | les lignes `pro_staff_devices` | création et révocation d'appareils |
| **L4** | les lignes `pro_staff_sessions` | création, fin, et le « toucher » d'activité du garde |

**Règle** : une transaction ne prend jamais un verrou de rang inférieur à celui qu'elle tient déjà. Sans cycle possible dans l'ordre d'acquisition, **aucun interblocage n'existe** — c'est l'argument, pas un test qui n'en a pas trouvé.

- **« Jamais zéro Manager »** : la désactivation prend **L1 d'abord**, compte les Managers actifs **sous ce verrou**, puis écrit L2 puis L4. Deux désactivations simultanées se **sérialisent sur L1** : la seconde voit un seul Manager actif et refuse (409). Aucune désactivation ne prend L2 avant L1.

### E.2 § 4 — les modes de défaillance du lot (« un mode qui n'y est pas ne se code pas », D126) — la colonne « lot » : `1` = 3a-1 (fait, D341), `2` = ce lot, `P` = 3b

| # | mode | garde serveur | garde base | mesure | lot |
|---|---|---|---|---|---|
| MP-4 | la session d'un membre **désactivé** | le garde joint le statut du membre ; `DISABLED` → refus et fin `DISABLED` | — (cohérence `status`/`disabled_at` : extension proposée, § 5.3) | int-spec : désactivation par SQL direct puis requête ; puis par la route (lot 2) | 1 · 2 |
| MP-6 | **deux Managers se désactivent l'un l'autre en même temps** | § 3.2 : L1 puis comptage sous verrou | — (déclencheur différé hors tranche, § 3.2) | int-spec : 2 Managers, 2 requêtes simultanées répétées 30 fois ; invariant : **toujours 1 Manager actif** | 2 |
| MP-11 | PIN / mot de passe / jeton **jamais en clair** hors de son unique affichage | une seule route rend le PIN (`Cache-Control: no-store`) ; le journal n'en porte aucun ; les journaux de requête rédigent `req.headers.authorization` et `req.headers.cookie` (`app.module.ts:30`) **mais PAS le `Set-Cookie` sortant : mesuré (M27), il est journalisé en clair** — c'est un défaut **existant** pour `zwadj_rt`, que les deux cookies neufs hériteraient (S-112, SIG-1) | — | int-spec : tout le corps des lignes `audit_logs` et **la sortie réelle du journal des requêtes** testés contre les valeurs posées en cookie ; garde de **source** : aucun `logger.*` ne reçoit un champ secret | 1 · 2 · P |
| MP-14 | mot de passe temporaire : 7 jours, changement obligatoire | `must_change_password` : le garde n'admet que `POST /pro/staff/password` et `logout` ; un temporaire expiré est refusé (S-104) | — | int-spec : tout le reste → 403/401 tant que le changement n'est pas fait | 2 |
| MP-19 | **jeton rejoué** après `logout`, après fin `DISABLED`, après réinitialisation | `ended_at` renseigné → refus immédiat (« révocable à l'instant ») | — | int-spec : requête avec l'ancien cookie, 401 | 1 · 2 |
| MP-21 | **EMPLOYEE écrit** sur salle / prix / prestations / personnel / compte commun | garde de capacités (S-107) : 403 `STAFF_CAPABILITY_DENIED` | — | int-spec dérivé du routeur : chaque écriture non déclarée « employé » refusée | 2 |
| MP-25 | mot de passe **expiré** (90 j) | connexion admise seulement vers « changement obligatoire » (S-104) | — | int-spec (vieillissement SQL) | 2 |
| MP-29 | **réinitialisation** par le Manager | révoque sessions, appareils, efface le PIN, remet `must_change_password`, mot de passe temporaire de 7 jours | — | int-spec | 2 |
| MP-30 | **désactivation** | sessions finies `DISABLED` dans la même transaction | — | int-spec | 2 |
| MP-31 | un **Manager se désactive lui-même** | permis sauf s'il est le dernier | — | int-spec | 2 |
| MP-32 | un **EMPLOYEE** crée / réinitialise / désactive | 403 | — | int-spec dérivé (MP-21) | 2 |
| MP-33 | **audit** : une ligne par action de personnel, `actor_member_id` renseigné, **aucune donnée secrète** | écrite dans la **même transaction** que l'action (comme la promotion de D339) | FK `actor_member_id` `ON DELETE SET NULL` (dans la tranche) | int-spec : une ligne par action ; garde de source : `before`/`after` ne reçoivent que des objets listés | 1 · 2 · P |
| MP-39 | **parité FR = AR** de tous les messages d'erreur | — | — | test de parité i18n existant | 1 · 2 · P |
| MP-41 | **dérive de l'horloge** entre l'API et la base | tout ce qui se décide en SQL utilise `now()` de la base ; les modules purs reçoivent `now` en paramètre | — | garde de source : aucun `new Date()` dans les services du personnel | 1 · 2 · P |
| MP-43 | **un seul levier de la durée d'inactivité** | constante exportée de `@zwadj/types` (10 min, 12 h, 15 min, 7 j, 90 j) — « paramètres, pas des colonnes figées » (DR5) | — | garde de source : aucun littéral de durée hors de ce module | 1 · 2 · P |

⚠ **Lecture écrite avant le code** : MP-4, MP-11, MP-19, MP-33, MP-39, MP-41 et MP-43 portent « 1 · 2 » ou « 1 · 2 · P » ; la moitié « 1 » est tenue par D341, **la moitié « 2 » est à ce lot** (MP-4 : la désactivation PAR LA ROUTE ; MP-11 : le mot de passe temporaire jamais en clair hors de son unique affichage ; MP-19 : le jeton rejoué après réinitialisation ; MP-33 : une ligne d'audit par action de gestion ; MP-39 : la parité FR = AR des messages neufs ; MP-41 : aucune horloge côté API ; MP-43 : un seul levier de durée, dont les 7 jours du temporaire). MP-44 (le recours d'un Manager seul) est **hors lot** (colonne « hors »).

### E.3 § 5.1 — les contrats neufs (adoptés par la consigne, § 1 b)

| K | route | qui | ce qu'elle fait | lot |
|---|---|---|---|---|
| **K-19** | `GET /pro/staff/members` | Manager | liste des membres de la salle | 2 |
| **K-20** | `POST /pro/staff/members` | Manager | crée un membre ; **mot de passe temporaire rendu une fois** (`no-store`) | 2 |
| **K-21** | `POST /pro/staff/members/:id/reset-password` | Manager | nouveau temporaire ; révoque sessions et appareils (et PIN) | 2 |
| **K-22** | `POST /pro/staff/members/:id/disable` | Manager | désactive ; « jamais zéro Manager » | 2 |

⚠ Chaque route neuve apparaît aussi dans `packages/api-client` avec son chemin **en toutes lettres dans l'appel** (D182).

### E.4 § 5.4 — la table des capacités (défaut de DR5 ; adoptée COMME DÉFAUT, consigne § 1 c) et la règle par défaut S-107

| capacité | MANAGER | EMPLOYEE | routes (M08) |
|---|---|---|---|
| `agenda` | ✓ | ✓ | `availability-blocks`, `availability` |
| `demandes` | ✓ | ✓ | `bookings-pro`, `visit-bookings` (Pro) |
| `devis` | ✓ | ✓ | `quotes`, `quote-document` |
| `clients` | ✓ | ✓ | `pro-clients` |
| `reservations` | ✓ | ✓ | `bookings-pro` |
| `annuaire` | ✓ | ✓ | *(L36-5, aucune route aujourd'hui)* |
| `salle` | ✓ | lecture seule | `venues`, `venue-media`, `visit-availabilities`, `slot-templates` |
| `prix` | ✓ | lecture seule | `pricing-rules` |
| `prestations` | ✓ | lecture seule | `services` |
| `personnel` | ✓ | — | `/pro/staff/members*` |
| `compte` | ✓ | — | les six `/me/*` du compte commun |

**Règle par défaut (S-107)** : une route Pro **sans déclaration** est **MANAGER seul pour les écritures** et **lisible par tous** pour les lectures ⇒ une route oubliée est **plus fermée**, jamais plus ouverte. Les déclarations d'employé se posent **au niveau de la classe** sur **sept** contrôleurs (`availability-blocks`, `availability`, `bookings-pro`, `visit-bookings`, `quotes`, `quote-document`, `pro-clients` — comptés dans la table ci-dessus), pas route par route. ⚠ **Question de lecture, pas de mesure** : « agenda » couvre-t-il les **plages de visite** (`visit-availabilities`) ? DR5 ne le dit pas ; le défaut ci-dessus les met côté `salle` (MANAGER seul en écriture) — c'est exactement ce que Q7 doit confirmer.

### E.5 § 7 — les décisions de la session de D340 que ce lot code (S-104 à S-108)

- **S-104 — Mot de passe de 90 jours expiré : connexion admise vers le seul changement ; temporaire de 7 jours expiré : refusé.** *Pour Ko :* un oubli de trois mois ne bloque pas la salle ; un temporaire oublié exige un nouveau passage par un Manager.
- **S-105 — Changer son mot de passe met fin aux AUTRES sessions ; la réinitialisation par un Manager met fin à TOUTES, révoque les appareils et le PIN.** *Pour Ko :* conforme à DR5 (`:2111`) pour la réinitialisation ; pour le changement personnel, DR5 se tait, la session prend le choix le plus sûr.
- **S-107 — Capacités : défaut fermé (écritures = MANAGER seul, lectures = tous), déclarations d'employé au niveau de la classe.** *Pour Ko :* la décision de la salle pilote (Q7) se change en une ligne de table.
- **S-108 — Le journal est `audit_logs` (une ligne par action, `actor_member_id`, sans secret) ; pas de table neuve.** *Pour Ko :* aucune nouvelle table de journal ; les lignes servent MS-3 (carnet des accès).

### E.6 § 5.5 — les trois lignes « lot 2 » du cadrage

| 2 | `staff-members.controller.ts`, `staff-members.service.ts`, `staff-capabilities.ts` (+ extension du store) | personnel et capacités |
| 2 | **déclarations de capacité** sur 7 contrôleurs existants (`availability-blocks`, `availability`, `bookings-pro`, `visit-bookings`, `quotes`, `quote-document`, `pro-clients`) | S-107 |
| 2 | `apps/api/src/clients/pro-clients.service.ts` | **les lignes d'audit « création et modification de fiche »** que DR5 liste : c'est du code du rang 41, déjà livré — à ratifier comme périmètre |

## Fichiers CONDITIONNELS (leur existence ou leur modification dépend d'un résultat)

Chacun est déclaré **avec sa condition** ; le rapport de fin de lot dit lesquels existent.

| fichier | condition |
|---|---|
| `neutralisation/neutralize-r44.py` et tout autre harnais dont `neutralisation/lancer-campagnes.py` (via `lancer-touchees.py`) trouve une **ancre périmée** par ce lot | le lot modifie des fichiers que lit `neutralize-r44.py` (le garde, le magasin, le service, le contrôleur du personnel) ; une ancre périmée est révisée par extension de la table, **avant** son commit, et la campagne **rejouée en entier** |
| `apps/api/test/int/rbac-all-routes.int-spec.ts`, `apps/api/test/int/contract-api-client.int-spec.ts` | seulement si les quatre routes neuves exigent une entrée de liste blanche ou si le test de contrat relève un chemin non couvert |
| `apps/api/src/staff/staff-session-policy.ts` | seulement si le garde ou la connexion exigent un changement de ce module (la règle neuve vit dans `staff-account-state.ts`, qui n'y touche pas) |
| `apps/api/src/app.module.ts` | seulement si la mesure du journal (R-5) montre que le temporaire atteint le journal des requêtes : un chemin de plus dans `redact` |
| `docs/preuves/D354/mesures/`, `docs/preuves/D354/rouges/`, `docs/preuves/D354/neutralisation/`, `docs/preuves/D354/portes/`, `docs/preuves/D354/lecture-adverse/` (autres pièces que celles listées en B) | les pièces des mesures, des rouges, des campagnes, des portes et de la lecture adverse ; **leurs noms dépendent des résultats** : chacune est déclarée par une extension, en chemins complets, avant son commit |
| `docs/preuves/D354/scenarios-ko.md` | **non créé** : le lot n'a aucun écran, donc aucun geste de Ko (consigne, § 4) ; créé seulement si une mesure montre un état VISIBLE |

## Extensions de la table

*(chaque extension est un commit propre, avant le commit du fichier qu'elle couvre)*

### Extension 1 — les pièces du premier versement : la note de la lecture adverse, la première passe de son instrument, l'audit de secrets « a » et son tri

Écrite **avant** le commit qui verse la consigne, la règle des portes et la lecture adverse (et avant le commit des rouges). Les fichiers déjà listés en B (`consigne.md`, `regle-portes.md`, `lecture-adverse/confronter-consigne.py`, `lecture-adverse/confronter-sortie.txt`) entrent dans ce même commit. **Chemins COMPLETS des quatre fichiers que B ne listait pas** :

```
docs/preuves/D354/lecture-adverse/lecture-adverse.md
docs/preuves/D354/lecture-adverse/confronter-sortie-passe-1.txt
docs/preuves/D354/audit-secrets-d354a.txt
docs/preuves/D354/tri-audit-d354a.txt
```

**Pourquoi `confronter-sortie-passe-1.txt`** : la première passe de l'instrument de lecture adverse a rendu un ✗ (contrôle 7.a) et deux comptes trop larges (6.a, 8.a) qui étaient des défauts DE L'INSTRUMENT, confrontés à la source avant d'être crus (D275) ; cette sortie est gardée, non retouchée ; la sortie finale (`confronter-sortie.txt`) vient de l'instrument réparé. **`lecture-adverse.md`** est la note qui les lit. **`audit-secrets-d354a.txt` et `tri-audit-d354a.txt`** : le premier audit de secrets (D298) et son tri différentiel (D299), joués sur ces pièces avant leur versement.

### Extension 2 — les pièces des ROUGES, le second audit de secrets, et un fichier d'aide que la table B ne listait pas

Écrite **avant** le commit qui verse les rouges, et donc **avant le premier commit de code** (D334, point 5). **Chemins COMPLETS** :

```
apps/api/test/int/row-lock.ts
docs/preuves/D354/rouges/jouer-rouges.py
docs/preuves/D354/rouges/rouge-unit.txt
docs/preuves/D354/rouges/rouge-client.txt
docs/preuves/D354/rouges/rouge-int.txt
docs/preuves/D354/rouges/lecture-des-rouges.md
docs/preuves/D354/audit-secrets-d354b.txt
docs/preuves/D354/tri-audit-d354b.txt
```

**`apps/api/test/int/row-lock.ts`** — un fichier de CODE DE TEST que la section B ne listait pas : l'aide qui FORCE un entrelacement par un verrou de ligne tenu hors du service (D350) ne connaissait que deux tables (`account_deletion_requests`, `venues`) ; R-4 exige de tenir le verrou du PROFIL (`pro_profiles`, L1) hors du service pour y faire attendre deux désactivations. Une ligne d'union, un commentaire ; modifié AVANT les rouges (l'empreinte du fichier est celle de l'arbre au moment du jeu), commité avec le code. **Les pièces des rouges** : la commande, l'empreinte sha256 de CHAQUE fichier de test joué, le code de sortie et la sortie BRUTE de chaque famille (unitaire, client d'API, intégration), la note qui les LIT (`lecture-des-rouges.md` : assertion ou erreur ? combien de fichiers tombés à la collecte ?), et le lanceur (`jouer-rouges.py`, archivé comme preuve, jamais promu en instrument, D291). **`audit-secrets-d354b.txt` et `tri-audit-d354b.txt`** : le second audit de secrets (D298) et son tri différentiel (D299) contre la sortie « a », joués sur ces pièces avant leur versement.
