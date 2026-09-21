"""Decompose une sortie de l'audit de D293 : alertes par fichier, par dossier de decision."""
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8")
lignes = open(sys.argv[1], encoding="utf-8").read().splitlines()
par_fichier = {}
vues = 0
for l in lignes:
    m = re.match(r"^  (docs/preuves/\S+|\.gitattributes)\s+\d+ o  (.*)$", l)
    if not m:
        continue
    vues += 1
    n = sum(int(k) for k in re.findall(r"ALERTE [a-z-]+=(\d+)", m.group(2)))
    if n:
        par_fichier[m.group(1)] = n
total = sum(par_fichier.values())
declare = re.search(r"alertes : (\d+)", "\n".join(lignes)).group(1)
print(f"lignes de fichier vues : {vues} · fichiers avec alerte : {len(par_fichier)} · somme : {total} (declare {declare})")
par_dos = Counter()
for f, n in par_fichier.items():
    par_dos["/".join(f.split("/")[:3])] += n
for d, n in sorted(par_dos.items()):
    print(f"  {d:28s} {n}")
print("-- detail")
for f, n in sorted(par_fichier.items()):
    print(f"  {n:4d}  {f}")
