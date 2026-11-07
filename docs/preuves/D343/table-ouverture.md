# D343 — rang 45 (SUITE) — table d'ouverture

Lot : **nommer la cause de D265 par une mesure, la réparer dans le harnais e2e si elle est nommée, puis clore l'intégration de `front-client` dans `main`** (consigne du relecteur « RANG 45 (SUITE) », adoptée par Ko telle quelle, collée en tête de la session ; `docs/preuves/D343/consigne.md`). Lot de **CODE DE TEST** : si la cause est nommée, il écrit du code dans `e2e/fixtures/` (et un harnais, et peut-être une spec) ; il **compte** (D283 : un lot qui touche un harnais ou un test compte). Il n'écrit **aucune ligne d'`apps/api`** : la consigne (R-14) dit que si la correction l'exigeait, la session s'arrête et rapporte. Méthode : les règles de `AGENTS.md` — les rouges (la reproduction isolée) AVANT le premier commit de code (D334, item 5), pas de session adverse B ni de certification (pause de Ko, DR1 de D336).

- **SHA de départ** : `a1dc6355b930837beaee779c3b16dc91af51be6e` (fin de la session D342 : fusion `2b79355` faite EN LOCAL, jamais poussée sur `main`). `origin/main` = `d44867a94f90e9544c5e7fe6b6a56c0c91caea36`, `origin/front-client` = `43996e279f49bff19792b4e27cfec4bb59b66177`, branche `main`, arbre propre (`git status --short` : 0 ligne), aucun stash (0 ligne). Les cinq points ont été relevés AVANT toute écriture : aucun ne diffère de l'attendu de la consigne (§ 0).
- **Sauvegarde, premier geste d'écriture** (consigne, § 0) : `git push origin HEAD:refs/heads/integration-45` — jamais `main` — puis `git ls-remote --heads origin` : `integration-45` = `a1dc6355b930837beaee779c3b16dc91af51be6e` = HEAD local, `main` inchangée (`d44867a`), `front-client` inchangée (`43996e2`). Motif de la consigne : 117 commits n'existent que sur le poste de Ko ; une branche à part n'est pas `main`, D270 n'est pas touché.
- **Numéro** : **D343** — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (`D341`, 295e et dernière ligne `| Dnnn |`) ; `D343` figure dans **0** des quatre fichiers d'autorité (texte aplati : 0, 0, 0, 0). **D342** est PRIS par le rang 45 ouvert (103 occurrences dans `ZWADJ_CONTINUITE.md`) mais n'est pas au registre : la clôture de CE lot l'y écrit, les deux ensemble.
- **Poste à l'ouverture** : **sur secteur** (`PowerLineStatus` = `Online`, `BatteryStatus` = 2, charge 100 %), RAM libre 3 517 Mo sur 16 095, `chrome` 0, `headless_shell` 0, `node` 0, Docker 29.8.0 lancé, `zwadj-db` « Up 13 hours » (port 5432 publié). Node v22.14.0, undici 6.21.1 (celui qu'embarque Node, c'est le `fetch` du harnais). Sur batterie au moment d'une porte de clôture : aucune porte ne se lance (R-9 de D340).
- **Ce que la consigne décide** (rappel, texte complet dans `consigne.md`) : R-12, l'aléa bloque la poussée (D270), ni rejeu de plus ni exception ; R-13, **le diagnostic d'abord** — la signature (ECONNRESET en quelques ms au PREMIER appel du fixture) désigne une socket keep-alive périmée, mais c'est une **HYPOTHÈSE, pas une mesure** (règle de Ko, D291) ; elle se reproduit isolément, ROUGE, avant toute correction ; **si la reproduction échoue : aucune correction, la session s'arrête et rapporte** ; R-14, la correction admise est **dans `e2e/fixtures/` seulement**, jamais une nouvelle tentative (`retries` reste à 0), jamais dans `apps/api` ; R-15, la preuve est le rouge isolé avant, le vert isolé après, la correction neutralisée (le rouge revient), puis l'e2e complète **deux fois de suite**, sur secteur, règle commitée avant — **un seul rouge ⇒ arrêt, pas de poussée** ; R-16, la clôture de l'intégration sur le même HEAD ; R-17, deux erreurs du relecteur annotées ; R-18, ni `integration-45` ni `front-client` supprimées.
- **Ce que les enquêtes antérieures ont établi, et ce qu'elles n'ont pas** (relevé, pas supposé — `ZWADJ_BACKLOG.md`, entrées D265 ; `docs/preuves/D322/mesures/` ; `docs/preuves/D325/enquete-d265/`) : **tous** les échecs relevés sont le **premier appel `fetch` du fixture après `seedReferentials()`** (`execFileSync` synchrone, 5,2 à 5,4 s mesurés, au ras des 5 s du `keepAliveTimeout` par défaut de Node) ; l'API ne fixe **aucun** `keepAliveTimeout` dans son code (`grep` sur `apps/api/src` : 0) ; deux montages isolés (D322, D325) **n'ont pas reproduit** la panne, en changeant à chaque fois l'instrument — **ils ne l'ont donc pas écartée**. Ce lot rejoue la reproduction avec les **vraies** pièces : le vrai serveur d'API, le vrai `seedReferentials`, les vraies fonctions du fixture, dans un vrai worker Playwright.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) la consigne en pièce, la sortie de la lecture adverse de la consigne et l'audit de secrets scellé avec son tri, **avant toute écriture d'autorité** ; (3) **les pièces des rouges** (la reproduction isolée, ses sorties lues contre l'état d'avant, l'empreinte sha256 de chaque fichier joué), **dans un commit ANTÉRIEUR au premier commit de code** (D334, item 5) ; (4) le code, s'il y en a ; (5) la règle des deux passes de l'e2e, commitée **avant** elles ; (6) les pièces des passes, des six portes, des campagnes de neutralisation, de la passe D277 ; (7) les trois `.md` d'autorité, **les arbitrages de Ko en PREMIÈRE écriture** ; (8) la poussée vers `main`, puis `git fetch`, puis le contrôle de fin de lot (D288).
- **Écrit pour ne pas se lire comme tenu** : cette table ne dit pas que la cause sera nommée. Elle déclare ce qui peut exister ; les fichiers de code et de campagne sont **CONDITIONNELS** (section B) et n'existent que si la reproduction nomme la cause. Si elle ne la nomme pas, le diff final ne contient **aucun** fichier de code et le rang 45 reste **OUVERT**, rien n'est poussé sur `main`.

## A. Le départ

`git diff a1dc6355b930837beaee779c3b16dc91af51be6e..HEAD --name-only` doit rester inclus dans les sections B, C et D de cette table, **extensions comprises**. Aucun préfixe n'est employé : « 0 fichier non déclaré » doit pouvoir être faux (D328).

## B. Les fichiers de CE lot — chemins complets

### B.1 Pièces de D343 (`docs/preuves/D343/`)

| chemin | rôle |
|---|---|
| `docs/preuves/D343/table-ouverture.md` | ce fichier — premier commit du lot, SEUL |
| `docs/preuves/D343/consigne.md` | la consigne du relecteur, versée telle quelle (la copie du message collé) |
| `docs/preuves/D343/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse de la consigne contre le dépôt, calibré sur ses deux bras |
| `docs/preuves/D343/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D343/audit-secrets-d343a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la consigne et de la lecture adverse |
| `docs/preuves/D343/tri-audit-d343a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D342/audit-secrets-d342d.txt`) |
| `docs/preuves/D343/reproduction/mesure-keepalive.mjs` | relève le délai RÉEL après lequel le serveur d'API ferme une connexion inactive (jamais supposé : R-13) |
| `docs/preuves/D343/reproduction/mesure-keepalive-sortie.txt` | sa sortie |
| `docs/preuves/D343/reproduction/repro.config.ts` | la configuration Playwright de la reproduction : le **vrai** serveur d'API seul, ports dédiés, `retries: 0` |
| `docs/preuves/D343/reproduction/repro-d265.repro.ts` | la spec de reproduction : les bras négatifs et le bras positif, avec les vraies fonctions du fixture |
| `docs/preuves/D343/reproduction/rouge-avant.txt` | la sortie LUE de la reproduction contre l'état d'avant (le harnais de `a1dc635`) |
| `docs/preuves/D343/reproduction/rouge-avant-empreintes.txt` | l'empreinte sha256 de chaque fichier joué par cette reproduction (D334, item 5) |
| `docs/preuves/D343/audit-secrets-d343b.txt` | audit de secrets scellé, AVANT le commit des pièces de rouge |
| `docs/preuves/D343/tri-audit-d343b.txt` | son tri différentiel contre `audit-secrets-d343a.txt` |
| `docs/preuves/D343/portes/regle-deux-passes.md` | la règle des deux passes de l'e2e (R-15), ÉCRITE ET COMMITÉE AVANT elles |
| `docs/preuves/D343/portes/deux-passes-e2e.sh` | le lanceur des deux passes : portes dures avant la première, état machine toutes les 30 s, `retries` inchangé |
| `docs/preuves/D343/portes/passe-1-test-e2e.txt`, `docs/preuves/D343/portes/passe-2-test-e2e.txt` | les sorties des deux passes, MASQUÉES (le dépôt est public, D200) |
| `docs/preuves/D343/portes/deux-passes-index.txt` | l'index des deux passes (SHA, arbre, états machine, codes de sortie) |
| `docs/preuves/D343/portes/deux-passes-etat-machine.txt` | l'état machine relevé pendant les deux passes |
| `docs/preuves/D343/portes/deux-passes-resultat.md` | le résultat des deux passes, écrit APRÈS elles, dans un commit postérieur à celui de la règle |
| `docs/preuves/D343/portes/etat-env-d343-ouverture.txt`, `docs/preuves/D343/portes/etat-env-d343-cloture.txt` | l'état des `.env` (empreintes et hôtes, sans aucune valeur — D330) avant la première et après la dernière passe |
| `docs/preuves/D343/portes/masquer-jetons.py` | la procédure qui masque les jetons des sorties e2e, archivée à côté des pièces (jamais promue en instrument, D291) |
| `docs/preuves/D343/portes/_index.txt` | l'index de la passe des six portes de clôture (`docs/preuves/D340/portes/passe-secteur.sh`, employé tel quel) |
| `docs/preuves/D343/portes/typecheck.txt`, `docs/preuves/D343/portes/lint.txt`, `docs/preuves/D343/portes/test.txt`, `docs/preuves/D343/portes/build.txt`, `docs/preuves/D343/portes/test-int.txt` | les cinq sorties de porte, sans codes ANSI |
| `docs/preuves/D343/portes/test-e2e.txt` | la sortie de l'e2e de la passe des six portes — pièce MASQUÉE |
| `docs/preuves/D343/portes/etat-machine-pendant.txt` | l'état machine relevé toutes les 30 s pendant la passe des six portes |
| `docs/preuves/D343/portes/FIN` | le marqueur de fin de passe écrit par le pilote |
| `docs/preuves/D343/audit-secrets-d343c.txt` | audit de secrets scellé, AVANT le commit des pièces de portes |
| `docs/preuves/D343/tri-audit-d343c.txt` | son tri différentiel contre `audit-secrets-d343b.txt` |
| `docs/preuves/D343/neutralisation/union-rapport.txt` | le tableau final de la passe de l'union des campagnes (celles de D342, liste versée) et de celles que ce lot touche |
| `docs/preuves/D343/passe-d277/passe-d277.py` | la passe D277 des deux sens, motifs dérivés des affirmations du lot |
| `docs/preuves/D343/passe-d277/sortie-avant.txt`, `docs/preuves/D343/passe-d277/sortie-apres.txt` | ses sorties, avant et après les écritures d'autorité |
| `docs/preuves/D343/aucune-valeur-reelle.txt` | la sortie du contrôle dédié « 0 valeur réelle sur N fichiers » (D299) |
| `docs/preuves/D343/audit-secrets-d343d.txt` | audit de secrets scellé, AVANT le commit des campagnes |
| `docs/preuves/D343/tri-audit-d343d.txt` | son tri différentiel contre `audit-secrets-d343c.txt` |
| `docs/preuves/D343/audit-secrets-d343e.txt` | audit de secrets scellé de la clôture, AVANT les `.md` d'autorité |
| `docs/preuves/D343/tri-audit-d343e.txt` | son tri différentiel contre `audit-secrets-d343d.txt` |
| `docs/preuves/D343/controle-fin-de-lot.py` | le contrôle de fin de lot (D288, D328), écrit APRÈS la poussée |
| `docs/preuves/D343/controle-fin-de-lot.txt` | sa sortie |

### B.2 Pièces de D342 que CE lot écrit (le rang 45 se clôt ici : D342 n'a jamais été poussé)

La table de D342 les déclarait déjà ; elles n'existaient pas à l'arrêt de la session D342 (`docs/preuves/D342/` ne contient aujourd'hui ni `neutralisation/union-rapport.txt`, ni `passe-d277/sortie-apres.txt`, ni `passe-d277.md`, ni les audits « e » et « f », ni le contrôle de fin de lot). Chemins complets :

| chemin | rôle |
|---|---|
| `docs/preuves/D342/neutralisation/union-rapport.txt` | le tableau final de la passe de l'union (35 campagnes sur 55, liste versée par D342) |
| `docs/preuves/D342/passe-d277/sortie-apres.txt` | la sortie de la passe D277 « après » les écritures d'autorité de D342 |
| `docs/preuves/D342/passe-d277.md` | le compte rendu de la passe D277 des deux sens de D342 (avant → après, triage de chaque motif) |
| `docs/preuves/D342/controle-fin-de-lot.py`, `docs/preuves/D342/controle-fin-de-lot.txt` | le contrôle de fin de lot de D342 (la fusion), écrit APRÈS la poussée |
| `docs/preuves/D342/audit-secrets-d342e.txt`, `docs/preuves/D342/tri-audit-d342e.txt` | l'audit de secrets scellé de la clôture de D342 et son tri différentiel contre `audit-secrets-d342d.txt` — ⚠ **conditionnels** : voir la note sous B.3 |

### B.3 Pièces CONDITIONNELLES (leur existence dépend d'un défaut ou d'un cas — D328)

| chemin | condition |
|---|---|
| `docs/preuves/D343/reproduction/vert-apres.txt` | **seulement si la reproduction NOMME la cause** et qu'une correction est écrite : la même reproduction rejouée contre l'état d'après |
| `docs/preuves/D343/reproduction/vert-apres-empreintes.txt` | idem : l'empreinte sha256 de chaque fichier joué après la correction |
| `docs/preuves/D343/reproduction/correction-neutralisee.txt` | idem : la correction neutralisée, le rouge qui revient, LU |
| `docs/preuves/D343/arret-diagnostic.md` | **seulement si la reproduction ÉCHOUE** (R-13) ou si la correction exigerait de toucher `apps/api` (R-14) : ce que la session a mesuré, rien d'autre ; aucune correction ne s'écrit |
| `docs/preuves/D343/lecture-adverse/defauts-instrument.txt` | si la première passe de l'instrument de lecture adverse montre un défaut d'instrument (D341, D342) |
| `docs/preuves/D343/neutralisation/` — les journaux de campagnes (chemins complets par extension) | les campagnes que la liste de D342 et le tri de CE lot retiennent : leur liste dépend du diff final |
| `docs/preuves/D343/passe-d277/` — outils de lecture supplémentaires (chemins complets par extension) | si un compte de motifs ne suffit pas à trier |
| `docs/preuves/D343/audit-secrets-d343f.txt`, `docs/preuves/D343/tri-audit-d343f.txt` | si un versement a lieu après `audit-secrets-d343e.txt` |
| `docs/preuves/D343/portes/passe-3-test-e2e.txt` et autres pièces d'une troisième passe | **jamais prévues** : un seul rouge des deux passes de R-15 est un ARRÊT (R-15), pas un rejeu ; si ce fichier existe, c'est un incident |

⚠ **Les pièces `audit-secrets-d342e` / `tri-audit-d342e`** : les audits de D342 s'arrêtent à « d » (`docs/preuves/D342/audit-secrets-d342d.txt`). Les audits de ce lot portent le suffixe `d343*` et couvrent l'arbre entier, donc aussi les pièces de D342 versées ici ; les deux fichiers `d342e` de la ligne B.2 n'existent que si la session choisit de clore l'audit de D342 séparément — la table ne le suppose pas.

### B.4 Fichiers de CODE — tous CONDITIONNELS à la cause nommée (R-13, R-14)

| chemin | condition et rôle |
|---|---|
| `e2e/fixtures/harness.ts` | **si la cause est nommée** : la correction, dans les appels de préparation (`postJson`, `apiCall`) — **jamais une nouvelle tentative**, jamais dans `e2e/playwright.config.ts` (`retries` reste à 0). Fichier CRLF : vérifié en octets avant et après |
| `e2e/specs/d265-socket-perimee.e2e.ts` | **si la cause est nommée ET que la session retient une garde permanente dans la suite** : la garde qui mord (le bras positif de la reproduction, devenu un test) — sa décision, et le coût qu'elle ajoute à la suite, sont écrits à la clôture. N'existe pas si la garde reste une campagne de neutralisation |
| `neutralisation/neutralize-r45.py` | **si la cause est nommée** : le harnais du lot — neutralise la correction pour montrer que le rouge revient ; nommé selon `neutralize-<lot>.py` (D272) pour que `lancer-campagnes.py` le découvre ; LF (comme les autres harnais), trois lignes UTF-8 en tête |

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

| chemin | ce que le lot y écrit |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture** : la section 1 de la consigne (a, b — par adoption, jamais comme une parole de Ko hors une citation) et les décisions du relecteur R-12 à R-18, écrites comme telles, la table recopiée à l'identique ; puis, EN DERNIER, la section D342 (les dix-sept lots de la fusion, leur état, SHA de départ et de clôture) et la section D343 (la cause, la correction ou l'arrêt), le registre (D342 et D343), l'ordre des rangs (« RANG 45 : CLOS (intégration de front-client ; D265 nommé et réparé dans le harnais) » puis « RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR » ; ou « RANG 45 : OUVERT » si un arrêt joue), le point d'entrée, la passe D277 |
| `ZWADJ_BACKLOG.md` | les entrées D265 annotées ou cochées avec le renvoi au lot ; les entrées neuves de D342 (R-8 et R-9), les entrées que la branche a traitées COCHÉES, les prémisses fausses de R-7 BARRÉES avec leur motif, les lots arrêtés de R-6 — forme D302 (ce qu'elles bloquent, leur coût, aucune durée) |
| `AGENTS.md` | le compteur POUR MÉMOIRE (QUATRE → DIX-HUIT → DIX-NEUF si du code de test est écrit, D283 ; sinon DIX-HUIT), l'exception de la session cloud CONSOMMÉE, les annotations de ce qui est devenu faux ou permis — annotées, pas réécrites ; l'annotation des deux erreurs du relecteur (R-17) |

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucun fichier d'`apps/api`, aucune migration, aucune dépendance** : R-14 — si la correction l'exigeait, la session s'arrête et rapporte.
- **`e2e/playwright.config.ts`** n'est pas déclaré : `retries` reste à 0 (Ko, 04/10/2026 : « aucune nouvelle tentative automatique »). Si le diff final le contient, c'est un incident, pas une omission.
- **`CLAUDE.md`** n'est pas déclaré : la consigne nomme trois fichiers d'autorité.
- **`neutralisation/lancer-campagnes.py` et les autres instruments de `neutralisation/`** ne sont pas retouchés : leur promotion est un autre lot (R-10 de D342).
- **Le sort de `integration-45` et de `front-client`** : aucune des deux branches n'est supprimée dans cette session (R-18).
- **Les gestes de Ko** : ceux de `docs/preuves/D342/scenarios-ko.md` (déjà versé), joués par Ko après la poussée ; la session n'écrit rien sur sa base de développement (le geste 0, la migration `20261104170000_staff_layer`, reste une écriture de Ko).
- **Le diff final** (`git diff a1dc6355b930837beaee779c3b16dc91af51be6e..HEAD --name-only`) doit rester inclus dans cette table, extensions comprises ; un fichier hors table est un incident.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, **AVANT** le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*

**Extension 1** (07/11/2026, commitée SEULE, AVANT le commit de la pièce qu'elle déclare — relevé en comparant les fichiers de `docs/preuves/D343/` aux chemins complets de cette table : 5 fichiers sur disque, 1 hors table). La table déclarait `lecture-adverse/defauts-instrument.txt` (pièce conditionnelle, B.3) mais pas la sortie de la première passe qu'il cite ; D342 avait versé la sienne de la même façon (extension 1 de sa table).

| chemin | rôle |
|---|---|
| `docs/preuves/D343/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument de lecture adverse, gardée TELLE QUELLE : trois défauts d'instrument (un détail qui contredit son verdict, un motif cherché au mauvais endroit, un texte qui dit l'inverse de son compte) ; le comportement du dépôt ne démentait pas la consigne |

**Extension 2** (07/11/2026, commitée SEULE, AVANT les fichiers qu'elle déclare — relevé en comparant les fichiers que la reproduction va produire aux chemins complets de cette table : 2 fichiers hors table). Le lanceur de la reproduction n'était pas prévu : la sortie de Playwright contient les journaux du serveur d'API, qui portent des jetons de vérification (D200) ; il faut une procédure qui garde le brut HORS du dépôt, verse une sortie filtrée et relève les empreintes des fichiers joués — écrite une fois, rejouée trois fois (avant, après, correction neutralisée), pour que les trois pièces soient produites de la même façon. Et la pièce d'empreintes de la troisième exécution (la correction neutralisée) n'était pas nommée, alors que celles des deux autres l'étaient.

| chemin | rôle |
|---|---|
| `docs/preuves/D343/reproduction/lancer-repro.sh` | le lanceur : portes dures avant la commande (port libre, conteneur Up), brut hors dépôt, sortie filtrée des lignes de serveur, état machine avant et après, empreintes sha256 des fichiers joués ; archivé comme pièce, jamais promu en instrument (D291) |
| `docs/preuves/D343/reproduction/correction-neutralisee-empreintes.txt` | l'empreinte sha256 de chaque fichier joué par l'exécution « correction neutralisée » (D334, item 5) |
