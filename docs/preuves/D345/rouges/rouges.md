# D345 — les ROUGES, lus contre l'état d'avant (D334, item 5 : ce commit PRÉCÈDE le premier commit de code)

État d'avant = `HEAD` à `942d450` + les commits de documentation de ce lot (table d'ouverture, consigne, lecture adverse) : **aucune ligne de code de produit n'a changé**. Les fichiers de test sont ceux de l'arbre de travail au moment de la lecture ; leur empreinte (sha256 des OCTETS de l'arbre de travail, fins de ligne CRLF comme le dépôt) est donnée ci-dessous. ⚠ Lire ces empreintes sur l'arbre de travail, pas sur un `git show` (D344 : les blobs sont normalisés en LF, l'arbre de travail ne l'est pas).

| Fichier de test joué | sha256 (arbre de travail) |
|---|---|
| `apps/pro/src/dashboard/walkin-draft.test.tsx` (neuf) | `d6d9bfd9bfbb70c9e1c5c6c16885c636eca3848c602e06afb45f2cc263884e86` |
| `apps/pro/src/dashboard/walkin-journey.test.tsx` (neuf matcher « Recommencer » ×3, titres ×6) | `002c54f18636e348f70c19017e25398a6274f98f698f81fc64bd2ef7c1b07ea4` |

## Rouge 1 — `rouge-1-collecte.txt` : le fichier de test tombe à la COLLECTE
`vitest run src/dashboard/walkin-draft.test.tsx` (module pur retiré), sortie 1 : `Failed to resolve import "./walkin-draft"`, `Test Files 1 failed`, `Tests no tests`. ⚠ Selon D304, **ce n'est pas une morsure** (aucune assertion n'a tourné) : c'est la preuve que le module n'existe pas, rien de plus. Les rouges de comportement sont le rouge 2.

## Rouge 2 — `rouge-2-comportement.txt` : le comportement, joué contre le parcours INCHANGÉ
Condition : le seul module pur `apps/pro/src/dashboard/walkin-draft.ts` (sha256 `2ae108218da194c68d02386d0b4b0ae31b5a3dada997c72ac3d5e5817d61c251`) est présent, **non suivi**, pour que le fichier de test se collecte ; **ni le fournisseur, ni le parcours, ni `App.tsx` ne sont modifiés** ; l'étiquette du bouton est encore « Annuler ».
Résultat : **`Tests 7 failed | 26 passed (33)`**, sortie 1 (le fournisseur, `App.tsx`, le parcours et les deux catalogues étaient ramenés à `HEAD` le temps de cette lecture, puis restaurés à l'octet — sha256 vérifiés). Les sept rouges, avec la première ligne de leur assertion :

| # | Test | Première ligne de l'échec | Nature |
|---|---|---|---|
| 1 | à l'étape DATE : on revient à la question de la date… | `expected 'Comment joindre le client ?' to be 'Quelle date ?'` | **AssertionError** — étape perdue |
| 2 | à l'étape CONTACT : le numéro tapé… | `expected '' to be '550000002'` | **AssertionError** — saisie perdue |
| 3 | à l'étape CLIENT : le nom et le nombre d'invités… | `expected 'Comment joindre le client ?' to be 'Qui est le client ?'` | **AssertionError** — étape perdue |
| 4 | R-3 : un devis déjà calculé n'est PAS restauré tel quel… | `expected 'Comment joindre le client ?' to be 'Devis'` | **AssertionError** — étape perdue |
| 5 | par « Recommencer »… | `Unable to find an accessible element with the role "button" and name "Recommencer"` | requête — le bouton s'appelle encore « Annuler » |
| 6 | R-5 : la salle choisie change… | `expected 'Quelle date ?' to be 'Comment joindre le client ?'` | **AssertionError** — l'étape de la salle 1 est montrée sur la salle 2 (voir ci-dessous) |
| 7 | garde de SOURCE (fichiers du brouillon) | `ENOENT: no such file or directory, open '…/walkin-draft-context.tsx'` | le fichier n'existe pas — **pas une morsure** |

⚠ **Lecture honnête** : les rouges 5 et 7 sont une erreur de REQUÊTE et une erreur de fichier (D304 : « × + titre ne prouve pas une assertion ») ; les cinq autres sont des `AssertionError` natives (les tests 3 et 4 ont été écrits pour échouer ainsi : l'étape d'abord, par `toBe`, avant toute requête qui lèverait). Le rouge 6 est le plus parlant : *avant* tout code, le parcours de la salle 2 montre déjà « Quelle date ? » — et ce que le test mesure est établi : un parcours commencé pour la salle 1 est **encore à l'écran, à la même étape**, quand `venue` devient la salle 2. ⚠ **La cause est une INFÉRENCE, non mesurée à part** : le même composant reste monté (même position dans l'arbre) et garde ses `useState` quand seule la prop `venue` change. Si elle est juste, c'est un **défaut réel préexistant** — un créneau ou des prestations de la salle 1 resteraient choisis pour la salle 2. R-5 le couvre : le brouillon d'une autre salle n'est pas montré. Le correctif (une clé par salle) se mesure par le vert de ce test et par sa neutralisation.

**Vingt-six tests passent déjà**, dont ceux qui ne peuvent rougir QU'AVEC un code de persistance (déconnexion, changement de compte, fin de parcours par réservation ou par remise, rechargement) : ils passent **parce qu'aucun brouillon n'existe encore**. Ce vert est creux par construction ; leur morsure est établie par `neutralisation/neutralize-r47.py`, pas par ce rouge.

## Rouge 3 — `rouge-3-bouton.txt` : le libellé « Recommencer » dans le fichier existant
`vitest run src/dashboard/walkin-journey.test.tsx -t "Recommencer"` : `Tests 2 failed | 4 passed | 169 skipped (175)`, sortie 1. Les deux rouges : `Unable to find an accessible element with the role "button" and name "Recommencer"` (le test « remet tout à zéro », et celui de la copie du nom après la remise à zéro). Les quatre verts lisent le libellé dans le catalogue (`FR.reset`) : ils suivent le changement de libellé sans effort.
