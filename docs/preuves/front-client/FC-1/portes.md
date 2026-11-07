# FC-1 — les portes, APRÈS la dernière modification

Pilote : `bash docs/preuves/front-client/outils/portes.sh docs/preuves/front-client/FC-1/portes <pont navigateur>`, lancé sur
`b6d3aa3` (le code) + le harnais et les pièces non commités (aucun ne touche un fichier lu par une porte). Journaux :
`docs/preuves/front-client/FC-1/portes/` ; codes et durées : `portes/resume.txt`.

| porte | sortie | chiffres | comparé à l'entrée |
|---|---|---|---|
| `typecheck` | **0** | — | = |
| `lint` | **0** | — | = |
| `test` | **0** | api-client 59/6 · api 1 096/71 · **client 400/31** · pro 653/41 — 2 208 tests, 149 fichiers | client +14 tests, +1 fichier : `theme-contrast.test.ts` |
| `build` | **0** | — | = |
| `test:int` | **1** | 614 / 619 — rouges : MD-1 ×2 (`pro-clients`), F-1, F-2, F-3 (`quote-numbering`) | **tous dans l'ensemble de concurrence d'entrée** (MD-1, F-1 à F-6 : `ECONNRESET` puis `deadlock` en cascade) ⇒ « rouge d'entrée, environnement » ; **pas « vert » : à jouer à l'intégration** |
| `test:e2e` | **0** | 63 passés · 1 ignoré · 0 échec (dont B8 avec la référence resserrée) | = (63 / 1 / 0) |

Durées : `resume.txt` — elles ne se comparent à aucune durée du poste de Ko (D290).
