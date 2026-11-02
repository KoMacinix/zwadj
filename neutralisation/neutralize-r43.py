#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 43 (D339), LOT L36-2 : le DEVIS BROUILLON NON OFFICIEL.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le CONTRAT (`packages/types`) : `isOfficial` n'accepte que `false` (R-2 : un brouillon ne porte ni fiche ni nom), la révision n'est plus la création et ne choisit pas le drapeau
    (R-1), la promotion exige la fiche ET un nom, la référence d'un brouillon porte le préfixe `BROUILLON` et le nom du fichier s'en dérive (T-*) ;
  · l'API : la remise et la conversion d'un brouillon refusées dans l'ordre statut → pas officiel, la révision qui hérite du drapeau et refuse fiche et nom sous le verrou,
    la promotion en UNE transaction (verrou, version, check-and-set, ligne d'audit sans donnée personnelle), K-5 refusé sur un brouillon (S-*, A-*, X-*, K-*) ;
  · la BASE (migration `20261028100000`, sous `--int`) : `is_official`, la CHECK `quotes_unofficial_inert` (sept colonnes), le déclencheur sur `bookings` (INSERT ET UPDATE de `quote_id`) (M-*) ;
  · le PDF : le filigrane `position: fixed` d'un brouillon, absent d'un devis officiel, et la référence lue avec son préfixe (D-*) ;
  · le client d'API (C-*) et l'écran du PRO : le second bouton, le brouillon sans nom, le bandeau, le téléchargement sans remise, la promotion (P-*).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r43.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r43.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R43_DECOUVERTE=1 python3 neutralisation/neutralize-r43.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en échec) ; le titre attendu
y est marqué en échec ET la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot est de méthode RENFORCÉE sous la pause (DR4 de D336) : ses
verdicts s'écrivent en assertions NATIVES (`toBe`, `toEqual`, `toBeNull`), jamais par `.expect(<statut>)` de supertest ni par un matcher jest-dom, qui lèvent une `Error`.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution
ne doit jamais être une SOUS-CHAÎNE de son ancre (D325) — d'où les « tautologies » SQL de M-* (`("x" IS NULL OR "x" = "x")`) plutôt qu'un retrait.
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R43_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — le parcours de bout en bout est `e2e/specs/r43-devis-brouillon.e2e.ts`, neutralisée À LA MAIN (procédure versée) ;
(2) la LISIBILITÉ du filigrane sur les montants (S-82) — Ko regarde (`docs/preuves/D339/scenarios-ko.md`) ; (3) la traduction d'une erreur du déclencheur en erreur métier (inatteignable par l'API,
entrée de backlog) ; (4) le sens `true → false`, que la base n'interdit pas (limite écrite dans la migration et dans le test de la base non vide).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-r42.py` (lui-même copié de `neutralize-r39.py`, calibré
D316 / D325 / D331 / D332 / D333) ; seuls les noms, le jeu de cibles et le bilan changent.
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

SAUVEGARDE = ".neutralisation-r43"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r43")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R43_DECOUVERTE") == "1"
# `R43_FILTRE="P-,S-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R43_FILTRE", "").split(",") if p]


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    # ── unitaires : API (`@zwadj/api`), client d'API (`@zwadj/api-client`), écran du PRO (`@zwadj/pro`).
    "contrat": _vitest("@zwadj/api", "src/common/quote-draft.spec.ts"),
    "reference": _vitest("@zwadj/api", "src/common/quote-reference.spec.ts"),
    "transitions": _vitest("@zwadj/api", "src/venues/quote-transitions.spec.ts"),
    "service": _vitest("@zwadj/api", "src/venues/quotes.service.spec.ts"),
    "magasin": _vitest("@zwadj/api", "src/venues/quote-store.prisma.spec.ts"),
    "document": _vitest("@zwadj/api", "src/documents/quote-document.spec.ts"),
    "doc-service": _vitest("@zwadj/api", "src/documents/quote-document.service.spec.ts"),
    "client-api": _vitest("@zwadj/api-client", "src/quotes-client.test.ts"),
    "pro-parcours": _vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    "pro-contact": _vitest("@zwadj/pro", "src/dashboard/walkin-contact.test.ts"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-devis": _vitest_int("test/int/quotes.int-spec.ts"),
    "int-migration": _vitest_int("test/int/migration-non-empty.int-spec.ts"),
    "int-document": _vitest_int("test/int/quote-document.int-spec.ts"),
    "int-numerotation": _vitest_int("test/int/quote-numbering.int-spec.ts"),
    "int-contrat": _vitest_int("test/int/contract-api-client.int-spec.ts"),
}
MESURES_INT = {"int-devis", "int-migration", "int-document", "int-numerotation", "int-contrat"}
AVEC_INT = "--int" in sys.argv

TYPES_DEVIS = "packages/types/src/quote.ts"
SERVICE_DEVIS = "apps/api/src/venues/quotes.service.ts"
MAGASIN = "apps/api/src/venues/quote-store.prisma.ts"
MAGASIN_TYPES = "apps/api/src/venues/quote-store.types.ts"
TRANSITIONS = "apps/api/src/venues/quote-transitions.ts"
CONTROLEUR = "apps/api/src/venues/quotes.controller.ts"
MODELE_PDF = "apps/api/src/documents/quote-document.ts"
SOURCE_PDF = "apps/api/src/documents/quote-document-source.prisma.ts"
CLIENT_API = "packages/api-client/src/quotes-client.ts"
MIGRATION = "apps/api/prisma/migrations/20261028100000_quote_unofficial_draft/migration.sql"
ECRAN_CONTACT = "apps/pro/src/dashboard/walkin-contact.ts"
PARCOURS = "apps/pro/src/dashboard/walkin-journey.tsx"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── T — le CONTRAT (`@zwadj/types`).
cible("T-1. ⛔ R-2 — `isOfficial` accepte de nouveau `true` (il n'y a plus qu'UNE façon de dire « officiel » : omettre le champ)", TYPES_DEVIS,
      'isOfficial: z.literal(false, { errorMap: () => ({ message: "quote.validation.isOfficialInvalid" }) }).optional()', "isOfficial: z.boolean().optional()",
      {"contrat": "⛔ D-13 — `isOfficial: true` est REFUSÉ : il n'y a qu'une façon de dire « officie"})
cible("T-2. ⛔ R-2 — un brouillon peut de nouveau porter une fiche ou un nom (la CHECK serait la seule barrière)", TYPES_DEVIS,
      "if (corps.clientRecordId !== undefined || porteUnNom(corps)) {", "if (false) {",
      {"contrat": "⛔ D-16 — un brouillon AVEC une fiche : UN seul refus, `draftHasNoClient`, sur `i"})
cible("T-3. ⛔ R-1 — la révision accepte `isOfficial` (elle choisirait le drapeau d'une chaîne déjà remise)", TYPES_DEVIS,
      ".object({ ...corpsDuDevis })", ".object({ ...corpsDuDevis, isOfficial: z.boolean().optional() })",
      {"contrat": "⛔ `isOfficial: false` est une clé INCONNUE de la révision : 400 `unknownKey`"})
cible("T-4. ⛔ la promotion n'exige plus la FICHE (un devis « officiel » sans client)", TYPES_DEVIS,
      'clientRecordId: z.string({ required_error: "quote.validation.clientRecordRequired" }).uuid("quote.validation.idInvalid"),',
      'clientRecordId: z.string().uuid("quote.validation.idInvalid").optional(),',
      {"contrat": "⛔ SANS fiche : refusé, et le refus nomme la fiche (la fiche est obligatoire, à l"})
cible("T-5. ⛔ la promotion n'exige plus de NOM (une fiche sans copie du nom sur le devis)", TYPES_DEVIS,
      "    if (!porteUnNom(corps)) {", "    if (false) {",
      {"contrat": "⛔ SANS aucun nom : refusé, et le refus nomme le nom"})
cible("T-6. ⛔ la référence d'un brouillon porte le préfixe d'un devis OFFICIEL", TYPES_DEVIS,
      "const prefixe = parts.official === false ? QUOTE_REFERENCE_PREFIX.DRAFT : QUOTE_REFERENCE_PREFIX.OFFICIAL;", "const prefixe = QUOTE_REFERENCE_PREFIX.OFFICIAL;",
      {"reference": "⛔ l'exemple de la consigne : `BROUILLON-2026-0001-0089 v1` ; le défaut (`officia"})
cible("T-7. ⛔ le nom de fichier d'un brouillon ne se dérive plus (le motif ne connaît que `DEVIS`)", TYPES_DEVIS,
      'Object.values(QUOTE_REFERENCE_PREFIX).join("|")', "QUOTE_REFERENCE_PREFIX.OFFICIAL",
      {"reference": "⛔ la référence d'un brouillon est ACCEPTÉE : la dériver ne LÈVE pas (le motif co"})
cible("T-8. ⛔ le préfixe d'un brouillon s'écrit autrement que le motif du nom de fichier le lit", TYPES_DEVIS,
      '{ OFFICIAL: "DEVIS", DRAFT: "BROUILLON" }', '{ OFFICIAL: "DEVIS", DRAFT: "BROUILLON_" }',
      {"reference": "⛔ l'exemple de la consigne : `BROUILLON-2026-0001-0089 v1` ; le défaut (`officia"})

# ── S — le SERVICE (`QuotesService`).
cible("S-1. ⛔ la création ignore `isOfficial: false` : un brouillon demandé naît OFFICIEL", SERVICE_DEVIS,
      "const officiel = input.isOfficial !== false;", "const officiel = true;",
      {"int-devis": "un brouillon naît en DRAFT, v1, `isOfficial: false`, référence `BROUILLON-…`, sa"})
cible("S-2. ⛔ la remise d'un brouillon n'est plus traduite : le refus du port devient un 409 de statut", SERVICE_DEVIS,
      'if (resultat.raison === "nonOfficiel") this.throwNotOfficial();', 'if (false) this.throwNotOfficial();',
      {"service": "⛔ le port refuse `nonOfficiel` : 409 QUOTE_NOT_OFFICIAL, le message du catalogue"})
cible("S-3. ⛔ la conversion d'un brouillon n'est plus refusée par le service (la base seule le garderait)", SERVICE_DEVIS,
      "if (!current.isOfficial) this.throwNotOfficial();", "if (false) this.throwNotOfficial();",
      {"service": "⛔ un brouillon DRAFT : 409 QUOTE_NOT_OFFICIAL ; ni la salle, ni le créneau ne so"})
cible("S-4. ⛔ L'ORDRE — la conversion regarde « brouillon » AVANT le statut (un brouillon annulé répondrait « pas officiel », pas « statut »)", SERVICE_DEVIS,
      "    this.assertStatus(current, quoteAllowedFrom(QuoteCommand.CONVERT));",
      "    if (!current.isOfficial) this.throwNotOfficial();\n    this.assertStatus(current, quoteAllowedFrom(QuoteCommand.CONVERT));",
      {"service": "⛔ L'ORDRE, sur un cas doublement fautif : un brouillon ANNULÉ répond « statut » "}, genre="insertion")
cible("S-5. ⛔ la promotion ne passe plus le RÔLE de l'acteur au port (la ligne d'audit le porte)", SERVICE_DEVIS,
      "acteur: { userId: acteur.userId, role: acteur.role },", 'acteur: { userId: acteur.userId, role: "ADMIN" },',
      {"service": "⛔ le port reçoit l'ACTEUR (identifiant ET rôle — ils vont dans la ligne d'audit)"})
cible("S-6. ⛔ la promotion ne passe aucun statut source : plus rien ne se promeut", SERVICE_DEVIS,
      "statutsAdmis: quoteAllowedFrom(QuoteCommand.PROMOTE),", "statutsAdmis: [],",
      {"service": "⛔ le port reçoit l'ACTEUR (identifiant ET rôle — ils vont dans la ligne d'audit)"})
cible("S-7. ⛔ « déjà officiel » répond avec le code d'un conflit de STATUT", SERVICE_DEVIS,
      "code: QuoteErrorCode.QUOTE_ALREADY_OFFICIAL,", "code: QuoteErrorCode.QUOTE_STATUS_CONFLICT,",
      {"service": "⛔ D-5 — le port refuse « déjà officiel » : 409 QUOTE_ALREADY_OFFICIAL, le messag"})
cible("S-8. ⛔ « version non active » n'est plus traduite (la promotion d'une ancienne version répond autre chose)", SERVICE_DEVIS,
      'if (resultat.raison === "versionNonActive") {', "if (false) {",
      {"service": "⛔ D-6 — le port refuse « version non active » : 409 QUOTE_VERSION_NOT_ACTIVE POR"})
cible("S-9. ⛔ la promotion ne vérifie plus que le devis est au pro AVANT de lire sa fiche", SERVICE_DEVIS,
      "await this.ownedQuote(acteur.userId, quoteId);", "/* propriété non vérifiée */",
      {"service": "⛔ le devis n'est pas au pro (le port le rend `null`) : 404 QUOTE_NOT_FOUND AVANT"})
cible("S-10. ⛔ R-3 — la boîte de langue (K-5) d'un brouillon répond « déjà renseigné » au lieu de « un brouillon n'a pas de nom »", SERVICE_DEVIS,
      "if (!relu.isOfficial) this.throwDraftHasNoClient();", "if (false) this.throwDraftHasNoClient();",
      {"service": "⛔ le port refuse ET le devis est un brouillon : 409 QUOTE_DRAFT_HAS_NO_CLIENT (p"})
cible("S-11. ⛔ R-1 — la révision d'un brouillon avec fiche ou nom répond « introuvable » au lieu de « un brouillon n'a pas de client »", SERVICE_DEVIS,
      "if (!resultat.ok) this.throwDraftHasNoClient();", "if (!resultat.ok) this.throwNotFound();",
      {"int-devis": "⛔ une révision d'un brouillon qui porte une FICHE ou un NOM : 409 `QUOTE_DRAFT_H"})
cible("S-12. ⛔ le DTO dit toujours « officiel » (le drapeau de la ligne STOCKÉE n'est plus rendu)", SERVICE_DEVIS,
      "      isOfficial: row.isOfficial,", "      isOfficial: true,",
      {"service": "⛔ un brouillon : `isOfficial: false` et `BROUILLON-…`, même année, mêmes numéros"})
cible("S-13. ⛔ la référence rendue au pro ne suit plus le drapeau de la ligne (un brouillon s'appelle `DEVIS-…`)", SERVICE_DEVIS,
      "        official: row.isOfficial\n      }),", "        official: true\n      }),",
      {"service": "⛔ un brouillon : `isOfficial: false` et `BROUILLON-…`, même année, mêmes numéros"})

# ── A — le MAGASIN (`PrismaQuoteStore`).
cible("A-1. ⛔ D-1 — la remise ne met plus `isOfficial: true` DANS le WHERE (un brouillon se remet)", MAGASIN,
      "where: { id: quoteId, status: { in: [...statutsAdmis] }, ...(exigeOfficiel ? { isOfficial: true } : {}) },", "where: { id: quoteId, status: { in: [...statutsAdmis] } },",
      {"magasin": "⛔ `marquerRemis` : `isOfficial: true` est dans le WHERE du check-and-set, EN PLU", "int-devis": "⛔ D-1 — la REMISE d'un brouillon : 409 `QUOTE_NOT_OFFICIAL`, et `sent_via` et `s"})
cible("A-2. ⛔ la remise n'exige plus l'état officiel (le dernier argument du check-and-set passe à faux)", MAGASIN,
      "{ sentVia: args.sentVia, sentAt: args.sentAt }, true);", "{ sentVia: args.sentVia, sentAt: args.sentAt }, false);",
      {"magasin": "⛔ `marquerRemis` : `isOfficial: true` est dans le WHERE du check-and-set, EN PLU", "int-devis": "⛔ D-1 — la REMISE d'un brouillon : 409 `QUOTE_NOT_OFFICIAL`, et `sent_via` et `s"})
cible("A-3. ⛔ D-12 — l'annulation exige l'état officiel (un brouillon ne s'annule plus)", MAGASIN,
      "{ status: args.nouveauStatut }, false);", "{ status: args.nouveauStatut }, true);",
      {"magasin": "⛔ le statut admis est dans le WHERE de l'UPDATE, pas lu avant", "int-devis": "⛔ D-8 — UN SEUL compteur : brouillon, officiel, brouillon ⇒ 0001, 0002, 0003 ; a"})
cible("A-4. ⛔ L'ORDRE — le refus « pas officiel » ne regarde plus le statut (un brouillon ANNULÉ répond « pas officiel », il est clos)", MAGASIN,
      'if (exigeOfficiel && !fresh.isOfficial && statutsAdmis.includes(fresh.status)) return { ok: false, raison: "nonOfficiel" } as const;',
      'if (exigeOfficiel && !fresh.isOfficial) return { ok: false, raison: "nonOfficiel" } as const;',
      {"magasin": "⛔ L'ORDRE, sur un cas doublement fautif : un brouillon ANNULÉ répond `statutConf", "int-devis": "⛔ L'ORDRE, sur un cas doublement fautif : un brouillon ANNULÉ répond « statut » "})
cible("A-5. ⛔ R-1 — une révision n'HÉRITE plus du drapeau de la chaîne (la v2 d'un brouillon naît officielle)", MAGASIN,
      "          parentQuoteId: args.parentQuoteId,\n          isOfficial: derniere.isOfficial", "          parentQuoteId: args.parentQuoteId,\n          isOfficial: true",
      {"magasin": "⛔ la plus haute version est un BROUILLON : la révision en est un — la ligne écri", "int-devis": "⛔ v1 brouillon ⇒ v2 BROUILLON, même numéro, même chaîne : `BROUILLON-…-0001 v2`"})
cible("A-6. ⛔ R-1 — la révision d'un brouillon avec fiche ou nom n'est plus refusée avant l'écriture", MAGASIN,
      "if (!derniere.isOfficial && (args.chiffre.clientRecordId !== null", "if (false && (args.chiffre.clientRecordId !== null",
      {"magasin": "⛔ un brouillon et une fiche : le port REND `brouillonAvecClient` (il ne lève pas", "int-devis": "⛔ une révision d'un brouillon qui porte une FICHE ou un NOM : 409 `QUOTE_DRAFT_H"})
cible("A-7. ⛔ la « plus haute version » est la PLUS BASSE (le drapeau hérité et le numéro suivant viennent de la mauvaise ligne)", MAGASIN,
      'orderBy: { version: "desc" }, select: { version: true, isOfficial: true }', 'orderBy: { version: "asc" }, select: { version: true, isOfficial: true }',
      {"int-devis": "deux RÉVISIONS simultanées de la même chaîne : aucun doublon de version"})
cible("A-8. ⛔ la promotion ne conditionne plus l'écriture à `isOfficial: false` (un devis déjà officiel se « re-promeut »)", MAGASIN,
      "where: { id: donnees.quoteId, isOfficial: false, status: { in: [...donnees.statutsAdmis] } },", "where: { id: donnees.quoteId, status: { in: [...donnees.statutsAdmis] } },",
      {"magasin": "⛔ D-5 — l'écriture est un CHECK-AND-SET : `isOfficial: false` ET le statut admis", "int-devis": "⛔ D-5 — deux promotions : la seconde est un 409 `QUOTE_ALREADY_OFFICIAL`, et il "})
cible("A-9. ⛔ la ligne d'audit de la promotion change d'ACTION (la recherche d'un historique ne la retrouve plus)", MAGASIN,
      'action: "quote.promote",', 'action: "quote.promoted",',
      {"magasin": "⛔ D-11 — la ligne d'audit : l'action, l'entité, l'identifiant, l'ACTEUR et son R", "int-devis": "⛔ D-11 — UNE ligne d'audit : `quote.promote`, l'entité, l'identifiant, l'acteur "})
cible("A-10. ⛔ S-81 — la ligne d'audit porte le NOM du client (une donnée personnelle dans le journal)", MAGASIN,
      "after: { isOfficial: true, clientRecordId: donnees.copie.clientRecordId }",
      "after: { isOfficial: true, clientRecordId: donnees.copie.clientRecordId, nom: donnees.copie.clientNameLatin }",
      {"magasin": "⛔ D-11 — la ligne d'audit : l'action, l'entité, l'identifiant, l'ACTEUR et son R", "int-devis": "⛔ D-11 — UNE ligne d'audit : `quote.promote`, l'entité, l'identifiant, l'acteur "})
cible("A-11. ⛔ la promotion ne prend plus le VERROU de la chaîne (promotion ‖ révision ne se sérialisent plus)", MAGASIN,
      "await this.verrouillerChaine(tx, propre.chainId);", "/* verrou retiré */",
      {"magasin": "⛔ la séquence : la propriété, le VERROU, la plus haute version, l'écriture condi"})
cible("A-12. ⛔ la promotion d'une ANCIENNE version n'est plus refusée", MAGASIN,
      "if (propre.version < derniere.version)", "if (false)",
      {"magasin": "⛔ D-6 — la version n'est plus la dernière : le port REND `versionNonActive` (ave", "int-devis": "⛔ D-6 — v1 et v2 brouillons : promouvoir la v1 (ancienne) ⇒ 409 `QUOTE_VERSION_N"})
cible("A-13. ⛔ « déjà officiel » ne se distingue plus du conflit de statut", MAGASIN,
      'if (fresh.isOfficial) return { ok: false, raison: "dejaOfficiel" } as const;', 'if (false) return { ok: false, raison: "dejaOfficiel" } as const;',
      {"magasin": "⛔ compte = 0 : le statut et le drapeau sont RELUS dans la transaction ; un devis", "int-devis": "⛔ D-5 — deux promotions : la seconde est un 409 `QUOTE_ALREADY_OFFICIAL`, et il "})
cible("A-14. ⛔ la promotion ne traverse plus la RELATION au pro (le devis d'un autre pro se promeut)", MAGASIN,
      "where: { id: donnees.quoteId, venue: { deletedAt: null, owner: { userId: donnees.acteur.userId } } },", "where: { id: donnees.quoteId },",
      {"magasin": "⛔ la séquence : la propriété, le VERROU, la plus haute version, l'écriture condi"})
cible("A-15. ⛔ R-3 — la complétion du nom (K-5) n'exclut plus un brouillon du WHERE", MAGASIN,
      "where: { id: args.quoteId, isOfficial: true, ...(enArabe", "where: { id: args.quoteId, ...(enArabe",
      {"magasin": "⛔ MD-7 — le compare-and-set est dans le WHERE de l'UPDATE : la copie NULLE, le d", "int-devis": "⛔ la boîte de langue ne pose pas de nom sur un brouillon : 409 `QUOTE_DRAFT_HAS_"})
cible("A-16. ⛔ la création écrit TOUJOURS `isOfficial: true` (le brouillon demandé par le service est perdu à l'écriture)", MAGASIN,
      "isOfficial: reference.officiel", "isOfficial: true",
      {"magasin": "⛔ `officiel: false` ⇒ la ligne écrite porte `isOfficial: false` ; `officiel: tru", "int-devis": "un brouillon naît en DRAFT, v1, `isOfficial: false`, référence `BROUILLON-…`, sa"})
cible("A-17. ⛔ l'audit s'écrit HORS de la transaction de la promotion (un échec d'audit laisserait le devis promu)", MAGASIN,
      "await tx.auditLog.create({", "await this.prisma.auditLog.create({",
      {"magasin": "⛔ un échec de l'écriture d'audit LÈVE : la promotion ne survit pas à sa propre t"})
cible("A-18. ⛔ la sélection des lignes n'inclut plus `isOfficial` (le DTO le rendrait absent)", MAGASIN_TYPES,
      "isOfficial: true,", "isOfficial: false,",
      {"int-devis": "D121 — deux CONVERSIONS simultanées du même devis : une seule demande créée, jam"})

# ── X — le TABLEAU DES TRANSITIONS, le CONTRÔLEUR et le CLIENT D'API.
cible("X-1. ⛔ la commande `promote` écrit un statut (elle ANNULERAIT le devis qu'elle rend officiel)", TRANSITIONS,
      "[QuoteCommand.PROMOTE]: { from: QUOTE_OPEN_STATUSES, to: null }", "[QuoteCommand.PROMOTE]: { from: QUOTE_OPEN_STATUSES, to: QuoteStatus.CANCELLED }",
      {"transitions": "elle EXISTE, et n'écrit AUCUN statut (le drapeau `is_official` n'est pas un stat"})
cible("X-2. ⛔ la commande `promote` n'a aucun statut source (aucun devis ne se promeut)", TRANSITIONS,
      "[QuoteCommand.PROMOTE]: { from: QUOTE_OPEN_STATUSES, to: null }", "[QuoteCommand.PROMOTE]: { from: [], to: null }",
      {"transitions": "« promote » n'accepte que ses statuts source, et les accepte tous"})
cible("K-1. ⛔ la route de promotion change de chemin (le client d'API appelle une route qui n'existe plus)", CONTROLEUR,
      '@Post("quotes/:id/promote")', '@Post("quotes/:id/promouvoir")',
      {"int-devis": "⛔ D-8 — UN SEUL compteur : brouillon, officiel, brouillon ⇒ 0001, 0002, 0003 ; a", "int-contrat": "CHAQUE chemin appelé par @zwadj/api-client existe sur le routeur Nest"})
cible("K-2. ⛔ la promotion ne valide plus son corps par le contrat (une clé inconnue, un champ de trop passent)", CONTROLEUR,
      "@Body(new ZodValidationPipe(quotePromoteSchema)) body: QuotePromoteInput", "@Body() body: QuotePromoteInput",
      {"int-devis": "⛔ D-4 — la fiche d'un AUTRE pro : 404 `CLIENT_RECORD_NOT_FOUND` indistinct ; le "})
cible("C-1. ⛔ le client d'API appelle un autre chemin pour la promotion", CLIENT_API,
      "/quotes/${encodeURIComponent(quoteId)}/promote`", "/quotes/${encodeURIComponent(quoteId)}/promouvoir`",
      {"client-api": "POSTE la fiche et les noms sur `/quotes/:id/promote` — le chemin est écrit EN TO", "int-contrat": "CHAQUE chemin appelé par @zwadj/api-client existe sur le routeur Nest"})
cible("C-2. ⛔ le client d'API promeut par une autre méthode HTTP", CLIENT_API,
      '/promote`, { method: "POST", body: input })', '/promote`, { method: "PUT", body: input })',
      {"client-api": "POSTE la fiche et les noms sur `/quotes/:id/promote` — le chemin est écrit EN TO"})

# ── M — la BASE (migration `20261028100000`), sous `--int`. Pour retirer UNE colonne de la CHECK, on la rend tautologique (`x IS NULL OR x = x`) : le remplacement n'est
#    jamais une sous-chaîne de l'ancre (D325).
cible("M-1. ⛔ `is_official` a pour défaut FAUX : tout devis d'avant le lot deviendrait un brouillon", MIGRATION,
      "NOT NULL DEFAULT true;", "NOT NULL DEFAULT false;",
      {"int-migration": "⛔ les garanties que la migration pose (D186) : la colonne est un booléen OBLIGAT"})
# M-2 (RETIRÉE PAR ÉCRIT — mutation ÉQUIVALENTE) : admettre ACCEPTED dans la CHECK ne change AUCUN état admis. Hors DRAFT/CANCELLED, `quotes_sent_at_coherent` exige `sent_at` ; la CHECK de ce lot
# l'interdit (`sent_at IS NULL`) : un brouillon ACCEPTED est refusé par la CONJONCTION, quel que soit le statut listé. Mesuré à la découverte : `int-migration` 26/26 et `int-devis` 87/87 VERTS
# sous cette mutation (journaux `.neutralisation-journaux/r43/M-2-*.log`, versés). Le test « colonne par colonne » de la migration mesure le RÉSULTAT (un brouillon ne devient jamais ACCEPTED).
cible("M-3. ⛔ la CHECK ne regarde plus `sent_via` (un brouillon remis en base)", MIGRATION,
      'AND "sent_via" IS NULL', 'AND ("sent_via" IS NULL OR "sent_via" = "sent_via")',
      {"int-migration": "⛔ la CHECK refuse un brouillon COLONNE PAR COLONNE (M-3, M-4, M-6, M-7 de `neutr"})
cible("M-4. ⛔ la CHECK ne regarde plus `sent_at`", MIGRATION,
      'AND "sent_at" IS NULL', 'AND ("sent_at" IS NULL OR "sent_at" = "sent_at")',
      {"int-migration": "⛔ la CHECK refuse un brouillon COLONNE PAR COLONNE (M-3, M-4, M-6, M-7 de `neutr"})
# M-5 (RETIRÉE PAR ÉCRIT — mutation ÉQUIVALENTE) : retirer `accepted_at IS NULL` de la CHECK ne change AUCUN état admis. `quotes_accepted_at_coherent` exige ACCEPTED ou SUPERSEDED pour tout
# `accepted_at` non nul, et la CHECK de ce lot n'admet que DRAFT ou CANCELLED : un `accepted_at` sur un brouillon est refusé par l'AUTRE contrainte. Mesuré à la découverte : `int-migration` et
# `int-devis` VERTS sous cette mutation (journaux `.neutralisation-journaux/r43/M-5-*.log`, versés). Le conjoint reste dans la migration : défense en profondeur, dite ici.
cible("M-6. ⛔ Q2 — la CHECK ne regarde plus `client_record_id` (un brouillon avec une fiche)", MIGRATION,
      'AND "client_record_id" IS NULL', 'AND ("client_record_id" IS NULL OR "client_record_id" = "client_record_id")',
      {"int-migration": "⛔ la CHECK refuse un brouillon COLONNE PAR COLONNE (M-3, M-4, M-6, M-7 de `neutr", "int-devis": "D-15 en base — un brouillon qui porterait une fiche, un nom arabe ou un nom lati"})
cible("M-7. ⛔ Q2 — la CHECK ne regarde plus `client_name_ar` (un brouillon avec un nom en arabe)", MIGRATION,
      'AND "client_name_ar" IS NULL', 'AND ("client_name_ar" IS NULL OR "client_name_ar" = "client_name_ar")',
      {"int-migration": "⛔ la CHECK refuse un brouillon COLONNE PAR COLONNE (M-3, M-4, M-6, M-7 de `neutr", "int-devis": "D-15 en base — un brouillon qui porterait une fiche, un nom arabe ou un nom lati"})
cible("M-8. ⛔ Q2 — la CHECK ne regarde plus `client_name_latin` (un brouillon avec un nom en lettres latines)", MIGRATION,
      'AND "client_name_latin" IS NULL', 'AND ("client_name_latin" IS NULL OR "client_name_latin" = "client_name_latin")',
      {"int-migration": "⛔ après la migration : un devis neuf peut être un BROUILLON ; ce qu'un brouillon", "int-devis": "D-15 en base — un brouillon qui porterait une fiche, un nom arabe ou un nom lati"})
cible("M-9. ⛔ R-4 — le déclencheur ne s'exécute plus sur l'UPDATE de `quote_id` (une réservation se rattache à un brouillon APRÈS coup)", MIGRATION,
      'BEFORE INSERT OR UPDATE OF "quote_id" ON "bookings"', 'BEFORE INSERT ON "bookings"',
      {"int-migration": "⛔ les garanties que la migration pose (D186) : la colonne est un booléen OBLIGAT", "int-devis": "⛔ R-4 — un UPDATE de `quote_id` vers un brouillon est REFUSÉ aussi, et la réserv"})
cible("M-10. ⛔ la fonction du déclencheur ne refuse plus rien", MIGRATION,
      'IF EXISTS (SELECT 1 FROM "quotes" q WHERE q."id" = NEW."quote_id" AND NOT q."is_official") THEN', "IF false THEN",
      {"int-migration": "⛔ après la migration, le déclencheur : les deux réservations existantes sont int", "int-devis": "⛔ un INSERT direct sur un brouillon est REFUSÉ (23514, `bookings_quote_must_be_o"})
cible("M-11. ⛔ le refus du déclencheur n'est plus une violation de CONTRAINTE (SQLSTATE 23514)", MIGRATION,
      "ERRCODE = 'check_violation'", "ERRCODE = 'raise_exception'",
      {"int-devis": "⛔ un INSERT direct sur un brouillon est REFUSÉ (23514, `bookings_quote_must_be_o"})

# ── D — le PDF.
cible("D-1. ⛔ le filigrane n'est plus `position: fixed` (il n'apparaîtrait que sur la PREMIÈRE page — R-5)", MODELE_PDF,
      "position: fixed; inset-inline: 0;", "position: absolute; inset-inline: 0;",
      {"document": "⛔ le style du filigrane : `position: fixed` — la SEULE position qui se répète su", "int-document": "⛔ (fr) UN devis de 70 prestations, officiel puis brouillon : le MÊME nombre de p"})
cible("D-2. ⛔ un devis OFFICIEL porte aussi le filigrane (l'élément est posé sans condition)", MODELE_PDF,
      '${brouillon ? html`<div class="filigrane" aria-hidden="true">${L.draft}</div>` : ""}', '${html`<div class="filigrane" aria-hidden="true">${L.draft}</div>`}',
      {"document": "⛔ un devis OFFICIEL n'a AUCUN filigrane : ni élément, ni règle de style, ni la c", "int-document": "⛔ le brouillon est servi : `BROUILLON-…_fr_v1.pdf`, et le HTML confié au moteur "})
cible("D-3. ⛔ aucun devis ne porte plus le filigrane (le modèle croit tout devis officiel)", MODELE_PDF,
      "const brouillon = !record.isOfficial;", "const brouillon = false;",
      {"document": "⛔ un brouillon (fr) : EXACTEMENT UN élément filigrane, caché des lecteurs d'écra", "int-document": "⛔ (fr) UN devis de 70 prestations, officiel puis brouillon : le MÊME nombre de p"})
cible("D-4. ⛔ le filigrane est annoncé par les lecteurs d'écran (`aria-hidden` retiré)", MODELE_PDF,
      '<div class="filigrane" aria-hidden="true">', '<div class="filigrane">',
      {"document": "⛔ un brouillon (fr) : EXACTEMENT UN élément filigrane, caché des lecteurs d'écra"})
cible("D-5. ⛔ la feuille de style du filigrane n'est plus posée (le mot « BROUILLON » coule dans le texte)", MODELE_PDF,
      '${brouillon ? raw(WATERMARK_CSS) : ""}', '${brouillon ? "/* filigrane sans style */" : ""}',
      {"document": "⛔ le style du filigrane : `position: fixed` — la SEULE position qui se répète su", "int-document": "⛔ (fr) UN devis de 70 prestations, officiel puis brouillon : le MÊME nombre de p"})
cible("D-6. ⛔ la source du PDF dit toujours « officiel » (le drapeau de la ligne n'est pas lu)", SOURCE_PDF,
      "isOfficial: row.isOfficial,", "isOfficial: true,",
      {"int-document": "⛔ le brouillon est servi : `BROUILLON-…_fr_v1.pdf`, et le HTML confié au moteur "})
cible("D-7. ⛔ la référence imprimée sur un brouillon porte le préfixe d'un devis officiel", SOURCE_PDF,
      "version: row.version, official: row.isOfficial })", "version: row.version })",
      {"int-document": "⛔ le brouillon est servi : `BROUILLON-…_fr_v1.pdf`, et le HTML confié au moteur "})

# ── P — l'ÉCRAN du PRO.
cible("P-1. ⛔ Q1 — le second bouton CRÉE un devis officiel (le drapeau `isOfficial: false` n'est pas envoyé)", PARCOURS,
      "sansCoordonnees ? { ...body(), isOfficial: false as const } : body()", "{ ...body() }",
      {"pro-parcours": "⛔ la CRÉATION du brouillon envoie `isOfficial: false` et RIEN d'autre que le dev"})
cible("P-2. ⛔ le bandeau du brouillon n'est jamais rendu (ni téléchargement, ni promotion)", PARCOURS,
      "quote === null || quote.isOfficial !== false ? null : (", "quote === null || quote.isOfficial !== false || true ? null : (",
      {"pro-parcours": "⛔ garde native — le bandeau du brouillon est rendu, avec le téléchargement et le"})
cible("P-3. ⛔ R-1 — la révision d'un brouillon porte la fiche et les noms (le serveur la refuserait)", PARCOURS,
      "...(fiche === null || sansCoordonnees || chaineBrouillon ? {} : copiePourDevis(nomsEffectifs, fiche.id))",
      "...(fiche === null || sansCoordonnees ? {} : copiePourDevis(nomsEffectifs, fiche.id))",
      {"pro-parcours": "⛔ D-23 (R-1) — APRÈS avoir ajouté des coordonnées, modifier le brouillon le RÉVI"})
cible("P-4. ⛔ l'état de la chaîne ne vient plus du SERVEUR (`isOfficial` de la réponse ignoré)", PARCOURS,
      "setChaineBrouillon(next.isOfficial === false);", "setChaineBrouillon(false);",
      {"pro-parcours": "⛔ garde native — le TOTAL du brouillon survit à l'ajout des coordonnées (la fich"})
cible("P-5. ⛔ la promotion vise la FICHE au lieu du devis (le mauvais identifiant)", PARCOURS,
      "const officiel = await quotes.promote(quote.id, copiePourDevis(nomsEffectifs, fiche.id));", "const officiel = await quotes.promote(fiche.id, copiePourDevis(nomsEffectifs, fiche.id));",
      {"pro-parcours": "⛔ D-22 — « Ajouter les coordonnées » ramène au CONTACT ; après la fiche et les n"})
cible("P-6. ⛔ après la promotion, l'écran garde le brouillon (la réponse du serveur n'est pas posée)", PARCOURS,
      "setQuote(officiel);", "setQuote(quote);",
      {"pro-parcours": "⛔ après la promotion : l'écran prend le DTO du SERVEUR (`DEVIS-…`, même numéro),"})
cible("P-7. ⛔ le message « devis officiel » n'est jamais rendu après la promotion", PARCOURS,
      "{promu && quote.isOfficial !== false ? (", "{false ? (",
      {"pro-parcours": "⛔ garde native — après la promotion, le message « officiel » est rendu"})
cible("P-8. ⛔ le second bouton n'est jamais offert", PARCOURS,
      "{chainQuoteId === null || chaineBrouillon ? (", "{false ? (",
      {"pro-parcours": "⛔ garde native — le SECOND bouton est offert à l'étape Contact"})
cible("P-9. ⛔ R-1 — le second bouton est offert sur une chaîne OFFICIELLE déjà commencée", PARCOURS,
      "{chainQuoteId === null || chaineBrouillon ? (", "{true ? (",
      {"pro-parcours": "⛔ le second bouton n'est plus offert quand une chaîne OFFICIELLE est en cours : "})
cible("P-10. ⛔ le second bouton ne passe pas en mode « sans coordonnées »", PARCOURS,
      "    setSansCoordonnees(true);", "    setSansCoordonnees(false);",
      {"pro-parcours": "⛔ D-20 (Q2) — l'étape Client d'un brouillon n'a AUCUN champ de nom et A le champ"})
cible("P-11. ⛔ « Continuer » ne quitte plus le mode « sans coordonnées » (un brouillon garderait des coordonnées données ensuite)", PARCOURS,
      "    // ⛔ L36-2 : « Continuer » DONNE des coordonnées — le mode « sans coordonnées » s'arrête ici.\n    setSansCoordonnees(false);",
      "    // ⛔ L36-2 : « Continuer » DONNE des coordonnées — le mode « sans coordonnées » s'arrête ici.\n    /* mode conservé */",
      {"pro-parcours": "⛔ « Continuer » du contact QUITTE le mode « sans coordonnées » : revenu au conta"})
cible("P-12. ⛔ « Ajouter les coordonnées » ne ramène plus à l'étape Contact", PARCOURS,
      '    setSansCoordonnees(false);\n    goTo("contact");', '    setSansCoordonnees(false);\n    goTo("quote");',
      {"pro-parcours": "⛔ D-22 — « Ajouter les coordonnées » ramène au CONTACT ; après la fiche et les n"})
cible("P-13. ⛔ D-23 — changer les noms d'un brouillon jette son total (une version de plus, inutile)", PARCOURS,
      "    if (!chaineBrouillon) invalidate();\n  };", "    if (chaineBrouillon || !chaineBrouillon) invalidate();\n  };",
      {"pro-parcours": "⛔ garde native — le TOTAL du brouillon survit à l'ajout des coordonnées (la fich"})
cible("P-14. ⛔ D-23 — « Continuer » du contact jette le total d'un brouillon", PARCOURS,
      '      if (!chaineBrouillon) invalidate();\n      goTo("client");', '      if (chaineBrouillon || !chaineBrouillon) invalidate();\n      goTo("client");',
      {"pro-parcours": "⛔ garde native — le TOTAL du brouillon survit à l'ajout des coordonnées (la fich"})
cible("P-15. ⛔ Q2 — « Continuer » de l'étape Client d'un brouillon cherche ou crée une fiche", PARCOURS,
      "    // ⛔ L36-2 (Q2) : un brouillon n'a ni fiche ni nom — rien à chercher, rien à créer.\n    if (sansCoordonnees) {",
      "    // ⛔ L36-2 (Q2) : un brouillon n'a ni fiche ni nom — rien à chercher, rien à créer.\n    if (false) {",
      {"pro-parcours": "⛔ D-20 (Q2) — l'étape Client d'un brouillon n'a AUCUN champ de nom et A le champ"})
cible("P-16. ⛔ R-3 — le PDF d'un brouillon porte un nom qui n'est pas celui de sa référence", PARCOURS,
      "saveBlob(fichier, quoteDocumentFilename(courant, documentLocale));\n        setBrouillonTelecharge(true);", 'saveBlob(fichier, "devis.pdf");\n        setBrouillonTelecharge(true);',
      {"pro-parcours": "⛔ D-21 (R-3) — « Télécharger le brouillon » ouvre la boîte de langue, télécharge"})
cible("P-17. ⛔ le téléchargement d'un brouillon ne le dit jamais", PARCOURS,
      "setBrouillonTelecharge(true);", "setBrouillonTelecharge(false);",
      {"pro-parcours": "⛔ garde native — le téléchargement d'un brouillon DIT qu'il a eu lieu"})
cible("P-18. ⛔ « Rendre officiel » s'offre avant que le client soit renseigné", PARCOURS,
      "disabled={busy || !clientAnswered} onClick={rendreOfficiel}", "disabled={busy} onClick={rendreOfficiel}",
      {"pro-parcours": "⛔ « Rendre le devis officiel » reste GRISÉ tant que l'étape Client n'est pas rép"})
cible("P-19. ⛔ le récapitulatif du contact ne dit pas « sans coordonnées »", PARCOURS,
      'if (sansCoordonnees) return t("venue.ui.walkin.draftSummary");', 'if (false) return t("venue.ui.walkin.draftSummary");',
      {"pro-parcours": "⛔ garde native — le récapitulatif DIT que le contact n'a pas été donné"})
cible("P-20. ⛔ Q2 — un brouillon exige aussi un NOM pour continuer", PARCOURS,
      "const blockers = sansCoordonnees ? invitesBlockers(guests) : clientBlockers(nomsEffectifs, guests);", "const blockers = clientBlockers(nomsEffectifs, guests);",
      {"pro-parcours": "⛔ garde native — « Continuer » de l'étape Client d'un brouillon est GRISÉ sans i"})
cible("P-21. ⛔ l'étape Contact d'un brouillon n'est pas « répondue » (le parcours reste bloqué dessus)", PARCOURS,
      "const contactAnswered = sansCoordonnees || (identifiantPret && identifiantCherche);", "const contactAnswered = identifiantPret && identifiantCherche;",
      {"pro-parcours": "⛔ D-20 (Q2) — l'étape Client d'un brouillon n'a AUCUN champ de nom et A le champ"})
cible("P-22. ⛔ le devis d'un brouillon n'est pas calculable sans fiche", PARCOURS,
      "&& (sansCoordonnees || fiche !== null);", "&& fiche !== null;",
      {"pro-parcours": "⛔ garde native — le parcours d'un brouillon ATTEINT le devis : sans fiche, aucun"})
cible("P-23. ⛔ l'étape Client d'un brouillon n'est pas « répondue » sans fiche", PARCOURS,
      "client: clientAnswered && (sansCoordonnees || fiche !== null),", "client: clientAnswered && fiche !== null,",
      {"pro-parcours": "⛔ garde native — le parcours d'un brouillon ATTEINT le devis : sans fiche, aucun"})
cible("P-24. ⛔ « Rendre officiel » s'offre à un brouillon SANS fiche (le geste demanderait une fiche absente)", PARCOURS,
      "{fiche === null || sansCoordonnees ? (", "{false ? (",
      {"pro-parcours": "⛔ garde native — le bandeau du brouillon est rendu, avec le téléchargement et le"})
cible("P-25. ⛔ le bouton « sans coordonnées » mène ailleurs (il ramène à l'étape Contact)", PARCOURS,
      '<button type="button" className="wk-btn" disabled={busy} onClick={choisirSansCoordonnees}>', '<button type="button" className="wk-btn" disabled={busy} onClick={ajouterLesCoordonnees}>',
      {"pro-parcours": "⛔ Q1 — l'étape Contact porte UN SECOND bouton, à côté de « Continuer » ; il s'ou"})
cible("P-26. ⛔ D-20 — la règle des invités d'un brouillon ne bloque plus un nombre nul", ECRAN_CONTACT,
      'return Number(guests) > 0 ? [] : ["needGuests"];', "return [];",
      {"pro-contact": "un seul manque : « le nombre d'invités est obligatoire », et rien d'autre", "pro-parcours": "tout est vide : la liste nomme CHAQUE manque de l'étape, et le bouton la désigne"})


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
    restaurer_si_interrompu()
    if not calibrer():
        print("✗ ABANDON : le lecteur manque un bras de sa calibration — rien n'est mesuré.")
        return 2
    if not verifier_arbre("AU DÉPART"):
        return 2
    if FILTRE and not DECOUVERTE:
        print("✗ R43_FILTRE n'est admis qu'avec R43_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R43_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
        return 2
    actives = [c for c in toutes if not FILTRE or any(c["libelle"].startswith(p) for p in FILTRE)]
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
