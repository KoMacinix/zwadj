# D346 — les gestes de Ko : l'assistant de recherche, ses choix visibles partout (rang 48)

Ce que les portes ne regardent pas : ce qu'un œil humain voit. À jouer sur le site client en développement (base de développement ; **aucune écriture** : tout est lecture). Chaque geste dit **ce qui doit se voir**. En cas d'écart, noter l'étape et la langue.

**Avant** : ouvrir `http://localhost:3000/fr` (ou le port du client de développement).

## Geste 1 — l'assistant, en français, jusqu'au bout
1. Cliquer le lien de l'assistant de l'accueil (« Li hwas lqa » / le libellé du catalogue).
2. Répondre : une **commune** → « Continuer » ; **250 invités** → « Continuer » ; un **palier de budget** ; au moins **une puce de goût** (style ou équipement) ; « Voir les salles ».
3. Regarder le **panneau « Filtres »** de la page de résultats (à gauche sur ordinateur). **Doit se voir** : la commune choisie dans la liste ; la poignée basse de la capacité sur 250 (libellé « 250 invités ») ; la poignée haute du budget sur le palier choisi ; les cases des goûts choisis **cochées**.

## Geste 2 — revenir en arrière avec le bouton retour du navigateur
1. Depuis la page de résultats, appuyer sur **retour** du navigateur. L'assistant se rouvre à l'étape des goûts : **doit se voir** les puces choisies **enfoncées**.
2. Retour encore : l'étape du budget (le palier enfoncé), puis les invités (le champ rempli), puis la commune (la liste sur la commune choisie). **À chaque pas**, le panneau « Filtres » dessous suit l'adresse (ce qui n'est pas encore répondu à cette étape est vide).

## Geste 3 — « Recommencer » depuis un état plein
1. Rouvrir l'assistant avec tout rempli (retour du navigateur depuis la page de résultats), puis cliquer **« Recommencer »**.
2. **Doit se voir** : l'assistant revient à la commune, **vide** ; le panneau « Filtres » dessous est **entièrement vide** (« Toutes les communes », capacité et budget en butée, aucune case cochée).

## Geste 4 — l'arabe
Rejouer les gestes 1 à 3 depuis `/ar`. **Doit se voir** : les mêmes valeurs ; les poignées des curseurs et leurs libellés dans le sens de la lecture arabe (de droite à gauche) ; le bouton « إعادة البدء ».

## Geste 5 — une saisie non soumise survit à un changement de page
1. Sur `/fr/salles` (sans assistant), cocher une case d'équipement dans le panneau « Filtres » **sans** cliquer « Afficher les résultats ».
2. Si la liste a plusieurs pages, cliquer « page 2 ». **Doit se voir** : la case **reste cochée** (changer de page ne touche aucun filtre). *(Si une seule page : geste sans objet, le dire.)*

## À noter
- Le geste « Précédent » de la consigne n'existe pas : l'assistant n'a pas de bouton « Précédent » (on revisite par la liste d'étapes, le récapitulatif ou le retour du navigateur). Si vous en voulez un, c'est une décision produit (entrée de backlog).
- La mesure automatisée de ces gestes : `rouges/rouge-2-navigateur.txt` (avant) et `e2e/passe-1.txt`, `e2e/passe-2.txt` (après).
