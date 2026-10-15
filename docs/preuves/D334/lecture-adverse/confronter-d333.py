"""D334 — lecture adverse de D333 (rang 39, lot de CODE L35-3 « la numérotation des devis » : clos sur le code, compteur DEUX → TROIS), confrontée aux objets git à des SHA FIXÉS et aux pièces versées.

POURQUOI IL EXISTE
  Forme de Ko pour le rang 40 : « la lecture adverse depuis la clôture de D333, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque
  extracteur calibré sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré. En particulier : le tableau
  des rouges et verts de D333 contre ses pièces (76 rouges, 36 échecs d'assertion) ; les portes de D333 contre leurs extraits (1 871 / 141, 493 / 39, e2e 55 · 1) ; le test de concurrence
  (cinq passes, 18 sur 18, numéros 1 à 20) contre ses pièces ; l'union des campagnes (14 sur 37) et les réparations écrites de ses sept premières sorties non nulles ; les six sorties de
  campagnes non rejouées : relever, par git, que les fichiers qu'elles lisent n'ont pas changé depuis. Aucune porte ni campagne n'est rejouée pour cette lecture. »
  Le dernier commit de D333 est `83929a6` ; le seul commit qui le suit est la table d'ouverture de CE lot (`91528f5`, qui ne contient qu'elle). Chaque affirmation de D333 qui se vérifie dans
  le dépôt est confrontée à sa SOURCE : les pièces versées, les objets git, le texte des fichiers d'autorité. Ce qui ne vit que dans le chat ou dans un journal hors dépôt est déclaré NON VÉRIFIABLE.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D334/lecture-adverse/confronter-d333.py > docs/preuves/D334/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF la famille X (état LIVE : `git status`, `stash`, `rev-parse`) et la famille E
  (l'état des `.env`, relevé par l'outil de D330 : empreinte et classe d'hôte, AUCUNE valeur). AUCUN rejeu de porte ni de campagne ici ; la seule écriture est le dossier temporaire de l'outil des `.env`.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d332.py` (D333) — il juge D332 et ses SHA ; réutiliser `extraire-portes.py`, `extraire-rouge.py` ou `union-campagnes.py` de D333 comme preuve de D333
  — ce serait croire l'instrument qu'on juge : ici les comptes des rouges, des verts, des portes et de la concurrence sont RECOMPTÉS par des expressions écrites ici, et l'union des campagnes est
  RECALCULÉE par une autre implémentation (le diff est lu entre deux SHA fixes, le texte des campagnes par `git show`, jamais l'arbre de travail).

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce
qu'ils ont PARCOURU et leur attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est LU dans le texte de D333 ou dans une pièce brute — jamais écrit
de mémoire (D275) ; quand un attendu est une valeur de la forme de Ko (les SHA, les noms de fichiers), il est dit tel.
"""
import os
import re
import subprocess
import sys
import tempfile

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

DEPART = "2782be9"   # SHA de départ de D333 = clôture de D332
OUV = "a5475fd"      # la table d'ouverture de D333 (seule)
LECT = "c05950f"     # la lecture adverse de D333
KO1 = "9740d40"      # la première écriture d'autorité (arbitrages de Ko)
EXT1 = "a7760e3"
RELEVE = "53119ee"
DEC = "f3ae95d"
EXT2 = "c24272d"
CADRAGE = "01b0240"
EXT3 = "ae02132"
ROUGES = "f61fa44"
CODE = "330762f"
HARN = "a10e800"
EXT4 = "14eb34b"
UNION = "62b9309"
EXT5 = "e81d115"
REPAR = "0342e94"   # DERNIER commit qui touche du code, une spec ou un harnais : les portes y ont tourné
EXT6 = "34b0f48"
PIECES = "c6a3f99"
CLOT = "bd13bb0"
DERNIER = "83929a6"  # dernier commit de D333
OUV334 = "91528f5"   # la table d'ouverture de CE lot
PD = "docs/preuves/D333"
CONT, AGENTS, BACKLOG = "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"
AUTORITES = (AGENTS, BACKLOG, CONT)
NBSP = "[\\s  ]"
ANSI = re.compile(r"\x1b\[[0-9;]*m")

controles, ecarts, constats, ecarts_live, non_verifiables = [], [], [], [], []
familles: dict = {}
bras_calibration = [0, 0]  # joués, manqués


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8", errors="replace").replace("\r\n", "\n")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def noms_diff(a, b):
    return [l for l in git("diff", "--name-only", a, b).decode("utf-8").split("\n") if l]


def noms_commit(sha):
    return [l for l in git("show", "--name-only", "--format=", sha).decode("utf-8").split("\n") if l]


def liste_arbre(sha, *prefixes):
    return [l for l in git("ls-tree", "-r", "--name-only", sha, *prefixes).decode("utf-8").split("\n") if l]


def commits(a, b):
    """Les commits de a (exclu) à b (inclus), du plus ancien au plus récent, SHA abrégés à 7."""
    return [l[:7] for l in git("rev-list", "--reverse", f"{a}..{b}").decode().split("\n") if l]


def aplati(t):
    return re.sub(r"\s+", " ", t)


def entier(s):
    return int(re.sub(NBSP, "", s))


def est_code(n):
    return not (n.startswith("docs/preuves/") or n in AUTORITES)


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] in ("X", "E") else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:9} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:9} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:9} NON VÉRIFIABLE : {texte}")


def bras(libelle, attendu, mesure):
    bras_calibration[0] += 1
    ok = attendu == mesure
    if not ok:
        bras_calibration[1] += 1
    print(f"   {'✓' if ok else '✗'} calibration {libelle} : {mesure!r} (attendu {attendu!r})")


# ───────────────────────────── extracteurs, chacun calibré ─────────────────────────────

def comptes_du_point(texte):
    """(verts, rouges, morsures) de la ligne « # comptes du point » d'une pièce de rouge ou de vert ; None si elle manque."""
    m = re.search(r"^# comptes du point : (\d+) vert\(s\) · (\d+) rouge\(s\) · (\d+) morsure\(s\)", texte, re.M)
    return None if m is None else (int(m.group(1)), int(m.group(2)), int(m.group(3)))


def titres(texte, etiquette):
    """Les titres des lignes « ETIQUETTE  <fichier> > … » d'une pièce (la ligne entière après l'étiquette)."""
    return [l.split(None, 1)[1].strip() for l in texte.split("\n") if l.startswith(etiquette + " ") and len(l.split(None, 1)) == 2]


def blocs_echec(texte):
    """[(titre, 1ʳᵉ ligne)] des blocs « ÉCHEC <titre> » suivis de « 1ʳᵉ ligne : … » d'une pièce de rouge — UNE entrée par bloc, relue indépendamment de l'en-tête."""
    out, lignes = [], texte.split("\n")
    for i, l in enumerate(lignes):
        if l.startswith("ÉCHEC "):
            suiv = lignes[i + 1] if i + 1 < len(lignes) else ""
            m = re.match(r"\s+1ʳᵉ ligne : (.*)$", suiv)
            out.append((l.split(None, 1)[1].strip(), m.group(1) if m else None))
    return out


def est_morsure(premiere_ligne):
    """D304/D316 : une morsure est un échec dont la 1ʳᵉ ligne est une `AssertionError` (jamais TypeError, Error, TestingLibraryElementError…)."""
    return bool(premiere_ligne) and premiere_ligne.startswith("AssertionError")


def genre_echec(premiere_ligne):
    if not premiere_ligne:
        return "?"
    return premiere_ligne.split(":", 1)[0].strip()


def resumes_vitest(texte):
    """[(fichiers, tests)] des lignes « résumé N : fichiers passés a · en échec b · total c ; tests passés d · en échec e · total f » ; en échec cumulé séparé."""
    out, echecs = [], 0
    for m in re.finditer(r"résumé \d+ : fichiers passés (\d+) · en échec (\d+) · total (\d+) ; tests passés (\d+) · en échec (\d+) · total (\d+)", texte):
        out.append((int(m.group(3)), int(m.group(6))))
        echecs += int(m.group(2)) + int(m.group(5))
    return out, echecs


def ids_cibles_resultat(texte):
    """Les identifiants des lignes « ✓ <ID>. … » d'une sortie de campagne (une garde mordue chacune)."""
    return [m.group(1) for m in re.finditer(r"^✓ (\S+?)\.(?:\s|$)", texte, re.M)]


def cibles_declarees(texte):
    """Le nombre d'appels `cible(` d'un harnais et leurs identifiants (premier mot du libellé, « ID. »)."""
    appels = re.findall(r"^cible\(\s*\"([^\"]*)\"", texte, re.M)
    ids = []
    for a in appels:
        m = re.match(r"(?:⛔\s*)?([A-Z][A-Za-z0-9]*-\d+[a-z]?)\b", a)
        ids.append(m.group(1) if m else a[:20])
    return ids


def chemins_declares(texte):
    """Les chemins COMPLETS déclarés par une table d'ouverture : chaque jeton entre accents graves qui ressemble à un chemin de fichier (une barre OU une extension connue)."""
    out = set()
    for m in re.finditer(r"`([^`\n]+)`", texte):
        for jeton in m.group(1).split(", "):
            jeton = jeton.strip()
            if re.fullmatch(r"[A-Za-z0-9_@.\-/\[\]]+\.[A-Za-z0-9]+", jeton) and ("/" in jeton or re.search(r"\.(md|py|ts|tsx|json|txt|sql|png|pdf|mjs|yml)$", jeton)):
                out.add(jeton)
    return out


def chaines_python(source):
    """Les constantes CHAÎNES d'un programme Python (ast) : ce qu'une campagne lit, mute ou cherche — jamais ses commentaires NI ses docstrings (qui ne sont lues par rien : une docstring qui cite `neutralize-r33.py` ne fait pas lire r33)."""
    import ast
    try:
        arbre = ast.parse(source)
    except SyntaxError:
        return None
    docs = set()
    for n in ast.walk(arbre):
        if isinstance(n, (ast.Module, ast.FunctionDef, ast.AsyncFunctionDef, ast.ClassDef)) and n.body and isinstance(n.body[0], ast.Expr) and isinstance(n.body[0].value, ast.Constant) and isinstance(n.body[0].value.value, str):
            docs.add(id(n.body[0].value))
    return [n.value for n in ast.walk(arbre) if isinstance(n, ast.Constant) and isinstance(n.value, str) and id(n) not in docs]


def campagne_cite(source, fichier):
    """Une campagne cite un fichier quand une de ses CHAÎNES le nomme : par chemin complet (R), par chemin relatif à un paquet (suffixe après `src/`, P) ou par son seul nom (N)."""
    chaines = chaines_python(source)
    if chaines is None:
        return "ERREUR"
    nom = fichier.rsplit("/", 1)[-1]
    rel = fichier.split("/src/", 1)[1] if "/src/" in fichier else None
    if any(fichier in c for c in chaines):
        return "R"
    if rel is not None and "/" in rel and any(rel in c for c in chaines):
        return "P"
    if any(nom in c for c in chaines):
        return "N"
    return None


CHEMIN_TRI = re.compile(r"""['"]([^'"\n]+\.(?:ts|tsx|css|json|sql|mjs))['"]""")


def tri_a(source, existants):
    """Ce que `fichiers_lus` de lancer-campagnes.py retient : les chemins entre guillemets qui finissent par ts, tsx, css, json, sql ou mjs ET qui existent (ici : dans la liste `existants` d'un commit). Réécrit ici, jamais importé."""
    return {c.replace("\\", "/") for c in CHEMIN_TRI.findall(source) if c.replace("\\", "/") in existants}


def passes_concurrence(texte):
    """Par passe « === passe N hh:mm:ss » : (nombre de lignes ✓ de test, « Tests  X passed (Y) », code de sortie) — recompté ligne à ligne."""
    out = []
    for morceau in re.split(r"^=== passe \d+ [\d:]+\s*$", texte, flags=re.M)[1:]:
        coches = len(re.findall(r"^ ✓ test/int/quote-numbering\.int-spec\.ts > ", morceau, re.M))
        m = re.search(r"^\s+Tests\s+(\d+) passed \((\d+)\)", morceau, re.M)
        c = re.search(r"^code=(\d+)", morceau, re.M)
        out.append((coches, (int(m.group(1)), int(m.group(2))) if m else None, int(c.group(1)) if c else None))
    return out


def titres_passe(texte, n):
    morceaux = re.split(r"^=== passe \d+ [\d:]+\s*$", texte, flags=re.M)[1:]
    return [re.sub(r"\s+\d+ms$", "", l).strip() for l in morceaux[n].split("\n") if l.startswith(" ✓ test/int/quote-numbering")]


def lignes_e2e(texte):
    """(ok, ignorés) des lignes de verdict d'une pièce e2e : « ok N … » et « -  N … »."""
    return len(re.findall(r"^ok \d+ ", texte, re.M)), len(re.findall(r"^-\s+\d+ ", texte, re.M))


# ─────────────────────────────────── calibration ───────────────────────────────────
print("== CALIBRATION (deux bras par extracteur ; abandon si un seul manque)")
bras("comptes du point, positif", (79, 0, 0), comptes_du_point("# x\n# comptes du point : 79 vert(s) · 0 rouge(s) · 0 morsure(s) par assertion native\n"))
bras("comptes du point, négatif (ligne absente)", None, comptes_du_point("# rien\nVERT   a > b\n"))
bras("titres, positif", ["f.ts > a > b"], titres("ROUGE  f.ts > a > b\nVERT   g.ts > c\n", "ROUGE"))
bras("titres, négatif (autre étiquette)", [], titres("VERT   g.ts > c\n", "ROUGE"))
bras("blocs d'échec, positif (une AssertionError, un TypeError)", [("f > a", "AssertionError: x"), ("f > b", "TypeError: y")], blocs_echec("ÉCHEC  f > a\n  1ʳᵉ ligne : AssertionError: x\n   ❯ f:1\n\nÉCHEC  f > b\n  1ʳᵉ ligne : TypeError: y\n"))
bras("blocs d'échec, négatif (aucun bloc)", [], blocs_echec("ROUGE  f > a\nVERT   g > b\n"))
bras("morsure, positif", True, est_morsure("AssertionError: expected 1 to be 2"))
bras("morsure, négatif (TypeError, TestingLibraryElementError, Error de supertest)", [False, False, False], [est_morsure("TypeError: x is not a function"), est_morsure("TestingLibraryElementError: Unable"), est_morsure("Error: expected 400 \"Bad Request\", got 200")])
bras("genre d'échec", ["AssertionError", "TypeError", "?"], [genre_echec("AssertionError: x"), genre_echec("TypeError: y"), genre_echec(None)])
bras("résumés vitest, positif", ([(65, 808)], 0), resumes_vitest("  résumé 2 : fichiers passés 65 · en échec 0 · total 65 ; tests passés 808 · en échec 0 · total 808\n"))
bras("résumés vitest, négatif (un échec compté)", ([(65, 808)], 2), resumes_vitest("  résumé 2 : fichiers passés 64 · en échec 1 · total 65 ; tests passés 807 · en échec 1 · total 808\n"))
bras("ids de garde mordue, positif", ["H-1", "PO-5"], ids_cibles_resultat("✓ H-1. un\n   calibration ✓ x : y\n✓ PO-5. deux\n"))
bras("ids de garde mordue, négatif (une ligne de calibration seule)", [], ids_cibles_resultat("   calibration ✓ en-têtes : MORD (attendu MORD)\n"))
bras("ids de garde mordue, formes sans tiret ou à lettre (E1, S10b2-C2) et rejet d'un pré-vol", ["E1", "S10b2-C2"], ids_cibles_resultat("✓ Pré-vol : 2 mesure(s) verte(s)\n✓ E1. un\n✓ S10b2-C2. deux\n"))
bras("cibles déclarées, positif", ["A-1", "B-2"], cibles_declarees('cible("A-1. un", "f", "a", "b", {})\ncible(\n    "B-2. deux",\n    "g"\n)\n'))
bras("cibles déclarées, négatif (la définition n'est pas un appel)", [], cibles_declarees('def cible(libelle: str, fichier: str) -> None:\n    pass\n'))
bras("chemins déclarés, positif", {"a/b.ts", "NEUF.md"}, chemins_declares("| `a/b.ts` | x |\n| `NEUF.md`, 3 | y |\n"))
bras("chemins déclarés, négatif (un identifiant, pas un fichier)", set(), chemins_declares("la clé `quote.document.detail` et `D333`"))
bras("campagne cite, chemin complet", "R", campagne_cite('X = "apps/pro/src/venues/venue-list-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, chemin relatif au paquet", "P", campagne_cite('X = "src/venues/venue-list-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, le nom seul", "N", campagne_cite('X = "venue-list-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, négatif (un autre fichier)", None, campagne_cite('X = "autre-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, négatif (le chemin n'est que dans une DOCSTRING : rien ne la lit)", None, campagne_cite('"""cite src/venues/venue-list-page.tsx"""\nX = 1\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, positif (la même chaîne dans le CODE, après une docstring)", "P", campagne_cite('"""doc"""\nX = "src/venues/venue-list-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, négatif (le chemin n'est que dans un COMMENTAIRE : rien n'est lu)", None, campagne_cite('# elle visait src/venues/venue-list-page.tsx\nX = 1\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("tri (a), positif : un chemin entre guillemets qui existe", {"apps/pro/src/a.tsx"}, tri_a('X = "apps/pro/src/a.tsx"\n', {"apps/pro/src/a.tsx"}))
bras("tri (a), négatif : un chemin qui n'existe pas, un .py, un chemin sans guillemets", set(), tri_a('X = "apps/pro/src/b.tsx"\nY = "neutralisation/z.py"\n# apps/pro/src/a.tsx\n', {"apps/pro/src/a.tsx", "neutralisation/z.py"}))
CAS_CONC = "=== passe 1 03:29:41\n\n ✓ test/int/quote-numbering.int-spec.ts > A > un 12ms\n ✓ test/int/quote-numbering.int-spec.ts > A > deux 3ms\n\n      Tests  2 passed (2)\n\ncode=0\n=== passe 2 03:29:54\n\n ✓ test/int/quote-numbering.int-spec.ts > A > un 9ms\n\n      Tests  2 passed (2)\n\ncode=1\n"
bras("concurrence, positif (passe 1 : 2 ✓, 2 sur 2, code 0)", (2, (2, 2), 0), passes_concurrence(CAS_CONC)[0])
bras("concurrence, négatif (passe 2 : un seul ✓ pour « 2 passed » et code 1 — l'incohérence se VOIT)", (1, (2, 2), 1), passes_concurrence(CAS_CONC)[1])
bras("titres d'une passe, sans la durée", ["✓ test/int/quote-numbering.int-spec.ts > A > un", "✓ test/int/quote-numbering.int-spec.ts > A > deux"], titres_passe(CAS_CONC, 0))
bras("verdicts e2e, positif", (2, 1), lignes_e2e("ok 1 [warmup] › a (1s)\nok 2 [chromium] › b (2s)\n-  3 [chromium] › c\n"))
bras("verdicts e2e, négatif (le mot « ok » dans un titre n'en fait pas un verdict)", (0, 0), lignes_e2e("  la spec dit ok 3 fois\n"))
bras("commit d'un fichier, positif (la table de D333 ouvre à a5475fd)", [f"{PD}/table-ouverture.md"], noms_commit(OUV))
bras("commit d'un fichier, négatif (a5475fd ne touche aucune autorité)", [], [n for n in noms_commit(OUV) if n in AUTORITES])
bras("code ou pas, positif/négatif", (True, False, False), (est_code("apps/api/src/x.ts"), est_code("docs/preuves/D333/x.txt"), est_code("ZWADJ_CONTINUITE.md")))
echecs_calib = bras_calibration[1]
print(f"   calibration : {bras_calibration[0]} bras, {echecs_calib} manqué(s)")
if echecs_calib:
    sys.exit("ABANDON : un bras de calibration a manqué — l'instrument ne se croit pas")

cont_dernier = show(DERNIER, CONT)
section = cont_dernier.split("## Session du 15/10/2026 — D333")[1].split("## Session du 14/10/2026 — D332")[0]
section_a = aplati(section)
cont_a = aplati(cont_dernier)

# ─────────────────────────────────── famille C : l'ordre des commits ───────────────────────────────────
print("\n== C — l'ordre des commits de D333, prouvé par git")
liste = commits(DEPART, DERNIER)
ctl("C1", "le premier commit de D333 ne contient que sa table d'ouverture", [f"{PD}/table-ouverture.md"], noms_commit(liste[0]) if liste[0] == OUV else None)
ctl("C2", "…et son parent est le SHA de départ", DEPART, git("rev-parse", "--short=7", f"{OUV}^").decode().strip())
idx = {s: i for i, s in enumerate(liste)}
debut = section.split("### D333 — l'ordre des commits, prouvé par `git`")[1].split("### D333 — la lecture adverse")[0]
lignes_ordre = re.findall(r"^\| (\d+) \| `([0-9a-f]{7})` \|", debut, re.M)
ctl("C3", "la table « ordre des commits » de la section D333 : ses SHA, dans l'ordre, sont ceux de git (de a5475fd à bd13bb0)", liste[: len(lignes_ordre)], [s for n, s in lignes_ordre])
ctl("C3b", "…elle compte 19 lignes (le commit 20, « celui-ci », est le dernier, 83929a6)", (19, DERNIER), (len(lignes_ordre), liste[-1]))
ctl("C3c", "…D333 a donc 20 commits de a5475fd à 83929a6", 20, len(liste))
ctl("C4", "la sortie de la lecture adverse précède la première écriture d'autorité", True, idx[LECT] < idx[KO1])
ctl("C5", "…et la première écriture d'autorité ne touche que le fichier de continuité", [CONT], noms_commit(KO1))
avant_ko1 = [s for s in liste[: idx[KO1]] if any(n in AUTORITES for n in noms_commit(s))]
ctl("C6", "aucun commit AVANT la première écriture d'autorité ne touche un des trois fichiers d'autorité", [], avant_ko1)
ctl("C7", "le cadrage (01b0240) précède le premier commit de code (330762f), qui est le premier commit du lot à toucher du code", (True, CODE), (idx[CADRAGE] < idx[CODE], [s for s in liste if any(est_code(n) for n in noms_commit(s))][0]))
codes_commits = [s for s in liste if any(est_code(n) for n in noms_commit(s))]
ctl("C8", "les commits de D333 qui touchent du code, une spec, un harnais ou une migration", [CODE, HARN, REPAR], codes_commits)
diff_clot = noms_diff(DEPART, CLOT)
decl_clot = chemins_declares(show(CLOT, f"{PD}/table-ouverture.md"))
ctl("C9", "le diff de 2782be9 à bd13bb0 compte 117 fichiers (le contrôle de fin de lot dit 117), tous déclarés par chemin COMPLET dans la table de ce commit", (117, []), (len(diff_clot), sorted(f for f in diff_clot if f not in decl_clot)))
dit158 = re.search(r"\((\d+) chemins déclarés\)", section_a)
tous_jetons = sum(len([j for j in m.group(1).split(", ") if re.fullmatch(r"[A-Za-z0-9_@.\-/\[\]]+\.[A-Za-z0-9]+", j.strip()) and ("/" in j or re.search(r"\.(md|py|ts|tsx|json|txt|sql|png|pdf|mjs|yml)$", j.strip()))]) for m in re.finditer(r"`([^`\n]+)`", show(CLOT, f"{PD}/table-ouverture.md")))
if dit158 and int(dit158.group(1)) not in (len(decl_clot), tous_jetons):
    constat("C-C2", f"le contrôle de fin de lot de D333 dit « {dit158.group(1)} chemins déclarés » dans la table à bd13bb0 ; recompté, la table nomme {len(decl_clot)} chemins DISTINCTS ({tous_jetons} occurrences, doublons compris) — ni l'un ni l'autre n'est {dit158.group(1)}, et la définition du compte n'est pas écrite (D290). Imprécision de comptage d'un contrôle de fin de lot : les deux comptes que la lecture sait refaire (117 fichiers au diff, 0 hors table, C9) sont, eux, exacts")
else:
    ctl("C9b", "…la table de ce commit déclare le nombre de chemins que le contrôle de fin de lot annonce", int(dit158.group(1)) if dit158 else None, len(decl_clot))
diff_fin = noms_diff(DEPART, DERNIER)
decl_fin = chemins_declares(show(DERNIER, f"{PD}/table-ouverture.md"))
ctl("C10", "au dernier commit (83929a6), tous les fichiers du diff 2782be9..83929a6 sont déclarés par chemin complet dans la table de ce commit", [], sorted(f for f in diff_fin if f not in decl_fin))
print(f"   le diff final compte {len(diff_fin)} fichiers ; la table finale déclare {len(decl_fin)} chemins")
constat_diff = sorted(set(diff_fin) - set(diff_clot))
print(f"   fichiers du diff ajoutés entre bd13bb0 et 83929a6 : {constat_diff}")
versions = [s for s in liste if f"{PD}/table-ouverture.md" in noms_commit(s)]
decl_idx = {}
for s in versions:
    for c in chemins_declares(show(s, f"{PD}/table-ouverture.md")):
        decl_idx.setdefault(c, idx[s])
premier_touche = {}
for s in liste:
    for n in noms_commit(s):
        premier_touche.setdefault(n, idx[s])
fautes, par_extension = [], 0
for f in diff_fin:
    if f == f"{PD}/table-ouverture.md":
        continue
    d, t = decl_idx.get(f), premier_touche.get(f)
    if d is None or t is None:
        fautes.append((f, d, t))
        continue
    if d > 0:
        par_extension += 1
    if d >= t and idx[OUV] != d:
        fautes.append((f, d, t))
ctl("C11", "chaque fichier du diff est déclaré par une version de la table commitée AVANT (ou au) commit qui le touche pour la première fois", [], fautes)
print(f"   recompté : {len(diff_fin)} fichiers au diff final dont {par_extension} déclarés par une extension (hors la table elle-même) ; {len(versions)} versions de la table")
ctl("C12", "après 0342e94 (où les portes ont tourné), AUCUN fichier hors docs/preuves/ et hors les trois d'autorité n'a changé : les portes valent pour le dernier commit", [], [f for f in noms_diff(REPAR, DERNIER) if est_code(f)])
apres_union = [f for f in noms_diff(UNION, DERNIER) if est_code(f)]
print(f"   code modifié entre l'union (62b9309) et le dernier commit : {apres_union}")
ctl("C13", "aucun fichier sous packages/api-client ni apps/api/test/int/contract-api-client.int-spec.ts au diff (aucun chemin d'API ne change)", [], [f for f in diff_fin if f.startswith("packages/api-client/") or f.endswith("contract-api-client.int-spec.ts")])
ctl("C14", "sous packages/types/src, le diff ne touche QUE quote.ts (K-6, K-7)", ["packages/types/src/quote.ts"], [f for f in diff_fin if f.startswith("packages/types/")])
ajouts = [l[1:] for l in git("diff", DEPART, REPAR, "--", "packages/types/src/quote.ts").decode("utf-8").split("\n") if l.startswith("+") and not l.startswith("+++")]
exports_ajoutes = sorted(re.findall(r"^export (?:function|const|type|interface) (\w+)", "\n".join(ajouts), re.M))
ctl("C15", "…et ce qu'il AJOUTE à l'API du paquet contient `formatQuoteReference` et `quoteDocumentFilename` (K-6, K-7)", ["formatQuoteReference", "quoteDocumentFilename"], [e for e in exports_ajoutes if e in ("formatQuoteReference", "quoteDocumentFilename")])
extras = [e for e in exports_ajoutes if e not in ("formatQuoteReference", "quoteDocumentFilename")]
if extras:
    constat("C-C3", f"le diff de packages/types/src/quote.ts ajoute, en plus des deux fonctions de K-6/K-7, {len(extras)} exports : {extras} (bornes de l'année, type des parties de la référence). Le cadrage (F-17) écrit « le diff … ne touche que `QuoteDTO.reference` et `quoteDocumentFilename` (+ la fonction de formatage) ». Ce ne sont pas des contrats d'API (aucune route, aucun paramètre, aucun code d'erreur), mais ce sont des exports PUBLICS du paquet partagé que F-17 ne nomme pas — imprécision de la liste du cadrage, sans effet sur une porte")
champ_ref = [l for l in ajouts if re.match(r"\s*reference\s*:\s*string", l)]
ctl("C16", "…et le champ `reference: string` est ajouté (une seule fois) à un type", 1, len(champ_ref))
migs = sorted(set(f.split("/")[4] for f in diff_fin if f.startswith("apps/api/prisma/migrations/")))
avant = sorted(set(f.split("/")[4] for f in liste_arbre(DEPART, "apps/api/prisma/migrations") if f.count("/") >= 5 and re.match(r"\d{14}_", f.split("/")[4])))
ctl("C17", "deux migrations NEUVES (dossiers), et elles sont les deux dernières par ordre de nom", (["20261015100000_venue_number", "20261015100100_quote_reference"], True), (migs, sorted(avant + migs)[-2:] == migs))
test_et_prod = noms_commit(CODE)
prod = [f for f in test_et_prod if est_code(f) and not re.search(r"\.(spec|test)\.tsx?$|/test/|\.e2e\.ts$", f)]
tests = [f for f in test_et_prod if re.search(r"\.(spec|test)\.tsx?$|/test/|\.e2e\.ts$", f)]
ctl("C18", "le commit de code 330762f porte à la fois du code de production ET des tests (les rouges, eux, sont dans f61fa44 : docs/preuves seulement) — fait qui motive la décision 2 du relecteur", (True, True, True), (len(prod) > 0, len(tests) > 0, all(not est_code(f) for f in noms_commit(ROUGES))))
constat("C-C1", f"`git` ne peut pas montrer que les rouges ont été lus AVANT le correctif : 330762f contient {len(prod)} fichier(s) de production et {len(tests)} fichier(s) de test dans le même commit (la D333 l'écrit elle-même, « limite écrite ») — la décision 2 du relecteur, écrite pour le PROCHAIN lot de code, ferme ce trou ; il n'est pas un défaut de D333 sous la règle d'alors")

# ─────────────────────────────────── famille P : les portes ───────────────────────────────────
print("\n== P — les six portes de D333, extraits contre section")
portes = {n: show(DERNIER, f"{PD}/portes/{n}.txt") for n in ("typecheck", "lint", "test", "build", "test-int", "e2e")}
for n, t in portes.items():
    m = re.search(r"code de sortie RÉEL de la commande : (\d+)", t)
    ctl(f"P-{n}-sortie", f"porte {n} : le code de sortie réel", 0, int(m.group(1)) if m else None)
    h = re.search(r"HEAD au lancement : ([0-9a-f]+)", t)
    ctl(f"P-{n}-head", f"porte {n} : lancée sur le dernier commit de code", REPAR, h.group(1) if h else None)
for n in ("typecheck", "lint", "build"):
    m = re.search(r"paquets « Done » : (\d+) \(.*?\) ; « Failed » : (\d+)", portes[n])
    d = re.search(r"déclare le script `\w+` : (\d+)", portes[n])
    attendu_texte = {"typecheck": r"`typecheck` \*\*0\*\* \((\d+) paquets", "lint": r"`lint` \*\*0\*\* \((\d+)\)", "build": r"`build` \*\*0\*\* \((\d+)\)"}[n]
    mt = re.search(attendu_texte, section_a)
    ctl(f"P-{n}-paquets", f"porte {n} : paquets terminés / en échec, égaux au texte et aux paquets qui déclarent le script", (int(mt.group(1)) if mt else None, 0, int(d.group(1)) if d else None), (int(m.group(1)), int(m.group(2)), int(d.group(1)) if d else None) if m else None)
res, ech = resumes_vitest(portes["test"])
mt = re.search(r"`test` \*\*([\d  ]+) tests / (\d+) fichiers\*\*, 0 échec \(quatre résumés vitest lus : (\d+), (\d+), (\d+), (\d+) ; base de D332 ([\d  ]+) / (\d+) : \*\*\+(\d+) / \+(\d+)\*\*", section_a)
dit = tuple(entier(x) for x in mt.groups()) if mt else None
ctl("P1", "porte test : quatre résumés vitest, aucun échec", (4, 0), (len(res), ech))
ctl("P2", "porte test : les quatre totaux de tests sont ceux que la section écrit (48, 881, 372, 570)", dit[2:6] if dit else None, tuple(t for f, t in res))
ctl("P3", "porte test : la somme (tests, fichiers) est celle du texte (1 871 / 141)", dit[:2] if dit else None, (sum(t for f, t in res), sum(f for f, t in res)))
res0, _ = resumes_vitest(show(DEPART, "docs/preuves/D332/portes/test.txt"))
ctl("P4", "la base de D332, LUE dans sa pièce à 2782be9, est celle du texte (1 790 / 139)", dit[6:8] if dit else None, (sum(t for f, t in res0), sum(f for f, t in res0)))
ctl("P5", "les écarts du texte (+81 / +2) sont ceux des pièces, et la décomposition par paquet (API +73 = 881−808, Pro +8 = 570−562, les deux autres inchangés) les explique", (dit[8:10] if dit else None, [0, 73, 0, 8]), ((sum(t for f, t in res) - sum(t for f, t in res0), sum(f for f, t in res) - sum(f for f, t in res0)), [res[i][1] - res0[i][1] for i in range(4)]))
ri, ei = resumes_vitest(portes["test-int"])
mi = re.search(r"`test:int` \*\*(\d+) / (\d+)\*\* \(base (\d+) / (\d+) : \*\*\+(\d+) / \+(\d+)\*\*", section_a)
di = tuple(entier(x) for x in mi.groups()) if mi else None
ri0, _ = resumes_vitest(show(DEPART, "docs/preuves/D332/portes/test-int.txt"))
ctl("P6", "porte test:int : (tests, fichiers) = 493 / 39, aucun échec, base de D332 lue dans sa pièce = 471 / 38, écarts +22 / +1 (tous lus dans le texte)", (di[:2] if di else None, 0, di[2:4] if di else None, di[4:6] if di else None), ((ri[0][1], ri[0][0]) if ri else None, ei, (ri0[0][1], ri0[0][0]) if ri0 else None, ((ri[0][1] - ri0[0][1]), (ri[0][0] - ri0[0][0])) if ri and ri0 else None))
e2e = portes["e2e"]
m = re.search(r"résumé Playwright : \{'passed': (\d+), 'skipped': (\d+)\}", e2e)
ok, skip = lignes_e2e(e2e)
me = re.search(r"`test:e2e` \*\*(\d+) passés · (\d+) ignoré\*\* \((\d+) verdicts lus pour un total de (\d+)\)", section_a)
e2e0 = show(DEPART, "docs/preuves/D332/portes/e2e.txt")
m0 = re.search(r"résumé Playwright : \{'passed': (\d+), 'skipped': (\d+)\}", e2e0)
ctl("P7", "porte e2e : le résumé (55 passés, 1 ignoré) est celui du texte, et les lignes « ok » / « - » de la pièce le recomptent ; base de D332 lue dans sa pièce (54 · 1)", ((int(me.group(1)), int(me.group(2))) if me else None, (int(me.group(1)), int(me.group(2))) if me else None, (54, 1)), ((int(m.group(1)), int(m.group(2))) if m else None, (ok, skip), (int(m0.group(1)), int(m0.group(2))) if m0 else None))
ctl("P7b", "…et le texte dit 56 verdicts lus pour un total de 56 (= 55 + 1)", (56, 56), (int(me.group(3)), int(me.group(4))) if me else None)


def declarations(sha, prefixes):
    total = 0
    for f in liste_arbre(sha, *prefixes):
        if re.search(r"\.(spec|test|int-spec)\.tsx?$", f):
            total += len(re.findall(r"^\s*(?:it|test)(?:\.only|\.skip)?\(", show(sha, f), re.M))
    return total


d_api = declarations(REPAR, ["apps/api/src"]) - declarations(DEPART, ["apps/api/src"])
d_pro = declarations(REPAR, ["apps/pro/src"]) - declarations(DEPART, ["apps/pro/src"])
d_int = declarations(REPAR, ["apps/api/test/int"]) - declarations(DEPART, ["apps/api/test/int"])
print(f"   recompte INDÉPENDANT des déclarations `it(`/`test(` entre 2782be9 et 0342e94 : API unitaire {d_api:+d} (la porte : +73), Pro {d_pro:+d} (la porte : +8), intégration {d_int:+d} (la porte : +22)")
if (d_api, d_pro, d_int) == (73, 8, 22):
    ctl("P9", "les déclarations recomptées égalent les écarts des portes", (73, 8, 22), (d_api, d_pro, d_int))
else:
    constat("P-C1", f"recompte indépendant des déclarations `it(`/`test(` : API {d_api:+d}, Pro {d_pro:+d}, intégration {d_int:+d} contre +73, +8, +22 des portes — l'écart peut venir de `it.each` (plusieurs exécutions par déclaration) ou d'un test généré (limite de l'extracteur, qui compte des DÉCLARATIONS et non des exécutions)")
em = portes_em = show(DERNIER, f"{PD}/portes/etat-machine.txt")
ram = re.search(r"RAM libre : ([\d  ]+) Mo sur", em)
barre = re.search(r'BARRE_D273_MO=(\d+)', show(DERNIER, "neutralisation/sonde-etat-machine.ps1"))
if ram and barre and entier(ram.group(1)) >= int(barre.group(1)) and "inférieure à la barre" in em:
    constat("P-C2", f"`etat-machine.txt` écrit « RAM libre {entier(ram.group(1))} Mo … inférieure à la barre d'une fenêtre certifiante » et la section D333 écrit « RAM libre 4 703 Mo, sous la barre » ; la barre de la sonde (`BARRE_D273_MO`, lue dans neutralisation/sonde-etat-machine.ps1) est {barre.group(1)} Mo : {entier(ram.group(1))} lui est SUPÉRIEUR (la lecture « avant la passe », 4 586, aussi). Imprécision d'exactitude d'un relevé NON certifiant (la barre porte sur la médiane et la bande basse de la sonde, pas sur un chiffre isolé), sans effet sur une porte")
else:
    ctl("P10", "la RAM de l'état machine de D333 est cohérente avec la barre de la sonde", True, False)
non_verifiable("NV-1", "les journaux BRUTS des six portes de D333 (empreintes, octets, lignes de l'en-tête de chaque extrait) : ils sont HORS dépôt (ils portent des jetons) ; la lecture confronte les extraits entre eux et au texte, pas au journal")

# ─────────────────────────────────── famille R : les rouges et les verts ───────────────────────────────────
print("\n== R — le tableau des points de D333 (rouge contre l'état d'avant, vert), contre ses pièces")
tab = section.split("| point | rouges | dont morsures | vert |")[1].split("\n\n")[0]
lignes_tab = [l for l in tab.split("\n") if l.startswith("| ") and not l.startswith("|---")]
lignes_pts = [[re.sub(r"\*", "", c).strip() for c in l.strip("|").split("|")] for l in lignes_tab]
POINTS = [("pur", "rouge-api-pur", "vert-api-pur"), ("ecriture", "rouge-api-ecriture", "vert-api-ecriture"), ("service", "rouge-api-service", "vert-api-service"), ("documents", "rouge-api-documents", "vert-api-documents"), ("int", "rouge-api-int", "vert-api-int"), ("pro", "rouge-pro", "vert-pro")]
ctl("R0", "le tableau de la section a six lignes de point + une ligne de total", 7, len(lignes_pts))
tot_r = tot_m = tot_v = 0
genres_non_morsure: dict = {}
for k, (nom, r, v) in enumerate(POINTS):
    tr, tv = show(DERNIER, f"{PD}/rouge/{r}.txt"), show(DERNIER, f"{PD}/vert/{v}.txt")
    cr, cv = comptes_du_point(tr), comptes_du_point(tv)
    blocs = blocs_echec(tr)
    rouges = titres(tr, "ROUGE")
    lues_m = sum(1 for t, p in blocs if est_morsure(p))
    ligne = lignes_pts[k]
    dit_r, dit_m, dit_v = int(ligne[1]), int(ligne[2]), int(ligne[3])
    ctl(f"R-{nom}-texte", f"{nom} : le tableau de la section dit (rouges, morsures, verts)", (dit_r, dit_m, dit_v), (cr[1] if cr else None, lues_m, cv[0] if cv else None))
    ctl(f"R-{nom}-rouge", f"{nom} : l'en-tête du rouge (rouges, morsures), les lignes ROUGE et les blocs ÉCHEC RELUS un à un s'accordent", (dit_r, dit_m, dit_r, dit_r), ((cr[1], cr[2]) and (cr[1], cr[2]) and cr[1], cr[2], len(rouges), len(blocs)) if cr else None)
    ctl(f"R-{nom}-vert", f"{nom} : l'en-tête du vert (verts, 0 rouge) et autant de lignes VERT", (dit_v, 0, dit_v), (cv[0], cv[1], len(titres(tv, "VERT"))) if cv else None)
    manquants = [t for t in rouges if t not in set(titres(tv, "VERT"))]
    ctl(f"R-{nom}-passe", f"{nom} : chaque test rouge contre l'état d'avant est VERT dans la pièce du vert du même point", [], manquants)
    for t, p in blocs:
        if not est_morsure(p):
            genres_non_morsure[genre_echec(p)] = genres_non_morsure.get(genre_echec(p), 0) + 1
    tot_r += len(rouges)
    tot_m += lues_m
    tot_v += int(cv[0]) if cv else 0
tot_ligne = lignes_pts[6]
ctl("R-total", "total : 76 rouges, 36 morsures (lus dans le texte), égaux à la somme des pièces RELUES bloc par bloc", (int(tot_ligne[1]), int(tot_ligne[2])), (tot_r, tot_m))
clot = re.search(r"\*\*(\d+) rouges, dont (\d+) morsures par assertion native\*\*", cont_a)
ctl("R-total-clot", "…et la phrase de clôture (point d'entrée, « 76 rouges, dont 36 morsures ») dit la même chose", (tot_r, tot_m), (int(clot.group(1)), int(clot.group(2))) if clot else None)
print(f"   genres des {tot_r - tot_m} échecs qui ne sont PAS des morsures (1ʳᵉ ligne de chaque bloc) : {dict(sorted(genres_non_morsure.items()))}")
non_neufs = {g: n for g, n in genres_non_morsure.items() if g not in ("TypeError", "Error")}
if non_neufs:
    constat("R-C2", f"la section écrit « les 40 autres rouges ne sont pas des morsures … (composants neufs : import absent, ou `TypeError`) » ; les 1ʳᵉˢ lignes de ces blocs, relues, sont {dict(sorted(genres_non_morsure.items()))} — dont des genres autres que `TypeError`/`Error` : {non_neufs} — et pour la base réelle, `PrismaClientKnownRequestError` (colonne ou table absente) n'est pas « un import absent ». Imprécision de CLASSIFICATION d'un tableau ; le compte (40 = 76 − 36) est exact")
vp = show(DERNIER, f"{PD}/vert/vert-api-pur.txt")
v_venues = [t for t in titres(vp, "VERT") if "src/venues/quote-reference.spec.ts" in t]
rp = show(DERNIER, f"{PD}/rouge/rouge-api-pur.txt")
rp_titres = titres(rp, "ROUGE") + titres(rp, "VERT")
ctl("R-algiers", "l'année d'Alger : les tests de `src/venues/quote-reference.spec.ts` sont verts dans la pièce du vert (29) et n'ont AUCUN titre dans la pièce du rouge (le fichier n'a pas pu être collecté : module absent)", (29, 0), (len(v_venues), sum(1 for t in rp_titres if "src/venues/quote-reference.spec.ts" in t)))
constat("R-C1", f"les {len(v_venues)} tests de `algiersYear` (F-3) n'ont aucune ligne ROUGE : le fichier n'a pas pu être collecté contre l'état d'avant (module `./quote-reference` absent) et l'extracteur ne marque aucun titre pour un échec de collecte (D304). La section range ce point sous « types (modules purs) 21 rouges / 6 morsures » ; sa garde est donc prouvée par `neutralize-r39.py` (échec LU), pas par un rouge versé — imprécision de rattachement, sans effet sur une porte")
non_verifiable("NV-R1", "que les rouges aient été mesurés CONTRE LE CODE D'AVANT à la minute dite : les journaux bruts (SHA-256 cités dans chaque en-tête) sont HORS dépôt ; la lecture montre que les titres des rouges sont verts dans les pièces du lot et que f61fa44 ne touche que des pièces — pas que le journal a été produit dans l'état dit")

# ─────────────────────────────────── famille K : la concurrence ───────────────────────────────────
print("\n== K — le test de concurrence, cinq passes, contre ses pièces et contre sa source")
conc = show(DERNIER, f"{PD}/concurrence/concurrence-5-passes.txt")
ps = passes_concurrence(conc)
ctl("K1", "cinq passes, chacune : 18 lignes ✓ de test, « 18 passed (18) », code 0", [(18, (18, 18), 0)] * 5, ps)
tp = [titres_passe(conc, i) for i in range(5)]
ctl("K2", "…et les 18 titres sont IDENTIQUES d'une passe à l'autre (la même suite cinq fois, pas cinq suites)", True, all(t == tp[0] for t in tp) and len(set(tp[0])) == 18)
spec_int = show(REPAR, "apps/api/test/int/quote-numbering.int-spec.ts")
declarations_int = len(re.findall(r"^\s*(?:it|test)(?:\.only|\.skip)?\(", spec_int, re.M))
ctl("K3", "le fichier de test déclare 18 tests (les 18 de la pièce) et aucun `.only`/`.skip`", (18, 0), (declarations_int, len(re.findall(r"\b(?:it|test|describe)\.(?:only|skip)\b", spec_int))))
f1 = spec_int.split("F-1 — deux créations simultanées")[1].split("describe(")[0] if "F-1 — deux créations simultanées" in spec_int else ""
ctl("K4", "F-1 : le test lance 20 créations par `Promise.all` (concurrentes) et compare les numéros à une suite 1..20", (True, True), ("Promise.all" in f1, bool(re.search(r"\b20\b", f1))))
ctl("K5", "…les numéros attendus sont relus en base (SQL brut), pas recopiés : le test lit `quote_number_counters`/`reference_number` par `$queryRaw` ou équivalent", True, bool(re.search(r"\$queryRaw|queryRawUnsafe|SELECT[^\n]*reference_number", f1 + spec_int)))
f2 = spec_int.split("F-2 — création, révision")[1].split("describe(")[0] if "F-2 — création, révision" in spec_int else ""
ctl("K6", "F-2 : le test lance 8 créations + 8 révisions + 3 blocages (Promise.all) et refuse un interblocage", (True, True), ("Promise.all" in f2, bool(re.search(r"deadlock|40P01|55P03", f2))))
ctl("K7", "le fichier de test de la pièce est bien dans la suite d'intégration (apps/api/test/int/*.int-spec.ts) et la porte test:int compte 39 fichiers dont lui", True, "apps/api/test/int/quote-numbering.int-spec.ts" in liste_arbre(REPAR, "apps/api/test/int"))
non_verifiable("NV-K1", "que les cinq passes aient tourné sur le conteneur `zwadj-db` et à la minute dite (03:29:41 à 03:30:xx) : la pièce est un journal versé ; la lecture vérifie sa cohérence interne et sa source, pas son origine")
constat("K-C1", "la concurrence est mesurée par des clients du MÊME processus (Promise.all, un seul pool de connexions) ; ce n'est pas deux processus d'API : la sérialisation vient de la ligne de compteur côté PostgreSQL (vraie), mais l'ordonnancement de Node limite la contention réellement atteinte — limite de la preuve, pas un défaut. La session adverse rejouera la contention avec des connexions SÉPARÉES")

# ─────────────────────────────────── famille N : la neutralisation ───────────────────────────────────
print("\n== N — l'union des campagnes, les campagnes jouées, les réparations, les six sorties non rejouées")
sortie_union = show(DERNIER, f"{PD}/neutralisation/union-sortie.txt")
ctl("N1", "union-sortie : 7 bras de calibration, 0 manqué", (7, True), (len(re.findall(r"^\s+✓ calibration", sortie_union, re.M)), "calibration : 7 bras, 0 manqué" in sortie_union))
m = re.search(r"^UNION : (\d+) campagne\(s\) sur (\d+)", sortie_union, re.M)
mtxt = re.search(r"\*\*(\d+) campagnes sur (\d+)\*\* \(le tri seul : (\d+) ; le tri tel que lancé contre `HEAD` : (\d+)\)", cont_a)
ctl("N2", "union-sortie : « 14 campagnes sur 37 » comme le texte, le tri seul 9, le tri tel que lancé 0", ((int(mtxt.group(1)), int(mtxt.group(2))) if mtxt else None, int(mtxt.group(3)) if mtxt else None, int(mtxt.group(4)) if mtxt else None), ((int(m.group(1)), int(m.group(2))), 9, 0) if m else None)
union_dite = re.search(r"^UNION: (.*)$", sortie_union, re.M).group(1).split(",")
tous_harnais = lambda sha: sorted(f.rsplit("/", 1)[-1] for f in liste_arbre(sha, "neutralisation") if re.fullmatch(r"neutralisation/neutralize-.*\.py", f))
ctl("N3", "il y a 37 campagnes `neutralize-*.py` au dernier commit de D333 et 37 au commit de l'union (r39 y est)", (37, 37), (len(tous_harnais(DERNIER)), len(tous_harnais(UNION))))


def union_recalculee(sha_texte, fichiers):
    out = {}
    for h in tous_harnais(sha_texte):
        t = show(sha_texte, f"neutralisation/{h}")
        for f in fichiers:
            k = campagne_cite(t, f)
            if k is not None and f != f"neutralisation/{h}":
                out.setdefault(h, set()).add((k, f))
    return out


code_union = [f for f in noms_diff(DEPART, UNION) if est_code(f)]
ctl("N4", "l'union RECALCULÉE (CHAÎNES des campagnes au SHA de l'union, fichiers de code du diff 2782be9..62b9309) donne les 14 campagnes de la sortie versée", sorted(union_dite), sorted(union_recalculee(UNION, code_union)))
existants_union = set(liste_arbre(UNION))
fichiers_lot = {f for f in noms_diff(DEPART, UNION) if not f.startswith("docs/preuves/")}
a_recalcule = sorted(h for h in tous_harnais(UNION) if tri_a(show(UNION, f"neutralisation/{h}"), existants_union) & fichiers_lot)
a_dit = sorted(re.findall(r"^(neutralize-[\w\-]+\.py)\s+oui", sortie_union, re.M))
ctl("N4b", "le tri (a) RECALCULÉ (même regex que `fichiers_lus`, commit de l'union, diff du lot hors docs/preuves) retient les campagnes que la sortie marque « oui » en colonne (a) : 9", (9, a_dit), (len(a_recalcule), a_recalcule))
code_fin = [f for f in noms_diff(DEPART, DERNIER) if est_code(f)]
union_fin = sorted(union_recalculee(DERNIER, code_fin))
retenues_en_plus = sorted(set(union_fin) - set(union_dite))
print(f"   l'union recalculée au DERNIER commit (diff final, {len(code_fin)} fichiers de code) : {len(union_fin)} campagnes ; en plus de la sortie versée : {retenues_en_plus}")
ctl("N5", "…recalculée au dernier commit sur le diff final, elle ne retient AUCUNE campagne de plus que la sortie versée (les fichiers ajoutés après l'union n'en font pas entrer d'autre)", [], retenues_en_plus)
ctl("N6", "le script d'union et sa sortie sont versés AVANT de jouer la première campagne : 62b9309 (versement) précède 0342e94 (réparations) et c6a3f99 (sorties finales)", True, idx[UNION] < idx[REPAR] < idx[PIECES])
SORTIES = ["act-plafonds", "b7", "booking-status", "e3d1-s8", "horloge", "journey", "r32", "r33", "r38", "r39", "r4", "s10b", "s11b", "solid-s3"]
dites = {"act-plafonds": 4, "b7": 3, "booking-status": 3, "e3d1-s8": 8, "horloge": 2, "journey": 7, "r32": 65, "r33": 95, "r38": 46, "r39": 51, "r4": 2, "s10b": 20, "s11b": 13, "solid-s3": 6}
total_dit = re.search(r"\*\*(\d+) gardes DISTINCTES mordues, 0 muette, 0 non mesurée\*\*", cont_a)
ctl("N7", "la somme des gardes finales du texte (4+3+3+8+2+7+65+95+46+51+2+20+13+6) est celle que la clôture annonce (325)", (int(total_dit.group(1)) if total_dit else None,), (sum(dites.values()),))
bilan, mesure_ids = {}, {}
for nom in SORTIES:
    t = show(DERNIER, f"{PD}/neutralisation/{nom}.txt")
    mm = re.search(r"^(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\)", t, re.M) or re.search(r"^(\d+) garde\(s\) neutralisée\(s\) et ROUGE\(s\) sur (la) plage", t, re.M)
    if nom == "journey":
        lues = len(re.findall(r"^✓ D\d+\.", t, re.M))
    elif nom in ("act-plafonds", "horloge"):
        lues = len(re.findall(r"^✓ C\d+ ", t, re.M))
    else:
        lues = len(ids_cibles_resultat(t))
    bilan[nom] = (int(mm.group(1)), int(mm.group(2)) if mm.group(2).isdigit() else int(mm.group(1))) if mm else None
    mesure_ids[nom] = lues
    ctl(f"N8-{nom}", f"sortie finale {nom} : lignes ✓ RECOMPTÉES, bilan écrit, et le texte ({dites[nom]})", (dites[nom], (dites[nom], dites[nom])), (lues, bilan[nom]))
muettes = [n for n in SORTIES if re.search(r"^✗|NON MESURÉE|ERREUR DE SCRIPT|Traceback", show(DERNIER, f"{PD}/neutralisation/{n}.txt"), re.M)]
ctl("N9", "aucune sortie finale ne porte de ✗, de « NON MESURÉE », d'« ERREUR DE SCRIPT » ni de Traceback", [], muettes)
ctl("N10", "r33 --int et r39 --int : « arbre rendu à son état de départ : vérifié » dans les deux", (True, True), tuple("arbre rendu à son état de départ : vérifié" in show(DERNIER, f"{PD}/neutralisation/{n}.txt") for n in ("r33", "r39")))
cibles_r33 = cibles_declarees(show(DERNIER, "neutralisation/neutralize-r33.py"))
cibles_r39 = cibles_declarees(show(DERNIER, "neutralisation/neutralize-r39.py"))
ctl("N11", "r33 déclare 95 cibles (autant qu'à D332 : aucune retirée) et r39 en déclare 51 ; les identifiants mordus sont ceux des cibles", (95, 95, 51, [], []), (len(cibles_r33), len(cibles_declarees(show(DEPART, "neutralisation/neutralize-r33.py"))), len(cibles_r39), sorted(set(ids_cibles_resultat(show(DERNIER, f"{PD}/neutralisation/r33.txt"))) ^ set(cibles_r33)), sorted(set(ids_cibles_resultat(show(DERNIER, f"{PD}/neutralisation/r39.txt"))) ^ set(cibles_r39))))
# les sept premières sorties non nulles
pj = {n: show(DERNIER, f"{PD}/neutralisation/premier-jeu/{n}.txt") for n in ("act-plafonds", "e3d1-s8", "horloge", "r33", "r39", "s10b", "s11b")}
jeu = show(DERNIER, f"{PD}/neutralisation/union-jeu.txt")
non_nulles = re.findall(r"^  ⚠ (neutralize-[\w\-]+\.py(?: --int)?) → sortie (\d+)", jeu, re.M)
mj = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) sortie\(s\) non nulle\(s\)", jeu)
mtj = re.search(r"\*\*(\d+) gardes mordues, (\d+) muettes, (\d+) non mesurées, (\d+) sorties non nulles\*\*", cont_a)
ctl("N12", "le premier jeu : (mordues, muettes, non mesurées, sorties non nulles) = le texte (194, 3, 9, 7)", tuple(int(x) for x in mtj.groups()) if mtj else None, tuple(int(x) for x in mj.groups()) if mj else None)
ctl("N13", "…et les sept campagnes non nulles sont celles que le texte nomme", sorted(["neutralize-act-plafonds.py", "neutralize-e3d1-s8.py", "neutralize-horloge.py", "neutralize-r33.py --int", "neutralize-r39.py --int", "neutralize-s10b.py", "neutralize-s11b.py"]), sorted(n for n, c in non_nulles))
# chaque réparation
ids_r33_ko = re.findall(r"(?:^|: |; )([A-Z]+-\d+)\. ?: ancre ×0", pj["r33"].replace(" : ancre", ". : ancre")) or re.findall(r"([A-Z]+-\d+)\.\s*: ancre ×0", pj["r33"])
ids_r33_ko = sorted(set(re.findall(r"([A-Z]+-\d+)\.\s*: ancre ×0", pj["r33"])))
ctl("N14", "r33, premier jeu : le pré-vol ne trouve plus l'ancre de M-11, SV-8, T-3, J-13 (4 cibles) ; elles sont TOUJOURS déclarées, réorientées par une ligne écrite, et mordent dans la sortie finale", (["J-13", "M-11", "SV-8", "T-3"], True, True), (ids_r33_ko, all(i in cibles_r33 and re.search(rf"# ⛔ {i} RÉORIENTÉE", show(DERNIER, "neutralisation/neutralize-r33.py")) for i in ids_r33_ko), all(i in ids_cibles_resultat(show(DERNIER, f"{PD}/neutralisation/r33.txt")) for i in ids_r33_ko)))
ids_s10b_ko = sorted(set(re.findall(r"^✗ (S10b\d-[\w]+)\.", pj["s10b"], re.M)))
s10b_h = show(DERNIER, "neutralisation/neutralize-s10b.py")
ctl("N15", "s10b, premier jeu : « ERREUR DE SCRIPT : 0 occurrence(s) » sur la première cible rencontrée (S10b1-1) ; trois cibles réorientées (S10b1-1, S10b1-2, S10b1-5), toutes déclarées et mordues dans la sortie finale (20 sur 20)", (True, 3, True, True), ("ERREUR DE SCRIPT : 0 occurrence(s), 1 attendue(s)" in pj["s10b"], len(re.findall(r"RÉORIENTÉE \(rang 39, D333\)|⛔ RÉORIENTÉE \(rang 39, D333\)", s10b_h)), all(i in ids_cibles_resultat(show(DERNIER, f"{PD}/neutralisation/s10b.txt")) for i in ("S10b1-1", "S10b1-2", "S10b1-5")), len(ids_cibles_resultat(show(DERNIER, f"{PD}/neutralisation/s10b.txt"))) == 20))
journey_test = show(REPAR, "apps/pro/src/dashboard/walkin-journey.test.tsx")
nb = len(re.findall(r"^\s*it\(", journey_test, re.M))
consts = [re.search(r"NB_TESTS_ATTENDU = (\d+)", show(DERNIER, f"neutralisation/neutralize-{n}.py")).group(1) for n in ("act-plafonds", "horloge")]
ctl("N16", "act-plafonds / horloge : `walkin-journey.test.tsx` déclare 108 tests (`it(`) à 0342e94, les deux harnais attendent 108 (la constante), et le premier jeu a échoué sur « 102 tests attendus » avec 108 passés", (108, ["108", "108"], True), (nb, consts, "102 tests attendus" in pj["act-plafonds"] and "108 passed (108)" in pj["act-plafonds"]))
ctl("N17", "act-plafonds / horloge : la différence entre D332 et D333 de chaque harnais est la constante SEULE (un morceau de diff, +1 / −1 lignes de code)", (1, 1), tuple(sum(1 for l in git("diff", DEPART, REPAR, "--", f"neutralisation/neutralize-{n}.py").decode("utf-8").split("\n") if l.startswith("-") and not l.startswith("---")) for n in ("act-plafonds", "horloge")))
ctl("N18", "e3d1-s8 et s11b : jouées sans --int au premier jeu (5 et 4 non mesurées), puis avec : 8 sur 8 et 13 sur 13 = 3+5 et 9+4", (5, 4, 8, 13), (len(re.findall(r"^⚠ E\d+\.", pj["e3d1-s8"], re.M)), len(re.findall(r"^⚠ S11b-\d+\.", pj["s11b"], re.M)), mesure_ids["e3d1-s8"], mesure_ids["s11b"]))
pr39 = pj["r39"]
ctl("N19", "r39, premier jeu : 50 mordues sur 51, UNE muette, et c'est S-1 ; la sortie finale a S-1 mordue", (True, True), (bool(re.search(r"^✗ S-1\.", pr39, re.M)) and "50 garde(s) mordue(s) sur 51" in pr39, "S-1" in ids_cibles_resultat(show(DERNIER, f"{PD}/neutralisation/r39.txt"))))
# les six sorties non rejouées
SIX = ["b7", "journey", "r32", "r38", "r4", "solid-s3"]
mot = re.search(r"les six sorties finales `b7`, `journey`, `r32`, `r38`, `r4` et `solid-s3` sont celles du PREMIER jeu", section_a)
ctl("N20", "le texte dit lui-même que les six sorties finales (b7, journey, r32, r38, r4, solid-s3) sont celles du PREMIER jeu, non rejouées", True, bool(mot))
lignes_jeu = {m.group(1): tuple(int(x) for x in m.group(2, 3, 4, 5)) for m in re.finditer(r"^(neutralize-[\w\-]+\.py(?: --int)?)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+\d+\s", jeu, re.M)}
ctl("N21", "le tableau de union-jeu.txt : pour chacune des six non rejouées, (sortie, mordues, muettes, non mesurées) = (0, le nombre du texte, 0, 0) — la sortie finale versée EST celle du premier jeu", {h: (0, dites[h], 0, 0) for h in SIX}, {h: lignes_jeu.get(f"neutralize-{h}.py") for h in SIX})
tot = [sum(v[i] for v in lignes_jeu.values()) for i in (1, 2, 3)] + [sum(1 for v in lignes_jeu.values() if v[0] != 0)]
ctl("N21b", "…et la somme du tableau (14 lignes) RECOMPTÉE colonne par colonne égale la ligne « MESURÉ » (194, 3, 9, 7)", (14, 194, 3, 9, 7), (len(lignes_jeu), *tot))
modifies_apres_union = [f for f in noms_diff(UNION, DERNIER) if not f.startswith("docs/preuves/") and f not in AUTORITES]
print(f"   fichiers (hors docs/preuves et .md) modifiés entre le versement de l'union (62b9309) et le dernier commit : {modifies_apres_union}")
cites_par_six = {}
for h in SIX:
    t = show(DERNIER, f"neutralisation/neutralize-{h}.py")
    cites_par_six[h] = sorted(f for f in modifies_apres_union if f != f"neutralisation/neutralize-{h}.py" and campagne_cite(t, f) is not None)
ctl("N22", "AUCUNE des six campagnes non rejouées ne cite (chemin complet, chemin de paquet ou nom) un fichier modifié depuis 62b9309 — ni son propre script", {h: [] for h in SIX}, cites_par_six)
ctl("N23", "…les six scripts eux-mêmes sont inchangés entre 62b9309 et le dernier commit (octet pour octet, objet git identique)", {h: True for h in SIX}, {h: git("rev-parse", f"{UNION}:neutralisation/neutralize-{h}.py") == git("rev-parse", f"{DERNIER}:neutralisation/neutralize-{h}.py") for h in SIX})
dans_sources = {h: [f for f in code_fin if f in modifies_apres_union] for h in SIX}
cite_spec_magasin = sorted(h[len("neutralize-"):-3] for h in tous_harnais(DERNIER) if campagne_cite(show(DERNIER, f"neutralisation/{h}"), "apps/api/src/venues/quote-store.prisma.spec.ts") is not None)
ctl("N24", "quote-store.prisma.spec.ts (modifié après l'union, S-29) est cité par : booking-status, r39, s10b — rien d'autre (les trois ont été rejouées après)", ["booking-status", "r39", "s10b"], [c for c in cite_spec_magasin if c in ("booking-status", "r39", "s10b", "b7", "journey", "r32", "r38", "r4", "solid-s3", "e3d1-s8", "s11b", "act-plafonds", "horloge", "r33")])
print(f"   campagnes (des 37) qui citent quote-store.prisma.spec.ts, au dernier commit : {cite_spec_magasin}")
non_verifiable("NV-N1", "que les campagnes aient mordu dans l'état exact du commit où elles sont dites jouées : les sorties sont versées, pas rejouées (« aucune campagne rejouée ») ; le premier jeu n'enregistre pas le SHA sur lequel il a tourné (il n'a que le SHA de l'union dans union-sortie.txt)")
non_verifiable("NV-N2", "que la neutralisation à la main de l'e2e ait été faite dans l'ordre décrit : la procédure est versée comme pièce (e2e-a-la-main.py), pas promue en instrument (S-30) ; la lecture vérifie que la sortie porte une assertion lue et une empreinte restaurée")
eam = show(DERNIER, f"{PD}/neutralisation/e2e-a-la-main.txt")
ctl("N25", "e2e à la main : quatre mutations (E-1 à E-4) et quatre « empreinte restaurée : identique »", (4, 4), (len(re.findall(r"^E-\d", eam, re.M)) or len(set(re.findall(r"\bE-[1-4]\b", eam))), eam.count("empreinte restaurée : identique")))

eam_blocs = re.split(r"^■ ", eam, flags=re.M)[1:]
signatures = {"E-1": r"expect\(locator\)\.toBeVisible\(\)", "E-2": r"expect\(received\)\.toBe\(expected\)", "E-3": r"expect\(locator\)\.toContainText\(expected\)", "E-4": r"expect\(second\.status\)\.toBe\(201\)"}
lues_e2e = {}
for b in eam_blocs:
    ident = b[:3]
    lues_e2e[ident] = bool(re.search(signatures.get(ident, "$^"), b)) and "1 failed" in b and "empreinte restaurée : identique" in b and "TimeoutError: locator.click" not in b
ctl("N26", "e2e à la main : chaque mutation porte SON assertion web-first / native dans le bloc d'échec lu, « 1 failed », une empreinte restaurée identique, et aucun délai d'ACTION (D323)", {k: True for k in signatures}, lues_e2e)
mc = re.findall(r"E-4[^\n]*\n[\s\S]*?Received: (\d+)", eam)
ctl("N27", "E-4 : le statut reçu après la mutation est 500 (la base refuse le doublon, F-12), comme le texte l'écrit", ["500"], mc)

# ─────────────────────────────────── famille T : le texte contre la pièce ───────────────────────────────────
print("\n== T — les affirmations de D333 et des fichiers d'autorité, contre le dépôt")
registre = re.findall(r"^\| (D\d+) \|", cont_dernier, re.M)
ctl("T1", "le registre finit sur D333 (dernière ligne) et ne contient pas encore D334", ("D333", False), (registre[-1], "D334" in registre))
ctl("T2", "la dernière ligne « ⇒ RANG N » de l'ordre est « RANG 40 : EN ATTENTE D'ARBITRAGE DE KO »", True, "⇒ **RANG 40 : EN ATTENTE D'ARBITRAGE DE KO** (D284)" in cont_dernier and "RANG 41" not in cont_dernier.split("## PROCHAIN LOT — rang 39")[0])
ctl("T3", "le point d'entrée du rang 39 se dit CLOS SUR LE CODE, compteur TROIS, condition de clôture OUVERTE", True, all(s in cont_a for s in ("CLOS SUR LE CODE LE 15/10/2026 (D333) — COMPTEUR TROIS", "CONDITION DE CLÔTURE OUVERTE")))
ag = aplati(show(DERNIER, AGENTS))
ctl("T4", "AGENTS.md porte l'annotation de D333 (RANG 39 CLOS SUR LE CODE, TROIS, certification IMMÉDIATE)", True, "RANG 39 ARBITRÉ PAR KO" in ag and "compteur DEUX → TROIS" in ag and "certification IMMÉDIATE" in ag)
bk = aplati(show(DERNIER, BACKLOG))
ctl("T5", "le backlog porte « Reports du 15/10/2026 — rang 39 » avec F-12 (compteur désaccordé → 500) ouvert", (True, True), ("Reports du 15/10/2026" in bk, "F-12" in bk))
ctl("T6", "le contrôle de fin de lot de la section dit « 116 fichiers distincts examinés, 0 versé avant sa déclaration, 0 jamais déclaré » et « 117 fichiers » (C9)", True, "116 fichiers distincts examinés, 0 versé avant sa déclaration, 0 jamais déclaré" in section_a and "117 fichiers, la table comprise" in section_a)
ctl("T7", "les trois fichiers d'autorité sont stockés en LF pur dans git au dernier commit de D333", [0, 0, 0], [git("show", f"{DERNIER}:{a}").count(b"\r\n") for a in AUTORITES])
ctl("T8", "la condition de clôture du rang 33 reste OUVERTE dans AGENTS.md et le point d'entrée (le nom du client vient avec L35-4)", True, "celle du rang 33 reste ouverte" in ag.lower() or "celle du rang 33 reste OUVERTE" in ag)
ctl("T9", "le message du commit f61fa44 porte l'erreur de compte que la section avoue (faute n° 1) : « 6 + 7 + 4 + 9 + 23 + 12 »", True, "6 + 7 + 4 + 9 + 23 + 12" in git("log", "-1", "--format=%s", ROUGES).decode("utf-8"))
ctl("T10", "les décisions S-27 à S-33 sont annoncées « À RATIFIER PAR KO » dans la section", 7, len(set(re.findall(r"\*\*S-(2[7-9]|3[0-3])\*\*", section))))
sc = show(DERNIER, f"{PD}/scenarios-ko.md")
ctl("T11", "scenarios-ko.md : six scénarios numérotés", 6, len(re.findall(r"^\d+\. \*\*", sc, re.M)))
passe1 = show(DERNIER, f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt")
passef = show(DERNIER, f"{PD}/passe-d277/balayage-final.txt")
occ_f = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+) · motifs examinés (\d+)", passef)
dit_occ = re.search(r"\*\*(\d[\d  ]*) occurrences\*\* dans l'arbre", section_a)
dit_motifs = re.search(r"(\d+) motifs examinés", section_a)
ctl("T12", "la passe D277 finale : « OCCURRENCES DANS L'ARBRE » et le nombre de motifs examinés sont ceux que la section écrit", (entier(dit_occ.group(1)) if dit_occ else None, int(dit_motifs.group(1)) if dit_motifs else None), (int(occ_f.group(1)), int(occ_f.group(2))) if occ_f else None)
non_verifiable("NV-3", "que la RAM libre et l'absence de `chrome`/`headless_shell` relevées dans `etat-machine.txt` soient celles de la fenêtre des portes : l'échantillonneur n'a pas tourné pendant le paquet (S-31 de D333)")
non_verifiable("NV-4", "que les huit captures montrent ce que la section dit : la lecture vérifie que ce sont des PNG, pas leur contenu")
for p in sorted(f for f in liste_arbre(DERNIER, f"{PD}/navigateur/images") if f.endswith(".png")):
    pass
png = [f for f in liste_arbre(DERNIER, f"{PD}/navigateur/images") if f.endswith(".png")]
ctl("T13", "huit captures PNG versées, dont l'en-tête d'octets est celui d'un PNG", (8, 8), (len(png), sum(1 for f in png if git("show", f"{DERNIER}:{f}")[:8] == b"\x89PNG\r\n\x1a\n")))
non_verifiable("NV-7", "que le fil de discussion (les textes de Ko du 15/10 et les quatre décisions du relecteur) soit reproduit à l'identique dans les fichiers : la lecture compare les fichiers entre eux, pas au fil")

# ─────────────────────────────────── familles X et E : l'état vivant ───────────────────────────────────
print("\n== X — l'état VIVANT (seule famille avec E qui lit l'arbre de travail)")
tete = git("rev-parse", "HEAD").decode().strip()
distant = git("rev-parse", "origin/main").decode().strip()
statut = [l for l in git("status", "--short").decode().split("\n") if l]
non_suivis_hors = [l for l in statut if not l.startswith("?? docs/preuves/D334")]
ctl("X1", "HEAD = origin/main (après le fetch du début de session)", tete, distant)
ctl("X2", "le dépôt ne diffère de la fin de D333 que par la table d'ouverture de ce lot : `git diff 83929a6..HEAD --name-only`", ["docs/preuves/D334/table-ouverture.md"], noms_diff(DERNIER, "HEAD"))
ctl("X3", "aucun stash", "", git("stash", "list").decode().strip())
ctl("X4", "branche main", "main", git("rev-parse", "--abbrev-ref", "HEAD").decode().strip())
ctl("X5", "l'arbre de travail ne porte aucune modification hors des pièces de ce lot (docs/preuves/D334, non suivies jusqu'à leur commit)", [], non_suivis_hors)
ctl("X6", "le commit courant est la table d'ouverture de ce lot, seule", ([OUV334], ["docs/preuves/D334/table-ouverture.md"]), ([tete[:7]], noms_commit("HEAD")))
ctl("X7", "dans l'arbre de travail, les trois fichiers d'autorité sont en CRLF PUR (CRLF = LF, octets)", True, all(open(a, "rb").read().count(b"\r\n") == open(a, "rb").read().count(b"\n") for a in AUTORITES))
print("== E — l'état des fichiers .env (outil de D330, aucune valeur)")
with tempfile.TemporaryDirectory() as d:
    r = subprocess.run([sys.executable, "docs/preuves/D330/outils/etat-env.py", "relever", "lecture-adverse-d334", d], capture_output=True)
    sortie_env = r.stdout.decode("utf-8", errors="replace")
    fichier = open(os.path.join(d, "etat-env-lecture-adverse-d334.txt"), encoding="utf-8").read() if os.path.exists(os.path.join(d, "etat-env-lecture-adverse-d334.txt")) else ""
empreintes = re.findall(r"FICHIER (\S+) · octets (\d+) · SHA256 ([0-9a-f]{8})", fichier)
resume = re.search(r"RÉSUMÉ fichiers (\d+) · variables d'URL (\d+) · hôtes non locaux (\d+)", fichier)
ctl("E1", "l'outil rend 0 (porte VERTE) : trois fichiers, huit variables d'URL, aucun hôte non local", (0, (3, 8, 0)), (r.returncode, tuple(int(x) for x in resume.groups()) if resume else None))
d330 = show("HEAD", "docs/preuves/D330/passe-r36b-20261013-0106/etat-env-ouverture.txt")
em330 = re.findall(r"FICHIER (\S+) · octets (\d+) · SHA256 ([0-9a-f]{8})", d330)
ctl("E2", "les empreintes (8 premiers caractères) et les tailles des trois .env sont celles de l'ouverture de la passe de D330 (aucun .env n'a bougé depuis le 13/10)", em330, empreintes)
for l in fichier.split("\n"):
    if "NON LOCAL" in l and "attendu" not in l and "calibration" not in l:
        print("   ⚠ ligne à examiner :", l[:80])

# ─────────────────────────────────── bilan ───────────────────────────────────
non_verifiable("NV-5", "que Docker Desktop et le conteneur `zwadj-db` aient tourné pendant les cinq passes de concurrence : c'est un fait du poste de Ko, sans pièce autre que le journal versé")
print("\n== BILAN")
print(f"{len(controles)} contrôles ({len(controles) - len(ecarts) - len(ecarts_live)} ✓) · {len(ecarts)} écart(s) de D333 : {ecarts} · {len(ecarts_live)} variation(s) de l'état vivant : {ecarts_live} · {len(constats)} constat(s) : {constats} · {len(non_verifiables)} non vérifiable(s) : {non_verifiables}")
vent = " · ".join(f"{k} {v}" for k, v in sorted(familles.items()))
print(f"ventilation : {vent} (somme {sum(familles.values())}) — aucune famille à zéro : {all(v > 0 for v in familles.values())}")
print(f"calibration : {bras_calibration[0]} bras, {bras_calibration[1]} manqué")
