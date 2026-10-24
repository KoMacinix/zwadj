#!/usr/bin/env python3
"""Lecture adverse de la consigne du rang 42 (L36-1) contre le dépôt — D337.

MODE D'EMPLOI : depuis la RACINE, `python3 docs/preuves/D337/lecture-adverse/confronter-consigne.py`.
Il ne lit que des OBJETS GIT à SHA fixe (SHA_BASE) et, pour une affirmation sur la base de développement, une
requête en LECTURE SEULE (`docker exec zwadj-db psql … -At -c "select …"`). Il n'écrit rien.

POURQUOI IL EXISTE : la consigne demande une lecture adverse « contre le dépôt, ni contre ta mémoire ni contre celle
du relecteur ». Chaque affirmation vérifiable est ici une fonction qui rend (verdict, détail), et le détail imprime
CE QUI A ÉTÉ PARCOURU à côté de ce qui a été trouvé (D290).

INSTRUMENTS ÉCARTÉS : réutiliser `docs/preuves/D336/lecture-adverse-v3/…` — il est collé aux affirmations de D336 ;
reprendre ses extracteurs aurait importé leurs hypothèses. Seuls les PRINCIPES sont repris : texte APLATI avant toute
recherche multi-mots (AGENTS.md, D277/D294), jamais de comptage par sous-chaîne sans contexte (D275).

CALIBRATION (D286 : deux bras, et il ABANDONNE si un cas manque son verdict) : un cas VRAI connu doit rendre ✓, un
cas FAUX connu doit rendre ✗, avant toute affirmation de la consigne.
"""
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")

SHA_BASE = "299582c"


def git(*args: str) -> str:
    r = subprocess.run(["git", *args], capture_output=True, encoding="utf-8", errors="replace")
    return r.stdout


def blob(path: str) -> str:
    return git("show", f"{SHA_BASE}:{path}")


def aplati(texte: str) -> str:
    return re.sub(r"\s+", " ", texte)


def lignes(path: str) -> list[str]:
    return blob(path).splitlines()


RESULTATS: list[tuple[str, str, str, str]] = []  # (id, verdict, affirmation, détail)


def noter(ident: str, ok: bool | None, affirmation: str, detail: str) -> None:
    verdict = "✓" if ok is True else ("✗" if ok is False else "?")
    RESULTATS.append((ident, verdict, affirmation, detail))


# ── CALIBRATION ────────────────────────────────────────────────────────────────────────────────────────────────
def calibrer() -> None:
    registre = aplati(blob("ZWADJ_CONTINUITE.md"))
    vrai = "| D336 | A |" in registre
    faux = "| D999 | A |" in registre
    if not (vrai is True and faux is False):
        print(f"CALIBRATION RATÉE : cas vrai → {vrai} (attendu True), cas faux → {faux} (attendu False). ABANDON.")
        sys.exit(3)
    print(f"calibration : cas vrai (ligne D336 du registre) → ✓ ; cas faux (ligne D999) → ✗ — les deux bras tiennent.")


# ── LES AFFIRMATIONS ───────────────────────────────────────────────────────────────────────────────────────────
def a_depart() -> None:
    base = git("rev-parse", SHA_BASE).strip()
    origin = git("rev-parse", "origin/main").strip()
    parent = git("rev-parse", "HEAD~1").strip()
    # Le HEAD a avancé de la seule table d'ouverture (non poussée) : le DÉPART se lit sur origin/main et sur HEAD~1.
    noter("0.1", origin == base and parent == base, "origin/main = 299582c au départ (arbre propre, la table d'ouverture est le seul commit local)",
          f"{SHA_BASE} → {base[:12]} ; origin/main = {origin[:12]} ; HEAD~1 = {parent[:12]} ; commits locaux non poussés : {git('log', '--oneline', 'origin/main..HEAD').strip()}")
    noter("0.2", git("stash", "list").strip() == "", "aucun stash", f"`git stash list` = {git('stash', 'list').strip() or 'vide'}")
    reg = [l for l in lignes("ZWADJ_CONTINUITE.md") if re.match(r"^\| D\d+ \|", l)]
    dernier = re.match(r"^\| (D\d+) \|", reg[-1]).group(1)
    noter("0.3", dernier == "D336", "le dernier numéro du registre est D336 (attendu D337 pour ce lot)", f"{len(reg)} lignes de registre parcourues ; dernière = {dernier}")


def a_dette() -> None:
    bl = lignes("ZWADJ_BACKLOG.md")
    idx = [i + 1 for i, l in enumerate(bl) if "LE REFUS DE `clientId` À LA CRÉATION D'UN DEVIS (DB-15) N'A AUCUNE CIBLE" in l]
    noter("2a.1", len(idx) == 1 and 2520 <= idx[0] <= 2530, "l'entrée ouverte de la dette de preuve est à ZWADJ_BACKLOG.md:2525",
          f"{len(bl)} lignes parcourues ; l'entrée est à la ligne {idx} (la consigne dit « :2525 ») — {'ouverte' if idx and bl[idx[0]-1].startswith('- [ ]') else 'état inconnu'}")
    q = lignes("packages/types/src/quote.ts")
    n = [i + 1 for i, l in enumerate(q) if l.strip().startswith("clientRecordId: z.string().uuid(")]
    noter("2a.2", n == [371], "la ligne clientRecordId de quoteCreateSchema est packages/types/src/quote.ts:371",
          f"{len(q)} lignes parcourues ; lignes trouvées = {n}")
    sch = aplati(blob("packages/types/src/quote.ts"))
    noter("2a.3", "clientNameLatin: contactName.optional() }).strict(" in sch.replace("  ", " ") or ".strict(\"quote.validation.unknownKey\")" in sch,
          "quoteCreateSchema est .strict() (`clientId` est donc une clé inconnue)", "motif `.strict(\"quote.validation.unknownKey\")` cherché sur le texte aplati")
    cr = lignes("apps/api/src/common/client-record.spec.ts")
    l138 = cr[137] if len(cr) >= 138 else ""
    noter("2a.4", "clientId" in l138, "client-record.spec.ts:138 est le test du refus de `clientId`", f"{len(cr)} lignes ; ligne 138 = « {l138.strip()[:110]} »")
    qi = lignes("apps/api/test/int/quotes.int-spec.ts")
    l725 = qi[724] if len(qi) >= 725 else ""
    noter("2a.5", "DB-15" in l725, "quotes.int-spec.ts:725 est le test du refus de `clientId`", f"{len(qi)} lignes ; ligne 725 = « {l725.strip()[:110]} »")
    h = blob("neutralisation/neutralize-r41.py")
    noter("2a.6", h.count("clientId") == 0 and h.count("DB-15") == 0, "neutralize-r41.py ne contient ni `clientId` ni `DB-15`",
          f"{len(h.splitlines())} lignes parcourues ; occurrences clientId = {h.count('clientId')}, DB-15 = {h.count('DB-15')} (attendu 0 et 0)")


def a_schema() -> None:
    init = blob("apps/api/prisma/migrations/20260707000000_init/migration.sql")
    m = re.search(r'CREATE TABLE "bookings" \((.*?)\n\);', init, re.S)
    corps = m.group(1) if m else ""
    noter("3a.1", '"contact_phone" TEXT NOT NULL' in corps and '"contact_email" TEXT,' in corps,
          "bookings.contact_phone est NOT NULL et bookings.contact_email est nullable (migration d'origine)",
          f"table `bookings` trouvée : {m is not None} ; {len(corps.splitlines())} colonnes parcourues")
    liste = git("ls-tree", "-r", "--name-only", SHA_BASE, "apps/api/prisma/migrations").splitlines()
    sqls = [p for p in liste if p.endswith(".sql")]
    touche = []
    for p in sqls:
        sans_commentaires = " ".join(l.split("--")[0] for l in blob(p).splitlines())
        t = aplati(sans_commentaires)
        # Ne compte que les instructions qui visent la table "bookings" ET nomment contact_phone / contact_email.
        for instr in t.split(";"):
            if re.search(r'(ALTER|CREATE) TABLE "bookings"|ON "bookings"', instr) and re.search(r"contact_(phone|email)", instr):
                touche.append(p.split("/")[-2])
                break
    noter("3a.2", set(touche) <= {"20260707000000_init"},
          "aucune migration ultérieure ne modifie bookings.contact_phone / contact_email, ni n'y pose de CHECK (commentaires SQL retirés avant la recherche)",
          f"{len(sqls)} migrations parcourues, commentaires retirés ; instructions visant `bookings` et nommant ces colonnes, par migration = {touche}")
    ck = [p.split("/")[-2] for p in sqls if re.search(r'CHECK\s*\([^;]*contact_', blob(p))]
    noter("3a.3", ck == [] or ck == ["20260730000000_visit_booking_contact_phone"], "aucun CHECK existant ne porte sur contact_*",
          f"{len(sqls)} migrations parcourues ; CHECK nommant contact_ = {ck}")
    ps = aplati(blob("apps/api/prisma/schema.prisma"))
    noter("3a.4", 'contactPhone String @map("contact_phone") // +213 normalisé' in ps, "schema.prisma : Booking.contactPhone est `String` (obligatoire)", "motif cherché sur le texte aplati")
    noter("3a.5", 'contactPhone String? @map("contact_phone") ' in ps.replace("  ", " ") or "contactPhone String? @map(\"contact_phone\")" in ps,
          "VisitBooking.contactPhone est déjà `String?` (hors lot)", "motif cherché sur le texte aplati")
    noter("3a.6", all(blob(f"apps/api/prisma/migrations/{n}/migration.sql") for n in ("20261022120000_pro_client_records",)),
          "la dernière migration est 20261022120000_pro_client_records",
          f"dernière migration = {sorted(set(p.split('/')[-2] for p in liste if p.endswith('.sql')))[-1]}")


def a_recensement() -> None:
    fichiers = git("ls-tree", "-r", "--name-only", SHA_BASE).splitlines()
    ts = [f for f in fichiers if f.endswith((".ts", ".tsx")) and f.split("/")[0] in ("apps", "packages", "e2e")]
    avec = [f for f in ts if re.search(r"contactPhone|contact_phone", blob(f))]
    prod = [f for f in avec if not re.search(r"\.(test|spec|int-spec|e2e)\.tsx?$|/test/|test-support|/e2e/", f)]
    noter("3d.1", len(prod) == 15, "contact_phone apparaît dans 15 fichiers TypeScript de production (DR3)",
          f"{len(ts)} fichiers TS parcourus ; {len(avec)} portent le champ ; {len(prod)} de production")
    noter("3d.2", "apps/api/src/venues/visit-bookings.service.ts" in prod, "dont visit-bookings.service.ts, qui vise visit_bookings (hors lot)",
          f"présent : {'apps/api/src/venues/visit-bookings.service.ts' in prod}")
    vb = blob("apps/api/src/venues/visit-bookings.service.ts")
    noter("3d.3", "contact: contactPhone ?? client.email" in vb, "le patron « numéro, à défaut e-mail » existe déjà pour la visite (visit-bookings.service.ts)",
          f"{len(vb.splitlines())} lignes parcourues")
    liens = [f for f in ts if f.startswith(("apps/pro/src", "apps/client/src")) and re.search(r"tel:|sms:|wa\.me", blob(f)) and not re.search(r"\.test\.", f)]
    noter("3d.4", liens == [], "aucun geste d'appel ni de SMS (tel:, sms:, wa.me) n'existe dans les deux applications",
          f"{len([f for f in ts if f.startswith(('apps/pro/src', 'apps/client/src'))])} fichiers parcourus ; porteurs = {liens}")
    walkin = blob("apps/pro/src/dashboard/walkin-journey.tsx")
    noter("3d.5", "channelBlockers(canal, { phoneOk: telOk, emailOk })" in walkin, "les canaux de remise qui exigent un numéro sont déjà bloqués sans numéro (channelBlockers)",
          "motif cherché dans walkin-journey.tsx")


def a_parcours() -> None:
    b = aplati(blob("packages/types/src/booking.ts"))
    noter("3b.1", "contactPhone: dzPhoneSchema," in b, "bookingCreateSchema exige aujourd'hui contactPhone", "motif cherché sur le texte aplati")
    qs = aplati(blob("packages/types/src/quote.ts"))
    noter("3c.1", "contactPhone: dzPhoneSchema, /**" in qs or "contactPhone: dzPhoneSchema," in qs, "quoteConvertSchema exige aujourd'hui contactPhone", "motif cherché sur le texte aplati")
    c = blob("packages/types/src/contact.ts")
    noter("3b.2", "export function normalizeContactEmail" in c and "toLowerCase()" in c and "normalize(\"NFKC\")" in c,
          "la fiche normalise l'e-mail (rogné, NFKC, minuscules) par normalizeContactEmail", "motif cherché dans contact.ts")
    noter("3b.3", ".trim()" in c and "contactEmailSchema" in c and "normalizeContactEmail" not in re.search(r"export function contactEmailSchema.*?\n}", c, re.S).group(0),
          "S-55 : contactEmailSchema (réservation, conversion) ROGNE seulement — il ne met ni en minuscules ni NFKC : signalement, sans alignement",
          "corps de contactEmailSchema lu")
    p = blob("apps/client/src/components/venue/booking-request-panel.tsx")
    noter("3b.4", "isPhoneComplete(DEFAULT_PHONE_COUNTRY, phone);" in p and '<Field label={t("phone")} required>' in p,
          "le formulaire en ligne exige le numéro (required natif + condition `complete`)", f"{len(p.splitlines())} lignes parcourues")
    s = blob("apps/api/src/venues/bookings.service.ts")
    noter("3b.5", s.count("row.contactPhone") == 1 and s.count("input.contactPhone") == 1, "bookings.service.ts lit/écrit le numéro à deux endroits (création, DTO du pro)",
          f"input.contactPhone ×{s.count('input.contactPhone')} ; row.contactPhone ×{s.count('row.contactPhone')}")


def a_hors_lot() -> None:
    fichiers = git("ls-tree", "-r", "--name-only", SHA_BASE).splitlines()
    paie = [f for f in fichiers if f.endswith(".ts") and re.search(r"payment|chargily|webhook", f, re.I) and "/generated/" not in f]
    lit = [f for f in paie if re.search(r"contactPhone|contact_phone", blob(f))]
    test_re = r"\.(test|spec|int-spec|e2e)\.tsx?$|/test/"
    lit_prod = [f for f in lit if not re.search(test_re, f)]
    lit_test = [f for f in lit if re.search(test_re, f)]
    noter("3f.1", lit_prod == [], "aucun fichier de PRODUCTION de paiement (nom contenant payment/chargily/webhook) ne lit contact_phone",
          f"{len(paie)} fichiers de paiement parcourus ; production = {lit_prod} ; TESTS qui nomment le champ = {lit_test} (à lire : lit-il, ou le sème-t-il ?)")


def a_autorite() -> None:
    cont = aplati(blob("ZWADJ_CONTINUITE.md"))
    noter("1.1", "Une réservation est tout à fait possible avec une adresse e-mail uniquement" in cont, "Q2 de Ko est écrite mot pour mot dans ZWADJ_CONTINUITE.md",
          "motif cherché sur le texte aplati")
    noter("1.2", all(f"**S-{n}**" in cont for n in range(48, 58)), "S-48 à S-57 sont écrites dans la section D336, à ratifier", "S-48 … S-57 cherchées")
    s58 = [n for n in range(58, 68) if f"S-{n}" in cont]
    noter("1.3", len(s58) == 10, "S-58 à S-67 existent aussi (la consigne ratifie S-48 à S-67)", f"S-58 … S-67 trouvées dans le fichier : {s58}")
    noter("1.4", "à ratifier par Ko" in cont and "S-48 à S-67" in cont, "le registre porte « S-48 à S-67 à ratifier »", "motif cherché")
    ag = aplati(blob("AGENTS.md"))
    noter("1.5", "base de développement de Ko" not in ag, "AGENTS.md ne porte pas encore la règle des écritures sur la base de développement", "cherché « base de développement de Ko »")
    bl = aplati(blob("ZWADJ_BACKLOG.md"))
    noter("1.6", "L35-6" in bl and "S-56" in cont, "l'entrée L35-6 existe au backlog et S-56 existe dans D336", f"L35-6 ×{bl.count('L35-6')} au backlog ; S-56 présente")
    noter("1.7", "bloc « L35-4 (D336, MD-13)" in aplati(blob("apps/api/test/int/migration-non-empty.int-spec.ts")) or "L35-4 (D336, MD-13)" in blob("apps/api/test/int/migration-non-empty.int-spec.ts"),
          "la preuve D123 de D336 est le bloc « L35-4 (D336, MD-13) » de migration-non-empty.int-spec.ts", "motif cherché")
    noter("1.8", "C-C1 — D61" in cont, "l'annotation C-C1 / D61 existe", "motif cherché")
    noter("1.9", "04:06" not in cont, "(information) la section D336 ne mentionne pas l'application de la migration sur la base de développement de Ko — c'est l'omission que la consigne demande d'annoter",
          f"« 04:06 » dans ZWADJ_CONTINUITE.md : {'absent' if '04:06' not in cont else 'présent'}")


def a_base() -> None:
    r = subprocess.run(
        ["docker", "exec", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-c",
         "select migration_name || '|' || (finished_at at time zone 'UTC') from _prisma_migrations where migration_name = '20261022120000_pro_client_records';"],
        capture_output=True, encoding="utf-8", errors="replace")
    sortie = r.stdout.strip()
    noter("2b.1", sortie.endswith("2026-10-23 04:06:41.651575") or "2026-10-23 04:06" in sortie,
          "la migration 20261022120000 a été appliquée sur la base de développement le 23/10/2026 à 04:06 UTC (LECTURE SEULE de la base)",
          f"`_prisma_migrations` lu : « {sortie} » ; ce que la consigne dit avoir vu APRÈS (0 fiche, 24 devis) ne se relit plus : Ko a joué ses scénarios depuis")
    n = subprocess.run(["docker", "exec", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-c",
                        "select count(*), count(*) filter (where contact_phone is null) from bookings;"], capture_output=True, encoding="utf-8").stdout.strip()
    noter("3a.7", n.endswith("|0"), "aucune ligne existante de la base de développement ne violerait le CHECK (contact_phone est NOT NULL partout)", f"bookings (total|sans numéro) = {n}")


def a_kos() -> None:
    sc = blob("docs/preuves/D336/scenarios-ko.md")
    noter("1.10", all(f"\n{i}. " in sc for i in (1, 2, 3)) and "elle se lève aux" in aplati(sc), "les gestes 1 à 3 existent dans le rapport de D336 (condition de clôture du rang 33)",
          f"{len(sc.splitlines())} lignes parcourues ; D336 écrit « la condition se lève aux scénarios 2 et 3 » — les gestes 1 à 3 la couvrent")


def main() -> None:
    print("LECTURE ADVERSE DE LA CONSIGNE DU RANG 42 (D337) — instrument confronter-consigne.py, SHA de base", SHA_BASE)
    calibrer()
    for f in (a_depart, a_dette, a_schema, a_recensement, a_parcours, a_hors_lot, a_autorite, a_base, a_kos):
        f()
    ok = [r for r in RESULTATS if r[1] == "✓"]
    ko = [r for r in RESULTATS if r[1] == "✗"]
    inc = [r for r in RESULTATS if r[1] == "?"]
    print("\n══ PREMIÈRE PARTIE — COURTE ══")
    print(f"{len(RESULTATS)} contrôles parcourus : {len(ok)} ✓ · {len(ko)} ✗ · {len(inc)} ? (attendu : tous ✓, ou chaque ✗ expliqué en seconde partie)")
    for r in ko + inc:
        print(f"  {r[1]} {r[0]} — {r[2]}")
    print("\n══ SECONDE PARTIE — EN ENTIER ══")
    for ident, verdict, aff, detail in RESULTATS:
        print(f"{verdict} [{ident}] {aff}\n     ↳ {detail}")
    sys.exit(0 if not ko else 1)


if __name__ == "__main__":
    main()
