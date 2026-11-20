# D355 — règle des rouges, des portes, de l'e2e et des campagnes, commitée AVANT toute passe et avant le premier code

**Sources** : la consigne du rang 57 (`docs/preuves/D355/consigne.md`), R-1 à R-5 et § 3 ; la table d'ouverture ; `docs/preuves/D354/regle-portes.md` (dont les cas 1 à 3 de « ce qu'on fait d'un rouge », par `docs/preuves/D352/regle-portes.md`) ; R-9 de D340 (batterie) ; R-15 de D343 (deux passes e2e) ; D334, item 5 (les rouges avant le code) ; D304, D305, D312, D316, D323, D352 (une morsure se LIT).

⛔ **Ce que ce document est** : des critères et des prédictions écrits AVANT de mesurer. Il ne dit pas ce que les mesures donneront ; une mesure qui contredit une prédiction se lit et s'écrit comme telle (D291), elle n'est pas « corrigée » ici après coup.

## 1. Les rouges — contre l'état d'avant, versés AVANT le premier commit de code

**Ce que « rouge » veut dire, par famille** (écrit avant de les jouer) :

- **R-1 — « connexion ‖ réinitialisation »** : la pièce de D354 est PROMUE en test d'intégration (`apps/api/test/int/staff-login-race.int-spec.ts`) : réservation de la tentative, **puis** réinitialisation par la VRAIE route K-21, **puis** `openSession` avec le hachage lu à la réservation ; l'attendu est « refusé, aucune session vivante ». **Prédiction : ROUGE sur une `AssertionError`** de vitest (« expected true to be false » ou équivalent), parce que le CAS d'`openSession` d'aujourd'hui ne lit pas le hachage (contrôle 3.b de la lecture adverse : 0 occurrence de `password_hash` dans ses 45 lignes). Même prédiction pour la séquence avec un changement de mot de passe (K-18), pour l'**entrelacement forcé** (le hachage remplacé par une transaction tenue hors du service, `openSession` en attente derrière son verrou) et pour la route HTTP `POST /pro/staff/login` dont la vérification est interrompue par une réinitialisation. Un `TypeError`, un délai dépassé ou une collecte à zéro ne sont **jamais** une morsure.
- **R-1 — « connexion ‖ désactivation »** : **prédiction : VERT dès aujourd'hui** (le CAS porte déjà `status = 'ACTIVE'`, contrôle 3.f). **Ce n'est pas un rouge, et le dire est le point** : la propriété tient peut-être déjà ; ce lot la MESURE sous course et la NEUTRALISE (S-254). **Si ces tests sont ROUGES contre l'état d'avant, c'est un défaut de plus que la lecture n'avait pas vu** : il se corrige dans ce lot (R-1 le demande), et le rapport le dit. Une morsure de ces tests vient de la neutralisation, pas d'un rouge.
- **Les unitaires du service et du magasin** (le service passe le hachage lu à la réservation ; le SQL du CAS le porte ; le refus d'ouverture est le même 401 que le mauvais mot de passe, à l'octet, avec UN `argon2` réel) : **prédiction : rouges par assertion** (la propriété `expectedPasswordHash` est absente de l'appel ; le prédicat est absent du SQL).
- **R-2 — le journal des fiches** : le module pur du journal (`client-record-audit.ts`) **n'existe pas** : son spec tombe à la **COLLECTE** (import d'un module absent), compté à part (« fichiers tombés à la collecte »), jamais comme des tests en échec. **La garde de SOURCE** (`client-record-writes.spec.ts`) lit des fichiers (aucun import du module neuf) : **prédiction : rouge par assertion** (aucun des deux fichiers d'écriture n'appelle le constructeur du journal). **Les specs de service et de magasin** (l'auteur de l'écriture passé au port ; la ligne de journal écrite dans la transaction, seulement quand l'écriture a eu lieu) : **rouges par assertion**. **Le test d'intégration** (`client-record-audit.int-spec.ts`, quatre écritures × couche éteinte / activée, l'échec forcé) : **rouge par assertion** (« expected 0 to be 1 » : aucune ligne n'est écrite aujourd'hui).
- ⚠ **Ce sont, pour R-2 et pour les unitaires de R-1, des rouges d'ABSENCE, pas la preuve qu'une garde mord** : celle-là vient de la neutralisation (§ 4). **Seule la famille « connexion ‖ réinitialisation » est un rouge de DÉFAUT** : elle reproduit une faute mesurée.
- **Pièces** : la commande, l'empreinte sha256 de CHAQUE fichier de test joué (l'octet de l'arbre de travail au moment du jeu), la sortie lue contre l'état d'avant. Elles entrent dans un commit **ANTÉRIEUR au premier commit de code** (D334, point 5).

**Après le code**, un test modifié n'est jamais affaibli : toute correction d'un test après son rouge est **déclarée** (empreinte avant / après), comme au § 5 de D341.

## 2. Préparation, état machine, ce qu'on fait d'un rouge des portes

1. `git status --short` vide ; `git fetch` puis local = `origin/main` + les commits du lot en début de chaque passe ; ports 3100, 3101, 5273 et 5274 libres ; Docker lancé, `zwadj-db` « Up » ; `chrome` et `headless_shell` à 0.
2. **Sur batterie : aucune porte, aucune campagne, aucune mesure de durée** (R-9 de D340, D290) — la session s'arrête et le dit.
3. Aucun fichier n'est édité pendant qu'une porte, une campagne ou une mesure le lit (D270).
4. Les cas 1 à 3 de `docs/preuves/D352/regle-portes.md`, § 4, **s'appliquent tels quels** : un rouge dans un fichier du lot est un défaut du lot (corriger, rejouer les portes EN ENTIER, dire la première passe) ; un rouge hors du lot ⇒ **un seul rejeu** de la porte entière, `retries` inchangé (0), aucun délai changé ; un rejeu rouge ⇒ rien n'est poussé.

## 3. Les six portes — UNE passe, par le pilote de D340, non modifié

`bash docs/preuves/D340/portes/passe-secteur.sh <dossier hors dépôt>` : `typecheck`, `lint`, `test`, `build`, `test:int`, `test:e2e`, en série, **après la DERNIÈRE modification de code** ; aucun rejeu automatique. Les journaux bruts portent des jetons de développement : versés **MASQUÉS** par `masquer-jetons.py` (la copie de `docs/preuves/D354/neutralisation/masquer-jetons.py`, non modifiée, une PIÈCE : S-261), le compte des suites restantes rapporté. **Prédiction** : les six à 0 ; le lot n'écrit ni écran, ni migration, ni montant, aucune spec e2e : `test:e2e` est inchangée dans sa liste (le dernier relevé : 109 passés + 1 ignoré, 110 listés ; l'attendu est **dérivé** par `playwright test --list` avant la passe).

## 4. Les campagnes

1. **Jamais en parallèle d'une porte** (une campagne MUTE des fichiers sources, D270). En série, sur secteur. ⛔ **L'ORDRE est celui de la consigne (§ 3, S-262)** : les campagnes que le lot touche se jouent **avant les six portes ou après elles, mais sur le MÊME arbre, et le rapport le dit** — la règle de D354 (« après les portes ») est LEVÉE sur l'ordre, pas sur l'identité de l'arbre. **« Le même arbre » s'atteste ainsi** : à l'entrée et à la sortie de chaque campagne et de chaque porte, `git status --porcelain` est vide ET `git diff --stat <SHA du commit de code> -- apps packages e2e` est vide (les fichiers de code mesurés sont ceux du commit de code) ; le rapport imprime les deux relevés.
2. **`python3 neutralisation/neutralize-r57.py --int`** : **chaque garde neuve est neutralisée, son échec LU** à la première ligne du bloc d'échec (`AssertionError`, D304 ; un délai, un `TypeError` ou une collecte à zéro ne sont jamais une morsure ; une erreur de requête de Testing Library non plus, D352). L'empreinte sha256 du harnais est imprimée en tête de chaque journal ; **un harnais modifié en cours de campagne ⇒ la campagne est rejouée EN ENTIER**. **Une assertion native seulement** : `toBe`, `toEqual`, `toBeNull`… jamais `.expect(<statut>)` de supertest.
3. **Les campagnes que le lot TOUCHE** : `lancer-touchees.py` (la copie de `docs/preuves/D354/neutralisation/lancer-touchees.py`, non modifiée, une PIÈCE : S-261), qui croise `git diff` depuis le SHA de départ avec les fichiers que lit chaque campagne ; la liste attendue par le croisement fait **avant** le code (table d'ouverture, § conditionnels) : `r44`, `r56`, `r41`, `r43`, `r39`, `r42`, `s10b`, `booking-status` — **hypothèse, à relever par l'outil**, pas une liste écrite d'avance. **Prédiction** : au moins une ancre de `neutralize-r44.py` est périmée par ce lot (celle qui vise `reason: "memberInactive"`, renommé) ; une ancre périmée est révisée par **extension de la table, AVANT le commit du harnais**, et la campagne est **rejouée EN ENTIER**.
4. Les empreintes sha256 de TOUS les harnais sont relevées avant et après : identiques sauf ceux que le lot modifie (déclarés) et `neutralize-r57.py` (neuf).
5. Une campagne n'est jamais déclarée verte sans que sa ligne de résumé ait été **lue** (« N garde(s) mordue(s) sur M cible(s) · 0 muette · 0 non mesurée ») ; « ERREUR DE SCRIPT » = campagne **arrêtée**.

## 5. L'e2e — deux passes complètes, vertes, consécutives (R-15 de D343)

Passe 1 : celle du pilote. Passe 2 : `pnpm test:e2e` seul, juste après. **Deux passes vertes consécutives ⇒ la porte e2e est verte.** Le lot ne touche aucun écran : l'e2e ne MESURE pas ce lot (aucune spec ne joue le journal des fiches ni la course de connexion) ; elle **garde** que le parcours de réservation sur place et la connexion du personnel — dont les routes sont celles de ce lot — se comportent comme avant. Dit pour que « 109 passés » ne se lise pas comme une preuve du lot.

## 6. Ce que ce lot écrit sur la machine de Ko (déclaré ici, repris au rapport — règle de D337)

- **La base de développement de Ko : ni lue ni écrite.** `test:int` travaille sur `zwadj_test` et l'e2e sur `zwadj_e2e`, recréées à chaque lancement, sur le serveur de `zwadj-db`. **Aucune migration** n'est écrite ni appliquée.
- Aucun `.env` n'est lu ou modifié ; rien dans `apps/pro` ni `apps/client` ; rien du chemin de l'argent ; aucun mot de passe réel : les mots de passe des tests sont des valeurs de test, **auditées avant chaque versement** (D298, les temporaires de test compris).

## 7. Ce que ce lot n'écrit pas

Le PIN et sa révocation (3b) ; les écrans (L36-4) ; le recours d'un Manager seul ; le changement de rôle et la réactivation d'un membre ; la recherche d'annuaire (L36-5) ; la ligne de journal de `quote.promote` (S-260) ; un second mécanisme de limite de débit (D128 : le levier est unique).
