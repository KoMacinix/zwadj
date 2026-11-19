# D352 — passe D277 (deux sens, D287) : ce que le lot INVALIDE et ce qu'il REND PÉRIMÉ, cherché dans les QUATRE fichiers d'autorité

**Instrument** : `docs/preuves/D352/passe-d277.py` (deux étapes dans le même fichier), sortie versée `passe-d277-sortie.txt`. Texte **APLATI** (blancs fusionnés) : 4 497 906 caractères parcourus (`ZWADJ_CONTINUITE.md` 3 481 315, `ZWADJ_BACKLOG.md` 751 113, `AGENTS.md` 260 272, `CLAUDE.md` 5 206). Le compte de ce qui a été parcouru s'imprime à côté de chaque total (D290). **La passe a été jouée AVANT et APRÈS l'écriture de clôture** ; seule la seconde sortie est versée.

## Sens 1 — ce que le lot INVALIDE (les affirmations devenues FAUSSES)

| motif | occurrences (après écriture) | traitement |
|---|---|---|
| « la liste « Mes salles » dit encore « en attente » pour une salle refusée » (et ses variantes, insensible à la casse) | **5 examinées, 0 sans annotation** | les annotations de D351 (`AGENTS.md`, backlog) reçoivent **« D352 : FAIT »** ; l'entrée du backlog et son doublon « Reports du 17/11/2026 » passent à `[x]` avec leur motif |
| « Refusée » dans la liste, **contrat d'API : s'arrêter et demander** | 8 (continuité 2, backlog 6) | les deux de la continuité sont dans des lignes BARRÉES (le rang 54 « en attente ») ; les six du backlog : les entrées du rang 54 (`[x]` + note), la voie (B) de la nouvelle entrée (légitime : c'est SA condition), deux entrées sans rapport (« un contrat d'API — s'arrêter et demander » pour d'autres sujets) |
| S-192 (« écart du harnais, à ratifier » / « refusée » / « les 29 gardes en erreur de requête ») | **51 examinées, 8 sans annotation à ±450 caractères** | les 8 sont lues une à une : lignes BARRÉES (le rang 53 et le rang 54 « en attente »), citations de la consigne de D351 (le bloc d'arbitrage du rang 53), l'état d'ouverture de D351 et la copie de sa table (heading barré), la ligne de registre de D350 (annotée à son extrémité), et deux phrases de mon propre texte (S-224 ; le § 2) — **exactes**. **Deux phrases DATÉES de D350 sont ANNOTÉES** (« 29 gardes sont lues en erreur de requête… », « les 29 gardes lues par requête de présence… ») et la **ligne de registre de D350** : « D352 : PÉRIMÉ » |
| « 29 gardes » (en erreur de requête) | 46 examinées, 12 sans annotation | même lecture, une à une : lignes barrées, citations de la consigne de D351, l'historique de D351 (« ce qui atterrit où »), la table d'ouverture recopiée de D352 et ma propre section (**exactes**), la phrase de `AGENTS.md` (la mienne) — **aucune n'affirme encore que la garde se lit en erreur de requête** ; les deux phrases de D350 sont annotées |
| `MORD-REQ` / « lue(s) en ERREUR DE REQUÊTE » / « morsure de PRÉSENCE » | 5 examinées, 2 sans annotation | mes deux phrases de la section D352 (§ 2), qui **décrivent le retrait** |
| **« S-193 » : « la liste garde son badge « En attente » (lire le refus de chaque carte coûterait un appel par salle) »** | 1 SANS annotation — **trouvée par une recherche de formulation voisine, pas par le motif d'origine** | **ANNOTÉE** (« D352 : PÉRIMÉ — la liste lit désormais le refus… ») ; ⚠ le motif 01 d'origine ne la voyait pas (la phrase dit « la liste des salles du pro garde son badge », pas « dit encore ») : **un motif ne vaut que par la phrase qu'on a imaginée** (D277) |

## Sens 2 — ce que le lot REND PÉRIMÉ comme PERMISSION (D287 : le sens qui ne se rattrape pas)

| motif | occurrences | traitement |
|---|---|---|
| « RANG 54 : EN ATTENTE DE CADRAGE / OUVERT » | 23 (continuité 17, backlog 3, AGENTS 3) | le rang 54 est CLOS : les lignes « EN ATTENTE » et « OUVERT » sont BARRÉES avec leur motif (continuité), annotées (AGENTS, chaîne du compteur : « PÉRIMÉ ») ; les entrées du backlog « candidat du rang 54 » sont `[x]` |
| **« RANG 55 » (0 avant l'écriture : une hypothèse à vérifier)** | **4 après** | la forme « RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR » est ÉCRITE (continuité 2, backlog 1, AGENTS 1) — **aucune phrase ne dit qu'un lot « peut s'ouvrir »** : le candidat est « proposé, pas arbitré » |
| compteur « TRENTE-TROIS » | 13 | historique de D351 (barré/daté) ; la ligne de `AGENTS.md` de D352 écrit **TRENTE-TROIS → TRENTE-QUATRE** ; la table de clôture dit TRENTE-QUATRE |
| « un lot de code PEUT s'ouvrir » / « aucune certification » / « limite de cinq SUSPENDUE » (la règle courante) | 102 | **la règle ne change pas** : la limite de cinq reste SUSPENDUE par Ko, aucune certification, aucune marque, la pause du paiement en ligne inchangée ; les 102 occurrences sont l'historique daté de D321 à D351 ou le rappel de cette règle, aucune ne dit le contraire |

## Motifs restés à ZÉRO — des HYPOTHÈSES, vérifiées (jamais lues « rien à signaler »)

- **« `venue-form.tsx` n'est PAS modifié » / « `PublicationBadge` reste ce qu'il est » : 0 dans les `.md`** — la phrase n'est pas dans un fichier d'autorité ; elle est dans DEUX COMMENTAIRES DE CODE (`publication-review.tsx`, `publication-review.test.tsx`) **que ce lot ANNOTE**, et dans un troisième (`edit-venue-page.tsx`, hors de la table) **reporté au backlog**. Vérifié par `grep`, pas supposé.
- **« la carte de la liste ne lit pas le refus » : 0** avec le motif d'origine — **vérifié par DEUX autres formulations** (« la liste ne le lit pas », « lecture par carte coûterait », « un appel par salle ») : les deux premières **1 occurrence chacune, annotée** ; la troisième **a trouvé la phrase de S-193** ci-dessus.

## Ce que cette passe ne garantit pas

Une passe par motifs ne trouve que les phrases qu'on a imaginées : la phrase de S-193 a échappé à l'un d'eux et n'a été trouvée que par une formulation voisine. **Une paraphrase non imaginée peut subsister** ; la lecture adverse d'une reprise à froid reste le contrôle.
