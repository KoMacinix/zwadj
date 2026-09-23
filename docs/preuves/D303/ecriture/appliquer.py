"""Écriture de D303 (rang 23) — applique des remplacements lus dans des FICHIERS (D289 : aucun texte ne traverse un
interpréteur). Copie de docs/preuves/D302/ecriture/appliquer.py : MÊMES contrôles, à l'octet près dans leur logique.
⚠ UNE SEULE DIFFÉRENCE, ET ELLE EST DE FORME : la cible ne vit plus dans une table CIBLES qu'il faudrait retoucher à
chaque étape ajoutée — elle se lit dans le NOM du fichier d'étape, second champ : <E>-<C|B|AG>-<nom>.ancre.txt
(C = ZWADJ_CONTINUITE.md, B = ZWADJ_BACKLOG.md, AG = AGENTS.md). Un outil retouché en cours de lot n'est plus celui
qui a produit les sorties d'avant ; celui-ci ne bouge pas une fois versé.
Usage, depuis la racine : python3 docs/preuves/D303/ecriture/appliquer.py <étape>...
Les textes sont normalisés en CRLF (les fichiers d'autorité le sont ; un fichier neuf naît en LF).
AVANT : 0 LF nu et 0 CR seul dans la cible ; ancre trouvée EXACTEMENT 1 fois ; sinon ABANDON sans écrire.
APRÈS, relu SUR LE DISQUE (D289 — on relit le fichier, pas le compte rendu de l'outil) :
  - ancre : attendu (1 − 1 + occurrences de l'ancre DANS le remplacement) — l'arithmétique dépend du genre (D286) ;
  - remplacement : +1 exactement ;
  - bilan de lignes = lignes du remplacement − lignes de l'ancre ;
  - RÉVERSIBILITÉ : remettre l'ancre à la place du remplacement rend le fichier d'avant À L'OCTET ;
  - 0 LF nu, 0 CR seul.
Chaque contrôle imprime le mesuré À CÔTÉ de l'attendu (D290)."""
import glob
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
sys.stderr.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
ICI = "docs/preuves/D303/ecriture"
CIBLE_PAR_CODE = {"C": "ZWADJ_CONTINUITE.md", "B": "ZWADJ_BACKLOG.md", "AG": "AGENTS.md"}


def crlf(b):
    return b.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")


def nus(b):
    return b.count(b"\n") - b.count(b"\r\n"), b.count(b"\r") - b.count(b"\r\n")


def verifier(nom, mesure, attendu):
    ok = mesure == attendu
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure} (attendu {attendu})")
    return ok


echec = False
for E in sys.argv[1:]:
    anc = glob.glob(f"{ICI}/{E}-*.ancre.txt")
    rem = glob.glob(f"{ICI}/{E}-*.remplacement.txt")
    print(f"== étape {E} · fichiers d'ancre {len(anc)} (attendu 1) · de remplacement {len(rem)} (attendu 1)")
    if len(anc) != 1 or len(rem) != 1:
        print("✗ ABANDON"); sys.exit(2)
    code = os.path.basename(anc[0]).split("-")[1]
    code_r = os.path.basename(rem[0]).split("-")[1]
    if code not in CIBLE_PAR_CODE or code != code_r:
        print(f"✗ CODE DE CIBLE illisible ou discordant : {code!r} / {code_r!r} — ABANDON"); sys.exit(2)
    cible = CIBLE_PAR_CODE[code]
    print(f"   cible : {cible}")
    a = crlf(open(anc[0], "rb").read())
    r = crlf(open(rem[0], "rb").read())
    avant = open(cible, "rb").read()
    ok = verifier("LF nus, CR seuls AVANT", nus(avant), (0, 0))
    ok &= verifier("ancre AVANT", avant.count(a), 1)
    ok &= verifier("remplacement non vide", len(r) > 0, True)
    if not ok:
        print("✗ ABANDON — rien n'est écrit"); sys.exit(2)
    r_avant = avant.count(r)
    nouveau = avant.replace(a, r, 1)
    open(cible, "wb").write(nouveau)
    disque = open(cible, "rb").read()
    ok &= verifier("relu sur disque = écrit", disque == nouveau, True)
    ok &= verifier("ancre APRÈS", disque.count(a), avant.count(a) - 1 + r.count(a))
    ok &= verifier("remplacement APRÈS", disque.count(r), r_avant + 1)
    ok &= verifier("réversibilité à l'octet", disque.replace(r, a, 1) == avant, True)
    ok &= verifier("bilan de lignes", disque.count(b"\n") - avant.count(b"\n"), r.count(b"\n") - a.count(b"\n"))
    ok &= verifier("LF nus, CR seuls APRÈS", nus(disque), (0, 0))
    print(f"   ⇒ étape {E} : {'VÉRIFIÉE' if ok else 'EN ÉCHEC'} · {len(avant)} → {len(disque)} octets")
    echec |= not ok
    if not ok:
        break
sys.exit(1 if echec else 0)
