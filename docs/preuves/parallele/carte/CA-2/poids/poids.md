# CA-2 — le poids de la carte (R-1 : « hors du paquet initial des pages, mesure avant/après, versée »)

Mesuré par `next build` (Next 15, production), le 13/11/2026, dans le conteneur de la session.
Avant : `build-avant.txt`, sur `e76562d` (client identique à `origin/main`). Après : `build-apres.txt`, sur le code du lot.

| route | avant (taille · premier chargement JS) | après | écart |
|---|---|---|---|
| `/[locale]` (accueil) | 1,97 kB · 152 kB | 1,97 kB · 154 kB | + 2 kB (paquet partagé) |
| `/[locale]/salles` (recherche) | 4,48 kB · 155 kB | 5,75 kB · 157 kB | + 1,27 kB de page, + 2 kB au total |
| `/[locale]/salles/[slug]` (fiche) | 10,2 kB · 161 kB | 10,4 kB · 162 kB | + 1 kB |
| JS partagé par toutes les pages | 102 kB | 103 kB | + 1 kB |

Ce qui entre dans le paquet initial : le cadre `VenueMap` (sans la bibliothèque), le module pur `map-tiles`, le chargeur et
la carte de salle de la recherche, les 18 messages du bloc `map`. Arrondis de Next : au kilo-octet.

## La bibliothèque elle-même — HORS du paquet initial
| morceau | taille sur disque | chargé quand |
|---|---|---|
| `static/chunks/fe69a73d.*.js` (Leaflet 1.9.4 + `leaflet-canvas.tsx`) | 148 501 octets (≈ 42 ko compressé gzip, mesuré) | à l'`import()` de `venue-map.tsx`, c'est-à-dire quand une carte se MONTE |
| `static/css/ab28570ae691aba6.css` (la feuille de Leaflet) | 10 602 octets | avec ce morceau |

Vérifié sur le disque : la chaîne `leaflet-container` (le code de Leaflet) n'apparaît dans AUCUN autre morceau JavaScript ;
la feuille globale du site ne la porte que par la règle `.zw-map-canvas.leaflet-container` du cadre.
⚠ Ce que cette mesure ne dit PAS : qu'aucune requête ne part avant le geste. Cela se mesure dans un navigateur — lot CA-6
(la spec compte les requêtes vers le morceau et vers les tuiles avant et après la bascule). La garde de source
`apps/client/src/lib/leaflet-import-guard.test.ts` tient la FORME des imports (un seul fichier, chargé par `import()`).
⚠ Les noms de morceaux portent une empreinte de contenu : ils changent à chaque build. Les tailles se relèvent, elles ne se
recopient pas.
