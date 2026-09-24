"""D304 — passe D277, LES DEUX SENS (D287). Depuis la racine :

    python3 docs/preuves/D304/passe-d277/balayage.py

Compte chaque motif dans les quatre fichiers d'autorité, AVANT (`HEAD`, lu par `git show`) et
APRÈS (arbre de travail), sur le texte APLATI (blancs réduits à un espace, `*` retirés) — une
expression enjambe les retours à la ligne de ces fichiers (leçon de D294). Pour chaque
occurrence APRÈS : le fichier, la ligne d'origine, une fenêtre de contexte, et deux indices —
« barré » si l'occurrence est entre `~~`, « D304 à proximité » si « D304 » figure dans les 400
caractères qui suivent. Les indices ne jugent pas : le TRI est écrit à la main dans `tri.txt`.

SENS 1 — ce que ce lot INVALIDE (affirmations devenues fausses).
SENS 2 — ce que ce lot rend PERMIS, ou dont la CONDITION change (permissions périmées, D287).
⚠ Imprime le corpus lu, la ventilation par motif, et les motifs à zéro (D290, D295).
⚠ CALIBRATION, deux bras : le motif témoin positif « DÉCOUPAGE À TRANCHER PAR KO » doit valoir
≥ 1 AVANT (titre du point d'entrée du rang 23 à `2b9f8d5`) ; le témoin négatif, un motif forgé
à l'exécution qui n'existe nulle part, doit valoir 0 avant et après.
"""
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

FICHIERS = ["AGENTS.md", "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "CLAUDE.md"]
SENS1 = [
    "à préciser par le relecteur",
    "à arrêter par le relecteur",
    "Faisabilité non mesurée",
    "vérifiée par construction au lot de code",
    "DÉCOUPAGE À TRANCHER PAR KO",
    "tranche le découpage",
    "avancent ce rang ou",
    "non posé par le relecteur",
    "même s'il mesure ce chemin",
    "comme `neutralize-horizon.py`",
    "Le reste de R1",
    "non transmis avec la décision",
    "BLOQUE : à ordonner par Ko — ⚠ mais c'est l'audit",
    "tarification hors E3",
    "correction de R1",
]
SENS2 = [
    "PERMIS",
    "peut s'ouvrir",
    "aucun ne l'est",
    "23a",
    "prochaine certification",
    "reprise d'E3",
    "lève la pause",
]
TEMOIN_POS = "DÉCOUPAGE À TRANCHER PAR KO"
TEMOIN_NEG = "motif" + "-témoin-" + "absent-" + "D304"


def aplatir(t: str) -> tuple[str, list[int]]:
    """Texte aplati + table position aplatie → ligne d'origine."""
    sortie, lignes, ligne, blanc = [], [], 1, False
    for c in t:
        if c == "\n":
            ligne += 1
        if c == "*" or c == "\r":
            continue
        if c.isspace():
            if not blanc:
                sortie.append(" ")
                lignes.append(ligne)
            blanc = True
            continue
        blanc = False
        sortie.append(c)
        lignes.append(ligne)
    return "".join(sortie), lignes


def lire(f: str, avant: bool) -> str:
    if avant:
        r = subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True)
        return r.stdout.decode("utf-8")
    return open(f, encoding="utf-8", newline="").read()


def entre_tildes(plat: str, i: int) -> bool:
    return plat.count("~~", 0, i) % 2 == 1


corpus = {}
for f in FICHIERS:
    for avant in (True, False):
        corpus[(f, avant)] = aplatir(lire(f, avant))
print("corpus : " + " · ".join(f"{f} {len(corpus[(f, False)][0])} car. aplatis" for f in FICHIERS))


def compter(motif: str, avant: bool) -> int:
    return sum(corpus[(f, avant)][0].count(motif) for f in FICHIERS)


pos, neg_av, neg_ap = compter(TEMOIN_POS, True), compter(TEMOIN_NEG, True), compter(TEMOIN_NEG, False)
print(f"calibration : témoin positif AVANT = {pos} (attendu ≥ 1) · témoin négatif {neg_av}/{neg_ap} (attendu 0/0)")
if pos < 1 or neg_av or neg_ap:
    sys.exit("ABANDON : calibration manquée")

for titre, motifs in (("SENS 1 — invalidé par le lot", SENS1), ("SENS 2 — permis, ou condition changée", SENS2)):
    print(f"\n{'=' * 100}\n{titre}\n{'=' * 100}")
    zeros = []
    for m in motifs:
        av, ap = compter(m, True), compter(m, False)
        print(f"\n### « {m} » : avant {av} → après {ap}")
        if ap == 0:
            zeros.append(m)
        for f in FICHIERS:
            plat, lignes = corpus[(f, False)]
            start = 0
            while True:
                i = plat.find(m, start)
                if i < 0:
                    break
                start = i + len(m)
                barre = entre_tildes(plat, i)
                proche = "D304" in plat[i:i + 400]
                fen = plat[max(0, i - 110):i + len(m) + 110].replace("\n", " ")
                drapeaux = ("barré " if barre else "") + ("D304-à-proximité" if proche else "")
                print(f"  {f}:{lignes[i]} [{drapeaux.strip() or '—'}] …{fen}…")
    print(f"\nmotifs à zéro APRÈS ({titre[:6]}) : {zeros if zeros else 'aucun'} — une hypothèse à vérifier, pas une absence")
