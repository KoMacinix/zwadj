"""D316 — COPIE de `docs/preuves/D315/controles/controle-forme-chargily.py` (pièce de D315, non retouchée), dont seules
les CIBLES changent : tout ce que CE lot fait partir — les fichiers modifiés depuis `HEAD` et les fichiers neufs non
ignorés (`git diff --name-only HEAD` ∪ `git ls-files --others --exclude-standard`), code compris. Contrôle de FORME
Chargily, À PART de l'audit (qui en est aveugle : décision 5 du relecteur, D304). Depuis la racine :
    python3 docs/preuves/D316/controles/controle-forme-chargily.py
Formes et calibration reprises telles quelles (pièces de D305 à D315). ⛔ Aucune vraie clé : la calibration
assemble À L'EXÉCUTION une valeur synthétique (bras positif) et une valeur trop courte (bras négatif). N'imprime que
des COMPTES et des chemins, jamais une valeur.
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
PREFIXES = "(?:" + "te" + "st|li" + "ve)_(?:p" + "k|s" + "k)_"
STRICT = re.compile("te" + "st_(?:p" + "k|s" + "k)_[A-Za-z0-9]{40}(?![A-Za-z0-9])")
LARGE = re.compile(PREFIXES + "[A-Za-z0-9]{20,}")

synth = "te" + "st_" + "s" + "k_" + ("Ab3" * 14)[:40]
court = "te" + "st_" + "p" + "k_" + "Ab3"
pos = bool(STRICT.search(synth)) and bool(LARGE.search(synth))
neg = not STRICT.search(court) and not LARGE.search(court)
print(f"calibration : positif (synthétique, 40 car.) {'OK' if pos else 'MANQUÉ'} · négatif (trop court) {'OK' if neg else 'MANQUÉ'}")
if not (pos and neg):
    sys.exit("ABANDON")


def git(*args: str) -> list[str]:
    r = subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8")
    return [l.strip() for l in r.stdout.splitlines() if l.strip()]


cibles = sorted(set(git("diff", "--name-only", "HEAD")) | set(git("ls-files", "--others", "--exclude-standard")))
cibles = [c for c in cibles if os.path.isfile(c)]
octets, porteurs = 0, []
for c in cibles:
    t = open(c, "rb").read()
    octets += len(t)
    s = t.decode("utf-8", errors="replace")
    n1, n2 = len(STRICT.findall(s)), len(LARGE.findall(s))
    if n1 or n2:
        porteurs.append((c, n1, n2))
print(f"parcourus : {len(cibles)} fichiers, {octets} octets · porteurs : {len(porteurs)} (attendu 0)")
for c, n1, n2 in porteurs:
    print(f"  {c} : forme stricte {n1}, forme large {n2}")
