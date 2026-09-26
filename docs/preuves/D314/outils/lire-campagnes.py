"""D314 — LECTURE DES CAMPAGNES DE LA CERTIFICATION QUI CLÔT LE RANG 23. COPIE de `docs/preuves/D310/outils/lire-campagnes.py`
(pièce de D310, non retouchée) — mêmes exigences 1 à 3 de Ko, même calibration à deux bras —, à laquelle s'ajoutent :
  POINT 12 (Ko, D313, 1b) — une campagne ne compte que si ses mesures ont DÉMARRÉ :
    · `rang23` et `available-on-api` : preuve LUE — `lecture-rang23.txt` (13 mesures, MORSURES LUES = DÉMARRÉES = 13)
      et `lecture-available-on-api.txt` (lecteur de D312 : 30 journaux, écarts 0, exécutés > 0 par cible) ;
    · les 26 autres : leur DURÉE dans la passe qui les certifie — la colonne « sec » de la table de `--tout`, ou la
      durée de `int-<harnais>.heures` — au-dessus de LEUR plancher, lu dans `docs/preuves/D314/plancher/plancher.txt`
      (commité AVANT toute mesure de la passe). ⚠ Un plancher ne voit pas une mutation qui empêche la spec de se charger
      (limite de Ko, écrite telle quelle au critère) : ces morsures s'écrivent « code de sortie seul ».
  LES QUATRE ÉTIQUETTES (décision 2c du relecteur, D313) : « lue » (chemin de l'argent : `rang23` ; hors du chemin :
    `available-on-api`, décision 2b) ; « code de sortie seul, non prouvée (R1) » (les dix autres harnais de la carte de
    D307 ; S11a-7 et S11a-11, décision de D311) ; « code de sortie seul, non classée » (tout le reste).
Usage, depuis la racine :
    python docs/preuves/D314/outils/lire-campagnes.py                     # calibration seule
    python docs/preuves/D314/outils/lire-campagnes.py <dossier de la passe>
CALIBRATION, ABANDON SI UN BRAS MANQUE (D286) :
  les deux bras de D310, tels quels (D299 : 186 lignes ✓ ; D308 : `solid-s1` sans `--int` REFUSÉE, avec `--int` acceptée) ;
  et deux bras du POINT 12 sur des cas dont la réponse est CONNUE :
  négatif  la passe versée de D310 : `available-on-api` y a 13 « ✓ » en 0 s, sans lecture — il doit NE PAS COMPTER ;
           et chaque harnais « autre », à SA durée de non-démarrage simulé la plus longue (sortie de l'étape 0), doit
           être REFUSÉ par son plancher ;
  positif  `argon2` à D310 (16 s) : il LIT le total de ses tests, donc un verdict prouve qu'il a démarré — accepté.
"""
import os
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

ANSI = re.compile(r"\x1b\[[0-9;]*[A-Za-z]")
src = open("docs/preuves/D310/outils/declarees.py", encoding="utf-8").read()
ns: dict = {}
exec(compile(src.split("\ntri = open(")[0], "declarees.py", "exec"), ns)
analyser = ns["analyser"]
tri = open("docs/preuves/D307/carte/tri.txt", encoding="utf-8").read()
m = re.search(r"HARNAIS DU CHEMIN DE L'ARGENT À HEAD \w+, carte de D304 \+ ce tri : (.*?)\. DEHORS", tri, re.S)
avant_et, _, apres_et = re.sub(r"\s+", " ", m.group(1)).partition(" — et ")
ARGENT = {x.strip() for x in avant_et.split(",") if x.strip()} | {apres_et.split(" ")[0].strip()}
ARGENT_CIBLES = {"s11a": ("S11a-7.", "S11a-11.")}      # décision du relecteur, D311 — par libellé, point final compris
LUS = {"rang23", "available-on-api"}
HARNAIS = {os.path.basename(p)[11:-3]: analyser(p)
           for p in sorted(os.path.join("neutralisation", f) for f in os.listdir("neutralisation")
                           if f.startswith("neutralize-") and f.endswith(".py"))}
PLANCHER = {}
for l in open("docs/preuves/D314/plancher/plancher.txt", encoding="utf-8"):
    if l.startswith("P "):
        _, nom, passe, p = l.split()
        PLANCHER[nom] = float(p)


def lire(chemin: str) -> str:
    return ANSI.sub("", open(chemin, "rb").read().decode("utf-8", errors="replace"))


def verdicts(texte: str):
    lignes = [l for l in texte.splitlines() if (l.startswith("✓ ") or l.startswith("✗ ")) and "vol" not in l]
    return lignes, sum(1 for l in lignes if l.startswith("✓ ")), sum(1 for l in lignes if l.startswith("✗ "))


def non_mesurees(texte: str) -> int:
    return sum(1 for l in texte.splitlines() if "NON MESUR" in l and ":" in l)


def crochets(nom: str, texte: str):
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


def demarrage(nom: str, duree, lecture_ok) -> tuple:
    """Point 12. Rend (prouvé ?, comment)."""
    if nom in LUS:
        return bool(lecture_ok), ("LUE" if lecture_ok else "lecture ABSENTE ou en défaut")
    if nom not in PLANCHER:
        return False, "AUCUN plancher déclaré"
    if duree is None:
        return False, "durée ABSENTE"
    return duree >= PLANCHER[nom], f"{duree:g} s {'≥' if duree >= PLANCHER[nom] else '<'} plancher {PLANCHER[nom]:g} s"


def etiquettes(nom: str, lignes_ok: list, lue: bool) -> dict:
    e = {"lue chemin": 0, "lue hors chemin": 0, "non prouvée (R1)": 0, "non classée": 0}
    for l in lignes_ok:
        if nom in LUS and lue:
            e["lue chemin" if nom in ARGENT else "lue hors chemin"] += 1
        elif nom in ARGENT or any(l.startswith("✓ " + p) for p in ARGENT_CIBLES.get(nom, ())):
            e["non prouvée (R1)"] += 1
        else:
            e["non classée"] += 1
    return e


def durees_tout(texte: str) -> dict:
    return {m.group(1): int(m.group(2)) for m in re.finditer(r"^neutralize-([\w-]+)\.py\s+\d+\s+\S+\s+\d+\s+\d+\s+\d+\s+(\d+)\s*$",
                                                             texte, re.M)}


# ------------------------------------------------------------------ CALIBRATION
print("== CALIBRATION (abandon si un seul bras manque)")
d299 = "docs/preuves/D299/passe/campagnes"
tot, nm = 0, {}
for f in sorted(os.listdir(d299)):
    t = lire(os.path.join(d299, f))
    tot += verdicts(t)[1]
    if non_mesurees(t):
        nm[f.removeprefix("neutralize-").removesuffix(".py.log")] = non_mesurees(t)
b1 = tot == 186 and nm == {"e3d1-s8": 5, "s11b": 4, "solid-s6": 4}
print(f"  {'✓' if b1 else '✗'} positif D299 : lignes ✓ {tot} (attendu 186) · non mesurées {nm}")
sans = lire("docs/preuves/D308/campagnes/campagne-solid-s1.txt")
avec = lire("docs/preuves/D308/campagnes/campagne-solid-s1-int.txt")
c_sans, c_avec = crochets("solid-s1", sans)[0], crochets("solid-s1", avec)[0]
b2 = verdicts(sans)[1] == 2 and c_sans == 0 and c_avec == 2
print(f"  {'✓' if b2 else '✗'} négatif D308 solid-s1 : crochets SANS --int {c_sans} (attendu 0) · AVEC --int {c_avec} (attendu 2)")
P310 = "docs/preuves/D310/passe-r23c-20260926-0032"
d310 = durees_tout(lire(os.path.join(P310, "campagnes-tout.log")))
aoa = demarrage("available-on-api", d310.get("available-on-api"), lecture_ok=False)
b3 = d310.get("available-on-api") == 0 and aoa[0] is False
print(f"  {'✓' if b3 else '✗'} négatif D310 : available-on-api {d310.get('available-on-api')} s, sans lecture ⇒ "
      f"{'REFUSÉ' if not aoa[0] else 'ACCEPTÉ'} (attendu REFUSÉ) — {aoa[1]}")
sim = {}
for l in open("docs/preuves/D314/plancher/simulation-sortie.txt", encoding="utf-8"):
    if l.startswith("T "):
        _, nom, _mode, _n, ta, tb, tmax, _m = l.split()
        sim[nom] = float(tmax)
refuses = [n for n, t in sim.items() if not demarrage(n, round(t), None)[0]]
b4 = len(sim) == 26 and sorted(refuses) == sorted(sim)
print(f"  {'✓' if b4 else '✗'} négatif ÉTAPE 0 : chacun des {len(sim)} harnais (attendu 26), à SA durée de non-démarrage la "
      f"plus longue (arrondie comme la table de --tout), REFUSÉ : {len(refuses)} (attendu {len(sim)})")
arg = demarrage("argon2", d310.get("argon2"), None)
b5 = d310.get("argon2") == 16 and arg[0] is True
print(f"  {'✓' if b5 else '✗'} positif D310 : argon2 ⇒ {'ACCEPTÉ' if arg[0] else 'REFUSÉ'} (attendu ACCEPTÉ) — {arg[1]}")
if not all((b1, b2, b3, b4, b5)):
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
dt = durees_tout(tout)
l23 = lire(os.path.join(D, "lecture-rang23.txt")) if os.path.isfile(os.path.join(D, "lecture-rang23.txt")) else ""
ml = re.search(r"MESURES LUES : (\d+) · MORSURES LUES : (\d+) · DÉMARRÉES \(exécutés > 0\) : (\d+)", l23)
lu = {"rang23": bool(ml) and ml.group(1) == ml.group(2) == ml.group(3) == "13"}
la = lire(os.path.join(D, "lecture-available-on-api.txt")) if os.path.isfile(os.path.join(D, "lecture-available-on-api.txt")) else ""
ma = re.search(r"journaux lus : (\d+) \(attendu 30\) · pré-vol (\d+) .* écarts (\d+) \(attendu 0\)", la)
lu["available-on-api"] = bool(ma) and ma.group(1) == "30" and ma.group(3) == "0"

print(f"\n{'harnais':18s} {'passe':6s} {'code':>4s} {'décl':>4s} {'joué':>4s} {'✓':>3s} {'✗':>3s} {'nonm':>4s} {'cro':>6s}  "
      f"{'démarrage (point 12)':44s} compte")
cert = {"mordues": 0, "muettes": 0, "non_mes": 0, "comptent": 0, "refus": []}
etq = {"lue chemin": 0, "lue hors chemin": 0, "non prouvée (R1)": 0, "non classée": 0}
for nom, r in HARNAIS.items():
    if r["verrou"]:
        passe = "--int"
        j = os.path.join(D, f"int-{nom}.log")
        code = open(os.path.join(D, f"int-{nom}.code")).read().strip() if os.path.isfile(j) else "—"
        h = os.path.join(D, f"int-{nom}.heures")
        mh = re.search(r"· (\d+) s ·", open(h, encoding="utf-8").read()) if os.path.isfile(h) else None
        duree = int(mh.group(1)) if mh else None
    else:
        passe = "--tout"
        j = os.path.join(D, "campagnes", f"neutralize-{nom}.py.log")
        code = codes_tout.get(f"neutralize-{nom}", "—")
        duree = dt.get(nom)
    if not os.path.isfile(j):
        cert["refus"].append(f"{nom} : journal ABSENT ({j})")
        print(f"{nom:18s} {passe:6s} JOURNAL ABSENT")
        continue
    t = lire(j)
    lignes, ok_, ko_ = verdicts(t)
    nmes = non_mesurees(t)
    cro = crochets(nom, t) if sum(r["mesures"].values()) > 0 else None
    dem, comment = demarrage(nom, duree, lu.get(nom))
    compte = (len(lignes) == r["n"] and ko_ == 0 and nmes == 0 and code == "0"
              and (cro is None or cro[0] == r["n"]) and dem)
    cert["comptent"] += compte
    if not compte:
        cert["refus"].append(f"{nom} : jouées {len(lignes)}/{r['n']}, ✗ {ko_}, non mesurées {nmes}, code {code}, "
                             f"démarrage {comment}" + (f", crochets {cro[0]}/{r['n']} {cro[1]}" if cro else ""))
    cert["mordues"] += ok_
    cert["muettes"] += ko_
    cert["non_mes"] += nmes
    e = etiquettes(nom, [l for l in lignes if l.startswith("✓ ")], bool(lu.get(nom)))
    for k in etq:
        etq[k] += e[k]
    print(f"{nom:18s} {passe:6s} {code:>4s} {r['n']:>4d} {len(lignes):>4d} {ok_:>3d} {ko_:>3d} {nmes:>4d} "
          f"{(str(cro[0]) + '/' + str(r['n'])) if cro else '—':>6s}  {comment:44s} {'OUI' if compte else 'NON'}  "
          + " · ".join(f"{k} {v}" for k, v in e.items() if v))

tot_decl = sum(r["n"] for r in HARNAIS.values())
print(f"\nCERTIFIANT : {cert['mordues']} mordues · {cert['muettes']} muettes · {cert['non_mes']} non mesurées · "
      f"{cert['comptent']} campagnes qui COMPTENT sur {len(HARNAIS)} (attendu {len(HARNAIS)}) · déclarées {tot_decl}")
print("ÉTIQUETTES : " + " · ".join(f"{k} {v}" for k, v in etq.items()) + f" · somme {sum(etq.values())}")
for x in cert["refus"]:
    print(f"  ⛔ NE COMPTE PAS : {x}")
sys.exit(0 if not cert["refus"] else 1)
