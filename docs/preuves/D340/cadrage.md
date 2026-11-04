# D340 — rang 44 — CADRAGE de L36-3 (le personnel et le PIN, côté serveur)

SHA de départ `ec44937`. Les mesures citées (« M01 » à « M26 ») sont celles de `docs/preuves/D340/mesures-cadrage.sh`, dont la sortie brute est `mesures-cadrage.txt`. Les décisions de la session portent des numéros **S-98 et suivants** (la suite de D339) : elles sont **à ratifier**, aucune n'est une parole de Ko.

## 0. VERDICT — LA RÈGLE D'ARRÊT JOUE, SANS CODE

La consigne dit : si le relevé « exige un découpage », la session s'arrête **sans coder**, pousse le cadrage et rapporte. Le relevé l'exige, pour **trois raisons indépendantes**, chacune mesurée :

1. **Taille.** Le lot L36-2 (D339, rang 43) — une colonne, une `CHECK`, un déclencheur, **une** route, un écran — a fait **44 fichiers, 3 840 insertions (674 de production, 2 237 de tests), 197 tests de plus** et **deux sessions** (M24, M25, M26). L36-3 entier ajoute **dix routes**, **trois tables**, **trois énumérations**, un garde global qui couvre **55 routes** de **15 contrôleurs** (M08), et **quarante-quatre modes de défaillance** à garder (§ 4). Estimation (§ 6, ses entrées sont imprimées) : environ **2,8 fois la production de L36-2 (D339)** et plus de **six mille lignes de tests**. Un chemin d'identité écrit à moitié est pire que deux lots entiers (R-5) : il ne se termine pas dans une session.
2. **La frontière suggérée par R-5 est contredite par la tranche ratifiée.** R-5 propose `L36-3a` = membres, mots de passe, sessions, garde, capacités ; `L36-3b` = **appareil**, PIN, verrouillage. Or la tranche (`ZWADJ_CONTINUITE.md:2132`) donne à `pro_staff_sessions` une clé `device_id FK`, et DR5 (`:2109`) dit que le jeton d'appareil est « posé après une connexion nom de compte + mot de passe sur ce poste ». **Il n'y a pas de session sans appareil, donc pas de 3a sans appareil.** La frontière corrigée est au § 6.
3. **La tranche ne dit pas quelles colonnes sont nulles** (§ 5.2). Elle ne marque `NULLABLE` que trois colonnes (`staff_layer_enabled_at`, `created_by_member_id`, `actor_member_id`) ; onze colonnes de cycle de vie (`pin_hash`, `disabled_at`, `ended_at`, `end_reason`, `revoked_at`…) sont nulles par nature sans l'être dans le texte. Écrire la migration reviendrait à **décider** ce que la tranche n'a pas écrit : c'est l'écart que DR8 fait **présenter**, pas combler. Aucune migration n'est écrite.

⇒ Rien n'est codé, aucune migration, aucun harnais. Le lot est **DOCUMENTAIRE** (il ne compte pas, D283) : le rang 44 reste **OUVERT**, compteur pour mémoire **TROIS, inchangé**. **Une seule question** est posée, § 8.

---

## 1. RELEVÉ DU CODE ACTUEL (consigne 3 a)

| objet | fait mesuré | où |
|---|---|---|
| gardes globaux | **exactement trois**, dans l'ordre d'enregistrement qui EST l'ordre d'exécution (D6) : `ThrottlerGuard`, `JwtAuthGuard`, `RolesGuard` | `apps/api/src/app.module.ts:71-73` (M01), un seul `provide: APP_GUARD` à trois occurrences (M02) |
| claims du jeton d'accès | `{ sub, role }`, rien d'autre ; `request.user = { userId, role }` | `apps/api/src/auth/auth.types.ts:11-14` (M03), `jwt-auth.guard.ts:45` (M04) |
| porteur de l'identité | **l'en-tête `Authorization: Bearer`**, jamais un cookie ; le client l'attache à la main depuis la mémoire | `jwt-auth.guard.ts:49-55` (M04), `packages/api-client/src/auth-client.ts:144-147` (M10) |
| refus d'un garde | `JwtAuthGuard` : **401** `UNAUTHENTICATED` ; `RolesGuard` : **401** sans identité, **403** `FORBIDDEN` si le rôle manque | `jwt-auth.guard.ts:57-62`, `roles.guard.ts:36-48` (M05) |
| seule réaction du client à un 401 | **401 ET code `UNAUTHENTICATED`** → un refresh puis un rejeu, jamais de boucle ; tout autre 401 ou 403 remonte tel quel | `auth-client.ts:202` (M10) |
| jeton opaque | 256 bits CSPRNG, base64url, **seul le SHA-256 est en base** | `token.service.ts:12-21` (M06) |
| cookie de rafraîchissement | `zwadj_rt`, `httpOnly`, **`sameSite: "lax"`**, `secure` = `AUTH_COOKIE_SECURE`, chemin `/api/v1/auth` — et il est posé par `auth.controller.ts`, **pas** par `token.service.ts` (nuance ≈ de la lecture adverse, sans conséquence) | `auth.constants.ts:8-11`, `auth.controller.ts:215-230` (M07) |
| CORS | `origin: CORS_ORIGINS`, `credentials: true`, **aucun `allowedHeaders`** (le module réfléchit les en-têtes demandés) | `apps/api/src/main.ts:21-23` (M11) |
| mot de passe | argon2id, paramètres de la bibliothèque encodés dans le hachage ; `verify` rend `false` (jamais d'exception) ; `verifyAgainstDummy` paie un `argon2.verify` complet pour un compte inconnu (D5) | `password.service.ts:11-41` (M13) |
| règle de mot de passe actuelle | 8 à 128 caractères, une lettre, un chiffre ; **aucun refus des mots de passe courants, aucun refus de réutilisation** | `packages/types/src/auth.ts:12-18` (M14) |
| env en production | `PROD_REQUIRED_EXPLICIT` = `CLIENT_URL`, `PRO_URL`, `AUTH_COOKIE_SECURE`, `GOOGLE_CLIENT_ID`, `PAYMENTS_ENABLED` ; un secret sans défaut s'écrit `z.string().min(32)` (le JWT) | `config/env.ts:21` et `:150-161` (M17) |
| limites de débit | un seul levier de test pour `/auth` et le défaut (D128) : `AUTH_THROTTLE` (login 10 / 15 min / IP…) | `auth/auth.throttle.ts` (M12) |
| journal d'audit | `AuditLog` : `actorId`, `actorRole`, `action`, `entityType`, `entityId`, `before`, `after` ; **UN seul écrivain** : la promotion de D339 | `schema.prisma:1438-1456`, `quote-store.prisma.ts:322` (M18) |
| rattachement compte → salle | `ProProfile.userId` **UNIQUE** ; `Venue.ownerId` référence `ProProfile.id` (D149) | `schema.prisma:409-436` (M19) |
| écriture atomique « avec retour » | précédent : `INSERT … ON CONFLICT … RETURNING` (compteur de devis, fiche client) | `quote-store.prisma.ts:70-71`, `pro-client-store.prisma.ts:54-55` (M20) |
| journal des requêtes | `redact: ["req.headers.authorization", "req.headers.cookie"]` ; **le `Set-Cookie` de réponse n'est pas masqué : la valeur de `zwadj_rt` est écrite dans le journal** (pino-http 10.5.0 ; mesuré au niveau de la bibliothèque, pas à travers l'application démarrée) | `app.module.ts:30` (M27), signalement SIG-1 |
| ports `Clock` / `Random` / `PinHasher` | **aucun n'existe** (0 fichier sur 9 qui mentionnent `TokenService`, le témoin positif) | M16 |
| normaliseur arabe / nom de compte | **aucun** : seuls existent `normalizeContactEmail` et les normaliseurs de téléphone ; `NFKC` n'apparaît que dans deux fichiers de types | M15 |
| routes ADMIN | 5, dans deux contrôleurs : **le lot n'y touche pas**, et le garde ne s'applique pas à `ADMIN` | M08 |
| numéros K | `K-1` à `K-13` sont pris ; les neufs commencent à **K-14** | M21 |
| dernière migration | `20261028100000_quote_unofficial_draft` | M22 |
| e2e existante | 15 specs, **aucune mention du personnel ni du PIN** : elle mesure donc, telle quelle, que l'app Pro marche comme aujourd'hui avant l'activation | M23 |

**Inventaire des routes (M08, calibré à quatre bras, 0 écart sur le compte indépendant des routes, de `@Public` et de `@Roles`).** 85 routes : **48** `@Roles(PRO)`, **19** publiques, **7** authentifiées sans rôle (les six `/me/*` du compte commun et `GET /auth/me`), 6 `CLIENT`, 5 `ADMIN`. **Un compte PRO en atteint 55** (13 lectures, 42 écritures), réparties sur 15 contrôleurs. ⚠ L'extracteur a rendu **trois fois un résultat faux avant d'être juste** (fichiers à deux classes ; `@Public() // commentaire` ; comptage « sans `@Roles` » 13 → 9 → 7) : le contrôle par compte de routes restait vert, c'est la confrontation à la source brute qui les a montrés (en-tête de `mesures-cadrage.sh`).

---

## 2. TRANSPORT DES DEUX JETONS, CSRF, ORDRE DES GARDES (consigne 3 b)

### 2.1 Ce que le relevé impose

Le seul porteur d'identité est le **Bearer** (M04, M10). Les navigateurs **ne l'attachent jamais seuls** : une requête forgée depuis une autre origine arrive sans `Authorization`, et `JwtAuthGuard` la refuse avant tout autre garde. **Conséquence : un cookie qui ne fait que COMPLÉTER un Bearer n'authentifie rien à lui seul.** Les deux jetons neufs (session de personnel, appareil) sont exactement cela : **toute** route qui les lit est derrière `JwtAuthGuard`.

### 2.2 Proposition (S-99)

| jeton | transport | attributs | lu par |
|---|---|---|---|
| **session de personnel** | cookie `zwadj_ss`, 256 bits opaques, **SHA-256 en base** (`TokenService`, rien de neuf) | `HttpOnly`, `SameSite=Strict`, `Path=/api/v1`, `Secure` = `AUTH_COOKIE_SECURE` (**le même levier**, pas un second), cookie de session (aucun `Max-Age`) ; la durée de vie est **côté serveur** (10 min d'inactivité, 12 h) | le garde global, à chaque requête Pro |
| **appareil** | **un cookie par membre reconnu sur ce poste** : `zwadj_dv_<suffixe aléatoire>`, même forme de jeton | `HttpOnly`, `SameSite=Strict`, `Path=/api/v1/pro/staff`, `Max-Age` = `expires_at` de la ligne (jamais au-delà de `pin_expires_at`) | seulement les routes `/pro/staff/*` |

Pourquoi **un cookie par membre** : la tranche lie un appareil à **un** membre (`pro_staff_devices.member_id`), et DR5 veut que « l'écran n'affiche que les membres déjà reconnus sur ce poste ». Un poste qui a vu trois membres porte donc trois jetons. Le serveur lit **au plus 8** cookies de préfixe `zwadj_dv_` par requête (borne dure, le reste est ignoré) et les cherche d'un coup par `token_hash IN (…)`.

### 2.3 CSRF du cookie d'appareil et du cookie de session — réponse mesurée

- Aucune route qui lit l'un ou l'autre n'est `@Public()` ; toutes passent par `JwtAuthGuard` (qui exige le Bearer) : **une requête inter-origines est refusée en 401 avant que le cookie soit regardé**. L'exposition au CSRF est **nulle par construction**, pas par un jeton anti-CSRF.
- Défense en profondeur sans coût : `SameSite=Strict` et `Path` restreint. ⚠ **Hypothèse de déploiement, la même que celle de `zwadj_rt`** (`lax` n'est pas non plus envoyé sur un `fetch` entre sites différents) : l'application Pro et l'API sont du **même site registrable** (en développement, `localhost` ne distingue pas les ports). Le dépôt ne fixe pas les domaines de production : si Pro et API étaient sur deux sites, **les deux cookies existants et les deux neufs tomberaient ensemble** — ce n'est pas un risque propre à ce lot, mais le lot l'hérite.
- **Ce que cela ne couvre pas, écrit** : le **XSS**. Un script injecté dans l'application Pro peut appeler l'API avec le Bearer en mémoire et les cookies de la page. `HttpOnly` empêche seulement de **lire** les cookies, pas de les **utiliser**. C'est la même limite que le cookie de rafraîchissement.

### 2.4 Réponses d'échec (S-100)

- Session de personnel absente, finie, inactive, expirée, ou d'**une autre salle** : **401** `STAFF_SESSION_REQUIRED`. Le client ne rejoue que sur 401 **`UNAUTHENTICATED`** (M10) : ce 401-là **ne déclenche ni refresh ni boucle**, il remonte à l'écran de verrouillage (L36-4).
- Capacité manquante : **403** `STAFF_CAPABILITY_DENIED`. Rôle de compte manquant : inchangé (`RolesGuard`, 403 `FORBIDDEN`).
- Tous ces codes sont des **codes d'erreur de `@zwadj/types`** avec leur message FR **et** AR (parité testée), comme `AuthErrorCode`.

### 2.5 L'ordre des gardes APRÈS le lot, et ce qu'il prouve

```
ThrottlerGuard → JwtAuthGuard → RolesGuard → StaffSessionGuard (neuf, 4ᵉ)
```

- **Après `RolesGuard`** : un `CLIENT` ou un `ADMIN` reçoit sa réponse habituelle (403) et ne voit **jamais** un code du personnel. Le garde neuf ne s'applique que si `request.user.role === PRO`.
- **Fermé par défaut** (même doctrine que D6 et D119) : le garde s'applique à **toute** route authentifiée atteignable par un PRO, **sauf** celles qui portent `@StaffExempt()`. Une route neuve est donc couverte le jour où elle apparaît. **Liste blanche écrite : cinq routes** — `GET /auth/me`, `POST /pro/staff/activate`, `POST /pro/staff/login`, `GET /pro/staff/session`, `POST /pro/staff/pin-login` ; `/auth/refresh`, `/auth/logout`, `/health`, `/media/:key` sont `@Public()` et ne passent pas par ce garde.
- Le garde relit `pro_profiles.staff_layer_enabled_at` **à chaque requête** (jamais dans le jeton — c'est ce qui rend vrai « la couche activée pendant qu'un Pro est connecté »). Colonne nulle : `return true`, **aucune autre lecture** ⇒ l'app Pro marche comme aujourd'hui (M23).
- **La preuve demandée par la consigne** s'écrit comme un test d'intégration **dérivé du routeur** (le collecteur de D119 existe, M09 : il parcourt `ModulesContainer`), jamais comme une liste : *pour chacune des 55 routes atteignables par un PRO* — avant l'activation, la réponse n'est pas `STAFF_SESSION_REQUIRED` ; après, sans session, elle l'est (sauf les cinq) ; avec la session d'**une autre salle**, elle l'est ; un `ADMIN` ne la voit jamais. Ajouter une route la met sous test sans toucher au fichier.

---

## 3. ORDRE DES VERROUS ET NON-INTERBLOCAGE (consigne 3 c)

### 3.1 Ordre total proposé (S-101)

| rang | objet verrouillé | pris par |
|---|---|---|
| **L1** | la ligne `pro_profiles` du pro (`SELECT … FOR UPDATE`, ou l'`UPDATE` de `staff_layer_enabled_at`) | activation ; **toute opération qui peut réduire le nombre de Managers actifs** (désactivation) |
| **L2** | les lignes `pro_staff_members` (par `id` croissant s'il y en a plusieurs) | désactivation, réinitialisation, changement de mot de passe, **et l'`UPDATE` atomique des compteurs** (mot de passe, PIN) |
| **L3** | les lignes `pro_staff_devices` | création et révocation d'appareils |
| **L4** | les lignes `pro_staff_sessions` | création, fin, et le « toucher » d'activité du garde |

**Règle** : une transaction ne prend jamais un verrou de rang inférieur à celui qu'elle tient déjà. Sans cycle possible dans l'ordre d'acquisition, **aucun interblocage n'existe** — c'est l'argument, pas un test qui n'en a pas trouvé.

### 3.2 Ce qui le rend vrai pour chaque chemin

- **Compteur de PIN** : une **seule instruction** `UPDATE … RETURNING` sur la ligne du membre (L2), pas de transaction multiple, aucun autre verrou tenu.
- **« Jamais zéro Manager »** : la désactivation prend **L1 d'abord**, compte les Managers actifs **sous ce verrou**, puis écrit L2 puis L4. Deux désactivations simultanées se **sérialisent sur L1** : la seconde voit un seul Manager actif et refuse (409). Aucune désactivation ne prend L2 avant L1.
- **Connexion ‖ désactivation** : la connexion fait un check-and-set sur la ligne du membre (`WHERE status = 'ACTIVE'`, compte = 1 exigé, D305) **avant** d'insérer la session ; la désactivation prend L2 avant de finir les sessions (L4). Même ordre L2 → L4 des deux côtés.
- **Le garde** (un `UPDATE … RETURNING` sur la session, L4, qui **joint** le membre en lecture sans le verrouiller) ne prend jamais L2.
- **Aucune garde base** pour « jamais zéro Manager » : elle exigerait un déclencheur différé, qui est un objet **hors de la tranche ratifiée** (DR8). La garde est le verrou de ligne + le test concurrent (MP-12). C'est une limite écrite (§ 9).

---

## 4. MODES DE DÉFAILLANCE (consigne 3 d) — « un mode qui n'y est pas ne se code pas » (D126)

Colonnes : **garde serveur** · **garde base** (« — » : aucune, dit pourquoi) · **mesure** · **lot** (§ 6 : `1` = 3a-1, `2` = 3a-2, `P` = 3b). Les seize premiers sont ceux de la consigne.

| # | mode | garde serveur | garde base | mesure | lot |
|---|---|---|---|---|---|
| MP-1 | 20 essais de PIN parallèles = **exactement 3 comptés** | compteur atomique **réservé AVANT la vérification** (`UPDATE … SET pin_failed_count + 1 … WHERE pin_locked_at IS NULL AND pin_failed_count < 3 RETURNING`) : seuls les 3 premiers vérifient ; ⚠ un compteur incrémenté APRÈS vérification laisserait N requêtes parallèles faire N vérifications | `CHECK pin_failed_count BETWEEN 0 AND 3` (dans la tranche) | int-spec : 20 requêtes concurrentes, 3 `pin_failed_count`, 3 vérifications HMAC (espion), 17 refus « verrouillé » non comptés | P |
| MP-2 | un PIN sans jeton d'appareil | la route refuse sans cookie `zwadj_dv_*` reconnu ; le PIN seul n'est jamais lu | `token_hash UNIQUE` | int-spec : PIN correct sans cookie → refus, compteur inchangé | P |
| MP-3 | le jeton d'appareil d'un **autre membre** / d'**une autre salle** | l'appareil trouvé doit avoir `member_id` = le membre visé **et** ce membre `pro_profile_id` = celui du compte commun (JWT) | FK `member_id`, FK `pro_profile_id` | int-spec à deux salles, deux membres : quatre croisements, tous refusés | 1 (salle) · P (membre) |
| MP-4 | la session d'un membre **désactivé** | le garde joint le statut du membre ; `DISABLED` → refus et fin `DISABLED` | — (cohérence `status`/`disabled_at` : extension proposée, § 5.3) | int-spec : désactivation par SQL direct puis requête ; puis par la route (lot 2) | 1 · 2 |
| MP-5 | un changement de mot de passe qui ne mettrait pas fin aux sessions | les AUTRES sessions du membre prennent `ended_at`, `end_reason = PASSWORD_CHANGED` ; la session courante et l'appareil restent (S-105) | — | int-spec : deux sessions, changement depuis l'une, l'autre refusée | 1 |
| MP-6 | **deux Managers se désactivent l'un l'autre en même temps** | § 3.2 : L1 puis comptage sous verrou | — (déclencheur différé hors tranche, § 3.2) | int-spec : 2 Managers, 2 requêtes simultanées répétées 30 fois ; invariant : **toujours 1 Manager actif** | 2 |
| MP-7 | la couche **activée pendant qu'un Pro est connecté** | le garde relit le drapeau à chaque requête ; 401 `STAFF_SESSION_REQUIRED` à la requête suivante | — | int-spec : Bearer valide, requête avant / après l'activation par un autre appel | 1 |
| MP-8 | compte inconnu / mauvais mot de passe : **même réponse, même coût** | même code (`STAFF_INVALID_CREDENTIALS`), même corps ; le compte inconnu paie `verifyAgainstDummy` | — | unit : **espion sur le nombre d'appels `argon2.verify`** (pas un chronomètre : D290) ; int-spec : corps identiques à l'octet | 1 |
| MP-9 | nom de compte **normalisé** (casse, diacritiques, variantes de lettres arabes) et **unique par salle** | `account_name_key` = fonction pure partagée (S-110) | `UNIQUE (pro_profile_id, account_name_key)` (dans la tranche) | unit : table de cas FR/AR (≥ 12 paires équivalentes, ≥ 6 paires distinctes) ; int-spec : deux noms équivalents → le second refusé par la base, traduit en erreur métier | 1 |
| MP-10 | PIN trivial refusé | le générateur re-tire tant que le tirage est trivial (liste fermée : répétés, suites, `1234`…) | — | unit : tirage borné, aucun trivial sur 100 000 tirages | P |
| MP-11 | PIN / mot de passe / jeton **jamais en clair** hors de son unique affichage | une seule route rend le PIN (`Cache-Control: no-store`) ; le journal n'en porte aucun ; les journaux de requête rédigent `req.headers.authorization` et `req.headers.cookie` (`app.module.ts:30`) **mais PAS le `Set-Cookie` sortant : mesuré (M27), il est journalisé en clair** — c'est un défaut **existant** pour `zwadj_rt`, que les deux cookies neufs hériteraient (S-112, SIG-1) | — | int-spec : tout le corps des lignes `audit_logs` et **la sortie réelle du journal des requêtes** testés contre les valeurs posées en cookie ; garde de **source** : aucun `logger.*` ne reçoit un champ secret | 1 · 2 · P |
| MP-12 | secret HMAC **absent en production** : démarrage refusé | `PROD_REQUIRED_EXPLICIT` + `min(32)` | — | `env.spec.ts` : production sans la variable → exception qui nomme la variable | P |
| MP-13 | inactivité 10 min **côté serveur**, plafond 12 h | un `UPDATE … WHERE ended_at IS NULL AND last_activity_at > now() − 10 min AND expires_at > now() RETURNING` (heure de la **base**, S-101) ; 0 ligne → 401, et la fin `IDLE` s'écrit | `expires_at > created_at` (extension proposée) | int-spec : `vi.setSystemTime` n'agit pas sur la base → **la session est vieillie par SQL**, trois cas : juste avant, juste après, plafond | 1 |
| MP-14 | mot de passe temporaire : 7 jours, changement obligatoire | `must_change_password` : le garde n'admet que `POST /pro/staff/password` et `logout` ; un temporaire expiré est refusé (S-104) | — | int-spec : tout le reste → 403/401 tant que le changement n'est pas fait | 2 |
| MP-15 | verrouillage au 3ᵉ échec ; déblocage **par nom de compte + mot de passe seulement**, avec un **nouveau PIN** | `pin_locked_at` posé par la réservation n° 3 ; seule la connexion par mot de passe l'efface et génère le PIN ; les sessions du membre prennent `PIN_LOCKED` | — | int-spec : verrou, PIN correct refusé, mot de passe → PIN neuf, ancien PIN mort | P |
| MP-16 | 5 échecs de mot de passe = **pause de 15 min, jamais définitive** | même schéma que MP-1 (réservation avant vérification) avec `password_locked_until = now() + 15 min` ; le compteur repart après l'échéance | — | int-spec : 20 mauvais mots de passe parallèles → ≤ 5 `argon2.verify` ; après 15 min (vieillissement SQL) : la connexion réussit | 1 |
| MP-17 | **20 mauvais mots de passe parallèles ne déclenchent pas 20 `argon2`** (coût : 64 Mio chacun) | idem MP-16 | — | idem MP-16 (espion) | 1 |
| MP-18 | **cross-salle** : la session du membre de la salle A présentée avec le Bearer de la salle B | le garde exige `session.member.pro_profile_id` = salle du JWT | FK | int-spec à deux salles | 1 |
| MP-19 | **jeton rejoué** après `logout`, après fin `DISABLED`, après réinitialisation | `ended_at` renseigné → refus immédiat (« révocable à l'instant ») | — | int-spec : requête avec l'ancien cookie, 401 | 1 · 2 |
| MP-20 | **route Pro neuve oubliée** de la liste des exemptions | fermé par défaut (§ 2.5) | — | int-spec dérivé du routeur (M09) | 1 |
| MP-21 | **EMPLOYEE écrit** sur salle / prix / prestations / personnel / compte commun | garde de capacités (S-107) : 403 `STAFF_CAPABILITY_DENIED` | — | int-spec dérivé du routeur : chaque écriture non déclarée « employé » refusée | 2 |
| MP-22 | **activation concurrente ×2** | `UPDATE pro_profiles SET staff_layer_enabled_at = now() WHERE id = $1 AND staff_layer_enabled_at IS NULL`, **compte = 1 exigé** (D305) | — | int-spec : 10 activations simultanées → 1 Manager, 9 refus | 1 |
| MP-23 | activation **sans e-mail vérifié** ou par un non-propriétaire | `users.email_verified_at` non nul, rôle `PRO`, profil trouvé par `user_id` | — | int-spec | 1 |
| MP-24 | mot de passe **courant** ou **réutilisé** | refus par liste fixe (S-111) ; le « précédent » est le hachage courant, comparé avant remplacement — **aucune colonne de plus** | — | unit : table de cas | 1 |
| MP-25 | mot de passe **expiré** (90 j) | connexion admise seulement vers « changement obligatoire » (S-104) | — | int-spec (vieillissement SQL) | 2 |
| MP-26 | PIN **expiré** (90 j) | `pin_expires_at < now()` → connexion par PIN refusée, PIN neuf seulement par mot de passe | — | int-spec | P |
| MP-27 | appareil **expiré ou révoqué** | `expires_at`, `revoked_at` testés dans la même requête que `token_hash` | `expires_at ≤ pin_expires_at` : **inexprimable en SQL entre deux tables** → applicatif | int-spec | P |
| MP-28 | **cookies d'appareil en excès** (plus de 8) | borne dure de lecture (§ 2.2) | — | unit + int-spec | P |
| MP-29 | **réinitialisation** par le Manager | révoque sessions, appareils, efface le PIN, remet `must_change_password`, mot de passe temporaire de 7 jours | — | int-spec | 2 |
| MP-30 | **désactivation** | sessions finies `DISABLED` dans la même transaction | — | int-spec | 2 |
| MP-31 | un **Manager se désactive lui-même** | permis sauf s'il est le dernier | — | int-spec | 2 |
| MP-32 | un **EMPLOYEE** crée / réinitialise / désactive | 403 | — | int-spec dérivé (MP-21) | 2 |
| MP-33 | **audit** : une ligne par action de personnel, `actor_member_id` renseigné, **aucune donnée secrète** | écrite dans la **même transaction** que l'action (comme la promotion de D339) | FK `actor_member_id` `ON DELETE SET NULL` (dans la tranche) | int-spec : une ligne par action ; garde de source : `before`/`after` ne reçoivent que des objets listés | 1 · 2 · P |
| MP-34 | **ADMIN et CLIENT** jamais concernés | le garde sort si `role !== PRO` | — | int-spec dérivé du routeur | 1 |
| MP-35 | **avant toute activation, rien ne change** | un `staff_layer_enabled_at` nul court-circuite | — | **la suite e2e existante, inchangée** (M23) + les suites d'intégration existantes | 1 |
| MP-36 | **débit** des routes neuves | clés `AUTH_THROTTLE` neuves (`staffLogin`, `staffPin`, `staffActivate`) — **le même levier** (D128) | — | `throttle.int-spec.ts` étendu | 1 · P |
| MP-37 | **cookies** : attributs, noms, `Path` | un module pur `staff-cookies.ts` | — | unit : tous les attributs, `Secure` suit `AUTH_COOKIE_SECURE` | 1 |
| MP-38 | **migration sur base non vide** | écrite à la main (D186) | — | `migration-non-empty.int-spec.ts` retargé (D123) | 1 |
| MP-39 | **parité FR = AR** de tous les messages d'erreur | — | — | test de parité i18n existant | 1 · 2 · P |
| MP-40 | **un seul `Manager` à l'activation** et il est actif | l'activation crée Manager + appareil + session dans une transaction | — | int-spec | 1 |
| MP-41 | **dérive de l'horloge** entre l'API et la base | tout ce qui se décide en SQL utilise `now()` de la base ; les modules purs reçoivent `now` en paramètre | — | garde de source : aucun `new Date()` dans les services du personnel | 1 · 2 · P |
| MP-42 | **la tranche est exécutée par `prisma migrate dev`** par erreur | interdit (AGENTS.md) ; la migration est écrite à la main | — | sonde de dérive de D334 rejouée | 1 |
| MP-43 | **un seul levier de la durée d'inactivité** | constante exportée de `@zwadj/types` (10 min, 12 h, 15 min, 7 j, 90 j) — « paramètres, pas des colonnes figées » (DR5) | — | garde de source : aucun littéral de durée hors de ce module | 1 · 2 · P |
| MP-44 | **recours si un Manager perd son mot de passe et qu'il n'y en a pas d'autre** | **aucun dans ce lot** (pas de route ADMIN, consigne 3 a) : procédure manuelle (SQL), à écrire au backlog | — | — (limite, § 9) | hors |

---

## 5. FICHIERS, MIGRATION, CONTRATS, CAPACITÉS (consigne 3 e)

### 5.1 Contrats neufs — **à nommer et à ratifier** (CLAUDE.md : « s'arrêter et demander avant un nouveau contrat d'API »)

Préfixe de route proposé : `/api/v1/pro/staff` (comme `/pro/clients`, K-1 à K-3b). Tous derrière `JwtAuthGuard` ; `RolesGuard` : `@Roles(PRO)`.

| K | route | qui | ce qu'elle fait | lot |
|---|---|---|---|---|
| **K-14** | `POST /pro/staff/activate` | propriétaire (compte commun, e-mail vérifié), exemptée | crée le Manager, pose `staff_layer_enabled_at`, un appareil et une session ; rend le membre (et, en 3b, le PIN **une fois**) | 1 |
| **K-15** | `POST /pro/staff/login` | un membre, exemptée | nom de compte + mot de passe → appareil (si nouveau sur ce poste) + session ; `mustChangePassword` ; (3b : PIN neuf si absent, expiré ou verrouillé) | 1 |
| **K-16** | `POST /pro/staff/logout` | le membre | fin de la session courante (`LOGOUT`) ; l'appareil reste | 1 |
| **K-17** | `GET /pro/staff/session` | exemptée | état : couche activée ?, session courante, membres reconnus sur ce poste (nom de compte et rôle, rien d'autre) | 1 |
| **K-18** | `POST /pro/staff/password` | le membre (admis même en « changement obligatoire ») | change son mot de passe ; fin des AUTRES sessions | 1 |
| **K-19** | `GET /pro/staff/members` | Manager | liste des membres de la salle | 2 |
| **K-20** | `POST /pro/staff/members` | Manager | crée un membre ; **mot de passe temporaire rendu une fois** (`no-store`) | 2 |
| **K-21** | `POST /pro/staff/members/:id/reset-password` | Manager | nouveau temporaire ; révoque sessions et appareils (et PIN) | 2 |
| **K-22** | `POST /pro/staff/members/:id/disable` | Manager | désactive ; « jamais zéro Manager » | 2 |
| **K-23** | `POST /pro/staff/pin-login` | un membre reconnu, exemptée | `{ memberId, pin }` + cookie d'appareil → session ; compteur atomique | P |

⚠ **Chaque route neuve doit aussi apparaître dans `packages/api-client`** avec son chemin **en toutes lettres dans l'appel** (D182) : sans cela le test de contrat ne la voit pas. Aucune n'est consommée par un écran avant L36-4.

### 5.2 La tranche ne dit pas la nullabilité — lecture proposée (**DR8 : à ratifier avant toute migration**)

La tranche (`ZWADJ_CONTINUITE.md:2129-2133`) ne marque `NULLABLE` que `staff_layer_enabled_at`, `created_by_member_id`, `actor_member_id`. Lecture proposée pour le reste :

| colonne | proposition | motif |
|---|---|---|
| `pro_staff_members.pin_hash`, `pin_generated_at`, `pin_expires_at`, `pin_locked_at` | **NULL** | pas de PIN avant le premier affichage (3b) ; un verrou n'existe pas tant qu'il n'a pas eu lieu |
| `…members.disabled_at`, `last_login_at`, `password_locked_until` | **NULL** | cycle de vie |
| `…members.password_hash`, `password_changed_at`, `password_expires_at`, `account_name`, `account_name_key`, `role`, `status` | **NOT NULL** | un membre existe avec un mot de passe |
| `…members.must_change_password`, `password_failed_count`, `pin_failed_count` | **NOT NULL**, défauts `false`, `0`, `0` | |
| `…members.status` | défaut `ACTIVE` | |
| `pro_staff_devices.last_used_at`, `revoked_at` | **NULL** | |
| `pro_staff_devices.member_id`, `token_hash`, `label`, `created_at`, `expires_at` | **NOT NULL** | |
| `pro_staff_sessions.ended_at`, `end_reason` | **NULL** | session ouverte |
| `pro_staff_sessions.device_id` | **NOT NULL** | une session naît d'une connexion qui crée ou reconnaît un appareil (DR5, `:2109`) |

### 5.3 Garanties de base proposées **hors de la tranche** (extensions, DR8 : à soumettre, **pas écrites**)

La tranche ne porte qu'**une** `CHECK` (`pin_failed_count`) et **un** `UNIQUE` composite (+ les `UNIQUE (token_hash)`). Proposées, chacune parce qu'une garde serveur seule ne suffit pas : (a) `status = 'DISABLED'` ⇔ `disabled_at IS NOT NULL` ; (b) `pin_hash`, `pin_generated_at`, `pin_expires_at` tous nuls ou tous non nuls ; (c) `ended_at` et `end_reason` tous deux nuls ou tous deux non nuls ; (d) `expires_at > created_at` sur sessions et appareils ; (e) `password_failed_count >= 0` ; (f) `account_name_key <> ''`. **Un déclencheur** pour « jamais zéro Manager » : **non proposé** (§ 3.2).

### 5.4 Table des capacités par rôle (défaut de DR5 ; Q7 reste à confirmer par la salle pilote)

Une **table dans `@zwadj/types`** (donnée, pas code) : `capacités → rôles autorisés`, et une fonction pure `peut(role, capacité)`. Changer la décision de la salle pilote = changer **une ligne**.

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

### 5.5 Table des fichiers (chemins complets — **propositions de noms**, l'extension 1 de la table d'ouverture les fixera avant les rouges)

Convention reprise de `apps/api/src/clients/` (port `*-store.types.ts`, adaptateur `*-store.prisma.ts`, module pur `*-policy.ts`).

| lot | fichier | pour |
|---|---|---|
| 1 | `apps/api/prisma/migrations/<horodatage>_staff_layer/migration.sql` | **toute la tranche** (une seule migration, les colonnes de PIN comprises : 3b n'a alors aucun schéma à changer) |
| 1 | `apps/api/prisma/schema.prisma`, `apps/api/test/int/migration-non-empty.int-spec.ts` | déclarations, sonde retargée |
| 1 | `packages/types/src/staff.ts`, `packages/types/src/staff-account-name.ts`, `packages/types/src/index.ts` | codes d'erreur, schémas Zod, constantes de durée, normaliseur du nom de compte |
| 1 | `apps/api/src/staff/staff.module.ts`, `staff-session.controller.ts`, `staff-session.service.ts`, `staff-session.guard.ts`, `staff-decorators.ts`, `staff-cookies.ts`, `staff-store.types.ts`, `staff-store.prisma.ts`, `staff-session-policy.ts`, `staff-password-policy.ts` | la couche, le garde, le transport |
| 1 | `apps/api/src/app.module.ts`, `apps/api/src/config/env.ts` (pas de variable en 1), `apps/api/src/auth/auth.throttle.ts`, `apps/api/src/auth/auth.controller.ts` (`@StaffExempt()` sur `me`) | câblage |
| 1 | `packages/api-client/src/staff-client.ts` | K-14 à K-18 |
| 1 | `packages/i18n/messages/fr.json`, `ar.json` | erreurs |
| 1 | `apps/api/src/staff/*.spec.ts`, `apps/api/test/int/staff-*.int-spec.ts`, `neutralisation/neutralize-r<NN>.py` | tests, harnais |
| 2 | `staff-members.controller.ts`, `staff-members.service.ts`, `staff-capabilities.ts` (+ extension du store) | personnel et capacités |
| 2 | **déclarations de capacité** sur 7 contrôleurs existants (`availability-blocks`, `availability`, `bookings-pro`, `visit-bookings`, `quotes`, `quote-document`, `pro-clients`) | S-107 |
| 2 | `apps/api/src/clients/pro-clients.service.ts` | **les lignes d'audit « création et modification de fiche »** que DR5 liste : c'est du code du rang 41, déjà livré — à ratifier comme périmètre |
| P | `staff-pin.ts` (générateur, liste des PIN triviaux), `staff-pin-hasher.ts`, extension du store (compteur atomique), `K-23` | PIN, verrouillage |
| P | `apps/api/src/config/env.ts`, `.env.example` (nom seul, jamais de valeur : D200) | secret HMAC |

---

## 6. TAILLE ET DÉCOUPAGE (consigne 3 f)

### 6.1 Ce qui est mesuré, ce qui est estimé

**Mesuré (M24 à M26).** L36-2 : 44 fichiers (4 ajoutés, 40 modifiés), 3 840 insertions dont **674 de production et de configuration** et **2 237 de tests**, 17 fichiers de test, 8 fichiers de harnais, 45 lignes de migration, **+145 tests unitaires, +52 d'intégration**, **deux sessions**. Rapport tests/production : **3,3**.

**Estimé — pas mesuré, et dit comme tel.** Entrées : 10 routes neuves (K-14 à K-23), une migration de 3 tables, 3 énumérations et 2 colonnes, un garde global et un transport par cookies, 44 modes (§ 4). À environ 60 lignes de production par route (contrôleur, service, store, schéma) ≈ 600 ; migration ≈ 150 ; modules purs ≈ 350 ; garde, cookies, décorateurs ≈ 250 ; types, contrats, messages, client ≈ 500 ⇒ **≈ 1 900 lignes de production**, soit **≈ 2,8 × les 674 de L36-2**, et, au rapport de 3,3, **≈ 6 000 lignes de tests**.

### 6.2 La frontière de R-5, éprouvée contre la tranche

| proposition de R-5 | verdict du relevé |
|---|---|
| `L36-3a` = membres, mots de passe, sessions, garde global, capacités | cohérent… |
| `L36-3b` = **appareil**, PIN, verrouillage | ✗ **L'appareil ne peut pas être en 3b** : `pro_staff_sessions.device_id` (tranche, `:2132`) exige un appareil pour toute session, et DR5 (`:2109`) pose le cookie d'appareil à la connexion par mot de passe. |

**Frontière corrigée proposée** : le **PIN** seul fait le second lot (il se greffe sur une identité par mot de passe complète). Tout le reste — appareil compris — est le premier. C'est la même intention que R-5 (« un chemin d'identité à moitié écrit est pire que deux lots entiers »), appliquée à la contrainte réelle.

### 6.3 …et le premier lot corrigé est encore trop gros : trois lots

Le premier lot corrigé porte 9 des 10 routes, la migration, le garde, le transport, les capacités et ≈ 1 500 des 1 900 lignes de production : **≈ 2,2 × L36-2**, deux sessions pour un lot qui, lui, avait un écran et un PDF. Une **coupe verticale** existe qui garde chaque morceau complet et testable de bout en bout par l'API :

| lot | contenu | routes | production (est.) | tests (est.) | rapport à L36-2 |
|---|---|---|---|---|---|
| **L36-3a-1 · « la couche et son Manager »** | migration (**toute la tranche**), garde global fermé par défaut, transport des cookies, activation, connexion, déconnexion, état de session, changement de mot de passe, pause de 5 échecs, inactivité et plafond, audit ; **un seul rôle utilisable : MANAGER** (donc aucune matrice de capacités) | K-14 à K-18 (5) | ≈ 1 000 | ≈ 3 300 | **≈ 1,5 ×** |
| **L36-3a-2 · « le personnel et ses capacités »** | création, liste, réinitialisation, désactivation ; mot de passe temporaire et expiré ; table des capacités et ses déclarations sur sept contrôleurs ; « jamais zéro Manager » ; audit des fiches | K-19 à K-22 (4) | ≈ 500 | ≈ 1 650 | ≈ 0,75 × |
| **L36-3b · « le PIN »** | secret HMAC et refus au démarrage, générateur, compteur atomique de 3 essais, verrouillage et déblocage, expiration, route de connexion par PIN ; amendement des réponses de K-14, K-15, K-18 (le PIN rendu une fois) | K-23 (1) + 3 amendées | ≈ 400 | ≈ 1 300 | ≈ 0,6 × |

Aucun des trois ne laisse un chemin d'identité à moitié écrit : **3a-1** livre une couche complète (un Manager se connecte, la couche est exigée partout, rien n'est activable par un écran avant L36-4) ; **3a-2** ajoute des membres à une couche déjà exigée ; **3b** ajoute un accélérateur à une couche déjà complète. Le plus lourd, **3a-1**, est aussi celui qui porte les risques majeurs (garde global, cookies, migration) et mérite donc d'être seul.

*Si le relecteur préfère deux lots* (3a = 3a-1 + 3a-2, puis 3b) : c'est possible, mais 3a pèse alors ≈ 2,2 × L36-2 — la taille qui a déjà coûté deux sessions.

### 6.4 Ce que la découpe change pour la méthode

Chaque lot garde les rouges avant le code, son harnais, sa lecture adverse et son contrôle de fin de lot. **Le lot 3b est un lot d'un chemin d'identité (PIN, verrouillage)** : la première condition de Ko du 14/10 (D332) y rattacherait une certification immédiate, que R-2 met en pause avec la pause de Ko — rien de neuf à décider.

---

## 7. DÉCISIONS DE LA SESSION À RATIFIER (S-98 à S-112) — aucune n'est une parole de Ko

*Chacune dit ce qu'elle change pour Ko.*

- **S-98 — Un 4ᵉ garde global `StaffSessionGuard`, après `RolesGuard`, fermé par défaut.** *Pour Ko :* une route Pro oubliée est protégée, jamais ouverte.
- **S-99 — Deux jetons en cookies `HttpOnly`/`SameSite=Strict`** (session : `zwadj_ss` ; appareil : un cookie par membre), `Secure` suit le levier existant. *Pour Ko :* le front n'a rien à stocker ; aucune protection CSRF supplémentaire n'est nécessaire parce que le Bearer reste seul à authentifier.
- **S-100 — 401 `STAFF_SESSION_REQUIRED` / 403 `STAFF_CAPABILITY_DENIED`**, jamais le code que le client rejoue. *Pour Ko :* une session de personnel expirée n'éjecte pas le compte commun.
- **S-101 — Le temps se décide dans la base** (`now()`), l'ordre des verrous L1 < L2 < L3 < L4. *Pour Ko :* pas de décalage d'horloge entre l'API et la base, pas d'interblocage.
- **S-102 — Les compteurs (mot de passe, PIN) se réservent AVANT la vérification.** *Pour Ko :* vingt essais simultanés comptent trois, et ne coûtent pas vingt `argon2`.
- **S-103 — Pendant une pause de mot de passe, la réponse porte un code distinct** (`STAFF_LOGIN_PAUSED`, avec la durée restante). *Pour Ko :* le vrai Manager comprend pourquoi son bon mot de passe échoue ; en échange, quelqu'un qui détient déjà la session du compte commun apprend qu'un nom existe, après cinq échecs sur lui.
- **S-104 — Mot de passe de 90 jours expiré : connexion admise vers le seul changement ; temporaire de 7 jours expiré : refusé.** *Pour Ko :* un oubli de trois mois ne bloque pas la salle ; un temporaire oublié exige un nouveau passage par un Manager.
- **S-105 — Changer son mot de passe met fin aux AUTRES sessions ; la réinitialisation par un Manager met fin à TOUTES, révoque les appareils et le PIN.** *Pour Ko :* conforme à DR5 (`:2111`) pour la réinitialisation ; pour le changement personnel, DR5 se tait, la session prend le choix le plus sûr.
- **S-106 — L'activation ouvre aussi la session du Manager qu'elle crée.** *Pour Ko :* le propriétaire n'est pas renvoyé à l'écran de verrouillage une seconde après avoir tapé son mot de passe.
- **S-107 — Capacités : défaut fermé (écritures = MANAGER seul, lectures = tous), déclarations d'employé au niveau de la classe.** *Pour Ko :* la décision de la salle pilote (Q7) se change en une ligne de table.
- **S-108 — Le journal est `audit_logs` (une ligne par action, `actor_member_id`, sans secret) ; pas de table neuve.** *Pour Ko :* aucune nouvelle table de journal ; les lignes servent MS-3 (carnet des accès).
- **S-109 — Pas de port `Clock` ni `Random`** (M16 : aucun n'existe) : l'heure vient de la base ou d'un paramètre, l'aléa est passé en paramètre aux modules purs. *Pour Ko :* moins de code ; la cartographie « Patrons » de la consigne v3 est corrigée sur ce point (« à vérifier par la lecture adverse », elle disait).
- **S-110 — Normalisation du nom de compte :** NFKC, minuscules, retrait des diacritiques latins, retrait des voyelles brèves et du tatweel arabes, `أ إ آ ٱ → ا`, `ى → ي`, `ة → ه`, blancs comprimés. *Pour Ko :* « Amine » et « amine » sont le même compte, « أمين » et « امين » aussi ; **la liste des lettres arabes ramenées l'une à l'autre est à confirmer**.
- **S-111 — Mots de passe courants refusés par une liste fixe versée au dépôt ; réutilisation du précédent refusée en comparant au hachage courant.** *Pour Ko :* la liste (taille et provenance) est à fixer au lot 3a-1 ; aucune colonne de plus.
- **S-112 — Le lot 3a-1 masque `res.headers["set-cookie"]` dans le journal des requêtes AVANT de poser ses cookies** (une ligne d'`app.module.ts`, le fichier qu'il modifie déjà pour le garde), avec une garde qui lit la sortie réelle du journal. *Pour Ko :* les jetons de personnel ne finissent jamais dans les journaux ; **et la même ligne referme, au passage, la fuite déjà existante de `zwadj_rt`** (SIG-1) — si tu veux ce défaut réparé AVANT 3a-1, c'est un petit lot de code à part, à ordonner par toi, qui ne dépend de rien d'autre.

---

## 8. UNE QUESTION

**Le relecteur retient-il la découpe en trois lots (3a-1 « la couche et son Manager », 3a-2 « le personnel et ses capacités », 3b « le PIN »), ou en deux (3a, 3b) ?** Recommandation : trois (§ 6.3). C'est une décision de relecteur (R-5), pas une décision de produit pour Ko ; elle est posée ici parce que la session ne l'ouvre pas seule.

---

## 9. LIMITES — écrites pour ne pas se lire comme tenues

1. **Aucune garde base pour « jamais zéro Manager »** : elle exigerait un déclencheur différé hors tranche. La garde est le verrou de ligne et le test concurrent.
2. **Les garanties de base du § 5.3 sont des extensions** : sans la décision de Ko, la migration n'en porte aucune.
3. **Le recours administrateur d'un Manager sans second Manager n'existe pas** dans ce lot (pas de route ADMIN) : une salle activée dont l'unique Manager perd son mot de passe n'a pour issue qu'un SQL manuel. **Aucun client réel n'existe (DR1)** ; cette limite se lève avant le premier.
4. **L'audit « création et modification de fiche »** que DR5 liste modifie du code du rang 41 (`pro-clients.service.ts`). **« Recherche d'annuaire »** est au lot L36-5, hors de L36-3.
5. **Le lien de réinitialisation par e-mail** (DR5, `:2116`) n'est pas livré (hors lot, consigne 4).
6. **Le garde ajoute une lecture SQL par requête Pro** (le drapeau), puis un `UPDATE` par requête si la couche est active. Non mesuré ; à mesurer au lot 3a-1.
7. **Une limite de débit par IP sur le PIN** pénalise les foyers qui partagent une adresse (CGNAT, `auth.throttle.ts` le dit déjà) : la protection du PIN est le compteur **par membre**, pas l'IP.
8. **Faire tourner le secret HMAC invalide tous les PINs** (chaque membre se reconnecte par mot de passe) — c'est voulu, et à écrire dans la procédure de mise en service.
9. **Le XSS** (§ 2.3) : non couvert par ce transport, comme pour le cookie de rafraîchissement.
10. **La liste des mots de passe courants** (S-111) n'a pas de source arrêtée.
11. **Q7** (rôles de la salle pilote) reste ouverte ; la table la rend bon marché.
12. **SIG-1 est mesuré au niveau de pino-http, pas à travers l'application Nest démarrée** : la chaîne complète (`nestjs-pino`) n'a pas été rejouée.
13. **Rien n'est exécuté** : ni migration, ni test, ni harnais. Tout ce qui précède est une lecture du code à `ec44937` et une conception.
