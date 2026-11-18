# D352 — règle des portes, des campagnes et du choix (A) / (B), commitée AVANT toute passe et avant le premier code

**Source** : la consigne du rang 54 (`docs/preuves/D352/consigne.md`), R-1 à R-4 et § 3, mot pour mot là où elle est citée ; les précédents `docs/preuves/D351/regle-portes.md` (les portes, l'e2e, les campagnes) et `docs/preuves/D342/portes/regle-rejeu.md` (le rejeu unique) ; R-9 de D340 (batterie) ; R-15 de D343 (deux passes e2e).

## 1. Le choix de la voie pour R-1 — critères écrits AVANT toute mesure

La voie **(A)** : la liste lit l'état de chaque salle non publiée par `GET pro/venues/:id/publication` (existante, D349), SANS contrat neuf. La voie **(B)** : un champ booléen « refusée » dans `VenueProDTO`, **seulement si (A) est MESURÉ insuffisant, motif écrit** (consigne, R-1).

**(A) tient si, et seulement si, les cinq mesures suivantes sont satisfaites** (chacune a son test, qui est rouge d'abord ou gardé par une cible) :

1. **Le nombre d'appels est borné** : 0 lecture pour une salle PUBLIÉE ; au plus UNE lecture par salle non publiée et par montage de la carte ; le compte d'une liste de trois salles non publiées ne dépasse pas trois à l'entrée, et **ne grandit pas** à un re-rendu ni à la relecture silencieuse d'entrée (D331). Une relecture VOULUE de la liste (`reload`, après une écriture) remonte les cartes et relit : c'est mesuré et DIT, ce n'est pas en soi un motif pour (B).
2. **Une panne de lecture n'est jamais lue comme « pas refusée »** (D133, D142) : la carte ne dit pas « En attente de publication par Zwadj » après un échec, et une réponse malformée est une panne (D120).
3. **L'affichage ne SAUTE pas** : tant que la lecture n'a pas répondu, la carte n'affirme pas un état qu'elle ne connaît pas — pas de « En attente de publication par Zwadj » qui devienne « Refusée » après coup. Un affichage qui affirme d'abord le contraire de ce qui est vrai est un affichage qui saute.
4. **L'e2e ne refuse pas la voie** : `a2-mount-effects.e2e.ts` compte `/api/v1/pro/venues` par `includes` ; si un compte de ses tests porte une salle non publiée, la lecture de (A) entre dans ce compte. Deux passes e2e vertes de suite, ou la révision écrite du compte, avec sa mesure (jamais un assouplissement silencieux).
5. **Le motif n'entre jamais dans la liste** : la carte ne rend ni le motif ni la date du refus (elle dit « Refusée », rien d'autre) ; la garde `venues.service.spec.ts` reste ENTIÈRE, `VenueProDTO` n'est pas touché par (A).

Si l'une des mesures 1 à 4 ne peut pas être satisfaite sous (A), **la voie (B) s'ouvre** : le motif est écrit dans une extension de la table d'ouverture **avant** le premier fichier de (B), avec la mesure qui l'établit. Les rouges de R-1 restent versés avant le code dans les deux cas.

## 2. Préparation et état machine

1. `git status --short` vide ; `git fetch` puis local = `origin/main` en début de chaque passe ; ports 3100, 3101, 5273 et 5274 libres ; Docker lancé, `zwadj-db` « Up » ; `chrome` et `headless_shell` à 0.
2. **Sur batterie : aucune porte, aucune campagne** (R-9 de D340) — la session s'arrête et le dit.
3. Aucun fichier n'est édité pendant qu'une porte ou une campagne le lit (D270).

## 3. Les six portes — UNE passe, par le pilote de D340, non modifié

`bash docs/preuves/D340/portes/passe-secteur.sh <dossier hors dépôt>` : `typecheck`, `lint`, `test`, `build`, `test:int`, `test:e2e`, en série, **après la DERNIÈRE modification de code** ; aucun rejeu automatique ; l'état machine est relevé avant et pendant. Les journaux bruts portent des jetons de développement : versés **MASQUÉS** par `masquer-jetons.py` (copie de `docs/preuves/D351/portes/masquer-jetons.py`, non modifiée), le compte des suites restantes rapporté.

## 4. Ce qu'on fait d'un rouge — écrit avant

- **Cas 1 — le rouge est dans un fichier du lot** (un chemin de la table d'ouverture, ou une pile d'erreur qui le nomme) : c'est un défaut du lot. On le corrige, **les portes se rejouent en entier après la dernière modification**, la première passe rouge est DITE.
- **Cas 2 — le rouge est dans un fichier que le lot ne touche pas** : **un seul rejeu**, de la porte entière, même commande, `retries` inchangé (0), aucun délai changé, aucune spec exclue ; vert ⇒ « verte au rejeu, première passe rouge sur un fichier non touché », dite telle ; rouge ⇒ **rien n'est poussé**, un rapport.
- **Cas 3 — le rejeu est rouge aussi** : rien n'est poussé ; pas de second rejeu.

## 5. L'e2e — deux passes complètes, vertes, consécutives (R-15 de D343)

L'attendu est **dérivé**, pas écrit de mémoire : `pnpm --filter @zwadj/e2e exec playwright test --list` est lancé avant la première passe et son total est écrit dans `portes/portes.md` avant elle. Passe 1 : celle du pilote. Passe 2 : `pnpm test:e2e` seul, juste après. **Deux passes vertes consécutives ⇒ la porte e2e est verte.**

## 6. Les campagnes

1. **Après les portes, jamais en parallèle d'une porte** (une campagne MUTE des fichiers sources, D270). En série, sur secteur.
2. **R-2 — `python3 neutralisation/neutralize-adm2.py --int --e2e` EN ENTIER, d'un seul tenant, sur le harnais final** (84 cibles attendues, aucune « non jouée »). Le lecteur n'accepte plus `TestingLibraryElementError` comme morsure : une garde qui ne rougit que par une requête de Testing Library est **MUETTE** (S-192 refusée). Chaque verdict se lit à la **première ligne du bloc d'échec** (`AssertionError`, D304). Un harnais modifié en cours de campagne ⇒ la campagne est rejouée EN ENTIER.
3. **R-1 — `python3 neutralisation/neutralize-r54.py`** : les gardes neuves de la liste, chacune neutralisée, son échec LU.
4. **`python3 neutralisation/lancer-campagnes.py`** (les campagnes que le lot TOUCHE, par `git diff --name-only HEAD`), puis `--tout` : le lot touche des fichiers de l'app Pro lus par d'autres campagnes ; le relevé dit lesquelles. Les empreintes sha256 de TOUS les harnais sont relevées avant et après : identiques sauf `neutralize-adm2.py` (modifié par ce lot) et `neutralize-r54.py` (neuf).
5. Une campagne n'est jamais déclarée verte sans que sa ligne de résumé ait été **lue** (« N garde(s) mordue(s) sur M cible(s) · 0 muette · 0 non mesurée ») ; « ERREUR DE SCRIPT » = campagne **arrêtée**.

## 7. Ce que ce lot n'écrit pas

- **La base de développement de Ko** : ni lue ni écrite. `test:int` travaille sur `zwadj_test` et l'e2e sur `zwadj_e2e`, recréées à chaque lancement (`DROP DATABASE` puis `CREATE DATABASE` sur le serveur de `zwadj-db`) : déclaré au rapport (règle de D337).
- Aucun `.env` n'est lu ; aucune migration ; rien dans `apps/client` ; rien sur le chemin de l'argent.
