#!/usr/bin/env python3
"""Localise, pour chacune des 29 gardes de S-192, le test visé, la première ligne de son bloc d'échec et la ligne de test qui lève (depuis les journaux de la découverte). Lecture seule."""
import importlib.util
import io
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
spec = importlib.util.spec_from_file_location("adm2", "neutralisation/neutralize-adm2.py")
adm2 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(adm2)

IDS = "G-1 G-4 G-5 G-6 G-7 G-9 Q-1 Q-2 Q-4 Q-5 Q-6 Q-8 Q-10 Q-11 P-2 P-3 P-6 P-9 P-10 P-11 X-1 X-2 X-3 X-6 X-8 R-2 R-3 R-6 R-7".split()
DOSSIER = os.path.join(".neutralisation-journaux", "adm2")
ANSI = re.compile(r"\x1b\[[0-9;]*m")
lecture = {}
for c in adm2.CIBLES:
    ident = c["libelle"].split(".")[0]
    if ident not in IDS:
        continue
    for mesure, titre in c["mesures"].items():
        chemin = os.path.join(DOSSIER, f"{ident}-{mesure}.log")
        if not os.path.isfile(chemin):
            print(f"{ident} [{mesure}] JOURNAL ABSENT")
            continue
        texte = ANSI.sub("", io.open(chemin, encoding="utf-8", errors="replace").read())
        lignes = texte.splitlines()
        trouve = False
        for i, l in enumerate(lignes):
            if l.strip().startswith("FAIL ") and titre in l:
                j = i + 1
                while j < len(lignes) and (not lignes[j].strip() or lignes[j].strip().startswith("FAIL ")):
                    j += 1
                message = lignes[j].strip()[:110]
                cadre = next((x.strip() for x in lignes[j:j + 120] if re.search(r"❯ src/\S+\.test\.tsx?:\d+:\d+", x)), "—")
                print(f"{ident:5s} [{mesure}] {message}\n        ↳ {cadre}")
                trouve = True
                break
        if not trouve:
            print(f"{ident:5s} [{mesure}] AUCUN bloc FAIL pour le titre visé")
print("cibles examinées :", len(IDS))
