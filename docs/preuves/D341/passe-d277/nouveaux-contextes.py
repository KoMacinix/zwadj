"""Liste, par motif, les contextes de la sortie « après » ABSENTS de la sortie « avant » (comparés sur le texte du contexte, sans la position) — c'est ce que le lot a ÉCRIT dans les motifs de la passe."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8", errors="replace")
avant = open("docs/preuves/D341/passe-d277/sortie-avant.txt", encoding="utf-8").read().splitlines()
apres = open("docs/preuves/D341/passe-d277/sortie-apres.txt", encoding="utf-8").read().splitlines()


def decouper(lignes):
    d, cur = {}, None
    for l in lignes:
        if l.startswith("· «") or l.startswith("· ["):
            cur = l.split(" — ")[0]
            d.setdefault(cur, [])
        elif l.startswith("══"):
            cur = None
        elif cur and l.strip().startswith("["):
            m = re.match(r"\s*\[(\S+) #\d+ @\d+\] (.*)$", l)
            if m:
                d[cur].append((m.group(1), m.group(2)))
    return d


A, B = decouper(avant), decouper(apres)
total_nouveaux = 0
for motif, lst in B.items():
    anciens = {c for _, c in A.get(motif, [])}
    nouveaux = [(f, c) for f, c in lst if c not in anciens]
    total_nouveaux += len(nouveaux)
    if nouveaux:
        print(f"\n{motif[:110]} — {len(nouveaux)} nouveau(x) :")
        for f, c in nouveaux:
            print(f"   [{f}] {c[:300]}")
print(f"\nTOTAL de contextes nouveaux : {total_nouveaux} (motifs examinés : {len(B)})")
