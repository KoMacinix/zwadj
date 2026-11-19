#!/usr/bin/env python3
"""Fabrique neutralisation/neutralize-r56.py : le MOTEUR est LU dans neutralisation/neutralize-r44.py (aucune ligne du moteur n'est retapée : même lecteur, même calibration, même boucle), l'en-tête, les mesures et
les cibles sont ceux du rang 56. Lancé depuis la RACINE : python3 construire_r56.py <cibles.txt> [titres.json]. Archivé comme PIÈCE (D291), jamais promu en instrument.
Les titres relevés par la découverte s'écrivent dans le bloc TITRES (entre `# <<TITRES>>` et `# <</TITRES>>`) par `remplir_titres.py`."""
import json
import re
import sys

R44 = "neutralisation/neutralize-r44.py"
SORTIE = "neutralisation/neutralize-r56.py"
cibles = open(sys.argv[1], encoding="utf-8", newline="").read().replace("\r\n", "\n")
titres = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else None

src = open(R44, encoding="utf-8", newline="").read().replace("\r\n", "\n")


def entre(debut: str, fin: str) -> str:
    i = src.index(debut)
    j = src.index(fin, i)
    return src[i:j]


def adapter(texte: str) -> str:
    n = texte.count("R44_") + texte.count("r44")
    t = texte.replace("R44_", "R56_").replace("neutralize-r44", "neutralize-r56").replace(".neutralisation-r44", ".neutralisation-r56").replace('"r44"', '"r56"')
    assert "r44" not in t.replace("neutralize-r43", "").replace("neutralize-r39", ""), [m.group(0) for m in re.finditer(r".{30}r44.{30}", t)][:3]
    return t


imports = entre("import hashlib", 'SAUVEGARDE = ".neutralisation-r44"')
cible_def = entre("CIBLES: list[dict] = []", "# ── G — le GARDE GLOBAL")
moteur = src[src.index("def _est_int(c: dict) -> bool:") :]

# l'empreinte du harnais en tête de chaque journal (R-9 de D349) : on la FABRIQUE dans le moteur, on ne la retape pas
a = '        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(sortie)'
assert moteur.count(a) == 1
moteur = moteur.replace(a, a.replace(".write(sortie)", ".write(_entete_journal() + sortie)"))
b = '            io.open(os.path.join(JOURNAUX, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(sortie)'
assert moteur.count(b) == 1
moteur = moteur.replace(b, b.replace(".write(sortie)", ".write(_entete_journal() + sortie)"))
c = "def main() -> int:\n    _normaliser_mesures()"
assert moteur.count(c) == 1
moteur = moteur.replace(c, c.replace("    _normaliser_mesures()", "    print(f\"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\")\n    _normaliser_mesures()"))
moteur = adapter(moteur)
imports = adapter(imports)
cible_def = adapter(cible_def)

ENTETE = '''#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 56 (D354), LOT L36-3a-2 : le PERSONNEL et ses CAPACITÉS, côté serveur (CHEMIN D'IDENTITÉ, méthode RENFORCÉE).

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · l'ÉTAT DU COMPTE (E-*) : `etatDuCompte` — UNE copie de la règle (S-104) : l'échéance incluse, désactivé, temporaire expiré refusé, mot de passe de 90 jours expiré « à changer », le marqueur « temporaire », l'heure ;
  · le VERDICT D'ACCÈS (V-*) : refus de session, « à changer » = la seule route du membre, lecture / écriture, la règle par défaut S-107, la capacité déclarée ;
  · la TABLE DES CAPACITÉS (C-*) : chaque ligne, `peut`, fermé par défaut (capacité et rôle inconnus), table figée ;
  · « JAMAIS ZÉRO MANAGER », la décision (M-*) et son verrou (A-20 à A-26, sous PostgreSQL réel) ;
  · le MOT DE PASSE TEMPORAIRE (T-*) : rejet (le biais modulo), longueur, chiffre et lettre, alphabet, aléa passé en paramètre ;
  · le GARDE (G-*), le SERVICE DE SESSION (S-*) : ce que ce lot y ajoute — la capacité, la méthode, la route du membre, l'état jugé à l'heure de la base ;
  · le SERVICE DE GESTION (B-*) et le MAGASIN (A-*) : K-19 à K-22 — le clair jamais au magasin, l'acteur, la salle, les erreurs métier, le CAS, l'audit dans la transaction, la fin des sessions, la révocation des appareils ;
  · le CÂBLAGE (D-*, K-*, L-*, I-*) : les déclarations, l'en-tête `no-store`, la route du membre, le contrat, le masque du journal, le client d'API.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r56.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r56.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R56_DECOUVERTE=1 python3 neutralisation/neutralize-r56.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
    R56_DECOUVERTE=1 R56_CLASSE=unit|int python3 …                      # ne joue QUE les mesures de cette classe
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ L'EMPREINTE DU HARNAIS EN TÊTE DE CHAQUE JOURNAL (R-9 de D349) : première ligne de la sortie et de CHAQUE journal de mesure ; un harnais modifié en cours de campagne ⇒ la campagne est rejouée EN ENTIER.
⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316, D323) : la ligne « Tests » compte au moins un test en échec ; le titre attendu y est marqué en échec ET la PREMIÈRE
ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot est de méthode RENFORCÉE (chemin d'identité) : ses verdicts s'écrivent en assertions NATIVES (`toBe`,
`toEqual`), jamais par `.expect(<statut>)` de supertest ni par une requête de Testing Library, qui lèvent une `Error` (S-192 refusée, D352).
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution ne doit jamais
être une SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R56_DECOUVERTE=1` liste, par cible, ce qui rougit ; le dictionnaire TITRES est écrit à partir de ce relevé par `remplir_titres.py`.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — aucun écran ne consomme encore ces routes (L36-4) ; (2) le coût du garde et de la couche activée par requête ; (3) la fin de
`seedReferentials`… (rien : aucun e2e n'est muté ici) ; (4) la sérialisation réelle de la course de deux désactivations sous une charge que la machine ne produit pas : elle est mesurée par un entrelacement
FORCÉ (cibles A-20, A-26) et par trente manches, pas par une charge ; (5) le sens « le garde laisse passer une session dont le membre a été désactivé entre sa lecture et la décision » : la session est refusée à
la requête SUIVANTE (MP-4), pas coupée en cours de requête.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Moteur, lecteur et calibration : LUS dans `neutralize-r44.py` (D341, lui-même copié de `neutralize-r43.py`) par
`docs/preuves/D354/neutralisation/construire-r56.py` — aucune ligne du moteur n'est retapée ; seuls l'en-tête, les mesures, les cibles et l'empreinte en tête de journal changent.
"""

'''

CONFIG = '''EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")


def _entete_journal() -> str:
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\\n"


SAUVEGARDE = ".neutralisation-r56"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r56")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\\x1b\\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R56_DECOUVERTE") == "1"
# `R56_FILTRE="E-,V-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R56_FILTRE", "").split(",") if p]
CLASSE = os.environ.get("R56_CLASSE", "")  # « unit » | « int » — POUR LA DÉCOUVERTE SEULEMENT


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    # ── unitaires : API (`@zwadj/api`), client d'API (`@zwadj/api-client`).
    "etat": _vitest("@zwadj/api", "src/staff/staff-account-state.spec.ts"),
    "acces": _vitest("@zwadj/api", "src/staff/staff-access-policy.spec.ts"),
    "membres-politique": _vitest("@zwadj/api", "src/staff/staff-members-policy.spec.ts"),
    "temporaire": _vitest("@zwadj/api", "src/staff/staff-temporary-password.spec.ts"),
    "capacites": _vitest("@zwadj/api", "src/common/staff-capabilities.spec.ts"),
    "contrat": _vitest("@zwadj/api", "src/common/staff-contract.spec.ts"),
    "service-membres": _vitest("@zwadj/api", "src/staff/staff-members.service.spec.ts"),
    "service": _vitest("@zwadj/api", "src/staff/staff-session.service.spec.ts"),
    "garde": _vitest("@zwadj/api", "src/staff/staff-session.guard.spec.ts"),
    "magasin": _vitest("@zwadj/api", "src/staff/staff-store.prisma.spec.ts"),
    "sources": _vitest("@zwadj/api", "src/staff/staff-source-guards.spec.ts"),
    "client-api": _vitest("@zwadj/api-client", "src/staff-client.test.ts"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-membres": _vitest_int("test/int/staff-members.int-spec.ts"),
    "int-dernier-manager": _vitest_int("test/int/staff-last-manager.int-spec.ts"),
    "int-capacites": _vitest_int("test/int/staff-capabilities.int-spec.ts"),
    "int-expiration": _vitest_int("test/int/staff-password-expiry.int-spec.ts"),
    "int-journal": _vitest_int("test/int/log-temporary-password.int-spec.ts"),
    "int-garde": _vitest_int("test/int/staff-session-guard.int-spec.ts"),
    "int-contrat": _vitest_int("test/int/contract-api-client.int-spec.ts"),
}
MESURES_INT = {m for m in MESURES if m.startswith("int-")}
AVEC_INT = "--int" in sys.argv

ETAT = "apps/api/src/staff/staff-account-state.ts"
ACCES = "apps/api/src/staff/staff-access-policy.ts"
POLITIQUE_MEMBRES = "apps/api/src/staff/staff-members-policy.ts"
TEMPO = "apps/api/src/staff/staff-temporary-password.ts"
CAPA = "packages/types/src/staff-capabilities.ts"
GARDE = "apps/api/src/staff/staff-session.guard.ts"
SERVICE = "apps/api/src/staff/staff-session.service.ts"
SERVICE_MEMBRES = "apps/api/src/staff/staff-members.service.ts"
CTRL_MEMBRES = "apps/api/src/staff/staff-members.controller.ts"
CTRL_SESSION = "apps/api/src/staff/staff-session.controller.ts"
MAGASIN = "apps/api/src/staff/staff-store.prisma.ts"
MODULE_STAFF = "apps/api/src/staff/staff.module.ts"
DECOS = "apps/api/src/staff/staff-decorators.ts"
TYPES = "packages/types/src/staff.ts"
CLIENT = "packages/api-client/src/staff-client.ts"
VENUES_CTRL = "apps/api/src/venues/venues.controller.ts"
APP_MODULE = "apps/api/src/app.module.ts"

'''

if titres is None:
    bloc_titres = "TITRES: dict[str, str] = {\n}\nTITRES_RELEVES = False\n"
else:
    lignes = "".join(f"    {json.dumps(k, ensure_ascii=False)}: {json.dumps(v, ensure_ascii=False)},\n" for k, v in titres.items())
    bloc_titres = f"TITRES: dict[str, str] = {{\n{lignes}}}\nTITRES_RELEVES = True\n"

TITRES_BLOC = (
    "# ── TITRES : le titre (ou un fragment) du test qui doit rougir, par « identifiant|mesure ». ÉCRIT À PARTIR DU RELEVÉ de la découverte (jamais de mémoire) ; une mesure absente d'ici n'a pas mordu au relevé.\n"
    "# <<TITRES>>\n" + bloc_titres + "# <</TITRES>>\n\n\n"
)

sortie = ENTETE + imports + CONFIG + cible_def + cibles + "\n\n" + TITRES_BLOC + moteur
open(SORTIE, "w", encoding="utf-8", newline="").write(sortie.replace("\n", "\r\n"))
print(f"écrit : {SORTIE} ({sortie.count(chr(10))} lignes) ; cibles déclarées : {cibles.count(chr(10) + 'cible(') + (1 if cibles.startswith('cible(') else 0)}")
