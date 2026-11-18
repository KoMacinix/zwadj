# D351 — relecture de `docs/preuves/parallele/carte/ce-qui-part-vers-le-tiers.md` pour une valeur réelle (consigne, § 3 : « relu par toi pour une valeur réelle (0 attendu) »)

Pièce relue : `docs/preuves/parallele/carte/ce-qui-part-vers-le-tiers.md` (5 845 caractères, 70 lignes), telle que la fusion l'apporte (`02b2d62`). Elle n'est pas modifiée par ce lot (D295 : les pièces de la branche restent où elles sont).

## 1. Ce qui a été fait
1. **Lecture, en entier**, avant la fusion (depuis la branche, `git show origin/par-carte:…`) — le balayage et les `grep` ci-dessous sont joués sur le fichier FUSIONNÉ : il se compose de prose en français, d'un tableau de ce que le navigateur envoie au fournisseur de tuiles, d'un tableau « QUAND cela part », et de la liste de ce que la pièce ne sait pas.
2. **Balayage mécanique** (`tiers/balayage-tiers.py`, sortie `tiers/balayage-tiers.txt`) : cinq motifs — adresse e-mail, chaîne longue de forme de clé (32 caractères ou plus mêlant lettres et chiffres), adresse IPv4, URL à identifiants ou à paramètre secret (`key=`, `token=`, `secret=`…), mot-clé de secret suivi d'une valeur. **Calibration à deux bras, avant toute lecture** : un texte fabriqué portant UN faux de chaque forme déclenche les CINQ motifs ; un texte ordinaire n'en déclenche aucun ; ABANDON si un bras manque.
3. **Résultat : 0 sur les cinq motifs** (« TOTAL : 0 (attendu 0) », 70 lignes parcourues, code de sortie 0).

## 2. Ce que la pièce nomme (la lecture humaine, ce que le balayage ne dit pas)
- **Un seul hôte** : `tile.openstreetmap.org`, le fournisseur de tuiles PAR DÉFAUT du développement — un nom de serveur public, pas une valeur secrète ; il est écrit dans le code à UN endroit, `DEV_MAP_TILES` de `packages/ui/src/map/map-tiles.ts` (lignes 25 et 27 ; relevé par `grep` sur `apps` et `packages` : aucun autre fichier non-test ne porte `openstreetmap`).
- **Des NOMS de variables** (`NEXT_PUBLIC_MAP_TILES_URL`, `VITE_MAP_TILES_URL`) et des chemins de fichiers : des noms, jamais des valeurs.
- **Aucun fournisseur de production** : la pièce le dit elle-même (« la réponse exacte à « à qui les données partent » dépend donc d'une décision qui n'est pas prise ») ; aucune clé, aucun compte, aucun contrat n'y figure.
- Aucune adresse e-mail, aucune adresse IP, aucun identifiant de compte, aucun jeton.

## 3. Deux affirmations de la pièce, confrontées au code fusionné (lecture adverse, pas une relecture juridique)
- « une politique `no-referrer` — NON posée par cette session » : **vrai** — `grep -i "referrerpolicy|referrer-policy|no-referrer"` sur `apps/client/src`, `apps/client/next.config.*` et `packages/ui/src/map` : 0 occurrence ; le navigateur envoie donc son `Referer` par défaut (l'origine seule, pour un autre site).
- « la bibliothèque de carte (Leaflet) et sa feuille de style sont servies par le site Zwadj lui-même […] Aucun CDN » : **vrai pour le code de la carte** — `grep` des hôtes `unpkg`, `cdnjs`, `jsdelivr` et de toute adresse `http(s)://` dans `packages/ui/src/map`, `apps/client/src/components/map` et les deux `map-tiles-env.ts` : les seules adresses sont celles du fournisseur de tuiles par défaut et de la page de licence d'OpenStreetMap, dans `map-tiles.ts`.

## 4. Ce que cette relecture ne dit PAS
- **Elle n'est pas un avis juridique** (la pièce ne l'est pas non plus) : la question « la loi 18-07 qualifie-t-elle ce transfert, et que demande-t-elle ? » reste pour le juriste. L'entrée de backlog « [JURIDIQUE][BLOQUE LE LANCEMENT] » reste ouverte.
- **Elle ne confirme pas ce que le navigateur envoie réellement** : c'est ce que mesure `e2e/specs/ca6-carte.e2e.ts` (aucune requête sortante hors tuiles, rien avant le geste), avec des tuiles INTERCEPTÉES, sur des serveurs de développement ; les deux passes e2e de ce lot le jouent vertes (`portes/portes.md`), mais personne n'a observé le trafic d'un navigateur réel vers un vrai fournisseur.
