"""Fabrique docs/preuves/D334/plancher/simuler-non-demarrage.py (copie de D329) : modifications DÉCLARÉES et COMPTÉES."""
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
src = open("docs/preuves/D329/plancher/simuler-non-demarrage.py", encoding="utf-8", newline="").read()
assert "\r" not in src
coupe = src.index("\nimport ast\n")
tete, code = src[:coupe], src[coupe:]
compte = {}
n_d329 = len(re.findall(r"D329|d329", code))
code = code.replace("D329", "D334").replace("d329", "d334")
compte["(1) D329/d329 → D334/d334 dans le CODE"] = n_d329
assert "D329" not in code and "d329" not in code


def rep(cle, old, new):
    global code
    assert code.count(old) == 1, (cle, code.count(old), old[:90])
    code = code.replace(old, new)
    compte[cle] = 1


rep("(2) MESURER", 'MESURER = ["act-plafonds", "horloge", "r32", "r33"]  # [D334 (2)] seuls ces quatre harnais sont simulés : les 26 autres planchers sont REPRIS de D324',
    'MESURER = ["act-plafonds", "horloge", "r33", "r37", "r38", "r39", "s10b"]  # [D334 (2)] seuls ces sept harnais sont simulés (changés ou neufs depuis leur dernière mesure) : les 26 autres planchers sont REPRIS de D324/D329')
rep("(3) ARGV", 'ARGV_PAR_HARNAIS = {"r33": ["--int"]}                # [D334 (3)] la passe qui certifie r33 est --int (102 cibles, dont 9 d\'intégration)',
    'ARGV_PAR_HARNAIS = {"r33": ["--int"], "r39": ["--int"]}                # [D334 (3)] la passe qui certifie r33 (95 cibles dont 8 d\'intégration) et r39 (51 dont 16) est --int')
rep("(4) énumération", 'f"== ÉNUMÉRATION : {len(HARNAIS)} harnais (attendu 34) · à simuler : {MESURER} ({len(MESURER)}, attendu 4) · "', 'f"== ÉNUMÉRATION : {len(HARNAIS)} harnais (attendu 37) · à simuler : {MESURER} ({len(MESURER)}, attendu 7) · "')
rep("(4) mesure", 'dire("\\n== MESURE — les 4 harnais à mesurer (act-plafonds, horloge, r32, r33), chacun dans la passe qui le certifie, sous A puis sous B")', 'dire("\\n== MESURE — les 7 harnais à mesurer (act-plafonds, horloge, r33, r37, r38, r39, s10b), chacun dans la passe qui le certifie, sous A puis sous B")')
assert code.count("?? docs/preuves/D334/") == 1   # l'arbre de départ ne tolère que les pièces non suivies de D334 (converti par (1))

ENTETE = '''"""D334 — COPIE de `docs/preuves/D329/plancher/simuler-non-demarrage.py` (pièce de D329, elle-même copie de celle de D324 et de D314), MODIFICATIONS DÉCLARÉES, chacune comptée à la fabrication (`fab-simul.py`) :
  (1) tout nom `D329`/`d329` du CODE devient `D334`/`d334` (dossier de travail, variables d'environnement, noms de la cale, préfixe des pièces non suivies tolérées au départ) ;
  (2) LA SIMULATION NE JOUE QUE SEPT HARNAIS — `MESURER = {act-plafonds, horloge, r33, r37, r38, r39, s10b}` — règle du relecteur du 15/10/2026 (décision 4) : « réutilisés SEULEMENT pour les harnais dont le fichier n'a pas changé depuis leur dernière mesure, prouvé par `git` ;
      MESURÉS pour tous les autres, dont au moins `r37`, `r38`, `r39` (neufs) et chaque harnais réorienté ou dont la constante a changé depuis D330 » (`act-plafonds` et `horloge` : la constante ; `r33` et `s10b` : des cibles réorientées ; D333 les a changés, `git diff 77de612 HEAD`) ;
      les 26 autres planchers sont REPRIS, la preuve est `deriver-plancher-sortie.txt` ;
  (3) `r33` ET `r39` se jouent avec `--int` (ARGV_PAR_HARNAIS) : c'est la passe qui les CERTIFIE (`r33` : 95 cibles dont 8 d'intégration ; `r39` : 51 dont 16) ; `declarees.py` (D310) range à tort `r33` « tout » et rend `n = None` pour `r33`, `r37`, `r38`, `r39` ;
      leur nombre de cibles est lu en IMPORTANT le module (gardes `__main__` présentes — vérifié : un `grep -c` par fichier rend 1) ;
  (4) les libellés « attendu 34 / 4 » de l'énumération deviennent « attendu 37 / 7 » (ils ne commandent rien) ; la mention des quatre harnais de la section MESURE est mise à jour.
Le bras négatif (c) est celui de D329 : `argon2` sans cale contre son non-démarrage simulé À D324 (ligne « T argon2 » de `docs/preuves/D324/plancher/simulation-sortie.txt`). Les docstrings qui suivent sont ceux de D329 et de D314, intacts (leur `D329` s'y lit `D334`).
Usage, depuis la racine, arbre PROPRE : python docs/preuves/D334/plancher/simuler-non-demarrage.py
"""
'''
sortie = ENTETE + tete + code
open("docs/preuves/D334/plancher/simuler-non-demarrage.py", "w", encoding="utf-8", newline="\n").write(sortie)
compile(sortie, "simuler.py", "exec")
print("simuler-non-demarrage.py :", compte)
