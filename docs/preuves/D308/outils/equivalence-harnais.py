"""D308 — les cibles 23a-2 de `neutralisation/neutralize-rang23.py` produisent-elles, À L'OCTET, le fichier muté que
produit la pièce de D306 (ou l'outil de rejeu de D308, pour la mutation neuve) ? Pièce jetable, versée. N'ÉCRIT RIEN
dans le dépôt : tout se calcule EN MÉMOIRE, sur les sources lues à la révision courante.

Pourquoi : le harnais exige une ancre UNIQUE et remplace toutes ses occurrences (`str.replace`) ; la pièce de D306
applique une édition dans une RÉGION (X2a : « après la relecture est l'AUTORITÉ »). Deux mécaniques différentes : si le
texte muté diffère d'un seul octet, la campagne ne rejoue pas la mutation de D306 — elle en rejoue une autre.
Calibration, deux bras (D286) : une cible IDENTIQUE doit rendre ÉGAL ; une cible volontairement FAUSSÉE (un espace de
plus dans le remplacement) doit rendre DIFFÉRENT.
Usage, depuis la racine :  python docs/preuves/D308/outils/equivalence-harnais.py
"""
import importlib.util
import os
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    print("ABANDON : à lancer depuis la racine.")
    sys.exit(2)


def charger(nom: str, chemin: str):
    spec = importlib.util.spec_from_file_location(nom, chemin)
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


H = charger("h_rang23", "neutralisation/neutralize-rang23.py")
R = charger("rejouer_d308", "docs/preuves/D308/outils/rejouer.py")  # importe aussi la pièce de D306 (R.N6)

PAIRES = {  # libellé du harnais (préfixe) → cible de l'outil de rejeu (qui porte les éditions de D306)
    "R23-C1.": "R23-C1", "R23-C1-t.": "R23-C1-t-unit", "R23-C2.": "R23-C2", "R23-C3.": "R23-C3",
    "R23-C4.": "R23-C4", "R23-C5.": "R23-C5", "R23-C6.": "R23-C6",
}


def par_harnais(cible, source: str) -> str:
    """La mécanique EXACTE du harnais (main de neutralize-rang23.py) : CRLF, compte, `replace`."""
    _lib, _chemin, avant, apres, attendu = cible[:5]
    avant, apres = avant.replace("\n", "\r\n"), apres.replace("\n", "\r\n")
    n = source.count(avant)
    if n != attendu:
        raise SystemExit(f"ERREUR : {n} occurrence(s), {attendu} attendue(s)")
    return source.replace(avant, apres)


def par_piece(editions, source: str) -> str:
    texte = source
    for e in editions:
        texte, _ligne, bon = R.N6.appliquer(texte, e)
        if not bon:
            raise SystemExit("ERREUR : la pièce de D306 ne pose pas sa mutation")
    return texte


ecarts, vus = 0, 0
for prefixe, cid in PAIRES.items():
    cible = next(c for c in H.CIBLES if c[0].startswith(prefixe + " "))
    fichier, editions = R.CIBLES[cid][0], R.CIBLES[cid][1]
    if cible[1] != fichier:
        print(f"✗ {prefixe} : fichiers différents ({cible[1]} / {fichier})")
        ecarts += 1
        continue
    source = open(fichier, "rb").read().decode("utf-8")
    a, b = par_harnais(cible, source), par_piece(editions, source)
    vus += 1
    ok = a.encode("utf-8") == b.encode("utf-8") and a != source
    ecarts += 0 if ok else 1
    print(f"{'✓' if ok else '✗'} {prefixe:<10} ↔ {cid:<14} {fichier} : muté par le harnais {'==' if ok else '!='} muté par la pièce "
          f"({len(a.encode('utf-8'))} / {len(b.encode('utf-8'))} octets)")

# Calibration, bras négatif : une cible faussée d'un espace doit rendre DIFFÉRENT.
cible = next(c for c in H.CIBLES if c[0].startswith("R23-C5. "))
faussee = (cible[0], cible[1], cible[2], cible[3].replace("undefined),", "undefined ),"), cible[4])
source = open(cible[1], "rb").read().decode("utf-8")
neg = par_harnais(faussee, source).encode("utf-8") != par_piece(R.CIBLES["R23-C5"][1], source).encode("utf-8")
print(f"calibration : bras négatif (remplacement faussé d'un espace) → {'DIFFÉRENT' if neg else 'ÉGAL'} (attendu DIFFÉRENT)")
print(f"CIBLES CONFRONTÉES : {vus} sur {len(PAIRES)} · ÉCARTS : {ecarts} (attendu 0)")
sys.exit(0 if (ecarts == 0 and neg and vus == len(PAIRES)) else 1)
