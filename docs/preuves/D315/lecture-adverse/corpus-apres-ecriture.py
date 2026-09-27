"""D315 — le balayage D277 « après écriture » décrit-il l'état COMMITÉ ? Pièce jetable, versée. N'écrit rien.
Pour D311 à D314 : la taille du corpus aplati que l'en-tête de `balayage-apres-ecriture.txt` imprime (« arbre N car. »),
confrontée à celle du même corpus (les quatre `.md` d'autorité, blancs aplatis comme `balayage.py` le fait) au commit qui
clôt le lot — trouvé par `git log --grep "<Dnnn> —" -- ZWADJ_CONTINUITE.md`, le plus récent. Un écart non nul dit que du
texte a été écrit APRÈS le balayage ; il ne dit pas si ce texte porte des motifs (D314 : oui, trois — lecture adverse).
Calibration : le bras négatif — `balayage-1.txt` de D314 a été pris sur un arbre égal à HEAD (en-tête « HEAD N · arbre N ») :
l'écart de sa taille d'arbre au corpus de 0057748 doit être 0.
Usage, depuis la racine :  python docs/preuves/D315/lecture-adverse/corpus-apres-ecriture.py
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)
F = ["CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]


def plat(t: str) -> str:
    return re.sub(r"\s+", " ", t)


def corpus(sha: str) -> int:
    return sum(len(plat(subprocess.run(["git", "show", f"{sha}:{f}"], capture_output=True).stdout.decode("utf-8"))) for f in F)


h = open("docs/preuves/D314/passe-d277/balayage-1.txt", encoding="utf-8").readline()
neg = int(re.search(r"arbre (\d+) car", h).group(1)) - corpus("0057748")
print(f"calibration, bras négatif : balayage-1 de D314 contre 0057748 : écart {neg} (attendu 0)")
if neg != 0:
    print("✗ ABANDON : calibration manquée")
    sys.exit(2)
vus = 0
for d in ("D311", "D312", "D313", "D314"):
    chemin = f"docs/preuves/{d}/passe-d277/balayage-apres-ecriture.txt"
    if not os.path.isfile(chemin):
        print(f"{d} : pas de {chemin}")
        continue
    vus += 1
    m = re.search(r"arbre (\d+) car", open(chemin, encoding="utf-8").readline())
    sha = subprocess.run(["git", "log", "-1", "--format=%h", "--grep", f"{d} —", "--", "ZWADJ_CONTINUITE.md"],
                         capture_output=True, text=True).stdout.strip()
    n = corpus(sha)
    print(f"{d} : commit de clôture {sha} · arbre du balayage-après {m.group(1)} car. · corpus commité {n} car. · "
          f"écrit APRÈS le balayage : {n - int(m.group(1))} car.")
print(f"parcouru : {vus} lots sur 4")
