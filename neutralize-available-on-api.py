#!/usr/bin/env python3
"""Campagne de neutralisation — volet API du lot `availableOn`.

Mêmes règles que le volet client : chaque garde est désactivée, le test visé
DOIT rougir, et le script ASSERTE son nombre de remplacements (un remplacement
à zéro laisserait `vitest -t` sortir 0 et se lirait « garde muette »).
"""

import io
import os
import shutil
import subprocess
import sys

ENV = {"DATABASE_URL": "postgresql://x:x@localhost:5432/x"}

CIBLES = [
    (
        "A1. Le refus de date passée est retiré",
        "apps/api/src/venues/venues-public.service.ts",
        "if (civilUtcMs(date) < civilUtcMs(civilTodayAt(Date.now()))) this.throwAvailableOnPast();",
        "/* neutralisé */",
        1,
        "date passée",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A2. La borne devient `<=` : aujourd'hui est refusé à tort",
        "apps/api/src/venues/venues-public.service.ts",
        "if (civilUtcMs(date) < civilUtcMs(civilTodayAt(Date.now()))) this.throwAvailableOnPast();",
        "if (civilUtcMs(date) <= civilUtcMs(civilTodayAt(Date.now()))) this.throwAvailableOnPast();",
        1,
        "AUJOURD'HUI EST ACCEPTÉ",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A3. `PENDING` est rechargé : une demande en attente grise",
        "apps/api/src/venues/venues-public.service.ts",
        "status: { in: [...HARD_BOOKING_STATUSES] },",
        'status: { in: ["PENDING", ...HARD_BOOKING_STATUSES] },',
        1,
        "PENDING",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A4. La fenêtre retombe à minuit + 24 h (la soirée 20h→02h ment)",
        "apps/api/src/venues/availability-time.ts",
        "return civilDayStartMs(date) + SLOT_END_MAX_MINUTES * MINUTE_MS;",
        "return civilDayStartMs(date) + 1440 * MINUTE_MS;",
        1,
        "48 H",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        # ⚠ CIBLE REMPLACÉE. Elle neutralisait `null` -> `false` sur une branche
        # qui N'EXISTE PLUS : l'exclusion vit désormais dans le `where`.
        # Laissée telle quelle, elle a échoué en ERREUR DE SCRIPT — donc
        # bruyamment, pas en vert. C'est exactement à ça que sert
        # l'assertion de comptage : une décision inversée périme ses cibles.
        "A5. L'exclusion des salles sans créneau (situation B) quitte le `where`",
        "apps/api/src/venues/venues-public.service.ts",
        "      ...(annotateOn === null ? {} : { slotTemplates: { some: ACTIVE_SLOT } }),",
        "",
        1,
        "SITUATION B",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A6. Le regroupement par salle saute : les salles se contaminent",
        "apps/api/src/venues/venues-public.service.ts",
        "bookings: (bookingsByVenue.get(row.id) ?? []) as BookingWindow[],",
        "bookings: [...bookingsByVenue.values()].flat() as BookingWindow[],",
        1,
        "CONTAMINENT",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A7. `singleSlot` est câblé en dur à `false`",
        "apps/api/src/venues/venues-public.service.ts",
        'singleSlot: row.bookingMode === "SINGLE_SLOT"',
        "singleSlot: false",
        1,
        "SINGLE_SLOT",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A8. L'annotation devient un FILTRE (la salle grisée quitte la page)",
        "apps/api/src/venues/venues-public.service.ts",
        "      items: rows.map((row) => this.toSummary(row, availability)),",
        "      items: rows.filter((row) => availability.get(row.id) !== false).map((row) => this.toSummary(row, availability)),",
        1,
        "ANNOTER N'EST PAS FILTRER",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A9. L'écho `availableOn` disparaît de la réponse",
        "apps/api/src/venues/venues-public.service.ts",
        "      availableOn: query.availableOn ?? null",
        "      availableOn: null",
        1,
        "ANNOTER N'EST PAS FILTRER",
        "src/venues/venues-public.service.spec.ts",
    ),
    (
        "A10. `computeDayAvailability` cesse de déléguer (seconde autorité)",
        "apps/api/src/venues/availability-engine.ts",
        "  return computeDaySlotStatuses({ dayStartMs, slots, bookings, blocks, singleSlot }).map((entry) => {",
        "  const st = computeDaySlotStatuses({ dayStartMs, slots, bookings, blocks, singleSlot });\r\n  return st.map((entry) => {",
        1,
        "DÉLÈGUE",
        "src/venues/availability-engine.spec.ts",
    ),
    (
        "B1. Le 404 de routage n'est plus normalisé (retour à l'enveloppe brute de Nest)",
        "apps/api/src/common/filters/all-exceptions.filter.ts",
        "    if (exception instanceof NotFoundException && !carriesCode(body)) {",
        "    if (false as boolean) {",
        1,
        "ROUTE INCONNUE",
        "src/common/filters/all-exceptions.filter.spec.ts",
    ),
    (
        "B2. TOUS les 404 sont réécrits : le code métier est écrasé",
        "apps/api/src/common/filters/all-exceptions.filter.ts",
        "    if (exception instanceof NotFoundException && !carriesCode(body)) {",
        "    if (exception instanceof NotFoundException) {",
        1,
        "404 MÉTIER",
        "src/common/filters/all-exceptions.filter.spec.ts",
    ),
    (
        "A13. L'exclusion mord AUSSI sans date (elle retire trop large)",
        "apps/api/src/venues/venues-public.service.ts",
        "      ...(annotateOn === null ? {} : { slotTemplates: { some: ACTIVE_SLOT } }),",
        "      ...{ slotTemplates: { some: ACTIVE_SLOT } },",
        1,
        "SANS `availableOn`, AUCUNE exclusion",
        "src/venues/venues-public.service.spec.ts",
    ),
]


# ── Sécurité de reprise ─────────────────────────────────────────────────────
# ⚠ DÉFAUT RÉEL RENCONTRÉ : ce script a été tué par un `timeout` externe. Le
# `finally` de restauration n'a alors PAS tourné, et l'arbre de travail est
# resté avec une garde neutralisée — c'est-à-dire un fichier sciemment cassé,
# indiscernable à l'œil. Un lot construit dans cet état aurait embarqué la
# faute. Le `finally` protège de l'exception, pas du signal.
#
# Parade : les originaux sont écrits sur disque AVANT toute mutation, et un
# démarrage les restaure s'ils traînent encore d'une exécution interrompue.
SAUVEGARDE = ".neutralisation-sauvegarde"


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run`.

    ⚠ Windows : `pnpm` est un `pnpm.cmd`, et `CreateProcess` ne consulte PAS
    `PATHEXT` — il ne cherche qu'un `.exe`, échoue en `WinError 2`, et la
    campagne meurt avant d'avoir mesuré quoi que ce soit. `shutil.which`, lui,
    consulte `PATHEXT` et rend le chemin complet. Sur POSIX il rend le même nom.
    """
    return shutil.which(nom) or nom


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
    import os

    env = {**os.environ, **ENV}
    restaurer_si_interrompu()
    mordu, muettes = 0, []
    for rang, (libelle, chemin, avant, apres, attendu, filtre, fichier) in enumerate(CIBLES, start=1):
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
            code = subprocess.run(
                # ⚠ Chemin POSIX en dur à l'origine : sous Windows le binaire
                # est `vitest.CMD` dans le même dossier, et `_binaire` le
                # trouve via PATHEXT. Le repli garde le comportement POSIX.
                [_binaire("apps/api/node_modules/.bin/vitest"), "run", fichier, "-t", filtre],
                cwd="apps/api",
                capture_output=True,
                text=True,
                encoding="utf-8",
                errors="replace",
                env=env,
            ).returncode
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            os.remove(marque)

        if code == 0:
            muettes.append(libelle)
            print(f"✗ {libelle}\n   VERT malgré la neutralisation — cette garde ne mesure rien.")
        else:
            mordu += 1
            print(f"✓ {libelle}")

    # Le dossier de sauvegarde a été vidé fichier par fichier ; on retire la
    # coquille, sinon une campagne réussie laisse une trace dans `git status`
    # et le prochain lecteur se demande si quelque chose a mal tourné.
    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    for m in muettes:
        print(f"  muette : {m}")
    return 0 if not muettes else 1


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1, int(sys.argv[2]) if len(sys.argv) > 2 else 99))
