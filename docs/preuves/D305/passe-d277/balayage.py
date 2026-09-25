"""D305 — PASSE D277, LES DEUX SENS. Pièce jetable, versée.
Texte APLATI (blancs réduits à une espace) des quatre fichiers d'autorité, à HEAD (`git show`) et dans l'arbre.
Les motifs sont LUS dans `motifs.txt` (D289 : aucun texte ne traverse un interpréteur). Par motif : occurrences à
HEAD et dans l'arbre, ventilées par fichier (D295), les motifs à ZÉRO imprimés sous leur propre intitulé. Pour chaque
occurrence de l'arbre : un contexte, et deux indices — « barré » (nombre impair de `~~` depuis le début du paragraphe)
et « D305 » (le jeton dans les 500 caractères qui suivent). Le tri est À LA MAIN : `tri.txt`.
Calibration : T+ doit être > 0 à HEAD, T- doit être 0 partout ; sinon ABANDON.
Usage, depuis la racine : python3 docs/preuves/D305/passe-d277/balayage.py
"""
import os, re, subprocess, sys
for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE."); sys.exit(2)
FICHIERS = ["CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
ici = os.path.dirname(os.path.abspath(__file__))
motifs = []
for l in open(os.path.join(ici, "motifs.txt"), encoding="utf-8"):
    l = l.rstrip("\r\n")
    if not l or l.startswith("#"): continue
    sens, motif = l.split("|", 1)
    motifs.append((sens, motif))
plat = lambda t: re.sub(r"\s+", " ", t)
def head(f): return plat(subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True).stdout.decode("utf-8"))
def arbre(f): return plat(open(f, encoding="utf-8").read())
H = {f: head(f) for f in FICHIERS}; A = {f: arbre(f) for f in FICHIERS}
print(f"corpus : {len(FICHIERS)} fichiers · HEAD {sum(map(len, H.values()))} car. · arbre {sum(map(len, A.values()))} car. · motifs {len(motifs)}")
ok = True
for sens, m in motifs:
    if sens == "T+":
        n = sum(H[f].count(m) for f in FICHIERS); print(f"calibration T+ « {m} » à HEAD : {n} (attendu > 0)"); ok &= n > 0
    if sens == "T-":
        n = sum(H[f].count(m) + A[f].count(m) for f in FICHIERS); print(f"calibration T- « {m} » : {n} (attendu 0)"); ok &= n == 0
if not ok:
    print("✗ ABANDON : calibration manquée"); sys.exit(2)
zeros = []
for sens, m in motifs:
    if sens.startswith("T"): continue
    nh = {f: H[f].count(m) for f in FICHIERS}; na = {f: A[f].count(m) for f in FICHIERS}
    if sum(na.values()) == 0 and sum(nh.values()) == 0:
        zeros.append((sens, m)); continue
    print(f"\n== sens {sens} « {m} » — HEAD {sum(nh.values())} · arbre {sum(na.values())} · " +
          " · ".join(f"{f} {nh[f]}→{na[f]}" for f in FICHIERS if nh[f] or na[f]))
    for f in FICHIERS:
        t = A[f]; i = t.find(m)
        while i >= 0:
            debut = max(t.rfind(" ### ", 0, i), t.rfind(" ## ", 0, i), t.rfind(" - ", 0, i), t.rfind(" | ", 0, i), 0)
            barre = t.count("~~", debut, i) % 2 == 1
            d305 = "D305" in t[i:i + 500]
            print(f"   [{f} @{i}] barré={barre} D305<500={d305} :: …{t[max(0, i - 110):i + len(m) + 90]}…")
            i = t.find(m, i + 1)
print("\n== motifs à ZÉRO à HEAD et dans l'arbre (hypothèses à vérifier, pas des absences constatées) :")
for s, m in zeros: print(f"   sens {s} « {m} »")
print(f"\nmotifs examinés : {len([x for x in motifs if not x[0].startswith('T')])} · à zéro : {len(zeros)}")
