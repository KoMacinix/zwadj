# D340 — la passe D277 des DEUX sens (AGENTS.md, D277 et D287), sur les trois fichiers d'autorité

Instrument : `docs/preuves/D340/passe-d277/passe-d277.py` — texte **APLATI** (jamais ligne à ligne : D294), calibré sur deux bras (motif connu « RANG 43 : EN ATTENTE… » → 3 ; motif fabriqué « RANG 9999… » → 0), il imprime 70 caractères de contexte de part et d'autre de CHAQUE occurrence (D275) et ce qu'il a parcouru (avant : `ZWADJ_CONTINUITE.md` 2 854 570 caractères, `ZWADJ_BACKLOG.md` 649 287, `AGENTS.md` 213 925 ; après : 2 884 986, 652 855, 218 165). Squelette repris de D338 ; motifs propres à ce lot.
Jouée UNE fois AVANT les écritures de clôture (`sortie-avant.txt`, état de `49cd9f9`, les trois `.md` d'autorité intacts depuis `c7645b7`) et UNE fois APRÈS (`sortie-apres.txt`, arbre de travail avec les écritures de clôture, non commitées).
⚠ **Défaut d'instrument de la première version, réparé avant la passe versée** : le motif « S-97 … à confirmer par Ko » cherchait S-97 AVANT « à confirmer » alors que la phrase les écrit dans l'autre ordre (« à confirmer par Ko (S-97) ») : **0 occurrence sur une phrase qui existe**. Corrigé, la passe « avant » **rejouée en entier** (15 240 caractères ; la sortie à 14 918 caractères n'est pas versée). ⚠ **Le compte « après » monte** pour la plupart des motifs : chaque phrase périmée est désormais suivie d'une annotation qui la CITE. Ce qui se vérifie est que **chaque occurrence est barrée ou annotée**.

## Sens 1 — ce que le lot INVALIDE

| motif | avant → après | où, et traitement |
|---|---|---|
| « RANG 44 : EN ATTENTE D'ARBITRAGE DE KO » | 5 → 7 | la ligne de l'ordre des rangs (**barrée à `c7645b7`**, première écriture) ; la phrase du bloc d'arbitrage qui DÉCRIT l'annotation ; le tableau de clôture du rang 43 (« rang suivant », **barré + renvoi**) ; la chaîne d'`AGENTS.md` (D339, **barrée**) ; **laissée** : le tableau de l'état de la session D338, sous un titre « PÉRIMÉ » (historique) ; les deux d'après sont mes annotations qui citent la phrase |
| L36-3 « pas arbitré » / « candidat proposé » | 4 → 6 | les quatre sites d'avant : la ligne de l'ordre des rangs (barrée à `c7645b7`), le tableau de clôture du rang 43 (barré), la ligne D339 du **registre** (barrée), la chaîne d'`AGENTS.md` (barrée) ; les deux d'après sont mes annotations qui citent la phrase |
| S-83 à S-97 « à ratifier » | 4 → 6 | la ligne « RANG 43 : CLOS SUR LE CODE » de l'ordre, la cellule « ce qui reste OUVERT » du tableau de clôture, la ligne D339 du registre, la chaîne d'`AGENTS.md` : **toutes barrées** et suivies de « S-83 à S-96 ratifiées par adoption, S-97 confirmée par R-2 » ; le titre de la section D339 (« À RATIFIER PAR KO ») est annoté |
| « la condition de clôture du rang 43 est OUVERTE » | 4 → 6 | les mêmes sites : barrées, annotées « LEVÉE » (déclaration de Ko consignée telle quelle) |
| « la base de développement de Ko n'a PAS la migration » | 3 → 4 | ordre, tableau de clôture, chaîne d'`AGENTS.md` : barrées, annotées « périmé — geste 0 de Ko » (une écriture de Ko, que la session n'a pas faite et n'a pas pu vérifier : elle la consigne comme déclarée) |
| « à confirmer par Ko (S-97) » | 0 → 1 (motif réparé : 1 → 1) | la phrase de l'ordre des rangs, **annotée à `c7645b7`** (« S-97 est CONFIRMÉE par R-2 ») |
| « aucun lot ne s'ouvre sans l'arbitrage de Ko » | 3 → 3 | les trois sont annotées « CONSOMMÉ : le rang 44 est arbitré » ; **« NB-6 et la fermeture de l'API restent à Ko »** est dit expressément |
| « rang suivant : en attente d'arbitrage de Ko » (forme de D284) | 4 → 4 | la règle D284 de l'ordre des rangs et celle d'`AGENTS.md` : **annotées** (la forme devient « EN ATTENTE DE CADRAGE DU RELECTEUR » quand le rang suivant relève du relecteur) ; **laissées** : l'historique d'une passe D277 antérieure (`ZWADJ_CONTINUITE.md`), et une entrée du backlog sous le rang 10 (récit daté) |

## Sens 2 (D287) — ce que le lot REND PERMIS, ou dont la condition change

| motif | avant → après | lecture |
|---|---|---|
| « un lot de code PEUT s'ouvrir » | 20 → 20 | **aucune nouvelle permission** : les 20 parlent des rangs 32, 37 et 41, chacune consommée par son rang et annotée par son lot ; aucune ne parle du rang 44. Ce lot n'en écrit pas. |
| « rang 44 » et ouverture / arbitrage | 3 → 7 | les trois d'avant sont la ligne de l'ordre, l'état de clôture du rang 43 et la chaîne d'`AGENTS.md` ; les quatre d'après sont les textes que ce lot écrit exprès |
| « L36-3 » et ouvrir / démarrer / coder | **0 → 3** | **ce sont les phrases que ce lot écrit exprès** : « aucune ligne de code de L36-3 ne s'ouvre avant la réponse du relecteur et la ratification du schéma ». Zéro avant : aucune phrase du dépôt n'autorisait L36-3 à s'ouvrir ; **aucune permission périmée à retirer**. |
| « cinq lots de code non certifiés sont tenables » | 5 → 5 | inchangée : la limite de cinq est SUSPENDUE par Ko ; ce lot n'écrit pas de code |
| « L'ARBITRAGE DU RANG APPARTIENT À KO » / « la session ne choisit donc pas le rang suivant » | 1 → 1 | **une règle dont la condition CHANGE** : la délégation de Ko du 02/11/2026. **Annotée** dans `AGENTS.md` (citation mot pour mot, portée, forme « EN ATTENTE DE CADRAGE DU RELECTEUR »). La session ne s'attribue toujours aucun rang. |
| « chaque lot appartient à un rang que Ko arbitre » (D302) | 2 → 2 | le même cas : **annoté** dans `AGENTS.md` (« se lit désormais, pour ce que la délégation confie au relecteur, « un rang que le relecteur cadre » » — **dérivé par la session, à confirmer par Ko**) ; l'occurrence de `ZWADJ_CONTINUITE.md` est une citation de la règle, laissée. **Cette annotation a été ajoutée APRÈS la première lecture de la sortie « après »** (elle manquait : la passe l'a montré) ; la sortie « après » versée est celle de l'état final. |
| « quatre écritures de cet ordre, aucune par une session » | 1 → 1 | dans le paragraphe D284 d'`AGENTS.md`, couvert par la même annotation de la délégation |

## Ce que la passe ne dit pas

- Elle cherche des **motifs écrits d'avance** : une phrase périmée qui s'exprimerait autrement ne serait pas vue (le défaut de D277 lui-même ; une passe partielle se lit comme une passe faite).
- Elle ne revérifie pas les annotations des rangs précédents (hors de ce lot) ; elle constate qu'aucune ne dépend de ce que ce lot change.
- **Elle ne dit rien des portes rouges** : ce n'est pas un contrôle des portes. Les phrases que ce lot écrit sur elles (« rouges », « non poussée ») n'ont pas de motif de passe, puisque aucune phrase antérieure ne disait le contraire.
