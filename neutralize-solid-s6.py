#!/usr/bin/env python3
"""Campagne de neutralisation — lot S6, événements de notification post-commit.

⚠ CE QUE CETTE CAMPAGNE PROUVE.
S6 remplace huit appels directs par sept publications et une table d'abonnements.
Les 424 tests d'intégration sont restés verts — ce qui est le résultat ATTENDU
et ne démontre rien : un événement publié dans le vide ne lève pas. La question
qui vaut : chaque abonnement est-il réellement branché, et la couture tient-elle
sa promesse de ne jamais lever ?

⚠ LES CIBLES COUPENT DES ABONNEMENTS, UNE À UNE. Retirer une ligne de
`notification-subscriptions.ts` ne casse RIEN visiblement : le service publie
toujours, personne n'écoute plus. C'est exactement le mode de défaillance que
S6 introduit, et c'est pourquoi il faut le mesurer plutôt que le supposer.

⚠ MESURES MIXTES, ET LA RÉPARTITION EST DITE.
`domain-events.spec.ts` mesure la couture elle-même (ordre, séquence, silence).
Les abonnements, eux, ne se mesurent qu'en BASE : c'est la ligne `Notification`
écrite — ou absente — qui dit si le courrier est parti. Aucune spec unitaire ne
couvre `bookings.service` ni `visit-bookings.service`.

Usage :
    python3 neutralize-solid-s6.py            # couture seule
    python3 neutralize-solid-s6.py --int      # + abonnements en base réelle
    python3 neutralize-solid-s6.py 1 3        # une plage
Depuis : la racine du monorepo.
"""

import io
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-sauvegarde"
COUTURE = "apps/api/src/venues/domain-events.ts"
ABONNEMENTS = "apps/api/src/venues/notification-subscriptions.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


def _int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    "couture": (["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/domain-events.spec.ts"], "unit"),
    "int-reservations": (_int("test/int/bookings.int-spec.ts"), "int"),
    "int-visites": (_int("test/int/visit-bookings.int-spec.ts"), "int"),
}

CIBLES = [
    # ── La COUTURE elle-même ────────────────────────────────────────────────
    (
        "S6-1. ⚠ LA COUTURE SE MET À LEVER — un gabarit cassé dé-confirmerait un acte écrit (D63)",
        COUTURE,
        "      } catch (error) {\n        this.logger.error({ type }, `Handler en échec sur ${type} : ${String(error)}`);\n      }",
        "      } catch (error) {\n        throw error;\n      }",
        1,
        ["couture"],
    ),
    (
        "S6-2. Les handlers cessent d'être ATTENDUS — l'ordre et le déterminisme tombent",
        COUTURE,
        "        await (handler as (p: PayloadOf<T>) => Promise<void>)(payload);",
        "        void (handler as (p: PayloadOf<T>) => Promise<void>)(payload);",
        1,
        ["couture"],
    ),
    # ── Les ABONNEMENTS — seule la base peut dire s'ils sont branchés ───────
    (
        "S6-3. ⚠ L'ABONNEMENT « demande reçue » EST COUPÉ — le pro n'est plus prévenu",
        ABONNEMENTS,
        '    this.events.subscribe("booking.requested", (p) => this.bookings.notifyProRequested(p));',
        "    void 0;",
        1,
        ["int-reservations"],
    ),
    (
        "S6-4. L'abonnement « acceptée » est coupé — le client ne sait pas que sa date est retenue",
        ABONNEMENTS,
        '    this.events.subscribe("booking.accepted", (p) => this.bookings.notifyClientAccepted(p));',
        "    void 0;",
        1,
        ["int-reservations"],
    ),
    (
        "S6-5. ⚠ LE SECOND ABONNÉ DE `visit.booked` DISPARAÎT — le pro est prévenu, pas le client",
        ABONNEMENTS,
        '    this.events.subscribe("visit.booked", (p) => this.visits.confirmToClient(p));',
        "    void 0;",
        1,
        ["int-visites"],
    ),
    (
        "S6-6. L'ORDRE des deux abonnés de `visit.booked` s'inverse",
        ABONNEMENTS,
        '    this.events.subscribe("visit.booked", (p) => this.visits.notifyProBooked(p));\n    this.events.subscribe("visit.booked", (p) => this.visits.confirmToClient(p));',
        '    this.events.subscribe("visit.booked", (p) => this.visits.confirmToClient(p));\n    this.events.subscribe("visit.booked", (p) => this.visits.notifyProBooked(p));',
        1,
        ["int-visites"],
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

    actives = [n for n, (_, genre) in MESURES.items() if genre == "unit" or avec_int]
    if not avec_int:
        print("⚠ Mesures d'INTÉGRATION non exécutées (relancer avec --int sur une base réelle).")
        print("  Sans elles, les ABONNEMENTS restent NON PROUVÉS : publier dans le vide ne lève pas.\n")

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
