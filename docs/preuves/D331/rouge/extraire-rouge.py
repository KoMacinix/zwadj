"""D331 — EXTRACTEUR DES ROUGES ET DES VERTS d'un journal vitest (3.2.7), pour les quatre chemins de « Ma salle » (rang 37). Pièce versée, procédure archivée comme preuve (D291), pas un instrument promu.

POURQUOI IL EXISTE. Un journal vitest d'une suite qui échoue sur des écrans React porte le DOM entier de chaque échec : 6 300 lignes pour 10 échecs. Le dépôt n'en garde pas le journal brut ; il garde, par
  chemin, ce qui se LIT : le titre de chaque test, son verdict, et pour chaque échec la PREMIÈRE ligne de son bloc et le cadre de code de l'assertion. Ce qui est versé est donc un EXTRAIT, et il le dit.
LECTURE (D304, D316, mesurée sur vitest 3.2.7) : « × » et un titre ne prouvent pas une assertion ; seule la première ligne du bloc « FAIL … > <titre> » les sépare (`AssertionError: …` contre `TypeError: …`,
  `TestingLibraryElementError: …`, `Error: Test timed out …`). Plusieurs en-têtes « FAIL » d'affilée regroupent des tests qui échouent de la même façon : la première ligne est la première qui n'est pas un en-tête.
  Un échec n'est une MORSURE (au sens de R1) que si cette ligne est une `AssertionError`.
USAGE, depuis la racine, bash (jamais une redirection PowerShell, D298) :
  python3 docs/preuves/D331/rouge/extraire-rouge.py <journal brut> <sortie> "<chemin>" "<sous-chaîne du titre de describe>" "<état du code>"
CALIBRATION, deux bras (D286), rejouée à chaque lancement, abandon si un seul manque : (positif) un journal synthétique à un vert, un rouge à `AssertionError` et un rouge à `TestingLibraryElementError` → 1, 2, et la
  lecture sépare l'assertion de l'erreur de requête ; un titre qui contient « FAIL » et « × » reste un VERT (la ligne commence par ✓) ; (négatif) un texte sans verdict rend 0 et 0.
Imprime ce qu'il a PARCOURU et l'attendu à côté (D290). Codes : 0 = extrait écrit ; 2 = abandon (calibration manquée, ou un compte qui ne tient pas).
"""
import hashlib
import re
import sys

for flux in (sys.stdout, sys.stderr):
    flux.reconfigure(encoding="utf-8")

ANSI = re.compile(r"\x1b\[[0-9;]*m")
VERDICT = re.compile(r"^\s{1,4}([✓×])\s+(?:\S+\.test\.tsx?\s+>\s+)?(.*?)(?:\s+\d+ms)?\s*$")
ENTETE = re.compile(r"^\s*FAIL\s+(\S+)\s+>\s+(.*)$")
CADRE = re.compile(r"^\s*❯\s+\S+\.test\.tsx?:\d+:\d+\s*$")


def lire(texte):
    """(verdicts [(✓ ou ×, titre complet)], blocs [(titre, première ligne, cadre de code)]) d'un journal vitest."""
    lignes = ANSI.sub("", texte).split("\n")
    verdicts = [(m[1], m[2]) for l in lignes if (m := VERDICT.match(l)) and ">" in m[2]]
    blocs = []
    i = 0
    while i < len(lignes):
        m = ENTETE.match(lignes[i])
        if not m:
            i += 1
            continue
        titres = []
        while i < len(lignes) and ENTETE.match(lignes[i]):
            titres.append(ENTETE.match(lignes[i])[2].strip())
            i += 1
        j = i
        while j < len(lignes) and not lignes[j].strip():
            j += 1
        premiere = lignes[j].strip() if j < len(lignes) else ""
        cadre = []
        k = j
        while k < len(lignes) and not ENTETE.match(lignes[k]) and not re.match(r"^[⎯]{3,}", lignes[k].strip()):
            if CADRE.match(lignes[k]):
                cadre = [l.rstrip() for l in lignes[k : k + 6] if l.strip()]
                break
            k += 1
        for titre in titres:
            blocs.append((titre, premiere, cadre))
        i = max(i, j)
    return verdicts, blocs


def morsure(premiere):
    return premiere.startswith("AssertionError")


# ── CALIBRATION ──────────────────────────────────────────────────────────────────────────────
JOURNAL_TEMOIN = (
    "   ✓ monde > un test qui passe 12ms\n"
    "   ✓ monde > un titre qui parle de FAIL et de × reste un vert 3ms\n"
    "   × monde > le rouge par assertion 1254ms\n"
    "   × monde > le rouge par requête 1105ms\n"
    " FAIL  src/a.test.tsx > monde > le rouge par assertion\n"
    "AssertionError: expected null not to be null\n\n"
    " ❯ src/a.test.tsx:12:34\n     10|   x\n     11|   y\n     12|   expect(z)\n"
    "   |                  ^\n"
    "⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯⎯\n"
    " FAIL  src/a.test.tsx > monde > le rouge par requête\n"
    "TestingLibraryElementError: Unable to find an element\n\n"
    " ❯ src/a.test.tsx:20:5\n"
)
v, b = lire(JOURNAL_TEMOIN)
cal = [
    ("positif : 2 verts et 2 rouges lus", [x[0] for x in v] == ["✓", "✓", "×", "×"]),
    ("positif : un titre qui contient « FAIL » et « × » reste un vert", ("✓", "monde > un titre qui parle de FAIL et de × reste un vert") in v),
    ("positif : 2 blocs, l'assertion est une morsure, l'erreur de requête n'en est pas une", len(b) == 2 and morsure(b[0][1]) and not morsure(b[1][1])),
    ("positif : le cadre de code du premier bloc commence à `❯ src/a.test.tsx:12:34`", b and b[0][2][:1] == [" ❯ src/a.test.tsx:12:34"]),
    ("positif (reporter `verbose`) : une ligne « ✓ fichier > describe > titre 352ms » est un vert, SANS le préfixe du fichier", lire(" ✓ src/a.test.tsx > monde > le test 352ms\n")[0] == [("✓", "monde > le test")]),
    ("négatif : un texte sans verdict rend 0 verdict et 0 bloc", lire("rien à voir\nFAIL au milieu d'une phrase\n") == ([], [])),
]
for nom, ok in cal:
    print(f"   {'✓' if ok else '✗'} calibration — {nom}")
if not all(ok for _, ok in cal):
    print("✗ ABANDON : calibration manquée")
    sys.exit(2)

if len(sys.argv) != 6:
    print(f"== calibration : {len(cal)} bras, 0 manqué (aucun journal donné : usage dans l'en-tête)")
    sys.exit(2)
brut, sortie, chemin, filtre, etat = sys.argv[1:6]
octets = open(brut, "rb").read()
texte = octets.decode("utf-8", errors="replace")
verdicts, blocs = lire(texte)
choisis = [(s, t) for s, t in verdicts if filtre in t]
rouges = [t for s, t in choisis if s == "×"]
verts = [t for s, t in choisis if s == "✓"]
blocs_choisis = [bl for bl in blocs if filtre in bl[0]]
tous_rouges = [t for s, t in verdicts if s == "×"]
print(f"== calibration : {len(cal)} bras, 0 manqué")
print(f"parcouru : {len(texte.splitlines())} ligne(s) du journal brut ; {len(verdicts)} verdict(s) ; {len(blocs)} bloc(s) FAIL (attendu : autant que de ×, soit {len(tous_rouges)})")
total_attendu = [int(m[1]) for l in texte.split("\n") if (m := re.match(r"^\s*Tests\s.*\((\d+)\)\s*$", ANSI.sub("", l)))]
print(f"          verdicts lus : {len(verdicts)} ; total annoncé par la ligne « Tests » du journal : {total_attendu} (attendu : égaux — D275 : un zéro sur un journal non vide se confronte à la sortie brute)")
if total_attendu != [len(verdicts)]:
    print("✗ ABANDON : le nombre de verdicts lus n'est pas le total que le journal annonce")
    sys.exit(2)
if len(blocs) != len(tous_rouges):
    print("✗ ABANDON : le nombre de blocs FAIL n'est pas celui des tests en échec")
    sys.exit(2)
if len(blocs_choisis) != len(rouges):
    print("✗ ABANDON : un test en échec du chemin n'a pas de bloc FAIL")
    sys.exit(2)
sortie_txt = [
    f"# D331 — {chemin}",
    f"# état du code : {etat}",
    f"# journal brut (hors dépôt) : SHA-256 {hashlib.sha256(octets).hexdigest()} · {len(octets)} octets · {len(texte.splitlines())} lignes · EXTRAIT versé : verdicts du chemin (filtre « {filtre} ») et, pour chaque échec, la 1ʳᵉ ligne de son bloc et son cadre de code",
    "# lecture (D304, D316) : une MORSURE est un échec dont la 1ʳᵉ ligne du bloc est une `AssertionError` ; `TestingLibraryElementError`, `TypeError`, `Error: Test timed out` n'en sont pas",
    f"# comptes du chemin : {len(verts)} vert(s) · {len(rouges)} rouge(s) · {sum(1 for bl in blocs_choisis if morsure(bl[1]))} morsure(s) par assertion native (attendu : toutes les rouges)",
    "",
]
for s, t in choisis:
    sortie_txt.append(f"{'VERT ' if s == '✓' else 'ROUGE'}  {t}")
for titre, premiere, cadre in blocs_choisis:
    sortie_txt += ["", f"ÉCHEC  {titre}", f"  1ʳᵉ ligne : {premiere}"] + [f"  {l}" for l in cadre]
tot = [l for l in texte.split("\n") if re.match(r"^\s*(Test Files|Tests)\s", ANSI.sub("", l))]
sortie_txt += ["", "RÉSUMÉ DU JOURNAL ENTIER (tous les chemins du fichier) : " + " | ".join(ANSI.sub("", l).strip() for l in tot)]
open(sortie, "w", encoding="utf-8", newline="").write("\n".join(sortie_txt) + "\n")
print(f"extrait écrit : {sortie} ({len(sortie_txt)} lignes) · verts {len(verts)} · rouges {len(rouges)} · morsures par assertion {sum(1 for bl in blocs_choisis if morsure(bl[1]))}")
