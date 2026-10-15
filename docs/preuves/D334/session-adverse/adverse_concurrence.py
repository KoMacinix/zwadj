"""D334 — SESSION ADVERSE de L35-3 · SONDE 3 : la CONCURRENCE, avec de vraies connexions séparées (un processus `psql` par session), le SQL EXACT du magasin (`quote-store.prisma.ts`).

Pourquoi pas les tests de L35-3 : leurs clients partagent un processus Node et un pool (limite K-C1 de la lecture adverse). Ici chaque session est un processus `psql` distinct, donc une connexion
PostgreSQL distincte, et toutes démarrent leur premier ordre au même instant (horloge de la base, `pg_sleep` jusqu'à un instant commun).

Le SQL de chaque session est celui du magasin, dans l'ORDRE du code : création = (1) incrément du compteur `INSERT … ON CONFLICT … DO UPDATE … RETURNING`, (2) `uuidv7()`, (3) l'INSERT de la tête avec
`chain_id = id` ; révision = (1) `SELECT … FROM quotes WHERE id = <tête> FOR UPDATE`, (2) `max(version)`, (3) l'INSERT de la version qui recopie année et numéro ; blocage / acceptation = `SELECT … FROM venues
WHERE id = … FOR UPDATE`.

ÉTALONNAGE (le détecteur d'interblocage doit pouvoir VOIR un interblocage) : K-0 fabrique volontairement un cycle (compteur puis salle d'un côté, salle puis compteur de l'autre) et exige un 40P01.

USAGE (racine) : python3 docs/preuves/D334/session-adverse/adverse_concurrence.py
"""
import os
import re
import sys
from collections import Counter

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
from adverse_migration import colonnes_de, cloner  # noqa: E402
from adverse_outils import (bilan, constat, creer_base, entete, migrate_deploy, sessions_paralleles, sql, sql_json, sql_ok, supprimer_base, valeur, verdict)  # noqa: E402

DEV = "zwadj"
B = "zwadj_adverse_conc"
TETE_FIX = {"status": "'DRAFT'", "sent_at": "NULL", "accepted_at": "NULL", "sent_via": "NULL"}


def inserer_devis(modele: str, surcharges: dict) -> str:
    cols = colonnes_de(B, "quotes")
    liste = ", ".join(f'"{c}"' for c in cols)
    sel = ", ".join(surcharges.get(c, f'"{c}"') for c in cols)
    return f"INSERT INTO quotes ({liste}) SELECT {sel} FROM quotes WHERE id = '{modele}';"


def creation(modele: str, venue: str, annee: int, pause: float = 0, fin: str = "COMMIT", etiquette: str = "C") -> str:
    """`creerTeteDeChaine` : (1) compteur, (2) identifiant, (3) tête en UNE écriture — dans une transaction."""
    sel = {**TETE_FIX, "venue_id": f"'{venue}'", "id": ":'qid'", "chain_id": ":'qid'", "version": "1", "parent_quote_id": "NULL", "reference_year": str(annee), "reference_number": ":nn", "created_at": "now()"}
    attente = f"SELECT pg_sleep({pause});\n" if pause else ""
    return (f"BEGIN;\nINSERT INTO quote_number_counters (venue_id, year, last_number) VALUES ('{venue}'::uuid, {annee}::smallint, 1) "
            f"ON CONFLICT (venue_id, year) DO UPDATE SET last_number = quote_number_counters.last_number + 1 RETURNING last_number AS nn \\gset\n"
            f"SELECT '{etiquette}|' || :nn || '|' || extract(epoch from clock_timestamp())::numeric(20,6) AS pris;\n{attente}"
            f"SELECT uuidv7() AS qid \\gset\n{inserer_devis(modele, sel)}\n{fin};\n"
            f"SELECT '{etiquette}FIN|' || :nn || '|' || extract(epoch from clock_timestamp())::numeric(20,6);\n")


def revision(modele: str, tete: str, venue: str) -> str:
    """`creerRevision` : verrou de la tête (qui rend année et numéro), `max(version)`, INSERT de la version qui les recopie."""
    sel = {**TETE_FIX, "venue_id": f"'{venue}'", "id": "uuidv7()", "chain_id": f"'{tete}'", "parent_quote_id": f"'{tete}'", "version": ":vv", "reference_year": ":hy", "reference_number": ":hn", "created_at": "now()"}
    return (f"BEGIN;\nSELECT reference_year AS hy, reference_number AS hn FROM quotes WHERE id = '{tete}' FOR UPDATE \\gset\n"
            f"SELECT coalesce(max(version), 1) + 1 AS vv FROM quotes WHERE chain_id = '{tete}' \\gset\n{inserer_devis(modele, sel)}\nCOMMIT;\n"
            f"SELECT 'R|' || :vv || '|' || :hn;\n")


def blocage(venue: str, pause: float = 0.02) -> str:
    """Création d'un blocage / acceptation : `SELECT … FROM venues WHERE id = … FOR UPDATE`, un peu de travail, COMMIT."""
    return f"BEGIN;\nSELECT id FROM venues WHERE id = '{venue}' FOR UPDATE;\nSELECT pg_sleep({pause});\nCOMMIT;\nSELECT 'B|ok';\n"


def etats(err: str) -> list:
    return re.findall(r"ERROR:\s+([0-9A-Z]{5}):", err)


def numeros(sorties, etiquette="C"):
    out = []
    for c, o, e in sorties:
        out += [int(m.group(1)) for m in re.finditer(rf"^{etiquette}\|(\d+)\|", o, re.M)]
    return out


def main() -> int:
    entete("SONDE 3 — mise en place : copie de la base de développement migrée par `prisma migrate deploy`, trois salles neuves")
    creer_base(B, DEV)
    code, _ = migrate_deploy(B)
    verdict("K-setup", "base de travail migrée", 0, code)
    modele_salle = valeur(B, "SELECT id FROM venues WHERE deleted_at IS NULL ORDER BY created_at LIMIT 1")
    modele_devis = valeur(B, "SELECT id FROM quotes WHERE version = 1 ORDER BY created_at LIMIT 1")
    cols_v = [c for c in colonnes_de(B, "venues") if c != "number"]
    salles = []
    for k in range(1, 5):
        cloner(B, "venues", modele_salle, {"id": "uuidv7()", "slug": f"'adv-c{k}'", "matterport_model_id": "NULL"})
        salles.append(valeur(B, f"SELECT id FROM venues WHERE slug = 'adv-c{k}'"))
    S1, S2, S3, S4 = salles

    # ───────────── K-0 : étalonnage du détecteur d'interblocage ─────────────
    entete("K-0 — étalonnage : le détecteur voit-il un interblocage fabriqué à la main ?")
    sql_ok(B, f"INSERT INTO quote_number_counters (venue_id, year, last_number) VALUES ('{S4}', 2026, 5) ON CONFLICT DO NOTHING;")
    a = f"BEGIN;\nUPDATE quote_number_counters SET last_number = last_number WHERE venue_id = '{S4}' AND year = 2026;\nSELECT pg_sleep(0.8);\nSELECT id FROM venues WHERE id = '{S4}' FOR UPDATE;\nCOMMIT;\n"
    b = f"BEGIN;\nSELECT id FROM venues WHERE id = '{S4}' FOR UPDATE;\nSELECT pg_sleep(0.8);\nUPDATE quote_number_counters SET last_number = last_number WHERE venue_id = '{S4}' AND year = 2026;\nCOMMIT;\n"
    res = sessions_paralleles(B, [a, b], arret_sur_erreur=False, verbeux=True)
    nb40 = sum(etats(e).count("40P01") for c, o, e in res)
    verdict("K0-1", "ÉTALONNAGE POSITIF : l'ordre INVERSE (compteur puis salle contre salle puis compteur) produit EXACTEMENT un interblocage 40P01 — le détecteur voit ce qu'il cherche", 1, nb40)

    # ───────────── K-1 : N créations simultanées, une salle, une année ─────────────
    entete("K-1 — 40 sessions séparées créent un devis EN MÊME TEMPS dans la même salle et la même année")
    res = sessions_paralleles(B, [creation(modele_devis, S1, 2026) for _ in range(40)], arret_sur_erreur=False, verbeux=True)
    pris = sorted(numeros(res))
    erreurs = Counter(x for c, o, e in res for x in etats(e))
    verdict("K1-1", "40 numéros obtenus, DISTINCTS et CONSÉCUTIFS (1 à 40), aucune erreur", (list(range(1, 41)), {}), (pris, dict(erreurs)))
    verdict("K1-2", "la base dit la même chose : 40 têtes numérotées 1..40 sans trou, compteur à 40", (list(range(1, 41)), "40"), (sql_json(B, f"SELECT json_agg(reference_number ORDER BY reference_number) FROM quotes WHERE venue_id='{S1}' AND reference_year=2026 AND version=1"), valeur(B, f"SELECT last_number FROM quote_number_counters WHERE venue_id='{S1}' AND year=2026")))

    # ───────────── K-2 : deux salles ─────────────
    entete("K-2 — deux salles, vingt sessions chacune, toutes ensemble : deux suites indépendantes")
    res = sessions_paralleles(B, [creation(modele_devis, S2, 2026) for _ in range(20)] + [creation(modele_devis, S3, 2026) for _ in range(20)], arret_sur_erreur=False, verbeux=True)
    s2 = sql_json(B, f"SELECT json_agg(reference_number ORDER BY reference_number) FROM quotes WHERE venue_id='{S2}' AND reference_year=2026 AND version=1")
    s3 = sql_json(B, f"SELECT json_agg(reference_number ORDER BY reference_number) FROM quotes WHERE venue_id='{S3}' AND reference_year=2026 AND version=1")
    verdict("K2-1", "chaque salle a 1..20 sans trou ni doublon ; aucune erreur", (list(range(1, 21)), list(range(1, 21)), {}), (s2, s3, dict(Counter(x for c, o, e in res for x in etats(e)))))

    # ───────────── K-3 : première création d'une année (aucune ligne de compteur) ─────────────
    entete("K-3 — première création de l'année : douze sessions se disputent l'INSERT d'une ligne de compteur qui n'existe pas")
    res = sessions_paralleles(B, [creation(modele_devis, S1, 2031) for _ in range(12)], arret_sur_erreur=False, verbeux=True)
    verdict("K3-1", "douze numéros 1..12, distincts, aucune erreur (l'INSERT … ON CONFLICT ne se perd pas dans la course d'insertion)", (list(range(1, 13)), {}), (sorted(numeros(res)), dict(Counter(x for c, o, e in res for x in etats(e)))))

    # ───────────── K-4 : un rollback rend le numéro ─────────────
    entete("K-4 — une création ANNULÉE après l'incrément : la création concurrente attend, puis reçoit LE MÊME numéro (pas de trou)")
    avant_k4 = int(valeur(B, f"SELECT last_number FROM quote_number_counters WHERE venue_id='{S2}' AND year=2026"))
    a = creation(modele_devis, S2, 2026, pause=1.5, fin="ROLLBACK", etiquette="A")
    b = "SELECT pg_sleep(0.4);\n" + creation(modele_devis, S2, 2026, etiquette="B")
    res = sessions_paralleles(B, [a, b], arret_sur_erreur=False, verbeux=True)
    na = numeros([res[0]], "A")
    nb_ = numeros([res[1]], "B")
    fin_a = re.search(r"^AFIN\|\d+\|(\S+)", res[0][1], re.M)
    fin_b = re.search(r"^BFIN\|\d+\|(\S+)", res[1][1], re.M)
    verdict("K4-1", "A prend le numéro qui suit le compteur, ANNULE ; B (qui a attendu la ligne verrouillée) reçoit le MÊME numéro (le compteur lu avant la sonde + 1)", (avant_k4 + 1, avant_k4 + 1), (na[0] if na else None, nb_[0] if nb_ else None))
    verdict("K4-2", "B n'a fini qu'APRÈS le rollback de A (il a bien attendu, il n'a pas lu une valeur périmée)", True, bool(fin_a and fin_b and float(fin_b.group(1)) >= float(fin_a.group(1))))
    verdict("K4-3", "la salle compte avant_k4 + 1 devis 2026 numérotés 1..N sans trou (l'annulation n'a pas laissé de trou)", list(range(1, avant_k4 + 2)), sql_json(B, f"SELECT json_agg(reference_number ORDER BY reference_number) FROM quotes WHERE venue_id='{S2}' AND reference_year=2026 AND version=1"))

    # ───────────── K-5 : douze révisions simultanées de la même chaîne ─────────────
    entete("K-5 — douze révisions simultanées de la même chaîne")
    tete = valeur(B, f"SELECT id FROM quotes WHERE venue_id='{S1}' AND reference_year=2026 AND version=1 AND reference_number=7")
    res = sessions_paralleles(B, [revision(modele_devis, tete, S1) for _ in range(12)], arret_sur_erreur=False, verbeux=True)
    versions = sql_json(B, f"SELECT json_agg(version ORDER BY version) FROM quotes WHERE chain_id='{tete}'")
    nums = sql_json(B, f"SELECT json_agg(DISTINCT reference_number) FROM quotes WHERE chain_id='{tete}'")
    verdict("K5-1", "versions 1..13 distinctes, TOUTES au numéro 7 de leur tête, aucune erreur", (list(range(1, 14)), [7], {}), (versions, nums, dict(Counter(x for c, o, e in res for x in etats(e)))))
    verdict("K5-2", "aucun compteur touché par les révisions (le compteur de S1/2026 dit toujours 40)", "40", valeur(B, f"SELECT last_number FROM quote_number_counters WHERE venue_id='{S1}' AND year=2026"))

    # ───────────── K-6 : charge mêlée ─────────────
    entete("K-6 — charge MÊLÉE : créateurs (2 salles, 2 années), réviseurs, blocages/acceptations, verrou de salle exclusif")
    boucles = 40
    scripts = []
    for k in range(6):
        scripts.append("".join(creation(modele_devis, S2 if k % 2 == 0 else S3, 2026 if k < 4 else 2027) for _ in range(boucles)))
    for k in range(3):
        scripts.append("".join(revision(modele_devis, tete, S1) for _ in range(boucles // 2)))
    for k in range(3):
        scripts.append("".join(blocage(S2 if k % 2 == 0 else S3) for _ in range(boucles)))
    res = sessions_paralleles(B, scripts, arret_sur_erreur=False, verbeux=True, timeout=600)
    erreurs = Counter(x for c, o, e in res for x in etats(e))
    verdict("K6-1", "AUCUN interblocage (40P01), AUCUN délai de verrou (55P03), AUCUNE violation d'unicité (23505), AUCUNE autre erreur sur 12 sessions et ~400 transactions", {}, dict(erreurs))
    for nom, salle, annee in [("S2/2026", S2, 2026), ("S3/2026", S3, 2026), ("S2/2027", S2, 2027), ("S3/2027", S3, 2027)]:
        lignes = sql_json(B, f"SELECT json_agg(reference_number ORDER BY reference_number) FROM quotes WHERE venue_id='{salle}' AND reference_year={annee} AND version=1") or []
        cpt = valeur(B, f"SELECT coalesce(last_number, 0) FROM quote_number_counters WHERE venue_id='{salle}' AND year={annee}") or "0"
        verdict(f"K6-{nom}", f"{nom} : les numéros sont 1..N SANS trou ni doublon et le compteur vaut N", (list(range(1, len(lignes) + 1)), len(lignes)), (lignes, int(cpt)))
    versions = sql_json(B, f"SELECT json_agg(version ORDER BY version) FROM quotes WHERE chain_id='{tete}'")
    verdict("K6-chaine", "la chaîne révisée sous charge a des versions 1..N sans trou, toutes au numéro 7", (list(range(1, len(versions) + 1)), [7]), (versions, sql_json(B, f"SELECT json_agg(DISTINCT reference_number) FROM quotes WHERE chain_id='{tete}'")))
    dup = valeur(B, "SELECT count(*) FROM (SELECT venue_id, reference_year, reference_number FROM quotes WHERE version = 1 GROUP BY 1,2,3 HAVING count(*) > 1) d")
    verdict("K6-global", "dans TOUTE la base : aucune tête en double sur (salle, année, numéro)", "0", dup)
    supprimer_base(B)
    return bilan()


if __name__ == "__main__":
    sys.exit(main())
