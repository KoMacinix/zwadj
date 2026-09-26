"""D308 — LECTURE des journaux de la campagne `rang23` de la passe citée (les 12 cibles). Pièce jetable, versée.

1. COPIE octet pour octet de `.neutralisation-journaux/rang23/` vers `docs/preuves/D308/campagnes/rang23/`, empreintes
   comparées — la pièce versée est celle de la passe dont le chiffre est cité (constat de D306, appliqué).
2. LECTURE de chaque cible par le lecteur de D306 (`lire.py`, recalibré par ce lot : `outils/calibrer-lire-d306-*`),
   avec les titres attendus que le harnais porte en 7ᵉ champ — importés du harnais, jamais recopiés. Toutes mesures.
Usage, depuis la racine :  python docs/preuves/D308/outils/lire-campagne-rang23.py
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

SRC, DST = ".neutralisation-journaux/rang23", "docs/preuves/D308/campagnes/rang23"
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
