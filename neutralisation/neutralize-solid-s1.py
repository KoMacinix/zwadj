#!/usr/bin/env python3
"""Campagne de neutralisation — lot S1, autorité unique des statuts verrouillants.

⚠ CE QUE CETTE CAMPAGNE PROUVE, ET CE QU'ELLE NE PROUVE PAS.
S1 ne change aucun comportement : il remplace TROIS copies littérales de la
paire ACCEPTED/CONFIRMED par une dérivation de `HARD_BOOKING_STATUSES`. Les
suites sont donc restées vertes de bout en bout — et une suite verte ne
démontre rien. La seule question qui vaut : les écrans et les requêtes lisent-
ils VRAIMENT la source partagée, ou continuent-ils d'être justes par accident ?
On mute donc la SOURCE et on exige que les consommateurs tombent.

Deux mutations et non une, parce qu'elles empruntent des chemins d'échec
DIFFÉRENTS :
  S1-1 retire CONFIRMED → l'écran « Réservations » perd une ligne qu'il doit
       montrer, et le `WHERE` de la liste publique cesse de la charger.
  S1-2 retire ACCEPTED  → la ligne ACCEPTED bascule du côté « Demandes », là où
       le test exige justement son ABSENCE. Une garde qui ne vérifierait que la
       présence resterait verte ici.

⚠ DEUX SITES NE SONT PAS MESURABLES HORS BASE RÉELLE : `locks()` dans
`bookings.service.ts` (projection des conflits) et le `WHERE` de chargement du
calendrier dans `availability.service.ts`. Aucune spec unitaire ne les touche —
ils vivent dans `bookings.int-spec.ts` et `availability.int-spec.ts`. Ces
mesures sont donc DÉCLARÉES ici, et exécutées par `--int` sur un poste doté du
PostgreSQL de développement. Les omettre par confort les aurait fait passer
pour couvertes.

Usage :
    python3 neutralize-solid-s1.py            # mesures unitaires seules
    python3 neutralize-solid-s1.py --int      # + mesures d'intégration (base réelle)
    python3 neutralize-solid-s1.py 1 1        # une plage de cibles
Depuis : la racine du monorepo.

Codes de sortie : 0 = toutes les cibles de la plage ont été mesurées et
mordent · 1 = au moins une garde MUETTE · 2 = erreur de script ou pré-vol
déjà rouge · ⛔ 3 = CAMPAGNE INCOMPLÈTE, des cibles n'ont lancé AUCUN test
(D248) — ce résultat ne s'inscrit PAS comme une réussite.
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

SAUVEGARDE = ".neutralisation-sauvegarde"

# ── Mesures ──────────────────────────────────────────────────────────────────
# ⚠ AUCUN `-t` : le filtre par nom de test est le piège documenté en D226 —
# `vitest -t <motif>` SORT EN 0 quand rien ne correspond, et une campagne bâtie
# dessus rapporte « muette » ce qui n'a simplement jamais tourné. Ici on cible
# un FICHIER : il tourne, ou la collecte échoue bruyamment.
MESURES = {
    "pro": (
        ["pnpm", "--filter", "@zwadj/pro", "exec", "vitest", "run", "src/venues/request-scope.test.tsx"],
        "unit",
    ),
    "api": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/venues-public.service.spec.ts"],
        "unit",
    ),
    # ── Intégration : base réelle requise (docker compose up -d).
    # Certains postes exigent ALLOW_PG_LT18_POLYFILL=1 — voir AGENTS.md.
    "int-bookings": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/bookings.int-spec.ts"],
        "int",
    ),
    "int-availability": (
        ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", "test/int/availability.int-spec.ts"],
        "int",
    ),
}

SOURCE = "packages/types/src/booking.ts"
LISTE = "[BookingStatus.ACCEPTED, BookingStatus.CONFIRMED] as const"

CIBLES = [
    (
        "S1-1. ⚠ L'AUTORITÉ PARTAGÉE PERD `CONFIRMED` — les trois sites doivent le sentir",
        SOURCE,
        LISTE,
        "[BookingStatus.ACCEPTED] as const",
        1,
        ["pro", "api", "int-bookings", "int-availability"],
    ),
    (
        "S1-2. L'autorité perd `ACCEPTED` — la ligne verrouillée bascule du mauvais côté",
        SOURCE,
        LISTE,
        "[BookingStatus.CONFIRMED] as const",
        1,
        ["pro", "api", "int-bookings", "int-availability"],
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
        print("  Sans elles, `locks()` et le WHERE du calendrier restent NON PROUVÉS.\n")

    # ── Pré-vol : une mesure doit être VERTE avant mutation. Sinon on ne
    # mesurerait pas la garde mais un rouge préexistant — ou un chemin de
    # fichier faux, qui rendrait toute la campagne ininterprétable.
    for nom in actives:
        if lancer(nom) != 0:
            print(f"✗ PRÉ-VOL : la mesure « {nom} » est DÉJÀ ROUGE avant toute mutation. Campagne abandonnée.")
            return 2
    print(f"✓ Pré-vol : {len(actives)} mesure(s) verte(s) avant mutation — {', '.join(actives)}\n")

    mordu, muettes, non_mesurees = 0, [], []
    vues = 0
    for rang, (libelle, chemin, avant, apres, attendu, mesures) in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        source = io.open(chemin, encoding="utf-8", newline="").read()
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        # ⛔ D248 — UNE CIBLE SANS MESURE N'A PAS EU LIEU : elle n'est ni
        # rouge ni verte. Comptée mordue, elle GONFLAIT LE TOTAL. Mesuré sur
        # S6 : sans `--int`, quatre cibles sur six ne lançaient AUCUN test et
        # le script annonçait quand même « 6 gardes rouges », code de sortie 0.
        # On ne mute même pas : muter sans mesurer, c'est toucher l'arbre pour
        # rien et risquer d'y laisser une trace pour zéro information.
        retenues = [m for m in mesures if m in actives]
        if not retenues:
            non_mesurees.append(f"{libelle} (hors exécution : {', '.join(mesures)})")
            print(f"⚠ {libelle}\n   NON MESURÉE — {', '.join(mesures)} hors de cette exécution.")
            continue

        vues += 1
        marque = sauver(chemin, source)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(avant, apres))
        try:
            # ⚠ La cible doit rougir chez CHAQUE consommateur retenu. Une garde
            # posée sur du code partagé qui ne ferait tomber qu'un seul front
            # signale que l'autre ne mesure rien (D226) — c'est exactement
            # l'asymétrie qui a laissé les trois copies diverger sans bruit.
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

    print(f"\n{mordu} garde(s) mordue(s) sur {vues} cible(s) RÉELLEMENT MESURÉE(S).")
    for m in muettes:
        print(f"  muette : {m}")
    for m in non_mesurees:
        print(f"  NON MESURÉE : {m}")
    # ⛔ CODE 3 = CAMPAGNE INCOMPLÈTE, ni succès ni échec. Un 0 se recopie en
    # « n/n » dans la continuité ; c'est précisément ainsi qu'une campagne
    # à deux mesures s'est retrouvée inscrite « 6/6 ».
    if muettes:
        return 1
    if non_mesurees:
        return 3
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
