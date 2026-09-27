"""D315 — LECTURE ADVERSE DE D314 : ses chiffres confrontés à SES pièces, au disque et au dépôt. Pièce jetable, versée.
N'écrit rien : elle imprime. Patron : `docs/preuves/D313/lecture-adverse/confronter-d312.py` (non importé).
Chaque contrôle imprime l'attendu À CÔTÉ du mesuré (D290) et, quand il compte, ce qu'il a parcouru. Les attendus sont
ceux que la SECTION D314 et le point d'entrée du rang 23 (blocs « LA CERTIFICATION QUI CLÔT LE RANG 23 (D314) » et
« RÉSULTAT (D314) ») écrivent — recopiés de ces textes pour être confrontés, jamais de mémoire. Un constat sans chiffre
de la section s'imprime « · », il n'entre pas au compte des écarts. Lit les journaux par sa PROPRE expression : aucun
import des lecteurs de D314 (`lire-rang23.py`, `lire-aoa.py`, `lire-campagnes.py`) ni de ceux de D310.
Usage, depuis la racine :  python docs/preuves/D315/lecture-adverse/confronter-d314.py
"""
import datetime
import hashlib
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
D = "docs/preuves/D314"
P = f"{D}/passe-r23d-20260926-1434"
SRC = ".neutralisation-journaux/r23d-20260926-1434"
DEPART, ETAPE0, FIN, MARQUE_D299 = "a5a8c55", "0057748", "ffd32e9", "0a8235d"
AUTORITE = ["CLAUDE.md", "AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
ecarts, controles = 0, 0


def lire(chemin: str) -> str:
    return ANSI.sub("", open(chemin, "rb").read().decode("utf-8", errors="replace"))


def controle(nom: str, mesure, attendu, source: str = "section D314") -> None:
    global ecarts, controles
    controles += 1
    ok = mesure == attendu
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {nom} : mesuré {mesure!r} (attendu, {source} : {attendu!r})")


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8").stdout


def sha(chemin: str) -> str:
    return hashlib.sha256(open(chemin, "rb").read()).hexdigest()


def plat(t: str) -> str:
    return re.sub(r"\s+", " ", t)


def hors_code(f: str) -> bool:
    return f in AUTORITE or f.startswith("docs/preuves/")


# ------------------------------------------------------------------ 1. provenance, périmètre, marque
print("== 1. provenance, périmètre, marque")
controle("parent de l'étape 0", git("rev-parse", "--short=7", f"{ETAPE0}^").strip(), DEPART)
controle("parent du commit de clôture", git("rev-parse", "--short=7", f"{FIN}^").strip(), ETAPE0)
n = sum(len(re.findall("D314", git("show", f"{DEPART}:{f}"))) for f in AUTORITE)
controle("« D314 » dans les fichiers d'autorité à SHA de départ", n, 0)
e0 = [l for l in git("diff", "--name-only", DEPART, ETAPE0).splitlines() if l]
controle("étape 0 : fichiers hors ZWADJ_CONTINUITE.md et docs/preuves/D314/",
         [f for f in e0 if f != "ZWADJ_CONTINUITE.md" and not f.startswith(f"{D}/")], [])
cl = [l for l in git("diff", "--name-only", ETAPE0, FIN).splitlines() if l]
controle("clôture : fichiers hors des trois .md et docs/preuves/D314/",
         [f for f in cl if f not in ("AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md") and not f.startswith(f"{D}/")], [])
print(f"  · parcouru : {len(e0)} fichiers à l'étape 0, {len(cl)} à la clôture")
# « poussée AVANT le relevé d'ouverture » : reflog local d'origin/main contre l'horodatage de la sonde.
rl = git("reflog", "show", "--date=iso", "refs/remotes/origin/main")
m = re.search(rf"^{ETAPE0}\S* refs/remotes/origin/main@\{{(\S+ \S+) \S+\}}: update by push", rl, re.M)
pousse = m.group(1) if m else None
ouv = re.search(r"^HORODATAGE=(\S+ \S+)", lire(f"{P}/sonde-ouverture-1.txt"), re.M).group(1)
controle("étape 0 poussée avant le relevé d'ouverture-1 (reflog local d'origin/main)",
         (pousse, ouv, bool(pousse) and pousse < ouv + ":00"), ("2026-09-26 14:34:20", "2026-09-26 14:35:30", True),
         "« commitée et poussée AVANT le relevé d'ouverture »")
commits = [l for l in git("rev-list", f"{MARQUE_D299}^..{DEPART}").splitlines() if l]
controle("commits de la marque de D299 à a5a8c55, bornes incluses", len(commits), 17, "bloc de l'étape 0")
code = []
for c in commits:
    fs = [l for l in git("diff-tree", "--no-commit-id", "--name-only", "-r", c).splitlines() if l]
    if any(not hors_code(f) for f in fs):
        code.append(c[:7])
controle("ceux qui portent un fichier hors .md d'autorité et hors docs/preuves/", sorted(code),
         sorted(["b715943", "3ac8749", "d37ea64"]), "bloc de l'étape 0")
sujets = {c: git("log", "-1", "--format=%s", c) for c in ("b715943", "3ac8749", "d37ea64")}
controle("leurs sujets nomment D305, D308, D312",
         [bool(re.search(d, sujets[c])) for c, d in (("b715943", "D305"), ("3ac8749", "D308"), ("d37ea64", "D312"))],
         [True, True, True], "marque")

# ------------------------------------------------------------------ 2. étape 0 : le plancher
print("== 2. étape 0 : le plancher")
ea = lire(f"{D}/plancher/etat-avant-simulation.txt")
ch = lambda t, k: (re.search(rf"^{k}=(\S+)", t, re.M) or [None, None])[1]
controle("état avant simulation : alim, node, chrome, RAM", (ch(ea, "ALIM_SOURCE"), ch(ea, "NODE"), ch(ea, "CHROME"), ch(ea, "RAM_MEDIANE_MO")),
         ("SECTEUR", "0", "0", "6702"), "bloc de l'étape 0")
si = lire(f"{D}/plancher/simulation-sortie.txt")
controle("simulation : bras et défauts manqués", re.search(r"BRAS ET DÉFAUTS MANQUÉS : (\d+)", si).group(1), "0")
controle("énumération : harnais, autres", re.search(r"ÉNUMÉRATION : (\d+) harnais .*?: (\d+) \(attendu", si).groups(), ("28", "26"))
M = {}
for mo in re.finditer(r"^\s*· (\S+)\s+(tout|--int)\s+([AB]) :\s+([\d.]+) s · code\s+(\d+) · « ✓ »\s+(\d+) · « ✗ »\s+(\d+) · cibles\s+(\d+)(.*)$", si, re.M):
    h, _, niv, s, c, ok, ko, cib, reste = mo.groups()
    r = re.search(r"reliquats identiques retirés (\d+)", reste)
    M[(h, niv)] = (float(s), int(c), int(ok), int(ko), int(cib), int(r.group(1)) if r else 0)
controle("lignes de mesure lues (26 harnais × A, B)", len(M), 52)
controle("available-on sous A : s, code, ✓, cibles", M[("available-on", "A")][:3] + (M[("available-on", "A")][4],), (0.43, 0, 10, 10))
controle("journey sous A : s, code, ✓, cibles", M[("journey", "A")][:3] + (M[("journey", "A")][4],), (0.36, 0, 7, 7))
bruyants = sorted({h for (h, n_), v in M.items() if v[3] == v[4] and v[3] > 0})
controle("« un ✗ par cible » sous A et B", bruyants, ["404", "horizon", "maxprice"])
autres = sorted({h for (h, n_) in M} - {"available-on", "journey", "404", "horizon", "maxprice"})
controle("les autres : nombre, codes sous A et B", (len(autres), sorted({M[(h, n_)][1] for h in autres for n_ in "AB"})), (21, [1, 2]))
rel = {h: (M[(h, "A")][5], M[(h, "B")][5]) for h in {h for (h, n_) in M} if M[(h, "A")][5] or M[(h, "B")][5]}
controle("reliquats .sauvegarde retirés (A, B)", dict(sorted(rel.items())), {"act-plafonds": (2, 2), "argon2": (1, 1), "horloge": (1, 1)})
m = re.search(r"sans cale : code (\d+) · « ✓ » (\d+) .*?appels de cale (\d+) .*?· ([\d.]+) s", si)
controle("bras négatif argon2 sans cale : code, ✓, appels, s", m.groups(), ("0", "3", "0", "16.6"))
T = {mo.group(1): (mo.group(2), int(mo.group(3)), float(mo.group(6))) for mo in re.finditer(
    r"^T (\S+) (tout|--int) (\d+) ([\d.]+) ([\d.]+) ([\d.]+) \d+$", si, re.M)}
PL = {mo.group(1): (mo.group(2), float(mo.group(3))) for mo in re.finditer(r"^P (\S+) (tout|--int) ([\d.]+)$", lire(f"{D}/plancher/plancher.txt"), re.M)}
controle("plancher.txt : lignes P, table T", (len(PL), len(T)), (26, 26))
faux = [h for h in PL if round(3 * T[h][2], 2) != PL[h][1]]
controle("P = 3 × T pour chaque campagne (recalculé)", faux, [])
bas, haut = min(PL.items(), key=lambda x: x[1][1]), max(PL.items(), key=lambda x: x[1][1])
controle("plancher le plus bas, le plus haut", ((bas[0], bas[1][1]), (haut[0], haut[1][1])), (("budgets", 0.69), ("404", 43.89)))
# « absolu : 5 refus à D310, par cible : 4 » — recalculé sur les durées de D310 lues dans SA passe versée, pas dans la sortie de D314
d310 = {mo.group(1): int(mo.group(2)) for mo in re.finditer(r"^neutralize-(\S+)\.py\s+\d+\s+\S+\s+\d+\s+\d+\s+\d+\s+(\d+)\s*$",
                                                             lire("docs/preuves/D310/passe-r23c-20260926-0032/campagnes-tout.log"), re.M)}
d310int = {}
for h in PL:
    if PL[h][0] == "--int":
        t = lire(f"docs/preuves/D310/passe-r23c-20260926-0032/int-{h}.heures")
        d310int[h] = int(re.search(r"· (\d+) s ·", t).group(1))
reel = {h: (d310int[h] if PL[h][0] == "--int" else d310[h]) for h in PL}
Tabs = 3 * max(T[h][2] for h in T)
Tcib = 3 * max(T[h][2] / T[h][1] for h in T)
controle("absolu : refus à D310 (recalculé)", sorted(h for h in reel if reel[h] < Tabs),
         ["argon2", "booking-status", "budgets", "solid-s4", "solid-s5a"], "« cinq », deriver-plancher-sortie")
controle("par cible : refus à D310 (recalculé)", sorted(h for h in reel if reel[h] < Tcib * T[h][1]),
         ["s10b", "s11a", "solid-s4", "solid-s5a"], "« quatre »")
rmin = min(reel[h] / T[h][2] for h in T)
controle("racine du rapport réel / T le plus bas, K = 3 en dessous", (round(rmin, 1), round(rmin ** 0.5, 2) > 3), (10.8, True), "« ≈ 10,8 »")
controle("campagnes de D310 sous leur plancher", [h for h in reel if reel[h] < PL[h][1]], [], "prédiction de l'étape 0")
jx = [n_ for _, _, ns in os.walk(f"{D}/plancher/journaux") for n_ in ns]
controle("journaux de la simulation versés", len(jx), 118, "« 118 journaux versés »")
controle("sim-A-available-on.log et sim-A-journey.log présents",
         all(os.path.isfile(f"{D}/plancher/journaux/sim-A-{h}.log") for h in ("available-on", "journey")), True, "backlog, reports de D314")

# ------------------------------------------------------------------ 3. la passe : versement, sondes, arbre
print("== 3. la passe : versement, sondes, arbre")
verses = sorted(os.path.relpath(os.path.join(r, n_), P).replace("\\", "/") for r, _, ns in os.walk(P) for n_ in ns)
apres_versement = {"e2e-EXTRAIT.txt", "aucune-valeur-reelle.txt"}
controle("pièces du dossier de la passe : total, produites après le versement", (len(verses), len([v for v in verses if v in apres_versement])), (160, 2), "« 158 … 2 »")
if os.path.isdir(SRC):
    src = sorted(os.path.relpath(os.path.join(r, n_), SRC).replace("\\", "/") for r, _, ns in os.walk(SRC) for n_ in ns)
    refus = [s for s in src if "e2e" in os.path.basename(s) and s.endswith(".log")]
    ident = sum(1 for s in src if s not in refus and os.path.isfile(f"{P}/{s}") and sha(f"{SRC}/{s}") == sha(f"{P}/{s}"))
    controle("source sur disque : fichiers, refusés (e2e brut), versés identiques par SHA-256 (rejoué)", (len(src), refus, ident),
             (159, ["e2e.log"], 158), "« 158 pièces relues identiques … journal e2e brut refusé »")
    controle("pièces versées sans source (hors les deux produites après)", [v for v in verses if v not in src and v not in apres_versement], [])
else:
    print(f"  · {SRC} absent du disque : l'identité 158/158 n'est pas rejouable")
controle("porte dure", lire(f"{P}/porte-dure.txt").strip(), "VERTE")
S = {}
for nom in sorted(os.listdir(P)):
    if nom.startswith("sonde-"):
        t = lire(f"{P}/{nom}")
        bande = ch(t, "RAM_BANDE_MO").split("-")
        S[nom[6:-4]] = (float(ch(t, "RAM_MEDIANE_MO")), int(bande[0]), int(bande[1]), ch(t, "ALIM_SOURCE"), ch(t, "NODE"), ch(t, "CHROME"), int(ch(t, "BARRE_D273_MO")))
controle("relevés de sonde", len(S), 17, "« 17 relevés de sonde »")
controle("ouverture-1, ouverture-2 : médiane, bande", [S["ouverture-1"][:3], S["ouverture-2"][:3]], [(6394.0, 6347, 6434), (6440.0, 6419, 6506)], "RÉSULTAT (D314)")
controle("tous : SECTEUR, node 0, chrome 0, barre 4579", sorted({(v[3], v[4], v[5], v[6]) for v in S.values()}), [("SECTEUR", "0", "0", 4579)])
controle("tous : médiane ET bande basse au-dessus de la barre", [k for k, v in S.items() if not (v[0] > v[6] and v[1] > v[6])], [])
b = min(S.items(), key=lambda x: x[1][1])
controle("bande basse la plus basse", (b[0], b[1][1]), ("avant-int-solid-s6", 5969))
controle("calibration de la sonde d'ouverture : rendement", re.search(r"rendement ([\d.]+)", lire(f"{P}/sonde-ouverture-1.txt")).group(1), "0.95")
for i in range(1, 6):
    t = lire(f"{P}/arbre-{i}.txt")
    corps = t.split("(vide exigé)")[1].split("--- fin")[0].strip()
    controle(f"arbre-{i} : HEAD, lignes de statut", (re.search(r"^HEAD (\S+)", t, re.M).group(1)[:7], len([l for l in corps.splitlines() if l.strip()])), (ETAPE0, 0))

# ------------------------------------------------------------------ 4. la table des portes
print("== 4. la table des portes")
for nom, att in (("typecheck", "0"), ("lint", "0"), ("test", "0"), ("build", "0"), ("testint", "0"), ("e2e", "0"),
                 ("campagnes-tout", "1"), ("contre-epreuve", "0")):
    controle(f"{nom} : code réel", open(f"{P}/{nom}.code").read().strip(), att)
cpt = lambda nom, motif: len([l for l in lire(f"{P}/{nom}.log").splitlines() if re.search(motif, l)])
controle("typecheck : « Done », error TS", (cpt("typecheck", r"\bDone\b"), cpt("typecheck", r"error TS")), (8, 0))
controle("lint : « Done »", cpt("lint", r"\bDone\b"), 8)
controle("build : « Done »", cpt("build", r"\bDone\b"), 4)
tt = lire(f"{P}/test.log")
paires = list(zip([int(x) for x in re.findall(r"^\s*Tests\s+(\d+) passed \(\d+\)", tt, re.M)],
                  [int(x) for x in re.findall(r"^\s*Test Files\s+(\d+) passed \(\d+\)", tt, re.M)]))
controle("test : Tests / Test Files par paquet", paires, [(664, 58), (36, 3), (287, 20), (347, 28)])
ti = lire(f"{P}/testint.log")
controle("test:int : Tests, Test Files", (re.findall(r"^\s*Tests\s+(\d+) passed", ti, re.M)[-1:], re.findall(r"^\s*Test Files\s+(\d+) passed", ti, re.M)[-1:]), (["443"], ["36"]))
controle("« fail » toute casse : test, test:int", (cpt("test", r"(?i)fail"), cpt("testint", r"(?i)fail")), (2, 1), "D275, RÉSULTAT (D314)")
controle("« fail » de test : lignes ChargilyGateway", len([l for l in tt.splitlines() if re.search(r"(?i)fail", l) and "ChargilyGateway" in l]), 2)
controle("« fail » de test:int : le nom d'un test vert (« passe FAILED »)", [("✓" in l, "passe FAILED" in l) for l in ti.splitlines() if re.search(r"(?i)fail", l)], [(True, True)])
controle("FAIL casse exacte, ELIFECYCLE, timed out (six journaux de porte)",
         sum(cpt(n_, r"\bFAIL\b") + cpt(n_, r"ELIFECYCLE") + cpt(n_, r"(?i)timed out") for n_ in ("typecheck", "lint", "test", "build", "testint")), 0)
ex = lire(f"{P}/e2e-EXTRAIT.txt")
controle("e2e : lignes parcourues, attendu, gardées", re.search(r"lignes parcourues : (\d+) \(attendu (\d+).*?gardées : (\d+)", ex).groups(), ("822", "822", "38"))
controle("e2e : résumé, Running", (re.search(r"résumé : (\{.*?\})", ex).group(1), re.search(r"Running : \[(\d+)\]", ex).group(1)),
         ("{'skipped': 1, 'passed': 34}", "35"))
controle("e2e : lignes « ok » gardées, « fail » du journal", (len(re.findall(r"^\d+ \|\s+ok \d+ ", ex, re.M)), re.search(r"lignes « fail » du journal : (\d+)", ex).group(1)), (34, "0"))
ct = lire(f"{P}/campagnes-tout.log")
controle("--tout, ligne MESURÉ", re.search(r"MESURÉ : (\d+) garde.*?· (\d+) muette.*?· (\d+) non mesurée.*?· (\d+) campagne.*?· (\d+)s", ct).groups(),
         ("198", "0", "13", "28", "2893"))
tab = [(mo.group(1), int(mo.group(2)), int(mo.group(3)), int(mo.group(4))) for mo in re.finditer(
    r"^neutralize-(\S+)\.py\s+\d+\s+\S+\s+(\d+)\s+\d+\s+(\d+)\s+(\d+)\s*$", ct, re.M)]
controle("--tout, table : lignes, Σ mordues, Σ non mesurées (recomptés)", (len(tab), sum(x[1] for x in tab), sum(x[2] for x in tab)), (28, 198, 13))
controle("journaux de CETTE passe copiés : campagnes + rang23 + available-on-api",
         (len(os.listdir(f"{P}/campagnes")), len(os.listdir(f"{P}/rang23")), len(os.listdir(f"{P}/available-on-api"))), (28, 15, 30), "« 73 »")
pr = lire(f"{P}/progression.txt")
controle("progression : copiés, antérieurs au début de --tout", re.search(r"copiés à l'identique : (\d+) sur (\d+) · antérieurs au début de --tout : (\d+)", pr).groups(), ("73", "73", "0"))
INT = {"e3d1-s8": 8, "s11b": 13, "solid-s1": 2, "solid-s2": 5, "solid-s3": 6, "solid-s6": 6}
lu = {}
for h in INT:
    m = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", lire(f"{P}/int-{h}.log"))
    lu[h] = (int(m.group(1)), int(m.group(2)), open(f"{P}/int-{h}.code").read().strip())
controle("--int ×6 : mordues, cibles, code", lu, {h: (v, v, "0") for h, v in INT.items()})
controle("--int : somme", sum(v[0] for v in lu.values()), 40)
ce = lire(f"{P}/contre-epreuve.log")
controle("contre-épreuve : bras du pré-vol, mordues sur cibles", (re.search(r"bras ✓ (\d+) \(attendu", ce).group(1), re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ce).groups()), ("5", ("5", "5")))

# ------------------------------------------------------------------ 5. les preuves LUES, relues par cette lecture
print("== 5. rang23 et available-on-api, relus par ma propre expression")


def bloc_tests(t: str):
    res = [l.strip() for l in t.splitlines() if re.match(r"^\s*Tests\s", l)]
    if not res:
        return None
    d = res[-1]
    g = lambda k: int((re.search(rf"(\d+) {k}", d) or [None, "0"])[1])
    return g("passed"), g("failed")


def premieres(t: str):
    ls = t.splitlines()
    out = []
    for i, l in enumerate(ls):
        if re.match(r"^\s*FAIL\s+\S+\s+>\s+", l):
            out.append(next((x.strip() for x in ls[i + 1:i + 8] if x.strip()), "").split(":")[0])
    return out


mes = [n_ for n_ in sorted(os.listdir(f"{P}/rang23")) if n_.startswith("R23-")]
res = {n_: bloc_tests(lire(f"{P}/rang23/{n_}")) for n_ in mes}
controle("rang23 : mesures, exécutés > 0, en échec > 0", (len(mes), sum(1 for v in res.values() if v and sum(v) > 0), sum(1 for v in res.values() if v and v[1] > 0)), (13, 13, 13), "« 13 · 13 · 13 »")
ty = sorted({p for n_ in mes for p in premieres(lire(f"{P}/rang23/{n_}"))})
print(f"  · rang23 : types d'erreur des blocs FAIL relus : {ty} (la section ne les chiffre pas ; R1 exigerait AssertionError)")
cib = ["A1", "A2", "A3", "A4", "A5", "A6", "A7", "A8", "A9", "A10", "A13", "B1", "B2"]
ra = {c: bloc_tests(lire(f"{P}/available-on-api/{c}.txt")) for c in cib}
ta = sorted({p for c in cib for p in premieres(lire(f"{P}/available-on-api/{c}.txt"))})
controle("available-on-api : journaux, pré-vols", (len(os.listdir(f"{P}/available-on-api")), len([n_ for n_ in os.listdir(f"{P}/available-on-api") if n_.startswith("pre-vol-")])), (30, 12))
controle("available-on-api : 13 cibles en échec lu, types", (sum(1 for v in ra.values() if v and v[1] > 0), ta), (13, ["AssertionError"]))

# ------------------------------------------------------------------ 6. point 12, étiquettes, échantillonneur
print("== 6. point 12, étiquettes, échantillonneur")
sec = {x[0]: None for x in tab}
for mo in re.finditer(r"^neutralize-(\S+)\.py\s+\d+\s+\S+\s+\d+\s+\d+\s+\d+\s+(\d+)\s*$", ct, re.M):
    sec[mo.group(1)] = int(mo.group(2))
dur = {h: (int(re.search(r"· (\d+) s ·", lire(f"{P}/int-{h}.heures")).group(1)) if PL[h][0] == "--int" else sec[h]) for h in PL}
sous = [h for h in PL if dur[h] < PL[h][1]]
controle("26 campagnes : durée de SA passe ≥ plancher (recalculé)", (len(dur), sous), (26, []), "« 26 au-dessus de leur plancher »")
ratios = sorted((round(dur[h] / PL[h][1], 1), h) for h in PL)
for h, att in (("argon2", (16, 4.44)), ("booking-status", (16, 4.44)), ("available-on", (169, 36.51)), ("journey", (227, 36.57))):
    controle(f"point 12, {h} : durée, plancher", (dur[h], PL[h][1]), att, "« les plus serrés »")
print(f"  · rapports durée / plancher, les six plus bas : {ratios[:6]}")
print(f"  · rang de journey dans cet ordre : {[h for _, h in ratios].index('journey') + 1} sur 26 ; d'available-on : "
      f"{[h for _, h in ratios].index('available-on') + 1}")
lc = lire(f"{P}/lecture-campagnes.txt")
controle("lecture des campagnes : CERTIFIANT", re.search(r"CERTIFIANT : (\d+) mordues · (\d+) muettes · (\d+) non mesurées · (\d+) campagnes qui COMPTENT sur (\d+)", lc).groups(), ("211", "0", "0", "28", "28"))
et = [int(x) for x in re.search(r"ÉTIQUETTES : lue chemin (\d+) · lue hors chemin (\d+) · non prouvée \(R1\) (\d+) · non classée (\d+) · somme (\d+)", lc).groups()]
controle("étiquettes, somme recalculée", (et[:4], sum(et[:4])), ([12, 13, 81, 105], 211), "décision 2c, D313")
lignes = [l.rstrip("\r").split(";") for l in lire(f"{P}/etat.csv").lstrip("﻿").splitlines()[1:] if l.strip()]
q = lambda l: dict(zip(["h", "ram", "cpu", "perf", "alim", "charge", "node", "chrome", "nb"], l))
E = [q(l) for l in lignes]
controle("etat.csv : échantillons, alim, chrome max", (len(E), sorted({e["alim"] for e in E}), max(int(e["chrome"]) for e in E)), (173, ["SECTEUR"], 0))
controle("etat.csv : PERF > 100", sum(1 for e in E if float(e["perf"]) > 100), 154)
creux = [e for e in E if int(e["ram"]) < 4579]
controle("etat.csv : sous la barre 4579, min RAM", (len(creux), min(int(e["ram"]) for e in E)), (7, 3752), "point 7")
h = lambda s: datetime.datetime.strptime(s, "%Y-%m-%d %H:%M:%S")
ecs = [(h(E[i + 1]["h"]) - h(E[i]["h"])).total_seconds() for i in range(len(E) - 1)]
controle("etat.csv : écarts au-delà de 60 s", sum(1 for x in ecs if x > 60), 0, "« 0 trou »")
# ⚠ `.heures` porte « début » et « fin » sur DEUX lignes : la première version de cet instrument cherchait « début … fin »
#   sur une seule et a levé (AttributeError) — défaut d'instrument, rejeu intégral (D298).
e2e = re.search(r"début (\S+ \S+)\s+fin (\S+ \S+)", lire(f"{P}/e2e.heures")).groups()
fe = lambda s: datetime.datetime.strptime(s, "%d/%m/%Y %H:%M:%S")
dans_e2e = [e["h"][11:] for e in creux if fe(e2e[0]) <= h(e["h"]) <= fe(e2e[1])]
controle("creux dans la fenêtre de test:e2e", dans_e2e, ["14:47:44", "14:48:15", "14:48:47"])
debut_tout = fe(re.search(r"début (\S+ \S+)", lire(f"{P}/campagnes-tout.heures")).group(1))
ordre = [mo.group(1) for mo in re.finditer(r"^\[\d+/28\] neutralisation\\neutralize-(\S+)\.py", ct, re.M)]
avant_b7 = sum(sec[x] for x in ordre[:ordre.index("b7")])
fb7 = (debut_tout + datetime.timedelta(seconds=avant_b7), debut_tout + datetime.timedelta(seconds=avant_b7 + sec["b7"]))
controle("fenêtre de b7 dérivée des durées cumulées de --tout", (fb7[0].strftime("%H:%M:%S"), fb7[1].strftime("%H:%M:%S")), ("14:59:08", "15:02:40"))
controle("creux dans la fenêtre de b7", [e["h"][11:] for e in creux if fb7[0] <= h(e["h"]) <= fb7[1]], ["14:59:51", "15:00:54", "15:01:26", "15:02:29"])
controle("creux : node", sorted({int(e["node"]) for e in creux}), [12, 13, 14], "« node 13 à 14 », « 12 à 13 »")
av = lire(f"{P}/aucune-valeur-reelle.txt")
controle("« 0 valeur réelle » : valeurs, fichiers, porteurs", re.search(r"valeurs cherchées : (\d+) .*?parcourus : (\d+) fichiers.*?porteurs : (\d+)", av).groups(), ("24", "1913", "0"))

# ------------------------------------------------------------------ 7. audits et contrôles de clôture
print("== 7. audits de secrets et contrôle de forme Chargily")
AU = {}
for nom in ("audit-secrets-etape0.txt", "audit-secrets-d314.txt", "audit-secrets-final.txt"):
    AU[nom] = re.search(r"parcourus : (\d+) fichiers.*?audités : (\d+) fichiers.*?exclus : (\d+) fichiers.*?alertes : (\d+)", lire(f"{D}/{nom}")).groups()
controle("audit de l'étape 0 : alertes", AU["audit-secrets-etape0.txt"][3], "123")
controle("audit scellé de clôture : parcourus, audités, exclus, alertes", AU["audit-secrets-d314.txt"], ("1839", "1781", "58", "124"))
print(f"  · audit final : parcourus, audités, exclus, alertes = {AU['audit-secrets-final.txt']} (la section ne les chiffre pas)")
ctx = lambda nom: sorted(re.sub(r":\d+ :", ":", l.strip()) for l in lire(f"{D}/{nom}").split("== CONTEXTE DES ALERTES")[1].splitlines() if l.strip().startswith("["))
c1, c2 = ctx("audit-secrets-d314.txt"), ctx("audit-secrets-final.txt")
print(f"  · audit final contre audit de clôture : {len(c1)} et {len(c2)} contextes, identiques (numéros de ligne retirés) : {c1 == c2}")
tr = lire(f"{D}/controles/tri-audit-d314.txt")
controle("tri : neuves, et sa cible", (re.search(r"ABSENTES de la précédente : (\d+)", tr).group(1), "[mot-de-passe] docs/preuves/D314/passe-r23d-20260926-1434/testint.log" in tr), ("1", True))
l721 = lire(f"{D}/audit-secrets-d314.txt").splitlines()[720]
controle("la ligne 721 de l'audit pointe testint.log:255, un titre de test « forgot-password »", ("testint.log:255" in l721, "forgot-password" in l721, "✓" in l721), (True, True, True), "« un mot, pas une valeur »")
for nom, att in (("controle-forme-chargily-cloture.txt", ("306", "0")), ("controle-forme-chargily-etape0.txt", None)):
    m = re.search(r"parcourus : (\d+) fichiers.*porteurs : (\d+)", lire(f"{D}/controles/{nom}")).groups()
    if att:
        controle(f"Chargily ({nom}) : parcourus, porteurs", m, att)
    else:
        print(f"  · Chargily à l'étape 0 : parcourus, porteurs = {m}")

# ------------------------------------------------------------------ 8. passe D277 : la différence de 18, ventilée par région
print("== 8. passe D277")
controle("balayage.py : SHA-256 préfixe, et égal à celui de D313", (sha(f"{D}/passe-d277/balayage.py")[:8], sha(f"{D}/passe-d277/balayage.py") == sha("docs/preuves/D313/passe-d277/balayage.py")), ("24802faf", True))
mo_ = [l.split("|", 1) for l in lire(f"{D}/passe-d277/motifs.txt").splitlines() if l and not l.startswith("#")]
motifs = [(s, m_) for s, m_ in mo_ if not s.startswith("T")]
controle("motifs, témoins", (len(motifs), len(mo_) - len(motifs)), (15, 2))
for nom, att in (("balayage-1.txt", ("115", "0")), ("balayage-apres-ecriture.txt", ("133", "0"))):
    tb = lire(f"{D}/passe-d277/{nom}")
    controle(f"{nom} : occurrences, motifs à zéro", (re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", tb).group(1), re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", tb).group(1)), att)
    controle(f"{nom} : calibration T+, T-", (re.search(r"T\+ .*?: (\d+)", tb).group(1), re.search(r"T- .*?: (\d+)", tb).group(1)), ("20", "0"))
avant = {f: plat(git("show", f"{ETAPE0}:{f}")) for f in AUTORITE}
apres = {f: plat(git("show", f"{FIN}:{f}")) for f in AUTORITE}
controle("corpus aplati : 0057748 = HEAD de balayage-1 ; ffd32e9 = arbre de balayage-après",
         (sum(map(len, avant.values())), sum(map(len, apres.values()))), (1769213, 1791680), "en-têtes des deux balayages")
C = apres["ZWADJ_CONTINUITE.md"]
s0 = C.find("## Session du 26/09/2026 — D314")
s1 = C.find("## Session du 26/09/2026 — D313")
r0 = C.find("| D314 | A | D314 —")
region = lambda i: "section" if s0 <= i < s1 else ("registre" if r0 >= 0 and i >= r0 else "ailleurs")
vent = {"section": 0, "registre": 0}
ailleurs = {}
for s, m_ in motifs:
    na = sum(apres[f].count(m_) for f in AUTORITE)
    nav = sum(avant[f].count(m_) for f in AUTORITE)
    loc = [region(x.start()) for x in re.finditer(re.escape(m_), C)]
    for k in vent:
        vent[k] += loc.count(k)
    dh = na - nav - loc.count("section") - loc.count("registre")
    if dh:
        ailleurs[m_] = dh
controle("différence totale", sum(sum(apres[f].count(m_) for f in AUTORITE) - sum(avant[f].count(m_) for f in AUTORITE) for _, m_ in motifs), 18)
controle("dans la section D314, dans la ligne du registre", (vent["section"], vent["registre"]), (11, 1))
# Où tombent les occurrences de la section : sous quel sous-titre « ### », et avec quel contexte.
for s, m_ in motifs:
    for x in re.finditer(re.escape(m_), C[s0:s1]):
        i = s0 + x.start()
        sous_titre = C.rfind("### ", s0, i)
        print(f"  · section D314, « {m_} » sous « {C[sous_titre:sous_titre + 38]}… » : …{C[max(0, i - 60):i + 40]}…")
controle("écritures de clôture hors section et registre, par motif", ailleurs,
         {"de quelque rang que ce soit": 1, "aucun lot de code": 3, "compteur à ZÉRO": 2})

# ------------------------------------------------------------------ 9. écritures que D314 dit avoir posées
print("== 9. écritures de D314, relues dans les fichiers à ffd32e9")
Ap, Bp = apres["AGENTS.md"], apres["ZWADJ_BACKLOG.md"]
Bb = git("show", f"{FIN}:ZWADJ_BACKLOG.md")
Bav = git("show", f"{ETAPE0}:ZWADJ_BACKLOG.md")
controle("titre du point d'entrée : « CLOS LE 26/09/2026 : D314 »", "⛔ CLOS LE 26/09/2026 : D314 — CERTIFICATION PASSÉE, MARQUE POSÉE, COMPTEUR À ZÉRO" in C, True)
controle("ordre des rangs : ligne D314", "(D314, 26/09/2026) RANG 23 — LA CERTIFICATION : MARQUE POSÉE, LE RANG 23 EST CLOS." in C, True)
controle("sous le rang 24 : annotation D314 (permission, hors chemin de l'argent)", "(D314, 26/09/2026 — passe D277, sens 2 : **la certification est PASSÉE, le rang 23 est CLOS, compteur à ZÉRO**" in C, True)
controle("dernière ligne « ⇒ RANG N » de l'ordre : RANG 24 EN ATTENTE", C.count("⇒ **RANG 24 : EN ATTENTE D'ARBITRAGE DE KO** (D284)"), 1)
controle("registre : ligne D314, dernière ligne", bool(re.search(r"^\| D314 \| A \| D314 — ", git("show", f"{FIN}:ZWADJ_CONTINUITE.md").rstrip().splitlines()[-1])), True)
controle("AGENTS.md : deux annotations D314 (règle de D270, point E3)",
         ("(D314, 26/09/2026 : **certification PASSÉE**" in Ap, "(D314, 26/09/2026 : **la certification a eu lieu et elle est PASSÉE**" in Ap), (True, True))
f1f5 = lambda t, k: re.search(rf"^- \[(.)\] \*\*\[API\]\*\*.{{0,40}}audit SOLID 09/09 · {k}\b", t, re.M)
controle("backlog : F1 et F5, ouvertes à l'étape 0, closes à la clôture",
         ((f1f5(Bav, "F1").group(1), f1f5(Bav, "F5").group(1)), (f1f5(Bb, "F1").group(1), f1f5(Bb, "F5").group(1))), ((" ", " "), ("x", "x")))
controle("backlog : section des reports de D314", "## Reports du 26/09/2026 — rang 23 CLOS, la certification (D314)" in Bb, True)
rep = Bb.split("## Reports du 26/09/2026 — rang 23 CLOS, la certification (D314)")[1].split("\n## ")[0]
controle("reports de D314 : entrées ouvertes, chacune avec BLOQUE et COÛT (forme de D302)",
         [(("⇒ **BLOQUE" in e) and ("⇒ **COÛT**" in e)) for e in re.split(r"\n- \[ \] ", rep)[1:]], [True, True])
autres_d314 = [x.start() for x in re.finditer(r"D314", Bp)]
print(f"  · « D314 » dans le backlog aplati : {len(autres_d314)} occurrences (reports de D314 compris) — parcouru")

# ------------------------------------------------------------------ 10. ce que la clôture a SUPPRIMÉ : barré ou annoté, jamais effacé (D276)
print("== 10. lignes supprimées par la clôture : leur texte survit-il ?")
# ⚠ DÉFAUT DE LA PREMIÈRE VERSION, RÉPARÉ, REJEU INTÉGRAL (D298) : elle testait l'INCLUSION de l'ancienne ligne dans les
#   lignes ajoutées. Une annotation insérée AU MILIEU d'une ligne (« pas** ⛔ *(D314 …)*. ») casse l'inclusion sans que rien
#   soit perdu — neuf faux « perdus », démentis par `git diff --word-diff` (cinq jetons retirés, tous barrés ou prolongés).
#   Le contrôle aligne maintenant caractère par caractère (difflib, sans heuristique de rebut) et ne retient que ce que
#   l'ancien texte PERD, blancs et balisage `*` `~` retirés. Calibré sur ses deux bras ci-dessous.
import difflib


def perdu(ancien: str, nouveau: str) -> str:
    a, n_ = plat(ancien).strip(), plat(nouveau).strip()
    ops = difflib.SequenceMatcher(None, a, n_, autojunk=False).get_opcodes()
    return re.sub(r"[\s*~]", "", "".join(a[i1:i2] for t_, i1, i2, _, _ in ops if t_ in ("delete", "replace")))


controle("calibration, bras positif : un mot retiré est vu", perdu("le rang reste ouvert", "le rang ouvert"), "reste", "cas connu")
controle("calibration, bras négatif : barré + annotation insérée au milieu, rien de perdu",
         perdu("ne commence pas**. ⇒ suite", "ne commence ~~pas~~** ⛔ *(D314 : elle commence)*. ⇒ suite"), "", "cas connu")
perdus, vus, datees = [], 0, []
for f in ("AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"):
    diff = git("diff", "-U0", ETAPE0, FIN, "--", f)
    ancien = git("show", f"{ETAPE0}:{f}").splitlines()
    for bloc in re.split(r"^@@ ", diff, flags=re.M)[1:]:
        tete, _, corps = bloc.partition("\n")
        debut = int(re.match(r"-(\d+)", tete).group(1))
        moins = [l[1:] for l in corps.splitlines() if l.startswith("-") and not l.startswith("---")]
        plus = " ".join(l[1:] for l in corps.splitlines() if l.startswith("+") and not l.startswith("+++"))
        p_ = perdu(" ".join(moins), plus)
        vus += len(moins)
        if p_:
            perdus.append((f, debut, p_[:120]))
        for k, l in enumerate(moins):
            if f == "ZWADJ_CONTINUITE.md":
                titre = next((ancien[j] for j in range(debut + k - 1, -1, -1) if ancien[j].startswith("## ")), "")
                if re.match(r"## (Session|Incident)", titre):
                    datees.append((debut + k, titre[:70]))
print(f"  · parcouru : {vus} lignes supprimées")
controle("lignes supprimées dont le texte (hors ~~) ne survit pas dans le même bloc", perdus, [], "D276 : barré, pas effacé")
controle("lignes supprimées dans une section DATÉE de ZWADJ_CONTINUITE.md", datees, [], "« aucune section datée réécrite »")

print(f"\n{controles} contrôles · {ecarts} écart(s) (attendu : ce que la lecture trouve — chaque ✗ se lit à son contexte)")
