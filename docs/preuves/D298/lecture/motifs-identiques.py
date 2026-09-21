"""Les motifs, échantillons de calibration et informatifs de `neutralisation/audit-secrets.py` sont-ils
ceux de D293, À L'IDENTIQUE ? Deux passes qui se comparent comptent la même chose (D290). (D298)
Usage, depuis la racine : python3 docs/preuves/D298/lecture/motifs-identiques.py
Les affectations sont ÉVALUÉES depuis l'arbre syntaxique de chaque fichier : les littéraux assemblés à
l'exécution (leçon D291) se comparent donc par leur VALEUR, pas par leur écriture."""
import ast
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
NOMS = ("TIRETS", "MOTIFS", "INFORMATIF", "POSITIFS", "positifs", "PROPRE", "propre")


def lire(chemin: str) -> dict:
    ns = {"re": re}
    for noeud in ast.parse(open(chemin, encoding="utf-8").read()).body:
        if isinstance(noeud, ast.Assign) and isinstance(noeud.targets[0], ast.Name) and noeud.targets[0].id in NOMS:
            exec(compile(ast.Module([noeud], []), chemin, "exec"), ns)
    return {"motifs": ns["MOTIFS"], "informatif": ns["INFORMATIF"],
            "positifs": ns.get("POSITIFS", ns.get("positifs")), "propre": ns.get("PROPRE", ns.get("propre"))}


a = lire("docs/preuves/D293/outils/audit-secrets.py")
b = lire("neutralisation/audit-secrets.py")
ok = True
for cle in a:
    egal = a[cle] == b[cle]
    ok &= egal
    n = len(a[cle]) if isinstance(a[cle], dict) else 1
    print(f"{cle:10s} D293 {n} élément(s) · identiques : {egal}")
sys.exit(0 if ok else 1)
