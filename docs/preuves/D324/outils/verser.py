"""D324 — COPIE de `docs/preuves/D319/outils/verser.py` (pièce de D319, non retouchée dans sa logique), SEUL CHANGEMENT DÉCLARÉ : le dossier de
destination (`"D319"` devient `"D324"` — une occurrence, comptée). Le docstring ci-dessous est celui de D319, intact ; son `docs/preuves/D319/passe-<ID>/`
se lit `docs/preuves/D324/passe-<ID>/`.
"""
"""D319 — COPIE de `docs/preuves/D314/outils/verser.py` (pièce de D314, non retouchée dans sa logique) ; VERSEMENT
DES PIÈCES DE LA PASSE DE CERTIFICATION QUI CLÔT LE RANG 27. Deux changements, déclarés :
  1. le dossier de destination (`D319`, comme D314 l'avait changé pour `D314`) ;
  2. LE FILTRE DU JOURNAL e2e BRUT, PRÉCISÉ. À D314, un SEUL fichier portait « e2e » dans son nom
     (`e2e.log`, la sortie BRUTE de `pnpm test:e2e` — Playwright, `[WebServer]`, liens de vérification). Ici, DEUX
     le portent : `e2e.log` (le même) ET `e2e-r26.log` (le DIGEST produit par `neutralize-r26.py --e2e` lui-même
     — 17 lignes, calibration + verdicts, AUCUNE sortie de serveur). Le filtre par SOUS-CHAÎNE de D314
     (`"e2e" in n`) les confondrait tous les deux. VÉRIFIÉ AVANT DE CHANGER LE FILTRE, PAS SUPPOSÉ :
     `grep -iE "verification-email|token=|zwadj_rt=|\\[WebServer\\]|password" int-r25.log e2e-r26.log` ⇒ ZÉRO
     occurrence dans les deux (int-r25.log : 44 lignes, le détail de `r25 --int --e2e` combinés, même digest
     propre). ⇒ Le filtre exclut désormais le nom EXACT `e2e.log`, pas toute sous-chaîne « e2e » — les digests de
     harnais (`e2e-r26.log`, et `int-r25.log` qui ne porte même pas « e2e » dans son nom) sont VERSÉS.
Usage, depuis la racine :
    python docs/preuves/D319/outils/verser.py <IDENTIFIANT DE PASSE>

Copie OCTET POUR OCTET TOUT le dossier `.neutralisation-journaux/<ID>/` (ignoré par git) vers
`docs/preuves/D319/passe-<ID>/` — le dossier de SA passe, nommé par son identifiant (décision 3 du relecteur, D309) —
puis RELIT chaque destination et confronte son SHA-256 à celui de la source (le compte rendu de la copie ne fait pas
foi, le fichier relu si — D289).
⛔ LE JOURNAL e2e BRUT N'ENTRE PAS (point 9 du critère du rang 9) : le fichier nommé EXACTEMENT `e2e.log` est REFUSÉ
avant toute écriture ; son extrait est produit à part par `docs/preuves/D299/outils/extraire-e2e.py`.
⛔ AUCUN ÉCRASEMENT : une destination qui existe déjà fait ABANDONNER.
Imprime son parcouru à côté de l'attendu (D290). Codes : 0 = tout versé et identique ; 2 = abandon.
"""
import hashlib
import os
import shutil
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml") or len(sys.argv) != 2:
    print(__doc__)
    sys.exit(2)
ID = sys.argv[1]
SRC = os.path.join(".neutralisation-journaux", ID)
DST = os.path.join("docs", "preuves", "D324", f"passe-{ID}")
if not os.path.isdir(SRC):
    print(f"✗ {SRC} absent")
    sys.exit(2)
if os.path.exists(DST):
    print(f"✗ {DST} existe déjà : ABANDON (aucun écrasement)")
    sys.exit(2)

a_verser, refuses = [], []
for racine, _, noms in os.walk(SRC):
    for n in sorted(noms):
        rel = os.path.relpath(os.path.join(racine, n), SRC)
        (refuses if n == "e2e.log" else a_verser).append(rel)
print(f"parcourus : {len(a_verser) + len(refuses)} fichiers · à verser : {len(a_verser)} · refusés (journal e2e brut) : "
      f"{len(refuses)} (attendu 1) {refuses}")
if len(refuses) != 1:
    print("✗ ABANDON : le journal e2e brut n'est pas exactement UN")
    sys.exit(2)
identiques = 0
for rel in a_verser:
    a, b = os.path.join(SRC, rel), os.path.join(DST, rel)
    os.makedirs(os.path.dirname(b), exist_ok=True)
    shutil.copyfile(a, b)
    identiques += hashlib.sha256(open(a, "rb").read()).digest() == hashlib.sha256(open(b, "rb").read()).digest()
print(f"versés et RELUS identiques par SHA-256 : {identiques} sur {len(a_verser)} (attendu {len(a_verser)})")
sys.exit(0 if identiques == len(a_verser) else 2)
