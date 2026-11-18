# D351 — rang 53 — table d'ouverture

Lot : **l'intégration, dans `main`, de la branche `par-carte`** (session cloud des 13 et 14/11/2026 : la carte — recherche, accueil, fiche, point posé par le pro —, six lots CA-1 à CA-6, 21 commits, partie de `26ad5c7`), **rejouée sur le poste de Ko**, sur la consigne du relecteur adoptée par Ko, collée en tête de la session (`docs/preuves/D351/consigne.md`). Lot de **CODE par destination** — la fusion apporte le code de six lots — mais **ce lot n'écrit aucune ligne de code neuve au-delà de la fusion**, sauf ce que la fusion casse : l'ancre d'un harnais qu'elle périme (R-3) et le repère de parité des clés (R-5), chacun déclaré ligne par ligne, par extension de cette table, avant son commit (consigne, R-6). Méthode : les règles de `AGENTS.md`, sans session adverse ni certification (pause de Ko, DR1 de D336).

- **SHA de départ** : `5951b2cbee9fad52cdec5ddcbecf52d96a4d5e35` (clôture de D350). `HEAD` = `origin/main` après `git fetch` (les deux sur ce SHA), arbre propre (`git status --short` : 0 ligne), aucun stash (0 ligne), branche `main`. `origin/par-carte` = `7fdc67961727a3280f8e2210594ba507a0fbfb97`. Base commune : `26ad5c77ec03a73d82e92368f7d97c4beac7556f`. Commits : 21 sur la branche et absents de `main`, 55 sur `main` et absents de la branche, 0 fusion sur la branche.
- **Numéro** : D351 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D350, dernière des 306 lignes `| Dnnn |`) ; `D351` ne figure dans aucun des quatre fichiers d'autorité (compte 0 sur le texte aplati : 0, 0, 0, 0), ni dans `main` ni dans la branche (`git grep -l` : 0 fichier des deux côtés).
- **Reprise (consigne, § 0), relevée avant toute écriture** : rang 52 CLOS (D350) ; compteur POUR MÉMOIRE VINGT-SIX ; « RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR », candidat : l'intégration de `par-carte` ; `origin/main` = `5951b2c` ; `origin/par-carte` = `7fdc679` ; arbre propre, aucun stash, branche `main`. **Aucun écart : la règle d'arrêt n'a pas joué.**
- **Poste à l'ouverture** : **sur secteur** (`BatteryStatus` = 2, `PowerOnline` = vrai), RAM libre 5 452 Mo sur 16 095, `chrome` 0, `headless_shell` 0, `node` 0, Docker 29.8.0 lancé, conteneur `zwadj-db` « Up 38 hours » (postgres:18, port 5432 relayé par Docker). Les ports 3000, 3100, 3101, 4000, 4100 et 5173 ne sont pas en écoute (`Get-NetTCPConnection`) ; les ports 5273 et 5274 de l'e2e sont relevés par le pilote de passe lui-même, qui refuse de démarrer s'ils sont occupés. Sur batterie au moment des portes de clôture : aucune porte ne se lance (R-9 de D340 ; le pilote refuse lui-même, code 3).
- **Ce que la fusion apporte** (mesuré avant d'écrire, `git diff --name-status origin/main...origin/par-carte`) : **155 fichiers — 130 ajoutés, 25 modifiés, 0 supprimé** ; 100 sous `docs/preuves/parallele/carte/`, 24 sous `apps/client`, 7 sous `apps/pro`, 7 sous `apps/api`, 6 sous `packages/ui`, 2 sous `packages/i18n`, 1 sous `packages/types`, 6 sous `neutralisation/` (les harnais `neutralize-ca1.py` à `neutralize-ca6.py`), 1 sous `e2e/specs` (`ca6-carte.e2e.ts`), 1 à la racine (`pnpm-lock.yaml`). **0 migration, 0 fichier `.sql`, 0 fichier d'autorité** (`AGENTS.md`, `CLAUDE.md`, `ZWADJ_*` : 0). **Une dépendance neuve** : `packages/ui/package.json` et `pnpm-lock.yaml` (Leaflet 1.9.4 et `@types/leaflet`, d'après le BILAN) — `pnpm install` est donc exigé après la fusion (consigne, R-2).
- **Trois fichiers sont modifiés des deux côtés** depuis la base commune : `apps/client/src/lib/api.ts` (D348 : `getVenueBySlug` en `no-store` ; la carte : une fonction neuve, dans une autre zone du fichier), `packages/i18n/messages/ar.json` et `packages/i18n/messages/fr.json` (un bloc neuf chacun). La fusion y passe sans conflit **textuel** ; seuls les tests disent si le résultat est juste.
- **Essai de fusion, sans rien écrire dans l'arbre** : `git merge-tree --write-tree origin/main origin/par-carte` → code de sortie 0, arbre prédit `9c12458f5ae5af484ce0d58c6c47b7e0badcc95d` (l'arbre de `origin/main` est `3642e3f283bf94e5bc9b63ffdb224826db9c4700`). La fusion réelle se fait sur `HEAD` après les commits de pièces de ce lot : son arbre différera donc de celui-ci par les seuls fichiers de `docs/preuves/D351/` et des fichiers d'autorité ; le contrôle de la fusion le prouve par un **rejeu** : `git merge-tree --write-tree HEAD^1 HEAD^2` doit rendre exactement l'arbre du commit de fusion (consigne, R-1).
- **Clés de catalogue, mesurées avant d'écrire** (`fr.json` à plat) : `origin/main` 1 267 clés (FR = AR) ; `origin/par-carte` 1 290 ; arbre prédit de la fusion **1 296** = 1 267 + 29 (le bloc `map`). Le repère de `apps/api/src/common/i18n-parity.spec.ts` (« le TOTAL ne RECULE pas ») vaut **943** : il est à 324 clés sous le total de `main` avant la fusion. Le bloc `publicationReview` de D350 compte **6** clés (la consigne, R-5, dit « les 8 » : écart de compte, relevé par la lecture adverse).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 et D334 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) la consigne en pièce, la règle des portes (écrite et commitée AVANT les passes, R-2), la sortie de la lecture adverse de la consigne et du BILAN, l'audit de secrets scellé et son tri, **avant toute écriture d'autorité** ; (3) l'essai de fusion, la liste des fichiers de la fusion, l'audit de secrets scellé de l'ARBRE DE LA FUSION D'ESSAI (les 100 fichiers de `docs/preuves/parallele/carte/` compris) et son tri, **avant la fusion** ; (4) **la première écriture d'autorité** : les arbitrages de Ko (section 1 de la consigne, par adoption) et les décisions du relecteur R-1 à R-9, écrites comme telles, la table recopiée à l'identique, le point d'entrée du rang 53 (OUVERT) — **avant la fusion**, comme à D342 ; (5) **la fusion `--no-ff`** (R-1), jamais un rebase ni un squash ; (6) le contrôle de la fusion ; (7) les éventuels correctifs de ce que la fusion casse (R-6), **chacun précédé de son extension de table** ; (8) les pièces des portes, des campagnes et des preuves R-4, R-5, R-7 ; (9) les trois `.md` d'autorité de clôture ; (10) le contrôle de fin de lot, écrit **après** la poussée (D288). Aucun fichier de code, de test ni de harnais n'est écrit par ce lot hors ceux de la section B « fichiers de code que le lot peut écrire ».
- **Règle d'arrêt** (consigne, § 0, mot pour mot) : « Un écart : tu t'arrêtes et tu le dis. » — les points de la reprise ont été relevés avant toute écriture : aucun écart. **Et** (consigne, R-1 et R-2) : un conflit de fusion, ou un arbre fusionné différent de celui que `git merge-tree` recalcule, ⇒ arrêt et rapport ; un rouge sur un fichier que la fusion ne touche pas ⇒ **un seul rejeu**, règle commitée avant ; **rouge au rejeu ⇒ rien n'est poussé**, un rapport. Un rouge dans un fichier de la fusion ⇒ aucune correction : le lot fautif est cherché en rejouant le test sur le commit de clôture de chaque lot de la branche (D332, troisième condition).
- **Écrit pour ne pas se lire comme tenu** : cette table ne dit pas que la fusion est sans conflit **sémantique** — elle dit qu'elle l'est sans conflit **textuel**. Ce qui le dit, pour les trois fichiers modifiés des deux côtés, ce sont les six portes et les campagnes, après la fusion. Elle ne dit pas non plus que la carte « marche » : la session cloud n'a jamais joué sur le poste de Ko, personne n'a vu la carte avec son fond (BILAN, § 3) ; c'est un geste de Ko.

## A. Les fichiers que la fusion apporte — 155 chemins COMPLETS

Sortie de `git diff --name-only origin/main...origin/par-carte`, **versée telle quelle** (une ligne par chemin, 155 lignes, 7 618 octets, sha256 `62dd5428455843af40d79e76ba5005d187122676df9c0bd7084a477bf4114c55`). Aucun préfixe : « 0 fichier non déclaré » doit pouvoir être faux (D328).

```
apps/api/src/venues/venue-map.controller.ts
apps/api/src/venues/venue-map.spec.ts
apps/api/src/venues/venue-map.ts
apps/api/src/venues/venues-public.service.spec.ts
apps/api/src/venues/venues-public.service.ts
apps/api/src/venues/venues.module.ts
apps/api/test/int/venue-map.int-spec.ts
apps/client/.env.example
apps/client/src/app/[locale]/page.test.tsx
apps/client/src/app/theme.css
apps/client/src/components/home-view.tsx
apps/client/src/components/map/map-test-support.tsx
apps/client/src/components/map/near-viewport-map.test.tsx
apps/client/src/components/map/near-viewport-map.tsx
apps/client/src/components/map/venue-map-loader.test.tsx
apps/client/src/components/map/venue-map-loader.tsx
apps/client/src/components/map/venue-points-map.test.tsx
apps/client/src/components/map/venue-points-map.tsx
apps/client/src/components/search/search-view.test.tsx
apps/client/src/components/search/search-view.tsx
apps/client/src/components/ui-map-tiles.test.ts
apps/client/src/components/venue/venue-detail-view.test.tsx
apps/client/src/components/venue/venue-detail-view.tsx
apps/client/src/components/venue/venue-location-map.test.tsx
apps/client/src/components/venue/venue-location-map.tsx
apps/client/src/lib/api.test.ts
apps/client/src/lib/api.ts
apps/client/src/lib/leaflet-import-guard.test.ts
apps/client/src/lib/map-tiles-env.ts
apps/client/src/lib/search-query.test.ts
apps/client/src/lib/search-query.ts
apps/pro/.env.example
apps/pro/src/lib/map-tiles-env.ts
apps/pro/src/theme.css
apps/pro/src/venues/place-fields-map.test.tsx
apps/pro/src/venues/venue-form.tsx
apps/pro/src/venues/venue-pin-map.test.tsx
apps/pro/src/venues/venue-pin-map.tsx
docs/preuves/parallele/carte/BILAN.md
docs/preuves/parallele/carte/CA-1/audit-secrets-ca1.txt
docs/preuves/parallele/carte/CA-1/campagnes/lancer-campagnes.txt
docs/preuves/parallele/carte/CA-1/neutralisation/neutralize-ca1.txt
docs/preuves/parallele/carte/CA-1/portes/_index.txt
docs/preuves/parallele/carte/CA-1/portes/build.txt
docs/preuves/parallele/carte/CA-1/portes/lint.txt
docs/preuves/parallele/carte/CA-1/portes/portes.md
docs/preuves/parallele/carte/CA-1/portes/test-int.txt
docs/preuves/parallele/carte/CA-1/portes/test.txt
docs/preuves/parallele/carte/CA-1/portes/typecheck.txt
docs/preuves/parallele/carte/CA-1/rouges/int-venue-map.txt
docs/preuves/parallele/carte/CA-1/rouges/rouges.md
docs/preuves/parallele/carte/CA-1/rouges/unit-venue-map.txt
docs/preuves/parallele/carte/CA-1/rouges/unit-venues-public-service.txt
docs/preuves/parallele/carte/CA-1/table-ouverture.md
docs/preuves/parallele/carte/CA-1/tri-audit-ca1.txt
docs/preuves/parallele/carte/CA-2/audit-secrets-ca2.txt
docs/preuves/parallele/carte/CA-2/campagnes/lancer-campagnes.txt
docs/preuves/parallele/carte/CA-2/neutralisation/neutralize-ca2.txt
docs/preuves/parallele/carte/CA-2/poids/build-apres.txt
docs/preuves/parallele/carte/CA-2/poids/build-avant.txt
docs/preuves/parallele/carte/CA-2/poids/poids.md
docs/preuves/parallele/carte/CA-2/portes/_index.txt
docs/preuves/parallele/carte/CA-2/portes/build.txt
docs/preuves/parallele/carte/CA-2/portes/lint.txt
docs/preuves/parallele/carte/CA-2/portes/portes.md
docs/preuves/parallele/carte/CA-2/portes/test-int.txt
docs/preuves/parallele/carte/CA-2/portes/test.txt
docs/preuves/parallele/carte/CA-2/portes/typecheck.txt
docs/preuves/parallele/carte/CA-2/rouges/client-vitest.txt
docs/preuves/parallele/carte/CA-2/rouges/rouges.md
docs/preuves/parallele/carte/CA-2/table-ouverture.md
docs/preuves/parallele/carte/CA-2/tri-audit-ca2.txt
docs/preuves/parallele/carte/CA-3/audit-secrets-ca3.txt
docs/preuves/parallele/carte/CA-3/campagnes/lancer-campagnes.txt
docs/preuves/parallele/carte/CA-3/neutralisation/neutralize-ca3.txt
docs/preuves/parallele/carte/CA-3/portes/_index.txt
docs/preuves/parallele/carte/CA-3/portes/build.txt
docs/preuves/parallele/carte/CA-3/portes/lint.txt
docs/preuves/parallele/carte/CA-3/portes/portes.md
docs/preuves/parallele/carte/CA-3/portes/test-int.txt
docs/preuves/parallele/carte/CA-3/portes/test.txt
docs/preuves/parallele/carte/CA-3/portes/typecheck.txt
docs/preuves/parallele/carte/CA-3/rouges/client-vitest.txt
docs/preuves/parallele/carte/CA-3/rouges/rouges.md
docs/preuves/parallele/carte/CA-3/table-ouverture.md
docs/preuves/parallele/carte/CA-3/tri-audit-ca3.txt
docs/preuves/parallele/carte/CA-4/audit-secrets-ca4.txt
docs/preuves/parallele/carte/CA-4/campagnes/lancer-campagnes.txt
docs/preuves/parallele/carte/CA-4/neutralisation/neutralize-ca4.txt
docs/preuves/parallele/carte/CA-4/portes/_index.txt
docs/preuves/parallele/carte/CA-4/portes/build.txt
docs/preuves/parallele/carte/CA-4/portes/lint.txt
docs/preuves/parallele/carte/CA-4/portes/portes.md
docs/preuves/parallele/carte/CA-4/portes/test-int.txt
docs/preuves/parallele/carte/CA-4/portes/test.txt
docs/preuves/parallele/carte/CA-4/portes/typecheck.txt
docs/preuves/parallele/carte/CA-4/rouges/client-vitest.txt
docs/preuves/parallele/carte/CA-4/rouges/rouges.md
docs/preuves/parallele/carte/CA-4/table-ouverture.md
docs/preuves/parallele/carte/CA-4/tri-audit-ca4.txt
docs/preuves/parallele/carte/CA-5/audit-secrets-ca5.txt
docs/preuves/parallele/carte/CA-5/campagnes/lancer-campagnes.txt
docs/preuves/parallele/carte/CA-5/neutralisation/neutralize-ca5.txt
docs/preuves/parallele/carte/CA-5/poids/build-pro.txt
docs/preuves/parallele/carte/CA-5/portes/_index.txt
docs/preuves/parallele/carte/CA-5/portes/build.txt
docs/preuves/parallele/carte/CA-5/portes/lint.txt
docs/preuves/parallele/carte/CA-5/portes/portes.md
docs/preuves/parallele/carte/CA-5/portes/test-int.txt
docs/preuves/parallele/carte/CA-5/portes/test.txt
docs/preuves/parallele/carte/CA-5/portes/typecheck.txt
docs/preuves/parallele/carte/CA-5/rouges/pro-vitest.txt
docs/preuves/parallele/carte/CA-5/rouges/rouges.md
docs/preuves/parallele/carte/CA-5/table-ouverture.md
docs/preuves/parallele/carte/CA-5/tri-audit-ca5.txt
docs/preuves/parallele/carte/CA-6/audit-secrets-ca6.txt
docs/preuves/parallele/carte/CA-6/campagnes/lancer-campagnes.txt
docs/preuves/parallele/carte/CA-6/neutralisation/neutralize-ca6.txt
docs/preuves/parallele/carte/CA-6/portes/_index.txt
docs/preuves/parallele/carte/CA-6/portes/build.txt
docs/preuves/parallele/carte/CA-6/portes/lint.txt
docs/preuves/parallele/carte/CA-6/portes/portes.md
docs/preuves/parallele/carte/CA-6/portes/test-e2e-passe-1.txt
docs/preuves/parallele/carte/CA-6/portes/test-e2e-passe-2.txt
docs/preuves/parallele/carte/CA-6/portes/test-int.txt
docs/preuves/parallele/carte/CA-6/portes/test.txt
docs/preuves/parallele/carte/CA-6/portes/typecheck.txt
docs/preuves/parallele/carte/CA-6/rouges/e2e-ca6.txt
docs/preuves/parallele/carte/CA-6/rouges/rouges.md
docs/preuves/parallele/carte/CA-6/table-ouverture.md
docs/preuves/parallele/carte/CA-6/tri-audit-ca6.txt
docs/preuves/parallele/carte/a-reporter-au-backlog.md
docs/preuves/parallele/carte/arabe-a-relire.md
docs/preuves/parallele/carte/audit-secrets-ouverture.txt
docs/preuves/parallele/carte/ce-qui-part-vers-le-tiers.md
docs/preuves/parallele/carte/consigne.md
docs/preuves/parallele/carte/controle-fin.txt
docs/preuves/parallele/carte/lecture-adverse.txt
e2e/specs/ca6-carte.e2e.ts
neutralisation/neutralize-ca1.py
neutralisation/neutralize-ca2.py
neutralisation/neutralize-ca3.py
neutralisation/neutralize-ca4.py
neutralisation/neutralize-ca5.py
neutralisation/neutralize-ca6.py
packages/i18n/messages/ar.json
packages/i18n/messages/fr.json
packages/types/src/venue.ts
packages/ui/package.json
packages/ui/src/index.ts
packages/ui/src/map/leaflet-canvas.tsx
packages/ui/src/map/map-tiles.ts
packages/ui/src/map/venue-map.tsx
packages/ui/styles.css
pnpm-lock.yaml
```

## B. Les pièces de D351 — chemins complets

Toutes sous `docs/preuves/D351/`. Les journaux de campagne, dont le nombre dépend de ce que les passes rendent, sont déclarés par extension.

| chemin | rôle |
|---|---|
| `docs/preuves/D351/table-ouverture.md` | ce fichier — premier commit du lot, SEUL |
| `docs/preuves/D351/consigne.md` | la consigne du relecteur, versée telle quelle (la copie du message collé) |
| `docs/preuves/D351/regle-portes.md` | la règle des portes, de l'e2e (deux passes, un rejeu unique au plus) et des campagnes (R-2, R-3), ÉCRITE ET COMMITÉE AVANT toute passe |
| `docs/preuves/D351/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse de la consigne et du BILAN contre le dépôt, calibré sur deux bras |
| `docs/preuves/D351/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D351/audit-secrets-d351a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la consigne et de la lecture adverse |
| `docs/preuves/D351/tri-audit-d351a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D350/audit-secrets-d350d.txt`) |
| `docs/preuves/D351/fusion/essai-fusion.txt` | l'essai de fusion sans écriture : l'arbre prédit, le code de sortie, les 155 fichiers, les trois fichiers modifiés des deux côtés |
| `docs/preuves/D351/fusion/fichiers-de-la-fusion.txt` | la liste des 155 fichiers de la fusion, versée (consigne, § 3) |
| `docs/preuves/D351/audit-secrets-d351b.txt` | audit de secrets scellé de l'ARBRE DE LA FUSION D'ESSAI (copie de travail hors dépôt), avant la fusion : il couvre les 100 fichiers de `docs/preuves/parallele/carte/` |
| `docs/preuves/D351/tri-audit-d351b.txt` | son tri différentiel contre `audit-secrets-d351a.txt` |
| `docs/preuves/D351/fusion/controle-fusion.py` | le contrôle de la fusion : `--no-ff`, deux parents, arbre rejoué par `git merge-tree`, les 21 commits de la branche ancêtres, diff = liste A |
| `docs/preuves/D351/fusion/controle-fusion.txt` | sa sortie |
| `docs/preuves/D351/r5/releve-parite.txt` | R-5 : le total des clés avant et après la fusion, relevé sur les fichiers, et le repère avant et après |
| `docs/preuves/D351/portes/_index.txt` | l'index de la passe sur secteur (`docs/preuves/D340/portes/passe-secteur.sh`, employé tel quel) |
| `docs/preuves/D351/portes/typecheck.txt` | la sortie de la porte `typecheck` |
| `docs/preuves/D351/portes/lint.txt` | la sortie de la porte `lint` |
| `docs/preuves/D351/portes/test.txt` | la sortie de la porte `test` |
| `docs/preuves/D351/portes/build.txt` | la sortie de la porte `build` |
| `docs/preuves/D351/portes/test-int.txt` | la sortie de la porte `test:int` |
| `docs/preuves/D351/portes/test-e2e.txt` | la sortie de l'e2e, première passe — pièce MASQUÉE (le dépôt est public, D200) |
| `docs/preuves/D351/portes/test-e2e-passe-2.txt` | la sortie de l'e2e, seconde passe (`pnpm test:e2e` seul, juste après) — pièce MASQUÉE |
| `docs/preuves/D351/portes/masquer-jetons.py` | la procédure qui a masqué les jetons des sorties e2e, archivée à côté des pièces (copie de celle de D350, jamais promue en instrument, D291) |
| `docs/preuves/D351/portes/etat-machine-pendant.txt` | l'état machine relevé toutes les 30 s pendant la passe du pilote |
| `docs/preuves/D351/portes/etat-machine-passe-2.txt` | l'état machine relevé avant et après la seconde passe e2e |
| `docs/preuves/D351/portes/FIN` | le marqueur de fin de passe écrit par le pilote |
| `docs/preuves/D351/portes/portes.md` | les six portes, chacune avec son code de sortie et ses chiffres lus dans la sortie brute (D275) |
| `docs/preuves/D351/r4/preuve-filtre-public.md` | R-4 : la preuve (ou le trou) qu'une salle masquée, supprimée ou non publiée est absente de la liste ET de la carte, et que la carte reste en no-store |
| `docs/preuves/D351/tiers/relecture.md` | la relecture de `ce-qui-part-vers-le-tiers.md` pour une valeur réelle (0 attendu), consigne § 3 |
| `docs/preuves/D351/neutralisation/lancer-campagnes-tout.txt` | la sortie complète de `neutralisation/lancer-campagnes.py --tout` (R-3) |
| `docs/preuves/D351/neutralisation/rapport-campagnes.md` | la lecture, campagne par campagne, de ce qui a été joué, ce qui reste et ce que la fusion a périmé (R-3) |
| `docs/preuves/D351/scenarios-ko.md` | les gestes de Ko (consigne, § 4) : les sept scénarios du BILAN, § 8, et un renvoi à ceux de D350 — **non joués par la session** |
| `docs/preuves/D351/passe-d277/passe-d277.py` | la passe D277 des deux sens, motifs dérivés des affirmations du lot |
| `docs/preuves/D351/passe-d277/sortie-avant.txt` | sa sortie avant les écritures d'autorité de clôture |
| `docs/preuves/D351/passe-d277/sortie-apres.txt` | sa sortie après |
| `docs/preuves/D351/passe-d277.md` | le compte rendu de la passe D277 (avant → après, triage de chaque motif) — **déclaré d'avance** (il n'existe pas encore) |
| `docs/preuves/D351/aucune-valeur-reelle.txt` | la sortie du contrôle dédié « 0 valeur réelle sur N fichiers » (D299) |
| `docs/preuves/D351/audit-secrets-d351c.txt` | audit de secrets scellé, AVANT le commit des pièces de portes |
| `docs/preuves/D351/tri-audit-d351c.txt` | son tri différentiel contre `audit-secrets-d351b.txt` |
| `docs/preuves/D351/audit-secrets-d351d.txt` | audit de secrets scellé, AVANT le commit des campagnes, des preuves R-4 et R-5 et des gestes de Ko |
| `docs/preuves/D351/tri-audit-d351d.txt` | son tri différentiel contre `audit-secrets-d351c.txt` |
| `docs/preuves/D351/audit-secrets-d351e.txt` | audit de secrets scellé de la clôture, AVANT les `.md` d'autorité de clôture |
| `docs/preuves/D351/tri-audit-d351e.txt` | son tri différentiel contre `audit-secrets-d351d.txt` |
| `docs/preuves/D351/controle-fin-de-lot.py` | le contrôle de fin de lot (D288, D328), écrit APRÈS la poussée |
| `docs/preuves/D351/controle-fin-de-lot.txt` | sa sortie |

### Fichiers de code que le lot peut écrire (consigne, R-6) — la seule exception à « aucun code neuf »

| chemin | ce que le lot peut y changer |
|---|---|
| `apps/api/src/common/i18n-parity.spec.ts` | R-5 : **le repère de « le TOTAL ne RECULE pas »**, relevé sur les fichiers après la fusion (le total mesuré, jamais un chiffre estimé) ; **le relever est permis, le baisser jamais** ; un commentaire d'historique. Aucune autre ligne. |

### Pièces CONDITIONNELLES (leur existence dépend d'un défaut ou d'un cas — D328)

| chemin | condition |
|---|---|
| `docs/preuves/D351/lecture-adverse/defauts-instrument.txt` | si la première passe de l'instrument de lecture adverse montre un défaut d'instrument |
| `docs/preuves/D351/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | idem : la première passe, gardée TELLE QUELLE |
| `neutralisation/neutralize-*.py` (chemins complets par extension, **chacun précédé de son extension de table**) | si la FUSION a périmé l'ancre d'une cible (R-3) : l'ancre se repose, déclarée ligne par ligne ; tout autre défaut de harnais va au backlog, **sans correction** |
| `docs/preuves/D351/portes/rejeu-*.txt`, `docs/preuves/D351/portes/rejeu-etat-machine.txt`, `docs/preuves/D351/portes/rejeu-resultat.md` (chemins complets par extension) | si une porte rend un rouge HORS des fichiers de la fusion : un seul rejeu, la règle écrite avant (`regle-portes.md`) |
| `docs/preuves/D351/portes/lot-fautif/` (chemins complets par extension) | si une porte rend un rouge DANS un fichier de la fusion : le test rejoué sur le commit de clôture de chaque lot (D332) |
| `docs/preuves/D351/neutralisation/` — les journaux de campagne et les sorties des campagnes `--int` et `--e2e` (chemins complets par extension) | les campagnes que `--tout`, `--int` et `--e2e` jouent : leur liste dépend de ce que le lanceur rend |
| `docs/preuves/D351/r4/` — sorties de specs jouées pour R-4 (chemins complets par extension) | si la preuve du filtre public se lit dans la sortie d'une spec jouée seule |
| `docs/preuves/D351/passe-d277/` — outils de lecture supplémentaires (chemins complets par extension) | si un compte de motifs ne suffit pas à trier (D341, extension 3) |
| `docs/preuves/D351/audit-secrets-d351f.txt`, `docs/preuves/D351/tri-audit-d351f.txt` | si un versement a lieu après `audit-secrets-d351e.txt` |

## C. Les fichiers d'autorité — la première écriture est celle des arbitrages de Ko, AVANT la fusion

| chemin | ce que le lot y écrit |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture, avant la fusion** : la section 1 de la consigne (a à e — par adoption, jamais comme une parole de Ko hors ses citations) et les décisions du relecteur R-1 à R-9, écrites comme telles, les écarts de la lecture adverse dits, la table recopiée à l'identique, le point d'entrée du rang 53 (OUVERT) ; **puis, EN DERNIER**, la section D351 (les six lots, leurs SHA, ce que la fusion a donné, les décisions prises seul, ce qui reste), l'ordre des rangs (« RANG 53 : CLOS », puis « RANG 54 : EN ATTENTE DE CADRAGE DU RELECTEUR »), le registre (D351), le point d'entrée, la passe D277 |
| `ZWADJ_BACKLOG.md` | les entrées de `a-reporter-au-backlog.md` (R-7), ADDITIVEMENT, avec ce qu'elles bloquent ; l'entrée de R-8 (les 29 gardes en assertion native, au rang 54) ; les entrées neuves que les passes révèlent (forme D302 : ce qu'elles bloquent ou « à ordonner par Ko », leur coût, aucune durée) ; les entrées que la branche a traitées, cochées avec le renvoi au lot |
| `AGENTS.md` | le compteur POUR MÉMOIRE (VINGT-SIX → TRENTE-DEUX, consigne § 1 a), l'annotation de ce qui est devenu faux ou permis par la fusion (la décision produit n° 2 « carte reportée après le MVP », la ligne de la table des routes si elle change), un invariant de la carte si un fait mesuré en impose un — annotées, pas réécrites |

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucun fichier de code, de test, de harnais, de migration ni de dépendance n'est écrit par ce lot, hors** le commit de fusion (qui n'apporte que ceux de la liste A) **et** les deux exceptions de la section B (le repère de parité ; l'ancre d'un harnais que la fusion périme, par extension). Si le diff final en contient un autre, c'est un incident, pas une omission.
- **`CLAUDE.md`** n'est pas déclaré : la consigne nomme trois fichiers d'autorité.
- **`neutralisation/lancer-campagnes.py` et les autres instruments de `neutralisation/`** ne sont pas retouchés : leur promotion est un autre lot.
- **Le sort de la branche `par-carte`** : elle est GARDÉE (comme `front-client`), jamais supprimée dans cette session (consigne, § 4).
- **Les gestes de Ko** (consigne, § 4) : la session écrit `scenarios-ko.md`, elle ne les joue pas ; **la base de développement de Ko n'est ni lue ni écrite** (consigne, R-9) — seules `zwadj_test` et `zwadj_e2e`, jetables, sont recréées par les portes. Aucun fichier `.env` n'est lu.
- **Le fournisseur des fonds de carte de production** (consigne, § 1 e) : une décision de Ko, ouverte ; elle BLOQUE le lancement, pas cette intégration.
- **Le diff final** (`git diff 5951b2cbee9fad52cdec5ddcbecf52d96a4d5e35..HEAD --name-only`) doit rester inclus dans cette table, extensions comprises ; un fichier hors table est un incident.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, **AVANT** le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*

**Extension 1** (18/11/2026, commitée SEULE, AVANT les pièces d'ouverture) — **rectification d'un compte, aucun fichier ajouté.** La table dit « D350, dernière des 306 lignes `| Dnnn |` » : `grep -c '^| D[0-9]* | '` rend bien 306, mais l'une de ces lignes est l'**en-tête** du tableau du registre (`| D | où | ligne de définition relevée |`, ligne 26972 de `ZWADJ_CONTINUITE.md`). Les décisions numérotées sont **305** (`grep -c '^| D[0-9][0-9]* | '`), et la dernière est bien D350 : le numéro attribué, D351, ne change pas. Relevé par la lecture adverse de la consigne (`docs/preuves/D351/lecture-adverse/`), dont la première passe comptait 133 lignes parce qu'elle ne lisait que la colonne « A » du registre (défaut d'instrument n° 1).

**Extension 2** (18/11/2026, commitée SEULE, AVANT les deux pièces qu'elle déclare, et AVANT la première passe des portes) — **l'attendu de l'e2e, écrit AVANT elle** (`regle-portes.md` § 4.1 : « son total est écrit […] avant la première passe » ; la règle le plaçait dans `portes/portes.md`, qui est un compte rendu écrit APRÈS les passes : pour que `git` prouve l'avant, l'attendu a sa propre pièce, commitée avant). Deux fichiers neufs, tous deux sous `docs/preuves/D351/portes/` :

| chemin | rôle |
|---|---|
| `docs/preuves/D351/portes/attendu-e2e.txt` | le total des tests de l'e2e DÉRIVÉ par `pnpm --filter @zwadj/e2e exec playwright test --list` sur l'état fusionné (HEAD = `4a0367b`, après le commit du repère de parité), et ce qu'on en attend : 110 listés, dont un ignoré ; écrit AVANT la première passe |
| `docs/preuves/D351/portes/e2e-liste.txt` | la sortie complète de `--list`, codes ANSI retirés (110 lignes de tests, le total) |

**Extension 3** (18/11/2026, commitée SEULE, AVANT les pièces qu'elle déclare — relevé en comparant les fichiers de la passe des portes aux chemins COMPLETS de cette table, après la fin des deux passes e2e : quatre fichiers non prévus à l'ouverture, tous écrits par la seconde passe et par le masquage). Tous sous `docs/preuves/D351/portes/` :

| chemin | rôle |
|---|---|
| `docs/preuves/D351/portes/passe2.sh` | le lanceur de la SECONDE passe e2e (`pnpm test:e2e` seul, juste après celle du pilote) : même relevé d'état machine que le pilote (copie de sa fonction `etat`), toutes les 30 s ; il refuse de démarrer sur batterie (code 3) |
| `docs/preuves/D351/portes/_index-passe-2.txt` | l'index de la seconde passe : SHA, arbre, état machine avant et après, ports, code de sortie, durée |
| `docs/preuves/D351/portes/FIN-2` | le marqueur de fin de la seconde passe |
| `docs/preuves/D351/portes/rapport-masquage.txt` | le rapport du masquage des deux sorties e2e : tailles, empreintes des bruts, comptes (129 suites masquées par passe, 0 restante), balayage indépendant de la forme d'un jeton |

**Extension 4** (18/11/2026, commitée SEULE, AVANT les pièces qu'elle déclare — relevé en comparant les sorties des campagnes, de la preuve R-4 et de la relecture de la note juridique aux chemins COMPLETS de cette table : les journaux de campagne, dont le nombre dépendait de ce que le lanceur rendait, et les instruments et sorties de la preuve R-4 et de la relecture). Tous sous `docs/preuves/D351/` :

| chemin | rôle |
|---|---|
| `docs/preuves/D351/neutralisation/campagnes-tout.sh` | le wrapper de `lancer-campagnes.py --tout` : état machine toutes les 30 s, empreinte sha256 de chacun des 68 harnais AVANT et APRÈS, arbre propre exigé au départ |
| `docs/preuves/D351/neutralisation/campagnes-modes.sh` | le wrapper des campagnes à mode (`--int`, `--e2e`) que la fusion touche : en série, arbre propre et ports libres exigés avant CHAQUE campagne, empreinte du harnais avant et après |
| `docs/preuves/D351/neutralisation/_index-campagnes.txt` | l'index de `--tout` : SHA, arbre, état machine avant et après, durée, harnais identiques (68 empreintes) |
| `docs/preuves/D351/neutralisation/etat-machine-campagnes.txt` | l'état machine relevé toutes les 30 s pendant `--tout` |
| `docs/preuves/D351/neutralisation/harnais-avant.txt` | le sha256 de chacun des 68 harnais, relevé AVANT `--tout` |
| `docs/preuves/D351/neutralisation/harnais-apres.txt` | le sha256 de chacun des 68 harnais, relevé APRÈS `--tout` |
| `docs/preuves/D351/neutralisation/_index-modes.txt` | l'index des sept campagnes à mode : durée, code de sortie, harnais identique, arbre après chacune |
| `docs/preuves/D351/neutralisation/etat-machine-modes.txt` | l'état machine relevé toutes les 30 s pendant les campagnes à mode |
| `docs/preuves/D351/neutralisation/verser-campagnes.py` | la procédure qui prépare le versement des journaux (retire les codes ANSI, MASQUE par `portes/masquer-jetons.py`, ajoute l'empreinte du harnais en tête) — archivée comme PREUVE, jamais promue en instrument (D291) |
| `docs/preuves/D351/neutralisation/versement-campagnes.txt` | son compte rendu : pour chaque journal, la taille brute, les suites masquées, les restantes (attendu 0), l'empreinte du brut |
| `docs/preuves/D351/r4/mutation-no-store.py` | la neutralisation de MESURE du `no-store` de `getVenueMap` (ancre unique, preuve de pose, restauration à l'octet prouvée) |
| `docs/preuves/D351/r4/mutation-no-store.txt` | sa sortie : la suite du client sous la mutation, la restauration prouvée |
| `docs/preuves/D351/tiers/balayage-tiers.py` | le balayage MÉCANIQUE de `ce-qui-part-vers-le-tiers.md` pour une valeur réelle (cinq motifs, calibré sur deux bras) — s'ajoute à la lecture humaine |
| `docs/preuves/D351/tiers/balayage-tiers.txt` | sa sortie |

Les 75 journaux de campagne (68 de `--tout`, sept des campagnes à mode : `ca1 --int`, `ca6`, `fc1`, `fc2`, `fc8`, `r48` et `pub1` en `--e2e`), chemins COMPLETS, un par ligne ; chacun commence par l'empreinte sha256 de son harnais (ligne ajoutée par l'étape de copie, dite telle) :

```
docs/preuves/D351/neutralisation/journaux/ca1--int.txt
docs/preuves/D351/neutralisation/journaux/ca6--e2e.txt
docs/preuves/D351/neutralisation/journaux/fc1--e2e.txt
docs/preuves/D351/neutralisation/journaux/fc2--e2e.txt
docs/preuves/D351/neutralisation/journaux/fc8--e2e.txt
docs/preuves/D351/neutralisation/journaux/neutralize-404.txt
docs/preuves/D351/neutralisation/journaux/neutralize-act-plafonds.txt
docs/preuves/D351/neutralisation/journaux/neutralize-adm1.txt
docs/preuves/D351/neutralisation/journaux/neutralize-adm2.txt
docs/preuves/D351/neutralisation/journaux/neutralize-argon2.txt
docs/preuves/D351/neutralisation/journaux/neutralize-available-on-api.txt
docs/preuves/D351/neutralisation/journaux/neutralize-available-on.txt
docs/preuves/D351/neutralisation/journaux/neutralize-b7.txt
docs/preuves/D351/neutralisation/journaux/neutralize-booking-status.txt
docs/preuves/D351/neutralisation/journaux/neutralize-budgets.txt
docs/preuves/D351/neutralisation/journaux/neutralize-ca1.txt
docs/preuves/D351/neutralisation/journaux/neutralize-ca2.txt
docs/preuves/D351/neutralisation/journaux/neutralize-ca3.txt
docs/preuves/D351/neutralisation/journaux/neutralize-ca4.txt
docs/preuves/D351/neutralisation/journaux/neutralize-ca5.txt
docs/preuves/D351/neutralisation/journaux/neutralize-ca6.txt
docs/preuves/D351/neutralisation/journaux/neutralize-e3d1-s8.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc1.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc10.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc12.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc2.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc3.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc4.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc5.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc6.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc7.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc8.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fc9.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fp1.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fp2.txt
docs/preuves/D351/neutralisation/journaux/neutralize-fp3.txt
docs/preuves/D351/neutralisation/journaux/neutralize-horizon.txt
docs/preuves/D351/neutralisation/journaux/neutralize-horloge.txt
docs/preuves/D351/neutralisation/journaux/neutralize-journey.txt
docs/preuves/D351/neutralisation/journaux/neutralize-maxprice.txt
docs/preuves/D351/neutralisation/journaux/neutralize-pub1.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r25.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r26.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r29.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r30.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r32.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r33.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r37.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r38.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r39.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r4.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r41.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r42.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r43.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r44.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r45.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r47.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r48.txt
docs/preuves/D351/neutralisation/journaux/neutralize-r49.txt
docs/preuves/D351/neutralisation/journaux/neutralize-rang23.txt
docs/preuves/D351/neutralisation/journaux/neutralize-s10a.txt
docs/preuves/D351/neutralisation/journaux/neutralize-s10b.txt
docs/preuves/D351/neutralisation/journaux/neutralize-s11a.txt
docs/preuves/D351/neutralisation/journaux/neutralize-s11b.txt
docs/preuves/D351/neutralisation/journaux/neutralize-s9.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s1.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s2.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s3.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s4.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s5a.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s5b.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s6.txt
docs/preuves/D351/neutralisation/journaux/neutralize-solid-s7.txt
docs/preuves/D351/neutralisation/journaux/pub1--e2e.txt
docs/preuves/D351/neutralisation/journaux/r48--e2e.txt
```

**Extension 5** (18/11/2026, commitée SEULE, AVANT la pièce qu'elle déclare — relevé après la poussée, en jouant le contrôle de fin de lot, dont la PREMIÈRE passe rendait deux ✗ qui étaient des défauts de l'instrument et non du lot : il comptait comme siens les 21 commits de la branche importés par la fusion). Un fichier neuf, sous `docs/preuves/D351/` :

| chemin | rôle |
|---|---|
| `docs/preuves/D351/controle-fin-de-lot-passe-1-AVANT-CORRECTIFS.txt` | la première passe du contrôle de fin de lot, gardée TELLE QUELLE : 16 ✓ · 2 ✗ — « premier commit » lu comme `8a64f57` (un commit de la branche) et « 5 extensions » dont `42d86a9` (un commit de la branche) ; corrigé par `--first-parent` dans `controle-fin-de-lot.py` (18 ✓ · 0 ✗) |

⚠ Les pièces `audit-secrets-d351f.txt` et `tri-audit-d351f.txt` (déclarées conditionnelles à l'ouverture) existent : un versement a lieu après l'audit « e » (cette extension, le contrôle de fin de lot et sa première passe).
