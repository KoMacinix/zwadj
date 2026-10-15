#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 39 (D333), LOT L35-3 : la NUMÉROTATION des devis — une référence `DEVIS-2026-0001-0089 v1`, un compteur atomique par (salle, année), une clé composite des versions vers leur tête.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · la FORMULE (`packages/types/src/quote.ts`, module pur) : quatre chiffres AU MOINS et jamais de troncature, la salle et le devis ne se confondent pas, une référence fausse LÈVE (version, année), le nom du
    fichier se DÉRIVE de la référence, de la langue demandée et de la version, et une chaîne qui n'est pas une référence n'est pas un nom de fichier (U-*) ;
  · l'ANNÉE d'Alger (`quote-reference.ts`, module pur) : UTC + 1, jamais UTC, jamais le fuseau de l'hôte, une date invalide lève (Y-*) ;
  · le MAGASIN (`quote-store.prisma.ts`) : le compteur s'incrémente DANS la transaction du devis, par `ON CONFLICT … + 1 … RETURNING` et jamais « le plus grand + 1 » ; la tête naît avec `chain_id = id` ;
    l'année passée, le numéro rendu et la date passée sont écrits ; la révision RECOPIE sa tête et ne touche aucun compteur (S-*, mesurés par le spec unitaire ; I-10 à I-13 contre PostgreSQL) ;
  · le SERVICE et le DTO (`quotes.service.ts`) : la référence est bâtie sur la ligne stockée par la formule partagée ; le service lit l'horloge UNE fois et passe l'année d'Alger ET l'instant (V-*, I-14, I-15) ;
  · le DOCUMENT : le titre et l'en-tête portent la référence STOCKÉE, isolée de gauche à droite ; le nom du fichier suit la langue demandée (D-*, I-16) ;
  · l'app PRO : la référence du serveur s'affiche après « Calculer le devis », isolée ; la fenêtre de remise la dit en premier ; le fichier porte la langue CHOISIE (P-*) ;
  · les MIGRATIONS, REJOUÉES depuis leurs fichiers sous `--int` : numérotation des salles (ordre, départage, `setval`, immuabilité, unicité) et des devis (année d'Alger, départage, compteurs, index partiel,
    clé composite) (I-1 à I-9).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r39.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r39.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R39_DECOUVERTE=1 python3 neutralisation/neutralize-r39.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en échec) ; le titre attendu porte « × » ;
la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot est de méthode RENFORCÉE : la lecture y est EXIGÉE, et les tests du lot écrivent leurs verdicts
par `expect` de vitest (jamais le `.expect(<statut>)` de supertest, qui lève une `Error`, ni une requête Testing Library qui lève une `TestingLibraryElementError`).
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution
ne doit jamais être une SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R39_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — la référence à l'écran, dans la fenêtre de remise et le nom du fichier téléchargé : `e2e/specs/r33-remise-devis.e2e.ts`, neutralisée à
la main (procédure versée) ; (2) la concurrence au-delà de ce que `quote-numbering.int-spec.ts` joue (20 créations, 8 + 8 + 3) ; (3) ce que Ko voit (les scénarios de `docs/preuves/D333/scenarios-ko.md`).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-r38.py` (calibré par D316 / D325 / D331 / D332) ; seuls les noms, le jeu de
cibles, `--int` et le bilan changent.
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

SAUVEGARDE = ".neutralisation-r39"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r39")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R39_DECOUVERTE") == "1"
# `R39_FILTRE="M-,C-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R39_FILTRE", "").split(",") if p]


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


MESURES = {
    "types": _vitest("@zwadj/api", "src/common/quote-reference.spec.ts"),
    "annee": _vitest("@zwadj/api", "src/venues/quote-reference.spec.ts"),
    "store": _vitest("@zwadj/api", "src/venues/quote-store.prisma.spec.ts"),
    "service": _vitest("@zwadj/api", "src/venues/quotes.service.spec.ts"),
    "doc": _vitest("@zwadj/api", "src/documents/quote-document.spec.ts"),
    "doc-service": _vitest("@zwadj/api", "src/documents/quote-document.service.spec.ts"),
    "pro-remise": _vitest("@zwadj/pro", "src/dashboard/remittance.test.ts"),
    "pro-parcours": _vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-numerotation": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/quote-numbering.int-spec.ts"],
    "int-migration": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/migration-non-empty.int-spec.ts"],
    "int-document": ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/quote-document.int-spec.ts"]
}
MESURES_INT = {"int-numerotation", "int-migration", "int-document"}
AVEC_INT = "--int" in sys.argv

TYPES = "packages/types/src/quote.ts"
ANNEE = "apps/api/src/venues/quote-reference.ts"
MAGASIN = "apps/api/src/venues/quote-store.prisma.ts"
SERVICE_DEVIS = "apps/api/src/venues/quotes.service.ts"
MODELE = "apps/api/src/documents/quote-document.ts"
SERVICE_DOC = "apps/api/src/documents/quote-document.service.ts"
LECTURE_DOC = "apps/api/src/documents/quote-document-source.prisma.ts"
MIG_SALLE = "apps/api/prisma/migrations/20261015100000_venue_number/migration.sql"
MIG_DEVIS = "apps/api/prisma/migrations/20261015100100_quote_reference/migration.sql"
REMISE = "apps/pro/src/dashboard/remittance.ts"
PARCOURS = "apps/pro/src/dashboard/walkin-journey.tsx"
CAT_AR = "packages/i18n/messages/ar.json"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── U — la FORMULE de la référence et du nom de fichier (`@zwadj/types`, module pur).
cible("U-1. ⛔ les numéros n'ont plus que TROIS chiffres : `padStart(3)` au lieu de `padStart(4)` (R3 : quatre au moins)", TYPES,
      'String(n).padStart(4, "0")', 'String(n).padStart(3, "0")', {"types": "l'exemple de R3 : année 2026, salle 1, devis 89"})
cible("U-2. ⛔ un numéro de plus de quatre chiffres est TRONQUÉ (`10000` devient `0000`)", TYPES,
      'String(n).padStart(4, "0")', 'String(n).padStart(4, "0").slice(-4)', {"types": "quatre chiffres AU MOINS, jamais de troncature : 10000"}, genre="insertion")
cible("U-3. ⛔ le numéro de la salle et celui du devis sont INTERVERTIS", TYPES,
      "-${salle}-${devis} v", "-${devis}-${salle} v", {"types": "la salle et le devis ne se confondent pas"})
cible("U-4. ⛔ la version n'est plus validée : `v${NaN}` s'imprime", TYPES,
      'v${referencePart(parts.version, "version")}', "v${parts.version}", {"types": "une référence FAUSSE ne s'imprime pas : NaN"})
cible("U-5. ⛔ l'année n'est plus bornée : 1999 et 10000 s'impriment", TYPES,
      "if (year < QUOTE_REFERENCE_YEAR_MIN || year > QUOTE_REFERENCE_YEAR_MAX) {", "if (false) {", {"types": "une année hors de la plage de la base"})
cible("U-6. ⛔ le nom du fichier ignore la langue : toujours `_fr_` (K-7)", TYPES,
      "${m[1]}_${locale}_v${m[2]}.pdf", "${m[1]}_fr_v${m[2]}.pdf", {"types": "l'exemple de R3 : `DEVIS-2026-0001-0089_fr_v1.pdf`"})
cible("U-7. ⛔ le nom du fichier ignore la version de la référence : toujours `_v1`", TYPES,
      "_${locale}_v${m[2]}.pdf", "_${locale}_v1.pdf", {"types": "pour CHAQUE langue de l'autorité"})
cible("U-8. ⛔ la forme d'une référence n'est plus vérifiée : « DEVIS-2026-1-89 v1 » devient un nom de fichier", TYPES,
      r"/^(DEVIS-\d{4}-\d{4,}-\d{4,}) v(\d+)$/u", r"/^(.*) v(\d+)$/u", {"types": "une chaîne qui n'est pas une référence LÈVE"})

# ── Y — l'ANNÉE d'Alger (module pur de l'API).
cible("Y-1. ⛔ l'année est calculée en UTC : le 31/12 à 23 h 00 UTC, il est déjà l'année suivante à Alger", ANNEE,
      "return new Date(ms + DECALAGE_ALGER_MS).getUTCFullYear();", "return new Date(ms).getUTCFullYear();", {"annee": "hôte réglé sur UTC > ⛔ 2026-12-31T23:00:00.000Z ⇒ 2027"})
cible("Y-2. ⛔ l'année est lue dans le fuseau de l'HÔTE (`getFullYear`) : le résultat dépend de la machine", ANNEE,
      "return new Date(ms + DECALAGE_ALGER_MS).getUTCFullYear();", "return new Date(ms + DECALAGE_ALGER_MS).getFullYear();", {"annee": "hôte réglé sur America/New_York > ⛔ 2026-12-31T23:00:00.000Z ⇒ 2027"})
cible("Y-3. ⛔ une date invalide ne lève plus : l'année `NaN` devient une référence", ANNEE,
      'if (Number.isNaN(ms)) throw new RangeError("algiersYear : date invalide");', 'if (false) throw new RangeError("algiersYear : date invalide");', {"annee": "une date invalide LÈVE"})

# ── S — le MAGASIN : le compteur, la tête, la révision (séquence de la transaction, mesurée par le spec unitaire).
cible("S-1. ⛔ le compteur est incrémenté HORS de la transaction du devis (F-7 : un échec ultérieur le laisserait avancé)", MAGASIN,
      "const lignes = await tx.$queryRaw<{ last_number: number }[]>`", "const lignes = await this.prisma.$queryRaw<{ last_number: number }[]>`",
      {"store": "le compteur, l'identifiant, la tête, la relecture"})
cible("S-2. ⛔ le numéro se calcule « le plus grand + 1 » (le défaut que R3 interdit) au lieu du compteur atomique", MAGASIN,
      "ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1",
      "ON CONFLICT (venue_id, year) DO UPDATE SET last_number = (SELECT COALESCE(MAX(reference_number), 0) + 1 FROM quotes)", {"store": "le compteur s'incrémente par `INSERT"})
cible("S-3. ⛔ la tête naît avec un `chain_id` provisoire au lieu de son propre identifiant (S-22)", MAGASIN,
      "          chainId: id,", '          chainId: "00000000-0000-7000-8000-000000000000",', {"store": "la tête porte l'identifiant pré-généré COMME chain_id"})
cible("S-4. ⛔ l'année de la référence est celle de l'horloge du magasin, pas celle que le service a passée", MAGASIN,
      "referenceYear: reference.annee,", "referenceYear: new Date().getUTCFullYear() - 100,", {"store": "la tête porte l'identifiant pré-généré COMME chain_id"})
cible("S-5. ⛔ le numéro écrit n'est pas celui que le compteur a rendu", MAGASIN,
      "referenceNumber: numero,", "referenceNumber: 1,", {"store": "la tête porte l'identifiant pré-généré COMME chain_id"})
cible("S-6. ⛔ la date de création n'est pas l'instant que le service a lu (S-21)", MAGASIN,
      "createdAt: reference.creeLe", "createdAt: new Date(reference.creeLe.getTime() + 7_200_000)", {"store": "la tête porte l'identifiant pré-généré COMME chain_id"})
cible("S-7. ⛔ la révision n'écrit pas l'année de sa tête", MAGASIN,
      "referenceYear: tete.referenceYear,", "referenceYear: 2000,", {"store": "une révision NE TOUCHE AUCUN COMPTEUR"})
cible("S-8. ⛔ la révision n'écrit pas le numéro de sa tête", MAGASIN,
      "referenceNumber: tete.referenceNumber,", "referenceNumber: 1,", {"store": "une révision NE TOUCHE AUCUN COMPTEUR"})
cible("S-9. ⛔ la révision INCRÉMENTE un compteur (elle ne doit en toucher aucun, F-2/F-4)", MAGASIN,
      "const tete = await this.verrouillerChaine(tx, args.chainId);",
      "const tete = await this.verrouillerChaine(tx, args.chainId);\n      await this.incrementerCompteur(tx, args.venueId, tete.referenceYear);", {"store": "une révision NE TOUCHE AUCUN COMPTEUR", "store#2": "`FOR UPDATE` puis `aggregate` puis `create`"}, genre="insertion")
cible("S-10. ⛔ la réponse du compteur n'est plus vérifiée : un numéro invalide s'écrit", MAGASIN,
      'if (lignes.length !== 1 || typeof numero !== "number" || !Number.isInteger(numero) || numero < 1) {', "if (false) {", {"store": "un compteur qui ne rend PAS exactement une ligne"})

# ── V — le SERVICE et le DTO.
cible("V-1. ⛔ la version de la référence est figée à 1 : une révision garde `v1`", SERVICE_DEVIS,
      "quoteNumber: row.referenceNumber,\n        version: row.version", "quoteNumber: row.referenceNumber,\n        version: 1", {"service": "une révision garde l'année et les deux numéros de sa tête"})
cible("V-2. ⛔ le numéro de la SALLE est remplacé par le numéro du devis", SERVICE_DEVIS,
      "venueNumber: row.venue.number,", "venueNumber: row.referenceNumber,", {"service": "le DTO porte `reference`", "service#2": "une révision garde l'année et les deux numéros de sa tête"})
cible("V-3. ⛔ l'année de la référence est figée", SERVICE_DEVIS,
      "year: row.referenceYear,", "year: 2000,", {"service": "le DTO porte `reference`", "service#2": "une révision garde l'année et les deux numéros de sa tête"})

# ── D — le DOCUMENT : la référence STOCKÉE s'imprime, le nom du fichier se dérive d'elle et de la langue demandée.
cible("D-1. ⛔ le titre du document porte l'ancienne référence (huit caractères de l'identifiant)", MODELE,
      "<title>${L.title} ${record.reference}</title>", "<title>${L.title} ${record.id.slice(0, 8)}</title>", {"doc": "la référence imprimée est la référence STOCKÉE du devis"})
cible("D-2. ⛔ l'en-tête du document porte l'ancienne référence", MODELE,
      '${L.reference} <bdi dir="ltr">${record.reference}</bdi>', '${L.reference} <bdi dir="ltr">${record.id.slice(0, 8)}-v${record.version}</bdi>', {"doc": "la référence imprimée est la référence STOCKÉE du devis"})
cible("D-3. ⛔ la référence n'est plus isolée de gauche à droite : en arabe, ses groupes de chiffres s'inversent", MODELE,
      '<bdi dir="ltr">${record.reference}</bdi>', '<span dir="ltr">${record.reference}</span>', {"doc": "rang 39 (F-16) : la référence est isolée de GAUCHE À DROITE"})
cible("D-4. ⛔ le service nomme le fichier dans une langue FIXE (la langue demandée est ignorée)", SERVICE_DOC,
      "const filename = quoteDocumentFilename(record, locale);", 'const filename = quoteDocumentFilename(record, "fr");', {"doc-service": "le nom du fichier porte la langue DEMANDÉE"})

# ── P — l'app PRO : la référence à l'écran, dans la fenêtre de remise, le nom du fichier téléchargé.
cible("P-1. ⛔ la référence affichée n'est pas celle du serveur (l'identifiant du devis est affiché à sa place)", PARCOURS,
      '<bdi dir="ltr">{quote.reference}</bdi>', '<bdi dir="ltr">{quote.id}</bdi>', {"pro-parcours": "la référence rendue par le serveur s'affiche juste après le calcul"})
cible("P-2. ⛔ la référence n'est plus isolée de gauche à droite à l'écran (`<span>` au lieu de `<bdi>`)", PARCOURS,
      '<bdi dir="ltr">{quote.reference}</bdi>', '<span dir="ltr">{quote.reference}</span>', {"pro-parcours": "la référence rendue par le serveur s'affiche juste après le calcul"})
cible("P-3. ⛔ le fichier téléchargé porte la langue de l'INTERFACE, pas celle choisie dans la boîte", PARCOURS,
      "quoteDocumentFilename(courant, documentLocale)", 'quoteDocumentFilename(courant, isAr ? "ar" : "fr")', {"pro-parcours": "le nom du fichier porte la langue CHOISIE dans la boîte"})
cible("P-4. ⛔ la fenêtre de remise n'a plus la ligne de référence (clé renommée)", REMISE,
      '{ key: "remitReference", reference },', '{ key: "remitNeutralisee", reference },', {"pro-remise": "les QUATRE issues rendent quatre titres différents", "pro-remise#2": "la référence du devis est la PREMIÈRE ligne, pour les cinq canaux", "pro-parcours": "la fenêtre de remise COMMENCE par la référence du devis remis"})
cible("P-5. ⛔ la référence n'est plus isolée dans la phrase de la fenêtre (aucun isolat Unicode)", REMISE,
      "return `\\u2066${texte}\\u2069`;", "return texte;", {"pro-remise": "la référence reste lisible de GAUCHE À DROITE dans une phrase arabe", "pro-parcours": "la fenêtre de remise COMMENCE par la référence du devis remis"})
cible("P-6. ⛔ la fenêtre ne transmet pas la référence au gabarit : la phrase garde son emplacement vide", PARCOURS,
      "reference: ligne.reference === undefined ? undefined : isolateLtr(ligne.reference),", "reference: undefined,", {"pro-parcours": "la fenêtre de remise COMMENCE par la référence du devis remis"})
cible("P-7. la clé de la phrase de référence est absente du catalogue ARABE (parité rompue)", CAT_AR,
      '"remitReference": "مرجع العرض: {reference}."', '"remitReferenceX": "مرجع العرض: {reference}."', {"pro-remise": "chaque ligne que la fenêtre peut afficher existe dans les deux catalogues"})

# ── I — l'INTÉGRATION (`--int`) : les migrations REJOUÉES depuis les fichiers, le service et le magasin contre PostgreSQL réel.
cible("I-1. ⛔ migration des salles : l'égalité de dates est départagée par l'identifiant DÉCROISSANT", MIG_SALLE,
      'SELECT "id", (row_number() OVER (ORDER BY "created_at", "id"))::integer AS "rang"',
      'SELECT "id", (row_number() OVER (ORDER BY "created_at", "id" DESC))::integer AS "rang"', {"int-migration": "M-A — toutes les salles, SUPPRIMÉES comprises"})
cible("I-2. ⛔ migration des salles : le déclencheur d'immuabilité vise une AUTRE colonne", MIG_SALLE,
      '  BEFORE UPDATE OF "number" ON "venues"', '  BEFORE UPDATE OF "name_fr" ON "venues"', {"int-migration": "M-A — toutes les salles, SUPPRIMÉES comprises", "int-numerotation": "`UPDATE venues SET number` est REFUSÉ par la base"})
cible("I-3. ⛔ migration des salles : le numéro n'est plus UNIQUE", MIG_SALLE,
      '  ADD CONSTRAINT "venues_number_key" UNIQUE ("number"),', '  ADD CONSTRAINT "venues_number_key" CHECK ("number" > 0),', {"int-numerotation": "un numéro de salle déjà pris est REFUSÉ par la base"})
cible("I-4. ⛔ migration des salles : la séquence repart de 1 (le `setval` ne suit pas le maximum)", MIG_SALLE,
      "SELECT setval('venue_number_seq', COALESCE(MAX(\"number\"), 1), MAX(\"number\") IS NOT NULL) FROM \"venues\";",
      "SELECT setval('venue_number_seq', 1, false) FROM \"venues\";", {"int-migration": "M-A — toutes les salles, SUPPRIMÉES comprises"})
cible("I-5. ⛔ migration des devis : l'année est celle d'UTC, pour le numéro comme pour la partition (le 31/12 à 23 h 00 UTC reste l'année courante)", MIG_DEVIS,
      "(EXTRACT(YEAR FROM \"created_at\" AT TIME ZONE 'Africa/Algiers'))::smallint AS \"annee\",\n               (row_number() OVER (\n"
      "                  PARTITION BY \"venue_id\", EXTRACT(YEAR FROM \"created_at\" AT TIME ZONE 'Africa/Algiers')",
      "(EXTRACT(YEAR FROM \"created_at\" AT TIME ZONE 'UTC'))::smallint AS \"annee\",\n               (row_number() OVER (\n"
      "                  PARTITION BY \"venue_id\", EXTRACT(YEAR FROM \"created_at\" AT TIME ZONE 'UTC')", {"int-migration": "M-B — les devis existants sont numérotés"})
cible("I-6. ⛔ migration des devis : l'ordre de numérotation est celui de l'IDENTIFIANT, pas celui de la création", MIG_DEVIS,
      '                  ORDER BY "created_at", "id"', '                  ORDER BY "id", "created_at"', {"int-migration": "M-B — les devis existants sont numérotés"})
cible("I-7. ⛔ migration des devis : les compteurs sont amorcés à maximum + 1 (un numéro serait sauté)", MIG_DEVIS,
      'SELECT "venue_id", "reference_year", MAX("reference_number")', 'SELECT "venue_id", "reference_year", MAX("reference_number") + 1', {"int-migration": "M-B — les devis existants sont numérotés"}, genre="insertion")
cible("I-8. ⛔ migration des devis : l'unicité n'est plus PARTIELLE — une révision ne peut plus reprendre le numéro de sa tête", MIG_DEVIS,
      '"reference_number") WHERE "version" = 1;', '"reference_number");', {"int-numerotation": "une révision garde le numéro de la tête", "int-numerotation#2": "8 créations + 8 révisions"})
cible("I-9. ⛔ migration des devis : la clé étrangère composite vers la tête n'est jamais posée", MIG_DEVIS,
      'ALTER TABLE "quotes"\n  ADD CONSTRAINT "quotes_chain_head_fkey"\n  FOREIGN KEY ("chain_id", "venue_id", "reference_year", "reference_number")\n'
      '  REFERENCES "quotes"("id", "venue_id", "reference_year", "reference_number")\n  ON DELETE RESTRICT ON UPDATE RESTRICT;',
      "SELECT 1;", {"int-migration": "M-B — les devis existants sont numérotés", "int-numerotation": "une version qui diffère de sa tête par le NUMÉRO"})
cible("I-10. ⛔ magasin : le numéro se calcule « le plus grand + 1 » au lieu du compteur atomique (deux créations simultanées portent le même)", MAGASIN,
      "    const lignes = await tx.$queryRaw<{ last_number: number }[]>`\n"
      "      INSERT INTO quote_number_counters (venue_id, year, last_number)\n"
      "      VALUES (${venueId}::uuid, ${annee}::smallint, 1)\n"
      "      ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1\n"
      "      RETURNING last_number`;",
      "    const lignes = await tx.$queryRaw<{ last_number: number }[]>`\n"
      "      SELECT COALESCE(MAX(reference_number), 0) + 1 AS last_number FROM quotes\n"
      "       WHERE venue_id = ${venueId}::uuid AND reference_year = ${annee}::smallint AND version = 1`;", {"int-numerotation": "20 créations lancées ENSEMBLE", "int-numerotation#2": "une insertion refusée APRÈS l'incrément"})
cible("I-11. ⛔ magasin : le compteur est incrémenté hors de la transaction (un échec ultérieur le laisse avancé)", MAGASIN,
      "const lignes = await tx.$queryRaw<{ last_number: number }[]>`", "const lignes = await this.prisma.$queryRaw<{ last_number: number }[]>`",
      {"int-numerotation": "une insertion refusée APRÈS l'incrément", "int-numerotation#2": "compteur remis en arrière à la main"})
cible("I-12. ⛔ magasin : la révision écrit le numéro 1 au lieu de celui de sa tête", MAGASIN,
      "referenceNumber: tete.referenceNumber,", "referenceNumber: 1,", {"int-numerotation": "une révision garde le numéro de la tête"})
cible("I-13. ⛔ magasin : la date de création n'est pas l'instant que le service a lu", MAGASIN,
      "createdAt: reference.creeLe", "createdAt: new Date(reference.creeLe.getTime() + 7_200_000)", {"int-numerotation": "31/12 à 22 h 59 UTC ⇒ 2026"})
cible("I-14. ⛔ service : l'année passée au magasin est celle d'UTC", SERVICE_DEVIS,
      "annee: algiersYear(maintenant)", "annee: maintenant.getUTCFullYear()", {"int-numerotation": "31/12 à 22 h 59 UTC ⇒ 2026", "int-numerotation#2": "deux ANNÉES d'une même salle ont deux compteurs"})
cible("I-15. ⛔ service : l'instant de création passé n'est pas celui de l'horloge", SERVICE_DEVIS,
      "creeLe: maintenant }", "creeLe: new Date(maintenant.getTime() + 7_200_000) }", {"int-numerotation": "31/12 à 22 h 59 UTC ⇒ 2026"})
cible("I-16. ⛔ lecture du document : la référence imprimée est celle d'un AUTRE devis (le numéro du devis + 1)", LECTURE_DOC,
      "quoteNumber: row.referenceNumber, version: row.version }),", "quoteNumber: row.referenceNumber + 1, version: row.version }),", {"int-document": "le propriétaire télécharge : application/pdf"})


def _est_int(c: dict) -> bool:
    return any(_mesure_de(m) in MESURES_INT for m in c["mesures"])


def _jouees() -> list[dict]:
    """Les cibles jouées. Une clé de mesure peut porter un suffixe `#n` : plusieurs titres d'un MÊME fichier de test pour une même cible (le dictionnaire ne peut pas répéter une clé).
    Sans `--int`, les cibles d'INTÉGRATION (PostgreSQL réel) ne sont pas jouées : elles sont COMPTÉES comme telles, jamais comme mordues."""
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
    Copie du lecteur de `neutralize-r33.py` (calibré par D316 et D325) — mêmes verdicts, mêmes bras de calibration ci-dessous."""
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


# ── CALIBRATION DU LECTEUR, à chaque lancement (D286) — les bras vitest de `neutralize-r33.py`, formes réelles versées sous `docs/preuves/D316/` et `docs/preuves/D304/`.
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
    # Bras propre à ce lot : le bruit de console (« not wrapped in act(...) ») fait échouer le test par une `Error` de `test-setup.ts` — ce n'est pas une morsure non plus.
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
        print("✗ R39_FILTRE n'est admis qu'avec R39_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R39_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
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
