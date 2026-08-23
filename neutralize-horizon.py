#!/usr/bin/env python3
"""Campagne de neutralisation — D227, refus hors horizon.

⚠ CE QUE CE LOT AJOUTE EST UN REFUS. Un refus qui ne tombe pas ne se voit pas :
la page rend des salles, l'annotation se calcule sur une date que personne ne
pourra jamais réserver, et rien à l'écran ne le dit. Les gardes doivent donc
être démontrées mordantes une par une.

⛔ RÈGLE COMMUNE AUX HARNAIS DE CE DÉPÔT (D226) : aucun filtre `-t`.
`vitest -t <motif>` sort en 0 quand RIEN ne correspond. On lance le FICHIER de
tests entier, et une cible ne compte que si le code de sortie est non nul ET que
le titre attendu apparaît sur une ligne d'échec.

⚠ CE HARNAIS TRAVERSE DEUX PAQUETS. Le refus naît dans `@zwadj/api`, se traduit
en `@zwadj/client` : une cible qui n'existerait que d'un côté laisserait passer
la faute la plus probable — les deux moitiés qui cessent de parler du même
refus.

⛔ CE QUE CE HARNAIS NE MESURE PAS, et qui est écrit plutôt que tu. La règle
« une seule lecture d'horloge » (D48) n'a AUCUNE cible ici : les specs figent
l'horloge, donc deux `Date.now()` y rendent le même instant et aucune assertion
ne bouge. La garde est le commentaire du service et la relecture, pas un test.
Prétendre le contraire serait exactement le défaut que ces harnais traquent.

Usage :  python3 neutralize-horizon.py [depuis] [jusqua]
Depuis  :  la racine du monorepo.
"""

import io
import json
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-horizon"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")

SERVICE = "apps/api/src/venues/venues-public.service.ts"
API_CLIENT = "apps/client/src/lib/api.ts"
VUE = "apps/client/src/components/search/search-view.tsx"

SUITES = {
    "service": ("@zwadj/api", "src/venues/venues-public.service.spec.ts"),
    "api-client": ("@zwadj/client", "src/lib/api.test.ts"),
    "vue": ("@zwadj/client", "src/components/search/search-view.test.tsx"),
}

CIBLES = [
    {
        "libelle": "H1. Le refus hors horizon disparaît : une date de 2099 est annotée comme les autres",
        "fichier": SERVICE,
        "avant": "    if (civilUtcMs(date) > civilUtcMs(horizon)) this.throwAvailableOnBeyondHorizon();",
        "apres": "    void horizon;",
        "suite": "service",
        "titre": "le LENDEMAIN de l'horizon",
    },
    {
        "libelle": "H2. ⛔ LA BORNE GLISSE D'UN JOUR : le jour de l'horizon lui-même est refusé",
        # ⚠ D55 — la cible qui vaut le plus cher. Une borne fausse d'un jour ne
        # se voit ni à l'écran ni dans les journaux : elle refuse simplement la
        # dernière date ouverte, et personne ne s'en aperçoit avant qu'un client
        # ne se plaigne d'un jour qu'il croyait réservable.
        "fichier": SERVICE,
        "avant": "if (civilUtcMs(date) > civilUtcMs(horizon))",
        "apres": "if (civilUtcMs(date) >= civilUtcMs(horizon))",
        "suite": "service",
        "titre": "LE JOUR DE L'HORIZON EST ACCEPTÉ",
    },
    {
        "libelle": "H3. ⛔ LES DEUX REFUS RETOMBENT SOUS LE MÊME CODE — la décision D227 annulée",
        "fichier": SERVICE,
        "avant": "      code: VenueErrorCode.AVAILABLE_ON_BEYOND_HORIZON,",
        "apres": "      code: VenueErrorCode.AVAILABLE_ON_PAST,",
        "suite": "service",
        "titre": "NE PORTENT PAS LE MÊME CODE",
    },
    {
        "libelle": "H4. Le client range le nouveau refus avec l'ancien",
        # La moitié cliente de H3 : le serveur distingue, le navigateur confond.
        # Rien ne casse, l'écran dit simplement le contraire de ce qu'il faut.
        "fichier": API_CLIENT,
        "avant": '            return { kind: "beyond-horizon" };',
        "apres": '            return { kind: "past-date" };',
        "suite": "api-client",
        "titre": "PAS `past-date`",
    },
    {
        "libelle": "H5. L'écran affiche « cette date est déjà passée » pour une date de 2099",
        "fichier": VUE,
        "avant": '<h2>{t(refus === "past" ? "availableOn.pastTitle" : "availableOn.horizonTitle")}</h2>',
        "apres": '<h2>{t("availableOn.pastTitle")}</h2>',
        "suite": "vue",
        "titre": "l'AUTRE message",
    },
    {
        "libelle": "H6. Une PANNE emprunte le message de date : `unreachable` tombe du mauvais côté",
        "fichier": VUE,
        "avant": '    case "ok":\r\n    case "unreachable":\r\n      return null;',
        "apres": '    case "ok":\r\n      return null;\r\n    case "unreachable":\r\n      return "horizon";',
        "suite": "vue",
        "titre": "une PANNE reste une panne",
    },
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run` (Windows : `pnpm.cmd`)."""
    return shutil.which(nom) or nom


def _lancer(suite: str) -> tuple[int, str]:
    paquet, fichier = SUITES[suite]
    cmd = ["pnpm", "--filter", paquet, "run", "test", "--", fichier]
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
    """L'arbre porte-t-il bien le code corrigé ?

    ⚠ Contrôlé AU DÉPART et À L'ARRIVÉE : un harnais qui laisse un fichier muté
    fait mesurer à la porte suivante un dépôt que personne n'a écrit (D223,
    D224)."""
    ecarts = []
    if "throwAvailableOnBeyondHorizon" not in io.open(SERVICE, encoding="utf-8", newline="").read():
        ecarts.append("le refus hors horizon est absent du service")
    if '"beyond-horizon"' not in io.open(API_CLIENT, encoding="utf-8", newline="").read():
        ecarts.append("la quatrième issue est absente du client")
    if "horizonTitle" not in io.open(VUE, encoding="utf-8", newline="").read():
        ecarts.append("le second jeu de textes est absent de la vue")
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def main(depuis: int = 1, jusqua: int = 99) -> int:
    if not os.path.isdir("apps/api") or not os.path.isdir("apps/client"):
        print("✗ à lancer depuis la RACINE du monorepo.")
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
        if vus != 1:
            # ⚠ ARRÊT FRANC : sur un arbre qui n'est pas dans l'état attendu, les
            # cibles suivantes mesureraient autre chose que ce qu'elles annoncent.
            print(f"✗ {cible['libelle']}\n   ERREUR DE SCRIPT : {vus} occurrence(s), 1 attendue dans {chemin}")
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
