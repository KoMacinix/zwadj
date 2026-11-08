# D344 — la passe D277 des DEUX SENS (compte rendu)

Outil : `docs/preuves/D344/passe-d277/passe-d277.py` (texte APLATI des trois fichiers d'autorité, recherche insensible à la casse, contexte de 70 caractères ; calibration à deux bras : positif « RANG 45 : CLOS » 6, négatif fabriqué 0). Jouée UNE fois AVANT les écritures d'autorité (`sortie-avant.txt`, sur `83a6037`) et UNE fois APRÈS (`sortie-apres.txt`, arbre : les trois fichiers modifiés). Fichiers parcourus (aplatis) : `ZWADJ_CONTINUITE.md` 3 125 668 → 3 160 878 caractères ; `ZWADJ_BACKLOG.md` 681 353 → 686 357 ; `AGENTS.md` 229 435 → 230 725.

## Comptes, avant → après (onze motifs, dans l'ordre de la sortie)

| motif | avant | après | lecture |
|---|---|---|---|
| S1 « RANG 46 : EN ATTENTE DE CADRAGE » | 8 | 12 | **traité** : la ligne COURANTE de l'ordre des rangs est BARRÉE avec son motif (D344) ; l'ancienne ligne de point d'entrée (« ÉTAT À LA CLÔTURE DU RANG 45 ») est barrée ; les dix autres sont des sections historiques (D343, sa table, le registre D343) ou le texte de D344 lui-même, qui dit « PÉRIMÉ » |
| S1 « compteur POUR MÉMOIRE DIX-NEUF » | 2 | 6 | **traité** : l'ancien point d'entrée est barré ; les autres sont la table d'ouverture de D344 (« DIX-NEUF → VINGT »), le registre et la note d'`AGENTS.md` qui disent le passage à VINGT |
| S1 « HORS DE LA SUITE » | 20 | 24 | **r32 reste hors de la suite** : les occurrences qui la concernent restent VRAIES ; celles qui concernaient r30 sont annotées dans le backlog (trois annotations « REVENUE DANS LA SUITE ») ; la note de D344 dans `AGENTS.md` précise que r32 reste dehors pour une AUTRE raison que D265 |
| S1 « reste hors / sortie de la suite » | 45 | 49 | idem : historique annoté ; aucune phrase COURANTE sur r30 n'est restée non annotée |
| S1 « NE SE REJOUE QUE COPIÉE » / « AUCUNE CONFIGURATION DE REJEU » | 2 | 8 | les deux entrées du backlog (r30) sont annotées ; la hausse est le texte de l'annotation, qui cite les deux formules pour les déclarer périmées |
| S1 « le retour de chacune est un lot… » / « un déplacement de fichier » | 6 | 8 | **traité** : l'entrée « PEUVENT REVENIR » est annotée (accompli pour r30, **faux** pour r32 : revenir n'est pas un déplacement), l'entrée de r32 est annotée |
| S1 « 78 tests / 77 passés + 1 ignoré » | 8 | 9 | historique de D343 (vrai à sa date) ; la suite liste 79 tests depuis D344, écrit dans l'état, le registre et `AGENTS.md` |
| S1 « spec e2e du rang 32 est HORS » | 4 | 6 | restée vraie pour r32 ; annotée pour dire pourquoi (le motif n'est plus D265) |
| S2 « peuvent revenir » | 5 | 6 | **permission traitée** : la phrase qui AUTORISAIT le retour (« peuvent revenir : un déplacement chacune ») est annotée dans le backlog et dans `AGENTS.md` |
| S2 « L36-3a-2 » | 42 | 48 | le candidat reste L36-3a-2, désormais pour le **rang 47** ; les mentions anciennes disent « rang 46 » dans leur propre section (historiques) |
| S2 « passe avant L36-3a-2 » / « filet e2e complet doit être en place » | 2 | 5 | R-1 de D344 : **consommée par la clôture** (le lot est fait ; le filet n'est PAS complet : r32 manque, et c'est écrit) ; les occurrences sont la consigne copiée et la table |

## Ce que la passe a montré, et ce qu'elle ne dit pas

- **Le sens 2 a trouvé quelque chose** : la permission « les deux specs peuvent revenir, un déplacement chacune » (D343, `AGENTS.md` et backlog) est la phrase qui a motivé ce lot ; sa condition vient de changer pour r32. Elle est annotée aux deux endroits.
- **Une permission est INTENTIONNELLEMENT laissée** : « L36-3a-2 candidat » (rang 47, non arbitré). La motivation de R-1 (« un filet e2e complet doit être en place avant L36-4 ») **n'est plus satisfaite** : r32 manque. Ce n'est pas une décision de la session ; c'est une entrée de backlog à ordonner par Ko (« Reports du 08/11/2026 »).
- **Limite écrite** : la lecture au contexte a porté sur les occurrences du backlog et d'`AGENTS.md` (avant) et sur les deux motifs sensibles (après) ; les occurrences de `ZWADJ_CONTINUITE.md` ont été rangées par POSITION (section historique, bloc barré, texte de D344), pas toutes relues phrase à phrase. Un décompte n'est pas un triage (D275, D295) : il guide la lecture, il ne la remplace pas.
