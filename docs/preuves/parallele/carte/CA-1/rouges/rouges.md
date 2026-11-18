# CA-1 — LES ROUGES, lus contre l'état d'avant (aucune ligne de code du lot n'existe)

Joués le 13/11/2026 sur `d51826c` + les trois fichiers de test ci-dessous, NON commités à cet instant, et rien d'autre.
Environnement : conteneur cloud, PostgreSQL 16.15 + polyfill `uuidv7` (`ALLOW_PG_LT18_POLYFILL=1`), vitest 3.2.7.

| sortie | ligne « Tests » | lecture |
|---|---|---|
| `unit-venue-map.txt` | `Tests  no tests`, `Test Files 1 failed` | ⚠ PAS une assertion : le fichier tombe À LA COLLECTE (`Cannot find module './venue-map'`). Le module n'existe pas — c'est l'état d'avant. Aucun test n'a tourné ; ce rouge prouve seulement que la spec dépend du module à écrire. |
| `unit-venues-public-service.txt` | `Tests  no tests`, `Test Files 1 failed` | idem : même import manquant. ⚠ Conséquence lue : tant que le module manque, les tests EXISTANTS de ce fichier ne tournent pas non plus — c'est pour cela que le commit des tests et celui du code ne sont séparés par aucune porte. |
| `int-venue-map.txt` | `Tests  8 failed \| 1 passed (9)` | HUIT `AssertionError` lues (`expected 404 to be 200` ×6, `expected 404 to be 400` ×2) : la route n'existe pas. UN test vert, et il DOIT l'être avant comme après : « une salle dont le slug est “map” reste lisible » — c'est la garde de l'écart C-1 (la route de carte ne masque aucune fiche) ; elle sera neutralisée par le harnais. |

`rbac-all-routes.int-spec.ts` : NON joué et NON modifié. Lu : sa liste blanche ne concerne que les routes authentifiées SANS rôle
(`!r.isPublic`) ; une route `@Public()` n'y entre pas. Le fichier reste dans la table, il n'est pas touché ; la pièce
`int-rbac-all-routes.txt` n'est donc pas produite. Que la route soit publique est mesuré par `venue-map.int-spec.ts`
(« route PUBLIQUE : aucune session n'est demandée »).

## Empreintes sha256 des fichiers de test joués
    ad0acae727a254bd9231c207b6c7ecee7211233e191eacc7325dd51effb2a65e  apps/api/src/venues/venue-map.spec.ts
    e5f38e04358f0843ba72ab6c765fddbfd2eba86be84f2f1faed36df0629b1bbb  apps/api/src/venues/venues-public.service.spec.ts
    c74498d957e2b9aa41a26d6d2d730dbe96d4be11d82c4189a0c20aa3f082107f  apps/api/test/int/venue-map.int-spec.ts
