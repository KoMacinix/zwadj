# D346 — les rouges, lus AVANT le premier commit de code (D334, point 5)

Code produit **non modifié** : `git diff --name-only HEAD` ne contient que les fichiers de test ci-dessous. Poste sur secteur.

| Rouge | Fichier de test joué | sha256 du fichier joué | Commande | Pièce |
|---|---|---|---|---|
| 1 — composant (jsdom) | `apps/client/src/components/search/search-view.test.tsx` | `5a6e36e7e970327d27551f53bb89310706b5aa621d43b57ea2a3adafc76268e6` | `cd apps/client && npx vitest run src/components/search/search-view.test.tsx` | `rouges/rouge-1-composant.txt` |
| 2 — navigateur (FR et AR) | `e2e/specs/r48-assistant-choix.e2e.ts` | `efd211a9242588a099ad35cc2669a7718ed8aa58fd5b4859bb6785246fdfbe5b` | `cd e2e && npx playwright test specs/r48-assistant-choix.e2e.ts --project=chromium --no-deps` (cache `fetch` de Next vidé avant) | `rouges/rouge-2-navigateur.txt` |

## Rouge 1 — lu (AMENDÉ : quatre tests à champ unique ajoutés, rouge rejoué contre l'ancien code)
55 tests, **10 en échec, 45 verts**. Les dix sont des `AssertionError` (`expected … to be …`) : commune (`'' → CITY_ID`), invités (`'20' → '250'`), budget (`'1500000' → '750000'`), goûts de l'assistant (`false → true`), type de cérémonie (`'' → 'indoor'`), « Recommencer » (`CITY_ID → ''`), **styles seuls**, **équipements seuls**, **plafond de capacité seul** (`'500' → '300'`), **plancher de budget seul** (`'0' → '500000'`). Le test **changer de page ne remonte pas le formulaire : une saisie non soumise survit** est **vert** : c'est la garde contre une réparation trop large (lecture adverse, ligne 10), elle doit le rester. Les 44 autres tests du fichier sont verts.
**Pourquoi quatre tests de plus** : un test qui change deux champs à la fois ne rougit pas quand on retire UN seul champ de la clé du panneau (l'autre remonte le panneau) — la cible du harnais serait muette par confusion de mesure (D209). Chaque champ de la clé a désormais son test. Le rouge a été rejoué **contre l'ancien code** (`search-view.tsx` mis de côté le temps de la mesure par `git stash push` puis `pop` ; aucun stash restant) ; la première version du rouge (6 sur 51, commit `1f95e06`) reste dans l'historique.
⚠ Une première version du test de cérémonie utilisait `INDOOR` ; l'autorité (`CEREMONY_TYPE_FILTERS`) est `indoor` : avec la majuscule il aurait été rouge pour une autre raison (mesure confondue, D209) — corrigé **avant** de figer ce rouge.

## Rouge 2 — lu
⚠ L'empreinte ci-dessus est celle du fichier en CRLF (convention du dépôt) ; il a été joué en LF, le contenu est identique à la fin de ligne près (normalisation faite après la lecture du rouge, avant le versement).
2 tests (FR, AR) en échec. Toutes les erreurs lues sont `… — formulaire` : aux étapes `1-apres-commune`, `2-apres-invites`, `3-apres-budget`, `4-apres-gouts`, `5a`, `5b`, `6-retour-…`, `7-assistant-termine`, `8a-rouvert-par-retour`, `9-retour-…-taste/budget/guests`. **Aucune erreur « assistant »** : l'assistant est vert partout. `0-ouverture`, `8b-recommencer…` et `9-retour-…-city` sont verts (état vide ou coïncidence).
Les mesures sont à **sondage borné** (2,5 s) : un rouge n'est donc pas une lecture trop tôt (voir `reproduction.md`, écart 2).

## Ce que ces rouges ne prouvent PAS
- Les **styles** (puces du formulaire) sont rouges au niveau composant (rouge 1, goûts) ; en navigateur, la base e2e les affiche vides tant que le cache de référentiels est vide (voir `reproduction.md`, écart 3) : au rejeu de reproduction, un style ET un équipement ont été mesurés (4 styles en base, cache vidé) ; dans la suite complète, la spec du lot ne peut s'y fier.
- La **radio du type de cérémonie** et le **tri** ne sont pas posés par l'assistant : leur rouge est de composant seulement.
