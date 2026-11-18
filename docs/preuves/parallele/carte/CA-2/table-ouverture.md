# CA-2 — le composant de carte et la vue « carte » de la recherche · TABLE D'OUVERTURE

Session parallèle « CARTE », branche `par-carte`. SHA de départ du lot : `ab0a14e` (CA-1 poussé).
Lot de CODE (il comptera à l'intégration). Aucun fichier d'autorité, aucun numéro D, aucun rang, aucune migration.
UNE dépendance neuve : `leaflet` (R-1), et ses types `@types/leaflet` en développement (TypeScript strict).

## Fichiers du lot (chemins COMPLETS)

### Dépendance
| chemin | nature |
|---|---|
| `packages/ui/package.json` | `leaflet` (dependencies), `@types/leaflet` (devDependencies) |
| `pnpm-lock.yaml` | conséquence de l'ajout — fichier PARTAGÉ (fusion : à régénérer si une autre session y touche) |

### `@zwadj/ui` — le cadre partagé (client aujourd'hui, pro au lot CA-5)
| chemin | nature |
|---|---|
| `packages/ui/src/map/map-tiles.ts` | NEUF — module pur : quel fond de carte (R-2), centre par défaut, précision d'une coordonnée |
| `packages/ui/src/map/leaflet-canvas.tsx` | NEUF — le SEUL fichier qui importe Leaflet |
| `packages/ui/src/map/venue-map.tsx` | NEUF — le cadre : charge le canevas par `import()`, mention d'attribution |
| `packages/ui/src/index.ts` | exports neufs (lignes ajoutées en fin de fichier) |
| `packages/ui/styles.css` | BLOC NEUF en fin de fichier (`.zw-map*`) |

### Catalogues
| chemin | nature |
|---|---|
| `packages/i18n/messages/fr.json` | BLOC NEUF `map`, dernière clé du catalogue — fichier PARTAGÉ |
| `packages/i18n/messages/ar.json` | idem |

### Client
| chemin | nature |
|---|---|
| `apps/client/src/lib/api.ts` | BLOC NEUF en fin de fichier : `getVenueMap`, `VenueMapOutcome` |
| `apps/client/src/lib/api.test.ts` | tests neufs |
| `apps/client/src/lib/map-tiles-env.ts` | NEUF — lit les variables d'environnement du client |
| `apps/client/src/lib/search-query.ts` | `toMapQuery` (neuve) |
| `apps/client/src/lib/search-query.test.ts` | tests neufs |
| `apps/client/src/lib/leaflet-import-guard.test.ts` | NEUF — garde de source |
| `apps/client/src/components/ui-map-tiles.test.ts` | NEUF — tests du module pur de `@zwadj/ui` (qui n'a pas de lanceur) |
| `apps/client/src/components/map/venue-points-map.tsx` | NEUF |
| `apps/client/src/components/map/venue-points-map.test.tsx` | NEUF |
| `apps/client/src/components/map/venue-map-loader.tsx` | NEUF |
| `apps/client/src/components/map/venue-map-loader.test.tsx` | NEUF |
| `apps/client/src/components/map/map-test-support.tsx` | NEUF — doubles de test |
| `apps/client/src/components/search/search-view.tsx` | la vue « carte » monte la vraie carte ; commentaire de tête réécrit |
| `apps/client/src/components/search/search-view.test.tsx` | les tests de la bascule suivent |
| `apps/client/src/app/theme.css` | BLOC NEUF en fin de fichier — fichier PARTAGÉ |
| `apps/client/.env.example` | NOMS des trois variables du fond de carte, sans valeur |
| `neutralisation/neutralize-ca2.py` | NEUF — harnais du lot |

### Pièces
| chemin | nature |
|---|---|
| `docs/preuves/parallele/carte/CA-2/table-ouverture.md` | cette table (premier commit, SEULE) |
| `docs/preuves/parallele/carte/CA-2/rouges/rouges.md` | lecture des rouges, empreintes |
| `docs/preuves/parallele/carte/CA-2/rouges/client-vitest.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-2/poids/build-avant.txt` | `next build` avant le lot (table des routes) |
| `docs/preuves/parallele/carte/CA-2/poids/build-apres.txt` | `next build` après |
| `docs/preuves/parallele/carte/CA-2/poids/poids.md` | la mesure du poids (R-1) |
| `docs/preuves/parallele/carte/CA-2/neutralisation/neutralize-ca2.txt` | sortie du harnais |
| `docs/preuves/parallele/carte/CA-2/campagnes/lancer-campagnes.txt` | sortie du tri |
| `docs/preuves/parallele/carte/CA-2/portes/portes.md` | portes, chiffres, état machine |
| `docs/preuves/parallele/carte/CA-2/portes/_index.txt` | codes et durées |
| `docs/preuves/parallele/carte/CA-2/portes/typecheck.txt` | sortie |
| `docs/preuves/parallele/carte/CA-2/portes/lint.txt` | sortie |
| `docs/preuves/parallele/carte/CA-2/portes/test.txt` | sortie |
| `docs/preuves/parallele/carte/CA-2/portes/build.txt` | sortie |
| `docs/preuves/parallele/carte/CA-2/portes/test-int.txt` | sortie |
| `docs/preuves/parallele/carte/CA-2/audit-secrets-ca2.txt` | audit scellé |
| `docs/preuves/parallele/carte/a-reporter-au-backlog.md` | fichier de SESSION, ouvert par ce lot, complété par les suivants |
| `docs/preuves/parallele/carte/arabe-a-relire.md` | fichier de SESSION : chaque clé arabe neuve, à relire par un humain |

### CONDITIONNELS
| chemin | condition |
|---|---|
| `docs/preuves/parallele/carte/CA-2/arret.md` | seulement si le lot s'ARRÊTE |
| `docs/preuves/parallele/carte/CA-2/tri-audit-ca2.txt` | seulement si l'audit rend une alerte absente de l'audit précédent |
| tout `neutralisation/neutralize-*.py` EXISTANT dont une ancre vise `search-view.tsx`, `search-query.ts` ou `api.ts` | seulement si `lancer-campagnes.py` montre que ce lot a périmé son ancre — ajouté alors par une EXTENSION nommant le fichier, avant son commit |

## Ce que cette table ne déclare pas
L'accueil (CA-3), la fiche (CA-4), le pro (CA-5), la spec e2e (CA-6). `test:e2e` n'est pas une porte de ce lot : la vraie carte
est mesurée dans un navigateur au lot CA-6.

## Extensions
(aucune à l'ouverture)
