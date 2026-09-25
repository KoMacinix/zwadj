# D306 — session ADVERSE de 23a. LECTEUR de sortie vitest (reporter par défaut, 3.2.7).
# Écrit par cette session, SANS reprendre `docs/preuves/D305/lecture/lire-echecs.py` :
# la consigne est de reproduire, pas de relire — un lecteur partagé avec la session
# qu'on contrôle partagerait aussi ses angles morts.
#
# Usage :
#     python lire.py <sortie.txt> [--attendu <sous-chaîne de titre>]...
#
# CE QU'IL REND (et le nombre de lignes qu'il a parcourues, D290) :
#   - COLLECTES : le total entre parenthèses de la DERNIÈRE ligne `Tests …` ; « no tests » ⇒ 0 ;
#   - les échecs de FICHIER (`FAIL <f> [ <f> ]`, D304) et les échecs de TEST (`FAIL <f> > … > <titre>`),
#     chacun avec la CLASSE et la PREMIÈRE LIGNE de l'erreur qui suit ;
#   - avec --attendu : pour chaque titre attendu, MORSURE seulement s'il apparaît UNE fois en échec
#     et que sa classe est `AssertionError` (règle b de D303, lecture fermée de R1 : un plantage, un
#     délai dépassé, une `Error` de supertest ne sont PAS des morsures) ; tout autre titre en échec est
#     IMPRIMÉ, jamais compté pour la cible (décision 5 du § 9 de R1).
# VERDICT :
#   MORSURE LUE  — collectés > 0, 0 échec de fichier, chaque attendu présent une fois en AssertionError ;
#   VERT         — aucun attendu demandé, collectés > 0, aucun échec ;
#   NON PROUVÉE  — tout le reste (fermé par défaut).
# Calibration : `calibrer-lire.py`, sur des sorties BRUTES dont la réponse a été lue à la main.
import re
import sys
from dataclasses import dataclass, field

ANSI = re.compile(r"\x1b\[[0-9;]*m")
CLASSE = re.compile(r"^([A-Za-z_][A-Za-z0-9_.]*)(?::|$)")


@dataclass
class Echec:
    titre: str
    classe: str
    premiere: str


@dataclass
class Lecture:
    lignes: int = 0
    ligne_fichiers: str = ""
    ligne_tests: str = ""
    collectes: int = -1
    echecs_fichier: list = field(default_factory=list)
    echecs_test: list = field(default_factory=list)


def lire(chemin: str) -> Lecture:
    brut = open(chemin, "rb").read().decode("utf-8", errors="replace")
    lignes = [ANSI.sub("", l).rstrip("\r") for l in brut.split("\n")]
    lec = Lecture(lignes=len(lignes))
    for i, l in enumerate(lignes):
        s = l.strip()
        if re.match(r"^Test Files\s", s):
            lec.ligne_fichiers = s
        if re.match(r"^Tests\s", s):
            lec.ligne_tests = s
        if l.startswith(" FAIL  "):
            reste = l[len(" FAIL  "):]
            suivante = ""
            for j in range(i + 1, min(i + 8, len(lignes))):
                if lignes[j].strip():
                    suivante = lignes[j].strip()
                    break
            m = CLASSE.match(suivante)
            classe = m.group(1) if m else "?"
            if " > " not in reste:
                lec.echecs_fichier.append(Echec(reste.strip(), classe, suivante[:200]))
            else:
                titre = reste.split(" > ", 1)[1].strip()
                lec.echecs_test.append(Echec(titre, classe, suivante[:200]))
    if lec.ligne_tests:
        if "no tests" in lec.ligne_tests:
            lec.collectes = 0
        else:
            m = re.search(r"\((\d+)\)\s*$", lec.ligne_tests)
            lec.collectes = int(m.group(1)) if m else -1
    return lec


def juger(lec: Lecture, attendus: list) -> tuple:
    """Rend (verdict, lignes de détail)."""
    detail = []
    if not attendus:
        ok = lec.collectes > 0 and not lec.echecs_fichier and not lec.echecs_test
        return ("VERT" if ok else "NON PROUVÉE"), detail
    tous = lec.collectes > 0 and not lec.echecs_fichier
    couverts = set()
    for a in attendus:
        trouves = [e for e in lec.echecs_test if a in e.titre]
        for e in trouves:
            couverts.add(id(e))
        if len(trouves) == 0:
            detail.append(f"ATTENDU ABSENT      : {a}")
            tous = False
        elif len(trouves) > 1:
            detail.append(f"ATTENDU AMBIGU ({len(trouves)}) : {a}")
            tous = False
        elif trouves[0].classe != "AssertionError":
            detail.append(f"ATTENDU NON-ASSERTION ({trouves[0].classe}) : {a}")
            tous = False
        else:
            detail.append(f"ATTENDU MORD (AssertionError) : {a}")
    for e in lec.echecs_test:
        if id(e) not in couverts:
            detail.append(f"AUTRE TITRE EN ÉCHEC ({e.classe}) : {e.titre}")
    return ("MORSURE LUE" if tous else "NON PROUVÉE"), detail


def rapport(chemin: str, attendus: list) -> str:
    lec = lire(chemin)
    verdict, detail = juger(lec, attendus)
    out = [
        f"SORTIE={chemin}",
        f"LIGNES_EXAMINEES={lec.lignes}",
        f"LIGNE_TEST_FILES={lec.ligne_fichiers or '(absente)'}",
        f"LIGNE_TESTS={lec.ligne_tests or '(absente)'}",
        f"COLLECTES={lec.collectes}   (exigé > 0)",
        f"ECHECS_DE_FICHIER={len(lec.echecs_fichier)}   (exigé 0)",
    ]
    for e in lec.echecs_fichier:
        out.append(f"  fichier | {e.classe} | {e.titre} | {e.premiere}")
    out.append(f"ECHECS_DE_TEST={len(lec.echecs_test)}   (attendus déclarés : {len(attendus)})")
    for e in lec.echecs_test:
        out.append(f"  test | {e.classe} | {e.titre}")
        out.append(f"       1re ligne : {e.premiere}")
    out.extend(detail)
    out.append(f"VERDICT={verdict}")
    return "\n".join(out)


if __name__ == "__main__":
    for flux in (sys.stdout, sys.stderr):
        flux.reconfigure(encoding="utf-8")
    args = sys.argv[1:]
    if not args:
        print("usage: lire.py <sortie.txt> [--attendu <titre>]...", file=sys.stderr)
        sys.exit(2)
    chemin, attendus, k = args[0], [], 1
    while k < len(args):
        if args[k] == "--attendu" and k + 1 < len(args):
            attendus.append(args[k + 1])
            k += 2
        else:
            print(f"argument inconnu : {args[k]}", file=sys.stderr)
            sys.exit(2)
    print(rapport(chemin, attendus))
