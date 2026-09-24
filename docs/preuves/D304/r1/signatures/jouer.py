"""D304 — cadrage de R1 : relever, SUR LA SORTIE BRUTE, ce que vitest 3.2.7 écrit pour chaque
façon d'échouer. Jetable, versé en pièce. Depuis la racine :

    python3 docs/preuves/D304/r1/signatures/jouer.py

Joue chaque fichier de `cas/` depuis `apps/api` (vitest de ce paquet), deux fois :
  · reporter PAR DÉFAUT — ce que captent les harnais qui lancent `pnpm … test -- <fichier>` ;
  · reporter JUNIT, écrit dans un fichier — la forme que lit `neutralize-budgets.py`.
Écrit chaque sortie BRUTE (codes ANSI compris) dans `sorties/`, puis imprime, ANSI retiré :
le code de sortie, la ligne « Tests », et pour chaque titre `CAS-…` : sa ligne « × », et la
PREMIÈRE ligne du bloc « FAIL … > titre » (le type d'erreur). Côté JUnit : l'attribut `type`
de `<failure>` et les `<testcase>` comptés.

⚠ LES CAS SONT LA CALIBRATION : leur réponse est connue par construction (un `expect` qui
échoue, une TypeError, un délai de 200 ms, un import manquant, un fichier sans test, un crochet
qui lève). L'extracteur ne sert à rien si un cas ne rend pas le type qu'il fabrique — la
vérification est imprimée en fin de sortie, cas par cas.
"""
import os
import re
import shutil
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

ICI = os.path.abspath("docs/preuves/D304/r1/signatures")
SORTIES = os.path.join(ICI, "sorties")
os.makedirs(SORTIES, exist_ok=True)
NPX = shutil.which("npx")
ANSI = re.compile(r"\x1b\[[0-9;]*m")
FICHIERS = ["tests", "import", "vide", "crochet"]

# Ce que chaque cas FABRIQUE — la réponse connue, écrite AVANT de lire la sortie.
ATTENDU = {
    "CAS-PASSE": None,
    "CAS-ASSERTION": "AssertionError",
    "CAS-ASSERTION-OBJET": "AssertionError",
    "CAS-REJECTS": "AssertionError",
    "CAS-PLANTAGE": "TypeError",
    "CAS-ERREUR": "Error",
    "CAS-DELAI": "Error",
    # ⛔ PREMIÈRE PASSE (`jouer-sortie-premiere.txt`) : écrit « Error » DE MÉMOIRE — je croyais
    # le test marqué « × ». La sortie brute dit « Tests 1 skipped (1) », AUCUNE croix sur le
    # titre, et l'échec porté par le FICHIER (« FAIL <fichier> [ <fichier> ] », « Error:
    # crochet en panne »). L'extracteur avait lu juste ; l'attendu était faux. Corrigé à la
    # valeur LUE, et écrit comme telle : un crochet en panne n'est PAS un test en échec.
    "CAS-CROCHET": None,
}


def jouer(fichier: str, junit: str | None) -> tuple[int, str]:
    cmd = [NPX, "vitest", "run", "-c", os.path.join(ICI, "vitest.config.mjs"), "--dir", ICI,
           f"{fichier}.cas"]
    if junit:
        cmd += ["--reporter=junit", f"--outputFile={junit}"]
    r = subprocess.run(cmd, cwd="apps/api", capture_output=True, text=True,
                       encoding="utf-8", errors="replace")
    return r.returncode, (r.stdout or "") + (r.stderr or "")


verifs = []
for f in FICHIERS:
    code, brut = jouer(f, None)
    open(os.path.join(SORTIES, f"{f}.defaut.txt"), "w", encoding="utf-8", newline="").write(brut)
    xml = os.path.join(SORTIES, f"{f}.junit.xml")
    if os.path.exists(xml):
        os.remove(xml)
    code_j, brut_j = jouer(f, xml)
    open(os.path.join(SORTIES, f"{f}.junit-console.txt"), "w", encoding="utf-8", newline="").write(brut_j)
    net = ANSI.sub("", brut)
    lignes = net.splitlines()
    print(f"\n=== {f}.cas.ts · sortie par défaut : code {code} · {len(lignes)} lignes lues")
    for l in lignes:
        if re.match(r"\s*(Tests|Test Files|Failed Suites|Failed Tests)\b", l) or "no tests" in l.lower():
            print(f"   résumé  | {l.strip()}")
    for l in lignes:
        if "×" in l and "CAS-" in l:
            print(f"   ×       | {l.strip()}")
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL"):
            suivante = next((x.strip() for x in lignes[i + 1:i + 4] if x.strip()), "")
            print(f"   FAIL    | {l.strip()[:110]}")
            print(f"     1re   | {suivante[:110]}")
    # vérification des cas contre leur réponse connue
    for titre, type_attendu in ATTENDU.items():
        if f"{titre} " not in net:
            continue
        croix = any("×" in l and f"{titre} " in l for l in lignes)
        bloc = None
        for i, l in enumerate(lignes):
            if l.strip().startswith("FAIL") and f"> {titre} " in l:
                bloc = next((x.strip() for x in lignes[i + 1:i + 4] if x.strip()), "")
        type_lu = bloc.split(":", 1)[0] if bloc else None
        ok = (type_attendu is None and not croix) or (croix and type_lu == type_attendu)
        verifs.append((f, titre, type_attendu, croix, type_lu, ok))
    # JUnit
    if os.path.exists(xml):
        x = open(xml, encoding="utf-8").read()
        cas = re.findall(r"<testcase ", x)
        types = re.findall(r'<failure[^>]*type="([^"]*)"', x)
        erreurs = re.findall(r"<error\b", x)
        suites = re.search(r"<testsuites[^>]*>", x)
        print(f"   junit   | code {code_j} · <testcase> {len(cas)} · <failure type> {types} · <error> {len(erreurs)}")
        print(f"   junit   | {suites.group(0) if suites else '(pas de <testsuites>)'}")
    else:
        print(f"   junit   | code {code_j} · AUCUN fichier écrit")

print("\n=== vérification des cas contre leur réponse CONNUE (la calibration)")
for f, titre, attendu, croix, lu, ok in verifs:
    print(f"   {'OK ' if ok else 'MANQUÉ'} {f:7s} {titre:22s} attendu {str(attendu):15s} × {str(croix):5s} lu {lu}")
print(f"cas vérifiés : {len(verifs)} (attendu : 8 — sept dans tests.cas.ts, un dans crochet.cas.ts)")
print(f"manqués : {sum(1 for v in verifs if not v[5])} (attendu 0)")
