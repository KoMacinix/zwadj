"""D334 — SESSION ADVERSE de L35-3 · SONDE 5 : les gardes NEUVES neutralisées par les mutations PROPRES de la session adverse (aucune cible de `neutralize-r39.py` reprise ni consultée).

Chaque mutation est une substitution EXACTE dans un fichier du dépôt : l'ancre est comptée AVANT (exactement le nombre attendu, sinon ARRÊT — un remplacement fantôme ne prouve rien, D286), le fichier est écrit,
les suites sont jouées, le fichier est RESTAURÉ dans un `finally` et son empreinte relue (identique à l'octet, sinon ARRÊT). Un signal qui tue le processus laisserait un fichier cassé : l'empreinte d'origine est
écrite dans `.sauvegarde-adverse/` AVANT la mutation et rétablie au démarrage si elle y est (D286).

LECTURE DES ÉCHECS (écrite ici ; D304/D316) : la sortie de vitest est lue SANS les codes ANSI ; un groupe d'en-têtes `FAIL <fichier> > <titre>` consécutifs est suivi d'UNE erreur ; la MORSURE est une
`AssertionError` (assertion native de vitest) — `TypeError`, `Error`, `TimeoutError`, un échec de collecte ne sont PAS des morsures et sont rapportés comme tels. « MUETTE » = des tests ont tourné (passés > 0)
et aucun n'a échoué. « NON DÉMARRÉE » = rien n'a tourné. Un code de sortie non nul seul ne prouve rien.

ÉTALONNAGE (deux bras, abandon si manqué) : CAL+ (une mutation qui DOIT mordre : le décalage d'Alger à zéro) et CAL− (une mutation NEUTRE : un mot d'un commentaire) — la seconde doit rendre « MUETTE » partout.

USAGE (racine) : python3 docs/preuves/D334/session-adverse/adverse_mutations.py [--a-blanc] [--seulement ID,ID]
  --a-blanc : ne vérifie QUE les ancres (compte attendu) — aucun fichier n'est écrit, aucune suite n'est jouée.
"""
import hashlib
import os
import re
import shutil
import subprocess
import sys
import time

sys.stdout.reconfigure(encoding="utf-8", newline="\n")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

NPX = shutil.which("npx") or "npx"
SAUVEGARDE = ".sauvegarde-adverse"
ANSI = re.compile(r"\x1b\[[0-9;]*m")

STORE = "apps/api/src/venues/quote-store.prisma.ts"
SERVICE = "apps/api/src/venues/quotes.service.ts"
REFMOD = "apps/api/src/venues/quote-reference.ts"
TYPES = "packages/types/src/quote.ts"
DOCSRC = "apps/api/src/documents/quote-document-source.prisma.ts"
DOCSVC = "apps/api/src/documents/quote-document.service.ts"
DOCMOD = "apps/api/src/documents/quote-document.ts"
MA = "apps/api/prisma/migrations/20261015100000_venue_number/migration.sql"
MB = "apps/api/prisma/migrations/20261015100100_quote_reference/migration.sql"
WJ = "apps/pro/src/dashboard/walkin-journey.tsx"
RM = "apps/pro/src/dashboard/remittance.ts"
ARJSON = "packages/i18n/messages/ar.json"

SUITES = {
    "int": ("apps/api", [NPX, "vitest", "run", "-c", "vitest.config.int.ts", "quote-numbering", "migration-non-empty", "adverse-numerotation", "quotes.int-spec"]),
    "unit-api": ("apps/api", [NPX, "vitest", "run", "src/venues/quote-store.prisma.spec.ts", "src/venues/quotes.service.spec.ts", "src/venues/quote-reference.spec.ts", "src/common/quote-reference.spec.ts", "src/documents"]),
    "pro": ("apps/pro", [NPX, "vitest", "run", "src/dashboard/walkin-journey.test.tsx", "src/dashboard/remittance.test.ts", "src/venues/quotes-section.test.tsx"]),
    "sondes": (".", [sys.executable, "docs/preuves/D334/session-adverse/adverse_migration.py"]),
    "sondes-base": (".", [sys.executable, "docs/preuves/D334/session-adverse/adverse_base.py"]),
}


def M(ident, garde, fichier, ancre, remplacement, suites, nb=1, note="", fois=1):
    return dict(id=ident, garde=garde, fichier=fichier, ancre=ancre, remplacement=remplacement, suites=suites, nb=nb, note=note, fois=fois)


MUTATIONS = [
    # ── étalonnage ──
    M("CAL+", "étalonnage positif", REFMOD, "const DECALAGE_ALGER_MS = 60 * 60 * 1000;", "const DECALAGE_ALGER_MS = 0;", ["unit-api", "int"], note="DOIT mordre"),
    M("CAL-", "étalonnage négatif", REFMOD, "// L'ANNÉE D'UNE RÉFÉRENCE DE DEVIS", "// L ANNÉE D UNE RÉFÉRENCE DE DEVIS", ["unit-api", "int"], note="DOIT rester muette (un mot de commentaire)"),
    # ── F-3 l'année d'Alger ──
    M("R-1", "F-3 année d'Alger", REFMOD, "new Date(ms + DECALAGE_ALGER_MS).getUTCFullYear()", "new Date(ms + DECALAGE_ALGER_MS).getFullYear()", ["unit-api", "int"], note="année de l'HÔTE (Toronto sur ce poste)"),
    M("R-2", "F-3 année d'Alger", REFMOD, "const DECALAGE_ALGER_MS = 60 * 60 * 1000;", "const DECALAGE_ALGER_MS = 2 * 60 * 60 * 1000;", ["unit-api", "int"], note="UTC + 2 : une heure trop tôt"),
    M("R-3", "F-3 année d'Alger", REFMOD, "const DECALAGE_ALGER_MS = 60 * 60 * 1000;", "const DECALAGE_ALGER_MS = -60 * 60 * 1000;", ["unit-api", "int"], note="UTC − 1"),
    M("S-1", "F-3 l'horloge du service", SERVICE, "annee: algiersYear(maintenant)", "annee: maintenant.getUTCFullYear()", ["unit-api", "int"], note="l'année UTC au lieu de l'année d'Alger"),
    M("S-2", "S-21 un seul instant", SERVICE, "creeLe: maintenant }", "creeLe: new Date() }", ["unit-api", "int"], note="deuxième lecture de l'horloge"),
    # ── F-1 le compteur ──
    M("Q-1", "F-1 compteur atomique", STORE, "DO UPDATE SET last_number = quote_number_counters.last_number + 1", "DO UPDATE SET last_number = quote_number_counters.last_number", ["int", "unit-api"], note="le compteur n'avance plus"),
    M("Q-2", "F-7 compteur DANS la transaction", STORE, "const numero = await this.incrementerCompteur(tx, venueId, reference.annee);", "const numero = await this.incrementerCompteur(this.prisma as unknown as Prisma.TransactionClient, venueId, reference.annee);", ["int", "unit-api"], note="l'incrément hors transaction"),
    M("Q-3", "F-1 jamais « le plus grand + 1 »", STORE, "const lignes = await tx.$queryRaw<{ last_number: number }[]>`\n      INSERT INTO quote_number_counters (venue_id, year, last_number)\n      VALUES (${venueId}::uuid, ${annee}::smallint, 1)\n      ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1\n      RETURNING last_number`;", "const lignes = await tx.$queryRaw<{ last_number: number }[]>`\n      SELECT coalesce(max(reference_number), 0) + 1 AS last_number FROM quotes WHERE venue_id = ${venueId}::uuid AND reference_year = ${annee}::smallint AND version = 1`;", ["int"], note="« lire le plus grand puis ajouter 1 », sans verrou", fois=2),
    M("Q-4", "F-1 l'upsert", STORE, "ON CONFLICT (venue_id, year) DO UPDATE SET", "ON CONFLICT (venue_id, year) DO NOTHING; -- ", ["int", "unit-api"], note="plus de DO UPDATE (la 2ᵉ création ne rend rien)"),
    M("Q-5", "S-21 l'instant de création", STORE, "createdAt: reference.creeLe", "createdAt: undefined", ["int", "unit-api"], note="created_at = l'horloge de la base, pas celle du service"),
    # ── F-4 la révision ──
    M("Q-6", "F-4 la révision garde l'année", STORE, "referenceYear: tete.referenceYear,", "referenceYear: new Date().getUTCFullYear(),", ["int", "unit-api"], note="la révision écrit l'année de l'horloge"),
    M("Q-7", "F-4 la révision garde le numéro", STORE, "referenceNumber: tete.referenceNumber,", "referenceNumber: 1,", ["int", "unit-api"], note="la révision écrit toujours 1"),
    M("Q-8", "F-2 le verrou de chaîne", STORE, "FROM quotes WHERE id = ${chainId}::uuid FOR UPDATE`", "FROM quotes WHERE id = ${chainId}::uuid`", ["int", "unit-api"], note="la tête n'est plus verrouillée (course sur max(version))", fois=3),
    M("Q-9", "S-22 la tête naît avec chain_id = id", STORE, "chainId: id,\n          version: 1,", "chainId: \"00000000-0000-0000-0000-000000000000\",\n          version: 1,", ["int", "unit-api"], note="l'ancienne écriture « chain_id provisoire »"),
    # ── F-10 / F-11 la formule et le fichier ──
    M("T-1", "F-11 quatre chiffres", TYPES, 'String(n).padStart(4, "0")', 'String(n).padStart(3, "0")', ["unit-api", "int"], note=""),
    M("T-2", "F-11 refuser ≤ 0", TYPES, "valeur < 1", "valeur < 0", ["unit-api", "int"], note="0 devient un numéro"),
    M("T-3", "F-11 l'année hors plage", TYPES, "if (year < QUOTE_REFERENCE_YEAR_MIN || year > QUOTE_REFERENCE_YEAR_MAX) {", "if (false) {", ["unit-api", "int"], note="plus de refus d'une année hors 2000-9999"),
    M("T-4", "F-11 cinq chiffres", TYPES, r"/^(DEVIS-\d{4}-\d{4,}-\d{4,}) v(\d+)$/u", r"/^(DEVIS-\d{4}-\d{4}-\d{4}) v(\d+)$/u", ["int", "unit-api"], note="le nom du fichier ne supporte plus 10 000"),
    M("T-5", "K-7 la langue du fichier", TYPES, "return `${m[1]}_${locale}_v${m[2]}.pdf`;", "return `${m[1]}_fr_v${m[2]}.pdf`;", ["int", "unit-api", "pro"], note="la langue est ignorée"),
    M("T-6", "F-10 la version dans la référence", TYPES, 'v${referencePart(parts.version, "version")}', "v1", ["int", "unit-api"], note="la version écrite 1 pour toujours"),
    M("D-1", "F-10 la langue demandée", DOCSVC, "quoteDocumentFilename(record, locale)", 'quoteDocumentFilename(record, "fr")', ["int", "unit-api"], note=""),
    M("D-2", "F-16 isolat du document", DOCMOD, '<bdi dir="ltr">${record.reference}</bdi>', "${record.reference}", ["int", "unit-api"], note="plus de <bdi dir=ltr>"),
    M("D-3", "F-10 la version imprimée", DOCSRC, "quoteNumber: row.referenceNumber, version: row.version })", "quoteNumber: row.referenceNumber, version: 1 })", ["int", "unit-api"], note="le document d'une v2 s'imprime v1"),
    M("V-1", "K-6 les deux numéros", SERVICE, "quoteNumber: row.referenceNumber,", "quoteNumber: row.version,", ["int", "unit-api"], note="numéro du devis = version"),
    M("V-2", "K-6 le numéro de salle", SERVICE, "venueNumber: row.venue.number,", "venueNumber: row.referenceNumber,", ["int", "unit-api"], note="numéro de salle = numéro du devis"),
    # ── l'app Pro ──
    M("P-1", "F-14 la référence affichée est celle du serveur", WJ, "<bdi dir=\"ltr\">{quote.reference}</bdi>", "<bdi dir=\"ltr\">{quote.id}</bdi>", ["pro"], note="l'identifiant à la place"),
    M("P-2", "F-16 l'isolat à l'écran", WJ, "<bdi dir=\"ltr\">{quote.reference}</bdi>", "<bdi>{quote.reference}</bdi>", ["pro"], note="plus de dir=ltr"),
    M("P-3", "F-15 la langue du fichier enregistré", WJ, "quoteDocumentFilename(courant, documentLocale)", 'quoteDocumentFilename(courant, "fr")', ["pro"], note=""),
    M("P-4", "F-15 la référence de la fenêtre", WJ, "reference: courant.reference", 'reference: ""', ["pro"], note=""),
    M("P-5", "F-14 la référence de la dernière réponse", WJ, "          : await quotes.revise(chainQuoteId, body());\n      setQuote(next);", "          : await quotes.revise(chainQuoteId, body());\n      if (chainQuoteId === null) setQuote(next);", ["pro"], note="après une révision, l'écran ne prend plus la réponse"),
    M("P-6", "F-15 la fenêtre commence par la référence", RM, '{ key: "remitReference", reference },', '{ key: "remitRecorded", channel }, { key: "remitReference", reference },', ["pro"], note="la référence n'est plus la première ligne"),
    M("P-7", "F-16 l'isolat de la fenêtre", RM, "return `\\u2066${texte}\\u2069`;", "return texte;", ["pro"], note="plus d'isolat Unicode"),
    M("P-8", "parité arabe", ARJSON, '"remitReference": "مرجع العرض: {reference}.",', "", ["pro", "unit-api"], note="la clé arabe de la fenêtre disparaît"),
    # ── les migrations (rejouées par setup-global, par migrate deploy dans mes sondes) ──
    M("MA-1", "F-5/F-6 setval au maximum", MA, 'SELECT setval(\'venue_number_seq\', COALESCE(MAX("number"), 1), MAX("number") IS NOT NULL) FROM "venues";', "SELECT setval('venue_number_seq', 1, false) FROM \"venues\";", ["int", "sondes"], note="séquence en retard"),
    M("MA-2", "F-5 l'ordre de la numérotation", MA, '(row_number() OVER (ORDER BY "created_at", "id"))::integer AS "rang"', '(row_number() OVER (ORDER BY "created_at" DESC, "id"))::integer AS "rang"', ["int", "sondes"], note="ordre inversé"),
    M("MA-3", "F-5 les salles supprimées", MA, '          FROM "venues"\n       ) AS n', '          FROM "venues" WHERE "deleted_at" IS NULL\n       ) AS n', ["int", "sondes"], note="les supprimées ne sont plus numérotées"),
    M("MA-4", "F-8 le déclencheur", MA, "CREATE TRIGGER \"venues_number_immutable\"\n  BEFORE UPDATE OF \"number\" ON \"venues\"\n  FOR EACH ROW\n  WHEN (OLD.\"number\" IS DISTINCT FROM NEW.\"number\")\n  EXECUTE FUNCTION \"venues_number_immutable\"();", "SELECT 1;", ["int", "sondes-base"], note="plus de déclencheur"),
    M("MA-5", "F-8 la clause WHEN", MA, '  WHEN (OLD."number" IS DISTINCT FROM NEW."number")\n', "", ["int", "sondes-base"], note="le déclencheur refuse aussi la même valeur"),
    M("MA-6", "F-6 l'unicité du numéro de salle", MA, '  ADD CONSTRAINT "venues_number_key" UNIQUE ("number"),\n', "", ["int", "sondes-base"], note=""),
    M("MA-7", "F-6 numéro de salle ≥ 1", MA, 'CHECK ("number" >= 1)', 'CHECK ("number" >= 0)', ["sondes-base"], note="0 permis"),
    M("MA-8", "F-6 le défaut nextval", MA, "  ALTER COLUMN \"number\" SET DEFAULT nextval('venue_number_seq'),\n", "", ["int", "sondes"], note="la salle neuve n'a plus de numéro"),
    M("MB-1", "F-3/F-5 l'année d'Alger en base", MB, "AT TIME ZONE 'Africa/Algiers'", "AT TIME ZONE 'UTC'", ["int", "sondes"], nb=2, note="deux occurrences : l'année UTC"),
    M("MB-2", "F-5 numérotation par (salle, année)", MB, "PARTITION BY \"venue_id\", EXTRACT(YEAR FROM \"created_at\" AT TIME ZONE 'Africa/Algiers')", 'PARTITION BY "venue_id"', ["int", "sondes"], note="plus de remise à 1 par année"),
    M("MB-3", "F-5 ordre de création", MB, 'ORDER BY "created_at", "id"\n               ))::integer AS "rang"', 'ORDER BY "id"\n               ))::integer AS "rang"', ["int", "sondes"], note="ordre de l'identifiant"),
    M("MB-4", "F-5 les compteurs amorcés", MB, 'SELECT "venue_id", "reference_year", MAX("reference_number")', 'SELECT "venue_id", "reference_year", MIN("reference_number")', ["int", "sondes"], note="MIN au lieu de MAX"),
    M("MB-5", "F-9 l'unicité PARTIELLE", MB, '("venue_id", "reference_year", "reference_number") WHERE "version" = 1;', '("venue_id", "reference_year", "reference_number");', ["int", "sondes-base"], note="plus de WHERE version = 1"),
    M("MB-6", "F-4 la clé composite", MB, 'ALTER TABLE "quotes"\n  ADD CONSTRAINT "quotes_chain_head_fkey"\n  FOREIGN KEY ("chain_id", "venue_id", "reference_year", "reference_number")\n  REFERENCES "quotes"("id", "venue_id", "reference_year", "reference_number")\n  ON DELETE RESTRICT ON UPDATE RESTRICT;', "SELECT 1;", ["int", "sondes-base"], note="plus de clé composite"),
    M("MB-7", "F-13 l'année 2000-9999 du devis", MB, 'CHECK ("reference_year" BETWEEN 2000 AND 9999);', 'CHECK ("reference_year" BETWEEN 1 AND 99999);', ["sondes-base"], note="années hors plage permises"),
    M("MB-8", "F-13 numéro de devis ≥ 1", MB, 'CHECK ("reference_number" >= 1)', 'CHECK ("reference_number" >= 0)', ["sondes-base"], note=""),
    M("MB-9", "F-5 la vérification qui LÈVE", MB, "IF restantes > 0 THEN\n    RAISE EXCEPTION", "IF false THEN\n    RAISE EXCEPTION", ["sondes"], note="la vérification est désarmée (SET NOT NULL échouera quand même, autrement)"),
    M("MB-10", "F-5 les révisions recopient leur tête", MB, '   AND h."version" = 1;\n\n-- Aucune ligne', '   AND h."version" = 1 AND false;\n\n-- Aucune ligne', ["int", "sondes"], note="les révisions ne recopient plus"),
    M("MB-11", "F-4 le RESTRICT du numéro de la tête", MB, "ON DELETE RESTRICT ON UPDATE RESTRICT;", "ON DELETE RESTRICT ON UPDATE CASCADE;", ["int", "sondes-base"], note="la tête change de numéro et les révisions la suivent"),
]


def octets(chemin):
    return open(chemin, "rb").read()


def empreinte(b):
    return hashlib.sha256(b).hexdigest()


def adapter(b, texte):
    """Le texte de l'ancre dans la fin de ligne du fichier (les fichiers du dépôt sont en CRLF sur ce poste)."""
    crlf = b.count(b"\r\n") > 0 and b.count(b"\r\n") == b.count(b"\n")
    t = texte.replace("\n", "\r\n") if crlf else texte
    return t.encode("utf-8")


def lire_sortie(texte):
    """Rend (fichiers de test en échec, groupes [(titres, première ligne d'erreur)], passés, échecs, verdict-vitest)."""
    t = ANSI.sub("", texte)
    lignes = t.split("\n")
    groupes, i = [], 0
    while i < len(lignes):
        if lignes[i].startswith(" FAIL "):
            titres = []
            while i < len(lignes) and lignes[i].startswith(" FAIL "):
                titres.append(lignes[i][6:].strip())
                i += 1
            while i < len(lignes) and not lignes[i].strip():
                i += 1
            groupes.append((titres, lignes[i].strip() if i < len(lignes) else ""))
        else:
            i += 1
    passes = sum(int(m.group(1)) for m in re.finditer(r"^\s+Tests\s+.*?(\d+) passed", t, re.M))
    echecs = sum(int(m.group(1)) for m in re.finditer(r"^\s+Tests\s+(\d+) failed", t, re.M))
    return groupes, passes, echecs


def classer(groupes, passes, echecs, code):
    if not groupes and passes == 0 and echecs == 0:
        return "NON DÉMARRÉE"
    if any(g[1].startswith("AssertionError") for g in groupes if " > " in g[0][0]):
        return "MORD"
    if groupes:
        return "ÉCHEC SANS ASSERTION"
    return "MUETTE" if passes > 0 else "NON DÉMARRÉE"


def jouer(suite):
    cwd, cmd = SUITES[suite]
    t0 = time.time()
    r = subprocess.run(cmd, cwd=cwd, capture_output=True, timeout=1500, shell=(os.name == "nt"))
    sortie = (r.stdout + r.stderr).decode("utf-8", errors="replace")
    if suite.startswith("sondes"):
        ko = re.findall(r"^✗ (\S+)", sortie, re.M)
        ok = len(re.findall(r"^✓ ", sortie, re.M))
        morsures = ko
        verdict = "MORD" if ko else ("MUETTE" if ok else "NON DÉMARRÉE")
        return dict(suite=suite, verdict=verdict, resume=f"✗ {ko[:6]}{'…' if len(ko) > 6 else ''} ({len(ko)} ✗ / {ok} ✓)", code=r.returncode, duree=time.time() - t0)
    groupes, passes, echecs = lire_sortie(sortie)
    verdict = classer(groupes, passes, echecs, r.returncode)
    premiere = ""
    for titres, err in groupes:
        if err.startswith("AssertionError"):
            premiere = f"{titres[0].split(' > ')[0].split('/')[-1]} > {titres[0].split(' > ')[-1][:70]} → {err[:110]}"
            break
    if not premiere and groupes:
        premiere = f"{groupes[0][0][0][:80]} → {groupes[0][1][:110]}"
    return dict(suite=suite, verdict=verdict, resume=f"{passes} passés · {echecs} en échec · {len(groupes)} groupe(s) d'échec" + (f" · 1er : {premiere}" if premiere else ""), code=r.returncode, duree=time.time() - t0)


def restaurer_si_besoin():
    if not os.path.isdir(SAUVEGARDE):
        return
    for nom in os.listdir(SAUVEGARDE):
        src = os.path.join(SAUVEGARDE, nom)
        cible = open(src + ".chemin", encoding="utf-8").read() if nom.endswith(".orig") and os.path.exists(src + ".chemin") else None
        if cible:
            open(cible, "wb").write(octets(src))
            print(f"   restauré au démarrage : {cible}")
    shutil.rmtree(SAUVEGARDE)


def principal():
    a_blanc = "--a-blanc" in sys.argv
    seulement = None
    if "--seulement" in sys.argv:
        seulement = sys.argv[sys.argv.index("--seulement") + 1].split(",")
    restaurer_si_besoin()
    avant_git = subprocess.run(["git", "status", "--short"], capture_output=True).stdout.decode("utf-8")
    suivis = [l for l in avant_git.split("\n") if l and not l.startswith("??")]
    if suivis:
        sys.exit(f"ARBRE NON PROPRE (fichiers suivis modifiés) : {suivis}")
    resultats = []
    erreurs_ancre = []
    for m in MUTATIONS:
        b = octets(m["fichier"])
        a = adapter(b, m["ancre"])
        nb = b.count(a)
        if nb != m["nb"] and m["nb"] != 0:
            erreurs_ancre.append((m["id"], nb, m["nb"]))
    print(f"ancres : {len(MUTATIONS)} mutations, {len(erreurs_ancre)} ancre(s) fausse(s) {erreurs_ancre}")
    if a_blanc or erreurs_ancre:
        return 0 if not erreurs_ancre else 2
    os.makedirs(SAUVEGARDE, exist_ok=True)
    for m in MUTATIONS:
        if seulement and m["id"] not in seulement and not m["id"].startswith("CAL"):
            continue
        if m["nb"] == 0:
            continue
        b = octets(m["fichier"])
        h0 = empreinte(b)
        a = adapter(b, m["ancre"])
        r = adapter(b, m["remplacement"])
        assert b.count(a) == m["nb"], (m["id"], b.count(a))
        nom = m["id"].replace("+", "p").replace("-", "m")
        open(os.path.join(SAUVEGARDE, nom + ".orig"), "wb").write(b)
        open(os.path.join(SAUVEGARDE, nom + ".orig.chemin"), "w", encoding="utf-8").write(m["fichier"])
        muté = b.replace(a, r)
        assert muté != b, (m["id"], "mutation sans effet sur les octets")
        sorties = []
        try:
            open(m["fichier"], "wb").write(muté)
            verifie = octets(m["fichier"])
            assert verifie.count(r) >= (m["nb"] if r else 0) and verifie != b, (m["id"], "marqueur absent après écriture")
            for s in m["suites"]:
                essais = m["fois"] if s == "int" else 1
                for k in range(essais):
                    res = jouer(s)
                    sorties.append(res)
                    if res["verdict"] == "MORD":
                        break
        finally:
            open(m["fichier"], "wb").write(b)
        h1 = empreinte(octets(m["fichier"]))
        assert h1 == h0, f"RESTAURATION INFIDÈLE : {m['fichier']}"
        for fich in (os.path.join(SAUVEGARDE, nom + ".orig"), os.path.join(SAUVEGARDE, nom + ".orig.chemin")):
            os.remove(fich)
        verdict_global = "MORD" if any(s["verdict"] == "MORD" for s in sorties) else ("ÉCHEC SANS ASSERTION" if any(s["verdict"] == "ÉCHEC SANS ASSERTION" for s in sorties) else ("NON DÉMARRÉE" if all(s["verdict"] == "NON DÉMARRÉE" for s in sorties) else "MUETTE"))
        print(f"\n[{verdict_global}] {m['id']} — {m['garde']} — {m['note']}\n   {m['fichier']}  (restauré : empreinte identique)")
        for s in sorties:
            print(f"   · {s['suite']:11} {s['verdict']:21} {s['duree']:5.0f}s  {s['resume'][:330]}")
        resultats.append((m["id"], verdict_global))
        if m["id"] == "CAL+" and verdict_global != "MORD":
            sys.exit("ABANDON : l'étalon positif ne mord pas — le lecteur ne se croit pas")
        if m["id"] == "CAL-" and verdict_global != "MUETTE":
            sys.exit("ABANDON : l'étalon négatif n'est pas muet — le lecteur invente des morsures")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)
    apres_git = subprocess.run(["git", "status", "--short"], capture_output=True).stdout.decode("utf-8")
    suivis_apres = [l for l in apres_git.split("\n") if l and not l.startswith("??")]
    print(f"\n== BILAN : {len(resultats)} mutations jouées : " + " · ".join(f"{i}={v}" for i, v in resultats))
    from collections import Counter
    print("   répartition :", dict(Counter(v for i, v in resultats)))
    print(f"   arbre à la fin : fichiers suivis modifiés = {suivis_apres} (attendu [])")
    return 0 if not suivis_apres else 3


if __name__ == "__main__":
    sys.exit(principal())
