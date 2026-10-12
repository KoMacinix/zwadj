"""D329 — lecture adverse de D328 (rang 35 : le cadrage de la base de données client et de tout ce que le lot correctif doit porter), confrontée aux objets git à des SHA FIXÉS.

POURQUOI IL EXISTE
  Forme de Ko au rang 36 : « la lecture adverse depuis la clôture de D328, EN ENTIER, et EN ENTIER dans ton rapport final ; instrument versé ; objets git lus à des SHA fixés ; chaque extracteur
  calibré sur un cas vrai et un cas faux ; sortie versée avant toute écriture d'autorité ; contrôles, écarts, constats, et « non vérifiable » déclaré ; aucune porte ni campagne rejouée ».
  En particulier : le premier commit de D328 ne contient que `table-ouverture.md` ; le diff de D328 est inclus dans sa table, et la table recopiée est identique ; les textes R1 à R9, D1 et D2 sont
  écrits tels que le rapport le dit ; le rapport annonce NEUF décisions à ratifier, le fichier en porte HUIT plus un point « à confirmer » (la lecture de « A10 ») : dire lequel décrit l'état.
  Le dernier commit de D328 est sa clôture (`d468064`) ; aucun commit ne la suit sinon la table d'ouverture de CE lot (`7e8f948`, qui ne contient qu'elle). Chaque affirmation de D328 qui se vérifie
  dans le dépôt est confrontée à sa SOURCE : les pièces versées, les objets git, le code cité à la ligne, le texte des fichiers d'autorité. Une affirmation qui ne vit que dans le chat est déclarée
  NON VÉRIFIABLE, pas cochée.

USAGE, depuis la racine (bash, jamais une redirection PowerShell — D298) :
  python3 docs/preuves/D329/lecture-adverse/confronter-d328.py > docs/preuves/D329/lecture-adverse/confronter-sortie.txt

LECTURE SEULE. Tout se lit par `git show <sha>:<chemin>` aux SHA fixés ci-dessous — jamais l'arbre de travail, SAUF : (1) la famille X (état LIVE : `git status`, `stash`, `fetch`, `rev-parse`) ;
  (2) la famille L (état VIVANT de la base de développement : `SELECT` seulement, dans une session en lecture seule dont le refus d'écriture est prouvé par un bras négatif) ; (3) les fins de ligne
  des trois `.md` (famille P), lues sur l'arbre : les objets git sont normalisés en LF par `core.autocrlf=true`. AUCUN rejeu de porte ni de campagne ici.

INSTRUMENTS ÉCARTÉS : rejouer `confronter-d327.py` (D328) — il juge D327 et ses SHA ; réutiliser `sondes.py` et `releve-code.py` de D328 comme preuve de D328 — ce serait croire l'instrument qu'on juge :
  les faits de code sont ici RELEVÉS PAR DES EXPRESSIONS ÉCRITES ICI, sur les objets git, indépendantes de celles de D328. Les assistants (`ctl`, calibration à deux bras, textes aplatis) sont ceux de
  D328, RÉÉCRITS ici : aucun import, l'instrument de D328 reste une pièce.

CALIBRATION, deux bras par extracteur (D286) : chacun est joué sur un cas où le fait est connu VRAI et sur un cas où il est connu FAUX ; abandon si un bras manque. Les comptes s'impriment avec ce qu'ils
  ont PARCOURU et leur attendu à côté (D290), le total des contrôles avec sa ventilation par famille (D295). Un attendu est DÉRIVÉ d'une pièce brute ou du texte de D328 — jamais écrit de mémoire (D275).
"""
import hashlib
import os
import re
import subprocess
import sys

sys.stdout.reconfigure(encoding="utf-8")
if not os.path.exists("pnpm-workspace.yaml"):
    sys.exit("à lancer depuis la racine du dépôt")

FIN = "d468064"       # clôture de D328
DEPART = "ab8e6f6"    # clôture de D327 = SHA de départ de D328
TABLE = "220557e"     # la table d'ouverture de D328 (seule)
OUV = "7e8f948"       # la table d'ouverture de D329 (seule)
PD = "docs/preuves/D328"
CONT, AGENTS, BACKLOG = "ZWADJ_CONTINUITE.md", "AGENTS.md", "ZWADJ_BACKLOG.md"
AUTORITES = (AGENTS, BACKLOG, CONT)
ANSI = re.compile(r"\x1b\[[0-9;]*m")

controles, ecarts, constats, ecarts_live, non_verifiables = [], [], [], [], []
familles: dict = {}


def git(*args, check=True):
    return subprocess.run(["git", *args], capture_output=True, check=check).stdout


def show(sha, chemin):
    return git("show", f"{sha}:{chemin}").decode("utf-8", errors="replace").replace("\r\n", "\n")


def existe(sha, chemin):
    return subprocess.run(["git", "cat-file", "-e", f"{sha}:{chemin}"], capture_output=True).returncode == 0


def blob(sha, chemin):
    return git("rev-parse", f"{sha}:{chemin}").decode().strip()


def aplati(t):
    return re.sub(r"\s+", " ", t)


def ctl(ident, libelle, attendu, mesure):
    ok = attendu == mesure
    controles.append(ident)
    familles[ident[0]] = familles.get(ident[0], 0) + 1
    if not ok:
        (ecarts_live if ident[0] in "XL" else ecarts).append(ident)
    print(f"{'✓' if ok else '✗'} {ident:6} {libelle} — attendu {attendu!r} · mesuré {mesure!r}")


def constat(ident, texte):
    constats.append(ident)
    print(f"· {ident:6} CONSTAT : {texte}")


def non_verifiable(ident, texte):
    non_verifiables.append(ident)
    print(f"? {ident:6} NON VÉRIFIABLE : {texte}")


# ── Extracteurs (chacun calibré plus bas) ────────────────────────────────────────────────────────────────────────────
def chemins_table(texte):
    """Les chemins complets en tête de ligne d'un tableau Markdown : `| \\`chemin\\` | … |` (peut en citer plusieurs séparés par une virgule). Ordre d'apparition, sans doublon."""
    sortie = []
    for l in texte.split("\n"):
        m = re.match(r"\|\s*((?:`[^`|]+`(?:,\s*)?)+)\s*\|", l)
        if m:
            for c in re.findall(r"`([^`]+)`", m[1]):
                if c not in sortie and ("/" in c or c.endswith(".md")):
                    sortie.append(c)
    return sortie


def ids_numerotes(texte, motif):
    """Les entiers n de `**<motif>n**` ou `| **<motif>n** |` — dans l'ordre, doublons CONSERVÉS."""
    return [int(x) for x in re.findall(r"\*\*" + motif + r"(\d+)\b", texte)]


def consecutifs(liste, debut=1):
    return liste == list(range(debut, debut + len(liste)))


def decouper_niveau0(texte):
    """Découpe sur les virgules qui ne sont NI dans des parenthèses, NI dans des accents graves, NI dans des guillemets français, NI dans du gras."""
    out, cur, prof, bt, gu, gras = [], "", 0, False, 0, False
    i = 0
    while i < len(texte):
        c = texte[i]
        if texte[i : i + 2] == "**":
            gras = not gras
            cur += "**"
            i += 2
            continue
        if c == "`":
            bt = not bt
        elif not bt:
            if c == "(":
                prof += 1
            elif c == ")":
                prof -= 1
            elif c == "«":
                gu += 1
            elif c == "»":
                gu -= 1
        if c == "," and prof == 0 and not bt and gu == 0 and not gras:
            out.append(cur.strip())
            cur = ""
        else:
            cur += c
        i += 1
    if cur.strip():
        out.append(cur.strip())
    return out


def bloc_entre(texte, debut, fin):
    i = texte.find(debut)
    if i < 0:
        return None
    j = texte.find(fin, i + len(debut))
    return texte[i : j if j >= 0 else len(texte)]


def tally_sortie(texte):
    """(✓ de contrôle, ✗, bras de calibration ✓, constats, non vérifiables) d'une sortie de lecture adverse."""
    return (
        len(re.findall(r"^✓ ", texte, flags=re.M)),
        len(re.findall(r"^✗ ", texte, flags=re.M)),
        len(re.findall(r"^   ✓ ", texte, flags=re.M)),
        len(re.findall(r"^· ", texte, flags=re.M)),
        len(re.findall(r"^\? ", texte, flags=re.M)),
    )


def lignes_de_code(sha, chemin):
    return show(sha, chemin).split("\n")


def ligne(sha, chemin, n):
    l = lignes_de_code(sha, chemin)
    return l[n - 1] if 0 < n <= len(l) else ""


def fichiers_production_api(sha):
    """Les fichiers TypeScript de production de apps/api/src à `sha` (hors *.spec.ts, *.int-spec.ts, *.test.ts, test-support)."""
    tous = git("ls-tree", "-r", "--name-only", sha, "--", "apps/api/src").decode().split("\n")
    return [f for f in tous if f.endswith(".ts") and not re.search(r"\.(spec|int-spec|test)\.ts$", f) and "/generated/" not in f]


def fichiers_production(sha, racines=("apps", "packages")):
    tous = git("ls-tree", "-r", "--name-only", sha, "--", *racines).decode().split("\n")
    return [f for f in tous if re.search(r"\.(ts|tsx)$", f) and not re.search(r"\.(spec|int-spec|test)\.tsx?$", f) and "/generated/" not in f and "/test-support/" not in f and "node_modules" not in f]


def lignes_qui_matchent(sha, fichiers, motif):
    out = []
    for f in fichiers:
        for i, l in enumerate(lignes_de_code(sha, f), 1):
            if re.search(motif, l):
                out.append((f, i))
    return out


# ══ CALIBRATION ══════════════════════════════════════════════════════════════════════════════════════════════════════
print("== CALIBRATION — deux bras par extracteur, abandon si un seul manque")
cal = []


def bras(nom, ok):
    cal.append(ok)
    print(f"   {'✓' if ok else '✗'} {nom}")


t_vrai = "| fichier | pour |\n|---|---|\n| `docs/a/b.md` | x |\n| `c.md`, `d/e.py` | y |\n| pas un chemin | z |\n"
bras("chemins_table, cas vrai : 3 chemins d'un tableau (dont une ligne à deux chemins)", chemins_table(t_vrai) == ["docs/a/b.md", "c.md", "d/e.py"])
bras("chemins_table, cas faux : un texte sans tableau rend 0", chemins_table("rien ici `x/y` en ligne") == [])
bras("ids_numerotes, cas vrai : M-1, M-2, M-3 → [1, 2, 3], consécutifs", (lambda l: l == [1, 2, 3] and consecutifs(l))(ids_numerotes("| **M-1** | a |\n| **M-2** | b |\n| **M-3** | c |", r"M-")))
bras("ids_numerotes, cas faux : un trou (M-1, M-3) n'est PAS consécutif ; un doublon est gardé", (not consecutifs(ids_numerotes("**M-1** **M-3**", r"M-"))) and ids_numerotes("**K-1** **K-1**", r"K-") == [1, 1])
bras("bloc_entre, cas vrai : le texte entre deux repères", bloc_entre("aa DEBUT x y FIN bb", "DEBUT", "FIN") == "DEBUT x y ")
bras("bloc_entre, cas faux : un début absent rend None", bloc_entre("aa bb", "DEBUT", "FIN") is None)
bras("tally_sortie, cas vrai : 2 ✓ de contrôle, 1 ✗, 1 bras, 1 constat, 1 non vérifiable", tally_sortie("   ✓ bras\n✓ A1 x\n✓ A2 y\n✗ A3 z\n· C1 c\n? N1 n\n") == (2, 1, 1, 1, 1))
bras("tally_sortie, cas faux : un texte vide rend cinq zéros", tally_sortie("") == (0, 0, 0, 0, 0))
bras("decouper_niveau0, cas vrai : « a (x, y), `b, c`, « d, e », **f, g**, h » → 5 sujets", decouper_niveau0("a (x, y), `b, c`, « d, e », **f, g**, h") == ["a (x, y)", "`b, c`", "« d, e »", "**f, g**", "h"])
bras("decouper_niveau0, cas faux : un texte sans virgule de niveau 0 rend UN sujet (pas 3)", len(decouper_niveau0("a (x, y, z)")) == 1)
bras("aplati, cas vrai : les retours à la ligne et les espaces multiples deviennent UNE espace", aplati("a\n  b\t\tc") == "a b c")
bras("ligne, cas vrai : la ligne 331 de `quotes.service.ts` est lisible", "WALK_IN" in ligne(FIN, "apps/api/src/venues/quotes.service.ts", 331))
bras("ligne, cas faux : une ligne hors fichier rend ''", ligne(FIN, "apps/api/src/venues/quotes.service.ts", 999999) == "")
bras("existe, cas vrai : la table de D328 existe à `220557e` ; cas faux : un chemin forgé n'existe pas", existe(TABLE, f"{PD}/table-ouverture.md") and not existe(TABLE, "docs/preuves/D328/ZZZ-forge.md"))
bras("fichiers_production, cas vrai/faux : `account.service.ts` gardé, `account.service.spec.ts` écarté", "apps/api/src/account/account.service.ts" in fichiers_production_api(FIN) and not any(f.endswith(".spec.ts") for f in fichiers_production_api(FIN)))
bras("lignes_qui_matchent, cas vrai : « WALK_IN » dans `quotes.service.ts` ≥ 1 ; cas faux : un jeton forgé rend 0", len(lignes_qui_matchent(FIN, ["apps/api/src/venues/quotes.service.ts"], r"WALK_IN")) >= 1 and lignes_qui_matchent(FIN, ["apps/api/src/venues/quotes.service.ts"], r"ZZZ_JETON_FORGE_D329") == [])
# La base : une session en lecture seule REFUSE une écriture (bras négatif), répond à SELECT 1 (bras positif).
ECRITURE = re.compile(r"\b(insert|update|delete|drop|alter|create|truncate|grant|revoke|copy|vacuum|reindex)\b", re.I)


def psql(sql, controle=True):
    if controle and ECRITURE.search(sql):
        sys.exit(f"REFUS : la requête contient un mot d'écriture : {sql[:80]}")
    r = subprocess.run(["docker", "exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-c", sql], capture_output=True)
    if r.returncode != 0:
        sys.exit(f"ERREUR psql : {r.stderr.decode('utf-8', errors='replace')[:300]}")
    return r.stdout.decode("utf-8", errors="replace").strip()


r_ecr = subprocess.run(["docker", "exec", "-e", "PGOPTIONS=-c default_transaction_read_only=on", "zwadj-db", "psql", "-U", "zwadj", "-d", "zwadj", "-At", "-c", "UPDATE users SET locale = locale WHERE false"], capture_output=True)
bras("psql, bras positif : `SELECT 1` répond 1", psql("SELECT 1") == "1")
bras("psql, bras négatif : une écriture est REFUSÉE par la session (code non nul et « read-only »)", r_ecr.returncode != 0 and b"read-only" in r_ecr.stderr)
bras("psql, garde de l'instrument : une requête contenant un mot d'écriture est refusée avant l'envoi", (lambda: ECRITURE.search("DELETE FROM x") is not None and ECRITURE.search("SELECT 1") is None)())
if not all(cal):
    sys.exit(f"ABANDON : calibration manquée ({cal.count(False)} bras sur {len(cal)})")
print(f"== calibration : {len(cal)} bras, 0 manqué\n")

# ══ FAMILLE X — l'état LIVE du dépôt ═════════════════════════════════════════════════════════════════════════════════
print("== X — état LIVE (git status, stash, fetch, rev-parse)")
git("fetch", "--quiet", check=False)
head = git("rev-parse", "HEAD").decode().strip()
orig = git("rev-parse", "origin/main").decode().strip()
statut = [l for l in git("status", "--short").decode().split("\n") if l.strip()]
stash = [l for l in git("stash", "list").decode().split("\n") if l.strip()]
branche = git("rev-parse", "--abbrev-ref", "HEAD").decode().strip()
ancetre = subprocess.run(["git", "merge-base", "--is-ancestor", orig, head], capture_output=True).returncode == 0
fin_complet = git("rev-parse", FIN).decode().strip()
ctl("X1", "`origin/main` (après `git fetch`) contient la clôture de D328 et est un ancêtre-ou-égal de `HEAD` : la table de ce lot n'est pas encore poussée", (True, True), (ancetre, subprocess.run(["git", "merge-base", "--is-ancestor", fin_complet, orig], capture_output=True).returncode == 0))
ctl("X2", "`HEAD` est la table d'ouverture de ce lot (`7e8f948`), seule", [OUV], [head[:7]] if head.startswith(OUV) else [head[:7]])
ctl("X3", "le parent de `HEAD` est la clôture de D328 (`d468064`)", FIN, git("rev-parse", "HEAD^").decode().strip()[:7])
ctl("X4", "aucun fichier suivi modifié (les fichiers non suivis sont les pièces de CETTE lecture, `docs/preuves/D329/`)", [], [l for l in statut if not l.startswith("??") and not l.startswith("A ")])
ctl("X5", "tout fichier non suivi est sous `docs/preuves/D329/lecture-adverse/` (aucun fichier hors du lot)", [], [l for l in statut if l.startswith("??") and "docs/preuves/D329/lecture-adverse/" not in l])
ctl("X6", "aucun stash", [], stash)
ctl("X7", "branche `main`", "main", branche)

# ══ FAMILLE P — provenance et ordre des commits de D328 ══════════════════════════════════════════════════════════════
print("\n== P — provenance et ordre des commits de D328 (objets git)")
chaine = git("rev-list", "--reverse", f"{DEPART}..{FIN}").decode().split()
ctl("P1", "D328 = 8 commits entre la clôture de D327 et la sienne", 8, len(chaine))
premier = chaine[0]
ctl("P2", "le premier commit de D328 est `220557e`, et son parent est la clôture de D327", (TABLE, DEPART), (premier[:7], git("rev-parse", premier + "^").decode().strip()[:7]))
contenu1 = [l for l in git("show", "--name-status", "--format=", premier).decode().split("\n") if l.strip()]
ctl("P3", "le premier commit ne contient QUE `table-ouverture.md` (1 fichier, ajouté)", ["A\tdocs/preuves/D328/table-ouverture.md"], contenu1)
diff_noms = [l for l in git("diff", "--name-only", DEPART, FIN).decode().split("\n") if l.strip()]
hors_preuves = [f for f in diff_noms if not f.startswith(PD + "/")]
ctl("P4", "le diff de D328 : 20 fichiers, dont les 3 `.md` d'autorité et rien d'autre hors de `docs/preuves/D328/`", (20, sorted(AUTORITES)), (len(diff_noms), sorted(hors_preuves)))
code = [f for f in diff_noms if re.match(r"(apps|packages|e2e|neutralisation)/", f) or f.endswith((".prisma", ".sql")) or f == "docker-compose.yml"]
ctl("P5", "aucun fichier de code, de test, de harnais, de migration ni `docker-compose.yml` au diff (lot documentaire)", [], code)
ajoutes = [l.split("\t")[1] for l in git("diff", "--name-status", DEPART, FIN).decode().split("\n") if l.startswith("A\t")]
ctl("P6", "17 fichiers ajoutés sous `docs/preuves/D328/`, 3 modifiés (les `.md`), 0 supprimé", (17, 3, 0), (len([f for f in ajoutes if f.startswith(PD + "/")]), len([f for f in diff_noms if f in AUTORITES]), len([l for l in git("diff", "--name-status", DEPART, FIN).decode().split("\n") if l.startswith("D\t")])))

# La table de D328 (au premier commit) contre le diff : chemins complets, jamais un préfixe
tab = show(TABLE, f"{PD}/table-ouverture.md")
decl = chemins_table(tab)
ctl("P7", "la table d’ouverture déclare 20 chemins (18 attendus, `table-ouverture.md` comprise, plus 2 conditionnels), extraits par l’instrument", 20, len(decl))
non_declares = [f for f in diff_noms if f not in decl]
absents_du_diff = [f for f in decl if f not in diff_noms]
ctl("P8", "diff ⊆ table (chemins COMPLETS) : fichiers du diff que la table ne déclare pas", [], non_declares)
ctl("P9", "table ⊆ diff : fichiers déclarés que le diff ne contient pas (les deux conditionnels doivent exister)", [], absents_du_diff)
# bras négatif de P8 : un fichier forgé serait vu
ctl("P10", "calibration de P8 sur un diff forgé : un fichier de plus est détecté comme non déclaré", ["docs/preuves/D328/ZZZ-forge.md"], [f for f in diff_noms + ["docs/preuves/D328/ZZZ-forge.md"] if f not in decl])
ctl("P11", "la table n'est PAS écrite par préfixe : aucune ligne de la table ne déclare un chemin qui finit par `/`", [], [d for d in decl if d.endswith("/")])

# La table recopiée à l'identique dans ZWADJ_CONTINUITE.md (point d'entrée du rang 35)
cont_fin = show(FIN, CONT)
bloc_recopie = bloc_entre(cont_fin, "#### Fichiers attendus — chemins COMPLETS", "##### Extensions de la table")
lignes_tab = [l.strip() for l in tab.split("\n") if l.startswith("|") and not l.startswith("|---") and not l.startswith("| fichier") and not l.startswith("| condition")]
lignes_rec = [l.strip() for l in (bloc_recopie or "").split("\n") if l.startswith("|") and not l.startswith("|---") and not l.startswith("| fichier") and not l.startswith("| condition")]
ctl("P12", "la table recopiée dans le point d'entrée : même nombre de lignes de tableau que la table d'origine", len(lignes_tab), len(lignes_rec))
diff_lignes = [l for l in lignes_tab if l not in lignes_rec]
ctl("P13", "chaque ligne de la table d'origine se retrouve MOT POUR MOT dans la table recopiée", [], [d[:90] for d in diff_lignes])
ctl("P14", "inversement : chaque ligne recopiée existe dans la table d'origine", [], [d[:90] for d in lignes_rec if d not in lignes_tab])
# l'en-tête de la table recopiée : extensions « Aucune à l'ouverture »
ctl("P15", "la table d'origine annonce « Aucune à l'ouverture » et aucun commit de D328 ne la modifie après `220557e`", 0, len([c for c in chaine[1:] if f"{PD}/table-ouverture.md" in git("show", "--name-only", "--format=", c).decode()]))

# Ordre : la sortie de la lecture adverse est AVANT les `.md`
def premier_commit_qui_touche(chemin):
    for c in chaine:
        if chemin in git("show", "--name-only", "--format=", c).decode().split("\n"):
            return c
    return None


c_sortie = premier_commit_qui_touche(f"{PD}/lecture-adverse/confronter-sortie.txt")
c_md = {f: premier_commit_qui_touche(f) for f in AUTORITES}
idx = {c: i for i, c in enumerate(chaine)}
ctl("P16", "la sortie de la lecture adverse entre dans le 2ᵉ commit (`630a6c5`)", "630a6c5", (c_sortie or "")[:7])
ctl("P17", "les trois `.md` d'autorité n'entrent QUE dans le dernier commit (`d468064`)", ["d468064"] * 3, [(c or "")[:7] for c in c_md.values()])
ctl("P18", "l'ordre : sortie de la lecture adverse < tout `.md` d'autorité (index de commit)", True, all(idx[c_sortie] < idx[c] for c in c_md.values()))
ctl("P19", "l'état des lieux (sondes, relevé du code) et la première passe D277 précèdent aussi tout `.md`", True, all(idx[premier_commit_qui_touche(f"{PD}/{p}")] < idx[c_md[CONT]] for p in ("etat-des-lieux/sondes-sortie.txt", "etat-des-lieux/releve-code-sortie.txt", "passe-d277/balayage-1-AVANT-ECRITURE.txt")))
ctl("P20", "les `.md` sont modifiés par UN seul commit : 3 fichiers, 1 commit", 1, len({c for c in c_md.values()}))
msg_fin = git("log", "-1", "--format=%B", FIN).decode()
ctl("P21", "le message du dernier commit annonce « RANG 36 : EN ATTENTE D'ARBITRAGE DE KO »", True, "RANG 36 : EN ATTENTE D'ARBITRAGE DE KO" in msg_fin)

# Les fichiers d'autorité : fins de ligne (sur l'arbre) — les trois `.md` n'ont pas de LF nu
for f in AUTORITES:
    b = open(f, "rb").read()
    crlf = b.count(b"\r\n")
    nu = b.count(b"\n") - crlf
    ctl("P22" + {AGENTS: "a", BACKLOG: "b", CONT: "c"}[f], f"`{f}` : 0 LF nu sur l'arbre (CRLF parcourus : {crlf})", 0, nu)
# Les pièces versées : octet pour octet, balayage.py identique à celui de D327
ctl("P23", "`balayage.py` de D328 est LE MÊME OBJET git que celui de D327", blob(FIN, "docs/preuves/D327/passe-d277/balayage.py"), blob(FIN, f"{PD}/passe-d277/balayage.py"))

# ══ FAMILLE R — les textes : R1 à R9, D1, D2, les décisions « à ratifier », le point « A10 » ═════════════════════════════
print("\n== R — les textes de l'arbitrage et les décisions à ratifier")
bloc_arb = bloc_entre(cont_fin, "**R1. LE SECOND TEXTE L'EMPORTE", "⛔ **LE RANG 35, tel que la consigne du relecteur le définit (forme)**") or ""
for n in range(1, 10):
    m = re.search(r"\*\*R" + str(n) + r"\. [^*]+\*\*[^\n]{0,260}?\*\(proposition du relecteur, adoptée par Ko le 11/10/2026\)\*", bloc_arb)
    ctl(f"R{n}", f"R{n} est écrite avec la marque « proposition du relecteur, adoptée par Ko le 11/10/2026 »", True, m is not None)
ctl("R10", "R1 à R9 : exactement 9 propositions numérotées, consécutives, dans le bloc d'arbitrage", (9, True), (len(ids_numerotes(bloc_arb, r"R")), consecutifs(ids_numerotes(bloc_arb, r"R"))))
d1_arb = bloc_entre(bloc_arb, "**D1. CE CADRAGE COUVRE TOUT", "**D2. MÉTHODE DES LOTS") or ""
d2_arb = bloc_entre(bloc_arb, "**D2. MÉTHODE DES LOTS", "\n\n") or ""
meth = bloc_entre(cont_fin, "#### ⛔ DÉCISIONS DU RELECTEUR (chat), DÉLÉGUÉES PAR KO LE 11/10/2026 (D328)", "E3 touche l'argent.") or ""
d1_meth = bloc_entre(meth, "1. **CE CADRAGE COUVRE TOUT", "2. **MÉTHODE DES LOTS") or ""
d2_meth = bloc_entre(meth, "2. **MÉTHODE DES LOTS", "\n\n") or d2_arb
puces = lambda t: [re.sub(r"^\s*[-0-9.]+\s*", "", l).strip() for l in t.split("\n") if re.match(r"\s*- ", l)]
ctl("R11", "D1 : 6 puces + un motif, dans l'ordre des rangs", 7, len(puces(d1_arb)))
ctl("R12", "D1 : les puces de l'ordre des rangs = celles du bloc de la méthode renforcée (mot pour mot)", puces(d1_arb), puces(d1_meth))
ctl("R13", "D2 : 4 puces de méthode + un motif, dans l'ordre des rangs", 5, len(puces(d2_arb)))
ctl("R14", "D2 : les puces de l'ordre des rangs = celles du bloc de la méthode renforcée (mot pour mot)", puces(d2_arb), puces(d2_meth))
# les décisions à ratifier : la section D328
sec = bloc_entre(cont_fin, "**Décisions de la session, À RATIFIER PAR KO** :", "\n\n") or ""
numerotees = re.findall(r"(?<![A-Za-z0-9])\((\d)\) ", sec)
ctl("R15", "la section D328 porte HUIT décisions de la session numérotées (1) à (8), consécutives", (8, True), (len(numerotees), consecutifs([int(x) for x in numerotees])))
derive = [m for m in re.finditer(r"⇒ \*\*Ce que la session dérive de ces décisions, sans que ce soit une parole du relecteur — à confirmer\*\* : (.*?)\n", meth + "\n")]
items = re.findall(r"\((i|ii|iii|iv|v)\)", derive[0][1]) if derive else []
ctl("R16", "le bloc D328 de la méthode renforcée porte UN paragraphe « à confirmer » de 5 points (i) à (v)", (1, ["i", "ii", "iii", "iv", "v"]), (len(derive), items))
ii = re.search(r"\(ii\) (.*?) \(iii\)", derive[0][1]) if derive else None
ctl("R17", "le point (ii) est marqué *à confirmer* et lit « la règle de la tranche A10 » comme la ligne de `AGENTS.md` « chemins critiques → revue humaine »", True, bool(ii) and "A10" in ii[1] and "*à confirmer*" in ii[1] and "aucune autre définition" in ii[1])
# (ii) AFFIRME « aucune autre définition de cette règle n'a été trouvée sous ce nom dans les fichiers d'autorité » : on cherche, dans les fichiers d'autorité tels qu'ils étaient AVANT D328, toute ligne qui porte « A10 » ET « revue humaine obligatoire »
a10_avant = []
for f_a10 in AUTORITES:
    for n_a10, l_a10 in enumerate(show(DEPART, f_a10).split("\n"), 1):
        if "A10" in l_a10 and "revue humaine obligatoire" in l_a10:
            a10_avant.append((f_a10, n_a10, l_a10.strip()[:120]))
ctl("R18a", "(ii) : « aucune autre définition de cette règle n'a été trouvée sous ce nom » — lignes des fichiers d'autorité à la clôture de D327 (AVANT D328) qui portent « A10 » ET « revue humaine obligatoire »", [], a10_avant)
ctl("R18b", "bras positif de R18a : l'extracteur trouve bien la ligne que D328 n'a pas vue (le titre « 5.1ter … Lot A10 — chemins sensibles, revue humaine obligatoire » du backlog)", True, any(f == BACKLOG and "5.1ter" in l for f, _, l in a10_avant))
ctl("R18c", "le texte de D2 (« chemins sensibles, revue humaine obligatoire ») reprend MOT POUR MOT les mots de ce titre du backlog, pas ceux de `AGENTS.md`", (True, False), ("chemins sensibles, revue humaine obligatoire" in d2_arb, "chemins sensibles" in show(FIN, AGENTS)))
constat("R-C2", "ÉCART d'exactitude de (ii) : la règle « de la tranche A10 » a une définition NOMMÉE au dépôt avant D328 — `ZWADJ_BACKLOG.md`, `### 5.1ter Gestion du compte (Lot A10 — chemins sensibles, revue humaine obligatoire)` — dont D2 reprend les mots. Elle est le TITRE d'une section d'un lot livré (changement d'e-mail, de mot de passe, suppression de compte), pas une procédure en étapes ; `AGENTS.md` dit « chemins critiques (paiement, auth, concurrence) → requiert revue humaine » dans une autre formulation. Les deux se rejoignent sur : revue humaine obligatoire. Aucune ne dit QUI relit ni QUAND : la lecture « chemins critiques » de (ii) est compatible, mais l'affirmation « aucune autre définition » est fausse.")
agents_fin = show(FIN, AGENTS)
ctl("R18", "la ligne de `AGENTS.md` que (ii) cite existe : « requiert revue humaine » (chemins critiques : paiement, auth, concurrence)", True, "requiert revue humaine" in agents_fin and "(paiement, auth, concurrence)" in agents_fin)
# Le mot « neuf » / « huit » écrit dans les fichiers pour compter ces décisions
tout_fin = "\n".join(show(FIN, f) for f in AUTORITES)
neuf = [m[0] for m in re.finditer(r"[^.\n]{0,80}\b(?:neuf|NEUF|9) décisions?[^.\n]{0,80}", aplati(tout_fin))]
huit = [m[0] for m in re.finditer(r"[^.\n]{0,80}\b(?:huit|HUIT|8) décisions? de la session[^.\n]{0,80}", aplati(tout_fin))]
ctl("R19", "aucun des trois fichiers n'écrit « neuf décisions » : le chiffre « neuf » n'est PAS dans l'état", [], neuf)
ctl("R20", "le mot « huit décisions de la session » n'est pas écrit non plus (le compte est celui de la numérotation (1)-(8)), occurrences trouvées", [], huit)
# les trois lectures possibles du « neuf » : 8 numérotées + (ii) ; 8 + les 5 de « à confirmer » ; 9 lignes d'un autre tableau
constat("R-C1", f"le fichier numérote HUIT décisions de la session ((1) à (8) : {numerotees}) ; le bloc D328 de la méthode renforcée porte en plus UN paragraphe « à confirmer » de CINQ points dont (ii) = « A10 » (le seul que l'italique *à confirmer* marque en propre). 8 + 1 = 9 : le « neuf » du rapport se retrouve SI l'on compte (ii) comme une neuvième ; il n'est écrit nulle part. L'état du fichier : huit numérotées, plus cinq points dérivés « à confirmer » dont un seul est une lecture de règle. Le rapport lui-même n'est pas au dépôt.")

# ══ FAMILLE C — les comptes du cadrage (modes de défaillance, contrats, lots, décisions, questions) ═════════════════════
print("\n== C — les comptes que le cadrage écrit, confrontés à ce qu'il énumère")
cad = bloc_entre(cont_fin, "## ⛔ CADRAGE DU RANG 35", "\n## ") or ""
ctl("C0", f"le cadrage est lu en entier : il contient son premier (« 0. Les faits ») ET son dernier paragraphe (« 8. Ce que ce cadrage NE fait PAS »), caractères parcourus : {len(cad)}", (True, True), ("### 0. Les faits, en tête" in cad, "### 8. Ce que ce cadrage NE fait PAS" in cad))
ms = ids_numerotes(bloc_entre(cad, "### 3. Les modes de défaillance", "### 4. ") or "", r"M-")
ks = ids_numerotes(bloc_entre(cad, "**Contrats d'API NEUFS", "**L'écran du pro") or "", r"K-")
ls = [int(x) for x in re.findall(r"\| \*\*L35-(\d)\*\*", cad)]
dbs = ids_numerotes(bloc_entre(cad, "### 6. Les décisions encore dues", "### 7. ") or "", r"DB-")
js = ids_numerotes(bloc_entre(cad, "### 7. Les questions pour le juriste", "### 8. ") or "", r"J-")
ctl("C1", "modes de défaillance M-1 à M-24 : 24, consécutifs, sans doublon", (24, True), (len(ms), consecutifs(ms)))
ctl("C2", "contrats d'API K-1 à K-11 : 11, consécutifs", (11, True), (len(ks), consecutifs(ks)))
ctl("C3", "lots L35-1 à L35-7 : 7, consécutifs", (7, True), (len(ls), consecutifs(ls)))
ctl("C4", "décisions dues DB-1 à DB-17 : 17, consécutives", (17, True), (len(dbs), consecutifs(dbs)))
ctl("C5", "questions pour le juriste J-1 à J-7 : 7, consécutives", (7, True), (len(js), consecutifs(js)))
t_cad = aplati(cad)
ctl("C6", "le texte écrit « vingt-quatre modes de défaillance » (ou 24) et le compte réel est 24", True, ("vingt-quatre modes" in aplati(cont_fin) or "24 modes" in aplati(cont_fin)) and len(ms) == 24)
ctl("C7", "le texte écrit « dix-sept décisions » et le compte réel est 17", True, "dix-sept décisions" in aplati(cont_fin) and len(dbs) == 17)
ctl("C8", "le texte écrit « onze contrats » et le compte réel est 11", True, ("onze contrats" in aplati(cont_fin)) and len(ks) == 11)
ctl("C9", "le texte écrit « sept lots » et « sept questions pour le juriste », les comptes réels sont 7 et 7", True, "sept lots" in aplati(cont_fin) and "sept questions" in aplati(cont_fin) and len(ls) == 7 and len(js) == 7)
# Arithmétique des décisions de Ko du 12/10 : 7 ratifiées + DB-8 + DB-17 = 9 ; les huit autres
ratifiees = {3, 4, 9, 10, 11, 15, 16}
daccord = {8, 17}
traitees = ratifiees | daccord
restantes = sorted(set(range(1, 18)) - traitees)
ctl("C10", "arithmétique de Ko (12/10) : 7 ratifiées avec le conseil + DB-8 et DB-17 = 9 traitées ; « les huit autres » = 17 − 9", (9, 8, [1, 2, 5, 6, 7, 12, 13, 14]), (len(traitees), len(restantes), restantes))
# Chaque décision restante dépend-elle d'un lot L35-1 à L35-4 (qui partent les premiers) ? On lit, par DB, les lots que le cadrage nomme dans son texte.
sec_db = bloc_entre(cad, "### 6. Les décisions encore dues", "### 7. ") or ""
for n in restantes:
    m = re.search(r"\*\*DB-" + str(n) + r"\*\* — (.*?)(?=\n- \*\*DB-|\Z)", sec_db, re.S)
    txt = m[1] if m else ""
    nomme_premiers = sorted(set(re.findall(r"L35-([1-4])\b", txt)))
    constat_ou_ctl = f"DB-{n} — lots L35-1..4 cités dans son texte : {nomme_premiers or 'aucun'}"
    print(f"   (relevé) {constat_ou_ctl}")
# la table des lots : dépendances et « compte WhatsApp »
lot4 = re.search(r"\| \*\*L35-4\*\* [^\n]*", cad)
ctl("C11", "L35-4 (la fiche) cite l'exception R4 — « K-1 … l'exception R4 (demande ou visite en cours) » — alors que la décision du relecteur du 12/10 la rattache à L35-5", True, bool(re.search(r"K-1[^\n]*exception R4|exception R4[^\n]*K-1", cad)))
ctl("C12", "M-6 écrit toujours « une révision reprend le nom **courant** de la fiche (R8) » — à AMENDER par la décision 1 du relecteur du 12/10", True, "une révision reprend le nom **courant** de la fiche (R8)" in cad)
ctl("C13", "R8 écrit « Une révision reprend le nom courant de la fiche » — à BARRER (décision 1 du 12/10)", True, "Une révision reprend le nom courant de la fiche" in bloc_arb)
ctl("C14", "DB-8 « le pro qui tape son propre numéro » est dans le cadrage sans recommandation, et M-11 le rappelle", True, "**DB-8**" in sec_db and "**M-11**" in cad)
constat("C-C1", "le cadrage compare « le téléphone du CLIENT est facultatif » à **D61** (ligne du tableau du § 1). D61 est, au registre, « corps de la demande. { date, startMinutes, phone? } strict » — le corps de la demande de VISITE (`visitBookingCreateSchema`, `phone: dzPhoneSchema.optional()`, venue.ts:1334). La demande de réservation d'une FÊTE (`bookingCreateSchema`) exige `contactPhone: dzPhoneSchema` (booking.ts:121, NOT NULL en base). La décision 2 du relecteur du 12/10 dit « la demande en ligne d'un client qui a un compte ne crée pas de fiche, son téléphone y reste facultatif » : vrai pour la visite, FAUX pour la demande de réservation.")
ctl("C15", "D61 au registre = le corps de la demande de VISITE (`phone?`)", True, bool(re.search(r"\| D61 \| F \| D61 — corps de la demande\. \{ date, startMinutes, phone\? \}", cont_fin)))
bk = show(FIN, "packages/types/src/booking.ts")
vn = show(FIN, "packages/types/src/venue.ts")
ctl("C16", "`bookingCreateSchema.contactPhone` est REQUIS (`dzPhoneSchema` sans `.optional()`)", True, bool(re.search(r"contactPhone:\s*dzPhoneSchema,", bk)) and not re.search(r"contactPhone:\s*dzPhoneSchema\.optional", bk))
ctl("C17", "`visitBookingCreateSchema.phone` est FACULTATIF (`dzPhoneSchema.optional()`)", True, bool(re.search(r"phone:\s*dzPhoneSchema\.optional\(\)\s*\}\)\s*\.strict\(\)", vn)))

# Les arbitrages du 12/10 face aux contrats K-1 à K-11 et à R8 (prémisses RELEVÉES dans le texte de D328, avant d'écrire quoi que ce soit)
k3 = re.search(r"- \*\*K-3\*\*[^\n]*", cad)
k_routes = re.findall(r"- \*\*K-(\d+)\*\*[^\n]*?`((?:GET|POST|PATCH|PUT|DELETE) [^`]+)`", cad)
ctl("C18", "K-3 (`PATCH /pro/clients/:id/names`) COMPLÈTE un nom manquant et « ne remplace jamais »", True, bool(k3) and "ne remplace jamais" in k3[0])
ctl("C19", "aucune des routes décrites de K-1 à K-11 (K-4 et K-6 modifient des contrats, sans route) ne MODIFIE une fiche existante autrement qu'en complétant un nom manquant (les routes décrites : " + ", ".join(f"K-{n} {r.split()[0]}" for n, r in k_routes) + ")", [], [n for n, r in k_routes if r.startswith(("PATCH /pro/clients", "PUT /pro/clients"))and n != "3"])
r8_txt = bloc_entre(bloc_arb, "**R8. LA COPIE DU NOM", "**R9.") or ""
ctl("C20", "R8 dit que la boîte COMPLÈTE la langue manquante « dans la fiche et dans la copie, sans jamais écraser un nom présent »", True, "dans la fiche et dans la copie" in r8_txt and "sans jamais écraser un nom présent" in r8_txt)
ctl("C19b", "bras positif de C19 : l'extracteur voit K-3 comme la seule route PATCH sur `/pro/clients`", ["3"], [n for n, r in k_routes if r.startswith("PATCH /pro/clients")])
constat("C-C2", "DB-11 (ratifié le 12/10 : « le pro peut créer et modifier une fiche ») n'a PAS de contrat dans les onze : K-3 ne fait que COMPLÉTER un nom manquant et « ne remplace jamais » (C18, C19). Modifier une fiche — corriger un nom présent — est une route, une règle de concurrence (M-6) et une garde de plus ; elle est un contrat NEUF, à nommer au lot (« s'arrêter et demander »).")
constat("C-C3", "TENSION entre DB-17 (ratifié : le nom du devis est prérempli depuis la fiche et MODIFIABLE pour ce devis) et R8 (la boîte de langue complète la langue manquante « dans la fiche ET dans la copie ») : si le pro a changé le nom du devis (une autre personne derrière le même numéro), la langue complétée par la boîte irait aussi dans la FICHE et y mélangerait deux identités (par exemple un nom latin de la fiche et un nom arabe de la personne du devis). Le cas est celui de M-24 que DB-17 voulait éviter. Non tranché ici : décision due (ce que complète la boîte quand le nom du devis diffère de celui de la fiche).")
prod_pro = fichiers_production(FIN, racines=("apps/pro", "packages/api-client"))
envoi_client_id = lignes_qui_matchent(FIN, prod_pro, r"^\s*clientId\s*[:,]|\bclientId:\s*[A-Za-z\"']")
ctl("Q37b", "bras positif de Q37 : le même motif voit au moins une ligne `clientId:` dans la production de l'API (réservations)", True, len(lignes_qui_matchent(FIN, ["apps/api/src/venues/bookings.service.ts"], r"^\s*clientId\s*[:,]|clientId:\s*[A-Za-z\"']")) >= 1)
ctl("Q37", f"DB-15 : aucun appelant de production de l'app Pro ni du client d'API n'ENVOIE `clientId` à la création d'un devis ({len(prod_pro)} fichiers parcourus) — le retirer du contrat ne casse aucun appelant connu", [], envoi_client_id)

# ══ FAMILLE Q — le code et les pièces que le cadrage cite ════════════════════════════════════════════════════════════
print("\n== Q — le code cité à la ligne et les faits F-1 à F-6, relevés par des expressions écrites ICI")
cites = [
    ("apps/api/src/venues/quotes.service.ts", 331, r'source:\s*current\.clientId === null \? "WALK_IN" : "CLIENT"', "F-3 : `bookings.source` dérivée de `quotes.client_id`"),
    ("apps/api/src/venues/quotes.service.ts", 471, r"clientId:\s*input\.clientId \?\? null", "M-4 / DB-15 : `clientId` accepté sans vérification"),
    ("apps/api/src/account/account.service.ts", 109, r"data\.phone = input\.phone", "F-4 : `PATCH /me` écrit le numéro sans code"),
    ("apps/api/src/account/account.service.ts", 125, r"data\.phone = input\.phone", "F-4 (profil pro)"),
    ("apps/api/src/venues/bookings.service.ts", 272, r'source:\s*"CLIENT"', "F-3 : la demande directe écrit CLIENT"),
    ("apps/api/src/venues/visit-bookings.service.ts", 156, r"input\.phone \?\? client\.phone", "le numéro de la visite retombe sur celui du compte"),
    ("apps/api/src/venues/booking-locks.prisma.ts", 76, r"FROM venues WHERE id.*FOR UPDATE", "M-14 : verrou existant de la ligne `venues`"),
    ("apps/api/src/venues/availability-blocks.service.ts", 116, r"FROM venues WHERE id.*FOR UPDATE", "M-14 : le second verrou existant"),
    ("apps/api/src/venues/venue-store.prisma.ts", 81, r'orderBy:\s*\{\s*updatedAt:\s*"desc"', "M-14 : `updated_at` est la clé de tri de la liste"),
]
for f, n, motif, quoi in cites:
    l = ligne(FIN, f, n)
    ctl(f"Q{cites.index((f, n, motif, quoi)) + 1}", f"{f}:{n} — {quoi}", True, re.search(motif, l) is not None)
prod_api = fichiers_production_api(FIN)
ecr_comm = lignes_qui_matchent(FIN, prod_api, r"\b(?:commission|commissions)\.(?:create|createMany|upsert|update|updateMany)\b|\$executeRaw[^\n]*INSERT INTO commissions")
ctl("Q10", f"F-2 : 0 écriture du modèle `Commission` dans la production de l'API ({len(prod_api)} fichiers parcourus)", [], ecr_comm)
ecr_cash = lignes_qui_matchent(FIN, prod_api, r"\bcashbackClaims?\.(?:create|createMany|upsert|update|updateMany)\b")
ctl("Q11", "F-1 : 0 écriture de `CashbackClaim` dans la production de l'API", [], ecr_cash)
bras_comm = lignes_qui_matchent(FIN, prod_api, r"commissionRateBps")
ctl("Q12", "bras positif de Q10 : le taux de la salle (`commissionRateBps`) apparaît dans ≥ 3 lignes de production (le motif voit ce qui existe)", True, len(bras_comm) >= 3)
mig = [f for f in git("ls-tree", "-r", "--name-only", FIN, "--", "apps/api/prisma/migrations").decode().split("\n") if f.endswith(".sql")]
sql_all = "\n".join(show(FIN, f) for f in mig)
ctl("Q13", f"F-2 : `commissions_rate_range` borne le taux à 100–500 pb inclus (`BETWEEN 100 AND 500`) dans les migrations ({len(mig)} fichiers `.sql` lus)", True, bool(re.search(r'commissions_rate_range"\s+CHECK\s*\(\s*"rate_bps"\s+BETWEEN\s+100\s+AND\s+500\s*\)', sql_all)))
constat("Q-C2", "le cadrage (F-2) écrit le CHECK sous la forme `(rate_bps >= 100 AND rate_bps <= 500)` ; la migration l'écrit `\"rate_bps\" BETWEEN 100 AND 500` — équivalents (BETWEEN est inclusif), mais le texte cité n'est pas celui de la migration : une imprécision de forme, aucune de sens.")
ctl("Q14", "F-2 : `commissions_booking_id_key` — unique sur `booking_id` (une ligne par réservation)", True, bool(re.search(r"commissions_booking_id_key", sql_all)))
ctl("Q15", "F-4 : aucun index ni contrainte UNIQUE sur un téléphone dans les migrations (hors NOT NULL)", [], re.findall(r"CREATE\s+(?:UNIQUE\s+)?INDEX[^;]*\bphone\b[^;]*;|UNIQUE[^;]*\bphone\b[^;]*", sql_all, re.I)[:3])
pf = lignes_qui_matchent(FIN, fichiers_production(FIN), r"<PhoneField\b")
ctl("Q16", f"le cadrage écrit « 8 usages dans 7 fichiers » de `<PhoneField` : relevé indépendant", (8, 7), (len(pf), len({f for f, _ in pf})))
pk = show(FIN, "apps/api/package.json")
ctl("Q17", "F-4 : `pg-boss` n'est pas déclaré dans `apps/api/package.json`", False, "pg-boss" in pk)
wa = lignes_qui_matchent(FIN, prod_api, r"implements\s+WhatsAppSender|class\s+\w*WhatsApp\w*")
ctl("Q18", "F-4 : un seul adaptateur du port WhatsApp (le logueur de développement)", 1, len([x for x in wa if "dev-logger" in x[0]]))
phts = show(FIN, "packages/types/src/phone.ts")
ctl("Q19", "la contradiction du § 0 : l'en-tête de `phone.ts` écrit « (venueId, phone) »", True, "(venueId, phone)" in phts)
qs = show(FIN, "packages/types/src/quote.ts")
ctl("Q20", "DB-15 : `quoteCreateSchema` porte `clientId`", True, bool(re.search(r"quoteCreateSchema[\s\S]{0,6000}?clientId", qs)))
ad = show(FIN, "apps/api/src/account/account-deletion.service.ts")
ctl("Q21", "F-6 : la suppression d'un compte ne touche ni réservation, ni visite, ni devis (aucun accès `booking`/`visitBooking`/`quote` dans le service)", [], [m for m in re.findall(r"\b(?:booking|bookings|visitBooking|visitBookings|quote|quotes)\.(?:update|updateMany|delete|deleteMany)\b", ad)])
# R7(1) : l'anomalie F-5 — lue sur la base vivante plus bas (L)
# Pièces versées de D328 : les comptes qu'elles portent
sortie_fin = ANSI.sub("", show(FIN, f"{PD}/lecture-adverse/confronter-sortie.txt"))
v, x, br, co, nv = tally_sortie(sortie_fin)
ctl("Q22", "la sortie de la lecture adverse de D328 : 120 contrôles (✓ + ✗), 2 ✗ de D327 + 2 d'état vivant, 39 bras, 3 constats, 4 non vérifiables", (120, 4, 39, 3, 4), (v + x, x, br, co, nv))
vent = re.search(r"ventilation[^:]*: ((?:[A-Z] \d+ · )*[A-Z] \d+)\s+\(somme (\d+)\)", sortie_fin)
dv = {k: int(n) for k, n in re.findall(r"([A-Z]) (\d+)", vent[1])} if vent else {}
ctl("Q23", "la ventilation que D328 écrit (C 13 · L 4 · P 23 · Q 63 · R 11 · X 6) : somme 120, aucune famille à zéro", (120, {"C": 13, "L": 4, "P": 23, "Q": 63, "R": 11, "X": 6}), (sum(dv.values()), dv))
fam_reelle = {}
for m in re.finditer(r"^[✓✗] ([A-Z])", sortie_fin, flags=re.M):
    fam_reelle[m[1]] = fam_reelle.get(m[1], 0) + 1
ctl("Q24", "la ventilation RECOMPTÉE sur les lignes de la sortie = celle qu'elle imprime", dv, fam_reelle)
defauts = ANSI.sub("", show(FIN, f"{PD}/lecture-adverse/defauts-instrument.txt"))
ctl("Q25", "`defauts-instrument.txt` : défauts numérotés 1 à 10, consécutifs (numéros en tête de ligne)", list(range(1, 11)), [int(x) for x in re.findall(r"^(\d+)\. ", defauts, flags=re.M)])
p1 = ANSI.sub("", show(FIN, f"{PD}/lecture-adverse/confronter-sortie-passe-1-AVANT-CORRECTIFS.txt"))
ctl("Q26", "la première passe versée : 10 ✗", 10, tally_sortie(p1)[1])
bal1 = show(FIN, f"{PD}/passe-d277/balayage-1-AVANT-ECRITURE.txt")
balf = show(FIN, f"{PD}/passe-d277/balayage-final.txt")
ctl("Q27", "première passe D277 : 468 occurrences, 42 motifs examinés, 3 motifs à zéro", (468, 42, 3), (int(re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", bal1)[1]), int(re.search(r"motifs examinés (\d+)", bal1)[1]), int(re.search(r"MOTIFS À ZÉRO[^:]*: (\d+)", bal1)[1])))
ctl("Q28", "dernière passe D277 : 615 occurrences, 42 motifs examinés, 0 motif à zéro", (615, 42, 0), (int(re.search(r"OCCURRENCES DANS L'ARBRE : (\d+)", balf)[1]), int(re.search(r"motifs examinés (\d+)", balf)[1]), int(re.search(r"MOTIFS À ZÉRO[^:]*: (\d+)", balf)[1])))
plats = sum(len(aplati(show(FIN, f))) for f in ("CLAUDE.md", AGENTS, CONT, BACKLOG))
corpus_final = int(re.search(r"arbre (\d+) car\.", balf)[1])
constat("Q-C1", f"la dernière passe D277 de D328 porte sur {corpus_final} caractères aplatis ; les quatre fichiers commités en portent {plats} : {plats - corpus_final} caractères ({(plats - corpus_final) / plats * 100:.2f} %) ont été écrits APRÈS elle. D328 le déclare (« rejouée après toutes les écritures sauf la présente ligne et le bloc d'audit qui suit »), mais la taille de l'écart est plus que « la présente ligne » : la limite est écrite, sa mesure ne l'était pas.")
# Les deux audits scellés
for nom, att in (("d328a", None), ("d328b", None)):
    o = git("show", f"{FIN}:{PD}/audit-secrets-{nom}.txt")
    print(f"   (relevé) audit-secrets-{nom}.txt : {len(o)} octets")
oa = git("show", f"{FIN}:{PD}/audit-secrets-d328a.txt")
ctl("Q30", "D328 écrit « 144 004 octets » pour `audit-secrets-d328a.txt`", 144004, len(oa))
ta = show(FIN, f"{PD}/tri-audit-d328a.txt")
tb = show(FIN, f"{PD}/tri-audit-d328b.txt")
ctl("Q31", "les deux tris différentiels : « 0 alerte ABSENTE de la précédente » (a et b)", (True, True), ("0 " in ta and "ABSENTE" in ta, "0 " in tb and "ABSENTE" in tb))
# Le backlog : les entrées du rang 35
bk_fin = show(FIN, BACKLOG)
sect_bk = bloc_entre(bk_fin, "\n## Reports du 11/10/2026 — rang 35", "\n## ") or ""
ctl("Q31b", f"la section « Reports du 11/10/2026 — rang 35 » du backlog est lue en entier (caractères parcourus : {len(sect_bk)})", True, len(sect_bk) > 5000)
lots_bk = sorted(set(re.findall(r"L35-(\d)", sect_bk)))
ctl("Q32", "le backlog porte une entrée par lot du correctif : L35-1 à L35-7 toutes nommées dans « Reports du 11/10/2026 — rang 35 »", [str(i) for i in range(1, 8)], lots_bk)
entree_db = re.search(r"\*\*LES DIX-SEPT DÉCISIONS DUES À KO, SANS RECOMMANDATION \(DB-1 à DB-17\)\*\* — (.*?)\. ⇒ \*\*BLOQUE", sect_bk, re.S)
sujets = decouper_niveau0(entree_db[1]) if entree_db else []
ctl("Q33", "le backlog porte l'entrée des dix-sept décisions : 17 sujets au niveau 0 (hors parenthèses et accents graves)", 17, len(sujets))
# (mot-clé du sujet dans le backlog, mot-clé du texte de DB-i dans le cadrage) — deux mots quand les deux textes ne disent pas la chose pareil (mots relevés dans les deux textes, pas devinés : 1ʳᵉ passe, défaut n° 9)
MOTS_DB = [("origine", "origine"), ("en cours", "en cours"), ("deux champs de nom", "deux champs de nom"), ("contact_", "contact_"), ("WhatsApp", "WhatsApp"), ("Commission", "Commission"), ("remboursement", "remboursement"), ("numéro du pro", "propre numéro"), ("quantité", "quantité"), ("référence", "référence"), ("droits", "droits"), ("paramètres", "paramètres"), ("invitation", "invité"), ("écran de confirmation", "écran de confirmation"), ("clientId", "clientId"), ("conservation", "conservation"), ("deux personnes", "deux personnes")]
corps_db = lambda i: (re.search(r"\*\*DB-" + str(i + 1) + r"\*\* — (.*?)(?=\n- \*\*DB-|\Z)", sec_db, re.S) or [None, ""])[1].lower()
ctl("Q33b", "l'entrée du backlog ne numérote pas ses sujets : leur ORDRE doit être celui de DB-1 à DB-17 — chaque sujet i porte le mot-clé de DB-i, et le texte de DB-i du cadrage porte le sien (17 positions)", [True] * 17,
    [bool(i < len(sujets) and MOTS_DB[i][0].lower() in sujets[i].lower() and MOTS_DB[i][1].lower() in corps_db(i)) for i in range(17)])
ctl("Q33c", "bras négatif de Q33b : un mot-clé décalé d'une position (DB-i cherché dans le sujet i+1) échoue sur ≥ 15 positions sur 17", True, sum(1 for i in range(16) if not (MOTS_DB[i][0].lower() in sujets[i + 1].lower())) >= 15)
ctl("Q34", "le backlog porte les 7 questions pour le juriste J-1 à J-7", [], [f"J-{i}" for i in range(1, 8) if f"J-{i}" not in bk_fin])
# L'ordre des rangs : la dernière ligne « ⇒ RANG N »
dernier_rang = re.findall(r"⇒ \*\*RANG (\d+) : EN ATTENTE D'ARBITRAGE DE KO\*\*", cont_fin)
ctl("Q35", "le registre : la dernière ligne est D328 ; D329 n'existe nulle part", ("D328", 0), (re.findall(r"^\| (D\d+) \|", cont_fin, flags=re.M)[-1], len(re.findall(r"D329", tout_fin))))
ctl("Q36", "RANG 36 : EN ATTENTE est écrit dans l'ordre des rangs (au moins une occurrence « RANG 36 : EN ATTENTE D'ARBITRAGE DE KO »)", True, "RANG 36 : EN ATTENTE D'ARBITRAGE DE KO" in cont_fin)

# ══ FAMILLE L — l'état VIVANT de la base de développement (SELECT seulement) ═════════════════════════════════════════════
print("\n== L — état VIVANT de la base de développement (SELECT seulement, session en lecture seule)")
n_users = int(psql("SELECT count(*) FROM users"))
n_pro = int(psql("SELECT count(*) FROM pro_profiles"))
n_ven = int(psql("SELECT count(*) FROM venues"))
n_ven_del = int(psql("SELECT count(*) FROM venues WHERE deleted_at IS NOT NULL"))
n_q = int(psql("SELECT count(*) FROM quotes"))
n_q_nocl = int(psql("SELECT count(*) FROM quotes WHERE client_id IS NULL"))
n_b = int(psql("SELECT count(*) FROM bookings"))
n_b_walk = int(psql("SELECT count(*) FROM bookings WHERE source = 'WALK_IN'"))
n_b_pro = int(psql("SELECT count(*) FROM bookings b JOIN venues v ON v.id = b.venue_id JOIN pro_profiles p ON p.id = v.owner_id WHERE b.contact_phone = p.phone"))
n_c = int(psql("SELECT count(*) FROM commissions"))
n_cb = int(psql("SELECT count(*) FROM cashback_claims"))
ctl("L1", "D328 relevait 1 compte, 1 pro, 5 salles dont 4 supprimées", (1, 1, 5, 4), (n_users, n_pro, n_ven, n_ven_del))
ctl("L2", "D328 relevait 16 devis, tous sans `client_id`", (16, 16), (n_q, n_q_nocl))
ctl("L3", "D328 relevait 8 réservations, toutes `WALK_IN`, dont 6 avec le numéro du PRO comme contact du client", (8, 8, 6), (n_b, n_b_walk, n_b_pro))
ctl("L4", "D328 relevait 0 ligne `commissions` et 0 ligne `cashback_claims`", (0, 0), (n_c, n_cb))

# ══ FAMILLE N — ce que la lecture ne peut pas dire ═══════════════════════════════════════════════════════════════════════
print("\n== N — NON VÉRIFIABLE (déclaré, pas coché)")
non_verifiable("N1", "que les textes de Ko des 10 et 11/10 (ordre des rangs) soient reproduits MOT POUR MOT : ils n'existent que dans le chat (même limite que R-N1 de D328).")
non_verifiable("N2", "que le « rapport de D328 » annonce NEUF décisions : ce rapport est un message de chat de la session précédente, il n'est pas au dépôt ; le compte de ce qui est au dépôt est dans R15, R16 et R-C1.")
non_verifiable("N3", "que les arbitrages de Ko soient la PREMIÈRE écriture d'autorité de D328 : les trois `.md` entrent dans UN seul commit (P20), `git` ne montre pas l'ordre des écritures à l'intérieur d'un commit. La règle prouve l'ordre ENTRE commits (P18), pas dans un fichier.")
non_verifiable("N4", "que le dernier audit de secrets de D328 (`d328b`) ait couvert les octets FINAUX des trois `.md` : il est commité (d56cfae) AVANT les `.md` (d468064) ; l'écart de corpus de Q-C1 montre que les `.md` ont changé après la dernière passe D277 (même limite que C-N1 de D328).")
non_verifiable("N5", "que « six faits nuancent une prémisse, aucun ne contredit un arbitrage » (§ 0) soit exhaustif : c'est un jugement sur ce que le relevé n'a pas cherché.")

# ══ BILAN ═════════════════════════════════════════════════════════════════════════════════════════════════════════════════
print("\n== BILAN")
print(f"{len(controles)} contrôles · {len(ecarts)} écarts de D328 · {len(ecarts_live)} écarts de l'état vivant · {len(constats)} constats · {len(non_verifiables)} non vérifiables")
print(f"ventilation par famille : {' · '.join(f'{k} {familles[k]}' for k in sorted(familles))}  (somme {sum(familles.values())})")
print("écarts de D328 :", ecarts or "aucun")
print("écarts de l'état vivant :", ecarts_live or "aucun")
print("constats :", constats or "aucun")
print("non vérifiables :", non_verifiables or "aucun")
print("familles à zéro :", [f for f in "CLNPQRX" if familles.get(f, 0) == 0] or "aucune (N ne compte pas : ses lignes sont des déclarations)")
