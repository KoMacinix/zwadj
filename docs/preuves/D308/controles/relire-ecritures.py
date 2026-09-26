"""D308 — RELECTURE de ce que 23a-2 a écrit (copie adaptée de la pièce de D307 : seuls les jetons changent) (D289 : on relit le FICHIER, jamais le compte rendu de l'outil).
Jetons attendus comptés par fichier, texte APLATI ; doubles espaces nouveaux (trace d'un jeton mangé) comptés contre
HEAD sur les lignes AJOUTÉES seulement. Imprime ce qu'il a parcouru. Usage, depuis la racine."""
import re, subprocess, sys
sys.stdout.reconfigure(encoding="utf-8")
F = ["AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md"]
JETONS = {
    "AGENTS.md": [],
    "ZWADJ_CONTINUITE.md": ["## Session du 25/09/2026 — D308", "| D308 | A |", "23a-2 — C1 À C5 DE D306, ÉCRITS COMME MODES DE DÉFAILLANCE",
                            "LES CIBLES DE 23a-2 — ÉCRITES AVANT TOUT TEST", "FICHIERS ATTENDUS DE 23a-2, ÉNUMÉRÉS AVANT D'ÉCRIRE",
                            "8 sur 8 : MORSURE LUE", "13 mesures sur 13 en MORSURE LUE", "23a-2 CODÉ LE 25/09/2026 (D308)",
                            "CE QUI VIENT ENSUITE : LA CERTIFICATION", "RANG 23 — 23a-2 CODÉ, CHEMIN DE L'ARGENT"],
    "ZWADJ_BACKLOG.md": ["Reports du 25/09/2026 — rang 23, 23a-2 : les gardes C1 à C5 de D306 (D308)",
                         "`lancer-campagnes.py` NE VOIT PAS CE QU'UNE CAMPAGNE MESURE", "`assertStatus` (`bookings.service.ts`) n'a AUCUN appelant",
                         "La pièce versée d'une campagne doit-elle être celle de la passe dont le chiffre est cité",
                         "already executing a query"],
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
