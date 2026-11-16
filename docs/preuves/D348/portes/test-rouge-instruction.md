# D348 — la porte `test` est ROUGE (1 échec) : ce qui a été instruit, et ce qui ne l'a PAS été

Pilote : `docs/preuves/D340/portes/passe-secteur.sh`, UNE passe, sur secteur, arbre propre au départ (`portes/_index.txt`). Résultat : `typecheck` 0, `lint` 0, **`test` 1**, `build` 0, `test:int` 0, `test:e2e` 0.

## Le fait (sortie : `portes/test.txt`)

`Test Files 1 failed | 45 passed (46)` · `Tests 1 failed | 726 passed (727)` — un seul fichier, **`apps/pro/src/account/account-settings-page.test.tsx`**, test « Canaux de notification — D60 > décocher LES DEUX annonce le refus AVANT d'envoyer ». Le message est celui de la garde de la sortie console (`src/test-setup.ts:231`) : « 2 avertissement(s) de console dans un fichier NON exempté » — « An update to `DeletionSection` … not wrapped in act(...) » et « An update to `ProVenuesProvider` … not wrapped in act(...) ». La garde elle-même dit que ce bruit est « probablement la CONSÉQUENCE » d'une mise à jour d'état qui tombe APRÈS la fin d'un test.

## Ce qui a été instruit (R-9 de D340 : « possible régression à instruire, aucune inférence environnement »)

1. **Mon diff ne touche pas ce fichier ni rien dont il dépend.** `git diff --name-only 26ad5c7 HEAD -- apps packages` : trois fichiers, tous sous `apps/client/` (`lib/api.ts`, `app/[locale]/salles/[slug]/page.tsx`, `app/[locale]/salles/(recherche)/loading.tsx`). Le fichier en échec est dans `apps/pro/` ; l'application Pro n'importe rien de `apps/client/`. Aucun fichier de `packages/` n'est modifié.
2. **Le fichier, rejoué SEUL cinq fois de suite sur le même arbre** (`pnpm --filter @zwadj/pro exec vitest run src/account/account-settings-page.test.tsx`) : **4 fois 31/31 verts, 1 fois 1 échec** — le MÊME message de garde (`DeletionSection`, `ProVenuesProvider`), sur un AUTRE test du même bloc (« garder UN seul canal reste permis »). Sortie : `portes/test-rejeux-fichier-seul.txt`. Le défaut est donc **intermittent et propre à ce fichier**, indépendamment du lot.
3. Cette classe est celle que `AGENTS.md` décrit déjà (« le compte d'avertissements `act(…)` FLOTTE : le même fichier a rendu 1 puis 0 »).

## Ce qui n'a PAS été fait, et pourquoi

- **La porte `test` n'a PAS été relancée en entier** : un rejeu unique n'est permis que s'il est décidé et écrit avant par Ko ou le relecteur (règle e2e de D348, point 3, et précédent de D340) ; la session n'est ni l'un ni l'autre.
- **Le défaut n'est PAS rattaché à un lot** : établir s'il existe sur `26ad5c7` (avant ce lot) demanderait de rejouer le fichier sur un arbre d'avant ; non fait. L'argument ci-dessus (aucun fichier commun) est un argument de dépendance, pas une mesure sur l'arbre d'avant. **Écrit comme inférence.**
- **Conséquence (D270 : « aucun lot ne part dans `main` sous une porte rouge, même quand le rouge vient d'ailleurs »)** : la clôture de ce lot est commitée en LOCAL et **N'EST PAS POUSSÉE** tant que Ko ou le relecteur n'a pas tranché (précédent : D340, « clôture commitée en LOCAL et NON POUSSÉE »).
