# D344 — rang 46 — table d'ouverture

Lot : **faire revenir dans la suite e2e (`e2e/specs/`) les deux specs sorties à cause de D265** — `docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts` (rang 32, D325) et `docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts` (rang 30, D322) — maintenant que D265 est nommé et réparé (D343, `e2e/fixtures/harness.ts`, `connection: close`). Consigne du relecteur « RANG 46 », adoptée par Ko telle quelle, collée en tête de la session (`docs/preuves/D344/consigne.md`). Lot de **CODE DE TEST** : il écrit deux fichiers dans `e2e/specs/` ; il **compte** (D283) : compteur POUR MÉMOIRE DIX-NEUF → VINGT à sa clôture. Il n'écrit **aucune ligne d'`apps/`**, aucune migration, aucune dépendance. Méthode : `AGENTS.md` — copie, jamais déplacement (R-2) ; les rouges (chaque spec jouée contre une garde neutralisée) AVANT le premier commit de code (D334, item 5) ; pas de session adverse B ni de certification (pause de Ko, DR1 de D336).

- **SHA de départ** : `5e932b388ce9f3303bca95e76b40cbb92c70362e` = `origin/main` (relevé après `git fetch`, avant toute écriture). Branche `main`, arbre propre (`git status --short` : 0 ligne), aucun stash (0 ligne). Les points de la section 0 de la consigne ont été relevés AVANT toute écriture : aucun ne diffère de l'attendu (rang 45 CLOS, D342 et D343 au registre, compteur DIX-NEUF, « RANG 46 : EN ATTENTE DE CADRAGE DU RELECTEUR »).
- **Numéro** : **D344** — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (`D343`) ; `D344` figure dans **0** des quatre fichiers d'autorité (texte aplati : 0, 0, 0, 0).
- **Poste à l'ouverture** : **sur secteur** (`Win32_Battery.BatteryStatus` = 2, charge 100 %), RAM libre 5 317 Mo, `chrome` 0, `headless_shell` 0, Docker 29.8.0 lancé, ports 3100/3101 libres. Sur batterie au moment d'une porte de clôture : aucune porte ne se lance (R-9 de D340).
- **Déclaration de Ko, consignée telle quelle** (message d'ouverture de la session) : « secret Google régénéré, ancien supprimé, ligne retirée du .env ». Elle touche l'entrée `[SÉCU]` ouverte par D343 (une valeur de forme secrète vue dans un commentaire de `apps/api/.env`). La session **ne lit pas** les `.env` : elle en relève l'empreinte et les hôtes (D330) ; elle n'a donc aucun moyen de **vérifier** la déclaration, et l'écrit comme déclarée, non vérifiée (backlog, section C).
- **Ce que la consigne décide** (texte complet dans `consigne.md`) : R-1, ce lot passe avant L36-3a-2 ; R-2, les pièces versées restent intactes, chaque spec est **COPIÉE**, tout écart avec l'archive est un diff déclaré et motivé ligne par ligne ; R-3, si une spec échoue contre l'application d'aujourd'hui : la première ligne du bloc d'échec se lit (D304) ; une **ancre périmée** (nom accessible, adresse) se met à jour, déclarée, **sans affaiblir l'assertion** ; un **comportement de l'application qui contredit la spec** : ni l'une ni l'autre n'est corrigée, la spec s'arrête et reste dans `docs/preuves/` ; R-4, chaque spec revenue **mord** (neutralisation à la main, rouge lu, restauration), puis l'e2e complète **deux fois de suite**, sur secteur, règle commitée avant ; deux vertes ⇒ porte verte, un rouge ⇒ arrêt, pas de poussée (R-15 de D343) ; R-5, annotations additives de `AGENTS.md` et des entrées de backlog des deux reports.
- **Ce que les archives disent** (relevé, pas supposé) : r30 = 1 test ; r32 = 5 tests (parcours, « Bloquer la date », échec serveur, calendrier du week-end, arabe à 360 px) ; r32 importe `../../../../e2e/…` (chemins de l'archive) et r30 `../…` (chemins de la suite) : seuls **quatre chemins relatifs de r32** (`../../../../packages/i18n/messages/fr.json`, `…/ar.json`, `../../../../e2e/playwright.config`, `../../../../e2e/fixtures/harness`) changent à la copie — quatre lignes d'import, aucune assertion. r30 est **déjà** écrite avec les chemins de la suite : sa copie doit être identique à l'octet. Les deux fichiers sont en CRLF.
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328 ; consigne, § 3) : (1) **ce fichier, SEUL** ; (2) la consigne en pièce, la sortie de la lecture adverse de la consigne et l'audit de secrets scellé avec son tri, **avant toute écriture d'autorité** ; (3) **les pièces des rouges** — chaque spec jouée contre chacune de ses gardes neutralisées, les sorties LUES, l'empreinte sha256 de chaque fichier joué, dans un commit **ANTÉRIEUR** au premier commit de code (D334, item 5) ; (4) le code : les deux copies dans `e2e/specs/` ; (5) la règle des deux passes, commitée **avant** elles ; (6) les pièces des passes, des six portes, de la passe D277 ; (7) les trois `.md` d'autorité, **les arbitrages de Ko en PREMIÈRE écriture** ; (8) la poussée vers `main`, puis `git fetch`, puis le contrôle de fin de lot (D288).
- **Écrit pour ne pas se lire comme tenu** : cette table ne dit pas que les deux specs reviendront. Si l'une contredit l'application d'aujourd'hui (R-3), elle ne revient pas : le diff final ne contient alors que l'autre, et le rang reste ouvert sur cette spec. Les fichiers de la section B.3 existent **sous condition**.

## A. Le départ

`git diff 5e932b388ce9f3303bca95e76b40cbb92c70362e..HEAD --name-only` doit rester inclus dans les sections B et C de cette table, **extensions comprises**. Aucun préfixe n'est employé : « 0 fichier non déclaré » doit pouvoir être faux (D328).

## B. Les fichiers de CE lot — chemins complets

### B.1 Pièces de D344 (`docs/preuves/D344/`)

| chemin | rôle |
|---|---|
| `docs/preuves/D344/table-ouverture.md` | ce fichier — premier commit du lot, SEUL |
| `docs/preuves/D344/consigne.md` | la consigne du relecteur, versée telle quelle (la copie du message collé) |
| `docs/preuves/D344/lecture-adverse/confronter-consigne.py` | l'instrument de la lecture adverse de la consigne contre le dépôt, calibré sur ses deux bras |
| `docs/preuves/D344/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D344/audit-secrets-d344a.txt` | audit de secrets scellé (`neutralisation/audit-secrets.py --sortie`), avant le commit de la consigne et de la lecture adverse |
| `docs/preuves/D344/tri-audit-d344a.txt` | son tri différentiel contre la dernière sortie scellée (`docs/preuves/D343/audit-secrets-d343e.txt`) |
| `docs/preuves/D344/ecarts-copie.md` | le diff déclaré entre chaque copie et son archive (R-2), motivé ligne par ligne, avec les empreintes sha256 de l'archive et de la copie |
| `docs/preuves/D344/neutralisation-e2e/rejouer.py` | la procédure de neutralisation à la main (patron de `docs/preuves/D325/neutralisation-e2e/rejouer.py`) : UNE mutation posée et prouvée posée, UN test joué, restauration prouvée par l'empreinte, extrait du bloc d'échec ; archivée comme pièce, jamais promue en instrument (D291) |
| `docs/preuves/D344/neutralisation-e2e/K-1.txt` | extrait LU : le lien « Calendrier de la salle » revient à la route supprimée — la spec du lien (r30) rougit |
| `docs/preuves/D344/neutralisation-e2e/E-1.txt` à `docs/preuves/D344/neutralisation-e2e/E-7.txt` | extraits LUS : sept gardes de r32 neutralisées, chacune sur le test de r32 qui la mesure (liste dans `rejouer.py`) |
| `docs/preuves/D344/neutralisation-e2e/lecture-des-rouges.md` | la lecture écrite des huit rouges : pour chacun, la première ligne du bloc d'échec (D304, D323), l'attendu et le reçu |
| `docs/preuves/D344/neutralisation-e2e/empreintes.txt` | l'empreinte sha256 de chaque fichier joué par ces exécutions : les deux specs copiées, `e2e/fixtures/harness.ts`, `e2e/playwright.config.ts`, `rejouer.py` (D334, item 5) |
| `docs/preuves/D344/neutralisation-e2e/vert-avant-mutation.txt` | chaque spec jouée SEULE, sans mutation, avant les rouges : le vert de départ (sans lui, un rouge ne se lit pas) |
| `docs/preuves/D344/audit-secrets-d344b.txt`, `docs/preuves/D344/tri-audit-d344b.txt` | audit scellé AVANT le commit des pièces de rouge, et son tri contre `audit-secrets-d344a.txt` |
| `docs/preuves/D344/portes/regle-deux-passes.md` | la règle des deux passes de l'e2e (R-4), ÉCRITE ET COMMITÉE AVANT elles |
| `docs/preuves/D344/portes/deux-passes-e2e.sh` | le lanceur des deux passes (patron de `docs/preuves/D343/portes/deux-passes-e2e.sh`) : portes dures avant la première, état machine toutes les 30 s, `retries` inchangé |
| `docs/preuves/D344/portes/passe-1-test-e2e.txt`, `docs/preuves/D344/portes/passe-2-test-e2e.txt` | les sorties des deux passes, MASQUÉES (le dépôt est public, D200) |
| `docs/preuves/D344/portes/deux-passes-index.txt`, `docs/preuves/D344/portes/deux-passes-etat-machine.txt` | l'index (SHA, arbre, états machine, codes de sortie) et l'état machine des deux passes |
| `docs/preuves/D344/portes/deux-passes-resultat.md` | le résultat des deux passes, écrit APRÈS elles, dans un commit postérieur à celui de la règle |
| `docs/preuves/D344/portes/etat-env-d344-ouverture.txt`, `docs/preuves/D344/portes/etat-env-d344-cloture.txt`, `docs/preuves/D344/portes/deux-passes-env-comparaison.txt` | l'état des `.env` (empreintes et hôtes, sans aucune valeur — D330) avant la première et après la dernière passe, et leur comparaison |
| `docs/preuves/D344/portes/masquer-jetons.py` | la procédure qui masque les jetons des sorties e2e : copie de `docs/preuves/D343/portes/masquer-jetons.py` (réparée par D343), archivée à côté des pièces (jamais promue en instrument, D291) |
| `docs/preuves/D344/portes/_index.txt` | l'index de la passe des six portes de clôture (`docs/preuves/D340/portes/passe-secteur.sh`, employé tel quel) |
| `docs/preuves/D344/portes/typecheck.txt`, `docs/preuves/D344/portes/lint.txt`, `docs/preuves/D344/portes/test.txt`, `docs/preuves/D344/portes/build.txt`, `docs/preuves/D344/portes/test-int.txt`, `docs/preuves/D344/portes/test-e2e.txt` | les six sorties de porte (`test-e2e.txt` MASQUÉE) |
| `docs/preuves/D344/portes/etat-machine-pendant.txt`, `docs/preuves/D344/portes/FIN` | l'état machine pendant la passe des six portes et le marqueur de fin |
| `docs/preuves/D344/audit-secrets-d344c.txt`, `docs/preuves/D344/tri-audit-d344c.txt` | audit scellé AVANT le commit des pièces de portes, et son tri contre `audit-secrets-d344b.txt` |
| `docs/preuves/D344/passe-d277/passe-d277.py` | la passe D277 des deux sens, motifs dérivés des affirmations du lot |
| `docs/preuves/D344/passe-d277/sortie-avant.txt`, `docs/preuves/D344/passe-d277/sortie-apres.txt` | ses sorties, avant et après les écritures d'autorité |
| `docs/preuves/D344/passe-d277.md` | le compte rendu de la passe D277 (avant → après, le triage de chaque motif) |
| `docs/preuves/D344/aucune-valeur-reelle.txt` | la sortie du contrôle dédié « 0 valeur réelle sur N fichiers » (D299) |
| `docs/preuves/D344/audit-secrets-d344d.txt`, `docs/preuves/D344/tri-audit-d344d.txt` | audit scellé de la clôture, AVANT les `.md` d'autorité, et son tri contre `audit-secrets-d344c.txt` |
| `docs/preuves/D344/controle-fin-de-lot.py`, `docs/preuves/D344/controle-fin-de-lot.txt` | le contrôle de fin de lot (D288, D328), écrit APRÈS la poussée, et sa sortie |

### B.2 Fichiers de CODE DE TEST

| chemin | rôle |
|---|---|
| `e2e/specs/r30-lien-calendrier-pro.e2e.ts` | COPIE de `docs/preuves/D322/navigateur/r30-lien-calendrier-pro.e2e.ts` (l'archive n'est pas touchée, R-2) ; attendue **identique à l'octet** (les chemins relatifs de l'archive sont déjà ceux de la suite) ; CRLF |
| `e2e/specs/r32-nouvelle-reservation.e2e.ts` | COPIE de `docs/preuves/D325/navigateur/r32-nouvelle-reservation.e2e.ts` ; seuls les chemins d'import changent (`ecarts-copie.md`) ; **l'en-tête « ⛔ PLACE : CETTE SPEC N'EST PAS DANS LA SUITE » est remplacé** par un en-tête qui dit qu'elle y est revenue (D344) — c'est un écart de COMMENTAIRE, déclaré ligne par ligne ; CRLF |

### B.3 Pièces et code CONDITIONNELS (leur existence dépend d'un défaut ou d'un cas — D328)

| chemin | condition |
|---|---|
| `docs/preuves/D344/arret-spec.md` | **seulement si une spec contredit l'application d'aujourd'hui** (R-3, second cas) ou si une mutation ne mord pas : ce que la session a mesuré, rien d'autre ; aucune correction ne s'écrit |
| `docs/preuves/D344/ancres-mises-a-jour.md` | **seulement si une ancre périmée** (un nom accessible, une adresse) est mise à jour (R-3, premier cas) : l'ancienne et la nouvelle, la preuve que l'assertion n'est pas affaiblie |
| `e2e/specs/warmup.setup.ts` | **seulement si la mesure montre** que `/calendrier` (route de r30, absente de la liste de préchauffage) fait rougir la spec par un délai de compilation à la première demande — la classe de D127 ; la correction est d'ajouter la route à `ROUTES`, jamais de monter un délai. Fichier CRLF : vérifié en octets |
| `e2e/README.md` | **seulement s'il liste les specs** (relevé à l'ouverture : il ne les liste pas ; la condition est vérifiée avant la clôture) |
| `docs/preuves/D344/lecture-adverse/defauts-instrument.txt` | si la première passe de l'instrument de lecture adverse montre un défaut d'instrument (D341, D342, D343) |
| `docs/preuves/D344/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | idem : la première passe, gardée TELLE QUELLE |
| `docs/preuves/D344/audit-secrets-d344e.txt`, `docs/preuves/D344/tri-audit-d344e.txt` | si un versement a lieu après `audit-secrets-d344d.txt` |
| `docs/preuves/D344/portes/passe-3-test-e2e.txt` et autres pièces d'une troisième passe | **jamais prévues** : un seul rouge des deux passes est un ARRÊT (R-15 de D343), pas un rejeu ; si ce fichier existe, c'est un incident |

## C. Les fichiers d'autorité — écrits en dernier, les arbitrages de Ko en première écriture

| chemin | ce que le lot y écrit |
|---|---|
| `ZWADJ_CONTINUITE.md` | **première écriture** : la section 1 de la consigne (a, b — par adoption, jamais comme une parole de Ko hors une citation) et les décisions du relecteur R-1 à R-5, écrites comme telles, la table recopiée à l'identique ; puis, EN DERNIER, la section D344 (ce qui est revenu, les écarts de copie, les rouges lus, les deux passes), le registre (D344), l'ordre des rangs (« RANG 46 : CLOS », puis « RANG 47 : EN ATTENTE DE CADRAGE DU RELECTEUR », candidat proposé : L36-3a-2 avec S-104), le point d'entrée, la passe D277 des deux sens |
| `ZWADJ_BACKLOG.md` | les entrées des deux reports (la spec du rang 32, la spec du lien du calendrier) annotées « revenue dans la suite, D344 », **additif** (R-5) ; l'entrée `[SÉCU]` annotée de la déclaration de Ko, **comme déclarée et non vérifiée** ; les entrées neuves éventuelles, forme D302 (ce qu'elles bloquent, leur coût, aucune durée) |
| `AGENTS.md` | l'annotation additive de « la spec e2e du rang 32 est HORS de la suite » (revenue, D344) ; le compteur POUR MÉMOIRE DIX-NEUF → VINGT ; le nombre de tests de la suite si elle est citée (78 → 78 + le nombre de tests des deux specs, DÉRIVÉ de la liste de Playwright, jamais écrit de mémoire) — annoté, pas réécrit |

## D. Ce que cette table NE déclare PAS (et pourquoi)

- **Aucun fichier d'`apps/`, de `packages/`, aucune migration, aucune dépendance** : le lot ne change que de la suite de test. Si une spec exigeait qu'on touche l'application, c'est le second cas de R-3 : la session s'arrête et rapporte.
- **`docs/preuves/D325/navigateur/*` et `docs/preuves/D322/navigateur/*`** ne sont pas touchés (R-2, D295 : une archive ne se retouche pas). Leur configuration de rejeu (`playwright.capture.config.ts`) reste telle quelle.
- **`e2e/playwright.config.ts`** n'est pas déclaré : `retries` reste à 0 (Ko, 04/10/2026). Si le diff final le contient, c'est un incident, pas une omission.
- **`e2e/fixtures/harness.ts`** n'est pas déclaré : la réparation de D343 est jouée telle quelle ; les deux specs la traversent (`createPublishedVenue`, `loginContext`, `seedReferentials`, `accessTokenOf`, `apiCall`). Si une spec exigeait d'y toucher, c'est un arrêt.
- **`CLAUDE.md`** n'est pas déclaré : la consigne nomme trois fichiers d'autorité.
- **`neutralisation/*`** n'est pas touché : les campagnes `neutralize-r30.py` et `neutralize-r32.py` existent déjà, elles jouent des tests vitest et ne lisent pas ces specs ; aucune campagne ne voit ce lot (relevé en lançant `neutralisation/lancer-campagnes.py` sur le diff final, résultat rapporté).
- **Les gestes de Ko** : aucun. La session n'écrit rien sur la base de développement de Ko (la suite e2e travaille sur `zwadj_e2e`, recréée à chaque passe).
- **Le diff final** (`git diff 5e932b388ce9f3303bca95e76b40cbb92c70362e..HEAD --name-only`) doit rester inclus dans cette table, extensions comprises ; un fichier hors table est un incident.

## Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, **AVANT** le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*
