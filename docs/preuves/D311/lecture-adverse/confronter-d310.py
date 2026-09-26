"""D311 — LECTURE ADVERSE DE D310 : ses chiffres confrontés à SES pièces, au disque et au dépôt. Pièce jetable, versée.
N'écrit rien : elle imprime. Chaque contrôle imprime l'attendu À CÔTÉ du mesuré (D290) et, quand il compte, ce qu'il a
parcouru. Les attendus sont ceux que la SECTION D310 (et son étape 0) écrivent — recopiés de la section pour être
confrontés, jamais de mémoire. Un constat sans chiffre de la section s'imprime « · », il n'entre pas au compte des écarts.
Usage, depuis la racine :  python docs/preuves/D311/lecture-adverse/confronter-d310.py
"""
import hashlib
import os
import re
import subprocess
import sys
from datetime import datetime, timedelta

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

ANSI = re.compile(r"\x1b\[[0-9;]*m")
D = "docs/preuves/D310"
ID = "r23c-20260926-0032"
P = f"{D}/passe-{ID}"
SRC = f".neutralisation-journaux/{ID}"
ecarts, controles = 0, 0


def lire(chemin: str) -> str:
    return ANSI.sub("", open(chemin, "rb").read().decode("utf-8", errors="replace"))


def controle(nom: str, mesure, attendu) -> None:
    global ecarts, controles
    controles += 1
    ok = mesure == attendu
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {nom} : mesuré {mesure!r} (attendu, section D310 : {attendu!r})")


def code(chemin: str) -> int:
    return int(open(chemin, "rb").read().decode().strip())


def git(*args: str) -> str:
    return subprocess.run(["git", *args], capture_output=True, text=True, encoding="utf-8").stdout


def fichiers(racine: str) -> set:
    out = set()
    for a, _, ns in os.walk(racine):
        for n in ns:
            out.add(os.path.relpath(os.path.join(a, n), racine).replace("\\", "/"))
    return out


# ------------------------------------------------------------------ 1. le dossier de SA passe
print("== 1. pièces de la passe")
suivis = [l for l in git("ls-files", P).splitlines() if l]
controle("fichiers suivis dans le dossier de la passe", len(suivis), 129)
print("  · la section écrit « 127 pièces relues identiques » : 127 versées par verser.py + 2 produites APRÈS "
      "(extrait e2e, « 0 valeur réelle ») — confronté ci-dessous si la source est encore sur disque")
if os.path.isdir(SRC):
    s, d = fichiers(SRC), fichiers(P)
    communs = s & d
    ident = sum(hashlib.sha256(open(f"{SRC}/{x}", "rb").read()).digest()
                == hashlib.sha256(open(f"{P}/{x}", "rb").read()).digest() for x in communs)
    controle("source sur disque : communs identiques par SHA-256", (ident, len(communs)), (127, 127))
    controle("source seule (refusé : journal e2e brut)", sorted(s - d), ["e2e.log"])
    controle("destination seule (produites après versement)", sorted(d - s), ["aucune-valeur-reelle.txt", "e2e-EXTRAIT.txt"])
else:
    print("  · source absente du disque : l'identité 127/127 n'est pas rejouable")

# ------------------------------------------------------------------ 2. prérequis, ouverture, sondes
print("== 2. prérequis et relevés de sonde")
controle("pg_isready à l'ouverture", "accepting connections" in lire(f"{P}/pg-ouverture.txt"), True)
controle("ports à l'écoute à l'ouverture (lignes)", len([l for l in lire(f"{P}/ports-ouverture.txt").splitlines() if l.strip()]), 0)
controle("porte dure", lire(f"{P}/porte-dure.txt").strip(), "VERTE")
o1, o2 = lire(f"{P}/sonde-ouverture-1.txt"), lire(f"{P}/sonde-ouverture-2.txt")
m = re.search(r"rendement ([\d.]+)", o1)
controle("ouverture-1 : rendement", m.group(1) if m else None, "0.94")
controle("ouverture-1 : calibration ✓", "✓ les deux instruments separent" in o1, True)


def champ(t: str, cle: str):
    m = re.search(rf"^{cle}=([^\s]+)", t, re.M)
    return m.group(1) if m else None


controle("ouverture-1 : RAM médiane, bande", (champ(o1, "RAM_MEDIANE_MO"), champ(o1, "RAM_BANDE_MO")), ("6393", "6317-6473"))
controle("ouverture-2 : RAM médiane, bande", (champ(o2, "RAM_MEDIANE_MO"), champ(o2, "RAM_BANDE_MO")), ("6487", "6478-6494"))
controle("barre imprimée", champ(o1, "BARRE_D273_MO"), "4579")
sondes = sorted(n for n in os.listdir(P) if n.startswith("sonde-"))
controle("relevés de sonde", len(sondes), 17)
basse, ou, hors = None, None, []
for n in sondes:
    t = lire(f"{P}/{n}")
    med = float(champ(t, "RAM_MEDIANE_MO"))
    bb = float(champ(t, "RAM_BANDE_MO").split("-")[0])
    barre = float(champ(t, "BARRE_D273_MO"))
    if (champ(t, "ALIM_SOURCE"), champ(t, "CHROME"), champ(t, "NODE")) != ("SECTEUR", "0", "0") or med < barre or bb < barre:
        hors.append(n)
    if basse is None or bb < basse:
        basse, ou = bb, n
controle("sondes hors (SECTEUR, chrome 0, node 0, médiane et bande basse ≥ barre)", hors, [])
controle("bande basse la plus basse, et où", (basse, ou), (5817.0, "sonde-avant-int-s11b.txt"))
for i in range(1, 6):
    t = lire(f"{P}/arbre-{i}.txt")
    etat = re.search(r"HEAD (\w+)", t).group(1)[:7], len(t.split("(vide exigé)")[1].split("--- fin")[0].strip().splitlines())
    controle(f"arbre-{i} : HEAD, lignes de statut", etat, ("1e949c3", 0))

# ------------------------------------------------------------------ 3. portes
print("== 3. portes")
for nom in ("typecheck", "lint", "test", "build", "testint", "e2e"):
    controle(f"{nom} code", code(f"{P}/{nom}.code"), 0)


def resumes(t: str):
    fic = [(int(b), int(c)) for _, b, c in re.findall(r"Test Files\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)", t)]
    tst = [(int(b), int(c)) for _, b, c in re.findall(r"Tests\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)", t)]
    return fic, tst


for nom, done in (("typecheck", 8), ("lint", 8), ("build", 4)):
    t = lire(f"{P}/{nom}.log")
    controle(f"{nom} « Done »", len(re.findall(r"\bDone\b", t)), done)
controle("typecheck « error TS »", lire(f"{P}/typecheck.log").count("error TS"), 0)
fic, tst = resumes(lire(f"{P}/test.log"))
controle("test : fichiers par paquet", fic, [(58, 58), (3, 3), (20, 20), (28, 28)])
controle("test : tests par paquet", tst, [(664, 664), (36, 36), (287, 287), (347, 347)])
controle("test : totaux", (sum(a for a, _ in tst), sum(a for a, _ in fic)), (1334, 109))
fic, tst = resumes(lire(f"{P}/testint.log"))
controle("test:int", (tst, fic), ([(443, 443)], [(36, 36)]))
ft, fi = lire(f"{P}/test.log"), lire(f"{P}/testint.log")
fl = [l for l in ft.splitlines() if "fail" in l.lower()]
controle("test : lignes « fail » (toute casse), toutes ChargilyGateway", (len(fl), all("ChargilyGateway" in l for l in fl)), (2, True))
fl = [l for l in fi.splitlines() if "fail" in l.lower()]
controle("test:int : lignes « fail », le nom d'un test vert", (len(fl), all("passe FAILED" in l for l in fl)), (1, True))
for nom in ("test", "testint", "typecheck", "lint", "build"):
    t = lire(f"{P}/{nom}.log")
    controle(f"{nom} : FAIL casse exacte · ELIFECYCLE · timed out",
             (len(re.findall(r"\bFAIL\b", t)), t.count("ELIFECYCLE"), t.lower().count("timed out")), (0, 0, 0))
e = lire(f"{P}/e2e-EXTRAIT.txt")
m = re.search(r"lignes parcourues : (\d+) \(attendu (\d+).*gardées : (\d+)", e)
controle("e2e extrait : parcourues, attendu, gardées", m.groups() if m else None, ("831", "831", "38"))
controle("e2e extrait : passés / ignorés", (re.search(r"^\d+ \|\s+(\d+) passed", e, re.M).group(1),
                                            re.search(r"^\d+ \|\s+(\d+) skipped", e, re.M).group(1)), ("34", "1"))
m = re.search(r"lignes « fail » du journal : (\d+)", e)
controle("e2e extrait : lignes « fail »", m.group(1) if m else None, "0")
controle("e2e extrait : « token= »", e.count("token="), 0)
brut = f"{SRC}/e2e.log"
if os.path.isfile(brut):
    b = open(brut, "rb").read()
    controle("e2e brut sur disque : LF comptés sur les OCTETS", b.count(b"\n"), 831)
else:
    print("  · journal e2e brut absent du disque : le recompte sur les octets n'est pas rejouable")

# ------------------------------------------------------------------ 4. campagnes
print("== 4. campagnes")
controle("--tout code", code(f"{P}/campagnes-tout.code"), 1)
t = lire(f"{P}/campagnes-tout.log")
m = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) campagne\(s\) · (\d+)s", t)
controle("--tout ligne MESURÉ", m.groups() if m else None, ("198", "0", "13", "28", "2807"))
table = dict((n, cols.split()) for n, cols in re.findall(r"^(neutralize-[\w-]+\.py)\s+(\d+\s+\S+\s+\d+\s+\d+\s+\d+\s+\d+)\s*$", t, re.M))
controle("--tout : lignes de table", len(table), 28)
controle("--tout : available-on-api (sortie décl mord muet nonm sec)", table.get("neutralize-available-on-api.py"), ["0", "—", "13", "0", "0", "0"])
controle("--tout : somme des mordues de la table", sum(int(c[2]) for c in table.values()), 198)
controle("journaux copiés : campagnes/ + rang23/", (len(os.listdir(f"{P}/campagnes")), len(os.listdir(f"{P}/rang23"))), (28, 15))
prog = lire(f"{P}/progression.txt")
controle("progression : copiés, antérieurs", re.search(r"copiés à l'identique : (\d+) sur (\d+) · antérieurs au début de --tout : (\d+)", prog).groups(), ("43", "43", "0"))
ints = {}
for h in ("e3d1-s8", "s11b", "solid-s1", "solid-s2", "solid-s3", "solid-s6"):
    lt = lire(f"{P}/int-{h}.log")
    m = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", lt)
    ints[h] = (code(f"{P}/int-{h}.code"), int(m.group(1)) if m else None, int(m.group(2)) if m else None)
controle("--int : (code, mordues, cibles) par harnais", ints,
         {"e3d1-s8": (0, 8, 8), "s11b": (0, 13, 13), "solid-s1": (0, 2, 2), "solid-s2": (0, 5, 5), "solid-s3": (0, 6, 6), "solid-s6": (0, 6, 6)})
controle("--int : total", sum(v[1] for v in ints.values()), 40)
ce = lire(f"{P}/contre-epreuve.log")
controle("contre-épreuve : code, mordues", (code(f"{P}/contre-epreuve.code"), re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ce).groups()), (0, ("5", "5")))
lc = lire(f"{P}/lecture-campagnes.txt")
m = re.search(r"CERTIFIANT : (\d+) mordues · (\d+) muettes · (\d+) non mesurées · (\d+) campagnes qui COMPTENT sur (\d+)", lc)
controle("lecture-campagnes (le lecteur de D310, aveugle à la classe — faute n° 2)", m.groups() if m else None, ("211", "0", "0", "28", "28"))
m = re.search(r"LUES (\d+) · code de sortie seul, non prouvées \(R1\) (\d+) · hors chemin (\d+)", lc)
controle("lecture-campagnes : R1", m.groups() if m else None, ("12", "79", "120"))
lr = lire(f"{P}/lecture-rang23.txt")
controle("lecture-rang23", re.search(r"MESURES LUES : (\d+) · MORSURES LUES : (\d+)", lr).groups(), ("13", "13"))

# ------------------------------------------------------------------ 5. échantillonneur, point 7
print("== 5. échantillonneur")
lignes = [l.split(";") for l in lire(f"{P}/etat.csv").lstrip("\ufeff").splitlines()[1:] if l.strip()]
controle("échantillons parcourus (CSV)", len(lignes), 170)
controle("alimentation, chrome max", (sorted({l[4] for l in lignes}), max(int(l[7]) for l in lignes)), (["SECTEUR"], 0))
controle("PERF > 100", sum(float(l[3]) > 100 for l in lignes), 152)
sous = [(l[0][11:], int(l[1]), int(l[6]), int(l[7])) for l in lignes if int(l[1]) < 4579]
controle("creux sous la barre : nombre, minimum", (len(sous), min(r for _, r, _, _ in sous)), (7, 4158))
controle("creux : chrome", sorted({c for *_, c in sous}), [0])
e2e_h = re.findall(r"(\d\d:\d\d:\d\d)", lire(f"{P}/e2e.heures"))
debut_tout = datetime.strptime(re.findall(r"(\d\d:\d\d:\d\d)", lire(f"{P}/campagnes-tout.heures"))[0], "%H:%M:%S")
# Fenêtre de b7 DÉRIVÉE de la table : les campagnes tournent en série, dans l'ordre de la table.
cumul = debut_tout
fenetres = {}
for nom, cols in table.items():
    fin = cumul + timedelta(seconds=int(cols[5]))
    fenetres[nom] = (cumul.strftime("%H:%M:%S"), fin.strftime("%H:%M:%S"))
    cumul = fin
b7 = fenetres["neutralize-b7.py"]
dans_e2e = [h for h, *_ in sous if e2e_h[0] <= h <= e2e_h[1]]
dans_b7 = [h for h, *_ in sous if b7[0] <= h <= b7[1]]
print(f"  · fenêtre e2e {e2e_h[0]} → {e2e_h[1]} · fenêtre b7 DÉRIVÉE de la table {b7[0]} → {b7[1]} (secondes entières : ±1 s par campagne)")
controle("creux sous test:e2e / sous b7", (len(dans_e2e), len(dans_b7)), (3, 4))
controle("node des creux, dans l'ordre", [n for _, _, n, _ in sous], [14, 15, 13, 12, 13, 12, 1])

# ------------------------------------------------------------------ 6. l'échec : available-on-api
print("== 6. l'échec")
src = open("neutralisation/neutralize-available-on-api.py", encoding="utf-8").read().splitlines()
bloc = "\n".join(src[174:232])
controle("l. 175-232 : binaire relatif, cwd apps/api, sortie capturée",
         ('_binaire("apps/api/node_modules/.bin/vitest")' in bloc, 'cwd="apps/api"' in bloc, "capture_output=True" in bloc), (True, True, True))
controle("pré-vol dans le harnais (« pré-vol »/« pre-vol » dans le source)", any("pré-vol" in l.lower() or "pre-vol" in l.lower() for l in src[150:]), False)
rp = lire(f"{D}/aoa/repro-aoa-13-sortie.txt")
a = re.findall(r"^\s+\S+\s+\(a\) code (\d+) en\s+([\d.]+) s · (.*)$", rp, re.M)
b = re.findall(r"^\s+\S+\s+\(b\) code (\d+) en\s+[\d.]+ s · Tests\s+(\d+) passed", rp, re.M)
controle("repro (a) : 13 × code 1 en 0.02 s, « 'apps' is not recognized »",
         (len(a), {c for c, _, _ in a}, {s for _, s, _ in a}, all("'apps' is not recognized" in x for *_, x in a)), (13, {"1"}, {"0.02"}, True))
controle("repro (b) : 13 × code 0, tests passés", (len(b), {c for c, _ in b}, sum(int(n) for _, n in b)), (13, {"0"}, 15))
if os.path.isfile(".neutralisation-journaux/neutralize-argon2.py.log"):
    ta = os.stat(".neutralisation-journaux/neutralize-argon2.py.log").st_mtime
    tb = os.stat(".neutralisation-journaux/neutralize-available-on-api.py.log").st_mtime
    controle("écart d'écriture argon2 → available-on-api sur disque, s (arrondi 0,01)", round(tb - ta, 2), 0.35)
for pc, ln in (("docs/preuves/D293/passe/rang15-campagnes-tout.log", 86),
               ("docs/preuves/D299/passe-1-interrompue/rang19-campagnes-tout.log", 89),
               ("docs/preuves/D299/passe/rang19-p2-campagnes-tout.log", 89)):
    l = lire(pc).splitlines()[ln - 1].split()
    controle(f"{pc}:{ln}", l, ["neutralize-available-on-api.py", "0", "—", "13", "0", "0", "0"])
controle("« 195 était 182 » · « 199 était 186 »", (195 - 13, 199 - 13), (182, 186))
# ⚠ CE QUE LA SECTION NE DIT PAS : les 26 journaux attribués à D288 ont été versés par D293 AVEC leur horodatage.
inv = lire("docs/preuves/D293/versement-d288/verser-et-confronter.txt")
h = dict(re.findall(r"✓ (neutralize-[\w-]+\.py)\.log\s+\d{4}-\d\d-\d\d (\d\d:\d\d:\d\d)", inv))
print(f"  · D288 (versement de D293) : argon2 {h.get('neutralize-argon2.py')} · available-on-api "
      f"{h.get('neutralize-available-on-api.py')} · available-on {h.get('neutralize-available-on.py')} "
      f"— la section écrit D288 « inféré, pas mesuré » : ✗ CONSTAT (même seconde qu'argon2)")
controle("D288 : horodatage d'available-on-api = celui d'argon2 (à la seconde) — CONSTAT, la section dit « inféré »",
         h.get("neutralize-available-on-api.py") == h.get("neutralize-argon2.py"), False)
lg = git("log", "--format=%h", "--", "neutralisation/neutralize-available-on-api.py").split()
controle("historique du harnais", lg, ["538b014", "db1fe38"])
diff = [l for l in git("show", "538b014", "--", "neutralisation/neutralize-available-on-api.py").splitlines()
        if l[:1] in ("+", "-") and not l.startswith(("+++", "---"))]
# ⚠ DÉFAUT DE CET INSTRUMENT, CORRIGÉ ET REJOUÉ EN ENTIER (règle de D298) : la première écriture portait
#   `l[:1] in "+-"` — la chaîne VIDE est contenue dans toute chaîne, les lignes vides passaient, et l'indexation
#   levait. Il a levé, il n'a pas répondu : c'est le bon côté de D275.
controle("538b014 : seulement l'encodage (lignes ajoutées, retirées)", (sum(l[0] == "+" for l in diff), sum(l[0] == "-" for l in diff),
                                                                    any("reconfigure" in l for l in diff)), (9, 0, True))

# ------------------------------------------------------------------ 7. séparation, énumération, marque
print("== 7. séparation et énumération")
ds = lire(f"{D}/outils/declarees-sortie.txt")
controle("déclarées", re.search(r"TOTAL DÉCLARÉ : (\d+) cibles sur (\d+) harnais", ds).groups(), ("211", "28"))
controle("chemin de l'argent : cibles", re.search(r"CHEMIN DE L'ARGENT : .* — (\d+) cibles", ds).group(1), "91")
parts = {"booking-status": 3, "e3d1-s8": 8, "r4": 2, "s10b": 20, "s11b": 13, "solid-s3": 6, "solid-s4": 7, "solid-s5a": 9, "solid-s5b": 5, "solid-s6": 6}
controle("code de sortie seul (R1) : somme de la table", sum(parts.values()), 79)
controle("12 + 79 + 107 + 13", 12 + 79 + 107 + 13, 211)
comm = git("rev-list", "--reverse", "0a8235d^..2ed88de").split()
avec = []
for c in comm:
    hors = [f for f in git("show", "--name-only", "--format=", c).splitlines()
            if f and not f.startswith("docs/preuves/") and f not in ("AGENTS.md", "CLAUDE.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md")]
    if hors:
        avec.append(c[:7])
controle("étape 0 : commits depuis 0a8235d (bornes incluses), dont hors .md/preuves", (len(comm), avec), (11, ["b715943", "3ac8749"]))
for c in ("1e949c3", "94d8c50"):
    hors = [f for f in git("show", "--name-only", "--format=", c).splitlines() if f and not f.startswith("docs/preuves/")]
    controle(f"{c} : fichiers hors docs/preuves/", sorted(hors), ["ZWADJ_CONTINUITE.md"] if c == "1e949c3" else ["ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md"])

# ------------------------------------------------------------------ 8. clôture
print("== 8. clôture")
av = lire(f"{P}/aucune-valeur-reelle.txt")
controle("« 0 valeur réelle »", re.search(r"valeurs cherchées : (\d+) .* parcourus : (\d+) fichiers.* porteurs : (\d+)", av).groups(), ("24", "1510", "0"))
ch = lire(f"{D}/controles/controle-forme-chargily-sortie.txt")
controle("forme Chargily : porteurs", re.search(r"porteurs : (\d+)", ch).group(1), "0")
RE_AUDIT = r"parcourus : (\d+) fichiers.*audités : (\d+) fichiers.*exclus : (\d+) fichiers.*alertes : (\d+)"
m = re.search(RE_AUDIT, lire(f"{D}/audit-secrets-d310.txt"))
controle("audit-secrets-d310.txt : parcourus, audités, exclus, alertes", m.groups() if m else None, ("1433", "1385", "48", "118"))
# La section ne chiffre PAS l'audit final (« ses chiffres sont dans sa sortie ») : constat, hors du compte des écarts.
m = re.search(RE_AUDIT, lire(f"{D}/audit-secrets-final.txt"))
print(f"  · audit-secrets-final.txt (non chiffré par la section) : parcourus, audités, exclus, alertes {m.groups() if m else None}"
      f" · parcourus = audités + exclus : {int(m.group(1)) == int(m.group(2)) + int(m.group(3)) if m else None}")
tr = lire(f"{D}/controles/tri-audit-d310.txt")
controle("tri : contextes précédente → nouvelle, neuves", re.search(r"précédente \S+ \((\d+) contextes\) · nouvelle \S+ \((\d+) contextes\)", tr).groups()
         + (re.search(r"ABSENTES de la précédente : (\d+)", tr).group(1),), ("117", "118", "1"))
b1, b2 = lire(f"{D}/passe-d277/balayage-1.txt"), lire(f"{D}/passe-d277/balayage-apres-ecriture.txt")
controle("passe D277 : occurrences, motifs à zéro (1re passe · après écriture)",
         [re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", x).group(1) for x in (b1, b2)]
         + [re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", x).group(1) for x in (b1, b2)], ["82", "82", "1", "1"])

# ------------------------------------------------------------------ 9. constats sans chiffre de la section
print("== 9. annotations que D310 dit avoir posées, et constats")
cont = open("ZWADJ_CONTINUITE.md", encoding="utf-8").read()
plat = re.sub(r"\s+", " ", cont)
# « Les blocs de clôture des rangs 12, 15 et 19 et la ligne D299 de l'ordre des rangs portent une annotation » (D310).
# Bloc de rang = du titre « ## ~~PROCHAIN LOT~~ — rang N » au titre `##` suivant ; ligne D299 = son paragraphe de l'ordre.
lignes_md = cont.splitlines()


def bloc(titre_debut: str) -> str:
    i = next(k for k, l in enumerate(lignes_md) if l.startswith(titre_debut))
    j = next(k for k in range(i + 1, len(lignes_md)) if lignes_md[k].startswith("## "))
    return "\n".join(lignes_md[i:j])


for n in (12, 15, 19):
    b = bloc(f"## ~~PROCHAIN LOT~~ — rang {n} ")
    controle(f"bloc du rang {n} : annotation D310 présente", "(D310" in b, True)
i = next(k for k, l in enumerate(lignes_md) if "(D299, 22/09/2026) RANG 19 CLOS" in l)
controle("ordre des rangs, ligne D299 : annotation D310 présente", "(D310" in "\n".join(lignes_md[i:i + 4]), True)
print("  · « R1 ne le couvre pas » (section D310) — et le cadrage de R1, § 1, portée : "
      f"{'`available-on-api`' in plat.split('Portée** : les **20** harnais relevés par D303')[1][:80] if 'Portée** : les **20** harnais relevés par D303' in plat else '?'}"
      " (le nom est dans la liste des 20 — décision 4 du relecteur, D304)")

print(f"\n{controles} contrôles · {ecarts} écart(s) — un ✗ n'est un écart de D310 qu'après lecture de son contexte ci-dessus")
