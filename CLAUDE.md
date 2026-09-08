@AGENTS.md

# Claude Code — Zwadj

## Ordre d'autorité

1. `AGENTS.md` — règles permanentes, invariants, interdictions. Importé ci-dessus.
2. `ZWADJ_CONTINUITE.md` — état certifié, décisions numérotées (D…).
3. `ZWADJ_BACKLOG.md` — travaux à venir. Ne décrit RIEN d'acquis.

⚠ Ils ne sont PAS importés : les lire à la demande, et par SECTION, jamais en
entier — **les deux sont volumineux, et ils grossissent à chaque lot.**
⛔ **AUCUNE TAILLE N'EST ÉCRITE ICI, ET C'EST DÉLIBÉRÉ (D268).** Cette ligne a porté
« 108 Ko » et « 175 Ko » : mesuré le 04/09/2026, les deux étaient faux — l'un de plus
du double. Un chiffre figé sur une quantité qui bouge, dans le SEUL fichier chargé à
chaque session, se recopie longtemps après avoir cessé d'être vrai. ⇒ Pour la taille
du jour : `ls -l`.
⛔ Ne jamais écrire leur nom précédé d'un `@` : ce serait un import, et la
session démarrerait avec des dizaines de milliers de tokens de journal.

Les journaux datés sont archivés dans `docs/history/` (lot R1). Ne les ouvrir
que pour retrouver le RAISONNEMENT d'une décision ancienne — jamais pour
connaître l'état courant, qui n'est que dans `ZWADJ_CONTINUITE.md`.

⛔ Le **registre des décisions** est en bas de `ZWADJ_CONTINUITE.md`. Un numéro se
prend en LISANT ce registre — jamais depuis un résumé, la mémoire, ni un compteur
recopié ailleurs. ⚠ Cette ligne portait « D1 à D266 » : un numéro figé dans un
fichier chargé à chaque session est faux dès le lot suivant.

## Avant de toucher au code

- Lire la section la PLUS RÉCENTE de `ZWADJ_CONTINUITE.md`. Un numéro de
  décision se prend en LISANT ce fichier — jamais depuis un résumé, jamais
  depuis la mémoire. Des collisions ont eu lieu quand cette règle a sauté.
- Énumérer les fichiers attendus AVANT d'écrire. En fin de lot, `git diff` ne
  doit contenir que ceux-là. C'est ce qui remplace le contrôle de provenance
  des archives : deux incidents de code sans origine traçable ont été
  attrapés par lui.

## Un seul lot à la fois

Pas de refactoring opportuniste en passant. Un défaut croisé se RAPPORTE au
backlog, il ne se corrige pas dans un lot qui parle d'autre chose.

⛔ S'ARRÊTER ET DEMANDER avant : un nouveau contrat d'API ; tout code sur le
CHEMIN DE L'ARGENT sans analyse écrite des modes de défaillance ; toute
modification de comportement non demandée.

## Portes, dans cet ordre, APRÈS la dernière modification

```
pnpm typecheck
pnpm lint
pnpm test
pnpm build
pnpm test:int
pnpm test:e2e          # à la demande, pas systématique
```

Puis le harnais du lot, depuis la RACINE :

```
python3 neutralisation/neutralize-<lot>.py       # le harnais du lot
python3 neutralisation/lancer-campagnes.py       # les campagnes que le lot TOUCHE
```

Le second croise `git diff --name-only HEAD` avec les fichiers que lit chaque
campagne, et ne joue que les concernées — un lot peut périmer l'ancre d'une cible
sans qu'aucune porte ne le dise. `--tout` avant une LIVRAISON.

⛔ Une garde qui ne mord pas n'est pas une garde. Un test vert qui ne mesure
rien est pire que pas de test : il donne une assurance fausse.

⛔ Ne rien déclarer vert sans l'avoir lancé. « Non concluant sur un point »
n'est pas « inutile » : on lance l'outil, PUIS on trie. Un lot est déjà parti
en livraison parce que `tsc` avait été déclaré non mesurable au lieu d'être
exécuté (D262).

## Mesure

- Aucune valeur attendue ne s'écrit de mémoire : on la dérive du système réel.
- On confronte à l'AUTORITÉ (constante partagée, `SELECT`, énumération), jamais
  à une liste recopiée dans le test.
- Avant/après se MESURENT, ils ne s'estiment pas.
- Un défaut se reproduit par une mesure avant d'être corrigé.

## Fin de lot

Présenter : le `git diff`, les portes exécutées AVEC leurs chiffres, et les
limites restantes. Puis s'arrêter.

⛔ **UN LOT PAR SESSION.** Quand un lot est clos ou livré, **dire à Ko d'ouvrir une
nouvelle session, et s'arrêter**. Un lot découvert en cours de route se **REPORTE au
backlog**, il ne s'ouvre pas dans la foulée. La reprise se fait par
`ZWADJ_CONTINUITE.md` **seul**.

⚠ **SA RAISON N'EST PAS L'HYGIÈNE DE CONTEXTE, C'EST UNE MESURE.** Reprendre dans une
session neuve est le seul test réel de « ce fichier suffit-il à reprendre sans Ko ».
Tant qu'on enchaîne dans le même fil, la question reste théorique et le fichier peut
se dégrader sans que personne le voie. La reprise du 31/08 en a donné la
démonstration : **trois des quatre points de contexte** donnés de mémoire étaient
contredits par le dépôt — branche, nombre de lots en attente, provenance.

⛔ **CETTE RÈGLE A DÉJÀ ÉTÉ DEMANDÉE, ET ELLE AVAIT DISPARU.** Elle a vécu dans un
message de chat, plusieurs sessions durant, sans jamais atterrir dans un fichier :
vérifié le 02/09/2026, **zéro occurrence** dans `AGENTS.md`, `CLAUDE.md` et
`ZWADJ_CONTINUITE.md`, tous trois pourtant postérieurs. Elle a donc cessé d'être
appliquée — D271, D272 et le cadrage sharp ont été faits dans la même session, chacun
faisant naître le suivant. **C'est le défaut que ce dépôt corrige en boucle, appliqué
à la règle qui devait l'empêcher.**

⇒ **Corollaire, à tenir en fin de session** : confirmer explicitement à Ko que ce qui
a été décidé dans le chat a bien atterri dans un FICHIER, et lequel. Une décision qui
n'existe que dans le fil disparaît avec lui.
