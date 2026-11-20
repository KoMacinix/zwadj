#!/usr/bin/env python3
"""Fabrique neutralisation/neutralize-r57.py : le MOTEUR est LU dans neutralisation/neutralize-r56.py (aucune ligne du moteur n'est retapée : même lecteur, même calibration, même boucle, même empreinte en tête de
chaque journal), l'en-tête, les mesures et les cibles sont ceux du rang 57. Lancé depuis la RACINE : python3 construire-r57.py <cibles.txt> [titres.json]. Archivé comme PIÈCE (D291), jamais promu en instrument.
⚠ Une correction du moteur de r56 (ou de r44, dont r56 est lui-même fabriqué) ne se propage pas à r57 sans le reconstruire (entrée de backlog de D354).
Les titres relevés par la découverte s'écrivent dans le bloc TITRES (entre `# <<TITRES>>` et `# <</TITRES>>`) par `remplir-titres.py`."""
import json
import re
import sys

R56 = "neutralisation/neutralize-r56.py"
SORTIE = "neutralisation/neutralize-r57.py"
cibles = open(sys.argv[1], encoding="utf-8", newline="").read().replace("\r\n", "\n")
titres = json.load(open(sys.argv[2], encoding="utf-8")) if len(sys.argv) > 2 else None

src = open(R56, encoding="utf-8", newline="").read().replace("\r\n", "\n")


def entre(debut: str, fin: str) -> str:
    i = src.index(debut)
    j = src.index(fin, i)
    return src[i:j]


def adapter(texte: str) -> str:
    t = texte.replace("R56_", "R57_").replace("neutralize-r56", "neutralize-r57").replace(".neutralisation-r56", ".neutralisation-r57").replace('"r56"', '"r57"')
    restes = [m.group(0) for m in re.finditer(r".{30}r56.{30}", t)]
    assert not restes, restes[:3]
    return t


imports = entre("import hashlib", 'SAUVEGARDE = ".neutralisation-r56"')
cible_def = entre("CIBLES: list[dict] = []", "# ── E — l'ÉTAT DU COMPTE")
moteur = src[src.index("def _est_int(c: dict) -> bool:") :]
# l'empreinte en tête de chaque journal est DÉJÀ dans le moteur de r56 (`_entete_journal()`) : on le vérifie, on ne le retape pas
assert moteur.count("_entete_journal() + sortie") == 2, moteur.count("_entete_journal() + sortie")
assert "print(f\"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}" in moteur
moteur = adapter(moteur)
imports = adapter(imports)
cible_def = adapter(cible_def)

ENTETE = '''#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 57 (D355), LOT « les restes de L36-3a-2 » : (i) une CONNEXION ne survit plus à une RÉINITIALISATION, (ii) le JOURNAL des écritures d'une FICHE CLIENT (CHEMIN D'IDENTITÉ, méthode RENFORCÉE).

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le CAS d'`openSession` (A-*) : le hachage lu à la réservation, le statut, la lecture sous le verrou (A-4 : un contrôle qui ne relit pas la ligne verrouillée), le motif du refus ;
  · le SERVICE de connexion (S-*) : le hachage transmis, le refus d'ouverture identique à un mauvais mot de passe (même corps, UN argon2, aucune ligne d'échec) ;
  · le module PUR du journal des fiches (P-*) : les noms de champ jamais les valeurs, l'ordre fixe, `before` jamais écrit, le membre, les erreurs de programmation, la pureté ;
  · le magasin des fiches (F-*) et celui des devis (Q-*) : une ligne par écriture, dans la transaction, seulement quand l'écriture a eu lieu, avec son champ, son membre et son devis ;
  · le service et les contrôleurs (V-*) : le membre du garde voyage jusqu'au magasin ;
  · la garde de SOURCE (G-*) : un cinquième site d'écriture, une écriture de plus, un nom d'action écrit à la main.
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r57.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r57.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R57_DECOUVERTE=1 python3 neutralisation/neutralize-r57.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
    R57_DECOUVERTE=1 R57_CLASSE=unit|int python3 …                      # ne joue QUE les mesures de cette classe
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
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R57_DECOUVERTE=1` liste, par cible, ce qui rougit ; le dictionnaire TITRES est écrit à partir de ce relevé par `remplir-titres.py`.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — aucun écran ne consomme ces écritures (L36-4) ; (2) la fréquence en production de la course « connexion ‖ réinitialisation » :
seule sa POSSIBILITÉ est mesurée, par un entrelacement FORCÉ ; (3) le coût d'une transaction de plus sur K-2 et K-3 ; (4) qui LIT le journal (aucun écran, aucune route) ; (5) le sens « une fiche écrite par un
chemin hors de l'API (accès direct à la base) » : la carte ne couvre que le code de production de l'API.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Moteur, lecteur et calibration : LUS dans `neutralize-r56.py` (D354, lui-même fabriqué depuis `neutralize-r44.py`, D341) par
`docs/preuves/D355/neutralisation/construire-r57.py` — aucune ligne du moteur n'est retapée ; seuls l'en-tête, les mesures, les cibles et les constantes changent.
"""

'''

CONFIG = '''EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")


def _entete_journal() -> str:
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\\n"


SAUVEGARDE = ".neutralisation-r57"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r57")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\\x1b\\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R57_DECOUVERTE") == "1"
# `R57_FILTRE="A-,S-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R57_FILTRE", "").split(",") if p]
CLASSE = os.environ.get("R57_CLASSE", "")  # « unit » | « int » — POUR LA DÉCOUVERTE SEULEMENT


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    # ── unitaires : API (`@zwadj/api`).
    "course-service": _vitest("@zwadj/api", "src/staff/staff-session.service.spec.ts"),
    "course-magasin": _vitest("@zwadj/api", "src/staff/staff-store.prisma.spec.ts"),
    "audit-pur": _vitest("@zwadj/api", "src/clients/client-record-audit.spec.ts"),
    "ecritures": _vitest("@zwadj/api", "src/clients/client-record-writes.spec.ts"),
    "service-fiches": _vitest("@zwadj/api", "src/clients/pro-clients.service.spec.ts"),
    "magasin-devis": _vitest("@zwadj/api", "src/venues/quote-store.prisma.spec.ts"),
    "service-devis": _vitest("@zwadj/api", "src/venues/quotes.service.spec.ts"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-course": _vitest_int("test/int/staff-login-race.int-spec.ts"),
    "int-fiches": _vitest_int("test/int/client-record-audit.int-spec.ts"),
}
MESURES_INT = {m for m in MESURES if m.startswith("int-")}
AVEC_INT = "--int" in sys.argv

MAGASIN = "apps/api/src/staff/staff-store.prisma.ts"
SERVICE = "apps/api/src/staff/staff-session.service.ts"
AUDIT = "apps/api/src/clients/client-record-audit.ts"
FICHE_STORE = "apps/api/src/clients/pro-client-store.prisma.ts"
FICHE_SVC = "apps/api/src/clients/pro-clients.service.ts"
FICHE_CTRL = "apps/api/src/clients/pro-clients.controller.ts"
QUOTE_STORE = "apps/api/src/venues/quote-store.prisma.ts"
QUOTES_SVC = "apps/api/src/venues/quotes.service.ts"
QUOTES_CTRL = "apps/api/src/venues/quotes.controller.ts"

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
