#!/usr/bin/env python3
"""Campagne de neutralisation — lot S5b, port de la CONCURRENCE (réservation).

⚠ CE QUE CETTE CAMPAGNE PROUVE.
S5b déplace la transaction d'acceptation et le check-and-set derrière un port.
Les 424 tests d'intégration sont restés verts, ce qui ne démontre rien : un
déplacement raté peut très bien laisser passer les cas non concurrents. On
neutralise donc les cinq règles de concurrence UNE À UNE, dans l'adaptateur, et
on exige que la base les fasse tomber.

⚠ TOUTES LES MESURES SONT EN INTÉGRATION, ET C'EST LA SEULE FAÇON HONNÊTE.
Un verrou `FOR UPDATE`, une relecture sous transaction et un refus d'`EXCLUDE`
ne se mesurent pas avec un double : ils se mesurent contre PostgreSQL, avec deux
requêtes concurrentes. Un double dirait seulement que l'on a écrit ce que l'on a
écrit.

⚠ BASE RÉELLE OBLIGATOIRE. Sans elle, cette campagne ne s'exécute pas — elle ne
« passe » pas, elle n'a pas lieu. Chaque cible prend une minute ou deux : la
suite complète tourne pour chacune.

Usage :
    python3 neutralize-solid-s5b.py            # les cinq cibles
    python3 neutralize-solid-s5b.py 1 2        # une plage
Depuis : la racine du monorepo, base de développement lancée.
"""

import io
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-sauvegarde"
ADAPTATEUR = "apps/api/src/venues/booking-locks.prisma.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


MESURES = {
    "int-reservations": [
        "pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run",
        "-c", "vitest.config.int.ts", "test/int/bookings.int-spec.ts",
    ],
}

CIBLES = [
    (
        "S5b-1. ⚠ LE VERROU DE SALLE SAUTE — deux acceptations concurrentes ne sont plus sérialisées",
        ADAPTATEUR,
        "      await tx.$queryRaw`SELECT id FROM venues WHERE id = ${input.venueId}::uuid FOR UPDATE`;",
        "      void input.venueId;",
        1,
        ["int-reservations"],
    ),
    (
        "S5b-2. ⚠ LA RELECTURE D117 NE JUGE PLUS — le statut sous verrou cesse de faire autorité",
        ADAPTATEUR,
        "      if (!input.allowedFrom.includes(fresh.status)) {",
        "      if (false && !input.allowedFrom.includes(fresh.status)) {",
        1,
        ["int-reservations"],
    ),
    (
        "S5b-3. Le contrôle de BLOCAGE disparaît — une période bloquée redevient acceptable",
        ADAPTATEUR,
        '      if (block) return { outcome: "BLOCKED_PERIOD" };',
        "      void block;",
        1,
        ["int-reservations"],
    ),
    (
        "S5b-4. ⚠ LE REFUS DE L'EXCLUDE N'EST PLUS TRADUIT — 500 au lieu de 409 sur créneau pris",
        ADAPTATEUR,
        '        if (isExclusionViolation(error)) return { outcome: "SLOT_TAKEN" };',
        "        void isExclusionViolation(error);",
        1,
        ["int-reservations"],
    ),
    (
        "S5b-5. ⚠ LE CHECK-AND-SET N'EN EST PLUS UN — la transition écrit quel que soit le statut",
        ADAPTATEUR,
        "        where: { id: input.bookingId, status: { in: [...input.from] } },",
        "        where: { id: input.bookingId },",
        1,
        ["int-reservations"],
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
        # ⚠ Fichier en CRLF : un motif multi-lignes DOIT porter \r\n (D224).
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
