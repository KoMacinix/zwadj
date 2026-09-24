"""D304 — cadrage de R1, point 6 de Ko : « relève d'abord si les 7 autres harnais lisent
déjà la sortie ». Relevé EN LECTURE SEULE, depuis la racine :

    python3 docs/preuves/D304/r1/lecture-sortie.py

Pour chaque `neutralisation/neutralize-*.py`, cherche dans la SOURCE (commentaires retirés)
quatre traits de lecture de la sortie de vitest, et imprime lesquels sont présents :

  T  titre sur une ligne d'échec   : « × » (ou U+00D7, U+2717) ET un libellé attendu testés
                                     ensemble sur une ligne de sortie
  C  compte des tests collectés    : lecture du total entre parenthèses de « Tests … (N) »
  S  signature d'échec nommée      : « Test timed out in » (budgets, via JUnit)
  A  ancre libre dans la sortie    : une chaîne cherchée n'importe où dans la sortie (404)

Aucun trait ⇒ le harnais juge sur le code de sortie SEUL.

⚠ CALIBRATION À DEUX BRAS, rejouée à chaque exécution (D286) : `neutralize-horizon.py` doit
rendre T (relu à la main : « × » et titre sur une même ligne, l. 217) ; `neutralize-s11b.py`
ne doit rendre AUCUN trait (audit SOLID 09/09 · R1, relu à la main). Un bras manqué ⇒ ABANDON.
⚠ Imprime ce qu'il a parcouru, et la ventilation par trait (D290, D295).

⛔ DÉFAUT D'INSTRUMENT DE LA PREMIÈRE PASSE, À MON COMPTE (règle de D298 : recalibrer, rejouer
EN ENTIER, écrire le défaut) : le motif T comptait les `print("\\u2717 " + nom)` — le glyphe
qu'un harnais IMPRIME pour une cible muette, pas une ligne de sortie de vitest qu'il LIT.
`neutralize-horloge.py` est sorti « T+C » alors que sa fonction `joue()` ne rend que le code
de sortie (relu à la main). C'est la ventilation par harnais qui l'a montré (D295). ⇒ Les
lignes `print(` sont exclues du motif T, et `neutralize-horloge.py` devient un SECOND bras
négatif pour T : il porte le glyphe dans ses `print` et ne lit aucune ligne d'échec.
"""
import glob
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")

import os

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

TRAITS = {
    # « × » littéral, × ou ✗ écrits en échappement, ou une regex LIGNE_ROUGE
    "T": re.compile(r"""(["']×["']\s+in\s+ligne|\\u00d7|\\u2717|LIGNE_ROUGE\.match)"""),
    "C": re.compile(r"""Tests\\s\+\.\*\?\\\(\(\\d\+\)\\\)"""),
    "S": re.compile(r"Test timed out in"),
    "A": re.compile(r"""ancre\s+in\s+sortie"""),
}


def sans_commentaires(source: str) -> str:
    # lignes de commentaire Python ; les docstrings restent (elles ne contiennent pas de code
    # de décision, et le motif T exige une forme de CODE : « "×" in ligne », pas le mot seul)
    return "\n".join(l for l in source.splitlines() if not l.lstrip().startswith("#"))


def sans_impressions(source: str) -> str:
    # ce qu'un harnais IMPRIME n'est pas ce qu'il LIT (défaut de la première passe)
    return "\n".join(l for l in source.splitlines() if "print(" not in l)


fichiers = sorted(glob.glob("neutralisation/neutralize-*.py"))
print(f"harnais parcourus : {len(fichiers)}  (attendu : 27, relevé D303)")
resultats = {}
lignes_lues = 0
for f in fichiers:
    brut = open(f, encoding="utf-8").read()
    lignes_lues += brut.count("\n")
    src = sans_commentaires(brut)
    lu = sans_impressions(src)
    resultats[os.path.basename(f)] = {
        k: len(rx.findall(lu if k == "T" else src)) for k, rx in TRAITS.items()
    }
print(f"lignes lues : {lignes_lues}")

# --- calibration, deux bras (trois cas) ----------------------------------------------------
pos = resultats.get("neutralize-horizon.py", {})
neg = resultats.get("neutralize-s11b.py", {})
neg_t = resultats.get("neutralize-horloge.py", {})
bras_pos = pos.get("T", 0) > 0
bras_neg = sum(neg.values()) == 0 if neg else False
bras_neg_t = neg_t.get("T", 1) == 0 and neg_t.get("C", 0) > 0
print(f"calibration bras positif (horizon → T) : {'OK' if bras_pos else 'MANQUÉ'}  {pos}")
print(f"calibration bras négatif (s11b → aucun trait) : {'OK' if bras_neg else 'MANQUÉ'}  {neg}")
print(f"calibration bras négatif T (horloge → C sans T) : {'OK' if bras_neg_t else 'MANQUÉ'}  {neg_t}")
if not (bras_pos and bras_neg and bras_neg_t):
    sys.exit("ABANDON : calibration manquée — l'extracteur ne sert pas à compter")

# --- relevé --------------------------------------------------------------------------------
print("\nharnais                              T  C  S  A   verdict")
ventilation = {k: 0 for k in TRAITS}
code_seul = []
for nom, t in resultats.items():
    for k, n in t.items():
        if n:
            ventilation[k] += 1
    lit = [k for k, n in t.items() if n]
    verdict = "+".join(lit) if lit else "CODE SEUL"
    if not lit:
        code_seul.append(nom)
    print(f"{nom:36s} {t['T']:>2d} {t['C']:>2d} {t['S']:>2d} {t['A']:>2d}   {verdict}")

print("\nventilation — harnais portant chaque trait :")
for k, n in ventilation.items():
    print(f"  {k} : {n}")
zeros = [k for k, n in ventilation.items() if n == 0]
print(f"traits à zéro (hypothèses à vérifier, D295) : {zeros if zeros else 'aucun'}")
print(f"\njugent au CODE SEUL : {len(code_seul)} sur {len(resultats)}  (relevé D303 : 20 sur 27)")
print(f"lisent au moins un trait : {len(resultats) - len(code_seul)}  (relevé D303 : 7)")
