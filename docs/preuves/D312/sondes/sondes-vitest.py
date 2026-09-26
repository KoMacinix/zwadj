"""D312 — SONDES, SANS AUCUNE MUTATION : ce que rend vitest, lancé comme les harnais API qui FONCTIONNENT
(`pnpm --filter @zwadj/api exec vitest run <spec> -t <filtre>`, `pnpm` résolu par `shutil.which`, depuis la RACINE,
sans `cwd` — relu dans `neutralize-s11a.py`, `-s11b.py`, `-rang23.py`), dans les cas que le harnais corrigé doit
séparer. Pièce jetable, versée : les modes de défaillance du lot s'écrivent sur ces sorties, pas de mémoire.
Chaque sortie brute (ANSI retiré) est écrite à côté ; le résumé imprime le code et la ligne « Tests ».
Usage, depuis la racine :  python docs/preuves/D312/sondes/sondes-vitest.py
"""
import json
import os
import re
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
ICI = os.path.dirname(os.path.abspath(__file__))
ANSI = re.compile(r"\x1b\[[0-9;]*m")
PNPM = shutil.which("pnpm") or "pnpm"
SPEC = "src/venues/venues-public.service.spec.ts"
ENV = {**os.environ, "DATABASE_URL": "postgresql://x:x@localhost:5432/x"}

SONDES = [
    ("S1-nominal", ["--filter", "@zwadj/api", "exec", "vitest", "run", SPEC, "-t", "date passée"]),
    ("S2-filtre-sans-titre", ["--filter", "@zwadj/api", "exec", "vitest", "run", SPEC, "-t", "motif-sans-titre-d312-qq"]),
    ("S3-fichier-introuvable", ["--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/n-existe-pas-d312.spec.ts"]),
    ("S4-commande-introuvable", ["--filter", "@zwadj/api", "exec", "vitest-introuvable-d312", "run", SPEC]),
]
print(f"pnpm résolu : {PNPM!r}")
pj = os.path.join("apps", "api", "node_modules", "vitest", "package.json")
print(f"version de vitest ({pj}) : {json.load(open(pj, encoding='utf-8'))['version'] if os.path.isfile(pj) else 'ABSENT'}")
for nom, args in SONDES:
    r = subprocess.run([PNPM, *args], capture_output=True, text=True, encoding="utf-8", errors="replace", env=ENV)
    sortie = ANSI.sub("", (r.stdout or "") + "\n--- stderr ---\n" + (r.stderr or ""))
    open(os.path.join(ICI, f"{nom}.txt"), "w", encoding="utf-8", newline="\n").write(
        f"$ pnpm {' '.join(args)}\n{sortie}\n--- code de sortie : {r.returncode} ---\n")
    tests = [l.strip() for l in sortie.splitlines() if l.strip().startswith("Tests ")]
    fichiers = [l.strip() for l in sortie.splitlines() if l.strip().startswith("Test Files ")]
    fail = [l.strip() for l in sortie.splitlines() if l.strip().startswith("FAIL ")]
    print(f"{nom:24s} code {r.returncode} · Tests {tests[-1:] or '—'} · Test Files {fichiers[-1:] or '—'} · "
          f"blocs FAIL {len(fail)} · lignes {len(sortie.splitlines())}")
