# D355 — rang 57 — table d'ouverture

Lot : **les restes de L36-3a-2 — (i) une connexion ne survit plus à une réinitialisation (le défaut croisé que D354 a mesuré et rapporté) ; (ii) le journal de la création et de la modification d'une fiche CLIENT que DR5 liste** — consigne du relecteur « RANG 57 » du 19/11/2026, adoptée par Ko telle quelle (`docs/preuves/D355/consigne.md`, versée dans un commit suivant). Lot de **CODE**, **chemin d'identité**, méthode **RENFORCÉE** (R-3 de D340), sous la pause de certification (Ko, 22/10/2026) ; il **compte** (D283) : compteur POUR MÉMOIRE TRENTE-SIX → TRENTE-SEPT à la clôture.

- **SHA de départ** : `cc653dd9b1a74b319ab3fe6e0f4a6e5df18d1f2a` (clôture de D354). `HEAD` = `origin/main` après `git fetch` (les deux sur ce SHA), arbre propre (`git status --porcelain` : 0 ligne), aucun stash (0 ligne), branche `main`. Branches distantes gardées, relevées : `origin/front-client`, `origin/integration-45`, `origin/par-carte`.
- **Numéro** : D355 — pris en lisant le registre de `ZWADJ_CONTINUITE.md` : 309 lignes `| Dnnn |` (expression `^\| D(\d+) \|`), dernier numéro **354** ; `D355` ne figure dans aucun des quatre fichiers d'autorité (compte 0 sur le texte APLATI : 0, 0, 0, 0 ; caractères aplatis examinés : 4 685 461 ; calibré sur `D354`, qui rend 375, 12, 9 et 0, et sur un jeton impossible, qui rend 0 partout). **S-252** est le premier numéro de décision de la session (le plus grand `S-nnn` relevé est S-251, 1 249 occurrences examinées ; S-252 : 0 occurrence). S-239 à S-251 (D354) sont ratifiées par adoption (consigne, § 1 b).
- **Reprise (consigne, § 0), relevée avant toute écriture** : rang 56 CLOS (D354) ; compteur POUR MÉMOIRE TRENTE-SIX ; « RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat : L36-3b, le PIN), ligne 2792 de l'ordre des rangs ; `origin/main` = `cc653dd` ; arbre propre, sans stash, sur `main` ; **aucun écart**. Lus : `CLAUDE.md` et `AGENTS.md` (importés, en entier), `ZWADJ_CONTINUITE.md` (le bloc « ÉTAT À LA CLÔTURE DU RANG 56 », la section D354, l'ordre des rangs, le registre, le bloc DR1 à DR8 — la ligne « Journal » de DR5, ligne 2117 —, R-8 de D341, ligne 2364), `docs/preuves/D340/cadrage.md` (§ 4 MP-33, § 5.5 ligne « lot 2 », § 9 point 4), `docs/preuves/D354/mesures/` (`lecture-course.md`, `mesure-course.txt`, la pièce `course-connexion-reinitialisation.int-spec.ts`), l'entrée `[API][IDENTITÉ]` de « Reports du 19/11/2026 — rang 56 » du backlog.
- **Poste à l'ouverture** : **sur secteur** (`BatteryStatus` = 2, `PowerLineStatus` = Online, charge 100 %), RAM libre 3 475 Mo sur 16 095 Mo, `chrome` 0, `headless_shell` 0, `node` 0, Docker 29.8.0 lancé (`zwadj-db` « Up 3 days », port 5432), ports 3100, 3101, 5273 et 5274 libres. ⚠ La barre de RAM de D273 (4 579 Mo) est un critère de **certification**, en pause : elle n'est pas appliquée à des portes ordinaires, et ce relevé est noté pour que personne ne le lise comme tel. Sur batterie au moment d'une porte de clôture : aucune porte ne se lance (R-9 de D340).
- **Ce que la consigne décide** (texte complet dans `consigne.md`) : **R-1** — le défaut croisé d'abord : la pièce de D354 est PROMUE en test de la suite (c'est le rouge, versé avant le code) ; l'ouverture de session refuse si le mot de passe du membre a changé, ou si le membre a été désactivé ou réinitialisé, ENTRE la réservation de la tentative et l'ouverture — vérifié DANS la transaction qui ouvre la session, sur la ligne verrouillée (ordre des verrous S-101), par le plus petit moyen que le schéma permet SANS migration ; le refus a la même forme et le même coût qu'un mauvais mot de passe ; mesuré sur PostgreSQL réel par entrelacement forcé (patron S-243), aussi pour « connexion ‖ désactivation » ; le correctif vit à UN endroit, que le PIN réutilisera. **R-2** — la CARTE de tous les chemins qui créent ou modifient une fiche client, versée avant tout code ; pour chacun, une ligne `audit_logs` dans la MÊME transaction, `actor_member_id` renseigné quand une session de personnel existe, nul sinon ; `before` et `after` sans donnée inutile ; un échec forcé dans la transaction (patron de D349) ; rouges d'abord. **R-3** — la carte du journal de DR5, en entier, versée : pour chaque action que la ligne « Journal » liste, ce qui l'écrit aujourd'hui (fichier, test) ou « pas encore » avec le lot qui le doit ; rien d'autre n'est codé pour ce point. **R-4** — aucun écran, rien dans `apps/pro` ni `apps/client`, aucune migration, aucun contrat d'API neuf, aucun code d'erreur neuf (S-242), rien du chemin de l'argent ; la conversion d'un devis n'est touchée que pour sa ligne de journal, motif écrit — sinon ARRÊT. **R-5** — hors lot : le nom d'un membre désactivé qui reste pris, la réactivation et le changement de rôle, le recours d'un Manager seul, le PIN. **§ 1 b** — S-239 à S-251 ratifiées par adoption ; **S-248 est levée par ce lot**. **§ 1 c** — la question de D354 (faut-il auditer la fiche client ?) est répondue **OUI** : DR5 la liste, R-8 de D341 l'a rangée dans L36-3a-2, la consigne du rang 56 l'a mal lue (erreur du relecteur, nommée).
- **Relevé du code, par lecture, avant d'écrire** : **(a) le défaut croisé** — `StaffSessionService.login` (`apps/api/src/staff/staff-session.service.ts`, lignes 118 à 145) enchaîne la lecture du membre, la RÉSERVATION de la tentative (`reservePasswordAttempt`, qui rend le hachage lu), la vérification `argon2`, puis `openSession` ; le check-and-set d'`openSession` (`apps/api/src/staff/staff-store.prisma.ts`, ligne 222) ne conditionne que `id`, `pro_profile_id` et `status = 'ACTIVE'`, **pas le hachage** ; `ChangePasswordInput` porte, lui, `expectedPasswordHash` (ligne 342 : `password_hash = ${input.expectedPasswordHash}`), `OpenSessionInput` n'en porte aucun (`staff-store.types.ts`). Les colonnes qu'il faut existent (`password_hash`, `password_changed_at`, migration `20261104170000_staff_layer`, lignes 61-62) : **aucune migration n'est nécessaire** (R-1). **(b) les écritures d'une fiche** — recherche, dans `apps/api/src` (hors specs et code généré), de `INSERT INTO|UPDATE|DELETE FROM pro_client_records` et de `proClientRecord.(create|update|upsert|delete…)` : **quatre sites, dans deux fichiers** — `apps/api/src/clients/pro-client-store.prisma.ts` : `creerSiAbsente` (ligne 50, `INSERT … ON CONFLICT DO NOTHING`, K-2), `completerNoms` (ligne 69, `updateMany`, K-3), `modifier` (ligne 86, transaction et `update`, K-3b) ; `apps/api/src/venues/quote-store.prisma.ts` : `completerNomDuClient` (ligne 382, `proClientRecord.updateMany` ligne 407, K-5). **La conversion** (`apps/api/src/venues/quotes.service.ts`, `convert`, ligne 313) écrit une réservation et recopie le contact de son corps : elle n'écrit aucune fiche ; **le parcours sur place** est un enchaînement d'écrans de l'application Pro qui appellent K-1 à K-5 : il n'écrit rien lui-même. **(c) qui écrit `audit_logs` aujourd'hui** — `auditLog.create` : `staff-store.prisma.ts` (`ecrireAudit`, le seul site du module, dix actions `staff.*`), `quote-store.prisma.ts` (`quote.promote`, sans `actorMemberId`), `venues-admin.service.ts` (publier, rejeter), `account-deletion.service.ts` (deux décisions), `admin/first-admin.ts` (le script) ; **seul `ecrireAudit` renseigne `actorMemberId`**. Aucune ligne n'existe pour une fiche. **(d) le membre qui agit** — `@CurrentStaff()` (`staff-decorators.ts`) rend le contexte que le garde global pose sur la requête (`memberId`), `undefined` quand la couche est éteinte ; ni `ProClientsController` ni le contrôleur des devis ne le lisent aujourd'hui. **(e) fins de ligne**, relevées en OCTETS : les fichiers du module `staff/` sont en LF, ceux de `clients/` et de `venues/` en CRLF ; chaque fichier garde la sienne (vérifiée en octets après chaque édition).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 et D334 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) la consigne en pièce, la règle des portes (écrite et commitée AVANT les passes), la sortie de la lecture adverse de la consigne contre le dépôt, **les deux cartes (R-2 et R-3)** et le premier audit de secrets avec son tri — **avant tout `.md` d'autorité et avant tout code** ; (3) **les pièces des rouges** (sorties lues contre l'état d'avant, avec l'empreinte sha256 de chaque fichier de test joué) dans un commit **ANTÉRIEUR au premier commit de code** (D334, item 5) ; (4) le code et ses tests ; (5) le harnais, les campagnes, les portes ; (6) les trois `.md` d'autorité, **l'arbitrage de Ko en première écriture** ; (7) le contrôle de fin de lot, push puis fetch. Toute extension de cette table : un commit propre, **avant** le commit du fichier qu'elle couvre.
- **Règle d'arrêt** (consigne, § 0, R-1 et R-4) : un écart à la reprise ⇒ arrêt, et le dire. Une colonne qui manquerait ⇒ ARRÊT, rapport (DR8). La conversion d'un devis qui devrait changer autrement que par sa ligne de journal ⇒ ARRÊT.
- **Écrit pour ne pas se lire comme tenu** : cette table dit ce que le lot **prévoit** de toucher. Elle ne dit pas que le défaut croisé est corrigé ni qu'une fiche est journalisée : chacun se **mesure** (rouge d'abord, neutralisation ensuite) et se rapporte avec ses chiffres. ⚠ Les noms des actions du journal des fiches, la forme de leur charge utile et le choix du moyen du correctif (le hachage lu à la réservation plutôt que `password_changed_at`) sont des **propositions de la session** que la consigne ne fixe pas : elles s'écriront en décisions S-252 et suivantes, **à ratifier**, avec ce qu'elles changent pour Ko.

## A. Le départ

Voir les puces ci-dessus (SHA, numéro, reprise, poste, relevé du code). Aucun fichier n'est modifié à l'ouverture : ce fichier est le premier commit du lot.

## B. Les fichiers de CE lot — chemins COMPLETS

**La connexion ne survit plus à une réinitialisation** (R-1) — le port, l'adaptateur, le service et leurs specs ; l'aide de verrou de ligne des tests d'intégration ; le test neuf (la pièce de D354 PROMUE, plus les entrelacements forcés) :

```
apps/api/src/staff/staff-store.types.ts
apps/api/src/staff/staff-store.prisma.ts
apps/api/src/staff/staff-session.service.ts
apps/api/src/staff/staff-session.service.spec.ts
apps/api/src/staff/staff-store.prisma.spec.ts
apps/api/test/int/row-lock.ts
apps/api/test/int/staff-login-race.int-spec.ts
```

**Le journal des fiches client** (R-2) — le module pur du journal et son spec ; le port, l'adaptateur, le service et le contrôleur des fiches ; le port, l'adaptateur, le service et le contrôleur des devis (K-5 écrit une fiche) ; la garde de SOURCE qui liste chaque site d'écriture de la table ; le test d'intégration neuf :

```
apps/api/src/clients/client-record-audit.ts
apps/api/src/clients/client-record-audit.spec.ts
apps/api/src/clients/client-record-writes.spec.ts
apps/api/src/clients/pro-client-store.types.ts
apps/api/src/clients/pro-client-store.prisma.ts
apps/api/src/clients/pro-clients.service.ts
apps/api/src/clients/pro-clients.service.spec.ts
apps/api/src/clients/pro-clients.controller.ts
apps/api/src/venues/quote-store.types.ts
apps/api/src/venues/quote-store.prisma.ts
apps/api/src/venues/quote-store.prisma.spec.ts
apps/api/src/venues/quotes.service.ts
apps/api/src/venues/quotes.service.spec.ts
apps/api/src/venues/quotes.controller.ts
apps/api/test/int/client-record-audit.int-spec.ts
```

**Le harnais de neutralisation du lot** (chaque garde neuve est neutralisée, son échec LU) :

```
neutralisation/neutralize-r57.py
```

**Les pièces du premier versement** (la table elle-même, la consigne, la règle des portes écrite avant les passes, les deux cartes, la lecture adverse de la consigne et sa sortie) :

```
docs/preuves/D355/table-ouverture.md
docs/preuves/D355/consigne.md
docs/preuves/D355/regle-portes.md
docs/preuves/D355/carte-fiches.md
docs/preuves/D355/carte-journal-dr5.md
docs/preuves/D355/lecture-adverse/confronter-consigne.py
docs/preuves/D355/lecture-adverse/confronter-sortie.txt
docs/preuves/D355/lecture-adverse/lecture-adverse.md
```

Les autres pièces — audits de secrets et leurs tris, les sorties des rouges, la neutralisation, les campagnes touchées, les portes, la passe D277, le contrôle de fin de lot — sont déclarées par des **extensions**, en chemins COMPLETS, **avant** le commit qui les verse (aucun préfixe : une table par préfixe rendrait « 0 fichier non déclaré » vrai par construction).

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

```
ZWADJ_CONTINUITE.md
ZWADJ_BACKLOG.md
AGENTS.md
```

`AGENTS.md` : annotations seules (le compteur de la chaîne « AUCUN LOT NE PART DANS `main` SOUS UNE PORTE ROUGE… » ; l'invariant de la couche du personnel de D354, dont les phrases « une connexion dont le mot de passe a été vérifié AVANT une réinitialisation ouvre une session APRÈS elle… non corrigé » et « l'audit des FICHES client n'est PAS écrit (S-240…) » que ce lot périme ; un invariant neuf pour le journal des fiches). Aucune phrase n'est réécrite : barrée avec son motif, annotée (D276, D277).

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucune migration** (R-4 ; R-1 : aucune colonne ne manque), **aucun écran** (rien dans `apps/pro` ni `apps/client`), **aucun contrat d'API neuf** et **aucun code d'erreur neuf** (S-242) : **`packages/types` n'est pas touché**, `packages/api-client` non plus, ni `packages/i18n` (aucun message neuf : le refus d'ouverture est le même 401 `STAFF_INVALID_CREDENTIALS`). `apps/api/src/app.module.ts` n'est pas touché, aucune variable d'environnement.
- **La conversion d'un devis n'est PAS touchée** : elle n'écrit aucune fiche (relevé (b)), donc elle n'a pas de ligne de journal de fiche à porter. La carte (`carte-fiches.md`) le montre ; une garde de SOURCE (`client-record-writes.spec.ts`) le tient. Si la mesure disait autrement : ARRÊT (R-4).
- **Rien du chemin de l'argent** (R-4, D316 : par la fonction) : aucun montant, aucune transition de réservation ou de devis ; la ligne d'audit `quote.promote` n'est pas modifiée.
- **Hors lot** (consigne, R-5) : le PIN (L36-3b, rang 58 proposé), le nom d'un membre désactivé qui reste pris, la réactivation et le changement de rôle d'un membre, le recours d'un Manager seul, la recherche d'annuaire (L36-5). **Les autres lignes d'audit écrites par une route Pro** (`quote.promote` ne porte pas `actorMemberId`) sont **relevées** dans la carte du journal (R-3) et **rapportées** au backlog : elles ne sont pas corrigées ici (« un défaut croisé se RAPPORTE »).
- **`neutralisation/lancer-campagnes.py`** n'est pas modifié ; les campagnes que le lot touche sont **rejouées**, et ne sont modifiées que si une ancre est périmée (conditionnel ci-dessous).

## E. Les citations — recopiées PAR SCRIPT depuis les fichiers (jamais depuis la consigne ni de mémoire)

⛔ Chaque ligne ci-dessous est celle du fichier cité, à l'identique : le script `recopier-citations.py` (une PIÈCE, jamais promue en instrument ; **versée au commit suivant, par l'extension 1** — le premier commit du lot est cette table SEULE) cherche la ligne par son début, abandonne si elle n'est pas trouvée exactement une fois, et l'insère ; le contrôle d'après (`grep -F`) la retrouve dans le fichier source.

**DR5, la ligne « Journal » — `ZWADJ_CONTINUITE.md`, bloc DR1 à DR8 :**

- Journal : audit_logs.actor_member_id sur toute action de personnel (connexions, échecs, verrouillage, déblocage, création, réinitialisation, désactivation, recherche d'annuaire, création et modification de fiche).

**R-8 de D341 — `ZWADJ_CONTINUITE.md`, « ARBITRÉ LE … PAR KO — … » du rang 44 :**

- R-8. L'audit « création et modification de fiche » (DR5) et S-107 appartiennent à L36-3a-2, pas à ce lot. ⛔ *(D354, 19/11/2026 : **S-107 est CODÉE** (rang 56, R-2) ; **l'audit « création et modification de fiche » N'EST PAS écrit** — S-240 : la consigne du rang 56 (R-6) décrit l'audit des trois actions du PERSONNEL, que ce lot livre ; celui des FICHES CLIENT est la question du rapport de D354. Annoté, pas réécrit.)*

**Cadrage D340, § 4 — MP-33 (`docs/preuves/D340/cadrage.md`) :**

| MP-33 | **audit** : une ligne par action de personnel, `actor_member_id` renseigné, **aucune donnée secrète** | écrite dans la **même transaction** que l'action (comme la promotion de D339) | FK `actor_member_id` `ON DELETE SET NULL` (dans la tranche) | int-spec : une ligne par action ; garde de source : `before`/`after` ne reçoivent que des objets listés | 1 · 2 · P |

**Cadrage D340, § 5.5 — la ligne du « lot 2 » pour `pro-clients.service.ts` :**

| 2 | `apps/api/src/clients/pro-clients.service.ts` | **les lignes d'audit « création et modification de fiche »** que DR5 liste : c'est du code du rang 41, déjà livré — à ratifier comme périmètre |

**Cadrage D340, § 9 — la limite n° 4 :**

4. **L'audit « création et modification de fiche »** que DR5 liste modifie du code du rang 41 (`pro-clients.service.ts`). **« Recherche d'annuaire »** est au lot L36-5, hors de L36-3.

**D354, § 5 — S-248, que ce lot LÈVE :**

- **S-248** — **Le défaut croisé « connexion ‖ réinitialisation » est MESURÉ et RAPPORTÉ, pas corrigé.** *Pour Ko : une réinitialisation de sécurité a une fenêtre d'environ un `argon2` pendant laquelle l'ancien mot de passe peut encore ouvrir une session ; c'est une entrée de backlog à ordonner, avant le premier client réel.*

## Fichiers CONDITIONNELS (leur existence ou leur modification dépend d'un résultat)

Chacun n'est modifié que si **sa condition est remplie** ; le rapport de fin de lot dit lesquels l'ont été. Une ancre périmée se révise par **extension de cette table, AVANT le commit du harnais**, et la campagne est **rejouée EN ENTIER** (un harnais modifié en cours de campagne ⇒ campagne entière).

| fichier | condition |
|---|---|
| `neutralisation/neutralize-r44.py` | une ancre est périmée par ce lot : celle qui vise `reason: "memberInactive"` (le motif du refus d'ouverture change de nom si le refus couvre aussi un mot de passe remplacé) est **attendue** ; les autres ne se devinent pas, `verifier-harnais.py` les relève avant la campagne |
| `neutralisation/neutralize-r56.py` | l'une de ses ancres lit un fichier que ce lot modifie (`staff-store.prisma.ts`, `staff-session.service.ts` et leurs specs) et n'est plus trouvée |
| `neutralisation/neutralize-r41.py` | l'une de ses ancres lit `pro-client-store.prisma.ts`, `pro-clients.service.ts`, `quote-store.prisma.ts`, `quotes.service.ts` ou leurs specs et n'est plus trouvée |
| `neutralisation/neutralize-r43.py`, `neutralisation/neutralize-r39.py`, `neutralisation/neutralize-r42.py`, `neutralisation/neutralize-s10b.py`, `neutralisation/neutralize-booking-status.py` | leur campagne est désignée « touchée » par `lancer-touchees.py` ET l'une de leurs ancres lit un fichier modifié par ce lot et n'est plus trouvée |
| `apps/api/test/int/staff-helpers.ts` | une aide manque aux nouveaux tests d'intégration (une aide neuve, jamais une aide changée) |
| `apps/api/test/int/staff-login.int-spec.ts` | un test existant de la connexion contredit le comportement nouveau et doit être **corrigé**, la correction étant **déclarée** (empreinte avant et après) |

## Extensions de la table

*(chaque extension est un commit propre, avant le commit du fichier qu'elle couvre)*

### Extension 1 — les pièces du premier versement que la section B ne listait pas : le script de recopie des citations, la première passe de l'instrument de lecture adverse, l'audit de secrets « a » et son tri

Écrite **avant** le commit qui verse la consigne, la règle des portes, les deux cartes et la lecture adverse (et avant le commit des rouges, donc avant le premier commit de code : D334, point 5). Les fichiers déjà listés en B (`consigne.md`, `regle-portes.md`, `carte-fiches.md`, `carte-journal-dr5.md`, `lecture-adverse/confronter-consigne.py`, `lecture-adverse/confronter-sortie.txt`, `lecture-adverse/lecture-adverse.md`) entrent dans ce même commit. **Chemins COMPLETS des quatre fichiers que B ne listait pas** :

```
docs/preuves/D355/recopier-citations.py
docs/preuves/D355/lecture-adverse/confronter-sortie-passe-1.txt
docs/preuves/D355/audit-secrets-d355a.txt
docs/preuves/D355/tri-audit-d355a.txt
```

**Pourquoi `recopier-citations.py`** : la table d'ouverture dit (§ E) que ses citations sont recopiées PAR SCRIPT, et que le script est versé au commit suivant — c'est celui-ci, **copie octet pour octet** de l'outil qui a écrit les six lignes de la table (sha256 `6d41dfd3ff38163a75f511559d69e6ec789dc4589a2236d512765d962b7da478`) ; une PIÈCE, jamais promue en instrument (D291). **Pourquoi `confronter-sortie-passe-1.txt`** : la première passe de l'instrument de lecture adverse a rendu un ✗ (contrôle 2.h) qui était un défaut DE L'INSTRUMENT (la recherche des décisions S-2nn portait sur tout le fichier), confronté à la source avant d'être cru (D275) ; cette sortie est gardée, non retouchée ; la sortie finale vient de l'instrument réparé et rejoué EN ENTIER. **`audit-secrets-d355a.txt` et `tri-audit-d355a.txt`** : le premier audit de secrets (D298) et son tri différentiel (D299), joués sur ces pièces avant leur versement.


### Extension 2 — les pièces des ROUGES, le second audit de secrets et son tri

Écrite **avant** le commit qui verse les rouges, et donc **avant le premier commit de code** (D334, point 5). La règle des portes (`regle-portes.md`) et les deux cartes sont déjà commitées (premier versement) : les prédictions précèdent les mesures, `git log` le prouve. **Chemins COMPLETS** :

```
docs/preuves/D355/rouges/jouer-rouges.py
docs/preuves/D355/rouges/lire-rouges.py
docs/preuves/D355/rouges/rouge-unit.txt
docs/preuves/D355/rouges/rouge-int.txt
docs/preuves/D355/rouges/lecture-rouge-unit.txt
docs/preuves/D355/rouges/lecture-rouge-int.txt
docs/preuves/D355/rouges/lecture-des-rouges.md
docs/preuves/D355/audit-secrets-d355b.txt
docs/preuves/D355/tri-audit-d355b.txt
```

**Les pièces des rouges** : `jouer-rouges.py` (adapté de celui de D354 : seules les listes de fichiers et l'étiquette du lot changent) joue les fichiers de test du lot contre le code d'AVANT — **aucun fichier de production n'est modifié à ce moment** : `git status` ne liste, parmi les fichiers suivis, que des `*.spec.ts` et l'aide `row-lock.ts` — et verse pour chaque famille la commande, l'empreinte sha256 de CHAQUE fichier de test joué (et de leurs aides), le code de sortie et la sortie BRUTE. `lire-rouges.py` lit ces sorties (la classe de la première ligne de chaque bloc d'échec ; les fichiers tombés à la collecte), calibré sur deux sorties connues de D354 ; `lecture-rouge-unit.txt` et `lecture-rouge-int.txt` sont ses sorties ; `lecture-des-rouges.md` est la note qui les lit et compare chaque famille à la prédiction de `regle-portes.md`. **`audit-secrets-d355b.txt` et `tri-audit-d355b.txt`** : le second audit de secrets (D298) et son tri différentiel (D299), joués sur ces pièces avant leur versement.


### Extension 3 — la PREMIÈRE PASSE des rouges (gardée, non retouchée)

Écrite **avant** le commit qui verse les rouges, et donc avant le premier commit de code (D334, point 5). La première passe des rouges a rendu quatre échecs par `TypeError` qui étaient des défauts de MES tests (des lectures `[0]!` sans garde, A-27 de D354) ; ils ont été corrigés **avant** que les pièces n'entrent dans un commit, les rouges rejoués EN ENTIER (`lecture-des-rouges.md`, § 1, avec les empreintes avant → après des deux fichiers corrigés). Les sorties de la première passe sont gardées à côté de la seconde. **Chemins COMPLETS** :

```
docs/preuves/D355/rouges/rouge-unit-passe-1.txt
docs/preuves/D355/rouges/rouge-int-passe-1.txt
docs/preuves/D355/rouges/lecture-rouge-unit-passe-1.txt
docs/preuves/D355/rouges/lecture-rouge-int-passe-1.txt
```

### Extension 4 — une correction de TEST que le journal des fiches impose (`quotes.int-spec.ts`) et la chaîne des tests corrigés après les rouges

Écrite **avant** le commit qui corrige le test. **Ce que la table d'ouverture ne déclarait pas, et pourquoi** : `apps/api/test/int/quotes.int-spec.ts` n'y figurait pas. La lecture adverse de la consigne n'avait pas cherché, dans les tests EXISTANTS, ceux qui comptent TOUTES les lignes d'`audit_logs` : c'est une **limite de cette lecture**, trouvée par les campagnes. À la préparation des campagnes `r41`, `r42` et `r43` (leur pré-vol, « chaque mesure passe sur le code NON muté », a rendu rouge : code 2, aucune garde jouée), **sept assertions** de ce spec — celles de la famille « la PROMOTION » (D-4, D-5, D-6, D-11) — comptaient toutes les lignes d'audit pour dire « une seule » ou « aucune » ; le setup de ces tests crée une fiche par la route K-2, qui écrit désormais sa ligne `client_record.create` (R-2). **La correction conserve l'intention** : les lignes de FICHE (`client_record.%`) — la seule classe de lignes que le setup écrit légitimement — sont écartées, **toute AUTRE ligne d'audit reste comptée** : une promotion refusée qui écrirait n'importe quelle autre ligne rougit toujours (une aide, quatre assertions « aucune », deux « une », une lecture des lignes). ⚠ Ce qui n'est plus vu par ces assertions : une promotion qui écrirait une ligne `client_record.*` — c'est la garde de SOURCE de `client-record-writes.spec.ts` qui l'interdit (la conversion et le service des devis n'écrivent aucune fiche).

La chaîne d'empreintes AVANT → APRÈS des fichiers de test corrigés après les rouges est déclarée dans `corrections-tests-apres-rouges.txt` (première partie : les deux corrections faites avant le premier commit de code, reconstituées par `reconstituer-chaine.py` ; seconde partie : ce fichier-ci, corrigé après le premier commit de code). Ces deux pièces sont déclarées ici pour que la table les couvre AVANT leur commit.

```
apps/api/test/int/quotes.int-spec.ts
docs/preuves/D355/corrections-tests-apres-rouges.txt
docs/preuves/D355/reconstituer-chaine.py
```
