"""Passe D277 de D300 — CONTRÔLE DE TRAITEMENT, sur la sortie de `balayage.py`.
Usage, depuis la racine : python3 docs/preuves/D300/passe-d277/verifier.py <sortie de balayage.py> [motif…]
Pour chaque occurrence COURANTE ou BACKLOG des motifs nommés (tous par défaut), dit si elle est TRAITÉE :
barrée (dans un `~~…~~` ouvert sur sa ligne) ou signée « D300 » dans sa fenêtre — la ligne et les 3 suivantes.
Imprime les NON TRAITÉES une à une, avec leur ligne : elles se TRIENT À LA MAIN (une non traitée peut être
juste — un pointeur vers un autre contenu de la section D270, une entrée close, un faux positif —, mais elle
se nomme). Les DATÉES ne sont pas examinées : principe de D291, une section datée est vraie à sa date.
⚠ Ne connaît AUCUN titre en particulier — c'est la différence avec `verifier-marque.py` de D299, qui devait
épingler le sous-titre de l'ordre pour le voir. Parcouru imprimé à côté de l'attendu (D290)."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
motifs = set(sys.argv[2:])
lignes, vues, examinees, traitees, non = {}, 0, 0, 0, []
for l in open(sys.argv[1], encoding="utf-8"):
    m = re.match(r"^(\S+\.md):(\d+) \[([^\]]+)\] (COURANTE|BACKLOG|DATÉE) ## (.*)$", l.rstrip("\r\n"))
    if not m:
        continue
    vues += 1
    f, n, motif, classe, titre = m.group(1), int(m.group(2)), m.group(3), m.group(4), m.group(5)
    if classe == "DATÉE" or (motifs and motif not in motifs):
        continue
    if f not in lignes:
        lignes[f] = open(f, encoding="utf-8").read().split("\n")
    L = lignes[f]
    examinees += 1
    fenetre = "\n".join(L[n - 1:n + 3])
    barre = L[n - 1].count("~~") % 2 == 1 or "~~section D270~~" in L[n - 1] or "~~D270~~" in L[n - 1]
    if "D300" in fenetre or barre:
        traitees += 1
    else:
        non.append(f"{f}:{n} [{motif}] {classe} ## {titre[:60]}\n        {L[n - 1].strip()[:150]}")
for x in non:
    print(f"   ✗ NON TRAITÉE : {x}")
attendu = sum(1 for l in open(sys.argv[1], encoding="utf-8") if re.match(r"^\S+\.md:\d+ \[", l))
print(f"== occurrences lues : {vues} (attendu {attendu}) · examinées (COURANTE + BACKLOG"
      f"{', motifs ' + ', '.join(sorted(motifs)) if motifs else ''}) : {examinees} · traitées {traitees} · "
      f"NON TRAITÉES {len(non)} — à trier une à une")
