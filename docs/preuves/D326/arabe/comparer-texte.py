"""D326 — CE QUE RENDENT LES PDF À L'EXTRACTION DE TEXTE, FACE AUX CHAÎNES SOURCE (critère (c) de la décision 2).

« Rapporter ce que rend l'extraction du texte du PDF face aux chaînes source. Elle peut rendre l'ordre visuel : ne rien conclure sur elle seule. » ⇒ ce script RAPPORTE ; il ne juge pas le rendu (c'est le
critère (b), que Ko regarde). Il classe, pour chaque chaîne source, ce que l'extraction en rend :
  « telle quelle »  — la chaîne se retrouve octet pour octet, dans l'ordre logique ;
  « après NFKC »    — elle se retrouve une fois les FORMES DE PRÉSENTATION arabes (U+FB50–FDFF, U+FE70–FEFF : lettres déjà « jointes » par le moteur) ramenées aux lettres de base ;
  « à l'envers »    — elle se retrouve en ordre VISUEL (les caractères dans l'ordre inverse, après NFKC) ;
  « mots seuls »    — tous ses mots se retrouvent, dans un autre ordre ;
  « absente »       — rien de tout cela.
Deux extractions de `pdftotext` (poppler 4.00, le seul outil PDF du poste) : `-raw` (ordre du flux de contenu) et `-layout` (ordre de la page).

USAGE, depuis la racine : python3 docs/preuves/D326/arabe/comparer-texte.py <sources.json> <fichier.pdf>…
CALIBRATION, deux bras par classe, ABANDON si un seul manque (D286) : chaque classe est jouée sur un texte construit où elle est VRAIE et sur un où elle est FAUSSE.
"""
import json
import re
import subprocess
import sys
import unicodedata

sys.stdout.reconfigure(encoding="utf-8")
import shutil

PDFTOTEXT = shutil.which("pdftotext") or sys.exit("pdftotext introuvable dans le PATH — rien n'est jugé")  # le chemin « /mingw64/… » de Git Bash n'est pas un chemin Windows : mesuré


def classe(source: str, texte: str) -> str:
    if source in texte:
        return "telle quelle"
    nt, ns = unicodedata.normalize("NFKC", texte), unicodedata.normalize("NFKC", source)
    if ns in nt:
        return "après NFKC"
    if ns[::-1] in nt:
        return "à l'envers"
    mots = ns.split()
    if len(mots) > 1 and all(m in nt or m[::-1] in nt for m in mots):
        return "mots seuls"
    return "absente"


print("== CALIBRATION — deux bras par classe, abandon si un seul manque")
cal = []


def bras(nom, mesure, attendu):
    ok = mesure == attendu
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure!r} (attendu {attendu!r})")


S = "قاعة الياسمين"
bras("telle quelle (positif)", classe(S, f"avant {S} après"), "telle quelle")
bras("telle quelle (négatif : un autre texte)", classe(S, "rien de tel ici"), "absente")
bras("après NFKC (positif : « ﻗ » U+FED7 pour « ق » U+0642)", classe("قا", "ﻗﺎ"), "après NFKC")
bras("après NFKC (négatif : la lettre de base est la seule présente)", classe("قا", "قب"), "absente")
bras("à l'envers (positif)", classe(S, f"xx {S[::-1]} yy"), "à l'envers")
bras("à l'envers (négatif : le texte n'est ni l'un ni l'autre)", classe(S, "xx الياسمين yy"), "absente")
bras("mots seuls (positif)", classe(S, "الياسمين و قاعة"), "mots seuls")
bras("mots seuls (négatif : un mot manque)", classe(S, "الياسمين seul"), "absente")
if not all(cal):
    sys.exit(f"CALIBRATION : {cal.count(False)} bras manqué(s) — le script ne rapporte rien")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

sources = json.load(open(sys.argv[1], encoding="utf-8"))
chaines = {"salle": sources["salle"], "client": sources["client"], "créneau (nom)": sources["creneau_nom"]}
for i, p in enumerate(sources["prestations"]):
    chaines[f"prestation {i + 1}"] = p
for i, l in enumerate(sources["libelles_ar"]):
    chaines[f"libellé {i + 1}"] = l
for i, m in enumerate(sources["montants"]):
    chaines[f"montant {i + 1}"] = m

for chemin in sys.argv[2:]:
    print(f"## {chemin}")
    for mode in ("-raw", "-layout"):
        sortie = subprocess.run([PDFTOTEXT, "-enc", "UTF-8", mode, chemin, "-"], capture_output=True)
        texte = sortie.stdout.decode("utf-8", errors="replace")
        lignes = [l for l in texte.split("\n") if l.strip()]
        rep = {n: classe(s, texte) for n, s in chaines.items()}
        compte = {}
        for c in rep.values():
            compte[c] = compte.get(c, 0) + 1
        print(f"  pdftotext {mode} : {len(texte)} caractères · {len(lignes)} lignes non vides · {len(chaines)} chaînes source parcourues → "
              + " · ".join(f"{k} {v}" for k, v in sorted(compte.items())))
        for n, c in rep.items():
            if c != "telle quelle":
                print(f"     - {n} : {c}   source « {chaines[n]} »")
    print()
