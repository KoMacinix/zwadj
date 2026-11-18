# CA-5 — le point posé par le pro · TABLE D'OUVERTURE

Session parallèle « CARTE », branche `par-carte`. SHA de départ du lot : `e22c7e5` (CA-4 poussé).
Lot de CODE (il comptera à l'intégration). Aucun fichier d'autorité, aucune migration, aucune dépendance neuve (`leaflet` est
déjà celle de `@zwadj/ui`), AUCUNE clé de catalogue (les cinq clés `map.pin.*` sont entrées avec CA-3 : voir sa table).
⚠ FRONTIÈRE : `apps/pro/src/venues/venue-wizard.tsx` n'est PAS touché (fichier d'une autre session). Les champs du lieu vivent
dans `PlaceFields` (`venue-form.tsx`), que l'assistant et la page d'édition importent : la carte y entre sans toucher l'un ni l'autre.
Hors lot (R-8) : l'adresse déduite du point (« géocodage inverse »).

## Fichiers du lot (chemins COMPLETS)
| chemin | nature |
|---|---|
| `apps/pro/src/lib/map-tiles-env.ts` | NEUF — lit les variables d'environnement Vite du fond de carte |
| `apps/pro/src/venues/venue-pin-map.tsx` | NEUF — la carte où l'on pose le point, ouverte au geste |
| `apps/pro/src/venues/venue-pin-map.test.tsx` | NEUF |
| `apps/pro/src/venues/venue-form.tsx` | `PlaceFields` pose la carte sous les deux champs ; `pinOfFields` (neuve, exportée) |
| `apps/pro/src/venues/place-fields-map.test.tsx` | NEUF — le formulaire et la carte |
| `apps/pro/src/theme.css` | BLOC NEUF en fin de fichier (`.venue-pin-map`) |
| `apps/pro/.env.example` | NOMS des trois variables du fond de carte, sans valeur |
| `neutralisation/neutralize-ca5.py` | NEUF — harnais du lot |

### Pièces
| chemin | nature |
|---|---|
| `docs/preuves/parallele/carte/CA-5/table-ouverture.md` | cette table (premier commit, SEULE) |
| `docs/preuves/parallele/carte/CA-5/rouges/rouges.md` | lecture des rouges, empreintes |
| `docs/preuves/parallele/carte/CA-5/rouges/pro-vitest.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-5/poids/build-pro.txt` | `vite build` après le lot (les morceaux) |
| `docs/preuves/parallele/carte/CA-5/neutralisation/neutralize-ca5.txt` | sortie du harnais |
| `docs/preuves/parallele/carte/CA-5/campagnes/lancer-campagnes.txt` | sortie du tri |
| `docs/preuves/parallele/carte/CA-5/portes/portes.md` | portes, chiffres |
| `docs/preuves/parallele/carte/CA-5/portes/_index.txt` | codes et durées |
| `docs/preuves/parallele/carte/CA-5/portes/typecheck.txt` | sortie |
| `docs/preuves/parallele/carte/CA-5/portes/lint.txt` | sortie |
| `docs/preuves/parallele/carte/CA-5/portes/test.txt` | sortie |
| `docs/preuves/parallele/carte/CA-5/portes/build.txt` | sortie |
| `docs/preuves/parallele/carte/CA-5/portes/test-int.txt` | sortie |
| `docs/preuves/parallele/carte/CA-5/audit-secrets-ca5.txt` | audit scellé |

### CONDITIONNELS
| chemin | condition |
|---|---|
| `docs/preuves/parallele/carte/CA-5/arret.md` | seulement si le lot s'ARRÊTE |
| `docs/preuves/parallele/carte/CA-5/tri-audit-ca5.txt` | seulement si l'audit rend une alerte absente de l'audit précédent |
| `docs/preuves/parallele/carte/a-reporter-au-backlog.md` | seulement si le lot trouve quelque chose à reporter |
| `apps/pro/src/test-setup.ts` | seulement si la garde des sorties console du pro exige d'y inscrire un plafond pour un fichier neuf (elle ne devrait pas : un fichier neuf n'a droit à aucun bruit) |
| un `neutralisation/neutralize-*.py` EXISTANT dont une ancre vise `venue-form.tsx` | seulement si le tri montre que ce lot a périmé son ancre — par une EXTENSION |

## Extensions
(aucune à l'ouverture)
