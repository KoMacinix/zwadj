#!/usr/bin/env python3
"""Campagne de neutralisation — lot S11-a (SRP sur `BookingsService`, D261).

⚠ CE LOT NE CHANGE AUCUN COMPORTEMENT. Ce qu'il faut prouver, c'est que des
décisions qui n'étaient PAS MESURABLES le sont devenues. Elles vivaient dans
`BookingsService`, service qui n'a AUCUNE spec unitaire : leur seule mesure
était `bookings.int-spec.ts`, donc un PostgreSQL réel. Une garde qui déménage
sans mordre à l'arrivée n'a pas déménagé — elle a disparu.

Deux mesures, toutes deux unitaires et toujours actives (pas de `--int` ici,
donc aucune cible ne peut être comptée mordue sans avoir été lancée — D253) :
  · `recevabilite` — les trois refus préalables et leur ORDRE, plus la garde
                     de SOURCE qui vérifie que la décision n'est pas revenue
                     dans le service ;
  · `notification` — la charge utile : date civile lue en UTC, deux montants,
                     deux téléphones, locales, walk-in.

⛔ TROISIÈME MESURE : `types`. La première version de ce harnais n'en avait pas,
au motif que `prisma generate` échoue en bac à sable (403 sur `binaries.prisma.sh`)
et que le talon rend les types Prisma lâches. C'ÉTAIT UNE ERREUR DE RAISONNEMENT :
« le typecheck ne dit rien des FORMES PRISMA » ne veut pas dire « le typecheck ne
dit rien ». Un défaut réel — `Parameters<>` appliqué à une fonction générique — est
parti en livraison et a cassé la porte chez Ko (D262).

La mesure `types` est donc RESTREINTE aux fichiers du lot qui n'importent RIEN de
Prisma. Zéro bruit, et elle attrape exactement la classe de défaut qui est passée.
`booking-notification-input.ts` en est absent : il importe `BookingRow`, donc son
typecheck dépend du client généré et n'est pas mesurable en bac à sable.

Usage :
    python3 neutralisation/neutralize-s11a.py
    python3 neutralisation/neutralize-s11a.py 1 5
Depuis : la racine du monorepo.

Codes de sortie : 0 = toutes les cibles mordent · 1 = garde MUETTE · 2 = erreur
de script ou pré-vol déjà rouge · ⛔ 3 = CAMPAGNE INCOMPLÈTE (D248).
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

SAUVEGARDE = ".neutralisation-s11a"

RECEVABILITE = "apps/api/src/venues/booking-admission.ts"
CHARGE = "apps/api/src/venues/booking-notification-input.ts"
SERVICE = "apps/api/src/venues/bookings.service.ts"
TEMPS = "apps/api/src/venues/availability-time.ts"


def _binaire(nom: str) -> str:
    return shutil.which(nom) or nom


MESURES = {
    "recevabilite": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/booking-admission.spec.ts"],
        "unit",
    ),
    "notification": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/booking-notification-input.spec.ts"],
        "unit",
    ),
    # ⚠ Options RECOPIÉES de `packages/config/tsconfig/base.json` et de
    #   `apps/api/tsconfig.json`, pas écrites de mémoire. Un typecheck restreint
    #   qui serait plus PERMISSIF que la porte réelle laisserait passer ce
    #   qu'elle refuse — c'est-à-dire mentirait dans le sens le plus coûteux.
    "types": (
        [
            "pnpm", "--filter", "@zwadj/api", "exec", "tsc", "--noEmit",
            "--strict", "--noUncheckedIndexedAccess", "--target", "ES2023",
            "--module", "commonjs", "--moduleResolution", "node",
            "--esModuleInterop", "--skipLibCheck", "--types", "node,vitest/globals",
            "src/venues/booking-admission.ts",
            "src/venues/booking-admission.spec.ts",
            "src/venues/availability-time.ts",
        ],
        "unit",
    ),
}

CIBLES = [
    (
        "S11a-1. ⛔ LA BORNE BASSE CESSE D'ÊTRE STRICTE — on réserve pour AUJOURD'HUI",
        # La salle n'aurait pas le temps de répondre, et le créneau du soir est
        # peut-être déjà commencé. Cette borne n'a JAMAIS été mesurée avant
        # S11-a : elle vivait dans un service sans spec unitaire.
        RECEVABILITE,
        "  if (civilUtcMs(date) <= civilUtcMs(today) || civilUtcMs(date) > civilUtcMs(horizon)) {",
        "  if (civilUtcMs(date) < civilUtcMs(today) || civilUtcMs(date) > civilUtcMs(horizon)) {",
        1,
        ["recevabilite"],
    ),
    (
        "S11a-2. ⛔ L'HORIZON PERD SA BORNE HAUTE — une demande à trente ans passe",
        RECEVABILITE,
        "  if (civilUtcMs(date) <= civilUtcMs(today) || civilUtcMs(date) > civilUtcMs(horizon)) {",
        "  if (civilUtcMs(date) <= civilUtcMs(today)) {",
        1,
        ["recevabilite"],
    ),
    (
        "S11a-3. ⛔ LA CAPACITÉ S'INVERSE — une table PILE à la capacité est refusée",
        # Le sens que D55 vise : la borne se mesure sur le cas RÉEL qu'elle doit
        # accepter. Une salle de 200 doit accepter 200.
        RECEVABILITE,
        '  if (guests > capacityMax) return { outcome: "GUESTS_EXCEED_CAPACITY" };',
        '  if (guests >= capacityMax) return { outcome: "GUESTS_EXCEED_CAPACITY" };',
        1,
        ["recevabilite"],
    ),
    (
        "S11a-4. ⛔ LE CRÉNEAU INTROUVABLE CESSE D'ÊTRE REFUSÉ",
        RECEVABILITE,
        '  if (slot === null) return { outcome: "SLOT_UNAVAILABLE" };',
        "  if (slot === null) slot = { startMinutes: 0, endMinutes: 60 } as typeof slot;",
        1,
        ["recevabilite"],
    ),
    (
        "S11a-5. ⛔⛔ L'ORDRE DES REFUS S'INVERSE — la DATE répond à la place de la CAPACITÉ",
        # ⚠ LA CIBLE QUI JUSTIFIE LE LOT. Aucun test, nulle part, ne mesurait
        # cet ordre avant S11-a. Intervertir fait répondre « ce créneau n'est
        # pas disponible » (409) à une demande dont le seul tort est de compter
        # trop d'invités (400) : le client change de DATE au lieu de réduire sa
        # table, et recommence indéfiniment.
        RECEVABILITE,
        '  if (guests > capacityMax) return { outcome: "GUESTS_EXCEED_CAPACITY" };\n'
        "\n"
        "  const horizon = addMonthsCivil(today, BOOKING_HORIZON_MONTHS);\n"
        "  if (civilUtcMs(date) <= civilUtcMs(today) || civilUtcMs(date) > civilUtcMs(horizon)) {\n"
        '    return { outcome: "SLOT_UNAVAILABLE" };\n'
        "  }",
        "  const horizon = addMonthsCivil(today, BOOKING_HORIZON_MONTHS);\n"
        "  if (civilUtcMs(date) <= civilUtcMs(today) || civilUtcMs(date) > civilUtcMs(horizon)) {\n"
        '    return { outcome: "SLOT_UNAVAILABLE" };\n'
        "  }\n"
        "\n"
        '  if (guests > capacityMax) return { outcome: "GUESTS_EXCEED_CAPACITY" };',
        1,
        ["recevabilite"],
    ),
    (
        "S11a-6. ⛔ SINGLE_SLOT CESSE DE BLOQUER LA JOURNÉE — le reste du jour redevient libre",
        # Les deux `null` qui se croisent dans ce module : « créneau
        # introuvable » et « ignore les heures ». Les confondre coûte un jour de
        # calendrier sur une salle qui ne prend qu'une réservation par jour.
        RECEVABILITE,
        '  return { outcome: "ADMITTED", slot, window: computeBookingWindow(date, wholeDay ? null : slot) };',
        '  return { outcome: "ADMITTED", slot, window: computeBookingWindow(date, slot) };',
        1,
        ["recevabilite"],
    ),
    (
        "S11a-7. ⛔ LE CRÉNEAU NE TRAVERSE PLUS LE VERDICT — il est rétréci à ses bornes",
        # Sans le report intact, `create` devrait relire le créneau dans `venue`
        # et y réécrire la garde de nullité que le module vient de rendre.
        RECEVABILITE,
        '  return { outcome: "ADMITTED", slot, window: computeBookingWindow(date, wholeDay ? null : slot) };',
        '  return { outcome: "ADMITTED", slot: { startMinutes: slot.startMinutes, endMinutes: slot.endMinutes } as typeof slot, window: computeBookingWindow(date, wholeDay ? null : slot) };',
        1,
        ["recevabilite"],
    ),
    (
        "S11a-8. ⛔ LA DÉCISION D'HORIZON REVIENT DANS LE SERVICE — garde de SOURCE",
        # Ce que cette garde protège : le jour où quelqu'un réinstalle la règle
        # de date dans `create`, il y aura DEUX autorités sur la fenêtre de
        # réservation et une seule sera mesurée.
        SERVICE,
        "    const { slot, window } = this.admitOrThrow(date, nowMs, venue, input.guests);",
        "    const { slot, window } = this.admitOrThrow(date, nowMs, venue, input.guests);\n"
        "    void BOOKING_HORIZON_MONTHS;",
        1,
        ["recevabilite"],
    ),
    (
        "S11a-9. ⛔ LE SERVICE N'APPELLE PLUS LE MODULE DE RECEVABILITÉ — garde de SOURCE",
        # ⚠ Le renommage porte sur DEUX occurrences (import + appel) et le
        # remplacement ne doit PAS être un préfixe du nom cherché, sinon
        # `toContain` resterait vert sans rien mesurer (leçon `toContain` de la
        # campagne S10b).
        SERVICE,
        "decideBookingAdmission",
        "trancherRecevabilite",
        2,
        ["recevabilite"],
    ),
    (
        "S11a-10. ⛔ LA DATE D'ÉVÉNEMENT SE LIT EN LOCAL — elle recule d'un jour à l'ouest",
        # `Booking.eventDate` est une colonne `@db.Date`, rendue à MINUIT UTC.
        # Sur un serveur en UTC — l'intégration, par exemple — la faute est
        # INVISIBLE. La spec épingle le fuseau à Toronto pour cette raison.
        TEMPS,
        "  return { year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate() };",
        "  return { year: date.getFullYear(), month: date.getMonth() + 1, day: date.getDate() };",
        1,
        ["notification"],
    ),
    (
        "S11a-11. ⛔⛔ CHEMIN DE L'ARGENT — le TOTAL et l'ACOMPTE s'intervertissent",
        # Aucun typage ne s'y oppose : deux `number` de même nom de type. Le
        # client recevrait « acompte 450 000 DA » sur une facture de 450 000.
        CHARGE,
        "    totalCents: row.totalCents,\n    depositCents: row.depositCents,",
        "    totalCents: row.depositCents,\n    depositCents: row.totalCents,",
        1,
        ["notification"],
    ),
    (
        "S11a-12. ⛔ LES DEUX TÉLÉPHONES S'INTERVERTISSENT — le pro reçoit son propre numéro",
        CHARGE,
        "    contact: row.contactPhone,",
        "    contact: venue.owner.phone,",
        1,
        ["notification"],
    ),
    (
        "S11a-13. ⛔ LA LOCALE NE RETOMBE PLUS SUR « fr » — gabarit arabe pour un pro francophone",
        CHARGE,
        '      locale: venue.owner.user.locale === "AR" ? "ar" : "fr",',
        '      locale: "ar",',
        1,
        ["notification"],
    ),
    (
        "S11a-14. ⛔ LE WALK-IN CESSE D'ÊTRE UN « PAS DE DESTINATAIRE »",
        # Un walk-in n'a aucun compte derrière lui. Traiter son absence comme
        # une donnée présente fait partir un envoi vers personne.
        CHARGE,
        "      client === null",
        "      client === undefined",
        1,
        ["notification"],
    ),
    (
        "S11a-15. ⛔ LES LIBELLÉS FR ET AR DE LA SALLE S'INTERVERTISSENT",
        CHARGE,
        "    venueNameFr: venue.nameFr,\n    venueNameAr: venue.nameAr,",
        "    venueNameFr: venue.nameAr,\n    venueNameAr: venue.nameFr,",
        1,
        ["notification"],
    ),
    (
        "S11a-17. ⛔ LE VERDICT PERD SON PARAMÈTRE DE TYPE — le créneau retombe à sa CONTRAINTE",
        # ⚠ LA CIBLE QUI REJOUE LE DÉFAUT LIVRÉ (D262). Rien ne change à
        # l'exécution : `verdict.slot` porte toujours le bon objet, donc vitest
        # reste VERT. Seul `tsc` voit que `nameFr` a disparu du type. Sans la
        # mesure `types`, cette cible serait muette — et c'est précisément
        # comme cela que le défaut est parti en livraison.
        RECEVABILITE,
        "): BookingAdmission<S> {",
        "): BookingAdmission<SlotBounds> {",
        1,
        ["types"],
    ),
    (
        "S11a-18. ⛔ LE CRÉNEAU DISPARAÎT DU TYPE DU VERDICT — invisible à l'exécution",
        RECEVABILITE,
        '  | { readonly outcome: "ADMITTED"; readonly slot: S; readonly window: BookingWindow }',
        '  | { readonly outcome: "ADMITTED"; readonly window: BookingWindow }',
        1,
        ["types"],
    ),
    (
        "S11a-16. ⛔ LE NOM DU CLIENT N'EST PLUS DÉBARRASSÉ DE SES ESPACES DE BORD",
        CHARGE,
        "    clientName: `${row.contactFirstName} ${row.contactLastName}`.trim(),",
        "    clientName: `${row.contactFirstName} ${row.contactLastName}`,",
        1,
        ["notification"],
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


def sauver(chemin: str, contenu: str) -> str:
    marque = os.path.join(SAUVEGARDE, str(abs(hash(chemin))))
    os.makedirs(marque, exist_ok=True)
    io.open(os.path.join(marque, ".chemin"), "w", encoding="utf-8").write(chemin)
    io.open(os.path.join(marque, ".contenu"), "w", encoding="utf-8", newline="").write(contenu)
    return marque


def lancer(nom: str) -> tuple[int, str]:
    commande, _ = MESURES[nom]
    argv = [_binaire(commande[0]), *commande[1:]]
    r = subprocess.run(argv, capture_output=True, text=True, encoding="utf-8", errors="replace")
    return r.returncode, f"{r.stdout or ''}\n{r.stderr or ''}"


def _queue(nom: str, sortie: str, lignes: int = 40) -> None:
    commande, _ = MESURES[nom]
    print(f"   commande : {' '.join(commande)}")
    utiles = [l for l in sortie.splitlines() if l.strip()]
    for l in utiles[-lignes:]:
        print(f"   │ {l}")


def main(argv: list[str]) -> int:
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    actives = list(MESURES)
    for nom in actives:
        code, sortie = lancer(nom)
        if code != 0:
            print(f"✗ PRÉ-VOL : « {nom} » est DÉJÀ ROUGE avant mutation. Campagne abandonnée.")
            _queue(nom, sortie)
            return 2
    print(f"✓ Pré-vol : {len(actives)} mesure(s) verte(s) — {', '.join(actives)}\n")

    mordu, muettes, non_mesurees = 0, [], []
    vues = 0
    for rang, (libelle, chemin, avant, apres, attendu, mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        avant = avant.replace("\n", "\r\n")
        apres = apres.replace("\n", "\r\n")
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        retenues = [m for m in mesures if m in actives]
        if not retenues:
            non_mesurees.append(libelle)
            print(f"⚠ {libelle}\n   NON MESURÉE.")
            continue

        vues += 1
        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            codes = {m: lancer(m)[0] for m in retenues}
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            shutil.rmtree(marque, ignore_errors=True)

        verts = [m for m, code in codes.items() if code == 0]
        if verts:
            muettes.append(f"{libelle} (vert dans : {', '.join(verts)})")
            print(f"✗ {libelle}\n   VERT dans {verts} malgré la neutralisation.")
        else:
            mordu += 1
            print(f"✓ {libelle}  [{', '.join(codes)}]")

    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) mordue(s) sur {vues} cible(s) RÉELLEMENT MESURÉE(S).")
    for m in muettes:
        print(f"  muette : {m}")
    for m in non_mesurees:
        print(f"  NON MESURÉE : {m}")
    if muettes:
        return 1
    if non_mesurees:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
