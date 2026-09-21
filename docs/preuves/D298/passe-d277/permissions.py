"""Passe D277 de D298, SENS 2 : les permissions « un lot de code peut s'ouvrir » et les états du compteur
écrits au présent, que le compteur à DEUX rend faux. Texte APLATI (D294), avec la LIGNE d'origine de
chaque occurrence, et la ZONE où elle se lit : « courante » (en-tête, points d'entrée, ordre des rangs,
décisions ouvertes) ou « datée » (section de session, vraie à sa date — principe de D291).
Usage, depuis la racine : python3 docs/preuves/D298/passe-d277/permissions.py
⚠ Le motif couvre le gras et les capitales : « **peut** s'ouvrir » et « PEUT s'ouvrir » échappaient au
motif nu — la faille relevée par D291, retrouvée par D298 sur sa propre première recherche."""
import bisect
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
MOTIFS = {
    "permission": r"(?i)\*{0,2}peu(?:t|vent)\*{0,2} (?:désormais |donc )?s'ouvrir",
    "compteur-present": r"(?i)compteur (?:de lots de code non certifiés )?(?:est |reste |passe )?(?:donc )?(?:à |: )\*{0,2}(?:zéro|un|deux)\b",
}
f = "ZWADJ_CONTINUITE.md"
brut = open(f, encoding="utf-8").read()
lignes = brut.split("\n")
debuts = [0]
for l in lignes[:-1]:
    debuts.append(debuts[-1] + len(l) + 1)
# zones : repérées par leurs titres, relus à l'exécution — jamais des numéros de ligne écrits
titres = [(i + 1, l) for i, l in enumerate(lignes) if l.startswith("## ")]
# ⚠ L'ORDRE DES RANGS VIT DANS UNE SECTION DE SESSION (« ### D270 — ordre des lots ») et se lit COURANT :
#   la première version de ce script le classait « datée » et en masquait toutes les occurrences.
ordre = [i + 1 for i, l in enumerate(lignes) if l.startswith("### D270 — ordre des lots")]
fin_ordre = [i + 1 for i, l in enumerate(lignes) if l.startswith("### ") and ordre and i + 1 > ordre[0]]
BORNES_ORDRE = (ordre[0], fin_ordre[0]) if ordre and fin_ordre else None
if not BORNES_ORDRE:
    sys.exit("ABANDON : la section de l'ordre des rangs n'est pas repérée — la zone serait fausse")


def zone(no: int) -> str:
    if BORNES_ORDRE[0] <= no < BORNES_ORDRE[1]:
        return "courante"
    titre = [t for n, t in titres if n <= no][-1] if any(n <= no for n, _ in titres) else "(en-tête)"
    if titre.startswith("## Session") or titre.startswith("## Incident"):
        return "datée"
    return "courante"
# aplatissement AVEC correspondance vers la position brute
plat, carte = [], []
blanc = False
for i, c in enumerate(brut):
    if c.isspace():
        if not blanc:
            plat.append(" "); carte.append(i)
        blanc = True
    else:
        plat.append(c); carte.append(i); blanc = False
plat = "".join(plat)
total = 0
for nom, rx in MOTIFS.items():
    par_zone = {"courante": 0, "datée": 0}
    for m in re.finditer(rx, plat):
        no = bisect.bisect_right(debuts, carte[m.start()])
        z = zone(no)
        par_zone[z] += 1
        total += 1
        if z == "courante":
            print(f"  [{nom}] l.{no} ({z}) : …{plat[max(0, m.start() - 110):m.end() + 60]}…")
    print(f"{nom:18s} courante {par_zone['courante']} · datée {par_zone['datée']}")
print(f"== {f} : {len(lignes)} lignes, {len(plat)} caractères aplatis, {len(titres)} titres de niveau 2 · {total} occurrences")
