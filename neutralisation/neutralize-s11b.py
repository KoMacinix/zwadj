#!/usr/bin/env python3
"""Campagne de neutralisation — lot S11-b, le chiffrage d'une demande.

⚠ CE QUE CETTE CAMPAGNE PROUVE, ET POURQUOI ELLE EXISTE.
Le chiffrage vivait DEUX FOIS, presque au mot près, dans `BookingsService.create`
et dans `QuotesService` — deux endroits sans AUCUNE spec unitaire, mesurables
seulement contre un PostgreSQL réel, à la porte lourde. S11-b l'a extrait dans
`booking-charge.ts`, module PUR. Les cibles 1 à 7 rejouent en millisecondes ce
qui demandait la porte lourde.

⛔ LA CIBLE 8 EST D'UNE AUTRE NATURE, ET C'EST LA SEULE QUI PROUVE L'EXIGENCE DU
LOT. Une garde sur du code PARTAGÉ se vérifie dans TOUS ses consommateurs (D226,
leçon `@zwadj/ui` : neutraliser doit faire rougir client ET pro). Ici : muter
`booking-charge` doit faire rougir la spec d'intégration des RÉSERVATIONS **et**
celle des DEVIS. Un rouge d'un seul côté signifierait que l'autre chemin ne
consomme PAS le module — c'est-à-dire que la copie a survécu, ce que ce lot
existe pour empêcher.

⚠ ELLE EST DERRIÈRE `--int`, ET C'EST DÉLIBÉRÉ : elle exige une base réelle.
Sans le drapeau elle ressort « NON MESURÉE » (code 3), jamais « verte » — un
empêchement d'environnement ne doit pas se lire comme un succès (D262, D268,
puis D275 qui a montré que neuf cibles données pour « non mesurées » mordaient
toutes).

⛔ LES CIBLES 12 ET 13 APPARTIENNENT AU RANG 10, PAS À S11-b, ET C'EST VOULU.
Elles vivent ici parce que la MESURE qu'elles exigent — `int-reservations` —
est déjà déclarée par cette campagne : un harnais nommé autrement ne serait
jamais rejoué par `lancer-campagnes.py`, qui ne découvre que `neutralize-<lot>`.
⚠ Elles ne recouvrent PAS les cibles 10 et 11 : celles-là mutent la FORMULE de
`booking-deadline.ts` et sont mesurées par la spec UNITAIRE ; celles-ci mutent
les SITES D'APPEL de `bookings.service.ts` et ne sont vues que par
l'INTÉGRATION. Aucune spec unitaire ne peut les voir — `booking-deadline.spec.ts`
reçoit `windowMs` en PARAMÈTRE, donc elle est aveugle PAR CONSTRUCTION à la
constante que le service lui passe.
⛔ LEURS ANCRES SONT SUR LES SITES D'APPEL, JAMAIS SUR LES DÉCLARATIONS. Le lot
du rang 10 préfixe les déclarations d'`export` : une ancre posée sur
`const PRO_RESPONSE_DAYS = 7;` cesserait de s'appliquer après le lot et rendrait
« non mesurée » au lieu de « mordue ». Les sites d'appel, eux, ne bougent pas.

Usage :
    python3 neutralisation/neutralize-s11b.py          # le module pur seul
    python3 neutralisation/neutralize-s11b.py --int    # + les deux consommateurs
    python3 neutralisation/neutralize-s11b.py 1 3      # une plage
Depuis : la racine du monorepo.

Codes de sortie : 0 = toutes les cibles de la plage ont été mesurées et
mordent · 1 = au moins une garde MUETTE · 2 = erreur de script ou pré-vol
déjà rouge · ⛔ 3 = CAMPAGNE INCOMPLÈTE (D248).
"""

import io
import os
import shutil
import subprocess
import sys

# ⛔ LA CONSOLE WINDOWS EST EN cp1252 : le premier « ✓ » imprimé fait LEVER ce
#   script (UnicodeEncodeError), APRÈS le pré-vol — donc après avoir payé la
#   mesure, et avec une trace qui ressemble à un défaut de harnais.
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ⛔ CE SCRIPT SE LANCE DEPUIS LA RACINE DU MONOREPO : tous ses chemins sont
#   relatifs au DOSSIER COURANT.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-s11b"

CHIFFRAGE = "apps/api/src/venues/booking-charge.ts"
ECHEANCE = "apps/api/src/venues/booking-deadline.ts"
SERVICE = "apps/api/src/venues/bookings.service.ts"
MIGRATION = "apps/api/prisma/migrations/20260909120000_booking_quote_total_coherent/migration.sql"


def _binaire(nom: str) -> str:
    return shutil.which(nom) or nom


MESURES = {
    "chiffrage": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/booking-charge.spec.ts"],
        "unit",
    ),
    "int-reservations": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run",
         "-c", "vitest.config.int.ts", "test/int/bookings.int-spec.ts"],
        "int",
    ),
    "int-devis": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run",
         "-c", "vitest.config.int.ts", "test/int/quotes.int-spec.ts"],
        "int",
    ),
    "echeances": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/booking-deadline.spec.ts"],
        "unit",
    ),
    # ⚠ Cette mesure reconstruit sa PROPRE base, migration par migration : elle
    #   est la seule à voir ce que fait une migration sur des données existantes.
    "int-migration": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run",
         "-c", "vitest.config.int.ts", "test/int/migration-non-empty.int-spec.ts"],
        "int",
    ),
}

CIBLES = [
    (
        "S11b-1. ⛔ LE REFUS DU DOUBLON DISPARAÎT — une prestation FIXED est facturée DEUX FOIS",
        # Ni Zod (`.max(20)` seul) ni la base (aucun UNIQUE (booking_id, service_id))
        # ne l'empêchent. D75 ne rattrape pas : le montant attendu envoyé par le
        # front est cohérent AVEC le doublon.
        CHIFFRAGE,
        "    if (vus.has(choice.serviceId)) return refus(ServiceErrorCode.SERVICE_DUPLICATE);",
        "    void 0;",
        1,
        ["chiffrage"],
    ),
    (
        "S11b-2. ⛔ L'ORDRE DES REFUS S'INVERSE — l'indisponible passe devant le doublon",
        # ⚠ C'est la cible qui mesure l'ORDRE, et elle ne peut mordre que sur le
        #   cas DOUBLEMENT fautif : sous cette mutation, les tests qui n'enfreignent
        #   QU'UNE règle restent verts — c'est exactement pour cela qu'un test à une
        #   seule faute ne mesure aucun ordre (leçon S11-a).
        CHIFFRAGE,
        """  const vus = new Set<string>();
  for (const choice of input.choices) {
    if (vus.has(choice.serviceId)) return refus(ServiceErrorCode.SERVICE_DUPLICATE);
    vus.add(choice.serviceId);
  }""",
        """  const vus = new Set<string>();
  for (const choice of input.choices) {
    if (!input.catalogue.some((row) => row.id === choice.serviceId && row.venueId === input.venueId)) {
      return refus(ServiceErrorCode.SERVICE_UNAVAILABLE);
    }
  }
  for (const choice of input.choices) {
    if (vus.has(choice.serviceId)) return refus(ServiceErrorCode.SERVICE_DUPLICATE);
    vus.add(choice.serviceId);
  }""",
        1,
        ["chiffrage"],
    ),
    (
        "S11b-3. ⛔ LA PROPRIÉTÉ CESSE D'ÊTRE VÉRIFIÉE — la prestation d'une AUTRE salle est facturée",
        # Avant S11-b, le refus tombait par ABSENCE (le `where venueId` des deux
        # services). Un bon résultat obtenu par le mauvais mécanisme n'est pas une
        # garde : cette mutation rend le code identique à ce qu'il était.
        CHIFFRAGE,
        "    if (!found || found.venueId !== input.venueId) {",
        "    if (!found) {",
        1,
        ["chiffrage"],
    ),
    (
        "S11b-4. ⛔ L'AGRÉGAT PERD LES PRESTATIONS — et la BASE ne dit rien (MD2)",
        # `bookings_amounts_valid` impose les signes et `deposit <= total`, PAS
        # l'addition. Tant que le CHECK n'existe pas, cette assertion est la SEULE
        # autorité sur l'identité — relevé dans la migration, pas dans schema.prisma.
        CHIFFRAGE,
        "  const totalCents = input.basePriceCents + servicesTotalCents;",
        "  const totalCents = input.basePriceCents;",
        1,
        ["chiffrage"],
    ),
    (
        "S11b-5. ⛔ L'ACOMPTE SE CALCULE SUR LE PRIX DE SALLE, PAS SUR LE TOTAL",
        # L'ordre des trois calculs est figé par la signature ; c'est ce qui empêche
        # l'écrêtage de `deposit.ts` de s'appliquer au mauvais montant.
        CHIFFRAGE,
        "      depositCents: resolveDepositCents(input.deposit, totalCents),",
        "      depositCents: resolveDepositCents(input.deposit, input.basePriceCents),",
        1,
        ["chiffrage"],
    ),
    (
        "S11b-6. ⛔ LE REFUS D75 REND LES MONTANTS ATTENDUS AU LIEU DES RÉELS",
        # Le client rejouerait à l'aveugle le montant qu'il vient d'envoyer, en
        # boucle, sans jamais apprendre le vrai prix. Le 409 sortirait quand même.
        CHIFFRAGE,
        "    return { ok: false, totalCents: charge.totalCents, depositCents: charge.depositCents };",
        "    return { ok: false, totalCents: expected.expectedTotalCents, depositCents: expected.expectedDepositCents };",
        1,
        ["chiffrage"],
    ),
    (
        "S11b-7. ⛔ LA CONFRONTATION D75 IGNORE L'ACOMPTE — seul le total est comparé",
        CHIFFRAGE,
        """  if (
    expected.expectedTotalCents !== charge.totalCents ||
    expected.expectedDepositCents !== charge.depositCents
  ) {""",
        """  if (
    expected.expectedTotalCents !== charge.totalCents
  ) {""",
        1,
        ["chiffrage"],
    ),
    (
        "S11b-8. ⛔⛔ LE MODULE PARTAGÉ MUTÉ DOIT ROUGIR CHEZ LES *DEUX* CONSOMMATEURS",
        # ⚠ LA CIBLE DU LOT. Si un seul des deux rougit, l'autre chemin ne consomme
        #   pas le module : la copie a survécu, et c'est très exactement la
        #   divergence que S11-b existe pour fermer — celle qui se GRAVE dans la
        #   réservation, `quote.convert` recopiant les montants snapshotés.
        #   Les deux mesures sont déclarées : la cible ne compte comme mordue que
        #   si AUCUNE des deux ne sort en 0.
        # ⛔ PREMIÈRE VERSION DE CETTE CIBLE : MUETTE, ET CONSERVÉE COMME LEÇON.
        #   Elle mutait `basePriceCents` — un champ qu'AUCUNE des deux specs
        #   n'asserte. Résultat : les deux chemins ont écrit en base des lignes
        #   dont `base_price_cents` ne correspond plus au total, et PostgreSQL
        #   comme les 36 fichiers d'intégration les ont ACCEPTÉES. C'est MD2
        #   observé EN VRAI, et c'est un argument de plus pour le CHECK.
        #   ⇒ Une cible se choisit sur « par quel chemin cette mesure voit-elle
        #   la mutation ? », jamais sur « quel champ ai-je sous la main ». Le
        #   TOTAL, lui, est asserté des deux côtés (`bookings.int-spec.ts:152`,
        #   `quotes.int-spec.ts:93`) ; et le `+ 100` le rend faux même SANS
        #   prestation — sans quoi la mutation serait INERTE sur le cas nominal.
        CHIFFRAGE,
        "  const totalCents = input.basePriceCents + servicesTotalCents;",
        "  const totalCents = input.basePriceCents + servicesTotalCents + 100;",
        1,
        ["int-reservations", "int-devis"],
    ),
    (
        "S11b-9. ⛔ LE CHECK D'AGRÉGAT DEVIENT TRIVIAL — une ligne incohérente entre en base",
        # ⚠ LA MUTATION PORTE SUR LES DEUX CONTRAINTES À LA FOIS (attendu = 2), et
        #   c'est voulu : `bookings` et `quotes` sont contraintes ensemble et
        #   symétriquement depuis `20260707000001`. Neutraliser une seule laisserait
        #   l'autre porter la garantie et rendrait la cible verte à moitié.
        # ⚠ Sous cette mutation, la migration s'APPLIQUE au lieu d'échouer : c'est
        #   très exactement l'état d'avant D282, où des lignes dont
        #   `total <> base + services` entraient en base, 36 fichiers d'intégration
        #   verts (observation de la cible 8, D279).
        MIGRATION,
        '    "total_cents" = "base_price_cents" + "services_total_cents"',
        '    "total_cents" >= 0',
        2,
        ["int-migration"],
    ),
    (
        "S11b-10. ⛔ L'ÉCRÊTAGE DE L'ÉCHÉANCE DISPARAÎT — elle peut tomber APRÈS la fête",
        # C'est D82 défait : une demande pour dans cinq jours expirerait après
        # l'événement, et `paymentDueAt` laisserait payer un acompte pour une fête
        # déjà passée.
        ECHEANCE,
        "  return new Date(Math.min(fromMs + windowMs, eventStartsAt.getTime()));",
        "  return new Date(fromMs + windowMs);",
        1,
        ["echeances"],
    ),
    (
        "S11b-11. ⛔ L'ÉCRÊTAGE S'INVERSE — `min` devient `max`",
        # ⚠ Cible distincte de la précédente, et pas un doublon : un `max` garde une
        #   BORNE — donc l'apparence d'un écrêtage — là où la cible 10 la supprime.
        #   Une garde qui ne verrait que l'absence de borne laisserait passer celle-ci.
        ECHEANCE,
        "  return new Date(Math.min(fromMs + windowMs, eventStartsAt.getTime()));",
        "  return new Date(Math.max(fromMs + windowMs, eventStartsAt.getTime()));",
        1,
        ["echeances"],
    ),
    (
        "S11b-12. ⛔ L'ÉCHÉANCE DE RÉPONSE PRO REÇOIT LA FENÊTRE DE PAIEMENT — 7 jours deviennent 48 h",
        # ⛔ RANG 10 — CHEMIN DE L'ARGENT. C'est la moitié « aller » de l'interversion.
        #   Sans assertion de DURÉE, `expiresAt` reste parfaitement non nulle et
        #   l'assertion « non nulle » de la CRÉATION passe : le pro croirait avoir sept jours pour
        #   répondre et en aurait deux.
        # ⚠ ANCRE SUR LE SITE D'APPEL, pas sur la déclaration — voir l'en-tête.
        SERVICE,
        "windowMs: PRO_RESPONSE_DAYS * DAY_MS",
        "windowMs: PAYMENT_WINDOW_HOURS * HOUR_MS",
        1,
        ["int-reservations"],
    ),
    (
        "S11b-13. ⛔ L'ÉCHÉANCE D'ACOMPTE REÇOIT LA FENÊTRE DE RÉPONSE PRO — 48 h deviennent 7 jours",
        # ⛔ RANG 10 — CHEMIN DE L'ARGENT, et c'est le côté qui coûte le plus cher :
        #   `paymentDueAt` est ce sur quoi E3 décidera si un règlement arrive à
        #   temps. Servie à 7 jours, elle laisse payer un acompte cinq jours après
        #   l'échéance réelle, et celle « non nulle » de l'ACCEPTATION ne verrait rien.
        # ⚠ DEUX CIBLES ET NON UNE : une interversion réelle mute les deux sites à
        #   la fois. Muter UN SEUL site prouve que CHAQUE assertion voit LE SIEN —
        #   une cible unique laisserait passer le cas où une seule des deux mord
        #   (assertion de comptage, D226, transposée aux sites d'appel).
        SERVICE,
        "windowMs: PAYMENT_WINDOW_HOURS * HOUR_MS",
        "windowMs: PRO_RESPONSE_DAYS * DAY_MS",
        1,
        ["int-reservations"],
    ),
]


def restaurer_si_interrompu() -> None:
    """Un `finally` ne s'exécute PAS quand le processus est tué (D223)."""
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
    for l in [x for x in sortie.splitlines() if x.strip()][-lignes:]:
        print(f"   │ {l}")


def main(argv: list[str]) -> int:
    avec_int = "--int" in argv
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    actives = [n for n, (_, genre) in MESURES.items() if genre == "unit" or avec_int]
    if not avec_int:
        print("⚠ Mesures d'INTÉGRATION non exécutées (relancer avec --int sur une base réelle).")

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
        # ⚠ Le dépôt est en CRLF : un motif écrit en \n ne matcherait RIEN, et le
        #   script annoncerait « fait » sans avoir rien remplacé.
        avant = avant.replace("\n", "\r\n")
        apres = apres.replace("\n", "\r\n")
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        retenues = [m for m in mesures if m in actives]
        if not retenues:
            non_mesurees.append(f"{libelle} (hors exécution : {', '.join(mesures)})")
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
