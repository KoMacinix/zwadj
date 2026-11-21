#!/usr/bin/env python3
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

EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")


def _entete_journal() -> str:
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\n"


EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")


def _entete_journal() -> str:
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\n"


EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")


def _entete_journal() -> str:
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\n"


SAUVEGARDE = ".neutralisation-r58"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r58")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\x1b\[[0-9;]*m")
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


# ── P — MP-10 : le GÉNÉRATEUR du PIN et la LISTE FERMÉE des PIN triviaux (module pur `staff-pin.ts`).
cible("P-1. ⛔ MP-10 — les zéros de tête sont rendus à DROITE au lieu de GAUCHE (« 0482 » devient « 4820 ») : le PIN tiré n'est plus celui que le générateur a tiré", PIN,
      r'''    const pin = String(n).padStart(length, "0");''', r'''    const pin = String(n).padEnd(length, "0");''', ["pin"])
cible("P-2. ⛔ MP-10 — un PIN TRIVIAL n'est plus re-tiré (le générateur rend « 0000 », « 1234 »)", PIN,
      r'''    if (!isTrivialPin(pin)) return pin;''', r'''    if (!isTrivialPin(pin) || true) return pin;''', ["pin"])
cible("P-3. ⛔ MP-10 — la boucle bornée ne LÈVE plus après `PIN_MAX_DRAWS` tirages triviaux : elle rend un PIN trivial", PIN,
      r'''  throw new Error(`PIN : ${PIN_MAX_DRAWS} tirages triviaux de suite — le générateur d'aléa est défectueux`);''', r'''  return "1234";''', ["pin"])
cible("P-4. ⛔ MP-10 — un tirage HORS de l'intervalle n'est plus refusé en haut (un PIN de cinq chiffres est rendu)", PIN,
      r'''    if (!Number.isInteger(n) || n < 0 || n >= max) throw new Error(''', r'''    if (!Number.isInteger(n) || n < 0) throw new Error(''', ["pin"])
cible("P-5. ⛔ MP-10 — la suite DESCENDANTE (« 4321 ») n'est plus un PIN trivial", PIN,
      r'''  if (c.slice(0, -1).every((_, i) => pas(i) === 9)) return true;''', r'''  if (c.slice(0, -1).every((_, i) => pas(i) === 99)) return true;''', ["pin"])
cible("P-6. ⛔ MP-10 — la suite MONTANTE (« 1234 », « 7890 ») n'est plus un PIN trivial", PIN,
      r'''  if (c.slice(0, -1).every((_, i) => pas(i) === 1)) return true;''', r'''  if (c.slice(0, -1).every((_, i) => pas(i) === 11)) return true;''', ["pin"])
cible("P-7. ⛔ MP-10 — la répétition de deux chiffres (« 1212 ») n'est plus un PIN trivial", PIN,
      r'''  if (n >= 4 && c.every((x, i) => i < 2 || x === c[i - 2])) return true;''', r'''  if (n >= 400 && c.every((x, i) => i < 2 || x === c[i - 2])) return true;''', ["pin"])
cible("P-8. ⛔ MP-10 — les PAIRES (« 1122 », « 6677 ») ne sont plus des PIN triviaux", PIN,
      r'''  if (n >= 4 && n % 2 === 0 && c.every((x, i) => x === c[i - (i % 2)])) return true;''', r'''  if (n >= 400 && n % 2 === 0 && c.every((x, i) => x === c[i - (i % 2)])) return true;''', ["pin"])
# P-9 RETIRÉE (mutation ÉQUIVALENTE, mesurée VERTE à la découverte : « passés 13 · en échec 0 ») : au PIN de QUATRE chiffres, « 0000 » est aussi une répétition de deux chiffres (abab) et des paires (aabb) — la règle « un seul chiffre » ne peut être neutralisée sans que les deux autres rougissent la même valeur.

# ── H — MP-11, R-2 : le HACHEUR (HMAC-SHA-256 avec un secret HORS base, à temps constant, un calcul par chemin).
cible("H-1. ⛔ MP-11 — le HMAC n'emploie plus le SECRET (une clé fixe) : tous les PIN se cassent hors ligne en une seconde, et le haché ne dépend plus du secret", HACHEUR,
      r'''    return createHmac("sha256", this.secret).update(pin).digest();''', r'''    return createHmac("sha256", "cle-fixe").update(pin).digest();''', ["hacheur", "int-pin"])
cible("H-2. ⛔ MP-11 — le haché stocké est rendu en base64 au lieu de l'hexadécimal (la base et le magasin ne parlent plus le même format)", HACHEUR,
      r'''    return this.digest(pin).toString("hex");''', r'''    return this.digest(pin).toString("base64");''', ["hacheur"])
cible("H-3. ⛔ MP-11 — un haché MAL FORMÉ (longueur différente) est ACCEPTÉ au lieu d'être refusé", HACHEUR,
      r'''    if (lu.length !== calcule.length) return false;''', r'''    if (lu.length !== calcule.length) return true;''', ["hacheur"])
cible("H-4. ⛔ MP-11 — la comparaison des hachés n'est plus À TEMPS CONSTANT (`===` sur des chaînes)", HACHEUR,
      r'''    return timingSafeEqual(calcule, lu);''', r'''    return calcule.toString("hex") === stored;''', ["sources"])
cible("H-5. ⛔ R-3 — le chemin FACTICE ne calcule plus de HMAC (un refus de la connexion par PIN ne coûte plus la même chose qu'une vérification)", HACHEUR,
      r'''    timingSafeEqual(this.digest(pin), FACTICE);''', r'''    timingSafeEqual(FACTICE, FACTICE);''', ["hacheur"])
cible("H-6. ⛔ MP-11 — la vérification compare le haché du PIN présenté à un AUTRE PIN (le PIN est retourné)", HACHEUR,
      r'''    const calcule = this.digest(pin);''', r'''    const calcule = this.digest([...pin].reverse().join(""));''', ["hacheur"])

# ── E — R-4 : l'ÉTAT du PIN (UNE règle, `etatDuPin`).
cible("E-1. ⛔ R-4 — le compteur AU PLAFOND ne verrouille plus le PIN (seul le verrou posé compte)", ETAT,
      r'''  if (pin.pinLockedAt !== null || pin.pinFailedCount >= STAFF_LIMITS.PIN_MAX_FAILURES) return StaffPinState.LOCKED;''',
      r'''  if (pin.pinLockedAt !== null) return StaffPinState.LOCKED;''', ["etat", "int-emission"])
cible("E-2. ⛔ R-4 — l'échéance À L'INSTANT n'expire plus le PIN (`<=` devient `<`)", ETAT,
      r'''pin.pinExpiresAt.getTime() <= maintenant.getTime()''', r'''pin.pinExpiresAt.getTime() < maintenant.getTime()''', ["etat"])
cible("E-3. ⛔ R-4 — l'ABSENCE ne l'emporte plus sur le verrou (un PIN absent et verrouillé se lit VERROUILLÉ)", ETAT,
      r'''  if (!pin.hasPin) return StaffPinState.ABSENT;''', r'''  if (!pin.hasPin && pin.pinLockedAt === null) return StaffPinState.ABSENT;''', ["etat"])
cible("E-4. ⛔ R-4 — l'ÉCHÉANCE l'emporte sur le verrou : un PIN verrouillé ET expiré se lit EXPIRÉ (le déblocage n'écrit plus sa ligne `staff.pin_unlock`)", ETAT,
      r'''  if (pin.pinLockedAt !== null || pin.pinFailedCount >= STAFF_LIMITS.PIN_MAX_FAILURES) return StaffPinState.LOCKED;
  if (pin.pinExpiresAt === null || pin.pinExpiresAt.getTime() <= maintenant.getTime()) return StaffPinState.EXPIRED;''',
      r'''  if (pin.pinExpiresAt === null || pin.pinExpiresAt.getTime() <= maintenant.getTime()) return StaffPinState.EXPIRED;
  if (pin.pinLockedAt !== null || pin.pinFailedCount >= STAFF_LIMITS.PIN_MAX_FAILURES) return StaffPinState.LOCKED;''', ["etat"])

# ── V — R-2, MP-12 : le SECRET du HMAC est obligatoire PARTOUT et exigé en production.
cible("V-1. ⛔ MP-12 — le secret n'a plus de LONGUEUR minimale (un secret de trente et un caractères, ou d'un seul, démarre l'API)", ENV,
      r'''  STAFF_PIN_HMAC_SECRET: z.string().min(32, "STAFF_PIN_HMAC_SECRET doit faire au moins 32 caractères"),''',
      r'''  STAFF_PIN_HMAC_SECRET: z.string().min(1, "STAFF_PIN_HMAC_SECRET doit faire au moins 32 caractères"),''', ["env"])
cible("V-2. ⛔ MP-12 — le secret reçoit une valeur PAR DÉFAUT (l'API démarre sans lui, avec un secret connu de tous)", ENV,
      r'''  STAFF_PIN_HMAC_SECRET: z.string().min(32, "STAFF_PIN_HMAC_SECRET doit faire au moins 32 caractères"),''',
      r'''  STAFF_PIN_HMAC_SECRET: z.string().min(32, "STAFF_PIN_HMAC_SECRET doit faire au moins 32 caractères").default("d".repeat(40)),''', ["env"])
cible("V-3. ⛔ MP-12 — la production n'EXIGE plus la variable explicitement (la liste `PROD_REQUIRED_EXPLICIT` ne la nomme plus)", ENV,
      r'''  "STAFF_PIN_HMAC_SECRET"
] as const;''', r'''  "PAYMENTS_ENABLED"
] as const;''', ["env"])

# ── T — le LEVIER de limite de débit (D128) pour la connexion par PIN.
cible("T-1. ⛔ D128 — la connexion par PIN lit un SECOND levier (`THROTTLE_STAFF_LOGIN_LIMIT` au lieu de `THROTTLE_STAFF_PIN_LIMIT`)", THROTTLE,
      r'''  staffPin: { limit: num("THROTTLE_STAFF_PIN_LIMIT", 60), ttl: TTL }''', r'''  staffPin: { limit: num("THROTTLE_STAFF_LOGIN_LIMIT", 60), ttl: TTL }''', ["int-debit"])
cible("T-2. ⛔ MP-36 — la limite par IP de la connexion par PIN tombe à SIX (un foyer ou un CGNAT est bloqué avant que le compteur par membre ne protège)", THROTTLE,
      r'''  staffPin: { limit: num("THROTTLE_STAFF_PIN_LIMIT", 60), ttl: TTL }''', r'''  staffPin: { limit: num("THROTTLE_STAFF_PIN_LIMIT", 6), ttl: TTL }''', ["int-debit"])

# ── C — le CONTRAT de K-23 (le schéma du corps) et ses limites.
cible("C-1. ⛔ K-23 — le schéma n'impose plus la LONGUEUR du PIN (un PIN de cinq chiffres ou plus est accepté par le contrat)", TYPES,
      r'''const PIN_PATTERN = new RegExp(`^[0-9]{${STAFF_LIMITS.PIN_LENGTH}}$`);''', r'''const PIN_PATTERN = new RegExp(`^[0-9]+$`);''', ["contrat"])
cible("C-2. ⛔ K-23 — le schéma accepte une CLÉ INCONNUE (le corps n'est plus fermé)", TYPES,
      r'''  .strict("staff.validation.unknownKey");
export type StaffPinLoginInput''', r'''  ;
export type StaffPinLoginInput''', ["contrat"])
cible("C-3. ⛔ K-23 — l'identifiant du membre n'est plus vérifié (un texte quelconque est accepté)", TYPES,
      r'''      .uuid("staff.validation.memberRequired"),
    pin: z''', r'''      .min(1, "staff.validation.memberRequired"),
    pin: z''', ["contrat"])
cible("C-4. ⛔ MP-15 — le plafond d'essais passe à QUATRE (la CHECK de la base, jamais le levier, dit TROIS : l'autorité est la migration, D186)", TYPES,
      r'''  PIN_MAX_FAILURES: 3''', r'''  PIN_MAX_FAILURES: 4''', ["int-emission", "int-pin"])
cible("C-5. ⛔ MP-39 — la clé de message `pinInvalid` de l'arabe change de nom : la PARITÉ FR = AR est rompue", ARJSON,
      r'''      "pinInvalid": "أدخل أرقام رمز PIN الخاص بك."''', r'''      "pinInvalidX": "أدخل أرقام رمز PIN الخاص بك."''', ["contrat", "parite"])

# ── K — le CLIENT d'API : le littéral du chemin (D182).
cible("K-1. ⛔ D182 — le client d'API appelle un autre chemin que la route K-23", CLIENT,
      r'''request<StaffPinLoginDTO>("/pro/staff/pin-login", { method: "POST", body: input })''', r'''request<StaffPinLoginDTO>("/pro/staff/pin", { method: "POST", body: input })''', ["client-api", "int-contrat"])
cible("K-2. ⛔ K-23 — le client d'API envoie la connexion par PIN en `PUT`", CLIENT,
      r'''request<StaffPinLoginDTO>("/pro/staff/pin-login", { method: "POST", body: input })''', r'''request<StaffPinLoginDTO>("/pro/staff/pin-login", { method: "PUT", body: input })''', ["client-api"])

# ── S — K-23 : le SERVICE de la connexion par PIN (l'ordre est la règle ; UN refus, UN corps, UN coût).
cible("S-1. ⛔ R-3 — la couche ÉTEINTE refuse SANS le calcul de HMAC factice (le coût diffère de celui d'un PIN faux)", SERVICE,
      r'''    if (layer === null || layer.enabledAt === null) return this.refuserLePin(input.pin);''', r'''    if (layer === null || layer.enabledAt === null) throw identifiantsRefuses();''', ["service"])
cible("S-2. ⛔ MP-2 — SANS cookie d'appareil, la réservation est DEMANDÉE quand même (un porteur du seul Bearer consomme les essais d'un membre)", SERVICE,
      r'''    if (member === null || !admis || cookies.devices.length === 0) return this.refuserLePin(input.pin);''', r'''    if (member === null || !admis) return this.refuserLePin(input.pin);''', ["service", "int-pin"])
cible("S-3. ⛔ R-3 — un membre DÉSACTIVÉ ou au temporaire expiré n'est plus refusé par `etatDuCompte` (tout membre existant passe)", SERVICE,
      r'''    const admis = etat === StaffAccountState.ACTIVE || etat === StaffAccountState.MUST_CHANGE_PASSWORD;
    if (member === null''', r'''    const admis = etat !== null;
    if (member === null''', ["service", "int-pin"])
cible("S-4. ⛔ R-3 — un essai NON réservé refuse SANS le calcul de HMAC factice", SERVICE,
      r'''    if (!reservation.reserved) return this.refuserLePin(input.pin);''', r'''    if (!reservation.reserved) throw identifiantsRefuses();''', ["service"])
cible("S-5. ⛔ MP-1 — le service vérifie le PIN contre un autre argument (le PIN et le haché lu s'échangent)", SERVICE,
      r'''    if (!this.pins.verify(input.pin, reservation.pinHash)) {''', r'''    if (!this.pins.verify(reservation.pinHash, input.pin)) {''', ["service"])
cible("S-6. ⛔ MP-15 — un PIN FAUX n'est plus CONSIGNÉ (ni compte d'échecs, ni verrou au troisième)", SERVICE,
      r'''      await this.store.recordPinFailure({ actor: user, memberId: input.memberId, failedCount: reservation.failedCount, expectedPinHash: reservation.pinHash });''',
      r'''      void reservation.failedCount;''', ["service", "int-pin"])
cible("S-7. ⛔ MP-15 — l'échec consigné porte le PIN TENTÉ au lieu du haché lu (le verrou se poserait sur la saisie, et le journal verrait le PIN)", SERVICE,
      r'''failedCount: reservation.failedCount, expectedPinHash: reservation.pinHash });''', r'''failedCount: reservation.failedCount, expectedPinHash: input.pin });''', ["service"])
cible("S-8. ⛔ R-3 — l'ouverture n'est plus CONDITIONNÉE au haché lu par la réservation (le PIN tenté la remplace)", SERVICE,
      r'''      memberId: input.memberId,
      expectedPinHash: reservation.pinHash,
      sessionTokenHash''', r'''      memberId: input.memberId,
      expectedPinHash: input.pin,
      sessionTokenHash''', ["service"])
cible("S-9. ⛔ MP-2 — l'ouverture reçoit les cookies d'appareil EN CLAIR (jamais leurs empreintes)", SERVICE,
      r'''      candidateDeviceHashes: empreintesDAppareil
    });''', r'''      candidateDeviceHashes: cookies.devices.map((d) => d.value)
    });''', ["service"])
cible("S-10. ⛔ R-3 — un refus d'ouverture est CONSIGNÉ comme un échec de PIN (une ligne d'échec pour un PIN qui était JUSTE)", SERVICE,
      r'''le même refus, aucun cookie, aucune ligne d'échec (le calcul de HMAC a déjà été payé).
    if (!opened.ok) throw identifiantsRefuses();''', r'''le même refus, aucun cookie, aucune ligne d'échec (le calcul de HMAC a déjà été payé).
    if (!opened.ok) { await this.store.recordPinFailure({ actor: user, memberId: input.memberId, failedCount: reservation.failedCount, expectedPinHash: reservation.pinHash }); throw identifiantsRefuses(); }''', ["service", "int-course"])
cible("S-11. ⛔ K-23 — la réponse de la connexion par PIN pose un cookie d'APPAREIL (l'appareil est celui du poste : la route n'en pose jamais)", SERVICE,
      r'''cookies: { session: sessionToken } };
  }

  /** Le refus d'un PIN''', r'''cookies: { session: sessionToken, device: { suffix: "x", token: sessionToken } } };
  }

  /** Le refus d'un PIN''', ["service"])
cible("S-12. ⛔ K-14 — l'activation rend le PIN d'un AUTRE tirage que celui dont le haché est stocké", SERVICE,
      r'''      pinHash: this.pins.hash(pin),
      sessionTokenHash: this.tokens.hash(sessionToken),
      deviceTokenHash''', r'''      pinHash: this.pins.hash(this.pins.generate()),
      sessionTokenHash: this.tokens.hash(sessionToken),
      deviceTokenHash''', ["service", "int-emission"])
cible("S-13. ⛔ K-15 — la connexion rend le PIN même quand le magasin n'en a PAS installé de neuf (un PIN montré qui n'est pas celui qui est stocké)", SERVICE,
      r'''pin: opened.pinIssued ? pin : null },''', r'''pin },''', ["service", "int-emission"])
cible("S-14. ⛔ K-15 — la connexion installe le haché d'un AUTRE tirage que le PIN qu'elle rend", SERVICE,
      r'''      expectedPasswordHash: reservation.passwordHash,
      newPinHash: this.pins.hash(pin),''', r'''      expectedPasswordHash: reservation.passwordHash,
      newPinHash: this.pins.hash(this.pins.generate()),''', ["service", "int-emission"])

cible("S-15. ⛔ K-18 — le changement de mot de passe rend le PIN même quand le magasin n'en a PAS installé de neuf", SERVICE,
      r'''pin: changed.pinIssued ? pin : null }, cookies: {} };''', r'''pin }, cookies: {} };''', ["service", "int-emission"])
cible("S-16. ⛔ K-18 — le changement de mot de passe installe le haché d'un AUTRE tirage que le PIN qu'il rend", SERVICE,
      r'''      newPasswordHash,
      newPinHash: this.pins.hash(pin)''', r'''      newPasswordHash,
      newPinHash: this.pins.hash(this.pins.generate())''', ["service", "int-emission"])

# ── R — MP-1, MP-2 : la RÉSERVATION d'un essai (UNE instruction, toutes ses conditions).
cible("R-1. ⛔ MP-1 — la réservation ne verrouille plus la ligne (`FOR UPDATE OF m` retiré) : vingt requêtes parallèles comptent plus de trois essais", MAGASIN,
      r'''           FOR UPDATE OF m
      )''', r'''           /* sans verrou de ligne */
      )''', ["int-course", "magasin"])
cible("R-2. ⛔ MP-1 — le compteur ne MONTE plus à la réservation (un essai n'est jamais consommé)", MAGASIN,
      r'''SET pin_failed_count = m.pin_failed_count + 1, updated_at = now()''', r'''SET pin_failed_count = m.pin_failed_count, updated_at = now()''', ["magasin", "int-pin", "int-course"])
cible("R-3. ⛔ MP-1 — le PLAFOND n'est plus conditionné (la réservation continue après trois essais)", MAGASIN,
      r'''AND m.pin_locked_at IS NULL AND m.pin_failed_count < ${STAFF_LIMITS.PIN_MAX_FAILURES}::int''', r'''AND m.pin_locked_at IS NULL AND true''', ["magasin", "int-pin", "int-course"])
cible("R-4. ⛔ MP-15 — un PIN VERROUILLÉ se réserve encore (`pin_locked_at` n'est plus exigé nul)", MAGASIN,
      r'''AND m.pin_locked_at IS NULL AND m.pin_failed_count <''', r'''AND true AND m.pin_failed_count <''', ["magasin", "int-pin"])
cible("R-5. ⛔ MP-2 — la réservation ne vérifie plus qu'un APPAREIL du membre est présenté (un porteur du seul Bearer consomme les essais)", MAGASIN,
      r'''           AND EXISTS (SELECT 1 FROM pro_staff_devices d WHERE d.member_id = m.id AND d.token_hash = ANY(${[...input.deviceTokenHashes]}::text[]) AND d.revoked_at IS NULL AND d.expires_at > now())''',
      r'''           AND true''', ["magasin", "int-pin"])
cible("R-6. ⛔ MP-2 — un appareil RÉVOQUÉ suffit à réserver", MAGASIN,
      r'''d.token_hash = ANY(${[...input.deviceTokenHashes]}::text[]) AND d.revoked_at IS NULL''', r'''d.token_hash = ANY(${[...input.deviceTokenHashes]}::text[]) AND true''', ["magasin", "int-pin"])
cible("R-7. ⛔ MP-2 — un appareil EXPIRÉ suffit à réserver", MAGASIN,
      r'''AND d.expires_at > now())
           FOR UPDATE OF m''', r'''AND true)
           FOR UPDATE OF m''', ["magasin", "int-pin"])
cible("R-8. ⛔ MP-26 — la réservation ne vérifie plus la SALLE du membre (un membre d'une autre salle se réserve)", MAGASIN,
      r'''m.id = ${input.memberId}::uuid AND m.pro_profile_id = ${input.proProfileId}::uuid
           AND m.status''', r'''m.id = ${input.memberId}::uuid AND true
           AND m.status''', ["magasin", "int-pin"])
cible("R-9. ⛔ R-3 — la réservation n'exige plus un membre ACTIF (un désactivé se réserve)", MAGASIN,
      r'''           AND m.status = 'ACTIVE'
           AND m.pin_hash IS NOT NULL''', r'''           AND true
           AND m.pin_hash IS NOT NULL''', ["magasin", "int-pin"])
cible("R-10. ⛔ MP-3 — la réservation n'exige plus un PIN NON EXPIRÉ (un PIN expiré se réserve)", MAGASIN,
      r'''AND m.pin_hash IS NOT NULL AND m.pin_expires_at > now()''', r'''AND m.pin_hash IS NOT NULL AND true''', ["magasin", "int-pin"])
cible("R-11. ⛔ MP-1 — une réservation SANS ligne est rendue « réservée » (le service vérifie un haché vide)", MAGASIN,
      r'''    return ligne === undefined ? { reserved: false } : { reserved: true, pinHash: ligne.pinHash, failedCount: ligne.failedCount };''',
      r'''    return ligne === undefined ? { reserved: true, pinHash: "", failedCount: 0 } : { reserved: true, pinHash: ligne.pinHash, failedCount: ligne.failedCount };''', ["magasin"])

# ── F — MP-15, MP-33 : l'ÉCHEC d'un PIN et le VERROU (au TROISIÈME échec, sur CE PIN).
cible("F-1. ⛔ MP-15 — le verrou ne se pose plus AU plafond (il faudrait un échec de plus)", MAGASIN,
      r'''      if (input.failedCount < STAFF_LIMITS.PIN_MAX_FAILURES) return { locked: false, sessionsEnded: 0 };''', r'''      if (input.failedCount <= STAFF_LIMITS.PIN_MAX_FAILURES) return { locked: false, sessionsEnded: 0 };''', ["magasin", "int-pin", "int-audit"])
cible("F-2. ⛔ R-3 — le verrou se pose sur N'IMPORTE QUEL PIN (le haché lu n'est plus conditionné : un PIN neuf posé entre-temps serait verrouillé)", MAGASIN,
      r'''WHERE id = ${input.memberId}::uuid AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND pin_failed_count >=''', r'''WHERE id = ${input.memberId}::uuid AND true AND pin_locked_at IS NULL AND pin_failed_count >=''', ["magasin", "int-course"])
cible("F-3. ⛔ MP-15 — le verrou n'est plus conditionné à « pas déjà verrouillé » (un verrou déjà posé est réécrit, et sa ligne aussi)", MAGASIN,
      r'''AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND pin_failed_count >=''', r'''AND pin_hash = ${input.expectedPinHash} AND true AND pin_failed_count >=''', ["magasin", "int-course"])
cible("F-4. ⛔ MP-15 — les sessions du membre prennent fin avec un AUTRE motif (`PASSWORD_CHANGED` au lieu de `PIN_LOCKED`)", MAGASIN,
      r'''end_reason = 'PIN_LOCKED' WHERE member_id''', r'''end_reason = 'PASSWORD_CHANGED' WHERE member_id''', ["magasin", "int-pin", "int-audit"])
cible("F-5. ⛔ MP-15 — le verrouillage ne met plus fin aux SESSIONS du membre", MAGASIN,
      r'''end_reason = 'PIN_LOCKED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL`''', r'''end_reason = 'PIN_LOCKED' WHERE member_id = ${input.memberId}::uuid AND false`''', ["magasin", "int-pin", "int-audit"])
cible("F-6. ⛔ MP-33 — la ligne d'ÉCHEC n'est plus écrite (un PIN faux n'a pas de trace)", MAGASIN,
      r'''      await ecrireAudit(tx, input.actor, input.memberId, { action: "staff.pin_login_failed", entityType: "staff_member", entityId: input.memberId, after: { failedCount: input.failedCount } });''',
      r'''      void input.failedCount;''', ["magasin", "int-audit"])
cible("F-7. ⛔ MP-11 — la ligne d'échec porte le HACHÉ du PIN (la charge utile n'est plus fermée)", MAGASIN,
      r'''action: "staff.pin_login_failed", entityType: "staff_member", entityId: input.memberId, after: { failedCount: input.failedCount } });''', r'''action: "staff.pin_login_failed", entityType: "staff_member", entityId: input.memberId, after: { failedCount: input.failedCount, pinHash: input.expectedPinHash } });''', ["magasin", "int-audit"])
cible("F-8. ⛔ MP-33 — la ligne de VERROUILLAGE n'est plus écrite (un verrou sans sa trace)", MAGASIN,
      r'''      await ecrireAudit(tx, input.actor, input.memberId, {
        action: "staff.pin_lock",
        entityType: "staff_member",
        entityId: input.memberId,
        after: { failedCount: input.failedCount, sessionsEnded: fins }
      });''', r'''      void fins;''', ["magasin", "int-audit"])
cible("F-9. ⛔ MP-33 — la ligne de verrouillage dit zéro session terminée (le compte réel n'est plus écrit)", MAGASIN,
      r'''after: { failedCount: input.failedCount, sessionsEnded: fins }''', r'''after: { failedCount: input.failedCount, sessionsEnded: 0 }''', ["magasin", "int-audit"])

# ── O — R-3 : l'OUVERTURE par PIN, CONDITIONNÉE (les quatre conditions, l'appareil re-vérifié sous verrou).
cible("O-1. ⛔ R-3 — « PIN ‖ réinitialisation / déblocage » : le CAS d'ouverture ne compare plus le haché de PIN lu à la réservation", MAGASIN,
      r'''AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND pin_expires_at > now()
          RETURNING''', r'''AND true AND pin_locked_at IS NULL AND pin_expires_at > now()
          RETURNING''', ["magasin", "int-course"])
cible("O-2. ⛔ R-3 — « PIN ‖ verrouillage par un autre échec » : le CAS d'ouverture n'exige plus `pin_locked_at` nul", MAGASIN,
      r'''AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND pin_expires_at > now()
          RETURNING''', r'''AND pin_hash = ${input.expectedPinHash} AND true AND pin_expires_at > now()
          RETURNING''', ["magasin", "int-course"])
cible("O-3. ⛔ R-3 — « PIN ‖ expiration » : le CAS d'ouverture n'exige plus un PIN non expiré (heure de la base)", MAGASIN,
      r'''AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND pin_expires_at > now()
          RETURNING''', r'''AND pin_hash = ${input.expectedPinHash} AND pin_locked_at IS NULL AND true
          RETURNING''', ["magasin", "int-course"])
cible("O-4. ⛔ R-3 — « PIN ‖ désactivation » : le CAS d'ouverture ne conditionne plus le STATUT (un membre désactivé entre la réservation et l'ouverture ouvre une session)", MAGASIN,
      r'''AND status = 'ACTIVE'
             AND pin_hash = ${input.expectedPinHash}''', r'''AND true
             AND pin_hash = ${input.expectedPinHash}''', ["magasin", "int-course"])
cible("O-5. ⛔ MP-26 — le CAS d'ouverture ne conditionne plus la SALLE du membre", MAGASIN,
      r'''WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid AND status = 'ACTIVE'
             AND pin_hash''', r'''WHERE id = ${input.memberId}::uuid AND true AND status = 'ACTIVE'
             AND pin_hash''', ["magasin", "int-pin"])
cible("O-6. ⛔ MP-1 — un PIN JUSTE ne remet plus le compteur à zéro", MAGASIN,
      r'''SET last_login_at = now(), pin_failed_count = 0, updated_at = now()''', r'''SET last_login_at = now(), updated_at = now()''', ["magasin", "int-pin"])
cible("O-7. ⛔ R-3 — « PIN ‖ appareil révoqué » : l'appareil se re-vérifie sans `revoked_at IS NULL` (un appareil révoqué ouvre une session)", MAGASIN,
      r'''AND d.token_hash = ANY(${[...input.candidateDeviceHashes]}::text[]) AND d.revoked_at IS NULL AND d.expires_at > now()
           ORDER BY''', r'''AND d.token_hash = ANY(${[...input.candidateDeviceHashes]}::text[]) AND true AND d.expires_at > now()
           ORDER BY''', ["magasin", "int-course"])
cible("O-8. ⛔ R-3 — l'appareil se re-vérifie sans son ÉCHÉANCE (un appareil expiré ouvre une session)", MAGASIN,
      r'''AND d.revoked_at IS NULL AND d.expires_at > now()
           ORDER BY d.created_at LIMIT 1 FOR UPDATE`;''', r'''AND d.revoked_at IS NULL AND true
           ORDER BY d.created_at LIMIT 1 FOR UPDATE`;''', ["magasin", "int-pin"])
cible("O-9. ⛔ R-3 — « PIN ‖ appareil révoqué » : la lecture de l'appareil ne le VERROUILLE plus (`FOR UPDATE` retiré) : une révocation en cours n'est plus attendue", MAGASIN,
      r'''ORDER BY d.created_at LIMIT 1 FOR UPDATE`;''', r'''ORDER BY d.created_at LIMIT 1`;''', ["magasin", "int-course"])
cible("O-10. ⛔ R-3 — le refus de l'appareil n'ANNULE plus la transaction (le CAS déjà écrit survit : `last_login_at` et le compteur remis à zéro)", MAGASIN,
      r'''        if (appareil === undefined) throw new OuvertureParPinAbandonnee();''', r'''        if (appareil === undefined) return { ok: false, reason: "memberChanged" };''', ["magasin", "int-course"])
cible("O-11. ⛔ MP-33 — la ligne `staff.pin_login` n'est plus écrite (une connexion sans sa trace)", MAGASIN,
      r'''        await ecrireAudit(tx, input.actor, membre.id, { action: "staff.pin_login", entityType: "staff_session", entityId: sessionId, after: { memberId: membre.id } });''',
      r'''        void sessionId;''', ["magasin", "int-audit"])
cible("O-12. ⛔ MP-11 — la ligne `staff.pin_login` porte le HACHÉ du PIN (la charge utile n'est plus fermée)", MAGASIN,
      r'''entityType: "staff_session", entityId: sessionId, after: { memberId: membre.id } });
        return { ok: true, member: membre, sessionId };''', r'''entityType: "staff_session", entityId: sessionId, after: { memberId: membre.id, pinHash: input.expectedPinHash } });
        return { ok: true, member: membre, sessionId };''', ["magasin", "int-audit"])
cible("O-13. ⛔ K-23 — la session ouverte par PIN est rattachée à un AUTRE appareil que celui retrouvé", MAGASIN,
      r'''VALUES (${membre.id}::uuid, ${appareil.id}::uuid, ${input.sessionTokenHash}''', r'''VALUES (${membre.id}::uuid, ${membre.id}::uuid, ${input.sessionTokenHash}''', ["magasin", "int-pin"])

# ── M — R-4 : l'ÉMISSION du PIN (connexion, changement de mot de passe), sous le verrou, par UNE règle.
cible("M-1. ⛔ R-4 — un PIN VALABLE est REMPLACÉ à chaque connexion par mot de passe (l'émission ne tient plus compte de l'état)", MAGASIN,
      r'''  if (etat === StaffPinState.VALID) return false;''', r'''  if (etat === StaffPinState.VALID && false) return false;''', ["magasin", "int-emission"])
cible("M-2. ⛔ R-4 — l'émission acceptée avec un compte de ZÉRO ligne (un PIN rendu qui n'a jamais été installé)", MAGASIN,
      r'''  if (ecrit !== 1) throw new Error("émission du PIN''', r'''  if (ecrit > 1) throw new Error("émission du PIN''', ["magasin"])
cible("M-3. ⛔ R-4 — la ligne `staff.pin_unlock` s'écrit pour un PIN EXPIRÉ au lieu d'un PIN verrouillé", MAGASIN,
      r'''  if (etat === StaffPinState.LOCKED) {''', r'''  if (etat === StaffPinState.EXPIRED) {''', ["magasin", "int-emission", "int-audit"])
cible("M-4. ⛔ MP-11 — la ligne `staff.pin_unlock` porte le HACHÉ du PIN candidat", MAGASIN,
      r'''after: { via: "password" } });''', r'''after: { via: "password", pinHash: candidatHache } });''', ["magasin", "int-audit"])
cible("M-5. ⛔ R-4 — l'émission ne LÈVE plus le verrou (`pin_locked_at` reste posé : un PIN neuf déjà verrouillé)", MAGASIN,
      r'''           pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()
     WHERE id = ${memberId}::uuid`;''', r'''           pin_failed_count = 0, updated_at = now()
     WHERE id = ${memberId}::uuid`;''', ["magasin", "int-emission"])
cible("M-6. ⛔ R-4 — l'émission ne remet plus le COMPTEUR à zéro (un PIN neuf démarre aux essais de l'ancien)", MAGASIN,
      r'''           pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()
     WHERE id = ${memberId}::uuid`;''', r'''           pin_locked_at = NULL, updated_at = now()
     WHERE id = ${memberId}::uuid`;''', ["magasin", "int-emission"])
cible("M-7. ⛔ MP-27 — l'échéance d'un appareil NEUF ne dépasse plus à elle seule celle du PIN (`LEAST` retiré)", MAGASIN,
      r'''                  LEAST(now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int), (SELECT pin_expires_at FROM pro_staff_members WHERE id = ${membre.id}::uuid)))''',
      r'''                  now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int))''', ["magasin", "int-emission"])
cible("M-8. ⛔ K-18 — le changement de mot de passe n'ÉMET plus de PIN (la règle d'émission n'est plus la même que celle de la connexion)", MAGASIN,
      r'''      const pinIssued = await emettreLePin(tx, input.actor, input.memberId, verrou[0]!, input.newPinHash);''', r'''      const pinIssued = false;''', ["magasin", "int-emission"])
cible("M-9. ⛔ K-15 — la connexion par mot de passe n'ÉMET plus de PIN", MAGASIN,
      r'''      const pinIssued = await emettreLePin(tx, input.actor, membre.id, ligne, input.newPinHash);''', r'''      const pinIssued = false;''', ["int-emission"])
cible("M-10. ⛔ K-18 — le verrou du membre (`FOR UPDATE`) n'est plus pris avant l'émission du PIN (le changement lit un état qui peut changer)", MAGASIN,
      r'''WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE' FOR UPDATE`;''', r'''WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'`;''', ["magasin", "int-emission"])

# ── X — K-14 : le PIN du Manager s'installe à l'ACTIVATION.
cible("X-1. ⛔ K-14 — l'activation installe le haché du MOT DE PASSE dans la colonne du PIN (le PIN rendu n'est plus celui qui est stocké)", MAGASIN,
      r'''                  ${input.pinHash}, now(), now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int))''', r'''                  ${input.passwordHash}, now(), now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int))''', ["magasin", "int-emission"])

# ── Z — K-21, K-22 : la réinitialisation et la désactivation EFFACENT le PIN.
cible("Z-1. ⛔ DR5, S-105 — la réinitialisation du mot de passe n'EFFACE plus le PIN (l'ancien PIN reste valable)", MAGASIN,
      r'''password_locked_until = NULL,
               pin_hash = NULL, pin_generated_at = NULL, pin_expires_at = NULL, pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()''',
      r'''password_locked_until = NULL,
               updated_at = now()''', ["magasin", "int-emission", "int-pin"])
cible("Z-2. ⛔ DR5 — la désactivation n'EFFACE plus le PIN (un membre éteint garde un haché de PIN)", MAGASIN,
      r'''disabled_at = now(),
               pin_hash = NULL, pin_generated_at = NULL, pin_expires_at = NULL, pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()''',
      r'''disabled_at = now(),
               updated_at = now()''', ["magasin", "int-emission"])
cible("Z-3. ⛔ DR5 — la réinitialisation efface le PIN mais LAISSE le verrou posé", MAGASIN,
      r'''password_locked_until = NULL,
               pin_hash = NULL, pin_generated_at = NULL, pin_expires_at = NULL, pin_failed_count = 0, pin_locked_at = NULL, updated_at = now()''',
      r'''password_locked_until = NULL,
               pin_hash = NULL, pin_generated_at = NULL, pin_expires_at = NULL, pin_failed_count = 0, updated_at = now()''', ["magasin", "int-emission"])

# ── W — le CONTRÔLEUR : `no-store`, la route exemptée.
cible("W-1. ⛔ K-14 — la réponse de l'activation (qui porte le PIN) n'est plus `no-store`", CONTROLEUR,
      r'''  @HttpCode(HttpStatus.CREATED)
  @Header("Cache-Control", "no-store")''', r'''  @HttpCode(HttpStatus.CREATED)
  @Header("Cache-Control", "max-age=60")''', ["int-emission"])
cible("W-2. ⛔ K-15 — la réponse de la connexion par mot de passe (qui peut porter un PIN) n'est plus `no-store`", CONTROLEUR,
      r'''  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")''', r'''  @Post("login")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "max-age=60")''', ["int-emission"])
cible("W-3. ⛔ K-18 — la réponse du changement de mot de passe (qui peut porter un PIN) n'est plus `no-store`", CONTROLEUR,
      r'''  @Post("password")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "no-store")''', r'''  @Post("password")
  @HttpCode(HttpStatus.OK)
  @Header("Cache-Control", "max-age=60")''', ["int-emission"])
cible("W-4. ⛔ K-23 — la route de la connexion par PIN n'est plus EXEMPTÉE du garde (elle exigerait une session de personnel pour en ouvrir une)", CONTROLEUR,
      r'''  @StaffExempt()
  @Post("pin-login")''', r'''  @Post("pin-login")
  @Header("X-Neutralise", "r58")''', ["int-garde", "sources", "int-pin"])
cible("W-5. ⛔ MP-36 — la route de la connexion par PIN n'a plus sa limite de débit propre (le limiteur par défaut la couvre)", CONTROLEUR,
      r'''  @Throttle({ default: AUTH_THROTTLE.staffPin })''', r'''  @Throttle({ default: AUTH_THROTTLE.staffLogin })''', ["int-debit"])

# ── Q — R-6 : `quote.promote` porte le MEMBRE qui agit.
cible("Q-1. ⛔ R-6 — le magasin des devis n'écrit plus `actor_member_id` dans la ligne `quote.promote`", QSTORE,
      r'''          actorMemberId: donnees.memberId,''', r'''          actorMemberId: null,''', ["magasin-devis", "int-promote"])
cible("Q-2. ⛔ R-6 — le service des devis ne transmet plus le MEMBRE au magasin", QSVC,
      r'''      acteur: { userId: acteur.userId, role: acteur.role },
      memberId,
      quoteId,''', r'''      acteur: { userId: acteur.userId, role: acteur.role },
      memberId: null,
      quoteId,''', ["service-devis", "int-promote"])
cible("Q-3. ⛔ R-6 — le contrôleur des devis ne transmet plus le membre du garde au service", QCTRL,
      r'''    return this.quotes.promote(user, id, body, staff?.memberId ?? null);''', r'''    return this.quotes.promote(user, id, body, null);''', ["int-promote"])

# ── G — les gardes de SOURCE (un défaut introduit dans le code doit les faire rougir).
cible("G-1. ⛔ R-2 — un SERVICE lit le NOM du secret (la variable n'est plus lue que par le schéma et le fournisseur)", SERVICE,
      r'''@Injectable()
export class StaffSessionService {''', r'''const NOM_DU_SECRET = "STAFF_PIN_HMAC_SECRET";

@Injectable()
export class StaffSessionService {''', ["sources"], "insertion")
cible("G-2. ⛔ MP-11 — un SECOND `createHmac` apparaît hors du hacheur", SERVICE,
      r'''@Injectable()
export class StaffSessionService {''', r'''const AUTRE_HMAC = (): unknown => createHmac("sha256", "x");

@Injectable()
export class StaffSessionService {''', ["sources"], "insertion")
cible("G-3. ⛔ MP-11 — le MAGASIN nomme un `pin` en clair (un mot entier)", MAGASIN,
      r'''type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];''', r'''type Tx = Parameters<Parameters<PrismaService["$transaction"]>[0]>[0];
const pin = "1234";''', ["sources"], "insertion")
cible("G-4. ⛔ K-23 — une SIXIÈME route est exemptée du garde (la liste fermée des exemptions grossit)", CONTROLEUR,
      r'''  @StaffAnyMember()
  @Post("logout")''', r'''  @StaffExempt()
  @StaffAnyMember()
  @Post("logout")''', ["sources", "int-garde"], "insertion")
cible("G-5. ⛔ D200 — le fichier d'EXEMPLE porte une valeur pour le secret du PIN", ENVEX,
      r'''STAFF_PIN_HMAC_SECRET=
''', r'''STAFF_PIN_HMAC_SECRET=zzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzzz
''', ["sources"])


# ── TITRES : le titre (ou un fragment) du test qui doit rougir, par « identifiant|mesure ». ÉCRIT À PARTIR DU RELEVÉ de la découverte (jamais de mémoire) ; une mesure absente d'ici n'a pas mordu au relevé.
# <<TITRES>>
TITRES: dict[str, str] = {
    "P-1|pin": "generatePin — tire jusqu'à obtenir un PIN non trivial, borné > ⛔ les ZÉROS DE TÊTE sont rendus : le tirage 482",
    "P-2|pin": "generatePin — tire jusqu'à obtenir un PIN non trivial, borné > ⛔ un PIN trivial est RE-TIRÉ, pas rendu : 1111,",
    "P-3|pin": "generatePin — tire jusqu'à obtenir un PIN non trivial, borné > ⛔ la boucle est BORNÉE : un générateur qui ne r",
    "P-4|pin": "generatePin — tire jusqu'à obtenir un PIN non trivial, borné > ⛔ une valeur HORS de l'intervalle (10000, −1, 4",
    "P-5|pin": "isTrivialPin — la liste FERMÉE (MP-10) : des répétitions et des suites, rien d'autre > ⛔ sur les DIX MILLE PIN",
    "P-6|pin": "isTrivialPin — la liste FERMÉE (MP-10) : des répétitions et des suites, rien d'autre > ⛔ sur les DIX MILLE PIN",
    "P-7|pin": "isTrivialPin — la liste FERMÉE (MP-10) : des répétitions et des suites, rien d'autre > ⛔ sur les DIX MILLE PIN",
    "P-8|pin": "isTrivialPin — la liste FERMÉE (MP-10) : des répétitions et des suites, rien d'autre > ⛔ sur les DIX MILLE PIN",
    "H-1|hacheur": "hash — HMAC-SHA-256 du PIN avec le secret > ⛔ la valeur est celle de la NORME : le HMAC-SHA-256 hexadécimal du",
    "H-1|int-pin": "⛔ K-23 — un PIN juste, sur le poste du membre : la session s'ouvre > 200 : le membre est rendu SANS PIN, une s",
    "H-2|hacheur": "hash — HMAC-SHA-256 du PIN avec le secret > ⛔ la valeur est celle de la NORME : le HMAC-SHA-256 hexadécimal du",
    "H-3|hacheur": "verify — compare le PIN présenté au hachage stocké > ⛔ un hachage MAL FORMÉ (vide, trop court, non hexadécimal",
    "H-4|sources": "rang 58 — le PIN et son secret : les gardes de SOURCE > ⛔ la comparaison des hachés est À TEMPS CONSTANT : `ti",
    "H-5|hacheur": "même COÛT : un calcul de HMAC par chemin, mesuré par espion > ⛔ vérifier contre le FACTICE : un calcul, et RIE",
    "H-6|hacheur": "verify — compare le PIN présenté au hachage stocké > le bon PIN contre son hachage : vrai",
    "E-1|etat": "etatDuPin — absent, valide, expiré, verrouillé > ⛔ le compte au PLAFOND sans verrou (un arrêt entre la 3ᵉ rése",
    "E-1|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > le comp",
    "E-2|etat": "etatDuPin — absent, valide, expiré, verrouillé > ⛔ le cas RÉEL : il lui reste UNE milliseconde → VALID ; à l'i",
    "E-3|etat": "etatDuPin — absent, valide, expiré, verrouillé > ⛔ l'ABSENCE l'emporte sur TOUT (écrit en tête de la règle) : ",
    "E-4|etat": "etatDuPin — absent, valide, expiré, verrouillé > ⛔ le verrou l'emporte sur l'expiration : un PIN verrouillé ET",
    "V-1|env": "validateEnv (schéma Zod des variables d'environnement) > STAFF_PIN_HMAC_SECRET (L36-3b : le secret HORS base d",
    "V-2|env": "validateEnv (schéma Zod des variables d'environnement) > STAFF_PIN_HMAC_SECRET (L36-3b : le secret HORS base d",
    "V-3|env": "validateEnv (schéma Zod des variables d'environnement) > NODE_ENV=production : CINQ variables exigées explicit",
    "T-1|int-debit": "Rate limiting /auth (limites réelles) > staffPin (rang 58, D356, MP-36) : 60 requêtes passent (401, sans Beare",
    "T-2|int-debit": "Rate limiting /auth (limites réelles) > ⛔ MP-36 — les DÉFAUTS de production des trois clés neuves (aucune vari",
    "C-1|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "C-2|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "C-3|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "C-4|int-pin": "⛔ MP-15 — trois essais : le troisième ÉCHEC pose le verrou ; le bon PIN verrouillé est refusé ; le mot de pass",
    "C-5|parite": "Parité i18n FR/AR (invariant produit) > les DEUX ensembles de clés sont identiques — toute clé orpheline est n",
    "C-5|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "K-1|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > ⛔ rang 58 (D356) — K-23 : `pinLogin` PO",
    "K-1|int-contrat": "B6 — contrat de CHEMINS entre le client et l'API (D122) > CHAQUE chemin appelé par @zwadj/api-client existe su",
    "K-2|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > ⛔ rang 58 (D356) — K-23 : `pinLogin` PO",
    "S-1|service": "pinLogin — la connexion par PIN (K-23) > ⛔ R-3 — la couche ÉTEINTE, le membre inconnu, la salle sans profil, l",
    "S-2|service": "pinLogin — la connexion par PIN (K-23) > ⛔ MP-2 — SANS cookie d'appareil, la réservation n'est PAS demandée : ",
    "S-3|int-pin": "⛔ R-3 — le refus a la MÊME FORME et le MÊME COÛT, quelle qu'en soit la cause > neuf causes (membre inconnu, PI",
    "S-3|service": "pinLogin — la connexion par PIN (K-23) > ⛔ le membre DÉSACTIVÉ et le TEMPORAIRE EXPIRÉ sont des comptes inconn",
    "S-4|service": "pinLogin — la connexion par PIN (K-23) > ⛔ la réservation REFUSÉE (essais épuisés, PIN verrouillé, expiré ou a",
    "S-6|int-pin": "⛔ MP-15 — trois essais : le troisième ÉCHEC pose le verrou ; le bon PIN verrouillé est refusé ; le mot de pass",
    "S-6|service": "pinLogin — la connexion par PIN (K-23) > ⛔ un PIN FAUX : UN calcul de HMAC réel, l'échec est consigné avec le ",
    "S-7|service": "pinLogin — la connexion par PIN (K-23) > ⛔ un PIN FAUX : UN calcul de HMAC réel, l'échec est consigné avec le ",
    "S-8|service": "pinLogin — la connexion par PIN (K-23) > ⛔ le jeton de session posé est celui dont le HACHAGE a été donné à l'",
    "S-9|service": "pinLogin — la connexion par PIN (K-23) > ⛔ le jeton de session posé est celui dont le HACHAGE a été donné à l'",
    "S-10|service": "pinLogin — la connexion par PIN (K-23) > ⛔ R-3 — une ouverture REFUSÉE sous verrou (PIN remplacé, verrou posé,",
    "S-11|service": "pinLogin — la connexion par PIN (K-23) > ⛔ un PIN juste : UN calcul de HMAC (la vraie vérification, contre le ",
    "S-12|int-emission": "⛔ K-14 — l'activation rend le PIN du Manager UNE fois, `no-store` > ⛔ le PIN est STOCKÉ en HMAC avec le secret",
    "S-12|service": "activate — K-14 : le propriétaire crée le Manager > ⛔ rang 58 — le PIN tiré est HACHÉ avant d'atteindre le mag",
    "S-13|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > la PREM",
    "S-13|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ MP-8 — un mot de passe juste : UN seul hacha",
    "S-14|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > la PREM",
    "S-14|service": "rang 58 — K-15 et K-18 rendent le PIN UNE fois, quand le magasin l'a installé > ⛔ la connexion : le PIN candid",
    "S-15|int-emission": "⛔ K-18 — le changement de mot de passe suit la MÊME règle d'émission > PIN valable : `pin: null`, colonnes inc",
    "S-15|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > un mot de passe actuel juste : rés",
    "S-16|int-emission": "⛔ K-18 — le changement de mot de passe suit la MÊME règle d'émission > PIN valable : `pin: null`, colonnes inc",
    "R-1|int-course": "⛔ MP-1 — vingt essais PARALLÈLES : exactement TROIS comptés, exactement TROIS vérifications, dix-sept refus no",
    "R-1|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-2|int-course": "⛔ le TÉMOIN POSITIF — sans événement intercalé, la connexion par PIN s'ouvre (une garde qui refuserait TOUT pa",
    "R-2|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-2|int-pin": "⛔ MP-15 — trois essais : le troisième ÉCHEC pose le verrou ; le bon PIN verrouillé est refusé ; le mot de pass",
    "R-3|int-course": "⛔ MP-1 — vingt essais PARALLÈLES : exactement TROIS comptés, exactement TROIS vérifications, dix-sept refus no",
    "R-3|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-4|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-5|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-5|int-pin": "⛔ MP-3 — l'appareil d'un autre membre, d'une autre salle : QUATRE croisements, tous refusés, aucun essai conso",
    "R-6|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-6|int-pin": "⛔ MP-26, MP-27, MP-28 — PIN expiré, appareil expiré ou révoqué, trop de cookies d'appareil > MP-27 — un appare",
    "R-7|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-7|int-pin": "⛔ MP-26, MP-27, MP-28 — PIN expiré, appareil expiré ou révoqué, trop de cookies d'appareil > MP-27 — un appare",
    "R-8|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-9|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-10|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "R-10|int-pin": "⛔ MP-26, MP-27, MP-28 — PIN expiré, appareil expiré ou révoqué, trop de cookies d'appareil > MP-26 — un PIN EX",
    "R-11|magasin": "reservePinAttempt — MP-1, MP-2 : UNE instruction, toutes ses conditions, le compteur monte AVANT la vérificati",
    "F-1|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ AU ",
    "F-1|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > le TROISIÈME échec : l",
    "F-1|int-pin": "⛔ MP-15 — trois essais : le troisième ÉCHEC pose le verrou ; le bon PIN verrouillé est refusé ; le mot de pass",
    "F-2|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ AU ",
    "F-3|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ AU ",
    "F-4|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ AU ",
    "F-4|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > le TROISIÈME échec : l",
    "F-4|int-pin": "⛔ MP-15 — trois essais : le troisième ÉCHEC pose le verrou ; le bon PIN verrouillé est refusé ; le mot de pass",
    "F-5|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ AU ",
    "F-5|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > le TROISIÈME échec : l",
    "F-5|int-pin": "⛔ MP-15 — trois essais : le troisième ÉCHEC pose le verrou ; le bon PIN verrouillé est refusé ; le mot de pass",
    "F-6|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ SOU",
    "F-6|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > un échec : UNE ligne `",
    "F-7|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > un échec : UNE ligne `",
    "F-8|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ AU ",
    "F-8|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > le TROISIÈME échec : l",
    "F-9|magasin": "recordPinFailure — le verrou se pose au TROISIÈME ÉCHEC, sur CE PIN, et met fin aux sessions du membre > ⛔ AU ",
    "F-9|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > le TROISIÈME échec : l",
    "O-1|int-course": "⛔ R-3 — « PIN ‖ déblocage par mot de passe » et « PIN ‖ verrouillage par un autre échec » > ⛔ ENTRELACEMENT FO",
    "O-1|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-2|int-course": "⛔ R-3 — « PIN ‖ déblocage par mot de passe » et « PIN ‖ verrouillage par un autre échec » > ⛔ ENTRELACEMENT FO",
    "O-2|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-3|int-course": "⛔ R-3 — « PIN ‖ déblocage par mot de passe » et « PIN ‖ verrouillage par un autre échec » > ⛔ ENTRELACEMENT FO",
    "O-3|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-4|int-course": "⛔ R-3 — « PIN ‖ désactivation » : un membre désactivé entre la réservation et l'ouverture n'ouvre AUCUNE sessi",
    "O-4|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-5|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-6|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-6|int-pin": "⛔ K-23 — un PIN juste, sur le poste du membre : la session s'ouvre > 200 : le membre est rendu SANS PIN, une s",
    "O-7|int-course": "⛔ R-3 — « PIN ‖ appareil révoqué » : l'appareil se re-vérifie SOUS verrou, et le refus ANNULE toute la transac",
    "O-7|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-8|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-9|int-course": "⛔ R-3 — « PIN ‖ appareil révoqué » : l'appareil se re-vérifie SOUS verrou, et le refus ANNULE toute la transac",
    "O-9|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-10|int-course": "⛔ R-3 — « PIN ‖ appareil révoqué » : l'appareil se re-vérifie SOUS verrou, et le refus ANNULE toute la transac",
    "O-10|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-11|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-11|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > la connexion par PIN :",
    "O-12|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > la connexion par PIN :",
    "O-13|magasin": "openSessionByPin — K-23 : le membre d'abord (L2), l'appareil (L3) puis la session (L4) ; les QUATRE conditions",
    "O-13|int-pin": "⛔ K-23 — un PIN juste, sur le poste du membre : la session s'ouvre > 200 : le membre est rendu SANS PIN, une s",
    "M-1|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > la PREM",
    "M-2|magasin": "l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux",
    "M-3|magasin": "l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux",
    "M-3|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > ⛔ un PI",
    "M-3|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > le déblocage : UNE lig",
    "M-4|magasin": "l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux",
    "M-4|int-audit": "⛔ R-5 — UNE ligne par action du PIN, `actor_member_id` renseigné, charge utile FERMÉE > le déblocage : UNE lig",
    "M-5|magasin": "l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux",
    "M-5|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > ⛔ un PI",
    "M-6|magasin": "l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux",
    "M-6|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > ⛔ un PI",
    "M-7|magasin": "l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux",
    "M-7|int-emission": "⛔ MP-27 (R-6 de D341) — un appareil n'est JAMAIS valable au-delà du PIN > un membre dont le PIN expire dans DI",
    "M-8|magasin": "l'ÉMISSION du PIN — connexion et changement de mot de passe : UNE règle, sous le verrou, la même pour les deux",
    "M-8|int-emission": "⛔ K-18 — le changement de mot de passe suit la MÊME règle d'émission > PIN valable : `pin: null`, colonnes inc",
    "M-9|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > la PREM",
    "M-10|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "X-1|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ rang 58",
    "X-1|int-emission": "⛔ K-14 — l'activation rend le PIN du Manager UNE fois, `no-store` > ⛔ le PIN est STOCKÉ en HMAC avec le secret",
    "Z-1|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ le r",
    "Z-1|int-emission": "⛔ K-21 et K-22 EFFACENT le PIN (S-105, DR5) > K-21 — la réinitialisation efface les CINQ colonnes (haché, géné",
    "Z-2|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "Z-2|int-emission": "⛔ K-21 et K-22 EFFACENT le PIN (S-105, DR5) > K-22 — la désactivation efface les CINQ colonnes du PIN",
    "Z-3|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ le r",
    "W-1|int-emission": "⛔ K-14 — l'activation rend le PIN du Manager UNE fois, `no-store` > 201 : un PIN de quatre chiffres non trivia",
    "W-2|int-emission": "⛔ K-15 — la connexion par mot de passe rend un PIN NEUF si le membre n'en a pas de valable, UNE fois > la PREM",
    "W-3|int-emission": "⛔ K-18 — le changement de mot de passe suit la MÊME règle d'émission > PIN valable : `pin: null`, colonnes inc",
    "W-4|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "W-4|int-garde": "le collecteur — garde-fou du garde-fou > ⛔ MP-20 — la liste des routes EXEMPTÉES est dérivée des métadonnées e",
    "W-4|int-pin": "⛔ K-23 — un PIN juste, sur le poste du membre : la session s'ouvre > 200 : le membre est rendu SANS PIN, une s",
    "W-5|int-debit": "Rate limiting /auth (limites réelles) > staffPin (rang 58, D356, MP-36) : 60 requêtes passent (401, sans Beare",
    "Q-1|magasin-devis": "⛔ D-5, D-6, D-11 — `promouvoir` : UNE transaction, le verrou de la chaîne, le compte = 1 exigé, UNE ligne d'au",
    "Q-1|int-promote": "⛔ R-6 — `quote.promote` porte le MEMBRE qui agit quand une session de personnel existe > le MANAGER promeut : ",
    "Q-2|service-devis": "⛔ D-4, D-5, D-6 — `promote` : la fiche et le nom DÉCIDÉS ICI, l'écriture et ses refus TRADUITS ICI > ⛔ le port",
    "Q-2|int-promote": "⛔ R-6 — `quote.promote` porte le MEMBRE qui agit quand une session de personnel existe > le MANAGER promeut : ",
    "Q-3|int-promote": "⛔ R-6 — `quote.promote` porte le MEMBRE qui agit quand une session de personnel existe > le MANAGER promeut : ",
    "G-1|sources": "rang 58 — le PIN et son secret : les gardes de SOURCE > ⛔ R-2 — le NOM du secret n'est écrit que dans `config/",
    "G-2|sources": "rang 58 — le PIN et son secret : les gardes de SOURCE > ⛔ MP-11 — `createHmac` n'est appelé que dans le hacheu",
    "G-3|sources": "rang 58 — le PIN et son secret : les gardes de SOURCE > ⛔ MP-11 — le MAGASIN ne voit JAMAIS le PIN en clair : ",
    "G-4|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "G-4|int-garde": "le collecteur — garde-fou du garde-fou > ⛔ MP-20 — la liste des routes EXEMPTÉES est dérivée des métadonnées e",
    "G-5|sources": "rang 58 — le PIN et son secret : les gardes de SOURCE > ⛔ D200 — `apps/api/.env.example` porte le NOM du secre",
    "S-5|service": "pinLogin — la connexion par PIN (K-23) > ⛔ un PIN juste : UN calcul de HMAC (la vraie vérification, contre le ",
}
TITRES_RELEVES = True
# <</TITRES>>


def _est_int(c: dict) -> bool:
    return any(_mesure_de(m) in MESURES_INT for m in c["mesures"])


def _jouees() -> list[dict]:
    """Les cibles jouées. Une clé de mesure peut porter un suffixe `#n` : plusieurs titres d'un MÊME fichier de test pour une même cible (le dictionnaire ne peut pas répéter une clé).
    Sans `--int`, les cibles d'INTÉGRATION (PostgreSQL réel) ne sont pas jouées : elles sont COMPTÉES comme telles, jamais comme mordues.
    ⚠ Une cible qui a une mesure d'intégration ET une mesure unitaire n'est jouée qu'avec `--int` : ses deux mesures se jugent ensemble."""
    return [{**c, "mesures": dict(c["mesures"])} for c in CIBLES if AVEC_INT or not _est_int(c)]


def _mesure_de(cle: str) -> str:
    return cle.split("#")[0]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[_mesure_de(mesure)]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
    Copie du lecteur de `neutralize-r39.py` (lui-même copié de `neutralize-r33.py`, calibré par D316 et D325) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
    if f"RUN  {VITEST_ATTENDU}" not in sortie:
        m = re.search(r"RUN\s+(v\S+)", sortie)
        return "VERSION", f"vitest {m.group(1) if m else 'introuvable'}, {VITEST_ATTENDU} attendu"
    ligne = re.search(r"^\s*Tests\s+(.*)$", sortie, re.M)
    if not ligne:
        return "NON-DÉMARRÉE", "aucune ligne « Tests »"
    echecs = int(m.group(1)) if (m := re.search(r"(\d+) failed", ligne.group(1))) else 0
    passes = int(m.group(1)) if (m := re.search(r"(\d+) passed", ligne.group(1))) else 0
    if passes + echecs == 0:
        return "NON-DÉMARRÉE", f"exécutés 0 ({ligne.group(0).strip()})"
    if titre is None or echecs == 0:
        return ("VERT" if echecs == 0 else "ROUGE"), f"passés {passes} · en échec {echecs}"
    if not any("×" in l and titre in l for l in sortie.splitlines()):
        return "SANS-TITRE", f"en échec {echecs}, aucun « × » ne porte « {titre} »"
    lignes = sortie.splitlines()
    premiere = "—"
    for i, l in enumerate(lignes):
        if l.strip().startswith("FAIL ") and titre in l:
            premiere = next((x.strip() for x in lignes[i + 1:] if x.strip() and not x.strip().startswith("FAIL ")), "—")
            break
    if not premiere.startswith("AssertionError"):
        return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"
    return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"


def echecs_de(sortie: str) -> list[tuple[str, str]]:
    """Mode DÉCOUVERTE : (titre, première ligne de son bloc) pour chaque test en échec. Les en-têtes REGROUPÉS partagent le message qui les suit."""
    lignes = sortie.splitlines()
    rendus: list[tuple[str, str]] = []
    i = 0
    while i < len(lignes):
        if lignes[i].strip().startswith("FAIL ") and ">" in lignes[i]:
            titres = []
            while i < len(lignes) and (lignes[i].strip().startswith("FAIL ") or not lignes[i].strip()):
                if lignes[i].strip():
                    titres.append(lignes[i].strip())
                i += 1
            message = lignes[i].strip() if i < len(lignes) else "—"
            rendus += [(t, message) for t in titres]
        else:
            i += 1
    return rendus


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras de `neutralize-r39.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
_V = " RUN  v3.2.7 C:/x\n"
CALIBRATION = [
    ("en-têtes REGROUPÉS puis AssertionError", _V
     + "   × d > 93 jour(s) : t 8ms\n   × d > 182 jour(s) : t 1ms\n"
       " FAIL  a.test.ts > d > 93 jour(s) : t\n FAIL  a.test.ts > d > 182 jour(s) : t\n"
       "AssertionError: expected false to be true // Object.is equality\n      Tests  7 failed | 9 passed (16)\n",
     "182 jour(s) : t", "MORD"),
    ("plantage (TypeError)", _V
     + "   × d > t 219ms\n FAIL  a.test.ts > d > t\nTypeError: .toMatch() expects to receive a string, but got undefined\n"
       "      Tests  1 failed | 18 passed (19)\n", "t", "PAS-ASSERTION"),
    ("erreur de REQUÊTE Testing Library (pas une assertion)", _V
     + "   × d > t 1105ms\n FAIL  a.test.ts > d > t\nTestingLibraryElementError: Unable to find an element with the text: x\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "PAS-ASSERTION"),
    ("rien d'exécuté sous filtre", _V + "      Tests  25 skipped (25)\n", "t", "NON-DÉMARRÉE"),
    ("autre version", " RUN  v3.2.6 C:/x\n      Tests  1 failed (1)\n", "t", "VERSION"),
    ("crochet en échec (bloc de FICHIER, 1 skipped)", _V
     + " Test Files  1 failed (1)\n      Tests  1 skipped (1)\n FAIL  cas/crochet.cas.ts [ cas/crochet.cas.ts ]\n"
       "Error: crochet en panne\n", "t", "NON-DÉMARRÉE"),
    ("le titre attendu n'échoue pas (un autre, si)", _V
     + "   × d > une autre garde 3ms\n FAIL  a.test.ts > d > une autre garde\nAssertionError: expected 1 to be 2\n"
       "      Tests  1 failed | 4 passed (5)\n", "garde visée par la cible", "SANS-TITRE"),
    ("délai dépassé (jamais une morsure)", _V
     + "   × d > t 5001ms\n FAIL  a.test.ts > d > t\nError: Test timed out in 5000ms.\n      Tests  1 failed | 7 passed (8)\n", "t", "PAS-ASSERTION"),
    ("plafond de console (Error de test-setup, pas une assertion)", _V
     + "   × d > t 30ms\n FAIL  a.test.ts > d > t\nError: 3 avertissement(s) de console dans un fichier NON exempté.\n      Tests  1 failed | 3 passed (4)\n", "t", "PAS-ASSERTION"),
]


def calibrer() -> bool:
    manques = 0
    for nom, texte, titre, attendu in CALIBRATION:
        verdict, _ = lire_vitest(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    decouverte = echecs_de(_V + " FAIL  a.test.ts > d > un\n FAIL  a.test.ts > d > deux\nAssertionError: m1\n\n FAIL  a.test.ts > d > trois\nTypeError: m2\n")
    attendu_decouverte = [("FAIL  a.test.ts > d > un", "AssertionError: m1"), ("FAIL  a.test.ts > d > deux", "AssertionError: m1"),
                          ("FAIL  a.test.ts > d > trois", "TypeError: m2")]
    ok = decouverte == attendu_decouverte
    manques += not ok
    print(f"  calibration {'✓' if ok else '✗'} découverte : {len(decouverte)} échec(s) lu(s) (attendu 3)")
    print(f"  calibration : {len(CALIBRATION) + 1} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


def _ecrire_manifeste(actions: list) -> None:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    io.open(MANIFESTE, "w", encoding="utf-8", newline="").write(json.dumps(actions, ensure_ascii=False))


def _defaire(actions: list) -> None:
    for action in reversed(actions):
        io.open(action["chemin"], "w", encoding="utf-8", newline="").write(action["contenu"])


def restaurer_si_interrompu() -> None:
    if os.path.isfile(MANIFESTE):
        actions = json.load(io.open(MANIFESTE, encoding="utf-8"))
        _defaire(actions)
        print(f"↺ arbre restauré après une exécution interrompue ({len(actions)} fichier(s)).")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def empreintes() -> dict[str, str]:
    return {f: hashlib.sha256(open(f, "rb").read()).hexdigest() for f in sorted({c["fichier"] for c in CIBLES})}


def _adapter(texte: str, source: str) -> str:
    """Les ancres multi-lignes sont écrites en `\\n` : un fichier en CRLF les porte en `\\r\\n` (D325 : « un motif multi-lignes doit porter `\\r\\n` »)."""
    return texte.replace("\n", "\r\n") if "\r\n" in source else texte


def verifier_arbre(moment: str, depart: dict[str, str] | None = None) -> bool:
    """Chaque ancre est là, UNE fois ; à l'arrivée, chaque fichier ciblé a l'EMPREINTE du départ (restauration prouvée à l'octet)."""
    ecarts = []
    for c in CIBLES:
        src = io.open(c["fichier"], encoding="utf-8", newline="").read()
        n = src.count(_adapter(c["avant"], src))
        if n != 1:
            ecarts.append(f"{c['libelle'][:5]} : ancre ×{n}")
    if depart is not None:
        maintenant = empreintes()
        ecarts += [f"{f} : empreinte changée" for f in depart if depart[f] != maintenant[f]]
        print(f"  empreintes : {len(depart)} fichier(s) ciblé(s) comparé(s) au départ · {sum(depart[f] != maintenant[f] for f in depart)} différent(s) (attendu 0)")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def main() -> int:
    print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")
    _normaliser_mesures()
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    if FILTRE and not DECOUVERTE:
        print("✗ R58_FILTRE n'est admis qu'avec R58_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R58_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    if CLASSE:
        if not DECOUVERTE:
            print("✗ R58_CLASSE n'est admis qu'avec R58_DECOUVERTE=1 : une campagne restreinte n'est pas une campagne verte.")
            return 2
        actives = [{**c, "mesures": {m: t for m, t in c["mesures"].items() if (_mesure_de(m) in MESURES_INT) == (CLASSE == "int")}} for c in actives]
        actives = [c for c in actives if c["mesures"]]
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({_mesure_de(m) for c in actives for m in c["mesures"]})
    non_jouees = sum(1 for c in CIBLES if _est_int(c) and not AVEC_INT)
    print(f"cibles : {len(CIBLES)} déclarées · {len(actives)} jouées · {non_jouees} non jouée(s) (sans --int) · {len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in actives})} fichier(s) muté(s)")

    # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in mesures_utilisees:
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(_entete_journal() + sortie)
        verdict, detail = lire_vitest(sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    for cible_ in actives:
        chemin = cible_["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        avant, apres = _adapter(cible_["avant"], source), _adapter(cible_["apres"], source)
        ancre_avant, marque_avant = source.count(avant), source.count(apres)
        if ancre_avant != 1:
            print(f"✗ {cible_['libelle']}\n   ERREUR DE SCRIPT : {ancre_avant} occurrence(s), 1 attendue dans {chemin}")
            erreurs.append(cible_["libelle"])
            break
        mute = source.replace(avant, apres)
        ancre_apres, marque_apres = mute.count(avant), mute.count(apres)
        ancre_attendue = 1 if cible_["genre"] == "insertion" else 0
        if (ancre_apres, marque_apres) != (ancre_attendue, marque_avant + 1):
            print(f"✗ {cible_['libelle']}\n   MUTATION NON POSÉE : ancre {ancre_avant}→{ancre_apres}, "
                  f"marqueur {marque_avant}→{marque_apres} (attendu 1→{ancre_attendue} et {marque_avant}→{marque_avant + 1}, genre {cible_['genre']})")
            erreurs.append(cible_["libelle"])
            break
        annuler = [{"chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(mute)
        sorties: dict[str, tuple[int, str]] = {}
        try:
            for mesure in {_mesure_de(m) for m in cible_["mesures"]}:
                sorties[mesure] = lancer(mesure)
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
        ident = cible_["libelle"].split(".")[0]
        posee = f"ancre 1→{ancre_attendue} · marqueur {marque_avant}→{marque_avant + 1} · genre {cible_['genre']}"
        # La sortie ENTIÈRE se journalise : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
        for mesure, (code, sortie) in sorties.items():
            io.open(os.path.join(JOURNAUX, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(_entete_journal() + sortie)
        if DECOUVERTE:
            print(f"■ {cible_['libelle']}\n   {posee}")
            for mesure, (code, sortie) in sorties.items():
                verdict, detail = lire_vitest(sortie, None)
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")
                for titre, message in echecs_de(sortie):
                    print(f"      {titre[:200]}\n         ↳ {message[:150]}")
            continue
        verdicts = []
        for cle, titre in cible_["mesures"].items():
            code, sortie = sorties[_mesure_de(cle)]
            verdict, detail = lire_vitest(sortie, titre)
            verdicts.append((cle, code, verdict, detail))
        if any(v in ("NON-DÉMARRÉE", "VERSION") for _, _, v, _ in verdicts):
            for mesure, code, verdict, detail in verdicts:
                print(f"✗ {cible_['libelle']}\n   [{mesure}] MESURE NON DÉMARRÉE ({verdict}) : {detail}")
            erreurs.append(cible_["libelle"])
            break
        if all(v == "MORD" and code != 0 for _, code, v, _ in verdicts):
            mordu += 1
            print(f"✓ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {detail}")
        else:
            muettes.append(cible_["libelle"])
            print(f"✗ {cible_['libelle']}\n   {posee}")
            for mesure, code, verdict, detail in verdicts:
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")

    conforme = verifier_arbre("À L'ARRIVÉE", depart)
    if DECOUVERTE:
        print(f"\nDÉCOUVERTE : {len(actives)} cible(s) jouée(s) sur {len(CIBLES)}, aucun verdict écrit.")
    else:
        print(f"\n{mordu} garde(s) mordue(s) sur {len(actives)} cible(s) jouée(s) · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) · {non_jouees} non jouée(s) (sans --int) "
              f"(attendu : {len(actives)} sur {len(actives)}, 0, 0, {0 if AVEC_INT else non_jouees})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
