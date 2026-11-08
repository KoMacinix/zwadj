# D344 — ARRÊT de r32 (`r32-nouvelle-reservation`) — R-3, second cas : l'application d'aujourd'hui contredit la spec

La consigne (R-3) : « Un comportement de l'application qui contredit la spec : tu ne corriges ni l'une ni l'autre, tu arrêtes cette spec et tu rapportes (elle reste dans docs/preuves/). » Ce fichier dit ce qui a été MESURÉ et rien d'autre.

## Ce qui a été mesuré

Départ sans mutation, `e2e/specs/r32-nouvelle-reservation.e2e.ts` = copie de l'archive (4 chemins d'import et 1 paragraphe d'en-tête changés ; empreinte dans `neutralisation-e2e/empreintes.txt`), jouée par la configuration de la suite : **5 tests, 5 rouges** (pièce : `neutralisation-e2e/vert-avant-mutation.txt`, lignes de serveur écartées).

| test de r32 | première ligne du bloc d'échec | où |
|---|---|---|
| 1 « le parcours de bout en bout… » | `Error: Timed out 7000ms waiting for expect(locator).toHaveText(expected)` — attendu 4 lignes : « le prénom est obligatoire », « le nom est obligatoire », « le téléphone est obligatoire », « le nombre d'invités est obligatoire » ; **reçu 1 ligne** : « un numéro de mobile ou une adresse e-mail est obligatoire » | ligne 106 de la copie : `await expect(raisons).toHaveText([W.needFirstName, W.needLastName, W.needPhone, W.needGuests])` |
| 2 « Bloquer la date… » | `TimeoutError: locator.fill: Timeout 15000ms exceeded` — `waiting for getByLabel('Prénom', { exact: true })` | `remplirClient`, ligne 66 |
| 3 « un échec du serveur ne confirme RIEN… » | idem (même appel) | idem |
| 4 « le calendrier du parcours (point 7)… » | idem (même appel) | idem |
| 5 « en ARABE, à 360 px… » | `TimeoutError: locator.getAttribute: Timeout 15000ms exceeded` — `waiting for getByLabel('الاسم', { exact: true })` | ligne 354 |

Lecture : le test 1 échoue sur une **assertion** (attendu et reçu imprimés, ils DIFFÈRENT sur le contenu) ; les tests 2 à 5 échouent sur une **action** qui attend un champ (« Prénom », « الاسم ») **qui n'est pas là au départ** — un délai d'action n'est pas une morsure (D323), mais il n'est pas nécessaire d'en faire une : il dit seulement que le champ cherché n'existe pas à cet endroit. **Rien n'est mesuré au-delà de ce premier écart** : les tests 2 à 5 n'ont pas atteint le devis, la fenêtre ni le calendrier.

## Pourquoi c'est le second cas de R-3 et pas le premier (une ancre périmée)

- **Ce n'est pas un nom accessible renommé ni une adresse déplacée.** L'écran de départ de « Nouvelle réservation » a changé de FORME : l'étape Client est scindée — **l'identifiant (numéro OU e-mail) d'abord, puis les noms** — et « Continuer » n'a plus quatre raisons de blocage mais une (`needIdentifier`, `packages/i18n/messages/fr.json:1300`). La spec attend l'ancien écran : quatre champs visibles d'emblée, quatre raisons, un nombre d'invités dans la même étape.
- **Origine, relevée dans l'historique et non supposée** : `b6856f7` (rang 41, D336, « L35-4 amendé, la fiche client d'un pro (numéro OU e-mail) et le nom sur le devis », arbitré par Ko), puis `260cd5c` (rang 43, D339) et la série `front-client` (FP-1 à FP-3, FC-6) sur le même fichier `apps/pro/src/dashboard/walkin-journey.tsx`. L'écran d'aujourd'hui est celui que `e2e/specs/r41-fiche-client.e2e.ts` et `e2e/specs/r43-devis-brouillon.e2e.ts` jouent déjà dans la suite.
- **Mettre r32 à jour ne serait pas déplacer des ancres** : il faudrait récrire sa saisie (`remplirClient`), sa première série d'assertions (les quatre raisons, la règle du nom, le téléphone refusé, l'espacement, l'ordre « Précédent / Voir le devis ») et vraisemblablement d'autres points que cette mesure n'a pas atteints. C'est écrire une spec du parcours d'aujourd'hui, pas faire revenir celle de D325 — dont les assertions ont été écrites contre un écran que le rang 41 a changé. La consigne ne donne pas cette permission : **la session s'arrête sur cette spec.**

## Ce que cet arrêt ne dit PAS

- Il ne dit pas que les gardes de r32 (espacement, boîte du téléphone LTR, fenêtre après la réponse, hachurage du jour bloqué, « Bloquer la date » écrit ACCEPTED, un échec n'ouvre rien) ont cessé de tenir : **elles ne sont pas mesurées**. Plusieurs ont des tests de composants ; leur couverture dans un navigateur, elle, n'est plus assurée par aucune spec de la suite.
- Il ne dit pas que le défaut de D265 reste présent : D343 est réparé, et r30 (qui traverse le même fixture) passe.

## Ce que le relecteur a à trancher (la session ne le fait pas)

Faire revenir un parcours « Nouvelle réservation » de bout en bout dans la suite est un **lot de test à cadrer** : réécrire la saisie et la première série d'assertions de r32 contre l'écran d'aujourd'hui, ou écrire une spec neuve, ou reporter. Entrée de backlog à écrire (forme D302) : voir `ZWADJ_BACKLOG.md`.
