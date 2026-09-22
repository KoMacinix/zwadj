"""Passe D277 de D299 à la marque — SENS 2, ce que la marque REND PERMIS (D287) : liste, avec leur ligne, les
occurrences `peut-s-ouvrir` et `compteur-zero` situées HORS des sections datées (l'ordre des rangs RAMENÉ dans
le champ, comme dans `verifier-marque.py`), pour un tri À LA MAIN : chacune doit être générique, conditionnée
à l'arbitrage de Ko, barrée, ou consommée — AUCUNE ne doit désigner un lot précis comme ouvrable.
Usage, depuis la racine : python3 docs/preuves/D299/passe-d277/sens2-marque.py <sortie de situer.py>"""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
ORDRE = "### D270 — ordre des lots, révisé par Ko"
L = open("ZWADJ_CONTINUITE.md", encoding="utf-8").read().split("\n")
d = [i + 1 for i, x in enumerate(L) if x.rstrip("\r") == ORDRE]
if len(d) != 1:
    print(f"ABANDON : titre de l'ordre des rangs trouvé {len(d)} fois (attendu 1)")
    sys.exit(2)
f = next(i + 1 for i in range(d[0], len(L)) if L[i].startswith("#"))
sources = {"ZWADJ_CONTINUITE.md": L}
n = vues = 0
for ligne in open(sys.argv[1], encoding="utf-8"):
    m = re.match(r"^(\S+):(\d+) \[(peut-s-ouvrir|compteur-zero)\] (## .*)$", ligne.rstrip("\n"))
    if not m:
        continue
    vues += 1
    fi, k, t = m.group(1), int(m.group(2)), m.group(4)
    if t.startswith(("## Session", "## Incident", "## Registre")) and not (fi == "ZWADJ_CONTINUITE.md" and d[0] <= k < f):
        continue
    if fi not in sources:
        sources[fi] = open(fi, encoding="utf-8").read().split("\n")
    n += 1
    print(f"{fi}:{k} [{m.group(3)}] {sources[fi][k - 1].strip()[:170]}")
print(f"== sens 2 : {vues} occurrence(s) des deux motifs vues · {n} hors sections datées, listées pour tri")
