"""Calcule l'UNION des campagnes de neutralisation CONCERNÉES par le lot D341 : celles dont les fichiers lus ou mutés (le balayage large de `lancer-campagnes.py`) croisent le diff `<départ>..HEAD`.
POURQUOI PAS `lancer-campagnes.py` TEL QUEL : son tri croise les fichiers modifiés DEPUIS `HEAD` ; le code du lot est déjà commité, son diff depuis `HEAD` est vide. Même logique, autre base (D339 : « la liste CALCULÉE et VERSÉE avant de jouer »).
Imprime ce qu'il a parcouru (D290) : campagnes lues, fichiers du diff, et pour chaque campagne retenue l'intersection. Dernière ligne : `UNION: a.py,b.py,…`. Calibration, deux bras : (positif) `neutralize-r44.py` doit être retenue (elle lit des fichiers du lot) ; (négatif) une campagne qui ne lit AUCUN fichier du diff ne l'est pas.
Usage, depuis la RACINE : python3 calculer-union.py <départ> [<sortie>]"""
import importlib.util
import os
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

depart = sys.argv[1]
spec = importlib.util.spec_from_file_location("lc", "neutralisation/lancer-campagnes.py")
lc = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lc)

changes = {l for l in subprocess.run(["git", "diff", "--name-only", depart, "HEAD"], capture_output=True, text=True, encoding="utf-8").stdout.splitlines() if l.strip()}
campagnes = lc.campagnes()
retenues, sorties = [], []
sans_fichier = []
for c in campagnes:
    lus = lc.fichiers_lus(c)
    if not lus:
        sans_fichier.append(c)
    inter = sorted(lus & changes)
    if inter:
        retenues.append(os.path.basename(c))
        sorties.append(f"  {c.split('/')[-1]:34} ← {', '.join(inter)[:300]}")

# calibration
assert "neutralize-r44.py" in retenues, "calibration positive : neutralize-r44.py devrait être retenue (elle lit des fichiers du lot)"
faux = [c for c in campagnes if not (lc.fichiers_lus(c) & changes)]
assert faux, "calibration négative : au moins une campagne ne devrait PAS être retenue"

print(f"départ {depart} · fichiers du diff {depart}..HEAD : {len(changes)} · campagnes lues : {len(campagnes)} · retenues : {len(retenues)} · non retenues : {len(campagnes) - len(retenues)} · sans aucun fichier lu : {len(sans_fichier)}")
print("\n".join(sorties))
if sans_fichier:
    print("⚠ campagnes qui ne lisent AUCUN fichier (jamais retenues) : " + ", ".join(sans_fichier))
ligne = "UNION: " + ",".join(retenues)
print(ligne)
if len(sys.argv) > 2:
    open(sys.argv[2], "w", encoding="utf-8", newline="\n").write("\n".join(sorties) + "\n" + ligne + "\n")
