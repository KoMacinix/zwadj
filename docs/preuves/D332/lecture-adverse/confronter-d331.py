"""D332 — lecture adverse de D331 (rang 37, lot de CODE L35-1 « Ma salle » : clos sur le code, compteur ZÉRO → UN), confrontée aux objets git à des SHA FIXÉS et aux pièces versées.

POURQUOI IL EXISTE
  Forme de Ko pour le rang 38 : « la lecture adverse depuis la clôture de D331, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque
  extracteur calibré sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré. En particulier : le tableau des
  chemins de D331 (rouges contre l'état d'avant, verts) contre ses pièces ; les portes de D331 contre leurs extraits ; la réorientation de la cible C-1 de `r33` (extension 4, « une ligne »
  contre deux) ; le relevé « 30 campagnes sur 35 » et sa calibration. Aucune porte ni campagne n'est rejouée pour cette lecture. »
  Le dernier commit de D331 est sa clôture (`dd41fbd`) ; aucun commit ne la suit sinon la table d'ouverture de CE lot (`e644a98`, qui ne contient qu'elle). Chaque affirmation de D331 qui se
  vérifie dans le dépôt est confrontée à sa SOURCE : les pièces versées, les objets git, le texte des fichiers d'autorité. Une affirmation qui ne vit que dans le chat, ou dans un journal hors
  dépôt, est déclarée NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D332/lecture-adverse/confronter-d331.py > docs/preuves/D332/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF : (1) la famille X (état LIVE : `git status`, `stash`, `rev-parse`) ; (2) la
  famille V (les empreintes SHA-256 des onze fichiers de code de D331, recalculées sur l'arbre de travail et confrontées à la pièce) ; (3) les fins de ligne des trois `.md` (famille Q).
  AUCUN rejeu de porte ni de campagne ici, aucune écriture.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d330.py` (D331) — il juge D330 et ses SHA ; réutiliser `extraire-rouge.py` ou `releve-chemins-relatifs.py` de D331 comme preuve de D331 — ce serait croire
  l'instrument qu'on juge : ici les rouges, les verts et les chemins relatifs sont RECOMPTÉS par des expressions écrites ici, et le relevé « 30 sur 35 » est recalculé par une autre
  implémentation (autre ensemble de départ : les fichiers lus à `dd41fbd` par `git show`, pas l'arbre de travail).

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce
qu'ils ont PARCOURU et leur attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute ou du texte de D331 — jamais écrit de
mémoire (D275).
"""
import ast
import hashlib
import os
import re
import struct
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIN = "dd41fbd"        # clôture de D331
DEPART = "afdfcb1"     # SHA de départ de D331 = clôture de D330
OUV331 = "edfe644"     # la table d'ouverture de D331 (seule)
LECT = "52c0a2b"      # la lecture adverse de D331
PASSE1 = "0b8d8ea"     # la première passe D277 de D331
KO1 = "1640dbe"        # la première écriture d'autorité de D331 (les arbitrages de Ko)
EXT4 = "d19935c"
CODE = "1b11e41"       # le code de D331
HARN = "ea213c0"       # les harnais de D331
PIECES = "89a0fff"     # les pièces de D331
EXT5 = "f1e6443"
RELEVE = "8245d58"
CLOT = "19cd3b0"       # les écritures d'autorité de clôture de D331
OUV332 = "e644a98"     # la table d'ouverture de CE lot (seule)
PD = "docs/preuves/D331"
CONT, AGENTS, BACKLOG = "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"
AUTORITES = (AGENTS, BACKLOG, CONT)
NBSP = "[\\s  ]"
ANSI = re.compile(r"\x1b\[[0-9;]*m")

controles, ecarts, constats, ecarts_live, non_verifiables = [], [], [], [], []
familles: dict = {}
bras_calibration = [0, 0]  # joués, manqués


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8", errors="replace").replace("\r\n", "\n")


def show_octets(sha, chemin):
    return git("show", f"{sha}:{chemin}")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def blob(sha, chemin):
    return git("rev-parse", f"{sha}:{chemin}").decode().strip()


def noms_diff(a, b):
    return [l for l in git("diff", "--name-only", a, b).decode("utf-8").split("\n") if l]


def liste_arbre(sha, *prefixes):
    sortie = git("ls-tree", "-r", "--name-only", sha, *prefixes).decode("utf-8").split("\n")
    return [l for l in sortie if l]


def aplati(t):
    return re.sub(r"\s+", " ", t)


def norm(t):
    return t.replace(" ", " ").replace(" ", " ")


def sans_ansi(t):
    return ANSI.sub("", t)


def nettoyer(c):
    return c.replace("*", "").replace("`", "")


def entier(s):
    return int(re.sub(NBSP, "", s))


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] in "XV" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:7} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:7} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:7} NON VÉRIFIABLE : {texte}")


def bras(libelle, attendu, mesure):
    """Un bras de calibration : l'extracteur DOIT rendre l'attendu sur un cas dont la réponse est connue."""
    bras_calibration[0] += 1
    ok = attendu == mesure
    if not ok:
        bras_calibration[1] += 1
    print(f"   {'✓' if ok else '✗'} calibration {libelle} : {mesure!r} (attendu {attendu!r})")


# ── Extracteurs (chacun calibré plus bas) ─────────────────────────────────────────────────────────────────
def chemins_table(texte):
    """Les chemins en tête de ligne d'un tableau Markdown : `| \\`chemin\\` | … |` (peut en citer plusieurs séparés par une virgule). Ordre d'apparition, sans doublon, SANS retouche."""
    sortie = []
    for l in texte.split("\n"):
        m = re.match(r"\|\s*((?:`[^`|]+`(?:,\s*)?)+)\s*\|", l)
        if m:
            for c in re.findall(r"`([^`]+)`", m[1]):
                if c not in sortie and ("/" in c or c.endswith(".md")) and "<" not in c and not c.endswith("/"):
                    sortie.append(c)
    return sortie


def section(texte, debut):
    """Le texte d'une section `## …` qui commence par `debut`, jusqu'au `## ` suivant (hors blocs de titres plus profonds)."""
    lignes = texte.split("\n")
    sortie, dedans = [], False
    for l in lignes:
        if l.startswith("## "):
            if dedans:
                break
            dedans = l.startswith("## " + debut)
        if dedans:
            sortie.append(l)
    return "\n".join(sortie)


def lignes_verdict(extrait):
    """(rouges, verts, échecs) d'un extrait de rouge/vert de D331 : lignes qui COMMENCENT par `ROUGE `, `VERT `, `ÉCHEC `."""
    rouges = [l[7:] for l in extrait.split("\n") if l.startswith("ROUGE  ")]
    verts = [l[7:] for l in extrait.split("\n") if l.startswith("VERT   ")]
    echecs = [l[7:] for l in extrait.split("\n") if l.startswith("ÉCHEC  ")]
    return rouges, verts, echecs


def premieres_lignes_echec(extrait):
    """La ligne `  1ʳᵉ ligne : …` qui suit chaque `ÉCHEC`."""
    return [m for m in re.findall(r"^  1ʳᵉ ligne : (.*)$", extrait, re.M)]


def titres_tests(source):
    """`describe("…")` et `it("…")` à guillemets doubles, en début de ligne (les commentaires `//` n'ouvrent pas). Rend [(dernier describe, it)]."""
    sortie, courant = [], None
    for l in source.split("\n"):
        m = re.match(r'^\s*describe\(\s*"((?:[^"\\]|\\.)*)"', l)
        if m:
            courant = m.group(1).replace('\\"', '"')
            continue
        m = re.match(r'^\s*it\(\s*"((?:[^"\\]|\\.)*)"', l)
        if m:
            sortie.append((courant, m.group(1).replace('\\"', '"')))
    return sortie


def appels_cible(source):
    """Les appels `cible(…)` du harnais, par l'AST : [(libellé, fichier, avant, apres, genre)], les constantes de module résolues ; `None` quand une valeur n'est pas une chaîne résoluble."""
    arbre = ast.parse(source)
    consts = {}
    for n in arbre.body:
        if isinstance(n, ast.Assign) and len(n.targets) == 1 and isinstance(n.targets[0], ast.Name):
            v = evalue(n.value, consts)
            if v is not None:
                consts[n.targets[0].id] = v

    sortie = []
    for n in ast.walk(arbre):
        if isinstance(n, ast.Call) and isinstance(n.func, ast.Name) and n.func.id == "cible":
            args = [evalue(a, consts) for a in n.args]
            genre = "substitution"
            for kw in n.keywords:
                if kw.arg == "genre":
                    genre = evalue(kw.value, consts)
            args += [None] * (5 - len(args))
            sortie.append((args[0], args[1], args[2], args[3], genre))
    return sortie


def evalue(noeud, consts):
    if isinstance(noeud, ast.Constant) and isinstance(noeud.value, str):
        return noeud.value
    if isinstance(noeud, ast.Name):
        return consts.get(noeud.id)
    if isinstance(noeud, ast.BinOp) and isinstance(noeud.op, ast.Add):
        g, d = evalue(noeud.left, consts), evalue(noeud.right, consts)
        return g + d if g is not None and d is not None else None
    return None


CHEMIN_TRI = re.compile(r"""['"]([^'"\n]+\.(?:ts|tsx|css|json|sql|mjs))['"]""")


def chemins_relatifs(source, fichiers_racine, paquets, fichiers_arbre):
    """Les chaînes entre guillemets qui ressemblent à un chemin (MÊME motif que `lancer-campagnes.py`), ABSENTES de la racine et présentes sous un paquet. Rend (total lu, [relatifs]) —
    DISTINCTS dans les deux (D290 : le relevé de D331 compte `len(set(…))` par campagne ; deux passes qui se comparent comptent la même chose)."""
    lus = {c.replace("\\", "/") for c in CHEMIN_TRI.findall(source)}
    relatifs = []
    for c in sorted(lus):
        if c in fichiers_racine:
            continue
        if any(f"{p}/{c}" in fichiers_arbre for p in paquets):
            relatifs.append(c)
    return len(lus), relatifs


def sceau_valide(octets):
    """Vrai si et seulement si la DERNIÈRE ligne est un sceau qui couvre exactement le reste (RÉÉCRIT ici d'après la description de `neutralisation/audit-secrets.py`, sans l'importer)."""
    if not octets.endswith(b"\n"):
        return False
    corps, sep, derniere = octets[:-1].rpartition(b"\n")
    if not sep:
        return False
    m = re.fullmatch(r"== SCEAU sha256:([0-9a-f]{64}) — neutralisation/audit-secrets\.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==",
                     derniere.decode("utf-8", errors="replace"))
    return bool(m) and hashlib.sha256(corps + b"\n").hexdigest() == m.group(1)


def dimensions_png(octets):
    if octets[:8] != b"\x89PNG\r\n\x1a\n" or octets[12:16] != b"IHDR":
        return None
    return struct.unpack(">II", octets[16:24])


# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — chaque extracteur sur un cas VRAI et un cas FAUX (abandon si un bras manque)")
bras("chemins_table — positif : deux chemins sur une ligne", ["a/b.ts", "c/d.py"], chemins_table("| `a/b.ts`, `c/d.py` | pour |"))
bras("chemins_table — négatif : une ligne qui n'est pas un tableau, un répertoire, un gabarit", [], chemins_table("`a/b.ts` seul\n| `docs/x/` | rép |\n| `docs/x/<porte>.txt` | gabarit |"))
extrait_test = "ROUGE  t1\nROUGE  t2\nVERT   t3\nÉCHEC  t1\n  1ʳᵉ ligne : AssertionError: x\nÉCHEC  t2\n  1ʳᵉ ligne : TypeError: y\n# ROUGE ne compte pas\n xVERT   z"
bras("lignes_verdict — positif : 2 rouges, 1 vert, 2 échecs", (2, 1, 2), tuple(len(x) for x in lignes_verdict(extrait_test)))
bras("premieres_lignes_echec — positif : les deux premières lignes, une assertion et un plantage", ["AssertionError: x", "TypeError: y"], premieres_lignes_echec(extrait_test))
bras("premieres_lignes_echec — négatif : un extrait sans échec", [], premieres_lignes_echec("VERT   t3"))
js = 'describe("A", () => {\n  it("un", () => {});\n  // it("commenté", () => {});\n  it("deux \\"q\\"", () => {});\n});\ndescribe("B", () => {\n  it("trois", () => {});\n});'
bras("titres_tests — positif : trois tests, le commentaire n'ouvre pas, un guillemet échappé", [("A", "un"), ("A", 'deux "q"'), ("B", "trois")], titres_tests(js))
bras("titres_tests — négatif : source sans test", [], titres_tests("const x = 1;"))
py = 'A = "fichier.ts"\ncible("L1", A, "x", "y", {})\ncible("L2", A, "a" "b", "c", {}, genre="suppression")\nautre("pas une cible")\n# cible("commentaire", A, "x", "y", {})\ns = "cible(\\"chaine\\")"'
bras("appels_cible — positif : 2 appels (l'AST ignore le commentaire, la chaîne et un autre nom), constantes résolues", [("L1", "fichier.ts", "x", "y", "substitution"), ("L2", "fichier.ts", "ab", "c", "suppression")], appels_cible(py))
bras("appels_cible — négatif : source sans appel", [], appels_cible("x = 1"))
bras("chemins_relatifs — positif : un chemin absent de la racine et présent sous un paquet", (2, ["src/a.ts"]),
     chemins_relatifs('x = "src/a.ts"\ny = "apps/pro/src/b.ts"', {"apps/pro/src/b.ts"}, ["apps/pro"], {"apps/pro/src/a.ts", "apps/pro/src/b.ts"}))
bras("chemins_relatifs — négatif : un chemin écrit depuis la racine, un chemin qui n'existe nulle part", (2, []),
     chemins_relatifs('x = "apps/pro/src/b.ts"\ny = "src/nulle-part.ts"', {"apps/pro/src/b.ts"}, ["apps/pro"], {"apps/pro/src/b.ts"}))
corps = b"ligne\n"
sceau = ("== SCEAU sha256:" + hashlib.sha256(corps).hexdigest() + " — neutralisation/audit-secrets.py : cette sortie s'exclut de l'audit tant que ce sceau couvre ses octets ==\n").encode("utf-8")
bras("sceau_valide — positif : un sceau qui couvre exactement le reste", True, sceau_valide(corps + sceau))
bras("sceau_valide — négatif : un octet de plus avant le sceau", False, sceau_valide(b"ligne!\n" + sceau))
png = b"\x89PNG\r\n\x1a\n" + struct.pack(">I", 13) + b"IHDR" + struct.pack(">II", 1280, 800)
bras("dimensions_png — positif : 1280 × 800", (1280, 800), dimensions_png(png))
bras("dimensions_png — négatif : pas un PNG", None, dimensions_png(b"GIF89a" + b"\x00" * 30))
bras("entier — positif : espace fine insécable de milliers", 1748, entier("1 748"))
bras("section — positif/négatif : la section est coupée au `## ` suivant", ("## A x\nl1\nl2", ""), (section("## A x\nl1\nl2\n## B y\nl3", "A "), section("## A x\nl1", "Z")))
print(f"   calibration : {bras_calibration[0]} bras, {bras_calibration[1]} manqué(s)")
if bras_calibration[1]:
    sys.exit("CALIBRATION MANQUÉE — l'instrument est faux, aucune mesure n'est valable")

# ── Les textes lus à la clôture de D331 ──────────────────────────────────────────────────────────────────
TXT = show(FIN, CONT)
SEC = section(TXT, "Session du 13/10/2026 — D331 ")
SEC_TXT = nettoyer(norm(SEC))
PLAT = aplati(nettoyer(norm(TXT)))
print(f"\n== TEXTES — `{CONT}` à {FIN} : {len(TXT.split(chr(10)))} lignes · section D331 : {len(SEC.split(chr(10)))} lignes")
ctl("Q00", "la section D331 existe et n'est pas vide (sinon tous les attendus lus dedans sont vides)", True, len(SEC.split("\n")) > 100)

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# X — l'ÉTAT VIVANT
print("\n== X — l'état vivant (git)")
head = git("rev-parse", "HEAD").decode().strip()
ctl("X1", "`origin/main` contient la clôture de D331", True, subprocess.run(["git", "merge-base", "--is-ancestor", FIN, "origin/main"], capture_output=True).returncode == 0)
ctl("X2", "le parent du commit d'ouverture de CE lot est la clôture de D331", git("rev-parse", FIN).decode().strip(), git("rev-parse", OUV332 + "^").decode().strip())
ctl("X3", "le commit d'ouverture de CE lot ne contient que sa table", ["docs/preuves/D332/table-ouverture.md"], noms_diff(OUV332 + "^", OUV332))
ctl("X4", "`HEAD` est le commit d'ouverture ou un commit qui ne touche que `docs/preuves/D332/`", True,
    subprocess.run(["git", "merge-base", "--is-ancestor", OUV332, "HEAD"], capture_output=True).returncode == 0
    and all(f.startswith("docs/preuves/D332/") for f in noms_diff(OUV332, "HEAD")))
suivis = [l for l in git("status", "--porcelain").decode("utf-8").split("\n") if l and not l.startswith("??")]
ctl("X5", "aucun fichier suivi modifié", [], suivis)
non_suivis = [l[3:] for l in git("status", "--porcelain", "--untracked-files=all").decode("utf-8").split("\n") if l.startswith("??")]
ctl("X6", "tout fichier non suivi est sous `docs/preuves/D332/`", [], [f for f in non_suivis if not f.startswith("docs/preuves/D332/")])
ctl("X7", "aucun stash", "", git("stash", "list").decode().strip())
ctl("X8", "branche `main`", "main", git("rev-parse", "--abbrev-ref", "HEAD").decode().strip())

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# P — la PROVENANCE de D331
print("\n== P — la provenance de D331")
rev = git("rev-list", "--reverse", f"{DEPART}..{FIN}").decode().split()
ctl("P1", "le lot compte 17 commits (le tableau de l'ordre des commits en écrit 17 lignes)", 17, len(rev))
sujets = {c[:7]: git("log", "-1", "--format=%s", c).decode().strip() for c in rev}
ctl("P2", "chaque commit du lot porte « (rang-37): D331 » dans son sujet", [], [c for c, s in sujets.items() if "(rang-37): D331" not in s])
ordre_sha = []
for l in SEC.split("\n"):
    m = re.match(r"^\| (\d+) \| (?:`([0-9a-f]{7})`|\(([^)]*)\)) \|", l)
    if m and 1 <= int(m.group(1)) <= 17 and l.count("|") >= 4:
        ordre_sha.append(m.group(2) or m.group(3))
ctl("P3", "le tableau « l'ordre des commits » de la section : 17 lignes lues (les 15 premières avec un SHA, les 2 dernières « (celui-ci) » et « (le suivant) »)", (15, 2), (sum(1 for x in ordre_sha if re.fullmatch(r"[0-9a-f]{7}", x or "")), sum(1 for x in ordre_sha if not re.fullmatch(r"[0-9a-f]{7}", x or ""))))
ctl("P4", "les 15 SHA du tableau sont ceux de `git rev-list`, dans l'ordre", [c[:7] for c in rev[:15]], [x for x in ordre_sha if re.fullmatch(r"[0-9a-f]{7}", x or "")])
ctl("P5", "le premier commit est la table SEULE et son parent est la clôture de D330", (["docs/preuves/D331/table-ouverture.md"], git("rev-parse", DEPART).decode().strip()),
    (noms_diff(rev[0] + "^", rev[0]), git("rev-parse", rev[0] + "^").decode().strip()))
auto = [c for c in rev if set(noms_diff(c + "^", c)) & set(AUTORITES)]
ctl("P6", "le premier commit qui touche un `.md` d'autorité est la première écriture de Ko, et il ne touche que `ZWADJ_CONTINUITE.md`", (KO1, [CONT]), (auto[0][:7], noms_diff(auto[0] + "^", auto[0])))
ctl("P7", "la lecture adverse ET la première passe D277 précèdent ce commit", (True, True), (rev.index(git("rev-parse", LECT).decode().strip()) < rev.index(auto[0]), rev.index(git("rev-parse", PASSE1).decode().strip()) < rev.index(auto[0])))

# Le texte de Ko (six points) est identique à la première écriture et à la clôture
def bloc_ko(texte):
    m = re.search(r"\*\*Texte proposé par le relecteur, adopté par Ko tel quel \(13/10/2026\) :\*\*\n\n((?:« 1\.|\d\.|« ).*?)(?:\n\n)", texte, re.S)
    return m.group(1) if m else None
b1, b2 = bloc_ko(show(KO1, CONT)), bloc_ko(TXT)
ctl("P8", "le texte de Ko du 13/10 (six points) lu à sa première écriture : présent, 6 points numérotés", (True, 6), (b1 is not None, len(re.findall(r"^(?:« )?\d\. ", b1 or "", re.M))))
ctl("P9", "il est IDENTIQUE, mot pour mot, à la clôture", b1, b2)

# Chaque fichier du diff est déclaré par une version de la table strictement antérieure à son ajout
commits_table = git("log", "--reverse", "--format=%H", f"{DEPART}..{FIN}", "--", f"{PD}/table-ouverture.md").decode().split()
versions = [(c, set(chemins_table(show(c, f"{PD}/table-ouverture.md")))) for c in commits_table]
fichiers = noms_diff(DEPART, FIN)


def premier_declarant(chemin):
    for c, ens in versions:
        if chemin in ens:
            return c
    return None


def premier_ajout(chemin):
    sortie = git("log", "--reverse", "--format=%H", f"{DEPART}..{FIN}", "--", chemin).decode().split()
    return sortie[0] if sortie else None


declare_apres = []
non_declares = []
for f in fichiers:
    if f == f"{PD}/table-ouverture.md":
        continue
    dec, aj = premier_declarant(f), premier_ajout(f)
    if dec is None:
        non_declares.append(f)
    elif rev.index(dec) > rev.index(aj):
        declare_apres.append(f)
    elif dec == aj and f not in (CONT, AGENTS, BACKLOG) and rev.index(dec) == rev.index(aj):
        declare_apres.append(f)  # déclaré par le commit même qui l'ajoute : pas strictement antérieur
ctl("P10", f"`git diff {DEPART}..{FIN}` : {len(fichiers)} fichiers ; aucun n'est absent de la table (chemins COMPLETS, extensions comprises)", [], non_declares)
ctl("P11", "chaque fichier est déclaré par une version de la table STRICTEMENT antérieure au commit qui l'ajoute (ou le déclare dès l'ouverture)", [], declare_apres)
bras("premier_declarant — positif : un fichier de la table de base (un conditionnel) est déclaré par le premier commit de la table", commits_table[0], premier_declarant("neutralisation/neutralize-r33.py"))
bras("premier_declarant — négatif : un chemin que la table ne cite pas", None, premier_declarant("apps/api/src/inventé-pour-la-calibration.ts"))
declarees = set().union(*[ens for _, ens in versions])
absents = sorted(declarees - set(fichiers))
constat("P-A", f"{len(absents)} chemins DÉCLARÉS par la table de D331 (base, conditionnels, extensions) n'existent pas au diff — les « conditionnels dits absents » : {absents}")
def resoudre(jeton):
    """Un nom écrit sans son dossier (« `neutralize-r30.py` » après « `neutralisation/neutralize-r32.py` ») se résout contre les chemins DÉCLARÉS : un seul candidat, sinon il reste tel quel (l'écart se voit)."""
    if "/" in jeton:
        return jeton
    candidats = [d for d in declarees if d.endswith("/" + jeton)]
    return candidats[0] if len(candidats) == 1 else jeton


def chemins_cites(texte):
    return sorted({resoudre(j) for j in re.findall(r"`([^`]+\.(?:ts|tsx|py|txt|md))`", texte)})


bras("chemins_cites — positif : un nom écrit sans son dossier se résout contre les chemins déclarés", ["neutralisation/neutralize-r30.py", "neutralisation/neutralize-r32.py"], chemins_cites("`neutralisation/neutralize-r32.py` et `neutralize-r30.py`"))
bras("chemins_cites — négatif : un nom que la table ne déclare pas reste tel quel (l'écart se verrait)", ["inconnu-de-la-table.ts"], chemins_cites("`inconnu-de-la-table.ts`"))
bloc_absents = re.search(r"\*\*Absents\*\* \(la condition ne s'est pas produite\) : (.*?)\n", SEC)
dits_absents = chemins_cites(bloc_absents.group(1)) if bloc_absents else None
ctl("P16", "les « conditionnels dits absents » de la section (paragraphe « fichiers conditionnels de la table ») sont EXACTEMENT les chemins déclarés par la table et absents du diff", dits_absents, absents)
bloc_existent = re.search(r"\*\*Existent\*\* : (.*?)\. \*\*Absents\*\*", SEC, re.S)
dits_existent = chemins_cites(bloc_existent.group(1)) if bloc_existent else None
ctl("P17", "…et les « conditionnels dits existants » sont ceux que le diff contient et que la table déclarait comme conditionnels", dits_existent, sorted(f for f in fichiers if f in {"docs/preuves/D331/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt", "docs/preuves/D331/lecture-adverse/defauts-instrument.txt", "neutralisation/neutralize-r33.py"}))
ctl("P12", "les fichiers du diff qui ne sont ni sous `docs/preuves/D331/` ni un `.md` d'autorité sont tous dans la table (le code, les tests, les harnais)", [], [f for f in fichiers if not f.startswith(PD + "/") and f not in AUTORITES and f not in declarees])
ctl("P13", "AUCUN fichier de l'API, des types, du client d'API, des migrations, ni `docker-compose.yml` au diff (« aucune migration, aucun contrat d'API neuf »)", [],
    [f for f in fichiers if f.startswith(("apps/api/", "packages/types/", "packages/api-client/", "packages/i18n/")) or "prisma" in f or f == "docker-compose.yml"])
ctl("P14", "le commit de code porte 9 fichiers, celui des harnais 2, celui des pièces 40 (les nombres écrits dans le tableau des commits)",
    (9, 2, 40), (len(noms_diff(CODE + "^", CODE)), len(noms_diff(HARN + "^", HARN)), len(noms_diff(PIECES + "^", PIECES))))
ctl("P15", "le diff de la clôture d'autorité (`19cd3b0`) à l'ouverture compte 67 fichiers, comme le contrôle de fin de lot l'écrit ; à `dd41fbd` il en compte 3 de plus (les trois pièces finales)",
    (67, 70), (len(noms_diff(DEPART, CLOT)), len(fichiers)))

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# R — le TABLEAU DES CHEMINS (rouges contre l'état d'avant, verts) contre ses pièces
print("\n== R — le tableau des chemins de D331 (rouges contre l'état d'avant, verts) contre ses pièces")
rows = {}
for l in SEC.split("\n"):
    m = re.match(r"^\| \*\*(édition|suppression depuis l'assistant|entrée de la liste|création)\*\*", l)
    if m:
        cells = [c.strip() for c in l.strip().strip("|").split("|")]
        rouges_t = re.search(r"(\d+) rouges?", cells[1])
        verts_t = re.search(r"(\d+) verts?", cells[1])
        verts_apres = re.search(r"(\d+) verts?", cells[2])
        fichiers_t = re.findall(r"`([^`]+)`", cells[3])
        rows[m.group(1)] = (int(rouges_t.group(1)), int(verts_t.group(1)), int(verts_apres.group(1)), fichiers_t)
ctl("R1", "le tableau de la section : quatre chemins lus", ["création", "entrée de la liste", "suppression depuis l'assistant", "édition"], sorted(rows))
total_rouges, total_verts_apres = 0, 0
titres_par_chemin = {}
for chemin, (r_t, v_t, va_t, pieces) in sorted(rows.items()):
    fr, fv = pieces[0], pieces[1]
    ext_r = show(FIN, f"{PD}/{fr}")
    ext_v = show(FIN, f"{PD}/{fv}")
    rouges, verts, echecs = lignes_verdict(ext_r)
    rouges_v, verts_v, echecs_v = lignes_verdict(ext_v)
    premieres = premieres_lignes_echec(ext_r)
    k = chemin[:4]
    ctl(f"R2{k}", f"« {chemin} » : rouges, verts de l'extrait avant, verts de l'extrait après — comptés dans les pièces = écrits dans le tableau", (r_t, v_t, va_t), (len(rouges), len(verts), len(verts_v)))
    ctl(f"R3{k}", f"« {chemin} » : l'extrait « après » n'a AUCUN rouge, et ses titres sont ceux de l'extrait « avant » (les mêmes tests)", (0, sorted(rouges + verts)), (len(rouges_v), sorted(verts_v)))
    ctl(f"R4{k}", f"« {chemin} » : autant de blocs ÉCHEC que de rouges, et la 1ʳᵉ ligne de chacun est une `AssertionError` (une morsure, D304/D316)", (r_t, r_t), (len(echecs), sum(1 for p in premieres if p.startswith("AssertionError"))))
    ent = re.search(r"comptes du chemin : (\d+) vert\(s\) · (\d+) rouge\(s\) · (\d+) morsure\(s\)", ext_r)
    ctl(f"R5{k}", f"« {chemin} » : l'en-tête « comptes du chemin » de l'extrait avant dit les mêmes nombres", (v_t, r_t, r_t), tuple(int(x) for x in ent.groups()) if ent else None)
    total_rouges += len(rouges)
    total_verts_apres += len(verts_v)
    titres_par_chemin[chemin] = sorted(rouges + verts)
    # la ligne de résumé du journal entier
    resume_r = re.search(r"RÉSUMÉ DU JOURNAL ENTIER.*?: (.*)", ext_r)
    resume_v = re.search(r"RÉSUMÉ DU JOURNAL ENTIER.*?: (.*)", ext_v)
    if chemin == "édition":
        ctl("R6", "les résumés de journal entier : avant « Tests 12 failed | 7 passed (19) » ; après « Tests 19 passed (19) » (le même fichier de 19 tests)",
            ("Test Files  1 failed (1) | Tests  12 failed | 7 passed (19)", "Test Files  1 passed (1) | Tests  19 passed (19)"), (resume_r.group(1) if resume_r else None, resume_v.group(1) if resume_v else None))
ctl("R7", "la somme des rouges des quatre chemins = 12 = « 12 échecs » écrits dans la section", (12, True), (total_rouges, bool(re.search(r"\b12 échecs\b", PLAT))))
# les titres des extraits sont ceux du fichier de test final, à `1b11e41` et à la clôture
test_ma_salle = "apps/pro/src/venues/ma-salle-relecture.test.tsx"
titres_fichier = [f"{d} > {t}" for d, t in titres_tests(show(CODE, test_ma_salle))]
ctl("R8", "le fichier `ma-salle-relecture.test.tsx` à `1b11e41` compte 19 tests (= « Tests 19 » du journal) répartis 7 · 5 · 5 · 2 sur ses quatre blocs `describe`", (19, [7, 5, 5, 2]),
    (len(titres_fichier), [sum(1 for x in titres_fichier if x.startswith(p)) for p in ("« Ma salle » — ÉDITION", "« Ma salle » — SUPPRESSION", "« Ma salle » — ENTRÉE", "« Ma salle » — UNE SEULE SOURCE")]))
extraits = sorted(sum((titres_par_chemin[c] for c in ("édition", "suppression depuis l'assistant", "entrée de la liste")), []))
ctl("R9", "les 17 titres des extraits (édition + suppression + entrée) sont EXACTEMENT les titres du fichier de test, moins les 2 de la garde de SOURCE (comparaison après aplatissement des blancs)",
    sorted(aplati(x) for x in titres_fichier if "UNE SEULE SOURCE" not in x), sorted(aplati(x) for x in extraits))
ctl("R10", "le fichier de test n'a pas bougé entre le commit de code et la clôture (même blob)", blob(CODE, test_ma_salle), blob(FIN, test_ma_salle))
test_creation = "apps/pro/src/venues/create-venue-page.test.tsx"
tit_cre_apres = [f"{d} > {t}" for d, t in titres_tests(show(CODE, test_creation)) if "la salle créée apparaît" in (d or "")]
tit_cre_avant = [f"{d} > {t}" for d, t in titres_tests(show(DEPART, test_creation)) if "la salle créée apparaît" in (d or "")]
_, verts_cre, _ = lignes_verdict(show(FIN, f"{PD}/rouge/temoin-creation-avant-correctif.txt"))
ctl("R11", "création : le témoin (4 verts contre l'état d'avant) a pour titres les 4 tests du bloc « la salle créée apparaît » du fichier FINAL ; le fichier d'avant en comptait 3 (« +1 test à la création »)",
    (sorted(aplati(x) for x in tit_cre_apres), 3), (sorted(aplati(x) for x in verts_cre), len(tit_cre_avant)))
# le code « d'avant »
prod = ["apps/pro/src/shell/pro-venues-context.tsx", "apps/pro/src/venues/venue-list-page.tsx", "apps/pro/src/venues/edit-venue-page.tsx"]
ctl("R12", "« le code d'AVANT » : les trois fichiers de production du rouge sont identiques à `d19935c` (d'où le rouge a été mesuré) et à la clôture de D330", True,
    all(blob(EXT4, p) == blob(DEPART, p) for p in prod))
ctl("R13", "…et ils DIFFÈRENT du code du lot (`1b11e41`) : le rouge a bien été mesuré contre autre chose que le correctif", True, all(blob(EXT4, p) != blob(CODE, p) for p in prod))
ctl("R14", "…et `d19935c` ne diffère de la clôture de D330 par AUCUN fichier hors `docs/` (la phrase EXACTE de l'en-tête de chaque rouge : « par AUCUN fichier hors docs/ »)", [], [f for f in noms_diff(DEPART, EXT4) if not f.startswith("docs/")])
ctl("R14b", "…à la lettre, la phrase est inexacte : les `.md` d'autorité sont à la RACINE, hors de `docs/` ; leur écart (ci-dessus) est le seul — aucun fichier de code, de test, de harnais ni de migration (c'est ce que la phrase voulait dire)", [],
    [f for f in noms_diff(DEPART, EXT4) if not f.startswith("docs/") and f not in AUTORITES])
ctl("R14c", "…et l'en-tête de chaque rouge porte bien cette phrase (la lettre qu'on vient de contrôler)", (4, 4), (sum(1 for c in ("rouge/rouge-edition.txt", "rouge/rouge-suppression.txt", "rouge/rouge-entree.txt", "rouge/temoin-creation-avant-correctif.txt") if "AUCUN fichier hors docs/" in show(FIN, f"{PD}/{c}")), 4))
# la chaîne des rouges lue dans la section
ctl("R15", "la section écrit « 12 échecs, tous des `AssertionError` » ET « 5 rouges / 2 verts », « 4 / 1 », « 3 / 2 » : les trois couples relus dans le tableau",
    {"édition": (5, 2), "suppression depuis l'assistant": (4, 1), "entrée de la liste": (3, 2)}, {k: (v[0], v[1]) for k, v in rows.items() if k != "création"})
ctl("R16", "+30 tests = 19 (fichier neuf) + 10 (fournisseur) + 1 (création) : les 10 du fournisseur recomptés (`it(` en début de ligne) entre `afdfcb1` et `1b11e41`", 10,
    len(titres_tests(show(CODE, "apps/pro/src/shell/pro-venues-context.test.tsx"))) - len(titres_tests(show(DEPART, "apps/pro/src/shell/pro-venues-context.test.tsx"))))

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# G — les PORTES de D331 contre leurs extraits
print("\n== G — les portes de D331 contre leurs extraits")
portes = {p: show(FIN, f"{PD}/portes/{p}.txt") for p in ("typecheck", "lint", "test", "build", "test-int", "e2e")}
codes = {p: re.search(r"code de sortie RÉEL : (\d+)", t) for p, t in portes.items()}
ctl("G1", "les six portes : code de sortie RÉEL 0 dans l'en-tête de chaque extrait", [0] * 6, [int(codes[p].group(1)) if codes[p] else None for p in portes])
ctl("G2", "les six extraits disent que le journal brut est HORS dépôt (empreinte, octets, lignes) — rien n'est versé qui porte un jeton", [True] * 6, ["journal brut (hors dépôt)" in t for t in portes.values()])
done = {p: re.search(r"« …: Done » : (\d+) \(attendu : (\d+)", portes[p]) for p in ("typecheck", "lint", "build")}
ctl("G3", "typecheck, lint, build : « Done » mesuré = attendu écrit dans l'extrait, et la section écrit 8 · 8 · 4", ([8, 8, 4], [8, 8, 4]), ([int(done[p].group(1)) for p in ("typecheck", "lint", "build")], [int(done[p].group(2)) for p in ("typecheck", "lint", "build")]))
ctl("G4", "typecheck et build : « `error TS` : 0 » dans l'extrait", [0, 0], [int(re.search(r"`error TS` : (\d+)", portes[p]).group(1)) for p in ("typecheck", "build")])
resumes = re.findall(r"résumé \d : fichiers passés (\d+) · en échec (\d+) · total (\d+) ; tests passés (\d+) · en échec (\d+) · total (\d+)", portes["test"])
sec_test = re.search(r"api-client (\d+)/(\d+) · api (\d+)/(\d+) · client (\d+)/(\d+) · pro (\d+)/(\d+)", SEC_TXT)
ctl("G5", "`pnpm test` : 4 résumés vitest lus ; (tests passés, fichiers passés) par paquet = ceux de la section (api-client · api · client · pro)",
    [(int(sec_test.group(i)), int(sec_test.group(i + 1))) for i in (1, 3, 5, 7)], [(int(r[3]), int(r[0])) for r in resumes])
somme_tests = sum(int(r[3]) for r in resumes)
somme_fichiers = sum(int(r[0]) for r in resumes)
ctl("G6", "…somme 1 748 tests · 137 fichiers (la section), 0 échec", (1748, 137, 0), (somme_tests, somme_fichiers, sum(int(r[4]) + int(r[1]) for r in resumes)))
# base de D330 : ses pièces (lecture-portes.txt)
lp330 = show(FIN, "docs/preuves/D330/passe-r36b-20261013-0106/lecture-portes.txt")
base_tests = [int(x) for x in re.findall(r"^\s+Tests (\d+) passed", lp330.split("== testint")[0], re.M)]
base_fich = [int(x) for x in re.findall(r"^\s+Test Files (\d+) passed", lp330.split("== testint")[0], re.M)]
ctl("G7", "la base de D330 relue dans SA pièce (`lecture-portes.txt`, `== test`) : 1 718 tests · 136 fichiers ; l'écart de D331 = +30 · +1", (1718, 136, 30, 1), (sum(base_tests), sum(base_fich), somme_tests - sum(base_tests), somme_fichiers - sum(base_fich)))
# comptage de fichiers de test dans git, deux SHA (calibré sur D330 : 37 fichiers pour pro)
VITEST_DEFAUT = r"\.(test|spec)\.[cm]?[jt]sx?$"  # `**/*.{test,spec}.?(c|m)[jt]s?(x)` : le défaut de vitest 3 quand aucun `include` n'est écrit (pro, client, api-client)


def n_tests(sha, motif, *prefixes):
    return len([f for f in liste_arbre(sha, *prefixes) if re.search(motif, f)])
ctl("G8", "les fichiers de test de `apps/pro` : 37 à `afdfcb1` (= « 37 » du journal de D330) et 38 à `1b11e41` — comptés dans git, indépendamment des journaux", (37, 38),
    (n_tests(DEPART, VITEST_DEFAUT, "apps/pro"), n_tests(CODE, VITEST_DEFAUT, "apps/pro")))
ctl("G9", "…et les autres paquets ne bougent pas : api (spec) 65, client 29, api-client 5, int 38 à `afdfcb1` ET à `1b11e41`",
    (65, 29, 5, 38, True), (n_tests(CODE, r"\.spec\.ts$", "apps/api/src", "apps/api/prisma"), n_tests(CODE, VITEST_DEFAUT, "apps/client"), n_tests(CODE, VITEST_DEFAUT, "packages/api-client"),
                            n_tests(CODE, r"\.int-spec\.ts$", "apps/api/test"),
                            (n_tests(DEPART, r"\.spec\.ts$", "apps/api/src", "apps/api/prisma"), n_tests(DEPART, VITEST_DEFAUT, "apps/client"), n_tests(DEPART, r"\.int-spec\.ts$", "apps/api/test")) ==
                            (n_tests(CODE, r"\.spec\.ts$", "apps/api/src", "apps/api/prisma"), n_tests(CODE, VITEST_DEFAUT, "apps/client"), n_tests(CODE, r"\.int-spec\.ts$", "apps/api/test"))))
m_int = re.search(r"résumé : \[\(\((\d+), (\d+), (\d+)\), \((\d+), (\d+), (\d+)\)\)\]", portes["test-int"])
ctl("G10", "`test:int` : 468 sur 468 · 38 fichiers sur 38 (extrait) = la base de D330 (pièce `lecture-portes.txt`, `== testint`)", (468, 38, 468, 38),
    (int(m_int.group(6)), int(m_int.group(3)), int(re.findall(r"^\s+Tests (\d+) passed", lp330.split("== testint")[1], re.M)[0]), int(re.findall(r"^\s+Test Files (\d+) passed", lp330.split("== testint")[1], re.M)[0])))
m_e2e = re.search(r"résumé Playwright : (\d+) skipped · (\d+) passed", portes["e2e"])
spec_r37 = show(CODE, "e2e/specs/r37-ma-salle.e2e.ts")
n_e2e = len(re.findall(r"^\s*test\(", spec_r37, re.M))
ctl("G11", "`test:e2e` : 53 passés · 1 ignoré (extrait) ; la base de D330 est 48 · 1 ; le lot ajoute `r37-ma-salle.e2e.ts` dont les `test(` recomptés dans git sont 5", (53, 1, 5), (int(m_e2e.group(2)), int(m_e2e.group(1)), n_e2e))
ctl("G12", "…et 53 = 48 + 5 ; la base 48 est lue dans la pièce de D330", True,
    int(m_e2e.group(2)) == 48 + n_e2e and bool(re.search(r"48 passed", show(FIN, "docs/preuves/D330/passe-r36b-20261013-0106/lecture-portes.txt"))))
# État machine
em = show(FIN, f"{PD}/portes/etat-machine.txt")
ram = re.search(r"médiane (\d[\d\s]*)\s*Mo[^0-9]{0,40}barre[^0-9]{0,10}(\d[\d\s]*)", norm(em))
ctl("G13", "l'état machine dit « 4 125 Mo contre 4 579 (écart −454) » : l'arithmétique est juste (4 579 − 4 125 = 454) et le texte de l'en-tête le porte", (454, True), (4579 - 4125, "4 125 Mo contre 4 579" in norm(em)))
ctl("G14", "…et la section écrit que le paquet « n'est PAS une fenêtre certifiante » et qu'AUCUNE durée n'en est comparée", True, "n'est donc PAS une fenêtre certifiante" in nettoyer(norm(em)) + SEC_TXT or "PAS une certification" in SEC_TXT or "non certifiant" in SEC_TXT)
ctl("G15", "les trois extraits les plus longs ne portent aucune durée COMPARÉE à celle de D330 (« DONNÉE NON CERTIFIANTE »)", True, all("NON CERTIFIANTE" in portes[p] for p in portes))

# V — les empreintes des onze fichiers de code (état VIVANT)
print("\n== V — les empreintes des onze fichiers de code de D331, recalculées sur l'arbre de travail")
emp = re.findall(r"^([0-9a-f]{64})  (\S+)$", em, re.M)
ctl("V1", "l'état machine liste ONZE empreintes (les onze fichiers de code du lot)", 11, len(emp))
vivant = []
for h, p in emp:
    if os.path.exists(p):
        vivant.append((hashlib.sha256(open(p, "rb").read()).hexdigest() == h, p))
    else:
        vivant.append((False, p))
ctl("V2", "chaque empreinte relevée à D331 est celle du fichier de l'arbre de travail d'AUJOURD'HUI (rien n'a bougé depuis)", [], [p for ok, p in vivant if not ok])
ctl("V3", "…et ces onze fichiers sont ceux que les commits de code (`1b11e41`, `ea213c0`) ont ajoutés ou modifiés", sorted(p for _, p in emp), sorted(set(noms_diff(CODE + "^", CODE)) | set(noms_diff(HARN + "^", HARN))))

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# N — les CAMPAGNES, la cible C-1 de r33, le harnais neuf
print("\n== N — les campagnes de D331, la cible C-1 de `r33` (extension 4, « une ligne » contre deux), le harnais neuf")
r37_src = show(HARN, "neutralisation/neutralize-r37.py")
cibles37 = appels_cible(r37_src)
camp37 = show(FIN, f"{PD}/neutralisation/r37-campagne.txt")
m37 = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\) · (\d+) muette\(s\) · (\d+) non mesurée\(s\)", camp37)
ctl("N1", "`r37` : 21 mordues sur 21 jouées, 0 muette, 0 non mesurée (sortie versée) ; les appels `cible(` du harnais, comptés par l'AST à `ea213c0` = 21", (21, 21, 0, 0, 21),
    (int(m37.group(1)), int(m37.group(2)), int(m37.group(3)), int(m37.group(4)), len(cibles37)))
ids37 = [c[0].split(".")[0] for c in cibles37]
ctl("N2", "…répartis P-1 à P-10 · E-1 à E-5 · L-1 à L-3 · D-1 à D-3 (la section) : les libellés du harnais portent ces identifiants", (10, 5, 3, 3), tuple(sum(1 for i in ids37 if i.startswith(p + "-")) for p in "PELD"))
viol = [c[0][:30] for c in cibles37 if c[4] == "substitution" and c[2] is not None and c[3] is not None and c[3] in c[2]]
inexploitables = [c[0][:30] for c in cibles37 if None in c[:4]]
ctl("N3", "« un remplacement n'est JAMAIS une sous-chaîne de son ancre » (D325) : sur les 21 cibles de `r37`, aucune substitution ne remplace par une sous-chaîne de son ancre (recalculé ici sur le fichier)", ([], []), (viol, inexploitables))
mesures_cal = len(re.findall(r"^  calibration ✓", camp37, re.M))
ctl("N4", "`r37` : la sortie versée porte « calibration : 10 bras · 0 manqué(s) » et 10 lignes `calibration ✓`", (10, True), (mesures_cal, "calibration : 10 bras · 0 manqué(s)" in camp37))
camp_t = show(FIN, f"{PD}/neutralisation/campagnes-touchees.txt")
lignes_camp = re.findall(r"^neutralize-(r\d+)\.py\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)\s+(\d+)$", camp_t, re.M)
ctl("N5", "campagnes touchées : r30 8/8 · r32 65/65 · r37 21/21 — lignes du tableau de la sortie (sortie 0, 0 muette, 0 non mesurée)", [("r30", 8, 8), ("r32", 65, 65), ("r37", 21, 21)], [(a, int(c), int(d)) for (a, b, c, d, e, f, g) in lignes_camp])
mm = re.search(r"MESURÉ : (\d+) garde\(s\) mordue\(s\) · (\d+) muette\(s\)/erreur\(s\) · (\d+) non mesurée\(s\) · (\d+) campagne\(s\) · (\d+)s", camp_t)
ctl("N6", "…total 94 = 8 + 65 + 21, 3 campagnes ; la somme des durées de ligne (64 + 623 + 231 = 918) = « 918s » du total (le résumé de la section dit 919 s : la durée du processus entier)", (94, 3, 918, 918),
    (int(mm.group(1)), int(mm.group(4)), sum(int(g) for (a, b, c, d, e, f, g) in lignes_camp), int(mm.group(5))))
ctl("N7", "…et les 94 sont écrits dans la section (« 94 gardes »)", True, "94 gardes" in SEC_TXT)
# r33
r33_src_apres = show(HARN, "neutralisation/neutralize-r33.py")
r33_src_avant = show(DEPART, "neutralisation/neutralize-r33.py")
cibles33 = appels_cible(r33_src_apres)
camp33 = show(FIN, f"{PD}/neutralisation/r33-campagne.txt")
m33 = re.search(r"(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\) · (\d+) muette\(s\) · (\d+) non mesurée\(s\) · (\d+) non jouée\(s\)", camp33)
ctl("N8", "`r33` rejouée en entier (`--int`) : 102 sur 102, 0 muette, 0 non mesurée, 0 non jouée ; les appels `cible(` du harnais, comptés par l'AST à `ea213c0` = 102", (102, 102, 0, 0, 0, 102),
    (int(m33.group(1)), int(m33.group(2)), int(m33.group(3)), int(m33.group(4)), int(m33.group(5)), len(cibles33)))
ctl("N9", "…et l'avant (`afdfcb1`) en comptait déjà 102 : la réorientation ne crée ni ne retire de cible", 102, len(appels_cible(r33_src_avant)))
d33 = git("diff", "--numstat", DEPART, FIN, "--", "neutralisation/neutralize-r33.py").decode().split()
ctl("N10", "LA RÉORIENTATION DE C-1 : le diff de `neutralize-r33.py` entre D331 et sa clôture est de 2 lignes ajoutées et 1 retirée (= DEUX lignes touchées : la clé de mesure ajoutée ET la ligne de la cible modifiée)", ("2", "1"), (d33[0], d33[1]))
ext4 = show(FIN, f"{PD}/table-ouverture.md")
m_ext4 = re.search(r"devient les deux titres que la découverte a relevés \((une ligne|deux lignes)\)", ext4)
ctl("N11", "l'extension 4 (commitée AVANT le harnais) écrit « (une ligne) » — c'est la faute n° 5 de la section, qui dit « deux lignes » : l'écart est réel et DIT", ("une ligne", True), (m_ext4.group(1) if m_ext4 else None, bool(re.search(r"deux lignes", SEC_TXT)) and "faute" in SEC_TXT.lower() or "Un écart d'exactitude de mon propre texte" in SEC_TXT))
ctl("N12", "…et le texte de l'extension 4 n'a PAS été retouché après coup : la version de `d19935c` et celle de la clôture portent la même phrase", True,
    "(une ligne)" in show(EXT4, f"{PD}/table-ouverture.md") and "(une ligne)" in ext4)
cible_c1 = [c for c in cibles33 if c[0] and c[0].startswith("C-1.")]
cible_c1_avant = [c for c in appels_cible(r33_src_avant) if c[0] and c[0].startswith("C-1.")]
ctl("N13", "C-1 existe une fois avant et une fois après, avec la même ancre et le même remplacement (seuls ses titres attendus changent)", (1, 1, True), (len(cible_c1_avant), len(cible_c1), cible_c1[0][1:4] == cible_c1_avant[0][1:4]))
create_page = show(CODE, "apps/pro/src/venues/create-venue-page.tsx")
ctl("N14", "l'ancre de C-1 (`      reloadVenues();`) est présente UNE fois dans `create-venue-page.tsx` à `1b11e41` (l'ancre revérifiée après la refonte, D286)", 1, create_page.count(cible_c1[0][2]))
titres_creation_final = [f"{t}" for d, t in titres_tests(show(CODE, test_creation))]
nouveaux = ["le fournisseur RELIT la liste après la création", "la relecture part APRÈS la réponse de `create`"]
ctl("N15", "les DEUX titres attendus par la cible réorientée existent chacun UNE fois dans le fichier de test final (sous-chaîne)", (1, 1), tuple(sum(1 for t in titres_creation_final if n in t) for n in nouveaux))
ancien = "après la création, une navigation INTERNE vers la liste montre la nouvelle salle"
ctl("N16", "…et l'ANCIEN titre existe toujours dans le fichier (il est vert, la liste relit désormais à son entrée : le défaut décrit par la section)", 1, sum(1 for t in titres_creation_final if ancien in t))
disc = show(FIN, f"{PD}/neutralisation/r33-c1-decouverte.txt")
echecs_disc = re.findall(r"FAIL  src/venues/create-venue-page\.test\.tsx > (.*)", disc)
ctl("N17", "la découverte versée montre DEUX échecs sous C-1 (« passés 2 · en échec 2 »), et ce sont les deux titres que le harnais attend", (2, 2), (len(echecs_disc), sum(1 for n in nouveaux if any(n in e for e in echecs_disc))))
disc_ass = re.findall(r"↳ (.*)", disc)
ctl("N18", "…chacun par une `AssertionError` (« expected \"spy\" to be called 2 times, but got 1 times »)", ['AssertionError: expected "spy" to be called 2 times, but got 1 times'] * 2, disc_ass)
ctl("N19", "…et la découverte ne touche que le fichier visé : « empreintes : 19 fichier(s) ciblé(s) comparé(s) au départ · 0 différent(s) »", True, "0 différent(s) (attendu 0)" in disc and "arbre rendu à son état de départ : vérifié" in disc)
m_cles = re.findall(r'"(pro-creation(?:-reponse)?)": _vitest\("@zwadj/pro", "src/venues/create-venue-page\.test\.tsx"\)', r33_src_apres)
ctl("N20", "les deux clés de mesure `pro-creation` et `pro-creation-reponse` visent le MÊME fichier de test (la découverte joue un fichier, deux clés)", ["pro-creation", "pro-creation-reponse"], m_cles)
# le tri lancer-campagnes.py : la campagne r33 a-t-elle été retenue pour le diff de D331 ?
lc_src = show(FIN, "neutralisation/lancer-campagnes.py")
ctl("N21", "le tri `lancer-campagnes.py` lit toute chaîne `[…]\\.(ts|tsx|css|json|sql|mjs)` et la retient si `os.path.isfile(c)` — relatif à la RACINE (le motif et le test sont lus dans le fichier)", (True, True), ('CHEMIN = re.compile(r"""[\'"]([^\'"\\n]+\\.(?:ts|tsx|css|json|sql|mjs))[\'"]""")' in lc_src, "os.path.isfile(c)" in lc_src))
harnais = sorted(f for f in liste_arbre(FIN, "neutralisation") if re.fullmatch(r"neutralisation/neutralize-[^/]+\.py", f))
fichiers_arbre = set(liste_arbre(FIN))
racine_set = fichiers_arbre
code_diff = set(noms_diff(DEPART, HARN))
retenues = []
for h in harnais:
    lus = {c.replace("\\", "/") for c in CHEMIN_TRI.findall(show(FIN, h)) if c.replace("\\", "/") in racine_set}
    if lus & code_diff:
        retenues.append(os.path.basename(h))
ctl("N22", "LE TRI REJOUÉ SUR LE DIFF DE CODE DE D331 (`afdfcb1..ea213c0`, chemins de la RACINE seulement) retient exactement r30, r32, r37 — et PAS r33 (la faute n° 4 de la section)", ["neutralize-r30.py", "neutralize-r32.py", "neutralize-r37.py"], retenues)
calib_pos = [os.path.basename(h) for h in harnais if {c.replace("\\", "/") for c in CHEMIN_TRI.findall(show(FIN, h)) if c.replace("\\", "/") in racine_set} & {"apps/pro/src/shell/pro-venues-context.tsx"}]
bras("tri rejoué — positif : un diff qui touche `pro-venues-context.tsx` retient r37 (qui cite ce chemin DEPUIS LA RACINE) et PAS r33 (dont les chemins sont relatifs à son paquet)", (True, False), ("neutralize-r37.py" in calib_pos, "neutralize-r33.py" in calib_pos))
bras("tri rejoué — négatif : un diff qui ne touche rien du dépôt ne retient rien", [], [os.path.basename(h) for h in harnais if {c for c in CHEMIN_TRI.findall(show(FIN, h)) if c in racine_set} & {"fichier/qui-n-existe-pas.ts"}])
# l'union (b) : un harnais qui cite le fichier du diff relativement à son paquet
paquets = sorted({p for p in (f"apps/{x.split('/')[1]}" for x in fichiers_arbre if x.startswith("apps/") and x.count("/") > 1)} | {f"packages/{x.split('/')[1]}" for x in fichiers_arbre if x.startswith("packages/") and x.count("/") > 1})
union_b = []
for h in harnais:
    _, rel = chemins_relatifs(show(FIN, h), racine_set, paquets, fichiers_arbre)
    if any(any(f"{p}/{r}" in code_diff for p in paquets) for r in rel):
        union_b.append(os.path.basename(h))
constat("N-C1", f"POUR LE DIFF DE CODE DE D331, le tri en retenait {retenues} ; la comparaison par chemin RELATIF au paquet (la décision 1 du relecteur de D332) en retient {union_b} ; l'UNION des deux est {sorted(set(retenues) | set(union_b))} — quatre campagnes, dont r33 que le tri ne voyait pas")
ctl("N23", "…et `neutralize-r33.py` est dans cet ensemble : l'angle mort est reproduit sur le diff de D331 (le tri ne la voit pas, la comparaison relative la voit)", (False, True), ("neutralize-r33.py" in retenues, "neutralize-r33.py" in union_b))
# e2e neutralisée à la main
a_la_main = show(FIN, f"{PD}/neutralisation/e2e-a-la-main.txt")
spec_a2 = show(CODE, "e2e/specs/a2-mount-effects.e2e.ts").split("\n")
spec_r37_l = spec_r37.split("\n")
cites = [int(x) for x in re.findall(r"a2-mount-effects\.e2e\.ts:(\d+) `expect", a_la_main)]
cite_r37 = [int(x) for x in re.findall(r"r37-ma-salle\.e2e\.ts:(\d+)", a_la_main.split("\n")[6] + " " + a_la_main.split("\n")[7])]
ctl("N24", "la neutralisation à la main cite trois lignes d'`expect` (a2:161, a2:191, r37:186) : chacune est, dans les specs de `1b11e41`, une ligne qui contient `expect` (les numéros sont LUS dans la pièce)", (True, True, True),
    ("expect" in spec_a2[cites[0] - 1], "expect" in spec_a2[cites[1] - 1], "expect" in spec_r37_l[cite_r37[0] - 1]))
cherche = [i + 1 for i, l in enumerate(spec_a2) if 'expect(net.count("/api/v1/pro/venues")' in l]
ctl("N24b", "…les `expect(net.count(\"/api/v1/pro/venues\")…).toBe(1)` des specs COMMITÉES sont aux lignes 162 et 192, c'est-à-dire UNE ligne après les numéros de la pièce (161, 191) : le spec a grandi d'une ligne APRÈS la mesure (cause INFÉRÉE : le commentaire de l'assertion A2 réécrit, faute n° 3 de la section)",
    ([161, 191], [162, 192]), (cites, [n for n in cherche if n in (cites[0] + 1, cites[1] + 1)]))
constat("N-C2", "les deux numéros de ligne de la neutralisation à la main (a2:161, a2:191) pointent, dans les specs commitées, un commentaire et une ligne blanche : la pièce garde sa valeur de preuve (les titres, l'attendu et le reçu sont lus), mais ses numéros ne se retrouvent plus dans le fichier — un décalage d'UNE ligne, sans effet sur une porte")
restaurations = [l for l in a_la_main.split("\n") if not l.startswith("#") and "empreinte identique au départ = True" in l]
fichiers_mutes = sorted(set(re.findall(r"^# MUTATION \d+ — fichier (\S+)", a_la_main, re.M)))
ctl("N25", "la pièce écrit « empreinte identique au départ = True » pour chaque restauration : deux restaurations (une par mutation), lues hors des lignes de commentaire", 2, len(restaurations))
ctl("N25a", "…la section écrit « Les deux fichiers sont restaurés » (la phrase confrontée au nombre de fichiers distincts mutés par la pièce)", True, "Les deux fichiers sont restaurés" in SEC_TXT)
ctl("N25b", "…les fichiers DISTINCTS que les en-têtes de mutation de la pièce nomment : la section en annonce deux ; les deux mutations visent le MÊME fichier (`venue-list-page.tsx`) — un fichier restauré deux fois (écart d'exactitude, sans effet : l'empreinte est relue)", 2, len(fichiers_mutes))

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# S — le relevé « 30 campagnes sur 35 » et sa calibration
print("\n== S — le relevé « 30 campagnes sur 35 » (chemins relatifs au paquet) et sa calibration")
rel_txt = show(FIN, f"{PD}/releve-chemins-relatifs.txt")
rel_resultat = re.search(r"RÉSULTAT : (\d+) campagne\(s\) sur (\d+)", rel_txt)
rel_lignes = dict(re.findall(r"^  (neutralize-[^ ]+\.py) : (\d+) chemin\(s\)$", rel_txt, re.M))
rel_vides = re.search(r"sans aucun chemin relatif : (.*)", rel_txt).group(1).split(", ")
ctl("S1", "le relevé écrit « 30 sur 35 » ; 35 campagnes = les `neutralisation/neutralize-*.py` de l'arbre de `dd41fbd` (comptées dans git)", (30, 35, 35), (int(rel_resultat.group(1)), int(rel_resultat.group(2)), len(harnais)))
ctl("S2", "30 lignes de détail + 5 « sans chemin » = 35 : le relevé liste chaque campagne une fois", (30, 5, True), (len(rel_lignes), len(rel_vides), set(rel_lignes) | set(v.strip() for v in rel_vides) == {os.path.basename(h) for h in harnais}))
mes = {}
total_lus = 0
for h in harnais:
    n, rel = chemins_relatifs(show(FIN, h), racine_set, paquets, fichiers_arbre)
    mes[os.path.basename(h)] = len(rel)
    total_lus += n
ctl("S3", "RECALCULÉ PAR UNE AUTRE IMPLÉMENTATION (les fichiers lus à `dd41fbd` par `git show`, pas l'arbre de travail) : le nombre de campagnes qui déclarent au moins un chemin relatif au paquet", 30, sum(1 for v in mes.values() if v))
ctl("S4", "…les cinq sans aucun chemin relatif sont les mêmes que ceux du relevé", sorted(v.strip() for v in rel_vides), sorted(k for k, v in mes.items() if not v))
ecart_comptes = {k: (int(rel_lignes[k]), mes[k]) for k in rel_lignes if int(rel_lignes[k]) != mes[k]}
ctl("S5", "…et le compte PAR CAMPAGNE est le même (le relevé compte les chaînes distinctes ou répétées selon sa définition : les écarts, s'il y en a, sont listés)", {}, ecart_comptes)
m_parc = re.search(r"parcouru : (\d+) campagne\(s\).*?; (\d+) chemin\(s\) entre guillemets lus ; (\d+) paquet\(s\)", rel_txt)
ctl("S6", "le relevé écrit « 267 chemin(s) entre guillemets lus · 8 paquet(s) » : les 35 campagnes lues à `dd41fbd` donnent ce total ; les paquets (apps/* et packages/*) recomptés dans git", (267, 8, 35), (total_lus, len(paquets), int(m_parc.group(1))))
ctl("S7", "les quatre bras de calibration du relevé sont écrits `✓` et « 4 bras, 0 manqué » dans la pièce", (4, True), (len(re.findall(r"^   ✓ calibration", rel_txt, re.M)), "calibration : 4 bras, 0 manqué" in rel_txt))
outil_rel = show(FIN, f"{PD}/outils/releve-chemins-relatifs.py")
ctl("S8", "le script archivé comme PIÈCE (`outils/releve-chemins-relatifs.py`) existe et porte son mode d'emploi et sa calibration (D286)", (True, True), ("calibration" in outil_rel.lower(), "USAGE" in outil_rel.upper() or "usage" in outil_rel.lower()))
constat("S-C1", f"le relevé de D331 définit « chemin relatif » comme une chaîne présente sous un paquet ET absente de la racine ; il ne dit pas combien de campagnes citent un fichier du diff d'un lot donné — c'est le calcul que la décision 1 du relecteur de D332 exige (script calibré, versé avec sa sortie AVANT de jouer les campagnes)")

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# C — les CAPTURES
print("\n== C — les 16 captures de D331")
mes_txt = show(FIN, f"{PD}/navigateur/mesures-ma-salle.txt")
lignes_mesure = [l for l in mes_txt.split("\n") if l.startswith("MESURE ")]
ctl("C1", "16 lignes `MESURE` (4 chemins × 2 langues × 2 largeurs)", 16, len(lignes_mesure))
ctl("C2", "chaque ligne dit « document NON rechargé : true » et « état vide affiché : false »", (16, 16), (sum(1 for l in lignes_mesure if "document NON rechargé : true" in l), sum(1 for l in lignes_mesure if "état vide affiché : false" in l)))
images = [f for f in liste_arbre(FIN, f"{PD}/navigateur/images") if f.endswith(".png")]
ctl("C3", "16 images PNG, dont les 16 noms sont {création, édition, suppression, publication} × {fr, ar} × {1280, 360}", 16, len(images))
dims = []
for f in images:
    d = dimensions_png(show_octets(FIN, f))
    attendu_l = 1280 if f.endswith("-1280.png") else 360
    dims.append((f.rsplit("/", 1)[1], d is not None and d[0] == attendu_l))
ctl("C4", "chaque image est un PNG valide dont la LARGEUR est celle de son nom (1 280 ou 360)", [], [n for n, ok in dims if not ok])
menus = re.findall(r"menu : « ([^»]+) »", mes_txt)
ctl("C5", "le mot du menu est « Ma salle » (français) ×8 et « قاعتي » (arabe) ×8 — la liste n'a qu'une salle à chaque capture", (8, 8), (menus.count("Ma salle"), menus.count("قاعتي")))

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# Q — les TEXTES de D331 contre leurs pièces
print("\n== Q — les textes de D331 contre leurs pièces")
sortie_331 = show(FIN, f"{PD}/lecture-adverse/confronter-sortie.txt")
bilan = re.search(r"^(\d+) contrôles \((\d+) ✓\) · (\d+) écart\(s\) de D330 : \[([^\]]*)\] · (\d+) variation\(s\) de l'état vivant : \[[^\]]*\] · (\d+) constat\(s\) : \[[^\]]*\] · (\d+) non vérifiable\(s\)", sortie_331, re.M)
ctl("Q1", "le BILAN de la lecture adverse de D331 (sortie versée) : 147 contrôles (146 ✓) · 1 écart · 5 constats · 8 non vérifiables = ce que la section écrit", (147, 146, 1, 5, 8), tuple(int(bilan.group(i)) for i in (1, 2, 3, 6, 7)))
lignes_ok = len(re.findall(r"^✓ ", sortie_331, re.M))
lignes_ko = len(re.findall(r"^✗ ", sortie_331, re.M))
lignes_con = len(re.findall(r"^· ", sortie_331, re.M))
lignes_nv = len(re.findall(r"^\? ", sortie_331, re.M))
ctl("Q2", "…recompté ligne par ligne dans la sortie brute (✓, ✗, ·, ?)", (146, 1, 5, 8), (lignes_ok, lignes_ko, lignes_con, lignes_nv))
vent = re.search(r"^ventilation : (.*?) \(somme (\d+)\)", sortie_331, re.M)
par_famille = {}
for l in sortie_331.split("\n"):
    m = re.match(r"^[✓✗] ([A-Z])\d", l)
    if m:
        par_famille[m.group(1)] = par_famille.get(m.group(1), 0) + 1
txt_vent = {a: int(b) for a, b in re.findall(r"([A-Z]) (\d+)", vent.group(1))}
ctl("Q3", "…la ventilation écrite (E 17 · K 7 · M 12 · O 9 · P 21 · Q 20 · R 45 · S 2 · T 6 · X 8) = la ventilation recomptée dans la sortie", txt_vent, par_famille)
defauts = show(FIN, f"{PD}/lecture-adverse/defauts-instrument.txt")
ctl("Q4", "« dix-neuf défauts de l'instrument » = 19 entrées numérotées dans `defauts-instrument.txt`", 19, len(re.findall(r"^\d+\. \[", defauts, re.M)))
# passe D277
bal1 = show(FIN, f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt")
bal2 = show(FIN, f"{PD}/passe-d277/balayage-final.txt")
f1 = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+) · motifs examinés (\d+)", bal1)
f2 = re.search(r"OCCURRENCES DANS L'ARBRE : (\d+) · motifs examinés (\d+)", bal2)
z1 = re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", bal1)
z2 = re.search(r"MOTIFS À ZÉRO \(HEAD et arbre\) : (\d+)", bal2)
ctl("Q5", "la passe D277 : première 1 151 occurrences · 52 motifs · 3 à zéro ; dernière 1 428 · 52 · 0 (pièces) = ce que la section écrit", (1151, 52, 3, 1428, 52, 0), (int(f1.group(1)), int(f1.group(2)), int(z1.group(1)), int(f2.group(1)), int(f2.group(2)), int(z2.group(1))))
ctl("Q6", "…et la section écrit ces mêmes nombres (« 1 151 », « 1 428 », « 3 à zéro »)", True, all(x in SEC_TXT for x in ("1 151 occurrences", "1 428 occurrences", "3 à zéro")))
motifs = show(FIN, f"{PD}/passe-d277/motifs.txt")
lignes_motifs = [l for l in motifs.split("\n") if l.strip() and not l.startswith("#")]
ctl("Q7", "`motifs.txt` compte 54 lignes de motif (hors commentaires et lignes vides : « motifs 54 » de l'en-tête de la passe), dont 2 de calibration (`T+`, `T-`) ⇒ 52 motifs examinés (= « motifs examinés 52 »)", (54, 2, True), (len(lignes_motifs), sum(1 for l in lignes_motifs if l.split("|", 1)[0].startswith("T")), "motifs 54" in bal2 and "motifs examinés 52" in bal2))
# audits de secrets scellés
aud_a = show_octets(FIN, f"{PD}/audit-secrets-d331a.txt")
aud_b = show_octets(FIN, f"{PD}/audit-secrets-d331b.txt")
ctl("Q8", "les deux audits de secrets : le SCEAU de chacun couvre exactement ses octets (recalculé ici sans l'outil d'audit)", (True, True), (sceau_valide(aud_a), sceau_valide(aud_b)))
tb = aud_b.decode("utf-8")
m_aud = re.search(r"parcourus : (\d+) fichiers.*?audités : (\d+) fichiers.*?exclus : (\d+) fichiers.*?alertes : (\d+)", tb, re.S)
ctl("Q9", "audit « b » : 3 808 parcourus · 3 708 audités · 100 exclus · 223 alertes = la section ; audités + exclus = parcourus", (3808, 3708, 100, 223, True), (int(m_aud.group(1)), int(m_aud.group(2)), int(m_aud.group(3)), int(m_aud.group(4)), int(m_aud.group(2)) + int(m_aud.group(3)) == int(m_aud.group(1))))
ta = aud_a.decode("utf-8")
m_aud_a = re.search(r"alertes : (\d+)", ta)
ctl("Q10", "audit « a » : 219 alertes ; l'audit « b » en compte 4 de plus (223) — « les 4 nouvelles sont l'écho du tri de l'audit a » (la section)", (219, 4), (int(m_aud_a.group(1)), int(m_aud.group(4)) - int(m_aud_a.group(1))))
tri_b = show(FIN, f"{PD}/tri-audit-d331b.txt")
ctl("Q11", "le tri de l'audit « b » : « alertes ABSENTES de la précédente : 4 », bilan « 4 sur 4 = l'écho du tri de l'audit « a » », AUCUNE valeur réelle", (True, True), ("alertes ABSENTES de la précédente : 4" in tri_b, "4 sur 4 = l'écho du tri de l'audit « a »" in tri_b))
# l'ordre des rangs et la dernière ligne à la clôture
ordre_des_rangs = TXT.split("\n## ORDRE DES RANGS")[1].split("\n## PROCHAIN LOT")[0]
lignes_rang = [l for l in ordre_des_rangs.split("\n") if l.startswith("⇒ **RANG ")]
ctl("Q12", "la dernière ligne « ⇒ RANG N » de l'ordre des rangs à la clôture de D331 est « RANG 38 : EN ATTENTE D'ARBITRAGE DE KO » et aucune ligne de rang 39 n'est écrite", ("RANG 38 : EN ATTENTE D'ARBITRAGE DE KO", 0), (re.match(r"⇒ \*\*(RANG \d+ : EN ATTENTE D'ARBITRAGE DE KO)", lignes_rang[-1]).group(1), sum(1 for l in lignes_rang if "RANG 39" in l)))
# les fautes et décisions numérotées
fautes = re.findall(r"^(\d+)\. \*\*", section(TXT, "Session du 13/10/2026 — D331 ").split("### D331 — les fautes de la session")[1].split("### D331 — les décisions")[0], re.M)
ctl("Q13", "les fautes de la session sont numérotées 1 à 8 sans trou", [str(i) for i in range(1, 9)], fautes)
decisions = re.findall(r"^- \*\*S-(\d+)\*\*", SEC.split("### D331 — les décisions de la session, À RATIFIER PAR KO")[1].split("### D331 — fichiers conditionnels")[0], re.M)
ctl("Q14", "les décisions de la session S-1 à S-11 : onze entrées numérotées (S-1 à S-4, S-8 à S-11 en tête de ligne ; S-5 ouvre la ligne qui groupe S-5, S-6 et S-7)", ["1", "2", "3", "4", "5", "8", "9", "10", "11"], decisions)
ctl("Q15", "S-5, S-6 et S-7 sont sur UNE ligne (« **S-5** … **S-6** … **S-7** »)", True, bool(re.search(r"\*\*S-5\*\* .*\*\*S-6\*\* .*\*\*S-7\*\*", SEC)))
ctl("Q16", "S-11 de D331 : « le titre de la page « Mes salles » n'est PAS touché (observation, backlog) » — la décision que Ko a ratifiée « corrigée dans le prochain lot » (D332) est celle-ci", True, bool(re.search(r"\*\*S-11\*\* — le titre de la page « Mes salles » n'est \*\*pas\*\* touché", SEC)))
# fins de ligne des trois .md (arbre de travail)
for nom in AUTORITES:
    oct_ = open(nom, "rb").read()
    crlf, lf = oct_.count(b"\r\n"), oct_.count(b"\n") - oct_.count(b"\r\n")
    print(f"   · {nom} : {crlf} CRLF · {lf} LF nus (octets de l'arbre de travail)")
ctl("Q17", "le fichier `ZWADJ_CONTINUITE.md` de l'arbre de travail est celui de la clôture de D331 (même contenu, fins de ligne normalisées)", True, open(CONT, "rb").read().decode("utf-8").replace("\r\n", "\n") == TXT)

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# T — la table recopiée
print("\n== T — la table d'ouverture recopiée dans `ZWADJ_CONTINUITE.md`")
tab = show(FIN, f"{PD}/table-ouverture.md")
bloc_tab = tab.split("## Fichiers attendus — chemins COMPLETS")[1].split("## Modes de défaillance")[0]
entree = TXT.split("#### Fichiers attendus — chemins COMPLETS")[1].split("#### Modes de défaillance")[0]
lt = [l for l in bloc_tab.split("\n") if l.startswith("|") and not l.startswith("|---")]
le = [l for l in entree.split("\n") if l.startswith("|") and not l.startswith("|---")]
ctl("T1", "les lignes de tableau de la table (base, conditionnels, familles, extensions) : autant dans le point d'entrée du rang 37 que dans `table-ouverture.md` à la clôture", len(lt), len(le))
ctl("T2", "…identiques, une à une, dans le même ordre", lt, le)
lignes_donnees = [l for l in lt if not re.match(r"\| (fichier|famille) \|", l)]
m_79 = re.search(r"(\d+) lignes de tableau sur (\d+) retrouvées dans le point d'entrée", PLAT)
ctl("T3", "…le contrôle de fin de lot de D331 écrit « 79 lignes de tableau sur 79 retrouvées » : recompté, la table compte autant de lignes de DONNÉES (hors en-têtes `| fichier |`, `| famille |`, hors séparateurs) — la définition du compte n'est pas écrite (D290)", (79, 79), (len(lignes_donnees), len(lignes_donnees)))
ctl("T3a", "…le texte écrit bien « 79 sur 79 » (la phrase confrontée)", (79, 79), (int(m_79.group(1)), int(m_79.group(2))))
ctl("T3b", "…les lignes dont la première cellule est entre accents graves (les chemins) sont 77 ; les 4 lignes de la table des familles (portes, campagnes, captures, lectures) complètent 81", (77, 4, 81), (sum(1 for l in lignes_donnees if l.startswith("| `")), sum(1 for l in lignes_donnees if not l.startswith("| `")), len(lignes_donnees)))
par_version = []
for c, _ in versions:
    tv = show(c, f"{PD}/table-ouverture.md")
    bv = tv.split("## Fichiers attendus — chemins COMPLETS")[1].split("## Modes de défaillance")[0]
    par_version.append((c[:7], len([l for l in bv.split("\n") if l.startswith("|") and not l.startswith("|---") and not re.match(r"\| (fichier|famille) \|", l)])))
constat("T-C1", f"lignes de DONNÉES par version commitée de la table (SHA, lignes) : {par_version}. Le « 79 » de D331 est le compte de la version d'avant l'extension 5 (`d19935c` : {dict(par_version).get('d19935c')} lignes) ; la table de la clôture en compte {dict(par_version).get('f1e6443')} (extension 5 : 2 lignes de plus). Le contrôle annonce pourtant « le bloc de ses cinq extensions identique » : le nombre est exact pour quatre extensions, pas pour cinq (HYPOTHÈSE sur l'origine — un comptage fait avant que l'extension 5 soit recopiée —, non établie : le compte brut du contrôle n'est pas versé). La comparaison ligne à ligne (T2) est, elle, exacte sur les 89 lignes de la clôture.")
em_arbre = re.search(r"## arbre \(git status --short\) AVANT le paquet, puis APRÈS \(identiques : (OUI|NON)\) — lignes : (\d+)", em)
n_lignes_arbre = len([l for l in em.split("## arbre (git status --short) AVANT le paquet")[1].split("\n\n")[0].split("\n")[1:] if l.strip()]) if em_arbre else None
ctl("G16", "l'état machine dit que l'arbre est IDENTIQUE avant et après le paquet (« identiques : OUI »), 15 lignes `git status` ; les 15 lignes sont listées (8 modifiés ou neufs de code, 4 dossiers de pièces non suivis, le test, l'e2e, le harnais)", ("OUI", 15, 15), (em_arbre.group(1), int(em_arbre.group(2)), n_lignes_arbre))
base_ouv = show(OUV331, f"{PD}/table-ouverture.md").split("## Fichiers attendus — chemins COMPLETS")[1].split("### Extensions de la table")[0]
base_fin = tab.split("## Fichiers attendus — chemins COMPLETS")[1].split("### Extensions de la table")[0]
ctl("T4", "la table de BASE (avant les extensions) n'a pas changé entre le commit d'ouverture et la clôture", base_ouv, base_fin)
ctl("T5", "la table de base recopiée à `edfe644` ne contient aucun répertoire (aucun chemin ne finit par « / »)", [], [c for c in re.findall(r"^\| `([^`]+)` \|", base_ouv, re.M) if c.endswith("/")])

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# K — les sites que les arbitrages de Ko du 14/10 touchent (entrée de la passe D277 de CE lot)
print("\n== K — les sites que les arbitrages de Ko du 14/10/2026 touchent (relevés à `dd41fbd`, sur le texte aplati)")
PL = {n: aplati(nettoyer(norm(show(FIN, n)))) for n in AUTORITES}
def occ(motif):
    return {n: len(re.findall(motif, t)) for n, t in PL.items()}
sites = {
    "K1 « deux lots de code non certifiés sont tenables » (D270)": r"deux lots de code non certifiés sont tenables",
    "K2 « un troisième ne l'est pas » / « trois, non »": r"un troisième (?:lot de code )?ne l'est pas|trois, non|trois non",
    "K3 « UN seul lot de code de plus est tenable »": r"un seul lot de code de plus est tenable",
    "K4 l'exception bornée de D311 (« troisième lot non certifié »)": r"troisième lot non certifié",
    "K5 « condition de clôture du rang 37 »": r"condition de clôture du rang 37",
    "K6 « titre « Mes salles »/ le titre de la page reste »": r"titre de la page reste « Mes salles »|titre « Mes salles »|Mes salles »? alors que le menu",
    "K7 « RANG 38 : EN ATTENTE D'ARBITRAGE DE KO »": r"RANG 38 : EN ATTENTE D'ARBITRAGE DE KO",
    "K8 « candidat désigné : L35-2 »": r"candidat désigné : (?:\*\*)?L35-2",
    "K9 « compteur ZÉRO → UN » / « ZÉRO → UN »": r"ZÉRO → UN",
    "K10 « la séquence » D-10 (quatrième révision) « certification, \\[L35-1, L35-2\\] »": r"\[L35-1, L35-2\]",
}
for nom, motif in sites.items():
    o = occ(motif)
    print(f"   · {nom} : {sum(o.values())} occurrence(s) — AGENTS {o[AGENTS]} · BACKLOG {o[BACKLOG]} · CONTINUITE {o[CONT]}")
ctl("K0", "chaque site existe au moins une fois (un motif à zéro est une hypothèse à vérifier, D295) — nombre de motifs à zéro", 0, sum(1 for m in sites.values() if sum(occ(m).values()) == 0))
brut_backlog = show(FIN, BACKLOG)
ouvertes = lambda titre: [l for l in brut_backlog.split("\n") if l.startswith("- [ ]") and titre in l]
ctl("K11", "L'entrée « LE CONSTAT DE KO SUR « MA SALLE » : TROIS CHEMINS… » du backlog existe UNE fois et est OUVERTE (`- [ ]`) — Ko l'a levée le 14/10 : elle se ferme avec renvoi", 1, len(ouvertes("**[PRO][CONDITION DE CLÔTURE]** **LE CONSTAT DE KO SUR « MA SALLE » :")))
ctl("K12", "L'entrée « LE TITRE DE LA LISTE RESTE « MES SALLES » QUAND LE MENU DIT « MA SALLE » » du backlog existe UNE fois et est OUVERTE — S-11 la ferme à la clôture de ce lot", 1, len(ouvertes("LE TITRE DE LA LISTE RESTE « MES SALLES » QUAND LE MENU DIT « MA SALLE »")))
ctl("K13", "…et les trois autres entrées « Ma salle » du backlog (L35-1, « n'est pas réparée », « n'est relue qu'à la création ») sont ouvertes, annotées « CODE FAIT » par D331", 3, len([l for l in brut_backlog.split("\n") if l.startswith("- [ ]") and re.search(r"L35-1 — « MA SALLE »|« MA SALLE » N'EST PAS RÉPARÉE|LA LISTE DES SALLES N'EST RELUE QU'À LA CRÉATION", l) and "CODE FAIT" in l]))
constat("K-C1", "la règle de D270 (« deux tenables, trois non ») vit dans `AGENTS.md` (chaîne des annotations du compteur) ET dans `ZWADJ_CONTINUITE.md` ; la limite de CINQ de Ko (14/10) doit être portée aux DEUX, et annotée, jamais réécrite (D276/D277)")

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
# NON VÉRIFIABLES
print("\n== NON VÉRIFIABLES — ce que la lecture ne peut pas dire")
non_verifiable("N1", "les journaux BRUTS des six portes de D331 (empreintes, octets, lignes de l'en-tête de chaque extrait) : ils sont HORS dépôt (ils portent des jetons) ; la lecture confronte les extraits entre eux et à la section, pas au journal")
non_verifiable("N2", "que les 12 rouges aient été mesurés CONTRE LE CODE D'AVANT à la minute dite : la lecture montre que les trois fichiers de production d'avant sont identiques à `d19935c` et à la clôture de D330 et différents du code du lot, et que les titres des extraits sont ceux du fichier final — pas que le journal brut a été produit dans cet état")
non_verifiable("N3", "que la RAM libre « 4 125 Mo » soit celle de l'ouverture du paquet : la pièce `etat-machine.txt` la cite ; l'échantillonneur n'a pas tourné pendant le paquet (S-10)")
non_verifiable("N4", "que les 16 captures montrent ce que les lignes `MESURE` disent (la lecture vérifie que ce sont des PNG de la bonne largeur, pas leur contenu — les images sont lues à l'œil par la session qui les a produites)")
non_verifiable("N5", "que la neutralisation à la main de l'e2e ait été faite dans l'ordre décrit : la procédure n'est pas versée comme instrument (S-9, D291) ; la lecture vérifie que les lignes citées sont des `expect` et que la pièce affirme la restauration")
non_verifiable("N6", "que les campagnes `r30`, `r32`, `r37` et `r33` aient mordu dans l'état exact du commit `ea213c0` : les sorties sont versées, pas rejouées (« aucune campagne rejouée »)")
non_verifiable("N7", "que le fil de discussion (le texte des six arbitrages de Ko du 13/10) soit reproduit à l'identique dans les fichiers : la lecture compare les fichiers entre eux (P9), pas au fil")
non_verifiable("N8", "ce qui tournait sur la machine pendant la fenêtre des portes de D331 en dehors des processus relevés (`chrome`, `headless_shell`, `node`, `msedge`)")

# ══════════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== BILAN")
ok = len(controles) - len(ecarts) - len(ecarts_live)
print(f"{len(controles)} contrôles ({ok} ✓) · {len(ecarts)} écart(s) de D331 : {ecarts} · {len(ecarts_live)} variation(s) de l'état vivant : {ecarts_live} · {len(constats)} constat(s) : {constats} · {len(non_verifiables)} non vérifiable(s) : {non_verifiables}")
print("ventilation : " + " · ".join(f"{k} {v}" for k, v in sorted(familles.items())) + f" (somme {sum(familles.values())}) — aucune famille à zéro : {all(v > 0 for v in familles.values())}")
print(f"calibration : {bras_calibration[0]} bras, {bras_calibration[1]} manqué")
