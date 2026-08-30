#!/usr/bin/env python3
"""Campagne de neutralisation — B7, variables locales (D265).

⛔ CE QUE CE HARNAIS PROUVE, ET POURQUOI IL EXISTE.
B7 résolvait TOUTES les variables sur `document.documentElement`. Une variable
déclarée ailleurs y rend la chaîne vide — enregistrée comme si c'était une
mesure. `--hm-gutter` pouvait donc passer de `clamp(18px, 5vw, 80px)` à `0`
sans que B7 bronche. Ce harnais vérifie que ce n'est PLUS le cas.

⚠ CHAQUE CIBLE COÛTE UN LANCEMENT PLAYWRIGHT COMPLET (démarrage d'une API,
d'un Next, d'un Vite et d'un PostgreSQL dédiés). Compter ~3 à 5 minutes par
cible, soit un quart d'heure pour la campagne. C'est le prix d'une preuve sur
une garde de navigateur ; il n'y a pas de version rapide honnête.

Usage :
    python3 neutralisation/neutralize-b7.py
    python3 neutralisation/neutralize-b7.py 1 1
Depuis : la racine du monorepo.

Codes de sortie : 0 = toutes mordent · 1 = garde MUETTE · 2 = erreur de script
ou pré-vol déjà rouge.
"""

import io
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

if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-b7"
THEME = "apps/client/src/app/theme.css"
SPEC = "e2e/specs/b7-token-contract.e2e.ts"


def _binaire(nom: str) -> str:
    return shutil.which(nom) or nom


# ⚠ `--grep` RESTREINT À B7 : les autres suites e2e ne mesurent pas les tokens,
#   les faire tourner seize fois n'ajouterait aucune information.
MESURES = {
    "b7": [
        "pnpm", "--filter", "@zwadj/e2e", "exec", "playwright", "test",
        "--grep", "B7", "--reporter", "line"
    ]
}

CIBLES = [
    (
        "B7-1. ⛔⛔ LA VALEUR DE `--hm-gutter` TOMBE À ZÉRO — la gouttière disparaît",
        # ⚠ LA CIBLE DEMANDÉE PAR KO, ET LE CŒUR DU LOT. Avant D265 cette
        # mutation laissait B7 VERT : la racine rendait "" dans les deux cas.
        # Si elle reste verte aujourd'hui, la correction ne mesure toujours rien.
        THEME,
        "  --hm-gutter: clamp(18px, 5vw, 80px);",
        "  --hm-gutter: 0;",
        1,
        ["b7"],
    ),
    (
        "B7-2. ⛔ LA TABLE OUBLIE `--hm-gutter` — la garde de COUVERTURE doit mordre",
        # Ce que cette cible protège : le jour où quelqu'un ajoute une variable
        # locale sans l'inscrire, B7 doit le REFUSER au lieu de l'ignorer.
        SPEC,
        '  "client-light": [{ selecteur: ".hm", variables: ["--hm-gutter"] }],',
        '  "client-light": [],',
        1,
        ["b7"],
    ),
    (
        "B7-3. ⛔ LE SÉLECTEUR PORTEUR N'EXISTE PLUS — la garde de PRÉSENCE doit mordre",
        # Une classe renommée rendrait la mesure muette au lieu de rouge.
        SPEC,
        '  "client-dark": [{ selecteur: ".hm", variables: ["--hm-gutter"] }],',
        '  "client-dark": [{ selecteur: ".hm-inexistant", variables: ["--hm-gutter"] }],',
        1,
        ["b7"],
    ),
]


def restaurer_si_interrompu() -> None:
    if not os.path.isdir(SAUVEGARDE):
        return
    for nom in os.listdir(SAUVEGARDE):
        chemin = io.open(os.path.join(SAUVEGARDE, nom, ".chemin"), encoding="utf-8").read()
        contenu = io.open(os.path.join(SAUVEGARDE, nom, ".contenu"), encoding="utf-8", newline="").read()
        io.open(chemin, "w", encoding="utf-8", newline="").write(contenu)
        print(f"↩ RESTAURÉ après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE, ignore_errors=True)


def lancer(nom: str) -> tuple[int, str]:
    commande = MESURES[nom]
    argv = [_binaire(commande[0]), *commande[1:]]
    r = subprocess.run(argv, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, f"{r.stdout or ''}\n{r.stderr or ''}"


def main(argv: list[str]) -> int:
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    code, sortie = lancer("b7")
    if code != 0:
        print("✗ PRÉ-VOL : B7 est DÉJÀ ROUGE avant mutation. Campagne abandonnée.")
        print("  ⚠ Si c'est l'ajout de `--accent-text` (D264), régénérer la référence")
        print("    D'ABORD : UPDATE_TOKEN_BASELINE=1 pnpm test:e2e, puis RELIRE le fichier.")
        for l in [x for x in sortie.splitlines() if x.strip()][-30:]:
            print(f"   │ {l}")
        return 2
    print("✓ Pré-vol : B7 vert\n")

    mordu, muettes = 0, []
    vues = 0
    for rang, (libelle, chemin, avant, apres, attendu, _mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        a = avant.replace("\n", "\r\n")
        b = apres.replace("\n", "\r\n")
        vus = source.count(a)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        vues += 1
        marque = os.path.join(SAUVEGARDE, str(abs(hash(chemin))))
        os.makedirs(marque, exist_ok=True)
        io.open(os.path.join(marque, ".chemin"), "w", encoding="utf-8").write(chemin)
        io.open(os.path.join(marque, ".contenu"), "w", encoding="utf-8", newline="").write(source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(a, b))
        try:
            code, _ = lancer("b7")
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            shutil.rmtree(marque, ignore_errors=True)

        if code == 0:
            muettes.append(libelle)
            print(f"✗ {libelle}\n   VERT malgré la neutralisation.")
        else:
            mordu += 1
            print(f"✓ {libelle}")

    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) mordue(s) sur {vues} cible(s) mesurée(s).")
    for m in muettes:
        print(f"  muette : {m}")
    return 1 if muettes else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
