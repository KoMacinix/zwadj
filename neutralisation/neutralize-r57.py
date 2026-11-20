#!/usr/bin/env python3
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


SAUVEGARDE = ".neutralisation-r57"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r57")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\x1b\[[0-9;]*m")
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


# ── A — R-1 : le CAS d'`openSession` (le magasin du personnel), la connexion ne survit plus à une réinitialisation.
cible("A-1. ⛔ R-1 — le CAS d'ouverture ne compare plus le hachage lu à la réservation (une réinitialisation ou un changement intercalé n'empêche plus l'ouverture)", MAGASIN,
      "\n           AND password_hash = ${input.expectedPasswordHash}\n", "\n           AND ${input.expectedPasswordHash}::text IS NOT NULL\n", ["course-magasin", "int-course"])
cible("A-2. ⛔ R-1 — le CAS compare le hachage à un AUTRE secret (le jeton de session) : l'ouverture n'est plus jamais acceptée", MAGASIN,
      "\n           AND password_hash = ${input.expectedPasswordHash}\n", "\n           AND password_hash = ${input.sessionTokenHash}\n", ["course-magasin", "int-course"])
cible("A-3. ⛔ R-1 — « connexion ‖ désactivation » : le CAS d'ouverture ne conditionne plus le STATUT (un membre désactivé entre la réservation et l'ouverture ouvre une session)", MAGASIN,
      "WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid AND status = 'ACTIVE'",
      "WHERE id = ${input.memberId}::uuid AND pro_profile_id = ${input.proProfileId}::uuid AND true", ["course-magasin", "int-course"])
cible("A-4. ⛔ R-1 — le hachage est comparé à une LECTURE de l'instantané de l'instruction (sous-requête) et non à la ligne VERROUILLÉE : un contrôle qui ne relit pas sous le verrou", MAGASIN,
      "\n           AND password_hash = ${input.expectedPasswordHash}\n",
      "\n           AND ${input.expectedPasswordHash} = (SELECT m2.password_hash FROM pro_staff_members m2 WHERE m2.id = ${input.memberId}::uuid)\n", ["int-course"])
cible("A-5. ⛔ R-1 — le refus d'ouverture change de nom de motif (`memberChanged` devient `memberInactive`) : le contrat du port se désaccorde de sa définition", MAGASIN,
      '      if (membre === undefined) return { ok: false, reason: "memberChanged" };', '      if (membre === undefined) return { ok: false, reason: "memberInactive" as "memberChanged" };', ["course-magasin"])

# ── S — R-1 : le SERVICE de connexion (le hachage transmis, le refus identique à un mauvais mot de passe).
cible("S-1. ⛔ R-1 — le service transmet un autre secret que le hachage lu à la réservation (le mot de passe en clair)", SERVICE,
      "      memberId: member.id,\n      expectedPasswordHash: reservation.passwordHash,", "      memberId: member.id,\n      expectedPasswordHash: input.password,", ["course-service", "int-course"])
cible("S-2. ⛔ R-1 / S-253 — un refus d'ouverture est consigné comme un échec de mot de passe (une ligne d'échec pour un mot de passe qui était JUSTE)", SERVICE,
      "    if (!opened.ok) throw identifiantsRefuses();",
      '    if (!opened.ok) { await this.store.recordPasswordFailure({ actor: user, memberId: member.id, failedCount: reservation.failedCount, pausedNow: reservation.pausedNow, action: "staff.login_failed" }); throw identifiantsRefuses(); }', ["course-service"])
cible("S-3. ⛔ R-1 — un refus d'ouverture paie UN hachage FACTICE de plus (le coût diffère de celui d'un mauvais mot de passe)", SERVICE,
      "    if (!opened.ok) throw identifiantsRefuses();",
      "    if (!opened.ok) { await this.passwords.verifyAgainstDummy(input.password); throw identifiantsRefuses(); }", ["course-service", "int-course"])
cible("S-4. ⛔ R-1 — un refus d'ouverture n'est plus le même corps qu'un mauvais mot de passe (un 403 « interdit » : le refus dit POURQUOI)", SERVICE,
      "    if (!opened.ok) throw identifiantsRefuses();",
      "    if (!opened.ok) throw new ForbiddenException(erreurDe(StaffErrorCode.STAFF_INVALID_CREDENTIALS));", ["course-service", "int-course"])

# ── P — R-2 : le module PUR du journal des fiches (`client-record-audit.ts`).
cible("P-1. ⛔ R-2 — `before` est écrit (la valeur d'avant d'un champ est une donnée personnelle)", AUDIT,
      "    entityId: args.ficheId,", "    entityId: args.ficheId,\n    before: null,", ["audit-pur", "ecritures"], "insertion")
cible("P-2. ⛔ R-2 — `champsEcrits` rend les VALEURS au lieu des noms (le journal recopie un numéro, un e-mail, un nom)", AUDIT,
      "  return FICHE_CHAMPS.filter((champ) => donnees[champ] !== undefined && donnees[champ] !== null);",
      "  return FICHE_CHAMPS.filter((champ) => donnees[champ] !== undefined && donnees[champ] !== null).map((champ) => donnees[champ] as unknown as FicheChamp);", ["audit-pur"])
cible("P-3. ⛔ R-2 — l'ordre des champs n'est plus fixe (l'ordre de l'appelant fait foi)", AUDIT,
      "  const fields = FICHE_CHAMPS.filter((champ) => args.champs.includes(champ));", "  const fields = [...args.champs];", ["audit-pur"])
cible("P-4. ⛔ R-2 — la ligne n'écrit jamais le membre (`actor_member_id` toujours NULL, même quand une session de personnel existe)", AUDIT,
      "    actorMemberId: args.auteur.memberId,", "    actorMemberId: null,", ["audit-pur", "int-fiches"])
cible("P-5. ⛔ R-2 — sans membre, la ligne y met le compte commun (un membre INVENTÉ)", AUDIT,
      "    actorMemberId: args.auteur.memberId,", "    actorMemberId: args.auteur.memberId ?? args.auteur.userId,", ["audit-pur", "int-fiches"])
cible("P-6. ⛔ R-2 — le rôle de l'acteur n'est plus PRO", AUDIT,
      '    actorRole: "PRO",', '    actorRole: "CLIENT" as "PRO",', ["audit-pur", "int-fiches"])
cible("P-7. ⛔ R-2 — une ligne SANS champ écrit est acceptée (un journal qui se tait sur ce qu'il n'a pas compris)", AUDIT,
      "  if (args.champs.length === 0) throw", "  if (false) throw", ["audit-pur"])
cible("P-8. ⛔ R-2 — un champ INCONNU (un secret, une colonne qui n'existe pas) est accepté", AUDIT,
      "  if (inconnus.length > 0) throw", "  if (false) throw", ["audit-pur"])
cible("P-9. ⛔ R-2 — un champ RÉPÉTÉ est accepté", AUDIT,
      "  if (new Set(args.champs).size !== args.champs.length) throw", "  if (false) throw", ["audit-pur"])
cible("P-10. ⛔ R-2 — `quoteId` est accepté pour une création ou une modification (il n'a de place que pour K-5)", AUDIT,
      '  if (args.quoteId !== undefined && args.action !== "client_record.complete_names") throw', "  if (false) throw", ["audit-pur"])
cible("P-11. ⛔ R-2 — une action qui n'est pas l'une des trois est acceptée (la liste du journal n'est plus fermée)", AUDIT,
      "  if (!FICHE_AUDIT_ACTIONS.includes(args.action)) throw", "  if (false) throw", ["audit-pur"])
cible("P-12. ⛔ R-2 — l'entité de la ligne n'est plus `client_record`", AUDIT,
      '    entityType: "client_record",', '    entityType: "fiche",', ["audit-pur", "int-fiches"])
cible("P-13. ⛔ R-2 — la clé `quoteId` est toujours présente (même pour K-3, même `undefined`)", AUDIT,
      "    after: args.quoteId === undefined ? { fields } : { fields, quoteId: args.quoteId }", "    after: { fields, quoteId: args.quoteId }", ["audit-pur"])
cible("P-14. ⛔ R-2 — la liste fermée des champs perd `email` (un e-mail écrit n'est plus consigné)", AUDIT,
      'export const FICHE_CHAMPS = ["phone", "email", "nameAr", "nameLatin"] as const;', 'export const FICHE_CHAMPS = ["phone", "nameAr", "nameLatin"] as const;', ["audit-pur", "int-fiches"])
cible("P-15. ⛔ R-2 — la liste fermée des actions est désaccordée de la table (un nom d'action change)", AUDIT,
      '"client_record.complete_names"] as const;', '"client_record.complete_name"] as const;', ["audit-pur", "ecritures", "int-fiches"])
cible("P-16. ⛔ R-2 — le module pur importe une dépendance (il n'est plus sans dépendance, D187)", AUDIT,
      "/** Les quatre champs d'une fiche qu'une écriture peut toucher, dans l'ORDRE FIXE de la ligne. */",
      'import { randomUUID } from "node:crypto";\n/** Les quatre champs d\'une fiche qu\'une écriture peut toucher, dans l\'ORDRE FIXE de la ligne. */', ["audit-pur"], "insertion")

# ── F — R-2 : le magasin des fiches (K-2, K-3, K-3b).
cible("F-1. ⛔ R-2 — K-2 : la fiche créée n'écrit plus sa ligne de journal (une action sans trace)", FICHE_STORE,
      '        await tx.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.create", ficheId: creee.id, champs: champsEcrits(donnees) }) });',
      "        void auteur;", ["ecritures", "int-fiches"])
cible("F-2. ⛔ R-2 — K-2 : une ligne de journal est écrite même quand RIEN n'a été inséré (une fiche rendue telle quelle laisse une trace d'une écriture qui n'a pas eu lieu)", FICHE_STORE,
      "      if (lignes.length === 1 && creee !== undefined) {", "      if (true) {", ["int-fiches"])
cible("F-3. ⛔ R-2 — K-3 : la ligne de journal est écrite même quand l'`UPDATE` conditionné n'a rien écrit (un refus laisse une trace)", FICHE_STORE,
      "      if (resultat.count === 1) {", "      if (true) {", ["int-fiches"])
cible("F-4. ⛔ R-2 — K-3b : la modification porte le nom d'action de la complétion", FICHE_STORE,
      'ficheAuditEntry({ auteur, action: "client_record.update", ficheId: id, champs: champsEcrits(champs) })',
      'ficheAuditEntry({ auteur, action: "client_record.complete_names", ficheId: id, champs: champsEcrits(champs) })', ["int-fiches"])
cible("F-5. ⛔ R-2 — K-3b : la ligne consigne TOUS les champs, pas ceux qui ont été envoyés", FICHE_STORE,
      "champs: champsEcrits(champs)", 'champs: ["phone", "email", "nameAr", "nameLatin"]', ["int-fiches"])
cible("F-6. ⛔ R-2 — K-2 : le membre de la session n'est pas transmis à la ligne (le Manager et l'Employé ne se distinguent plus)", FICHE_STORE,
      'ficheAuditEntry({ auteur, action: "client_record.create"', 'ficheAuditEntry({ auteur: { userId: auteur.userId, memberId: null }, action: "client_record.create"', ["int-fiches"])
cible("F-7. ⛔ R-2 — K-2 : l'insertion n'est plus dans une transaction avec sa ligne (une insertion validée seule, la ligne échoue ensuite : une action sans trace)", FICHE_STORE,
      "    const inseree = await this.prisma.$transaction(async (tx) => {", "    const inseree = await this.prisma.$transaction(async (_tx) => {\n      const tx = this.prisma;", ["int-fiches"])
cible("F-8. ⛔ R-2 — K-3 : l'`UPDATE` n'est plus dans une transaction avec sa ligne", FICHE_STORE,
      "    const ecrit = await this.prisma.$transaction(async (tx) => {", "    const ecrit = await this.prisma.$transaction(async (_tx) => {\n      const tx = this.prisma;", ["int-fiches"])
cible("F-9. ⛔ R-2 — K-3b : l'`UPDATE` n'est plus dans la transaction de sa ligne de journal", FICHE_STORE,
      "      return await this.prisma.$transaction(async (tx): Promise<ResultatModification> => {", "      return await this.prisma.$transaction(async (_tx): Promise<ResultatModification> => {\n        const tx = this.prisma;", ["int-fiches"])

cible("F-10. ⛔ R-2 — K-2 : la ligne de journal s'écrit sur UNE AUTRE connexion que la transaction (elle est validée seule : si le commit de l'insertion échoue ensuite, la trace d'une action qui n'a pas eu lieu survit)", FICHE_STORE,
      '        await tx.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.create"', '        await this.prisma.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.create"', ["int-fiches"])
cible("F-11. ⛔ R-2 — K-3 : la ligne de journal s'écrit sur UNE AUTRE connexion que la transaction", FICHE_STORE,
      '        await tx.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.complete_names"', '        await this.prisma.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.complete_names"', ["int-fiches"])
cible("F-12. ⛔ R-2 — K-3b : la ligne de journal s'écrit sur UNE AUTRE connexion que la transaction", FICHE_STORE,
      '        await tx.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.update"', '        await this.prisma.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.update"', ["int-fiches"])

# ── Q — R-2 : K-5, la boîte de langue complète AUSSI la fiche (le magasin des devis).
cible("Q-1. ⛔ R-2 — K-5 : la fiche complétée n'écrit plus sa ligne de journal", QUOTE_STORE,
      "            if (completee.count === 1) {", "            if (false) {", ["magasin-devis", "int-fiches"])
cible("Q-2. ⛔ R-2 — K-5 : la ligne de journal est écrite même quand l'écriture conditionnée de la fiche n'a rien écrit", QUOTE_STORE,
      "            if (completee.count === 1) {", "            if (true) {", ["magasin-devis", "int-fiches"])
cible("Q-3. ⛔ R-2 — K-5 : la ligne ne porte plus le devis qui a fait compléter la fiche", QUOTE_STORE,
      "                  quoteId: args.quoteId", "                  quoteId: undefined", ["magasin-devis", "int-fiches"])
cible("Q-4. ⛔ R-2 — K-5 : la ligne nomme l'AUTRE champ (le nom arabe complété est consigné comme latin)", QUOTE_STORE,
      '                  champs: [enArabe ? "nameAr" : "nameLatin"],', '                  champs: [enArabe ? "nameLatin" : "nameAr"],', ["magasin-devis", "int-fiches"])
cible("Q-5. ⛔ R-2 — K-5 : le membre de la session n'est pas transmis à la ligne", QUOTE_STORE,
      "                  auteur: { userId: args.userId, memberId: args.memberId },", "                  auteur: { userId: args.userId, memberId: null },", ["magasin-devis", "int-fiches"])
cible("Q-6. ⛔ R-2 — K-5 : la ligne de journal de la fiche s'écrit sur UNE AUTRE connexion que la transaction (une trace sans action si le commit échoue)", QUOTE_STORE,
      "              await tx.auditLog.create({\n                data: ficheAuditEntry({", "              await this.prisma.auditLog.create({\n                data: ficheAuditEntry({", ["int-fiches"])

# ── V — R-2 : les services et les contrôleurs (le membre du garde voyage jusqu'au magasin).
cible("V-1. ⛔ R-2 — le service des fiches ne transmet jamais le membre (K-2)", FICHE_SVC,
      "    const auteur: FicheAuteur = { userId, memberId };", "    const auteur: FicheAuteur = { userId, memberId: null };", ["service-fiches", "int-fiches"])
cible("V-2. ⛔ R-2 — le service des fiches ne transmet jamais le membre (K-3)", FICHE_SVC,
      "this.fiches.completerNoms(userId, id, input, { userId, memberId })", "this.fiches.completerNoms(userId, id, input, { userId, memberId: null })", ["service-fiches", "int-fiches"])
cible("V-3. ⛔ R-2 — le service des fiches ne transmet jamais le membre (K-3b)", FICHE_SVC,
      "this.fiches.modifier(userId, id, input, { userId, memberId })", "this.fiches.modifier(userId, id, input, { userId, memberId: null })", ["service-fiches", "int-fiches"])
cible("V-4. ⛔ R-2 — le contrôleur des fiches ne lit pas le membre du garde (K-2)", FICHE_CTRL,
      "    return this.clients.create(user.userId, body, staff?.memberId ?? null);", "    return this.clients.create(user.userId, body, null);", ["int-fiches"])
cible("V-5. ⛔ R-2 — le contrôleur des fiches ne lit pas le membre du garde (K-3)", FICHE_CTRL,
      "    return this.clients.completeNames(user.userId, id, body, staff?.memberId ?? null);", "    return this.clients.completeNames(user.userId, id, body, null);", ["int-fiches"])
cible("V-6. ⛔ R-2 — le contrôleur des fiches ne lit pas le membre du garde (K-3b)", FICHE_CTRL,
      "    return this.clients.update(user.userId, id, body, staff?.memberId ?? null);", "    return this.clients.update(user.userId, id, body, null);", ["int-fiches"])
cible("V-7. ⛔ R-2 — le contrôleur des devis ne lit pas le membre du garde (K-5)", QUOTES_CTRL,
      "    return this.quotes.completeClientName(user.userId, id, body, staff?.memberId ?? null);", "    return this.quotes.completeClientName(user.userId, id, body, null);", ["int-fiches"])
cible("V-8. ⛔ R-2 — le service des devis ne passe pas le membre au port (K-5)", QUOTES_SVC,
      "    const resultat = await this.devis.completerNomDuClient({\n      userId,\n      memberId,\n      quoteId,",
      "    const resultat = await this.devis.completerNomDuClient({\n      userId,\n      memberId: null,\n      quoteId,", ["service-devis", "int-fiches"])

# ── G — R-2 : la garde de SOURCE (`client-record-writes.spec.ts`) tient la CARTE des écritures.
cible("G-1. ⛔ R-2 — un CINQUIÈME fichier écrit la table des fiches (le service des devis, par exemple : la conversion écrirait une fiche)", QUOTES_SVC,
      "async completeClientName(userId: string, quoteId: string, input: QuoteClientNameInput, memberId: string | null): Promise<QuoteDTO> {",
      'const ecritureDeFiche = "UPDATE pro_client_records SET name_ar = NULL";\n  async completeClientName(userId: string, quoteId: string, input: QuoteClientNameInput, memberId: string | null): Promise<QuoteDTO> {', ["ecritures"], "insertion")
cible("G-2. ⛔ R-2 — une écriture de PLUS dans un fichier de la carte (un quatrième site dans le magasin des fiches)", FICHE_STORE,
      "function estViolationUnicite(error: unknown): boolean {", 'const cinquiemeSite = "DELETE FROM pro_client_records WHERE false";\nfunction estViolationUnicite(error: unknown): boolean {', ["ecritures"], "insertion")
cible("G-3. ⛔ R-2 — la LIGNE du journal est bâtie à la main dans un magasin (une entité écrite sur place, hors du module pur)", FICHE_STORE,
      "function estViolationUnicite(error: unknown): boolean {", 'const ligneALaMain = { entityType: "client_record" };\nfunction estViolationUnicite(error: unknown): boolean {', ["ecritures"], "insertion")
cible("G-4. ⛔ R-2 — la charge utile de la ligne ne vient plus DIRECTEMENT du constructeur du module pur (une enveloppe autour de l'appel : le comportement est le même, la forme n'est plus la garantie)", FICHE_STORE,
      'await tx.auditLog.create({ data: ficheAuditEntry({ auteur, action: "client_record.update", ficheId: id, champs: champsEcrits(champs) }) });',
      'await tx.auditLog.create({ data: { ...ficheAuditEntry({ auteur, action: "client_record.update", ficheId: id, champs: champsEcrits(champs) }) } });', ["ecritures"])
cible("G-5. ⛔ R-2 — la ligne est CONSTRUITE avant l'écriture qu'elle consigne (K-3 : la ligne ne peut pas précéder l'écriture)", FICHE_STORE,
      "      const resultat = await tx.proClientRecord.updateMany({",
      '      const avantEcriture = ficheAuditEntry({ auteur, action: "client_record.complete_names", ficheId: id, champs: champsEcrits(noms) });\n      const resultat = await tx.proClientRecord.updateMany({', ["ecritures"], "insertion")


# ── TITRES : le titre (ou un fragment) du test qui doit rougir, par « identifiant|mesure ». ÉCRIT À PARTIR DU RELEVÉ de la découverte (jamais de mémoire) ; une mesure absente d'ici n'a pas mordu au relevé.
# <<TITRES>>
TITRES: dict[str, str] = {
    "A-1|course-magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ R-1 (D355",
    "A-1|int-course": "⛔ R-1 — « connexion ‖ réinitialisation » : un mot de passe vérifié AVANT une réinitialisation n'ouvre AUCUNE s",
    "A-2|course-magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ R-1 (D355",
    "A-3|course-magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ le CAS du",
    "A-3|int-course": "⛔ R-1 — « connexion ‖ désactivation » : un membre désactivé entre la réservation et l'ouverture n'ouvre AUCUNE",
    "A-4|int-course": "⛔ R-1 — « connexion ‖ réinitialisation » : un mot de passe vérifié AVANT une réinitialisation n'ouvre AUCUNE s",
    "A-5|course-magasin": "openSession — K-15 : le membre d'abord (L2), l'appareil (L3), la session (L4) — jamais l'inverse > ⛔ le CAS du",
    "S-1|course-service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ R-1 — l'ouverture est CONDITIONNÉE au hachag",
    "S-2|course-service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ R-1 — un mot de passe REMPLACÉ entre la rése",
    "S-3|int-course": "⛔ R-1 — « connexion ‖ réinitialisation » : un mot de passe vérifié AVANT une réinitialisation n'ouvre AUCUNE s",
    "S-3|course-service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ R-1 — un mot de passe REMPLACÉ entre la rése",
    "S-4|int-course": "⛔ R-1 — « connexion ‖ réinitialisation » : un mot de passe vérifié AVANT une réinitialisation n'ouvre AUCUNE s",
    "S-4|course-service": "login — la connexion par nom de compte et mot de passe (K-15) > ⛔ un mot de passe juste mais un membre devenu ",
    "P-1|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > création : le compte commun ET le membre, ",
    "P-2|audit-pur": "champsEcrits — les NOMS des champs d'une écriture, jamais leurs valeurs > rend les champs NON nuls dans l'ordr",
    "P-3|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > l'ordre des champs est FIXE : l'ordre dans",
    "P-4|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > création : le compte commun ET le membre, ",
    "P-4|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "P-5|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ sans session de personnel (couche éteint",
    "P-5|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "P-6|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > création : le compte commun ET le membre, ",
    "P-6|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "P-7|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ une ligne SANS champ, avec un champ INCO",
    "P-8|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ une ligne SANS champ, avec un champ INCO",
    "P-9|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ une ligne SANS champ, avec un champ INCO",
    "P-10|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ `quoteId` — la complétion par la boîte d",
    "P-11|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ une action qui n'est pas l'une des trois",
    "P-12|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > création : le compte commun ET le membre, ",
    "P-12|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "P-13|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ `quoteId` — la complétion par la boîte d",
    "P-14|audit-pur": "champsEcrits — les NOMS des champs d'une écriture, jamais leurs valeurs > rend les champs NON nuls dans l'ordr",
    "P-14|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "P-15|audit-pur": "ficheAuditEntry — la ligne d'`audit_logs` d'une écriture de fiche > ⛔ une action qui n'est pas l'une des trois",
    "P-15|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "P-16|audit-pur": "le module est PUR (D187) : aucune dépendance — ni Nest, ni Prisma, ni un autre module du dépôt > la source ne ",
    "F-1|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "F-1|ecritures": "⛔ (b) chaque méthode d'écriture est dans une TRANSACTION, écrit, PUIS journalise — l'écriture et sa trace vive",
    "F-2|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "F-3|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "F-4|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "F-5|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "F-6|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "F-7|int-fiches": "⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ",
    "F-8|int-fiches": "⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ",
    "F-9|int-fiches": "⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ",
    "F-10|int-fiches": "⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ",
    "F-11|int-fiches": "⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ",
    "F-12|int-fiches": "⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ",
    "Q-1|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "Q-1|magasin-devis": "⛔ D336 — `completerNomDuClient` : compare-and-set de la COPIE, puis la fiche sous verrou et sous la politique ",
    "Q-2|magasin-devis": "⛔ D336 — `completerNomDuClient` : compare-and-set de la COPIE, puis la fiche sous verrou et sous la politique ",
    "Q-3|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "Q-3|magasin-devis": "⛔ D336 — `completerNomDuClient` : compare-and-set de la COPIE, puis la fiche sous verrou et sous la politique ",
    "Q-4|int-fiches": "⛔ R-2 — couche ÉTEINTE : chaque écriture de fiche écrit UNE ligne, le compte commun pour acteur, `actor_member",
    "Q-4|magasin-devis": "⛔ D336 — `completerNomDuClient` : compare-and-set de la COPIE, puis la fiche sous verrou et sous la politique ",
    "Q-5|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "Q-5|magasin-devis": "⛔ D336 — `completerNomDuClient` : compare-and-set de la COPIE, puis la fiche sous verrou et sous la politique ",
    "Q-6|int-fiches": "⛔ R-2 — l'ÉCHEC FORCÉ dans la transaction (MD-ADM-6, patron de D349) : l'action ET sa trace vivent ou meurent ",
    "V-1|service-fiches": "K-2 — créer ou RENDRE ; le contact du pro refusé AVANT toute écriture > une fiche créée : `{ created: true, re",
    "V-1|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "V-2|service-fiches": "⛔ R-2 (D355) — l'AUTEUR de l'écriture (le compte ET le membre) est passé au port, qui écrit la ligne de journa",
    "V-2|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "V-3|service-fiches": "⛔ R-2 (D355) — l'AUTEUR de l'écriture (le compte ET le membre) est passé au port, qui écrit la ligne de journa",
    "V-3|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "V-4|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "V-5|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "V-6|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "V-7|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "V-8|service-devis": "⛔ D336 — K-5 : compléter la copie du nom (compare-and-set sur NULL), la fiche sous C-C3 > ⛔ R-2 (D355) — le ME",
    "V-8|int-fiches": "⛔ R-2 — couche ACTIVÉE : la ligne porte le MEMBRE qui agit (`actor_member_id`), et le compte commun (`actor_id",
    "G-1|ecritures": "⛔ (a) les fichiers de production qui écrivent `pro_client_records` sont EXACTEMENT les deux de la carte > ni u",
    "G-2|ecritures": "⛔ (c) le NOMBRE d'écritures de chaque fichier est celui de la carte : une écriture de plus, dans le même fichi",
    "G-3|ecritures": "⛔ (e) la LIGNE du journal des fiches n'est construite QUE par le module pur > aucun fichier de production autr",
    "G-4|ecritures": "⛔ (b) chaque méthode d'écriture est dans une TRANSACTION, écrit, PUIS journalise — l'écriture et sa trace vive",
    "G-5|ecritures": "⛔ (b) chaque méthode d'écriture est dans une TRANSACTION, écrit, PUIS journalise — l'écriture et sa trace vive",
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
        print("✗ R57_FILTRE n'est admis qu'avec R57_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R57_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
    if CLASSE:
        if not DECOUVERTE:
            print("✗ R57_CLASSE n'est admis qu'avec R57_DECOUVERTE=1 : une campagne restreinte n'est pas une campagne verte.")
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
