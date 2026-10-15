"""Fabrique docs/preuves/D334/outils/passe.py à partir de celui de D330 : modifications DÉCLARÉES, chacune comptée (assertions avant ET après)."""
import sys

sys.stdout.reconfigure(encoding="utf-8")
SRC = "docs/preuves/D330/outils/passe.py"
DST = "docs/preuves/D334/outils/passe.py"
s = open(SRC, encoding="utf-8", newline="").read()
assert "\r" not in s
n_lignes_avant = s.count("\n")
compte = {}


def rep(cle, old, new, count=1):
    global s
    assert s.count(old) == count, (cle, s.count(old), old[:90])
    s = s.replace(old, new)
    compte[cle] = compte.get(cle, 0) + count


ENTETE = '''"""D334 — LA PASSE DE CERTIFICATION QUI COUVRE D331, D332 ET D333 (rang 40). COPIE de `docs/preuves/D330/outils/passe.py` (elle-même copie de celui de D329, de D319), CINQ MODIFICATIONS DÉCLARÉES, chacune comptée à la fabrication (`fab-passe.py`, assertions avant ET après) :
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
'''
s = ENTETE + s
compte["entete"] = 1

# (1) le module des règles, chargé et calibré avant tout
rep("(1)", "def horo() -> str:", '''import importlib.util
_sp = importlib.util.spec_from_file_location("regles_d334", "docs/preuves/D334/outils/regles.py")
regles = importlib.util.module_from_spec(_sp)
_sp.loader.exec_module(regles)                      # [D334 (1)] le module pur des trois règles
RELEVES: list = []                                  # [D334 (4)] tous les relevés de sonde, dans l'ordre : (nom, dict)


def horo() -> str:''')
rep("(1)", 'journal(f"PASSE {ID} — HEAD attendu {SHA}")\n', 'journal(f"PASSE {ID} — HEAD attendu {SHA}")\nif regles.calibrer(journal) != 0:                   # [D334 (1)] la calibration des règles se REJOUE avant la passe\n    journal("⛔ CALIBRATION DES RÈGLES MANQUÉE — RIEN N\'EST LANCÉ")\n    sys.exit(2)\n')
# (4) mémoriser les relevés
rep("(4)", '    v["code"] = r.returncode\n    v["calibration"]', '    v["code"] = r.returncode\n    RELEVES.append((nom, dict(v)))                  # [D334 (4)]\n    v["calibration"]')
# (2) inventaire rend ses comptes
rep("(2)", '''            f"node {comptes.get('node')} · msedge {comptes.get('msedge')} (relevé, pas une porte) · code {r.returncode}")''',
    '''            f"node {comptes.get('node')} · msedge {comptes.get('msedge')} · code {r.returncode}")
    return {k: int(v) for k, v in comptes.items()}          # [D334 (2)] rendu, pour que `headless_shell` = 0 soit une PORTE (D334 (3))''')
rep("(2)", "def inventaire(nom: str) -> None:", "def inventaire(nom: str) -> dict:")
# (3) regime : headless_shell
rep("(3)", '''    if v["CHROME"] != "0":
        arret(f"chrome = {v['CHROME']} à un relevé", echant)
''', '''    if v["CHROME"] != "0":
        arret(f"chrome = {v['CHROME']} à un relevé", echant)
    ok_nav, raisons_nav = regles.juger_navigateurs(regles.compter_processus(["chrome", "headless_shell"]))    # [D334 (3)] `headless_shell` = 0, porte dure comme `chrome` = 0
    if not ok_nav:
        arret("navigateur à un relevé : " + " ; ".join(raisons_nav), echant)
''')
# (3)+(4) la porte dure d'ouverture
rep("(3)", '''inventaire("ouverture")           # [D329 (2)] AVANT la passe : chrome ET headless_shell''', '''inv_ouverture = inventaire("ouverture")           # [D329 (2)] AVANT la passe : chrome ET headless_shell — [D334 (3)] ET c'est une porte dure''')
rep("(4)", '''    if v["sous_barre"] is not False:
        rouges.append(f"{nom} : RAM médiane {v['RAM_MEDIANE_MO']} / bande {v['RAM_BANDE_MO']} contre la barre "
                      f"{v['BARRE_D273_MO']}")
''', '')
rep("(4)", '''if not v1["calibration"]:
    rouges.append("ouverture-1 : calibration NON passante")
''', '''if not v1["calibration"]:
    rouges.append("ouverture-1 : calibration NON passante")
# [D334 (3)] `headless_shell` = 0 et `chrome` = 0 à l'inventaire d'ouverture ; [D334 (4)] la RAM : CHAQUE relevé d'ouverture, médiane ET bas de bande, au-dessus de la barre que la sonde imprime
_ok_nav, _r_nav = regles.juger_navigateurs(inv_ouverture)
rouges += [f"inventaire d'ouverture : {x}" for x in _r_nav]
_barre = float(v1["BARRE_D273_MO"])
_ok_ram, _r_ram = regles.juger_ram_ouverture([v1, v2], _barre)
rouges += _r_ram
''')
# (4)+(3) la clôture
rep("(4)", '''v = sonde("cloture")
inventaire("cloture")             # [D329 (2)] APRÈS la passe : chrome ET headless_shell''', '''v = sonde("cloture")
inv_cloture = inventaire("cloture")             # [D329 (2)] APRÈS la passe : chrome ET headless_shell — [D334 (3)] porte dure aussi
# [D334 (4)] la RAM de CLÔTURE est jugée (règle de Ko, 13/10/2026) ; les relevés INTERMÉDIAIRES sous la barre sont NOTÉS
_barre_c = float(v["BARRE_D273_MO"])
_ok_ram_c, _r_ram_c = regles.juger_ram_cloture(v, _barre_c)
ram_ko = not _ok_ram_c
journal(f"   RAM de clôture : médiane {v['RAM_MEDIANE_MO']} / bande {v['RAM_BANDE_MO']} contre la barre {v['BARRE_D273_MO']} · " + ("AU-DESSUS" if _ok_ram_c else "⛔ SOUS LA BARRE : LA MARQUE EST REFUSÉE (règle de Ko, D331)"))
if ram_ko:
    ecrire("RAM-CLOTURE-SOUS-LA-BARRE.txt", "\\n".join(_r_ram_c) + "\\n")
_interm = [(n, r) for n, r in RELEVES if n not in ("ouverture-1", "ouverture-2", "cloture")]
_sous = regles.noter_intermediaires(_interm, _barre_c)
ecrire("ram-intermediaires.txt", f"relevés intermédiaires : {len(_interm)} ; sous la barre : {len(_sous)} (NOTÉS, jamais disqualifiants — règle de Ko, D331)\\n" + "".join(f"  {n} : {raison}\\n" for n, raison in _sous))
journal(f"   relevés intermédiaires sous la barre : {len(_sous)} sur {len(_interm)} (notés, non disqualifiants)")''')
rep("(3)", '''if v["ALIM_SOURCE"] != "SECTEUR" or v["CHROME"] != "0":
    arret(f"relevé de clôture : {v['ALIM_SOURCE']}, chrome {v['CHROME']}")''', '''_ok_nav_c, _r_nav_c = regles.juger_navigateurs(inv_cloture)
if v["ALIM_SOURCE"] != "SECTEUR" or v["CHROME"] != "0" or not _ok_nav_c:      # [D334 (3)] `headless_shell` > 0 à la clôture disqualifie comme `chrome`
    arret(f"relevé de clôture : {v['ALIM_SOURCE']}, chrome {v['CHROME']}" + ("" if _ok_nav_c else " ; navigateur : " + " ; ".join(_r_nav_c)))''')
# (5) code de sortie
rep("(5)", "sys.exit(5 if env_ko else 0)      # [D330 (3)] 5 = passe jouée MAIS état des .env différent : la marque est refusée", "sys.exit((5 if env_ko else 0) | (6 if ram_ko else 0))      # [D330 (3)] 5 = état des .env différent ; [D334 (5)] 6 = RAM de clôture sous la barre ; 7 = les deux : la marque est refusée")
open(DST, "w", encoding="utf-8", newline="\n").write(s)
r = open(DST, "rb").read()
assert r.count(b"\r") == 0
print("modifications comptées :", compte, "| lignes", n_lignes_avant, "→", r.count(b"\n"))
# la fabrication est juste si le fichier se compile
compile(open(DST, encoding="utf-8").read(), DST, "exec")
print("compile : ok")
