#!/usr/bin/env python3
"""D351 — R-4 : la neutralisation de MESURE du `no-store` de `getVenueMap` (jamais un changement : le fichier est restauré À L'OCTET, prouvé par l'empreinte et par `git status`).
Forme de la preuve de pose (D286) : ancre 1 -> 0 ET marqueur 0 -> 1. Le fichier est en CRLF : on ne touche qu'une sous-chaîne d'une ligne, les fins de ligne ne bougent pas.
Joue la suite complète de `apps/client` (vitest) sur le fichier muté, imprime les lignes de bilan, puis restaure. Usage : python3 mutation-no-store.py <fichier de sortie>"""
import hashlib
import subprocess
import sys

CHEMIN = "apps/client/src/lib/api.ts"
# ⚠ `{ cache: "no-store", signal }` apparaît AUSSI dans `countVenues` (ligne 131) : l'ancre porte la fin de l'adresse de la route de carte, pour n'en viser qu'une.
ANCRE = b'`?${suffixe}`}`, { cache: "no-store", signal }'
REMPLACE = b'`?${suffixe}`}`, { cache: "force-cache", signal }'
sortie = sys.argv[1]
original = open(CHEMIN, "rb").read()
h0 = hashlib.sha256(original).hexdigest()
assert original.count(ANCRE) == 1, f"ancre : {original.count(ANCRE)} occurrence(s) (1 exigée)"
assert original.count(b"force-cache") == 0, "le marqueur existe déjà"
muté = original.replace(ANCRE, REMPLACE)
assert muté.count(ANCRE) == 0 and muté.count(b"force-cache") == 1 and muté.count(b"\r\n") == original.count(b"\r\n"), "preuve de pose manquée"
lignes = []
try:
    open(CHEMIN, "wb").write(muté)
    lignes.append(f"mutation posée : ancre 1 -> 0, marqueur `force-cache` 0 -> 1 ; octets {len(original)} -> {len(muté)} ; sha256 avant {h0}")
    r = subprocess.run("pnpm --filter @zwadj/client exec vitest run", shell=True, capture_output=True, encoding="utf-8", errors="replace")
    texte = r.stdout + r.stderr
    import re
    propre = re.sub(r"\x1b\[[0-9;]*m", "", texte).replace("\r", "")
    lignes.append(f"code de sortie de la suite du client sous la mutation : {r.returncode}")
    for l in propre.split("\n"):
        if re.match(r"\s*(Test Files|Tests)\s", l) or "FAIL" in l or "AssertionError" in l:
            lignes.append("  " + l.strip()[:200])
finally:
    open(CHEMIN, "wb").write(original)
h1 = hashlib.sha256(open(CHEMIN, "rb").read()).hexdigest()
st = subprocess.run(["git", "status", "--short"], capture_output=True, encoding="utf-8").stdout.strip()
lignes.append(f"restauration : sha256 après {h1} · identique : {h0 == h1} · git status --short : [{st}] (attendu [])")
open(sortie, "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
print("\n".join(lignes))
sys.exit(0 if h0 == h1 and not st else 1)
