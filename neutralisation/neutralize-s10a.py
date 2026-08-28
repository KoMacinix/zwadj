#!/usr/bin/env python3
"""Campagne de neutralisation — lot S10a (DIP sur `VenuesService`).

⚠ CE LOT NE CHANGE AUCUN COMPORTEMENT. Ce qu'il faut prouver, c'est que les
gardes ont SUIVI le code : quatre assertions ont quitté le spec du service pour
celui de l'adaptateur, et une garde qui déménage sans mordre à l'arrivée n'a pas
déménagé — elle a disparu.

Trois mesures :
  · `service`    — les DÉCISIONS (404, reprise de slug, déduplication, D3) ;
  · `adaptateur` — les FORMES DE REQUÊTE (WHERE, P2002, remplacement d'ensemble) ;
  · `types`      — `tsc --noEmit` : c'est lui qui porte la garde du double
                   `satisfies`, invisible à l'exécution.

Usage :
    python3 neutralisation/neutralize-s10a.py
    python3 neutralisation/neutralize-s10a.py 1 3
Depuis : la racine du monorepo.

Codes de sortie : 0 = toutes les cibles mordent · 1 = garde MUETTE · 2 = erreur
de script ou pré-vol déjà rouge · ⛔ 3 = CAMPAGNE INCOMPLÈTE (D248).
"""

import io
import os
import shutil
import subprocess
import sys

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

SAUVEGARDE = ".neutralisation-s10a"

SERVICE = "apps/api/src/venues/venues.service.ts"
ADAPTATEUR = "apps/api/src/venues/venue-store.prisma.ts"
PORTS = "apps/api/src/venues/venue-store.types.ts"


def _binaire(nom: str) -> str:
    return shutil.which(nom) or nom


MESURES = {
    "service": (["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/venues.service.spec.ts"], "unit"),
    "adaptateur": (["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "src/venues/venue-store.prisma.spec.ts"], "unit"),
    "types": (["pnpm", "--filter", "@zwadj/api", "exec", "tsc", "--noEmit"], "unit"),
}

CIBLES = [
    (
        "S10a-1. ⛔ LE WHERE D'APPARTENANCE PERD SON FILTRE DE PROPRIÉTAIRE",
        # ⚠ La faute la plus chère du module : sans `owner`, un pro lit la salle
        # d'un autre. Cette assertion vivait dans le spec du SERVICE ; si elle
        # ne mord pas ICI, elle n'a pas déménagé, elle a disparu.
        ADAPTATEUR,
        "    return { id: venueId, deletedAt: null, owner: { userId } };",
        "    return { id: venueId, deletedAt: null };",
        1,
        ["adaptateur"],
    ),
    (
        "S10a-2. ⛔ LE WHERE PERD `deletedAt` — une salle archivée redevient lisible",
        ADAPTATEUR,
        "    return { id: venueId, deletedAt: null, owner: { userId } };",
        "    return { id: venueId, owner: { userId } };",
        1,
        ["adaptateur"],
    ),
    (
        "S10a-3. ⛔ P2002 CESSE D'ÊTRE TRADUIT — le service reverrait un code de driver",
        ADAPTATEUR,
        "      if (!estViolationUnicite(error)) throw error;\n      return { ok: false, raison: \"slugPris\" };",
        "      throw error;",
        1,
        ["adaptateur"],
    ),
    (
        "S10a-4. ⛔ N'IMPORTE QUELLE ERREUR DEVIENT « SLUG PRIS » — la panne se déguise",
        # Le sens inverse du précédent, et le plus insidieux : le service
        # boucle sur huit candidats contre une base en panne, puis rend un
        # message qui ne dit rien de ce qui s'est passé.
        ADAPTATEUR,
        "      if (!estViolationUnicite(error)) throw error;",
        "      void error;",
        1,
        ["adaptateur"],
    ),
    (
        "S10a-5. ⛔ LE REMPLACEMENT D'ENSEMBLE PERD SON `deleteMany` — les équipements s'ACCUMULENT",
        ADAPTATEUR,
        "{ amenities: { deleteMany: {}, create: maj.equipementIds.map((amenityId) => ({ amenityId })) } }",
        "{ amenities: { create: maj.equipementIds.map((amenityId) => ({ amenityId })) } }",
        1,
        ["adaptateur"],
    ),
    (
        "S10a-6. ⛔ LA LISTE VIDE INTERROGE LA BASE et rend FAUX — effacer une sélection devient impossible",
        ADAPTATEUR,
        "    if (styleIds.length === 0) return true;",
        "    if (styleIds.length === 0) return false;",
        1,
        ["adaptateur"],
    ),
    (
        "S10a-7. ⛔ LA COMPARAISON DE COMPTE S'INVERSE — un id inconnu passe",
        ADAPTATEUR,
        "    return trouves === amenityIds.length;",
        "    return trouves >= 0;",
        1,
        ["adaptateur"],
    ),
    (
        "S10a-8. ⛔ LA BOUCLE DE SLUG S'ARRÊTE AU PREMIER REFUS — plus aucune reprise",
        # Décision du SERVICE : c'est son spec qui doit tomber, pas celui de
        # l'adaptateur.
        SERVICE,
        "      if (resultat.ok) return toVenueProDTO(resultat.salle, this.urlOf);",
        "      if (!resultat.ok) break;\n      return toVenueProDTO(resultat.salle, this.urlOf);",
        1,
        ["service"],
    ),
    (
        "S10a-9. ⛔ LA DÉDUPLICATION SAUTE — les doublons partent en base",
        SERVICE,
        "    const uniqueAmenityIds = amenityIds === undefined ? undefined : [...new Set(amenityIds)];",
        "    const uniqueAmenityIds = amenityIds;",
        1,
        ["service"],
    ),
    (
        "S10a-10. ⛔ LE `null` DU PORT CESSE D'ÊTRE TRADUIT EN 404",
        SERVICE,
        "    if (!row) this.throwNotFound();",
        "    if (!row) return row as never;",
        1,
        ["service"],
    ),
    (
        "S10a-11. ⛔ LA RUPTURE D'INVARIANT D3 EST AVALÉE",
        SERVICE,
        "    if (id === null) throw new Error(`Invariant D3 rompu : utilisateur PRO ${userId} sans ProProfile`);",
        '    if (id === null) return "";',
        1,
        ["service"],
    ),
    (
        "S10a-12. ⛔ LE DOUBLE REDEVIENT UN MENSONGE — `satisfies` retiré du port",
        # ⚠ LA CIBLE QUI JUSTIFIE LE LOT. Sans `satisfies`, un double incomplet
        # ou désynchronisé repasse : c'est exactement l'état d'avant S10a. Seul
        # le typecheck peut la faire tomber — `vitest` ne verrait rien.
        "apps/api/src/venues/venues.service.spec.ts",
        "  } satisfies VenueStore;",
        "  } as unknown as VenueStore;",
        1,
        ["types"],
    ),
    (
        "S10a-13. ⛔ UNE MÉTHODE DISPARAÎT DU PORT — le double ne le dirait plus",
        # Le sens inverse : on retire `trouverIdVivante` de l'interface. Le
        # service l'appelle encore ; le typecheck DOIT tomber.
        PORTS,
        "  trouverIdVivante(userId: string, venueId: string): Promise<string | null>;",
        "  // trouverIdVivante retiré",
        1,
        ["types"],
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
