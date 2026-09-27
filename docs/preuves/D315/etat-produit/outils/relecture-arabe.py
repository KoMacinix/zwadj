"""D315 — rang 24 — la relecture humaine de l'arabe est-elle tracée comme FAITE quelque part ? Pièce jetable, versée.
Pourquoi ce balayage existe : le détecteur de `verifier-deploiement.py` (« … relues/validées par … ») a rendu 0, et un
zéro se confronte à la sortie brute avant d'être cru (D275) — il ne voit ni « relecture faite », ni une négation dont le
verbe est mis en gras. Celui-ci est volontairement LARGE : toute occurrence de « relu / relue(s) / relus / relecture /
relire » à moins de 80 caractères de « arabe », « AR » ou « locuteur », dans le texte APLATI des trois fichiers
d'autorité au commit lu, imprimée avec son contexte. Le TRI se fait à la main, dans la pièce d'état : l'outil ne juge pas.
Usage, depuis la racine :  python docs/preuves/D315/etat-produit/outils/relecture-arabe.py [SHA]   (défaut : HEAD)
"""
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sha = sys.argv[1] if len(sys.argv) > 1 else "HEAD"
tot, car = 0, 0
for f in ("AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"):
    t = re.sub(r"\s+", " ", subprocess.run(["git", "show", f"{sha}:{f}"], capture_output=True).stdout.decode("utf-8"))
    car += len(t)
    for m in re.finditer(r"(?i)\brelu(e|es|s)?\b|relecture|relire", t):
        fen = t[max(0, m.start() - 80):m.end() + 80]
        if re.search(r"(?i)arabe|\bAR\b|locuteur", fen):
            tot += 1
            print(f"{f}@{m.start()}: …{fen}…")
print(f"parcouru : 3 fichiers, {car} caractères aplatis · occurrences près de « arabe / AR / locuteur » : {tot}")
