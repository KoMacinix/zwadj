# D348 — M-1 : le chemin réel d'une salle, de l'écran du pro au site client

Mesure jouée par `e2e/specs/r50-salle-publiee.e2e.ts` (describe « R50 · M-1 »), dans un vrai navigateur (Chromium), contre les serveurs de DÉVELOPPEMENT de l'e2e (API `nest start`, client `next dev`, pro `vite`) et la base jetable `zwadj_e2e`. Code d'application : celui de `26ad5c7`, **inchangé** à cette mesure. Sortie versée : `rouges/rouge-1-e2e-r50-contre-etat-avant.txt` (tests 2 à 8) ; le même chemin, rejoué trois fois de suite pendant l'écriture de la spec, a rendu 7 verts sur 7.

La salle de la mesure : créée PAR L'ÉCRAN du pro (nom français et arabe, commune choisie, 777 places, 90 500 DA), un équipement et un style cochés à l'écran, un créneau « Soirée » créé à l'écran, une photo 800 × 600 envoyée à l'écran ; puis publiée par un compte ADMIN (élévation par la base, comme r37) par `POST /admin/venues/:id/publish`.

| # | étape | résultat | pièce |
|---|---|---|---|
| 1 | le pro crée la salle par les sept étapes de l'assistant ; chaque enregistrement répond (201) | **vu** | test 2 |
| 2 | AVANT la publication, la recherche (sans cache) ne montre pas la salle | **vu** (0 carte) | test 2 |
| 3 | l'admin publie : 200 | **vu** | test 2 |
| 4 | FR — l'accueil montre la salle ; aucun bandeau « données de démonstration » | **vu** | test 3 · `pieces/apres-fr-accueil.png` (à venir, voir note) |
| 5 | FR — `/salles` sans filtre : la salle, pas de bandeau | **vu** | test 4 · `pieces/apres-fr-salles.png` |
| 6 | FR — chaque filtre qui lui correspond : **ville, invités, budget, équipement, style, date** — la carte est là ; et la même demande réglée pour l'exclure ne la montre pas (jumeaux négatifs : ville, invités[^1], budget, équipement, style) | **vu**, 6 positifs et 5 négatifs | test 4 |
| 7 | FR — la date ne grise pas la salle (libre ce jour-là) ; tous les filtres ensemble | **vu** | test 4 |
| 8 | FR — la fiche s'ouvre depuis la carte (URL `/fr/salles/<slug>`), titre = nom français, photo chargée (largeur naturelle > 0), page de gauche à droite | **vu** | test 5 |
| 9 | AR — l'accueil, `/salles` (sans filtre, six filtres, jumeaux), la fiche : mêmes verdicts, avec le nom arabe, `dir="rtl"` | **vu** (3 tests) | tests 6, 7, 8 · `pieces/apres-ar-salles.png` |

[^1]: Dans M-1 le jumeau négatif de « invités » est `maxCapacity=100` (la salle a 777 places, et l'URL plafonne `guests` à 500 : aucun `guests` ne l'exclut). Le jumeau réel de `guests` (300 places contre 450 invités) est joué dans M-2.

## L'état d'AVANT : les salles fictives

Mesuré spec jouée SEULE sur une base neuve, catalogue VIDE (script jetable, non commité ; captures `pieces/avant-*.png`) : accueil et `/salles`, en français et en arabe — **6 cartes fictives et le bandeau « Données de démonstration »** (`bandeau-fictif=1`, `cartes=6`, quatre pages sur quatre). Après la publication : `bandeau-fictif=0`, des cartes réelles seulement. **Ce passage de l'un à l'autre n'est pas affirmé dans la suite complète** (le catalogue n'y est pas vide : deux travailleurs publient des salles en parallèle) ; la suite affirme l'état d'APRÈS (carte réelle présente, bandeau absent, sur l'accueil, sur `/salles` et sous chaque filtre).

## Ce que M-1 n'a pas mesuré
- Le rendu visuel au-delà des deux captures (c'est un geste de Ko).
- L'accueil sur un catalogue de plus de six salles plus récentes ET plus chères : la salle de la mesure est la plus récente et la moins chère (90 500 DA, les autres specs créent à partir de 100 000 DA) ; si une autre spec en créait une moins chère, le test pourrait échouer SANS défaut de l'application — à lire, jamais à relancer sans lire.
- Les photos multiples, l'ordre des photos, la visite virtuelle.
- Les prestations (étape 5 sautée).
