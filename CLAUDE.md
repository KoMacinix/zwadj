@AGENTS.md

# Claude Code — Zwadj

## Ordre d'autorité

1. `AGENTS.md` — règles permanentes, invariants, interdictions. Importé ci-dessus.
2. `ZWADJ_CONTINUITE.md` — état certifié, décisions numérotées (D…).
3. `ZWADJ_BACKLOG.md` — travaux à venir. Ne décrit RIEN d'acquis.

⚠ Ils ne sont PAS importés : les lire à la demande, et par SECTION, jamais en
entier. `ZWADJ_CONTINUITE.md` fait 108 Ko, `ZWADJ_BACKLOG.md` 175 Ko.
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
