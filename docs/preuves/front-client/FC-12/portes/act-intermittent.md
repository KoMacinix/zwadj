# FC-12 — l'échec INTERMITTENT de la première passe de `pnpm test` : mesuré, sa cause lue, rapporté (pas corrigé ici)

## Ce qui est tombé (première passe, `portes/test.txt`)
`apps/client/src/components/account/account-settings-view.test.tsx` — « profil CLIENT — le téléphone (facultatif) est le champ partagé :
mobile seulement > ⚠ un premier chiffre refusé reste SEUL avec son message — un fixe ne se tape pas » : la garde des sorties console
(`test-setup.ts`), « AssertionError: 5 avertissement(s) de console dans un fichier NON exempté » — « An update to BookingsSection inside a
test was not wrapped in act(...) » ×2, « … VisitBookingsSection … » ×1 (les trois premiers sur cinq, imprimés par la garde).
⚠ Ce fichier n'est PAS touché par ce lot, et il n'a JAMAIS été exempté : avant comme après FC-9, son premier avertissement le fait tomber.

## Mesuré ensuite, sur le même arbre
| mesure | résultat |
|---|---|
| le fichier SEUL, 10 passes (`npx vitest run src/components/account/account-settings-view.test.tsx`) | 10 sur 10 vertes (10 tests chacune) |
| la suite CLIENT entière, 3 passes (`npx vitest run`, `apps/client`) | 3 sur 3 vertes (488 tests) |
| le REJEU UNIQUE de la porte (`pnpm test`, racine — les quatre suites en parallèle) | vert (`portes/test-rejeu.txt`) |

## La cause — lue dans le test
Le test attend le CHAMP du téléphone (`await screen.findByLabelText(…)`), puis rend la main ; la page de compte monte aussi
`BookingsSection` et `VisitBookingsSection`, qui chargent leurs listes en asynchrone. D'ordinaire elles se posent avant la fin du test ;
quand elles se posent APRÈS, c'est hors `act`, et la garde tombe. ⚠ *Inférence, NON mesurée* : que la charge de `pnpm test`
(quatre suites en parallèle) en soit le déclencheur — le fichier n'est tombé qu'une fois, dans la passe racine, et jamais seul. C'est la faute que FC-9
a corrigée dans la fiche de salle (attendre l'état FINAL avant de rendre la main), sur un fichier où elle ne se voit qu'au gré du
minutage — les trois passes de relevé de FC-9 ne l'avaient pas montrée.

## Ce que la session en fait — décision prise seule, dite pour Ko
- **Rapporté, pas corrigé dans ce lot** (un défaut croisé ne se corrige pas dans un lot qui parle d'autre chose — CLAUDE.md) ; la
  correction est de la forme de FC-9 : que ces tests attendent l'état final des deux sections (« à ordonner par Ko »).
- **La porte est « verte AU REJEU »** (précédents D338, D339) ; la règle d'arrêt de la consigne (« une porte rouge sur du code que tu
  n'as pas touché ») aurait joué si le rejeu avait été rouge.
