"""D333 — les PRÉMISSES de PostgreSQL dont le cadrage de L35-3 dépend, MESURÉES sur une base jetable AVANT d'écrire le code (D231 : vérifier la prémisse avant de coder la demande).

POURQUOI IL EXISTE. Le cadrage (« ⛔ CADRAGE DU SOUS-LOT L35-3 », `ZWADJ_CONTINUITE.md`) pose six affirmations sur le moteur : (1) une ligne peut référencer ELLE-MÊME par une clé étrangère composite IMMÉDIATE (la tête de chaîne
naît avec `chain_id = id`) ; (2) cette clé refuse une version dont l'année, le numéro ou la salle diffèrent de la tête ; (3) l'index unique partiel `WHERE version = 1` refuse deux têtes au même numéro et ACCEPTE une version 2 qui
reprend le numéro ; (4) `INSERT … ON CONFLICT DO UPDATE … RETURNING` donne 1, 2, 3, et une transaction annulée REND son numéro ; (5) `AT TIME ZONE 'Africa/Algiers'` met le 31/12 à 23 h 00 UTC en année SUIVANTE et à 22 h 59 UTC
en année courante ; (6) un `nextval` annulé laisse un TROU, jamais une répétition, et un déclencheur peut interdire de modifier un numéro. Écrire le code sur ces six affirmations sans les avoir mesurées serait croire sa mémoire.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D333/releve-code/premisses-postgres.py > docs/preuves/D333/releve-code/premisses-postgres-sortie.txt

LECTURE ET ÉCRITURE SUR UNE BASE JETABLE SEULEMENT. Le script crée `d333_premisses` (nom fixe, jamais une base de travail), y joue des tables qui IMITENT `venues` et `quotes` par leurs seules colonnes utiles, puis la supprime. Il ne touche
ni `zwadj`, ni `zwadj_test`, ni aucune donnée de développement. Il passe par `docker exec zwadj-db psql` (le conteneur de `docker-compose.yml`, utilisateur et base du compose). DONNÉE NON CERTIFIANTE : un diagnostic, pas une porte.

INSTRUMENTS ÉCARTÉS : lire la documentation de PostgreSQL (elle dit ce que le moteur DEVRAIT faire, pas ce que la version 18.4 du conteneur FAIT) ; jouer les migrations du lot (elles n'existent pas encore).

CALIBRATION : chaque prémisse est une PAIRE — un cas qui doit être ACCEPTÉ et un cas qui doit être REFUSÉ, par le même mécanisme. Un détecteur qui dirait « refusé » à tout ou « accepté » à tout manque un des deux bras ; l'abandon est
immédiat si un seul bras manque son verdict.
"""
import os
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

CONTENEUR, UTILISATEUR, BASE_JETABLE = "zwadj-db", "zwadj", "d333_premisses"
manques = 0


def psql(base, sql, tolerer=True):
    """Joue du SQL, rend (code de sortie, sortie standard, erreur). `-v ON_ERROR_STOP=0` : une erreur n'arrête pas le script, elle s'imprime — c'est ce que l'on mesure."""
    r = subprocess.run(["docker", "exec", "-i", CONTENEUR, "psql", "-U", UTILISATEUR, "-d", base, "-X", "-q", "-A", "-t", "-F", "|", "-v", "ON_ERROR_STOP=0"],
                       input=sql.encode("utf-8"), capture_output=True)
    return r.returncode, r.stdout.decode("utf-8", errors="replace").strip(), r.stderr.decode("utf-8", errors="replace").strip()


def verdict(libelle, attendu, mesure):
    global manques
    ok = attendu == mesure
    manques += 0 if ok else 1
    print(f"   {'✓' if ok else '✗'} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def etat_sql(err):
    """Le SQLSTATE d'une erreur psql (lignes « ERROR:  … » ; le code se lit dans le détail : on prend le premier code connu cité)."""
    for code, mots in (("23503", "foreign key"), ("23505", "unique"), ("23514", "check"), ("P0001", "immuable")):
        if mots in err.lower():
            return code
    return "" if not err else "AUTRE"


print("== PRÉMISSES DE POSTGRESQL (base jetable)")
code, version, _ = psql("postgres", "SELECT version();")
print(f"   serveur : {version.split(',')[0]}")
if code != 0 or "PostgreSQL 18" not in version:
    sys.exit("ABANDON : le conteneur de développement n'est pas joignable ou n'est pas PostgreSQL 18")
psql("postgres", f'DROP DATABASE IF EXISTS "{BASE_JETABLE}";')
psql("postgres", f'CREATE DATABASE "{BASE_JETABLE}";')
try:
    psql(BASE_JETABLE, """
CREATE TABLE venues (id uuid PRIMARY KEY DEFAULT uuidv7(), name text, created_at timestamptz NOT NULL DEFAULT now());
CREATE TABLE quotes (
  id uuid PRIMARY KEY DEFAULT uuidv7(), venue_id uuid NOT NULL REFERENCES venues(id), chain_id uuid NOT NULL, version int NOT NULL DEFAULT 1,
  reference_year smallint NOT NULL, reference_number int NOT NULL, created_at timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT quotes_chain_version_unique UNIQUE (chain_id, version),
  CONSTRAINT quotes_head_reference_key UNIQUE (id, venue_id, reference_year, reference_number),
  CONSTRAINT quotes_chain_head_fkey FOREIGN KEY (chain_id, venue_id, reference_year, reference_number)
    REFERENCES quotes (id, venue_id, reference_year, reference_number) ON DELETE RESTRICT ON UPDATE RESTRICT
);
CREATE UNIQUE INDEX quotes_reference_head_unique ON quotes (venue_id, reference_year, reference_number) WHERE version = 1;
CREATE TABLE quote_number_counters (venue_id uuid NOT NULL REFERENCES venues(id), year smallint NOT NULL, last_number integer NOT NULL, PRIMARY KEY (venue_id, year), CHECK (last_number >= 1));
INSERT INTO venues (id, name) VALUES ('00000000-0000-7000-8000-000000000001', 'A'), ('00000000-0000-7000-8000-000000000002', 'B');
""")
    A, B = "00000000-0000-7000-8000-000000000001", "00000000-0000-7000-8000-000000000002"

    print("\n[1] une tête naît avec chain_id = id, en UNE écriture, sous une clé étrangère composite IMMÉDIATE")
    _, sortie, err = psql(BASE_JETABLE, f"""
WITH n AS (SELECT uuidv7() AS id) INSERT INTO quotes (id, venue_id, chain_id, version, reference_year, reference_number)
  SELECT id, '{A}', id, 1, 2026, 1 FROM n RETURNING (id = chain_id);""")
    verdict("la tête (chain_id = id) est ACCEPTÉE", ("t", ""), (sortie.split("\n")[0], etat_sql(err)))
    _, sortie, err = psql(BASE_JETABLE, f"INSERT INTO quotes (venue_id, chain_id, version, reference_year, reference_number) VALUES ('{A}', '00000000-0000-7000-8000-0000000000ff', 1, 2026, 2);")
    verdict("…et la tête à chain_id PROVISOIRE (l'ancien code) est REFUSÉE par la même clé (c'est la raison de S-22)", "23503", etat_sql(err))

    print("\n[2] la clé composite refuse une version qui n'est pas celle de sa tête")
    _, tete, _ = psql(BASE_JETABLE, f"SELECT id FROM quotes WHERE version = 1 AND venue_id = '{A}' AND reference_number = 1;")
    _, sortie, err = psql(BASE_JETABLE, f"INSERT INTO quotes (venue_id, chain_id, version, reference_year, reference_number) VALUES ('{A}', '{tete}', 2, 2026, 1) RETURNING version;")
    verdict("une version 2 qui recopie année et numéro de sa tête est ACCEPTÉE", ("2", ""), (sortie.split("\n")[0], etat_sql(err)))
    for libelle, annee, numero, salle in (("un autre NUMÉRO", 2026, 7, A), ("une autre ANNÉE", 2027, 1, A), ("une autre SALLE", 2026, 1, B)):
        _, _, err = psql(BASE_JETABLE, f"INSERT INTO quotes (venue_id, chain_id, version, reference_year, reference_number) VALUES ('{salle}', '{tete}', 3, {annee}, {numero});")
        verdict(f"une version 3 avec {libelle} est REFUSÉE", "23503", etat_sql(err))

    print("\n[3] l'index unique partiel (version = 1)")
    _, _, err = psql(BASE_JETABLE, f"WITH n AS (SELECT uuidv7() AS id) INSERT INTO quotes (id, venue_id, chain_id, version, reference_year, reference_number) SELECT id, '{A}', id, 1, 2026, 1 FROM n;")
    verdict("une SECONDE tête de même (salle, année, numéro) est REFUSÉE", "23505", etat_sql(err))
    _, sortie, err = psql(BASE_JETABLE, f"SELECT count(*) FROM quotes WHERE venue_id = '{A}' AND reference_year = 2026 AND reference_number = 1;")
    verdict("…alors que la tête ET sa version 2 portent le même numéro sans conflit (le filtre est ce qui le permet)", ("2", ""), (sortie.strip(), etat_sql(err)))

    print("\n[4] le compteur : INSERT … ON CONFLICT DO UPDATE … RETURNING")
    inc = f"INSERT INTO quote_number_counters (venue_id, year, last_number) VALUES ('{A}', 2030, 1) ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1 RETURNING last_number;"
    valeurs = [psql(BASE_JETABLE, inc)[1] for _ in range(3)]
    verdict("trois incréments successifs donnent 1, 2, 3", ["1", "2", "3"], valeurs)
    _, sortie, _ = psql(BASE_JETABLE, "BEGIN;\n" + inc + "\nROLLBACK;\nSELECT last_number FROM quote_number_counters WHERE year = 2030;")
    verdict("un incrément ANNULÉ ne bouge pas le compteur (la sortie : la valeur rendue dans la transaction, puis la valeur relue)", ["4", "3"], sortie.split("\n")[:2])
    _, sortie, _ = psql(BASE_JETABLE, inc.replace("2030", "2031"))
    verdict("une AUTRE année repart à 1 (une ligne par salle et année)", "1", sortie)

    print("\n[5] l'année d'Alger")
    for instant, attendu in (("2026-12-31 22:59:59+00", "2026"), ("2026-12-31 23:00:00+00", "2027"), ("2026-12-31 23:30:00+00", "2027"), ("2027-01-01 00:00:00+00", "2027"), ("2026-06-15 12:00:00+00", "2026")):
        _, sortie, _ = psql(BASE_JETABLE, f"SELECT EXTRACT(YEAR FROM TIMESTAMPTZ '{instant}' AT TIME ZONE 'Africa/Algiers')::int;")
        verdict(f"{instant} ⇒ année d'Alger", attendu, sortie)
    _, sortie, _ = psql(BASE_JETABLE, "SELECT TIMESTAMPTZ '2026-12-31 23:30:00+00' AT TIME ZONE 'Africa/Algiers' = TIMESTAMPTZ '2026-12-31 23:30:00+00' AT TIME ZONE 'UTC' + interval '1 hour';")
    verdict("Africa/Algiers = UTC + 1 heure à cette date (D48 : sans heure d'été)", "t", sortie)

    print("\n[6] la séquence, et l'immuabilité")
    psql(BASE_JETABLE, "CREATE SEQUENCE venue_number_seq AS integer; ALTER TABLE venues ADD COLUMN number integer UNIQUE;")
    _, sortie, _ = psql(BASE_JETABLE, "INSERT INTO venues (name, number) VALUES ('C', nextval('venue_number_seq')) RETURNING number;")
    premier = sortie.split("\n")[0]
    psql(BASE_JETABLE, "BEGIN;\nSELECT nextval('venue_number_seq');\nROLLBACK;")
    _, sortie, _ = psql(BASE_JETABLE, "INSERT INTO venues (name, number) VALUES ('D', nextval('venue_number_seq')) RETURNING number;")
    verdict("un nextval ANNULÉ laisse un TROU (le numéro suivant saute une valeur, il ne se répète pas)", (int(premier) + 2), int(sortie.split("\n")[0]))
    _, _, err = psql(BASE_JETABLE, f"INSERT INTO venues (name, number) VALUES ('E', {premier});")
    verdict("un numéro déjà pris est REFUSÉ par l'unicité", "23505", etat_sql(err))
    psql(BASE_JETABLE, """
CREATE FUNCTION venues_number_immuable() RETURNS trigger AS $$ BEGIN IF NEW.number IS DISTINCT FROM OLD.number THEN RAISE EXCEPTION 'venues.number est immuable'; END IF; RETURN NEW; END; $$ LANGUAGE plpgsql;
CREATE TRIGGER venues_number_immuable BEFORE UPDATE OF number ON venues FOR EACH ROW EXECUTE FUNCTION venues_number_immuable();""")
    _, _, err = psql(BASE_JETABLE, "UPDATE venues SET number = 99 WHERE name = 'C';")
    verdict("modifier le numéro est REFUSÉ par le déclencheur", "P0001", etat_sql(err))
    _, sortie, err = psql(BASE_JETABLE, "UPDATE venues SET name = 'C2' WHERE name = 'C' RETURNING name;")
    verdict("…et modifier une AUTRE colonne reste ACCEPTÉ", ("C2", ""), (sortie.split("\n")[0], etat_sql(err)))
finally:
    psql("postgres", f'DROP DATABASE IF EXISTS "{BASE_JETABLE}";')
    _, reste, _ = psql("postgres", f"SELECT count(*) FROM pg_database WHERE datname = '{BASE_JETABLE}';")
    print(f"\n   base jetable supprimée : {'oui' if reste == '0' else 'NON'} (attendu : oui)")

print(f"\n== BILAN : {manques} prémisse(s) manquée(s) (attendu 0)")
sys.exit(1 if manques else 0)
