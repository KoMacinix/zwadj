"""D334 — SESSION ADVERSE de L35-3 · SONDE 2 : les GARDES DE BASE attaquées une par une, à la main, en SQL brut (F-6, F-8, F-9, F-4, F-12, F-13 et leurs voisines).

Base de travail : une copie de la base de développement, migrée par `prisma migrate deploy` (donc avec des salles et des devis RÉELS dans les tables), supprimée à la fin. Chaque sonde dit ce qu'elle
FAIT, ce qu'elle ATTEND (le code SQLSTATE de la garde visée : 23505 unicité, 23503 clé étrangère, 23514 contrainte `CHECK`, 23502 NOT NULL, P0001 exception levée par le déclencheur), et ce qu'elle MESURE.
Un SQLSTATE attendu s'écrit ici parce qu'il est la forme du refus de PostgreSQL ; jamais une valeur de donnée.

USAGE (racine) : python3 docs/preuves/D334/session-adverse/adverse_base.py
"""
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adverse_migration import cloner, colonnes_de  # noqa: E402
from adverse_outils import (bilan, constat, creer_base, entete, migrate_deploy, sql, sql_ok, supprimer_base, valeur, verdict)  # noqa: E402

DEV = "zwadj"
B = "zwadj_adverse_base"


def etat_sql(code_sortie_err: str):
    """Le SQLSTATE d'un refus, lu dans la sortie d'erreur de psql (VERBOSITY=verbose)."""
    m = re.search(r"ERROR:\s+([0-9A-Z]{5}):", code_sortie_err)
    return m.group(1) if m else None


def essai(base: str, texte: str, tx: bool = True):
    """Exécute `texte` (verbosité complète) ; rend (SQLSTATE ou None, message d'erreur tronqué, sortie)."""
    code, out, err = sql(base, "\\set VERBOSITY verbose\n" + texte, tx=tx)
    return (etat_sql(err) if code != 0 else None), (err.strip().splitlines()[0][:200] if code != 0 and err.strip() else ""), out


def inserer_devis(modele: str, surcharges: dict) -> str:
    cols = colonnes_de(B, "quotes")
    liste = ", ".join(f'"{c}"' for c in cols)
    sel = ", ".join(surcharges.get(c, f'"{c}"') for c in cols)
    return f"INSERT INTO quotes ({liste}) SELECT {sel} FROM quotes WHERE id = '{modele}';"


def inserer_salle(modele: str, surcharges: dict) -> str:
    cols = [c for c in colonnes_de(B, "venues") if c != "number" or "number" in surcharges]
    liste = ", ".join(f'"{c}"' for c in cols)
    sel = ", ".join(surcharges.get(c, f'"{c}"') for c in cols)
    return f"INSERT INTO venues ({liste}) SELECT {sel} FROM venues WHERE id = '{modele}';"


def main() -> int:
    entete("SONDE 2 — mise en place : copie de la base de développement migrée par `prisma migrate deploy`")
    creer_base(B, DEV)
    code, sortie = migrate_deploy(B)
    verdict("B-0", "la base de travail est migrée (`migrate deploy` sort en 0)", 0, code)
    V = valeur(B, "SELECT id FROM venues WHERE deleted_at IS NULL OR deleted_at IS NOT NULL ORDER BY number LIMIT 1")
    V2 = valeur(B, "SELECT v.id FROM venues v WHERE NOT EXISTS (SELECT 1 FROM quotes q WHERE q.venue_id = v.id) ORDER BY v.number DESC LIMIT 1")
    TETE = valeur(B, "SELECT id FROM quotes WHERE version = 1 ORDER BY created_at LIMIT 1")
    t_venue, t_annee, t_num = sql_ok(B, f"SELECT venue_id || '|' || reference_year || '|' || reference_number FROM quotes WHERE id = '{TETE}'").strip().split("|")

    # ─────────────────────────────── F-8 : le numéro d'une salle ne se modifie pas ───────────────────────────────
    entete("F-8 — le numéro d'une salle est immuable (déclencheur `venues_number_immutable`)")
    n0 = valeur(B, f"SELECT number FROM venues WHERE id = '{V}'")
    e, msg, _ = essai(B, f"UPDATE venues SET number = number + 1000 WHERE id = '{V}';")
    verdict("F8-1", "UPDATE du numéro d'une salle : refusé par le déclencheur (P0001) et le message dit « immuable »", ("P0001", True), (e, "immuable" in msg))
    e, msg, _ = essai(B, f"UPDATE venues SET number = number WHERE id = '{V}';")
    verdict("F8-2", "UPDATE vers la MÊME valeur : accepté (ce n'est pas une modification)", None, e)
    e, msg, _ = essai(B, f"UPDATE venues SET name_fr = name_fr || ' ' WHERE id = '{V}';")
    verdict("F8-3", "UPDATE d'une AUTRE colonne : accepté, le numéro ne bouge pas", (None, n0), (e, valeur(B, f"SELECT number FROM venues WHERE id = '{V}'")))
    e, msg, _ = essai(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-upsert'", "matterport_model_id": "NULL"}).rstrip(";") + f" ON CONFLICT (slug) DO UPDATE SET number = 987654;")
    verdict("F8-4", "mise en place : un INSERT … ON CONFLICT (slug) DO UPDATE SET number = … SANS conflit s'exécute comme un INSERT (la salle neuve prend son numéro de la séquence)", None, e)
    # le slug adv-upsert vient d'être créé par F8-4 (insert simple, pas de conflit) : on rejoue pour provoquer le conflit
    e, msg, _ = essai(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-upsert'", "matterport_model_id": "NULL"}).rstrip(";") + " ON CONFLICT (slug) DO UPDATE SET number = 987654;")
    verdict("F8-4b", "…et au SECOND passage (le slug existe : le chemin UPDATE s'exécute) l'upsert qui change le numéro est refusé (P0001)", "P0001", e)
    e, msg, _ = essai(B, f"UPDATE venues SET number = NULL WHERE id = '{V}';")
    verdict("F8-5", "UPDATE du numéro vers NULL : refusé (déclencheur ou NOT NULL)", True, e in ("P0001", "23502"))
    e, msg, _ = essai(B, f"UPDATE venues SET number = 0 WHERE id = '{V}';")
    verdict("F8-6", "UPDATE vers 0 : refusé", True, e is not None)
    constat("F8-C1", "le déclencheur refuse la modification, il ne refuse pas la SUPPRESSION puis la ré-insertion de la même salle sous un autre numéro (`DELETE` d'une salle sans devis, puis `INSERT … number = …`) — chemin qu'aucune route n'emprunte (les salles se suppriment en douceur, `deleted_at`), à noter comme limite, pas comme défaut")

    # ─────────────────────────────── F-6 : la séquence des salles ───────────────────────────────
    entete("F-6 — la séquence des salles : un saut est admis, une répétition jamais (restauration d'une sauvegarde plus ancienne)")
    mx = int(valeur(B, "SELECT max(number) FROM venues"))
    derniere, appelee = valeur(B, "SELECT last_value || ',' || is_called FROM venue_number_seq").split(",")
    verdict("F6-0", "à l'entrée, la séquence est AU MOINS au maximum et déjà appelée (jamais en dessous : la prochaine salle ne peut pas reprendre un numéro) — l'upsert F8-4b a consommé un numéro sans créer de salle (PostgreSQL appelle `nextval` avant de voir le conflit) : un trou, admis", (True, "true"), (int(derniere) >= mx, appelee))
    sql_ok(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-s1'", "matterport_model_id": "NULL"}))
    n1 = int(valeur(B, "SELECT number FROM venues WHERE slug = 'adv-s1'"))
    verdict("F6-1", "une salle créée SANS numéro prend le numéro qui SUIT la séquence (dernière valeur + 1) et dépasse le maximum d'avant", (int(derniere) + 1, True), (n1, n1 > mx))
    sql(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-s2'", "matterport_model_id": "NULL"}).replace("INSERT", "BEGIN; INSERT", 1) + "\nROLLBACK;")
    sql_ok(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-s3'", "matterport_model_id": "NULL"}))
    n3 = int(valeur(B, "SELECT number FROM venues WHERE slug = 'adv-s3'"))
    verdict("F6-2", "une création ANNULÉE après `nextval` laisse un TROU (admis par Ko) : la suivante saute un numéro", n1 + 2, n3)
    # restauration : la séquence revient en arrière
    sql_ok(B, "SELECT setval('venue_number_seq', 1, false);")
    e, msg, _ = essai(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-rest1'", "matterport_model_id": "NULL"}))
    verdict("F6-3", "séquence RESTAURÉE en arrière (retour à 1) : la création d'une salle ÉCHOUE sur l'unicité (23505), elle ne duplique PAS un numéro", ("23505", True), (e, "venues_number_key" in msg))
    nb = 0
    while True:
        e, _, _ = essai(B, inserer_salle(V, {"id": "uuidv7()", "slug": f"'adv-rest-{nb}'", "matterport_model_id": "NULL"}))
        nb += 1
        if e is None or nb > 80:
            break
    constat("F6-C1", f"après une restauration qui ramène la séquence à 1, {nb} tentatives de création de salle échouent (23505) avant que la séquence ait dépassé le maximum ({n3}) : chaque échec consomme un numéro, la séquence se répare seule mais PAR ÉCHECS visibles de l'utilisateur (500) — c'est la limite 'procédure de restauration' du backlog, mesurée ; non bloquant, aucune répétition n'est jamais écrite")
    dup = valeur(B, "SELECT count(*) FROM (SELECT number FROM venues GROUP BY number HAVING count(*) > 1) d")
    verdict("F6-4", "après tout cela, AUCUN numéro de salle en double", "0", dup)
    e, _, _ = essai(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-expl'", "number": str(mx), "matterport_model_id": "NULL"}))
    verdict("F6-5", "INSERT d'une salle avec un numéro EXPLICITE déjà pris : 23505", "23505", e)
    e, _, _ = essai(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-zero'", "number": "0", "matterport_model_id": "NULL"}))
    verdict("F6-6", "INSERT d'une salle avec le numéro 0 : 23514 (`venues_number_positive`)", "23514", e)
    sql_ok(B, "SELECT setval('venue_number_seq', 2147483647, true);")
    e, msg, _ = essai(B, inserer_salle(V, {"id": "uuidv7()", "slug": "'adv-max'", "matterport_model_id": "NULL"}))
    verdict("F6-7", "séquence `integer` à sa limite : la création ÉCHOUE (« reached maximum value »), elle ne boucle pas", True, e is not None and "maximum" in msg.lower())
    sql_ok(B, f"SELECT setval('venue_number_seq', (SELECT max(number) FROM venues), true);")

    # ─────────────────────────────── F-9 / F-4 : unicité des têtes, clé composite, bornes ───────────────────────────────
    entete("F-9 / F-4 — l'unicité des têtes, la clé composite vers la tête de chaîne, les bornes (INSERT directs, sans passer par le service)")
    tete_fix = {"venue_id": f"'{t_venue}'", "status": "'DRAFT'", "sent_at": "NULL", "accepted_at": "NULL", "sent_via": "NULL"}
    e, msg, _ = essai(B, inserer_devis(TETE, {**tete_fix, "id": "uuidv7()", "chain_id": "uuidv7()", "version": "1", "parent_quote_id": "NULL", "reference_year": t_annee, "reference_number": "424242"}))
    verdict("F9-0", "un INSERT d'une tête dont le `chain_id` n'est pas son propre id est REFUSÉ par la clé composite (23503) — il n'y a plus d'écriture « chain_id provisoire »", "23503", e)
    new_id = valeur(B, "SELECT uuidv7()")
    base_ins = {**tete_fix, "id": f"'{new_id}'", "chain_id": f"'{new_id}'", "version": "1", "parent_quote_id": "NULL"}
    e, msg, _ = essai(B, inserer_devis(TETE, {**base_ins, "reference_year": t_annee, "reference_number": t_num}))
    verdict("F9-1", "DEUX têtes de même (salle, année, numéro) : 23505 sur `quotes_reference_head_unique`", ("23505", True), (e, "quotes_reference_head_unique" in msg or "quotes_head_reference_key" in msg))
    e, msg, _ = essai(B, inserer_devis(TETE, {**base_ins, "reference_year": t_annee, "reference_number": "987654"}))
    verdict("F9-2", "une tête de numéro neuf passe (témoin de calibration : la garde ne refuse pas tout)", None, e)
    # révisions
    tete_id = TETE
    rev = {**tete_fix, "parent_quote_id": f"'{tete_id}'", "chain_id": f"'{tete_id}'"}

    def prochaine_version() -> str:
        return valeur(B, f"SELECT max(version) + 1 FROM quotes WHERE chain_id = '{tete_id}'")

    e, msg, _ = essai(B, inserer_devis(TETE, {**rev, "id": "uuidv7()", "version": prochaine_version(), "reference_year": t_annee, "reference_number": t_num}))
    verdict("F9-3", "une VERSION 2 qui reprend le numéro de sa tête : acceptée (c'est le filtre `WHERE version = 1` qui le permet)", None, e)
    e, msg, _ = essai(B, inserer_devis(TETE, {**rev, "id": "uuidv7()", "version": prochaine_version(), "reference_year": t_annee, "reference_number": str(int(t_num) + 777)}))
    verdict("F9-4", "une version dont le NUMÉRO diffère de sa tête : 23503 (`quotes_chain_head_fkey`)", ("23503", True), (e, "quotes_chain_head_fkey" in msg))
    e, msg, _ = essai(B, inserer_devis(TETE, {**rev, "id": "uuidv7()", "version": prochaine_version(), "reference_year": str(int(t_annee) + 1), "reference_number": t_num}))
    verdict("F9-5", "une version dont l'ANNÉE diffère de sa tête : 23503", "23503", e)
    autre = valeur(B, f"SELECT id FROM venues WHERE id <> '{t_venue}' ORDER BY number LIMIT 1")
    e, msg, _ = essai(B, inserer_devis(TETE, {**rev, "id": "uuidv7()", "version": prochaine_version(), "venue_id": f"'{autre}'", "reference_year": t_annee, "reference_number": t_num}))
    verdict("F9-6", "une version rattachée à la chaîne d'une AUTRE salle : 23503", "23503", e)
    e, msg, _ = essai(B, inserer_devis(TETE, {**rev, "id": "uuidv7()", "version": prochaine_version(), "chain_id": "uuidv7()", "reference_year": t_annee, "reference_number": t_num}))
    verdict("F9-7", "une version dont la chaîne n'existe pas : 23503", "23503", e)
    for ident, annee, num, attendu in [("F9-8", "1999", t_num, "23514"), ("F9-9", "10000", t_num, "23514"), ("F9-10", t_annee, "0", "23514"), ("F9-11", t_annee, "-4", "23514")]:
        nid = valeur(B, "SELECT uuidv7()")
        e, msg, _ = essai(B, inserer_devis(TETE, {**tete_fix, "id": f"'{nid}'", "chain_id": f"'{nid}'", "version": "1", "parent_quote_id": "NULL", "reference_year": annee, "reference_number": num}))
        verdict(ident, f"bornes : année {annee} / numéro {num} → {attendu}", attendu, e)
    nid = valeur(B, "SELECT uuidv7()")
    e, _, _ = essai(B, inserer_devis(TETE, {**tete_fix, "id": f"'{nid}'", "chain_id": f"'{nid}'", "version": "1", "parent_quote_id": "NULL", "reference_year": "NULL", "reference_number": "5"}))
    verdict("F9-12", "année NULL : 23502", "23502", e)

    # ─────────────────────────────── immutabilité de la RÉFÉRENCE d'un devis : ce que la base garde, et ce qu'elle ne garde pas ───────────────────────────────
    entete("La référence d'un devis déjà imprimée peut-elle changer ? (UPDATE directs — aucun chemin de l'API ne les émet)")
    seul = valeur(B, "SELECT q.id FROM quotes q WHERE q.version = 1 AND NOT EXISTS (SELECT 1 FROM quotes r WHERE r.chain_id = q.id AND r.version > 1) ORDER BY q.created_at LIMIT 1")
    avec = valeur(B, "SELECT q.id FROM quotes q WHERE q.version = 1 AND EXISTS (SELECT 1 FROM quotes r WHERE r.chain_id = q.id AND r.version > 1) ORDER BY q.created_at LIMIT 1")
    e, msg, _ = essai(B, f"UPDATE quotes SET reference_number = 555555 WHERE id = '{avec}';")
    verdict("R-1", "UPDATE du numéro d'une TÊTE QUI A DES RÉVISIONS : refusé (23001 « restrict_violation », `ON UPDATE RESTRICT` de la clé composite — le SQLSTATE d'un RESTRICT n'est pas 23503, qui est celui de NO ACTION)", "23001", e)
    e, msg, _ = essai(B, f"UPDATE quotes SET reference_number = 555555 WHERE id = '{seul}';")
    if e is None:
        constat("R-C1", "UPDATE du numéro d'une tête SANS révision : ACCEPTÉ par la base (la clé composite ne protège que les têtes qui ont des révisions). La référence imprimée sur un PDF déjà remis peut donc être changée par un UPDATE direct tant que le devis n'a pas été révisé ; aucun chemin de l'API n'émet un tel UPDATE (aucun `quote.update` ne touche ces colonnes), mais la garde que L35-3 donne à `venues.number` (déclencheur d'immuabilité, F-8) n'existe PAS pour `quotes.reference_year` / `quotes.reference_number` — un trou de la doctrine « une référence imprimée doit rester vraie », pas listé dans F-1 à F-19 (non bloquant : ni doublon, ni montant, ni perte)")
    else:
        verdict("R-2", "UPDATE du numéro d'une tête sans révision : refusé", True, True)
    e, msg, _ = essai(B, f"UPDATE quotes SET venue_id = '{autre}' WHERE id = '{seul}';")
    constat("R-C2", f"UPDATE du `venue_id` d'une tête sans révision : {'ACCEPTÉ' if e is None else 'refusé (' + str(e) + ')'} — même famille que R-C1 : le devis change de salle sans changer de compteur ; un numéro neuf de la salle d'arrivée pourrait ensuite entrer en collision (23505) avec lui" if e is None else "UPDATE du `venue_id` d'une tête sans révision : refusé")

    # ─────────────────────────────── F-12 : le compteur désaccordé ───────────────────────────────
    entete("F-12 — un compteur désaccordé : échec BRUYANT, aucune écriture, aucun doublon — et combien de temps dure-t-il ?")
    cols = colonnes_de(B, "quotes")
    tmpl = TETE
    sql_ok(B, f"DELETE FROM quote_number_counters WHERE venue_id = '{V2}' AND year = 2026;")
    # on fabrique l'état : 3 devis existent pour (V2, 2026) mais le compteur dit 1
    for k in range(1, 4):
        nid = valeur(B, "SELECT uuidv7()")
        sql_ok(B, inserer_devis(tmpl, {**tete_fix, "venue_id": f"'{V2}'", "id": f"'{nid}'", "chain_id": f"'{nid}'", "version": "1", "parent_quote_id": "NULL", "reference_year": "2026", "reference_number": str(k)}))
    sql_ok(B, f"INSERT INTO quote_number_counters (venue_id, year, last_number) VALUES ('{V2}', 2026, 1);")

    def creation(venue: str, annee: int) -> str:
        """Le SQL EXACT de `creerTeteDeChaine` (compteur, identifiant, tête), en une transaction — dans l'ordre du code."""
        sel = {**tete_fix, "venue_id": f"'{venue}'", "id": ":'qid'", "chain_id": ":'qid'", "version": "1", "parent_quote_id": "NULL", "reference_year": str(annee), "reference_number": ":nn"}
        return (f"BEGIN;\nINSERT INTO quote_number_counters (venue_id, year, last_number) VALUES ('{venue}'::uuid, {annee}::smallint, 1) ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1 RETURNING last_number AS nn \\gset\n"
                f"SELECT uuidv7() AS qid \\gset\n{inserer_devis(tmpl, sel)}\nCOMMIT;\n")

    resultats = []
    for i in range(5):
        c, out, err = sql(B, "\\set VERBOSITY verbose\n" + creation(V2, 2026))
        resultats.append((etat_sql(err) if c != 0 else None))
        sql(B, "ROLLBACK;")
    compteur = valeur(B, f"SELECT last_number FROM quote_number_counters WHERE venue_id='{V2}' AND year=2026")
    nb_devis = valeur(B, f"SELECT count(*) FROM quotes WHERE venue_id='{V2}' AND reference_year=2026 AND version=1")
    verdict("F12-1", "compteur à 1 alors que 3 devis existent : CINQ créations de suite échouent toutes en 23505, le compteur reste à 1 (chaque incrément est annulé avec la transaction), 3 devis seulement", (["23505"] * 5, "1", "3"), (resultats, compteur, nb_devis))
    constat("F12-C1", "un compteur en retard n'est PAS un incident passager : chaque création échoue, son incrément est annulé, le compteur ne rattrape donc JAMAIS le maximum tout seul — la création de devis de cette salle et de cette année est en panne PERMANENTE (500 à chaque tentative) jusqu'à une réparation à la main du compteur. La base protège (aucun doublon, rien d'écrit) ; l'entrée F-12 du backlog dit 'erreur 500' sans dire 'permanente' — Ko l'a ratifiée telle quelle (« reste une erreur 500 en v1 »), le caractère permanent est une précision à y ajouter ; non bloquant")
    sql_ok(B, f"UPDATE quote_number_counters SET last_number = (SELECT max(reference_number) FROM quotes WHERE venue_id='{V2}' AND reference_year=2026 AND version=1) WHERE venue_id='{V2}' AND year=2026;")
    c, out, err = sql(B, creation(V2, 2026))
    verdict("F12-2", "le compteur réparé à la main (= max des numéros) : la création suivante réussit, avec le numéro max + 1", ("0", "4"), (str(c), valeur(B, f"SELECT max(reference_number) FROM quotes WHERE venue_id='{V2}' AND reference_year=2026 AND version=1")))
    # compteur supprimé (ligne absente) alors que des devis existent
    sql_ok(B, f"DELETE FROM quote_number_counters WHERE venue_id = '{V2}' AND year = 2026;")
    c, out, err = sql(B, "\\set VERBOSITY verbose\n" + creation(V2, 2026))
    verdict("F12-3", "ligne de compteur SUPPRIMÉE alors que 4 devis existent : la création repart de 1 et échoue (23505) — même panne permanente, aucun doublon", "23505", etat_sql(err))
    sql_ok(B, f"INSERT INTO quote_number_counters (venue_id, year, last_number) VALUES ('{V2}', 2026, 4) ON CONFLICT DO NOTHING;")

    # ─────────────────────────────── suppression d'une salle qui a des devis ───────────────────────────────
    entete("Suppression d'une salle qui a des devis (au niveau de la base : `DELETE` direct)")
    e, msg, _ = essai(B, f"DELETE FROM venues WHERE id = '{t_venue}';")
    verdict("S-1", "supprimer physiquement une salle qui a des devis : refusé (23001 restrict_violation)", "23001", e)
    e, msg, _ = essai(B, f"DELETE FROM quotes WHERE id = '{avec}';")
    verdict("S-2", "supprimer physiquement une TÊTE qui a des révisions : refusé (23001 restrict_violation)", "23001", e)
    rest = valeur(B, f"SELECT count(*) FROM quote_number_counters WHERE venue_id = '{t_venue}'")
    verdict("S-3", "…et le compteur de la salle est toujours là (les numéros ne se réutilisent pas)", True, int(rest) >= 1)
    nb_chaine = valeur(B, f"SELECT count(*) FROM quotes WHERE chain_id = '{avec}'")
    e, msg, _ = essai(B, f"DELETE FROM quotes WHERE chain_id = '{avec}';")
    verdict("S-4", "supprimer TOUTE une chaîne en un seul ordre `DELETE` : accepté (RESTRICT vérifié en fin d'ordre, les révisions partent avec leur tête) ; le compteur, lui, ne redescend pas", (None, True), (e, valeur(B, f"SELECT last_number FROM quote_number_counters WHERE venue_id='{t_venue}' AND year={t_annee}") != ""))
    print(f"   (chaîne supprimée : {nb_chaine} version(s) ; le numéro {t_num}… de la salle n'est pas rendu au compteur)")
    supprimer_base(B)
    return bilan()


if __name__ == "__main__":
    sys.exit(main())
