"""D314 — ÉTAPE 0 DE LA CERTIFICATION QUI CLÔT LE RANG 23 : LE PLANCHER DE DURÉE DU POINT 12, MESURÉ SUR UN NON-DÉMARRAGE
SIMULÉ (commande introuvable), SANS MODIFIER AUCUN HARNAIS (arbitrage de Ko, D313, 1b). Procédure archivée comme preuve
(D291), jamais promue en instrument ; sous `docs/preuves/` et pas dans `neutralisation/` (D299 : elle ferait compter la
certification). Usage, depuis la racine, arbre PROPRE :
    python docs/preuves/D314/plancher/simuler-non-demarrage.py

⛔ LA MÉTHODE : UNE CALE DE `PATH`, JAMAIS UNE RETOUCHE DE HARNAIS. Tous les harnais lancent leur mesure par `pnpm` (ou,
pour `budgets`, par `node`), résolus par `shutil.which` — relevé dans le source (D313). Un dossier placé EN TÊTE du `PATH`
porte un `pnpm.cmd` et un `node.cmd` qui les remplacent ; chaque harnais est joué TEL QUEL (`python <harnais> [--int]`),
chronométré de l'extérieur comme `lancer-campagnes.py` le fait (un `subprocess.run` autour du processus), et chaque appel
qui traverse la cale est JOURNALISÉ. Deux niveaux, parce que « commande introuvable » a deux formes au dépôt :
  A — la commande que le harnais lance est introuvable (la classe de D310 : « 'apps' is not recognized ») : la cale
      appelle un nom qui n'existe pas ; rien ne démarre ;
  B — `pnpm` démarre, et la commande qu'il doit exécuter est introuvable (la sonde S4 de D312) : la cale réécrit la cible
      de `exec` (ou le script de `run`, ou le module de `node`) en un nom qui n'existe pas, et lance le VRAI `pnpm` (ou
      `node`) avec le `PATH` d'origine. Une forme d'appel non reconnue n'est PAS lancée (code 127, écrite « NON RÉÉCRIT »).
⇒ Le non-démarrage le plus LONG des deux est celui que le plancher doit dépasser : c'est B (le coût de démarrage de `pnpm`).

CE QUI EST MESURÉ, par harnais et par mode (la passe qui le CERTIFIE : `--int` s'il est verrouillé, sans option sinon —
exigence de Ko, D310) : la durée, le code, les lignes « ✓ » sans « vol » et « ✗ » (ce que compte `lancer-campagnes.py`),
les appels qui ont traversé la cale (> 0 exigé : sinon rien n'a été simulé), les appels NON RÉÉCRITS (0 exigé), et l'arbre
après (`.neutralisation-sauvegarde` sans fichier — un dossier VIDE est le reliquat d'un harnais qui abandonne, retiré à
son démarrage suivant ; un fichier dedans serait une mutation non restaurée — et `git status --porcelain` IDENTIQUE à celui du départ exigé — qui ne porte que les pièces non suivies de cette étape 0 — sinon ARRÊT, on ne mute pas plus loin sur un arbre sale).
PÉRIMÈTRE : les 26 harnais « autres » (Ko : tous sauf `rang23` et `available-on-api`, qui prouvent par une preuve LUE).

CALIBRATION, À DEUX BRAS, AVANT TOUTE MESURE (D286 ; abandon si un bras manque) :
  (a) la cale elle-même : A rend un code non nul sans ligne « Tests » ; B réécrit `exec vitest` et rend le « not found »
      de `pnpm` ; B refuse une forme non reconnue (`pnpm --version`) sans rien lancer ;
  (b) BRAS POSITIF — un harnais qui LIT sa sortie constate lui-même le non-démarrage : `available-on-api` sous A et sous
      B doit imprimer « NON DÉMARRÉE » pour sa mutation connue (iv), là où, sans cale, il rend « MORDUE » (D312) ;
  (c) BRAS NÉGATIF — sans cale, la même mesure voit un vrai démarrage : `argon2` (3 cibles), joué sans cale par la même
      fonction, rend 3 lignes « ✓ », 0 appel de cale, et une durée au-dessus de ses deux non-démarrages simulés.
N'écrit que : `.neutralisation-journaux/D314-plancher/` (ignoré par git : cales et journaux par harnais) et
`simulation-sortie.txt` à côté de ce script. Les journaux sont versés APRÈS, par copie vérifiée.
"""
import ast
import json
import os
import re
import shutil
import subprocess
import sys
import time

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE.")
ICI = os.path.dirname(os.path.abspath(__file__))
TRAVAIL = os.path.join(".neutralisation-journaux", "D314-plancher")
SORTIE = os.path.join(ICI, "simulation-sortie.txt")
PY = sys.executable
PNPM, NODE = shutil.which("pnpm"), shutil.which("node")
PATH_REEL = os.environ["PATH"]
LUS = {"rang23", "available-on-api"}
lignes_sortie: list = []


def dire(msg: str = "") -> None:
    print(msg, flush=True)
    lignes_sortie.append(msg)


def statut() -> str:
    return subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], capture_output=True, text=True,
                          encoding="utf-8").stdout.strip()


if not PNPM or not NODE:
    sys.exit("✗ pnpm ou node introuvable AVANT la cale : rien à simuler.")
# L'état de départ ne porte QUE les pièces non suivies de cette étape 0 (sous docs/preuves/D314/) ; après chaque harnais,
# l'état doit lui être IDENTIQUE — un harnais qui laisserait une source mutée le ferait bouger.
STATUT0 = statut()
if any(not l.startswith("?? docs/preuves/D314/") for l in STATUT0.splitlines()):
    sys.exit(f"✗ ARBRE NON PROPRE hors docs/preuves/D314/ : {STATUT0!r} — la simulation mute des sources par les harnais.")
if os.path.exists(TRAVAIL):
    shutil.rmtree(TRAVAIL)
os.makedirs(TRAVAIL)

# ------------------------------------------------------------------ les cales
CALE_B_PY = os.path.join(os.path.abspath(TRAVAIL), "cale_b.py")
open(CALE_B_PY, "w", encoding="utf-8").write('''import json, os, subprocess, sys
sys.stderr.reconfigure(encoding="utf-8")
outil, args = sys.argv[1], sys.argv[2:]
nouveaux, reecrit = list(args), None
if outil == "pnpm":
    for mot, faux in (("exec", "zwadj-commande-introuvable-d314"), ("run", "zwadj-script-introuvable-d314")):
        if mot in nouveaux and nouveaux.index(mot) + 1 < len(nouveaux):
            i = nouveaux.index(mot) + 1
            reecrit = [mot, nouveaux[i]]
            nouveaux[i] = faux
            break
else:
    for i, a in enumerate(nouveaux):
        if a.endswith((".mjs", ".cjs", ".js")):
            reecrit = ["module", a]
            nouveaux[i] = os.path.join(os.path.dirname(a), "zwadj-module-introuvable-d314.mjs")
            break
with open(os.environ["ZWADJ_D314_CALE"], "a", encoding="utf-8") as f:
    f.write(json.dumps({"niveau": "B", "outil": outil, "reecrit": reecrit, "args": args}, ensure_ascii=False) + "\\n")
if reecrit is None:
    print("CALE B : forme d'appel non reconnue, NON RÉÉCRIT — rien n'est lancé", file=sys.stderr)
    sys.exit(127)
reel = os.environ["ZWADJ_D314_PNPM"] if outil == "pnpm" else os.environ["ZWADJ_D314_NODE"]
sys.exit(subprocess.run([reel, *nouveaux], env={**os.environ, "PATH": os.environ["ZWADJ_D314_PATH_REEL"]}).returncode)
''')
CALES = {}
for niveau in ("A", "B"):
    d = os.path.abspath(os.path.join(TRAVAIL, f"cale-{niveau}"))
    os.makedirs(d)
    for outil in ("pnpm", "node"):
        if niveau == "A":
            corps = f'@echo A {outil}>>"%ZWADJ_D314_CALE%"\r\n@zwadj-commande-introuvable-d314\r\n'
        else:
            corps = f'@"{PY}" "{CALE_B_PY}" {outil} %*\r\n'
        open(os.path.join(d, f"{outil}.cmd"), "w", encoding="utf-8", newline="").write(corps)
    CALES[niveau] = d


def environnement(niveau, journal_cale):
    env = {**os.environ, "ZWADJ_D314_PNPM": PNPM, "ZWADJ_D314_NODE": NODE, "ZWADJ_D314_PATH_REEL": PATH_REEL,
           "ZWADJ_D314_CALE": os.path.abspath(journal_cale)}
    if niveau:
        env["PATH"] = CALES[niveau] + os.pathsep + PATH_REEL
    return env


def jouer(nom: str, argv: list, niveau, etiquette: str) -> dict:
    """Joue UN harnais tel quel, sous la cale `niveau` (None = sans cale). Chronomètre de l'extérieur."""
    base = os.path.join(TRAVAIL, f"{etiquette}-{nom}{'-int' if '--int' in argv else ''}")
    jc = base + ".cale.txt"
    open(jc, "w").close()
    debut = time.perf_counter()
    r = subprocess.run([PY, f"neutralisation/neutralize-{nom}.py", *argv], capture_output=True, text=True,
                       encoding="utf-8", errors="replace", env=environnement(niveau, jc))
    duree = time.perf_counter() - debut
    sortie = (r.stdout or "") + "\n--- stderr ---\n" + (r.stderr or "")
    open(base + ".log", "w", encoding="utf-8", newline="").write(sortie + f"\n--- code de sortie : {r.returncode} ---\n")
    appels = [l for l in open(jc, encoding="utf-8").read().splitlines() if l.strip()]
    non_reecrits = sum(1 for l in appels if l.startswith("{") and json.loads(l)["reecrit"] is None)
    reliquats = retirer_reliquats()
    st = statut()
    return {"nom": nom, "mode": "--int" if "--int" in argv else "tout", "niveau": niveau or "—", "duree": duree,
            "code": r.returncode, "mordues": len([l for l in sortie.splitlines() if l.startswith("✓ ") and "vol" not in l]),
            "muettes": len([l for l in sortie.splitlines() if l.startswith("✗ ")]), "appels": len(appels),
            "non_reecrits": non_reecrits, "tests": len(re.findall(r"^\s*Tests\s+\d", sortie, re.M)), "sortie": sortie,
            "statut": st, "reliquats": reliquats, "sauvegarde": bool(os.path.isdir(".neutralisation-sauvegarde") and os.listdir(".neutralisation-sauvegarde"))}


def retirer_reliquats() -> list:
    """⚠ Quatre harnais (`act-plafonds`, `argon2`, `budgets`, `horloge`) copient leurs sources en `<source>.sauvegarde`
    AVANT leur pré-vol, et ne les purgent qu'en fin de campagne : sous un non-démarrage, ils meurent entre les deux et
    laissent la copie (relevé au passage 3 — `arret-passage-3.txt`). Un tel reliquat n'est RETIRÉ que s'il est
    octet pour octet la source, et que la source est celle de `HEAD` ; sinon il reste, et l'arbre ne revient pas à son
    état de départ ⇒ ARRÊT. Chaque retrait est rendu, jamais silencieux."""
    retires = []
    for l in statut().splitlines():
        if not (l.startswith("?? ") and l.endswith(".sauvegarde")) or l in STATUT0.splitlines():
            continue
        copie = l[3:]
        source = copie[: -len(".sauvegarde")]
        intacte = os.path.isfile(source) and subprocess.run(["git", "diff", "--quiet", "HEAD", "--", source]).returncode == 0
        if intacte and open(copie, "rb").read() == open(source, "rb").read():
            os.remove(copie)
            retires.append(copie)
    return retires


def arret_si_sale(r: dict) -> None:
    if r["statut"] != STATUT0 or r["sauvegarde"]:
        dire(f"⛔ ARRÊT : arbre NON PROPRE après {r['nom']} ({r['niveau']}) — statut {r['statut']!r}, sauvegarde "
             f"{r['sauvegarde']}. Rien de plus n'est joué.")
        open(SORTIE, "w", encoding="utf-8", newline="\n").write("\n".join(lignes_sortie) + "\n")
        sys.exit(3)


# ------------------------------------------------------------------ énumération (arbre syntaxique, rien d'exécuté)
_src = open("docs/preuves/D310/outils/declarees.py", encoding="utf-8").read()
_ns: dict = {}
exec(compile(_src.split("\ntri = open(")[0], "declarees.py", "exec"), _ns)
HARNAIS = {}
for f in sorted(os.listdir("neutralisation")):
    if f.startswith("neutralize-") and f.endswith(".py"):
        a = _ns["analyser"](os.path.join("neutralisation", f))
        HARNAIS[f[len("neutralize-"):-3]] = a
dire(f"== ÉNUMÉRATION : {len(HARNAIS)} harnais (attendu 28) · autres que {sorted(LUS)} : "
     f"{len([h for h in HARNAIS if h not in LUS])} (attendu 26)")
dire(f"   pnpm réel : {PNPM} · node réel : {NODE} · python : {PY}")

# ------------------------------------------------------------------ calibration (a) : la cale elle-même
dire("\n== CALIBRATION (a) — la cale elle-même")
manques = 0
spec = "src/venues/venues-public.service.spec.ts"
for niveau, args, attendu in (("A", ["--filter", "@zwadj/api", "exec", "vitest", "run", spec], "code≠0, pas de Tests"),
                              ("B", ["--filter", "@zwadj/api", "exec", "vitest", "run", spec], "réécrit exec vitest, code≠0, pas de Tests"),
                              ("B", ["--version"], "NON RÉÉCRIT, code 127")):
    jc = os.path.join(TRAVAIL, f"calib-a-{niveau}-{len(args)}.cale.txt")
    open(jc, "w").close()
    t0 = time.perf_counter()
    r = subprocess.run([os.path.join(CALES[niveau], "pnpm.cmd"), *args], capture_output=True, text=True, encoding="utf-8",
                       errors="replace", env=environnement(niveau, jc))
    d = time.perf_counter() - t0
    s = (r.stdout or "") + (r.stderr or "")
    appels = [l for l in open(jc, encoding="utf-8").read().splitlines() if l.strip()]
    tests = len(re.findall(r"^\s*Tests\s+\d", s, re.M))
    if args == ["--version"]:
        ok = r.returncode == 127 and "NON RÉÉCRIT" in s and len(appels) == 1
    elif niveau == "B":
        ok = r.returncode != 0 and tests == 0 and appels and json.loads(appels[0])["reecrit"] == ["exec", "vitest"]
    else:
        ok = r.returncode != 0 and tests == 0 and appels == ["A pnpm"]
    manques += not ok
    derniere = [l.strip() for l in s.splitlines() if l.strip()][-1:] or ["(vide)"]
    dire(f"  {'✓' if ok else '✗'} cale {niveau} {' '.join(args[-2:])} : code {r.returncode}, {d:.2f} s, appels {len(appels)}, "
         f"lignes Tests {tests} — attendu : {attendu} · dernière ligne : {derniere[0][:110]}")

# ------------------------------------------------------------------ calibration (b) : bras POSITIF
dire("\n== CALIBRATION (b) — BRAS POSITIF : `available-on-api` (qui LIT sa sortie) constate lui-même le non-démarrage")
for niveau in ("A", "B"):
    r = jouer("available-on-api", [], niveau, f"calib-b-{niveau}")
    arret_si_sale(r)
    iv = re.search(r"calibration \(iv\) mutation connue \(A1\) : (\S+(?: \S+)?)", r["sortie"])
    etat_iv = iv.group(1) if iv else None
    ok = etat_iv == "NON DÉMARRÉE" and r["appels"] > 0 and r["mordues"] == 0 and r["non_reecrits"] == 0
    manques += not ok
    dire(f"  {'✓' if ok else '✗'} sous {niveau} : (iv) mutation connue « {etat_iv} » (attendu « NON DÉMARRÉE » ; sans cale, "
         f"« MORDUE », D312) · code {r['code']} · appels de cale {r['appels']} · « ✓ » {r['mordues']} (attendu 0) · "
         f"{r['duree']:.1f} s · arbre propre")

# ------------------------------------------------------------------ mesure : les 26 autres, sous A puis sous B
dire("\n== MESURE — les 26 harnais « autres », chacun dans la passe qui le certifie, sous A puis sous B")
mesures = {}
for nom, a in HARNAIS.items():
    if nom in LUS:
        continue
    argv = ["--int"] if a["verrou"] else []
    for niveau in ("A", "B"):
        r = jouer(nom, argv, niveau, f"sim-{niveau}")
        arret_si_sale(r)
        mesures[(nom, niveau)] = r
        defaut = r["appels"] == 0 or r["non_reecrits"] > 0 or r["tests"] > 0
        manques += defaut
        dire(f"  {'✗' if defaut else '·'} {nom:16s} {'--int' if argv else 'tout':5s} {niveau} : {r['duree']:7.2f} s · code "
             f"{r['code']:3d} · « ✓ » {r['mordues']:2d} · « ✗ » {r['muettes']:2d} · cibles {a['n']:2d} · appels de cale "
             f"{r['appels']:3d} · non réécrits {r['non_reecrits']} · lignes Tests {r['tests']}"
             + (f" · reliquats identiques retirés {len(r['reliquats'])}" if r["reliquats"] else ""))

# ------------------------------------------------------------------ calibration (c) : bras NÉGATIF
dire("\n== CALIBRATION (c) — BRAS NÉGATIF : `argon2` SANS cale, par la même fonction")
r = jouer("argon2", [], None, "calib-c")
arret_si_sale(r)
tmax = max(mesures[("argon2", "A")]["duree"], mesures[("argon2", "B")]["duree"])
ok = r["code"] == 0 and r["mordues"] == 3 and r["appels"] == 0 and r["duree"] > tmax
manques += not ok
dire(f"  {'✓' if ok else '✗'} sans cale : code {r['code']} · « ✓ » {r['mordues']} (attendu 3) · appels de cale {r['appels']} "
     f"(attendu 0) · {r['duree']:.1f} s (attendu > {tmax:.2f} s, son plus long non-démarrage simulé)")

dire(f"\nBRAS ET DÉFAUTS MANQUÉS : {manques} (attendu 0) — "
     f"{'la simulation vaut mesure' if manques == 0 else 'ABANDON : aucun plancher ne se dérive de cette sortie'}")
dire("\n== TABLE — par harnais : non-démarrage simulé le plus long (T = max(A, B)), en secondes")
for nom, a in HARNAIS.items():
    if nom in LUS:
        continue
    ta, tb = mesures[(nom, "A")]["duree"], mesures[(nom, "B")]["duree"]
    dire(f"T {nom} {'--int' if a['verrou'] else 'tout'} {a['n']} {ta:.2f} {tb:.2f} {max(ta, tb):.2f} "
         f"{mesures[(nom, 'B')]['mordues']}")
open(SORTIE, "w", encoding="utf-8", newline="\n").write("\n".join(lignes_sortie) + "\n")
sys.exit(0 if manques == 0 else 1)
