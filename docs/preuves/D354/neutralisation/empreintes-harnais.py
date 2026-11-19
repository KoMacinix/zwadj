#!/usr/bin/env python3
"""Empreintes sha256 de TOUS les harnais `neutralisation/neutralize-*.py` : celle du SHA de départ (lue par `git show`, CRLF → octets de l'objet git, comparés avec le fichier de travail NORMALISÉ de la même façon) et celle du disque. Un harnais « identique » = mêmes octets une fois les fins de ligne ramenées à LF des deux côtés.
Écrit : le nombre de fichiers examinés à côté du compte (D290). Usage : python3 empreintes-harnais.py <SHA de départ> <sortie>"""
import glob
import hashlib
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
base, sortie = sys.argv[1], sys.argv[2]
fichiers = sorted(glob.glob("neutralisation/neutralize-*.py"))


def lf(octets: bytes) -> bytes:
    return octets.replace(b"\r\n", b"\n")


lignes = [f"empreintes des harnais — SHA de départ {base} contre le disque (octets normalisés en LF des deux côtés)"]
identiques, differents, neufs = 0, [], []
for f in fichiers:
    disque = hashlib.sha256(lf(open(f, "rb").read())).hexdigest()
    r = subprocess.run(["git", "show", f"{base}:{f.replace(chr(92), '/')}"], capture_output=True)
    if r.returncode != 0:
        neufs.append(f)
        lignes.append(f"  NEUF       {disque}  {f}")
        continue
    depart = hashlib.sha256(lf(r.stdout)).hexdigest()
    if depart == disque:
        identiques += 1
        lignes.append(f"  identique  {disque}  {f}")
    else:
        differents.append(f)
        lignes.append(f"  MODIFIÉ    {depart[:16]}… → {disque}  {f}")
lignes.append(f"harnais examinés : {len(fichiers)} · identiques : {identiques} · modifiés : {len(differents)} {differents} · neufs : {len(neufs)} {neufs}  (attendu : 1 modifié = neutralize-adm2.py, 1 neuf = neutralize-r54.py, tous les autres identiques)")
lignes.append(f"contrôle : identiques + modifiés + neufs = {identiques + len(differents) + len(neufs)} (attendu {len(fichiers)}, les examinés)")
open(sortie, "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
print("\n".join(lignes[-3:]))
