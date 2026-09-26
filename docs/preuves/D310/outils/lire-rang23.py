"""D310 — COPIE de `docs/preuves/D308/outils/lire-campagne-rang23.py` (pièce de D308, non retouchée), dont SEULS
les chemins deviennent des PARAMÈTRES : la source est le dossier `rang23/` de la passe de certification (copié
par `passe.py` à la fin de `--tout`), la destination le dossier versé de CETTE passe (décision 3 du relecteur,
D309). Même lecteur (celui de D306, `lire.py`), mêmes titres importés du harnais (7ᵉ champ), même verdict.
Usage, depuis la racine :
    python docs/preuves/D310/outils/lire-rang23.py <dossier rang23 de la passe> <dossier versé rang23>
"""
import hashlib
import importlib.util
import os
import shutil
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
sys.path.insert(0, "docs/preuves/D306/outils")
from lire import juger, lire  # noqa: E402

SRC, DST = sys.argv[1], sys.argv[2]
spec = importlib.util.spec_from_file_location("h_rang23", "neutralisation/neutralize-rang23.py")
H = importlib.util.module_from_spec(spec)
spec.loader.exec_module(H)

os.makedirs(DST, exist_ok=True)
copies = 0
for nom in sorted(os.listdir(SRC)):
    a, b = os.path.join(SRC, nom), os.path.join(DST, nom)
    shutil.copyfile(a, b)
    ok = hashlib.sha256(open(a, "rb").read()).digest() == hashlib.sha256(open(b, "rb").read()).digest()
    copies += ok
    print(f"{'✓' if ok else '✗'} copié {nom}")
print(f"journaux copiés à l'identique : {copies} sur {len(os.listdir(SRC))}\n")

mordues, lues = 0, 0
for libelle, _chemin, _avant, _apres, _n, mesures, titres in H.CIBLES:
    ident = libelle.split(".")[0]
    for m in mesures:
        journal = os.path.join(DST, f"{ident}-{m}.txt")
        # Les titres d'une cible à DEUX mesures se répartissent entre elles : seuls ceux de CETTE spec sont exigés.
        spec_de_m = H.MESURES[m][-1]
        texte_spec = open(os.path.join("apps/api", spec_de_m), encoding="utf-8").read()
        exiges = [t for t in titres if t in texte_spec]
        lec = lire(journal)
        verdict, detail = juger(lec, exiges)
        lues += 1
        mordues += verdict == "MORSURE LUE"
        print(f"{'✓' if verdict == 'MORSURE LUE' else '✗'} {ident} [{m}] collectés {lec.collectes} · échecs de fichier "
              f"{len(lec.echecs_fichier)} · titres exigés {len(exiges)} ⇒ {verdict}")
        for d in detail:
            print(f"     {d}")
print(f"\nMESURES LUES : {lues} · MORSURES LUES : {mordues} (attendu {lues})")
sys.exit(0 if mordues == lues else 1)
