"""Passe D277, les deux sens, sur le texte APLATI des fichiers d'autorite (D289), gras et accents graves
retires du texte ET du motif (backlog, reports de D291). Motifs lus dans un FICHIER, jamais tapes en ligne.

Usage, depuis la racine : python docs/preuves/D293/outils/passe-d277.py MOTIFS.txt
Rend, par motif, chaque occurrence avec 160 caracteres de contexte et un indice « ~~ » (nombre de ~~ dans
les 400 caracteres qui precedent : IMPAIR = probablement dans un passage barre — un INDICE, le tri se fait
sur le contexte, D292 a montre que la parite ment). Rend le nombre de fichiers, de caracteres et
d'occurrences parcourus.
CALIBRATION A DEUX BRAS, ABANDON si un bras manque : une expression coupee par un retour a la ligne ET du
gras doit etre trouvee une fois ; un motif absent doit rendre 0.
"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

FICHIERS = ["AGENTS.md", "CLAUDE.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]


def aplatir(t):
    t = t.replace("*", "").replace("`", "")
    return re.sub(r"\s+", " ", t)


pos = aplatir("un lot de code **peut**\r\n  s'ouvrir")
if aplatir("peut s'ouvrir") not in pos or pos.count(aplatir("peut s'ouvrir")) != 1:
    sys.exit("ABANDON : bras positif de la calibration manque")
if pos.count("motif-absent-de-calibration") != 0:
    sys.exit("ABANDON : bras negatif de la calibration manque")
print("calibration : positif 1 (attendu 1) · negatif 0 (attendu 0)")

motifs = [aplatir(l.strip()) for l in open(sys.argv[1], encoding="utf-8") if l.strip() and not l.startswith("#")]
textes = {f: aplatir(open(f, "rb").read().decode("utf-8")) for f in FICHIERS}
print(f"fichiers : {len(textes)} · caracteres parcourus : {sum(len(t) for t in textes.values())} · motifs : {len(motifs)}")
total = 0
for m in motifs:
    vus = 0
    for f, t in textes.items():
        for x in re.finditer(re.escape(m), t, flags=re.IGNORECASE):
            vus += 1
            barres = t[max(0, x.start() - 400):x.start()].count("~~")
            print(f"  [{m}] {f} @{x.start()} ~~{barres}{' (impair)' if barres % 2 else ''} : "
                  f"…{t[max(0, x.start() - 80):x.end() + 80]}…")
    print(f"== motif {m!r} : {vus} occurrence(s)")
    total += vus
print(f"occurrences vues : {total}")
