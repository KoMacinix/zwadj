"""D334 — LES TROIS RÈGLES PERMANENTES DE TOUTE CERTIFICATION, écrites dans un module PUR et CALIBRÉ à deux bras (décision 3 du relecteur, 15/10/2026 ; arbitrage de Ko du 13/10/2026, points 2, 3 et 4, D331).
NOUVEAU SCRIPT (pièce versée, procédure archivée comme preuve — jamais promue en instrument).

POURQUOI IL EXISTE. D331 a écrit trois règles et ajouté : « une règle qu'aucun outil ne vérifie n'est pas une règle ». L'outil de la passe de D330 (`passe.py`) tenait le contrôle des `.env` mais ne faisait de `headless_shell` qu'un RELEVÉ, et ne jugeait
la RAM qu'à l'ouverture. Ce module porte les deux jugements manquants sous une forme qui se REJOUE sans lancer une passe (fonctions pures + un comptage de processus), pour que la calibration soit possible AVANT la passe, à deux bras.

LES RÈGLES, MOT POUR MOT (Ko, 13/10/2026) :
  2. « Pour les prochaines certifications, la RAM se juge ainsi : l'ouverture et la clôture doivent être au-dessus de la barre ; `chrome` > 0 disqualifie toujours la fenêtre ; un relevé intermédiaire sous la barre est noté, il ne disqualifie pas. »
  3. « Le contrôle des `.env` de D330 (empreinte et hôte de chaque variable d'URL, sans aucune valeur ; hôte non local à l'ouverture = la passe ne démarre pas ; empreintes différentes à la clôture = marque refusée) devient une règle permanente de toute certification. »
  4. « `headless_shell` = 0 devient une porte dure de toute certification, comme `chrome` = 0. »
  ⚠ Lectures de la session (à confirmer par Ko, ordre des rangs, bloc D331) : « la barre » est celle que la sonde imprime (RAM médiane ET bande basse) ; « l'ouverture » = LES DEUX relevés d'ouverture ; « la clôture » = le relevé de clôture ;
  `headless_shell` = 0 se relève à l'ouverture, à chaque relevé de sonde de la fenêtre, après l'e2e et à la clôture ; un `headless_shell` > 0 à l'un d'eux disqualifie la fenêtre comme `chrome`.

CE QUE FAIT CE MODULE (fonctions) :
  compter_processus(noms)            → {nom: nombre}, par `Get-Process` (PowerShell) — jamais par un `tasklist` à analyser ;
  juger_ram_ouverture(releves, barre)→ (vrai si CHAQUE relevé d'ouverture a sa médiane ET sa bande basse ≥ barre, raisons) ;
  juger_ram_cloture(releve, barre)   → idem pour le relevé de clôture ;
  noter_intermediaires(releves, barre) → la liste des relevés intermédiaires sous la barre (NOTÉS, jamais disqualifiants) ;
  juger_navigateurs(comptes)         → (vrai si `chrome` = 0 ET `headless_shell` = 0, raisons).
  `python regles.py calibrer` rejoue la calibration (abandon, code 2, si UN bras manque) ; la passe l'appelle avant de commencer.

CALIBRATION, DEUX BRAS PAR RÈGLE (D286) : RAM — (positif) une ouverture au-dessus de la barre et une clôture au-dessus sont ACCEPTÉES, un intermédiaire sous la barre est NOTÉ sans disqualifier ; (négatif) une ouverture dont la BANDE BASSE passe sous la barre
  est REFUSÉE, une clôture dont la MÉDIANE passe sous la barre est REFUSÉE, et l'égalité EXACTE à la barre est acceptée (≥) ; navigateurs — (positif) un processus RÉEL nommé `headless_shell.exe` (copie d'un exécutable du système, lancée pour la calibration)
  est COMPTÉ 1 et REFUSÉ, puis, tué, comptée 0 et acceptée ; (négatif) un processus nommé `headless_shell_x.exe` n'est PAS compté (le nom est exact) ; `chrome` > 0 est refusé par la même fonction.
"""
import os
import re
import shutil
import subprocess
import sys
import tempfile
import time

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8")


def compter_processus(noms) -> dict:
    """Le nombre de processus de chaque nom EXACT (`Get-Process -Name`), relevé par PowerShell."""
    cmd = ("$noms = @(" + ",".join(f"'{n}'" for n in noms) + "); "
           "foreach ($n in $noms) { $p = @(Get-Process -Name $n -ErrorAction SilentlyContinue); Write-Output ('COMPTE ' + $n + '=' + $p.Count) }")
    r = subprocess.run(["powershell", "-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", cmd], capture_output=True)
    t = r.stdout.decode("utf-8", errors="replace")
    comptes = {n: int(c) for n, c in re.findall(r"^COMPTE (\S+)=(\d+)", t, re.M)}
    manquants = [n for n in noms if n not in comptes]
    if manquants:
        raise RuntimeError(f"comptage de processus en défaut pour {manquants} : {t!r}")
    return comptes


def _bas_de_bande(bande) -> float:
    return float(str(bande).split("-")[0])


def _juger_un(releve: dict, barre: float, nom: str):
    """(ok, raison) : la médiane ET le bas de la bande sont ≥ la barre (l'égalité passe)."""
    try:
        med, bas = float(releve["RAM_MEDIANE_MO"]), _bas_de_bande(releve["RAM_BANDE_MO"])
    except (TypeError, ValueError, KeyError, AttributeError):
        return False, f"{nom} : relevé illisible ({releve!r})"
    ok = med >= barre and bas >= barre
    return ok, ("" if ok else f"{nom} : médiane {med:g} / bas de bande {bas:g} contre la barre {barre:g}")


def juger_ram_ouverture(releves, barre: float):
    """Règle 2, première moitié : CHAQUE relevé d'ouverture est au-dessus de la barre."""
    verdicts = [_juger_un(r, barre, f"ouverture-{i + 1}") for i, r in enumerate(releves)]
    return all(v[0] for v in verdicts) and len(verdicts) > 0, [v[1] for v in verdicts if not v[0]]


def juger_ram_cloture(releve: dict, barre: float):
    """Règle 2, seconde moitié : le relevé de CLÔTURE est au-dessus de la barre."""
    ok, raison = _juger_un(releve, barre, "clôture")
    return ok, ([] if ok else [raison])


def noter_intermediaires(releves, barre: float):
    """Règle 2, dernière phrase : un relevé intermédiaire sous la barre est NOTÉ ; il ne disqualifie pas. Rend [(nom, raison)] des relevés sous la barre."""
    out = []
    for nom, r in releves:
        ok, raison = _juger_un(r, barre, nom)
        if not ok:
            out.append((nom, raison))
    return out


def juger_navigateurs(comptes: dict):
    """Règle 4 (et `chrome` = 0) : `chrome` ET `headless_shell` à ZÉRO. Un nom absent du relevé est un défaut d'instrument, pas un zéro."""
    raisons = []
    for nom in ("chrome", "headless_shell"):
        if nom not in comptes:
            raisons.append(f"{nom} : absent du relevé (instrument)")
        elif comptes[nom] != 0:
            raisons.append(f"{nom} = {comptes[nom]}")
    return not raisons, raisons


def calibrer(sortie=print) -> int:
    """Rejoue la calibration. Rend 0 si les 12 bras tiennent, 2 sinon (le code appelant s'ARRÊTE)."""
    manques, joues = 0, 0

    def bras(libelle, attendu, mesure):
        nonlocal manques, joues
        joues += 1
        ok = attendu == mesure
        manques += not ok
        sortie(f"   {'✓' if ok else '✗'} calibration {libelle} : {mesure!r} (attendu {attendu!r})")

    barre = 4579.0
    haut = {"RAM_MEDIANE_MO": "4949", "RAM_BANDE_MO": "4928-4962"}
    juste = {"RAM_MEDIANE_MO": "4579", "RAM_BANDE_MO": "4579-4600"}
    bande_basse = {"RAM_MEDIANE_MO": "4700", "RAM_BANDE_MO": "4551-4720"}
    med_basse = {"RAM_MEDIANE_MO": "4559.5", "RAM_BANDE_MO": "4579-4600"}
    bras("RAM, positif — deux ouvertures au-dessus de la barre", (True, []), juger_ram_ouverture([haut, haut], barre))
    bras("RAM, positif — la clôture au-dessus de la barre", (True, []), juger_ram_cloture(haut, barre))
    bras("RAM, positif — l'ÉGALITÉ exacte à la barre passe (≥)", (True, []), juger_ram_ouverture([juste], barre))
    bras("RAM, négatif — une ouverture dont la BANDE BASSE passe sous la barre est refusée (la médiane seule ne suffit pas)", False, juger_ram_ouverture([haut, bande_basse], barre)[0])
    bras("RAM, négatif — une clôture dont la MÉDIANE passe sous la barre est refusée", False, juger_ram_cloture(med_basse, barre)[0])
    bras("RAM, négatif — une liste d'ouvertures VIDE n'est pas une ouverture verte", False, juger_ram_ouverture([], barre)[0])
    bras("RAM, intermédiaires — un relevé sous la barre est NOTÉ (un seul sur trois) et ne dit rien d'autre", [("avant-int-r33", "avant-int-r33 : médiane 4700 / bas de bande 4551 contre la barre 4579")],
         noter_intermediaires([("avant-test", haut), ("avant-int-r33", bande_basse), ("avant-e2e", juste)], barre))
    bras("navigateurs — `chrome` et `headless_shell` à 0 : acceptés", (True, []), juger_navigateurs({"chrome": 0, "headless_shell": 0}))
    bras("navigateurs — `chrome` = 1 : refusé", (False, ["chrome = 1"]), juger_navigateurs({"chrome": 1, "headless_shell": 0}))
    bras("navigateurs — un nom absent du relevé est un défaut d'instrument, pas un zéro", False, juger_navigateurs({"chrome": 0})[0])
    # le comptage RÉEL : un processus nommé `headless_shell.exe` (copie d'un exécutable du système) puis un nom voisin
    dossier = tempfile.mkdtemp(prefix="zwadj-d334-regles-")
    factice = os.path.join(dossier, "headless_shell.exe")
    voisin = os.path.join(dossier, "headless_shell_x.exe")
    source = os.path.join(os.environ.get("SystemRoot", r"C:\Windows"), "System32", "ping.exe")
    shutil.copyfile(source, factice)
    shutil.copyfile(source, voisin)
    avant = compter_processus(["chrome", "headless_shell"])
    p1 = subprocess.Popen([factice, "-n", "40", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    pendant = compter_processus(["chrome", "headless_shell"])
    bras("navigateurs, comptage RÉEL — avec un processus `headless_shell.exe` vivant : compté 1 et refusé", (1, False), (pendant["headless_shell"] - avant["headless_shell"], juger_navigateurs({**pendant, "chrome": 0})[0] if avant["headless_shell"] == 0 else False))
    p1.kill()
    p1.wait()
    p2 = subprocess.Popen([voisin, "-n", "40", "127.0.0.1"], stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
    time.sleep(1.5)
    voisin_compte = compter_processus(["headless_shell"])
    bras("navigateurs, comptage RÉEL — un processus `headless_shell_x.exe` vivant n'est PAS compté (le nom est exact) ; le premier, tué, est compté 0", (avant["headless_shell"], avant["headless_shell"]), (voisin_compte["headless_shell"], avant["headless_shell"]))
    p2.kill()
    p2.wait()
    time.sleep(0.5)
    shutil.rmtree(dossier, ignore_errors=True)
    sortie(f"   calibration des règles : {joues} bras, {manques} manqué(s)")
    return 0 if manques == 0 else 2


if __name__ == "__main__":
    if len(sys.argv) == 2 and sys.argv[1] == "calibrer":
        sys.exit(calibrer())
    print(__doc__)
    sys.exit(2)
