# D350 — rang 52 — table d'ouverture

Lot : **ADM-2 — les écrans `/admin` dans l'app Pro, et le pro qui lit son refus.** Trois écrans français sous `/admin` (salles en attente, détail d'une salle, demandes de suppression de compte), la garde de rôle ADMIN, l'étape « Publication » du pro qui lit son refus (français ET arabe), la correction du motif d'une salle déjà rejetée, la file des suppressions rendue sûre AVANT qu'un bouton ne déclenche son action irréversible, et l'e2e du chemin réel. Consigne du relecteur « RANG 52 — ADM-2 », texte proposé le 17/11/2026, adopté par Ko tel quel (`docs/preuves/D350/consigne.md`, versée dans un commit postérieur à cette table).

- **SHA de départ** : `b8e5511d20c1ad037b431f221170eda7b0d7786b` = `origin/main` (relevé après `git fetch`, avant toute écriture). Branche `main`, arbre propre (aucune ligne de `git status --short`), aucun stash.
- **Numéro** : **D350** — dernière ligne du registre lue : D349.
- **Poste à l'ouverture** : sur secteur (`Win32_Battery.BatteryStatus` = 2), RAM libre ≈ 3 911 Mo (⚠ plus bas que la barre de 4 579 Mo des CERTIFICATIONS ; ce lot n'en est pas une, les certifications sont en pause), `chrome` 0, `headless_shell` 0, Docker 29.8.0 lancé, conteneur `zwadj-db` en marche (« Up 22 hours »), ports 3000, 3001, 3100, 3101, 4000, 4100, 5173 et 5273 sans écoute.
- **Branches distantes relevées** : `main` (`b8e5511`), `front-client` (`43996e2`), `integration-45` (`63511ce`), `par-carte` (`7fdc679`) — aucune n'est touchée par ce lot. `par-carte` s'intègre APRÈS (rang 53, candidat) : chaque ligne qu'ADM-2 déplace dans un fichier qu'elle modifie devient un conflit là-bas (R-9) ; sa liste de fichiers est versée (`docs/preuves/D350/par-carte-fichiers.txt`).
- **Compteur** : POUR MÉMOIRE VINGT-CINQ ; lot de CODE (il compte, D283) : VINGT-SIX à la clôture. Limite de cinq SUSPENDUE par Ko ; aucune certification, aucune marque.

## Les arbitrages de Ko — RECOPIÉS DU FICHIER, pas du message (consigne, section 2)

Source : `ZWADJ_CONTINUITE.md`, « ⛔ CADRAGE DU RANG 28 », **§ 6 « ARBITRÉ PAR KO LE 01/10/2026 (D321) — MOT POUR MOT »**, copie de la version lue à `b8e5511`. Copie MÉCANIQUE (cette table est assemblée par un script qui LIT le fichier ; texte non retouché, annotations de révision comprises). Les cinq décisions que la consigne nomme (D-1, D-2, D-5, D-6, D-9) et les deux qui bornent la correction du motif et le journal (D-4, D-8).

```text
- **D-1** : « a2. Une section `/admin` dans l'app Pro. D23 devient : l'app Pro accepte un PRO hors de `/admin`, et un ADMIN
  sous `/admin` seulement. Annote « pas d'app admin » et la décision « une 4ᵉ application n'est pas justifiée » : elles
  tiennent. »
- **D-2** : « b3. Les textes de l'admin vivent hors de `packages/i18n`, en français seul. Exemption écrite de l'invariant
  bilingue, bornée aux écrans `/admin`. »
- **D-4** : « d-i. La salle rejetée reste en brouillon. Motif obligatoire, stocké sur la salle (migration) pour que le pro
  le lise. Le rejet est aussi journalisé (D-8). »
- **D-5** : « p2 maintenant : le pro lit le refus et son motif à l'étape « Publication ». L'e-mail (p1) est REPOUSSÉ au lot
  de l'e-mail réel. »
- **D-6** : « l2. La liste « en attente » = les brouillons vivants qui ont au moins un créneau actif. »
- **D-8** : « e2-a. `audit_logs`, écrit dans la transaction de l'action : publier, rejeter, approuver ou rejeter une
  suppression. L'écran du journal est REPOUSSÉ. »
- **D-9** : « e3-a pour la v1, borné par `JWT_ACCESS_TTL`, et écrit. e3-c (relire rôle et statut en base sur les routes
  ADMIN) est REPOUSSÉ, PAS ANNULÉ : avant le lancement, avec la MFA. Il BLOQUE tout déploiement. »
```

**Réponse de Ko à la question de D349 (consigne, section 1 c)** : l'admin PEUT corriger le motif d'une salle déjà rejetée. Le nouveau motif remplace l'ancien sur la salle ; la ligne de journal garde l'ancien ET le nouveau (avant / après). Le même motif rejoué reste un 200 sans nouvelle ligne (S-185, MD-ADM-4). Aucune migration.

## Les modes de défaillance qui touchent l'écran — RECOPIÉS DU FICHIER (consigne, section 2 : « ta liste de gardes »)

Source : `ZWADJ_CONTINUITE.md`, « ⛔ CADRAGE DU RANG 28 », **§ 3 « Modes de défaillance »**, MD-ADM-1, 5, 7, 9, 10, 11, 12, 15 et 16, copie mécanique.

```text
- **MD-ADM-1 · un non-ADMIN atteint une donnée ou une action admin.** La garde du front n'est qu'un confort ; l'autorité est
  `RolesGuard`. Une route admin placée dans un contrôleur **sans** `@Roles(ADMIN)` de classe sortirait de la surveillance de
  `rbac-all-routes` (D119).
- **MD-ADM-5 · un rejet que le pro ne comprend pas** : motif absent ou perdu ; une notification qui échoue après commit ne
  défait pas le rejet, et s'écrit au journal (patron de F6).
- **MD-ADM-7 · le taux redevient modifiable depuis la page** (décision du relecteur violée) : la page ne contient **aucun**
  appel à `…/commission-rate` — garde de **source**, neutralisable.
- **MD-ADM-9 · les écrans admin indexés ou découvrables** (a3) : `noindex`, hors plan du site, aucune donnée admin dans un
  rendu serveur public.
- **MD-ADM-10 · collision de sessions** : un seul `zwadj_rt` par navigateur — se connecter en ADMIN déconnecte le PRO dans le
  même navigateur, et inversement. **Quel que soit l'emplacement.**
- **MD-ADM-11 · la parité ment ou rougit** (b1, b2) ; ou un texte destiné au **pro** (rejet) n'existe qu'en français.
- **MD-ADM-12 · CORS** (a1) : origine absente de `CORS_ORIGINS` en production ⇒ tout appel échoue au navigateur ; ou un joker
  ajouté — incompatible avec `credentials: true`, et une ouverture.
- **MD-ADM-15 · l'écran affiche une action comme faite alors que l'API l'a refusée** ; un refus métier présenté comme une
  panne, ou l'inverse (D217).
- **MD-ADM-16 · l'e2e ne joue pas le chemin réel** : une fixture ADMIN par `UPDATE` SQL ne prouve ni (c1) ni (c2).
```

## Les décisions du relecteur de la consigne (R-1 à R-11), résumées — le texte entier est dans `docs/preuves/D350/consigne.md`

- **R-1** le rang 51 est accepté ; S-180 lue par la FONCTION du changement (D316) ; la phrase de la consigne du rang 51 qui la contredisait était une erreur du relecteur, nommée ; le commit `5f39779` reste.
- **R-2** AVANT les écrans, la file des suppressions : l'écran va donner un bouton à une action IRRÉVERSIBLE. Constat du relecteur, PAR LECTURE, à mesurer : `approve` lit la demande « en attente » AVANT sa transaction (`loadPending`) puis écrit par `id` ; l'annulation par l'utilisateur est, elle, un check-and-set. Pistes : (i) deux approbations simultanées ⇒ deux lignes de journal ; (ii) une approbation pendant que l'utilisateur ANNULE ⇒ compte anonymisé alors que la demande vient d'être annulée. Rouges d'abord (les deux courses, et rejeter × approuver). Rouge ⇒ le contrôle de statut entre DANS la transaction en check-and-set ; vert ⇒ la garde reste, rien n'est changé, et la session le dit.
- **R-3** la branche « corriger le motif » dans `reject` (fonction de modération, pas de taux : S-180 s'applique) : rouge d'abord, puis la branche, puis neutralisée.
- **R-4** la garde de rôle ADMIN à côté de `RequirePro` : un ADMIN qui se connecte arrive sous `/admin` ; un ADMIN hors de `/admin` est renvoyé sous `/admin` ; un PRO ou un CLIENT sous `/admin` voit un refus explicite (pas un écran vide, pas un 403 silencieux). L'API reste l'autorité (MD-ADM-1).
- **R-5** trois écrans sous `/admin`, en français seul (D-2) : (1) salles en attente — la file de D349, les rejetées marquées (motif, date) et rangées après ; (2) détail d'une salle — Publier, Rejeter (motif obligatoire), Corriger le motif, le taux AFFICHÉ en lecture seule, AUCUN appel à `…/commission-rate` (garde de SOURCE, MD-ADM-7, neutralisée) ; (3) demandes de suppression de compte — liste, approuver, rejeter avec motif ; l'approbation est IRRÉVERSIBLE : une fenêtre de confirmation qui le dit, avant l'appel. Tout refus métier de l'API (dont `VENUE_ALREADY_REJECTED`, « pas de créneau actif ») s'affiche comme un REFUS, jamais comme une panne ni comme une action faite (MD-ADM-15). Les codes d'erreur neufs reçoivent leur texte français ici, hors `packages/i18n` (S-183).
- **R-6** le pro lit son refus (D-5) par `GET pro/venues/:id/publication` : un COMPOSANT NEUF, rendu là où la mesure situe l'étape « Publication » ; `venue-form.tsx` n'est PAS modifié (`par-carte` y écrit). Si D-5 ne peut se tenir sans le toucher : ARRÊT de ce point. Textes du pro en français ET en arabe dans `packages/i18n`, sous la porte de parité ; clés arabes neuves listées « à relire par un humain ».
- **R-7** MD-ADM-9 : les écrans `/admin` ne sont ni indexables ni annoncés (mesurer ce que l'app Pro fait déjà ; n'ajouter que ce qui manque). MD-ADM-10 : un même navigateur qui passe d'un compte PRO à un compte ADMIN ne garde rien de l'autre (le brouillon du parcours sur place de D345 compris — à mesurer).
- **R-8** e2e du chemin RÉEL (MD-ADM-16), avec la fabrique d'admin de la suite (patron r37, r50) : connexion ADMIN → file → détail → publier, et la salle se voit sur le site client ; rejeter → le pro lit le motif, en FR et en AR ; corriger le motif → le pro lit le nouveau ; suppression rejetée, puis approuvée après confirmation ; un PRO sous `/admin` refusé. Deux passes e2e vertes de suite, règle commitée avant (R-15 de D343).
- **R-9** frontières avec `par-carte` : on ne touche ni `venue-form.tsx`, ni `venue-pin-map.*`, ni le `theme.css` de l'app Pro (sauf un bloc NEUF en fin de fichier ; **ce lot n'en écrit pas** : les styles neufs vivent dans un fichier neuf), ni `apps/client` hors ce que l'e2e lit, ni `apps/api/src/venues/venues-public.*`, `venue-map.*`, `venues.module.ts`. Dans `packages/types` et `packages/i18n` : un bloc NEUF seulement.
- **R-10** le premier compte admin : la procédure de D349 est un GESTE DE KO sur SA base ; la session ne la joue pas sur la base de développement de Ko.
- **R-11** HORS lot, à reporter sans coder : MFA et relecture du rôle en base (ils BLOQUENT tout déploiement, D321 — redit au rapport) ; e-mail du rejet ; écran du journal ; rétrograder un admin ; taux modifiable ; cashback, KYC, gestion des utilisateurs, import de salles ; le cache des référentiels (sans rang).

## Fichiers du lot (chemins COMPLETS)

### Preuves et procédure

| Fichier | Rôle | Statut |
|---|---|---|
| `docs/preuves/D350/table-ouverture.md` | cette table — PREMIER commit du lot, SEUL | ferme |
| `docs/preuves/D350/consigne.md` | la consigne versée telle quelle | ferme |
| `docs/preuves/D350/etat-des-lieux/releve.py` | l'état des lieux RE-MESURÉ à `b8e5511` : la garde de rôle du Pro et ce qu'elle fait d'un ADMIN, les endroits où `PublicationBadge` est rendu, les `<meta name="robots">` et `robots.txt` de l'app Pro, les usages de `loadPending`, tout chemin `/admin` déjà écrit dans `apps/pro/src` ; rend ce qu'il a parcouru à côté de chaque total ; calibré sur deux bras | ferme |
| `docs/preuves/D350/etat-des-lieux/releve-sortie.txt` | sa sortie | ferme |
| `docs/preuves/D350/lecture-adverse/lecture-adverse.md` | la lecture adverse de la consigne contre le dépôt, versée AVANT tout `.md` d'autorité | ferme |
| `docs/preuves/D350/par-carte-fichiers.txt` | R-9 : `git diff --name-only origin/main...origin/par-carte` et son recoupement avec les fichiers de ce lot | ferme |
| `docs/preuves/D350/regle-e2e.md` | la règle des deux passes e2e vertes de suite et des portes, commitée avant elles (R-15 de D343) | ferme |
| `docs/preuves/D350/rouges/rouges.md` | les rouges lus, avec l'empreinte sha256 de chaque fichier de test joué ; commité AVANT tout commit de code d'application (D334, point 5) | ferme |
| `docs/preuves/D350/scenarios-ko.md` | les gestes de Ko : créer son premier compte admin (procédure de D349), puis publier, rejeter, corriger un motif, lire le refus côté pro en français et en arabe, rejeter puis approuver une suppression sur un compte d'essai ; et ce que Ko voit en se connectant ensuite (R-10) | ferme |
| `docs/preuves/D350/audit-secrets-d350a.txt` | audit de secrets avant le premier versement (D298), scellé | ferme |
| `docs/preuves/D350/controle-fin-de-lot.txt` | la sortie du contrôle de fin de lot (D288, D328) | ferme |

### Code de l'API — R-2 et R-3

| Fichier | Rôle | Statut |
|---|---|---|
| `apps/api/test/int/account-deletion-race.int-spec.ts` | **NEUF** : les courses de la file des suppressions sur PostgreSQL réel — approuver deux fois, approuver pendant l'annulation par l'utilisateur, rejeter × approuver dans les deux ordres ; chaque entrelacement est FORCÉ par un verrou de ligne tenu hors du service (pas par un décalage de millisecondes) | ferme |
| `apps/api/src/account/account-deletion.service.ts` | le contrôle de statut de `approve` et de `reject` entre DANS la transaction en check-and-set (`updateMany` conditionné à `PENDING`, compte = 1 exigé ; la relecture ne sert qu'à choisir le code d'erreur) | **CONDITIONNEL** — seulement si les rouges de R-2 sont ROUGES ; verts ⇒ aucun changement, et la session le dit |
| `apps/api/src/account/account-deletion.service.spec.ts` | sa spec, qui suit le service s'il change | **CONDITIONNEL** — avec le fichier ci-dessus |
| `apps/api/src/venues/venues-admin.service.ts` | `reject` : la branche « corriger le motif » (check-and-set sur le motif PRÉCÉDENT, une ligne de journal qui porte l'ancien ET le nouveau) ; `setRates` et `VENUE_ADMIN_SELECT` ne bougent pas (S-180) | ferme |
| `apps/api/src/venues/venues-admin.service.spec.ts` | sa spec | ferme |
| `apps/api/src/common/admin-audit.ts` | `venueRejectEntry` reçoit le motif précédent (`before.rejectionReason`) ; module PUR, aucune donnée personnelle | ferme |
| `apps/api/src/common/admin-audit.spec.ts` | sa spec | ferme |
| `apps/api/test/int/admin-moderation.int-spec.ts` | le test « DÉCISION MANQUANTE » (un autre motif ⇒ 409) devient la correction (⇒ 200, avant / après au journal) : changement VOULU d'une assertion, nommé ; la course de deux corrections simultanées s'y ajoute | ferme |
| `apps/api/test/int/admin-audit.int-spec.ts` | la ligne du journal d'une correction (ancien ET nouveau), si le fichier est l'endroit de cette mesure | **CONDITIONNEL** |
| `packages/types/src/venue-moderation.ts` | seulement un COMMENTAIRE (le code `VENUE_ALREADY_REJECTED` ne se lit plus « déjà rejetée avec un autre motif ») ; aucun contrat neuf | **CONDITIONNEL** |

### Code de l'application Pro — R-4, R-5, R-6, R-7

| Fichier | Rôle | Statut |
|---|---|---|
| `apps/pro/src/routes.ts` | les adresses `/admin` (UNE table, comme toutes les routes du Pro) | ferme |
| `apps/pro/src/routes.test.tsx` | chaque constante neuve est une route DÉCLARÉE | ferme |
| `apps/pro/src/App.tsx` | les routes `/admin/*` derrière la garde ADMIN ; le fournisseur du client admin | ferme |
| `apps/pro/src/App.test.tsx` | seulement si une assertion existante doit suivre | **CONDITIONNEL** |
| `apps/pro/src/auth/require-pro.tsx` | un ADMIN hors de `/admin` est renvoyé sous `/admin` (`RequireProSession`, `RedirectIfSession`) ; un CLIENT garde la carte « mauvais rôle » | ferme |
| `apps/pro/src/auth/require-admin.tsx` | **NEUF** : la garde ADMIN (anonyme ⇒ connexion ; PRO ou CLIENT ⇒ refus explicite avec déconnexion) | ferme |
| `apps/pro/src/auth/require-admin.test.tsx` | **NEUF** : sa spec, et la table de redirection des trois rôles | ferme |
| `apps/pro/src/auth/login-page.tsx` | la destination après connexion suit le rôle (un ADMIN arrive sous `/admin`) | ferme |
| `apps/pro/src/admin/admin-client-context.tsx` | **NEUF** : le client admin, bâti sur `authedRequest` (jeton partagé, mutex de refresh), injectable pour les tests | ferme |
| `apps/pro/src/admin/admin-texts.ts` | **NEUF** : TOUS les textes de l'admin, en français, HORS `packages/i18n` (D-2), dont le texte de chaque code d'erreur neuf (S-183) | ferme |
| `apps/pro/src/admin/admin-texts.test.ts` | **NEUF** : un texte pour chaque code d'erreur que les écrans peuvent recevoir (autorité : les enums de `@zwadj/types`) | ferme |
| `apps/pro/src/admin/admin-shell.tsx` | **NEUF** : la coquille `/admin` (titre, trois entrées, déconnexion) ; `noindex` posé pendant que l'écran est monté | ferme |
| `apps/pro/src/admin/use-no-index.ts` | **NEUF** : pose et retire `<meta name="robots" content="noindex, nofollow">` (MD-ADM-9) | ferme |
| `apps/pro/src/admin/venue-queue-page.tsx` | **NEUF** : écran 1, la file des salles en attente | ferme |
| `apps/pro/src/admin/venue-review-page.tsx` | **NEUF** : écran 2, le détail d'une salle : Publier, Rejeter, Corriger le motif, taux en lecture | ferme |
| `apps/pro/src/admin/deletion-requests-page.tsx` | **NEUF** : écran 3, les demandes de suppression : liste, rejeter avec motif, approuver après confirmation | ferme |
| `apps/pro/src/admin/admin.css` | **NEUF** : les styles des trois écrans (aucun bloc ajouté au `theme.css` de `par-carte`) | ferme |
| `apps/pro/src/admin/venue-queue-page.test.tsx` | **NEUF** : sa spec | ferme |
| `apps/pro/src/admin/venue-review-page.test.tsx` | **NEUF** : sa spec | ferme |
| `apps/pro/src/admin/deletion-requests-page.test.tsx` | **NEUF** : sa spec | ferme |
| `apps/pro/src/admin/admin-source-guard.test.ts` | **NEUF** : garde de SOURCE — aucun appel à `commission-rate`, aucun texte d'admin dans `packages/i18n`, aucune adresse `/admin` écrite hors de `routes.ts` (MD-ADM-7, D-2) | ferme |
| `apps/pro/src/admin/use-no-index.test.tsx` | **NEUF** : la balise existe pendant l'écran et disparaît en le quittant | ferme |
| `apps/pro/src/admin/session-switch.test.tsx` | **NEUF** : PRO → ADMIN → PRO dans un même navigateur : rien ne reste de l'autre compte, brouillon du parcours sur place compris (MD-ADM-10) | ferme |
| `apps/pro/src/test-support/admin-doubles.ts` | **NEUF** : les doubles du client admin, à UN endroit (D331) ; le faux serveur est honnête (une écriture n'existe qu'à sa réponse) | ferme |
| `apps/pro/src/venues/publication-review.tsx` | **NEUF** : le COMPOSANT du refus (état de publication, motif, date) lu par `GET pro/venues/:id/publication` | ferme |
| `apps/pro/src/venues/publication-review.test.tsx` | **NEUF** : sa spec (français et arabe, refus métier vs panne) | ferme |
| `apps/pro/src/venues/edit-venue-page.tsx` | rend le composant neuf là où la mesure situe l'étape « Publication » ; **`venue-form.tsx` n'est pas touché** | ferme |
| `apps/pro/src/venues/venue-client-context.tsx` | fournit le client de lecture du refus (injectable) | ferme |
| `apps/pro/src/test-support/client-doubles.ts`, `apps/pro/src/venues/edit-venue-save.test.tsx`, `apps/pro/src/venues/venue-wizard.test.tsx`, `apps/pro/src/venues/ma-salle-relecture.test.tsx`, `apps/pro/src/venues/a3-unexpected-responses.test.tsx` | seulement si une assertion ou un double existant doit suivre l'appel neuf de l'écran de la salle | **CONDITIONNEL** |
| `packages/i18n/messages/fr.json`, `packages/i18n/messages/ar.json` | UN BLOC NEUF de premier niveau (`publicationReview`), inséré LOIN de la fin du fichier (le bloc de `par-carte` y est écrit) ; clés arabes listées « à relire par un humain » | ferme |
| `apps/client/src/lib/adresses-guard.test.ts`, `apps/client/src/lib/login-path-guard.test.ts` | seulement si une garde de ces fichiers doit connaître les adresses neuves | **CONDITIONNEL** |

### Tests de bout en bout

| Fichier | Rôle | Statut |
|---|---|---|
| `e2e/specs/r52-administration.e2e.ts` | **NEUF** : le chemin RÉEL (connexion ADMIN → file → détail → publier ; rejeter ; corriger ; suppression rejetée puis approuvée ; un PRO refusé sous `/admin`) ; fabrique d'admin du patron r37 / r50 | ferme |

### Harnais

| Fichier | Rôle | Statut |
|---|---|---|
| `neutralisation/neutralize-adm2.py` | chaque garde neuve neutralisée, rouge lu, restaurée ; **le journal de chaque passe commence par l'empreinte sha256 du harnais** ; un harnais modifié en cours de campagne ⇒ campagne rejouée EN ENTIER | ferme |
| `neutralisation/neutralize-adm1.py` | les ancres de `reject` et de la ligne de journal bougent avec R-3 : ses cibles se REPOSENT, et la campagne entière se rejoue | **CONDITIONNEL** — seulement si une ancre ne trouve plus son texte |

### Fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

| Fichier | Rôle | Statut |
|---|---|---|
| `ZWADJ_CONTINUITE.md` | section D350, registre, ordre des rangs (« RANG 52 : CLOS » puis « RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR »), état à la clôture | ferme |
| `ZWADJ_BACKLOG.md` | ce que R-11 reporte et les défauts croisés rapportés | ferme |
| `AGENTS.md` | la chaîne d'annotations du compteur (rang 52 clos, compteur VINGT-SIX) ; l'annotation de la phrase de D349 sur le second rejet ; et seulement les règles permanentes qui en découlent | ferme |

## Fichiers CONDITIONNELS dont l'existence dépend d'un résultat (liste des PIÈCES)

| Fichier | Condition |
|---|---|
| `docs/preuves/D350/lecture-adverse/ecarts.md` | seulement si la lecture adverse trouve un écart avec la consigne qui ne tient pas dans `lecture-adverse.md` |
| `docs/preuves/D350/rouges/rouge-N.txt` | un fichier par rouge lu, déclaré par extension avec son chemin complet avant son commit |
| `docs/preuves/D350/neutralisation/` (sorties du harnais, une par passe) | déclarées par extension avec chemins complets ; **chacune commence par l'empreinte sha256 du harnais** |
| `docs/preuves/D350/portes/` (les six portes) et `docs/preuves/D350/e2e/` (les deux passes) | les sorties, déclarées par extension avec chemins complets avant leur commit ; journaux bruts versés MASQUÉS (`masquer-jetons.py`) |
| `docs/preuves/D350/arret.md` | seulement si une règle d'arrêt joue (R-6 ne tient pas sans toucher `venue-form.tsx` ; un fichier de `par-carte` à toucher ; un cas qu'aucun MD-ADM ne couvre) : le besoin et les options |
| `docs/preuves/D349/premier-admin-ko.md` | seulement si l'écran exige un AJOUT à la procédure de D349 ; par défaut, ce que Ko voit ensuite est écrit dans `scenarios-ko.md` et la pièce de D349 reste intacte |
| `docs/preuves/D350/masquage/` | la procédure de masquage et son compte rendu, si un journal brut est versé |

## Ce que cette table NE déclare PAS (volontairement)

- **Aucune migration, aucun `schema.prisma`** : la correction du motif écrit `venues.rejection_reason` et une ligne d'`audit_logs`, qui existent. `apps/api/test/int/migration-non-empty.int-spec.ts` ne se retarge pas.
- **`apps/pro/src/venues/venue-form.tsx`, `apps/pro/src/venues/venue-pin-map.*`, `apps/pro/src/theme.css`, `packages/types/src/venue.ts`, `packages/ui/**`, `apps/api/src/venues/venues-public.*`, `apps/api/src/venues/venue-map.*`, `apps/api/src/venues/venues.module.ts`, tout `apps/client/` hors les deux gardes conditionnelles ci-dessus** : les fichiers de `par-carte` ou ce qui n'a pas de raison de bouger (R-9).
- **`apps/pro/index.html`** : la balise `noindex` se pose pendant que les écrans `/admin` sont montés, pas pour tout le Pro (changer l'indexation de l'application entière n'est pas demandé).
- **`apps/api/src/app.module.ts`, `apps/api/src/auth/`, `apps/api/prisma/promote-first-admin.ts`, `apps/api/src/admin/first-admin.ts`** : aucune garde, aucun jeton, aucun module, le script du premier admin n'est pas retouché.
- **`apps/api/test/int/rbac-all-routes.int-spec.ts`, `apps/api/test/int/contract-api-client.int-spec.ts`** : aucune route neuve, aucun chemin neuf dans les clients.
- **`e2e/fixtures/harness.ts`, `e2e/playwright.config.ts`, les autres specs e2e** : la fabrique d'admin est celle de r37 et de r50, recopiée dans la spec neuve comme elles le font.
- **Tout fichier d'un chemin sous `apps/`, `packages/`, `e2e/` ou `neutralisation/` qui n'est pas dans une table ci-dessus** : AUCUN n'est déclaré ; un fichier de plus exige une extension, commitée seule, qui le nomme avec le rouge ou le besoin qui le justifie.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, **avant** le commit du fichier qu'elle couvre, avec son motif. *(Aucune à l'ouverture.)*
