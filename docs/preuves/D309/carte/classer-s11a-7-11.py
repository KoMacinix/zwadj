"""D309 — CLASSEMENT de S11a-7 et S11a-11 par le critère du relecteur (chat), délégué par Ko le 26/09/2026 :
« une cible est dedans si la garde qu'elle neutralise calcule, arrondit ou valide un montant ; un montant recopié tel
quel dans un message n'en fait pas partie ».
Pièce jetable, versée. N'écrit rien : elle imprime. Les cibles sont IMPORTÉES du harnais (même chargement que
`neutralisation/verifier-mutations.py` et que la pièce de D307), jamais recopiées ; le classement est un JUGEMENT de la
session, écrit dans la section D309, sur ce que ce relevé imprime.
Pour chaque cible : (1) sa définition mot pour mot (libellé, fichier, ancre, remplacement, mesures) ; (2) la ligne GARDÉE
— l'ancre — et ce qu'elle fait d'un montant ; (3) dans le FICHIER muté, chaque ligne qui calcule, arrondit ou valide un
montant (motifs ci-dessous), avec le nombre de lignes parcourues (D290) ; (4) calibration à deux bras du détecteur de
calcul : un module connu pour calculer un montant (`deposit.ts`) doit rendre > 0, un module sans montant
(`availability-time.ts`) doit rendre 0 (D286).
Usage, depuis la racine :  python docs/preuves/D309/carte/classer-s11a-7-11.py
"""
import importlib.util
import os
import re
import sys

for f in (sys.stdout, sys.stderr):
    f.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE.")
    sys.exit(2)

spec = importlib.util.spec_from_file_location("h_s11a", "neutralisation/neutralize-s11a.py")
h = importlib.util.module_from_spec(spec)
spec.loader.exec_module(h)

# Un « calcul, arrondi ou validation d'un montant » : une ligne qui nomme un montant (…Cents, prix) ET porte une
# opération arithmétique, un arrondi, une comparaison ou un schéma de validation.
MONTANT = re.compile(r"Cents|[Pp]rice|montant|[Aa]mount")
OPERATION = re.compile(r"Math\.|round|[^=!<>]\s[*/+-]\s|\s[<>]=?\s|===|!==|z\.|\.int\(\)|\.positive\(|\.nonnegative\(")


def calculs(chemin: str):
    lignes = open(chemin, "rb").read().decode("utf-8").splitlines()
    code = [(i + 1, l) for i, l in enumerate(lignes)
            if not l.strip().startswith(("//", "*", "/*"))]
    touches = [(n, l.strip()) for n, l in code if MONTANT.search(l) and OPERATION.search(l)]
    return len(lignes), len(code), touches


print("== CALIBRATION du détecteur de calcul, deux bras")
_, _, pos = calculs("apps/api/src/venues/deposit.ts")
_, _, neg = calculs("apps/api/src/venues/availability-time.ts")
ok = len(pos) > 0 and len(neg) == 0
print(f"  {'✓' if ok else '✗'} positif deposit.ts : {len(pos)} ligne(s) (attendu > 0) · "
      f"négatif availability-time.ts : {len(neg)} (attendu 0)")
if not ok:
    print("✗ CALIBRATION MANQUÉE — aucun classement ne se lit ci-dessous.")
    sys.exit(1)

for prefixe in ("S11a-7.", "S11a-11."):
    cibles = [c for c in h.CIBLES if c[0].startswith(prefixe)]
    print(f"\n===== {prefixe} — {len(cibles)} cible(s) trouvée(s) dans le harnais (attendu 1)")
    for libelle, fichier, avant, apres, attendu, mesures in cibles:
        print("  DÉFINITION, MOT POUR MOT (tuple du harnais) :")
        print(f"    libellé      : {libelle}")
        print(f"    fichier      : {fichier}")
        print(f"    ancre        : {avant!r}")
        print(f"    remplacement : {apres!r}")
        print(f"    occurrences  : {attendu} · mesures : {mesures}")
        for nom in mesures:
            print(f"    mesure « {nom} » : {' '.join(h.MESURES[nom][0])}")
        n, nc, touches = calculs(fichier)
        print(f"  FICHIER MUTÉ : {n} lignes parcourues, {nc} hors commentaires ; lignes qui calculent, arrondissent "
              f"ou valident un montant : {len(touches)}")
        for ln, l in touches:
            print(f"    l.{ln} : {l}")
        print(f"  L'ANCRE nomme un montant : {bool(MONTANT.search(avant))} · porte une opération : "
              f"{bool(OPERATION.search(avant))}")
