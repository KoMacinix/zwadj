#!/usr/bin/env python3
"""D339 — PREUVE que les cibles M-2 et M-5 de `neutralisation/neutralize-r43.py`, RETIRÉES comme mutations ÉQUIVALENTES, le sont (note de Ko du 02/11/2026, point 4 ; D325).

Procédure archivée comme PREUVE (D291), JAMAIS promue en instrument : elle emporterait ses défauts de mesure.

POURQUOI ELLE EXISTE. Le harnais écrivait, à la place de M-2 et de M-5, que les journaux « `.neutralisation-journaux/r43/M-2-*.log`, versés » prouvaient l'équivalence. Ils ne sont pas versés :
ils vivent dans un dossier ignoré par git (D291). Une équivalence affirmée sans pièce est une hypothèse écrite au statut de mesure.

CE QU'ELLE MESURE. Une mutation est équivalente quand, pour TOUT état de ligne, la contrainte mutée et l'originale — avec les AUTRES contraintes de la table — admettent ou refusent la même ligne.
La CHECK `quotes_unofficial_inert` ne lit, pour M-2 et M-5, que quatre colonnes : `status`, `sent_via`, `sent_at`, `accepted_at` (les trois colonnes du client restent à NULL, donc leurs conjoints sont vrais
dans les deux versions). L'espace de ces quatre colonnes est FINI : tous les statuts de l'énumération × `sent_via` NULL / non nul × `sent_at` NULL / non nul × `accepted_at` NULL / non nul. Il est ÉNUMÉRÉ
en entier, sur une base jetable qui porte les VRAIES migrations (lues dans les blobs de `HEAD`, immunisés contre toute mutation de l'arbre de travail), pour chacune des variantes :
    témoin   : la migration telle que commitée ;      M-2 : `status IN ('DRAFT','CANCELLED','ACCEPTED')` ;      M-5 : le conjoint `accepted_at IS NULL` rendu tautologique ;
    CONTRE-ÉPREUVE : M-4 (le conjoint `sent_at IS NULL` rendu tautologique), qui N'EST PAS équivalente — c'est l'une des cibles qui mordent (87 sur 87). L'instrument qui répondrait « équivalente »
    à tout passerait M-2 et M-5 et déclarerait aussi M-4 équivalente : il ne passe donc que s'il voit une DIFFÉRENCE là où il y en a une.
Pour chaque état : admis ou refusé, et NOM de la contrainte qui refuse. Verdict d'équivalence = même décision d'admission pour les 48 états ; le nom de la contrainte qui refuse PEUT changer — c'est
même ce qui explique l'équivalence (une AUTRE contrainte refuse), et il est imprimé.

CE QU'ELLE ÉCRIT SUR LE SERVEUR. Des bases JETABLES `zwadj_equiv_*` sur le serveur PostgreSQL du conteneur `zwadj-db`, créées puis supprimées ; la base de développement `zwadj` n'est ni lue ni écrite
par les essais, et son nombre de migrations ainsi que la liste des bases sont relevés AVANT et APRÈS (même nature d'écriture que `test:int`, D123).

CALIBRATION (deux bras, rejouée à chaque lancement, abandon si un seul manque) : (positif) le témoin ADMET au moins un état et en REFUSE au moins un ; (positif) la contre-épreuve M-4 DIFFÈRE du témoin sur
au moins un état ; (négatif) une mutation « posée » qui ne change rien (remplacer un texte par lui-même) serait vue ici comme équivalente — la pose de chaque mutation est donc PROUVÉE avant : ancre 1 → 0 ET
marqueur 0 → 1 (D286), le remplacement n'étant jamais une sous-chaîne de son ancre (D325).

Usage, depuis la RACINE, bash : python3 docs/preuves/D339/neutralisation/mutations-equivalentes.py > docs/preuves/D339/neutralisation/mutations-equivalentes.txt
Codes de sortie : 0 = M-2 et M-5 équivalentes ET M-4 différente ; 1 = une équivalence n'est pas établie, ou la contre-épreuve ne diffère pas ; 2 = abandon (calibration, pose, environnement).
"""
import itertools
import re
import subprocess
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8", errors="replace")
import os

if not os.path.isfile("pnpm-workspace.yaml"):
    sys.exit("✗ À LANCER DEPUIS LA RACINE DU MONOREPO.")

CONTENEUR, UTILISATEUR = "zwadj-db", "zwadj"
DOSSIER = "apps/api/prisma/migrations"
NOM_LOT = "quote_unofficial_draft"
BASE = "zwadj_equiv_base"
QUOTE_ID = "018f0000-0000-7000-8000-00000000e001"

MUTANTS = {
    "M-2": ("\"status\" IN ('DRAFT', 'CANCELLED')", "\"status\" IN ('DRAFT', 'CANCELLED', 'ACCEPTED')"),
    "M-5": ('AND "accepted_at" IS NULL', 'AND ("accepted_at" IS NULL OR "accepted_at" = "accepted_at")'),
    "M-4": ('AND "sent_at" IS NULL', 'AND ("sent_at" IS NULL OR "sent_at" = "sent_at")'),
}


def git(*args: str) -> bytes:
    r = subprocess.run(["git", *args], capture_output=True)
    if r.returncode != 0:
        sys.exit(f"✗ git {' '.join(args)} : {r.stderr.decode('utf-8', 'replace').strip()}")
    return r.stdout


def psql(db: str, sql: str, *, une_transaction: bool = False, arret: bool = True, fusion: bool = False) -> tuple[int, str, str]:
    base = ["psql", "-U", UTILISATEUR, "-d", db, "-X", "-A", "-t"]
    if une_transaction:
        base.append("-1")
    if arret:
        base += ["-v", "ON_ERROR_STOP=1"]
    cmd = ["docker", "exec", "-i", "-e", "PGCLIENTENCODING=UTF8", CONTENEUR]
    cmd += ["sh", "-c", " ".join(base) + " 2>&1"] if fusion else base
    r = subprocess.run(cmd, input=sql.encode("utf-8"), capture_output=True)
    return r.returncode, r.stdout.decode("utf-8", "replace"), r.stderr.decode("utf-8", "replace")


def requete(db: str, sql: str) -> list[str]:
    code, sortie, err = psql(db, sql)
    if code != 0:
        sys.exit(f"✗ psql ({db}) : {err.strip() or sortie.strip()}")
    return [l for l in sortie.splitlines() if l.strip()]


# ── 0. L'environnement : le conteneur répond, les migrations viennent des blobs de HEAD.
if subprocess.run(["docker", "exec", CONTENEUR, "pg_isready", "-U", UTILISATEUR], capture_output=True).returncode != 0:
    sys.exit("✗ ABANDON : zwadj-db ne répond pas")
noms = [l.split("/")[-1] for l in git("ls-tree", "--name-only", "HEAD", DOSSIER + "/").decode("utf-8").splitlines()]
dirs = sorted(n for n in noms if re.match(r"^\d{14}_", n))
if not dirs or not dirs[-1].endswith(NOM_LOT):
    sys.exit(f"✗ ABANDON : la dernière migration de HEAD n'est pas `{NOM_LOT}` ({dirs[-1] if dirs else '—'})")
sql_de = {d: git("show", f"HEAD:{DOSSIER}/{d}/migration.sql").decode("utf-8") for d in dirs}
anterieures, derniere = dirs[:-1], dirs[-1]
print(f"migrations lues dans les blobs de HEAD ({git('rev-parse', '--short', 'HEAD').decode().strip()}) : {len(dirs)} dossier(s) · la dernière : {derniere} · {len(anterieures)} antérieure(s)")

# ── 1. La POSE de chaque mutation est prouvée (D286, D325) AVANT de s'en servir.
original = sql_de[derniere]
variantes = {"témoin": original}
for nom, (ancre, marque) in MUTANTS.items():
    na, nm = original.count(ancre), original.count(marque)
    mute = original.replace(ancre, marque)
    pose = (na == 1 and nm == 0 and mute.count(ancre) == 0 and mute.count(marque) == 1 and marque not in ancre)
    print(f"pose {nom} : ancre {na}→{mute.count(ancre)} · marqueur {nm}→{mute.count(marque)} · le remplacement n'est pas une sous-chaîne de l'ancre : {marque not in ancre} · {'POSÉE' if pose else 'NON POSÉE'}")
    if not pose:
        sys.exit(f"✗ ABANDON : la mutation {nom} n'est pas prouvée posée")
    variantes[nom] = mute

# ── 2. L'état du serveur AVANT : la base de développement n'est pas touchée.
def etat_serveur() -> tuple[str, str]:
    bases = ",".join(requete("postgres", "SELECT datname FROM pg_database WHERE datname NOT LIKE 'zwadj_equiv_%' ORDER BY 1;"))
    migrations = requete("zwadj", "SELECT count(*) || ' migrations, dernière ' || max(migration_name) FROM _prisma_migrations;")[0]
    return bases, migrations

avant = etat_serveur()
print(f"AVANT — bases (hors zwadj_equiv_*) : {avant[0]} · base `zwadj` : {avant[1]}")

# ── 3. La base de départ : les migrations antérieures, une graine minimale (celle de `migration-non-empty.int-spec.ts`).
SEMIS = [
    "INSERT INTO wilayas (id, code, name_fr, name_ar) VALUES (uuidv7(), 16, 'Alger', 'الجزائر')",
    "INSERT INTO cities (id, wilaya_id, name_fr, name_ar, lat, lng) SELECT uuidv7(), id, 'Hydra', 'حيدرة', 36.7, 3.0 FROM wilayas",
    "INSERT INTO users (id, email, password_hash, role, status, email_verified_at, locale, created_at, updated_at) VALUES (uuidv7(), 'p@example.dz', '$argon2id$fake', 'PRO', 'ACTIVE', now(), 'fr', now(), now())",
    "INSERT INTO pro_profiles (id, user_id, business_name, phone, created_at, updated_at) SELECT uuidv7(), id, 'P', '+213550000001', now(), now() FROM users",
    "INSERT INTO venues (id, owner_id, city_id, slug, name_fr, name_ar, capacity_max, base_price_cents, publication_status, created_at, updated_at) SELECT uuidv7(), p.id, c.id, 's', 'S', 'ق', 200, 100, 'PUBLISHED', now(), now() FROM pro_profiles p CROSS JOIN cities c LIMIT 1",
]
DEVIS = (f"INSERT INTO quotes (id, venue_id, status, version, chain_id, event_date, guests, base_price_cents, services_total_cents, total_cents, deposit_cents, lines, reference_year, reference_number) "
         f"SELECT '{QUOTE_ID}'::uuid, v.id, 'DRAFT', 1, '{QUOTE_ID}'::uuid, current_date + 1, 100, 150000000, 0, 150000000, 45000000, '[]'::jsonb, 2026, 1 FROM venues v")

creees: list[str] = []


def supprimer_tout() -> None:
    for db in [BASE, *[f"zwadj_equiv_{i}" for i in ("temoin", "m2", "m5", "m4")]]:
        psql("postgres", f'DROP DATABASE IF EXISTS "{db}" WITH (FORCE);', arret=False)


code_sortie = 2
try:
    supprimer_tout()
    requete("postgres", f'CREATE DATABASE "{BASE}";')
    creees.append(BASE)
    for d in anterieures:
        c, o, e = psql(BASE, sql_de[d], une_transaction=True)
        if c != 0:
            sys.exit(f"✗ ABANDON : la migration {d} n'a pas pu s'appliquer sur la base de départ : {(e or o).strip()[:400]}")
    for s in SEMIS:
        c, o, e = psql(BASE, s + ";")
        if c != 0:
            sys.exit(f"✗ ABANDON : la graine a échoué : {(e or o).strip()[:400]} ({s[:60]})")
    print(f"base de départ : {len(anterieures)} migrations appliquées, graine posée ({len(SEMIS)} insertions)")

    # ── 4. Les étiquettes se RELÈVENT dans le catalogue, elles ne s'écrivent pas de mémoire.
    typ_statut = requete(BASE, "SELECT udt_name FROM information_schema.columns WHERE table_name='quotes' AND column_name='status';")[0]
    typ_via = requete(BASE, "SELECT udt_name FROM information_schema.columns WHERE table_name='quotes' AND column_name='sent_via';")[0]
    statuts = requete(BASE, f'SELECT unnest(enum_range(NULL::"{typ_statut}"));')
    # ⛔ DÉFAUT D'INSTRUMENT, trouvé à la première passe (D298) : `sent_via` n'est PAS une énumération — le catalogue répond `text` (CHECK : non vide) — et `enum_range(NULL::"text")` n'existe pas. Je l'avais écrit
    # en supposant une énumération, de mémoire. La grille ne lit que NULL / non nul : UN témoin non nul, RELEVÉ de l'autorité (`QUOTE_SENT_VIA.PRINT` dans `packages/types/src/quote.ts`, blob de HEAD), jamais écrit ici.
    if typ_via == "text":
        m_via = re.search(r'PRINT:\s*"([A-Z_]+)"', git("show", "HEAD:packages/types/src/quote.ts").decode("utf-8"))
        if m_via is None:
            sys.exit("✗ ABANDON : `QUOTE_SENT_VIA.PRINT` introuvable dans quote.ts")
        vias = [m_via.group(1)]
    else:
        vias = requete(BASE, f'SELECT unnest(enum_range(NULL::"{typ_via}"));')
    print(f"énumération `{typ_statut}` relevée dans le catalogue : {statuts} · `{typ_via}` : {vias}")
    if len(statuts) < 2 or len(vias) < 1:
        sys.exit("✗ ABANDON : énumérations introuvables")

    # ── 5. Une base par variante, copiée de la base de départ, où seule la dernière migration diffère.
    suffixe = {"témoin": "temoin", "M-2": "m2", "M-5": "m5", "M-4": "m4"}
    for nom, texte in variantes.items():
        db = f"zwadj_equiv_{suffixe[nom]}"
        requete("postgres", f'CREATE DATABASE "{db}" TEMPLATE "{BASE}";')
        creees.append(db)
        c, o, e = psql(db, texte, une_transaction=True)
        if c != 0:
            sys.exit(f"✗ ABANDON : la migration de {nom} n'a pas pu s'appliquer : {(e or o).strip()[:400]}")
        c, o, e = psql(db, DEVIS + ";\nUPDATE quotes SET is_official = false;\n", une_transaction=True)
        if c != 0:
            sys.exit(f"✗ ABANDON : le devis de départ de {nom} n'a pas pu s'écrire : {(e or o).strip()[:400]}")
    print(f"variantes : {', '.join(variantes)} · une base jetable chacune, un devis NON officiel (DRAFT) chacune")

    # Le catalogue dit ce que les AUTRES contraintes exigent : on le lit, on ne le récite pas.
    print("--- contraintes lues dans le catalogue de la base `témoin` (pg_get_constraintdef) :")
    for nom in ("quotes_unofficial_inert", "quotes_sent_at_coherent", "quotes_accepted_at_coherent"):
        d = requete("zwadj_equiv_temoin", f"SELECT pg_get_constraintdef(oid) FROM pg_constraint WHERE conname = '{nom}' AND conrelid = 'quotes'::regclass;")
        print(f"   {nom} : {re.sub(chr(10) + '+', ' ', d[0]) if d else 'ABSENTE'}")
        if not d:
            sys.exit(f"✗ ABANDON : la contrainte {nom} est absente du catalogue")

    # ── 6. L'énumération. Chaque état dans sa propre transaction, annulée.
    grille = list(itertools.product(statuts, [None, vias[0]], [False, True], [False, True]))
    print(f"grille : {len(statuts)} statuts × 2 sent_via × 2 sent_at × 2 accepted_at = {len(grille)} états (attendu : {len(statuts) * 8})")

    def decrire(etat) -> str:
        s, via, sa, aa = etat
        return f"statut {s:<10} sent_via {'—' if via is None else via:<6} sent_at {'oui' if sa else '—':<3} accepted_at {'oui' if aa else '—':<3}"

    def jouer(db: str) -> list[tuple[bool, str]]:
        script = []
        for i, (s, via, sa, aa) in enumerate(grille):
            sets = (f"status = '{s}', sent_via = {'NULL' if via is None else repr(via)}, sent_at = {'now()' if sa else 'NULL'}, accepted_at = {'now()' if aa else 'NULL'}")
            script.append(f"\\echo @@ {i}\nBEGIN;\nUPDATE quotes SET {sets} WHERE id = '{QUOTE_ID}'::uuid RETURNING id;\nROLLBACK;")
        c, sortie, _ = psql(db, "\n".join(script) + "\n", arret=False, fusion=True)
        blocs = re.split(r"^@@ (\d+)$", sortie, flags=re.M)
        res: dict[int, tuple[bool, str]] = {}
        for k in range(1, len(blocs), 2):
            corps = blocs[k + 1]
            admis = QUOTE_ID in corps and "ERROR" not in corps
            m = re.search(r'violates check constraint "([^"]+)"', corps) or re.search(r"ERROR:\s+([^\n]{0,70})", corps)
            res[int(blocs[k])] = (admis, "" if admis else (m.group(1) if m else "?"))
        if len(res) != len(grille):
            sys.exit(f"✗ ABANDON : {len(res)} états lus sur {len(grille)} dans la sortie de {db}")
        return [res[i] for i in range(len(grille))]

    resultats = {nom: jouer(f"zwadj_equiv_{suffixe[nom]}") for nom in variantes}
    for nom, r in resultats.items():
        print(f"{nom:7} : {len(r)} états parcourus · {sum(1 for a, _ in r if a)} admis · {sum(1 for a, _ in r if not a)} refusés")

    # ── 7. CALIBRATION : deux bras.
    temoin = resultats["témoin"]
    cal = [
        ("positif : le témoin ADMET au moins un état", any(a for a, _ in temoin)),
        ("positif : le témoin REFUSE au moins un état", any(not a for a, _ in temoin)),
        ("positif : la CONTRE-ÉPREUVE M-4 diffère du témoin sur au moins un état", any(resultats["M-4"][i][0] != temoin[i][0] for i in range(len(grille)))),
    ]
    for texte, ok in cal:
        print(f"   {'✓' if ok else '✗'} calibration — {texte}")
    if not all(ok for _, ok in cal):
        sys.exit("✗ ABANDON : calibration manquée — l'instrument ne sait pas voir une différence, ou ne voit rien")
    print(f"   calibration : {len(cal)} bras, 0 manqué")

    # ── 8. Le verdict, état par état.
    verdict = {}
    for nom in ("M-2", "M-5", "M-4"):
        r = resultats[nom]
        diff = [i for i in range(len(grille)) if r[i][0] != temoin[i][0]]
        autre = [i for i in range(len(grille)) if r[i][0] == temoin[i][0] and not r[i][0] and r[i][1] != temoin[i][1]]
        verdict[nom] = (diff, autre)
        print(f"\n■ {nom} : {len(grille)} états comparés au témoin · décision d'admission DIFFÉRENTE : {len(diff)} · même refus mais par une AUTRE contrainte : {len(autre)}")
        for i in diff:
            print(f"   DIFFÉRENT  {decrire(grille[i])} · témoin : {'admis' if temoin[i][0] else 'refusé par ' + temoin[i][1]} · {nom} : {'admis' if r[i][0] else 'refusé par ' + r[i][1]}")
        for i in autre:
            print(f"   même refus {decrire(grille[i])} · témoin : {temoin[i][1]} · {nom} : {r[i][1]}")
    ok = not verdict["M-2"][0] and not verdict["M-5"][0] and bool(verdict["M-4"][0])
    print("\nBILAN : " + " · ".join(f"{n} : {'ÉQUIVALENTE' if not verdict[n][0] else 'DIFFÉRENTE (' + str(len(verdict[n][0])) + ' état(s))'}" for n in ("M-2", "M-5", "M-4"))
          + f" · états parcourus par variante : {len(grille)} (attendu : {len(statuts) * 8})  (attendu : M-2 ÉQUIVALENTE · M-5 ÉQUIVALENTE · M-4 DIFFÉRENTE)")
    code_sortie = 0 if ok else 1
finally:
    supprimer_tout()
    try:
        apres = etat_serveur()
        print(f"APRÈS — bases (hors zwadj_equiv_*) : {apres[0]} · base `zwadj` : {apres[1]}")
        print(f"état du serveur identique avant/après : {apres == avant} (attendu : True) · bases jetables supprimées : {not any(l.startswith('zwadj_equiv_') for l in requete('postgres', 'SELECT datname FROM pg_database;'))}")
        if apres != avant:
            code_sortie = 2
    except SystemExit:
        code_sortie = 2
sys.exit(code_sortie)
