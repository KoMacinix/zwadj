#!/usr/bin/env python3
"""Extrait, des journaux de `neutralize-adm2.py` (campagne ENTIÈRE, `--int --e2e`), pour chaque journal : l'empreinte du harnais (première ligne), la ligne « Tests » (ou les lignes `ok`/`x` de Playwright), et, pour chaque test EN ÉCHEC, la PREMIÈRE ligne de son bloc d'erreur.
Imprime le nombre de journaux parcourus et la répartition des premières lignes par TYPE (AssertionError, TestingLibraryElementError, autre) : **le nombre de TestingLibraryElementError doit se lire à côté de celui des AssertionError** (D290) — dans les 29 journaux visés par R-2 il ne doit pas être la première ligne du test visé.
Ne recopie AUCUNE ligne brute d'un journal e2e au-delà de la première ligne d'erreur. Usage : python3 extraire-echecs.py <dossier de journaux> <sortie>"""
import glob
import io
import os
import re
import sys
from collections import Counter

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
dossier, sortie = sys.argv[1], sys.argv[2]
ANSI = re.compile(r"\x1b\[[0-9;]*m")
journaux = sorted(p for p in glob.glob(os.path.join(dossier, "*.log")) if not os.path.basename(p).startswith("prevol-"))
sorties = [f"# D352 — extraits des journaux de la campagne ENTIÈRE de `neutralisation/neutralize-adm2.py --int --e2e` : par journal, les tests EN ÉCHEC et la première ligne de leur bloc d'erreur, et la ligne « Tests ».",
           f"# journaux parcourus : {len(journaux)} (hors pré-vol) ; CETTE pièce ne recopie aucune ligne brute d'un journal e2e au-delà de la première ligne d'erreur ; les journaux bruts restent hors dépôt (sauf les 29 gardes visées par R-2, versées MASQUÉES)."]
types = Counter()
entetes = Counter()
for p in journaux:
    texte = ANSI.sub("", io.open(p, encoding="utf-8", errors="replace").read())
    lignes = texte.splitlines()
    entetes[lignes[0].split(" (")[0] if lignes else "—"] += 1
    sorties.append(f"=== {os.path.basename(p)}")
    tests = next((l.strip() for l in lignes if re.match(r"^\s*Tests\s", l)), None)
    if tests:
        sorties.append(f"  {tests}")
    pw = [l.strip()[:150] for l in lignes if re.match(r"^\s+(x|ok)\s+\d+ \[chromium\]", l)]
    for l in pw[:12]:
        sorties.append(f"  {l}")
    i = 0
    while i < len(lignes):
        if lignes[i].strip().startswith("FAIL ") and ">" in lignes[i]:
            titres = []
            while i < len(lignes) and (lignes[i].strip().startswith("FAIL ") or not lignes[i].strip()):
                if lignes[i].strip():
                    titres.append(lignes[i].strip())
                i += 1
            message = lignes[i].strip() if i < len(lignes) else "—"
            kind = "AssertionError" if message.startswith("AssertionError") else "TestingLibraryElementError" if message.startswith("TestingLibraryElementError") else "autre"
            for t in titres:
                types[kind] += 1
                sorties.append(f"  FAIL  {t[-170:]}\n     ↳ {message[:150]}")
        else:
            i += 1
sorties.append("")
sorties.append(f"répartition des premières lignes d'erreur (tests en échec, tous journaux) : {dict(types)} · total {sum(types.values())}")
sorties.append(f"première ligne de CHAQUE journal (R-9) : {dict(entetes)}")
io.open(sortie, "w", encoding="utf-8", newline="\n").write("\n".join(sorties) + "\n")
print(f"{len(journaux)} journaux · {dict(types)} · entêtes {dict(entetes)}")
