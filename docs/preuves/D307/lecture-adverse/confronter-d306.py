"""D307 — LECTURE ADVERSE DE D306 : ses chiffres confrontés à SES pièces et au dépôt. Pièce jetable, versée.
N'écrit rien : elle imprime. Chaque contrôle imprime l'attendu À CÔTÉ du mesuré (D290) et ce qu'il a parcouru.
Les attendus sont ceux que la SECTION D306 écrit — recopiés de la section, pour être confrontés, jamais de mémoire.
Usage, depuis la racine :  python docs/preuves/D307/lecture-adverse/confronter-d306.py
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

ANSI = re.compile(r"\x1b\[[0-9;]*m")
N = "docs/preuves/D306/neutralisation"
ecarts = 0


def lire(chemin: str) -> str:
    return ANSI.sub("", open(chemin, "rb").read().decode("utf-8", errors="replace"))


def controle(nom: str, mesure, attendu) -> None:
    global ecarts
    ok = mesure == attendu
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {nom} : mesuré {mesure!r} (attendu, section D306 : {attendu!r})")


# 1. Calibration du lecteur : « 33 cas, 0 manqué ».
t = lire("docs/preuves/D306/outils/calibrer-lire-sortie-3.txt")
m = re.search(r"CAS=(\d+) MANQUES=(\d+)", t)
controle("calibration du lecteur", (int(m.group(1)), int(m.group(2))) if m else None, (33, 0))

# 2. Les fiches de lecture : poses et restaurations (« 26 poses prouvées, 25 restaurations prouvées »).
fiches = sorted(f for f in os.listdir(N) if f.endswith("-lecture.txt"))
poses = restaurations = 0
verdicts = {}
for f in fiches:
    t = lire(os.path.join(N, f))
    poses += len(re.findall(r"^  POSE ✓", t, re.M))
    restaurations += t.count("RESTAURATION PROUVÉE")
    v = re.search(r"^VERDICT=(.+)$", t, re.M)
    lt = re.search(r"^LIGNE_TESTS=(.+)$", t, re.M)
    verdicts[f[: -len("-lecture.txt")]] = (v.group(1) if v else None, lt.group(1) if lt else None, t)
print(f"fiches de lecture parcourues : {len(fiches)}")
controle("cibles jouées (fiches)", len(fiches), 25)
controle("éditions posées et prouvées", poses, 26)
controle("restaurations prouvées", restaurations, 25)

# 3. Ce qui CASSE : C1 (X4), C2 (X10), C3 (X2a), C4 (X14) — « 48/48 verts » ; C5 (X15) — un échec, par `Error`.
for cid in ["X4-service-plus-DECLINED", "X10-decision-sur-ACCEPTED", "X2a-relecture-transition-const", "X14-statut-du-400"]:
    v, lt, _ = verdicts[cid]
    controle(f"{cid}", (v, lt), ("VERT", "Tests  48 passed (48)"))
v, lt, t = verdicts["X15-motif-ignore-au-site"]
premiere = re.search(r"test \| (\w+) \| (.+)\n\s+1re ligne : (.+)", t)
controle("X15 (C5) : ligne Tests", lt, "Tests  1 failed | 47 passed (48)")
controle("X15 (C5) : classe et titre", (premiere.group(1), premiere.group(2).split(" > ")[-1]) if premiere else None,
         ("Error", "le client DOIT un motif pour annuler une demande ACCEPTÉE"))

# 4. Les sept gardes de 23a : « toutes mordent ».
for cid in ["R23-F1-a", "R23-F1-b", "R23-F5-a", "R23-F5-b", "R23-F5-c", "S5b-1", "S5b-2"]:
    controle(f"{cid} verdict", verdicts[cid][0], "MORSURE LUE")
for cid in ["S5b-1-sans-T5", "S5b-2-sans-T4"]:
    controle(f"{cid} ligne Tests", verdicts[cid][1], "Tests  47 passed | 1 skipped (48)")

# 5. La sonde : « 14 collectés, 14 verts ».
t = lire("docs/preuves/D306/sondes/sorties/sonde-HEAD.txt")
m = re.search(r"Tests\s+(\d+) passed \((\d+)\)", t)
controle("sonde à HEAD", (int(m.group(1)), int(m.group(2))) if m else None, (14, 14))

# 6. L'audit final : « 1 117 = 1 077 + 40 ; 116 alertes ».
t = lire("docs/preuves/D306/audit-secrets-final.txt")
m = re.search(r"parcourus : (\d+) fichiers.*?audités : (\d+) fichiers.*?exclus : (\d+) fichiers.*?alertes : (\d+)", t)
controle("audit final", tuple(int(x) for x in m.groups()) if m else None, (1117, 1077, 40, 116))

# 7. « bookings.int-spec.ts est le SEUL spec du dépôt qui appelle l'annulation client » (DELETE /api/v1/bookings/:id).
suivis = subprocess.run(["git", "ls-files"], capture_output=True, text=True, encoding="utf-8").stdout.split("\n")
specs = [f for f in suivis if re.search(r"\.(spec|int-spec|test|e2e)\.(ts|tsx)$", f) and not f.startswith("docs/")]
appelants = []
for f in specs:
    t = open(f, encoding="utf-8").read()
    if re.search(r"delete\(\s*`/api/v1/bookings/", t) or re.search(r"DELETE.{0,40}/bookings/", t):
        appelants.append(f)
print(f"specs suivies parcourues (hors docs/) : {len(specs)}")
controle("specs qui appellent l'annulation client", appelants, ["apps/api/test/int/bookings.int-spec.ts"])

# 8. « les tests D121 n'assertent que le code » — lu, test par test.
t = open("apps/api/test/int/bookings.int-spec.ts", encoding="utf-8").read()
for titre in ["D121 — deux refus SIMULTANÉS", "D121 — deux annulations PRO SIMULTANÉES", "D121 — deux annulations CLIENT SIMULTANÉES"]:
    i = t.index(titre)
    corps = t[i: t.index("\n  it(", i + 1)]
    print(f"  {titre} : `message.code` asserté {'OUI' if 'message.code' in corps else 'NON'} · "
          f"`message.status` asserté {'OUI' if 'message.status' in corps else 'NON'}")

print(f"\nÉCARTS À LA SECTION D306 : {ecarts} (attendu 0)")
