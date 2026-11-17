# D349 — rang 51 — table d'ouverture

Lot : **ADM-1 — l'API de la page d'administration** : liste des salles en attente de publication, détail d'une salle pour l'admin, publier, rejeter avec motif obligatoire, journal des actions admin (`audit_logs`), lecture du refus par le pro, script du premier admin, méthodes `admin/` de `@zwadj/api-client`. Consigne du relecteur « RANG 51 — ADM-1 » du 17/11/2026, adoptée par Ko par adoption de son message (versée dans `docs/preuves/D349/consigne.md`). Lot de **CODE** : il compte (D283), compteur POUR MÉMOIRE **VINGT-QUATRE → VINGT-CINQ** à sa clôture (limite de cinq SUSPENDUE par Ko ; aucune certification). **Aucune migration** (point 1 c de la consigne) : si la mesure dit que la colonne `venues.rejection_reason` ne suffit pas, le lot s'arrête et rapporte les options (DR8).

- **SHA de départ** : `9ec8abf702068069dff5aa07605a884a7483f9b5` = `origin/main` (relevé après `git fetch`, avant toute écriture). Branche `main`, arbre propre, aucun stash.
- **Numéro** : **D349** — dernière ligne du registre lue : D348.
- **Poste à l'ouverture** : sur secteur (`Win32_Battery.BatteryStatus` = 2, 100 %), RAM libre ≈ 5 412 Mo sur 16 095, `chrome` 0, `headless_shell` 0, `node` 0, Docker 29.8.0 lancé, conteneur `zwadj-db` en marche (« Up 14 hours »), ports 3000, 3001, 3100, 3101, 4000, 4100, 5173 et 5273 sans écoute.
- **Branches distantes relevées** : `main`, `front-client` (43996e2), `integration-45` (63511ce), `par-carte` (7fdc679) — aucune n'est touchée par ce lot. `par-carte` s'intègre APRÈS ADM-2 : chaque ligne qu'ADM-1 déplace dans un fichier qu'elle modifie devient un conflit là-bas (R-8) ; la liste des fichiers de `par-carte` est versée (`docs/preuves/D349/par-carte-fichiers.txt`).

## Les arbitrages de Ko pour l'administration — RECOPIÉS DU FICHIER, pas du message (consigne, section 2)

Source : `ZWADJ_CONTINUITE.md`, « ⛔ CADRAGE DU RANG 28 », **§ 6 « ARBITRÉ PAR KO LE 01/10/2026 (D321) — MOT POUR MOT »**, lignes 11294 à 11313 de la copie lue à `9ec8abf`. Copie mécanique (script de versement, texte non retouché), annotations de révision comprises. **D-10 s'y lit avec ses révisions annotées ; sa DERNIÈRE forme écrite est la sixième** (D336, consigne v3 du relecteur adoptée par Ko le 22/10/2026) : « D-10, sixième révision : l'ordre des lots est celui de la section 5, SANS étape de certification » — l'ordre proposé y met `47 ADM-1 · 48 ADM-2` (rangs devenus 51 et 52 par les rangs intercalés) ; les passes de certification sont en pause de Ko (22/10/2026). ⇒ ADM-1 = rang 51 ; ADM-2 = rang 52 ; **aucune certification entre les deux**.

```text
- **D-1** : « a2. Une section `/admin` dans l'app Pro. D23 devient : l'app Pro accepte un PRO hors de `/admin`, et un ADMIN
  sous `/admin` seulement. Annote « pas d'app admin » et la décision « une 4ᵉ application n'est pas justifiée » : elles
  tiennent. »
- **D-2** : « b3. Les textes de l'admin vivent hors de `packages/i18n`, en français seul. Exemption écrite de l'invariant
  bilingue, bornée aux écrans `/admin`. »
- **D-3** : « c1. Un script versionné qui promeut un compte existant, vérifié et actif, et refuse sinon. Aucun mot de passe
  manipulé. »
- **D-4** : « d-i. La salle rejetée reste en brouillon. Motif obligatoire, stocké sur la salle (migration) pour que le pro
  le lise. Le rejet est aussi journalisé (D-8). »
- **D-5** : « p2 maintenant : le pro lit le refus et son motif à l'étape « Publication ». L'e-mail (p1) est REPOUSSÉ au lot
  de l'e-mail réel. »
- **D-6** : « l2. La liste « en attente » = les brouillons vivants qui ont au moins un créneau actif. »
- **D-7** : « e1-b. La MFA est REPOUSSÉE, PAS ANNULÉE : avant le lancement, hors v1. Elle BLOQUE tout déploiement. »
- **D-8** : « e2-a. `audit_logs`, écrit dans la transaction de l'action : publier, rejeter, approuver ou rejeter une
  suppression. L'écran du journal est REPOUSSÉ. »
- **D-9** : « e3-a pour la v1, borné par `JWT_ACCESS_TTL`, et écrit. e3-c (relire rôle et statut en base sur les routes
  ADMIN) est REPOUSSÉ, PAS ANNULÉ : avant le lancement, avec la MFA. Il BLOQUE tout déploiement. »
- **D-10** : « s1. Réservation (ce rang) → ADM-1 → certification → ADM-2. » ⛔ *(D322, 02/10/2026 — **RÉVISÉE PAR KO**, mot pour mot : « D-10 est révisée : calendrier (ce rang) → certification → ADM-1 → ADM-2 → certification. » L'arbitrage s1 n'est pas réécrit : il est la forme d'avant.)* ⛔ *(D325, 04/10/2026 — **RÉVISÉE DE NOUVEAU PAR KO**, mot pour mot : « L'ordre : réparations Pro (ce rang) →
PDF de l'acompte (rang 33) → certification → ADM-1 → ADM-2 → certification. » Les deux formes précédentes ne sont pas réécrites : **ADM-1 n'est plus le lot de code qui suit le
calendrier, ni celui qui suit la certification de D324** ; il vient après le rang 32, le rang 33 et une certification — **s'il est arbitré**.)*
```

## Décisions du relecteur de la consigne (R-1 à R-10), résumées — le texte entier est dans `docs/preuves/D349/consigne.md`

- **R-1** le taux de commission n'est ni touché ni journalisé (`PATCH admin/venues/:id/commission-rate`, `setRates`) ; aucune route neuve ne lit ni n'écrit un taux, sauf le détail admin qui peut l'AFFICHER en lecture ; un fichier de la carte du chemin de l'argent qui doit changer ⇒ ARRÊT. **Voir la lecture adverse** : `venues-admin.service.ts` figure sur la carte de D304 (cible `cashback ≤ commission`, branche 1) ; ce que le lot y change et pourquoi la règle de D316 (« par sa fonction, pas par son fichier ») est la lecture retenue : `docs/preuves/D349/lecture-adverse/lecture-adverse.md`.
- **R-2** une salle rejetée reste `DRAFT`, avec son créneau, dans la liste « en attente », marquée « déjà rejetée » avec motif et date (lue au journal), rangée après les autres ; publier efface `rejection_reason` ; un cas qu'aucun MD-ADM ne couvre = décision manquante, ce point s'arrête et se rapporte.
- **R-3** le pro lit son refus par une route de lecture SÉPARÉE, `@Roles(PRO)`, pour SA salle seulement ; `VenueProDTO` ne change PAS ; la garde de `venues.service.spec.ts` reste ENTIÈRE ; le commentaire d'invariant de `venues.service.ts` reçoit une annotation ADDITIVE.
- **R-4** quatre contrats d'API neufs, eux seuls : liste « en attente », détail admin, rejet avec motif obligatoire, lecture du refus par le pro ; les trois admin dans `VenuesAdminController`, la pro dans `VenuesController` ; aucun module à toucher.
- **R-5** `audit_logs` dans la transaction des QUATRE actions de D-8 (publier, rejeter, approuver une suppression, rejeter une suppression).
- **R-6** le script du premier admin et sa spec ; jamais joué sur la base de développement de Ko ; la procédure pas à pas dans `docs/preuves/D349/premier-admin-ko.md` ; D-9 s'écrit, ne se code pas.
- **R-7** méthodes `admin/` neuves dans `@zwadj/api-client` ; tests unitaires et d'intégration, dont la course publier/rejeter (MD-ADM-4) et `rbac-all-routes` étendu (CLIENT et PRO → 403 sur chaque route admin ; ADMIN → 403 sur la route pro).
- **R-8** frontières avec `par-carte` : dans `packages/types/src/venue.ts` et `packages/i18n/messages/*.json` on n'écrit qu'un BLOC NEUF sans déplacer l'existant ; on ne touche ni `venues-public.*`, ni `venue-map.*`, ni `venues.module.ts`, ni `venue-form.tsx`, ni `apps/client`.
- **R-9** la campagne PUB-1 n'est pas rejouée ; pour les harnais neufs, **le journal de chaque passe commence par l'empreinte sha256 du harnais**.
- **R-10** HORS lot, reporté sans coder : les écrans (ADM-2), la MFA et la relecture du rôle en base (ILS BLOQUENT tout déploiement, D321), l'e-mail du rejet, l'écran du journal, cashback / KYC / gestion des utilisateurs / taux modifiable / import de salles, le cache des référentiels.

## Fichiers du lot (chemins COMPLETS)

### Preuves et procédure

| Fichier | Rôle | Statut |
|---|---|---|
| `docs/preuves/D349/table-ouverture.md` | cette table — PREMIER commit du lot, SEUL | ferme |
| `docs/preuves/D349/consigne.md` | la consigne versée telle quelle | ferme |
| `docs/preuves/D349/etat-des-lieux/releve.py` | l'état des lieux du § 1 du cadrage RE-MESURÉ à `9ec8abf` (routes ADMIN, écrivains d'`audit_logs`, méthodes `admin/` du client, dossier `admin` du Pro, `rbac-all-routes`, colonne `rejection_reason` et ses écrivains) ; rend ce qu'il a parcouru à côté de chaque total ; calibré sur un cas connu | ferme |
| `docs/preuves/D349/etat-des-lieux/releve-sortie.txt` | sa sortie | ferme |
| `docs/preuves/D349/lecture-adverse/lecture-adverse.md` | la lecture adverse de la consigne contre le dépôt, versée AVANT tout `.md` d'autorité | ferme |
| `docs/preuves/D349/par-carte-fichiers.txt` | R-8 : `git diff --name-only origin/main...origin/par-carte` et son recoupement avec les fichiers de ce lot | ferme |
| `docs/preuves/D349/regle-e2e.md` | la règle des deux passes e2e vertes de suite, commitée avant elles (R-15 de D343) | ferme |
| `docs/preuves/D349/rouges/rouges.md` | les rouges lus, avec l'empreinte sha256 de chaque fichier de test joué ; commité AVANT tout commit de code (D334, point 5) | ferme |
| `docs/preuves/D349/premier-admin-ko.md` | R-6 : la procédure, pas à pas, en mots simples, du premier compte admin (jamais jouée sur la base de Ko par ce lot) | ferme |
| `docs/preuves/D349/audit-secrets-d349a.txt` | audit de secrets avant versement (D298), scellé | ferme |
| `docs/preuves/D349/controle-fin-de-lot.txt` | la sortie du contrôle de fin de lot (D288, D328) | ferme |

### Code de l'application

| Fichier | Rôle | Statut |
|---|---|---|
| `packages/types/src/venue-moderation.ts` | **fichier NEUF** : les contrats de modération (corps du rejet, requête et page de la liste, détail admin, lecture du refus par le pro, codes d'erreur neufs, noms des actions du journal). Choisi plutôt qu'un bloc dans `venue.ts` : `venue.ts` est dans la liste de `par-carte` (R-8) — un fichier neuf n'a AUCUN conflit | ferme |
| `packages/types/src/index.ts` | UNE ligne d'export (`export * from "./venue-moderation";`) ; absent de la liste de `par-carte` | ferme |
| `apps/api/src/common/admin-audit.ts` | module PUR : construit la ligne d'`audit_logs` des quatre actions (acteur, rôle, action, entité, avant, après) ; aucun nom, numéro ni e-mail | ferme |
| `apps/api/src/common/admin-audit.spec.ts` | sa spec | ferme |
| `apps/api/src/venues/venue-review-queue.ts` | module PUR : statuts sources de publier et de rejeter, découpe d'une page sur deux groupes (non rejetées d'abord, rejetées ensuite) | ferme |
| `apps/api/src/venues/venue-review-queue.spec.ts` | sa spec | ferme |
| `apps/api/src/venues/venue-moderation.schemas.spec.ts` | la spec des schémas de `venue-moderation.ts` (motif obligatoire, bornes, clés inconnues) | ferme |
| `apps/api/src/venues/venues-admin.service.ts` | `publish` (transaction, check-and-set, efface le motif, journal), `listPending`, `detail`, `reject`. ⚠ **Fichier de la carte de D304 pour `setRates`** (R-1) : `setRates` et `VENUE_ADMIN_SELECT` ne bougent pas, gardé par une cible de `neutralize-adm1.py` | ferme |
| `apps/api/src/venues/venues-admin.service.spec.ts` | sa spec (suit la nouvelle signature de `publish`) | ferme |
| `apps/api/src/venues/venues-admin.controller.ts` | trois routes neuves (`GET admin/venues/pending-publication`, `GET admin/venues/:id`, `POST admin/venues/:id/reject`) et l'acteur passé à `publish` ; `PATCH …/commission-rate` inchangée | ferme |
| `apps/api/src/venues/venues.controller.ts` | la route pro de lecture du refus (`GET pro/venues/:id/publication`) | ferme |
| `apps/api/src/venues/venues.service.ts` | la méthode de lecture du refus et l'annotation ADDITIVE du commentaire d'invariant (R-3) | ferme |
| `apps/api/src/venues/venues.service.spec.ts` | le double du port suit le port ; la garde « JAMAIS commissionRateBps/rejectionReason/deletedAt/ownerId » reste ENTIÈRE | ferme |
| `apps/api/src/venues/venue-store.types.ts` | le port : UNE méthode de lecture du refus (le service pro ne connaît pas Prisma) | ferme |
| `apps/api/src/venues/venue-store.prisma.ts` | l'adaptateur de cette méthode (appartenance par la relation, D149 ; date lue au journal) | ferme |
| `apps/api/src/venues/venue-store.prisma.spec.ts` | sa spec | ferme |
| `apps/api/src/account/account-deletion.service.ts` | le journal dans la transaction de `approve` et de `reject` (R-5) ; `reject` entre dans une transaction ; rien d'autre ne change | ferme |
| `apps/api/src/account/account-deletion.service.spec.ts` | sa spec | ferme |
| `apps/api/src/admin/first-admin.ts` | module PUR : qui peut être promu (compte existant, `ACTIVE`, e-mail vérifié) et ce que le script écrit ; aucun mot de passe | ferme |
| `apps/api/src/admin/first-admin.spec.ts` | sa spec | ferme |
| `apps/api/prisma/promote-first-admin.ts` | le script versionné (D-3) ; vit à côté des autres scripts (`seed.ts`, `seed-demo.ts`), donc sous `eslint` et `tsc` | ferme |
| `apps/api/package.json` | UNE entrée de scripts (`admin:promote`) | ferme |
| `packages/api-client/src/admin-client.ts` | les méthodes `admin/` : liste, détail, publier, rejeter, file des suppressions, approuver, rejeter une suppression — chaque chemin LITTÉRAL dans l'appel (D182) | ferme |
| `packages/api-client/src/admin-client.test.ts` | sa spec | ferme |
| `packages/api-client/src/venue-publication-client.ts` | la méthode pro de lecture du refus (client à part : `VenueCrudClient` n'est pas étendu, ses doubles vivent dans `apps/pro`) | ferme |
| `packages/api-client/src/venue-publication-client.test.ts` | sa spec | ferme |
| `packages/api-client/src/index.ts` | les exports des deux clients ; absent de la liste de `par-carte` | ferme |

### Tests d'intégration (PostgreSQL réel)

| Fichier | Rôle | Statut |
|---|---|---|
| `apps/api/test/int/admin-moderation.int-spec.ts` | **NEUF** : la liste (filtrée AVANT la page, rejetées après), le détail, le rejet, publier qui efface le motif, la lecture du refus par le pro, la course publier/rejeter (MD-ADM-4), les 404 indistincts | ferme |
| `apps/api/test/int/admin-audit.int-spec.ts` | **NEUF** : les quatre actions écrivent UNE ligne dans leur transaction ; un échec forcé du journal annule l'action (MD-ADM-6) ; aucune donnée personnelle dans la ligne | ferme |
| `apps/api/test/int/first-admin.int-spec.ts` | **NEUF** : le script promeut un compte vérifié et actif, refuse tout autre, n'écrit aucun mot de passe | ferme |
| `apps/api/test/int/rbac-all-routes.int-spec.ts` | le plancher des routes admin relevé ; « un ADMIN ne franchit AUCUNE route réservée au PRO » | ferme |

### Harnais

| Fichier | Rôle | Statut |
|---|---|---|
| `neutralisation/neutralize-adm1.py` | chaque garde neuve neutralisée, rouge lu, restaurée ; **le journal de chaque passe commence par l'empreinte sha256 du harnais** (R-9) | ferme |

### Fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

| Fichier | Rôle | Statut |
|---|---|---|
| `ZWADJ_CONTINUITE.md` | section D349, registre, ordre des rangs (« RANG 51 : CLOS » puis « RANG 52 : EN ATTENTE DE CADRAGE DU RELECTEUR »), état à la clôture | ferme |
| `ZWADJ_BACKLOG.md` | ce que R-10 reporte et les défauts croisés rapportés | ferme |
| `AGENTS.md` | la chaîne d'annotations du compteur (rang 51 clos, compteur VINGT-CINQ) ; seulement si une règle permanente en découle | ferme |

## Fichiers CONDITIONNELS (leur existence dépend d'un résultat)

| Fichier | Condition |
|---|---|
| `docs/preuves/D349/lecture-adverse/ecarts.md` | seulement si la lecture adverse trouve un écart avec la consigne qui ne tient pas dans `lecture-adverse.md` |
| `docs/preuves/D349/rouges/rouge-N.txt` | un fichier par rouge lu, déclaré par extension avec son chemin complet avant son commit |
| `docs/preuves/D349/neutralisation/` (sorties du harnais, une par passe) | déclarées par extension avec chemins complets ; **chacune commence par l'empreinte sha256 du harnais** |
| `docs/preuves/D349/portes/` (les six portes) et `docs/preuves/D349/e2e/` (les deux passes) | les sorties, déclarées par extension avec chemins complets avant leur commit ; journaux bruts versés MASQUÉS (`masquer-jetons.py`) |
| `docs/preuves/D349/arret.md` | seulement si une règle d'arrêt joue (colonne insuffisante, fichier de `par-carte` à toucher, cas qu'aucun MD-ADM ne couvre qui bloque) : le besoin et les options |
| `apps/api/test/int/venues-admin.int-spec.ts` | seulement si une assertion existante doit suivre un changement VOULU (la publication reste idempotente et `updatedAt` ne bouge pas : aucun changement attendu) |
| `apps/api/test/int/contract-api-client.int-spec.ts` | seulement si le test de contrat ne couvre pas les clients neufs sans modification |
| `neutralisation/lancer-campagnes.py` | seulement si le tri par fichiers touchés exige d'enregistrer le harnais ; sinon NON touché |
| `docs/preuves/D349/masquage/` | la procédure de masquage et son compte rendu, si un journal brut est versé |

## Ce que cette table NE déclare PAS (volontairement)

- **Aucune migration, aucun `schema.prisma`** : `venues.rejection_reason` et `audit_logs` existent depuis `20260707000000_init`. `apps/api/test/int/migration-non-empty.int-spec.ts` ne se retarge pas.
- **`packages/types/src/venue.ts`, `packages/i18n/messages/fr.json`, `packages/i18n/messages/ar.json`** : non touchés (R-8). Les codes d'erreur neufs n'ont pas de texte dans les catalogues (D-2 : les textes de l'admin vivent hors de `packages/i18n`, en français seul, avec l'écran — ADM-2) ; la porte de parité n'est pas modifiée.
- **`apps/api/src/venues/venues.module.ts`, `apps/api/src/venues/venues-public.*`, `apps/api/src/venues/venue-map.*`, `apps/pro/src/venues/venue-form.tsx`, tout `apps/client/`** : les fichiers de `par-carte` (R-8) — non touchés.
- **`apps/api/src/app.module.ts`, `apps/api/src/account/account.module.ts`, `apps/api/src/auth/`** : non touchés (aucun module, aucune garde, aucun jeton).
- **`apps/pro/`** : aucun écran (ADM-2 est le rang 52).
- **`e2e/`** : aucune spec neuve ; la suite e2e est jouée DEUX fois pour prouver qu'elle reste verte.
- **Tout fichier d'un chemin sous `apps/`, `packages/` ou `neutralisation/` qui n'est pas dans une table ci-dessus** : AUCUN n'est déclaré ; un fichier de plus exige une extension, commitée seule, qui le nomme avec le rouge ou le besoin qui le justifie.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, **avant** le commit du fichier qu'elle couvre, avec son motif. *(Aucune à l'ouverture.)*

**Extension 1** (17/11/2026, commitée SEULE, AVANT les pièces qu'elle couvre). Motif : la table n'avait pas la pièce du TRI de l'audit de secrets « a » (le tri des alertes nouvelles, D299) ni les chemins complets des sorties de rouges, nommées par famille (« un fichier par rouge »). Aucune de ces pièces n'est encore commitée. Aucun fichier de code n'est ajouté par cette extension.

| chemin | rôle | statut |
|---|---|---|
| `docs/preuves/D349/aucune-valeur-reelle.txt` | le tri des 7 alertes nouvelles de l'audit « a » et la mention du contrôle dédié « 0 valeur réelle » (non joué à ce versement : aucun journal brut) | à venir |
| `docs/preuves/D349/rouges/rouge-1-unit-api.txt` | la sortie brute de vitest sur les specs unitaires de l'API écrites par ce lot, contre le code d'AVANT (aucun code d'application encore écrit) | à venir |
| `docs/preuves/D349/rouges/rouge-2-int.txt` | la sortie brute de vitest d'intégration (PostgreSQL réel) sur les specs d'intégration de ce lot, contre le code d'AVANT | à venir |
| `docs/preuves/D349/rouges/rouge-3-api-client.txt` | la sortie brute de vitest sur les specs de `@zwadj/api-client` de ce lot, contre le code d'AVANT | à venir |

**Extension 2** (17/11/2026, commitée SEULE, AVANT les pièces qu'elle couvre). Motif : le versement des rouges (tests et pièces) exige son audit de secrets et le tri de ses alertes nouvelles (D298, D299) ; la table n'avait que ceux du premier versement. Aucune de ces pièces n'est encore commitée. Aucun fichier de code n'est ajouté.

| chemin | rôle | statut |
|---|---|---|
| `docs/preuves/D349/audit-secrets-d349b.txt` | l'audit de secrets « b » (avant le versement des tests et des rouges), scellé | à venir |
| `docs/preuves/D349/aucune-valeur-reelle-b.txt` | le tri de ses alertes nouvelles | à venir |
