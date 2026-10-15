import sys
sys.stdout.reconfigure(encoding="utf-8")
v = open("docs/preuves/D330/outils/verser.py", encoding="utf-8", newline="").read()
assert v.count('DST = os.path.join("docs", "preuves", "D330", f"passe-{ID}")') == 1
v = v.replace('DST = os.path.join("docs", "preuves", "D330", f"passe-{ID}")', 'DST = os.path.join("docs", "preuves", "D334", f"passe-{ID}")')
ENTETE = '''"""D334 — COPIE de `docs/preuves/D330/outils/verser.py` (pièce de D330, copie de celui de D329, de D324, de D319, non retouchée dans sa logique), SEUL CHANGEMENT DÉCLARÉ : le dossier de destination, `docs/preuves/D334/passe-<ID>/` (une occurrence de CODE,
comptée avant et après : 1 → 0 pour `"D330"`, 0 → 1 pour `"D334"`). Les docstrings qui suivent sont ceux de D330 et de D329, intacts ; leur `docs/preuves/D330/passe-<ID>/` se lit `docs/preuves/D334/passe-<ID>/`.
"""
'''
v = ENTETE + v
open("docs/preuves/D334/outils/verser.py", "w", encoding="utf-8", newline="\n").write(v)
compile(v, "verser.py", "exec")
assert v.count('"docs", "preuves", "D334"') == 1 and v.count('"docs", "preuves", "D330"') == 0
print("verser.py ok")
