#!/usr/bin/env python3
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


SAUVEGARDE = ".neutralisation-r56"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r56")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\x1b\[[0-9;]*m")
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


# ── E — l'ÉTAT DU COMPTE (`staff-account-state.ts`, R-3, S-104).
cible("E-1. ⛔ D55 — l'échéance n'est plus INCLUSE dans l'expiré (`<=` devient `<`) : un mot de passe qui expire à l'instant exact reste valable", ETAT,
      "  const expire = membre.passwordExpiresAt.getTime() <= maintenant.getTime();", "  const expire = membre.passwordExpiresAt.getTime() < maintenant.getTime();", ["etat", "garde", "service"])
cible("E-2. ⛔ un membre DÉSACTIVÉ n'est plus désactivé pour la règle (son mot de passe décide seul)", ETAT,
      "  if (membre.status !== StaffStatus.ACTIVE) return StaffAccountState.DISABLED;", "  if (false) return StaffAccountState.DISABLED;", ["etat"])
cible("E-3. ⛔ S-104 — un TEMPORAIRE expiré n'est plus refusé (il redevient « à changer » : la connexion l'admet)", ETAT,
      "  if (membre.mustChangePassword) return expire ? StaffAccountState.TEMPORARY_EXPIRED : StaffAccountState.MUST_CHANGE_PASSWORD;",
      "  if (membre.mustChangePassword) return StaffAccountState.MUST_CHANGE_PASSWORD;", ["etat", "service", "garde", "int-expiration"])
cible("E-4. ⛔ S-104 — un mot de passe ORDINAIRE expiré redevient ACTIF (le défaut que D341 avait écrit : « un mot de passe expiré ouvre une session »)", ETAT,
      "  return expire ? StaffAccountState.MUST_CHANGE_PASSWORD : StaffAccountState.ACTIVE;", "  return StaffAccountState.ACTIVE;", ["etat", "service", "garde", "int-expiration"])
cible("E-5. ⛔ le marqueur « temporaire » (`must_change_password`) n'est plus lu : un temporaire valable passe pour un mot de passe ordinaire", ETAT,
      "  if (membre.mustChangePassword) return expire", "  if (false) return expire", ["etat", "service", "garde", "int-expiration"])
cible("E-6. ⛔ MP-41 — l'heure vient de l'horloge de l'API (`Date.now()`) et non du paramètre : le temps n'est plus celui de la base", ETAT,
      "  const expire = membre.passwordExpiresAt.getTime() <= maintenant.getTime();", "  const expire = membre.passwordExpiresAt.getTime() <= Date.now();", ["etat", "sources"])

# ── V — le VERDICT D'ACCÈS (`staff-access-policy.ts`, R-2, R-3, S-107).
cible("V-1. ⛔ un compte DÉSACTIVÉ ou au TEMPORAIRE EXPIRÉ n'est plus un refus de session", ACCES,
      '  if (input.state === StaffAccountState.DISABLED || input.state === StaffAccountState.TEMPORARY_EXPIRED) return "refuseSession";', '  if (false) return "refuseSession";', ["acces", "garde"])
cible("V-2. ⛔ MOT DE PASSE À CHANGER : toute route passe (le changement n'est plus la SEULE route admise)", ACCES,
      '  if (input.state === StaffAccountState.MUST_CHANGE_PASSWORD) return input.ownSession ? "allow" : "refuseCapability";',
      '  if (input.state === StaffAccountState.MUST_CHANGE_PASSWORD) return "allow";', ["acces", "garde"])
cible("V-3. ⛔ MOT DE PASSE À CHANGER : même la route du membre est refusée (impossible de changer son mot de passe)", ACCES,
      '  if (input.state === StaffAccountState.MUST_CHANGE_PASSWORD) return input.ownSession ? "allow" : "refuseCapability";',
      '  if (input.state === StaffAccountState.MUST_CHANGE_PASSWORD) return "refuseCapability";', ["acces", "garde"])
cible("V-4. ⛔ la route du membre sur sa propre session n'est plus admise pour un compte actif (un employé ne peut plus se déconnecter)", ACCES,
      '  if (input.ownSession) return "allow";', '  if (false) return "allow";', ["acces", "garde"])
cible("V-5. ⛔ toute méthode est une ÉCRITURE (un employé ne LIT plus ce qu'il a le droit de lire)", ACCES,
      '  const acte = LECTURES.has(input.method.toUpperCase()) ? "read" : "write";', '  const acte = "write";', ["acces", "garde"])
cible("V-6. ⛔ toute méthode est une LECTURE (un employé écrit où il ne le peut pas)", ACCES,
      '  const acte = LECTURES.has(input.method.toUpperCase()) ? "read" : "write";', '  const acte = "read";', ["acces", "garde"])
cible("V-7. ⛔ S-107 — une route SANS déclaration est ouverte à tous en écriture (une route oubliée devient plus ouverte)", ACCES,
      '  if (input.capability === undefined) return acte === "read" || input.role === StaffRole.MANAGER ? "allow" : "refuseCapability";',
      '  if (input.capability === undefined) return "allow";', ["acces", "garde"])
cible("V-8. ⛔ S-107 — le MANAGER n'écrit plus sur une route sans déclaration", ACCES,
      '  if (input.capability === undefined) return acte === "read" || input.role === StaffRole.MANAGER ? "allow" : "refuseCapability";',
      '  if (input.capability === undefined) return acte === "read" ? "allow" : "refuseCapability";', ["acces", "garde"])
cible("V-9. ⛔ la capacité déclarée est jugée en LECTURE quelle que soit la méthode (une écriture sur `salle` passe pour un employé)", ACCES,
      '  return peut(input.role, input.capability, acte) ? "allow" : "refuseCapability";', '  return peut(input.role, input.capability, "read") ? "allow" : "refuseCapability";', ["acces", "garde", "int-capacites"])
cible("V-10. ⛔ la méthode se lit AVEC la casse (« get » n'est plus une lecture)", ACCES,
      "LECTURES.has(input.method.toUpperCase())", "LECTURES.has(input.method)", ["acces"])
cible("V-11. ⛔ HEAD et OPTIONS ne sont plus des lectures", ACCES,
      'new Set(["GET", "HEAD", "OPTIONS"])', 'new Set(["GET"])', ["acces"])

# ── C — la TABLE DES CAPACITÉS (`packages/types/src/staff-capabilities.ts`, R-2).
cible("C-1. ⛔ l'employé ÉCRIT sur la salle (la table n'est plus « lecture seule » pour lui)", CAPA,
      "  salle: ligne(StaffAccess.WRITE, StaffAccess.READ),", "  salle: ligne(StaffAccess.WRITE, StaffAccess.WRITE),", ["capacites", "int-capacites"])
cible("C-2. ⛔ l'employé LIT le personnel (la table ne dit plus « — » pour lui)", CAPA,
      "  personnel: ligne(StaffAccess.WRITE, StaffAccess.NONE),", "  personnel: ligne(StaffAccess.WRITE, StaffAccess.READ),", ["capacites", "int-capacites"])
cible("C-3. ⛔ l'employé ÉCRIT sur le compte commun (la table ne dit plus « — » pour lui)", CAPA,
      "  compte: ligne(StaffAccess.WRITE, StaffAccess.NONE)", "  compte: ligne(StaffAccess.WRITE, StaffAccess.WRITE)", ["capacites", "int-capacites"])
cible("C-4. ⛔ l'employé n'écrit plus sur l'agenda (la table le met en « lecture seule »)", CAPA,
      "  agenda: ligne(StaffAccess.WRITE, StaffAccess.WRITE),", "  agenda: ligne(StaffAccess.WRITE, StaffAccess.READ),", ["capacites", "int-capacites"])
cible("C-5. ⛔ le MANAGER n'écrit plus sur les prix", CAPA,
      "  prix: ligne(StaffAccess.WRITE, StaffAccess.READ),", "  prix: ligne(StaffAccess.READ, StaffAccess.READ),", ["capacites"])
cible("C-6. ⛔ FERMÉ PAR DÉFAUT — une capacité INCONNUE est acceptée (une faute de frappe d'une déclaration ouvre la route)", CAPA,
      "  if (!Object.prototype.hasOwnProperty.call(STAFF_CAPABILITIES, capability)) return false;",
      "  if (!Object.prototype.hasOwnProperty.call(STAFF_CAPABILITIES, capability)) return true;", ["capacites"])
cible("C-7. ⛔ S-239 — `peut(role, capacité)` sans acte répond « lire » au lieu d'« écrire »", CAPA,
      'export function peut(role: StaffRole, capability: StaffCapability, act: StaffAct = "write"): boolean {',
      'export function peut(role: StaffRole, capability: StaffCapability, act: StaffAct = "read"): boolean {', ["capacites"])
cible("C-8. ⛔ les lignes de la table ne sont plus figées (un appelant pourrait la modifier à l'exécution)", CAPA,
      "=> Object.freeze({ MANAGER: manager, EMPLOYEE: employee });", "=> ({ MANAGER: manager, EMPLOYEE: employee });", ["capacites"])
cible("C-9. ⛔ « lecture seule » et « — » ne se distinguent plus : tout niveau non nul permet d'ÉCRIRE", CAPA,
      '  return act === "read" ? niveau !== StaffAccess.NONE : niveau === StaffAccess.WRITE;', "  return niveau !== StaffAccess.NONE;", ["capacites", "acces"])
cible("C-10. ⛔ FERMÉ PAR DÉFAUT — un rôle INCONNU est accepté", CAPA,
      "  if (!Object.prototype.hasOwnProperty.call(ligneDeLaCapacite, role)) return false;",
      "  if (!Object.prototype.hasOwnProperty.call(ligneDeLaCapacite, role)) return true;", ["capacites"])

# ── M — « JAMAIS ZÉRO MANAGER », la DÉCISION (`staff-members-policy.ts`, R-4).
cible("M-1. ⛔ une désactivation RÉPÉTÉE n'est plus reconnue (patron de D349 : elle devrait être un succès sans écriture)", POLITIQUE_MEMBRES,
      '  if (input.targetStatus === StaffStatus.DISABLED) return "alreadyDisabled";', '  if (false) return "alreadyDisabled";', ["membres-politique"])
cible("M-2. ⛔ le DERNIER Manager actif peut être désactivé (le seuil passe de 1 à 0)", POLITIQUE_MEMBRES,
      '  if (input.targetRole === StaffRole.MANAGER && input.activeManagers <= 1) return "lastManager";',
      '  if (input.targetRole === StaffRole.MANAGER && input.activeManagers <= 0) return "lastManager";', ["membres-politique"])
cible("M-3. ⛔ un EMPLOYÉ est bloqué par la règle quand il n'y a qu'un Manager (le rôle de la cible n'est plus lu)", POLITIQUE_MEMBRES,
      '  if (input.targetRole === StaffRole.MANAGER && input.activeManagers <= 1) return "lastManager";',
      '  if (input.activeManagers <= 1) return "lastManager";', ["membres-politique"])
cible("M-4. ⛔ un Manager est bloqué alors qu'il en reste UN AUTRE (le seuil passe de 1 à 2)", POLITIQUE_MEMBRES,
      '  if (input.targetRole === StaffRole.MANAGER && input.activeManagers <= 1) return "lastManager";',
      '  if (input.targetRole === StaffRole.MANAGER && input.activeManagers <= 2) return "lastManager";', ["membres-politique"])

# ── T — le MOT DE PASSE TEMPORAIRE (`staff-temporary-password.ts`, R-5, S-109).
cible("T-1. ⛔ le REJET des octets ≥ 248 est retiré (le biais modulo favorise les huit premiers symboles)", TEMPO,
      "    if (octet >= SEUIL_DE_REJET) continue;", "    if (false) continue;", ["temporaire"])
cible("T-2. ⛔ le seuil de rejet passe à 256 (plus aucun octet n'est rejeté)", TEMPO,
      "const SEUIL_DE_REJET = Math.floor(256 / N) * N;", "const SEUIL_DE_REJET = 256;", ["temporaire"])
cible("T-3. ⛔ un mot de passe PLUS COURT que douze caractères est rendu au lieu d'un re-tirage", TEMPO,
      "  if (out.length < TEMPORARY_PASSWORD_LENGTH) return null;", "  if (false) return null;", ["temporaire", "service-membres"])
cible("T-4. ⛔ un mot de passe SANS chiffre ou SANS lettre est rendu (le contrat `passwordSchema` le refuserait)", TEMPO,
      "  if (!/[A-Z]/.test(out) || !/[2-9]/.test(out)) return null;", "  if (false) return null;", ["temporaire", "service-membres"])
cible("T-5. ⛔ l'alphabet gagne un caractère AMBIGU (le « I » qui se confond avec « 1 » et « l »)", TEMPO,
      'export const TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHJKMNPQRSTUVWXYZ23456789";', 'export const TEMPORARY_PASSWORD_ALPHABET = "ABCDEFGHIJKMNPQRSTUVWXYZ23456789";', ["temporaire"])
cible("T-6. ⛔ la distribution n'est plus uniforme (le dernier symbole n'est jamais tiré)", TEMPO,
      "    out += TEMPORARY_PASSWORD_ALPHABET[octet % N];", "    out += TEMPORARY_PASSWORD_ALPHABET[octet % (N - 1)];", ["temporaire"])
cible("T-7. ⛔ S-109 — l'aléa vient de `Math.random` (prévisible) au lieu des octets passés en paramètre", TEMPO,
      "    out += TEMPORARY_PASSWORD_ALPHABET[octet % N];", "    out += TEMPORARY_PASSWORD_ALPHABET[Math.floor(Math.random() * N)];", ["sources", "temporaire"])

# ── G — le GARDE GLOBAL, ce que ce lot y AJOUTE (`staff-session.guard.ts`).
cible("G-1. ⛔ MP-41 — le garde juge l'état avec `new Date()` (l'horloge de l'API) et non l'heure de la base rendue avec la session", GARDE,
      "    const state = etatDuCompte(session, session.now);", "    const state = etatDuCompte(session, new Date());", ["garde", "sources"])
cible("G-2. ⛔ un refus de SESSION (désactivé, temporaire expiré) n'est plus levé", GARDE,
      '    if (verdict === "refuseSession") throw sessionRequise();', "    if (false) throw sessionRequise();", ["garde", "int-expiration"])
cible("G-3. ⛔ un refus de CAPACITÉ n'est plus levé (l'employé écrit partout, le mot de passe à changer n'ouvre plus rien de moins)", GARDE,
      '    if (verdict === "refuseCapability") throw capaciteRefusee();', "    if (false) throw capaciteRefusee();", ["garde", "int-capacites"])
cible("G-4. ⛔ la MÉTHODE de la requête n'est plus lue (toute requête est une lecture)", GARDE,
      '      method: request.method ?? "",', '      method: "GET",', ["garde", "int-capacites"])
cible("G-5. ⛔ la capacité DÉCLARÉE par la route n'est plus lue (S-107 s'applique à toutes les routes)", GARDE,
      "      capability: this.reflector.getAllAndOverride<StaffCapability | undefined>(STAFF_CAPABILITY_KEY, cibles),", "      capability: undefined,", ["garde", "int-capacites"])
cible("G-6. ⛔ la route du MEMBRE sur sa propre session n'est plus reconnue (se déconnecter et changer son mot de passe tombent sous la règle commune)", GARDE,
      "      ownSession: this.reflector.getAllAndOverride<boolean | undefined>(STAFF_ANY_MEMBER_KEY, cibles) === true", "      ownSession: false", ["garde", "int-capacites", "int-expiration"])
cible("G-7. ⛔ MP-21 — le rôle jugé est « MANAGER » quel que soit le membre (le rôle de la SESSION n'est plus lu)", GARDE,
      "      state,\n      role: session.role,", '      state,\n      role: "MANAGER" as const,', ["garde", "int-capacites"])
cible("G-8. ⛔ le contexte posé ne dit plus « mot de passe à changer »", GARDE,
      "      mustChangePassword: state === StaffAccountState.MUST_CHANGE_PASSWORD,", "      mustChangePassword: false,", ["garde"])
cible("G-9. ⛔ le refus de capacité porte le code d'une SESSION requise (le client le rejouerait)", GARDE,
      "  new ForbiddenException({ code: StaffErrorCode.STAFF_CAPABILITY_DENIED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_CAPABILITY_DENIED });",
      "  new ForbiddenException({ code: StaffErrorCode.STAFF_SESSION_REQUIRED, message: STAFF_ERROR_MESSAGE_KEYS.STAFF_CAPABILITY_DENIED });", ["garde", "int-capacites"])

# ── S — le SERVICE DE SESSION, ce que ce lot y AJOUTE (`staff-session.service.ts`, S-104).
cible("S-1. ⛔ S-104 — la connexion juge « actif » (le statut seul) : un TEMPORAIRE EXPIRÉ se connecte", SERVICE,
      "    const memberActive = etat === StaffAccountState.ACTIVE || etat === StaffAccountState.MUST_CHANGE_PASSWORD;", '    const memberActive = member !== null && member.status === "ACTIVE";', ["service", "int-expiration"])
cible("S-2. ⛔ S-104 — la connexion refuse un mot de passe À CHANGER (un temporaire valable ne se connecte plus)", SERVICE,
      "    const memberActive = etat === StaffAccountState.ACTIVE || etat === StaffAccountState.MUST_CHANGE_PASSWORD;", "    const memberActive = etat === StaffAccountState.ACTIVE;", ["service", "int-expiration"])
cible("S-3. ⛔ S-104 — la connexion rend la colonne brute `mustChangePassword` (un mot de passe de 90 jours expiré ne le dit pas)", SERVICE,
      "      body: { member: { ...opened.member, mustChangePassword: etat === StaffAccountState.MUST_CHANGE_PASSWORD } },", "      body: { member: opened.member },", ["service", "int-expiration"])
cible("S-4. ⛔ S-104 — l'état rend un membre même au TEMPORAIRE EXPIRÉ (un membre « connecté » qu'aucune route n'accepte)", SERVICE,
      "        if (etat === StaffAccountState.ACTIVE || etat === StaffAccountState.MUST_CHANGE_PASSWORD) {", "        if (true) {", ["service", "int-expiration"])
cible("S-5. ⛔ S-104 — l'état copie la colonne brute au lieu de juger", SERVICE,
      "role: peek.session.role, mustChangePassword: etat === StaffAccountState.MUST_CHANGE_PASSWORD };", "role: peek.session.role, mustChangePassword: peek.session.mustChangePassword };", ["service", "int-expiration"])
cible("S-6. ⛔ MP-41 — la connexion juge l'état avec `new Date()` et non l'heure de la base rendue avec le membre", SERVICE,
      "    const etat = member === null ? null : etatDuCompte(member, member.now);", "    const etat = member === null ? null : etatDuCompte(member, new Date());", ["service", "sources"])

# ── B — le SERVICE DE GESTION (`staff-members.service.ts`, K-19 à K-22, R-5, R-6).
cible("B-1. ⛔ R-5 — K-20 transmet le mot de passe en CLAIR au magasin (il ne doit recevoir que le hachage)", SERVICE_MEMBRES,
      "      role: input.role,\n      passwordHash\n    });", "      role: input.role,\n      passwordHash: temporaire\n    });", ["service-membres", "sources"])
cible("B-2. ⛔ R-5 — K-21 transmet le mot de passe en CLAIR au magasin", SERVICE_MEMBRES,
      "    const reinitialise = await this.store.resetMemberPassword({ ...acteurDe(user, staff), memberId, passwordHash });",
      "    const reinitialise = await this.store.resetMemberPassword({ ...acteurDe(user, staff), memberId, passwordHash: temporaire });", ["service-membres", "sources"])
cible("B-3. ⛔ R-6 — l'acteur de l'audit est l'identifiant de SESSION et non celui du Manager", SERVICE_MEMBRES,
      "actorMemberId: staff.memberId, proProfileId: staff.proProfileId", "actorMemberId: staff.sessionId, proProfileId: staff.proProfileId", ["service-membres", "int-membres"])
cible("B-4. ⛔ la salle de l'action est l'identifiant du compte commun, non celle du PROFIL du garde", SERVICE_MEMBRES,
      "actorMemberId: staff.memberId, proProfileId: staff.proProfileId", "actorMemberId: staff.memberId, proProfileId: user.userId", ["service-membres", "int-membres"])
cible("B-5. ⛔ la liste est demandée pour l'identifiant du MEMBRE et non pour la salle du garde", SERVICE_MEMBRES,
      "    const lignes = await this.store.listMembers(staff.proProfileId);", "    const lignes = await this.store.listMembers(staff.memberId);", ["service-membres", "int-membres"])
cible("B-6. ⛔ l'état d'un membre n'est plus JUGÉ (la liste copie le statut)", SERVICE_MEMBRES,
      "    state: etatDuCompte(ligne, ligne.now),", '    state: ligne.status === "ACTIVE" ? "ACTIVE" : "DISABLED",', ["service-membres", "int-membres"])
cible("B-7. ⛔ MP-11 — la liste rend l'échéance du mot de passe (un champ de plus que les six permis)", SERVICE_MEMBRES,
      "    createdAt: ligne.createdAt.toISOString()\n  };", "    createdAt: ligne.createdAt.toISOString(),\n    expiresAt: ligne.passwordExpiresAt.toISOString()\n  };", ["service-membres", "int-membres"])
cible("B-8. ⛔ un membre DÉSACTIVÉ est traité comme introuvable à la réinitialisation (404 au lieu de 409)", SERVICE_MEMBRES,
      '      throw reinitialise.reason === "disabled" ? new ConflictException(corpsDErreur(StaffErrorCode.STAFF_MEMBER_DISABLED)) : membreIntrouvable();', "      throw membreIntrouvable();", ["service-membres", "int-membres"])
cible("B-9. ⛔ le DERNIER Manager est traité comme introuvable (404 au lieu de 409 `STAFF_LAST_MANAGER`)", SERVICE_MEMBRES,
      '      throw desactive.reason === "lastManager" ? new ConflictException(corpsDErreur(StaffErrorCode.STAFF_LAST_MANAGER)) : membreIntrouvable();', "      throw membreIntrouvable();", ["service-membres", "int-dernier-manager"])
cible("B-10. ⛔ un nom déjà pris rend le code d'une activation déjà faite", SERVICE_MEMBRES,
      "    if (!cree.ok) throw new ConflictException(corpsDErreur(StaffErrorCode.STAFF_ACCOUNT_NAME_TAKEN));",
      "    if (!cree.ok) throw new ConflictException(corpsDErreur(StaffErrorCode.STAFF_ALREADY_ACTIVATED));", ["service-membres", "int-membres"])
cible("B-11. ⛔ un tirage qui ne fait pas un mot de passe valable n'est plus REFAIT : un mot de passe fixe est rendu", SERVICE_MEMBRES,
      "      if (tire !== null) return tire;", '      return tire ?? "Abcd1234efgh";', ["service-membres"])
cible("B-12. ⛔ l'échéance rendue avec le temporaire est la date de création du membre", SERVICE_MEMBRES,
      "temporaryPassword: temporaire, temporaryPasswordExpiresAt: cree.member.passwordExpiresAt.toISOString() };",
      "temporaryPassword: temporaire, temporaryPasswordExpiresAt: cree.member.createdAt.toISOString() };", ["service-membres", "int-membres"])
cible("B-13. ⛔ le hachage stocké n'est pas celui du temporaire rendu (un autre mot de passe est haché)", SERVICE_MEMBRES,
      "    const passwordHash = await this.passwords.hash(temporaire);\n    const cree = await this.store.createMember({", '    const passwordHash = await this.passwords.hash("Motdepasse1");\n    const cree = await this.store.createMember({', ["service-membres", "int-membres"])
cible("B-14. ⛔ la clé d'unicité du nom n'est plus normalisée (« KARIM » et « karim » sont deux comptes)", SERVICE_MEMBRES,
      "      accountNameKey: normalizeStaffAccountName(input.accountName),", "      accountNameKey: input.accountName,", ["service-membres", "int-membres"])

# ── A — le MAGASIN, ce que ce lot y AJOUTE (`staff-store.prisma.ts`, K-19 à K-22, R-4, R-6).
cible("A-1. ⛔ `findMember` ne lit plus l'heure de la base sous son nom (la connexion ne peut plus juger l'état)", MAGASIN,
      '             password_expires_at AS "passwordExpiresAt", now() AS "now"\n        FROM pro_staff_members\n       WHERE pro_profile_id = ${proProfileId}::uuid AND account_name_key = ${accountNameKey}',
      '             password_expires_at AS "passwordExpiresAt", now() AS "maintenant"\n        FROM pro_staff_members\n       WHERE pro_profile_id = ${proProfileId}::uuid AND account_name_key = ${accountNameKey}', ["magasin", "int-expiration"])
cible("A-2. ⛔ le garde ne reçoit plus l'heure de la base avec la session", MAGASIN,
      'm.password_expires_at AS "passwordExpiresAt", now() AS "now"`;\n    const vivante = lignes[0];', 'm.password_expires_at AS "passwordExpiresAt", now() AS "maintenant"`;\n    const vivante = lignes[0];', ["magasin", "int-expiration"])
cible("A-3. ⛔ l'état de session ne reçoit plus l'heure de la base avec la session", MAGASIN,
      'm.password_expires_at AS "passwordExpiresAt", now() AS "now"\n        FROM pro_staff_sessions s JOIN', 'm.password_expires_at AS "passwordExpiresAt", now() AS "maintenant"\n        FROM pro_staff_sessions s JOIN', ["magasin", "int-expiration"])
cible("A-4. ⛔ la liste n'est plus dans l'ordre de CRÉATION (elle suit l'ordre alphabétique)", MAGASIN,
      "       ORDER BY created_at, id`;", "       ORDER BY account_name, id`;", ["magasin", "int-membres"])
cible("A-5. ⛔ MP-11 — la liste SÉLECTIONNE le hachage du mot de passe", MAGASIN,
      'created_at AS "createdAt", now() AS "now"\n        FROM pro_staff_members\n       WHERE pro_profile_id = ${proProfileId}::uuid\n       ORDER BY created_at, id',
      'created_at AS "createdAt", password_hash AS "passwordHash", now() AS "now"\n        FROM pro_staff_members\n       WHERE pro_profile_id = ${proProfileId}::uuid\n       ORDER BY created_at, id', ["magasin"])
cible("A-6. ⛔ la liste n'est plus filtrée par la salle (les membres de TOUTES les salles)", MAGASIN,
      "       WHERE pro_profile_id = ${proProfileId}::uuid\n       ORDER BY created_at, id", "       WHERE ${proProfileId}::uuid IS NOT NULL\n       ORDER BY created_at, id", ["magasin", "int-membres"])
cible("A-7. ⛔ le temporaire créé vaut 90 jours (le levier des mots de passe ordinaires) et non sept", MAGASIN,
      "                now() + make_interval(days => ${STAFF_LIMITS.TEMPORARY_PASSWORD_DAYS}::int), true, ${input.actorMemberId}::uuid)",
      "                now() + make_interval(days => ${STAFF_LIMITS.PASSWORD_VALIDITY_DAYS}::int), true, ${input.actorMemberId}::uuid)", ["magasin", "int-membres"])
cible("A-8. ⛔ le temporaire créé n'est plus « à changer » (`must_change_password` faux)", MAGASIN,
      "::int), true, ${input.actorMemberId}::uuid)", "::int), false, ${input.actorMemberId}::uuid)", ["magasin", "int-membres"])
cible("A-9. ⛔ le créateur du membre n'est plus enregistré (`created_by_member_id` nul)", MAGASIN,
      "::int), true, ${input.actorMemberId}::uuid)", "::int), true, NULL)", ["magasin", "int-membres"])
cible("A-10. ⛔ un nom déjà pris n'est plus refusé par la base (le conflit met à jour la ligne existante au lieu de ne rien insérer)", MAGASIN,
      "        ON CONFLICT (pro_profile_id, account_name_key) DO NOTHING\n        RETURNING id::text AS id, account_name AS \"accountName\", role::text AS role, status::text AS status,",
      "        ON CONFLICT (pro_profile_id, account_name_key) DO UPDATE SET updated_at = now()\n        RETURNING id::text AS id, account_name AS \"accountName\", role::text AS role, status::text AS status,", ["int-membres"])
cible("A-11. ⛔ R-6 — la création n'écrit AUCUNE ligne d'audit (une action sans trace)", MAGASIN,
      '      await ecrireAudit(tx, input.actor, input.actorMemberId, { action: "staff.member_create", entityType: "staff_member", entityId: membre.id, after: { role: input.role } });', "      void membre;", ["magasin", "int-membres"])
cible("A-12. ⛔ la réinitialisation ne VERROUILLE plus le membre (`FOR UPDATE` retiré)", MAGASIN,
      "         FOR UPDATE`;\n      const cible = verrou[0];", "         `;\n      const cible = verrou[0];", ["magasin"])
cible("A-13. ⛔ la réinitialisation ne filtre plus par la salle (un membre d'une AUTRE salle est réinitialisé)", MAGASIN,
      "         WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid\n         FOR UPDATE`;\n      const cible = verrou[0];",
      "         WHERE id = ${input.memberId}::uuid AND ${input.proProfileId}::uuid IS NOT NULL\n         FOR UPDATE`;\n      const cible = verrou[0];", ["magasin", "int-membres"])
cible("A-14. ⛔ S-105 — les sessions réinitialisées prennent la fin LOGOUT et non PASSWORD_CHANGED", MAGASIN,
      "end_reason = 'PASSWORD_CHANGED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL`;", "end_reason = 'LOGOUT' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL`;", ["magasin", "int-membres"])
cible("A-15. ⛔ S-105 — les APPAREILS du membre ne sont plus révoqués par la réinitialisation", MAGASIN,
      "UPDATE pro_staff_devices SET revoked_at = now() WHERE member_id", "UPDATE pro_staff_devices SET revoked_at = revoked_at WHERE member_id", ["magasin", "int-membres"])
cible("A-16. ⛔ MP-29 — la réinitialisation ne remet plus « mot de passe à changer »", MAGASIN,
      "               must_change_password = true, password_failed_count = 0, password_locked_until = NULL, updated_at = now()\n         WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'",
      "               must_change_password = false, password_failed_count = 0, password_locked_until = NULL, updated_at = now()\n         WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'", ["magasin", "int-membres"])
cible("A-17. ⛔ la réinitialisation ne remet plus les compteurs d'échecs ni la pause à zéro", MAGASIN,
      "password_failed_count = 0, password_locked_until = NULL, updated_at = now()\n         WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'",
      "password_failed_count = password_failed_count, password_locked_until = password_locked_until, updated_at = now()\n         WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'", ["magasin", "int-membres"])
cible("A-18. ⛔ R-6 — la charge utile de l'audit de réinitialisation intervertit sessions et appareils", MAGASIN,
      "        after: { sessionsEnded: sessions, devicesRevoked: appareils }", "        after: { sessionsEnded: appareils, devicesRevoked: sessions }", ["magasin"])
cible("A-19. ⛔ un membre désactivé n'est plus refusé à la réinitialisation (l'UPDATE conditionné échoue ensuite : une 500)", MAGASIN,
      '      if (cible.status !== "ACTIVE") return { ok: false, reason: "disabled" };', '      if (false) return { ok: false, reason: "disabled" };', ["magasin", "int-membres"])
cible("A-20. ⛔ R-4 — la désactivation ne prend plus le verrou du PROFIL (L1) : deux désactivations ne se sérialisent plus", MAGASIN,
      "      await tx.$queryRaw`SELECT id::text AS id FROM pro_profiles WHERE id = ${input.proProfileId}::uuid FOR UPDATE`;", "      void input;", ["magasin", "int-dernier-manager"])
cible("A-21. ⛔ R-4 — le comptage des Managers compte aussi les DÉSACTIVÉS (un Manager éteint empêche la règle de jouer)", MAGASIN,
      "AND role = 'MANAGER' AND status = 'ACTIVE'`;\n      const verdict", "AND role = 'MANAGER'`;\n      const verdict", ["magasin", "int-dernier-manager"])
cible("A-22. ⛔ R-4 — le nombre de Managers actifs rendu à la décision est fixe (99) : le dernier Manager n'est plus reconnu", MAGASIN,
      "activeManagers: compte[0]?.n ?? 0", "activeManagers: 99", ["magasin", "int-dernier-manager"])
cible("A-23. ⛔ D305 — le CAS du statut est retiré à la désactivation (l'UPDATE n'est plus conditionné à `status = 'ACTIVE'`)", MAGASIN,
      "        UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now(), updated_at = now()\n         WHERE id = ${input.memberId}::uuid AND status = 'ACTIVE'",
      "        UPDATE pro_staff_members SET status = 'DISABLED', disabled_at = now(), updated_at = now()\n         WHERE id = ${input.memberId}::uuid AND true", ["magasin"])
cible("A-24. ⛔ MP-30 — les sessions d'un membre désactivé prennent la fin LOGOUT et non DISABLED", MAGASIN,
      "end_reason = 'DISABLED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL", "end_reason = 'LOGOUT' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL", ["magasin", "int-membres"])
cible("A-25. ⛔ MP-30 — les sessions d'un membre désactivé ne sont plus terminées (le filtre est inversé)", MAGASIN,
      "end_reason = 'DISABLED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NULL", "end_reason = 'DISABLED' WHERE member_id = ${input.memberId}::uuid AND ended_at IS NOT NULL", ["magasin", "int-membres"])
cible("A-26. ⛔ R-4 — le verdict « dernier Manager » n'est plus appliqué", MAGASIN,
      '      if (verdict === "lastManager") return { ok: false, reason: "lastManager" };', '      if (false) return { ok: false, reason: "lastManager" };', ["magasin", "int-dernier-manager"])
cible("A-27. ⛔ patron de D349 — une désactivation répétée n'est plus un succès sans écriture", MAGASIN,
      '      if (verdict === "alreadyDisabled") return { ok: true, member: cible, sessionsEnded: 0, alreadyDisabled: true };', '      if (false) return { ok: true, member: cible, sessionsEnded: 0, alreadyDisabled: true };', ["magasin", "int-membres"])
cible("A-28. ⛔ la désactivation ne filtre plus par la salle (un membre d'une AUTRE salle est désactivé)", MAGASIN,
      "         WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid\n         FOR UPDATE`;\n      const cible = cibles[0];",
      "         WHERE id = ${input.memberId}::uuid AND ${input.proProfileId}::uuid IS NOT NULL\n         FOR UPDATE`;\n      const cible = cibles[0];", ["magasin", "int-membres"])
cible("A-29. ⛔ R-6 — la désactivation n'écrit AUCUNE ligne d'audit", MAGASIN,
      '      await ecrireAudit(tx, input.actor, input.actorMemberId, { action: "staff.member_disable", entityType: "staff_member", entityId: membre.id, after: { role: membre.role, sessionsEnded: sessions } });', "      void sessions;", ["magasin", "int-membres"])
cible("A-30. ⛔ la désactivation ne VERROUILLE plus le membre visé (`FOR UPDATE` retiré)", MAGASIN,
      "         FOR UPDATE`;\n      const cible = cibles[0];", "         `;\n      const cible = cibles[0];", ["magasin"])
cible("A-31. ⛔ R-6 — l'acteur de l'audit de création est le membre CRÉÉ et non le Manager", MAGASIN,
      '      await ecrireAudit(tx, input.actor, input.actorMemberId, { action: "staff.member_create"', '      await ecrireAudit(tx, input.actor, membre.id, { action: "staff.member_create"', ["magasin", "int-membres"])

# ── D — le CÂBLAGE : décorateurs, contrôleurs, module (R-2).
cible("D-1. ⛔ R-2 — le contrôleur du personnel déclare `salle` à la place de `personnel` (l'employé LIT la liste du personnel)", CTRL_MEMBRES,
      '@RequiresStaffCapability("personnel")\n@Controller("pro/staff/members")', '@RequiresStaffCapability("salle")\n@Controller("pro/staff/members")', ["sources", "int-capacites"])
cible("D-2. ⛔ R-2 — le contrôleur des salles déclare `agenda` au lieu de `salle` (l'employé écrit sur la salle)", VENUES_CTRL,
      '@RequiresStaffCapability("salle")\n@Controller()', '@RequiresStaffCapability("agenda")\n@Controller()', ["sources", "int-capacites"])
cible("D-3. ⛔ R-5 — K-20 ne pose plus `Cache-Control: no-store`", CTRL_MEMBRES,
      '  @HttpCode(HttpStatus.CREATED)\n  @Header("Cache-Control", "no-store")', '  @HttpCode(HttpStatus.CREATED)\n  @Header("X-Neutralise", "oui")', ["sources", "int-membres"])
cible("D-4. ⛔ S-104 — le changement de mot de passe n'est plus la route du membre (un membre « à changer » ne peut plus le faire)", CTRL_SESSION,
      '  @StaffAnyMember()\n  @Post("password")', '  @StaffExempt()\n  @Post("password")', ["sources", "int-capacites", "int-expiration"])
cible("D-5. ⛔ l'identifiant de K-22 n'est plus validé comme UUID (un texte libre part au SQL)", CTRL_MEMBRES,
      '    @Param("id", new ParseUUIDPipe()) id: string\n  ): Promise<StaffMemberDisabledDTO> {', '    @Param("id") id: string\n  ): Promise<StaffMemberDisabledDTO> {', ["sources", "int-membres"])
cible("D-6. ⛔ K-20 n'exige plus le contexte du garde (couche éteinte : une 500 au lieu du 401 `STAFF_SESSION_REQUIRED`)", CTRL_MEMBRES,
      "    return this.service.create(acteur(user), exiger(staff), body);", "    return this.service.create(acteur(user), staff as StaffContext, body);", ["int-membres"])
cible("D-7. ⛔ `@RequiresStaffCapability` ne pose plus la capacité (toutes les routes tombent sous la règle par défaut)", DECOS,
      "SetMetadata(STAFF_CAPABILITY_KEY, capability)", "SetMetadata(STAFF_CAPABILITY_KEY, undefined)", ["garde", "int-capacites"])
cible("D-8. ⛔ le contrôleur du personnel n'est plus enregistré (les quatre routes n'existent plus)", MODULE_STAFF,
      "  controllers: [StaffSessionController, StaffMembersController],", "  controllers: [StaffSessionController],", ["int-membres", "int-capacites"])
cible("D-9. ⛔ `@StaffAnyMember()` ne pose plus la marque (la route du membre n'est plus reconnue)", DECOS,
      "SetMetadata(STAFF_ANY_MEMBER_KEY, true)", "SetMetadata(STAFF_ANY_MEMBER_KEY, false)", ["garde", "int-capacites"])
cible("D-10. ⛔ R-5 — K-20 pose `no-cache` à la place de `no-store`", CTRL_MEMBRES,
      '  @HttpCode(HttpStatus.CREATED)\n  @Header("Cache-Control", "no-store")', '  @HttpCode(HttpStatus.CREATED)\n  @Header("Cache-Control", "no-cache")', ["int-membres", "int-journal"])

# ── K — le CONTRAT (`packages/types/src/staff.ts`) et L — le journal (`app.module.ts`).
cible("K-1. ⛔ MP-43 — le temporaire vaut 90 jours au levier (et non sept)", TYPES,
      "  TEMPORARY_PASSWORD_DAYS: 7,", "  TEMPORARY_PASSWORD_DAYS: 90,", ["contrat", "int-membres"])
cible("K-2. ⛔ K-20 accepte une clé de plus (le Manager pourrait CHOISIR le mot de passe)", TYPES,
      '  .strict("staff.validation.unknownKey");\nexport type StaffMemberCreateInput', "  .passthrough();\nexport type StaffMemberCreateInput", ["contrat", "int-membres"])
cible("K-3. ⛔ K-20 n'admet plus le rôle EMPLOYEE", TYPES,
      "    role: z.enum([StaffRole.MANAGER, StaffRole.EMPLOYEE], {", "    role: z.enum([StaffRole.MANAGER, StaffRole.MANAGER], {", ["contrat", "int-membres"])
cible("K-4. ⛔ le message du dernier Manager est celui d'un membre désactivé (deux codes, un message)", TYPES,
      '  STAFF_LAST_MANAGER: "staff.errors.lastManager"\n});', '  STAFF_LAST_MANAGER: "staff.errors.memberDisabled"\n});', ["contrat"])
cible("K-5. ⛔ le code du refus de capacité change de valeur (le client ne le reconnaît plus)", TYPES,
      '  STAFF_CAPABILITY_DENIED: "STAFF_CAPABILITY_DENIED",\n  /** 404', '  STAFF_CAPABILITY_DENIED: "STAFF_CAPABILITY_DENIEDX",\n  /** 404', ["contrat", "garde", "int-capacites"])
cible("L-1. ⛔ R-5 — le champ `set-cookie` de réponse n'est plus masqué au journal (les cookies du personnel y entreraient)", APP_MODULE,
      """, 'res.headers["set-cookie"]']""", """, 'req.headers.x-neutralise']""", ["int-journal"])

# ── I — le CLIENT D'API (`packages/api-client/src/staff-client.ts`, D182).
cible("I-1. ⛔ K-21 : le chemin du client perd `-password` (il ne vise plus la route)", CLIENT,
      "`/pro/staff/members/${memberId}/reset-password`", "`/pro/staff/members/${memberId}/reset`", ["client-api", "int-contrat"])
cible("I-2. ⛔ K-22 : le client désactive en GET et non en POST", CLIENT,
      "request<StaffMemberDisabledDTO>(`/pro/staff/members/${memberId}/disable`, { method: \"POST\" })", "request<StaffMemberDisabledDTO>(`/pro/staff/members/${memberId}/disable`, { method: \"GET\" })", ["client-api", "int-contrat"])
cible("I-3. ⛔ K-19 : le client LIT la liste en POST", CLIENT,
      'request<StaffMembersListDTO>("/pro/staff/members")', 'request<StaffMembersListDTO>("/pro/staff/members", { method: "POST" })', ["client-api", "int-contrat"])


# ── TITRES : le titre (ou un fragment) du test qui doit rougir, par « identifiant|mesure ». ÉCRIT À PARTIR DU RELEVÉ de la découverte (jamais de mémoire) ; une mesure absente d'ici n'a pas mordu au relevé.
# <<TITRES>>
TITRES: dict[str, str] = {
    "E-1|etat": "etatDuCompte — un mot de passe ORDINAIRE (must_change_password faux) > ⛔ le cas RÉEL : il expire à l'instant e",
    "E-1|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ S-104 — un TEMPORAIRE EXPIRÉ : la connexion ",
    "E-1|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "E-2|etat": "etatDuCompte — un membre DÉSACTIVÉ l'est quoi qu'il en soit du mot de passe > désactivé : DISABLED, que le mot",
    "E-3|etat": "etatDuCompte — un mot de passe TEMPORAIRE (must_change_password vrai : le SEUL marqueur, aucune colonne « temp",
    "E-3|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ S-104 — un TEMPORAIRE EXPIRÉ : la connexion ",
    "E-3|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "E-4|etat": "etatDuCompte — un mot de passe ORDINAIRE (must_change_password faux) > ⛔ le cas RÉEL : il expire à l'instant e",
    "E-4|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ S-104 — un mot de passe ORDINAIRE de 90 jour",
    "E-4|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "E-5|etat": "etatDuCompte — un mot de passe TEMPORAIRE (must_change_password vrai : le SEUL marqueur, aucune colonne « temp",
    "E-5|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ S-104 — un TEMPORAIRE non expiré (must_chang",
    "E-5|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "E-6|etat": "etatDuCompte — un mot de passe ORDINAIRE (must_change_password faux) > encore valable → ACTIVE",
    "E-6|sources": "les sources du personnel > ⛔ MP-41 — AUCUNE horloge côté API dans les sources du personnel : tout ce qui se dé",
    "V-1|acces": "l'ÉTAT du compte passe avant tout (R-3) > DÉSACTIVÉ ou TEMPORAIRE EXPIRÉ : refus de SESSION, pour tout rôle, t",
    "V-1|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "V-2|acces": "l'ÉTAT du compte passe avant tout (R-3) > ⛔ « MOT DE PASSE À CHANGER » : SEULE la route du membre sur sa propr",
    "V-2|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "V-3|acces": "l'ÉTAT du compte passe avant tout (R-3) > ⛔ « MOT DE PASSE À CHANGER » : SEULE la route du membre sur sa propr",
    "V-3|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "V-4|acces": "un compte ACTIF : la route du membre sur sa propre session passe pour TOUT rôle (se déconnecter, changer son m",
    "V-4|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > la",
    "V-5|acces": "la capacité DÉCLARÉE par la route décide, selon la méthode (table du cadrage § 5.4, consigne § 1 c) > ⛔ salle,",
    "V-5|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "V-6|acces": "la capacité DÉCLARÉE par la route décide, selon la méthode (table du cadrage § 5.4, consigne § 1 c) > ⛔ salle,",
    "V-6|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "V-7|acces": "S-107 — SANS déclaration : les écritures sont au MANAGER seul, les lectures sont à tous (une route oubliée est",
    "V-7|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "V-8|acces": "S-107 — SANS déclaration : les écritures sont au MANAGER seul, les lectures sont à tous (une route oubliée est",
    "V-8|garde": "StaffSessionGuard — la couche ACTIVÉE : une session est exigée à CHAQUE requête Pro (MP-7) > une session vivan",
    "V-9|acces": "la capacité DÉCLARÉE par la route décide, selon la méthode (table du cadrage § 5.4, consigne § 1 c) > ⛔ salle,",
    "V-9|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "V-10|acces": "la capacité DÉCLARÉE par la route décide, selon la méthode (table du cadrage § 5.4, consigne § 1 c) > la métho",
    "V-11|acces": "la capacité DÉCLARÉE par la route décide, selon la méthode (table du cadrage § 5.4, consigne § 1 c) > ⛔ salle,",
    "C-1|capacites": "la table des capacités = celle du cadrage § 5.4 (adoptée COMME DÉFAUT par la consigne, § 1 c) > ⛔ pour CHAQUE ",
    "C-2|capacites": "la table des capacités = celle du cadrage § 5.4 (adoptée COMME DÉFAUT par la consigne, § 1 c) > ⛔ pour CHAQUE ",
    "C-3|capacites": "la table des capacités = celle du cadrage § 5.4 (adoptée COMME DÉFAUT par la consigne, § 1 c) > ⛔ pour CHAQUE ",
    "C-4|capacites": "la table des capacités = celle du cadrage § 5.4 (adoptée COMME DÉFAUT par la consigne, § 1 c) > ⛔ pour CHAQUE ",
    "C-5|capacites": "la table des capacités = celle du cadrage § 5.4 (adoptée COMME DÉFAUT par la consigne, § 1 c) > ⛔ pour CHAQUE ",
    "C-6|capacites": "`peut(role, capacité, acte)` — S-239 : trois états par rôle ne tiennent pas dans deux arguments > ⛔ FERMÉ PAR ",
    "C-7|capacites": "`peut(role, capacité, acte)` — S-239 : trois états par rôle ne tiennent pas dans deux arguments > sans `acte`,",
    "C-8|capacites": "`peut(role, capacité, acte)` — S-239 : trois états par rôle ne tiennent pas dans deux arguments > la table est",
    "C-9|acces": "la capacité DÉCLARÉE par la route décide, selon la méthode (table du cadrage § 5.4, consigne § 1 c) > ⛔ salle,",
    "C-9|capacites": "la table des capacités = celle du cadrage § 5.4 (adoptée COMME DÉFAUT par la consigne, § 1 c) > ⛔ pour CHAQUE ",
    "C-10|capacites": "`peut(role, capacité, acte)` — S-239 : trois états par rôle ne tiennent pas dans deux arguments > ⛔ FERMÉ PAR ",
    "M-1|membres-politique": "disableVerdict — désactiver un EMPLOYÉ ou ce qui l'est déjà > un membre DÉJÀ désactivé : « alreadyDisabled » —",
    "M-2|membres-politique": "disableVerdict — désactiver un MANAGER > ⛔ le DERNIER Manager actif (un seul) ne se désactive pas — que ce soi",
    "M-3|membres-politique": "disableVerdict — désactiver un EMPLOYÉ ou ce qui l'est déjà > un EMPLOYÉ n'est JAMAIS bloqué par la règle (il ",
    "M-4|membres-politique": "disableVerdict — désactiver un MANAGER > deux Managers actifs ou plus : la désactivation de l'un d'eux est per",
    "T-1|temporaire": "temporaryPasswordFrom — l'échantillonnage AVEC REJET (le biais modulo) > ⛔ un octet ≥ le seuil de rejet n'est ",
    "T-2|temporaire": "temporaryPasswordFrom — l'échantillonnage AVEC REJET (le biais modulo) > ⛔ un octet ≥ le seuil de rejet n'est ",
    "T-4|temporaire": "temporaryPasswordFrom — l'échantillonnage AVEC REJET (le biais modulo) > ⛔ une chaîne SANS chiffre ou SANS let",
    "T-4|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ un tirage qui ne fer",
    "T-5|temporaire": "l'alphabet > 31 symboles DISTINCTS, sans les caractères qui se confondent à l'œil (0, O, 1, I, l) — un Manager",
    "T-6|temporaire": "temporaryPasswordFrom — l'échantillonnage AVEC REJET (le biais modulo) > ⛔ le seuil lui-même : l'octet (seuil ",
    "T-7|temporaire": "temporaryPasswordFrom — l'échantillonnage AVEC REJET (le biais modulo) > ⛔ un octet ≥ le seuil de rejet n'est ",
    "T-7|sources": "les sources du personnel > ⛔ S-109 (D354) — AUCUN `Math.random` dans les sources du personnel : le mot de pass",
    "G-1|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "G-1|sources": "les sources du personnel > ⛔ MP-41 — AUCUNE horloge côté API dans les sources du personnel : tout ce qui se dé",
    "G-2|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "G-3|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "G-4|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "G-5|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > un",
    "G-6|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > la",
    "G-7|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "G-8|garde": "StaffSessionGuard — S-104 : le mot de passe À CHANGER n'ouvre que le changement de mot de passe (R-3), jugé à ",
    "G-9|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "S-1|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ S-104 — un TEMPORAIRE EXPIRÉ : la connexion ",
    "S-3|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ S-104 — un mot de passe ORDINAIRE de 90 jour",
    "S-4|service": "state — K-17 : exemptée, jamais un refus > ⛔ S-104 — un TEMPORAIRE EXPIRÉ n'a pas de session : l'état rend `me",
    "S-5|service": "state — K-17 : exemptée, jamais un refus > ⛔ S-104 — l'état d'un membre dont le mot de passe est À CHANGER (te",
    "S-6|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ MP-41 — l'état est jugé à l'HEURE DE LA BASE",
    "S-6|sources": "les sources du personnel > ⛔ MP-41 — AUCUNE horloge côté API dans les sources du personnel : tout ce qui se dé",
    "B-1|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ le magasin ne reçoit",
    "B-2|service-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, jamais le précédent > ⛔ génère un temporaire, le hache, ne trans",
    "B-3|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ l'ACTEUR vient du co",
    "B-4|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ l'ACTEUR vient du co",
    "B-5|service-membres": "K-19 — la liste > demande les membres de la salle du GARDE (jamais une salle venue du corps), et chaque membre",
    "B-6|service-membres": "K-19 — la liste > demande les membres de la salle du GARDE (jamais une salle venue du corps), et chaque membre",
    "B-7|service-membres": "K-19 — la liste > ⛔ chaque membre n'a QUE les champs listés : jamais un hachage, un compteur, un verrou, une d",
    "B-8|service-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, jamais le précédent > membre introuvable DANS CETTE SALLE : 404 ",
    "B-9|service-membres": "K-22 — désactiver : « jamais zéro Manager » > ⛔ le dernier Manager : 409 `STAFF_LAST_MANAGER`, une erreur MÉTI",
    "B-10|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ un nom déjà pris (à ",
    "B-11|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ un tirage qui ne fer",
    "B-12|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ le magasin ne reçoit",
    "B-13|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ le magasin ne reçoit",
    "B-14|service-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ l'ACTEUR vient du co",
    "A-1|magasin": "findMember — rend l'ÉCHÉANCE du mot de passe et l'HEURE DE LA BASE dans la MÊME instruction (S-104, S-241) > ⛔",
    "A-2|magasin": "touchSession et peekSession — rendent le statut, l'échéance du mot de passe et l'HEURE DE LA BASE (S-241) > ⛔ ",
    "A-3|magasin": "touchSession et peekSession — rendent le statut, l'échéance du mot de passe et l'HEURE DE LA BASE (S-241) > ⛔ ",
    "A-4|magasin": "listMembers — K-19 : UNE lecture, les membres de la salle, aucun secret > ⛔ une seule requête brute, en lectur",
    "A-5|magasin": "listMembers — K-19 : UNE lecture, les membres de la salle, aucun secret > ⛔ la liste ne SÉLECTIONNE aucun secr",
    "A-6|magasin": "listMembers — K-19 : UNE lecture, les membres de la salle, aucun secret > ⛔ une seule requête brute, en lectur",
    "A-7|magasin": "createMember — K-20 : le membre ET son audit dans UNE transaction, mot de passe temporaire de 7 jours > ⛔ l'in",
    "A-8|magasin": "createMember — K-20 : le membre ET son audit dans UNE transaction, mot de passe temporaire de 7 jours > ⛔ l'in",
    "A-9|magasin": "createMember — K-20 : le membre ET son audit dans UNE transaction, mot de passe temporaire de 7 jours > ⛔ l'in",
    "A-11|magasin": "createMember — K-20 : le membre ET son audit dans UNE transaction, mot de passe temporaire de 7 jours > ⛔ R-6 ",
    "A-12|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ l'OR",
    "A-13|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ l'OR",
    "A-14|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ S-10",
    "A-15|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ S-10",
    "A-16|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ le r",
    "A-17|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ le r",
    "A-18|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ R-6 ",
    "A-19|magasin": "resetMemberPassword — K-21 : membre (L2), appareils (L3), sessions (L4), audit — dans UNE transaction > ⛔ un m",
    "A-20|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-21|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-22|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "E-3|int-expiration": "un mot de passe TEMPORAIRE : à changer tant qu'il est valable, REFUSÉ une fois expiré > ⛔ un temporaire EXPIRÉ",
    "E-4|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "E-5|int-expiration": "un mot de passe TEMPORAIRE : à changer tant qu'il est valable, REFUSÉ une fois expiré > ⛔ un temporaire VALABL",
    "V-9|int-capacites": "une session d'EMPLOYÉ sur TOUTES les routes atteignables par un PRO (MP-21, MP-32) > ⛔ pour chaque route : ref",
    "C-1|int-capacites": "les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code > ⛔ l'employé ",
    "C-2|int-capacites": "les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code > ⛔ l'employé ",
    "C-3|int-capacites": "les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code > ⛔ l'employé ",
    "C-4|int-capacites": "les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code > l'employé PE",
    "G-2|int-expiration": "un mot de passe TEMPORAIRE : à changer tant qu'il est valable, REFUSÉ une fois expiré > ⛔ une session ouverte ",
    "G-3|int-capacites": "une session d'EMPLOYÉ sur TOUTES les routes atteignables par un PRO (MP-21, MP-32) > ⛔ AUCUN refus ne dit pour",
    "G-4|int-capacites": "une session d'EMPLOYÉ sur TOUTES les routes atteignables par un PRO (MP-21, MP-32) > ⛔ pour chaque route : ref",
    "G-5|int-capacites": "les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code > ⛔ l'employé ",
    "G-6|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "G-7|int-capacites": "une session d'EMPLOYÉ sur TOUTES les routes atteignables par un PRO (MP-21, MP-32) > ⛔ AUCUN refus ne dit pour",
    "G-9|int-capacites": "une session d'EMPLOYÉ sur TOUTES les routes atteignables par un PRO (MP-21, MP-32) > ⛔ pour chaque route : ref",
    "S-1|int-expiration": "un mot de passe TEMPORAIRE : à changer tant qu'il est valable, REFUSÉ une fois expiré > ⛔ un temporaire EXPIRÉ",
    "S-2|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "S-3|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "S-4|int-expiration": "un mot de passe TEMPORAIRE : à changer tant qu'il est valable, REFUSÉ une fois expiré > ⛔ une session ouverte ",
    "S-5|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "B-3|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "B-4|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "B-5|int-membres": "K-19 — lister les membres : ceux de MA salle, leur ÉTAT, aucun secret > ⛔ les membres de la salle A, DANS L'OR",
    "B-6|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "B-7|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "B-8|int-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105",
    "B-9|int-dernier-manager": "le dernier Manager actif — jamais désactivé, même par lui-même (MP-31) > ⛔ un Manager SEUL qui se désactive lu",
    "B-10|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ un nom déjà pris À L",
    "B-12|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ en BASE : le hachage",
    "B-13|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ en BASE : le hachage",
    "B-14|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ un nom déjà pris À L",
    "A-1|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "A-2|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "A-3|int-expiration": "un mot de passe TEMPORAIRE : à changer tant qu'il est valable, REFUSÉ une fois expiré > ⛔ une session ouverte ",
    "A-4|int-membres": "K-19 — lister les membres : ceux de MA salle, leur ÉTAT, aucun secret > ⛔ les membres de la salle A, DANS L'OR",
    "A-6|int-membres": "K-19 — lister les membres : ceux de MA salle, leur ÉTAT, aucun secret > ⛔ les membres de la salle A, DANS L'OR",
    "A-7|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ en BASE : le hachage",
    "A-8|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "A-9|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ en BASE : le hachage",
    "A-10|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ un nom déjà pris À L",
    "A-11|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ R-6 — UNE ligne d'au",
    "A-13|int-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105",
    "A-14|int-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105",
    "A-15|int-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105",
    "A-16|int-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105",
    "A-17|int-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105",
    "A-19|int-membres": "K-21 — réinitialiser : un NOUVEAU temporaire, et la fin de TOUTES les sessions et de TOUS les appareils (S-105",
    "A-20|int-dernier-manager": "deux Managers qui se désactivent l'un l'autre EN MÊME TEMPS (MP-6) > ⛔ ENTRELACEMENT FORCÉ — le verrou du prof",
    "A-21|int-dernier-manager": "le dernier Manager actif — jamais désactivé, même par lui-même (MP-31) > ⛔ un second Manager DÉSACTIVÉ ne comp",
    "A-22|int-dernier-manager": "le dernier Manager actif — jamais désactivé, même par lui-même (MP-31) > ⛔ un Manager SEUL qui se désactive lu",
    "A-24|int-membres": "K-22 — désactiver : les sessions finissent `DISABLED`, jamais un second effet (MP-4, MP-30, MP-31) > ⛔ MP-30 —",
    "A-25|int-membres": "K-22 — désactiver : les sessions finissent `DISABLED`, jamais un second effet (MP-4, MP-30, MP-31) > ⛔ MP-30 —",
    "A-26|int-dernier-manager": "le dernier Manager actif — jamais désactivé, même par lui-même (MP-31) > ⛔ un Manager SEUL qui se désactive lu",
    "A-28|int-membres": "K-22 — désactiver : les sessions finissent `DISABLED`, jamais un second effet (MP-4, MP-30, MP-31) > un membre",
    "A-29|int-membres": "K-22 — désactiver : les sessions finissent `DISABLED`, jamais un second effet (MP-4, MP-30, MP-31) > ⛔ R-6 — U",
    "A-31|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ R-6 — UNE ligne d'au",
    "D-1|int-capacites": "les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code > ⛔ l'employé ",
    "D-2|int-capacites": "les CAS NOMMÉS de la consigne (§ 1 c) — second oracle, qui ne passe par aucune fonction du code > ⛔ l'employé ",
    "D-3|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "D-4|int-expiration": "un mot de passe ORDINAIRE de 90 jours EXPIRÉ : la connexion est admise, et n'ouvre que le changement de mot de",
    "D-6|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > couche ÉTEINTE (aucune",
    "D-7|int-capacites": "le collecteur — garde-fou du garde-fou > l'extraction trouve la matrice attendue : au moins 60 routes atteigna",
    "D-8|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "D-10|int-journal": "le journal réel de l'application ne porte AUCUNE valeur secrète du personnel > ⛔ K-20 : le temporaire rendu pa",
    "D-10|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "K-1|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ en BASE : le hachage",
    "K-2|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ un corps invalide es",
    "K-3|int-membres": "K-20 — créer un membre : le mot de passe temporaire est GÉNÉRÉ, haché, rendu UNE fois > ⛔ 201, `Cache-Control:",
    "L-1|int-journal": "le journal réel de l'application ne porte AUCUNE valeur secrète du personnel > ⛔ la CONNEXION d'un membre avec",
    "I-1|int-contrat": "B6 — contrat de CHEMINS entre le client et l'API (D122) > CHAQUE chemin appelé par @zwadj/api-client existe su",
    "I-2|int-contrat": "B6 — contrat de CHEMINS entre le client et l'API (D122) > CHAQUE chemin appelé par @zwadj/api-client existe su",
    "T-3|temporaire": "temporaryPasswordFrom — l'échantillonnage AVEC REJET (le biais modulo) > pas assez d'octets ACCEPTÉS pour fair",
    "S-2|service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ S-104 — un mot de passe ORDINAIRE de 90 jour",
    "A-23|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-24|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-25|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-26|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-27|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-30|magasin": "disableMember — K-22 : « jamais zéro Manager » — le profil (L1) d'abord, le comptage SOUS ce verrou, puis le m",
    "A-31|magasin": "createMember — K-20 : le membre ET son audit dans UNE transaction, mot de passe temporaire de 7 jours > ⛔ R-6 ",
    "D-1|sources": "les DÉCLARATIONS DE CAPACITÉ des contrôleurs (R-2, D354) — chaque contrôleur Pro dit ce qu'il déclare > ⛔ chaq",
    "D-2|sources": "les DÉCLARATIONS DE CAPACITÉ des contrôleurs (R-2, D354) — chaque contrôleur Pro dit ce qu'il déclare > ⛔ chaq",
    "D-3|sources": "les DÉCLARATIONS DE CAPACITÉ des contrôleurs (R-2, D354) — chaque contrôleur Pro dit ce qu'il déclare > ⛔ K-20",
    "D-4|sources": "le câblage > ⛔ la liste blanche des routes EXEMPTÉES du garde est FERMÉE : `@StaffExempt()` apparaît sur exact",
    "D-5|sources": "les DÉCLARATIONS DE CAPACITÉ des contrôleurs (R-2, D354) — chaque contrôleur Pro dit ce qu'il déclare > les de",
    "D-7|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > un",
    "D-9|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > la",
    "K-1|contrat": "STAFF_LIMITS — UN levier pour toutes les durées (MP-43, DR5) > DR5 (D354, MP-43) — un mot de passe TEMPORAIRE ",
    "K-2|contrat": "les clés `staff.validation.*` employées par les schémas existent dans les DEUX catalogues (dérivées des schéma",
    "K-3|contrat": "staffMemberCreateSchema — K-20 : le nom de compte et le rôle, RIEN d'autre (le mot de passe est GÉNÉRÉ) > acce",
    "K-4|contrat": "les codes d'erreur du personnel — messages FR = AR (MP-39) > deux codes n'ont jamais la même clé (un message p",
    "K-5|contrat": "les codes d'erreur du personnel — messages FR = AR (MP-39) > l'ensemble des codes est celui du lot ; ⛔ R-3 (D3",
    "K-5|garde": "StaffSessionGuard — la CAPACITÉ de l'employé, lue sur la route et la méthode (R-2, S-107, consigne § 1 c) > ⛔ ",
    "I-1|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-21 : `resetMemberPassword` POSTE, san",
    "I-2|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-22 : `disableMember` POSTE, sans corp",
    "I-3|client-api": "le client du personnel — méthode, adresse et corps de chaque contrat > K-19 : `listMembers` LIT `/pro/staff/me",
    "A-27|int-membres": "K-22 — désactiver : les sessions finissent `DISABLED`, jamais un second effet (MP-4, MP-30, MP-31) > ⛔ patron ",
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
        print("✗ R56_FILTRE n'est admis qu'avec R56_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R56_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    if CLASSE:
        if not DECOUVERTE:
            print("✗ R56_CLASSE n'est admis qu'avec R56_DECOUVERTE=1 : une campagne restreinte n'est pas une campagne verte.")
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
