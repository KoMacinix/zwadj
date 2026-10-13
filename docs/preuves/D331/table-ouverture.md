# D331 — rang 37 — table d'ouverture

Lot : **L35-1, « Ma salle »** (rang 37, arbitré par Ko le 13/10/2026 : « 6. Rang 37 : L35-1, « Ma salle ». Lot de code. »). C'est un **lot de CODE** : il **compte** dans le compteur de lots de code non certifiés (D283 amendé par D292 : un lot qui touche du code, un test, un harnais ou une spec e2e compte). Compteur à l'ouverture : **ZÉRO** (marque de D330) ; à la clôture : **UN**. Règle de D270 : deux lots non certifiés sont tenables, un troisième ne l'est pas — le compteur à UN laisse **un** lot de code de plus tenable avant une certification. **Méthode : NORMALE** (décision 4 du cadrage de D328, § 5 ; règle de D325 : le lot ne touche ni le paiement, ni un montant calculé ou enregistré par le serveur, ni un statut de réservation ou de devis ; il AFFICHE un montant reçu du serveur — la liste — et la règle des montants en tient compte : un test prouve que le montant affiché est celui du serveur).

- **SHA de départ** : `afdfcb1` (clôture de D330). `HEAD` = `origin/main` après `git fetch` (les deux = `afdfcb1bebc3fb461d6a45cc213fda7005999e47`), arbre propre, aucun stash, branche `main`.
- **Numéro** : D331 — pris en lisant la dernière ligne du registre de `ZWADJ_CONTINUITE.md` (D330) ; `git grep -w D331` : 0 occurrence (la chaîne « D331 » figure une fois dans `pnpm-lock.yaml:1213`, **au milieu d'une somme de contrôle** « …N97gTD331weR1… » : ce n'est pas un numéro de décision).
- **Ordre des commits de ce lot** (règle de `AGENTS.md`, D328) : (1) ce fichier, SEUL ; (2) la sortie de la lecture adverse (instrument, sortie), puis la première passe D277, **avant toute écriture d'autorité** ; (3) les `.md` d'autorité, **les arbitrages de Ko en première écriture, mot pour mot, seuls dans leur commit**, puis les décisions du relecteur ; la table « Fichiers attendus » y est recopiée à l'identique ; (4) **toute extension** : un commit propre qui l'ajoute ICI, avec son motif, AVANT le commit du fichier qu'elle couvre ; (5) le code et ses tests viennent APRÈS ce commit : les modes de défaillance ci-dessous sont écrits **avant la première ligne de code**.
- **Pourquoi des extensions sont PRÉVUES** : les pièces des portes, des campagnes, des captures et des lectures portent des noms qui **dépendent de la mesure**. Elles sont déclarées **en chemins complets, un par un**, par des extensions commitées avant leur versement — jamais par un préfixe (un préfixe rend « 0 non déclaré » vrai par construction : constat P-C1 de D328).

## Ce que le lot fait, et ce qu'il ne fait pas

**Le défaut** (D327, relevé 4, reproduit dans un navigateur — `docs/preuves/D327/releve/ma-salle/mesures-ma-salle.txt` ; cadrage de D328, M-23) : la liste « Ma salle » vit dans `ProVenuesProvider` (UNE source, D78). Elle n'est relue qu'à la **connexion**, à la **création** (D326) et depuis la **liste elle-même**. Elle est **périmée** après : **l'édition** (S4 ; la création suivie d'une correction dans la même session, S8), **la publication par l'administrateur** (S5), **la suppression depuis l'assistant** (S6). La création seule n'est **pas** reproduite (S1, S2, S3).

**Le correctif** (rien d'autre) :
1. **édition** : après un enregistrement RÉUSSI du formulaire général de l'assistant, le fournisseur relit la liste ;
2. **suppression depuis l'assistant** : après une suppression RÉUSSIE, le fournisseur relit la liste ;
3. **entrée de la liste** : à l'arrivée sur « Ma salle », le fournisseur relit la liste (décision 2 du relecteur : aucun écran administrateur n'existe, la publication est faite dans une autre session ; **la relecture se fait à l'ENTRÉE de la liste, prouvée par l'e2e, et non par Ko**) — **sans masquer la liste connue** pendant la relecture, et **sans tirer une requête de plus** que la lecture de démarrage quand celle-ci est en cours (le test e2e `A2` compte **1** requête pour l'entrée à froid sur `/salles`) ;
4. **le faux serveur de `create-venue-page.test.tsx`** est corrigé : il enregistrait la salle **au moment de l'appel**, avant de répondre ; un faux serveur honnête n'enregistre qu'**à la réponse**, et la liste n'est lue qu'à l'état du serveur au moment de la lecture.

**Ce que le lot ne fait pas** : aucune migration ; **aucun contrat d'API neuf** (si le correctif en exigeait un, il s'arrêterait et demanderait) ; aucun écran administrateur ; aucune relecture à l'entrée des écrans globaux (tableau de bord, demandes, calendrier, réservations) ; la sélection de salle reste en mémoire ; le PDF, la numérotation, la fiche client, la vérification du téléphone (L35-2 à L35-7) ne sont pas touchés ; le chemin de l'argent est en pause et n'est pas touché.

## Fichiers attendus — chemins COMPLETS

| fichier | pour |
|---|---|
| `docs/preuves/D331/table-ouverture.md` | cette table (premier commit, seul) |
| `docs/preuves/D331/lecture-adverse/confronter-d330.py` | l'instrument de la lecture adverse de D330 |
| `docs/preuves/D331/lecture-adverse/confronter-sortie.txt` | sa sortie, versée avant toute écriture d'autorité |
| `docs/preuves/D331/passe-d277/balayage.py` | la passe D277, les deux sens (copie à l'octet de celle de D330) |
| `docs/preuves/D331/passe-d277/motifs.txt` | ses motifs |
| `docs/preuves/D331/passe-d277/balayage-1-AVANT-ECRITURE.txt` | sa première passe, avant toute écriture d'autorité |
| `docs/preuves/D331/passe-d277/balayage-final.txt` | sa dernière passe |
| `docs/preuves/D331/audit-secrets-d331a.txt` | audit de secrets scellé, avant les pièces de code |
| `docs/preuves/D331/tri-audit-d331a.txt` | son tri différentiel contre la dernière sortie scellée |
| `docs/preuves/D331/audit-secrets-d331b.txt` | dernier audit scellé, après la dernière écriture |
| `docs/preuves/D331/tri-audit-d331b.txt` | son tri différentiel |
| `docs/preuves/D331/rouge/rouge-edition.txt` | le rouge LU du chemin « édition », contre l'état d'avant (D231) |
| `docs/preuves/D331/rouge/rouge-suppression.txt` | le rouge LU du chemin « suppression depuis l'assistant » |
| `docs/preuves/D331/rouge/rouge-entree.txt` | le rouge LU du chemin « entrée de la liste » (publication par l'administrateur) |
| `docs/preuves/D331/rouge/temoin-creation-avant-correctif.txt` | le témoin du chemin « création » : D327 ne l'a pas reproduit ; la lecture dit ce que le test à faux serveur honnête rend contre l'état d'avant (vert attendu — la création relit déjà) |
| `apps/pro/src/shell/pro-venues-context.tsx` | le fournisseur : la relecture d'ENTRÉE, silencieuse, sans cascade |
| `apps/pro/src/venues/venue-list-page.tsx` | la liste demande la relecture à son entrée |
| `apps/pro/src/venues/edit-venue-page.tsx` | l'assistant demande la relecture après un enregistrement réussi et après une suppression réussie |
| `apps/pro/src/test-support/client-doubles.ts` | le faux serveur HONNÊTE (un seul endroit pour les doubles du client des salles) |
| `apps/pro/src/venues/create-venue-page.test.tsx` | le test de création, sur le faux serveur honnête |
| `apps/pro/src/venues/ma-salle-relecture.test.tsx` | NOUVEAU — un test par chemin (édition, suppression, entrée), la course, la cascade sous `StrictMode`, la garde de SOURCE « une seule source » |
| `apps/pro/src/shell/pro-venues-context.test.tsx` | les cas du fournisseur : relecture d'entrée silencieuse, échec conservé, réponse malformée, course, session |
| `e2e/specs/r37-ma-salle.e2e.ts` | NOUVEAU — l'e2e des chemins, dont la publication à l'entrée de la liste |
| `e2e/specs/a2-mount-effects.e2e.ts` | la garde A2 de l'aller-retour SPA : **0 requête → 1** (la relecture d'entrée), avec la raison écrite |
| `neutralisation/neutralize-r37.py` | NOUVEAU — le harnais de neutralisation du lot |
| `ZWADJ_CONTINUITE.md` | arbitrages de Ko du 13/10 (première écriture), décisions du relecteur, ordre des rangs, point d'entrée du rang 37, section D331, bloc D331 de la méthode, critère du rang 9 annoté, registre |
| `AGENTS.md` | la règle permanente des fichiers `.env` ; la porte dure `headless_shell` ; l'annotation de la chaîne du compteur (rang 37, ZÉRO → UN) ; passe D277 |
| `ZWADJ_BACKLOG.md` | « Reports du 13/10/2026 — rang 37 » ; entrée de la RAM fermée avec renvoi ; la condition de clôture (le constat de Ko) ; limites et entrées annotées |

### Fichiers CONDITIONNELS — créés ou modifiés seulement si le cas se produit, sinon dits absents au rapport

| fichier | condition |
|---|---|
| `docs/preuves/D331/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt` | la première passe de l'instrument porte un ✗ qui est un défaut de l'instrument (patron de D327, D328, D329, D330) |
| `docs/preuves/D331/lecture-adverse/defauts-instrument.txt` | un tel défaut est trouvé |
| `apps/pro/src/venues/create-venue-page.tsx` | le faux serveur honnête REND ROUGE le chemin de création (la relecture partirait avant l'enregistrement) — le correctif est alors dans ce fichier |
| `apps/pro/src/venues/venue-list.test.tsx` | la relecture d'entrée change un compte d'appels `listMine` que ce fichier assertait |
| `apps/pro/src/venues/slots-section.test.tsx`, `apps/pro/src/venues/services-section.test.tsx` | idem : ils montent `ProVenuesProvider` (relevé : `grep` de `ProVenuesProvider` dans `apps/pro/src`) ; fichier par fichier, par extension |
| `neutralisation/neutralize-r33.py`, `neutralisation/neutralize-r32.py`, `neutralisation/neutralize-r30.py` | une ancre de cible est périmée par ce diff (leçon D286 : une ancre se revérifie à chaque refonte) ; fichier par fichier, par extension, avec la mesure qui le prouve |
| `e2e/specs/a5-cold-reload-vs-spa.e2e.ts` | la relecture d'entrée casse la parité à froid / SPA de la liste (relevé : la table des appels « possédés par la coquille ») |
| `e2e/fixtures/harness.ts` | un auxiliaire de l'e2e (compte administrateur, publication) est nécessaire et ne peut pas vivre dans la spec |
| `docs/preuves/D331/aucune-valeur-reelle.txt`, `docs/preuves/D331/aucun-cookie-reel.txt` | un journal à valeurs réelles est versé (le journal e2e brut porte des jetons) : les contrôles « 0 valeur réelle » de D299 et D315 ont alors un objet |

*(Un diagnostic NON certifiant, s'il est nécessaire, se déclare lui aussi par extension, fichier par fichier : aucune ligne de cette table ne nomme un répertoire.)*

### Fichiers à déclarer PAR EXTENSION, en chemins complets, avant leur versement

| famille | contenu |
|---|---|
| les portes | `docs/preuves/D331/portes/<porte>.txt` : les six portes, avec leurs chiffres, **extraits** (jamais le journal brut des suites qui portent des jetons) |
| les campagnes | `docs/preuves/D331/neutralisation/` : la sortie de `neutralize-r37.py` et des campagnes que le diff touche (`lancer-campagnes.py`), lues |
| les captures | `docs/preuves/D331/navigateur/` : le script de capture, sa configuration, ses images (FR et AR, à 1 280 et 360 px) et ses mesures |
| les lectures | tout autre relevé fait pendant le lot (le journal des appels réseau de l'entrée à froid, la lecture de l'e2e) |

### Extensions de la table

Chaque extension s'ajoute ici, dans un commit propre, avec son motif, AVANT le commit du fichier qu'elle couvre. *(Aucune à l'ouverture.)*

#### Extension 1 — la copie de la version d'origine du premier commit de D330

*Motif* : la lecture adverse de D330 (constat P-C2, fait pendant ce lot) trouve que la faute n° 1 de D330 — « le premier commit a été réécrit (`git commit --amend`) avant toute poussée ; ce qui prouvait la faute n'existe plus dans `git` » — est vraie de l'histoire et du distant, et **fausse de la base d'objets locale** : le commit d'origine (`0b74877`) y est encore, retenu par le reflog, qui expire. La copie est versée pour que la preuve ne dépende plus d'un reflog. *Une seule ligne, un seul fichier, déclarée AVANT son versement.*

| fichier | pour |
|---|---|
| `docs/preuves/D331/lecture-adverse/d330-table-avant-amend-0b74877.md` | copie, octet pour octet, de `docs/preuves/D330/table-ouverture.md` à `0b74877` (la version d'origine, avec sa ligne de répertoire à la ligne 36), lue par `git show 0b74877:docs/preuves/D330/table-ouverture.md` |

#### Extension 2 — les pièces des rouges, des verts et leur extracteur (déclarées AVANT leur versement)

*Motif* : la table de base déclare les quatre extraits de rouge (`rouge-edition.txt`, `rouge-suppression.txt`, `rouge-entree.txt`, `temoin-creation-avant-correctif.txt`) ; elle ne déclarait ni **l'outil** qui les extrait des journaux bruts (les journaux de vitest portent des centaines de lignes de DOM, hors dépôt), ni les **verts** correspondants (« chaque chemin avec son rouge lu ET son vert »). L'extracteur est versé avec ses calibrations (cas vrai, cas faux) ; les verts sont extraits par le même outil, sur les mêmes titres.

| fichier | pour |
|---|---|
| `docs/preuves/D331/rouge/extraire-rouge.py` | l'extracteur : titres et verdicts d'un journal vitest, première ligne et cadre de code de chaque échec, calibré sur un cas vrai et un cas faux ; sa sortie dit ce qu'il a parcouru et l'attendu à côté |
| `docs/preuves/D331/vert/vert-edition.txt` | le vert du chemin « édition » (mêmes tests que `rouge-edition.txt`), après le correctif |
| `docs/preuves/D331/vert/vert-suppression.txt` | le vert du chemin « suppression depuis l'assistant » |
| `docs/preuves/D331/vert/vert-entree.txt` | le vert du chemin « entrée de la liste » |
| `docs/preuves/D331/vert/vert-creation.txt` | le vert du chemin « création », après le correctif (le témoin était vert avant) |

#### Extension 3 — les pièces des portes, des campagnes et des captures (déclarées AVANT leur versement, en chemins complets)

*Motif* : la table de base nommait ces familles (« les portes », « les campagnes », « les captures ») sans en écrire les chemins ; la règle exige des chemins COMPLETS, un par un, avant le versement. Les 16 images sont l'ensemble {création, édition, suppression, publication} × {français, arabe} × {1 280, 360 px}.

| fichier | pour |
|---|---|
| `docs/preuves/D331/navigateur/ma-salle.capture.ts` | la sonde : les quatre chemins, jouée en français et en arabe, à 1 280 et 360 px, sans rechargement (un témoin sur `window` le prouve à chaque image) |
| `docs/preuves/D331/navigateur/playwright.capture.config.ts` | sa configuration (mêmes ports dédiés, même base jetable que l'e2e) |
| `docs/preuves/D331/navigateur/mesures-ma-salle.txt` | les lignes `MESURE …` de la sonde : ce que la liste affiche, le mot du menu, le témoin « document non rechargé » |
| `docs/preuves/D331/navigateur/images/creation-fr-1280.png` | la liste « Ma salle » après la création, français, 1280 px |
| `docs/preuves/D331/navigateur/images/creation-fr-360.png` | la liste « Ma salle » après la création, français, 360 px |
| `docs/preuves/D331/navigateur/images/creation-ar-1280.png` | la liste « Ma salle » après la création, arabe, 1280 px |
| `docs/preuves/D331/navigateur/images/creation-ar-360.png` | la liste « Ma salle » après la création, arabe, 360 px |
| `docs/preuves/D331/navigateur/images/edition-fr-1280.png` | la liste « Ma salle » après l'édition (nom et prix modifiés), français, 1280 px |
| `docs/preuves/D331/navigateur/images/edition-fr-360.png` | la liste « Ma salle » après l'édition (nom et prix modifiés), français, 360 px |
| `docs/preuves/D331/navigateur/images/edition-ar-1280.png` | la liste « Ma salle » après l'édition (nom et prix modifiés), arabe, 1280 px |
| `docs/preuves/D331/navigateur/images/edition-ar-360.png` | la liste « Ma salle » après l'édition (nom et prix modifiés), arabe, 360 px |
| `docs/preuves/D331/navigateur/images/suppression-fr-1280.png` | la liste « Ma salle » après la suppression depuis l'assistant (une salle restante), français, 1280 px |
| `docs/preuves/D331/navigateur/images/suppression-fr-360.png` | la liste « Ma salle » après la suppression depuis l'assistant (une salle restante), français, 360 px |
| `docs/preuves/D331/navigateur/images/suppression-ar-1280.png` | la liste « Ma salle » après la suppression depuis l'assistant (une salle restante), arabe, 1280 px |
| `docs/preuves/D331/navigateur/images/suppression-ar-360.png` | la liste « Ma salle » après la suppression depuis l'assistant (une salle restante), arabe, 360 px |
| `docs/preuves/D331/navigateur/images/publication-fr-1280.png` | la liste « Ma salle » après la publication faite ailleurs, français, 1280 px |
| `docs/preuves/D331/navigateur/images/publication-fr-360.png` | la liste « Ma salle » après la publication faite ailleurs, français, 360 px |
| `docs/preuves/D331/navigateur/images/publication-ar-1280.png` | la liste « Ma salle » après la publication faite ailleurs, arabe, 1280 px |
| `docs/preuves/D331/navigateur/images/publication-ar-360.png` | la liste « Ma salle » après la publication faite ailleurs, arabe, 360 px |
| `docs/preuves/D331/portes/typecheck.txt` | `pnpm typecheck` : code, nombre de tâches « Done », erreurs TS — extrait, avec ce qu'il a parcouru et l'attendu à côté |
| `docs/preuves/D331/portes/lint.txt` | `pnpm lint` — extrait, avec ce qu'il a parcouru et l'attendu à côté |
| `docs/preuves/D331/portes/test.txt` | `pnpm test` : les quatre résumés vitest — extrait, avec ce qu'il a parcouru et l'attendu à côté |
| `docs/preuves/D331/portes/build.txt` | `pnpm build` — extrait, avec ce qu'il a parcouru et l'attendu à côté |
| `docs/preuves/D331/portes/test-int.txt` | `pnpm test:int` : résumé — extrait, avec ce qu'il a parcouru et l'attendu à côté |
| `docs/preuves/D331/portes/e2e.txt` | `pnpm test:e2e` : résumé (le journal brut n'entre pas) — extrait, avec ce qu'il a parcouru et l'attendu à côté |
| `docs/preuves/D331/portes/etat-machine.txt` | l'état de la machine aux portes : source d'alimentation (secteur / batterie), `chrome`, `headless_shell`, `node`, RAM libre |
| `docs/preuves/D331/neutralisation/r37-campagne.txt` | la sortie de `neutralize-r37.py`, lue : une ligne par cible, la première ligne du bloc d'échec de chaque mesure |
| `docs/preuves/D331/neutralisation/campagnes-touchees.txt` | la sortie de `lancer-campagnes.py` : les campagnes que le diff touche, jouées et lues |
| `docs/preuves/D331/neutralisation/e2e-a-la-main.txt` | la neutralisation À LA MAIN des specs e2e (la relecture d'entrée retirée), sortie lue : ce qu'aucun test de composant ne voit |

#### Extension 4 — la cible C-1 de `neutralize-r33.py` est périmée par ce lot (déclarée AVANT la modification du harnais, en chemins complets)

*Motif* : la famille conditionnelle de la base nommait `neutralisation/neutralize-r33.py` « si une ancre est périmée par ce diff ». **Elle l'est, et ce n'est pas une ancre : c'est un TITRE.** La cible C-1 de ce harnais retire `reloadVenues();` de `create-venue-page.tsx` et exige que le test « après la création, une navigation INTERNE vers la liste montre la nouvelle salle » rougisse. Rejouée en mode découverte sur le test réécrit (`R33_DECOUVERTE=1 R33_FILTRE='C-'`, rien n'est écrit par ce mode), **ce test ne rougit plus** : la liste relit désormais à son entrée (décision de Ko du 13/10/2026), donc la navigation interne montre la salle créée même sans la relecture qui suit la création. Ce sont **deux autres tests** du même fichier qui rougissent — « le fournisseur RELIT la liste après la création… » et « ⛔ la relecture part APRÈS la réponse de `create`… » : `AssertionError: expected "spy" to be called 2 times, but got 1 times`. La cible mord toujours ; **c'est le titre attendu qui n'est plus celui qui rougit** — exactement le cas que le harnais appelle « SANS-TITRE » (le titre attendu n'échoue pas, un autre si). Le harnais lit les titres, il ne les devine pas : la cible se **réoriente**, par écrit (« une cible devenue sans objet se réoriente ou se retire, par écrit », `AGENTS.md`), avec les deux titres relevés par la découverte — aucun écrit de mémoire. ⚠ *Le tri `lancer-campagnes.py` n'a PAS retenu `neutralize-r33.py` pour ce diff* (ses mesures se déclarent relativement au paquet, `src/venues/create-venue-page.test.tsx`, que le croisement avec `git diff --name-only` ne rapproche pas d'un chemin de la racine) : **angle mort du tri, rapporté au backlog, non corrigé dans ce lot** (un défaut croisé se rapporte).

| fichier | pour |
|---|---|
| `neutralisation/neutralize-r33.py` | la cible C-1 : le titre attendu de la mesure `pro-creation` devient les deux titres que la découverte a relevés (une ligne) |
| `docs/preuves/D331/neutralisation/r33-c1-decouverte.txt` | la sortie de la découverte qui a montré le titre périmé (le test nommé ne rougit pas ; deux autres, si) |
| `docs/preuves/D331/neutralisation/r33-campagne.txt` | la campagne `neutralize-r33.py` rejouée en entier après la réorientation, lue : une ligne par cible, mordues / muettes / non mesurées |

## Modes de défaillance — écrits AVANT toute ligne de code

Chacun nomme ce qui peut mal tourner, le test qui le mesure, et le sort de la cible de neutralisation. Aucune valeur attendue ne s'écrit de mémoire : les textes d'écran sont relevés dans `packages/i18n/messages/fr.json`, les montants viennent du formateur partagé (`formatDZD`).

| id | mode de défaillance | mesure prévue |
|---|---|---|
| **F-1** | **édition** : un enregistrement réussi ne fait pas relire la liste ; la carte, le libellé du menu et la salle courante restent ceux d'avant (S4, S8) | test d'assistant : la liste relue après `update` montre le nom et le prix **du serveur** ; rouge d'abord |
| **F-2** | **suppression depuis l'assistant** : la salle supprimée reste dans la liste, le libellé reste au pluriel, la salle courante reste la supprimée (S6) | test : après `softDelete` réussi, la liste ne la contient plus ; rouge d'abord |
| **F-3** | **entrée de la liste** : une salle publiée (ou modifiée) dans une autre session n'apparaît pas tant que la page n'est pas rechargée (S5) | test : le serveur change SANS requête du client, l'entrée dans la liste montre le nouvel état ; rouge d'abord |
| **F-4** | **création** : le faux serveur enregistre au moment de l'appel ; une relecture partie AVANT la réponse verrait quand même la salle — le test ne distingue pas « relire après » de « relire avant » | le faux serveur honnête enregistre à la réponse ; une cible de neutralisation fait partir la relecture avant `await create` : le test doit rougir |
| **F-5** | une relecture lancée par l'**entrée** produit **deux requêtes** sous `StrictMode` (le montage est doublé en développement) ou **deux requêtes de démarrage** quand la page d'entrée est `/salles` | test unitaire sous `StrictMode` : exactement une requête par entrée ; e2e `A2` : 1 à froid sur `/salles`, 1 par aller-retour SPA |
| **F-6** | l'entrée relit **alors que la lecture de démarrage est en cours** (état `loading`) ou **alors que l'état est `error`** : une cascade, ou un contournement du bouton « Réessayer » | test : aucune requête de plus dans ces deux états |
| **F-7** | l'entrée **masque la liste** (« Chargement… ») à chaque visite, et le libellé « Ma salle / Mes salles » clignote | test : pendant la relecture d'entrée l'état reste `ready` et le compte ne bouge pas |
| **F-8** | **course** : la réponse tardive d'une relecture d'entrée écrase le résultat plus frais d'une relecture demandée après une écriture | test : réponses retenues puis relâchées dans l'ordre inverse ; la dernière relecture demandée gagne |
| **F-9** | un **échec** de la relecture d'entrée remplace une liste valide par l'état `error` ; une **réponse malformée** (non-tableau) la remplace par une liste VIDE — un compte faux présenté comme un fait (D133, D142) | tests : l'échec et la réponse malformée **conservent** la liste connue ; ⚠ le chargement voulu (démarrage, « Réessayer », après écriture) garde son comportement (D120 : non-tableau ⇒ liste vide ; échec ⇒ `error`) |
| **F-10** | un **échec** de la relecture voulue (après écriture) est avalé : l'écran dit « à jour » ce qu'il ne sait pas | test : après `update` réussi puis `listMine` en échec, l'état est `error` avec « Réessayer » |
| **F-11** | **une relecture pour rien** : un diff vide, un enregistrement en échec (400, 404), une suppression en échec relisent la liste | tests : zéro appel `listMine` de plus dans ces trois cas (la suppression en échec ne navigue pas non plus) |
| **F-12** | **session** : le drapeau « silencieux » d'une session reste armé et la première lecture de la session suivante ne masque pas la liste d'un autre compte | test : un drapeau armé puis une déconnexion et une reconnexion ⇒ la lecture de la nouvelle session est visible (`loading`) |
| **F-13** | un visiteur non connecté ou un non-PRO déclenche `GET /pro/venues` à l'entrée de la liste (famille D115) | test : aucune requête tant qu'aucun PRO n'est connecté |
| **F-14** | **deux sources** : une page garde sa propre copie de la liste (le défaut que D78 a déjà payé) ; le libellé et la liste divergent | garde de SOURCE : aucune des trois pages n'appelle `listMine` ; tout passe par `useProVenues` |
| **F-15** | la garde A2 « 0 requête à l'aller-retour SPA » devient **fausse** ; la laisser telle quelle fait rougir une suite pour la bonne raison, la supprimer fait perdre la mesure de la cascade | l'assertion passe de **0 à 1**, **avec la raison écrite** ; le témoin « le document n'a pas été rechargé » reste avant toute autre assertion |
| **F-16** | l'e2e est **vert pour une autre raison** : la liste est rechargée par `page.reload()` ou par `page.goto` | l'e2e pose le témoin `markPage` / `pageStillAlive` AVANT chaque lecture et n'utilise que des navigations SPA (`spaNavigate` ou un clic) |

⚠ **Limite écrite d'avance** : les autres écrans qui modifient une salle — créneaux, prestations, acompte, photos, visite virtuelle — **ne déclenchent pas** de relecture ; la liste les reprend à l'entrée de la liste. Le panneau gauche du tableau de bord et le sélecteur de salle des écrans globaux ne sont donc rafraîchis, après une telle modification, qu'à la prochaine entrée dans « Ma salle ». C'est ce que M-23 demande (création, édition, publication, suppression) et rien de plus.

## Les trois scénarios que Ko aura à constater — écrits AVANT le code (décision 1 du relecteur)

**Pourquoi Ko, et pourquoi avant le code** : à D326, un test vert disait « Ma salle réparée » parce que son faux serveur fabriquait la salle avant de répondre ; **c'est Ko qui a reproduit le défaut**. Un test vert ne clôt donc pas ce lot : **le lot est clos sur le code, la condition de clôture reste OUVERTE jusqu'au constat de Ko** dans un navigateur, pour les trois chemins ci-dessous (précédent du rang 33). La **publication** n'a pas de scénario pour Ko : aucun geste de Ko ne peut publier une salle aujourd'hui (aucun écran administrateur) ; elle est prouvée par l'e2e (décision 2 du relecteur).

**Pour les trois : un pro connecté sur l'application Pro, la page ouverte une seule fois, et JAMAIS de rechargement (ni F5, ni bouton « actualiser »)** entre le geste et la lecture. Les mots entre guillemets sont ceux de l'écran en français.

**Scénario 1 — Créer une salle.**
1. Dans le menu du haut, cliquer « Ma salle » (ou « Mes salles »). Noter les noms des cartes et le mot du menu (« Ma salle » pour une seule, « Mes salles » dès deux).
2. Menu « Mon compte » → « Nouvelle salle ». Remplir le nom français, le nom arabe, la commune, la capacité maximale et le prix de base, puis « Créer la salle et continuer ».
3. **Sans recharger**, cliquer « Ma salle » (ou « Mes salles ») dans le menu du haut.
- **À constater** : la salle créée est dans la liste, avec le nom saisi ; si c'était la première, la page ne dit pas « Aucune salle pour le moment » ; dès la deuxième, le mot du menu est « Mes salles ».
- Même constat en revenant par le lien « Retour à mes salles » de l'écran de l'assistant au lieu du menu.

**Scénario 2 — Modifier une salle, y compris celle qu'on vient de créer.**
1. Sur la liste, « Modifier » sur une salle. À l'étape 1, changer le nom français et le prix de base, puis « Suivant » : le message « Modifications enregistrées. » s'affiche.
2. **Sans recharger**, revenir à la liste par « Retour à mes salles » (haut de la page) ou par « Ma salle » (menu du haut).
- **À constater** : la carte porte le **nouveau** nom et le **nouveau** prix (le prix tel que la liste l'écrit, en DA), pas l'ancien.
- Même constat quand la salle vient d'être créée dans la même session : créer, arriver à l'étape 2, revenir à l'étape 1, changer le nom, « Suivant », revenir à la liste.

**Scénario 3 — Supprimer une salle depuis l'écran d'édition.**
1. Sur la liste, « Modifier » sur une salle. Tout en bas de l'écran, bouton « Supprimer » ; confirmer dans la fenêtre « Supprimer cette salle ? ».
2. L'application ramène à la liste. **Ne pas recharger.**
- **À constater** : la salle supprimée n'est **plus** dans la liste ; si c'était la seule, la page montre « Aucune salle pour le moment » ; en passant de deux salles à une, le mot du menu redevient « Ma salle ».
- Aussi : sur un écran global (tableau de bord, par exemple), le sélecteur de salle ne propose plus la salle supprimée.

**Ce que le rapport de fin de lot dira, scénario par scénario** : ce que Ko doit constater (les lignes « À constater » ci-dessus), ce que l'e2e et les tests ont mesuré sur le même chemin, et que **la condition reste ouverte** jusqu'à sa réponse.

## Décisions de la session à ratifier (écrites ici avant le code)

- **S-1** — la relecture d'entrée est **silencieuse** : elle ne passe pas par l'état `loading`, elle garde la liste connue pendant la lecture et en cas d'échec ; la relecture après écriture et le bouton « Réessayer » restent **visibles** (idiome existant : `reload`). *Motif* : une relecture opportuniste ne doit pas détruire une donnée valide ; une relecture voulue après une écriture ne doit pas dire « à jour » ce qu'elle ne sait pas.
- **S-2** — la relecture d'entrée **ne part que si la liste est connue** (`ready`) : pendant le chargement de démarrage ou sur l'état `error`, elle ne fait rien. *Motif* : le test e2e A2 exige **1** requête pour l'entrée à froid sur `/salles`.
- **S-3** — la garde A2 de l'aller-retour SPA passe de **0 à 1** (F-15), raison écrite. *Motif* : « Revenir DOIT recharger » est déjà écrit dans cette spec ; « 0 » mesurait le contraire de la décision de Ko (relecture à l'entrée).
- **S-4** — les sections de l'assistant (créneaux, prestations, acompte, photos, visite virtuelle) ne déclenchent **pas** de relecture. *Motif* : M-23 nomme création, édition, publication, suppression ; la liste les reprend à l'entrée.
