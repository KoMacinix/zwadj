#!/usr/bin/env python3
"""Campagne de neutralisation — RANG 41 (D336), LOT L35-4 AMENDÉ : la FICHE CLIENT d'un pro (numéro OU e-mail) et le NOM sur le devis.

Ce que le lot ajoute, et que chaque cible neutralise (une garde neuve dont on n'a pas montré qu'elle mord est une assurance sans mesure) :
  · le CONTRAT (`packages/types`) : la recherche exige EXACTEMENT un identifiant, la création un identifiant ET un nom, la modification au moins un champ ;
    l'e-mail d'une fiche est NORMALISÉ (rogné, NFKC, minuscules) ; la correspondance langue ↔ copie du nom est une seule autorité (T-*) ;
  · la POLITIQUE (`pro-client-policy.ts`, module pur) : le contact du pro refusé (numéro, second numéro, e-mail), la création qui crée, rend ou refuse,
    la copie du nom d'une fiche liée, C-C3 (P-*) ;
  · le SERVICE des fiches (`pro-clients.service.ts`) et la GARDE DE SOURCE de M-4 : la recherche ne lit que les fiches, jamais le compte (S-*, A-1) ;
  · l'ADAPTATEUR des fiches (`pro-client-store.prisma.ts`) et la MIGRATION, contre PostgreSQL sous `--int` : l'unicité (pro, numéro) et (pro, e-mail),
    l'insertion qui ne fait rien sur conflit, les compare-and-set sur NULL, la propriété par la relation, les `CHECK` (A-*, M-*) ;
  · le DEVIS (`quotes.service.ts`, `quote-store.prisma.ts`) : la fiche du pro et la COPIE du nom (K-4), la copie complétée sans jamais être remplacée (K-5),
    la fiche complétée seulement sous C-C3 (V-*, K-*) ;
  · le DOCUMENT (`quote-document.ts`) : le PDF imprime la copie de SA langue, jamais l'autre en repli (D-*) ;
  · le CLIENT d'API : les chemins littéraux (C-*) ;
  · l'écran PRO (`walkin-contact.ts`, `walkin-client.ts`, `walkin-journey.tsx`) : le contact d'abord, la recherche dans l'ordre (S-57), les noms d'une fiche
    trouvée préremplis et ceux d'une fiche liée imposés, la création seulement sans fiche, la conversion préremplie coupée au PREMIER espace (K-12), la
    boîte de langue qui demande le nom manquant (K-5) (E-*, W-*, J-*).
Usage, depuis la RACINE du monorepo :
    python3 neutralisation/neutralize-r41.py            # les cibles qui n'exigent PAS de base (unitaires) — les cibles d'intégration sont COMPTÉES « non jouées »
    python3 neutralisation/neutralize-r41.py --int      # + les cibles d'intégration : PostgreSQL réel, base recréée par `setup-global` à chaque mesure
    R41_DECOUVERTE=1 python3 neutralisation/neutralize-r41.py [--int]   # n'écrit AUCUN verdict : liste les tests qui rougissent, par cible
Codes de sortie : 0 = tout joué, tout a mordu ; 1 = au moins une garde MUETTE ; 2 = pré-vol rouge, ERREUR DE SCRIPT, vitest non attendu, calibration manquée, ou arbre non conforme.

⛔ UNE MORSURE SE LIT, ELLE NE SE DÉDUIT PAS D'UN CODE DE SORTIE (D304, D305, D312, D316) : la ligne « Tests » compte au moins un test en échec (exécutés = passés + en échec) ; le titre attendu porte « × » ;
la PREMIÈRE ligne de son bloc « FAIL … > titre » — en-têtes regroupés sautés — est une `AssertionError`. ⚠ Ce lot est de méthode NORMALE (avec la garde d'égalité stricte de M-4) ; la lecture fermée
y est gardée telle quelle : elle ne coûte rien, et un verdict qui ne serait pas une assertion n'est pas une morsure.
⛔ VITEST 3.2.7 : la lecture est calibrée sur SA sortie ; toute autre version ⇒ refus de juger.
⛔ LA MUTATION SE PROUVE POSÉE (D286) : ancre 1 → 0 ET marqueur n → n + 1 pour une SUBSTITUTION ; ancre 1 → 1 ET marqueur n → n + 1 pour une INSERTION. ⚠ Le remplacement d'une substitution
ne doit jamais être une SOUS-CHAÎNE de son ancre (D325).
⛔ UNE MUTATION ÉQUIVALENTE SE RETIRE PAR ÉCRIT, avec sa mesure, à la place de la cible retirée.
⛔ SURVIVRE À UN SIGNAL : sauvegarde sur DISQUE avant toute mutation, restaurée au démarrage suivant.
⛔ LES TITRES ATTENDUS SE RELÈVENT, ILS NE S'ÉCRIVENT PAS DE MÉMOIRE : `R41_DECOUVERTE=1` liste, par cible, ce qui rougit.
⛔ CE QUE CETTE CAMPAGNE NE MESURE PAS (écrit, pas tu) : (1) un VRAI navigateur — la recherche, la création, la conversion préremplie et la question du nom de bout en bout :
`e2e/specs/r41-fiche-client.e2e.ts` ; (2) la concurrence au-delà de ce que `pro-clients.int-spec.ts` et `quotes.int-spec.ts` jouent ; (3) ce que Ko voit (`docs/preuves/D336/scenarios-ko.md`).

POURQUOI IL EXISTE : CLAUDE.md, « une garde qui ne mord pas n'est pas une garde ». Lecteur, calibration et boucle : COPIÉS de `neutralize-r39.py` (calibré par D316 / D325 / D331 / D332 / D333) ;
seuls les noms, le jeu de cibles et le bilan changent.
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

SAUVEGARDE = ".neutralisation-r41"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")
JOURNAUX = os.path.join(".neutralisation-journaux", "r41")  # ignoré par git ; ce qu'une décision cite se COPIE (D291)
ANSI = re.compile(r"\x1b\[[0-9;]*m")
VITEST_ATTENDU = "v3.2.7"
DECOUVERTE = os.environ.get("R41_DECOUVERTE") == "1"
# `R41_FILTRE="P-,S-"` ne joue que les cibles dont l'identifiant commence par l'un de ces préfixes — POUR LA DÉCOUVERTE SEULEMENT : une campagne filtrée n'est pas une campagne verte.
FILTRE = [p for p in os.environ.get("R41_FILTRE", "").split(",") if p]


def _vitest(paquet: str, fichier: str) -> list[str]:
    return ["pnpm", "--filter", paquet, "exec", "vitest", "run", fichier]


def _vitest_int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    "types": _vitest("@zwadj/api", "src/common/client-record.spec.ts"),
    "politique": _vitest("@zwadj/api", "src/clients/pro-client-policy.spec.ts"),
    "fiches": _vitest("@zwadj/api", "src/clients/pro-clients.service.spec.ts"),
    "devis": _vitest("@zwadj/api", "src/venues/quotes.service.spec.ts"),
    "store-devis": _vitest("@zwadj/api", "src/venues/quote-store.prisma.spec.ts"),
    "doc": _vitest("@zwadj/api", "src/documents/quote-document.spec.ts"),
    "client-fiches": _vitest("@zwadj/api-client", "src/clients-client.test.ts"),
    "client-devis": _vitest("@zwadj/api-client", "src/quotes-client.test.ts"),
    "pro-fiche": _vitest("@zwadj/pro", "src/dashboard/walkin-client.test.ts"),
    "pro-contact": _vitest("@zwadj/pro", "src/dashboard/walkin-contact.test.ts"),
    "pro-parcours": _vitest("@zwadj/pro", "src/dashboard/walkin-journey.test.tsx"),
    # ── mesures d'INTÉGRATION (PostgreSQL réel, `--int`) : la base est recréée par `setup-global` à chaque lancement ; les migrations sont REJOUÉES depuis les fichiers.
    "int-fiches": _vitest_int("test/int/pro-clients.int-spec.ts"),
    "int-devis": _vitest_int("test/int/quotes.int-spec.ts"),
    "int-document": _vitest_int("test/int/quote-document.int-spec.ts"),
    "int-migration": _vitest_int("test/int/migration-non-empty.int-spec.ts"),
}
MESURES_INT = {"int-fiches", "int-devis", "int-document", "int-migration"}
AVEC_INT = "--int" in sys.argv

FICHE = "packages/types/src/client-record.ts"
CONTACT = "packages/types/src/contact.ts"
TYPES_DEVIS = "packages/types/src/quote.ts"
POLITIQUE = "apps/api/src/clients/pro-client-policy.ts"
SERVICE_FICHES = "apps/api/src/clients/pro-clients.service.ts"
MAGASIN_FICHES = "apps/api/src/clients/pro-client-store.prisma.ts"
MIGRATION = "apps/api/prisma/migrations/20261022120000_pro_client_records/migration.sql"
SERVICE_DEVIS = "apps/api/src/venues/quotes.service.ts"
MAGASIN_DEVIS = "apps/api/src/venues/quote-store.prisma.ts"
MODELE = "apps/api/src/documents/quote-document.ts"
CLIENT_FICHES = "packages/api-client/src/clients-client.ts"
CLIENT_DEVIS = "packages/api-client/src/quotes-client.ts"
ECRAN_CONTACT = "apps/pro/src/dashboard/walkin-contact.ts"
ECRAN_FICHE = "apps/pro/src/dashboard/walkin-client.ts"
PARCOURS = "apps/pro/src/dashboard/walkin-journey.tsx"

CIBLES: list[dict] = []


def cible(libelle: str, fichier: str, avant: str, apres: str, mesures: dict[str, str], genre: str = "substitution") -> None:
    """`mesures` : {nom de mesure → sous-chaîne du titre du test qui doit rougir}. Chaque mesure doit mordre.
    `genre` (D286 — chaque genre a SON arithmétique) : « substitution » = ancre 1→0 ET marqueur n→n+1 ; « insertion » = le remplacement CONTIENT l'ancre, qui doit
    donc SURVIVRE (1→1) tandis que le marqueur passe de n à n+1."""
    CIBLES.append({"libelle": libelle, "fichier": fichier, "avant": avant, "apres": apres, "mesures": mesures, "genre": genre})


A_DECOUVRIR = "?"

# ── T — le CONTRAT de la fiche et du devis (`@zwadj/types`).
cible("T-1. ⛔ la recherche accepte un numéro ET un e-mail ensemble (« exactement l'un » saute)", FICHE,
      "if ((corps.phone === undefined) === (corps.email === undefined)) {", "if (corps.phone === undefined && corps.email === undefined && corps.email !== null) {",
      {"types": "les deux, aucun, une clé inconnue : REFUSÉS"})
cible("T-2. ⛔ la création accepte une fiche SANS identifiant", FICHE,
      'if (corps.phone === undefined && corps.email === undefined) {\n      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "clientRecord.validation.identifierRequired" });',
      'if (false) {\n      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["phone"], message: "clientRecord.validation.identifierRequired" });',
      {"types": "sans identifiant : refusé"})
cible("T-3. ⛔ la création accepte une fiche SANS nom", FICHE,
      '      ctx.addIssue({ code: z.ZodIssueCode.custom, path: ["nameLatin"], message: "clientRecord.validation.nameRequired" });\n    }\n  });\nexport type ClientRecordCreateInput',
      "      void ctx;\n    }\n  });\nexport type ClientRecordCreateInput",
      {"types": "sans aucun nom : refusé"})
cible("T-4. ⛔ l'e-mail d'une fiche n'est plus NORMALISÉ avant d'être validé", FICHE,
      ".transform(normalizeContactEmail)", ".transform((brut: string) => brut)", {"types": "un e-mail : rendu NORMALISÉ par `normalizeContactEmail`"})
cible("T-5. ⛔ la modification accepte un corps VIDE", FICHE,
      "if (corps.phone === undefined && corps.email === undefined && corps.nameAr === undefined && corps.nameLatin === undefined) {", "if (false) {",
      {"types": "K-3b : au moins un champ"})
cible("T-6. ⛔ la normalisation de l'e-mail oublie NFKC (la pleine chasse reste une AUTRE adresse)", CONTACT,
      'return raw.trim().normalize("NFKC").toLowerCase();', "return raw.trim().toLowerCase();", {"types": "ramène la PLEINE CHASSE aux caractères ordi"})
cible("T-7. ⛔ la correspondance langue ↔ copie du nom est INVERSÉE (le PDF français lirait la copie arabe)", TYPES_DEVIS,
      '{ fr: "clientNameLatin", ar: "clientNameAr" }', '{ fr: "clientNameAr", ar: "clientNameLatin" }',
      {"doc": "le client s'imprime par la COPIE du nom du devis, celle de la LANGUE DU DOCUMENT", "pro-fiche": "interface française : la copie latine ; interface arabe"})
cible("T-8. ⛔ un devis accepte des noms SANS fiche", TYPES_DEVIS,
      "if (corps.clientRecordId === undefined && avecNom) {", "if (false && avecNom) {", {"types": "MD-15 — des noms SANS fiche : refusé"})

# ── P — la POLITIQUE (module pur).
cible("P-1. ⛔ le SECOND numéro du pro n'est plus reconnu comme le sien", POLITIQUE,
      "(telephone === telephoneCanonique(pro.phone) || telephone === telephoneCanonique(pro.phone2))", "(telephone === telephoneCanonique(pro.phone))",
      {"politique": "reconnaît chacun des trois, sous toute forme norma"})
cible("P-2. ⛔ l'e-mail du compte du pro n'est plus reconnu comme le sien", POLITIQUE,
      "return email !== null && email === emailNormalise(pro.email);", "return email !== null && email === emailNormalise(null);", {"politique": "un seul des deux identifiants suffit à refuser"})
cible("P-3. ⛔ deux fiches DIFFÉRENTES (le numéro, l'e-mail) ne sont plus un conflit : la première est rendue", POLITIQUE,
      'if (parTelephone !== null && parEmail !== null && parTelephone.id !== parEmail.id) return { kind: "conflit" };', 'if (false) return { kind: "conflit" };',
      {"politique": "ils désignent DEUX fiches différentes : conflit"})
cible("P-4. ⛔ une fiche LIÉE accepte un AUTRE nom sur le devis", POLITIQUE,
      'if (differe) return { ok: false, raison: "ficheLiee" };', 'if (false) return { ok: false, raison: "ficheLiee" };', {"politique": "fiche LIÉE : un nom DIFFÉRENT — ou ajouté là où la fiche n'en a pas — est refusé"})
cible("P-5. ⛔ C-C3 saute : la boîte de langue complète la fiche même quand le nom de l'autre écriture DIFFÈRE", POLITIQUE,
      "return autre.surLeDevis !== null && autre.surLeDevis === autre.surLaFiche;", "return autre.surLeDevis !== undefined;", {"politique": "branche 2 — l'autre écriture DIF"})
cible("P-6. ⛔ C-C3 complète une fiche LIÉE", POLITIQUE,
      "if (!peutModifier(fiche)) return false;", "if (false) return false;", {"politique": "une fiche LIÉE : jamais complété"})
cible("P-7. ⛔ C-C3 remplace un nom DÉJÀ sur la fiche", POLITIQUE,
      "if (fiche[champ] !== null) return false;", "if (false) return false;", {"politique": "la fiche a DÉJÀ un nom dans cett"})
cible("P-8. ⛔ une fiche liée redevient modifiable (`peutModifier` toujours vrai)", POLITIQUE,
      "return fiche.linkedUserId === null;", "return fiche.linkedUserId !== undefined;", {"politique": "non liée : modifiable ; liée : non", "fiches": "une fiche trouvée : `{ found: true, record }` ; la fiche expose"})

# ── S — le SERVICE des fiches, et la GARDE DE SOURCE de M-4 (MD-10).
cible("S-1. ⛔ M-4 — la recherche lit le CONTACT du pro (donc le compte) avant de chercher", SERVICE_FICHES,
      "    const fiche = await this.fiches.rechercher(userId, critere);",
      "    await this.fiches.contactDuPro(userId);\n    const fiche = await this.fiches.rechercher(userId, critere);",
      {"fiches": "M-4 — la recherche n'appelle QUE `rechercher`", "fiches#2": "le service : `lookup` ne touche le port que par `rechercher`"}, genre="insertion")
cible("S-2. ⛔ la création ne refuse plus le contact du pro", SERVICE_FICHES,
      "    if (estContactDuPro(input, pro)) this.throwProContact();\n    const resultat = await this.fiches.creerSiAbsente(",
      "    void estContactDuPro;\n    const resultat = await this.fiches.creerSiAbsente(", {"fiches": "MD-4 — le numéro, le second numéro ou l'e-mail du pro : 400 CLIENT_IS_PRO_CONT"})
cible("S-3. ⛔ la modification ne refuse plus le contact du pro", SERVICE_FICHES,
      "      if (estContactDuPro(input, pro)) this.throwProContact();\n    }", "      void pro;\n    }", {"fiches": "MD-4 — le contact du pro : 400 CLIENT_IS_PRO_CONTACT, et le port n'écrit RIEN"})
cible("S-4. ⛔ un conflit (deux fiches) se résout en rendant celle du NUMÉRO — une fusion silencieuse", SERVICE_FICHES,
      "const decision = decisionCreation(resultat.parTelephone, resultat.parEmail);", "const decision = decisionCreation(resultat.parTelephone, null);",
      {"fiches": "MD-2 — le numéro et l'e-mail sur DEUX fiches : 409 CLIENT_RECORD_IDENTIFIERS_C"})
cible("S-5. ⛔ S-53 — la fiche rendue expose l'identifiant du COMPTE lié", SERVICE_FICHES,
      "    linked: !peutModifier(fiche),", "    linked: !peutModifier(fiche),\n    linkedUserId: fiche.linkedUserId,", {"fiches": "une fiche trouvée : `{ found: true, record }` ; la fiche expose"}, genre="insertion")
cible("S-6. ⛔ le complément d'une fiche LIÉE se dit « nom déjà là » au lieu de « fiche liée »", SERVICE_FICHES,
      "if (!peutModifier(resultat.actuelle)) this.throwLinked();", "if (resultat.actuelle === undefined) this.throwLinked();", {"fiches": "MD-6 — refus, fiche LIÉE : 409 CLIENT_RECORD_LINKED"})

# ── A — l'ADAPTATEUR des fiches.
cible("A-1. ⛔ MD-10 — la recherche TRAVERSE le compte (`user`) : même réponse, mais le compte est lu — seule la garde de source le voit", MAGASIN_FICHES,
      'where: { proProfile: { userId }, ...("phone" in critere ? { phone: critere.phone } : { email: critere.email }) },',
      'where: { proProfile: { userId, user: { id: userId } }, ...("phone" in critere ? { phone: critere.phone } : { email: critere.email }) },',
      {"fiches": "l'adaptateur : `rechercher` lit `proClientRecord` SEUL"})
cible("A-2. ⛔ la recherche ne filtre plus par le PRO : la fiche d'un autre pro est trouvée", MAGASIN_FICHES,
      'where: { proProfile: { userId }, ...("phone" in critere', 'where: { ...("phone" in critere', {"int-fiches": "MD-11 — la fiche d'un AUTRE pro n'est pas trouvée"})
cible("A-3. ⛔ MD-1 — l'insertion ne fait plus « rien sur conflit » : un doublon lève", MAGASIN_FICHES,
      "      ON CONFLICT DO NOTHING\n", "      -- (aucun conflit géré)\n", {"int-fiches": "MD-1 — DIX créations SIMULTANÉES du même numéro"})
cible("A-4. ⛔ MD-6 — le complément d'un nom écrit sur une fiche LIÉE", MAGASIN_FICHES,
      "        linkedUserId: null,\n        ...(noms.nameAr !== undefined ? { nameAr: null } : {}),", "        linkedUserId: undefined,\n        ...(noms.nameAr !== undefined ? { nameAr: null } : {}),",
      {"int-fiches": "MD-6 — une fiche LIÉE ne se complète pas : 409 CLIENT_RECORD_LINKED"})
cible("A-5. ⛔ MD-7 — le complément REMPLACE un nom présent (le compare-and-set sur NULL saute)", MAGASIN_FICHES,
      "        ...(noms.nameAr !== undefined ? { nameAr: null } : {}),\n        ...(noms.nameLatin !== undefined ? { nameLatin: null } : {})\n      },", "        ...{}\n      },",
      {"int-fiches": "MD-7 — un nom PRÉSENT n'est jamais remplacé"})
cible("A-6. ⛔ MD-6 — la modification écrit une fiche LIÉE", MAGASIN_FICHES,
      'if (actuelle.linkedUserId !== null) return { ok: false, raison: "absenteOuLiee", actuelle };', 'if (actuelle.id === "") return { ok: false, raison: "absenteOuLiee", actuelle };',
      {"int-fiches": "MD-6 — une fiche LIÉE n'est pas modifiable (champs grisés)"})

# ── M — la MIGRATION, REJOUÉE depuis son fichier (`--int`).
cible("M-1. ⛔ l'unicité (pro, numéro) n'est plus UNIQUE", MIGRATION,
      'CREATE UNIQUE INDEX "pro_client_records_pro_phone_unique"', 'CREATE INDEX "pro_client_records_pro_phone_unique"', {"int-fiches": "MD-1 — DIX créations SIMULTANÉES du même numéro"})
cible("M-2. ⛔ l'unicité (pro, e-mail) n'est plus UNIQUE", MIGRATION,
      'CREATE UNIQUE INDEX "pro_client_records_pro_email_unique"', 'CREATE INDEX "pro_client_records_pro_email_unique"', {"int-fiches": "MD-1 — dix créations SIMULTANÉES du même e-mail"})
cible("M-3. ⛔ une fiche SANS identifiant passe la base", MIGRATION,
      'CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL)', 'CHECK ("phone" IS NOT NULL OR "email" IS NOT NULL OR TRUE)', {"int-fiches": "les CHECK : un identifiant au moins, un nom au moins"})
cible("M-4. ⛔ une fiche SANS nom passe la base", MIGRATION,
      'CHECK ("name_ar" IS NOT NULL OR "name_latin" IS NOT NULL)', 'CHECK ("name_ar" IS NOT NULL OR "name_latin" IS NOT NULL OR TRUE)', {"int-fiches": "les CHECK : un identifiant au moins, un nom au moins"})
cible("M-5. ⛔ S-50 — un numéro qui n'est pas un mobile algérien canonique passe la base", MIGRATION,
      "\"phone\" ~ '^\\+213[567][0-9]{8}$'", "\"phone\" ~ '^\\+?[0-9]+$'", {"int-fiches": "MD-14 — la base REFUSE une écriture non canonique, même hors de l'API"})
cible("M-6. ⛔ R8 — supprimer une fiche SUPPRIME ses devis (au lieu de laisser tomber le lien)", MIGRATION,
      'REFERENCES "pro_client_records"("id") ON DELETE SET NULL ON UPDATE CASCADE;', 'REFERENCES "pro_client_records"("id") ON DELETE CASCADE ON UPDATE CASCADE;',
      {"int-migration": "les garanties que la migration pose (D186)"})

# ── V et K — le DEVIS : la fiche du pro et la copie du nom (K-4), son complément (K-5).
cible("V-1. ⛔ K-4 — la fiche d'un AUTRE pro est ignorée en silence au lieu d'un 404", SERVICE_DEVIS,
      'throw new NotFoundException({ code: ClientRecordErrorCode.CLIENT_RECORD_NOT_FOUND, message: "clientRecord.errors.notFound" });',
      "return { clientRecordId: null, clientNameAr: null, clientNameLatin: null };", {"devis": "MD-11 — la fiche d'un AUTRE pro (le port rend", "devis#2": "la RÉVISION applique la même règle : la fiche d'"})
cible("V-2. ⛔ K-4 — le devis ne porte plus la fiche ni la copie", SERVICE_DEVIS,
      "      ...copie,\n      slotTemplateId: slot.id,", "      clientRecordId: null,\n      slotTemplateId: slot.id,", {"int-devis": "le devis porte la fiche et la copie du nom TELLE QUE SAISIE pour ce devis"})
cible("V-3. ⛔ K-5 — la boîte de langue complète la copie de l'AUTRE langue", SERVICE_DEVIS,
      "const champ = QUOTE_CLIENT_NAME_FIELD[input.locale];", 'const champ = QUOTE_CLIENT_NAME_FIELD[input.locale === "ar" ? "fr" : "ar"];', {"devis": "la langue choisit la copie par l'AUTORITÉ (`QUOTE_CLIENT_NAME_FIELD`"})
cible("V-4. ⛔ C-C3 — la fiche est complétée dans l'AUTRE écriture", SERVICE_DEVIS,
      'const champDeLaFiche = champ === "clientNameAr" ? "nameAr" : "nameLatin";', 'const champDeLaFiche = champ === "clientNameAr" ? "nameLatin" : "nameAr";',
      {"devis": "MD-8 — la décision de compléter AUSSI la fiche est la politique C-"})
cible("K-1. ⛔ MD-7 — K-5 REMPLACE une copie présente (le compare-and-set sur NULL saute)", MAGASIN_DEVIS,
      "where: { id: args.quoteId, ...(enArabe ? { clientNameAr: null } : { clientNameLatin: null }), venue:", "where: { id: args.quoteId, venue:",
      {"store-devis": "MD-7 — le compare-and-set est dans le WHERE de l'UPDATE", "int-devis": "MD-7 — deux compléments SIMULTANÉS de la même langue"})
cible("K-2. ⛔ MD-8 — la décision C-C3 est ignorée : la fiche se complète toujours", MAGASIN_DEVIS,
      "if (args.completerLaFiche(fiche, { ar: devis.clientNameAr, latin: devis.clientNameLatin })) {", "if (fiche.id !== \"\") {",
      {"store-devis": "MD-8 — un devis AVEC fiche : la fiche est VERROUILLÉE", "int-devis": "MD-8 (C-C3), branche 2 — il DIFFÈRE"})
cible("K-3. ⛔ l'écriture de la fiche ne re-pose plus ses conditions (nom absent, fiche non liée)", MAGASIN_DEVIS,
      "where: { id: fiche.id, ...(enArabe ? { nameAr: null } : { nameLatin: null }), linkedUserId: null },", "where: { id: fiche.id },",
      {"store-devis": "MD-8 — un devis AVEC fiche : la fiche est VERROUILLÉE", "store-devis#2": "le champ LATIN s'écrit de la même façon"})
cible("K-4. ⛔ K-4 — la fiche du devis se lit sans la PROPRIÉTÉ du pro", MAGASIN_DEVIS,
      "where: { id: recordId, proProfile: { userId } },", "where: { id: recordId },", {"int-devis": "MD-11 — la fiche d'un AUTRE pro : 404 CLIENT_RECORD_NOT_FOUND"})

# ── D — le DOCUMENT.
cible("D-1. ⛔ S-52 — le PDF arabe imprime la copie LATINE", MODELE,
      "const copie = record[QUOTE_CLIENT_NAME_FIELD[locale]];", "const copie = record.clientNameLatin;", {"doc": "le client s'imprime par la COPIE du nom du devis, celle de la LANGUE DU DOCUMENT"})
cible("D-2. ⛔ S-52 — la copie absente se remplace par l'AUTRE écriture (le repli interdit)", MODELE,
      'const client = copie === null || copie.trim() === "" ? "—" : copie;', 'const client = copie ?? record.clientNameLatin ?? record.clientNameAr ?? "—";',
      {"doc": "une copie ABSENTE dans la langue du document s'imprime « — », jamais l'AUTRE écriture en repli"})

# ── C — le CLIENT d'API : les chemins littéraux (D182).
cible("C-1. la recherche part sur un AUTRE chemin", CLIENT_FICHES, '"/pro/clients/lookup"', '"/pro/client/lookup"', {"client-fiches": "K-1 : `lookup` POSTE l'identifiant tel quel sur `/pro/clients/lookup`"})
cible("C-2. le complément du nom part sur un AUTRE chemin", CLIENT_DEVIS,
      "`/quotes/${encodeURIComponent(quoteId)}/client-name`", "`/quotes/${encodeURIComponent(quoteId)}/clientname`", {"client-devis": "POSTE la langue et le nom sur `/quotes/:id/client-name`"})

# ── W — les règles du CONTACT et des NOMS de l'écran (`walkin-contact.ts`, module pur).
cible("W-8. ⛔ l'étape Contact passe SANS identifiant", ECRAN_CONTACT,
      'if (identifiant.phone === "" && identifiant.email.trim() === "") return ["needIdentifier"];', 'if (identifiant.phone === "\\u0000") return ["needIdentifier"];',
      {"pro-contact": "rien de tapé : « un numéro ou un e-mail est obli"})
cible("W-9. ⛔ un e-mail SAISI et refusé ne retient plus l'étape Contact", ECRAN_CONTACT,
      'if (identifiant.email.trim() !== "" && !isValidContactEmail(identifiant.email)) out.push("needEmailValid");', 'if (identifiant.email === "\\u0000") out.push("needEmailValid");',
      {"pro-contact": "un identifiant SAISI et invalide retient, même"})
cible("W-10. ⛔ l'étape Client passe SANS nom", ECRAN_CONTACT,
      'if (ar === "" && latin === "") out.push("needName");', 'if (ar === "\\u0000") out.push("needName");', {"pro-contact": "tout manque : les raisons s'énumèrent TOUTE", "pro-parcours": "tout est vide : la liste nomme CHAQUE manque de l'étape"})
cible("W-11. ⛔ un nom arabe SAISI et refusé ne retient plus l'étape Client", ECRAN_CONTACT,
      'if (ar !== "" && !isValidPersonName(ar)) out.push("needNameArValid");', 'if (ar === "\\u0000") out.push("needNameArValid");', {"pro-contact": "un nom SAISI et refusé par la règle du cont"})
cible("W-12. ⛔ un e-mail VIDE part à la création de la fiche (la clé n'est plus omise)", ECRAN_CONTACT,
      '...(email === "" ? {} : { email })', "email: identifiant.email.trim()", {"pro-contact": "`identifierPayload` : le numéro au format du con"})

# ── E — la FICHE et le NOM de l'écran (`walkin-client.ts`, module pur).
cible("E-1. ⛔ MD-9 — le nom se coupe au DERNIER espace", ECRAN_FICHE,
      'const espace = propre.indexOf(" ");', 'const espace = propre.lastIndexOf(" ");', {"pro-fiche": "un prénom COMPOSÉ tom", "pro-parcours": "MD-9 — la conversion est PRÉREMP"})
cible("E-2. ⛔ MD-9 — sans espace, tout va au PRÉNOM (un prénom inventé)", ECRAN_FICHE,
      'if (espace === -1) return { firstName: "", lastName: propre };', 'if (espace === -1) return { firstName: propre, lastName: "" };',
      {"pro-fiche": "SANS espace : tout va d", "pro-parcours": "MD-9 — une copie SANS espace : tou"})
cible("E-3. ⛔ la conversion prend toujours la copie LATINE, quelle que soit la langue de l'interface", ECRAN_FICHE,
      "return present(copie[QUOTE_CLIENT_NAME_FIELD[langue]]) ?? present(copie[QUOTE_CLIENT_NAME_FIELD[autre]]);",
      "return present(copie.clientNameLatin) ?? present(copie.clientNameAr);", {"pro-fiche": "interface française : la copie latine ; interface arabe", "pro-parcours": "MD-9 — interface en ARABE : la cop"})
cible("E-4. ⛔ K-12 — le numéro de la conversion ignore la FICHE", ECRAN_FICHE,
      'phone: telephoneDeLaFiche !== "" ? telephoneDeLaFiche : saisie.phone,', "phone: saisie.phone,", {"pro-fiche": "prénom et nom découpés de la copie ; n"})
cible("E-5. ⛔ K-12 — l'e-mail de la conversion ignore la FICHE", ECRAN_FICHE,
      "email: fiche?.email ?? saisie.email.trim()", "email: saisie.email.trim()", {"pro-fiche": "prénom et nom découpés de la copie ; n"})
cible("E-6. ⛔ S-57 — la recherche commence par l'E-MAIL", ECRAN_FICHE,
      "  if (isPhoneComplete(country, identifiant.phone)) ordre.push({ phone: toE164(country, identifiant.phone) });\n"
      "  const email = identifiant.email.trim();\n  if (email !== \"\" && isValidContactEmail(email)) ordre.push({ email });",
      "  const email = identifiant.email.trim();\n  if (email !== \"\" && isValidContactEmail(email)) ordre.push({ email });\n"
      "  if (isPhoneComplete(country, identifiant.phone)) ordre.push({ phone: toE164(country, identifiant.phone) });",
      {"pro-fiche": "S-57 — `ordreDeRecherche` : d'abord le NUMÉRO, puis l'E-MAIL", "pro-parcours": "S-57 — la recherche porte d'abor"})
cible("E-7. ⛔ K-5 — la copie manquante n'est plus vue : la boîte ne demande jamais le nom", ECRAN_FICHE,
      "return present(devis[QUOTE_CLIENT_NAME_FIELD[locale]]) === null;", "return present(devis[QUOTE_CLIENT_NAME_FIELD[locale]]) === undefined;",
      {"pro-fiche": "`nomManquant` — la copie de la langue DU DOCUMENT manque-t-elle ?", "pro-parcours": "K-5 — la boîte de langue DEMANDE"})
cible("E-8. les noms du devis ne sont plus rognés", ECRAN_FICHE,
      "  const ar = noms.ar.trim();\n  const latin = noms.latin.trim();\n  return { clientRecordId: ficheId,",
      "  const ar = noms.ar;\n  const latin = noms.latin;\n  return { clientRecordId: ficheId,", {"pro-fiche": "`copiePourDevis` — la fiche et les noms NON VIDES, rognés"})
cible("E-9. ⛔ K-2 — un nom VIDE part à la création de la fiche", ECRAN_FICHE,
      'return { ...(ar === "" ? {} : { nameAr: ar }), ...(latin === "" ? {} : { nameLatin: latin }) };', "return { nameAr: ar, nameLatin: latin };",
      {"pro-parcours": "une fiche ABSENTE se CRÉE (K-2) au"})

# ── J — le PARCOURS (`walkin-journey.tsx`).
cible("J-1. ⛔ MD-6 — les noms d'une fiche LIÉE ne sont plus grisés", PARCOURS,
      "const nomsVerrouilles = fiche !== null && fiche.linked;", "const nomsVerrouilles = fiche === undefined;", {"pro-parcours": "MD-6 — une fiche LIÉE : les deux"})
cible("J-2. ⛔ MD-6 — le devis d'une fiche LIÉE porte les noms TAPÉS au lieu des siens", PARCOURS,
      "const nomsEffectifs: Noms = fiche !== null && fiche.linked ? nomsDeLaFiche(fiche) : noms;", "const nomsEffectifs: Noms = noms;", {"pro-parcours": "MD-6 — une fiche LIÉE RENDUE par"})
cible("J-3. ⛔ MD-17 — une fiche TROUVÉE est créée de nouveau au « Continuer » de l'étape Client", PARCOURS,
      "    if (fiche !== null) {\n      goTo(firstUnanswered({ ...answered, client: true }));", "    if (fiche === undefined) {\n      goTo(firstUnanswered({ ...answered, client: true }));",
      {"pro-parcours": "une fiche TROUVÉE PRÉREMPLIT les n"})
cible("J-4. ⛔ S-57 — la recherche continue après la première fiche trouvée", PARCOURS,
      "          trouvee = reponse.record;\n          break;", "          trouvee = reponse.record;\n          continue;", {"pro-parcours": "S-57 — la recherche porte d'abor"})
cible("J-5. ⛔ K-12 — les retouches du pro à la conversion sont ignorées (l'envoi porte le préremplissage)", PARCOURS,
      "saisie: identifiant, langue }), ...retouches };", "saisie: identifiant, langue }) };", {"pro-parcours": "MD-9 — la conversion est PRÉREMP"})
cible("J-6. ⛔ K-4 — le devis part sans la fiche ni la copie des noms", PARCOURS,
      "...(fiche === null ? {} : copiePourDevis(nomsEffectifs, fiche.id))", "...(fiche === null ? {} : {})", {"pro-parcours": "une fiche ABSENTE se CRÉE (K-2) au"})
cible("J-7. ⛔ K-5 — le choix de la langue remet tout de suite, même sans la copie du nom de cette langue", PARCOURS,
      "    if (nomManquant(quote, documentLocale)) {\n      setNomDe({ canal, locale: documentLocale });", "    if (quote.id === \"\") {\n      setNomDe({ canal, locale: documentLocale });",
      {"pro-parcours": "K-5 — la boîte de langue DEMANDE"})
cible("J-8. ⛔ K-5 — la réponse à la question du nom ne complète RIEN sur le devis", PARCOURS,
      "complete = await quotes.completeClientName(devis.id, { locale: attente.locale, name: nom });", "complete = devis;", {"pro-parcours": "K-5 — la boîte de langue DEMANDE"})
cible("J-9. un AUTRE numéro garde les noms de l'ancienne fiche", PARCOURS,
      "else if (ficheTrouvee) setNoms(NO_NOMS);", "else if (ficheTrouvee) setNoms(noms);", {"pro-parcours": "un AUTRE numéro après une fiche tr"})


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
        print("✗ R41_FILTRE n'est admis qu'avec R41_DECOUVERTE=1 : une campagne filtrée n'est pas une campagne verte, aucun verdict n'est rendu.")
        return 2
    toutes = _jouees()
    sans_titre = [c["libelle"].split(".")[0] for c in toutes for t in c["mesures"].values() if t == A_DECOUVRIR]
    if sans_titre and not DECOUVERTE:
        print(f"✗ TITRE NON RELEVÉ pour {len(sans_titre)} mesure(s) ({', '.join(sorted(set(sans_titre)))}) : relever par R41_DECOUVERTE=1, puis écrire le titre — aucun verdict n'est rendu sur « ? ».")
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
