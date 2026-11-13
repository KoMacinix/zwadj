# CA-4 — la position de la salle sur sa fiche · TABLE D'OUVERTURE

Session parallèle « CARTE », branche `par-carte`. SHA de départ du lot : `7eecdfa` (CA-3 poussé).
Lot de CODE (il comptera à l'intégration). Aucun fichier d'autorité, aucune migration, aucune dépendance neuve, AUCUNE clé de
catalogue (les trois clés `map.venue.*` sont entrées avec CA-3 : voir sa table).

## Fichiers du lot (chemins COMPLETS)
| chemin | nature |
|---|---|
| `apps/client/src/components/venue/venue-location-map.tsx` | NEUF — la carte de la fiche, montée au geste (R-9, R-7) |
| `apps/client/src/components/venue/venue-location-map.test.tsx` | NEUF |
| `apps/client/src/components/venue/venue-detail-view.tsx` | sous l'adresse : la carte SI la salle a ses deux coordonnées ; sinon rien |
| `apps/client/src/components/venue/venue-detail-view.test.tsx` | tests neufs |
| `apps/client/src/app/theme.css` | BLOC NEUF en fin de fichier (`.venue-location-*`) — fichier PARTAGÉ |
| `neutralisation/neutralize-ca4.py` | NEUF — harnais du lot |

### Pièces
| chemin | nature |
|---|---|
| `docs/preuves/parallele/carte/CA-4/table-ouverture.md` | cette table (premier commit, SEULE) |
| `docs/preuves/parallele/carte/CA-4/rouges/rouges.md` | lecture des rouges, empreintes |
| `docs/preuves/parallele/carte/CA-4/rouges/client-vitest.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-4/neutralisation/neutralize-ca4.txt` | sortie du harnais |
| `docs/preuves/parallele/carte/CA-4/campagnes/lancer-campagnes.txt` | sortie du tri |
| `docs/preuves/parallele/carte/CA-4/portes/portes.md` | portes, chiffres |
| `docs/preuves/parallele/carte/CA-4/portes/_index.txt` | codes et durées |
| `docs/preuves/parallele/carte/CA-4/portes/typecheck.txt` | sortie |
| `docs/preuves/parallele/carte/CA-4/portes/lint.txt` | sortie |
| `docs/preuves/parallele/carte/CA-4/portes/test.txt` | sortie |
| `docs/preuves/parallele/carte/CA-4/portes/build.txt` | sortie |
| `docs/preuves/parallele/carte/CA-4/portes/test-int.txt` | sortie |
| `docs/preuves/parallele/carte/CA-4/audit-secrets-ca4.txt` | audit scellé |

### CONDITIONNELS
| chemin | condition |
|---|---|
| `docs/preuves/parallele/carte/CA-4/arret.md` | seulement si le lot s'ARRÊTE |
| `docs/preuves/parallele/carte/CA-4/tri-audit-ca4.txt` | seulement si l'audit rend une alerte absente de l'audit précédent |
| `docs/preuves/parallele/carte/a-reporter-au-backlog.md` | seulement si le lot trouve quelque chose à reporter |
| un `neutralisation/neutralize-*.py` EXISTANT dont une ancre vise `venue-detail-view.tsx` | seulement si le tri montre que ce lot a périmé son ancre — par une EXTENSION |

## Extensions
(aucune à l'ouverture)
