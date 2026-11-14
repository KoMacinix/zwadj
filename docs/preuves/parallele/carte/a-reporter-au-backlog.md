# À REPORTER AU BACKLOG — session « carte »

Cette session n'écrit pas dans `ZWADJ_BACKLOG.md` (consigne, point 0 d). Ce qui devrait y entrer est écrit ici, dans la forme
des entrées neuves (D302) : CE QUE L'ENTRÉE BLOQUE (ou « à ordonner par Ko ») et son COÛT en termes qui se relèvent.
Aucune durée estimée. Chaque lot complète ce fichier.

## Trouvé en chemin (défauts qui ne sont pas l'objet de la session — non corrigés)

### `[HARNAIS]` `neutralize-horizon.py`, cible H6 : ancre périmée, la campagne sort en « ERREUR DE SCRIPT »
- Relevé le 13/11/2026 (lot CA-1) : « H6. Une PANNE emprunte le message de date : 0 occurrence(s), 1 attendue dans
  apps/client/src/components/search/search-view.tsx ». À cet instant `search-view.tsx` était IDENTIQUE à `origin/main`
  (`26ad5c7`, vérifié par `git diff`) : l'ancre était périmée AVANT la session. Les cinq cibles jouées avant H6 mordent ;
  celles qui suivent H6 ne sont pas jouées (une campagne partiellement jouée n'est pas une campagne verte).
- Bloque : à ordonner par Ko. Tant que l'ancre n'est pas réécrite, `lancer-campagnes.py --tout` sort en erreur sur cette
  campagne, et tout lot qui touche `venues-public.service.ts` ou `search-view.tsx` la rejoue.
- Coût : code de harnais (il compte), 1 fichier (`neutralisation/neutralize-horizon.py`), ni e2e ni migration.

### `[HARNAIS]` `neutralize-available-on.py`, cible 6 : l'ancre porte un `\r\n` en dur
- Relevé le 13/11/2026 (lot CA-2) : « 0 occurrence(s), 1 attendue(s) dans apps/client/src/lib/search-query.ts ». L'ancre est
  écrite `…state.availableOn);\r\n  query.set("sort"…` : elle ne se trouve que dans un fichier en CRLF (poste de Ko,
  `core.autocrlf=true`). Dans un clone en LF (Linux, CI, session cloud) la campagne s'arrête là.
- Bloque : rien sur le poste de Ko ; toute campagne `--tout` jouée ailleurs.
- Coût : code de harnais (il compte), 1 fichier ; le socle `socle_front_client.py` montre la forme (`_adapter`).

### `[HARNAIS]` `neutralize-r49.py` : douze `\r\n` en dur, le harnais refuse de démarrer dans un clone en LF
- Relevé le 14/11/2026 (lot CA-5) : « ARBRE NON CONFORME AU DÉPART : R49-18 : ancre ×0 … » ; 7 remplacements sur 37 n'ont
  pas leur ancre dans ce clone, AVEC ou SANS le lot (vérifié par `git stash`). Même classe que `available-on` cible 6.
- Bloque : rien sur le poste de Ko ; toute campagne `--tout` jouée ailleurs.
- Coût : code de harnais (il compte), 1 fichier ; même remède (`_adapter` du socle).

### `[HARNAIS]` `neutralize-r33.py`, cible M-12 : muette sur une machine en UTC
- Relevé le 13/11/2026 (lot CA-2) : « la date d'un événement dérive du fuseau du serveur » — 61 passés, 0 échec. Une garde
  de fuseau ne peut pas mordre quand le serveur est en UTC (AGENTS.md, leçon S11-a : épingler `process.env.TZ`).
- Bloque : rien sur le poste de Ko (fuseau d'Alger ?) — à vérifier ; ailleurs, la campagne sort en 1.
- Coût : code de test ou de harnais (il compte), 1 ou 2 fichiers.

### `[INFRA][TEST]` quatre tests de requêtes SIMULTANÉES tombent en `read ECONNRESET` dans le conteneur cloud
- `pro-clients.int-spec.ts` (MD-1 ×2) et `quote-numbering.int-spec.ts` (F-1, F-2), déterministes sur `origin/main` dans ce
  conteneur (PostgreSQL 16 + polyfill, Linux). Cause NON établie (aucune erreur côté PostgreSQL ; dix requêtes simultanées
  par supertest sur un serveur nu passent). Sur le poste de Ko ces tests sont verts (D347 : six portes à 0).
- Bloque : rien sur le poste de Ko. Toute session cloud trouve `test:int` rouge à l'entrée.
- Coût : enquête documentaire d'abord ; aucun fichier connu à toucher.

## Clés de catalogue devenues mortes (à retirer à l'intégration, pas ici)
Les catalogues sont partagés avec les deux autres sessions : cette session n'y écrit qu'un bloc neuf et ne retire rien.
- `search.map.title`, `search.map.soon` : plus lues depuis CA-2 (la vue « carte » est la carte).
- `home.map.soon` : plus lue depuis CA-3 (l'accueil monte la vraie carte). `home.map.title` reste lue.
- ⚠ `home.map.title` vaut « Carte des salles · Alger » alors que la carte de l'accueil montre TOUTES les salles publiques
  situées, où qu'elles soient. Le titre n'a pas été changé (c'est un texte produit existant) : à trancher par Ko —
  garder « Alger » tant que le catalogue est algérois, ou retirer la ville. Coût : 2 valeurs de catalogue, documentaire.
- Coût : documentaire côté catalogues (2 fichiers), plus le repère « le total ne recule pas » de
  `apps/api/src/common/i18n-parity.spec.ts`, à relever DÉLIBÉRÉMENT (il compte les clés ; la session ajoute 18 clés à CA-2
  et ne touche pas ce fichier, que d'autres sessions peuvent modifier).

## ⛔ `[INFRA]` CHOISIR LE FOURNISSEUR DU FOND DE CARTE DE PRODUCTION — **BLOQUE le lancement** (décision de Ko, R-2)
- État : la carte marche en développement sur les tuiles publiques d'OpenStreetMap (défaut écrit à UN endroit,
  `packages/ui/src/map/map-tiles.ts`). En PRODUCTION, tant que `NEXT_PUBLIC_MAP_TILES_URL` + `…_ATTRIBUTION` (site client) et
  `VITE_MAP_TILES_URL` + `…_ATTRIBUTION` (app Pro) ne sont pas posées, toutes les cartes affichent « carte indisponible ».
  Ouvrir le site au public sans cette décision, c'est l'ouvrir sans carte.
- Pour Ko : « la carte marche dès maintenant sur ton poste ; avant d'ouvrir le site au public il faudra choisir qui fournit
  le fond de carte ».
- Les trois options (consigne, R-2), SANS recommandation :
  1. les tuiles publiques d'OpenStreetMap ;
  2. un fournisseur avec clé (hébergeur de tuiles commercial) ;
  3. des tuiles hébergées par Zwadj (son propre serveur de tuiles).
- ⛔ **CE QUE CHAQUE OPTION COÛTE N'A PAS PU ÊTRE RELEVÉ, ET RIEN N'EST ÉCRIT DE MÉMOIRE.** La consigne demande les coûts
  « relevés dans les conditions d'usage publiées (lien et date de lecture) ». Le 13/11/2026, depuis le conteneur de la
  session, les six pages demandées ont toutes échoué en résolution de nom (`getaddrinfo ENOTFOUND`) : ces sites sont hors
  du réseau autorisé de l'environnement. Aucune page n'a été lue ; aucune date de lecture ne peut être donnée.
  Pages À LIRE (par Ko, ou par une session dont le réseau les autorise), une par question :
  | question | page |
  |---|---|
  | option 1 : ce que la politique d'usage des tuiles publiques permet à un site commercial, ce qu'elle exige, ce qu'elle garantit | `https://operations.osmfoundation.org/policies/tiles/` |
  | la mention d'attribution exigée (toutes options à base de données OpenStreetMap) | `https://www.openstreetmap.org/copyright` |
  | option 2 : limites de l'offre gratuite, usage commercial, premier palier payant — trois exemples de fournisseurs | `https://www.maptiler.com/cloud/pricing/` · `https://www.thunderforest.com/pricing/` · `https://stadiamaps.com/pricing/` |
  | option 3 : ce qu'un serveur de tuiles demande (machine, disque, logiciels) | `https://switch2osm.org/serving-tiles/` |
  ⚠ La liste des trois fournisseurs de l'option 2 est un ÉCHANTILLON choisi par la session pour avoir des pages de prix à
  lire, pas une présélection.
- Ce que le CODE impose à l'option retenue, quelle qu'elle soit (cela, c'est mesuré) : des tuiles IMAGE servies en `https` à
  une adresse de la forme `…/{z}/{x}/{y}.png` (la clé éventuelle du fournisseur est dans cette adresse, donc PUBLIQUE : elle
  part dans le navigateur) ; une mention d'attribution en texte, et son lien de licence facultatif ; aucune autre
  dépendance. Changer de fournisseur = changer trois variables d'environnement par application, sans toucher au code.
- À décider avec : ce que le fournisseur fait des adresses IP des visiteurs (`ce-qui-part-vers-le-tiers.md`).
- Bloque : le lancement. Coût : décision produit + configuration de déploiement (6 variables) ; aucun fichier du dépôt si
  l'option tient dans le gabarit ci-dessus ; un lot de code si le fournisseur exige autre chose (tuiles vectorielles,
  en-tête d'autorisation).

## Hors session par décision (R-8, R-10) — à ordonner par Ko
Chaque ligne : ce qu'elle bloque = « à ordonner par Ko ».
- **L'adresse déduite du point posé par le pro (« géocodage inverse »)** — R-8. Service tiers, décision de Ko. Coût : un
  contrat d'API neuf ou un appel direct à un tiers depuis le navigateur du pro ; dépendance à un fournisseur (et ses
  conditions) ; code pro (`venue-pin-map.tsx`, `venue-form.tsx`).
- **« Près de moi »** (centrer la carte sur le visiteur) — R-10. La position du visiteur est une donnée personnelle (loi
  18-07) : avis du juriste d'abord. Coût : code client ; aucun contrat d'API si le calcul reste dans le navigateur.
- **Tri par distance** — R-10. Coût : contrat d'API (paramètres de position), requête SQL de distance ; rend utile l'index
  géographique ci-dessous.
- **Itinéraire vers la salle** — R-10. Coût : un lien sortant vers une application de cartes suffit (aucune dépendance) ;
  un itinéraire dans la page demande un service tiers.
- **Regroupement des points proches** — R-10. Non fait : aucune mesure ne le rend nécessaire (le plafond est de 500 points,
  la base de test en montre une poignée). À rouvrir quand une ville porte assez de salles pour que les points se
  recouvrent. Coût : une dépendance de plus (greffon de Leaflet) ou du code maison dans `leaflet-canvas.tsx`.
- **Filtre par quartier** — R-10. Coût : contrat d'API (un filtre de plus sur la liste ET sur la carte : le filtre commun
  `publicFilter` le rend unique), écran de filtres.
- **Index géographique sur les coordonnées des salles** (backlog, ligne « Add index on Venue coords + city », restée
  partielle) — NON fait, sur consigne (R-3 : aucune migration). La route de points filtre par les mêmes colonnes que la
  liste et lit au plus 500 lignes : aucun besoin mesuré. Coût le jour venu : une migration écrite à la main.
- **Délais et coupe-circuits sur les appels de carte** (backlog, « Circuit breakers + timeouts on … maps calls ») — sans
  objet côté serveur à ce jour : l'API n'appelle aucun service de carte, seul le navigateur parle au fournisseur de tuiles.
  Une tuile en échec et une bibliothèque qui ne se charge pas sont DITES à l'écran (lots CA-2, CA-6). À rouvrir avec le
  géocodage inverse, s'il passe par l'API.
- **Annoter la décision produit n° 2** (« carte reportée après le MVP ») et les entrées de backlog sur la carte : à
  l'intégration, par la session qui écrit les fichiers d'autorité (consigne, point 0 a).

## Limites connues de ce qui est livré (à ordonner par Ko)
- **La molette ne zoome pas la carte** (voulu : sur une page qui défile, elle doit faire défiler la page) ; on zoome par
  les boutons, le double-clic, le pincement. Sur un téléphone, un doigt posé sur la carte la déplace au lieu de faire
  défiler la page : la carte est bornée en hauteur pour laisser de quoi défiler autour. Pas de mesure d'usage réel.
- **Le point du pro ne se pose pas au clavier** : la carte du pro est un confort de souris ou de doigt ; le chemin clavier
  est celui des deux champs, qui restent. Écrit, pas corrigé.
- **La carte est en clair dans le thème sombre** : les tuiles sont des images du fournisseur. Un fond sombre est une
  propriété du fournisseur choisi.
- **La vue « carte » n'est pas dans l'adresse** (écart C-3 de la lecture adverse) : un lien partagé ouvre toujours la grille.
- **La maquette de l'écran de carte n'est pas au dépôt** (écart C-4) : la carte n'a été confrontée à aucun visuel de référence.
