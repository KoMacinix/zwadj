# CA-6 — la spec navigateur, les pannes, le fournisseur de tuiles, ce qui part vers le tiers · TABLE D'OUVERTURE

Session parallèle « CARTE », branche `par-carte`. SHA de départ du lot : `9ab5cf2` (CA-5 poussé).
Lot de CODE DE TEST, plus UNE réparation de code déjà connue à l'ouverture (il comptera à l'intégration). Aucun fichier
d'autorité, aucune migration, aucune dépendance neuve, aucune clé de catalogue.

⚠ CE QUI EST DÉJÀ SU À L'OUVERTURE (essai de fumée du 13/11/2026, spec provisoire non commitée, avant CA-3) : dans un vrai
navigateur, la touche Entrée sur un point de la carte N'OUVRE PAS la carte de la salle. Lu dans la source de Leaflet 1.9.4 :
il ne relie Entrée qu'à ses propres bulles (`_onKeyPress` → `_openPopup`), que la session n'emploie pas. Un point est annoncé
comme un bouton et ne répond pas au clavier : défaut d'accessibilité du lot CA-2, invisible aux tests de composant (ils
doublent le canevas). La spec le montre en ROUGE avant la réparation.

## Fichiers du lot (chemins COMPLETS)
| chemin | nature |
|---|---|
| `e2e/specs/ca6-carte.e2e.ts` | NEUF — la vraie carte dans un navigateur : recherche (FR, AR à 360 px), pannes (tuiles, route de points), accueil, fiche, pro |
| `packages/ui/src/map/leaflet-canvas.tsx` | RÉPARATION : un point répond à Entrée et à Espace |
| `neutralisation/neutralize-ca6.py` | NEUF — harnais du lot (cibles e2e) |

### Pièces
| chemin | nature |
|---|---|
| `docs/preuves/parallele/carte/CA-6/table-ouverture.md` | cette table (premier commit, SEULE) |
| `docs/preuves/parallele/carte/CA-6/rouges/rouges.md` | lecture des rouges, empreinte de la spec |
| `docs/preuves/parallele/carte/CA-6/rouges/e2e-ca6.txt` | sortie rouge (lignes `[WebServer]` retirées : elles portent des jetons d'e-mail) |
| `docs/preuves/parallele/carte/CA-6/neutralisation/neutralize-ca6.txt` | sortie du harnais |
| `docs/preuves/parallele/carte/CA-6/campagnes/lancer-campagnes.txt` | sortie du tri |
| `docs/preuves/parallele/carte/CA-6/portes/portes.md` | portes, chiffres |
| `docs/preuves/parallele/carte/CA-6/portes/_index.txt` | codes et durées |
| `docs/preuves/parallele/carte/CA-6/portes/typecheck.txt` | sortie |
| `docs/preuves/parallele/carte/CA-6/portes/lint.txt` | sortie |
| `docs/preuves/parallele/carte/CA-6/portes/test.txt` | sortie |
| `docs/preuves/parallele/carte/CA-6/portes/build.txt` | sortie |
| `docs/preuves/parallele/carte/CA-6/portes/test-int.txt` | sortie |
| `docs/preuves/parallele/carte/CA-6/portes/test-e2e-passe-1.txt` | la suite e2e ENTIÈRE, lignes `[WebServer]` retirées |
| `docs/preuves/parallele/carte/CA-6/portes/test-e2e-passe-2.txt` | seconde passe |
| `docs/preuves/parallele/carte/CA-6/audit-secrets-ca6.txt` | audit scellé |
| `docs/preuves/parallele/carte/ce-qui-part-vers-le-tiers.md` | pièce de SESSION (R-9) : pour la page de confidentialité et le juriste |
| `docs/preuves/parallele/carte/a-reporter-au-backlog.md` | complété : l'entrée « fournisseur de tuiles — BLOQUE le lancement » (R-2), les hors-session (R-8, R-10) |
| `docs/preuves/parallele/carte/BILAN.md` | le bilan de la session |
| `docs/preuves/parallele/carte/controle-fin.txt` | le contrôle de fin : premier commit de chaque lot, rouges avant code, diff ⊆ tables, local = distant |

### CONDITIONNELS
| chemin | condition |
|---|---|
| `docs/preuves/parallele/carte/CA-6/arret.md` | seulement si le lot s'ARRÊTE |
| `docs/preuves/parallele/carte/CA-6/tri-audit-ca6.txt` | seulement si l'audit rend une alerte absente de l'audit précédent |
| `docs/preuves/parallele/carte/CA-6/captures/*.png` | seulement si une capture de la carte est versée pour Ko (tuiles interceptées : fond gris) |
| un fichier de code des lots CA-2 à CA-5 (`packages/ui/src/map/*`, `packages/ui/styles.css`, `apps/client/src/components/map/*`, `apps/client/src/components/venue/venue-location-map.tsx`, `apps/pro/src/venues/venue-pin-map.tsx`, `apps/client/src/app/theme.css`, `apps/pro/src/theme.css`) et son test | seulement si le NAVIGATEUR montre un autre défaut — par une EXTENSION qui nomme le fichier et le défaut, avant son commit |
| `e2e/baselines/*` | seulement si la spec d'accessibilité existante (`b8`) exige de relever son gel — par une EXTENSION |

## Extensions
### Extension 1 — 14/11/2026, AVANT le commit des fichiers qu'elle couvre
Le navigateur a montré un second défaut (voir `rouges/rouges.md`, ligne « accueil ») : sur une page d'accueil courte, la
carte se monte à l'OUVERTURE de la page, sans défilement. Fichiers ajoutés au lot :
| chemin | nature |
|---|---|
| `apps/client/src/components/map/near-viewport-map.tsx` | RÉPARATION : la carte ne se monte à l'approche qu'APRÈS un défilement du visiteur |
| `apps/client/src/components/map/near-viewport-map.test.tsx` | tests de la réparation |
| `neutralisation/neutralize-ca3.py` | ses cibles suivent le fichier réparé (ancres, et cibles neuves pour la garde du défilement) |
