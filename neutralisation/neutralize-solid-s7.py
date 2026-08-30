#!/usr/bin/env python3
"""Campagne de neutralisation — lot S7, garde des sorties de test.

⚠ CE QUE CETTE CAMPAGNE PROUVE.
S7 pose une garde qui fait ÉCHOUER tout fichier de test non exempté produisant
un `console.error` ou `console.warn`. Les suites sont restées vertes — ce qui
est le résultat attendu, et ne prouve rien : une garde qui ne serait jamais
évaluée laisserait exactement la même trace.

Les deux cibles VIDENT la liste d'exemptions. Les sept fichiers déjà bruyants
doivent alors faire tomber leur suite. Si elles restaient vertes, cela voudrait
dire que la garde ne s'exécute pas — le pire des cas, puisqu'elle rassurerait
sans rien mesurer.

⚠ LA MORSURE PROPREMENT DITE A ÉTÉ MESURÉE À LA MAIN, comme le prescrit la
directive : un fichier JETABLE émettant un avertissement dans un chemin non
exempté fait tomber sa suite avec le message de la garde ; le même fichier,
l'avertissement retiré, repasse au vert. Les deux sens ont été relevés, puis le
fichier supprimé. On ne peut pas figer cette mesure dans une spec permanente
sans qu'elle se garde elle-même — la garde ferait tomber le test qui la teste.

Usage :
    python3 neutralize-solid-s7.py            # les deux cibles
    python3 neutralize-solid-s7.py 1 1        # une plage
Depuis : la racine du monorepo. Compter quelques minutes : chaque cible relance
une suite entière.
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

SAUVEGARDE = ".neutralisation-sauvegarde"
GARDE_CLIENT = "apps/client/src/test-setup.ts"
GARDE_PRO = "apps/pro/src/test-setup.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


MESURES = {
    "client": ["pnpm", "--filter", "@zwadj/client", "run", "test"],
    "pro": ["pnpm", "--filter", "@zwadj/pro", "run", "test"],
}

CIBLES = [
    (
        "S7-1. ⚠ LA LISTE D'EXEMPTIONS DU CLIENT EST VIDÉE — les 4 fichiers bruyants doivent tomber",
        GARDE_CLIENT,
        '  "src/components/venue/venue-detail-view.test.tsx"',
        '  "src/components/venue/PLUS_EXEMPTE.test.tsx"',
        1,
        ["client"],
    ),
    (
        "S7-2. ⚠ LA LISTE D'EXEMPTIONS DU PRO EST VIDÉE — les 64 avertissements du parcours doivent tomber",
        GARDE_PRO,
        '  "src/dashboard/walkin-journey.test.tsx"',
        '  "src/dashboard/PLUS_EXEMPTE.test.tsx"',
        1,
        ["pro"],
    ),
]


def restaurer_si_interrompu() -> None:
    """Un `finally` ne s'exécute PAS quand le processus est tué (D223)."""
    if not os.path.isdir(SAUVEGARDE):
        return
    for marque in os.listdir(SAUVEGARDE):
        chemin = marque.replace("__", "/")
        contenu = io.open(os.path.join(SAUVEGARDE, marque), encoding="utf-8", newline="").read()
        io.open(chemin, "w", encoding="utf-8", newline="").write(contenu)
        print(f"↩ RESTAURÉ après interruption : {chemin}")
    shutil.rmtree(SAUVEGARDE)


def sauver(chemin: str, contenu: str) -> str:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    marque = os.path.join(SAUVEGARDE, chemin.replace("/", "__"))
    io.open(marque, "w", encoding="utf-8", newline="").write(contenu)
    return marque


def lancer(nom: str) -> int:
    commande = MESURES[nom]
    return subprocess.run(
        [_binaire(commande[0]), *commande[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    ).returncode


def main(argv: list[str]) -> int:
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    for nom in MESURES:
        if lancer(nom) != 0:
            print(f"✗ PRÉ-VOL : « {nom} » est DÉJÀ ROUGE avant mutation. Campagne abandonnée.")
            return 2
    print(f"✓ Pré-vol : {len(MESURES)} mesure(s) verte(s) — {', '.join(MESURES)}\n")

    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        # ⚠ Fichiers en CRLF : un motif multi-lignes DOIT porter \r\n (D224).
        avant = avant.replace("\n", "\r\n")
        apres = apres.replace("\n", "\r\n")
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            codes = {m: lancer(m) for m in mesures}
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            os.remove(marque)

        verts = [m for m, code in codes.items() if code == 0]
        if verts:
            muettes.append(f"{libelle} (vert dans : {', '.join(verts)})")
            print(f"✗ {libelle}\n   VERT dans {verts} malgré la neutralisation.")
        else:
            mordu += 1
            print(f"✓ {libelle}  [{', '.join(codes)}]")

    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    for m in muettes:
        print(f"  muette : {m}")
    return 0 if not muettes else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
