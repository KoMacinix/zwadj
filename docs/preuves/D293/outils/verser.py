"""Copie octet pour octet des journaux qu'une decision cite, verifiee par empreinte (regle des preuves, D291).

Usage, depuis la racine : python docs/preuves/D293/outils/verser.py DESTINATION SOURCE [SOURCE...]
Rend, par fichier, la taille et le sha256 de la source et de la copie ; puis le nombre parcouru, le nombre
identique et l'attendu. Une copie existante et DIFFERENTE fait abandonner : une preuve ne s'ecrase pas.
"""
import hashlib
import os
import shutil
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if len(sys.argv) < 3:
    sys.exit("ABANDON : usage DESTINATION SOURCE [SOURCE...]")
dest, sources = sys.argv[1], sys.argv[2:]
os.makedirs(dest, exist_ok=True)


def sha(c):
    return hashlib.sha256(open(c, "rb").read()).hexdigest()


egaux = 0
for s in sources:
    d = os.path.join(dest, os.path.basename(s))
    h = sha(s)
    if os.path.exists(d) and sha(d) != h:
        sys.exit(f"ABANDON : {d} existe et differe de sa source")
    if not os.path.exists(d):
        shutil.copyfile(s, d)
    ok = sha(d) == h == sha(s)
    egaux += ok
    print(f"  {'✓' if ok else '✗'} {s} -> {d.replace(os.sep, '/')}  {os.path.getsize(d)} o  {h}")
print(f"fichiers parcourus : {len(sources)} · copies identiques : {egaux} (attendu {len(sources)})")
sys.exit(0 if egaux == len(sources) else 1)
