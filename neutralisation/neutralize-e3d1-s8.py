#!/usr/bin/env python3
"""Campagne de neutralisation — lots E3d-1 (course de paiement) et S8 (plafonds).

⚠ CHEMIN DE L'ARGENT pour E3d-1. Analyse des modes de défaillance écrite avant
le code : CADRAGE_PAIEMENT_ATOMICITE_D255. Ce que la campagne doit démontrer,
c'est qu'AUCUNE des trois pièces ne peut disparaître en silence : l'index, le
prédicat qui le nomme, et la relecture du perdant.

⛔ CE QUI SE NEUTRALISE ICI EST UNE MIGRATION SQL, et c'est possible parce que
`setup-global.ts` recrée la base et REJOUE les migrations committées à chaque
exécution. Muter le `.sql` mute donc réellement le schéma sous le test — ce ne
serait pas vrai contre une base persistante.

⛔ RÈGLE COMMUNE (D226) : aucun filtre `-t`. `vitest -t <motif>` sort en 0 quand
RIEN ne correspond. On lance le FICHIER entier, et une cible ne compte que si le
code de sortie est non nul ET que le titre attendu apparaît sur une ligne
d'échec.

⚠ LES CIBLES S8 NE NEUTRALISENT AUCUN `if`. Plafond relevé = compte observé :
aucune comparaison ne se déclenche en régime nominal, donc les désactiver ne
changerait rien et les cibles seraient vertes en annonçant qu'elles mordent.
Elles déplacent le PLAFOND, ou coupent la recherche d'exemption. Les plafonds
doivent être RELEVÉS avant la campagne — sinon le pré-vol sort en 2 sur
`A_RELEVER`.

Usage :
    python3 neutralize-e3d1-s8.py --int      # E3d-1 : base réelle OBLIGATOIRE
    python3 neutralize-e3d1-s8.py            # S8 seul (unitaire)
    python3 neutralize-e3d1-s8.py 1 3        # une plage
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

SAUVEGARDE = ".neutralisation-e3d1"

MIGRATION = "apps/api/prisma/migrations/20260824120000_payment_one_pending_per_booking/migration.sql"
ADAPTATEUR = "apps/api/src/payments/payment-store.prisma.ts"
SETUP_CLIENT = "apps/client/src/test-setup.ts"


def _binaire(nom: str) -> str:
    """Windows : `pnpm` est un `.cmd`, que `CreateProcess` ne résout pas seul."""
    return shutil.which(nom) or nom


# ⚠ Marqueur : `lancer` reconnaît ce jeton en tête et pose la variable au lieu
#   de l'exécuter. Un `env=` dans le tuple aurait demandé de changer la forme
#   de MESURES, partagée avec les autres harnais.
_avec_releve = "@RELEVE@pnpm"

def _int(fichier: str) -> list[str]:
    return ["pnpm", "--filter", "@zwadj/api", "exec", "vitest", "run", "-c", "vitest.config.int.ts", fichier]


MESURES = {
    "course": (_int("test/int/payment-intent-race.int-spec.ts"), "int"),
    # ⚠ UN FICHIER EXEMPTÉ, sinon le plafond ne s'applique pas et les cibles
    # S8 resteraient vertes quoi qu'on neutralise.
    "plafond": (["pnpm", "--filter", "@zwadj/client", "exec", "vitest", "run", "src/components/filter-wizard.test.tsx"], "unit"),
    # ⚠ LA MÊME MESURE, MAIS EN MODE RELEVÉ. Elle sert à une seule cible :
    # prouver qu'une variable oubliée dans le shell ne peut PAS passer pour une
    # porte franchie. Elle doit être ROUGE en régime nominal — c'est la seule
    # mesure du dépôt dont le pré-vol serait faux, donc elle est déclarée
    # « hors pré-vol » et jugée à l'envers.
    "releve": ([_avec_releve, "--filter", "@zwadj/client", "exec", "vitest", "run", "src/components/filter-wizard.test.tsx"], "inverse"),
}

CIBLES = [
    (
        "E1. ⛔ L'INDEX PARTIEL DISPARAÎT — la base réaccepte deux intentions en attente",
        MIGRATION,
        'CREATE UNIQUE INDEX "payments_one_pending_per_booking"',
        'CREATE INDEX "payments_one_pending_per_booking"',
        1,
        ["course"],
    ),
    (
        "E2. ⛔ LE NETTOYAGE PRÉALABLE SAUTE — la migration tomberait sur une base ayant couru",
        # ⚠ RÉÉCRITE : la version précédente pariait sur l'échec de
        # `setup-global`. Faux — il bâtit une base VIDE, où l'UPDATE ne
        # rencontre aucun doublon : la casser ne changeait rien et la cible
        # est restée VERTE. Le spec fabrique maintenant trois PENDING à la
        # MÊME microseconde ; avec `created_at` seul, trois survivent et
        # `CREATE UNIQUE INDEX` refuse — exactement ce qui casserait un
        # déploiement sur une base ayant déjà couru.
        MIGRATION,
        '(plus_ancien."created_at", plus_ancien."id") < (p."created_at", p."id")',
        'plus_ancien."created_at" < p."created_at"',
        1,
        ["course"],
    ),
    (
        "E3. Le prédicat ne reconnaît plus la violation — le perdant relance P2002 au visiteur",
        ADAPTATEUR,
        '  return (error as { code?: unknown }).code === "P2002";',
        "  return false;",
        1,
        ["course"],
    ),
    (
        "E4. ⛔ LE PERDANT NE RELIT PLUS — il propage P2002 au lieu de rendre l'intention gagnante",
        ADAPTATEUR,
        "      if (gagnante) return gagnante;",
        "      void gagnante;",
        1,
        ["course"],
    ),
    (
        "E5. Le `await` saute : la promesse rejetée sort du `try` et le `catch` ne sert plus à rien",
        # ⚠ La forme exacte qu'aurait prise une « simplification » : le code lit
        # pareil, le `catch` est toujours là, et il n'attrape plus rien.
        ADAPTATEUR,
        "      return await this.prisma.payment.create({",
        "      return this.prisma.payment.create({",
        1,
        ["course"],
    ),
    (
        "S8-1. ⛔ LE PLAFOND EST DÉPASSÉ ET RIEN NE TOMBE — le nombre redevient décoratif",
        # ⚠ ON DÉPLACE LE PLAFOND, PAS LE `if`. Désactiver la comparaison ne
        # prouve rien : plafond relevé = compte observé, donc AUCUNE des deux
        # branches ne se déclenche en régime nominal et la cible serait restée
        # verte en annonçant le contraire. Ici le fichier produit 3
        # avertissements sous un plafond de 1 : la suite DOIT tomber.
        SETUP_CLIENT,
        '  "src/components/filter-wizard.test.tsx": 3,',
        '  "src/components/filter-wizard.test.tsx": 1,',
        1,
        ["plafond"],
    ),
    (
        "S8-2. ⛔ L'EXEMPTION CESSE D'ÊTRE CIBLÉE — plus rien ne sépare un fichier bruyant d'un échec",
        # ⚠ CETTE CIBLE A REMPLACÉ CELLE DU SENS BAS DU CLIQUET. Descendre sous
        # le plafond ne fait plus tomber — la mesure flotte, voir l'entête de
        # `test-setup.ts` — donc neutraliser cette branche serait resté VERT en
        # annonçant le contraire. Ce qui porte la charge est ailleurs : la
        # recherche d'exemption. Coupée, `filter-wizard.test.tsx` redevient un
        # fichier ordinaire et ses avertissements le font tomber dans
        # `afterEach`. Si ça ne rougit pas, c'est que la garde de base ne
        # fonctionne plus du tout.
        SETUP_CLIENT,
        "  return Object.keys(PLAFONDS).find((s) => chemin.endsWith(s));",
        "  return undefined;",
        1,
        ["plafond"],
    ),
    (
        "S8-3. La sentinelle `A_RELEVER` cesse de mordre — un plafond deviné passerait",
        # ⚠ Sans cette cible, la branche `A_RELEVER` serait du code que plus
        # personne n'emprunte, donc du code dont on ne sait plus s'il marche —
        # et c'est précisément celle qui empêche d'inscrire un nombre inventé
        # à la prochaine exemption.
        SETUP_CLIENT,
        '  "src/components/filter-wizard.test.tsx": 3,',
        '  "src/components/filter-wizard.test.tsx": A_RELEVER,',
        1,
        ["plafond"],
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


def lancer(nom: str) -> int:
    commande, _ = MESURES[nom]
    env = dict(os.environ)
    tete = commande[0]
    if tete == _avec_releve:
        env["UPDATE_CONSOLE_CEILINGS"] = "1"
        tete = "pnpm"
    argv = [_binaire(tete), *commande[1:]]
    r = subprocess.run(argv, capture_output=True, text=True, encoding="utf-8", errors="replace", env=env)
    return r.returncode, f"{r.stdout or ''}\n{r.stderr or ''}"


def _queue(nom: str, sortie: str, lignes: int = 40) -> None:
    """⚠ ON N'INTERPRÈTE PAS, ON MONTRE. Filtrer sur « FAIL » ou « Error »
    masquerait justement la panne à laquelle on ne s'attend pas — une base
    absente, une migration refusée, un port occupé."""
    commande, _ = MESURES[nom]
    print(f"   commande : {' '.join(commande)}")
    utiles = [l for l in sortie.splitlines() if l.strip()]
    if not utiles:
        print("   (aucune sortie)")
        return
    print(f"   ── {min(lignes, len(utiles))} dernière(s) ligne(s) sur {len(utiles)} ──")
    for l in utiles[-lignes:]:
        print(f"   │ {l}")


def main(argv: list[str]) -> int:
    avec_int = "--int" in argv
    rangs = [a for a in argv if a.isdigit()]
    depuis = int(rangs[0]) if rangs else 1
    jusqua = int(rangs[1]) if len(rangs) > 1 else 99

    restaurer_si_interrompu()

    actives = [n for n, (_, genre) in MESURES.items() if genre in ("unit", "inverse") or avec_int]
    # ⚠ UNE MESURE « inverse » EST ROUGE QUAND TOUT VA BIEN : l'exiger verte au
    # pré-vol abandonnerait la campagne à chaque fois. On la vérifie à l'envers,
    # ici et une seule fois — c'est SA garde, elle n'a pas de cible à muter.
    inverses = [n for n, (_, genre) in MESURES.items() if genre == "inverse"]
    for nom in inverses:
        if lancer(nom)[0] == 0:
            print(f"✗ PRÉ-VOL INVERSÉ : « {nom} » sort en 0 — une variable de relevé")
            print("  oubliée dans le shell passerait pour une porte franchie.")
            return 2
    if inverses:
        print(f"✓ Pré-vol inversé : un run de relevé ROUGIT — {', '.join(inverses)}")
    actives = [n for n in actives if n not in inverses]
    if not avec_int:
        print("⚠ Mesures d'INTÉGRATION non exécutées (relancer avec --int sur une base réelle).")
        print("  Sans elles, les cinq gardes de E3d-1 restent NON PROUVÉES : une contrainte")
        print("  de table ne se mesure pas contre un faux magasin.\n")

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
        # ⚠ Fichiers en CRLF : un motif multi-lignes DOIT porter \r\n (D224).
        avant = avant.replace("\n", "\r\n")
        apres = apres.replace("\n", "\r\n")
        vus = source.count(avant)
        if vus != attendu:
            print(f"✗ {libelle}\n   ERREUR DE SCRIPT : {vus} occurrence(s), {attendu} attendue(s) dans {chemin}")
            return 2

        # ⛔ D248 — UNE CIBLE SANS MESURE N'A PAS EU LIEU : elle n'est ni rouge
        # ni verte. Comptée mordue, elle gonflerait le total.
        retenues = [m for m in mesures if m in actives]
        if not retenues:
            non_mesurees.append(f"{libelle} (hors exécution : {', '.join(mesures)})")
            print(f"⚠ {libelle}\n   NON MESURÉE — {', '.join(mesures)} hors de cette exécution.")
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
