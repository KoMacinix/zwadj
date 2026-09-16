"""LECTURE (pas une mesure) : « decl = — » est-il un defaut d'AFFICHAGE, ou la signature d'une campagne
qui a ABANDONNE AU PRE-VOL sans declarer une seule cible ? (Ko, 16/09/2026 ; signature diagnostiquee a
D283, fenetre 1 : r4 et solid-s7 abandonnes au pre-vol, decl = —.)

Usage, depuis la racine : python docs/preuves/D293/versement-d288/lecture-decl.py
Lit les 26 journaux VERSES dans docs/preuves/D288/campagnes/ — aucune execution, aucune machine.

Pour chaque journal : mordues / muettes / non mesurees par la regle du lanceur a c2ac531 ; « decl » par
SES DEUX expressions telles quelles ; le meme resume relu avec UN caractere la ou l'expression en attend
DEUX ; la ligne d'abandon de pre-vol ; « ERREUR DE SCRIPT ». Chaque compte imprime son attendu (D290).

VERDICT BENIN si, et seulement si, pour CHAQUE journal sans « decl » : mordues > 0, un resume existe,
son nombre EGALE les mordues comptees, zero abandon de pre-vol, zero erreur de script.
CALIBRATION A DEUX BRAS, ABANDON si un bras manque (D286) : un journal d'abandon synthetique doit rendre
abandon=1, resume absent, mordues 0 ; un journal reel (r4) doit rendre abandon=0, resume 2, mordues 2.
"""
import io
import os
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("ERREUR : a lancer depuis la racine du depot")

D = os.path.join("docs", "preuves", "D288", "campagnes")
lanceur = subprocess.run(["git", "show", "c2ac531:neutralisation/lancer-campagnes.py"],
                         capture_output=True, text=True, encoding="utf-8").stdout
m_mord = re.search(r'MORDUES = re\.compile\(r"(.+)"\)', lanceur)
m_roug = re.search(r'ROUGES = re\.compile\(r"(.+)"\)', lanceur)
if not (m_mord and m_roug):
    sys.exit("ABANDON : expressions du lanceur introuvables a c2ac531")
MORDUES, ROUGES = re.compile(m_mord.group(1)), re.compile(m_roug.group(1))
UN_CAR = re.compile(m_roug.group(1).replace("neutralis..e", "neutralis.e"))
ABANDON = "est DÉJÀ ROUGE avant mutation. Campagne abandonnée."


def lire(texte):
    lignes = texte.splitlines()
    mord = len([l for l in lignes if l.startswith("✓ ") and "vol" not in l])
    muet = len([l for l in lignes if l.startswith("✗ ")])
    nonm = len([l for l in lignes if "NON MESUR" in l and ":" in l])
    m = MORDUES.search(texte) or ROUGES.search(texte)
    m2 = MORDUES.search(texte) or UN_CAR.search(texte)
    return {"lignes": len(lignes), "mord": mord, "muet": muet, "nonm": nonm,
            "decl": m.group(1) if m else None,
            "resume": m2.group(1) if m2 else None,
            "abandon": texte.count(ABANDON),
            "erreur": texte.count("ERREUR DE SCRIPT"),
            "prevol_vert": texte.count("✓ Pré-vol")}


synthetique = ("temoin (aucune mutation)\n"
               "✗ PRÉ-VOL : « une mesure » " + ABANDON + "\n")
reel = io.open(os.path.join(D, "neutralize-r4.py.log"), encoding="utf-8").read()
bras = [
    ("positif : journal d'abandon synthetique", lire(synthetique), {"abandon": 1, "resume": None, "mord": 0}),
    ("negatif : journal reel neutralize-r4", lire(reel), {"abandon": 0, "resume": "2", "mord": 2}),
]
rates = 0
for nom, vu, att in bras:
    ok = all(vu[k] == v for k, v in att.items())
    rates += not ok
    print(f"  calibration {nom:42s} : " + " · ".join(f"{k}={vu[k]!r} (attendu {v!r})" for k, v in att.items())
          + f"  {'✓' if ok else '✗'}")
if rates:
    sys.exit("ABANDON : un bras de la calibration manque son verdict")

noms = sorted(os.listdir(D))
print(f"\njournaux lus : {len(noms)} (attendu 26)")
print(f"  {'campagne':26s} {'decl':>5s} {'resume':>7s} {'mord':>5s} {'muet':>5s} {'nonm':>5s} {'abandon':>8s} {'err':>4s} {'prevol':>7s}")
sans_decl, suspects = [], []
for n in noms:
    v = lire(io.open(os.path.join(D, n), encoding="utf-8").read())
    c = n[:-len(".log")]
    if v["decl"] is None:
        sans_decl.append(c)
        # ⛔ LE POINT DE LA LECTURE : un journal sans « decl » est BENIN s'il porte quand meme un resume
        # dont le nombre EGALE les mordues comptees, sans abandon ni erreur de script.
        if not (v["mord"] > 0 and v["resume"] is not None and int(v["resume"]) == v["mord"]
                and v["abandon"] == 0 and v["erreur"] == 0):
            suspects.append(c)
    print(f"  {c:26s} {str(v['decl'] or '—'):>5s} {str(v['resume'] or '—'):>7s} {v['mord']:>5d} "
          f"{v['muet']:>5d} {v['nonm']:>5d} {v['abandon']:>8d} {v['erreur']:>4d} {v['prevol_vert']:>7d}")

print(f"\nsans « decl » : {len(sans_decl)} sur {len(noms)} (attendu 11) — {', '.join(sans_decl)}")
print(f"abandons de pre-vol sur les 26 : {sum(lire(io.open(os.path.join(D, n), encoding='utf-8').read())['abandon'] for n in noms)} (attendu 0)")
print(f"journaux sans « decl » qui NE sont PAS benins : {len(suspects)} (attendu 0)" + (f" — {', '.join(suspects)}" if suspects else ""))
print()
if sans_decl and not suspects:
    print("VERDICT : DEFAUT D'AFFICHAGE. Les journaux sans « decl » portent tous leur resume, avec le")
    print("  meme nombre que les mordues comptees, sans abandon de pre-vol ni erreur de script.")
    print("  ⚠ Ce que cette lecture NE dit pas : que la colonne soit sans consequence pour un LECTEUR —")
    print("    a D283, « decl = — » etait la signature de deux campagnes reellement abandonnees.")
else:
    print("VERDICT : NON BENIN — une campagne sans « decl » n'a pas declare de cibles. NE PAS CERTIFIER.")
sys.exit(1 if suspects else 0)
