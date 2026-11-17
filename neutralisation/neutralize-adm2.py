#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 52 (D350), lot ADM-2 : les écrans `/admin` de l'app Pro, la garde de rôle ADMIN, le refus lu par le pro, la correction du motif d'un rejet, la file des suppressions rendue
sûre sous course, le fournisseur des salles qui ne garde rien d'un autre compte.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · la FILE des suppressions (`account-deletion.service.ts`) : le check-and-set DANS la transaction, son compte 0, ses codes d'erreur (D-*) ;
  · la CORRECTION du motif (`venues-admin.service.ts`, `admin-audit.ts`) : le motif précédent comme condition, le même motif sans écriture, l'ancien dans la ligne de journal, la course (V-*, A-*) ;
  · la GARDE de rôle (`require-pro.tsx`, `require-admin.tsx`, `login-page.tsx`) : l'ADMIN renvoyé sous `/admin`, le PRO et le CLIENT refusés, l'anonyme renvoyé, le chargement silencieux (G-*) ;
  · la COQUILLE et la balise `noindex` (`admin-shell.tsx`, `use-no-index.ts`) (S-*, N-*) ;
  · les TEXTES et la distinction refus / panne (`admin-texts.ts`) et les deux FORMATEURS, la date à l'heure d'Alger et le taux (`admin-format.ts`, extension 5 : déplacés par le correctif de la garde FC-6) (T-*) ;
  · les TROIS ÉCRANS (`venue-queue-page.tsx`, `venue-review-page.tsx`, `deletion-requests-page.tsx`) : la panne n'est pas le vide, l'ordre du serveur, la pagination, le motif obligatoire, « fait » seulement à la réponse,
    l'irréversible confirmé avant l'appel, un refus lu comme un refus (Q-*, P-*, X-*) ;
  · le REFUS lu par le pro (`publication-review.tsx`, `edit-venue-page.tsx`) : la lecture une fois, la panne n'est pas « pas refusée », l'en-tête, l'étape (R-*) ;
  · le FOURNISSEUR des salles (`pro-venues-context.tsx`) : l'état n'appartient qu'au compte qui l'a lu (C-*) ;
  · les CATALOGUES (`fr.json`, `ar.json`) : la parité (J-*).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-adm2.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-adm2.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    ADM2_DECOUVERTE=1 python3 neutralisation/neutralize-adm2.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, contrôle R-1 manqué, ou arbre non conforme.

⛔ L'EMPREINTE DU HARNAIS EN TÊTE DE CHAQUE JOURNAL (consigne, section 3 ; R-9 de D349) : première ligne de la sortie et de CHAQUE journal de mesure ; un harnais modifié en cours de campagne ⇒ la campagne est
rejouée EN ENTIER.
⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec ; le titre attendu y est marqué en échec ET la PREMIÈRE ligne de son
bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`.
⛔ ÉCART DÉCLARÉ PAR CE HARNAIS (S-192, décision de la session, À RATIFIER) — LA LECTURE DES ÉCRANS : les tests d'écran interrogent le DOM par des REQUÊTES de Testing Library (`getBy…`, `findBy…`), dont l'échec est une
`TestingLibraryElementError` (« Unable to find an element… ») et non une `AssertionError`. D304 et D316 écartent cette forme sur le CHEMIN DE L'ARGENT ; ce lot n'en est pas (D325 : la méthode se décide par ce que le lot
touche — ni paiement, ni montant, ni statut de réservation ou de devis). Le harnais lit donc cette forme comme une morsure de PRÉSENCE (`MORD-REQ`), la COMPTE À PART dans son bilan, la distingue d'un plantage
(`TypeError`, délai, plafond de console : toujours PAS-ASSERTION) et le calibre sur ses deux bras. Les gardes de la file des suppressions et de la correction du motif (API, PostgreSQL réel) se lisent, elles, en
`AssertionError` seule.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution ne doit jamais être une
SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `ADM2_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ UNE NEUTRALISATION DE MESURE N'EST PAS UN CHANGEMENT, MÊME POUR UN FICHIER DE LA CARTE DU CHEMIN DE L'ARGENT (D318) : `venues-admin.service.ts` est muté le temps d'une mesure, puis restauré à l'octet ; le contrôle
R-1 (`setRates` et `VENUE_ADMIN_SELECT` identiques à `b8e5511`) est joué avant la campagne et en refuse le départ s'il échoue.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) la spec e2e (`e2e/specs/r52-administration.e2e.ts`) : ses gardes se neutralisent à la main (procédure : `docs/preuves/D350/neutralisation/e2e-a-la-main.md`) ;
(2) un VRAI navigateur pour les écrans : les tests d'écran tournent sous jsdom ; (3) l'ARABE du refus lu par le pro : sa parité est mesurée, sa justesse de traduction ne l'est pas (clés « à relire par un humain »).

⛔ CIBLES RETIRÉES PAR ÉCRIT, AVEC LEUR MESURE (D325 : une mutation équivalente se retire) : G-2 (un ADMIN déjà connecté sur la page de connexion part vers `/` au lieu de `/admin`) et G-3 (la destination de `login-page.tsx`
ne suit plus le rôle). La découverte (`docs/preuves/D350/neutralisation/decouverte.txt`) n'a trouvé AUCUN test qui rougisse pour ces deux-là : trois mécanismes REDONDANTS conduisent un ADMIN sous `/admin` (la destination du
formulaire, le renvoi de `RedirectIfSession`, le renvoi de `RequireProSession`), et en muter un laisse les autres le mener au même écran. La garde se mesure par la cible G-1 (retirer le renvoi de `RequireProSession`) et, dans le
vrai navigateur, par E-1. Trois MESURES sont retirées pour garde TAUTOLOGIQUE (D223) : « routes » sur G-1, « detail » sur T-1 et sur T-6 — le texte attendu y est DÉRIVÉ de la valeur mutée, le test reste vert par construction.

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-adm1.py` (lui-même copié de `neutralize-r43.py`, calibré D316 / D325 / D331 /
D332 / D333) ; changent le jeu de cibles, la lecture des requêtes de présence (S-192) et la référence du contrôle R-1.
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

# ⛔ LA PREMIÈRE LIGNE DE LA SORTIE : l'empreinte du fichier qui joue la passe.
EMPREINTE_HARNAIS = hashlib.sha256(open(__file__, "rb").read()).hexdigest()
print(f"empreinte du harnais (sha256) : {EMPREINTE_HARNAIS}  ({os.path.basename(__file__)})")

SAUVEGARDE = ".neutralisation-adm2"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "adm2")  # ignoré par git ; ce qu'une décision cite se COPIE (D291), MASQUÉ
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("ADM2_DECOUVERTE") == "1"
# `ADM2_FILTRE="S-,Q-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("ADM2_FILTRE", "").split(",") if p]
# `ADM2_SEULEMENT="S-3,S-4"` rejoue certaines cibles (reprise après un arrêt externe) : DÉCLARÉE, jamais après une modification du harnais (alors : EN ENTIER).
SEULEMENT = [p for p in os.environ.get("ADM2_SEULEMENT", "").split(",") if p]


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    # ⚠ `pnpm exec vitest run -c vitest.config.int.ts` échoue sur TOUT fichier d'intégration (« Nest can't resolve dependencies of the JwtAuthGuard »), mesuré à D349 ; la porte passe par le script du paquet.
    return ["pnpm", "--filter", "@zwadj/api", "run", "test:int", fichier]


MESURES = {
    # ── unitaires : l'app Pro (`@zwadj/pro`, jsdom) et l'API (`@zwadj/api`).
    "garde": _vitest("@zwadj/pro", "src/auth/require-admin.test.tsx"),
    "coquille": _vitest("@zwadj/pro", "src/admin/admin-shell.test.tsx"),
    "file": _vitest("@zwadj/pro", "src/admin/venue-queue-page.test.tsx"),
    "detail": _vitest("@zwadj/pro", "src/admin/venue-review-page.test.tsx"),
    "suppressions": _vitest("@zwadj/pro", "src/admin/deletion-requests-page.test.tsx"),
    "textes": _vitest("@zwadj/pro", "src/admin/admin-texts.test.ts"),
    "noindex": _vitest("@zwadj/pro", "src/admin/use-no-index.test.tsx"),
    "compte": _vitest("@zwadj/pro", "src/admin/session-switch.test.tsx"),
    "refus": _vitest("@zwadj/pro", "src/venues/publication-review.test.tsx"),
    "routes": _vitest("@zwadj/pro", "src/routes.test.tsx"),
    "api-suppression": _vitest("@zwadj/api", "src/account/account-deletion.service.spec.ts"),
    "api-admin": _vitest("@zwadj/api", "src/venues/venues-admin.service.spec.ts"),
    "api-journal": _vitest("@zwadj/api", "src/common/admin-audit.spec.ts"),
    "parite": _vitest("@zwadj/api", "src/common/i18n-parity.spec.ts"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement.
    "int-courses": _vitest_int("test/int/account-deletion-race.int-spec.ts"),
    "int-moderation": _vitest_int("test/int/admin-moderation.int-spec.ts"),
    # ── la spec e2e (`--e2e`) : le navigateur réel ; lue par le lecteur Playwright (D323, D347). Les cibles `E-*` mutent le code de l'APPLICATION, jamais la spec.
    "e2e-r52": ["pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test", "specs/r52-administration.e2e.ts", "--reporter=list"],
}
MESURES_INT = {"int-courses", "int-moderation"}
MESURES_E2E = {"e2e-r52"}
MODE = {nom: ("e2e" if nom in MESURES_E2E else "vitest") for nom in MESURES}
AVEC_INT = "--int" in sys.argv
AVEC_E2E = "--e2e" in sys.argv

SUPPRESSION = "apps/api/src/account/account-deletion.service.ts"
SERVICE_ADMIN = "apps/api/src/venues/venues-admin.service.ts"
JOURNAL = "apps/api/src/common/admin-audit.ts"
REQUIRE_PRO = "apps/pro/src/auth/require-pro.tsx"
REQUIRE_ADMIN = "apps/pro/src/auth/require-admin.tsx"
LOGIN = "apps/pro/src/auth/login-page.tsx"
COQUILLE = "apps/pro/src/admin/admin-shell.tsx"
NOINDEX = "apps/pro/src/admin/use-no-index.ts"
TEXTES = "apps/pro/src/admin/admin-texts.ts"
FORMATS = "apps/pro/src/admin/admin-format.ts"
FILE = "apps/pro/src/admin/venue-queue-page.tsx"
DETAIL = "apps/pro/src/admin/venue-review-page.tsx"
SUPPRESSIONS = "apps/pro/src/admin/deletion-requests-page.tsx"
REFUS = "apps/pro/src/venues/publication-review.tsx"
EDITION = "apps/pro/src/venues/edit-venue-page.tsx"
FOURNISSEUR = "apps/pro/src/shell/pro-venues-context.tsx"
CATALOGUE_AR = "packages/i18n/messages/ar.json"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── D — la file des SUPPRESSIONS (`account-deletion.service.ts`) : le statut se décide DANS la transaction, en check-and-set.
cible("D-1. ⛔ R-2 — le check-and-set perd sa condition de statut (`updateMany` sans `status: \"PENDING\"`) : deux décisions passent toutes les deux", SUPPRESSION,
      'where: { id: requestId, status: "PENDING" }, data: { status } });', 'where: { id: requestId }, data: { status } });',
      {"int-courses": "l'annulation (validée) précède l'écriture de l'approbation : 400 DELET", "api-suppression": "approve : le PREMIER geste de la transaction est le check-and-set — `u"})
cible("D-2. ⛔ R-2 — un compte 0 ne lève plus (la demande déjà décidée ou annulée est écrasée sans erreur)", SUPPRESSION,
      "if (count !== 1) throw await this.refusalFor(tx, requestId);", "if (count < 0) throw await this.refusalFor(tx, requestId);",
      {"int-courses": "l'annulation (validée) précède l'écriture de l'approbation : 400 DELET", "api-suppression": "demande déjà décidée : 400 DELETION_REQUEST_NOT_PENDING, aucune écritu"})
cible("D-3. ⛔ R-2 — `approve` ne passe plus par le check-and-set (la décision d'avant la transaction décide de nouveau)", SUPPRESSION,
      'await this.claim(tx, requestId, "APPROVED");', "/* claim d'approve retiré */",
      {"int-courses": "l'annulation (validée) précède l'écriture de l'approbation : 400 DELET", "api-suppression": "demande déjà décidée : 400 DELETION_REQUEST_NOT_PENDING, aucune écritu"})
cible("D-4. ⛔ R-2 — `reject` ne passe plus par le check-and-set", SUPPRESSION,
      'await this.claim(tx, requestId, "REJECTED");', "/* claim de reject retiré */",
      {"int-courses": "le REJET arrive en premier, l'approbation derrière : le rejet gagne (2", "api-suppression": "une demande déjà décidée n'écrit AUCUNE ligne de journal (400 avant to"})
cible("D-5. ⛔ R-2 — une demande qui n'est plus en attente répond une erreur d'état impossible au lieu du 400 DELETION_REQUEST_NOT_PENDING", SUPPRESSION,
      'if (row.status !== "PENDING") {\n      return new BadRequestException({', 'if (row.status === "PENDING") {\n      return new BadRequestException({',
      {"int-courses": "l'annulation (validée) précède l'écriture de l'approbation : 400 DELET", "api-suppression": "demande déjà décidée : 400 DELETION_REQUEST_NOT_PENDING, aucune écritu"})
cible("D-6. ⛔ R-2 — une demande inconnue ne répond plus 404", SUPPRESSION,
      "if (!row) {\n      return new NotFoundException({", "if (row) {\n      return new NotFoundException({",
      {"api-suppression": "demande déjà décidée : 400 DELETION_REQUEST_NOT_PENDING, aucune écritu"})

# ── V — la CORRECTION du motif (`venues-admin.service.ts`) — fichier de la carte D304 pour `setRates` : muté le temps d'une mesure (D318), restauré à l'octet ; `setRates` et `VENUE_ADMIN_SELECT` ne sont pas touchés.
cible("V-1. ⛔ R-3 — la correction n'est plus conditionnée au motif PRÉCÉDENT (le check-and-set ne part que d'une salle jamais rejetée : corriger redevient impossible)", SERVICE_ADMIN,
      "publicationStatus: { in: [...REJECTABLE_FROM] }, rejectionReason: previous },", "publicationStatus: { in: [...REJECTABLE_FROM] }, rejectionReason: null },",
      {"api-admin": "R-3 — un AUTRE motif sur une salle déjà rejetée la CORRIGE : check-and", "int-moderation": "R-3 (D350, 1 c de la consigne) — un AUTRE motif sur une salle déjà rej"})
cible("V-2. ⛔ R-3 — le MÊME motif n'est plus reconnu avant l'écriture (une écriture et une ligne de journal pour un rejeu)", SERVICE_ADMIN,
      "if (current.rejectionReason === reason) return this.sameRejection(tx, venueId, reason);", "if (current.rejectionReason !== reason) return this.sameRejection(tx, venueId, reason);",
      {"api-admin": "un brouillon jamais rejeté : UN updateMany conditionné (DRAFT, vivante"})
cible("V-3. ⛔ R-3 — la ligne de journal d'une correction ne garde plus l'ANCIEN motif (`avant` vaut toujours « jamais rejetée »)", SERVICE_ADMIN,
      "data: venueRejectEntry(admin, venueId, reason, previous)", "data: venueRejectEntry(admin, venueId, reason, null)",
      {"api-admin": "R-3 — un AUTRE motif sur une salle déjà rejetée la CORRIGE : check-and", "int-moderation": "la ligne de journal d'une correction garde l'ANCIEN et le NOUVEAU moti"})
cible("V-4. ⛔ R-3 — compte 0 : le motif posé entre-temps par un autre admin, identique au nôtre, n'est plus reconnu (409 au lieu de « même état, même réponse »)", SERVICE_ADMIN,
      "if (now.rejectionReason === reason) return this.sameRejection(tx, venueId, reason);", "if (now.rejectionReason !== reason) return this.sameRejection(tx, venueId, reason);",
      {"api-admin": "MD-ADM-4 — compte 0 (un autre geste est passé entre la lecture et l'éc"})
cible("V-5. ⛔ R-3 — une correction concurrente perdante ne répond plus VENUE_ALREADY_REJECTED", SERVICE_ADMIN,
      'throw new ConflictException({ code: VenueModerationErrorCode.VENUE_ALREADY_REJECTED, message: "admin.errors.venueAlreadyRejected" });',
      'throw new ConflictException({ code: VenueModerationErrorCode.VENUE_NOT_DRAFT, message: "admin.errors.venueAlreadyRejected" });',
      {"api-admin": "MD-ADM-4 — compte 0 (un autre geste est passé entre la lecture et l'éc", "int-moderation": "deux corrections à motifs DIFFÉRENTS sur une salle déjà rejetée, bloqu"})
cible("V-6. ⛔ MD-ADM-4 — une salle PUBLIÉE n'est plus refusée en tête (409 VENUE_NOT_DRAFT) : le sens unique ne tient que par la condition du check-and-set", SERVICE_ADMIN,
      "if (current.publicationStatus !== VenuePublicationStatus.DRAFT) {", "if (current.publicationStatus === VenuePublicationStatus.DRAFT) {",
      {"api-admin": "MD-ADM-4 — une salle PUBLIÉE : 409 VENUE_NOT_DRAFT (le sens unique), rien n'est é"})
cible("V-7. ⛔ MD-ADM-4 — le check-and-set de la correction accepte aussi une salle PUBLIÉE (la condition de statut est élargie : la publication concurrente ne protège plus)", SERVICE_ADMIN,
      "publicationStatus: { in: [...REJECTABLE_FROM] }, rejectionReason: previous }", "publicationStatus: { in: [...REJECTABLE_FROM, VenuePublicationStatus.PUBLISHED] }, rejectionReason: previous }",
      {"int-moderation": "publier et rejeter en MÊME TEMPS, vingt fois : jamais une salle publié"})
cible("V-8. ⛔ R-3 — compte 0 sur une salle SUPPRIMÉE entre-temps : une erreur au lieu du 404 indistinct", SERVICE_ADMIN,
      "if (!now) this.throwNotFound();\n      if (now.publicationStatus !== VenuePublicationStatus.DRAFT) {", "if (!now) throw new Error(\"salle supprimée entre-temps\");\n      if (now.publicationStatus !== VenuePublicationStatus.DRAFT) {",
      {"api-admin": "MD-ADM-4 — compte 0 et la salle a été PUBLIÉE entre-temps : 409 VENUE_"})
cible("A-1. ⛔ R-3 — la ligne de journal d'un rejet n'écrit plus le motif PRÉCÉDENT (`avant` vaut toujours `null`)", JOURNAL,
      "before: { rejectionReason: previous },", "before: { rejectionReason: null },",
      {"api-journal": "R-3 (D350) — une CORRECTION garde l'ANCIEN ET le NOUVEAU motif : « ava"})

# ── G — la GARDE de rôle.
cible("G-1. ⛔ R-4 — un ADMIN hors de `/admin` n'est plus renvoyé sous `/admin` (la carte « mauvais rôle » du Pro le reçoit)", REQUIRE_PRO,
      'if (user.role === "ADMIN") {', 'if (user.role === "ADMIN_") {',
      {"garde": "un ADMIN hors de `/admin` y est RENVOYÉ — tableau de bord, liste des s"})
cible("G-4. ⛔ R-4 — un PRO franchit la garde ADMIN (seul le CLIENT est refusé)", REQUIRE_ADMIN,
      'if (user.role !== "ADMIN") {', 'if (user.role === "CLIENT") {',
      {"garde": "un PRO : la carte de refus (titre, explication, retour à son espace),", "noindex": "le refus d'un PRO sous `/admin` n'est pas une page de l'administration"})
cible("G-5. ⛔ R-4 — le lien de retour est offert au CLIENT et retiré au PRO (inversé)", REQUIRE_ADMIN,
      '{user.role === "PRO" ? (', '{user.role !== "PRO" ? (',
      {"garde": "un PRO : la carte de refus (titre, explication, retour à son espace),"})
cible("G-6. ⛔ R-4 — un anonyme sous `/admin` voit les écrans au lieu d'être renvoyé à la connexion", REQUIRE_ADMIN,
      "return <Navigate to={LOGIN_PATH} replace />;", "return <>{children}</>;",
      {"garde": "anonyme sur `/admin` : renvoyé à la connexion"})
cible("G-7. ⛔ R-4 — pendant le démarrage de la session, la garde décide déjà (l'anonyme transitoire est renvoyé à la connexion)", REQUIRE_ADMIN,
      'if (status === "loading") {', 'if (status === "chargement") {',
      {"garde": "un PRO : la carte de refus (titre, explication, retour à son espace),"})
cible("G-8. ⛔ R-4 — « Se déconnecter » du refus ne fait rien", REQUIRE_ADMIN,
      "onClick={() => void logout()}", "onClick={() => undefined}",
      {"garde": "un CLIENT : le même refus, sans lien vers un espace qui n'est pas le s"})
cible("G-9. ⛔ R-4 — la route des suppressions n'est plus derrière la garde ADMIN (un PRO y lit la page)", "apps/pro/src/App.tsx",
      "<RequireAdminSession>\n            <AdminShell>\n              <DeletionRequestsPage />\n            </AdminShell>\n          </RequireAdminSession>",
      "<AdminShell>\n            <DeletionRequestsPage />\n          </AdminShell>",
      {"garde": "un PRO : la carte de refus (titre, explication, retour à son espace),"})
cible("G-10. ⛔ R-5 — l'adresse des suppressions déclarée n'est plus celle de la table (la page n'est pas atteinte)", "apps/pro/src/App.tsx",
      "path={ADMIN_DELETIONS_PATH}", 'path="/admin/zzz"',
      {"routes": "ADMIN_DELETIONS_PATH (« /admin/suppressions ») : la page s'y rend, et"})

# ── S, N — la COQUILLE et la balise `noindex`.
cible("S-1. ⛔ MD-ADM-9 — la coquille n'appelle plus `useNoIndex` (les écrans deviennent indexables)", COQUILLE,
      "useNoIndex();", "/* noindex retiré */",
      {"noindex": "sur `/admin` et sur `/admin/suppressions` : la balise est là ; elle di"})
cible("S-2. la navigation marque « Salles en attente » actif sous les suppressions (`end` retiré)", COQUILLE,
      "<NavLink to={ADMIN_PATH} end>", "<NavLink to={ADMIN_PATH}>",
      {"coquille": "l'écran courant porte `aria-current=\"page\"`, et lui seul ; chaque entr"})
cible("S-3. ⛔ D-2 — la coquille de l'administration n'est plus en français de gauche à droite", COQUILLE,
      '<div className="admin-shell" lang="fr" dir="ltr">', '<div className="admin-shell" lang="ar" dir="rtl">',
      {"coquille": "D-2 — les écrans de l'administration sont en FRANÇAIS, ltr, quelle que"})
cible("S-4. « Se déconnecter » de la coquille ne fait rien", COQUILLE,
      "onClick={() => void logout()}", "onClick={() => undefined}",
      {"coquille": "« Se déconnecter » appelle `logout`"})
cible("N-1. ⛔ MD-ADM-9 — le double montage pose plusieurs balises (le compteur de références est ignoré)", NOINDEX,
      "if (references === 1) {", "if (references >= 1) {",
      {"noindex": "deux écrans montés ensemble : une seule balise, et elle reste tant qu'"})
cible("N-2. ⛔ MD-ADM-9 — la balise survit à l'écran qui l'a posée", NOINDEX,
      "balise.remove();", "balise.hidden = true;",
      {"noindex": "retirée au démontage : elle ne survit pas à l'écran qui l'a posée"})
cible("N-3. ⛔ MD-ADM-9 — la balise est retirée au démontage du PREMIER écran même s'il en reste un", NOINDEX,
      "references = Math.max(0, references - 1);", "references = 0;",
      {"noindex": "deux écrans montés ensemble : une seule balise, et elle reste tant qu'"})
cible("N-4. ⛔ MD-ADM-9 — la balise dit « index, follow »", NOINDEX,
      'balise.setAttribute("content", "noindex, nofollow");', 'balise.setAttribute("content", "index, follow");',
      {"noindex": "posée au montage : `noindex, nofollow`, UNE seule"})

# ── T — les TEXTES et la distinction refus / panne.
cible("T-1. ⛔ S-183 — un code d'erreur n'a plus de texte français (un identifiant technique serait affiché)", TEXTES,
      'SLOT_TEMPLATE_REQUIRED: "Cette salle n\'a aucun créneau actif : elle ne peut pas être publiée tant que son professionnel n\'en a pas activé un.",', 'SLOT_TEMPLATE_REQUIRED: "x",',
      {"textes": "le code SLOT_TEMPLATE_REQUIRED a un texte, non vide, qui n'est pas l'i"})
cible("T-2. ⛔ MD-ADM-15 — un 403 est lu comme un refus métier (seul le 401 est « les droits »)", TEXTES,
      'if (error.status === 401 || error.status === 403) return { kind: "rights", text: ADMIN_TEXTS.errors.rights };', 'if (error.status === 401) return { kind: "rights", text: ADMIN_TEXTS.errors.rights };',
      {"textes": "401 et 403 : la SESSION ou les DROITS (l'API reste l'autorité), ni ref"})
cible("T-3. ⛔ MD-ADM-15 / D217 — une erreur 5xx est lue comme un REFUS métier (jamais une issue inconnue)", TEXTES,
      "if (error.status >= 400 && error.status < 500) {", "if (error.status >= 400) {",
      {"textes": "réseau coupé, 5xx, valeur levée qui n'est pas une erreur : l'issue est"})
cible("T-4. ⛔ MD-ADM-15 — une erreur d'API n'est plus reconnue (tout devient « issue inconnue »)", TEXTES,
      'e.name === "ApiError"', 'e.name !== "ApiError"',
      {"textes": "un code connu en 4xx : un REFUS, avec le texte du code"})
cible("T-5. ⛔ D48 — la date s'écrit à l'heure UTC et non à l'heure d'Alger (le 12 à 23 h 30 reste le 12)", FORMATS,
      '{ timeZone: "Africa/Algiers", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso))', '{ timeZone: "UTC", day: "numeric", month: "long", year: "numeric" }).format(new Date(iso))',
      {"textes": "une date s'écrit à l'heure d'ALGER (UTC+1, sans heure d'été) : 23 h 30"})
cible("T-6. ⛔ MD-ADM-7 — le taux perd ses décimales (2,5 % s'affiche 3 %)", FORMATS,
      "{ maximumFractionDigits: 2 }", "{ maximumFractionDigits: 0 }",
      {"textes": "un taux en points de base s'écrit en pour cent, avec ses décimales sig"})
cible("T-7. ⛔ S-183 — un code inconnu affiche son identifiant technique au lieu du texte générique", TEXTES,
      'return { kind: "refused", text: connu ?? ADMIN_TEXTS.errors.refusedGeneric };', 'return { kind: "refused", text: connu ?? error.code };',
      {"textes": "un code INCONNU en 4xx : un refus au texte générique (jamais l'identif"})

# ── Q — l'écran 1, la FILE.
cible("Q-1. ⛔ MD-ADM-15 — une file de zéro salle n'est plus reconnue (« 0 salle en attente » à la place du message vide)", FILE,
      "if (data.total === 0) return <p>{ADMIN_TEXTS.queue.empty}</p>;", "if (data.total === -1) return <p>{ADMIN_TEXTS.queue.empty}</p>;",
      {"file": "aucune salle : le message « aucune salle en attente » — et PAS d'alert"})
cible("Q-2. ⛔ MD-ADM-15 / D217 — une PANNE de lecture se lit « aucune salle en attente »", FILE,
      'if (!cancelled) setState({ kind: "error", rights: classifyAdminError(err).kind === "rights" });', "if (!cancelled) setState({ kind: \"ready\", data: { items: [], total: 0, page, pageSize: 12 } });",
      {"file": "une PANNE n'est pas le vide : l'alerte, un bouton de relecture, et jam"})
cible("Q-3. ⛔ R-5 — l'ordre du serveur n'est plus celui de l'écran (les rejetées avant les autres)", FILE,
      "{data.items.map((item) => (", "{[...data.items].reverse().map((item) => (",
      {"file": "l'ordre du SERVEUR est celui de l'écran : les jamais rejetées d'abord,"})
cible("Q-4. ⛔ R-5 — une salle déjà rejetée n'est plus marquée", FILE,
      "{item.rejection ? (", "{false ? (",
      {"file": "une salle DÉJÀ REJETÉE porte la marque, son motif et sa date ; une sal"})
cible("Q-5. ⛔ R-5 — le MOTIF d'une salle rejetée n'est plus montré", FILE,
      '<span dir="auto">{item.rejection.reason}</span>', '<span dir="auto">{""}</span>',
      {"file": "une salle DÉJÀ REJETÉE porte la marque, son motif et sa date ; une sal"})
cible("Q-6. ⛔ D212 — le nombre de pages est arrondi vers le bas (13 salles = 1 page)", FILE,
      "const totalPages = Math.max(1, Math.ceil(data.total / data.pageSize));", "const totalPages = Math.max(1, Math.floor(data.total / data.pageSize));",
      {"file": "deux pages : « page 1 sur 2 », « précédente » inactive, « suivante » d"})
cible("Q-7. ⛔ « Page précédente » reste active sur la première page", FILE,
      "disabled={data.page <= 1}", "disabled={false}",
      {"file": "deux pages : « page 1 sur 2 », « précédente » inactive, « suivante » d"})
cible("Q-8. ⛔ « Page suivante » saute une page", FILE,
      "onClick={() => onPage(data.page + 1)}", "onClick={() => onPage(data.page + 2)}",
      {"file": "deux pages : « page 1 sur 2 », « précédente » inactive, « suivante » d"})
cible("Q-9. ⛔ D-2 — le nom arabe n'est plus marqué `lang=\"ar\" dir=\"rtl\"`", FILE,
      '<p lang="ar" dir="rtl">', "<p>",
      {"file": "une salle : son nom français, son nom arabe en `lang=\"ar\" dir=\"rtl\"`,"})
cible("Q-10. ⛔ la page n'est plus lue dans l'adresse (`?page=2` ouvre la page 1)", FILE,
      'const page = pageOf(params.get("page"));', "const page = 1;",
      {"file": "deux pages : « page 1 sur 2 », « précédente » inactive, « suivante » d"})
cible("Q-11. ⛔ D212 — une page au-delà de la fin n'est plus signalée (liste vide silencieuse)", FILE,
      "if (data.items.length === 0) {", "if (data.items.length === -1) {",
      {"file": "une page qui n'existe plus (la file a rétréci) n'est pas un écran vide"})

# ── P — l'écran 2, le DÉTAIL.
cible("P-1. ⛔ MD-ADM-15 — « Publier » reste actif pendant la requête (un double clic envoie deux publications)", DETAIL,
      'className="btn btn-accent" disabled={busy !== null} onClick={() => void publish()}', 'className="btn btn-accent" disabled={false} onClick={() => void publish()}',
      {"detail": "pendant que la réponse est RETENUE : le bouton est inactif, aucun « pu"})
cible("P-2. ⛔ MD-ADM-15 — « La salle est publiée » s'affiche AVANT la réponse (la requête part sans être attendue)", DETAIL,
      "const dto = await admin.publishVenue(id);", 'const dto = { publicationStatus: "PUBLISHED" }; void admin.publishVenue(id);',
      {"detail": "pendant que la réponse est RETENUE : le bouton est inactif, aucun « pu"})
cible("P-3. ⛔ D-4 — le motif n'est plus vérifié par le schéma partagé (un motif vide part au serveur)", DETAIL,
      "const checked = venueRejectSchema.safeParse({ reason });", "const checked = { success: true as const, data: { reason } };",
      {"detail": "un motif VIDE ou fait d'espaces : le message du schéma partagé, en fra"})
cible("P-4. ⛔ MD-ADM-15 — après un refus ou une issue inconnue la salle n'est plus RELUE (l'écran garde un état périmé)", DETAIL,
      'if (p.kind !== "rights") await read(false);', 'if (p.kind !== "rights") await Promise.resolve();',
      {"detail": "une PANNE pendant l'action : « le résultat est inconnu » (jamais « ref"})
cible("P-5. ⛔ MD-ADM-15 / D217 — un refus métier n'est plus préfixé « Refusé : » (il se lit comme une panne)", DETAIL,
      "{problem.kind === \"refused\" ? `${ADMIN_TEXTS.errors.refusedPrefix} ${problem.text}` : problem.text}", "{String(problem.text)}",
      {"detail": "« pas de créneau actif » (409 SLOT_TEMPLATE_REQUIRED) : un REFUS, son"})
cible("P-6. ⛔ R-3 — le bouton d'une salle déjà rejetée ne dit plus « Corriger le motif »", DETAIL,
      "{corrects ? ADMIN_TEXTS.review.correct : ADMIN_TEXTS.review.reject}", "{ADMIN_TEXTS.review.reject}",
      {"detail": "R-3 — une salle DÉJÀ rejetée : son motif et sa date, le bouton « Corri"})
cible("P-7. ⛔ R-3 — le champ ne part plus du motif en vigueur (il est vide)", DETAIL,
      'setReason(venue.rejection?.reason ?? "");', 'setReason("");',
      {"detail": "R-3 — une salle DÉJÀ rejetée : son motif et sa date, le bouton « Corri"})
cible("P-8. ⛔ A3-④ — une salle PUBLIÉE garde « Publier » et « Rejeter »", DETAIL,
      "{published ? null : (", "{false ? null : (",
      {"detail": "une salle PUBLIÉE : ni « Publier » ni « Rejeter » (le sens unique, A3-"})
cible("P-9. ⛔ MD-ADM-7 — la commission affiche le taux du cashback", DETAIL,
      "<dd>{formatBps(venue.commissionRateBps)}</dd>", "<dd>{formatBps(venue.cashbackRateBps)}</dd>",
      {"detail": "MD-ADM-7 — les DEUX taux sont affichés (valeurs du serveur, formateur"})
cible("P-10. ⛔ MD-ADM-15 — le rejet n'est plus affiché à la RÉPONSE (le bloc « déjà rejetée » n'apparaît pas)", DETAIL,
      'venue: { ...l.venue, rejection: result.rejection } } : l));', 'venue: { ...l.venue, rejection: l.venue.rejection } } : l));',
      {"detail": "un motif valide part ROGNÉ ; à la réponse seulement l'avis « rejetée »"})
cible("P-11. ⛔ MD-ADM-15 — une salle inconnue (404 indistinct) est lue comme une panne (le message « introuvable » n'apparaît plus)", DETAIL,
      'err instanceof ApiError && err.code === "VENUE_NOT_FOUND" ?', "false ?",
      {"detail": "une salle inconnue (404 indistinct) : « introuvable » et le retour à l"})

# ── X — l'écran 3, les SUPPRESSIONS de compte.
cible("X-1. ⛔ R-5 — « Approuver » appelle l'API SANS la confirmation d'une action irréversible", SUPPRESSIONS,
      "onApprove={() => setConfirming(row)}", "onApprove={() => void approve(row)}",
      {"suppressions": "cliquer « Approuver » ouvre la confirmation, qui DIT l'irréversible et"})
cible("X-2. ⛔ R-5 — la confirmation ne dit plus ce que l'approbation fait (la description est vide)", SUPPRESSIONS,
      "description={ADMIN_TEXTS.deletions.approveDialog.description(confirming?.venueCount ?? 0)}", 'description=""',
      {"suppressions": "cliquer « Approuver » ouvre la confirmation, qui DIT l'irréversible et"})
cible("X-3. ⛔ R-5 — rejeter n'exige plus de motif", SUPPRESSIONS,
      "if (trimmed.length === 0) {", "if (false) {",
      {"suppressions": "sans motif (vide ou blanc) : le message, AUCUN appel ; le champ est ob"})
cible("X-4. ⛔ MD-ADM-15 — « approuvée » s'affiche AVANT la réponse (la requête part sans être attendue)", SUPPRESSIONS,
      "await admin.approveDeletion(row.id);", "void admin.approveDeletion(row.id);",
      {"suppressions": "CONFIRMER : un seul appel ; tant que la réponse est RETENUE la demande"})
cible("X-5. ⛔ MD-ADM-15 — après un refus ou une issue inconnue la liste n'est plus RELUE", SUPPRESSIONS,
      'if (p.kind !== "rights") await read(false);', 'if (p.kind !== "rights") await Promise.resolve();',
      {"suppressions": "MD-ADM-15 — l'utilisateur a ANNULÉ sa demande entre-temps (400 DELETIO"})
cible("X-6. ⛔ MD-ADM-15 / D217 — une PANNE de lecture se lit « aucune demande »", SUPPRESSIONS,
      'if (initial) setLoad({ kind: "error", rights: classifyAdminError(err).kind === "rights" });', 'if (initial) setLoad({ kind: "ready", rows: [] });',
      {"suppressions": "une PANNE n'est pas le vide : l'alerte, la relecture, jamais « aucune"})
cible("X-7. ⛔ le nombre de salles archivées s'affiche aussi pour zéro salle", SUPPRESSIONS,
      "{row.venueCount > 0 ? <span>", "{row.venueCount >= 0 ? <span>",
      {"suppressions": "une demande : l'adresse du compte, son rôle, la date de la demande, le"})
cible("X-8. ⛔ D55 — la borne haute du motif n'est plus celle du schéma partagé", SUPPRESSIONS,
      "const checked = deletionDecisionSchema.safeParse({ decisionNote: trimmed });", 'const checked = deletionDecisionSchema.safeParse({ decisionNote: "ok" });',
      {"suppressions": "un motif trop long : le message de borne (celle de l'API, importée), a"})

# ── R — le REFUS lu par le pro.
cible("R-1. ⛔ D-5 — une salle PUBLIÉE appelle la route du refus (publier efface le motif : il n'y a rien à lire)", REFUS,
      "const active = status !== null && status !== VenuePublicationStatus.PUBLISHED;", "const active = status !== null;",
      {"refus": "une salle PUBLIÉE : le badge « Publiée », et la route du refus n'est P"})
cible("R-2. ⛔ D120 — une réponse MALFORMÉE se lit « pas refusée » (aucune panne n'est dite)", REFUS,
      'setState(isReview(review) ? { kind: "ready", review } : { kind: "error" });', 'setState(isReview(review) ? { kind: "ready", review } : { kind: "idle" });',
      {"refus": "une réponse MALFORMÉE (ni objet ni état de publication) est une panne,"})
cible("R-3. ⛔ D133 / D142 — une PANNE de lecture se lit « pas refusée »", REFUS,
      'if (!cancelled) setState({ kind: "error" });', 'if (!cancelled) setState({ kind: "idle" });',
      {"refus": "l'étape « Publication » le dit et propose de réessayer ; l'en-tête gar"})
cible("R-4. ⛔ MD-ADM-5 — l'en-tête de l'assistant dit encore « en attente de publication » pour une salle refusée", REFUS,
      'if (review.kind === "ready" && review.review.rejection !== null) {\n    return (\n      <span', 'if (false) {\n    return (\n      <span',
      {"refus": "MD-ADM-5 — l'en-tête de l'assistant NE DIT PLUS « En attente de public"})
cible("R-5. ⛔ le motif écrit par l'admin n'est plus rendu avec `dir=\"auto\"`", REFUS,
      '<p dir="auto" style={{ margin: "0 0 6px" }}>', '<p style={{ margin: "0 0 6px" }}>',
      {"refus": "à l'étape « Publication » : le titre, le motif de l'admin tel quel (`d"})
cible("R-6. ⛔ la date du refus n'est plus montrée", REFUS,
      '{rejectedAt ? <p className="field-hint">', '{false ? <p className="field-hint">',
      {"refus": "à l'étape « Publication » : le titre, le motif de l'admin tel quel (`d"})
cible("R-7. ⛔ D-5 — l'étape « Publication » ne montre plus l'avis de refus", EDITION,
      "<PublicationRefusalNotice review={publication.state} retry={publication.retry} />", "<></>",
      {"refus": "à l'étape « Publication » : le titre, le motif de l'admin tel quel (`d"})
cible("R-8. ⛔ MD-ADM-5 — l'en-tête de la page de la salle ignore la lecture du refus", EDITION,
      "<PublicationHeaderState status={venue.publicationStatus} review={publication.state} />", '<PublicationHeaderState status={venue.publicationStatus} review={{ kind: "idle" }} />',
      {"refus": "MD-ADM-5 — l'en-tête de l'assistant NE DIT PLUS « En attente de public"})

# ── C — le FOURNISSEUR des salles : l'état n'appartient qu'au compte qui l'a lu.
cible("C-1. ⛔ MD-ADM-10 — la liste de salles d'un compte est rendue à un AUTRE compte (sous un ADMIN, au pro suivant)", FOURNISSEUR,
      "const mine = snap.ownerId === ownerId;", "const mine = true;",
      {"compte": "le PRO A lit ses salles et garde un brouillon ; il se déconnecte : ni"})

# ── J — les CATALOGUES.
cible("J-1. ⛔ MD-ADM-11 — une clé du bloc `publicationReview` n'existe plus en arabe (la parité rougit)", CATALOGUE_AR,
      '"retry": "إعادة المحاولة"\n  },\n  "quote": {', '"retryX": "إعادة المحاولة"\n  },\n  "quote": {',
      {"parite": "les DEUX ensembles de clés sont identiques — toute clé orpheline est n", "refus": "les deux catalogues portent EXACTEMENT les mêmes clés du bloc `publica"})

# ── E — les gardes de la SPEC E2E (`--e2e`) : le navigateur réel. Chaque cible mute le code de l'APPLICATION et jamais la spec ; la lecture est celle de Playwright (une assertion web-first qui expire EST un échec d'assertion
# si le bloc d'erreur porte l'appel `expect(`, D323). Ce sont les « neutralisations à la main » que la consigne laissait à la session, rendues rejouables.
cible("E-1. ⛔ MD-ADM-16 — l'adresse de l'administration n'est plus `/admin` (l'ADMIN qui se connecte n'arrive plus « sous `/admin` »)", "apps/pro/src/routes.ts",
      'export const ADMIN_PATH = "/admin";', 'export const ADMIN_PATH = "/administration";',
      {"e2e-r52": "E-1 : l'ADMIN se connecte"})
cible("E-2. ⛔ MD-ADM-9 — la coquille n'appelle plus `useNoIndex` (la balise `noindex` n'existe pas dans le vrai navigateur)", COQUILLE,
      "useNoIndex();", "/* noindex retiré */",
      {"e2e-r52": "E-1 : l'ADMIN se connecte"})
cible("E-3. ⛔ MD-ADM-5 — l'en-tête de l'assistant dit encore « en attente de publication » pour une salle refusée, dans le vrai navigateur, en français ET en arabe", REFUS,
      'if (review.kind === "ready" && review.review.rejection !== null) {\n    return (\n      <span', 'if (false) {\n    return (\n      <span',
      {"e2e-r52": "E-2 : l'ADMIN rejette"})
cible("E-4. ⛔ R-5 — « Approuver » appelle l'API SANS la confirmation d'une action irréversible, dans le vrai navigateur", SUPPRESSIONS,
      "onApprove={() => setConfirming(row)}", "onApprove={() => void approve(row)}",
      {"e2e-r52": "E-4 : une suppression de compte rejetée"})
cible("E-5. ⛔ R-4 — un PRO franchit la garde ADMIN dans le vrai navigateur", REQUIRE_ADMIN,
      'if (user.role !== "ADMIN") {', 'if (user.role === "CLIENT") {',
      {"e2e-r52": "E-5 : un PRO sous `/admin`"})
cible("E-6. ⛔ R-3 — la correction du motif est refusée côté serveur (le motif précédent n'est plus la condition) : le pro ne lit jamais le NOUVEAU motif", SERVICE_ADMIN,
      "publicationStatus: { in: [...REJECTABLE_FROM] }, rejectionReason: previous },", "publicationStatus: { in: [...REJECTABLE_FROM] }, rejectionReason: null },",
      {"e2e-r52": "E-3 : l'ADMIN corrige le motif"})


def _est_int(c: dict) -> bool:
    return any(_mesure_de(m) in MESURES_INT for m in c["mesures"])


def _est_e2e(c: dict) -> bool:
    return any(_mesure_de(m) in MESURES_E2E for m in c["mesures"])


def _jouees() -> list[dict]:
    """Les cibles jouées. Sans `--int`, les cibles d'INTÉGRATION (PostgreSQL réel) ne sont pas jouées : elles sont COMPTÉES comme telles, jamais comme mordues.
    ⚠ Une cible qui a une mesure d'intégration ET une mesure unitaire n'est jouée qu'avec `--int` : ses deux mesures se jugent ensemble."""
    return [{**c, "mesures": dict(c["mesures"])} for c in CIBLES if (AVEC_INT or not _est_int(c)) and (AVEC_E2E or not _est_e2e(c))]


def _mesure_de(cle: str) -> str:
    return cle.split("#")[0]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def lancer(mesure: str) -> tuple[int, str]:
    cmd = MESURES[_mesure_de(mesure)]
    r = subprocess.run([_binaire(cmd[0]), *cmd[1:]], capture_output=True, text=True, encoding="utf-8", errors="replace", env={**os.environ, "NO_COLOR": "1", "FORCE_COLOR": "0"})
    return r.returncode, ANSI.sub("", (r.stdout or "") + "\n" + (r.stderr or ""))


def lire_vitest(sortie: str, titre: str | None) -> tuple[str, str]:
    """Rend (verdict, détail). Verdicts : VERT, ROUGE, MORD, MORD-REQ, SANS-TITRE, PAS-ASSERTION, NON-DÉMARRÉE, VERSION.
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
    if premiere.startswith("AssertionError"):
        return "MORD", f"passés {passes} · en échec {echecs} · {premiere[:140]}"
    # ⛔ ÉCART DÉCLARÉ (D350, S-192) : une erreur de REQUÊTE de Testing Library (« Unable to find an element… ») est une morsure de PRÉSENCE — l'élément attendu n'est pas là. Elle se COMPTE À PART (`MORD-REQ`),
    # jamais confondue avec une assertion native, et jamais pour un plantage (`TypeError`, délai dépassé, plafond de console), qui restent PAS-ASSERTION.
    if premiere.startswith("TestingLibraryElementError"):
        return "MORD-REQ", f"passés {passes} · en échec {echecs} · {premiere[:140]}"
    return "PAS-ASSERTION", f"première ligne du bloc : {premiere[:140]}"


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


def lire_playwright(sortie: str, titre: str | None) -> tuple[str, str]:
    """Copie du lecteur de `neutralize-r49.py` (calibré D323, D347) : une assertion web-first de Playwright qui expire EST un échec d'assertion si le bloc d'erreur porte l'appel `expect(` (décision du relecteur de D323)."""
    echecs = [l for l in sortie.splitlines() if re.match(r"^\s+x\s+\d+ \[chromium\]", l)]
    oks = [l for l in sortie.splitlines() if re.match(r"^\s+ok\s+\d+ \[chromium\]", l)]
    if not echecs and not oks:
        return "NON-DÉMARRÉE", "aucune ligne de test [chromium] (serveurs ? base ?)"
    if titre is None or not echecs:
        return ("VERT" if not echecs else "ROUGE"), f"ok {len(oks)} · x {len(echecs)}"
    if not any(titre in l for l in echecs):
        return "SANS-TITRE", f"x {len(echecs)}, aucun ne porte « {titre} »"
    # Un `beforeAll` en échec marque le test « x … (0ms) » : son CORPS n'a jamais tourné — mesure NON DÉMARRÉE, le harnais refuse de juger (D298, D312).
    if any(titre in l and l.rstrip().endswith("(0ms)") for l in echecs):
        return "NON-DÉMARRÉE", "le test visé a échoué en 0 ms : son corps n'a pas tourné (crochet en échec)"
    bloc = re.search(rf"\d+\) \[chromium\] .*{re.escape(titre)}.*?\n(.*?)attachment #1", sortie, re.S)
    texte = bloc.group(1) if bloc else ""
    if "expect(" not in texte:
        return "PAS-ASSERTION", "le bloc d'erreur ne porte pas « expect( »"
    premiere = next((l.strip() for l in texte.splitlines() if l.strip().startswith("Error:")), "—")
    return "MORD", f"ok {len(oks)} · x {len(echecs)} · {premiere[:140]}"


def lire(mesure: str, sortie: str, titre: str | None) -> tuple[str, str]:
    return lire_playwright(sortie, titre) if MODE[mesure] == "e2e" else lire_vitest(sortie, titre)


CALIBRATION_E2E = [
    ("playwright, assertion", "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n    Error: message\n\n    Timed out 7000ms waiting for expect(locator).toHaveCount(expected)\n\n    attachment #1: screenshot\n", "titre", "MORD"),
    ("playwright, plantage sans expect(", "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (1.0s)\n\n  1) [chromium] › specs\\a.e2e.ts:1:1 › titre \n\n    TypeError: x is not a function\n\n    attachment #1: screenshot\n", "titre", "PAS-ASSERTION"),
    ("playwright, rien d'exécuté", "Error: Timed out waiting 180000ms from config.webServer.\n", "titre", "NON-DÉMARRÉE"),
    ("playwright, crochet en échec (0 ms)", "  x  2 [chromium] › specs\\a.e2e.ts:1:1 › titre (0ms)\n", "titre", "NON-DÉMARRÉE"),
]


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
    ("erreur de REQUÊTE Testing Library (une morsure de PRÉSENCE, comptée à part — S-192)", _V
     + "   × d > t 1105ms\n FAIL  a.test.ts > d > t\nTestingLibraryElementError: Unable to find an element with the text: x\n"
       "      Tests  1 failed | 13 passed (14)\n", "t", "MORD-REQ"),
    ("plantage à l'intérieur du rendu (TypeError), même si le DOM est vide ensuite", _V
     + "   × d > t 40ms\n FAIL  a.test.ts > d > t\nTypeError: Cannot read properties of undefined (reading 'x')\n"
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
    for nom, texte, titre, attendu in CALIBRATION_E2E:
        verdict, _ = lire_playwright(texte, titre)
        manques += verdict != attendu
        print(f"  calibration {'✓' if verdict == attendu else '✗'} {nom} : {verdict} (attendu {attendu})")
    decouverte = echecs_de(_V + " FAIL  a.test.ts > d > un\n FAIL  a.test.ts > d > deux\nAssertionError: m1\n\n FAIL  a.test.ts > d > trois\nTypeError: m2\n")
    attendu_decouverte = [("FAIL  a.test.ts > d > un", "AssertionError: m1"), ("FAIL  a.test.ts > d > deux", "AssertionError: m1"),
                          ("FAIL  a.test.ts > d > trois", "TypeError: m2")]
    ok = decouverte == attendu_decouverte
    manques += not ok
    print(f"  calibration {'✓' if ok else '✗'} découverte : {len(decouverte)} échec(s) lu(s) (attendu 3)")
    print(f"  calibration : {len(CALIBRATION) + len(CALIBRATION_E2E) + 1} bras · {manques} manqué(s) (attendu 0)")
    return manques == 0


# ── LE CONTRÔLE D'INVARIANCE DE R-1 (« `setRates` et `PATCH …/commission-rate` ne sont ni touchés ni journalisés ») — pas une mutation : une COMPARAISON au texte de `b8e5511`.
SHA_DEPART = "b8e5511d20c1ad037b431f221170eda7b0d7786b"
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
    """Compare chaque bloc de R-1 du fichier d'AUJOURD'HUI à celui de `b8e5511` (lu par `git show`, jamais recopié). Calibration à deux bras, en mémoire : un bloc identique est conforme, un bloc dont UN caractère change
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
    print("contrôle R-1 (`setRates` et `VENUE_ADMIN_SELECT` identiques à `b8e5511`) :")
    if not controle_r1():
        print("✗ ABANDON : R-1 n'est pas tenu (le texte du réglage des taux a changé) — rien n'est mesuré.")
        return 2
    if FILTRE and not DECOUVERTE:
        print("✗ ADM2_FILTRE n'est admis qu'avec ADM2_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par ADM2_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if (not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE))
               and (not SEULEMENT or c["libelle"].split(".")[0] in SEULEMENT)]
    if SEULEMENT:
        print(f"⚠ REPRISE DÉCLARÉE : seules les cibles {', '.join(SEULEMENT)} sont jouées (ADM2_SEULEMENT) — jamais après une modification du harnais.")
    depart = empreintes()
    os.makedirs(JOURNAUX, exist_ok=True)
    mesures_utilisees = sorted({_mesure_de(m) for c in actives for m in c["mesures"]})
    non_jouees = sum(1 for c in CIBLES if (_est_int(c) and not AVEC_INT) or (_est_e2e(c) and not AVEC_E2E))
    print(f"cibles : {len(CIBLES)} déclarées · {len(actives)} jouées · {non_jouees} non jouée(s) (sans --int) · {len(mesures_utilisees)} mesure(s) distincte(s) · {len({c['fichier'] for c in actives})} fichier(s) muté(s)")

    # ── PRÉ-VOL : chaque mesure, SANS mutation, doit être verte et avoir DÉMARRÉ.
    for mesure in mesures_utilisees:
        code, sortie = lancer(mesure)
        io.open(os.path.join(JOURNAUX, f"prevol-{mesure}.log"), "w", encoding="utf-8").write(_entete_journal() + sortie)
        verdict, detail = lire(mesure, sortie, None)
        if code != 0 or verdict != "VERT":
            print(f"✗ PRÉ-VOL {mesure} : code {code}, {verdict} — {detail}")
            print(sortie[-3000:])
            return 2
        print(f"  pré-vol {mesure} : code 0 · {detail}")

    mordu, muettes, erreurs = 0, [], []
    en_requete: list[str] = []
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
                verdict, detail = lire(mesure, sortie, None)
                print(f"   [{mesure}] code {code} · {verdict} — {detail}")
                for titre, message in echecs_de(sortie):
                    print(f"      {titre[:200]}\n         ↳ {message[:150]}")
            continue
        verdicts = []
        for cle, titre in cible_["mesures"].items():
            code, sortie = sorties[_mesure_de(cle)]
            verdict, detail = lire(_mesure_de(cle), sortie, titre)
            verdicts.append((cle, code, verdict, detail))
        if any(v in ("NON-DÉMARRÉE", "VERSION") for _, _, v, _ in verdicts):
            for mesure, code, verdict, detail in verdicts:
                print(f"✗ {cible_['libelle']}\n   [{mesure}] MESURE NON DÉMARRÉE ({verdict}) : {detail}")
            erreurs.append(cible_["libelle"])
            break
        if all(v in ("MORD", "MORD-REQ") and code != 0 for _, code, v, _ in verdicts):
            mordu += 1
            if any(v == "MORD-REQ" for _, _, v, _ in verdicts):
                en_requete.append(cible_["libelle"].split(".")[0])
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
        print(f"\n{mordu} garde(s) mordue(s) sur {len(actives)} cible(s) jouée(s) · dont {len(en_requete)} lue(s) en ERREUR DE REQUÊTE Testing Library (S-192) · {len(muettes)} muette(s) · {len(erreurs)} non mesurée(s) · {non_jouees} non jouée(s) (sans --int ni --e2e) "
              f"(attendu : {len(actives)} sur {len(actives)}, 0, 0, {0 if AVEC_INT else non_jouees})")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    if erreurs or not conforme:
        return 2
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main())
