# D306 — lit, avec `lire.py` (calibré), les sorties de `neutralize-rang23.py` des DEUX passes de D305 :
#   - celle VERSÉE par D305 (`docs/preuves/D305/neutralisation/`, fichiers de 00:49) ;
#   - celle de la passe des portes (01:00–01:03), restée dans `.neutralisation-journaux/` et COPIÉE ici
#     (`docs/preuves/D306/lecture-adverse/journaux-rang23-passe-des-portes/`, empreintes à côté).
# Usage, depuis la racine :  python docs/preuves/D306/outils/lire-deux-passes.py
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lire import rapport  # noqa: E402
from titres import TITRES  # noqa: E402

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

PASSES = {
    "versée par D305 (00:49)": "docs/preuves/D305/neutralisation",
    "passe des portes (01:00-01:03)": "docs/preuves/D306/lecture-adverse/journaux-rang23-passe-des-portes",
}
CIBLES = {
    "R23-F1-a-int-reservations.txt": ["T1", "T2"],
    "R23-F1-b-int-reservations.txt": ["T1", "T2"],
    "R23-F5-a-int-reservations.txt": ["T3"],
    "R23-F5-b-int-reservations.txt": ["T3"],
    "R23-F5-c-unit-transitions.txt": ["U1", "U2"],
    "pre-vol-int-reservations.txt": [],
    "pre-vol-unit-transitions.txt": [],
}
for nom, dossier in PASSES.items():
    print(f"################ {nom} — {dossier}")
    for f, cles in CIBLES.items():
        print(rapport(os.path.join(dossier, f), [TITRES[k] for k in cles]))
        print()
