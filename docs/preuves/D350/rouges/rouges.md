# D350 — les rouges lus AVANT le code (D334, point 5)

Commité AVANT tout commit de code d'application. **Départ** : `1d1b01a1ad8e1b52c49756a580beabced6dab7c0`. **L'arbre** : seuls des fichiers de TEST (`*.test.ts(x)`, `*.spec.ts`, `*.int-spec.ts`), l'aide `apps/api/test/int/row-lock.ts` et le double `apps/pro/src/test-support/admin-doubles.ts` sont modifiés ou neufs ; le script qui a assemblé cette pièce ABANDONNE si un autre fichier hors `docs/preuves/` est modifié (il n'en a trouvé aucun). **Poste** : secteur (`BatteryStatus` = 2), `chrome` et `headless_shell` à 0, Docker lancé, base d'intégration recréée par `setup-global` à chaque lancement (jetable). **Sorties** : brutes, sans code ANSI (`NO_COLOR=1`, assertion du script), `975` lignes parcourues par le script de cette pièce. Les empreintes sont celles des fichiers JOUÉS ; deux fichiers ont changé APRÈS leur première lecture, avant cette pièce (voir « Ce qui a bougé pendant la lecture »).

## Conclusion sur la consigne

- **R-2 (la file des suppressions) : ROUGE, SUR POSTGRESQL RÉEL — le contrôle de statut entre DANS la transaction en check-and-set.** Les quatre entrelacements FORCÉS par un verrou de ligne (pas par un décalage) échouent contre le code d'avant, et la forme de chaque échec dit ce qui s'est passé : l'approbation qui a lu « en attente » AVANT que l'utilisateur annule répond **200 et passe la demande de ANNULÉE à APPROUVÉE** (le compte serait anonymisé) ; deux approbations répondent **200 et 200** ; un rejet puis une approbation répondent **200 et 200**, et l'inverse aussi. Les deux pistes du relecteur (i) et (ii) sont ÉTABLIES PAR LA MESURE, pas seulement par la lecture. Le code est changé (commit de code postérieur à cette pièce).
- **R-3 (corriger le motif) : ROUGE.** Contre le code d'avant, un autre motif sur une salle déjà rejetée répond 409 au lieu de 200 ; la ligne de journal n'a pas d'« avant » ; la course de deux corrections ne se bloque pas sur le verrou (le code d'avant refuse sans écrire).
- **MD-ADM-10 (un même navigateur qui passe d'un compte à l'autre) : UNE FUITE EST MESURÉE, et elle n'est pas celle qu'on cherchait.** Le brouillon du parcours sur place (D345) **ne fuit pas** : lu directement dans le magasin après la déconnexion, il est absent (assertion verte, test 1). **La liste des salles du PRO A, elle, reste en mémoire** dans `ProVenuesProvider` après sa déconnexion et sous un ADMIN, et elle est **rendue au PRO B pendant que sa propre lecture n'est pas revenue** (`pro-b|Salle de A` dans le journal des rendus). Le fournisseur ne remet pas son état à zéro quand le compte change (`if (!isPro) return` ne vide rien). La correction entre dans `apps/pro/src/shell/pro-venues-context.tsx` par l'extension 2 de la table, avec ce rouge pour motif. ⚠ Dans les tests 2 et 3 l'assertion du brouillon SUIT une assertion rouge : elle n'est pas jouée avant le correctif ; elle se lit verte après.
- **R-4 à R-7, les écrans : la collecte tombe** (modules absents) — sept fichiers de l'app Pro, plus `admin-source-guard` et `publication-review` : c'est le rouge que `git` peut montrer, et il est NOMMÉ comme tel (« COLLECTE TOMBÉE »), pas déguisé en assertion. Les assertions de ces fichiers se lisent après le code, et chaque garde est neutralisée (`neutralisation/neutralize-adm2.py`).

## Ce que la lecture a trouvé de vert, et pourquoi (écrit, pas tu)

Des tests neufs ou réécrits sont **VERTS contre l'état d'avant**. Ce sont des gardes de comportement CONSERVÉ, pas des preuves du correctif — nommés pour ne pas se lire comme rouges :
- `venues-admin.service.spec.ts` : « id hors motif UUID », « un brouillon jamais rejeté : UN updateMany conditionné… », « R-5 — UNE ligne de journal… » (l'argument `null` en plus est ignoré par le code d'avant), « R-1 — le rejet n'écrit ni ne lit AUCUN taux », « R-3 — la correction ne lit ni n'écrit aucun taux non plus » (verte pour une mauvaise raison avant : le code d'avant passe par son premier `updateMany`, et la réponse n'a pas de taux), « MD-ADM-6 — un journal qui échoue fait ÉCHOUER le rejet » ; `account-deletion.service.spec.ts` : « compte 0 sur un id inconnu » (le code d'avant levait déjà le 404, par une autre voie), « compte 0 parce qu'une AUTRE décision est passée avant » et « compte 0… ANNULÉ entre-temps » (le code d'avant lisait le statut AVANT et refusait avec le même 400 : c'est le cas SÉQUENTIEL, qui masquait le trou pendant quatre lots — D117, D121 ; le cas concurrent est dans `account-deletion-race.int-spec.ts`), « l'e-mail de décision n'est lu qu'à l'intérieur de la transaction » (vert avant : la lecture d'avant précédait aussi l'anonymisation), « compte 0 sur une demande que la relecture dit ENCORE en attente : une erreur d'ÉTAT IMPOSSIBLE » (⚠ **verte avant pour une MAUVAISE raison** : le code d'avant levait un `TypeError` sur un double sans `user`, qui n'est ni un 400 ni un 404 — elle ne mesure l'état impossible qu'APRÈS le correctif, et c'est la neutralisation qui le prouvera) ; `admin-audit.spec.ts` : les tests sur la liste des lignes (`null` ignoré).
- `admin-moderation.int-spec.ts` : « le motif corrigé est ROGNÉ et BORNÉ… » (le schéma refuse avant le service) et « rejetée, PUBLIÉE, puis un rejet : 409 VENUE_NOT_DRAFT » (le sens unique tient déjà).
- `routes.test.tsx` : le bras négatif ADMIN et le filtre `…_PATTERN` (la table n'a pas encore de motif d'administration).

## Les rouges, pièce par pièce

### rouge-1-int-account-deletion-race.txt — R-2 — les courses de la file des suppressions, sur PostgreSQL réel

- **Commande** : `pnpm --filter @zwadj/api run test:int test/int/account-deletion-race.int-spec.ts`
- **Bilan lu dans la sortie** : « Test Files 1 failed (1) » · « Tests 4 failed (4) » (114 lignes parcourues)
- **Fichiers joués, empreinte sha256** :
  - `apps/api/test/int/account-deletion-race.int-spec.ts` : `2f8c84ffd3cd15102b7423a29cf4110eda22d634bc680b3f1f35b22c78c1290b`
  - `apps/api/test/int/row-lock.ts` : `9c9095c6614016088777ffcb5dbd656cd7c063a4f814e32f613faf8cdcbf2746`
- **Échecs lus : 4** (titre, puis la première ligne de son bloc — la forme de l'échec, D304 / D316) :
  - [assertion] test/int/account-deletion-race.int-spec.ts > R-2 — approuver pendant que l'utilisateur ANNULE : le compte ne s'anonymise pas > l'annulation (validée) précède l'écriture de l'approbation : 400 DELETION_REQUEST_NOT_PENDING, la demande reste ANNULÉE, le compte AC
    → AssertionError: {"id":"01a1ea38-43bb-7992-81e8-f69fe62f9a25","status":"APPROVED","reason":null,"requestedAt":"2026-11-17T15:55:18.327Z","decidedAt":"2026-11-17T15:55:18.376Z","decisionNote":null}: expected 200 to be 400 // Object.is equalit
  - [assertion] test/int/account-deletion-race.int-spec.ts > R-2 — approuver DEUX fois en même temps : une approbation, une trace, un e-mail > deux approbations bloquées sur la même demande : l'une gagne (200), l'autre est refusée (400 DELETION_REQUEST_NOT_PENDING) ; UNE lign
    → AssertionError: {"id":"01a1ea38-45b0-76fa-bd25-a246a37ee9da","status":"APPROVED","reason":null,"requestedAt":"2026-11-17T15:55:18.829Z","decidedAt":"2026-11-17T15:55:18.843Z","decisionNote":null} / {"id":"01a1ea38-45b0-76fa-bd25-a246a37ee9d
  - [assertion] test/int/account-deletion-race.int-spec.ts > R-2 — rejeter × approuver : une décision, une seule, dans l'ordre d'arrivée > le REJET arrive en premier, l'approbation derrière : le rejet gagne (200), l'approbation est refusée (400) ; le compte reste ACTIF ; UNE 
    → AssertionError: {"id":"01a1ea38-47ae-768e-9180-ac42983cd23e","status":"REJECTED","reason":null,"requestedAt":"2026-11-17T15:55:19.339Z","decidedAt":"2026-11-17T15:55:19.356Z","decisionNote":"Commissions en cours."} / {"id":"01a1ea38-47ae-76
  - [assertion] test/int/account-deletion-race.int-spec.ts > R-2 — rejeter × approuver : une décision, une seule, dans l'ordre d'arrivée > l'APPROBATION arrive en première, le rejet derrière : l'approbation gagne (200), le rejet est refusé (400) ; le compte est ANONYMISÉ ; UN
    → AssertionError: {"id":"01a1ea38-49ad-71c4-8734-148778197c9b","status":"APPROVED","reason":null,"requestedAt":"2026-11-17T15:55:19.849Z","decidedAt":"2026-11-17T15:55:19.863Z","decisionNote":null} / {"id":"01a1ea38-49ad-71c4-8734-148778197c9

### rouge-2-int-admin-moderation.txt — R-3 — la correction du motif d'une salle déjà rejetée, sur PostgreSQL réel

- **Commande** : `pnpm --filter @zwadj/api run test:int test/int/admin-moderation.int-spec.ts`
- **Bilan lu dans la sortie** : « Test Files 1 failed (1) » · « Tests 7 failed | 28 passed (35) » (183 lignes parcourues)
- **Fichiers joués, empreinte sha256** :
  - `apps/api/test/int/admin-moderation.int-spec.ts` : `563a6d3807cdee42a5685411e93d15bc75be19ea5e13432bcdeae6f2e67ca8f1`
  - `apps/api/test/int/row-lock.ts` : `9c9095c6614016088777ffcb5dbd656cd7c063a4f814e32f613faf8cdcbf2746`
- **Échecs lus : 7** (titre, puis la première ligne de son bloc — la forme de l'échec, D304 / D316) :
  - [assertion] test/int/admin-moderation.int-spec.ts > POST /admin/venues/:id/reject — D-4, R-2 > R-3 (D350, 1 c de la consigne) — un AUTRE motif sur une salle déjà rejetée la CORRIGE : 200, le nouveau motif REMPLACE l'ancien sur la salle, la réponse porte le nouveau motif, 
    → AssertionError: expected 409 to be 200 // Object.is equality
  - [assertion] test/int/admin-moderation.int-spec.ts > POST /admin/venues/:id/reject — D-4, R-2 > la ligne de journal d'une correction garde l'ANCIEN et le NOUVEAU motif (avant / après) ; la première ligne garde « jamais rejetée » ; la correction est la ligne la PLUS RÉCENTE
    → AssertionError: expected [ { …(10) } ] to have a length of 2 but got 1
  - [assertion] test/int/admin-moderation.int-spec.ts > POST /admin/venues/:id/reject — D-4, R-2 > MD-ADM-4 — corriger avec le MÊME motif que celui en vigueur (rejeu) : 200, la même réponse, AUCUNE ligne de plus
    → AssertionError: expected 409 to be 200 // Object.is equality
  - [assertion] test/int/admin-moderation.int-spec.ts > POST /admin/venues/:id/reject — D-4, R-2 > corriger TROIS fois de suite : la chaîne du journal est continue (chaque ligne part du motif en vigueur) et la salle porte le dernier motif
    → AssertionError: expected 409 to be 200 // Object.is equality
  - [assertion] test/int/admin-moderation.int-spec.ts > POST /admin/venues/:id/reject — D-4, R-2 > la file ET le détail montrent le NOUVEAU motif et la date de la CORRECTION
    → AssertionError: expected 'Les photos sont floues. Merci de les …' to be 'Un autre motif' // Object.is equality
  - [assertion] test/int/admin-moderation.int-spec.ts > R-3 — la course de deux corrections (MD-ADM-4) : l'entrelacement est FORCÉ par un verrou de ligne, pas par un décalage > deux corrections à motifs DIFFÉRENTS sur une salle déjà rejetée, bloquées sur la même ligne : l'une
    → AssertionError: requêtes bloquées sur le verrou de la ligne (attendu au moins 1): expected 0 to be greater than or equal to 1
  - [assertion] test/int/admin-moderation.int-spec.ts > R-3 — la course de deux corrections (MD-ADM-4) : l'entrelacement est FORCÉ par un verrou de ligne, pas par un décalage > une correction et une PUBLICATION bloquées sur la même ligne, la publication d'abord : la publicati
    → AssertionError: requêtes bloquées sur le verrou de la ligne (attendu au moins 2): expected 1 to be greater than or equal to 2

### rouge-3-unit-api.txt — R-2 et R-3 — les specs unitaires de l'API

- **Commande** : `pnpm --filter @zwadj/api exec vitest run src/account/account-deletion.service.spec.ts src/common/admin-audit.spec.ts src/venues/venues-admin.service.spec.ts`
- **Bilan lu dans la sortie** : « Test Files 3 failed (3) » · « Tests 12 failed | 68 passed (80) » (359 lignes parcourues)
- **Fichiers joués, empreinte sha256** :
  - `apps/api/src/account/account-deletion.service.spec.ts` : `89b4e4b798d7122d310187f2df78bf9aabc24e6c7f24eb09bdfb019120367ac0`
  - `apps/api/src/common/admin-audit.spec.ts` : `07508ed8e281a511a7c8fa5d044a2f2df2e2a2bfcce7792323b645fe59b74f03`
  - `apps/api/src/venues/venues-admin.service.spec.ts` : `7dc76abda505a8701812720ac09d13c8946fb7046cf80c14e4de848acb8f6925`
- **Échecs lus : 12** (titre, puis la première ligne de son bloc — la forme de l'échec, D304 / D316) :
  - [assertion] src/account/account-deletion.service.spec.ts > R-2 (D350) — le statut se décide DANS la transaction, en check-and-set > approve : AUCUNE lecture de la demande avant l'ouverture de la transaction (la lecture d'avant décidait, D117 / D121)
    → AssertionError: expected 258 to be greater than 259
  - [assertion] src/account/account-deletion.service.spec.ts > R-2 (D350) — le statut se décide DANS la transaction, en check-and-set > reject : AUCUNE lecture de la demande avant l'ouverture de la transaction
    → AssertionError: expected 275 to be greater than 276
  - [assertion] src/account/account-deletion.service.spec.ts > R-2 (D350) — le statut se décide DANS la transaction, en check-and-set > approve : le PREMIER geste de la transaction est le check-and-set — `updateMany` conditionné à PENDING, avant toute salle archivée, toute an
    → AssertionError: expected "spy" to be called with arguments: [ { where: { …(2) }, …(1) } ]
  - [assertion] src/account/account-deletion.service.spec.ts > R-2 (D350) — le statut se décide DANS la transaction, en check-and-set > reject : le PREMIER geste de la transaction est le check-and-set — `updateMany` conditionné à PENDING, avant la décision écrite et la ligne 
    → AssertionError: expected "spy" to be called with arguments: [ { where: { …(2) }, …(1) } ]
  - [assertion] src/common/admin-audit.spec.ts > venueRejectEntry > R-3 (D350) — une CORRECTION garde l'ANCIEN ET le NOUVEAU motif : « avant » est le motif en vigueur, « après » le nouveau ; l'action reste `venue.reject` (la date du refus est celle de la dernière ligne)
    → AssertionError: expected { rejectionReason: null } to deeply equal { rejectionReason: 'Photos floues.' }
  - [assertion] src/common/admin-audit.spec.ts > venueRejectEntry > R-3 — le motif précédent est celui qu'on passe, jamais déduit : deux motifs différents donnent deux « avant » différents
    → AssertionError: expected { rejectionReason: null } to not deeply equal { rejectionReason: null }
  - [assertion] src/venues/venues-admin.service.spec.ts > VenuesAdminService.reject (D-4, R-2, R-3 de D350) — la salle RESTE en brouillon, le motif est stocké, journalisé, et se CORRIGE > salle absente ou supprimée : 404 indistinct, AUCUNE écriture, AUCUNE ligne de journal
    → AssertionError: expected TypeError: Cannot destructure property 'c… to be an instance of NotFoundException
  - [assertion] src/venues/venues-admin.service.spec.ts > VenuesAdminService.reject (D-4, R-2, R-3 de D350) — la salle RESTE en brouillon, le motif est stocké, journalisé, et se CORRIGE > MD-ADM-4 — une salle PUBLIÉE : 409 VENUE_NOT_DRAFT (le sens unique), rien n'est écrit, A
    → AssertionError: expected TypeError: Cannot destructure property 'c… to be an instance of ConflictException
  - [assertion] src/venues/venues-admin.service.spec.ts > VenuesAdminService.reject (D-4, R-2, R-3 de D350) — la salle RESTE en brouillon, le motif est stocké, journalisé, et se CORRIGE > MD-ADM-4 « même état, même requête, même réponse » — le MÊME motif sur une salle déjà re
    → AssertionError: expected TypeError: Cannot destructure property 'c… to deeply equal { …(3) }
  - [assertion] src/venues/venues-admin.service.spec.ts > VenuesAdminService.reject (D-4, R-2, R-3 de D350) — la salle RESTE en brouillon, le motif est stocké, journalisé, et se CORRIGE > R-3 — un AUTRE motif sur une salle déjà rejetée la CORRIGE : check-and-set sur le motif 
    → AssertionError: expected "spy" to be called with arguments: [ { where: { …(4) }, data: { …(1) } } ]
  - [assertion] src/venues/venues-admin.service.spec.ts > VenuesAdminService.reject (D-4, R-2, R-3 de D350) — la salle RESTE en brouillon, le motif est stocké, journalisé, et se CORRIGE > MD-ADM-4 — compte 0 et l'autre admin a posé le MÊME motif : 200 (même état, même réponse
    → AssertionError: expected ConflictException: admin.errors.venueAlre… { …(3) } to deeply equal { …(3) }
  - [assertion] src/venues/venues-admin.service.spec.ts > VenuesAdminService.reject (D-4, R-2, R-3 de D350) — la salle RESTE en brouillon, le motif est stocké, journalisé, et se CORRIGE > MD-ADM-4 — compte 0 et la salle a été PUBLIÉE entre-temps : 409 VENUE_NOT_DRAFT ; suppri
    → AssertionError: expected 'VENUE_ALREADY_REJECTED' to be 'VENUE_NOT_DRAFT' // Object.is equality

### rouge-4-pro-garde-et-ecrans.txt — R-4, R-5, R-7 — la garde ADMIN, la coquille, les trois écrans, les textes, `noindex`, la table de routes

- **Commande** : `pnpm --filter @zwadj/pro exec vitest run src/routes.test.tsx src/auth/require-admin.test.tsx src/admin/admin-shell.test.tsx src/admin/venue-queue-page.test.tsx src/admin/venue-review-page.test.tsx src/admin/deletion-requests-page.test.tsx src/admin/admin-texts.test.ts src/admin/use-no-index.test.tsx`
- **Bilan lu dans la sortie** : « Test Files 8 failed (8) » · « Tests 2 failed | 17 passed (19) » (222 lignes parcourues)
- **Fichiers joués, empreinte sha256** :
  - `apps/pro/src/routes.test.tsx` : `bc94b3615f04e106ff31b97807995fcd16f00acc842c3825e65567a262b28f39`
  - `apps/pro/src/auth/require-admin.test.tsx` : `b195807476baa1090bb56cc9d75e29bc31f4224c97a92d1408f355c3d8eef158`
  - `apps/pro/src/admin/admin-shell.test.tsx` : `8dcf4d72cb99fe09f46ce624c6afed00efc58136d8a07c22a0927592790868f7`
  - `apps/pro/src/admin/venue-queue-page.test.tsx` : `090e1e16fb1ca87a1a35aa6b56b49ad82bb735b1e496be20f56b38ff1461993d`
  - `apps/pro/src/admin/venue-review-page.test.tsx` : `70b3eedab8c3a13a48fdc6ca939a61b27715835f59ca1661a3f51dcdc211445c`
  - `apps/pro/src/admin/deletion-requests-page.test.tsx` : `a2ec20033e03a7984129b28a8b40ae78d34f2428b6a6a6c5c19e338981fc66bd`
  - `apps/pro/src/admin/admin-texts.test.ts` : `684034033f2f46c256a7523d7348ce1edd937ef925ea0fdcc3c8eaa570de02bf`
  - `apps/pro/src/admin/use-no-index.test.tsx` : `766708d82d8d4c73a43dcf9c24d5e77a2672105717f9a563e4b1300e67cc97a1`
  - `apps/pro/src/test-support/admin-doubles.ts` : `c4aea0472233d7e5d9357f76505d6aad10f98602ec649d895d52efa042e40b6a`
- **Échecs lus : 9** (titre, puis la première ligne de son bloc — la forme de l'échec, D304 / D316) :
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/auth/require-admin.test.tsx [ src/auth/require-admin.test.tsx ]
    → Error: Failed to resolve import "../admin/admin-texts" from "src/auth/require-admin.test.tsx". Does the file exist?
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/admin/admin-shell.test.tsx [ src/admin/admin-shell.test.tsx ]
    → Error: Failed to resolve import "./admin-texts" from "src/admin/admin-shell.test.tsx". Does the file exist?
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/admin/admin-texts.test.ts [ src/admin/admin-texts.test.ts ]
    → Error: Failed to resolve import "./admin-texts" from "src/admin/admin-texts.test.ts". Does the file exist?
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/admin/deletion-requests-page.test.tsx [ src/admin/deletion-requests-page.test.tsx ]
    → Error: Failed to resolve import "./admin-client-context" from "src/admin/deletion-requests-page.test.tsx". Does the file exist?
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/admin/use-no-index.test.tsx [ src/admin/use-no-index.test.tsx ]
    → Error: Failed to resolve import "./admin-texts" from "src/admin/use-no-index.test.tsx". Does the file exist?
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/admin/venue-queue-page.test.tsx [ src/admin/venue-queue-page.test.tsx ]
    → Error: Failed to resolve import "./admin-client-context" from "src/admin/venue-queue-page.test.tsx". Does the file exist?
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/admin/venue-review-page.test.tsx [ src/admin/venue-review-page.test.tsx ]
    → Error: Failed to resolve import "./admin-client-context" from "src/admin/venue-review-page.test.tsx". Does the file exist?
  - [assertion] src/routes.test.tsx > ADM-2 — chaque adresse `/admin` de la table est une route DÉCLARÉE (patron de D322) > la table porte des adresses d'administration (D290 : un zéro sur zéro ne mesure rien)
    → AssertionError: expected [] to deeply equal [ Array(2) ]
  - [assertion] src/routes.test.tsx > ADM-2 — chaque adresse `/admin` de la table est une route DÉCLARÉE (patron de D322) > adminVenuePath(id) — le détail d'une salle : l'ADMIN y voit la salle, et l'adresse RESTE celle demandée
    → AssertionError: expected 'undefined' to be 'function' // Object.is equality

### rouge-5-pro-refus-et-compte.txt — R-6, R-7 — le refus lu par le pro, le changement de compte (MD-ADM-10), les gardes de source

- **Commande** : `pnpm --filter @zwadj/pro exec vitest run src/venues/publication-review.test.tsx src/admin/session-switch.test.tsx src/admin/admin-source-guard.test.ts`
- **Bilan lu dans la sortie** : « Test Files 3 failed (3) » · « Tests 3 failed (3) » (97 lignes parcourues)
- **Fichiers joués, empreinte sha256** :
  - `apps/pro/src/venues/publication-review.test.tsx` : `ddaec6012b5958eeb3c426dbd8451c22fb831617a5f109b305c6c934c8346214`
  - `apps/pro/src/admin/session-switch.test.tsx` : `65186c958a4166577b0f8381e4edbe82c4fceddd360aab20d4b99efcc08e178a`
  - `apps/pro/src/admin/admin-source-guard.test.ts` : `dfd56b7450da546b9b25a985bb88f9e7d348b3e9e388cf964d4458da540852f5`
  - `apps/pro/src/test-support/admin-doubles.ts` : `c4aea0472233d7e5d9357f76505d6aad10f98602ec649d895d52efa042e40b6a`
- **Échecs lus : 5** (titre, puis la première ligne de son bloc — la forme de l'échec, D304 / D316) :
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/admin/admin-source-guard.test.ts [ src/admin/admin-source-guard.test.ts ]
    → Error: ENOENT: no such file or directory, open 'C:\Users\benla\Desktop\MyProjct\Zwadj\apps\pro\src\auth\require-admin.tsx'
  - [COLLECTE TOMBÉE (module ou fichier absent)] src/venues/publication-review.test.tsx [ src/venues/publication-review.test.tsx ]
    → Error: Failed to resolve import "./publication-review" from "src/venues/publication-review.test.tsx". Does the file exist?
  - [assertion] src/admin/session-switch.test.tsx > MD-ADM-10 — PRO → ADMIN → PRO dans un même navigateur : rien ne reste de l'autre compte > le PRO A lit ses salles et garde un brouillon ; il se déconnecte : ni la liste ni le brouillon ne restent lisibles
    → AssertionError: la liste de A ne survit pas à sa déconnexion: expected 'Salle de A' not to contain 'Salle de A'
  - [assertion] src/admin/session-switch.test.tsx > MD-ADM-10 — PRO → ADMIN → PRO dans un même navigateur : rien ne reste de l'autre compte > un ADMIN qui se connecte après un PRO ne voit pas la liste des salles du PRO, ni son brouillon
    → AssertionError: la liste du PRO est encore tenue sous un ADMIN: expected 'Salle de A' not to contain 'Salle de A'
  - [assertion] src/admin/session-switch.test.tsx > MD-ADM-10 — PRO → ADMIN → PRO dans un même navigateur : rien ne reste de l'autre compte > PRO A → ADMIN → PRO B : à l'INSTANT où B arrive (sa lecture n'est pas revenue), la liste de A n'est pas rendue ; B lit ensuite les sie
    → AssertionError: la liste de A est rendue à B pendant que la sienne charge: expected 'Salle de A' not to contain 'Salle de A'

## Ce qui a bougé pendant la lecture

Quatre fichiers de test ont changé entre leur PREMIÈRE exécution et la pièce ci-dessus, et les sorties versées sont celles du fichier FINAL (les deux derniers étaient des COLLECTES TOMBÉES : aucune assertion n'avait été lue, leur rouge est inchangé) :
- `apps/pro/src/admin/session-switch.test.tsx` : (1) un journal de TOUS les rendus de la sonde, parce qu'un `waitFor` ne voit que l'état final et qu'une liste périmée rendue un instant n'y est pas ; (2) le brouillon est lu DIRECTEMENT dans le magasin à l'instant de l'assertion, pas dans un texte rendu — la première version rougissait sur « présent » alors que le magasin était déjà vidé (l'effacement est un EFFET, il suit le rendu où le compte change) : **une mesure confondue, D209 n° 1**, corrigée avant de conclure.
- `apps/pro/src/admin/deletion-requests-page.test.tsx` : la requête du libellé « Client » est EXACTE — `exact: false` est insensible à la casse et « client » est une sous-chaîne de l'adresse « client@exemple.dz » : la requête aurait trouvé deux éléments (**mesure confondue, D209 n° 1**, relevée à la relecture avant toute exécution).
- `apps/pro/src/venues/publication-review.test.tsx` : le test arabe attendait le titre d'étape en FRANÇAIS (`rendreA` prend désormais la langue jouée), et le dernier test ne suppose plus la structure interne de l'assistant (il affirme la présence de l'aide et du sélecteur de visibilité).
- `apps/api/test/int/row-lock.ts` : l'attente du verrou échoue en ASSERTION (`expect`), pas en erreur d'infrastructure (D304, D305) — corrigé avant la première exécution versée.

## Ce que cette pièce ne couvre PAS (écrit)

- **La spec e2e `e2e/specs/r52-administration.e2e.ts`** pilote l'application entière ; elle s'écrit APRÈS les écrans et n'a donc **pas de rouge contre l'état d'avant**. Ses gardes sont mesurées par neutralisation (manuelle pour l'e2e, comme à D339).
- **Le harnais `neutralisation/neutralize-adm2.py`** n'existe pas encore : chaque garde de ce lot est neutralisée après le code (campagne entière, empreinte du harnais en tête de chaque journal).
