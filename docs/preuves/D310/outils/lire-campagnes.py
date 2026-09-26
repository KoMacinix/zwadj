"""D310 — LECTURE DES CAMPAGNES D'UNE PASSE DE CERTIFICATION (rang 23). Procédure archivée comme preuve (D291),
jamais promue en instrument. N'écrit rien : elle imprime.
Usage, depuis la racine :
    python docs/preuves/D310/outils/lire-campagnes.py <dossier de la passe>
Le dossier porte : `campagnes-tout.log` (sortie de `lancer-campagnes.py --tout`), `campagnes/neutralize-*.py.log` (les
journaux par harnais de CETTE passe, copiés après `--tout`), `int-<harnais>.log` et `.code` (rejeux `--int`), et
`lecture-rang23.txt` (lecture des journaux de `rang23`).

LES EXIGENCES DE KO (26/09/2026), ET COMMENT ELLES SONT TENUES :
  1. « TOUTES les campagnes » : les 28 `neutralize-*.py` énumérés par `declarees.py` (AST) doivent avoir un journal.
  2. « Une campagne ne compte que si elle prouve avoir joué ses cibles déclarées : nombre de cibles jouées = nombre
     déclaré. » Jouées = lignes de verdict de cible (« ✓ » ou « ✗ » en tête, hors pré-vol) dans la sortie de la passe
     qui CERTIFIE le harnais — `--int` s'il est verrouillé, `--tout` sinon.
  3. « Un 0 dont les cibles d'intégration n'ont pas été jouées ne compte pas » : pour les 9 harnais à mesures
     d'intégration, chaque ligne de verdict porte entre crochets les mesures JOUÉES ; elle doit porter EXACTEMENT les
     mesures que la cible déclare (lues dans l'AST). Moins = intégration non jouée ⇒ la campagne NE COMPTE PAS.
  4. R1 en pause (D307) : sur le chemin de l'argent (11 harnais, pièce de D307), une morsure non LUE s'écrit « code de
     sortie seul, non prouvée (R1) » ; `rang23` est LU si `lecture-rang23.txt` rend ses 13 morsures.
CALIBRATION À DEUX BRAS, sur des pièces VERSÉES dont la réponse est connue, ABANDON si un bras manque (D286) :
  positif  les 27 journaux de la passe 2 de D299 (`docs/preuves/D299/passe/campagnes/`) : 186 lignes de verdict,
           exactement le « 186 mordues » certifié, et 13 non mesurées sur e3d1-s8 (5), s11b (4), solid-s6 (4) ;
  négatif  `solid-s1` de D308 SANS `--int` (`campagne-solid-s1.txt`) : 2 cibles jouées = 2 déclarées, et pourtant
           l'intégration n'a pas tourné — le contrôle des crochets doit la REFUSER ; la même AVEC `--int`
           (`campagne-solid-s1-int.txt`) doit PASSER.
"""
import importlib.util
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
ici = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location("declarees_ast", os.path.join(ici, "declarees.py"))
# ⚠ `declarees.py` est un SCRIPT (il imprime) : on n'en importe que la fonction, en isolant son exécution.
src = open(os.path.join(ici, "declarees.py"), encoding="utf-8").read()
ns: dict = {}
exec(compile(src.split("\ntri = open(")[0], "declarees.py", "exec"), ns)  # analyser() et ses imports, rien d'autre
analyser = ns["analyser"]
tri = open("docs/preuves/D307/carte/tri.txt", encoding="utf-8").read()
m = re.search(r"HARNAIS DU CHEMIN DE L'ARGENT À HEAD \w+, carte de D304 \+ ce tri : (.*?)\. DEHORS", tri, re.S)
avant_et, _, apres_et = re.sub(r"\s+", " ", m.group(1)).partition(" — et ")
ARGENT = {x.strip() for x in avant_et.split(",") if x.strip()} | {apres_et.split(" ")[0].strip()}

HARNAIS = {os.path.basename(p)[11:-3]: analyser(p)
           for p in sorted(os.path.join("neutralisation", f) for f in os.listdir("neutralisation")
                           if f.startswith("neutralize-") and f.endswith(".py"))}


def lire(chemin: str) -> str:
    return ANSI.sub("", open(chemin, "rb").read().decode("utf-8", errors="replace"))


def verdicts(texte: str):
    lignes = [l for l in texte.splitlines() if (l.startswith("✓ ") or l.startswith("✗ ")) and "vol" not in l]
    return lignes, sum(1 for l in lignes if l.startswith("✓ ")), sum(1 for l in lignes if l.startswith("✗ "))


def non_mesurees(texte: str) -> int:
    return sum(1 for l in texte.splitlines() if "NON MESUR" in l and ":" in l)


def crochets(nom: str, texte: str):
    """Pour un harnais à mesures d'intégration : cibles dont la ligne ✓ porte EXACTEMENT les mesures déclarées."""
    r = HARNAIS[nom]
    conformes, ecarts = 0, []
    for libelle, mes in r["par_cible"]:
        ligne = next((l for l in texte.splitlines() if l.startswith("✓ " + str(libelle))), None)
        m2 = re.search(r"\[([^\]]*)\]\s*$", ligne) if ligne else None
        jouees = [x.strip() for x in m2.group(1).split(",")] if m2 else None
        if jouees is not None and mes is not None and sorted(jouees) == sorted(mes):
            conformes += 1
        else:
            ecarts.append((str(libelle).split(".")[0], mes, jouees))
    return conformes, ecarts


# ------------------------------------------------------------------ CALIBRATION
print("== CALIBRATION, deux bras (abandon si un seul manque)")
d299 = "docs/preuves/D299/passe/campagnes"
tot, nm = 0, {}
for f in sorted(os.listdir(d299)):
    t = lire(os.path.join(d299, f))
    tot += verdicts(t)[1]
    if non_mesurees(t):
        # ⚠ Premier découpage FAUTIF (`f[11:-6]` laissait « e3d1-s8. ») : le bras positif l'a refusé.
        nm[f.removeprefix("neutralize-").removesuffix(".py.log")] = non_mesurees(t)
pos = tot == 186 and nm == {"e3d1-s8": 5, "s11b": 4, "solid-s6": 4}
print(f"  {'✓' if pos else '✗'} positif D299 : {len(os.listdir(d299))} journaux · lignes ✓ {tot} (attendu 186) · "
      f"non mesurées {nm} (attendu e3d1-s8 5, s11b 4, solid-s6 4)")
sans = lire("docs/preuves/D308/campagnes/campagne-solid-s1.txt")
avec = lire("docs/preuves/D308/campagnes/campagne-solid-s1-int.txt")
c_sans, c_avec = crochets("solid-s1", sans)[0], crochets("solid-s1", avec)[0]
neg = verdicts(sans)[1] == 2 and c_sans == 0 and c_avec == 2
print(f"  {'✓' if neg else '✗'} négatif D308 solid-s1 : SANS --int, jouées {verdicts(sans)[1]} (attendu 2) mais crochets "
      f"conformes {c_sans} (attendu 0 : REFUSÉE) · AVEC --int, crochets conformes {c_avec} (attendu 2)")
if not (pos and neg):
    print("✗ ABANDON — calibration manquée.")
    sys.exit(2)
if len(sys.argv) < 2:
    print("(calibration seule : aucun dossier de passe donné)")
    sys.exit(0)

# ------------------------------------------------------------------ LA PASSE
D = sys.argv[1]
print(f"\n== PASSE : {D}")
tout = lire(os.path.join(D, "campagnes-tout.log"))
m = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) "
              r"campagne\(s\) · (\d+)s", tout)
print(f"`--tout`, ligne MESURÉ : {m.groups() if m else 'ABSENTE'}")
codes_tout = dict(re.findall(r"^(neutralize-[\w-]+)\.py\s+(\d+)\s", tout, re.M))
lecture = os.path.join(D, "lecture-rang23.txt")
lecture_t = lire(lecture) if os.path.isfile(lecture) else ""
ml = re.search(r"MESURES LUES : (\d+) · MORSURES LUES : (\d+)", lecture_t)
rang23_lu = bool(ml) and ml.group(1) == ml.group(2) == "13"

print(f"\n{'harnais':18s} {'passe':6s} {'code':>4s} {'décl':>4s} {'jouées':>6s} {'✓':>3s} {'✗':>3s} {'nonm':>4s} "
      f"{'crochets':>8s}  compte ?  lecture (R1)")
cert = {"mordues": 0, "muettes": 0, "non_mes": 0, "comptent": 0, "refus": []}
r1 = {"lues": 0, "code_seul": 0, "hors": 0}
for nom, r in HARNAIS.items():
    if r["verrou"]:
        passe = "--int"
        j = os.path.join(D, f"int-{nom}.log")
        code = open(os.path.join(D, f"int-{nom}.code")).read().strip() if os.path.isfile(j) else "—"
    else:
        passe = "--tout"
        j = os.path.join(D, "campagnes", f"neutralize-{nom}.py.log")
        code = codes_tout.get(f"neutralize-{nom}", "—")
    if not os.path.isfile(j):
        cert["refus"].append(f"{nom} : journal ABSENT ({j})")
        print(f"{nom:18s} {passe:6s} JOURNAL ABSENT")
        continue
    t = lire(j)
    lignes, ok_, ko_ = verdicts(t)
    nmes = non_mesurees(t)
    a_int = sum(r["mesures"].values()) > 0
    cro = crochets(nom, t) if a_int else None
    compte = (len(lignes) == r["n"] and ko_ == 0 and nmes == 0 and code == "0"
              and (cro is None or cro[0] == r["n"]))
    if compte:
        cert["comptent"] += 1
    else:
        cert["refus"].append(f"{nom} : jouées {len(lignes)}/{r['n']}, ✗ {ko_}, non mesurées {nmes}, code {code}"
                             + (f", crochets {cro[0]}/{r['n']} {cro[1]}" if cro else ""))
    cert["mordues"] += ok_
    cert["muettes"] += ko_
    cert["non_mes"] += nmes
    if nom in ARGENT:
        if nom == "rang23" and rang23_lu:
            lec = "LUE (13 sur 13)"
            r1["lues"] += ok_
        else:
            lec = "code de sortie seul, non prouvées (R1)"
            r1["code_seul"] += ok_
    else:
        lec = "hors chemin de l'argent — au code"
        r1["hors"] += ok_
    print(f"{nom:18s} {passe:6s} {code:>4s} {r['n']:>4d} {len(lignes):>6d} {ok_:>3d} {ko_:>3d} {nmes:>4d} "
          f"{(str(cro[0]) + '/' + str(r['n'])) if cro else '—':>8s}  {'OUI' if compte else 'NON':8s} {lec}")

tot_decl = sum(r["n"] for r in HARNAIS.values())
print(f"\nCERTIFIANT : {cert['mordues']} mordues · {cert['muettes']} muettes · {cert['non_mes']} non mesurées · "
      f"{cert['comptent']} campagnes qui COMPTENT sur {len(HARNAIS)} (attendu {len(HARNAIS)}) · déclarées {tot_decl}")
print(f"R1 (chemin de l'argent) : LUES {r1['lues']} · code de sortie seul, non prouvées (R1) {r1['code_seul']} · "
      f"hors chemin {r1['hors']}")
for x in cert["refus"]:
    print(f"  ⛔ NE COMPTE PAS : {x}")
sys.exit(0 if not cert["refus"] else 1)
