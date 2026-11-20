# D355 — passe D277 (deux sens, D287) : ce que le lot INVALIDE et ce qu'il REND PERMIS, cherché dans les QUATRE fichiers d'autorité

**Instrument** : `docs/preuves/D355/passe-d277.py` (le code est LU dans celui de D354 ; seuls les motifs changent), joué sur le texte **APLATI** (ces fichiers sont enveloppés à ~95 colonnes : une expression de plus de quelques mots y est coupée au moins une fois — D294). **Ce qu'il a parcouru** (D290) : 4 783 269 caractères aplatis à la dernière passe (`ZWADJ_CONTINUITE.md` 3 725 737 · `ZWADJ_BACKLOG.md` 773 623 · `AGENTS.md` 278 703 · `CLAUDE.md` 5 206) ; 4 780 945 à la première, avant les annotations. **Sortie** : `passe-d277-sortie.txt` (la dernière passe, après les annotations). **Il LISTE, il ne juge pas** : sa classification par annotation (« D355 » dans les 450 caractères) ne voit ni la structure (une table recopiée, un bloc barré) ni la date d'une section ; c'est cette lecture qui tranche, occurrence par occurrence.

## 1. Ce que la première passe a rendu, et ce que le lot en a fait

**Onze motifs** (huit « INVALIDE », trois « PERMET »), 27 occurrences sans annotation à la première passe, **tous les motifs à un compte NON nul** (aucun motif à zéro : aucune hypothèse à vérifier). Les occurrences **courantes ET devenues fausses** ont reçu une **annotation en ligne** (`annoter-d277.py` et `annoter-d277-agents.py`, jointes) — jamais une réécriture : **onze annotations dans `ZWADJ_CONTINUITE.md`** (la ligne du rang 56 clos dans l'ordre des rangs, le § 3 « défaut croisé », le titre du § 5 « À RATIFIER », S-240, S-248, le § 4, les deux lignes du § 7, les deux cases de la ligne D354 du registre, l'annotation de D354 sur R-8 de D341) et **trois dans `AGENTS.md`** (l'annotation de D354 dans la chaîne des rangs : « à ratifier », « la question du rapport », « non corrigé »). Les annotations de l'invariant de D354 (« non corrigé », « n'est PAS écrit »), de l'entrée « RANG 57 : EN ATTENTE » et des deux entrées du backlog avaient été posées avec les `.md` de clôture.

## 2. Ce que la seconde passe rend : 22 occurrences sans annotation proche, **toutes lues, aucune ne s'oppose au lot**

| nombre | où elles sont | pourquoi ce n'est pas une affirmation courante devenue fausse |
|---|---|---|
| 6 | **dans une TABLE d'ouverture recopiée** : **5 dans la nôtre** (le rang 57 : sa reprise et son plan d'ouverture, qui disent ce qui était vrai À L'OUVERTURE — « compteur TRENTE-SIX », « le candidat du rang 57 est L36-3b ») et **1 dans celle de D354** | un énoncé daté de l'ouverture d'un lot, copié à l'identique ; la table s'annonce comme une copie (« recopiée à l'IDENTIQUE de `docs/preuves/…/table-ouverture.md` ») |
| 6 | **dans le bloc d'état du rang 56, BARRÉ par son titre** (« ### ~~⛔ ÉTAT À LA CLÔTURE DU RANG 56…~~ ⛔ *(D355 : PÉRIMÉ sur…)* ») | le titre barré dit exactement ces cases (« rang suivant », « compteur », « décisions prises seule », « ce qui RESTE ») ; l'annotation est à 450 caractères et plus des lignes du tableau, qu'elle couvre |
| 2 | **dans deux entrées du backlog COCHÉES `[x]`** (le défaut croisé, l'audit des fiches) | annotées en TÊTE (« FAIT, D355 ») ; le texte qui suit dit ce qui était vrai AVANT et garde sa date |
| 1 | **la section de session de D354** (le titre : « compteur TRENTE-CINQ → TRENTE-SIX ») | l'histoire de D354 : ce que D354 a fait, vrai à sa date |
| 5 | **des blocs d'arbitrage** : le texte « mot pour mot » d'une consigne (D354 [1a] « compteur … → TRENTE-SIX à la clôture » ; D354 [3, 4] « « RANG 56 : CLOS », puis « RANG 57 : EN ATTENTE… » » ; la suite de la ligne « RANG 57 : EN ATTENTE » barrée ; D355 [3, 4] « « RANG 57 : CLOS », puis « RANG 58 : EN ATTENTE… » ») | des consignes citées telles qu'elles ont été adoptées : un document daté, jamais réécrit (D276) ; la ligne barrée dit elle-même que sa suite « dit ce qui était vrai AVANT » |
| 2 | **la section « D270 — ordre des lots » : le rang 44** (« L36-4 dépend de L36-3 », « la branche touche les écrans, L36-3a-2 le serveur ») | l'histoire du rang 44, datée ; **et la condition tient toujours** : L36-4 dépend de L36-3, dont le PIN (3b) reste à faire |
| **0** | **une PERMISSION périmée** (le sens qu'une recherche par contradiction ne ramène pas, D287) | voir § 3 |

6 + 6 + 2 + 1 + 5 + 2 = 22 ✓. **Un décompte, pas une classification mécanique** : les six « table recopiée » et les six « bloc barré » ont été reconnus par position (les fences `~~~~markdown` du fichier ; le titre du bloc) ; les autres par lecture du contexte.

## 3. Le sens que la recherche par contradiction rate : ce que le lot REND PERMIS

Trois motifs « PERMET » (L36-3b, le PIN ; un lot de code qui PEUT s'ouvrir ; L36-4, les écrans) :
- **L36-3b (le PIN)** : avant ce lot, la section 5 de la consigne du rang 56 le désignait candidat du rang 57 ; **il devient candidat du rang 58, « pas arbitré »** (la ligne du rang 58 dit « EN ATTENTE DE CADRAGE DU RELECTEUR »). La condition a changé dans le bon sens : **le défaut croisé que le PIN réutiliserait est corrigé**, à UN endroit. Aucune phrase ne dit « L36-3b s'ouvre » : toutes disent « candidat, pas arbitré ».
- **Un lot de code PEUT s'ouvrir** : la limite de cinq reste SUSPENDUE par Ko, le compteur est tenu POUR MÉMOIRE (TRENTE-SEPT) ; **aucune phrase de ce lot ne la lève ni ne la rétablit**.
- **L36-4 (les écrans)** : dépend de L36-3 (donc du PIN) ; inchangé. **Aucune permission nouvelle.**

## 4. Ce que cette passe ne regarde PAS
Un fichier d'autorité qui ne serait pas l'un des quatre (les pièces de `docs/preuves/` : jamais réécrites) ; une affirmation dont le motif de recherche n'a pas été écrit (la liste est celle de onze motifs, relevés dans le texte de la clôture et de la consigne) ; **les variantes de casse** : la première passe n'avait pas ramené « S-239 à S-251, À RATIFIER » (le motif était écrit en minuscules) — **trouvé par un relevé à la main des « S-239 à S-251 »**, annoté (le titre du § 5), et le motif n'est PAS corrigé dans l'instrument (une pièce se corrige avec la sortie qu'elle a produite, ou pas du tout, D295).
