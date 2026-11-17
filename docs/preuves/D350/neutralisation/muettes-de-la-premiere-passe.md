# D350 — les gardes MUETTES des premières passes, chacune LUE

Une garde muette est une cible dont la mutation n'a fait rougir aucune des mesures qu'on lui avait nommées. **Chacune est lue ici avant d'être corrigée** (la sortie brute, jamais le seul code de sortie : D275, D304). Aucune n'a été « réparée » en affaiblissant le code ou en baissant une barre : sept étaient des défauts de la MESURE, trois du tableau de mesures d'une campagne antérieure que le lot rend sans objet, une est une mutation équivalente retirée par écrit.

## `neutralize-adm2.py`, première passe — 77 sur 84, sept muettes (journal : `campagne-adm2-passe-1.txt`)

| cible | ce que la sortie brute montre | cause | correction |
|---|---|---|---|
| **V-6** | `[api-admin] code 1 · PAS-ASSERTION — première ligne du bloc : ConflictException: admin.errors.venueNotDraft` | le titre attendu désignait un test de BROUILLON : la mutation (`!==` → `===`) refuse le brouillon par une exception levée, pas par une assertion | le titre attendu est le test « une salle PUBLIÉE : 409 VENUE_NOT_DRAFT » ; mesuré à la main avant de l'écrire : sous la mutation il échoue par `AssertionError: expected TypeError… to be an instance of ConflictException`, et le fichier est restauré (`git status` propre) |
| **S-2** | `PAS-ASSERTION … Error: expect(element).not.toHaveAttribute("aria-current")` | la mutation MORD (le test rougit) mais le verdict est un matcher jest-dom, qui échoue en `Error: expect(element)…` et non en `AssertionError` (D316) | verdicts passés en assertion NATIVE (`getAttribute` / `hasAttribute`) dans `admin-shell.test.tsx` |
| **Q-7** | `PAS-ASSERTION … Error: expect(element).toBeDisabled()` | idem | `.disabled` natif, `venue-queue-page.test.tsx` |
| **Q-9** | `PAS-ASSERTION … Error: expect(element).toHaveAttribute("lang", "ar")` | idem | `getAttribute("lang")` / `("dir")` natifs, `venue-queue-page.test.tsx` |
| **P-1** | `PAS-ASSERTION … Error: expect(element).toBeDisabled()` | idem | `.disabled` natif, `venue-review-page.test.tsx` |
| **P-5** | `PAS-ASSERTION … Error: expect(element).toHaveTextContent()` | idem (le préfixe « Refusé : ») | `textContent` contient, natif, `venue-review-page.test.tsx` (trois endroits) |
| **R-5** | `PAS-ASSERTION … Error: expect(element).toHaveAttribute("dir", "auto")` | idem | `getAttribute("dir")` natif, `publication-review.test.tsx` (deux endroits) |

Empreintes sha256 des quatre fichiers de test, avant (`c46dbe7`) et après (`c82126d`) :

| fichier | avant | après |
|---|---|---|
| `apps/pro/src/admin/admin-shell.test.tsx` | `3a3a4e988cdaf3cc014eb3aa65da9e0af26d77eb4b10c1cf4657327a91678d17` | `9f6cd4369b0b9c40e9e3dbd88c7d6e0fed633f4dbef82b3d1e4b3b8ade62c651` |
| `apps/pro/src/admin/venue-queue-page.test.tsx` | `9493db2dd343891092fb4510a0f562a4c50690d4ae5ea8948739a33ffd0499ff` | `a120fb7050d9b76d54b9d9454c6df3cecae4159f057411aef741ec83cda9acde` |
| `apps/pro/src/admin/venue-review-page.test.tsx` | `a164c876f0ea1e519739e7907d883d5e2e8f5297467d84faa0220b3276bf39ef` | `8bdfe48db251e32cc0020c23f1a376c7f62403396aa264b557e76c4047a804f8` |
| `apps/pro/src/venues/publication-review.test.tsx` | `db0be2c03ca3f5298345715e4b5c39337cc16d4bbbeb32b0fe3f615127c301bf` | `d1eb978d0930d193b5a4dbbfdbd32230ab574f55aead4bc320b7979a62533a53` |

Le fichier `neutralisation/neutralize-adm2.py` a changé dans le même commit (le titre de V-6) : la campagne est **rejouée EN ENTIER** (seconde passe : 84 sur 84, 0 muette ; journal : `campagne-adm2-passe-2.txt`, première ligne l'empreinte `777e3613…`, égale à celle du fichier commité).

## `neutralize-adm1.py`, première passe — 69 sur 72, trois muettes (journal : `campagne-adm1-passe-1.txt`)

Les trois sont des cibles de D349 dont **le comportement qu'elles mesuraient est REMPLACÉ par ce lot** (R-3 : un autre motif sur une salle déjà rejetée la CORRIGE au lieu de répondre 409). Les trois sont lues dans la sortie brute : `SANS-TITRE` — la mutation fait bien rougir un autre test, mais pas celui que le tableau de mesures nommait.

| cible | ce que la sortie brute montre | cause | correction |
|---|---|---|---|
| **Q-2** (`REJECTABLE_FROM` élargi à PUBLISHED) | `[file] MORD` ; `[int-moderation] SANS-TITRE — aucun « × » ne porte « rejeter une salle PUBLIÉE est refusé (409 VENUE_NOT_DRAFT) »` | depuis R-3 la LECTURE de tête du statut refuse une salle publiée AVANT le check-and-set : le test nommé ne distingue plus la mutation ; la condition du check-and-set se mesure par la course « publier et rejeter en MÊME TEMPS » (la même que V-7 d'`adm2`, qui mord) | la mesure d'intégration de Q-2 est ré-orientée vers cette course |
| **S-7** (le rejet n'écrit plus sous condition d'un brouillon) | `[service-admin] MORD` ; `[int-moderation] SANS-TITRE … « MD-ADM-4 — rejeter une salle PUBLIÉE est refusé »` ; `[int-moderation#2] MORD` | même absorption pour la première mesure d'intégration ; la course (`#2`) mord | la première mesure d'intégration est retirée, la course est gardée |
| **S-12** (le code d'un refus de correction perdue) | `[service-admin] SANS-TITRE … « un AUTRE motif sur une salle déjà rejetée : 409 VENUE_ALREADY_REJECTED »` | ce test n'existe plus (R-3) ; le code `VENUE_ALREADY_REJECTED` n'est plus rendu que par une correction PERDUE en course (compte 0, le motif est devenu un troisième) | le titre attendu est « et le motif est devenu un TROISIÈME : 409 VENUE_ALREADY_REJECTED » |

Le harnais a changé : la campagne est **rejouée EN ENTIER** (seconde passe : 72 sur 72, 0 muette ; journal : `campagne-adm1-passe-2.txt`).

## `neutralize-r37.py` (campagne existante, « Ma salle ») — trois ancres, puis une mutation équivalente

- **Première passe** (`campagnes-existantes/r37-passe-1.txt`) : le pré-vol s'arrête — `ARBRE NON CONFORME AU DÉPART : P-4, P-5, P-10 : ancre ×0`. Le fournisseur des salles (`pro-venues-context.tsx`) garde maintenant l'identifiant du compte qui a lu la liste (R-7, MD-ADM-10) : trois lignes que ces cibles ancraient ont bougé. **Trois ancres reposées** sur le texte d'aujourd'hui, mêmes mutations. (⚠ `neutralize-r37.py` n'était pas dans la table : déclaré APRÈS son commit par l'extension 4, écart nommé.)
- **Seconde passe** (`r37-passe-2.txt`) : 20 sur 21, **une muette : P-3** (« le drapeau silencieux n'est plus consommé quand aucun PRO n'est connecté »). Lue : depuis que l'état porte `ownerId`, une lecture silencieuse ne garde la liste connue que si le compte est le même ; la mutation ne change plus rien de visible. **Mesuré à la main avant de conclure** : la mutation posée, **toute la suite du Pro** — 56 fichiers, 838 tests — reste verte ; le fichier est restauré (`git status` propre). Une mutation équivalente se retire par écrit (D325) : la cible est retirée avec ce motif, dans le fichier du harnais, et le défaut qu'elle mesurait l'est aujourd'hui par la cible **C-1** d'`adm2`.
- **Troisième passe** (`r37-passe-3.txt`) : 20 sur 20, 0 muette, arbre rendu.

## Ce qu'une muette n'a PAS été

Aucune n'a été une garde « inutile » rangée comme telle : sur les sept d'`adm2`, six mordaient (le test rougissait) et la lecture fermée de la campagne refusait de le compter ; une visait le mauvais test. D305 : sur ce chemin, un verdict s'écrit en assertion native — c'est la forme que les six ont maintenant.
