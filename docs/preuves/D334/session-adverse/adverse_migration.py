"""D334 — SESSION ADVERSE de L35-3 · SONDE 1 : les migrations A et B rejouées sur (a) une COPIE de la base de développement, (b) une base aux cas durs, (c) une base à chaîne cassée.

Modes de défaillance visés (cadrage de L35-3, § 3) : F-5 (migration sur une base non vide : salles supprimées, chaînes de révisions, année d'Alger, `setval`, ordre), F-6 (la séquence part du bon
maximum), F-3 (le 31 décembre à 23 h 00 UTC), F-4 (une révision garde année et numéro), et « donnée perdue / montant touché » (rien d'autre que les colonnes neuves ne change).

TOUT ATTENDU EST CALCULÉ ICI, en Python, depuis l'état d'AVANT migration relu en SQL — jamais depuis ce que la migration a écrit, jamais de mémoire. La base de développement `zwadj` n'est pas touchée :
les sondes travaillent sur des copies (`TEMPLATE zwadj`), supprimées à la fin.
USAGE (racine) : python3 docs/preuves/D334/session-adverse/adverse_migration.py
"""
import os
import sys
from datetime import datetime, timedelta

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adverse_outils import (appliquer_fichier, bilan, constat, creer_base, entete, migrate_deploy, migrations_du_depot, sql, sql_json, sql_ok, supprimer_base, valeur, verdict)  # noqa: E402

DEV = "zwadj"
A_FAIRE = [d for d in migrations_du_depot() if d >= "20261015100000"]
MIG_A, MIG_B = "20261015100000_venue_number", "20261015100100_quote_reference"
FMT = "YYYY-MM-DD\"T\"HH24:MI:SS.US"


def lire_etat(base: str):
    venues = sql_json(base, f"SELECT json_agg(json_build_object('id', id, 'created', to_char(created_at AT TIME ZONE 'UTC', '{FMT}'), 'deleted', deleted_at IS NOT NULL) ORDER BY created_at, id) FROM venues") or []
    quotes = sql_json(base, f"SELECT json_agg(json_build_object('id', id, 'venue', venue_id, 'version', version, 'chain', chain_id, 'created', to_char(created_at AT TIME ZONE 'UTC', '{FMT}')) ORDER BY created_at, id) FROM quotes") or []
    return venues, quotes


def annee_alger(iso_utc: str) -> int:
    d = datetime.strptime(iso_utc, "%Y-%m-%dT%H:%M:%S.%f")
    return (d + timedelta(hours=1)).year


def attendu_numerotation(venues, quotes):
    """Les numéros que R3 exige, recalculés depuis l'état d'avant : salles par (created_at, id) toutes confondues ; têtes par (salle, année d'Alger) puis (created_at, id) ; révisions = leur tête."""
    num_salle = {v["id"]: i + 1 for i, v in enumerate(sorted(venues, key=lambda v: (v["created"], v["id"])))}
    tetes = [q for q in quotes if q["version"] == 1]
    ref = {}
    compteur: dict = {}
    for q in sorted(tetes, key=lambda q: (q["created"], q["id"])):
        cle = (q["venue"], annee_alger(q["created"]))
        compteur[cle] = compteur.get(cle, 0) + 1
        ref[q["id"]] = (cle[1], compteur[cle])
    for q in quotes:
        if q["version"] > 1:
            ref[q["id"]] = ref.get(q["chain"])
    return num_salle, ref, compteur


def relire_apres(base: str):
    salles = sql_json(base, "SELECT json_agg(json_build_object('id', id, 'number', number) ORDER BY id) FROM venues") or []
    refs = sql_json(base, "SELECT json_agg(json_build_object('id', id, 'y', reference_year, 'n', reference_number) ORDER BY id) FROM quotes") or []
    cpt = sql_json(base, "SELECT json_agg(json_build_object('v', venue_id, 'y', year, 'n', last_number) ORDER BY venue_id, year) FROM quote_number_counters") or []
    return {s["id"]: s["number"] for s in salles}, {r["id"]: (r["y"], r["n"]) for r in refs}, {(c["v"], c["y"]): c["n"] for c in cpt}


def comparer(ident: str, base: str, venues, quotes, empreintes_avant):
    num_salle, ref, compteur = attendu_numerotation(venues, quotes)
    salles, refs, cpt = relire_apres(base)
    verdict(f"{ident}-salles", "les numéros de salle (toutes, supprimées comprises) sont ceux de l'ordre (created_at, id) recalculé en Python", num_salle, salles)
    verdict(f"{ident}-devis", "année d'Alger et numéro de CHAQUE devis (têtes numérotées par salle et année, révisions = leur tête) = recalcul indépendant", ref, refs)
    verdict(f"{ident}-compteurs", "les compteurs = le plus grand numéro de chaque (salle, année), et AUCUN compteur en trop", compteur, cpt)
    seq = valeur(base, "SELECT last_value || ',' || is_called FROM venue_number_seq")
    maxi = max(num_salle.values()) if num_salle else None
    verdict(f"{ident}-sequence", "la séquence des salles est AU maximum, déjà appelée (la prochaine salle prend max + 1) ; table vide : valeur 1 non appelée", f"{maxi},true" if maxi else "1,false", seq)
    apres = {
        "quotes": valeur(base, "SELECT md5(coalesce(string_agg((to_jsonb(q) - 'reference_year' - 'reference_number')::text, '' ORDER BY id), '')) FROM quotes q"),
        "venues": valeur(base, "SELECT md5(coalesce(string_agg((to_jsonb(v) - 'number')::text, '' ORDER BY id), '')) FROM venues v"),
    }
    verdict(f"{ident}-intacts", "donnée perdue / montant touché : l'empreinte de TOUTES les autres colonnes des devis et des salles est celle d'avant", empreintes_avant, apres)
    n_apres = (int(valeur(base, "SELECT count(*) FROM venues")), int(valeur(base, "SELECT count(*) FROM quotes")))
    verdict(f"{ident}-lignes", "aucune ligne perdue ni ajoutée (salles, devis)", (len(venues), len(quotes)), n_apres)


def empreintes(base: str):
    return {
        "quotes": valeur(base, "SELECT md5(coalesce(string_agg(to_jsonb(q)::text, '' ORDER BY id), '')) FROM quotes q"),
        "venues": valeur(base, "SELECT md5(coalesce(string_agg(to_jsonb(v)::text, '' ORDER BY id), '')) FROM venues v"),
    }


def colonnes_de(base: str, table: str, exclure=()):
    out = sql_ok(base, f"SELECT column_name FROM information_schema.columns WHERE table_name='{table}' AND table_schema='public' ORDER BY ordinal_position")
    return [c for c in out.split() if c not in exclure]


def cloner(base: str, table: str, modele_id: str, surcharges: dict):
    """INSERT … SELECT qui recopie une ligne modèle en surchargeant des colonnes ; `surcharges` : colonne → expression SQL."""
    cols = [c for c in colonnes_de(base, table) if c != "number" or "number" in surcharges]
    selection = ", ".join(surcharges.get(c, f'"{c}"') for c in cols)
    liste = ", ".join(f'"{c}"' for c in cols)
    sql_ok(base, f'INSERT INTO "{table}" ({liste}) SELECT {selection} FROM "{table}" WHERE id = \'{modele_id}\';')


def main() -> int:
    # ───────────────────────── (a) la COPIE de la base de développement ─────────────────────────
    entete("SONDE 1a — migrations A et B (`prisma migrate deploy`) sur une COPIE de la base de développement")
    verdict("M-0", "les migrations que le dépôt ajoute après la base de développement sont exactement les deux de L35-3", [MIG_A, MIG_B], A_FAIRE)
    creer_base("zwadj_adverse_dev", DEV)
    appliquees = valeur("zwadj_adverse_dev", "SELECT count(*) FROM _prisma_migrations")
    derniere = valeur("zwadj_adverse_dev", "SELECT max(migration_name) FROM _prisma_migrations")
    verdict("M-1", "la copie de la base de développement n'a PAS les deux migrations (27 appliquées ; la dernière n'est pas celle de L35-3)", (len(migrations_du_depot()) - 2, True), (int(appliquees), derniere < MIG_A))
    venues, quotes = lire_etat("zwadj_adverse_dev")
    avant = empreintes("zwadj_adverse_dev")
    print(f"   état d'avant : {len(venues)} salles dont {sum(1 for v in venues if v['deleted'])} supprimée(s) ; {len(quotes)} devis dont {sum(1 for q in quotes if q['version'] > 1)} révision(s)")
    code, sortie = migrate_deploy("zwadj_adverse_dev")
    verdict("M-2", "`prisma migrate deploy` sort en 0 et applique les deux migrations", (0, True, True), (code, MIG_A in sortie, MIG_B in sortie))
    if code != 0:
        print(sortie[-1500:])
    comparer("M-3", "zwadj_adverse_dev", venues, quotes, avant)
    appl = valeur("zwadj_adverse_dev", "SELECT count(*) FILTER (WHERE finished_at IS NOT NULL AND rolled_back_at IS NULL) || ',' || count(*) FROM _prisma_migrations")
    verdict("M-4", "`_prisma_migrations` : les 29 migrations sont terminées, aucune annulée", f"{len(migrations_du_depot())},{len(migrations_du_depot())}", appl)
    # les contraintes sont VALIDES (pas posées NOT VALID) et nommées comme le cadrage les nomme
    contraintes = sql_ok("zwadj_adverse_dev", "SELECT conname || ':' || convalidated FROM pg_constraint WHERE conname IN ('quotes_chain_head_fkey','quotes_head_reference_key','venues_number_key','venues_number_positive','quotes_reference_number_positive','quotes_reference_year_range','quote_number_counters_pkey','quote_number_counters_last_number_positive','quote_number_counters_year_range') ORDER BY 1").split()
    verdict("M-5", "les neuf contraintes de L35-3 existent et sont VALIDÉES", sorted(f"{n}:true" for n in ["quotes_chain_head_fkey", "quotes_head_reference_key", "venues_number_key", "venues_number_positive", "quotes_reference_number_positive", "quotes_reference_year_range", "quote_number_counters_pkey", "quote_number_counters_last_number_positive", "quote_number_counters_year_range"]), sorted(contraintes))
    idx = valeur("zwadj_adverse_dev", "SELECT pg_get_indexdef(indexrelid) FROM pg_index WHERE indexrelid = 'quotes_reference_head_unique'::regclass")
    verdict("M-6", "l'index `quotes_reference_head_unique` est UNIQUE, PARTIEL (`WHERE version = 1`)", (True, True), ("CREATE UNIQUE INDEX" in idx, "WHERE (version = 1)" in idx))
    # la migration rejouée UNE SECONDE FOIS à la main échoue proprement (rien à refaire) et ne détruit rien
    avant_rejeu = relire_apres("zwadj_adverse_dev")
    code2, _, err2 = appliquer_fichier("zwadj_adverse_dev", MIG_B)
    verdict("M-7", "rejouer B sur une base déjà migrée ÉCHOUE (la table existe) — et ne change AUCUN numéro (salles, devis, compteurs relus avant/après)", (True, avant_rejeu), (code2 != 0, relire_apres("zwadj_adverse_dev")))

    # ───────────────────────── (b) la base aux CAS DURS ─────────────────────────
    entete("SONDE 1b — migrations A et B sur une base NON VIDE aux cas durs (copie de la base de développement + lignes synthétiques)")
    creer_base("zwadj_adverse_dur", DEV)
    v_modele = valeur(DEV, "SELECT id FROM venues WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1")
    q_modele = valeur(DEV, f"SELECT id FROM quotes WHERE version = 1 AND venue_id = '{v_modele}' ORDER BY created_at LIMIT 1") or valeur(DEV, "SELECT id FROM quotes WHERE version = 1 LIMIT 1")
    base = "zwadj_adverse_dur"
    # salles synthétiques : même created_at (départage par id), une supprimée, une sans devis
    for k, (slug, cree, supprime) in enumerate([("adv-x1", "2026-02-01 10:00:00+00", False), ("adv-x2", "2026-02-01 10:00:00+00", True), ("adv-x3", "2026-02-01 10:00:00+00", False), ("adv-zero", "2026-12-31 22:59:59.999999+00", False)], start=1):
        cloner(base, "venues", v_modele, {"id": "uuidv7()", "slug": f"'{slug}'", "name_fr": f"'{slug}'", "created_at": f"'{cree}'::timestamptz", "deleted_at": "now()" if supprime else "NULL", "matterport_model_id": "NULL"})
    ids = {s: valeur(base, f"SELECT id FROM venues WHERE slug='{s}'") for s in ("adv-x1", "adv-x2", "adv-x3", "adv-zero")}
    # devis synthétiques sur adv-x1 : frontières de l'année d'Alger, égalité de created_at, chaîne à trois versions dont deux écrites l'année suivante
    cas_tetes = [("2026-12-31 22:59:59.999999+00", "t1"), ("2026-12-31 23:00:00+00", "t2"), ("2027-01-01 00:00:00+00", "t3"), ("2027-01-01 00:00:00+00", "t4"), ("2026-06-01 12:00:00+00", "t5")]
    for cree, nom in cas_tetes:
        cloner(base, "quotes", q_modele, {"id": "uuidv7()", "venue_id": f"'{ids['adv-x1']}'", "created_at": f"'{cree}'::timestamptz", "version": "1", "parent_quote_id": "NULL", "chain_id": "id" if False else "uuidv7()", "status": "'DRAFT'", "sent_at": "NULL", "accepted_at": "NULL", "sent_via": "NULL"})
    # chain_id = id pour une tête (migration 20260802140000) : on le répare ici, comme le code d'avant le faisait
    sql_ok(base, f"UPDATE quotes SET chain_id = id WHERE venue_id = '{ids['adv-x1']}' AND version = 1;")
    tete6 = valeur(base, f"SELECT id FROM quotes WHERE venue_id='{ids['adv-x1']}' AND created_at = '2026-12-31 22:59:59.999999+00' LIMIT 1")
    for ver, cree, parent in [(2, "2027-02-01 09:00:00+00", tete6), (3, "2027-03-01 09:00:00+00", None)]:
        p = parent or valeur(base, f"SELECT id FROM quotes WHERE chain_id='{tete6}' AND version=2")
        cloner(base, "quotes", q_modele, {"id": "uuidv7()", "venue_id": f"'{ids['adv-x1']}'", "created_at": f"'{cree}'::timestamptz", "version": str(ver), "parent_quote_id": f"'{p}'", "chain_id": f"'{tete6}'", "status": "'DRAFT'", "sent_at": "NULL", "accepted_at": "NULL", "sent_via": "NULL"})
    # un devis sur la salle supprimée
    cloner(base, "quotes", q_modele, {"id": "uuidv7()", "venue_id": f"'{ids['adv-x2']}'", "created_at": "'2026-03-03 09:00:00+00'::timestamptz", "version": "1", "parent_quote_id": "NULL", "chain_id": "uuidv7()", "status": "'DRAFT'", "sent_at": "NULL", "accepted_at": "NULL", "sent_via": "NULL"})
    sql_ok(base, f"UPDATE quotes SET chain_id = id WHERE venue_id = '{ids['adv-x2']}' AND version = 1;")
    venues, quotes = lire_etat(base)
    avant = empreintes(base)
    print(f"   état d'avant : {len(venues)} salles ({sum(1 for v in venues if v['deleted'])} supprimées) ; {len(quotes)} devis ({sum(1 for q in quotes if q['version'] > 1)} révisions)")
    code, sortie = migrate_deploy(base)
    verdict("D-0", "`prisma migrate deploy` sur la base aux cas durs sort en 0", 0, code)
    if code != 0:
        print(sortie[-1500:])
    comparer("D-1", base, venues, quotes, avant)
    # les cas précis, lus séparément (une défaillance de l'extracteur de comparaison ne doit pas cacher le cas)
    lignes = sql_ok(base, f"SELECT to_char(created_at AT TIME ZONE 'UTC','MM-DD HH24:MI') || '|' || version || '|' || reference_year || '|' || reference_number FROM quotes WHERE venue_id='{ids['adv-x1']}' ORDER BY created_at, id").strip().splitlines()
    print("   devis de adv-x1 (créé UTC | version | année | numéro) :", lignes)
    annees = {l.split("|")[0]: l.split("|")[2] for l in lignes}
    verdict("D-2", "le devis créé le 31/12 à 22 h 59 UTC est de 2026, celui du 31/12 à 23 h 00 UTC est de 2027 (il est minuit à Alger)", ("2026", "2027"), (annees.get("12-31 22:59"), annees.get("12-31 23:00")))
    # une révision ÉCRITE en 2027 garde l'année 2026 de sa tête
    revs = [l for l in lignes if l.split("|")[1] in ("2", "3")]
    verdict("D-3", "les deux révisions écrites en 2027 gardent l'année (2026) et le numéro de leur tête", {l.split("|")[2] + "/" + l.split("|")[3] for l in lignes if l.split("|")[0] == "12-31 22:59"}, {l.split("|")[2] + "/" + l.split("|")[3] for l in revs})

    # ───────────────────────── (c) la chaîne CASSÉE : la migration doit LEVER et ne rien laisser ─────────────────────────
    entete("SONDE 1c — une révision sans tête : la migration B LÈVE et la base reste intacte")
    creer_base("zwadj_adverse_casse", DEV)
    base = "zwadj_adverse_casse"
    q_mod = valeur(DEV, "SELECT id FROM quotes WHERE version = 1 LIMIT 1")
    cloner(base, "quotes", q_mod, {"id": "uuidv7()", "version": "2", "parent_quote_id": f"'{q_mod}'", "chain_id": "uuidv7()", "status": "'DRAFT'", "sent_at": "NULL", "accepted_at": "NULL", "sent_via": "NULL"})
    code_a, _, _ = appliquer_fichier(base, MIG_A)
    verdict("C-0", "la migration A passe sur cette base (la chaîne cassée ne la concerne pas)", 0, code_a)
    code_b, _, err_b = appliquer_fichier(base, MIG_B)
    verdict("C-1", "la migration B ÉCHOUE (code ≠ 0) avec le message de la vérification — « ligne(s) sans numéro de référence »", (True, True), (code_b != 0, "sans numéro de référence" in err_b))
    etat = sql_ok(base, "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_name='quote_number_counters') || ',' || (SELECT count(*) FROM information_schema.columns WHERE table_name='quotes' AND column_name IN ('reference_year','reference_number'))").strip()
    verdict("C-2", "la transaction du fichier est ANNULÉE : ni table de compteurs, ni colonne neuve — la base est telle qu'après A", "0,0", etat)
    code_a2, _, _ = appliquer_fichier(base, MIG_A)
    verdict("C-3", "…et rejouer A échoue (rien n'a bougé de ce côté non plus : la colonne existe déjà)", True, code_a2 != 0)

    # le même cas par le VRAI mécanisme (`prisma migrate deploy`) : A s'applique, B échoue, et ne laisse rien
    creer_base("zwadj_adverse_casse2", DEV)
    base = "zwadj_adverse_casse2"
    cloner(base, "quotes", q_mod, {"id": "uuidv7()", "version": "2", "parent_quote_id": f"'{q_mod}'", "chain_id": "uuidv7()", "status": "'DRAFT'", "sent_at": "NULL", "accepted_at": "NULL", "sent_via": "NULL"})
    code_d, sortie_d = migrate_deploy(base)
    verdict("C-4", "`prisma migrate deploy` sur la chaîne cassée sort en ≠ 0 et nomme la vérification", (True, True), (code_d != 0, "sans numéro de référence" in sortie_d))
    etat = sql_ok(base, "SELECT (SELECT count(*) FROM information_schema.tables WHERE table_name='quote_number_counters') || ',' || (SELECT count(*) FROM information_schema.columns WHERE table_name='quotes' AND column_name IN ('reference_year','reference_number')) || ',' || (SELECT count(*) FROM information_schema.columns WHERE table_name='venues' AND column_name='number')").strip()
    verdict("C-5", "par `migrate deploy` : A est appliquée (colonne `number`), B n'a laissé NI table de compteurs NI colonne", "0,0,1", etat)
    suivi = sql_ok(base, "SELECT migration_name || ':' || (finished_at IS NOT NULL) || ':' || (rolled_back_at IS NOT NULL) FROM _prisma_migrations WHERE migration_name >= '20261015' ORDER BY 1").split()
    verdict("C-6", "`_prisma_migrations` : A terminée ; B notée NON terminée (pas « terminée » sur une base à moitié faite)", [MIG_A + ":true:false", MIG_B + ":false:false"], suivi)
    for b in ("zwadj_adverse_dev", "zwadj_adverse_dur", "zwadj_adverse_casse", "zwadj_adverse_casse2"):
        supprimer_base(b)
    return bilan()


if __name__ == "__main__":
    sys.exit(main())
