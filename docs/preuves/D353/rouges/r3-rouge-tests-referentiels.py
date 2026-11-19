#!/usr/bin/env python3
"""D353 — R-3 : le ROUGE UNITAIRE des tests des référentiels contre le code d'AVANT. Remet `apps/client/src/lib/api.ts` tel qu'il est à `HEAD` (le code de départ du lot, avant la correction), joue
`src/lib/api.test.ts`, lit les échecs (titre + première ligne du bloc), puis RESTAURE la correction à l'octet (empreinte et comparaison). Pièce jetable (D291), jouée depuis la RACINE.
Usage : python3 rouge-r3.py <fichier de sortie>"""
import hashlib
import re
import subprocess
import sys

CHEMIN = "apps/client/src/lib/api.ts"
TEST = "apps/client/src/lib/api.test.ts"
sortie = sys.argv[1]
corrige = open(CHEMIN, "rb").read()
h_corrige = hashlib.sha256(corrige).hexdigest()
h_test = hashlib.sha256(open(TEST, "rb").read()).hexdigest()
avant = subprocess.run(["git", "show", f"HEAD:{CHEMIN}"], capture_output=True).stdout.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")
assert avant and avant != corrige and b"lireReferentiel" not in avant and b"lireReferentiel" in corrige, "états inattendus"
lignes = [f"fichier de test joué : {TEST} · sha256 {h_test}", f"api.ts de HEAD (code d'AVANT la correction) · sha256 {hashlib.sha256(avant).hexdigest()} · octets {len(avant)} ; api.ts corrigé (arbre de travail) · sha256 {h_corrige} · octets {len(corrige)}"]
try:
    open(CHEMIN, "wb").write(avant)
    r = subprocess.run("pnpm --filter @zwadj/client exec vitest run src/lib/api.test.ts", shell=True, capture_output=True, encoding="utf-8", errors="replace")
    propre = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr).replace("\r", "")
    lignes.append(f"code de sortie contre le code d'AVANT : {r.returncode}")
    sortie_lue = propre.split("\n")
    echecs = []
    i = 0
    while i < len(sortie_lue):
        l = sortie_lue[i].strip()
        if l.startswith("FAIL ") and ">" in l:
            titres = []
            while i < len(sortie_lue) and (sortie_lue[i].strip().startswith("FAIL ") or not sortie_lue[i].strip()):
                if sortie_lue[i].strip():
                    titres.append(sortie_lue[i].strip())
                i += 1
            message = sortie_lue[i].strip() if i < len(sortie_lue) else "—"
            echecs += [(t, message) for t in titres]
        else:
            i += 1
    for l in sortie_lue:
        if re.match(r"\s*(Test Files|Tests)\s", l):
            lignes.append("  " + l.strip())
    for titre, message in echecs:
        lignes.append(f"  ✗ {titre[:210]}")
        lignes.append(f"      ↳ première ligne du bloc : {message[:160]}")
    lignes.append(f"  échecs lus : {len(echecs)} ; dont en AssertionError : {sum(1 for _, m in echecs if m.startswith('AssertionError'))}")
finally:
    open(CHEMIN, "wb").write(corrige)
h1 = hashlib.sha256(open(CHEMIN, "rb").read()).hexdigest()
lignes.append(f"restauration de la correction : sha256 après {h1} · identique : {h1 == h_corrige}")
open(sortie, "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
print("\n".join(lignes))
sys.exit(0 if h1 == h_corrige else 1)
