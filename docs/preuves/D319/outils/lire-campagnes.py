"""D319 — LECTURE DES CAMPAGNES DE LA CERTIFICATION QUI CLÔT LE RANG 27 (couvre D316 et D317). COPIE de
`docs/preuves/D314/outils/lire-campagnes.py` (pièce de D314, non retouchée dans sa logique d'origine) — mêmes
exigences 1 à 3 de Ko, même calibration, même POINT 12, mêmes QUATRE ÉTIQUETTES —, à laquelle s'ajoutent DEUX
extensions, rendues nécessaires par `r25` et `r26`, qui n'existaient pas à D314 :

  1. UNE TROISIÈME FORME DE « PASSE QUI CERTIFIE » : jusqu'à D314, un harnais était soit VERROUILLÉ par `--int`
     (journal `int-<nom>.log`), soit joué par `--tout` seul. `r26` n'a AUCUNE cible unitaire — verrou `--int` =
     False (rien à verrouiller) — et pourtant AUCUNE de ses cibles ne joue sous `--tout` : elles sont toutes
     verrouillées par `--e2e`. Le journal qui le certifie est donc `e2e-<nom>.log` (rejeu `--e2e`, D319), jamais
     `campagnes/neutralize-<nom>.py.log`. `r25`, lui, reste sous `int-r25.log` : il EST verrouillé par `--int`, et
     D319 le rejoue avec les DEUX drapeaux combinés dans la MÊME invocation (son docstring : « les deux drapeaux
     se combinent ») — son journal `--int` porte donc déjà ses 11 cibles, rien à ajouter pour lui.
  2. `r25` ET `r26` ENTRENT DANS `LUS` : POINT 12 PAR PREUVE LUE, PAS PAR PLANCHER. Un plancher de non-démarrage
     simulé (étape 0 de D314) n'a été mesuré QUE pour les 26 harnais inchangés depuis `0057748` (vérifié par
     `git diff --name-only 0057748 HEAD -- neutralisation/` : SEULS `neutralize-r25.py` et `neutralize-r26.py` ont
     changé) ; l'étendre à ces deux-là exigerait soit une nouvelle simulation de non-démarrage (la cale de `passe.py`
     résout `pnpm`/`node` — `r25`/`r26` invoquent `playwright` via `pnpm … exec playwright test …`, une forme non
     éprouvée par la cale de D314), soit de les traiter PAR LE PLANCHER d'un harnais sans rapport, ce qu'aucun des
     deux ne justifie. ⇒ **Choix, déclaré et motivé** : ils prouvent leur démarrage par LECTURE DIRECTE de deux
     preuves DÉJÀ PRÉSENTES dans leur propre journal, sans instrument externe supplémentaire — contrairement à
     `available-on-api`, dont l'historique (D310 : 13 cibles comptées MORDUES sans qu'aucune n'ait démarré) a
     justifié un lecteur INDÉPENDANT à 30 journaux (D312). `r25` et `r26` n'ont pas cet historique : ils sont nés
     après lui, avec sa leçon déjà incorporée (calibration embarquée, « ancre → marqueur » par cible) :
       (a) leur PROPRE calibration embarquée (6 à 10 bras, imprimée au tout début de chaque run, AVANT la moindre
           cible) porte une ligne « calibration : N bras · 0 manqué(s) » — exigé 0 manqué(s) ;
       (b) CHAQUE ligne « ✓ <cible> » porte, en clair, le compte de tests COLLECTÉS par cette cible précise :
           « passés X · en échec Y » (vitest) ou « ok X · x Y » (playwright) — exigé X+Y > 0, machine identique au
           critère de R1 (« une sortie lue qui montre des tests collectés ») appliqué CIBLE PAR CIBLE, pas au total.
     ⚠ Ce n'est PAS la même profondeur de preuve que `lire-aoa.py` (pas de rejeu sur 30 journaux indépendants) —
     c'est la profondeur que justifie leur histoire, écrite ici pour qu'elle ne se lise pas comme plus forte
     qu'elle n'est.
Usage, depuis la racine :
    python docs/preuves/D319/outils/lire-campagnes.py                     # calibration seule
    python docs/preuves/D319/outils/lire-campagnes.py <dossier de la passe>
CALIBRATION, ABANDON SI UN BRAS MANQUE (D286) : les cinq bras de D314, REJOUÉS SUR SES PROPRES PIÈCES (inchangées) ;
PLUS deux bras sur la lecture r25/r26 :
  positif  le journal `int-r25.log` de D314... — ABSENT (r25 n'existait pas) : remplacé par un journal RÉEL,
           produit par cette session et versé à côté de ce script (`calibration-r25-positif.log`), où le lecteur
           doit ACCEPTER (collecte > 0 sur chaque cible, calibration embarquée 0 manqué) ;
  négatif  une COPIE de ce même journal où une ligne « ✓ » est réécrite sans son compte de collecte (« passés 0 ·
           en échec 0 ») : le lecteur doit REFUSER cette cible précise.
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
LUS = {"rang23", "available-on-api", "r25", "r26"}     # [D319] r25, r26 ajoutés — motif en tête de fichier
_FICHIERS_NEUTR = sorted(f for f in os.listdir("neutralisation")
                         if f.startswith("neutralize-") and f.endswith(".py"))
E2E_SEUL = [f[len("neutralize-"):-3] for f in _FICHIERS_NEUTR
           if '"--e2e" in argv' in open(os.path.join("neutralisation", f), encoding="utf-8").read()
           and not analyser(os.path.join("neutralisation", f))["verrou"]]   # [D319] — r26, et quiconque lui ressemblerait
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


# [D319] — motif (2b) : collecte > 0, lue sur CHAQUE ligne « ✓ », jamais sur le total du harnais.
COLLECTE = re.compile(r"passés (\d+) · en échec (\d+)|ok (\d+) · x (\d+)")


def lecture_directe(texte: str) -> tuple[bool, str]:
    """[D319] Preuve LUE pour r25/r26 : calibration embarquée à 0 manqué, PUIS collecte > 0 sur CHAQUE ✓.

    ⚠ Le compte de collecte (« passés X · en échec Y » ou « ok X · x Y ») n'est PAS sur la ligne « ✓ <cible> »
    elle-même, qui ne porte que le TITRE : il est sur la ligne suivante (« ancre … · … · passés … »), relevé en
    la lisant plutôt qu'en le supposant sur la même ligne (mesuré sur `calibration-r25-positif.log`)."""
    cal = re.search(r"calibration : (\d+) bras · (\d+) manqué", texte)
    if not cal or cal.group(2) != "0":
        return False, f"calibration embarquée ABSENTE ou manquée ({cal.groups() if cal else None}, attendu (*, 0))"
    lignes_brutes = texte.splitlines()
    cibles = [(i, l) for i, l in enumerate(lignes_brutes) if l.startswith("✓ ")]
    if not cibles:
        return False, "aucune ligne ✓ — rien n'a démarré"
    manquantes = []
    for i, l in cibles:
        suite = lignes_brutes[i + 1] if i + 1 < len(lignes_brutes) else ""
        c = COLLECTE.search(suite)
        if not c:
            manquantes.append(l.split(".")[0])
            continue
        a, b, c2, d = (int(x) if x else 0 for x in c.groups())
        if a + b + c2 + d <= 0:
            manquantes.append(l.split(".")[0])
    if manquantes:
        return False, f"collecte absente ou nulle sur {manquantes}"
    return True, f"calibration {cal.group(1)} bras 0 manqué · collecte > 0 sur {len(cibles)} cible(s)"


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
# [D319] deux bras sur `lecture_directe`, calibrés sur un journal RÉEL versé à côté de ce script.
CAL_DIR = os.path.join(os.path.dirname(__file__))
pos_path = os.path.join(CAL_DIR, "calibration-r25-positif.log")
pos_texte = lire(pos_path) if os.path.isfile(pos_path) else ""
pos_ok, pos_comment = lecture_directe(pos_texte) if pos_texte else (False, "journal de calibration ABSENT")
b6 = pos_ok is True
print(f"  {'✓' if b6 else '✗'} positif D319 : journal réel r25 ⇒ {'ACCEPTÉ' if pos_ok else 'REFUSÉ'} (attendu ACCEPTÉ) — {pos_comment}")
neg_texte = re.sub(r"· passés \d+ · en échec \d+ ·", "· passés 0 · en échec 0 ·", pos_texte, count=1) if pos_texte else ""
neg_ok, neg_comment = lecture_directe(neg_texte) if neg_texte else (True, "journal de calibration ABSENT")
b7 = neg_ok is False
print(f"  {'✓' if b7 else '✗'} négatif D319 : même journal, R25-1 sans collecte ⇒ {'REFUSÉ' if not neg_ok else 'ACCEPTÉ'} (attendu REFUSÉ) — {neg_comment}")
if not all((b1, b2, b3, b4, b5, b6, b7)):
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
# [D319] r25 (journal int-r25.log, les deux drapeaux combinés) et r26 (journal e2e-r26.log) : preuve lue DIRECTE.
for nom, jnom in (("r25", "int-r25.log"), ("r26", "e2e-r26.log")):
    jp = os.path.join(D, jnom)
    ok, _ = lecture_directe(lire(jp)) if os.path.isfile(jp) else (False, "journal absent")
    lu[nom] = ok

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
    elif nom in E2E_SEUL:        # [D319] — harnais sans aucune cible --tout/--int : certifié par --e2e seul
        passe = "--e2e"
        j = os.path.join(D, f"e2e-{nom}.log")
        code = open(os.path.join(D, f"e2e-{nom}.code")).read().strip() if os.path.isfile(j) else "—"
        h = os.path.join(D, f"e2e-{nom}.heures")
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
    # [D319] DÉFAUT D'INSTRUMENT TROUVÉ EN LISANT CETTE PASSE, CORRIGÉ ICI (D298) : `crochets()` exige qu'une
    # ligne « ✓ » se termine par « [mesure1, mesure2] » — la convention des harnais VITEST d'origine. `r25`
    # porte bien une mesure « int-compte » (donc `sum(mesures.values()) > 0`), mais son détail par cible vit
    # sur la ligne SUIVANTE (« ancre … · passés … »), JAMAIS en crochets — vérifié sur `int-r25.log` de CETTE
    # passe : une seule occurrence de « [ » dans tout le fichier, hors d'une ligne de verdict. Sans cette
    # exclusion, ses 11 cibles, pourtant mordues et LUES, étaient rejetées par un contrôle qui ne les concerne
    # pas — pas une preuve que la mesure a manqué.
    cro = crochets(nom, t) if sum(r["mesures"].values()) > 0 and nom != "r25" else None
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
