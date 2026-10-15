"""D334 — LA PASSE DE CERTIFICATION QUI COUVRE D331, D332 ET D333 (rang 40). COPIE de `docs/preuves/D330/outils/passe.py` (elle-même copie de celui de D329, de D319), CINQ MODIFICATIONS DÉCLARÉES, chacune comptée à la fabrication (`fab-passe.py`, assertions avant ET après) :
  (1) [D334 (1)] LES TROIS RÈGLES NEUVES VIVENT DANS UN MODULE PUR ET CALIBRÉ, `docs/preuves/D334/outils/regles.py` (décision 3 du relecteur, 15/10/2026 ; arbitrage de Ko du 13/10/2026, points 2 à 4) : la passe le CHARGE et REJOUE sa calibration (12 bras) avant de
      faire quoi que ce soit ; un bras manqué ⇒ sortie 2, rien n'est lancé ;
  (2) [D334 (2)] `inventaire()` RENDS ses comptes (`chrome`, `headless_shell`, …) au lieu de seulement les journaliser ;
  (3) [D334 (3)] `headless_shell` = 0 EST UNE PORTE DURE, comme `chrome` = 0 : à l'ouverture (le comptage de l'inventaire d'ouverture entre dans la porte dure ; un `headless_shell` > 0 ⇒ RIEN ne se lance, sortie 3) ET à chaque relevé de la fenêtre (`regime()` compte les
      processus par `regles.compter_processus` ; `headless_shell` > 0 ⇒ ARRÊT SANS RATTRAPAGE, sortie 4) ET à la clôture (même arrêt) ;
  (4) [D334 (4)] LA RAM SE JUGE À L'OUVERTURE ET À LA CLÔTURE : la porte dure d'ouverture est `regles.juger_ram_ouverture` (médiane ET bas de bande de CHAQUE relevé ≥ la barre que la sonde imprime) — elle REMPLACE le test par relevé qui y était ; le relevé de clôture est jugé par
      `regles.juger_ram_cloture` : sous la barre ⇒ « LA MARQUE EST REFUSÉE » (`RAM-CLOTURE-SOUS-LA-BARRE.txt`), la passe va jusqu'au bout ; les relevés INTERMÉDIAIRES sous la barre sont NOTÉS (`ram-intermediaires.txt`, `regles.noter_intermediaires`), jamais disqualifiants ;
  (5) [D334 (5)] CODES DE SORTIE : 5 = état des `.env` différent (inchangé) ; 6 = RAM de clôture sous la barre ; 7 = les deux. 3 = porte dure rouge, 4 = arrêt pendant la fenêtre, 2 = erreur de procédure ou calibration manquée (inchangés) ;
  NOTE (pas une modification) : aucun chemin de CE fichier ne désigne une destination de D330 — `etat-env.py` (D330), `declarees.py` (D310), `audit-secrets.py` et la contre-épreuve de D298 sont RÉEMPLOYÉS, non copiés.
Tout le reste est le texte de D330, intact (D330 (1)-(3) : l'état des `.env` ; D329 (1)-(2) : harnais `--int` dérivés, inventaire `chrome` ET `headless_shell`). Usage, depuis la racine : python docs/preuves/D334/outils/passe.py <IDENTIFIANT DE PASSE> <SHA attendu à HEAD>
"""
"""D330 — LA SECONDE PASSE DE LA CERTIFICATION QUI CLÔT LE RANG 36 (couvre D325 et D326). COPIE de `docs/preuves/D329/outils/passe.py` (elle-même copie de celui de D319), TROIS MODIFICATIONS DÉCLARÉES, chacune comptée à la fabrication :
  (1) [D330 (1)] L'ÉTAT DES FICHIERS `.env` EST RELEVÉ À L'OUVERTURE, PORTE DURE : `etat_env("ouverture")` (outil `docs/preuves/D330/outils/etat-env.py`, calibré à chaque lancement) relève l'empreinte SHA-256 et la classe d'hôte de chaque variable
      d'URL de chaque `.env` que lit une porte, SANS AUCUNE VALEUR. UN HÔTE QUI N'EST PAS LOCAL ⇒ RIEN N'EST LANCÉ, sortie 3 (décision 2 du relecteur, 12/10/2026, ordre des rangs, bloc D330). Placé APRÈS les prérequis (`pg_isready`, ports) et AVANT
      le relevé d'ouverture de la sonde ;
  (2) [D330 (2)] L'ÉTAT DES `.env` EST RELEVÉ À LA CLÔTURE ET COMPARÉ : `etat_env("cloture")`, puis `etat-env.py comparer` des deux relevés. DES EMPREINTES DIFFÉRENTES (ou un fichier apparu/disparu, ou un hôte non local à la clôture) ⇒ « LA MARQUE EST REFUSÉE » est écrit
      dans `progression.txt` et dans `ENV-DIFFERENT.txt`, et la passe sort en 5 (au lieu de 0) ; la passe va tout de même jusqu'à sa clôture : le refus est une conclusion de lecture, pas un arrêt de mesure (comme `arbre-N-NON-CONFORME`) ;
  (3) [D330 (3)] UN CODE DE SORTIE DE PLUS : 5 = passe jouée jusqu'à la clôture MAIS état des `.env` différent (marque refusée).
Tout le reste est le texte de D329, intact (D329 (1) : harnais `--int` dérivés avec `"--int" in (sys.)?argv` ; D329 (2) : inventaire `chrome` ET `headless_shell`). Usage, depuis la racine : python docs/preuves/D330/outils/passe.py <IDENTIFIANT DE PASSE> <SHA attendu à HEAD>
"""
"""D329 — LA PASSE DE CERTIFICATION QUI CLÔT LE RANG 36 (couvre D325 et D326). COPIE de `docs/preuves/D319/outils/passe.py` (que D324 avait RÉUTILISÉ tel quel, non copié), DEUX MODIFICATIONS DÉCLARÉES, chacune
comptée à la fabrication :
  (1) LA DÉRIVATION DES HARNAIS VERROUILLÉS PAR `--int` est élargie : à l'AST de `declarees.py` (`"--int" in argv`), s'ajoute la recherche littérale `"--int" in (sys.)?argv`. Motif MESURÉ : `neutralize-r33.py` écrit
      `INT = "--int" in sys.argv[1:]` ; `declarees.py` le range « --tout » (verrou False), or `--tout` n'en joue que 93 des 102 cibles (neuf sont d'intégration, mesures `int-document`/`int-rendu`) ; D326 l'a
      mesuré (`neutralize-r33.py --int` : 102 sur 102). Sans cette modification la passe ne rejouerait JAMAIS r33 en `--int` et « jouées = déclarées » serait faux pour lui. Effet : `VERROUILLES` = les 7 de
      D324 PLUS `r33` = 8 (`e3d1-s8, r25, r33, s11b, solid-s1, solid-s2, solid-s3, solid-s6`) ; `E2E_VERROUILLES` inchangé (`r25, r26`) ;
  (2) UN RELEVÉ DE PROCESSUS DE NAVIGATEUR (`inventaire`) à l'ouverture, après l'e2e et à la clôture : `chrome` ET `headless_shell` (ajout (a) du relecteur, 12/10/2026 — le moteur du PDF est `headless_shell.exe`, D326).
      C'est un RELEVÉ : il n'arrête rien et ne change aucun code de sortie ; en faire une porte revient à Ko.
Tout le reste est le texte de D319, intact, sauf le chemin du docstring ci-dessous. Usage, depuis la racine : python docs/preuves/D329/outils/passe.py <IDENTIFIANT DE PASSE> <SHA attendu à HEAD>
"""
"""D319 — LA PASSE DE CERTIFICATION QUI CLÔT LE RANG 27 (couvre D316 et D317). COPIE de
`docs/preuves/D314/outils/passe.py` (pièce de D314, non retouchée dans son corps) : même ordre, mêmes arrêts.
SEUL AJOUT : une étape 6b, le rejeu `--e2e` des harnais E2E-VERROUILLÉS (`r25`, `r26`) — cette classe de harnais
n'existait pas à D314 (ni à D310, dont le protocole est le patron). Dérivée par la MÊME méthode que les harnais
`--int` verrouillés : lecture du source, recherche littérale de `"--e2e" in argv` (symétrique de la recherche
`"--int" in argv` de `declarees.py`), jamais une liste recopiée.
Procédure archivée comme preuve (D291), jamais promue en instrument ; sous `docs/preuves/` et non dans
`neutralisation/` pour la raison de D299 (un script de `neutralisation/` ferait COMPTER la certification).
Usage, depuis la racine :
    python docs/preuves/D319/outils/passe.py <IDENTIFIANT DE PASSE> <SHA attendu à HEAD>

TOUT s'écrit dans `.neutralisation-journaux/<ID>/` (ignoré par git) : c'est le « dossier de SA passe » de la
décision 3 du relecteur (D309) ; il est versé ensuite, sous le même identifiant, par `verser.py` (réutilisé de
D314, non retouché).
⛔ ELLE N'ÉCRIT AUCUN FICHIER SUIVI (D270) : les seules écritures du dépôt pendant la fenêtre sont celles des
harnais, qui mutent puis restaurent — contrôlées APRÈS chaque étape (arbre-1 à arbre-6), jamais pendant.
⛔ AUCUN LECTEUR SUR LE JOURNAL DE L'ÉCHANTILLONNEUR PENDANT LA FENÊTRE (D299) : il est lu à la clôture, par
`-Resume`. Le seul journal qu'on peut suivre en direct est `progression.txt`, écrit par CE script.

ORDRE (protocole, point d'entrée du rang 27) :
  0. prérequis : `pg_isready` dans `zwadj-db` (échec ⇒ ARRÊT) ; ports 3100, 3101, 5273 libres (occupés ⇒ ARRÊT) ;
  1. relevé d'ouverture : sonde `-Calibrer`, puis un second relevé ; PORTE DURE sur CHACUN — `CHROME=0`, RAM
     médiane ET bande basse ≥ la barre QUE LA SONDE IMPRIME, `SECTEUR`, calibration passante (1ᵉʳ relevé). Rouge
     ⇒ RIEN ne se lance, sortie 3 ;
  2. échantillonneur en fond, `-Intervalle 30` ;
  3. arbre-1 (HEAD = SHA attendu, `git status --porcelain` vide) ;
  4. six portes dans l'ordre de `CLAUDE.md`, chacune précédée d'un relevé ; avant l'e2e, `NODE=0` et ports libres ;
  5. arbre-2 ; `lancer-campagnes.py --tout` ; copie des journaux de CETTE passe (campagnes, `rang23/`,
     `available-on-api/`) ; arbre-3 ;
  6. rejeu `--int` des harnais VERROUILLÉS (liste de `declarees.py`, dérivée de l'AST) ; arbre-4 ;
  6b. [AJOUT D319] rejeu `--e2e` des harnais E2E-VERROUILLÉS (`r25`, `r26`), chacun précédé d'un relevé, de
      NODE=0 et ports libres, de `pg_isready` (l'e2e a besoin de la base) ; copie de leurs journaux à côté de
      ceux de l'étape 6 ; arbre-5 ;
  7. contre-épreuve de `audit-secrets.py` (D298), à la main ; arbre-6 ;
  8. relevé de clôture ; arrêt de l'échantillonneur ; `-Resume`.
⛔ ARRÊT SANS RATTRAPAGE (ordre de Ko) : un relevé hors `SECTEUR`, ou `CHROME` > 0 ⇒ la passe s'arrête, c'est
écrit dans `progression.txt` et `ARRET.txt`, sortie 4. Un relevé sous la barre PENDANT la fenêtre n'arrête pas :
il est écrit, et jugé à la clôture (point 7 du critère).
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
_src = open("docs/preuves/D310/outils/declarees.py", encoding="utf-8").read()
_ns: dict = {}
exec(compile(_src.split("\ntri = open(")[0], "declarees.py", "exec"), _ns)
_FICHIERS = [f for f in sorted(os.listdir("neutralisation"))
             if f.startswith("neutralize-") and f.endswith(".py")]
# [D329 (1)] `declarees.py` reconnaît `"--int" in argv` ; `neutralize-r33.py` écrit `INT = "--int" in sys.argv[1:]` et lui échappe (il le range « --tout » : 93 de ses 102 cibles seulement
# y jouent). La recherche littérale devient `"--int" in (sys.)?argv` — mêmes harnais que l'AST pour les huit autres, PLUS `r33` ; comptée à la fabrication (voir l'en-tête).
_RE_INT = re.compile(r'"--int" in (?:sys\.)?argv')
VERROUILLES = [f[len("neutralize-"):-3] for f in _FICHIERS
               if _ns["analyser"](os.path.join("neutralisation", f))["verrou"]
               or _RE_INT.search(open(os.path.join("neutralisation", f), encoding="utf-8").read())]
# [AJOUT D319] même méthode, symétrique, pour la classe e2e qui n'existait pas à D314 : recherche littérale de
# `"--e2e" in argv` dans le source — jamais une liste recopiée.
E2E_VERROUILLES = [f[len("neutralize-"):-3] for f in _FICHIERS
                   if '"--e2e" in argv' in open(os.path.join("neutralisation", f), encoding="utf-8").read()]
PORTES = ["typecheck", "lint", "test", "build", "test:int"]


import importlib.util
_sp = importlib.util.spec_from_file_location("regles_d334", "docs/preuves/D334/outils/regles.py")
regles = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(regles)                      # [D334 (1)] le module pur des trois règles
RELEVES: list = []                                  # [D334 (4)] tous les relevés de sonde, dans l'ordre : (nom, dict)


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
    RELEVES.append((nom, dict(v)))                  # [D334 (4)]
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


def inventaire(nom: str) -> dict:
    """[D329 (2), ajout (a) du relecteur] RELEVÉ — jamais une porte — des processus de navigateur : `chrome` ET `headless_shell` (le moteur du PDF est `headless_shell.exe`, D326 :
    `Get-Process chrome` en compte zéro ; la porte `chrome` = 0 ne verrait pas sa fuite). Compte par nom, avec PID, début et mémoire ; n'arrête rien, ne change aucun code de sortie."""
    cmd = ("[Console]::OutputEncoding = New-Object System.Text.UTF8Encoding $false; "
           "$noms = 'chrome','headless_shell','chromium','chrome_crashpad_handler','node','msedge'; "
           "foreach ($n in $noms) { $p = @(Get-Process -Name $n -ErrorAction SilentlyContinue); "
           "Write-Output ('COMPTE ' + $n + '=' + $p.Count); "
           "foreach ($x in $p) { Write-Output ('  ' + $n + ' PID ' + $x.Id + ' début ' + $x.StartTime.ToString('yyyy-MM-dd HH:mm:ss') + ' mémoire_Mo ' + [math]::Round($x.WorkingSet64 / 1MB, 1)) } }")
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], capture_output=True)
    t = r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace")
    ecrire(f"inventaire-{nom}.txt", f"HORODATAGE {horo()}\n" + t)
    comptes = dict(re.findall(r"^COMPTE (\S+)=(\d+)", t, re.M))
    journal(f"   inventaire {nom} : chrome {comptes.get('chrome')} · headless_shell {comptes.get('headless_shell')} · chromium {comptes.get('chromium')} · "
            f"node {comptes.get('node')} · msedge {comptes.get('msedge')} · code {r.returncode}")
    return {k: int(v) for k, v in comptes.items()}          # [D334 (2)] rendu, pour que `headless_shell` = 0 soit une PORTE (D334 (3))


def etat_env(nom: str) -> int:
    """[D330 (1), (2)] RELEVÉ des fichiers `.env` : empreinte SHA-256 et classe d'hôte de chaque variable d'URL, AUCUNE VALEUR. Écrit `etat-env-<nom>.txt` dans le dossier de la passe. Code 0 = tous les hôtes sont locaux ; 3 = un hôte ne l'est pas ; 2 = erreur."""
    r = subprocess.run([sys.executable, "docs/preuves/D330/outils/etat-env.py", "relever", nom, J], capture_output=True)
    t = r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace")
    resume = [l for l in t.splitlines() if l.startswith("RÉSUMÉ") or l.startswith("PORTE")]
    journal(f"   état des .env ({nom}) : code {r.returncode} · " + " · ".join(resume))
    return r.returncode


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
    ok_nav, raisons_nav = regles.juger_navigateurs(regles.compter_processus(["chrome", "headless_shell"]))    # [D334 (3)] `headless_shell` = 0, porte dure comme `chrome` = 0
    if not ok_nav:
        arret("navigateur à un relevé : " + " ; ".join(raisons_nav), echant)


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
if regles.calibrer(journal) != 0:                   # [D334 (1)] la calibration des règles se REJOUE avant la passe
    journal("⛔ CALIBRATION DES RÈGLES MANQUÉE — RIEN N'EST LANCÉ")
    sys.exit(2)
journal(f"   harnais VERROUILLÉS (--int), dérivés de l'AST : {VERROUILLES}")
journal(f"   harnais E2E-VERROUILLÉS (--e2e), dérivés par recherche littérale : {E2E_VERROUILLES}")
if pg("ouverture") != 0:
    journal("⛔ pg_isready en échec : RIEN n'est lancé (amendement de D299)")
    sys.exit(3)
p = ports_ecoutes()
ecrire("ports-ouverture.txt", "\n".join(p) + "\n")
journal(f"   ports 3100/3101/5273 à l'écoute : {len(p)} (attendu 0)")
if p:
    journal("⛔ ports occupés : RIEN n'est lancé")
    sys.exit(3)

# ---------------------------------------------------------------- 0bis. [D330 (1)] l'état des .env, PORTE DURE : un hôte non local ⇒ RIEN ne se lance
rc_env = etat_env("ouverture")
if rc_env != 0:
    journal("⛔ ÉTAT DES .env : UN HÔTE N'EST PAS LOCAL (ou le relevé a échoué) — RIEN N'EST LANCÉ (décision 2 du relecteur, D330)")
    ecrire("porte-dure.txt", "ROUGE\nétat des .env : code %d (3 = un hôte n'est pas local, 2 = erreur)\n" % rc_env)
    sys.exit(3)

# ---------------------------------------------------------------- 1. relevé d'ouverture, porte dure
inv_ouverture = inventaire("ouverture")           # [D329 (2)] AVANT la passe : chrome ET headless_shell — [D334 (3)] ET c'est une porte dure
v1 = sonde("ouverture-1", calibrer=True)
v2 = sonde("ouverture-2")
rouges = []
for nom, v in (("ouverture-1", v1), ("ouverture-2", v2)):
    if v["CHROME"] != "0":
        rouges.append(f"{nom} : chrome {v['CHROME']}")
    if v["ALIM_SOURCE"] != "SECTEUR":
        rouges.append(f"{nom} : {v['ALIM_SOURCE']}")
    if v["code"] != 0:
        rouges.append(f"{nom} : sonde en code {v['code']}")
if not v1["calibration"]:
    rouges.append("ouverture-1 : calibration NON passante")
# [D334 (3)] `headless_shell` = 0 et `chrome` = 0 à l'inventaire d'ouverture ; [D334 (4)] la RAM : CHAQUE relevé d'ouverture, médiane ET bas de bande, au-dessus de la barre que la sonde imprime
_ok_nav, _r_nav = regles.juger_navigateurs(inv_ouverture)
rouges += [f"inventaire d'ouverture : {x}" for x in _r_nav]
_barre = float(v1["BARRE_D273_MO"])
_ok_ram, _r_ram = regles.juger_ram_ouverture([v1, v2], _barre)
rouges += _r_ram
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
inventaire("apres-e2e")           # [D329 (2)] relevé informatif : le e2e et le rendu du PDF lancent des navigateurs
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
os.makedirs(os.path.join(J, "available-on-api"))
copies = vus = anterieurs = 0
for src, dst_dir, filtre in ((".neutralisation-journaux", "campagnes", lambda n: n.startswith("neutralize-")
                              and n.endswith(".py.log")),
                             (".neutralisation-journaux/rang23", "rang23", lambda n: True),
                             (".neutralisation-journaux/available-on-api", "available-on-api", lambda n: True)):
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
# [D319] `r25` est VERROUILLÉ par --int ET par --e2e (seul cas, à ce jour) ; son docstring dit « les deux drapeaux
# se combinent » — il est donc rejoué ICI avec LES DEUX, en UNE SEULE invocation qui couvre ses 11 cibles
# déclarées dans le même journal (`int-r25.log`), plutôt qu'en deux rejeux partiels dans deux journaux séparés
# que le lecteur générique (qui attend `len(lignes) == cibles déclarées` dans UN journal) ne saurait pas recoller.
for h in VERROUILLES:
    v = sonde(f"avant-int-{h}")
    regime(v, echant)
    if pg(f"int-{h}") != 0:
        arret(f"pg_isready en échec avant --int {h}", echant)
    drapeaux = ["--int", "--e2e"] if h in E2E_VERROUILLES else ["--int"]
    lancer(f"int-{h}", [sys.executable, f"neutralisation/neutralize-{h}.py", *drapeaux])
arbre(4)

# ---------------------------------------------------------------- 6b. [AJOUT D319] rejeux --e2e seul
# N'inclut QUE les harnais e2e-verrouillés déjà COUVERTS par l'étape 6 (via les deux drapeaux combinés) : un
# harnais qui n'a pas de cible --int (`r26`) n'apparaît jamais dans `VERROUILLES`, donc jamais dans la boucle
# ci-dessus — c'est pour lui seul que cette étape existe.
for h in [x for x in E2E_VERROUILLES if x not in VERROUILLES]:
    v = sonde(f"avant-e2e-{h}")
    regime(v, echant)
    p = ports_ecoutes()
    ecrire(f"ports-avant-e2e-{h}.txt", "\n".join(p) + "\n")
    if v["NODE"] != "0" or p:
        arret(f"avant --e2e {h} : node {v['NODE']}, ports {len(p)}", echant)
    if pg(f"e2e-{h}") != 0:
        arret(f"pg_isready en échec avant --e2e {h}", echant)
    lancer(f"e2e-{h}", [sys.executable, f"neutralisation/neutralize-{h}.py", "--e2e"])
    v = sonde(f"apres-e2e-{h}")
    regime(v, echant)
arbre(5)

# ---------------------------------------------------------------- 7. contre-épreuve
lancer("contre-epreuve", [sys.executable, "docs/preuves/D298/contre-epreuve/contre-epreuve.py"])
arbre(6)

# ---------------------------------------------------------------- 8. clôture
v = sonde("cloture")
inv_cloture = inventaire("cloture")             # [D329 (2)] APRÈS la passe : chrome ET headless_shell — [D334 (3)] porte dure aussi
# [D334 (4)] la RAM de CLÔTURE est jugée (règle de Ko, 13/10/2026) ; les relevés INTERMÉDIAIRES sous la barre sont NOTÉS
_barre_c = float(v["BARRE_D273_MO"])
_ok_ram_c, _r_ram_c = regles.juger_ram_cloture(v, _barre_c)
ram_ko = not _ok_ram_c
journal(f"   RAM de clôture : médiane {v['RAM_MEDIANE_MO']} / bande {v['RAM_BANDE_MO']} contre la barre {v['BARRE_D273_MO']} · " + ("AU-DESSUS" if _ok_ram_c else "⛔ SOUS LA BARRE : LA MARQUE EST REFUSÉE (règle de Ko, D331)"))
if ram_ko:
    ecrire("RAM-CLOTURE-SOUS-LA-BARRE.txt", "\n".join(_r_ram_c) + "\n")
_interm = [(n, r) for n, r in RELEVES if n not in ("ouverture-1", "ouverture-2", "cloture")]
_sous = regles.noter_intermediaires(_interm, _barre_c)
ecrire("ram-intermediaires.txt", f"relevés intermédiaires : {len(_interm)} ; sous la barre : {len(_sous)} (NOTÉS, jamais disqualifiants — règle de Ko, D331)\n" + "".join(f"  {n} : {raison}\n" for n, raison in _sous))
journal(f"   relevés intermédiaires sous la barre : {len(_sous)} sur {len(_interm)} (notés, non disqualifiants)")
# [D330 (2)] l'état des .env à la clôture, puis la COMPARAISON avec celui de l'ouverture (empreintes, fichiers apparus/disparus, hôtes non locaux)
rc_env_cloture = etat_env("cloture")
cmp_env = subprocess.run([sys.executable, "docs/preuves/D330/outils/etat-env.py", "comparer", os.path.join(J, "etat-env-ouverture.txt"), os.path.join(J, "etat-env-cloture.txt")], capture_output=True)
t_cmp = cmp_env.stdout.decode("utf-8", errors="replace") + cmp_env.stderr.decode("utf-8", errors="replace")
ecrire("etat-env-comparaison.txt", t_cmp)
env_ko = rc_env_cloture != 0 or cmp_env.returncode != 0
journal(f"   état des .env, ouverture contre clôture : code {cmp_env.returncode} · " + " · ".join(l for l in t_cmp.splitlines() if l.startswith("COMPARAISON")))
if env_ko:
    journal("⛔ L'ÉTAT DES .env A CHANGÉ ENTRE L'OUVERTURE ET LA CLÔTURE (ou un hôte n'est pas local) — LA MARQUE EST REFUSÉE (décision 2 du relecteur, D330)")
    ecrire("ENV-DIFFERENT.txt", t_cmp)
echant.terminate()
echant.wait(timeout=30)
journal("   échantillonneur arrêté")
r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-File",
                    "neutralisation/echantillonneur-etat-machine.ps1", "-Resume", os.path.join(J, "etat.csv")],
                   capture_output=True)
ecrire("etat-resume.txt", r.stdout.decode("utf-8", errors="replace") + r.stderr.decode("utf-8", errors="replace"))
journal(f"   -Resume : code {r.returncode}")
_ok_nav_c, _r_nav_c = regles.juger_navigateurs(inv_cloture)
if v["ALIM_SOURCE"] != "SECTEUR" or v["CHROME"] != "0" or not _ok_nav_c:      # [D334 (3)] `headless_shell` > 0 à la clôture disqualifie comme `chrome`
    arret(f"relevé de clôture : {v['ALIM_SOURCE']}, chrome {v['CHROME']}" + ("" if _ok_nav_c else " ; navigateur : " + " ; ".join(_r_nav_c)))
journal("CLÔTURE ATTEINTE — la lecture se fait APRÈS, sur les journaux de ce dossier")
sys.exit((5 if env_ko else 0) | (6 if ram_ko else 0))      # [D330 (3)] 5 = état des .env différent ; [D334 (5)] 6 = RAM de clôture sous la barre ; 7 = les deux : la marque est refusée
