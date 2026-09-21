"""Lit les journaux de portes de D298 EN ENTIER, codes ANSI retirés (D275), et rend les comptes avec ce
qui a été parcouru (D290). Usage, depuis la racine : python3 docs/preuves/D298/portes/lire-portes.py
⚠ Calibration de l'extracteur : les résumés vitest portent des codes ANSI — un motif appliqué au brut
ne voit RIEN. Le compte « Test Files » de chaque journal est donc confronté au nombre de projets."""
import os
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
D = "docs/preuves/D298/portes"
ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
for nom in sorted(os.listdir(D)):
    if not (nom.startswith("porte-") and nom.endswith(".log")):
        continue
    brut = open(os.path.join(D, nom), "rb").read().decode("utf-8", errors="replace")
    t = ANSI.sub("", brut)
    lignes = t.splitlines()
    print(f"== {nom} : {len(lignes)} lignes parcourues, {len(brut)} caractères bruts")
    projets = re.findall(r"^(\S+) (?:\S+ )?\S+: Done", t, flags=re.M)
    if projets:
        print(f"   « Done » : {len(projets)} — {', '.join(projets)}")
    for l in lignes:
        if re.search(r"^\s*(Test Files|Tests)\s", l):
            print("   " + l.strip())
    print(f"   « timed out » : {len(re.findall(r'timed out', t))} · « FAIL » en tête de ligne : "
          f"{len(re.findall(r'^\s*(?:\S+\s+)?FAIL\s', t, flags=re.M))} · « error » (lint/tsc) : "
          f"{len(re.findall(r'\berror\b', t))}")
