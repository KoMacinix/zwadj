"""D311 — COPIE de `docs/preuves/D310/controles/controle-forme-chargily.py` (pièce de D310, non retouchée),
restreinte à ce que CE lot touche : les trois `.md` d'autorité écrits (`AGENTS.md`, `ZWADJ_CONTINUITE.md`,
`ZWADJ_BACKLOG.md`) et tout `docs/preuves/D311/`. Contrôle de FORME Chargily, À PART de l'audit (qui en est
aveugle : décision 5 du relecteur, D304). Depuis la racine :

    python3 docs/preuves/D311/controles/controle-forme-chargily.py

Formes et calibration reprises telles quelles (pièces de D305 à D310). ⛔ Aucune vraie clé : la calibration
assemble À L'EXÉCUTION une valeur synthétique (bras positif) et une valeur trop courte (bras négatif). N'imprime que
des COMPTES et des chemins, jamais une valeur.
"""
import os
import re
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

cibles = ["AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
for racine, _, noms in os.walk("docs/preuves/D311"):
    cibles += [os.path.join(racine, n) for n in noms if "__pycache__" not in racine]
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
