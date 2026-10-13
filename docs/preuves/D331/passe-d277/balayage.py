"""D306 — PASSE D277, LES DEUX SENS. Pièce jetable, versée. Écrite par cette session (même méthode que D305 :
texte APLATI, motifs LUS dans un fichier, ventilation par motif et par fichier, motifs à zéro imprimés à part,
calibration T+ / T-), sans importer l'outil de D305.

Pour chaque occurrence dans l'ARBRE : un contexte de 160 caractères et l'indice « barré » (nombre impair de `~~`
entre le début du paragraphe aplati le plus proche — repéré par « ## » ou « ⛔ » — et l'occurrence). Tri À LA MAIN.
Usage, depuis la racine :  python docs/preuves/D306/passe-d277/balayage.py
"""
import os
import re
import subprocess
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

FICHIERS = ["CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
ici = os.path.dirname(os.path.abspath(__file__))
motifs = []
for l in open(os.path.join(ici, "motifs.txt"), encoding="utf-8"):
    l = l.rstrip("\r\n")
    if not l or l.startswith("#"):
        continue
    sens, motif = l.split("|", 1)
    motifs.append((sens, motif))


def plat(t: str) -> str:
    return re.sub(r"\s+", " ", t)


H = {f: plat(subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True).stdout.decode("utf-8")) for f in FICHIERS}
A = {f: plat(open(f, encoding="utf-8").read()) for f in FICHIERS}
print(f"corpus : {len(FICHIERS)} fichiers · HEAD {sum(map(len, H.values()))} car. · arbre {sum(map(len, A.values()))} car. · motifs {len(motifs)}")

ok = True
for sens, m in motifs:
    if sens == "T+":
        n = sum(H[f].count(m) for f in FICHIERS)
        print(f"calibration T+ « {m} » à HEAD : {n} (attendu > 0)")
        ok &= n > 0
    if sens == "T-":
        n = sum(H[f].count(m) + A[f].count(m) for f in FICHIERS)
        print(f"calibration T- « {m} » : {n} (attendu 0)")
        ok &= n == 0
if not ok:
    print("✗ ABANDON : calibration manquée")
    sys.exit(2)

zeros, total = [], 0
for sens, m in motifs:
    if sens.startswith("T"):
        continue
    nh = {f: H[f].count(m) for f in FICHIERS}
    na = {f: A[f].count(m) for f in FICHIERS}
    total += sum(na.values())
    if sum(na.values()) == 0 and sum(nh.values()) == 0:
        zeros.append((sens, m))
        continue
    vent = " · ".join(f"{f} {nh[f]}→{na[f]}" for f in FICHIERS if nh[f] or na[f])
    print(f"\n[sens {sens}] « {m} » — HEAD {sum(nh.values())} → arbre {sum(na.values())} ({vent})")
    for f in FICHIERS:
        t = A[f]
        for mo in re.finditer(re.escape(m), t):
            i = mo.start()
            deb = max(t.rfind(" ## ", 0, i), t.rfind("⛔", 0, i), 0)
            barre = t.count("~~", deb, i) % 2 == 1
            print(f"   {f} @{i} {'[barré]' if barre else '[courant]'} …{t[max(0, i - 70):i + 90]}…")
print(f"\nOCCURRENCES DANS L'ARBRE : {total} · motifs examinés {len([x for x in motifs if not x[0].startswith('T')])}")
print(f"MOTIFS À ZÉRO (HEAD et arbre) : {len(zeros)} — hypothèses à vérifier, pas des absences constatées")
for sens, m in zeros:
    print(f"   [sens {sens}] « {m} »")
