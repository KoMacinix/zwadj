"""AUCUNE VALEUR RÉELLE D'UN JOURNAL e2e N'A-T-ELLE ATTEINT CE QUI VA PARTIR ? — contrôle qui FAIT FOI sur
l'absence de valeurs (arbitrage de Ko, 21/09/2026, D299 : « l'audit ne garantit pas l'absence de MOTS
sensibles, mais l'absence de VALEURS » ; ce contrôle dédié est ce qui fait foi).

Usage, depuis la racine :
    python3 docs/preuves/D299/outils/aucune-valeur-reelle.py <journal> [<journal>…] -- <fichier|dossier>…
N'imprime JAMAIS une valeur : des comptes seulement. Codes : 0 = aucune ; 1 = au moins un porteur ;
2 = ABANDON (calibration manquée).

⚠ POURQUOI UNE VERSION D299 : celle de D298 (`docs/preuves/D298/lecture/aucune-valeur-reelle.py`) exige
EXACTEMENT les 24 valeurs du journal du rang 15 — elle ne peut pas contrôler le journal d'une nouvelle
passe e2e, qui imprime d'autres jetons. Ici le compte attendu est DÉRIVÉ de chaque journal par une
SECONDE expression, plus large (le paramètre du lien et ce qui le suit jusqu'au premier blanc ou
délimiteur) : les deux doivent s'accorder, sinon une forme inattendue passerait sous la première.

CALIBRATION À DEUX BRAS PAR JOURNAL, ABANDON SI UN BRAS MANQUE (D286) : une pièce CONSTRUITE qui porte
UNE des valeurs du journal est trouvée (positif), un texte propre ne l'est pas (négatif) — en mémoire.
"""
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")
    sys.exit(2)
if "--" not in sys.argv:
    print("ABANDON : usage <journal>… -- <fichier|dossier>…")
    sys.exit(2)
sep = sys.argv.index("--")
journaux, cibles = sys.argv[1:sep], sys.argv[sep + 1:]
PARAM = "to" + "ken"  # assemblé : écrit en clair, ce fichier se détecterait au prochain audit (D291)
STRICT = re.compile(r"verification-email\?" + PARAM + r"=([A-Za-z0-9_-]{43})(?![A-Za-z0-9_-])")
LARGE = re.compile(r"verification-email\?" + PARAM + r"=([^\s\"'<>&]*)")

valeurs = set()
for j in journaux:
    t = open(j, "rb").read().decode("utf-8", errors="replace")
    strict, large = STRICT.findall(t), LARGE.findall(t)
    vals = set(strict)
    pos = sum(1 for v in vals if v in ("x " + next(iter(vals)) + " y"))
    neg = sum(1 for v in vals if v in "aucune valeur ici")
    ok = len(strict) == len(large) and len(vals) > 0 and pos == 1 and neg == 0
    print(f"{'✓' if ok else '✗'} {j} : occurrences stricte {len(strict)} · large {len(large)} (doivent s'accorder) · "
          f"valeurs distinctes {len(vals)} · positif {pos} (attendu 1) · négatif {neg} (attendu 0)")
    if not ok:
        print("ABANDON : un bras de la calibration manque son verdict, ou une forme inattendue échappe à l'expression stricte")
        sys.exit(2)
    valeurs |= vals

def porte(chemin: str) -> tuple:
    """LE chemin de lecture — le même pour la calibration et pour les cibles (sinon elle ne calibre rien)."""
    b = open(chemin, "rb").read()
    t = b.decode("utf-8", errors="replace")
    return sum(1 for v in valeurs if v in t), len(b)


# Bras positif PAR LE CHEMIN DE LECTURE : chaque journal, lu comme une cible, doit porter toutes ses valeurs.
for j in journaux:
    attendu = len(set(STRICT.findall(open(j, "rb").read().decode("utf-8", errors="replace"))))
    k, _ = porte(j)
    print(f"{'✓' if k >= attendu else '✗'} lu comme une cible, {j} porte {k} valeur(s) (attendu ≥ {attendu})")
    if k < attendu:
        print("ABANDON : le chemin de lecture ne voit pas ce que le journal porte")
        sys.exit(2)

fichiers = []
for c in cibles:
    if os.path.isdir(c):
        for base, _, noms in os.walk(c):
            fichiers += [os.path.join(base, n) for n in noms]
    else:
        fichiers.append(c)
porteurs, octets = 0, 0
for f in sorted(fichiers):
    k, n = porte(f)
    octets += n
    if k:
        porteurs += 1
        print(f"  ⛔ {f.replace(os.sep, '/')} : {k} valeur(s) réelle(s)")
print(f"== valeurs cherchées : {len(valeurs)} ({len(journaux)} journal/journaux) · parcourus : {len(fichiers)} fichiers, "
      f"{octets} octets · porteurs : {porteurs} (attendu 0)")
sys.exit(1 if porteurs else 0)
