#!/usr/bin/env python3
"""D353 — R-4 : le ROUGE du `no-store` de la carte. Rejoue la mutation de D351 (`docs/preuves/D351/r4/mutation-no-store.py`, MÊME ancre, MÊME remplacement) mais SOUS LE TEST NEUF de
`apps/client/src/lib/api.test.ts` : la suite ENTIÈRE du client doit maintenant rougir (elle restait verte à D351). Restauration prouvée à l'octet (empreinte et `git status`).
Pièce jetable (D291) : jouée depuis la RACINE, sortie écrite par le script lui-même. Usage : python3 rouge-r4.py <fichier de sortie>"""
import hashlib
import re
import subprocess
import sys

CHEMIN = "apps/client/src/lib/api.ts"
TEST = "apps/client/src/lib/api.test.ts"
ANCRE = b'`?${suffixe}`}`, { cache: "no-store", signal }'
REMPLACE = b'`?${suffixe}`}`, { cache: "force-cache", signal }'
sortie = sys.argv[1]
original = open(CHEMIN, "rb").read()
h0 = hashlib.sha256(original).hexdigest()
h_test = hashlib.sha256(open(TEST, "rb").read()).hexdigest()
assert original.count(ANCRE) == 1, f"ancre : {original.count(ANCRE)} occurrence(s) (1 exigée)"
assert original.count(b"force-cache") == 0, "le marqueur existe déjà"
mute = original.replace(ANCRE, REMPLACE)
assert mute.count(ANCRE) == 0 and mute.count(b"force-cache") == 1 and mute.count(b"\r\n") == original.count(b"\r\n"), "preuve de pose manquée"
lignes = [f"fichier de test joué : {TEST} · sha256 {h_test}"]
try:
    open(CHEMIN, "wb").write(mute)
    lignes.append(f"mutation posée : ancre 1 -> 0, marqueur `force-cache` 0 -> 1 ; octets {len(original)} -> {len(mute)} ; sha256 de api.ts avant {h0}")
    r = subprocess.run("pnpm --filter @zwadj/client exec vitest run", shell=True, capture_output=True, encoding="utf-8", errors="replace")
    propre = re.sub(r"\x1b\[[0-9;]*m", "", r.stdout + r.stderr).replace("\r", "")
    lignes.append(f"code de sortie de la suite du client sous la mutation : {r.returncode}")
    sortie_lue = propre.split("\n")
    for i, l in enumerate(sortie_lue):
        if re.match(r"\s*(Test Files|Tests)\s", l) or l.strip().startswith("FAIL ") or l.strip().startswith("AssertionError") or "×" in l:
            lignes.append("  " + l.strip()[:230])
        if l.strip().startswith("FAIL ") and "SANS CACHE" in l:
            suite = next((x.strip() for x in sortie_lue[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            lignes.append(f"  ↳ PREMIÈRE ligne du bloc d'échec : {suite[:200]}")
finally:
    open(CHEMIN, "wb").write(original)
h1 = hashlib.sha256(open(CHEMIN, "rb").read()).hexdigest()
st = subprocess.run(["git", "status", "--short", "--", CHEMIN], capture_output=True, encoding="utf-8").stdout.strip()
lignes.append(f"restauration : sha256 après {h1} · identique : {h0 == h1} · git status --short -- {CHEMIN} : [{st}] (attendu [])")
open(sortie, "w", encoding="utf-8", newline="\n").write("\n".join(lignes) + "\n")
print("\n".join(lignes))
sys.exit(0 if h0 == h1 and not st else 1)
