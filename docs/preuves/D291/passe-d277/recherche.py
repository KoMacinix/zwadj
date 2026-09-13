"""Passe D277 — les DEUX sens — sur le texte APLATI des fichiers d'autorite (D291).

Usage, depuis la racine du depot :
    python docs/preuves/D291/passe-d277/recherche.py <motifs.txt> <sortie.txt>

POURQUOI CE FICHIER EXISTE. La passe D277 de D290 a vecu dans un scratchpad, sous la forme
de deux ANCRES ecrites en dur : la recherche qui les avait trouvees n'etait ecrite nulle
part, et elle a manque une troisieme occurrence (ordre des rangs, « Le compteur est a
zero »). Une passe dont la requete n'existe pas ne se rejoue pas et ne se conteste pas.
Ici la requete EST le fichier de motifs, lu par ce script : rien ne traverse un
interpreteur (D289, D290).

CE N'EST PAS UN INSTRUMENT DE CAMPAGNE : archive comme preuve de D291, jamais promu.

TEXTE APLATI (D289) : ces fichiers sont enveloppes a ~95 colonnes, toute expression de
plus de quelques mots y est coupee au moins une fois ; une recherche ligne a ligne est
aveugle a ce qui enjambe un retour a la ligne.

CALIBRATION A DEUX BRAS, rejouee a chaque execution, ABANDON si un bras manque (D286) :
  - positif : une expression connue pour enjamber un retour a la ligne dans
    ZWADJ_CONTINUITE.md (AGENTS.md, D289) doit rendre PLUS d'occurrences aplaties que
    d'occurrences ligne a ligne ;
  - negatif : un motif construit a l'execution, absent des fichiers, doit rendre 0.
L'indice « BARRE » compte les ~~ du paragraphe avant l'occurrence : c'est un INDICE, pas
un verdict — le tri reste humain et se relit.

⚠ MARQUEURS MARKDOWN RETIRES AVANT RECHERCHE (correctif du 12/09/2026, trouve AU TRI de la
premiere sortie) : `*` et l'accent grave coupent une phrase en morceaux — « un lot de code
**peut** s'ouvrir » ne sortait pas sur le motif « peut s'ouvrir ». Retires du texte ET des
motifs ; les ~~ sont gardes, ils portent l'indice de barrage.
"""
import bisect
import os
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("ERREUR : a lancer depuis la racine du depot")

FICHIERS = ["AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "CLAUDE.md"]
motifs_chemin, sortie_chemin = sys.argv[1], sys.argv[2]


def nettoyer(texte):
    return texte.replace("*", "").replace(chr(96), "")


def aplatir(chemin):
    """Rend (texte aplati, debuts de ligne, debuts de paragraphe, nb de lignes)."""
    lignes = open(chemin, "rb").read().decode("utf-8").split("\n")
    morceaux, debuts, paragraphes, pos = [], [], [0], 0
    for ligne in lignes:
        propre = " ".join(nettoyer(ligne.replace("\r", "")).split())
        debuts.append(pos)
        if not propre:
            paragraphes.append(pos)
        morceaux.append(propre + " ")
        pos += len(propre) + 1
    return "".join(morceaux), debuts, paragraphes, len(lignes)


def compter_lignes(chemin, motif):
    m = motif.lower()
    return sum(1 for l in open(chemin, "rb").read().decode("utf-8").split("\n") if m in l.lower())


def occurrences(plat, motif):
    bas, m, i, res = plat.lower(), motif.lower(), 0, []
    while True:
        j = bas.find(m, i)
        if j < 0:
            return res
        res.append(j)
        i = j + 1


textes = {f: aplatir(f) for f in FICHIERS}
out = []

# --- calibration, deux bras ---
positif = "plutôt que tu"
plat_cont = textes["ZWADJ_CONTINUITE.md"][0]
n_plat, n_ligne = len(occurrences(plat_cont, positif)), compter_lignes("ZWADJ_CONTINUITE.md", positif)
negatif = "ZXQ" + "-D291-" + "ABSENT"
n_neg = sum(len(occurrences(t[0], negatif)) for t in textes.values())
out.append("== CALIBRATION ==")
out.append(f"  positif (enjambe un retour a la ligne) : aplati {n_plat} > ligne a ligne {n_ligne}   (attendu : aplati > ligne)")
out.append(f"  negatif (motif absent)                : {n_neg}   (attendu 0)")
if not (n_plat > n_ligne and n_neg == 0):
    print("\n".join(out))
    sys.exit("ABANDON : un bras de la calibration manque son verdict")

out.append("== PARCOURU ==")
for f, (plat, debuts, _, nl) in textes.items():
    out.append(f"  {f:22s} {nl:>5} lignes · {len(plat):>7} caracteres aplatis")

motifs = []
for brut in open(motifs_chemin, "rb").read().decode("utf-8").split("\n"):
    brut = brut.replace("\r", "").strip()
    if brut and not brut.startswith("#"):
        sens, _, motif = brut.partition("|")
        motifs.append((sens, " ".join(nettoyer(motif).split())))
out.append(f"  motifs lus : {len(motifs)}")

total = 0
for sens, motif in motifs:
    lignes_sortie = []
    for f, (plat, debuts, paragraphes, _) in textes.items():
        for j in occurrences(plat, motif):
            ligne = bisect.bisect_right(debuts, j)
            par = paragraphes[bisect.bisect_right(paragraphes, j) - 1]
            barre = "BARRE?" if plat[par:j].count("~~") % 2 else "      "
            ctx = plat[max(0, j - 90): j + len(motif) + 90]
            lignes_sortie.append(f"    {barre} {f}:{ligne}  …{ctx}…")
    total += len(lignes_sortie)
    out.append(f"== [{sens}] « {motif} » : {len(lignes_sortie)} occurrence(s)  (attendu : a trier)")
    out.extend(lignes_sortie)
out.append(f"== TOTAL : {total} occurrence(s) sur {len(motifs)} motifs")

open(sortie_chemin, "wb").write(("\n".join(out) + "\n").encode("utf-8"))
print(f"calibration OK · {len(motifs)} motifs · {total} occurrences · sortie : {sortie_chemin}")
