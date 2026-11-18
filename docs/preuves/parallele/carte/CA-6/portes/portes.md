# CA-6 — LES PORTES, après la dernière modification

Arbre mesuré : `e44a204` (rouges de CA-6) + les réparations et le harnais (non commités à l'instant de la mesure ; aucun
fichier de code modifié pendant). Date : 14/11/2026. État machine : conteneur cloud (voir `../../CA-1/portes/portes.md`) —
pas le poste de Ko ; PostgreSQL relancé après un nouveau redémarrage du conteneur, avant ce lot.

| porte | code | chiffres |
|---|---|---|
| `pnpm typecheck` | 0 | tous les paquets |
| `pnpm lint` | 0 | tous les paquets |
| `pnpm test` | 0 | api-client 7 / 66 ; api 81 / 1355 ; **client 47 / 564** (CA-4 : 561 ; + 3 tests de la réparation de l'accueil) ; pro 48 / 740 — 0 échec |
| `pnpm build` | 0 | tous les paquets |
| `pnpm test:int` (sous verrou) | **1** | 47 fichiers ; 739 passés, **5 en échec** — les deux fichiers rouges à l'entrée (`pro-clients` ×1, `quote-numbering` ×4) |
| suite e2e ENTIÈRE, passe 1 (sous verrou) | 0 | **95 passés, 1 ignoré, 0 échec** (3,5 min) |
| suite e2e ENTIÈRE, passe 2 (sous verrou) | 0 | **95 passés, 1 ignoré, 0 échec** (3,5 min) |

### La suite e2e
- À l'entrée (D347) : 88 passés + 1 ignoré. Ici : 95 + 1 — les 7 tests de `ca6-carte.e2e.ts` (8 lignes de la spec dans la
  sortie, dont l'échauffement n'est pas : compté sur `test-e2e-passe-1.txt`, « ca6-carte » : 8 occurrences = 7 lignes de test
  + 1 ligne de chemin).
- Commande : `pnpm --filter @zwadj/e2e exec playwright test --trace off --reporter list`. ⚠ Une première tentative, par
  `pnpm test:e2e -- --trace off …`, n'a PAS démarré (« No tests found » en 25 s, code 1, deux fois) : les options étaient
  mal transmises. Mesure non démarrée, pas un verdict ; ses deux lignes ont été retirées de `_index.txt` et la suite rejouée.
- Les sorties versées n'ont PAS leurs lignes `[WebServer]` (jetons de vérification d'e-mail) ; « token= » restant : 0 et 0.
- ⚠ Environnement : PostgreSQL 16 + `uuidv7` de substitution dans `template1`, Chromium 1243 sous le chemin de la révision
  1155 attendue par Playwright 1.50.1. La suite est verte ICI ; elle se rejoue sur le poste de Ko à l'intégration.
- La spec d'accessibilité existante (`b8`) passe sans relever son gel : la carte n'est pas montée sur les écrans qu'elle
  regarde (elle ne se monte qu'au geste ou au défilement).

### ⛔ `test:int` N'EST PAS VERT — le rouge de référence du conteneur
Même lecture qu'aux cinq lots précédents (`ECONNRESET` sur les requêtes simultanées et cascades ; 4 échecs à l'entrée, puis
6, 7, 9, 11, 7, 5 selon la passe). Ce lot ne touche ni l'API ni ses tests. À rejouer sur le poste de Ko.

## Harnais du lot
`python3 neutralisation/neutralize-ca6.py --e2e` : **9 gardes mordues sur 9 · 0 muette · 0 non mesurée**, code 0, arbre rendu
à l'octet (`../neutralisation/neutralize-ca6.txt`). Chaque morsure est une assertion Playwright (`expect(`) lue dans le
bloc d'erreur. Les deux défauts que la spec a trouvés sont parmi les cibles (E-1, le clavier ; E-6, l'accueil).
`python3 neutralisation/neutralize-ca3.py` (modifié par l'extension 1) : **15 sur 15** (12 à CA-3 ; + 3 cibles de la garde
du défilement).

## Campagnes touchées par le diff : 2 sur 65, 54 s — code 3 (campagne incomplète, pas une erreur)
`ca3` 15 sur 15 ; `ca6` 9 « non mesurées » (ses cibles sont e2e : jouées à part avec `--e2e`, ci-dessus).

## Empreintes finales
    034ac8af8c985707484290e17b847f202b4e52246cedde95ad549620b492a34b  e2e/specs/ca6-carte.e2e.ts
    a94a1ef91edbc8008b0f6be4456bfe872dfb322dc2cea70924ada1daf29adb02  apps/client/src/components/map/near-viewport-map.test.tsx
(la spec a changé depuis les rouges : le test de l'accueil fait défiler la page avant d'attendre la carte, et vérifie d'abord qu'aucune tuile ne part à l'ouverture.)
