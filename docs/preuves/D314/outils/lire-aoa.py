"""D314 — LECTURE D'`available-on-api` À LA CERTIFICATION QUI CLÔT LE RANG 23 : preuve LUE du point 12 (Ko, D313, 1b).
Le lecteur est celui de D312, INDÉPENDANT du harnais (`docs/preuves/D312/campagne/lire-journaux.py`, pièce non
retouchée, rejouée par D313 sur ses pièces : sortie identique) ; il exige, par cible, exécutés (passés + en échec) > 0,
en échec > 0, chaque bloc en `AssertionError`, chaque titre en échec portant le filtre de la cible, code non nul — et,
pour la calibration et le pré-vol du harnais, l'état attendu de chaque journal. Ce script ne fait que le CALIBRER puis
le lancer, et imprime sa sortie entière.
Usage, depuis la racine :
    python docs/preuves/D314/outils/lire-aoa.py                       # calibration seule
    python docs/preuves/D314/outils/lire-aoa.py <dossier available-on-api de la passe>
CALIBRATION À DEUX BRAS, ABANDON SI UN BRAS MANQUE (D286) :
  positif  les 30 journaux versés par D312 (`docs/preuves/D312/campagne/journaux-aoa-2/`) : « écarts 0 » ;
  négatif  une COPIE de ces 30 journaux (hors dépôt) où `A1.txt` est remplacé par le journal d'un NON-DÉMARRAGE mesuré
           (`calibration-2-commande-introuvable.txt`, même dossier : code 1, aucune ligne « Tests ») : écarts ≥ 1.
"""
import os
import re
import shutil
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
LECTEUR = "docs/preuves/D312/campagne/lire-journaux.py"
REF = "docs/preuves/D312/campagne/journaux-aoa-2"
FIN = re.compile(r"journaux lus : (\d+) \(attendu 30\) · pré-vol (\d+) .* écarts (\d+) \(attendu 0\)")


def lancer(dossier: str):
    r = subprocess.run([sys.executable, LECTEUR, dossier], capture_output=True, text=True, encoding="utf-8", errors="replace")
    m = FIN.search(r.stdout or "")
    return r.returncode, (r.stdout or "") + (r.stderr or ""), (tuple(int(x) for x in m.groups()) if m else None)


print("== CALIBRATION, deux bras (abandon si un seul manque)")
c, s, f = lancer(REF)
pos = f is not None and f[0] == 30 and f[2] == 0
print(f"  {'✓' if pos else '✗'} positif D312 : journaux, pré-vol, écarts = {f} (attendu (30, 12, 0))")
tmp = os.path.join(".neutralisation-journaux", "D314-calibration-aoa")
if os.path.exists(tmp):
    shutil.rmtree(tmp)
shutil.copytree(REF, tmp)
shutil.copyfile(os.path.join(REF, "calibration-2-commande-introuvable.txt"), os.path.join(tmp, "A1.txt"))
c, s, f = lancer(tmp)
neg = f is not None and f[2] >= 1 and re.search(r"^✗ A1\b", s, re.M) is not None
print(f"  {'✓' if neg else '✗'} négatif : A1 remplacé par un non-démarrage ⇒ journaux, pré-vol, écarts = {f} (attendu écarts ≥ 1) "
      f"· ligne « ✗ A1 » : {bool(re.search(r'^✗ A1\b', s, re.M))} (attendu True)")
if not (pos and neg):
    print("✗ ABANDON — calibration manquée.")
    sys.exit(2)
if len(sys.argv) < 2:
    print("(calibration seule : aucun dossier de passe donné)")
    sys.exit(0)
print(f"\n== PASSE : {sys.argv[1]}")
c, s, f = lancer(sys.argv[1])
print(s)
print(f"RÉSUMÉ : journaux, pré-vol, écarts = {f} · code du lecteur {c}")
sys.exit(0 if (f is not None and f[0] == 30 and f[2] == 0 and c == 0) else 1)
