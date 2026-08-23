#!/usr/bin/env python3
"""Campagne de neutralisation — lot S3, politique de transition pure.

⚠ CE QUE CETTE CAMPAGNE PROUVE.
S3 n'a changé aucun comportement : les listes de statuts qui vivaient en
littéraux dans huit méthodes sont désormais lues dans deux tableaux. Les suites
sont donc restées vertes — 423/423 en intégration — et une suite verte ne
démontre rien. La question qui vaut : les services lisent-ils VRAIMENT ces
tableaux, ou continuent-ils d'être justes par accident ?

On rend donc la politique PERMISSIVE, ou on lui fait écrire la mauvaise cible,
et on exige que quelque chose tombe — dans le module ET en base réelle. C'est
la moitié qui compte : un tableau juste que personne ne consulte serait
exactement le défaut F5, déplacé d'un cran.

⚠ CHAQUE CIBLE EST MESURÉE DES DEUX CÔTÉS. Le module pur rougit vite ; c'est
l'intégration qui atteste du CÂBLAGE. Une cible verte en intégration signalerait
que le service n'a pas bougé — ou que rien ne mesure la transition en question.

⚠ BASE RÉELLE OBLIGATOIRE pour les mesures `int-*`. Sans `--int`, la campagne
prouve que les tableaux sont justes, PAS qu'ils sont branchés.

Usage :
    python3 neutralize-solid-s3.py            # module pur seul
    python3 neutralize-solid-s3.py --int      # + base réelle (la vraie preuve)
    python3 neutralize-solid-s3.py 1 2        # une plage
Depuis : la racine du monorepo.
"""

import io
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-sauvegarde"
RESERVATIONS = "apps/api/src/venues/booking-transitions.ts"
DEVIS = "apps/api/src/venues/quote-transitions.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


def _unite(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", fichier]


def _integration(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    "politique-reservations": (_unite("src/venues/booking-transitions.spec.ts"), "unit"),
    "politique-devis": (_unite("src/venues/quote-transitions.spec.ts"), "unit"),
    "int-reservations": (_integration("test/int/bookings.int-spec.ts"), "int"),
    "int-devis": (_integration("test/int/quotes.int-spec.ts"), "int"),
}

CIBLES = [
    (
        "S3-1. ⚠ `accept` DEVIENT PERMISSIF — une demande déjà close se ré-accepte",
        RESERVATIONS,
        "    from: [BookingStatus.PENDING],\n    to: BookingStatus.ACCEPTED,",
        "    from: Object.values(BookingStatus),\n    to: BookingStatus.ACCEPTED,",
        1,
        ["politique-reservations", "int-reservations"],
    ),
    (
        "S3-2. Le motif cesse d'être exigé : une ACCEPTED s'annule sans un mot (D83)",
        RESERVATIONS,
        "    reasonRequiredFrom: [BookingStatus.ACCEPTED]",
        "    reasonRequiredFrom: []",
        1,
        ["politique-reservations", "int-reservations"],
    ),
    (
        "S3-3. `decline` écrit la MAUVAISE cible — le refus verrouille au lieu de libérer",
        RESERVATIONS,
        "    to: BookingStatus.DECLINED,",
        "    to: BookingStatus.ACCEPTED,",
        1,
        ["politique-reservations", "int-reservations"],
    ),
    (
        "S3-4. `cancelAsPro` s'ouvre à PENDING — deux chemins pour refuser, aux effets différents",
        RESERVATIONS,
        "    from: [BookingStatus.ACCEPTED],\n    to: BookingStatus.CANCELLED,",
        "    from: [BookingStatus.PENDING, BookingStatus.ACCEPTED],\n    to: BookingStatus.CANCELLED,",
        1,
        ["politique-reservations", "int-reservations"],
    ),
    (
        "S3-5. ⚠ `cancel` DEVIENT PERMISSIF côté devis — un devis clos se re-clôt (D121)",
        DEVIS,
        "  [QuoteCommand.CANCEL]: { from: QUOTE_OPEN_STATUSES, to: QuoteStatus.CANCELLED }",
        "  [QuoteCommand.CANCEL]: { from: Object.values(QuoteStatus), to: QuoteStatus.CANCELLED }",
        1,
        ["politique-devis", "int-devis"],
    ),
    (
        "S3-6. `convert` s'ouvre aux chaînes CLOSES — une affaire perdue se convertit",
        DEVIS,
        "  [QuoteCommand.CONVERT]: { from: QUOTE_OPEN_STATUSES, to: null },",
        "  [QuoteCommand.CONVERT]: { from: Object.values(QuoteStatus), to: null },",
        1,
        ["politique-devis", "int-devis"],
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
    commande, _ = MESURES[nom]
    return subprocess.run(
        [_binaire(commande[0]), *commande[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    ).returncode


def main(argv: list[str]) -> int:
    avec_int = "--int" in argv
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    actives = [nom for nom, (_, genre) in MESURES.items() if genre == "unit" or avec_int]
    if not avec_int:
        print("⚠ Mesures d'INTÉGRATION non exécutées (relancer avec --int sur une base réelle).")
        print("  Sans elles, on prouve que les TABLEAUX sont justes, pas qu'ils sont BRANCHÉS.\n")

    for nom in actives:
        if lancer(nom) != 0:
            print(f"✗ PRÉ-VOL : « {nom} » est DÉJÀ ROUGE avant mutation. Campagne abandonnée.")
            return 2
    print(f"✓ Pré-vol : {len(actives)} mesure(s) verte(s) — {', '.join(actives)}\n")

    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        # ⚠ Fichiers en CRLF : un motif multi-lignes DOIT porter \r\n, sinon il
        # ne matche rien — et c'est le compte asserté qui le dit (D224).
        avant = avant.replace("\n", "\r\n")
        apres = apres.replace("\n", "\r\n")
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            retenues = [m for m in mesures if m in actives]
            codes = {m: lancer(m) for m in retenues}
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
