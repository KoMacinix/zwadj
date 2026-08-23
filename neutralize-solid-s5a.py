#!/usr/bin/env python3
"""Campagne de neutralisation — lot S5a, port de persistance du paiement.

⚠ REMPLACE `neutralize-solid-s5a0.py`, QUI EST PÉRIMÉ. Ses cibles visaient des
`where` qui vivaient dans `payments.service.ts` ; S5a les a déplacés dans
l'adaptateur. Le harnais S5a-0 ne trouverait donc plus ses motifs et sortirait
en erreur de script — ce qui est le bon comportement, mais il faut le SUPPRIMER
plutôt que le laisser échouer. Aucune garde n'est perdue : chacune est reprise
ci-dessous, du côté où son code est parti.

⚠ CE QUE CETTE CAMPAGNE PROUVE. S5a ne change aucun comportement : il déplace
deux `where`, un `select` et un `create` derrière un port. Les suites sont
restées vertes, ce qui ne démontre rien. On mute donc des deux côtés de la
nouvelle frontière — service ET adaptateur — pour vérifier que le déplacement
n'a pas rendu une règle inobservable.

⚠ LA FRONTIÈRE EST LE VRAI SUJET. Une extraction de port réussie déplace le
risque autant que le code : la clause de PROPRIÉTÉ (D47) et le filtre
`status: "PENDING"` ne sont pas des détails de requête, ce sont la règle d'accès
et la règle d'idempotence. Les cibles 5 à 8 existent pour qu'elles restent
mesurées après le déménagement.

⚠ AUCUNE MESURE D'INTÉGRATION, et c'est un constat, pas un choix : la table
`Payment` n'est touchée par AUCUN test d'intégration, et `openIntent` n'a
toujours aucun appelant. Il n'y aura rien à mesurer en base tant qu'E3c
n'existera pas.

Usage :
    python3 neutralize-solid-s5a.py            # toutes les cibles
    python3 neutralize-solid-s5a.py 1 4        # une plage
Depuis : la racine du monorepo.
"""

import io
import os
import shutil
import subprocess
import sys

SAUVEGARDE = ".neutralisation-sauvegarde"
SERVICE = "apps/api/src/payments/payments.service.ts"
ADAPTATEUR = "apps/api/src/payments/payment-store.prisma.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


def _spec(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", fichier]


MESURES = {
    "service": _spec("src/payments/payments.service.spec.ts"),
    "adaptateur": _spec("src/payments/payment-store.prisma.spec.ts"),
}

CIBLES = [
    # ── Côté SERVICE ────────────────────────────────────────────────────────
    (
        "S5a-1. ⚠ LE REFUS NE LÈVE PLUS — une intention naît sur une réservation non payable",
        SERVICE,
        "    if (!decision.ok) {",
        "    if (!decision.ok && false) {",
        1,
        ["service"],
    ),
    (
        "S5a-2. ⚠ LE MONTANT TRANSMIS EST DIVISÉ — l'acompte cesse d'arriver intact au port",
        SERVICE,
        "      amountCents: decision.amountCents,",
        "      amountCents: Math.round(decision.amountCents / 2),",
        1,
        ["service"],
    ),
    (
        "S5a-3. ⚠ LA TABLE DE CLÉS REDEVIENT UNE INTERPOLATION (le défaut d'origine)",
        SERVICE,
        "      throw new ConflictException({ code: decision.code, message: REFUSAL_MESSAGE_KEYS[decision.code] });",
        "      throw new ConflictException({ code: decision.code, message: `payment.errors.${decision.code}` });",
        1,
        ["service"],
    ),
    (
        "S5a-4. L'identité du demandeur cesse d'être transmise au port",
        SERVICE,
        "    const booking = await this.store.findBookingForPayer(userId, bookingId);",
        '    const booking = await this.store.findBookingForPayer("u-0", bookingId);',
        1,
        ["service"],
    ),
    # ── Côté ADAPTATEUR — les règles qui ont déménagé ───────────────────────
    (
        "S5a-5. ⚠ LE PRO PROPRIÉTAIRE PERD L'ACCÈS — 404 sur sa propre réservation",
        ADAPTATEUR,
        "      where: { id: bookingId, OR: [{ clientId: userId }, { venue: { owner: { userId } } }] },",
        "      where: { id: bookingId, clientId: userId },",
        1,
        ["adaptateur"],
    ),
    (
        "S5a-6. La propriété quitte le `WHERE` : n'importe qui lit n'importe quelle réservation",
        ADAPTATEUR,
        "      where: { id: bookingId, OR: [{ clientId: userId }, { venue: { owner: { userId } } }] },",
        "      where: { id: bookingId },",
        1,
        ["adaptateur"],
    ),
    (
        "S5a-7. ⚠ L'IDEMPOTENCE SAUTE — recharger la page crée une seconde intention",
        ADAPTATEUR,
        "    if (existant) return existant;",
        "    if (false) return existant;",
        1,
        ["adaptateur"],
    ),
    (
        "S5a-8. Le réutilisable est cherché SANS filtre de statut : un FAILED se rejoue",
        ADAPTATEUR,
        '      where: { bookingId: input.bookingId, status: "PENDING" },',
        "      where: { bookingId: input.bookingId },",
        1,
        ["adaptateur"],
    ),
    (
        "S5a-9. ⚠ L'ADAPTATEUR ÉCRIT UN MONTANT QU'IL A CHOISI, pas celui qu'il a reçu",
        ADAPTATEUR,
        "        amountCents: input.amountCents,",
        "        amountCents: 0,",
        1,
        ["adaptateur"],
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
