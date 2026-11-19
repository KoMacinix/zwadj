# D354 — lecture adverse de la consigne du rang 56 ET du cadrage de D340, contre le dépôt

**Instrument** : `docs/preuves/D354/lecture-adverse/confronter-consigne.py` (objets git à SHA fixe, `0423963`, l'état de DÉPART ; aucun fichier du disque lu). **Sortie finale** : `confronter-sortie.txt`. **Première passe** : `confronter-sortie-passe-1.txt`, **gardée, non retouchée**.

## 1. Ce que la lecture a rendu

**39 contrôles — 26 ✓ · 11 ≈ · 0 ✗ · 2 ?** (la somme égale le nombre de contrôles imprimés : 39 = 39). Calibration à deux bras, rejouée à chaque lancement : motif présent / absent d'un SHA, comptage (44 lignes `MP-nn` ; motif impossible 0), extraction de table (11 capacités ; en-tête inexistant 0) — tous les cas ont rendu leur verdict attendu.

**Aucun écart avec la reprise** : rang 55 CLOS, compteur TRENTE-CINQ, « RANG 56 : EN ATTENTE DE CADRAGE DU RELECTEUR », `origin/main` = `0423963`, arbre propre, sans stash, sur `main` (contrôles 1.a à 1.c). **Les constats du relecteur tiennent** (3.a à 3.e) : toutes les colonnes nécessaires existent dans le schéma ET dans la migration (R-1 : aucune migration) ; un seul contrôleur dans `apps/api/src/staff/` ; aucune table de capacités ; les sept contrôleurs existent ; `GET pro/venues/:id/publication` est une lecture.

## 2. La première passe de l'instrument : trois défauts DE L'INSTRUMENT, confrontés à la source avant d'être crus (D275)

| contrôle | ce que la première passe a rendu | ce que la source dit | cause |
|---|---|---|---|
| **7.a** | ✗ « le journal masque `set-cookie` » | `app.module.ts` ligne 35 : `redact: ["req.headers.authorization", "req.headers.cookie", 'res.headers["set-cookie"]']` — le masque EST là (D341) | le motif `[^\]]*` coupait au premier `]`, qui est DANS une chaîne : défaut d'instrument, pas du code |
| **6.a** | ✓ « 3 `FOR UPDATE` » | deux seulement hors commentaires (le CTE de la réservation, le verrou de `changePassword`) ; le troisième est la ligne de COMMENTAIRE qui explique le premier | un comptage par sous-chaîne sans contexte (D275) : le verdict était juste par accident |
| **8.a** | « 7 formes d'action » | l'union `StaffAuditEntry` en a 6 (7 actions) ; la septième était le type d'entrée d'un échec, qui porte aussi un `action:` | l'extraction n'était pas bornée à l'union |

Les trois sont réparés dans l'instrument, la sortie finale les relit (7.a ✓ sur la LIGNE, 6.a « attendu 2 » imprimé à côté du mesuré, 8.a « 6 formes »). Aucun ne touchait un fait du dépôt.

## 3. Les 11 ≈ et les 2 ? — chacun écrit, avec la lecture que la session en fait (S-239 à S-245, **à ratifier**)

| contrôle | tension | lecture de la session | ce que ça change pour Ko |
|---|---|---|---|
| **3.d** | deux des sept contrôleurs ne sont pas des classes `@Roles(PRO)` pures (`availability.controller.ts` a DEUX classes ; `visit-bookings.controller.ts` est `@Roles(CLIENT)` avec deux handlers PRO) | une déclaration de CLASSE s'y applique aussi aux handlers CLIENT et publics : inoffensif (le garde sort pour tout rôle ≠ PRO) ; le test dérivé du routeur le mesure | rien de visible |
| **4.b** | `peut(role, capacité)` à deux arguments ne dit pas « lecture seule » | **S-239** : `peut(role, capacité, acte)`, `acte` ∈ {lire, écrire} ; la table reste UNE donnée dans `packages/types` | rien : le comportement est celui de la table adoptée |
| **4.d** | six autres contrôleurs `@Roles(PRO)` (salle, prix, prestations) : sans déclaration, leur ligne de table serait INERTE | **S-239** : ils déclarent aussi leur capacité ; aucun comportement ne change | « changer d'avis = changer UNE ligne » devient VRAI de ces trois lignes aussi |
| **4.e** | `demandes` et `reservations` pour UN contrôleur ; `annuaire` sans route | `bookings-pro` déclare `demandes` ; les deux autres restent des lignes de données sans déclarant (✓ pour les deux rôles) | rien |
| **5.c** | `etatDuCompte(membre, maintenant)` face à « aucune horloge côté API » | **S-241** : `maintenant` est rendu par le magasin (`now()` de la base), le module pur le reçoit | rien |
| **5.d** | quel refus pour un temporaire expiré ? quel code pour « à changer » ? | **S-242** : le MÊME 401 `STAFF_INVALID_CREDENTIALS` (aucun refus ne dit pourquoi) ; 403 `STAFF_CAPABILITY_DENIED` pour l'état « à changer » — AUCUN code neuf | un écran futur ne distinguera pas « tu dois changer ton mot de passe » d'un refus de capacité par le code : il lit `mustChangePassword` de l'état (K-17) |
| **5.e** | « temporaire » n'est pas une colonne | **S-241** : `must_change_password` vaut « temporaire » | rien |
| **8.b** | « l'audit des fiches » : deux sens | **S-240** : l'audit livré est celui des trois actions de gestion du personnel ; celui des FICHES CLIENT n'est pas écrit | **la question unique du rapport** |
| **9.b, 9.c** | le cadrage dit « trois gardes », « 55 routes » : il est d'avant D341 et D349 | sa photo de départ est périmée, ses modes de défaillance § 4 restent la liste de ce lot | rien |
| **6.d** (?) | MP-6 « répétée 30 fois » n'est pas un entrelacement forcé | **S-243** : en plus des 30 répétitions, un entrelacement FORCÉ par `row-lock.ts` | la preuve est plus forte que le cadrage |
| **9.d** (?) | « aucun écran » se constate sur le diff de fin de lot | contrôle de fin de lot | rien |

**7.b** (≈, rangé avec le 7.a) — R-5 dit « `set-cookie` comme `password` masqués au journal » ; `password` n'est dans aucun chemin de `redact` et aucun corps n'est journalisé : **S-244** : une garde lit la SORTIE RÉELLE du journal pendant K-20 et K-21 ; `app.module.ts` n'est modifié que si elle trouve le temporaire. **7.c** : la fin d'une session révoquée par une réinitialisation est `PASSWORD_CHANGED`, celle d'une désactivation `DISABLED` (**S-245**).

## 4. Ce que la lecture N'A PAS tranché, et que le code tranchera avec sa décision écrite

Le corps de **K-20** n'est pas écrit au cadrage : `{ accountName, role }` — DR5 veut qu'« un second Manager réinitialise » (« deux conseillés »), donc le rôle d'un membre se CHOISIT à la création (aucune route ne le change, R-8). Les codes des refus de K-19 à K-22 (membre inconnu, déjà désactivé, dernier Manager) et le traitement d'une désactivation répétée (200 sans écriture, patron de D349) sont des décisions de session, numérotées à leur écriture.

## 5. Verdict de la lecture

**Aucun défaut bloquant.** Une tension de forme (S-240, « les fiches ») est portée à Ko comme question unique ; les autres lectures sont des décisions de session à ratifier, chacune avec ce qu'elle change. La règle d'arrêt (« un écart : tu t'arrêtes ») ne joue pas : aucun écart avec la reprise, aucune colonne ne manque.
