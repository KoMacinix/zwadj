"""Fabrique `jouer-complement.py` à partir de `jouer-union.py` : le moteur est LU, jamais retapé ; seules les constantes changent. Chaque remplacement est COMPTÉ (attendu 1) puis son marqueur RELU."""
import sys

src = open("docs/preuves/D341/neutralisation/jouer-union.py", encoding="utf-8", newline="").read()
EDITS = [
    ('"""D341 — JOUE L\'UNION DES CAMPAGNES (COPIE de celui de D339 ; seuls les chemins, le dossier des journaux et la liste des campagnes jouées avec `--int` changent).',
     '"""D341 — JOUE LE COMPLÉMENT DE L\'UNION (COPIE de `jouer-union.py` de D341 ; seuls la liste lue, le dossier des journaux et les campagnes jouées avec `--int` changent). Le complément est la liste des campagnes que le tri de `lancer-campagnes.py` ne voit pas (son angle mort : un chemin de test écrit RELATIVEMENT à `apps/api`), calculée par `calculer-complement.py` et versée AVANT d\'être jouée.',
     "COMPLÉMENT DE L'UNION"),
    ('SORTIE_UNION = "docs/preuves/D341/neutralisation/union-sortie.txt"', 'SORTIE_UNION = "docs/preuves/D341/neutralisation/complement-sortie.txt"', "complement-sortie.txt"),
    ('JOURNAUX = os.path.join(".neutralisation-journaux", "d341-union")', 'JOURNAUX = os.path.join(".neutralisation-journaux", "d341-complement")', "d341-complement"),
    ('AVEC_INT = ("neutralize-r33.py", "neutralize-r39.py", "neutralize-r44.py")', 'AVEC_INT = ("neutralize-r41.py", "neutralize-r42.py", "neutralize-r43.py", "neutralize-s11b.py")', '"neutralize-s11b.py")'),
    ("Usage, depuis la racine, bash : python3 docs/preuves/D341/neutralisation/jouer-union.py", "Usage, depuis la racine, bash : python3 docs/preuves/D341/neutralisation/jouer-complement.py", "jouer-complement.py"),
]
t = src
for avant, apres, marqueur in EDITS:
    n = t.count(avant)
    if n != 1:
        sys.exit(f"✗ ancre trouvée {n} fois (attendu 1) : {avant[:70]!r}")
    t = t.replace(avant, apres)
    if t.count(marqueur) < 1:
        sys.exit(f"✗ marqueur absent après remplacement : {marqueur!r}")
    print(f"  ✓ ancre 1 → marqueur {marqueur!r} relu ({t.count(marqueur)} occurrence(s))")
# le commentaire de tête parle de r33/r39/r44 « jouées UNE fois avec --int » : il reste vrai pour r41, r42, r43, s11b, dit autrement
avant = "Les campagnes qui ont des cibles d'intégration (`r33`, `r39`, `r44`) ne sont jouées QU'UNE fois, avec `--int`"
apres = "Les campagnes qui ont des cibles d'intégration (`r41`, `r42`, `r43`, `s11b` ; `r4` est entièrement d'intégration et n'a pas de drapeau) ne sont jouées QU'UNE fois, avec `--int`"
if t.count(avant) != 1:
    sys.exit(f"✗ ancre du commentaire trouvée {t.count(avant)} fois")
t = t.replace(avant, apres)
cible = "docs/preuves/D341/neutralisation/jouer-complement.py"
open(cible, "w", encoding="utf-8", newline="").write(t)
print(f"écrit : {cible} ({len(t)} caractères)")
