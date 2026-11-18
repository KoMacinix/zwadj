# D351 — la passe D277 des DEUX SENS (compte rendu, 18/11/2026)

Règle (`AGENTS.md`, D277 et D287) : écrire la décision dans un fichier d'autorité ne suffit pas, il faut la porter PARTOUT où un autre fichier d'autorité la contredit — et, dans l'autre sens, chercher les **permissions** dont la condition vient de changer. Texte APLATI, jamais ligne à ligne (D294), recherche insensible à la casse, calibrage à deux bras avant toute lecture (motif connu > 0, motif fabriqué 0 : « les deux bras tiennent »). Instrument : `passe-d277/passe-d277.py` (même squelette que celui de D342, motifs propres à ce lot) ; sorties : `passe-d277/sortie-avant.txt` (jouée AVANT les écritures de clôture, avec la première écriture d'autorité déjà faite) et `passe-d277/sortie-apres.txt` (APRÈS). Trois fichiers aplatis parcourus : `ZWADJ_CONTINUITE.md`, `ZWADJ_BACKLOG.md`, `AGENTS.md`.

## Sens 1 — ce que le lot INVALIDE
| motif | avant → après | ce qui a été fait |
|---|---|---|
| « RANG 53 : EN ATTENTE DE CADRAGE DU RELECTEUR » | 5 → 7 | le pointeur de l'ordre des rangs est BARRÉ avec son motif (première écriture) ; l'en-tête de l'état de D350 et celui de l'état à l'ouverture de D351 sont BARRÉS avec leur motif ; la ligne de `AGENTS.md` (annotation de D350) est déclarée PÉRIMÉE par le bloc de D351 ; les occurrences restantes sont celles de MON texte, qui la nomme pour la dire périmée, et la ligne du registre de D350 (historique daté) |
| compteur POUR MÉMOIRE VINGT-SIX | 3 → 7 | les lignes d'état de D350 et d'ouverture de D351 sont dans des blocs BARRÉS ; `AGENTS.md` porte « VINGT-CINQ → VINGT-SIX » (pas la forme cherchée) : traité par le bloc de D351 (« VINGT-SIX → TRENTE-TROIS ») ; les autres sont mon texte |
| « `par-carte` s'intègre APRÈS » / « l'intégration de la branche `par-carte` » comme à venir | 8 → 8 | **inchangé, à raison** : ce sont les candidats des rangs 51, 52 et 53 écrits À LEUR DATE (ordre des rangs, section D350), dans des blocs datés ou barrés ; aucune n'est une affirmation courante |
| « S-192 … à ratifier » / « la ratification de S-192 à S-204 » | 7 → 12 | EN PLACE : l'invariant des écrans d'administration de `AGENTS.md` (« S-192, à ratifier » → annoté REFUSÉE) ; le titre du § 5 de la section D350 (annoté : S-193 à S-204 ratifiées, S-192 refusée) ; l'état de D350 (barré) ; l'annotation de D350 dans `AGENTS.md` (déclarée périmée par le bloc de D351) ; la ligne du registre de D350 (historique) ; le reste est mon texte |
| « la liste « Mes salles » … en attente » pour une salle refusée | 3 → 5 | les TROIS d'origine sont annotées EN PLACE (la section D350 § 4, l'entrée de backlog de D350, l'invariant d'`AGENTS.md`) : « Ko a répondu oui, elle doit dire « Refusée » » ; les deux nouvelles sont mon texte |
| « Carte interactive : reportée post-MVP, placeholder » (décision produit n° 2) | 2 → 3 | **annotée EN PLACE** : « LA CARTE EST RÉELLE », le fournisseur de production non choisi ; `a-reporter-au-backlog.md` le demandait (F-4 de la lecture adverse) ; les deux autres sont mon texte |
| « Carte à venir » / « Map placeholder » | 6 → 8 | les quatre lignes du backlog (« Maps: deferred from MVP », deux « Map placeholder », « Placeholder carte ») sont annotées EN PLACE ; la décision produit n° 2 aussi ; le reste est mon texte |
| « Maps: deferred from MVP » / « real interactive map (Leaflet + tile provider decision) » | 3 → 4 | annotées EN PLACE (la ligne d'hypothèse et la liste « Deferred to post-MVP ») : Leaflet est livré, le fournisseur de production reste à décider |
| « Map pin-drop + reverse geocoding during venue creation » | 1 → 2 | passée en `[~]` (partielle) et annotée : le pin-drop est livré, le géocodage inverse non |
| « Circuit breakers + timeouts on … maps calls » | 1 → 2 | annotée : sans objet côté serveur à ce jour |
| « index géo sur les coordonnées » | 2 → 3 | l'entrée « Add index on `Venue` coords + city » est annotée : aucun besoin mesuré, non fait |
| `search.map.title`, `search.map.soon`, `home.map.soon` (clés mortes) | 0 → 6 | **motif à zéro avant** (D295 : une hypothèse, pas une absence constatée) : la prémisse n'était écrite dans aucun fichier d'autorité ; elle l'est maintenant, par mon texte, avec « elles restent » |
| « PRÊT À INTÉGRER » / « réserve » de la branche | 1 → 7 | toutes mon texte : la réserve du BILAN est LEVÉE par la mesure (R-2) |
| « la carte n'a jamais été vue » | 0 → 1 | mon texte (entrée de backlog) |

## Sens 2 (D287) — les PERMISSIONS dont la condition change
| motif | avant → après | ce qui a été fait |
|---|---|---|
| « RANG 54 » et ouvrir / arbitrer / cadrer | 3 → 8 | toutes mon texte : « EN ATTENTE DE CADRAGE DU RELECTEUR », **pas arbitré**, la session ne le nomme pas |
| « L36-3a-2 » et ouvrir / coder / consigne / candidat | 10 → 10 | **inchangé** : L36-3a-2 (avec S-104) et L36-3b restent SANS RANG ; rien de ce lot ne les rend permis |
| « un lot de code PEUT s'ouvrir » / « cinq lots … tenables » | 46 → 46 | **inchangé** : la limite de cinq reste SUSPENDUE par Ko ; le compteur est tenu POUR MÉMOIRE (46 occurrences : un compte connu, des phrases datées par leur décision, comme à D342) |
| « branche `par-carte` » et supprimer | 1 → 1 | mon texte : la branche est GARDÉE (consigne, § 4), jamais supprimée dans cette session |
| « une retouche s'ajoute au rang 53 » (fr.json, ar.json et `par-carte`) | 1 → 2 | l'entrée de D350 est annotée EN PLACE : le rang 53 n'a retouché AUCUNE des six clés `publicationReview` (la fusion ajoute le bloc `map`) |
| « un lot par session » et exception | 4 → 4 | **inchangé** : l'exception de la session cloud a été CONSOMMÉE à D343 ; ce lot n'en crée aucune |
| « L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » | 2 → 2 | **inchangé** : la délégation du 02/11/2026 (annotée en place par D340) tient ; « RANG 54 : EN ATTENTE DE CADRAGE DU RELECTEUR » est la forme écrite |
| « fournisseur » des tuiles / « BLOQUE le lancement » | 0 → 2 | **motif à zéro avant** : aucune permission ni interdiction à périmer ; mon texte écrit que la décision de Ko reste ouverte et BLOQUE le lancement |

## Motifs à zéro, et motif au compte haut (D295)
À zéro AVANT : « clés mortes » (sens 1), « la carte n'a jamais été vue » (sens 1), « fournisseur / BLOQUE le lancement » (sens 2) — des affirmations que ce lot ÉCRIT pour la première fois, pas des absences constatées de phrases périmées ; chacun est à > 0 APRÈS. Au compte haut : le motif « un lot de code PEUT s'ouvrir » (46, avant comme après) — un compte connu des passes précédentes.
**Une passe partielle se lit exactement comme une passe faite** (D200) : celle-ci a lu les 14 motifs du sens 1 et les 8 du sens 2 dans les trois fichiers, avant et après ; elle ne peut pas voir une phrase périmée qu'aucun de ses motifs ne vise — c'est sa limite, écrite.
