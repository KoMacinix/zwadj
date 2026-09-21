"""Harnais du rang 17 — budgets de test, forme (b), mode n°8 (D297). DEPUIS LA RACINE :
    python3 neutralisation/neutralize-budgets.py

⛔ CE QU'IL PROUVE, ET POURQUOI C'EST LA SEULE PREUVE POSSIBLE. La forme (b) écrit
`testTimeout: 5_000`, c'est-à-dire la valeur que vitest applique DÉJÀ par défaut. Une
fois écrite, rien ne distingue une ligne LUE d'une ligne IGNORÉE — mal imbriquée hors
du bloc `test`, clé mal orthographiée dans une configuration que `tsc` ne vérifie pas
(`packages/api-client/vitest.config.ts` n'est dans aucun `include`) : quatre lignes
ignorées seraient vertes partout. C'est la « mutation auto-neutralisée » de D209,
appliquée à une configuration : retirer la ligne ne change rien, par construction.
⇒ Chaque cible mute la ligne vers une AUTRE valeur (`1_000`) et exige qu'un TÉMOIN
CONNU — un test qui dort 2 000 ms, vert sans mutation — échoue avec la signature
`Test timed out in 1000ms`. ⚠ C'est la signature qui prouve la lecture : vitest
l'interpole depuis la valeur EFFECTIVE du processus (`makeTimeoutError`). Un rouge
sans elle serait un rouge d'autre chose.
⚠ 1 000 / 2 000 et non 4 900 / 5 000 : une seconde de marge de chaque côté, hors de la
zone que la contention mange (le bras 4 900 est à 100 ms du seuil, D296).

Exigences du dépôt tenues ici :
- sauvegarde DISQUE avant mutation + restauration au DÉMARRAGE + purge en fin (D224) ;
- chaque cible DÉSIGNE sa configuration et son témoin (D223) ;
- comptage de l'ancre AVANT mutation, et, APRÈS écriture, ancre 1 → 0 ET marqueur
  0 → 1 relus dans le fichier (D286 : jamais une présence, jamais une taille) ;
- lecture/écriture en OCTETS ;
- pré-vol du TÉMOIN (vert sans mutation) et pré-vol de la DÉTECTION (une mutation
  connue rouge doit être VUE rouge, signature comprise) — sans lui, un détecteur
  périmé se lit exactement comme « la garde est muette » (D144) ;
- garde `__main__` : `verifier-mutations.py` importe `CIBLES` sans jouer la campagne.
La mécanique des témoins (écriture, lancement, lecture des rapports JSON et JUnit, et
le lecteur de signature, CALIBRÉ) vit dans `neutralisation/mesure-budgets.py`, un seul
endroit.
"""
import importlib.util
import os
import re
import shutil
import sys

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

TEMOIN_MS = 2000

# (libellé, configuration depuis la racine, avant, après, occurrences, paquet)
CIBLES = [
    ("packages/api-client : la ligne testTimeout est LUE (5_000 → 1_000 fait expirer un témoin de 2 s)",
     "packages/api-client/vitest.config.ts", "testTimeout: 5_000", "testTimeout: 1_000", 1,
     "packages/api-client"),
    ("apps/api : la ligne testTimeout est LUE (5_000 → 1_000 fait expirer un témoin de 2 s)",
     "apps/api/vitest.config.ts", "testTimeout: 5_000", "testTimeout: 1_000", 1, "apps/api"),
    ("apps/client : la ligne testTimeout est LUE (5_000 → 1_000 fait expirer un témoin de 2 s)",
     "apps/client/vitest.config.ts", "testTimeout: 5_000", "testTimeout: 1_000", 1, "apps/client"),
    ("apps/pro : la ligne testTimeout est LUE (5_000 → 1_000 fait expirer un témoin de 2 s)",
     "apps/pro/vite.config.ts", "testTimeout: 5_000", "testTimeout: 1_000", 1, "apps/pro"),
]


def charger_instrument():
    spec = importlib.util.spec_from_file_location(
        "mesure_budgets", os.path.join("neutralisation", "mesure-budgets.py"))
    m = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(m)
    return m


def valeur_de(apres):
    return int(re.sub(r"\D", "", apres))


def sauvegarde(chemin):
    return chemin + ".sauvegarde"


def muter(chemin, avant, apres):
    brut = open(chemin, "rb").read()
    a, b = avant.encode("utf-8"), apres.encode("utf-8")
    n = brut.count(a)
    assert n == 1, f"ERREUR DE SCRIPT : {n} occurrence(s) de « {avant} » dans {chemin}, attendu 1 — ancre périmée ?"
    m_av = brut.count(b)
    open(chemin, "wb").write(brut.replace(a, b, 1))
    relu = open(chemin, "rb").read()
    assert relu.count(a) == 0 and relu.count(b) == m_av + 1, (
        f"ERREUR DE SCRIPT : mutation NON POSÉE dans {chemin} — ancre {relu.count(a)} (attendu 0), "
        f"marqueur {m_av} → {relu.count(b)} (attendu {m_av + 1})")


def jouer_temoin(ins, paquet_nom, budget_du_test=None):
    """Joue le témoin de TEMOIN_MS sous la configuration du paquet. Avec `budget_du_test`,
    le témoin porte SON PROPRE budget (troisième argument de `it`), indépendant de toute
    configuration : c'est le pré-vol de la détection."""
    p = next(x for x in ins.PAQUETS if x[0] == paquet_nom)
    c = ins.chemin_temoin(p)
    source = ins.source_temoin([("temoin 2000", TEMOIN_MS)])
    if budget_du_test is not None:
        source = source.replace("); });\n", f"); }}, {budget_du_test});\n")
        assert source.count(f"}}, {budget_du_test});") == 1, "ERREUR DE SCRIPT : budget du témoin non posé"
    try:
        with open(c, "w", encoding="utf-8") as h:
            h.write(source)
        rapport = os.path.join(ins.JOURNAUX, "harnais", paquet_nom.replace("/", "_") + ".json")
        code, sortie, lu, _ = ins.jouer(p[1], [ins.NOM_TEMOIN], rapport)
    finally:
        if os.path.exists(c):
            os.remove(c)
    tests = ins.tests_du(lu) if lu else []
    assert len(tests) == 1, (
        f"ERREUR DE SCRIPT : {len(tests)} test(s) lu(s) dans le rapport du témoin de {paquet_nom}, attendu 1 — "
        f"un témoin qui n'a pas tourné se lit comme « la garde est muette » (D144).\n{sortie[-600:]}")
    ej = ins.echecs_junit(rapport)
    assert ej is not None, f"ERREUR DE SCRIPT : pas de rapport JUnit pour le témoin de {paquet_nom}"
    # ⛔ La signature se lit dans le JUnit, JAMAIS dans le JSON : vitest 3.2.7 y écrit la
    #   pile, que `makeTimeoutError` remplace — le message n'y figure pas (D297).
    return code, tests[0], ins.signatures(ej.get("temoin 2000", []))


def main():
    assert os.path.isfile("pnpm-workspace.yaml"), (
        "ERREUR DE SCRIPT : lancer depuis la RACINE du dépôt (python3 neutralisation/neutralize-budgets.py)")
    ins = charger_instrument()

    for _lib, chemin, *_ in CIBLES:
        if os.path.exists(sauvegarde(chemin)):
            shutil.copyfile(sauvegarde(chemin), chemin)
            os.remove(sauvegarde(chemin))
            print(f"sauvegarde trouvée au démarrage : {chemin} restauré avant de commencer")
    purges = ins.purger_temoins()
    if purges:
        print(f"{purges} témoin(s) laissé(s) par une exécution interrompue : purgé(s)")
    reference = {c[1]: open(c[1], "rb").read() for c in CIBLES}
    for lib, chemin, avant, *_ in CIBLES:
        n = reference[chemin].count(avant.encode("utf-8"))
        assert n == 1, f"ERREUR DE SCRIPT : {n} occurrence(s) de « {avant} » dans {chemin}, attendu 1"

    print("témoin (aucune mutation), sous chacune des quatre configurations")
    for _lib, chemin, _av, _ap, _n, paquet in CIBLES:
        code, t, sig = jouer_temoin(ins, paquet)
        assert code == 0 and t[2] == "passed", (
            f"PRÉ-VOL : le témoin de {TEMOIN_MS} ms doit être VERT sans mutation sous {chemin} "
            f"(statut {t[2]}, code {code}, signatures {sig})")
        print(f"   {paquet:20s} vert · {t[3]:.1f} ms")

    # ⛔ PRÉ-VOL DE LA DÉTECTION, INDÉPENDANT DES CIBLES (D297, contre-épreuve). Sa première
    #   forme réutilisait la cible 1 : une ligne IGNORÉE dans ce paquet-là se lisait alors
    #   « mutation inerte » AU PRÉ-VOL, et les trois autres cibles n'étaient pas jouées —
    #   bruyant, mais mal attribué et partiel. Le budget est ici posé sur le TÉMOIN (troisième
    #   argument de `it`), aucune configuration n'est touchée : ce pré-vol prouve que le
    #   détecteur lit une expiration, et RIEN d'autre.
    budget_prevol = valeur_de(CIBLES[0][3])
    print(f"pré-vol de la DÉTECTION (budget {budget_prevol} ms posé sur le témoin lui-même, aucune configuration mutée)")
    code, t, sig = jouer_temoin(ins, CIBLES[0][5], budget_du_test=budget_prevol)
    attendue = f"Test timed out in {budget_prevol}ms"
    assert code != 0 and t[2] == "failed", "PRÉ-VOL : un témoin de 2 s sous un budget de 1 s n'a pas rougi"
    assert attendue in sig, (
        f"PRÉ-VOL : le témoin est rouge mais la signature « {attendue} » n'est pas lue "
        f"(lues : {sig}). Le détecteur est périmé — sans ce pré-vol, toutes les cibles "
        "auraient été rapportées « muettes ».")

    compte = 0
    for lib, chemin, avant, apres, _n, paquet in CIBLES:
        shutil.copyfile(chemin, sauvegarde(chemin))
        try:
            muter(chemin, avant, apres)
            code, t, sig = jouer_temoin(ins, paquet)
        finally:
            shutil.copyfile(sauvegarde(chemin), chemin)
            os.remove(sauvegarde(chemin))
        attendue = f"Test timed out in {valeur_de(apres)}ms"
        mord = code != 0 and t[2] == "failed" and attendue in sig
        compte += 1 if mord else 0
        # FORMAT IMPOSÉ PAR lancer-campagnes.py, relevé dans sa source : il compte les
        # lignes qui commencent par la coche ou la croix, et cherche
        # « N garde(s) mordue(s) sur M cible(s) ».
        if mord:
            print("✓ " + lib)
        else:
            print("✗ " + lib)
            print(f"   attendu : rouge avec « {attendue} » ; lu : statut {t[2]}, signatures {sig}")

    restes = ins.purger_temoins()
    conforme = all(open(c, "rb").read() == reference[c] for c in reference) and restes == 0 and not any(
        os.path.exists(sauvegarde(c)) for c in reference)
    print("")
    print(f"{compte} garde(s) mordue(s) sur {len(CIBLES)} cible(s).")
    print("arbre rendu à son état de départ : vérifié." if conforme else "✗ ARBRE NON CONFORME en fin de campagne")
    return 0 if (compte == len(CIBLES) and conforme) else 1


if __name__ == "__main__":
    sys.exit(main())
