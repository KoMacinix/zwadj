# D341 — la passe D277 des DEUX SENS (AGENTS.md : D277, D287, D294)

**Ce que c'est.** La recherche mécanique, sur le texte APLATI des trois fichiers d'autorité (`ZWADJ_CONTINUITE.md`, `ZWADJ_BACKLOG.md`, `AGENTS.md`), des affirmations que le lot INVALIDE (sens 1) et des PERMISSIONS dont la condition vient de changer (sens 2, D287). Elle a été jouée **deux fois** : avant les écritures d'autorité de la clôture (`passe-d277/sortie-avant.txt`) et après (`passe-d277/sortie-apres.txt`). Instrument : `passe-d277/passe-d277.py` (copie du squelette de D340, motifs propres à ce lot, recherche insensible à la casse), **calibré à deux bras à chaque lancement** (motif connu → 10 puis 17, motif fabriqué → 0). Deux outils de lecture, versés avec leurs sorties : `passe-d277/nouveaux-contextes.py` (ce que le lot a ÉCRIT dans chaque motif) et `passe-d277/verifier-zeros.py` (les motifs à zéro rejoués plus larges).

**Ce que la passe a parcouru (D290).** Texte aplati : `ZWADJ_CONTINUITE.md` 2 908 580 → 2 994 155 caractères, `ZWADJ_BACKLOG.md` 655 641 → 662 489, `AGENTS.md` 220 806 → 225 092 ; **22 motifs** (11 de sens 1, 11 de sens 2), chacun avec son nombre par fichier et le contexte de chaque occurrence.

## Défauts de l'instrument trouvés en le jouant (dits, pas cachés)

1. **Première version : la recherche était sensible à la casse.** « cadr » ne trouvait pas « CADRAGE » ; trois motifs rendaient 0 sur « RANG 45 : EN ATTENTE DE CADRAGE DU RELECTEUR », un zéro qui n'en était pas un. Réparé (insensible à la casse) avant la première sortie versée.
2. **Un motif au compte invraisemblablement haut a été RETIRÉ.** « aucun lot (de code) ne s'ouvre » rendait **77** occurrences : toute la chaîne datée des compteurs, que chaque lot précédent a déjà annotée. Il comptait tout et ne mesurait rien (D295, la règle se lit dans les deux sens). Il est remplacé par deux motifs qui visent ce que CE lot consomme (« K-14 à K-18 » + coder, « L36-3a-1 » + ouvrir). Le motif « un lot de code PEUT s'ouvrir » (41) reste : voir plus bas.
3. **Le motif « SameSite »** rend 16 après (5 avant) : ce n'est pas un défaut, c'est le lot qui écrit la contrainte de mise en service ; il est dans la passe pour montrer qu'elle est écrite **dans les trois endroits** (section, point d'entrée, invariant d'`AGENTS.md`).

## Sens 1 — ce que le lot INVALIDE (avant → après)

| motif | avant → après | triage |
|---|---|---|
| « OUVERT, CADRAGE POUSSÉ, RÈGLE D'ARRÊT JOUÉE » (l'état du rang 44) | 9 → 10 | les 9 anciens : la section D340 et sa ligne de registre (historique daté, le registre ne se réécrit pas), l'état de D340 (dont le titre est maintenant barré et annoté « PÉRIMÉ ») et la chaîne d'`AGENTS.md` (la nouvelle annotation de D341 le nomme « PÉRIMÉ ») ; le nouveau : l'en-tête du rang 44, **barré** |
| « aucun code, aucune migration » | 8 → 9 | les anciens : D340 (historique) ; le nouveau : l'annotation d'`AGENTS.md` qui le nomme périmé |
| « compteur POUR MÉMOIRE TROIS » | 6 → 10 | les anciens : D340 ; les quatre nouveaux : mon titre et mon registre (« TROIS → QUATRE ») et l'annotation d'`AGENTS.md` |
| « SIG-1 … non corrigé » | 2 → 3 | la section D340 et la chaîne d'`AGENTS.md` (historique) ; le nouveau : l'annotation qui le nomme périmé. **L'entrée du backlog est cochée `[x]` et annotée « RÉPARÉ »** |
| « S-98 à S-112 » + « à ratifier » | 4 → 5 | l'état de D340 (périmé par son titre), le bloc de D340 d'`AGENTS.md` (nommé périmé) ; la ratification est écrite dans le bloc d'arbitrage de D341 (R-2 : onze ratifiées, S-103 refusée, S-107 renvoyée à L36-3a-2) |
| « la découpe, S-98 à S-112, la nullabilité … viennent dans la consigne » | 1 → 2 | D340 (nommé périmé par l'annotation d'`AGENTS.md`) |
| « L36-3 » + « pas de code » | 1 → 1 | l'en-tête du rang 44 : remplacé (le compte reste égal, **le contexte a changé** : un compte égal n'est pas un contexte égal) |
| « migration de L36-3 à écrire / pas écrite » | 0 → 0 | zéro vérifié plus large (`verifier-zeros.txt` : 0 sur les trois fichiers) |
| « la base de développement de Ko n'a PAS la migration » | 4 → 4 | déjà barrée par D340 ; D341 ne l'applique pas non plus (S-129) : rien à changer |
| « RANG 44 : OUVERT » | 3 → 3 | la ligne d'ordre de D340 est **barrée et annotée** ; le compte reste égal, le contexte a changé |
| « SameSite » | 5 → 16 | voir le défaut 3 |

## Sens 2 (D287) — ce que le lot REND PERMIS, ou dont la condition change (avant → après)

| motif | avant → après | triage |
|---|---|---|
| « un lot de code PEUT s'ouvrir » | 41 → 41 | **aucun contexte nouveau** ; toutes les occurrences sont dans la chaîne datée, chacune déjà barrée ou annotée « consommée » par le lot qui l'a consommée ; la dernière, « dès que Ko arbitre le rang 41 », est consommée par D336. Le seul énoncé courant que D341 ajoute est écrit en toutes lettres et conditionné : « un lot de code de L36-3 PEUT s'ouvrir quand le relecteur cadre le rang 45 et que Ko colle la consigne » |
| « L36-3a-2 » / « L36-3b » + ouvrir, coder, consigne | 4 → 7 chacun | les trois nouveaux de chacun sont des **interdictions** ou des renvois (« ouvrir L36-3a-2 ou L36-3b sans consigne collée » est interdit ; « n'ont pas de rang ») |
| « RANG 45 » + ouvrir, arbitrer, cadrer | 9 → 18 | neuf nouveaux, tous la forme « EN ATTENTE DE CADRAGE DU RELECTEUR » : aucun n'ouvre le rang |
| « K-19 à K-23 » + coder, ratifier | 1 → 9 | tous disent « ne sont pas ratifiés » ou « avant leur ratification » |
| « cinq lots de code non certifiés sont tenables » | 5 → 5 | inchangé : suspendu par Ko (D336), le compteur QUATRE ne s'y oppose pas |
| « K-14 à K-18 » + à coder / s'ouvre | 0 → 0 | zéro vérifié plus large : les **12** occurrences de « K-14 » disent toutes ce qui EST codé (aucune « à coder ») |
| « L36-3a-1 » + ouvrir, consigne, candidat | 4 → 6 | les deux nouveaux : le titre de la section et l'annotation d'`AGENTS.md` (la permission est consommée) |
| « L'ARBITRAGE DU RANG APPARTIENT À KO » | 2 → 2 | inchangé : annoté par D340 (la délégation de Ko du 02/11/2026) |
| « recours administrateur » + coder / ouvrir | 0 → 0 | zéro vérifié plus large : 13 occurrences de « recours » + « Manager », toutes des énoncés de **limite** ; aucune ne permet de coder |
| « la pause du paiement en ligne » + reprise / lever | 0 → 0 | zéro vérifié plus large : 23 occurrences, **toutes** « inchangée » |

**Les 50 contextes nouveaux** (`passe-d277/nouveaux-contextes.txt`, 25 motifs examinés) ont été lus un par un : ce sont tous des citations de ce que le lot invalide, mises en forme barrée ou « PÉRIMÉ », ou des énoncés de l'état courant (CLOS SUR LE CODE, EN ATTENTE DE CADRAGE, K-19 à K-23 non ratifiés). **Aucun n'introduit une permission périmée ni une affirmation fausse.**

## Ce que la passe a trouvé, qu'aucune porte ne dit

**Une affirmation fausse contre le dépôt, venue de la lecture adverse et recopiée dans la première écriture d'autorité** : « le recours administrateur d'un Manager seul n'a au backlog qu'une mention, pas d'entrée à son nom — elle est due par ce lot ». L'entrée existe depuis D340 (`git show e40c141:ZWADJ_BACKLOG.md`, 1 occurrence). Elle n'est pas apparue dans les motifs de la passe (le motif « recours administrateur + coder » est à zéro) mais en **recoupant le zéro**, par la lecture large de `verifier-zeros.py` : treize occurrences, dont celle-là. **Traitée** : la phrase est barrée avec son motif dans `ZWADJ_CONTINUITE.md`, la section D341 porte le constat (« Écart relevé en clôture »), et le lot a ANNOTÉ l'entrée existante au lieu d'en créer une seconde.

## Ce que la passe ne dit PAS

- Elle ne trouve que les phrases qu'on lui nomme : une permission formulée autrement lui échappe (c'est la raison des motifs larges, jamais de leur exhaustivité).
- Un compte égal avant et après n'est pas un contexte égal (« L36-3 + pas de code », « RANG 44 : OUVERT ») : c'est `nouveaux-contextes.py` qui compare les textes.
- Elle ne dit rien de la CORRECTION de ce que les trois fichiers affirment du code : ce sont les portes et le relecteur.
