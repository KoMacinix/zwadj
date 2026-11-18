# D352 — la mesure de la voie (A) : combien de lectures du refus la liste « Mes salles » déclenche-t-elle ?

**Question** (`docs/preuves/D352/regle-portes.md`, § 1, critère 1) : sur une liste de trois salles non publiées et d'une salle publiée, la carte lit-elle le refus **une** fois par salle non publiée, et **pas davantage** — ni à la relecture silencieuse d'entrée (D331), ni à la relecture VOULUE après une écriture ?

**Instrument** : `zz-diag-r54.test.tsx.txt` (copie du test JETABLE, retiré de `apps/pro` après lecture — il n'est pas dans la suite). Il monte la VRAIE liste (`VenueListPage`) sous `AppProviders` avec un double du client de publication qui compte ses appels. Les chiffres ci-dessous sont **ceux que le test imprime** (lignes `MESURE-1` et `MESURE-2`), pas une estimation.

⚠ **Version du test.** `zz-diag-r54.test.tsx.txt` est la version **FINALE** (celle du second essai). Le premier essai portait un `listMine` qui répondait à l'instant et une enveloppe `Porte` qui montait la liste seulement quand le fournisseur était prêt (donc la démontait pendant le chargement) ; un essai intermédiaire (la liste à 30 ms, mais la même enveloppe) a échoué — « Chargement de vos salles… » n'était jamais à l'écran, la liste étant démontée — et n'est **pas versé** : sa seule sortie est une `AssertionError`, sans mesure.

## Premier essai — NON REPRÉSENTATIF, gardé (`diagnostic-appels-sortie-1.txt`)

`MESURE-1 listMine=2 lectures-du-refus=3` · `MESURE-2 listMine=3 lectures-du-refus avant=3 apres=3`.

⚠ **Le second chiffre ne dit RIEN** : la liste du double répondait à l'instant, React a fusionné l'état « chargement » et l'état « prêt » dans le même rendu, les cartes n'ont donc **jamais été démontées** — l'essai ne reproduisait pas une relecture voulue d'un vrai navigateur (où la liste met du temps à répondre et passe par « Chargement de vos salles… »). Écrit pour ne pas se lire comme « la relecture voulue ne relit pas » : ce n'est pas ce qui a été mesuré.

## Second essai — la liste répond en 30 ms (`diagnostic-appels-sortie.txt`)

`listMine` répond après 30 ms ; le test attend l'apparition de « Chargement de vos salles… » avant de continuer (l'état « chargement » est donc COMMIS, les cartes sont démontées).

| situation | `listMine` | lectures du refus | lecture |
|---|---|---|---|
| à l'entrée : la liste connue est relue EN SILENCE (`revalidate`) | 2 | **3** (a, b, c — jamais la publiée d) | pas de croissance : la relecture silencieuse garde les cartes (même `key`), le crochet ne repart pas |
| après un changement de visibilité : `update` puis `reload()` (passe par « chargement ») | 3 | 3 → **6** | les cartes sont démontées puis remontées, **chacune relit** — mesuré et DIT |

## Ce que cela décide (critère 1)

- Au plus **une** lecture par salle non publiée et par montage de la carte ; **aucune** pour la salle publiée ; **pas de croissance** à la relecture silencieuse d'entrée : **le critère 1 est satisfait**.
- Une relecture VOULUE (`reload`, après une écriture : visibilité, suppression, création) **double** les lectures de la liste — bornées par le nombre de salles non publiées du pro (« un pro a 1 à 3 salles », `venue-list-page.tsx`) ; ce n'est **pas** un motif pour la voie (B), comme `regle-portes.md` l'écrit d'avance.
- **Ce que cette mesure ne dit pas** : le coût réseau réel (aucun navigateur, aucune latence d'API réelle) ; la fréquence de la relecture voulue dans l'usage d'un pro ; l'effet sur l'e2e — mesuré à part (critère 4).
