"""Applique les ONZE motifs de l'audit de D293, recopies du fichier verse par import dynamique
(jamais retapes), a un fichier donne. N'imprime aucune valeur : comptes par motif seulement."""
import ast
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
src = open("docs/preuves/D293/outils/audit-secrets.py", encoding="utf-8").read()
arbre = ast.parse(src)
ns = {"re": re}
for noeud in arbre.body:
    if isinstance(noeud, ast.Assign) and isinstance(noeud.targets[0], ast.Name) and noeud.targets[0].id in ("TIRETS", "MOTIFS"):
        exec(compile(ast.Module([noeud], []), "d293", "exec"), ns)
MOTIFS = ns["MOTIFS"]
print(f"motifs lus dans la piece de D293 : {len(MOTIFS)}")
for f in sys.argv[1:]:
    t = open(f, "rb").read().decode("utf-8", errors="replace")
    par = {k: len(re.findall(m, t, flags=re.IGNORECASE)) for k, m in MOTIFS.items()}
    print(f"{f} : total {sum(par.values())} · " + " · ".join(f"{k}={v}" for k, v in par.items()))
