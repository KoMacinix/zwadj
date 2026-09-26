"""D310 — VERSEMENT DES PIÈCES DE LA PASSE DE CERTIFICATION DU RANG 23 — procédure archivée comme preuve (D291),
modelée sur `docs/preuves/D299/outils/verser-passe.py`, non promue en instrument.
Usage, depuis la racine :
    python docs/preuves/D310/outils/verser.py <IDENTIFIANT DE PASSE>

Copie OCTET POUR OCTET TOUT le dossier `.neutralisation-journaux/<ID>/` (ignoré par git) vers
`docs/preuves/D310/passe-<ID>/` — le dossier de SA passe, nommé par son identifiant (décision 3 du relecteur, D309) —
puis RELIT chaque destination et confronte son SHA-256 à celui de la source (le compte rendu de la copie ne fait pas
foi, le fichier relu si — D289).
⛔ LE JOURNAL e2e BRUT N'ENTRE PAS (point 9 du critère du rang 9) : tout nom qui porte « e2e » et finit en « .log » est
REFUSÉ avant toute écriture ; son extrait est produit à part par `docs/preuves/D299/outils/extraire-e2e.py`.
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
DST = os.path.join("docs", "preuves", "D310", f"passe-{ID}")
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
        (refuses if ("e2e" in n and n.endswith(".log")) else a_verser).append(rel)
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
