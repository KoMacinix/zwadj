# CA-1 — la route de points de la carte et ses types · TABLE D'OUVERTURE

Session parallèle « CARTE », branche `par-carte`. SHA de départ du lot : `8a64f57` (ouverture de la session ; code = `origin/main` `26ad5c7`).
Lot de CODE (il comptera à l'intégration). Aucun fichier d'autorité, aucun numéro D, aucun rang, aucune migration.

## Fichiers du lot (chemins COMPLETS)

### Code et tests
| chemin | nature |
|---|---|
| `packages/types/src/venue.ts` | BLOC NEUF en fin de la section « liste publique » : `VENUE_MAP_MAX_POINTS`, `VenueMapPointDTO`, `VenueMapResponse` — rien de déplacé |
| `apps/api/src/venues/venue-map.ts` | NEUF — module pur : forme d'un point, enveloppe (sans coordonnées, tronqué) |
| `apps/api/src/venues/venue-map.spec.ts` | NEUF — spec du module pur |
| `apps/api/src/venues/venue-map.controller.ts` | NEUF — `GET /api/v1/venue-map`, publique |
| `apps/api/src/venues/venues-public.service.ts` | le `where` de la liste devient UNE fonction, que `list()` et `map()` appellent ; `map()` neuve |
| `apps/api/src/venues/venues-public.service.spec.ts` | tests neufs : même `where` que la liste, plafond, tri, refus de date |
| `apps/api/src/venues/venues.module.ts` | déclaration du contrôleur neuf |
| `apps/api/test/int/venue-map.int-spec.ts` | NEUF — base réelle : identifiants de la liste contre ceux de la carte, aucune fuite, troncature |
| `apps/api/test/int/rbac-all-routes.int-spec.ts` | la route neuve entre dans la liste des routes publiques |
| `neutralisation/neutralize-ca1.py` | NEUF — harnais du lot |

### Pièces
| chemin | nature |
|---|---|
| `docs/preuves/parallele/carte/CA-1/table-ouverture.md` | cette table (premier commit, SEULE) |
| `docs/preuves/parallele/carte/CA-1/rouges/rouges.md` | lecture des rouges, empreintes sha256 des fichiers de test joués |
| `docs/preuves/parallele/carte/CA-1/rouges/unit-venue-map.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-1/rouges/unit-venues-public-service.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-1/rouges/int-venue-map.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-1/rouges/int-rbac-all-routes.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-1/neutralisation/neutralize-ca1.txt` | sortie du harnais |
| `docs/preuves/parallele/carte/CA-1/campagnes/lancer-campagnes.txt` | sortie du tri des campagnes |
| `docs/preuves/parallele/carte/CA-1/portes/portes.md` | les portes, leurs chiffres, l'état machine |
| `docs/preuves/parallele/carte/CA-1/portes/_index.txt` | codes de sortie et durées |
| `docs/preuves/parallele/carte/CA-1/portes/typecheck.txt` | sortie |
| `docs/preuves/parallele/carte/CA-1/portes/lint.txt` | sortie |
| `docs/preuves/parallele/carte/CA-1/portes/test.txt` | sortie |
| `docs/preuves/parallele/carte/CA-1/portes/build.txt` | sortie |
| `docs/preuves/parallele/carte/CA-1/portes/test-int.txt` | sortie |
| `docs/preuves/parallele/carte/CA-1/audit-secrets-ca1.txt` | audit de secrets scellé, avant le versement des pièces |

### CONDITIONNELS
| chemin | condition |
|---|---|
| `docs/preuves/parallele/carte/CA-1/arret.md` | seulement si le lot s'ARRÊTE (migration nécessaire, prémisse fausse, fichier d'une autre session) |
| `docs/preuves/parallele/carte/CA-1/tri-audit-ca1.txt` | seulement si l'audit rend une alerte absente de l'audit d'ouverture |

## Ce que cette table ne déclare pas
`packages/api-client` : non touché (lecture adverse, C-2). `apps/api/prisma/` : non touché (aucune migration). Le client web : lot CA-2.

## Extensions
(aucune à l'ouverture)
