"""Écrit les TITRES de neutralize-r44.py À PARTIR DU RELEVÉ de la découverte (jamais de mémoire — AGENTS.md, D275).
Lit les journaux `.neutralisation-journaux/r44/<identifiant>-<mesure>.log` (la sortie ENTIÈRE de chaque mesure sous mutation) et, pour chaque (cible, mesure) candidate :
  · prend le premier test en échec dont le bloc commence par `AssertionError` (le lecteur du harnais, `echecs_de`) ;
  · vérifie que `lire_vitest(sortie, titre)` rend « MORD » avec ce titre (la preuve que le harnais jugera ce titre) ;
  · sinon la mesure N'A PAS MORDU (aucun test en échec, ou aucune assertion) et n'entre pas dans les titres.
Sortie : titres.json (clé « identifiant|mesure »), le compte de cibles / mesures lues (D290 : sur quoi on a compté), la liste des cibles SANS aucune mesure qui mord, et la ligne R44_FILTRE de la seconde passe.
Calibration, deux bras (D286) : (positif) un journal fabriqué à la forme de vitest avec une AssertionError rend un titre ; (négatif) un journal avec TypeError rend aucun titre.
Usage, depuis la RACINE : python3 remplir-titres-r44.py <titres.json>"""
import importlib.util
import json
import os
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

spec = importlib.util.spec_from_file_location("r44", "neutralisation/neutralize-r44.py")
r44 = importlib.util.module_from_spec(spec)
spec.loader.exec_module(r44)

JOURNAUX = os.path.join(".neutralisation-journaux", "r44")


def titre_qui_mord(sortie: str):
    for entete, message in r44.echecs_de(sortie):
        if not message.startswith("AssertionError"):
            continue
        # « FAIL  fichier > describe > titre » → « describe > titre » (la forme que porte aussi la ligne « × »)
        morceaux = entete.split(" > ", 1)
        if len(morceaux) < 2:
            continue
        titre = morceaux[1].strip()[:110].rstrip()
        verdict, _ = r44.lire_vitest(sortie, titre)
        if verdict == "MORD":
            return titre
    return None


# ── calibration
_V = " RUN  v3.2.7 C:/x\n"
bon = _V + "   × d > un test qui mord 3ms\n FAIL  a.spec.ts > d > un test qui mord\nAssertionError: expected 1 to be 2\n      Tests  1 failed | 4 passed (5)\n"
mauvais = _V + "   × d > un test qui plante 3ms\n FAIL  a.spec.ts > d > un test qui plante\nTypeError: x is not a function\n      Tests  1 failed | 4 passed (5)\n"
assert titre_qui_mord(bon) == "d > un test qui mord", "calibration positive : le titre n'est pas rendu"
assert titre_qui_mord(mauvais) is None, "calibration négative : un TypeError a rendu un titre"

titres: dict[str, str] = {}
cibles_lues = 0
mesures_lues = 0
mesures_absentes = 0
sans_morsure: list[str] = []
a_rejouer_en_integration: list[str] = []
details_non_mordues: list[str] = []
for c in r44.CIBLES:
    ident = c["libelle"].split(".")[0]
    cibles_lues += 1
    mordues = 0
    manquantes_int = 0
    for m in c["mesures"]:
        chemin = os.path.join(JOURNAUX, f"{ident}-{m}.log")
        if not os.path.isfile(chemin):
            mesures_absentes += 1
            manquantes_int += m in r44.MESURES_INT
            continue
        mesures_lues += 1
        sortie = open(chemin, encoding="utf-8", errors="replace").read()
        titre = titre_qui_mord(sortie)
        if titre is None:
            details_non_mordues.append(f"{ident}|{m}")
        else:
            titres[f"{ident}|{m}"] = titre
            mordues += 1
    if mordues == 0:
        sans_morsure.append(ident)
        if manquantes_int:
            a_rejouer_en_integration.append(ident)

json.dump(titres, open(sys.argv[1], "w", encoding="utf-8"), ensure_ascii=False, indent=1)
print(f"cibles examinées : {cibles_lues} · mesures lues : {mesures_lues} · mesures sans journal : {mesures_absentes} · mesures qui MORDENT : {len(titres)} · n'ont PAS mordu : {len(details_non_mordues)}")
print(f"cibles avec au moins une mesure qui mord : {cibles_lues - len(sans_morsure)} · SANS aucune : {len(sans_morsure)}")
if sans_morsure:
    print("SANS morsure : " + ", ".join(sans_morsure))
if a_rejouer_en_integration:
    print("dont ont des mesures d'INTÉGRATION encore à jouer : " + ", ".join(a_rejouer_en_integration))
    print("R44_FILTRE de la seconde passe : " + ",".join(f"{i}." for i in a_rejouer_en_integration))
if details_non_mordues:
    print("mesures lues qui n'ont PAS mordu : " + ", ".join(details_non_mordues))
