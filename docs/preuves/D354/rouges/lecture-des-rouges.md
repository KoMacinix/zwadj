# D354 — les ROUGES, lus contre l'état d'avant (méthode renforcée, D334 item 5, R-3 « S-104 mesurée d'abord »)

**Ce que ce dossier est** : la sortie BRUTE de chaque famille de tests du lot, jouée contre le code d'AVANT (`0423963`), avec l'empreinte sha256 de CHAQUE fichier de test joué (octets de l'arbre de travail au moment du jeu, en tête de chaque sortie). Il entre dans un commit **antérieur au premier commit de code** : `git log` le prouve.

**Ce que l'arbre contenait au moment du jeu** : les fichiers de test (neufs ou modifiés) et leurs aides ; **aucun fichier de production** — `git status --short` lu avant la passe unitaire ne listait, parmi les fichiers suivis, que des `*.spec.ts`, `*.test.ts` et des aides de `test/int/`. La passe d'intégration a tourné en arrière-plan ; **pendant elle, la session n'a rien écrit dans le dépôt** (les brouillons de code vivaient dans le dossier de travail, hors dépôt) — le code n'a été copié dans l'arbre qu'après sa fin. Les 18 empreintes des en-têtes ont été **confrontées à l'arbre après coup : 18 sur 18 identiques** (aucun fichier de test n'a bougé entre le jeu et ce versement).

| aide jouée avec les tests d'intégration | sha256 (arbre de travail au moment du jeu) |
|---|---|
| `apps/api/test/int/staff-helpers.ts` | `a87e700c4d496f6592ccb23729ea1bfa570964454bd5221a7995884fcd6f0071` |
| `apps/api/test/int/route-collector.ts` | `659f8764f2f5c036f8d5afdefab52d8a88911e212d08c9cfcdee7840f7de12bc` |
| `apps/api/test/int/row-lock.ts` | `1eb5c966163c1b0b84d6ac27e8508a66ca56f21e6b3d8cc55f499e1ce0cdb977` |

## 1. Les trois passes (chiffres LUS dans les sorties brutes, pas recalculés)

| famille | fichiers | résultat | sortie |
|---|---|---|---|
| unitaire API (`vitest run`, 11 fichiers du lot) | **11 en échec sur 11** | **59 tests en échec · 109 passés (168)** ; **6 fichiers tombés à la COLLECTE** (aucun test compté : le module qu'ils importent n'existe pas, ou `RequiresStaffCapability` n'est pas une fonction à la déclaration de la classe) | `rouge-unit.txt` |
| client d'API (1 fichier) | 1 en échec | **5 en échec · 6 passés (11)** : les quatre appels neufs et la liste des contrats | `rouge-client.txt` |
| intégration, PostgreSQL réel (6 fichiers) | **6 en échec sur 6** | **18 en échec · 1 passé · 65 ignorés (84)** : trois fichiers tombés dès leur `beforeAll` ou leur collecte (65 tests ignorés) | `rouge-int.txt` |

## 2. La LECTURE : assertion ou erreur ? (première ligne du bloc `FAIL … > titre`, en-têtes regroupés sautés — D304, D316)

| fichier | par assertion | par `TypeError` / `Error` |
|---|---|---|
| `staff-session.service.spec.ts` (S-104 : connexion et état) | **7** | 0 |
| `staff-source-guards.spec.ts` | 7 | 3 |
| `staff-contract.spec.ts` | 3 | 8 |
| `staff-store.prisma.spec.ts` | 3 | 20 (les quatre méthodes neuves « is not a function ») |
| `staff-capabilities.spec.ts` | 0 | 8 (`peut` n'existe pas) |
| `staff-session.guard.spec.ts`, `staff-access-policy`, `staff-account-state`, `staff-members-policy`, `staff-members.service`, `staff-temporary-password` | — | **fichier entier tombé à la collecte** (6) |
| `staff-client.test.ts` | 1 | 4 |
| intégration `staff-password-expiry.int-spec.ts` (**S-104 de bout en bout**) | **5** | 3 (identifiant de membre vide : le membre n'a pas pu être créé, la route n'existe pas) |
| intégration `log-temporary-password.int-spec.ts` | 3 | 0 |
| intégration `staff-last-manager.int-spec.ts` | 1 | 6 (le second Manager n'a pas pu être créé : route absente) |
| intégration `staff-members`, `staff-capabilities`, `staff-session-guard` | — | **fichier entier tombé à la collecte ou au `beforeAll`** (3) |

## 3. Ce que ces rouges PROUVENT, et ce qu'ils NE PROUVENT PAS (écrit pour ne pas se lire comme plus)

- **S-104 est MESURÉE contre l'état d'avant** (R-3) : 7 tests unitaires du service et 5 tests d'intégration rougissent **par assertion** — un mot de passe ordinaire de 90 jours expiré se connecte et rend `mustChangePassword: false` ; un temporaire expiré est ADMIS (« un refus était attendu ») ; l'état d'un temporaire expiré rend encore un membre. C'est le défaut que D341 avait écrit (« un mot de passe expiré ouvre une session »), reproduit avant d'être corrigé. ⚠ Une assertion qui échoue arrête son test : les assertions SUIVANTES du même test (le 403 des autres routes, par exemple) n'ont pas été atteintes contre l'ancien code ; elles sont mesurées au vert, et leur morsure par la neutralisation.
- **Les routes K-19 à K-22, la table des capacités, les quatre modules purs** : les rouges sont des rouges d'**ABSENCE** (le module, la fonction ou la route n'existe pas) : ils prouvent que les tests ne passent pas à vide, **pas qu'une garde mord**. C'est écrit à la règle des portes (§ 1) et c'est la neutralisation (`neutralisation/neutralize-r56.py`) qui prouve la morsure.
- **Les courses de R-4** (deux Managers qui se désactivent l'un l'autre ; le dernier Manager qui se désactive lui-même) : contre l'état d'avant, elles tombent sur « le second Manager n'a pas pu être créé » (route absente) — **aucune course n'a été mesurée rouge** : il n'y avait rien à courir. Leur morsure réelle est mesurée au harnais : le comptage hors du verrou, le verrou de L1 retiré.
- **Le journal du temporaire** : 3 tests rouges par assertion parce que la création du membre échoue (201 attendu) — là encore, une absence ; la garde est mordue au harnais (un `console.log` du temporaire dans le service).
- **Les 109 tests unitaires et le 1 test d'intégration PASSÉS** sont ceux qui ne dépendent d'aucun code neuf (la partie existante des fichiers modifiés, la couche éteinte) : ils sont la preuve que les fichiers modifiés n'ont pas été cassés avant même d'écrire le code.

## 4. Les corrections de tests APRÈS les rouges

Aucune à ce versement : les 18 empreintes de test sont celles de l'arbre au moment du jeu. Toute correction ultérieure d'un fichier de test sera **déclarée** (empreinte avant / après) dans la section de décision, comme au § 5 de D341.
