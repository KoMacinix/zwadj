# D306 — CALIBRATION du lecteur `lire.py`, sur des sorties BRUTES déjà versées dont la
# réponse a été LUE À LA MAIN par cette session (texte débarrassé des codes ANSI, blocs
# `FAIL` et ligne `Tests` relus) — jamais sur la réponse d'un autre lecteur.
# ⛔ Deux bras : des cas qui DOIVENT rendre « MORSURE LUE », et des cas qui ne le doivent
# PAS (plantage, délai, Error, import, fichier vide, crochet, attendu absent, attendu ambigu).
# Un seul cas manqué ⇒ ABANDON (code 1) : le lecteur ne sert pas.
# Usage, depuis la racine du dépôt :  python docs/preuves/D306/outils/calibrer-lire.py
import os
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from lire import juger, lire  # noqa: E402
from titres import TITRES, verifier  # noqa: E402

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.exists("pnpm-workspace.yaml"):
    print("ABANDON : à lancer depuis la racine du dépôt.")
    sys.exit(1)

D305 = "docs/preuves/D305"
SIG = "docs/preuves/D304/r1/signatures/sorties"
T = TITRES

# (sortie, attendus, verdict attendu, collectés attendus, échecs de test attendus, échecs de fichier attendus)
CAS = [
    # bras POSITIF
    (f"{D305}/rouge-vert/rouge-avant-correctif.txt", [T["T1"], T["T2"], T["T3"]], "MORSURE LUE", 48, 3, 0),
    (f"{SIG}/tests.defaut.txt", ["CAS-ASSERTION une assertion"], "MORSURE LUE", 7, 6, 0),
    (f"{SIG}/tests.defaut.txt", ["CAS-ASSERTION-OBJET"], "MORSURE LUE", 7, 6, 0),
    (f"{SIG}/tests.defaut.txt", ["CAS-REJECTS"], "MORSURE LUE", 7, 6, 0),
    (f"{D305}/neutralisation/R23-F5-a-int-reservations.txt", [T["T3"]], "MORSURE LUE", 48, 2, 0),
    # bras NÉGATIF
    (f"{D305}/rouge-vert/vert-apres-correctif.txt", [], "VERT", 48, 0, 0),
    (f"{D305}/rouge-vert/vert-apres-correctif.txt", [T["T1"]], "NON PROUVÉE", 48, 0, 0),
    (f"{SIG}/tests.defaut.txt", ["CAS-PLANTAGE"], "NON PROUVÉE", 7, 6, 0),
    (f"{SIG}/tests.defaut.txt", ["CAS-ERREUR"], "NON PROUVÉE", 7, 6, 0),
    (f"{SIG}/tests.defaut.txt", ["CAS-DELAI"], "NON PROUVÉE", 7, 6, 0),
    (f"{SIG}/tests.defaut.txt", ["CAS-ASSERTION"], "NON PROUVÉE", 7, 6, 0),  # ambigu : 2 titres
    (f"{SIG}/import.defaut.txt", ["n'importe"], "NON PROUVÉE", 0, 0, 1),
    (f"{SIG}/vide.defaut.txt", ["n'importe"], "NON PROUVÉE", 0, 0, 1),
    (f"{SIG}/crochet.defaut.txt", ["n'importe"], "NON PROUVÉE", 1, 0, 1),
    (f"{D305}/neutralisation/R23-F5-a-int-reservations.txt", [T["SEQ400"]], "NON PROUVÉE", 48, 2, 0),
]

manques = 0
for sortie, attendus, v_att, c_att, et_att, ef_att in CAS:
    lec = lire(sortie)
    verdict, detail = juger(lec, attendus)
    ok = (verdict, lec.collectes, len(lec.echecs_test), len(lec.echecs_fichier)) == (v_att, c_att, et_att, ef_att)
    manques += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {os.path.basename(sortie)} {attendus[:1]} — lu : {verdict}, collectés {lec.collectes}, "
          f"tests {len(lec.echecs_test)}, fichier {len(lec.echecs_fichier)}, lignes {lec.lignes} "
          f"(attendu : {v_att}, {c_att}, {et_att}, {ef_att})")
    if not ok:
        for d in detail:
            print("     ", d)

# Les préfixes de titres désignent-ils UN test chacun, à la révision courante ?
lignes, comptes = verifier(".")
print(f"Titres `it(` relevés : {comptes}")
for cle, prefixe, n in lignes:
    ok = n == 1
    manques += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {cle} → {n} test(s) (attendu 1) : {prefixe}")

print(f"CAS={len(CAS) + len(lignes)} MANQUES={manques} (attendu 0)")
sys.exit(1 if manques else 0)
