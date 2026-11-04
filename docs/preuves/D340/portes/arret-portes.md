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

## 3. Résultat du rejeu (03/11/2026 23:49:14 → 04/11/2026 00:10:43, sur `49cd9f9`, le commit de la règle ci-dessus)

**Conditions** (`portes/rejeu-etat-machine.txt`, 40 relevés de 30 s) : **BATTERIE à 40 relevés sur 40**, RAM libre de **1 382 à 3 791 Mo**, `chrome` 12 à 15, `headless_shell` 0 hors de l'e2e (les navigateurs de Playwright, 2 à 13 pendant), arbre propre, aucun port d'e2e occupé au départ. **Code : 0 fichier** sous `apps`, `packages`, `e2e`, `neutralisation` au diff `ec44937..HEAD` (mesuré).

| porte | première passe | rejeu (unique) |
|---|---|---|
| `pnpm test` | code 1 · 532 s · **39** échecs (client 13, pro 26) | code **1** · 452 s · **73** échecs (client 11, pro 62) |
| `pnpm test:e2e` | code 1 · 840 s · **3** échecs, 60 passés, 1 ignoré | code **1** · 824 s · **5** échecs, 58 passés, 1 ignoré |

**`pnpm test` — signatures du rejeu** (la ligne sous chaque × ; 73 ×) : 25 × « Unable to find a label with the text of: Téléphone » ; 23 × « Unable to find an accessible element with the role "button" and name "Le client ne donne ni numéro n… » ; 13 × « Test timed out in 5000ms » ; 4 × « Unable to find a label … E-mail » ; 2 × « Unable to find an element with the text: Étape 2 sur 7 » ; **1 × `AssertionError` : « le bouton « sans coordonnées » : expected false to be true »** ; 1 × « 5 avertissement(s) de console dans un fichier NON exempté » (la garde des plafonds de console) ; 4 × autres « Unable to find … » (un bouton en arabe, un `/15/`, « Demander la suppression », la navigation « Avancement »). **La première passe n'avait AUCUNE `AssertionError`.**
**Ensembles d'échecs, comparés** (titres `FAIL fichier > nom`, tri unique) : première passe **39**, rejeu **73** ; **communs aux deux : 21** ; **seulement à la première passe : 18** ; **seulement au rejeu : 52**.
**Répartition par fichier de test** : un fichier concentre les échecs dans les deux passes — `src/dashboard/walkin-journey.test.tsx` (le parcours « Nouvelle réservation » du pro, où D339 a ajouté le second bouton) : **24 à la première passe, 60 au rejeu** (11 communs, 13 seulement à la première, 49 seulement au rejeu ; **27 des 60 portent « D339 » dans leur titre**) ; puis `booking-request-panel.test.tsx` (8 → 7), `create-venue-page.test.tsx` (2 → 2), `account-settings-view.test.tsx` (1 → 2), `phone-literal-guard.test.ts` (1 → 1), `contact-channel-guard.test.ts` (1 → 1) ; `booking-date-picker.test.tsx` et `bookings-section.test.tsx` (1 chacun) n'échouent qu'à la première passe. *Constat, pas cause* : 27 des 60 échecs de ce fichier au rejeu portent « D339 » dans leur titre, les 33 autres non ; l'un des deux est l'unique `AssertionError`, et il est de D339.

**`pnpm test:e2e` — signatures du rejeu** : 4 × `Timed out 7000ms waiting for expect(locator).toHaveURL` (`r25-demande-reservation:32` — déjà en échec à la première passe —, `r25-lien-connexion:30` variante arabe — la variante française avait échoué à la première passe —, et `r26-parcours-reservation:108` et `:129`, qui avaient PASSÉ à la première passe) ; 1 × `TypeError: fetch failed` ← `Error [ECONNRESET]` (`r42-reservation-email-seul:25` ; à la première passe c'était `r41-fiche-client:65` — même classe D265, autre spec).

## 4. Lecture, appliquée à la règle écrite en 2 (aucune règle n'est inventée ici)

- **Rejeu de `pnpm test` : cas (c)** — « un rouge de signature différente (une `AssertionError`, une autre erreur) ». Conduite fixée : traité comme **possible régression à instruire** ; **aucune inférence « environnement » n'est écrite**. Ce qui est *mesuré* et ce seul : le code est identique à celui de la dernière passe verte (D339) ; les deux passes ne se recouvrent presque pas (21 / 18 / 52) ; une assertion métier apparaît au rejeu (« sans coordonnées ») qui n'existait pas à la première passe. Ce qui n'est **pas établi** : si un test est instable, si un défaut existe, ou ce qui les distingue.
- **Rejeu de `pnpm test:e2e` : cas (b)** — mêmes classes de signatures que la première passe (attente d'URL expirée à 7 000 ms ; `ECONNRESET` au `register` dans le fixture), sur des tests en partie différents. Deux sur deux : **n'est plus un aléa** (leçon du rang 32).
- **Les deux portes sont ROUGES.** Dans tous les documents de ce lot : sans adoucissement, **jamais « verte au rejeu »**.
- **Conduite appliquée (règle 2, (b) et (c))** : aucune spec n'est sortie de la suite, aucun délai n'est monté, **aucune troisième passe** ; la clôture est écrite et **commitée localement dans l'ordre prévu, et NON POUSSÉE** (D270 : « aucun lot ne part dans `main` sous une porte rouge, même quand le rouge vient d'ailleurs »). Local en avance sur `origin/main` : **à la parole de Ko** (`git push`).
- **Ce que cet arrêt NE dit PAS** : que ce lot a cassé quoi que ce soit (il n'a aucun code) ; que les suites sont instables en général ; que la batterie ou la RAM en sont la cause (relevés compatibles, **non établi**, D291).
