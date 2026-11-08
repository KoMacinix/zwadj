# D343 — la passe D277 des DEUX SENS, pour D343 ET pour la clôture de D342

Règle (AGENTS.md, D277, étendue par D287) : après avoir écrit une décision dans un fichier d'autorité, **chercher dans les autres** les mots de ce que le lot **invalide** (sens 1) et de ce qu'il **rend permis** (sens 2), **compter** les occurrences, les **traiter toutes** — barrées avec leur motif, jamais effacées. Texte **aplati** (D294), recherche insensible à la casse, le **nombre à côté du contexte** (D275), calibrage à deux bras avant la lecture (D286).

Instruments : `passe-d277/passe-d277.py` (D343, 25 motifs) et `docs/preuves/D342/passe-d277/passe-d277.py` (D342, 26 motifs, joué ici pour la clôture de D342). Sorties : `passe-d277/sortie-avant.txt` / `sortie-apres.txt` (D343) et `docs/preuves/D342/passe-d277/sortie-avant.txt` (écrite par D342) / `sortie-apres.txt` (écrite ici). « Avant » = avant les écritures de CLÔTURE (D343 : après la première écriture d'autorité, qui n'écrit que l'arbitrage) ; « après » = sur les fichiers FINAUX, rejouée après chaque correction (la passe a été relancée quand quatre entrées de backlog ont été annotées de plus).

⚠ **Les comptes « après » MONTENT** (D343 : 228 → 272 ; D342 : 91 → 114) **et c'est attendu** : la clôture écrit du texte qui CITE ces formules pour dire qu'elles sont périmées. Un compte plus haut ne dit pas qu'une affirmation périmée a été ajoutée ; il oblige à trier chaque occurrence. **Triage en quatre classes** : **A** annotée ou barrée À SA PLACE (D276) ; **B** un FAIT DATÉ dans une section de session ou un journal de décisions — vrai à sa date, écrit au passé ; **C** une COPIE verbatim d'une consigne ou d'une table, figée par construction ; **D** un TEXTE NEUF de la clôture qui cite la formule pour la déclarer périmée.

## 1. Sens 1 — ce que D343 (et la clôture de D342) INVALIDENT

| motif | avant → après | classes et gestes |
|---|---|---|
| « RANG 45 : OUVERT » / « TOUJOURS OUVERT » | 2 → 3 | **A** : les deux lignes de l'ordre des rangs sont BARRÉES avec leur motif ; **D** : ma ligne de barrage |
| « FUSIONNÉE EN LOCAL, NON POUSSÉE » / « rien n'est poussé » | 6 → 10 | **A** : le titre de « PROCHAIN LOT — rang 45 » et celui du bloc « ÉTAT À L'ARRÊT » sont BARRÉS ; **B** : les blocs datés de D340 et D342 ; **C** : les copies littérales des tables d'ouverture de D342 et de D343 ; **D** |
| « compteur POUR MÉMOIRE QUATRE » | 4 → 7 | **B** : la chaîne annotée d'`AGENTS.md` (chaque maillon dit ce qui était vrai à sa date) est CLOSE par l'annotation de D343 (« QUATRE → DIX-HUIT → DIX-NEUF ») ; **C** ; **D** |
| « DIX-HUIT » | 8 → 14 | **C** / **D** : les textes qui annoncent « QUATRE → DIX-HUIT à la clôture » ; l'état courant dit **DIX-NEUF** (`AGENTS.md`, « ÉTAT À LA CLÔTURE DU RANG 45 », registre) |
| « test:e2e ROUGE » / « ROUGE aux deux passes » | 10 → 16 | **A** : le bloc d'arrêt de D342 est barré ; `AGENTS.md` annote la ligne de D325 (« D265 est NOMMÉ… ») ; **B** ; **D** : la section D342 § 2 dit que l'e2e est devenue verte |
| « D265 … cause encore INCONNUE » / « DISPARU, PAS EXPLIQUÉ » | 6 → 6 | **A** : les deux entrées du backlog sont COCHÉES et annotées ; **B** : sections D266, D322, D325 et la ligne du registre D266 (un titre de journal daté, non réécrit) |
| « ON NE CORRIGE PAS UNE PANNE QU'ON N'A PAS NOMMÉE » | 1 → 1 | **C** : la phrase est celle de R-13, copiée mot pour mot ; la phrase du harnais d'origine est REMPLACÉE par la cause nommée |
| « L'enquête sur D265 sera un lot à part… Elle bloque le retour de la spec » | 6 → 7 | **A** : cinq entrées du backlog annotées (« le bloquant est LEVÉ ») ; **B** : les sections D323 et D325 citent Ko mot pour mot ; **D** |
| « son retour dans la suite attend la cause de D265 » | 1 → 2 | **A** : l'entrée du lien du calendrier est annotée ; **D** |
| « HORS DE LA SUITE » (specs du rang 32 et du lien) | 20 → 20 | **B** : le FAIT reste vrai — les deux specs SONT toujours hors de la suite ; seul le BLOQUANT est levé (entrée neuve « LES SPECS SORTIES DE LA SUITE… PEUVENT REVENIR ») |
| « La suite livrée reste fragile sur r25-lien-connexion » | 1 → 1 | **A** : annotée dans `AGENTS.md` (« une AUTRE classe… que D343 ne traite pas ») |
| « quatre décisions prises seul » | 2 → 6 | **D** : énumérées à la section D342 § 3 (elles ne l'étaient dans aucun fichier d'autorité) ; **C** |
| « RANG 46 : EN ATTENTE » | 3 → 8 | **D** : écrit à la clôture (compté pour contrôle) |
| « D342 … PRIS … pas au registre » | 3 → 5 | **A** / **B** : blocs d'avant la clôture ; le registre porte D342 et D343 (contrôle 6.1 du contrôle de fin de lot) |
| « la fusion n'a pas eu lieu » | 5 → 5 | **B** : l'état d'ouverture de D342, dont le titre est barré |

## 2. Sens 2 — ce que D343 REND PERMIS, ou dont la condition change

| motif | avant → après | lecture |
|---|---|---|
| « L36-3a-2 » + ouvrir / coder / consigne / candidat | 8 → 8 | **inchangé et toujours VRAI** : « ouvrir L36-3a-2 ou L36-3b sans consigne collée » n'est PAS permis — le rang 46 est « EN ATTENTE DE CADRAGE DU RELECTEUR » ; la clôture ne rend rien permis ici |
| « L36-3b » + ouvrir / coder / consigne | 7 → 7 | idem |
| « pousser » / « poussée » + D270 / porte rouge | 9 → 11 | **B** : « D270 interdit de pousser sous une porte rouge » reste VRAI ; la poussée de D343 a lieu sous des portes VERTES ; **D** |
| « integration-45 » + supprim… ; « branche front-client » + supprim… | 1 → 5 ; 1 → 1 | **C** / **D** : R-18 — aucune des deux n'est supprimée dans cette session (contrôle 7.3) |
| « retour de la spec » / « remettre la spec » | 10 → 15 | **A** : entrées annotées ; **D** : le retour est un lot que Ko ordonne — la clôture ne le fait pas |
| « un lot de code PEUT s'ouvrir » / « aucun lot de code ne s'ouvre avant » | 105 → 105 | **B** : la chaîne HISTORIQUE (chaque maillon porte son « LEVÉ » ou « CONSOMMÉ ») ; l'état courant est écrit à son bout : compteur DIX-NEUF POUR MÉMOIRE, limite de cinq SUSPENDUE par Ko, **aucun lot de code ne s'ouvre sans cadrage du relecteur ou arbitrage de Ko** (rang 46) |
| « cinq lots de code non certifiés sont tenables » | 5 → 5 | **A** : déjà annotés « SUSPENDUE » (D336) |
| « retries » + nouvelle tentative | 2 → 2 | **inchangé et VRAI** : D343 n'écrit AUCUNE nouvelle tentative ; `playwright.config.ts` est inchangé |
| « L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » | 2 → 2 | **inchangé** : annotés (délégation de Ko du 02/11) ; la session n'a pas choisi le rang 46, elle a écrit qu'il est en attente |

**Motif au compte invraisemblablement haut (≥ 40)** : un seul, « un lot de code PEUT s'ouvrir… » (105), classé **B** ci-dessus. **Motifs à zéro** : aucun pour D343 (la section « MOTIFS À ZÉRO » de `sortie-apres.txt` ne liste que celui-là) ; pour D342, « PRÊT À INTÉGRER » / « l'intégration est à Ko » reste à zéro avant comme après — hypothèse vérifiée à la main : la branche n'a jamais écrit ces mots dans un fichier d'autorité (l'en-tête du BILAN : « la session n'a écrit aucun fichier d'autorité » ; 0 fichier d'autorité au diff de la branche).

## 3. La passe D342, jouée ici pour la clôture de D342 (26 motifs, 91 → 114)

Les mêmes quatre classes. **Ce qui a été écrit à cause d'elle** : D229, D230 et D231 « NON LIVRÉ » sont **barrés et annotés « LIVRÉ par FC-8 »** (décisions ET lignes du registre) ; la mention de `maxPriceCents` dans `isVariant` (D230) est **barrée** (R-7) ainsi que « Retirer aussi la clé de `SEARCH_VARIANT_PARAMS` » du backlog ; trois lignes du tableau daté d'`AGENTS.md` (« Lot ③ », « D228 », « D227 ») sont annotées sans réécrire l'instantané ; **dix-sept entrées du backlog sont cochées** avec le renvoi au lot (FC-1 ×2, FC-2, FC-4 ×3, FC-5 ×2, FC-6 ×1 — les noms de mois —, FC-7, FC-8, FC-9, FC-10 ×2, FP-1, et les deux entrées de tête de D265) ; **annotées sans être cochées** : FC-6 (les dates, tenues en partie : les montants restent en français), FC-11, FC-12, FP-5, la spec du rang 32 et celle du lien. **Rien d'autre ne reste en clair** : les occurrences restantes de « Le jour déjà demandé (REQUESTED) » (11), « se formatent en `ar-DZ` » (6) et de « FP-1 … session adverse » (4) sont des citations d'arbitrages de Ko ou des copies verbatim de la consigne (classes **B** et **C**), et une **vérification mécanique, faite pendant cette passe** (les 51 motifs des deux passes contre les 1 193 entrées du backlog, dont 793 ouvertes : une entrée portant un motif doit être cochée ou annotée D342/D343) en relève **trois** : les deux entrées NEUVES de la clôture (« FC-6 N'EST TENU QU'EN PARTIE » et « FC-11 (ARRÊTÉ) », qui énoncent justement ces formules) et un faux positif (une entrée ancienne, « DIX-NEUF FICHIERS À ÉCHÉANCE CONNUE », où « dix-neuf » est un nombre de fichiers). **Aucune entrée ouverte ancienne ne porte une formule périmée sans annotation.** Cette vérification n'est PAS une famille du contrôle de fin de lot : elle n'est rejouable que par le script jetable qui l'a faite (non versé).

⚠ **Ce que cette passe ne garantit PAS** : « traité » veut dire « annoté ou classé », pas « l'affirmation périmée a disparu » — D276 interdit de l'effacer. Un lecteur qui lit une section de session datée lit un fait daté ; c'est la convention de ce dépôt, pas une propriété que cette passe vérifie.
