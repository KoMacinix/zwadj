# CE QUI PART VERS LE FOURNISSEUR DU FOND DE CARTE — pièce pour la page de confidentialité et pour le juriste

Session « carte », 13/11/2026. Écrit à partir du CODE de la session (fichiers cités) et de ce que la spec navigateur mesure
(`e2e/specs/ca6-carte.e2e.ts`). Ce n'est pas un avis juridique : c'est le relevé de ce que le site fait.

## En une phrase, pour Ko
Quand un visiteur AFFICHE une carte, son navigateur télécharge les images du fond de carte directement chez le fournisseur
de tuiles ; ce fournisseur voit donc l'adresse IP du visiteur et la zone qu'il regarde. Tant qu'aucune carte n'est affichée,
rien ne part.

## Qui est « le tiers »
Le serveur dont l'adresse est dans la variable `NEXT_PUBLIC_MAP_TILES_URL` (site client) et `VITE_MAP_TILES_URL` (app Pro).
- En DÉVELOPPEMENT, sans variable : `tile.openstreetmap.org` (seul endroit où cette adresse est écrite :
  `packages/ui/src/map/map-tiles.ts`, `DEV_MAP_TILES`).
- En PRODUCTION : celui que Ko choisira. Tant que la variable n'est pas posée, AUCUNE carte ne s'affiche (« carte
  indisponible ») et rien ne part vers personne. Le choix est une entrée « BLOQUE le lancement » de
  `a-reporter-au-backlog.md`.
⚠ La réponse exacte à « à qui les données partent » dépend donc d'une décision qui n'est pas prise.

## Ce que le navigateur envoie au tiers, pour chaque image de fond demandée
Ce sont des requêtes HTTP GET d'images, émises par le navigateur du visiteur (pas par les serveurs de Zwadj) :
| donnée | pourquoi elle part | peut-on l'empêcher |
|---|---|---|
| l'adresse IP du visiteur | toute requête HTTP la porte | non, sauf à servir les tuiles depuis un serveur de Zwadj |
| l'adresse de l'image : niveau de zoom et numéros de colonne et de ligne (`{z}/{x}/{y}`) | c'est ce qui désigne le morceau de carte | non — elle dit quelle ZONE est regardée, à la précision de la tuile |
| l'en-tête `User-Agent` (navigateur, système) | envoyé par le navigateur à tout serveur | non |
| l'en-tête `Referer` | envoyé par le navigateur selon sa politique ; par défaut, pour un autre site, seulement l'ORIGINE (`https://<le site>/`), pas l'adresse complète de la page | oui : une politique `no-referrer` — NON posée par cette session |
| la date et l'heure | toute requête | non |
| des cookies du tiers | seulement si le tiers en a déjà déposé dans ce navigateur ; le site Zwadj n'en dépose pas pour lui | dépend du navigateur |

## Ce qui ne part PAS vers le tiers
- Aucun identifiant de compte, aucun nom, e-mail ni téléphone : le visiteur n'a pas besoin d'être connecté, et la carte ne
  lit aucune donnée de session.
- Aucun filtre de recherche : les filtres vont à l'API de Zwadj (`GET /api/v1/venue-map`), pas au tiers. Le tiers ne voit
  que les morceaux de carte demandés.
- Les salles elles-mêmes (noms, prix, positions) : elles viennent de l'API de Zwadj et sont dessinées par le navigateur
  par-dessus le fond. Le tiers ne les reçoit pas.
- La position du visiteur : le site ne demande PAS la géolocalisation (« près de moi » est hors session, R-10).
- Rien n'est envoyé par les serveurs de Zwadj au tiers : l'API ne l'appelle jamais.

## QUAND cela part (décision R-9)
| écran | déclencheur | fichier |
|---|---|---|
| recherche `/salles` | le visiteur clique sur la bascule « Carte » | `apps/client/src/components/search/search-view.tsx` |
| fiche d'une salle | le visiteur clique sur « Voir sur la carte » (le service externe est annoncé à côté du bouton) | `apps/client/src/components/venue/venue-location-map.tsx` |
| accueil | le visiteur a FAIT DÉFILER la page ET la section « carte » est dans une marge de 400 px autour de l'écran ; ou clic sur « Afficher la carte ». Jamais à la seule ouverture de la page, même courte (réparé au lot CA-6) | `apps/client/src/components/map/near-viewport-map.tsx` |
| app Pro, formulaire de la salle | le pro clique sur « Placer la salle sur la carte » | `apps/pro/src/venues/venue-pin-map.tsx` |
Et dans tous les cas : seulement s'il y a au moins une salle à situer (une recherche sans aucune salle située ne charge pas
de fond de carte), et seulement si un fond de carte est configuré.
⚠ SUR L'ACCUEIL, IL N'Y A PAS DE CLIC : faire défiler jusqu'à la section suffit. C'est la décision R-9 telle qu'adoptée ; si le
juriste demande un consentement explicite avant tout appel à un tiers, c'est cet écran qu'il faudra changer (le bouton
existe déjà : il suffirait de retirer le déclenchement au défilement).

## Ce qui est chargé AVANT, et qui ne va pas au tiers
La bibliothèque de carte (Leaflet) et sa feuille de style sont servies par le site Zwadj lui-même (un morceau à part, chargé
au même moment que la carte). Aucun CDN.

## Ce qui a été MESURÉ dans un navigateur (`e2e/specs/ca6-carte.e2e.ts`, tuiles interceptées)
- Recherche, fiche, app Pro : AVANT le geste, zéro requête de tuile et aucune carte dans la page ; sur la recherche, zéro
  requête vers le morceau de la bibliothèque de carte non plus.
- Accueil : à l'ouverture, zéro requête de tuile, même quand la section est déjà proche de l'écran ; après défilement, la carte.
- Pendant toute la spec, AUCUNE requête n'est partie vers l'extérieur hors les tuiles (la spec coupe et compte tout le reste : zéro).
⚠ Mesuré sur les serveurs de DÉVELOPPEMENT, où le fond de carte est le défaut OpenStreetMap ; pas sur un build de production.

## Ce que cette pièce ne sait pas
- Ce que le fournisseur de production FAIT de ces données (durée de conservation, journaux, pays d'hébergement) : cela se lit
  dans SES conditions, une fois choisi. Non lu par cette session (les sites des fournisseurs sont hors du réseau autorisé du
  conteneur où elle a tourné).
- Si la loi 18-07 qualifie ce transfert et ce qu'elle exige (information, consentement, déclaration) : question pour le juriste.
- La page de confidentialité du site n'a PAS été modifiée par cette session.
