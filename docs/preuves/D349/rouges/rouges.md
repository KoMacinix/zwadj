# D349 — les rouges lus AVANT le code (D334, point 5)

Règle : `docs/preuves/D349/regle-e2e.md`, point 1. **Ce fichier est commité AVANT tout commit de code d'application** (`apps/`, `packages/`) : `git log` le prouve. Les tests ont été écrits contre l'état d'AVANT (rien de l'application n'est encore écrit : ni `packages/types/src/venue-moderation.ts`, ni `admin-audit.ts`, ni `venue-review-queue.ts`, ni `first-admin.ts`, ni les clients d'API, ni les routes, ni les méthodes de service).

SHA de départ du code : `9ec8abf702068069dff5aa07605a884a7483f9b5` ; l'arbre ne diffère de lui que par les quatorze fichiers de test listés plus bas (et `docs/preuves/D349/`). Poste : secteur (BatteryStatus 2), Docker lancé, `zwadj-db` en marche.
⚠ **Les quatorze fichiers de test sont en CRLF** (convention du dépôt) ; les empreintes sont celles des OCTETS DU DISQUE au moment du jeu, fins de ligne comprises. Les journaux ont été joués une première fois sur des fichiers neufs en LF puis REJOUÉS après leur normalisation en CRLF : mêmes comptes à ce moment-là (22 / 24 et 33 / 12). ⚠ **Une TROISIÈME passe a suivi l'audit de secrets « b »** : cinq tests ont été AJOUTÉS (un test unitaire de la page profonde dans le second groupe ; quatre tests « un échec au COMMIT annule aussi la ligne ») — l'unitaire reste à 22 / 24 (le fichier tombe à la collecte), l'intégration passe à 34 / 15 sur 49. Seule la DERNIÈRE passe est versée ; les empreintes ci-dessous sont celles de ses fichiers.

## Les trois journaux (versés avec leur en-tête : sha256 du brut hors dépôt, aucune ligne retirée, « token= » 0, aucune suite de forme jeton)

| pièce | commande | brut (sha256 · octets) | pièce versée (sha256) | comptes |
|---|---|---|---|---|
| `docs/preuves/D349/rouges/rouge-1-unit-api.txt` | `cd apps/api && pnpm exec vitest run` + les huit specs unitaires | `915e8bd42c1d88a700e769b0ab4884802aa4dc066cff526ab43cb7832fec6d82` · 40418 | `fd02718acab78fc9b07a8176c3d9270337164f55ddb039836fe4634b390050f3` | 8 fichiers en échec ; **22 tests en échec, 24 réussis** (sur 46 collectés : les cinq fichiers qui n'importent pas leur module tombent à la collecte et ne comptent aucun test) |
| `docs/preuves/D349/rouges/rouge-2-int.txt` | `cd apps/api && pnpm run test:int` + les quatre fichiers d'intégration (PostgreSQL réel) | `f7da2241fd259e3baed16e13bb0d7b361d0a03bc460aa398198fa3fa27a8b44d` · 58024 | `9d5c29988845a595cab2821661053b254a382c5355a6d993e7a9832b19329d26` | 4 fichiers en échec ; **34 tests en échec, 15 réussis** (sur 49) |
| `docs/preuves/D349/rouges/rouge-3-api-client.txt` | `cd packages/api-client && pnpm run test` + les deux fichiers | `979fb656f0c6cea5de0db5530296409c6649779d68965e75f307935813b01a4e` · 3421 | `c68ea5331150fec51762fa4ab3aaf39d1bf91af69f6eaa2821da8492d3b3ed8c` | 2 fichiers en échec de collecte, aucun test collecté |

⚠ **Un piège d'invocation, relevé et nommé** : `pnpm exec vitest run -c vitest.config.int.ts …` échoue sur TOUT fichier d'intégration (« Nest can't resolve dependencies of the JwtAuthGuard … Reflector »), y compris un fichier qui ne touche pas ce lot — mesuré sur `venues-admin.int-spec.ts` d'avant (5 tests ; 0 réussi par `pnpm exec`, 5 sur 5 par `pnpm run test:int`). La cause n'est pas instruite ; les intégrations de ce lot se jouent par `pnpm run test:int <fichier>`, comme la porte. Le premier essai par `pnpm exec` (45 tests « skipped », tous suites en échec de `beforeAll`) n'est PAS un rouge et n'est pas versé.

## Les fichiers de test joués — empreintes sha256 des octets du disque

```text
802dbe6cedfe37127ee7931f6309fedb2578a9223a63eafe8270307f96fbedf2  apps/api/src/common/admin-audit.spec.ts  (5734 octets, CRLF 122, LF nu 0)
10c56a325d3a4bd9e0b30aa2504acdde29f16617bddaaaac081248fe8b2e03d7  apps/api/src/venues/venue-review-queue.spec.ts  (6745 octets, CRLF 135, LF nu 0)
62fee1c4a6139eab16604048896dea638ae6e2a2307bf78b5c4b8ab13d425c7d  apps/api/src/venues/venue-moderation.schemas.spec.ts  (4573 octets, CRLF 79, LF nu 0)
c0d3201a3a0f5a76872bebf45dea82b16fe197dfcfd328f8c28ffbee7e85dfd5  apps/api/src/venues/venues-admin.service.spec.ts  (28695 octets, CRLF 574, LF nu 0)
8b81d09150c921155e1032958a4cbdf187aff0233a16f30d8e638a78fc2a6232  apps/api/src/venues/venues.service.spec.ts  (14468 octets, CRLF 320, LF nu 0)
38b5491c212ab2f5054b4dfecfef942d3cbbd7a6321de305e438b8a2e4f3b133  apps/api/src/venues/venue-store.prisma.spec.ts  (13223 octets, CRLF 247, LF nu 0)
a77cf7fdc2c2a7307db31ca645c0df8cfa4a4622a404f053270dbeaab71a2c86  apps/api/src/account/account-deletion.service.spec.ts  (15544 octets, CRLF 294, LF nu 0)
223d736068ac27c0626702ab0674a4549120dbf5daa0c26fcbbeca4f5b9ebeb4  apps/api/src/admin/first-admin.spec.ts  (7646 octets, CRLF 132, LF nu 0)
7373e9f7b51bf4434e11f25796c4842f0c05ee19942ef84730c67a224edbf9d6  apps/api/test/int/admin-moderation.int-spec.ts  (22308 octets, CRLF 435, LF nu 0)
f8853c180f17d46d1c6855accf097a4762f42df64f816a1f5efcf1866220d444  apps/api/test/int/admin-audit.int-spec.ts  (17408 octets, CRLF 328, LF nu 0)
5fc30b774cfeea016f713684c2377675e809f04b57389455b3206c0527541ed4  apps/api/test/int/first-admin.int-spec.ts  (8322 octets, CRLF 154, LF nu 0)
a8e8dc70a2cb57bbf2d122c65e69605ff8d382f39c2114f0316ad52065598f88  apps/api/test/int/rbac-all-routes.int-spec.ts  (13260 octets, CRLF 273, LF nu 0)
54f7bf66315d45c4fa6053f2378088386e9d41e669c2812a0d35e770fb68b17a  packages/api-client/src/admin-client.test.ts  (5629 octets, CRLF 105, LF nu 0)
29185022c73119446a46b9b05a402df10d6092d5b47643e4d0194d182559ace1  packages/api-client/src/venue-publication-client.test.ts  (1848 octets, CRLF 31, LF nu 0)
```

## Lecture des rouges — par famille de cause (comptées sur les journaux versés, pas estimées)

**Échec de COLLECTE (aucun titre marqué, D304)** — le module que le test importe n'existe pas : `admin-audit.spec.ts` (`./admin-audit`), `venue-review-queue.spec.ts` (`./venue-review-queue`), `first-admin.spec.ts`, `venues-admin.service.spec.ts` et `account-deletion.service.spec.ts` (`../common/admin-audit` ; la seconde pour `venue-review-queue` aussi), `first-admin.int-spec.ts` (`../../src/admin/first-admin`), et les deux fichiers du client. C'est un rouge de FORME : il dit que le code n'existe pas, il ne dit rien de ce qu'il fera. **Chaque garde de ces fichiers sera prouvée par neutralisation une fois le code écrit** (`neutralisation/neutralize-adm1.py`), pas par ce rouge.

**`TypeError` : un contrat de types absent** — `venue-moderation.schemas.spec.ts` : 11 `TypeError` (`Cannot read properties of undefined (reading 'safeParse' | 'parse')`) et 1 `AssertionError` (`expected undefined to be 12`) sur 12 tests ; `admin-audit.int-spec.ts` et `admin-moderation.int-spec.ts` : 6 `TypeError` (`AdminAuditAction` absent de `@zwadj/types`) ; `venues.service.spec.ts` : 5 `TypeError` (`service.getPublicationReview is not a function`) ; `venue-store.prisma.spec.ts` : 5 `TypeError` (`ctx.salles.lireRefus is not a function`). **Un `TypeError` n'est pas une assertion** (D304) : ces tests rougissent parce que l'objet qu'ils appellent n'existe pas.

**`AssertionError` : un comportement absent, vu par l'API réelle** — `admin-moderation.int-spec.ts` et `admin-audit.int-spec.ts` : 26 `AssertionError` sur PostgreSQL réel : `expected 404 to be 200` (la route n'existe pas : `ROUTE_NOT_FOUND`), `expected [] to have a length of 1 but got +0` (le journal n'est pas écrit), `expected { code: 'ROUTE_NOT_FOUND', … } to deeply equal { code: 'VENUE_NOT_FOUND', … }` (le 404 indistinct), et les trois verdicts de la course (`tour 0 : …`). `rbac-all-routes.int-spec.ts` : 2 `AssertionError` (le plancher des routes ADMIN, `expected 5 to be greater than or equal to 8` ; l'existence de la route pro de lecture du refus) — les sept autres tests du fichier sont VERTS et le restent : ils mesurent un comportement qui existe déjà.

## Ce qui est VERT avant le code, et pourquoi (écrit pour ne pas se lire comme un oubli)

- `venues.service.spec.ts` : **10 sur 15**, dont la garde R-3 « `getMine` ne laisse pas passer `rejectionReason` » (comportement existant : la liste blanche tient déjà). `venue-store.prisma.spec.ts` : **14 sur 19**, dont « `VENUE_PRO_SELECT` ne contient ni motif ni taux » (idem).
- `admin-moderation.int-spec.ts` : 4 sur 27 — « D46 : sans créneau ACTIF, 409 `SLOT_TEMPLATE_REQUIRED` » et « 404 sur une salle supprimée, aucune ligne » (la route `publish` existe et fait déjà cela), « R-3 : le contrat principal du pro ne change pas » (existant), et **« R-1 : la réponse ne porte AUCUN taux »**. ⚠ **Ce dernier est VERT POUR UNE MAUVAISE RAISON** : la route de la file n'existe pas, sa réponse est un 404 dont le corps ne contient évidemment aucun taux. **Il ne mesure rien avant le code** ; sa morsure se prouve APRÈS, par neutralisation (une cible du harnais ajoute un taux au `select` de la file et il doit rougir).
- `admin-audit.int-spec.ts` : 4 sur 13 — « R-1 : le réglage des taux n'écrit aucune ligne » (comportement existant, qu'il garde) et **trois des quatre tests « un échec au COMMIT annule aussi la ligne » (publier, approuver une suppression, rejeter une suppression)** : ⚠ **VERTS POUR UNE MAUVAISE RAISON** — le code d'avant n'écrit AUCUNE ligne de journal ; le déclencheur différé refuse le commit de l'écriture de l'action, l'état reste celui d'avant et le journal reste vide, ce que le test exige. Ils ne mesurent rien avant le code : ils MORDENT après lui, par neutralisation (une cible écrit la ligne HORS de la transaction : la ligne survit au commit refusé). Le quatrième (rejeter une salle) est rouge : la route n'existe pas.
- `rbac-all-routes.int-spec.ts` : 7 sur 9 — le comportement existant des routes déjà couvertes.

## Ce que ces rouges NE disent PAS

- Ils ne disent pas que le code qui va s'écrire est juste : un test écrit dans la même séance que le code peut valider la faute (D219). La preuve que chaque garde MORD est la campagne `neutralisation/neutralize-adm1.py`, qui rougit sous la mutation de chaque garde et reste verte une fois restaurée.
- Ils ne disent pas que la course publier / rejeter est reproduite : la route de rejet n'existe pas encore ; la course n'a de sens qu'avec elle. Elle est MESURÉE après le code, sous la mutation « le rejet ne conditionne plus son écriture au statut ».
