#!/usr/bin/env python3
"""Campagne de neutralisation — lots S10b-1 et S10b-2 (DIP sur le devis).

⛔ S10b-2 A REJOINT CETTE CAMPAGNE. `convert()` écrit des montants dans
`bookings` : ses sept cibles portent sur le chemin de l'argent, et deux
d'entre elles (C4, C5) distinguent une double conversion d'une collision
d'unicité qui n'a rien à voir.

⚠ CE QUE CETTE CAMPAGNE PEUT PROUVER. Les quatre transactions ont déménagé
entières dans l'adaptateur. Ce qui doit mordre, c'est la SÉQUENCE qui protège :
verrou avant lecture du maximum, statut admis DANS le WHERE, statut relu DANS la
transaction. L'atomicité réelle, elle, ne se prouve que contre PostgreSQL —
`quotes.int-spec.ts`, 35 tests, est le filet et il DOIT être rejoué.

Usage :
    python3 neutralisation/neutralize-s10b.py
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
#   dossier : tous ses chemins sont relatifs au DOSSIER COURANT.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-s10b"

SERVICE = "apps/api/src/venues/quotes.service.ts"
ADAPTATEUR = "apps/api/src/venues/quote-store.prisma.ts"
PORTS = "apps/api/src/venues/quote-store.types.ts"


def _binaire(nom: str) -> str:
    return shutil.which(nom) or nom


MESURES = {
    "service": (["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/quotes.service.spec.ts"], "unit"),
    "adaptateur": (["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/quote-store.prisma.spec.ts"], "unit"),
    "types": (["pnpm", "--filter", "@zwadj/api", "exec", "tsc", "--noEmit"], "unit"),
}

CIBLES = [
    (
        "S10b1-1. ⛔ LE VERROU DE CHAÎNE DISPARAÎT — deux révisions perdent une version",
        # ⚠ La garde la plus discrète du fichier : sans elle, deux révisions
        # simultanées lisent le même MAX(version), et l'index unique refuse la
        # seconde en 500. Aucun test unitaire ne la verrait par le comportement ;
        # seule la SÉQUENCE la révèle.
        ADAPTATEUR,
        "      await this.verrouillerChaine(tx, args.chainId);\n",
        "",
        1,
        ["adaptateur"],
    ),
    (
        "S10b1-2. ⛔ LE VERROU PASSE APRÈS LA LECTURE DU MAXIMUM — présent mais inutile",
        # Le pire des deux : la ligne est là, la revue la voit, elle ne protège
        # plus rien.
        ADAPTATEUR,
        "      await this.verrouillerChaine(tx, args.chainId);\n      const max = await tx.quote.aggregate(",
        "      const max = await tx.quote.aggregate(",
        1,
        ["adaptateur"],
    ),
    (
        "S10b1-3. ⛔ LE STATUT ADMIS SORT DU `WHERE` — le check-and-set n'en est plus un",
        ADAPTATEUR,
        "        where: { id: quoteId, status: { in: [...statutsAdmis] } },",
        "        where: { id: quoteId },",
        1,
        ["adaptateur"],
    ),
    (
        "S10b1-4. ⛔ LE STATUT DU REFUS N'EST PLUS RELU — le 409 ne dit plus POURQUOI",
        ADAPTATEUR,
        'return { ok: false, raison: "statutConflit", statutActuel: fresh.status } as const;',
        'return { ok: false, raison: "statutConflit", statutActuel: "" } as const;',
        1,
        # ⚠ `adaptateur` SEUL. J'avais aussi déclaré `service` : impossible, le
        # spec du service bouchonne le port et ne voit RIEN de ce qui se passe
        # dans l'adaptateur. Une cible dont une mesure ne peut pas rougir est
        # muette par construction, quelle que soit la qualité du code.
        ["adaptateur"],
    ),
    (
        "S10b1-5. ⛔ LES DEUX ÉCRITURES DE LA TÊTE DE CHAÎNE SORTENT DE LA TRANSACTION",
        # Le `chainId` provisoire deviendrait visible entre les deux requêtes.
        ADAPTATEUR,
        "      await tx.quote.update({ where: { id: created.id }, data: { chainId: created.id } });",
        "      await this.prisma.quote.update({ where: { id: created.id }, data: { chainId: created.id } });",
        1,
        ["adaptateur"],
    ),
    (
        "S10b1-6. ⛔ `marquerRemis` SE MET À ÉCRIRE UN STATUT — la remise redevient une transition",
        ADAPTATEUR,
        "{ sentVia: args.sentVia, sentAt: args.sentAt }",
        '{ sentVia: args.sentVia, sentAt: args.sentAt, status: "SENT" }',
        1,
        ["adaptateur"],
    ),
    (
        "S10b1-7. ⛔ L'ENTONNOIR PERD SON DÉNOMINATEUR — il recompte les gestes techniques",
        ADAPTATEUR,
        "      where: { venueId, sentVia: { not: null } },",
        "      where: { venueId },",
        1,
        ["adaptateur"],
    ),
    (
        "S10b1-8. ⛔ LE WHERE DE PROPRIÉTÉ DU DEVIS PERD LA SALLE VIVANTE",
        ADAPTATEUR,
        "      where: { id: quoteId, venue: { deletedAt: null, owner: { userId } } },",
        "      where: { id: quoteId, venue: { owner: { userId } } },",
        1,
        ["adaptateur"],
    ),
    (
        "S10b1-9. ⛔ LE 409 DE CONFLIT PERD SON CODE MÉTIER — le client reçoit un 500",
        SERVICE,
        # ⚠ On vise la FONCTION DE TRADUCTION, pas les sites d'appel : ils
        # sont identiques à la ligne près dans `deliver` et `cancel`, donc
        # ambigus. Neutraliser le 409 ici couvre les deux d'un coup.
        "  private throwStatusConflict(statutActuel: string): never {\n    throw new ConflictException({",
        "  private throwStatusConflict(statutActuel: string): never {\n    void statutActuel;\n    throw new Error({",
        1,
        ["service"],
    ),
    (
        "S10b1-10. ⛔ LE STATUT ADMIS N'EST PLUS CELUI DE LA MACHINE À ÉTATS",
        # Le service transmet des statuts inventés : la machine à états cesse
        # d'être l'autorité, et une seconde copie naît par la bande.
        SERVICE,
        "      statutsAdmis: quoteAllowedFrom(QuoteCommand.CANCEL),",
        '      statutsAdmis: ["DRAFT", "CONVERTED"],',
        1,
        ["service"],
    ),
    (
        "S10b1-11. ⛔ LA GARDE DE PROPRIÉTÉ DE LA SALLE SAUTE",
        SERVICE,
        "    if (!(await this.devis.salleAppartientAu(userId, venueId))) this.throwNotFound();",
        "    void userId;",
        1,
        ["service"],
    ),
    (
        "S10b1-12. ⛔ LE DOUBLE REDEVIENT UN MENSONGE — `satisfies` retiré",
        # Seul le typecheck peut la faire tomber ; `vitest` ne verrait rien.
        "apps/api/src/venues/quotes.service.spec.ts",
        "  } satisfies QuoteStore;",
        "  } as unknown as QuoteStore;",
        1,
        ["types"],
    ),
    (
        "S10b1-13. ⛔ LE RÉSULTAT CESSE D'ÊTRE DISCRIMINÉ — le refus redevient un booléen",
        PORTS,
        '  | { readonly ok: false; readonly raison: "statutConflit"; readonly statutActuel: QuoteStatus };',
        '  | { readonly ok: false; readonly raison: "statutConflit" };',
        1,
        ["types"],
    ),
    (
        "S10b2-C1. ⛔ UN MONTANT DISPARAÎT DE LA CHARGE — la demande ne dit plus le devis",
        # ⚠ LA CIBLE LA PLUS CHÈRE DU DÉPÔT. `deposit_cents` est ce que le client
        # va payer ; à zéro, il ne paie rien et personne ne le voit avant la
        # caisse.
        ADAPTATEUR,
        "          depositCents: donnees.depositCents,",
        "          depositCents: 0,",
        1,
        ["adaptateur"],
    ),
    (
        "S10b2-C2. ⛔ LES LIGNES SORTENT DE L'ÉCRITURE IMBRIQUÉE — un total sans détail",
        ADAPTATEUR,
        "          services: {\n            create: donnees.lignes.map((ligne) => ({",
        "          services: {\n            create: [].map((ligne: never) => ({",
        1,
        ["adaptateur"],
    ),
    (
        "S10b2-C3. ⛔ LA DEMANDE NAÎT ACCEPTÉE — elle verrouille un créneau que personne n'a accordé",
        # ⚠ ANCRE RÉÉCRITE LE 30/08/2026 (D268). Elle visait le littéral
        #   `status: "PENDING",` que D268 a remplacé par l'énuméré. Résultat
        #   mesuré : « ERREUR DE SCRIPT : 0 occurrence(s) » — comportement VOULU,
        #   la campagne refuse de mentir — mais elle s'arrête là, et les CINQ
        #   cibles suivantes (C4 → C8) n'ont pas été jouées. Une campagne
        #   partiellement jouée n'est pas une campagne verte.
        #   ⛔ La faute n'est pas dans ce fichier : c'est D268 qui devait relancer
        #   les campagnes après avoir changé la ligne, et ne l'a pas fait.
        # ⚠ RECOUVREMENT ASSUMÉ : cette cible est désormais identique à BS-2 de
        #   `neutralize-booking-status.py` — même ligne, même mutation, même
        #   mesure. Conservée ici pour que s10b reste AUTONOME : la retirer
        #   rendrait sa complétude dépendante d'une autre campagne.
        ADAPTATEUR,
        "          status: BookingStatus.PENDING,",
        "          status: BookingStatus.ACCEPTED,",
        1,
        ["adaptateur"],
    ),
    (
        "S10b2-C4. ⛔ LE REFUS SE CONCLUT SUR LE CODE DU DRIVER, SANS RELIRE",
        # C'est ce qui annoncerait « déjà converti » sur une collision
        # d'idempotence : un mensonge au pro, sur le chemin de l'argent.
        ADAPTATEUR,
        "      if (existante) return { ok: false, raison: \"dejaConverti\" };",
        "      void existante;\n      return { ok: false, raison: \"dejaConverti\" };",
        1,
        ["adaptateur"],
    ),
    (
        "S10b2-C5. ⛔ TOUTE ERREUR DEVIENT « DÉJÀ CONVERTI » — la panne se déguise",
        ADAPTATEUR,
        "      if (!estViolationUnicite(error)) throw error;\n      const existante = await this.prisma.booking.findFirst({",
        "      const existante = await this.prisma.booking.findFirst({",
        1,
        ["adaptateur"],
    ),
    (
        "S10b2-C6. ⛔ `source` EST DÉDUIT À L'ENVERS — une affaire au comptoir devient un client connu",
        SERVICE,
        '      source: current.clientId === null ? "WALK_IN" : "CLIENT",',
        '      source: current.clientId === null ? "CLIENT" : "WALK_IN",',
        1,
        ["service"],
    ),
    (
        "S10b2-C7. ⛔ LA CONVERSION SE MET À BOUGER LE DEVIS",
        # Le devis attend l'acompte. Une méthode nommée « convertir » invite à
        # changer aussi son statut ; cette cible existe pour que la tentation
        # rougisse.
        SERVICE,
        "    if (!resultat.ok) this.throwAlreadyConverted();",
        "    if (!resultat.ok) this.throwAlreadyConverted();\n    await this.devis.changerStatut({\n      quoteId: current.id,\n      statutsAdmis: quoteAllowedFrom(QuoteCommand.CANCEL),\n      nouveauStatut: quoteWrittenStatus(QuoteCommand.CANCEL)\n    });",
        1,
        ["service"],
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
    for l in [x for x in sortie.splitlines() if x.strip()][-lignes:]:
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
