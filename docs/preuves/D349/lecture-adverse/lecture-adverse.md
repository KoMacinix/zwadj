# D349 — la lecture adverse de la consigne du rang 51, contre le dépôt à `9ec8abf`

Versée AVANT tout `.md` d'autorité (D328, point 2). Chaque affirmation de la consigne (`docs/preuves/D349/consigne.md`) est confrontée au dépôt ; le résultat est **tient**, **écart** ou **constat**. Les mesures de l'état des lieux sont dans `docs/preuves/D349/etat-des-lieux/releve-sortie.txt` (script calibré sur deux bras, ce qu'il a parcouru écrit à côté de chaque total).

## A. Ce qui tient (relevé, pas recopié)

| # | La consigne dit | Le dépôt dit | Lu où |
|---|---|---|---|
| A1 | `origin/main = 9ec8abf`, branche `main`, arbre propre, sans stash | `HEAD` = `origin/main` = `9ec8abf702068069dff5aa07605a884a7483f9b5` après `git fetch` ; 0 ligne de `git status` ; 0 stash | `git` |
| A2 | branches distantes en plus de `main` : `front-client` (43996e2), `integration-45` (63511ce), `par-carte` (7fdc679) | exactement ces trois, ces SHA | `git branch -r`, `git rev-parse --short` |
| A3 | rang 50 CLOS (D348 avec sa suite), compteur POUR MÉMOIRE VINGT-QUATRE, « RANG 51 : EN ATTENTE DE CADRAGE DU RELECTEUR » (candidat ADM-1) | tableau « ÉTAT À LA CLÔTURE DU RANG 50 » de `ZWADJ_CONTINUITE.md` (§ « rang suivant » et « compteur ») ; dernière ligne « ⇒ RANG 51 » de l'ordre des rangs | `ZWADJ_CONTINUITE.md` |
| A4 | le numéro attendu est D349, pris en LISANT le registre | dernière ligne du registre : D348 | `ZWADJ_CONTINUITE.md`, registre |
| A5 | deux contrôleurs ADMIN, `@Roles(UserRole.ADMIN)` de classe, cinq routes | 2 contrôleurs, 5 routes, **140** fichiers source parcourus (le cadrage de D320 en parcourait 111) | `releve-sortie.txt` § 1.1 |
| A6 | `AuditLog` sans écrivain pour ces actions ; écrivains actuels : `staff-store`, `quote-store` | 2 appels `auditLog.create` : `staff-store.prisma.ts:74`, `quote-store.prisma.ts:322` ; 0 dans `venues-admin.*` et `account-deletion.*` | `releve-sortie.txt` § 1.4 |
| A7 | aucune méthode `admin/` dans `packages/api-client` ; aucun dossier `admin` dans `apps/pro/src` | 0 chemin `/admin…` sur 11 fichiers ; 0 dossier `admin` sur 7 dossiers, 0 référence `/admin` sur 106 fichiers | `releve-sortie.txt` §§ 1.3, 1.4 |
| A8 | `apps/api/test/int/rbac-all-routes.int-spec.ts` existe | existe ; il asserte `admin.length ≥ 5` | `releve-sortie.txt` § 1.1 |
| A9 | D-4 : `venues.rejection_reason` existe depuis la migration initiale, **sans écrivain** | `migration.sql:148` (`"rejection_reason" TEXT`), `schema.prisma:538` ; **0** écriture en code (`rejectionReason: <valeur>`) dans 140 fichiers ; 2 mentions, toutes deux des commentaires ; aucune autre migration ne la nomme (32 parcourues) | `releve-sortie.txt` § D-4 |
| A10 | R-9 : le harnais FINAL de PUB-1 a joué ses 20 cibles sous un seul fichier, sans modification entre la passe 3 et sa reprise ; le contrôle (ii) de D348 « supposait UN seul harnais sur trois passes » | `docs/preuves/D348/controles-r4.txt` (ii) : « l'empreinte n'est PAS la même dans les trois passes (v1, v2, final) » ; un seul commit (`ac728d8`) touche le harnais final ; ses 20 journaux sont postérieurs à la date du fichier | `docs/preuves/D348/controles-r4.txt` |
| A11 | R-8 : `venues.module.ts` est modifié par `par-carte` | 155 fichiers de `git diff --name-only origin/main...origin/par-carte` ; `venues.module.ts`, `venues-public.*`, `venue-map.*`, `venue-form.tsx`, `venue.ts`, `fr.json`, `ar.json` y figurent | `docs/preuves/D349/par-carte-fichiers.txt` |
| A12 | le garde du personnel ne s'applique pas à l'ADMIN | `StaffSessionGuard` : « Le garde ne s'applique pas à ADMIN (ADM-2 inchangé) » (D336, consigne v3) ; une route Pro neuve est fermée par défaut et `staff-session-guard.int-spec.ts` la dérive du routeur | `ZWADJ_CONTINUITE.md`, section D341 |
| A13 | la liste des fichiers de `par-carte` ne contient ni `packages/types/src/index.ts`, ni `packages/api-client/src/index.ts`, ni `apps/api/package.json` | confirmé (recoupement mécanique) | `par-carte-fichiers.txt` |
| A14 | les méthodes neuves du client ne sont couvertes que si le littéral de chemin est DANS l'appel (D182) | `contract-api-client.int-spec.ts` lit **tous** les `.ts` hors tests de `packages/api-client/src` (`readdirSync`) : les clients neufs entrent d'eux-mêmes, sans modifier ce test | `contract-api-client.int-spec.ts` (`collectClientCalls`) |

## B. Écarts et constats — chacun avec ce que le lot en fait

### B1. ÉCART — R-1 dit « un fichier de la carte du chemin de l'argent doit changer ⇒ ARRÊT », et R-4 oblige à changer un fichier de la carte

- **Fait** : `apps/api/src/venues/venues-admin.service.ts` figure sur la carte de D304 (`docs/preuves/D304/carte-chemin-argent/carte-sortie.txt`, ligne « M4 : `if (cashbackRateBps > commissionRateBps)` », `tri.txt:31` « DEDANS … cashback ≤ commission (commission, D35) ») ; `packages/types/src/venue.ts` aussi (M3, M4). R-4 place les trois routes admin dans `VenuesAdminController`, dont l'unique collaborateur est `VenuesAdminService` ; **aucun module** ne peut recevoir un service neuf (R-4 : `venues.module.ts` est modifié par `par-carte`). `publish` vit dans ce service (lignes 50 à 74).
- **Ce que la carte classe** : une CIBLE (la garde `cashback ≤ commission` de `setRates`, branche 1), pas le fichier. D309 : « une cible est DEDANS si la garde qu'elle neutralise calcule, arrondit ou valide un montant » ; D316 : « un changement relève du chemin de l'argent **par sa fonction**, branches (1) à (6), **pas parce que son fichier figure sur la carte** » ; D325 : la méthode se décide « par ce que le lot touche » (paiement Chargily, montant calculé / enregistré / validé par le serveur, statuts de réservation ou de devis).
- **Ce que ce lot touche dans ce fichier** : `publish` (statut de PUBLICATION d'une salle — ni un montant, ni un statut de réservation ou de devis), et trois méthodes neuves (liste, détail, rejet). **`setRates`, `VENUE_ADMIN_SELECT`, `livingVenue` (pour `setRates`) et la route `PATCH …/commission-rate` ne bougent pas d'un octet.**
- **Décision de la session (S-n, à rapporter)** : la clause d'ARRÊT de R-1 est lue **par sa fonction** (D316), pas par son fichier — sinon R-4 est inexécutable sans toucher un module, ce que R-4 interdit. Le lot reste **méthode normale** ; l'écart est **mesuré, pas supposé** : une cible de `neutralisation/neutralize-adm1.py` (« le texte de `setRates` et de `VENUE_ADMIN_SELECT` est identique à celui de `9ec8abf` »), un contrôle de fin de lot qui compare les deux textes extraits de `git show 9ec8abf:…` et de l'arbre, et une garde de source (aucune méthode neuve ne nomme `commissionRateBps` / `cashbackRateBps`, sauf le détail admin en lecture). Les changements de ce fichier vont dans **un commit à part**, pour qu'ils se défassent seuls si le relecteur lit R-1 à la lettre.
- **`packages/types/src/venue.ts`** : NON touché. Les contrats neufs vivent dans un fichier neuf (`venue-moderation.ts`) — aucun conflit avec `par-carte` (R-8) et aucune ligne de la carte déplacée.

### B2. CONSTAT — `publish` lit le statut HORS transaction et écrit par `id` seul (D117/D121 non tenu)

`venues-admin.service.ts:50-74` : `livingVenue` lit, `slotTemplate.count` lit, puis `prisma.venue.update({ where: { id } })` écrit **sans condition de statut**. Deux gestes simultanés (publier et rejeter, MD-ADM-4) ne s'arbitrent pas. **Ce que le lot en fait** : `publish` est réécrit — il est de toute façon à changer (R-2 : efface le motif ; R-5 : journal) — en **check-and-set** (`updateMany` conditionné au statut, compte = 1 exigé, relecture seulement pour choisir le code), dans une transaction qui écrit aussi la ligne du journal. Le re-publier reste **idempotent** : 200, aucune écriture, **aucune ligne de journal**, `updatedAt` inchangé.

### B3. CONSTAT — la file de suppression a le même défaut, et ce lot n'y touche pas

`account-deletion.service.ts` : `loadPending` (l. 304-330) lit `status === "PENDING"` **avant** la transaction ; `approve` écrit la demande par `update({ where: { id } })` (l. 276) sans condition de statut ; `reject` (l. 166-186) n'a **aucune transaction**. Deux approbations simultanées de la même demande **rejouent l'anonymisation** (la seconde calcule `emailHash` sur l'adresse DÉJÀ anonymisée). **Ce que le lot en fait** : R-5 exige la ligne de journal dans la transaction ; `reject` entre donc dans une transaction (écriture + ligne) et `approve` reçoit la ligne dans la sienne. **Le contrôle de statut n'est PAS déplacé** : c'est une modification de comportement de l'anonymisation, irréversible, que la consigne ne demande pas — **rapporté au backlog** avec la mesure par lecture de code, **non reproduit** (« Un défaut croisé se RAPPORTE », `CLAUDE.md`).

### B4. DÉCISION MANQUANTE (R-2) — rejeter une salle DÉJÀ rejetée avec un AUTRE motif

R-2 dit « déjà rejetée … suit les MD-ADM ». **MD-ADM-4** couvre le rejeu de la MÊME requête (« même état, même requête, même réponse ») ; **aucun MD-ADM ne dit ce qu'on fait d'un second rejet portant un motif différent.** Ce point **s'arrête** (R-2) : la session n'invente pas la règle produit. **Comportement provisoire, le plus conservateur et le plus facile à relâcher** : même motif ⇒ 200 identique à l'octet, aucune écriture, aucune ligne de journal ; motif différent ⇒ **409 `VENUE_ALREADY_REJECTED`**, rien n'est écrasé. **Rapporté comme la question du rapport.**

### B5. CONSTAT — la liste « en attente » ne peut pas se trier par un seul `orderBy` Prisma

Rangée « après les autres » (R-2) : un tri sur `rejectionReason` rangerait les rejetées par ORDRE ALPHABÉTIQUE du motif. **Ce que le lot en fait** : deux groupes (non rejetées, puis rejetées), deux requêtes dans UNE `$transaction` qui partagent le même `where` de base (D225 : le filtre vit dans le `where`), la page découpée par un module pur testé (`venue-review-queue.ts`) ; chaque groupe trié par `createdAt` puis `id` (déterministe). La date du refus est lue au journal par UNE requête pour toute la page, pas une par ligne.

### B6. CONSTAT — le service pro n'a pas Prisma : la route pro passe par le port

`venues.service.ts` n'injecte que `VENUE_STORE` (S10a, D258). La route de lecture du refus (R-3, R-4) exige donc **une méthode de plus sur le port** (`venue-store.types.ts`), son adaptateur (`venue-store.prisma.ts`, appartenance par la relation `owner: { userId }`, D149) et la spec de cet adaptateur — quatre fichiers que la consigne ne nomme pas. **Aucun n'est dans la liste de `par-carte`** (A11, A13) ; ils sont déclarés dans la table d'ouverture. `venues.module.ts` n'est PAS touché (`VENUE_STORE` y est déjà fourni).

### B7. CONSTAT — les codes d'erreur neufs n'ont pas de texte dans les catalogues

R-7 : « Aucune chaîne visible n'est neuve ; si un code d'erreur neuf a un texte, FR et AR sous la porte de parité. » D-2 (Ko) : les textes de l'admin vivent hors de `packages/i18n`, en français seul. **Décision de la session** : deux codes neufs (`VENUE_NOT_DRAFT` — rejeter une salle qui n'est plus un brouillon : publiée en pratique, et le `PENDING` verrouillé que « déjà publiée » mentirait de dire —, `VENUE_ALREADY_REJECTED`), lus **par l'ADMIN seulement**, sans texte dans `fr.json` / `ar.json` ; leur `message` est une clé stable (`admin.errors.…`) que l'écran (ADM-2) fera correspondre à un texte français hors catalogue. La porte de parité n'est pas modifiée ; `packages/i18n/messages/*.json` n'est pas touché (R-8). Le pro, lui, ne reçoit aucun code neuf : la route de lecture du refus répond le `VENUE_NOT_FOUND` existant (404 indistinct).

### B8. CONSTAT — les bornes de la liste sont celles d'A3-⑤, non exportées

`venueListQuerySchema` écrit `pageSize` ≤ 50, défaut 12 en littéral (`venue.ts`, ~l. 862-868) : on ne peut pas les importer sans modifier `venue.ts` (R-8). Le schéma neuf **répète ces deux nombres** avec un commentaire qui renvoie à l'origine ; une entrée de backlog propose de les exporter (« un seul endroit par formule ») une fois `par-carte` intégrée.

### B9. CONSTAT — « déjà rejetée » dans la liste suppose au moins un créneau actif (D-6, l2)

Une salle rejetée dont le pro désactive ensuite son dernier créneau **sort de la liste** (D-6, « au moins un créneau actif » : la condition même de la publication). Ce n'est pas une contradiction avec R-2 (elle ne pourrait de toute façon pas être publiée) ; c'est écrit ici pour que ce comportement ne se lise pas comme un oubli.

### B10. CONSTAT — le script du premier admin : deux choix de forme (R-6)

R-6 dit « promeut un compte existant, vérifié et actif, refuse sinon ». Deux points non dits, choisis par la session : (1) **un compte PRO est refusé** (il perdrait l'accès à ses salles : `@Roles(PRO)` de classe et la garde de l'app Pro, D23 ; MD-ADM-3 « le mauvais compte ») ; un compte déjà ADMIN est un **no-op** (code 0, aucune écriture) ; (2) la promotion écrit **une ligne de journal** dans la même transaction (`user.promote_admin`, sans e-mail), alors que D-8 ne la nomme pas : la promotion est l'acte le plus sensible de la chaîne, et la laisser sans trace ferait l'angle mort que MD-ADM-6 interdit.

## C. Ce que cette lecture ne vérifie PAS

- La **cause** des rouges et des temps des portes sur ce poste (D291) : non traitée ici.
- Le **comportement réel** de `publish` sous deux requêtes simultanées avant correction : non reproduit — il le sera par les rouges (une course publier / rejeter à l'intégration), pas par cette lecture.
- La **mise en service** : MFA et relecture du rôle en base sur les routes ADMIN (D-7, D-9 e3-c) **bloquent tout déploiement** — rappelé ici, redit au rapport ; aucun code de ce lot ne les lève.
