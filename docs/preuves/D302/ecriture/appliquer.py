"""Écriture de D302 (rang 22) — applique des remplacements lus dans des FICHIERS (D289 : aucun texte ne traverse un
interpréteur). Adapté de docs/preuves/D301/ecriture/appliquer.py : mêmes contrôles, table de cibles propre à ce lot,
sans le cas particulier de CLAUDE.md (ce lot ne touche pas CLAUDE.md).
Usage, depuis la racine : python3 docs/preuves/D302/ecriture/appliquer.py <étape>...
Chaque étape <E> lit ecriture/<E>-*.ancre.txt et <E>-*.remplacement.txt ; la cible est fixée par CIBLES ci-dessous.
Les textes sont normalisés en CRLF (les fichiers d'autorité le sont ; un fichier neuf naît en LF).
AVANT : 0 LF nu et 0 CR seul dans la cible ; ancre trouvée EXACTEMENT 1 fois ; sinon ABANDON sans écrire.
APRÈS, relu SUR LE DISQUE (D289 — on relit le fichier, pas le compte rendu de l'outil) :
  - ancre : attendu (1 − 1 + occurrences de l'ancre DANS le remplacement) — l'arithmétique dépend du genre (D286) :
    une insertion garde son ancre, une substitution qui barre la garde aussi, une substitution pure la perd ;
  - remplacement : +1 exactement ;
  - bilan de lignes = lignes du remplacement − lignes de l'ancre ;
  - RÉVERSIBILITÉ : remettre l'ancre à la place du remplacement rend le fichier d'avant À L'OCTET — donc rien d'autre
    n'a bougé ;
  - 0 LF nu, 0 CR seul.
Chaque contrôle imprime le mesuré À CÔTÉ de l'attendu (D290)."""
import glob
import os
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    sys.exit(2)
ICI = "docs/preuves/D302/ecriture"
C, B, AG = "ZWADJ_CONTINUITE.md", "ZWADJ_BACKLOG.md", "AGENTS.md"
CIBLES = {
    # partie A
    "A1": C,   # ordre des rangs : rang 21 consommé (D301), règle « aucun lot hors rang », rang 22, rang 23, décision due
    "A2": C,   # points d'entrée : rang 22 (ouvert) et rang 21 (clôture courte)
    "A3": C,   # clôture du rang 20 : « RANG 21 : EN ATTENTE » consommé (patron de D300 sur le rang 19)
    "A4": C,   # section D301 : « hors rang » annoté comme rejeté
    "A5": C,   # registre : ligne D301 annotée
    "A6": B,   # backlog : section des reports de D301 annotée
    "A7": B,   # backlog : [DOC][P3] « Pourquoi (b) » — ce qu'il suit a changé
    "A8": AG,  # AGENTS.md : règles de Ko — aucun lot hors rang ; forme des entrées neuves
    "A9": AG,  # AGENTS.md : « Ne pas coder les chemins d'argent sans tests + demande de revue » annotée
    "A9b": AG,  # AGENTS.md : arbitrages E3 et forme de la revue, insérés après « NE PAS LIVRER E3 »
    "A10": AG,  # AGENTS.md : « requiert revue humaine » (Méthode) annotée
    "A11": AG,  # AGENTS.md : pointeur « ORDRE DES RANGS » sous « État des lots » (point 4)
    "A12": C,  # « Prochaines tranches » : « à coder par Ko » barré ; tête de la méthode renforcée : arbitrages
    "A13": C,  # méthode renforcée, point 10 : « Revue humaine obligatoire (D39) » annotée
    "A14": C,  # en-tête : « E3 … à revue humaine (D39) » annotée
    "A15": C,  # D39 (décisions tranchées) : ce que « revue humaine D39 » cite
    "A16": C,  # « Méthode de travail » : « Chemins critiques … = revue humaine obligatoire » annotée
    "A17": B,  # backlog, PHASE 7 : arbitrages E3 et forme de la revue
    "A18": B,  # backlog : report [INFRA] de D301 passé à la forme de Ko — l'étiquette
    "A18b": B,  # backlog : report [INFRA] de D301 — la priorité de la session barrée, BLOQUE / COÛT ajoutés
    # partie B
    "B1": B,   # backlog : section des reports de D302 (audits du 09/09, confrontés à HEAD)
    "B2": B,   # 4 — logger pino, redaction
    "B3": B,   # 5.1 — EMAIL_ALREADY_USED
    "B4": B,   # 5.1 — reset-password ✅ « atomique en une transaction » (contradiction connue)
    "B5": B,   # 5.1bis — exposition résiduelle JWT (D4)
    "B6": B,   # 8.1 — fournisseur e-mail transactionnel
    "B7": B,   # PHASE 13 — HTTPS/HSTS, en-têtes/CSP
    "B8": B,   # PHASE 13 — limitation de débit
    "B9": B,   # PHASE 13 — scan de dépendances
    "B10": B,  # PHASE 14 — CGU, confidentialité, anonymisation, consentement
    "B11": B,  # PHASE 17 — compose, schéma d'environnement
    "B12": B,  # PHASE 19 — sauvegardes
    "B13": B,  # 23.6 — MFA admin
    "B14": B,  # 23.12 — règles de prix côté serveur
    "B15": B,  # reports DIP/ISP/SRP — S12 à S14
    "B16": B,  # reports SOLID/Strategy 22/08 — « F2 — décomposition »
    "B17": C,  # CONTINUITE, « Dette restante » — arithmétiques dupliquées côté navigateur (A3)
    # clôture
    "C1": C,   # section de session D302
    "C2": C,   # registre : ligne D302
    "C3": C,   # point d'entrée du rang 22 : rafraîchi à la clôture (règle de D294)
    "C4": C,   # ordre des rangs : rang 22 CLOS, la ligne du rang 23 reste vraie
}


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
    if E not in CIBLES:
        print(f"✗ ÉTAPE INCONNUE {E} — ABANDON"); sys.exit(2)
    anc = glob.glob(f"{ICI}/{E}-*.ancre.txt")
    rem = glob.glob(f"{ICI}/{E}-*.remplacement.txt")
    cible = CIBLES[E]
    print(f"== étape {E} → {cible} · fichiers d'ancre {len(anc)} (attendu 1) · de remplacement {len(rem)} (attendu 1)")
    if len(anc) != 1 or len(rem) != 1:
        print("✗ ABANDON"); sys.exit(2)
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
