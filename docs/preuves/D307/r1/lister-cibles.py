# D307 — liste les cibles des harnais nommés (importées du harnais, même chargement que verifier-mutations.py).
# Usage, depuis la racine : python docs/preuves/D307/r1/lister-cibles.py <harnais>...
import importlib.util, sys, os
sys.stdout.reconfigure(encoding="utf-8")
for nom in sys.argv[1:]:
    chemin = f"neutralisation/neutralize-{nom}.py"
    spec = importlib.util.spec_from_file_location("h_" + nom.replace("-", "_"), chemin)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    print("=====", chemin, "cibles:", len(m.CIBLES))
    for c in m.CIBLES:
        lib, fic, avant, apres = c[0], c[1], c[2], c[3]
        print(f"- {lib[:110]}\n    fichier={fic}\n    avant={avant[:150]!r}\n    apres={apres[:150]!r}\n    mesures={c[5] if len(c)>5 else '?'}")
