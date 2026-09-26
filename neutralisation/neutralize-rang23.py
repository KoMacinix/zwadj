#!/usr/bin/env python3
"""Campagne de neutralisation — rang 23, sous-lot 23a (audit SOLID 09/09 · F1, F5).

⛔ CHEMIN DE L'ARGENT, branche (2) de la règle (décision 3 du relecteur, D304) :
`accept` ouvre l'obligation de payer, l'annulation client l'éteint. Méthode
renforcée (D126) ; cadrage : `ZWADJ_CONTINUITE.md`, « ⛔ CADRAGE DU RANG 23 »,
§ 2 (modes de défaillance) et § 5 (cibles, renommées pour la forme (ii) par
D305, AVANT le code).

⚠ CE QUE CETTE CAMPAGNE PROUVE. Le correctif rend deux écritures CONDITIONNELLES
au statut source : celle d'`accept` (F1, forme (ii) — décision du relecteur) et
celle de l'annulation client, dont le prédicat porte désormais la règle du motif
(F5). On neutralise chaque pièce UNE À UNE et on exige que la mesure rougisse.

⛔ FORME (β) — DÉCISION 3 DU RELECTEUR (§ 9 du cadrage de R1, D305). Ce harnais
naît AVANT R1 : son VERDICT est au code de sortie, comme les vingt harnais du
chemin de l'argent, et R1 le corrigera avec eux. ⚠ UN CODE NON NUL NE PROUVE
RIEN (règle b de D303) : c'est pourquoi il ÉCRIT LA SORTIE DE CHAQUE MESURE dans
`.neutralisation-journaux/rang23/`, pour que l'échec soit LU — tests collectés
> 0, titre attendu sur une ligne d'échec, et première ligne du bloc d'échec en
`AssertionError`. La lecture de 23a est versée dans `docs/preuves/D305/` ; la
session qui tentera de casser 23a relira ces fichiers.

⚠ CHAQUE CIBLE DÉCLARE SES TITRES ATTENDUS (7ᵉ champ), CHACUN EXIGÉ — décisions
3 et 5 du relecteur (§ 9 de R1) : pour que R1 les reprenne. Ce harnais ne les
juge PAS (ce serait construire le lecteur de R1 ici, ce que (β) écarte) : il les
IMPRIME à côté du verdict. `verifier-mutations.py` lit les cinq premiers champs
et accepte un tuple plus long (relevé : « 5 champs attendus au minimum »).
⚠ Les tests déclarés assertent par `expect` de vitest, jamais par
`.expect(<statut>)` de supertest, qui lève une `Error` et non une
`AssertionError` (relevé dans `supertest/lib/test.js`).

⚠ BASE RÉELLE OBLIGATOIRE pour les cibles `int` : comme `solid-s5b`, cette
campagne joue l'intégration à chaque passage. Un verrou de ligne et la
réévaluation d'un `WHERE` après attente ne se mesurent pas avec un double.

⛔ SOUS-LOT 23a-2 (D308) — SEPT CIBLES DE PLUS, POUR C1 À C5 ET C6 DE D306.
Six sont les mutations de la session ADVERSE (D306 : X4, X10, X2a, X14, X15,
X3), recopiées ici au caractère près — le résultat muté est vérifié ÉGAL À
L'OCTET à celui de la pièce de D306 (`docs/preuves/D308/outils/`). Une seule
est neuve : R23-C1-t (la table ouvre l'annulation client depuis DECLINED).
⚠ X2a vise la SECONDE relecture « STATUS_CONFLICT, status: fresh.status » du
fichier : D306 la désignait par une région (« après la relecture est
l'AUTORITÉ ») ; ce harnais, qui exige une ancre UNIQUE, l'étend à ce
commentaire. La ligne mutée est la même.

Usage :
    python3 neutralisation/neutralize-rang23.py          # toutes les cibles
    python3 neutralisation/neutralize-rang23.py 1 2      # une plage
Depuis : la racine du monorepo, base de développement lancée.

Codes de sortie : 0 = toutes les cibles de la plage mordent (au code) ·
1 = au moins une garde MUETTE · 2 = erreur de script ou pré-vol déjà rouge.
"""

import io
import os
import shutil
import subprocess
import sys

# ⛔ LA CONSOLE WINDOWS EST EN cp1252 : le premier « ✓ » imprimé fait LEVER ce
#   script (UnicodeEncodeError), APRÈS le pré-vol (D268).
if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

# ⛔ CE SCRIPT SE LANCE DEPUIS LA RACINE DU MONOREPO : tous ses chemins sont
#   relatifs au dossier courant.
if not os.path.isfile("pnpm-workspace.yaml"):
    print("✗ À LANCER DEPUIS LA RACINE DU MONOREPO (pnpm-workspace.yaml introuvable).")
    print(f"  dossier courant : {os.getcwd()}")
    print(f"  → python3 neutralisation/{os.path.basename(__file__)}")
    sys.exit(2)

SAUVEGARDE = ".neutralisation-rang23"
JOURNAUX = os.path.join(".neutralisation-journaux", "rang23")

ADAPTATEUR = "apps/api/src/venues/booking-locks.prisma.ts"
SERVICE = "apps/api/src/venues/bookings.service.ts"
TRANSITIONS = "apps/api/src/venues/booking-transitions.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


MESURES = {
    "int-reservations": [
        "pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run",
        "-c", "vitest.config.int.ts", "test/int/bookings.int-spec.ts",
    ],
    "unit-transitions": [
        "pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run",
        "src/venues/booking-transitions.spec.ts",
    ],
}

# Titres attendus, MOT POUR MOT — cadrage du rang 23, § 5, annotation D305.
# ⚠ Aucun titre ne porte le glyphe « × », qui marque un ÉCHEC dans la sortie de
#   vitest (D275 ; faute n° 1 de D305 : T1 et T2 l'ont porté, renommés avant la
#   preuve).
T1 = "F1 contre un refus — un REFUS commite pendant l'acceptation : 409 avec le statut réel, la ligne refusée intacte"
T2 = "F1 contre une annulation — une ANNULATION client commite pendant l'acceptation : 409 avec le statut réel, la ligne annulée intacte"
T3 = "F5 — une ACCEPTATION commite pendant l'annulation client SANS motif : 400 cancelReasonRequired, la ligne acceptée intacte"
U1 = "writableFrom — SANS motif, l'annulation client n'écrit que depuis les statuts qui ne l'exigent pas (D83)"
U2 = "writableFrom — une chaîne VIDE vaut une absence de motif, comme dans la décision"
# 23a-2 (D308) — cadrage du rang 23, § 5, annotation D308, mot pour mot.
C1U = ("C1 — depuis un statut TERMINAL (DECLINED, EXPIRED, CANCELLED : décision produit « Modèle de réservation »), "
       "toute commande est refusée et rien n'est inscriptible, motif ou non")
ACC = "writableFrom et decideBookingTransition s'accordent sur TOUS les couples commande, motif, statut (D306, sonde P9)"
C1H = "C1 — un client annule une demande déjà REFUSÉE : 409 avec le statut réel, la ligne refusée intacte"
C2 = "C2 — un REFUS commite pendant l'annulation client SANS motif : 409 avec le statut réel, pas 400 motif manquant"
D121R = "D121 — deux refus SIMULTANÉS : un seul aboutit, un seul e-mail au client"
D121P = "D121 — deux annulations PRO SIMULTANÉES d'une demande acceptée : une seule aboutit"
D121C = "D121 — deux annulations CLIENT SIMULTANÉES : une seule aboutit, jamais 500"
SEQ400 = "le client DOIT un motif pour annuler une demande ACCEPTÉE"

CIBLES = [
    (
        "R23-F1-a. ⛔ L'ÉCRITURE D'ACCEPT PERD SA CONDITION DE STATUT — un refus commité pendant l'acceptation est écrasé",
        ADAPTATEUR,
        "          where: { id: input.bookingId, status: { in: [...input.allowedFrom] } },",
        "          where: { id: input.bookingId },",
        1,
        ["int-reservations"],
        [T1, T2],
    ),
    (
        "R23-F1-b. ⛔ UN COMPTE NUL N'EST PLUS UN REFUS — la ligne relue part comme acceptée",
        ADAPTATEUR,
        "        if (ecrit.count !== 1) {",
        "        if (false) {",
        1,
        ["int-reservations"],
        [T1, T2],
    ),
    (
        "R23-F5-a. ⛔ L'ANNULATION CLIENT ÉCRIT DEPUIS TOUT SON `from` — une ACCEPTED s'annule sans motif",
        SERVICE,
        "      from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
        "      from: allowedFrom(BookingCommand.CANCEL_AS_CLIENT),",
        1,
        ["int-reservations"],
        [T3],
    ),
    (
        "R23-F5-b. Le refus après conflit ne se redécide plus sur le statut relu — 409 là où l'ordre séquentiel rend 400",
        SERVICE,
        '      if (decision.outcome === "REASON_REQUIRED") {',
        "      if (false) {",
        1,
        ["int-reservations"],
        [T3],
    ),
    (
        "R23-F5-c. La fonction pure des statuts inscriptibles IGNORE LE MOTIF — le prédicat d'écriture redevient le `from` entier",
        TRANSITIONS,
        '    (status) => decideBookingTransition(command, status, reason).outcome === "ALLOWED"',
        '    (status) => decideBookingTransition(command, status, reason).outcome !== "STATUS_CONFLICT"',
        1,
        ["unit-transitions"],
        [U1, U2],
    ),
    # ── 23a-2 (D308) : les mutations de la session adverse D306, et une neuve ─────────────────
    (
        "R23-C1. ⛔ LE PRÉDICAT DE L'ANNULATION CLIENT ADMET DECLINED AU SITE D'APPEL — une demande refusée s'annule (X4 de D306)",
        SERVICE,
        "from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
        'from: [...writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason), "DECLINED" as BookingStatus],',
        1,
        ["int-reservations"],
        [C1H, C2],
    ),
    (
        "R23-C1-t. ⛔ LA TABLE OUVRE L'ANNULATION CLIENT DEPUIS DECLINED — la matrice dérivée reste verte, la liste écrite à la main doit rougir (neuve, D308)",
        TRANSITIONS,
        "    from: [BookingStatus.PENDING, BookingStatus.ACCEPTED],",
        "    from: [BookingStatus.PENDING, BookingStatus.ACCEPTED, BookingStatus.DECLINED],",
        1,
        ["unit-transitions", "int-reservations"],
        [C1U, C1H, C2],
    ),
    (
        "R23-C2. ⛔ APRÈS UN COMPTE 0, LE CODE SE CHOISIT COMME SI LE STATUT ÉTAIT ACCEPTED — 400 « motif manquant » sur une demande refusée (X10 de D306)",
        SERVICE,
        "const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, resultat.status, input.reason);",
        'const decision = decideBookingTransition(BookingCommand.CANCEL_AS_CLIENT, "ACCEPTED", input.reason);',
        1,
        ["int-reservations"],
        [C2, D121C],
    ),
    (
        "R23-C3. ⛔ LA RELECTURE DE `transition` REND TOUJOURS ACCEPTED — le 409 d'un perdant ment sur le statut (X2a de D306)",
        ADAPTATEUR,
        "        // La relecture est l'AUTORITÉ : elle produit le refus avec le statut réel.\n"
        "        const fresh = await tx.booking.findUniqueOrThrow({\n"
        "          where: { id: input.bookingId },\n"
        "          select: { status: true }\n"
        "        });\n"
        '        return { outcome: "STATUS_CONFLICT", status: fresh.status };',
        "        // La relecture est l'AUTORITÉ : elle produit le refus avec le statut réel.\n"
        "        const fresh = await tx.booking.findUniqueOrThrow({\n"
        "          where: { id: input.bookingId },\n"
        "          select: { status: true }\n"
        "        });\n"
        '        return { outcome: "STATUS_CONFLICT", status: "ACCEPTED" };',
        1,
        ["int-reservations"],
        [C1H, C2, D121R, D121P, D121C],
    ),
    (
        "R23-C4. ⛔ LE 400 cancelReasonRequired PORTE UN STATUT FAUX (X14 de D306)",
        SERVICE,
        "          status: decision.status\n        });\n      }\n      throw new ConflictException({",
        '          status: "PENDING"\n        });\n      }\n      throw new ConflictException({',
        1,
        ["int-reservations"],
        [T3, SEQ400],
    ),
    (
        "R23-C5. ⛔ LE SITE D'APPEL IGNORE LE MOTIF — une demande ACCEPTÉE ne s'annule plus, même motivée (X15 de D306)",
        SERVICE,
        "from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, input.reason),",
        "from: writableFrom(BookingCommand.CANCEL_AS_CLIENT, undefined),",
        1,
        ["int-reservations"],
        [SEQ400],
    ),
    (
        "R23-C6. ⛔ writableFrom ÉLARGI D'UN STATUT HORS DE `from` — l'écriture et la décision divergent (X3 de D306)",
        TRANSITIONS,
        "export function writableFrom(command: BookingCommand, reason?: string): readonly BookingStatus[] {",
        "export function writableFrom(command: BookingCommand, reason?: string): readonly BookingStatus[] {\n"
        "  return [...writableFromD306(command, reason), BookingStatus.DECLINED];\n"
        "}\n"
        "function writableFromD306(command: BookingCommand, reason?: string): readonly BookingStatus[] {",
        1,
        ["unit-transitions"],
        [U1, U2, C1U, ACC],
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


def lancer(nom: str, journal: str) -> int:
    """Lance la mesure et ÉCRIT SA SORTIE ENTIÈRE dans `journal` : un rouge
    qu'on ne peut plus relire se relance sans être lu (D270)."""
    commande = MESURES[nom]
    r = subprocess.run(
        [_binaire(commande[0]), *commande[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    os.makedirs(JOURNAUX, exist_ok=True)
    with io.open(os.path.join(JOURNAUX, journal), "w", encoding="utf-8", newline="") as f:
        f.write(f"$ {' '.join(commande)}\n")
        f.write(r.stdout or "")
        f.write("\n--- stderr ---\n")
        f.write(r.stderr or "")
        f.write(f"\n--- code de sortie : {r.returncode} ---\n")
    return r.returncode


def main(argv: list[str]) -> int:
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    for nom in MESURES:
        if lancer(nom, f"pre-vol-{nom}.txt") != 0:
            print(f"✗ PRÉ-VOL : « {nom} » est DÉJÀ ROUGE avant mutation. Campagne abandonnée.")
            print(f"   sortie : {os.path.join(JOURNAUX, f'pre-vol-{nom}.txt')}")
            return 2
    print(f"✓ Pré-vol : {len(MESURES)} mesure(s) verte(s) — {', '.join(MESURES)}\n")

    mordu, vues, muettes = 0, 0, []
    for rang, (libelle, chemin, avant, apres, attendu, mesures, titres) in enumerate(CIBLES, start=1):
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

        vues += 1
        identifiant = libelle.split(".")[0]
        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            codes = {m: lancer(m, f"{identifiant}-{m}.txt") for m in mesures}
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
        # ⚠ AU CODE SEULEMENT (forme β) : ces titres sont à LIRE dans le journal,
        # ce script ne les juge pas.
        for t in titres:
            print(f"    titre attendu : {t}")
        for m in mesures:
            print(f"    journal à lire : {os.path.join(JOURNAUX, f'{identifiant}-{m}.txt')}")

    if os.path.isdir(SAUVEGARDE) and not os.listdir(SAUVEGARDE):
        os.rmdir(SAUVEGARDE)

    print(f"\n{mordu} garde(s) mordue(s) sur {vues} cible(s) RÉELLEMENT MESURÉE(S) — au CODE de sortie (forme β).")
    print("⚠ Un code non nul ne prouve rien seul (règle b de D303) : l'échec se LIT dans les journaux.")
    for m in muettes:
        print(f"  muette : {m}")
    return 0 if not muettes else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
