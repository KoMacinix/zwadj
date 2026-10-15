"""D333 — lecture adverse de D332 (rang 38, lot de CODE L35-2 « le PDF » : clos sur le code, compteur UN → DEUX), confrontée aux objets git à des SHA FIXÉS et aux pièces versées.

POURQUOI IL EXISTE
  Forme de Ko pour le rang 39 : « la lecture adverse depuis la clôture de D332, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque
  extracteur calibré sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré. En particulier : le tableau
  des points de D332 (rouges contre l'état d'avant, verts) contre ses pièces ; les portes de D332 contre leurs extraits (1 790 / 139, 471 / 38, e2e 54 · 1) ; le script d'union des campagnes
  (7 bras) et sa sortie (7 sur 36) ; les retraits de cibles de `neutralize-r33.py` (PO-5, PO-6, PO-7, SV-6, SV-7, J-1) et I-6 jugée équivalente. Aucune porte ni campagne n'est rejouée. »
  Le dernier commit de D332 est `2782be9` ; le seul commit qui le suit est la table d'ouverture de CE lot (`a5475fd`, qui ne contient qu'elle). Chaque affirmation de D332 qui se vérifie dans
  le dépôt est confrontée à sa SOURCE : les pièces versées, les objets git, le texte des fichiers d'autorité. Ce qui ne vit que dans le chat ou dans un journal hors dépôt est déclaré NON VÉRIFIABLE.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D333/lecture-adverse/confronter-d332.py > docs/preuves/D333/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF la famille X (état LIVE : `git status`, `stash`, `rev-parse`).
  AUCUN rejeu de porte ni de campagne ici, aucune écriture.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d331.py` (D332) — il juge D331 et ses SHA ; réutiliser `extraire-portes.py`, `extraire-rouge.py` ou `union-campagnes.py` de D332 comme preuve de D332
  — ce serait croire l'instrument qu'on juge : ici les comptes des rouges, des verts et des portes sont RECOMPTÉS par des expressions écrites ici, et l'union des campagnes est RECALCULÉE par une
  autre implémentation (le diff est lu entre deux SHA fixes, le texte des campagnes par `git show`, pas l'arbre de travail).

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce
qu'ils ont PARCOURU et leur attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute ou du texte de D332 — jamais écrit de mémoire (D275).
"""
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

DEPART = "dd41fbd"   # SHA de départ de D332 = clôture de D331
OUV = "e644a98"      # la table d'ouverture de D332 (seule)
LECT = "83b2892"     # la lecture adverse de D332
PASSE1 = "78e541b"   # la première passe D277
KO1 = "fd451fc"      # la première écriture d'autorité (arbitrages de Ko)
RELEVE = "2c90808"   # le relevé des lignes stockées
DEC = "6ca5287"      # les décisions du relecteur
EXT1 = "35d6efe"
ROUGES = "9d54357"
CODE = "4ca7b9f"
HARN = "1f7b85f"
UNION = "3eb9278"
EXT2 = "70c361e"
CONST = "68ed478"
JOUE = "9057754"
E2E1 = "970b7fa"
E2E2 = "b13cc5c"    # DERNIER commit qui touche du code ou une spec : les portes y ont tourné
EXT3 = "58ad55f"
PIECES = "6e95e1c"
CLOT = "e58b373"
EXT4 = "386ce97"
FINALES = "5e007fc"
DERNIER = "2782be9"  # dernier commit de D332
OUV333 = "a5475fd"   # la table d'ouverture de CE lot
PD = "docs/preuves/D332"
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


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] == "X" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:7} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:7} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:7} NON VÉRIFIABLE : {texte}")


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


def resumes_vitest(texte):
    """[(fichiers, tests)] des lignes « résumé N : fichiers passés a · en échec b · total c ; tests passés d · en échec e · total f » ; en échec cumulé séparé."""
    out, echecs = [], 0
    for m in re.finditer(r"résumé \d+ : fichiers passés (\d+) · en échec (\d+) · total (\d+) ; tests passés (\d+) · en échec (\d+) · total (\d+)", texte):
        out.append((int(m.group(3)), int(m.group(6))))
        echecs += int(m.group(2)) + int(m.group(5))
    return out, echecs


def ids_cibles_resultat(texte):
    """Les identifiants des lignes « ✓ <ID>. … » d'une sortie de campagne (une garde mordue chacune)."""
    return [m.group(1) for m in re.finditer(r"^✓ ([A-Z][A-Za-z0-9]*-\d+[a-z]?)\.", texte, re.M)]


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
    """Les constantes CHAÎNES d'un programme Python (ast) : ce qu'une campagne lit, mute ou cherche — jamais ses commentaires."""
    import ast
    try:
        return [n.value for n in ast.walk(ast.parse(source)) if isinstance(n, ast.Constant) and isinstance(n.value, str)]
    except SyntaxError:
        return None


def campagne_cite(source, fichier):
    """Une campagne cite un fichier du diff quand une de ses CHAÎNES le nomme : par chemin complet (R), par chemin relatif à un paquet (suffixe après `src/`, P) ou par son seul nom (N)."""
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


# ─────────────────────────────────── calibration ───────────────────────────────────
print("== CALIBRATION (deux bras par extracteur ; abandon si un seul manque)")
bras("comptes du point, positif", (79, 0, 0), comptes_du_point("# x\n# comptes du point : 79 vert(s) · 0 rouge(s) · 0 morsure(s) par assertion native\n"))
bras("comptes du point, négatif (ligne absente)", None, comptes_du_point("# rien\nVERT   a > b\n"))
bras("titres, positif", ["f.ts > a > b"], titres("ROUGE  f.ts > a > b\nVERT   g.ts > c\n", "ROUGE"))
bras("titres, négatif (autre étiquette)", [], titres("VERT   g.ts > c\n", "ROUGE"))
bras("résumés vitest, positif", ([(65, 808)], 0), resumes_vitest("  résumé 2 : fichiers passés 65 · en échec 0 · total 65 ; tests passés 808 · en échec 0 · total 808\n"))
bras("résumés vitest, négatif (un échec compté)", ([(65, 808)], 2), resumes_vitest("  résumé 2 : fichiers passés 64 · en échec 1 · total 65 ; tests passés 807 · en échec 1 · total 808\n"))
bras("ids de garde mordue, positif", ["H-1", "PO-5"], ids_cibles_resultat("✓ H-1. un\n   calibration ✓ x : y\n✓ PO-5. deux\n"))
bras("ids de garde mordue, négatif (une ligne de calibration seule)", [], ids_cibles_resultat("   calibration ✓ en-têtes : MORD (attendu MORD)\n"))
bras("cibles déclarées, positif", ["A-1", "B-2"], cibles_declarees('cible("A-1. un", "f", "a", "b", {})\ncible(\n    "B-2. deux",\n    "g"\n)\n'))
bras("cibles déclarées, négatif (la définition n'est pas un appel)", [], cibles_declarees('def cible(libelle: str, fichier: str) -> None:\n    pass\n'))
bras("chemins déclarés, positif", {"a/b.ts", "NEUF.md"}, chemins_declares("| `a/b.ts` | x |\n| `NEUF.md`, 3 | y |\n"))
bras("chemins déclarés, négatif (un identifiant, pas un fichier)", set(), chemins_declares("la clé `quote.document.detail` et `D332`"))
bras("campagne cite, chemin complet", "R", campagne_cite('X = "apps/pro/src/venues/venue-list-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, chemin relatif au paquet", "P", campagne_cite('X = "src/venues/venue-list-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, le nom seul", "N", campagne_cite('X = "venue-list-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, négatif (un autre fichier)", None, campagne_cite('X = "autre-page.tsx"\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("campagne cite, négatif (le chemin n'est que dans un COMMENTAIRE : rien n'est lu)", None, campagne_cite('# elle visait src/venues/venue-list-page.tsx\nX = 1\n', "apps/pro/src/venues/venue-list-page.tsx"))
bras("commit d'un fichier, positif (la table de D332 ouvre à e644a98)", [f"{PD}/table-ouverture.md"], noms_commit(OUV))
bras("commit d'un fichier, négatif (e644a98 ne touche aucune autorité)", [], [n for n in noms_commit(OUV) if n in AUTORITES])
echecs_calib = bras_calibration[1]
print(f"   calibration : {bras_calibration[0]} bras, {echecs_calib} manqué(s)")
if echecs_calib:
    sys.exit("ABANDON : un bras de calibration a manqué — l'instrument ne se croit pas")

# ─────────────────────────────────── famille C : l'ordre des commits ───────────────────────────────────
print("\n== C — l'ordre des commits de D332, prouvé par git")
liste = commits(DEPART, DERNIER)
ctl("C1", "le premier commit de D332 ne contient que sa table d'ouverture", [f"{PD}/table-ouverture.md"], noms_commit(liste[0]) if liste[0] == OUV else None)
parent_ouv = git("rev-parse", "--short=7", f"{OUV}^").decode().strip()
ctl("C2", "…et son parent est le SHA de départ", DEPART, parent_ouv)
ctl("C3", "de dd41fbd à 2782be9 : 22 commits (21 jusqu'à 5e007fc, plus le dernier)", (22, FINALES, DERNIER), (len(liste), liste[20], liste[21]))
idx = {s: i for i, s in enumerate(liste)}
ctl("C4", "la sortie de la lecture adverse précède la première écriture d'autorité", True, idx[LECT] < idx[KO1])
ctl("C5", "…et la première écriture d'autorité ne touche que le fichier de continuité", [CONT], noms_commit(KO1))
avant_ko1 = [s for s in liste[: idx[KO1]] if any(n in AUTORITES for n in noms_commit(s))]
ctl("C6", "aucun commit AVANT la première écriture d'autorité ne touche un des trois fichiers d'autorité", [], avant_ko1)
ordre_section = re.findall(r"^\| (\d+) \| `([0-9a-f]{7})` \|", show("HEAD", CONT), re.M)
shas_section = [s for n, s in ordre_section]
# la table « ordre des commits » de D332 est la PREMIÈRE de la section D332 (22 lignes, la 22ᵉ est « (celui-ci) »)
debut = show("HEAD", CONT).split("### D332 — l'ordre des commits, prouvé par `git`")[1].split("### D332 — la lecture adverse")[0]
lignes_ordre = re.findall(r"^\| (\d+) \| (`[0-9a-f]{7}`|\(celui-ci\)) \|", debut, re.M)
ctl("C7", "la table « ordre des commits » de la section D332 a 22 lignes, les 21 premières portent les SHA réels dans l'ordre de git", (22, liste[:21]), (len(lignes_ordre), [s.strip("`") for n, s in lignes_ordre[:21]]))
diff = noms_diff(DEPART, DERNIER)
table_finale = show(DERNIER, f"{PD}/table-ouverture.md")
declares = chemins_declares(table_finale)
non_declares = sorted(f for f in diff if f not in declares)
ctl("C8", "le diff de D332 compte 112 fichiers (le contrôle de fin de lot dit 112), tous déclarés par chemin COMPLET dans la table finale", (112, []), (len(diff), non_declares))
# chaque fichier déclaré par EXTENSION est touché pour la première fois APRÈS le commit qui l'a déclaré
versions = [s for s in liste if f"{PD}/table-ouverture.md" in noms_commit(s)]
decl_idx = {}
for s in versions:
    chemins = chemins_declares(show(s, f"{PD}/table-ouverture.md"))
    for c in chemins:
        decl_idx.setdefault(c, idx[s])
premier_touche = {}
for s in liste:
    for n in noms_commit(s):
        premier_touche.setdefault(n, idx[s])
fautes, par_extension = [], 0
for f in diff:
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
ctl("C9", "chaque fichier du diff est déclaré par une version de la table commitée AVANT (ou au) commit qui le touche pour la première fois", [], fautes)
ctl("C10", "…et le nombre de fichiers déclarés par une extension (le contrôle de fin de lot dit 68)", 68, par_extension)
par_version = {v: sum(1 for f in diff if f != f"{PD}/table-ouverture.md" and decl_idx.get(f) == idx[v]) for v in versions[1:]}
constat("C-C1", f"« 68 fichiers déclarés par une extension » : recompté, {par_extension} fichiers du diff (hors la table elle-même) sont déclarés pour la première fois par une extension — par version de la table {par_version}, soit {sum(par_version.values())} ; 68 est atteint si l'on compte la table elle-même (déclarée à l'ouverture, modifiée par chacune des quatre extensions) — HYPOTHÈSE sur l'origine du compte, non établie : la définition du compte n'est pas écrite (D290). Les 0 faute d'ordre (C9) sont, elles, exactes")
interdits = [f for f in diff if f.startswith(("packages/types/", "packages/api-client/", "apps/api/prisma/"))]
ctl("C11", "aucun fichier sous packages/types, packages/api-client, apps/api/prisma au diff (aucun contrat neuf, aucune migration)", [], interdits)
apres_portes = noms_diff(E2E2, DERNIER)
code_apres = [f for f in apres_portes if not (f.startswith("docs/preuves/") or f in AUTORITES)]
ctl("C12", "après b13cc5c (où les portes ont tourné), AUCUN fichier hors docs/preuves/ et hors les trois d'autorité n'a changé : les portes valent pour le dernier commit", [], code_apres)
ctl("C13", "b13cc5c est le dernier commit de la liste qui touche du code, une spec ou un harnais", E2E2, [s for s in liste if any(not (n.startswith("docs/preuves/") or n in AUTORITES) for n in noms_commit(s))][-1])
depart_dec = [f for f in noms_diff(DEPART, DEC) if not (f.startswith("docs/preuves/") or f in AUTORITES)]
ctl("C14", "6ca5287 ne diffère de dd41fbd par AUCUN fichier de code (l'en-tête de chaque rouge : « le code de production est celui d'avant »)", [], depart_dec)

# ─────────────────────────────────── famille P : les portes ───────────────────────────────────
print("\n== P — les six portes de D332, extraits contre section")
portes = {n: show(DERNIER, f"{PD}/portes/{n}.txt") for n in ("typecheck", "lint", "test", "build", "test-int", "e2e")}
for n, t in portes.items():
    m = re.search(r"code de sortie RÉEL de la commande : (\d+)", t)
    ctl(f"P-{n}-sortie", f"porte {n} : le code de sortie réel", 0, int(m.group(1)) if m else None)
    h = re.search(r"HEAD au lancement : ([0-9a-f]+)", t)
    ctl(f"P-{n}-head", f"porte {n} : lancée sur le dernier commit de code", E2E2, h.group(1) if h else None)
for n, attendu in (("typecheck", 8), ("lint", 8), ("build", 4)):
    m = re.search(r"paquets « Done » : (\d+) \(.*?\) ; « Failed » : (\d+)", portes[n])
    ctl(f"P-{n}-paquets", f"porte {n} : paquets terminés / en échec", (attendu, 0), (int(m.group(1)), int(m.group(2))) if m else None)
res, ech = resumes_vitest(portes["test"])
ctl("P1", "porte test : quatre résumés vitest, aucun échec", (4, 0), (len(res), ech))
ctl("P2", "porte test : (fichiers, tests) par paquet — api-client 5/48 · api 65/808 · client 29/372 · pro 40/562", [(5, 48), (65, 808), (29, 372), (40, 562)], res)
ctl("P3", "porte test : la somme est 1 790 tests / 139 fichiers", (1790, 139), (sum(t for f, t in res), sum(f for f, t in res)))
res0, _ = resumes_vitest(show(DEPART, "docs/preuves/D331/portes/test.txt"))
ctl("P4", "la base de D331, LUE dans sa pièce à dd41fbd : 1 748 tests / 137 fichiers", (1748, 137), (sum(t for f, t in res0), sum(f for f, t in res0)))
ctl("P5", "l'écart +42 tests / +2 fichiers, et sa décomposition : API 808−791 = +17 (23−5−1), Pro 562−537 = +25 (9+3+6+7)", (42, 2, 17, 25, 17, 25), (sum(t for f, t in res) - sum(t for f, t in res0), sum(f for f, t in res) - sum(f for f, t in res0), res[1][1] - res0[1][1], res[3][1] - res0[3][1], 23 - 5 - 1, 9 + 3 + 6 + 7))
ri, ei = resumes_vitest(portes["test-int"])
m_i0 = re.search(r"résumé : \[\(\((\d+), 0, \d+\), \((\d+), 0, \d+\)\)\]", show(DEPART, "docs/preuves/D331/portes/test-int.txt"))
ri0 = (int(m_i0.group(1)), int(m_i0.group(2))) if m_i0 else None
ctl("P6", "porte test:int : 471 tests / 38 fichiers, base de D331 (lue dans sa pièce, autre format) 468 / 38 (+3, 0 fichier)", ([(38, 471)], 0, (38, 468)), (ri, ei, ri0))
e2e = portes["e2e"]
m = re.search(r"résumé Playwright : \{'passed': (\d+), 'skipped': (\d+)\}", e2e)
lignes_ok = len(re.findall(r"^ok \d+ ", e2e, re.M))
lignes_skip = len(re.findall(r"^(?:skipped|-) ?\d+ ", e2e, re.M))
e2e0 = show(DEPART, "docs/preuves/D331/portes/e2e.txt")
m0 = re.search(r"résumé Playwright : (\d+) skipped · (\d+) passed", e2e0)
ctl("P7", "porte e2e : 54 passés, 1 ignoré, et les lignes « ok » de la pièce sont 54 ; base de D331 53 · 1", ((54, 1), 54, (53, 1)), ((int(m.group(1)), int(m.group(2))), lignes_ok, (int(m0.group(2)), int(m0.group(1))) if m0 else None))
ctl("P8", "la pièce de la mauvaise commande e2e est versée ET dit qu'elle n'a rien joué", True, "No tests found" in show(DERNIER, f"{PD}/portes/e2e-1-MAUVAISE-COMMANDE.txt"))


def declarations(sha, prefixes):
    total = 0
    for f in liste_arbre(sha, *prefixes):
        if re.search(r"\.(spec|test)\.tsx?$", f):
            total += len(re.findall(r"^\s*(?:it|test)(?:\.only|\.skip)?\(", show(sha, f), re.M))
    return total


d_api = declarations(E2E2, ["apps/api/src"]) - declarations(DEPART, ["apps/api/src"])
d_pro = declarations(E2E2, ["apps/pro/src"]) - declarations(DEPART, ["apps/pro/src"])
if (d_api, d_pro) == (17, 25):
    ctl("P9", "recompte INDÉPENDANT des déclarations `it(`/`test(` entre dd41fbd et b13cc5c : API +17, Pro +25", (17, 25), (d_api, d_pro))
else:
    constat("P-C1", f"recompte indépendant des déclarations `it(`/`test(` entre dd41fbd et b13cc5c : API {d_api:+d}, Pro {d_pro:+d} (la porte dit API +17, Pro +25) — l'écart peut venir de `it.each`, de `describe.each` ou d'un test généré (limite de l'extracteur, qui compte des DÉCLARATIONS et non des exécutions) ; la porte, elle, compte des exécutions")

# ─────────────────────────────────── famille R : les rouges et les verts ───────────────────────────────────
print("\n== R — le tableau des points de D332 (rouge contre l'état d'avant, vert), contre ses pièces")
POINTS = [
    ("modèle", "rouge-api-modele", "vert-api-modele", 18, 79),
    ("intégration", "rouge-api-int", "vert-api-int", 4, 16),
    ("remise", "rouge-pro-remise", "vert-pro-remise", 20, 102),
    ("titre liste", "rouge-pro-titre-liste", "vert-pro-titre-liste", 5, 13),
    ("titre app", "rouge-pro-titre-app", "vert-pro-titre-app", 1, 18),
]
for nom, r, v, morsures, verts in POINTS:
    tr, tv = show(DERNIER, f"{PD}/rouge/{r}.txt"), show(DERNIER, f"{PD}/vert/{v}.txt")
    cr, cv = comptes_du_point(tr), comptes_du_point(tv)
    rouges = titres(tr, "ROUGE")
    ctl(f"R-{nom}-rouge", f"{nom} : rouge — l'en-tête dit {morsures} morsure(s) et la pièce porte autant de lignes ROUGE", (morsures, morsures, morsures), (cr[1] if cr else None, cr[2] if cr else None, len(rouges)))
    ctl(f"R-{nom}-vert", f"{nom} : vert — {verts} vert(s), 0 rouge, et autant de lignes VERT", (verts, 0, verts), (cv[0] if cv else None, cv[1] if cv else None, len(titres(tv, "VERT"))))
    # chaque titre rouge devient un titre vert dans la pièce de vert du même point
    manquants = [t for t in rouges if t not in set(titres(tv, "VERT"))]
    ctl(f"R-{nom}-passe", f"{nom} : chaque test qui a mordu contre l'état d'avant est VERT dans la pièce du lot", [], manquants)
tn = show(DERNIER, f"{PD}/rouge/rouge-pro-nouveaux.txt")
cn = comptes_du_point(tn)
vn, vl = show(DERNIER, f"{PD}/vert/vert-pro-nouveaux.txt"), show(DERNIER, f"{PD}/vert/vert-pro-venues-label.txt")
ctl("R-nouveaux-rouge", "composants NEUFS : 0 vert, 9 rouges, 0 morsure (rouge = import absent)", (0, 9, 0), cn)
ctl("R-nouveaux-vert", "composants NEUFS : 9 verts (fenêtre de choix) + 3 verts (règle du libellé)", (9, 3), (comptes_du_point(vn)[0], comptes_du_point(vl)[0]))
titres_nouveaux = titres(tn, "ROUGE")
dans_label = [t for t in titres(vl, "VERT") if t in set(titres_nouveaux)]
dans_choice = [t for t in titres(vn, "VERT") if t in set(titres_nouveaux)]
ctl("R-nouveaux-correspondance", "les 9 rouges d'import absent sont ceux de la fenêtre de choix (9 titres retrouvés verts) ; ceux de la règle du libellé (3 verts) n'y figurent pas", (9, 0), (len(dans_choice), len(dans_label)))
if len(dans_label) == 0:
    constat("R-C1", "le tableau de D332 écrit « la fenêtre de choix partagée ; la règle `venuesLabelKey` : 9 rouges, 0 morsure » — mais les 9 rouges d'import absent sont TOUS ceux de la fenêtre de choix ; les 3 tests de la règle du libellé n'ont AUCUNE pièce de rouge (leur vert, lui, est versé). Imprécision d'exactitude du tableau, sans effet sur une porte")
rouges_tableau = show("HEAD", CONT)
ctl("R-tableau", "la section D332 de la continuité porte le tableau « point par point » avec 18 · 4 · 20 · 5 + 1 · 9 morsures/rouges", True, all(s in rouges_tableau for s in ("**18** morsures", "**4** morsures", "**20** morsures", "**5** (liste) + **1**", "**9 rouges, 0 morsure**")))
non_verifiable("NV-R1", "que les rouges aient été mesurés CONTRE LE CODE D'AVANT à la minute dite : les journaux bruts (SHA-256 cités dans chaque en-tête) sont HORS dépôt ; la lecture montre que 6ca5287 ne diffère de dd41fbd par aucun fichier de code (C14) et que les titres des rouges sont verts dans les pièces du lot — pas que le journal a été produit dans cet état")

# ─────────────────────────────────── famille N : la neutralisation ───────────────────────────────────
print("\n== N — l'union des campagnes, les campagnes jouées, les cibles retirées de r33")
sortie_union = show(DERNIER, f"{PD}/neutralisation/union-sortie.txt")
ctl("N1", "union-sortie : 7 bras de calibration, 0 manqué", (7, True), (len(re.findall(r"^\s+✓ calibration", sortie_union, re.M)), "calibration : 7 bras, 0 manqué" in sortie_union))
m = re.search(r"^UNION : (\d+) campagne\(s\) sur (\d+)", sortie_union, re.M)
ctl("N2", "union-sortie : 7 campagnes sur 36", (7, 36), (int(m.group(1)), int(m.group(2))) if m else None)
union_dite = re.search(r"^UNION: (.*)$", sortie_union, re.M).group(1).split(",")
tous_harnais = lambda sha: sorted(f.rsplit("/", 1)[-1] for f in liste_arbre(sha, "neutralisation") if re.fullmatch(r"neutralisation/neutralize-.*\.py", f))
ctl("N3", "il y a 36 campagnes `neutralize-*.py` au dernier commit de D332", 36, len(tous_harnais(DERNIER)))
ctl("N4", "…et au commit où l'union a été calculée (3eb9278 : r38 y est déjà)", 36, len(tous_harnais(UNION)))
# l'union RECALCULÉE : les fichiers du diff du lot (hors docs/preuves/ et hors .md), contre le texte de chaque campagne au dernier commit
code_diff = [f for f in noms_diff(DEPART, DERNIER) if not f.startswith("docs/preuves/") and f not in AUTORITES]
def union_recalculee(sha_texte, fichiers):
    out = {}
    for h in tous_harnais(sha_texte):
        t = show(sha_texte, f"neutralisation/{h}")
        for f in fichiers:
            k = campagne_cite(t, f)
            if k is not None and f != f"neutralisation/{h}":
                out.setdefault(h, set()).add((k, f))
    return out


hors_preuves_harn = [f for f in noms_diff(DEPART, HARN) if not f.startswith("docs/preuves/")]
code_harn = [f for f in hors_preuves_harn if f not in AUTORITES]
mienne = sorted(union_recalculee(HARN, code_harn))
ctl("N5", "l'union RECALCULÉE par une autre implémentation (les CHAÎNES des campagnes au SHA de l'union, les 27 fichiers de code du diff à ce SHA) donne les mêmes campagnes que celle versée", sorted(union_dite), mienne)
ctl("N5b", "…et recalculée au DERNIER commit sur le diff final (29 fichiers de code) : les mêmes sept campagnes — les deux fichiers ajoutés après l'union n'en retiennent pas d'autre", sorted(union_dite), sorted(union_recalculee(DERNIER, code_diff)))
hors_preuves_harn = [f for f in noms_diff(DEPART, HARN) if not f.startswith("docs/preuves/")]
code_harn = [f for f in hors_preuves_harn if f not in AUTORITES]
ctl("N6", "au SHA où l'union a été calculée (1f7b85f), le diff compte 29 fichiers hors docs/preuves/ (dont AGENTS.md et la continuité) : la sortie versée en liste 29", (29, 27), (len(hors_preuves_harn), len(code_harn)))
E2E_SPEC = "e2e/specs/r33-remise-devis.e2e.ts"
ctl("N6b", "…le fichier de plus de la sortie versée (29 contre 28 COMMITÉS à 1f7b85f) est la spec e2e : absente du diff de 1f7b85f, présente à 970b7fa — l'union a été calculée sur l'arbre de travail, qui portait cette modification non commitée", (False, True), (E2E_SPEC in noms_diff(DEPART, HARN), E2E_SPEC in noms_diff(DEPART, E2E1)))
constat("N-C2", "la sortie de l'union écrit « HEAD 1f7b85f » et liste 29 fichiers ; le diff COMMITÉ de dd41fbd à 1f7b85f en compte 28 : le script compare `dd41fbd` à l'ARBRE DE TRAVAIL, qui portait alors la spec e2e réécrite (commitée à 970b7fa). Sans effet sur le résultat (l'union recalculée sur les 26 fichiers de code commités rend les mêmes sept campagnes : N5), mais la pièce ne dit pas qu'elle lit l'arbre de travail et non le SHA qu'elle nomme — la même classe que le défaut de `lancer-campagnes.py` qu'elle contourne (il compare à HEAD)")
ctl("N6c", "…et au dernier commit, trois fichiers de plus que 1f7b85f : la spec e2e, act-plafonds, horloge (la constante 95 → 102, commit 68ed478, APRÈS l'union)", sorted([E2E_SPEC, "neutralisation/neutralize-act-plafonds.py", "neutralisation/neutralize-horloge.py"]), sorted(set(code_diff) - set(code_harn)))
ordre_union = (idx[UNION], idx[JOUE])
ctl("N7", "le script d'union et sa sortie sont versés AVANT de jouer la première campagne (3eb9278 précède 9057754)", True, ordre_union[0] < ordre_union[1])
# les sorties jouées
SORTIES = [("r38", 46), ("r32", 65), ("r33", 87), ("r33-int", 95), ("r37", 21), ("journey", 7), ("act-plafonds", 4), ("horloge", 2)]
ids_par = {}
for nom, n in SORTIES:
    t = show(DERNIER, f"{PD}/neutralisation/{nom}.txt")
    ids = ids_cibles_resultat(t)
    ids_par[nom] = ids
    if nom in ("journey",):
        mesure = len(re.findall(r"^✓ D\d+\.", t, re.M))
    elif nom in ("act-plafonds", "horloge"):
        mesure = len(re.findall(r"^✓ C\d+ ", t, re.M))
    else:
        mesure = len(ids)
    ctl(f"N8-{nom}", f"sortie {nom} : {n} gardes mordues (lignes ✓ de la pièce)", n, mesure)
    if nom not in ("journey", "act-plafonds", "horloge"):
        mm = re.search(r"^(\d+) garde\(s\) mordue\(s\) sur (\d+) cible\(s\) jouée\(s\)", t, re.M)
        ctl(f"N9-{nom}", f"sortie {nom} : la ligne de bilan dit {n} sur {n}", (n, n), (int(mm.group(1)), int(mm.group(2))) if mm else None)
        ctl(f"N10-{nom}", f"sortie {nom} : « arbre rendu à son état de départ : vérifié »", True, "arbre rendu à son état de départ : vérifié" in t)
ctl("N11", "la somme annoncée « 321 gardes mordues » (journey 7 + r32 65 + r33 87 + r33 --int 95 + r37 21 + r38 46)", 321, 7 + 65 + 87 + 95 + 21 + 46)
sous = set(ids_par["r33"]) <= set(ids_par["r33-int"])
distinctes = len(set(ids_par["r33"]) | set(ids_par["r33-int"]))
if sous:
    constat("N-C1", f"« 321 gardes mordues » additionne la passe SANS --int de r33 (87) ET la passe AVEC --int (95), alors que les 87 identifiants de la première sont TOUS des 95 de la seconde (sous-ensemble, vérifié identifiant par identifiant) : le nombre de gardes DISTINCTES est {distinctes} pour r33 et 234 pour l'union (7 + 65 + {distinctes} + 21 + 46), pas 321 ; 321 compte des MESURES (passes), pas des gardes. Deux passes qui se soustraient comptent la même chose, ou elles ne se soustraient pas (D290) — ici, deux passes qui s'ADDITIONNENT comptent deux fois la même garde. Imprécision de comptage de D332, sans effet sur une porte")
else:
    ctl("N-r33", "les 87 gardes de r33 sans --int sont un sous-ensemble des 95 avec --int", True, sous)
# les cibles de r33 retirées
r33_old, r33_new = show(DEPART, "neutralisation/neutralize-r33.py"), show(DERNIER, "neutralisation/neutralize-r33.py")
ids_old, ids_new = cibles_declarees(r33_old), cibles_declarees(r33_new)
retirees = sorted(set(ids_old) - set(ids_new))
ctl("N12", "neutralize-r33.py : les cibles déclarées en moins entre dd41fbd et le dernier commit sont EXACTEMENT PO-5, PO-6, PO-7, SV-6, SV-7, J-1 et I-6", sorted(["PO-5", "PO-6", "PO-7", "SV-6", "SV-7", "J-1", "I-6"]), retirees)
ctl("N13", "neutralize-r33.py : le nombre de cibles déclarées au dernier commit est 95, celui d'avant 102", (102, 95), (len(ids_old), len(ids_new)))
ctl("N14", "chaque cible retirée porte, dans le fichier, une ligne « RETIRÉE » qui la nomme (aucun retrait sans écrit)", [], [i for i in retirees if not re.search(rf"# ⛔ {re.escape(i)} RETIRÉE", r33_new)])
ctl("N15", "la cible I-6 est dite MUTATION ÉQUIVALENTE dans sa ligne de retrait", True, bool(re.search(r"# ⛔ I-6 RETIRÉE[^\n]*MUTATION ÉQUIVALENTE", r33_new)))
ctl("N16", "les cibles M-1 et M-2 de r33 sont toujours déclarées (ré-ancrées, pas retirées)", True, {"M-1", "M-2"} <= set(ids_new))
mots_morts = git("grep", "-n", "-E", "chooseDocumentLocale|DocumentLocaleBranch", DERNIER, "--", "apps/api/src", check=False).decode("utf-8", errors="replace")
hors_commentaires = []
for l in mots_morts.split("\n"):
    if not l:
        continue
    _sha, chemin, _no, texte_l = l.split(":", 3)
    if not re.match(r"\s*(//|\*|/\*)", texte_l):
        hors_commentaires.append((chemin, texte_l.strip()[:90]))
production = [c for c, t in hors_commentaires if not re.search(r"\.(spec|test)\.ts$", c)]
ctl("N17", "P-15 : plus aucune occurrence de `chooseDocumentLocale` ni de `DocumentLocaleBranch` dans le CODE DE PRODUCTION de `apps/api/src` (les commentaires et les gardes de source des specs ne comptent pas)", [], production)
ctl("N17b", "…les occurrences hors commentaire qui restent sont dans des specs (leur garde de source, qui nomme ce qu'elle interdit)", True, all(re.search(r"\.(spec|test)\.ts$", c) for c, t in hors_commentaires))
for c, t in hors_commentaires:
    print(f"   hors commentaire : {c} : {t}")
r38 = show(DERNIER, "neutralisation/neutralize-r38.py")
ctl("N18", "neutralize-r38.py déclare 46 cibles", 46, len(cibles_declarees(r38)))
ctl("N19", "…et les identifiants de ses gardes mordues sont ceux de ses cibles (aucune mordue hors déclaration, aucune déclarée sans morsure)", ([], []), (sorted(set(ids_par["r38"]) - set(cibles_declarees(r38))), sorted(set(cibles_declarees(r38)) - set(ids_par["r38"]))))
ctl("N20", "neutralize-r32.py déclare 65 cibles, neutralize-r37.py 21 (les nombres des sorties jouées)", (65, 21), (len(cibles_declarees(show(DERNIER, "neutralisation/neutralize-r32.py"))), len(cibles_declarees(show(DERNIER, "neutralisation/neutralize-r37.py")))))
journey_test = show(E2E2, "apps/pro/src/dashboard/walkin-journey.test.tsx")
ctl("N21", "act-plafonds / horloge : `walkin-journey.test.tsx` compte 102 déclarations `it(` à b13cc5c, et les deux harnais attendent 102", (102, 102, 102), (len(re.findall(r"^\s*it\(", journey_test, re.M)), len(re.findall(r"\b102\b", show(DERNIER, "neutralisation/neutralize-act-plafonds.py"))) and 102, len(re.findall(r"\b102\b", show(DERNIER, "neutralisation/neutralize-horloge.py"))) and 102))
eam = show(DERNIER, f"{PD}/neutralisation/e2e-a-la-main.txt")
ctl("N22", "neutralisation à la main de l'e2e : E-1 et E-2 portent chacune un `expect(received)` dans le bloc d'échec lu, et « empreinte restaurée : identique » deux fois", (2, 2), (len(re.findall(r"expect\(received\)\.to(?:Equal|Be)\(expected\)", eam)), eam.count("empreinte restaurée : identique")))
ctl("N23", "…et la première passe de E-1 (délai d'action) est dite NON-morsure dans la section", True, "délai d'action" in show("HEAD", CONT) and "TimeoutError: locator.click" in show("HEAD", CONT))
non_verifiable("NV-N1", "que les campagnes aient mordu dans l'état exact du commit où elles sont dites jouées : les sorties sont versées, pas rejouées (« aucune campagne rejouée »)")
non_verifiable("NV-N2", "que la neutralisation à la main de l'e2e ait été faite dans l'ordre décrit : la procédure est versée comme pièce (e2e-a-la-main.py), pas promue en instrument (S-16) ; la lecture vérifie que la sortie porte une assertion lue et une empreinte restaurée")

# ─────────────────────────────────── famille T : le texte contre la pièce ───────────────────────────────────
print("\n== T — les affirmations de la section D332 et des fichiers d'autorité, contre le dépôt")
cont = aplati(show("HEAD", CONT))
registre = re.findall(r"^\| (D\d+) \|", show("HEAD", CONT), re.M)
ctl("T1", "le registre finit sur D332 (dernière ligne) et ne contient pas encore D333", ("D332", False), (registre[-1], "D333" in registre))
ctl("T2", "la dernière ligne « ⇒ RANG N » de l'ordre des rangs est « RANG 39 : EN ATTENTE D'ARBITRAGE DE KO »", True, "⇒ **RANG 39 : EN ATTENTE D'ARBITRAGE DE KO** (D284)" in show("HEAD", CONT))
ctl("T3", "le point d'entrée du rang 38 se dit CLOS SUR LE CODE, compteur DEUX, condition de clôture OUVERTE", True, all(s in cont for s in ("CLOS SUR LE CODE LE 14/10/2026 (D332) — COMPTEUR DEUX", "CONDITION DE CLÔTURE OUVERTE")))
ag = aplati(show("HEAD", AGENTS))
ctl("T4", "AGENTS.md porte la limite de CINQ (annotation de D332) et la périmé de « un seul lot de code de plus est tenable »", True, "cinq lots de code non certifiés sont tenables" in ag and "RANG 38 CLOS SUR LE CODE" in ag)
ctl("T5", "le contrôle de fin de lot de D332 dit « 112 fichiers, 0 non déclaré » : la même chose que C8", True, "**112 fichiers, 0 non déclaré**" in cont)
bk = show("HEAD", BACKLOG)
ctl("T6", "le backlog porte « Reports du 14/10/2026 — rang 38 » et l'entrée « la cellule de détail vide d'une ligne « fixe » » encore OUVERTE (ce lot la fermera, Ko l'a acceptée)", (True, True), ("Reports du 14/10/2026" in bk, bool(re.search(r"- \[ \] \*\*\[PDF\]\[À OBSERVER\]\*\* \*\*LA CELLULE DE DÉTAIL D'UNE LIGNE « FIXE » EST VIDE", aplati(bk)))))
ctl("T7", "les trois fichiers d'autorité sont stockés en LF pur dans git au dernier commit de D332 (0 CRLF dans le blob ; core.autocrlf les rend en CRLF dans l'arbre de travail — mesuré en X7)", [0, 0, 0], [git("show", f"{DERNIER}:{a}").count(b"\r\n") for a in AUTORITES])
sections = {a: show("HEAD", a) for a in AUTORITES}
ctl("T8", "la section D332 ne dit pas que la condition de clôture du rang 33 est levée (elle reste ouverte)", True, "celle du rang 33 reste ouverte" in aplati(show("HEAD", AGENTS)) or "celle du rang 33 reste OUVERTE" in aplati(show("HEAD", AGENTS)))

# ─────────────────────────────────── famille X : l'état vivant ───────────────────────────────────
print("\n== X — l'état VIVANT (seule famille qui lit l'arbre de travail)")
tete = git("rev-parse", "HEAD").decode().strip()
distant = git("rev-parse", "origin/main").decode().strip()
statut = [l for l in git("status", "--short").decode().split("\n") if l]
non_suivis_hors = [l for l in statut if not l.startswith("?? docs/preuves/D333")]
ctl("X1", "HEAD = origin/main (après le fetch du début de session)", tete, distant)
ctl("X2", "le dépôt ne diffère de la fin de D332 que par la table d'ouverture de ce lot : `git diff 2782be9..HEAD --name-only`", ["docs/preuves/D333/table-ouverture.md"], noms_diff(DERNIER, "HEAD"))
ctl("X3", "aucun stash", "", git("stash", "list").decode().strip())
ctl("X4", "branche main", "main", git("rev-parse", "--abbrev-ref", "HEAD").decode().strip())
ctl("X5", "l'arbre de travail ne porte aucune modification hors des pièces de ce lot (docs/preuves/D333, non suivies jusqu'à leur commit)", [], non_suivis_hors)
ctl("X7", "dans l'arbre de travail, les trois fichiers d'autorité sont en CRLF PUR (CRLF = LF, octets) : un `Edit` qui y insérerait des LF nus se verrait ici", True, all(open(a, "rb").read().count(b"\r\n") == open(a, "rb").read().count(b"\n") for a in AUTORITES))
ctl("X6", "le commit courant est la table d'ouverture de ce lot, seule", ([OUV333], ["docs/preuves/D333/table-ouverture.md"]), ([tete[:7]], noms_commit("HEAD")))

# ─────────────────────────────────── constats propres à D332 ───────────────────────────────────
non_verifiable("NV-1", "les journaux BRUTS des six portes de D332 (empreintes, octets, lignes de l'en-tête de chaque extrait) : ils sont HORS dépôt (ils portent des jetons) ; la lecture confronte les extraits entre eux et à la section, pas au journal")
non_verifiable("NV-3", "que la RAM libre 3 091 Mo et l'absence de `chrome`/`headless_shell` relevées dans `etat-machine.txt` soient celles de la fenêtre des portes : l'échantillonneur n'a pas tourné pendant le paquet (S-10 de D331, repris)")
non_verifiable("NV-4", "que les six pages rastérisées et les quatre captures de la boîte montrent ce que la section dit : la lecture vérifie que ce sont des PNG, pas leur contenu — Ko a regardé les six pages le 15/10/2026 (ses mots sont au rang 39), la session ne peut ni le prouver ni le réfuter")
non_verifiable("NV-5", "que Docker Desktop ait été démarré par la session de D332 (S-18) : c'est un fait du poste de Ko, sans pièce")
non_verifiable("NV-7", "que le fil de discussion (les deux textes de Ko du 14/10) soit reproduit à l'identique dans les fichiers : la lecture compare les fichiers entre eux, pas au fil")

print("\n== BILAN")
print(f"{len(controles)} contrôles ({len(controles) - len(ecarts) - len(ecarts_live)} ✓) · {len(ecarts)} écart(s) de D332 : {ecarts} · {len(ecarts_live)} variation(s) de l'état vivant : {ecarts_live} · {len(constats)} constat(s) : {constats} · {len(non_verifiables)} non vérifiable(s) : {non_verifiables}")
vent = " · ".join(f"{k} {v}" for k, v in sorted(familles.items()))
print(f"ventilation : {vent} (somme {sum(familles.values())}) — aucune famille à zéro : {all(v > 0 for v in familles.values())}")
print(f"calibration : {bras_calibration[0]} bras, {bras_calibration[1]} manqué")
