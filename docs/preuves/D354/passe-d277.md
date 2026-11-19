# D354 — la passe D277, DANS LES DEUX SENS (D277, D287) — ce que ce lot INVALIDE, et ce qu'il REND PERMIS

**Instrument** : `docs/preuves/D354/passe-d277.py` (lecture seule ; calibré sur les occurrences connues du texte d'avant le lot) ; **sortie finale** : `passe-d277-sortie.txt`. **Corpus** : les QUATRE fichiers d'autorité, sur le texte APLATI (ces fichiers sont écrits en lignes longues et enjambent des retours à la ligne : une recherche ligne à ligne est aveugle à ce qui les enjambe, D294) — **4 574 573 caractères aplatis parcourus** au départ (`ZWADJ_CONTINUITE.md` 3 544 754, `ZWADJ_BACKLOG.md` 759 517, `AGENTS.md` 265 096, `CLAUDE.md` 5 206), imprimés par l'instrument. **15 motifs** : 11 d'INVALIDATION (une affirmation que ce lot rend fausse) et 4 de PERMISSION (une phrase qui dit qu'un lot, un rang ou un code peut s'ouvrir, dont la CONDITION vient de changer). Chaque motif imprime son compte par fichier ; **un motif à zéro est une hypothèse à vérifier, un motif au compte invraisemblable aussi** (D295).

⛔ **Ce que l'instrument ne fait PAS** : il LISTE ce que les fichiers disent ; c'est la lecture qui tranche. La classification par fenêtre (±450 caractères aplatis : annoté D354 / barré `~~` / annoté « PÉRIMÉ » par un lot antérieur / SANS) est un TRI, pas un verdict — elle sur-compte les occurrences d'un bloc dont l'annotation est EN TÊTE de bloc, à plus de 450 caractères de la phrase.

## 1. Le relevé, avant et après l'écriture d'autorité

| | avant toute écriture d'autorité de ce lot (relevé du texte au commit `22a4110`) | après (la clôture) |
|---|---|---|
| occurrences des 12 motifs classés, sans annotation dans la fenêtre | **53** | **33** |
| dont annotées par CE lot | 0 | 3 à 13 selon le motif (voir `passe-d277-sortie.txt`) |

## 2. Les 33 occurrences qui restent SANS annotation dans la fenêtre — LUES UNE À UNE, rangées par ce qui les entoure (calcul de l'instrument sur la section d'appartenance)

| classe | n | pourquoi ce n'est pas une affirmation COURANTE que ce lot invalide |
|---|---|---|
| **A.** bloc « ÉTAT À LA CLÔTURE DU RANG 55 » | 7 | **l'en-tête du bloc est barré et annoté PÉRIMÉ par D354** (« PÉRIMÉ sur « rang suivant : RANG 56 : EN ATTENTE… », « compteur TRENTE-CINQ », « décisions prises seule : S-231 à S-238, à ratifier » et « ce qui RESTE : (1) le rang 56, à cadrer »), à plus de 450 caractères des lignes du tableau |
| **B.** blocs d'état de D341 à D344 | 6 | blocs DATÉS dont l'en-tête est barré et annoté PÉRIMÉ par le lot suivant (D342, D343, D344, D345) ; ils disent ce qui était vrai à leur date |
| **D.** entrées du backlog (le S-104) | 2 | **annotées à leur FIN** (« **FAIT** — rang 56 »), l'entrée est passée à `[x]` ; la phrase est à plus de 450 caractères de l'annotation |
| **E.** tables d'ouverture recopiées à l'identique, ou sections datées | 14 | des COPIES de tables d'ouverture de lots antérieurs (D342 à D353) **et de celle du rang 56 elle-même, qui dit l'état d'OUVERTURE** (« rang 55 CLOS ; compteur TRENTE-CINQ ; RANG 56 : EN ATTENTE ») : une copie « à l'IDENTIQUE » ne se retouche pas (D353 le dit), et son état est daté |
| **F.** sections datées de D267 / D270 | 3 | localisateurs et ordre des lots d'août-septembre 2026 : historiques |
| **G.** section de D354, § 1 « ce que la reprise a trouvé » | 1 | l'état d'OUVERTURE (« aucune table de capacités ») constaté par la lecture adverse, daté et dit comme tel |

⚠ **Ce que la classe E ne dit pas** : qu'aucune de ces copies ne puisse être lue comme courante par un lecteur pressé — la protection est l'en-tête daté de chaque copie. **Le seul fichier chargé à chaque session, `AGENTS.md`, n'a plus AUCUNE occurrence sans annotation** (la classe C est vide : sa phrase « S-104 n'est PAS codée » et l'annotation de clôture de D341 sont annotées).

## 3. Sens 1 — ce que ce lot INVALIDE (les onze motifs), traité

- **« S-104 n'est PAS codée » / « `mustChangePassword` voyage mais rien ne l'écrit à `true` » / « aucun refus ne le lit : un mot de passe expiré ouvre une session »** — dans `AGENTS.md` (l'invariant du personnel de D341, annoté), `ZWADJ_CONTINUITE.md` (cinq endroits : les passages de la section et du bloc de D341 et de son annotation de clôture qui disent « S-104 n'est pas codée ») et `ZWADJ_BACKLOG.md` (l'entrée `[API][IDENTITÉ]`, close `[x]`) : **annotées** « S-104 EST CODÉE » avec ce qui la remplace.
- **« K-19 à K-23 ne sont pas ratifiés »** (cinq endroits : trois dans `ZWADJ_CONTINUITE.md`, un dans `AGENTS.md`, un dans le backlog) : **annotées** « K-19 à K-22 adoptés par Ko et codés ; K-23 reste non ratifié ».
- **« L'audit « création et modification de fiche » (DR5) et S-107 appartiennent à L36-3a-2 »** (R-8 de D341) : **annotée** — S-107 est CODÉE ; **l'audit des FICHES client N'EST PAS écrit** (S-240, la question du rapport). ⚠ **Cette annotation évite d'écrire que « tout L36-3a-2 est fait »** : une partie de son périmètre d'origine ne l'est pas.
- **« RANG 56 : EN ATTENTE DE CADRAGE DU RELECTEUR »** (le pointeur de l'ordre des rangs, la ligne du registre de D353, le tableau d'état du rang 55, `AGENTS.md`) : **barré ou annoté PÉRIMÉ**. **« TRENTE-CINQ »** : le compteur de D353 est annoté aux endroits courants ; **« S-231 à S-238 à ratifier »** : 6 annotations sur 7 (la septième est déjà PÉRIMÉE par un lot antérieur) ; **« D353 est au registre ; dernier numéro D353 »** : dans le bloc d'état du rang 55 (classe A).
- **« aucune table de capacités »** : les occurrences restantes sont celles de CE lot qui disent l'état d'OUVERTURE (le constat du relecteur dans la copie de la table d'ouverture, classe E ; § 1 de la section D354, classe G) ; **le registre, le bloc d'état du rang 56, la section D354 et l'invariant de `AGENTS.md` disent l'état d'APRÈS**.

## 4. Sens 2 — ce que ce lot REND PERMIS, ou dont il change la condition (les quatre motifs de permission) — **le sens qui ne se rattrape pas**

- **« L36-3a-2 peut s'ouvrir / candidat proposé »** (17 puis 19 occurrences, avec celles que ce lot a écrites) : le lot EST fait ; les occurrences courantes sont annotées (le pointeur de l'ordre, le registre, `AGENTS.md`) ou barrées ; le reste (classes B et E) est daté. **Rien ne dit plus qu'il « peut s'ouvrir ».**
- **« L36-3b (le PIN) : sans rang »** : **inchangé et dit** — « RANG 57 : EN ATTENTE DE CADRAGE DU RELECTEUR », candidat proposé, **pas arbitré** ; la session ne le nomme pas.
- **« un lot de code PEUT s'ouvrir / limite de cinq SUSPENDUE »** (82 occurrences) : **la condition est INCHANGÉE** — le compteur POUR MÉMOIRE passe de TRENTE-CINQ à TRENTE-SIX, la limite reste suspendue par Ko, aucune certification. Examinées, aucune annotation nécessaire : le lot n'ouvre ni ne ferme aucune permission de ce genre.
- **« L36-4 (les écrans) attend la gestion du personnel côté serveur »** (2 occurrences, D340 et D341) : **la condition CHANGE À MOITIÉ** — K-19 à K-22 existent (de quoi bâtir une liste, une création, une réinitialisation, une désactivation), mais **le PIN (3b) n'existe pas**, et L36-4 est « personnel ET PIN, écrans » : **L36-4 n'est pas devenu ouvrable** ; aucune phrase de permission n'a été écrite.
- **Une permission NOUVELLE à ne pas laisser croire** : **le premier client réel qui active la couche du personnel** n'est PAS libéré par S-104 : il reste le **défaut croisé « connexion ‖ réinitialisation »** (mesuré, non corrigé, backlog), l'absence de réactivation, le coût de la couche activée, les messages arabes non relus, la MFA et la relecture du rôle en base (D321). **Écrit pour ne pas se lire comme un feu vert.**

## 5. Ce que cette passe ne regarde pas

Les occurrences que ses 15 motifs ne devinent pas (une phrase qui dit la même chose avec d'autres mots) ; les fichiers qui ne sont pas des fichiers d'autorité (`docs/preuves/**` ne se retouche pas : D291, D295) ; le sens des phrases au-delà de leur fenêtre.
