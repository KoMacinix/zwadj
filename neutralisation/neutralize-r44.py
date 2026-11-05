#!/usr/bin/env python3
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
ANSI = re.compile(r"\x1b\[[0-9;]*m")
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


# ── G — le GARDE GLOBAL (`StaffSessionGuard`).
cible("G-1. ⛔ une route @Public() n'est plus ignorée par le garde du personnel (un PRO muni d'un Bearer sur `/auth/login` devrait présenter une session)", GARDE,
      "    if (this.reflector.getAllAndOverride<boolean | undefined>(IS_PUBLIC_KEY, cibles) === true) return true;", "    if (false) return true;", ["garde"])
cible("G-2. ⛔ la liste blanche des exemptions n'est plus lue (activer, se connecter et lire l'état exigeraient une session)", GARDE,
      "    const exempt = this.reflector.getAllAndOverride<boolean | undefined>(STAFF_EXEMPT_KEY, cibles) === true;", "    const exempt = false;", ["garde", "int-activation"])
cible("G-3. ⛔ MP-34 — un CLIENT ou un ADMIN déclenche la lecture du drapeau (le garde ne s'arrête plus avant la base)", GARDE,
      '    if (user === undefined || guardVerdict({ role: user.role, exempt, layerEnabled: true }) === "pass") return true;', "    if (user === undefined) return true;", ["garde"])
cible("G-4. ⛔ un PRO sans profil n'est plus laissé passer (le garde invente un refus que l'API n'a jamais rendu)", GARDE,
      "    if (layer === null) return true;", "    if (false) return true;", ["garde"])
cible("G-5. ⛔ MP-35 — la couche ÉTEINTE n'ouvre plus la porte (toute route Pro exigerait une session avant toute activation)", GARDE,
      '    if (guardVerdict({ role: user.role, exempt, layerEnabled: layer.enabledAt !== null }) === "pass") return true;', "    if (false) return true;", ["garde", "int-garde"])
cible("G-6. ⛔ MP-7 — le drapeau est lu à l'envers (la couche activée laisse passer, la couche éteinte exige)", GARDE,
      "layerEnabled: layer.enabledAt !== null", "layerEnabled: layer.enabledAt === null", ["garde"])
cible("G-7. ⛔ le cookie de session est lu sous le nom du cookie de RAFRAÎCHISSEMENT", GARDE,
      "    const jeton = readSessionCookie(request.cookies);", '    const jeton = typeof request.cookies?.["zwadj_rt"] === "string" ? (request.cookies["zwadj_rt"] as string) : undefined;', ["int-garde"])
cible("G-8. ⛔ l'absence de cookie n'est plus refusée par le garde (le hachage d'un jeton absent part au magasin)", GARDE,
      "    if (jeton === undefined) throw sessionRequise();", "    if (false) throw sessionRequise();", ["garde"])
cible("G-9. ⛔ MP-11 — le jeton part au magasin EN CLAIR (seul son SHA-256 doit voyager)", GARDE,
      "tokenHash: this.tokens.hash(jeton), proProfileId: layer.proProfileId", "tokenHash: jeton, proProfileId: layer.proProfileId", ["garde"])
cible("G-10. ⛔ MP-18 — la salle du magasin n'est plus celle du PROFIL du Bearer", GARDE,
      "tokenHash: this.tokens.hash(jeton), proProfileId: layer.proProfileId }", "tokenHash: this.tokens.hash(jeton), proProfileId: user.userId }", ["garde"])
cible("G-11. ⛔ un refus du magasin n'est plus un refus (la session d'une autre salle passe)", GARDE,
      "    if (!touched.ok) throw sessionRequise();", "    if (false) throw sessionRequise();", ["garde", "int-garde"])
cible("G-12. ⛔ le contexte posé sur la requête porte l'identifiant de SESSION à la place de celui du membre", GARDE,
      "      memberId: touched.session.memberId,", "      memberId: touched.session.sessionId,", ["garde"])
cible("G-13. ⛔ le refus du garde change de CODE (le client ne reconnaît plus « session requise »)", GARDE,
      "  new UnauthorizedException({ code: StaffErrorCode.STAFF_SESSION_REQUIRED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_SESSION_REQUIRED });",
      "  new UnauthorizedException({ code: StaffErrorCode.STAFF_INVALID_CREDENTIALS, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_SESSION_REQUIRED });", ["garde", "int-garde"])

# ── P — les DÉCISIONS PURES (`staff-session-policy.ts`).
cible("P-1. ⛔ `guardVerdict` — un ADMIN ou un CLIENT doit présenter une session (le rôle n'est plus regardé)", POLITIQUE,
      '  if (input.role !== "PRO") return "pass";', '  if (false) return "pass";', ["politique"])
cible("P-2. ⛔ `guardVerdict` — une route exemptée exige une session (on ne pourrait plus s'identifier)", POLITIQUE,
      '  if (input.exempt) return "pass";', '  if (false) return "pass";', ["politique"])
cible("P-3. ⛔ `guardVerdict` — la couche éteinte exige une session", POLITIQUE,
      '  if (!input.layerEnabled) return "pass";', '  if (false) return "pass";', ["politique"])
cible("P-4. ⛔ la session d'une AUTRE salle est TERMINÉE par le refus (on termine la session d'autrui)", POLITIQUE,
      '  if (!probe.sameVenue) return { reason: "foreign", endWith: null };', '  if (!probe.sameVenue) return { reason: "foreign", endWith: StaffSessionEndReason.IDLE };', ["politique"])
cible("P-5. ⛔ une session déjà terminée se voit réécrire une fin", POLITIQUE,
      '  if (probe.ended) return { reason: "ended", endWith: null };', '  if (probe.ended) return { reason: "ended", endWith: StaffSessionEndReason.DISABLED };', ["politique"])
cible("P-6. ⛔ la désactivation d'un membre n'écrit plus la fin DISABLED", POLITIQUE,
      '  if (!probe.memberActive) return { reason: "disabled", endWith: StaffSessionEndReason.DISABLED };', '  if (!probe.memberActive) return { reason: "disabled", endWith: null };', ["politique"])
cible("P-7. ⛔ le PLAFOND atteint écrit une fin IDLE (l'énumération n'a pas de valeur « plafond »)", POLITIQUE,
      '  if (probe.capped) return { reason: "capped", endWith: null };', '  if (probe.capped) return { reason: "capped", endWith: StaffSessionEndReason.IDLE };', ["politique"])
cible("P-8. ⛔ L'ORDRE — plafond ET inactivité : l'inactivité l'emporte (le plafond doit passer avant, rien ne s'écrit)", POLITIQUE,
      '  if (probe.capped) return { reason: "capped", endWith: null };', '  if (probe.capped && !probe.idle) return { reason: "capped", endWith: null };', ["politique"])
cible("P-9. ⛔ l'inactivité n'écrit plus la fin IDLE", POLITIQUE,
      '  if (probe.idle) return { reason: "idle", endWith: StaffSessionEndReason.IDLE };', '  if (probe.idle) return { reason: "idle", endWith: null };', ["politique"])
cible("P-10. ⛔ une session VIVANTE est classée « inactive » au lieu de LEVER (l'appelant écrirait IDLE sur une session vivante)", POLITIQUE,
      "  throw new SessionNotRefusedError();", '  return { reason: "idle", endWith: StaffSessionEndReason.IDLE };', ["politique"])
cible("P-11. ⛔ R-3 — pendant la PAUSE (tentative non réservée) le VRAI hachage est vérifié", POLITIQUE,
      '  return input.memberFound && input.memberActive && input.reserved ? "real" : "dummy";', '  return input.memberFound && input.memberActive ? "real" : "dummy";', ["politique"])
cible("P-12. ⛔ un membre DÉSACTIVÉ paie le vrai hachage", POLITIQUE,
      '  return input.memberFound && input.memberActive && input.reserved ? "real" : "dummy";', '  return input.memberFound && input.reserved ? "real" : "dummy";', ["politique"])
cible("P-13. ⛔ MP-3 — l'appareil d'un AUTRE membre est réutilisé", POLITIQUE,
      "d.memberId === memberId", 'd.id === d.id', ["politique"])
cible("P-14. ⛔ MP-3 — l'appareil d'une AUTRE salle est réutilisé", POLITIQUE,
      "d.proProfileId === proProfileId", 'd.id === d.id', ["politique"])
cible("P-15. ⛔ un appareil RÉVOQUÉ est réutilisé", POLITIQUE,
      "!d.revoked", 'd.id === d.id', ["politique"])
cible("P-16. ⛔ un appareil EXPIRÉ est réutilisé", POLITIQUE,
      "!d.expired", 'd.id === d.id', ["politique"])

# ── W — la POLITIQUE DE MOT DE PASSE (`staff-password-policy.ts`).
cible("W-1. ⛔ R-5 — la liste n'est plus mise en minuscules (un mot courant en majuscules passe)", MDP,
      "new Set(STAFF_COMMON_PASSWORDS.map((p) => p.toLowerCase()))", "new Set(STAFF_COMMON_PASSWORDS)", ["mdp"])
cible("W-2. ⛔ R-5 — le mot de passe saisi n'est plus mis en minuscules avant la comparaison", MDP,
      "  return list.has(plain.toLowerCase());", "  return list.has(plain);", ["mdp"])
cible("W-3. ⛔ un mot de passe courant n'est plus refusé", MDP,
      '  if (input.common) return "common";', '  if (false) return "common";', ["mdp"])
cible("W-4. ⛔ la réutilisation du mot de passe actuel n'est plus refusée", MDP,
      '  if (input.sameAsCurrent) return "reused";', '  if (false) return "reused";', ["mdp"])

# ── K — les COOKIES (`staff-cookies.ts`).
cible("K-1. ⛔ le cookie de session prend le NOM du cookie de rafraîchissement (`zwadj_rt`)", COOKIES,
      'export const STAFF_SESSION_COOKIE = "zwadj_ss";', 'export const STAFF_SESSION_COOKIE = "zwadj_rt";', ["cookies", "int-activation"])
cible("K-2. ⛔ S-99 — le cookie de session n'est plus `SameSite=Strict`", COOKIES,
      '  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_SESSION_COOKIE_PATH };', '  return { httpOnly: true, sameSite: "lax", secure, path: STAFF_SESSION_COOKIE_PATH };', ["cookies", "int-activation"])
cible("K-3. ⛔ S-99 — le cookie de session n'est plus `HttpOnly`", COOKIES,
      '  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_SESSION_COOKIE_PATH };', '  return { httpOnly: false, sameSite: "strict", secure, path: STAFF_SESSION_COOKIE_PATH };', ["cookies", "int-activation"])
cible("K-4. ⛔ le cookie de session prend le CHEMIN des cookies d'appareil", COOKIES,
      '  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_SESSION_COOKIE_PATH };', '  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_DEVICE_COOKIE_PATH };', ["cookies", "int-activation"])
cible("K-5. ⛔ le cookie de session reçoit une échéance côté navigateur (sa durée de vie n'est plus côté serveur seul)", COOKIES,
      '  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_SESSION_COOKIE_PATH };', '  return { httpOnly: true, sameSite: "strict", secure, path: STAFF_SESSION_COOKIE_PATH, maxAge: STAFF_LIMITS.PIN_VALIDITY_DAYS * MS_PAR_JOUR };', ["cookies", "int-activation"])
cible("K-6. ⛔ S-99 — le cookie d'appareil n'est plus `SameSite=Strict`", COOKIES,
      'sameSite: "strict", secure, path: STAFF_DEVICE_COOKIE_PATH,', 'sameSite: "lax", secure, path: STAFF_DEVICE_COOKIE_PATH,', ["cookies", "int-activation"])
cible("K-7. ⛔ R-6 — l'échéance du cookie d'appareil est comptée en secondes au lieu de millisecondes", COOKIES,
      "maxAge: STAFF_LIMITS.PIN_VALIDITY_DAYS * MS_PAR_JOUR }", "maxAge: STAFF_LIMITS.PIN_VALIDITY_DAYS * 1000 }", ["cookies", "int-activation"])
cible("K-8. ⛔ le cookie d'appareil prend le chemin du cookie de session", COOKIES,
      "path: STAFF_DEVICE_COOKIE_PATH, maxAge", "path: STAFF_SESSION_COOKIE_PATH, maxAge", ["cookies", "int-activation"])
cible("K-9. ⛔ un nom de cookie d'appareil se construit avec n'importe quel suffixe", COOKIES,
      '  if (!SUFFIXE.test(suffixe)) throw new Error("suffixe de cookie d\'appareil invalide");', '  if (false) throw new Error("suffixe de cookie d\'appareil invalide");', ["cookies"])
cible("K-10. ⛔ un cookie de session qui n'a pas la forme d'un jeton part en requête SQL", COOKIES,
      '  return typeof valeur === "string" && JETON.test(valeur) ? valeur : undefined;', '  return typeof valeur === "string" ? valeur : undefined;', ["cookies", "int-garde"])
cible("K-11. ⛔ MP-28 — la borne de huit cookies d'appareil n'est plus tenue", COOKIES,
      "    if (lus.length >= STAFF_LIMITS.DEVICE_COOKIES_MAX) break;", "    if (false) break;", ["cookies"])
cible("K-12. ⛔ tout cookie est lu comme un cookie d'appareil (le préfixe n'est plus exigé)", COOKIES,
      "    if (!name.startsWith(STAFF_DEVICE_COOKIE_PREFIX)) continue;", "    if (false) continue;", ["cookies"])
cible("K-13. ⛔ le suffixe d'un cookie d'appareil n'est plus contrôlé", COOKIES,
      "    if (!SUFFIXE.test(name.slice(STAFF_DEVICE_COOKIE_PREFIX.length))) continue;", "    if (false) continue;", ["cookies"])
cible("K-14. ⛔ la valeur d'un cookie d'appareil n'a plus à ressembler à un jeton", COOKIES,
      '    if (typeof value !== "string" || !JETON.test(value)) continue;', '    if (typeof value !== "string") continue;', ["cookies"])
cible("K-15. ⛔ la forme d'un jeton n'est plus de 43 caractères", COOKIES,
      "const JETON = /^[A-Za-z0-9_-]{43}$/;", "const JETON = /^[A-Za-z0-9_-]{1,}$/;", ["cookies"])
cible("K-16. ⛔ le suffixe d'un nom de cookie n'est plus de 8 caractères", COOKIES,
      "const SUFFIXE = /^[A-Za-z0-9_-]{8}$/;", "const SUFFIXE = /^[A-Za-z0-9_-]{1,}$/;", ["cookies"])
cible("K-17. ⛔ le préfixe des cookies d'appareil change (la lecture ne retrouve plus ce que la pose a écrit)", COOKIES,
      'export const STAFF_DEVICE_COOKIE_PREFIX = "zwadj_dv_";', 'export const STAFF_DEVICE_COOKIE_PREFIX = "zwadj_dd_";', ["cookies", "int-activation"])

# ── S — le SERVICE (`StaffSessionService`).
cible("S-1. ⛔ MP-24 — l'activation accepte un mot de passe COURANT", SERVICE,
      "    const violation = passwordViolation({ common: isCommonPassword(input.password), sameAsCurrent: false });", "    const violation = passwordViolation({ common: false, sameAsCurrent: false });", ["service"])
cible("S-2. ⛔ MP-9 — la clé du nom n'est plus normalisée à l'activation (« AMINE » et « amine » feraient deux comptes)", SERVICE,
      "      accountNameKey: normalizeStaffAccountName(input.accountName),", "      accountNameKey: input.accountName,", ["service"])
cible("S-3. ⛔ MP-9 — la connexion cherche le membre par le nom TEL QUE TAPÉ", SERVICE,
      "this.store.findMember(layer.proProfileId, normalizeStaffAccountName(input.accountName))", "this.store.findMember(layer.proProfileId, input.accountName)", ["service"])
cible("S-4. ⛔ MP-4 — une tentative est RÉSERVÉE pour un membre désactivé (on compte des échecs sur un compte éteint)", SERVICE,
      "member !== null && memberActive ? await this.store.reservePasswordAttempt(member.id)", "member !== null ? await this.store.reservePasswordAttempt(member.id)", ["service"])
cible("S-5. ⛔ MP-8 — un compte inconnu ne paie plus le hachage FACTICE (oracle de durée)", SERVICE,
      "      await this.passwords.verifyAgainstDummy(input.password);", "      /* factice retiré */", ["service"])
cible("S-6. ⛔ MP-8 — le mot de passe est vérifié contre une autre valeur que celle saisie", SERVICE,
      "this.passwords.verify(reservation.passwordHash, input.password);", 'this.passwords.verify(reservation.passwordHash, input.password + "!");', ["service"])
cible("S-7. ⛔ le seuil de la pause n'est plus transmis à la ligne d'audit", SERVICE,
      'pausedNow: reservation.pausedNow, action: "staff.login_failed" });', 'pausedNow: false, action: "staff.login_failed" });', ["service"])
cible("S-8. ⛔ l'échec de connexion est consigné sous l'action du changement de mot de passe", SERVICE,
      'pausedNow: reservation.pausedNow, action: "staff.login_failed" });', 'pausedNow: reservation.pausedNow, action: "staff.password_change_failed" });', ["service"])
cible("S-9. ⛔ MP-3 — les cookies d'appareil partent au magasin EN CLAIR", SERVICE,
      "      candidateDeviceHashes: cookies.devices.map((d) => this.tokens.hash(d.value)),", "      candidateDeviceHashes: cookies.devices.map((d) => d.value),", ["service"])
cible("S-10. ⛔ une désactivation entre la réservation et l'ouverture ouvre quand même la session", SERVICE,
      "    if (!opened.ok) throw identifiantsRefuses();", "    if (false) throw identifiantsRefuses();", ["service"])
cible("S-11. ⛔ MP-3 — un appareil réutilisé reçoit quand même un cookie d'appareil neuf", SERVICE,
      "opened.deviceReused ? undefined : { suffix, token: deviceToken }", "opened.deviceReused ? { suffix, token: deviceToken } : { suffix, token: deviceToken }", ["service", "int-connexion"])
cible("S-12. ⛔ K-16 — la déconnexion ne demande plus l'effacement du cookie de session", SERVICE,
      '    return { body: { status: "ok" }, cookies: { session: null } };', '    return { body: { status: "ok" }, cookies: {} };', ["service", "int-connexion"])
cible("S-13. ⛔ K-16 — la déconnexion termine la session désignée par l'identifiant du MEMBRE", SERVICE,
      "{ actor: user, sessionId: staff.sessionId, memberId: staff.memberId }", "{ actor: user, sessionId: staff.memberId, memberId: staff.memberId }", ["service"])
cible("S-14. ⛔ K-17 — la couche éteinte est annoncée allumée dès qu'un profil existe", SERVICE,
      "    if (layer === null || layer.enabledAt === null) return { enabled: false, member: null, knownMembers: [] };", "    if (layer === null) return { enabled: false, member: null, knownMembers: [] };", ["service"])
cible("S-15. ⛔ K-17 — l'état PROLONGE la session (il passe par `touchSession`)", SERVICE,
      "const peek = await this.store.peekSession(", "const peek = await this.store.touchSession(", ["service"])
cible("S-16. ⛔ K-17 — les cookies d'appareil de l'état partent EN CLAIR", SERVICE,
      "deviceTokenHashes: cookies.devices.map((d) => this.tokens.hash(d.value)) });", "deviceTokenHashes: cookies.devices.map((d) => d.value) });", ["service"])
cible("S-17. ⛔ MP-24 — le nouveau mot de passe COURANT n'est plus refusé avant la réservation", SERVICE,
      "    const common = passwordViolation({ common: isCommonPassword(input.newPassword), sameAsCurrent: false });", "    const common = passwordViolation({ common: false, sameAsCurrent: false });", ["service"])
cible("S-18. ⛔ S-102 — le changement réserve la tentative d'un AUTRE identifiant (le compteur n'est plus partagé avec la connexion)", SERVICE,
      "    const reservation = await this.store.reservePasswordAttempt(staff.memberId);", "    const reservation = await this.store.reservePasswordAttempt(staff.sessionId);", ["service"])
cible("S-19. ⛔ pendant la pause, le changement de mot de passe ne paie plus le factice", SERVICE,
      "      await this.passwords.verifyAgainstDummy(input.currentPassword);", "      /* factice retiré */", ["service"])
cible("S-20. ⛔ l'échec d'un changement est consigné sous l'action de la connexion", SERVICE,
      'action: "staff.password_change_failed" });', 'action: "staff.login_failed" });', ["service"])
cible("S-21. ⛔ MP-24 — la réutilisation du mot de passe actuel n'est plus détectée", SERVICE,
      "    const sameAsCurrent = await this.passwords.verify(reservation.passwordHash, input.newPassword);", "    const sameAsCurrent = false;", ["service", "int-mdp"])
cible("S-22. ⛔ le bon mot de passe actuel, refusé pour réutilisation, laisse le compteur monté", SERVICE,
      "      await this.store.resetPasswordAttempts(staff.memberId);", "      /* compteur laissé */", ["service", "int-mdp"])
cible("S-23. ⛔ MP-5 — le changement désigne la session d'un autre identifiant comme « courante » (la courante serait terminée)", SERVICE,
      "      currentSessionId: staff.sessionId,", "      currentSessionId: staff.memberId,", ["service", "int-mdp"])
cible("S-24. ⛔ le remplacement n'est plus conditionné au hachage LU", SERVICE,
      "      expectedPasswordHash: reservation.passwordHash,", "      expectedPasswordHash: newPasswordHash,", ["service", "int-mdp"])
cible("S-25. ⛔ un remplacement concurrent perdu n'est plus refusé (le service répond comme s'il avait réussi)", SERVICE,
      "    if (!changed.ok) throw motDePasseActuelRefuse();", "    if (false) throw motDePasseActuelRefuse();", ["service"])
cible("S-26. ⛔ R-3 — l'identifiant refusé porte le code du mot de passe ACTUEL faux", SERVICE,
      "new UnauthorizedException(erreurDe(StaffErrorCode.STAFF_INVALID_CREDENTIALS));", "new UnauthorizedException(erreurDe(StaffErrorCode.STAFF_CURRENT_PASSWORD_INVALID));", ["service", "int-connexion"])
cible("S-27. ⛔ le mot de passe actuel faux porte le code des identifiants refusés", SERVICE,
      "new BadRequestException(erreurDe(StaffErrorCode.STAFF_CURRENT_PASSWORD_INVALID));", "new BadRequestException(erreurDe(StaffErrorCode.STAFF_INVALID_CREDENTIALS));", ["service", "int-mdp"])
cible("S-28. ⛔ « courant » et « réutilisé » échangent leurs codes", SERVICE,
      'v === "common" ? StaffErrorCode.STAFF_PASSWORD_COMMON : StaffErrorCode.STAFF_PASSWORD_REUSED', 'v === "common" ? StaffErrorCode.STAFF_PASSWORD_REUSED : StaffErrorCode.STAFF_PASSWORD_COMMON', ["service"])
cible("S-29. ⛔ « déjà activée » répond 400 au lieu de 409", SERVICE,
      "      return new ConflictException(erreurDe(StaffErrorCode.STAFF_ALREADY_ACTIVATED));", "      return new BadRequestException(erreurDe(StaffErrorCode.STAFF_ALREADY_ACTIVATED));", ["service"])
cible("S-30. ⛔ MP-23 — « e-mail non vérifié » répond 409 au lieu de 403", SERVICE,
      "      return new ForbiddenException(erreurDe(StaffErrorCode.STAFF_EMAIL_NOT_VERIFIED));", "      return new ConflictException(erreurDe(StaffErrorCode.STAFF_EMAIL_NOT_VERIFIED));", ["service"])
cible("S-31. ⛔ « nom déjà pris » répond 400 au lieu de 409", SERVICE,
      "      return new ConflictException(erreurDe(StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN));", "      return new BadRequestException(erreurDe(StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN));", ["service"])
cible("S-32. ⛔ un PRO sans profil reçoit un 409 au lieu de la réponse « interdit » de l'API", SERVICE,
      '      return new ForbiddenException({ code: AuthErrorCode.FORBIDDEN, message: "auth.errors.forbidden" });', '      return new ConflictException({ code: AuthErrorCode.FORBIDDEN, message: "auth.errors.forbidden" });', ["service"])

# ── A — le MAGASIN (`PrismaStaffStore`).
_SOUS_IDLE = "AND s.last_activity_at > now() - make_interval(mins => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)\n      RETURNING"
cible("A-1. ⛔ `readLayer` cherche le profil par son identifiant au lieu de celui du compte", MAGASIN,
      "where: { userId }, select: { id: true, staffLayerEnabledAt: true }", "where: { id: userId }, select: { id: true, staffLayerEnabledAt: true }", ["magasin"])
cible("A-2. ⛔ MP-7 — `readLayer` rend toujours « couche éteinte »", MAGASIN,
      "enabledAt: profil.staffLayerEnabledAt", "enabledAt: null", ["magasin"])
cible("A-3. ⛔ MP-23 — l'activation ne refuse plus un e-mail non vérifié", MAGASIN,
      '        if (profil.user.emailVerifiedAt === null) return { ok: false, reason: "emailNotVerified" };', '        if (false) return { ok: false, reason: "emailNotVerified" };', ["magasin", "int-activation"])
cible("A-4. ⛔ MP-22 — le compte du drapeau n'est plus exigé (dix activations feraient dix Managers)", MAGASIN,
      '        if (pose !== 1) return { ok: false, reason: "alreadyActivated" };', '        if (false) return { ok: false, reason: "alreadyActivated" };', ["magasin", "int-activation"])
cible("A-5. ⛔ MP-22 — le drapeau se repose sans condition (le check-and-set perd son prédicat)", MAGASIN,
      "AND staff_layer_enabled_at IS NULL", "AND (staff_layer_enabled_at IS NULL OR staff_layer_enabled_at IS NOT NULL)", ["magasin", "int-activation"])
cible("A-6. ⛔ l'insertion du Manager ne tolère plus un nom déjà pris (le conflit remonte en erreur de base)", MAGASIN,
      "          ON CONFLICT (pro_profile_id, account_name_key) DO NOTHING", "          -- sans clause de conflit", ["magasin", "int-activation"])
cible("A-7. ⛔ MP-40 — un nom déjà pris n'ANNULE plus la transaction (le drapeau resterait posé sans Manager)", MAGASIN,
      '        if (membre === undefined) throw new ActivationAbandonnee("accountNameTaken");', '        if (membre === undefined) return { ok: false, reason: "accountNameTaken" };', ["magasin", "int-activation"])
cible("A-8. ⛔ l'annulation interne de l'activation n'est plus traduite en refus métier", MAGASIN,
      '      if (e instanceof ActivationAbandonnee) return { ok: false, reason: e.reason };', '      if (false) return { ok: false, reason: e.reason };', ["int-activation"])
cible("A-9. ⛔ l'activation crée un EMPLOYÉ au lieu d'un Manager", MAGASIN,
      "${input.accountNameKey}, 'MANAGER'::\"StaffRole\"", "${input.accountNameKey}, 'EMPLOYEE'::\"StaffRole\"", ["magasin", "int-activation"])
cible("A-10. ⛔ MP-40 — l'audit de l'activation s'écrit HORS de la transaction", MAGASIN,
      '        await ecrireAudit(tx, input.actor, membre.id, { action: "staff.activate"', '        await ecrireAudit(this.prisma, input.actor, membre.id, { action: "staff.activate"', ["magasin", "int-activation"])
cible("A-11. ⛔ MP-43 — l'échéance de l'appareil de l'activation n'est plus la durée du PIN", MAGASIN,
      "${input.deviceTokenHash}, ${input.deviceLabel}, now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int)", "${input.deviceTokenHash}, ${input.deviceLabel}, now() + make_interval(days => ${STAFF_LIMITS.PASSWORD_PAUSE_MINUTES}::int)", ["magasin", "int-activation"])
cible("A-12. ⛔ MP-43 — le plafond de la session de l'activation n'est plus le plafond du levier", MAGASIN,
      "${appareils[0]!.id}::uuid, ${input.sessionTokenHash}, now() + make_interval(hours => ${STAFF_LIMITS.SESSION_MAX_HOURS}::int)", "${appareils[0]!.id}::uuid, ${input.sessionTokenHash}, now() + make_interval(hours => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)", ["magasin", "int-activation"])
cible("A-13. ⛔ MP-43 — l'échéance du mot de passe de l'activation n'est plus celle du levier", MAGASIN,
      "make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int))", "make_interval(days => ${STAFF_LIMITS.PASSWORD_PAUSE_MINUTES}::int))", ["magasin", "int-activation"])
cible("A-14. ⛔ MP-18 — `findMember` cherche le nom dans TOUTES les salles", MAGASIN,
      "      where: { proProfileId, accountNameKey },", "      where: { accountNameKey },", ["magasin", "int-connexion"])
cible("A-15. ⛔ MP-16 — la ligne du membre n'est plus VERROUILLÉE par la réservation (`FOR UPDATE`)", MAGASIN,
      "password_locked_until <= now())\n           FOR UPDATE", "password_locked_until <= now())\n           -- sans verrou", ["magasin"])
cible("A-16. ⛔ MP-4 — la réservation compte aussi sur un membre DÉSACTIVÉ", MAGASIN,
      "AND status = 'ACTIVE'\n           AND (password_locked_until IS NULL OR", "AND status IN ('ACTIVE', 'DISABLED')\n           AND (password_locked_until IS NULL OR", ["magasin", "int-connexion"])
cible("A-17. ⛔ MP-16 — la pause devient DÉFINITIVE (une pause échue refuse toujours)", MAGASIN,
      "AND (password_locked_until IS NULL OR password_locked_until <= now())", "AND (password_locked_until IS NULL)", ["magasin", "int-connexion"])
cible("A-18. ⛔ MP-16 — le compteur ne REPART plus de zéro après une pause", MAGASIN,
      "CASE WHEN password_locked_until IS NOT NULL AND password_locked_until <= now() THEN 0 ELSE password_failed_count END AS base", "password_failed_count AS base", ["magasin", "int-connexion"])
cible("A-19. ⛔ le seuil de la pause est dépassé d'une tentative (6 au lieu de 5)", MAGASIN,
      "cur.base + 1 >= ${STAFF_LIMITS.PASSWORD_MAX_FAILURES}::int", "cur.base + 1 > ${STAFF_LIMITS.PASSWORD_MAX_FAILURES}::int", ["magasin", "int-connexion"])
cible("A-20. ⛔ MP-43 — la durée de la pause n'est plus celle du levier", MAGASIN,
      "mins => ${STAFF_LIMITS.PASSWORD_PAUSE_MINUTES}::int) ELSE NULL END", "mins => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int) ELSE NULL END", ["magasin", "int-connexion"])
cible("A-21. ⛔ la réservation ne dit plus si CETTE tentative a déclenché la pause", MAGASIN,
      '(m.password_locked_until IS NOT NULL) AS "pausedNow"', 'false AS "pausedNow"', ["magasin", "int-connexion"])
cible("A-22. ⛔ la réservation n'INCRÉMENTE plus le compteur", MAGASIN,
      "SET password_failed_count = cur.base + 1,", "SET password_failed_count = cur.base,", ["magasin", "int-connexion"])
cible("A-23. ⛔ le compte d'échecs rendu n'est plus celui de la ligne mise à jour", MAGASIN,
      "failedCount: ligne.failedCount, pausedNow: ligne.pausedNow }", "failedCount: 0, pausedNow: ligne.pausedNow }", ["magasin"])
cible("A-24. ⛔ la ligne de PAUSE n'est jamais écrite", MAGASIN,
      "      if (input.pausedNow) {", "      if (false) {", ["magasin", "int-connexion"])
cible("A-25. ⛔ la ligne de pause change de nom d'action", MAGASIN,
      'action: "staff.password_pause",', 'action: "staff.password_failed",', ["magasin", "int-connexion"])
cible("A-26. ⛔ MP-33 — la ligne d'échec porte un champ de plus que le compte d'échecs", MAGASIN,
      "after: { failedCount: input.failedCount } });", "after: { failedCount: input.failedCount, memberId: input.memberId } });", ["magasin"])
cible("A-27. ⛔ la remise à zéro de la pause ne lève plus la pause (seul le compteur retombe)", MAGASIN,
      "UPDATE pro_staff_members SET password_failed_count = 0, password_locked_until = NULL, updated_at = now()", "UPDATE pro_staff_members SET password_failed_count = 0, updated_at = now()", ["magasin"])
cible("A-28. ⛔ une connexion réussie ne remet plus les compteurs à zéro", MAGASIN,
      "SET last_login_at = now(), password_failed_count = 0, password_locked_until = NULL, updated_at = now()", "SET last_login_at = now(), updated_at = now()", ["magasin", "int-connexion"])
cible("A-29. ⛔ D305 — le CAS de la connexion n'exige plus un membre ACTIF", MAGASIN,
      "AND pro_profile_id = ${input.proProfileId}::uuid AND status = 'ACTIVE'", "AND pro_profile_id = ${input.proProfileId}::uuid AND status IN ('ACTIVE', 'DISABLED')", ["magasin", "int-connexion"])
cible("A-30. ⛔ MP-18 — le CAS de la connexion n'exige plus la salle du Bearer", MAGASIN,
      "WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid AND status", "WHERE id = ${input.memberId}::uuid AND pro_profile_id IS NOT NULL AND status", ["magasin"])
cible("A-31. ⛔ D305 — un CAS refusé (compte 0) n'arrête plus la connexion", MAGASIN,
      '      if (membre === undefined) return { ok: false, reason: "memberInactive" };', '      if (false) return { ok: false, reason: "memberInactive" };', ["magasin"])
cible("A-32. ⛔ MP-3 — n'importe quel appareil présenté est réutilisé (la politique n'est plus consultée)", MAGASIN,
      "      const reutilisable = pickReusableDevice(candidats, membre.id, input.proProfileId);", "      const reutilisable = candidats[0] ?? null;", ["magasin", "int-connexion"])
cible("A-33. ⛔ un appareil réutilisé n'est plus marqué utilisé", MAGASIN,
      "SET last_used_at = now() WHERE id = ${reutilisable.id}::uuid", "SET last_used_at = NULL WHERE id = ${reutilisable.id}::uuid", ["magasin", "int-connexion"])
cible("A-34. ⛔ la ligne d'audit de la connexion ne dit plus si l'appareil était reconnu", MAGASIN,
      "after: { memberId: membre.id, deviceReused } }", "after: { memberId: membre.id } }", ["magasin", "int-connexion"])
cible("A-35. ⛔ MP-43 — l'échéance de l'appareil neuf de la connexion n'est plus la durée du PIN", MAGASIN,
      "${input.newDeviceTokenHash}, ${input.deviceLabel}, now() + make_interval(days => ${STAFF_LIMITS.PIN_VALIDITY_DAYS}::int)", "${input.newDeviceTokenHash}, ${input.deviceLabel}, now() + make_interval(days => ${STAFF_LIMITS.PASSWORD_PAUSE_MINUTES}::int)", ["magasin"])
cible("A-36. ⛔ MP-43 — le plafond de la session de la connexion n'est plus celui du levier", MAGASIN,
      "${appareilId}::uuid, ${input.sessionTokenHash}, now() + make_interval(hours => ${STAFF_LIMITS.SESSION_MAX_HOURS}::int)", "${appareilId}::uuid, ${input.sessionTokenHash}, now() + make_interval(hours => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)", ["magasin"])
cible("A-37. ⛔ MP-13 — la session ne GLISSE plus (l'activité n'est pas rafraîchie par la requête)", MAGASIN,
      "UPDATE pro_staff_sessions s SET last_activity_at = now()", "UPDATE pro_staff_sessions s SET last_activity_at = s.last_activity_at", ["magasin", "int-connexion"])
cible("A-38. ⛔ MP-18 — la requête du garde n'exige plus la salle du Bearer", MAGASIN,
      "AND m.id = s.member_id\n         AND m.pro_profile_id = ${input.proProfileId}::uuid", "AND m.id = s.member_id\n         AND m.pro_profile_id IS NOT NULL", ["magasin", "int-garde"])
cible("A-39. ⛔ MP-4 — la requête du garde n'exige plus un membre ACTIF", MAGASIN,
      "AND m.status = 'ACTIVE'\n         AND s.ended_at IS NULL\n         AND s.expires_at > now()\n         " + _SOUS_IDLE, "AND true\n         AND s.ended_at IS NULL\n         AND s.expires_at > now()\n         " + _SOUS_IDLE, ["magasin", "int-connexion"])
cible("A-40. ⛔ MP-19 — la requête du garde accepte une session TERMINÉE", MAGASIN,
      "AND s.ended_at IS NULL\n         AND s.expires_at > now()\n         " + _SOUS_IDLE, "AND true\n         AND s.expires_at > now()\n         " + _SOUS_IDLE, ["magasin", "int-garde"])
cible("A-41. ⛔ MP-13 — la requête du garde ignore le PLAFOND absolu", MAGASIN,
      "AND s.expires_at > now()\n         " + _SOUS_IDLE, "AND true\n         " + _SOUS_IDLE, ["magasin", "int-connexion"])
cible("A-42. ⛔ MP-13 — la requête du garde ignore l'INACTIVITÉ", MAGASIN,
      _SOUS_IDLE, "AND true\n      RETURNING", ["magasin", "int-connexion"])
cible("A-43. ⛔ MP-18 — la sonde dit toujours « même salle » (on terminerait la session d'une autre salle)", MAGASIN,
      '(m.pro_profile_id = ${input.proProfileId}::uuid) AS "sameVenue"', 'true AS "sameVenue"', ["magasin", "int-garde"])
cible("A-44. ⛔ MP-4 — la sonde dit toujours « membre actif » (la fin DISABLED ne s'écrit plus)", MAGASIN,
      "(m.status = 'ACTIVE') AS \"memberActive\"", 'true AS "memberActive"', ["magasin", "int-connexion"])
cible("A-45. ⛔ MP-13 — la sonde dit toujours « pas inactive » (la fin IDLE ne s'écrit plus)", MAGASIN,
      '::int)) AS "idle"', '::int)) AND false AS "idle"', ["magasin", "int-connexion"])
cible("A-46. ⛔ MP-13 — la fin d'une session refusée n'est jamais écrite", MAGASIN,
      "    if (fin !== null) {", "    if (false) {", ["magasin", "int-connexion"])
cible("A-47. ⛔ jamais deux fins — l'écriture de la fin n'est plus conditionnée à `ended_at IS NULL`", MAGASIN,
      "WHERE id = ${ligne.sessionId}::uuid AND ended_at IS NULL", "WHERE id = ${ligne.sessionId}::uuid AND (ended_at IS NULL OR ended_at IS NOT NULL)", ["magasin"])
cible("A-48. ⛔ K-17 — l'état ÉCRIT (la lecture prolonge la session)", MAGASIN,
      "    return vivante === undefined ? { ok: false } : { ok: true, session: vivante };",
      "    await this.prisma.$executeRaw`UPDATE pro_staff_sessions SET last_activity_at = now() WHERE token_hash = ${input.tokenHash}`;\n    return vivante === undefined ? { ok: false } : { ok: true, session: vivante };",
      ["magasin", "int-connexion"], genre="insertion")
cible("A-49. ⛔ K-17 — l'état ignore l'inactivité (une session inactive est rendue comme vivante)", MAGASIN,
      "AND s.last_activity_at > now() - make_interval(mins => ${STAFF_LIMITS.IDLE_TIMEOUT_MINUTES}::int)`;", "AND true`;", ["magasin"])
cible("A-50. ⛔ K-16 — la fin LOGOUT n'est plus conditionnée à `ended_at IS NULL`", MAGASIN,
      "end_reason = 'LOGOUT' WHERE id = ${input.sessionId}::uuid AND ended_at IS NULL", "end_reason = 'LOGOUT' WHERE id = ${input.sessionId}::uuid AND (ended_at IS NULL OR ended_at IS NOT NULL)", ["magasin"])
cible("A-51. ⛔ K-16 — l'audit de la déconnexion s'écrit même si la session n'a pas été terminée", MAGASIN,
      "      if (fermees === 1) {", "      if (true) {", ["magasin"])
cible("A-52. ⛔ K-16 — l'audit de la déconnexion désigne le membre à la place de la session", MAGASIN,
      'entityType: "staff_session", entityId: input.sessionId, after: { memberId: input.memberId } }', 'entityType: "staff_session", entityId: input.memberId, after: { memberId: input.memberId } }', ["magasin", "int-connexion"])
cible("A-53. ⛔ K-18 — le remplacement du mot de passe n'est plus conditionné au hachage LU", MAGASIN,
      "password_hash = ${input.expectedPasswordHash}", "password_hash IS NOT NULL", ["magasin", "int-mdp"])
cible("A-54. ⛔ K-18 — le membre n'est plus VERROUILLÉ avant le remplacement", MAGASIN,
      "AND status = 'ACTIVE' FOR UPDATE`;", "AND status = 'ACTIVE' FOR SHARE`;", ["magasin"])
cible("A-55. ⛔ MP-5 — les autres sessions prennent la fin « déconnexion » au lieu de « mot de passe changé »", MAGASIN,
      "end_reason = 'PASSWORD_CHANGED'", "end_reason = 'LOGOUT'", ["magasin", "int-mdp"])
cible("A-56. ⛔ MP-5 — le changement termine la session COURANTE et laisse les autres", MAGASIN,
      "AND id <> ${input.currentSessionId}::uuid", "AND id = ${input.currentSessionId}::uuid", ["magasin", "int-mdp"])
cible("A-57. ⛔ K-18 — le changement laisse `must_change_password` levé", MAGASIN,
      "must_change_password = false, password_failed_count = 0, password_locked_until = NULL, updated_at = now()", "must_change_password = true, password_failed_count = 0, password_locked_until = NULL, updated_at = now()", ["magasin", "int-mdp"])
cible("A-58. ⛔ MP-43 — l'échéance du nouveau mot de passe n'est plus celle du levier", MAGASIN,
      "make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int),", "make_interval(days => ${STAFF_LIMITS.PASSWORD_PAUSE_MINUTES}::int),", ["magasin", "int-mdp"])
cible("A-59. ⛔ MP-33 — la ligne d'audit du changement porte un champ de plus", MAGASIN,
      "after: { otherSessionsEnded: autres } }", "after: { otherSessionsEnded: autres, memberId: input.memberId } }", ["magasin"])
cible("A-60. ⛔ K-18 — un membre introuvable ou éteint ne refuse plus le changement", MAGASIN,
      '      if (verrou.length !== 1) return { ok: false, reason: "changedConcurrently" };', '      if (false) return { ok: false, reason: "changedConcurrently" };', ["magasin"])
cible("A-61. ⛔ K-18 — un remplacement sans ligne (le hachage a changé) n'est plus refusé", MAGASIN,
      '      if (membre === undefined) return { ok: false, reason: "changedConcurrently" };', '      if (false) return { ok: false, reason: "changedConcurrently" };', ["magasin", "int-mdp"])
cible("A-62. ⛔ K-17 — sans cookie d'appareil, la base est interrogée quand même", MAGASIN,
      "    if (input.deviceTokenHashes.length === 0) return [];", "    if (false) return [];", ["magasin"])
cible("A-63. ⛔ MP-3 — un appareil RÉVOQUÉ reconnaît encore son membre", MAGASIN,
      "AND d.revoked_at IS NULL", "AND true", ["magasin", "int-connexion"])
cible("A-64. ⛔ MP-3 — un appareil EXPIRÉ reconnaît encore son membre", MAGASIN,
      "AND d.expires_at > now()", "AND true", ["magasin", "int-connexion"])
cible("A-65. ⛔ MP-3 — les membres reconnus viennent de TOUTES les salles", MAGASIN,
      "AND m.pro_profile_id = ${input.proProfileId}::uuid\n         AND m.status = 'ACTIVE'\n       ORDER BY", "AND m.pro_profile_id IS NOT NULL\n         AND m.status = 'ACTIVE'\n       ORDER BY", ["magasin", "int-connexion"])
cible("A-66. ⛔ MP-4 — un membre désactivé est encore « reconnu » sur ce poste", MAGASIN,
      "AND m.status = 'ACTIVE'\n       ORDER BY", "AND true\n       ORDER BY", ["magasin"])
cible("A-67. ⛔ MP-33 — la ligne d'audit n'a plus le membre pour acteur", MAGASIN,
      "      actorMemberId: memberId,", "      actorMemberId: null,", ["magasin", "int-activation"])
cible("A-68. ⛔ MP-33 — la ligne d'audit n'a plus le compte commun pour acteur", MAGASIN,
      "      actorId: acteur.userId,", "      actorId: null,", ["magasin", "int-activation"])
cible("A-69. ⛔ MP-33 — la ligne d'audit porte un champ de plus (`before`)", MAGASIN,
      "      after: entree.after", "      before: null,\n      after: entree.after", ["magasin"], genre="insertion")

# ── T — le CONTRAT (`packages/types/src/staff.ts`).
cible("T-1. ⛔ MP-43 — le levier de l'inactivité change de valeur (10 → 11 minutes)", TYPES,
      "  IDLE_TIMEOUT_MINUTES: 10,", "  IDLE_TIMEOUT_MINUTES: 11,", ["contrat"])
cible("T-2. ⛔ MP-43 — le plafond de session change de valeur (12 → 24 heures)", TYPES,
      "  SESSION_MAX_HOURS: 12,", "  SESSION_MAX_HOURS: 24,", ["contrat"])
cible("T-3. ⛔ MP-43 — la durée de la pause change de valeur (15 → 5 minutes)", TYPES,
      "  PASSWORD_PAUSE_MINUTES: 15,", "  PASSWORD_PAUSE_MINUTES: 5,", ["contrat"])
cible("T-4. ⛔ MP-43 — le seuil de la pause change de valeur (5 → 3 échecs)", TYPES,
      "  PASSWORD_MAX_FAILURES: 5,", "  PASSWORD_MAX_FAILURES: 3,", ["contrat"])
cible("T-5. ⛔ MP-28 — la borne des cookies d'appareil change de valeur (8 → 9)", TYPES,
      "  DEVICE_COOKIES_MAX: 8", "  DEVICE_COOKIES_MAX: 9", ["contrat"])
cible("T-6. ⛔ R-6 — le levier de la validité du PIN change de valeur (90 → 30 jours) : l'échéance des appareils suit", TYPES,
      "  PIN_VALIDITY_DAYS: 90,", "  PIN_VALIDITY_DAYS: 30,", ["contrat"])
cible("T-7. ⛔ le libellé constant d'un appareil change", TYPES,
      'export const STAFF_DEVICE_DEFAULT_LABEL = "Poste";', 'export const STAFF_DEVICE_DEFAULT_LABEL = "Mon poste";', ["contrat", "int-activation"])
cible("T-8. ⛔ MP-39 — la clé de message de « session requise » n'existe pas dans les catalogues", TYPES,
      '  STAFF_SESSION_REQUIRED: "staff.errors.sessionRequired",', '  STAFF_SESSION_REQUIRED: "staff.errors.sessionRequis",', ["contrat", "garde"])
cible("T-9. ⛔ MP-39 — la clé de message des identifiants refusés n'existe pas dans les catalogues", TYPES,
      '  STAFF_INVALID_CREDENTIALS: "staff.errors.invalidCredentials",', '  STAFF_INVALID_CREDENTIALS: "staff.errors.identifiantsRefuses",', ["contrat", "service"])
cible("T-10. ⛔ l'activation accepte une clé inconnue (un `role` saisi serait ignoré en silence)", TYPES,
      '  .object({ accountName: staffAccountNameSchema, password: passwordSchema })\n  .strict("staff.validation.unknownKey");', '  .object({ accountName: staffAccountNameSchema, password: passwordSchema })\n  .strip();', ["contrat", "int-activation"])
cible("T-11. ⛔ la connexion accepte une clé inconnue", TYPES,
      '      .max(128, "staff.validation.passwordRequired")\n  })\n  .strict("staff.validation.unknownKey");', '      .max(128, "staff.validation.passwordRequired")\n  })\n  .strip();', ["contrat"])
cible("T-12. ⛔ le changement de mot de passe accepte une clé inconnue (un `memberId` saisi serait ignoré en silence)", TYPES,
      '    newPassword: passwordSchema\n  })\n  .strict("staff.validation.unknownKey");', '    newPassword: passwordSchema\n  })\n  .strip();', ["contrat", "int-mdp"])
cible("T-13. ⛔ le nom de compte n'est plus rogné avant les bornes", TYPES,
      '"staff.validation.accountNameRequired" })\n  .trim()\n  .min(STAFF_ACCOUNT_NAME_MIN', '"staff.validation.accountNameRequired" })\n  .min(STAFF_ACCOUNT_NAME_MIN', ["contrat"])
cible("T-14. ⛔ D55 — la borne basse du nom de compte disparaît", TYPES,
      '.min(STAFF_ACCOUNT_NAME_MIN, "staff.validation.accountNameTooShort")', '.min(0, "staff.validation.accountNameTooShort")', ["contrat"])
cible("T-15. ⛔ D55 — la borne haute du nom de compte disparaît", TYPES,
      '.max(STAFF_ACCOUNT_NAME_MAX, "staff.validation.accountNameTooLong")', '.max(1000, "staff.validation.accountNameTooLong")', ["contrat"])
cible("T-16. ⛔ le nom de compte admet des chevrons (`<b>`)", TYPES,
      "/^[\\p{L}\\p{M}\\p{N} ._'-]*$/u", "/^[\\p{L}\\p{M}\\p{N} ._'<>-]*$/u", ["contrat", "int-activation"])
cible("T-17. ⛔ un nom qui se normalise en chaîne VIDE est accepté (la clé serait vide)", TYPES,
      '.refine((v) => v.length < STAFF_ACCOUNT_NAME_MIN || normalizeStaffAccountName(v) !== "", "staff.validation.accountNameInvalid");', '.refine(() => true, "staff.validation.accountNameInvalid");', ["contrat"])
cible("T-18. ⛔ la connexion révèle la politique (un mot de passe vide n'est plus refusé de la même façon)", TYPES,
      '.min(1, "staff.validation.passwordRequired")', '.min(0, "staff.validation.passwordRequired")', ["contrat"])
cible("T-19. ⛔ le nom de compte de la connexion perd sa borne haute", TYPES,
      '.max(100, "staff.validation.accountNameTooLong")', '.max(100000, "staff.validation.accountNameTooLong")', ["contrat"])

# ── N — la NORMALISATION du nom (`packages/types/src/staff-account-name.ts`).
cible("N-1. ⛔ R-4 — plus de NFKC (pleine chasse, ligatures, présentations arabes)", NOM,
      '  let s = raw.normalize("NFKC");', "  let s = raw;", ["nom"])
cible("N-2. ⛔ R-4 — les caractères invisibles deviennent des espaces au lieu de disparaître", NOM,
      '  s = s.replace(INVISIBLES, "");', '  s = s.replace(INVISIBLES, " ");', ["nom"])
cible("N-3. ⛔ la clé dépend de la casse (majuscules)", NOM,
      "  s = s.toLowerCase();", "  s = s.toUpperCase();", ["nom"])
cible("N-4. ⛔ les diacritiques latins ne sont plus retirés (« Âmine » ≠ « amine »)", NOM,
      '  s = s.normalize("NFD").replace(DIACRITIQUES_LATINS, "").normalize("NFC");', '  s = s.normalize("NFC");', ["nom", "int-connexion"])
cible("N-5. ⛔ les voyelles brèves et le tatweel arabes ne sont plus retirés", NOM,
      '  s = s.replace(VOYELLES_BREVES_ET_TATWEEL, "");', "  s = s;", ["nom"])
cible("N-6. ⛔ les lettres arabes ne sont plus ramenées l'une à l'autre", NOM,
      "  s = s.replace(LETTRES_ARABES_RAMENEES, (c) => LETTRE_RAMENEE[c] ?? c);", "  s = s;", ["nom"])
cible("N-7. ⛔ R-4 — les chiffres arabes-indiens et persans ne sont plus ramenés à 0–9", NOM,
      "  s = s.replace(CHIFFRES_NON_ASCII, chiffreAscii);", "  s = s;", ["nom"])
cible("N-8. ⛔ les blancs ne sont plus comprimés", NOM,
      '  return s.replace(/\\s+/gu, " ").trim();', "  return s.trim();", ["nom"])
cible("N-9. ⛔ les bords ne sont plus rognés", NOM,
      '  return s.replace(/\\s+/gu, " ").trim();', '  return s.replace(/\\s+/gu, " ");', ["nom"])
cible("N-10. ⛔ le ta marbouta (ة) n'est plus ramené au ha (ه)", NOM,
      '"ة": "ه",', '"ة": "ة",', ["nom"])
cible("N-11. ⛔ R-4 — le waw hamza (ؤ) n'est plus ramené au waw (و)", NOM,
      '"ؤ": "و",', '"ؤ": "ؤ",', ["nom"])
cible("N-12. ⛔ R-4 — le kaf persan (ک) n'est plus ramené au kaf arabe (ك)", NOM,
      '"ک": "ك",', '"ک": "ک",', ["nom"])
cible("N-13. ⛔ R-4 — les chiffres persans sont convertis comme des chiffres arabes-indiens (décalage)", NOM,
      "(point >= 0x06f0 ? point - 0x06f0 : point - 0x0660)", "(point >= 0x06f0 ? point - 0x0660 : point - 0x0660)", ["nom"])

# ── L — le CÂBLAGE (`app.module.ts`, le contrôleur, le débit, `/auth/me`).
cible("L-1. ⛔ S-98 — le garde du personnel passe AVANT `RolesGuard` (il lirait un rôle pas encore contrôlé)", MODULE_APP,
      "    { provide: APP_GUARD, useClass: RolesGuard },\n    { provide: APP_GUARD, useClass: StaffSessionGuard }", "    { provide: APP_GUARD, useClass: StaffSessionGuard },\n    { provide: APP_GUARD, useClass: RolesGuard }", ["sources"])
cible("L-2. ⛔ leçon R1 — le module du personnel n'est plus importé par l'application", MODULE_APP,
      "    StaffModule\n  ],", "    HealthModule\n  ],", ["sources", "int-activation"])
cible("L-3. ⛔ R-7 / SIG-1 — le `Set-Cookie` de réponse n'est plus masqué dans le journal", MODULE_APP,
      ", 'res.headers[\"set-cookie\"]']", ', "res.headers.etag"]', ["sources", "int-journal"])
cible("L-4. ⛔ MP-20 — l'état de session n'est plus exempté (l'écran de verrouillage ne pourrait plus le lire)", CONTROLEUR,
      '  @StaffExempt()\n  @Get("session")', '  @Roles(UserRole.PRO)\n  @Get("session")', ["sources", "int-connexion"])
cible("L-5. ⛔ MP-20 — l'activation n'est plus exemptée (on ne pourrait plus activer la couche)", CONTROLEUR,
      '  @StaffExempt()\n  @Post("activate")', '  @Roles(UserRole.PRO)\n  @Post("activate")', ["sources", "int-activation"])
cible("L-6. ⛔ MP-20 — la connexion n'est plus exemptée (on ne pourrait plus ouvrir de session)", CONTROLEUR,
      '  @StaffExempt()\n  @Post("login")', '  @Roles(UserRole.PRO)\n  @Post("login")', ["sources", "int-connexion"])
cible("L-7. ⛔ MP-20 — la déconnexion devient exemptée (la liste blanche s'allonge sans décision)", CONTROLEUR,
      '  @Post("logout")\n  @HttpCode(HttpStatus.OK)', '  @StaffExempt()\n  @Post("logout")\n  @HttpCode(HttpStatus.OK)', ["sources", "int-garde"], genre="insertion")
cible("L-8. ⛔ MP-34 — le contrôleur du personnel admet aussi un CLIENT", CONTROLEUR,
      '@Roles(UserRole.PRO)\n@Controller("pro/staff")', '@Roles(UserRole.PRO, UserRole.CLIENT)\n@Controller("pro/staff")', ["int-activation"])
cible("L-9. ⛔ les routes de membre n'exigent plus le contexte du garde (une couche éteinte les laisse tomber en erreur 500)", CONTROLEUR,
      "    if (staff === undefined) {", "    if (false) {", ["int-connexion"])
cible("L-10. ⛔ K-14 — l'activation répond 200 au lieu de 201", CONTROLEUR,
      "  @HttpCode(HttpStatus.CREATED)\n  @Throttle({ default: AUTH_THROTTLE.staffActivate })", "  @HttpCode(HttpStatus.OK)\n  @Throttle({ default: AUTH_THROTTLE.staffActivate })", ["int-activation"])
cible("L-11. ⛔ K-15 — la connexion répond 201 au lieu de 200", CONTROLEUR,
      "  @HttpCode(HttpStatus.OK)\n  @Throttle({ default: AUTH_THROTTLE.staffLogin })", "  @HttpCode(HttpStatus.CREATED)\n  @Throttle({ default: AUTH_THROTTLE.staffLogin })", ["int-connexion"])
cible("L-12. ⛔ MP-36 — l'activation emprunte la limite de la CONNEXION (10 au lieu de 5)", CONTROLEUR,
      "  @Throttle({ default: AUTH_THROTTLE.staffActivate })", "  @Throttle({ default: AUTH_THROTTLE.login })", ["int-debit"])
cible("L-13. ⛔ MP-36 — la connexion emprunte la limite de l'ACTIVATION (5 au lieu de 10)", CONTROLEUR,
      "  @Throttle({ default: AUTH_THROTTLE.staffLogin })", "  @Throttle({ default: AUTH_THROTTLE.staffActivate })", ["int-debit"])
cible("L-14. ⛔ MP-36 — la limite d'activation passe de 5 à 50", THROTTLE,
      'staffActivate: { limit: num("THROTTLE_STAFF_ACTIVATE_LIMIT", 5), ttl: TTL },', 'staffActivate: { limit: num("THROTTLE_STAFF_ACTIVATE_LIMIT", 50), ttl: TTL },', ["int-debit"])
cible("L-15. ⛔ MP-36 — la limite de connexion passe de 10 à 100", THROTTLE,
      'staffLogin: { limit: num("THROTTLE_STAFF_LOGIN_LIMIT", 10), ttl: TTL }', 'staffLogin: { limit: num("THROTTLE_STAFF_LOGIN_LIMIT", 100), ttl: TTL }', ["int-debit"])
cible("L-16. ⛔ D128 — la limite d'activation n'est plus pilotée par son levier de test (un second mécanisme, ou aucun)", THROTTLE,
      'limit: num("THROTTLE_STAFF_ACTIVATE_LIMIT", 5)', "limit: 5", ["int-activation"])
cible("L-17. ⛔ MP-20 — l'état du COMPTE COMMUN (`GET /auth/me`) n'est plus exempté", AUTH_CTRL,
      '  @StaffExempt()\n  @Get("me")', '  @ApiBearerAuth()\n  @Get("me")', ["sources", "int-garde"])
cible("L-18. ⛔ S-99 — l'activation pose le cookie de session avec les attributs de l'APPAREIL (échéance)", CONTROLEUR,
      "else if (cookies.session !== undefined) res.cookie(STAFF_SESSION_COOKIE, cookies.session, staffSessionCookieOptions(secure));", "else if (cookies.session !== undefined) res.cookie(STAFF_SESSION_COOKIE, cookies.session, staffDeviceCookieOptions(secure));", ["int-activation"])
cible("L-19. ⛔ K-16 — la déconnexion n'efface plus le cookie de session", CONTROLEUR,
      "    if (cookies.session === null) res.clearCookie(STAFF_SESSION_COOKIE, staffSessionCookieOptions(secure));", "    if (cookies.session === null) { /* cookie conservé */ }", ["int-connexion"])
cible("L-20. ⛔ le cookie d'appareil n'est jamais posé", CONTROLEUR,
      "    if (cookies.device !== undefined) res.cookie(staffDeviceCookieName(cookies.device.suffix), cookies.device.token, staffDeviceCookieOptions(secure));", "    if (false) res.cookie(staffDeviceCookieName(cookies.device!.suffix), cookies.device!.token, staffDeviceCookieOptions(secure));", ["int-activation"])
cible("L-21. ⛔ MP-37 — `Secure` ne suit plus le levier existant (`AUTH_COOKIE_SECURE`) : valeur écrite en dur", CONTROLEUR,
      'const secure = this.config.getOrThrow<boolean>("AUTH_COOKIE_SECURE");', "const secure = false;", ["sources"])

# ── C — le CLIENT D'API (`packages/api-client/src/staff-client.ts`).
cible("C-1. ⛔ D182 — l'activation appelle un autre chemin", CLIENT,
      'request<StaffActivationDTO>("/pro/staff/activate", { method: "POST", body: input })', 'request<StaffActivationDTO>("/pro/staff/activer", { method: "POST", body: input })', ["client-api", "int-contrat"])
cible("C-2. ⛔ D182 — la connexion appelle un autre chemin", CLIENT,
      'request<StaffLoginDTO>("/pro/staff/login", { method: "POST", body: input })', 'request<StaffLoginDTO>("/pro/staff/connexion", { method: "POST", body: input })', ["client-api", "int-contrat"])
cible("C-3. ⛔ D182 — la déconnexion appelle un autre chemin", CLIENT,
      'request<StaffLogoutDTO>("/pro/staff/logout", { method: "POST" })', 'request<StaffLogoutDTO>("/pro/staff/deconnexion", { method: "POST" })', ["client-api", "int-contrat"])
cible("C-4. ⛔ D182 — l'état appelle un autre chemin", CLIENT,
      'request<StaffSessionStateDTO>("/pro/staff/session")', 'request<StaffSessionStateDTO>("/pro/staff/etat")', ["client-api", "int-contrat"])
cible("C-5. ⛔ D182 — le changement de mot de passe appelle un autre chemin", CLIENT,
      'request<StaffPasswordChangeDTO>("/pro/staff/password", { method: "POST", body: input })', 'request<StaffPasswordChangeDTO>("/pro/staff/mot-de-passe", { method: "POST", body: input })', ["client-api", "int-contrat"])
cible("C-6. ⛔ la déconnexion passe par une autre méthode HTTP", CLIENT,
      'request<StaffLogoutDTO>("/pro/staff/logout", { method: "POST" })', 'request<StaffLogoutDTO>("/pro/staff/logout", { method: "PUT" })', ["client-api"])
cible("C-7. ⛔ l'état est demandé en POST (il ne doit être qu'une lecture)", CLIENT,
      'request<StaffSessionStateDTO>("/pro/staff/session")', 'request<StaffSessionStateDTO>("/pro/staff/session", { method: "POST" })', ["client-api"])
cible("C-8. ⛔ la connexion n'envoie plus le corps", CLIENT,
      'request<StaffLoginDTO>("/pro/staff/login", { method: "POST", body: input })', 'request<StaffLoginDTO>("/pro/staff/login", { method: "POST" })', ["client-api"])

# ── M — la BASE (migration `20261104170000_staff_layer`), sous `--int`. Pour retirer UNE condition d'une CHECK, on la rend tautologique : le remplacement n'est jamais une sous-chaîne de l'ancre (D325).
cible("M-1. ⛔ D186 — l'unicité (salle, clé de nom) devient un index ordinaire", MIGRATION,
      'CREATE UNIQUE INDEX "pro_staff_members_pro_profile_id_account_name_key_key"', 'CREATE INDEX "pro_staff_members_pro_profile_id_account_name_key_key"', ["int-schema"])
cible("M-2. ⛔ MP-11 — le jeton d'appareil n'est plus unique", MIGRATION,
      'CREATE UNIQUE INDEX "pro_staff_devices_token_hash_key"', 'CREATE INDEX "pro_staff_devices_token_hash_key"', ["int-schema"])
cible("M-3. ⛔ MP-11 — le jeton de session n'est plus unique", MIGRATION,
      'CREATE UNIQUE INDEX "pro_staff_sessions_token_hash_key"', 'CREATE INDEX "pro_staff_sessions_token_hash_key"', ["int-schema"])
cible("M-4. ⛔ (e) la CHECK du compteur de PIN (0 à 3) disparaît", MIGRATION,
      'CHECK ("pin_failed_count" BETWEEN 0 AND 3)', 'CHECK ("pin_failed_count" BETWEEN 0 AND 3 OR "pin_failed_count" IS NOT NULL)', ["int-schema"])
cible("M-5. ⛔ (a) un membre désactivé peut ne pas avoir de date de désactivation", MIGRATION,
      "CHECK ((\"status\" = 'DISABLED') = (\"disabled_at\" IS NOT NULL))", "CHECK (((\"status\" = 'DISABLED') = (\"disabled_at\" IS NOT NULL)) OR \"status\" IS NOT NULL)", ["int-schema"])
cible("M-6. ⛔ (b) `pin_generated_at` n'est plus lié à `pin_hash`", MIGRATION,
      'CHECK (("pin_hash" IS NULL) = ("pin_generated_at" IS NULL) AND', 'CHECK (("pin_generated_at" IS NULL OR "pin_generated_at" IS NOT NULL) AND', ["int-schema"])
cible("M-7. ⛔ (b) `pin_expires_at` n'est plus lié à `pin_hash`", MIGRATION,
      'AND ("pin_hash" IS NULL) = ("pin_expires_at" IS NULL))', 'AND ("pin_expires_at" IS NULL OR "pin_expires_at" IS NOT NULL))', ["int-schema"])
cible("M-8. ⛔ (e) le compteur de mot de passe peut être négatif", MIGRATION,
      'CHECK ("password_failed_count" >= 0)', 'CHECK ("password_failed_count" >= 0 OR "password_failed_count" IS NOT NULL)', ["int-schema"])
cible("M-9. ⛔ (f) la clé de nom peut être vide", MIGRATION,
      "CHECK (\"account_name_key\" <> '')", "CHECK (\"account_name_key\" <> '' OR \"account_name_key\" IS NOT NULL)", ["int-schema"])
cible("M-10. ⛔ (d) l'échéance d'un appareil peut précéder sa création", MIGRATION,
      'CONSTRAINT "pro_staff_devices_expires_after_created" CHECK ("expires_at" > "created_at")', 'CONSTRAINT "pro_staff_devices_expires_after_created" CHECK ("expires_at" > "created_at" OR "expires_at" IS NOT NULL)', ["int-schema"])
cible("M-11. ⛔ (d) l'échéance d'une session peut précéder sa création", MIGRATION,
      'CONSTRAINT "pro_staff_sessions_expires_after_created" CHECK ("expires_at" > "created_at")', 'CONSTRAINT "pro_staff_sessions_expires_after_created" CHECK ("expires_at" > "created_at" OR "expires_at" IS NOT NULL)', ["int-schema"])
cible("M-12. ⛔ (c) une session peut finir sans raison (ou une raison sans fin)", MIGRATION,
      'CHECK (("ended_at" IS NULL) = ("end_reason" IS NULL))', 'CHECK ((("ended_at" IS NULL) = ("end_reason" IS NULL)) OR "member_id" IS NOT NULL)', ["int-schema"])
cible("M-13. ⛔ le journal ne survit plus à son auteur (la suppression d'un membre supprime ses lignes)", MIGRATION,
      'REFERENCES "pro_staff_members"("id") ON DELETE SET NULL ON UPDATE CASCADE;', 'REFERENCES "pro_staff_members"("id") ON DELETE CASCADE ON UPDATE CASCADE;', ["int-schema"])
cible("M-14. ⛔ un membre peut être SUPPRIMÉ alors qu'il a des sessions (la clé étrangère n'est plus RESTRICT)", MIGRATION,
      'CONSTRAINT "pro_staff_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "pro_staff_members"("id") ON DELETE RESTRICT', 'CONSTRAINT "pro_staff_sessions_member_id_fkey" FOREIGN KEY ("member_id") REFERENCES "pro_staff_members"("id") ON DELETE CASCADE', ["int-schema"])
cible("M-15. ⛔ une salle peut être SUPPRIMÉE alors qu'elle a des membres (la clé étrangère n'est plus RESTRICT)", MIGRATION,
      'REFERENCES "pro_profiles"("id") ON DELETE RESTRICT ON UPDATE CASCADE,\n  CONSTRAINT "pro_staff_members_created_by_member_id_fkey"', 'REFERENCES "pro_profiles"("id") ON DELETE CASCADE ON UPDATE CASCADE,\n  CONSTRAINT "pro_staff_members_created_by_member_id_fkey"', ["int-schema"])
cible("M-16. ⛔ l'énumération des rôles admet un rôle de plus", MIGRATION,
      "CREATE TYPE \"StaffRole\" AS ENUM ('MANAGER', 'EMPLOYEE');", "CREATE TYPE \"StaffRole\" AS ENUM ('MANAGER', 'EMPLOYEE', 'OWNER');", ["int-schema"])
cible("M-17. ⛔ un membre naît DÉSACTIVÉ par défaut", MIGRATION,
      "\"StaffStatus\"  NOT NULL DEFAULT 'ACTIVE',", "\"StaffStatus\"  NOT NULL DEFAULT 'DISABLED',", ["int-schema"])
cible("M-18. ⛔ un membre naît avec le changement de mot de passe obligatoire", MIGRATION,
      '"must_change_password"  boolean        NOT NULL DEFAULT false,', '"must_change_password"  boolean        NOT NULL DEFAULT true,', ["int-schema"])
cible("M-19. ⛔ MP-35 — la migration ALLUME la couche de toute salle existante (le drapeau naît avec un défaut)", MIGRATION,
      'ADD COLUMN "staff_layer_enabled_at" timestamptz(6);', 'ADD COLUMN "staff_layer_enabled_at" timestamptz(6) DEFAULT now();', ["int-migration"])
cible("M-20. ⛔ le journal n'est plus indexé par auteur-membre sous le nom attendu", MIGRATION,
      'CREATE INDEX "audit_logs_actor_member_id_idx"', 'CREATE INDEX "audit_logs_actor_member_idx"', ["int-schema"])
cible("M-21. ⛔ le compteur de mot de passe d'un membre naît à 1", MIGRATION,
      '"password_failed_count" integer        NOT NULL DEFAULT 0,', '"password_failed_count" integer        NOT NULL DEFAULT 1,', ["int-schema"])



# ── TITRES : le titre (ou un fragment) du test qui doit rougir, par « identifiant|mesure ». ÉCRIT À PARTIR DU RELEVÉ de la découverte (jamais de mémoire) ; une mesure absente d'ici n'a pas mordu au relevé.
# <<TITRES>>
TITRES: dict[str, str] = {
    "A-1|magasin": "readLayer — UNE lecture du drapeau, par le compte commun (limite 6 du cadrage) > lit le profil du compte (id e",
    "A-2|magasin": "readLayer — UNE lecture du drapeau, par le compte commun (limite 6 du cadrage) > lit le profil du compte (id e",
    "A-3|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-23 —",
    "A-4|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ le drap",
    "A-5|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-22 —",
    "A-6|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-22 —",
    "A-7|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ un nom",
    "A-8|int-activation": "l'ACTIVATION REFUSÉE > ⛔ la transaction est ATOMIQUE : si l'insertion du Manager échoue (un membre de même clé",
    "A-9|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-22 —",
    "A-10|int-activation": "K-14 — l'activation nominale > 201 : le Manager est rendu ; le drapeau de la salle est posé ; UN membre MANAGE",
    "A-11|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-43 /",
    "A-12|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-43 /",
    "A-13|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-43 /",
    "A-14|int-connexion": "MP-16 / MP-17 / S-102 — la pause de 5 échecs, jamais définitive > la pause d'un membre ne touche pas un autre",
    "A-15|magasin": "reservePasswordAttempt — MP-16 / MP-17 : la tentative se RÉSERVE avant d'être vérifiée, en UNE instruction > ⛔",
    "A-16|magasin": "reservePasswordAttempt — MP-16 / MP-17 : la tentative se RÉSERVE avant d'être vérifiée, en UNE instruction > ⛔",
    "A-17|magasin": "reservePasswordAttempt — MP-16 / MP-17 : la tentative se RÉSERVE avant d'être vérifiée, en UNE instruction > ⛔",
    "A-18|magasin": "reservePasswordAttempt — MP-16 / MP-17 : la tentative se RÉSERVE avant d'être vérifiée, en UNE instruction > ⛔",
    "A-19|int-connexion": "MP-16 / MP-17 / S-102 — la pause de 5 échecs, jamais définitive > ⛔ VINGT connexions parallèles au mauvais mot",
    "A-20|magasin": "reservePasswordAttempt — MP-16 / MP-17 : la tentative se RÉSERVE avant d'être vérifiée, en UNE instruction > ⛔",
    "A-21|int-connexion": "MP-16 / MP-17 / S-102 — la pause de 5 échecs, jamais définitive > ⛔ VINGT connexions parallèles au mauvais mot",
    "A-22|int-connexion": "MP-16 / MP-17 / S-102 — la pause de 5 échecs, jamais définitive > ⛔ VINGT connexions parallèles au mauvais mot",
    "A-23|magasin": "reservePasswordAttempt — MP-16 / MP-17 : la tentative se RÉSERVE avant d'être vérifiée, en UNE instruction > u",
    "A-24|magasin": "recordPasswordFailure — l'échec consigné, sans secret > ⛔ MP-33 — une ligne `staff.login_failed` avec le compt",
    "A-25|magasin": "recordPasswordFailure — l'échec consigné, sans secret > ⛔ MP-33 — une ligne `staff.login_failed` avec le compt",
    "A-26|magasin": "recordPasswordFailure — l'échec consigné, sans secret > ⛔ MP-33 — une ligne `staff.login_failed` avec le compt",
    "A-27|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > resetPasswordAttempts : remet le compt",
    "A-28|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ le CAS du",
    "A-29|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ le CAS du",
    "A-30|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ le CAS du",
    "A-31|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ le CAS du",
    "A-32|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ MP-3 — l'",
    "A-33|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ un appare",
    "A-34|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > l'audit `st",
    "A-35|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ MP-43 / R",
    "A-36|magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ MP-43 / R",
    "A-37|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-38|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-39|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-40|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-41|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-42|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-43|int-garde": "MP-19 / MP-4 — la révocation à l'instant > ⛔ MP-18 — la session INACTIVE d'une autre salle, présentée avec le",
    "A-44|int-connexion": "K-16 — la déconnexion, MP-19 — le jeton rejoué > ⛔ MP-4 — un membre DÉSACTIVÉ pendant que sa session est ouver",
    "A-45|int-connexion": "MP-13 — l'inactivité et le plafond, côté serveur, à l'heure de la BASE > ⛔ JUSTE APRÈS le seuil (10 min 30 s)",
    "A-46|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-47|magasin": "touchSession — le garde : UNE instruction, tous les prédicats, la durée en paramètre (MP-13, MP-18, MP-4) > ⛔",
    "A-48|magasin": "peekSession — la LECTURE SEULE de l'état (K-17) ne prolonge jamais et n'écrit jamais > ⛔ n'émet AUCUN `UPDATE`",
    "A-49|magasin": "peekSession — la LECTURE SEULE de l'état (K-17) ne prolonge jamais et n'écrit jamais > ⛔ n'émet AUCUN `UPDATE`",
    "A-50|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > closeSession : la fin LOGOUT est condi",
    "A-51|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > closeSession : la fin LOGOUT est condi",
    "A-52|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > closeSession : la fin LOGOUT est condi",
    "A-53|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "A-54|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "A-55|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "A-56|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "A-57|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "A-58|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "A-59|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword — verrou du membre d'",
    "A-60|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > ⛔ changePassword : le membre introuvab",
    "A-61|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > changePassword : le hachage lu n'est p",
    "A-62|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > listKnownMembers : sans hachage d'appa",
    "A-63|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > listKnownMembers : sans hachage d'appa",
    "A-64|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > listKnownMembers : sans hachage d'appa",
    "A-65|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > listKnownMembers : sans hachage d'appa",
    "A-66|magasin": "closeSession, changePassword, listKnownMembers, resetPasswordAttempts > listKnownMembers : sans hachage d'appa",
    "A-67|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-33 —",
    "A-68|magasin": "activate — K-14 : une transaction, le drapeau d'abord (L1), puis Manager, appareil, session, audit > ⛔ MP-33 —",
    "A-69|magasin": "l'AUDIT — un seul site d'écriture, une charge utile FERMÉE (MP-33, MP-11) > ⛔ toute ligne d'audit porte les cl",
    "C-1|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-14 : `activate` POSTE le nom de compt",
    "C-2|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-15 : `login` POSTE sur `/pro/staff/lo",
    "C-3|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-16 : `logout` POSTE sur `/pro/staff/l",
    "C-4|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-17 : `session` LIT `/pro/staff/sessio",
    "C-5|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-18 : `changePassword` POSTE l'actuel",
    "C-6|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-16 : `logout` POSTE sur `/pro/staff/l",
    "C-7|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-17 : `session` LIT `/pro/staff/sessio",
    "C-8|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-15 : `login` POSTE sur `/pro/staff/lo",
    "G-1|garde": "StaffSessionGuard — ce qui PASSE sans toucher à la base > ⛔ une route `@Public()` atteinte avec une identité P",
    "G-2|garde": "StaffSessionGuard — ce qui PASSE sans toucher à la base > une route `@StaffExempt()` passe pour un PRO, SANS l",
    "G-3|garde": "StaffSessionGuard — ce qui PASSE sans toucher à la base > ⛔ MP-34 — un CLIENT passe SANS lecture, même avec un",
    "G-4|garde": "StaffSessionGuard — la couche ÉTEINTE : l'app Pro marche comme aujourd'hui (MP-35) > un PRO sans profil (donné",
    "G-5|garde": "StaffSessionGuard — la couche ÉTEINTE : l'app Pro marche comme aujourd'hui (MP-35) > ⛔ drapeau nul : passe, et",
    "G-6|garde": "StaffSessionGuard — la couche ÉTEINTE : l'app Pro marche comme aujourd'hui (MP-35) > ⛔ drapeau nul : passe, et",
    "G-7|int-garde": "la couche ACTIVÉE — sans session, avec la bonne, avec celle d'autrui > ⛔ AVEC la session de la salle : AUCUNE",
    "G-8|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > ⛔ sans cookie : 4",
    "G-9|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > ⛔ MP-18 — la sall",
    "G-10|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > ⛔ MP-18 — la sall",
    "G-11|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > ⛔ session refusée",
    "G-12|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > une session vivan",
    "G-13|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > ⛔ sans cookie : 4",
    "K-1|cookies": "noms et chemins > la session est `zwadj_ss` sur `/api/v1` ; l'appareil `zwadj_dv_<suffixe>` sur `/api/v1/pro/s",
    "K-2|cookies": "staffSessionCookieOptions (MP-37) > HttpOnly, SameSite=Strict, chemin `/api/v1`, `Secure` suit le paramètre —",
    "K-3|cookies": "staffSessionCookieOptions (MP-37) > HttpOnly, SameSite=Strict, chemin `/api/v1`, `Secure` suit le paramètre —",
    "K-4|cookies": "staffSessionCookieOptions (MP-37) > HttpOnly, SameSite=Strict, chemin `/api/v1`, `Secure` suit le paramètre —",
    "K-5|cookies": "staffSessionCookieOptions (MP-37) > HttpOnly, SameSite=Strict, chemin `/api/v1`, `Secure` suit le paramètre —",
    "K-6|cookies": "staffDeviceCookieOptions (MP-37, R-6 (D341)) > HttpOnly, SameSite=Strict, chemin `/api/v1/pro/staff`, `Secure`",
    "K-7|cookies": "staffDeviceCookieOptions (MP-37, R-6 (D341)) > ⛔ R-6 (D341) — l'échéance du cookie d'appareil est la durée du",
    "K-8|cookies": "staffDeviceCookieOptions (MP-37, R-6 (D341)) > HttpOnly, SameSite=Strict, chemin `/api/v1/pro/staff`, `Secure`",
    "K-9|cookies": "staffDeviceCookieName > refuse un suffixe qui n'est pas de 8 caractères base64url (un nom de cookie ne se cons",
    "K-10|cookies": "readSessionCookie > rend `undefined` pour une valeur absente, trop courte, trop longue, mal formée ou qui n'es",
    "K-11|cookies": "readDeviceCookies (MP-28, borne dure de 8) > ⛔ lit AU PLUS `STAFF_LIMITS.DEVICE_COOKIES_MAX` cookies d'apparei",
    "K-12|cookies": "readDeviceCookies (MP-28, borne dure de 8) > ⛔ le PRÉFIXE est exigé : un cookie dont les neuf premiers caractè",
    "K-13|cookies": "readDeviceCookies (MP-28, borne dure de 8) > ⛔ le SUFFIXE est exigé : huit caractères base64url exactement — t",
    "K-14|cookies": "readDeviceCookies (MP-28, borne dure de 8) > ne retient que les cookies de préfixe `zwadj_dv_` dont la valeur",
    "K-15|cookies": "readSessionCookie > rend `undefined` pour une valeur absente, trop courte, trop longue, mal formée ou qui n'es",
    "K-16|cookies": "staffDeviceCookieName > refuse un suffixe qui n'est pas de 8 caractères base64url (un nom de cookie ne se cons",
    "K-17|cookies": "noms et chemins > la session est `zwadj_ss` sur `/api/v1` ; l'appareil `zwadj_dv_<suffixe>` sur `/api/v1/pro/s",
    "L-1|sources": "le câblage > ⛔ S-98 — le garde du personnel est le QUATRIÈME garde global, après `ThrottlerGuard`, `JwtAuthGua",
    "L-2|sources": "le câblage > l'application importe le module du personnel (leçon R1 : un contrôleur écrit mais non enregistré",
    "L-3|sources": "le câblage > ⛔ R-7 (D341) / SIG-1 — le journal des requêtes masque le `Set-Cookie` de RÉPONSE, en plus de l'`A",
    "L-4|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "L-5|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "L-6|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "L-7|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "L-8|int-activation": "l'ACTIVATION REFUSÉE > ⛔ MP-34 — les CINQ routes du personnel sont réservées au PRO : un CLIENT et un ADMIN re",
    "L-9|int-connexion": "K-16 — la déconnexion, MP-19 — le jeton rejoué > se déconnecter AVANT toute activation : 401 `STAFF_SESSION_RE",
    "L-10|int-activation": "K-14 — l'activation nominale > 201 : le Manager est rendu ; le drapeau de la salle est posé ; UN membre MANAGE",
    "L-11|int-connexion": "K-15 — la connexion nominale > 200 : le membre est rendu, une SESSION neuve est ouverte et son cookie posé, `l",
    "L-12|int-debit": "Rate limiting /auth (limites réelles) > staffActivate (rang 44, D341, MP-36) : 5 requêtes passent (ici 401, sa",
    "L-13|int-debit": "Rate limiting /auth (limites réelles) > staffLogin (rang 44, D341, MP-36) : 10 requêtes passent (401), la 11e",
    "L-14|int-debit": "Rate limiting /auth (limites réelles) > ⛔ MP-36 — les DÉFAUTS de production des deux clés neuves (aucune varia",
    "L-15|int-debit": "Rate limiting /auth (limites réelles) > ⛔ MP-36 — les DÉFAUTS de production des deux clés neuves (aucune varia",
    "L-16|int-activation": "MP-22 — l'activation CONCURRENTE > ⛔ dix activations simultanées (manche 1) : UNE réussit (201), les neuf autr",
    "L-17|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "L-18|int-activation": "K-14 — l'activation nominale > ⛔ S-99 / MP-37 — le cookie de SESSION : `HttpOnly`, `SameSite=Strict`, chemin `",
    "L-19|int-connexion": "K-16 — la déconnexion, MP-19 — le jeton rejoué > 200 `{ status: 'ok' }` : la session courante prend `LOGOUT`,",
    "L-20|int-activation": "K-14 — l'activation nominale > ⛔ S-99 / R-6 (D341) / MP-37 — le cookie d'APPAREIL : un par membre, `zwadj_dv_<",
    "L-21|sources": "le câblage > ⛔ MP-37 — `Secure` des cookies du personnel suit le levier EXISTANT `AUTH_COOKIE_SECURE`, lu par",
    "M-1|int-schema": "la tranche ratifiée — ses garanties > UNIQUE (salle, clé de nom) : la même clé dans la MÊME salle est refusée",
    "M-2|int-schema": "la tranche ratifiée — ses garanties > UNIQUE (token_hash) sur les appareils ET sur les sessions",
    "M-3|int-schema": "la tranche ratifiée — ses garanties > UNIQUE (token_hash) sur les appareils ET sur les sessions",
    "M-4|int-schema": "la tranche ratifiée — ses garanties > CHECK pin_failed_count entre 0 et 3 : -1 et 4 refusés, 0 à 3 acceptés",
    "M-5|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (a) `status = 'DISABLED'` ⇔ `disabled_at IS NOT N",
    "M-6|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (b) `pin_hash`, `pin_generated_at`, `pin_expires_",
    "M-7|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (b) `pin_hash`, `pin_generated_at`, `pin_expires_",
    "M-8|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (e) `password_failed_count >= 0` : -1 refusé ; 0",
    "M-9|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (f) `account_name_key <> ''` : une clé vide est r",
    "M-10|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (d) `expires_at > created_at` sur les sessions ET",
    "M-11|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (d) `expires_at > created_at` sur les sessions ET",
    "M-12|int-schema": "1 b — les SIX garanties de base adoptées par la consigne > ⛔ (c) `ended_at` et `end_reason` : tous deux nuls o",
    "M-13|int-schema": "l'audit et les suppressions > ⛔ `ON DELETE SET NULL` : supprimer un membre (sans appareil ni session) met `act",
    "M-14|int-schema": "l'audit et les suppressions > ⛔ RESTRICT sur `pro_staff_sessions.member_id`, ISOLÉ : un membre qui porte une s",
    "M-15|int-schema": "l'audit et les suppressions > ⛔ RESTRICT : une salle qui porte un membre ne se supprime pas en dur ; un membre",
    "M-16|int-schema": "la tranche : les objets existent, avec les noms que les tests et la sonde de dérive attendent > trois tables,",
    "M-17|int-schema": "la tranche ratifiée — ses garanties > clés étrangères : un membre sans salle, un appareil sans membre, une ses",
    "M-18|int-schema": "la tranche : les objets existent, avec les noms que les tests et la sonde de dérive attendent > les défauts du",
    "M-19|int-migration": "⛔ L36-3a-1 (D341, MP-38) — la couche du personnel (trois tables, trois énumérations, deux colonnes) sur une ba",
    "M-20|int-schema": "l'audit et les suppressions > les index simples existent sous les noms que `schema.prisma` leur donne (sinon d",
    "M-21|int-schema": "la tranche : les objets existent, avec les noms que les tests et la sonde de dérive attendent > les défauts du",
    "N-1|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-2|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-3|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > R-4 — NFKC ne ramène NI les chif",
    "N-4|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-5|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-6|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-7|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-8|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-9|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-10|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-11|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-12|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "N-13|nom": "normalizeStaffAccountName — la clé d'unicité du nom de compte (S-110 + R-4) > deux écritures d'un même nom don",
    "P-1|politique": "guardVerdict — le quatrième garde global, FERMÉ PAR DÉFAUT (S-98) > ⛔ MP-34 — ni un CLIENT ni un ADMIN ne sont",
    "P-2|politique": "guardVerdict — le quatrième garde global, FERMÉ PAR DÉFAUT (S-98) > une route déclarée `@StaffExempt()` passe,",
    "P-3|politique": "guardVerdict — le quatrième garde global, FERMÉ PAR DÉFAUT (S-98) > ⛔ MP-35 — la couche ÉTEINTE : le garde lai",
    "P-4|politique": "classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit > ⛔ MP-18 — la session d'une",
    "P-5|politique": "classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit > ⛔ MP-19 — une session déjà",
    "P-6|politique": "classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit > ⛔ MP-4 — le membre est DÉS",
    "P-7|politique": "classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit > ⛔ MP-13 — le PLAFOND absol",
    "P-8|politique": "classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit > l'ordre des causes (la plu",
    "P-9|politique": "classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit > ⛔ MP-13 — inactive depuis",
    "P-10|politique": "classifySessionRefusal — POURQUOI une session est refusée, et si ce refus s'écrit > une session vivante n'a pa",
    "P-11|politique": "loginVerification — le VRAI hachage ou le FACTICE (D5, R-3 (D341), MP-8, MP-17) > ⛔ R-3 (D341) — PAUSE : la ré",
    "P-12|politique": "loginVerification — le VRAI hachage ou le FACTICE (D5, R-3 (D341), MP-8, MP-17) > la table complète des huit c",
    "P-13|politique": "pickReusableDevice — MP-3 : l'appareil d'un AUTRE membre ou d'une AUTRE salle n'est jamais réutilisé > ⛔ l'app",
    "P-14|politique": "pickReusableDevice — MP-3 : l'appareil d'un AUTRE membre ou d'une AUTRE salle n'est jamais réutilisé > ⛔ l'app",
    "P-15|politique": "pickReusableDevice — MP-3 : l'appareil d'un AUTRE membre ou d'une AUTRE salle n'est jamais réutilisé > un appa",
    "P-16|politique": "pickReusableDevice — MP-3 : l'appareil d'un AUTRE membre ou d'une AUTRE salle n'est jamais réutilisé > un appa",
    "S-1|service": "activate — K-14 : le propriétaire crée le Manager > ⛔ MP-24 — un mot de passe COURANT est refusé (400 `STAFF_P",
    "S-2|service": "activate — K-14 : le propriétaire crée le Manager > crée le Manager : hachage du mot de passe, clé normalisée",
    "S-3|service": "login — la connexion par nom de compte et mot de passe (K-15) > la recherche du membre se fait par la CLÉ norm",
    "S-4|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ un membre DÉSACTIVÉ est un compte inconnu po",
    "S-5|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ un compte INCONNU : un seul hachage FACTICE,",
    "S-6|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ MP-8 — un mot de passe juste : UN seul hacha",
    "S-7|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ MP-16 — l'échec qui FRANCHIT le seuil est co",
    "S-8|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ MP-8 — un MAUVAIS mot de passe : un seul hac",
    "S-9|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ MP-3 — les cookies d'appareil présentés sont",
    "S-10|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ un mot de passe juste mais un membre devenu",
    "S-11|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ MP-3 — les cookies d'appareil présentés sont",
    "S-12|service": "logout — K-16 > termine la session COURANTE (celle du contexte posé par le garde) et demande l'effacement du c",
    "S-13|service": "logout — K-16 > termine la session COURANTE (celle du contexte posé par le garde) et demande l'effacement du c",
    "S-14|service": "state — K-17 : exemptée, jamais un refus > couche éteinte : `enabled: false`, aucun membre, et AUCUNE autre le",
    "S-15|service": "state — K-17 : exemptée, jamais un refus > ⛔ la lecture de l'état ne PROLONGE JAMAIS la session : elle passe p",
    "S-16|service": "state — K-17 : exemptée, jamais un refus > couche activée, sans cookie de session : `member: null` (jamais un",
    "S-17|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > ⛔ MP-24 — un nouveau mot de passe",
    "S-18|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > un mot de passe actuel juste : rés",
    "S-19|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > ⛔ PENDANT LA PAUSE : le factice, j",
    "S-20|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > ⛔ un mot de passe actuel FAUX : 40",
    "S-21|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > ⛔ MP-24 — un nouveau mot de passe",
    "S-22|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > ⛔ MP-24 — un nouveau mot de passe",
    "S-23|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > un mot de passe actuel juste : rés",
    "S-24|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > un mot de passe actuel juste : rés",
    "S-25|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > un remplacement qui a perdu une co",
    "S-26|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ un compte INCONNU : un seul hachage FACTICE,",
    "S-27|service": "changePassword — K-18 : le compteur est PARTAGÉ avec la connexion (S-102) > ⛔ un mot de passe actuel FAUX : 40",
    "S-28|service": "activate — K-14 : le propriétaire crée le Manager > ⛔ MP-24 — un mot de passe COURANT est refusé (400 `STAFF_P",
    "S-29|service": "activate — K-14 : le propriétaire crée le Manager > les quatre refus du magasin sont traduits en erreurs MÉTIE",
    "S-30|service": "activate — K-14 : le propriétaire crée le Manager > les quatre refus du magasin sont traduits en erreurs MÉTIE",
    "S-31|service": "activate — K-14 : le propriétaire crée le Manager > les quatre refus du magasin sont traduits en erreurs MÉTIE",
    "S-32|service": "activate — K-14 : le propriétaire crée le Manager > les quatre refus du magasin sont traduits en erreurs MÉTIE",
    "T-1|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > DR5 : inactivité 10 minutes, plafond de session",
    "T-2|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > DR5 : inactivité 10 minutes, plafond de session",
    "T-3|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > DR5 : inactivité 10 minutes, plafond de session",
    "T-4|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > DR5 : inactivité 10 minutes, plafond de session",
    "T-5|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > la borne de lecture des cookies d'appareil est",
    "T-6|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > DR5 : inactivité 10 minutes, plafond de session",
    "T-7|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > le libellé d'un appareil est une constante (« P",
    "T-8|contrat": "les codes d'erreur du personnel — messages FR = AR (MP-39) > chaque code a une clé de message, et cette clé ex",
    "T-8|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > ⛔ sans cookie : 4",
    "T-9|contrat": "les codes d'erreur du personnel — messages FR = AR (MP-39) > chaque code a une clé de message, et cette clé ex",
    "T-9|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ un compte INCONNU : un seul hachage FACTICE,",
    "T-10|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "T-11|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "T-12|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "T-13|contrat": "staffActivateSchema — K-14 : le nom de compte et le mot de passe du Manager, rien d'autre > accepte un corps v",
    "T-14|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "T-15|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "T-16|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "T-17|contrat": "staffActivateSchema — K-14 : le nom de compte et le mot de passe du Manager, rien d'autre > ⛔ un nom fait UNIQ",
    "T-18|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "T-19|contrat": "staffLoginSchema — K-15 : NE révèle PAS la politique de mot de passe > ⛔ le nom de compte de la connexion a UN",
    "W-1|mdp": "isCommonPassword — la comparaison se fait APRÈS mise en minuscules (R-5 (D341)) > ⛔ R-5 — la liste est mise en",
    "W-2|mdp": "isCommonPassword — la comparaison se fait APRÈS mise en minuscules (R-5 (D341)) > ⛔ R-5 (D341) — refusé AUSSI",
    "W-3|mdp": "passwordViolation — la raison d'un refus, dans l'ordre d'ÉVALUATION (le courant d'abord : il ne coûte aucun ar",
    "W-4|mdp": "passwordViolation — la raison d'un refus, dans l'ordre d'ÉVALUATION (le courant d'abord : il ne coûte aucun ar",
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
    _normaliser_mesures()
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    if FILTRE and not DECOUVERTE:
        print("✗ R44_FILTRE n'est admis qu'avec R44_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R44_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    if CLASSE:
        if not DECOUVERTE:
            print("✗ R44_CLASSE n'est admis qu'avec R44_DECOUVERTE=1 : une campagne restreinte n'est pas une campagne verte.")
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
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(sortie)
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
            io.open(os.path.join(JOURNAUX, f"{ident}-{mesure}.log"), "w", encoding="utf-8").write(sortie)
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
