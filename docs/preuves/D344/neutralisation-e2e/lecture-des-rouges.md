# D344 — lecture des rouges et du départ (écrite APRÈS les sorties, AVANT tout code)

Règle de lecture : D304 (la PREMIÈRE ligne du bloc d'échec, en-têtes regroupés sautés), D323 (une assertion web-first `expect(...)` qui expire après ses réessais EST une morsure si l'échec lu montre l'appel `expect` avec l'attendu et le reçu ; un délai de test ou d'action N'EST PAS une morsure). Les sorties sont des extraits : lignes de serveur écartées (D200) — leur nombre est imprimé dans l'en-tête de chaque pièce, attendu > 0.

## Le départ, sans mutation — `vert-avant-mutation.txt` (le titre de la pièce est celui de l'étiquette posée AVANT le résultat ; le résultat est mixte)

| test | résultat | lecture |
|---|---|---|
| `warmup.setup.ts` (préchauffage, 31,6 s) | ok | — |
| **r30** « le lien « Calendrier de la salle » de l'assistant mène au calendrier » (3,5 s) | **ok** | VERT : la spec du lien passe contre l'application d'aujourd'hui, sans retouche, avec une route `/calendrier` **non préchauffée** (elle est compilée dans la mesure et passe en 3,5 s : la condition de `warmup.setup.ts` de la table B.3 ne joue PAS) |
| **r32** les cinq tests | **5 rouges** | voir `../arret-spec.md` : l'application d'aujourd'hui contredit la spec dès son premier écran ; **r32 ne revient pas** (R-3) |

⚠ La version de `rejouer.py` qui a joué ce départ est celle d'AVANT le retrait des cibles E-1 à E-7 (jamais jouées : r32 est arrêtée avant ses gardes) et d'avant la correction de l'étiquette de l'en-tête. Seules ces deux choses diffèrent de la version versée (empreinte dans `empreintes.txt`) ; la commande jouée (`playwright test r30-lien-calendrier-pro r32-nouvelle-reservation --reporter=list`) est la même.

## K-1 — le lien revient à la route supprimée (`K-1.txt`)

- Mutation : `apps/pro/src/venues/edit-venue-page.tsx`, `<Link to={CALENDAR_PATH} …>` devient `<Link to={`/salles/${venue.id}/calendrier`} …>` — exactement le défaut d'origine de D322. Ancre 1 → 0 ET marqueur 0 → 1 (D286, substitution). Restauration prouvée par l'empreinte : OUI. `git status --short` après l'exécution : seuls les fichiers non suivis du lot.
- Test joué : « le lien « Calendrier de la salle » de l'assistant mène au calendrier ». Résultat : **1 rouge**, 1 ok (le préchauffage).
- Première ligne du bloc d'échec : `Error: Timed out 7000ms waiting for expect(page).toHaveURL(expected)` — avec `Expected string: "http://localhost:5273/calendrier"` et `Received string: "http://localhost:5273/"`, ligne de la spec `> 33 | await expect(page).toHaveURL(`${PRO}/calendrier`);`. **C'est une assertion web-first qui a expiré avec son attendu et son reçu : une MORSURE (D323).**
- Ce que le reçu dit : le clic mène au tableau de bord (`/`), pas à une page d'erreur — c'est le comportement décrit dans le commentaire de la spec (la route supprimée tombe sur `<Route path="*">`, qui redirige vers `/`). La garde mesure donc bien ce pour quoi elle a été écrite.
- Le départ (sans mutation) est vert pour le même test : le rouge vient de la mutation, pas de la spec ni de l'environnement.

## Ce qui N'A PAS été fait, écrit pour ne pas se lire comme tenu

- **Aucune neutralisation de r32** : elle n'est pas revenue ; ses gardes n'ont jamais été atteintes (le premier écran la contredit déjà). Les extraits E-1 à E-7 prévus par la table (B.1) n'existent donc pas.
- **Aucune lecture automatique** : les signatures Playwright ne sont pas codées dans un lecteur (D323) ; la lecture ci-dessus est manuelle, sur l'extrait.
- **Une seule morsure pour r30** : la spec n'a qu'un test, une assertion d'adresse suivie d'une assertion de titre ; la mutation ne mord que l'adresse. L'assertion du titre de la page rendue (`getByRole("heading", { level: 1, … })`) n'a pas de neutralisation propre.
