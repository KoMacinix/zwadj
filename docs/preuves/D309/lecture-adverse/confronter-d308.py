"""D309 — LECTURE ADVERSE DE D308 : ses chiffres confrontés à SES pièces et au dépôt. Pièce jetable, versée.
N'écrit rien : elle imprime. Chaque contrôle imprime l'attendu À CÔTÉ du mesuré (D290) et ce qu'il a parcouru.
Les attendus sont ceux que la SECTION D308 écrit — recopiés de la section, pour être confrontés, jamais de mémoire.
Usage, depuis la racine :  python docs/preuves/D309/lecture-adverse/confronter-d308.py
"""
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
P = "docs/preuves/D308"
ecarts = 0
controles = 0


def lire(chemin: str) -> str:
    return ANSI.sub("", open(chemin, "rb").read().decode("utf-8", errors="replace"))


def controle(nom: str, mesure, attendu) -> None:
    global ecarts, controles
    controles += 1
    ok = mesure == attendu
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {nom} : mesuré {mesure!r} (attendu, section D308 : {attendu!r})")


def code(chemin: str) -> int:
    return int(open(chemin, "rb").read().decode().strip())


def vitest(chemin: str):
    """(fichiers passés, fichiers total, tests passés, tests total) par bloc de résumé, dans l'ordre."""
    t = lire(chemin)
    fic = re.findall(r"Test Files\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)", t)
    tst = re.findall(r"Tests\s+(?:(\d+) failed \| )?(\d+) passed \((\d+)\)", t)
    return [(int(b), int(c)) for _, b, c in fic], [(int(b), int(c)) for _, b, c in tst]


# ---------------------------------------------------------------- 1. « Vert » : unitaire 24/24, intégration 50/50
print("== 1. vert/")
for nom, att in (("unit-transitions", (24, 24)), ("int-reservations", (50, 50))):
    _, tst = vitest(f"{P}/vert/{nom}.txt")
    controle(f"vert/{nom} tests", tst, [att])
    controle(f"vert/{nom} code", code(f"{P}/vert/{nom}.txt.code"), 0)

# ---------------------------------------------------------------- 2. Portes
print("== 2. portes/")
for nom in ("typecheck", "lint", "test", "build", "test-int"):
    controle(f"porte {nom} code", code(f"{P}/portes/{nom}.log.code"), 0)
controle("porte test-e2e code", code(f"{P}/portes/test-e2e.code"), 0)
fic, tst = vitest(f"{P}/portes/test.log")
controle("test : fichiers par paquet", fic, [(58, 58), (3, 3), (20, 20), (28, 28)])
controle("test : tests par paquet", tst, [(664, 664), (36, 36), (287, 287), (347, 347)])
fic, tst = vitest(f"{P}/portes/test-int.log")
controle("test:int fichiers", fic, [(36, 36)])
controle("test:int tests", tst, [(443, 443)])
m = re.search(r"Duration\s+([\d.]+)s", lire(f"{P}/portes/test-int.log"))
controle("test:int durée", m.group(1) if m else None, "302.77")
e = lire(f"{P}/portes/test-e2e-extrait.txt")
controle("e2e passés", re.findall(r"^\s+(\d+) passed \(([\d.]+m)\)", e, re.M), [("34", "2.1m")])
controle("e2e ignorés", re.findall(r"^\s+(\d+) skipped", e, re.M), ["1"])
m = re.search(r"complet : (\d+) octets, (\d+) lignes", e)
controle("e2e extrait : lignes annoncées du complet", int(m.group(2)) if m else None, 822)
m = re.search(r"retirées : (\d+) lignes .*gardées : (\d+)", e)
controle("e2e extrait : retirées", int(m.group(1)) if m else None, 665)
# ⚠ Ce que la section ne dit pas : le complet, s'il est encore sur disque, recompté sur les OCTETS (D294).
complet = ".neutralisation-journaux/d308/test-e2e-complet.log"
if os.path.isfile(complet):
    b = open(complet, "rb").read()
    sha = hashlib.sha256(b).hexdigest()
    print(f"  · complet sur disque : {len(b)} octets, sha256 {sha[:16]}… (annoncé dans l'extrait : "
          f"{re.search(r'sha256 ([0-9a-f]+)', e).group(1)[:16]}…) · LF {b.count(bytes([10]))} · finit par LF "
          f"{b.endswith(bytes([10]))} · éléments de split {len(b.split(bytes([10])))}")
    controle("e2e complet : LIGNES réelles (LF comptés sur les octets) = lignes annoncées",
             b.count(bytes([10])), 822)
else:
    print("  · complet absent du disque : le recompte sur les octets n'est pas rejouable")

# ---------------------------------------------------------------- 3. Campagnes : codes et comptes
print("== 3. campagnes/")
attendus = {
    "campagne-rang23.txt": (0, r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ("12", "12")),
    "campagne-solid-s5b.txt": (0, r"(\d+) garde\(s\) neutralisée\(s\) et ROUGE\(s\)", ("5",)),
    "campagne-s11b-int.txt": (0, r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ("13", "13")),
    "campagne-solid-s6-int.txt": (0, r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ("6", "6")),
    "campagne-solid-s6.txt": (3, r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ("2", "2")),
    "campagne-solid-s3-int.txt": (0, r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ("6", "6")),
    "campagne-solid-s1-int.txt": (0, r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ("2", "2")),
    "campagne-solid-s2-int.txt": (0, r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible", ("5", "5")),
}
for nom, (c, motif, att) in attendus.items():
    t = lire(f"{P}/campagnes/{nom}")
    m = re.search(motif, t)
    controle(f"{nom} code", code(f"{P}/campagnes/{nom}.code"), c)
    controle(f"{nom} compte", m.groups() if m else None, att)
t = lire(f"{P}/campagnes/campagne-solid-s6.txt")
controle("solid-s6 sans --int : non mesurées", len(re.findall(r"^\s+NON MESURÉE : ", t, re.M)), 4)
for s in ("s1", "s2", "s3"):
    t = lire(f"{P}/campagnes/campagne-solid-{s}.txt")
    controle(f"solid-{s} sans --int : code", code(f"{P}/campagnes/campagne-solid-{s}.txt.code"), 0)
    print(f"  · solid-{s} sans --int annonce l'intégration non exécutée : "
          f"{'INTÉGRATION' in t.upper() and 'NON EXÉCUT' in t.upper()}")
t = lire(f"{P}/campagnes/lecture-rang23.txt")
m = re.search(r"MESURES LUES : (\d+) · MORSURES LUES : (\d+)", t)
controle("lecture-rang23", m.groups() if m else None, ("13", "13"))
controle("lecture-rang23 : lignes « échecs de fichier 0 »", len(re.findall(r"échecs de fichier 0 ", t)), 13)
# La passe citée : les journaux rang23/ sont-ils d'UNE passe ? (point 3 de Ko, D309)
heures = []
for f in sorted(os.listdir(f"{P}/campagnes/rang23")):
    m = re.search(r"Start at\s+(\d\d:\d\d:\d\d)", lire(f"{P}/campagnes/rang23/{f}"))
    heures.append((m.group(1) if m else "?", f))
heures.sort()
print(f"  · rang23/ : {len(heures)} journaux, de {heures[0][0]} ({heures[0][1]}) à {heures[-1][0]} ({heures[-1][1]})")
controle("rang23/ : journaux versés", len(heures), 15)

# ---------------------------------------------------------------- 4. AVANT / APRÈS
print("== 4. neutralisation/avant et apres")


def fiche(phase: str, cible: str):
    t = lire(f"{P}/neutralisation/{phase}/{cible}-lecture.txt")
    col = re.search(r"COLLECTES=(\d+)", t)
    fic = re.search(r"ECHECS_DE_FICHIER=(\d+)", t)
    ver = re.search(r"VERDICT=(.+)", t)
    echecs = re.findall(r"^\s+test \| (\w+) \| (.+)$", t, re.M)
    codes = dict(
        (titre.strip(), cle)
        for cle, titre in re.findall(r"✓ (\w+) → 1 test\(s\) \(attendu 1\) : (.+)$", t, re.M)
    )
    lus = []
    for typ, titre in echecs:
        cle = next((k for p, k in codes.items() if p in titre), "AUTRE")
        lus.append((cle, typ))
    return (int(col.group(1)) if col else None, int(fic.group(1)) if fic else None,
            ver.group(1).strip() if ver else None, sorted(lus), t)


AVANT = {
    "R23-C1": (48, []), "R23-C1-t-int": (48, []), "R23-C2": (48, []), "R23-C3": (48, []), "R23-C4": (48, []),
}
for c, (col, ech) in AVANT.items():
    n, f, v, lus, _ = fiche("avant", c)
    controle(f"avant {c} collectés", n, col)
    controle(f"avant {c} échecs de test", lus, ech)
n, f, v, lus, t = fiche("avant", "R23-C1-t-unit")
controle("avant R23-C1-t (unit) : échecs (type)", [x[1] for x in lus], ["AssertionError"])
print("  · titre :", re.findall(r"^\s+test \| \w+ \| (.+)$", t, re.M))
n, f, v, lus, t = fiche("avant", "R23-C5")
controle("avant R23-C5 : échecs (type)", [x[1] for x in lus], ["Error"])
controle("avant R23-C5 : verdict", v, "NON PROUVÉE")
n, f, v, lus, t = fiche("avant", "R23-C6")
controle("avant R23-C6 : nombre d'échecs", len(lus), 4)
print("  · titres :", [x[0] for x in lus])

APRES = {
    "R23-C1": (50, ["C1H", "C2"]),
    "R23-C1-t-int": (50, ["C1H", "C2"]),
    "R23-C1-t-unit": (24, ["C1U"]),
    "R23-C2": (50, ["C2", "D121C"]),
    "R23-C3": (50, ["C1H", "C2", "D121C", "D121P", "D121R"]),
    "R23-C4": (50, ["SEQ400", "T3"]),
    "R23-C5": (50, ["SEQ400"]),
    "R23-C6": (24, ["ACC", "C1U", "U1", "U2"]),
}
morsures = 0
for c, (col, titres) in APRES.items():
    n, f, v, lus, t = fiche("apres", c)
    controle(f"après {c} collectés", n, col)
    controle(f"après {c} échecs de fichier", f, 0)
    nommes = sorted(k for k, typ in lus if k != "AUTRE")
    controle(f"après {c} titres attendus en échec", nommes, sorted(titres))
    controle(f"après {c} types des attendus", sorted({typ for k, typ in lus if k != "AUTRE"}), ["AssertionError"])
    autres = [typ for k, typ in lus if k == "AUTRE"]
    if autres:
        print(f"  · {c} : {len(autres)} autre(s) titre(s) en échec, types {autres}")
    morsures += v == "MORSURE LUE"
    m = re.search(r"titres `it\(` relevés : (\d+)", t)
    if c == "R23-C3":
        controle("titres `it(` relevés", int(m.group(1)) if m else None, 70)
        controle("titres attendus uniques", len(re.findall(r"✓ \w+ → 1 test\(s\) \(attendu 1\)", t)), 11)
controle("après : MORSURE LUE", morsures, 8)

# ---------------------------------------------------------------- 5. Outils
print("== 5. outils/")
for ph in ("avant", "apres"):
    m = re.search(r"CAS=(\d+) MANQUES=(\d+)", lire(f"{P}/outils/calibrer-lire-d306-rejouee-{ph}.txt"))
    controle(f"calibration du lecteur ({ph})", m.groups() if m else None, ("33", "0"))
m = re.search(r"POSEES (\d+)\s+·\s+NON POSEES (\d+)", lire(f"{P}/outils/verifier-mutations-rang23.txt"))
controle("verifier-mutations rang23", m.groups() if m else None, ("12", "0"))
m = re.search(r"CIBLES CONFRONTÉES : (\d+) sur (\d+) · ÉCARTS : (\d+)", lire(f"{P}/outils/equivalence-harnais-sortie.txt"))
controle("équivalence harnais ↔ pièce", m.groups() if m else None, ("7", "7", "0"))

# ---------------------------------------------------------------- 6. Audit, passe D277, contrôles, état machine
print("== 6. audit, passe D277, état machine")
m = re.search(r"parcourus : (\d+) fichiers.*?audités : (\d+) fichiers.*?exclus : (\d+) fichiers.*?alertes : (\d+)",
              lire(f"{P}/audit-secrets-d308.txt"))
controle("audit d308 : parcourus, audités, exclus, alertes", m.groups() if m else None, ("1263", "1220", "43", "117"))
m = re.search(r"parcourus : (\d+) fichiers.*?audités : (\d+) fichiers.*?exclus : (\d+) fichiers.*?alertes : (\d+)",
              lire(f"{P}/audit-secrets-final.txt"))
print(f"  · audit FINAL (chiffres absents de la section : « au rapport de fin de lot ») : "
      f"{m.groups() if m else None}")
t = lire(f"{P}/controles/tri-audit-d308.txt")
m = re.search(r"alertes ABSENTES de la précédente : (\d+)", t)
controle("tri : alertes neuves", m.group(1) if m else None, "1")
# ⚠ FAUTE DE CET INSTRUMENT, CORRIGÉE ET REJOUÉE (règle de D298) : la première version cherchait
#   « test-int.log:<n> » sans le chemin, et prenait la PREMIÈRE alerte de ce nom — celle de D291 (ligne 236).
#   Le motif est désormais borné au journal de D308, et le nombre d'alertes de ce nom s'imprime à côté.
t = lire(f"{P}/audit-secrets-d308.txt")
noms = re.findall(r"docs/preuves/\S*test-int\.log:\d+", t)
m = re.search(r"docs/preuves/D308/portes/test-int\.log:(\d+) ", t)
print(f"  · alertes portant « test-int.log » dans la sortie scellée : {len(noms)} (chemins distincts : "
      f"{len({n.split(':')[0] for n in noms})})")
controle("alerte neuve : ligne dans D308/portes/test-int.log", m.group(1) if m else None, "240")
m = re.search(r"porteurs : (\d+)", lire(f"{P}/controles/controle-forme-chargily-sortie.txt"))
controle("contrôle de forme Chargily : porteurs", m.group(1) if m else None, "0")
for f, att in (("balayage-1.txt", "28"), ("balayage-apres-ecriture.txt", "30")):
    t = lire(f"{P}/passe-d277/{f}")
    m = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", t)
    z = re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", t)
    controle(f"passe D277 {f}", (m.group(1) if m else None, z.group(1) if z else None), (att, "0"))
h1 = hashlib.sha256(open(f"{P}/passe-d277/balayage.py", "rb").read()).hexdigest()
h2 = hashlib.sha256(open("docs/preuves/D306/passe-d277/balayage.py", "rb").read()).hexdigest()
controle("balayage.py : copie à l'octet de celui de D306 (préfixe 24802faf)", (h1[:8], h1 == h2), ("24802faf", True))
em = {}
for f in ("00-entree-calibree", "01-avant-portes", "02-apres-mesures"):
    t = lire(f"{P}/etat-machine/{f}.txt")
    em[f] = {k: re.search(rf"{k}=([^\s]+)", t).group(1) for k in
             ("HORODATAGE", "ALIM_SOURCE", "NODE", "CHROME", "CPU_MEDIANE_PCT", "PERF_MEDIANE_PCT", "RAM_MEDIANE_MO")}
    em[f]["HEURE"] = re.search(r"HORODATAGE=\S+ (\d\d:\d\d)", t).group(1)
controle("état machine : heures", [em[f]["HEURE"] for f in em], ["20:22", "20:40", "21:34"])
controle("état machine : alimentation", [em[f]["ALIM_SOURCE"] for f in em], ["SECTEUR"] * 3)
controle("état machine : node", [em[f]["NODE"] for f in em], ["0"] * 3)
controle("état machine : chrome", [em[f]["CHROME"] for f in em], ["15"] * 3)
controle("état machine : CPU médian min/max", (min(float(em[f]["CPU_MEDIANE_PCT"]) for f in em),
                                               max(float(em[f]["CPU_MEDIANE_PCT"]) for f in em)), (10.0, 18.5))
controle("état machine : PERF médian min/max", (min(float(em[f]["PERF_MEDIANE_PCT"]) for f in em),
                                                max(float(em[f]["PERF_MEDIANE_PCT"]) for f in em)), (80.8, 94.4))
t = lire(f"{P}/etat-machine/00-entree-calibree.txt")
m = re.search(r"CPU\s+repos -> charge\s+: ([\d.]+) % -> ([\d.]+) %.*?PERF\s+repos -> charge\s+: ([\d.]+) % -> ([\d.]+) %", t, re.S)
controle("calibration : CPU et PERF repos → charge", m.groups() if m else None, ("9.5", "100", "81.5", "146.7"))

# ---------------------------------------------------------------- 7. Le diff du commit contre la table des fichiers
print("== 7. fichiers du commit 3ac8749 hors docs/preuves/D308/")
sortie = subprocess.run(["git", "show", "--name-only", "--format=", "3ac8749"], capture_output=True, text=True,
                        encoding="utf-8").stdout.split()
hors = sorted(f for f in sortie if not f.startswith("docs/preuves/D308/"))
print(f"  · fichiers au commit : {len(sortie)}")
controle("fichiers hors pièces", hors, sorted([
    "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md", "apps/api/src/venues/booking-transitions.spec.ts",
    "apps/api/test/int/bookings.int-spec.ts", "neutralisation/neutralize-rang23.py"]))
sources = [f for f in hors if f.startswith("apps/") and ".spec." not in f and ".int-spec." not in f]
controle("fichiers SOURCE au commit (« aucun fichier source »)", sources, [])

print()
print(f"CONTRÔLES : {controles} · ÉCARTS : {ecarts} (attendu 0)")
