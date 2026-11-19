# D353 — la passe D277, dans les DEUX sens (D277, D287) : ce que ce lot invalide, et ce qu'il rend permis

**Instrument** : `passe-d277.py` (deux étapes : les comptes et les contextes, puis la classification par annotation à ±450 caractères aplatis). **Sortie** : `passe-d277-sortie.txt` (avec `--voir`). **Corpus** : les QUATRE fichiers d'autorité, texte APLATI, **4 573 827 caractères parcourus au premier passage** (`ZWADJ_CONTINUITE.md` 3 544 008 · `ZWADJ_BACKLOG.md` 759 517 · `AGENTS.md` 265 096 · `CLAUDE.md` 5 206), **4 574 573 au passage rejoué** après les deux annotations de ce document (la sortie versée est celle du passage rejoué). **18 motifs** : 11 « INVALIDE » (des affirmations que le lot rend fausses), 7 « PERMET » (des phrases qui autorisaient ou refusaient à bon droit hier).
⛔ **L'instrument LISTE, il ne tranche pas** : les comptes sont une entrée de lecture, pas un verdict. Un motif à zéro est une **hypothèse à vérifier** (D295) ; un motif au compte très haut aussi (n° 13 : 169).

## Ce qui a été trouvé, et ce qui a été fait

| n° | sens | motif | occurrences | lecture |
|---|---|---|---|---|
| 01 | INVALIDE | « RANG 55 : EN ATTENTE DE CADRAGE DU RELECTEUR » | 10 | **toutes annotées** : la ligne de l'ordre des rangs est BARRÉE avec son motif (E1 de `apply-continuite.py`) ; les autres sont dans des blocs de D352 barrés ou datés |
| 02 | INVALIDE | « la mémoire du site client » = candidat « pas arbitré » | 3 | annotées (le paragraphe de l'ordre des rangs barré ; l'annotation d'`AGENTS.md`) |
| 03 | INVALIDE | « n'ont pas été mesurées sous ce mécanisme » (référentiels) | 3 | **annotées** : l'invariant de D348 reçoit l'annotation « PÉRIMÉ » et l'invariant neuf juste dessous (`AGENTS.md`) |
| 04 | INVALIDE | le `no-store` de la carte « n'est affirmé par AUCUN test » | 1 | **annotée en place** dans l'invariant de D351 (`AGENTS.md`, « PÉRIMÉ ») |
| 05 | INVALIDE | « sans créneau actif » non joué sur la carte | 7 | **4 annotées** (dont `AGENTS.md`, annotée en place) ; **3 « sans annotation » classées** : 2 dans des blocs DATÉS de D352 (l'arbitrage du rang 54, le paragraphe barré de l'ordre des rangs) et 1 dans l'entrée de backlog `[SITE CLIENT]`, **close `[x]` avec son annotation D353 en fin d'entrée** |
| 06 | INVALIDE | S-153 « la spec tolère l'absence de puces » | 6 | **UNE ÉDITION : S-153 est BARRÉE avec son motif** dans la section D346 (« RETIRÉE », `ZWADJ_CONTINUITE.md`) ; les 3 autres « sans annotation » sont le tableau d'ouverture de ce lot (l'état de DÉPART, dit comme tel), ma propre annotation, et l'entrée de backlog close |
| 07 | INVALIDE | les listes vides « pour tout test qui suit » / « Aucun style publié » / « la base e2e ne publie AUCUN style » | 5 | **UNE ÉDITION (avec le n° 08)** ; les « sans annotation » sont l'état de départ du tableau d'ouverture, ma propre section et l'entrée de backlog close |
| 08 | INVALIDE | la piste « en production, une liste vide resterait une heure » NON établie | 2 | **UNE ÉDITION : « Piste, non établie » est BARRÉE, « LA PISTE EST ÉTABLIE » la remplace** (section D346) ; l'entrée de backlog est close avec son annotation |
| 09 | INVALIDE | compteur TRENTE-QUATRE | 19 | **17 annotées ou datées** ; 2 « sans annotation » dans le TABLEAU de clôture du rang 54, **barré à son titre** (« PÉRIMÉ sur … compteur TRENTE-QUATRE ») |
| 10 | INVALIDE | S-218 à S-230 « à ratifier » | 6 | annotées ; 1 dans le tableau de clôture du rang 54 (barré) ; **la chaîne d'`AGENTS.md` dit maintenant « ratifiées par adoption »** |
| 11 | INVALIDE | « dernier numéro attribué : D352 » / « D352 est au registre » | 2 | **les deux dans le tableau de clôture du rang 54, barré à son titre** ; le tableau neuf dit D353 |
| 12 | PERMET | « le correctif vit dans `e2e/` seul » (ordre du semis, purge) | 2 | la consigne telle que citée, + S-232 qui dit qu'elle n'a pas été suivie (mesure) ; rien ne l'autorise ou l'interdit plus qu'avant |
| 13 | PERMET | la règle courante des lots de code (limite SUSPENDUE, aucune certification, aucune marque) | **169** | **non lu un à un** : le motif est volontairement large ; **la règle n'a pas changé** (la limite de cinq reste suspendue, le compteur passe à TRENTE-CINQ) ; le sous-ensemble qui parle du compteur COURANT est couvert par le n° 09 |
| 14 | PERMET | « RANG 56 » | 5 | toutes de ce lot |
| 15 | PERMET | `no-store` partout, `[CLIENT][PERF]`, « restent en `no-store` » | 11 | lues : D348 et la fiche (inchangées) ; la relecture de ce lot est une entrée `[CLIENT][PERF]` neuve (backlog) |
| 16 | PERMET | `api.ts` « n'est pas touché » / rien dans `apps/client` | 5 | blocs DATÉS de D352 et R-6 de ce lot (« seul `api.ts`, et dans lui seulement les trois fonctions ») |
| 17 | PERMET | l'en-tête de l'assistant d'une salle | 5 | l'entrée de backlog est ANNOTÉE avec la réponse de Ko (« APRÈS ») ; les autres sont de D352 |
| 18 | PERMET | **CIBLÉ** : une phrase qui dit qu'un lot de code PEUT / NE PEUT PAS s'ouvrir, ou qui attend, à cause du rang 55 | 1 | **zéro permission périmée** : l'unique occurrence est le titre de l'invariant neuf (« UNE LISTE PLEINE PEUT RESTER GARDÉE… (D353, rang 55) »), un faux positif de forme. Une recherche plus large (`arbitr*`/`cadr*`/`ordonn*` à moins de 60 caractères de « rang 55 ») rend 6 occurrences : **toutes de ce lot ou dans des blocs de D352 barrés** |

## Les deux éditions que la passe a provoquées

1. **S-153 de D346** (« la spec du lot tolère l'absence de puces de goûts ») est **BARRÉE avec son motif** : `r48` n'a plus de tolérance ; la suite complète était verte par l'effet de bord d'un autre spec, `r48` seule rougissait.
2. **La « piste, non établie » de D346** (une liste vide rendue une fois resterait servie une heure) est **BARRÉE et remplacée par « LA PISTE EST ÉTABLIE »** : mesurée sur un build de production et sur `next dev`.
Les deux sont des annotations en place, pas des réécritures.

## Ce que cette passe NE dit PAS

- Elle **ne lit pas** les 169 occurrences du n° 13 : c'est un motif de **sens** « PERMET » volontairement large, dont aucune phrase n'a été trouvée périmée par la lecture ciblée du n° 18 et de la recherche élargie ; **une passe partielle se lit exactement comme une passe faite** (D200) : ce document le dit.
- Elle ne couvre pas les affirmations qu'aucun de ses 18 motifs ne vise (un motif à zéro est une hypothèse).
- Les « sans annotation » classés ici comme « bloc daté » ou « tableau barré à son titre » reposent sur une **lecture** de la structure du fichier, pas sur la fenêtre de ±450 caractères de l'instrument.
