#!/usr/bin/env python3
"""Fabrique neutralisation/neutralize-r58.py : le MOTEUR est LU dans neutralisation/neutralize-r57.py (aucune ligne du moteur n'est retapée : même lecteur, même calibration, même boucle, même empreinte en tête de
chaque journal) ; l'en-tête, les mesures et les cibles sont ceux du rang 58. Lancé depuis la RACINE : python3 construire-r58.py <cibles.txt> [titres.json]. Archivé comme PIÈCE (D291), jamais promu en instrument.
⚠ Une correction du moteur de r57 (ou de r56 / r44, dont r57 est lui-même fabriqué) ne se propage pas à r58 sans le reconstruire (entrée de backlog de D354).
Les titres relevés par la découverte s'écrivent dans le bloc TITRES (entre `# <<TITRES>>` et `# <</TITRES>>`) par `remplir-titres.py`."""
import json
import re
import sys

R57 = "neutralisation/neutralize-r57.py"
SORTIE = "neutralisation/neutralize-r58.py"
cibles = open(sys.argv[1], encoding="utf-8", newline="").read().replace("\r\n", "\n")
titres = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else None

src = open(R57, encoding="utf-8", newline="").read().replace("\r\n", "\n")


def entre(debut: str, fin: str) -> str:
    i = src.index(debut)
    j = src.index(fin, i)
    return src[i:j]


def adapter(texte: str) -> str:
    t = texte.replace("R57_", "R58_").replace("neutralize-r57", "neutralize-r58").replace(".neutralisation-r57", ".neutralisation-r58").replace('"r57"', '"r58"')
    restes = [m.group(0) for m in re.finditer(r".{30}r57.{30}", t)]
    assert not restes, restes[:3]
    return t


imports = entre("import hashlib", 'SAUVEGARDE = ".neutralisation-r57"')
cible_def = entre("CIBLES: list[dict] = []", "# ── A — R-1 : le CAS d'`openSession`")
moteur = src[src.index("def _est_int(c: dict) -> bool:") :]
# l'empreinte en tête de chaque journal est DÉJÀ dans le moteur de r57 (`_entete_journal()`) : on le vérifie, on ne le retape pas
assert moteur.count("_entete_journal() + sortie") == 2, moteur.count("_entete_journal() + sortie")
assert "print(f\"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}" in moteur
moteur = adapter(moteur)
imports = adapter(imports)
cible_def = adapter(cible_def)

ENTETE = '''#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 58 (D356), LOT « L36-3b : le PIN, CÔTÉ SERVEUR » (CHEMIN D'IDENTITÉ, méthode RENFORCÉE) : le PIN tiré, haché avec un secret HORS base, trois essais, verrouillage, déblocage par le mot de passe, expiration, connexion par PIN (K-23), journal des actions du PIN.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le GÉNÉRATEUR et la liste fermée des PIN triviaux (P-*) : les zéros de tête, le re-tirage, la boucle bornée, l'intervalle, chacune des cinq règles de la liste ;
  · le HACHEUR (H-*) : le secret du HMAC, le format du haché, le haché mal formé, la comparaison à temps constant, le chemin FACTICE qui paie le même calcul ;
  · l'ÉTAT du PIN (E-*), le SECRET obligatoire partout (V-*), le LEVIER de limite de débit (T-*), le CONTRAT de K-23 et ses limites (C-*), le client d'API (K-*) ;
  · le SERVICE de la connexion par PIN et de l'émission (S-*) : l'ordre, UN refus, UN corps, UN coût ; ce qui est transmis au magasin ; ce que les réponses rendent ;
  · le MAGASIN (R-* la réservation d'un essai, F-* l'échec et le verrou, O-* l'ouverture conditionnée, M-* l'émission, X-* l'activation, Z-* l'effacement) ;
  · le CONTRÔLEUR (W-*) : `no-store`, la route exemptée, sa limite de débit ; la PROMOTION d'un devis qui porte le membre (Q-*) ; les gardes de SOURCE (G-*).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r58.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r58.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R58_DECOUVERTE=1 python3 neutralisation/neutralize-r58.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
    R58_DECOUVERTE=1 R58_CLASSE=unit|int python3 …                      # ne joue QUE les mesures de cette classe
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
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R58_DECOUVERTE=1` liste, par cible, ce qui rougit ; le dictionnaire TITRES est écrit à partir de ce relevé par `remplir-titres.py`.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — aucun écran ne consomme le PIN (L36-4) ; (2) la fréquence en production des courses « PIN ‖ réinitialisation / désactivation /
déblocage », dont seule la POSSIBILITÉ est mesurée, par un entrelacement FORCÉ sur PostgreSQL réel ; (3) le COÛT d'un calcul de HMAC et d'une transaction de plus par connexion ; (4) qui LIT le journal du PIN
(aucun écran, aucune route) ; (5) la valeur du secret en production et sa rotation ; (6) le recours d'un Manager seul ; (7) un PIN faible hors de la liste fermée de 210 valeurs ; (8) la MFA.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Moteur, lecteur et calibration : LUS dans `neutralize-r57.py` (D355, lui-même fabriqué depuis `neutralize-r56.py` puis `neutralize-r44.py`)
par `docs/preuves/D356/neutralisation/construire-r58.py` — aucune ligne du moteur n'est retapée ; seuls l'en-tête, les mesures, les cibles et les constantes changent.
"""

'''

CONFIG = '''EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")


def _entete_journal() -> str:
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\\n"


SAUVEGARDE = ".neutralisation-r58"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r58")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\\x1b\\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R58_DECOUVERTE") == "1"
# `R58_FILTRE="A-,S-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R58_FILTRE", "").split(",") if p]
CLASSE = os.environ.get("R58_CLASSE", "")  # « unit » | « int » — POUR LA DÉCOUVERTE SEULEMENT


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    # ── unitaires : API (`@zwadj/api`) et client d'API.
    "pin": _vitest("@zwadj/api", "src/staff/staff-pin.spec.ts"),
    "hacheur": _vitest("@zwadj/api", "src/staff/staff-pin-hasher.spec.ts"),
    "etat": _vitest("@zwadj/api", "src/staff/staff-account-state.spec.ts"),
    "env": _vitest("@zwadj/api", "src/config/env.spec.ts"),
    "contrat": _vitest("@zwadj/api", "src/common/staff-contract.spec.ts"),
    "parite": _vitest("@zwadj/api", "src/common/i18n-parity.spec.ts"),
    "service": _vitest("@zwadj/api", "src/staff/staff-session.service.spec.ts"),
    "magasin": _vitest("@zwadj/api", "src/staff/staff-store.prisma.spec.ts"),
    "sources": _vitest("@zwadj/api", "src/staff/staff-source-guards.spec.ts"),
    "magasin-devis": _vitest("@zwadj/api", "src/venues/quote-store.prisma.spec.ts"),
    "service-devis": _vitest("@zwadj/api", "src/venues/quotes.service.spec.ts"),
    "client-api": _vitest("@zwadj/api-client", "src/staff-client.test.ts"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-pin": _vitest_int("test/int/staff-pin.int-spec.ts"),
    "int-emission": _vitest_int("test/int/staff-pin-issue.int-spec.ts"),
    "int-course": _vitest_int("test/int/staff-pin-race.int-spec.ts"),
    "int-audit": _vitest_int("test/int/staff-pin-audit.int-spec.ts"),
    "int-promote": _vitest_int("test/int/quote-promote-actor.int-spec.ts"),
    "int-garde": _vitest_int("test/int/staff-session-guard.int-spec.ts"),
    "int-debit": _vitest_int("test/int/throttle.int-spec.ts"),
    "int-contrat": _vitest_int("test/int/contract-api-client.int-spec.ts"),
}
MESURES_INT = {m for m in MESURES if m.startswith("int-")}
AVEC_INT = "--int" in sys.argv

PIN = "apps/api/src/staff/staff-pin.ts"
HACHEUR = "apps/api/src/staff/staff-pin-hasher.ts"
ETAT = "apps/api/src/staff/staff-account-state.ts"
ENV = "apps/api/src/config/env.ts"
ENVEX = "apps/api/.env.example"
THROTTLE = "apps/api/src/auth/auth.throttle.ts"
TYPES = "packages/types/src/staff.ts"
ARJSON = "packages/i18n/messages/ar.json"
CLIENT = "packages/api-client/src/staff-client.ts"
SERVICE = "apps/api/src/staff/staff-session.service.ts"
MAGASIN = "apps/api/src/staff/staff-store.prisma.ts"
CONTROLEUR = "apps/api/src/staff/staff-session.controller.ts"
QSTORE = "apps/api/src/venues/quote-store.prisma.ts"
QSVC = "apps/api/src/venues/quotes.service.ts"
QCTRL = "apps/api/src/venues/quotes.controller.ts"

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
