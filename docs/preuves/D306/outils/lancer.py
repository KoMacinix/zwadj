# D306 — session ADVERSE de 23a. Lanceur de mesure : exécute UNE commande, écrit sa
# sortie BRUTE (stdout + stderr, octets tels quels) dans un fichier, et son code de
# sortie dans un fichier voisin `.code`. Rien d'autre.
#
# Usage, depuis n'importe où :
#     python lancer.py <sortie.txt> <dossier-de-travail> -- <commande> [args...]
#
# POURQUOI : une sortie de vitest qui ne vit que dans une variable de shell ne se
# relit pas (D270) ; une redirection PowerShell 5.1 réencode en UTF-16 (D298). Ici,
# les octets vont au fichier sans traverser de console.
# Ce n'est PAS un instrument du dépôt : c'est une pièce de D306, qui dit comment
# ses sorties ont été produites.
import os
import shutil
import subprocess
import sys
import time
from datetime import datetime

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")


def main() -> int:
    if "--" not in sys.argv or len(sys.argv) < 5:
        print("usage: lancer.py <sortie.txt> <cwd> -- <commande...>", file=sys.stderr)
        return 2
    i = sys.argv.index("--")
    sortie, cwd = sys.argv[1], sys.argv[2]
    commande = sys.argv[i + 1:]
    exe = shutil.which(commande[0]) or commande[0]
    commande = [exe] + commande[1:]
    os.makedirs(os.path.dirname(os.path.abspath(sortie)), exist_ok=True)
    debut = datetime.now()
    t0 = time.monotonic()
    with open(sortie, "wb") as f:
        p = subprocess.run(commande, cwd=cwd, stdout=f, stderr=subprocess.STDOUT)
    duree = time.monotonic() - t0
    with open(sortie + ".code", "w", encoding="utf-8", newline="\n") as f:
        f.write(f"{p.returncode}\n")
    print(f"LANCER debut={debut:%Y-%m-%d %H:%M:%S} duree={duree:.1f}s code={p.returncode} sortie={sortie}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
