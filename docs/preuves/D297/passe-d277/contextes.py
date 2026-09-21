import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
FICHIERS = ["AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
motifs = [l.rstrip("\r\n") for l in open(sys.argv[1], encoding="utf-8") if l.strip() and not l.startswith("#")]
SEP = r"[\s*`~]+"
vus = 0
for m in motifs:
    mots = m.split()
    rx = re.compile(r"[*`~]*".join([""]) + SEP.join(re.escape(w) for w in mots), re.IGNORECASE)
    for f in FICHIERS:
        t = open(f, encoding="utf-8", newline="").read()
        for mm in rx.finditer(t):
            vus += 1
            ligne = t.count("\n", 0, mm.start()) + 1
            debut = max(0, mm.start() - 110)
            extrait = re.sub(r"\s+", " ", t[debut: mm.end() + 60])
            print(f"[{m}] {f}:{ligne} … {extrait} …")
print(f"occurrences vues : {vus}")
