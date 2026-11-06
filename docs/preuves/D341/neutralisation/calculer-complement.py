"""D341 — calcule le COMPLÉMENT de l'union : les campagnes que le tri de `lancer-campagnes.py` ne voit pas (son angle mort), sans retaper de liste de mémoire.

POURQUOI : `lancer-campagnes.py` ne reconnaît que les chaînes qui sont des chemins depuis la RACINE du dépôt. Or un harnais lance vitest DEPUIS `apps/api`, et y écrit donc un fichier de test en chemin RELATIF
(`test/int/migration-non-empty.int-spec.ts`). Un lot qui modifie ce fichier — et il se retarge à chaque migration — ne retient aucune de ces campagnes. Ici le même diff `<départ>..HEAD` est croisé avec les
chemins RELATIFS à `apps/api` que les sources des harnais contiennent ; l'union déjà versée (`union-sortie.txt`) est retranchée.

Imprime ce qu'il a parcouru (D290) : fichiers du diff sous `apps/api/`, campagnes lues, et pour chaque campagne retenue le chemin relatif qui l'a retenue. Dernière ligne : `UNION: a.py,b.py,…`.
Calibration, deux bras : (positif) `test/int/migration-non-empty.int-spec.ts` doit retenir au moins `neutralize-r43.py` ; (négatif) un chemin relatif fabriqué ne doit en retenir AUCUNE.
Usage, depuis la RACINE : python3 calculer-complement.py <départ> [<sortie>]. Archivé comme PREUVE (D291), jamais promu en instrument.
"""
import glob
import os
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

depart = sys.argv[1]
UNION = "docs/preuves/D341/neutralisation/union-sortie.txt"
PREFIXE = "apps/api/"

diff = [l for l in subprocess.run(["git", "diff", "--name-only", depart, "HEAD"], capture_output=True, text=True, encoding="utf-8").stdout.splitlines() if l.startswith(PREFIXE)]
relatifs = sorted({f[len(PREFIXE):] for f in diff if f.startswith(PREFIXE + "test/") or f.startswith(PREFIXE + "src/")})
campagnes = sorted(glob.glob("neutralisation/neutralize-*.py"))
sources = {c: open(c, encoding="utf-8", newline="").read() for c in campagnes}
deja = []
for l in open(UNION, encoding="utf-8").read().splitlines():
    if l.startswith("UNION: "):
        deja = [n for n in l[len("UNION: "):].split(",") if n]


def retenues_par(chemin: str) -> list:
    return [os.path.basename(c) for c in campagnes if chemin in sources[c]]


# calibration, deux bras
positif = retenues_par("test/int/migration-non-empty.int-spec.ts")
negatif = retenues_par("test/int/zzz-fichier-fabrique-xyz.int-spec.ts")
if "neutralize-r43.py" not in positif or negatif:
    sys.exit(f"CALIBRATION RATÉE : positif={positif} (doit contenir neutralize-r43.py), négatif={negatif} (doit être vide). ABANDON.")

par_campagne = {}
for r in relatifs:
    for n in retenues_par(r):
        par_campagne.setdefault(n, []).append(r)
complement = sorted(n for n in par_campagne if n not in deja)
print(f"départ {depart} · fichiers du diff sous apps/api/ (test/ et src/) : {len(relatifs)} · campagnes lues : {len(campagnes)} · déjà dans l'union versée : {len(deja)} · retenues par chemin RELATIF : {len(par_campagne)} · COMPLÉMENT : {len(complement)}")
print(f"calibration : le chemin relatif connu retient {len(positif)} campagne(s) dont neutralize-r43.py ; le chemin fabriqué en retient {len(negatif)} — les deux bras tiennent.")
for n in sorted(par_campagne):
    print(f"  {n:30} {'(union)' if n in deja else '(COMPLÉMENT)':14} ← {', '.join(par_campagne[n])[:200]}")
ligne = "UNION: " + ",".join(complement)
print(ligne)
if len(sys.argv) > 2:
    open(sys.argv[2], "w", encoding="utf-8", newline="\n").write(
        "\n".join(f"  {n:30} ← {', '.join(par_campagne[n])[:300]}" for n in complement) + "\n" + ligne + "\n")
