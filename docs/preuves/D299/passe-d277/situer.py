"""Passe D277 de D299 à la marque : RATTACHE chaque occurrence (texte aplati, D294) à sa LIGNE réelle et au
titre `## ` qui l'englobe, pour séparer les sections de session DATÉES (histoire) des blocs COURANTS (points
d'entrée, ordre des rangs, critère, entrées ouvertes du backlog). Classement par titre, jamais par mot.
Usage, depuis la racine : python3 docs/preuves/D299/passe-d277/situer.py <fichier-de-motifs> [<nom de motif>…]
Imprime, par fichier et par titre `## `, le nombre d'occurrences, puis le total parcouru (D290)."""
import bisect
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
FICHIERS = ["AGENTS.md", "CLAUDE.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
motifs = []
for ligne in open(sys.argv[1], encoding="utf-8"):
    ligne = ligne.rstrip("\n")
    if ligne and not ligne.startswith("#"):
        nom, rx = ligne.split("\t", 1)
        if len(sys.argv) < 3 or nom in sys.argv[2:]:
            motifs.append((nom, rx))
total = 0
for f in FICHIERS:
    brut = open(f, encoding="utf-8").read()
    # aplatissement qui garde, pour chaque caractère aplati, sa position dans le brut
    plat, orig = [], []
    blanc = False
    for i, c in enumerate(brut):
        if c.isspace():
            if not blanc:
                plat.append(" ")
                orig.append(i)
            blanc = True
        else:
            plat.append(c)
            orig.append(i)
            blanc = False
    plat = "".join(plat)
    debuts = [0] + [m.end() for m in re.finditer("\n", brut)]
    titres = [(m.start(), m.group(1)[:110]) for m in re.finditer(r"(?m)^## (.*)$", brut)]
    pos_titres = [p for p, _ in titres]
    for nom, rx in motifs:
        for m in re.finditer(rx, plat):
            p = orig[m.start()]
            ligne_no = bisect.bisect_right(debuts, p)
            k = bisect.bisect_right(pos_titres, p) - 1
            titre = titres[k][1] if k >= 0 else "(avant tout titre ##)"
            print(f"{f}:{ligne_no} [{nom}] ## {titre}")
            total += 1
print(f"== {total} occurrence(s) situées · {len(motifs)} motif(s) · {len(FICHIERS)} fichiers")
