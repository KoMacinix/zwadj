"""Cherche sous docs/preuves les fichiers qui portent la LIGNE DE BILAN d'un audit de secrets
(« parcourus : N fichiers, M octets · alertes… (attendu 0) »), et imprime chemin, empreinte, nombre de
lignes de bilan et premiere ligne. Rend aussi ce qu'il a parcouru (D290)."""
import hashlib
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
BILAN = re.compile(r"^\s*parcourus : \d+ fichiers, \d+ octets · alertes( de secret)? : \d+ \(attendu 0\)", re.M)
vus = 0
trouves = []
for base, _, noms in os.walk(os.path.join("docs", "preuves")):
    for n in sorted(noms):
        p = os.path.join(base, n)
        vus += 1
        b = open(p, "rb").read()
        t = b.decode("utf-8", errors="replace")
        k = len(BILAN.findall(t))
        if k:
            trouves.append((p.replace(os.sep, "/"), hashlib.sha256(b).hexdigest(), k, len(b), t.split("\n", 1)[0][:90]))
for p, h, k, o, l1 in sorted(trouves):
    print(f"{p}\t{h}\t{k}\t{o}\t{l1}")
print(f"== parcourus : {vus} fichiers · portant une ligne de bilan d'audit : {len(trouves)}")
