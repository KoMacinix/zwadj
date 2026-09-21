"""Ecrit le bloc Python du registre des sorties predecesseures, DERIVE du disque (candidats par ligne de
bilan), dans un fichier : aucun chiffre n'est retape a la main."""
import hashlib
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
BILAN = re.compile(r"^\s*parcourus : \d+ fichiers, \d+ octets · alertes( de secret)? : \d+ \(attendu 0\)", re.M)
PRODUCTEUR = [
    ("docs/preuves/D291/controles/integrite-et-secrets-", "D291/controles/integrite-et-secrets.py"),
    ("docs/preuves/D293/versement-d288/verser-et-confronter", "D293/versement-d288/verser-et-confronter.py"),
    ("docs/preuves/D293/outils/audit-secrets-", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D294/outils/audit-secrets-", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D296/audit-secrets-", "D293/outils/audit-secrets.py"),
    ("docs/preuves/D297/audit-secrets-", "D293/outils/audit-secrets.py"),
]
lignes = []
for base, _, noms in os.walk(os.path.join("docs", "preuves")):
    for n in sorted(noms):
        p = os.path.join(base, n).replace(os.sep, "/")
        b = open(p, "rb").read()
        if not BILAN.search(b.decode("utf-8", errors="replace")):
            continue
        prod = [i for pre, i in PRODUCTEUR if p.startswith(pre)]
        if len(prod) != 1:
            sys.exit(f"ABANDON : producteur non attribuable pour {p} ({prod})")
        lignes.append(f'    ("{p}", "{hashlib.sha256(b).hexdigest()}", "{prod[0]}"),')
lignes.sort()
open(sys.argv[1], "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
print(f"{len(lignes)} entrees ecrites dans {sys.argv[1]}")
