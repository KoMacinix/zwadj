"""D336 — LECTEUR DES ROUGES : lit les quatre pièces de rouges et écrit `docs/preuves/D336/rouges/lecture-rouges.txt`. Procédure archivée comme PREUVE (D291), jamais promue en instrument.

USAGE, depuis la racine : python3 docs/preuves/D336/rouges/lire-rouges.py

POURQUOI. Un code de sortie non nul ne dit pas POURQUOI un test a échoué (D304) : une assertion qui compare et refuse, un plantage parce que le code d'avant n'a pas
ce que le test appelle, un fichier qui n'a pas pu se charger. Pour chaque test en échec, ce lecteur rend son fichier, son titre, la PREMIÈRE ligne de son erreur —
celle qui suit le bloc des en-têtes `FAIL … > titre` (vitest REGROUPE sous un seul message les tests qui échouent de la même façon : plusieurs en-têtes d'affilée,
PUIS l'erreur — D316) — et sa CLASSE :
  · assertion           — `AssertionError: …` (un `expect` de vitest a comparé et refusé) ;
  · assertion-dom       — `Error: expect(element)…` / `Error: expect(…)` (un matcher jest-dom, D316 : une assertion, mais pas une `AssertionError`) ;
  · exécution           — `TypeError`, `ReferenceError`… (le code d'AVANT n'a pas ce que le test appelle) ;
  · requête             — `TestingLibraryElementError` (une requête Testing Library n'a rien trouvé) ;
  · requête-clé-absente — Testing Library a reçu un motif `undefined` : la clé de catalogue que le test lit n'existe pas encore ;
  · base-objet-absent   — PostgreSQL : une table ou une colonne que le test lit n'existe pas encore ;
  · délai               — `Error: Test timed out` ;
  · autre               — toute autre première ligne, imprimée telle quelle.
Un bloc `FAIL <fichier> [ <fichier> ]` est un échec de COLLECTE : aucun titre, le fichier n'a pas été chargé.

ÉCARTÉ : le rapport JUnit de vitest — une collecte ratée y produit un `<testcase>` EN ÉCHEC, et compter ses cas prend « rien n'a tourné » pour « un test a échoué »
(D304) ; le rapport JSON — vitest 3.2.7 n'y met pas toujours le message d'erreur complet (D298). La sortie TEXTE est la seule où les trois cas se séparent.

⛔ CONTRÔLE (D275, D290) : pour chaque pièce, le nombre de tests en échec LU ici est confronté au total que vitest imprime sur sa ligne `Tests … failed` ; l'écart
est imprimé à côté, avec l'attendu (0), et ce qui a été PARCOURU (lignes). Un lecteur qui ne retrouve pas le total de vitest ne sert pas à compter.
⛔ CALIBRATION, deux bras, rejouée à chaque lancement, ABANDON si un seul manque son verdict (D286) : (positif) un texte synthétique qui porte deux en-têtes
REGROUPÉS sous une assertion, un en-tête seul sous un `TypeError` et un échec de collecte rend 3 échecs, leurs classes et 1 collecte, avec « Tests 3 failed » ;
(négatif) un texte sans aucun échec rend 0 échec, 0 collecte, et un total annoncé de 0 — un zéro qui dit sur quoi il a compté.
"""
import collections
import re
import sys

sys.stdout.reconfigure(encoding="utf-8")
DOSSIER = "docs/preuves/D336/rouges"
PIECES = ["rouge-api-unitaire.txt", "rouge-api-client.txt", "rouge-pro.txt", "rouge-integration.txt"]
EN_TETE = re.compile(r"^ FAIL  (\S+) > (.+)$")
COLLECTE = re.compile(r"^ FAIL  (\S+) \[ (\S+) \]$")
TOTAL = re.compile(r"^\s+Tests\s+(?:(\d+) failed)?")


def classe(ligne: str) -> str:
    if ligne.startswith("AssertionError"):
        return "assertion"
    if re.match(r"^Error: expect\(", ligne):
        return "assertion-dom"
    if re.match(r"^(TypeError|ReferenceError|SyntaxError|RangeError)\b", ligne):
        return "exécution"
    if ligne.startswith("TestingLibraryElementError"):
        return "requête"
    # Testing Library refuse un MOTIF `undefined` : la clé de catalogue que le test lit (`FR.<clé>`) n'existe pas encore — une requête, pas une assertion.
    if ligne.startswith("Error: It looks like undefined was passed instead of a matcher"):
        return "requête-clé-absente"
    # PostgreSQL : la table ou la colonne que le test lit n'existe pas encore (la migration du lot n'est pas écrite) — pas une assertion.
    if re.match(r"^error: (relation|column) .* does not exist", ligne):
        return "base-objet-absent"
    if ligne.startswith("Error: Test timed out"):
        return "délai"
    return "autre"


def lire(lignes: list[str]):
    """(total annoncé par vitest, [(fichier, titre, première ligne, classe)], [(fichier, première ligne)]) d'une sortie texte."""
    annonce = None
    for l in lignes:
        m = TOTAL.match(l)
        if m and ("failed" in l or "passed" in l):
            annonce = int(m.group(1) or 0)
    echecs, collectes = [], []
    i = 0
    while i < len(lignes):
        c = COLLECTE.match(lignes[i])
        if c:
            j = i + 1
            while j < len(lignes) and not lignes[j].strip():
                j += 1
            collectes.append((c.group(1), lignes[j].strip() if j < len(lignes) else ""))
            i = j
            continue
        m = EN_TETE.match(lignes[i])
        if m:
            groupe = [(m.group(1), m.group(2))]
            j = i + 1
            while j < len(lignes) and EN_TETE.match(lignes[j]):
                mm = EN_TETE.match(lignes[j])
                groupe.append((mm.group(1), mm.group(2)))
                j += 1
            while j < len(lignes) and not lignes[j].strip():
                j += 1
            erreur = lignes[j].strip() if j < len(lignes) else ""
            for f, titre in groupe:
                echecs.append((f, titre, erreur, classe(erreur)))
            i = j
            continue
        i += 1
    return annonce, echecs, collectes


# ── CALIBRATION, deux bras ─────────────────────────────────────────────────
POSITIF = """ FAIL  src/a.test.ts [ src/a.test.ts ]
Error: Cannot find module './a'

 FAIL  src/b.test.ts > bloc > premier
 FAIL  src/b.test.ts > bloc > second
AssertionError: expected 1 to be 2 // Object.is equality

 FAIL  src/c.test.ts > autre bloc > troisième
TypeError: x is not a function

 Test Files  3 failed (3)
      Tests  3 failed | 4 passed (7)
""".split("\n")
NEGATIF = """ ✓ src/d.test.ts (4 tests) 12ms

 Test Files  1 passed (1)
      Tests  4 passed (4)
""".split("\n")
a_pos, e_pos, c_pos = lire(POSITIF)
a_neg, e_neg, c_neg = lire(NEGATIF)
attendu_pos = (3, [("src/b.test.ts", "bloc > premier", "assertion"), ("src/b.test.ts", "bloc > second", "assertion"), ("src/c.test.ts", "autre bloc > troisième", "exécution")], 1)
obtenu_pos = (a_pos, [(f, t, cl) for f, t, _, cl in e_pos], len(c_pos))
obtenu_neg = (a_neg, len(e_neg), len(c_neg))
calibration = [
    ("positif (deux en-têtes regroupés + un seul + une collecte)", obtenu_pos == attendu_pos, f"obtenu {obtenu_pos} · attendu {attendu_pos}"),
    ("négatif (aucun échec)", obtenu_neg == (0, 0, 0), f"obtenu {obtenu_neg} · attendu (0, 0, 0)"),
]
for nom, ok, detail in calibration:
    print(f"calibration {nom} : {'✓' if ok else '✗'} — {detail}")
if not all(ok for _, ok, _ in calibration):
    print("ABANDON : la calibration ne rend pas ses verdicts — le lecteur ne compte rien.")
    sys.exit(2)

# ── LECTURE DES PIÈCES ─────────────────────────────────────────────────────
sortie = [
    "# D336 — LECTURE DES ROUGES (D334, item 5) : chaque test en échec contre l'état d'AVANT le code, sa première ligne d'erreur, sa classe",
    "# lecteur : docs/preuves/D336/rouges/lire-rouges.py — calibration à deux bras rejouée à ce lancement : " + " ; ".join(f"{n} {'✓' if ok else '✗'}" for n, ok, _ in calibration),
    "",
]
ecarts = 0
grand = collections.Counter()
for piece in PIECES:
    lignes = open(f"{DOSSIER}/{piece}", encoding="utf-8").read().split("\n")
    annonce, echecs, collectes = lire(lignes)
    compte = collections.Counter(e[3] for e in echecs)
    grand.update(compte)
    grand["collecte"] += len(collectes)
    ecart = (annonce if annonce is not None else -1) - len(echecs)
    ecarts += abs(ecart)
    sortie.append(f"## {piece}")
    sortie.append(f"parcouru : {len(lignes)} lignes · tests en échec LUS : {len(echecs)} · annoncés par vitest : {annonce} · écart {ecart} (attendu 0) · échecs de COLLECTE : {len(collectes)}")
    sortie.append("par classe : " + ", ".join(f"{k} {v}" for k, v in sorted(compte.items())) + (f", collecte {len(collectes)}" if collectes else ""))
    for f, premiere in collectes:
        sortie.append(f"  [collecte] {f} — {premiere}")
    for f, titre, erreur, cl in echecs:
        sortie.append(f"  [{cl}] {f} > {titre}")
        sortie.append(f"      ↳ {erreur[:240]}")
    sortie.append("")
sortie.append("## total")
sortie.append(", ".join(f"{k} {v}" for k, v in sorted(grand.items())))
sortie.append(f"écart cumulé entre les échecs LUS et ceux qu'ANNONCE vitest : {ecarts} (attendu 0)")
open(f"{DOSSIER}/lecture-rouges.txt", "w", encoding="utf-8", newline="\n").write("\n".join(sortie) + "\n")
print("\n".join(l for l in sortie if l.startswith("##") or l.startswith("parcouru") or l.startswith("par classe") or l.startswith("écart") or l.startswith("assertion")))
sys.exit(1 if ecarts else 0)
