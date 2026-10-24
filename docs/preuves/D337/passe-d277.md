# D337 — la passe D277, dans LES DEUX SENS (`AGENTS.md`, « Méthode », D277 puis D287)

Méthode : les trois fichiers d'autorité (`AGENTS.md`, `ZWADJ_CONTINUITE.md`, `ZWADJ_BACKLOG.md`) lus **APLATIS** (les blancs, retours à la ligne compris, ramenés à une espace : ces fichiers sont enveloppés à ~95 colonnes, toute expression de plus de quelques mots y est coupée), chaque motif **compté AVANT** d'annoter, chaque occurrence **traitée**. Compte rendu pour chacun : ce que le motif cherche, combien d'occurrences, ce qui en a été fait. Aplatis : `AGENTS.md` 207 185 caractères, `ZWADJ_CONTINUITE.md` 2 729 793, `ZWADJ_BACKLOG.md` 630 874 (relevés avant l'écriture des fichiers d'autorité de ce lot).

## Sens 1 — ce que le lot INVALIDE (une affirmation devenue fausse)

| affirmation devenue fausse | occurrences (AGENTS / CONTINUITE / BACKLOG) | traitement |
|---|---|---|
| « la demande de réservation **exige `contactPhone`** » (C-C1, D61, précision (5) de L35-4, D329/D330) | 0 / **8** / **3** | **11 sur 11 annotées sur place** : `(⛔ D337 : périmé — numéro OU e-mail)`, la phrase d'origine intacte |
| « `bookings.contact_phone` **NOT NULL** » / « (`NOT NULL en base`) » | 0 / 9 + 1 + 2 / 3 | les phrases C-C1 et D329/D330 sont couvertes par la ligne précédente ; le §2 f de la consigne du rang 41 et les deux cadrages de D328 (« les copies sur `bookings.contact_*` (NOT NULL) », DB-4) annotés `FAIT` ou `contact_phone est nullable` ; les mentions de la suppression de compte (J-1) restent vraies sur le fond |
| « une fiche sans numéro **demande le numéro** à l'écran de conversion » / « obligatoire **tant que L36-1** n'est pas livré » | 0 / 2 + 1 / 0 | **annotées PÉRIMÉES** (DR3, K-12) |
| « **la précision (5)** tient / reste vraie **jusqu'à L36-1** » | 0 / 1 / 1 | annotée (entrée L35-4 du backlog) |
| « **RANG 42 : EN ATTENTE D'ARBITRAGE DE KO** » et « rang 42 en attente » | 2 / 3 + 1 / 0 | la ligne de l'ordre des rangs est **barrée avec son motif** ; la chaîne d'`AGENTS.md` reçoit un bloc D337 qui déclare les deux occurrences PÉRIMÉES ; le tableau « ÉTAT À LA CLÔTURE DU RANG 41 » est sous un titre marqué NON COURANT ; la ligne D336 du registre est annotée |
| « **la condition de clôture du rang 33 reste OUVERTE** » | 8 / 30 voisines d'OUVERTE / 3 | **les 6 endroits où elle se lit COURANTE annotés `LEVÉE`** (ordre des rangs, tableaux d'état de clôture et d'ouverture du rang 41, titre de la section D336, registre D336 ; `AGENTS.md` : les deux dernières lignes de la chaîne + un bloc D337 qui déclare PÉRIMÉES toutes celles de D327 à D336 ; backlog : l'entrée L35-4 et l'entrée « le nom du client n'est pas sur le devis », fermée). ⚠ Les ~22 autres occurrences vivent dans des blocs DATÉS (D327 à D334) que des blocs plus récents déclarent déjà périmés ; la chaîne d'`AGENTS.md` n'a pas de ligne courante qui les contredise désormais. **Limite écrite** : un lecteur qui ouvre un bloc ancien lit sa date |
| « compteur POUR MÉMOIRE ZÉRO → UN » (D336) | 1 / 4 / 0 | **UN → DEUX** posé dans la chaîne d'`AGENTS.md`, l'ordre des rangs, le point d'entrée du rang 42 et le registre ; les occurrences de D336 sont des blocs datés |
| « S-48 à S-67 **à ratifier** » | 0 / 2 + 1 titre / 0 | annotées `ratifiées par adoption` |
| « le refus de `clientId` (DB-15) **n'a aucune cible** » | 0 / 0 / 1 | entrée du backlog **fermée** avec la mesure |

## Sens 2 — ce que le lot REND PERMIS (une permission devenue périmée par un changement de condition)

La recherche porte sur « toute phrase qui dit qu'un lot, un rang ou un code PEUT s'ouvrir, et dont la CONDITION vient de changer » (D287) :

| permission cherchée | occurrences | traitement |
|---|---|---|
| « L36-1 … **à ordonner par Ko** » / « candidat désigné : L36-1 » | `L36-1` : CONTINUITE 18, BACKLOG 5, AGENTS 1 mentions au relevé de DÉBUT de session (toutes lues) ; 29 / 8 / 3 en fin de lot, les ajouts étant ceux de ce lot | l'entrée L36-1 du backlog est **fermée** ; les mentions de D336 sont des blocs datés qui renvoient à « lot L36-1 » (annotées `FAIT`) ; aucune ne dit plus que L36-1 « peut » s'ouvrir |
| « **un lot de code PEUT s'ouvrir** dès que Ko arbitre … » / « tenable(s) » | la chaîne d'`AGENTS.md` (D324 à D336) | **inchangée par ce lot** : la limite de cinq est SUSPENDUE par Ko (D336), le compteur est tenu pour mémoire ; le bloc D337 écrit UN → DEUX et rappelle la suspension — aucune permission nouvelle ni retirée |
| « L36-9 (notifications) … dépend de L36-1 » | `L36-9` : 17 mentions dans `ZWADJ_CONTINUITE.md`, 5 dans `ZWADJ_BACKLOG.md` (relevé de fin de lot), toutes lues ; la seule où `L36-1` est voisin est la liste « les lots L36-1 à L36-9 » ; **aucune** ne conditionne L36-9 à L36-1 (la section 5 de la consigne du rang 41 le range « en dernier ») | **rien à lever** : L36-1 ne change pas l'ordre ; le gabarit de notification n'a pas bougé |
| « **RANG 43** » | 0 avant le lot | **écrit** : « RANG 43 : EN ATTENTE D'ARBITRAGE DE KO », candidat proposé L36-2 (section 5), **pas arbitré** — l'état nommé que D284 exige à la clôture d'un rang |
| « la précision (5) … la demande de RÉSERVATION exige `contactPhone` » comme **condition** d'un autre lot (L35-5, L35-6) | recherché dans leurs entrées | aucune de leurs conditions ne s'appuie sur ce fait ; S-56 (la fiche liée et la suppression de compte) est **ajouté à l'entrée L35-6** |

⚠ **Ce que cette passe ne garantit pas** : un état écrit en prose libre, sans un des motifs ci-dessus, n'est pas vu. Les motifs sont ceux que le lot DÉPLACE ; leur liste est celle de `modes-de-defaillance.md` et du recensement.
