#!/usr/bin/env python3
"""Campagne de neutralisation — lot S9 (ISP sur `VenueProClient`).

⚠ CE LOT NE CHANGE AUCUN COMPORTEMENT. Ses gardes ne sont donc pas toutes
portées par les tests : deux d'entre elles vivent dans le TYPECHECK, et une
campagne qui ne mesurerait que `vitest` les déclarerait mordues sans les avoir
exercées — la faute D248, appliquée à un lot de typage.

Trois mesures, trois natures :
  · `types`   — `tsc --noEmit` sur api-client : porte les gardes de TYPE ;
  · `familles`— vitest sur api-client : porte la garde d'IMPLÉMENTATION ;
  · `etroit`  — vitest sur pro : porte la garde STATIQUE (aucun écran ne
                redemande le client entier).

Usage :
    python3 neutralize-s9.py
    python3 neutralize-s9.py 1 3
Depuis : la racine du monorepo.

Codes de sortie : 0 = toutes les cibles de la plage mordent · 1 = au moins une
garde MUETTE · 2 = erreur de script ou pré-vol déjà rouge · ⛔ 3 = CAMPAGNE
INCOMPLÈTE (D248).
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

SAUVEGARDE = ".neutralisation-s9"

CLIENT = "packages/api-client/src/venue-client.ts"
CONTEXTE = "apps/pro/src/venues/venue-client-context.tsx"
SECTION = "apps/pro/src/venues/slots-section.tsx"
GARDE_FAMILLES = "packages/api-client/src/venue-families.test.ts"


def _binaire(nom: str) -> str:
    return shutil.which(nom) or nom


MESURES = {
    "types": (["pnpm", "--filter", "@zwadj/api-client", "exec", "tsc", "--noEmit"], "unit"),
    "familles": (["pnpm", "--filter", "@zwadj/api-client", "exec", "vitest", "run", "src/venue-families.test.ts"], "unit"),
    "etroit": (["pnpm", "--filter", "@zwadj/pro", "exec", "vitest", "run", "src/venues/venue-client-narrowing.test.ts"], "unit"),
    # ⚠ Le typecheck du PRO, séparé : c'est lui qui refuse qu'un écran tende la
    #   main hors de sa famille. Le mesurer avec `types` mélangerait deux
    #   paquets et rendrait le diagnostic muet.
    "types-pro": (["pnpm", "--filter", "@zwadj/pro", "exec", "tsc", "--noEmit"], "unit"),
}

CIBLES = [
    (
        "S9-1. ⛔ UN MEMBRE CHANGE DE FAMILLE — `addPhoto` passe côté salles",
        # ⚠ La faute la plus probable : quelqu'un range une méthode « là où elle
        # se lit bien ». Sans garde de type, les six familles dérivent une par
        # une jusqu'à refaire le fourre-tout, en six morceaux.
        CLIENT,
        "export interface VenueMediaClient {",
        "export interface VenueMediaClient2 {",
        1,
        ["types"],
    ),
    (
        "S9-2. ⛔ UNE 23ᵉ CLÉ APPARAÎT DANS L'IMPLÉMENTATION, sans interface",
        # La garde de type ne la verrait PAS : elle compare des interfaces entre
        # elles, pas l'objet construit.
        CLIENT,
        "  return {\n    listMine: () => request<VenueProDTO[]>(\"/pro/venues\"),",
        "  return {\n    ceQueJAiOublie: () => request<void>(\"/pro/venues/oups\"),\n    listMine: () => request<VenueProDTO[]>(\"/pro/venues\"),",
        1,
        ["familles"],
    ),
    (
        "S9-3. ⛔ LA LISTE DE FAMILLES MENT — une taille est retouchée",
        GARDE_FAMILLES,
        '  visites: ["listVisitBookings", "cancelVisitBooking"]',
        '  visites: ["listVisitBookings"]',
        1,
        ["familles", "types"],
    ),
    (
        "S9-4. ⛔ UN CROCHET ÉTROIT REND LE CLIENT ENTIER — le découpage devient décoratif",
        # ⚠ CŒUR DU LOT. Les six interfaces ne contraignent personne si le
        # crochet rend l'intersection : chaque écran redevient servi en 22.
        # ⛔ CETTE CIBLE A ÉTÉ MUETTE au premier passage, et la raison mérite
        # d'être retenue : ÉLARGIR un type de retour ne casse JAMAIS un
        # appelant — seul un type rétréci le fait. Le découpage pouvait donc
        # se défaire crochet par crochet sans qu'aucune porte ne bouge. Ce
        # sont les six `Identiques<ReturnType<…>>` de
        # `venue-client-narrowing.test.ts` qui la font tomber désormais.
        CONTEXTE,
        "export function useVenueSlotTemplates(): VenueSlotTemplateClient {",
        "export function useVenueSlotTemplates(): VenueProClient {",
        1,
        ["types-pro"],
    ),
    (
        "S9-5. ⛔ UN ÉCRAN TEND LA MAIN HORS DE SA FAMILLE",
        # La preuve que l'ISP est EXÉCUTOIRE et pas documentaire : une section de
        # gabarits qui touche une photo ne doit plus compiler.
        SECTION,
        "  const venues = useVenueSlotTemplates();",
        "  const venues = useVenueSlotTemplates();\n  void venues.deletePhoto;",
        1,
        ["types-pro"],
    ),
    (
        "S9-6. ⛔ UN ÉCRAN REVIENT AU CROCHET LARGE",
        # Compile parfaitement — c'est bien le problème. Seule la garde statique
        # peut l'attraper.
        # ⛔ MUETTE au premier passage : la garde cherchait `useVenues(`, or
        # un import ALIASÉ laisse le site d'appel intact. Elle cherche
        # désormais l'IDENTIFIANT, qui attrape l'import comme l'appel.
        SECTION,
        "import { useVenueSlotTemplates } from \"./venue-client-context\";",
        "import { useVenues as useVenueSlotTemplates } from \"./venue-client-context\";",
        1,
        ["etroit"],
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
    if not utiles:
        print("   (aucune sortie)")
        return
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
