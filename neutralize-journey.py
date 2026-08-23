#!/usr/bin/env python3
"""Campagne de neutralisation — point D, chrome de parcours partagée.

⚠ CETTE CAMPAGNE EST LA SEULE PREUVE QUE LE LOT CORRIGE QUELQUE CHOSE.
Les tests du point D sont passés au vert du premier coup dans les deux
applications. Un test qui n'a jamais rougi n'a rien démontré : il faut vérifier
que chaque garde tombe quand on lui retire son objet. C'est précisément ce
défaut — une animation déclarée, jamais jouée, jamais mesurée — que le lot
corrige, et il serait absurde de le remplacer par une garde du même genre.

Mêmes règles que les deux autres harnais : nombre de remplacements ASSERTÉ,
sauvegarde sur disque avant mutation, restauration au démarrage si une
exécution précédente a été interrompue par un signal.

Usage :  python3 neutralize-journey.py [depuis] [jusqua]
Depuis  :  la racine du monorepo.
"""

import io
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-sauvegarde"

CIBLES = [
    (
        "D1. ⚠ LE `key` DE LA CARTE SAUTE — l'animation redevient muette",
        "packages/ui/src/journey.tsx",
        '<section key={stepId} className={cx("zj-card", className)}',
        '<section className={cx("zj-card", className)}',
        1,
        "REMONTÉE À CHAQUE ÉTAPE",
        ["client", "pro"],
    ),
    (
        "D2. La coche redevient un rang (le rail ne distingue plus fait/à faire)",
        "packages/ui/src/journey.tsx",
        # ⚠ DEUX occurrences, et c'est voulu : la pastille est rendue en `<span>`
        # (étape non modifiable) OU en `<button>` (étape modifiable). Neutraliser
        # une seule des deux laisserait l'autre afficher la coche et le test
        # resterait vert — la garde aurait paru mordre sans rien mesurer.
        '{step.state === "done" ? <Check size={14} strokeWidth={2.5} aria-hidden="true" /> : index + 1}',
        "{index + 1}",
        2,
        "coche du rail",
        ["client"],
    ),
    (
        "D3. Le trait de liaison se rend TOUJOURS, même sans rien à relier",
        "apps/client/src/components/filter-wizard.tsx",
        '{STEPS.some((s) => s !== step && answered[s]) ? <JourneyConnector className="wz-connector" /> : null}',
        '<JourneyConnector className="wz-connector" />',
        1,
        "TRAIT DE LIAISON",
        ["client"],
    ),
    (
        "D4. Le trait cesse d'être décoratif (il parle à un lecteur d'écran)",
        "packages/ui/src/journey.tsx",
        'return <span className={cx("zj-connector", className)} aria-hidden="true" />;',
        'return <span className={cx("zj-connector", className)} />;',
        1,
        "DÉCORATIF",
        ["client"],
    ),
    (
        "D5. Le bouton « Modifier » perd la classe partagée (retour à deux boutons)",
        "packages/ui/src/journey.tsx",
        'className="zj-btn zj-recap-edit"',
        'className="zj-btn"',
        1,
        "Modifier",
        ["client", "pro"],
    ),
    (
        "D6. La `className` d'application est jetée : le rail quitte sa colonne",
        "packages/ui/src/journey.tsx",
        '<nav className={cx("zj-rail", className)} aria-label={label}>',
        '<nav className="zj-rail" aria-label={label}>',
        1,
        "MISE EN PAGE",
        ["client", "pro"],
    ),
    (
        "D7. Le trait de liaison saute côté PRO (l'écart entre les deux revient)",
        "apps/pro/src/dashboard/walkin-journey.tsx",
        '        <JourneyConnector className="wk-connector" />',
        "        <span />",
        1,
        "TRAIT DE LIAISON",
        ["pro"],
    ),
]

def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run`.

    ⚠ Windows : `pnpm` est un `pnpm.cmd`, et `CreateProcess` ne consulte PAS
    `PATHEXT` — il ne cherche qu'un `.exe`, échoue en `WinError 2`, et la
    campagne meurt avant d'avoir mesuré quoi que ce soit. `shutil.which`, lui,
    consulte `PATHEXT` et rend le chemin complet. Sur POSIX il rend le même nom.
    """
    return shutil.which(nom) or nom

def _lancer(cmd: list[str]) -> int:
    return subprocess.run(
        [_binaire(cmd[0]), *cmd[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    ).returncode


TESTS = {
    "client": ["pnpm", "--filter", "@zwadj/client", "run", "test", "--", "src/components/filter-wizard.test.tsx", "-t"],
    "pro": ["pnpm", "--filter", "@zwadj/pro", "run", "test", "--", "src/dashboard/walkin-journey.test.tsx", "-t"],
}


def restaurer_si_interrompu() -> None:
    if not os.path.isdir(SAUVEGARDE):
        return
    for nom in os.listdir(SAUVEGARDE):
        chemin = nom.replace("__", "/")
        contenu = io.open(os.path.join(SAUVEGARDE, nom), encoding="utf-8", newline="").read()
        io.open(chemin, "w", encoding="utf-8", newline="").write(contenu)
        print(f"↺ restauré après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE)


def sauver(chemin: str, contenu: str) -> str:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    nom = os.path.join(SAUVEGARDE, chemin.replace("/", "__"))
    io.open(nom, "w", encoding="utf-8", newline="").write(contenu)
    return nom


def main(depuis: int = 1, jusqua: int = 99) -> int:
    restaurer_si_interrompu()
    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, filtre, apps) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            # ⚠ La cible doit rougir dans CHAQUE application concernée. Une
            # neutralisation dans `@zwadj/ui` qui ne ferait tomber qu'un seul
            # des deux fronts signalerait que l'autre ne mesure rien — c'est
            # exactement l'asymétrie qui avait laissé les deux copies diverger.
            codes = {app: _lancer(TESTS[app] + [filtre]) for app in apps}
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            os.remove(marque)

        verts = [app for app, code in codes.items() if code == 0]
        if verts:
            muettes.append(f"{libelle} (vert dans : {', '.join(verts)})")
            print(f"✗ {libelle}\n   VERT dans {verts} malgré la neutralisation.")
        else:
            mordu += 1
            print(f"✓ {libelle}  [{', '.join(apps)}]")

    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    for m in muettes:
        print(f"  muette : {m}")
    return 0 if not muettes else 1


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1, int(sys.argv[2]) if len(sys.argv) > 2 else 99))
