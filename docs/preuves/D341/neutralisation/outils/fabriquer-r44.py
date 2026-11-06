"""Fabrique neutralisation/neutralize-r44.py : en-tête neuf + MESURES + cibles (trois parties du répertoire temporaire) + MOTEUR COPIÉ de neutralize-r43.py (lecteur, calibration, boucle) avec des noms changés.
Le moteur n'est pas retapé : il est LU dans le fichier du rang 43 (lignes de `def _est_int` à la fin) et seuls les noms R43/r43 sont changés — avec un compte exigé. Usage : python3 fabriquer-r44.py <racine> <dossier des parties> [<titres.json>]"""
import json
import os
import re
import sys

racine, parties = sys.argv[1], sys.argv[2]
titres_json = sys.argv[3] if len(sys.argv) > 3 else None

r43 = open(os.path.join(racine, "neutralisation", "neutralize-r43.py"), encoding="utf-8", newline="").read().replace("\r\n", "\n")
debut = r43.index("def _est_int(c: dict) -> bool:")
moteur = r43[debut:]

# ── les noms du moteur : compte exigé avant de remplacer.
for ancien, nouveau, attendu in [("R43_DECOUVERTE", "R44_DECOUVERTE", None), ("R43_FILTRE", "R44_FILTRE", None), ("neutralize-r43", "neutralize-r44", None), ("D339", "D341", None)]:
    n = moteur.count(ancien)
    print(f"moteur : « {ancien} » ×{n}")
    moteur = moteur.replace(ancien, nouveau)
for reste in ("r43", "R43", "D339"):
    assert reste not in moteur, f"un nom du rang 43 reste dans le moteur : {reste}"

# ── le moteur normalise les mesures AVANT tout (une liste de noms devient {nom → titre}).
ancre = "def main() -> int:\n    restaurer_si_interrompu()\n"
assert moteur.count(ancre) == 1, "ancre de main() introuvable"
moteur = moteur.replace(ancre, "def main() -> int:\n    _normaliser_mesures()\n    restaurer_si_interrompu()\n")

# ── la découverte par CLASSE de mesure : R44_CLASSE=unit | int ne joue QUE les mesures de cette classe (les cibles sans mesure de cette classe sont sautées).
ancre2 = "    actives = [c for c in toutes if not FILTRE or any(c[\"libelle\"].startswith(p) for p in FILTRE)]\n"
assert moteur.count(ancre2) == 1, "ancre « actives » introuvable"
moteur = moteur.replace(ancre2, ancre2 + "    if CLASSE:\n        if not DECOUVERTE:\n            print(\"✗ R44_CLASSE n'est admis qu'avec R44_DECOUVERTE=1 : une campagne restreinte n'est pas une campagne verte.\")\n            return 2\n        actives = [{**c, \"mesures\": {m: t for m, t in c[\"mesures\"].items() if (_mesure_de(m) in MESURES_INT) == (CLASSE == \"int\")}} for c in actives]\n        actives = [c for c in actives if c[\"mesures\"]]\n")

# ── en-tête, mesures, constantes de fichiers.
entete = '''#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 44 (D341), LOT L36-3a-1 : la COUCHE DU PERSONNEL et son Manager (CHEMIN D'IDENTITÉ, méthode RENFORCÉE).

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le GARDE GLOBAL (G-*) : fermé par défaut, ordre des exemptions, drapeau relu à chaque requête, salle du PROFIL du Bearer (jamais celle du cookie), jeton haché, refus indistincts ;
  · les DÉCISIONS PURES (P-*, W-*) : `guardVerdict`, la classe d'un refus de session et ce qui s'en ÉCRIT, le vrai hachage ou le factice, l'appareil réutilisable, la liste des mots de passe courants ;
  · les COOKIES (K-*) : noms, chemins, `HttpOnly`, `SameSite=Strict`, échéances, lecture bornée à huit appareils ;
  · le SERVICE (S-*) : l'ordre chercher → réserver → vérifier → ouvrir, UN corps pour tous les refus, les codes et les statuts, le compteur partagé avec le changement de mot de passe ;
  · le MAGASIN (A-*) : la réservation d'une tentative en UNE instruction, les prédicats SQL du garde, la fin de session qui s'écrit ou non, le remplacement conditionné au hachage lu, l'audit à charge utile FERMÉE ;
  · le CONTRAT et la NORMALISATION du nom (T-*, N-*) ; le CÂBLAGE (L-*) : ordre des gardes, liste blanche fermée, débit, `/auth/me`, SIG-1 ; le CLIENT D'API (C-*) ;
  · la BASE (M-*, sous `--int`) : les unicités, les CHECK de la tranche, les clés étrangères RESTRICT, l'énumération, le drapeau qui ne naît pas allumé.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r44.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r44.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R44_DECOUVERTE=1 python3 neutralisation/neutralize-r44.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
    R44_DECOUVERTE=1 R44_CLASSE=unit|int python3 …                      # ne joue QUE les mesures de cette classe (la découverte se fait en deux temps : l'intégration n'est jouée que pour ce que les unitaires n'ont pas mordu)
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en échec) ; le titre attendu
y est marqué en échec ET la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot est de méthode RENFORCÉE (chemin d'identité) : ses
verdicts s'écrivent en assertions NATIVES (`toBe`, `toEqual`, `toBeNull`), jamais par `.expect(<statut>)` de supertest ni par un matcher jest-dom, qui lèvent une `Error`.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution
ne doit jamais être une SOUS-CHAÎNE de son ancre (D325) — d'où les « tautologies » SQL de M-* (`("x" IS NULL OR "x" IS NOT NULL)`) plutôt qu'un retrait.
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R44_DECOUVERTE=1` liste, par cible, ce qui rougit ; le dictionnaire TITRES (après les cibles, avant le moteur) est écrit à partir de ce relevé.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — aucun écran ne consomme encore le client du personnel (L36-4) ; (2) l'effet de `SameSite=Strict` quand Pro et API sont sur
DEUX sites : c'est une contrainte de MISE EN SERVICE, pas une propriété du code ; (3) le XSS (`HttpOnly` empêche de LIRE un cookie, pas de l'UTILISER) ; (4) le COÛT du garde par requête Pro — mesuré à part,
`docs/preuves/D341/mesure/` ; (5) l'envoi réel d'une notification (le transport WhatsApp est un logueur de développement) ; (6) le sens « un compte désactivé garde sa session jusqu'à la requête suivante » : la
session est refusée à la requête SUIVANTE (MP-4), pas coupée en cours de requête.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-r43.py` (lui-même copié de `neutralize-r42.py`, `neutralize-r39.py`, calibré
D316 / D325 / D331 / D332 / D333) ; seuls les noms, le jeu de cibles et le bilan changent. Fabriqué par un script qui LIT le moteur dans `neutralize-r43.py` (aucune ligne du moteur n'est retapée).
"""

import hashlib
import io
import json
import os
import re
import shutil
import subprocess
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-r44"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r44")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\\x1b\\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R44_DECOUVERTE") == "1"
# `R44_FILTRE="P-,S-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R44_FILTRE", "").split(",") if p]
CLASSE = os.environ.get("R44_CLASSE", "")  # « unit » | « int » — POUR LA DÉCOUVERTE SEULEMENT


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    # ── unitaires : API (`@zwadj/api`), client d'API (`@zwadj/api-client`).
    "politique": _vitest("@zwadj/api", "src/staff/staff-session-policy.spec.ts"),
    "mdp": _vitest("@zwadj/api", "src/staff/staff-password-policy.spec.ts"),
    "cookies": _vitest("@zwadj/api", "src/staff/staff-cookies.spec.ts"),
    "service": _vitest("@zwadj/api", "src/staff/staff-session.service.spec.ts"),
    "garde": _vitest("@zwadj/api", "src/staff/staff-session.guard.spec.ts"),
    "magasin": _vitest("@zwadj/api", "src/staff/staff-store.prisma.spec.ts"),
    "sources": _vitest("@zwadj/api", "src/staff/staff-source-guards.spec.ts"),
    "contrat": _vitest("@zwadj/api", "src/common/staff-contract.spec.ts"),
    "nom": _vitest("@zwadj/api", "src/common/staff-account-name.spec.ts"),
    "client-api": _vitest("@zwadj/api-client", "src/staff-client.test.ts"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-activation": _vitest_int("test/int/staff-activation.int-spec.ts"),
    "int-connexion": _vitest_int("test/int/staff-login.int-spec.ts"),
    "int-mdp": _vitest_int("test/int/staff-password.int-spec.ts"),
    "int-garde": _vitest_int("test/int/staff-session-guard.int-spec.ts"),
    "int-schema": _vitest_int("test/int/staff-schema.int-spec.ts"),
    "int-migration": _vitest_int("test/int/migration-non-empty.int-spec.ts"),
    "int-debit": _vitest_int("test/int/throttle.int-spec.ts"),
    "int-journal": _vitest_int("test/int/log-set-cookie.int-spec.ts"),
    "int-contrat": _vitest_int("test/int/contract-api-client.int-spec.ts"),
}
MESURES_INT = {m for m in MESURES if m.startswith("int-")}
AVEC_INT = "--int" in sys.argv

POLITIQUE = "apps/api/src/staff/staff-session-policy.ts"
MDP = "apps/api/src/staff/staff-password-policy.ts"
COOKIES = "apps/api/src/staff/staff-cookies.ts"
SERVICE = "apps/api/src/staff/staff-session.service.ts"
GARDE = "apps/api/src/staff/staff-session.guard.ts"
MAGASIN = "apps/api/src/staff/staff-store.prisma.ts"
CONTROLEUR = "apps/api/src/staff/staff-session.controller.ts"
MODULE_APP = "apps/api/src/app.module.ts"
THROTTLE = "apps/api/src/auth/auth.throttle.ts"
AUTH_CTRL = "apps/api/src/auth/auth.controller.ts"
TYPES = "packages/types/src/staff.ts"
NOM = "packages/types/src/staff-account-name.ts"
CLIENT = "packages/api-client/src/staff-client.ts"
MIGRATION = "apps/api/prisma/migrations/20261104170000_staff_layer/migration.sql"

CIBLES: list[dict] = []
A_DECOUVRIR = "?"


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures, genre: str = "substitution") -> None:
    """`mesures` : une LISTE de noms de mesure (les titres viennent de TITRES, relevés par la découverte) ou {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


def _normaliser_mesures() -> None:
    """Une liste de noms de mesure devient {nom → titre} d'après TITRES (« identifiant|mesure »). Une mesure sans titre relevé porte « ? » : la campagne refuse de juger (hors découverte)."""
    for c in CIBLES:
        if isinstance(c["mesures"], dict):
            continue
        ident = c["libelle"].split(".")[0]
        gardees = [m for m in c["mesures"] if f"{ident}|{m}" in TITRES or not TITRES_RELEVES]
        c["mesures"] = {m: TITRES.get(f"{ident}|{m}", A_DECOUVRIR) for m in gardees}
    vides = [c["libelle"].split(".")[0] for c in CIBLES if not c["mesures"]]
    if vides and not DECOUVERTE:
        print(f"✗ {len(vides)} cible(s) sans AUCUNE mesure qui mord au relevé : {', '.join(vides)} — la retirer par écrit (mutation équivalente) ou réparer la mesure ; aucun verdict n'est rendu.")
        sys.exit(2)

'''

pied = '''

# ── TITRES : le titre (ou un fragment) du test qui doit rougir, par « identifiant|mesure ». ÉCRIT À PARTIR DU RELEVÉ de la découverte (jamais de mémoire) ; une mesure absente d'ici n'a pas mordu au relevé.
# <<TITRES>>
TITRES: dict[str, str] = {}
TITRES_RELEVES = False
# <</TITRES>>
'''

# ── le dictionnaire TITRES, quand il est fourni.
if titres_json:
    titres = json.load(open(titres_json, encoding="utf-8"))
    lignes = ["TITRES: dict[str, str] = {"]
    for cle in sorted(titres, key=lambda k: (k.split("|")[0][0], int(re.search(r"-(\d+)\|", k).group(1)), k)):
        lignes.append(f"    {json.dumps(cle, ensure_ascii=False)}: {json.dumps(titres[cle], ensure_ascii=False)},")
    lignes.append("}")
    lignes.append("TITRES_RELEVES = True")
    bloc = "\n".join(lignes)
    pied = pied.replace("TITRES: dict[str, str] = {}\nTITRES_RELEVES = False", bloc)

contenu_parties = ""
for nom in ("cibles-r44.part.py", "cibles-r44.part2.py", "cibles-r44.part3.py"):
    contenu_parties += open(os.path.join(parties, nom), encoding="utf-8", newline="").read().replace("\r\n", "\n")

sortie = entete + contenu_parties + "\n" + pied + "\n\n" + moteur.rstrip("\n") + "\n"
cible_sortie = os.path.join(racine, "neutralisation", "neutralize-r44.py")
open(cible_sortie, "w", encoding="utf-8", newline="").write(sortie)
print(f"écrit : {cible_sortie} · {sortie.count(chr(10))} lignes · {len(re.findall(r'^cible[(]', sortie, re.M))} cibles")
