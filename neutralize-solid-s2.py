#!/usr/bin/env python3
"""Campagne de neutralisation — lot S2, cœur commun du répartiteur de notifications.

⚠ CE QUE CETTE CAMPAGNE PROUVE.
S2 a sorti de DEUX services un corps identique. Les suites sont restées vertes,
ce qui ne démontre rien : un corps déplacé mais jamais appelé les laisserait
vertes tout autant. On mute donc chacune des CINQ règles dans le cœur commun et
on exige que quelque chose tombe.

⚠ CE QU'ELLE REFUSE DE PROUVER. Après extraction, un test « le côté réservation
se comporte comme le côté visite » serait VERT par construction — il ne peut
plus en être autrement (D223). Aucune cible ici ne mesure cette égalité : les
cibles portent sur l'ORDRE des écritures, la TRONCATURE, le silence obstiné.

⚠ ASYMÉTRIE DES CONSOMMATEURS, assumée et rapportée.
`visit-notifications.service.spec.ts` existe et mesure trois de ces règles :
elle rougit donc, et c'est ce qui atteste que l'appelant lit bien ce cœur.
`booking-notifications.service.ts` n'a AUCUNE spec unitaire — sa seule mesure
est `bookings.int-spec.ts`. Une garde posée sur du code partagé se vérifie chez
TOUS ses consommateurs (D226) : la moitié réservation est donc déclarée en
mesure d'intégration, exécutable par `--int`, et NON couverte sans base réelle.

Usage :
    python3 neutralize-solid-s2.py            # mesures unitaires seules
    python3 neutralize-solid-s2.py --int      # + intégration (base réelle)
    python3 neutralize-solid-s2.py 1 2        # une plage de cibles
Depuis : la racine du monorepo.
"""

import io
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-sauvegarde"
COEUR = "apps/api/src/common/notifications/notification-dispatch.ts"

# ⚠ AUCUN `-t` : `vitest -t <motif>` sort en 0 quand rien ne correspond (D226),
# et une campagne bâtie dessus rapporte « muette » ce qui n'a jamais tourné.
MESURES = {
    "coeur": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/common/notifications/notification-dispatch.spec.ts"],
        "unit",
    ),
    "visites": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/visit-notifications.service.spec.ts"],
        "unit",
    ),
    "int-reservations": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/bookings.int-spec.ts"],
        "int",
    ),
    "int-visites": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/visit-bookings.int-spec.ts"],
        "int",
    ),
}

CIBLES = [
    (
        "S2-1. ⚠ LA TRACE S'ÉCRIT APRÈS L'ENVOI — un process tué ne laisse plus rien à rejouer",
        COEUR,
        "    const row = await prisma.notification.create({",
        "    await send();\n    const row = await prisma.notification.create({",
        1,
        ["coeur"],
    ),
    (
        "S2-2. La résolution SENT saute : la ligne reste QUEUED pour toujours",
        COEUR,
        '      await prisma.notification.update({ where: { id: row.id }, data: { status: "SENT", sentAt: new Date() } });',
        "      void row;",
        1,
        ["coeur", "visites", "int-reservations", "int-visites"],
    ),
    (
        "S2-3. L'échec d'envoi n'écrit plus FAILED — l'échec devient invisible en base",
        COEUR,
        '        data: { status: "FAILED", error: reason.slice(0, 500) }',
        '        data: { status: "QUEUED" }',
        1,
        ["coeur", "visites", "int-reservations"],
    ),
    (
        "S2-4. La TRONCATURE à 500 saute : un motif à rallonge part entier vers la colonne",
        COEUR,
        "reason.slice(0, 500)",
        "reason",
        1,
        ["coeur"],
    ),
    (
        "S2-5. ⚠ LE SILENCE TOMBE : l'échec d'écriture de la trace REMONTE à l'appelant (D63)",
        COEUR,
        "    logger.error({ type, channel, userId }, `Notification non journalisée : ${String(error)}`);",
        "    throw error;",
        1,
        # ⚠ AUCUNE mesure d'intégration ici, et c'est mesuré, pas supposé : ce
        # `catch` externe ne s'exécute QUE si `notification.create` lève. En
        # intégration la base fonctionne et rien n'injecte de panne Prisma — la
        # ligne mutée est INATTEIGNABLE, la suite reste donc verte quoi qu'on
        # fasse. Déclarer `int-reservations` ici (premier jet du lot S2) était
        # une erreur de conception du harnais : une mesure qui ne PEUT pas
        # rougir n'est pas une mesure, elle fabrique une fausse alarme.
        ["coeur", "visites"],
    ),
]


def restaurer_si_interrompu() -> None:
    """Un `finally` ne s'exécute PAS quand le processus est tué (D223, revu au
    lot S0 : une campagne coupée par la limite d'exécution a laissé un fichier
    sciemment cassé dans l'arbre). La sauvegarde disque est le seul filet."""
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


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run`.

    ⚠ Windows : `pnpm` est un `pnpm.cmd`, et `CreateProcess` ne consulte PAS
    `PATHEXT` — il ne cherche qu'un `.exe`, échoue en `WinError 2`, et la
    campagne meurt avant d'avoir mesuré quoi que ce soit. `shutil.which`, lui,
    consulte `PATHEXT` et rend le chemin complet. Sur POSIX il rend le même nom.
    """
    return shutil.which(nom) or nom

def lancer(nom: str) -> int:
    commande, _ = MESURES[nom]
    return subprocess.run(
        [_binaire(commande[0]), *commande[1:]],
        capture_output=True,
        # ⚠ `text=True` seul décode en cp1252 sous Windows : la sortie UTF-8 de
        # vitest lève une UnicodeDecodeError dans un thread lecteur. On impose
        # l'encodage et on tolère l'irréductible — on lit un CODE DE RETOUR,
        # pas le texte.
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
        print("  Sans elles, le côté RÉSERVATION reste NON PROUVÉ : il n'a aucune spec unitaire.\n")

    # ── Pré-vol : une mesure doit être VERTE avant mutation, sinon on ne
    # mesurerait pas la garde mais un rouge préexistant — ou un chemin faux.
    for nom in actives:
        if lancer(nom) != 0:
            print(f"✗ PRÉ-VOL : la mesure « {nom} » est DÉJÀ ROUGE avant toute mutation. Campagne abandonnée.")
            return 2
    print(f"✓ Pré-vol : {len(actives)} mesure(s) verte(s) — {', '.join(actives)}\n")

    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        # ⚠ Le fichier est en CRLF : un motif multi-lignes DOIT porter \r\n,
        # sinon il ne matche rien — et c'est le compte asserté qui le dit,
        # jamais une neutralisation silencieusement sans effet (D224).
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
