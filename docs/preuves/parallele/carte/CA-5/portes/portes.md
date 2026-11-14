# CA-5 — LES PORTES, après la dernière modification

Arbre mesuré : `0a7f222` (rouges de CA-5) + le code du lot (non commité à l'instant de la mesure ; rien de modifié pendant).
Date : 14/11/2026. État machine : conteneur cloud (voir `../../CA-1/portes/portes.md`) — pas le poste de Ko.

## ⚠ INCIDENT D'ENVIRONNEMENT PENDANT LA PREMIÈRE PASSE — écrit, pas tu
Le conteneur a été REDÉMARRÉ pendant le tri des campagnes de ce lot. Constaté à la reprise :
- la campagne `neutralize-r33.py` (campagne EXISTANTE, rejouée par le tri) avait été tuée en pleine mutation : son manifeste
  `.neutralisation-r33/manifeste.json` était sur le disque et `apps/pro/src/dashboard/walkin-journey.tsx` — un fichier que
  cette session n'a JAMAIS modifié — portait une ligne mutée (`Promise.allSettled` → `Promise.all`) ;
- le verrou `../zwadj-verrou-portes` n'avait pas été rendu ; PostgreSQL ne tournait plus.
Réparé avant toute mesure : la mutation LUE dans `git diff` (une ligne, celle du manifeste), le fichier rendu par
`git checkout`, le manifeste retiré, le verrou rendu, PostgreSQL relancé ; puis l'arbre revérifié (les 14 ancres de
`neutralize-ca5.py` présentes une fois chacune, les 13 tests du lot verts). La passe ci-dessous est la SECONDE, entière.
(Un `finally` ne s'exécute pas quand le processus est tué — AGENTS.md ; c'est le manifeste sur disque qui a permis de voir
quoi rendre.)

| porte | code | chiffres (paquet : fichiers / tests, relevés sur `test.txt`) |
|---|---|---|
| `pnpm typecheck` | 0 | tous les paquets |
| `pnpm lint` | 0 | tous les paquets |
| `pnpm test` | 0 | api-client 7 / 66 ; api 81 / 1355 ; client 47 / 561 ; **pro 48 / 740** (entrée : 46 / 727 ; + 2 fichiers, + 13 tests) — 0 échec |
| `pnpm build` | 0 | tous les paquets |
| `pnpm test:int` (sous verrou) | **1** | 47 fichiers ; 737 passés, **7 en échec** |

### ⛔ `test:int` N'EST PAS VERT — le rouge de référence du conteneur
Les 7 échecs sont dans `pro-clients.int-spec.ts` (2) et `quote-numbering.int-spec.ts` (5), rouges sur `origin/main` à
l'entrée de la session. Ce lot ne touche ni l'API ni ses tests. À rejouer sur le poste de Ko à l'intégration.

## Harnais du lot
`python3 neutralisation/neutralize-ca5.py` : **14 gardes mordues sur 14 · 0 muette · 0 non mesurée**, code 0, à la première
passe ; rejoué à l'identique par le tri.

## Poids (R-1), app Pro — `../poids/build-pro.txt` (`vite build`)
Leaflet sort dans SON morceau : `leaflet-canvas-*.js` 152,94 kB (44,67 kB gzip) et `leaflet-canvas-*.css` 15,61 kB, chargés
quand le pro ouvre la carte ; le paquet principal est `index-*.js` 712,27 kB. ⚠ Pas de mesure « avant » pour le pro : le
paquet principal d'avant le lot n'a pas été relevé ; ce qui est établi est que la bibliothèque n'y est pas.

## Campagnes touchées par le diff : 4 sur 64, 1 742 s — code 1
165 mordues · 2 erreurs · 0 non mesurée.
| campagne | ce qui est sorti | lecture |
|---|---|---|
| `ca5` | 14 sur 14 | — |
| `r32` (mute `venue-form.tsx`, modifié par ce lot) | 65 sur 65 | ses ancres tiennent |
| `r33`, cible M-12 | MUETTE (61 passés, 0 échec) | garde de fuseau sur une machine en UTC, comme à CA-2 et CA-3 (`a-reporter-au-backlog.md`) |
| `r49` (e2e) | « ARBRE NON CONFORME AU DÉPART » : ancres ×0 dans `walkin-journey.tsx` et `theme.css` du pro | ses ancres portent des `\r\n` EN DUR (12 occurrences dans le harnais) : elles supposent des fichiers en CRLF. VÉRIFIÉ SANS CE LOT (`git stash`) : 7 remplacements sur 37 ont déjà leur ancre absente dans ce clone en LF. Artefact d'environnement, même classe qu'`available-on` cible 6 ; le harnais a refusé de démarrer, il n'a rien jugé. |

## Empreintes finales des fichiers de test
`place-fields-map.test.tsx` a changé depuis les rouges : cinq assertions réécrites en assertions natives (D316).
    f00d0641d1cb7c9cd993f0e23a85186487e77e6b8a273cd12d3d7f655fa4d77d  apps/pro/src/venues/venue-pin-map.test.tsx
    aaf92c4e682e83ae4831d74966290f213bef6fa0c3497eac03d90c9660265fe5  apps/pro/src/venues/place-fields-map.test.tsx
