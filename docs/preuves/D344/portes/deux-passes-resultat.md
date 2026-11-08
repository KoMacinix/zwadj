# D344 — résultat des deux passes de l'e2e (écrit APRÈS elles, dans un commit postérieur à celui de la règle `f784eab`)

Règle : `regle-deux-passes.md` (commitée avant, `f784eab`). Lanceur : `deux-passes-e2e.sh`. Départ : 08/11/2026 02:09:56, sur `f784eab`, arbre propre, aucun stash.

| | passe 1 | passe 2 |
|---|---|---|
| code de sortie | **0** | **0** |
| durée | 320 s | 318 s |
| résumé de Playwright (lu dans le BRUT, ANSI retirés) | 78 passés · 1 ignoré | 78 passés · 1 ignoré |
| passés + ignorés | 79 | 79 |
| attendu, DÉRIVÉ avant la première passe (`playwright test --list`) | 79 (« Total: 79 tests in 20 files ») | 79 |
| `failed` / `did not run` / `flaky` | aucune ligne | aucune ligne |
| poste | SECTEUR, RAM libre 4 907 → 5 039 Mo, `chrome` 0, `headless_shell` 0 | SECTEUR, RAM libre 5 049 → 5 034 Mo, `chrome` 0, `headless_shell` 0 |

- Échantillons d'état machine sur batterie pendant les passes : **0 sur 21**. Ports d'e2e libres avant chaque passe. Arbre propre avant, entre et après.
- `.env` : IDENTIQUES entre l'ouverture et la clôture (3 fichiers, mêmes empreintes, hôtes locaux — `deux-passes-env-comparaison.txt` ; aucune valeur n'est versée).
- L'ignoré est un seul test, comme à D343 (77 passés + 1 ignoré, 78) : la différence de 78 à 79 est la spec du lien (r30), un test passé.
- Verdict selon la règle : **deux passes complètes consécutives, vertes, sur secteur — la porte `test:e2e` est VERTE** (R-4), avec la suite augmentée de r30 seule ; r32 n'en fait pas partie (`../arret-spec.md`).
- Les sorties versées sont MASQUÉES (`masquer-jetons.py` : 89 suites distinctes masquées par passe, 0 restante). Les 6 occurrences de 43 caractères qui subsistent par fichier sont des noms de migrations Prisma, lues une à une.

⚠ Ce que ce résultat ne dit pas : que r30 soit la cause du vert (elle n'a qu'un test) ni que D265 ne reviendra jamais — deux passes ne le mesurent pas ; r30 traverse le fixture réparé (`createPublishedVenue`, `loginContext`, `seedReferentials`) et n'a pas échoué. Les `Timed out … toHaveURL` de D127 n'ont pas paru sur `/calendrier`, route non préchauffée : la condition de `warmup.setup.ts` (B.3) ne s'est pas ouverte.
