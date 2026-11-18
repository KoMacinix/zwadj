# D351 — les gestes de Ko, pas à pas (rang 53, la carte)

**Ce document est une liste de gestes à faire par Ko, pas des gestes faits.** Aucune session de code n'a touché votre base de développement pour ce lot (règle de D337, R-9 de la consigne) : tout ce qui a été mesuré l'a été sur des bases jetables (`zwadj_test` pour l'intégration, `zwadj_e2e` pour le navigateur automatique), avec **des tuiles interceptées** (la spec ne parle jamais au vrai fournisseur). Ce qu'il reste à regarder avec vos yeux, c'est **la carte avec son vrai fond** : personne ne l'a encore vue ainsi (BILAN de la branche, § 3). Les mots en gras sont ceux que vous verrez à l'écran.

## Avant de commencer

1. **`pnpm install` est déjà fait sur ce poste** pour ce lot (la dépendance neuve est Leaflet). Si vous travaillez sur un autre poste : `pnpm install` d'abord.
2. **Aucune migration** n'est nécessaire (le lot ne touche rien sous `apps/api/prisma`).
3. Lancez l'application comme d'habitude : `pnpm dev` (API sur 3001, site client sur 3000, application Pro sur 5173). **En développement, le fond de carte est celui d'OpenStreetMap, sans aucune variable à poser** ; en production, tant que le fournisseur n'est pas choisi, toutes les cartes disent **Carte indisponible** (décision de Ko, ouverte, qui bloque le lancement).
4. ⚠ **Vos salles de développement n'ont probablement AUCUNE coordonnée** (le semis donne des coordonnées aux villes, pas aux salles). Sans point, la recherche dit **Aucune salle de cette recherche n'a encore de position sur la carte.** Posez donc d'abord un point (geste 6) sur une salle **publiée** (publier une salle est le geste 1 de `docs/preuves/D350/scenarios-ko.md`).

## Geste 1 — la recherche (`/fr/salles`)

1. Ouvrez `http://localhost:3000/fr/salles` : vous voyez la **grille** des salles, comme avant.
2. Cliquez sur la bascule **Carte** : la carte s'affiche **avec son fond**, **un point par salle située**, et deux phrases au-dessus : **Salles sur la carte : N** et **Salles sans position, visibles dans la liste : M**.
3. Cliquez sur un point : une carte de salle s'ouvre **sous** la carte (**Salle choisie sur la carte**, le nom, la capacité, le prix) avec **Voir la salle** et **Fermer**. **Voir la salle** mène à la fiche.
4. Appliquez un filtre (ville, budget, capacité…), puis rebasculez sur **Carte** : les points suivent le filtre. (La vue « carte » n'est pas dans l'adresse : un lien partagé ouvre toujours la grille, c'est voulu — décision n° 4 du BILAN.)

## Geste 2 — le clavier

Sur la carte, touche **Tab** jusqu'à un point, puis **Entrée** (ou **Espace**) : la même carte de salle s'ouvre. Les boutons **Zoomer** et **Dézoomer** se prennent au clavier. (La molette ne zoome pas la carte : c'est voulu, elle fait défiler la page.)

## Geste 3 — l'arabe, sur un téléphone

Ouvrez `http://localhost:3000/ar/salles`, réduisez la fenêtre à **360 px de large**, bascule **خريطة** : **rien ne déborde**, et les boutons de zoom sont **à gauche** (la page est de droite à gauche). Lisez les phrases arabes : elles sont **à relire par un humain** (`docs/preuves/parallele/carte/arabe-a-relire.md`, 29 clés ; les comptes sont écrits « libellé : nombre » pour ne pas accorder le nom au nombre).

## Geste 4 — l'accueil (`/fr`)

Ouvrez `http://localhost:3000/fr` **sans défiler** : **pas de carte**, une phrase (**La carte des salles s'affiche ici quand vous arrivez à cette section.**) et un bouton **Afficher la carte**. Descendez : la carte arrive seule. Le titre de la section reste **Carte des salles · Alger** (décision n° 20 du BILAN, ratifiée telle quelle — c'est votre texte, vous pouvez le changer).

## Geste 5 — la fiche d'une salle

Ouvrez la fiche d'une salle **qui a des coordonnées** : sous l'adresse, **Voir sur la carte** et la phrase **La carte est fournie par un service externe : elle ne se charge que si vous la demandez.** Un clic montre son point. Une salle **sans coordonnées** : rien de plus que l'adresse, aucun bouton.

## Geste 6 — le pro pose le point de sa salle (application Pro, `http://localhost:5173`)

1. **Ma salle**, étape du lieu : **Placer la salle sur la carte**. La carte s'ouvre (et **Masquer la carte** la ferme).
2. **Cliquez sur la carte** : la **latitude** et la **longitude** se remplissent ensemble (six décimales au plus). **Faites glisser le point** : elles changent. (Seul le clic est joué dans l'e2e ; **le glissement n'a jamais été joué dans un navigateur** — c'est ce geste qui le fait.)
3. **Enregistrez**, puis vérifiez le point sur la **fiche publique** (geste 5). Au clavier, le pro saisit latitude et longitude dans les deux champs, comme avant : le point ne se pose pas au clavier (décision n° 17).

## Geste 7 — regarder le fond de carte

La seule chose que la session n'a pas pu voir : **le fond est-il lisible**, et **les points tombent-ils au bon endroit** (une salle d'Hydra doit être à Hydra) ? Dans le thème sombre la carte reste **en clair** (les tuiles sont des images du fournisseur).

## Ce qui reste à votre charge

- ⛔ **Le fournisseur du fond de carte de production** : une décision de Ko, **ouverte, qui bloque le lancement** (`a-reporter-au-backlog.md` de la branche, copié au backlog). Les trois options (tuiles publiques d'OpenStreetMap ; un fournisseur avec clé ; des tuiles hébergées par Zwadj) n'ont **aucun coût relevé** : la session cloud n'a pas pu lire les conditions d'usage.
- ⛔ **`docs/preuves/parallele/carte/ce-qui-part-vers-le-tiers.md` à faire relire par un juriste** (ce que le navigateur envoie au fournisseur : l'adresse IP et la zone regardée) — **bloque le lancement**.
- Les **29 clés arabes** du bloc `map` : à relire par un humain.
- Si vous ne l'avez pas fait : **les gestes de D350** (`docs/preuves/D350/scenarios-ko.md` : le premier compte administrateur, publier, rejeter, corriger un motif, lire le refus côté pro en français et en arabe, rejeter et approuver une suppression).
- Tout ce qui est écrit « limite connue » dans la section D351 de `ZWADJ_CONTINUITE.md`.
