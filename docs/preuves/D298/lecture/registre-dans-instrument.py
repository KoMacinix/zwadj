"""Le registre de `neutralisation/audit-secrets.py` est-il EXACTEMENT celui que le disque dérive ? (D298)
Usage, depuis la racine : python3 docs/preuves/D298/lecture/registre-dans-instrument.py
Relit le bloc produit par `registre.py` et le compare aux entrées EPINGLEES de l'instrument, lues par
l'arbre syntaxique — pas par sous-chaîne. Rend le nombre examiné des deux côtés (D290, D295)."""
import ast
import sys

sys.stdout.reconfigure(encoding="utf-8")
src = open("neutralisation/audit-secrets.py", encoding="utf-8").read()
epinglees = None
for noeud in ast.parse(src).body:
    if isinstance(noeud, ast.Assign) and isinstance(noeud.targets[0], ast.Name) and noeud.targets[0].id == "EPINGLEES":
        epinglees = [tuple(e) for e in ast.literal_eval(noeud.value)]
bloc = ast.literal_eval("[" + open("docs/preuves/D298/lecture/registre-bloc.txt", encoding="utf-8").read() + "]")
print(f"instrument : {len(epinglees)} entrées · disque : {len(bloc)} entrées · identiques et dans le même ordre : "
      f"{epinglees == [tuple(e) for e in bloc]}")
sys.exit(0 if epinglees == [tuple(e) for e in bloc] else 1)
