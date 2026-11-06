"""D341 — liste les fichiers de test dont l'empreinte a CHANGÉ depuis les rouges (D334 item 5 : « chaque pièce porte l'empreinte des fichiers de test joués »).
Lit `docs/preuves/D341/rouges/empreintes-fichiers-de-test.txt` (les empreintes AU MOMENT des rouges, octets tels qu'écrits sur le disque) et recalcule celle de chaque fichier sur le disque.
Sortie : un tableau markdown (fichier · sha256 avant · sha256 après · octets avant/après · état), ET le nombre de fichiers examinés (D290 : un compteur dit sur quoi il a compté).
Calibration, deux bras : (inchangé) un fichier dont l'empreinte du disque égale l'empreinte écrite doit être rendu « inchangé » ; (modifié) la même ligne avec UN octet de l'empreinte altéré doit être rendue « modifié ».
Usage, depuis la RACINE : python3 lister-corrections.py"""
import hashlib
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SOURCE = "docs/preuves/D341/rouges/empreintes-fichiers-de-test.txt"
LIGNE = re.compile(r"^([0-9a-f]{64})\s+(\d+)\s+(\S+)$")


def etat(sha_ecrit: str, sha_disque: str) -> str:
    return "inchangé" if sha_ecrit == sha_disque else "MODIFIÉ"


# ── calibration (deux bras)
exemple = hashlib.sha256(b"x").hexdigest()
assert etat(exemple, exemple) == "inchangé", "calibration : deux empreintes égales doivent rendre « inchangé »"
assert etat(exemple, exemple[:-1] + ("0" if exemple[-1] != "0" else "1")) == "MODIFIÉ", "calibration : un octet de différence doit rendre « MODIFIÉ »"

lignes = [l for l in open(SOURCE, encoding="utf-8").read().splitlines() if LIGNE.match(l)]
rendus = []
modifies = 0
for l in lignes:
    sha, octets, chemin = LIGNE.match(l).groups()
    brut = open(chemin, "rb").read()
    sha_disque = hashlib.sha256(brut).hexdigest()
    e = etat(sha, sha_disque)
    modifies += e == "MODIFIÉ"
    if e == "MODIFIÉ":
        rendus.append(f"| `{chemin}` | `{sha}` | `{sha_disque}` | {octets} → {len(brut)} |")
print("| fichier | sha256 AU MOMENT DES ROUGES | sha256 ACTUEL | octets avant → après |")
print("|---|---|---|---|")
print("\n".join(rendus))
print()
print(f"fichiers examinés (lignes d'empreinte lues) : {len(lignes)} (attendu 22) · MODIFIÉS depuis les rouges : {modifies} · inchangés : {len(lignes) - modifies}")
if len(lignes) != 22:
    sys.exit("✗ le nombre de fichiers examinés n'est pas 22 : le fichier d'empreintes a changé ou le motif ne lit plus rien")
