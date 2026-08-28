#!/usr/bin/env python3
"""Campagne de neutralisation — point B, 404 réellement atteignable (D233).

⚠ CE HARNAIS EXISTE PARCE QUE LE LOT PRÉCÉDENT AVAIT DÉJÀ « LIVRÉ » CES PAGES.
Le 19/08/2026, deux pages 404 correctes — traduites, dans la charte, deux
sorties — sont parties en livraison. Aucune des deux ne s'est jamais rendue
pour un visiteur : l'une portait un nom que le routeur ne reconnaît pas,
l'autre n'était atteinte par aucune URL. Un test de rendu serait resté vert
pendant tout ce temps. C'est le motif de D218 et de D228.

⛔ RÈGLE PROPRE À CE HARNAIS, ET DIFFÉRENCE AVEC LES PRÉCÉDENTS (D226).
Aucun filtre `-t`. `vitest -t <motif>` sort en 0 quand RIEN ne correspond : un
titre mal recopié rendrait donc « vert » une cible qui n'a jamais été jouée, et
le harnais certifierait le contraire de ce qu'il mesure. Ici on lance le
FICHIER entier, et une cible n'est retenue comme mordante que si :
  1. le code de sortie est non nul, ET
  2. le TITRE attendu apparaît sur une ligne d'échec (« × … »).
Un titre absent de la sortie est traité comme une ERREUR DE SCRIPT, pas comme
un succès.

⚠ Sauvegarde AVANT mutation, restauration en `finally`, et reprise au démarrage
si une exécution précédente a été tuée par un signal (D223 : un harnais
interrompu laisse l'arbre muté). Les mutations portent ici sur des FICHIERS
ENTIERS — renommage, suppression, création — pas seulement sur des chaînes :
c'est justement l'existence des fichiers qui avait cédé.

Usage :  python3 neutralize-404.py [depuis] [jusqua]
Depuis  :  la racine du monorepo.
"""

import io
import json
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

SAUVEGARDE = ".neutralisation-404"
MANIFESTE = os.path.join(SAUVEGARDE, "manifeste.json")

CLIENT = "apps/client"
RACINE_404 = "apps/client/src/app/not-found.tsx"
RACINE_404_MORTE = "apps/client/src/app/_not-found.tsx"
ATTRAPE_TOUT = "apps/client/src/app/[locale]/[...rest]/page.tsx"
IMAGE = "apps/client/public/404-nuage.svg"
LOCALISEE = "apps/client/src/app/[locale]/not-found.tsx"
FALLBACK = "apps/client/src/app/[locale]/salles/(recherche)/loading.tsx"
FALLBACK_REMONTE = "apps/client/src/app/[locale]/loading.tsx"
FALLBACK_SALLES = "apps/client/src/app/[locale]/salles/loading.tsx"
FICHIER_TESTS = "src/app/[locale]/not-found.test.tsx"


def L(*lignes: str) -> str:
    """Assemble des lignes en CRLF — l'invariant de fin de ligne du dépôt.

    ⚠ Écrire les motifs avec des `\\n` nus les rendrait introuvables dans des
    fichiers CRLF, et le harnais sortirait en « ERREUR DE SCRIPT » sur du code
    parfaitement correct."""
    return "\r\n".join(lignes)


CIBLES = [
    {
        "libelle": "C1. ⛔ LE DÉFAUT D'ORIGINE, À L'IDENTIQUE : la 404 racine reprend son tiret bas",
        "genre": "renommer",
        "de": RACINE_404,
        "vers": RACINE_404_MORTE,
        # Aucun titre : l'import statique de `../not-found` ne se résout plus,
        # donc Vitest tombe à la COLLECTE et n'annonce aucun test un par un.
        # C'est un rouge légitime — et la démonstration que ce nom de fichier
        # porte quelque chose — mais il ne prouve pas la garde de C2.
        "titre": None,
        "ancre": "Failed Suites",
    },
    {
        "libelle": "C2. Une COPIE `_not-found.tsx` est laissée à côté du bon fichier",
        # ⚠ Cible distincte de C1, et pas un doublon : ici le bon fichier reste,
        # donc tout s'importe et se rend. Seule la face « ancien nom absent » de
        # la garde peut mordre. C'est le cas réel d'un renommage fait à moitié.
        "genre": "creer",
        "chemin": RACINE_404_MORTE,
        "contenu": L("// copie laissée par un renommage à moitié fait", "export default function Mort() {", "  return null;", "}", ""),
        "titre": "sans tiret bas",
    },
    {
        "libelle": "C3. L'attrape-tout est SUPPRIMÉ (la 404 localisée redevient inatteignable)",
        "genre": "supprimer",
        "chemin": ATTRAPE_TOUT,
        # ⚠ MESURÉ, ET CONTRAIRE À CE QUE J'ATTENDAIS : la suppression ne fait
        # PAS rougir l'assertion `existsSync` — elle ne la laisse même pas
        # s'exécuter. Vite analyse statiquement le `import()` du test suivant
        # et tombe à la COLLECTE : « Failed to resolve import ». Le fichier
        # entier sort en échec, aucun titre n'est annoncé.
        # L'ancre porte donc sur le nom EXACT du module manquant — un rouge
        # venu d'ailleurs ne pourrait pas la produire.
        # ⚠ Conséquence à écrire, pas à taire : la garde qui mord réellement
        # sur une suppression est l'IMPORT du test, pas l'assertion `existsSync`
        # qui la précède. Cette dernière ne se démontre pas seule ; sa valeur
        # résiduelle est de NOMMER le chemin conventionnel attendu au lieu de
        # laisser une erreur de résolution opaque.
        "titre": None,
        "ancre": 'Failed to resolve import "./[...rest]/page"',
    },
    {
        "libelle": "C4. L'attrape-tout RETOURNE au lieu de LEVER (page vide en statut 200)",
        "genre": "remplacer",
        "chemin": ATTRAPE_TOUT,
        "avant": L("export default function LocaleCatchAll(): never {", "  notFound();", "}"),
        "apres": L("export default function LocaleCatchAll(): never {", "  void notFound;", "  return undefined as never;", "}"),
        "occurrences": 1,
        "titre": "il lève `notFound()`",
    },
    {
        "libelle": "C5. Les deux sorties sont INVERSÉES (le cas fréquent renvoyé à la case départ)",
        "genre": "remplacer",
        "chemin": LOCALISEE,
        "avant": L(
            '          <Link href="/salles" className="btn btn-accent">',
            '            {t("venues")}',
            "          </Link>",
            '          <Link href="/" className="btn btn-ghost">',
            '            {t("home")}',
            "          </Link>",
        ),
        "apres": L(
            '          <Link href="/" className="btn btn-ghost">',
            '            {t("home")}',
            "          </Link>",
            '          <Link href="/salles" className="btn btn-accent">',
            '            {t("venues")}',
            "          </Link>",
        ),
        "occurrences": 1,
        "titre": "la première mène aux salles",
    },
    {
        "libelle": "C6. Le « 404 » revient à l'écran, au-dessus du titre",
        # ⚠ CIBLE REMPLACÉE LE 23/08/2026. Elle désarmait auparavant le
        # `aria-hidden` du code « 404 » ; ce code n'existe plus, retiré à la
        # demande. La garde utile n'est donc plus « il est masqué » mais « il
        # n'est pas là » — et une cible qui ne trouve plus son ancre arrête la
        # campagne au lieu de se taire.
        "genre": "remplacer",
        "chemin": LOCALISEE,
        "avant": '      <section className="notfound-content">\r\n        <h1>{t("title")}</h1>',
        "apres": '      <section className="notfound-content">\r\n        <p>404</p>\r\n        <h1>{t("title")}</h1>',
        "occurrences": 1,
        "titre": "AUCUN « 404 » à l'écran",
    },
    {
        "libelle": "C6b. Le décor perd son `alt=\"\"` — il redevient annoncé aux lecteurs d'écran",
        # ⚠ CIBLE RÉORIENTÉE LE 24/08/2026. Elle visait la disparition du
        # composant `<LostWordCloud />`, remplacé par une image statique. La
        # faute possible a changé de nature : ce n'est plus « le décor
        # disparaît », c'est « le décor se met à parler ». Sans `alt`, une
        # image est annoncée par son NOM DE FICHIER — « quatre cent quatre
        # tiret nuage point s v g » lu à voix haute avant le message d'erreur.
        "genre": "remplacer",
        "chemin": LOCALISEE,
        "avant": '<img className="lost-word-cloud" src="/404-nuage.svg" alt="" aria-hidden="true" />',
        "apres": '<img className="lost-word-cloud" src="/404-nuage.svg" />',
        "occurrences": 1,
        "titre": "le décor EST là",
    },
    {
        "libelle": "C6c. L'image du décor n'est plus livrée (`src` qui ne pointe sur rien)",
        # Un fond vide, aucune erreur, aucun test de RENDU qui bouge : c'est
        # exactement le genre de panne muette que ces harnais existent pour
        # attraper.
        "genre": "supprimer",
        "chemin": IMAGE,
        "titre": "faite de TRACÉS",
    },
    {
        "libelle": "C7. La ligne arabe de la 404 racine perd sa direction (`dir=\"rtl\"`)",
        "genre": "remplacer",
        "chemin": RACINE_404,
        # ⚠ ANCRE REMISE À JOUR LE 23/08/2026 : le lot visuel (nuage de mots)
        # a remplacé le `<p>` en style en ligne par un `<span>` dans un titre.
        # L'ancienne ancre ne trouvait plus rien, et la campagne s'arrêtait
        # net sur « ERREUR DE SCRIPT » — c'est le comportement voulu, mais il
        # laissait C8, C9 et C10 non jouées.
        "avant": '<span lang="ar" dir="rtl">',
        "apres": '<span lang="ar">',
        "occurrences": 1,
        "titre": "DEUX langues",
    },
    {
        "libelle": "C8. La 404 localisée lit le MAUVAIS espace de noms de traduction",
        # Prouve que les tests de contenu mesurent bien les clés `notFound.*` et
        # non n'importe quelle chaîne qui s'afficherait.
        "genre": "remplacer",
        "chemin": LOCALISEE,
        "avant": 'const t = useTranslations("notFound");',
        "apres": 'const t = useTranslations("common");',
        "occurrences": 1,
        "titre": "que la page n'existe pas",
    },
    {
        "libelle": "C9. ⛔ LE SOFT-404 REVIENT : `loading.tsx` remonte en `[locale]/`",
        # Le défaut mesuré le 23/08/2026, à l'identique : une frontière Suspense
        # au-dessus de TOUTES les pages du segment, donc au-dessus des deux qui
        # peuvent refuser. Le 404 ressortirait en 200.
        "genre": "creer",
        "chemin": FALLBACK_REMONTE,
        "contenu": L('"use client";', "", "export default function Faux() {", "  return null;", "}", ""),
        "titre": "AUCUNE `loading.tsx` ne surplombe",
    },
    {
        "libelle": "C10. La remontée À MI-CHEMIN : `salles/loading.tsx` (recouvre la fiche)",
        # ⚠ Cible distincte de C9, et c'est tout l'intérêt du groupe de routes.
        # `salles/loading.tsx` laisse `/fr/nimportequoi` en 404 — la mesure
        # d'URL n'y verrait rien — mais remet la SALLE DÉPUBLIÉE en 200. Sans
        # cette cible, la garde pourrait ne mesurer que le cas le plus visible.
        "genre": "creer",
        "chemin": FALLBACK_SALLES,
        "contenu": L('"use client";', "", "export default function Faux() {", "  return null;", "}", ""),
        "titre": "AUCUNE `loading.tsx` ne surplombe",
    },
]


def _binaire(nom: str) -> str:
    """Résout l'exécutable AVANT `subprocess.run`.

    ⚠ Windows : `pnpm` est un `pnpm.cmd`, et `CreateProcess` ne consulte PAS
    `PATHEXT`. `shutil.which` le fait et rend le chemin complet."""
    return shutil.which(nom) or nom


def _lancer_tests() -> tuple[int, str]:
    cmd = ["pnpm", "--filter", "@zwadj/client", "run", "test", "--", FICHIER_TESTS]
    r = subprocess.run(
        [_binaire(cmd[0]), *cmd[1:]],
        capture_output=True,
        text=True,
        encoding="utf-8",
        errors="replace",
    )
    return r.returncode, (r.stdout or "") + (r.stderr or "")


# ── Sauvegarde / restauration ───────────────────────────────────────────────
# Le manifeste est écrit sur DISQUE avant chaque mutation : une interruption
# entre la mutation et le `finally` laisse de quoi remettre l'arbre en état à
# l'exécution suivante.


def _lire_manifeste() -> list:
    if not os.path.isfile(MANIFESTE):
        return []
    return json.load(io.open(MANIFESTE, encoding="utf-8"))


def _ecrire_manifeste(actions: list) -> None:
    os.makedirs(SAUVEGARDE, exist_ok=True)
    io.open(MANIFESTE, "w", encoding="utf-8", newline="").write(json.dumps(actions, ensure_ascii=False))


def _defaire(actions: list) -> None:
    for action in reversed(actions):
        if action["type"] == "restaurer":
            io.open(action["chemin"], "w", encoding="utf-8", newline="").write(action["contenu"])
        elif action["type"] == "supprimer":
            if os.path.exists(action["chemin"]):
                os.remove(action["chemin"])
        elif action["type"] == "recreer":
            os.makedirs(os.path.dirname(action["chemin"]), exist_ok=True)
            io.open(action["chemin"], "w", encoding="utf-8", newline="").write(action["contenu"])


def restaurer_si_interrompu() -> None:
    actions = _lire_manifeste()
    if actions:
        _defaire(actions)
        print(f"↺ arbre restauré après une exécution interrompue ({len(actions)} action(s)).")
    if os.path.isdir(SAUVEGARDE):
        shutil.rmtree(SAUVEGARDE)


def muter(cible: dict) -> tuple[list, str | None]:
    """Applique la neutralisation. Rend (actions d'annulation, erreur de script)."""
    genre = cible["genre"]

    if genre == "remplacer":
        chemin = cible["chemin"]
        if not os.path.isfile(chemin):
            return [], f"{chemin} est absent — l'arbre n'est pas dans son état de départ"
        source = io.open(chemin, encoding="utf-8", newline="").read()
        vus = source.count(cible["avant"])
        if vus != cible["occurrences"]:
            return [], f"{vus} occurrence(s) trouvée(s), {cible['occurrences']} attendue(s) dans {chemin}"
        annuler = [{"type": "restaurer", "chemin": chemin, "contenu": source}]
        _ecrire_manifeste(annuler)
        io.open(chemin, "w", encoding="utf-8", newline="").write(source.replace(cible["avant"], cible["apres"]))
        return annuler, None

    if genre == "supprimer":
        chemin = cible["chemin"]
        if not os.path.isfile(chemin):
            return [], f"{chemin} est déjà absent — rien à neutraliser"
        contenu = io.open(chemin, encoding="utf-8", newline="").read()
        annuler = [{"type": "recreer", "chemin": chemin, "contenu": contenu}]
        _ecrire_manifeste(annuler)
        os.remove(chemin)
        return annuler, None

    if genre == "creer":
        chemin = cible["chemin"]
        if os.path.exists(chemin):
            return [], f"{chemin} existe déjà — la cible mesurerait autre chose"
        annuler = [{"type": "supprimer", "chemin": chemin}]
        _ecrire_manifeste(annuler)
        os.makedirs(os.path.dirname(chemin), exist_ok=True)
        io.open(chemin, "w", encoding="utf-8", newline="").write(cible["contenu"])
        return annuler, None

    if genre == "renommer":
        de, vers = cible["de"], cible["vers"]
        if not os.path.isfile(de):
            return [], f"{de} est absent"
        if os.path.exists(vers):
            return [], f"{vers} existe déjà"
        contenu = io.open(de, encoding="utf-8", newline="").read()
        annuler = [{"type": "recreer", "chemin": de, "contenu": contenu}, {"type": "supprimer", "chemin": vers}]
        _ecrire_manifeste(annuler)
        os.rename(de, vers)
        return annuler, None

    return [], f"genre inconnu : {genre}"


def rouge_attendu(cible: dict, code: int, sortie: str) -> str | None:
    """Rend None si la cible a bien mordu, sinon la raison."""
    if code == 0:
        return "VERT malgré la neutralisation — la garde ne mesure rien"
    titre = cible["titre"]
    if titre is None:
        ancre = cible["ancre"]
        return None if ancre in sortie else f"rouge, mais sans « {ancre} » : l'échec vient d'ailleurs"
    for ligne in sortie.splitlines():
        if "×" in ligne and titre in ligne:
            return None
    # ⚠ Non nul mais titre introuvable : l'échec peut venir d'un tout autre
    # test. On refuse de compter cette cible comme mordante.
    return f"rouge, mais aucun échec ne porte le titre « {titre} » — ancre à revoir"


ETAT_ATTENDU = [
    (RACINE_404, True),
    (RACINE_404_MORTE, False),
    (ATTRAPE_TOUT, True),
    (LOCALISEE, True),
    (IMAGE, True),
    (FALLBACK, True),
    (FALLBACK_REMONTE, False),
    (FALLBACK_SALLES, False),
]


def verifier_arbre(moment: str) -> bool:
    """L'arbre est-il dans son état de départ ?

    ⚠ Appelée AVANT et APRÈS la campagne. Un harnais qui laisse un fichier
    muté est pire qu'un harnais absent : la porte suivante mesure un dépôt
    que personne n'a écrit (D223, D224). Le vérifier coûte quatre `isfile`."""
    ecarts = [f"{c} {'manquant' if attendu else 'en trop'}"
              for c, attendu in ETAT_ATTENDU if os.path.isfile(c) != attendu]
    if ecarts:
        print(f"✗ ARBRE NON CONFORME {moment} : " + " ; ".join(ecarts))
        return False
    return True


def main(depuis: int = 1, jusqua: int = 99) -> int:
    if not os.path.isdir(CLIENT):
        print("✗ à lancer depuis la RACINE du monorepo (apps/client introuvable).")
        return 2

    restaurer_si_interrompu()
    if not verifier_arbre("AU DÉPART"):
        return 2
    mordu, muettes, erreurs = 0, [], []

    for rang, cible in enumerate(CIBLES, start=1):
        if not (depuis <= rang <= jusqua):
            continue
        annuler, erreur = muter(cible)
        if erreur:
            # ⚠ ARRÊT FRANC, pas un `continue`. Une erreur de script signifie
            # que l'arbre n'est pas dans l'état attendu ; les cibles suivantes
            # mesureraient alors autre chose que ce qu'elles annoncent, et
            # rendraient un verdict faux. Vécu le 23/08/2026 : une
            # restauration manuelle écrite dans le mauvais répertoire avait
            # laissé un fichier absent, et la campagne a poursuivi en
            # déclarant « muette » une garde parfaitement saine.
            print(f"✗ {cible['libelle']}\n   ERREUR DE SCRIPT : {erreur}")
            erreurs.append(cible["libelle"])
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)
            break
        try:
            code, sortie = _lancer_tests()
        finally:
            _defaire(annuler)
            shutil.rmtree(SAUVEGARDE, ignore_errors=True)

        raison = rouge_attendu(cible, code, sortie)
        if raison is None:
            mordu += 1
            print(f"✓ {cible['libelle']}")
        else:
            muettes.append(f"{cible['libelle']} — {raison}")
            print(f"✗ {cible['libelle']}\n   {raison}")

    conforme = verifier_arbre("À L'ARRIVÉE")

    print(f"\n{mordu} garde(s) neutralisée(s) et ROUGE(s) sur la plage demandée.")
    if conforme:
        print("arbre rendu à son état de départ : vérifié.")
    for m in muettes:
        print(f"  muette : {m}")
    for e in erreurs:
        print(f"  erreur de script : {e}")
    return 0 if not (muettes or erreurs or not conforme) else 1


if __name__ == "__main__":
    sys.exit(main(int(sys.argv[1]) if len(sys.argv) > 1 else 1, int(sys.argv[2]) if len(sys.argv) > 2 else 99))
