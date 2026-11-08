# D345 — les ROUGES, lus contre l'état d'avant (D334, item 5 : ce commit PRÉCÈDE le premier commit de code)

État d'avant = `HEAD` (`a5a7e09`, sur `942d450` + les seuls commits de documentation de ce lot) : **aucune ligne de code de produit n'a changé, aucun fichier neuf du lot n'existe**. Pour chaque lecture, les fichiers du lot (`App.tsx`, `walkin-journey.tsx`, les deux catalogues, le fournisseur, le module de la forme du brouillon) étaient ramenés à `HEAD` ou mis de côté, puis **restaurés à l'octet** (sha256 comparés avant et après, 6 fichiers sur 6 identiques). Les fichiers de test sont ceux de l'arbre de travail ; leur empreinte (sha256 des OCTETS de l'arbre de travail, CRLF comme le dépôt) est donnée ci-dessous. ⚠ Lire ces empreintes sur l'arbre de travail, pas sur un `git show` (D344 : les blobs sont normalisés en LF).

| Fichier de test joué | sha256 (arbre de travail) |
|---|---|
| `apps/pro/src/dashboard/walkin-draft.test.tsx` (neuf, 16 tests) | `763322c52fc9060aa454886bb538dd43617a326272f00667e577b07821366924` |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` (matcher « Recommencer » ×3, titres ×6) | `002c54f18636e348f70c19017e25398a6274f98f698f81fc64bd2ef7c1b07ea4` |
| `e2e/specs/r47-brouillon-onglet.e2e.ts` (neuf, 2 tests) | `836d3220edf5472809df21943ae10b27ffe95a9add787407691e47199073dd30` |

⚠ **Historique honnête de ce fichier de test** : une première version (33 tests, dont 17 sur une règle `brouillonVierge`) a été jouée contre `HEAD`, avec 7 rouges. Elle a ensuite été revue **avant tout code** (quatre assertions rendues natives ; un test des prestations ajouté ; la règle `brouillonVierge`, mesurée équivalente, retirée avec ses tests — voir la section D345 de `ZWADJ_CONTINUITE.md`). **Le rouge ci-dessous est celui du fichier FINAL**, relu entièrement.

## Rouge 2 — `rouge-2-comportement.txt` : le comportement, joué contre le parcours INCHANGÉ
`vitest run src/dashboard/walkin-draft.test.tsx` : **`Tests 8 failed | 8 passed (16)`**, sortie 1. Les huit rouges, avec la première ligne de leur échec :

| # | Test | Première ligne de l'échec | Nature |
|---|---|---|---|
| 1 | à l'étape DATE : on revient à la question de la date… | `expected 'Comment joindre le client ?' to be 'Quelle date ?'` | **AssertionError** — étape perdue |
| 2 | à l'étape CONTACT : le numéro tapé… | `expected '' to be '550000002'` | **AssertionError** — saisie perdue |
| 3 | à l'étape CLIENT : le nom et le nombre d'invités… | `expected 'Comment joindre le client ?' to be 'Qui est le client ?'` | **AssertionError** — étape perdue |
| 4 | R-3 : un devis déjà calculé n'est PAS restauré tel quel… | `expected '' to be 'Contact+213550000002ModifierClientAmi…'` | **AssertionError** — le récapitulatif des réponses est perdu |
| 5 | à l'étape PRESTATIONS : la prestation cochée et la quantité… | `expected 'Comment joindre le client ?' to be 'Quelles prestations ?'` | **AssertionError** — étape perdue |
| 6 | par « Recommencer »… | `Unable to find an accessible element with the role "button" and name "Recommencer"` | requête — le bouton s'appelle encore « Annuler » |
| 7 | R-5 : la salle choisie change… | `expected 'Quelle date ?' to be 'Comment joindre le client ?'` | **AssertionError** — l'étape de la salle 1 est montrée sur la salle 2 (voir ci-dessous) |
| 8 | garde de SOURCE (fichiers du brouillon) | `ENOENT: no such file or directory, open '…/walkin-draft.ts'` | le fichier n'existe pas — **pas une morsure** |

⚠ **Lecture honnête** : les rouges 6 et 8 sont une erreur de REQUÊTE et une erreur de fichier (D304 : « × + titre ne prouve pas une assertion ») ; les six autres sont des `AssertionError` natives. **Le rouge 7 est le plus parlant** : *avant* tout code, le parcours de la salle 2 montre déjà « Quelle date ? » — ce que le test mesure est établi : un parcours commencé pour la salle 1 est **encore à l'écran, à la même étape**, quand `venue` devient la salle 2. ⚠ **La cause est une INFÉRENCE, non mesurée à part** : le même composant reste monté (même position dans l'arbre) et garde ses `useState` quand seule la prop `venue` change. Si elle est juste, c'est un **défaut réel préexistant** — un créneau ou des prestations de la salle 1 resteraient choisis pour la salle 2. R-5 le couvre : le brouillon d'une autre salle n'est pas montré. Le correctif (une clé par salle) se mesure par le vert de ce test et par sa neutralisation (R47-17).

**Huit tests passent déjà**, dont ceux qui ne peuvent rougir QU'AVEC un code de persistance (déconnexion, changement de compte, fin de parcours par réservation ou par remise, rechargement) : ils passent **parce qu'aucun brouillon n'existe encore**. Ce vert est creux par construction ; leur morsure est établie par `neutralisation/neutralize-r47.py`, pas par ce rouge.

## Rouge 3 — `rouge-3-bouton.txt` : le libellé « Recommencer » dans le fichier existant
`vitest run src/dashboard/walkin-journey.test.tsx -t "Recommencer"` : `Tests 2 failed | 4 passed | 169 skipped (175)`, sortie 1. Les deux rouges : `Unable to find an accessible element with the role "button" and name "Recommencer"` (le test « remet tout à zéro », et celui de la copie du nom après la remise à zéro). Les quatre verts lisent le libellé dans le catalogue (`FR.reset`) : ils suivent le changement de libellé sans effort.

## Rouge 4 — `rouge-4-e2e.txt` : la spec e2e, jouée contre l'écran d'AUJOURD'HUI sans la fonctionnalité
`playwright test specs/r47-brouillon-onglet.e2e.ts` (la configuration de la suite, préchauffage compris, serveurs de développement), **`2 failed · 1 passed`** (le « passed » est le préchauffage) : les DEUX tests de la spec échouent à leur première assertion de retour, **web-first, avec l'attendu et le reçu** (une morsure sous D323) :
- (fr) `Expected string: "Qui est le client ?"` · `Received string: "Comment joindre le client ?"` — message « la même étape » ;
- (ar) `Expected string: "من هو الزبون؟"` · `Received string: "كيف نتواصل مع الزبون؟"` — message « la même étape ».
⚠ La pièce est **masquée** (4 suites de forme jeton, d'une base jetable, remplacées : `masquer-jetons.py`, copie à l'octet de celui de D344, archivé à côté de la pièce `docs/preuves/D345/portes/`) ; le brut est gardé hors dépôt.
