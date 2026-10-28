# D338 — la passe D277 des DEUX sens (AGENTS.md, D277 et D287), sur les trois fichiers d'autorité

Instrument : `docs/preuves/D338/passe-d277/passe-d277.py` — texte **APLATI** (jamais ligne à ligne : D294), calibré sur deux bras (motif connu « RANG 43 : EN ATTENTE… » → 3 ; motif fabriqué « RANG 9999… » → 0), il imprime 70 caractères de contexte de part et d'autre de CHAQUE occurrence (D275 : jamais un compte sans son contexte) et ce qu'il a parcouru (ZWADJ_CONTINUITE.md 2 764 488 caractères avant, 2 790 795 après ; ZWADJ_BACKLOG.md 638 195 / 642 296 ; AGENTS.md 208 247 / 209 769).
Jouée UNE fois AVANT les écritures de clôture (`sortie-avant.txt`, état de `6ae062e`) et UNE fois APRÈS (`sortie-apres.txt`, arbre de travail avec les écritures de clôture, non commitées). ⚠ **Le compte « après » monte** pour la plupart des motifs : chaque occurrence annotée est désormais suivie d'une annotation qui CITE la phrase périmée. Le compte ne baisse donc jamais ; ce qui se vérifie est que chaque occurrence d'AVANT porte, à côté d'elle, son annotation datée.

## Sens 1 — ce que le lot INVALIDE

| motif | avant | où | traitement |
|---|---|---|---|
| « RANG 43 : EN ATTENTE D'ARBITRAGE DE KO » | 5 | ordre des rangs (la ligne du rang 43) ; mon propre bloc d'arbitrage (une phrase qui DÉCRIT l'annotation) ; tableau de clôture du rang 42 (« rang suivant ») ; en-tête de « Reports du 24/10/2026 » du backlog ; chaîne de `AGENTS.md` (D337) | **les trois premières affirmations barrées ou annotées avec leur motif** : la ligne de l'ordre des rangs est barrée (« périmé le 27/10/2026 »), le tableau de clôture porte « pas arbitré est PÉRIMÉ » (C3), l'en-tête du backlog porte « arbitré par Ko le 27/10/2026 » (B1), la chaîne d'`AGENTS.md` reçoit la note D338 qui dit « PÉRIMÉS » (A1). Ma phrase d'annotation n'est pas une affirmation. |
| L36-2 « pas arbitré » / « candidat proposé » | 4 | la ligne de l'ordre des rangs (même paragraphe barré) ; tableau de clôture ; en-tête du backlog ; chaîne d'`AGENTS.md` | mêmes quatre annotations (barré, C3, B1, A1) |
| S-68 à S-75 « à ratifier » | 3 | la ligne « RANG 42 : CLOS SUR LE CODE » de l'ordre des rangs ; la cellule « ce qui reste OUVERT » du tableau de clôture ; la ligne D337 du registre | annotées (C2, C4, F) : « ratifiées par adoption » |
| gestes de Ko pour L36-1 « restent à jouer » | 2 | la ligne D337 du registre ; l'entrée du backlog « Reports du 24/10/2026 » | annotées (F ; B3) ; et l'entrée ouverte `[PRODUIT][TÂCHE DE KO]` « LES GESTES DE KO POUR L36-1 » est **fermée `[x]`** avec sa note (B2) |
| « NB-6 y entre si Ko le place là » | 3 | DR4 ; la ligne « 43 L36-2 » de la section 5 de D336 ; l'entrée L36-2 du backlog | annotées (C6, C7, B4) : NB-6 est placé HORS lot par Ko |
| « le lot est clos sur le code, pas sur ce regard » | 13 | **9 de `ZWADJ_CONTINUITE.md`** : 1 appartient au rang 42 (cellule « ce qui reste OUVERT »), annotée (C4) ; les **8 autres** parlent des rangs 33, 37, 38, 39 et 41 ; **3 du backlog** : 1 appartient au rang 42 (l'entrée fermée par B2/B3), les 2 autres aux rangs 37 et 38 ; **1 d'`AGENTS.md`** (rang 37) | **les occurrences des rangs 33, 37, 38, 39 et 41 ne sont ni invalidées ni rendues fausses par ce lot** : elles disent ce qui était vrai à leur date, leur condition a été levée par leurs lots (non revérifiée ici, hors du périmètre de ce lot). Celle du rang 42 est annotée. |

## Sens 2 (D287) — ce que le lot REND PERMIS, ou dont la condition change

| motif | avant → après | lecture |
|---|---|---|
| « un lot de code PEUT s'ouvrir » | 20 → 20 | **aucune nouvelle permission** : les 20 occurrences parlent des rangs 32, 37 et 41, chacune CONSOMMÉE par son propre rang et annotée par son lot ; aucune ne parle du rang 43 ni de L36-2. Ce lot n'en écrit pas. |
| « rang 43 » et ouverture / arbitrage | 2 → 3 | les deux d'avant sont l'annotation de la section D337 (qui CITE « consigne du rang 43 ») et la ligne D337 du registre, annotée (F) ; la troisième, d'après, est cette annotation |
| « L36-2 » et ouvrir / démarrer / coder | **0 → 2** | **ce sont les deux phrases que ce lot écrit exprès** : « aucun code de L36-2 ne s'ouvre avant les réponses de Ko » (ordre des rangs, `AGENTS.md`). Zéro avant : aucune phrase du dépôt n'autorisait L36-2 à s'ouvrir ; il n'y a donc **aucune permission périmée à retirer**. |
| « cinq lots de code non certifiés sont tenables » | 5 → 5 | inchangée : la limite de cinq est SUSPENDUE par Ko (D336) ; ce lot n'écrit pas de code, le compteur pour mémoire reste à DEUX |

## Ce que la passe ne dit pas

- Elle cherche des **motifs écrits d'avance** : une phrase périmée qui s'exprimerait autrement ne serait pas vue (le défaut de D277 lui-même, une passe partielle se lit comme une passe faite).
- Elle ne revérifie pas les annotations des rangs 33, 37, 38, 39 et 41 (hors de ce lot) ; elle constate qu'aucune ne dépend de ce que ce lot change.
