"""D310 — LA PASSE DE CERTIFICATION DU RANG 23, dans l'ordre du protocole commité AVANT le relevé d'ouverture.
Procédure archivée comme preuve (D291), jamais promue en instrument ; sous `docs/preuves/` et non dans
`neutralisation/` pour la raison de D299 (un script de `neutralisation/` ferait COMPTER la certification).
Usage, depuis la racine :
    python docs/preuves/D310/outils/passe.py <IDENTIFIANT DE PASSE> <SHA attendu à HEAD>

TOUT s'écrit dans `.neutralisation-journaux/<ID>/` (ignoré par git) : c'est le « dossier de SA passe » de la
décision 3 du relecteur (D309) ; il est versé ensuite, sous le même identifiant, par `verser.py`.
⛔ ELLE N'ÉCRIT AUCUN FICHIER SUIVI (D270) : les seules écritures du dépôt pendant la fenêtre sont celles des harnais,
qui mutent puis restaurent — contrôlées APRÈS chaque étape (arbre-1 à arbre-5), jamais pendant.
⛔ AUCUN LECTEUR SUR LE JOURNAL DE L'ÉCHANTILLONNEUR PENDANT LA FENÊTRE (D299) : il est lu à la clôture, par
`-Resume`. Le seul journal qu'on peut suivre en direct est `progression.txt`, écrit par CE script.

ORDRE (protocole, point d'entrée du rang 23) :
  0. prérequis : `pg_isready` dans `zwadj-db` (échec ⇒ ARRÊT) ; ports 3100, 3101, 5273 libres (occupés ⇒ ARRÊT) ;
  1. relevé d'ouverture : sonde `-Calibrer`, puis un second relevé ; PORTE DURE sur CHACUN — `CHROME=0`, RAM médiane
     ET bande basse ≥ la barre QUE LA SONDE IMPRIME, `SECTEUR`, calibration passante (1ᵉʳ relevé). Rouge ⇒ RIEN ne
     se lance, sortie 3 ;
  2. échantillonneur en fond, `-Intervalle 30` ;
  3. arbre-1 (HEAD = SHA attendu, `git status --porcelain` vide) ;
  4. six portes dans l'ordre de `CLAUDE.md`, chacune précédée d'un relevé ; avant l'e2e, `NODE=0` et ports libres ;
  5. arbre-2 ; `lancer-campagnes.py --tout` ; copie des journaux de CETTE passe ; arbre-3 ;
  6. rejeu `--int` des harnais VERROUILLÉS (liste de `declarees.py`), chacun précédé d'un relevé et de `pg_isready` ;
     arbre-4 ;
  7. contre-épreuve de `audit-secrets.py` (D298), à la main ; arbre-5 ;
  8. relevé de clôture ; arrêt de l'échantillonneur ; `-Resume`.
⛔ ARRÊT SANS RATTRAPAGE (ordre de Ko) : un relevé hors `SECTEUR`, ou `CHROME` > 0 ⇒ la passe s'arrête, c'est écrit
dans `progression.txt` et `ARRET.txt`, sortie 4. Un relevé sous la barre PENDANT la fenêtre n'arrête pas : il est
écrit, et jugé à la clôture (point 7 du critère).
Codes : 0 = passe jouée jusqu'à la clôture ; 3 = porte dure rouge, rien lancé ; 4 = ARRÊT pendant la fenêtre ;
2 = erreur de procédure.
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import time

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)
if len(sys.argv) != 3:
    print(__doc__)
    sys.exit(2)
ID, SHA = sys.argv[1], sys.argv[2]
J = os.path.join(".neutralisation-journaux", ID)
if os.path.exists(J):
    print(f"✗ {J} existe déjà : une passe ne s'écrit pas par-dessus une autre.")
    sys.exit(2)
os.makedirs(J)
PNPM = shutil.which("pnpm")
# Les harnais VERROUILLÉS par `--int` sont DÉRIVÉS de l'AST (même fonction que `declarees.py`), jamais recopiés.
_src = open(os.path.join(os.path.dirname(os.path.abspath(__file__)), "declarees.py"), encoding="utf-8").read()
_ns: dict = {}
exec(compile(_src.split("\ntri = open(")[0], "declarees.py", "exec"), _ns)
VERROUILLES = [f[len("neutralize-"):-3] for f in sorted(os.listdir("neutralisation"))
               if f.startswith("neutralize-") and f.endswith(".py")
               and _ns["analyser"](os.path.join("neutralisation", f))["verrou"]]
PORTES = ["typecheck", "lint", "test", "build", "test:int"]


def horo() -> str:
    return time.strftime("%d/%m/%Y %H:%M:%S")


def journal(msg: str) -> None:
    with open(os.path.join(J, "progression.txt"), "a", encoding="utf-8") as f:
        f.write(f"{horo()} {msg}\n")
    print(f"{horo()} {msg}", flush=True)


def ecrire(nom: str, texte: str) -> None:
    with open(os.path.join(J, nom), "w", encoding="utf-8", newline="") as f:
        f.write(texte)


def lancer(nom: str, cmd: list, env=None) -> int:
    debut = time.time()
    h0 = horo()
    with open(os.path.join(J, nom + ".log"), "wb") as f:
        r = subprocess.run(cmd, stdout=f, stderr=subprocess.STDOUT, env=env)
    duree = round(time.time() - debut)
    ecrire(nom + ".code", f"{r.returncode}\n")
    ecrire(nom + ".heures", f"début {h0}\nfin {horo()} · {duree} s · code {r.returncode}\n")
    journal(f"   {nom} : code {r.returncode}, {duree} s")
    return r.returncode


def sonde(nom: str, calibrer: bool = False) -> dict:
    cmd = ("[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false; "
           "& './neutralisation/sonde-etat-machine.ps1'" + (" -Calibrer" if calibrer else "")
           + "; exit $LASTEXITCODE")
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd],
                       capture_output=True)
    t = r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace")
    ecrire(f"sonde-{nom}.txt", t)
    v = {k: (re.search(rf"^{k}=(\S+)", t, re.M).group(1) if re.search(rf"^{k}=(\S+)", t, re.M) else None)
         for k in ("RAM_MEDIANE_MO", "RAM_BANDE_MO", "BARRE_D273_MO", "ALIM_SOURCE", "NODE", "CHROME")}
    v["code"] = r.returncode
    v["calibration"] = ("✓ les deux instruments separent" in t) if calibrer else None
    try:
        barre = float(v["BARRE_D273_MO"])
        v["sous_barre"] = float(v["RAM_MEDIANE_MO"]) < barre or float(v["RAM_BANDE_MO"].split("-")[0]) < barre
    except (TypeError, ValueError, AttributeError):
        v["sous_barre"] = None
    journal(f"   sonde {nom} : RAM {v['RAM_MEDIANE_MO']} (bande {v['RAM_BANDE_MO']}, barre {v['BARRE_D273_MO']}) · "
            f"{v['ALIM_SOURCE']} · node {v['NODE']} · chrome {v['CHROME']} · code {v['code']}"
            + (f" · calibration {'✓' if v['calibration'] else '✗'}" if calibrer else "")
            + (" · ⚠ SOUS LA BARRE" if v["sous_barre"] else ""))
    return v


def arret(motif: str, echant=None) -> None:
    journal(f"⛔ ARRÊT SANS RATTRAPAGE : {motif}")
    ecrire("ARRET.txt", f"{horo()} {motif}\n")
    if echant is not None:
        echant.terminate()
    sys.exit(4)


def regime(v: dict, echant) -> None:
    if v["ALIM_SOURCE"] != "SECTEUR":
        arret(f"relevé hors SECTEUR ({v['ALIM_SOURCE']})", echant)
    if v["CHROME"] != "0":
        arret(f"chrome = {v['CHROME']} à un relevé", echant)


def pg(nom: str) -> int:
    r = subprocess.run(["docker", "exec", "zwadj-db", "pg_isready"], capture_output=True)
    ecrire(f"pg-{nom}.txt", r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace"))
    journal(f"   pg_isready ({nom}) : code {r.returncode}")
    return r.returncode


def ports_ecoutes() -> list:
    r = subprocess.run(["netstat", "-ano"], capture_output=True)
    t = r.stdout.decode("utf-8", errors="replace")
    return [l.strip() for l in t.splitlines() if "LISTENING" in l and re.search(r":(3100|3101|5273)\s", l)]


def arbre(n: int) -> None:
    head = subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip()
    st = subprocess.run(["git", "status", "--porcelain", "--untracked-files=all"], capture_output=True,
                        text=True, encoding="utf-8").stdout
    ecrire(f"arbre-{n}.txt", f"HORODATAGE {horo()}\nHEAD {head}\n--- git status --porcelain (vide exigé)\n{st}--- fin\n")
    journal(f"   arbre-{n} : HEAD {head[:7]} (attendu {SHA[:7]}) · {len(st.splitlines())} ligne(s) de statut (attendu 0)")
    if head != SHA or st.strip():
        journal("⛔ ARBRE NON CONFORME — la passe continue d'être écrite, la marque sera REFUSÉE")
        ecrire(f"arbre-{n}-NON-CONFORME.txt", "voir arbre-%d.txt\n" % n)


# ---------------------------------------------------------------- 0. prérequis
journal(f"PASSE {ID} — HEAD attendu {SHA}")
if pg("ouverture") != 0:
    journal("⛔ pg_isready en échec : RIEN n'est lancé (amendement de D299)")
    sys.exit(3)
p = ports_ecoutes()
ecrire("ports-ouverture.txt", "\n".join(p) + "\n")
journal(f"   ports 3100/3101/5273 à l'écoute : {len(p)} (attendu 0)")
if p:
    journal("⛔ ports occupés : RIEN n'est lancé")
    sys.exit(3)

# ---------------------------------------------------------------- 1. relevé d'ouverture, porte dure
v1 = sonde("ouverture-1", calibrer=True)
v2 = sonde("ouverture-2")
rouges = []
for nom, v in (("ouverture-1", v1), ("ouverture-2", v2)):
    if v["CHROME"] != "0":
        rouges.append(f"{nom} : chrome {v['CHROME']}")
    if v["sous_barre"] is not False:
        rouges.append(f"{nom} : RAM médiane {v['RAM_MEDIANE_MO']} / bande {v['RAM_BANDE_MO']} contre la barre "
                      f"{v['BARRE_D273_MO']}")
    if v["ALIM_SOURCE"] != "SECTEUR":
        rouges.append(f"{nom} : {v['ALIM_SOURCE']}")
    if v["code"] != 0:
        rouges.append(f"{nom} : sonde en code {v['code']}")
if not v1["calibration"]:
    rouges.append("ouverture-1 : calibration NON passante")
ecrire("porte-dure.txt", ("ROUGE\n" + "\n".join(rouges) + "\n") if rouges else "VERTE\n")
if rouges:
    journal("⛔ PORTE DURE ROUGE — RIEN N'EST LANCÉ : " + " ; ".join(rouges))
    sys.exit(3)
journal("✓ PORTE DURE VERTE sur les deux relevés")

# ---------------------------------------------------------------- 2. échantillonneur
echant = subprocess.Popen(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                           "neutralisation/echantillonneur-etat-machine.ps1", "-Journal",
                           os.path.join(J, "etat.csv"), "-Intervalle", "30"],
                          stdout=open(os.path.join(J, "echantillonneur-sortie.txt"), "wb"),
                          stderr=subprocess.STDOUT)
journal(f"   échantillonneur lancé (PID {echant.pid}), -Intervalle 30 — AUCUN lecteur pendant la fenêtre")

# ---------------------------------------------------------------- 3-4. arbre-1, six portes
arbre(1)
for porte in PORTES:
    nom = porte.replace(":", "")
    v = sonde(f"avant-{nom}")
    regime(v, echant)
    if porte == "test:int" and pg("avant-testint") != 0:
        arret("pg_isready en échec avant test:int", echant)
    lancer(nom, [PNPM, porte])
v = sonde("avant-e2e")
regime(v, echant)
p = ports_ecoutes()
ecrire("ports-avant-e2e.txt", "\n".join(p) + "\n")
journal(f"   avant e2e : node {v['NODE']} (attendu 0) · ports à l'écoute {len(p)} (attendu 0)")
if v["NODE"] != "0" or p:
    arret(f"avant e2e : node {v['NODE']}, ports {len(p)}", echant)
if pg("avant-e2e") != 0:
    arret("pg_isready en échec avant l'e2e", echant)
lancer("e2e", [PNPM, "test:e2e"])
v = sonde("apres-e2e")
regime(v, echant)
p = ports_ecoutes()
ecrire("ports-apres-e2e.txt", "\n".join(p) + "\n")
journal(f"   après e2e : node {v['NODE']} · ports à l'écoute {len(p)}")

# ---------------------------------------------------------------- 5. --tout, et les journaux de CETTE passe
arbre(2)
v = sonde("avant-campagnes")
regime(v, echant)
debut_tout = time.time()
lancer("campagnes-tout", [sys.executable, "neutralisation/lancer-campagnes.py", "--tout"])
os.makedirs(os.path.join(J, "campagnes"))
os.makedirs(os.path.join(J, "rang23"))
copies = vus = anterieurs = 0
for src, dst_dir, filtre in ((".neutralisation-journaux", "campagnes", lambda n: n.startswith("neutralize-")
                              and n.endswith(".py.log")),
                             (".neutralisation-journaux/rang23", "rang23", lambda n: True)):
    for n in sorted(os.listdir(src)):
        a = os.path.join(src, n)
        if os.path.isfile(a) and filtre(n):
            vus += 1
            # ⛔ La décision 3 du relecteur (D309) : la pièce est celle de SA passe. Un journal plus ancien que le
            #   début de `--tout` est celui d'une AUTRE passe — il est copié sous un nom qui le dit, jamais compté.
            if os.path.getmtime(a) < debut_tout:
                anterieurs += 1
                b = os.path.join(J, dst_dir, "ANTERIEUR-A-LA-PASSE-" + n)
            else:
                b = os.path.join(J, dst_dir, n)
            shutil.copyfile(a, b)
            copies += hashlib.sha256(open(a, "rb").read()).digest() == hashlib.sha256(open(b, "rb").read()).digest()
journal(f"   journaux de campagne copiés à l'identique : {copies} sur {vus} · antérieurs au début de --tout : "
        f"{anterieurs} (attendu 0)")
arbre(3)

# ---------------------------------------------------------------- 6. rejeux --int
for h in VERROUILLES:
    v = sonde(f"avant-int-{h}")
    regime(v, echant)
    if pg(f"int-{h}") != 0:
        arret(f"pg_isready en échec avant --int {h}", echant)
    lancer(f"int-{h}", [sys.executable, f"neutralisation/neutralize-{h}.py", "--int"])
arbre(4)

# ---------------------------------------------------------------- 7. contre-épreuve
lancer("contre-epreuve", [sys.executable, "docs/preuves/D298/contre-epreuve/contre-epreuve.py"])
arbre(5)

# ---------------------------------------------------------------- 8. clôture
v = sonde("cloture")
echant.terminate()
echant.wait(timeout=30)
journal("   échantillonneur arrêté")
r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                    "neutralisation/echantillonneur-etat-machine.ps1", "-Resume", os.path.join(J, "etat.csv")],
                   capture_output=True)
ecrire("etat-resume.txt", r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace"))
journal(f"   -Resume : code {r.returncode}")
if v["ALIM_SOURCE"] != "SECTEUR" or v["CHROME"] != "0":
    arret(f"relevé de clôture : {v['ALIM_SOURCE']}, chrome {v['CHROME']}")
journal("CLÔTURE ATTEINTE — la lecture se fait APRÈS, sur les journaux de ce dossier")
sys.exit(0)
