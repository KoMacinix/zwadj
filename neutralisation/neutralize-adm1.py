#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 51 (D349), lot ADM-1 : l'API de la page d'administration (la file « en attente de publication », le détail, publier, rejeter avec motif, le journal, la lecture du
refus par le pro, le script du premier admin, les clients d'API).

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le CONTRAT (`packages/types/src/venue-moderation.ts`) : le motif OBLIGATOIRE et rogné, sa borne, les clés inconnues refusées, la taille de page, le nom de l'action du journal (T-*) ;
  · le MODULE du journal (`admin-audit.ts`) : le motif dans la ligne, le nombre de salles archivées, l'identifiant de l'entité, aucune donnée personnelle, le statut de départ (A-*) ;
  · la FILE (`venue-review-queue.ts`) : les statuts sources de publier et de rejeter, la découpe d'une page sur deux groupes, le refus jamais sur une salle publiée, la date la plus récente (Q-*) ;
  · le SERVICE ADMIN (`venues-admin.service.ts`) : publier en check-and-set qui efface le motif, la ligne de journal DANS la transaction, le rejet conditionné à « brouillon jamais rejeté », ses refus et son
    idempotence, la condition de la file, son tri, sa page, la date des refus, aucun taux (S-*) ; ⛔ R-1 : le texte de `setRates` et de `VENUE_ADMIN_SELECT` est celui de `9ec8abf` (contrôle R-1) ;
  · les CONTRÔLEURS (`venues-admin.controller.ts`, `venues.controller.ts`) : l'acteur transmis, le rôle ADMIN de classe, le nom de la route de la file, l'identifiant du pro (C-*) ;
  · la lecture du REFUS par le pro (`venues.service.ts`, `venue-store.prisma.ts`) : le court-circuit UUID, le 404 indistinct, la date, l'appartenance par la relation, les colonnes lues (P-*, V-*) ;
  · la file des SUPPRESSIONS (`account-deletion.service.ts`) : la ligne de journal DANS la transaction d'`approve` et de `reject`, le nombre d'archivées, la décision écrite (D-*) ;
  · le script du PREMIER ADMIN (`first-admin.ts`) : chaque refus, le check-and-set, aucun mot de passe, la ligne de journal, le `--dry-run`, l'adresse normalisée (F-*) ;
  · les CLIENTS d'API (`admin-client.ts`, `venue-publication-client.ts`) : le corps du rejet, les adresses, l'encodage, aucune méthode du taux (K-*).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-adm1.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-adm1.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    ADM1_DECOUVERTE=1 python3 neutralisation/neutralize-adm1.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, contrôle R-1 manqué, ou arbre non conforme.

⛔ R-9 (consigne du rang 51) : LE JOURNAL DE CHAQUE PASSE COMMENCE PAR L'EMPREINTE SHA-256 DU HARNAIS — première ligne de la sortie, et première ligne de chaque journal de mesure : une passe se rattache à
l'octet près au fichier qui l'a jouée (D348, S-175 : l'empreinte n'était pas dans les journaux de PUB-1, la preuve était une date).
⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec ; le titre attendu y est marqué en échec ET la PREMIÈRE ligne de
son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. Les verdicts du lot s'écrivent en assertions NATIVES (`expect(...).toBe`), jamais par `.expect(<statut>)` de supertest ni par un
matcher jest-dom, qui lèvent une `Error`.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution ne doit
jamais être une SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `ADM1_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ UNE NEUTRALISATION DE MESURE N'EST PAS UN CHANGEMENT, MÊME POUR UN FICHIER DE LA CARTE DU CHEMIN DE L'ARGENT (D318) : `venues-admin.service.ts` est muté le temps d'une mesure, puis restauré à l'octet.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) le script `prisma/promote-first-admin.ts` lui-même (arguments, connexion, impression) : seule la fonction qu'il appelle est mesurée (F-*) ; (2) la
CAUSE d'un 500 sous échec forcé : on mesure que l'état est celui d'AVANT, pas pourquoi la base a refusé ; (3) un VRAI navigateur : ce lot n'a aucun écran (ADM-2, rang 52).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-r43.py` (lui-même calibré D316 / D325 / D331 / D332 / D333) ; changent : les noms,
le jeu de cibles, l'empreinte du harnais en tête de journal (R-9) et le contrôle d'invariance de R-1.
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

# ⛔ R-9 — LA PREMIÈRE LIGNE DE LA SORTIE : l'empreinte du fichier qui joue la passe.
EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")

SAUVEGARDE = ".neutralisation-adm1"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "adm1")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("ADM1_DECOUVERTE") == "1"
# `ADM1_FILTRE="S-,Q-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("ADM1_FILTRE", "").split(",") if p]
# `ADM1_SEULEMENT="S-3,S-4"` rejoue certaines cibles (reprise après un arrêt externe — Docker, etc.) : DÉCLARÉE, jamais après une modification du harnais (alors : EN ENTIER).
SEULEMENT = [p for p in os.environ.get("ADM1_SEULEMENT", "").split(",") if p]


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    # ⚠ `pnpm exec vitest run -c vitest.config.int.ts` échoue sur TOUT fichier d'intégration (« Nest can't resolve dependencies of the JwtAuthGuard »), mesuré à D349 ; la porte passe par le script du paquet.
    return ["pnpm", "--filter", "@zwadj/api", "run", "test:int", fichier]


MESURES = {
    # ── unitaires : API (`@zwadj/api`) et client d'API (`@zwadj/api-client`).
    "audit": _vitest("@zwadj/api", "src/common/admin-audit.spec.ts"),
    "file": _vitest("@zwadj/api", "src/venues/venue-review-queue.spec.ts"),
    "schemas": _vitest("@zwadj/api", "src/venues/venue-moderation.schemas.spec.ts"),
    "service-admin": _vitest("@zwadj/api", "src/venues/venues-admin.service.spec.ts"),
    "service-pro": _vitest("@zwadj/api", "src/venues/venues.service.spec.ts"),
    "magasin": _vitest("@zwadj/api", "src/venues/venue-store.prisma.spec.ts"),
    "suppression": _vitest("@zwadj/api", "src/account/account-deletion.service.spec.ts"),
    "premier-admin": _vitest("@zwadj/api", "src/admin/first-admin.spec.ts"),
    "client-admin": _vitest("@zwadj/api-client", "src/admin-client.test.ts"),
    "client-pro": _vitest("@zwadj/api-client", "src/venue-publication-client.test.ts"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement.
    "int-moderation": _vitest_int("test/int/admin-moderation.int-spec.ts"),
    "int-journal": _vitest_int("test/int/admin-audit.int-spec.ts"),
    "int-premier-admin": _vitest_int("test/int/first-admin.int-spec.ts"),
    "int-rbac": _vitest_int("test/int/rbac-all-routes.int-spec.ts"),
    "int-contrat": _vitest_int("test/int/contract-api-client.int-spec.ts"),
}
MESURES_INT = {"int-moderation", "int-journal", "int-premier-admin", "int-rbac", "int-contrat"}
AVEC_INT = "--int" in sys.argv

TYPES = "packages/types/src/venue-moderation.ts"
JOURNAL = "apps/api/src/common/admin-audit.ts"
FILE = "apps/api/src/venues/venue-review-queue.ts"
SERVICE_ADMIN = "apps/api/src/venues/venues-admin.service.ts"
CTRL_ADMIN = "apps/api/src/venues/venues-admin.controller.ts"
CTRL_PRO = "apps/api/src/venues/venues.controller.ts"
SERVICE_PRO = "apps/api/src/venues/venues.service.ts"
MAGASIN = "apps/api/src/venues/venue-store.prisma.ts"
SUPPRESSION = "apps/api/src/account/account-deletion.service.ts"
PREMIER_ADMIN = "apps/api/src/admin/first-admin.ts"
CLIENT_ADMIN = "packages/api-client/src/admin-client.ts"
CLIENT_PRO = "packages/api-client/src/venue-publication-client.ts"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── T — le CONTRAT (`@zwadj/types`).
cible("T-1. ⛔ D-4 — le motif d'un rejet redevient FACULTATIF (un rejet sans raison laisserait le pro sans rien à corriger)", TYPES,
      '.min(1, "admin.validation.rejectionReasonRequired")', '.min(0, "admin.validation.rejectionReasonRequired")',
      {"schemas": "un motif vide, blanc ou absent est REFUSÉ", "int-moderation": "le motif est OBLIGATOIRE : corps vide"})
cible("T-2. ⛔ le motif n'est plus rogné (des espaces autour passeraient, et un motif d'espaces seuls serait accepté)", TYPES,
      "      .trim()\n", "      .min(0)\n",
      {"schemas": "un motif de deux phrases est accepté, et rendu rogné"})
cible("T-3. ⛔ la borne du motif passe d'un caractère (un motif d'un caractère de trop est accepté)", TYPES,
      ".max(VENUE_REJECTION_REASON_MAX, ", ".max(VENUE_REJECTION_REASON_MAX + 1, ",
      {"schemas": "la borne est INCLUSE : un motif d'exactement la longueur maximale passe"})
cible("T-4. ⛔ le corps d'un rejet accepte une clé inconnue (un statut ou un taux glissé dans le corps)", TYPES,
      '.strict("admin.validation.unknownKey");\nexport type VenueRejectInput', '.passthrough();\nexport type VenueRejectInput',
      {"schemas": "une clé inconnue est refusée (`.strict()`) : on ne glisse pas un statut ni un taux"})
cible("T-5. ⛔ la file accepte une clé inconnue (un filtre de statut, un taux)", TYPES,
      '.strict("admin.validation.unknownKey");\n/** Ce que le client PEUT envoyer', '.passthrough();\n/** Ce que le client PEUT envoyer',
      {"schemas": "une clé inconnue est refusée : la file n'a AUCUN filtre de statut, de taux ni d'identifiant"})
cible("T-6. ⛔ la taille de page maximale n'est plus celle de la liste publique (A3-⑤)", TYPES,
      "export const VENUE_PENDING_PAGE_SIZE_MAX = 50;", "export const VENUE_PENDING_PAGE_SIZE_MAX = 100;",
      {"schemas": "les bornes sont celles de la liste publique d'A3-⑤"})
cible("T-7. ⛔ le nom de l'action du rejet n'est plus celui que la lecture du refus cherche au journal", TYPES,
      'VENUE_REJECT: "venue.reject",', 'VENUE_REJECT: "venue.rejected",',
      {"magasin": "rejetée : la date est celle de la ligne `venue.reject` LA PLUS RÉCENTE"})

# ── A — le module du JOURNAL (`admin-audit.ts`).
cible("A-1. ⛔ R-2 — la ligne d'un rejet ne porte plus le MOTIF (publier l'efface de la colonne : l'histoire serait perdue)", JOURNAL,
      "    after: { rejectionReason: reason }", "    after: { rejectionReason: null }",
      {"audit": "le MOTIF est dans la ligne — publier l'efface de la colonne", "int-moderation": "la salle reste en BROUILLON avec son créneau"})
cible("A-2. ⛔ la ligne d'une approbation ne porte plus le NOMBRE de salles archivées", JOURNAL,
      "after.archivedVenues = archivedVenues;", "after.archivedVenues = 0;",
      {"audit": "approuver : le nombre de salles archivées voyage", "int-journal": "approuver une suppression : `account_deletion.approve`, le NOMBRE de salles archivées"})
cible("A-3. ⛔ la ligne d'une décision de suppression désigne l'ACTEUR comme entité (et non la demande)", JOURNAL,
      "    entityId: requestId,", "    entityId: actor.userId,",
      {"audit": "approuver : le nombre de salles archivées voyage"})
cible("A-4. ⛔ R-5 — une ligne porte une note de décision (une donnée que la règle interdit d'écrire)", JOURNAL,
      '    before: { status: "PENDING" },', '    before: { status: "PENDING", decisionNote: "x" },',
      {"audit": "aucune clé n'est un nom de donnée personnelle (e-mail, téléphone, nom, note de décision)"})
cible("A-5. ⛔ la ligne d'une publication écrit toujours DRAFT comme statut de départ (le PENDING verrouillé se lirait « brouillon »)", JOURNAL,
      "    before: { publicationStatus: from },", "    before: { publicationStatus: VenuePublicationStatus.DRAFT },",
      {"audit": "le statut de départ est celui qu'on passe"})
cible("A-6. ⛔ la ligne de promotion désigne un acteur-compte (aucun admin n'existe encore : l'acteur est `SCRIPT`)", JOURNAL,
      '    actorRole: "SCRIPT",', "    actorRole: UserRole.ADMIN,",
      {"audit": "pas d'acteur-compte (aucun admin n'existe encore)"})

# ── Q — la FILE (`venue-review-queue.ts`).
cible("Q-1. ⛔ publier ne part plus du `PENDING` verrouillé", FILE,
      "= [VenuePublicationStatus.DRAFT, VenuePublicationStatus.PENDING];", "= [VenuePublicationStatus.DRAFT];",
      {"file": "publier part de TOUT ce qui n'est pas déjà publié"})
cible("Q-2. ⛔ MD-ADM-4 — rejeter part aussi d'une salle PUBLIÉE (le sens unique d'A3-④ tombe)", FILE,
      "REJECTABLE_FROM: readonly VenuePublicationStatus[] = [VenuePublicationStatus.DRAFT];",
      "REJECTABLE_FROM: readonly VenuePublicationStatus[] = [VenuePublicationStatus.DRAFT, VenuePublicationStatus.PUBLISHED];",
      {"file": "rejeter ne part que de DRAFT", "int-moderation": "rejeter une salle PUBLIÉE est refusé (409 VENUE_NOT_DRAFT)"})
cible("Q-3. ⛔ une page entièrement dans le second groupe repart du DÉBUT du second (les rejetées se répètent d'une page à l'autre)", FILE,
      "  const secondSkip = Math.max(0, offset - firstTotal);", "  const secondSkip = 0;",
      {"file": "une page entièrement dans le second groupe", "int-moderation": "les salles déjà rejetées RESTENT dans la file, rangées APRÈS les autres"})
cible("Q-4. ⛔ le second groupe demande plus de lignes qu'il n'en a (une page au-delà de la fin n'est plus vide)", FILE,
      "Math.min(pageSize - firstTake, secondTotal - secondSkip)", "Math.min(pageSize - firstTake, Number.MAX_SAFE_INTEGER)",
      {"file": "une page au-delà de la fin : AUCUNE ligne demandée"})
cible("Q-5. ⛔ une salle PUBLIÉE porte de nouveau un refus (une valeur périmée de la colonne se lirait comme un refus en cours)", FILE,
      "  if (reason === null || status === VenuePublicationStatus.PUBLISHED) return null;", "  if (reason === null) return null;",
      {"file": "une salle PUBLIÉE ne porte jamais de refus", "service-pro": "une salle publiée ne montre JAMAIS de refus"})
cible("Q-6. ⛔ la date d'un refus est celle de la ligne la plus ANCIENNE (la dernière lue gagne)", FILE,
      "if (row.entityId !== null && !out.has(row.entityId)) out.set(row.entityId, row.createdAt);", "if (row.entityId !== null) out.set(row.entityId, row.createdAt);",
      {"file": "rend, par entité, la PREMIÈRE ligne d'une liste triée"})
cible("Q-7. ⛔ une date de refus INVENTÉE quand le journal n'a pas de ligne", FILE,
      "rejectedAt: rejectedAt === null ? null : rejectedAt.toISOString()", "rejectedAt: rejectedAt === null ? new Date(0).toISOString() : rejectedAt.toISOString()",
      {"file": "le journal n'a pas de ligne (motif écrit à la main) : le motif est rendu, la date est `null`"})

# ── S — le SERVICE ADMIN (`venues-admin.service.ts`) — fichier de la carte D304 pour `setRates` : muté le temps d'une mesure (D318), restauré à l'octet.
cible("S-1. ⛔ MD-ADM-4 — publier n'écrit plus SOUS CONDITION du statut (le check-and-set redevient une écriture par identifiant)", SERVICE_ADMIN,
      "where: { id: current.id, deletedAt: null, publicationStatus: { in: [...PUBLISHABLE_FROM] } },", "where: { id: current.id, deletedAt: null },",
      {"service-admin": "DRAFT → UN updateMany conditionné au statut (check-and-set)"})
cible("S-2. ⛔ R-2 — publier n'efface plus le motif d'un refus (une salle publiée garderait « rejetée »)", SERVICE_ADMIN,
      "data: { publicationStatus: VenuePublicationStatus.PUBLISHED, rejectionReason: null }", "data: { publicationStatus: VenuePublicationStatus.PUBLISHED }",
      {"service-admin": "DRAFT → UN updateMany conditionné au statut (check-and-set)", "int-moderation": "rejetée puis publiée : le motif est effacé de la colonne"})
cible("S-3. ⛔ MD-ADM-6 — la ligne de journal de la publication s'écrit HORS de la transaction (une trace sans action reste possible)", SERVICE_ADMIN,
      "await tx.auditLog.create({ data: venuePublishEntry(", "await this.prisma.auditLog.create({ data: venuePublishEntry(",
      {"int-journal": "publier : un échec au COMMIT annule aussi la ligne"})
cible("S-4. ⛔ la course perdue écrit tout de même une ligne de journal (compte 0 traité comme un succès)", SERVICE_ADMIN,
      "      if (count === 1) {\n        await tx.auditLog.create({ data: venuePublishEntry(", "      if (true) {\n        await tx.auditLog.create({ data: venuePublishEntry(",
      {"service-admin": "la course perdue : le compte est 0 parce qu'un AUTRE geste a publié entre-temps"})
cible("S-5. ⛔ un compte 0 sur une salle supprimée entre-temps répond un conflit au lieu du 404 indistinct", SERVICE_ADMIN,
      "      if (!now) this.throwNotFound();\n      if (now.publicationStatus === VenuePublicationStatus.PUBLISHED) return this.toDTO(now);",
      '      if (!now) throw new ConflictException({ code: "VENUE_CHANGED", message: "admin.errors.venueChanged" });\n      if (now.publicationStatus === VenuePublicationStatus.PUBLISHED) return this.toDTO(now);',
      {"service-admin": "le compte est 0 parce que la salle a été SUPPRIMÉE entre-temps"})
cible("S-6. ⛔ D46 — la garde « au moins un créneau actif » ne refuse plus la publication", SERVICE_ADMIN,
      "      if (activeSlots === 0) {", "      if (false) {",
      {"service-admin": "D46 — sans créneau ACTIF : 409 SLOT_TEMPLATE_REQUIRED", "int-moderation": "D46 — sans créneau ACTIF : 409 SLOT_TEMPLATE_REQUIRED"})
cible("S-7. ⛔ le rejet n'écrit plus SOUS CONDITION d'un brouillon (un rejet s'écrit sur une salle publiée : la course publier / rejeter)", SERVICE_ADMIN,
      "publicationStatus: { in: [...REJECTABLE_FROM] }, ", "publicationStatus: undefined, ",
      {"service-admin": "un brouillon jamais rejeté : UN updateMany conditionné", "int-moderation": "MD-ADM-4 — rejeter une salle PUBLIÉE est refusé", "int-moderation#2": "publier et rejeter en MÊME TEMPS"})
cible("S-8. ⛔ le rejet n'écrit plus SOUS CONDITION « jamais rejetée » (un second motif écrase le premier)", SERVICE_ADMIN,
      ", rejectionReason: previous },\n        data: { rejectionReason: reason }", ", rejectionReason: undefined },\n        data: { rejectionReason: reason }",
      {"service-admin": "un brouillon jamais rejeté : UN updateMany conditionné", "int-moderation": "deux corrections à motifs DIFFÉRENTS"})
cible("S-9. ⛔ MD-ADM-6 — la ligne de journal du rejet s'écrit HORS de la transaction", SERVICE_ADMIN,
      "const ligne = await tx.auditLog.create({", "const ligne = await this.prisma.auditLog.create({",
      {"int-journal": "rejeter une salle : un échec au COMMIT annule aussi la ligne"})
cible("S-10. ⛔ « même état, même requête, même réponse » — le MÊME motif rejoué répond un conflit", SERVICE_ADMIN,
      "if (current.rejectionReason === reason) return this.sameRejection(tx, venueId, reason);", "if (false) return this.sameRejection(tx, venueId, reason);",
      {"service-admin": "« même état, même requête, même réponse » — le MÊME motif", "int-moderation": "rejeter DEUX FOIS avec le même motif : la même réponse"})
cible("S-11. ⛔ rejeter une salle publiée répond avec le code d'un AUTRE refus", SERVICE_ADMIN,
      'if (current.publicationStatus !== VenuePublicationStatus.DRAFT) {\n        throw new ConflictException({ code: VenueModerationErrorCode.VENUE_NOT_DRAFT, message: "admin.errors.venueNotDraft" });',
      'if (current.publicationStatus !== VenuePublicationStatus.DRAFT) {\n        throw new ConflictException({ code: VenueModerationErrorCode.VENUE_ALREADY_REJECTED, message: "admin.errors.venueNotDraft" });',
      {"service-admin": "MD-ADM-4 — une salle PUBLIÉE : 409 VENUE_NOT_DRAFT (le sens unique)"})
cible("S-12. ⛔ rejeter avec un AUTRE motif répond avec le code d'un AUTRE refus", SERVICE_ADMIN,
      'code: VenueModerationErrorCode.VENUE_ALREADY_REJECTED, message: "admin.errors.venueAlreadyRejected"', 'code: VenueModerationErrorCode.VENUE_NOT_DRAFT, message: "admin.errors.venueAlreadyRejected"',
      {"service-admin": "un AUTRE motif sur une salle déjà rejetée : 409 VENUE_ALREADY_REJECTED"})
cible("S-13. ⛔ R-1 — le rejet écrit un taux en plus du motif", SERVICE_ADMIN,
      "        data: { rejectionReason: reason }", "        data: { rejectionReason: reason, cashbackRateBps: 0 }",
      {"service-admin": "R-1 — le rejet n'écrit ni ne lit AUCUN taux"})
cible("S-14. ⛔ D-6 (l2) — la file contient aussi les salles SUPPRIMÉES", SERVICE_ADMIN,
      "export const REVIEW_QUEUE_WHERE = {\n  deletedAt: null,\n  publicationStatus", "export const REVIEW_QUEUE_WHERE = {\n  publicationStatus",
      {"service-admin": "la condition de la file : brouillon VIVANT avec au moins un créneau ACTIF", "int-moderation": "ne rend QUE les brouillons vivants qui ont au moins un créneau ACTIF"})
cible("S-15. ⛔ D-6 (l2) — la file contient aussi les brouillons SANS créneau actif", SERVICE_ADMIN,
      "  publicationStatus: VenuePublicationStatus.DRAFT,\n  slotTemplates: { some: { isActive: true } }\n} satisfies", "  publicationStatus: VenuePublicationStatus.DRAFT\n} satisfies",
      {"service-admin": "la condition de la file : brouillon VIVANT avec au moins un créneau ACTIF", "int-moderation": "ne rend QUE les brouillons vivants qui ont au moins un créneau ACTIF"})
cible("S-16. ⛔ MD-ADM-8 — le total de la file ne suit plus le filtre (le compte du premier groupe ignore sa condition)", SERVICE_ADMIN,
      "const firstTotal = await tx.venue.count({ where: whereNeverRejected });", "const firstTotal = await tx.venue.count({ where: REVIEW_QUEUE_WHERE });",
      {"service-admin": "le filtre vit dans le WHERE : le compte et la lecture de CHAQUE groupe partagent le MÊME where", "int-moderation": "R-2 — les salles déjà rejetées RESTENT dans la file"})
cible("S-17. ⛔ la file n'est plus départagée par l'identifiant (l'ordre de deux salles créées au même instant n'est plus déterministe)", SERVICE_ADMIN,
      'const QUEUE_ORDER = [{ createdAt: "asc" }, { id: "asc" }] satisfies', 'const QUEUE_ORDER = [{ createdAt: "asc" }] satisfies',
      {"service-admin": "les non rejetées d'abord, les rejetées ensuite ; chaque groupe trié par date de création puis id"})
cible("S-18. ⛔ le second groupe de la file ignore son saut (une page profonde dans les rejetées repart du début)", SERVICE_ADMIN,
      "skip: second.skip, take: second.take, select: VENUE_QUEUE_SELECT", "skip: 0, take: second.take, select: VENUE_QUEUE_SELECT",
      {"service-admin": "une page entièrement dans le second groupe passe son saut RELATIF au second"})
cible("S-19. ⛔ la date des refus se lit pour TOUTES les salles de la page (et plus pour les seules rejetées)", SERVICE_ADMIN,
      "entityId: { in: secondRows.map((r) => r.id) } },", "entityId: undefined },",
      {"service-admin": "la date des refus se lit en UNE requête pour toute la page"})
cible("S-20. ⛔ R-1 — la file sélectionne un taux", SERVICE_ADMIN,
      "  updatedAt: true,\n  rejectionReason: true,\n  ...CITY_OWNER_SLOTS_SELECT\n} as const;\n\n/** Le détail", "  updatedAt: true,\n  rejectionReason: true,\n  commissionRateBps: true,\n  ...CITY_OWNER_SLOTS_SELECT\n} as const;\n\n/** Le détail",
      {"service-admin": "R-1 — la lecture de la file ne sélectionne AUCUN taux"})
cible("S-21. ⛔ le détail ne lit plus la date du refus au journal", SERVICE_ADMIN,
      "const rejectedAt = row.rejectionReason === null ? null : await this.latestRejectionDate(this.prisma, row.id);", "const rejectedAt = null;",
      {"service-admin": "un brouillon rejeté : le motif et la date lue au journal", "int-moderation": "une salle PUBLIÉE se lit aussi (l'admin voit toute salle vivante) ; une rejetée porte son motif et sa date"})
cible("S-22. ⛔ R-1 — le réglage des taux écrit une ligne de journal (MD-ADM-17 : un journal des taux ajouté sans décision)", SERVICE_ADMIN,
      "    const row = await this.prisma.venue.update({\n      where: { id: current.id },\n      data: { ...input },",
      '    await this.prisma.auditLog.create({ data: { actorRole: "ADMIN", action: "commission_rate.update", entityType: "venue", entityId: current.id } });\n    const row = await this.prisma.venue.update({\n      where: { id: current.id },\n      data: { ...input },',
      {"service-admin": "R-1 — le réglage des taux n'écrit AUCUNE ligne", "int-journal": "R-1 — le réglage des taux n'écrit AUCUNE ligne"}, genre="insertion")

# ── C — les CONTRÔLEURS.
cible("C-1. ⛔ la publication ne transmet plus l'ACTEUR (la ligne de journal désignerait quelqu'un d'autre)", CTRL_ADMIN,
      "return this.venues.publish(id, admin);", "return this.venues.publish(id, { userId: id, role: admin.role });",
      {"int-journal": "publier une salle : `venue.publish`, entité `venue`, l'admin"})
cible("C-2. ⛔ MD-ADM-1 — le contrôleur admin accepte aussi un PRO (le rôle de classe n'est plus ADMIN seul)", CTRL_ADMIN,
      '@Roles(UserRole.ADMIN)\n@Controller("admin/venues")', '@Roles(UserRole.ADMIN, UserRole.PRO)\n@Controller("admin/venues")',
      {"int-rbac": "un PRO authentifié ne franchit AUCUNE route admin"})
# ⚠ NI C-3 NI K-2 ne se mesurent par `contract-api-client.int-spec.ts` : `GET /admin/venues/:id` ABSORBE « pending » et « pending-publication » (un segment quelconque) — le test de chemins ne voit pas un renommage qui retombe sur
# la route à paramètre, mesuré à la première campagne (VERT). C'est précisément pourquoi la route statique est mesurée à l'intégration (`l'URL pending-publication n'est PAS lue comme un identifiant`).
cible("C-3. ⛔ la route de la file change de nom (le client appellerait une route qui n'existe plus)", CTRL_ADMIN,
      '@Get("pending-publication")', '@Get("pending")',
      {"int-moderation": "l'URL `pending-publication` n'est PAS lue comme un identifiant"})
cible("C-4. ⛔ la lecture du refus reçoit l'identifiant de la SALLE à la place de celui du pro (un identifiant qui « ressemble », D149)", CTRL_PRO,
      "return this.venues.getPublicationReview(user.userId, id);", "return this.venues.getPublicationReview(id, id);",
      {"int-moderation": "l'état de publication, le motif et la date — rien d'autre"})

# ── P / V — la lecture du REFUS par le pro (`venues.service.ts`, `venue-store.prisma.ts`).
cible("P-1. ⛔ la lecture du refus ne court-circuite plus un identifiant mal formé (le port est interrogé)", SERVICE_PRO,
      "Promise<VenuePublicationReviewDTO> {\n    this.assertUuidShapeOr404(venueId);", "Promise<VenuePublicationReviewDTO> {\n    void venueId;",
      {"service-pro": "id hors motif UUID : 404 indistinct SANS toucher le port"})
cible("P-2. ⛔ une salle qui n'est pas la mienne répond un contenu au lieu du 404 indistinct", SERVICE_PRO,
      "    if (!lu) this.throwNotFound();", '    if (!lu) return { publicationStatus: "DRAFT", rejection: null };',
      {"service-pro": "le port rend `null` (inexistante, supprimée, à un autre pro) : le MÊME 404 indistinct"})
cible("P-3. ⛔ le refus perd sa DATE (le motif seul est rendu)", SERVICE_PRO,
      "rejection: toRejection(lu.publicationStatus, lu.rejectionReason, lu.rejectedAt)", "rejection: lu.rejectionReason === null ? null : { reason: lu.rejectionReason, rejectedAt: null }",
      {"service-pro": "un brouillon rejeté : l'état, le motif et la date"})
cible("V-1. ⛔ D149 — la lecture du refus n'exige plus l'APPARTENANCE (la salle d'un autre pro se lit)", MAGASIN,
      "      where: this.appartenance(userId, venueId),\n      select: { id: true, publicationStatus: true, rejectionReason: true }", "      where: { id: venueId, deletedAt: null },\n      select: { id: true, publicationStatus: true, rejectionReason: true }",
      {"magasin": "le WHERE est celui d'`trouverVivante` — id + vivante + à moi", "int-moderation": "404 indistincts : la salle d'un AUTRE pro, supprimée, uuid inconnu, id malformé"})
cible("V-2. ⛔ R-3 — la lecture du refus sélectionne aussi un taux (un contrat étroit qui s'élargit)", MAGASIN,
      "select: { id: true, publicationStatus: true, rejectionReason: true }", "select: { id: true, publicationStatus: true, rejectionReason: true, commissionRateBps: true }",
      {"magasin": "le WHERE est celui d'`trouverVivante` — id + vivante + à moi"})
cible("V-3. ⛔ la date du refus se lit au journal SANS filtrer sur la salle (la date d'une autre salle)", MAGASIN,
      "entityType: AdminAuditEntity.VENUE, entityId: row.id }", "entityType: AdminAuditEntity.VENUE }",
      {"magasin": "rejetée : la date est celle de la ligne `venue.reject` LA PLUS RÉCENTE de CETTE salle"})
cible("V-4. ⛔ la date du refus est celle de la ligne la plus ANCIENNE", MAGASIN,
      '      orderBy: [{ createdAt: "desc" }, { id: "desc" }],\n      select: { createdAt: true }\n    });\n    return { publicationStatus: row.publicationStatus, rejectionReason: row.rejectionReason',
      '      orderBy: [{ createdAt: "asc" }, { id: "asc" }],\n      select: { createdAt: true }\n    });\n    return { publicationStatus: row.publicationStatus, rejectionReason: row.rejectionReason',
      {"magasin": "rejetée : la date est celle de la ligne `venue.reject` LA PLUS RÉCENTE de CETTE salle"})

# ── D — la file des SUPPRESSIONS (`account-deletion.service.ts`).
cible("D-1. ⛔ MD-ADM-6 — la ligne de journal d'une APPROBATION s'écrit hors de la transaction", SUPPRESSION,
      "await tx.auditLog.create({ data: deletionDecisionEntry({ userId: adminId, role: UserRole.ADMIN }, pending.id, \"APPROVED\"", "await this.prisma.auditLog.create({ data: deletionDecisionEntry({ userId: adminId, role: UserRole.ADMIN }, pending.id, \"APPROVED\"",
      {"int-journal": "approuver une suppression : un échec au COMMIT annule aussi la ligne"})
cible("D-2. ⛔ la ligne d'une approbation ne porte plus le nombre de salles archivées", SUPPRESSION,
      'pending.id, "APPROVED", archived.length)', 'pending.id, "APPROVED", 0)',
      {"suppression": "approve : UNE ligne `account_deletion.approve`, dans la transaction", "int-journal": "approuver une suppression : `account_deletion.approve`, le NOMBRE de salles archivées"})
cible("D-3. ⛔ MD-ADM-6 — la ligne de journal d'un REFUS de suppression s'écrit hors de la transaction", SUPPRESSION,
      "await tx.auditLog.create({ data: deletionDecisionEntry({ userId: adminId, role: UserRole.ADMIN }, requestId, \"REJECTED\")", "await this.prisma.auditLog.create({ data: deletionDecisionEntry({ userId: adminId, role: UserRole.ADMIN }, requestId, \"REJECTED\")",
      {"int-journal": "rejeter une suppression : un échec au COMMIT annule aussi la ligne"})
cible("D-4. ⛔ la ligne d'un refus de suppression écrit « approuvé »", SUPPRESSION,
      'role: UserRole.ADMIN }, requestId, "REJECTED")', 'role: UserRole.ADMIN }, requestId, "APPROVED")',
      {"suppression": "reject : UNE ligne `account_deletion.reject`, dans une TRANSACTION"})

# ── F — le PREMIER ADMIN (`first-admin.ts`).
cible("F-1. ⛔ D-3 — un compte suspendu ou anonymisé est promu", PREMIER_ADMIN,
      "  if (user.status !== UserStatus.ACTIVE) return", "  if (false) return",
      {"premier-admin": "un compte suspendu ou anonymisé : refus NOT_ACTIVE", "int-premier-admin": "compte suspendu : NOT_ACTIVE"})
cible("F-2. ⛔ D-3 — un compte dont l'e-mail n'est pas vérifié est promu", PREMIER_ADMIN,
      "  if (user.emailVerifiedAt === null) return", "  if (false) return",
      {"premier-admin": "un compte dont l'e-mail n'est pas vérifié : refus EMAIL_NOT_VERIFIED", "int-premier-admin": "e-mail NON vérifié : EMAIL_NOT_VERIFIED"})
cible("F-3. ⛔ MD-ADM-3 — un compte PRO est promu (il perdrait l'accès à ses salles)", PREMIER_ADMIN,
      "  if (user.role === UserRole.PRO) return", "  if (false) return",
      {"premier-admin": "un compte PRO est refusé (IS_PRO)", "int-premier-admin": "un compte PRO : IS_PRO"})
cible("F-4. ⛔ l'écriture n'est plus conditionnée au rôle CLIENT (deux promotions simultanées, ou un compte qui a changé)", PREMIER_ADMIN,
      "where: { id: compte.id, role: UserRole.CLIENT, status: UserStatus.ACTIVE, emailVerifiedAt: { not: null } },", "where: { id: compte.id },",
      {"premier-admin": "promeut : UN updateMany conditionné (CLIENT, ACTIF, e-mail vérifié)"})
cible("F-5. ⛔ D-3 — le script écrit aussi un mot de passe (« aucun mot de passe manipulé »)", PREMIER_ADMIN,
      "data: { role: UserRole.ADMIN }", "data: { role: UserRole.ADMIN, passwordHash: null }",
      {"premier-admin": "promeut : UN updateMany conditionné (CLIENT, ACTIF, e-mail vérifié)", "int-premier-admin": "le rôle devient ADMIN ; une connexion NEUVE ouvre les routes ADMIN"})
cible("F-6. ⛔ la promotion n'écrit plus de ligne de journal", PREMIER_ADMIN,
      "    await tx.auditLog.create({ data: promoteAdminEntry(compte.id, compte.role) });\n", "    void promoteAdminEntry(compte.id, compte.role);\n",
      {"premier-admin": "UNE ligne de journal dans la MÊME transaction, après l'écriture, sans e-mail", "int-premier-admin": "le rôle devient ADMIN ; une connexion NEUVE ouvre les routes ADMIN"})
cible("F-7. ⛔ un compte qui a changé entre la lecture et l'écriture est tout de même journalisé (compte 0 non refusé)", PREMIER_ADMIN,
      "    if (count !== 1) return", "    if (count > 1) return",
      {"premier-admin": "la course perdue : le compte a changé entre la lecture et l'écriture"})
cible("F-8. ⛔ --dry-run écrit tout de même", PREMIER_ADMIN,
      "    if (options.dryRun === true) return", "    if (false) return",
      {"premier-admin": "--dry-run : rend ce qui SERAIT fait, n'écrit RIEN", "int-premier-admin": "--dry-run : dit ce qui SERAIT fait, n'écrit RIEN"})
cible("F-9. ⛔ l'adresse saisie n'est plus abaissée en minuscules (l'inscription les stocke en minuscules)", PREMIER_ADMIN,
      "  return raw.trim().toLowerCase();", "  return raw.trim();",
      {"premier-admin": "rogne les espaces et passe en minuscules", "int-premier-admin": "l'adresse saisie au terminal est normalisée"})
cible("F-10. ⛔ deux promotions simultanées écrivent deux lignes (le compte conditionné ne protège plus)", PREMIER_ADMIN,
      "    if (verdict.action === \"ALREADY_ADMIN\") return { outcome: \"ALREADY_ADMIN\", userId: compte.id };", "    if (false) return { outcome: \"ALREADY_ADMIN\", userId: compte.id };",
      {"premier-admin": "un compte déjà ADMIN : ALREADY_ADMIN, aucune écriture", "int-premier-admin": "un compte déjà ADMIN : ALREADY_ADMIN"})

# ── K — les CLIENTS d'API.
cible("K-1. ⛔ le rejet envoie le motif sous une autre clé (le serveur répondrait 400)", CLIENT_ADMIN,
      "{ method: \"POST\", body: { reason } }", "{ method: \"POST\", body: { motif: reason } }",
      {"client-admin": "`rejectVenue` POSTE `/admin/venues/:id/reject` avec le motif"})
cible("K-2. ⛔ l'adresse de la file n'est plus celle du serveur (le client appellerait une route qui n'existe pas)", CLIENT_ADMIN,
      "`/admin/venues/pending-publication?${pendingQueryString(query)}`", "`/admin/venues/pending?${pendingQueryString(query)}`",
      {"client-admin": "`listPendingVenues` LIT `/admin/venues/pending-publication`"})
cible("K-3. ⛔ l'identifiant d'une salle n'est plus encodé dans l'adresse (un `/` sortirait de son segment)", CLIENT_ADMIN,
      "getVenue: (venueId) => request<VenueAdminDetailDTO>(`/admin/venues/${encodeURIComponent(venueId)}`)", "getVenue: (venueId) => request<VenueAdminDetailDTO>(`/admin/venues/${venueId}`)",
      {"client-admin": "`getVenue` encode un identifiant qui contiendrait un `/`"})
cible("K-4. ⛔ MD-ADM-7 — le client admin gagne une méthode qui écrit un taux", CLIENT_ADMIN,
      "    getVenue: (venueId) =>", "    setRates: (venueId: string) => request(`/admin/venues/${venueId}/commission-rate`, { method: \"PATCH\", body: {} }),\n    getVenue: (venueId) =>",
      {"client-admin": "la SOURCE du client admin ne nomme ni `commission-rate`"}, genre="insertion")
cible("K-5. ⛔ l'adresse de la lecture du refus n'est plus celle du serveur", CLIENT_PRO,
      "`/pro/venues/${encodeURIComponent(venueId)}/publication`", "`/pro/venues/${encodeURIComponent(venueId)}/publication-review`",
      {"client-pro": "LIT `/pro/venues/:id/publication` (GET, aucun corps)", "int-contrat": "CHAQUE chemin appelé par @zwadj/api-client existe sur le routeur Nest"})


def _est_int(c: dict) -> bool:
    return any(_mesure_de(m) in MESURES_INT for m in c["mesures"])


def _jouees() -> list[dict]:
    """Les cibles jouées. Sans `--int`, les cibles d'INTÉGRATION (PostgreSQL réel) ne sont pas jouées : elles sont COMPTÉES comme telles, jamais comme mordues.
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
    Copie du lecteur de `neutralize-r43.py` (calibré par D316 et D325) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras de `neutralize-r43.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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


# ── LE CONTRÔLE D'INVARIANCE DE R-1 (« `setRates` et `PATCH …/commission-rate` ne sont ni touchés ni journalisés ») — pas une mutation : une COMPARAISON au texte de `9ec8abf`.
SHA_DEPART = "9ec8abf702068069dff5aa07605a884a7483f9b5"
INVARIANTS_R1 = [
    ("le bloc `VENUE_ADMIN_SELECT`", "const VENUE_ADMIN_SELECT = {", "} as const;"),
    ("la méthode `setRates`", "  async setRates(", "\n  }\n"),
]


def _bloc(texte: str, debut: str, fin: str) -> str | None:
    texte = texte.replace("\r\n", "\n")
    i = texte.find(debut)
    if i < 0 or texte.count(debut) != 1:
        return None
    j = texte.find(fin, i + len(debut))
    return None if j < 0 else texte[i:j + len(fin)]


def controle_r1() -> bool:
    """Compare chaque bloc de R-1 du fichier d'AUJOURD'HUI à celui de `9ec8abf` (lu par `git show`, jamais recopié). Calibration à deux bras, en mémoire : un bloc identique est conforme, un bloc dont UN caractère change
    ne l'est pas. Le contrôle imprime ce qu'il a COMPARÉ (le nombre de lignes de chaque bloc) à côté du verdict (D290)."""
    r = subprocess.run(["git", "show", f"{SHA_DEPART}:{SERVICE_ADMIN}"], capture_output=True, text=True, encoding="utf-8", errors="replace")
    if r.returncode != 0:
        print(f"✗ contrôle R-1 : `git show {SHA_DEPART[:7]}:{SERVICE_ADMIN}` a échoué : {r.stderr.strip()[:200]}")
        return False
    avant = r.stdout
    maintenant = io.open(SERVICE_ADMIN, encoding="utf-8", newline="").read()
    ok_tout = True
    for nom, debut, fin in INVARIANTS_R1:
        a, m = _bloc(avant, debut, fin), _bloc(maintenant, debut, fin)
        if a is None or m is None:
            print(f"  contrôle R-1 ✗ {nom} : bloc introuvable (avant : {a is not None}, maintenant : {m is not None})")
            ok_tout = False
            continue
        calib_pos = a == a.replace("\r\n", "\n")
        calib_neg = a != a.replace("{", "(", 1)
        if not (calib_pos and calib_neg):
            print(f"  contrôle R-1 ✗ {nom} : calibration manquée (positif {calib_pos}, négatif {calib_neg})")
            ok_tout = False
            continue
        egal = a == m
        ok_tout &= egal
        print(f"  contrôle R-1 {'✓' if egal else '✗'} {nom} : {len(a.splitlines())} ligne(s) comparée(s) à `{SHA_DEPART[:7]}` · {'identique' if egal else 'DIFFÉRENT'} (attendu identique)")
    return ok_tout


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


def _entete_journal() -> str:
    """⛔ R-9 : la PREMIÈRE ligne de chaque journal est l'empreinte du harnais."""
    return f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})\n"


def main() -> int:
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    print("contrôle R-1 (`setRates` et `VENUE_ADMIN_SELECT` identiques à `9ec8abf`) :")
    if not controle_r1():
        print("✗ ABANDON : R-1 n'est pas tenu (le texte du réglage des taux a changé) — rien n'est mesuré.")
        return 2
    if FILTRE and not DECOUVERTE:
        print("✗ ADM1_FILTRE n'est admis qu'avec ADM1_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par ADM1_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if (not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE))
               and (not SEULEMENT or c["libelle"].split(".")[0] in SEULEMENT)]
    if SEULEMENT:
        print(f"⚠ REPRISE DÉCLARÉE : seules les cibles {', '.join(SEULEMENT)} sont jouées (ADM1_SEULEMENT) — jamais après une modification du harnais.")
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
        # La sortie ENTIÈRE se journalise, après l'empreinte du harnais (R-9) : un rouge qu'on ne peut plus relire se relance sans être lu (D270).
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
