# CA-3 — la carte de l'accueil · TABLE D'OUVERTURE

Session parallèle « CARTE », branche `par-carte`. SHA de départ du lot : `a86ad43` (CA-2 poussé).
Lot de CODE (il comptera à l'intégration). Aucun fichier d'autorité, aucune migration, aucune dépendance neuve.

## Fichiers du lot (chemins COMPLETS)
| chemin | nature |
|---|---|
| `apps/client/src/components/map/near-viewport-map.tsx` | NEUF — la carte qui se monte quand sa section approche de l'écran (R-9) |
| `apps/client/src/components/map/near-viewport-map.test.tsx` | NEUF |
| `apps/client/src/components/home-view.tsx` | la section `hm-map` : la vraie carte et un lien vers la recherche, à la place du cartouche |
| `apps/client/src/app/[locale]/page.test.tsx` | le test « carte à venir » devient « la carte n'est pas montée au chargement, le lien est là » |
| `apps/client/src/app/theme.css` | BLOC NEUF en fin de fichier (`.hm-map-frame`, lien) — fichier PARTAGÉ |
| `packages/i18n/messages/fr.json` | bloc `map` : 11 clés — ⚠ celles de CA-3 (3) ET, par avance, celles de CA-4 (3) et de CA-5 (5) |
| `packages/i18n/messages/ar.json` | idem |
| `neutralisation/neutralize-ca3.py` | NEUF — harnais du lot |

⚠ POURQUOI LES CLÉS DE CA-4 ET CA-5 ENTRENT ICI : les catalogues sont partagés avec deux autres sessions, et chaque lot qui
les touche fait rejouer par `lancer-campagnes.py` trois campagnes existantes qui les lisent (`r33`, `r38`, `r39` : ≈ 190
cibles, mesuré à CA-2). Les poser en UNE fois ne touche ces fichiers qu'une fois de plus. Tant que CA-4 et CA-5 ne sont pas
faits, ces 8 clés ne sont lues par aucun écran ; si l'un de ces lots s'ARRÊTE, ses clés restent orphelines et le BILAN le dit.

### Pièces
| chemin | nature |
|---|---|
| `docs/preuves/parallele/carte/CA-3/table-ouverture.md` | cette table (premier commit, SEULE) |
| `docs/preuves/parallele/carte/CA-3/rouges/rouges.md` | lecture des rouges, empreintes |
| `docs/preuves/parallele/carte/CA-3/rouges/client-vitest.txt` | sortie rouge |
| `docs/preuves/parallele/carte/CA-3/neutralisation/neutralize-ca3.txt` | sortie du harnais |
| `docs/preuves/parallele/carte/CA-3/campagnes/lancer-campagnes.txt` | sortie du tri |
| `docs/preuves/parallele/carte/CA-3/portes/portes.md` | portes, chiffres |
| `docs/preuves/parallele/carte/CA-3/portes/_index.txt` | codes et durées |
| `docs/preuves/parallele/carte/CA-3/portes/typecheck.txt` | sortie |
| `docs/preuves/parallele/carte/CA-3/portes/lint.txt` | sortie |
| `docs/preuves/parallele/carte/CA-3/portes/test.txt` | sortie |
| `docs/preuves/parallele/carte/CA-3/portes/build.txt` | sortie |
| `docs/preuves/parallele/carte/CA-3/portes/test-int.txt` | sortie |
| `docs/preuves/parallele/carte/CA-3/audit-secrets-ca3.txt` | audit scellé |
| `docs/preuves/parallele/carte/a-reporter-au-backlog.md` | fichier de session, complété |
| `docs/preuves/parallele/carte/arabe-a-relire.md` | fichier de session, complété (11 clés) |

### CONDITIONNELS
| chemin | condition |
|---|---|
| `docs/preuves/parallele/carte/CA-3/arret.md` | seulement si le lot s'ARRÊTE |
| `docs/preuves/parallele/carte/CA-3/tri-audit-ca3.txt` | seulement si l'audit rend une alerte absente de l'audit précédent |
| un `neutralisation/neutralize-*.py` EXISTANT dont une ancre vise `home-view.tsx` | seulement si le tri montre que ce lot a périmé son ancre — par une EXTENSION, avant son commit |

## Extensions
(aucune à l'ouverture)
