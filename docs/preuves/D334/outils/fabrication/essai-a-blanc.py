"""ESSAI À BLANC de docs/preuves/D334/outils/passe.py : une copie dont `lancer()` ne lance RIEN (journal seulement). Exerce : calibration des règles, .env, inventaires, sondes réelles, porte dure, échantillonneur, regime(), clôture, jugement RAM, code de sortie.
Jamais versé comme preuve de la passe ; sa sortie est un diagnostic NON certifiant."""
import re
import sys

src = open("docs/preuves/D334/outils/passe.py", encoding="utf-8").read()
marqueur = "def sonde(nom: str"
assert src.count(marqueur) == 1
src = src.replace(marqueur, 'lancer = lambda nom, cmd, env=None: (journal(f"   [FUMÉE] {nom} NON LANCÉ"), 0)[1]\n\n\n' + marqueur)
# une fenêtre sans portes : les listes dérivées restent, mais lancer() est inerte ; les dossiers que l'étape --tout copie sont créés vides
src = src.replace('lancer("campagnes-tout", [sys.executable, "neutralisation/lancer-campagnes.py", "--tout"])', 'lancer("campagnes-tout", [])\nfor _d in ("rang23", "available-on-api"):\n    os.makedirs(os.path.join(".neutralisation-journaux", _d), exist_ok=True)')
# 2ᵉ essai : la barre de l'OUVERTURE est abaissée à 3000 Mo POUR L'ESSAI SEULEMENT (la machine a 3,6 Go de libres, la vraie barre est 4 579) afin que la fenêtre, la clôture, le jugement de la RAM de clôture et le code de sortie soient exercés ; la barre de CLÔTURE reste la vraie.
if len(sys.argv) > 2 and sys.argv[2] == "--barre-ouverture-basse":
    assert src.count('_barre = float(v1["BARRE_D273_MO"])') == 1
    src = src.replace('_barre = float(v1["BARRE_D273_MO"])', '_barre = 3000.0   # ESSAI')
open(sys.argv[1], "w", encoding="utf-8").write(src)
print("copie de fumée écrite")
