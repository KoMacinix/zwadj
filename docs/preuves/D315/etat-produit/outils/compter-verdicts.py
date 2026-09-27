"""D315 — rang 24 — recompte les verdicts de `ENTREES-CONFRONTEES.md`, et CROISE ses renvois avec l'extraction
`entrees-ouvertes-sortie.txt`. Pièce jetable, versée. N'écrit rien.
Un compteur qui croise deux entrées rend son détail sur les deux (D295) : il imprime les renvois de l'extraction ABSENTS
de la table, ceux de la table ABSENTS de l'extraction, et les renvois en DOUBLE ; puis la ventilation par verdict, avec
les verdicts inconnus à part.
Calibration, deux bras, sur des cas connus de la table : (+) B:356 (idempotence) doit porter ABSENT ; (−) B:830
(publication) ne doit PAS porter ABSENT — il porte RÉALISÉ, mesuré par le script de captures.
Usage, depuis la racine :  python docs/preuves/D315/etat-produit/outils/compter-verdicts.py
"""
import collections
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
ICI = "docs/preuves/D315/etat-produit"
CONNUS = ["RÉALISÉ AUTREMENT", "RÉALISÉ", "PARTIEL", "CASSÉ À L'ÉCRAN", "ABSENT", "PAUSE", "BIENTÔT", "ÉCARTÉ",
          "DÉCISION OUVERTE", "NON CONFRONTÉ", "périmée"]
extraits = re.findall(r"^B:(\d+)\s", open(f"{ICI}/entrees-ouvertes-sortie.txt", encoding="utf-8").read(), re.M)
lignes_table = [l for l in open(f"{ICI}/ENTREES-CONFRONTEES.md", encoding="utf-8").read().splitlines() if re.match(r"^\| B:\d+ \|", l)]
table = {}
doubles = []
for l in lignes_table:
    cols = [c.strip() for c in l.strip().strip("|").split("|")]
    b = cols[0][2:]
    if b in table:
        doubles.append(b)
    table[b] = cols[2]
print(f"extraction : {len(extraits)} renvois · table : {len(lignes_table)} lignes, {len(table)} renvois distincts")
print(f"absents de la table : {sorted(set(extraits) - set(table), key=int)} (attendu [])")
print(f"absents de l'extraction : {sorted(set(table) - set(extraits), key=int)} (attendu [])")
print(f"en double : {doubles} (attendu [])")
print(f"calibration (+) B:356 → {table.get('356')!r} (attendu 'ABSENT') · (−) B:830 → {table.get('830')!r} (attendu autre que 'ABSENT')")
ok = table.get("356") == "ABSENT" and table.get("830") not in (None, "ABSENT")
c = collections.Counter(table.values())
print("\nventilation par verdict :")
for v in CONNUS:
    print(f"  {v:20s} {c.get(v, 0)}")
inconnus = {v: n for v, n in c.items() if v not in CONNUS}
print(f"  verdicts INCONNUS : {inconnus} (attendu {{}})")
print(f"  total {sum(c.values())} (attendu {len(extraits)})")
if not ok or inconnus or set(extraits) != set(table) or doubles:
    sys.exit(2)
