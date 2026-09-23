"""Écriture de D301 — applique des remplacements lus dans des FICHIERS (D289 : aucun texte ne traverse un interpréteur).
Usage, depuis la racine : python3 docs/preuves/D301/ecriture/appliquer.py <lettre>...
Chaque étape <L> lit ecriture/<L>-*.ancre.txt et <L>-*.remplacement.txt ; la cible est fixée ci-dessous.
Les textes sont normalisés en CRLF (les fichiers d'autorité le sont ; un fichier neuf naît en LF).
AVANT : 0 LF nu et 0 CR seul dans la cible ; ancre trouvée EXACTEMENT 1 fois ; sinon ABANDON sans écrire.
APRÈS, relu SUR LE DISQUE (D289 — on relit le fichier, pas le compte rendu de l'outil) :
  - ancre : attendu (1 − 1 + occurrences de l'ancre DANS le remplacement) — une substitution qui barre garde son
    texte, donc l'arithmétique dépend du genre (D286) ;
  - remplacement : +1 exactement (sauf suppression, remplacement vide) ;
  - bilan de lignes = lignes du remplacement − lignes de l'ancre ;
  - RÉVERSIBILITÉ : remettre l'ancre à la place du remplacement rend le fichier d'avant À L'OCTET — donc rien d'autre
    n'a bougé (sauf suppression : pour CLAUDE.md, l'empreinte est confrontée à celle de 0a8235d) ;
  - 0 LF nu, 0 CR seul.
Chaque contrôle imprime le mesuré À CÔTÉ de l'attendu (D290)."""
import glob
import hashlib
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
ICI = "docs/preuves/D301/ecriture"
CIBLES = {"A": "CLAUDE.md", "B": "ZWADJ_CONTINUITE.md", "C": "ZWADJ_CONTINUITE.md", "D": "ZWADJ_CONTINUITE.md",
          "E": "ZWADJ_CONTINUITE.md", "F": "ZWADJ_CONTINUITE.md", "G": "ZWADJ_CONTINUITE.md",
          "H": "ZWADJ_CONTINUITE.md", "I": "ZWADJ_CONTINUITE.md", "J": "ZWADJ_BACKLOG.md", "K": "ZWADJ_BACKLOG.md",
          "L": "ZWADJ_CONTINUITE.md"}


def crlf(b):
    return b.replace(b"\r\n", b"\n").replace(b"\n", b"\r\n")


def nus(b):
    return b.count(b"\n") - b.count(b"\r\n"), b.count(b"\r") - b.count(b"\r\n")


def verifier(nom, mesure, attendu):
    ok = mesure == attendu
    print(f"   {'✓' if ok else '✗'} {nom} : {mesure} (attendu {attendu})")
    return ok


echec = False
for L in sys.argv[1:]:
    anc = glob.glob(f"{ICI}/{L}-*.ancre.txt")
    rem = glob.glob(f"{ICI}/{L}-*.remplacement.txt")
    cible = CIBLES[L]
    print(f"== étape {L} → {cible} · fichiers d'ancre {len(anc)} (attendu 1) · de remplacement {len(rem)} (attendu 1)")
    if len(anc) != 1 or len(rem) != 1:
        print("✗ ABANDON"); sys.exit(2)
    a = crlf(open(anc[0], "rb").read())
    r = crlf(open(rem[0], "rb").read())
    avant = open(cible, "rb").read()
    ok = verifier("LF nus, CR seuls AVANT", nus(avant), (0, 0))
    ok &= verifier("ancre AVANT", avant.count(a), 1)
    if not ok:
        print("✗ ABANDON — rien n'est écrit"); sys.exit(2)
    r_avant = avant.count(r) if r else 0
    nouveau = avant.replace(a, r, 1)
    open(cible, "wb").write(nouveau)
    disque = open(cible, "rb").read()
    ok &= verifier("relu sur disque = écrit", disque == nouveau, True)
    ok &= verifier("ancre APRÈS", disque.count(a), avant.count(a) - 1 + r.count(a))
    if r:
        ok &= verifier("remplacement APRÈS", disque.count(r), r_avant + 1)
        ok &= verifier("réversibilité à l'octet", disque.replace(r, a, 1) == avant, True)
    ok &= verifier("bilan de lignes", disque.count(b"\n") - avant.count(b"\n"), r.count(b"\n") - a.count(b"\n"))
    ok &= verifier("LF nus, CR seuls APRÈS", nus(disque), (0, 0))
    if L == "A":
        ref = subprocess.run(["git", "show", "0a8235d:CLAUDE.md"], capture_output=True, check=True).stdout
        h1, h2 = hashlib.sha256(disque).hexdigest(), hashlib.sha256(crlf(ref)).hexdigest()
        print(f"   · SHA-256 CLAUDE.md sur disque {h1}")
        print(f"   · SHA-256 0a8235d:CLAUDE.md (CRLF, forme du disque) {h2}")
        ok &= verifier("CLAUDE.md identique à l'octet à 0a8235d", h1 == h2, True)
    print(f"   ⇒ étape {L} : {'VÉRIFIÉE' if ok else 'EN ÉCHEC'} · {len(avant)} → {len(disque)} octets")
    echec |= not ok
sys.exit(1 if echec else 0)
