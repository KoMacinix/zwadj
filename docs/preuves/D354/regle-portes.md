# D354 — règle des rouges, des portes, de l'e2e et des campagnes, commitée AVANT toute passe et avant le premier code

**Sources** : la consigne du rang 56 (`docs/preuves/D354/consigne.md`), R-1 à R-8 et § 3 ; la table d'ouverture ; `docs/preuves/D353/regle-portes.md` et `docs/preuves/D352/regle-portes.md` (les cas 1 à 3 de « ce qu'on fait d'un rouge ») ; R-9 de D340 (batterie) ; R-15 de D343 (deux passes e2e) ; D334, item 5 (les rouges avant le code) ; D304, D305, D312, D316, D323, D352 (une morsure se LIT).

⛔ **Ce que ce document est** : des critères et des prédictions écrits AVANT de mesurer. Il ne dit pas ce que les mesures donneront ; une mesure qui contredit une prédiction se lit et s'écrit comme telle (D291), elle n'est pas « corrigée » ici après coup.

## 1. Les rouges — contre l'état d'avant, versés AVANT le premier commit de code

**Ce que « rouge » veut dire, par famille** (écrit avant de les jouer) :
- **S-104 (R-3, « mesurée d'abord »)** : un test d'intégration vieillit le mot de passe d'un membre par SQL (l'horloge qui décide est celle de la base) et exige, d'un mot de passe de 90 jours EXPIRÉ, que toute route hors changement de mot de passe et déconnexion soit refusée. **Prédiction : ROUGE sur une `AssertionError`** de vitest (« expected 200 to be 403 » ou équivalent), parce que le garde d'aujourd'hui ne lit rien de l'expiration (contrôle 4.a de la lecture adverse). Un `TypeError`, un délai ou une collecte à zéro ne sont **jamais** une morsure.
- **Les routes K-19 à K-22** : n'existent pas ; les tests d'intégration lisent le STATUT par `expect(res.status)` de vitest (jamais `.expect(<statut>)` de supertest, qui lève une `Error`, D305). **Prédiction : rouges par assertion de statut (404 au lieu de 201/200)**. ⚠ **Ce sont des rouges d'ABSENCE, pas la preuve qu'une garde mord** : celle-là vient de la neutralisation (§ 4).
- **Les courses de R-4** (deux Managers qui se désactivent l'un l'autre ; le dernier Manager qui se désactive lui-même) : contre l'état d'avant, rouges d'absence aussi (404). **La morsure réelle de la course est mesurée par la neutralisation** (le comptage hors du verrou, le verrou de L1 retiré), jouée sur PostgreSQL réel, la violation lue comme une assertion sur l'invariant « un Manager actif au moins » — jamais une requête qui lève.
- **Les capacités refusées à un employé** : la table et `peut` n'existent pas ⇒ **les specs neufs tombent à la COLLECTE** (import d'un module absent) : comptés à part (« fichiers tombés à la collecte »), jamais comme des tests en échec. Les tests dérivés du routeur (employé sur toutes les routes) sont rouges à l'exécution par assertion une fois leurs aides compilées.
- **La garde de source** (chaque contrôleur `@Roles(PRO)` listé avec ce qu'il déclare ; aucun `Math.random`, aucune horloge, aucun littéral de durée dans les modules neufs) : rouge par assertion sur le test modifié.
- **Pièces** : chaque sortie lue contre l'état d'avant, **avec l'empreinte sha256 de chaque fichier de test joué** (l'octet de l'arbre de travail au moment du jeu). Elles entrent dans un commit **ANTÉRIEUR** au premier commit de code.

**Après le code**, un test modifié n'est jamais affaibli : toute correction d'un test après son rouge est **déclarée** (empreinte avant / après), comme au § 5 de D341.

## 2. Préparation, état machine, ce qu'on fait d'un rouge des portes

1. `git status --short` vide ; `git fetch` puis local = `origin/main` + les commits du lot en début de chaque passe ; ports 3100, 3101, 5273 et 5274 libres ; Docker lancé, `zwadj-db` « Up » ; `chrome` et `headless_shell` à 0.
2. **Sur batterie : aucune porte, aucune campagne, aucune mesure de durée** (R-9 de D340, D290) — la session s'arrête et le dit.
3. Aucun fichier n'est édité pendant qu'une porte, une campagne ou une mesure le lit (D270).
4. Les cas 1 à 3 de `docs/preuves/D352/regle-portes.md`, § 4, **s'appliquent tels quels** : un rouge dans un fichier du lot est un défaut du lot (corriger, rejouer les portes EN ENTIER, dire la première passe) ; un rouge hors du lot ⇒ **un seul rejeu** de la porte entière, `retries` inchangé (0), aucun délai changé ; un rejeu rouge ⇒ rien n'est poussé.

## 3. Les six portes — UNE passe, par le pilote de D340, non modifié

`bash docs/preuves/D340/portes/passe-secteur.sh <dossier hors dépôt>` : `typecheck`, `lint`, `test`, `build`, `test:int`, `test:e2e`, en série, **après la DERNIÈRE modification de code** ; aucun rejeu automatique. Les journaux bruts portent des jetons de développement : versés **MASQUÉS** par `masquer-jetons.py` (copie de `docs/preuves/D352/portes/masquer-jetons.py`, non modifiée), le compte des suites restantes rapporté. **Prédiction** : les six à 0 ; le lot n'écrit ni écran, ni migration, ni montant : `test:e2e` est inchangée dans sa liste (le dernier relevé : 109 passés + 1 ignoré, 110 listés ; l'attendu est **dérivé** par `playwright test --list` avant la passe).

## 4. Les campagnes

1. **Après les portes, jamais en parallèle d'une porte** (une campagne MUTE des fichiers sources, D270). En série, sur secteur.
2. **`python3 neutralisation/neutralize-r56.py --int`** : **chaque garde neuve est neutralisée, son échec LU** à la première ligne du bloc d'échec (`AssertionError`, D304 ; un délai, un `TypeError` ou une collecte à zéro ne sont jamais une morsure ; une erreur de requête de Testing Library non plus, D352). L'empreinte sha256 du harnais est imprimée en tête de chaque journal ; **un harnais modifié en cours de campagne ⇒ la campagne est rejouée EN ENTIER**.
3. **Les campagnes que le lot TOUCHE** : `lancer-touchees.py` (copie de `docs/preuves/D352/neutralisation/lancer-touchees.py`, non modifiée : une PIÈCE versée, pas un fichier de `neutralisation/`), qui croise `git diff` depuis le SHA de départ avec les fichiers que lit chaque campagne ; **dont `neutralize-r44.py`** (le garde, le magasin, le service et le contrôleur du personnel, qui font ses 236 cibles). **Prédiction (hypothèse)** : plusieurs ancres de `neutralize-r44.py` seront périmées par ce lot ; une ancre périmée est révisée par extension de la table, **avant** son commit, et la campagne **rejouée en entier**.
4. Les empreintes sha256 de TOUS les harnais sont relevées avant et après : identiques sauf ceux que le lot modifie (déclarés) et `neutralize-r56.py` (neuf).
5. Une campagne n'est jamais déclarée verte sans que sa ligne de résumé ait été **lue** (« N garde(s) mordue(s) sur M cible(s) · 0 muette · 0 non mesurée ») ; « ERREUR DE SCRIPT » = campagne **arrêtée**.

## 5. L'e2e — deux passes complètes, vertes, consécutives (R-15 de D343)

Passe 1 : celle du pilote. Passe 2 : `pnpm test:e2e` seul, juste après. **Deux passes vertes consécutives ⇒ la porte e2e est verte.**

## 6. Ce que ce lot écrit sur la machine de Ko (déclaré ici, repris au rapport — règle de D337)

- **La base de développement de Ko : ni lue ni écrite.** `test:int` travaille sur `zwadj_test` et l'e2e sur `zwadj_e2e`, recréées à chaque lancement, sur le serveur de `zwadj-db`. **Aucune migration** n'est écrite ni appliquée.
- Aucun `.env` n'est lu ou modifié ; rien dans `apps/pro` ni `apps/client` ; rien du chemin de l'argent ; aucun mot de passe réel : les mots de passe des tests sont des valeurs de test, auditées avant chaque versement (D298), temporaires de test compris.

## 7. Ce que ce lot n'écrit pas

Le PIN et sa révocation (3b) ; les écrans (L36-4) ; le recours d'un Manager seul ; le changement de rôle d'un membre ; l'audit de la création et de la modification d'une FICHE CLIENT (S-240, question à Ko) ; un second mécanisme de limite de débit (D128 : le levier est unique ; les quatre routes neuves restent au limiteur par défaut, dont le coût d'un `argon2` par création et par réinitialisation est une limite écrite).
