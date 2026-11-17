# D350 — les gardes de la spec e2e (`e2e/specs/r52-administration.e2e.ts`) : neutralisées par le harnais, pas à la main

La table d'ouverture prévoyait une neutralisation **à la main** des gardes de la spec e2e (la campagne `neutralize-adm2.py` ne mesurait que les tests unitaires et d'intégration). **Cela a été fait AUTREMENT, et c'est dit** : le harnais d'ADM-2 porte **six cibles e2e** (E-1 à E-6) qui rejouent la spec dans le vrai navigateur sous chaque mutation, de sorte que ces gardes sont mesurées par le MÊME harnais, avec le MÊME protocole (ancre 1 → 0 ET marqueur n → n+1, restauration prouvée par l'empreinte des fichiers ciblés comparée au départ), que les autres. Aucune mutation à la main n'a été nécessaire ; la procédure écrite par la table n'a donc pas été suivie telle quelle.

## Ce qui est mesuré, et ce qui ne l'est pas

| cible | la garde e2e qu'elle fait rougir | sortie lue (journal `extraits-des-echecs-adm2.txt`) |
|---|---|---|
| **E-1** | l'ADMIN qui se connecte par l'écran arrive sous `/admin` | `Error: Timed out 15000ms waiting for expect(locator).toHaveURL(expected)` — cinq tests sur cinq |
| **E-2** | la balise `noindex` existe dans le vrai navigateur | `Error: Timed out 7000ms waiting for expect(locator).toHaveAttribute(expected)` — 1 en échec, 5 passés |
| **E-3** | l'en-tête de l'assistant ne dit plus « en attente » pour une salle refusée, en français ET en arabe | `Error: Timed out 7000ms waiting for expect(locator).toBeVisible()` — 1 en échec, 5 passés |
| **E-4** | « Approuver » n'appelle l'API qu'après la confirmation de l'action irréversible | idem |
| **E-5** | un PRO sous `/admin` lit un refus explicite et n'atteint aucune donnée | idem (15 000 ms) |
| **E-6** | la correction du motif est refusée côté serveur : le pro ne lit jamais le NOUVEAU motif | idem |

**Lecture de ces échecs — décision du relecteur, déléguée par Ko le 04/10/2026 (D323), mot pour mot** : « Une assertion Playwright web-first (`expect(...)`) qui expire après ses réessais EST un échec d'assertion, donc une morsure, si l'échec lu montre l'appel `expect` avec l'attendu et le reçu. » — « Le délai global d'un test, ou le délai d'une action (`click`, `goto`…), N'EST PAS une morsure. » Le lecteur e2e du harnais n'accepte donc que la forme `Timed out …ms waiting for expect(locator).…` ; un `test timeout`, un `locator.click` ou un plantage sont lus PAS-ASSERTION. ⚠ **Écrit pour ne pas se lire comme plus que cela** : cette règle porte sur un lot qui n'est pas du chemin de l'argent (D325) ; sur le chemin de l'argent, la lecture de R1 reste celle de D304.

⚠ **Ce que cette mesure ne dit pas** : (1) les gardes de la spec qui ne sont mutées par aucune de ces six cibles (la spec compte cinq tests ; chaque test porte plusieurs assertions, dont seules celles que les six mutations font rougir sont mesurées) ; (2) la lisibilité de l'écran, que seul un regard humain mesure (gestes de Ko, `scenarios-ko.md`).
