"""D328 — ÉTAT DES LIEUX de la base de développement pour le cadrage de la base clients (rang 35). `SELECT` SEULEMENT.

POURQUOI IL EXISTE
  Consigne du rang 35, point 1 : relever, sans rien supposer, les colonnes de `users`, `bookings.contact_*`, `visit_bookings.contact_phone`, `pro_profiles` ; les DOUBLONS de téléphone (étape R7(4) : « relever les doublons
  existants AVANT de poser la règle ») ; ce qui existe d'une `Commission` ; ce qui dit l'ORIGINE d'une réservation ; les noms. Le code est relevé par `releve-code.py` (même dossier).

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D328/etat-des-lieux/sondes.py > docs/preuves/D328/etat-des-lieux/sondes-sortie.txt

LECTURE SEULE, DEUX FOIS : chaque requête passe par une session `default_transaction_read_only=on`, et la calibration PROUVE que cette session refuse une écriture (bras négatif). Aucune requête ne contient un mot d'écriture :
  l'instrument le vérifie avant de l'envoyer.
DONNÉES PERSONNELLES : un numéro de téléphone ne s'imprime jamais en entier (six premiers caractères + « *** »), un nom jamais (jamais imprimé), un e-mail jamais. On compte, on ne recopie pas.
INSTRUMENTS ÉCARTÉS : un `pg_dump` (il lirait tout) ; la lecture du schéma Prisma seul (D186 : l'autorité sur les garanties est la MIGRATION, donc la base qui les a appliquées).
CALIBRATION, deux bras (D286) : (1) `SELECT 1` répond ; (2) une écriture est REFUSÉE ; (3) le détecteur de doublons rend 1 groupe sur trois valeurs dont deux identiques et 0 sur deux valeurs distinctes ; (4) le détecteur de
  « forme conforme » accepte un numéro `+2135…` et refuse `0550…`. Chaque compte s'imprime avec ce qu'il a PARCOURU et son attendu à côté (D290).
"""
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")

ECRITURE = re.compile(r"\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|reindex)\b", re.I)
FORME = r"^\+213[567][0-9]{8}$"


def psql(sql, controle=True):
    if controle and ECRITURE.search(sql):
        sys.exit(f"REFUS : la requête contient un mot d'écriture : {sql[:80]}")
    r = subprocess.run(
        ["docker", "exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-F", " | ", "-c", sql],
        capture_output=True,
    )
    if r.returncode != 0:
        sys.exit(f"ERREUR psql : {r.stderr.decode('utf-8', errors='replace')[:300]}")
    return r.stdout.decode("utf-8", errors="replace").strip()


def lignes(sql):
    s = psql(sql)
    return [l for l in s.split("\n") if l.strip()] if s else []


def masque(tel):
    return (tel[:6] + "***") if tel else "∅"


def titre(t):
    print(f"\n== {t}")


# ══ CALIBRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras, abandon si un seul manque")
cal = []
r = subprocess.run(["docker", "exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-c", "UPDATE users SET locale = locale WHERE false"], capture_output=True)
for nom, ok in (
    ("bras 1 — `SELECT 1` répond", psql("SELECT 1") == "1"),
    ("bras 2 — une écriture est REFUSÉE par la session (code non nul et « read-only »)", r.returncode != 0 and b"read-only" in r.stderr),
    ("bras 3a — doublons : trois valeurs dont deux identiques → 1 groupe", len(lignes("SELECT v FROM (VALUES ('a'),('a'),('b')) t(v) GROUP BY v HAVING count(*) > 1")) == 1),
    ("bras 3b — doublons : deux valeurs distinctes → 0 groupe", len(lignes("SELECT v FROM (VALUES ('a'),('b')) t(v) GROUP BY v HAVING count(*) > 1")) == 0),
    ("bras 4a — forme conforme : `+213550000001` accepté", psql(f"SELECT '+213550000001' ~ '{FORME}'") == "t"),
    ("bras 4b — forme conforme : `0550000001` refusé", psql(f"SELECT '0550000001' ~ '{FORME}'") == "f"),
):
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom}")
if not all(cal):
    sys.exit("CALIBRATION : un bras manque — l'instrument ne juge pas")
print(f"== calibration : {len(cal)} bras, 0 manqué")

# ══ 1. Les colonnes ══════════════════════════════════════════════════════════════════════════════════════════════════
titre("1. LES COLONNES (information_schema ; nullabilité = ce que la BASE impose, pas Prisma)")
for table, filtre in (
    ("users", None),
    ("pro_profiles", None),
    ("bookings", ("contact_%", "client_id", "source", "quote_id", "idempotency_key", "slot_name_%")),
    ("visit_bookings", None),
    ("quotes", ("client_id", "id", "venue_id", "created_at", "version", "chain_id", "parent_quote_id", "status", "sent_via")),
    ("venues", ("name_fr", "name_ar", "slug", "owner_id", "commission_rate_bps", "cashback_rate_bps", "created_at", "deleted_at")),
    ("commissions", None),
):
    rows = lignes(f"SELECT column_name, data_type, is_nullable, coalesce(column_default,'') FROM information_schema.columns WHERE table_schema='public' AND table_name='{table}' ORDER BY ordinal_position")
    if filtre:
        pats = [re.compile("^" + f.replace("%", ".*") + "$") for f in filtre]
        rows = [r for r in rows if any(p.match(r.split(" | ")[0]) for p in pats)]
    print(f"\n   {table} — {len(rows)} colonne(s) retenue(s)")
    for r in rows:
        print(f"      {r}")

# ══ 2. Garanties de la base sur le téléphone, le nom ═══════════════════════════════════════════════════════════════
titre("2. GARANTIES DE LA BASE SUR LES TÉLÉPHONES ET LES NOMS (la migration est l'autorité, D186 : on lit la base qu'elle a produite)")
idx = lignes("SELECT tablename || ' : ' || indexname FROM pg_indexes WHERE schemaname='public' AND (indexdef ILIKE '%phone%' OR indexdef ILIKE '%contact_%' OR indexdef ILIKE '%first_name%' OR indexdef ILIKE '%last_name%') ORDER BY 1")
print(f"   index mentionnant `phone`, `contact_*` ou un nom : {len(idx)} (parcouru : tous les index du schéma public) — attendu 0 : {idx}")
cks = lignes("SELECT conrelid::regclass || ' : ' || conname || ' : ' || pg_get_constraintdef(oid) FROM pg_constraint WHERE contype='c' AND (pg_get_constraintdef(oid) ILIKE '%phone%' OR pg_get_constraintdef(oid) ILIKE '%contact_%' OR pg_get_constraintdef(oid) ILIKE '%first_name%')")
print(f"   CHECK mentionnant `phone`, `contact_*` ou un prénom : {len(cks)} (parcouru : tous les CHECK) — attendu 0 : {cks}")
uniq = lignes("SELECT conrelid::regclass || ' : ' || conname FROM pg_constraint WHERE contype='u' AND conrelid IN ('users'::regclass,'bookings'::regclass,'visit_bookings'::regclass,'pro_profiles'::regclass)")
print(f"   contraintes UNIQUE (hors index) sur users, bookings, visit_bookings, pro_profiles : {len(uniq)} — {uniq}")
uidx = lignes("SELECT tablename || ' : ' || indexname FROM pg_indexes WHERE schemaname='public' AND tablename IN ('users','pro_profiles','bookings','visit_bookings','commissions') AND indexdef ILIKE '%UNIQUE%' ORDER BY 1")
print(f"   index UNIQUE de ces cinq tables ({len(uidx)} lus) : {uidx}")

# ══ 3. Formes ═════════════════════════════════════════════════════════════════════════════════════════════════════════
titre("3. LES FORMES STOCKÉES (conforme = `+213` puis un mobile `5|6|7` et huit chiffres)")
for table, col in (("users", "phone"), ("bookings", "contact_phone"), ("visit_bookings", "contact_phone"), ("pro_profiles", "phone"), ("pro_profiles", "phone2")):
    total, nul, conf, autre, vide = (int(x) for x in psql(f"SELECT count(*), count(*) FILTER (WHERE {col} IS NULL), count(*) FILTER (WHERE {col} ~ '{FORME}'), count(*) FILTER (WHERE {col} IS NOT NULL AND {col} <> '' AND {col} !~ '{FORME}'), count(*) FILTER (WHERE {col} = '') FROM {table}").split(" | "))
    print(f"   {table}.{col} : {total} ligne(s) parcourue(s) · nul {nul} · chaîne vide {vide} · conforme {conf} · autre forme {autre} (somme {nul + vide + conf + autre} = {total}) — attendu : somme = parcourues {'✓' if nul + vide + conf + autre == total else '✗'}")

# ══ 4. Doublons ═══════════════════════════════════════════════════════════════════════════════════════════════════════
titre("4. LES DOUBLONS DE TÉLÉPHONE (étape R7(4) — AVANT de poser une règle d'unicité) ; numéros masqués")
for table, col in (("users", "phone"), ("bookings", "contact_phone"), ("visit_bookings", "contact_phone"), ("pro_profiles", "phone"), ("pro_profiles", "phone2")):
    parcourues = int(psql(f"SELECT count(*) FROM {table} WHERE {col} IS NOT NULL AND {col} <> ''"))
    groupes = lignes(f"SELECT {col}, count(*) FROM {table} WHERE {col} IS NOT NULL AND {col} <> '' GROUP BY {col} HAVING count(*) > 1 ORDER BY 2 DESC")
    print(f"   {table}.{col} : {parcourues} valeur(s) non vide(s) parcourue(s) → {len(groupes)} groupe(s) en double" + ("" if not groupes else " : " + " ; ".join(f"{masque(g.split(' | ')[0])} ×{g.split(' | ')[1]}" for g in groupes)))
# même numéro écrit de deux façons (chiffres seuls égaux, texte différent) : la normalisation en base est-elle nécessaire ?
for table, col in (("users", "phone"), ("bookings", "contact_phone"), ("visit_bookings", "contact_phone")):
    brut = int(psql(f"SELECT count(DISTINCT {col}) FROM {table} WHERE {col} IS NOT NULL AND {col} <> ''"))
    chiffres = int(psql(f"SELECT count(DISTINCT regexp_replace({col}, '[^0-9]', '', 'g')) FROM {table} WHERE {col} IS NOT NULL AND {col} <> ''"))
    print(f"   {table}.{col} : {brut} valeur(s) distincte(s) en texte, {chiffres} en chiffres seuls — attendu égaux (une seule forme stockée) : {'✓' if brut == chiffres else '✗ le même numéro est stocké sous deux formes'}")
# collisions entre tables
for a, b, sql in (
    ("users.phone", "bookings.contact_phone", "SELECT count(*) FROM users u JOIN bookings b ON b.contact_phone = u.phone"),
    ("users.phone", "visit_bookings.contact_phone", "SELECT count(*) FROM users u JOIN visit_bookings v ON v.contact_phone = u.phone"),
    ("users.phone", "pro_profiles.phone|phone2", "SELECT count(*) FROM users u JOIN pro_profiles p ON p.phone = u.phone OR p.phone2 = u.phone"),
    ("bookings.contact_phone", "pro_profiles.phone|phone2", "SELECT count(*) FROM bookings b JOIN pro_profiles p ON p.phone = b.contact_phone OR p.phone2 = b.contact_phone"),
):
    print(f"   numéros communs à {a} et {b} : {psql(sql)} ligne(s) jointe(s)")
# un même contact (téléphone) sous plusieurs noms, un même nom sous plusieurs téléphones (réservations)
n_tel, n_nom, n_tel_nom = (int(x) for x in psql("SELECT count(DISTINCT contact_phone), count(DISTINCT lower(trim(contact_first_name)) || '|' || lower(trim(contact_last_name))), count(DISTINCT contact_phone || '|' || lower(trim(contact_first_name)) || '|' || lower(trim(contact_last_name))) FROM bookings").split(" | "))
nb = int(psql("SELECT count(*) FROM bookings"))
print(f"   bookings : {nb} réservation(s) parcourue(s) · {n_tel} téléphone(s) distinct(s) · {n_nom} nom(s) distinct(s) (prénom+nom, casse et bords ignorés) · {n_tel_nom} couple(s) (téléphone, nom)")
par_tel = lignes("SELECT contact_phone, count(*), count(DISTINCT lower(trim(contact_first_name)) || '|' || lower(trim(contact_last_name))) FROM bookings GROUP BY contact_phone ORDER BY 2 DESC")
print("   par téléphone (masqué) : réservations · noms distincts : " + " ; ".join(f"{masque(l.split(' | ')[0])} {l.split(' | ')[1]} · {l.split(' | ')[2]}" for l in par_tel))
par_nom = lignes("SELECT lower(trim(contact_first_name)) || '|' || lower(trim(contact_last_name)), count(*), count(DISTINCT contact_phone) FROM bookings GROUP BY 1 ORDER BY 2 DESC")
print("   par nom (jamais imprimé) : réservations · téléphones distincts : " + " ; ".join(f"[nom {i + 1}] {l.split(' | ')[1]} · {l.split(' | ')[2]}" for i, l in enumerate(par_nom)))

# ══ 5. Commission ═════════════════════════════════════════════════════════════════════════════════════════════════════
titre("5. LA COMMISSION (modèle, garanties, lignes)")
print(f"   commissions : {psql('SELECT count(*) FROM commissions')} ligne(s) · cashback_claims : {psql('SELECT count(*) FROM cashback_claims')} ligne(s) · payments : {psql('SELECT count(*) FROM payments')} ligne(s)")
for l in lignes("SELECT conname || ' : ' || pg_get_constraintdef(oid) FROM pg_constraint WHERE conrelid = 'commissions'::regclass AND contype IN ('c','u','f') ORDER BY 1"):
    print(f"      {l}")
for l in lignes("SELECT indexname || ' : ' || indexdef FROM pg_indexes WHERE schemaname='public' AND tablename='commissions' ORDER BY 1"):
    print(f"      {l}")
print("   énumérations : " + " ; ".join(lignes("SELECT t.typname || ' = ' || string_agg(e.enumlabel, ',' ORDER BY e.enumsortorder) FROM pg_type t JOIN pg_enum e ON e.enumtypid = t.oid WHERE t.typname IN ('CommissionStatus','BookingSource','BookingStatus','VisitStatus','PaymentMethod','CashbackClaimStatus') GROUP BY t.typname ORDER BY 1")))
print("   salles : taux de commission et de cashback (points de base) : " + " ; ".join(lignes("SELECT coalesce(commission_rate_bps::text,'∅') || '/' || coalesce(cashback_rate_bps::text,'∅') || ' ×' || count(*) || (CASE WHEN deleted_at IS NULL THEN ' vivante(s)' ELSE ' supprimée(s)' END) FROM venues GROUP BY commission_rate_bps, cashback_rate_bps, (deleted_at IS NULL) ORDER BY 1")))

# ══ 6. Origine ═══════════════════════════════════════════════════════════════════════════════════════════════════════
titre("6. L'ORIGINE D'UNE RÉSERVATION OU D'UN DEVIS : que dit la base ?")
src = lignes("SELECT source || ' / ' || status || ' : ' || count(*) FROM bookings GROUP BY source, status ORDER BY 1")
print(f"   bookings par (source, statut) — {psql('SELECT count(*) FROM bookings')} parcourue(s) : {src}")
print(f"   bookings dont `client_id` est NUL : {psql('SELECT count(*) FROM bookings WHERE client_id IS NULL')} sur {psql('SELECT count(*) FROM bookings')} · dont `source = CLIENT` : {psql(chr(83) + 'ELECT count(*) FROM bookings WHERE source = ' + chr(39) + 'CLIENT' + chr(39))}")
print(f"   bookings liées à un devis (`quote_id`) : {psql('SELECT count(*) FROM bookings WHERE quote_id IS NOT NULL')} · devis dont `client_id` est NUL : {psql('SELECT count(*) FROM quotes WHERE client_id IS NULL')} sur {psql('SELECT count(*) FROM quotes')}")
print(f"   visites : {psql('SELECT count(*) FROM visit_bookings')} ligne(s) ; `client_id` NOT NULL en base : {psql(chr(83) + 'ELECT is_nullable FROM information_schema.columns WHERE table_name=' + chr(39) + 'visit_bookings' + chr(39) + ' AND column_name=' + chr(39) + 'client_id' + chr(39))} (attendu NO : une visite exige un compte)")
print(f"   FK `bookings.client_id` : {psql(chr(83) + 'ELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname=' + chr(39) + 'bookings_client_id_fkey' + chr(39))}")

# ══ 7. Noms ═══════════════════════════════════════════════════════════════════════════════════════════════════════════
titre("7. LES NOMS")
print(f"   comptes : {psql('SELECT count(*) FROM users')} · avec prénom {psql('SELECT count(*) FROM users WHERE first_name IS NOT NULL')} · avec nom {psql('SELECT count(*) FROM users WHERE last_name IS NOT NULL')} · par rôle : {lignes('SELECT role || \' ×\' || count(*) FROM users GROUP BY role')}")
for table, col in (("bookings", "contact_first_name"), ("bookings", "contact_last_name"), ("users", "first_name"), ("users", "last_name")):
    ar = int(psql(f"SELECT count(*) FROM {table} WHERE {col} ~ '[؀-ۿ]'"))
    lat = int(psql(f"SELECT count(*) FROM {table} WHERE {col} ~ '[A-Za-z]'"))
    tot = int(psql(f"SELECT count(*) FROM {table} WHERE {col} IS NOT NULL"))
    print(f"   {table}.{col} : {tot} valeur(s) non nulle(s) parcourue(s) · avec une lettre arabe {ar} · avec une lettre latine {lat}")
print(f"   salles : `name_fr` et `name_ar` — NOT NULL tous deux : {psql(chr(83) + 'ELECT string_agg(column_name || chr(61) || is_nullable, chr(44)) FROM information_schema.columns WHERE table_name=' + chr(39) + 'venues' + chr(39) + ' AND column_name IN (' + chr(39) + 'name_fr' + chr(39) + ',' + chr(39) + 'name_ar' + chr(39) + ')')}")

# ══ 7b. La numérotation (R3) : ce que la migration donnerait sur ces données ═══════════════════════════════════════════
titre("7b. LA NUMÉROTATION (R3) APPLIQUÉE AUX DONNÉES EXISTANTES — ce que la migration numéroterait (calcul, aucune écriture)")
nv = int(psql("SELECT count(*) FROM venues"))
rang = lignes("SELECT row_number() OVER (ORDER BY created_at, id) || ' | ' || left(id::text, 8) || ' | ' || (deleted_at IS NOT NULL) || ' | ' || created_at::date FROM venues ORDER BY created_at, id")
print(f"   salles parcourues : {nv} (supprimées COMPRISES — R3 : « y compris les salles supprimées ») · numéros 1..{len(rang)} : attendu {nv} lignes {'✓' if len(rang) == nv else '✗'}")
for l in rang:
    print(f"      n° {l}")
ex_aequo = int(psql("SELECT count(*) FROM (SELECT created_at FROM venues GROUP BY created_at HAVING count(*) > 1) t"))
print(f"   salles dont `created_at` est identique à celui d'une autre (le départage par identifiant sert) : {ex_aequo} groupe(s) — attendu 0 ici, mais l'identifiant est un UUIDv7 donc ordonné par le temps : le départage ne change pas l'ordre de création")
nq = int(psql("SELECT count(*) FROM quotes"))
nch = int(psql("SELECT count(DISTINCT chain_id) FROM quotes"))
nv1 = int(psql("SELECT count(*) FROM quotes WHERE version = 1"))
print(f"   devis parcourus : {nq} · chaînes (`chain_id` distincts) : {nch} · versions 1 : {nv1} (attendu : égal aux chaînes {'✓' if nch == nv1 else '✗'}) · révisions (version > 1) : {psql('SELECT count(*) FROM quotes WHERE version > 1')}")
par = lignes("SELECT rn || ' | ' || an || ' | ' || n FROM (SELECT v.rn AS rn, extract(year FROM (q.created_at AT TIME ZONE 'Africa/Algiers'))::int AS an, count(*) AS n FROM quotes q JOIN (SELECT id, row_number() OVER (ORDER BY created_at, id) AS rn FROM venues) v ON v.id = q.venue_id WHERE q.version = 1 GROUP BY v.rn, extract(year FROM (q.created_at AT TIME ZONE 'Africa/Algiers'))) t ORDER BY rn, an")
print(f"   premières versions par (n° de salle, année à l'heure d'Alger) : {len(par)} couple(s) : " + " ; ".join(f"salle {l.split(' | ')[0]} / {l.split(' | ')[1]} → {l.split(' | ')[2]} devis (numéros 1..{l.split(' | ')[2]})" for l in par))
ecart_annee = int(psql("SELECT count(*) FROM quotes WHERE extract(year FROM created_at AT TIME ZONE 'UTC') <> extract(year FROM created_at AT TIME ZONE 'Africa/Algiers')"))
print(f"   devis dont l'année UTC diffère de l'année d'Alger ({nq} parcourus) : {ecart_annee} (attendu 0 sur ces données ; l'écart n'existe qu'entre 23:00 UTC le 31/12 et minuit)")
croise = int(psql("SELECT count(*) FROM quotes r JOIN quotes p ON p.chain_id = r.chain_id AND p.version = 1 WHERE r.version > 1 AND extract(year FROM r.created_at AT TIME ZONE 'Africa/Algiers') <> extract(year FROM p.created_at AT TIME ZONE 'Africa/Algiers')"))
print(f"   révisions écrites une AUTRE année que leur première version : {croise} (R3 : la révision garde année et numéro ; seul `v` change)")

# ══ 8. Ce que la base de DÉVELOPPEMENT ne dit pas ═══════════════════════════════════════════════════════════════════════
titre("8. LIMITES")
print("   • la base lue est la base de DÉVELOPPEMENT de Ko (1 compte, 1 pro, 5 salles) ; aucune base de production n'est lue ici : les doublons de PRODUCTION ne sont pas relevés (étape R7(4) reste à rejouer sur elle avant toute migration d'unicité) ;")
print("   • une valeur absente de cette base n'est pas absente des autres : « 0 doublon de compte » est vrai pour UN compte.")
