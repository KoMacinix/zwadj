"""Confronte, octet pour octet, chaque fichier INDEXE sous les dossiers donnes a son blob dans l'index git.

Usage, depuis la racine, APRES `git add` : python docs/preuves/D293/outils/verifier-blobs.py DOSSIER [DOSSIER...]
POURQUOI : `.gitattributes` coupe la conversion des fins de ligne sous docs/preuves/ (D291) ; ce controle
MESURE qu'elle a bien ete coupee au lieu de le supposer. Le fichier est lu par Python, le blob par
`git cat-file` : aucune citation ne traverse un interpreteur (D291, faute n°3 de la cloture).
Seule exception, declaree : la sortie de CE controle, ecrite apres lui, dont le blob n'est pas confronte.
CALIBRATION, deux bras, sur un fichier indexe reel : identique -> 1 egalite ; un octet altere EN MEMOIRE -> 0.
"""
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")


def blob(chemin):
    r = subprocess.run(["git", "cat-file", "blob", f":{chemin}"], capture_output=True)
    if r.returncode != 0:
        sys.exit(f"ABANDON : pas de blob indexe pour {chemin}")
    return r.stdout


dossiers = sys.argv[1:]
if not dossiers:
    sys.exit("ABANDON : aucun dossier donne")
liste = subprocess.run(["git", "ls-files", "-z", "--", *dossiers], capture_output=True).stdout.decode("utf-8")
fichiers = [f for f in liste.split("\0") if f]
if not fichiers:
    sys.exit("ABANDON : aucun fichier indexe sous ces dossiers")

etalon = fichiers[0]
disque = open(etalon, "rb").read()
b = blob(etalon)
altere = bytes([disque[0] ^ 0x01]) + disque[1:] if disque else b"x"
pos, neg = int(b == disque), int(b == altere)
print(f"calibration sur {etalon} : identique {pos} (attendu 1) · altere {neg} (attendu 0)")
if (pos, neg) != (1, 0):
    sys.exit("ABANDON : un bras de la calibration manque son verdict")

egaux = 0
for f in fichiers:
    d = open(f, "rb").read()
    ok = blob(f) == d
    egaux += ok
    if not ok:
        print(f"  ✗ {f} : disque {len(d)} o, blob {len(blob(f))} o")
print(f"fichiers indexes parcourus : {len(fichiers)} · identiques a l'octet : {egaux} (attendu {len(fichiers)})")
sys.exit(0 if egaux == len(fichiers) else 1)
