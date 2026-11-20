#!/usr/bin/env python3
"""Lit les sorties BRUTES de la découverte (`R56_DECOUVERTE=1`, classes unit et int) et écrit `titres.json` : pour chaque « identifiant|mesure » qui MORD (au moins un test en échec dont la PREMIÈRE ligne de bloc est
une `AssertionError`), le début du titre de ce test (après « FAIL  <fichier> > », 110 caractères). Une mesure qui ne mord pas n'est pas écrite : le moteur la retire de la cible, et une cible sans aucune mesure
fait refuser le verdict (« la retirer par écrit »). Archivé comme PIÈCE (D291), jamais promu en instrument. Usage : python3 remplir_titres.py titres.json sortie1 [sortie2 ...]"""
import json
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

sortie, fichiers = sys.argv[1], sys.argv[2:]
titres: dict[str, str] = {}
cibles: dict[str, str] = {}
pas_assertion: dict[str, list[str]] = {}
for f in fichiers:
    lignes = open(f, encoding="utf-8", errors="replace").read().split("\n")
    ident = None
    mesure = None
    i = 0
    while i < len(lignes):
        l = lignes[i]
        m = re.match(r"^■ ((?:[A-Z]+)-\d+)\. (.*)$", l)
        if m:
            ident = m.group(1)
            cibles[ident] = m.group(2)
            mesure = None
        m = re.match(r"^   \[([\w-]+)\] code (\d+) · (\w[\w-]*) — (.*)$", l)
        if m and ident:
            mesure = m.group(1)
        m = re.match(r"^      FAIL  (\S+?) > (.*)$", l)
        if m and ident and mesure:
            message = lignes[i + 1].strip() if i + 1 < len(lignes) else ""
            message = re.sub(r"^↳ ", "", message)
            cle = f"{ident}|{mesure}"
            if message.startswith("AssertionError"):
                titres.setdefault(cle, m.group(2)[:110])
            else:
                pas_assertion.setdefault(cle, []).append(message[:60])
        i += 1

json.dump(titres, open(sortie, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
par_cible: dict[str, list[str]] = {}
for k in titres:
    ident, mesure = k.split("|")
    par_cible.setdefault(ident, []).append(mesure)
sans = sorted(set(cibles) - set(par_cible), key=lambda s: (s.split("-")[0], int(s.split("-")[1])))
print(f"cibles lues : {len(cibles)} ; avec au moins une mesure qui MORD : {len(par_cible)} ; titres écrits : {len(titres)}")
print(f"SANS AUCUNE MESURE QUI MORD ({len(sans)}) :")
for s in sans:
    print("   ", s, "—", cibles[s][:110], "| échecs non-assertion :", {k.split('|')[1]: v[:1] for k, v in pas_assertion.items() if k.startswith(s + '|')})
