#!/usr/bin/env python3
"""Lit la sortie BRUTE d'une famille de rouges (vitest 3.2.7, codes ANSI retirés) : combien de tests en échec, et pour CHACUN la classe de la PREMIÈRE ligne de son bloc d'échec (D304 : une morsure est une `AssertionError` ;
un `TypeError`, un délai dépassé, une collecte à zéro n'en sont pas) ; combien de FICHIERS sont tombés (collecte ou crochet `beforeAll`), et pourquoi. Les en-têtes d'échec REGROUPÉS (plusieurs `FAIL … > titre` d'affilée, PUIS
l'erreur) sont sautés : la « première ligne du bloc » est la première qui n'est pas un en-tête (D316).
Usage : python3 lire-rouges.py <sortie brute> [--titres]   (`--titres` : imprime aussi le titre de chaque test en échec, tronqué à 120 caractères). Lecture seule. Imprime, à côté de ses totaux, les lignes qu'il a PARCOURUES (D290).
Archivé comme PIÈCE (D291), jamais promu en instrument ; CALIBRÉ à chaque lancement sur les deux sorties connues de D354 (`docs/preuves/D354/rouges/rouge-client.txt` : 5 tests en échec dont 4 `TypeError` et 1 `AssertionError` ;
`rouge-int.txt` : 3 fichiers tombés dont le premier en `TypeError`) — il ABANDONNE si un cas manque son verdict."""
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

ENTETE = re.compile(r"^\s*FAIL\s+(\S+)\s*(?:>\s*(.*?)|\[.*\])?\s*$")
RESUME = re.compile(r"^\s*(Test Files|Tests)\s+(.*)$")


def classe(ligne: str) -> str:
    m = re.match(r"\s*([A-Za-z_]*Error|Error)\b", ligne)
    if m:
        nom = m.group(1)
        if nom == "Error" and re.search(r"Test timed out|timed out in", ligne):
            return "délai dépassé"
        if nom == "Error" and re.search(r"Failed to resolve import|Cannot find module", ligne):
            return "import introuvable (collecte)"
        return nom
    return "autre : " + ligne.strip()[:60]


def lire(chemin: str):
    lignes = open(chemin, encoding="utf-8", errors="replace").read().replace("\r\n", "\n").split("\n")
    resumes = [l.strip() for l in lignes if RESUME.match(l)]
    tests, fichiers = [], []
    i = 0
    while i < len(lignes):
        m = ENTETE.match(lignes[i])
        if not m:
            i += 1
            continue
        enteteurs = [m]
        j = i + 1
        # les en-têtes regroupés sont sautés, ainsi que les lignes vides et les lignes de séparation « ⎯⎯⎯ »
        while j < len(lignes) and (not lignes[j].strip() or ENTETE.match(lignes[j])):
            if ENTETE.match(lignes[j]):
                enteteurs.append(ENTETE.match(lignes[j]))
            j += 1
        premiere = lignes[j] if j < len(lignes) else ""
        for h in enteteurs:
            titre = h.group(2)
            (tests if titre else fichiers).append((h.group(1), titre or "", classe(premiere)))
        i = j + 1
    return len(lignes), resumes, tests, fichiers


def rapport(chemin: str, titres: bool):
    n, resumes, tests, fichiers = lire(chemin)
    print(f"{chemin} — {n} lignes parcourues")
    for r in resumes:
        print("  ", r)
    par_classe: dict[str, int] = {}
    for _, _, c in tests:
        par_classe[c] = par_classe.get(c, 0) + 1
    print(f"   tests en échec lus : {len(tests)} · par classe de première ligne : {par_classe}")
    fp: dict[str, int] = {}
    for _, _, c in fichiers:
        fp[c] = fp.get(c, 0) + 1
    print(f"   fichiers tombés (collecte ou crochet) : {len(fichiers)} · par classe : {fp}")
    for f, _, c in fichiers:
        print(f"      · {f} — {c}")
    if titres:
        for f, t, c in tests:
            print(f"      ✗ [{c}] {f.split('/')[-1]} > {t[:120]}")
    return tests, fichiers, resumes


if __name__ == "__main__":
    # CALIBRATION sur les deux sorties connues de D354
    t, f, r = rapport("docs/preuves/D354/rouges/rouge-client.txt", False)
    cal_ok = len(t) == 5 and sorted(c for _, _, c in t) == ["AssertionError"] + ["TypeError"] * 4
    t2, f2, r2 = rapport("docs/preuves/D354/rouges/rouge-int.txt", False)
    cal_ok = cal_ok and len(f2) >= 3 and f2[0][2] == "TypeError"
    print(f"CALIBRATION : rouge-client → 5 échecs (1 AssertionError + 4 TypeError) : {len(t) == 5} ; rouge-int → ≥ 3 fichiers tombés, le premier en TypeError : {len(f2) >= 3 and f2[0][2] == 'TypeError'}")
    if not cal_ok:
        print("✗ ABANDON : la calibration a manqué son verdict ; rien n'est lu")
        sys.exit(2)
    print("calibration : les deux cas ont rendu leur verdict attendu.\n")
    for chemin in [a for a in sys.argv[1:] if not a.startswith("--")]:
        rapport(chemin, "--titres" in sys.argv)
