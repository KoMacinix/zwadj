"""D325 — LISTE, ligne par ligne, des occurrences de HEAD dans les sections COURANTES (suite de `trier.py`). Pièce jetable, versée.

Pour chaque ligne de HEAD d'une section courante qui porte au moins un motif de `motifs.txt` : fichier, numéro de ligne (de HEAD), motifs trouvés, début de la ligne.
Une ligne qui porte DÉJÀ un marqueur d'annotation de ce lot (« D325 ») n'existe pas à HEAD : seules les lignes de HEAD sont vues. Le TRI reste à la main.
Usage : python docs/preuves/D325/passe-d277/lister.py [fichier] [sous-chaîne de titre de section]
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine")
ici = os.path.dirname(os.path.abspath(__file__))
motifs = []
for l in open(os.path.join(ici, "motifs.txt"), encoding="utf-8"):
    l = l.rstrip("\r\n")
    if l and not l.startswith("#"):
        s, m = l.split("|", 1)
        if not s.startswith("T"):
            motifs.append((s, m))
cible = sys.argv[1] if len(sys.argv) > 1 else "AGENTS.md"
filtre = sys.argv[2] if len(sys.argv) > 2 else ""
L = subprocess.run(["git", "show", f"HEAD:{cible}"], capture_output=True).stdout.decode("utf-8").replace("\r\n", "\n").split("\n")
titre = "(avant tout titre)"
vus = 0
examines = 0
for i, l in enumerate(L):
    if l.startswith("## "):
        titre = l
    if filtre and filtre not in titre:
        continue
    if re.match(r"^## (Session |~~PROCHAIN LOT~~|Reports |Incident)", titre):
        continue
    examines += 1
    plat = re.sub(r"\s+", " ", l + " " + (L[i + 1] if i + 1 < len(L) else ""))
    trouves = [f"[{s}]{m}" for s, m in motifs if m in plat]
    if trouves:
        vus += 1
        print(f"{cible}:{i + 1} · {', '.join(trouves)[:150]}\n     {l.strip()[:170]}")
print(f"\nlignes examinées (hors sections datées) : {examines} · lignes à motif : {vus}")
