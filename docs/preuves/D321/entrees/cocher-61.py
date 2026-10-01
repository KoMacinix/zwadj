"""D321 — coche au backlog les entrées que `confronter-62.py` déclare TENIR, avec renvoi ; annote celle qui ne tient pas.

USAGE, depuis la racine, UNE fois (il refuse une ligne déjà cochée) :
  python3 docs/preuves/D321/entrees/cocher-61.py
Il lit la liste « LIGNES À COCHER » dans `confronter-62-sortie.txt` (la sortie versée — jamais une liste recopiée), vérifie
pour chaque ligne qu'elle est OUVERTE et que son texte est celui de l'entrée à `ffd32e9`, écrit en conservant les CRLF,
puis RELIT le fichier (D289 : on relit ce qu'on a écrit, jamais le compte rendu de l'outil).
"""
import io
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
SORTIE = "docs/preuves/D321/entrees/confronter-62-sortie.txt"
BL = "ZWADJ_BACKLOG.md"
RENVOI = (" ✅ *(D321, 01/10/2026 : **réalisé** — re-confronté au code à `b5bd382` ; entrée « RÉALISÉ » de D315 (B:{b} à "
          "`ffd32e9`) ; `docs/preuves/D321/entrees/confronter-62-sortie.txt`.)*")
NON = (" ⚠ *(D321, 01/10/2026 : **NE TIENT PAS — reste ouverte.** D315 l'avait classée RÉALISÉ « sans ± » ; re-confrontée à "
       "`b5bd382` : le panneau porte un champ numérique libre, ni « ± » ni bornes min/max — c'est ce que l'entrée demande. "
       "`docs/preuves/D321/entrees/confronter-62-sortie.txt`.)*")

sortie = io.open(SORTIE, encoding="utf-8").read()
paires = [tuple(map(int, x.split(":"))) for x in re.search(r"LIGNES À COCHER \(HEAD, b5bd382\) : (.+)", sortie).group(1).split()]
non = [int(x) for x in re.search(r"NE TIENT PAS \d+ \[([\d, ]*)\]", sortie).group(1).replace(" ", "").split(",") if x]
bl315 = subprocess.run(["git", "show", "ffd32e9:ZWADJ_BACKLOG.md"], capture_output=True, check=True).stdout.decode("utf-8").split("\n")
print(f"lues dans la sortie : {len(paires)} à cocher (attendu 61) · {len(non)} à annoter (attendu 1)")

brut = io.open(BL, encoding="utf-8", newline="").read()
assert "\r\n" in brut and brut.count("\n") == brut.count("\r\n"), "le backlog n'est pas en CRLF pur"
lignes = brut.split("\r\n")
avant = list(lignes)


def corps(l):
    return l[6:].strip()


for b, n in paires:
    l = lignes[n - 1]
    assert l.startswith("- [ ] "), f"B:{b} ligne {n} : pas une case ouverte : {l[:60]!r}"
    assert corps(l).startswith(corps(bl315[b - 1])[:120]), f"B:{b} ligne {n} : texte différent de ffd32e9"
    lignes[n - 1] = "- [x] " + l[6:].rstrip() + RENVOI.format(b=b)

# l'entrée qui ne tient pas : retrouvée par son texte à ffd32e9
for b in non:
    cible = [i for i, l in enumerate(lignes) if l.startswith("- [ ] ") and corps(l).startswith(corps(bl315[b - 1])[:120])]
    assert len(cible) == 1, f"B:{b} : {len(cible)} lignes"
    lignes[cible[0]] = lignes[cible[0]].rstrip() + NON

changees = [i for i, (a, c) in enumerate(zip(avant, lignes)) if a != c]
assert len(lignes) == len(avant), "nombre de lignes changé"
print(f"lignes modifiées : {len(changees)} (attendu {len(paires) + len(non)})")
assert len(changees) == len(paires) + len(non)
io.open(BL, "w", encoding="utf-8", newline="").write("\r\n".join(lignes))

# RELECTURE du fichier écrit
relu = io.open(BL, encoding="utf-8", newline="").read()
print(f"relu : renvois « réalisé » D321 {relu.count('(D321, 01/10/2026 : **réalisé**')} (attendu {len(paires)}) · "
      f"« NE TIENT PAS » D321 {relu.count('(D321, 01/10/2026 : **NE TIENT PAS')} (attendu {len(non)}) · "
      f"LF nus {relu.count(chr(10)) - relu.count(chr(13) + chr(10))} (attendu 0)")
