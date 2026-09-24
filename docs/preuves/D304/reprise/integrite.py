"""D304, REPRISE — intégrité des trois .md d'autorité laissés NON COMMITÉS par une session
dont l'environnement a été supprimé en cours de clôture. Lecture seule. Depuis la racine :

    python docs/preuves/D304/reprise/integrite.py <sortie>

POURQUOI. La session qui a écrit D304 a disparu entre son audit final et son commit : l'arbre
portait 650 lignes ajoutées que personne n'avait relues depuis. Avant de les commiter, on
vérifie qu'elles sont ENTIÈRES et NON CORROMPUES — pas qu'elles sont justes (ce n'est pas une
lecture adverse). Trois classes :
  1. fins de ligne, en OCTETS (AGENTS.md : `grep -c $'\r$'` ment sur ce poste) — arbre contre
     blob de HEAD ; UTF-8 strict ;
  2. doubles espaces INTERNES dans les lignes ajoutées — la trace laissée par un jeton mangé à
     l'interpolation (D289 : « local et  sur le MÊME SHA ») ; l'indentation n'est pas comptée ;
  3. deux accents graves accolés hors clôture de code — un jeton `…` vidé par un shell.
Chaque compte imprime ce qu'il a examiné et son attendu (D290). Le tri des candidats est humain.

CALIBRATION, rejouée à chaque invocation, deux bras par détecteur, ABANDON si un seul manque
(D286). Aucune valeur n'est lue hors des trois fichiers et de leurs blobs.
"""
import difflib
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
FICHIERS = ["AGENTS.md", "ZWADJ_BACKLOG.md", "ZWADJ_CONTINUITE.md"]
DOUBLE = re.compile(r"\S  +\S")


def regime(b):
    crlf = b.count(b"\r\n")
    return crlf, b.count(b"\n") - crlf, b.count(b"\r") - crlf


def double_interne(ligne):
    return DOUBLE.search(ligne)


def graves_accoles(ligne):
    return "``" in ligne.replace("```", "")


lignes = []


def dire(s=""):
    print(s)
    lignes.append(s)


bras = [
    ("régime CRLF", regime(b"a\r\nb\r\n") == (2, 0, 0)),
    ("régime LF", regime(b"a\nb\n") == (0, 2, 0)),
    ("double positif « a␠␠b »", bool(double_interne("a  b"))),
    ("double négatif, indentation", not double_interne("    a b")),
    ("double négatif, espace simple", not double_interne("a b")),
    ("graves positif « `` »", graves_accoles("local et `` sur")),
    ("graves négatif, clôture ```", not graves_accoles("```ts")),
    ("graves négatif, deux jetons", not graves_accoles("`a` `b`")),
]
manques = [n for n, ok in bras if not ok]
dire(f"calibration : {len(bras) - len(manques)} bras passent sur {len(bras)} · manqués : {manques or 'aucun'}")
if manques:
    sys.exit("ABANDON")

for f in FICHIERS:
    avant = subprocess.run(["git", "show", f"HEAD:{f}"], capture_output=True, check=True).stdout
    apres = open(f, "rb").read()
    for nom, b in (("HEAD ", avant), ("arbre", apres)):
        c, lf, cr = regime(b)
        dire(f"{f:20} {nom} octets {len(b):8} · CRLF {c:6} · LF nu {lf:6} · CR nu {cr}")
    try:
        apres.decode("utf-8")
        dire(f"{f:20} UTF-8 strict : OK")
    except UnicodeDecodeError as e:
        dire(f"{f:20} UTF-8 strict : ÉCHEC {e}")
    la = avant.decode("utf-8").splitlines()
    lb = apres.decode("utf-8", errors="replace").splitlines()
    ajoutees = [l[1:] for l in difflib.unified_diff(la, lb, lineterm="", n=0)
                if l.startswith("+") and not l.startswith("+++")]
    doubles = [l for l in ajoutees if double_interne(l)]
    graves = [l for l in ajoutees if graves_accoles(l)]
    dire(f"{f:20} lignes ajoutées examinées : {len(ajoutees)} · double espace interne : {len(doubles)} "
         f"(attendu 0, candidats à trier) · accents graves accolés : {len(graves)} (attendu 0)")
    for l in doubles:
        m = double_interne(l)
        dire(f"    [double] … {l[max(0, m.start() - 60): m.end() + 40]}")
    for l in graves:
        dire(f"    [graves] … {l[:160]}")

if len(sys.argv) > 1:
    with open(sys.argv[1], "w", encoding="utf-8", newline="\n") as s:
        s.write("\n".join(lignes) + "\n")
