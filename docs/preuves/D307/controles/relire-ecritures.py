"""D307 — RELECTURE de ce que la partie A a écrit (D289 : on relit le FICHIER, jamais le compte rendu de l'outil).
Jetons attendus comptés par fichier, texte APLATI ; doubles espaces nouveaux (trace d'un jeton mangé) comptés contre
HEAD sur les lignes AJOUTÉES seulement. Imprime ce qu'il a parcouru. Usage, depuis la racine."""
import re, subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")
F = ["AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
JETONS = {
    "AGENTS.md": ["LE FAIT DE D303 EST FAUX", "PAUSE DU CHEMIN DE L'ARGENT", "PRINCIPE DE DIRECTION",
                  "code de sortie seul, non prouvée (R1)", "régénérées par Ko le 25/09/2026"],
    "ZWADJ_CONTINUITE.md": ["## Session du 25/09/2026 — D307", "| D307 | A |", "ORDRE DU RANG 23 À COMPTER DU 25/09/2026",
                            "FAITS ET ARBITRAGES DE KO, DÉCISIONS DU RELECTEUR (chat) — 25/09/2026 (D307)",
                            "LE FAIT EST FAUX, DÉCLARÉ PAR KO", "R1 SORT DU RANG 23", "points 6 à 9",
                            "code de sortie seul, non prouvées (R1)", "23a-2"],
    "ZWADJ_BACKLOG.md": ["PARTIE CHARGILY CLOSE SUR LA DÉCLARATION DE KO", "23b — BLOQUÉ PAR : reprise du chemin de l'argent",
                         "23c — BLOQUÉ PAR : reprise du chemin de l'argent", "R1 — BLOQUÉ PAR : reprise du chemin de l'argent",
                         "CLOSE LE 25/09/2026 (D307)", "NON ACTUEL (Ko, 25/09/2026, D307)"],
}
# Calibration du détecteur de doubles espaces, deux bras (D286) : il DOIT voir « a  b », il ne doit PAS voir « a b ».
DETECTE = lambda l: bool(re.search(r"\S  +\S", l.lstrip(">| ").lstrip()))
assert DETECTE("le compte  est") and not DETECTE("le compte est") and not DETECTE("> | a | b |"), "calibration manquée"
print("calibration du détecteur de doubles espaces : 2 bras sur 2")
manques = 0
for f in F:
    brut = open(f, encoding="utf-8").read()
    plat = re.sub(r"\s+", " ", brut)
    for j in JETONS[f]:
        n = plat.count(j)
        manques += n == 0
        print(f"{'✓' if n else '✗'} {f} « {j} » : {n} (attendu ≥ 1)")
    avant = subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True).stdout.decode("utf-8").splitlines()
    apres = brut.splitlines()
    ajoutees = [l for l in apres if l not in set(avant)]
    doubles = [l for l in ajoutees if DETECTE(l)]
    print(f"  {f} : {len(apres)} lignes, {len(ajoutees)} ajoutées ou modifiées ; doubles espaces internes dans celles-ci : {len(doubles)} (attendu 0)")
    for l in doubles:
        print("     ", l[:160])
print(f"JETONS MANQUANTS : {manques} (attendu 0)")
