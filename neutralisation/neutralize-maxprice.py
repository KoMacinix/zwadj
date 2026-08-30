#!/usr/bin/env python3
"""Campagne de neutralisation — D228, le budget silencieusement jeté.

⚠ CHEMIN MONÉTAIRE. Un facteur 100 ne se voit pas à l'écran : la page affiche
des salles, le compteur affiche un nombre, rien ne clignote. Le défaut corrigé
ici a vécu depuis sa livraison sous une suite VERTE, parce que le test assertait
le contrat de l'API sur une URL publique (famille D219). Les gardes de ce lot
doivent donc être démontrées mordantes une par une, sans exception.

⛔ RÈGLE COMMUNE AVEC `neutralize-404.py` (D226) : aucun filtre `-t`.
`vitest -t <motif>` sort en 0 quand RIEN ne correspond. On lance le FICHIER
entier, et une cible ne compte que si le code de sortie est non nul ET que le
titre attendu apparaît sur une ligne d'échec. Titre introuvable = ERREUR DE
SCRIPT, jamais un succès.

⚠ Sauvegarde AVANT mutation, restauration en `finally`, reprise au démarrage si
une exécution précédente a été tuée (D223), et vérification de l'arbre au départ
comme à l'arrivée (D224).

Usage :  python3 neutralize-maxprice.py [depuis] [jusqua]
Depuis  :  la racine du monorepo.
"""

import io
import json
import os
import shutil
import subprocess
import sys

# ⛔ LA CONSOLE WINDOWS EST EN cp1252 : le premier « ✓ » imprimé fait LEVER ce
#   script (UnicodeEncodeError), APRÈS le pré-vol — donc après avoir payé la
#   mesure, et avec une trace Python qui ressemble à un défaut de harnais
#   alors que la campagne allait bien. Propagé aux 21 scripts le 30/08/2026
#   (D268) : avant lui, AUCUN harnais n'avait jamais tourné sur ce poste.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ⛔ CE SCRIPT SE LANCE DEPUIS LA RACINE DU MONOREPO, jamais depuis son propre
#   dossier : tous ses chemins sont relatifs au DOSSIER COURANT. Sans cette
#   garde, un `cd neutralisation` produirait « ERREUR DE SCRIPT : 0
#   occurrence(s) » — un message qui envoie chercher un défaut de code là où il
#   n'y a qu'un dossier de travail.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-maxprice"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")

CLIENT = "apps/client"
MODULE = "apps/client/src/lib/search-query.ts"
ACCUEIL = "apps/client/src/components/home-view.tsx"
ASSISTANT = "apps/client/src/components/filter-wizard.tsx"

TESTS = {
    "module": "src/lib/search-query.test.ts",
    "accueil": "src/app/[locale]/page.test.tsx",
    "assistant": "src/components/filter-wizard.test.tsx",
}


def L(*lignes: str) -> str:
    """Assemble des lignes en CRLF — l'invariant de fin de ligne du dépôt."""
    return "\r\n".join(lignes)


CIBLES = [
    {
        "libelle": "M1. ⛔ LE DÉFAUT D'ORIGINE : le formulaire d'accueil réémet `maxPriceCents`",
        "fichier": ACCUEIL,
        "avant": '<select id="hm-budget" name="maxPrice" defaultValue="">',
        "apres": '<select id="hm-budget" name="maxPriceCents" defaultValue="">',
        "occurrences": 1,
        "suite": "accueil",
        "titre": "les champs portent les noms que `/salles` LIT",
    },
    {
        "libelle": "M2. ⛔ LE FACTEUR 100 : les paliers d'accueil repassent en centimes",
        # ⚠ La cible qui compte le plus. Avec le BON nom et des valeurs
        # remises en centimes, « 500 000 DA » part en `maxPrice=50000000` — un
        # plafond de 50 MILLIONS de dinars, donc aucun filtre, et rien à l'écran
        # ne le dit. Une garde qui ne vérifie que le NOM du champ resterait verte.
        # ⚠ RÉÉCRITE EN D254 : les `<option>` n'énumèrent plus de montants, ils
        # dérivent de `BUDGET_TIERS`. La mutation porte donc sur LA DÉRIVATION,
        # ce qui la rend indépendante du nombre de paliers offerts.
        "fichier": ACCUEIL,
        "avant": '                  <option key={dinars} value={dinars}>',
        "apres": '                  <option key={dinars} value={centsFromDinars(dinars)}>',
        "occurrences": 1,
        "suite": "accueil",
        "titre": "chaque palier de budget SURVIT",
    },
    {
        "libelle": "M3. L'assistant réémet le nom de l'API dans l'URL publique",
        "fichier": ASSISTANT,
        "avant": '          q.set("maxPrice", budget);',
        "apres": '          q.set("maxPriceCents", String(centsFromDinars(budget)));',
        "occurrences": 1,
        "suite": "assistant",
        "titre": "les noms et l'encodage que `/salles` LIT",
    },
    {
        "libelle": "M4. Les deux contrats se remélangent : le compteur passe en dinars",
        # Prouve que la séparation est mesurée DES DEUX CÔTÉS. Une garde qui ne
        # regarderait que l'URL laisserait la requête d'API se tromper d'unité.
        "fichier": ASSISTANT,
        "avant": '          q.set("maxPriceCents", String(centsFromDinars(budget)));',
        "apres": '          q.set("maxPriceCents", budget);',
        "occurrences": 1,
        "suite": "assistant",
        "titre": "interroge le serveur avec les paramètres du CONTRAT",
    },
    {
        "libelle": "M5. Le repli disparaît : les anciens liens partagés reperdent leur plafond",
        "fichier": MODULE,
        "avant": "  return dinarsFromCents(first(raw.maxPriceCents));",
        "apres": '  return "";',
        "occurrences": 1,
        "suite": "module",
        "titre": "un ancien lien partagé retrouve son plafond",
    },
    {
        "libelle": "M6. ⛔ LE REPLI PART DANS L'AUTRE SENS (`maxPriceCents` corrige `maxPrice`)",
        "fichier": MODULE,
        "avant": "  if (raw.maxPrice !== undefined) return first(raw.maxPrice);",
        "apres": '  const direct = first(raw.maxPrice);\r\n  if (direct !== "") return direct;',
        "occurrences": 1,
        "suite": "module",
        # ⚠ Cette neutralisation est SUBTILE : elle laisse passer le cas nominal
        # et ne casse que les deux cas de bord — plafond effacé par le visiteur,
        # valeur malformée sous le bon nom. C'est exactement la forme qu'aurait
        # prise une « simplification » bien intentionnée.
        "titre": "coupe le repli",
    },
    {
        "libelle": "M7. L'arrondi s'invente : un reste non nul passe quand même",
        "fichier": MODULE,
        "avant": "  if (!Number.isSafeInteger(value) || value % 100 !== 0) return \"\";\r\n  return String(value / 100);",
        "apres": '  if (!Number.isSafeInteger(value)) return "";\r\n  return String(Math.round(value / 100));',
        "occurrences": 1,
        "suite": "module",
        "titre": "ABANDONNÉ, jamais arrondi",
    },
    {
        "libelle": "M8. L'ancien nom se remet à NAÎTRE dans l'URL publique",
        "fichier": MODULE,
        "avant": '  if (state.maxPrice) query.set("maxPrice", state.maxPrice);',
        "apres": '  if (state.maxPrice) query.set("maxPriceCents", String(Number(state.maxPrice) * 100));',
        "occurrences": 1,
        "suite": "module",
        "titre": "ne réémet JAMAIS l'ancien nom",
    },
    {
        "libelle": "M9. ⛔ D254 — UN PALIER REMONTE AU-DESSUS DE LA BUTÉE (le défaut B lui-même)",
        # ⚠ C'EST LA GARDE QUI N'EXISTAIT PAS. Un commentaire dans
        # `home-view.tsx` avertissait que 2 000 000 et 4 000 000 DA dépassaient
        # `BUDGET_CEILING` ; il a vécu toute la durée du défaut sans rien
        # empêcher. On remet exactement ce palier-là : la suite doit tomber.
        "fichier": MODULE,
        "avant": "export const BUDGET_TIERS = [500_000, 750_000, 1_000_000] as const;",
        "apres": "export const BUDGET_TIERS = [500_000, 750_000, 2_000_000] as const;",
        "occurrences": 1,
        "suite": "module",
        "titre": "AUCUN palier n'atteint la butée",
    },
    {
        "libelle": "M10. ⛔ D254 — LES DEUX BRANCHES DE L'ASSISTANT SE REMETTENT À DIVERGER",
        # ⚠ On abaisse la butée SOUS les paliers : le compteur continue de
        # demander un plafond en centimes, la page de résultats se le fait
        # effacer par `atCeiling`. C'est la divergence LATENTE restée ouverte
        # après D228 — invisible tant qu'aucune salle ne coûte plus que le
        # palier, ce qui est précisément pourquoi elle a besoin d'un test.
        "fichier": MODULE,
        "avant": "export const BUDGET_CEILING = 1_500_000;",
        "apres": "export const BUDGET_CEILING = 400_000;",
        "occurrences": 1,
        "suite": "assistant",
        "titre": "arrive intact à l'API ET à l'URL",
    },
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def _lancer(suite: str) -> tuple[int, str]:
    cmd = ["pnpm", "--filter", "@zwadj/client", "run", "test", "--", TESTS[suite]]
    r = subprocess.run(
        [_binaire(cmd[0]), *cmd[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return r.returncode, (r.stdout or "") + (r.stderr or "")


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


def verifier_arbre(moment: str) -> bool:
    """L'arbre porte-t-il bien le code corrigé, et NULLE PART l'ancien ?

    ⚠ Un harnais qui laisse un fichier muté fait mesurer à la porte suivante un
    dépôt que personne n'a écrit (D223, D224)."""
    ecarts = []
    accueil = io.open(ACCUEIL, encoding="utf-8", newline="").read()
    if 'name="maxPrice"' not in accueil:
        ecarts.append("le formulaire d'accueil n'émet pas `maxPrice`")
    if '<option value="50000000">' in accueil:
        ecarts.append("les paliers d'accueil sont restés en centimes")
    module = io.open(MODULE, encoding="utf-8", newline="").read()
    if "dinarsFromCents" not in module:
        ecarts.append("`dinarsFromCents` absent du module")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def main(depuis: int = 1, jusqua: int = 99) -> int:
    if not os.path.isdir(CLIENT):
        print("✗ à lancer depuis la RACINE du monorepo (apps/client introuvable).")
        return 2

    restaurer_si_interrompu()
    if not verifier_arbre("AU DÉPART"):
        return 2

    mordu, muettes, erreurs = 0, [], []
    for rang, cible in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        chemin = cible["fichier"]
        source = io.open(chemin, encoding="utf-8", newline="").read()
        vus = source.count(cible["avant"])
        if vus != cible["occurrences"]:
            # ⚠ ARRÊT FRANC : sur un arbre qui n'est pas dans l'état attendu,
            # les cibles suivantes mesureraient autre chose que ce qu'elles
            # annoncent et rendraient un verdict faux.
            print(f"✗ {cible['libelle']}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {cible['occurrences']} attendue(s) dans {chemin}")
            erreurs.append(cible["libelle"])
            break

        annuler = [{"chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(cible["avant"], cible["apres"]))
        try:
            code, sortie = _lancer(cible["suite"])
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)

        if code == 0:
            muettes.append(f"{cible['libelle']} — VERT malgré la neutralisation")
            print(f"✗ {cible['libelle']}\n   VERT malgré la neutralisation — la garde ne mesure rien.")
        elif not any("×" in ligne and cible["titre"] in ligne for ligne in sortie.splitlines()):
            muettes.append(f"{cible['libelle']} — rouge sans le titre attendu")
            print(f"✗ {cible['libelle']}\n   rouge, mais aucun échec ne porte « {cible['titre']} » — ancre à revoir.")
        else:
            mordu += 1
            print(f"✓ {cible['libelle']}")

    conforme = verifier_arbre("À L'ARRIVÉE")
    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    for m in muettes:
        print(f"  muette : {m}")
    for e in erreurs:
        print(f"  erreur de script : {e}")
    return 0 if not (muettes or erreurs or not conforme) else 1


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1, int(sys.argv[2]) if len(sys.argv) > 2 else 99))
