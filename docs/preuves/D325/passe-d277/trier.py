"""D325 — TRI de la passe D277 : où vivent, à HEAD, les occurrences des motifs ? Pièce jetable, versée.

POURQUOI : `balayage.py` imprime 275 occurrences sans dire dans QUEL ENDROIT elles vivent. Une phrase qui dit ce qui était vrai à sa date
(section de session datée, point d'entrée d'un rang clos) se LAISSE ; une phrase qu'on lit pour connaître le COURANT (ordre des rangs, décisions produit,
méthode renforcée, `AGENTS.md`, `CLAUDE.md`, entrées ouvertes du backlog, point d'entrée du rang courant) s'ANNOTE. Ce script ventile les occurrences DE HEAD (pas
celles que cette session vient d'écrire) par fichier et par `##` englobant, et marque chaque section « datée » ou « courante ». Le TRI reste à la main.

CALIBRATION : deux bras — une section « ## Session du … » doit être classée datée, « ## ORDRE DES RANGS » courante.
Usage, depuis la racine : python docs/preuves/D325/passe-d277/trier.py
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine")

FICHIERS = ["CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
ici = os.path.dirname(os.path.abspath(__file__))
motifs = []
for l in open(os.path.join(ici, "motifs.txt"), encoding="utf-8"):
    l = l.rstrip("\r\n")
    if l and not l.startswith("#"):
        s, m = l.split("|", 1)
        if not s.startswith("T"):
            motifs.append((s, m))


def classe(titre: str) -> str:
    if re.match(r"^## Session ", titre) or re.match(r"^## ~~PROCHAIN LOT~~", titre) or re.match(r"^## Reports ", titre) or re.match(r"^## Incident", titre):
        return "datée"
    return "COURANTE"


assert classe("## Session du 04/10/2026 — D324") == "datée"
assert classe("## ORDRE DES RANGS — QUEL lot vient ensuite") == "COURANTE"
assert classe("## ~~PROCHAIN LOT~~ — rang 31") == "datée"
print("calibration du classement : 3 cas ✓")


def lignes_head(f):
    return subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True).stdout.decode("utf-8").replace("\r\n", "\n").split("\n")


total = 0
for f in FICHIERS:
    L = lignes_head(f)
    titres = [(i, l) for i, l in enumerate(L) if l.startswith("## ")]
    # texte aplati par ligne : un motif peut enjamber un retour à la ligne — on cherche sur la fenêtre de deux lignes
    par_section: dict[str, dict[str, int]] = {}
    for i, l in enumerate(L):
        fen = re.sub(r"\s+", " ", l + " " + (L[i + 1] if i + 1 < len(L) else ""))
        for s, m in motifs:
            if m in re.sub(r"\s+", " ", l) or (m in fen and m not in re.sub(r"\s+", " ", l)):
                titre = "(avant tout titre)"
                for j, t in titres:
                    if j <= i:
                        titre = t
                    else:
                        break
                par_section.setdefault(titre, {}).setdefault(f"[{s}] {m}", 0)
                par_section[titre][f"[{s}] {m}"] += 1
    print(f"\n=== {f}")
    for titre, d in par_section.items():
        c = classe(titre)
        if c != "COURANTE":
            continue
        n = sum(d.values())
        total += n
        print(f"  {c} · {n:3d} · {titre[:110]}")
        for k, v in sorted(d.items(), key=lambda kv: -kv[1]):
            print(f"        {v:3d} × {k}")
print(f"\nOCCURRENCES DE HEAD DANS DES SECTIONS COURANTES : {total} (les sections datées sont laissées, par règle de D277)")
