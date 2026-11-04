# D340 — l'arrêt des portes, et la règle du rejeu (R-6 de D339), écrite et commitée AVANT son lancement

Pièce du rang 44. Source de la règle : la consigne (section 2, **R-6**) renvoie à **R-6 et R-8 de D339** (`ZWADJ_CONTINUITE.md`, bloc « ARBITRÉ LES 02/11/2026 ET 03/11/2026 PAR KO ») : *un seul rejeu complet, à la main, sa règle écrite avant, les deux passes versées côte à côte, l'état machine relevé avant, pendant (toutes les 30 s) et après.*

## 1. L'arrêt — première passe, chiffres lus sur la sortie brute

**Conditions** (`portes/etat-machine-pendant.txt`, 45 relevés d'une minute) : **BATTERIE à 45 relevés sur 45** (la consigne dit « sur secteur » ; la session ne peut pas brancher la machine), RAM libre de **1 526 à 3 952 Mo**, `headless_shell` 0, `chrome` 12 à 15 (le navigateur de Ko). Départ 22:44:14 sur `8c18e7e`, arbre propre, aucun stash. **Aucun code n'est modifié** par ce lot : `git diff ec44937..8c18e7e --name-only` ne contient que des `.md` d'autorité et des pièces de `docs/preuves/D340/`.

| porte | code | durée |
|---|---|---|
| `pnpm typecheck` | **0** | 139 s |
| `pnpm lint` | **0** | 89 s |
| `pnpm test` | **1** | 532 s |
| `pnpm build` | **0** | 179 s |
| `pnpm test:int` | **0** (619 tests, 40 fichiers) | 956 s |
| `pnpm test:e2e` | **1** | 840 s |

**`pnpm test` : 39 échecs.** Quatre résumés Vitest : 6 fichiers / 59 tests passés ; 71 / 1 096 passés ; **client 6 fichiers en échec sur 30, 13 tests en échec sur 386** ; **pro 2 fichiers en échec sur 41, 26 tests en échec sur 653**. Somme : **148 fichiers, 2 194 tests** — le total exact de D339 (`ZWADJ_CONTINUITE.md`) : c'est la même suite. Les 39 échecs sont dans 8 fichiers de test : `src/dashboard/walkin-journey.test.tsx` (24), `src/components/venue/booking-request-panel.test.tsx` (8), `src/venues/create-venue-page.test.tsx` (2), et un chacun pour `src/lib/phone-literal-guard.test.ts`, `src/lib/contact-channel-guard.test.ts`, `src/components/venue/booking-date-picker.test.tsx`, `src/components/account/bookings-section.test.tsx`, `src/components/account/account-settings-view.test.tsx`.
**Signature lue sous chaque × (D304 : la ligne qui suit l'en-tête)** : **34 × « Test timed out in 5000ms »**, **5 × « Unable to find … »** (une requête Testing Library sans l'élément au bout de son attente), **0 × `AssertionError`**.

**`pnpm test:e2e` : 3 échecs, 1 ignoré, 60 passés (13,8 min)** — `r25-demande-reservation.e2e.ts:32` et `r25-lien-connexion.e2e.ts:30` : `Timed out 7000ms waiting for expect(locator).toHaveURL` (URL reçue : une page de la liste des salles) ; `r41-fiche-client.e2e.ts:65` : `TypeError: fetch failed` ← `Error [ECONNRESET]`, `POST …/auth/register a échoué après 10 ms` (la classe D265, même test et même signature qu'à D339). `r25-lien-connexion` est déjà notée « fragile, route non préchauffée » dans `AGENTS.md` (D325).

**Ce que cette lecture établit et n'établit pas.** *Établi* : aucun échec n'est une assertion métier (0 `AssertionError` au `test` ; l'e2e échoue sur deux attentes d'URL expirées et une connexion réinitialisée) ; l'arbre n'a aucun code différent de la dernière passe verte. *Pas établi* : la **cause**. « Batterie, RAM basse, charge » est une **inférence** (D270, D290) qui s'accorde avec les relevés ; la règle de D291 interdit de l'écrire comme une mesure. Les mêmes porte et suite étaient vertes à D339 **sur secteur**.

## 2. La règle du rejeu — écrite AVANT le lancement

1. **Ce qui est rejoué** : `pnpm test` **EN ENTIER**, puis `pnpm test:e2e` **EN ENTIER**, **une fois chacun**, à la main, par `docs/preuves/D340/portes/rejeu-portes.sh`. `retries` de l'e2e reste à **0**. **Rien d'autre ne change** : ni délai, ni retrait de spec, ni filtre, ni variable d'environnement. Les quatre autres portes ne sont pas rejouées (vertes, aucun fichier n'a bougé).
2. **Mêmes conditions, déclarées** : si la machine est encore sur batterie au départ, le rejeu l'est aussi et le dit ; il n'est **pas** « sur secteur » non plus. Un rejeu vert sur batterie est vert sur batterie.
3. **L'état machine** est relevé juste avant, toutes les 30 s pendant, juste après (`rejeu-etat-machine.txt`).
4. **Lecture du résultat — fixée maintenant** :
   - **(a) les deux portes vertes (0 échec)** : chacune est « **verte AU REJEU** », jamais « verte » seul ; la passe rouge (masquée) et le rejeu se versent **côte à côte** ; tous les documents de clôture écrivent **les deux résultats** ; la clôture se fait et se pousse normalement.
   - **(b) au moins une porte rouge avec les MÊMES signatures** (délai de 5 000 ms ; attente d'URL expirée ; `ECONNRESET`) : **deux sur deux n'est plus un aléa** (leçon du rang 32). La porte est **ROUGE** dans tous les documents, sans adoucissement ; **aucune spec n'est sortie de la suite, aucun délai n'est monté, aucune troisième passe n'est lancée** ; la session écrit sa clôture **et la commite localement dans l'ordre prévu, mais NE LA POUSSE PAS** (D270 : « aucun lot ne part dans `main` sous une porte rouge, même quand le rouge vient d'ailleurs ») ; le rapport dit la conséquence — local en avance sur `origin/main`, `git push` à la parole de Ko — et le contrôle de fin de lot affiche sa famille 1 en **✗**, avec son motif.
   - **(c) un rouge de SIGNATURE DIFFÉRENTE** (une `AssertionError`, une autre erreur) : même conduite que (b), et le rapport le signale comme une **possible régression à instruire** — aucune inférence « environnement » n'est écrite.
5. **Aucun deuxième rejeu, quel que soit le résultat.**

## 3. Résultat du rejeu

*(à compléter après le rejeu, par un commit postérieur à celui de cette règle)*
