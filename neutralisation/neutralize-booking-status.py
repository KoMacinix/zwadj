#!/usr/bin/env python3
"""Campagne de neutralisation — statut de la demande converttie (D268).

⛔ CE QUE CE HARNAIS PROUVE, ET POURQUOI IL EXISTE.
`quote-store.prisma.ts` écrivait `status: "PENDING"` en CHAÎNE LITTÉRALE sur le
chemin de l'argent : la conversion d'un devis en demande de réservation. D263
l'avait relevé, puis l'import qui le signalait a été supprimé pour fermer la
porte lint — le défaut ne tenait plus qu'à une case de backlog.

⚠ CE LOT NE CHANGE AUCUN COMPORTEMENT. `BookingStatus.PENDING` VAUT la chaîne
« PENDING » : à l'exécution, rien ne bouge. Ce qui change est la PROVENANCE de
la valeur. Un lot qui ne change rien à l'exécution ne peut donc pas se prouver
par un test qui passe — d'où ces trois cibles.

⛔ LA GARDE EST BILATÉRALE, ET C'EST SON SECOND VERSANT QUI COMPTE.
D263 demandait que les TROIS sites dérivent de l'énuméré. Appliqué tel quel,
cela ne supprimait pas le défaut qu'il décrit — il le déplaçait : trois sites
dérivés d'une même source s'accordent encore, et se trompent encore ensemble
(D241). L'arbitrage retenu est donc : chaque site confronte SON autorité.
  · adaptateur + spec unitaire → l'énuméré TypeScript ;
  · `quotes.int-spec.ts`       → PostgreSQL, via un littéral EXIGÉ.
La cible 3 protège ce second versant, qu'un « nettoyage » bien intentionné
effacerait sans que rien ne rougisse.

⚠ UNE MESURE UNITAIRE SUFFIT AUX TROIS, Y COMPRIS À LA CIBLE 3 — qui mute
pourtant un fichier d'INTÉGRATION. La garde de source lit `quotes.int-spec.ts`
DEPUIS LE DISQUE : une propriété d'un test qui exige PostgreSQL devient
mesurable en millisecondes, sans base. C'est le motif de D187/D192 appliqué à
une garde de provenance.

⚠ LES CIBLES 1 ET 2 FONT ROUGIR LES DEUX GARDES À LA FOIS (la garde de source
et l'assertion de comportement), et c'est attendu : elles partagent la même
ancre. Ce qu'on prouve est qu'aucune des deux mutations ne peut être livrée,
pas laquelle des deux gardes l'attrape.

Usage :
    python3 neutralisation/neutralize-booking-status.py
    python3 neutralisation/neutralize-booking-status.py 1 2
Depuis : la racine du monorepo.

Codes de sortie : 0 = toutes les cibles mordent · 1 = garde MUETTE · 2 = erreur
de script ou pré-vol déjà rouge · ⛔ 3 = CAMPAGNE INCOMPLÈTE (D248).
"""

import io
import os
import shutil
import subprocess
import sys

# ⛔ LA CONSOLE WINDOWS EST EN cp1252, ET ELLE FAIT LEVER CE SCRIPT.
#   Mesuré : `UnicodeEncodeError: '✓' maps to <undefined>` sur le premier
#   « ✓ » — c'est-à-dire APRÈS le pré-vol, donc après avoir payé la mesure, et
#   avec une trace Python qui ressemble à un défaut de harnais alors que la
#   campagne allait bien. ⚠ Report ouvert au backlog : les 21 autres scripts de
#   `neutralisation/` portent le même défaut et n'ont jamais tourné ici.
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

SAUVEGARDE = ".neutralisation-booking-status"

ADAPTATEUR = "apps/api/src/venues/quote-store.prisma.ts"
INTEGRATION = "apps/api/test/int/quotes.int-spec.ts"


def _binaire(nom: str) -> str:
    return shutil.which(nom) or nom


MESURES = {
    "conversion": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/quote-store.prisma.spec.ts"],
        "unit",
    ),
}

CIBLES = [
    (
        "BS-1. ⛔ LE LITTÉRAL REVIENT DANS L'ADAPTATEUR — la garde de SOURCE doit mordre",
        # La régression exacte que le lot ferme. Elle est INVISIBLE à
        # l'exécution : `"PENDING"` et `BookingStatus.PENDING` sont la même
        # chaîne. Sans garde de source, aucun test ne peut la voir.
        ADAPTATEUR,
        "          status: BookingStatus.PENDING,",
        '          status: "PENDING",',
        1,
        ["conversion"],
    ),
    (
        "BS-2. ⛔⛔ CHEMIN DE L'ARGENT — la demande naît ACCEPTED : elle verrouille le créneau",
        # ⚠ LA CIBLE QUI JUSTIFIE LE LOT. `bookings_no_overlap_accepted_confirmed`
        # filtre sur ('ACCEPTED','CONFIRMED') : une demande créée ACCEPTED
        # VERROUILLE la date sans que le pro l'ait accordée, et fait échouer par
        # EXCLUDE toute demande concurrente légitime. Le défaut se lit dans le
        # MEMBRE choisi, jamais dans la valeur.
        ADAPTATEUR,
        "          status: BookingStatus.PENDING,",
        "          status: BookingStatus.ACCEPTED,",
        1,
        ["conversion"],
    ),
    (
        "BS-3. ⛔ LE TÉMOIN INDÉPENDANT EST « NETTOYÉ » — la garde BILATÉRALE doit mordre",
        # Le versant inhabituel. Quelqu'un lit D263, voit un littéral dans un
        # test, le fait dériver de l'énuméré : geste raisonnable en apparence,
        # et il supprime le SEUL point du dépôt où la valeur relue depuis
        # PostgreSQL est confrontée à une chaîne extérieure à notre code.
        # ⚠ Mesuré par une spec UNITAIRE alors que le fichier muté exige un
        # PostgreSQL : la garde le lit depuis le disque.
        INTEGRATION,
        '    expect(booking.status).toBe("PENDING");',
        "    expect(booking.status).toBe(BookingStatus.PENDING);",
        1,
        ["conversion"],
    ),
]


def restaurer_si_interrompu() -> None:
    """⛔ UN `finally` NE S'EXÉCUTE PAS QUAND LE PROCESSUS EST TUÉ (D224).
    Deux fois, un harnais interrompu a laissé un fichier sciemment cassé dans
    l'arbre — indiscernable à l'œil. La sauvegarde est sur DISQUE, relue au
    démarrage."""
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
        # ⚠ LE DÉPÔT EST EN CRLF. Un motif écrit en `\n` ne remplace RIEN et le
        #   script annoncerait « fait » — trois fois dans une seule tranche.
        #   Seule l'assertion de comptage ci-dessous le dit.
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
            resultats = {m: lancer(m) for m in retenues}
            codes = {m: r[0] for m, r in resultats.items()}
            sorties = {m: r[1] for m, r in resultats.items()}
        finally:
            io.open(chemin, "w", encoding="utf-8", newline="").write(source)
            shutil.rmtree(marque, ignore_errors=True)

        verts = [m for m, code in codes.items() if code == 0]
        if verts:
            muettes.append(f"{libelle} (vert dans : {', '.join(verts)})")
            print(f"✗ {libelle}\n   VERT dans {verts} malgré la neutralisation.")
        else:
            mordu += 1
            print(f"✓ {libelle}")
            # ⚠ UNE CAMPAGNE QUI N'IMPRIME QU'UN « ✓ » DEMANDE QU'ON LA CROIE.
            #   Le rapport doit porter CE QUI a été muté, COMBIEN de fois, et QUEL
            #   test a rougi — sans quoi « 3/3 » n'est pas plus vérifiable que
            #   « mesuré » écrit à la main. Les noms de tests sont RELEVÉS dans la
            #   sortie de vitest, jamais recopiés ici.
            print(f"   fichier muté   : {chemin}  ({vus} occurrence(s), {attendu} attendue(s))")
            print(f"   avant → après  : {avant.strip()}  →  {apres.strip()}")
            for m in retenues:
                rouges = [
                    l.strip()
                    for l in sorties[m].splitlines()
                    if "×" in l and ">" in l
                ]
                if not rouges:
                    rouges = [l.strip() for l in sorties[m].splitlines() if "FAIL" in l]
                print(f"   mesure « {m} » : sortie {codes[m]}, {len(rouges)} test(s) rouge(s)")
                for r in rouges[:4]:
                    print(f"     ↳ {r}")

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
