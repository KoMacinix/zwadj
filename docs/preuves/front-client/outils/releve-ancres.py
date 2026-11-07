#!/usr/bin/env python3
"""releve-ancres.py — relevé STATIQUE des ancres des campagnes de neutralisation : chaque ancre comptée dans le fichier qu'elle vise.

POURQUOI IL EXISTE (session `front-client`, FC-5). Un lot qui déplace du code périme les ancres des campagnes d'autres rangs ; un
harnais qui ne trouve plus son ancre s'arrête en « ERREUR DE SCRIPT » et ne joue AUCUNE des cibles suivantes. Ce relevé le dit
AVANT de jouer, sans rien muter, et dit aussi quelles ancres sont écrites en CRLF EN DUR (introuvables dans ce conteneur, où le
dépôt est extrait en LF, mais justes sur le poste de Ko, `core.autocrlf=true`).
⛔ SA PREMIÈRE VERSION, écrite en ligne pendant FC-5, lisait le fichier visé par la clé `fichier` SEULE : les 12 cibles de
`neutralize-404.py` (clé `chemin`) étaient sautées EN SILENCE et comptées comme examinées — « 12 cibles · 0 écart » sur une
campagne qui en avait trois. C'est D290 : un compteur rend ce qu'il a PARCOURU. ⇒ Cette version imprime, par campagne, les cibles
LISTÉES, EXAMINÉES (avec ancre ; sans ancre, par genre) et NON RECONNUES — ces dernières (attendu 0) la font sortir en 2.

LECTURE. Chaque harnais est IMPORTÉ (sa liste `CIBLES`, ou `campagne.cibles` pour le socle de la session), sa sortie capturée,
`SystemExit` absorbé : rien n'est joué, rien n'est muté. Une cible :
  · dictionnaire — fichier sous `fichier` OU `chemin`, ancre sous `avant`, attendu sous `occurrences` (1 sinon), `genre` ;
  · tuple — (libellé, fichier, ancre, remplacement, occurrences attendues, …) ;
  · sans ancre — `creer` (le fichier ne doit PAS exister), `supprimer` (il doit exister), `renommer` (`de` doit exister).
Une ancre est un ÉCART si, le fichier ramené en LF, elle n'y est pas trouvée le nombre de fois attendu, OU si sa forme BRUTE
n'y est pas trouvée autant de fois que sa forme LF (CRLF en dur : écart d'ENVIRONNEMENT, nommé comme tel).

CALIBRATION (deux bras, D286), rejouée à chaque lancement sur des fichiers TEMPORAIRES :
  · bras rouge : une cible à clé `chemin` dont l'ancre manque EST un écart (le défaut de la première version) ; une ancre en CRLF
    dans un fichier LF est un écart d'environnement ; un attendu ×2 trouvé ×1 est un écart ; `creer` sur un fichier existant
    est un écart ; une cible sans fichier ni ancre est NON RECONNUE ;
  · bras vert : une cible à clé `fichier` dont l'ancre est là n'est pas un écart ; `creer` sur un chemin libre est examinée
    sans écart.
INSTRUMENT ÉCARTÉ : jouer les campagnes pour voir où elles s'arrêtent — elles s'arrêtent à la PREMIÈRE ancre manquante et taisent
les suivantes, et leur coût se compte en dizaines de minutes.

USAGE (depuis la RACINE) :
    python3 docs/preuves/front-client/outils/releve-ancres.py [--dossier <d>] <nom>…   (nom `404` → <d>/neutralize-404.py ;
                                                                                         <d> = neutralisation par défaut)
    python3 docs/preuves/front-client/outils/releve-ancres.py --fichiers <nom>          (les fichiers EXISTANTS que visent les
                                                                                         cibles du harnais, un par ligne — la
                                                                                         liste que `crlf-simule.py` convertit)
SORTIE : 0 aucun écart · 1 au moins un écart · 2 cible non reconnue, harnais illisible ou calibration manquée.
"""
import contextlib
import importlib.util
import io
import os
import sys
import tempfile

if hasattr(sys.stdout, "reconfigure"):
    sys.stdout.reconfigure(encoding="utf-8", errors="replace")
    sys.stderr.reconfigure(encoding="utf-8", errors="replace")

SANS_ANCRE = {"creer", "supprimer", "renommer"}


def lire_lf(chemin: str) -> tuple[str, str]:
    brut = io.open(chemin, encoding="utf-8", newline="").read()
    return brut, brut.replace("\r\n", "\n")


def examiner(cible) -> tuple[str, str]:
    """→ (« avec ancre » | « sans ancre » | « non reconnue », détail de l'écart ou "")."""
    if isinstance(cible, dict):
        fichier = cible.get("fichier") or cible.get("chemin")
        ancre = cible.get("avant")
        attendu = cible.get("occurrences", 1)
        genre = cible.get("genre")
        if ancre is None and genre in SANS_ANCRE:
            if genre == "creer":
                return "sans ancre", (f"creer : {fichier} existe déjà" if isinstance(fichier, str) and os.path.exists(fichier) else "")
            if genre == "supprimer":
                return "sans ancre", ("" if isinstance(fichier, str) and os.path.isfile(fichier) else f"supprimer : {fichier} absent")
            source = cible.get("de")
            return "sans ancre", ("" if isinstance(source, str) and os.path.isfile(source) else f"renommer : {source} absent")
    elif isinstance(cible, (tuple, list)) and len(cible) >= 3:
        fichier, ancre = cible[1], cible[2]
        attendu = cible[4] if len(cible) > 4 and isinstance(cible[4], int) else 1
    else:
        return "non reconnue", f"forme {type(cible).__name__}"
    if not isinstance(fichier, str) or not isinstance(ancre, str):
        return "non reconnue", "ni fichier ni ancre lisibles"
    if not os.path.isfile(fichier):
        return "avec ancre", f"{fichier} absent"
    brut, lf = lire_lf(fichier)
    k_lf = lf.count(ancre.replace("\r\n", "\n"))
    k_brut = brut.count(ancre)
    if k_lf != attendu:
        return "avec ancre", f"{fichier} | attendu ×{attendu} · ramenée en LF ×{k_lf} · brute ×{k_brut} — PÉRIMÉE"
    if k_brut != k_lf:
        return "avec ancre", f"{fichier} | attendu ×{attendu} · ramenée en LF ×{k_lf} · brute ×{k_brut} — CRLF EN DUR (environnement)"
    return "avec ancre", ""


def libelle(cible) -> str:
    if isinstance(cible, dict):
        return str(cible.get("libelle", "?"))
    return str(cible[0]) if isinstance(cible, (tuple, list)) and cible else "?"


def calibrer() -> bool:
    bras = []
    with tempfile.TemporaryDirectory() as d:
        f = os.path.join(d, "x.ts")
        io.open(f, "w", encoding="utf-8", newline="").write("a\nb\nc\n")
        libre = os.path.join(d, "libre.ts")
        cas = [
            ("rouge : clé `chemin`, ancre absente → écart (défaut de la première version)",
             {"chemin": f, "avant": "zzz", "genre": "remplacer"}, "avec ancre", True),
            ("rouge : ancre CRLF dans un fichier LF → écart d'environnement",
             {"fichier": f, "avant": "a\r\nb"}, "avec ancre", True),
            ("rouge : attendu ×2, trouvé ×1 → écart", ("t", f, "a\nb", "x", 2), "avec ancre", True),
            ("rouge : `creer` sur un fichier existant → écart", {"chemin": f, "genre": "creer", "contenu": ""}, "sans ancre", True),
            ("rouge : ni fichier ni ancre → non reconnue", {"libelle": "x"}, "non reconnue", True),
            ("vert : clé `fichier`, ancre présente → pas d'écart", {"fichier": f, "avant": "a\nb"}, "avec ancre", False),
            ("vert : `creer` sur un chemin libre → examinée sans écart",
             {"chemin": libre, "genre": "creer", "contenu": ""}, "sans ancre", False),
        ]
        for nom, cible, categorie, ecart in cas:
            c, detail = examiner(cible)
            bras.append((nom, c == categorie and (detail != "" or c == "non reconnue") == ecart))
    for nom, ok in bras:
        print(f"calibration {'✓' if ok else '✗'} {nom}")
    manques = sum(1 for _, ok in bras if not ok)
    print(f"calibration : {len(bras)} bras · {manques} manqué(s) (attendu 0)")
    print()
    return manques == 0


def charger(chemin: str):
    spec = importlib.util.spec_from_file_location("releve_" + os.path.basename(chemin).replace("-", "_").replace(".", "_"), chemin)
    module = importlib.util.module_from_spec(spec)
    argv = sys.argv
    sys.argv = [chemin]
    try:
        with contextlib.redirect_stdout(io.StringIO()):
            spec.loader.exec_module(module)
    except SystemExit:
        pass
    finally:
        sys.argv = argv
    cibles = getattr(module, "CIBLES", None)
    if cibles is None and hasattr(module, "campagne"):
        cibles = module.campagne.cibles
    return cibles


def fichiers_vises(cibles) -> list[str]:
    """Les fichiers EXISTANTS qu'une liste de cibles vise (avec ou sans ancre), triés, sans doublon."""
    vus = set()
    for c in cibles:
        if isinstance(c, dict):
            for cle in ("fichier", "chemin", "de"):
                if isinstance(c.get(cle), str):
                    vus.add(c[cle])
        elif isinstance(c, (tuple, list)) and len(c) >= 2 and isinstance(c[1], str):
            vus.add(c[1])
    return sorted(f for f in vus if os.path.isfile(f))


def main(argv: list[str]) -> int:
    if not os.path.isfile("pnpm-workspace.yaml"):
        print("✗ à lancer depuis la RACINE du monorepo")
        return 2
    if argv[:1] == ["--fichiers"] and len(argv) == 2:
        cibles = charger(os.path.join("neutralisation", f"neutralize-{argv[1]}.py"))
        if cibles is None:
            print(f"✗ HARNAIS ILLISIBLE : {argv[1]}", file=sys.stderr)
            return 2
        print("\n".join(fichiers_vises(cibles)))
        return 0
    dossier = "neutralisation"
    if argv[:1] == ["--dossier"]:
        dossier, argv = argv[1], argv[2:]
    if not argv:
        print(__doc__)
        return 2
    if not calibrer():
        print("✗ calibration manquée : rien n'est relevé")
        return 2
    totaux = {"listees": 0, "avec": 0, "sans": 0, "non": 0, "ecarts": 0, "env": 0}
    illisibles = 0
    for nom in argv:
        chemin = os.path.join(dossier, f"neutralize-{nom}.py")
        cibles = charger(chemin)
        if cibles is None:
            print(f"{nom:14s} ✗ HARNAIS ILLISIBLE : ni `CIBLES` ni `campagne.cibles`")
            illisibles += 1
            continue
        lignes, avec, sans, non = [], 0, 0, 0
        for cible in cibles:
            categorie, detail = examiner(cible)
            avec += categorie == "avec ancre"
            sans += categorie == "sans ancre"
            non += categorie == "non reconnue"
            if detail:
                lignes.append(f"     {libelle(cible)[:64]} | {detail}")
                totaux["env" if "environnement" in detail else "ecarts"] += 1
        totaux["listees"] += len(cibles)
        totaux["avec"] += avec
        totaux["sans"] += sans
        totaux["non"] += non
        print(f"{nom:14s} listées {len(cibles):3d} · examinées {avec + sans:3d} (avec ancre {avec}, sans ancre {sans}) · "
              f"non reconnues {non} · écarts {len(lignes)}")
        print("\n".join(lignes)) if lignes else None
    print()
    print(f"campagnes parcourues : {len(argv)} (illisibles : {illisibles}, attendu 0) · cibles listées : {totaux['listees']} · "
          f"examinées : {totaux['avec'] + totaux['sans']} · non reconnues : {totaux['non']} (attendu 0)")
    print(f"écarts : {totaux['ecarts']} ancre(s) PÉRIMÉE(S) ou fichier(s) absent(s) · {totaux['env']} ancre(s) CRLF EN DUR "
          f"(environnement)")
    if illisibles or totaux["non"]:
        return 2
    return 1 if totaux["ecarts"] or totaux["env"] else 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
